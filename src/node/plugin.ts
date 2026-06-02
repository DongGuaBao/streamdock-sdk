/**
 * Node 端 Plugin 实现。
 *
 * 使用 `ws` 库创建 WebSocket 连接，支持：
 * - `log` 日志（log4js）
 * - Node inspector 调试（`-dev` 参数）
 * - 从 `process.argv` 读取启动参数
 * - `fs`、`path` 等 Node API
 *
 * ## 启动方式
 *
 * ```ts
 * import { Plugin, Action, log } from '@mirabox/streamdock-sdk/node';
 *
 * class MyPlugin extends Plugin {}
 * class MyAction extends Action {
 *   keyDown(data) { log.info('Key pressed'); }
 * }
 *
 * Plugin.instance = new MyPlugin();
 * Plugin.instance.action['action1'] = MyAction;
 * MyPlugin.startPlugin();
 * ```
 *
 * ## 调试
 *
 * 启动时加 `-dev` 参数可开启 Node inspector（默认端口 9229，可通过
 * `STREAMDOCK_DEBUG_PORT` 环境变量自定义）。
 */
import "../types";
import { BasePlugin } from "../core/base-plugin";
import { Action } from "../core/action";
import { log } from "./log";
import WebSocket from "ws";
import inspector from "inspector";
import fs from "fs";
import path from "path";

export { Action, log };

export class Plugin extends BasePlugin {
    declare ws: WebSocket;

    /**
     * 启动插件：初始化语言/i18n，建立 WebSocket 连接。
     *
     * @remarks
     * - 必须先设置 `Plugin.instance` 和 `Plugin.instance.action` 再调用
     * - 如果命令行含 `-dev`，开启 Node inspector 调试
     */
    static async startPlugin() {
        this.hasInit = true;

        if (process.argv.some((ele) => ele == "-dev")) {
            try {
                const port = parseInt(process.env.STREAMDOCK_DEBUG_PORT || "9229", 10);
                inspector.open(port, "127.0.0.1", true);
                log.info("Inspector listening at:", inspector.url());
            } catch (e) {
                log.info("Failed to open inspector:", e);
            }
            global.language = JSON.parse(process.argv[9]).application.language;
            global.i18n = JSON.parse(fs.readFileSync(path.join(process.cwd(), `language/${language}.json`)).toString());
        } else {
            try {
                global.language = JSON.parse(process.argv[9]).application.language;
                global.i18n = JSON.parse(fs.readFileSync(path.join(process.cwd(), `${language}.json`)).toString());
            } catch {}
        }

        log.info("start plugin");
        this.getInstance().connect();
    }

    /**
     * 建立 WebSocket 连接并注册到 Stream Dock。
     *
     * 连接参数从 `process.argv` 中读取（由 Stream Dock 传入）：
     * - `process.argv[3]` — WebSocket 端口
     * - `process.argv[5]` — 插件 UUID
     * - `process.argv[7]` — 注册事件名称
     */
    connect() {
        this.language = global.language;
        this.uuid = process.argv[5];
        this.ws = new WebSocket("ws://127.0.0.1:" + process.argv[3]);

        this.ws.on("open", () => {
            this.ws.send(JSON.stringify({ uuid: process.argv[5], event: process.argv[7] }));
        });
        this.ws.on("close", process.exit);
        this.ws.on("message", (e) => {
            if (this.getGlobalSettingsFlag) {
                this.getGlobalSettingsFlag = false;
                this.getGlobalSettings();
            }
            const data: any = JSON.parse(e.toString());
            if ((this as any)[data.event]) {
                if ((this as any)[data.event](data)) return;
            }
            if (data.event === "didReceiveGlobalSettings") {
                this.globalSettings = data.payload as JsonObject;
            }

            this.dispatchAction(data);
        });
    }
}

/**
 * Node 端日志模块，基于 log4js。
 *
 * 日志输出到：
 * - `./log/YYYY.M.D.log` (文件，最大 5MB，保留 3 个备份)
 * - 控制台 (console)
 *
 * 自动捕获未处理的异常和 Promise rejection。
 *
 * **仅在 Node 端可用**（`@mirabox/streamdock-sdk/node`），
 * Web 端/Property Inspector 不支持此模块。
 *
 * ```ts
 * import { log } from '@mirabox/streamdock-sdk/node';
 * log.info('Plugin started');
 * log.error('Something went wrong', error);
 * ```
 */
import log4js from "log4js";

const now = new Date();
export const log = log4js
    .configure({
        appenders: {
            file: {
                type: "file",
                filename: `./log/${now.getFullYear()}.${now.getMonth() + 1}.${now.getDate()}.log`,
                maxLogSize: 5 * 1024 * 1024,
                backups: 3,
            },
            console: { type: "console" },
        },
        categories: {
            default: { appenders: ["file", "console"], level: "info" },
        },
    })
    .getLogger();

process.on("uncaughtException", (error) => {
    try {
        log.error("Uncaught Exception:", error);
    } catch {}
});
process.on("unhandledRejection", (reason) => {
    try {
        log.error("Unhandled Rejection:", reason);
    } catch {}
});

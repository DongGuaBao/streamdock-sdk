/**
 * Property Inspector 属性检查器基类。
 *
 * 运行在 Stream Dock 内嵌浏览器中，为用户提供按键的配置 UI。
 * 基于 Vue 3，settings 通过 `ref` + `watch` 实现双向绑定和自动持久化。
 *
 * ## Settings 自动持久化
 *
 * **Property Inspector 中的 settings 变更会自动保存，不需要手动调用 setSettings。**
 *
 * `this.settings` 是一个 Vue `ref`，watch 会监听其深层变化，
 * 一旦检测到变化就自动发送 `setSettings` 命令到 Stream Dock：
 *
 * ```ts
 * this.settings = ref(window.argv[4].payload.settings);
 * watch(this.settings, () => {
 *   if (this.preventWatch) return;  // 防止外部更新时循环触发
 *   this.ws.send(JSON.stringify({
 *     event: 'setSettings',
 *     context: window.argv[1],
 *     payload: this.settings.value,
 *   }));
 * }, { deep: true });
 * ```
 *
 * 收到 `didReceiveSettings` 时 SDK 会设置 `preventWatch = true`
 * 防止外部更新触发循环保存。
 *
 * ## 环境限制
 *
 * Property Inspector 运行在 **浏览器环境**：
 * - **不能** `require()` / `import` Node 模块
 * - **不能**使用 `fs`、`path`、`ws`、`inspector` 等 Node API
 * - **不能**从 `@mirabox/streamdock-sdk/node` 导入 `log`
 *
 * ## 启动方式
 *
 * ```ts
 * import { Property } from '@mirabox/streamdock-sdk/property';
 * import PropertyPage from './Property.vue';
 *
 * Property.startProperty(PropertyPage);
 * ```
 *
 * ## RPC 通信
 *
 * Property Inspector 可以通过 `callPlugin()` 或 `this.action` Proxy 调用 Plugin 端方法：
 *
 * ```ts
 * await property.callPlugin('doSomething', arg1, arg2);
 * // 或
 * await property.action.doSomething(arg1, arg2);
 * ```
 */
import "../types";
import { RpcChannel } from "../core/rpc";
import { ensureSDSocketPolyfill } from "./polyfill";
import { createApp, watch, nextTick, reactive, type Reactive } from "vue";
interface PropertyInterface {
    /** 运行时配置 */
    settings: JsonObject;
    globalSettings: JsonObject;
    /** 调用插件方法（透传 instance.callPlugin） */
    callPlugin: (...args: any[]) => void;
    /** 获取当前 action 名称 */
    getCurrentActionName: () => string;
    /** 获取全局配置 */
    getGlobalSettings: () => void;
    /** 设置全局配置 */
    setGlobalSettings: (data: JsonObject) => void;
    /** 向插件发送消息 */
    sendToPlugin: (payload: JsonObject) => void;
    didReceiveGlobalSettings: (data: StreamDockEvents.DidReceiveGlobalSettings) => void;
    didReceiveSettings: (data: StreamDockEvents.DidReceiveSettings) => void;
    setPreventWatch: (preventWatch: boolean) => void;
    sendToPropertyInspector: (data: StreamDockEvents.SendToPropertyInspector) => void;
}
export class Property {
    /** 全局设置缓存 */
    private getGlobalSettingsFlag = true;
    private _rpc = new RpcChannel((payload) => this.sendToPlugin(payload));
    static instance: Property;
    static hasInit: boolean;
    /** 当前 action 名称（UUID 最后一段） */
    public actionName!: string;
    /** 是否阻止 settings watch 触发保存（用于防止循环更新） */
    public preventWatch!: boolean;
    /** 当前语言代码 */
    public language!: string;
    /** `window.argv` 的引用，见 {@link StreamDock.Argv} */
    public args!: StreamDock.Argv;
    /** 注册事件名称 */
    public regEvent!: string;
    /** Property Inspector UUID */
    public uuid!: string;
    public ws!: WebSocket;
    public reactiveProperty!: Reactive<PropertyInterface>;
    constructor() {}

    /**
     * 初始化 Property Inspector 环境。
     *
     * 注入 `window.PropertyClass`、`window.PropertyApp`、`window.startProperty`。
     *
     * @param mountApp - Vue 根组件（Property Inspector 的 UI 组件）
     */
    static async initProperty(mountApp: any) {
        window.PropertyClass = Property;
        window.PropertyApp = mountApp;
        window.startProperty = async function () {
            let response: any;
            try {
                response = await new Promise((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.open("GET", `./${window.argv[3].application.language}.json`);
                    xhr.onreadystatechange = () => {
                        if (xhr.readyState === 4) {
                            resolve(JSON.parse(xhr.responseText));
                        }
                    };
                    xhr.onerror = () => reject(new Error("Network error"));
                    xhr.send();
                });
                window._i18n = response["Localization"] || {};
            } catch {
                window._i18n = {};
            }
            Property.getInstance().actionName = window.argv[4].action.split(".").pop() || "";
            Property.getReactiveInstance();
            Property.getInstance().connect();
            createApp(window.PropertyApp).mount("#app");
        };

        ensureSDSocketPolyfill();
    }

    /**
     * 启动 Property Inspector（如果尚未初始化则自动调用 initProperty）。
     *
     * @param mountApp - Vue 根组件（可选，如已在 initProperty 中设置可省略）
     */
    static async startProperty(mountApp: any = null) {
        if (!this.hasInit) {
            await this.initProperty(mountApp);
        }
    }

    /**
     * 获取/创建 Property 单例。
     *
     * @returns Property 单例实例
     */
    static getInstance(): Property {
        if (!Property.instance) {
            Property.instance = new Property();
        }
        return Property.instance;
    }
    static getReactiveInstance(): Reactive<PropertyInterface> {
        const property = Property.getInstance();
        if (!property.reactiveProperty) {
            property.reactiveProperty = reactive({
                settings: {},
                globalSettings: {},
                callPlugin: (method: string, ...args: any[]) => property.callPlugin(method, ...args),
                getCurrentActionName: () => property.getCurrentActionName(),
                getGlobalSettings: () => property.getGlobalSettings(),
                setGlobalSettings: (data: JsonObject) => property.setGlobalSettings(data),
                sendToPlugin: (payload: JsonObject) => property.sendToPlugin(payload),
                didReceiveGlobalSettings: (data: StreamDockEvents.DidReceiveGlobalSettings) => {},
                didReceiveSettings: (data: StreamDockEvents.DidReceiveSettings) => {},
                setPreventWatch: (preventWatch: boolean) => property.setPreventWatch(preventWatch),
                sendToPropertyInspector: (data: StreamDockEvents.SendToPropertyInspector) => {},
            });
        }
        return property.reactiveProperty;
    }
    /**
     * 建立 WebSocket 连接并注册 Property Inspector 到 Stream Dock。
     *
     * 关键初始化：
     * - `this.settings = ref(window.argv[4].payload.settings)` — 创建响应式 settings
     * - `watch(settings, ..., { deep: true })` — 自动持久化变更
     */
    connect() {
        this.ws = new WebSocket("ws://127.0.0.1:" + window.argv[0]);
        this.ws.onopen = () => this.ws.send(JSON.stringify({ event: window.argv[2], uuid: window.argv[1] }));
        this.ws.onmessage = this.onmessage.bind(this);
        this.regEvent = window.argv[2];
        this.uuid = window.argv[1];
        this.language = window.argv[3].application.language;
        this.args = window.argv;
        this.reactiveProperty.settings = window.argv[4].payload.settings;
        this.preventWatch = false;
        watch(
            () => this.reactiveProperty.settings,
            (newVal) => {
                if (this.preventWatch) return;
                console.log("change");
                this.ws.send(
                    JSON.stringify({
                        event: "setSettings",
                        context: window.argv[1],
                        payload: newVal,
                    }),
                );
            },
            { deep: true },
        );
    }

    /** WebSocket 消息处理 */
    onmessage(a: MessageEvent) {
        let e = a.data;
        if (this.getGlobalSettingsFlag) {
            this.getGlobalSettingsFlag = false;
            this.getGlobalSettings();
        }
        const data = JSON.parse(e.toString());
        if (data.event === "didReceiveGlobalSettings") {
            this.reactiveProperty.globalSettings = data.payload.settings;
            this.didReceiveGlobalSettings?.(data);
            this.reactiveProperty.didReceiveGlobalSettings(data);
        }
        if (data.event === "didReceiveSettings") {
            this.preventWatch = true;
            this.reactiveProperty.settings = data.payload.settings;
            nextTick(() => {
                this.preventWatch = false;
            });
            this.didReceiveSettings?.(data);
            this.reactiveProperty.didReceiveSettings(data);
        }
        if (data.event === "sendToPropertyInspector") {
            this.sendToPropertyInspectorEvent(data);
        }
    }

    /**
     * 全局保存数据（跨所有 Property Inspector 实例共享）。
     *
     * @param data - 要保存的键值对
     */
    setGlobalSettings(data: JsonObject) {
        this.reactiveProperty.globalSettings = data;
        this.ws.send(
            JSON.stringify({
                event: "setGlobalSettings",
                context: this.uuid,
                data,
            }),
        );
    }

    /** 获取当前 action 名称 */
    getCurrentActionName(): string {
        return this.actionName;
    }

    /** 请求全局持久化数据 */
    getGlobalSettings() {
        this.ws.send(
            JSON.stringify({
                event: "getGlobalSettings",
                context: this.uuid,
            }),
        );
    }

    /**
     * 向 Plugin 发送数据。
     *
     * @param payload - 要发送的 JSON 对象
     */
    sendToPlugin(payload: JsonObject) {
        this.ws.send(
            JSON.stringify({
                event: "sendToPlugin",
                action: this.args[4].action,
                context: this.args[1],
                payload,
            }),
        );
    }

    /** [内部] 处理 sendToPropertyInspector 事件，检查 RPC 消息 */
    sendToPropertyInspectorEvent(data: any) {
        const payload = data.payload;
        if (this._rpc.handleIncoming(payload, this)) return;
        this.reactiveProperty.sendToPropertyInspector(data);
        this.sendToPropertyInspector?.(data);
    }

    /**
     * 调用 Plugin 端的方法（RPC）。
     *
     * ```ts
     * const result = await property.callPlugin('refreshData');
     * ```
     *
     * @param method - Plugin 端的方法名
     * @param args - 方法参数
     * @returns Promise，resolve 为方法的返回值
     */
    callPlugin(method: string, ...args: any[]): Promise<any> {
        return this._rpc.call(method, ...args);
    }
    setPreventWatch(preventWatch: boolean) {
        this.preventWatch = preventWatch;
    }
    /** settings 改变后触发（可选实现） */
    didReceiveSettings?(data: StreamDockEvents.DidReceiveSettings): void;
    didReceiveGlobalSettings?: (data: StreamDockEvents.DidReceiveGlobalSettings) => void;
    sendToPropertyInspector?: (data: StreamDockEvents.SendToPropertyInspector) => void;
}

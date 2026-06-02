/**
 * Stream Dock WebSocket 兼容层 polyfill。
 *
 * 在浏览器环境中注入以下全局函数：
 * - `window.connectSDSocket` — 主入口，接收 4~5 个参数，解析后存入 `window.argv`，
 *   然后调用 `startPlugin()` 或 `startProperty()`
 * - `window.connectSocket` — 别名，指向 `connectSDSocket`
 * - `window.connectElgatoStreamDeckSocket` — 兼容 Elgato 命名，指向 `connectSDSocket`
 *
 * 同时设置 `window.i18n` Proxy：如果翻译 key 不存在，返回 key 本身作为 fallback。
 *
 * @remarks
 * 必须在 `Plugin.initPlugin()` 或 `Property.initProperty()` 中调用。
 * 只有在 Stream Dock 环境中才会被调用（`connectSDSocket` 不存在时才注入）。
 */
export function ensureSDSocketPolyfill() {
    if (window.connectSDSocket != null) return;

    window._i18n = {};
    window.i18n = new Proxy(window._i18n, {
        get(target, prop, receiver) {
            if (typeof prop === "symbol") {
                return Reflect.get(target, prop, receiver);
            }
            return Object.prototype.hasOwnProperty.call(window._i18n, prop)
                ? window._i18n[prop as string]
                : String(prop);
        },
    });

    /**
     * 主入口函数 — 由 Stream Dock 应用在页面加载时调用。
     *
     * @param port - WebSocket 端口号
     * @param uuid - 插件 UUID
     * @param registerEvent - 注册事件名称
     * @param info - 应用和插件信息的 JSON 字符串
     * @param actionInfo - (仅 Property Inspector) action 信息的 JSON 字符串
     */
    window.connectSDSocket = async function () {
        window.argv = [
            arguments[0],
            arguments[1],
            arguments[2],
            JSON.parse(arguments[3]),
            arguments[4] && JSON.parse(arguments[4]),
        ];
        if (arguments[4]) {
            if (window.startProperty) await window.startProperty();
        } else {
            if (window.startPlugin) await window.startPlugin();
        }
    };
    window.connectSocket = window.connectSDSocket;
    window.connectElgatoStreamDeckSocket = window.connectSDSocket;
}

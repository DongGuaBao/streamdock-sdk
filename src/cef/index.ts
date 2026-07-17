import "../types";

export type RpcProxy = Record<string, (...args: any[]) => Promise<any>>;

export interface Action {
    /** 与 Node Action 相同的 context。 */
    context: string;
    /** action UUID 的最后一段。 */
    actionName: string;
    /** 调用相同 context 的 Node Action 上任意公开普通方法。 */
    readonly nodejs: RpcProxy;
}

export type ActionConstructor<T extends Action = Action> = new (...args: any[]) => T;

export interface CefPlugin {
    action: Record<string, ActionConstructor>;
    regActionClass(name: string, ActionClass: ActionConstructor): void;
    /** 仅完成本地注册，不建立 WebSocket。 */
    start(): void;
    /** start() 的别名；仅完成本地注册，不建立 WebSocket。 */
    startPlugin(): void;
    [actionName: string]: any;
}

interface InjectedCefPluginSdk {
    plugin: CefPlugin;
    Action: ActionConstructor;
}

const injected = (globalThis as any).CefPluginSDK as InjectedCefPluginSdk | undefined;
if (!injected) {
    throw new Error(
        "@mirabox/streamdock-sdk/cef must run inside a page created by initializeCefPlugin()",
    );
}

/** 不连接 WebSocket，只注册 CEF Action 类并参与本地 RPC 路由。 */
export const plugin = injected.plugin;
/** CEF Action 基类，提供 this.nodejs RPC Proxy。 */
export const Action = injected.Action;

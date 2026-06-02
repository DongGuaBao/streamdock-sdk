/**
 * Plugin 运行时的全局状态，用于跟踪当前活跃的 Property Inspector。
 *
 * 当用户在画布上选择某个按键时，Stream Dock 会打开对应的 Property Inspector，
 * SDK 通过 `_propertyInspectorDidAppear` 钩子更新此状态，
 * 以便 `sendToPropertyInspector` 等方法自动附加正确的 `action` 和 `context`。
 */
export const pluginState = {
    /** 当前 Property Inspector 对应的 action 名称（UUID 最后一段） */
    currentAction: null as string | null,
    /** 当前 Property Inspector 对应的 context */
    currentContext: null as string | null,
};

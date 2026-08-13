import { defineComponent, h, ref, type PropType } from "vue";
import { ensurePropertyUiStyles, propertyUiCss } from "./styles";

type OptionValue = string | number | boolean;
export type MiSelectOption = { label: string; value: OptionValue; disabled?: boolean };

function useUi() { ensurePropertyUiStyles(); }
const childrenOf = (slots: any) => slots.default?.();

export const MiPanel = defineComponent({
    name: "MiPanel",
    setup(_, { slots }) { useUi(); return () => h("main", { class: "mi-panel" }, childrenOf(slots)); },
});

export const MiSection = defineComponent({
    name: "MiSection",
    props: { title: String },
    setup(props, { slots }) { useUi(); return () => h("section", { class: "mi-section" }, [
        props.title ? h("div", { class: "mi-section__title", title: props.title }, props.title) : null,
        childrenOf(slots),
    ]); },
});

export const MiGrid = defineComponent({
    name: "MiGrid",
    props: { columns: { type: Number as PropType<1 | 2>, default: 2 } },
    setup(props, { slots }) { useUi(); return () => h("div", { class: ["mi-grid", `mi-grid--${props.columns}`] }, childrenOf(slots)); },
});

export const MiField = defineComponent({
    name: "MiField",
    props: { label: { type: String, required: true }, hint: String, error: String, required: Boolean },
    setup(props, { slots }) { useUi(); return () => h("div", { class: "mi-field" }, [
        h("div", { class: "mi-field__label", title: props.label }, [props.label, props.required ? h("span", { class: "mi-field__required" }, "*") : null]),
        h("div", { class: "mi-field__body" }, [childrenOf(slots), props.error ? h("div", { class: "mi-field__error" }, props.error) : props.hint ? h("div", { class: "mi-field__hint" }, props.hint) : null]),
    ]); },
});

const textProps = { modelValue: { type: [String, Number] as PropType<string | number>, default: "" }, placeholder: String, disabled: Boolean };
export const MiTextInput = defineComponent({
    name: "MiTextInput", inheritAttrs: false, props: textProps, emits: ["update:modelValue"],
    setup(props, { attrs, emit }) { useUi(); return () => h("input", { ...attrs, class: ["mi-control", attrs.class], type: "text", value: props.modelValue, placeholder: props.placeholder, disabled: props.disabled, onInput: (e: Event) => emit("update:modelValue", (e.target as HTMLInputElement).value) }); },
});

export const MiNumberInput = defineComponent({
    name: "MiNumberInput", inheritAttrs: false,
    props: { modelValue: { type: Number as PropType<number | null>, default: null }, min: Number, max: Number, step: { type: Number, default: 1 }, suffix: String, disabled: Boolean }, emits: ["update:modelValue"],
    setup(props, { attrs, emit }) { useUi(); return () => h("div", { class: "mi-number", style: props.suffix ? { "--mi-number-suffix-space": `${Math.min(50, props.suffix.length * 8 + 14)}px` } : undefined }, [
        h("input", { ...attrs, class: ["mi-control", attrs.class], type: "number", value: props.modelValue ?? "", min: props.min, max: props.max, step: props.step, disabled: props.disabled, onWheel: (e: WheelEvent) => (e.currentTarget as HTMLInputElement).blur(), onInput: (e: Event) => { const value = (e.target as HTMLInputElement).value; emit("update:modelValue", value === "" ? null : Number(value)); } }),
        props.suffix ? h("span", { class: "mi-number__suffix" }, props.suffix) : null,
    ]); },
});

export const MiSelect = defineComponent({
    name: "MiSelect", inheritAttrs: false,
    props: { modelValue: { type: [String, Number, Boolean] as PropType<OptionValue>, required: true }, options: { type: Array as PropType<Array<MiSelectOption | OptionValue>>, default: () => [] }, disabled: Boolean }, emits: ["update:modelValue", "change"],
    setup(props, { attrs, emit }) { useUi(); return () => h("select", { ...attrs, class: ["mi-control", attrs.class], value: String(props.modelValue), disabled: props.disabled, onChange: (e: Event) => { const raw = (e.target as HTMLSelectElement).value; const option = props.options.map(item => typeof item === "object" ? item : { label: String(item), value: item }).find(item => String(item.value) === raw); const value = option?.value ?? raw; emit("update:modelValue", value); emit("change", value); } }, props.options.map(item => { const option = typeof item === "object" ? item : { label: String(item), value: item }; return h("option", { value: String(option.value), disabled: option.disabled }, option.label); })); },
});

export const MiFilePicker = defineComponent({
    name: "MiFilePicker", inheritAttrs: false,
    props: { accept: String, multiple: Boolean, disabled: Boolean, buttonText: { type: String, default: "选择文件" }, emptyText: { type: String, default: "未选择文件" } }, emits: ["select"],
    setup(props, { attrs, emit }) { useUi(); let input: HTMLInputElement | null = null; const name = ref(props.emptyText); return () => h("div", { class: "mi-file" }, [
        h("input", { ...attrs, ref: (el: any) => input = el, type: "file", accept: props.accept, multiple: props.multiple, disabled: props.disabled, style: "display:none", onChange: (e: Event) => { const files = Array.from((e.target as HTMLInputElement).files ?? []); name.value = files.map(file => file.name).join(", ") || props.emptyText; emit("select", props.multiple ? files : files[0] ?? null); } }),
        h(MiButton, { disabled: props.disabled, onClick: () => input?.click() }, () => props.buttonText),
        h("span", { class: "mi-file__name", title: name.value }, name.value),
    ]); },
});

export const MiColorInput = defineComponent({
    name: "MiColorInput", props: { modelValue: { type: String, default: "#ffffff" }, disabled: Boolean }, emits: ["update:modelValue"],
    setup(props, { emit }) { useUi(); const update = (e: Event) => emit("update:modelValue", (e.target as HTMLInputElement).value); return () => h("div", { class: "mi-color" },
        h("input", { class: ["mi-control", "mi-color__picker"], type: "color", value: props.modelValue, disabled: props.disabled, onInput: update })); },
});

export const MiSlider = defineComponent({
    name: "MiSlider", props: { modelValue: { type: Number, required: true }, min: { type: Number, default: 0 }, max: { type: Number, default: 100 }, step: { type: Number, default: 1 }, suffix: String, disabled: Boolean }, emits: ["update:modelValue"],
    setup(props, { emit }) { useUi(); return () => h("div", { class: "mi-slider" }, [
        h("input", { type: "range", value: props.modelValue, min: props.min, max: props.max, step: props.step, disabled: props.disabled, onInput: (e: Event) => emit("update:modelValue", Number((e.target as HTMLInputElement).value)) }),
        h("span", { class: "mi-slider__value" }, `${props.modelValue}${props.suffix ?? ""}`),
    ]); },
});

export const MiCheckbox = defineComponent({
    name: "MiCheckbox", props: { modelValue: Boolean, label: String, disabled: Boolean }, emits: ["update:modelValue"],
    setup(props, { slots, emit }) { useUi(); return () => h("label", { class: "mi-check" }, [h("input", { type: "checkbox", checked: props.modelValue, disabled: props.disabled, onChange: (e: Event) => emit("update:modelValue", (e.target as HTMLInputElement).checked) }), h("span", { class: "mi-check__text", title: props.label }, childrenOf(slots) ?? props.label)]); },
});

export const MiButton = defineComponent({
    name: "MiButton", inheritAttrs: false, props: { variant: { type: String as PropType<"default" | "primary" | "danger" | "ghost">, default: "default" }, disabled: Boolean }, emits: ["click"],
    setup(props, { attrs, slots, emit }) { useUi(); return () => h("button", { ...attrs, class: ["mi-button", `mi-button--${props.variant}`, attrs.class], type: "button", disabled: props.disabled, onClick: (e: MouseEvent) => emit("click", e) }, childrenOf(slots)); },
});

export const MiButtonGroup = defineComponent({ name: "MiButtonGroup", setup(_, { slots }) { useUi(); return () => h("div", { class: "mi-button-group" }, childrenOf(slots)); } });
export const MiHint = defineComponent({ name: "MiHint", props: { danger: Boolean }, setup(props, { slots }) { useUi(); return () => h("div", { class: ["mi-hint", props.danger && "mi-hint--danger"] }, childrenOf(slots)); } });

export { ensurePropertyUiStyles, propertyUiCss };

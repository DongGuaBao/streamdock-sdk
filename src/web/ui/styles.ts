const STYLE_ID = "mirabox-property-ui";

export const propertyUiCss = `
:root {
  --mi-font-family: "Segoe UI", "Microsoft YaHei", sans-serif;
  --mi-font-size: 14px;
  --mi-font-size-small: 12px;
  --mi-text: rgba(255,255,255,.92);
  --mi-text-muted: rgba(255,255,255,.62);
  --mi-text-disabled: rgba(255,255,255,.38);
  --mi-border: rgba(255,255,255,.22);
  --mi-border-hover: rgba(255,255,255,.42);
  --mi-focus: rgb(103,98,255);
  --mi-danger: rgb(255,84,96);
  --mi-popup-bg: rgb(43,43,46);
  --mi-button-bg: rgb(76,76,82);
  --mi-button-hover-bg: rgb(94,94,102);
  --mi-radius: 4px;
  --mi-control-height: 28px;
  --mi-page-padding: 8px;
  --mi-row-gap: 10px;
  --mi-section-gap: 12px;
  --mi-label-width: 94px;
}
:root[data-mirabox-host="streamdock"] {
  --mi-page-padding: 6px 8px;
  --mi-row-gap: 8px;
  --mi-section-gap: 10px;
  --mi-label-width: 108px;
}
@media (max-height: 205px) {
  :root {
    --mi-page-padding: 6px 8px;
    --mi-row-gap: 8px;
    --mi-section-gap: 10px;
  }
}
.mi-panel,
.mi-panel * { box-sizing: border-box; min-width: 0; }
.mi-panel {
  width: 100%; max-width: 100%; height: 100vh;
  margin: 0; padding: var(--mi-page-padding);
  overflow-x: hidden; overflow-y: auto;
  overscroll-behavior-x: none;
  color: var(--mi-text); background: transparent;
  font: var(--mi-font-size)/1.35 var(--mi-font-family);
}
.mi-panel::-webkit-scrollbar { width: 6px; height: 0; }
.mi-panel::-webkit-scrollbar-track { background: transparent; }
.mi-panel::-webkit-scrollbar-thumb { background: rgba(255,255,255,.22); border-radius: 6px; }
.mi-section { display: grid; width: 100%; max-width: 100%; gap: var(--mi-row-gap); margin: 0 0 var(--mi-section-gap); }
.mi-section:last-child { margin-bottom: 0; }
.mi-section__title { overflow: hidden; color: var(--mi-text-muted); font-size: var(--mi-font-size-small); font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.mi-grid { display: grid; width: 100%; max-width: 100%; gap: var(--mi-row-gap) 8px; align-items: start; }
.mi-grid--1 { grid-template-columns: minmax(0,1fr); }
.mi-grid--2 { grid-template-columns: repeat(2,minmax(0,1fr)); }
.mi-field { display: grid; width: 100%; max-width: 100%; grid-template-columns: minmax(0,1fr); gap: 5px; margin-top: 3px; align-items: stretch; }
.mi-field__label { overflow: hidden; color: var(--mi-text); text-overflow: ellipsis; white-space: nowrap; }
.mi-field__required { margin-left: 2px; color: var(--mi-danger); }
.mi-field__body { width: 100%; max-width: 100%; }
.mi-field__hint,.mi-hint { color: var(--mi-text-muted); font-size: var(--mi-font-size-small); overflow-wrap: anywhere; }
.mi-field__error,.mi-hint--danger { color: var(--mi-danger); }
.mi-control {
  width: 100%; max-width: 100%; height: var(--mi-control-height);
  padding: 0 7px; border: 1px solid var(--mi-border); border-radius: var(--mi-radius);
  outline: 0; color: var(--mi-text); background: transparent; font: inherit;
}
.mi-control:hover { border-color: var(--mi-border-hover); background: rgba(255,255,255,.04); }
.mi-control:focus { border-color: var(--mi-focus); box-shadow: 0 0 0 1px var(--mi-focus); }
.mi-control:disabled { color: var(--mi-text-disabled); cursor: not-allowed; opacity: .7; }
select.mi-control { background-color: transparent; }
select.mi-control option { color: white; background: var(--mi-popup-bg); }
.mi-number { position: relative; width: 100%; max-width: 100%; }
.mi-number .mi-control { padding-right: var(--mi-number-suffix-space,7px); }
.mi-number__suffix { position: absolute; right: 7px; top: 50%; max-width: 42px; transform: translateY(-50%); overflow: hidden; color: var(--mi-text-muted); text-overflow: ellipsis; pointer-events: none; }
.mi-file { display: flex; width: 100%; max-width: 100%; gap: 6px; align-items: center; }
.mi-file__name { flex: 1; overflow: hidden; color: var(--mi-text-muted); text-overflow: ellipsis; white-space: nowrap; }
.mi-color { display: block; width: 100%; max-width: 100%; }
.mi-color__picker {
  display: block; width: 100%; height: var(--mi-control-height); padding: 0;
  border: 0; border-radius: var(--mi-radius); overflow: hidden;
  background: transparent; cursor: pointer;
}
.mi-color__picker::-webkit-color-swatch-wrapper { padding: 0; }
.mi-color__picker::-webkit-color-swatch { border: 0; border-radius: var(--mi-radius); }
.mi-color__picker::-moz-color-swatch { border: 0; border-radius: var(--mi-radius); }
.mi-color__picker:focus-visible { outline: 2px solid var(--mi-focus); outline-offset: 1px; }
.mi-slider { display: grid; width: 100%; max-width: 100%; grid-template-columns: minmax(0,1fr) 48px; gap: 7px; align-items: center; }
.mi-slider input[type="range"] { width: 100%; max-width: 100%; accent-color: var(--mi-focus); }
.mi-slider__value { overflow: hidden; color: var(--mi-text-muted); text-align: right; text-overflow: ellipsis; white-space: nowrap; }
.mi-check {
  display: grid; width: 100%; max-width: 100%; min-height: var(--mi-control-height);
  grid-template-columns: 16px minmax(0,1fr); gap: 8px; align-items: center;
  color: var(--mi-text); cursor: pointer;
}
.mi-check input {
  display: block; width: 16px; height: 16px; margin: 0;
  align-self: center; accent-color: var(--mi-focus);
}
.mi-check__text {
  display: block; overflow: hidden; line-height: 20px;
  text-overflow: ellipsis; white-space: nowrap;
}
.mi-button { min-width: 0; height: var(--mi-control-height); padding: 0 10px; border: 1px solid transparent; border-radius: var(--mi-radius); color: white; background: var(--mi-button-bg); font: inherit; cursor: pointer; }
.mi-button:hover { background: var(--mi-button-hover-bg); }
.mi-button:focus-visible { outline: 1px solid var(--mi-focus); outline-offset: 1px; }
.mi-button--primary { background: var(--mi-focus); }
.mi-button--danger { background: var(--mi-danger); }
.mi-button--ghost { border-color: var(--mi-border); background: transparent; }
.mi-button:disabled { color: var(--mi-text-disabled); cursor: not-allowed; opacity: .65; }
.mi-button-group { display: flex; width: 100%; max-width: 100%; flex-wrap: wrap; gap: 6px; }
`;

export function ensurePropertyUiStyles(): void {
    if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = propertyUiCss;
    document.head.appendChild(style);
}

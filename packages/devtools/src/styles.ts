const Z_INDEX_DEVTOOLS = 99_999;

export const styles = `
.rc-devtools {
  --rc-bg: #101419; --rc-raised: #161b22; --rc-hover: #1c232d; --rc-border: #2a313c;
  --rc-text: #e4e8ee; --rc-muted: #8b98aa; --rc-accent: #61dafb; --rc-ok: #4ed4a4; --rc-warn: #efbb69; --rc-error: #f6a3a9;
  color-scheme: dark; color: var(--rc-text); font: 12px/1.5 ui-sans-serif, system-ui, sans-serif; text-align: left;
}
.rc-devtools *, .rc-devtools *::before, .rc-devtools *::after { box-sizing: border-box; }
.rc-devtools button, .rc-devtools input { font: inherit; color: inherit; letter-spacing: normal; }
.rc-devtools button { cursor: pointer; border: 1px solid var(--rc-border); border-radius: 6px; background: var(--rc-raised); padding: 6px 12px; }
.rc-devtools button:hover { background: var(--rc-hover); }
.rc-devtools :is(button, input, summary):focus-visible { outline: 2px solid var(--rc-accent); outline-offset: -2px; }
.rc-devtools p { margin: 0; }
.rc-devtools code, .rc-devtools pre { font: 11px/1.5 ui-monospace, monospace; background: none; padding: 0; }
.rc-devtools svg { flex-shrink: 0; color: var(--rc-accent); }
.rc-devtools .rc-dot { display: inline-block; flex-shrink: 0; width: 7px; height: 7px; border-radius: 50%; background: var(--rc-muted); }
.rc-devtools .rc-dot[data-state="connected"], .rc-devtools .rc-dot[data-state="subscribed"] { background: var(--rc-ok); box-shadow: 0 0 0 3px color-mix(in srgb, var(--rc-ok) 15%, transparent); }
.rc-devtools .rc-dot[data-state="connecting"], .rc-devtools .rc-dot[data-state="subscribing"] { background: var(--rc-warn); }
.rc-devtools .rc-dot[data-state="error"] { background: var(--rc-error); box-shadow: 0 0 0 3px color-mix(in srgb, var(--rc-error) 25%, transparent); }
.rc-devtools .rc-launcher { position: fixed; z-index: ${Z_INDEX_DEVTOOLS}; bottom: 20px; right: 20px; display: flex; align-items: center; gap: 10px; border-radius: 12px; background: var(--rc-bg); padding: 10px 14px; box-shadow: 0 6px 28px #0005; }
.rc-devtools .rc-panel { container-type: inline-size; position: fixed; z-index: ${Z_INDEX_DEVTOOLS}; left: 16px; right: 16px; bottom: 16px; height: min(450px, 55dvh); display: flex; flex-direction: column; overflow: hidden; border: 1px solid var(--rc-border); border-radius: 12px; background: var(--rc-bg); box-shadow: 0 12px 64px #0007; }
.rc-devtools .rc-header { display: flex; align-items: center; gap: 10px; min-height: 44px; padding: 6px 14px; background: var(--rc-raised); border-bottom: 1px solid var(--rc-border); font-size: 13px; }
.rc-devtools .rc-label { color: var(--rc-muted); font-size: 10px; text-transform: uppercase; letter-spacing: 1px; }
.rc-devtools .rc-session { min-width: 0; margin-left: 6px; padding-left: 12px; border-left: 1px solid var(--rc-border); color: var(--rc-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rc-devtools .rc-connection { display: flex; align-items: center; gap: 8px; margin-left: auto; font: 11px/1.5 ui-monospace, monospace; white-space: nowrap; }
.rc-devtools .rc-close { font-size: 20px; border: 0; background: transparent; padding: 0 6px; line-height: 1.2; }
.rc-devtools .rc-body { flex: 1; min-height: 0; display: grid; grid-template-columns: 260px minmax(0, 1fr); }
.rc-devtools .rc-channels { display: block; overflow: auto; padding: 8px; border-right: 1px solid var(--rc-border); }
.rc-devtools .rc-channel { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; width: 100%; padding: 8px 10px; border-color: transparent; background: transparent; text-align: left; margin: 0 0 2px; }
.rc-devtools .rc-channel[aria-pressed="true"] { background: color-mix(in srgb, var(--rc-accent) 10%, transparent); border-color: color-mix(in srgb, var(--rc-accent) 30%, transparent); color: #a3eaff; }
.rc-devtools .rc-channel-name { display: flex; align-items: center; gap: 9px; overflow-wrap: anywhere; font: 11px/1.5 ui-monospace, monospace; }
.rc-devtools .rc-channel small { width: 100%; color: var(--rc-muted); font-size: 10px; }
.rc-devtools .rc-channel .rc-error { color: var(--rc-error); overflow-wrap: anywhere; }
.rc-devtools .rc-count { margin-left: auto; background: var(--rc-hover); border-radius: 4px; padding: 0 6px; font-size: 10px; }
.rc-devtools .rc-channel-empty { color: var(--rc-muted); padding: 18px 10px; font-size: 11px; }
.rc-devtools .rc-main { min-height: 0; display: flex; flex-direction: column; }
.rc-devtools .rc-toolbar { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; padding: 8px 12px; border-bottom: 1px solid var(--rc-border); }
.rc-devtools .rc-toolbar input[type="search"] { flex: 1; min-width: 160px; height: 30px; border: 1px solid var(--rc-border); border-radius: 6px; padding: 6px 10px; background: var(--rc-bg); }
.rc-devtools .rc-toolbar input::placeholder { color: var(--rc-muted); }
.rc-devtools .rc-toolbar button[aria-pressed="true"] { border-color: var(--rc-warn); color: var(--rc-warn); }
.rc-devtools .rc-capture { display: flex; align-items: center; gap: 6px; margin: 0 4px; white-space: nowrap; cursor: pointer; }
.rc-devtools .rc-capture input { margin: 0; width: 13px; height: 13px; accent-color: var(--rc-accent); }
.rc-devtools .rc-total { color: var(--rc-muted); font-size: 10px; white-space: nowrap; }
.rc-devtools .rc-events { flex: 1; min-height: 0; overflow: auto; overscroll-behavior: contain; }
.rc-devtools .rc-event { border-bottom: 1px solid var(--rc-border); }
.rc-devtools .rc-event summary { display: grid; grid-template-columns: 84px 140px minmax(0, 1fr) minmax(0, 2fr) 10px; gap: 12px; align-items: center; padding: 7px 14px; cursor: pointer; list-style: none; font: 11px/1.5 ui-monospace, monospace; }
.rc-devtools .rc-event summary::-webkit-details-marker { display: none; }
.rc-devtools .rc-event summary:hover { background: var(--rc-hover); }
.rc-devtools .rc-event summary > * { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rc-devtools .rc-event time { color: var(--rc-muted); font-size: 10px; }
.rc-devtools .rc-event-type { color: #83d3e9; }
.rc-devtools .rc-event-channel { color: #b0bfd1; }
.rc-devtools .rc-event-summary { color: var(--rc-muted); }
.rc-devtools .rc-event[data-kind="PUBLICATION"] { box-shadow: inset 2px 0 0 var(--rc-ok); }
.rc-devtools .rc-event[data-kind="PUBLICATION"] .rc-event-type { color: var(--rc-ok); font-weight: 500; }
.rc-devtools .rc-event[data-kind="PUBLICATION"] .rc-event-summary { color: var(--rc-text); }
.rc-devtools .rc-event[data-kind="RUNTIME"] .rc-event-type { color: var(--rc-muted); }
.rc-devtools .rc-event[data-kind="ERROR"] :is(.rc-event-type, .rc-event-summary) { color: var(--rc-error); }
.rc-devtools .rc-expand { color: var(--rc-muted); transition: transform 120ms; }
.rc-devtools details[open] .rc-expand { transform: rotate(180deg); }
.rc-devtools .rc-context { position: relative; background: #0b1015; }
.rc-devtools .rc-context pre { margin: 0; padding: 12px 80px 12px 20px; overflow: auto; max-height: 260px; color: #b7cbdc; line-height: 1.6; }
.rc-devtools .rc-copy { position: absolute; top: 8px; right: 12px; padding: 3px 10px; font-size: 11px; }
.rc-devtools .rc-empty { margin: auto; padding: 30px; max-width: 420px; text-align: center; color: var(--rc-muted); }
.rc-devtools .rc-empty strong { display: block; font-weight: 500; color: var(--rc-text); margin-bottom: 8px; }
.rc-devtools .rc-empty button { margin-top: 14px; }
/* Only the fixed panel box follows the viewport. Everything inside follows the panel width. */
@media (max-width: 650px) {
  .rc-devtools .rc-panel { left: 6px; right: 6px; bottom: 6px; height: min(560px, calc(100dvh - 12px)); }
}
@container (max-width: 650px) {
  .rc-devtools .rc-header { gap: 8px; padding: 6px 10px; }
  .rc-devtools .rc-label, .rc-devtools .rc-session { display: none; }
  .rc-devtools .rc-body { grid-template-columns: minmax(0, 1fr); grid-template-rows: 110px minmax(0, 1fr); }
  .rc-devtools .rc-channels { border-right: 0; border-bottom: 1px solid var(--rc-border); }
  /* No room for the channel column at phone width. It is still in the sidebar and the expanded context. */
  .rc-devtools .rc-event summary { grid-template-columns: 82px 90px minmax(0, 1fr) 10px; gap: 6px; padding: 7px 9px; }
  .rc-devtools .rc-event-channel { display: none; }
}
`;

"use client";
import { useState, useCallback } from "react";

const initialState = {
  x: 4,
  y: 4,
  blur: 10,
  spread: 0,
  color: "#000000",
  opacity: 30,
  inset: false,
};

function Slider({ label, value, min, max, onChange }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          {label}
        </label>
        <span className="text-xs font-mono font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">
          {value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none bg-gray-200 accent-blue-600 cursor-pointer"
      />
    </div>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-8 h-4 rounded-full transition-colors focus:outline-none flex-shrink-0 cursor-pointer ${
          checked ? "bg-blue-600" : "bg-gray-300"
        }`}
      >
        <span
          className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>
      <span className="text-xs font-medium text-gray-600">{label}</span>
    </label>
  );
}

function CopyButton({ text }) {
  const [state, setState] = useState("idle");

  async function handleCopy() {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("error");
    }
    setTimeout(() => setState("idle"), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      disabled={!text}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-gray-700 rounded-lg transition-colors"
    >
      {state === "copied" ? (
        <>
          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-green-600">Copied!</span>
        </>
      ) : (
        <>
          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy
        </>
      )}
    </button>
  );
}

function PanelHeader({ label, actions }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-t-xl">
      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</span>
      {actions && <div className="flex items-center gap-1.5">{actions}</div>}
    </div>
  );
}

export default function BoxShadowGenerator() {
  const [shadow, setShadow] = useState(initialState);

  const update = useCallback((key, val) => {
    setShadow((prev) => ({ ...prev, [key]: val }));
  }, []);

  const hexToRgba = (hex, opacity) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${opacity / 100})`;
  };

  const colorRgba = hexToRgba(shadow.color, shadow.opacity);
  const css = `${shadow.inset ? "inset " : ""}${shadow.x}px ${shadow.y}px ${shadow.blur}px ${shadow.spread}px ${colorRgba}`;
  const cssOutput = `box-shadow: ${css};`;

  return (
    <div className="space-y-4">

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Controls panel */}
        <div className="flex flex-col">
          <PanelHeader label="Controls" />
          <div className="flex flex-col gap-5 p-4 bg-white border border-gray-200 border-t-0 rounded-b-xl">
            <Slider label="Offset X (px)" value={shadow.x} min={-50} max={50} onChange={(v) => update("x", v)} />
            <Slider label="Offset Y (px)" value={shadow.y} min={-50} max={50} onChange={(v) => update("y", v)} />
            <Slider label="Blur (px)" value={shadow.blur} min={0} max={100} onChange={(v) => update("blur", v)} />
            <Slider label="Spread (px)" value={shadow.spread} min={-50} max={50} onChange={(v) => update("spread", v)} />
            <Slider label="Opacity (%)" value={shadow.opacity} min={0} max={100} onChange={(v) => update("opacity", v)} />

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Shadow Color</span>
              <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <input
                  type="color"
                  value={shadow.color}
                  onChange={(e) => update("color", e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent flex-shrink-0"
                />
                <span className="text-xs font-mono font-semibold text-gray-700">{shadow.color}</span>
                <span className="text-xs text-gray-400 ml-auto">
                  rgba({parseInt(shadow.color.slice(1,3),16)},{parseInt(shadow.color.slice(3,5),16)},{parseInt(shadow.color.slice(5,7),16)},{shadow.opacity/100})
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div>
                <p className="text-xs font-semibold text-gray-700">Inset Shadow</p>
                <p className="text-xs text-gray-400 mt-0.5">Creates an inner shadow effect</p>
              </div>
              <Toggle checked={shadow.inset} onChange={(v) => update("inset", v)} label="" />
            </div>
          </div>
        </div>

        {/* Preview + Output */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col">
            <PanelHeader label="Live Preview" />
            <div className="flex flex-col items-center justify-center gap-3 min-h-[200px] bg-gray-50 border border-gray-200 border-t-0 rounded-b-xl p-6">
              <div
                className="w-36 h-36 rounded-xl bg-white transition-all duration-150"
                style={{ boxShadow: css }}
              />
              <p className="text-xs text-gray-400">Hover over the box to inspect</p>
            </div>
          </div>

          <div className="flex flex-col">
            <PanelHeader
              label="CSS Output"
              actions={<CopyButton text={cssOutput} />}
            />
            <div className="p-4 bg-gray-50 border border-gray-200 border-t-0 rounded-b-xl">
              <pre className="text-sm font-mono text-gray-800 whitespace-pre-wrap break-all leading-relaxed">
                {cssOutput}
              </pre>
            </div>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-4 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl">
            {[
              { label: "X", value: `${shadow.x}px` },
              { label: "Y", value: `${shadow.y}px` },
              { label: "Blur", value: `${shadow.blur}px` },
              { label: "Spread", value: `${shadow.spread}px` },
              { label: "Opacity", value: `${shadow.opacity}%` },
              { label: "Inset", value: shadow.inset ? "Yes" : "No" },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center gap-1.5 text-xs">
                <span className="text-gray-400">{label}:</span>
                <span className="font-mono font-semibold text-gray-700">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
"use client";
import { useState } from "react";

const initialState = {
  label:        "Get Started",
  paddingX:     24,
  paddingY:     12,
  borderRadius: 8,
  fontSize:     15,
  bgColor:      "#2563eb",
  textColor:    "#ffffff",
  borderWidth:  0,
  borderColor:  "#2563eb",
  hoverBg:      "#1d4ed8",
  hoverText:    "#ffffff",
};

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

function Slider({ label, value, min, max, unit = "px", onChange }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</label>
        <span className="text-xs font-mono font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">
          {value}{unit}
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

function ColorRow({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
      <span className="text-xs font-medium text-gray-600">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono text-gray-500">{value}</span>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent"
        />
      </div>
    </div>
  );
}

export default function ButtonGenerator() {
  const [config, setConfig]   = useState(initialState);
  const [isHovered, setHovered] = useState(false);

  const update = (key, val) => setConfig((prev) => ({ ...prev, [key]: val }));

  const {
    label, paddingX, paddingY, borderRadius, fontSize,
    bgColor, textColor, borderWidth, borderColor, hoverBg, hoverText,
  } = config;

  const liveStyle = {
    paddingTop:    paddingY,
    paddingBottom: paddingY,
    paddingLeft:   paddingX,
    paddingRight:  paddingX,
    borderRadius,
    fontSize,
    backgroundColor: isHovered ? hoverBg : bgColor,
    color:           isHovered ? hoverText : textColor,
    border:          borderWidth > 0 ? `${borderWidth}px solid ${borderColor}` : "none",
    fontWeight:      600,
    cursor:          "pointer",
    transition:      "all 0.2s ease",
    lineHeight:      1.5,
  };

  const cssOutput = `.button {
  padding: ${paddingY}px ${paddingX}px;
  border-radius: ${borderRadius}px;
  font-size: ${fontSize}px;
  font-weight: 600;
  background-color: ${bgColor};
  color: ${textColor};
  border: ${borderWidth > 0 ? `${borderWidth}px solid ${borderColor}` : "none"};
  cursor: pointer;
  transition: all 0.2s ease;
}

.button:hover {
  background-color: ${hoverBg};
  color: ${hoverText};
}`;

  return (
    <div className="space-y-4">

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Controls */}
        <div className="flex flex-col">
          <PanelHeader label="Controls" />
          <div className="flex flex-col gap-5 p-4 bg-white border border-gray-200 border-t-0 rounded-b-xl">
            {/* Label */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Button Label</label>
              <input
                type="text"
                value={label}
                onChange={(e) => update("label", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 transition-colors bg-gray-50"
              />
            </div>

            <Slider label="Padding X" value={paddingX} min={4}  max={80} onChange={(v) => update("paddingX", v)} />
            <Slider label="Padding Y" value={paddingY} min={4}  max={60} onChange={(v) => update("paddingY", v)} />
            <Slider label="Border Radius" value={borderRadius} min={0} max={50} onChange={(v) => update("borderRadius", v)} />
            <Slider label="Font Size"  value={fontSize}  min={10} max={32} onChange={(v) => update("fontSize", v)} />
            <Slider label="Border Width" value={borderWidth} min={0} max={6}  onChange={(v) => update("borderWidth", v)} />

            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Colors</span>
              <ColorRow label="Background"  value={bgColor}    onChange={(v) => update("bgColor", v)} />
              <ColorRow label="Text"        value={textColor}  onChange={(v) => update("textColor", v)} />
              {borderWidth > 0 && (
                <ColorRow label="Border"   value={borderColor} onChange={(v) => update("borderColor", v)} />
              )}
              <ColorRow label="Hover Background" value={hoverBg}   onChange={(v) => update("hoverBg", v)} />
              <ColorRow label="Hover Text"       value={hoverText} onChange={(v) => update("hoverText", v)} />
            </div>
          </div>
        </div>

        {/* Preview + Output */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col">
            <PanelHeader label="Live Preview" />
            <div className="flex flex-col items-center justify-center gap-4 min-h-[180px] bg-gray-50 border border-gray-200 border-t-0 rounded-b-xl p-8">
              <button
                style={liveStyle}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
              >
                {label}
              </button>
              <span className="text-xs text-gray-400">
                {isHovered ? "🟡 Hover state" : "⚪ Default state"} · Hover to toggle
              </span>
            </div>
          </div>

          {/* Quick specs */}
          <div className="flex flex-wrap gap-4 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl">
            {[
              { label: "Padding",  value: `${paddingY}px ${paddingX}px` },
              { label: "Radius",   value: `${borderRadius}px` },
              { label: "Font",     value: `${fontSize}px` },
              { label: "Border",   value: borderWidth > 0 ? `${borderWidth}px` : "none" },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center gap-1.5 text-xs">
                <span className="text-gray-400">{label}:</span>
                <span className="font-mono font-semibold text-gray-700">{value}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col">
            <PanelHeader label="CSS Output" actions={<CopyButton text={cssOutput} />} />
            <div className="p-4 bg-gray-50 border border-gray-200 border-t-0 rounded-b-xl">
              <pre className="text-sm font-mono text-gray-800 whitespace-pre-wrap break-all leading-relaxed">
                {cssOutput}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
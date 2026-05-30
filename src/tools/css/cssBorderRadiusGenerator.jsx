"use client";
import { useState, useCallback } from "react";

const CORNERS = [
  { key: "tl", label: "Top Left",     position: "top-0 left-0"   },
  { key: "tr", label: "Top Right",    position: "top-0 right-0"  },
  { key: "br", label: "Bottom Right", position: "bottom-0 right-0" },
  { key: "bl", label: "Bottom Left",  position: "bottom-0 left-0"  },
];

const initialState = { tl: 8, tr: 8, br: 8, bl: 8 };

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

export default function BorderRadiusGenerator() {
  const [radii, setRadii] = useState(initialState);
  const [linked, setLinked] = useState(false);

  const update = useCallback(
    (key, val) => {
      if (linked) {
        setRadii({ tl: val, tr: val, br: val, bl: val });
      } else {
        setRadii((prev) => ({ ...prev, [key]: val }));
      }
    },
    [linked]
  );

  const { tl, tr, br, bl } = radii;
  const css = `${tl}px ${tr}px ${br}px ${bl}px`;
  const cssOutput = `border-radius: ${css};`;

  return (
    <div className="space-y-4">

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Controls */}
        <div className="flex flex-col">
          <PanelHeader
            label="Controls"
            actions={
              <Toggle checked={linked} onChange={setLinked} label="Link all corners" />
            }
          />
          <div className="flex flex-col gap-5 p-4 bg-white border border-gray-200 border-t-0 rounded-b-xl">
            {CORNERS.map(({ key, label }) => (
              <div key={key} className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    {label}
                  </label>
                  <span className="text-xs font-mono font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">
                    {radii[key]}px
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={radii[key]}
                  onChange={(e) => update(key, Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none bg-gray-200 accent-blue-600 cursor-pointer"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Preview + Output */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col">
            <PanelHeader label="Live Preview" />
            <div className="flex flex-col items-center justify-center gap-3 min-h-[220px] bg-gray-50 border border-gray-200 border-t-0 rounded-b-xl p-6">
              <div
                className="w-40 h-40 bg-blue-600 transition-all duration-150 flex items-center justify-center"
                style={{ borderRadius: css }}
              >
                <span className="text-white text-xs font-mono font-semibold text-center px-2">{css}</span>
              </div>
            </div>
          </div>

          {/* Corner breakdown */}
          <div className="grid grid-cols-2 gap-2">
            {CORNERS.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl">
                <span className="text-xs text-gray-500">{label}</span>
                <span className="text-xs font-mono font-semibold text-blue-700">{radii[key]}px</span>
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
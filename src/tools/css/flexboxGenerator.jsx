"use client";
import { useState } from "react";

const FLEX_DIRECTIONS   = ["row", "row-reverse", "column", "column-reverse"];
const JUSTIFY_OPTIONS   = ["flex-start", "flex-end", "center", "space-between", "space-around", "space-evenly"];
const ALIGN_OPTIONS     = ["flex-start", "flex-end", "center", "stretch", "baseline"];
const WRAP_OPTIONS      = ["nowrap", "wrap", "wrap-reverse"];

const ITEM_COLORS = [
  { bg: "#dbeafe", border: "#93c5fd", text: "#1d4ed8" },
  { bg: "#ede9fe", border: "#c4b5fd", text: "#6d28d9" },
  { bg: "#dcfce7", border: "#86efac", text: "#15803d" },
  { bg: "#fef3c7", border: "#fcd34d", text: "#b45309" },
  { bg: "#fce7f3", border: "#f9a8d4", text: "#be185d" },
];

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

function SegmentControl({ label, value, options, onChange }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</label>
      <div className="flex flex-wrap gap-1 p-1 bg-gray-100 rounded-xl">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`flex-1 px-2 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap min-w-fit ${
              value === opt
                ? "bg-white text-blue-700 shadow-sm border border-gray-200"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function FlexboxGenerator() {
  const [flexDirection,  setFlexDirection]  = useState("row");
  const [justifyContent, setJustifyContent] = useState("flex-start");
  const [alignItems,     setAlignItems]     = useState("center");
  const [flexWrap,       setFlexWrap]       = useState("wrap");
  const [gap,            setGap]            = useState(12);
  const [itemCount,      setItemCount]      = useState(4);

  const containerStyle = {
    display:        "flex",
    flexDirection,
    justifyContent,
    alignItems,
    flexWrap,
    gap:            `${gap}px`,
  };

  const cssOutput = `.container {
  display: flex;
  flex-direction: ${flexDirection};
  justify-content: ${justifyContent};
  align-items: ${alignItems};
  flex-wrap: ${flexWrap};
  gap: ${gap}px;
}`;

  const isColumn = flexDirection.startsWith("column");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Controls */}
        <div className="flex flex-col">
          <PanelHeader label="Controls" />
          <div className="flex flex-col gap-5 p-4 bg-white border border-gray-200 border-t-0 rounded-b-xl">
            <SegmentControl
              label="Flex Direction"
              value={flexDirection}
              options={FLEX_DIRECTIONS}
              onChange={setFlexDirection}
            />
            <SegmentControl
              label="Justify Content"
              value={justifyContent}
              options={JUSTIFY_OPTIONS}
              onChange={setJustifyContent}
            />
            <SegmentControl
              label="Align Items"
              value={alignItems}
              options={ALIGN_OPTIONS}
              onChange={setAlignItems}
            />
            <SegmentControl
              label="Flex Wrap"
              value={flexWrap}
              options={WRAP_OPTIONS}
              onChange={setFlexWrap}
            />

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Gap</label>
                <span className="text-xs font-mono font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">
                  {gap}px
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={48}
                value={gap}
                onChange={(e) => setGap(Number(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none bg-gray-200 accent-blue-600 cursor-pointer"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Item Count</label>
                <span className="text-xs font-mono font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">
                  {itemCount}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                value={itemCount}
                onChange={(e) => setItemCount(Number(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none bg-gray-200 accent-blue-600 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Preview + Output */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col">
            <PanelHeader label="Live Preview" />
            <div className="bg-gray-50 border border-gray-200 border-t-0 rounded-b-xl p-4 min-h-[220px]">
              <div
                className="w-full h-full min-h-[188px] border-2 border-dashed border-gray-300 rounded-lg p-3 transition-all duration-150"
                style={containerStyle}
              >
                {Array.from({ length: itemCount }).map((_, i) => {
                  const c = ITEM_COLORS[i % ITEM_COLORS.length];
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-center font-bold text-xs rounded-lg border transition-all duration-150"
                      style={{
                        backgroundColor: c.bg,
                        borderColor:     c.border,
                        color:           c.text,
                        minWidth:  isColumn ? "100%" : "52px",
                        minHeight: isColumn ? "40px" : "52px",
                        padding:   "8px 14px",
                      }}
                    >
                      {i + 1}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Active values summary */}
          <div className="flex flex-wrap gap-4 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl">
            {[
              { label: "Direction",  value: flexDirection },
              { label: "Justify",    value: justifyContent },
              { label: "Align",      value: alignItems },
              { label: "Wrap",       value: flexWrap },
              { label: "Gap",        value: `${gap}px` },
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
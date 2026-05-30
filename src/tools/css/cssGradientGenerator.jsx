"use client";
import { useState, useCallback } from "react";

const DIRECTIONS = [
  "to right", "to left", "to bottom", "to top",
  "to bottom right", "to bottom left", "to top right", "to top left",
];

const initialStops = [
  { color: "#3b82f6", position: 0 },
  { color: "#8b5cf6", position: 100 },
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

export default function GradientGenerator() {
  const [direction, setDirection] = useState("to right");
  const [stops, setStops] = useState(initialStops);

  const updateStop = useCallback((index, key, value) => {
    setStops((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [key]: value } : s))
    );
  }, []);

  const addStop = () => {
    if (stops.length >= 5) return;
    setStops((prev) => [...prev, { color: "#10b981", position: 50 }]);
  };

  const removeStop = (index) => {
    if (stops.length <= 2) return;
    setStops((prev) => prev.filter((_, i) => i !== index));
  };

  const gradientValue = `linear-gradient(${direction}, ${stops
    .map((s) => `${s.color} ${s.position}%`)
    .join(", ")})`;

  const cssOutput = `background: linear-gradient(
  ${direction},
  ${stops.map((s) => `${s.color} ${s.position}%`).join(",\n  ")}
);`;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Controls */}
        <div className="flex flex-col">
          <PanelHeader label="Controls" />
          <div className="flex flex-col gap-5 p-4 bg-white border border-gray-200 border-t-0 rounded-b-xl">

            {/* Direction */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Direction</label>
              <div className="grid grid-cols-2 gap-1.5">
                {DIRECTIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDirection(d)}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer text-left ${
                      direction === d
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Color stops */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Color Stops
                </label>
                <button
                  onClick={addStop}
                  disabled={stops.length >= 5}
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-100 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  + Add stop
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {stops.map((stop, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <input
                      type="color"
                      value={stop.color}
                      onChange={(e) => updateStop(i, "color", e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent flex-shrink-0"
                    />
                    <div className="flex-1 flex flex-col gap-1">
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-400">Position</span>
                        <span className="text-xs font-mono font-semibold text-blue-700">{stop.position}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={stop.position}
                        onChange={(e) => updateStop(i, "position", Number(e.target.value))}
                        className="w-full h-1.5 rounded-full appearance-none bg-gray-200 accent-blue-600 cursor-pointer"
                      />
                    </div>
                    <button
                      onClick={() => removeStop(i)}
                      disabled={stops.length <= 2}
                      className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Preview + Output */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col">
            <PanelHeader label="Live Preview" />
            <div
              className="min-h-[200px] border border-gray-200 border-t-0 rounded-b-xl transition-all duration-200"
              style={{ background: gradientValue }}
            />
          </div>

          {/* Stop swatches */}
          <div className="flex flex-wrap gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl">
            {stops.map((s, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs">
                <div className="w-3 h-3 rounded-sm border border-gray-200" style={{ backgroundColor: s.color }} />
                <span className="font-mono text-gray-500">{s.color}</span>
                <span className="text-gray-300">@{s.position}%</span>
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
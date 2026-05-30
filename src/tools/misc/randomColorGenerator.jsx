"use client";
import { useState, useCallback } from "react";
import { Palette } from "lucide-react";

// ── Color utilities ────────────────────────────────────────────
function randomHex() {
  const arr = new Uint8Array(3);
  window.crypto.getRandomValues(arr);
  return "#" + Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s;
  const l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function getContrastColor(hex) {
  const { r, g, b } = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5 ? "#111111" : "#FFFFFF";
}

// ── Shared ─────────────────────────────────────────────────────
function InlineCopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  async function handle() {
    await navigator.clipboard.writeText(text);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={handle}
      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono font-semibold bg-white/20 hover:bg-white/40 rounded transition-colors cursor-pointer">
      {copied ? "✓" : text}
    </button>
  );
}

function ColorCard({ hex, onRemove }) {
  const { r, g, b } = hexToRgb(hex);
  const { h, s, l } = rgbToHsl(r, g, b);
  const contrast = getContrastColor(hex);

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
      <div className="h-32 flex items-end justify-between p-3 gap-2" style={{ backgroundColor: hex }}>
        <div className="flex flex-col gap-1">
          <InlineCopyButton text={hex} />
          <InlineCopyButton text={`rgb(${r}, ${g}, ${b})`} />
          <InlineCopyButton text={`hsl(${h}, ${s}%, ${l}%)`} />
        </div>
        {onRemove && (
          <button onClick={onRemove}
            className="w-6 h-6 rounded-full bg-white/30 hover:bg-white/60 flex items-center justify-center text-xs cursor-pointer transition-colors"
            style={{ color: contrast }}>×</button>
        )}
      </div>
      <div className="px-3 py-2 bg-white grid grid-cols-3 gap-1 text-center">
        {[["HEX", hex], [`RGB`, `${r},${g},${b}`], [`HSL`, `${h}°`]].map(([k, v]) => (
          <div key={k}>
            <p className="text-xs text-gray-400">{k}</p>
            <p className="text-xs font-mono font-semibold text-gray-700 truncate">{v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RandomColorGenerator() {
  const [colors, setColors] = useState([randomHex()]);
  const [count,  setCount]  = useState(1);

  const generate = useCallback(() => {
    const newColors = Array.from({ length: count }, randomHex);
    setColors((prev) => [...newColors, ...prev].slice(0, 50));
  }, [count]);

  const removeColor = (idx) => setColors((prev) => prev.filter((_, i) => i !== idx));
  const clear = () => setColors([]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
        <button onClick={generate}
          className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-semibold rounded-lg transition-all cursor-pointer shadow-sm">
          <Palette className="w-3.5 h-3.5" />
          Generate
        </button>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500">Count:</span>
          <div className="flex items-center gap-0.5 p-0.5 bg-white border border-gray-200 rounded-lg">
            {[1, 3, 5, 10].map((n) => (
              <button key={n} onClick={() => setCount(n)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${count === n ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-100"}`}>{n}</button>
            ))}
          </div>
        </div>

        {colors.length > 0 && (
          <button onClick={clear} className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors ml-auto">
            Clear all
          </button>
        )}
        <span className="text-xs text-gray-400">{colors.length} color(s)</span>
      </div>

      {colors.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {colors.map((hex, i) => (
            <ColorCard key={`${hex}-${i}`} hex={hex} onRemove={() => removeColor(i)} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 py-16 border-2 border-dashed border-gray-200 rounded-xl">
          <Palette className="w-16 h-16 opacity-30" />
          <p className="text-sm text-gray-400">Click Generate to create random colors</p>
        </div>
      )}
    </div>
  );
}
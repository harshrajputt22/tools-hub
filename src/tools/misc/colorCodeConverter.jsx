"use client";
import { useState, useCallback } from "react";
import { AlertCircle } from "lucide-react";

// ── Conversion utilities ───────────────────────────────────────
function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  if (!/^([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(clean)) throw new Error("Invalid HEX color.");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
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

function hslToRgb(h, s, l) {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return {
    r: Math.round(f(0) * 255),
    g: Math.round(f(8) * 255),
    b: Math.round(f(4) * 255),
  };
}

function parseRgb(str) {
  const m = str.match(/rgba?\$\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i);
  if (!m) throw new Error("Invalid RGB. Expected format: rgb(255, 255, 255)");
  const [r, g, b] = [+m[1], +m[2], +m[3]];
  if ([r, g, b].some((v) => v < 0 || v > 255)) throw new Error("RGB values must be 0–255.");
  return { r, g, b };
}

function parseHsl(str) {
  const m = str.match(/hsla?\$\s*(\d{1,3})\s*,\s*(\d{1,3})%?\s*,\s*(\d{1,3})%?/i);
  if (!m) throw new Error("Invalid HSL. Expected format: hsl(360, 100%, 50%)");
  const [h, s, l] = [+m[1], +m[2], +m[3]];
  if (h < 0 || h > 360) throw new Error("H must be 0–360.");
  if (s < 0 || s > 100 || l < 0 || l > 100) throw new Error("S and L must be 0–100.");
  return { h, s, l };
}

function detectFormat(str) {
  const t = str.trim();
  if (t.startsWith("#")) return "hex";
  if (/^rgb/i.test(t)) return "rgb";
  if (/^hsl/i.test(t)) return "hsl";
  return null;
}

// ── Shared primitives ──────────────────────────────────────────
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  async function handle() {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={handle} disabled={!text}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-gray-700 rounded-lg transition-colors">
      {copied ? <span className="text-green-600">Copied!</span> : "Copy"}
    </button>
  );
}

function OutputRow({ label, value }) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-mono font-semibold text-gray-800 mt-0.5">{value}</p>
      </div>
      <CopyButton text={value} />
    </div>
  );
}

export default function ColorCodeConverter() {
  const [input,   setInput]   = useState("");
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState(null);
  const [preview, setPreview] = useState(null);

  const convert = useCallback((raw = input) => {
    const val = raw.trim();
    if (!val) { setError("Enter a color value."); setResult(null); setPreview(null); return; }

    const fmt = detectFormat(val);
    if (!fmt) { setError("Could not detect format. Use #HEX, rgb(...) or hsl(...)"); setResult(null); setPreview(null); return; }

    try {
      let r, g, b, h, s, l, hex;

      if (fmt === "hex") {
        ({ r, g, b } = hexToRgb(val));
        hex = rgbToHex(r, g, b);
        ({ h, s, l } = rgbToHsl(r, g, b));
      } else if (fmt === "rgb") {
        ({ r, g, b } = parseRgb(val));
        hex = rgbToHex(r, g, b);
        ({ h, s, l } = rgbToHsl(r, g, b));
      } else {
        ({ h, s, l } = parseHsl(val));
        ({ r, g, b } = hslToRgb(h, s, l));
        hex = rgbToHex(r, g, b);
      }

      setResult({
        hex,
        rgb:  `rgb(${r}, ${g}, ${b})`,
        hsl:  `hsl(${h}, ${s}%, ${l}%)`,
        rgba: `rgba(${r}, ${g}, ${b}, 1)`,
        hsla: `hsla(${h}, ${s}%, ${l}%, 1)`,
      });
      setPreview(hex);
      setError(null);
    } catch (e) {
      setError(e.message);
      setResult(null);
      setPreview(null);
    }
  }, [input]);

  function handleInput(val) {
    setInput(val);
    if (val.trim()) convert(val);
    else { setResult(null); setPreview(null); setError(null); }
  }

  return (
    <div className="space-y-4">
      {/* Input */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col">
          <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-t-xl">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Color Input</span>
          </div>
          <div className="flex items-center border border-gray-200 border-t-0 rounded-b-xl overflow-hidden bg-white">
            {preview && (
              <div className="w-12 h-12 flex-shrink-0 border-r border-gray-200" style={{ backgroundColor: preview }} />
            )}
            <input
              type="text"
              value={input}
              onChange={(e) => handleInput(e.target.value)}
              placeholder="#3B82F6  or  rgb(59, 130, 246)  or  hsl(217, 91%, 60%)"
              className="flex-1 px-4 py-3 text-sm font-mono bg-white outline-none focus:ring-2 focus:ring-blue-200 placeholder:text-gray-300 placeholder:font-sans"
            />
            {input && (
              <button onClick={() => { setInput(""); setResult(null); setPreview(null); setError(null); }}
                className="px-3 text-gray-400 hover:text-gray-600 cursor-pointer">×</button>
            )}
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-red-500" />
            <p className="text-xs font-mono text-red-700">{error}</p>
          </div>
        )}

        {result && (
          <div className="flex flex-col gap-2">
            {preview && (
              <div className="h-16 rounded-xl border border-gray-200 shadow-inner" style={{ backgroundColor: preview }} />
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <OutputRow label="HEX"  value={result.hex}  />
              <OutputRow label="RGB"  value={result.rgb}  />
              <OutputRow label="HSL"  value={result.hsl}  />
              <OutputRow label="RGBA" value={result.rgba} />
              <OutputRow label="HSLA" value={result.hsla} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
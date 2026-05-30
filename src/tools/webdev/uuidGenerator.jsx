"use client";

import { useState, useCallback } from "react";
import { 
  Zap, 
  Search, 
  Key, 
  Copy, 
  Check, 
  X, 
  AlertCircle,
  RefreshCw 
} from "lucide-react";
import { copyToClipboard } from "@/lib/helpers";

// ============================================================
// UUID GENERATOR
// Generates UUID v1, v4, v5, v7 — pure JS, no deps
// ============================================================

// ── UUID v4 (random) ─────────────────────────────────────────
function uuidV4() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant bits
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

// ── UUID v1 (time-based, simulated) ──────────────────────────
function uuidV1() {
  const now      = Date.now();
  // UUID v1 time is 100-nanosecond intervals since Oct 15, 1582
  const timeMs   = BigInt(now) + 122192928000000n;
  const timeLow  = timeMs & 0xffffffffn;
  const timeMid  = (timeMs >> 32n) & 0xffffn;
  const timeHigh = ((timeMs >> 48n) & 0x0fffn) | 0x1000n; // version 1

  const clockSeq = (crypto.getRandomValues(new Uint16Array(1))[0] & 0x3fff) | 0x8000;
  const node     = crypto.getRandomValues(new Uint8Array(6));

  const hex = [
    timeLow.toString(16).padStart(8, "0"),
    timeMid.toString(16).padStart(4, "0"),
    timeHigh.toString(16).padStart(4, "0"),
    clockSeq.toString(16).padStart(4, "0"),
    [...node].map((b) => b.toString(16).padStart(2, "0")).join(""),
  ].join("-");

  return hex;
}

// ── UUID v7 (Unix timestamp ms + random) ─────────────────────
function uuidV7() {
  const bytes    = crypto.getRandomValues(new Uint8Array(16));
  const now      = BigInt(Date.now());

  // First 48 bits = Unix timestamp in ms
  bytes[0]  = Number((now >> 40n) & 0xffn);
  bytes[1]  = Number((now >> 32n) & 0xffn);
  bytes[2]  = Number((now >> 24n) & 0xffn);
  bytes[3]  = Number((now >> 16n) & 0xffn);
  bytes[4]  = Number((now >> 8n)  & 0xffn);
  bytes[5]  = Number(now          & 0xffn);

  bytes[6]  = (bytes[6] & 0x0f) | 0x70; // version 7
  bytes[8]  = (bytes[8] & 0x3f) | 0x80; // variant

  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

// ── UUID v5 (SHA-1 namespace + name) ─────────────────────────
async function uuidV5(namespace, name) {
  // Validate namespace UUID
  const nsHex = namespace.replace(/-/g, "");
  if (nsHex.length !== 32) throw new Error("Invalid namespace UUID.");

  const nsBytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    nsBytes[i] = parseInt(nsHex.slice(i * 2, i * 2 + 2), 16);
  }

  const nameBytes = new TextEncoder().encode(name);
  const combined  = new Uint8Array(nsBytes.length + nameBytes.length);
  combined.set(nsBytes);
  combined.set(nameBytes, nsBytes.length);

  const hashBuf = await crypto.subtle.digest("SHA-1", combined);
  const hash    = new Uint8Array(hashBuf);

  hash[6] = (hash[6] & 0x0f) | 0x50; // version 5
  hash[8] = (hash[8] & 0x3f) | 0x80; // variant

  const hex = [...hash.slice(0, 16)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

// ── Parse UUID ────────────────────────────────────────────────
function parseUuid(uuid) {
  const clean = uuid.trim().toLowerCase();
  const re    = /^[0-9a-f]{8}-[0-9a-f]{4}-([1-7])[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  const match = clean.match(re);

  if (!match) return null;

  const version = parseInt(match[1]);
  const hex     = clean.replace(/-/g, "");

  // Extract timestamp for v1
  let timestamp = null;
  if (version === 1) {
    const timeLow  = BigInt("0x" + hex.slice(0, 8));
    const timeMid  = BigInt("0x" + hex.slice(8, 12));
    const timeHigh = BigInt("0x" + hex.slice(12, 16)) & 0x0fffn;
    const timeMs   = ((timeHigh << 48n) | (timeMid << 32n) | timeLow);
    const unixMs   = timeMs / 10000n - 122192928000000n / 10000n;
    timestamp = new Date(Number(unixMs)).toISOString();
  }

  // Extract timestamp for v7
  if (version === 7) {
    const msBig   = BigInt("0x" + hex.slice(0, 12));
    timestamp = new Date(Number(msBig)).toISOString();
  }

  const variant = parseInt(hex.slice(16, 17), 16);
  const variantStr =
    variant < 8  ? "NCS backward compat" :
    variant < 12 ? "RFC 4122 (standard)"  :
    variant < 14 ? "Microsoft GUID"       :
                   "Reserved";

  return {
    version,
    variant: variantStr,
    timestamp,
    hex: hex.toUpperCase(),
    urn: `urn:uuid:${clean}`,
  };
}

// ── Predefined namespaces ─────────────────────────────────────
const NAMESPACES = [
  { label: "DNS",  value: "6ba7b810-9dad-11d1-80b4-00c04fd430c8" },
  { label: "URL",  value: "6ba7b811-9dad-11d1-80b4-00c04fd430c8" },
  { label: "OID",  value: "6ba7b812-9dad-11d1-80b4-00c04fd430c8" },
  { label: "X.500",value: "6ba7b814-9dad-11d1-80b4-00c04fd430c8" },
];

// ============================================================
// SUB-COMPONENTS
// ============================================================

// ── CopyButton with Lucide icons ──────────────────────────────
function CopyButton({ text, label = "Copy" }) {
  const [copied, setCopied] = useState(false);
  async function handle() {
    const ok = await copyToClipboard(text);
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  }
  return (
    <button
      onClick={handle}
      disabled={!text}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-gray-700 rounded-lg transition-colors"
    >
      {copied ? (
        <>
          <Check className="w-3 h-3 text-green-600" />
          <span className="text-green-600">Copied!</span>
        </>
      ) : (
        <>
          <Copy className="w-3 h-3" />
          {label}
        </>
      )}
    </button>
  );
}

// ── UuidRow (× replaced with X icon) ──────────────────────────
function UuidRow({ uuid, index, onRemove }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 group transition-colors">
      <span className="text-xs text-gray-300 font-mono w-5 text-right flex-shrink-0 select-none">
        {index + 1}
      </span>
      <code className="flex-1 text-sm font-mono text-gray-800 tracking-wider select-all">
        {uuid}
      </code>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <CopyButton text={uuid} />
        <button
          onClick={() => onRemove(index)}
          className="p-1.5 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ── InspectorPanel with Lucide icons ─────────────────────────
function InspectorPanel({ input, onInputChange }) {
  const parsed = input.trim() ? parseUuid(input) : null;
  const isValid = !!parsed;

  return (
    <div className="space-y-3">
      {/* Input */}
      <div>
        <input
          type="text"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="Paste a UUID to inspect…"
          spellCheck={false}
          className={`w-full px-4 py-3 text-sm font-mono bg-white border-2 rounded-xl outline-none transition-colors ${
            input && !isValid ? "border-red-300" :
            input && isValid  ? "border-green-300" :
                                "border-gray-200 focus:border-blue-400"
          }`}
        />
      </div>

      {/* Validation badge */}
      {input && (
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold ${
          isValid
            ? "bg-green-50 border-green-200 text-green-700"
            : "bg-red-50 border-red-200 text-red-700"
        }`}>
          {isValid ? (
            <Check className="w-3 h-3" />
          ) : (
            <AlertCircle className="w-3 h-3" />
          )}
          {isValid ? "Valid UUID" : "Invalid UUID format"}
        </div>
      )}

      {/* Details panel remains the same */}
      {parsed && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              UUID Details
            </span>
          </div>
          <div className="divide-y divide-gray-100">
            {[
              { label: "Version",   value: `v${parsed.version}` },
              { label: "Variant",   value: parsed.variant       },
              { label: "Uppercase", value: parsed.hex.match(/.{8}|.{4}|.{4}|.{4}|.{12}/g)?.join("-") || parsed.hex },
              { label: "Lowercase", value: input.trim().toLowerCase() },
              { label: "URN",       value: parsed.urn           },
              ...(parsed.timestamp ? [{ label: "Timestamp", value: parsed.timestamp }] : []),
            ].map(({ label, value }) => (
              <div key={label} className="flex items-start gap-4 px-4 py-2.5">
                <span className="text-xs font-semibold text-gray-400 w-20 flex-shrink-0 pt-0.5">
                  {label}
                </span>
                <code className="text-xs font-mono text-gray-700 flex-1 break-all">
                  {value}
                </code>
                <CopyButton text={value} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── V5Panel remains the same (no emojis) ──────────────────────
// ... (V5Panel function unchanged) ...

// ── MAIN COMPONENT ────────────────────────────────────────────
export default function UuidGenerator() {
  const [activeTab, setActiveTab] = useState("generate");
  const [version,   setVersion]   = useState("v4");
  const [count,     setCount]     = useState(5);
  const [uppercase, setUppercase] = useState(false);
  const [uuids,     setUuids]     = useState([]);
  const [inspectInput, setInspectInput] = useState("");

  const TABS = [
    { value: "generate", label: "Generate", icon: Zap },
    { value: "inspect",  label: "Inspect",  icon: Search },
  ];

  // ── Generate handler remains the same ────────────────────────
  const handleGenerate = useCallback(() => {
    if (version === "v5") return; // v5 handled separately

    const generated = [];
    for (let i = 0; i < count; i++) {
      let uuid = version === "v1" ? uuidV1()
               : version === "v7" ? uuidV7()
               : uuidV4();
      if (uppercase) uuid = uuid.toUpperCase();
      generated.push(uuid);
    }
    setUuids((prev) => [...generated, ...prev].slice(0, 100));
  }, [version, count, uppercase]);

  function handleRemove(idx) {
    setUuids((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleClear() {
    setUuids([]);
  }

  function handleCopyAll() {
    copyToClipboard(uuids.join("\n"));
  }

  return (
    <div className="space-y-5">

      {/* ── Tabs with Lucide icons ───────────────────────────────── */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer flex-1 justify-center ${
              activeTab === tab.value
                ? "bg-white text-blue-700 shadow-sm border border-gray-200"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <tab.icon className="w-4 h-4 flex-shrink-0" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── Inspect tab ───────────────────────────────────────────── */}
      {activeTab === "inspect" && (
        <InspectorPanel
          input={inspectInput}
          onInputChange={setInspectInput}
        />
      )}

      {/* ── Generate tab ──────────────────────────────────────────── */}
      {activeTab === "generate" && (
        <div className="space-y-4">

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl">

            {/* Version selector remains the same */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-gray-500 whitespace-nowrap">Version:</span>
              <div className="flex items-center gap-0.5 p-0.5 bg-white border border-gray-200 rounded-lg">
                {["v1","v4","v5","v7"].map((v) => (
                  <button
                    key={v}
                    onClick={() => setVersion(v)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      version === v
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Count selector remains the same */}
            {version !== "v5" && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-gray-500 whitespace-nowrap">Count:</span>
                <div className="flex items-center gap-0.5 p-0.5 bg-white border border-gray-200 rounded-lg">
                  {[1, 5, 10, 25, 50].map((n) => (
                    <button
                      key={n}
                      onClick={() => setCount(n)}
                      className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                        count === n
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Uppercase toggle remains the same */}
            {version !== "v5" && (
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <button
                  role="switch"
                  aria-checked={uppercase}
                  onClick={() => setUppercase((v) => !v)}
                  className={`relative w-8 h-4 rounded-full transition-colors focus:outline-none flex-shrink-0 cursor-pointer ${
                    uppercase ? "bg-blue-600" : "bg-gray-300"
                  }`}
                >
                  <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${
                    uppercase ? "translate-x-4" : "translate-x-0.5"
                  }`} />
                </button>
                <span className="text-xs font-medium text-gray-600">Uppercase</span>
              </label>
            )}

            {/* Generate button with RefreshCw icon */}
            {version !== "v5" && (
              <button
                onClick={handleGenerate}
                data-primary="true"
                className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-semibold rounded-lg cursor-pointer transition-all shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Generate
              </button>
            )}

            {/* Actions remain the same */}
            {uuids.length > 0 && version !== "v5" && (
              <div className="flex items-center gap-1.5 ml-auto">
                <button
                  onClick={handleCopyAll}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 hover:border-gray-300 text-gray-600 rounded-lg cursor-pointer transition-colors"
                >
                  Copy all
                </button>
                <button
                  onClick={handleClear}
                  className="text-xs font-medium text-gray-400 hover:text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg cursor-pointer border border-gray-200 transition-colors"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* v5 special panel remains the same */}
          {version === "v5" && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
              <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                UUID v5 is deterministic — the same namespace + name always produces the same UUID.
                Uses SHA-1 hashing under the hood.
              </p>
              <V5Panel onGenerate={(uuid) => setUuids((prev) => [uuid, ...prev].slice(0, 100))} />
            </div>
          )}

          {/* UUID list remains the same structure */}
          {uuids.length > 0 && version !== "v5" && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  {uuids.length} UUID{uuids.length !== 1 ? "s" : ""}
                </span>
                <span className="text-xs text-gray-400">Hover to copy or remove</span>
              </div>
              <div className="bg-white divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                {uuids.map((uuid, i) => (
                  <UuidRow
                    key={uuid + i}
                    uuid={uuid}
                    index={i}
                    onRemove={handleRemove}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty state with Key icon */}
          {uuids.length === 0 && version !== "v5" && (
            <div className="flex flex-col items-center justify-center py-14 border border-dashed border-gray-200 rounded-xl bg-gray-50 gap-3">
              <Key className="w-16 h-16 opacity-20" />
              <p className="text-sm font-semibold text-gray-400">
                Click Generate to create UUIDs
              </p>
            </div>
          )}

          {/* Version info cards remain the same */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { v: "v1", desc: "Time-based. Encodes the current timestamp and MAC address variant." },
              { v: "v4", desc: "Random. Cryptographically secure random — most commonly used." },
              { v: "v5", desc: "Deterministic. SHA-1 hash of namespace + name. Same input = same UUID." },
              { v: "v7", desc: "Time-ordered random. Unix timestamp prefix makes them sortable." },
            ].map(({ v, desc }) => (
              <div
                key={v}
                className={`p-3 rounded-xl border text-xs leading-relaxed cursor-pointer transition-all ${
                  version === v
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200"
                }`}
                onClick={() => setVersion(v)}
              >
                <span className="font-bold text-sm block mb-1">UUID {v}</span>
                {desc}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
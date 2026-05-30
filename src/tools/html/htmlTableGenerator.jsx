"use client";
import { useState, useMemo } from "react";

// ── Shared sub-components ─────────────────────────────────────
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

function NumericInput({ label, value, min, max, onChange }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</label>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg text-gray-600 font-bold cursor-pointer transition-colors select-none"
        >
          −
        </button>
        <span className="w-10 text-center text-sm font-mono font-semibold text-blue-700 bg-blue-50 border border-blue-100 py-1 rounded-lg">
          {value}
        </span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg text-gray-600 font-bold cursor-pointer transition-colors select-none"
        >
          +
        </button>
        <span className="text-xs text-gray-400">({min}–{max})</span>
      </div>
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

// ── Table generation logic ─────────────────────────────────────
function generateTableHtml(rows, cols, hasHeader, cellContent) {
  const indent = "  ";
  const lines  = ["<table>"];

  if (hasHeader) {
    lines.push(`${indent}<thead>`);
    lines.push(`${indent}${indent}<tr>`);
    for (let c = 0; c < cols; c++) {
      lines.push(`${indent}${indent}${indent}<th>${cellContent("header", 0, c)}</th>`);
    }
    lines.push(`${indent}${indent}</tr>`);
    lines.push(`${indent}</thead>`);
  }

  lines.push(`${indent}<tbody>`);
  const bodyRows = hasHeader ? rows - 1 : rows;
  for (let r = 0; r < bodyRows; r++) {
    lines.push(`${indent}${indent}<tr>`);
    for (let c = 0; c < cols; c++) {
      lines.push(`${indent}${indent}${indent}<td>${cellContent("cell", r, c)}</td>`);
    }
    lines.push(`${indent}${indent}</tr>`);
  }
  lines.push(`${indent}</tbody>`);
  lines.push("</table>");
  return lines.join("\n");
}

// ── Main component ────────────────────────────────────────────
export default function HtmlTableGenerator() {
  const [rows,        setRows]        = useState(3);
  const [cols,        setCols]        = useState(3);
  const [hasHeader,   setHasHeader]   = useState(true);
  const [showPreview, setShowPreview] = useState(true);

  const cellContent = (type, r, c) =>
    type === "header" ? `Header ${c + 1}` : `Row ${r + 1}, Col ${c + 1}`;

  const htmlOutput = useMemo(
    () => generateTableHtml(rows, cols, hasHeader, cellContent),
    [rows, cols, hasHeader]
  );

  const headerCells = hasHeader
    ? Array.from({ length: cols }, (_, c) => `Header ${c + 1}`)
    : null;
  const bodyRows = hasHeader ? rows - 1 : rows;
  const bodyCells = Array.from({ length: Math.max(0, bodyRows) }, (_, r) =>
    Array.from({ length: cols }, (_, c) => `Row ${r + 1}, Col ${c + 1}`)
  );

  return (
    <div className="space-y-4">

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* ── Controls panel ───────────────────────────────── */}
        <div className="flex flex-col">
          <PanelHeader label="Configuration" />
          <div className="flex flex-col gap-6 p-5 bg-white border border-gray-200 border-t-0 rounded-b-xl">

            <NumericInput label="Rows"    value={rows} min={1} max={10} onChange={setRows} />
            <NumericInput label="Columns" value={cols} min={1} max={10} onChange={setCols} />

            <div className="flex flex-col gap-3">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Options</span>

              <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div>
                  <p className="text-xs font-semibold text-gray-700">Include &lt;thead&gt; header row</p>
                  <p className="text-xs text-gray-400 mt-0.5">First row uses &lt;th&gt; elements inside &lt;thead&gt;</p>
                </div>
                <Toggle checked={hasHeader} onChange={setHasHeader} label="" />
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div>
                  <p className="text-xs font-semibold text-gray-700">Show live preview</p>
                  <p className="text-xs text-gray-400 mt-0.5">Render table preview below the code</p>
                </div>
                <Toggle checked={showPreview} onChange={setShowPreview} label="" />
              </div>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-4 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl">
              {[
                { label: "Rows",    value: rows                    },
                { label: "Columns", value: cols                    },
                { label: "Cells",   value: rows * cols             },
                { label: "Header",  value: hasHeader ? "Yes" : "No"},
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center gap-1.5 text-xs">
                  <span className="text-gray-400">{label}:</span>
                  <span className="font-mono font-semibold text-gray-700">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Output panel ─────────────────────────────────── */}
        <div className="flex flex-col gap-4">

          {/* HTML output */}
          <div className="flex flex-col">
            <PanelHeader
              label="HTML Output"
              actions={<CopyButton text={htmlOutput} />}
            />
            <div className="p-4 bg-gray-50 border border-gray-200 border-t-0 rounded-b-xl">
              <textarea
                readOnly
                value={htmlOutput}
                className="w-full text-sm font-mono text-gray-800 bg-gray-50 outline-none resize-none leading-relaxed cursor-default select-all min-h-[220px]"
              />
            </div>
          </div>

          {/* Live preview */}
          {showPreview && (
            <div className="flex flex-col">
              <PanelHeader label="Live Preview" />
              <div className="p-4 bg-white border border-gray-200 border-t-0 rounded-b-xl overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  {hasHeader && headerCells && (
                    <thead>
                      <tr>
                        {headerCells.map((h, i) => (
                          <th
                            key={i}
                            className="border border-gray-300 bg-gray-100 px-3 py-2 text-left font-semibold text-gray-700"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                  )}
                  <tbody>
                    {bodyCells.map((row, ri) => (
                      <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        {row.map((cell, ci) => (
                          <td
                            key={ci}
                            className="border border-gray-200 px-3 py-2 text-gray-600"
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
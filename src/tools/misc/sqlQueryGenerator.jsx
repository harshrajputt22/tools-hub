"use client";
import { useState, useMemo, useCallback } from "react";
import { AlertCircle, Database } from "lucide-react";

// ── SQL builders ───────────────────────────────────────────────
function sanitizeId(str) {
  return str.trim().replace(/[^\w]/g, "_");
}

function parseColumns(str) {
  return str.split(",").map((c) => c.trim()).filter(Boolean);
}

function parseConditions(str) {
  return str.split(/\n|;/).map((c) => c.trim()).filter(Boolean);
}

function buildSelect(table, columns, conditions, extra) {
  const cols = columns.length ? columns.join(", ") : "*";
  let sql    = `SELECT ${cols}\nFROM ${table}`;
  if (conditions.length) sql += `\nWHERE ${conditions.join(" AND ")}`;
  if (extra.orderBy) sql += `\nORDER BY ${extra.orderBy}`;
  if (extra.limit)   sql += `\nLIMIT ${extra.limit}`;
  return sql + ";";
}

function buildInsert(table, columns, values) {
  if (!columns.length) throw new Error("INSERT requires at least one column.");
  const valPlaceholders = values.length
    ? values.split(",").map((v) => v.trim()).map((v) => `'${v}'`).join(", ")
    : columns.map(() => "'value'").join(", ");
  return `INSERT INTO ${table} (${columns.join(", ")})\nVALUES (${valPlaceholders});`;
}

function buildUpdate(table, columns, conditions) {
  if (!columns.length) throw new Error("UPDATE requires at least one column.");
  const sets = columns.map((c) => `${c} = 'value'`).join(",\n       ");
  let sql = `UPDATE ${table}\nSET ${sets}`;
  if (conditions.length) sql += `\nWHERE ${conditions.join(" AND ")}`;
  return sql + ";";
}

function buildDelete(table, conditions) {
  let sql = `DELETE FROM ${table}`;
  if (conditions.length) sql += `\nWHERE ${conditions.join(" AND ")}`;
  return sql + ";";
}

// ── Shared ─────────────────────────────────────────────────────
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
      {copied ? <><svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg><span className="text-green-600">Copied!</span></> : <><svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>Copy</>}
    </button>
  );
}

function Field({ label, hint, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline gap-2">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</label>
        {hint && <span className="text-xs text-gray-400">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

const QUERY_TYPES = ["SELECT", "INSERT", "UPDATE", "DELETE"];

const DIALECT_KEYWORDS = {
  SELECT: { color: "text-purple-600", bg: "bg-purple-50 border-purple-200" },
  INSERT: { color: "text-green-600",  bg: "bg-green-50 border-green-200"   },
  UPDATE: { color: "text-amber-600",  bg: "bg-amber-50 border-amber-200"   },
  DELETE: { color: "text-red-600",    bg: "bg-red-50 border-red-200"       },
};

export default function SqlQueryGenerator() {
  const [table,      setTable]      = useState("");
  const [columns,    setColumns]    = useState("");
  const [conditions, setConditions] = useState("");
  const [values,     setValues]     = useState("");
  const [orderBy,    setOrderBy]    = useState("");
  const [limit,      setLimit]      = useState("");
  const [queryType,  setQueryType]  = useState("SELECT");
  const [output,     setOutput]     = useState("");
  const [error,      setError]      = useState(null);

  const cols  = useMemo(() => parseColumns(columns),   [columns]);
  const conds = useMemo(() => parseConditions(conditions), [conditions]);

  const handleGenerate = useCallback(() => {
    const tbl = sanitizeId(table);
    if (!tbl) { setError("Table name is required."); setOutput(""); return; }

    try {
      let sql = "";
      if (queryType === "SELECT") sql = buildSelect(tbl, cols, conds, { orderBy: orderBy.trim(), limit: limit.trim() });
      if (queryType === "INSERT") sql = buildInsert(tbl, cols, values);
      if (queryType === "UPDATE") sql = buildUpdate(tbl, cols, conds);
      if (queryType === "DELETE") sql = buildDelete(tbl, conds);
      setOutput(sql);
      setError(null);
    } catch (e) {
      setError(e.message);
      setOutput("");
    }
  }, [table, cols, conds, values, orderBy, limit, queryType]);

  function handleClear() {
    setTable(""); setColumns(""); setConditions(""); setValues("");
    setOrderBy(""); setLimit(""); setOutput(""); setError(null);
  }

  const badge = DIALECT_KEYWORDS[queryType];

  return (
    <div className="space-y-4">
      {/* Type selector */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
        {QUERY_TYPES.map((t) => {
          const active = queryType === t;
          const k = DIALECT_KEYWORDS[t];
          return (
            <button key={t} onClick={() => { setQueryType(t); setOutput(""); setError(null); }}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all cursor-pointer ${
                active ? `bg-white shadow-sm border ${k.bg} ${k.color}` : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}>{t}</button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: inputs */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-t-xl">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Query Builder</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded border ${badge.bg} ${badge.color}`}>{queryType}</span>
          </div>
          <div className="flex flex-col gap-4 p-4 bg-white border border-gray-200 border-t-0 rounded-b-xl">
            <Field label="Table Name" hint="required">
              <input value={table} onChange={(e) => setTable(e.target.value)} placeholder="users"
                className="w-full px-3 py-2 text-sm font-mono border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 bg-gray-50" />
            </Field>

            {queryType !== "DELETE" && (
              <Field label="Columns" hint="comma-separated">
                <input value={columns} onChange={(e) => setColumns(e.target.value)}
                  placeholder={queryType === "SELECT" ? "id, name, email  (or leave blank for *)" : "id, name, email"}
                  className="w-full px-3 py-2 text-sm font-mono border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 bg-gray-50" />
              </Field>
            )}

            {queryType === "INSERT" && (
              <Field label="Values" hint="comma-separated (matches columns)">
                <input value={values} onChange={(e) => setValues(e.target.value)}
                  placeholder="1, Alice, alice@example.com"
                  className="w-full px-3 py-2 text-sm font-mono border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 bg-gray-50" />
              </Field>
            )}

            {(queryType === "SELECT" || queryType === "UPDATE" || queryType === "DELETE") && (
              <Field label="WHERE Conditions" hint="one per line or semicolon-separated (optional)">
                <textarea value={conditions} onChange={(e) => setConditions(e.target.value)}
                  placeholder={"id = 1\nstatus = 'active'"}
                  rows={3}
                  className="w-full px-3 py-2 text-sm font-mono border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 bg-gray-50 resize-none" />
              </Field>
            )}

            {queryType === "SELECT" && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="ORDER BY" hint="optional">
                  <input value={orderBy} onChange={(e) => setOrderBy(e.target.value)} placeholder="created_at DESC"
                    className="w-full px-3 py-2 text-sm font-mono border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 bg-gray-50" />
                </Field>
                <Field label="LIMIT" hint="optional">
                  <input value={limit} onChange={(e) => setLimit(e.target.value.replace(/\D/g, ""))} placeholder="100"
                    className="w-full px-3 py-2 text-sm font-mono border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 bg-gray-50" />
                </Field>
              </div>
            )}
          </div>
        </div>

        {/* Right: output */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-t-xl">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">SQL Output</span>
            {output && <CopyButton text={output} />}
          </div>
          <div className="flex flex-1 border border-gray-200 border-t-0 rounded-b-xl overflow-hidden bg-gray-50 min-h-[260px] relative">
            {output ? (
              <textarea readOnly value={output} spellCheck={false}
                className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-gray-50 outline-none resize-none text-gray-800 cursor-default select-all" />
            ) : (
              <div className="flex flex-col items-center justify-center w-full gap-2 pointer-events-none">
                <Database className="w-12 h-12 opacity-20" />
                <p className="text-xs text-gray-300">Generated SQL appears here</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-red-500" />
          <p className="text-xs font-mono text-red-700">{error}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
        <button onClick={handleGenerate} disabled={!table.trim()}
          className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-semibold rounded-lg transition-all cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          Generate SQL
        </button>
        {output && <CopyButton text={output} />}
        {(table || output) && <button onClick={handleClear} className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors">Clear</button>}
      </div>
    </div>
  );
}
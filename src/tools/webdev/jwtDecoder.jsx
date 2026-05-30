"use client";

import { useState, useEffect } from "react";
import { copyToClipboard } from "@/lib/helpers";

// ============================================================
// JWT DECODER
// Decodes header + payload, validates signature structure,
// checks expiry and standard claims — client-side only
// ============================================================

function base64UrlDecode(str) {
  // Add padding
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad    = padded.length % 4;
  const b64    = pad ? padded + "=".repeat(4 - pad) : padded;
  try {
    return atob(b64);
  } catch {
    return null;
  }
}

function decodeJwt(token) {
  const parts = token.trim().split(".");
  if (parts.length !== 3) {
    return { error: `Invalid JWT structure. Expected 3 parts separated by dots, got ${parts.length}.` };
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  // Decode header
  const headerRaw = base64UrlDecode(headerB64);
  if (!headerRaw) return { error: "Failed to decode header — invalid Base64url encoding." };

  let header;
  try { header = JSON.parse(headerRaw); }
  catch { return { error: "Header is not valid JSON after decoding." }; }

  // Decode payload
  const payloadRaw = base64UrlDecode(payloadB64);
  if (!payloadRaw) return { error: "Failed to decode payload — invalid Base64url encoding." };

  let payload;
  try { payload = JSON.parse(payloadRaw); }
  catch { return { error: "Payload is not valid JSON after decoding." }; }

  // Decode signature (display only — can't verify without secret)
  const signatureRaw = base64UrlDecode(signatureB64);

  // Analyze claims
  const now       = Math.floor(Date.now() / 1000);
  const exp       = payload.exp;
  const iat       = payload.iat;
  const nbf       = payload.nbf;
  const isExpired = exp ? now > exp : null;
  const isActive  = nbf ? now >= nbf : true;

  return {
    header,
    payload,
    signature: signatureB64,
    parts: { headerB64, payloadB64, signatureB64 },
    claims: {
      exp,
      iat,
      nbf,
      isExpired,
      isActive,
      issuer:   payload.iss,
      subject:  payload.sub,
      audience: payload.aud,
      jwtId:    payload.jti,
    },
    algorithm: header.alg,
    type:      header.typ,
  };
}

function formatTimestamp(ts) {
  if (!ts) return null;
  return new Date(ts * 1000).toISOString();
}

function relative(ts) {
  const diff = Math.floor((ts * 1000 - Date.now()) / 1000);
  const abs  = Math.abs(diff);
  const past = diff < 0;
  if (abs < 60)     return past ? `${abs}s ago`        : `in ${abs}s`;
  if (abs < 3600)   return past ? `${Math.floor(abs/60)}m ago`   : `in ${Math.floor(abs/60)}m`;
  if (abs < 86400)  return past ? `${Math.floor(abs/3600)}h ago`  : `in ${Math.floor(abs/3600)}h`;
  return past ? `${Math.floor(abs/86400)}d ago` : `in ${Math.floor(abs/86400)}d`;
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  async function handle() {
    const ok = await copyToClipboard(text);
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  }
  return (
    <button onClick={handle} disabled={!text} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 disabled:opacity-40 cursor-pointer text-gray-700 rounded-lg transition-colors flex-shrink-0" title="Copy to clipboard">
      <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24" className={copied ? "text-green-600" : ""}>
        <path d="M8 5H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2m-4 4H6m10 0h2a2 2 0 002-2V7a2 2 0 00-2-2h-2m-4 0H9"/>
      </svg>
      <span>{copied ? "Copied!" : "Copy"}</span>
    </button>
  );
}

function JsonBlock({ data, color }) {
  const pretty = JSON.stringify(data, null, 2);
  return (
    <div className={`rounded-xl overflow-hidden border ${color}`}>
      <pre className="px-4 py-3 text-xs font-mono leading-relaxed whitespace-pre-wrap break-all overflow-auto max-h-[300px]">
        {pretty}
      </pre>
    </div>
  );
}

function ClaimRow({ label, value, note, status }) {
  return (
    <div className="flex items-start gap-3 px-4 py-2.5 border-b border-gray-100 last:border-b-0">
      <span className="text-xs font-semibold text-gray-400 w-24 flex-shrink-0 pt-0.5">{label}</span>
      <div className="flex-1 min-w-0">
        <code className="text-xs font-mono text-gray-800 break-all">{value ?? "—"}</code>
        {note && <p className="text-xs text-gray-400 mt-0.5">{note}</p>}
      </div>
      {status && (
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${
          status === "ok"      ? "bg-green-50 text-green-700 border-green-200" :
          status === "warning" ? "bg-amber-50 text-amber-700 border-amber-200" :
                                 "bg-red-50 text-red-700 border-red-200"
        }`}>
          {status === "ok" ? (
            <svg width="10" height="10" fill="currentColor" viewBox="0 0 24 24">
              <path d="M5 13l4 4L19 7"/>
            </svg>
          ) : status === "warning" ? (
            <svg width="10" height="10" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
            </svg>
          ) : (
            <svg width="10" height="10" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          )}
        </span>
      )}
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function JwtDecoder() {
  const [input,  setInput]  = useState("");
  const [result, setResult] = useState(null);
  const [secret, setSecret] = useState("");

  useEffect(() => {
    const trimmed = input.trim();
    if (!trimmed) { setResult(null); return; }
    setResult(decodeJwt(trimmed));
  }, [input]);

  const { claims, algorithm, type } = result || {};

  // Color coding for each part
  const PART_COLORS = {
    header:    "text-red-500",
    payload:   "text-purple-500",
    signature: "text-blue-500",
  };

  // Visual JWT with colored segments
  function ColoredJwt({ token }) {
    const parts = token.trim().split(".");
    if (parts.length !== 3) return <code className="text-red-400 text-xs font-mono break-all">{token}</code>;
    return (
      <code className="text-xs font-mono break-all leading-relaxed">
        <span className={PART_COLORS.header}>{parts[0]}</span>
        <span className="text-gray-400">.</span>
        <span className={PART_COLORS.payload}>{parts[1]}</span>
        <span className="text-gray-400">.</span>
        <span className={PART_COLORS.signature}>{parts[2]}</span>
      </code>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Input ─────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg width="14" height="14" fill="currentColor" className="text-gray-500" viewBox="0 0 24 24">
              <path d="M15 7a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9a2 2 0 012-2h4"/>
            </svg>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">JWT Token</p>
          </div>
        </div>

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={"Paste a JWT token here…\n\neyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ…"}
          spellCheck={false}
          autoCorrect="off"
          className={`w-full px-4 py-3.5 text-sm font-mono bg-white border-2 rounded-xl outline-none resize-none min-h-[100px] transition-colors placeholder:text-gray-300 placeholder:font-sans placeholder:text-xs ${
            result?.error ? "border-red-300" :
            result        ? "border-green-300" :
                            "border-gray-200 focus:border-blue-400"
          }`}
        />

        {/* Color legend */}
        {result && !result.error && (
          <div className="flex items-center gap-4 text-xs">
            {[
              { label: "Header",    color: "text-red-500",    icon: "📦" },
              { label: "Payload",   color: "text-purple-500", icon: "📋" },
              { label: "Signature", color: "text-blue-500",   icon: "🔒" },
            ].map(({ label, color }) => (
              <span key={label} className={`font-semibold ${color} flex items-center gap-1`}>
                <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24" className="flex-shrink-0">
                  {label === "Header" ? (
                    <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                  ) : label === "Payload" ? (
                    <path d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                  ) : (
                    <path d="M15 7a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9a2 2 0 012-2h4"/>
                  )}
                </svg>
                {label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Error ─────────────────────────────────────────────── */}
      {result?.error && (
        <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
          <svg width="14" height="14" className="flex-shrink-0 mt-0.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-red-700">{result.error}</p>
        </div>
      )}

      {/* ── Decoded output ────────────────────────────────────── */}
      {result && !result.error && (
        <div className="space-y-4">

          {/* Token summary */}
          <div className="flex flex-wrap items-center gap-2">
            {algorithm && (
              <span className="px-3 py-1.5 text-xs font-bold bg-gray-100 border border-gray-200 text-gray-700 rounded-full font-mono flex items-center gap-1.5">
                <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                {algorithm}
              </span>
            )}
            {type && (
              <span className="px-3 py-1.5 text-xs font-bold bg-gray-100 border border-gray-200 text-gray-700 rounded-full flex items-center gap-1">
                <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485a2 2 0 01-2.828 0l-2.829-2.829a2 2 0 010-2.828L11 7.343z"/>
                </svg>
                {type}
              </span>
            )}
            {claims?.isExpired === true && (
              <span className="px-3 py-1.5 text-xs font-bold bg-red-50 border border-red-200 text-red-700 rounded-full flex items-center gap-1">
                <svg width="10" height="10" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                Expired
              </span>
            )}
            {claims?.isExpired === false && (
              <span className="px-3 py-1.5 text-xs font-bold bg-green-50 border border-green-200 text-green-700 rounded-full flex items-center gap-1">
                <svg width="10" height="10" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5 13l4 4L19 7"/>
                </svg>
                Active
              </span>
            )}
            {claims?.isExpired === null && (
              <span className="px-3 py-1.5 text-xs font-bold bg-gray-50 border border-gray-200 text-gray-600 rounded-full flex items-center gap-1">
                <svg width="10" height="10" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                </svg>
                No expiry
              </span>
            )}
          </div>

          {/* Header */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg width="14" height="14" fill="currentColor" className="text-red-500" viewBox="0 0 24 24">
                  <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                </svg>
                <p className="text-xs font-bold text-red-500 uppercase tracking-wider">Header</p>
              </div>
              <CopyButton text={JSON.stringify(result.header, null, 2)} />
                       </div>
            <JsonBlock data={result.header} color="bg-red-50 border-red-200" />
          </div>

          {/* Payload */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg width="14" height="14" fill="currentColor" className="text-purple-500" viewBox="0 0 24 24">
                  <path d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
                <p className="text-xs font-bold text-purple-500 uppercase tracking-wider">Payload</p>
              </div>
              <CopyButton text={JSON.stringify(result.payload, null, 2)} />
            </div>
            <JsonBlock data={result.payload} color="bg-purple-50 border-purple-200" />
          </div>

          {/* Signature */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" fill="currentColor" className="text-blue-500" viewBox="0 0 24 24">
                <path d="M15 7a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9a2 2 0 012-2h4"/>
              </svg>
              <p className="text-xs font-bold text-blue-500 uppercase tracking-wider">Signature</p>
            </div>
            <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
              <code className="text-xs font-mono text-blue-700 break-all">{result.signature}</code>
              <p className="text-xs text-blue-500 mt-2 flex items-center gap-1.5">
                <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
                Signature verification requires secret key. Runs entirely in browser.
              </p>
            </div>
          </div>

          {/* Claims */}
          {(claims?.exp || claims?.iat || claims?.nbf || claims?.issuer || claims?.subject || claims?.audience) && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                <svg width="14" height="14" fill="currentColor" className="text-gray-500" viewBox="0 0 24 24">
                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Standard Claims
                </span>
              </div>
              <div className="bg-white">
                {claims.iat && (
                  <ClaimRow
                    label="Issued at"
                    value={formatTimestamp(claims.iat)}
                    note={relative(claims.iat)}
                  />
                )}
                {claims.exp && (
                  <ClaimRow
                    label="Expires"
                    value={formatTimestamp(claims.exp)}
                    note={relative(claims.exp)}
                    status={claims.isExpired ? "error" : "ok"}
                  />
                )}
                {claims.nbf && (
                  <ClaimRow
                    label="Not before"
                    value={formatTimestamp(claims.nbf)}
                    note={relative(claims.nbf)}
                    status={claims.isActive ? "ok" : "warning"}
                  />
                )}
                {claims.issuer && (
                  <ClaimRow label="Issuer"   value={claims.issuer}   />
                )}
                {claims.subject && (
                  <ClaimRow label="Subject"  value={claims.subject}  />
                )}
                {claims.audience && (
                  <ClaimRow
                    label="Audience"
                    value={Array.isArray(claims.audience)
                      ? claims.audience.join(", ")
                      : claims.audience}
                  />
                )}
                {claims.jwtId && (
                  <ClaimRow label="JWT ID" value={claims.jwtId} />
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────── */}
      {!input && (
        <div className="flex flex-col items-center justify-center py-14 border border-dashed border-gray-200 rounded-xl bg-gray-50 gap-3">
          <svg width="48" height="48" fill="none" stroke="currentColor" className="text-gray-300" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 7a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9a2 2 0 012-2h6zM12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"/>
          </svg>
          <p className="text-sm font-semibold text-gray-400">
            Paste a JWT token to decode it
          </p>
          <p className="text-xs text-gray-300">
            Decodes header, payload and claims — runs entirely in your browser
          </p>
        </div>
      )}
    </div>
  );
}
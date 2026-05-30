"use client";

import { useState } from "react";

// ============================================================
// COPY BUTTON
// Reusable clipboard copy button.
// Variants: default | primary | ghost | toolbar | icon
// ============================================================

export default function CopyButton({
  text = "",
  label = "Copy",
  variant = "default",
  className = "",
  onCopied,
}) {
  const [state, setState] = useState("idle"); // idle | copied | error

  async function handleCopy() {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
      onCopied?.();
      setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 2000);
    }
  }

  // ── Variant styles ────────────────────────────────────────
  const base = "inline-flex items-center gap-1.5 font-medium transition-all select-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-40";

  const variants = {
    default:
      "px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg",
    primary:
      "px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm hover:shadow-md active:scale-95",
    ghost:
      "px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg",
    toolbar:
      "px-2.5 py-1.5 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg",
    icon:
      "p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg",
  };

  // ── State content ─────────────────────────────────────────
  const content = {
    idle: {
      icon: (
        <svg
          className="w-3.5 h-3.5 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      ),
      text: label,
      extraClass: "",
    },
    copied: {
      icon: (
        <svg
          className="w-3.5 h-3.5 flex-shrink-0 text-green-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M5 13l4 4L19 7"
          />
        </svg>
      ),
      text: "Copied!",
      extraClass: "text-green-600",
    },
    error: {
      icon: (
        <svg
          className="w-3.5 h-3.5 flex-shrink-0 text-red-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      ),
      text: "Failed",
      extraClass: "text-red-500",
    },
  };

  const current = content[state];

  return (
    <button
      onClick={handleCopy}
      disabled={!text}
      title="Copy to clipboard"
      className={`
        ${base}
        ${variants[variant]}
        ${current.extraClass}
        ${className}
      `}
    >
      {current.icon}
      {/* Hide label on icon variant */}
      {variant !== "icon" && (
        <span>{current.text}</span>
      )}
    </button>
  );
}
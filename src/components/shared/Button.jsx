"use client";

import { forwardRef, useState } from "react";
import Link from "next/link";

// ============================================================
// DESIGN SYSTEM — Button Component
//
// Aesthetic direction: Precision-engineered utility.
// Every button state is deliberate — hover lifts with a
// subtle shadow shift, active presses with scale + shadow
// collapse, loading spins cleanly, disabled fades with
// reduced opacity. No gradients, no glow effects —
// pure geometry and motion.
//
// VARIANTS:
//   primary   — Blue filled. Main CTAs.
//   secondary — White/gray outlined. Secondary actions.
//   ghost     — Transparent. Tertiary actions.
//   danger    — Red filled. Destructive actions.
//   success   — Green filled. Confirmation actions.
//   warning   — Amber filled. Caution actions.
//   dark      — Dark filled. On light backgrounds.
//   link      — Looks like a text link.
//
// SIZES:
//   xs  — 28px height. Inline / toolbar use.
//   sm  — 32px height. Compact panels.
//   md  — 38px height. Default.
//   lg  — 44px height. Primary CTAs.
//   xl  — 52px height. Hero CTAs.
//
// USAGE:
//   <Button>Click me</Button>
//   <Button variant="secondary" size="sm">Cancel</Button>
//   <Button variant="danger" loading>Deleting...</Button>
//   <Button href="/tools" icon={<ArrowIcon />} iconPosition="right">
//     Browse Tools
//   </Button>
//   <Button variant="ghost" iconOnly aria-label="Close">
//     <CloseIcon />
//   </Button>
// ============================================================

// ── Variant styles ────────────────────────────────────────────
const VARIANTS = {
  primary: {
    base: `
      bg-blue-600 text-white border border-blue-600
      hover:bg-blue-700 hover:border-blue-700
      active:bg-blue-800 active:border-blue-800
      shadow-sm hover:shadow-md hover:shadow-blue-200
      active:shadow-none
      focus-visible:ring-blue-500
      disabled:bg-blue-300 disabled:border-blue-300
      disabled:shadow-none
    `,
    loading: "bg-blue-500 border-blue-500",
  },

  secondary: {
    base: `
      bg-white text-gray-700 border border-gray-300
      hover:bg-gray-50 hover:border-gray-400 hover:text-gray-900
      active:bg-gray-100 active:border-gray-400
      shadow-sm hover:shadow-md hover:shadow-gray-100
      active:shadow-none
      focus-visible:ring-gray-400
      disabled:bg-gray-50 disabled:text-gray-400
      disabled:border-gray-200 disabled:shadow-none
    `,
    loading: "bg-gray-50 border-gray-200",
  },

  ghost: {
    base: `
      bg-transparent text-gray-600 border border-transparent
      hover:bg-gray-100 hover:text-gray-900 hover:border-gray-200
      active:bg-gray-200 active:border-gray-200
      focus-visible:ring-gray-400
      disabled:text-gray-300
    `,
    loading: "bg-gray-50",
  },

  danger: {
    base: `
      bg-red-600 text-white border border-red-600
      hover:bg-red-700 hover:border-red-700
      active:bg-red-800 active:border-red-800
      shadow-sm hover:shadow-md hover:shadow-red-200
      active:shadow-none
      focus-visible:ring-red-500
      disabled:bg-red-300 disabled:border-red-300
      disabled:shadow-none
    `,
    loading: "bg-red-500 border-red-500",
  },

  success: {
    base: `
      bg-green-600 text-white border border-green-600
      hover:bg-green-700 hover:border-green-700
      active:bg-green-800 active:border-green-800
      shadow-sm hover:shadow-md hover:shadow-green-200
      active:shadow-none
      focus-visible:ring-green-500
      disabled:bg-green-300 disabled:border-green-300
      disabled:shadow-none
    `,
    loading: "bg-green-500 border-green-500",
  },

  warning: {
    base: `
      bg-amber-500 text-white border border-amber-500
      hover:bg-amber-600 hover:border-amber-600
      active:bg-amber-700 active:border-amber-700
      shadow-sm hover:shadow-md hover:shadow-amber-200
      active:shadow-none
      focus-visible:ring-amber-500
      disabled:bg-amber-300 disabled:border-amber-300
      disabled:shadow-none
    `,
    loading: "bg-amber-400 border-amber-400",
  },

  dark: {
    base: `
      bg-gray-900 text-white border border-gray-900
      hover:bg-gray-800 hover:border-gray-800
      active:bg-black active:border-black
      shadow-sm hover:shadow-md hover:shadow-gray-300
      active:shadow-none
      focus-visible:ring-gray-700
      disabled:bg-gray-400 disabled:border-gray-400
      disabled:shadow-none
    `,
    loading: "bg-gray-700 border-gray-700",
  },

  link: {
    base: `
      bg-transparent text-blue-600 border border-transparent
      hover:text-blue-700 hover:underline underline-offset-2
      active:text-blue-800
      focus-visible:ring-blue-500
      disabled:text-gray-400
      px-0 shadow-none
    `,
    loading: "bg-transparent",
  },
};

// ── Size styles ───────────────────────────────────────────────
const SIZES = {
  xs: {
    button:  "h-7 px-2.5 text-xs rounded-lg gap-1",
    icon:    "w-3.5 h-3.5",
    spinner: "w-3 h-3",
    iconOnly:"w-7 h-7 p-0 rounded-lg",
  },
  sm: {
    button:  "h-8 px-3 text-xs rounded-lg gap-1.5",
    icon:    "w-3.5 h-3.5",
    spinner: "w-3.5 h-3.5",
    iconOnly:"w-8 h-8 p-0 rounded-lg",
  },
  md: {
    button:  "h-[38px] px-4 text-sm rounded-xl gap-2",
    icon:    "w-4 h-4",
    spinner: "w-4 h-4",
    iconOnly:"w-[38px] h-[38px] p-0 rounded-xl",
  },
  lg: {
    button:  "h-11 px-5 text-sm rounded-xl gap-2",
    icon:    "w-4 h-4",
    spinner: "w-4 h-4",
    iconOnly:"w-11 h-11 p-0 rounded-xl",
  },
  xl: {
    button:  "h-13 px-7 text-base rounded-2xl gap-2.5",
    icon:    "w-5 h-5",
    spinner: "w-5 h-5",
    iconOnly:"w-13 h-13 p-0 rounded-2xl",
  },
};

// ── Spinner ───────────────────────────────────────────────────
function Spinner({ className = "" }) {
  return (
    <svg
      className={`animate-spin flex-shrink-0 ${className}`}
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-20"
        cx="12" cy="12" r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-80"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

// ============================================================
// MAIN BUTTON COMPONENT
// ============================================================

const Button = forwardRef(function Button(
  {
    // Content
    children,

    // Variant + size
    variant = "primary",
    size = "md",

    // Icon support
    icon,
    iconPosition = "left",  // "left" | "right"
    iconOnly = false,        // square button with icon only

    // State
    loading = false,
    disabled = false,
    active = false,          // force active/pressed look

    // Link mode — renders as <a> via Next.js Link
    href,
    external = false,        // opens in new tab

    // HTML button props
    type = "button",
    onClick,
    className = "",

    // Full width
    fullWidth = false,

    // Tooltip
    title,

    // Aria
    "aria-label": ariaLabel,
    ...rest
  },
  ref
) {
  const v = VARIANTS[variant] || VARIANTS.primary;
  const s = SIZES[size] || SIZES.md;

  const isDisabled = disabled || loading;

  // ── Base classes ────────────────────────────────────────
  const baseClasses = `
    inline-flex items-center justify-center
    font-semibold leading-none
    border
    transition-all duration-150 ease-out
    cursor-pointer select-none
    outline-none
    focus-visible:ring-2 focus-visible:ring-offset-2
    disabled:cursor-not-allowed disabled:opacity-50
    active:scale-[0.97]
    ${!isDisabled ? "active:scale-[0.97]" : ""}
    ${fullWidth ? "w-full" : ""}
    ${iconOnly ? s.iconOnly : s.button}
    ${v.base}
    ${loading ? v.loading : ""}
    ${active ? "ring-2 ring-offset-1" : ""}
    ${className}
  `;

  // ── Content ─────────────────────────────────────────────
  const leftIcon = !iconOnly && icon && iconPosition === "left" && (
    <span
      className={`
        flex-shrink-0 ${s.icon}
        ${loading ? "opacity-0" : ""}
        transition-opacity
      `}
      aria-hidden="true"
    >
      {icon}
    </span>
  );

  const rightIcon = !iconOnly && icon && iconPosition === "right" && (
    <span
      className={`
        flex-shrink-0 ${s.icon}
        ${loading ? "opacity-0" : ""}
        transition-opacity
      `}
      aria-hidden="true"
    >
      {icon}
    </span>
  );

  const content = (
    <>
      {/* Loading spinner — absolutely positioned over content */}
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner className={s.spinner} />
        </span>
      )}

      {/* Left icon */}
      {leftIcon}

      {/* Label */}
      {iconOnly ? (
        <span
          className={`flex-shrink-0 ${s.icon} ${loading ? "opacity-0" : ""}`}
          aria-hidden="true"
        >
          {icon || children}
        </span>
      ) : (
        <span className={loading ? "opacity-0" : "transition-opacity"}>
          {children}
        </span>
      )}

      {/* Right icon */}
      {rightIcon}
    </>
  );

  // ── Render as Link ───────────────────────────────────────
  if (href && !isDisabled) {
    if (external) {
      return (
        
          ref={ref}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={`relative ${baseClasses}`}
          title={title}
          aria-label={ariaLabel}
          {...rest}
        >
          {content}
          {/* External link indicator */}
          <svg
            className={`absolute -top-1 -right-1 ${
              size === "xs" || size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3"
            } text-current opacity-40`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </a>
      );
    }

    return (
      <Link
        ref={ref}
        href={href}
        className={`relative ${baseClasses}`}
        title={title}
        aria-label={ariaLabel}
        {...rest}
      >
        {content}
      </Link>
    );
  }

  // ── Render as button ─────────────────────────────────────
  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      className={`relative ${baseClasses}`}
      title={title}
      aria-label={ariaLabel}
      aria-busy={loading}
      aria-disabled={isDisabled}
      {...rest}
    >
      {content}
    </button>
  );
});

Button.displayName = "Button";

export default Button;

// ============================================================
// NAMED CONVENIENCE EXPORTS
// Pre-configured buttons for the most common use cases
// Import individually:
//   import { PrimaryButton } from "@/components/shared/Button"
// ============================================================

// ── CTA button — hero / homepage ─────────────────────────────
export function CTAButton({ children, href, className = "", ...props }) {
  return (
    <Button
      variant="primary"
      size="xl"
      href={href}
      className={`
        shadow-lg shadow-blue-200
        hover:shadow-xl hover:shadow-blue-300
        hover:-translate-y-0.5
        transition-all duration-200
        ${className}
      `}
      {...props}
    >
      {children}
    </Button>
  );
}

// ── Process button — primary action inside every tool ─────────
export function ProcessButton({
  children = "Convert",
  loading = false,
  className = "",
  ...props
}) {
  return (
    <Button
      variant="primary"
      size="md"
      loading={loading}
      data-primary="true"
      icon={
        !loading ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        ) : undefined
      }
      className={className}
      {...props}
    >
      {children}
    </Button>
  );
}

// ── Clear button — clears tool input ─────────────────────────
export function ClearButton({ className = "", ...props }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      icon={
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      }
      className={`hover:text-red-500 hover:bg-red-50 hover:border-red-100 ${className}`}
      {...props}
    >
      Clear
    </Button>
  );
}

// ── Copy button — copies text to clipboard ────────────────────
export function CopyButton({ text = "", onCopied, className = "", ...props }) {
  const [state, setState] = useState("idle");

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

  const configs = {
    idle: {
      variant: "secondary",
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      label: "Copy",
    },
    copied: {
      variant: "success",
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      ),
      label: "Copied!",
    },
    error: {
      variant: "danger",
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
      label: "Failed",
    },
  };

  const cfg = configs[state];

  return (
    <Button
      variant={cfg.variant}
      size="sm"
      icon={cfg.icon}
      onClick={handleCopy}
      disabled={!text}
      className={`transition-all duration-150 ${className}`}
      {...props}
    >
      {cfg.label}
    </Button>
  );
}

// ── Download button ───────────────────────────────────────────
export function DownloadButton({
  data,
  filename,
  mimeType = "text/plain",
  children = "Download",
  className = "",
  ...props
}) {
  function handleDownload() {
    if (!data) return;
    const blob = new Blob([data], { type: mimeType });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <Button
      variant="success"
      size="md"
      disabled={!data}
      onClick={handleDownload}
      icon={
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      }
      className={className}
      {...props}
    >
      {children}
    </Button>
  );
}

// ── Icon-only button ──────────────────────────────────────────
export function IconButton({
  icon,
  label,
  variant = "ghost",
  size = "md",
  className = "",
  ...props
}) {
  return (
    <Button
      variant={variant}
      size={size}
      iconOnly
      icon={icon}
      aria-label={label}
      title={label}
      className={className}
      {...props}
    />
  );
}

// ── Back button ───────────────────────────────────────────────
export function BackButton({ href, className = "", ...props }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      href={href}
      icon={
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      }
      className={className}
      {...props}
    >
      Back
    </Button>
  );
}

// ── Button group ──────────────────────────────────────────────
// Renders a set of buttons joined together with shared borders
export function ButtonGroup({ children, className = "" }) {
  return (
    <div
      className={`
        inline-flex items-center
        [&>*]:rounded-none
        [&>*:first-child]:rounded-l-xl
        [&>*:last-child]:rounded-r-xl
        [&>*:not(:first-child)]:-ml-px
        [&>*:focus-visible]:z-10
        [&>*:hover]:z-10
        ${className}
      `}
      role="group"
    >
      {children}
    </div>
  );
}
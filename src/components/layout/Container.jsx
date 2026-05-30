// ============================================================
// CONTAINER COMPONENT
// Universal layout wrapper used across every page.
// Provides consistent max-width, padding, and spacing.
//
// USAGE EXAMPLES:
//
// Basic:
//   <Container>...</Container>
//
// Full width background, contained content:
//   <Container fullWidth>...</Container>
//
// With custom vertical padding:
//   <Container py="lg">...</Container>
//
// As a section with background:
//   <Container as="section" bg="gray">...</Container>
//
// Narrow (blog/article style):
//   <Container size="narrow">...</Container>
//
// No horizontal padding (edge-to-edge on mobile):
//   <Container noPadding>...</Container>
// ============================================================

// ── Size map ─────────────────────────────────────────────────
// Controls the max-width of the inner content
const SIZES = {
  narrow:  "max-w-3xl",      // 768px  — article, blog, focused content
  default: "max-w-7xl",      // 1280px — standard pages
  wide:    "max-w-screen-2xl", // 1536px — dashboards, tool pages
  full:    "max-w-none",     // no limit — edge-to-edge
};

// ── Vertical padding map ──────────────────────────────────────
const PY = {
  none:  "",
  xs:    "py-3",
  sm:    "py-5",
  md:    "py-8",
  lg:    "py-12",
  xl:    "py-16",
  "2xl": "py-20",
};

// ── Background map ────────────────────────────────────────────
const BG = {
  none:       "",
  white:      "bg-white",
  gray:       "bg-gray-50",
  dark:       "bg-gray-900",
  blue:       "bg-blue-600",
  gradient:   "bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800",
  subtle:     "bg-gradient-to-b from-gray-50 to-white",
};

// ── Border map ────────────────────────────────────────────────
const BORDER = {
  none:   "",
  top:    "border-t border-gray-200",
  bottom: "border-b border-gray-200",
  both:   "border-t border-b border-gray-200",
  all:    "border border-gray-200 rounded-2xl",
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function Container({
  children,

  // HTML element to render as
  as: Tag = "div",

  // Content max-width
  // "narrow" | "default" | "wide" | "full"
  size = "default",

  // Vertical padding preset
  // "none" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl"
  py = "none",

  // Background style
  // "none" | "white" | "gray" | "dark" | "blue" | "gradient" | "subtle"
  bg = "none",

  // Border style
  // "none" | "top" | "bottom" | "both" | "all"
  border = "none",

  // Remove horizontal padding (edge-to-edge)
  noPadding = false,

  // Remove inner max-width wrapper (bg fills full width,
  // content still constrained by inner div)
  fullWidth = false,

  // Extra classes on the outer wrapper
  className = "",

  // Extra classes on the inner content wrapper
  innerClassName = "",

  // Pass through any other props (id, aria-*, data-*, etc.)
  ...props
}) {
  const outerClass = [
    BG[bg]     || "",
    BORDER[border] || "",
    PY[py]     || "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const innerClass = [
    "mx-auto w-full",
    SIZES[size] || SIZES.default,
    noPadding ? "" : "px-4 sm:px-6 lg:px-8",
    innerClassName,
  ]
    .filter(Boolean)
    .join(" ");

  // If fullWidth — outer wrapper handles bg/border/padding,
  // inner wrapper constrains content width
  if (fullWidth) {
    return (
      <Tag className={outerClass} {...props}>
        <div className={innerClass}>
          {children}
        </div>
      </Tag>
    );
  }

  // Default — single wrapper that does both
  return (
    <Tag
      className={`${innerClass} ${outerClass}`}
      {...props}
    >
      {children}
    </Tag>
  );
}

// ============================================================
// NAMED SUB-COMPONENTS
// Convenience wrappers for the most common patterns
// Import individually:
//   import { PageContainer } from "@/components/layout/Container"
// ============================================================

// Standard page wrapper — white bg, default width, vertical md padding
export function PageContainer({ children, className = "", ...props }) {
  return (
    <Container
      as="main"
      size="default"
      py="md"
      className={className}
      {...props}
    >
      {children}
    </Container>
  );
}

// Tool page wrapper — gray bg, wide content, no top padding
// (tool header handles its own padding)
export function ToolContainer({ children, className = "", ...props }) {
  return (
    <Container
      size="wide"
      bg="gray"
      py="none"
      className={className}
      {...props}
    >
      {children}
    </Container>
  );
}

// Section wrapper — full-width bg, contained content
// Used for homepage sections, CTA blocks, etc.
export function SectionContainer({
  children,
  bg = "white",
  py = "xl",
  className = "",
  ...props
}) {
  return (
    <Container
      as="section"
      fullWidth
      bg={bg}
      py={py}
      className={className}
      {...props}
    >
      {children}
    </Container>
  );
}

// Narrow wrapper — for focused content like articles,
// privacy policy, terms, etc.
export function NarrowContainer({ children, className = "", ...props }) {
  return (
    <Container
      size="narrow"
      py="lg"
      className={className}
      {...props}
    >
      {children}
    </Container>
  );
}

// Hero wrapper — gradient bg, full width, xl padding
export function HeroContainer({ children, className = "", ...props }) {
  return (
    <Container
      as="section"
      fullWidth
      bg="gradient"
      py="2xl"
      className={className}
      {...props}
    >
      {children}
    </Container>
  );
}

// Card container — bordered box with rounded corners
export function CardContainer({ children, className = "", ...props }) {
  return (
    <Container
      bg="white"
      border="all"
      py="md"
      className={className}
      {...props}
    >
      {children}
    </Container>
  );
}

// Grid wrapper — adds a responsive grid layout inside
export function GridContainer({
  children,
  cols = "3",              // "1" | "2" | "3" | "4"
  gap = "md",              // "sm" | "md" | "lg"
  size = "default",
  py = "none",
  className = "",
  ...props
}) {
  const COLS = {
    "1": "grid-cols-1",
    "2": "grid-cols-1 sm:grid-cols-2",
    "3": "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    "4": "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  };

  const GAPS = {
    sm: "gap-3",
    md: "gap-4 sm:gap-6",
    lg: "gap-6 sm:gap-8",
  };

  return (
    <Container size={size} py={py} {...props}>
      <div
        className={`
          grid
          ${COLS[cols] || COLS["3"]}
          ${GAPS[gap]  || GAPS["md"]}
          ${className}
        `}
      >
        {children}
      </div>
    </Container>
  );
}
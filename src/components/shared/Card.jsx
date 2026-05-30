import { forwardRef } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { getCategoryColors } from "@/config/categories";
import { getIcon } from "@/lib/icon-map";

// ============================================================
// DESIGN SYSTEM — Card Component
// ============================================================

const SIZES = {
  sm: "p-3.5",
  md: "p-5",
  lg: "p-6 sm:p-7",
};

const BASE = `
  relative bg-white rounded-2xl border border-gray-200
  transition-all duration-200
`;

const HOVERABLE = `
  hover:border-gray-300 hover:shadow-md
  hover:shadow-gray-100/80
  cursor-pointer
`;

const HOVERABLE_BLUE = `
  hover:border-blue-200 hover:shadow-md
  hover:shadow-blue-100/60
  cursor-pointer
`;

// ============================================================
// SUB-COMPONENTS
// ============================================================

function Tag({ children }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md bg-gray-100 text-gray-500">
      {children}
    </span>
  );
}

function CardDivider({ className = "" }) {
  return <div className={`border-t border-gray-100 ${className}`} />;
}

function CardHeader({ children, className = "" }) {
  return (
    <div className={`flex items-start justify-between gap-3 ${className}`}>
      {children}
    </div>
  );
}

function CardBody({ children, className = "" }) {
  return <div className={`flex-1 min-w-0 ${className}`}>{children}</div>;
}

function CardFooter({ children, className = "" }) {
  return (
    <div className={`mt-4 pt-4 border-t border-gray-100 ${className}`}>
      {children}
    </div>
  );
}

function ArrowIndicator({ className = "" }) {
  return (
    <svg
      className={`w-4 h-4 text-gray-300 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all duration-200 flex-shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

// ============================================================
// VARIANT RENDERERS
// ============================================================

// ── Tool card ─────────────────────────────────────────────────
function ToolCard({ tool, category, size, hoverable, className }) {
  const colors = getCategoryColors(category?.color || "gray");
  const s      = SIZES[size] || SIZES.md;
  const TIcon  = getIcon(tool.icon); // ← was: {tool.icon} string as text

  const inner = (
    <div className={`group flex flex-col h-full ${s}`}>
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${colors.bg} border ${colors.border}`}>
          <TIcon size={22} />
        </div>
      </div>

      {/* Name */}
      <h3 className="font-semibold text-gray-900 text-sm sm:text-base group-hover:text-blue-600 transition-colors mb-1.5 leading-snug">
        {tool.name}
      </h3>

      {/* Short description */}
      <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 flex-1">
        {tool.shortDesc}
      </p>

      {/* Tags */}
      {tool.tags && tool.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {tool.tags.slice(0, 3).map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </div>
      )}

      {/* CTA row */}
      <div className="mt-4 flex items-center justify-between pt-3 border-t border-gray-100">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 group-hover:gap-2.5 transition-all duration-200">
          Open tool
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </span>

        {category && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${colors.badge}`}>
            {category.shortName}
          </span>
        )}
      </div>
    </div>
  );

  const classes = `${BASE} ${hoverable !== false ? HOVERABLE_BLUE : ""} overflow-hidden ${className}`;

  if (tool.slug) {
    return <Link href={`/tools/${tool.slug}`} className={classes}>{inner}</Link>;
  }
  return <div className={classes}>{inner}</div>;
}

// ── Category card ─────────────────────────────────────────────
function CategoryCard({ category, size, hoverable, className }) {
  const colors  = getCategoryColors(category.color);
  const s       = SIZES[size] || SIZES.md;
  const CatIcon = getIcon(category.icon); // ← was: {category.icon} string as text

  const inner = (
    <div className="group flex flex-col h-full overflow-hidden">
      {/* Colored top banner */}
      <div className={`${colors.bg} border-b ${colors.border} px-5 pt-5 pb-4`}>
        <div className="flex items-start justify-between gap-3">
          <div className={`w-12 h-12 bg-white border ${colors.border} rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-200`}>
            <CatIcon size={22} />
          </div>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${colors.badge}`}>
            {category.toolCount} tools
          </span>
        </div>
        <h3 className={`mt-3 font-bold text-base ${colors.text} group-hover:underline underline-offset-2 leading-snug`}>
          {category.name}
        </h3>
      </div>

      {/* Body */}
      <div className={`flex flex-col flex-1 ${s}`}>
        <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 flex-1">
          {category.shortDesc}
        </p>

        <div className={`mt-4 flex items-center gap-1.5 text-xs font-bold ${colors.text} group-hover:gap-3 transition-all duration-200`}>
          Browse tools
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </div>
      </div>
    </div>
  );

  const classes = `${BASE} ${hoverable !== false ? HOVERABLE : ""} overflow-hidden p-0 ${className}`;

  return (
    <Link href={`/categories/${category.slug}`} className={classes}>
      {inner}
    </Link>
  );
}

// ── Stat card ─────────────────────────────────────────────────
function StatCard({ value, label, icon, color = "blue", size, trend, className }) {
  const colorMap = {
    blue:   { bg: "bg-blue-50",   text: "text-blue-600",   border: "border-blue-100"   },
    green:  { bg: "bg-green-50",  text: "text-green-600",  border: "border-green-100"  },
    purple: { bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-100" },
    amber:  { bg: "bg-amber-50",  text: "text-amber-600",  border: "border-amber-100"  },
    red:    { bg: "bg-red-50",    text: "text-red-600",    border: "border-red-100"    },
    gray:   { bg: "bg-gray-50",   text: "text-gray-600",   border: "border-gray-100"   },
  };
  const c = colorMap[color] || colorMap.blue;
  const s = SIZES[size] || SIZES.md;

  return (
    <div className={`${BASE} ${s} ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
          <p className={`text-3xl font-extrabold tabular-nums ${c.text}`}>{value}</p>
          {trend && (
            <p className={`text-xs mt-1.5 font-medium ${
              trend.direction === "up" ? "text-green-600" : trend.direction === "down" ? "text-red-500" : "text-gray-400"
            }`}>
              {trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : "→"} {trend.label}
            </p>
          )}
        </div>
        {icon && (
          <div className={`flex-shrink-0 w-11 h-11 ${c.bg} border ${c.border} rounded-xl flex items-center justify-center text-2xl`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Feature card ──────────────────────────────────────────────
function FeatureCard({ icon, title, desc, size, className }) {
  const s = SIZES[size] || SIZES.md;
  return (
    <div className={`${BASE} ${s} flex items-start gap-4 ${className}`}>
      <div className="flex-shrink-0 w-11 h-11 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center text-xl">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 text-sm sm:text-base mb-1 leading-snug">{title}</h3>
        <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

// ── Info card ─────────────────────────────────────────────────
function InfoCard({ icon, title, children, status = "info", size, className }) {
  const statusMap = {
    info:    { bg: "bg-blue-50",   border: "border-blue-200",  text: "text-blue-800",  icon: "text-blue-500"  },
    success: { bg: "bg-green-50",  border: "border-green-200", text: "text-green-800", icon: "text-green-500" },
    warning: { bg: "bg-amber-50",  border: "border-amber-200", text: "text-amber-800", icon: "text-amber-500" },
    danger:  { bg: "bg-red-50",    border: "border-red-200",   text: "text-red-800",   icon: "text-red-500"   },
    neutral: { bg: "bg-gray-50",   border: "border-gray-200",  text: "text-gray-800",  icon: "text-gray-500"  },
  };
  const c = statusMap[status] || statusMap.info;
  const s = SIZES[size] || SIZES.md;

  return (
    <div className={`rounded-2xl border ${c.bg} ${c.border} ${s} ${className}`}>
      {(icon || title) && (
        <div className="flex items-start gap-3 mb-2">
          {icon && <span className={`text-xl flex-shrink-0 ${c.icon}`}>{icon}</span>}
          {title && <h4 className={`font-semibold text-sm ${c.text}`}>{title}</h4>}
        </div>
      )}
      <div className={`text-sm leading-relaxed ${c.text} opacity-90`}>{children}</div>
    </div>
  );
}

// ── Glass card ────────────────────────────────────────────────
function GlassCard({ children, size, className }) {
  const s = SIZES[size] || SIZES.md;
  return (
    <div className={`relative rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 shadow-lg ${s} ${className}`}>
      {children}
    </div>
  );
}

// ============================================================
// MAIN CARD COMPONENT
// ============================================================

const Card = forwardRef(function Card(
  {
    variant = "default",
    size = "md",
    hoverable = false,
    href,
    tool,
    category,
    value,
    label,
    icon,
    title,
    desc,
    color,
    status,
    trend,
    children,
    className = "",
    noPadding = false,
    ...rest
  },
  ref
) {
  if (variant === "tool" && tool) {
    return <ToolCard tool={tool} category={category} size={size} hoverable={hoverable} className={className} />;
  }
  if (variant === "category" && category) {
    return <CategoryCard category={category} size={size} hoverable={hoverable} className={className} />;
  }
  if (variant === "stat") {
    return <StatCard value={value} label={label} icon={icon} color={color} size={size} trend={trend} className={className} />;
  }
  if (variant === "feature") {
    return <FeatureCard icon={icon} title={title} desc={desc} size={size} className={className} />;
  }
  if (variant === "info") {
    return <InfoCard icon={icon} title={title} status={status} size={size} className={className}>{children}</InfoCard>;
  }
  if (variant === "glass") {
    return <GlassCard size={size} className={className}>{children}</GlassCard>;
  }

  // Default variant
  const s = noPadding ? "" : (SIZES[size] || SIZES.md);
  const classes = `${BASE} ${hoverable && !href ? HOVERABLE : ""} ${href ? HOVERABLE_BLUE : ""} ${s} ${className}`;

  if (href) {
    return (
      <Link ref={ref} href={href} className={`group block ${classes}`} {...rest}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">{children}</div>
          <ArrowIndicator />
        </div>
      </Link>
    );
  }

  return (
    <div ref={ref} className={classes} {...rest}>
      {children}
    </div>
  );
});

Card.displayName = "Card";
export default Card;

// ============================================================
// NAMED EXPORTS
// ============================================================

export { CardHeader, CardBody, CardFooter, CardDivider, Tag };

export function ToolCard2({ tool, category, className = "" }) {
  return <Card variant="tool" tool={tool} category={category} className={className} />;
}

export function CategoryCard2({ category, className = "" }) {
  return <Card variant="category" category={category} className={className} />;
}

export function StatCard2({ value, label, icon, color, trend, className = "" }) {
  return <Card variant="stat" value={value} label={label} icon={icon} color={color} trend={trend} className={className} />;
}

export function FeatureCard2({ icon, title, desc, className = "" }) {
  return <Card variant="feature" icon={icon} title={title} desc={desc} className={className} />;
}

export function InfoCard2({ icon, title, status, children, className = "" }) {
  return <Card variant="info" icon={icon} title={title} status={status} className={className}>{children}</Card>;
}
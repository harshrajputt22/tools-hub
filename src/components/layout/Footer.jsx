import Link from "next/link";
import { getAllCategoriesSorted, getCategoryColors, getTotalToolCount } from "@/config/categories";
import { getIcon } from "@/lib/icon-map";

// ============================================================
// STATIC DATA (FIXED ICONS → STRING KEYS)
// ============================================================

const POPULAR_TOOLS = [
  { slug: "json-formatter",        name: "JSON Formatter",       icon: "Puzzle" },
  { slug: "json-validator",        name: "JSON Validator",       icon: "CheckCircle" },
  { slug: "json-to-csv",           name: "JSON to CSV",          icon: "Table" },
  { slug: "base64-encode-decode",  name: "Base64 Encode/Decode", icon: "Lock" },
  { slug: "url-encode-decode",     name: "URL Encode/Decode",    icon: "Link" },
  { slug: "md5-hash-generator",    name: "MD5 Hash Generator",   icon: "Shield" },
  { slug: "sha256-hash-generator", name: "SHA256 Generator",     icon: "ShieldCheck" },
  { slug: "jwt-decoder",           name: "JWT Decoder",          icon: "Unlock" },
  { slug: "uuid-generator",        name: "UUID Generator",       icon: "Shuffle" },
  { slug: "timestamp-converter",   name: "Timestamp Converter",  icon: "Clock" },
  { slug: "regex-tester",          name: "Regex Tester",         icon: "Search" },
  { slug: "text-diff-checker",     name: "Text Diff Checker",    icon: "FileText" },
];

const MORE_TOOLS = [
  { slug: "css-gradient-generator",   name: "CSS Gradient Generator", icon: "Palette" },
  { slug: "css-box-shadow-generator", name: "Box Shadow Generator",   icon: "Square" },
  { slug: "flexbox-generator",        name: "Flexbox Generator",      icon: "Columns" },
  { slug: "color-code-converter",     name: "Color Converter",        icon: "Paintbrush" },
  { slug: "sql-query-generator",      name: "SQL Query Generator",    icon: "Database" },
  { slug: "lorem-ipsum-generator",    name: "Lorem Ipsum Generator",  icon: "FileText" },
  { slug: "json-to-excel",            name: "JSON to Excel",          icon: "FileSpreadsheet" },
  { slug: "yaml-to-json",             name: "YAML to JSON",           icon: "RefreshCw" },
  { slug: "url-parser",               name: "URL Parser",             icon: "Link" },
  { slug: "pdf-to-word",              name: "PDF to Word",            icon: "FileText" },
  { slug: "word-to-pdf",              name: "Word to PDF",            icon: "FileCode" },
  { slug: "favicon-generator",        name: "Favicon Generator",      icon: "Image" },
];

const COMPANY_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  // { href: "/changelog", label: "Changelog" },
  { href: "/sitemap", label: "Sitemap" },
];

const LEGAL_LINKS = [
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms-of-service", label: "Terms of Service" },
  { href: "/disclaimer", label: "Disclaimer" },
  { href: "/sitemap.xml", label: "XML Sitemap" },
];

// ============================================================
// SUB-COMPONENTS
// ============================================================

function Divider() {
  return <div className="border-t border-white/10" />;
}

function FooterHeading({ children }) {
  return (
    <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-gray-400 mb-4 flex items-center gap-2">
      <span className="w-3 h-px bg-blue-500 inline-block" />
      {children}
    </h3>
  );
}

function ToolLink({ slug, name, icon }) {
  const Icon = getIcon(icon);

  return (
    <li>
      <Link
        href={`/tools/${slug}`}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors duration-150 group"
      >
        <Icon size={14} className="opacity-60 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        <span className="truncate group-hover:underline underline-offset-2">{name}</span>
      </Link>
    </li>
  );
}

function CategoryLink({ cat }) {
  const Icon = getIcon(cat.icon);

  return (
    <li>
      <Link
        href={`/categories/${cat.slug}`}
        className="flex items-center gap-2.5 text-sm text-gray-400 hover:text-white transition-colors duration-150 group"
      >
        <span className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-xs bg-white/5 group-hover:bg-white/10 transition-colors">
          <Icon size={14} />
        </span>
        <span className="flex-1 truncate group-hover:underline underline-offset-2">
          {cat.shortName}
        </span>
        <span className="flex-shrink-0 text-xs px-1.5 py-0.5 rounded-full bg-white/5 text-gray-500 group-hover:bg-white/10 group-hover:text-gray-400 transition-colors tabular-nums">
          {cat.toolCount}
        </span>
      </Link>
    </li>
  );
}

// ── Brand column ──────────────────────────────────────────────
function BrandColumn({ totalTools }) {
  return (
    <div className="lg:col-span-1 flex flex-col gap-5">
      <Link href="/" className="flex items-center gap-3 group w-fit">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
          <span className="text-white font-bold">D</span>
        </div>
        <div>
          <span className="text-lg font-extrabold text-white">DevTools</span>
        </div>
      </Link>

      <p className="text-sm text-gray-400 max-w-[260px]">
        {totalTools}+ free online developer tools. Open-source developer tools.
      </p>
    </div>
  );
}

// ============================================================
// MAIN FOOTER
// ============================================================

export default function Footer() {
  const categories = getAllCategoriesSorted();
  const totalTools = getTotalToolCount();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-gray-950 text-gray-300 mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-10">

        <div className="lg:col-span-2">
          <BrandColumn totalTools={totalTools} />
        </div>

        <div>
          <FooterHeading>Popular Tools</FooterHeading>
          <ul className="space-y-2.5">
            {POPULAR_TOOLS.map((t) => (
              <ToolLink key={t.slug} {...t} />
            ))}
          </ul>
        </div>

        <div>
          <FooterHeading>More Tools</FooterHeading>
          <ul className="space-y-2.5">
            {MORE_TOOLS.map((t) => (
              <ToolLink key={t.slug} {...t} />
            ))}
          </ul>
        </div>

        <div>
          <FooterHeading>Categories</FooterHeading>
          <ul className="space-y-2">
            {categories.map((cat) => (
              <CategoryLink key={cat.slug} cat={cat} />
            ))}
          </ul>
        </div>

        <div className="">
          <FooterHeading>Company</FooterHeading>
          <ul className="space-y-2.5">
            {COMPANY_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-sm text-gray-400 hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* <FooterHeading>Legal</FooterHeading>
          <ul className="space-y-2.5">
            {LEGAL_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-sm text-gray-400 hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul> */}
        </div>

      </div>

      <div className="border-t border-gray-800 text-center py-4 text-xs text-gray-500">
        © {year} DevTools. All rights reserved.
      </div>
    </footer>
  );
}

// ============================================================
// BACK TO TOP — inline client script, keeps footer as server
// ============================================================

function BackToTop() {
  return <back-to-top-btn />;
}

export function FooterScripts() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            var el = document.querySelector('back-to-top-btn');
            if (!el) return;
            var btn = document.createElement('button');
            btn.innerHTML = '<svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="display:inline-block;vertical-align:middle;margin-right:4px"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/></svg>Back to top';
            btn.setAttribute('aria-label', 'Back to top');
            btn.style.cssText = 'display:inline-flex;align-items:center;font-size:0.75rem;font-weight:600;color:#4b5563;cursor:pointer;background:transparent;border:none;padding:0;transition:color 0.15s';
            btn.addEventListener('mouseenter', function() { btn.style.color = '#fff'; });
            btn.addEventListener('mouseleave', function() { btn.style.color = '#4b5563'; });
            btn.addEventListener('click', function() {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            });
            el.replaceWith(btn);
          })();
        `,
      }}
    />
  );
}
import Link from "next/link";

export const metadata = {
  title: "Disclaimer — DevTools",
  description:
    "DevTools disclaimer — tools are provided as-is with no guarantees of accuracy. Understand the limitations before using outputs in critical contexts.",
};

const LAST_UPDATED = "January 15, 2025";

const TOC = [
  { id: "general",        label: "General disclaimer"               },
  { id: "as-is",          label: "As-is provision"                  },
  { id: "accuracy",       label: "Accuracy & completeness"          },
  { id: "no-professional",label: "Not professional advice"          },
  { id: "tool-limits",    label: "Tool-specific limitations"        },
  { id: "external-links", label: "External links"                   },
  { id: "liability",      label: "Liability exclusion"              },
  { id: "jurisdiction",   label: "Jurisdiction note"                },
  { id: "contact",        label: "Contact"                          },
];

// ── Tool limitation data ───────────────────────────────────────
const TOOL_LIMITATIONS = [
  {
    category: "Document Conversion",
    emoji: "📄",
    tools: [
      { name: "PDF → Word",   limit: "Text extraction only. Scanned/image PDFs require OCR. Fonts, images, and complex layouts are not reproduced." },
      { name: "Word → PDF",   limit: "Rendered via HTML intermediate. SmartArt, text boxes, and advanced Word formatting may not appear correctly." },
      { name: "PDF → Excel",  limit: "Heuristic text-position grouping. Complex tables, merged cells, or multi-column layouts may misalign." },
      { name: "PDF → JPG",    limit: "Quality depends on original PDF resolution. Text-heavy pages may appear soft at low DPI settings." },
    ],
  },
  {
    category: "Data Conversion",
    emoji: "🔄",
    tools: [
      { name: "XML → CSV",    limit: "Deeply nested or attribute-heavy XML may not flatten perfectly. Manual review of output structure is advised." },
      { name: "YAML → JSON",  limit: "Only JSON-safe YAML is supported. YAML-specific types (e.g. timestamps, binary) may be coerced or dropped." },
      { name: "Excel → JSON", limit: "Formulae are evaluated at the time of upload. Dynamic or external-reference formulae may return stale values." },
    ],
  },
  {
    category: "CSS & Generators",
    emoji: "🎨",
    tools: [
      { name: "All CSS tools", limit: "Generated CSS uses standard properties. Browser-specific prefixes may be required for older browser compatibility." },
      { name: "Favicon Generator", limit: "Canvas-based resize. Vector sources (SVG) are rasterised. Results may not match a dedicated design tool." },
    ],
  },
  {
    category: "Text & Misc",
    emoji: "🔤",
    tools: [
      { name: "SQL Generator",   limit: "Generated SQL is syntactically valid but not tested against any specific database. Always validate in a staging environment." },
      { name: "Lorem Ipsum",     limit: "Generated text is for placeholder use only. It is not real content and should not be shipped to end users." },
      { name: "Color Converter", limit: "HSL ↔ RGB ↔ HEX conversions involve floating-point rounding. Differences of ±1 in the last digit are expected." },
    ],
  },
];

// ── Sub-components ─────────────────────────────────────────────
function Section({ id, index, title, children }) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="flex items-start gap-3 mb-4">
        <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-xs font-bold text-amber-600 mt-0.5">
          {index}
        </span>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-gray-900 mb-3">{title}</h2>
          <div className="text-sm text-gray-600 leading-relaxed space-y-3">{children}</div>
        </div>
      </div>
    </section>
  );
}

function P({ children }) {
  return <p className="text-sm text-gray-600 leading-relaxed">{children}</p>;
}

function BulletList({ items }) {
  return (
    <ul className="space-y-2 ml-1">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 flex-shrink-0" />
          <span className="leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Callout({ type = "warning", children }) {
  const styles = {
    warning: { wrap: "bg-amber-50 border-amber-200", icon: "text-amber-500", body: "text-amber-800" },
    info:    { wrap: "bg-blue-50  border-blue-200",  icon: "text-blue-500",  body: "text-blue-800"  },
    danger:  { wrap: "bg-red-50   border-red-200",   icon: "text-red-500",   body: "text-red-800"   },
  };
  const icons = {
    warning: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.834-1.964-.834-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z",
    info:    "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    danger:  "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  };
  const s = styles[type];
  return (
    <div className={`flex items-start gap-3 p-4 border rounded-xl ${s.wrap}`}>
      <svg width="16" height="16" className={`flex-shrink-0 mt-0.5 ${s.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icons[type]} />
      </svg>
      <p className={`text-xs leading-relaxed font-medium ${s.body}`}>{children}</p>
    </div>
  );
}

function SeverityBadge({ level }) {
  const map = {
    low:    "bg-green-50 text-green-700 border-green-100",
    medium: "bg-amber-50 text-amber-700 border-amber-100",
    high:   "bg-red-50   text-red-700   border-red-100",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${map[level]}`}>
      {level === "low" ? "Low impact" : level === "medium" ? "Review advised" : "High — always verify"}
    </span>
  );
}

// ── Page ───────────────────────────────────────────────────────
export default function DisclaimerPage() {
  return (
    <main className="min-h-screen bg-white">

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="border-b border-gray-100 bg-gradient-to-b from-amber-50 to-white">
        <div className="max-w-3xl mx-auto px-6 py-14 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-100 border border-amber-200 rounded-full mb-5">
            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-amber-600">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.834-1.964-.834-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-xs font-semibold text-amber-700 tracking-wide">Please read before use</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
            Disclaimer
          </h1>
          <p className="text-gray-500 text-lg leading-relaxed max-w-xl mx-auto mb-6">
            DevTools are free browser-based utilities provided for convenience.
            Always verify outputs before using them in production, legal, financial,
            medical, or safety-critical contexts.
          </p>
          <div className="flex items-center justify-center gap-6 text-xs text-gray-400">
            <span>Last updated: <strong className="text-gray-600">{LAST_UPDATED}</strong></span>
          </div>
        </div>
      </section>

      {/* ── Body ──────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">

          {/* ── Sticky TOC ──────────────────────────────────── */}
          <aside className="hidden lg:block lg:col-span-1">
            <div className="sticky top-8">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Contents</p>
              <nav className="flex flex-col gap-0.5">
                {TOC.map(({ id, label }, i) => (
                  <a key={id} href={`#${id}`}
                    className="flex items-center gap-2 py-1.5 px-2 text-xs text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors group">
                    <span className="text-gray-300 group-hover:text-amber-300 font-mono w-5 flex-shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {label}
                  </a>
                ))}
              </nav>
              <div className="mt-6 p-3 bg-gray-50 border border-gray-100 rounded-xl">
                <p className="text-xs text-gray-500 leading-relaxed">
                  Questions?{" "}
                  <Link href="/contact" className="text-blue-600 hover:underline">Contact us</Link>.
                </p>
              </div>
            </div>
          </aside>

          {/* ── Content ─────────────────────────────────────── */}
          <div className="lg:col-span-3 space-y-12">

            {/* Core warning banner */}
            <div className="p-5 bg-amber-50 border-2 border-amber-200 rounded-2xl">
              <div className="flex items-start gap-3">
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-amber-500 flex-shrink-0 mt-0.5">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.834-1.964-.834-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <p className="text-sm font-bold text-amber-800 mb-2">Core disclaimer</p>
                  <p className="text-sm text-amber-700 leading-relaxed">
                    DevTools are provided <strong>&quot;as is&quot;</strong> and <strong>&quot;as available&quot;</strong>,
                    without any warranty — express or implied. We do not guarantee the accuracy,
                    completeness, reliability, suitability, or availability of any tool or its output.
                    Use all results at your own risk.
                  </p>
                </div>
              </div>
            </div>

            {/* 1. General */}
            <Section id="general" index="01" title="General Disclaimer">
              <P>
                The information and tools provided on DevTools (<strong>devtools.app</strong>) are
                intended for general developer utility purposes only. While we make every
                reasonable effort to ensure that tools function correctly and produce accurate
                results, we cannot guarantee that outputs will be error-free, complete,
                or suitable for any specific purpose.
              </P>
              <P>
                The tools are designed to assist developers in common tasks such as format
                conversion, text manipulation, and code generation. They are not a substitute
                for professional software, dedicated conversion services, or human expert review.
              </P>
              <P>
                Nothing on this website constitutes professional advice of any kind. See
                Section 4 for details.
              </P>
            </Section>

            {/* 2. As-is */}
            <Section id="as-is" index="02" title="As-Is Provision">
              <Callout type="warning">
                ALL TOOLS ARE PROVIDED &quot;AS IS&quot; WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
                IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
                FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
              </Callout>
              <P>Specifically, we make no warranty that:</P>
              <BulletList items={[
                "Any tool will meet your specific requirements or produce results suitable for your intended use",
                "Tool output will be accurate, complete, free of errors, or consistent across browser environments",
                "The Service will be continuously available, uninterrupted, or free of technical issues",
                "Bugs or errors in tool logic will be identified, reported, or corrected within any particular timeframe",
                "Output generated by AI-assisted or heuristic tools (such as PDF parsing) will match results from dedicated professional software",
              ]} />
            </Section>

            {/* 3. Accuracy */}
            <Section id="accuracy" index="03" title="Accuracy &amp; Completeness">
              <P>
                Although we test our tools and aim for high accuracy, the nature of
                browser-based computation, the diversity of input formats, and the limitations
                of client-side libraries mean that results may not always be perfect.
              </P>
              <P>
                In particular, accuracy may be affected by:
              </P>
              <BulletList items={[
                "The quality, encoding, and format of the input file or text",
                "The complexity of the data being processed (e.g. nested structures, special characters)",
                "Browser version and JavaScript engine differences",
                "File size and available device memory",
                "Known limitations of the underlying open-source libraries (see Section 5)",
                "Edge cases not covered by the tool's test suite",
              ]} />
              <Callout type="info">
                For critical use cases — such as legal documents, financial data, medical
                records, or production database queries — always validate the output independently
                before relying on it.
              </Callout>
            </Section>

            {/* 4. Not professional advice */}
            <Section id="no-professional" index="04" title="Not Professional Advice">
              <P>
                Nothing on DevTools constitutes or should be interpreted as:
              </P>
              <BulletList items={[
                "Legal advice — do not use generated documents or converted files as substitutes for qualified legal counsel",
                "Financial advice — do not use generated spreadsheets, data conversions, or calculations for financial decision-making without independent verification",
                "Medical advice — do not use any tool output in medical, clinical, or health contexts without professional review",
                "Security advice — randomly generated strings, passwords, and cryptographic values should be assessed against your specific security requirements by a qualified professional",
                "Engineering or safety-critical advice — do not use tool outputs in systems where failure could result in injury, property damage, or loss of life",
              ]} />
              <P>
                We strongly recommend consulting qualified professionals when using any converted,
                generated, or processed data in contexts where accuracy is essential.
              </P>
            </Section>

            {/* 5. Tool-specific */}
            <Section id="tool-limits" index="05" title="Tool-Specific Limitations">
              <P>
                The following limitations are known and documented for specific tool categories.
                This list is not exhaustive — additional edge cases may exist.
              </P>
              <div className="space-y-6">
                {TOOL_LIMITATIONS.map(({ category, emoji, tools }) => (
                  <div key={category} className="border border-gray-200 rounded-2xl overflow-hidden">
                    <div className="flex items-center gap-2.5 px-4 py-3 bg-gray-50 border-b border-gray-200">
                      <span className="text-lg">{emoji}</span>
                      <span className="text-sm font-bold text-gray-700">{category}</span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {tools.map(({ name, limit }) => (
                        <div key={name} className="flex items-start gap-4 px-4 py-3.5">
                          <div className="flex-shrink-0 w-36">
                            <span className="text-xs font-semibold text-gray-700">{name}</span>
                          </div>
                          <p className="text-xs text-gray-500 leading-relaxed flex-1">{limit}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Use case severity guide */}
              <div className="mt-6 border border-gray-200 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <span className="text-sm font-bold text-gray-700">Output verification guide by use case</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {[
                    { use: "Personal projects, prototypes",            severity: "low",    note: "Tool output is generally reliable for personal use" },
                    { use: "Internal team tools, development",         severity: "low",    note: "Review output before deploying to production" },
                    { use: "Client deliverables, public-facing apps",  severity: "medium", note: "Always verify structure, encoding, and data integrity" },
                    { use: "Financial, legal, medical, compliance",    severity: "high",   note: "Independent professional review is mandatory" },
                    { use: "Safety-critical systems",                  severity: "high",   note: "Do not use browser-based tools — use certified software" },
                  ].map(({ use, severity, note }) => (
                    <div key={use} className="flex items-start gap-4 px-4 py-3.5">
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-700">{use}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{note}</p>
                      </div>
                      <SeverityBadge level={severity} />
                    </div>
                  ))}
                </div>
              </div>
            </Section>

            {/* 6. External links */}
            <Section id="external-links" index="06" title="External Links">
              <P>
                This website may contain links to third-party websites, tools, or resources.
                These links are provided for informational purposes only. We have no control
                over the content, accuracy, or availability of external sites and do not
                endorse any third-party website, product, or service.
              </P>
              <P>
                Accessing third-party links is done entirely at your own risk. We accept no
                responsibility for any loss or damage that may arise from your use of such
                external resources.
              </P>
            </Section>

            {/* 7. Liability */}
            <Section id="liability" index="07" title="Liability Exclusion">
              <Callout type="danger">
                TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, DEVTOOLS, ITS
                CONTRIBUTORS, AND MAINTAINERS SHALL NOT BE LIABLE FOR ANY DIRECT, INDIRECT,
                INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR EXEMPLARY DAMAGES ARISING FROM YOUR
                USE OF, OR INABILITY TO USE, THE SERVICE OR ANY OUTPUT GENERATED BY IT.
              </Callout>
              <P>
                This includes, without limitation, damages resulting from:
              </P>
              <BulletList items={[
                "Errors, omissions, or inaccuracies in tool output",
                "Loss of data or file corruption resulting from tool use",
                "Business losses arising from reliance on tool output",
                "Any direct or indirect damages suffered by third parties as a result of content you processed using the Service",
                "Unavailability of the Service at any given time",
                "Security vulnerabilities in third-party libraries used by the tools",
              ]} />
              <P>
                Your sole remedy for dissatisfaction with the Service or its output is to
                stop using the Service.
              </P>
            </Section>

            {/* 8. Jurisdiction */}
            <Section id="jurisdiction" index="08" title="Jurisdiction Note">
              <P>
                Certain jurisdictions do not allow the exclusion of implied warranties or
                the limitation of liability for incidental or consequential damages. In such
                jurisdictions, our liability is limited to the greatest extent permitted
                by applicable law.
              </P>
              <P>
                If any provision of this disclaimer is held to be unenforceable under
                applicable law, that provision shall be construed to reflect the parties&apos;
                original intent as closely as possible, and the remaining provisions shall
                remain in full force and effect.
              </P>
            </Section>

            {/* 9. Contact */}
            <Section id="contact" index="09" title="Contact">
              <P>
                If you discover a significant inaccuracy or bug in any tool, we encourage
                you to report it so we can fix it for everyone.
              </P>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { icon: "🐛", label: "Report a bug",   value: "Open a GitHub issue",        href: "https://github.com/your-org/devtools/issues/new" },
                  { icon: "📋", label: "General contact", value: "devtools.app/contact",       href: "/contact" },
                ].map(({ icon, label, value, href }) => (
                  <a key={label} href={href}
                    target={href.startsWith("http") ? "_blank" : undefined}
                    rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="flex items-start gap-3 p-4 border border-gray-200 rounded-xl hover:border-amber-200 hover:bg-amber-50/30 transition-colors">
                    <span className="text-xl">{icon}</span>
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</p>
                      <p className="text-xs font-mono text-blue-600 mt-0.5">{value}</p>
                    </div>
                  </a>
                ))}
              </div>
            </Section>

            {/* Footer note */}
            <div className="pt-6 border-t border-gray-100">
              <p className="text-xs text-gray-400 leading-relaxed">
                This Disclaimer was last reviewed on <strong>{LAST_UPDATED}</strong>. It should
                be read in conjunction with our{" "}
                <Link href="/terms-of-service" className="text-blue-500 hover:underline">Terms of Service</Link>{" "}
                and{" "}
                <Link href="/privacy-policy" className="text-blue-500 hover:underline">Privacy Policy</Link>.
              </p>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}
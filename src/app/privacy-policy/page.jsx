import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — DevTools",
  description:
    "DevTools privacy policy — what data we collect, how we use it, and why most tools collect no data at all.",
};

const LAST_UPDATED  = "January 15, 2025";
const EFFECTIVE_DATE = "January 15, 2025";

// ── Table of contents ──────────────────────────────────────────
const TOC = [
  { id: "overview",         label: "Overview"                       },
  { id: "data-collected",   label: "Data we collect"                },
  { id: "no-data",          label: "Data we do NOT collect"         },
  { id: "analytics",        label: "Analytics"                      },
  { id: "cookies",          label: "Cookies & local storage"        },
  { id: "third-parties",    label: "Third-party services"           },
  { id: "data-processing",  label: "How data is processed"          },
  { id: "your-rights",      label: "Your rights"                    },
  { id: "children",         label: "Children's privacy"             },
  { id: "changes",          label: "Changes to this policy"         },
  { id: "contact",          label: "Contact us"                     },
];

// ── Section wrapper ────────────────────────────────────────────
function Section({ id, title, badge, children }) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="flex items-start gap-3 mb-4">
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        {badge && (
          <span className={`mt-0.5 flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${badge.cls}`}>
            {badge.text}
          </span>
        )}
      </div>
      <div className="text-sm text-gray-600 leading-relaxed space-y-3">
        {children}
      </div>
    </section>
  );
}

function P({ children }) { return <p>{children}</p>; }

function Highlight({ color = "blue", children }) {
  const map = {
    blue:  "bg-blue-50 border-blue-100 text-blue-800",
    green: "bg-green-50 border-green-100 text-green-800",
    amber: "bg-amber-50 border-amber-100 text-amber-800",
  };
  return (
    <div className={`flex items-start gap-3 p-4 border rounded-xl ${map[color]}`}>
      <svg width="14" height="14" className="flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className="text-xs font-medium leading-relaxed">{children}</p>
    </div>
  );
}

function BulletList({ items }) {
  return (
    <ul className="space-y-1.5 ml-1">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function DataTable({ rows }) {
  return (
    <div className="overflow-hidden border border-gray-200 rounded-xl">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left px-4 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wider w-1/3">Data type</th>
            <th className="text-left px-4 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wider w-1/3">Purpose</th>
            <th className="text-left px-4 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Retention</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map(({ type, purpose, retention, collected = true }, i) => (
            <tr key={i} className={!collected ? "opacity-50" : ""}>
              <td className="px-4 py-3 font-medium text-gray-800">{type}</td>
              <td className="px-4 py-3 text-gray-600">{purpose}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                  retention === "Not stored"
                    ? "bg-green-50 text-green-700 border border-green-100"
                    : retention === "Session only"
                    ? "bg-blue-50 text-blue-700 border border-blue-100"
                    : "bg-gray-100 text-gray-600 border border-gray-200"
                }`}>
                  {retention}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────
export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero */}
      <section className="border-b border-gray-100 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-3xl mx-auto px-6 py-14 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-100 rounded-full mb-5">
            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-green-600">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="text-xs font-semibold text-green-700 tracking-wide">Privacy-first by design</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
            Privacy Policy
          </h1>
          <p className="text-gray-500 text-lg leading-relaxed max-w-xl mx-auto">
            The short version: most tools collect nothing. The files you upload and the
            data you paste stay in your browser and are never sent to us.
          </p>
          <div className="flex items-center justify-center gap-6 mt-6 text-xs text-gray-400">
            <span>Effective: <strong className="text-gray-600">{EFFECTIVE_DATE}</strong></span>
            <span className="w-1 h-1 rounded-full bg-gray-300" />
            <span>Last updated: <strong className="text-gray-600">{LAST_UPDATED}</strong></span>
          </div>
        </div>
      </section>

      {/* Body */}
      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">

          {/* Sticky TOC */}
          <aside className="hidden lg:block lg:col-span-1">
            <div className="sticky top-8">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Contents</p>
              <nav className="flex flex-col gap-0.5">
                {TOC.map(({ id, label }, i) => (
                  <a key={id} href={`#${id}`}
                    className="flex items-center gap-2 py-1.5 px-2 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors group">
                    <span className="text-gray-300 group-hover:text-blue-300 font-mono">{String(i + 1).padStart(2, "0")}</span>
                    {label}
                  </a>
                ))}
              </nav>

              <div className="mt-6 p-3 bg-gray-50 border border-gray-100 rounded-xl">
                <p className="text-xs text-gray-500 leading-relaxed">
                  Questions about this policy?{" "}
                  <Link href="/contact" className="text-blue-600 hover:underline">Contact us</Link>.
                </p>
              </div>
            </div>
          </aside>

          {/* Content */}
          <div className="lg:col-span-3 space-y-12">

            {/* 1. Overview */}
            <Section id="overview" title="1. Overview" badge={{ text: "Start here", cls: "bg-blue-50 text-blue-700 border-blue-100" }}>
              <Highlight color="green">
                DevTools is a client-side application. The vast majority of processing happens
                entirely within your browser. Files you upload and text you paste are processed
                locally and are never transmitted to any server controlled by us.
              </Highlight>
              <P>
                This Privacy Policy describes what limited information may be collected when you
                use DevTools (<strong>devtools.app</strong>), how it is used, and the choices available to you.
                By using the site you agree to the practices described here.
              </P>
              <P>
                We have written this policy to be readable rather than exhaustive. If you have
                questions about a specific tool or situation not covered here, please{" "}
                <Link href="/contact" className="text-blue-600 hover:underline">get in touch</Link>.
              </P>
            </Section>

            {/* 2. Data collected */}
            <Section id="data-collected" title="2. Data we collect">
              <P>
                We collect a minimal amount of technical data that is standard for any website
                delivered over the internet. This data does not identify you personally.
              </P>
              <DataTable rows={[
                { type: "Server access logs", purpose: "Security, abuse prevention, error diagnosis", retention: "7 days" },
                { type: "Anonymised page views", purpose: "Understanding which tools are used most", retention: "90 days aggregate" },
                { type: "Error reports", purpose: "Diagnosing and fixing bugs", retention: "30 days" },
                { type: "Contact form submissions", purpose: "Responding to your enquiry", retention: "Until resolved + 90 days" },
              ]} />
              <P>
                Server access logs may contain your IP address, browser user agent, referring URL,
                and the page requested. These logs are stored on our hosting infrastructure,
                are not shared with third parties, and are automatically purged on a rolling schedule.
              </P>
            </Section>

            {/* 3. Data NOT collected */}
            <Section id="no-data" title="3. Data we do NOT collect" badge={{ text: "Important", cls: "bg-green-50 text-green-700 border-green-100" }}>
              <Highlight color="green">
                We do not collect, receive, store or process any files, text, or data that you
                input into DevTools. All tool processing happens in your browser using JavaScript.
              </Highlight>
              <P>Specifically, we never collect:</P>
              <BulletList items={[
                "Files you upload (PDFs, images, spreadsheets, Word documents, etc.)",
                "Text you paste into any tool input area",
                "Generated output such as converted files, generated strings, or parsed data",
                "Your name, email address, or any other personally identifying information — unless you contact us directly",
                "Payment information — DevTools is entirely free",
                "Device identifiers, advertising IDs, or fingerprinting data",
                "Location data beyond country-level inferred from your IP (not stored)",
              ]} />
            </Section>

            {/* 4. Analytics */}
            <Section id="analytics" title="4. Analytics">
              <P>
                We use privacy-respecting, cookieless analytics to understand aggregate usage
                patterns — for example, which tools are most popular and how many people
                visit each day. This helps us prioritise development effort.
              </P>
              <P>
                Our analytics provider is <strong>Plausible Analytics</strong> (plausible.io),
                which is:
              </P>
              <BulletList items={[
                "GDPR, CCPA and PECR compliant",
                "Cookieless — does not set any tracking cookies",
                "Does not use fingerprinting or persistent identifiers",
                "Does not collect personal data or track individuals across sites",
                "Hosted in the EU (data processed under GDPR)",
              ]} />
              <P>
                Aggregate analytics data (e.g. &quot;page X had 500 visits today&quot;) is retained
                for up to 2 years then deleted. No individual-level data is ever stored.
              </P>
            </Section>

            {/* 5. Cookies */}
            <Section id="cookies" title="5. Cookies &amp; local storage">
              <P>
                DevTools does not set any third-party cookies and does not use cookies for
                tracking or advertising purposes.
              </P>
              <P>We may use browser storage in two limited ways:</P>
              <div className="overflow-hidden border border-gray-200 rounded-xl">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="text-left px-4 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Purpose</th>
                      <th className="text-left px-4 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Expires</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr>
                      <td className="px-4 py-3 font-medium text-gray-800">localStorage</td>
                      <td className="px-4 py-3 text-gray-600">Saving user preferences (e.g. dark mode, last-used settings) to improve your experience on return visits</td>
                      <td className="px-4 py-3"><span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">Until cleared by you</span></td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-medium text-gray-800">sessionStorage</td>
                      <td className="px-4 py-3 text-gray-600">Temporary in-memory tool state during a single browser session</td>
                      <td className="px-4 py-3"><span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-100">Session end</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <P>
                You can clear all locally stored data at any time from your browser&apos;s
                developer tools (<code className="text-xs bg-gray-100 px-1 py-0.5 rounded">Application → Storage → Clear site data</code>) or via your browser&apos;s privacy settings.
              </P>
            </Section>

            {/* 6. Third parties */}
            <Section id="third-parties" title="6. Third-party services">
              <P>
                We use a small number of third-party services to operate the website.
                Each is listed below with a description of its role and a link to its
                own privacy policy.
              </P>
              {[
                {
                  name: "Vercel",
                  role: "Hosting & edge network (CDN)",
                  data: "IP address, request headers",
                  policy: "https://vercel.com/legal/privacy-policy",
                },
                {
                  name: "Plausible Analytics",
                  role: "Cookieless, anonymised usage analytics",
                  data: "Page URL, referrer, browser type, country (no personal data)",
                  policy: "https://plausible.io/privacy",
                },
                {
                  name: "GitHub",
                  role: "Source code hosting, issue tracking",
                  data: "Public — no user data shared",
                  policy: "https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement",
                },
              ].map(({ name, role, data, policy }) => (
                <div key={name} className="flex items-start gap-4 p-4 border border-gray-100 rounded-xl hover:border-gray-200 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-gray-500">{name[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{name} — <span className="font-normal text-gray-500">{role}</span></p>
                    <p className="text-xs text-gray-500 mt-0.5">Data shared: {data}</p>
                  </div>
                  <a href={policy} target="_blank" rel="noopener noreferrer"
                    className="flex-shrink-0 text-xs text-blue-600 hover:underline">
                    Privacy policy ↗
                  </a>
                </div>
              ))}
              <P>
                We do not use Google Analytics, Meta Pixel, or any other behavioural
                advertising networks. We do not sell or rent your data to anyone.
              </P>
            </Section>

            {/* 7. Data processing */}
            <Section id="data-processing" title="7. How data is processed">
              <P>
                The legal basis for processing the minimal data we do collect is
                <strong> legitimate interest</strong> — specifically the need to keep the website
                secure, diagnose errors, and improve the service for all users.
              </P>
              <P>
                We do not engage in automated decision-making or profiling that produces
                legal or significant effects on individuals.
              </P>
              <P>
                If you submit a contact form, your name, email address, and message are stored
                only for the purpose of responding to your enquiry. This data is retained for
                90 days after the matter is resolved, after which it is permanently deleted.
              </P>
            </Section>

            {/* 8. Your rights */}
            <Section id="your-rights" title="8. Your rights">
              <P>
                Depending on your location, you may have rights under applicable law including:
              </P>
              <BulletList items={[
                "Right of access — to obtain a copy of personal data we hold about you",
                "Right of rectification — to correct inaccurate data",
                "Right of erasure — to request deletion of your data",
                "Right to data portability — to receive your data in a portable format",
                "Right to object — to object to certain types of processing",
                "Right to withdraw consent — where processing is based on consent",
              ]} />
              <P>
                Because we collect very little data, most of these rights will have limited
                practical application. To exercise any right or ask a question,{" "}
                <Link href="/contact" className="text-blue-600 hover:underline">contact us</Link>{" "}
                and we will respond within 30 days.
              </P>
              <Highlight color="blue">
                EU/EEA and UK residents have additional rights under the GDPR and UK GDPR respectively.
                If you believe your rights have been infringed, you have the right to lodge a complaint
                with your supervisory authority (e.g. the ICO in the UK).
              </Highlight>
            </Section>

            {/* 9. Children */}
            <Section id="children" title="9. Children's privacy">
              <P>
                DevTools is not directed at children under the age of 13. We do not knowingly
                collect personal information from children. If you believe a child has submitted
                personal information to us, please contact us immediately and we will
                delete it promptly.
              </P>
            </Section>

            {/* 10. Changes */}
            <Section id="changes" title="10. Changes to this policy">
              <P>
                We may update this Privacy Policy from time to time to reflect changes to our
                practices or for legal, operational, or regulatory reasons.
              </P>
              <P>
                When we make material changes we will update the &quot;Last updated&quot; date at the top
                of this page. For significant changes we will also post a notice on the site.
                Continued use of the service after the effective date constitutes acceptance
                of the updated policy.
              </P>
              <P>
                The history of changes to this policy is available in the{" "}
                <a href="https://github.com/your-org/devtools" target="_blank" rel="noopener noreferrer"
                  className="text-blue-600 hover:underline">
                  GitHub repository
                </a>.
              </P>
            </Section>

            {/* 11. Contact */}
            <Section id="contact" title="11. Contact us">
              <P>
                If you have any questions, concerns, or requests relating to this Privacy Policy
                or the way we handle data, please contact us:
              </P>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { icon: "✉️", label: "Email",         value: "privacy@devtools.app",                           href: "mailto:privacy@devtools.app"                    },
                  { icon: "📋", label: "Contact form",  value: "devtools.app/contact",                           href: "/contact"                                       },
                  { icon: "🐛", label: "GitHub Issues", value: "github.com/your-org/devtools",                   href: "https://github.com/your-org/devtools/issues/new" },
                ].map(({ icon, label, value, href }) => (
                  <a key={label} href={href} target={href.startsWith("http") ? "_blank" : undefined}
                    rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="flex items-start gap-3 p-4 border border-gray-200 rounded-xl hover:border-blue-200 hover:bg-blue-50/30 transition-colors">
                    <span className="text-xl">{icon}</span>
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</p>
                      <p className="text-xs font-mono text-blue-600 mt-0.5 break-all">{value}</p>
                    </div>
                  </a>
                ))}
              </div>
              <P>
                We aim to respond to all privacy-related enquiries within <strong>5 business days</strong>.
              </P>
            </Section>

            {/* Footer note */}
            <div className="pt-6 border-t border-gray-100">
              <p className="text-xs text-gray-400 leading-relaxed">
                This policy was last reviewed on <strong>{LAST_UPDATED}</strong> and applies to
                the DevTools website at <strong>devtools.app</strong> and all subdomains.
                It does not apply to third-party websites linked from our pages.
                See also our{" "}
                <Link href="/terms-of-service" className="text-blue-500 hover:underline">Terms of Service</Link>{" "}
                and{" "}
                <Link href="/disclaimer" className="text-blue-500 hover:underline">Disclaimer</Link>.
              </p>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}
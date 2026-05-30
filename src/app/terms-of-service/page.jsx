import Link from "next/link";

export const metadata = {
  title: "Terms of Service — DevTools",
  description:
    "Read the DevTools Terms of Service — the rules governing use of our free, browser-based developer toolkit.",
};

const LAST_UPDATED   = "January 15, 2025";
const EFFECTIVE_DATE = "January 15, 2025";

// ── Table of contents ──────────────────────────────────────────
const TOC = [
  { id: "acceptance",       label: "Acceptance of terms"         },
  { id: "description",      label: "Description of service"      },
  { id: "eligibility",      label: "Eligibility"                 },
  { id: "acceptable-use",   label: "Acceptable use"              },
  { id: "prohibited",       label: "Prohibited conduct"          },
  { id: "intellectual-prop",label: "Intellectual property"       },
  { id: "user-content",     label: "Your content & data"         },
  { id: "third-party",      label: "Third-party services"        },
  { id: "disclaimer",       label: "Disclaimer of warranties"    },
  { id: "liability",        label: "Limitation of liability"     },
  { id: "indemnification",  label: "Indemnification"             },
  { id: "termination",      label: "Termination"                 },
  { id: "changes",          label: "Changes to terms"            },
  { id: "governing-law",    label: "Governing law"               },
  { id: "contact",          label: "Contact"                     },
];

// ── Shared primitives ──────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className="h-px flex-1 bg-gray-200" />
      <span className="text-xs font-bold uppercase tracking-widest text-gray-400 px-1">{children}</span>
      <div className="h-px flex-1 bg-gray-200" />
    </div>
  );
}

function Section({ id, index, title, badge, children }) {
  const badgeStyles = {
    required:  "bg-red-50 text-red-700 border-red-100",
    important: "bg-amber-50 text-amber-700 border-amber-100",
    info:      "bg-blue-50 text-blue-700 border-blue-100",
    positive:  "bg-green-50 text-green-700 border-green-100",
  };
  return (
    <section id={id} className="scroll-mt-24">
      <div className="flex items-start gap-3 mb-4">
        <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-xs font-bold text-blue-600 mt-0.5">
          {index}
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-2.5 flex-wrap mb-3">
            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
            {badge && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${badgeStyles[badge.type]}`}>
                {badge.text}
              </span>
            )}
          </div>
          <div className="text-sm text-gray-600 leading-relaxed space-y-3">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

function P({ children }) { return <p className="text-sm text-gray-600 leading-relaxed">{children}</p>; }

function BulletList({ items }) {
  return (
    <ul className="space-y-2 ml-1">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
          <span className="leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function ProhibitedList({ items }) {
  return (
    <ul className="space-y-2 ml-1">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
          <span className="w-4 h-4 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
          </span>
          <span className="leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Callout({ type = "info", title, children }) {
  const styles = {
    warning: { wrap: "bg-amber-50 border-amber-200", icon: "text-amber-500", title: "text-amber-800", body: "text-amber-700" },
    info:    { wrap: "bg-blue-50 border-blue-200",   icon: "text-blue-500",  title: "text-blue-800",  body: "text-blue-700"  },
    danger:  { wrap: "bg-red-50 border-red-200",     icon: "text-red-500",   title: "text-red-800",   body: "text-red-700"   },
    success: { wrap: "bg-green-50 border-green-200", icon: "text-green-500", title: "text-green-800", body: "text-green-700" },
  };
  const s = styles[type];
  const icons = {
    warning: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.834-1.964-.834-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z",
    info:    "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    danger:  "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    success: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  };
  return (
    <div className={`flex items-start gap-3 p-4 border rounded-xl ${s.wrap}`}>
      <svg width="16" height="16" className={`flex-shrink-0 mt-0.5 ${s.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icons[type]} />
      </svg>
      <div>
        {title && <p className={`text-xs font-bold mb-1 ${s.title}`}>{title}</p>}
        <p className={`text-xs leading-relaxed ${s.body}`}>{children}</p>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────
export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-white">

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="border-b border-gray-100 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-3xl mx-auto px-6 py-14 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-full mb-5">
            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-blue-600">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-xs font-semibold text-blue-700 tracking-wide">Legal agreement</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
            Terms of Service
          </h1>
          <p className="text-gray-500 text-lg leading-relaxed max-w-xl mx-auto mb-6">
            These terms govern your use of DevTools. We have written them to be clear and
            fair — please read them before using the service.
          </p>
          <div className="flex items-center justify-center gap-6 text-xs text-gray-400">
            <span>Effective: <strong className="text-gray-600">{EFFECTIVE_DATE}</strong></span>
            <span className="w-1 h-1 rounded-full bg-gray-300" />
            <span>Last updated: <strong className="text-gray-600">{LAST_UPDATED}</strong></span>
          </div>
        </div>
      </section>

      {/* ── Body ──────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">

          {/* ── Sticky TOC ──────────────────────────────────────── */}
          <aside className="hidden lg:block lg:col-span-1">
            <div className="sticky top-8">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Contents</p>
              <nav className="flex flex-col gap-0.5">
                {TOC.map(({ id, label }, i) => (
                  <a key={id} href={`#${id}`}
                    className="flex items-center gap-2 py-1.5 px-2 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors group">
                    <span className="text-gray-300 group-hover:text-blue-300 font-mono w-5 flex-shrink-0">
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

          {/* ── Sections ──────────────────────────────────────── */}
          <div className="lg:col-span-3 space-y-12">

            {/* Summary box */}
            <div className="p-5 bg-blue-50 border border-blue-100 rounded-2xl">
              <p className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-3">Plain-English Summary</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { icon: "✅", text: "Free to use for any lawful purpose" },
                  { icon: "✅", text: "No account required" },
                  { icon: "✅", text: "Your data never leaves your browser" },
                  { icon: "✅", text: "Open source — MIT licence" },
                  { icon: "❌", text: "Don't use to harm or defraud others" },
                  { icon: "❌", text: "Don't scrape or abuse the service" },
                  { icon: "⚠️", text: "Tools provided as-is, no guarantees" },
                  { icon: "⚠️", text: "We can change or terminate anytime" },
                ].map(({ icon, text }) => (
                  <div key={text} className="flex items-center gap-2 text-xs text-blue-700">
                    <span className="flex-shrink-0">{icon}</span>
                    <span>{text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 1 */}
            <Section id="acceptance" index="01" title="Acceptance of Terms" badge={{ type: "required", text: "Required reading" }}>
              <P>
                By accessing or using DevTools (&quot;the Service&quot;, &quot;we&quot;, &quot;us&quot;) at{" "}
                <strong>devtools.app</strong> and any associated subdomains, you agree to be
                bound by these Terms of Service (&quot;Terms&quot;) and our{" "}
                <Link href="/privacy-policy" className="text-blue-600 hover:underline">Privacy Policy</Link>,
                which is incorporated herein by reference.
              </P>
              <P>
                If you do not agree to these Terms, you must immediately stop using the Service.
                Your continued use following any update to these Terms constitutes acceptance
                of the revised Terms.
              </P>
              <Callout type="info">
                These Terms form a legally binding agreement between you and DevTools.
                If you are using the Service on behalf of an organisation, you represent
                that you have authority to bind that organisation to these Terms.
              </Callout>
            </Section>

            {/* 2 */}
            <Section id="description" index="02" title="Description of Service">
              <P>
                DevTools is a free, browser-based collection of developer utilities including,
                but not limited to, data conversion tools, document processors, CSS generators,
                text utilities, and image tools. All computational processing occurs client-side
                within your web browser.
              </P>
              <P>
                The Service is provided free of charge without any subscription, registration,
                or payment requirement. We reserve the right to introduce paid features, modify
                the feature set, or change the pricing model at any time with reasonable notice.
              </P>
              <P>
                We do not guarantee continuous, uninterrupted access to the Service. Scheduled
                maintenance, unexpected outages, or hosting infrastructure issues may result in
                temporary unavailability.
              </P>
            </Section>

            {/* 3 */}
            <Section id="eligibility" index="03" title="Eligibility">
              <P>You must be at least 13 years of age to use this Service. By using the Service, you represent and warrant that:</P>
              <BulletList items={[
                "You are at least 13 years of age (or 16 in the European Union/EEA)",
                "You have the legal capacity to enter into a binding agreement",
                "You are not located in a country subject to a U.S. government embargo or designated as a 'terrorist supporting' country",
                "You are not listed on any U.S. government list of prohibited or restricted parties",
                "Your use of the Service will comply with all applicable local, national, and international laws",
              ]} />
            </Section>

            {/* 4 */}
            <Section id="acceptable-use" index="04" title="Acceptable Use" badge={{ type: "positive", text: "What you can do" }}>
              <P>
                Subject to these Terms, we grant you a personal, non-exclusive, non-transferable,
                revocable, limited licence to access and use the Service for lawful purposes.
              </P>
              <P>You are permitted to:</P>
              <BulletList items={[
                "Use all available tools for personal, educational, or commercial projects",
                "Access the Service from any device or browser",
                "Share links to the Service or to specific tools",
                "Fork, self-host, or modify the open-source codebase under the terms of the MIT Licence",
                "Integrate tool outputs into your own projects without restriction",
                "Use the Service as part of your professional workflow or business operations",
              ]} />
            </Section>

            {/* 5 */}
            <Section id="prohibited" index="05" title="Prohibited Conduct" badge={{ type: "required", text: "Do not do this" }}>
              <P>The following activities are strictly prohibited when using the Service:</P>
              <ProhibitedList items={[
                "Using the Service for any unlawful purpose or in violation of any applicable laws or regulations",
                "Attempting to gain unauthorised access to any part of the Service, its infrastructure, or related systems",
                "Launching automated requests, bots, scrapers, crawlers, or scripts that place excessive load on our servers",
                "Reverse engineering, decompiling, or disassembling any non-open-source components of the Service",
                "Interfering with or disrupting the integrity or performance of the Service",
                "Transmitting malware, viruses, Trojan horses, or other harmful or destructive content through the Service",
                "Using the Service to generate, process, or distribute illegal content including content that violates intellectual property rights or constitutes harassment, defamation, or fraud",
                "Impersonating DevTools, our team, or any other user or entity",
                "Collecting or harvesting information about other users of the Service",
                "Using the Service in any manner that could damage, overburden, or impair the Service",
                "Reselling, sublicensing, or commercialising access to the Service itself (as distinct from tool outputs)",
              ]} />
              <Callout type="warning" title="Enforcement">
                Violation of these prohibitions may result in immediate termination of your
                access, reporting to law enforcement, and legal action where appropriate.
              </Callout>
            </Section>

            {/* 6 */}
            <Section id="intellectual-prop" index="06" title="Intellectual Property">
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Our intellectual property</p>
                  <P>
                    The DevTools brand, logo, website design, and all original content created
                    by us (excluding open-source libraries) are owned by DevTools and protected
                    by applicable intellectual property laws. You may not reproduce, distribute,
                    or create derivative works from our proprietary content without prior written
                    permission.
                  </P>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Open-source licence (MIT)</p>
                  <P>
                    The source code of the DevTools application is released under the{" "}
                    <strong>MIT Licence</strong>. You are free to use, copy, modify, merge, publish,
                    distribute, sublicense, and sell copies of the software, subject to the
                    conditions of the MIT Licence. The full licence text is available in the
                    repository&apos;s{" "}
                    <a href="https://github.com/your-org/devtools/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      LICENSE file
                    </a>.
                  </P>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Third-party licences</p>
                  <P>
                    The Service incorporates third-party open-source libraries, each subject to
                    their own licences. A complete list of dependencies and their respective
                    licences is available in the{" "}
                    <a href="https://github.com/your-org/devtools" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      project repository
                    </a>.
                  </P>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Your output</p>
                  <P>
                    Any files, content, or data you generate using the Service belong entirely
                    to you. We make no claim of ownership over your inputs or outputs.
                  </P>
                </div>
              </div>
            </Section>

            {/* 7 */}
            <Section id="user-content" index="07" title="Your Content &amp; Data" badge={{ type: "positive", text: "You own it" }}>
              <Callout type="success">
                All files you upload and text you input are processed entirely within your browser.
                We do not receive, store, or have access to your content. You retain full ownership
                of all your data.
              </Callout>
              <P>
                Because your data is processed client-side and never transmitted to us, we have
                no ability to and assume no responsibility for the content you process using
                the Service. You are solely responsible for ensuring that:
              </P>
              <BulletList items={[
                "You have the legal right to process any files or data you input into the Service",
                "Your use of the Service with any particular content complies with applicable law",
                "Sensitive or confidential data is handled appropriately given the client-side nature of the processing",
                "You maintain appropriate backups of any data you process, as we cannot recover lost files",
              ]} />
            </Section>

            {/* 8 */}
            <Section id="third-party" index="08" title="Third-Party Services">
              <P>
                The Service may contain links to third-party websites, services, or resources.
                These links are provided for convenience only. We have no control over and
                assume no responsibility for the content, privacy policies, or practices of
                any third-party sites or services.
              </P>
              <P>
                We use a limited number of third-party services to operate the website
                (hosting, analytics). These are described in our{" "}
                <Link href="/privacy-policy#third-parties" className="text-blue-600 hover:underline">
                  Privacy Policy
                </Link>. Your interactions with these services are governed by their own
                terms and privacy policies.
              </P>
            </Section>

            {/* 9 */}
            <Section id="disclaimer" index="09" title="Disclaimer of Warranties" badge={{ type: "important", text: "Read carefully" }}>
              <Callout type="warning" title="As-is provision">
                THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES
                OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED
                WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE,
                AND NON-INFRINGEMENT.
              </Callout>
              <P>Without limiting the foregoing, we do not warrant that:</P>
              <BulletList items={[
                "The Service will be uninterrupted, timely, secure, or error-free",
                "The results obtained from using the Service will be accurate, reliable, or complete",
                "Any errors in the Service will be corrected",
                "The Service is free of viruses or other harmful components",
                "The quality of any output, data, or information obtained through the Service will meet your expectations or requirements",
              ]} />
              <P>
                You acknowledge that conversion results, generated content, and processed outputs
                are provided on a best-effort basis and should be reviewed and validated before
                use in production, legal, medical, financial, or safety-critical contexts.
                See also our{" "}
                <Link href="/disclaimer" className="text-blue-600 hover:underline">Disclaimer</Link>{" "}
                for a detailed statement on tool accuracy.
              </P>
            </Section>

            {/* 10 */}
            <Section id="liability" index="10" title="Limitation of Liability" badge={{ type: "important", text: "Important" }}>
              <Callout type="danger" title="Liability cap">
                TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, DEVTOOLS AND ITS
                CONTRIBUTORS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
                CONSEQUENTIAL, OR PUNITIVE DAMAGES — INCLUDING LOSS OF PROFITS, DATA,
                GOODWILL, OR BUSINESS INTERRUPTION — ARISING FROM YOUR USE OF OR INABILITY
                TO USE THE SERVICE, HOWEVER CAUSED AND UNDER ANY THEORY OF LIABILITY.
              </Callout>
              <P>
                Our total aggregate liability to you for any claim arising from or related
                to these Terms or the Service shall not exceed the greater of (a) the amount
                you paid us in the twelve months preceding the claim, or (b) USD $10.
                Because the Service is free, this cap will in most cases be $0.
              </P>
              <P>
                Some jurisdictions do not allow the exclusion or limitation of incidental or
                consequential damages, so the above limitation may not apply to you.
              </P>
            </Section>

            {/* 11 */}
            <Section id="indemnification" index="11" title="Indemnification">
              <P>
                You agree to defend, indemnify, and hold harmless DevTools and its contributors,
                officers, employees, and agents from and against any claims, liabilities, damages,
                losses, and expenses — including reasonable legal and accounting fees — arising
                out of or in any way connected with:
              </P>
              <BulletList items={[
                "Your access to or use of the Service",
                "Your violation of these Terms",
                "Your violation of any third-party right, including any intellectual property, privacy, or proprietary right",
                "Any claim that content you processed using the Service caused damage to a third party",
              ]} />
            </Section>

            {/* 12 */}
            <Section id="termination" index="12" title="Termination">
              <P>
                We reserve the right to restrict, suspend, or terminate your access to the
                Service at any time and without prior notice if we determine, in our sole
                discretion, that you have violated these Terms or that continued access
                poses a risk to us, other users, or third parties.
              </P>
              <P>
                You may stop using the Service at any time. Because no account is required,
                there is no formal termination or account deletion process.
              </P>
              <P>
                Upon termination of access, all provisions of these Terms that by their nature
                should survive will survive, including ownership provisions, warranty disclaimers,
                indemnity, and limitations of liability.
              </P>
            </Section>

            {/* 13 */}
            <Section id="changes" index="13" title="Changes to These Terms">
              <P>
                We reserve the right to modify these Terms at any time. We will notify you of
                material changes by updating the &quot;Last updated&quot; date at the top of this page
                and, for significant changes, by posting a prominent notice on the Service.
              </P>
              <P>
                Your continued use of the Service after the effective date of any revision
                constitutes your acceptance of the new Terms. If you do not agree to the
                revised Terms, you must stop using the Service.
              </P>
              <P>
                The history of changes to these Terms is available in the{" "}
                <a href="https://github.com/your-org/devtools" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  GitHub repository
                </a>.
              </P>
            </Section>

            {/* 14 */}
            <Section id="governing-law" index="14" title="Governing Law &amp; Disputes">
              <P>
                These Terms shall be governed by and construed in accordance with the laws
                of the jurisdiction in which the operator of DevTools is registered, without
                regard to its conflict of law provisions.
              </P>
              <P>
                Any dispute arising from these Terms or your use of the Service shall first
                be attempted to be resolved through good-faith negotiation. If the dispute
                cannot be resolved informally within 30 days, it shall be submitted to binding
                arbitration in accordance with the rules of the relevant arbitration body
                in our jurisdiction.
              </P>
              <P>
                You agree that any claim must be brought in your individual capacity and not
                as a plaintiff or class member in any purported class or representative action.
              </P>
            </Section>

            {/* 15 */}
            <Section id="contact" index="15" title="Contact">
              <P>
                If you have any questions, concerns, or requests relating to these Terms,
                please contact us through any of the following channels:
              </P>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { icon: "✉️", label: "Legal enquiries", value: "legal@devtools.app",  href: "mailto:legal@devtools.app" },
                  { icon: "📋", label: "Contact form",    value: "devtools.app/contact", href: "/contact"                 },
                ].map(({ icon, label, value, href }) => (
                  <a key={label} href={href}
                    className="flex items-start gap-3 p-4 border border-gray-200 rounded-xl hover:border-blue-200 hover:bg-blue-50/30 transition-colors">
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
                These Terms of Service were last reviewed on <strong>{LAST_UPDATED}</strong> and
                apply to all users of DevTools at <strong>devtools.app</strong>.
                See also our{" "}
                <Link href="/privacy-policy" className="text-blue-500 hover:underline">Privacy Policy</Link>,{" "}
                <Link href="/disclaimer" className="text-blue-500 hover:underline">Disclaimer</Link>, and{" "}
                <Link href="/changelog" className="text-blue-500 hover:underline">Changelog</Link>.
              </p>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}
"use client";
import { useState } from "react";
import Link from "next/link";

// ── Data ───────────────────────────────────────────────────────
const SOCIAL_LINKS = [
  {
    name:  "GitHub",
    handle: "@your-org/devtools",
    href:  "https://github.com/your-org/devtools",
    desc:  "Bug reports, feature requests, pull requests",
    icon: (
      <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
      </svg>
    ),
  },
  {
    name:  "Twitter / X",
    handle: "@devtools_app",
    href:  "https://twitter.com/devtools_app",
    desc:  "Announcements, updates, quick replies",
    icon: (
      <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    name:  "Email",
    handle: "hello@devtools.app",
    href:  "mailto:hello@devtools.app",
    desc:  "General enquiries, partnerships, press",
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
];

const FAQ = [
  {
    q: "A tool is broken — how do I report it?",
    a: "Open a GitHub issue with the tool name, your browser version, and what you expected vs. what happened. Screenshots are very helpful.",
  },
  {
    q: "Can I request a new tool?",
    a: "Absolutely. Open a GitHub issue with the tag \"tool request\" and describe what the tool should do. Popular requests get built first.",
  },
  {
    q: "How do I contribute code?",
    a: "Fork the repository, follow the contribution guide in CONTRIBUTING.md, and open a pull request. All contributions are reviewed within a few days.",
  },
  {
    q: "Is there an API or self-hosted version?",
    a: "The entire project is MIT-licensed so you can self-host it freely. Clone the repo, run npm install && npm run build, and deploy anywhere that supports Next.js.",
  },
  {
    q: "Do you accept sponsorships?",
    a: "Yes — we use GitHub Sponsors. Sponsorships go directly toward domain and hosting costs, plus keeping the project free and ad-free.",
  },
];

const TOPICS = [
  { value: "bug",         label: "Bug report"          },
  { value: "feature",     label: "Feature request"     },
  { value: "tool-request",label: "New tool request"    },
  { value: "partnership", label: "Partnership / press" },
  { value: "other",       label: "Something else"      },
];

// ── Accordion ─────────────────────────────────────────────────
function Accordion({ items }) {
  const [open, setOpen] = useState(null);
  return (
    <div className="divide-y divide-gray-100 border border-gray-200 rounded-2xl overflow-hidden">
      {items.map(({ q, a }, i) => (
        <div key={i}>
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm font-semibold text-gray-800 pr-4">{q}</span>
            <svg
              width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"
              className={`flex-shrink-0 text-gray-400 transition-transform duration-200 ${open === i ? "rotate-180" : ""}`}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {open === i && (
            <div className="px-5 pb-4">
              <p className="text-sm text-gray-500 leading-relaxed">{a}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Contact form ───────────────────────────────────────────────
function ContactForm() {
  const [form, setForm]     = useState({ name: "", email: "", topic: "", message: "" });
  const [status, setStatus] = useState(null); // null | "sending" | "sent" | "error"
  const [errors, setErrors] = useState({});

  function validate() {
    const e = {};
    if (!form.name.trim())    e.name    = "Name is required.";
    if (!form.email.trim())   e.email   = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email address.";
    if (!form.topic)          e.topic   = "Please select a topic.";
    if (!form.message.trim()) e.message = "Message cannot be empty.";
    else if (form.message.trim().length < 20) e.message = "Message is too short (min. 20 characters).";
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setStatus("sending");
    // Simulate a submit — wire up to your preferred form backend here
    // e.g. Formspree, Resend, Nodemailer, etc.
    await new Promise((r) => setTimeout(r, 1400));
    setStatus("sent");
  }

  function update(key, val) {
    setForm((prev) => ({ ...prev, [key]: val }));
    if (errors[key]) setErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
  }

  if (status === "sent") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
          <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-green-600">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Message sent!</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-xs">
            Thanks for reaching out. We typically reply within 1–2 business days.
          </p>
        </div>
        <button onClick={() => { setStatus(null); setForm({ name: "", email: "", topic: "", message: "" }); }}
          className="text-sm text-blue-600 hover:underline cursor-pointer">
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {/* Name + Email */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Name <span className="text-red-400">*</span></label>
          <input value={form.name} onChange={(e) => update("name", e.target.value)}
            placeholder="Alice Johnson"
            className={`w-full px-3.5 py-2.5 text-sm border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 transition-colors ${errors.name ? "border-red-300" : "border-gray-200 focus:border-blue-300"}`} />
          {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email <span className="text-red-400">*</span></label>
          <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)}
            placeholder="alice@example.com"
            className={`w-full px-3.5 py-2.5 text-sm border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 transition-colors ${errors.email ? "border-red-300" : "border-gray-200 focus:border-blue-300"}`} />
          {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
        </div>
      </div>

      {/* Topic */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Topic <span className="text-red-400">*</span></label>
        <select value={form.topic} onChange={(e) => update("topic", e.target.value)}
          className={`w-full px-3.5 py-2.5 text-sm border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 transition-colors ${errors.topic ? "border-red-300" : "border-gray-200 focus:border-blue-300"}`}>
          <option value="">Select a topic…</option>
          {TOPICS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
        </select>
        {errors.topic && <p className="text-xs text-red-500">{errors.topic}</p>}
      </div>

      {/* Message */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Message <span className="text-red-400">*</span></label>
        <textarea value={form.message} onChange={(e) => update("message", e.target.value)}
          placeholder="Describe your question, bug, or idea in as much detail as you can…"
          rows={5}
          className={`w-full px-3.5 py-2.5 text-sm border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 transition-colors resize-none ${errors.message ? "border-red-300" : "border-gray-200 focus:border-blue-300"}`} />
        <div className="flex items-center justify-between">
          {errors.message ? <p className="text-xs text-red-500">{errors.message}</p> : <span />}
          <span className={`text-xs ${form.message.length < 20 ? "text-gray-400" : "text-green-500"}`}>
            {form.message.length} / 2000
          </span>
        </div>
      </div>

      <button type="submit" disabled={status === "sending"}
        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer">
        {status === "sending" ? (
          <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Sending…</>
        ) : (
          <><svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>Send message</>
        )}
      </button>

      <p className="text-xs text-gray-400 text-center">
        We typically reply within 1–2 business days.
        For urgent bugs, a{" "}
        <a href="https://github.com/your-org/devtools/issues" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">GitHub issue</a>
        {" "}gets a faster response.
      </p>
    </form>
  );
}

// ── Page ───────────────────────────────────────────────────────
export default function ContactPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero */}
      <section className="border-b border-gray-100 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-100 rounded-full mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span className="text-xs font-semibold text-green-700 tracking-wide">We read every message</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
            Get in touch
          </h1>
          <p className="text-gray-500 text-lg leading-relaxed max-w-xl mx-auto">
            Found a bug? Have a tool idea? Want to collaborate?
            We&apos;re a small team and we&apos;d love to hear from you.
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">

          {/* Left sidebar — info */}
          <aside className="lg:col-span-2 flex flex-col gap-8">
            {/* Response time */}
            <div className="p-5 bg-blue-50 border border-blue-100 rounded-2xl">
              <h3 className="text-sm font-bold text-blue-800 mb-3 flex items-center gap-2">
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-blue-600">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Response times
              </h3>
              <ul className="space-y-2.5">
                {[
                  { channel: "GitHub Issues",   time: "Within 24 hours", badge: "fastest" },
                  { channel: "Email",           time: "1–2 business days" },
                  { channel: "Contact form",    time: "1–2 business days" },
                  { channel: "Twitter / X DMs", time: "2–3 business days" },
                ].map(({ channel, time, badge }) => (
                  <li key={channel} className="flex items-center justify-between text-xs">
                    <span className="text-blue-700 font-medium">{channel}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-blue-600">{time}</span>
                      {badge && <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs font-bold">{badge}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Social links */}
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Find us on</h3>
              <div className="flex flex-col gap-2">
                {SOCIAL_LINKS.map(({ name, handle, href, desc, icon }) => (
                  <a key={name} href={href} target="_blank" rel="noopener noreferrer"
                    className="flex items-start gap-3 p-3.5 border border-gray-200 rounded-xl hover:border-blue-200 hover:bg-blue-50/30 transition-colors group">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center text-gray-600 group-hover:text-blue-600 transition-colors flex-shrink-0">
                      {icon}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{name}</p>
                      <p className="text-xs text-blue-600 font-mono">{handle}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            {/* Quick links */}
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Quick links</h3>
              <div className="flex flex-col gap-1.5">
                {[
                  { label: "Browse all tools",       href: "/tools"        },
                  { label: "Read about us",           href: "/about"        },
                  { label: "Privacy policy",          href: "/privacy-policy"},
                  { label: "GitHub — open an issue",  href: "https://github.com/your-org/devtools/issues/new", external: true },
                ].map(({ label, href, external }) => (
                  external ? (
                    <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors">
                      <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
                      {label}
                    </a>
                  ) : (
                    <Link key={label} href={href}
                      className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors">
                      <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
                      {label}
                    </Link>
                  )
                ))}
              </div>
            </div>
          </aside>

          {/* Right — form */}
          <div className="lg:col-span-3">
            <div className="border border-gray-200 rounded-2xl p-7 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-1">Send us a message</h2>
              <p className="text-sm text-gray-400 mb-6">All fields marked <span className="text-red-400">*</span> are required.</p>
              <ContactForm />
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-20">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs font-bold uppercase tracking-widest text-gray-400 px-1">FAQ</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">Frequently asked questions</h2>
          <div className="max-w-2xl mx-auto">
            <Accordion items={FAQ} />
          </div>
        </div>
      </div>
    </main>
  );
}
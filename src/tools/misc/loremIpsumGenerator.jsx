"use client";
import { useState, useCallback, useMemo } from "react";

// ── Lorem word bank ───────────────────────────────────────────
const WORDS = [
  "lorem","ipsum","dolor","sit","amet","consectetur","adipiscing","elit",
  "sed","do","eiusmod","tempor","incididunt","ut","labore","et","dolore",
  "magna","aliqua","enim","ad","minim","veniam","quis","nostrud","exercitation",
  "ullamco","laboris","nisi","aliquip","ex","ea","commodo","consequat","duis",
  "aute","irure","reprehenderit","in","voluptate","velit","esse","cillum",
  "fugiat","nulla","pariatur","excepteur","sint","occaecat","cupidatat","non",
  "proident","sunt","culpa","qui","officia","deserunt","mollit","anim","est",
  "laborum","perspiciatis","unde","omnis","iste","natus","error","accusantium",
  "doloremque","laudantium","totam","rem","aperiam","eaque","ipsa","quae","ab",
  "inventore","veritatis","quasi","architecto","beatae","vitae","dicta",
  "explicabo","nemo","ipsam","quia","voluptas","aspernatur","odit","fugit",
  "consequuntur","magni","dolores","eos","ratione","sequi","nesciunt","neque",
  "porro","quisquam","dolorem","adipisci","numquam","eius","modi","tempora",
  "incidunt","quaerat","labore","magnam","aliquam","quaerat","voluptatem",
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateSentence(wordCount) {
  const words = Array.from({ length: wordCount }, () => pick(WORDS));
  words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1);
  return words.join(" ") + ".";
}

function generateParagraph(wordsPerParagraph) {
  const sentenceCount = Math.max(2, Math.floor(wordsPerParagraph / 12));
  const wordsPerSentence = Math.ceil(wordsPerParagraph / sentenceCount);
  return Array.from({ length: sentenceCount }, () => generateSentence(wordsPerSentence)).join(" ");
}

// ── Shared primitives ──────────────────────────────────────────
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  async function handle() {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={handle} disabled={!text}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-gray-700 rounded-lg transition-colors">
      {copied
        ? <><svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg><span className="text-green-600">Copied!</span></>
        : <><svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>Copy</>}
    </button>
  );
}

function PanelHeader({ label, meta, actions }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-t-xl">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</span>
        {meta && <span className="text-xs text-gray-400">{meta}</span>}
      </div>
      {actions && <div className="flex items-center gap-1.5">{actions}</div>}
    </div>
  );
}

function StatsBar({ items }) {
  if (!items?.length) return null;
  return (
    <div className="flex flex-wrap gap-4 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl">
      {items.map(({ label, value }) => (
        <div key={label} className="flex items-center gap-1.5 text-xs">
          <span className="text-gray-400">{label}:</span>
          <span className="font-mono font-semibold text-gray-700">{value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────
export default function LoremIpsumGenerator() {
  const [paragraphs, setParagraphs] = useState(3);
  const [wordsPerParagraph, setWordsPerParagraph] = useState(60);
  const [output, setOutput] = useState("");

  const generate = useCallback(() => {
    const result = Array.from({ length: paragraphs }, () =>
      generateParagraph(wordsPerParagraph)
    ).join("\n\n");
    setOutput(result);
  }, [paragraphs, wordsPerParagraph]);

  const stats = useMemo(() => {
    if (!output) return null;
    const words = output.split(/\s+/).filter(Boolean).length;
    const chars = output.replace(/\n/g, "").length;
    return [
      { label: "Paragraphs", value: paragraphs },
      { label: "Words",      value: words.toLocaleString() },
      { label: "Characters", value: chars.toLocaleString() },
    ];
  }, [output, paragraphs]);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col">
        <PanelHeader label="Configuration" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-5 bg-white border border-gray-200 border-t-0 rounded-b-xl">
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Paragraphs</label>
              <span className="text-xs font-mono font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">{paragraphs}</span>
            </div>
            <input type="range" min={1} max={20} value={paragraphs} onChange={(e) => setParagraphs(+e.target.value)}
              className="w-full h-1.5 rounded-full appearance-none bg-gray-200 accent-blue-600 cursor-pointer" />
            <div className="flex justify-between text-xs text-gray-400"><span>1</span><span>20</span></div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Words per Paragraph</label>
              <span className="text-xs font-mono font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">{wordsPerParagraph}</span>
            </div>
            <input type="range" min={10} max={200} step={5} value={wordsPerParagraph} onChange={(e) => setWordsPerParagraph(+e.target.value)}
              className="w-full h-1.5 rounded-full appearance-none bg-gray-200 accent-blue-600 cursor-pointer" />
            <div className="flex justify-between text-xs text-gray-400"><span>10</span><span>200</span></div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
        <button onClick={generate}
          className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-semibold rounded-lg transition-all cursor-pointer shadow-sm">
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          Generate
        </button>
        {output && <CopyButton text={output} />}
        {output && <button onClick={() => setOutput("")} className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors">Clear</button>}
        <span className="text-xs text-gray-400 ml-auto">~{paragraphs * wordsPerParagraph} words total</span>
      </div>

      {stats && <StatsBar items={stats} />}

      {output && (
        <div className="flex flex-col">
          <PanelHeader label="Generated Text" meta={`${paragraphs} paragraph(s)`} actions={<CopyButton text={output} />} />
          <div className="p-5 bg-white border border-gray-200 border-t-0 rounded-b-xl space-y-4 max-h-[500px] overflow-y-auto">
            {output.split("\n\n").map((p, i) => (
              <p key={i} className="text-sm text-gray-700 leading-relaxed">{p}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
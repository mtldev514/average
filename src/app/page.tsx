"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import evalsData from "@/evals.json";
import claudeData from "@/evals-claude.json";
import gptData from "@/evals-gpt.json";
import geminiData from "@/evals-gemini.json";
import analysisData from "@/analysis.json";
import {
  buildSections,
  getVerdict,
  formatPct,
  formatDisplay,
  fmtPreset,
  type Stat,
  type Section,
  type EvalFamily,
  type ModelFile,
} from "@/lib/questions";
import {
  LOCALES,
  RTL_LOCALES,
  getUI,
  getCompositeVerdict,
  getScoreLabel,
  translateSections,
} from "@/lib/i18n";

// ─── Build base sections (evals skeleton + per-model files) ─────

// Each model file has a different shape — normalize to { questions: Record<key, data> }
const geminiQuestions = Array.isArray(geminiData) ? geminiData[0] : geminiData;
const gptQuestions = (gptData as Record<string, unknown>).questions ?? gptData;

const MODEL_FILES: Record<string, ModelFile> = {
  "claude-opus-4-6": { questions: claudeData as unknown as ModelFile["questions"] },
  "gpt-5-4-thinking": { questions: gptQuestions as ModelFile["questions"] },
  "gemini-3-pro": { questions: geminiQuestions as unknown as ModelFile["questions"] },
};

const BASE_SECTIONS = buildSections(evalsData as EvalFamily[], MODEL_FILES);

// ─── Analysis helper ───────────────────────────────────

interface VerdictLevels { high: string; above: string; average: string; below: string; low: string }
interface ModelAnalysis { section?: VerdictLevels; composite?: VerdictLevels; questions?: Record<string, VerdictLevels> }
const ANALYSIS = analysisData as Record<string, ModelAnalysis>;

function pickVerdict(levels: VerdictLevels | undefined, score: number): string {
  if (!levels) return "";
  if (score >= 85) return levels.high;
  if (score >= 60) return levels.above;
  if (score >= 40) return levels.average;
  if (score >= 15) return levels.below;
  return levels.low;
}

// Map section IDs to analysis keys
function sectionToKey(sectionId: string): string {
  return sectionId.replace(/[()]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
}

// ─── Components ────────────────────────────────────────

function LanguageBar({ locale, setLocale }: { locale: string; setLocale: (l: string) => void }) {
  return (
    <div className="lang-bar">
      {Object.entries(LOCALES).map(([code, label]) => (
        <button
          key={code}
          onClick={() => setLocale(code)}
          className={`lang-btn ${code === locale ? "lang-active" : ""}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}


/** Build ranges from options: each option is a boundary, chips show "lo–hi" and select the midpoint */
interface Range { lo: number; hi: number; mid: number; label: string }

function buildRanges(options: number[]): Range[] {
  if (options.length < 2) return options.map(v => ({ lo: v, hi: v, mid: v, label: fmtPreset(v) }));
  const ranges: Range[] = [];
  for (let i = 0; i < options.length; i++) {
    const lo = options[i];
    const hi = i < options.length - 1 ? options[i + 1] : null;
    if (hi === null) {
      // Last option: "N+"
      ranges.push({ lo, hi: lo, mid: lo, label: fmtPreset(lo) + "+" });
    } else if (lo === 0 && options[i + 1] <= 1) {
      // "0" as its own chip
      ranges.push({ lo: 0, hi: 0, mid: 0, label: "0" });
    } else {
      const nextLo = hi;
      const displayHi = nextLo - (nextLo >= 10 ? 1 : (nextLo >= 1 ? 1 : 0));
      const mid = Math.round((lo + Math.min(displayHi, nextLo)) / 2);
      if (displayHi <= lo) {
        ranges.push({ lo, hi: lo, mid: lo, label: fmtPreset(lo) });
      } else {
        ranges.push({ lo, hi: displayHi, mid, label: fmtPreset(lo) + "–" + fmtPreset(displayHi) });
      }
    }
  }
  return ranges;
}

function RangeChips({ options, current, color, onSelect }: {
  options: number[];
  current: number | null;
  color: string;
  onSelect: (v: number) => void;
}) {
  const ranges = useMemo(() => buildRanges(options), [options]);

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {ranges.map((r) => {
        const active = current !== null && current >= r.lo && (r === ranges[ranges.length - 1] ? true : current < (ranges[ranges.indexOf(r) + 1]?.lo ?? Infinity));
        return (
          <button
            key={r.label}
            onClick={() => onSelect(r.mid)}
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 14,
              padding: "7px 16px",
              border: `1.5px solid ${active ? color : "#ddd8d0"}`,
              borderRadius: 14,
              background: active ? `${color}20` : "transparent",
              color: active ? color : "#999",
              fontWeight: active ? 600 : 400,
              cursor: "pointer",
              transition: "all 0.15s ease",
              lineHeight: 1.5,
            }}
          >
            {r.label}
          </button>
        );
      })}
    </div>
  );
}


function StatRow({ stat, value, onChange, result, locale }: { stat: Stat; value: string; onChange: (v: string) => void; result: number | null; locale: string }) {
  const [animate, setAnimate] = useState(false);
  const prev = useRef<number | null>(null);
  const ui = getUI(locale);

  useEffect(() => {
    if (result !== null && result !== prev.current) {
      setAnimate(false);
      const t = setTimeout(() => setAnimate(true), 40);
      prev.current = result;
      return () => clearTimeout(t);
    }
  }, [result]);

  const pct = result !== null ? Math.round(result * 1000) / 10 : null;
  const numericValue = value ? parseFloat(value.replace(/\s/g, "")) : null;
  const validNumeric = numericValue !== null && !isNaN(numericValue) ? numericValue : null;
  const setFromNumber = (v: number) => onChange(formatDisplay(v, stat.step));
  const displayValue = value || "";

  return (
    <div className="stat-card">
      {/* Question title */}
      <h3 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "clamp(22px, 4vw, 28px)", fontWeight: 400, color: "#1a1a1a", lineHeight: 1.3, marginBottom: stat.description ? 8 : 20 }}>
        {stat.label}
      </h3>
      {stat.description && (
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: "#888", lineHeight: 1.6, marginBottom: 20 }}>
          {stat.description}
        </p>
      )}

      {/* Input: chips + freeform value */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <RangeChips options={stat.presets.length > 0 ? stat.presets : stat.pills} current={validNumeric} color={stat.color} onSelect={setFromNumber} />
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexShrink: 0 }}>
          <input
            type="text"
            inputMode="decimal"
            value={displayValue}
            onChange={(e) => { const raw = e.target.value.replace(/[^0-9.,]/g, "").replace(",", "."); onChange(raw); }}
            placeholder={stat.placeholder}
            style={{ width: 50, border: "none", background: "transparent", color: "#1a1a1a", fontFamily: "'IBM Plex Mono', monospace", fontSize: 24, fontWeight: 600, outline: "none", textAlign: "right", padding: 0 }}
          />
          <span style={{ fontSize: 13, color: "#999", fontFamily: "'IBM Plex Mono', monospace" }}>{stat.unit}</span>
        </div>
      </div>

      {/* Per-model verdicts */}
      {validNumeric !== null && Object.keys(stat.modelVerdicts).length > 0 && (
        <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid #e8e4de", animation: "fadeIn 0.4s ease", display: "flex", flexDirection: "column", gap: 12 }}>
          {Object.entries(stat.calcs).map(([modelId, calcFn]) => {
            const modelPct = Math.round(Math.max(0, Math.min(1, calcFn(validNumeric))) * 1000) / 10;
            const verdicts = stat.modelVerdicts[modelId];
            if (!verdicts) return null;
            const verdict = getVerdict({ ...stat, verdicts }, modelPct);
            if (!verdict) return null;
            return (
              <div key={modelId} style={{ padding: "10px 14px", background: "#faf9f7", borderRadius: 10, border: "1px solid #e8e4de" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#bbb", letterSpacing: 1 }}>
                    {modelId.toUpperCase().replace(/-/g, " ")}
                  </span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>
                    {formatPct(modelPct)}
                  </span>
                </div>
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: "#666", fontStyle: "italic", lineHeight: 1.5, margin: 0 }}>
                  {verdict}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Collapsible why */}
      <details style={{ marginTop: pct !== null ? 16 : 20 }}>
        <summary style={{ fontSize: 13, color: "#bbb", fontFamily: "'IBM Plex Mono', monospace", cursor: "pointer", userSelect: "none" }}>
          {ui.whyQuestion ?? "pourquoi cette question?"}
        </summary>
        <p style={{ fontSize: 12, color: "#999", fontFamily: "'IBM Plex Mono', monospace", fontStyle: "italic", lineHeight: 1.6, marginTop: 8 }}>
          {stat.why}
        </p>
      </details>
    </div>
  );
}

function SectionHeader({ section }: { section: Section }) {
  return (
    <div id={section.id} style={{ marginTop: 64, marginBottom: 32, scrollMarginTop: 100 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fontWeight: 600, color: section.color, letterSpacing: 1 }}>
          {section.number}
        </span>
        <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, ${section.color}44, transparent)` }} />
      </div>
      <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 32, fontWeight: 400, color: "#1a1a1a", margin: 0, letterSpacing: "-0.5px" }}>
        {section.label}
      </h2>
      <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "#aaa", marginTop: 6, fontStyle: "italic", maxWidth: 520, lineHeight: 1.6 }}>
        {section.subtitle}
      </p>
    </div>
  );
}

function SectionSummaryBar({ section, avg }: { section: Section; avg: number }) {
  const analysis = ANALYSIS[sectionToKey(section.id)];
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#999", width: 160, flexShrink: 0, textAlign: "right" }}>
          {section.label}
        </span>
        <div style={{ flex: 1, height: 8, background: "#e8e4de", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${avg}%`, background: section.color, borderRadius: 4, transition: "width 1s cubic-bezier(0.22, 1, 0.36, 1)" }} />
        </div>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 600, color: "#1a1a1a", width: 32, textAlign: "right" }}>
          {Math.round(avg)}
        </span>
      </div>
      {analysis?.section && (
        <div style={{ marginLeft: 172, fontSize: 12, color: "#999", fontFamily: "'IBM Plex Mono', monospace", fontStyle: "italic", lineHeight: 1.5 }}>
          {pickVerdict(analysis.section, avg)}
        </div>
      )}
    </div>
  );
}

function Summary({ sections, results, values, locale }: { sections: Section[]; results: Record<string, number | null>; values: Record<string, string>; locale: string }) {
  const allStats = sections.flatMap((s) => s.stats);
  const filled = Object.entries(results).filter((e): e is [string, number] => e[1] !== null);
  if (filled.length < 2) return null;

  const ui = getUI(locale);
  const avg = filled.reduce((s, [, v]) => s + v * 100, 0) / filled.length;

  // Compute per-model composite scores using each model's own medians
  const modelScores: Record<string, number> = {};
  const modelAnalysisKeys = Object.keys(ANALYSIS).filter((k) => ANALYSIS[k].composite);
  for (const modelKey of modelAnalysisKeys) {
    let total = 0;
    let count = 0;
    for (const stat of allStats) {
      const raw = values[stat.id];
      if (!raw) continue;
      const num = parseFloat(raw.replace(/\s/g, ""));
      if (isNaN(num) || num < stat.min || num > stat.max) continue;
      const calcFn = stat.calcs[modelKey];
      if (!calcFn) continue;
      total += Math.max(0, Math.min(1, calcFn(num))) * 100;
      count++;
    }
    if (count >= 2) modelScores[modelKey] = total / count;
  }

  const sectionAverages = sections.map((section) => {
    const sectionFilled = filled.filter(([id]) => section.stats.some((s) => s.id === id));
    if (sectionFilled.length === 0) return null;
    const sAvg = sectionFilled.reduce((s, [, v]) => s + v * 100, 0) / sectionFilled.length;
    return { section, avg: sAvg };
  }).filter((x): x is { section: Section; avg: number } => x !== null);

  return (
    <div style={{ marginTop: 72, paddingTop: 48, borderTop: "2px solid #1a1a1a", animation: "fadeIn 0.6s ease" }}>
      <div style={{ fontSize: 11, color: "#aaa", fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 3, marginBottom: 20, textAlign: "center" }}>
        {ui.compositeScore} &middot; {filled.length} / {allStats.length} {ui.data}
      </div>

      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <div style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "clamp(64px, 12vw, 112px)", color: "#1a1a1a", lineHeight: 1, letterSpacing: "-4px" }}>
          {Math.round(avg)}
        </div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, color: "#999", marginTop: 16, fontStyle: "italic", maxWidth: 420, margin: "16px auto 0", lineHeight: 1.6 }}>
          {getCompositeVerdict(locale, avg)}
        </div>
      </div>

      {sectionAverages.length > 1 && (
        <div style={{ maxWidth: 520, margin: "0 auto 40px" }}>
          {sectionAverages.map(({ section, avg: sAvg }) => (
            <SectionSummaryBar key={section.id} section={section} avg={sAvg} />
          ))}
        </div>
      )}

      {/* Each model's verdict — using its own score */}
      <div style={{ maxWidth: 520, margin: "0 auto 40px" }}>
        {Object.entries(ANALYSIS).map(([key, a]) => {
          if (!a.composite) return null;
          const score = modelScores[key];
          if (score === undefined) return null;
          const insight = pickVerdict(a.composite, score);
          if (!insight) return null;
          return (
            <div key={key} style={{ marginBottom: 16, padding: "12px 16px", background: "#faf9f7", borderRadius: 10, border: "1px solid #e8e4de" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#bbb", letterSpacing: 1 }}>
                  {key.toUpperCase().replace(/-/g, " ")}
                </span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>
                  {Math.round(score)}
                </span>
              </div>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: "#666", fontStyle: "italic", lineHeight: 1.5, marginTop: 4 }}>
                {insight}
              </p>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "6px 16px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "#bbb" }}>
        {filled.map(([id, val]) => {
          const stat = allStats.find((s) => s.id === id)!;
          return (
            <span key={id}>
              {stat.label}{" "}
              <span style={{ color: stat.color, fontWeight: 600 }}>{formatPct(Math.round(val * 1000) / 10)}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────

export default function Home() {
  const [locale, setLocale] = useState("fr");
  const [values, setValues] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, number | null>>({});

  const sections = useMemo(() => translateSections(BASE_SECTIONS, locale), [locale]);
  const allStats = useMemo(() => sections.flatMap((s) => s.stats), [sections]);
  const ui = getUI(locale);
  const isRTL = RTL_LOCALES.includes(locale);

  const handleChange = useCallback((id: string, val: string) => {
    setValues((prev) => ({ ...prev, [id]: val }));
    const stat = BASE_SECTIONS.flatMap((s) => s.stats).find((s) => s.id === id)!;
    const num = parseFloat(val.replace(/\s/g, ""));
    if (!isNaN(num) && num >= stat.min && num <= stat.max) {
      setResults((prev) => ({ ...prev, [id]: Math.max(0, Math.min(1, stat.calc(num))) }));
    } else {
      setResults((prev) => ({ ...prev, [id]: null }));
    }
  }, []);

  const clearAll = () => { setValues({}); setResults({}); };

  const filledCount = Object.values(results).filter((v) => v !== null).length;

  return (
    <div style={{ minHeight: "100vh", background: "#f5f2ec" }} dir={isRTL ? "rtl" : undefined}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=IBM+Plex+Mono:ital,wght@0,400;0,600;1,400&display=swap');
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        input::placeholder { color: #ccc; }
        ::selection { background: #1a1a1a22; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .stat-card {
          background: #faf9f7; border: 1px solid #e8e4de;
          border-radius: 16px; padding: 28px 32px;
          margin-bottom: 20px;
        }
        @media (max-width: 640px) { .stat-card { padding: 20px 18px; } }
.meta-btn {
          font-family: 'IBM Plex Mono', monospace; font-size: 11px;
          letter-spacing: 0.5px; padding: 6px 16px;
          border: 1px solid #d4d0c8; border-radius: 20px;
          background: transparent; color: #999; cursor: pointer; transition: all 0.2s ease;
          text-decoration: none;
        }
        .meta-btn:hover { border-color: #1a1a1a; color: #1a1a1a; }
        .lang-bar {
          width: 100%; padding: 10px 24px;
          display: flex; justify-content: center; gap: 4px; flex-wrap: wrap;
          border-bottom: 1px solid #e8e4de;
          background: #f5f2ec;
          direction: ltr;
        }
        .lang-btn {
          font-family: 'IBM Plex Mono', monospace; font-size: 11px;
          padding: 4px 12px; border: none; border-radius: 3px;
          background: transparent; color: #bbb; cursor: pointer;
          transition: all 0.15s ease; letter-spacing: 0.3px;
        }
        .lang-btn:hover { color: #1a1a1a; }
        .lang-active { color: #1a1a1a; font-weight: 600; background: #e8e4de88; }
        .sticky-nav {
          position: sticky; top: 0; z-index: 50;
          background: #f5f2ecee; backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          padding: 12px 24px; margin: 0 -24px 8px;
          border-bottom: 1px solid #e8e4de00;
          transition: border-color 0.2s;
        }
      `}</style>

      {/* Language bar — full width, always LTR */}
      <LanguageBar locale={locale} setLocale={setLocale} />

      <div style={{ padding: "60px 24px 120px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          {/* Header */}
          <div style={{ marginBottom: 16 }}>
            <h1 style={{
              fontFamily: "'DM Serif Display', Georgia, serif",
              fontSize: "clamp(52px, 9vw, 80px)", fontWeight: 400,
              color: "#1a1a1a", lineHeight: 1, letterSpacing: "-3px",
            }}>
              average.
            </h1>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, color: "#777", marginTop: 16, lineHeight: 1.8, maxWidth: 500 }}>
              {ui.concept}
            </p>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "#aaa", marginTop: 10, lineHeight: 1.6 }}>
              {ui.subtitle}
            </p>
          </div>

          {/* Sticky nav */}
          <nav className="sticky-nav">
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", maxWidth: 720, margin: "0 auto" }}>
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="meta-btn"
                  style={{ borderColor: s.color + "55", color: s.color }}
                >
                  {s.label.toLowerCase()}
                </a>
              ))}
              {filledCount > 0 && (
                <>
                  <span style={{ color: "#ddd", margin: "0 2px" }}>&middot;</span>
                  <button className="meta-btn" onClick={clearAll} style={{ borderColor: "#e8e4de", color: "#ccc" }}>{ui.clear}</button>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#ccc", letterSpacing: 1, marginLeft: 2 }}>
                    {filledCount}/{allStats.length}
                  </span>
                </>
              )}
            </div>
          </nav>

          {/* Sections */}
          {sections.map((section) => (
            <div key={section.id}>
              <SectionHeader section={section} />
              {section.stats.map((stat) => (
                <StatRow
                  key={stat.id}
                  stat={stat}
                  value={values[stat.id] || ""}
                  onChange={(v) => handleChange(stat.id, v)}
                  result={results[stat.id] ?? null}
                  locale={locale}
                />
              ))}
            </div>
          ))}

          <Summary sections={sections} results={results} values={values} locale={locale} />

          {/* Footer */}
          <div style={{ marginTop: 72, fontSize: 10, color: "#ccc", fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 1.5, textAlign: "center", lineHeight: 2 }}>
            {sections.length} {ui.models} &middot; {allStats.length} {ui.questions} &middot; {ui.approx}
          </div>
        </div>
      </div>
    </div>
  );
}

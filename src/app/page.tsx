"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import allModels from "@/data.json";
import {
  buildSections,
  getVerdict,
  formatPct,
  posToValue,
  valueToPos,
  formatDisplay,
  fmtPreset,
  type Stat,
  type Section,
  type ModelData,
} from "@/lib/questions";
import {
  LOCALES,
  RTL_LOCALES,
  getUI,
  getCompositeVerdict,
  getScoreLabel,
  translateSections,
} from "@/lib/i18n";

// ─── Build base sections (French, from data.json) ──────

const BASE_SECTIONS = buildSections(allModels as ModelData[]);

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

function PercentileBar({ pct, animate, color }: { pct: number; animate: boolean; color: string }) {
  return (
    <div style={{ width: "100%", height: 6, background: "#e8e4de", borderRadius: 3, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${animate ? pct : 0}%`, background: color, borderRadius: 3, transition: "width 0.9s cubic-bezier(0.22, 1, 0.36, 1)" }} />
    </div>
  );
}

function StatSlider({ stat, value, onChange }: { stat: Stat; value: number | null; onChange: (v: number) => void }) {
  const hasValue = value !== null;
  const pos = hasValue ? valueToPos(value, stat.min, stat.max, stat.sliderExp) : 0.5;
  const fillPct = pos * 100;

  return (
    <input
      type="range"
      className="stat-slider"
      min={0}
      max={10000}
      value={Math.round(pos * 10000)}
      onChange={(e) => {
        const rawPos = parseInt(e.target.value) / 10000;
        const rawValue = posToValue(rawPos, stat.min, stat.max, stat.sliderExp);
        const snapped = Math.round(rawValue / stat.step) * stat.step;
        onChange(Math.max(stat.min, Math.min(stat.max, snapped)));
      }}
      style={{
        background: hasValue
          ? `linear-gradient(to right, ${stat.color} 0%, ${stat.color} ${fillPct}%, #e8e4de ${fillPct}%, #e8e4de 100%)`
          : "#e8e4de",
        "--accent": hasValue ? stat.color : "#c8c4bc",
        opacity: hasValue ? 1 : 0.45,
      } as React.CSSProperties}
    />
  );
}

function Chips({ values, current, step, color, onSelect, size = "sm" }: {
  values: number[];
  current: number | null;
  step: number;
  color: string;
  onSelect: (v: number) => void;
  size?: "sm" | "lg";
}) {
  const lg = size === "lg";
  return (
    <div style={{ display: "flex", gap: lg ? 8 : 6, flexWrap: "wrap" }}>
      {values.map((v) => {
        const active = current !== null && Math.abs(current - v) < Math.max(step, 0.5);
        return (
          <button
            key={v}
            onClick={() => onSelect(v)}
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: lg ? 14 : 11,
              padding: lg ? "7px 16px" : "3px 10px",
              border: `1.5px solid ${active ? color : "#ddd8d0"}`,
              borderRadius: lg ? 14 : 12,
              background: active ? `${color}20` : "transparent",
              color: active ? color : "#999",
              fontWeight: active ? 600 : 400,
              cursor: "pointer",
              transition: "all 0.15s ease",
              lineHeight: 1.5,
            }}
          >
            {fmtPreset(v)}
          </button>
        );
      })}
    </div>
  );
}

function TextInput({ stat, value, onChange }: { stat: Stat; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^0-9.,]/g, "").replace(",", ".");
          onChange(raw);
        }}
        placeholder={stat.placeholder}
        style={{
          width: 80, padding: "4px 0", border: "none",
          borderBottom: "1.5px solid #d4d0c8", background: "transparent",
          color: "#1a1a1a", fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 15, fontWeight: 600, outline: "none", transition: "border-color 0.2s",
        }}
        onFocus={(e) => (e.target.style.borderBottomColor = stat.color)}
        onBlur={(e) => (e.target.style.borderBottomColor = "#d4d0c8")}
      />
      <span style={{ fontSize: 12, color: "#999", fontFamily: "'IBM Plex Mono', monospace" }}>{stat.unit}</span>
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
      <h3 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "clamp(22px, 4vw, 28px)", fontWeight: 400, color: "#1a1a1a", lineHeight: 1.3, marginBottom: 20 }}>
        {stat.label}
      </h3>

      {/* Input: slider/pills + value display */}
      {(stat.inputType === "slider" || stat.inputType === "freeform") && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              {stat.inputType === "slider" ? (
                <StatSlider stat={stat} value={validNumeric} onChange={setFromNumber} />
              ) : (
                <TextInput stat={stat} value={value} onChange={onChange} />
              )}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexShrink: 0 }}>
              {stat.inputType === "slider" ? (
                <input
                  type="text"
                  inputMode="decimal"
                  value={displayValue}
                  onChange={(e) => { const raw = e.target.value.replace(/[^0-9.,]/g, "").replace(",", "."); onChange(raw); }}
                  placeholder={stat.placeholder}
                  style={{ width: 60, border: "none", background: "transparent", color: "#1a1a1a", fontFamily: "'IBM Plex Mono', monospace", fontSize: 24, fontWeight: 600, outline: "none", textAlign: "right", padding: 0 }}
                />
              ) : null}
              <span style={{ fontSize: 13, color: "#999", fontFamily: "'IBM Plex Mono', monospace" }}>{stat.unit}</span>
            </div>
          </div>
          <Chips values={stat.inputType === "slider" ? stat.presets : stat.presets} current={validNumeric} step={stat.step} color={stat.color} onSelect={setFromNumber} />
        </>
      )}

      {stat.inputType === "pills" && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <Chips values={stat.pills} current={validNumeric} step={stat.step} color={stat.color} onSelect={setFromNumber} size="lg" />
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexShrink: 0 }}>
              <input
                type="text"
                inputMode="decimal"
                value={displayValue}
                onChange={(e) => { const raw = e.target.value.replace(/[^0-9.,]/g, "").replace(",", "."); onChange(raw); }}
                placeholder={stat.placeholder}
                style={{ width: 40, border: "none", background: "transparent", color: "#1a1a1a", fontFamily: "'IBM Plex Mono', monospace", fontSize: 24, fontWeight: 600, outline: "none", textAlign: "right", padding: 0 }}
              />
              <span style={{ fontSize: 13, color: "#999", fontFamily: "'IBM Plex Mono', monospace" }}>{stat.unit}</span>
            </div>
          </div>
        </>
      )}

      {/* Result section */}
      {pct !== null && (
        <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid #e8e4de", animation: "fadeIn 0.4s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 48, fontWeight: 400, color: "#1a1a1a", lineHeight: 1, letterSpacing: "-2px" }}>
                {formatPct(pct)}
              </span>
              <span style={{ fontSize: 16, color: "#aaa", fontFamily: "'IBM Plex Mono', monospace" }}>/ 100</span>
            </div>
            <span style={{ fontSize: 13, color: "#999", fontFamily: "'IBM Plex Mono', monospace" }}>
              {getScoreLabel(locale, pct, formatPct(pct))}
            </span>
          </div>
          <div style={{ width: "100%", height: 10, background: "#e8e4de", borderRadius: 5, overflow: "hidden", marginBottom: 16 }}>
            <div style={{ height: "100%", width: `${animate ? pct : 0}%`, background: "#1a1a1a", borderRadius: 5, transition: "width 0.9s cubic-bezier(0.22, 1, 0.36, 1)" }} />
          </div>
          <p style={{ fontSize: 14, color: "#555", fontFamily: "'IBM Plex Mono', monospace", fontStyle: "italic", lineHeight: 1.6, margin: 0 }}>
            {getVerdict(stat, pct)}
          </p>
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
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
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
  );
}

function Summary({ sections, results, locale }: { sections: Section[]; results: Record<string, number | null>; locale: string }) {
  const allStats = sections.flatMap((s) => s.stats);
  const filled = Object.entries(results).filter((e): e is [string, number] => e[1] !== null);
  if (filled.length < 2) return null;

  const ui = getUI(locale);
  const avg = filled.reduce((s, [, v]) => s + v * 100, 0) / filled.length;

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
        <div style={{ maxWidth: 480, margin: "0 auto 40px" }}>
          {sectionAverages.map(({ section, avg: sAvg }) => (
            <SectionSummaryBar key={section.id} section={section} avg={sAvg} />
          ))}
        </div>
      )}

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
        .stat-slider {
          -webkit-appearance: none; appearance: none;
          width: 100%; height: 4px; border-radius: 2px;
          outline: none; cursor: grab; transition: opacity 0.2s ease;
        }
        .stat-slider:active { cursor: grabbing; }
        .stat-slider::-webkit-slider-thumb {
          -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%;
          background: var(--accent, #ccc); border: 3px solid #f5f2ec;
          box-shadow: 0 1px 5px rgba(0,0,0,0.12); cursor: grab; transition: transform 0.12s ease;
        }
        .stat-slider::-webkit-slider-thumb:hover { transform: scale(1.15); }
        .stat-slider:active::-webkit-slider-thumb { cursor: grabbing; transform: scale(1.08); }
        .stat-slider::-moz-range-thumb {
          width: 20px; height: 20px; border-radius: 50%;
          background: var(--accent, #ccc); border: 3px solid #f5f2ec;
          box-shadow: 0 1px 5px rgba(0,0,0,0.12); cursor: grab;
        }
        .stat-slider::-moz-range-track { height: 4px; border-radius: 2px; background: #e8e4de; }
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

          <Summary sections={sections} results={results} locale={locale} />

          {/* Footer */}
          <div style={{ marginTop: 72, fontSize: 10, color: "#ccc", fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 1.5, textAlign: "center", lineHeight: 2 }}>
            {sections.length} {ui.models} &middot; {allStats.length} {ui.questions} &middot; {ui.approx}
          </div>
        </div>
      </div>
    </div>
  );
}

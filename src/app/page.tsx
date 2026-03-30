"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import basicModel from "@/models/basic.json";
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

// ─── Build sections from all models ────────────────────

const MODELS: ModelData[] = [basicModel as ModelData];
const SECTIONS = buildSections(MODELS);
const ALL_STATS = SECTIONS.flatMap((s) => s.stats);

// ─── Components ────────────────────────────────────────

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

function PresetChips({ stat, current, onSelect }: { stat: Stat; current: number | null; onSelect: (v: number) => void }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {stat.presets.map((v) => {
        const active = current !== null && Math.abs(current - v) < stat.step;
        return (
          <button
            key={v}
            onClick={() => onSelect(v)}
            style={{
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
              padding: "3px 10px", border: `1px solid ${active ? stat.color : "#ddd8d0"}`,
              borderRadius: 12, background: active ? `${stat.color}18` : "transparent",
              color: active ? stat.color : "#aaa", cursor: "pointer",
              transition: "all 0.15s ease", lineHeight: 1.5,
            }}
          >
            {fmtPreset(v)}
          </button>
        );
      })}
    </div>
  );
}

function StatRow({ stat, value, onChange, result }: { stat: Stat; value: string; onChange: (v: string) => void; result: number | null }) {
  const [animate, setAnimate] = useState(false);
  const prev = useRef<number | null>(null);

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

  return (
    <div className="stat-row">
      <div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 2, flexWrap: "wrap" }}>
          <span style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 20, color: "#1a1a1a" }}>{stat.label}</span>
        </div>
        <div style={{ fontSize: 11, color: "#b0a898", fontFamily: "'IBM Plex Mono', monospace", fontStyle: "italic", marginBottom: 8, lineHeight: 1.5, maxWidth: 340 }}>
          {stat.why}
        </div>
        <div style={{ margin: "10px 0 10px" }}>
          <StatSlider stat={stat} value={validNumeric} onChange={setFromNumber} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
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
          <PresetChips stat={stat} current={validNumeric} onSelect={setFromNumber} />
        </div>
      </div>

      <div style={{ minHeight: 70 }}>
        {pct !== null ? (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 10 }}>
              <span style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 42, fontWeight: 400, color: "#1a1a1a", lineHeight: 1, letterSpacing: "-1px" }}>
                {formatPct(pct)}
              </span>
              <span style={{ fontSize: 14, color: "#aaa", fontFamily: "'IBM Plex Mono', monospace" }}>e percentile</span>
            </div>
            <PercentileBar pct={pct} animate={animate} color={stat.color} />
            <div style={{ marginTop: 10, fontSize: 13, color: "#777", fontFamily: "'IBM Plex Mono', monospace", fontStyle: "italic", lineHeight: 1.5 }}>
              {getVerdict(stat, pct)}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: "#ccc", fontFamily: "'IBM Plex Mono', monospace", paddingTop: 8 }}>&mdash;</div>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ section }: { section: Section }) {
  return (
    <div style={{ marginTop: 64, marginBottom: 32 }}>
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

function Summary({ results }: { results: Record<string, number | null> }) {
  const filled = Object.entries(results).filter((e): e is [string, number] => e[1] !== null);
  if (filled.length < 2) return null;

  const avg = filled.reduce((s, [, v]) => s + v * 100, 0) / filled.length;

  const sectionAverages = SECTIONS.map((section) => {
    const sectionFilled = filled.filter(([id]) => section.stats.some((s) => s.id === id));
    if (sectionFilled.length === 0) return null;
    const sAvg = sectionFilled.reduce((s, [, v]) => s + v * 100, 0) / sectionFilled.length;
    return { section, avg: sAvg };
  }).filter((x): x is { section: Section; avg: number } => x !== null);

  let verdict = "";
  if (avg >= 90) verdict = "Statistiquement, tu n\u2019existes presque pas.";
  else if (avg >= 75) verdict = "Au-dessus de la moyenne sur presque tout. Bravo, ou chance.";
  else if (avg >= 60) verdict = "L\u00e9g\u00e8rement au-dessus. Juste assez pour le mentionner.";
  else if (avg >= 45) verdict = "Average. C\u2019est dans le nom.";
  else if (avg >= 30) verdict = "En dessous sur plusieurs axes. Une donn\u00e9e, pas un jugement.";
  else verdict = "Statistiquement remarquable \u2014 par le bas. \u00c7a reste remarquable.";

  return (
    <div style={{ marginTop: 72, paddingTop: 48, borderTop: "2px solid #1a1a1a", animation: "fadeIn 0.6s ease" }}>
      <div style={{ fontSize: 11, color: "#aaa", fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 3, marginBottom: 20, textAlign: "center" }}>
        SCORE COMPOSITE &middot; {filled.length} / {ALL_STATS.length} DONN&Eacute;ES
      </div>

      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <div style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "clamp(64px, 12vw, 112px)", color: "#1a1a1a", lineHeight: 1, letterSpacing: "-4px" }}>
          {Math.round(avg)}
        </div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, color: "#999", marginTop: 16, fontStyle: "italic", maxWidth: 420, margin: "16px auto 0", lineHeight: 1.6 }}>
          {verdict}
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
          const stat = ALL_STATS.find((s) => s.id === id)!;
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
  const [values, setValues] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, number | null>>({});

  const handleChange = useCallback((id: string, val: string) => {
    setValues((prev) => ({ ...prev, [id]: val }));
    const stat = ALL_STATS.find((s) => s.id === id)!;
    const num = parseFloat(val.replace(/\s/g, ""));
    if (!isNaN(num) && num >= stat.min && num <= stat.max) {
      setResults((prev) => ({ ...prev, [id]: Math.max(0, Math.min(1, stat.calc(num))) }));
    } else {
      setResults((prev) => ({ ...prev, [id]: null }));
    }
  }, []);

  const fillRandom = () => {
    ALL_STATS.forEach((stat, i) => {
      setTimeout(() => {
        const mid = parseFloat(stat.placeholder.replace(/\s/g, "")) || (stat.min + stat.max) / 2;
        const spread = (stat.max - stat.min) * 0.18;
        const raw = mid + (Math.random() + Math.random() + Math.random() - 1.5) * spread;
        const snapped = Math.round(Math.max(stat.min, Math.min(stat.max, raw)) / stat.step) * stat.step;
        handleChange(stat.id, formatDisplay(snapped, stat.step));
      }, i * 60);
    });
  };

  const fillMean = () => {
    ALL_STATS.forEach((stat, i) => {
      setTimeout(() => {
        const mid = parseFloat(stat.placeholder.replace(/\s/g, "")) || (stat.min + stat.max) / 2;
        const snapped = Math.round(mid / stat.step) * stat.step;
        handleChange(stat.id, formatDisplay(snapped, stat.step));
      }, i * 40);
    });
  };

  const clearAll = () => { setValues({}); setResults({}); };

  const filledCount = Object.values(results).filter((v) => v !== null).length;

  return (
    <div style={{ minHeight: "100vh", background: "#f5f2ec", padding: "60px 24px 120px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=IBM+Plex+Mono:ital,wght@0,400;0,600;1,400&display=swap');
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        input::placeholder { color: #ccc; }
        ::selection { background: #1a1a1a22; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .stat-row {
          padding: 28px 0; border-bottom: 1px solid #e8e4de;
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 12px 32px; align-items: start;
        }
        @media (max-width: 640px) { .stat-row { grid-template-columns: 1fr; gap: 16px; } }
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
        }
        .meta-btn:hover { border-color: #1a1a1a; color: #1a1a1a; }
      `}</style>

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
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: "#999", marginTop: 14, lineHeight: 1.7, maxWidth: 440 }}>
            Entre tes donn&eacute;es. On te dit &agrave; quel point tu es normal&middot;e.
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap", alignItems: "center" }}>
            <button className="meta-btn" onClick={fillRandom}>au hasard</button>
            <button className="meta-btn" onClick={fillMean}>tout moyen</button>
            {filledCount > 0 && (
              <button className="meta-btn" onClick={clearAll} style={{ borderColor: "#e8e4de", color: "#ccc" }}>effacer</button>
            )}
            {filledCount > 0 && (
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#ccc", letterSpacing: 1, marginLeft: 4 }}>
                {filledCount}/{ALL_STATS.length}
              </span>
            )}
          </div>
        </div>

        {/* Sections (one per model) */}
        {SECTIONS.map((section) => (
          <div key={section.id}>
            <SectionHeader section={section} />
            {section.stats.map((stat) => (
              <StatRow
                key={stat.id}
                stat={stat}
                value={values[stat.id] || ""}
                onChange={(v) => handleChange(stat.id, v)}
                result={results[stat.id] ?? null}
              />
            ))}
          </div>
        ))}

        <Summary results={results} />

        {/* Footer */}
        <div style={{ marginTop: 72, fontSize: 10, color: "#ccc", fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 1.5, textAlign: "center", lineHeight: 2 }}>
          {SECTIONS.length} MOD&Egrave;LE{SECTIONS.length > 1 ? "S" : ""} &middot; {ALL_STATS.length} QUESTIONS &middot; DISTRIBUTIONS APPROXIMATIVES
        </div>
      </div>
    </div>
  );
}

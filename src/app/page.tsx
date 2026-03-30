"use client";

import { useState, useEffect, useRef } from "react";

// --- Statistical helpers ---
function normalCDF(x: number, mean: number, sd: number) {
  const z = (x - mean) / sd;
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327;
  const p =
    d *
    Math.exp((-z * z) / 2) *
    (t *
      (0.3193815 +
        t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.3302744)))));
  return z > 0 ? 1 - p : p;
}

function logNormalCDF(x: number, mu: number, sigma: number) {
  if (x <= 0) return 0;
  return normalCDF(Math.log(x), mu, sigma);
}

type Verdict = [number, string];

interface Stat {
  id: string;
  label: string;
  unit: string;
  placeholder: string;
  min: number;
  max: number;
  calc: (v: number) => number;
  ref: string;
  verdicts: Verdict[];
}

const STATS: Stat[] = [
  {
    id: "height",
    label: "Taille",
    unit: "cm",
    placeholder: "175",
    min: 100,
    max: 230,
    calc: (v) => normalCDF(v, 170.5, 9.5),
    ref: "adultes, mondial",
    verdicts: [
      [97, "Tu vois les concerts sans te lever sur la pointe."],
      [80, "Au-dessus de la m\u00eal\u00e9e, litt\u00e9ralement."],
      [45, "Parfaitement ordinaire. Bienvenue."],
      [20, "Compact\u00b7e et efficace."],
      [0, "Le monde est construit pour les autres."],
    ],
  },
  {
    id: "salary",
    label: "Salaire annuel",
    unit: "$",
    placeholder: "72 000",
    min: 0,
    max: 2000000,
    calc: (v) => logNormalCDF(v, 10.85, 0.75),
    ref: "revenus canadiens",
    verdicts: [
      [99, "Le 1%. Les gens \u00e9crivent des articles sur toi."],
      [85, "Confortable. Tu choisis ton resto."],
      [50, "Pile au milieu. Statistiquement invisible."],
      [25, "En dessous de la m\u00e9diane, au-dessus du seuil."],
      [0, "L\u2019argent c\u2019est un concept de toute fa\u00e7on."],
    ],
  },
  {
    id: "bench",
    label: "Bench press",
    unit: "lbs",
    placeholder: "135",
    min: 0,
    max: 700,
    calc: (v) => normalCDF(v, 135, 55),
    ref: "adultes qui s\u2019entra\u00eenent",
    verdicts: [
      [95, "Les gens te demandent des spots. Et des conseils."],
      [70, "Solide. T\u2019es pas l\u00e0 pour d\u00e9corer."],
      [40, "Moyenne. Le banc ne se souviendra pas de toi."],
      [15, "Tout le monde commence quelque part."],
      [0, "La barre vide p\u00e8se d\u00e9j\u00e0 45 lbs, relax."],
    ],
  },
  {
    id: "sleep",
    label: "Sommeil",
    unit: "h / nuit",
    placeholder: "7",
    min: 1,
    max: 16,
    calc: (v) => normalCDF(v, 7.0, 1.2),
    ref: "adultes 18\u201365",
    verdicts: [
      [90, "Tu dors comme un projet de vie."],
      [55, "Zone recommand\u00e9e. Ton cortisol te remercie."],
      [30, "Un peu juste. Le caf\u00e9 fait le reste."],
      [10, "C\u2019est de la privation \u00e0 ce stade."],
      [0, "\u00c7a va? S\u00e9rieux."],
    ],
  },
  {
    id: "fiveK",
    label: "5K course",
    unit: "min",
    placeholder: "25",
    min: 10,
    max: 65,
    calc: (v) => 1 - normalCDF(v, 28, 6),
    ref: "coureur\u00b7ses r\u00e9cr\u00e9atif\u00b7ves",
    verdicts: [
      [95, "Sub-20 energy. Les pigeons te voient floue."],
      [70, "Plus vite que la majorit\u00e9. Pas mal."],
      [40, "Honn\u00eate. Tu finis, c\u2019est l\u2019essentiel."],
      [15, "Lent\u00b7e mais pr\u00e9sent\u00b7e."],
      [0, "La marche rapide, \u00e7a compte aussi."],
    ],
  },
  {
    id: "screen",
    label: "Screen time",
    unit: "h / jour",
    placeholder: "6",
    min: 0,
    max: 20,
    calc: (v) => normalCDF(v, 7, 2.5),
    ref: "adultes, tous \u00e9crans",
    verdicts: [
      [90, "Tes r\u00e9tines \u00e9mettent de la lumi\u00e8re bleue."],
      [60, "Au-dessus de la moyenne. Comme tout le monde."],
      [35, "Mod\u00e9r\u00e9\u00b7e. Ton ophtalmologue est fier\u00b7e."],
      [10, "D\u00e9tox digitale en cours. Respect."],
      [0, "Tu lis \u00e7a comment, exactement?"],
    ],
  },
  {
    id: "books",
    label: "Livres / an",
    unit: "livres",
    placeholder: "12",
    min: 0,
    max: 300,
    calc: (v) => logNormalCDF(v + 1, 1.6, 1.1),
    ref: "lecteur\u00b7ices adultes",
    verdicts: [
      [95, "Biblioth\u00e8que vivante. Les libraires te connaissent."],
      [65, "Lecteur\u00b7ice s\u00e9rieux\u00b7se. Goodreads est content."],
      [35, "Quelques livres. C\u2019est d\u00e9j\u00e0 plus que la plupart."],
      [10, "Un livre c\u2019est un livre."],
      [0, "Les podcasts comptent pas, d\u00e9sol\u00e9."],
    ],
  },
  {
    id: "countries",
    label: "Pays visit\u00e9s",
    unit: "pays",
    placeholder: "8",
    min: 0,
    max: 195,
    calc: (v) => logNormalCDF(v + 1, 1.8, 1.0),
    ref: "population mondiale",
    verdicts: [
      [90, "Ton passeport a besoin de pages suppl\u00e9mentaires."],
      [60, "Voyageur\u00b7se honn\u00eate. Tu connais le d\u00e9calage horaire."],
      [30, "Quelques tampons. L\u2019intention est l\u00e0."],
      [10, "Local\u00b7e. Rien de mal \u00e0 \u00e7a."],
      [0, "Chez soi c\u2019est bien aussi."],
    ],
  },
];

function getVerdict(stat: Stat, pct: number) {
  for (const [threshold, text] of stat.verdicts) {
    if (pct >= threshold) return text;
  }
  return stat.verdicts[stat.verdicts.length - 1][1];
}

function formatPct(p: number) {
  if (p >= 99.5) return "99.5+";
  if (p <= 0.5) return "<1";
  return Math.round(p).toString();
}

function PercentileBar({ pct, animate }: { pct: number; animate: boolean }) {
  return (
    <div
      style={{
        width: "100%",
        height: 6,
        background: "#e8e4de",
        borderRadius: 3,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${animate ? pct : 0}%`,
          background: "#1a1a1a",
          borderRadius: 3,
          transition: "width 0.9s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      />
    </div>
  );
}

function StatRow({
  stat,
  value,
  onChange,
  result,
}: {
  stat: Stat;
  value: string;
  onChange: (v: string) => void;
  result: number | null;
}) {
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

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.,]/g, "").replace(",", ".");
    onChange(raw);
  };

  return (
    <div
      style={{
        padding: "28px 0",
        borderBottom: "1px solid #e8e4de",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "12px 32px",
        alignItems: "start",
      }}
    >
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 10,
            marginBottom: 4,
          }}
        >
          <span
            style={{
              fontFamily: "'DM Serif Display', Georgia, serif",
              fontSize: 20,
              color: "#1a1a1a",
            }}
          >
            {stat.label}
          </span>
          <span
            style={{
              fontSize: 11,
              color: "#aaa",
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            {stat.ref}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 10,
          }}
        >
          <input
            type="text"
            inputMode="decimal"
            value={value}
            onChange={handleInput}
            placeholder={stat.placeholder}
            style={{
              width: 120,
              padding: "8px 0",
              border: "none",
              borderBottom: "2px solid #d4d0c8",
              background: "transparent",
              color: "#1a1a1a",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 18,
              fontWeight: 600,
              outline: "none",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => (e.target.style.borderBottomColor = "#1a1a1a")}
            onBlur={(e) => (e.target.style.borderBottomColor = "#d4d0c8")}
          />
          <span
            style={{
              fontSize: 13,
              color: "#999",
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            {stat.unit}
          </span>
        </div>
      </div>

      <div style={{ minHeight: 70 }}>
        {pct !== null ? (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 6,
                marginBottom: 10,
              }}
            >
              <span
                style={{
                  fontFamily: "'DM Serif Display', Georgia, serif",
                  fontSize: 42,
                  fontWeight: 400,
                  color: "#1a1a1a",
                  lineHeight: 1,
                  letterSpacing: "-1px",
                }}
              >
                {formatPct(pct)}
              </span>
              <span
                style={{
                  fontSize: 14,
                  color: "#aaa",
                  fontFamily: "'IBM Plex Mono', monospace",
                }}
              >
                e percentile
              </span>
            </div>
            <PercentileBar pct={pct} animate={animate} />
            <div
              style={{
                marginTop: 10,
                fontSize: 13,
                color: "#777",
                fontFamily: "'IBM Plex Mono', monospace",
                fontStyle: "italic",
                lineHeight: 1.5,
              }}
            >
              {getVerdict(stat, pct)}
            </div>
          </div>
        ) : (
          <div
            style={{
              fontSize: 12,
              color: "#ccc",
              fontFamily: "'IBM Plex Mono', monospace",
              paddingTop: 8,
            }}
          >
            —
          </div>
        )}
      </div>
    </div>
  );
}

function Summary({ results }: { results: Record<string, number | null> }) {
  const filled = Object.entries(results).filter(
    (entry): entry is [string, number] => entry[1] !== null
  );
  if (filled.length < 2) return null;

  const avg = filled.reduce((s, [, v]) => s + v * 100, 0) / filled.length;

  let globalVerdict = "";
  if (avg >= 90)
    globalVerdict = "Statistiquement, tu n\u2019existes presque pas.";
  else if (avg >= 75)
    globalVerdict =
      "Au-dessus de la moyenne sur presque tout. Bravo, ou chance.";
  else if (avg >= 55)
    globalVerdict =
      "L\u00e9g\u00e8rement au-dessus. Juste assez pour le mentionner.";
  else if (avg >= 45) globalVerdict = "Average. C\u2019est dans le nom.";
  else if (avg >= 30)
    globalVerdict =
      "En dessous sur plusieurs axes. C\u2019est une donn\u00e9e, pas un jugement.";
  else
    globalVerdict =
      "Statistiquement remarquable \u2014 par le bas. \u00c7a reste remarquable.";

  return (
    <div
      style={{
        marginTop: 56,
        paddingTop: 40,
        borderTop: "2px solid #1a1a1a",
        textAlign: "center",
        animation: "fadeIn 0.6s ease",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "#aaa",
          fontFamily: "'IBM Plex Mono', monospace",
          letterSpacing: 3,
          marginBottom: 16,
        }}
      >
        SCORE COMPOSITE
      </div>
      <div
        style={{
          fontFamily: "'DM Serif Display', Georgia, serif",
          fontSize: "clamp(56px, 10vw, 96px)",
          color: "#1a1a1a",
          lineHeight: 1,
          letterSpacing: "-3px",
        }}
      >
        {Math.round(avg)}
      </div>
      <div
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 14,
          color: "#999",
          marginTop: 12,
          fontStyle: "italic",
          maxWidth: 400,
          margin: "12px auto 0",
          lineHeight: 1.6,
        }}
      >
        {globalVerdict}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: "6px 16px",
          marginTop: 24,
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 12,
          color: "#bbb",
        }}
      >
        {filled.map(([id, val]) => {
          const stat = STATS.find((s) => s.id === id)!;
          return (
            <span key={id}>
              {stat.label}{" "}
              <span style={{ color: "#1a1a1a", fontWeight: 600 }}>
                {formatPct(Math.round(val * 1000) / 10)}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default function Home() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, number | null>>({});

  const handleChange = (id: string, val: string) => {
    setValues((prev) => ({ ...prev, [id]: val }));
    const stat = STATS.find((s) => s.id === id)!;
    const num = parseFloat(val);
    if (!isNaN(num) && num >= stat.min && num <= stat.max) {
      setResults((prev) => ({
        ...prev,
        [id]: Math.max(0, Math.min(1, stat.calc(num))),
      }));
    } else {
      setResults((prev) => ({ ...prev, [id]: null }));
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f2ec",
        padding: "60px 24px 100px",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=IBM+Plex+Mono:ital,wght@0,400;0,600;1,400&display=swap');
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        input::placeholder { color: #ccc; }
        ::selection { background: #1a1a1a22; }
        * { box-sizing: border-box; }
      `}</style>

      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ marginBottom: 56 }}>
          <h1
            style={{
              fontFamily: "'DM Serif Display', Georgia, serif",
              fontSize: "clamp(48px, 8vw, 72px)",
              fontWeight: 400,
              color: "#1a1a1a",
              margin: 0,
              lineHeight: 1,
              letterSpacing: "-2px",
            }}
          >
            average.
          </h1>
          <p
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 13,
              color: "#999",
              marginTop: 12,
              lineHeight: 1.7,
              maxWidth: 420,
            }}
          >
            Entre tes donn&eacute;es. On te dit &agrave; quel point tu es
            normal&middot;e.
            <br />
            Spoiler: probablement beaucoup.
          </p>
        </div>

        <div>
          {STATS.map((stat) => (
            <StatRow
              key={stat.id}
              stat={stat}
              value={values[stat.id] || ""}
              onChange={(v) => handleChange(stat.id, v)}
              result={results[stat.id] ?? null}
            />
          ))}
        </div>

        <Summary results={results} />

        <div
          style={{
            marginTop: 64,
            fontSize: 10,
            color: "#ccc",
            fontFamily: "'IBM Plex Mono', monospace",
            letterSpacing: 1.5,
            textAlign: "center",
          }}
        >
          DISTRIBUTIONS APPROXIMATIVES &middot; R&Eacute;CR&Eacute;ATIF &middot;
          PAS UN DIAGNOSTIC
        </div>
      </div>
    </div>
  );
}

// ─── Statistical helpers ───────────────────────────────

export function normalCDF(x: number, mean: number, sd: number) {
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

export function logNormalCDF(x: number, mu: number, sigma: number) {
  if (x <= 0) return 0;
  return normalCDF(Math.log(x), mu, sigma);
}

// ─── Types ─────────────────────────────────────────────

export type Verdict = [number, string];

export interface Stat {
  id: string;
  label: string;
  unit: string;
  why: string;
  placeholder: string;
  min: number;
  max: number;
  calc: (v: number) => number;
  verdicts: Verdict[];
  sliderExp: number;
  step: number;
  presets: number[];
  color: string;
}

export interface ModelData {
  model: string;
  philosophy: string;
  questions: {
    id: string;
    question: string;
    unit: string;
    why: string;
    estimated_median: number;
    extreme_high: string;
    extreme_low: string;
  }[];
}

// ─── Question configs ──────────────────────────────────
// Each entry maps a question ID to its statistical engine.

interface QuestionConfig {
  placeholder: string;
  min: number;
  max: number;
  step: number;
  sliderExp: number;
  presets: number[];
  calc: (v: number) => number;
  verdicts: Verdict[];
}

const REGISTRY: Record<string, QuestionConfig> = {
  height: {
    placeholder: "175",
    min: 100, max: 230, step: 1, sliderExp: 1,
    presets: [155, 165, 175, 185, 195],
    calc: (v) => normalCDF(v, 170.5, 9.5),
    verdicts: [
      [97, "Tu vois les concerts sans te lever sur la pointe."],
      [80, "Au-dessus de la m\u00eal\u00e9e, litt\u00e9ralement."],
      [45, "Parfaitement ordinaire. Bienvenue."],
      [20, "Compact\u00b7e et efficace."],
      [0, "Le monde est construit pour les autres."],
    ],
  },
  salary: {
    placeholder: "72 000",
    min: 0, max: 2000000, step: 1000, sliderExp: 3,
    presets: [40000, 72000, 100000, 150000, 250000],
    calc: (v) => logNormalCDF(v, 10.85, 0.75),
    verdicts: [
      [99, "Le 1%. Les gens \u00e9crivent des articles sur toi."],
      [85, "Confortable. Tu choisis ton resto."],
      [50, "Pile au milieu. Statistiquement invisible."],
      [25, "En dessous de la m\u00e9diane, au-dessus du seuil."],
      [0, "L\u2019argent c\u2019est un concept de toute fa\u00e7on."],
    ],
  },
  languages: {
    placeholder: "2",
    min: 1, max: 15, step: 1, sliderExp: 1,
    presets: [1, 2, 3, 4, 5],
    calc: (v) => logNormalCDF(v, 0.5, 0.55),
    verdicts: [
      [90, "Polyglotte. Tu penses dans plusieurs langues."],
      [70, "Trilingue. L\u2019Europe est jalouse."],
      [40, "Bilingue. Minimum canadien."],
      [15, "Une seule langue. Assum\u00e9\u00b7e."],
      [0, "M\u00eame ta langue maternelle, c\u2019est approximatif."],
    ],
  },
  books: {
    placeholder: "12",
    min: 0, max: 300, step: 1, sliderExp: 2,
    presets: [2, 5, 12, 24, 52],
    calc: (v) => logNormalCDF(v + 1, 1.6, 1.1),
    verdicts: [
      [95, "Biblioth\u00e8que vivante. Les libraires te connaissent."],
      [65, "Lecteur\u00b7ice s\u00e9rieux\u00b7se. Goodreads est content."],
      [35, "Quelques livres. C\u2019est d\u00e9j\u00e0 plus que la plupart."],
      [10, "Un livre c\u2019est un livre."],
      [0, "Les podcasts comptent pas, d\u00e9sol\u00e9."],
    ],
  },
  coffee: {
    placeholder: "2",
    min: 0, max: 12, step: 1, sliderExp: 1,
    presets: [0, 1, 2, 3, 5],
    calc: (v) => normalCDF(v, 2.2, 1.3),
    verdicts: [
      [90, "Tes veines transportent de l\u2019espresso."],
      [60, "Amateur\u00b7ice s\u00e9rieux\u00b7se. Le barista conna\u00eet ta commande."],
      [35, "Un ou deux. Raisonnable."],
      [10, "Presque rien. Th\u00e9?"],
      [0, "Z\u00e9ro caf\u00e9ine. Suspect."],
    ],
  },
  friends: {
    placeholder: "4",
    min: 0, max: 30, step: 1, sliderExp: 1,
    presets: [1, 3, 5, 8, 12],
    calc: (v) => normalCDF(v, 5, 2.5),
    verdicts: [
      [90, "Populaire pour vrai. Pas juste sur Instagram."],
      [60, "Cercle solide. Qualit\u00e9 sur quantit\u00e9."],
      [35, "Quelques vrais. C\u2019est assez."],
      [10, "Un\u00b7e ou deux. Mais des bon\u00b7nes."],
      [0, "La solitude est sous-estim\u00e9e."],
    ],
  },
  emails: {
    placeholder: "342",
    min: 0, max: 100000, step: 1, sliderExp: 3,
    presets: [0, 50, 500, 5000, 50000],
    calc: (v) => logNormalCDF(v + 1, 5.5, 2.0),
    verdicts: [
      [90, "Inbox zero est un mythe pour toi."],
      [65, "Des centaines. Tu tries par survol."],
      [35, "Quelques dizaines. G\u00e9rable."],
      [10, "Presque propre. Tu lis tes emails."],
      [0, "Z\u00e9ro. Soit organis\u00e9\u00b7e, soit compte neuf."],
    ],
  },
};

// ─── Builder ───────────────────────────────────────────

const PALETTE = [
  "#b5785a", "#b8963e", "#5b7fa5",
  "#6b8f71", "#8b6fa5", "#a56b7f", "#c75b3f",
];

export function buildStats(model: ModelData): Stat[] {
  return model.questions.map((q, i) => {
    const config = REGISTRY[q.id];
    if (!config) {
      throw new Error(`Unknown question ID: "${q.id}". Add it to the registry in questions.ts.`);
    }
    return {
      id: q.id,
      label: q.question,
      unit: q.unit,
      why: q.why,
      placeholder: config.placeholder,
      min: config.min,
      max: config.max,
      calc: config.calc,
      verdicts: config.verdicts,
      sliderExp: config.sliderExp,
      step: config.step,
      presets: config.presets,
      color: PALETTE[i % PALETTE.length],
    };
  });
}

// ─── Helpers (re-exported for page use) ────────────────

export function getVerdict(stat: Stat, pct: number) {
  for (const [threshold, text] of stat.verdicts) {
    if (pct >= threshold) return text;
  }
  return stat.verdicts[stat.verdicts.length - 1][1];
}

export function formatPct(p: number) {
  if (p >= 99.5) return "99+";
  if (p <= 0.5) return "<1";
  return Math.round(p).toString();
}

export function posToValue(pos: number, min: number, max: number, exp: number) {
  return min + (max - min) * Math.pow(pos, exp);
}

export function valueToPos(val: number, min: number, max: number, exp: number) {
  if (max === min) return 0;
  return Math.pow(Math.max(0, Math.min(1, (val - min) / (max - min))), 1 / exp);
}

export function formatDisplay(v: number, step: number = 1): string {
  const rounded = step < 1 ? Math.round(v / step) * step : Math.round(v);
  if (Math.abs(rounded) >= 10000) return Math.round(rounded).toLocaleString("fr-CA");
  if (step < 1) return rounded.toFixed(1);
  return Math.round(rounded).toString();
}

export function fmtPreset(v: number): string {
  if (v >= 1000000) return `${v / 1000000}M`;
  if (v >= 1000) return `${v / 1000}k`;
  return v.toString();
}

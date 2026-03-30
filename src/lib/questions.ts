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
export type InputType = "pills" | "slider" | "freeform";

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
  pills: number[];
  inputType: InputType;
  color: string;
}

export interface Section {
  id: string;
  number: string;
  label: string;
  subtitle: string;
  color: string;
  stats: Stat[];
}

export interface ModelQuestion {
  question: string;
  unit: string;
  why: string;
  estimated_median: number;
  min: number;
  max: number;
  step: number;
  input: InputType;
  options: number[];
  verdicts: {
    high: string;
    above: string;
    average: string;
    below: string;
    low: string;
  };
}

export interface ModelData {
  model: string;
  philosophy: string;
  questions: ModelQuestion[];
}

// ─── Distribution ──────────────────────────────────────

function buildCalc(median: number, min: number, max: number): (v: number) => number {
  const range = max - min;
  const relPos = range > 0 ? (median - min) / range : 0.5;

  if (relPos < 0.3 && median > 0) {
    const mu = Math.log(Math.max(median, 0.01));
    const sigma = Math.max(0.4, Math.min(2.0, Math.log(Math.max(max, median * 3) / Math.max(median, 0.01)) / 2.5));
    return (v: number) => logNormalCDF(Math.max(v, 0.001), mu, sigma);
  }

  const sd = Math.max(range / 6, Math.abs(median) * 0.3, 0.5);
  return (v: number) => normalCDF(v, median, sd);
}

// ─── Slider exponent (kept for visual scaling) ────────

function inferSliderExp(median: number, min: number, max: number, unit: string): number {
  const u = unit.toLowerCase();
  if (u.includes("ratio")) return 2;
  if (u.includes("km") || u.includes("kilomètre")) return 3;
  if (median >= 1000) return 3;
  if (median >= 50) return 2;
  if (median >= 10) return 1.5;
  // Check for heavy right skew
  const range = max - min;
  const relPos = range > 0 ? (median - min) / range : 0.5;
  if (relPos < 0.15) return 2;
  return 1;
}

// ─── Verdicts from explicit object ────────────────────

function verdictsFromObj(v: ModelQuestion["verdicts"]): Verdict[] {
  return [
    [85, v.high],
    [60, v.above],
    [40, v.average],
    [15, v.below],
    [0, v.low],
  ];
}

// ─── Builder ───────────────────────────────────────────

const SECTION_COLORS = [
  "#b5785a", "#5b7fa5", "#8b6fa5",
  "#b8963e", "#6b8f71", "#c75b3f", "#a56b7f",
];

export function buildSections(models: ModelData[]): Section[] {
  return models.map((model, mi) => {
    const color = SECTION_COLORS[mi % SECTION_COLORS.length];
    return {
      id: model.model.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      number: String(mi + 1).padStart(2, "0"),
      label: model.model.toUpperCase(),
      subtitle: model.philosophy,
      color,
      stats: model.questions.map((q, qi) => {
        const { min, max, step } = q;
        const sliderExp = inferSliderExp(q.estimated_median, min, max, q.unit);
        const inputType = q.input;
        const pills = inputType === "pills" ? q.options : [];
        return {
          id: `${mi}-${qi}`,
          label: q.question,
          unit: q.unit,
          why: q.why,
          placeholder: String(q.estimated_median),
          min,
          max,
          step,
          sliderExp,
          inputType,
          pills,
          presets: inputType === "pills" ? [] : q.options,
          calc: buildCalc(q.estimated_median, min, max),
          verdicts: verdictsFromObj(q.verdicts),
          color,
        };
      }),
    };
  });
}

// ─── Helpers ───────────────────────────────────────────

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
  if (step < 1 && step >= 0.01) return rounded.toFixed(2);
  if (step < 1) return rounded.toFixed(1);
  return Math.round(rounded).toString();
}

export function fmtPreset(v: number): string {
  if (v >= 1000000) return `${v / 1000000}M`;
  if (v >= 1000) return `${v / 1000}k`;
  if (v < 1 && v > 0) return v.toFixed(2);
  return v.toString();
}

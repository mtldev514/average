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

export const MODEL_IDS = ["claude-opus-4-6", "gpt-5-4-thinking", "gemini-3-pro"] as const;
export type ModelId = (typeof MODEL_IDS)[number];

// median + verdicts are relative to the model — each AI has its own idea of what's normal.
// min, max, step, input, options are relative to the question — the measurement apparatus is shared.
export interface ModelConfig {
  median: number | null;
  verdicts: {
    high: string;
    above: string;
    average: string;
    below: string;
    low: string;
  } | null;
}

export interface Stat {
  id: string;
  key: string;
  origin: string;
  label: string;
  description: string;
  unit: string;
  why: string;
  placeholder: string;
  min: number;
  max: number;
  calc: (v: number) => number;
  calcs: Record<string, (v: number) => number>;
  verdicts: Verdict[];
  modelVerdicts: Record<string, Verdict[]>;
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

// ─── Evals JSON shape (question skeleton) ─────────────

export interface EvalQuestion {
  key: string;
  origin: string;
  question: string;
  description?: string;
  unit?: string;
  options?: number[];
  why: string;
}

export interface EvalFamily {
  family: string;
  philosophy: string;
  questions: EvalQuestion[];
}

// ─── Per-model file shape ─────────────────────────────

interface ModelFileQuestion {
  median: number | null;
  amplitude?: number | null;
  unit?: string | null;
  min?: number | null;
  max?: number | null;
  step?: number | null;
  input?: InputType | null;
  options?: number[];
  verdicts: {
    high: string;
    above: string;
    average: string;
    below: string;
    low: string;
  } | null;
}

export interface ModelFile {
  model?: string;
  questions: Record<string, ModelFileQuestion>;
  [extra: string]: unknown;
}

// ─── Distribution ──────────────────────────────────────

export function buildCalc(median: number, min: number, max: number): (v: number) => number {
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
  const range = max - min;
  const relPos = range > 0 ? (median - min) / range : 0.5;
  if (relPos < 0.15) return 2;
  return 1;
}

// ─── Verdicts from explicit object ────────────────────

function verdictsFromObj(v: { high: string; above: string; average: string; below: string; low: string }): Verdict[] {
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

/**
 * Build sections from evals skeleton + per-model files.
 * The origin model's config is used for display (slider, pills, etc).
 * All models with a numeric median get a calc function.
 */
export function buildSections(
  evals: EvalFamily[],
  modelFiles: Record<string, ModelFile>,
): Section[] {
  return evals.map((fam, mi) => {
    const color = SECTION_COLORS[mi % SECTION_COLORS.length];
    return {
      id: fam.family.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      number: String(mi + 1).padStart(2, "0"),
      label: fam.family.toUpperCase(),
      subtitle: fam.philosophy,
      color,
      stats: fam.questions.map((q, qi) => {
        const origin = q.origin ?? "";

        // Gather this question's config from each model file
        const perModel: Record<string, ModelFileQuestion> = {};
        for (const [modelId, file] of Object.entries(modelFiles)) {
          const mq = file.questions[q.key];
          if (mq) perModel[modelId] = mq;
        }
        const originData = perModel[origin];

        // Question-level params: unit + options from evals.json, rest from origin model's file
        const unit = q.unit ?? originData?.unit ?? "";
        const min = originData?.min ?? 0;
        const max = originData?.max ?? (originData?.amplitude != null && originData?.median != null
          ? originData.median + originData.amplitude
          : 100);
        const step = originData?.step ?? 1;
        const inputType: InputType = originData?.input ?? "slider";
        const options = q.options ?? originData?.options ?? [];
        const pills = inputType === "pills" ? options : [];

        // Median from origin model
        const median = (typeof originData?.median === "number") ? originData.median : 50;
        const sliderExp = inferSliderExp(median, min, max, unit);

        // Build per-model calculators and verdicts
        const calcs: Record<string, (v: number) => number> = {};
        const modelVerdicts: Record<string, Verdict[]> = {};
        for (const [modelId, mq] of Object.entries(perModel)) {
          if (typeof mq.median === "number") {
            const mMax = mq.max ?? (mq.amplitude != null ? mq.median + mq.amplitude : max);
            const mMin = mq.min ?? min;
            calcs[modelId] = buildCalc(mq.median, mMin, mMax);
          }
          if (mq.verdicts) {
            modelVerdicts[modelId] = verdictsFromObj(mq.verdicts);
          }
        }

        const defaultVerdicts = modelVerdicts[origin] ?? [];

        return {
          id: `${mi}-${qi}`,
          key: q.key,
          origin,
          label: q.question,
          description: q.description ?? "",
          unit,
          why: q.why,
          placeholder: typeof originData?.median === "number" ? String(originData.median) : "",
          min,
          max,
          step,
          sliderExp,
          inputType,
          pills,
          presets: inputType === "pills" ? [] : options,
          calc: calcs[origin] ?? buildCalc(median, min, max),
          calcs,
          verdicts: defaultVerdicts,
          modelVerdicts,
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
  return stat.verdicts[stat.verdicts.length - 1]?.[1] ?? "";
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

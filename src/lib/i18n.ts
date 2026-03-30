import frData from "@/i18n/fr.json";
import enData from "@/i18n/en.json";
import type { Section, Verdict } from "./questions";

// ─── Types ─────────────────────────────────────────────

export interface UIStrings {
  subtitle: string;
  outOf: string;
  aheadOf: string;
  aheadAlmost: string;
  behindAlmost: string;
  middle: string;
  aboveMedian: string;
  average: string;
  belowMost: string;
  clear: string;
  compositeScore: string;
  data: string;
  models: string;
  questions: string;
  approx: string;
  verdictTop: string;
  verdict75: string;
  verdict60: string;
  verdict45: string;
  verdict30: string;
  verdictLow: string;
}

interface QuestionTranslation {
  label: string;
  unit: string;
  why: string;
  verdictHigh: string;
  verdictLow: string;
}

interface ModelTranslation {
  name: string;
  philosophy: string;
  questions: QuestionTranslation[];
}

interface LocaleData {
  ui: UIStrings;
  models: ModelTranslation[];
}

// ─── Locale registry ───────────────────────────────────

export const LOCALES: Record<string, string> = {
  fr: "Fran\u00e7ais",
  en: "English",
  // more added later
};

export type Locale = keyof typeof LOCALES;

export const RTL_LOCALES: string[] = ["ar", "he"];

const LOCALE_DATA: Record<string, LocaleData> = {
  fr: frData as LocaleData,
  en: enData as LocaleData,
};

// ─── Accessors ─────────────────────────────────────────

export function getUI(locale: string): UIStrings {
  return LOCALE_DATA[locale]?.ui ?? LOCALE_DATA.fr.ui;
}

export function getCompositeVerdict(locale: string, avg: number): string {
  const ui = getUI(locale);
  if (avg >= 90) return ui.verdictTop;
  if (avg >= 75) return ui.verdict75;
  if (avg >= 60) return ui.verdict60;
  if (avg >= 45) return ui.verdict45;
  if (avg >= 30) return ui.verdict30;
  return ui.verdictLow;
}

export function getScoreLabel(locale: string, pct: number, formatted: string): string {
  const ui = getUI(locale);
  if (pct >= 99) return ui.aheadAlmost;
  if (pct <= 1) return ui.behindAlmost;
  if (pct >= 45 && pct <= 55) return ui.middle;
  return ui.aheadOf.replace("{n}", formatted);
}

// ─── Section translation ───────────────────────────────

export function translateSections(sections: Section[], locale: string): Section[] {
  const data = LOCALE_DATA[locale];
  if (!data || locale === "fr") return sections;

  return sections.map((section, mi) => {
    const mt = data.models[mi];
    if (!mt) return section;

    const ui = data.ui;

    return {
      ...section,
      label: mt.name.toUpperCase(),
      subtitle: mt.philosophy,
      stats: section.stats.map((stat, qi) => {
        const qt = mt.questions[qi];
        if (!qt) return stat;

        const verdicts: Verdict[] = [
          [85, qt.verdictHigh],
          [60, ui.aboveMedian],
          [40, ui.average],
          [15, ui.belowMost],
          [0, qt.verdictLow],
        ];

        return {
          ...stat,
          label: qt.label,
          unit: qt.unit,
          why: qt.why,
          verdicts,
        };
      }),
    };
  });
}

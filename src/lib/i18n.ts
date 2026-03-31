import frData from "@/i18n/fr.json";
import enData from "@/i18n/en.json";
import esData from "@/i18n/es.json";
import htData from "@/i18n/ht.json";
import hiData from "@/i18n/hi.json";
import arData from "@/i18n/ar.json";
import heData from "@/i18n/he.json";
import zhData from "@/i18n/zh.json";
import jaData from "@/i18n/ja.json";
import iuData from "@/i18n/iu.json";
import ptData from "@/i18n/pt.json";
import type { Section, Verdict } from "./questions";

// ─── Types ─────────────────────────────────────────────

export interface UIStrings {
  subtitle: string;
  concept: string;
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
  whyQuestion: string;
}

interface VerdictTranslation {
  high: string;
  above: string;
  average: string;
  below: string;
  low: string;
}

interface QuestionTranslation {
  label: string;
  description?: string;
  unit: string;
  why: string;
  verdicts: VerdictTranslation;
}

interface ModelTranslation {
  name: string;
  philosophy: string;
  questions: QuestionTranslation[] | Record<string, QuestionTranslation>;
}

interface LocaleData {
  ui: UIStrings;
  models: ModelTranslation[];
}

// ─── Locale registry ───────────────────────────────────

export const LOCALES: Record<string, string> = {
  fr: "Fran\u00e7ais",
  en: "English",
  es: "Espa\u00f1ol",
  ht: "Krey\u00f2l",
  hi: "\u0939\u093f\u0928\u094d\u0926\u0940",
  ar: "\u0627\u0644\u0639\u0631\u0628\u064a\u0629",
  he: "\u05e2\u05d1\u05e8\u05d9\u05ea",
  zh: "\u4e2d\u6587",
  ja: "\u65e5\u672c\u8a9e",
  iu: "\u1403\u14c4\u1483\u144e\u1450\u1466",
  pt: "Portugu\u00eas",
};

export type Locale = keyof typeof LOCALES;

export const RTL_LOCALES: string[] = ["ar", "he"];

const LOCALE_DATA: Record<string, LocaleData> = {
  fr: frData as unknown as LocaleData,
  en: enData as LocaleData,
  es: esData as LocaleData,
  ht: htData as LocaleData,
  hi: hiData as LocaleData,
  ar: arData as LocaleData,
  he: heData as LocaleData,
  zh: zhData as LocaleData,
  ja: jaData as LocaleData,
  iu: iuData as LocaleData,
  pt: ptData as LocaleData,
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

  const ui = data.ui;

  return sections.map((section, mi) => {
    const mt = data.models[mi];
    if (!mt) return section;

    return {
      ...section,
      label: mt.name.toUpperCase(),
      subtitle: mt.philosophy,
      stats: section.stats.map((stat, qi) => {
        const qt = Array.isArray(mt.questions)
          ? mt.questions[qi]
          : mt.questions[stat.key];
        if (!qt) return stat;

        const v = qt.verdicts;
        const verdicts: Verdict[] = [
          [85, v.high],
          [60, v.above],
          [40, v.average],
          [15, v.below],
          [0, v.low],
        ];

        return {
          ...stat,
          label: qt.label,
          description: qt.description ?? stat.description,
          unit: qt.unit,
          why: qt.why,
          verdicts,
        };
      }),
    };
  });
}

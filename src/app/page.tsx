"use client";

import { useState, useEffect, useRef } from "react";

// ─── Statistical helpers ───────────────────────────────

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

// ─── Types ─────────────────────────────────────────────

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

interface Section {
  id: string;
  number: string;
  label: string;
  subtitle: string;
  color: string;
  stats: Stat[];
}

// ─── Data ──────────────────────────────────────────────

const SECTIONS: Section[] = [
  {
    id: "corps",
    number: "01",
    label: "CORPS",
    subtitle: "ce que la g\u00e9n\u00e9tique t\u2019a donn\u00e9",
    color: "#b5785a",
    stats: [
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
        id: "restingHR",
        label: "Fr\u00e9quence cardiaque au repos",
        unit: "bpm",
        placeholder: "68",
        min: 30,
        max: 140,
        calc: (v) => 1 - normalCDF(v, 72, 10),
        ref: "adultes au repos",
        verdicts: [
          [95, "Ton c\u0153ur est en mode \u00e9conomie d\u2019\u00e9nergie."],
          [70, "Calme int\u00e9rieur. Ou m\u00e9ditation. Les deux comptent."],
          [45, "Battement standard. Le c\u0153ur fait son travail."],
          [20, "Un peu rapide. Le stress, probablement."],
          [0, "Ton c\u0153ur court un marathon au repos."],
        ],
      },
      {
        id: "grip",
        label: "Force de grip",
        unit: "kg",
        placeholder: "42",
        min: 5,
        max: 120,
        calc: (v) => normalCDF(v, 40, 12),
        ref: "adultes, mixte",
        verdicts: [
          [95, "Tu ouvres les pots pour tout le voisinage."],
          [70, "Poign\u00e9e de main convaincante. On te fait confiance."],
          [40, "Moyenne. Le pot de cornichons te r\u00e9siste parfois."],
          [15, "Fragile mais fonctionnel\u00b7le."],
          [0, "Les couvercles sont tes ennemis jur\u00e9s."],
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
    ],
  },
  {
    id: "performance",
    number: "02",
    label: "PERFORMANCE",
    subtitle: "ce que t\u2019en fais",
    color: "#6b8f71",
    stats: [
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
        id: "plank",
        label: "Planche",
        unit: "sec",
        placeholder: "60",
        min: 1,
        max: 600,
        calc: (v) => logNormalCDF(v, 3.8, 0.7),
        ref: "adultes actif\u00b7ves",
        verdicts: [
          [95, "Tu pourrais tenir pendant un \u00e9pisode complet."],
          [70, "Solide gainage. Ton physio serait content\u00b7e."],
          [40, "Respectable. \u00c7a tremble un peu mais \u00e7a tient."],
          [15, "30 secondes c\u2019est d\u00e9j\u00e0 quelque chose."],
          [0, "Le sol est confortable, on comprend."],
        ],
      },
      {
        id: "pushups",
        label: "Push-ups d\u2019affil\u00e9e",
        unit: "reps",
        placeholder: "20",
        min: 0,
        max: 200,
        calc: (v) => logNormalCDF(v + 1, 2.7, 0.85),
        ref: "adultes, tous niveaux",
        verdicts: [
          [95, "Tu fais peur aux militaires."],
          [70, "Au-dessus du lot. Les bras suivent."],
          [40, "Quelques-uns. Honn\u00eate."],
          [15, "Le premier est toujours le plus dur."],
          [0, "Le push-up sur les genoux est un vrai push-up."],
        ],
      },
      {
        id: "steps",
        label: "Pas quotidiens",
        unit: "pas / jour",
        placeholder: "8000",
        min: 0,
        max: 40000,
        calc: (v) => normalCDF(v, 7500, 3000),
        ref: "adultes, mondial",
        verdicts: [
          [95, "Tu uses tes souliers en 3 mois."],
          [70, "Actif\u00b7ve. Ton podom\u00e8tre est fier."],
          [40, "Quelques milliers. Le minimum syndical."],
          [15, "S\u00e9dentaire assum\u00e9\u00b7e."],
          [0, "Du lit au frigo, c\u2019est un trajet."],
        ],
      },
    ],
  },
  {
    id: "argent",
    number: "03",
    label: "ARGENT",
    subtitle: "le nerf de la guerre",
    color: "#b8963e",
    stats: [
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
        id: "netWorth",
        label: "Valeur nette",
        unit: "$",
        placeholder: "120 000",
        min: 0,
        max: 50000000,
        calc: (v) => logNormalCDF(v, 11.0, 1.3),
        ref: "adultes 25\u201365",
        verdicts: [
          [95, "Ton comptable a un comptable."],
          [70, "Patrimoine solide. L\u2019avenir te stresse moins."],
          [40, "Quelques actifs. C\u2019est un d\u00e9but."],
          [15, "Plus de dettes que d\u2019actifs. Classique."],
          [0, "La richesse int\u00e9rieure, \u00e7a existe."],
        ],
      },
      {
        id: "savings",
        label: "Taux d\u2019\u00e9pargne",
        unit: "% du revenu",
        placeholder: "15",
        min: 0,
        max: 80,
        calc: (v) => normalCDF(v, 12, 8),
        ref: "m\u00e9nages canadiens",
        verdicts: [
          [90, "Tu te prives pour ton futur toi. Respect."],
          [65, "Au-dessus de la moyenne. Ton REER te remercie."],
          [35, "Quelques pourcents. Mieux que rien."],
          [10, "L\u2019\u00e9pargne est un mythe pour toi."],
          [0, "Tu finances activement l\u2019\u00e9conomie. Merci."],
        ],
      },
      {
        id: "subscriptions",
        label: "Abonnements actifs",
        unit: "abos",
        placeholder: "6",
        min: 0,
        max: 30,
        calc: (v) => normalCDF(v, 6, 3),
        ref: "consommateur\u00b7ices num\u00e9riques",
        verdicts: [
          [90, "Ton relev\u00e9 bancaire est un catalogue."],
          [60, "Quelques services. Tu sais ce que tu paies (peut-\u00eatre)."],
          [30, "Minimaliste num\u00e9rique."],
          [10, "T\u2019as m\u00eame pas Netflix?"],
          [0, "Le piratage ne compte pas comme abonnement."],
        ],
      },
    ],
  },
  {
    id: "cerveau",
    number: "04",
    label: "CERVEAU",
    subtitle: "entre les deux oreilles",
    color: "#5b7fa5",
    stats: [
      {
        id: "iq",
        label: "QI",
        unit: "score",
        placeholder: "105",
        min: 55,
        max: 180,
        calc: (v) => normalCDF(v, 100, 15),
        ref: "\u00e9chelle de Wechsler",
        verdicts: [
          [98, "Mensa t\u2019envoie des lettres. Tu les ignores."],
          [80, "Au-dessus de la moyenne. Tes profs l\u2019avaient remarqu\u00e9."],
          [45, "Normal. Le QI mesure surtout ta capacit\u00e9 \u00e0 faire des tests de QI."],
          [20, "En dessous de la moyenne statistique. \u00c7a veut rien dire."],
          [0, "L\u2019intelligence se mesure pas en un chiffre."],
        ],
      },
      {
        id: "languages",
        label: "Langues parl\u00e9es",
        unit: "langues",
        placeholder: "2",
        min: 1,
        max: 15,
        calc: (v) => logNormalCDF(v, 0.5, 0.55),
        ref: "population mondiale",
        verdicts: [
          [90, "Polyglotte. Tu penses dans plusieurs langues."],
          [70, "Trilingue. L\u2019Europe est jalouse. Ou tu es Europ\u00e9en\u00b7ne."],
          [40, "Bilingue. Minimum canadien."],
          [15, "Une seule langue. Assum\u00e9\u00b7e."],
          [0, "M\u00eame ta langue maternelle, c\u2019est approximatif."],
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
        id: "typing",
        label: "Vitesse de frappe",
        unit: "mots / min",
        placeholder: "55",
        min: 5,
        max: 200,
        calc: (v) => normalCDF(v, 42, 17),
        ref: "utilisateur\u00b7ices de clavier",
        verdicts: [
          [95, "Tes doigts ont un casier judiciaire. Trop rapides."],
          [70, "Efficace. Le clavier souffre mais suit."],
          [40, "Fonctionnel\u00b7le. Tu tapes, \u00e7a avance."],
          [15, "Chasse aux lettres, un doigt \u00e0 la fois."],
          [0, "La dict\u00e9e vocale existe pour une raison."],
        ],
      },
    ],
  },
  {
    id: "habitudes",
    number: "05",
    label: "HABITUDES",
    subtitle: "la routine r\u00e9v\u00e8le tout",
    color: "#8b6fa5",
    stats: [
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
        id: "coffee",
        label: "Caf\u00e9s par jour",
        unit: "caf\u00e9s",
        placeholder: "2",
        min: 0,
        max: 12,
        calc: (v) => normalCDF(v, 2.2, 1.3),
        ref: "buveur\u00b7ses de caf\u00e9",
        verdicts: [
          [90, "Tes veines transportent de l\u2019espresso."],
          [60, "Amateur\u00b7ice s\u00e9rieux\u00b7se. Le barista conna\u00eet ta commande."],
          [35, "Un ou deux. Raisonnable."],
          [10, "Presque rien. Th\u00e9?"],
          [0, "Z\u00e9ro caf\u00e9ine. Suspect."],
        ],
      },
      {
        id: "shower",
        label: "Douche",
        unit: "min",
        placeholder: "8",
        min: 1,
        max: 45,
        calc: (v) => normalCDF(v, 8, 3),
        ref: "dur\u00e9e moyenne",
        verdicts: [
          [90, "L\u2019environnement pleure. Ta facture aussi."],
          [60, "Confortable. Tu r\u00e9fl\u00e9chis l\u00e0-dedans."],
          [35, "Rapide et efficace."],
          [10, "Militaire. Entrer, laver, sortir."],
          [0, "Speed run hygi\u00e9nique."],
        ],
      },
      {
        id: "alarms",
        label: "Alarmes le matin",
        unit: "alarmes",
        placeholder: "3",
        min: 0,
        max: 15,
        calc: (v) => normalCDF(v, 2.5, 1.5),
        ref: "adultes avec un emploi",
        verdicts: [
          [90, "Ton t\u00e9l\u00e9phone est traumatis\u00e9."],
          [60, "Quelques alarmes. Juste au cas."],
          [30, "Une seule. Tu te fais confiance."],
          [10, "Z\u00e9ro alarme. Tu es ton propre r\u00e9veil."],
          [0, "Tu vis hors du temps."],
        ],
      },
    ],
  },
  {
    id: "social",
    number: "06",
    label: "SOCIAL & VIE",
    subtitle: "ton rapport au monde",
    color: "#a56b7f",
    stats: [
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
      {
        id: "friends",
        label: "Ami\u00b7es proches",
        unit: "amis",
        placeholder: "4",
        min: 0,
        max: 30,
        calc: (v) => normalCDF(v, 5, 2.5),
        ref: "adultes, Dunbar",
        verdicts: [
          [90, "Populaire pour vrai. Pas juste sur Instagram."],
          [60, "Cercle solide. Qualit\u00e9 sur quantit\u00e9."],
          [35, "Quelques vrais. C\u2019est assez."],
          [10, "Un\u00b7e ou deux. Mais des bon\u00b7nes."],
          [0, "La solitude est sous-estim\u00e9e."],
        ],
      },
      {
        id: "screenTime",
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
        id: "plants",
        label: "Plantes vivantes chez toi",
        unit: "plantes",
        placeholder: "3",
        min: 0,
        max: 100,
        calc: (v) => logNormalCDF(v + 1, 0.8, 1.0),
        ref: "propri\u00e9taires de plantes",
        verdicts: [
          [90, "Jungle urbaine. Tes plantes ont des noms."],
          [60, "Quelques survivantes. Bravo."],
          [30, "Une ou deux. Accroche-toi (\u00e0 elles)."],
          [10, "Cactus unique. Il r\u00e9siste."],
          [0, "M\u00eame le plastique fane chez toi."],
        ],
      },
    ],
  },
  {
    id: "chaos",
    number: "07",
    label: "CHAOS NUM\u00c9RIQUE",
    subtitle: "l\u2019\u00e9tat de ton \u00e9cosyst\u00e8me digital",
    color: "#c75b3f",
    stats: [
      {
        id: "tabs",
        label: "Onglets ouverts",
        unit: "onglets",
        placeholder: "14",
        min: 1,
        max: 500,
        calc: (v) => logNormalCDF(v, 2.5, 1.0),
        ref: "utilisateur\u00b7ices de navigateur",
        verdicts: [
          [90, "Ton navigateur est un cri de d\u00e9tresse."],
          [60, "Disons \u00aborganis\u00e9\u00b7e dans le chaos.\u00bb"],
          [30, "Peu d\u2019onglets. Discipline rare."],
          [10, "Moins de 5. Psychopathe fonctionnel\u00b7le."],
          [0, "Un seul onglet? Tu existes vraiment?"],
        ],
      },
      {
        id: "emails",
        label: "Courriels non lus",
        unit: "emails",
        placeholder: "342",
        min: 0,
        max: 100000,
        calc: (v) => logNormalCDF(v + 1, 5.5, 2.0),
        ref: "bo\u00eetes de r\u00e9ception",
        verdicts: [
          [90, "Inbox zero est un mythe pour toi."],
          [65, "Des centaines. Tu tries par survol."],
          [35, "Quelques dizaines. G\u00e9rable."],
          [10, "Presque propre. Tu lis tes emails."],
          [0, "Z\u00e9ro. Soit organis\u00e9\u00b7e, soit compte neuf."],
        ],
      },
      {
        id: "passwords",
        label: "Mots de passe m\u00e9moris\u00e9s",
        unit: "mdp",
        placeholder: "8",
        min: 0,
        max: 100,
        calc: (v) => logNormalCDF(v + 1, 2.3, 0.7),
        ref: "internautes",
        verdicts: [
          [90, "Ton cerveau est un gestionnaire de mots de passe."],
          [60, "Quelques-uns. Le reste c\u2019est \u00abmot de passe oubli\u00e9.\u00bb"],
          [30, "Deux ou trois. Maximum."],
          [10, "Un seul. Partout. Oui, c\u2019est dangereux."],
          [0, "Tu cliques \u00abse connecter avec Google\u00bb pour tout."],
        ],
      },
      {
        id: "photos",
        label: "Photos dans le t\u00e9l\u00e9phone",
        unit: "photos",
        placeholder: "3400",
        min: 0,
        max: 200000,
        calc: (v) => logNormalCDF(v + 1, 7.5, 1.2),
        ref: "utilisateur\u00b7ices de smartphone",
        verdicts: [
          [90, "Ton stockage pleure. 3 GB de screenshots."],
          [65, "Photographe compulsif\u00b7ve. Tu captures tout."],
          [35, "Quelques centaines. S\u00e9lectif\u00b7ve."],
          [10, "Tr\u00e8s peu. Tu vis le moment."],
          [0, "Ta galerie est un d\u00e9sert num\u00e9rique."],
        ],
      },
    ],
  },
];

// ─── Utility ───────────────────────────────────────────

function getAllStats(): Stat[] {
  return SECTIONS.flatMap((s) => s.stats);
}

function getVerdict(stat: Stat, pct: number) {
  for (const [threshold, text] of stat.verdicts) {
    if (pct >= threshold) return text;
  }
  return stat.verdicts[stat.verdicts.length - 1][1];
}

function formatPct(p: number) {
  if (p >= 99.5) return "99+";
  if (p <= 0.5) return "<1";
  return Math.round(p).toString();
}

function getSectionForStat(statId: string): Section | undefined {
  return SECTIONS.find((s) => s.stats.some((st) => st.id === statId));
}

// ─── Components ────────────────────────────────────────

function PercentileBar({
  pct,
  animate,
  color = "#1a1a1a",
}: {
  pct: number;
  animate: boolean;
  color?: string;
}) {
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
          background: color,
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
  accentColor,
}: {
  stat: Stat;
  value: string;
  onChange: (v: string) => void;
  result: number | null;
  accentColor: string;
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
    <div className="stat-row">
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 10,
            marginBottom: 4,
            flexWrap: "wrap",
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
            onFocus={(e) => (e.target.style.borderBottomColor = accentColor)}
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
            <PercentileBar pct={pct} animate={animate} color={accentColor} />
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
            &mdash;
          </div>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ section }: { section: Section }) {
  return (
    <div style={{ marginTop: 64, marginBottom: 32 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <span
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 12,
            fontWeight: 600,
            color: section.color,
            letterSpacing: 1,
          }}
        >
          {section.number}
        </span>
        <div
          style={{
            flex: 1,
            height: 1,
            background: `linear-gradient(to right, ${section.color}44, transparent)`,
          }}
        />
      </div>
      <h2
        style={{
          fontFamily: "'DM Serif Display', Georgia, serif",
          fontSize: 32,
          fontWeight: 400,
          color: "#1a1a1a",
          margin: 0,
          letterSpacing: "-0.5px",
        }}
      >
        {section.label}
      </h2>
      <p
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 12,
          color: "#aaa",
          marginTop: 6,
          fontStyle: "italic",
        }}
      >
        {section.subtitle}
      </p>
    </div>
  );
}

function SectionSummaryBar({
  section,
  avg,
}: {
  section: Section;
  avg: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 8,
      }}
    >
      <span
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 11,
          color: "#999",
          width: 140,
          flexShrink: 0,
          textAlign: "right",
        }}
      >
        {section.label}
      </span>
      <div
        style={{
          flex: 1,
          height: 8,
          background: "#e8e4de",
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${avg}%`,
            background: section.color,
            borderRadius: 4,
            transition: "width 1s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        />
      </div>
      <span
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 13,
          fontWeight: 600,
          color: "#1a1a1a",
          width: 32,
          textAlign: "right",
        }}
      >
        {Math.round(avg)}
      </span>
    </div>
  );
}

function Summary({
  results,
}: {
  results: Record<string, number | null>;
}) {
  const allStats = getAllStats();
  const filled = Object.entries(results).filter(
    (entry): entry is [string, number] => entry[1] !== null
  );
  if (filled.length < 3) return null;

  const avg = filled.reduce((s, [, v]) => s + v * 100, 0) / filled.length;

  // Per-section averages
  const sectionAverages = SECTIONS.map((section) => {
    const sectionFilled = filled.filter(([id]) =>
      section.stats.some((s) => s.id === id)
    );
    if (sectionFilled.length === 0) return null;
    const sAvg =
      sectionFilled.reduce((s, [, v]) => s + v * 100, 0) /
      sectionFilled.length;
    return { section, avg: sAvg };
  }).filter((x): x is { section: Section; avg: number } => x !== null);

  let globalVerdict = "";
  if (avg >= 90)
    globalVerdict = "Statistiquement, tu n\u2019existes presque pas.";
  else if (avg >= 75)
    globalVerdict =
      "Au-dessus de la moyenne sur presque tout. Bravo, ou chance.";
  else if (avg >= 60)
    globalVerdict =
      "L\u00e9g\u00e8rement au-dessus. Juste assez pour le mentionner.";
  else if (avg >= 45)
    globalVerdict = "Average. C\u2019est dans le nom.";
  else if (avg >= 30)
    globalVerdict =
      "En dessous sur plusieurs axes. C\u2019est une donn\u00e9e, pas un jugement.";
  else
    globalVerdict =
      "Statistiquement remarquable \u2014 par le bas. \u00c7a reste remarquable.";

  return (
    <div
      style={{
        marginTop: 72,
        paddingTop: 48,
        borderTop: "2px solid #1a1a1a",
        animation: "fadeIn 0.6s ease",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "#aaa",
          fontFamily: "'IBM Plex Mono', monospace",
          letterSpacing: 3,
          marginBottom: 20,
          textAlign: "center",
        }}
      >
        SCORE COMPOSITE &middot; {filled.length} / {allStats.length} DONN&Eacute;ES
      </div>

      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <div
          style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: "clamp(64px, 12vw, 112px)",
            color: "#1a1a1a",
            lineHeight: 1,
            letterSpacing: "-4px",
          }}
        >
          {Math.round(avg)}
        </div>
        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 14,
            color: "#999",
            marginTop: 16,
            fontStyle: "italic",
            maxWidth: 420,
            margin: "16px auto 0",
            lineHeight: 1.6,
          }}
        >
          {globalVerdict}
        </div>
      </div>

      {/* Section breakdown */}
      {sectionAverages.length > 1 && (
        <div style={{ maxWidth: 480, margin: "0 auto 40px" }}>
          {sectionAverages.map(({ section, avg: sAvg }) => (
            <SectionSummaryBar key={section.id} section={section} avg={sAvg} />
          ))}
        </div>
      )}

      {/* Individual stats */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: "6px 16px",
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 12,
          color: "#bbb",
        }}
      >
        {filled.map(([id, val]) => {
          const stat = allStats.find((s) => s.id === id)!;
          const section = getSectionForStat(id);
          return (
            <span key={id}>
              {stat.label}{" "}
              <span style={{ color: section?.color ?? "#1a1a1a", fontWeight: 600 }}>
                {formatPct(Math.round(val * 1000) / 10)}
              </span>
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

  const handleChange = (id: string, val: string) => {
    setValues((prev) => ({ ...prev, [id]: val }));
    const stat = getAllStats().find((s) => s.id === id)!;
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

  const filledCount = Object.values(results).filter((v) => v !== null).length;
  const totalCount = getAllStats().length;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f2ec",
        padding: "60px 24px 120px",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=IBM+Plex+Mono:ital,wght@0,400;0,600;1,400&display=swap');
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        input::placeholder { color: #ccc; }
        ::selection { background: #1a1a1a22; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .stat-row {
          padding: 24px 0;
          border-bottom: 1px solid #e8e4de;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px 32px;
          align-items: start;
        }
        @media (max-width: 640px) {
          .stat-row {
            grid-template-columns: 1fr;
            gap: 16px;
          }
        }
      `}</style>

      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1
            style={{
              fontFamily: "'DM Serif Display', Georgia, serif",
              fontSize: "clamp(52px, 9vw, 80px)",
              fontWeight: 400,
              color: "#1a1a1a",
              lineHeight: 1,
              letterSpacing: "-3px",
            }}
          >
            average.
          </h1>
          <p
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 13,
              color: "#999",
              marginTop: 14,
              lineHeight: 1.7,
              maxWidth: 440,
            }}
          >
            28 mesures. 7 dimensions de ta vie.
            <br />
            On te dit &agrave; quel point tu es normal&middot;e.
          </p>
          {filledCount > 0 && (
            <div
              style={{
                marginTop: 16,
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 11,
                color: "#bbb",
                letterSpacing: 1,
              }}
            >
              {filledCount} / {totalCount} REMPLI{filledCount > 1 ? "S" : ""}
            </div>
          )}
        </div>

        {/* Sections */}
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
                accentColor={section.color}
              />
            ))}
          </div>
        ))}

        <Summary results={results} />

        {/* Footer */}
        <div
          style={{
            marginTop: 72,
            fontSize: 10,
            color: "#ccc",
            fontFamily: "'IBM Plex Mono', monospace",
            letterSpacing: 1.5,
            textAlign: "center",
            lineHeight: 2,
          }}
        >
          DISTRIBUTIONS APPROXIMATIVES &middot; R&Eacute;CR&Eacute;ATIF &middot;
          PAS UN DIAGNOSTIC
          <br />
          28 STATISTIQUES &middot; 7 CAT&Eacute;GORIES &middot; 0 JUGEMENT
        </div>
      </div>
    </div>
  );
}

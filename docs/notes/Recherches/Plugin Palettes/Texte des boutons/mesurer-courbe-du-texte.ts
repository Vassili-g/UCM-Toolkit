/**
 * Mesures de recherche, deuxième tour : le texte des boutons en blanc ou en
 * noir purs, le bouton toujours à la nuance 700, et la courbe du thème
 * recalculée quand le texte des boutons n'a pas la couleur de la page.
 * Aucun fichier produit n'alimente le plugin. Le script écrit
 * MESURES-COURBE-DU-TEXTE.json.
 *
 * Depuis la racine du dépôt :
 * npx tsx "docs/notes/Recherches/Plugin Palettes/Texte des boutons/mesurer-courbe-du-texte.ts"
 */
import { writeFileSync } from 'node:fs';

import {
  atteintLeSeuil,
  boutsDe,
  contraste,
  distanceOk,
  intensitesDe,
  lireHexa,
  prereglageTailwind,
  rampeDe,
  rampesDe,
  ancrageDe,
  recetteParDefaut,
  rgb8VersOklch,
  type Mode,
  type Palette,
  type Recette,
  type Rgb8,
} from '../../../../../packages/couleur/src/index';

const base = recetteParDefaut();
const crans = base.crans;
const rang = (cran: number): number => crans.indexOf(cran);
const fonds: Record<Mode, Rgb8> = { light: lireHexa(base.fonds.light)!, dark: lireHexa(base.fonds.dark)! };
const BLANC: Rgb8 = [255, 255, 255];
const NOIR: Rgb8 = [0, 0, 0];
const { texte: SEUIL_TEXTE, nonTexte: SEUIL_NON_TEXTE } = base.seuils;

const REFERENCES = [
  '#1E6FD9', '#2563EB', '#D94635', '#DC2626', '#EAB308', '#FACC15', '#16A34A',
  '#9333EA', '#06B6D4', '#737373', '#808080', '#8B8178', '#F5F5F5', '#171717',
];

function paletteDe(recette: Recette, reference: string, index: number, intensites: 1 | 2): Palette {
  const derive = prereglageTailwind(rgb8VersOklch(lireHexa(reference)!), boutsDe(recette));
  const rangee = { ...derive, origine: 'tailwind' as const };
  const palette: Palette = { id: `p-${index.toString(16).padStart(8, '0')}`, reference, derive: { lien: true, soft: rangee, vivid: rangee } };
  return intensites === 1 ? { ...palette, intensites: 1 } : palette;
}

/** Les nuances de chaque emploi, du niveau 1 au niveau 4, dans un thème. */
interface Table {
  readonly solid: readonly number[];
  readonly text: readonly number[];
  readonly borderControl: readonly number[];
  readonly surface: readonly number[];
  readonly focus: number;
  readonly card: number;
}

/** La table actuelle : chaque emploi avance d'une nuance par niveau. */
const TABLE_ACTUELLE: Table = {
  solid: [700, 800, 900, 950],
  text: [700, 800, 900, 950],
  borderControl: [600, 700, 800, 900],
  surface: [100, 200, 300, 400],
  focus: 600,
  card: 50,
};

/**
 * Une première table du thème dont le texte des boutons est inversé : le
 * bouton reste à 700 et ses niveaux vont vers la page ; le texte coloré monte
 * d'une nuance, et son quatrième niveau reprend 950, faute de nuance au-delà.
 * Le contour et le focus restent à 600, que le bouton survolé partage.
 */
const TABLE_INVERSEE_TEXTE: Table = { ...TABLE_ACTUELLE, solid: [700, 600, 500, 400], text: [800, 900, 950, 950] };

/**
 * La table retenue pour le thème inversé : le bouton reste à 700 et ses
 * niveaux vont vers la page ; tout ce qui se pose sur la page monte d'une
 * nuance, le texte coloré (800), le contour et le focus (700).
 */
const TABLE_INVERSEE: Table = { ...TABLE_INVERSEE_TEXTE, borderControl: [700, 800, 900, 950], focus: 700 };

/** Les dix-neuf paires, nommées par leur numéro de la spécification. */
function paires(t: Table, texteDuBouton: Rgb8, rampe: readonly Rgb8[], page: Rgb8) {
  // Un membre est une nuance de la rampe, ou une couleur fixe : la page ou le texte des boutons.
  type Membre = number | Rgb8;
  const couleur = (m: Membre): Rgb8 => (typeof m === 'number' ? rampe[rang(m)] : m);
  const p = (numero: number, a: Membre, b: Membre, seuil: number) => ({
    numero,
    ratio: contraste(couleur(a), couleur(b)),
    seuil,
    crans: [a, b].filter((m): m is number => typeof m === 'number'),
  });
  return [
    p(1, t.text[0], page, SEUIL_TEXTE),
    ...[0, 1, 2, 3].map((n) => p([2, 3, 4, 17][n], t.text[n], t.surface[n], SEUIL_TEXTE)),
    ...[0, 1, 2, 3].map((n) => p([5, 6, 7, 18][n], texteDuBouton, t.solid[n], SEUIL_TEXTE)),
    p(8, t.borderControl[0], page, SEUIL_NON_TEXTE),
    ...[0, 1, 2, 3].map((n) => p([9, 10, 11, 19][n], t.borderControl[n], t.surface[n], SEUIL_NON_TEXTE)),
    p(12, t.focus, page, SEUIL_NON_TEXTE),
    p(13, t.focus, t.surface[0], SEUIL_NON_TEXTE),
    p(14, t.solid[1], page, SEUIL_NON_TEXTE),
    p(15, t.text[0], t.card, SEUIL_TEXTE),
    p(16, t.borderControl[0], t.card, SEUIL_NON_TEXTE),
  ];
}

interface Cas {
  readonly nom: string;
  readonly theme: Mode;
  readonly texteDuBouton: Rgb8;
  readonly courbe: readonly number[];
  readonly table: Table;
  /** Vrai quand la garantie 14, le bouton survolé contre la page, n'est pas vérifiée. */
  readonly sans14?: boolean;
}

/**
 * Juge un cas sur les 42 rampes : chaque paire, son pire ratio et ses échecs.
 * Une paire qui touche la nuance où la référence est ancrée ([MOT-17]) se
 * compte à part : son échec tient à l'ancrage, pas à la courbe.
 */
function juger(cas: Cas) {
  const recette: Recette = { ...base, courbes: { ...base.courbes, [cas.theme]: [...cas.courbe] } };
  const parPaire = new Map<number, { tenues: number; mesures: number; minimum: number }>();
  const surLAncre: { reference: string; profil: string; numero: number; ratio: number }[] = [];
  let ecartMin = Infinity;
  let chromaRepos = 0;
  let rampesJugees = 0;
  const page = { repos: [Infinity, 0], survol: [Infinity, 0] };
  REFERENCES.forEach((reference, index) => {
    for (const intensites of [2, 1] as const) {
      const palette = paletteDe(recette, reference, index * 2 + (intensites === 1 ? 1 : 0), intensites);
      const rampes = rampesDe(recette, palette);
      const ancre = ancrageDe(recette, palette);
      for (const profil of intensitesDe(palette)) {
        const rampe = rampeDe(rampes, profil)[cas.theme].map((cran) => cran.couleur);
        rampesJugees += 1;
        for (const { numero, ratio, seuil, crans: membres } of paires(cas.table, cas.texteDuBouton, rampe, fonds[cas.theme])) {
          if (cas.sans14 && numero === 14) continue;
          if (profil === ancre.profil && membres.includes(ancre.crans[cas.theme])) {
            if (!atteintLeSeuil(ratio, seuil)) surLAncre.push({ reference, profil, numero, ratio });
            continue;
          }
          const actuel = parPaire.get(numero) ?? { tenues: 0, mesures: 0, minimum: Infinity };
          actuel.mesures += 1;
          if (atteintLeSeuil(ratio, seuil)) actuel.tenues += 1;
          actuel.minimum = Math.min(actuel.minimum, ratio);
          parPaire.set(numero, actuel);
        }
        const bouton = cas.table.solid.map((cran) => rampe[rang(cran)]);
        ecartMin = Math.min(ecartMin, ...[1, 2, 3].map((n) => distanceOk(bouton[n - 1], bouton[n])));
        chromaRepos += rgb8VersOklch(bouton[0]).C;
        for (const [cle, couleur] of [['repos', bouton[0]], ['survol', bouton[1]]] as const) {
          const ratio = contraste(couleur, fonds[cas.theme]);
          page[cle] = [Math.min(page[cle][0], ratio), Math.max(page[cle][1], ratio)];
        }
      }
    }
  });
  const toutes = [...parPaire.values()];
  const echecs = [...parPaire.entries()].filter(([, v]) => v.tenues < v.mesures).map(([numero, v]) => ({ numero, tenues: v.tenues, mesures: v.mesures, minimum: v.minimum }));
  return {
    nom: cas.nom,
    theme: cas.theme,
    courbe: cas.courbe,
    rampes: rampesJugees,
    tenues: toutes.reduce((s, v) => s + v.tenues, 0),
    mesures: toutes.reduce((s, v) => s + v.mesures, 0),
    echecs,
    surLAncre,
    ecartDesEtatsMin: ecartMin,
    chromaDuBoutonMoyenne: chromaRepos / rampesJugees,
    /** Le bouton au repos et survolé contre la page : plus petit et plus grand ratio. */
    boutonContreLaPage: page,
  };
}

/** Remplace les clartés de quelques nuances dans une courbe. */
const avec = (courbe: readonly number[], valeurs: Record<number, number>) => courbe.map((L, i) => valeurs[crans[i]] ?? L);

const DARK = base.courbes.dark;
const LIGHT = base.courbes.light;

/**
 * La recherche des clartés de 500 à 800 dans le thème inversé : 50 à 400,
 * 900 et 950 restent ceux de la courbe par défaut. On garde la courbe qui
 * tient toutes les paires avec la plus grande marge, puis le plus grand
 * écart entre deux niveaux du bouton.
 */
function chercher(theme: Mode, texteDuBouton: Rgb8, table: Table, sans14 = false) {
  const courbe = theme === 'dark' ? DARK : LIGHT;
  const pas = (de: number, a: number) => Array.from({ length: Math.round((a - de) / 0.01) + 1 }, (_, i) => Math.round((de + i * 0.01) * 1000) / 1000);
  const candidats: { valeurs: Record<number, number>; manquees: number; echecs: string; ecart: number }[] = [];
  const grille = theme === 'dark'
    ? { c500: pas(0.41, 0.5), c600: pas(0.44, 0.56), c700: pas(0.5, 0.6), c800: [0.7, 0.74] }
    : { c500: pas(0.62, 0.74), c600: pas(0.56, 0.7), c700: pas(0.52, 0.62), c800: [0.44, 0.4] };
  for (const c500 of grille.c500) for (const c600 of grille.c600) for (const c700 of grille.c700) for (const c800 of grille.c800) {
    const valeurs = { 500: c500, 600: c600, 700: c700, 800: c800 };
    const L = avec(courbe, valeurs);
    const monotone = L.every((v, i) => i === 0 || (theme === 'dark' ? v > L[i - 1] : v < L[i - 1]));
    if (!monotone) continue;
    const r = juger({ nom: 'recherche', theme, texteDuBouton, courbe: L, table, sans14 });
    candidats.push({
      valeurs,
      manquees: r.mesures - r.tenues,
      echecs: r.echecs.map((e) => `${e.numero}:${e.mesures - e.tenues}`).join(' '),
      ecart: Math.round(r.ecartDesEtatsMin * 1000) / 1000,
    });
  }
  candidats.sort((a, b) => a.manquees - b.manquees || b.ecart - a.ecart);
  return candidats;
}

const cas: Cas[] = [
  { nom: 'Actuel, texte noir pur', theme: 'dark', texteDuBouton: NOIR, courbe: DARK, table: TABLE_ACTUELLE },
  { nom: 'Texte blanc, courbe et table actuelles', theme: 'dark', texteDuBouton: BLANC, courbe: DARK, table: TABLE_ACTUELLE },
  { nom: 'Texte blanc, 700 à 950 recalculées vers le bas, table actuelle', theme: 'dark', texteDuBouton: BLANC, courbe: avec(DARK, { 700: 0.55, 800: 0.48, 900: 0.41, 950: 0.34 }), table: TABLE_ACTUELLE },
  { nom: 'Actuel, texte blanc pur', theme: 'light', texteDuBouton: BLANC, courbe: LIGHT, table: TABLE_ACTUELLE },
  { nom: 'Light, texte blanc pur, texte coloré à 800', theme: 'light', texteDuBouton: BLANC, courbe: LIGHT, table: { ...TABLE_ACTUELLE, text: [800, 900, 950, 950] } },
];

const resultats = cas.map(juger);
const darkTexte = chercher('dark', BLANC, TABLE_INVERSEE_TEXTE);
const lightTexte = chercher('light', NOIR, TABLE_INVERSEE_TEXTE);
const dark = chercher('dark', BLANC, TABLE_INVERSEE);
const light = chercher('light', NOIR, TABLE_INVERSEE);
const darkSans14 = chercher('dark', BLANC, TABLE_INVERSEE, true);
const lightSans14 = chercher('light', NOIR, TABLE_INVERSEE, true);
/**
 * Les courbes retenues, sans garantie 14 : les niveaux du bouton également
 * espacés jusqu'à la 400, qui ne bouge pas ; le texte coloré du thème Dark
 * reste près de sa clarté actuelle (0,67), à 0,70.
 */
const COURBES_RETENUES: Record<Mode, readonly number[]> = {
  dark: avec(DARK, { 500: 0.45, 600: 0.5, 700: 0.55, 800: 0.7 }),
  light: avec(LIGHT, { 500: 0.71, 600: 0.66, 700: 0.58 }),
};
const inverses = [
  juger({ nom: 'Dark, texte blanc, courbe retenue, table inversée, sans 14', theme: 'dark', texteDuBouton: BLANC, courbe: COURBES_RETENUES.dark, table: TABLE_INVERSEE, sans14: true }),
  juger({ nom: 'Dark, texte blanc, courbe retenue, table inversée, avec 14', theme: 'dark', texteDuBouton: BLANC, courbe: COURBES_RETENUES.dark, table: TABLE_INVERSEE }),
  juger({ nom: 'Light, texte noir, courbe retenue, table inversée, sans 14', theme: 'light', texteDuBouton: NOIR, courbe: COURBES_RETENUES.light, table: TABLE_INVERSEE, sans14: true }),
  juger({ nom: 'Light, texte noir, courbe retenue, table inversée, avec 14', theme: 'light', texteDuBouton: NOIR, courbe: COURBES_RETENUES.light, table: TABLE_INVERSEE }),
];

/** La zone où une même couleur grise serait à la fois bouton sous ce texte et texte coloré sur la page. */
function zoneCommune(theme: Mode, texteDuBouton: Rgb8) {
  const lum = (c: Rgb8) => {
    const l = c.map((v) => v / 255).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
  };
  const yT = lum(texteDuBouton);
  const yP = lum(fonds[theme]);
  // Bouton sous le texte : de l'autre côté du texte ; texte coloré sur la page : de l'autre côté de la page.
  const bouton = yT > 0.18 ? [0, (yT + 0.05) / SEUIL_TEXTE - 0.05] : [SEUIL_TEXTE * (yT + 0.05) - 0.05, 1];
  const texte = yP > 0.18 ? [0, (yP + 0.05) / SEUIL_TEXTE - 0.05] : [SEUIL_TEXTE * (yP + 0.05) - 0.05, 1];
  const bas = Math.max(bouton[0], texte[0]);
  const haut = Math.min(bouton[1], texte[1]);
  return {
    theme,
    contrasteTexteContrePage: contraste(texteDuBouton, fonds[theme]),
    boutonClartes: bouton.map((y) => Math.cbrt(Math.max(0, y))),
    texteColoreClartes: texte.map((y) => Math.cbrt(Math.max(0, y))),
    zone: bas < haut ? [Math.cbrt(bas), Math.cbrt(haut)] : null,
  };
}

const zones = [zoneCommune('dark', BLANC), zoneCommune('light', NOIR), zoneCommune('light', BLANC), zoneCommune('dark', NOIR)];

const donnees = {
  protocole: 'Recette par défaut, préréglage Tailwind, quatorze références à une et deux intensités (42 rampes par thème), référence ancrée. Dix-neuf paires par rampe, seuils 4,5 et 3. Texte des boutons en blanc ou noir purs.',
  zones,
  resultats,
  inverses,
  recherche: {
    tableTexteSeul: { dark: darkTexte.slice(0, 10), light: lightTexte.slice(0, 10) },
    avec14: { dark: dark.slice(0, 10), light: light.slice(0, 10) },
    sans14: { dark: darkSans14.slice(0, 10), light: lightSans14.slice(0, 10) },
  },
};
writeFileSync(new URL('./MESURES-COURBE-DU-TEXTE.json', import.meta.url), `${JSON.stringify(donnees, null, 2)}\n`);

const r3 = (x: number) => Math.round(x * 1000) / 1000;
console.log(JSON.stringify(zones.map((z) => ({ ...z, contrasteTexteContrePage: r3(z.contrasteTexteContrePage), boutonClartes: z.boutonClartes.map(r3), texteColoreClartes: z.texteColoreClartes.map(r3), zone: z.zone?.map(r3) ?? null }))));
for (const ligne of [...resultats, ...inverses].map((r) => ({
  nom: r!.nom, theme: r!.theme, tenues: `${r!.tenues}/${r!.mesures}`,
  echecs: r!.echecs.map((e) => `${e.numero}:${e.tenues}/${e.mesures} min ${r3(e.minimum)}`).join(' ; '),
  ancre: r!.surLAncre.map((e) => `${e.reference} ${e.numero} ${r3(e.ratio)}`).join(' ; '),
  ecart: r3(r!.ecartDesEtatsMin), chroma: r3(r!.chromaDuBoutonMoyenne),
  repos: r!.boutonContreLaPage.repos.map(r3).join('-'), survol: r!.boutonContreLaPage.survol.map(r3).join('-'),
}))) console.log(JSON.stringify(ligne));
console.log('dark, texte seul', JSON.stringify(darkTexte.slice(0, 3)));
console.log('light, texte seul', JSON.stringify(lightTexte.slice(0, 3)));
console.log('dark', dark.length, JSON.stringify(dark.slice(0, 5)));
console.log('dark sans 14', JSON.stringify(darkSans14.slice(0, 5)));
console.log('light sans 14', JSON.stringify(lightSans14.slice(0, 5)));
console.log('light', light.length, JSON.stringify(light.slice(0, 5)));

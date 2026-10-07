/**
 * Mesures de recherche : la collection `usage` rangée en dossiers, un dossier
 * par famille de fonds, dont le texte et le contour ne changent pas avec
 * l'état. Seul le fond change d'un état à l'autre. Les dernières mesures
 * rejouent les cas des composants Button et Alert du Playground. Aucun fichier produit
 * n'alimente le plugin. Le script écrit MESURES-DOSSIERS.json.
 *
 * Depuis la racine du dépôt :
 * npx tsx "docs/notes/Recherches/Archi Tokens Multi-marques/Collection usage/mesurer-dossiers.ts"
 */
import { writeFileSync } from 'node:fs';

import {
  ancrageDe,
  atteintLeSeuil,
  boutsDe,
  contraste,
  distanceOk,
  intensitesDe,
  lireHexa,
  prereglageTailwind,
  rampeDe,
  rampesDe,
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
const BLANC: Rgb8 = [255, 255, 255];
const NOIR: Rgb8 = [0, 0, 0];
const { texte: SEUIL_TEXTE, nonTexte: SEUIL_NON_TEXTE } = base.seuils;

/** Les quatorze références de l'étude du texte des boutons, pour comparer les résultats. */
const REFERENCES = [
  '#1E6FD9', '#2563EB', '#D94635', '#DC2626', '#EAB308', '#FACC15', '#16A34A',
  '#9333EA', '#06B6D4', '#737373', '#808080', '#8B8178', '#F5F5F5', '#171717',
];

const avec = (courbe: readonly number[], valeurs: Record<number, number>) => courbe.map((L, i) => valeurs[crans[i]] ?? L);

/** Les courbes du thème inversé que propose le dossier du texte des boutons, section 5.2. */
const COURBE_INVERSEE: Record<Mode, readonly number[]> = {
  dark: avec(base.courbes.dark, { 500: 0.45, 600: 0.5, 700: 0.55, 800: 0.7 }),
  light: avec(base.courbes.light, { 500: 0.745, 600: 0.69, 700: 0.61 }),
};

/** Un thème jugé : sa courbe, le texte des boutons et les nuances de chaque usage. */
interface Theme {
  readonly nom: string;
  readonly mode: Mode;
  readonly inverse: boolean;
  readonly courbe: readonly number[];
  readonly texteDesBoutons: Rgb8;
  /** Le fond plein au repos, survolé, appuyé. */
  readonly plein: readonly number[];
  /** Le texte coloré et le contour posés sur la page ou une carte. */
  readonly texteSurLaPage: number;
  readonly contourSurLaPage: number;
  /** La variante où le texte suit le fond, comme les paires du plugin : un texte par fond teinté 100, 200, 300. */
  readonly texteQuiSuit: readonly number[];
  /** L'anneau `focus`, un cran sous le texte de la page. */
  readonly anneau: number;
}

const THEMES: Theme[] = [
  { nom: 'Light, texte blanc', mode: 'light', inverse: false, courbe: base.courbes.light, texteDesBoutons: BLANC, plein: [700, 800, 900], texteSurLaPage: 700, contourSurLaPage: 600, texteQuiSuit: [700, 800, 900], anneau: 600 },
  { nom: 'Dark, texte noir', mode: 'dark', inverse: false, courbe: base.courbes.dark, texteDesBoutons: NOIR, plein: [700, 800, 900], texteSurLaPage: 700, contourSurLaPage: 600, texteQuiSuit: [700, 800, 900], anneau: 600 },
  { nom: 'Light inversé, texte noir', mode: 'light', inverse: true, courbe: COURBE_INVERSEE.light, texteDesBoutons: NOIR, plein: [700, 600, 500], texteSurLaPage: 800, contourSurLaPage: 700, texteQuiSuit: [800, 900, 950], anneau: 700 },
  { nom: 'Dark inversé, texte blanc', mode: 'dark', inverse: true, courbe: COURBE_INVERSEE.dark, texteDesBoutons: BLANC, plein: [700, 600, 500], texteSurLaPage: 800, contourSurLaPage: 700, texteQuiSuit: [800, 900, 950], anneau: 700 },
];

/** Les fonds teintés au repos, survolé, appuyé ; puis le quatrième que D17 prévoyait, pour comparer. */
const TEINTES = [100, 200, 300];
const QUATRIEME_TEINTE = 400;
const CANDIDATS_TEXTE = [800, 900, 950];
const CANDIDATS_CONTOUR = [700, 800, 900];
const CANDIDATS_ANNEAU = [700, 800, 900, 950];

function paletteDe(recette: Recette, reference: string, index: number, intensites: 1 | 2): Palette {
  const derive = prereglageTailwind(rgb8VersOklch(lireHexa(reference)!), boutsDe(recette));
  const rangee = { ...derive, origine: 'tailwind' as const };
  const palette: Palette = { id: `p-${index.toString(16).padStart(8, '0')}`, reference, derive: { lien: true, soft: rangee, vivid: rangee } };
  return intensites === 1 ? { ...palette, intensites: 1 } : palette;
}

interface Rampe {
  readonly reference: string;
  readonly profil: string;
  readonly couleurs: readonly Rgb8[];
  /** La nuance où les octets exacts de la référence sont posés, ou null. */
  readonly ancre: number | null;
}

function rampesDuTheme(theme: Theme): { rampes: Rampe[]; page: Rgb8; carte: Rgb8 } {
  const recette: Recette = { ...base, courbes: { ...base.courbes, [theme.mode]: [...theme.courbe] } };
  const rampes: Rampe[] = [];
  REFERENCES.forEach((reference, index) => {
    for (const intensites of [2, 1] as const) {
      const palette = paletteDe(recette, reference, index * 2 + (intensites === 1 ? 1 : 0), intensites);
      const toutes = rampesDe(recette, palette);
      const ancre = ancrageDe(recette, palette);
      for (const profil of intensitesDe(palette)) {
        rampes.push({
          reference,
          profil: intensites === 1 ? 'une intensité' : profil,
          couleurs: rampeDe(toutes, profil)[theme.mode].map((cran) => cran.couleur),
          ancre: profil === ancre.profil ? ancre.crans[theme.mode] : null,
        });
      }
    }
  });
  // La carte : blanc en Light, nuance 100 d'un gris en Dark (élévation `raised`, D15).
  const paletteGrise = paletteDe(recette, '#737373', 99, 1);
  const gris = rampesDe(recette, paletteGrise);
  const carte = theme.mode === 'light' ? BLANC : rampeDe(gris, intensitesDe(paletteGrise)[0])[theme.mode][rang(100)].couleur;
  return { rampes, page: lireHexa(base.fonds[theme.mode])!, carte };
}

/** Le pire ratio d'un ensemble de mesures, et les échecs hors nuance ancrée. */
class Bilan {
  minimum = Infinity;
  pire = '';
  mesures = 0;
  echecs = 0;
  surLAncre: string[] = [];
  noter(ratio: number, seuil: number, ou: string, ancre: boolean) {
    if (ancre) {
      if (!atteintLeSeuil(ratio, seuil)) this.surLAncre.push(`${ou} ${ratio.toFixed(2)}`);
      return;
    }
    this.mesures += 1;
    if (!atteintLeSeuil(ratio, seuil)) this.echecs += 1;
    if (ratio < this.minimum) { this.minimum = ratio; this.pire = ou; }
  }
  json() {
    return { minimum: Math.round(this.minimum * 100) / 100, pire: this.pire, tenues: `${this.mesures - this.echecs}/${this.mesures}`, surLAncre: this.surLAncre };
  }
}

function juger(theme: Theme) {
  const { rampes, page, carte } = rampesDuTheme(theme);
  const c = (r: Rampe, cran: number) => r.couleurs[rang(cran)];
  const touche = (r: Rampe, ...membres: number[]) => r.ancre !== null && membres.includes(r.ancre);
  const nom = (r: Rampe) => `${r.reference} ${r.profil}`;

  // Dossier `solid` : le texte des boutons sur les trois fonds.
  const plein = new Bilan();
  let ecartPlein = Infinity;
  // Dossier `surface` : un texte et un contour constants, sur la page, la carte et les trois fonds.
  const texteTeinte = Object.fromEntries(CANDIDATS_TEXTE.map((x) => [x, new Bilan()]));
  const texteTeinte4 = Object.fromEntries(CANDIDATS_TEXTE.map((x) => [x, new Bilan()]));
  const contourTeinte = Object.fromEntries(CANDIDATS_CONTOUR.map((x) => [x, new Bilan()]));
  let ecartTeinte = Infinity;
  // Dossier `page` : texte et contour posés sur la page ou une carte.
  const texteRacine = new Bilan();
  const contourRacine = new Bilan();
  // Le texte du dossier `page`, posé à tort sur un fond teinté : ce que la règle du dossier évite.
  const texteRacineSurTeinte = new Bilan();
  // Le même, fond par fond : un bouton `text` posé dans une alerte au fond 100.
  const texteRacineParTeinte = Object.fromEntries(TEINTES.map((t) => [t, new Bilan()]));
  // Le fond plein au repos, employé comme contour sur la page : le bouton outlined du Playground.
  const contourPlein = new Bilan();
  // L'anneau du Playground : la nuance 100, ou 200 pour primary, de la palette du bouton, sur la page et la carte.
  const anneauPlayground = Object.fromEntries([100, 200].map((x) => [x, new Bilan()]));
  // Un anneau unique : la nuance N d'une palette contre la page, la carte et les fonds teintés de toutes les palettes.
  const anneau = Object.fromEntries(CANDIDATS_ANNEAU.map((x) => [x, new Bilan()]));
  // La variante où le texte suit le fond : chaque texte sur le fond teinté de même rang.
  const texteQuiSuit = new Bilan();
  // L'anneau du thème contre ce qui entoure un composant : la page, la carte, le fond 100 d'un conteneur teinté de toute palette.
  const anneauDuTheme = { page: new Bilan(), fond100: new Bilan(), memePalette100: new Bilan() };
  // Le texte teinté d'une palette sur les fonds teintés d'une autre, par exemple un texte neutre sur une ligne sélectionnée.
  const croise = Object.fromEntries(CANDIDATS_TEXTE.map((x) => [x, new Bilan()]));

  for (const r of rampes) {
    theme.plein.forEach((cran, i) => plein.noter(contraste(theme.texteDesBoutons, c(r, cran)), SEUIL_TEXTE, `${nom(r)} plein ${cran}`, touche(r, cran)));
    for (let i = 1; i < theme.plein.length; i += 1) ecartPlein = Math.min(ecartPlein, distanceOk(c(r, theme.plein[i - 1]), c(r, theme.plein[i])));
    TEINTES.forEach((t, i) => {
      const x = theme.texteQuiSuit[i];
      texteQuiSuit.noter(contraste(c(r, x), c(r, t)), SEUIL_TEXTE, `${nom(r)} ${x} sur ${t}`, touche(r, x, t));
    });
    for (let i = 1; i < TEINTES.length; i += 1) ecartTeinte = Math.min(ecartTeinte, distanceOk(c(r, TEINTES[i - 1]), c(r, TEINTES[i])));

    const fonds: [string, Rgb8, number | null][] = [['page', page, null], ['carte', carte, null], ...TEINTES.map((t): [string, Rgb8, number] => [`fond ${t}`, c(r, t), t])];
    for (const x of CANDIDATS_TEXTE) {
      for (const [ou, fond, cran] of fonds) texteTeinte[x].noter(contraste(c(r, x), fond), SEUIL_TEXTE, `${nom(r)} ${x} sur ${ou}`, touche(r, x, ...(cran === null ? [] : [cran])));
      texteTeinte4[x].noter(contraste(c(r, x), c(r, QUATRIEME_TEINTE)), SEUIL_TEXTE, `${nom(r)} ${x} sur 400`, touche(r, x, QUATRIEME_TEINTE));
    }
    for (const x of CANDIDATS_CONTOUR) {
      for (const [ou, fond, cran] of fonds) contourTeinte[x].noter(contraste(c(r, x), fond), SEUIL_NON_TEXTE, `${nom(r)} ${x} sur ${ou}`, touche(r, x, ...(cran === null ? [] : [cran])));
    }
    for (const [ou, fond] of [['page', page], ['carte', carte]] as const) {
      texteRacine.noter(contraste(c(r, theme.texteSurLaPage), fond), SEUIL_TEXTE, `${nom(r)} sur ${ou}`, touche(r, theme.texteSurLaPage));
      contourRacine.noter(contraste(c(r, theme.contourSurLaPage), fond), SEUIL_NON_TEXTE, `${nom(r)} sur ${ou}`, touche(r, theme.contourSurLaPage));
      contourPlein.noter(contraste(c(r, theme.plein[0]), fond), SEUIL_NON_TEXTE, `${nom(r)} ${theme.plein[0]} sur ${ou}`, touche(r, theme.plein[0]));
      for (const x of [100, 200]) anneauPlayground[x].noter(contraste(c(r, x), fond), SEUIL_NON_TEXTE, `${nom(r)} ${x} sur ${ou}`, false);
    }
    for (const t of TEINTES) {
      const ratio = contraste(c(r, theme.texteSurLaPage), c(r, t));
      texteRacineSurTeinte.noter(ratio, SEUIL_TEXTE, `${nom(r)} sur ${t}`, false);
      texteRacineParTeinte[t].noter(ratio, SEUIL_TEXTE, `${nom(r)} sur ${t}`, false);
    }

    for (const autre of rampes) {
      for (const t of TEINTES) {
        for (const x of CANDIDATS_ANNEAU) anneau[x].noter(contraste(c(r, x), c(autre, t)), SEUIL_NON_TEXTE, `${nom(r)} ${x} sur ${nom(autre)} ${t}`, false);
        for (const x of CANDIDATS_TEXTE) croise[x].noter(contraste(c(r, x), c(autre, t)), SEUIL_TEXTE, `${nom(r)} ${x} sur ${nom(autre)} ${t}`, false);
      }
    }
    for (const [ou, fond] of [['page', page], ['carte', carte]] as const) anneauDuTheme.page.noter(contraste(c(r, theme.anneau), fond), SEUIL_NON_TEXTE, `${nom(r)} sur ${ou}`, false);
    anneauDuTheme.memePalette100.noter(contraste(c(r, theme.anneau), c(r, 100)), SEUIL_NON_TEXTE, `${nom(r)} sur son 100`, touche(r, theme.anneau));
    for (const autre of rampes) anneauDuTheme.fond100.noter(contraste(c(r, theme.anneau), c(autre, 100)), SEUIL_NON_TEXTE, `${nom(r)} sur ${nom(autre)} 100`, false);
    for (const x of CANDIDATS_ANNEAU) for (const [ou, fond] of [['page', page], ['carte', carte]] as const) anneau[x].noter(contraste(c(r, x), fond), SEUIL_NON_TEXTE, `${nom(r)} ${x} sur ${ou}`, false);
  }

  const parCandidat = (b: Record<number, Bilan>) => Object.fromEntries(Object.entries(b).map(([k, v]) => [k, v.json()]));
  return {
    theme: theme.nom,
    rampes: rampes.length,
    nuances: { plein: theme.plein, texteSurLaPage: theme.texteSurLaPage, contourSurLaPage: theme.contourSurLaPage },
    plein: { ...plein.json(), ecartMinEntreEtats: Math.round(ecartPlein * 1000) / 1000 },
    teinte: {
      ecartMinEntreEtats: Math.round(ecartTeinte * 1000) / 1000,
      texteConstant: parCandidat(texteTeinte),
      texteSurLeQuatriemeFond: parCandidat(texteTeinte4),
      contourConstant: parCandidat(contourTeinte),
      texteQuiSuitLeFond: { nuances: theme.texteQuiSuit, ...texteQuiSuit.json() },
    },
    dossierPage: { texte: texteRacine.json(), contour: contourRacine.json(), texteSurUnFondTeinte: texteRacineSurTeinte.json() },
    composantsDuPlayground: {
      texteDeLaPageParFondTeinte: parCandidat(texteRacineParTeinte),
      contourPleinSurLaPage: contourPlein.json(),
      anneauDuPlayground: parCandidat(anneauPlayground),
    },
    anneauUnique: parCandidat(anneau),
    anneauDuTheme: { nuance: theme.anneau, pageEtCarte: anneauDuTheme.page.json(), fondTeinte100DeSaPalette: anneauDuTheme.memePalette100.json(), fondsTeintes100: anneauDuTheme.fond100.json() },
    texteTeinteSurUneAutrePalette: parCandidat(croise),
  };
}

const resultats = THEMES.map(juger);
writeFileSync(new URL('./MESURES-DOSSIERS.json', import.meta.url), `${JSON.stringify({
  protocole: 'Recette par défaut, préréglage Tailwind, quatorze références à une et deux intensités, soit 42 rampes par thème. Référence ancrée ; une mesure qui touche sa nuance se compte à part. Carte : blanc en Light, nuance 100 d\'un gris en Dark. Seuils 4,5 et 3.',
  resultats,
}, null, 2)}\n`);

for (const r of resultats) {
  console.log(`\n${r.theme} (${r.rampes} rampes)`);
  console.log(' plein', JSON.stringify(r.plein));
  console.log(' teinte écart', r.teinte.ecartMinEntreEtats);
  for (const [k, v] of Object.entries(r.teinte.texteConstant)) console.log(`  texte ${k}`, JSON.stringify(v), ' / sur 400', JSON.stringify(r.teinte.texteSurLeQuatriemeFond[k as unknown as number].minimum));
  for (const [k, v] of Object.entries(r.teinte.contourConstant)) console.log(`  contour ${k}`, JSON.stringify(v));
  console.log('  texte qui suit le fond', JSON.stringify(r.teinte.texteQuiSuitLeFond));
  console.log(' page', JSON.stringify(r.dossierPage));
  console.log(' playground', JSON.stringify(r.composantsDuPlayground));
  console.log('  anneau du thème', JSON.stringify(r.anneauDuTheme));
  for (const [k, v] of Object.entries(r.anneauUnique)) console.log(`  anneau ${k}`, JSON.stringify({ ...v, surLAncre: undefined }));
  for (const [k, v] of Object.entries(r.texteTeinteSurUneAutrePalette)) console.log(`  croisé ${k}`, JSON.stringify({ ...v, surLAncre: undefined }));
}

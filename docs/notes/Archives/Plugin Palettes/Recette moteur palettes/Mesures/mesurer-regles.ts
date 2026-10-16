/**
 * Compare des règles candidates pour les deux défauts de la recette du moteur :
 * Soft et Vivid trop proches, et la référence saturée qui ressort de sa rampe.
 *
 * Règles de Soft (sans changement du moteur pour A, D, K75, K65 : seuls les
 * paramètres du format 11 changent) :
 * - A : le format 11 actuel ;
 * - D : Soft part et p0 0,60, Dark b 0,25 (meilleur candidat de `mesurer-profils.ts`) ;
 * - K75, K65 : Soft = Vivid × k, k = 0,75 ou 0,65 : Soft prend l'enveloppe de
 *   Vivid (mêmes a, b, jaunes) et part = p0 = k × 0,95 ;
 * - Z : Soft = Vivid × k(zone), k de 0,50 près de la page à 0,80 loin d'elle
 *   (changement du moteur).
 *
 * Bosse autour de la référence (changement du moteur), appliquée à chaque
 * règle : aucune, σ = 0,07 ou 0,10 de clarté, ou toute la rampe (σ très grand).
 * Les crans voisins du cran ancré se rapprochent de la chroma de la référence,
 * sans la dépasser ni dépasser part × plafond.
 *
 * `npx tsx mesurer-regles.ts` écrit MESURES-REGLES.json et, pour la maquette,
 * `../Maquettes/donnees-regles.js`.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import {
  ecrireHexa, lineaireVersRgb8, lireHexa, normaliserTeinte, oklchVersLineaire, rgb8VersOklch, type Rgb8,
} from '../../../../../../packages/couleur/src/conversions';
import { distanceOk } from '../../../../../../packages/couleur/src/contraste';
import { plafond } from '../../../../../../packages/couleur/src/plafond';
import { boutsDe, courbesParDefaut, estLibre, grilleDe } from '../../../../../../packages/couleur/src/nuances';
import {
  aUneIntensite, ancrageDe, decalageDe, enveloppeDe, fondsSombresDe, intensitesDe, partsDe, pivotDe, rampesDe, referenceDe,
} from '../../../../../../packages/couleur/src/palette';
import { cranVise, facteurSombre, MODES, poidsA, type Cran, type Intensite, type Mode } from '../../../../../../packages/couleur/src/rampe';
import { couleurDeLaCarte, verifierPromesses } from '../../../../../../packages/couleur/src/promesses';
import { aDesProfilsTernes, rangsDesVariables } from '../../../../../../packages/couleur/src/alertes';
import { prereglageTailwind } from '../../../../../../packages/couleur/src/tailwind';
import { recetteParDefaut, type Palette, type ProfilDeRecette, type Recette } from '../../../../../../packages/couleur/src/recette';
import {
  COULEUR_DU_TEXTE_DES_BOUTONS, TABLE_DES_DOSSIERS, VARIABLES_DE_PALETTE, cranDeLaVariable, sensDuTheme,
} from '../../../../../../packages/kit/src/emplois/dossiers';
import { GARANTIES, garantieJugeable } from '../../../../../../packages/kit/src/emplois/garanties';
import { atteintLeSeuil, contraste } from '../../../../../../packages/kit/src/emplois/contraste';

const TAILWIND = JSON.parse(readFileSync(new URL('../../Recette CRITIQUE de qualité/Mesures/references/tailwind-3.4.17.json', import.meta.url), 'utf8')) as Record<string, Record<string, string>>;
const NEUTRES = new Set(['slate', 'gray', 'zinc', 'neutral', 'stone']);
const RAMPES_TAILWIND = Object.entries(TAILWIND).filter(([nom]) => !NEUTRES.has(nom));
const TAILWIND_500 = RAMPES_TAILWIND.map(([nom, crans]) => [nom, crans['500']] as [string, string]);

type Rampes = Partial<Record<Intensite, Record<Mode, Cran[]>>>;
interface Visee { L: number; H: number; part: number; mode: Mode; intensite: Intensite; Lcourbe: number }
type Regle = (v: Visee) => number;
type FabriqueDeRegle = (recette: Recette, palette: Palette) => Regle;

const base = recetteParDefaut();
const idDe = (k: number) => `p-${(k + 1).toString(16).padStart(8, '0')}`;

function paletteTailwind(k: number, reference: string, nom?: string, intensites?: 1): Palette {
  const derive = prereglageTailwind(rgb8VersOklch(lireHexa(reference)!), boutsDe(base));
  return {
    id: idDe(k), reference, ...(nom ? { nom } : {}), ...(intensites ? { intensites } : {}),
    derive: { lien: true, soft: { ...derive, origine: 'tailwind' }, vivid: { ...derive, origine: 'tailwind' } },
  } as Palette;
}

function tour(L: number, C: number, H0: number): { H: number; hexa: string }[] {
  return Array.from({ length: 24 }, (_, k) => {
    const H = (H0 + 15 * k) % 360;
    return { H, hexa: ecrireHexa(lineaireVersRgb8(oklchVersLineaire({ L, C: Math.min(C, plafond(L, H, 'srgb')), H }))) };
  });
}

// ---------------------------------------------------------------- les règles

const VIVID = base.profils.vivid;
const profil = (part: number, p0: number, light: { a: number; b: number; jaunes: number }, dark: { a: number; b: number; jaunes: number }): ProfilDeRecette =>
  ({ part, enveloppe: { p0, light, dark } });
/** Soft = Vivid × k : l'enveloppe de Vivid, part et p0 multipliés par k. Aucun changement du moteur. */
const softRelatif = (k: number) => profil(+(k * VIVID.part).toFixed(4), +(k * VIVID.enveloppe.p0).toFixed(4), { ...VIVID.enveloppe.light }, { ...VIVID.enveloppe.dark });

/** La règle du moteur, telle que `cranVise` l'applique avec l'enveloppe de la recette. */
const regleMoteur: FabriqueDeRegle = (recette) => ({ L, H, part, intensite, mode }) => cranVise(L, H, part, 'srgb', enveloppeDe(recette, intensite, mode)).C;

/** Le poids « loin de la page » d'une clarté de courbe : 0 sur la page, 1 à 0,5 de clarté d'elle. */
const clarteDeLaPage = (recette: Recette, mode: Mode) => recette.courbes[mode][0];
const lisse = (t: number) => { const x = Math.min(1, Math.max(0, t)); return x * x * (3 - 2 * x); };
const loinDeLaPage = (recette: Recette, Lc: number, mode: Mode) => lisse(Math.abs(Lc - clarteDeLaPage(recette, mode)) / 0.5);

/**
 * Z : Soft vaut la chroma que Vivid aurait au même cran, avec la même part
 * relative, multipliée par k(zone). La part relative garde le Color shift et
 * l'atténuation des fonds Dark de Soft.
 */
const regleZones = (kFonds: number, kTextes: number): FabriqueDeRegle => (recette, palette) => {
  const moteur = regleMoteur(recette, palette);
  const parts = partsDe(recette, palette);
  return (v) => {
    if (v.intensite !== 'soft') return moteur(v);
    const partVivid = v.part * ((parts.vivid ?? 0) / (parts.soft || 1));
    const k = kFonds + (kTextes - kFonds) * loinDeLaPage(recette, v.Lcourbe, v.mode);
    return Math.min(v.part / (parts.soft || 1) * (parts.vivid ?? 0) * plafond(v.L, v.H, 'srgb'), k * moteur({ ...v, intensite: 'vivid', part: Math.min(1, partVivid) }));
  };
};

interface RegleDeSoft { id: string; nom: string; resume: string; profils: Recette['profils']; fabrique: FabriqueDeRegle; moteurInchange: boolean }
const REGLES_SOFT: RegleDeSoft[] = [
  { id: 'A', nom: 'Actuel', resume: 'Soft part et p0 0,85, sa propre enveloppe (a 0,6, Dark b 0,38)', profils: base.profils, fabrique: regleMoteur, moteurInchange: true },
  {
    id: 'D', nom: 'Part 0,60', resume: 'Soft part et p0 0,60, Dark b 0,25, sa propre enveloppe',
    profils: { soft: profil(0.6, 0.6, { a: 0.6, b: 0.38, jaunes: 1 }, { a: 1.1, b: 0.25, jaunes: 0 }), vivid: VIVID }, fabrique: regleMoteur, moteurInchange: true,
  },
  { id: 'K75', nom: 'Soft = Vivid × 0,75', resume: "Soft prend l'enveloppe de Vivid, part et p0 0,7125", profils: { soft: softRelatif(0.75), vivid: VIVID }, fabrique: regleMoteur, moteurInchange: true },
  { id: 'K65', nom: 'Soft = Vivid × 0,65', resume: "Soft prend l'enveloppe de Vivid, part et p0 0,6175", profils: { soft: softRelatif(0.65), vivid: VIVID }, fabrique: regleMoteur, moteurInchange: true },
  { id: 'Z', nom: 'Soft par zones', resume: 'Soft = Vivid × 0,50 près de la page, × 0,80 loin d\'elle', profils: { soft: softRelatif(0.65), vivid: VIVID }, fabrique: regleZones(0.5, 0.8), moteurInchange: false },
];

interface Bosse { id: string; nom: string; sigma: number | null }
const BOSSES: Bosse[] = [
  { id: 'B0', nom: 'Aucune', sigma: null },
  { id: 'B07', nom: 'Bosse σ 0,07', sigma: 0.07 },
  { id: 'B10', nom: 'Bosse σ 0,10', sigma: 0.1 },
  { id: 'BG', nom: 'Toute la rampe', sigma: 10 },
];

// ------------------------------------------------------- la chaîne des rampes

const borner = (x: number) => Math.min(1, Math.max(0, x));
const fabriquer = (L: number, C: number, H: number): Cran => {
  const couleur = lineaireVersRgb8(oklchVersLineaire({ L, C, H }));
  const lu = rgb8VersOklch(couleur);
  return { couleur, hexa: ecrireHexa(couleur), L: lu.L, C: lu.C, H: lu.H };
};
const cranExact = (couleur: Rgb8): Cran => { const lu = rgb8VersOklch(couleur); return { couleur, hexa: ecrireHexa(couleur), L: lu.L, C: lu.C, H: lu.H }; };

/**
 * La chaîne de `rampesDe` (courbe, pivot, Color shift, décalage, fonds Dark,
 * ancrage), la chroma donnée par `regle`, puis la bosse autour du cran ancré.
 */
function construire(recette: Recette, palette: Palette, fabrique: FabriqueDeRegle, sigma: number | null, trace?: { regle?: Partial<Record<Intensite, Record<Mode, number[]>>>; plafond?: Partial<Record<Intensite, Record<Mode, number[]>>> }): Rampes {
  const regle = fabrique(recette, palette);
  const { courbes } = grilleDe(recette, palette);
  const bouts = boutsDe(recette);
  const parts = partsDe(recette, palette);
  const sombre = fondsSombresDe(recette);
  const ancrage = ancrageDe(recette, palette);
  const reference = referenceDe(palette);
  const Cref = rgb8VersOklch(reference).C;
  const visees: Partial<Record<Intensite, Record<Mode, { Lc: number; L: number; H: number; part: number; C: number }[]>>> = {};
  for (const intensite of intensitesDe(palette)) {
    const derive = palette.derive[intensite === 'unique' ? 'vivid' : intensite];
    const pivot = pivotDe(recette, palette, intensite);
    const decalage = decalageDe(palette, intensite);
    const partDuProfil = parts[intensite] ?? 0;
    const parMode = (mode: Mode) => courbes[mode].map((Lc) => {
      const poids = poidsA(Lc, pivot, bouts);
      const L = borner(Lc + decalage + (derive.clarte?.[poids.bout] ?? 0) * poids.poids);
      const H = normaliserTeinte(pivot.H + derive[poids.bout] * poids.poids);
      let part = borner(partDuProfil * (1 + (derive.saturation?.[poids.bout] ?? 0) * poids.poids));
      if (mode === 'dark') part *= facteurSombre(Lc, sombre);
      return { Lc, L, H, part, C: regle({ L, H, part, mode, intensite, Lcourbe: Lc }) };
    });
    visees[intensite] = { light: parMode('light'), dark: parMode('dark') };
    if (trace) {
      (trace.regle ??= {})[intensite] = { light: visees[intensite]!.light.map((v) => v.C), dark: visees[intensite]!.dark.map((v) => v.C) };
      (trace.plafond ??= {})[intensite] = { light: visees[intensite]!.light.map((v) => plafond(v.L, v.H, 'srgb')), dark: visees[intensite]!.dark.map((v) => plafond(v.L, v.H, 'srgb')) };
    }
  }
  if (sigma !== null) {
    for (const mode of MODES) {
      const a = ancrage.rangs[mode];
      const porteur = visees[ancrage.profil]![mode];
      const rho = Cref / Math.max(1e-6, porteur[a].C);
      if (rho <= 1) continue;
      for (const intensite of intensitesDe(palette)) {
        visees[intensite]![mode].forEach((v, rang) => {
          if (rang === a) return;
          const w = Math.exp(-0.5 * ((v.Lc - porteur[a].Lc) / sigma) ** 2);
          const visee = v.C * (1 + (rho - 1) * w);
          v.C = Math.max(v.C, Math.min(v.part * plafond(v.L, v.H, 'srgb'), Cref, visee));
        });
      }
    }
  }
  const rampes: Rampes = {};
  for (const intensite of intensitesDe(palette)) {
    const parMode = (mode: Mode) => visees[intensite]![mode].map((v, rang) =>
      (intensite === ancrage.profil && rang === ancrage.rangs[mode] ? cranExact(reference) : fabriquer(v.L, v.C, v.H)));
    rampes[intensite] = { light: parMode('light'), dark: parMode('dark') };
  }
  return rampes;
}

// ------------------------------------------------------------------ mesures

/** Les promesses manquées, jugées comme `verifierPromesses` mais sur des rampes données. */
function manquees(recette: Recette, palette: Palette, rampes: Rampes): Record<string, number> {
  const resultat: Record<string, number> = {};
  if (palette.crans !== undefined) return resultat;
  const fonds = { light: lireHexa(recette.fonds.light)!, dark: lireHexa(recette.fonds.dark)! };
  const cartes = { light: couleurDeLaCarte(recette, 'light'), dark: couleurDeLaCarte(recette, 'dark') };
  for (const mode of MODES) {
    const sens = sensDuTheme(mode, recette.texteDesBoutons[mode]);
    const couleur = (variable: string, intensite: Intensite): Rgb8 => {
      const cible = (TABLE_DES_DOSSIERS[mode][sens] as Record<string, number | 'texteDesBoutons'>)[variable];
      if (cible === 'texteDesBoutons') return lireHexa(COULEUR_DU_TEXTE_DES_BOUTONS[recette.texteDesBoutons[mode]])!;
      return rampes[intensite]![mode][recette.crans.indexOf(cible)].couleur;
    };
    for (const garantie of GARANTIES) {
      if (!garantieJugeable(garantie, recette.crans, mode, sens)) continue;
      for (const intensite of intensitesDe(palette)) {
        const premier = couleur(garantie.premier.variable, intensite);
        for (const fond of garantie.fonds) {
          const second = 'fondDeLaPage' in fond ? fonds[mode] : 'fondDeLaCarte' in fond ? cartes[mode] : couleur(fond.variable, intensite);
          if (!atteintLeSeuil(contraste(premier, second), recette.seuils[garantie.seuil])) resultat[`G${garantie.numero}`] = (resultat[`G${garantie.numero}`] ?? 0) + 1;
        }
      }
    }
  }
  return resultat;
}

/** L'alerte `profils-confondus` du paquet, sur des rampes données : nombre de nuances confondues, alerte à 3. */
function alerteActuelle(recette: Recette, palette: Palette, rampes: Rampes): number {
  if (estLibre(palette) || aUneIntensite(palette) || aDesProfilsTernes(recette, palette)) return 0;
  const visees = new Set(rangsDesVariables(recette).map((rang) => recette.crans[rang]));
  const fonds = fondsSombresDe(recette);
  let n = 0;
  for (const mode of MODES) recette.crans.forEach((cran, rang) => {
    if (!visees.has(cran)) return;
    if (mode === 'dark' && facteurSombre(recette.courbes.dark[rang], fonds) < 1) return;
    if (distanceOk(rampes.soft![mode][rang].couleur, rampes.vivid![mode][rang].couleur) < recette.seuils.profilsConfondus) n += 1;
  });
  return n;
}

/** La chroma sous laquelle aucun réglage ne sépare deux profils d'au moins 0,02 : la nuance n'est pas jugée. */
const CHROMA_JUGEABLE = 0.06;

/**
 * L'alerte proposée : chaque thème juge les seuls crans que ses variables
 * visent, hors fonds Dark atténués, et seulement là où Vivid a au moins 0,06
 * de chroma. Rend le nombre de nuances confondues.
 */
function alerteProposee(recette: Recette, palette: Palette, rampes: Rampes): number {
  if (estLibre(palette) || aUneIntensite(palette) || aDesProfilsTernes(recette, palette)) return 0;
  const fonds = fondsSombresDe(recette);
  let n = 0;
  for (const mode of MODES) {
    const sens = sensDuTheme(mode, recette.texteDesBoutons[mode]);
    const crans = new Set<number>();
    for (const variable of VARIABLES_DE_PALETTE) {
      const cran = cranDeLaVariable(variable, mode, sens);
      if (typeof cran === 'number') crans.add(cran);
    }
    for (const cran of crans) {
      const rang = recette.crans.indexOf(cran);
      if (rang < 0) continue;
      if (mode === 'dark' && facteurSombre(recette.courbes.dark[rang], fonds) < 1) continue;
      const [s, v] = [rampes.soft![mode][rang], rampes.vivid![mode][rang]];
      if (v.C < CHROMA_JUGEABLE) continue;
      if (distanceOk(s.couleur, v.couleur) < recette.seuils.profilsConfondus) n += 1;
    }
  }
  return n;
}

/** La saillie d'une rampe : le plus grand rapport entre la chroma d'un cran et celle du plus vif de ses deux voisins. */
function saillie(rampe: Cran[], rang?: number): number {
  const rangs = rang === undefined ? rampe.map((_, i) => i).slice(1, -1) : [rang];
  let pire = 0;
  for (const i of rangs) {
    const voisins = [rampe[i - 1], rampe[i + 1]].filter(Boolean).map((c) => c.C);
    if (!voisins.length) continue;
    pire = Math.max(pire, rampe[i].C / Math.max(1e-6, Math.max(...voisins)));
  }
  return pire;
}

const mediane = (xs: number[]) => { if (!xs.length) return NaN; const t = [...xs].sort((a, b) => a - b); return t.length % 2 ? t[(t.length - 1) / 2] : (t[t.length / 2 - 1] + t[t.length / 2]) / 2; };
const r3 = (x: number) => (Number.isFinite(x) ? Math.round(x * 1000) / 1000 : null);
const resume = (xs: number[]) => ({ n: xs.length, min: r3(Math.min(...xs)), mediane: r3(mediane(xs)), max: r3(Math.max(...xs)) });

function rampeVoisine(reference: string, nomImpose?: string): Record<string, string> {
  if (nomImpose && TAILWIND[nomImpose]) return TAILWIND[nomImpose];
  const H = rgb8VersOklch(lireHexa(reference)!).H;
  const ecart = (h: number) => Math.abs(((h - H + 540) % 360) - 180);
  return RAMPES_TAILWIND.map(([, crans]) => crans).sort((x, y) => ecart(rgb8VersOklch(lireHexa(x['500'])!).H) - ecart(rgb8VersOklch(lireHexa(y['500'])!).H))[0];
}

// --------------------------------------------------------------------- jeux

const oklchC59735 = rgb8VersOklch(lireHexa('#C59735')!);
interface Jeu { nom: string; palettes: Palette[]; tailwind?: boolean }
const jeuDeTour = (nom: string, L: number, C: number, H0: number): Jeu => ({ nom, palettes: tour(L, C, H0).map((r, k) => paletteTailwind(k, r.hexa, `${Math.round(r.H)}°`)) });
const SATUREES = [['Bleu électrique', '#0013FF'], ['Rose vif', '#FF0076'], ['Jaune vif', '#FFD300'], ['Vert vif', '#00E676'], ['Orange vif', '#FF6D00']] as const;
const JEUX: Jeu[] = [
  { nom: 'Tailwind 500', palettes: TAILWIND_500.map(([nom, hexa], k) => paletteTailwind(k, hexa, nom)), tailwind: true },
  jeuDeTour('Tour #C59735', oklchC59735.L, oklchC59735.C, oklchC59735.H),
  jeuDeTour('Tour vif', 0.6, 0.18, oklchC59735.H),
  jeuDeTour('Tour doux', 0.75, 0.07, oklchC59735.H),
  { nom: 'Références saturées', palettes: SATUREES.map(([nom, hexa], k) => paletteTailwind(k, hexa, nom)) },
  { nom: 'Références saturées, une intensité', palettes: SATUREES.map(([nom, hexa], k) => paletteTailwind(k, hexa, nom, 1)) },
];

const COMBINAISONS = [['blanc', 'blanc'], ['blanc', 'noir'], ['noir', 'blanc'], ['noir', 'noir']] as const;
const avecTexte = (recette: Recette, clair: 'blanc' | 'noir', sombre: 'blanc' | 'noir'): Recette => {
  const texteDesBoutons = { light: clair, dark: sombre } as const;
  return { ...recette, texteDesBoutons, courbes: courbesParDefaut(11, texteDesBoutons) } as Recette;
};

// ------------------------------------------------- contrôle de la chaîne

{
  let ecarts = 0;
  let promesses = 0;
  for (const jeu of JEUX) for (const [clair, sombre] of COMBINAISONS) {
    const recette = avecTexte({ ...base, palettes: jeu.palettes }, clair, sombre);
    for (const palette of recette.palettes) {
      const paquet = rampesDe(recette, palette);
      const banc = construire(recette, palette, regleMoteur, null);
      for (const i of intensitesDe(palette)) for (const m of MODES) paquet[i]![m].forEach((c, r) => { if (c.hexa !== banc[i]![m][r].hexa) ecarts += 1; });
      const attendu = verifierPromesses(recette, palette).filter((p) => p.verdict === 'manquee').length;
      const lu = Object.values(manquees(recette, palette, banc)).reduce((s, x) => s + x, 0);
      if (attendu !== lu) promesses += 1;
    }
  }
  console.log(`Contrôle : ${ecarts} nuance(s) différente(s) du paquet, ${promesses} palette(s) dont les promesses diffèrent.`);
  if (ecarts || promesses) process.exit(1);
}

// --------------------------------------------------------------- mesure

function mesurer(jeu: Jeu, soft: RegleDeSoft, bosse: Bosse) {
  const recette: Recette = { ...base, profils: soft.profils, palettes: jeu.palettes };
  const ratios: Record<Mode, { fonds: number[]; textes: number[]; tous: number[] }> = { light: { fonds: [], textes: [], tous: [] }, dark: { fonds: [], textes: [], tous: [] } };
  let softPlusVif = 0;
  let pireSoftPlusVif = 0;
  const alerteA: number[] = [];
  const alerteP: number[] = [];
  const textes: number[] = [];
  const saillies: number[] = [];
  const sailliesReference: number[] = [];
  const garanties: Record<string, number> = {};
  for (const [clair, sombre] of COMBINAISONS) {
    const r = avecTexte(recette, clair, sombre);
    for (const palette of r.palettes) for (const [g, n] of Object.entries(manquees(r, palette, construire(r, palette, soft.fabrique, bosse.sigma)))) garanties[g] = (garanties[g] ?? 0) + n;
  }
  for (const palette of recette.palettes) {
    const rampes = construire(recette, palette, soft.fabrique, bosse.sigma);
    const ancrage = ancrageDe(recette, palette);
    for (const mode of MODES) {
      const porteur = rampes[ancrage.profil]![mode];
      saillies.push(saillie(porteur));
      sailliesReference.push(saillie(porteur, ancrage.rangs[mode]));
    }
    if (aUneIntensite(palette)) continue;
    alerteA.push(alerteActuelle(recette, palette, rampes));
    alerteP.push(alerteProposee(recette, palette, rampes));
    for (const mode of MODES) recette.crans.forEach((cran, rang) => {
      if (cran < 100 || cran > 900) return;
      const [s, v] = [rampes.soft![mode][rang], rampes.vivid![mode][rang]];
      if (v.C < 0.03 || (ancrage.profil !== 'soft' && rang === ancrage.rangs[mode] && false)) return;
      const rapport = s.C / v.C;
      const zone = loinDeLaPage(recette, recette.courbes[mode][rang], mode) < 0.35 ? 'fonds' : 'textes';
      ratios[mode][zone].push(rapport);
      ratios[mode].tous.push(rapport);
      if (rapport > 1.02) { softPlusVif += 1; pireSoftPlusVif = Math.max(pireSoftPlusVif, rapport); }
    });
    if (rgb8VersOklch(lireHexa(palette.reference)!).C >= 0.04) {
      const tw = rampeVoisine(palette.reference, jeu.tailwind ? palette.nom : undefined);
      for (const mode of MODES) {
        const cran = cranDeLaVariable('surface/foreground', mode, sensDuTheme(mode, recette.texteDesBoutons[mode]));
        if (typeof cran !== 'number' || !tw[String(cran)]) continue;
        textes.push(rampes.soft![mode][recette.crans.indexOf(cran)].C / rgb8VersOklch(lireHexa(tw[String(cran)])!).C);
      }
    }
  }
  const parMode = (m: Mode) => ({ fonds: resume(ratios[m].fonds), textes: resume(ratios[m].textes), tous: resume(ratios[m].tous) });
  return {
    palettes: recette.palettes.length,
    alerteActuelle: alerteA.filter((n) => n >= 3).length,
    alerteProposee: { auMoins2: alerteP.filter((n) => n >= 2).length, auMoins3: alerteP.filter((n) => n >= 3).length },
    deuxIntensites: alerteA.length,
    rapportSoftVivid: { light: parMode('light'), dark: parMode('dark') },
    softPlusVifQueVivid: { nuances: softPlusVif, pire: r3(pireSoftPlusVif) },
    textesSoftContreTailwind: resume(textes),
    saillie: { rampe: resume(saillies), reference: resume(sailliesReference) },
    garanties,
    garantiesTotal: Object.values(garanties).reduce((s, x) => s + x, 0),
  };
}

const resultats: Record<string, Record<string, ReturnType<typeof mesurer>>> = {};
for (const jeu of JEUX) {
  resultats[jeu.nom] = {};
  console.log(`\n== ${jeu.nom} (${jeu.palettes.length})`);
  console.log('règle·bosse | alerte act. | alerte prop. ≥2/≥3 | S/V Light fonds·textes | S/V Dark fonds·textes | S>V | texte S/TW | saillie réf. méd/max | saillie rampe max | G');
  for (const soft of REGLES_SOFT) for (const bosse of BOSSES) {
    if (bosse.id !== 'B0' && !['A', 'K65', 'K75'].includes(soft.id)) continue;
    const m = mesurer(jeu, soft, bosse);
    resultats[jeu.nom][`${soft.id}·${bosse.id}`] = m;
    const rv = m.rapportSoftVivid;
    console.log([
      `${soft.id}·${bosse.id}`.padEnd(8),
      `${m.alerteActuelle}/${m.deuxIntensites}`,
      `${m.alerteProposee.auMoins2}/${m.alerteProposee.auMoins3}`,
      `${rv.light.fonds.mediane}·${rv.light.textes.mediane} [${rv.light.tous.min}-${rv.light.tous.max}]`,
      `${rv.dark.fonds.mediane}·${rv.dark.textes.mediane} [${rv.dark.tous.min}-${rv.dark.tous.max}]`,
      `${m.softPlusVifQueVivid.nuances} (${m.softPlusVifQueVivid.pire})`,
      `${m.textesSoftContreTailwind.mediane}`,
      `${m.saillie.reference.mediane}/${m.saillie.reference.max}`,
      `${m.saillie.rampe.max}`,
      `${m.garantiesTotal} ${JSON.stringify(m.garanties)}`,
    ].join(' | '));
  }
}

// La saillie des rampes publiées de Tailwind, pour comparer.
const fabriqueTW = (crans: Record<string, string>): Cran[] => ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'].map((c) => cranExact(lireHexa(crans[c])!));
const sailliesTW = RAMPES_TAILWIND.map(([nom, crans]) => ({ nom, saillie: r3(saillie(fabriqueTW(crans))) }));
console.log('\nSaillie des rampes Tailwind 3.4 :', resume(sailliesTW.map((s) => s.saillie!)), sailliesTW.filter((s) => s.saillie! > 1.05));

writeFileSync(new URL('./MESURES-REGLES.json', import.meta.url), `${JSON.stringify({
  regles: REGLES_SOFT.map(({ id, nom, resume: r, profils, moteurInchange }) => ({ id, nom, resume: r, profils, moteurInchange })),
  bosses: BOSSES, chromaJugeable: CHROMA_JUGEABLE, resultats, sailliesTailwind: sailliesTW,
}, null, 1)}\n`);

// -------------------------------------------------------- données de la maquette

const EXEMPLES: [string, string][] = [
  ['Bleu', '#3B82F6'], ['Rouge', '#EF4444'], ['Vert', '#22C55E'], ['Ambre', '#F59E0B'], ['Violet', '#8B5CF6'], ['Cyan', '#06B6D4'],
  ['Vert terne', ecrireHexa(lineaireVersRgb8(oklchVersLineaire({ L: oklchC59735.L, C: Math.min(oklchC59735.C, plafond(oklchC59735.L, 135, 'srgb')), H: 135 })))],
  ...SATUREES.map(([n, h]) => [n, h] as [string, string]),
];
const donnees: Record<string, unknown> = { crans: base.crans, fonds: { light: '#F7F7F7', dark: '#0A0A0A' }, cartes: { light: '#FFFFFF', dark: ecrireHexa(couleurDeLaCarte(base, 'dark')) }, regles: {}, bosses: BOSSES.map(({ id, nom, sigma }) => ({ id, nom, sigma })), exemples: [] };
const recetteEx: Recette = { ...base, palettes: EXEMPLES.map(([nom, hexa], k) => paletteTailwind(k, hexa, nom)) };
(donnees.exemples as unknown[]).push(...recetteEx.palettes.map((p) => {
  const a = ancrageDe(recetteEx, p);
  const tw = rampeVoisine(p.reference);
  return { nom: p.nom, reference: p.reference, ancrage: a, tailwind: base.crans.map((c) => tw[String(c)] ?? null) };
}));
for (const soft of REGLES_SOFT) for (const bosse of BOSSES) {
  if (bosse.id !== 'B0' && !['A', 'K65', 'K75'].includes(soft.id)) continue;
  const recette: Recette = { ...recetteEx, profils: soft.profils };
  (donnees.regles as Record<string, unknown>)[`${soft.id}·${bosse.id}`] = recette.palettes.map((p) => {
    const ancrage = ancrageDe(recette, p);
    const trace: { regle?: Partial<Record<Intensite, Record<Mode, number[]>>>; plafond?: Partial<Record<Intensite, Record<Mode, number[]>>> } = {};
    const r = construire(recette, p, soft.fabrique, bosse.sigma, trace);
    const parMode = (i: Intensite) => ({
      light: r[i]!.light.map((c) => c.hexa), dark: r[i]!.dark.map((c) => c.hexa), Clight: r[i]!.light.map((c) => r3(c.C)), Cdark: r[i]!.dark.map((c) => r3(c.C)),
      Llight: r[i]!.light.map((c) => r3(c.L)), Ldark: r[i]!.dark.map((c) => r3(c.L)),
      regleLight: trace.regle![i]!.light.map(r3), regleDark: trace.regle![i]!.dark.map(r3), plafondLight: trace.plafond![i]!.light.map(r3), plafondDark: trace.plafond![i]!.dark.map(r3),
    });
    return { porteur: ancrage.profil, rangs: ancrage.rangs, soft: parMode('soft'), vivid: parMode('vivid'), alerteActuelle: alerteActuelle(recette, p, r), alerteProposee: alerteProposee(recette, p, r) };
  });
}
mkdirSync(new URL('../Maquettes/', import.meta.url), { recursive: true });
writeFileSync(new URL('../Maquettes/donnees-regles.js', import.meta.url), `// Généré par Mesures/mesurer-regles.ts : ne pas modifier à la main.\nwindow.DONNEES_REGLES = ${JSON.stringify(donnees)};\n`);
console.log('\nÉcrit MESURES-REGLES.json et Maquettes/donnees-regles.js');

/**
 * Compare des profils Soft et Vivid candidats sur trois jeux de références :
 * les dix-sept 500 de Tailwind, trois tours de teinte à L et C constants, et
 * la recette du mainteneur. Chaque candidat ne remplace que `profils` de la
 * recette par défaut ; la variante F change aussi le jugement de l'alerte
 * `profils-confondus`.
 *
 * Mesures : alertes `profils-confondus` et palettes aux profils ternes,
 * distance ΔEok et rapport de chroma Soft/Vivid sur les crans 100 à 900,
 * chroma des textes Soft contre la rampe Tailwind voisine, promesses G1 à G7
 * manquées (méthode de `verifier-implementation.ts`).
 *
 * `npx tsx mesurer-profils.ts` écrit MESURES-PROFILS.json.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { ecrireHexa, lireHexa, lineaireVersRgb8, oklchVersLineaire, rgb8VersOklch, type Rgb8 } from '../../../../../../packages/couleur/src/conversions';
import { distanceOk } from '../../../../../../packages/couleur/src/contraste';
import { plafond } from '../../../../../../packages/couleur/src/plafond';
import { boutsDe, courbesParDefaut, estLibre, grilleDe } from '../../../../../../packages/couleur/src/nuances';
import { aUneIntensite, fondsSombresDe, rampesDe } from '../../../../../../packages/couleur/src/palette';
import { facteurSombre, MODES, rampeDe, type Mode } from '../../../../../../packages/couleur/src/rampe';
import { verifierPromesses } from '../../../../../../packages/couleur/src/promesses';
import { aDesProfilsTernes, alertesDePalette, confusionsDe, rangsDesVariables } from '../../../../../../packages/couleur/src/alertes';
import { prereglageTailwind } from '../../../../../../packages/couleur/src/tailwind';
import { recetteParDefaut, type Palette, type ProfilDeRecette, type Recette } from '../../../../../../packages/couleur/src/recette';
import { cranDeLaVariable, sensDuTheme } from '../../../../../../packages/kit/src/emplois/dossiers';
import { RECETTE_REELLE } from '../../Recette CRITIQUE de qualité/Mesures/variantes';

const TAILWIND = JSON.parse(readFileSync(new URL('../../Recette CRITIQUE de qualité/Mesures/references/tailwind-3.4.17.json', import.meta.url), 'utf8')) as Record<string, Record<string, string>>;
const NEUTRES = new Set(['slate', 'gray', 'zinc', 'neutral', 'stone']);
const RAMPES_TAILWIND = Object.entries(TAILWIND).filter(([nom]) => !NEUTRES.has(nom));

const TAILWIND_500: [string, string][] = [
  ['red', '#EF4444'], ['orange', '#F97316'], ['amber', '#F59E0B'], ['yellow', '#EAB308'], ['lime', '#84CC16'], ['green', '#22C55E'],
  ['emerald', '#10B981'], ['teal', '#14B8A6'], ['cyan', '#06B6D4'], ['sky', '#0EA5E9'], ['blue', '#3B82F6'], ['indigo', '#6366F1'],
  ['violet', '#8B5CF6'], ['purple', '#A855F7'], ['fuchsia', '#D946EF'], ['pink', '#EC4899'], ['rose', '#F43F5E'],
];

const idDe = (k: number) => `p-${(k + 1).toString(16).padStart(8, '0')}`;

function paletteTailwind(k: number, reference: string, nom?: string): Palette {
  const derive = prereglageTailwind(rgb8VersOklch(lireHexa(reference)!), boutsDe(recetteParDefaut()));
  return { id: idDe(k), reference, ...(nom ? { nom } : {}), derive: { lien: true, soft: { ...derive, origine: 'tailwind' }, vivid: { ...derive, origine: 'tailwind' } } } as Palette;
}

/** Un tour de teinte tous les 15° à L et C constants, C réduit au plafond du gamut sRGB. */
function tour(L: number, C: number, H0: number): { H: number; hexa: string }[] {
  return Array.from({ length: 24 }, (_, k) => {
    const H = (H0 + 15 * k) % 360;
    return { H, hexa: ecrireHexa(lineaireVersRgb8(oklchVersLineaire({ L, C: Math.min(C, plafond(L, H, 'srgb')), H }))) };
  });
}

const base = recetteParDefaut();
const oklchC59735 = rgb8VersOklch(lireHexa('#C59735')!);

interface Jeu {
  nom: string;
  recette: Recette;
  /** La teinte de chaque palette, pour lire les plages des tours. */
  teintes?: number[];
  /** Vrai pour la recette du mainteneur : ses réglages propres restent, une seule combinaison de texte des boutons. */
  tel?: boolean;
}

const jeuDeTour = (nom: string, L: number, C: number, H0: number): Jeu => {
  const refs = tour(L, C, H0);
  return { nom, recette: { ...base, palettes: refs.map((r, k) => paletteTailwind(k, r.hexa)) }, teintes: refs.map((r) => r.H) };
};

const JEUX: Jeu[] = [
  { nom: 'Tailwind 500', recette: { ...base, palettes: TAILWIND_500.map(([nom, hexa], k) => paletteTailwind(k, hexa, nom)) } },
  jeuDeTour('Tour #C59735 (L 0,703 C 0,125)', oklchC59735.L, oklchC59735.C, oklchC59735.H),
  jeuDeTour('Tour vif (L 0,60 C 0,18)', 0.6, 0.18, oklchC59735.H),
  jeuDeTour('Tour doux (L 0,75 C 0,07)', 0.75, 0.07, oklchC59735.H),
  { nom: 'Recette du mainteneur', recette: RECETTE_REELLE, tel: true },
];

const profil = (part: number, p0: number, darkB: number): ProfilDeRecette => ({
  part,
  enveloppe: { p0, light: { a: 0.6, b: 0.38, jaunes: 1 }, dark: { a: 1.1, b: darkB, jaunes: 0 } },
});

interface Candidat {
  id: string;
  resume: string;
  profils: Recette['profils'];
  /** Crans que l'alerte ne juge pas. */
  exclus: number[];
}

const softAvec = (part: number, darkB: number) => profil(part, part, darkB);
const CANDIDATS: Candidat[] = [
  { id: 'A', resume: 'actuel : Soft 0,85, p0 0,85, Dark b 0,38', profils: base.profils, exclus: [] },
  { id: 'B', resume: 'A, Soft Dark b 0,25', profils: { soft: softAvec(0.85, 0.25), vivid: base.profils.vivid }, exclus: [] },
  { id: 'C', resume: 'Soft part et p0 0,70, Dark b 0,25', profils: { soft: softAvec(0.7, 0.25), vivid: base.profils.vivid }, exclus: [] },
  { id: 'D', resume: 'Soft part et p0 0,60, Dark b 0,25', profils: { soft: softAvec(0.6, 0.25), vivid: base.profils.vivid }, exclus: [] },
  { id: 'E', resume: 'Soft part et p0 0,45, Dark b 0,25', profils: { soft: softAvec(0.45, 0.25), vivid: base.profils.vivid }, exclus: [] },
  { id: 'G', resume: 'Soft part 0,85, p0 0,60, Dark b 0,25 : la part garde la chroma des textes, p0 plafonne les fonds', profils: { soft: profil(0.85, 0.6, 0.25), vivid: base.profils.vivid }, exclus: [] },
  { id: 'H', resume: 'Soft part 0,85, p0 0,45, Dark b 0,25', profils: { soft: profil(0.85, 0.45, 0.25), vivid: base.profils.vivid }, exclus: [] },
  { id: 'F', resume: 'C, l\'alerte ne juge pas les nuances 50 et 950', profils: { soft: softAvec(0.7, 0.25), vivid: base.profils.vivid }, exclus: [50, 950] },
];

/** `profilsConfondus` du paquet, avec des crans exclus du jugement. Sans exclusion, il rend ce que rend `alertesDePalette`. */
function confondus(recette: Recette, palette: Palette, exclus: number[]): { cran: number; mode: Mode; distance: number }[] | null {
  if (estLibre(palette)) return null;
  const visees = new Set(rangsDesVariables(recette).map((rang) => recette.crans[rang]));
  const fonds = fondsSombresDe(recette);
  const attenue = ({ mode, cran }: { mode: Mode; cran: number }) => mode === 'dark' && facteurSombre(recette.courbes.dark[recette.crans.indexOf(cran)], fonds) < 1;
  const crans = confusionsDe(recette, palette).filter((c) => visees.has(c.cran) && !exclus.includes(c.cran) && !attenue(c));
  return crans.length >= 3 ? crans : null;
}

const chroma = (c: Rgb8) => rgb8VersOklch(c).C;
const mediane = (xs: number[]) => { if (!xs.length) return NaN; const t = [...xs].sort((a, b) => a - b); return t.length % 2 ? t[(t.length - 1) / 2] : (t[t.length / 2 - 1] + t[t.length / 2]) / 2; };
const r3 = (x: number) => (Number.isFinite(x) ? Math.round(x * 1000) / 1000 : null);
const resume = (xs: number[]) => ({ n: xs.length, min: r3(Math.min(...xs)), mediane: r3(mediane(xs)), max: r3(Math.max(...xs)) });

/** La rampe Tailwind dont le 500 est le plus proche en teinte de la référence, ou la rampe nommée. */
function rampeVoisine(reference: string, nomImpose?: string): Record<string, string> {
  if (nomImpose && TAILWIND[nomImpose]) return TAILWIND[nomImpose];
  const H = rgb8VersOklch(lireHexa(reference)!).H;
  const ecart = (h: number) => Math.abs(((h - H + 540) % 360) - 180);
  return RAMPES_TAILWIND.map(([, crans]) => crans).sort((x, y) => ecart(rgb8VersOklch(lireHexa(x['500'])!).H) - ecart(rgb8VersOklch(lireHexa(y['500'])!).H))[0];
}

const COMBINAISONS = [['blanc', 'blanc'], ['blanc', 'noir'], ['noir', 'blanc'], ['noir', 'noir']] as const;

function mesurer(jeu: Jeu, candidat: Candidat) {
  const recette: Recette = { ...jeu.recette, profils: candidat.profils };
  const palettes = recette.palettes;
  const enAlerte: string[] = [];
  const ternes: string[] = [];
  const teintesAlerte: number[] = [];
  const teintesTernes: number[] = [];
  const ratios: Record<Mode, number[]> = { light: [], dark: [] };
  const distances: Record<Mode, number[]> = { light: [], dark: [] };
  const minParPalette: Record<Mode, number[]> = { light: [], dark: [] };
  const depassements: { palette: string; mode: Mode; cran: number; rapport: number }[] = [];
  const rapportsTexte: number[] = [];
  const ecartsAlerte: string[] = [];

  palettes.forEach((palette, k) => {
    const nom = palette.nom ?? palette.reference;
    const jugee = confondus(recette, palette, candidat.exclus);
    if (!candidat.exclus.length) {
      const paquet = alertesDePalette(recette, palette).some((a) => a.code === 'profils-confondus');
      if (paquet !== (jugee !== null)) ecartsAlerte.push(nom);
    }
    if (jugee) { enAlerte.push(nom); if (jeu.teintes) teintesAlerte.push(jeu.teintes[k]); }
    if (aDesProfilsTernes(recette, palette)) { ternes.push(nom); if (jeu.teintes) teintesTernes.push(jeu.teintes[k]); }
    if (aUneIntensite(palette)) return;

    const rampes = rampesDe(recette, palette);
    const [soft, vivid] = [rampeDe(rampes, 'soft'), rampeDe(rampes, 'vivid')];
    const { crans } = grilleDe(recette, palette);
    for (const mode of MODES) {
      let minimum = Infinity;
      crans.forEach((cran, rang) => {
        if (cran < 100 || cran > 900) return;
        const d = distanceOk(soft[mode][rang].couleur, vivid[mode][rang].couleur);
        distances[mode].push(d);
        minimum = Math.min(minimum, d);
        const cv = chroma(vivid[mode][rang].couleur);
        if (cv > 0.004) {
          const rapport = chroma(soft[mode][rang].couleur) / cv;
          ratios[mode].push(rapport);
          if (rapport > 1) depassements.push({ palette: nom, mode, cran, rapport: r3(rapport)! });
        }
      });
      minParPalette[mode].push(minimum);
    }

    // Textes Soft : surface/foreground des deux thèmes contre le même numéro de cran Tailwind.
    if (rgb8VersOklch(lireHexa(palette.reference)!).C >= 0.04) {
      const tw = rampeVoisine(palette.reference, jeu.nom === 'Tailwind 500' ? palette.nom : undefined);
      for (const mode of MODES) {
        const cran = cranDeLaVariable('surface/foreground', mode, sensDuTheme(mode, recette.texteDesBoutons[mode]));
        if (typeof cran !== 'number') continue;
        const cible = tw[String(cran)];
        const rang = recette.crans.indexOf(cran);
        if (!cible || rang < 0) continue;
        rapportsTexte.push(chroma(soft[mode][rang].couleur) / chroma(lireHexa(cible)!));
      }
    }
  });

  // Promesses G1 à G7 : les quatre combinaisons du texte des boutons pour les jeux fabriqués, la recette telle quelle sinon.
  const garanties: Record<string, number> = {};
  const variantes = jeu.tel ? [recette] : COMBINAISONS.map(([clair, sombre]) => {
    const texteDesBoutons = { light: clair, dark: sombre } as const;
    return { ...recette, texteDesBoutons, courbes: courbesParDefaut(11, texteDesBoutons) } as Recette;
  });
  for (const r of variantes) for (const palette of r.palettes) for (const promesse of verifierPromesses(r, palette)) {
    if (promesse.verdict === 'manquee') garanties[`G${promesse.garantie.numero}`] = (garanties[`G${promesse.garantie.numero}`] ?? 0) + 1;
  }

  const parTheme = (m: Record<Mode, number[]>) => ({ light: resume(m.light), dark: resume(m.dark) });
  const parCran: Record<string, number> = {};
  for (const d of depassements) parCran[`${d.mode} ${d.cran}`] = (parCran[`${d.mode} ${d.cran}`] ?? 0) + 1;
  return {
    palettes: palettes.length,
    alerte: enAlerte.length,
    enAlerte,
    ternes: ternes.length,
    ternesNoms: ternes,
    teintesAlerte,
    teintesTernes,
    ecartsAvecLePaquet: ecartsAlerte,
    deltaEokSoftVivid: parTheme(distances),
    minimumParPalette: { light: r3(Math.min(...minParPalette.light)), dark: r3(Math.min(...minParPalette.dark)), medianeLight: r3(mediane(minParPalette.light)), medianeDark: r3(mediane(minParPalette.dark)) },
    rapportChromaSoftVivid: parTheme(ratios),
    softAuDessusDeVivid: {
      total: depassements.length,
      dark: depassements.filter((d) => d.mode === 'dark').length,
      parCran,
      maximum: depassements.reduce((m, d) => Math.max(m, d.rapport), 0),
      exemples: depassements.slice(0, 12),
    },
    chromaDesTextesSoftContreTailwind: resume(rapportsTexte),
    garantiesManquees: garanties,
    garantiesTotal: Object.values(garanties).reduce((s, x) => s + x, 0),
  };
}

const plage = (xs: number[]) => {
  if (!xs.length) return '-';
  const t = [...xs].sort((a, b) => a - b);
  const groupes: string[] = [];
  let debut = t[0];
  let fin = t[0];
  const ferme = () => groupes.push(debut === fin ? `${Math.round(debut)}` : `${Math.round(debut)}-${Math.round(fin)}`);
  for (const x of t.slice(1)) {
    if (x - fin <= 15.0001) fin = x;
    else { ferme(); debut = x; fin = x; }
  }
  ferme();
  return `${groupes.join(', ')}°`;
};

const resultats: Record<string, Record<string, ReturnType<typeof mesurer>>> = {};
for (const jeu of JEUX) {
  resultats[jeu.nom] = {};
  console.log(`\n== ${jeu.nom} (${jeu.recette.palettes.length} palettes)`);
  console.log('cand | alerte | ternes | ΔE min L/D | ratio C S/V mediane [min-max] L | idem D | dépasse D | texte S/TW med (min) | G manquées');
  for (const c of CANDIDATS) {
    const m = mesurer(jeu, c);
    resultats[jeu.nom][c.id] = m;
    const r = m.rapportChromaSoftVivid;
    console.log([
      c.id,
      `${m.alerte}/${m.palettes}`,
      m.ternes,
      `${m.minimumParPalette.light}/${m.minimumParPalette.dark}`,
      `${r.light.mediane} [${r.light.min}-${r.light.max}]`,
      `${r.dark.mediane} [${r.dark.min}-${r.dark.max}]`,
      `${m.softAuDessusDeVivid.dark} (max ${m.softAuDessusDeVivid.maximum})`,
      `${m.chromaDesTextesSoftContreTailwind.mediane} (${m.chromaDesTextesSoftContreTailwind.min})`,
      `${m.garantiesTotal} ${JSON.stringify(m.garantiesManquees)}`,
    ].join(' | '));
    if (jeu.teintes) console.log(`     alerte à ${plage(m.teintesAlerte)} ; ternes à ${plage(m.teintesTernes)}`);
    if (m.ecartsAvecLePaquet.length) console.log(`     ÉCART avec alertesDePalette : ${m.ecartsAvecLePaquet.join(', ')}`);
  }
}

writeFileSync(new URL('./MESURES-PROFILS.json', import.meta.url), `${JSON.stringify({ candidats: CANDIDATS, resultats }, null, 1)}\n`);

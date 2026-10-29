/**
 * Les données de la maquette des crans clairs, calculées sur la configuration du mainteneur
 * (`palettes-et-reglages.json`) : les rampes de chaque palette sous huit variantes du bas de la
 * courbe Light, avec ou sans lissage du 400 et du 500.
 *
 * Chaque rampe existe en deux versions des crans clairs. « actuel » est la sortie du moteur.
 * « commune » est une simulation hors du moteur : les crans 50, 100 et 200 prennent la clarté de la
 * courbe, sans le décalage selon la teinte ni le réglage de luminosité de la carte ; le 300 et le 400
 * en prennent les deux tiers et le tiers. La part de chroma de chaque cran est gardée. Le cran
 * d'ancrage de la référence n'est pas touché.
 *
 * La piste du 700 corrigé fonce le 700 d'une rampe commune juste assez pour que le texte 700
 * tienne le seuil textuel sur le 200, part de chroma et teinte gardées. Elle est calculée sur les
 * palettes du mainteneur et sur un balayage de 360 teintes, références ancrées au 500, au 600 et
 * au 700, sous la courbe actuelle.
 *
 * Depuis ce dossier : `npx tsx generer-donnees.ts > ../Maquettes/donnees-crans.js`
 */
import * as M from '../../../../../packages/couleur/src/index';
import type { Palette, Recette } from '../../../../../packages/couleur/src/index';
import brute from './palettes-et-reglages.json';

const validee = M.validerRecette(brute);
if (!('recette' in validee)) throw new Error(`Recette refusée : ${JSON.stringify(validee.refus)}`);
const RECETTE = validee.recette;

const COURBES: Record<string, { nom: string; bas: number[]; milieu?: number[] }> = {
  actuelle: { nom: 'Actuelle', bas: [0.975, 0.95, 0.905, 0.845] },
  actuelle920: { nom: 'Actuelle, 200 à 0,92', bas: [0.975, 0.95, 0.92, 0.845] },
  legere: { nom: 'Légère', bas: [0.98, 0.96, 0.925, 0.875] },
  legereLissee: { nom: 'Légère lissée', bas: [0.98, 0.96, 0.925, 0.875], milieu: [0.79, 0.695] },
  moyenne: { nom: 'Moyenne', bas: [0.983, 0.965, 0.935, 0.89] },
  moyenneLissee: { nom: 'Moyenne lissée', bas: [0.983, 0.965, 0.935, 0.89], milieu: [0.8, 0.7] },
  forte: { nom: 'Forte', bas: [0.986, 0.972, 0.948, 0.91] },
  forteLissee: { nom: 'Forte lissée', bas: [0.986, 0.972, 0.948, 0.91], milieu: [0.815, 0.71] },
};
/** La part de l'écart à la courbe que la version « commune » corrige, par rang du 50 au 400. */
const POIDS_COMMUNS = [1, 1, 1, 2 / 3, 1 / 3];

function recetteAvec(cle: string): Recette {
  const light = [...RECETTE.courbes.light];
  COURBES[cle].bas.forEach((clarte, rang) => { light[rang] = clarte; });
  COURBES[cle].milieu?.forEach((clarte, rang) => { light[4 + rang] = clarte; });
  return { ...RECETTE, courbes: { ...RECETTE.courbes, light } };
}

const hexa = (L: number, C: number, H: number) => M.ecrireHexa(M.lineaireVersRgb8(M.oklchVersLineaire({ L, C, H })));

/** Les crans clairs ramenés à la clarté de la courbe, part de chroma et teinte gardées. */
function cransCommuns(crans: readonly M.Cran[], courbe: readonly number[], rangAncre: number | undefined): string[] {
  const parts = crans.map((c) => { const max = M.plafond(c.L, c.H, RECETTE.gamut); return max > 1e-4 && c.C > 1e-4 ? c.C / max : undefined; });
  const teintes = crans.map((c) => (c.C > 1e-4 ? c.H : undefined));
  for (let rang = crans.length - 2; rang >= 0; rang -= 1) {
    parts[rang] ??= parts[rang + 1];
    teintes[rang] ??= teintes[rang + 1];
  }
  return crans.map((c, rang) => {
    const poids = POIDS_COMMUNS[rang] ?? 0;
    if (!poids || rang === rangAncre) return c.hexa;
    const L = c.L + poids * (courbe[rang] - c.L);
    const H = teintes[rang] ?? 0;
    return hexa(L, (parts[rang] ?? 0) * M.plafond(L, H, RECETTE.gamut), H);
  });
}

const rangDe = (cran: number) => RECETTE.crans.indexOf(cran);
const contrasteHexa = (a: string, b: string) => M.contraste(M.lireHexa(a)!, M.lireHexa(b)!);

/** Le texte foncé par pas de 0,001 de clarté jusqu'au seuil textuel sur `fond` ; `delta` est la clarté retirée. */
function foncerJusquAuSeuil(texte: string, fond: string): { hexa: string; delta: number } {
  const o = M.rgb8VersOklch(M.lireHexa(texte)!);
  const part = o.C / Math.max(M.plafond(o.L, o.H, RECETTE.gamut), 1e-4);
  let L = o.L;
  let resultat = texte;
  while (contrasteHexa(resultat, fond) < RECETTE.seuils.texte && L > 0.3) {
    L -= 0.001;
    resultat = hexa(L, Math.min(1, part) * M.plafond(L, o.H, RECETTE.gamut), o.H);
  }
  return { hexa: resultat, delta: +(o.L - L).toFixed(3) };
}

/** Le 700 corrigé d'une rampe commune ; `surLaReference` quand le 700 porte la référence et ne peut changer. */
function septCentsCorriges(rampe: readonly string[], porteLaReference: boolean) {
  const corrige = foncerJusquAuSeuil(rampe[rangDe(700)], rampe[rangDe(200)]);
  return { ...corrige, surLaReference: porteLaReference && corrige.delta > 0 };
}

/** Une ligne par teinte, niveau de référence et intensité : [niveau, teinte, vivid, contraste avant, delta, sur la référence, 700, 700 corrigé, 200, 100]. */
function balayer() {
  const lignes: (string | number)[][] = [];
  const courbe = RECETTE.courbes.light;
  for (const niveau of [500, 600, 700]) {
    for (let teinte = 0; teinte < 360; teinte += 1) {
      const reference = M.ecrireHexa(M.fabriquerCran(courbe[rangDe(niveau)], teinte, 1, RECETTE.gamut).couleur);
      const derive = M.prereglageTailwind(M.rgb8VersOklch(M.lireHexa(reference)!), M.boutsDe(RECETTE));
      const palette: Palette = { id: `t${teinte}`, reference, derive: { lien: true, soft: { ...derive, origine: 'tailwind' }, vivid: { ...derive, origine: 'tailwind' } } };
      const recette = { ...RECETTE, palettes: [palette] };
      const ancrage = M.ancrageDe(recette, palette);
      for (const [intensite, rampe] of Object.entries(M.rampesDe(recette, palette))) {
        const ancre = intensite === ancrage.profil ? ancrage.rangs.light : undefined;
        const r = cransCommuns(rampe!.light, courbe, ancre);
        const c = septCentsCorriges(r, ancre === rangDe(700));
        lignes.push([niveau, teinte, intensite === 'vivid' ? 1 : 0, +contrasteHexa(r[rangDe(700)], r[rangDe(200)]).toFixed(3), c.delta, c.surLaReference ? 1 : 0,
          r[rangDe(700)], c.hexa, r[rangDe(200)], r[rangDe(100)]]);
      }
    }
  }
  return lignes;
}

function donneesDe(palette: Palette) {
  const lumieres: Record<string, Record<string, Record<string, string[]>>> = {};
  const ancres: Record<string, number> = {};
  const corrections: Record<string, ReturnType<typeof septCentsCorriges>> = {};
  let sombres: Record<string, string[]> = {};
  for (const cle of Object.keys(COURBES)) {
    const recette = recetteAvec(cle);
    const rampes = M.rampesDe(recette, palette);
    const ancrage = M.ancrageDe(recette, palette);
    ancres[cle] = recette.crans[ancrage.rangs.light];
    lumieres[cle] = { actuel: {}, commune: {} };
    for (const [intensite, rampe] of Object.entries(rampes)) {
      lumieres[cle].actuel[intensite] = rampe!.light.map((c) => c.hexa);
      lumieres[cle].commune[intensite] = cransCommuns(rampe!.light, recette.courbes.light, intensite === ancrage.profil ? ancrage.rangs.light : undefined);
      if (cle === 'actuelle') {
        corrections[intensite] = septCentsCorriges(lumieres[cle].commune[intensite], intensite === ancrage.profil && ancrage.rangs.light === rangDe(700));
      }
    }
    if (cle === 'actuelle') sombres = Object.fromEntries(Object.entries(rampes).map(([i, r]) => [i, r!.dark.map((c) => c.hexa)]));
  }
  return {
    nom: palette.nom, reference: palette.reference, reglages: palette.reglages ?? null,
    ancres, light: lumieres, dark: sombres, corrections,
  };
}

const donnees = {
  crans: RECETTE.crans,
  fonds: RECETTE.fonds,
  courbes: COURBES,
  palettes: RECETTE.palettes.map(donneesDe),
  balayage: balayer(),
};

process.stdout.write(`// Généré par Mesures/generer-donnees.ts ; ne pas modifier à la main.\nwindow.CRANS = ${JSON.stringify(donnees)};\n`);

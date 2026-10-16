/** Mesures de recherche sur les rampes du moteur courant ; aucun fichier produit n’alimente le plugin. */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import {
  boutsDe, contraste, ecrireHexa, intensitesDe, lireHexa, prereglageTailwind,
  rampesDe, recetteParDefaut, rgb8VersOklch, verifierPromesses,
  type Palette, type Mode,
} from '../../../../../../packages/couleur/src/index';
import { fabriquerCran, rampeDe } from '../../../../../../packages/couleur/src/rampe';
import { atteintLeSeuil, luminanceRelative } from '../../../../../../packages/kit/src/emplois/contraste';
import { constatsDesEmplois } from '../../../../../../packages/kit/src/lecteurs/diagnostic-emplois.mjs';

const recette = recetteParDefaut();
const references = ['#1E6FD9', '#D94635', '#EAB308', '#16A34A', '#9333EA', '#737373'];
const surfaces = [100, 200, 300, 400];
const textes = [700, 800, 900, 950];
const contours = [600, 700, 800, 900];
const modes: Mode[] = ['light', 'dark'];
const lignes: object[] = [];
const minima = new Map<string, { ratio: number; contexte: string; premier: string; second: string }>();
const tableaux = new Map<string, number[][]>();
let promesses = 0;
let manquees = 0;
const detailsDesManques: object[] = [];

function retenir(cle: string, ratio: number, contexte: string, premier: string, second: string) {
  const precedent = minima.get(cle);
  if (!precedent || ratio < precedent.ratio) minima.set(cle, { ratio, contexte, premier, second });
}

const palettes = references.flatMap((reference, index): Palette[] => {
  const derive = prereglageTailwind(rgb8VersOklch(lireHexa(reference)!), boutsDe(recette));
  const base = {
    id: `recherche-${index}`, reference,
    derive: { lien: true, soft: { ...derive, origine: 'tailwind' as const }, vivid: { ...derive, origine: 'tailwind' as const } },
  };
  return [base, { ...base, id: `${base.id}-unique`, intensites: 1 }];
});

for (const palette of palettes) {
  const rampes = rampesDe(recette, palette);
  const garanties = verifierPromesses(recette, palette);
  promesses += garanties.length;
  manquees += garanties.filter((p) => p.verdict === 'manquee').length;
  detailsDesManques.push(...garanties.filter((p) => p.verdict === 'manquee').map((p) => ({ reference: palette.reference, intensites: palette.intensites ?? 2, paire: p.paire.numero, mode: p.mode, profil: p.profil, ratio: p.contraste, seuil: p.seuil })));
  for (const mode of modes) {
    for (const intensite of intensitesDe(palette)) {
      const rampe = rampeDe(rampes, intensite)[mode];
      const couleur = (cran: number) => rampe[recette.crans.indexOf(cran)].couleur;
      const contexte = `${palette.reference}/${mode}/${intensite}`;
      for (const [famille, premiers, seuil] of [['text', textes, 4.5], ['border-control', contours, 3]] as const) {
        const matrice = premiers.map((premier) => surfaces.map((second) => {
          const a = couleur(premier);
          const b = couleur(second);
          const ratio = contraste(a, b);
          retenir(`${famille}/${premier}/${second}`, ratio, contexte, ecrireHexa(a), ecrireHexa(b));
          lignes.push({ contexte, famille, premier, second, ratio, seuil, tenue: atteintLeSeuil(ratio, seuil) });
          return ratio;
        }));
        tableaux.set(`${contexte}/${famille}`, matrice);
      }
      const fond = lireHexa(recette.fonds[mode])!;
      const neutre50 = fabriquerCran(recette.courbes[mode][0], 0, 0, 'srgb').couleur;
      for (const cran of textes) {
        for (const [nom, premier] of [['fond', fond], ['neutral50', neutre50]] as const) {
          retenir(`on-solid-${nom}/${cran}`, contraste(premier, couleur(cran)), contexte, ecrireHexa(premier), ecrireHexa(couleur(cran)));
        }
      }
    }
  }
}

const croisements = [];
for (const mode of modes) {
  const uniques = palettes.filter((p) => p.intensites === 1).map((palette) => ({ palette, rampe: rampesDe(recette, palette).unique![mode] }));
  for (let rang = 0; rang < 4; rang += 1) {
    let pire = { ratio: Infinity, texte: '', surface: '' };
    let echecs = 0;
    for (const a of uniques) for (const b of uniques) {
      const ratio = contraste(a.rampe[recette.crans.indexOf(textes[rang])].couleur, b.rampe[recette.crans.indexOf(surfaces[rang])].couleur);
      if (ratio < pire.ratio) pire = { ratio, texte: a.palette.reference, surface: b.palette.reference };
      if (!atteintLeSeuil(ratio, 4.5)) echecs += 1;
    }
    croisements.push({ mode, texte: textes[rang], surface: surfaces[rang], couples: 36, echecs, pire });
  }
}

const balayage = modes.flatMap((mode) => [0.45, 0.95].map((part) => {
  const matrice = textes.map((texte) => surfaces.map((surface) => {
    let minimum = Infinity;
    let teinteDuMinimum = 0;
    for (let teinte = 0; teinte < 360; teinte += 1) {
      const a = fabriquerCran(recette.courbes[mode][recette.crans.indexOf(texte)], teinte, part, 'srgb').couleur;
      const b = fabriquerCran(recette.courbes[mode][recette.crans.indexOf(surface)], teinte, part, 'srgb').couleur;
      const ratio = contraste(a, b);
      if (ratio < minimum) { minimum = ratio; teinteDuMinimum = teinte; }
    }
    return { texte, surface, minimum, teinteDuMinimum };
  }));
  return { mode, part, matrice };
}));

const ensembles = textes.map((texte) => surfaces.map((surface) => {
  let borne = Infinity;
  for (const mode of modes) {
    const valeurs = (cran: number) => [0.45, 0.95].flatMap((part) => Array.from({ length: 360 }, (_, teinte) =>
      luminanceRelative(fabriquerCran(recette.courbes[mode][recette.crans.indexOf(cran)], teinte, part, 'srgb').couleur)));
    const a = valeurs(texte);
    const b = valeurs(surface);
    const minimum = mode === 'light'
      ? (Math.min(...b) + 0.05) / (Math.max(...a) + 0.05)
      : (Math.min(...a) + 0.05) / (Math.max(...b) + 0.05);
    borne = Math.min(borne, minimum);
  }
  return { texte, surface, minimum: borne };
}));

const noir = [0, 0, 0] as const;
const gris = [119, 119, 119] as const;
const blanc = [255, 255, 255] as const;
const contreExemple = {
  noirGris: contraste(noir, gris), grisBlanc: contraste(gris, blanc),
  noirSurBlancOpacite40: contraste([153, 153, 153], blanc),
};

const feuille = { $type: 'color', $value: { colorSpace: 'srgb', components: [0.5, 0.5, 0.5], alpha: 1 } };
const alias = (reference: string) => ({ $type: 'color', $value: `{${reference}}` });
const tokens = {
  usage: { primary: { solid: { default: feuille }, 'on-solid': feuille } },
  components: { bouton: { fond: alias('usage.primary.solid.default'), texte: alias('usage.primary.on-solid') } },
};
const contrat = {
  meta: { contractVersion: '14.0' },
  stateModel: { axis: 'state' },
  variantViews: { vue: { paintPlacements: 'placements' } },
  viewPaintPlacements: { placements: { fills: { background: [[]], foreground: [['label']] } } },
  variants: [{ values: { state: 'default' }, view: 'vue', tokens: { background: '{components.bouton.fond}', foreground: '{components.bouton.texte}' } }],
};
const sondeDuDiagnostic = { ratio: 1, constats: constatsDesEmplois(contrat, tokens) };

const fichiersDuMoteur = ['packages/couleur/src/', 'packages/kit/src/emplois/', 'packages/kit/src/lecteurs/', 'packages/kit/dist/emplois/'].flatMap((dossier) =>
  readdirSync(new URL(`../../../../../../${dossier}`, import.meta.url)).filter((nom) => /\.(ts|mjs|js)$/.test(nom)).map((nom) => `${dossier}${nom}`));
const empreintesSources = Object.fromEntries(fichiersDuMoteur.map((chemin) => [chemin,
  createHash('sha256').update(readFileSync(new URL(`../../../../../../${chemin}`, import.meta.url))).digest('hex')]));

const resultat = {
  perimetre: { references, recette, palettes, nombreDeContextes: tableaux.size / 2, mesuresDeMatrice: lignes.length, promesses, manquees },
  minima: Object.fromEntries(minima), croisements, balayage, ensembles, contreExemple, detailsDesManques, sondeDuDiagnostic, empreintesSources,
  exemple: Object.fromEntries([...tableaux].filter(([cle]) => cle.startsWith('#1E6FD9/') && cle.includes('/unique/'))),
};
writeFileSync(new URL('./resultats-mesures.json', import.meta.url), `${JSON.stringify(resultat, null, 2)}\n`);
console.log(JSON.stringify({ ...resultat.perimetre, recette: undefined, palettes: undefined, detailsDesManques, sondeDuDiagnostic }, null, 2));

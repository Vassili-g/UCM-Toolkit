/**
 * Génère `PLANCHE-DU-MOTEUR.html`, la page qui montre les rampes du moteur à côté de celles de
 * Tailwind 3.4. La page est autonome : ses données y sont écrites, elle ne charge aucune
 * ressource. `genererPlanche` est pure ; seul le lancement direct du script écrit le fichier.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  COULEUR_DU_TEXTE_DES_BOUTONS,
  CRANS,
  MODES,
  PROFILS,
  cranDeLaVariable,
  sensDuTheme,
  type ModeDuTheme,
  type TexteDesBoutons,
  type VariableDePalette,
} from '@ucm-kit/core/referentiel';

import {
  ancrageDe,
  boutsDe,
  couleurDeLaCarte,
  ecrireHexa,
  lireHexa,
  prereglageTailwind,
  rampeDe,
  rampesDe,
  recetteAvecTexteDesBoutons,
  recetteParDefaut,
  rgb8VersOklch,
  type Palette,
  type Recette,
} from '../src/index';

const dossier = path.dirname(fileURLToPath(import.meta.url));
const FAMILLES_GRISES = ['slate', 'gray', 'zinc', 'neutral', 'stone'];
const TEXTES_DU_DARK: readonly TexteDesBoutons[] = ['noir', 'blanc'];

/** Les variables que les composants de la page lisent dans la table des rôles. */
const ROLES_DES_COMPOSANTS: readonly VariableDePalette[] = [
  'solid/default',
  'surface/default',
  'surface/foreground',
  'page/foreground',
  'page/divider',
  'ring',
];

type Rampe = readonly string[];

interface Famille {
  readonly nom: string;
  readonly reference: string;
  readonly tailwind: Rampe;
}

/** Les familles chromatiques du relevé, dans son ordre, avec leur rampe en hexa majuscules. */
function famillesDeTailwind(): Famille[] {
  const releve: Record<string, Record<string, string>> = JSON.parse(readFileSync(path.join(dossier, 'tailwind-3.4.17.json'), 'utf8'));
  return Object.entries(releve)
    .filter(([nom]) => !FAMILLES_GRISES.includes(nom))
    .map(([nom, crans]) => {
      const tailwind = CRANS.map((cran) => crans[String(cran)].toUpperCase());
      return { nom, reference: crans['500'].toUpperCase(), tailwind };
    });
}

/** Une palette au préréglage Tailwind, sa couleur 500 pour référence, les deux profils liés. */
function paletteDeLaFamille(recette: Recette, famille: Famille, rang: number): Palette {
  const derive = prereglageTailwind(rgb8VersOklch(lireHexa(famille.reference)!), boutsDe(recette));
  return {
    id: `p-${rang.toString(16).padStart(8, '0')}`,
    nom: famille.nom,
    reference: famille.reference,
    derive: { lien: true, soft: { ...derive, origine: 'tailwind' }, vivid: { ...derive, origine: 'tailwind' } },
  };
}

/**
 * Tailwind n'a pas de thème Dark : chaque cran prend la nuance de sa rampe dont la clarté est la
 * plus proche de la courbe Dark de la recette à ce cran.
 */
function tailwindEnDark(tailwind: Rampe, courbeDark: readonly number[]): Rampe {
  const clartes = tailwind.map((hexa) => rgb8VersOklch(lireHexa(hexa)!).L);
  return courbeDark.map((cible) => {
    let proche = 0;
    clartes.forEach((clarte, rang) => {
      if (Math.abs(clarte - cible) < Math.abs(clartes[proche] - cible)) proche = rang;
    });
    return tailwind[proche];
  });
}

/** La recette par défaut, avec le texte des boutons du Dark demandé. */
function recetteAuTexte(texte: TexteDesBoutons): Recette {
  const depart = recetteParDefaut();
  const resultat = recetteAvecTexteDesBoutons(depart, 'dark', texte);
  if ('refus' in resultat) throw new Error(`La courbe Dark refuse le texte ${texte} : ${resultat.refus}.`);
  return resultat.recette;
}

const enHexa = (rampe: readonly { readonly hexa: string }[]): string[] => rampe.map(({ hexa }) => hexa);

/** Tout ce que la page affiche pour un texte des boutons du Dark. */
function jeuDeDonnees(texte: TexteDesBoutons, familles: readonly Famille[]) {
  const recette = recetteAuTexte(texte);
  const palettes = familles.map((famille, rang) => paletteDeLaFamille(recette, famille, rang));
  const rampes = palettes.map((palette) => rampesDe(recette, palette));

  const roles = {} as Record<ModeDuTheme, Record<string, number | string>>;
  for (const mode of MODES) {
    const sens = sensDuTheme(mode, recette.texteDesBoutons[mode]);
    roles[mode] = Object.fromEntries(ROLES_DES_COMPOSANTS.map((variable) => [variable, cranDeLaVariable(variable, mode, sens)!]));
  }

  return {
    pages: { light: recette.fonds.light, dark: recette.fonds.dark },
    cartes: { light: ecrireHexa(couleurDeLaCarte(recette, 'light')), dark: ecrireHexa(couleurDeLaCarte(recette, 'dark')) },
    texteDesBoutons: {
      light: COULEUR_DU_TEXTE_DES_BOUTONS[recette.texteDesBoutons.light],
      dark: COULEUR_DU_TEXTE_DES_BOUTONS[recette.texteDesBoutons.dark],
    },
    roles,
    tailwind: {
      light: familles.map((famille) => famille.tailwind),
      dark: familles.map((famille) => tailwindEnDark(famille.tailwind, recette.courbes.dark)),
    },
    moteur: Object.fromEntries(
      PROFILS.map((profil) => [
        profil,
        Object.fromEntries(MODES.map((mode) => [mode, rampes.map((rampesDeLaFamille) => enHexa(rampeDe(rampesDeLaFamille, profil)[mode]))])),
      ]),
    ),
    ancrages: palettes.map((palette) => {
      const { profil, rangs } = ancrageDe(recette, palette);
      return { profil, rangs };
    }),
  };
}

/** La page complète, octet pour octet : mêmes entrées, même texte. */
export function genererPlanche(): string {
  const familles = famillesDeTailwind();
  const donnees = {
    crans: CRANS,
    familles: familles.map(({ nom, reference }) => ({ nom, reference })),
    jeux: Object.fromEntries(TEXTES_DU_DARK.map((texte) => [texte, jeuDeDonnees(texte, familles)])),
  };
  const css = readFileSync(path.join(dossier, 'page.css'), 'utf8').trim();
  const script = readFileSync(path.join(dossier, 'page.js'), 'utf8').trim().replace('DONNEES', () => JSON.stringify(donnees));
  return `<!doctype html>
<html lang="fr" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>La planche du moteur</title>
<style>
${css}
</style>
</head>
<body>
<main>
<h1>La planche du moteur</h1>
<div class="commandes">
  <div class="groupe">Profil<div class="bascule" id="commande-profil"></div></div>
  <div class="groupe">Thème<div class="bascule" id="commande-theme"></div></div>
  <div class="groupe">Texte des boutons du Dark<div class="bascule" id="commande-texte"></div></div>
</div>
<h2>Tailwind 3.4 et le moteur</h2>
<p>Chaque ligne est une famille de Tailwind 3.4 : à gauche sa rampe, à droite celle que le moteur fabrique avec sa couleur 500 pour référence ; en Dark, chaque cran de Tailwind est la nuance de sa rampe la plus proche de la courbe Dark du moteur.</p>
<div class="grille" id="grille"></div>
</main>
<script>
${script}
</script>
</body>
</html>
`;
}

/** Le chemin du fichier commité, lu par le test. */
export const CHEMIN_DE_LA_PLANCHE = path.join(dossier, 'PLANCHE-DU-MOTEUR.html');

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  writeFileSync(CHEMIN_DE_LA_PLANCHE, genererPlanche());
  console.log(`Planche écrite : ${CHEMIN_DE_LA_PLANCHE}`);
}

/**
 * Mesures de recherche : la couleur du texte des boutons (`on-solid`) et les
 * nuances du bouton (`solid`), par thème, selon cinq modèles. Aucun fichier
 * produit n'alimente le plugin. Le script écrit MESURES-POLARITES.json et
 * remplace le bloc de données de MAQUETTE-MODES-ET-AFFICHAGE.html, qui ne
 * calcule aucune rampe.
 *
 * Depuis la racine du dépôt :
 * npx tsx "docs/notes/Recherches/Plugin Palettes/Texte des boutons/mesurer-polarites.ts"
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

import {
  atteintLeSeuil,
  boutsDe,
  contraste,
  distanceOk,
  ecrireHexa,
  intensitesDe,
  lireHexa,
  prereglageTailwind,
  rampeDe,
  rampesDe,
  recetteParDefaut,
  rgb8VersOklch,
  verifierPromesses,
  type Intensite,
  type Mode,
  type Palette,
  type Rgb8,
} from '../../../../../packages/couleur/src/index';

/** Le texte posé sur le bouton : clair sur un bouton foncé, sombre sur un bouton clair. */
type Texte = 'clair' | 'sombre';

/** Le texte que le moteur pose aujourd'hui : le fond du thème. */
const TEXTE_ACTUEL: Record<Mode, Texte> = { light: 'clair', dark: 'sombre' };

type Modele = 'texteSeul' | 'boutonDeLAutreTheme' | 'nuancesDeplacees' | 'blancOuNoirPurs' | 'automatique';

const MODELES: readonly Modele[] = ['texteSeul', 'boutonDeLAutreTheme', 'nuancesDeplacees', 'blancOuNoirPurs', 'automatique'];

const recette = recetteParDefaut();
const crans = recette.crans;
const fonds: Record<Mode, Rgb8> = { light: lireHexa(recette.fonds.light)!, dark: lireHexa(recette.fonds.dark)! };
const BLANC: Rgb8 = [255, 255, 255];
const NOIR: Rgb8 = [0, 0, 0];
const SEUIL_TEXTE = recette.seuils.texte;
const SEUIL_NON_TEXTE = recette.seuils.nonTexte;

/** Les références de MESURES-ENCRES.json et de l'étude des usages indexés, réunies. */
const REFERENCES = [
  ['#1E6FD9', 'bleu'], ['#2563EB', 'bleu Tailwind'], ['#D94635', 'rouge'], ['#DC2626', 'rouge Tailwind'],
  ['#EAB308', 'jaune'], ['#FACC15', 'jaune clair'], ['#16A34A', 'vert'], ['#9333EA', 'violet'],
  ['#06B6D4', 'cyan'], ['#737373', 'gris'], ['#808080', 'gris moyen'], ['#8B8178', 'terne'],
  ['#F5F5F5', 'presque blanc'], ['#171717', 'presque noir'],
] as const;

/** Les palettes de la maquette, montrées à deux intensités. */
const EXEMPLES = ['#2563EB', '#EAB308', '#16A34A', '#9333EA', '#737373'];

const RANGS = [0, 1, 2, 3] as const;
const rangDe = (cran: number): number => crans.indexOf(cran);
const NUANCES_DU_BOUTON = [700, 800, 900, 950].map(rangDe);
/** Le bouton déplacé dans la rampe de son thème, de la nuance la plus proche du texte vers le fond de page. */
const NUANCES_DEPLACEES = [500, 400, 300, 200].map(rangDe);

function paletteDe(reference: string, index: number, intensites: 1 | 2): Palette {
  const derive = prereglageTailwind(rgb8VersOklch(lireHexa(reference)!), boutsDe(recette));
  const rangee = { ...derive, origine: 'tailwind' as const };
  const base: Palette = { id: `p-${index.toString(16).padStart(8, '0')}`, reference, derive: { lien: true, soft: rangee, vivid: rangee } };
  return intensites === 1 ? { ...base, intensites: 1 } : base;
}

const couleurDuTexte = (texte: Texte): Rgb8 => (texte === 'clair' ? fonds.light : fonds.dark);
const purDe = (texte: Texte): Rgb8 => (texte === 'clair' ? BLANC : NOIR);
/** Le thème dont les nuances 700 à 950 portent ce texte : le thème Light pour un texte clair. */
const themeDesNuances = (texte: Texte): Mode => (texte === 'clair' ? 'light' : 'dark');

interface Bouton {
  /** Les quatre nuances du bouton, du repos à `active-hover`. */
  readonly nuances: readonly Rgb8[];
  /** La couleur du texte sur chaque rang : une seule, sauf pour le choix automatique. */
  readonly couleursDuTexte: readonly Rgb8[];
  /** D'où viennent les nuances : la rampe et les numéros. */
  readonly source: string;
}

type RampePar = (mode: Mode) => readonly Rgb8[];

/** Le bouton et son texte dans le thème `theme`, pour le texte voulu et le modèle. */
function boutonDe(modele: Modele, theme: Mode, texte: Texte, rampe: RampePar): Bouton {
  const prendre = (mode: Mode, rangs: readonly number[]) => rangs.map((rang) => rampe(mode)[rang]);
  const actuel = texte === TEXTE_ACTUEL[theme];
  const unique = (couleur: Rgb8) => RANGS.map(() => couleur);
  switch (modele) {
    case 'texteSeul':
      return { nuances: prendre(theme, NUANCES_DU_BOUTON), couleursDuTexte: unique(couleurDuTexte(texte)), source: `${theme} 700-950` };
    case 'boutonDeLAutreTheme':
      return { nuances: prendre(themeDesNuances(texte), NUANCES_DU_BOUTON), couleursDuTexte: unique(couleurDuTexte(texte)), source: `${themeDesNuances(texte)} 700-950` };
    case 'blancOuNoirPurs':
      return { nuances: prendre(themeDesNuances(texte), NUANCES_DU_BOUTON), couleursDuTexte: unique(purDe(texte)), source: `${themeDesNuances(texte)} 700-950` };
    case 'nuancesDeplacees': {
      const rangs = actuel ? NUANCES_DU_BOUTON : NUANCES_DEPLACEES;
      return { nuances: prendre(theme, rangs), couleursDuTexte: unique(couleurDuTexte(texte)), source: `${theme} ${actuel ? '700-950' : '500-200'}` };
    }
    case 'automatique': {
      const nuances = prendre(theme, NUANCES_DU_BOUTON);
      const couleurs = nuances.map((fond) => (contraste(fond, BLANC) >= contraste(fond, NOIR) ? BLANC : NOIR));
      return { nuances, couleursDuTexte: couleurs, source: `${theme} 700-950, noir ou blanc par nuance` };
    }
  }
}

interface Ligne {
  readonly reference: string;
  readonly intensites: 1 | 2;
  readonly profil: Intensite;
  readonly theme: Mode;
  readonly texte: Texte;
  readonly modele: Modele;
  readonly source: string;
  readonly nuances: readonly string[];
  readonly couleursDuTexte: readonly string[];
  /** Le texte sur chaque rang : paires 5, 6, 7 et 18. */
  readonly contrastes: readonly number[];
  /** Le repos et le rang `hover` contre le fond de page ; la paire 14 juge le second. */
  readonly page: readonly [number, number];
  /** Le plus petit ΔEok entre deux rangs voisins. */
  readonly ecartDesEtats: number;
  /** La chroma OKLCH de chaque rang. */
  readonly chromas: readonly number[];
}

const lignes: Ligne[] = [];
const palettes = REFERENCES.flatMap(([reference], index) => [paletteDe(reference, index * 2, 2), paletteDe(reference, index * 2 + 1, 1)]);
let promesses = 0;
let manquees = 0;

for (const palette of palettes) {
  const garanties = verifierPromesses(recette, palette);
  promesses += garanties.length;
  manquees += garanties.filter((promesse) => promesse.verdict === 'manquee').length;
  const rampes = rampesDe(recette, palette);
  for (const profil of intensitesDe(palette)) {
    const rampe: RampePar = (mode) => rampeDe(rampes, profil)[mode].map((cran) => cran.couleur);
    for (const theme of ['light', 'dark'] as const) {
      for (const texte of ['clair', 'sombre'] as const) {
        for (const modele of MODELES) {
          // Le choix automatique ne dépend d'aucun texte voulu : une seule ligne, sous le texte actuel.
          if (modele === 'automatique' && texte !== TEXTE_ACTUEL[theme]) continue;
          const bouton = boutonDe(modele, theme, texte, rampe);
          lignes.push({
            reference: palette.reference,
            intensites: palette.intensites ?? 2,
            profil,
            theme,
            texte,
            modele,
            source: bouton.source,
            nuances: bouton.nuances.map(ecrireHexa),
            couleursDuTexte: bouton.couleursDuTexte.map(ecrireHexa),
            contrastes: RANGS.map((rang) => contraste(bouton.couleursDuTexte[rang], bouton.nuances[rang])),
            page: [contraste(bouton.nuances[0], fonds[theme]), contraste(bouton.nuances[1], fonds[theme])],
            ecartDesEtats: Math.min(...[1, 2, 3].map((rang) => distanceOk(bouton.nuances[rang - 1], bouton.nuances[rang]))),
            chromas: bouton.nuances.map((nuance) => rgb8VersOklch(nuance).C),
          });
        }
      }
    }
  }
}

/** Le résumé d'un groupe : les comptes et les pires cas, jugés sur les valeurs non arrondies. */
function resumer(groupe: readonly Ligne[]) {
  const lisibilite = groupe.flatMap((ligne) => ligne.contrastes);
  const paire14 = groupe.map((ligne) => ligne.page[1]);
  const repos = groupe.map((ligne) => ligne.page[0]);
  return {
    lignes: groupe.length,
    lisibilite: { mesures: lisibilite.length, tenues: lisibilite.filter((r) => atteintLeSeuil(r, SEUIL_TEXTE)).length, minimum: Math.min(...lisibilite) },
    paire14: { mesures: paire14.length, tenues: paire14.filter((r) => atteintLeSeuil(r, SEUIL_NON_TEXTE)).length, minimum: Math.min(...paire14) },
    reposSurLaPage: { minimum: Math.min(...repos), maximum: Math.max(...repos) },
    ecartDesEtats: { minimum: Math.min(...groupe.map((ligne) => ligne.ecartDesEtats)) },
    chromaDuRepos: { moyenne: groupe.reduce((somme, ligne) => somme + ligne.chromas[0], 0) / groupe.length },
    chromaDuDernierRang: { moyenne: groupe.reduce((somme, ligne) => somme + ligne.chromas[3], 0) / groupe.length },
  };
}

const resume = [];
for (const modele of MODELES) {
  for (const theme of ['light', 'dark'] as const) {
    for (const texte of ['clair', 'sombre'] as const) {
      const groupe = lignes.filter((ligne) => ligne.modele === modele && ligne.theme === theme && ligne.texte === texte);
      if (groupe.length === 0) continue;
      resume.push({ modele, theme, texte, actuel: texte === TEXTE_ACTUEL[theme], ...resumer(groupe) });
    }
  }
}

/** Le choix automatique rend-il un autre texte que le fond du thème sur une nuance au moins ? */
const automatiqueDifferent = lignes
  .filter((ligne) => ligne.modele === 'automatique')
  .filter((ligne) => ligne.couleursDuTexte.some((hexa) => (lireHexa(hexa)![0] > 128 ? 'clair' : 'sombre') !== TEXTE_ACTUEL[ligne.theme])).length;

/**
 * Les clartés où un bouton gris porte son texte à 4,5:1 et se détache du fond
 * de page à 3:1, et les numéros de chaque thème qui y tombent. Le texte
 * impose un côté ; la page en laisse deux. La clarté OKLCH d'un gris vaut la
 * racine cubique de sa luminance.
 */
function bande(theme: Mode, texte: Texte) {
  const lum = (couleur: Rgb8) => {
    const c = couleur.map((v) => v / 255).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const borner = (y: number) => Math.min(1, Math.max(0, y));
  const yTexte = lum(couleurDuTexte(texte));
  const yPage = lum(fonds[theme]);
  const texteClair = yTexte > 0.18;
  const cote: [number, number] = texteClair ? [0, borner((yTexte + 0.05) / SEUIL_TEXTE - 0.05)] : [borner(SEUIL_TEXTE * (yTexte + 0.05) - 0.05), 1];
  const page: [number, number][] = [[0, borner((yPage + 0.05) / SEUIL_NON_TEXTE - 0.05)], [borner(SEUIL_NON_TEXTE * (yPage + 0.05) - 0.05), 1]];
  const intervalles = page
    .map(([bas, haut]): [number, number] => [Math.max(bas, cote[0]), Math.min(haut, cote[1])])
    .filter(([bas, haut]) => bas < haut)
    .map(([bas, haut]) => ({ luminance: [bas, haut], clartes: [Math.cbrt(bas), Math.cbrt(haut)] }));
  const dans = (mode: Mode) => crans.filter((_, rang) => {
    const L = recette.courbes[mode][rang];
    return intervalles.some(({ clartes }) => L >= clartes[0] && L <= clartes[1]);
  });
  return { theme, texte, actuel: texte === TEXTE_ACTUEL[theme], intervalles, nuancesLight: dans('light'), nuancesDark: dans('dark') };
}

const bandes = [bande('light', 'clair'), bande('light', 'sombre'), bande('dark', 'clair'), bande('dark', 'sombre')];

/** Les données de la maquette : rampes et fonds de cinq palettes à deux intensités. */
const exemples = EXEMPLES.map((reference) => {
  const index = REFERENCES.findIndex(([hexa]) => hexa === reference);
  const palette = paletteDe(reference, index * 2, 2);
  const rampes = rampesDe(recette, palette);
  const rampesHexa = Object.fromEntries((['soft', 'vivid'] as const).map((profil) => [profil, {
    light: rampeDe(rampes, profil).light.map((cran) => cran.hexa),
    dark: rampeDe(rampes, profil).dark.map((cran) => cran.hexa),
  }]));
  return { reference, nom: REFERENCES[index][1], rampes: rampesHexa };
});

const donnees = {
  protocole: 'Recette par défaut, préréglage Tailwind, quatorze références à une et deux intensités. Seuil 4,5 pour le texte du bouton sur chaque rang, 3 pour la paire 14.',
  recette: { crans, courbes: recette.courbes, fonds: recette.fonds, seuils: recette.seuils },
  promessesActuelles: { mesures: promesses, manquees },
  resume,
  automatiqueDifferent,
  bandes,
  exemples,
};

const ici = (nom: string) => new URL(`./${nom}`, import.meta.url);
// Une ligne de mesure par ligne de fichier : le détail reste lisible sans tripler la taille.
const entete = JSON.stringify(donnees, null, 2).replace(/\n}$/, '');
writeFileSync(ici('MESURES-POLARITES.json'), `${entete},\n  "lignes": [\n${lignes.map((ligne) => `    ${JSON.stringify(ligne)}`).join(',\n')}\n  ]\n}\n`);

const maquette = ici('MAQUETTE-MODES-ET-AFFICHAGE.html');
if (existsSync(maquette)) {
  const html = readFileSync(maquette, 'utf8');
  const motif = /(<script id="donnees" type="application\/json">)[\s\S]*?(<\/script>)/;
  if (!motif.test(html)) throw new Error('Bloc de données introuvable dans la maquette.');
  const json = JSON.stringify({ recette: donnees.recette, resume, bandes, exemples });
  writeFileSync(maquette, html.replace(motif, (_tout, ouverture: string, fermeture: string) => `${ouverture}${json}${fermeture}`));
}

const arrondi = (x: number) => Math.round(x * 1000) / 1000;
console.table(resume.map((r) => ({
  modele: r.modele, theme: r.theme, texte: r.texte, actuel: r.actuel,
  lisibilite: `${r.lisibilite.tenues}/${r.lisibilite.mesures}`, min: arrondi(r.lisibilite.minimum),
  paire14: `${r.paire14.tenues}/${r.paire14.mesures}`, min14: arrondi(r.paire14.minimum),
  repos: `${arrondi(r.reposSurLaPage.minimum)}-${arrondi(r.reposSurLaPage.maximum)}`,
  ecartEtats: arrondi(r.ecartDesEtats.minimum), C0: arrondi(r.chromaDuRepos.moyenne), C3: arrondi(r.chromaDuDernierRang.moyenne),
})));
console.log(JSON.stringify({ promessesActuelles: donnees.promessesActuelles, automatiqueDifferent, bandes }, null, 2));

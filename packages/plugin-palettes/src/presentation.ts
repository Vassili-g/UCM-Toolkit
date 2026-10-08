/**
 * Ce que l'interface fait des résultats du moteur, avant leur mise en mots :
 * les promesses manquées groupées par garantie, mode et fond ([VER-06]),
 * la place de chaque alerte, et le réglage que chaque message ouvre
 * ([VER-15]), si une carte repliée est réglée, le verdict d'une palette
 * ([VER-19]), les bandes de l'aperçu et ce que chaque geste y surligne. Pur :
 * ni DOM, ni texte.
 */
import {
  COULEUR_DU_TEXTE_DES_BOUTONS,
  DOSSIERS,
  GARANTIES,
  MODES,
  VARIABLES_DE_PALETTE,
  cranDeLaVariable,
  decalageRange,
  intensitesDe,
  sensDuTheme,
  severiteDeLAlerte,
  variablesDuCran,
  type Alerte,
  type FondDeGarantie,
  type Garantie,
  type Intensite,
  type Mode,
  type Palette,
  type Promesse,
  type SensDuTheme,
  type TexteDesBoutons,
  type VariableDePalette,
  type VariableDuTheme,
} from 'ucm-couleur';

import type { AnalyseDePalette } from './analyse';
import type { EtatDuCadre } from './planche/fraicheur';

/** L'état des tokens d'une palette, dans sa ligne « Tokens Figma » ([VAR-05]). */
export type EtatDesTokens = 'jamais-ecrits' | 'a-jour' | 'a-mettre-a-jour' | 'modifies' | 'introuvables';

/** L'état d'une fiche de Gestion, du plus urgent au moins urgent ([UI-26]). */
export const ETATS_DE_FICHE = ['modifiee', 'a-mettre-a-jour', 'pas-encore', 'synchronisee'] as const;
export type EtatDeLaFiche = (typeof ETATS_DE_FICHE)[number];

/**
 * L'état d'une fiche : le plus urgent de ses deux sorties ([UI-26]). Une
 * sortie introuvable ou illisible compte comme à mettre à jour. `tokens`
 * vaut `null` tant que la palette n'a pas de ligne « Tokens Figma ».
 */
export function etatDeLaFiche(tokens: EtatDesTokens | null, planche: EtatDuCadre): EtatDeLaFiche {
  if (tokens === 'modifies') return 'modifiee';
  if (tokens === 'a-mettre-a-jour' || tokens === 'introuvables') return 'a-mettre-a-jour';
  if (planche === 'perimee' || planche === 'introuvable' || planche === 'illisible') return 'a-mettre-a-jour';
  if (tokens === 'jamais-ecrits' || planche === 'jamais-dessinee') return 'pas-encore';
  return 'synchronisee';
}

/** Le verdict d'une palette ([VER-19]) : ce que le sélecteur et l'onglet Vérification en disent. */
export type Verdict = 'succes' | 'avertissement' | 'danger';

/**
 * Le verdict que donnent des faits déjà comptés : `danger` dès qu'une
 * garantie manque, `avertissement` dès qu'une alerte de sévérité « alerte »
 * existe, `succes` sinon. Une palette libre est `succes`.
 */
export function verdictDe(faits: { readonly libre: boolean; readonly manquees: number; readonly alertes: number }): Verdict {
  if (faits.libre) return 'succes';
  if (faits.manquees > 0) return 'danger';
  return faits.alertes > 0 ? 'avertissement' : 'succes';
}

/** Le verdict d'une palette analysée ([VER-19]). Une notice ne le change pas. */
export function verdictDeLaPalette(analyse: AnalyseDePalette): Verdict {
  return verdictDe({
    libre: analyse.libre,
    manquees: analyse.manquees,
    alertes: analyse.alertes.filter((alerte) => severiteDeLAlerte(alerte) === 'alerte').length,
  });
}

/**
 * Le réglage qu'un message ouvre et focalise ([VER-15]). Les quatre premiers
 * sont dans l'onglet Création, les trois suivants dans les Réglages communs.
 * `saturation-palette` ouvre la carte « Réglage global » sur sa réglette de
 * saturation, `intensites-palette` sur son premier contrôle.
 */
export type CibleDAction =
  | 'reference'
  | 'saturation-palette'
  | 'intensites-palette'
  | 'derive'
  | 'luminosite-commune'
  | 'fonds'
  | 'intensites-communes'
  | 'ajuster-reference';

/** Les cibles qui ouvrent les Réglages communs. */
export const CIBLES_COMMUNES: readonly CibleDAction[] = ['luminosite-commune', 'fonds', 'intensites-communes'];

/** Une garantie, un mode et un fond où au moins une intensité manque sa promesse. */
export interface GroupeDePromesses {
  readonly garantie: Garantie;
  readonly mode: Mode;
  /** Le fond jugé, l'un des fonds de la garantie : le fond de la page, ou une variable de palette. */
  readonly fond: FondDeGarantie;
  readonly seuil: number;
  /** Le résultat de chaque intensité présente, dans l'ordre du moteur, tenu ou manqué : le message les montre toutes. */
  readonly resultats: readonly Promesse[];
  /** Le nombre de contrôles manqués du groupe : le compteur compte les contrôles. */
  readonly manquees: number;
}

/**
 * Les groupes de promesses manquées, par mode, puis dans l'ordre des garanties
 * G1 à G7, puis dans l'ordre des fonds de chaque garantie. Deux intensités en
 * échec sur le même fond font un groupe et comptent deux contrôles.
 *
 * Le moteur rend, pour un mode, une intensité et une garantie, une promesse
 * par fond de la garantie, dans l'ordre de `garantie.fonds` : le rang d'une
 * promesse dans cette suite dit son fond.
 */
export function groupesManques(promesses: readonly Promesse[]): GroupeDePromesses[] {
  const groupes: GroupeDePromesses[] = [];
  for (const mode of MODES) {
    for (const garantie of GARANTIES) {
      const ici = promesses.filter((promesse) => promesse.mode === mode && promesse.garantie.numero === garantie.numero);
      const intensites = [...new Set(ici.map((promesse) => promesse.profil))];
      garantie.fonds.forEach((fond, rang) => {
        const resultats = intensites.flatMap((intensite) => ici.filter((promesse) => promesse.profil === intensite).slice(rang, rang + 1));
        const manquees = resultats.filter((promesse) => promesse.verdict === 'manquee').length;
        if (manquees > 0) groupes.push({ garantie, mode, fond, seuil: resultats[0].seuil, resultats, manquees });
      });
    }
  }
  return groupes;
}

const SENS: readonly SensDuTheme[] = ['normal', 'inverse'];

/**
 * Le fond de la garantie qu'une promesse juge, d'après son second membre : la
 * page, ou la variable dont le cran est le sien. Un cran désigne une seule
 * variable parmi les fonds d'une garantie, dans les deux sens du thème.
 */
export function fondDeLaPromesse(promesse: Promesse): FondDeGarantie {
  const { fonds } = promesse.garantie;
  const { second } = promesse;
  const trouve = second.nature === 'cran'
    ? fonds.find((fond) => 'variable' in fond && SENS.some((sens) => cranDeLaVariable(fond.variable, sens) === second.cran))
    : fonds.find((fond) => 'fondDeLaPage' in fond);
  return trouve ?? fonds[0];
}

/** La variable que désigne le fond d'une garantie : une variable de palette, ou le fond de la page. */
export function variableDuFond(fond: FondDeGarantie): VariableDePalette | 'elevation/page' {
  return 'fondDeLaPage' in fond ? 'elevation/page' : fond.variable;
}

/** Une garantie qui compte une variable, et l'autre variable qu'elle lui oppose. */
export interface GarantieDeLaVariable {
  readonly promesse: Promesse;
  /** `premier` quand la variable est le premier membre de la garantie, `fond` quand elle en est un fond. */
  readonly role: 'premier' | 'fond';
  /** La variable en face : le fond de la page, ou une variable de palette. */
  readonly partenaire: VariableDePalette | 'elevation/page';
}

/**
 * Les garanties d'une intensité, dans un thème, dont une variable est membre
 * (I5), dans l'ordre du moteur : une par fond quand la variable est le premier
 * membre, une seule quand elle est un fond. Le détail d'une nuance les lie à la
 * carte des garanties.
 */
export function garantiesDeLaVariable(promesses: readonly Promesse[], mode: Mode, profil: Intensite, variable: VariableDuTheme): GarantieDeLaVariable[] {
  return promesses.filter((promesse) => promesse.mode === mode && promesse.profil === profil).flatMap((promesse): GarantieDeLaVariable[] => {
    const fond = fondDeLaPromesse(promesse);
    if (promesse.garantie.premier.variable === variable) return [{ promesse, role: 'premier', partenaire: variableDuFond(fond) }];
    return 'variable' in fond && fond.variable === variable ? [{ promesse, role: 'fond', partenaire: promesse.garantie.premier.variable }] : [];
  });
}

/**
 * Où l'onglet Création montre une alerte ([VER-10], [VER-11]) : près du
 * réglage d'intensité pour ce qui compare les intensités, dans la liste des
 * points à vérifier pour le reste. Le rapport les garde toutes.
 */
export function placeDeLAlerte(alerte: Alerte): 'intensite' | 'liste' {
  return alerte.code === 'profils-confondus' || alerte.code === 'reference-plus-terne' || alerte.code === 'reference-plus-vive'
    ? 'intensite'
    : 'liste';
}

/** La carte de l'onglet Création sous laquelle un message se lit. */
export type CarteDuMessage = 'couleur-de-base' | 'apercu' | 'derive';

/**
 * La carte sous laquelle un message se lit : celle du premier réglage qu'il
 * ouvre. Un message sur les fonds, la luminosité ou les promesses concerne
 * l'aperçu.
 */
export function carteDuMessage(cibles: readonly CibleDAction[]): CarteDuMessage {
  if (cibles[0] === 'reference') return 'couleur-de-base';
  if (cibles[0] === 'derive') return 'derive';
  return 'apercu';
}

/**
 * Les réglages qu'une promesse manquée ouvre : l'intensité et la dérive de la
 * palette, puis la luminosité commune, qui touche toutes les palettes, et
 * enfin l’ajustement de la référence, qui ne touche que sa luminosité (W7.1).
 * Toute palette a la carte « Teinte, saturation, luminosité », une intensité
 * comprise (Z10.6).
 */
export function ciblesDeLaPromesse(): CibleDAction[] {
  return ['intensites-palette', 'derive', 'luminosite-commune', 'ajuster-reference'];
}

/**
 * Le réglage qu'une alerte ouvre, selon sa cause. Des profils presque
 * identiques s'écartent par la saturation de la palette, que ses intensités
 * soient les siennes ou celles des Réglages communs.
 */
export function ciblesDeLAlerte(alerte: Alerte): CibleDAction[] {
  switch (alerte.code) {
    case 'profils-confondus':
      return ['saturation-palette'];
    case 'reference-plus-terne':
    case 'reference-plus-vive':
      return ['intensites-palette'];
    case 'palettes-proches':
      return ['reference'];
    case 'fond-hors-courbe':
      return ['fonds'];
  }
}

/** Un des trois dossiers de la table, une bande de l'aperçu ([UI-04], I12). */
export type Dossier = (typeof DOSSIERS)[number];

/** Le nom français sous un code : la clé de `TEXTES_DE_L_APERCU.noms`. */
export type NomDeCode = 'repos' | 'survol' | 'appui' | 'texte' | 'texteSecondaire' | 'contour' | 'texteDesBoutons' | 'filet' | 'anneauDeFocus';

/** Un code sous une accolade : la variable qu'il désigne, la fin de son nom, et son nom français. */
export interface CodeDeBande {
  readonly variable: VariableDuTheme;
  readonly code: string;
  readonly nom: NomDeCode;
}

/**
 * Une accolade de l'aperçu ([UI-04]) : les variables qui visent les mêmes
 * nuances, les colonnes qu'elle couvre et la place de son libellé. La colonne
 * `-1` est celle de la case tiretée, `0` la première nuance. `libelle.colle`
 * dit qu'un libellé aligné à droite touche l'accolade suivante : il garde un
 * blanc pour ne pas se lire avec elle.
 */
export interface Accolade {
  readonly codes: readonly CodeDeBande[];
  readonly debut: number;
  readonly fin: number;
  readonly libelle: { readonly debut: number; readonly fin: number; readonly alignement: 'center' | 'start' | 'end'; readonly colle: boolean };
}

/** Une bande de l'aperçu : un dossier, et ses accolades de gauche à droite. */
export interface Bande {
  readonly dossier: Dossier;
  readonly accolades: readonly Accolade[];
}

type Membre = readonly [VariableDuTheme, NomDeCode];

/** Les accolades d'un dossier, avant leur place : chacune réunit les variables qui se lisent ensemble. */
function groupesDuDossier(dossier: Dossier, neutre: boolean): Membre[][] {
  const etats: Membre[] = [['default', 'repos'], ['hover', 'survol'], ['pressed', 'appui']].map(([etat, nom]) => [`${dossier}/${etat}` as VariableDuTheme, nom as NomDeCode]);
  switch (dossier) {
    case 'solid':
      return [[['solid/foreground', 'texteDesBoutons']], etats];
    case 'surface':
      return [etats, [['surface/foreground', 'texte'], ['surface/border', 'contour']]];
    case 'page':
      return [
        [['page/divider', 'filet']],
        [['page/focus', 'anneauDeFocus']],
        [neutre ? ['page/foreground-subtle', 'texteSecondaire'] : ['page/foreground', 'texte'], ['page/border', 'contour']],
      ];
  }
}

/** Le nom d'un code : la fin du nom de sa variable, `default`, `foreground-subtle`. */
const codeDe = (variable: VariableDuTheme): string => variable.slice(variable.indexOf('/') + 1);

interface Groupe {
  readonly codes: readonly CodeDeBande[];
  readonly debut: number;
  readonly fin: number;
}

/**
 * La place du libellé de chaque accolade (S10, 9). Les accolades se trient par
 * première colonne. L'espace libre entre deux accolades se partage, la moitié
 * inférieure à gauche ; celui d'avant la première va à la première, celui
 * d'après la dernière à la dernière. Un libellé qui a de l'espace des deux
 * côtés s'étend du même nombre de colonnes de chaque côté et se centre ;
 * sinon il s'étend du côté libre et s'aligne du côté de son accolade.
 */
export function etaler(groupes: readonly Groupe[], nombreDeCrans: number): Accolade[] {
  const triees = [...groupes].sort((a, b) => a.debut - b.debut);
  const parts: [number, number][] = [];
  for (let rang = 0; rang <= triees.length; rang += 1) {
    const debut = rang === 0 ? -1 : triees[rang - 1].fin + 1;
    const fin = rang === triees.length ? nombreDeCrans - 1 : triees[rang].debut - 1;
    const libres = Math.max(0, fin - debut + 1);
    if (rang === 0) parts.push([0, libres]);
    else if (rang === triees.length) parts.push([libres, 0]);
    else parts.push([Math.floor(libres / 2), libres - Math.floor(libres / 2)]);
  }
  return triees.map((groupe, rang): Accolade => {
    const gauche = parts[rang][1];
    const droite = parts[rang + 1][0];
    const marge = Math.min(gauche, droite);
    const libelle = gauche > 0 && droite > 0
      ? { debut: groupe.debut - marge, fin: groupe.fin + marge, alignement: 'center' as const, colle: false }
      : droite === 0 && gauche > 0
        ? { debut: groupe.debut - gauche, fin: groupe.fin, alignement: 'end' as const, colle: rang < triees.length - 1 }
        : { debut: groupe.debut, fin: groupe.fin + droite, alignement: 'start' as const, colle: false };
    return { ...groupe, libelle };
  });
}

/**
 * Les bandes de l'aperçu, une par dossier, dans le sens du thème montré (I3).
 * Une variable dont le cran manque dans la liste n'a pas de code ; une accolade
 * sans variable n'existe pas. Les codes d'une accolade suivent l'ordre de leurs
 * nuances : dans le sens inversé, `solid` s'écrit `pressed · hover · default`.
 */
export function bandesDe(crans: readonly number[], sens: SensDuTheme, neutre: boolean): Bande[] {
  return DOSSIERS.map((dossier): Bande => {
    const groupes = groupesDuDossier(dossier, neutre).flatMap((membres): Groupe[] => {
      const presents = membres.flatMap(([variable, nom]) => {
        const cran = cranDeLaVariable(variable, sens);
        if (cran === undefined) return [];
        const rang = typeof cran === 'number' ? crans.indexOf(cran) : -1;
        if (typeof cran === 'number' && rang < 0) return [];
        return [{ code: { variable, code: codeDe(variable), nom }, cran: typeof cran === 'number' ? cran : 0, rang }];
      });
      if (presents.length === 0) return [];
      presents.sort((a, b) => a.cran - b.cran);
      const rangs = presents.map((present) => present.rang);
      return [{ codes: presents.map((present) => present.code), debut: Math.min(...rangs), fin: Math.max(...rangs) }];
    });
    return { dossier, accolades: etaler(groupes, crans.length) };
  });
}

/** L'aperçu d'un thème : son sens, la couleur de la case tiretée et ses bandes. */
export interface ApercuEnBandes {
  readonly sens: SensDuTheme;
  /** Le texte des boutons du thème, que la case tiretée et la petite pastille de `solid/foreground` peignent. */
  readonly couleurDuTexte: string;
  readonly bandes: readonly Bande[];
}

/** L'aperçu du thème que la bascule « Aperçu » montre : ses crans suivent la table du sens que son texte des boutons donne (I3). */
export function apercuEnBandes(mode: Mode, texte: TexteDesBoutons, crans: readonly number[], neutre: boolean): ApercuEnBandes {
  const sens = sensDuTheme(mode, texte);
  return { sens, couleurDuTexte: COULEUR_DU_TEXTE_DES_BOUTONS[texte], bandes: bandesDe(crans, sens, neutre) };
}

/**
 * La hauteur des rayures, en pixels : 3 par intensité quand la palette en a
 * deux, 5 quand elle en a une ; la petite pastille de `solid/foreground`, seule
 * dans sa colonne, a la hauteur des deux rangées et de leur espace.
 */
export function hauteursDesRayures(intensites: number): { readonly petite: number; readonly texteDesBoutons: number } {
  return intensites > 1 ? { petite: 3, texteDesBoutons: intensites * 4 - 1 } : { petite: 5, texteDesBoutons: 5 };
}

/** Le nom qui désigne la palette du neutre : celui que le profil UCM d'UCM Explorateur lit aussi. */
const PALETTE_NEUTRE = 'neutral';

/** Vrai pour la palette du neutre, qui ajoute `page/foreground-main` et `page/foreground-subtle` à la table. */
export function estLaPaletteNeutre(palette: { readonly nom?: string }): boolean {
  return (palette.nom ?? '').trim().toLowerCase() === PALETTE_NEUTRE;
}

/** Ce que le pointeur, le focus ou le choix désignent dans l'aperçu (I13). */
export type Geste =
  /** Une pastille de la rampe, une petite pastille d'une rayure, ou la nuance choisie. */
  | { readonly nature: 'cran'; readonly numero: number }
  /** Un code sous une rayure, la case tiretée ou la petite pastille de `solid/foreground`. */
  | { readonly nature: 'code'; readonly variable: VariableDuTheme }
  /** Le spécimen d'un dossier. */
  | { readonly nature: 'dossier'; readonly dossier: Dossier };

/** Ce qu'un geste surligne. */
export interface Surlignage {
  /** Les crans dont les pastilles de la rampe, dans chaque intensité, et les petites pastilles des rayures se surlignent. */
  readonly crans: readonly number[];
  /** Les codes à surligner, avec la case tiretée et la petite pastille de `solid/foreground` qui portent le même nom. */
  readonly variables: readonly VariableDuTheme[];
  /** Le dossier dont le spécimen se surligne : les autres pastilles et les autres bandes s'atténuent. */
  readonly dossier: Dossier | null;
}

const RIEN: Surlignage = { crans: [], variables: [], dossier: null };

/** Les variables qui ont un code dans les bandes : celles des dossiers, et `page/foreground-main` pour le neutre. */
function variablesAffichees(neutre: boolean): Set<VariableDuTheme> {
  const variables = new Set<VariableDuTheme>(DOSSIERS.flatMap((dossier) => groupesDuDossier(dossier, neutre).flat().map(([variable]) => variable)));
  if (neutre) variables.add('page/foreground-main');
  return variables;
}

/**
 * Ce que surligne un geste, dans la table du sens du thème montré (S11).
 * Une nuance qu'aucune variable ne prend ne surligne rien.
 */
export function surlignageDe(geste: Geste, crans: readonly number[], sens: SensDuTheme, neutre: boolean): Surlignage {
  const affichees = variablesAffichees(neutre);
  if (geste.nature === 'cran') {
    const rang = crans.indexOf(geste.numero);
    if (rang < 0) return RIEN;
    const variables = variablesDuCran(crans, rang, sens, neutre).filter((variable) => affichees.has(variable));
    return variables.length === 0 ? RIEN : { crans: [geste.numero], variables, dossier: null };
  }
  if (geste.nature === 'code') {
    if (!affichees.has(geste.variable)) return RIEN;
    const cran = cranDeLaVariable(geste.variable, sens);
    if (typeof cran === 'number' && !crans.includes(cran)) return RIEN;
    return { crans: typeof cran === 'number' ? [cran] : [], variables: [geste.variable], dossier: null };
  }
  const numeros = VARIABLES_DE_PALETTE
    .filter((variable) => variable.startsWith(`${geste.dossier}/`))
    .map((variable) => cranDeLaVariable(variable, sens))
    .filter((cran): cran is number => typeof cran === 'number' && crans.includes(cran));
  return { crans: [...new Set(numeros)].sort((a, b) => a - b), variables: [], dossier: geste.dossier };
}

/**
 * Le geste que désigne l'élément survolé ou focalisé, d'après ses attributs :
 * un code avant une pastille, une pastille avant un dossier. Rien d'autre ne
 * désigne un geste.
 */
export function gesteDeLaCible(attributs: { readonly token?: string | null; readonly cran?: string | null; readonly dossier?: string | null }): Geste | null {
  if (attributs.token) return { nature: 'code', variable: attributs.token as VariableDuTheme };
  if (attributs.cran) return { nature: 'cran', numero: Number(attributs.cran) };
  const dossier = DOSSIERS.find((nom) => nom === attributs.dossier);
  return dossier ? { nature: 'dossier', dossier } : null;
}

/**
 * Le réglage global d'une palette est réglé (recette v7) : une teinte ou une
 * luminosité non nulle sur l'une de ses rampes, la saturation d'une palette à
 * une intensité, ou des parts propres.
 */
export function reglageGlobalModifie(palette: Palette): boolean {
  const { reglages } = palette;
  const decalee = intensitesDe(palette).some((intensite) => {
    const profil = intensite === 'unique' ? 'vivid' : intensite;
    return (reglages?.teinte?.[profil] ?? 0) !== 0 || (reglages?.clarte?.[profil] ?? 0) !== 0;
  });
  return decalee || reglages?.part !== undefined || palette.parts !== undefined;
}

/**
 * Le Color shift d'une palette s'écarte de celui d'une palette neuve (recette
 * v7) : une teinte hors du préréglage Tailwind, ou une saturation ou une
 * luminosité décalée. Liés, les profils se lisent sur Vivid. Une palette
 * grise ne règle que sa luminosité ([DER-15]).
 */
export function colorShiftModifie(palette: Palette, grise: boolean): boolean {
  const { lien, soft, vivid } = palette.derive;
  const derives = palette.intensites === 1 || lien ? [vivid] : [soft, vivid];
  const grandeurs = grise ? (['clarte'] as const) : (['saturation', 'clarte'] as const);
  return derives.some((derive) => (!grise && derive.origine !== 'tailwind')
    || grandeurs.some((grandeur) => {
      const { clair, sombre } = decalageRange(derive, grandeur);
      return clair !== 0 || sombre !== 0;
    }));
}

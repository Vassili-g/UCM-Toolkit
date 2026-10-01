/**
 * Ce que l'interface fait des résultats du moteur, avant leur mise en mots :
 * les promesses manquées groupées par association, mode et état ([VER-06]),
 * la place de chaque alerte, et le réglage que chaque message ouvre
 * ([VER-15]), si une carte repliée est réglée, et le verdict d'une palette
 * ([VER-19]). Pur : ni DOM, ni texte.
 */
import {
  ASSOCIATIONS,
  EMPLOIS,
  MODES,
  TABLE_DES_EMPLOIS,
  associationDe,
  cleDeLAssociation,
  decalageRange,
  decalagesDeLEmploi,
  etatDeLaPaire,
  intensitesDe,
  severiteDeLAlerte,
  type Alerte,
  type Association,
  type Emploi,
  type EtatDePaire,
  type Mode,
  type Palette,
  type Promesse,
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

/** Une association, un mode et un état où au moins une intensité manque sa promesse. */
export interface GroupeDePromesses {
  readonly association: Association;
  readonly mode: Mode;
  readonly etat: EtatDePaire;
  readonly seuil: number;
  /** Le résultat de chaque intensité présente, dans l'ordre du moteur, tenu ou manqué : le message les montre toutes. */
  readonly resultats: readonly Promesse[];
  /** Le nombre de contrôles manqués du groupe : le compteur compte les contrôles. */
  readonly manquees: number;
}

/**
 * Les groupes de promesses manquées, par mode, puis dans l'ordre des
 * associations, puis par état. Deux intensités en échec sur la même paire font
 * un groupe et comptent deux contrôles.
 */
export function groupesManques(promesses: readonly Promesse[]): GroupeDePromesses[] {
  const groupes: GroupeDePromesses[] = [];
  for (const mode of MODES) {
    for (const association of ASSOCIATIONS) {
      const cle = cleDeLAssociation(association);
      const ici = promesses.filter((promesse) => promesse.mode === mode && cleDeLAssociation(associationDe(promesse.paire)) === cle);
      const etats = [...new Set(ici.map((promesse) => etatDeLaPaire(promesse.paire)))].sort((a, b) => a - b);
      for (const etat of etats) {
        const resultats = ici.filter((promesse) => etatDeLaPaire(promesse.paire) === etat);
        const manquees = resultats.filter((promesse) => promesse.verdict === 'manquee').length;
        if (manquees > 0) groupes.push({ association, mode, etat, seuil: resultats[0].seuil, resultats, manquees });
      }
    }
  }
  return groupes;
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

/**
 * Une accolade de l'aperçu ([UI-04]) : les rôles qui visent les mêmes
 * nuances, et les colonnes qu'elle couvre. La colonne `-1` est celle de la
 * pastille `on-solid`, `-2` celle du nom des profils ; `0` est la première
 * nuance. Le libellé occupe des colonnes libres de sa ligne, sans chevaucher
 * son voisin.
 */
export interface Accolade {
  readonly emplois: readonly Emploi[];
  readonly debut: number;
  readonly fin: number;
  readonly libelle: { readonly debut: number; readonly fin: number; readonly alignement: 'center' | 'start' | 'end' };
}

/**
 * Les accolades de l'aperçu, sur deux lignes au plus. Les rôles qui partent de
 * la même nuance se réunissent, sur l'union de leurs plages : `focus` n'a pas
 * d'état, et se lit avec `border-control` ; chaque accolade prend la première ligne où elle ne
 * chevauche aucune autre, dans l'ordre de `EMPLOIS`. Un libellé s'étend
 * autant à gauche qu'à droite de son accolade quand il le peut, et reste
 * centré ; sinon il prend toute sa zone libre, aligné du côté de l'accolade.
 */
export function accoladesDe(crans: readonly number[]): Accolade[][] {
  const groupes: { emplois: Emploi[]; debut: number; fin: number }[] = [];
  for (const emploi of EMPLOIS) {
    const cible = TABLE_DES_EMPLOIS[emploi];
    let debut = -1;
    let fin = -1;
    if (cible !== 'fond') {
      debut = crans.indexOf(cible);
      if (debut < 0) continue;
      fin = Math.min(crans.length - 1, debut + Math.max(...decalagesDeLEmploi(emploi)));
    }
    const meme = groupes.find((groupe) => groupe.debut === debut);
    if (meme) {
      meme.emplois.push(emploi);
      meme.fin = Math.max(meme.fin, fin);
    }
    else groupes.push({ emplois: [emploi], debut, fin });
  }
  const lignes: { emplois: Emploi[]; debut: number; fin: number }[][] = [];
  for (const groupe of groupes) {
    // Une colonne libre de chaque côté : le libellé d'une accolade d'une colonne a la place de se centrer.
    const libre = lignes.find((ligne) => ligne.every((autre) => groupe.fin < autre.debut - 1 || groupe.debut > autre.fin + 1));
    if (libre) libre.push(groupe);
    else lignes.push([groupe]);
  }
  return lignes.map((ligne) => {
    const triee = [...ligne].sort((a, b) => a.debut - b.debut);
    let borne = -2;
    return triee.map((groupe, rang): Accolade => {
      const suivante = triee[rang + 1];
      const zone = { debut: borne, fin: suivante ? suivante.debut - 1 : crans.length - 1 };
      const marge = Math.min(groupe.debut - zone.debut, zone.fin - groupe.fin);
      const libelle = marge > 0
        ? { debut: groupe.debut - marge, fin: groupe.fin + marge, alignement: 'center' as const }
        : { ...zone, alignement: groupe.debut === zone.debut ? ('start' as const) : ('end' as const) };
      borne = libelle.fin + 1;
      return { ...groupe, libelle };
    });
  });
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

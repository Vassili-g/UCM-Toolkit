/**
 * Le modèle de planche d'une palette ([ARC-07]) : un arbre de données pur,
 * cadres et textes, couleurs peintes, tailles et noms de calque, calculé
 * depuis la recette rangée ([ARC-11]). `ecriture/planche.ts` le traduit en
 * nodes Figma sans rien décider ; tout ce que la section 9 exige se teste ici,
 * hors de Figma.
 *
 * Le cadre répond à une question : quelle nuance pour quelle variable (récit R1,
 * maquette W3.6, M2). Chaque thème, peint de son fond et dessiné dans le sens
 * que son texte des boutons décide, montre les rampes des intensités de la
 * palette, puis les variables de chacune, une ligne par dossier `solid`,
 * `surface` et `page`, dans leurs états `default`, `hover` et `pressed`,
 * chacune avec les garanties que le moteur juge et leur niveau WCAG, puis les
 * grilles des contrastes, alignées sur les rampes ([PLA-18]). La recette dit
 * quelles parties se dessinent ([PLA-28]).
 * L'interface d'exemple n'est pas sur la planche : l'onglet Création la
 * montre ([UI-14]).
 */
import {
  COULEUR_DU_TEXTE_DES_BOUTONS,
  DOSSIERS,
  ETATS,
  GARANTIES,
  MODES,
  TABLE_DES_DOSSIERS,
  atteintLeSeuil,
  contraste,
  ecrireContraste,
  ecrireHexa,
  empreinte,
  intensitesDe,
  lireHexa,
  rampeDe,
  referenceDe,
  rgb8VersP3,
  sensDuTheme,
  variablePresente,
  type Cran,
  type Garantie,
  type Intensite,
  type Mode,
  type Palette,
  type Promesse,
  type Recette,
  type Rgb8,
  type SensDuTheme,
  type VariableDePalette,
} from 'ucm-couleur';

import { analyserPalette, type AnalyseDePalette } from '../analyse';
import type { ProfilDuDocument } from '../lecture';
import { estLaPaletteNeutre } from '../presentation';
import {
  NOM_DU_PROFIL,
  TEXTES,
  TEXTES_DE_LA_PLANCHE,
  TEXTES_DES_DOSSIERS_DE_LA_PLANCHE,
  TEXTES_DU_DETAIL,
  enTeteDeLaReference,
  enTeteDuThemeDeLaPlanche,
  jugementDuSeuil,
  legendeDesContrastes,
  niveauEcrit,
  nomDeLaPalette,
  verdictDuTheme,
} from './textes';

/** Une couleur peinte : son hexa sRGB, et ses composantes dans l'espace du document (section 6.7). */
export interface Peinture {
  readonly hexa: string;
  readonly composantes: readonly [number, number, number];
}

/**
 * Les styles nommés de la planche (V10.8), du plus haut au plus bas : titre de
 * palette, titre de section, titre d'usage, valeur, note, et les chiffres
 * appuyés. Ils entrent dans l'empreinte : changer une taille ou une graisse
 * périme les cadres déjà dessinés (V10.10).
 */
export const STYLES_DE_TEXTE = {
  palette: { family: 'Inter', style: 'Semi Bold', taille: 28 },
  theme: { family: 'Inter', style: 'Semi Bold', taille: 16 },
  role: { family: 'Inter', style: 'Semi Bold', taille: 12 },
  valeur: { family: 'Inter', style: 'Regular', taille: 11 },
  note: { family: 'Inter', style: 'Regular', taille: 10 },
  chiffre: { family: 'Inter', style: 'Semi Bold', taille: 10 },
} as const;

export type StyleDeTexte = keyof typeof STYLES_DE_TEXTE;

export interface NoeudTexte {
  readonly type: 'texte';
  readonly nom: string;
  readonly contenu: string;
  readonly style: StyleDeTexte;
  readonly couleur: Peinture;
  /** Une largeur fixe : le texte passe à la ligne dedans. Sans elle, il suit son contenu et ne se coupe jamais. */
  readonly largeur?: number;
}

/** Un contour : le filet d'un thème, la bordure d'un champ, l'anneau de focus. */
export interface Trait {
  readonly couleur: Peinture;
  readonly epaisseur: number;
  readonly tirets: boolean;
}

/** L'alignement des enfants d'un cadre, sur son axe puis sur l'axe croisé ; `MIN` par défaut. */
export interface Alignement {
  readonly principal?: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
  readonly secondaire?: 'MIN' | 'CENTER' | 'MAX';
}

export interface NoeudCadre {
  readonly type: 'cadre';
  readonly nom: string;
  readonly direction: 'VERTICAL' | 'HORIZONTAL';
  readonly espacement: number;
  readonly marge: number;
  /** La marge de gauche et de droite, quand elle diffère de `marge`. */
  readonly margeLaterale?: number;
  readonly fond: Peinture | null;
  readonly rayon: number;
  readonly trait?: Trait;
  /** Une taille fixe ; sans elle, le cadre épouse son contenu (auto layout, [PLA-21]). */
  readonly largeur?: number;
  readonly hauteur?: number;
  /** Le cadre prend la largeur de son parent : un filet, un soulignement. */
  readonly remplir?: boolean;
  readonly alignement?: Alignement;
  readonly enfants: readonly Noeud[];
}

export type Noeud = NoeudTexte | NoeudCadre;

/** Le modèle d'un cadre de palette, et ce qu'il peint. */
export interface ModeleDeCadre {
  readonly palette: string;
  readonly nom: string;
  /** L'empreinte du modèle ([PLA-19], E2), que le cadre range dans ses données de plugin. */
  readonly empreinte: string;
  readonly racine: NoeudCadre;
  /** Chaque pastille de nuance peinte, son nom de calque et son hexa : le rapport du dessin les compare à l'aperçu (L6.14). */
  readonly peints: readonly { readonly nom: string; readonly hexa: string }[];
}

/** La trame de la planche ([PLA-21]). */
export const TRAME = 8;

/** Les couleurs du cadre, séparées des couleurs de la palette ([PLA-23]). */
export const COULEURS_DE_LA_PLANCHE = {
  fondDuCadre: '#FFFFFF',
  encre: '#1E1E1E',
  encreClaire: '#F5F5F5',
  encreSecondaire: '#6B6B6B',
  /** Le filet d'un thème : 3,4:1 sur le blanc, 5,5:1 sur un fond presque noir (V10.4). */
  filet: '#8C8C8C',
  /** Une garantie manquée, sur un fond clair puis sur un fond sombre. */
  dangerSombre: '#B42318',
  dangerClair: '#FF9C8A',
} as const;

/** Une colonne de rampe, et celle de son libellé à gauche : la grille des contrastes s'aligne dessus. */
export const COLONNE = { largeur: 56, libelle: 48 } as const;

/** La hauteur d'une pastille de rampe. */
const HAUTEUR_DE_PASTILLE = 32;

/**
 * Les colonnes des variables : libellé, puis une colonne par état. Les trois
 * états tiennent dans la largeur des rampes de onze nuances : 160 + 3 × 128,
 * et trois espacements de 16, font 592 px pour 752 ; la planche garde
 * une colonne de 128 px de marge.
 */
const USAGE = { libelle: 160, etat: 128 } as const;

/** Un spécimen d'usage. */
const SPECIMEN = { largeur: 96, hauteur: 32 } as const;

/**
 * Une composante P3 arrondie au millionième. `**` ne rend pas le même dernier bit d'un moteur JavaScript à
 * l'autre : Node 22 et 24, Linux et Windows donnent trois résultats. Le sandbox range l'empreinte et l'iframe la
 * recalcule ([PLA-19]) : sans l'arrondi, un cadre P3 resterait « À actualiser ». Figma range un flottant
 * de 32 bits, plus grossier que le millionième.
 */
const auMillionieme = (composante: number): number => Math.round(composante * 1e6) / 1e6;

/** Peint une couleur à 8 bits dans l'espace du document (section 6.7, [MOT-25]). */
export function peinture(couleur: Rgb8, profil: ProfilDuDocument): Peinture {
  const composantes = profil === 'DISPLAY_P3'
    ? rgb8VersP3(couleur).map(auMillionieme)
    : [couleur[0] / 255, couleur[1] / 255, couleur[2] / 255] as const;
  return { hexa: ecrireHexa(couleur), composantes: [composantes[0], composantes[1], composantes[2]] };
}

const hexaLu = (hexa: string): Rgb8 => {
  const couleur = lireHexa(hexa);
  if (!couleur) throw new Error(`Couleur de la planche illisible : ${hexa}.`);
  return couleur;
};

/** Le noir ou le blanc, celui qui contraste le plus avec un fond ([PLA-13]). */
export function noirOuBlanc(fond: Rgb8): Rgb8 {
  return contraste(fond, [0, 0, 0]) >= contraste(fond, [255, 255, 255]) ? [0, 0, 0] : [255, 255, 255];
}

/** L'encre des légendes posées sur un fond : la sombre ou la claire, celle qui s'y lit le mieux ([PLA-09]). */
export function encreSur(fond: Rgb8): Rgb8 {
  const sombre = hexaLu(COULEURS_DE_LA_PLANCHE.encre);
  const claire = hexaLu(COULEURS_DE_LA_PLANCHE.encreClaire);
  return contraste(fond, sombre) >= contraste(fond, claire) ? sombre : claire;
}

/** `part` de `encre` posée sur `fond`, en octets : une encre atténuée sans transparence. */
function melanger(encre: Rgb8, fond: Rgb8, part: number): Rgb8 {
  return [0, 1, 2].map((canal) => Math.round(fond[canal] + (encre[canal] - fond[canal]) * part)) as unknown as Rgb8;
}

/**
 * Le nom de calque d'une pastille ([PLA-14]) : `vivid/light/700`, ou
 * `light/700` pour la rampe d'une palette à une intensité, qui n'a pas de
 * profil ([ENT-14]).
 */
export function nomDePastille(intensite: Intensite, mode: Mode, cran: number): string {
  return intensite === 'unique' ? `${mode}/${cran}` : `${intensite}/${mode}/${cran}`;
}

/** Les encres d'un thème, toutes lisibles sur son fond : texte, texte second, filet, aplat neutre et danger. */
interface Encres {
  readonly fond: Rgb8;
  readonly encre: Peinture;
  readonly seconde: Peinture;
  readonly filet: Peinture;
  readonly neutre: Peinture;
  readonly danger: Peinture;
}

interface Contexte {
  readonly recette: Recette;
  readonly palette: Palette;
  readonly profil: ProfilDuDocument;
  readonly analyse: AnalyseDePalette;
  readonly peints: { nom: string; hexa: string }[];
}

function texte(nom: string, contenu: string, style: StyleDeTexte, couleur: Peinture, largeur?: number): NoeudTexte {
  return largeur === undefined ? { type: 'texte', nom, contenu, style, couleur } : { type: 'texte', nom, contenu, style, couleur, largeur };
}

function cadre(nom: string, direction: NoeudCadre['direction'], enfants: readonly Noeud[], reglages: Partial<Omit<NoeudCadre, 'type' | 'nom' | 'direction' | 'enfants'>> = {}): NoeudCadre {
  return { type: 'cadre', nom, direction, espacement: TRAME, marge: 0, fond: null, rayon: 0, ...reglages, enfants };
}

/** Un cadre vide qui réserve une place dans une rangée. */
function espace(largeur: number, hauteur = TRAME): NoeudCadre {
  return cadre('espace', 'HORIZONTAL', [], { largeur, hauteur });
}

/** Un filet d'un pixel, à la largeur de son parent. */
function filet(couleur: Peinture): NoeudCadre {
  return cadre('filet', 'HORIZONTAL', [], { fond: couleur, hauteur: 1, remplir: true });
}

const CENTRE: Alignement = { principal: 'CENTER', secondaire: 'CENTER' };
const A_GAUCHE: Alignement = { secondaire: 'CENTER' };

/**
 * Les encres d'un thème. L'encre seconde atténue l'encre vers le fond, tant
 * qu'elle y garde 4,5:1 ; le danger est celui des deux qui s'y lit le mieux.
 */
function encresDuTheme(fond: Rgb8, profil: ProfilDuDocument): Encres {
  const encre = encreSur(fond);
  const attenuee = melanger(encre, fond, 0.7);
  const seconde = contraste(attenuee, fond) >= 4.5 ? attenuee : encre;
  const [sombre, clair] = [hexaLu(COULEURS_DE_LA_PLANCHE.dangerSombre), hexaLu(COULEURS_DE_LA_PLANCHE.dangerClair)];
  const danger = contraste(sombre, fond) >= contraste(clair, fond) ? sombre : clair;
  return {
    fond,
    encre: peinture(encre, profil),
    seconde: peinture(seconde, profil),
    filet: peinture(melanger(encre, fond, 0.16), profil),
    neutre: peinture(melanger(encre, fond, 0.06), profil),
    danger: peinture(danger, profil),
  };
}

/** La nuance d'une rampe à son numéro. */
function nuance(contexte: Contexte, intensite: Intensite, mode: Mode, numero: number): Cran {
  const rang = contexte.analyse.grille.crans.indexOf(numero);
  if (rang < 0) throw new Error(`La nuance ${numero} manque aux crans de la recette.`);
  return rampeDe(contexte.analyse.rampes, intensite)[mode][rang];
}

/* Les rampes */

/** La ligne des numéros, au-dessus des rampes. */
function numeros(contexte: Contexte, encres: Encres): NoeudCadre {
  return cadre('numéros', 'HORIZONTAL', [
    espace(COLONNE.libelle, 1),
    ...contexte.analyse.grille.crans.map((numero) => texte(String(numero), String(numero), 'chiffre', encres.seconde, COLONNE.largeur)),
  ]);
}

/**
 * Une rampe en rangée de pastilles, chacune nommée `profil/mode/cran`
 * ([PLA-14]) : ◆ sur la référence exacte ([MOT-17]), ≈ quand les deux profils
 * s'y confondent ([PLA-15]), et son code dessous. La rampe d'une palette à
 * une intensité ne porte pas de nom de profil.
 */
function rangeeDeRampe(contexte: Contexte, intensite: Intensite, mode: Mode, encres: Encres): NoeudCadre {
  const { analyse } = contexte;
  const { crans } = analyse.grille;
  const colonnes = rampeDe(analyse.rampes, intensite)[mode].map((cran, rang) => {
    const nom = nomDePastille(intensite, mode, crans[rang]);
    contexte.peints.push({ nom, hexa: cran.hexa });
    const surLaPastille = peinture(noirOuBlanc(cran.couleur), contexte.profil);
    const reperes = [
      ...(analyse.ancrage.profil === intensite && analyse.ancrage.rangs[mode] === rang ? [texte('référence', TEXTES_DE_LA_PLANCHE.reperage, 'valeur', surLaPastille)] : []),
      ...(analyse.confusions.some((confusion) => confusion.mode === mode && confusion.cran === crans[rang]) ? [texte('confondu', TEXTES_DE_LA_PLANCHE.confondu, 'valeur', surLaPastille)] : []),
    ];
    return cadre(`colonne ${crans[rang]}`, 'VERTICAL', [
      cadre(nom, 'HORIZONTAL', reperes, { fond: peinture(cran.couleur, contexte.profil), rayon: 6, largeur: COLONNE.largeur, hauteur: HAUTEUR_DE_PASTILLE, alignement: CENTRE, espacement: 0 }),
      texte('code', cran.hexa.slice(1), 'note', encres.seconde),
    ], { espacement: 0, largeur: COLONNE.largeur });
  });
  const libelle = intensite === 'unique' ? espace(COLONNE.libelle, 1) : texte('profil', NOM_DU_PROFIL[intensite], 'role', encres.encre, COLONNE.libelle);
  return cadre(intensite === 'unique' ? 'rampe' : `rampe ${intensite}`, 'HORIZONTAL', [libelle, ...colonnes]);
}

/**
 * Les rampes des intensités de la palette, sous leur titre, puis la note des
 * repères quand le contenu la demande : ≈ ne s'explique qu'avec deux
 * intensités, qui seules se confondent ([PLA-15]).
 */
function sectionDesRampes(contexte: Contexte, mode: Mode, encres: Encres): NoeudCadre {
  const { analyse, palette, recette } = contexte;
  const intensites = intensitesDe(palette);
  const confondus = analyse.confusions.some((confusion) => confusion.mode === mode);
  const note = confondus ? `${TEXTES_DE_LA_PLANCHE.noteDuRepere} ${TEXTES_DE_LA_PLANCHE.noteDesConfondus}` : TEXTES_DE_LA_PLANCHE.noteDuRepere;
  return cadre(intensites.length === 1 ? 'la rampe' : 'les deux rampes', 'VERTICAL', [
    texte('titre', intensites.length === 1 ? TEXTES_DE_LA_PLANCHE.rampe : TEXTES_DE_LA_PLANCHE.rampes, 'theme', encres.encre),
    numeros(contexte, encres),
    ...intensites.map((intensite) => rangeeDeRampe(contexte, intensite, mode, encres)),
    ...(recette.contenuDesPlanches.note ? [texte('note', note, 'note', encres.seconde)] : []),
  ]);
}

/* Quelle nuance pour quelle variable */

/** Ce qu'une section lit : une intensité, un mode, et la table du sens que le texte des boutons du mode décide (S1, I6). */
interface Tranche {
  readonly intensite: Intensite;
  readonly mode: Mode;
  readonly sens: SensDuTheme;
}

type Dossier = (typeof DOSSIERS)[number];

/** Les variables de chaque ligne, dans l'ordre de la planche. `page` n'a pas d'états : ses quatre variables se suivent. */
const VARIABLES_DU_DOSSIER: Readonly<Record<Dossier, readonly VariableDePalette[]>> = {
  solid: ['solid/default', 'solid/hover', 'solid/pressed'],
  surface: ['surface/default', 'surface/hover', 'surface/pressed'],
  page: ['page/foreground', 'page/border', 'page/focus', 'page/divider'],
};

/**
 * La largeur d'une cellule de `page`. Les quatre tiennent dans les trois
 * colonnes d'états : 96 + 96 + 104 + 96, et trois espacements de 8, font 416 px,
 * soit 3 × 128 et deux espacements de 16.
 */
const LARGEUR_PAGE = { cellule: 96, anneau: SPECIMEN.largeur + TRAME } as const;

const estPresente = (contexte: Contexte, tranche: Tranche, variable: VariableDePalette): boolean =>
  variablePresente(variable, contexte.analyse.grille.crans, tranche.sens);

/** Le cran d'une variable de la table, ou `null` pour le texte des boutons, qui n'a pas de cran. */
function cranDeLaTable(tranche: Tranche, variable: VariableDePalette): number | null {
  const cran = TABLE_DES_DOSSIERS[tranche.sens][variable];
  return cran === 'texteDesBoutons' ? null : cran;
}

/** La couleur d'une variable présente : un cran de la rampe, ou le blanc ou le noir purs du texte des boutons. */
function couleurDeLaVariable(contexte: Contexte, tranche: Tranche, variable: VariableDePalette): Rgb8 {
  const cran = cranDeLaTable(tranche, variable);
  if (cran === null) return hexaLu(COULEUR_DU_TEXTE_DES_BOUTONS[contexte.recette.texteDesBoutons[tranche.mode]]);
  return nuance(contexte, tranche.intensite, tranche.mode, cran).couleur;
}

/**
 * Le spécimen d'une variable, peint de sa couleur dans le sens du mode : un
 * bouton pour `solid`, un fond teinté qui porte le texte et le contour de son
 * dossier pour `surface`, puis un lien, un champ, un anneau et un filet pour
 * `page`.
 */
function specimen(contexte: Contexte, tranche: Tranche, variable: VariableDePalette, encres: Encres): NoeudCadre {
  const peindre = (cible: VariableDePalette) => peinture(couleurDeLaVariable(contexte, tranche, cible), contexte.profil);
  const fond = peinture(encres.fond, contexte.profil);
  const boite = { largeur: SPECIMEN.largeur, hauteur: SPECIMEN.hauteur, rayon: 6 };
  const a = TEXTES_DES_DOSSIERS_DE_LA_PLANCHE.specimens;
  const contour = (cible: VariableDePalette): Trait | undefined =>
    estPresente(contexte, tranche, cible) ? { couleur: peindre(cible), epaisseur: 1, tirets: false } : undefined;
  const champ = (): NoeudCadre => {
    const trait = contour('page/border');
    return cadre('champ', 'HORIZONTAL', [texte('libellé', a.champ, 'valeur', encres.encre)], {
      ...boite, fond, ...(trait ? { trait } : {}), margeLaterale: TRAME, alignement: A_GAUCHE,
    });
  };
  switch (variable) {
    case 'solid/default':
    case 'solid/hover':
    case 'solid/pressed':
      return cadre('spécimen', 'HORIZONTAL', [texte('libellé', a.solid, 'role', peindre('solid/foreground'))], { ...boite, fond: peindre(variable), alignement: CENTRE });
    case 'surface/default':
    case 'surface/hover':
    case 'surface/pressed': {
      const trait = contour('surface/border');
      const encre = estPresente(contexte, tranche, 'surface/foreground') ? peindre('surface/foreground') : peinture(encres.fond, contexte.profil);
      return cadre('spécimen', 'HORIZONTAL', [texte('libellé', a.surface, 'role', encre)], {
        ...boite, fond: peindre(variable), ...(trait ? { trait } : {}), margeLaterale: TRAME, alignement: A_GAUCHE,
      });
    }
    case 'page/foreground':
      return cadre('spécimen', 'HORIZONTAL', [texte('libellé', a.lien, 'role', peindre(variable))], { ...boite, alignement: A_GAUCHE });
    case 'page/border':
      return cadre('spécimen', 'HORIZONTAL', [champ()], { ...boite, alignement: A_GAUCHE });
    case 'page/focus':
      return cadre('spécimen', 'HORIZONTAL', [champ()], {
        largeur: LARGEUR_PAGE.anneau, hauteur: SPECIMEN.hauteur + TRAME, rayon: 8, trait: { couleur: peindre(variable), epaisseur: 2, tirets: false }, alignement: CENTRE,
      });
    default:
      return cadre('spécimen', 'HORIZONTAL', [cadre('trait', 'HORIZONTAL', [], { fond: peindre(variable), largeur: SPECIMEN.largeur, hauteur: 1 })], { ...boite, alignement: A_GAUCHE });
  }
}

/** Une garantie jugée, rangée sous la cellule qui la porte. */
interface LigneDeGarantie {
  readonly cellule: VariableDePalette;
  /** Le nom du calque : les deux variables, jamais un numéro. */
  readonly nom: string;
  readonly sens: string;
  readonly seuil: Garantie['seuil'];
  readonly promesse: Promesse;
}

/** Le texte des boutons, le texte et le contour de `surface` n'ont pas de cellule : leurs garanties les nomment. */
const NOM_DU_MEMBRE_SANS_CELLULE: Partial<Record<VariableDePalette, string>> = {
  'solid/foreground': 'solid/foreground',
  'surface/foreground': TEXTES_DES_DOSSIERS_DE_LA_PLANCHE.texte,
  'surface/border': TEXTES_DES_DOSSIERS_DE_LA_PLANCHE.contour,
};

/**
 * Les garanties d'une tranche, lues dans les promesses du moteur : la planche
 * ne juge rien. Une garantie dont le premier membre a sa cellule s'y lit,
 * « sur » son fond. Sinon, elle se lit sous le fond qu'elle juge, « dessus » ;
 * le texte et le contour de `surface` contre la page se lisent sous
 * `surface/default`.
 */
function garantiesDeLaTranche(contexte: Contexte, tranche: Tranche): LigneDeGarantie[] {
  const { sur, dessus } = TEXTES_DU_DETAIL;
  const laPage = TEXTES_DES_DOSSIERS_DE_LA_PLANCHE.laPage;
  return GARANTIES.flatMap((garantie) => {
    const jugees = contexte.analyse.promesses.filter((promesse) =>
      promesse.mode === tranche.mode && promesse.profil === tranche.intensite && promesse.garantie.numero === garantie.numero);
    const premier = garantie.premier.variable;
    const membre = NOM_DU_MEMBRE_SANS_CELLULE[premier];
    return garantie.fonds.flatMap((fond, rang): LigneDeGarantie[] => {
      const promesse = jugees[rang];
      if (!promesse) return [];
      const nom = `garantie ${premier} sur ${'variable' in fond ? fond.variable : 'page'}`;
      const ligne = { nom, seuil: garantie.seuil, promesse };
      if (membre === undefined) return [{ ...ligne, cellule: premier, sens: sur('variable' in fond ? fond.variable : laPage) }];
      if ('variable' in fond) return [{ ...ligne, cellule: fond.variable, sens: dessus(membre) }];
      return [{ ...ligne, cellule: 'surface/default', sens: `${membre} ${sur(laPage)}` }];
    });
  });
}

/** Une cellule : le spécimen, le nom de sa variable et sa nuance, puis les garanties qu'elle porte. */
function cellule(contexte: Contexte, tranche: Tranche, variable: VariableDePalette, encres: Encres, garanties: readonly LigneDeGarantie[], largeur: number): NoeudCadre {
  const cran = cranDeLaTable(tranche, variable);
  const lignes = garanties.filter((ligne) => ligne.cellule === variable).map(({ nom, sens, seuil, promesse }) => {
    const niveau = niveauEcrit(promesse.contraste, jugementDuSeuil(seuil)).ecrit;
    const tenue = promesse.verdict === 'tenue';
    return texte(nom, `${TEXTES_DU_DETAIL.garantie(tenue, sens, promesse.contraste)} · ${niveau}`, tenue ? 'note' : 'chiffre', tenue ? encres.seconde : encres.danger, largeur);
  });
  return cadre(variable.replace('/', ' '), 'VERTICAL', [
    specimen(contexte, tranche, variable, encres),
    cadre('mesures', 'VERTICAL', [
      texte('variable', `${variable} · ${cran}`, 'chiffre', encres.encre, largeur),
      ...lignes,
      // Le filet ne promet aucun contraste : la cellule le dit, au lieu de rester muette.
      ...(variable === 'page/divider' ? [texte('sans minimum', TEXTES_DES_DOSSIERS_DE_LA_PLANCHE.sansMinimum, 'note', encres.seconde, largeur)] : []),
    ], { espacement: 0 }),
  ], { largeur });
}

/**
 * La ligne d'un dossier : son rôle, son code et ses exemples, le texte et le
 * contour qu'il porte dits une fois, puis une cellule par état. `page` n'a
 * pas d'états : ses quatre variables se suivent sous les colonnes d'états.
 */
function ligneDeDossier(contexte: Contexte, tranche: Tranche, dossier: Dossier, encres: Encres, garanties: readonly LigneDeGarantie[]): NoeudCadre | null {
  const variables = VARIABLES_DU_DOSSIER[dossier];
  if (!variables.some((variable) => estPresente(contexte, tranche, variable))) return null;
  const t = TEXTES_DES_DOSSIERS_DE_LA_PLANCHE;
  const cranDuTexte = cranDeLaTable(tranche, 'surface/foreground');
  const dites = dossier === 'solid' && estPresente(contexte, tranche, 'solid/foreground')
    ? [t.texteDeSolid(contexte.recette.texteDesBoutons[tranche.mode])]
    : dossier === 'surface' && cranDuTexte !== null && estPresente(contexte, tranche, 'surface/foreground') ? [t.texteEtContourDeSurface(cranDuTexte)] : [];
  const neutre = dossier === 'page' && estLaPaletteNeutre(contexte.palette);
  const largeurDe = (variable: VariableDePalette): number =>
    dossier !== 'page' ? USAGE.etat : variable === 'page/focus' ? LARGEUR_PAGE.anneau : LARGEUR_PAGE.cellule;
  const cellules = variables.map((variable) =>
    estPresente(contexte, tranche, variable)
      ? cellule(contexte, tranche, variable, encres, garanties, largeurDe(variable))
      : espace(largeurDe(variable), 1));
  return cadre(`dossier ${dossier}`, 'HORIZONTAL', [
    cadre('libellés', 'VERTICAL', [
      texte('rôle', t.dossiers[dossier].role, 'role', encres.encre, USAGE.libelle),
      texte('dossier', dossier, 'note', encres.seconde, USAGE.libelle),
      texte('exemples', t.dossiers[dossier].exemples, 'note', encres.seconde, USAGE.libelle),
      ...dites.map((dite) => texte('encres', dite, 'note', encres.encre, USAGE.libelle)),
      ...(neutre ? [texte('neutre', t.noteDuNeutre, 'note', encres.seconde, USAGE.libelle)] : []),
    ], { espacement: 0, largeur: USAGE.libelle }),
    ...(dossier === 'page' ? [cadre('variables', 'HORIZONTAL', cellules, { espacement: TRAME })] : cellules),
  ], { espacement: 2 * TRAME });
}

/**
 * Les variables d'une intensité ([PLA-18]), dans le sens du mode : « · Soft »
 * ou « · Vivid » au titre d'une palette à deux intensités, rien pour la
 * rampe d'une palette à une intensité.
 */
function sectionDesVariables(contexte: Contexte, intensite: Intensite, mode: Mode, encres: Encres, largeur: number): NoeudCadre {
  const tranche: Tranche = { intensite, mode, sens: sensDuTheme(mode, contexte.recette.texteDesBoutons[mode]) };
  const garanties = garantiesDeLaTranche(contexte, tranche);
  const entete = cadre('états', 'HORIZONTAL', [
    espace(USAGE.libelle, 1),
    ...ETATS.map((etat) => texte(etat, etat, 'chiffre', encres.seconde, USAGE.etat)),
  ], { espacement: 2 * TRAME });
  const titre = TEXTES_DES_DOSSIERS_DE_LA_PLANCHE.titre(intensite === 'unique' ? null : NOM_DU_PROFIL[intensite]);
  const lignes = DOSSIERS.flatMap((dossier) => {
    const ligne = ligneDeDossier(contexte, tranche, dossier, encres, garanties);
    return ligne ? [filet(encres.filet), ligne] : [];
  });
  return cadre(intensite === 'unique' ? 'quelle nuance pour quelle variable' : `quelle nuance pour quelle variable ${intensite}`, 'VERTICAL', [
    texte('titre', titre, 'theme', encres.encre),
    entete,
    ...lignes,
  ], { espacement: 2 * TRAME, largeur });
}

/* Les contrastes, nuance par nuance */

/**
 * La grille d'une intensité, sous ses pastilles et dans leurs colonnes : la
 * ligne donne le fond, la colonne le texte. Une paire à 3:1 ou plus se peint
 * telle qu'elle se lira, le ratio en gras à partir du minimum des textes,
 * suivi du niveau WCAG qu'un texte y atteint ; en dessous de 3:1, la case
 * s'efface ([PLA-16], [VER-13]).
 */
function grilleDuProfil(contexte: Contexte, intensite: Intensite, mode: Mode, encres: Encres): NoeudCadre {
  const { recette, analyse } = contexte;
  const { crans } = analyse.grille;
  const rampe = rampeDe(analyse.rampes, intensite)[mode];
  const suffixe = intensite === 'unique' ? '' : ` ${intensite}`;
  const tete = cadre(`teintes${suffixe}`, 'HORIZONTAL', [
    intensite === 'unique' ? espace(COLONNE.libelle, 1) : texte('profil', NOM_DU_PROFIL[intensite], 'role', encres.encre, COLONNE.libelle),
    ...rampe.map((cran, rang) => cadre(`teinte ${crans[rang]}`, 'HORIZONTAL', [], { fond: peinture(cran.couleur, contexte.profil), largeur: COLONNE.largeur, hauteur: 24, rayon: 6 })),
  ]);
  const lignes = rampe.map((fond, i) => cadre(`fond ${crans[i]}`, 'HORIZONTAL', [
    cadre('nuance', 'HORIZONTAL', [
      cadre('teinte', 'HORIZONTAL', [], { fond: peinture(fond.couleur, contexte.profil), largeur: 12, hauteur: 12, rayon: 3 }),
      texte('numéro', String(crans[i]), 'chiffre', encres.seconde),
    ], { largeur: COLONNE.libelle, alignement: A_GAUCHE }),
    ...rampe.map((lettre, j) => {
      const nom = `${crans[i]}/${crans[j]}`;
      if (i === j) return cadre(nom, 'HORIZONTAL', [], { largeur: COLONNE.largeur, hauteur: 24 });
      const valeur = contraste(fond.couleur, lettre.couleur);
      const lisible = atteintLeSeuil(valeur, recette.seuils.nonTexte);
      const niveau = niveauEcrit(valeur, 'texte');
      const ecrit = niveau.atteint ? `${ecrireContraste(valeur)} ${niveau.ecrit}` : ecrireContraste(valeur);
      return cadre(nom, 'HORIZONTAL', [
        texte('contraste', ecrit, atteintLeSeuil(valeur, recette.seuils.texte) ? 'chiffre' : 'note', lisible ? peinture(lettre.couleur, contexte.profil) : encres.seconde),
      ], { fond: lisible ? peinture(fond.couleur, contexte.profil) : encres.neutre, largeur: COLONNE.largeur, hauteur: 24, rayon: 4, alignement: CENTRE });
    }),
  ]));
  return cadre(`grille ${mode}${suffixe}`, 'VERTICAL', [tete, ...lignes]);
}

function sectionDesContrastes(contexte: Contexte, mode: Mode, encres: Encres, largeur: number): NoeudCadre {
  return cadre('contrastes', 'VERTICAL', [
    cadre('en-tête', 'HORIZONTAL', [
      texte('titre', TEXTES_DE_LA_PLANCHE.contrastes, 'theme', encres.encre),
      texte('légende', legendeDesContrastes(contexte.recette.seuils), 'note', encres.seconde),
    ], { largeur, alignement: { principal: 'SPACE_BETWEEN', secondaire: 'CENTER' } }),
    ...intensitesDe(contexte.palette).map((intensite) => grilleDuProfil(contexte, intensite, mode, encres)),
  ], { espacement: 2 * TRAME });
}

/* Le cadre */

/**
 * Un thème : son en-tête et son verdict, puis les rampes, les variables de
 * chaque intensité et les grilles, selon le contenu rangé ([PLA-28]). Une
 * palette libre sort du modèle : pas de variables, et son en-tête dit « Palette
 * libre · N nuances » à la place du verdict (W6.6).
 */
function sectionDuTheme(contexte: Contexte, mode: Mode): NoeudCadre {
  const { recette, analyse } = contexte;
  const encres = encresDuTheme(hexaLu(recette.fonds[mode]), contexte.profil);
  const largeur = COLONNE.libelle + analyse.grille.crans.length * (COLONNE.largeur + TRAME);
  const manquees = analyse.promesses.filter((promesse) => promesse.mode === mode && promesse.verdict === 'manquee').length;
  const resultat = analyse.libre ? TEXTES.paletteLibre(analyse.grille.crans.length) : verdictDuTheme(manquees);
  const verdict = cadre('verdict', 'HORIZONTAL', [texte('résultat', resultat, 'chiffre', manquees > 0 ? encres.danger : encres.encre)], {
    fond: encres.neutre, hauteur: 24, margeLaterale: TRAME, rayon: 12, alignement: CENTRE,
  });
  const section = (enfant: NoeudCadre): NoeudCadre[] => [filet(encres.filet), enfant];
  const { contenuDesPlanches: contenu } = recette;
  const usages = analyse.libre || !contenu.usages ? [] : intensitesDe(contexte.palette).flatMap((intensite) => section(sectionDesVariables(contexte, intensite, mode, encres, largeur)));
  return cadre(`thème ${mode}`, 'VERTICAL', [
    cadre('en-tête', 'HORIZONTAL', [texte('titre', enTeteDuThemeDeLaPlanche(mode, recette.fonds[mode], recette.texteDesBoutons[mode]), 'chiffre', encres.seconde), verdict], {
      largeur, alignement: { principal: 'SPACE_BETWEEN', secondaire: 'CENTER' },
    }),
    sectionDesRampes(contexte, mode, encres),
    ...usages,
    ...(contenu.grilles ? section(sectionDesContrastes(contexte, mode, encres, largeur)) : []),
  ], {
    fond: peinture(encres.fond, contexte.profil),
    trait: { couleur: peinture(hexaLu(COULEURS_DE_LA_PLANCHE.filet), contexte.profil), epaisseur: 1, tirets: false },
    marge: 3 * TRAME,
    espacement: 3 * TRAME,
    rayon: 12,
  });
}

function construire(recette: Recette, palette: Palette, profil: ProfilDuDocument, peints: { nom: string; hexa: string }[]): NoeudCadre {
  const analyse = analyserPalette(recette, palette);
  const contexte: Contexte = { recette, palette, profil, analyse, peints };
  const blanc = hexaLu(COULEURS_DE_LA_PLANCHE.fondDuCadre);
  return cadre(nomDeLaPalette(palette), 'VERTICAL', [
    cadre('en-tête', 'VERTICAL', [
      texte('titre', nomDeLaPalette(palette), 'palette', peinture(hexaLu(COULEURS_DE_LA_PLANCHE.encre), profil)),
      texte('référence', enTeteDeLaReference(ecrireHexa(referenceDe(palette)), analyse.ancrage), 'valeur', peinture(hexaLu(COULEURS_DE_LA_PLANCHE.encreSecondaire), profil)),
    ]),
    ...MODES.filter((mode) => recette.contenuDesPlanches[mode]).map((mode) => sectionDuTheme(contexte, mode)),
  ], { fond: peinture(blanc, profil), marge: 3 * TRAME, espacement: 2 * TRAME, rayon: TRAME });
}

/**
 * L'empreinte du modèle du cadre d'une palette ([PLA-19], E2) : elle change
 * avec tout ce que le cadre montre, styles de texte et parties dessinées
 * compris, et seulement avec cela (V10.10). Aucun texte du cadre ne
 * l'imprime ([PLA-07]) : elle se range dans les données de plugin du cadre.
 */
export function empreinteDuModele(recette: Recette, palette: Palette, profil: ProfilDuDocument): string {
  return empreinte({ styles: STYLES_DE_TEXTE, racine: construire(recette, palette, profil, []) });
}

/** Le modèle du cadre d'une palette, et son empreinte. */
export function modeleDeCadre(recette: Recette, palette: Palette, profil: ProfilDuDocument): ModeleDeCadre {
  const peints: { nom: string; hexa: string }[] = [];
  const racine = construire(recette, palette, profil, peints);
  return { palette: palette.id, nom: nomDeLaPalette(palette), empreinte: empreinte({ styles: STYLES_DE_TEXTE, racine }), racine, peints };
}

/** Les calques de chaque partie d'un cadre que le designer peut retirer ([PLA-28]), comptés sur le cadre complet. */
export interface CalquesDesParties {
  readonly total: number;
  readonly note: number;
  readonly usages: number;
  readonly grilles: number;
  readonly light: number;
  readonly dark: number;
}

/**
 * Ce que chaque partie pèse dans le cadre d'une palette : le cadre complet,
 * moins le cadre sans elle. La carte « Contenu des planches » les écrit.
 */
export function calquesDesParties(recette: Recette, palette: Palette, profil: ProfilDuDocument): CalquesDesParties {
  const complete = { ...recette, contenuDesPlanches: { note: true, usages: true, grilles: true, light: true, dark: true } };
  const total = compterCalques(construire(complete, palette, profil, []));
  const sans = (partie: keyof CalquesDesParties) =>
    total - compterCalques(construire({ ...complete, contenuDesPlanches: { ...complete.contenuDesPlanches, [partie]: false } }, palette, profil, []));
  return { total, note: sans('note'), usages: sans('usages'), grilles: sans('grilles'), light: sans('light'), dark: sans('dark') };
}

/** Le nombre de calques qu'un modèle pose, racine comprise. */
export function compterCalques(noeud: Noeud): number {
  return noeud.type === 'texte' ? 1 : 1 + noeud.enfants.reduce((total, enfant) => total + compterCalques(enfant), 0);
}

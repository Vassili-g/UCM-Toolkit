/**
 * Le modèle du banc d'essai du moteur : les rampes d'une recette, les couleurs du
 * thème que chaque palette rend, et les contrastes que les composants du banc
 * posent. Le module est pur et sans DOM : la page le rejoue à chaque réglage,
 * les tests le lisent dans Node.
 *
 * Le banc essaie des règles que le kit n'a pas : une table des dossiers
 * modifiée, `surface/divider`, des garanties qui ignorent les fonds survolés ou
 * appuyés. Sans réglage, la table et les garanties sont celles du kit, et les
 * promesses jugées égalent `verifierPromesses`.
 */
import {
  COULEUR_DU_TEXTE_DES_BOUTONS,
  GARANTIES,
  MODES,
  TABLE_DES_DOSSIERS,
  VARIABLES_DE_PALETTE,
  VARIABLES_GLOBALES,
  ancrageDe,
  atteintLeSeuil,
  boutsDe,
  classerRecette,
  contraste,
  couleurDeLaCarte,
  cranDeLaVariable,
  distanceOk,
  ecrireHexa,
  estPaletteGrise,
  intensitesDe,
  lireHexa,
  prereglageTailwind,
  rampesDe,
  recetteParDefaut,
  rgb8VersOklch,
  sensDuTheme,
  type Ancrage,
  type Cran,
  type Garantie,
  type Intensite,
  type Mode,
  type Palette,
  type Rampes,
  type Recette,
  type Rgb8,
  type VariableDePalette,
  type VariableGlobale,
} from 'ucm-couleur';

/** La variable à l'essai de la piste 7.1 de `PISTES-EVOLUTION.md` : un contour discret sur fond teinté. */
export const CONTOUR_DISCRET = 'surface/divider';
export type VariableDuBanc = VariableDePalette | typeof CONTOUR_DISCRET | VariableGlobale;
export const VARIABLES_DU_BANC: readonly VariableDuBanc[] = [...VARIABLES_DE_PALETTE, CONTOUR_DISCRET, ...VARIABLES_GLOBALES];
export const CRANS_DU_CONTOUR_DISCRET: Readonly<Record<Mode, number>> = { light: 300, dark: 500 };

export type CranDeTable = number | 'texteDesBoutons';
export type TableDuBanc = Readonly<Record<Mode, Readonly<Record<VariableDuBanc, CranDeTable>>>>;
export type TableModifiee = { readonly [M in Mode]?: { readonly [V in VariableDuBanc]?: CranDeTable } };

export interface Exigences {
  /** Faux : les garanties ne se jugent plus contre `solid/hover` ni `surface/hover`. */
  readonly fondsSurvoles: boolean;
  /** Faux : les garanties ne se jugent plus contre `solid/pressed` ni `surface/pressed` (piste 7.2). */
  readonly fondsAppuyes: boolean;
}
export const EXIGENCES_DU_KIT: Exigences = { fondsSurvoles: true, fondsAppuyes: true };

/** Ce que le banc essaie par-dessus la recette. */
export interface Essai {
  readonly table: TableModifiee;
  readonly exigences: Exigences;
}
export const ESSAI_VIDE: Essai = { table: {}, exigences: EXIGENCES_DU_KIT };

/** La table du kit dans le sens que le texte des boutons donne à chaque mode, avec le contour discret et les couleurs désactivées, puis les crans modifiés. */
export function tableDuBanc(recette: Recette, modifiee: TableModifiee = {}): TableDuBanc {
  const table = {} as Record<Mode, Record<VariableDuBanc, CranDeTable>>;
  for (const mode of MODES) {
    const sens = sensDuTheme(mode, recette.texteDesBoutons[mode]);
    const globales = Object.fromEntries(VARIABLES_GLOBALES.map((variable) => [variable, cranDeLaVariable(variable, mode, sens) as number]));
    table[mode] = { ...TABLE_DES_DOSSIERS[mode][sens], [CONTOUR_DISCRET]: CRANS_DU_CONTOUR_DISCRET[mode], ...globales, ...modifiee[mode] } as Record<VariableDuBanc, CranDeTable>;
  }
  return table;
}

/** Une couleur rendue : ses octets et son écriture, et le cran qu'elle vise quand elle en vise un. */
export interface Teinte {
  readonly hexa: string;
  readonly couleur: Rgb8;
  readonly cran?: number;
}

function teinte(couleur: Rgb8, cran?: number): Teinte {
  return { hexa: ecrireHexa(couleur), couleur, ...(cran === undefined ? {} : { cran }) };
}

/** Une palette lue contre la recette. */
export interface PaletteDuBanc {
  readonly rang: number;
  readonly nom: string;
  readonly reference: string;
  readonly palette: Palette;
  readonly intensites: readonly Intensite[];
  readonly rampes: Rampes;
  readonly ancrage: Ancrage;
  /** Une palette libre ou figée sort du modèle des dossiers : elle n'a ni variables de thème ni mesures. */
  readonly aDesDossiers: boolean;
  /** Une palette grise ou un gris teinté, comme Slate : sa référence porte une chroma OKLCH sous `CHROMA_DES_GRIS`. */
  readonly grise: boolean;
}

/** La chroma sous laquelle une référence est un gris teinté : Slate de Tailwind porte 0,04. */
export const CHROMA_DES_GRIS = 0.05;

/** Les couleurs qu'une palette rend dans une intensité et un mode : ce que les composants du banc lisent. */
export interface Jeu {
  readonly palette: PaletteDuBanc;
  readonly intensite: Intensite;
  readonly mode: Mode;
  readonly rampe: readonly Cran[];
  readonly page: Teinte;
  readonly carte: Teinte;
  readonly texteDesBoutons: Teinte;
  /** `undefined` quand la liste des nuances ne porte pas le cran que la table vise. */
  readonly v: { readonly [V in VariableDuBanc]?: Teinte };
}

/** Les textes du neutre : ceux que le thème tire de la palette neutre. */
export interface Neutre {
  readonly principal: Teinte;
  readonly secondaire?: Teinte;
  readonly desactive: { readonly [V in VariableGlobale]?: Teinte };
}

export type Fond = 'page' | 'carte' | VariableDuBanc;

/**
 * Un contraste mesuré. `regle` vaut `G1` à `G7` pour une garantie du kit, `U…`
 * pour un usage que les composants posent sans garantie. `seuil` absent : la
 * mesure informe et n'a pas de verdict.
 */
export interface Mesure {
  readonly cle: string;
  readonly regle: string;
  readonly libelle: string;
  readonly palette: number;
  readonly intensite: Intensite;
  readonly mode: Mode;
  readonly premier: { readonly nom: string; readonly teinte: Teinte };
  readonly second: { readonly nom: string; readonly teinte: Teinte };
  readonly ratio: number;
  readonly seuil?: number;
  readonly tenue?: boolean;
}

/** Un contraste que les composants posent et que le kit ne garantit pas. */
export interface Usage {
  readonly id: string;
  readonly libelle: string;
  readonly premier: VariableDuBanc;
  readonly fond: Fond;
  readonly seuil?: 'texte' | 'nonTexte';
  /** Vrai : le premier membre vient de la rampe Vivid et le fond de la rampe Soft (un bouton Vivid dans une Alert Soft). */
  readonly croise?: boolean;
}

export const USAGES: readonly Usage[] = [
  { id: 'U1', libelle: 'Bouton Text posé sur un fond teinté, comme l’action d’une Alert', premier: 'page/foreground', fond: 'surface/default', seuil: 'texte' },
  { id: 'U2', libelle: 'Bouton Text Vivid dans une Alert Soft', premier: 'page/foreground', fond: 'surface/default', seuil: 'texte', croise: true },
  { id: 'U3', libelle: 'Anneau de focus sur un fond teinté', premier: 'ring', fond: 'surface/default', seuil: 'nonTexte' },
  { id: 'U4', libelle: 'Bouton plein ou barre de progression sur un fond teinté', premier: 'solid/default', fond: 'surface/default', seuil: 'nonTexte' },
  { id: 'U5', libelle: 'Texte coloré sur la carte', premier: 'page/foreground', fond: 'carte', seuil: 'texte' },
  { id: 'U6', libelle: 'Contour sur la carte', premier: 'page/border', fond: 'carte', seuil: 'nonTexte' },
  { id: 'U7', libelle: 'Bouton plein sur la carte', premier: 'solid/default', fond: 'carte', seuil: 'nonTexte' },
  { id: 'U8', libelle: 'Contour discret sur un fond teinté (surface/divider, essai)', premier: CONTOUR_DISCRET, fond: 'surface/default' },
  { id: 'U9', libelle: 'Filet sur la page', premier: 'page/divider', fond: 'page' },
];

/** Les usages propres au neutre : ses textes sur la carte, et ses couleurs désactivées, que WCAG n'oblige pas. */
export const USAGES_DU_NEUTRE = [
  { id: 'N1', libelle: 'Texte secondaire du neutre sur la carte', seuil: 'texte' },
  { id: 'N2', libelle: 'Texte désactivé sur la page', seuil: undefined },
  { id: 'N3', libelle: 'Contour désactivé sur la page', seuil: undefined },
] as const;

export interface Modele {
  readonly recette: Recette;
  readonly essai: Essai;
  readonly table: TableDuBanc;
  readonly palettes: readonly PaletteDuBanc[];
  readonly jeux: readonly Jeu[];
  /** Le rang de la palette neutre ; `undefined` sans palette grise ni choix. */
  readonly neutre?: number;
  readonly neutres: { readonly [M in Mode]?: Neutre };
  readonly mesures: readonly Mesure[];
}

const BLANC: Rgb8 = [255, 255, 255];
const NOIR: Rgb8 = [0, 0, 0];

function lirePalette(recette: Recette, palette: Palette, rang: number): PaletteDuBanc {
  const aDesDossiers = palette.crans === undefined && palette.figees === undefined;
  return {
    rang,
    nom: palette.nom ?? palette.reference,
    reference: palette.reference.toUpperCase(),
    palette,
    intensites: intensitesDe(palette),
    rampes: rampesDe(recette, palette),
    ancrage: ancrageDe(recette, palette),
    aDesDossiers,
    grise: aDesDossiers && (estPaletteGrise(recette, palette) || rgb8VersOklch(lireHexa(palette.reference) ?? [0, 0, 0]).C < CHROMA_DES_GRIS),
  };
}

function jeuDe(recette: Recette, table: TableDuBanc, palette: PaletteDuBanc, intensite: Intensite, mode: Mode): Jeu {
  const rampe = palette.rampes[intensite]![mode];
  const texte = lireHexa(COULEUR_DU_TEXTE_DES_BOUTONS[recette.texteDesBoutons[mode]])!;
  const v: { [V in VariableDuBanc]?: Teinte } = {};
  if (palette.aDesDossiers) {
    for (const variable of VARIABLES_DU_BANC) {
      const cran = table[mode][variable];
      if (cran === 'texteDesBoutons') {
        v[variable] = teinte(texte);
        continue;
      }
      const position = recette.crans.indexOf(cran);
      if (position >= 0) v[variable] = teinte(rampe[position].couleur, cran);
    }
  }
  return {
    palette,
    intensite,
    mode,
    rampe,
    page: teinte(lireHexa(recette.fonds[mode])!),
    carte: teinte(couleurDeLaCarte(recette, mode)),
    texteDesBoutons: teinte(texte),
    v,
  };
}

/** Les textes du neutre d'un mode, tirés de sa première intensité : noir ou blanc pour le texte principal, comme `scale/1000`. */
function neutreDe(jeu: Jeu): Neutre {
  const desactive: { [V in VariableGlobale]?: Teinte } = {};
  for (const variable of VARIABLES_GLOBALES) {
    const valeur = jeu.v[variable];
    if (valeur) desactive[variable] = valeur;
  }
  return {
    principal: teinte(jeu.mode === 'light' ? NOIR : BLANC),
    ...(jeu.v['page/foreground'] ? { secondaire: jeu.v['page/foreground'] } : {}),
    desactive,
  };
}

/** Les fonds d'une garantie que les exigences gardent. */
function fondsGardes(garantie: Garantie, exigences: Exigences): Garantie['fonds'] {
  return garantie.fonds.filter((fond) => {
    if (!('variable' in fond)) return true;
    if (!exigences.fondsSurvoles && fond.variable.endsWith('/hover')) return false;
    if (!exigences.fondsAppuyes && fond.variable.endsWith('/pressed')) return false;
    return true;
  });
}

function nomDuFond(fond: Fond): string {
  return fond === 'page' ? 'page' : fond === 'carte' ? 'carte' : fond;
}

function teinteDuFond(jeu: Jeu, fond: Fond): Teinte | undefined {
  return fond === 'page' ? jeu.page : fond === 'carte' ? jeu.carte : jeu.v[fond];
}

interface Mesurer {
  (regle: string, libelle: string, jeu: Jeu, premier: [string, Teinte | undefined], second: [string, Teinte | undefined], seuil: number | undefined, cle: string): void;
}

function mesuresDesJeux(recette: Recette, essai: Essai, jeux: readonly Jeu[], palettes: readonly PaletteDuBanc[], neutre: number | undefined, neutres: Modele['neutres']): Mesure[] {
  const mesures: Mesure[] = [];
  const seuils = recette.seuils;
  const mesurer: Mesurer = (regle, libelle, jeu, [nomPremier, premier], [nomSecond, second], seuil, cle) => {
    if (!premier || !second) return;
    const ratio = contraste(premier.couleur, second.couleur);
    mesures.push({
      cle: `${jeu.palette.rang}/${jeu.intensite}/${jeu.mode}/${cle}`,
      regle,
      libelle,
      palette: jeu.palette.rang,
      intensite: jeu.intensite,
      mode: jeu.mode,
      premier: { nom: nomPremier, teinte: premier },
      second: { nom: nomSecond, teinte: second },
      ratio,
      ...(seuil === undefined ? {} : { seuil, tenue: atteintLeSeuil(ratio, seuil) }),
    });
  };
  for (const jeu of jeux) {
    if (!jeu.palette.aDesDossiers) continue;
    for (const garantie of GARANTIES) {
      for (const fond of fondsGardes(garantie, essai.exigences)) {
        const second: Fond = 'variable' in fond ? fond.variable : 'fondDeLaPage' in fond ? 'page' : 'carte';
        mesurer(
          `G${garantie.numero}`,
          `Garantie ${garantie.numero}`,
          jeu,
          [garantie.premier.variable, jeu.v[garantie.premier.variable]],
          [nomDuFond(second), teinteDuFond(jeu, second)],
          seuils[garantie.seuil],
          `G${garantie.numero}/${nomDuFond(second)}`,
        );
      }
    }
    for (const usage of USAGES) {
      let source: Jeu = jeu;
      if (usage.croise) {
        if (jeu.intensite !== 'soft') continue;
        const vivid = jeux.find((autre) => autre.palette === jeu.palette && autre.intensite === 'vivid' && autre.mode === jeu.mode);
        if (!vivid) continue;
        source = vivid;
      }
      mesurer(
        usage.id,
        usage.libelle,
        jeu,
        [usage.croise ? `${usage.premier} (Vivid)` : usage.premier, source.v[usage.premier]],
        [usage.croise ? `${nomDuFond(usage.fond)} (Soft)` : nomDuFond(usage.fond), teinteDuFond(jeu, usage.fond)],
        usage.seuil ? seuils[usage.seuil] : undefined,
        usage.id,
      );
    }
  }
  if (neutre !== undefined) {
    for (const mode of MODES) {
      const valeurs = neutres[mode];
      const jeu = jeux.find((autre) => autre.palette.rang === neutre && autre.mode === mode && autre.intensite === palettes[neutre].intensites[0]);
      if (!valeurs || !jeu) continue;
      const [n1, n2, n3] = USAGES_DU_NEUTRE;
      mesurer(n1.id, n1.libelle, jeu, ['page/foreground-subtle', valeurs.secondaire], ['carte', jeu.carte], seuils.texte, n1.id);
      mesurer(n2.id, n2.libelle, jeu, ['disabled/foreground', valeurs.desactive['disabled/foreground']], ['page', jeu.page], undefined, n2.id);
      mesurer(n3.id, n3.libelle, jeu, ['disabled/border', valeurs.desactive['disabled/border']], ['page', jeu.page], undefined, n3.id);
    }
  }
  return mesures;
}

/**
 * Le modèle d'une recette sous un essai. `neutre` désigne la palette qui porte
 * les textes du neutre et les couleurs désactivées ; absent, la première
 * palette grise.
 */
export function construireModele(recette: Recette, essai: Essai = ESSAI_VIDE, neutre?: number): Modele {
  const table = tableDuBanc(recette, essai.table);
  const palettes = recette.palettes.map((palette, rang) => lirePalette(recette, palette, rang));
  const jeux = palettes.flatMap((palette) => palette.intensites.flatMap((intensite) => MODES.map((mode) => jeuDe(recette, table, palette, intensite, mode))));
  const rangNeutre = neutre !== undefined && palettes[neutre]?.aDesDossiers ? neutre : palettes.find((palette) => palette.grise)?.rang;
  const neutres: { [M in Mode]?: Neutre } = {};
  if (rangNeutre !== undefined) {
    for (const mode of MODES) {
      const jeu = jeux.find((autre) => autre.palette.rang === rangNeutre && autre.mode === mode && autre.intensite === palettes[rangNeutre].intensites[0]);
      if (jeu) neutres[mode] = neutreDe(jeu);
    }
  }
  return {
    recette,
    essai,
    table,
    palettes,
    jeux,
    ...(rangNeutre === undefined ? {} : { neutre: rangNeutre }),
    neutres,
    mesures: mesuresDesJeux(recette, essai, jeux, palettes, rangNeutre, neutres),
  };
}

/** Le jeu d'une palette ; une intensité que la palette ne porte pas rend son intensité unique ou la première. */
export function jeuDuModele(modele: Modele, rang: number, intensite: Intensite, mode: Mode): Jeu | undefined {
  const palette = modele.palettes[rang];
  if (!palette) return undefined;
  const portee = palette.intensites.includes(intensite) ? intensite : palette.intensites[0];
  return modele.jeux.find((jeu) => jeu.palette.rang === rang && jeu.intensite === portee && jeu.mode === mode);
}

/** Lecture OKLCH d'un cran, pour l'affichage. */
export interface Lecture {
  readonly hexa: string;
  readonly L: number;
  readonly C: number;
  readonly H: number;
}

/**
 * Les crans de chaque palette colorée à dossiers, rangés par position dans la
 * liste : ce que l'harmonisation compare. Une palette grise en sort : sa chroma
 * nulle tirerait la médiane vers le bas.
 */
export function harmonisation(modele: Modele, intensite: Intensite, mode: Mode): { readonly cran: number; readonly lectures: readonly (Lecture & { readonly palette: number })[] }[] {
  return modele.recette.crans.map((cran, position) => ({
    cran,
    lectures: modele.palettes
      .filter((palette) => palette.aDesDossiers && !palette.grise)
      .map((palette) => {
        const jeu = jeuDuModele(modele, palette.rang, intensite, mode)!;
        const { hexa, L, C, H } = jeu.rampe[position];
        return { palette: palette.rang, hexa, L, C, H };
      }),
  }));
}

/** Une famille du relevé Tailwind 3.4, en hexa par cran de 50 à 950. */
export type ReleveTailwind = Readonly<Record<string, Readonly<Record<string, string>>>>;
const FAMILLES_GRISES = ['slate', 'gray', 'zinc', 'neutral', 'stone'];

/** La famille Tailwind la plus proche d'une référence : par teinte au 500 pour une couleur, par distance au 500 pour un gris. */
export function familleTailwindProche(reference: string, releve: ReleveTailwind): string {
  const couleur = lireHexa(reference);
  if (!couleur) return Object.keys(releve)[0];
  const lu = rgb8VersOklch(couleur);
  const grise = lu.C < 0.04;
  let meilleure = '';
  let ecart = Infinity;
  for (const [nom, crans] of Object.entries(releve)) {
    if (FAMILLES_GRISES.includes(nom) !== grise) continue;
    const cinqCents = lireHexa(crans['500'])!;
    const valeur = grise ? distanceOk(couleur, cinqCents) : Math.abs(((rgb8VersOklch(cinqCents).H - lu.H + 540) % 360) - 180);
    if (valeur < ecart) {
      ecart = valeur;
      meilleure = nom;
    }
  }
  return meilleure;
}

/** L'écart ΔEok entre deux écritures hexa. */
export function ecartOk(a: string, b: string): number {
  return distanceOk(lireHexa(a)!, lireHexa(b)!);
}

/** Les palettes de démonstration : une marque, un neutre et les quatre statuts, au préréglage Tailwind. */
const PALETTES_DE_DEMONSTRATION: readonly (readonly [string, string, boolean])[] = [
  ['Terracota', '#B15152', false],
  ['Slate', '#64748B', true],
  ['Green', '#22C55E', false],
  ['Amber', '#F59E0B', false],
  ['Red', '#EF4444', false],
  ['Sky', '#0EA5E9', false],
];

export function recetteDeDemonstration(): Recette {
  const recette = recetteParDefaut();
  const bouts = boutsDe(recette);
  const palettes: Palette[] = PALETTES_DE_DEMONSTRATION.map(([nom, reference, unique], rang) => {
    const derive = prereglageTailwind(rgb8VersOklch(lireHexa(reference)!), bouts);
    return {
      id: `p-${(rang + 1).toString(16).padStart(8, '0')}`,
      nom,
      reference,
      derive: { lien: true, soft: { ...derive, origine: 'tailwind' }, vivid: { ...derive, origine: 'tailwind' } },
      ...(unique ? { intensites: 1 as const } : {}),
    };
  });
  return { ...recette, palettes };
}

/** Lit le texte d'une recette exportée par Palettes, aux formats 8 à 12. */
export function lireRecette(texte: string): { readonly recette: Recette } | { readonly erreur: string } {
  const classement = classerRecette(texte);
  switch (classement.etat) {
    case 'courante':
      return { recette: classement.recette };
    case 'absente':
      return { erreur: 'Le texte est vide.' };
    case 'future':
      return { erreur: `La recette est au format ${classement.version}, plus récent que ce banc. Régénérez le banc.` };
    case 'illisible':
      return { erreur: `Recette illisible : ${classement.refus.map((refus) => `${refus.regle} ${refus.chemin || '(racine)'}`).join(', ')}.` };
  }
}

export { MODES, contraste, ecrireHexa, lireHexa, rgb8VersOklch, type Intensite, type Mode, type Recette };

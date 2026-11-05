/**
 * Le composant de base des stress tests de liaisons et de tailles : un relevé et un catalogue cohérents, sans constat des
 * codes de la portée de F3 et F4, et la carte qui dit quel token chaque liaison vise. Les opérateurs de dégradation partent
 * d'une copie de ce composant et lisent la carte pour savoir ce que « juste » veut dire.
 *
 * Les familles F5 à F9 réutilisent ce générateur : `SpecDeComposant` accepte une liste d'axes libre, et les profils de F3
 * (`profils.ts`) n'en sont que six cas. Un layer se lie seulement aux tokens de son composant (`components`), qui visent
 * `theme` pour les couleurs et `layout` pour les tailles. Seules les instances imbriquées tiennent de leur composant
 * principal une liaison directe vers `theme` ou `layout`, avec la provenance `composant-principal`.
 */
import { cranDeLaVariable, SUPPORT_DES_VARIABLES, VARIABLES_DE_PALETTE, VARIABLES_GLOBALES, type ModeDuTheme } from '../../../src/emplois/dossiers.js';
import type {
  CatalogueDeReference, CollectionDuCatalogue, Constat, LayerLu, LiaisonLue, PeintureLue, ReleveDeComposant, VariableDuCatalogue, VariantLu,
} from '../../../src/controles/index.js';
import { controlerCouches, controlerLaStructure, controlerLeTheme, controlerMapping, proposerLesCorrections } from '../../../src/controles/index.js';
import { axeDePropriete, etatReconnu, type AxeDuComposant } from '../../../src/controles/nommage.js';
import type { Convention } from '../../../src/referentiel/conventions.js';
import { assembler, decouperSegment, motsAvecCasse } from '../../../src/referentiel/ecriture-des-mots.js';
import { formeReconnue, termeReconnu } from '../../../src/referentiel/reconnaissance.js';
import { CRANS, REGISTRE_TAILLES } from '../../../src/referentiel/vocabulaire.js';
import { graineDe, melanger, mulberry32 } from '../commun/prng.js';
import {
  PROPRIETES_DE_TAILLE, ROLES_DE_COULEUR,
  type AxeDeCarte, type CarteDuComposant, type JetonDeCarte, type LiaisonAttendue, type NomDeLayer, type ProprieteDeTaille, type RoleDeCouleur, type VariantDeCarte,
} from './carte.js';

export const GRAINE_PAR_DEFAUT = 7103;

/** Les codes que les contrôles de liaison, de taille, de thème et de structure de F3 et F4 émettent. */
export const CODES_DE_LA_PORTEE: readonly `C${number}`[] = ['C15', 'C16', 'C17', 'C18', 'C19', 'C20', 'C21', 'C22', 'C24', 'C25', 'C29', 'C59', 'C63', 'C80', 'C81'];

/** Un axe de variant du jeu. `segment` dit où son segment tombe dans le nom des tokens ; `null` l'en exclut. */
export interface AxeDeSpec {
  readonly nom: string;
  readonly valeurs: readonly string[];
  /** Absent : le rôle que `axeDePropriete` reconnaît au nom. Un axe hors liste (`Type`, `Tone`) le reçoit ici pour figurer dans les tokens. */
  readonly segment?: AxeDuComposant | null;
}

export interface SpecDeComposant {
  /** Le nom du jeu de variants, tel que Figma l'écrit (`Icon Button`). */
  readonly jeu: string;
  /** Dans l'ordre des propriétés du relevé. Aucun axe : un seul variant. */
  readonly axes: readonly AxeDeSpec[];
  /** Les combinaisons absentes du jeu. */
  readonly exclus?: readonly Readonly<Record<string, string>>[];
  /** `larges` : `ALL_FILLS` et `STROKE_COLOR`. `precis` : `FRAME_FILL`, `SHAPE_FILL`, `TEXT_FILL`, `STROKE_COLOR`. */
  readonly scopes: 'larges' | 'precis';
  /** Ajoute `Glyph` (dépendance), `.Bar` (pièce interne) et `SizeWrapper` (wrapper de dimensions) à chaque variant. */
  readonly imbriques: boolean;
  /** Le nombre de plages de couleurs du texte `Label`. */
  readonly plages: 1 | 2;
  /** Le nombre de modes de `components` : deux modes portent la même valeur. */
  readonly modesDeTaille: 1 | 2;
  /** Tire l'échelle de longueurs des tokens de taille. Défaut : 7103. */
  readonly graine?: number;
  /** L'écriture des segments des tokens. Défaut : minuscules et tirets. */
  readonly convention?: Convention;
  /** L'écriture d'une valeur d'axe dans un nom de token. Défaut : celle de la convention. */
  readonly ecritureDesValeurs?: (propriete: string, valeur: string) => string;
}

export interface ComposantDeBase {
  readonly spec: SpecDeComposant;
  readonly releve: ReleveDeComposant;
  readonly catalogue: CatalogueDeReference;
  readonly carte: CarteDuComposant;
}

const CONVENTION_PAR_DEFAUT: Convention = { casse: 'minuscules', separateur: 'tiret' };
const ORDRE_DES_SEGMENTS: readonly AxeDuComposant[] = ['palette', 'style', 'taille', 'etat'];
const PALETTES_DU_THEME = ['primary', 'neutral', 'danger'] as const;
type PaletteDuTheme = (typeof PALETTES_DU_THEME)[number];
const MODES_DU_THEME: readonly ModeDuTheme[] = ['light', 'dark'];

/** Les longueurs des tokens de taille ; l'épaisseur de trait a la sienne, plus fine. */
const ECHELLE_DE_LONGUEURS = [4, 8, 12, 16, 24] as const;
const ECHELLE_D_EPAISSEURS = [1, 2, 3, 4, 6] as const;
const VALEURS_DU_LAYOUT = [...new Set([...ECHELLE_DE_LONGUEURS, ...ECHELLE_D_EPAISSEURS])].sort((a, b) => a - b);

const PORTEES_LARGES: Record<RoleDeCouleur, readonly string[]> = {
  background: ['ALL_FILLS'], foreground: ['ALL_FILLS'], text: ['ALL_FILLS'], icon: ['ALL_FILLS'], border: ['STROKE_COLOR'], ring: ['STROKE_COLOR'],
};
const PORTEES_PRECISES: Record<RoleDeCouleur, readonly string[]> = {
  background: ['FRAME_FILL'], foreground: ['TEXT_FILL'], text: ['TEXT_FILL'], icon: ['SHAPE_FILL'], border: ['STROKE_COLOR'], ring: ['STROKE_COLOR'],
};
const PORTEES_DE_TAILLE: Record<ProprieteDeTaille, string> = {
  'padding-x': 'GAP', 'padding-y': 'GAP', gap: 'GAP', radius: 'CORNER_RADIUS', 'border-width': 'STROKE_FLOAT',
};

/** Les champs numériques de `Root`, et la propriété de composant qui les porte. */
const CHAMPS_DE_ROOT: readonly (readonly [champ: string, propriete: ProprieteDeTaille])[] = [
  ['paddingLeft', 'padding-x'], ['paddingRight', 'padding-x'], ['paddingTop', 'padding-y'], ['paddingBottom', 'padding-y'],
  ['itemSpacing', 'gap'], ['cornerRadius', 'radius'], ['strokeWeight', 'border-width'],
];

const BASES_DE_COULEUR: Record<PaletteDuTheme, readonly [number, number, number]> = {
  primary: [0.15, 0.35, 0.85], neutral: [0.5, 0.5, 0.55], danger: [0.85, 0.2, 0.2],
};

/** Une couleur de la rampe : mélangée au blanc sous le cran 500, au noir au-dessus. */
function couleurDeLaRampe(palette: PaletteDuTheme, cran: number): { r: number; g: number; b: number; a: number } {
  const [r, g, b] = BASES_DE_COULEUR[palette];
  const vers = cran <= 500 ? 1 : 0;
  const part = cran <= 500 ? ((500 - cran) / 500) * 0.95 : ((cran - 500) / 450) * 0.85;
  const melange = (v: number) => Math.round((v + (vers - v) * part) * 1000) / 1000;
  return { r: melange(r), g: melange(g), b: melange(b), a: 1 };
}

function ecrireur(convention: Convention): (texte: string) => string {
  const memoire = new Map<string, string>();
  return (texte) => {
    let ecrit = memoire.get(texte);
    if (ecrit === undefined) {
      ecrit = assembler(texte, motsAvecCasse(decouperSegment(texte), convention.casse), convention.separateur);
      memoire.set(texte, ecrit);
    }
    return ecrit;
  };
}

interface ContexteDeTheme { palette: PaletteDuTheme; plein: boolean; etat: 'default' | 'hover' | 'pressed' | 'disabled' }

/**
 * La variable de `theme` qu'un rôle vise. Seuls les axes que le kit reconnaît changent le rôle de thème (style, état) : un axe
 * hors liste n'a pas de segment lu, donc C21 ne le départagerait pas. La palette ne change que le préfixe.
 */
function cibleDeTheme({ palette, plein, etat }: ContexteDeTheme, role: RoleDeCouleur): string {
  if (etat === 'disabled' && role !== 'ring') return role === 'background' ? 'disabled/background' : role === 'border' ? 'disabled/border' : 'disabled/foreground';
  if (role === 'ring') return `${palette}/ring`;
  if (role === 'background') return `${palette}/${plein ? 'solid' : 'surface'}/${etat === 'disabled' ? 'default' : etat}`;
  if (role === 'border') return plein ? `${palette}/solid/${etat === 'disabled' ? 'default' : etat}` : `${palette}/surface/border`;
  return `${palette}/${plein ? 'solid' : 'surface'}/foreground`;
}

function paletteDuTheme(valeur: string | undefined): PaletteDuTheme {
  const forme = formeReconnue(valeur ?? '');
  if (forme === 'neutral') return 'neutral';
  if (['danger', 'error', 'critical'].includes(forme)) return 'danger';
  return 'primary';
}

function etatDuTheme(valeur: string | undefined): ContexteDeTheme['etat'] {
  const etat = valeur === undefined ? undefined : etatReconnu(valeur);
  return etat === 'hover' || etat === 'pressed' || etat === 'disabled' ? etat : 'default';
}

function combinaisonsDe(axes: readonly AxeDeSpec[], exclus: readonly Readonly<Record<string, string>>[]): Record<string, string>[] {
  let combinaisons: Record<string, string>[] = [{}];
  for (const axe of axes) combinaisons = combinaisons.flatMap((debut) => axe.valeurs.map((valeur) => ({ ...debut, [axe.nom]: valeur })));
  return combinaisons.filter((combinaison) => !exclus.some((exclu) => Object.entries(exclu).every(([nom, valeur]) => combinaison[nom] === valeur)));
}

/** Fabrique le relevé, le catalogue et la carte d'un composant sans constat de la portée. */
export function construireLeComposant(spec: SpecDeComposant): ComposantDeBase {
  const ecrire = ecrireur(spec.convention ?? CONVENTION_PAR_DEFAUT);
  const ecrireLaValeur = spec.ecritureDesValeurs ?? ((_propriete: string, valeur: string) => ecrire(valeur));
  const graine = spec.graine ?? GRAINE_PAR_DEFAUT;

  const axesDeCarte: AxeDeCarte[] = spec.axes.map((axe) => {
    const reconnu = axeDePropriete(axe.nom) ?? null;
    return { propriete: axe.nom, axe: reconnu, segment: axe.segment !== undefined ? axe.segment : reconnu, valeurs: axe.valeurs };
  });
  for (const role of ORDRE_DES_SEGMENTS) {
    if (axesDeCarte.filter((axe) => axe.segment === role).length > 1) throw new Error(`Deux axes de ${spec.jeu} ont le segment ${role}`);
  }
  const axeDuSegment = (role: AxeDuComposant): AxeDeCarte | undefined => axesDeCarte.find((axe) => axe.segment === role);
  const axeReconnu = (role: AxeDuComposant): AxeDeCarte | undefined => axesDeCarte.find((axe) => axe.axe === role);

  // Collections et modes.
  const modesDeComposants = (spec.modesDeTaille === 2 ? ['Default', 'Comfortable'] : ['Default']).map((nom, rang) => ({ id: `20:${rang}`, nom }));
  const modesDuTheme = [{ id: '30:0', nom: 'Light' }, { id: '30:1', nom: 'Dark' }];
  const modesDeBrands = [{ id: '40:0', nom: 'Light' }, { id: '40:1', nom: 'Dark' }];
  const collection = (cle: string, nom: CollectionDuCatalogue['role'] & string, modes: { id: string; nom: string }[]): CollectionDuCatalogue =>
    ({ cle, nom, role: nom as CollectionDuCatalogue['role'], modes, etat: 'lue' });
  const collections = {
    components: collection('col-components', 'components', modesDeComposants),
    theme: collection('col-theme', 'theme', modesDuTheme),
    brands: collection('col-brands', 'brands', modesDeBrands),
    utility: collection('col-utility', 'utility', [{ id: '70:0', nom: 'Mode 1' }]),
    primitives: collection('col-primitives', 'primitives', [{ id: '80:0', nom: 'Mode 1' }]),
    layout: collection('col-layout', 'layout', [{ id: '50:0', nom: 'Mode 1' }]),
    typography: collection('col-typography', 'typography', [{ id: '60:0', nom: 'Mode 1' }]),
  };

  // Variables : un compteur donne à chacune sa clé, dans l'ordre de fabrication.
  let compteur = 0;
  const variables: VariableDuCatalogue[] = [];
  const idDeVariable = new Map<string, string>();
  const ajouter = (variable: Omit<VariableDuCatalogue, 'cle' | 'etat'>): VariableDuCatalogue => {
    compteur += 1;
    const cle = `k${String(compteur).padStart(5, '0')}`;
    const entree: VariableDuCatalogue = { cle, etat: 'presente', ...variable };
    idDeVariable.set(cle, `VariableID:${compteur}:0`);
    variables.push(entree);
    return entree;
  };

  ajouter({ nom: 'color/primary/light/500', collection: collections.primitives.cle, type: 'COLOR', valeurs: { '80:0': { valeur: couleurDeLaRampe('primary', 500) } } });
  ajouter({ nom: 'dimension/none', collection: collections.primitives.cle, type: 'FLOAT', valeurs: { '80:0': { valeur: 0 } } });
  ajouter({ nom: 'neutral/light/500', collection: collections.utility.cle, type: 'COLOR', valeurs: { '70:0': { valeur: couleurDeLaRampe('neutral', 500) } } });
  ajouter({ nom: 'label/md/font-size', collection: collections.typography.cle, type: 'FLOAT', valeurs: { '60:0': { valeur: 14 } } });

  const brands = new Map<string, VariableDuCatalogue>();
  for (const palette of PALETTES_DU_THEME) {
    for (const mode of MODES_DU_THEME) {
      for (const cran of CRANS) {
        const valeur = { valeur: couleurDeLaRampe(palette, cran) };
        brands.set(`${palette}/${mode}/${cran}`, ajouter({ nom: `${palette}/${mode}/${cran}`, collection: collections.brands.cle, type: 'COLOR', valeurs: { '40:0': valeur, '40:1': valeur } }));
      }
    }
  }

  // `theme` : chaque variable vise la rampe de `brands` dans chaque mode, au cran de la table des dossiers.
  const cranDeBrands = (variable: string, mode: ModeDuTheme): number => {
    const cran = cranDeLaVariable(variable as Parameters<typeof cranDeLaVariable>[0], mode, 'normal');
    return typeof cran === 'number' ? cran : mode === 'light' ? 50 : 950;
  };
  const theme = new Map<string, VariableDuCatalogue>();
  const ajouterAuTheme = (nom: string, variable: keyof typeof SUPPORT_DES_VARIABLES, palette: PaletteDuTheme, cranPar: (mode: ModeDuTheme) => number): void => {
    const valeurs: Record<string, { alias: string }> = {};
    for (const [rang, mode] of MODES_DU_THEME.entries()) valeurs[modesDuTheme[rang].id] = { alias: brands.get(`${palette}/${mode}/${cranPar(mode)}`)!.cle };
    theme.set(nom, ajouter({ nom, collection: collections.theme.cle, type: 'COLOR', scopes: [...SUPPORT_DES_VARIABLES[variable].portees], valeurs }));
  };
  for (const palette of PALETTES_DU_THEME) {
    for (const variable of VARIABLES_DE_PALETTE) ajouterAuTheme(`${palette}/${variable}`, variable, palette, (mode) => cranDeBrands(variable, mode));
  }
  for (const variable of VARIABLES_GLOBALES) ajouterAuTheme(variable, variable, 'neutral', (mode) => cranDeBrands(variable, mode));
  ajouterAuTheme('elevation/page', 'elevation/page', 'neutral', (mode) => (mode === 'light' ? 50 : 950));
  ajouterAuTheme('elevation/raised', 'elevation/raised', 'neutral', (mode) => (mode === 'light' ? 100 : 900));

  const layout = new Map<number, VariableDuCatalogue>();
  for (const valeur of VALEURS_DU_LAYOUT) {
    layout.set(valeur, ajouter({ nom: `sizing/${valeur}`, collection: collections.layout.cle, type: 'FLOAT', valeurs: { '50:0': { valeur } } }));
  }

  // Les tokens de `components` : créés au premier besoin, pour chaque rôle et propriété de chaque variant.
  const jeu = ecrire(spec.jeu);
  const jetons: JetonDeCarte[] = [];
  const variablesDuJeu = new Map<string, { variable: VariableDuCatalogue; jeton: JetonDeCarte }>();
  const longueurs = new Map<string, readonly number[]>();
  const echelleDe = (propriete: ProprieteDeTaille): readonly number[] => {
    let echelle = longueurs.get(propriete);
    if (!echelle) {
      echelle = melanger(mulberry32(graineDe(graine, `echelle:${propriete}`)), propriete === 'border-width' ? ECHELLE_D_EPAISSEURS : ECHELLE_DE_LONGUEURS);
      longueurs.set(propriete, echelle);
    }
    return echelle;
  };
  const valeursDuNom = (famille: 'color' | 'size', valeurs: Readonly<Record<string, string>>): { segments: string[]; portees: Record<string, string> } => {
    const segments: string[] = [];
    const portees: Record<string, string> = {};
    for (const role of ORDRE_DES_SEGMENTS) {
      if (famille === 'size' && role !== 'taille') continue;
      const axe = axeDuSegment(role);
      if (!axe || valeurs[axe.propriete] === undefined) continue;
      // Un token écrit une taille par son identifiant (`sm`) quand la spec ne dit rien, le variant la dit en toutes lettres (Q-F5-6).
      const ecrite = role === 'taille' && !spec.ecritureDesValeurs ? termeReconnu(REGISTRE_TAILLES, valeurs[axe.propriete])?.id : undefined;
      segments.push(ecrite ?? ecrireLaValeur(axe.propriete, valeurs[axe.propriete]));
      portees[axe.propriete] = valeurs[axe.propriete];
    }
    return { segments, portees };
  };
  const contexteDe = (valeurs: Readonly<Record<string, string>>): ContexteDeTheme => {
    const axePalette = axeDuSegment('palette');
    const axeStyle = axeReconnu('style');
    const axeEtat = axeReconnu('etat');
    const forme = axeStyle ? formeReconnue(valeurs[axeStyle.propriete] ?? '') : 'solid';
    return {
      palette: paletteDuTheme(axePalette ? valeurs[axePalette.propriete] : undefined),
      plein: ['solid', 'contained', 'filled'].includes(forme),
      etat: etatDuTheme(axeEtat ? valeurs[axeEtat.propriete] : undefined),
    };
  };
  const jetonDeCouleur = (valeurs: Readonly<Record<string, string>>, role: RoleDeCouleur): { variable: VariableDuCatalogue; jeton: JetonDeCarte } => {
    const { segments, portees } = valeursDuNom('color', valeurs);
    const nom = [jeu, ecrire('color'), ...segments, ecrire(role)].join('/');
    const connu = variablesDuJeu.get(nom);
    if (connu) return connu;
    const cible = theme.get(cibleDeTheme(contexteDe(valeurs), role))!;
    const alias = Object.fromEntries(modesDeComposants.map((mode) => [mode.id, { alias: cible.cle }]));
    const variable = ajouter({
      nom, collection: collections.components.cle, type: 'COLOR',
      scopes: [...(spec.scopes === 'precis' ? PORTEES_PRECISES : PORTEES_LARGES)[role]], valeurs: alias,
    });
    const jeton: JetonDeCarte = { cle: variable.cle, nom, nature: 'couleur', role, valeurs: portees, cible: { cle: cible.cle, nom: cible.nom } };
    jetons.push(jeton);
    const entree = { variable, jeton };
    variablesDuJeu.set(nom, entree);
    return entree;
  };
  const jetonDeTaille = (valeurs: Readonly<Record<string, string>>, propriete: ProprieteDeTaille): { variable: VariableDuCatalogue; jeton: JetonDeCarte } => {
    const { segments, portees } = valeursDuNom('size', valeurs);
    const nom = [jeu, ecrire('size'), ...segments, ecrire(propriete)].join('/');
    const connu = variablesDuJeu.get(nom);
    if (connu) return connu;
    const axeTaille = axeDuSegment('taille');
    const rang = axeTaille ? Math.max(0, axeTaille.valeurs.indexOf(valeurs[axeTaille.propriete])) : 0;
    const pixels = echelleDe(propriete)[rang % echelleDe(propriete).length];
    const cible = layout.get(pixels)!;
    const alias = Object.fromEntries(modesDeComposants.map((mode) => [mode.id, { alias: cible.cle }]));
    const variable = ajouter({
      nom, collection: collections.components.cle, type: 'FLOAT',
      scopes: spec.scopes === 'precis' ? [PORTEES_DE_TAILLE[propriete]] : ['ALL_SCOPES'], valeurs: alias,
    });
    const jeton: JetonDeCarte = { cle: variable.cle, nom, nature: 'taille', propriete, valeurs: portees, cible: { cle: cible.cle, nom: cible.nom }, pixels };
    jetons.push(jeton);
    const entree = { variable, jeton };
    variablesDuJeu.set(nom, entree);
    return entree;
  };

  const combinaisons = combinaisonsDe(spec.axes, spec.exclus ?? []);
  for (const valeurs of combinaisons) {
    for (const role of ROLES_DE_COULEUR) jetonDeCouleur(valeurs, role);
    for (const propriete of PROPRIETES_DE_TAILLE) jetonDeTaille(valeurs, propriete);
  }

  // Le relevé : un variant par combinaison, les mêmes layers dans chacun.
  const proprietes: ReleveDeComposant['proprietes'] = spec.axes.map((axe) => ({ nom: axe.nom, type: 'VARIANT' as const, valeurs: [...axe.valeurs], defaut: axe.valeurs[0] }));
  if (spec.imbriques) proprietes.push({ nom: 'Icon#1:2', type: 'INSTANCE_SWAP', defaut: '1:2' });
  const variantsLus: VariantLu[] = [];
  const variantsDeCarte: VariantDeCarte[] = [];
  const liaisonsAttendues: LiaisonAttendue[] = [];
  const peinture = (champ: 'fills' | 'strokes'): PeintureLue => ({ champ, indice: 0, type: 'SOLID', visible: true, opacite: 1, blendMode: 'NORMAL', couleur: { r: 0.2, g: 0.4, b: 0.8, a: 1 } });
  const layerVide = (id: string, nom: string, type: string, parent: string | null, boite: readonly [number, number, number, number]): LayerLu => ({
    id, nom, type, parent, visible: true, opacite: 1,
    dimensions: { x: boite[0], y: boite[1], largeur: boite[2], hauteur: boite[3] },
    peintures: [], liaisons: [], valeursEnDur: [{ champ: 'width', valeur: boite[2] }, { champ: 'height', valeur: boite[3] }],
  });
  const variableLue = (variable: VariableDuCatalogue): LiaisonLue['variable'] =>
    ({ id: idDeVariable.get(variable.cle)!, cle: variable.cle, nom: variable.nom, collection: variable.collection, distante: false });

  let nombreDeLayers = 0;
  for (const [rang, valeurs] of combinaisons.entries()) {
    const variantId = `10:${rang + 1}`;
    const idDe = (ordre: number): string => `${20 + rang}:${ordre}`;
    const layers: LayerLu[] = [];
    const identifiants: Partial<Record<NomDeLayer, string>> = {};
    const nouveauLayer = (nom: NomDeLayer, ordre: number, type: string, parent: string | null, boite: readonly [number, number, number, number]): LayerLu => {
      const layer = layerVide(idDe(ordre), nom, type, parent, boite);
      layers.push(layer);
      identifiants[nom] = layer.id;
      return layer;
    };
    const attendre = (liaison: Omit<LiaisonAttendue, 'variant'>): void => { liaisonsAttendues.push({ variant: variantId, ...liaison }); };
    /** Lie un champ du composant à un de ses tokens. */
    const lier = (
      nomDuLayer: NomDeLayer, layer: LayerLu, champ: string, entree: { variable: VariableDuCatalogue; jeton: JetonDeCarte },
      options: { indice?: number; plage?: { debut: number; fin: number }; surcharge?: LiaisonLue['surcharge'] } = {},
    ): LiaisonLue => {
      const lue: LiaisonLue = {
        champ, ...(options.indice === undefined ? {} : { indice: options.indice }), ...(options.plage ? { plage: options.plage } : {}),
        porteur: layer.id, ...(options.surcharge ? { surcharge: options.surcharge, provenance: 'instance' as const } : {}),
        variable: variableLue(entree.variable),
      };
      layer.liaisons.push(lue);
      attendre({
        layer: layer.id, nomDuLayer, champ, ...(options.indice === undefined ? {} : { indice: options.indice }), ...(options.plage ? { plage: options.plage } : {}),
        ...(options.surcharge ? { surcharge: options.surcharge.id } : {}), origine: 'composant', nature: entree.jeton.nature,
        ...(entree.jeton.role ? { role: entree.jeton.role } : {}), ...(entree.jeton.propriete ? { propriete: entree.jeton.propriete } : {}),
        cle: entree.variable.cle, nom: entree.variable.nom,
      });
      return lue;
    };
    /** Lie un champ d'une instance à la variable de `theme` ou de `layout` que son composant principal porte. */
    const heriter = (nomDuLayer: NomDeLayer, layer: LayerLu, champ: string, variable: VariableDuCatalogue, nature: 'couleur' | 'taille', indice?: number): void => {
      layer.liaisons.push({
        champ, ...(indice === undefined ? {} : { indice }), porteur: layer.id, provenance: 'composant-principal', variable: variableLue(variable),
      });
      attendre({ layer: layer.id, nomDuLayer, champ, ...(indice === undefined ? {} : { indice }), origine: 'heritee', nature, cle: variable.cle, nom: variable.nom });
    };
    const couleur = (role: RoleDeCouleur) => jetonDeCouleur(valeurs, role);
    const taille = (propriete: ProprieteDeTaille) => jetonDeTaille(valeurs, propriete);

    const root = nouveauLayer('Root', 1, 'FRAME', null, [0, 0, 48, 48]);
    root.peintures.push(peinture('fills'), peinture('strokes'));
    lier('Root', root, 'fills', couleur('background'), { indice: 0 });
    lier('Root', root, 'strokes', couleur('border'), { indice: 0 });
    for (const [champ, propriete] of CHAMPS_DE_ROOT) lier('Root', root, champ, taille(propriete));
    root.strokeWeight = taille('border-width').jeton.pixels;

    const label = nouveauLayer('Label', 2, 'TEXT', root.id, [12, 16, 24, 16]);
    const plages = spec.plages === 2 ? [{ debut: 0, fin: 5 }, { debut: 5, fin: 10 }] : [{ debut: 0, fin: 10 }];
    label.texte = { style: 'Label/Medium', plages: [] };
    for (const [ordre, plage] of plages.entries()) {
      const liaison = lier('Label', label, 'fills', couleur(ordre === 0 ? 'foreground' : 'text'), { plage });
      label.texte.plages.push({ ...plage, fontSize: 14, fontWeight: 500, peintures: [peinture('fills')], liaisons: [liaison] });
    }

    const icon = nouveauLayer('Icon', 3, 'VECTOR', root.id, [12, 12, 16, 16]);
    icon.peintures.push(peinture('fills'));
    lier('Icon', icon, 'fills', couleur('icon'), { indice: 0 });

    const ring = nouveauLayer('Ring', 4, 'RECTANGLE', root.id, [0, 0, 48, 48]);
    ring.peintures.push(peinture('strokes'));
    lier('Ring', ring, 'strokes', couleur('ring'), { indice: 0 });
    lier('Ring', ring, 'strokeWeight', taille('border-width'));
    ring.strokeWeight = taille('border-width').jeton.pixels;

    if (spec.imbriques) {
      const glyph = nouveauLayer('Glyph', 5, 'INSTANCE', root.id, [4, 4, 16, 16]);
      glyph.sorte = 'dependance';
      glyph.instanceDe = { cle: 'lib-glyph', nom: 'Glyph', distante: true, pilotee: 'Icon#1:2' };
      lier('Glyph', glyph, 'fills', couleur('icon'), { indice: 0, surcharge: { id: `${glyph.id};30:5`, nom: 'Vector', type: 'VECTOR' } });

      const barre = nouveauLayer('.Bar', 6, 'INSTANCE', root.id, [0, 44, 48, 4]);
      barre.sorte = 'piece-interne';
      barre.instanceDe = { cle: 'lib-bar', nom: '.Bar', distante: false, pilotee: null };
      barre.peintures.push(peinture('fills'));
      heriter('.Bar', barre, 'fills', theme.get('neutral/surface/default')!, 'couleur', 0);

      const enveloppe = nouveauLayer('SizeWrapper', 7, 'INSTANCE', root.id, [0, 0, 48, 48]);
      enveloppe.sorte = 'wrapper-de-dimensions';
      enveloppe.instanceDe = { cle: 'lib-wrapper', nom: 'SizeWrapper', distante: false, pilotee: null };
      heriter('SizeWrapper', enveloppe, 'paddingLeft', layout.get(8)!, 'taille');
      heriter('SizeWrapper', enveloppe, 'paddingRight', layout.get(8)!, 'taille');
    }

    nombreDeLayers += layers.length;
    const nom = spec.axes.length > 0 ? spec.axes.map((axe) => `${axe.nom}=${valeurs[axe.nom]}`).join(', ') : spec.jeu;
    variantsLus.push({
      id: variantId, nom, valeurs, layers,
      modesEffectifs: { [collections.theme.cle]: modesDuTheme[0].id, [collections.components.cle]: modesDeComposants[0].id },
    });
    variantsDeCarte.push({ id: variantId, nom, valeurs, layers: identifiants });
  }

  const releve: ReleveDeComposant = {
    version: 1, jeu: { cle: 'jeu-cle', id: '9:1', nom: spec.jeu }, proprietes, variants: variantsLus,
    lecture: { layersLus: nombreDeLayers, layersNonLus: 0, variantsNonLus: [], manquees: [] }, espaceDeCouleur: 'srgb',
  };
  const catalogue: CatalogueDeReference = { version: 1, library: null, collections: Object.values(collections), variables };
  const carte: CarteDuComposant = { jeu: spec.jeu, axes: axesDeCarte, variants: variantsDeCarte, liaisons: liaisonsAttendues, jetons };
  return { spec, releve, catalogue, carte };
}

/** Un composant valide de forme libre : l'entrée des familles qui fabriquent leurs propres axes. */
export const composantValide = construireLeComposant;
export const releveDe = (composant: ComposantDeBase): ReleveDeComposant => composant.releve;
export const catalogueDe = (composant: ComposantDeBase): CatalogueDeReference => composant.catalogue;

/** Une copie profonde sur laquelle un opérateur peut dégrader sans toucher à la base. */
export function copierLeComposant(composant: ComposantDeBase): ComposantDeBase {
  return structuredClone(composant);
}

/**
 * Les constats que l'analyse tire des contrôles de la portée, dans l'ordre de `controlesDuKit` : mapping, couches, thème,
 * structure, puis les propositions de correction sur leur somme. Les autres familles du kit ne tournent pas ici.
 */
export function constatsDeLaPortee(releve: ReleveDeComposant, catalogue: CatalogueDeReference): Constat[] {
  const constats = [
    ...controlerMapping(releve, catalogue),
    ...controlerCouches(releve, catalogue),
    ...controlerLeTheme(releve, catalogue),
    ...controlerLaStructure(releve, catalogue),
  ];
  return proposerLesCorrections(releve, catalogue, constats).filter((constat) => CODES_DE_LA_PORTEE.includes(constat.code));
}

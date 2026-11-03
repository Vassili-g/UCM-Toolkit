/**
 * Le composant de base des stress tests de variants (F5) : un relevé, un catalogue et la carte d'un composant sans constat de la
 * portée (C7 à C13, C31 à C33), construits par le générateur de F3 (`portF3.ts`).
 *
 * Un token de couleur se nomme `<jeu>/color/<palette>/<style>/<taille>/<état>/<rôle>` pour les axes présents, un token de taille
 * `<jeu>/size/<taille>/<propriété>`. Le segment d'un token égale la valeur du variant, sauf pour un terme de taille ou d'état que
 * le registre connaît : le token l'écrit alors sous la forme que le registre retient pour un dossier (`sm` s'écrit `small`,
 * `Rest` s'écrit `default`), parce que `REGISTRE_TAILLES` donne `small`, `medium` et `large` aux dossiers et fait de `sm`, `md`
 * et `lg` des formes tolérées (C10). Palette et style s'écrivent comme la valeur, caractère pour caractère.
 */
import { controlerNommage, tokensDuComposant, type AxeDuComposant } from '../../../src/controles/nommage.js';
import { controlerOublis } from '../../../src/controles/oublis.js';
import { controlerLaTypographie } from '../../../src/controles/typographie.js';
import type { CatalogueDeReference, Constat, LayerLu, LiaisonLue, ReleveDeComposant, VariableDuCatalogue } from '../../../src/controles/index.js';
import { termeReconnu } from '../../../src/referentiel/reconnaissance.js';
import { termePourCategorie } from '../../../src/referentiel/termes.js';
import { REGISTRE_ETATS, REGISTRE_TAILLES } from '../../../src/referentiel/vocabulaire.js';
import { composantValide, type AxeDeSpec, type CarteDuComposant, type ComposantDeBase, type SpecDeComposant } from './portF3.js';

/** La graine de F5 et F6 (section 3.5 du plan). Elle tire l'échelle des tokens de taille et les rangs des cas tirés. */
export const GRAINE_PAR_DEFAUT = 7105;

/** Les codes que les deux contrôles de F5 émettent. */
export const CODES_DE_LA_PORTEE: readonly `C${number}`[] = ['C7', 'C8', 'C9', 'C10', 'C12', 'C13', 'C31', 'C32', 'C33'];

/** Un axe de spec dont le rôle (`segment`) est dit : l'oracle ne le déduit jamais du nom, que le kit lit mal pour `Type` ou `Tone`. */
export interface AxeDeVariants extends AxeDeSpec {
  readonly segment: AxeDuComposant | null;
}

/** Les axes de P0 : `Button`, 2 × 3 × 3 × 4 = 72 variants. */
export const AXES_DE_P0: readonly AxeDeVariants[] = [
  { nom: 'Style', valeurs: ['solid', 'outline'], segment: 'style' },
  { nom: 'Color', valeurs: ['primary', 'secondary', 'danger'], segment: 'palette' },
  { nom: 'Size', valeurs: ['sm', 'md', 'lg'], segment: 'taille' },
  { nom: 'State', valeurs: ['default', 'hover', 'pressed', 'disabled'], segment: 'etat' },
];

/**
 * Le segment qu'un token écrit pour une valeur d'axe : la forme de dossier du terme, pour un état ou une taille que le registre
 * connaît, sinon la valeur telle quelle.
 */
export function segmentDeLaValeur(role: AxeDuComposant | null, valeur: string): string {
  if (role === 'taille' || role === 'etat') {
    const terme = termeReconnu(role === 'taille' ? REGISTRE_TAILLES : REGISTRE_ETATS, valeur);
    if (terme) return termePourCategorie(terme, 'groupes').id;
  }
  return valeur;
}

export function specDeVariants(jeu: string, axes: readonly AxeDeVariants[], graine: number = GRAINE_PAR_DEFAUT): SpecDeComposant {
  const roleDe = new Map(axes.map((axe) => [axe.nom, axe.segment]));
  return {
    jeu, axes, scopes: 'larges', imbriques: true, plages: 2, modesDeTaille: 1, graine,
    ecritureDesValeurs: (propriete, valeur) => segmentDeLaValeur(roleDe.get(propriete) ?? null, valeur),
  };
}

/** Le composant de base de ces axes. Une même graine rend le même composant. */
export function composantDeBase(jeu: string, axes: readonly AxeDeVariants[], graine: number = GRAINE_PAR_DEFAUT): ComposantDeBase {
  return composantValide(specDeVariants(jeu, axes, graine));
}

/** P0 : `Button` à 72 variants. */
export const composantP0 = (graine: number = GRAINE_PAR_DEFAUT): ComposantDeBase => composantDeBase('Button', AXES_DE_P0, graine);

/** Les constats que `controlerNommage` (C7 à C13) et `controlerOublis` (C31 à C33) rendent, dans cet ordre, sans dédoublonnage. */
export function constatsDeLaPortee(releve: ReleveDeComposant, catalogue: CatalogueDeReference): Constat[] {
  return [...controlerNommage(releve, catalogue), ...controlerOublis(releve, catalogue)];
}

/** Les rangs que les segments d'axe occupent dans le nom d'un token de couleur : un par rôle présent, après le jeu et la famille. */
export function rangsDesRoles(composant: ComposantDeBase): [role: AxeDuComposant, rang: number][] {
  const presents = ['palette', 'style', 'taille', 'etat'].filter((role) => composant.carte.axes.some((axe) => axe.segment === role)) as AxeDuComposant[];
  return presents.map((role, rang) => [role, 2 + rang]);
}

/**
 * P1 : la lecture des tokens du composant. `sansLecture` nomme les tokens dont le chemin ne se lit pas, `malLus` ceux dont un segment
 * d'axe reçoit un autre rôle que celui de la carte. Les tokens de taille ne portent que le segment de taille.
 */
export function verifierLaLecture(composant: ComposantDeBase): { sansLecture: string[]; malLus: string[] } {
  const sansLecture: string[] = [];
  const malLus: string[] = [];
  const rangs = rangsDesRoles(composant);
  for (const token of tokensDuComposant(composant.releve, composant.catalogue)) {
    if (token.lecture.length === 0) { sansLecture.push(token.variable.nom); continue; }
    const couleur = token.segments.length === 2 + rangs.length + 1;
    const attendus = couleur ? rangs : rangs.filter(([role]) => role === 'taille').map(([role]): [AxeDuComposant, number] => [role, 2]);
    if (attendus.some(([role, rang]) => token.lecture[rang]?.role !== role)) malLus.push(token.variable.nom);
  }
  return { sansLecture, malLus };
}

// ---------------------------------------------------------------------------------------------------------------------------
// Base de F6 : texte à style par taille, icône en instance de library

/** Les codes que `controlerLaTypographie` émet. */
export const CODES_DE_F6: readonly `C${number}`[] = ['C64', 'C65', 'C66', 'C67'];

/** Les axes de la base de F6 : `Size` et `State` de P0, soit 12 variants. */
export const AXES_DE_F6: readonly AxeDeVariants[] = AXES_DE_P0.filter((axe) => axe.nom === 'Size' || axe.nom === 'State');

const PIXELS_DES_ICONES: Readonly<Record<string, number>> = { small: 12, medium: 16, large: 20 };
const VARIABLE_DE_PREMIER_PLAN = 'neutral/surface/foreground';
export const PROPRIETE_D_ICONE = 'Icon#1:2';

/** Le style de texte d'une valeur de taille : `Label/Small` pour le segment `small`. */
export const styleDeTexteDeLaTaille = (segment: string): string => `Label/${segment.charAt(0).toUpperCase()}${segment.slice(1)}`;

export function variableLue(variable: VariableDuCatalogue): LiaisonLue['variable'] {
  return { id: `VariableID:${variable.cle}`, cle: variable.cle, nom: variable.nom, collection: variable.collection, distante: false };
}

/** Une liaison d'un champ du layer `porteur` à cette variable. */
export function liaisonVers(porteur: string, champ: string, variable: VariableDuCatalogue, options: { indice?: number; plage?: { debut: number; fin: number } } = {}): LiaisonLue {
  return {
    champ, ...(options.indice === undefined ? {} : { indice: options.indice }), ...(options.plage ? { plage: options.plage } : {}),
    porteur, variable: variableLue(variable),
  };
}

/**
 * La base de F6 sur un composant de F5 : le texte `Label` prend un style par valeur de taille, et l'icône devient une instance de
 * library que `Icon#1:2` pilote, dont la taille se lie à `layout/icon/<taille>` et la couleur à `theme/neutral/surface/foreground`
 * (la forme que C66 accepte, Q-F6-1). Cette liaison directe ne passe plus par les tokens `icon` du composant, qui n'ont plus de
 * lecteur : la base les retire pour que C32 reste muet. `Glyph`, l'instance imbriquée de F3 que C66 jugerait aussi, est retiré.
 */
export function avecLesCouchesF6(composant: ComposantDeBase): ComposantDeBase {
  const releve = structuredClone(composant.releve);
  const catalogue = structuredClone(composant.catalogue);
  const axeTaille = composant.carte.axes.find((axe) => axe.segment === 'taille');
  const segmentDeTaille = (valeurs: Readonly<Record<string, string>>): string => (axeTaille ? segmentDeLaValeur('taille', valeurs[axeTaille.propriete]) : 'medium');
  const collectionDe = (role: string) => catalogue.collections.find((collection) => collection.role === role)!;
  const ajouter = (cle: string, nom: string, role: 'layout' | 'typography', valeur: number): VariableDuCatalogue => {
    const collection = collectionDe(role);
    const variable: VariableDuCatalogue = { cle, nom, collection: collection.cle, type: 'FLOAT', etat: 'presente', valeurs: { [collection.modes[0].id]: { valeur } } };
    catalogue.variables.push(variable);
    return variable;
  };

  const tailles = [...new Set(releve.variants.map((variant) => segmentDeTaille(variant.valeurs)))];
  const icones = new Map(tailles.map((segment) => [segment, ajouter(`kf6-icone-${segment}`, `icon/${segment}`, 'layout', PIXELS_DES_ICONES[segment] ?? 24)]));
  ajouter('kf6-graisse', 'label/md/font-weight', 'typography', 500);
  const premierPlan = catalogue.variables.find((variable) => variable.nom === VARIABLE_DE_PREMIER_PLAN)!;
  const jetonsDIcone = new Set(composant.carte.jetons.filter((jeton) => jeton.role === 'icon').map((jeton) => jeton.cle));
  catalogue.variables = catalogue.variables.filter((variable) => !jetonsDIcone.has(variable.cle));

  for (const variant of releve.variants) {
    const racine = variant.layers.find((layer) => layer.nom === 'Root')!;
    const ancienne = variant.layers.find((layer) => layer.nom === 'Icon')!;
    variant.layers.find((layer) => layer.nom === 'Label')!.texte!.style = styleDeTexteDeLaTaille(segmentDeTaille(variant.valeurs));
    const taille = icones.get(segmentDeTaille(variant.valeurs))!;
    const icone: LayerLu = {
      id: ancienne.id, nom: 'Icon', type: 'INSTANCE', parent: racine.id, visible: true, opacite: 1, dimensions: ancienne.dimensions,
      peintures: [{ champ: 'fills', indice: 0, type: 'SOLID', visible: true, opacite: 1, blendMode: 'NORMAL', couleur: { r: 0.2, g: 0.4, b: 0.8, a: 1 } }],
      liaisons: [liaisonVers(ancienne.id, 'width', taille), liaisonVers(ancienne.id, 'height', taille), liaisonVers(ancienne.id, 'fills', premierPlan, { indice: 0 })],
      valeursEnDur: ancienne.valeursEnDur,
      instanceDe: { cle: 'lib-icone', nom: 'Chevron', distante: true, pilotee: PROPRIETE_D_ICONE },
    };
    variant.layers = variant.layers.filter((layer) => layer.nom !== 'Glyph').map((layer) => (layer.id === ancienne.id ? icone : layer));
  }
  if (!releve.proprietes.some((propriete) => propriete.nom === PROPRIETE_D_ICONE)) releve.proprietes.push({ nom: PROPRIETE_D_ICONE, type: 'INSTANCE_SWAP', defaut: '1:2' });
  releve.lecture = { ...releve.lecture, layersLus: releve.variants.reduce((somme, variant) => somme + variant.layers.length, 0) };

  const carte: CarteDuComposant = {
    ...composant.carte,
    variants: composant.carte.variants.map((variant) => { const layers = { ...variant.layers }; delete layers.Glyph; return { ...variant, layers }; }),
    liaisons: composant.carte.liaisons.filter((liaison) => liaison.nomDuLayer !== 'Icon' && liaison.nomDuLayer !== 'Glyph'),
    jetons: composant.carte.jetons.filter((jeton) => jeton.role !== 'icon'),
  };
  return { ...composant, releve, catalogue, carte };
}

/** La base de F6 : `Button` à 12 variants (`Size` × `State`), sans constat C64 à C67 hors les informations de limite de C67. */
export const composantF6 = (graine: number = GRAINE_PAR_DEFAUT): ComposantDeBase => avecLesCouchesF6(composantDeBase('Button', AXES_DE_F6, graine));

export const constatsDeTypographie = (releve: ReleveDeComposant, catalogue: CatalogueDeReference): Constat[] => controlerLaTypographie(releve, catalogue);

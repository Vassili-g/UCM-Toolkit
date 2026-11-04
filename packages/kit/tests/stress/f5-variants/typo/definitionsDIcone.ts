/**
 * L'opérateur I6 de F6 : les trois définitions d'une icône que le kit porte (E-26). Les fonctions `estIcone` de `typographie.ts`
 * (C66), de `accessibilite.ts` (C49) et de `mapping.ts` (C17) ne sont pas exportées ; le harnais les appelle par les contrôles qui
 * les lisent, sur un composant réduit à un variant, une racine et le layer à juger, et lit leur verdict dans ce qu'ils émettent.
 *
 *   C66  Le layer est une icône quand `controlerLaTypographie` émet un constat C66 ou C67 qui le nomme : chaque icône reçoit
 *        l'un ou l'autre (une limite de C67 au moins).
 *   C49  Le layer est une icône quand `controlerLAccessibilite` émet un constat C49 d'usage `icone` : le layer porte un remplissage
 *        blanc sur une racine blanche, donc le contraste de 1 échoue pour toute cible reconnue.
 *   C17  Le layer lie son remplissage à un token du composant dont le rôle est `icon`. `controlerMapping` émet un constat C17
 *        quand le layer n'est pas une icône (un texte, un fond) ; le layer est une icône quand il n'en émet aucun.
 *
 * Le verdict attendu d'un layer vient de Q-F6-3 pour les ambiguïtés (`mesure`) et de P21 pour les noms piégeux et les icônes
 * franches (`attendu`). Un cas compare les trois fonctions au verdict attendu, et entre elles.
 */
import {
  controlerLAccessibilite, controlerLaTypographie, controlerMapping,
  type CatalogueDeReference, type LayerLu, type PeintureLue, type ReleveDeComposant,
} from '../../../../src/controles/index.js';
import { Numerotation, type CasDeVariants } from '../cas.js';
import { liaisonVers } from '../composantDeBase.js';
import type { ComposantDeBase } from '../portF3.js';
import type { CasMixte } from './operateursTexte.js';
import { layerNeuf } from './operateursTexte.js';

export type TypeDeLayer = 'INSTANCE' | 'FRAME' | 'VECTOR' | 'BOOLEAN_OPERATION' | 'TEXT';

export interface DefinitionDIcone {
  readonly nom: string;
  readonly type: TypeDeLayer;
  /** Une instance de library, éventuellement pilotée par `Icon#1:2`. */
  readonly instance?: 'bibliotheque' | 'pilotee';
  /** Ce que la définition de Q-F6-3 et P21 attend : le layer est-il une icône ? */
  readonly estUneIcone: boolean;
  readonly verdict: 'attendu' | 'mesure';
}

export interface CasDeDefinition extends CasMixte {
  readonly definition: DefinitionDIcone;
}

const nonIcone = (nom: string, type: TypeDeLayer): DefinitionDIcone => ({ nom, type, estUneIcone: false, verdict: 'attendu' });
const icone = (nom: string, instance: 'bibliotheque' | 'pilotee'): DefinitionDIcone => ({ nom, type: 'INSTANCE', instance, estUneIcone: true, verdict: 'attendu' });
const ambigue = (nom: string, estUneIcone: boolean): DefinitionDIcone => ({ nom, type: 'VECTOR', estUneIcone, verdict: 'mesure' });

/** Les dix noms piégeux : ils contiennent `icon` sans le mot entier. FP4 les pose aussi comme layers d'un composant valide. */
export const NON_ICONES: readonly DefinitionDIcone[] = [
  nonIcone('Silicone', 'FRAME'), nonIcone('Silicon', 'FRAME'), nonIcone('Lexicon', 'TEXT'), nonIcone('Semiconductor', 'FRAME'),
  nonIcone('Iconoclast', 'TEXT'), nonIcone('Iconography', 'FRAME'), nonIcone('IconButton', 'FRAME'), nonIcone('icon-container', 'FRAME'),
  nonIcone('icon-label', 'TEXT'), nonIcone('Icon', 'TEXT'),
];

const ICONES: readonly DefinitionDIcone[] = [
  icone('icon', 'bibliotheque'), icone('Icon/Left', 'bibliotheque'), icone('leading-icon', 'bibliotheque'), icone('trailing icon', 'bibliotheque'),
  icone('Icon', 'pilotee'), icone('Slot', 'pilotee'),
];

/** Selon Q-F6-3, un VECTOR dont le nom contient le mot entier `icon`, `icône`, `glyph`, `pictogram` ou `symbol` est une icône. */
const AMBIGUES: readonly DefinitionDIcone[] = [
  ambigue('Pictogram', true), ambigue('Glyph', true), ambigue('icône', true), ambigue('Symbol', true),
  ambigue('Vector', false), ambigue('Ico', false), ambigue('icons', false),
];

const COUPLES: readonly DefinitionDIcone[] = [
  icone('icon', 'bibliotheque'),
  { nom: 'icon', type: 'FRAME', estUneIcone: false, verdict: 'mesure' },
  { nom: 'icon', type: 'VECTOR', estUneIcone: true, verdict: 'attendu' },
  { nom: 'icon', type: 'BOOLEAN_OPERATION', estUneIcone: true, verdict: 'attendu' },
  { nom: 'Silicone', type: 'INSTANCE', instance: 'bibliotheque', estUneIcone: true, verdict: 'mesure' },
  nonIcone('Silicone', 'FRAME'),
  { nom: 'Silicone', type: 'VECTOR', estUneIcone: false, verdict: 'mesure' },
  { nom: 'Silicone', type: 'BOOLEAN_OPERATION', estUneIcone: false, verdict: 'mesure' },
];

export const DEFINITIONS_D_ICONE: readonly DefinitionDIcone[] = [...NON_ICONES, ...ICONES, ...AMBIGUES, ...COUPLES];

export interface VerdictsDIcone {
  readonly c66: boolean;
  readonly c49: boolean;
  readonly c17: boolean;
}

const BLANC: PeintureLue = { champ: 'fills', indice: 0, type: 'SOLID', visible: true, opacite: 1, blendMode: 'NORMAL', couleur: { r: 1, g: 1, b: 1, a: 1 } };
const ID_DU_LAYER = 'r:2';

/** Le layer à juger : l'instance de library porte ses faits, le texte un style, le reste n'a que son nom et son type. */
function layerAJuger(definition: DefinitionDIcone, plus: Partial<LayerLu> = {}): LayerLu {
  return layerNeuf(ID_DU_LAYER, definition.nom, definition.type, 'r:1', {
    peintures: [BLANC],
    ...(definition.type === 'INSTANCE' ? { instanceDe: { cle: 'lib-icone', nom: 'Icon', distante: true, pilotee: definition.instance === 'pilotee' ? 'Icon#1:2' : null } } : {}),
    ...(definition.type === 'TEXT' ? { texte: { style: 'Label/Medium', plages: [] } } : {}),
    ...plus,
  });
}

function composantReduit(base: ComposantDeBase, layer: LayerLu): ReleveDeComposant {
  const variant = base.releve.variants[0];
  const racine = layerNeuf('r:1', 'Root', 'FRAME', null, { peintures: [BLANC] });
  return {
    version: 1, jeu: base.releve.jeu, proprietes: base.releve.proprietes, espaceDeCouleur: 'srgb',
    variants: [{ id: 'r:v', nom: variant.nom, valeurs: variant.valeurs, layers: [racine, layer], modesEffectifs: {} }],
    lecture: { layersLus: 2, layersNonLus: 0, variantsNonLus: [], manquees: [] },
  };
}

/** Le catalogue de la base, avec un token `…/icon` du composant que le remplissage de C17 lie. */
function catalogueAvecUnJetonDIcone(base: ComposantDeBase): { catalogue: CatalogueDeReference; jeton: CatalogueDeReference['variables'][number] } {
  const catalogue = structuredClone(base.catalogue);
  const modele = catalogue.variables.find((variable) => variable.nom.endsWith('/foreground') && variable.collection === 'col-components')!;
  const jeton = { ...structuredClone(modele), cle: 'kf6-i6-icone', nom: modele.nom.replace(/\/foreground$/, '/icon') };
  catalogue.variables.push(jeton);
  return { catalogue, jeton };
}

/** Le verdict de chacune des trois fonctions d'icône sur ce layer. */
export function verdictsDesTroisFonctions(base: ComposantDeBase, definition: DefinitionDIcone): VerdictsDIcone {
  const c66 = controlerLaTypographie(composantReduit(base, layerAJuger(definition)), base.catalogue)
    .some((constat) => (constat.code === 'C66' || constat.code === 'C67') && constat.layers.includes(ID_DU_LAYER));

  const c49 = controlerLAccessibilite(composantReduit(base, layerAJuger(definition)), base.catalogue, { niveau: 'AA' })
    .some((constat) => constat.code === 'C49' && constat.faits.usage === 'icone' && constat.layers.includes(ID_DU_LAYER));

  const { catalogue, jeton } = catalogueAvecUnJetonDIcone(base);
  const lie = layerAJuger(definition, { liaisons: [liaisonVers(ID_DU_LAYER, 'fills', jeton, { indice: 0 })] });
  const c17 = !controlerMapping(composantReduit(base, lie), catalogue).some((constat) => constat.code === 'C17' && constat.layers.includes(ID_DU_LAYER));
  return { c66, c49, c17 };
}

/** I6 (31) : 10 non-icônes, 6 icônes, 7 ambiguës, puis `icon` et `Silicone` contre quatre types. */
export function operateursDefinitions(_base: ComposantDeBase, numero: Numerotation): CasDeVariants[] {
  return DEFINITIONS_D_ICONE.map((definition): CasDeDefinition => ({
    id: numero.prochain('I6'), famille: 'F6', operateur: 'I6', verdict: definition.verdict,
    ...(definition.verdict === 'mesure' ? { question: 'Q-F6-3' } : {}),
    attendus: [], codesJuges: [], ecartConnu: 'E-26', ...(definition.nom.match(/^(Silicone|Lexicon|IconButton|Pictogram|Glyph|icône)$/) ? { hypothese: 'H17' } : {}),
    controles: [], definition,
    entree: {
      description: `I6 : ${definition.nom} (${definition.type}${definition.instance ? `, instance ${definition.instance === 'pilotee' ? 'pilotée' : 'de library'}` : ''}) ${definition.estUneIcone ? 'est' : 'n\'est pas'} une icône`,
      zones: [{ axe: definition.nom, valeur: definition.type }],
    },
  }));
}

export const estUneDefinition = (cas: CasDeVariants): cas is CasDeDefinition => 'definition' in cas;

/**
 * L'opérateur M de F5 : la matrice des variants et la borne de 4 096 combinaisons de C31 (E-44). M1, M2, M4 et M5 dégradent P0 ;
 * M3 fabrique ses matrices (axes sans token, variants sans layer) parce que P0 ne dépasse pas 72 variants.
 *
 * Retirer un variant de P0 retire aussi la combinaison de ses tokens de couleur : chacun n'a plus de variant qui porte ses segments,
 * donc l'oracle attend C32 `sans-variant` en plus de C31 (règle 4.4 : « token sans variant qui porte ses segments »). Au-delà de 4 096
 * combinaisons déclarées, la proposition de Q-F5-7 est une information qui donne le total et le nombre de variants ; le kit n'en
 * émet aucune, donc `informationDeBorne` reste un manque en attente.
 */
import type { CatalogueDeReference, ReleveDeComposant, VariantLu } from '../../../src/controles/index.js';
import { BORNE_DE_COMBINAISONS, c31, casDegrade, Degradation, informationDeBorne, Numerotation, type CasDeVariants, type ZoneTouchee } from './cas.js';
import type { ComposantDeBase } from './portF3.js';
import { echantillon, entier, graineDe, mulberry32 } from '../commun/prng.js';

const zonesDuVariant = (variant: VariantLu): ZoneTouchee[] => Object.entries(variant.valeurs).map(([axe, valeur]) => ({ axe, valeur }));

function retraits(base: ComposantDeBase, graine: number, numero: Numerotation): CasDeVariants[] {
  const variants = base.releve.variants;
  const tirer = (etiquette: string) => mulberry32(graineDe(graine, `M1:${etiquette}`));
  const rangsTires = echantillon(tirer('un'), variants.map((_, rang) => rang).filter((rang) => rang !== 0 && rang !== variants.length - 1), 4);
  const rangs: readonly (readonly number[])[] = [
    [0], [variants.length - 1], ...rangsTires.map((rang) => [rang]),
    ...[0, 1].map((rang) => echantillon(tirer(`deux-${rang}`), variants.map((_, i) => i), 2)),
  ];
  const parAxe: readonly (readonly [axe: string, valeur: string])[] = [['Color', 'danger'], ['Size', 'Large'], ['State', 'disabled']];
  const cas: CasDeVariants[] = [];
  for (const retires of rangs) {
    const noms = retires.map((rang) => variants[rang].nom);
    cas.push(casDegrade(base, {
      id: numero.prochain('M1'), operateur: 'M1',
      description: `${retires.length === 1 ? 'le variant' : 'les variants'} ${noms.join(' ; ')} ${retires.length === 1 ? 'est retiré' : 'sont retirés'}`,
      zones: zonesDuVariant(variants[retires[0]]),
      degrader: (d) => { for (const rang of retires) d.retirer(d.releve.variants, d.releve.variants.find((v) => v.id === variants[rang].id)!); },
    }));
  }
  for (const [axe, valeur] of parAxe) {
    cas.push(casDegrade(base, {
      id: numero.prochain('M1'), operateur: 'M1', description: `tous les variants ${axe}=${valeur} sont retirés`,
      zones: [{ axe, valeur }],
      degrader: (d) => { for (const variant of d.variantsOu({ [axe]: valeur })) d.retirer(d.releve.variants, variant); },
    }));
  }
  for (const [etiquette, nombre] of [['dix', 10], ['moitie', variants.length / 2]] as const) {
    const retires = echantillon(tirer(etiquette), variants.map((_, i) => i), nombre);
    cas.push(casDegrade(base, {
      id: numero.prochain('M1'), operateur: 'M1', description: `${nombre} variants tirés sur ${variants.length} sont retirés`,
      zones: zonesDuVariant(variants[retires[0]]),
      degrader: (d) => { for (const rang of retires) d.retirer(d.releve.variants, d.releve.variants.find((v) => v.id === variants[rang].id)!); },
    }));
  }
  return cas;
}

function doublons(base: ComposantDeBase, numero: Numerotation): CasDeVariants[] {
  const variants = base.releve.variants;
  return [variants[0], variants[variants.length - 1]].map((modele) => casDegrade(base, {
    id: numero.prochain('M2'), operateur: 'M2', description: `le variant ${modele.nom} existe deux fois`,
    zones: zonesDuVariant(modele),
    degrader: (d) => { d.copierLeVariant(d.releve.variants.find((v) => v.id === modele.id)!); },
  }));
}

// ---------------------------------------------------------------------------------------------------------------------------
// M3 : matrices fabriquées

interface AxeFabrique { readonly nom: string; readonly valeurs: readonly string[] }

const axesDe = (tailles: readonly number[]): AxeFabrique[] =>
  tailles.map((taille, rang) => ({ nom: `Axe${rang + 1}`, valeurs: Array.from({ length: taille }, (_, i) => `v${i + 1}`) }));

function* combinaisonsDe(axes: readonly AxeFabrique[]): Generator<Record<string, string>> {
  const rangs = axes.map(() => 0);
  const total = axes.reduce((produit, axe) => produit * axe.valeurs.length, 1);
  for (let n = 0; n < total; n++) {
    yield Object.fromEntries(axes.map((axe, i) => [axe.nom, axe.valeurs[rangs[i]]]));
    for (let i = axes.length - 1; i >= 0; i--) {
      rangs[i] += 1;
      if (rangs[i] < axes[i].valeurs.length) break;
      rangs[i] = 0;
    }
  }
}

/** Un composant sans token ni layer : une matrice de variants à axes inconnus du kit, dont les nombres de combinaisons sont ceux du cas. */
function composantFabrique(axes: readonly AxeFabrique[], variants: Iterable<Record<string, string>>): ComposantDeBase {
  const liste: VariantLu[] = [];
  let rang = 0;
  for (const valeurs of variants) {
    rang += 1;
    liste.push({ id: `10:${rang}`, nom: Object.entries(valeurs).map(([axe, valeur]) => `${axe}=${valeur}`).join(', '), valeurs, layers: [], modesEffectifs: {} });
  }
  const releve: ReleveDeComposant = {
    version: 1, jeu: { cle: 'jeu-cle', id: '9:1', nom: 'Matrice' },
    proprietes: axes.map((axe) => ({ nom: axe.nom, type: 'VARIANT' as const, valeurs: [...axe.valeurs], defaut: axe.valeurs[0] })),
    variants: liste, lecture: { layersLus: 0, layersNonLus: 0, variantsNonLus: [], manquees: [] }, espaceDeCouleur: 'srgb',
  };
  const catalogue: CatalogueDeReference = {
    version: 1, library: null, variables: [],
    collections: [{ cle: 'col-components', nom: 'components', role: 'components', modes: [{ id: '20:0', nom: 'Default' }], etat: 'lue' }],
  };
  return {
    spec: { jeu: 'Matrice', axes: axes.map((axe) => ({ ...axe, segment: null })), scopes: 'larges', imbriques: false, plages: 1, modesDeTaille: 1 },
    releve, catalogue,
    carte: { jeu: 'Matrice', axes: axes.map((axe) => ({ propriete: axe.nom, axe: null, segment: null, valeurs: axe.valeurs })), variants: [], liaisons: [], jetons: [] },
  };
}

const BUDGET_M3_MS = 2000;

interface SpecDeMatrice {
  readonly description: string;
  readonly tailles: readonly number[];
  /** Les rangs de combinaisons retirés du produit complet. */
  readonly retires?: readonly number[];
  readonly sansVariant?: true;
  /** Une matrice creuse : le nombre de variants tirés dans le produit. */
  readonly creuse?: number;
  readonly mesure?: true;
  readonly hypothese: string;
}

function matriceFabriquee(spec: SpecDeMatrice, graine: number, numero: Numerotation): CasDeVariants {
  const axes = axesDe(spec.tailles);
  const total = spec.tailles.reduce((produit, taille) => produit * taille, 1);
  let rangsPresents: ReadonlySet<number> | null = null;
  if (spec.creuse !== undefined) {
    const tirer = mulberry32(graineDe(graine, 'M3:creuse'));
    const choisis = new Set<number>();
    while (choisis.size < spec.creuse) choisis.add(entier(tirer, 0, total - 1));
    rangsPresents = choisis;
  } else if (spec.retires) rangsPresents = new Set(Array.from({ length: total }, (_, i) => i).filter((i) => !spec.retires!.includes(i)));
  else if (spec.sansVariant) rangsPresents = new Set();
  const selection = (): Record<string, string>[] => {
    if (rangsPresents?.size === 0) return [];
    const liste: Record<string, string>[] = [];
    let n = 0;
    for (const combinaison of combinaisonsDe(axes)) {
      if (rangsPresents === null || rangsPresents.has(n)) liste.push(combinaison);
      n += 1;
    }
    return liste;
  };
  const variants = selection();
  const base = composantFabrique(axes, variants);
  const declarees = total;
  const absentes = (): Record<string, string>[] => {
    const presents = new Set(variants.map((variant) => Object.values(variant).join('|')));
    const liste: Record<string, string>[] = [];
    for (const combinaison of combinaisonsDe(axes)) if (!presents.has(Object.values(combinaison).join('|'))) liste.push(combinaison);
    return liste;
  };
  const sousLaBorne = declarees <= BORNE_DE_COMBINAISONS;
  return {
    id: numero.prochain('M3'), famille: 'F5', operateur: 'M3', verdict: sousLaBorne ? 'attendu' : 'mesure', ...(sousLaBorne ? {} : { question: 'Q-F5-7' }),
    attendus: sousLaBorne ? absentes().map((combinaison) => c31(combinaison)) : [informationDeBorne(declarees, variants.length)],
    hypothese: spec.hypothese, ecartConnu: 'E-44',
    entree: {
      description: `M3 : ${spec.description} (${declarees} combinaisons déclarées, ${variants.length} variants)`,
      zones: [], budgetMs: BUDGET_M3_MS,
      materialiser: () => new Degradation(base).materialiser(),
    },
  };
}

function bornes(graine: number, numero: Numerotation): CasDeVariants[] {
  const specs: readonly SpecDeMatrice[] = [
    { description: '16 x 16 x 16 complet', tailles: [16, 16, 16], hypothese: 'H8' },
    { description: '16 x 16 x 16 avec un variant retiré', tailles: [16, 16, 16], retires: [1234], hypothese: 'H8' },
    { description: '16 x 16 x 16 sans variant', tailles: [16, 16, 16], sansVariant: true, hypothese: 'H8' },
    { description: '17 x 241 complet', tailles: [17, 241], hypothese: 'H8' },
    { description: '17 x 16 x 16 complet', tailles: [17, 16, 16], hypothese: 'H8' },
    { description: '17 x 16 x 16 avec un variant retiré', tailles: [17, 16, 16], retires: [2000], hypothese: 'H8' },
    { description: '20 axes à deux valeurs (2^20) sans variant', tailles: Array.from({ length: 20 }, () => 2), sansVariant: true, hypothese: 'H8' },
    { description: '65 x 64 avec un variant retiré', tailles: [65, 64], retires: [100], hypothese: 'H8' },
    { description: 'matrice creuse de 8 axes (5, 3, 3, 3, 3, 4, 4, 4) à 300 variants', tailles: [5, 3, 3, 3, 3, 4, 4, 4], creuse: 300, hypothese: 'H9' },
  ];
  return specs.map((spec) => matriceFabriquee(spec, graine, numero));
}

// ---------------------------------------------------------------------------------------------------------------------------

/** M4 : un axe dégénéré. Le plan n'attend que l'absence de levée et d'identifiant dupliqué ; seule la valeur dupliquée a un oracle. */
function axesDegeneres(base: ComposantDeBase, numero: Numerotation): CasDeVariants[] {
  const retire = base.releve.variants[0];
  return [
    casDegrade(base, {
      id: numero.prochain('M4'), operateur: 'M4', hypothese: 'H10',
      description: `Size : la valeur Small figure deux fois, et le variant ${retire.nom} est retiré`,
      zones: [{ axe: 'Size', valeur: 'Small' }],
      degrader: (d) => { d.inserer(d.propriete('Size').valeurs!, 'Small'); d.retirer(d.releve.variants, d.releve.variants.find((v) => v.id === retire.id)!); },
    }),
    casDegrade(base, {
      id: numero.prochain('M4'), operateur: 'M4', description: 'Size : une valeur vide s\'ajoute à la propriété', zones: [{ axe: 'Size', valeur: '' }],
      degrader: (d) => d.inserer(d.propriete('Size').valeurs!, ''), attendus: [], codesJuges: [],
    }),
    casDegrade(base, {
      id: numero.prochain('M4'), operateur: 'M4', description: 'Size : la propriété VARIANT n\'a pas de valeurs', zones: [{ axe: 'Size', valeur: 'Small' }],
      degrader: (d) => d.fixer(d.propriete('Size'), 'valeurs', undefined), attendus: [], codesJuges: [],
    }),
  ];
}

/** M5 : une lecture incomplète coupe C31, C32 et C33 (P9). Chaque cas retire un variant, que C31 et C32 signaleraient sur une lecture complète. */
function lecturesIncompletes(base: ComposantDeBase, numero: Numerotation): CasDeVariants[] {
  const retire = base.releve.variants[0];
  const sansLe = (d: Degradation): void => d.retirer(d.releve.variants, d.releve.variants.find((v) => v.id === retire.id)!);
  return [
    casDegrade(base, {
      id: numero.prochain('M5'), operateur: 'M5', description: 'un variant n\'est pas lu (variantsNonLus) et le variant ' + retire.nom + ' est retiré',
      zones: zonesDuVariant(retire), degrader: (d) => { d.fixer(d.releve.lecture, 'variantsNonLus', ['10:999']); sansLe(d); },
    }),
    casDegrade(base, {
      id: numero.prochain('M5'), operateur: 'M5', description: 'le nombre de layers non lus est inconnu et le variant ' + retire.nom + ' est retiré',
      zones: zonesDuVariant(retire), degrader: (d) => { d.fixer(d.releve.lecture, 'layersNonLus', 'inconnu'); sansLe(d); },
    }),
  ];
}

/** M (29) : 13 retraits, 2 doublons, 9 matrices fabriquées, 3 axes dégénérés, 2 lectures incomplètes. */
export function operateursMatrice(base: ComposantDeBase, graine: number): CasDeVariants[] {
  const numero = new Numerotation();
  return [...retraits(base, graine, numero), ...doublons(base, numero), ...bornes(graine, numero), ...axesDegeneres(base, numero), ...lecturesIncompletes(base, numero)];
}

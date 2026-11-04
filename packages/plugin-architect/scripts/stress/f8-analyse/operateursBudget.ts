/**
 * Les opérateurs de budget du stress test F9 (section 3.4 du plan) : le budget de 2 000 layers (Bd1, 15 cas), les contrôles du kit sur un
 * relevé coupé (Bd2, 9 cas) et le texte de la bannière d'une analyse partielle (Bd3, 6 cas).
 *
 * Le monde du budget est bâti avec l'atelier de calques de `tests/figmaDeTest.ts`, sans toucher à `tests/outils/` : un jeu de variants dont
 * chaque variant porte un nombre de layers donné. Il passe par les deux lecteurs qui comptent : `lireLeReleve` (le relevé d'Architect) et
 * `bornerLesVariants` (le moteur du socle), qui coupent chacun en préfixe de variants entiers.
 *
 * Chaque cas Bd1 déclare son total de layers et son point de coupe (`PlanDeBudget`) ; l'oracle vient de la règle du plan (P16) : le
 * variant de référence se lit toujours, puis les variants entiers se lisent tant que la somme reste au plus 2 000 ; le premier qui ne
 * tient pas coupe, et tous les suivants avec lui. `layersNonLus` est la somme exacte des layers laissés.
 */
import { bornerLesVariants } from 'ucm-plugin-socle/src/composant/contract/budget';
import type { VariantEntry } from 'ucm-plugin-socle/src/composant/contract/componentTree';

import { lireLeReleve } from '../../../src/releveDuComposant';
import type { NoeudLu } from '../../../src/consommateurs';
import { atelierDeCalques, collectionFigma, portDeTest, variableFigma } from '../../../tests/figmaDeTest';
import { Registre, type CasF8, type SortieDeCas } from './cas';
import {
  ajouterUneSeance, avecLecteurs, degraderLaLecture, DIT, JAMAIS_N_SUR_N, moteurAvecCouverture, observationDe, type Adaptateur, type Attente,
} from './seance';

const BUDGET = 2000;
const boite = { x: 0, y: 0, width: 10, height: 10 };

// ---------------------------------------------------------------------------------------------------------------------------
// Monde

interface VariantDuMonde {
  /** Les layers que le relevé compte : la racine, ses descendants, une instance sans ce qu'elle contient. */
  readonly layers: number;
  /** Les nœuds que seule l'instance contient : le relevé s'arrête à son seuil, `findAll` du moteur les compte. */
  readonly imbriques?: number;
  /** La lecture qui lève sur ce variant : `children` pour le relevé, `findAll` pour le moteur. */
  readonly leve?: 'parcourir' | 'compter';
}

interface MondeDuBudget {
  readonly variants: readonly VariantDuMonde[];
  readonly budget?: number;
}

/** Le décompte d'un variant selon le lecteur : le relevé s'arrête à l'instance, le moteur descend dedans. */
const comptage = (variant: VariantDuMonde, lecteur: 'releve' | 'moteur'): number => variant.layers + (lecteur === 'moteur' ? variant.imbriques ?? 0 : 0);

interface Bati { readonly jeu: NoeudLu; readonly port: ReturnType<ReturnType<typeof atelierDeCalques>['port']>; readonly composants: NoeudLu[] }

function batir(monde: MondeDuBudget): Bati {
  const a = atelierDeCalques();
  const composants = monde.variants.map((variant, rang) => {
    const enInstance = variant.imbriques !== undefined && variant.imbriques > 0 ? 1 : 0;
    const feuilles = Array.from({ length: variant.layers - 1 - enInstance }, (_, k) => a.calque(`v${rang}-l${k}`, 'FRAME', { absoluteBoundingBox: boite }));
    const interieur = Array.from({ length: variant.imbriques ?? 0 }, (_, k) => a.calque(`v${rang}-i${k}`, 'FRAME', { absoluteBoundingBox: boite }));
    const instance = enInstance ? [a.calque(`v${rang}-inst`, 'INSTANCE', { absoluteBoundingBox: boite, overrides: [], componentProperties: {}, getMainComponentAsync: async () => null }, interieur)] : [];
    const enfants = [...feuilles, ...instance];
    const tous = [...enfants, ...interieur];
    const champs: Record<string, unknown> = {
      name: `Etat=v${rang}`, absoluteBoundingBox: boite,
      findAll: () => { if (variant.leve === 'compter') throw new Error('Figma refuse le parcours du variant'); return tous; },
    };
    if (variant.leve === 'parcourir') Object.defineProperty(champs, 'children', { enumerable: true, get() { throw new Error('Figma refuse la lecture des enfants'); } });
    return a.calque(`v${rang}`, 'COMPONENT', champs, variant.leve === 'parcourir' ? [] : enfants);
  });
  const jeu = a.calque('jeu', 'COMPONENT_SET', {
    name: 'Budget', key: 'cle-budget', defaultVariant: composants[0],
    componentPropertyDefinitions: { Etat: { type: 'VARIANT', defaultValue: 'v0', variantOptions: composants.map((_, rang) => `v${rang}`) } },
  }, composants);
  return { jeu, port: a.port(portDeTest([], []).port), composants };
}

// ---------------------------------------------------------------------------------------------------------------------------
// Oracle

export interface CoupeAttendue {
  /** Les variants lus : le variant de référence, puis le préfixe qui tient. */
  readonly gardes: number;
  /** La somme des layers des variants laissés, ou 0. */
  readonly nonLus: number;
}

/** La règle du plan (P16), appliquée à des décomptes de variants. */
export function coupeAttendue(comptes: readonly number[], budget = BUDGET): CoupeAttendue {
  if (comptes.length === 0) return { gardes: 0, nonLus: 0 };
  let lus = comptes[0];
  let gardes = 1;
  let coupe = false;
  let nonLus = 0;
  for (const compte of comptes.slice(1)) {
    if (!coupe && lus + compte <= budget) { lus += compte; gardes += 1; continue; }
    coupe = true;
    nonLus += compte;
  }
  return { gardes, nonLus };
}

interface MesureDuMonde {
  readonly releve: { gardes: number; variantsNonLus: number; layersNonLus: number | 'inconnu'; layersLus: number; manquees: number } | { echec: string };
  readonly moteur: { gardes: number; nonLus: number | 'inconnu' | null } | { echec: string };
}

async function mesurerLeMonde(monde: MondeDuBudget): Promise<MesureDuMonde> {
  const { jeu, port, composants } = batir(monde);
  let releve: MesureDuMonde['releve'];
  try {
    const issue = await lireLeReleve(port, jeu, { budgetDeLayers: monde.budget ?? BUDGET });
    releve = issue.statut === 'lu'
      ? { gardes: issue.releve.variants.length, variantsNonLus: issue.releve.lecture.variantsNonLus.length, layersNonLus: issue.releve.lecture.layersNonLus, layersLus: issue.releve.lecture.layersLus, manquees: issue.releve.lecture.manquees.length }
      : { echec: `statut ${issue.statut}` };
  } catch (erreur) {
    releve = { echec: erreur instanceof Error ? erreur.message : String(erreur) };
  }
  let moteur: MesureDuMonde['moteur'];
  try {
    const entrees: VariantEntry[] = composants.map((component) => ({ values: {}, component: component as unknown as ComponentNode }));
    const { gardes, bilan } = bornerLesVariants(entrees, null, monde.budget ?? BUDGET, () => {});
    moteur = { gardes: gardes.length, nonLus: bilan ? bilan.nonLus : null };
  } catch (erreur) {
    moteur = { echec: erreur instanceof Error ? erreur.message : String(erreur) };
  }
  return { releve, moteur };
}

const sortieDuMonde = (mesure: MesureDuMonde, monde: MondeDuBudget): SortieDeCas => ({
  constats: [], donnees: { mesure, total: monde.variants.reduce((somme, v) => somme + comptage(v, 'releve'), 0) },
});

const dit = (valeur: unknown): string => JSON.stringify(valeur);

/** Les écarts d'une mesure contre la règle du plan : chaque lecteur coupe au préfixe attendu, et tous deux coupent au même variant. */
function ecartsDeLaCoupe(mesure: MesureDuMonde, monde: MondeDuBudget): string[] {
  const messages: string[] = [];
  const budget = monde.budget ?? BUDGET;
  const pourReleve = coupeAttendue(monde.variants.map((v) => comptage(v, 'releve')), budget);
  const pourMoteur = coupeAttendue(monde.variants.map((v) => comptage(v, 'moteur')), budget);
  if ('echec' in mesure.releve) messages.push(`le relevé échoue : ${mesure.releve.echec}`);
  else {
    if (mesure.releve.gardes !== pourReleve.gardes) messages.push(`le relevé garde ${mesure.releve.gardes} variants, attendu ${pourReleve.gardes}`);
    const voulu = pourReleve.nonLus;
    if (mesure.releve.layersNonLus !== voulu) messages.push(`layersNonLus du relevé : ${dit(mesure.releve.layersNonLus)}, attendu ${voulu}`);
    if (mesure.releve.variantsNonLus !== monde.variants.length - pourReleve.gardes) messages.push(`le relevé laisse ${mesure.releve.variantsNonLus} variants, attendu ${monde.variants.length - pourReleve.gardes}`);
  }
  if ('echec' in mesure.moteur) messages.push(`le moteur s’arrête : ${mesure.moteur.echec}`);
  else {
    if (mesure.moteur.gardes !== pourMoteur.gardes) messages.push(`le moteur garde ${mesure.moteur.gardes} variants, attendu ${pourMoteur.gardes}`);
    const voulu = pourMoteur.nonLus === 0 ? null : pourMoteur.nonLus;
    if (mesure.moteur.nonLus !== voulu) messages.push(`nonLus du moteur : ${dit(mesure.moteur.nonLus)}, attendu ${dit(voulu)}`);
  }
  if (!('echec' in mesure.releve) && !('echec' in mesure.moteur) && mesure.releve.gardes !== mesure.moteur.gardes) {
    messages.push(`le relevé coupe à ${mesure.releve.gardes} variants et le moteur à ${mesure.moteur.gardes} : ils doivent couper au même variant`);
  }
  return messages;
}

/** Un variant dont la lecture lève est une lecture manquée de ce variant, sans couper les suivants (Q-F89-19) ; le moteur ne s'arrête pas. */
function ecartsDeLaLectureQuiLeve(mesure: MesureDuMonde, monde: MondeDuBudget, genre: 'parcourir' | 'compter'): string[] {
  const messages: string[] = [];
  const total = monde.variants.length;
  if (genre === 'parcourir') {
    if ('echec' in mesure.releve) messages.push(`le relevé échoue : ${mesure.releve.echec}`);
    else {
      if (mesure.releve.manquees !== 1) messages.push(`${mesure.releve.manquees} lectures manquées, attendu 1 (le variant dont les enfants ne se lisent pas)`);
      if (mesure.releve.gardes !== total - 1) messages.push(`le relevé garde ${mesure.releve.gardes} variants sur ${total}, attendu ${total - 1} : seul le variant illisible manque`);
    }
  } else if ('echec' in mesure.moteur) messages.push(`le moteur s’arrête pour un décompte qui lève : ${mesure.moteur.echec}`);
  return messages;
}

const uniformes = (nombre: number, layers: number): VariantDuMonde[] => Array.from({ length: nombre }, () => ({ layers }));

const H21 = 'hypothèse 21 de 6.1 (un `parcourir` ou un décompte qui lève coupe les variants suivants ou arrête le moteur)';
const P15 = 'P15 du plan (la bannière donne les nombres réellement lus et la cause) ; E-32';
const H14 = 'hypothèse 14 de 6.1 (moteur partiel « N variants lus sur N » ; le relevé et le moteur coupent à des variants différents)';

function bd1(registre: Registre): void {
  const ajouter = (description: string, monde: MondeDuBudget, plus: { question?: string; rattachement?: string; juger?: (mesure: MesureDuMonde) => string[] } = {}): void => {
    const total = monde.variants.reduce((somme, v) => somme + comptage(v, 'releve'), 0);
    const coupe = coupeAttendue(monde.variants.map((v) => comptage(v, 'releve')), monde.budget ?? BUDGET);
    registre.ajouter('Bd1', {
      description: `${description} — total ${total} layers, ${coupe.nonLus === 0 ? 'aucune coupe' : `coupe après ${coupe.gardes} variants, ${coupe.nonLus} layers laissés`}`,
      relations: [], ...(plus.question ? { question: plus.question } : {}), ...(plus.rattachement ? { rattachement: plus.rattachement } : {}),
      jouer: async () => sortieDuMonde(await mesurerLeMonde(monde), monde),
      verifier: (sortie) => (plus.juger ?? ((mesure) => ecartsDeLaCoupe(mesure, monde)))((sortie.donnees as { mesure: MesureDuMonde }).mesure),
    });
  };
  const dixLayers = (nombre: number, dernier: number): VariantDuMonde[] => [...uniformes(nombre - 1, 10), { layers: dernier }];
  ajouter('jeu de variants de 10 layers, total de 1 999', { variants: dixLayers(200, 9) });
  ajouter('jeu de variants de 10 layers, total de 2 000', { variants: dixLayers(200, 10) });
  ajouter('jeu de variants de 10 layers, total de 2 001', { variants: dixLayers(200, 11) });
  ajouter('le premier variant seul pèse 2 500 layers', { variants: [{ layers: 2500 }, ...uniformes(2, 10)] });
  ajouter('216 variants de 12 layers', { variants: uniformes(216, 12) });
  for (const rang of [3, 100, 216]) {
    const variants = uniformes(216, 5).map((variant, i) => (i === rang - 1 ? { ...variant, leve: 'parcourir' as const } : variant));
    ajouter(`\`parcourir\` lève sur le variant ${rang} de 216`, { variants }, {
      question: 'Q-F89-19', rattachement: H21, juger: (mesure) => ecartsDeLaLectureQuiLeve(mesure, { variants }, 'parcourir'),
    });
  }
  for (const [moment, rang] of [['avant la coupe', 5], ['après la coupe', 190]] as const) {
    const variants = uniformes(200, 12).map((variant, i) => (i === rang - 1 ? { ...variant, leve: 'compter' as const } : variant));
    ajouter(`\`compterLesLayers\` lève ${moment} (variant ${rang})`, { variants }, {
      rattachement: H21, juger: (mesure) => ecartsDeLaLectureQuiLeve(mesure, { variants }, 'compter'),
    });
  }
  ajouter('un variant de 500 layers au milieu', { variants: [...uniformes(100, 10), { layers: 500 }, ...uniformes(60, 10)] });
  bd1Wrapper(registre);
  for (const imbriques of [0, 5, 40]) {
    ajouter(`70 variants de 32 layers dont une instance qui porte ${imbriques} nœuds`, { variants: Array.from({ length: 70 }, () => ({ layers: 32, imbriques })) }, imbriques > 0 ? { rattachement: H14 } : {});
  }
}

// ---------------------------------------------------------------------------------------------------------------------------
// Bd1 : un wrapper de dimensions et une coupe

const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id });

/** Un hôte à deux variants qui posent chacun une instance d'un wrapper de dimensions, lus avec un budget de 2 layers. */
async function wrapperAvecCoupe(): Promise<SortieDeCas> {
  const a = atelierDeCalques();
  const identifiants = ['rayon', 'gap-Small', 'gap-Medium'];
  const variants = ['Small', 'Medium'].map((taille) => {
    const contenu = a.calque(`w-${taille}-contenu`, 'FRAME', { absoluteBoundingBox: boite, boundVariables: { itemSpacing: alias(`gap-${taille}`) } });
    return a.calque(`w-${taille}`, 'COMPONENT', { name: `Size=${taille}`, key: `cle-w-${taille}`, remote: false, absoluteBoundingBox: boite }, [contenu]);
  });
  a.calque('jeu-wrapper', 'COMPONENT_SET', {
    name: '.sizeWrapper', key: 'cle-wrapper', componentPropertyDefinitions: { Size: { type: 'VARIANT', defaultValue: 'Small', variantOptions: ['Small', 'Medium'] } },
  }, variants);
  const hotes = ['Repos', 'Survol'].map((etat) => a.calque(`hote-${etat}`, 'COMPONENT', { name: `Etat=${etat}`, absoluteBoundingBox: boite },
    [a.calque(`inst-${etat}`, 'INSTANCE', { absoluteBoundingBox: boite, boundVariables: { cornerRadius: alias('rayon') }, getMainComponentAsync: async () => variants[1] })]));
  const jeu = a.calque('hote', 'COMPONENT_SET', {
    name: 'Button', key: 'cle-button', defaultVariant: hotes[0],
    componentPropertyDefinitions: { Etat: { type: 'VARIANT', defaultValue: 'Repos', variantOptions: ['Repos', 'Survol'] } },
  }, hotes);
  const { port } = portDeTest(
    [collectionFigma('c', 'Composants', ['Valeur'], identifiants)],
    identifiants.map((id) => variableFigma(id, 'c', id === 'rayon' ? 'Button/radius' : `Button/Size/${id.split('-')[1]}/gap`, 'FLOAT', { 'c:Valeur': 4 })),
  );
  const issue = await lireLeReleve(a.port(port), jeu, { budgetDeLayers: 2 });
  return { constats: [], donnees: { issue: issue.statut === 'lu' ? { lecture: issue.releve.lecture, wrappers: issue.releve.wrappers?.length ?? 0, variants: issue.releve.variants.length } : { statut: issue.statut } } };
}

function bd1Wrapper(registre: Registre): void {
  registre.ajouter('Bd1', {
    description: 'un wrapper avec coupe — total 4 layers, coupe après 1 variant, 2 layers laissés : l’hôte est coupé, aucun wrapper n’est lu et aucune lecture manquée n’est inventée',
    relations: [], jouer: wrapperAvecCoupe,
    verifier: (sortie) => {
      const { issue } = sortie.donnees as { issue: { lecture?: { variantsNonLus: string[]; layersNonLus: number | string; manquees: unknown[] }; wrappers?: number; variants?: number; statut?: string } };
      if (!issue.lecture) return [`relevé non lu : ${String(issue.statut)}`];
      const messages: string[] = [];
      if (issue.variants !== 1) messages.push(`${String(issue.variants)} variant(s) lu(s), attendu 1`);
      if (issue.lecture.layersNonLus !== 2) messages.push(`layersNonLus ${String(issue.lecture.layersNonLus)}, attendu 2`);
      if (issue.wrappers !== 0) messages.push(`${String(issue.wrappers)} wrapper(s) lu(s) sur un hôte coupé, attendu aucun`);
      if (issue.lecture.manquees.length > 0) messages.push(`${issue.lecture.manquees.length} lecture(s) manquée(s) inventée(s)`);
      return messages;
    },
  });
}

// ---------------------------------------------------------------------------------------------------------------------------
// Bd2 : contrôles du kit sur un relevé coupé

const POSITIONS: ReadonlyArray<readonly [string, number]> = [['premier variant seul', 1], ['coupe médiane', 18], ['coupe à l’avant-dernier', 35]];

/** Un relevé coupé après `gardes` variants, comme le relevé d'Architect le rend : les noms des variants laissés et la somme exacte de leurs layers. */
export const releveCoupe = (gardes: number): Adaptateur => (b, lecteurs, s) => {
  const retenus = new Set(s.ordreInitial.slice(0, gardes).map((v) => v.id));
  const gardesV = b.releve.variants.filter((v) => retenus.has(v.id));
  const laisses = b.releve.variants.filter((v) => !retenus.has(v.id));
  (b.releve as { variants: unknown }).variants = gardesV;
  (b.releve as { lecture: unknown }).lecture = {
    ...b.releve.lecture, layersLus: gardesV.reduce((somme, v) => somme + v.layers.length, 0),
    layersNonLus: laisses.reduce((somme, v) => somme + v.layers.length, 0), variantsNonLus: laisses.map((v) => v.nom),
  };
  return lecteurs;
};

function bd2(registre: Registre): void {
  const groupes: ReadonlyArray<readonly [string, readonly string[]]> = [['oublis', ['C31', 'C32', 'C33']], ['fratrie', ['C21']], ['nommage', ['C7', 'C12', 'C13']]];
  for (const [groupe, codes] of groupes) {
    for (const [position, gardes] of POSITIONS) {
      ajouterUneSeance(registre, 'Bd2', {
        description: `contrôles ${groupe} (${codes.join(', ')}) sur un relevé coupé après ${gardes} variants sur 36 : ${position}`,
        options: { adaptateurs: [releveCoupe(gardes)] }, codesJuges: codes, relations: ['ordre'],
        attente: { statut: 'partielle', provisoires: 1, sansCodes: codes },
        plus: (sortie) => {
          const lecture = observationDe(sortie).final?.lecture;
          return lecture && lecture.variantsNonLus.length === 36 - gardes ? [] : [`le message final laisse ${lecture?.variantsNonLus.length} variants, attendu ${36 - gardes}`];
        },
      });
    }
  }
}

// ---------------------------------------------------------------------------------------------------------------------------
// Bd3 : texte de la bannière

function bd3(registre: Registre): void {
  const cas = (description: string, adaptateurs: Adaptateur[], ecran: NonNullable<Attente['ecran']>, rattachement?: string): void =>
    ajouterUneSeance(registre, 'Bd3', {
      description, options: { adaptateurs }, relations: [], ...(rattachement ? { rattachement } : {}),
      attente: { statut: 'partielle', provisoires: 1, ecran },
    });
  cas('layersNonLus est un nombre : 231 layers lus sur 252', [releveCoupe(33)], { dit: [/a lu 231 layers sur 252/], nonDit: [JAMAIS_N_SUR_N] });
  cas('layersNonLus est `inconnu` : la bannière le dit', [releveCoupe(33), degraderLaLecture({ layersNonLus: 'inconnu' })], { dit: [/n’a pas lu tout le composant/i], nonDit: [JAMAIS_N_SUR_N] }, P15);
  cas('variants non lus sans layers comptés : 33 variants lus sur 36', [degraderLaLecture({ variantsNonLus: ['v34', 'v35', 'v36'] }), (b, lecteurs, s) => { const retenus = new Set(s.ordreInitial.slice(0, 33).map((v) => v.id)); (b.releve as { variants: unknown }).variants = b.releve.variants.filter((v) => retenus.has(v.id)); return lecteurs; }], { dit: [/a lu 33 variants sur 36/], nonDit: [JAMAIS_N_SUR_N] });
  cas('lectures manquées seules : 3 lectures ont échoué', [degraderLaLecture({ manquees: [{ layer: '20:1', champ: 'fills', motif: 'x' }, { layer: '20:2', champ: 'fills', motif: 'x' }, { layer: '20:3', champ: 'fills', motif: 'x' }] })], { dit: [/3 lectures ont échoué/], nonDit: [JAMAIS_N_SUR_N] });
  cas('lectures manquées avec coupe : les deux nombres sont dits', [releveCoupe(33), degraderLaLecture({ manquees: [{ layer: '20:1', champ: 'fills', motif: 'x' }, { layer: '20:2', champ: 'fills', motif: 'x' }] })], { dit: [/a lu 231 layers sur 252/, /2 lectures ont échoué/], nonDit: [JAMAIS_N_SUR_N] }, P15);
  cas('moteur partiel seul : la bannière nomme le moteur, jamais « N sur N »', [avecLecteurs({ moteur: async () => moteurAvecCouverture({ etat: 'partielle', lus: 24, nonLus: 12 }) })], { dit: [DIT.moteur], nonDit: [JAMAIS_N_SUR_N] }, H14);
}

// ---------------------------------------------------------------------------------------------------------------------------

export function operateursBudget(): CasF8[] {
  const registre = new Registre('F9');
  bd1(registre);
  bd2(registre);
  bd3(registre);
  return registre.cas;
}

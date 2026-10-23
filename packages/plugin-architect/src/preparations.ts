/**
 * Les préparations de tokens : leur forme, le texte qu'on échange, leur rangement dans `figma.clientStorage` et les liaisons
 * qu'elles proposent au retour dans le fichier des composants. Rien ici ne touche au document.
 *
 * Le texte échangé est un JSON `{ format: 'ucm-preparation', version: 1, id, source, creeLe, variables, regles }`. Il se valide
 * dans cet ordre : le format, la version (une version supérieure est refusée comme `future`), puis chaque champ. Un champ de plus
 * que ceux de la forme est ignoré ; `indice` est facultatif dans un layer, et le texte ne le porte que s'il existe.
 *
 * Le rangement est une liste sous `CLE_DES_PREPARATIONS`, relue et réécrite entière, sans verrou : le dernier écrit l'emporte.
 * Une préparation se retrouve par son `id`. Les états des variables (`etats`) sont ceux du dernier essai de création : ils ne
 * font pas partie du texte échangé, et le fichier des tokens reste la seule vérité d'une reprise.
 */
import type { Correction, PreparationDesTokens, ReleveDeComposant } from '@ucm-kit/core/controles';
import { CIBLES_DES_COLLECTIONS, CIBLES_DES_COULEURS_DE_COMPOSANT, CLES_D_ARCHITECT, ESPACE_ARCHITECT, type Collection } from '@ucm-kit/core/referentiel';

import type { RegleRecue } from './messages/nomenclature';

/** La couche qui lie le plus de couches : celle du composant, destination d'une préparation. */
export const COUCHE_DES_COMPOSANTS: Collection = (Object.keys(CIBLES_DES_COLLECTIONS) as Collection[]).sort((a, b) => CIBLES_DES_COLLECTIONS[b].length - CIBLES_DES_COLLECTIONS[a].length)[0];
/** La couche que visent les couleurs d'un composant. */
export const COUCHE_DES_COULEURS: Collection = CIBLES_DES_COULEURS_DE_COMPOSANT[0];
/** La couche que visent les tailles d'un composant : la cible du composant qui n'est ni celle des couleurs ni la typographie. */
export const COUCHE_DES_TAILLES: Collection = CIBLES_DES_COLLECTIONS[COUCHE_DES_COMPOSANTS].find((couche) => couche !== COUCHE_DES_COULEURS && couche !== 'typography') ?? COUCHE_DES_COULEURS;

export const CLE_DES_PREPARATIONS = `${ESPACE_ARCHITECT}.${CLES_D_ARCHITECT.preparations}`;
export const FORMAT_DE_PREPARATION = 'ucm-preparation';
export const VERSION_DE_PREPARATION = 1;
/** Au-delà, le texte n'est pas lu : une préparation réelle tient très en dessous. */
export const LONGUEUR_MAXIMALE_DU_TEXTE = 2_000_000;

export interface SourceDePreparation {
  readonly fichier: string;
  readonly cleDuFichier: string | null;
  readonly jeu: { readonly cle: string; readonly nom: string };
}

export interface LayerPrepare {
  readonly id: string;
  readonly variant: string;
  readonly champ: string;
  readonly indice?: number;
}

export interface VariablePreparee {
  /** Le nom complet, `components/composant/…`. */
  readonly nom: string;
  readonly type: 'COLOR' | 'FLOAT';
  /** Le nom de la variable visée, par nom de mode de `components`. */
  readonly cibles: Readonly<Record<string, string>>;
  readonly layers: readonly LayerPrepare[];
}

export interface ReglePreparee {
  readonly ancien: string;
  readonly nouveau: string;
  readonly composant: string;
}

export type EtatDeVariable = 'a-creer' | 'existe-identique' | 'existe-divergente' | 'creee' | 'echec';
export const ETATS_DE_VARIABLE: readonly EtatDeVariable[] = ['a-creer', 'existe-identique', 'existe-divergente', 'creee', 'echec'];

export interface PreparationRangee {
  readonly id: string;
  readonly source: SourceDePreparation;
  readonly creeLe: string;
  readonly variables: readonly VariablePreparee[];
  readonly regles: readonly ReglePreparee[];
  /** L'état de chaque variable, par nom, au dernier essai de création ; absent avant le premier. */
  readonly etats?: Readonly<Record<string, EtatDeVariable>>;
}

// L'identifiant

/** `prep-<horodatage>-<aléa>`, en base 36. */
export function identifiantDePreparation(maintenant: number = Date.now(), hasard: () => number = Math.random): string {
  return `prep-${maintenant.toString(36)}-${Math.floor(hasard() * 36 ** 6).toString(36).padStart(6, '0')}`;
}

// Le texte échangé

export type MotifDeTexteRefuse = 'illisible' | 'format' | 'future' | 'champ-faux' | 'rangement-impossible';

export type LectureDuTexte =
  | { readonly lue: true; readonly preparation: PreparationRangee }
  | { readonly lue: false; readonly motif: MotifDeTexteRefuse; readonly champ?: string };

type Objet = Readonly<Record<string, unknown>>;
const estObjet = (valeur: unknown): valeur is Objet => typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur);
const estTexte = (valeur: unknown): valeur is string => typeof valeur === 'string' && valeur !== '';

/** Le texte échangé d'une préparation : sans les états, dans l'ordre des champs de la forme. */
export function texteDeLaPreparation(preparation: PreparationRangee): string {
  const { id, source, creeLe, variables, regles } = preparation;
  return JSON.stringify({ format: FORMAT_DE_PREPARATION, version: VERSION_DE_PREPARATION, id, source, creeLe, variables, regles }, null, 2);
}

const faux = (champ: string): LectureDuTexte => ({ lue: false, motif: 'champ-faux', champ });

function lireLesLayers(brut: unknown, champ: string): LayerPrepare[] | string {
  if (!Array.isArray(brut)) return champ;
  const layers: LayerPrepare[] = [];
  for (let rang = 0; rang < brut.length; rang++) {
    const layer: unknown = brut[rang];
    if (!estObjet(layer) || !estTexte(layer.id) || !estTexte(layer.variant) || !estTexte(layer.champ)) return `${champ}[${rang}]`;
    if (layer.indice !== undefined && !(Number.isInteger(layer.indice) && (layer.indice as number) >= 0)) return `${champ}[${rang}].indice`;
    layers.push({ id: layer.id, variant: layer.variant, champ: layer.champ, ...(layer.indice === undefined ? {} : { indice: layer.indice as number }) });
  }
  return layers;
}

function lireLesVariables(brut: unknown): VariablePreparee[] | string {
  if (!Array.isArray(brut)) return 'variables';
  const vues = new Set<string>();
  const variables: VariablePreparee[] = [];
  for (let rang = 0; rang < brut.length; rang++) {
    const champ = `variables[${rang}]`;
    const variable: unknown = brut[rang];
    if (!estObjet(variable)) return champ;
    if (!estTexte(variable.nom) || !variable.nom.startsWith('components/') || variable.nom.endsWith('/') || vues.has(variable.nom)) return `${champ}.nom`;
    if (variable.type !== 'COLOR' && variable.type !== 'FLOAT') return `${champ}.type`;
    if (!estObjet(variable.cibles)) return `${champ}.cibles`;
    const modes = Object.entries(variable.cibles);
    if (modes.length === 0 || modes.some(([mode, cible]) => mode === '' || !estTexte(cible))) return `${champ}.cibles`;
    const layers = lireLesLayers(variable.layers, `${champ}.layers`);
    if (typeof layers === 'string') return layers;
    vues.add(variable.nom);
    variables.push({ nom: variable.nom, type: variable.type, cibles: Object.fromEntries(modes) as Record<string, string>, layers });
  }
  return variables;
}

function lireLesRegles(brut: unknown): ReglePreparee[] | string {
  if (!Array.isArray(brut)) return 'regles';
  const regles: ReglePreparee[] = [];
  for (let rang = 0; rang < brut.length; rang++) {
    const regle: unknown = brut[rang];
    if (!estObjet(regle) || !estTexte(regle.ancien) || !estTexte(regle.nouveau) || !estTexte(regle.composant)) return `regles[${rang}]`;
    regles.push({ ancien: regle.ancien, nouveau: regle.nouveau, composant: regle.composant });
  }
  return regles;
}

/** Lit le texte échangé : une préparation, ou le motif du refus et, pour un champ faux, son chemin. */
export function lireLeTexte(texte: string): LectureDuTexte {
  if (typeof texte !== 'string' || texte.length > LONGUEUR_MAXIMALE_DU_TEXTE) return { lue: false, motif: 'illisible' };
  let brut: unknown;
  try { brut = JSON.parse(texte); } catch { return { lue: false, motif: 'illisible' }; }
  if (!estObjet(brut) || brut.format !== FORMAT_DE_PREPARATION) return { lue: false, motif: 'format' };
  if (!Number.isInteger(brut.version) || (brut.version as number) < 1) return faux('version');
  if ((brut.version as number) > VERSION_DE_PREPARATION) return { lue: false, motif: 'future' };
  if (!estTexte(brut.id)) return faux('id');
  const { source } = brut;
  if (!estObjet(source)) return faux('source');
  if (typeof source.fichier !== 'string') return faux('source.fichier');
  if (source.cleDuFichier !== null && !estTexte(source.cleDuFichier)) return faux('source.cleDuFichier');
  if (!estObjet(source.jeu) || !estTexte(source.jeu.cle)) return faux('source.jeu.cle');
  if (!estTexte(source.jeu.nom)) return faux('source.jeu.nom');
  if (!estTexte(brut.creeLe) || Number.isNaN(Date.parse(brut.creeLe))) return faux('creeLe');
  const variables = lireLesVariables(brut.variables);
  if (typeof variables === 'string') return faux(variables);
  const regles = lireLesRegles(brut.regles);
  if (typeof regles === 'string') return faux(regles);
  return {
    lue: true,
    preparation: {
      id: brut.id, creeLe: brut.creeLe, variables, regles,
      source: { fichier: source.fichier, cleDuFichier: source.cleDuFichier as string | null, jeu: { cle: source.jeu.cle, nom: source.jeu.nom } },
    },
  };
}

// Du plan à la préparation

/**
 * Les variables d'un plan sans question restante, chacune avec la cible qu'elle vise dans chaque mode de `components`. Rend `null`
 * tant qu'une variable attend une réponse ou vise rien, et quand le plan est vide.
 */
export function preparationDuPlan(
  plan: PreparationDesTokens, contexte: { id: string; creeLe: string; source: SourceDePreparation; modes: readonly string[] },
): PreparationRangee | null {
  if (plan.variables.length === 0 || plan.questions.length > 0 || plan.variables.some((variable) => variable.vise === null || variable.attend.length > 0)) return null;
  const modes = contexte.modes.length > 0 ? contexte.modes : ['Mode 1'];
  const variables = plan.variables.map((variable): VariablePreparee => ({
    nom: variable.nom,
    type: variable.type,
    cibles: Object.fromEntries(modes.map((mode) => [mode, variable.vise!.nom])),
    layers: variable.concerne.map((lieu) => ({ id: lieu.layer, variant: lieu.variant, champ: lieu.champ, ...(lieu.indice === undefined ? {} : { indice: lieu.indice }) })),
  }));
  return { id: contexte.id, source: contexte.source, creeLe: contexte.creeLe, variables, regles: [] };
}

// Le rangement

/** Ce que le rangement demande à `figma.clientStorage`. */
export interface PortDeStockage {
  getAsync(cle: string): Promise<unknown>;
  setAsync(cle: string, valeur: unknown): Promise<void>;
}

function lireUneEntreeRangee(brut: unknown): PreparationRangee | null {
  if (!estObjet(brut)) return null;
  const { etats, ...texte } = brut;
  const lue = lireLeTexte(JSON.stringify({ format: FORMAT_DE_PREPARATION, version: VERSION_DE_PREPARATION, ...texte }));
  if (!lue.lue) return null;
  if (!estObjet(etats)) return lue.preparation;
  const gardes = Object.entries(etats).filter(([nom, etat]) => lue.preparation.variables.some((variable) => variable.nom === nom) && ETATS_DE_VARIABLE.includes(etat as EtatDeVariable));
  return { ...lue.preparation, etats: Object.fromEntries(gardes) as Record<string, EtatDeVariable> };
}

/** Les préparations rangées, les plus récentes d'abord. Une entrée illisible est écartée ; un stockage qui lève rend une liste vide. */
export async function lireLesPreparations(stockage: PortDeStockage): Promise<PreparationRangee[]> {
  let brut: unknown;
  try { brut = await stockage.getAsync(CLE_DES_PREPARATIONS); } catch { return []; }
  if (!Array.isArray(brut)) return [];
  const vues = new Set<string>();
  const liste: PreparationRangee[] = [];
  for (const entree of brut) {
    const preparation = lireUneEntreeRangee(entree);
    if (preparation && !vues.has(preparation.id)) { vues.add(preparation.id); liste.push(preparation); }
  }
  return liste.sort((a, b) => Date.parse(b.creeLe) - Date.parse(a.creeLe));
}

/** Réécrit la liste entière. `false` quand le stockage refuse : la liste d'avant reste. */
export async function ecrireLesPreparations(stockage: PortDeStockage, liste: readonly PreparationRangee[]): Promise<boolean> {
  try {
    await stockage.setAsync(CLE_DES_PREPARATIONS, liste.map((preparation) => ({ ...preparation })));
    return true;
  } catch {
    return false;
  }
}

/** Range une préparation : celle de même `id` est remplacée, les autres restent. */
export async function rangerUnePreparation(stockage: PortDeStockage, preparation: PreparationRangee): Promise<boolean> {
  const liste = await lireLesPreparations(stockage);
  return ecrireLesPreparations(stockage, [preparation, ...liste.filter((autre) => autre.id !== preparation.id)]);
}

/** Retire la préparation `id` ; `false` quand elle n'est pas rangée ou que le stockage refuse. */
export async function retirerUnePreparation(stockage: PortDeStockage, id: string): Promise<boolean> {
  const liste = await lireLesPreparations(stockage);
  if (!liste.some((preparation) => preparation.id === id)) return false;
  return ecrireLesPreparations(stockage, liste.filter((preparation) => preparation.id !== id));
}

export async function trouverUnePreparation(stockage: PortDeStockage, id: string): Promise<PreparationRangee | null> {
  return (await lireLesPreparations(stockage)).find((preparation) => preparation.id === id) ?? null;
}

// Le retour au composant

export interface LiaisonEnAttente {
  readonly variable: string;
  readonly layer: string;
  readonly variant: string;
  readonly champ: string;
}

export interface LiaisonsDeLaPreparation {
  /** Les liaisons que la library publiée permet déjà, une par peinture, plage ou valeur à lier. */
  readonly corrections: Correction[];
  /** Les liaisons dont la variable n'est pas dans la library : leur ligne n'a pas de case. */
  readonly enAttente: LiaisonEnAttente[];
  /** Les entrées dont le layer ou le variant a disparu du composant, ou dont le champ est déjà lié. */
  readonly ecartees: number;
}

const REGLE_DE_LIAISON = 'La variable a été préparée pour ce layer.';

/**
 * Les liaisons du retour dans le fichier des composants. `publiees` donne la clé de chaque variable de `components` que la library
 * publiée porte, par nom. Un champ déjà lié n'est pas proposé de nouveau.
 */
export function liaisonsDeLaPreparation(preparation: PreparationRangee, releve: ReleveDeComposant, publiees: ReadonlyMap<string, string>): LiaisonsDeLaPreparation {
  const corrections: Correction[] = [];
  const enAttente: LiaisonEnAttente[] = [];
  let ecartees = 0;
  for (const variable of preparation.variables) {
    const cle = publiees.get(variable.nom);
    for (const lieu of variable.layers) {
      const variant = releve.variants.find((candidat) => candidat.id === lieu.variant);
      const layer = variant?.layers.find((candidat) => candidat.id === lieu.id);
      if (!variant || !layer) { ecartees += 1; continue; }
      const cibles: Correction['cible'][] = [];
      if (lieu.champ === 'fills' || lieu.champ === 'strokes') {
        const aLier = (peinture: { champ: string; indice: number; type: string; visible: boolean }): boolean =>
          peinture.champ === lieu.champ && peinture.visible && peinture.type === 'SOLID' && (lieu.indice === undefined || peinture.indice === lieu.indice);
        if (layer.type === 'TEXT' && lieu.champ === 'fills') {
          for (const plage of layer.texte?.plages ?? []) {
            for (const peinture of plage.peintures.filter(aLier)) {
              if (!plage.liaisons.some((liaison) => liaison.champ === 'fills' && (liaison.indice ?? 0) === peinture.indice)) {
                cibles.push({ layer: layer.id, champ: 'fills', indice: peinture.indice, plage: { debut: plage.debut, fin: plage.fin } });
              }
            }
          }
        } else {
          for (const peinture of layer.peintures.filter(aLier)) {
            if (!layer.liaisons.some((liaison) => !liaison.plage && liaison.champ === peinture.champ && (liaison.indice ?? 0) === peinture.indice)) {
              cibles.push({ layer: layer.id, champ: peinture.champ, indice: peinture.indice });
            }
          }
        }
      } else if (layer.valeursEnDur.some((dure) => dure.champ === lieu.champ) && !layer.liaisons.some((liaison) => liaison.champ === lieu.champ)) {
        cibles.push({ layer: layer.id, champ: lieu.champ });
      }
      if (cibles.length === 0) { ecartees += 1; continue; }
      for (const cible of cibles) {
        if (cle === undefined) { enAttente.push({ variable: variable.nom, layer: layer.id, variant: variant.id, champ: lieu.champ }); continue; }
        const suite = `${cible.champ}${cible.indice === undefined ? '' : `:${cible.indice}`}${cible.plage ? `:${cible.plage.debut}-${cible.plage.fin}` : ''}`;
        corrections.push({
          id: `preparation:${preparation.id}:${layer.id}:${suite}`, sorte: 'liaison', cible, avant: null, apres: { cle, nom: variable.nom },
          aRelire: { axes: variant.valeurs, regle: REGLE_DE_LIAISON, avant: null },
        });
      }
    }
  }
  return { corrections, enAttente, ecartees };
}

// Les règles reçues

/**
 * Les règles d'une préparation, avec le nom réel qui les illustre : une variable de la préparation qui porte le terme voulu
 * (`nouveau`) comme segment, et le même nom avec le terme retiré (`ancien`). Sans telle variable, un nom de couleur du composant en tient lieu.
 */
export function reglesRecuesDeLaPreparation(preparation: PreparationRangee): RegleRecue[] {
  return preparation.regles.filter((regle) => regle.ancien !== regle.nouveau).map((regle) => {
    const nom = preparation.variables.find((variable) => variable.nom.split('/').includes(regle.nouveau))?.nom
      ?? `components/${regle.composant}/color/${regle.nouveau}/background`;
    return { ...regle, exemple: { ancien: nom.split('/').map((segment) => (segment === regle.nouveau ? regle.ancien : segment)).join('/'), nouveau: nom } };
  });
}

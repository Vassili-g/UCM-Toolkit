/**
 * Les règles d'usage d'un composant, en lecture : l'instance de règles
 * existe-t-elle, et dit-elle les propriétés du composant ?
 *
 * Rend C43 (composant sans instance de règles, avec sa correction de sorte
 * `regles`) et C45 (propriété sans règle `@prop`, règle `@prop` sans
 * propriété). C44, la validation des règles, vient du moteur
 * (`constatsDuMoteur.ts`). Le modèle que la correction posera est celui du
 * socle : il pose `@usage`, `@prop`, `@boolean` et `@icons`, jamais `@default`,
 * `@do`, `@dont` ni `@pairs`, qui demandent un jugement du designer.
 *
 * Les modèles des corrections sont retenus ici, par identifiant de correction :
 * l'écriture (`ecriture/regles.ts`) les relit au moment d'appliquer.
 */
import { nomCompacte } from '@ucm-kit/core/referentiel';
import type { Constat, Correction } from '@ucm-kit/core/controles';
import type { InventairesDeLaDemande } from 'ucm-plugin-socle/src/composant/analyse/inventaires';
import { extractRules } from 'ucm-plugin-socle/src/composant/contract/extractRules';
import type { ComponentExport } from 'ucm-plugin-socle/src/composant/contract/exportComponent';
import { extractContractPropertyModel } from 'ucm-plugin-socle/src/composant/contract/parsers';
import { modeleDeRegles, nombreDeRegles, restreindreAuParent } from 'ucm-plugin-socle/src/composant/template/modele';
import type { ContratLu, ModeleDeRegles } from 'ucm-plugin-socle/src/composant/template/modele';

/** Ce qu'une correction de sorte `regles` demande (`apres.nom`). */
export type OperationDeRegles = 'creer' | 'ajouter' | 'retirer';

/** Ce que l'analyse lit des règles d'un composant. */
export interface ReleveDesRegles {
  readonly composant: { readonly id: string; readonly nom: string };
  /** Une instance de règles écrit déjà le nom du composant. */
  readonly instancePresente: boolean;
  /** Ce que le template poserait pour ce composant. */
  readonly modele: ModeleDeRegles;
  /** Les propriétés que le contrat publie et que le template documenterait, telles que le contrat les nomme. */
  readonly proprietes: readonly string[];
  /** Les noms que les règles `@prop` et `@boolean` de l'instance visent, tels que le designer les a écrits. */
  readonly documentees: readonly string[];
}

/** Les propriétés que le modèle documente : une par axe, une par booléenne. */
export function proprietesDuModele(modele: ModeleDeRegles): string[] {
  const noms: string[] = [];
  for (const element of modele.sections.flatMap((section) => section.elements)) {
    if (element.genre !== 'regle' || (element.tag !== 'prop' && element.tag !== 'boolean') || !element.cible) continue;
    const nom = element.tag === 'prop' ? element.cible.slice(0, element.cible.lastIndexOf('.')) : element.cible;
    if (!noms.includes(nom)) noms.push(nom);
  }
  return noms;
}

export const identifiantDeCorrection = (composantId: string): string => `regles:creer:${composantId}`;

/** C43, C45 : les constats d'un relevé de règles. Sans relevé, aucun. */
export function constatsDeRegles(releve: ReleveDesRegles | null): Constat[] {
  if (!releve) return [];
  const { composant } = releve;
  if (!releve.instancePresente) {
    const correction: Correction = {
      id: identifiantDeCorrection(composant.id),
      sorte: 'regles',
      cible: { layer: composant.id },
      avant: null,
      apres: { nom: 'creer' },
      aRelire: { regle: 'regles', avant: null },
    };
    return [{
      id: 'regles:C43', code: 'C43', type: 'corriger', famille: 'regles', variants: [], layers: [],
      faits: { composant: composant.nom, regles: nombreDeRegles(releve.modele), proprietes: releve.proprietes.join(', ') },
      correction,
    }];
  }
  const documentees = new Map(releve.documentees.map((nom) => [nomCompacte(nom), nom]));
  const connues = new Set(releve.proprietes.map(nomCompacte));
  const constats: Constat[] = [];
  for (const propriete of releve.proprietes) {
    if (documentees.has(nomCompacte(propriete))) continue;
    constats.push({ id: `regles:C45:sans-regle:${propriete}`, code: 'C45', type: 'corriger', famille: 'regles', variants: [], layers: [], faits: { composant: composant.nom, propriete, ecart: 'sans-regle' } });
  }
  for (const [cle, regle] of documentees) {
    if (connues.has(cle)) continue;
    constats.push({ id: `regles:C45:sans-propriete:${regle}`, code: 'C45', type: 'corriger', famille: 'regles', variants: [], layers: [], faits: { composant: composant.nom, regle, ecart: 'sans-propriete' } });
  }
  return constats;
}

let modelesRetenus: ReadonlyMap<string, ModeleDeRegles> = new Map();

/** Retient le modèle de la correction de la dernière analyse, par identifiant de correction. */
export function retenirLesModeles(releve: ReleveDesRegles | null): void {
  modelesRetenus = releve && !releve.instancePresente
    ? new Map([[identifiantDeCorrection(releve.composant.id), releve.modele]])
    : new Map();
}

export function modelesDeLAnalyse(): ReadonlyMap<string, ModeleDeRegles> {
  return modelesRetenus;
}

/**
 * Les clés que le composant déclare lui-même. Figma refuse
 * `componentPropertyDefinitions` sur un variant et renvoie à son jeu ; une
 * lecture qui lève ne restreint rien.
 */
function clesDeclarees(composant: ComponentNode | ComponentSetNode): ReadonlySet<string> | null {
  const porteur = composant.type === 'COMPONENT' && composant.parent?.type === 'COMPONENT_SET' ? composant.parent : composant;
  try {
    return new Set(Object.keys(extractContractPropertyModel(porteur.componentPropertyDefinitions, []).props));
  } catch {
    return null;
  }
}

/** La page qui porte un node, ou la page active. */
function pageDe(node: BaseNode): PageNode {
  let courant: BaseNode | null = node;
  while (courant && courant.type !== 'PAGE') courant = courant.parent;
  return (courant as PageNode | null) ?? figma.currentPage;
}

/**
 * Lit les règles du composant sur la page qui le porte, avec le contrat que
 * l'analyse du moteur vient de produire. Le contrat est restreint à ce que le
 * composant déclare, comme à la création : un composant imbriqué n'ajoute pas
 * ses propriétés à celles de son parent. Avec `inventaires`, le scan de la page est celui que le moteur de la même
 * demande a déjà lu.
 */
export async function lireLesRegles(
  composant: ComponentNode | ComponentSetNode,
  exportDuMoteur: Pick<ComponentExport, 'content' | 'imbriques'>,
  inventaires?: InventairesDeLaDemande,
): Promise<ReleveDesRegles> {
  const page = pageDe(composant);
  const scanDesRegles = () => extractRules(composant, page);
  const lues = await (inventaires ? inventaires.reglesDeLaPage(page, composant, scanDesRegles) : scanDesRegles());
  const contrat = JSON.parse(exportDuMoteur.content) as ContratLu;
  const declarees = clesDeclarees(composant);
  const surface = declarees ? new Set([...declarees, ...exportDuMoteur.imbriques.auParent]) : null;
  const modele = modeleDeRegles(composant.name, surface ? restreindreAuParent(contrat, surface) : contrat);
  return {
    composant: { id: composant.id, nom: composant.name },
    instancePresente: lues.releve.conteneurDuComposant,
    modele,
    proprietes: proprietesDuModele(modele),
    documentees: [...Object.keys(lues.propDescriptions), ...Object.keys(lues.booleanDescriptions)],
  };
}

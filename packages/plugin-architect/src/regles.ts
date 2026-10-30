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
import type { ResultatInterne } from 'ucm-plugin-socle/src/composant/analyse/resultat';
import { elideContract } from 'ucm-plugin-socle/src/composant/contract/elideNeutrals';
import { extractContractPropertyModel } from 'ucm-plugin-socle/src/composant/contract/parsers';
import { cibleCompacte, modeleDeRegles, nombreDeRegles, reglesManquantes, restreindreAuParent } from 'ucm-plugin-socle/src/composant/template/modele';
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
  /**
   * Toutes les clés que le contrat publie pour ce composant, wrapper de
   * dimensions compris, quel qu'en soit le type : le modèle n'écrit pas de règle
   * pour un texte, mais une règle qui le vise vise une propriété réelle.
   */
  readonly publiees?: readonly string[];
  /** Les noms que les règles `@prop` et `@boolean` de l'instance visent, tels que le designer les a écrits. */
  readonly documentees: readonly string[];
  /** Les cibles des règles déjà posées, rédigées ou non, compactées par `cibleCompacte`. */
  readonly presentes: readonly string[];
  /** Les règles que le modèle pose et que l'instance ne porte pas. Vide sans instance. */
  readonly manquantes: ModeleDeRegles;
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
const identifiantDAjout = (composantId: string, propriete: string): string => `regles:ajouter:${composantId}:${propriete}`;

const axeDeLaCible = (cible: string): string => cible.slice(0, Math.max(0, cible.lastIndexOf('.')));

/** Les cibles `prop` et `boolean` que `manquantes` porte, groupées par propriété (axe ou clé), dans l'ordre du modèle. */
function ciblesManquantesParPropriete(manquantes: ModeleDeRegles): Map<string, { tag: 'prop' | 'boolean'; cibles: string[] }> {
  const groupes = new Map<string, { tag: 'prop' | 'boolean'; cibles: string[] }>();
  for (const section of manquantes.sections) {
    if (section.tag !== 'prop' && section.tag !== 'boolean') continue;
    for (const element of section.elements) {
      if (element.genre !== 'regle' || !element.cible) continue;
      const propriete = section.tag === 'prop' ? axeDeLaCible(element.cible) : element.cible;
      const groupe = groupes.get(propriete) ?? { tag: section.tag, cibles: [] };
      groupe.cibles.push(element.cible);
      groupes.set(propriete, groupe);
    }
  }
  return groupes;
}

function correctionDAjout(composantId: string, propriete: string): Correction {
  return {
    id: identifiantDAjout(composantId, propriete),
    sorte: 'regles',
    cible: { layer: composantId },
    avant: null,
    apres: { nom: 'ajouter' },
    aRelire: { regle: 'regles', avant: null },
  };
}

/** Le modèle réduit aux règles manquantes d'une propriété, sans séparateur. */
function modeleDUnAjout(manquantes: ModeleDeRegles, propriete: string): ModeleDeRegles {
  const sections = manquantes.sections.flatMap((section) => {
    const elements = section.elements.filter((element) => element.genre === 'regle' && element.cible !== undefined
      && (section.tag === 'boolean' ? element.cible === propriete : element.cible.startsWith(`${propriete}.`)));
    return elements.length > 0 && (section.tag === 'prop' || section.tag === 'boolean') ? [{ tag: section.tag, elements }] : [];
  });
  return { nom: manquantes.nom, sections };
}

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
  const connues = new Set([...releve.proprietes, ...(releve.publiees ?? [])].map(nomCompacte));
  const manquantes = ciblesManquantesParPropriete(releve.manquantes);
  const constats: Constat[] = [];
  for (const propriete of releve.proprietes) {
    if (documentees.has(nomCompacte(propriete))) continue;
    const regles = manquantes.get(propriete)?.cibles.length ?? 0;
    // Sans règle à poser, la correction n'écrirait rien : le constat reste seul.
    constats.push({
      id: `regles:C45:sans-regle:${propriete}`, code: 'C45', type: 'corriger', famille: 'regles', variants: [], layers: [],
      faits: { composant: composant.nom, propriete, ecart: 'sans-regle', regles },
      ...(regles > 0 ? { correction: correctionDAjout(composant.id, propriete) } : {}),
    });
  }
  for (const [propriete, { tag, cibles }] of manquantes) {
    if (tag !== 'prop' || !documentees.has(nomCompacte(propriete))) continue;
    constats.push({
      id: `regles:C45:sans-valeur:${propriete}`, code: 'C45', type: 'corriger', famille: 'regles', variants: [], layers: [],
      faits: { composant: composant.nom, propriete, valeurs: cibles.map((cible) => cible.slice(propriete.length + 1)).join(', '), ecart: 'sans-valeur', regles: cibles.length },
      correction: correctionDAjout(composant.id, propriete),
    });
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
  const retenus = new Map<string, ModeleDeRegles>();
  if (releve && !releve.instancePresente) retenus.set(identifiantDeCorrection(releve.composant.id), releve.modele);
  if (releve?.instancePresente) {
    for (const constat of constatsDeRegles(releve)) {
      if (constat.correction?.apres.nom !== 'ajouter') continue;
      retenus.set(constat.correction.id, modeleDUnAjout(releve.manquantes, String(constat.faits.propriete)));
    }
  }
  modelesRetenus = retenus;
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

/** Ce que la lecture des règles prend du résultat interne du moteur. */
export type SurfaceDuMoteur = Pick<ResultatInterne, 'props' | 'stateModel' | 'imbriques'>;

/**
 * Les `props` et le `stateModel` tels que le contrat publié les écrit : le
 * contrat n'écrit ni `null`, ni `{}`, ni `[]` (`elideContract`), et le modèle
 * des règles se lit sur cette forme. Une copie : le résultat interne n'est pas modifié.
 */
export function contratDesReglesDe(surface: Pick<SurfaceDuMoteur, 'props' | 'stateModel'>): ContratLu {
  return elideContract({ props: surface.props, stateModel: surface.stateModel }, []) as ContratLu;
}

/**
 * Les clés que les règles du composant peuvent viser : ce que le jeu déclare,
 * ce que les imbriqués rattachés au parent lui prêtent, et les props que le
 * moteur a fusionnées depuis le wrapper de dimensions. `props` du résultat
 * interne est déjà cette surface fusionnée, et le contrat publie ces props :
 * les en retirer ferait signaler (C45) des règles qui visent des propriétés
 * réelles. `null` quand les déclarations du jeu ne se lisent pas.
 */
export function surfaceDesRegles(
  declarees: ReadonlySet<string> | null,
  surfaceDuMoteur: Pick<SurfaceDuMoteur, 'props' | 'imbriques'>,
): ReadonlySet<string> | null {
  if (!declarees) return null;
  return new Set([...declarees, ...surfaceDuMoteur.imbriques.auParent, ...Object.keys(surfaceDuMoteur.props)]);
}

/** Les cibles des règles que l'instance porte, rédigées ou non, compactées par `cibleCompacte`. */
export function ciblesPresentes(
  lues: Pick<Awaited<ReturnType<typeof extractRules>>, 'propDescriptions' | 'booleanDescriptions' | 'ciblesNonRedigees'>,
): string[] {
  return [
    ...Object.entries(lues.propDescriptions).flatMap(([axe, valeurs]) => Object.keys(valeurs).map((valeur) => `${axe}.${valeur}`)),
    ...Object.keys(lues.booleanDescriptions),
    ...lues.ciblesNonRedigees,
  ].map(cibleCompacte);
}

/**
 * Lit les règles du composant sur la page qui le porte, avec la surface que
 * l'analyse du moteur vient de produire. Les `props` sont restreintes à ce que le
 * composant déclare, comme à la création : un composant imbriqué n'ajoute pas
 * ses propriétés à celles de son parent. Avec `inventaires`, le scan de la page est celui que le moteur de la même
 * demande a déjà lu.
 */
export async function lireLesRegles(
  composant: ComponentNode | ComponentSetNode,
  surfaceDuMoteur: SurfaceDuMoteur,
  inventaires?: InventairesDeLaDemande,
): Promise<ReleveDesRegles> {
  const page = pageDe(composant);
  const scanDesRegles = () => extractRules(composant, page);
  const lues = await (inventaires ? inventaires.reglesDeLaPage(page, composant, scanDesRegles) : scanDesRegles());
  const contrat = contratDesReglesDe(surfaceDuMoteur);
  const declarees = clesDeclarees(composant);
  const surface = surfaceDesRegles(declarees, surfaceDuMoteur);
  const modele = modeleDeRegles(composant.name, surface ? restreindreAuParent(contrat, surface) : contrat);
  const instancePresente = lues.releve.conteneurDuComposant;
  const presentes = ciblesPresentes(lues);
  const nonRedigees = lues.ciblesNonRedigees.map((cible) => (cible.includes('.') ? axeDeLaCible(cible) : cible));
  return {
    composant: { id: composant.id, nom: composant.name },
    instancePresente,
    modele,
    proprietes: proprietesDuModele(modele),
    publiees: Object.keys(surfaceDuMoteur.props),
    documentees: [...new Set([...Object.keys(lues.propDescriptions), ...Object.keys(lues.booleanDescriptions), ...nonRedigees])],
    presentes,
    manquantes: instancePresente ? reglesManquantes(modele, new Set(presentes)) : { nom: composant.name, sections: [] },
  };
}

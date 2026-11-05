/**
 * Les règles d'usage d'un composant, en lecture : l'instance de règles
 * existe-t-elle, et dit-elle les propriétés du composant ?
 *
 * Rend C43 (composant sans instance de règles, avec sa correction de sorte
 * `regles` : `creer`, ou `remplir` quand la page porte un seul conteneur au nom
 * vide ou marqué, que la correction nomme au lieu d'en poser un second) et C45 (propriété sans règle
 * `@prop`, règle sans propriété, valeur inconnue, règle probablement renommée).
 * C44, la validation des règles, vient du moteur
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
import { normalizePropKey, normalizePropValue } from 'ucm-plugin-socle/src/composant/analyse/proprietesEtEtats';
import { extractRules } from 'ucm-plugin-socle/src/composant/contract/extractRules';
import type { ResultatInterne } from 'ucm-plugin-socle/src/composant/analyse/resultat';
import { elideContract } from 'ucm-plugin-socle/src/composant/contract/elideNeutrals';
import { extractContractPropertyModel } from 'ucm-plugin-socle/src/composant/contract/parsers';
import { cibleCompacte, modeleDeRegles, nombreDeRegles, reglesManquantes, restreindreAuParent } from 'ucm-plugin-socle/src/composant/template/modele';
import type { ContratLu, ModeleDeRegles } from 'ucm-plugin-socle/src/composant/template/modele';

/** Ce qu'une correction de sorte `regles` demande (`apres.nom`). */
export type OperationDeRegles = 'creer' | 'remplir' | 'ajouter' | 'retirer';

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
  /** La page qui porte le composant : le scan ne lit que celle-là. */
  readonly page?: string;
  /** Les autres composants de la page au même nom compacté : le conteneur ne se partage pas, le point du moteur le dit. */
  readonly homonymes?: readonly string[];
  /** Combien de conteneurs au nom vide ou marqué la page porte. */
  readonly orphelins?: number;
  /** Un seul conteneur au nom vide ou marqué sur la page : C43 propose d'y écrire le nom du composant plutôt que d'en poser un second. */
  readonly remplissable?: boolean;
  /** Combien de règles `@prop` ou `@boolean` rédigées ont une cible vide. */
  readonly reglesSansCible?: number;
  /** Les cibles `axe.valeur` des règles `@prop`, normalisées comme le contrat, rédigées ou non. */
  readonly valeursEcrites?: readonly string[];
  /** Les noms des règles `@boolean`, normalisés comme le contrat. */
  readonly booleennesEcrites?: readonly string[];
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

/**
 * Vrai de deux noms compactés à une édition l'un de l'autre (lettre ajoutée, retirée ou remplacée, deux voisines échangées), le plus
 * long ayant au moins quatre lettres : en dessous, deux noms voisins se confondent trop souvent pour dire qu'un seul a changé.
 */
function nomsVoisins(a: string, b: string): boolean {
  const [court, long] = a.length <= b.length ? [a, b] : [b, a];
  if (long.length < 4 || long.length - court.length > 1 || a === b) return false;
  let debut = 0;
  while (debut < court.length && court[debut] === long[debut]) debut += 1;
  if (long.length === court.length) {
    if (court.slice(debut + 1) === long.slice(debut + 1)) return true;
    return court[debut] === long[debut + 1] && court[debut + 1] === long[debut] && court.slice(debut + 2) === long.slice(debut + 2);
  }
  return court.slice(debut) === long.slice(debut + 1);
}

/** Les axes `@prop` du modèle par nom compacté, avec la cible compactée de chacune de leurs valeurs. */
function axesDuModele(modele: ModeleDeRegles): Map<string, { nom: string; valeurs: Set<string> }> {
  const axes = new Map<string, { nom: string; valeurs: Set<string> }>();
  for (const section of modele.sections) {
    if (section.tag !== 'prop') continue;
    for (const element of section.elements) {
      if (element.genre !== 'regle' || !element.cible) continue;
      const nom = axeDeLaCible(element.cible);
      const axe = axes.get(nomCompacte(nom)) ?? { nom, valeurs: new Set<string>() };
      axe.valeurs.add(cibleCompacte(element.cible));
      axes.set(nomCompacte(nom), axe);
    }
  }
  return axes;
}

/** C43, C45 : les constats d'un relevé de règles. Sans relevé, aucun. */
export function constatsDeRegles(releve: ReleveDesRegles | null): Constat[] {
  if (!releve) return [];
  const { composant } = releve;
  // Deux composants au même nom compacté ne partagent pas leur conteneur : le point du moteur (`nom-compacte-double`) le dit seul.
  if ((releve.homonymes?.length ?? 0) > 0) return [];
  if (!releve.instancePresente) {
    // Un conteneur au nom vide ou marqué que la correction ne peut pas remplir seule reste dit par le point du moteur : C43 n'accuse pas deux fois.
    if ((releve.orphelins ?? 0) > 0 && releve.remplissable !== true) return [];
    const correction: Correction = {
      id: identifiantDeCorrection(composant.id),
      sorte: 'regles',
      cible: { layer: composant.id },
      avant: null,
      apres: { nom: releve.remplissable === true ? 'remplir' : 'creer' },
      aRelire: { regle: 'regles', avant: null },
    };
    return [{
      id: 'regles:C43', code: 'C43', type: 'corriger', famille: 'regles', variants: [], layers: [],
      faits: { composant: composant.nom, regles: nombreDeRegles(releve.modele), proprietes: releve.proprietes.join(', '), ...(releve.page ? { page: releve.page } : {}) },
      correction,
    }];
  }
  const documentees = new Map(releve.documentees.map((nom) => [nomCompacte(nom), nom]));
  const connues = new Set([...releve.proprietes, ...(releve.publiees ?? [])].map(nomCompacte));
  const manquantes = ciblesManquantesParPropriete(releve.manquantes);
  const axes = axesDuModele(releve.modele);

  // Une propriété sans règle et une règle sans propriété au nom voisin : une seule règle probablement renommée, jamais plusieurs candidates (Q-F89-13).
  const sansRegle = releve.proprietes.filter((propriete) => !documentees.has(nomCompacte(propriete)));
  const sansPropriete = [...documentees].filter(([cle]) => !connues.has(cle)).map(([, regle]) => regle);
  const renommees = new Map<string, string>();
  for (const propriete of sansRegle) {
    const candidates = sansPropriete.filter((regle) => nomsVoisins(nomCompacte(propriete), nomCompacte(regle)));
    if (candidates.length !== 1) continue;
    if (sansRegle.filter((autre) => nomsVoisins(nomCompacte(autre), nomCompacte(candidates[0]))).length !== 1) continue;
    renommees.set(propriete, candidates[0]);
  }
  const renommeesParRegle = new Set(renommees.values());

  const constats: Constat[] = [];
  for (const propriete of sansRegle) {
    const regle = renommees.get(propriete);
    if (regle !== undefined) {
      constats.push({
        id: `regles:C45:regle-renommee:${propriete}`, code: 'C45', type: 'corriger', famille: 'regles', variants: [], layers: [],
        faits: { composant: composant.nom, propriete, regle, ecart: 'regle-renommee' },
      });
      continue;
    }
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
  // Une valeur écrite que l'axe n'a pas : aucune correction, le designer dit si la règle ou le composant se trompe (Q-F89-2).
  const inconnues = new Set<string>();
  for (const ecrite of releve.valeursEcrites ?? []) {
    const axe = axes.get(nomCompacte(axeDeLaCible(ecrite)));
    if (!axe || axe.valeurs.has(cibleCompacte(ecrite)) || inconnues.has(cibleCompacte(ecrite))) continue;
    inconnues.add(cibleCompacte(ecrite));
    constats.push({
      id: `regles:C45:valeur-inconnue:${ecrite}`, code: 'C45', type: 'corriger', famille: 'regles', variants: [], layers: [],
      faits: { composant: composant.nom, propriete: axe.nom, regle: ecrite, ecart: 'valeur-inconnue' },
    });
  }
  for (const [cle, regle] of documentees) {
    if (connues.has(cle) || renommeesParRegle.has(regle)) continue;
    constats.push({ id: `regles:C45:sans-propriete:${regle}`, code: 'C45', type: 'corriger', famille: 'regles', variants: [], layers: [], faits: { composant: composant.nom, regle, ecart: 'sans-propriete' } });
  }
  // `@boolean` posé sur un axe : l'axe existe, mais pas comme booléenne (N-73).
  for (const nom of releve.booleennesEcrites ?? []) {
    if (!axes.has(nomCompacte(nom))) continue;
    constats.push({ id: `regles:C45:sans-propriete:${nom}`, code: 'C45', type: 'corriger', famille: 'regles', variants: [], layers: [], faits: { composant: composant.nom, regle: nom, ecart: 'sans-propriete', surUnAxe: 1 } });
  }
  // Une règle dont la cible est vide ne vise rien (N-72) : un constat pour toutes, sans nom à citer.
  const vides = releve.reglesSansCible ?? 0;
  if (vides > 0) {
    constats.push({ id: 'regles:C45:sans-propriete:', code: 'C45', type: 'corriger', famille: 'regles', variants: [], layers: [], faits: { composant: composant.nom, regle: '', ecart: 'sans-propriete', regles: vides } });
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
  // Les cibles `axe.valeur` des règles `@prop`, normalisées comme le contrat. Une règle non rédigée garde la cible écrite : elle se normalise ici.
  const ecrites = [
    ...Object.entries(lues.propDescriptions).flatMap(([axe, valeurs]) => Object.keys(valeurs).map((valeur) => `${axe}.${valeur}`)),
    ...lues.ciblesNonRedigees.filter((cible) => cible.indexOf('.') > 0).map((cible) => {
      const point = cible.indexOf('.');
      return `${normalizePropKey(cible.slice(0, point))}.${normalizePropValue(cible.slice(point + 1))}`;
    }),
  ];
  // Un nom de propriété qui porte un point (`Size.Mode`) coupe la cible au mauvais endroit : la cible s'attache à celle du modèle qui
  // s'écrit pareil à ses points près, et c'est l'axe du modèle qui compte (N-74).
  const sansPoint = (cible: string): string => cibleCompacte(cible).replace(/\./g, '');
  const cibleDuModele = new Map<string, string>();
  for (const section of modele.sections) {
    if (section.tag !== 'prop') continue;
    for (const element of section.elements) if (element.genre === 'regle' && element.cible) cibleDuModele.set(sansPoint(element.cible), element.cible);
  }
  const rattachees = ecrites.map((ecrite) => cibleDuModele.get(sansPoint(ecrite)) ?? null);
  const booleennesNonRedigees = lues.ciblesNonRedigees.filter((cible) => cible.indexOf('.') <= 0);
  const presentes = [
    ...ecrites.map((ecrite, rang) => cibleCompacte(rattachees[rang] ?? ecrite)),
    ...Object.keys(lues.booleanDescriptions).map(cibleCompacte),
    ...booleennesNonRedigees.map(cibleCompacte),
  ];
  const axesDocumentes = ecrites.map((ecrite, rang) => axeDeLaCible(rattachees[rang] ?? ecrite));
  const valeursEcrites = ecrites.filter((_, rang) => rattachees[rang] === null);
  const orphelins = lues.orphelins ?? 0;
  return {
    composant: { id: composant.id, nom: composant.name },
    instancePresente,
    modele,
    proprietes: proprietesDuModele(modele),
    publiees: Object.keys(surfaceDuMoteur.props),
    documentees: [...new Set([...axesDocumentes, ...Object.keys(lues.booleanDescriptions), ...booleennesNonRedigees])],
    presentes,
    manquantes: instancePresente ? reglesManquantes(modele, new Set(presentes)) : { nom: composant.name, sections: [] },
    ...(typeof page.name === 'string' ? { page: page.name } : {}),
    homonymes: lues.homonymes ?? [],
    orphelins,
    remplissable: !instancePresente && orphelins === 1,
    reglesSansCible: lues.reglesSansCible ?? 0,
    valeursEcrites,
    booleennesEcrites: Object.keys(lues.booleanDescriptions),
  };
}

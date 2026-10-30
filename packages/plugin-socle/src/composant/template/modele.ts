/**
 * Du contrat d'un composant au modèle de ses règles d'usage.
 *
 * Ce module ne touche ni Figma ni le document : il dit quelles règles poser,
 * dans quel ordre, et ce que chacune écrira dans son calque `prop`. Ce que le
 * template ne pose pas est aussi une décision : `@default`, `@do`, `@dont` et
 * `@pairs` demandent un jugement que le contrat ne porte pas, et les propriétés
 * `TEXT`, `INSTANCE_SWAP`, `SLOT` et les icônes runtime n'ont aucun tag qui les
 * documente.
 *
 * Une section se désigne par le tag de son exemple, jamais par son nom : le
 * moteur ignore les noms de section, et le maître range déjà un exemple de
 * chaque tag dans la sienne.
 */
import { estUneValeurDesactivee } from '@ucm-kit/core/format';
import type { Contract } from '@ucm-kit/core/format';
import type { RuleTag } from '@ucm-kit/core/referentiel';

/** Ce que le modèle lit du contrat, et rien d'autre. */
export type ContratLu = Pick<Contract, 'props' | 'stateModel'>;

/**
 * Le contrat réduit à la surface du composant sélectionné : ce qu'il déclare
 * lui-même, et ce qu'une pièce interne lui prête.
 *
 * La surface publiée fusionne celle d'un wrapper élu par
 * `findWrapperReference`, et deux choses très différentes passent par là. Une
 * pièce interne du composant sélectionné, que Figma ne publie pas, n'existe que
 * dans ce composant : personne ne l'instanciera seule, elle n'aura donc jamais
 * de règles à elle, et ses propriétés sont celles du parent, à documenter ici.
 * Un composant publié, lui, n'est traversé que faute d'être reconnu comme
 * dépendance, ce qui demande un conteneur de règles : poser ses propriétés, ou
 * celles de sa propre architecture, ferait documenter au designer l'API du
 * voisin, sous le nom du parent, et elles s'en iront du contrat dès que ce
 * voisin aura ses règles.
 *
 * L'appelant fait le tri, seul à voir l'arbre Figma ; cette fonction reçoit la
 * surface déjà tranchée. L'ordre du contrat est gardé, et une propriété remontée
 * retrouve donc la place qu'elle occupe dans la surface publiée.
 *
 * `stateModel` n'est pas filtré : son axe vient des variants du composant
 * sélectionné, jamais d'un wrapper.
 */
export function restreindreAuParent(
  contrat: ContratLu,
  surfaceDuParent: ReadonlySet<string>,
): ContratLu {
  const props = Object.fromEntries(
    Object.entries(contrat.props ?? {}).filter(([cle]) => surfaceDuParent.has(cle)),
  );
  return { props, stateModel: contrat.stateModel };
}

/**
 * Une règle à poser, ou un séparateur. `cible` est le texte du calque `prop` ;
 * son absence dit que la règle n'en écrit aucun, et que le calque garde le
 * texte d'aide du maître. `description` est le texte du calque `content` d'une
 * règle relue dans le document, marqueur compris ; une règle du modèle n'en
 * porte pas.
 */
export type ElementDeModele =
  | { genre: 'regle'; tag: RuleTag; cible?: string; description?: string }
  | { genre: 'separateur' };

/** Les éléments d'une section, dans l'ordre où le template les pose. */
export type SectionDeModele = { tag: RuleTag; elements: ElementDeModele[] };

/** Le contenu complet d'un conteneur de règles, avant toute écriture. */
export type ModeleDeRegles = { nom: string; sections: SectionDeModele[] };

/**
 * Les cibles `@prop`, un groupe par axe : les axes d'API dans l'ordre de
 * `props`, puis l'axe d'états.
 *
 * La clé lue est celle que le contrat publie, jamais le nom Figma : un axe que
 * la couche sémantique a renommé en `size` ne se retrouve plus sous `Scale`,
 * et la règle posée ne documenterait personne.
 */
function groupesDeCibles(contrat: ContratLu): string[][] {
  const groupes: string[][] = [];
  for (const [cle, prop] of Object.entries(contrat.props ?? {})) {
    if (prop.type !== 'enum' || prop.values.length === 0) continue;
    groupes.push(prop.values.map((valeur) => `${cle}.${valeur}`));
  }
  const etats = contrat.stateModel;
  if (etats) {
    const valeurs = Object.keys(etats.states);
    if (valeurs.length > 0) groupes.push(valeurs.map((etat) => `${etats.axis}.${etat}`));
  }
  return groupes;
}

/** Les règles d'un groupe, séparées du groupe précédent par un `divider`. */
function reglesDesGroupes(groupes: string[][]): ElementDeModele[] {
  const elements: ElementDeModele[] = [];
  for (const groupe of groupes) {
    if (elements.length > 0) elements.push({ genre: 'separateur' });
    for (const cible of groupe) elements.push({ genre: 'regle', tag: 'prop', cible });
  }
  return elements;
}

/**
 * Les clés des boolean properties à documenter.
 *
 * `disabled` fabriquée depuis la valeur Disable de l'axe d'états n'en est pas
 * une : sa documentation appartient à la règle `@prop` de cet état, et deux
 * règles pour un même fait se contrediraient.
 */
function clesBooleennes(contrat: ContratLu): string[] {
  const etats = contrat.stateModel;
  const desactiveVientDeLAxe = etats !== undefined
    && Object.keys(etats.states).some(estUneValeurDesactivee);
  return Object.entries(contrat.props ?? {})
    .filter(([cle, prop]) =>
      prop.type === 'boolean' && !(desactiveVientDeLAxe && estUneValeurDesactivee(cle)))
    .map(([cle]) => cle);
}

/** Le modèle des règles d'un composant, tel que le template le posera. */
export function modeleDeRegles(nom: string, contrat: ContratLu): ModeleDeRegles {
  const sections: SectionDeModele[] = [
    { tag: 'usage', elements: [{ genre: 'regle', tag: 'usage' }] },
  ];

  const groupes = groupesDeCibles(contrat);
  if (groupes.length > 0) sections.push({ tag: 'prop', elements: reglesDesGroupes(groupes) });

  const booleennes = clesBooleennes(contrat);
  if (booleennes.length > 0) {
    sections.push({
      tag: 'boolean',
      elements: booleennes.map((cible) => ({ genre: 'regle', tag: 'boolean', cible })),
    });
  }

  // La section des icônes est posée même sans icône : le designer y nomme le
  // calque d'un dessin que l'analyse signale ensuite comme non déclaré.
  sections.push({ tag: 'icons', elements: [{ genre: 'regle', tag: 'icons' }] });
  return { nom, sections };
}

/** Compacte une cible de règle pour la comparer : sans espaces, en minuscules. */
export function cibleCompacte(cible: string): string {
  return cible.replace(/\s+/g, '').toLowerCase();
}

/** L'axe d'une cible : ce qui précède son dernier point. */
function axeDeLaCible(cible: string): string {
  return cible.slice(0, Math.max(0, cible.lastIndexOf('.')));
}

/**
 * Le modèle réduit aux règles que l'instance ne porte pas encore.
 *
 * `presentes` : les cibles déjà posées, rédigées ou non, compactées par
 * `cibleCompacte`. Seules les règles `prop` et `boolean` ont une cible à
 * comparer ; `usage` et `icons` n'en ont pas, et ne sont jamais rendues.
 * La section `prop` garde l'ordre du modèle, avec un séparateur seulement entre
 * deux règles manquantes d'axes différents.
 */
export function reglesManquantes(
  modele: ModeleDeRegles,
  presentes: ReadonlySet<string>,
): ModeleDeRegles {
  const sections: SectionDeModele[] = [];
  for (const section of modele.sections) {
    if (section.tag !== 'prop' && section.tag !== 'boolean') continue;
    const elements: ElementDeModele[] = [];
    let axePrecedent: string | null = null;
    for (const element of section.elements) {
      if (element.genre !== 'regle' || element.cible === undefined) continue;
      if (presentes.has(cibleCompacte(element.cible))) continue;
      const axe = axeDeLaCible(element.cible);
      if (section.tag === 'prop' && axePrecedent !== null && axe !== axePrecedent) {
        elements.push({ genre: 'separateur' });
      }
      elements.push(element);
      axePrecedent = axe;
    }
    if (elements.length > 0) sections.push({ tag: section.tag, elements });
  }
  return { nom: modele.nom, sections };
}

/**
 * Les éléments d'une section déjà posée (`relus`, dans leur ordre), complétés
 * des règles manquantes de `manquantes`.
 *
 * Dans une section `prop`, une valeur d'un axe déjà présent va après la dernière
 * règle de cet axe, sans séparateur ; un axe absent va à la fin, précédé d'un
 * séparateur quand la section en porte déjà un élément, et les axes absents
 * gardent l'ordre du modèle. Les séparateurs de `manquantes` ne sont pas repris.
 * Dans une autre section, les règles manquantes vont à la fin.
 */
export function completerLaSection(
  relus: readonly ElementDeModele[],
  manquantes: SectionDeModele,
): SectionDeModele {
  const elements = [...relus];
  const regles = manquantes.elements.filter((element) => element.genre === 'regle');
  if (manquantes.tag !== 'prop') {
    return { tag: manquantes.tag, elements: [...elements, ...regles] };
  }

  const axeDe = (element: ElementDeModele): string | null =>
    element.genre === 'regle' ? axeDeLaCible(cibleCompacte(element.cible ?? '')) : null;
  const axesPresents = new Set(elements.map(axeDe));
  for (const regle of regles.filter((r) => axesPresents.has(axeDe(r)))) {
    const derniere = elements.map(axeDe).lastIndexOf(axeDe(regle));
    elements.splice(derniere + 1, 0, regle);
  }

  let precedent: string | null = null;
  for (const regle of regles.filter((r) => !axesPresents.has(axeDe(r)))) {
    if (axeDe(regle) !== precedent) {
      precedent = axeDe(regle);
      const dernier = elements[elements.length - 1];
      if (dernier !== undefined && dernier.genre !== 'separateur') {
        elements.push({ genre: 'separateur' });
      }
    }
    elements.push(regle);
  }
  return { tag: manquantes.tag, elements };
}

/** Le nombre de règles du modèle, séparateurs exclus. */
export function nombreDeRegles(modele: ModeleDeRegles): number {
  return modele.sections
    .flatMap((section) => section.elements)
    .filter((element) => element.genre === 'regle').length;
}

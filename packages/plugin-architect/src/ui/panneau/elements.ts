/**
 * Le panneau des constats du mode Composant range ce que l'analyse dit par élément du composant : couleurs, tailles, texte, tokens,
 * variants, règles, accessibilité. Dans un élément, les cartes de corrections viennent d'abord, puis les questions, puis les constats
 * à faire dans Figma. Le calcul ne touche pas au DOM.
 *
 * L'élément d'un constat vient de son champ (`correction.cible.champ`, sinon `faits.champ`) par la nature que `natureDe` lui donne,
 * sinon de sa famille. Le contraste fait exception : ses constats portent le champ peint (`fills`, `strokes`), mais ils se rangent
 * dans l'accessibilité.
 *
 * Une carte reste entière : elle prend l'élément de son premier constat, et tous ses constats comptent dans cet élément. Le nombre de
 * points d'un élément est donc la somme des constats de ses cartes, et chaque constat visible compte une fois.
 *
 * Un constat Bloquant est compté dans son élément (le nombre et l'icône) et se lit dans `bloquants`, pour l'en-tête de « Tout ».
 * L'élément garde ses cartes Bloquant (la vue d'un élément les montre) ; `sansLesBloquants` les retire pour « Tout », qui les montre
 * en tête par `enTete`. Une carte qui mêle des constats Bloquant et d'autres reste dans sa section.
 *
 * `constats` sont les constats visibles : ni ignorés, ni appliqués, et une question répondue y porte déjà sa correction. Une question
 * répondue garde sa ligne de réponse dans `questions`, rangée avec les questions de son élément : `reponses` dit lesquelles.
 *
 * Deux cartes ne viennent d'aucun constat : les liaisons d'une préparation et le composant sans token. Elles sont des points de
 * l'élément `tokens`, un chacune, et ne comptent pas dans `constats`.
 */
import { natureDe, type Nature } from '../../composant';
import type { Constat, Correction } from '../../messages/commun';
import { cartesDeCorrections, type CarteDeCorrections, type ContexteDeCartes } from '../corrections/modele';
import { carteDAFaire, estAFaire, type CarteDAFaire } from '../ignores/modele';
import { carteDeQuestion, estUneQuestion, regrouperLesCartes, type GroupeDeQuestions } from '../questions/modele';
import { ELEMENTS_DU_PANNEAU, type IdDElement } from '../textes/elements';

export { ELEMENTS_DU_PANNEAU, type IdDElement };

/**
 * Le signe de la bande et de la puce de chaque élément. La teinte vient de la famille du signe, sauf pour `type-color`, dont la famille
 * (`types-figma`) n'a pas de teinte : `signeDeLElement` y pose la teinte des couleurs.
 */
export const SIGNE_DE_L_ELEMENT: Readonly<Record<IdDElement, string>> = {
  couleurs: 'type-color', tailles: 'radius', texte: 'text-style', tokens: 'variable', variants: 'component-set', regles: 'regles', a11y: 'contraste',
};

export interface ElementDuPanneau {
  readonly id: IdDElement;
  readonly corrections: readonly CarteDeCorrections[];
  readonly questions: readonly GroupeDeQuestions[];
  readonly aFaire: readonly CarteDAFaire[];
  /** Les constats que l'élément range, dans l'ordre des constats. */
  readonly constats: readonly Constat[];
  /** Le nombre de constats que l'élément range. */
  readonly points: number;
  /** Un de ses constats est Bloquant : la puce porte l'icône Bloquant. */
  readonly bloquant: boolean;
  /** Les liaisons d'une préparation, carte de corrections sans constat ; seulement dans `tokens`. */
  readonly preparee: CarteDeCorrections | null;
  /** Le composant n'a aucun token : la carte qui propose de les préparer ; seulement dans `tokens`. */
  readonly sansTokens: boolean;
}

/** Ce que le panneau sait au-delà des constats. */
export interface AjoutsAuPanneau {
  /** Les corrections que les réponses du designer ont tirées, par identifiant de question. */
  readonly reponses?: Readonly<Record<string, Correction>>;
  readonly preparee?: CarteDeCorrections | null;
  readonly sansTokens?: boolean;
}

export interface PanneauParElements {
  /** Les éléments qui ont des points, dans l'ordre du panneau : le sommaire et les sections. */
  readonly elements: readonly ElementDuPanneau[];
  /** Les constats Bloquant, dans l'ordre des constats, pour l'en-tête de « Tout ». */
  readonly bloquants: readonly Constat[];
  /** Les cartes de ces constats, rangées comme dans un élément : ce que « Tout » montre en tête. */
  readonly enTete: Pick<ElementDuPanneau, 'corrections' | 'questions' | 'aFaire'>;
  /** Les éléments sans constat, dans l'ordre du panneau. */
  readonly tenus: readonly IdDElement[];
}

const ELEMENT_DE_LA_FAMILLE: Readonly<Record<Constat['famille'], IdDElement>> = {
  liaisons: 'couleurs', tailles: 'tailles', typographie: 'texte', tokens: 'tokens', export: 'tokens',
  variants: 'variants', visibilite: 'variants', regles: 'regles', contraste: 'a11y',
};

const ELEMENT_DE_LA_NATURE: Readonly<Record<Nature, IdDElement | null>> = {
  couleur: 'couleurs', forme: 'tailles', espacement: 'tailles', taille: 'tailles', texte: 'texte', autre: null,
};

/** L'élément d'un constat : son champ, sinon sa famille. */
export function elementDuConstat(constat: Constat): IdDElement {
  if (constat.famille === 'contraste') return 'a11y';
  const champ = constat.correction?.cible.champ ?? constat.faits.champ;
  const parChamp = typeof champ === 'string' && champ !== '' ? ELEMENT_DE_LA_NATURE[natureDe(champ, '').nature] : null;
  return parChamp ?? ELEMENT_DE_LA_FAMILLE[constat.famille];
}

const estBloquant = (constat: Constat): boolean => constat.type === 'bloquant';
/** Une entrée reste dans sa section sauf si tous ses constats sont Bloquant. */
const garde = (constats: readonly Constat[]): boolean => !constats.every(estBloquant);

/** Les constats que porte une entrée : ceux d'une carte de corrections, d'un groupe de questions ou d'un constat à faire. */
type Entree = { readonly constats: readonly Constat[] };

export function elementsDuPanneau(constats: readonly Constat[], contexte: ContexteDeCartes, { reponses = {}, preparee = null, sansTokens = false }: AjoutsAuPanneau = {}): PanneauParElements {
  const corrections: Array<Entree & { carte: CarteDeCorrections }> = cartesDeCorrections(constats, { ...contexte, constats }).map((carte) => ({ carte, constats: carte.constats }));
  const repondue = (constat: Constat): boolean => constat.question !== undefined && reponses[constat.question.id] !== undefined;
  const cartesDeQuestions = constats.filter((constat) => estUneQuestion(constat) || repondue(constat)).flatMap((constat) => carteDeQuestion(constat, contexte) ?? []);
  const questions: Array<Entree & { groupe: GroupeDeQuestions }> = regrouperLesCartes(cartesDeQuestions, reponses).map((groupe) => ({ groupe, constats: groupe.cartes.map((carte) => carte.constat) }));
  const aFaire: Array<Entree & { carte: CarteDAFaire }> = constats.filter(estAFaire).map((constat) => ({ carte: carteDAFaire(constat, contexte), constats: [constat] }));

  const premier = (entree: Entree): IdDElement => elementDuConstat(entree.constats[0]);
  const rang = new Map(constats.map((constat, position) => [constat, position]));

  const elements = ELEMENTS_DU_PANNEAU.map((id): ElementDuPanneau => {
    const mesCorrections = corrections.filter((entree) => entree.constats.length > 0 && premier(entree) === id);
    const mesQuestions = questions.filter((entree) => premier(entree) === id);
    const mesAFaire = aFaire.filter((entree) => premier(entree) === id);
    const rangees = [...mesCorrections, ...mesQuestions, ...mesAFaire].flatMap((entree) => entree.constats);
    const tries = [...new Set(rangees)].sort((a, b) => (rang.get(a) ?? 0) - (rang.get(b) ?? 0));
    const ajouts = id === 'tokens' ? { preparee, sansTokens } : { preparee: null, sansTokens: false };
    return {
      id, corrections: mesCorrections.map((entree) => entree.carte), questions: mesQuestions.map((entree) => entree.groupe), aFaire: mesAFaire.map((entree) => entree.carte),
      constats: tries, points: tries.length + (ajouts.preparee === null ? 0 : 1) + (ajouts.sansTokens ? 1 : 0), bloquant: tries.some(estBloquant), ...ajouts,
    };
  });
  return {
    elements: elements.filter((element) => element.points > 0),
    bloquants: constats.filter(estBloquant),
    enTete: {
      corrections: elements.flatMap((element) => element.corrections.filter((carte) => !garde(carte.constats))),
      questions: elements.flatMap((element) => element.questions.filter((groupe) => !garde(groupe.cartes.map((carte) => carte.constat)))),
      aFaire: elements.flatMap((element) => element.aFaire.filter((carte) => !garde([carte.constat]))),
    },
    tenus: elements.filter((element) => element.points === 0).map((element) => element.id),
  };
}

/** L'élément sans les cartes dont tous les constats sont Bloquant : « Tout » les montre en tête, hors des sections. Le nombre de points ne change pas. */
export function sansLesBloquants(element: ElementDuPanneau): ElementDuPanneau {
  return {
    ...element,
    corrections: element.corrections.filter((carte) => garde(carte.constats)),
    questions: element.questions.filter((groupe) => garde(groupe.cartes.map((carte) => carte.constat))),
    aFaire: element.aFaire.filter((carte) => garde([carte.constat])),
  };
}

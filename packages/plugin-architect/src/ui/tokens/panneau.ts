/**
 * Le panneau de l'onglet Constats du mode Tokens, bâti comme celui du mode Composant : un sommaire (Tout, une puce par catégorie qui a des
 * cartes, puis Questions), une section repliable par catégorie (bande, signe en teinte `tokens`, nombre de cartes) et, en fin de liste,
 * une bande tenue par catégorie sans carte. Le classement et les nombres viennent de `lireLesCategories` ; ce module n'en pose que le DOM.
 *
 * Les cartes ne naissent pas ici. Les modules de Nomenclature et de structure les montent dans des conteneurs qui durent tout le
 * plugin : le panneau y attache ceux d'une section ouverte et les détache ailleurs, sans les recréer. Les trois conteneurs de Nomenclature
 * (questions, renommages, remises) forment ensemble le corps de Noms, dans cet ordre ; chaque autre catégorie a le sien (`hote`).
 * Au-delà de `SEUIL_DE_REPLI` cartes, Noms arrive repliée ; le designer la déplie par sa bande ou par sa puce.
 */
import { creerSigne } from 'ucm-plugin-socle/src/ui/Signe';

import type { Bilan } from '../../messages/nomenclature';
import { creerBande, creerBandeTenue, creerGroupeDePuces, creerPuce } from '../panneau/rendu';
import { TEXTES_TOKENS } from '../textes/tokens';
import { lireLesCategories, type CategorieDeTokens, type DonneesDesCategories, type IdDeCategorie } from './categories';

export const QUESTIONS = 'questions';

/** Au-delà de ce nombre de cartes, la section Noms arrive repliée. */
export const SEUIL_DE_REPLI = 20;

/** Ce que le sommaire isole : tout, les seules questions, ou une catégorie. */
export type ChoixDuSommaire = 'tout' | typeof QUESTIONS | IdDeCategorie;

/** Les catégories dont le domaine structure monte le corps : toutes sauf Noms. */
export type CategorieDeStructure = Exclude<IdDeCategorie, 'noms'>;

/** Ce que le domaine structure rend à la lecture : les constats et corrections reçus, et les noms qui les écrivent. */
export type StructureLue = Pick<DonneesDesCategories, 'constats' | 'corrections' | 'noms'>;

/** Les trois conteneurs que Nomenclature remplit : le panneau les attache dans la section Noms. */
export interface HotesDeNomenclature {
  readonly questions: HTMLElement;
  readonly renommages: HTMLElement;
  /** Les questions remises à plus tard et le compte des autres pistes, après les renommages. */
  readonly remises: HTMLElement;
}

export interface OptionsDuPanneauDesTokens {
  /** Où le panneau pose ses quatre zones : le sommaire, le haut, la liste des sections et le pied. */
  readonly racine: HTMLElement;
  readonly nomenclature: HotesDeNomenclature;
  /** Appelée quand le panneau change de lui-même : une structure reçue, une puce choisie. */
  readonly auChangement: () => void;
}

/** Ce que l'écran sait des cartes de Noms qui ne comptent pas dans `lireLesCategories`. */
export interface DonneesDuPanneau {
  readonly bilan: Bilan | null;
  /** Les règles que le mode Composant a préparées : elles s'affichent en tête des questions de Noms. */
  readonly reglesRecues: number;
}

export interface PanneauDesTokens {
  /** Le conteneur du corps d'une catégorie de structure. */
  hote(id: CategorieDeStructure): HTMLElement;
  /** Le conteneur des constats ignorés, en fin de liste sous « Tout ». */
  readonly ignores: HTMLElement;
  /** La zone sous le sommaire : « Tout désélectionner » et les lignes de résultat de la structure. */
  readonly haut: HTMLElement;
  /** La zone sous la liste : le pied des corrections de structure. */
  readonly pied: HTMLElement;
  /** Le choix du sommaire, ramené à « Tout » quand la catégorie ou les questions choisies n'ont plus de carte. */
  choix(): ChoixDuSommaire;
  /** Le total des cartes, que l'onglet Constats annonce. */
  total(): number;
  /** Les données de Nomenclature, relues à chaque changement de la coquille ; sans effet quand rien n'a changé. */
  poser(donnees: DonneesDuPanneau): void;
  /** Les données du domaine structure ; `null` tant que le sandbox n'a pas répondu. */
  poserLaStructure(structure: StructureLue | null): void;
  /** Redessine les sections : une ligne de résultat de Noms vient de paraître dans un conteneur que le panneau n'observe pas. */
  rafraichir(): void;
}

const SANS_NOMS: StructureLue['noms'] = { nom: () => null, cle: () => null };

/** Une catégorie avec les cartes que `lireLesCategories` ignore : les règles reçues, et les questions remises à plus tard. */
interface VueDeCategorie extends CategorieDeTokens {
  /** Les cartes qui sont des questions. */
  readonly questions: number;
  /** Vrai quand la section se montre : des cartes, ou des questions remises à plus tard. */
  readonly visible: boolean;
}

function vuesDe(categories: readonly CategorieDeTokens[], { bilan, reglesRecues }: DonneesDuPanneau): readonly VueDeCategorie[] {
  return categories.map((categorie) => {
    const dePlus = categorie.id === 'noms' ? reglesRecues : 0;
    const remises = categorie.id === 'noms' && bilan ? bilan.plusTard.length + bilan.autresPistes : 0;
    const nombre = categorie.nombre + dePlus;
    return {
      ...categorie,
      nombre,
      questions: categorie.cartes.filter(({ estUneQuestion }) => estUneQuestion).length + dePlus,
      tenue: categorie.tenue && remises === 0 && dePlus === 0,
      visible: nombre > 0 || remises > 0,
    };
  });
}

function signeDe(categorie: CategorieDeTokens, taille: 14 | 24, informe = true): HTMLElement {
  return creerSigne(categorie.signe, { taille, informe, famille: categorie.famille });
}

/** Une ligne de résultat visible dans le conteneur des renommages : elle reste lisible quand Noms n'a plus de carte. */
function aUnResultat(hote: HTMLElement): boolean {
  return Array.from(hote.querySelectorAll<HTMLElement>('.resultat')).some((ligne) => !ligne.hidden);
}

export function monterLePanneauDesTokens({ racine, nomenclature, auChangement }: OptionsDuPanneauDesTokens): PanneauDesTokens {
  const sommaireHote = document.createElement('div');
  // Sans boîte (`display: contents`) : vides ou masquées, la zone du haut et celle du pied ne laissent aucun espacement de la pile.
  const haut = document.createElement('div');
  haut.className = 'structure-groupe';
  const liste = document.createElement('div');
  liste.className = 'liste liste-des-constats';
  const pied = document.createElement('div');
  pied.className = 'structure-groupe';
  const ignores = document.createElement('div');
  ignores.hidden = true;
  racine.append(sommaireHote, haut, liste, pied);

  const hotes = new Map<CategorieDeStructure, HTMLElement>();
  const hote = (id: CategorieDeStructure): HTMLElement => {
    let element = hotes.get(id);
    if (!element) {
      element = document.createElement('div');
      element.className = 'structure-liste';
      hotes.set(id, element);
    }
    return element;
  };

  let donnees: DonneesDuPanneau = { bilan: null, reglesRecues: 0 };
  let structure: StructureLue | null = null;
  let categories: readonly CategorieDeTokens[] = [];
  let vues: readonly VueDeCategorie[] = [];
  let choisi: ChoixDuSommaire = 'tout';
  /** Les sections que le designer a ouvertes ou fermées, ou que le panneau a repliées à leur arrivée ; une section absente est ouverte. */
  const ouvertes = new Map<IdDeCategorie, boolean>();

  const questionsTotal = (): number => vues.reduce((somme, vue) => somme + vue.questions, 0);

  function choixEffectif(): ChoixDuSommaire {
    if (choisi === 'tout') return 'tout';
    if (choisi === QUESTIONS) return questionsTotal() > 0 ? QUESTIONS : 'tout';
    return vues.some((vue) => vue.id === choisi && vue.nombre > 0) ? choisi : 'tout';
  }

  function recalculer(): void {
    categories = lireLesCategories({
      nomenclature: donnees.bilan,
      constats: structure?.constats ?? [],
      corrections: structure?.corrections ?? [],
      noms: structure?.noms ?? SANS_NOMS,
      // Tant que le bilan ou la structure manque, une catégorie vide n'a pas été lue : elle ne se montre pas tenue.
      partielle: structure === null || donnees.bilan === null,
    });
    vues = vuesDe(categories, donnees);
    // Une section longue arrive repliée : le choix est pris une fois, à sa première apparition avec des cartes.
    for (const vue of vues) if (vue.nombre > 0 && !ouvertes.has(vue.id)) ouvertes.set(vue.id, vue.id !== 'noms' || vue.nombre <= SEUIL_DE_REPLI);
  }

  /**
   * La section Noms montre les questions d'abord, puis les renommages, puis les questions remises à plus tard et les autres pistes :
   * chaque conteneur ne se montre que s'il a de quoi. Sous la puce Questions, les renommages disparaissent.
   */
  function corpsDeNoms(seulementLesQuestions: boolean): HTMLElement[] {
    const { bilan, reglesRecues } = donnees;
    nomenclature.questions.hidden = !bilan || bilan.questions.length + reglesRecues === 0;
    nomenclature.remises.hidden = !bilan || bilan.plusTard.length + bilan.autresPistes === 0;
    nomenclature.renommages.hidden = !bilan || (bilan.groupes.length === 0 && !aUnResultat(nomenclature.renommages));
    const corps = seulementLesQuestions ? [nomenclature.questions, nomenclature.remises] : [nomenclature.questions, nomenclature.renommages, nomenclature.remises];
    return corps.filter((element) => !element.hidden);
  }

  function basculer(id: IdDeCategorie, ouverte: boolean): void {
    ouvertes.set(id, ouverte);
    rendre();
    // Le dessin remplace la bande : le clavier reprend là où il était.
    for (const section of Array.from(liste.querySelectorAll<HTMLElement>('.section-element'))) {
      if (section.dataset.element === id) section.querySelector<HTMLElement>('.bande-element')?.focus();
    }
  }

  function choisir(id: string): void {
    const suivant = id as ChoixDuSommaire;
    if (suivant === choisi) return;
    choisi = suivant;
    rendre();
    // Le dessin remplace la puce : le clavier reprend là où il était.
    for (const puce of Array.from(sommaireHote.querySelectorAll<HTMLElement>('.puce-element'))) if (puce.dataset.element === id) puce.focus();
    auChangement();
  }

  function creerLaSection(vue: VueDeCategorie, seulementLesQuestions: boolean, seule: boolean): HTMLElement {
    const section = document.createElement('div');
    section.className = 'section-element';
    section.dataset.element = vue.id;
    const nombre = seulementLesQuestions ? vue.questions : vue.nombre;
    const ouverte = ouvertes.get(vue.id) ?? true;
    section.append(creerBande({
      signe: signeDe(vue, 24),
      libelle: vue.libelle,
      nombre,
      nomAccessible: (seulementLesQuestions ? TEXTES_TOKENS.nomDeLaBandeDesQuestions : TEXTES_TOKENS.nomDeLaBande)(vue.libelle, nombre),
      ouverte: ouverte || seule,
    }, (suite) => basculer(vue.id, suite)));
    if (ouverte || seule) section.append(...(vue.id === 'noms' ? corpsDeNoms(seulementLesQuestions) : [hote(vue.id)]));
    return section;
  }

  function creerLaSectionTenue(vue: VueDeCategorie): HTMLElement {
    const section = document.createElement('div');
    section.className = 'section-element';
    section.dataset.element = vue.id;
    section.append(creerBandeTenue(signeDe(vue, 24, false), vue.libelle));
    // Les renommages viennent d'être écrits : leur ligne de résultat reste lisible sous la bande tenue.
    if (vue.id === 'noms' && aUnResultat(nomenclature.renommages)) {
      nomenclature.renommages.hidden = false;
      section.append(nomenclature.renommages);
    }
    return section;
  }

  function creerLeSommaire(visibles: readonly VueDeCategorie[], effectif: ChoixDuSommaire): HTMLElement {
    const total = visibles.reduce((somme, vue) => somme + vue.nombre, 0);
    const nombreDeQuestions = questionsTotal();
    return creerGroupeDePuces(TEXTES_TOKENS.etiquetteDuSommaire, [
      creerPuce({ id: 'tout', libelle: TEXTES_TOKENS.tout, nombre: total, nomAccessible: TEXTES_TOKENS.nomDeLaPuce(TEXTES_TOKENS.tout, total), signe: null, actif: effectif === 'tout' }, choisir),
      ...visibles.map((vue) => creerPuce({
        id: vue.id,
        libelle: vue.libelle,
        nombre: vue.nombre,
        nomAccessible: TEXTES_TOKENS.nomDeLaPuce(vue.libelle, vue.nombre),
        signe: signeDe(vue, 14),
        actif: effectif === vue.id,
      }, choisir)),
      ...(nombreDeQuestions === 0 ? [] : [creerPuce({
        id: QUESTIONS,
        libelle: TEXTES_TOKENS.questions,
        nombre: nombreDeQuestions,
        nomAccessible: TEXTES_TOKENS.nomDeLaPuceDesQuestions(TEXTES_TOKENS.questions, nombreDeQuestions),
        signe: creerSigne('question', { taille: 14 }),
        actif: effectif === QUESTIONS,
      }, choisir)]),
    ]);
  }

  function rendre(): void {
    const effectif = choixEffectif();
    const visibles = vues.filter((vue) => vue.visible);
    const tout = effectif === 'tout';
    const seulementLesQuestions = effectif === QUESTIONS;
    const montrees = tout ? visibles : seulementLesQuestions ? visibles.filter((vue) => vue.questions > 0) : visibles.filter((vue) => vue.id === effectif);
    const tenues = tout ? vues.filter((vue) => vue.tenue) : [];
    // Sous la puce Questions, les conteneurs de structure ne montrent que les cartes qui posent une question.
    for (const conteneur of hotes.values()) conteneur.classList.toggle('filtre-questions', seulementLesQuestions);
    sommaireHote.replaceChildren(...(visibles.length > 0 ? [creerLeSommaire(visibles, effectif)] : []));
    liste.replaceChildren(
      ...montrees.map((vue) => creerLaSection(vue, seulementLesQuestions, montrees.length === 1 && !tout)),
      ...tenues.map(creerLaSectionTenue),
      ...(tout ? [ignores] : []),
    );
  }

  return {
    hote,
    ignores,
    haut,
    pied,
    choix: choixEffectif,
    total: () => vues.filter((vue) => vue.visible).reduce((somme, vue) => somme + vue.nombre, 0),
    poser(suivantes) {
      if (suivantes.bilan === donnees.bilan && suivantes.reglesRecues === donnees.reglesRecues) return;
      donnees = suivantes;
      recalculer();
      rendre();
    },
    rafraichir: rendre,
    poserLaStructure(suivante) {
      if (suivante === null && structure === null) return;
      if (suivante && structure && suivante.constats === structure.constats && suivante.corrections === structure.corrections && suivante.noms === structure.noms) return;
      structure = suivante;
      recalculer();
      rendre();
      auChangement();
    },
  };
}

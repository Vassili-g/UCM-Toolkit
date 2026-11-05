/**
 * Le panneau de l'onglet Constats du mode Tokens, bâti comme celui du mode Composant : un sommaire (Tout, une puce par catégorie qui a des
 * cartes, puis Questions), une section repliable par catégorie (bande, signe en teinte `tokens`, nombre de cartes) et, en fin de liste,
 * une bande tenue par catégorie sans carte. Le classement et les nombres viennent de `lireLesCategories` ; ce module n'en pose que le DOM.
 *
 * Les cartes ne naissent pas ici. Les modules de Nomenclature et de structure les montent dans des conteneurs qui durent tout le
 * plugin : le panneau y attache ceux d'une section ouverte et les détache ailleurs, sans les recréer. Les trois conteneurs de Nomenclature
 * (questions, renommages, remises) forment ensemble le corps de Noms, dans cet ordre ; chaque autre catégorie a le sien (`hote`).
 * Au-delà de `SEUIL_DE_REPLI` cartes, Noms arrive repliée ; le designer la déplie par sa bande ou par sa puce.
 *
 * Pendant une analyse, le panneau reste visible (`poserLAttente`). Les constats de structure paraissent dès leur réception. Tant que
 * le bilan des noms manque, Noms garde sa place en tête, en cours : sa bande sans nombre et le texte de lecture, sans carte ni puce.
 * Tant que la structure manque, le message de lecture paraît en tête et les cartes de la révision précédente restent affichées ; leurs
 * gestes sont désactivés par les modules qui les montent (`surAttente`). Aucune catégorie ne se dit tenue avant la fin de l'analyse
 * complète. Une fois l'analyse finie, la ligne de durée du mode Composant (`.arch-resume`) paraît en tête (`poserLeResume`).
 */
import { creerSigne } from 'ucm-plugin-socle/src/ui/Signe';

import type { Bilan } from '../../messages/nomenclature';
import { creerBande, creerBandeEnCours, creerBandeTenue, creerGroupeDePuces, creerPuce } from '../panneau/rendu';
import { TEXTES } from '../textes';
import { TEXTES_TOKENS } from '../textes/tokens';
import { rafraichirLesListesDe } from '../virtualisation';
import { lireLesCategories, type CategorieDeTokens, type DonneesDesCategories, type IdDeCategorie } from './categories';

export const QUESTIONS = 'questions';

/** Au-delà de ce nombre de cartes, la section Noms arrive repliée. */
export const SEUIL_DE_REPLI = 20;

/** Ce que le sommaire isole : tout, les seules questions, ou une catégorie. */
export type ChoixDuSommaire = 'tout' | typeof QUESTIONS | IdDeCategorie;

/** Les catégories dont le domaine structure monte le corps : toutes sauf Noms. */
export type CategorieDeStructure = Exclude<IdDeCategorie, 'noms'>;

/**
 * Ce que le domaine structure rend à la lecture : les constats et corrections reçus, et les noms qui les écrivent. `partielle` est vrai
 * quand la lecture n'a pas abouti : une catégorie sans carte n'a pas été lue, elle ne se dit pas tenue.
 */
export type StructureLue = Pick<DonneesDesCategories, 'constats' | 'corrections' | 'noms'> & { readonly partielle?: boolean };

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
  /** Vrai pendant une analyse des noms que l'écran a lui-même demandée : Noms est en cours, quel que soit le suivi de l'actualisation. */
  readonly nomsEnCours?: boolean;
}

/** Ce qu'une analyse attend encore, que l'actualisation donne au panneau. */
export interface AttenteDeLAnalyse {
  /** La structure manque : les constats affichés, s'il y en a, sont ceux de la révision précédente. */
  readonly structure: boolean;
  /** Le bilan des noms manque. */
  readonly noms: boolean;
  /** Le texte de lecture ; Noms en cours le reprend. */
  readonly texte: string;
  /** Vrai quand le texte paraît aussi en tête des constats tant que la structure manque. */
  readonly enTete: boolean;
}

/** Ce que les modules de cartes lisent de l'attente : les cartes de structure et le pied Appliquer s'y accordent. */
export interface AttenteEffective {
  readonly structure: boolean;
  readonly noms: boolean;
}
export interface PanneauDesTokens {
  /** Le conteneur du corps d'une catégorie de structure. */
  hote(id: CategorieDeStructure): HTMLElement;
  /**
   * Les gestes d'une section, « Tout cocher » et « Tout décocher » : le panneau les pose sous la bande de la section ouverte, sauf sous la puce
   * Questions. L'élément dure autant que le panneau ; son module le masque quand la section n'a aucune case.
   */
  poserLesGestes(id: IdDeCategorie, gestes: HTMLElement | null): void;
  /** Le conteneur des constats ignorés, en fin de liste sous « Tout ». */
  readonly ignores: HTMLElement;
  /** La zone sous le sommaire : les lignes de résultat de la structure. */
  readonly haut: HTMLElement;
  /** La zone sous la liste : le pied commun, qui compte les cases cochées des renommages et des corrections de structure. */
  readonly pied: HTMLElement;
  /** Le choix du sommaire, ramené à « Tout » quand la catégorie ou les questions choisies n'ont plus de carte. */
  choix(): ChoixDuSommaire;
  /** Le total des cartes, que l'onglet Constats annonce. */
  total(): number;
  /** Les données de Nomenclature, relues à chaque changement de la coquille ; sans effet quand rien n'a changé. */
  poser(donnees: DonneesDuPanneau): void;
  /** Les données du domaine structure ; `null` tant que le sandbox n'a pas répondu. */
  poserLaStructure(structure: StructureLue | null): void;
  /** Vrai dès que le domaine structure a rendu ses constats. */
  structureRecue(): boolean;
  /** Redessine les sections : une ligne de résultat de Noms vient de paraître dans un conteneur que le panneau n'observe pas. */
  rafraichir(): void;
  /** Ce que l'analyse attend encore ; `null` hors analyse. Le panneau et ses cartes restent visibles. */
  poserLAttente(attente: AttenteDeLAnalyse | null): void;
  /** L'attente en vigueur : celle de l'actualisation, plus l'analyse des noms que l'écran a demandée. */
  attente(): AttenteEffective;
  /** Appelle le rappel quand l'attente effective change ; rend la fonction qui le retire. */
  surAttente(rappel: () => void): () => void;
  /** La ligne discrète en tête (« analysé à 14:32 en 3 s ») ; `null` la retire. */
  poserLeResume(texte: string | null): void;
}

const SANS_NOMS: StructureLue['noms'] = { nom: () => null, cle: () => null };

/** Une catégorie avec les cartes que `lireLesCategories` ignore : les règles reçues, et les questions remises à plus tard. */
interface VueDeCategorie extends CategorieDeTokens {
  /** Les cartes qui sont des questions. */
  readonly questions: number;
  /** Vrai quand la section se montre : des cartes, ou des questions remises à plus tard. */
  readonly visible: boolean;
  /** Vrai pour Noms tant que son bilan manque : la section se montre sans carte ni nombre. */
  readonly enCours: boolean;
}

function vuesDe(categories: readonly CategorieDeTokens[], { bilan, reglesRecues }: DonneesDuPanneau, nomsEnCours: boolean): readonly VueDeCategorie[] {
  return categories.map((categorie) => {
    // Le bilan précédent n'est pas celui de cette analyse : ses cartes ne se comptent ni ne se montrent.
    if (categorie.id === 'noms' && nomsEnCours) return { ...categorie, cartes: [], nombre: 0, questions: 0, tenue: false, visible: true, enCours: true };
    const dePlus = categorie.id === 'noms' ? reglesRecues : 0;
    const remises = categorie.id === 'noms' && bilan ? bilan.plusTard.length + bilan.autresPistes : 0;
    const nombre = categorie.nombre + dePlus;
    return {
      ...categorie,
      nombre,
      questions: categorie.cartes.filter(({ estUneQuestion }) => estUneQuestion).length + dePlus,
      tenue: categorie.tenue && remises === 0 && dePlus === 0,
      visible: nombre > 0 || remises > 0,
      enCours: false,
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
  const resumeHote = document.createElement('div');
  resumeHote.hidden = true;
  const chargement = document.createElement('div');
  // La même mise en forme que l'accueil de la table, qui portait ce message avant : le texte et le style ne changent pas, seule la place change.
  // Au-dessus de constats qui restent visibles, le message n'a pas la marge d'un écran d'accueil.
  chargement.className = 'accueil lecture-en-tete';
  chargement.hidden = true;
  const texteDeChargement = document.createElement('p');
  texteDeChargement.className = 'accueil-texte';
  chargement.append(texteDeChargement);
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
  racine.append(resumeHote, chargement, sommaireHote, haut, liste, pied);

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

  const gestes = new Map<IdDeCategorie, HTMLElement>();

  let donnees: DonneesDuPanneau = { bilan: null, reglesRecues: 0 };
  let structure: StructureLue | null = null;
  let attenteDeLActualisation: AttenteDeLAnalyse | null = null;
  const surAttentes = new Set<() => void>();
  let derniereAttente = '';
  /** Le texte de la section Noms en cours, que la progression de la lecture met à jour sans redessiner le panneau. */
  let texteDesNoms: HTMLElement | null = null;
  let categories: readonly CategorieDeTokens[] = [];
  let vues: readonly VueDeCategorie[] = [];
  let choisi: ChoixDuSommaire = 'tout';
  /** Les sections que le designer a ouvertes ou fermées, ou que le panneau a repliées à leur arrivée ; une section absente est ouverte. */
  const ouvertes = new Map<IdDeCategorie, boolean>();

  const questionsTotal = (): number => vues.reduce((somme, vue) => somme + vue.questions, 0);

  const attenteEffective = (): AttenteEffective => ({
    structure: attenteDeLActualisation?.structure === true,
    noms: attenteDeLActualisation?.noms === true || donnees.nomsEnCours === true,
  });

  /** Prévient les modules de cartes quand l'attente change : leurs gestes se désactivent ou se rouvrent. */
  function signalerLAttente(): void {
    const { structure: enAttenteDeStructure, noms } = attenteEffective();
    const cle = `${enAttenteDeStructure}|${noms}`;
    if (cle === derniereAttente) return;
    derniereAttente = cle;
    for (const rappel of [...surAttentes]) rappel();
  }

  function choixEffectif(): ChoixDuSommaire {
    if (choisi === 'tout') return 'tout';
    if (choisi === QUESTIONS) return questionsTotal() > 0 ? QUESTIONS : 'tout';
    return vues.some((vue) => vue.id === choisi && vue.nombre > 0) ? choisi : 'tout';
  }

  function recalculer(): void {
    const attente = attenteEffective();
    categories = lireLesCategories({
      nomenclature: donnees.bilan,
      constats: structure?.constats ?? [],
      corrections: structure?.corrections ?? [],
      noms: structure?.noms ?? SANS_NOMS,
      // Tant que le bilan ou la structure manque, ou que l'analyse attend encore une part, une catégorie vide n'a pas été lue : elle ne se montre pas tenue.
      partielle: structure === null || structure.partielle === true || donnees.bilan === null || attente.structure || attente.noms,
    });
    vues = vuesDe(categories, donnees, attente.noms);
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
    if (ouverte || seule) {
      const gestesDeLaSection = seulementLesQuestions ? undefined : gestes.get(vue.id);
      if (gestesDeLaSection) section.append(gestesDeLaSection);
      section.append(...(vue.id === 'noms' ? corpsDeNoms(seulementLesQuestions) : [hote(vue.id)]));
    }
    return section;
  }

  /** Noms tant que son bilan manque : sa bande sans nombre, puis le texte de lecture de l'actualisation. */
  function creerLaSectionEnCours(vue: VueDeCategorie): HTMLElement {
    const section = document.createElement('div');
    section.className = 'section-element';
    section.dataset.element = vue.id;
    const texte = document.createElement('p');
    texte.className = 'accueil-texte';
    texte.textContent = attenteDeLActualisation?.texte ?? TEXTES.lectureEnCours;
    texteDesNoms = texte;
    section.append(creerBandeEnCours(signeDe(vue, 24, false), vue.libelle), texte);
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
    // Noms en cours n'a ni nombre ni carte : il garde sa section, mais ni puce ni part du total.
    const avecPuce = visibles.filter((vue) => !vue.enCours);
    const tout = effectif === 'tout';
    const seulementLesQuestions = effectif === QUESTIONS;
    const montrees = tout ? visibles : seulementLesQuestions ? visibles.filter((vue) => vue.questions > 0) : visibles.filter((vue) => vue.id === effectif);
    const tenues = tout ? vues.filter((vue) => vue.tenue) : [];
    // Sous la puce Questions, les conteneurs de structure ne montrent que les cartes qui posent une question.
    for (const conteneur of hotes.values()) conteneur.classList.toggle('filtre-questions', seulementLesQuestions);
    sommaireHote.replaceChildren(...(avecPuce.length > 0 ? [creerLeSommaire(avecPuce, effectif)] : []));
    liste.replaceChildren(
      ...montrees.map((vue) => (vue.enCours ? creerLaSectionEnCours(vue) : creerLaSection(vue, seulementLesQuestions, montrees.length === 1 && !tout))),
      ...tenues.map(creerLaSectionTenue),
      ...(tout ? [ignores] : []),
    );
    // Les sections viennent d'être rattachées : leurs listes longues retrouvent leur position et se redessinent.
    rafraichirLesListesDe(liste);
  }

  return {
    hote,
    poserLesGestes(id, element) {
      if (element === null) gestes.delete(id);
      else gestes.set(id, element);
    },
    ignores,
    haut,
    pied,
    choix: choixEffectif,
    total: () => vues.filter((vue) => vue.visible).reduce((somme, vue) => somme + vue.nombre, 0),
    poser(suivantes) {
      if (suivantes.bilan === donnees.bilan && suivantes.reglesRecues === donnees.reglesRecues && suivantes.nomsEnCours === donnees.nomsEnCours) return;
      donnees = suivantes;
      recalculer();
      rendre();
      signalerLAttente();
    },
    rafraichir: rendre,
    poserLAttente(suivante) {
      const avant = attenteDeLActualisation;
      attenteDeLActualisation = suivante;
      // Le message paraît en tête tant que la structure manque ; les constats restent là, leurs gestes désactivés par `surAttente`.
      const charge = suivante !== null && suivante.structure && suivante.enTete;
      chargement.hidden = !charge;
      resumeHote.hidden = charge || resumeHote.childNodes.length === 0;
      texteDeChargement.textContent = charge ? suivante.texte : '';
      if (texteDesNoms !== null && suivante !== null) texteDesNoms.textContent = suivante.texte;
      // Un changement de texte seul (la progression de la lecture) ne redessine pas les sections.
      if (avant?.structure === suivante?.structure && avant?.noms === suivante?.noms && avant?.enTete === suivante?.enTete) return;
      recalculer();
      rendre();
      signalerLAttente();
      // Le compte de l'onglet suit les sections : Noms y entre quand son bilan est là.
      auChangement();
    },
    attente: attenteEffective,
    surAttente(rappel) {
      surAttentes.add(rappel);
      return () => {
        surAttentes.delete(rappel);
      };
    },
    structureRecue: () => structure !== null,
    poserLeResume(texte) {
      if (texte === null) {
        resumeHote.replaceChildren();
        resumeHote.hidden = true;
        return;
      }
      const resume = document.createElement('div');
      resume.className = 'arch-resume';
      const ligne = document.createElement('div');
      ligne.className = 'arch-resume-ligne';
      const titre = document.createElement('span');
      titre.className = 'arch-resume-titre';
      const meta = document.createElement('span');
      meta.className = 'meta';
      meta.textContent = texte;
      titre.append(meta);
      ligne.append(titre);
      resume.append(ligne);
      resumeHote.replaceChildren(resume);
      resumeHote.hidden = !chargement.hidden;
    },
    poserLaStructure(suivante) {
      if (suivante === null && structure === null) return;
      if (suivante && structure && suivante.constats === structure.constats && suivante.corrections === structure.corrections && suivante.noms === structure.noms && suivante.partielle === structure.partielle) return;
      structure = suivante;
      recalculer();
      rendre();
      auChangement();
    },
  };
}

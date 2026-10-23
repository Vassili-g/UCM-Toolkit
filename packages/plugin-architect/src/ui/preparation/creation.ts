/**
 * La création des variables préparées, dans le fichier des tokens : l'alerte en tête de la barre latérale, la feuille qui liste
 * les variables, puis le résultat en tête de Corrections. L'écriture se fait dans le sandbox (`creer-variables`) ; l'interface ne
 * garde que la préparation à l'écran et les réponses du designer.
 */
import { creerAlerte } from 'ucm-plugin-socle/src/ui/Alerte';
import { createButton } from 'ucm-plugin-socle/src/ui/Button';
import { creerChemin, creerCheminEnPhrase } from 'ucm-plugin-socle/src/ui/Chemin';
import { createFeuille, type FeuilleUi } from 'ucm-plugin-socle/src/ui/Feuille';
import type { DemandeDePreparation, MessageDePreparation, PreparationVue, VariableVue } from '../../messages/preparation';
import type { Coquille } from '../nomenclature/coquille';
import { TEXTES } from '../textes/nomenclature';
import { TEXTES_PREPARATION as T } from '../textes/preparation';

type VariablesCreees = Extract<MessageDePreparation, { type: 'variables-creees' }>;

/** Les lignes à créer que la feuille montre avant « Afficher les N autres ». */
const LIGNES_AVANT_LA_SUITE = 3;

export interface OptionsDeCreation {
  readonly coquille: Coquille;
  readonly envoyer: (demande: DemandeDePreparation) => void;
  /** Le nom du fichier des tokens, que la phrase de publication cite ; `null` tant que le relevé manque. */
  readonly nomDuFichier: () => string | null;
  /** Une création a écrit `nombre` variables de `composant` : l'Historique de la Configuration en garde la ligne. `journal` dit si le fichier a gardé de quoi la défaire. */
  readonly surCreation: (nombre: number, composant: string, journal: boolean) => void;
}

export interface Creation {
  recevoirLesPreparations(preparations: readonly PreparationVue[]): void;
  recevoirLeResultat(message: VariablesCreees): void;
}

const el = <K extends keyof HTMLElementTagNameMap>(balise: K, classe = '', texte = ''): HTMLElementTagNameMap[K] => {
  const element = document.createElement(balise);
  if (classe !== '') element.className = classe;
  if (texte !== '') element.textContent = texte;
  return element;
};

/** Les variables que la création écrirait : celles qui n'ont pas encore été créées, y compris celles dont l'essai a échoué. */
const aCreer = (preparation: PreparationVue): readonly VariableVue[] => preparation.variables.filter((variable) => variable.etat === 'a-creer' || variable.etat === 'echec');
const dejaPresentes = (preparation: PreparationVue): readonly VariableVue[] => preparation.variables.filter((variable) => variable.etat === 'existe-identique' || variable.etat === 'existe-divergente');

/** Les cibles distinctes d'une variable, une par ligne ; le mode précède la cible quand elles diffèrent. */
function ciblesDe(variable: VariableVue): readonly string[] {
  const parMode = Object.entries(variable.cibles);
  const distinctes = new Set(parMode.map(([, cible]) => cible));
  return distinctes.size <= 1 ? [...distinctes] : parMode.map(([mode, cible]) => `${mode} : ${cible}`);
}

export function monterCreation({ coquille, envoyer, nomDuFichier, surCreation }: OptionsDeCreation): Creation {
  let preparations: readonly PreparationVue[] = [];
  let feuille: FeuilleUi | null = null;
  let ouverte: string | null = null;
  let toutesLesLignes = false;
  let enCours = false;
  let derniere: VariablesCreees | null = null;
  let collection: string | undefined;
  const reponses: Record<string, string> = {};
  let resultat: HTMLElement | null = null;

  const preparationOuverte = (): PreparationVue | undefined => preparations.find((item) => item.id === ouverte);

  function fermer(): void {
    const courante = feuille;
    feuille = null;
    ouverte = null;
    courante?.fermer();
  }

  function ligneACreer(variable: VariableVue): HTMLElement {
    const ligne = el('div', 'diff sans-case');
    const nom = el('span', 'chemin');
    nom.append(creerChemin(variable.nom));
    const vise = el('span', 'chemin-apres');
    ciblesDe(variable).forEach((cible, rang) => {
      if (rang > 0) vise.append(el('br'));
      vise.append(creerChemin(cible));
    });
    ligne.append(nom, vise);
    const echec = derniere?.echecs.find((item) => item.nom === variable.nom);
    if (echec) vise.append(el('br'), el('span', 'meta', T.preparationRefus[echec.motif] ?? T.preparationRefus.erreur));
    return ligne;
  }

  function ligneExistante(variable: VariableVue): HTMLElement {
    const ligne = el('div', 'diff sans-case reste');
    const nom = el('span', 'chemin');
    nom.append(creerChemin(variable.nom));
    const vise = el('span', 'chemin-apres');
    const [cible = ''] = ciblesDe(variable);
    if (variable.etat === 'existe-identique') {
      vise.append(el('span', 'meta', T.preparationCreationExistanteVise), document.createTextNode(' '), creerCheminEnPhrase(cible), el('br'), el('span', 'meta', T.preparationCreationGardee));
    } else {
      vise.append(el('span', 'meta', T.preparationExistanteAutre), document.createTextNode(' '), creerCheminEnPhrase(cible), el('br'));
      for (const [choix, libelle] of [['garder', T.preparationGarder], ['remplacer', T.preparationRemplacer]] as const) {
        const etiquette = el('label', 'meta');
        const radio = el('input');
        radio.type = 'radio';
        radio.name = `existante:${variable.nom}`;
        radio.value = choix;
        radio.checked = reponses[radio.name] === choix;
        radio.addEventListener('change', () => { reponses[radio.name] = choix; });
        etiquette.append(radio, document.createTextNode(` ${libelle} `));
        vise.append(etiquette);
      }
    }
    ligne.append(nom, vise);
    return ligne;
  }

  function creer(preparation: PreparationVue): void {
    if (enCours) return;
    enCours = true;
    envoyer({ type: 'creer-variables', preparation: preparation.id, ...(collection ? { collection } : {}), ...(Object.keys(reponses).length > 0 ? { reponses: { ...reponses } } : {}) });
    rendreLaFeuille();
  }

  function creerLeContenu(preparation: PreparationVue): HTMLElement {
    const contenu = el('div', 'feuille-contenu');
    const restantes = aCreer(preparation);
    const existantes = dejaPresentes(preparation);

    const sommaire = el('p');
    sommaire.append(el('b', '', T.preparationCreationCompte(restantes.length)));
    if (existantes.length > 0) sommaire.append(document.createTextNode(` ${T.preparationCreationExistante(existantes.length)}`));
    contenu.append(sommaire);
    if (derniere?.refus) contenu.append(creerAlerte('info', { texte: T.preparationRefus[derniere.refus] ?? T.preparationRefus.inconnu }));
    else if (derniere && (derniere.divergentes.length > 0 || derniere.echecs.length > 0)) {
      contenu.append(creerAlerte('info', { texte: T.preparationResteARegler(derniere.divergentes.length + derniere.echecs.length) }));
    }
    if (derniere && derniere.collections.length > 1) {
      const choix = el('select', 'input');
      choix.setAttribute('aria-label', T.preparationCollectionDeDestination);
      choix.append(...derniere.collections.map((destination) => {
        const option = el('option', '', destination.nom);
        option.value = destination.id;
        return option;
      }));
      collection ??= derniere.collections[0].id;
      choix.value = collection;
      choix.addEventListener('change', () => { collection = choix.value; });
      contenu.append(choix);
    }

    const liste = el('div', 'fiche-liste');
    const colonnes = el('div', 'colonnes-tete sans-case');
    colonnes.append(el('span', '', T.preparationTableVariable), el('span', '', T.preparationTableVise));
    liste.append(colonnes);
    const montrees = toutesLesLignes ? restantes : restantes.slice(0, LIGNES_AVANT_LA_SUITE);
    liste.append(...montrees.map(ligneACreer), ...existantes.map(ligneExistante));
    contenu.append(liste);
    if (montrees.length < restantes.length) {
      const autres = el('button', 'btn-texte', T.preparationCreationAfficherAutres(restantes.length - montrees.length));
      autres.type = 'button';
      autres.addEventListener('click', () => { toutesLesLignes = true; rendreLaFeuille(); });
      contenu.append(autres);
    }

    const abandonner = el('button', 'btn-texte prep-abandonner', T.preparationAbandonner);
    abandonner.type = 'button';
    abandonner.addEventListener('click', () => envoyer({ type: 'abandonner-preparation', preparation: preparation.id }));
    const lanceur = createButton({ label: T.preparationCreer(restantes.length), onClick: () => creer(preparation) });
    lanceur.setAttribute('data-action', 'preparation-creer');
    lanceur.disabled = enCours || restantes.length === 0;
    const gauche = el('span');
    gauche.append(abandonner);
    const actions = el('div');
    actions.className = 'feuille-actions creation-pied';
    actions.append(gauche, lanceur);
    contenu.append(actions, el('p', 'meta', T.preparationCreationHistorique));
    return contenu;
  }

  /** Le titre en code, l'origine à côté et la date dessous, comme la fiche d'une variable ; le pied du socle cède sa place à celui du contenu. */
  function poserLEntete(element: HTMLElement, preparation: PreparationVue): void {
    const entete = element.querySelector('.feuille-entete');
    const titre = entete?.querySelector('.feuille-titre');
    if (!entete || !titre) return;
    const ligne = el('div', 'titre-ligne');
    ligne.append(titre, el('span', 'origine', T.preparationCreationOrigine));
    const definition = el('div', 'titre-et-definition');
    definition.append(ligne, el('p', 'meta', T.preparationCreationDate(TEXTES.quandLeLot(preparation.creeLe, new Date()))));
    entete.classList.add('avec-definition');
    entete.querySelector('.feuille-fermer')?.before(definition);
    element.querySelector('.feuille-pied')?.replaceWith();
  }

  function rendreLaFeuille(): void {
    const preparation = preparationOuverte();
    if (!preparation || (aCreer(preparation).length === 0 && dejaPresentes(preparation).length === 0)) {
      fermer();
      return;
    }
    const corps = creerLeContenu(preparation);
    if (feuille) {
      feuille.element.querySelector('.feuille-corps')?.replaceChildren(corps);
      return;
    }
    const nouvelle = createFeuille({
      titre: T.preparationCreationTitre(preparation.source.jeu.nom),
      corps,
      pied: el('div'),
      onFermer: () => {
        if (feuille === nouvelle) { feuille = null; ouverte = null; }
      },
    });
    feuille = nouvelle;
    nouvelle.element.classList.add('feuille-terme');
    poserLEntete(nouvelle.element, preparation);
  }

  function ouvrir(preparation: PreparationVue): void {
    ouverte = preparation.id;
    toutesLesLignes = false;
    derniere = null;
    collection = undefined;
    for (const cle of Object.keys(reponses)) delete reponses[cle];
    rendreLaFeuille();
  }

  function poserLAlerte(): void {
    const preparation = preparations.find((item) => aCreer(item).length > 0);
    if (!preparation) {
      coquille.poserAlerteDePreparation(null);
      return;
    }
    const nombre = preparation.variables.filter((variable) => variable.etat !== 'creee').length;
    const voir = createButton({ label: T.preparationVoirLesVariables(nombre), variant: 'secondary', compact: true, onClick: () => ouvrir(preparation) });
    voir.setAttribute('data-action', 'preparation-voir');
    coquille.poserAlerteDePreparation(creerAlerte('info', { titre: T.preparationVariablesACreer(nombre, preparation.source.jeu.nom), texte: T.preparationDansFichier, actions: [voir] }));
  }

  /** La ligne de résultat de Corrections : la même que celle d'un renommage, en tête de l'onglet. */
  function poserLeResultat(message: VariablesCreees, composant: string): void {
    const ligne = el('div', 'resultat');
    ligne.setAttribute('role', 'status');
    const pile = el('div', 'pile');
    const titre = el('span');
    const coche = el('span', '', '✓ ');
    coche.setAttribute('aria-hidden', 'true');
    titre.append(coche, T.preparationVariablesCreees(message.creees + message.remplacees, composant));
    pile.append(titre);
    const fichier = nomDuFichier();
    if (fichier !== null) pile.append(el('span', 'meta', T.preparationPublierCreation(fichier)));
    pile.append(el('span', 'meta', message.journal ? T.preparationAnnulerCreation : T.preparationCreationSansJournal));
    ligne.append(pile);
    resultat?.remove();
    resultat = ligne;
    coquille.panneaux.aAppliquer.contenu.prepend(ligne);
    coquille.choisirOnglet('a-appliquer');
  }

  return {
    recevoirLesPreparations(recues) {
      preparations = recues;
      poserLAlerte();
      if (ouverte !== null) rendreLaFeuille();
    },
    recevoirLeResultat(message) {
      enCours = false;
      derniere = message;
      const preparation = preparations.find((item) => item.id === message.preparation);
      const composant = preparation?.source.jeu.nom ?? '';
      if (message.refus === null && message.creees + message.remplacees > 0) {
        poserLeResultat(message, composant);
        surCreation(message.creees + message.remplacees, composant, message.journal);
      }
      if (message.refus === null && message.divergentes.length === 0 && message.echecs.length === 0) fermer();
      else rendreLaFeuille();
    },
  };
}

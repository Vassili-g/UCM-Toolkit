/**
 * Point d'entrée du sandbox : ouvre l'interface, aiguille chaque demande vers
 * son domaine par la table `type → domaine`, et relaie les changements de
 * Figma : la sélection (`selection`), la déclaration UCM du fichier
 * (`declaration`) et la péremption de l'analyse (`perime`).
 *
 * Seules les routes d'écriture de `ecriture/` écrivent dans le document.
 * `clientStorage` reçoit la taille de la fenêtre et les préférences.
 *
 * Figma ne signale pas les changements de variables sans charger toutes les
 * pages (`documentchange`) : le relevé se relit au geste « Actualiser ». Seul
 * `stylechange` s'ajoute à `nodechange`, pour les styles.
 */
import { TAILLE_PAR_DEFAUT } from './fenetre';
import type { PluginMessage, UiRequest } from './messages';
import { analysesLanceesParLeDesigner, annulerLaPrelecture, fermerLaSession, operationEnCours, surChangementDeStyle, surInterruptionDePage, surChangementDuDocument, surSelection } from './sandbox/analyse';
import { declarer, envoyerLaSelection, ouvrirLaFenetre, sujetDeLaSelectionCourante } from './sandbox/commun';
import { reperDesLectures } from './sandbox/acquisition';
import { abandonnerLesLibrariesAnticipees, rafraichirLesLibraries } from './sandbox/anticipation';
import { creerLeSuivi, type Contexte } from './sandbox/contexte';
import { DOMAINES, tableDesTypes } from './sandbox/index';
import { annoncerLOuverture } from './sandbox/nomenclature';
import { portDeLecture } from './sandbox/lectureDeFigma';
import { poserLaDemandeDeTokens } from './lecture';
import { creerLaPrelecture, creerLaPrelectureDesTokens } from './sandbox/prelecture';
import { espaceDuProfil } from '@ucm-kit/core/format';

figma.showUI(__html__, { themeColors: false, visible: false, width: TAILLE_PAR_DEFAUT.largeur, height: TAILLE_PAR_DEFAUT.hauteur });

function versUi(message: PluginMessage): void {
  figma.ui.postMessage(message);
}

const surLesNoeuds = (evenement: NodeChangeEvent): void => {
  prelecture.surChangement();
  prelectureDesTokens.surChangement();
  surChangementDuDocument(evenement.nodeChanges.map((changement) => ({
    type: changement.type,
    id: changement.node.id,
    node: changement.node,
    ...('properties' in changement ? { properties: changement.properties } : {}),
  })), contexte);
};

const surLesStyles = (evenement: StyleChangeEvent): void => {
  prelecture.surChangement();
  prelectureDesTokens.surChangement();
  surChangementDeStyle(evenement.styleChanges, contexte);
};

/**
 * Abonne le sandbox aux changements de la page courante et de la page du sujet
 * de l'analyse (le maître d'une instance peut vivre ailleurs), à la première
 * analyse. `documentchange` demanderait `loadAllPagesAsync`, que la loi
 * d'écriture refuse hors de `ecriture/` et qui coûte cher dans un gros
 * fichier : un jeu de variants se lit et se défait sur la page qui le porte.
 */
const suivi = creerLeSuivi<PageNode>(() => figma.currentPage, surLesNoeuds, (page, raison) => surInterruptionDePage(page.id, raison, contexte));

function surveillerLeDocument(page?: PageNode): readonly string[] {
  return suivi.surveiller(page).map((nonEcoutee) => nonEcoutee.id);
}

const contexte: Contexte = { figma, envoyer: versUi, surveillerLeDocument, envoyerLaCapture: (message) => figma.ui.postMessage(message) };

// La prélecture à la sélection (16.16) : un composant sélectionné, puis 1 s sans événement, lance une analyse discrète.
const prelecture = creerLaPrelecture({
  aUnSujet: () => sujetDeLaSelectionCourante(figma).sujet !== null,
  lancer: () => traiterMessage({ type: 'analyser', origine: 'prelecture' }).catch(() => undefined),
  annuler: () => { annulerLaPrelecture(); },
  operationEnCours,
  analysesDuDesigner: analysesLanceesParLeDesigner,
  relancerLesLibraries: () => rafraichirLesLibraries(figma),
  planifier: (rappel, ms) => {
    const minuterie = setTimeout(rappel, ms);
    return () => clearTimeout(minuterie);
  },
  maintenant: () => Date.now(),
});

// Le candidat de prélecture du relevé Tokens (D5) : construit, jamais lancé. Aucun appel à `lancer()` n'existe tant que le mainteneur
// n'a pas comparé les interactions avec et sans lui dans Figma (D5b). Les arrêts ci-dessous sont déjà branchés : une demande du
// designer passe avant lui, et un événement de Figma le périme.
const prelectureDesTokens = creerLaPrelectureDesTokens({
  port: portDeLecture(figma),
  fichier: () => figma.root.name,
  espace: () => espaceDuProfil(figma.root.documentColorProfile),
  respirer: () => new Promise((resolve) => setTimeout(resolve, 0)),
  demandePrioritaire: () => operationEnCours() !== null,
  repere: reperDesLectures,
  maintenant: () => Date.now(),
});

const domaineDe = tableDesTypes();
const ouverture = ouvrirLaFenetre(contexte);

function aLaSelection(): void {
  prelectureDesTokens.surChangement();
  const { sujetId, origine } = envoyerLaSelection(contexte);
  surSelection(sujetId, origine, contexte);
  prelecture.surSelection();
}

async function traiterMessage(message: UiRequest): Promise<void> {
  const domaine = domaineDe.get(message.type);
  if (domaine === undefined) return;
  prelectureDesTokens.cederLaPlace();
  // Les phases du journal du mode Tokens que ce message ouvre avant sa première attente portent son numéro.
  poserLaDemandeDeTokens('demande' in message && typeof message.demande === 'number' ? message.demande : null);
  await (DOMAINES[domaine as keyof typeof DOMAINES].traiter as (demande: UiRequest, contexte: Contexte) => Promise<void>)(message, contexte);
  if (message.type === 'lire-preferences') {
    await ouverture;
    annoncerLOuverture(contexte);
  } else if (domaine === 'nomenclature') {
    declarer(contexte);
  }
}

figma.on('selectionchange', aLaSelection);
// `stylechange` ne demande pas `loadAllPagesAsync` ; il ne dit rien d'une variable liée à un style ni d'un style de library.
figma.on('stylechange', surLesStyles);
const aLaPage = (): void => {
  abandonnerLesLibrariesAnticipees();
  suivi.recalculer();
  aLaSelection();
};
figma.on('currentpagechange', aLaPage);
// Fermer le plugin retire les écoutes et vide la session d'analyse : rien n'en survit, et rien n'est écrit dans `clientStorage`.
figma.on('close', () => {
  figma.off('selectionchange', aLaSelection);
  figma.off('stylechange', surLesStyles);
  figma.off('currentpagechange', aLaPage);
  suivi.fermer();
  prelecture.fermer();
  prelectureDesTokens.fermer();
  abandonnerLesLibrariesAnticipees();
  fermerLaSession();
});

figma.ui.onmessage = async (message: UiRequest) => {
  if (!message || typeof message.type !== 'string') return;
  try {
    await traiterMessage(message);
  } catch (erreur) {
    if ('demande' in message && typeof message.demande === 'number') {
      versUi({ type: 'lecture-echouee', demande: message.demande, message: erreur instanceof Error ? erreur.message : String(erreur) });
    }
  }
};

/** L'écran d'UCM Architect : l'analyse, la proposition de noms, leur application et le relevé à télécharger. */
import { createButton } from 'ucm-plugin-socle/src/ui/Button';
import { createResizeGrip } from 'ucm-plugin-socle/src/ui/ResizeGrip';
import type { Analyse } from '../analyse';
import type { ResultatApplication } from '../ecriture';
import type { PluginMessage, UiMessage } from '../messages';
import { creerFrontiere } from './frontiere';
import { bilanDeLAnalyse, doublonsDeLAnalyse, grouperLesRenommages, lignesDEcriture, texteDApplication } from './presentation';
import { preparerTelechargementRenommages, telecharger } from './telechargement';
import { TEXTES } from './textes';
import { creerBilan, creerCarteDEcriture, creerEntete, creerListe, creerPied, texteAvecCode } from './vues';

const app = document.getElementById('app');
if (!app) throw new Error('Élément app absent');
const envoyer = (message: UiMessage) => parent.postMessage({ pluginMessage: message }, '*');

let occupe = false;
let dernierResultat: ResultatApplication | undefined;

const bouton = createButton({ label: TEXTES.analyser, onClick: () => {
  resultats.hidden = true;
  telechargement.hidden = true;
  bilan.poser(TEXTES.titreAvantAnalyse, '');
  dire(TEXTES.lectureDuFichier);
  occuper(true);
  frontiere.analyser();
} });
bouton.id = 'analyser';
const progression = document.createElement('progress');
progression.hidden = true;
const statut = document.createElement('p');
statut.setAttribute('role', 'status');
statut.hidden = true;
const telechargement = createButton({ label: TEXTES.fin.telecharger, variant: 'secondary', onClick: () => {
  if (!dernierResultat) return;
  const fichier = preparerTelechargementRenommages(dernierResultat);
  telecharger(fichier.nom, fichier.contenu, fichier.type);
} });
telechargement.id = 'telecharger';
telechargement.hidden = true;
const action = document.createElement('div');
action.className = 'action';
action.append(bouton, progression, statut, telechargement);

const bilan = creerBilan();
bilan.poser(TEXTES.titreAvantAnalyse, '');
const carte = creerCarteDEcriture(() => {
  const choix = carte.lire();
  dire(TEXTES.miseAJour);
  occuper(true);
  frontiere.recalculer(choix.conventions, choix.termesUcm);
});
const liste = creerListe(() => rafraichirLePied());
const pied = creerPied(() => {
  dire(TEXTES.application);
  occuper(true);
  frontiere.appliquer(liste.cochees());
});
const resultats = document.createElement('div');
resultats.className = 'resultats';
resultats.hidden = true;
resultats.append(carte.element, liste.element, pied.element);
const note = document.createElement('p');
note.className = 'field-help';
note.append(texteAvecCode(TEXTES.note));

function dire(texte: string): void {
  statut.textContent = texte;
  statut.hidden = texte === '';
}

function rafraichirLePied(): void {
  pied.poser(liste.cochees().length, occupe);
}

/** Un geste en vol fige l'écran : la réponse seule le libère. */
function occuper(enCours: boolean): void {
  occupe = enCours;
  bouton.disabled = enCours;
  progression.hidden = !enCours;
  if (enCours) progression.removeAttribute('value');
  carte.occuper(enCours);
  liste.occuper(enCours);
  rafraichirLePied();
}

function montrerLAnalyse(analyse: Analyse): void {
  const { titre, aide } = bilanDeLAnalyse(analyse);
  bilan.poser(titre, aide);
  carte.afficher(lignesDEcriture(analyse), analyse.termesUcm);
  const groupes = grouperLesRenommages(analyse);
  liste.afficher(groupes, doublonsDeLAnalyse(analyse));
  pied.element.hidden = groupes.length === 0;
  resultats.hidden = false;
  dire('');
  occuper(false);
}

/** Le bouton d'analyse passe au second plan tant que l'application des noms est le geste attendu. */
function pousserLAnalyse(premierPlan: boolean): void {
  bouton.classList.toggle('btn-primary', premierPlan);
  bouton.classList.toggle('btn-secondary', !premierPlan);
}

const frontiere = creerFrontiere(envoyer, (message: PluginMessage) => {
  switch (message.type) {
    case 'initial':
      app.dataset.etat = message.type;
      return;
    case 'lecture':
      app.dataset.etat = message.type;
      occuper(true);
      progression.max = Math.max(1, message.avancement.totalPages);
      progression.value = message.avancement.pagesLues;
      dire(message.avancement.phase === 'variables' ? TEXTES.lectureDesVariables : TEXTES.lectureDesPages(message.avancement.pagesLues, message.avancement.totalPages));
      return;
    case 'pret':
      app.dataset.etat = message.type;
      pousserLAnalyse(false);
      montrerLAnalyse(message.analyse);
      return;
    case 'application':
      app.dataset.etat = message.type;
      dernierResultat = message.resultat;
      pousserLAnalyse(true);
      resultats.hidden = true;
      bilan.poser(TEXTES.titreAvantAnalyse, '');
      occuper(false);
      dire(texteDApplication(message.resultat));
      telechargement.hidden = false;
      return;
    case 'erreur':
      app.dataset.etat = message.type;
      pousserLAnalyse(true);
      resultats.hidden = true;
      bilan.poser(TEXTES.titreAvantAnalyse, '');
      occuper(false);
      dire(message.message);
  }
});
app.dataset.etat = 'initial';
app.append(creerEntete(), action, bilan.element, resultats, note, createResizeGrip(envoyer));
window.addEventListener('message', (event: MessageEvent<{ pluginMessage?: PluginMessage }>) => {
  if (event.data?.pluginMessage) frontiere.recevoir(event.data.pluginMessage);
});

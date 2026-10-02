/**
 * Point d'entrée de l'interface : la barre, puis l'un des deux modes, et la
 * réception des messages du sandbox. Une réponse dont la demande a été
 * remplacée est ignorée : elle ne remplace pas le sujet courant.
 *
 * La disposition large monte l'explorateur de tokens : l'arbre, les onglets
 * et l'inspecteur. La disposition étroite monte la vue composant. Le sandbox
 * annonce celle de l'ouverture, et la bascule de la barre passe de l'une à
 * l'autre.
 */
import { createOnglets } from 'ucm-plugin-socle/src/ui/Onglets';
import { createResizeGrip } from 'ucm-plugin-socle/src/ui/ResizeGrip';

import type { Disposition } from '../fenetre';
import type { PluginMessage } from '../messages';
import { creerApplication, type Branchements, type Composant, type Zone } from './application';
import { creerArbre } from './arbre';
import { creerBarre } from './barre';
import { etatInitial, ONGLETS, poserReleve, type Onglet } from './etat';
import { creerInspecteur } from './inspecteur';
import { versSandbox } from './pont';
import { installerSurvol } from './survol';
import { creerTable } from './table';
import { TEXTES } from './textes';
import { creerVueComparer } from './vues/comparer';
import { creerVueComposant } from './vues/composant';
import { creerVueDependants } from './vues/dependants';
import { creerVueDiagnostics } from './vues/diagnostics';
import { creerVueIntegrations } from './vues/integrations';
import { creerVueReleves, simulationActive } from './vues/releves';

const etat = etatInitial();
let branchements: Branchements;
const app = creerApplication(etat, () => branchements);

/** `index.html` déclare ce conteneur ; `tests/buildUi.test.ts` tient le gabarit. */
const racine = document.getElementById('app') as HTMLElement;
racine.className = 'application';

const barre = creerBarre(app);
const arbre = creerArbre(app);
const table = creerTable(app);
const inspecteur = creerInspecteur(app);
const vueComposant = creerVueComposant(app);
const vues: Record<Exclude<Onglet, 'table'>, Composant> = {
  comparer: creerVueComparer(app),
  dependants: creerVueDependants(app),
  diagnostics: creerVueDiagnostics(app),
  integrations: creerVueIntegrations(app),
  releves: creerVueReleves(app),
};

const panneaux = Object.fromEntries(ONGLETS.map((onglet) => {
  const panneau = document.createElement('div');
  panneau.className = 'panneau';
  panneau.append(onglet === 'table' ? table.element : vues[onglet].element);
  return [onglet, panneau];
})) as Record<Onglet, HTMLDivElement>;
const onglets = createOnglets<Onglet>(TEXTES.vues, ONGLETS.map((id) => ({ id, libelle: TEXTES.onglets[id], panneau: panneaux[id] })), (id) => {
  if (etat.onglet !== id) app.changerOnglet(id);
});

const accueil = document.createElement('div');
accueil.className = 'accueil';

const centre = document.createElement('main');
centre.className = 'centre';
centre.append(accueil, table.tete, onglets.liste, ...ONGLETS.map((onglet) => panneaux[onglet]));

const pied = document.createElement('footer');
pied.className = 'pied';
const perimetre = document.createElement('span');
perimetre.className = 'pied-perimetre';
const fraicheur = document.createElement('span');
fraicheur.className = 'pied-fraicheur';
const lectureSeule = document.createElement('span');
lectureSeule.className = 'pied-lecture';
lectureSeule.textContent = TEXTES.lectureSeule;
pied.append(perimetre, fraicheur, lectureSeule);

const bandeau = document.createElement('div');
bandeau.className = 'bandeau-simulation';
bandeau.setAttribute('role', 'status');
bandeau.textContent = TEXTES.simulationActive;

const annonce = document.createElement('div');
annonce.className = 'annonce';
annonce.setAttribute('role', 'status');
annonce.setAttribute('aria-live', 'polite');
const annonceTexte = document.createElement('span');
const secours = document.createElement('textarea');
secours.className = 'secours';
secours.readOnly = true;
secours.hidden = true;
secours.setAttribute('aria-label', TEXTES.copieRefusee);
annonce.append(annonceTexte, secours);

const corps = document.createElement('div');
corps.className = 'corps';
corps.append(arbre.element, centre, inspecteur.element);

const bulle = installerSurvol(app);
const poignee = createResizeGrip(versSandbox);
racine.replaceChildren(barre.element, bandeau, corps, pied, annonce, bulle, poignee);

/** Monte le mode de la disposition sous la barre. L'annonce et la poignée restent dans les deux. */
function poserLaDisposition(disposition: Disposition): void {
  if (etat.disposition === disposition) return;
  etat.disposition = disposition;
  racine.classList.toggle('application-etroite', disposition === 'etroite');
  if (disposition === 'etroite') racine.replaceChildren(barre.element, vueComposant.element, annonce, poignee);
  else racine.replaceChildren(barre.element, bandeau, corps, pied, annonce, bulle, poignee);
  app.rendre();
  vueComposant.activer();
}

const heure = (millisecondes: number) => new Date(millisecondes).toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' });

function rendreAccueil(): void {
  const { lecture, index } = etat;
  accueil.hidden = Boolean(index) && lecture.statut !== 'echouee';
  onglets.liste.hidden = !index;
  const parties: HTMLElement[] = [];
  const texte = document.createElement('p');
  texte.className = 'accueil-texte';
  if (lecture.statut === 'en-cours') texte.textContent = lecture.total > 1 || lecture.fait > 0 ? TEXTES.progression(TEXTES.phase[lecture.phase] ?? lecture.phase, lecture.fait, lecture.total) : TEXTES.lectureEnCours;
  else if (lecture.statut === 'annulee') texte.textContent = TEXTES.lectureAnnulee;
  else if (lecture.statut === 'echouee') texte.textContent = etat.releve ? TEXTES.donneesAnciennes(heure(etat.releve.luA)) : TEXTES.lectureEchouee(lecture.message);
  else if (etat.releve && etat.releve.variables.length === 0) texte.textContent = TEXTES.aucuneVariable;
  else texte.textContent = TEXTES.pret;
  parties.push(texte);
  if (lecture.statut !== 'en-cours' && !index) {
    const lire = document.createElement('button');
    lire.type = 'button';
    lire.className = 'btn btn-primary';
    lire.textContent = TEXTES.lire;
    lire.addEventListener('click', () => app.actualiser());
    parties.push(lire);
  }
  accueil.replaceChildren(...parties);
}

function rendrePied(): void {
  const { releve, index } = etat;
  perimetre.textContent = releve ? `${TEXTES.perimetre(releve.variables.length, releve.collections.length)}${releve.manquees.length ? ` · ${TEXTES.manquees(releve.manquees.length)}` : ''}` : '';
  fraicheur.textContent = releve && index ? TEXTES.fraicheur(heure(releve.luA), releve.revision) : '';
  bandeau.hidden = !simulationActive(app);
}

branchements = {
  rendre(zones: readonly Zone[]) {
    const demandees = new Set(zones);
    if (demandees.has('barre')) barre.mettreAJour();
    if (demandees.has('arbre')) arbre.mettreAJour();
    if (onglets.actif() !== etat.onglet) onglets.selectionner(etat.onglet);
    if (demandees.has('table') || demandees.has('vue')) {
      table.mettreAJour();
      if (etat.onglet !== 'table') vues[etat.onglet].mettreAJour();
    }
    if (demandees.has('inspecteur')) inspecteur.mettreAJour();
    rendreAccueil();
    if (demandees.has('pied') || demandees.has('barre')) rendrePied();
  },
  montrerDansLaTable: (variable) => table.montrer(variable),
  annoncer(texte, zoneDeSecours) {
    annonceTexte.textContent = texte;
    secours.hidden = zoneDeSecours === undefined;
    if (zoneDeSecours !== undefined) {
      secours.value = zoneDeSecours;
      secours.focus();
      secours.select();
    }
  },
  disposer: poserLaDisposition,
};

/** Vrai quand la réponse vient de la lecture en cours ; une réponse d'une demande remplacée est ignorée. */
const demandeCourante = (demande: number): boolean => etat.lecture.statut === 'en-cours' && etat.lecture.demande === demande;

function recevoir(message: PluginMessage): void {
  switch (message.type) {
    case 'preferences':
      etat.preferences = message.preferences;
      if (etat.preferences.palettes) versSandbox({ type: 'lire-recette-palettes', demande: app.nouvelleDemande() });
      app.rendre(['arbre', 'table']);
      return;
    case 'preferences-rangees':
      return;
    case 'progression':
      if (demandeCourante(message.demande)) {
        etat.lecture = { statut: 'en-cours', demande: message.demande, phase: message.phase, fait: message.fait, total: message.total };
        app.rendre(['barre']);
      }
      return;
    case 'releve':
      if (!demandeCourante(message.demande)) return;
      etat.lecture = { statut: 'attente' };
      poserReleve(etat, message.releve);
      app.rendre();
      return;
    case 'lecture-echouee':
      if (demandeCourante(message.demande)) {
        etat.lecture = { statut: 'echouee', message: message.message };
        app.rendre(['barre', 'pied']);
      } else vueComposant.recevoirEchec(message.demande, message.message);
      return;
    case 'annulation':
      if (demandeCourante(message.demande)) {
        etat.lecture = etat.releve ? { statut: 'attente' } : { statut: 'annulee' };
        app.rendre(['barre', 'pied', 'table']);
      }
      return;
    case 'selection':
      vueComposant.recevoirSelection(message.sujet, message.ignores);
      return;
    case 'disposition':
      poserLaDisposition(message.disposition);
      return;
    case 'composant':
      vueComposant.recevoirLecture(message.demande, message.lecture);
      return;
    case 'apercu-du-composant':
      vueComposant.recevoirApercu(message);
      return;
    case 'recette-palettes':
      etat.recette = { demande: message.demande, texte: message.texte };
      app.rendre(['vue', 'inspecteur']);
      return;
  }
}

window.addEventListener('message', (evenement: MessageEvent) => {
  const message = evenement.data?.pluginMessage as PluginMessage | undefined;
  if (message && typeof message.type === 'string') recevoir(message);
});

app.rendre();
versSandbox({ type: 'lire-preferences' });
app.actualiser();

/**
 * Point d'entrée de l'interface : la barre, puis l'un des deux modes, et la
 * réception des messages du sandbox. Une réponse dont la demande a été
 * remplacée est ignorée : elle ne remplace pas le sujet courant.
 *
 * La disposition large monte le mode Tokens : l'arbre, la table et le
 * panneau latéral, où l'écran de Nomenclature a pris la place de
 * l'inspecteur ; la fiche d'une variable s'ouvre en feuille sur ce panneau. La disposition étroite monte la vue composant. Le sandbox
 * annonce celle de l'ouverture, et la bascule de la barre passe de l'une à
 * l'autre.
 */
import { createResizeGrip } from 'ucm-plugin-socle/src/ui/ResizeGrip';

import type { Disposition } from '../fenetre';
import type { PluginMessage } from '../messages';
import { estMessageDeNomenclature } from '../messages/nomenclature';
import { creerApplication, type Branchements, type Zone } from './application';
import { creerArbre } from './arbre';
import { creerBarre } from './barre';
import { creerFiche } from './fiche';
import { collectionDuFiltre, etatInitial, poserReleve } from './etat';
import { monterNomenclature } from './nomenclature';
import { monterStructure } from './structure';
import type { Noms } from './structure/lecture';
import { versSandbox } from './pont';
import { installerSurvol } from './survol';
import { creerTable } from './table';
import { TEXTES } from './textes';
import { creerVueComposant } from './vues/composant';

const etat = etatInitial();
let branchements: Branchements;
const app = creerApplication(etat, () => branchements);

/** `index.html` déclare ce conteneur ; `tests/buildUi.test.ts` tient le gabarit. */
const racine = document.getElementById('app') as HTMLElement;
racine.className = 'application';

const barre = creerBarre(app);
const arbre = creerArbre(app);
const table = creerTable(app);
const fiche = creerFiche(app);
const vueComposant = creerVueComposant(app);
const panneau = document.createElement('div');
panneau.className = 'panneau';
panneau.append(table.element);

const accueil = document.createElement('div');
accueil.className = 'accueil';

const centre = document.createElement('main');
centre.className = 'centre';
centre.append(accueil, table.tete, panneau);

const pied = document.createElement('footer');
pied.className = 'pied';
const perimetre = document.createElement('span');
perimetre.className = 'pied-perimetre';
const fraicheur = document.createElement('span');
fraicheur.className = 'pied-fraicheur';
pied.append(perimetre, fraicheur);

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

const lateral = document.createElement('aside');
lateral.className = 'panneau-lateral';
const hoteDeNomenclature = document.createElement('div');
lateral.append(hoteDeNomenclature);
const nomenclature = monterNomenclature(hoteDeNomenclature, versSandbox, {
  appartient: (identifiant, collection) => identifiant === collection || etat.index?.variables.get(identifiant)?.collection === collection,
  enleverLeFiltre: () => app.enleverLeFiltre(),
  rechercher: (texte) => app.rechercherParLien(texte),
  rechercherLeTerme: (mot, formes) => app.rechercherLeTerme(mot, formes),
});

/** Le segment dont la carte vient d'être ouverte depuis la table ; il reste souligné tant que la carte est ciblée. */
let segmentCible: { readonly variable: string; readonly rang: number } | null = null;
nomenclature.renommages.abonner(() => app.rendre(['table']));
nomenclature.coquille.surChangement(() => {
  if (segmentCible === null || nomenclature.coquille.etat().carteDemandee !== null) return;
  segmentCible = null;
  app.rendre(['table']);
});
app.renommages = {
  de: (variable) => nomenclature.renommages.de(variable),
  cible: () => segmentCible,
  ouvrir(variable, rang) {
    const carte = nomenclature.renommages.de(variable)?.cartes.get(rang);
    if (carte === undefined) return;
    segmentCible = { variable, rang };
    nomenclature.coquille.demanderUneCarte(carte);
    app.rendre(['table']);
  },
};

/** Ce que l'écran de structure sait du relevé : le nom entier d'une variable (collection, puis nom), par son identifiant ou sa clé, et l'inverse. */
const noms: Noms = {
  nom(cle) {
    const variable = etat.index?.variables.get(cle) ?? [...(etat.index?.variables.values() ?? [])].find((candidate) => candidate.cle === cle);
    if (!variable) return null;
    const collection = etat.index?.collections.get(variable.collection);
    return collection ? `${collection.nom}/${variable.nom}` : variable.nom;
  },
  cle(nom) {
    const trouvee = [...(etat.index?.variables.values() ?? [])].find((variable) => noms.nom(variable.id) === nom);
    return trouvee?.id ?? null;
  },
};
const structure = monterStructure(nomenclature.coquille, { envoyer: versSandbox, noms, ouvrirLaFiche: (cle) => app.suivre(cle) });

/**
 * Les feuilles du socle couvrent la fenêtre. Ici elles ne couvrent que la barre latérale, où Nomenclature et la fiche d'une variable
 * les ouvrent : le tableau et l'arbre restent visibles. La feuille lit ces quatre marges (`fiche.css`) ; la place de la barre de
 * défilement reste libre, comme dans la maquette.
 */
function poserLaZoneDesFeuilles(): void {
  const style = document.documentElement.style;
  const marges = ['--lateral-haut', '--lateral-droite', '--lateral-bas', '--lateral-gauche'];
  if (!lateral.isConnected) {
    for (const marge of marges) style.removeProperty(marge);
    return;
  }
  const zone = lateral.getBoundingClientRect();
  const { clientWidth, clientHeight } = document.documentElement;
  const valeurs = [zone.top, clientWidth - (zone.left + lateral.clientLeft + lateral.clientWidth), clientHeight - zone.bottom, zone.left + lateral.clientLeft];
  marges.forEach((marge, rang) => style.setProperty(marge, `${Math.max(0, valeurs[rang])}px`));
}
new ResizeObserver(poserLaZoneDesFeuilles).observe(lateral);
window.addEventListener('resize', poserLaZoneDesFeuilles);

/** La collection choisie dans l'arbre filtre la barre latérale : la coquille montre sa puce. */
function poserLeFiltre(): void {
  const collection = collectionDuFiltre(etat);
  const nom = collection ? etat.index?.collections.get(collection)?.nom : undefined;
  nomenclature.coquille.poserLeFiltre(collection && nom !== undefined ? { id: collection, nom } : null);
}

const corps = document.createElement('div');
corps.className = 'corps';
corps.append(arbre.element, centre, lateral);

const bulle = installerSurvol(app);
const poignee = createResizeGrip(versSandbox);
racine.replaceChildren(barre.element, corps, pied, annonce, bulle, poignee);

/** Monte le mode de la disposition sous la barre. L'annonce et la poignée restent dans les deux. */
function poserLaDisposition(disposition: Disposition): void {
  if (etat.disposition === disposition) return;
  etat.disposition = disposition;
  racine.classList.toggle('application-etroite', disposition === 'etroite');
  if (disposition === 'etroite') racine.replaceChildren(barre.element, vueComposant.element, annonce, poignee);
  else racine.replaceChildren(barre.element, corps, pied, annonce, bulle, poignee);
  app.rendre();
  vueComposant.activer();
}

const heure = (millisecondes: number) => new Date(millisecondes).toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' });

function rendreAccueil(): void {
  const { lecture, index } = etat;
  accueil.hidden = Boolean(index) && lecture.statut !== 'echouee';
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
  fraicheur.textContent = releve && index ? TEXTES.fraicheur(heure(releve.luA)) : '';
}

branchements = {
  rendre(zones: readonly Zone[]) {
    const demandees = new Set(zones);
    if (demandees.has('barre')) barre.mettreAJour();
    if (demandees.has('arbre')) arbre.mettreAJour();
    if (demandees.has('table') || demandees.has('vue')) table.mettreAJour();
    if (demandees.has('fiche')) fiche.mettreAJour();
    rendreAccueil();
    if (demandees.has('pied') || demandees.has('barre')) rendrePied();
    poserLeFiltre();
  },
  montrerDansLaTable: (variable) => table.montrer(variable),
  ouvrirLaConfiguration: () => nomenclature.coquille.ouvrirLaConfiguration(),
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
  if (estMessageDeNomenclature(message)) {
    nomenclature.recevoir(message);
    return;
  }
  if (message.type === 'structure' || message.type === 'structure-appliquee') {
    structure.recevoir(message);
    return;
  }
  switch (message.type) {
    case 'preferences':
      etat.preferences = message.preferences;
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
      structure.demander();
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
    case 'declaration':
      etat.architecture = message.architecture;
      return;
    case 'non-construit':
      return;
    case 'composant':
      vueComposant.recevoirLecture(message.demande, message.lecture);
      return;
    case 'apercu-du-composant':
      vueComposant.recevoirApercu(message);
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

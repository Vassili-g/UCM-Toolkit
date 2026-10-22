/**
 * La coquille de l'écran d'UCM Nomenclature : l'en-tête du socle, les trois
 * onglets, les écrans de lecture et de premier lancement, la page
 * Configuration et le bandeau du fichier modifié. Elle relie la frontière à
 * l'état et l'état au DOM. Les lots d'onglet reçoivent la coquille et montent
 * leur contenu dans ses conteneurs.
 */
import { createBackButton, createSettingsButton, montrerConfiguration, montrerTravail, type ElementsDeBascule } from 'ucm-plugin-socle/src/ui/EnTete';
import { createOnglets } from 'ucm-plugin-socle/src/ui/Onglets';
import { createResizeGrip } from 'ucm-plugin-socle/src/ui/ResizeGrip';
import type { UiMessage } from '../../messages/nomenclature';
import { ETAT_INITIAL, etatSuivant, type EtatDeLEcran, type Onglet } from './etat';
import { creerFrontiere, type Frontiere, type MessageAAfficher } from './frontiere';
import { creerBandeau, creerPanneau, creerVueDAnalyse, type Panneau } from './panneaux';
import { TEXTES } from '../textes/nomenclature';

/** Reçoit chaque message que la frontière rend, après la mise à jour de l'état. */
export type Ecouteur = (message: MessageAAfficher, etat: EtatDeLEcran) => void;

export interface Coquille {
  readonly frontiere: Frontiere;
  readonly panneaux: { readonly aAppliquer: Panneau; readonly aTrancher: Panneau; readonly regles: Panneau };
  /** Le conteneur du premier lancement : l'invitation à analyser, puis la carte de l'écriture. */
  readonly premierLancement: HTMLElement;
  /** Le conteneur de la page Configuration. */
  readonly configuration: HTMLElement;
  etat(): EtatDeLEcran;
  /** Rend la fonction qui retire l'écouteur. */
  abonner(ecouteur: Ecouteur): () => void;
  choisirOnglet(onglet: Onglet): void;
  /** Ouvre l'onglet À appliquer, puis appelle le rappel de `surCarteDemandee` avec la clé du groupe à déplier. */
  demanderUneCarte(cle: string): void;
  /** Branche le dépliage d'une carte de À appliquer. */
  surCarteDemandee(rappel: (cle: string) => void): void;
}

interface CompteDOnglet {
  readonly bouton: HTMLElement;
  readonly pastille: HTMLElement;
  readonly nom: (nombre: number) => string;
}

/** `poignee: false` quand l'hôte a déjà la sienne : la poignée d'Architect règle la fenêtre entière. */
export interface OptionsDeCoquille { readonly poignee?: boolean }

export function creerCoquille(app: HTMLElement, envoyer: (message: UiMessage) => void, options: OptionsDeCoquille = {}): Coquille {
  app.replaceChildren();
  app.className = 'container';

  let etat = ETAT_INITIAL;
  let prete = false;
  const ecouteurs = new Set<Ecouteur>();
  let deplierUneCarte: (cle: string) => void = () => {};

  function appliquerLEtat(suivant: EtatDeLEcran): boolean {
    if (suivant === etat) return false;
    etat = suivant;
    rendre();
    return true;
  }

  function traiter(message: MessageAAfficher): void {
    appliquerLEtat(etatSuivant(etat, message));
    for (const ecouteur of [...ecouteurs]) ecouteur(message, etat);
    // Un fichier déjà analysé relance sa lecture à l'ouverture.
    if (message.type === 'initial' && message.dejaAnalyse) frontiere.analyser();
  }

  const frontiere = creerFrontiere({ envoyer, afficher: traiter });
  const relancer = (): void => {
    frontiere.analyser();
  };

  const titre = document.createElement('h1');
  titre.className = 'page-title';
  titre.textContent = TEXTES.marque;
  const boutonConfiguration = createSettingsButton(ouvrirLaConfiguration, {
    etiquette: TEXTES.ouvrirLaConfiguration,
    infobulle: TEXTES.ouvrirLaConfiguration,
    texte: TEXTES.boutonConfiguration,
  });
  const boutonRetour = createBackButton(fermerLaConfiguration, TEXTES.retour);
  const ligneDuHaut = document.createElement('div');
  ligneDuHaut.className = 'header-topline';
  ligneDuHaut.append(titre, boutonConfiguration, boutonRetour);
  const enTete = document.createElement('div');
  enTete.className = 'header';
  enTete.append(ligneDuHaut);

  const panneaux = {
    aAppliquer: creerPanneau({ etats: ['rien-a-faire', 'sans-variable-locale'], relancer }),
    aTrancher: creerPanneau({ etats: ['rien-a-faire', 'sans-variable-locale'], relancer }),
    regles: creerPanneau({ etats: ['sans-variable-locale'], relancer }),
  };
  const onglets = createOnglets<Onglet>(TEXTES.etiquetteDesOnglets, [
    { id: 'a-appliquer', libelle: TEXTES.ongletAAppliquer, panneau: panneaux.aAppliquer.element },
    { id: 'a-trancher', libelle: TEXTES.ongletATrancher, panneau: panneaux.aTrancher.element },
    { id: 'regles', libelle: TEXTES.ongletRegles, panneau: panneaux.regles.element },
  ], (id) => {
    if (prete) appliquerLEtat(etatSuivant(etat, { type: 'onglet-choisi', onglet: id }));
  });

  /** Le compte d'un onglet est une pastille ajoutée à son bouton ; sans compte, elle se masque. */
  function lierLeCompte(onglet: Onglet, nom: CompteDOnglet['nom']): CompteDOnglet {
    const bouton = onglets.liste.querySelector<HTMLElement>(`#onglet-${onglet}`) as HTMLElement;
    const pastille = document.createElement('span');
    pastille.className = 'compte';
    pastille.setAttribute('aria-hidden', 'true');
    pastille.hidden = true;
    bouton.append(pastille);
    return { bouton, pastille, nom };
  }
  const compteAAppliquer = lierLeCompte('a-appliquer', TEXTES.nomDeLOngletAAppliquer);
  const compteATrancher = lierLeCompte('a-trancher', TEXTES.nomDeLOngletATrancher);

  function poserLeCompte({ bouton, pastille, nom }: CompteDOnglet, nombre: number): void {
    pastille.hidden = nombre === 0;
    pastille.textContent = String(nombre);
    if (nombre === 0) bouton.removeAttribute('aria-label');
    else bouton.setAttribute('aria-label', nom(nombre));
  }

  const premierLancement = document.createElement('div');
  premierLancement.className = 'page-stack';
  const vueDAnalyse = creerVueDAnalyse();
  const bandeau = creerBandeau(relancer);
  const ecranDesOnglets = document.createElement('div');
  ecranDesOnglets.className = 'page-stack';
  ecranDesOnglets.append(onglets.liste, panneaux.aAppliquer.element, panneaux.aTrancher.element, panneaux.regles.element);
  const travail = document.createElement('div');
  travail.className = 'page-stack';
  travail.append(bandeau, premierLancement, vueDAnalyse.element, ecranDesOnglets);
  const configuration = document.createElement('div');
  configuration.className = 'page-stack';
  configuration.hidden = true;

  const bascule: ElementsDeBascule = { travail, configuration, settingsButton: boutonConfiguration, backButton: boutonRetour };

  /** Le défilement et le focus de l'écran de travail, que le retour de la Configuration rend. */
  let pointDeLecture: { defilement: number; focus: HTMLElement | null } | null = null;

  function ouvrirLaConfiguration(): void {
    pointDeLecture = { defilement: document.scrollingElement?.scrollTop ?? 0, focus: document.activeElement as HTMLElement | null };
    appliquerLEtat(etatSuivant(etat, { type: 'configuration-ouverte' }));
  }

  function fermerLaConfiguration(): void {
    appliquerLEtat(etatSuivant(etat, { type: 'configuration-fermee' }));
    const point = pointDeLecture;
    pointDeLecture = null;
    if (!point) return;
    if (document.scrollingElement) document.scrollingElement.scrollTop = point.defilement;
    if (point.focus?.isConnected && point.focus !== document.body) point.focus.focus({ preventScroll: true });
  }

  function rendre(): void {
    const enConfiguration = etat.ecran === 'configuration';
    titre.textContent = enConfiguration ? TEXTES.titreConfiguration : TEXTES.marque;
    if (enConfiguration) montrerConfiguration(bascule);
    else montrerTravail(bascule);

    premierLancement.hidden = etat.ecranDeTravail !== 'premier-lancement';
    vueDAnalyse.element.hidden = etat.ecranDeTravail !== 'lecture';
    ecranDesOnglets.hidden = etat.ecranDeTravail !== 'travail';
    bandeau.hidden = !etat.fichierModifie || etat.ecranDeTravail === 'lecture';
    if (etat.analyse) vueDAnalyse.poser(etat.analyse.lues, etat.analyse.total);

    poserLeCompte(compteAAppliquer, etat.comptes.aAppliquer);
    poserLeCompte(compteATrancher, etat.comptes.aTrancher);
    for (const panneau of [panneaux.aAppliquer, panneaux.aTrancher, panneaux.regles]) panneau.poserEtat(etat.particulier);
    if (onglets.actif() !== etat.onglet) onglets.selectionner(etat.onglet);
  }

  app.append(enTete, travail, configuration, ...(options.poignee === false ? [] : [createResizeGrip(envoyer)]));
  prete = true;
  rendre();

  return {
    frontiere,
    panneaux,
    premierLancement,
    configuration,
    etat: () => etat,
    abonner(ecouteur) {
      ecouteurs.add(ecouteur);
      return () => {
        ecouteurs.delete(ecouteur);
      };
    },
    choisirOnglet: (onglet) => {
      appliquerLEtat(etatSuivant(etat, { type: 'onglet-choisi', onglet }));
    },
    demanderUneCarte(cle) {
      appliquerLEtat(etatSuivant(etat, { type: 'carte-demandee', cle }));
      deplierUneCarte(cle);
    },
    surCarteDemandee(rappel) {
      deplierUneCarte = rappel;
    },
  };
}

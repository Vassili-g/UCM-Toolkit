/**
 * La coquille de l'écran de renommage : les deux onglets (Constats, Règles), la
 * puce du filtre de l'arbre, les écrans de lecture et de premier lancement, la
 * page Configuration et le bandeau du fichier modifié. L'en-tête du socle ne se
 * montre que dans la Configuration : la barre d'Architect ouvre celle-ci. Elle
 * relie la frontière à l'état et l'état au DOM. Les lots d'onglet reçoivent la
 * coquille et montent leur contenu dans ses conteneurs.
 *
 * L'onglet Constats range les cartes par catégorie (`tokens/panneau.ts`). Son
 * identifiant reste `a-appliquer`, celui de l'onglet Corrections qu'il remplace.
 * `panneaux.aTrancher`, `panneaux.aAppliquer` et `panneaux.remises` ne sont plus
 * des onglets : leur contenu est le corps de la section Noms.
 */
import { createBackButton, createSettingsButton, montrerConfiguration, montrerTravail, type ElementsDeBascule } from 'ucm-plugin-socle/src/ui/EnTete';
import { creerPuceFiltre } from 'ucm-plugin-socle/src/ui/Filtre';
import { creerAlerte, creerLienExterne } from 'ucm-plugin-socle/src/ui/Alerte';
import { createOnglets } from 'ucm-plugin-socle/src/ui/Onglets';
import { createResizeGrip } from 'ucm-plugin-socle/src/ui/ResizeGrip';
import type { UiMessage } from '../../messages/nomenclature';
import { ETAT_INITIAL, etatSuivant, type EtatDeLEcran, type Onglet } from './etat';
import { creerFrontiere, type Frontiere, type MessageAAfficher } from './frontiere';
import { creerBandeau, creerPanneau, creerVueDAnalyse, type Panneau } from './panneaux';
import { TEXTES } from '../textes/nomenclature';
import { TEXTES_BIBLIOTHEQUE } from '../textes/bibliotheque';
import { TEXTES_TOKENS } from '../textes/tokens';
import { SANS_RENOMMAGES, type PontDesRenommages } from '../tokens/cochage';
import { monterLePanneauDesTokens, type PanneauDesTokens } from '../tokens/panneau';

/** Reçoit chaque message que la frontière rend, après la mise à jour de l'état. */
export type Ecouteur = (message: MessageAAfficher, etat: EtatDeLEcran) => void;

/** La collection que l'arbre a choisie : elle filtre les onglets qui parlent des noms d'un fichier. */
export interface FiltreDeCollection { readonly id: string; readonly nom: string }

/** La library dont le fichier tire ses variables : ses onglets de renommage sont grisés, et l'alerte dit où les renommer. */
export interface LibraryAffichee {
  readonly nom: string;
  /** Ouvre le fichier des tokens ; `null` tant que sa clé est inconnue. */
  readonly ouvrir: (() => void) | null;
}

export interface Coquille {
  readonly frontiere: Frontiere;
  /**
   * `constats` est l'onglet ; `aTrancher` (les questions), `aAppliquer` (les renommages) et `remises` (« Plus tard » et « Autres pistes »)
   * sont les conteneurs que le panneau attache dans la section Noms, dans cet ordre.
   */
  readonly panneaux: { readonly constats: Panneau; readonly aAppliquer: Panneau; readonly aTrancher: Panneau; readonly remises: Panneau; readonly regles: Panneau };
  /** Le sommaire et les sections de l'onglet Constats ; le domaine structure y monte ses cartes. */
  readonly tokens: PanneauDesTokens;
  /** Le pied de l'écran des onglets, sous le panneau de l'onglet ouvert : le lien du rapport d'analyse. */
  readonly pied: HTMLElement;
  /** Le conteneur du premier lancement : l'invitation à analyser, puis la carte de l'écriture. */
  readonly premierLancement: HTMLElement;
  /** Le conteneur de la page Configuration. */
  readonly configuration: HTMLElement;
  /** Affiche une préparation en attente au-dessus des onglets du mode Tokens. */
  poserAlerteDePreparation(alerte: HTMLElement | null): void;
  etat(): EtatDeLEcran;
  /**
   * Relance l'analyse des noms sans écran de lecture, quand un bilan est déjà là ; le `bilan` neuf remplace l'ancien. Rend faux, sans rien
   * envoyer, tant que le fichier n'a pas de bilan : le premier lancement attend le geste du designer.
   */
  rafraichir(): boolean;
  /** Ouvre la page Configuration. */
  ouvrirLaConfiguration(): void;
  /** Revient au travail depuis Configuration. */
  fermerLaConfiguration(): void;
  /** Le filtre de l'arbre, `null` quand aucune collection ne filtre. */
  filtre(): FiltreDeCollection | null;
  /** Sans effet : l'onglet Constats compte des cartes, que le filtre de l'arbre ne change pas. */
  poserLeCompteDesCorrections(nombre: number | null): void;
  poserLeFiltre(filtre: FiltreDeCollection | null): void;
  /** Les règles que le mode Composant a préparées s'ajoutent aux questions de Noms. */
  poserLeCompteDesReglesRecues(nombre: number): void;
  /** Grise Constats, montre l'alerte de la library et ouvre Règles ; `null` rend les onglets. */
  poserLaLibrary(library: LibraryAffichee | null): void;
  /** Appelle le rappel à chaque changement de filtre ou d'état local (onglet, carte demandée) ; rend la fonction qui le retire. */
  surChangement(rappel: () => void): () => void;
  /** Rend la fonction qui retire l'écouteur. */
  abonner(ecouteur: Ecouteur): () => void;
  choisirOnglet(onglet: Onglet): void;
  /** Ouvre l'onglet Constats, puis appelle le rappel de `surCarteDemandee` avec la clé du groupe à déplier. */
  demanderUneCarte(cle: string): void;
  /** Branche le dépliage d'une carte de renommage. */
  surCarteDemandee(rappel: (cle: string) => void): void;
  /** Les renommages tels que le pied commun les voit ; `SANS_RENOMMAGES` tant que l'onglet des renommages n'est pas monté. */
  renommages(): PontDesRenommages;
  /** Branche le pont des renommages : leurs cases, leur compte et leur écriture. */
  lierLesRenommages(pont: PontDesRenommages): void;
  /** Écrit un texte dans la recherche de l'arbre, comme une recherche tapée. Sans hôte qui la porte, ne fait rien. */
  rechercher(texte: string): void;
  /** Filtre le tableau sur un terme, avec les formes que la fiche du terme énumère. */
  rechercherLeTerme(mot: string, formes: readonly string[]): void;
}

interface CompteDOnglet {
  readonly bouton: HTMLElement;
  readonly pastille: HTMLElement;
  readonly nom: (nombre: number) => string;
}

/** `poignee: false` quand l'hôte a déjà la sienne : la poignée d'Architect règle la fenêtre entière. */
export interface OptionsDeCoquille {
  readonly poignee?: boolean;
  /** Le geste de la croix de la puce du filtre. */
  readonly enleverLeFiltre?: () => void;
  /** Les liens qui écrivent dans la recherche de l'arbre. */
  readonly rechercher?: (texte: string) => void;
  readonly rechercherLeTerme?: (mot: string, formes: readonly string[]) => void;
}

/** Le lien du socle, à la taille d'un bouton texte comme les autres liens de la barre latérale. */
function lienDeLaLibrary(nom: string, ouvrir: () => void): HTMLButtonElement {
  const lien = creerLienExterne(TEXTES_BIBLIOTHEQUE.ouvrirLeFichierDesTokens(nom), ouvrir);
  lien.classList.add('btn-texte');
  return lien;
}

export function creerCoquille(app: HTMLElement, envoyer: (message: UiMessage) => void, options: OptionsDeCoquille = {}): Coquille {
  app.replaceChildren();
  app.className = 'container';

  let etat = ETAT_INITIAL;
  let prete = false;
  const ecouteurs = new Set<Ecouteur>();
  const surChangements = new Set<() => void>();
  let filtre: FiltreDeCollection | null = null;
  let reglesRecues = 0;
  let libraryAffichee = false;
  let deplierUneCarte: (cle: string) => void = () => {};
  let renommages: PontDesRenommages = SANS_RENOMMAGES;

  function appliquerLEtat(suivant: EtatDeLEcran): boolean {
    if (suivant === etat) return false;
    etat = suivant;
    rendre();
    return true;
  }

  function traiter(message: MessageAAfficher): void {
    appliquerLEtat(etatSuivant(etat, message));
    // Un message qui remet l'écran à zéro rend le premier onglet : la library ne garde que Règles.
    if (libraryAffichee && etat.onglet !== 'regles') appliquerLEtat(etatSuivant(etat, { type: 'onglet-choisi', onglet: 'regles' }));
    for (const ecouteur of [...ecouteurs]) ecouteur(message, etat);
    // Un fichier déjà analysé relance sa lecture à l'ouverture.
    if (message.type === 'initial' && message.dejaAnalyse) frontiere.analyser();
    if (message.type === 'bilan') bilanRecu = true;
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
    constats: creerPanneau({ etats: ['sans-variable-locale'] }),
    aAppliquer: creerPanneau({ etats: [] }),
    aTrancher: creerPanneau({ etats: [] }),
    remises: creerPanneau({ etats: [] }),
    regles: creerPanneau({ etats: [] }),
  };
  // Dans la section Noms, « Aucune question » n'a plus de sens : la section dit déjà ce qu'elle contient (`nomenclature.css`).
  panneaux.aTrancher.contenu.classList.add('questions-de-noms');
  const tokens = monterLePanneauDesTokens({
    racine: panneaux.constats.contenu,
    nomenclature: { questions: panneaux.aTrancher.contenu, renommages: panneaux.aAppliquer.contenu, remises: panneaux.remises.contenu },
    auChangement: () => rendre(),
  });
  const onglets = createOnglets<Onglet>(TEXTES.etiquetteDesOnglets, [
    { id: 'a-appliquer', libelle: TEXTES_TOKENS.ongletConstats, panneau: panneaux.constats.element },
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
  const compteDesConstats = lierLeCompte('a-appliquer', TEXTES_TOKENS.nomDeLOngletConstats);

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
  const ligneDuFiltre = document.createElement('div');
  ligneDuFiltre.className = 'filtre-ligne';
  ligneDuFiltre.hidden = true;
  const alerteDeLaLibrary = document.createElement('div');
  alerteDeLaLibrary.hidden = true;
  const alerteDePreparation = document.createElement('div');
  alerteDePreparation.hidden = true;
  const pied = document.createElement('div');
  ecranDesOnglets.append(alerteDeLaLibrary, alerteDePreparation, onglets.liste, ligneDuFiltre, panneaux.constats.element, panneaux.regles.element, pied);
  const travail = document.createElement('div');
  travail.className = 'page-stack';
  travail.append(bandeau, premierLancement, vueDAnalyse.element, ecranDesOnglets);
  const configuration = document.createElement('div');
  configuration.className = 'page-stack';
  configuration.hidden = true;

  const bascule: ElementsDeBascule = { travail, configuration, settingsButton: boutonConfiguration, backButton: boutonRetour };

  /** Le défilement et le focus de l'écran de travail, que le retour de la Configuration rend. */
  let pointDeLecture: { defilement: number; focus: HTMLElement | null } | null = null;

  let bilanRecu = false;
  function ouvrirLaConfiguration(): void {
    // Le switch de la déclaration attend le bilan : un fichier jamais analysé le demande ici.
    if (!bilanRecu) frontiere.analyser();
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

  /** La puce du filtre se montre sous Constats, où elle restreint les renommages de Noms ; les règles valent pour tout le fichier. */
  function rendreLeFiltre(): void {
    ligneDuFiltre.hidden = filtre === null || etat.onglet === 'regles';
    if (filtre === null) return;
    ligneDuFiltre.replaceChildren(TEXTES.filtre, creerPuceFiltre(TEXTES.filtreCollection, filtre.nom, TEXTES.enleverLeFiltre, options.enleverLeFiltre));
  }

  function rendre(): void {
    const enConfiguration = etat.ecran === 'configuration';
    enTete.hidden = !enConfiguration;
    rendreLeFiltre();
    titre.textContent = enConfiguration ? TEXTES.titreConfiguration : TEXTES.marque;
    if (enConfiguration) montrerConfiguration(bascule);
    else montrerTravail(bascule);

    premierLancement.hidden = etat.ecranDeTravail !== 'premier-lancement';
    vueDAnalyse.element.hidden = etat.ecranDeTravail !== 'lecture';
    ecranDesOnglets.hidden = etat.ecranDeTravail !== 'travail';
    bandeau.hidden = !etat.fichierModifie || etat.ecranDeTravail === 'lecture';
    if (etat.analyse) vueDAnalyse.poser(etat.analyse.lues, etat.analyse.total);

    tokens.poser({ bilan: etat.bilan, reglesRecues });
    // L'onglet grisé d'une library ne compte rien : il ne peut rien écrire ici.
    poserLeCompte(compteDesConstats, libraryAffichee ? 0 : tokens.total());
    for (const panneau of [panneaux.constats, panneaux.regles]) panneau.poserEtat(etat.particulier);
    if (onglets.actif() !== etat.onglet) onglets.selectionner(etat.onglet);
    for (const rappel of [...surChangements]) rappel();
  }

  app.append(enTete, travail, configuration, ...(options.poignee === false ? [] : [createResizeGrip(envoyer)]));
  prete = true;
  rendre();

  return {
    frontiere,
    panneaux,
    tokens,
    pied,
    premierLancement,
    configuration,
    etat: () => etat,
    rafraichir() {
      if (etat.bilan === null) return false;
      frontiere.rafraichir();
      return true;
    },
    ouvrirLaConfiguration,
    fermerLaConfiguration,
    poserAlerteDePreparation(alerte) {
      alerteDePreparation.replaceChildren(...(alerte ? [alerte] : []));
      alerteDePreparation.hidden = alerte === null;
    },
    filtre: () => filtre,
    poserLeCompteDesCorrections() {},
    poserLeCompteDesReglesRecues(nombre) {
      if (nombre === reglesRecues) return;
      reglesRecues = nombre;
      rendre();
    },
    poserLaLibrary(suivante) {
      libraryAffichee = suivante !== null;
      alerteDeLaLibrary.hidden = suivante === null;
      alerteDeLaLibrary.replaceChildren(...(suivante === null ? [] : [creerAlerte('info', {
        titre: TEXTES_BIBLIOTHEQUE.alerteDeLaLibrary(suivante.nom),
        texte: TEXTES_BIBLIOTHEQUE.alerteRenommer,
        actions: suivante.ouvrir === null ? [] : [lienDeLaLibrary(suivante.nom, suivante.ouvrir)],
      })]));
      onglets.definirDisponible('a-appliquer', suivante === null);
      if (suivante !== null) appliquerLEtat(etatSuivant(etat, { type: 'onglet-choisi', onglet: 'regles' }));
      rendre();
    },
    poserLeFiltre(suivant) {
      if (suivant?.id === filtre?.id && suivant?.nom === filtre?.nom) return;
      filtre = suivant;
      rendre();
    },
    surChangement(rappel) {
      surChangements.add(rappel);
      return () => {
        surChangements.delete(rappel);
      };
    },
    abonner(ecouteur) {
      ecouteurs.add(ecouteur);
      return () => {
        ecouteurs.delete(ecouteur);
      };
    },
    choisirOnglet: (onglet) => {
      // Une ligne de résultat peut avoir paru dans Noms avant ce geste, sans qu'aucun message ne redessine le panneau.
      tokens.rafraichir();
      appliquerLEtat(etatSuivant(etat, { type: 'onglet-choisi', onglet }));
    },
    demanderUneCarte(cle) {
      appliquerLEtat(etatSuivant(etat, { type: 'carte-demandee', cle }));
      deplierUneCarte(cle);
    },
    surCarteDemandee(rappel) {
      deplierUneCarte = rappel;
    },
    renommages: () => renommages,
    lierLesRenommages(pont) {
      renommages = pont;
    },
    rechercher: (texte) => options.rechercher?.(texte),
    rechercherLeTerme: (mot, formes) => options.rechercherLeTerme?.(mot, formes),
  };
}

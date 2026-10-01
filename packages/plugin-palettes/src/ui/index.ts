/**
 * Point d'entrée de l'interface d'UCM Palettes : l'en-tête du socle, les
 * onglets Création, Vérification et Gestion, et la configuration derrière
 * l'engrenage ([UI-02]).
 */
import { jsonCanonique, recetteParDefaut, type Recette } from 'ucm-couleur';
import { montrerConfiguration, montrerTravail, type ElementsDeBascule } from 'ucm-plugin-socle/src/ui/EnTete';
import { createResizeGrip } from 'ucm-plugin-socle/src/ui/ResizeGrip';

import type { GroupeDeConfiguration } from '../configuration';
import { LANGUES, resoudreLangue } from '../i18n/langues';
import { lireLImport } from '../importation';
import type { PluginMessage } from '../messages';
import { resoudreVue, type VueDeGestion } from '../preferences';
import { consequenceDeLImport } from '../planche/fraicheur';
import { ecartsDePeinture, type EcartDePeinture } from '../planche/peints';
import { CIBLES_COMMUNES, type CibleDAction } from '../presentation';
import { rapportDeLaRecette } from '../rapport';
import { creerVuesBarreDePalette } from './barreDePalette';
import { creerVuesConfiguration } from './configuration';
import { creerVuesDessin, type GestesDuResultat } from './dessin';
import { createFrontiere } from './frontiere';
import { creerVuesGestesDeLaRecette, type DemandesDeLaRecette } from './gestesDeLaRecette';
import { creerLocalisation, type Localisation } from './localisation';
import { creerVuesOngletCreation } from './ongletCreation';
import { creerVuesOngletGestion } from './ongletGestion';
import { creerVuesOngletVerification } from './ongletVerification';
import { creerPaletteOuverte } from './paletteOuverte';
import { versSandbox } from './pont';
import { creerSocleLocalise } from './socleLocalise';
import { telecharger } from './telechargement';

export function creerVuesIndex(i18n: Localisation, vue: VueDeGestion) {
  const { createBackButton, createButton, createSettingsButton, createOnglets } = creerSocleLocalise(i18n);
  const { createBarreDePalette } = creerVuesBarreDePalette(i18n);
  const { createConfiguration } = creerVuesConfiguration(i18n);
  const { createSuiviDuDessin } = creerVuesDessin(i18n);
  const { createGestesDeLaRecette } = creerVuesGestesDeLaRecette(i18n);
  const { createOngletCreation } = creerVuesOngletCreation(i18n);
  const { createOngletGestion } = creerVuesOngletGestion(i18n);
  const { createOngletVerification } = creerVuesOngletVerification(i18n);
  const { TEXTES, nomDeLaPalette } = i18n.messages;

  /** `index.html` déclare ce conteneur ; `tests/buildUi.test.ts` tient le gabarit. */
  const app = document.getElementById('app') as HTMLElement;
  app.replaceChildren();

  app.className = 'container';

  const titre = document.createElement('h1');

  titre.className = 'page-title';

  i18n.lier(titre, 'textContent', TEXTES.titre);

  /** Le groupe des Réglages communs qu'une cible d'action ouvre ([VER-15]). */
  const GROUPE_DE_LA_CIBLE: Partial<Record<CibleDAction, GroupeDeConfiguration>> = {
    'luminosite-commune': 'courbes',
    fonds: 'fonds',
    'intensites-communes': 'parts',
  };

  const settingsButton = createSettingsButton(ouvrirConfiguration, { etiquette: TEXTES.ouvrirLesReglages, infobulle: TEXTES.reglagesCommuns });

  const backButton = createBackButton(ouvrirTravail, TEXTES.retour);


  const enTete = document.createElement('div');

  enTete.className = 'header';

  const ligneDuHaut = document.createElement('div');

  ligneDuHaut.className = 'header-topline';

  ligneDuHaut.append(titre, settingsButton, backButton);

  enTete.append(ligneDuHaut);

  const frontiere = createFrontiere(versSandbox, (statut, refus) => {
    ongletCreation.poserStatut(statut, refus);
    ongletGestion.bloquer(statut === 'refuse' ? TEXTES.conflitEnCours : null);
    // Une recette rangée peut périmer des cadres ([PLA-20]).
    if (statut === 'range') afficherLaPlanche();
  });

  // Un dessin fini a posé des cadres : l'état relu dit lesquels à l'onglet Palettes.
  const suivi = createSuiviDuDessin(frontiere, () => frontiere.lireLEtat(), (resultat) => {
    const recette = ongletCreation.recette();
    return resultat.issue === 'dessinee' && recette ? ecartsDePeinture(recette, resultat.peints) : [];
  });

  const gestesDuResultat: GestesDuResultat = {
    voirSurLaPlanche: (page, cadres) => frontiere.voirSurLaPlanche(page, cadres),
    reessayer: () => suivi.reessayer(),
    recharger: () => frontiere.lireLEtat(),
    confirmerEtrangers: () => suivi.confirmerEtrangers(),
    renoncer: () => suivi.renoncer(),
  };

  /**
   * Le texte qu'exporte « Exporter la recette » ([REC-07]) : la recette que
   * l'aperçu montre, en JSON canonique ; une recette illisible ou future
   * s'exporte telle qu'elle est rangée ([REC-11]).
   */
  function texteAExporter(): string {
    const classement = dernierEtat?.classement;
    if (dernierEtat && (classement?.etat === 'future' || classement?.etat === 'illisible')) return dernierEtat.texte;
    return jsonCanonique(ongletCreation.recette() ?? recetteParDefaut());
  }

  /**
   * Une recette importée, ou la recette par défaut, remplace celle du fichier.
   * L'onglet Palettes la relit au rangement qui suit : son dernier état cesse
   * d'être illisible.
   */
  function remplacerLaRecette(recette: Recette): void {
    ongletCreation.importer(recette);
    if (dernierEtat) dernierEtat = { ...dernierEtat, classement: { etat: 'courante', recette } };
    panneauDeConfiguration.afficher();
  }

  /** Les écarts de peinture du dernier dessin, que le rapport reprend (L6.14). */
  let ecartsDuDernierDessin: readonly EcartDePeinture[] | null = null;

  const demandesDeLaRecette: DemandesDeLaRecette = {
    exporter: () => telecharger('palettes-et-reglages.json', texteAExporter()),
    exporterLeRapport() {
      const recette = ongletCreation.recette();
      if (!recette) return;
      const rapport = rapportDeLaRecette(recette, frontiere.empreinte(), dernierEtat?.profil ?? 'SRGB', ecartsDuDernierDessin);
      telecharger('rapport-palettes.json', JSON.stringify(rapport, null, 2));
    },
    lire: (texte) => lireLImport(texte, ongletCreation.recette()),
    remplacer: remplacerLaRecette,
    recetteParDefaut,
    consequence(importee) {
      const actuelle = ongletCreation.recette();
      if (!actuelle || !dernierEtat) return null;
      const { aMettreAJour, orphelins } = consequenceDeLImport(actuelle, importee, dernierEtat.profil, dernierEtat.planche);
      return { aMettreAJour: aMettreAJour.map(nomDeLaPalette), orphelins: orphelins.map(nomDeLaPalette) };
    },
  };

  /** La recette affichée et la palette ouverte, que les onglets partagent ([UI-23]). */
  const paletteOuverte = creerPaletteOuverte();

  // La barre de la palette n'existe qu'une fois : l'onglet Création porte ses gestes.
  const barre = createBarreDePalette({
    choisir: (id) => ongletCreation.gestesDeLaBarre.choisir(id),
    // La création s'ouvre dans Création : depuis Vérification, l'onglet change d'abord.
    nouvelle() {
      onglets.selectionner('creation');
      ongletCreation.gestesDeLaBarre.nouvelle();
    },
    agir: (geste) => ongletCreation.gestesDeLaBarre.agir(geste),
    supprimer: () => ongletCreation.gestesDeLaBarre.supprimer(),
  });

  const ongletCreation = createOngletCreation({
    ranger: (recette) => frontiere.ranger(recette),
    recharger: () => frontiere.lireLEtat(),
    exporterLeBrouillon: () => demandesDeLaRecette.exporter(),
    tirer: () => crypto.getRandomValues(new Uint32Array(1))[0],
    recetteEnFichier: createGestesDeLaRecette(demandesDeLaRecette),
    ouvrirReglages(cible) {
      ouvrirConfiguration();
      panneauDeConfiguration.focaliser(GROUPE_DE_LA_CIBLE[cible] ?? 'courbes');
    },
    verifier: () => allerA('verification'),
    choisirGarantie(association) {
      allerA('verification');
      ongletVerification.choisirGarantie(association);
    },
  }, paletteOuverte, barre);

  const ongletVerification = createOngletVerification(paletteOuverte, barre, {
    // Un réglage de Création s'ouvre dans Création ; un réglage commun garde l'onglet, où le retour ramène ([VER-15]).
    ouvrir(cible) {
      if (!CIBLES_COMMUNES.includes(cible)) onglets.selectionner('creation');
      ongletCreation.ouvrir(cible);
    },
    versCreation: () => allerA('creation'),
    versGestion: () => allerA('gestion'),
    mode: () => ongletCreation.theme.mode(),
    choisirLeTheme: (mode) => ongletCreation.theme.choisir(mode),
    montrerLeTheme: (mode) => ongletCreation.theme.montrer(mode),
    themeDAvant: () => ongletCreation.theme.dAvant(),
    revenirAuTheme: () => ongletCreation.theme.revenir(),
  });

  const ongletGestion = createOngletGestion({
    ...gestesDuResultat,
    dessiner: (palettes, noms) => suivi.dessiner(palettes, noms),
    versLesPalettes: () => allerA('creation'),
    modifier(id, mode) {
      allerA('creation');
      ongletCreation.ouvrirLaPalette(id, mode);
    },
    verifier(id, mode) {
      ongletCreation.ouvrirLaPalette(id, mode);
      allerA('verification');
    },
    synchroniser: () => relireLaPlanche('fichier'),
    choisirLaPage: (page) => frontiere.choisirLaPage(page),
    rangerLaVue: (choisie) => versSandbox({ type: 'ranger-vue', vue: choisie }),
    retirer(palette, cadre) {
      const parti = frontiere.retirer(palette, cadre);
      if (parti) cadreEnRetrait = cadre;
      return parti;
    },
    recetteEnFichier: createGestesDeLaRecette(demandesDeLaRecette),
  }, vue);

  /** Le cadre dont le retrait attend son issue ([PLA-27]). */
  let cadreEnRetrait: string | null = null;

  /**
   * L'issue d'un retrait. Un cadre retiré ou déjà absent quitte l'état connu
   * sans attendre la relecture : un rendu entre-temps, après un rangement, ne
   * remontre pas sa carte. La relecture suit, comme après un dessin.
   */
  function recevoirRetrait(message: Extract<PluginMessage, { type: 'retrait' }>): void {
    const cadre = cadreEnRetrait;
    cadreEnRetrait = null;
    ongletGestion.recevoirRetrait(message.issue);
    const parti = message.issue.issue === 'retire' || message.issue.issue === 'deja-absent';
    if (parti && cadre && dernierEtat) {
      const planche = dernierEtat.planche;
      dernierEtat = { ...dernierEtat, planche: { ...planche, cadres: planche.cadres.filter((lu) => lu.cadre !== cadre) } };
      afficherLaPlanche();
    }
    relireLaPlanche();
  }

  /**
   * Relit l'état pour la planche (V8.7) : à l'accès à l'onglet, et au geste
   * « Synchroniser », qui cherche les cadres sur toutes les pages, pour ce que
   * les événements de Figma ne disent pas. Comme au retour du focus, la
   * relecture attend qu'aucun rangement ne soit en vol.
   */
  function relireLaPlanche(recherche?: 'fichier'): void {
    if (frontiere.auRepos() && frontiere.statut() !== 'refuse') frontiere.lireLEtat(recherche);
  }

  /**
   * Le dernier état accepté : l'onglet Palettes le relit quand on l'ouvre. Sa
   * fraîcheur recalcule le modèle de chaque cadre ; elle ne se calcule que sur
   * l'onglet ouvert.
   */
  let dernierEtat: Extract<PluginMessage, { type: 'etat' }> | null = null;

  /** L'heure du dernier état accepté, que le bloc « Connexion à Figma » écrit en durée ([UI-24]). */
  let dernierEtatLe = Date.now();

  /**
   * Vrai jusqu'au premier état lu, qui choisit l'onglet d'ouverture
   * ([UI-21]) : Gestion quand la recette porte une palette, Création sinon.
   * Aucun état suivant ne change d'onglet.
   */
  let ouverture = true;

  function afficherLaPlanche(): void {
    if (!dernierEtat || onglets.actif() !== 'gestion') return;
    ongletGestion.afficher(dernierEtat.classement, ongletCreation.recette(), dernierEtat.planche, dernierEtat.profil, frontiere.empreinte(), dernierEtatLe);
  }

  /*
   * La barre de la palette suit l'onglet actif, Création ou Vérification
   * ([UI-23]). La recette change dans l'onglet Création : Vérification se rend
   * à son ouverture, et Gestion relit la planche à la sienne.
   */
  const onglets = createOnglets(TEXTES.etiquetteDesOnglets, [
    { id: 'creation', libelle: TEXTES.ongletCreation, panneau: ongletCreation.element },
    { id: 'verification', libelle: TEXTES.ongletVerification, panneau: ongletVerification.element },
    { id: 'gestion', libelle: TEXTES.ongletGestion, panneau: ongletGestion.element },
  ], (id) => {
    if (id === 'creation') ongletCreation.placerLaBarre();
    ongletVerification.montrer(id === 'verification');
    if (id !== 'gestion') return;
    afficherLaPlanche();
    // À l'ouverture du plugin, l'état vient d'être lu : Gestion ne le redemande pas.
    if (!ouverture) relireLaPlanche();
  });

  const PANNEAUX = { creation: ongletCreation.element, verification: ongletVerification.element, gestion: ongletGestion.element };

  /**
   * Change d'onglet par un geste de l'interface, un pied ou un lien : le
   * panneau s'ouvre en haut et prend le focus, que le bouton cliqué vient de
   * perdre en se cachant.
   */
  function allerA(id: keyof typeof PANNEAUX): void {
    onglets.selectionner(id);
    if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
    PANNEAUX[id].focus({ preventScroll: true });
  }

  const travail = document.createElement('div');

  travail.className = 'page-stack colonne';

  travail.append(onglets.liste, ongletCreation.element, ongletVerification.element, ongletGestion.element);

  // Pendant un dessin, les panneaux se figent et la progression se lit ; l'engrenage reste ouvert, pour la langue.
  suivi.abonner((etat) => {
    if (etat.phase === 'fini' && etat.resultat.issue === 'dessinee') ecartsDuDernierDessin = etat.ecarts;
    const enCours = etat.phase === 'en-cours';
    ongletCreation.element.inert = enCours;
    ongletVerification.element.inert = enCours;
    ongletGestion.element.inert = enCours;
    ongletGestion.afficherDessin(etat, suivi.noms());
  });

  const panneauDeConfiguration = createConfiguration({
    lire: () => ongletCreation.recette(),
    ouverte: () => ongletCreation.ouverte(),
    previsualiser: (recette) => ongletCreation.previsualiser(recette),
    appliquer: (recette) => ongletCreation.appliquer(recette),
    cadresAMettreAJour: (proposee) => {
      const actuelle = ongletCreation.recette();
      if (!actuelle || !dernierEtat) return 0;
      return consequenceDeLImport(actuelle, proposee, dernierEtat.profil, dernierEtat.planche).aMettreAJour.length;
    },
  });

  const configuration = panneauDeConfiguration.element;
  const preference = document.createElement('div');
  preference.className = 'champ-colonne';
  const libelleDeLangue = document.createElement('label');
  libelleDeLangue.className = 'libelle-de-champ';
  libelleDeLangue.htmlFor = 'langue-du-plugin';
  i18n.lier(libelleDeLangue, 'textContent', TEXTES.langue);
  preference.append(libelleDeLangue);
  const choixDeLangue = document.createElement('select');
  choixDeLangue.className = 'input';
  choixDeLangue.id = 'langue-du-plugin';
  for (const langue of LANGUES) {
    const option = document.createElement('option');
    option.value = langue.code;
    option.textContent = langue.nom;
    choixDeLangue.append(option);
  }
  choixDeLangue.value = i18n.langue;
  preference.append(choixDeLangue);
  // Un refus du stockage n'empêche rien : la langue choisie vaut pour la session.
  const erreurDePreference = document.createElement('div');
  erreurDePreference.className = 'constat constat-alerte';
  erreurDePreference.setAttribute('role', 'status');
  erreurDePreference.hidden = true;
  const refusDePreference = document.createElement('p');
  refusDePreference.className = 'constat-quoi';
  i18n.lier(refusDePreference, 'textContent', TEXTES.langueNonRangee);
  const reessayerPreference = createButton({ label: TEXTES.reessayerLangue, variant: 'secondary', onClick: rangerLaLangue });
  erreurDePreference.append(refusDePreference, reessayerPreference);
  configuration.prepend(preference, erreurDePreference);
  suivi.abonner((etat) => {
    Array.from(configuration.children).forEach((element) => {
      if (element !== preference && element !== erreurDePreference) (element as HTMLElement).inert = etat.phase === 'en-cours';
    });
  });
  let selectionDeLangue = 0;
  function rangerLaLangue(): void {
    selectionDeLangue += 1;
    erreurDePreference.hidden = true;
    versSandbox({ type: 'ranger-langue', langue: i18n.langue, selection: selectionDeLangue });
  }
  choixDeLangue.addEventListener('change', () => {
    i18n.changer(resoudreLangue(choixDeLangue.value));
    rangerLaLangue();
  });

  configuration.hidden = true;

  function bascule(): ElementsDeBascule {
    return { travail, configuration, settingsButton, backButton };
  }

  /**
   * Le point de lecture de la vue de travail quand les Réglages communs
   * s'ouvrent : le retour y ramène le défilement et rend le focus au geste qui
   * les a ouverts ([VER-15]). La palette, le thème et la nuance choisie restent,
   * leurs éléments n'étant jamais reconstruits.
   */
  let pointDeLecture: { defilement: number; focus: HTMLElement | null; lienDeVerification: number } | null = null;

  function ouvrirConfiguration(): void {
    pointDeLecture = {
      defilement: document.scrollingElement?.scrollTop ?? 0,
      focus: document.activeElement as HTMLElement | null,
      // Un réglage commun changé rend Vérification : son lien se reconstruit, et se retrouve par son rang.
      lienDeVerification: ongletVerification.rangDuLien(document.activeElement),
    };
    panneauDeConfiguration.afficher();
    montrerConfiguration(bascule());
    i18n.lier(titre, 'textContent', TEXTES.titreConfiguration);
  }

  function ouvrirTravail(): void {
    montrerTravail(bascule());
    // Une saisie des Réglages communs a laissé l'onglet en aperçu : il se rend, visible, avant que le défilement revienne.
    ongletCreation.rendreSiDiffere();
    i18n.lier(titre, 'textContent', TEXTES.titre);
    const point = pointDeLecture;
    pointDeLecture = null;
    if (!point) return;
    if (document.scrollingElement) document.scrollingElement.scrollTop = point.defilement;
    if (point.focus?.isConnected && point.focus !== document.body) point.focus.focus({ preventScroll: true });
    else if (point.lienDeVerification >= 0) ongletVerification.focaliserLeLien(point.lienDeVerification);
  }

  const largeurFenetre = document.createElement('div');
  largeurFenetre.className = 'largeur-fenetre';
  largeurFenetre.setAttribute('aria-hidden', 'true');
  const rafraichirLargeurFenetre = () => i18n.lier(largeurFenetre, 'textContent', TEXTES.largeurDeLaFenetre(Math.round(window.innerWidth)));
  rafraichirLargeurFenetre();
  window.addEventListener('resize', rafraichirLargeurFenetre);

  app.append(enTete, travail, configuration, largeurFenetre, createResizeGrip(versSandbox));

  onmessage = (event: MessageEvent<{ pluginMessage?: PluginMessage }>) => {
    const message = event.data.pluginMessage;
    if (!message) return;
    if (message.type === 'langue-rangee') {
      if (message.selection === selectionDeLangue) erreurDePreference.hidden = message.reussie;
      return;
    }
    if (message.type === 'etat' && frontiere.accepterEtat(message)) {
      ongletCreation.afficher(message.classement);
      panneauDeConfiguration.afficher();
      dernierEtat = message;
      dernierEtatLe = Date.now();
      if (ouverture) {
        if ((ongletCreation.recette()?.palettes.length ?? 0) > 0) onglets.selectionner('gestion');
        ouverture = false;
      }
      afficherLaPlanche();
    } else if (message.type === 'rangement') {
      frontiere.recevoirRangement(message);
    } else if (message.type === 'progression' || message.type === 'dessin') {
      suivi.recevoir(message);
    } else if (message.type === 'retrait' && frontiere.accepterRetrait(message)) {
      recevoirRetrait(message);
    } else if (message.type === 'page-choisie' && frontiere.accepterPage(message)) {
      // Une page choisie a pu déplacer des cadres : l'état relu dit où ils sont.
      ongletGestion.recevoirPage(message.issue);
      relireLaPlanche();
    }
  };

  /*
   * Un autre designer, ou un Ctrl+Z dans Figma, a pu changer la recette pendant
   * que la fenêtre n'avait pas le focus (E13). La relecture suit un retour du
   * focus, jamais le premier : l'état vient d'être lu à l'ouverture. Elle attend
   * qu'aucun rangement ne soit en vol, et ne masque pas un refus en cours.
   */
  let focusPerdu = false;

  window.addEventListener('blur', () => {
    focusPerdu = true;
  });

  window.addEventListener('focus', () => {
    if (!focusPerdu) return;
    focusPerdu = false;
    if (frontiere.auRepos() && frontiere.statut() !== 'refuse') frontiere.lireLEtat();
  });

  frontiere.lireLEtat();
}

/*
 * La langue se lit avant le premier rendu : jusque-là, le gabarit d'attente de
 * index.html reste affiché. La première réponse monte l'interface, qui remplace
 * cet écouteur ; une réponse tardive ne la reconstruit donc pas.
 */
onmessage = (event: MessageEvent<{ pluginMessage?: PluginMessage }>) => {
  const message = event.data.pluginMessage;
  if (message?.type !== 'langue') return;
  const i18n = creerLocalisation(resoudreLangue(message.langue));
  i18n.changer(i18n.langue);
  creerVuesIndex(i18n, resoudreVue(message.vue));
};
versSandbox({ type: 'lire-langue' });

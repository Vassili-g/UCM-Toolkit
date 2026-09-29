/**
 * Point d'entrée de l'interface d'UCM Palettes : l'en-tête du socle, deux
 * onglets et la configuration derrière l'engrenage ([UI-02]).
 */
import { jsonCanonique, recetteParDefaut, type Recette } from 'ucm-couleur';
import { montrerConfiguration, montrerTravail, type ElementsDeBascule } from 'ucm-plugin-socle/src/ui/EnTete';
import { createResizeGrip } from 'ucm-plugin-socle/src/ui/ResizeGrip';

import type { GroupeDeConfiguration } from '../configuration';
import { LANGUES, resoudreLangue } from '../i18n/langues';
import { lireLImport } from '../importation';
import type { PluginMessage } from '../messages';
import { consequenceDeLImport } from '../planche/fraicheur';
import { ecartsDePeinture, type EcartDePeinture } from '../planche/peints';
import type { CibleDAction } from '../presentation';
import { rapportDeLaRecette } from '../rapport';
import { creerVuesConfiguration } from './configuration';
import { creerVuesDessin, type GestesDuResultat } from './dessin';
import { createFrontiere } from './frontiere';
import { creerVuesGestesDeLaRecette, type DemandesDeLaRecette } from './gestesDeLaRecette';
import { creerLocalisation, type Localisation } from './localisation';
import { creerVuesOngletPalettes } from './ongletPalettes';
import { creerVuesOngletPlanche } from './ongletPlanche';
import { versSandbox } from './pont';
import { creerSocleLocalise } from './socleLocalise';
import { telecharger } from './telechargement';

export function creerVuesIndex(i18n: Localisation) {
  const { createBackButton, createButton, createSettingsButton, createOnglets } = creerSocleLocalise(i18n);
  const { createConfiguration } = creerVuesConfiguration(i18n);
  const { createSuiviDuDessin } = creerVuesDessin(i18n);
  const { createGestesDeLaRecette } = creerVuesGestesDeLaRecette(i18n);
  const { createOngletPalettes } = creerVuesOngletPalettes(i18n);
  const { createOngletPlanche } = creerVuesOngletPlanche(i18n);
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
    ongletPalettes.poserStatut(statut, refus);
    ongletPlanche.bloquer(statut === 'refuse' ? TEXTES.conflitEnCours : null);
    // Une recette rangée peut périmer des cadres ([PLA-20]).
    if (statut === 'range') afficherLaPlanche();
  });

  // Un dessin fini a posé des cadres : l'état relu dit lesquels à l'onglet Palettes.
  const suivi = createSuiviDuDessin(frontiere, () => frontiere.lireLEtat(), (resultat) => {
    const recette = ongletPalettes.recette();
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
    return jsonCanonique(ongletPalettes.recette() ?? recetteParDefaut());
  }

  /**
   * Une recette importée, ou la recette par défaut, remplace celle du fichier.
   * L'onglet Palettes la relit au rangement qui suit : son dernier état cesse
   * d'être illisible.
   */
  function remplacerLaRecette(recette: Recette): void {
    ongletPalettes.importer(recette);
    if (dernierEtat) dernierEtat = { ...dernierEtat, classement: { etat: 'courante', recette } };
    panneauDeConfiguration.afficher();
  }

  /** Les écarts de peinture du dernier dessin, que le rapport reprend (L6.14). */
  let ecartsDuDernierDessin: readonly EcartDePeinture[] | null = null;

  const demandesDeLaRecette: DemandesDeLaRecette = {
    exporter: () => telecharger('palettes-et-reglages.json', texteAExporter()),
    exporterLeRapport() {
      const recette = ongletPalettes.recette();
      if (!recette) return;
      const rapport = rapportDeLaRecette(recette, frontiere.empreinte(), dernierEtat?.profil ?? 'SRGB', ecartsDuDernierDessin);
      telecharger('rapport-palettes.json', JSON.stringify(rapport, null, 2));
    },
    lire: (texte) => lireLImport(texte, ongletPalettes.recette()),
    remplacer: remplacerLaRecette,
    recetteParDefaut,
    consequence(importee) {
      const actuelle = ongletPalettes.recette();
      if (!actuelle || !dernierEtat) return null;
      const { aMettreAJour, orphelins } = consequenceDeLImport(actuelle, importee, dernierEtat.profil, dernierEtat.planche);
      return { aMettreAJour: aMettreAJour.map(nomDeLaPalette), orphelins: orphelins.map(nomDeLaPalette) };
    },
  };

  const ongletPalettes = createOngletPalettes({
    ranger: (recette) => frontiere.ranger(recette),
    recharger: () => frontiere.lireLEtat(),
    exporterLeBrouillon: () => demandesDeLaRecette.exporter(),
    tirer: () => crypto.getRandomValues(new Uint32Array(1))[0],
    recetteEnFichier: createGestesDeLaRecette(demandesDeLaRecette),
    ouvrirReglages(cible) {
      ouvrirConfiguration();
      panneauDeConfiguration.focaliser(GROUPE_DE_LA_CIBLE[cible] ?? 'courbes');
    },
  });

  const ongletPlanche = createOngletPlanche({
    ...gestesDuResultat,
    dessiner: (palettes, noms) => suivi.dessiner(palettes, noms),
    versLesPalettes: () => onglets.selectionner('palettes'),
    modifier(id, mode) {
      onglets.selectionner('palettes');
      ongletPalettes.ouvrirLaPalette(id, mode);
    },
    actualiser: relireLaPlanche,
    retirer(palette, cadre) {
      const parti = frontiere.retirer(palette, cadre);
      if (parti) cadreEnRetrait = cadre;
      return parti;
    },
    recetteEnFichier: createGestesDeLaRecette(demandesDeLaRecette),
  });

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
    ongletPlanche.recevoirRetrait(message.issue);
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
   * « Actualiser » pour ce que les événements de Figma ne disent pas. Comme au
   * retour du focus, la relecture attend qu'aucun rangement ne soit en vol.
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

  function afficherLaPlanche(): void {
    if (!dernierEtat || onglets.actif() !== 'planche') return;
    ongletPlanche.afficher(dernierEtat.classement, ongletPalettes.recette(), dernierEtat.planche, dernierEtat.profil, frontiere.empreinte());
  }

  // La recette change dans l'onglet Création : l'onglet Palettes la relit à son ouverture.
  const onglets = createOnglets(TEXTES.etiquetteDesOnglets, [
    { id: 'palettes', libelle: TEXTES.ongletPalettes, panneau: ongletPalettes.element },
    { id: 'planche', libelle: TEXTES.ongletPlanche, panneau: ongletPlanche.element },
  ], (id) => {
    if (id !== 'planche') return;
    afficherLaPlanche();
    relireLaPlanche();
  });

  const travail = document.createElement('div');

  travail.className = 'page-stack colonne';

  travail.append(onglets.liste, ongletPalettes.element, ongletPlanche.element);

  // Pendant un dessin, les panneaux se figent et la progression se lit ; l'engrenage reste ouvert, pour la langue.
  suivi.abonner((etat) => {
    if (etat.phase === 'fini' && etat.resultat.issue === 'dessinee') ecartsDuDernierDessin = etat.ecarts;
    const enCours = etat.phase === 'en-cours';
    ongletPalettes.element.inert = enCours;
    ongletPlanche.element.inert = enCours;
    ongletPlanche.afficherDessin(etat, suivi.noms());
  });

  const panneauDeConfiguration = createConfiguration({
    lire: () => ongletPalettes.recette(),
    ouverte: () => ongletPalettes.ouverte(),
    previsualiser: (recette) => ongletPalettes.previsualiser(recette),
    appliquer: (recette) => ongletPalettes.appliquer(recette),
    cadresAMettreAJour: (proposee) => {
      const actuelle = ongletPalettes.recette();
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
  let pointDeLecture: { defilement: number; focus: HTMLElement | null } | null = null;

  function ouvrirConfiguration(): void {
    pointDeLecture = { defilement: document.scrollingElement?.scrollTop ?? 0, focus: document.activeElement as HTMLElement | null };
    panneauDeConfiguration.afficher();
    montrerConfiguration(bascule());
    i18n.lier(titre, 'textContent', TEXTES.titreConfiguration);
  }

  function ouvrirTravail(): void {
    montrerTravail(bascule());
    // Une saisie des Réglages communs a laissé l'onglet en aperçu : il se rend, visible, avant que le défilement revienne.
    ongletPalettes.rendreSiDiffere();
    i18n.lier(titre, 'textContent', TEXTES.titre);
    const point = pointDeLecture;
    pointDeLecture = null;
    if (!point) return;
    if (document.scrollingElement) document.scrollingElement.scrollTop = point.defilement;
    if (point.focus?.isConnected && point.focus !== document.body) point.focus.focus({ preventScroll: true });
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
      ongletPalettes.afficher(message.classement);
      panneauDeConfiguration.afficher();
      dernierEtat = message;
      afficherLaPlanche();
    } else if (message.type === 'rangement') {
      frontiere.recevoirRangement(message);
    } else if (message.type === 'progression' || message.type === 'dessin') {
      suivi.recevoir(message);
    } else if (message.type === 'retrait' && frontiere.accepterRetrait(message)) {
      recevoirRetrait(message);
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
  creerVuesIndex(i18n);
};
versSandbox({ type: 'lire-langue' });

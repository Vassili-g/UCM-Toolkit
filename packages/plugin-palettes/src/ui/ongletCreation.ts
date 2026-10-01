/**
 * L'onglet Création (section 13.2) : le choix ou la création d'une palette.
 * Dans un fichier sans palette, un encart invite à créer la première
 * ([UI-22]). Sans palette choisie, une invitation ([UI-06]) ; avec elle, le titre
 * « Palette [nom] » seul sur sa ligne, puis les cartes :
 * Configuration de la palette, aperçu, Réglage global et Color shift
 * repliables, et l'Interface de test en dernier ([UI-12]). Les messages de
 * la palette se comptent dans le pied, dont « Vérifier » ouvre l'onglet
 * Vérification, où ils se lisent avec les garanties ([UI-18], [VER-18]). La
 * génération appartient à l'onglet Gestion ([UI-05]).
 *
 * Pendant un geste, aucun contrôle ne se déplace ([UI-20]) : un message tient
 * dans une ligne fixe, ou passe au pied.
 *
 * Une saisie recalcule l'aperçu dans l'interface ([ENT-02]). La recette
 * s'enregistre à la fin de chaque geste : valider un champ, relâcher un
 * curseur, créer, dupliquer, réordonner ou supprimer une palette (D-D). Jamais
 * pendant la saisie.
 */
import {
  aUneIntensite,
  cleDuPorteur,
  rampeDe,
  estPaletteGrise,
  partDeLaReference,
  profilAutomatique,
  profilPorteur,
  type Classement,
  type Mode,
  type Palette,
  type Association,
  type Recette,
  type Refus,
} from 'ucm-couleur';

import { analyserPalette } from '../analyse';
import { poserFond } from '../configuration';
import {
  MOTIF_HEXA,
  ajouter,
  basculerNuance,
  changerReference,
  choisirLaBase,
  choisirLesIntensites,
  cransLibresParDefaut,
  deplacer,
  dupliquer,
  nouvelIdentifiant,
  nouvellePalette,
  passerEnLibre,
  remplacerPalette,
  renommer,
  reglerClarte,
  revenirALOriginale,
  revenirAuModele,
  supprimer,
} from '../edition';
import { CIBLES_COMMUNES, carteDuMessage, colorShiftModifie, reglageGlobalModifie, type CibleDAction } from '../presentation';
import { creerVuesAjustement } from './ajustement';
import { creerVuesApercuCompact } from './apercuCompact';
import type { BarreDePaletteUi, GestesDeLaBarre } from './barreDePalette';
import { createCarte } from './carte';
import { creerGlyphe } from './glyphes';
import { type ChoixDeBase } from './champs';
import { creerVuesChamps } from './champs';
import { creerVuesConstats } from './constats';
import { creerVuesPropositions } from './couleur/propositions';
import { creerVuesSelecteur as creerVuesSelecteurCouleur } from './couleur/selecteur';
import { type ApercuDeLaSaisie } from './creation';
import { creerVuesCreation } from './creation';
import { creerVuesEditeur } from './derive/editeur';
import type { StatutDuRangement } from './frontiere';
import type { GestesDeLaRecetteUi } from './gestesDeLaRecette';
import { creerVuesInterfaceDeTest } from './interfaceDeTest';
import { creerVuesLigneFixe } from './ligneFixe';
import { memoriserVues, type Localisation, type Texte } from './localisation';
import type { PaletteOuverte } from './paletteOuverte';
import { type GesteDePalette } from './menuPalette';
import { creerVuesMessagesDePalette } from './messagesDePalette';
import { creerVuesNuancier } from './nuancier';
import { creerVuesPiedDeLaPalette } from './piedDeLaPalette';
import { creerVuesReglagesDeLaPalette } from './reglagesDeLaPalette';
import { creerSocleLocalise } from './socleLocalise';
import { type Constat } from './textes';

/** Ce que l'onglet demande au sandbox, par la frontière, et au reste de l'interface. */
export interface DemandesDeLOnglet {
  ranger(recette: Recette): void;
  recharger(): void;
  /** Exporte la recette que l'onglet montre, brouillon compris : le geste de sortie d'un conflit (V12.1). */
  exporterLeBrouillon(): void;
  /** Un entier de 32 bits tiré au hasard, pour les identifiants de palette (D-K). */
  tirer(): number;
  /** Les gestes de la recette en fichier, que le blocage d'une recette illisible ou future offre ([REC-11]). */
  recetteEnFichier: GestesDeLaRecetteUi;
  /** Ouvre les Réglages communs sur le groupe qu'un message nomme ([VER-15]). */
  ouvrirReglages(cible: CibleDAction): void;
  /** « Vérifier », dans le pied : ouvre l'onglet Vérification sur la palette ouverte ([UI-18]). */
  verifier(): void;
  /** Une garantie du détail d'une nuance : elle se choisit dans la carte de Vérification ([VER-20]). */
  choisirGarantie(association: Association): void;
  /** Le lien sous l'encart d'un fichier sans palette : ouvre Gestion sur les palettes de ses variables ([UI-22]). */
  versGestion(): void;
}

export interface OngletCreationUi {
  element: HTMLDivElement;
  afficher(classement: Classement): void;
  poserStatut(statut: StatutDuRangement, refus: readonly Refus[]): void;
  /** La recette affichée, `null` quand elle ne se lit pas. */
  recette(): Recette | null;
  /** La palette ouverte et le thème de son aperçu, que les Réglages communs montrent (V9.3) ; `null` sans palette. */
  ouverte(): { readonly id: string; readonly mode: Mode } | null;
  /**
   * Une recette en cours de saisie dans les Réglages communs, qui couvrent
   * l'onglet : elle se garde sans se rendre (Z4.8).
   */
  previsualiser(recette: Recette): void;
  /** Rend l'onglet si une saisie l'a laissé en aperçu : au retour des Réglages communs. */
  rendreSiDiffere(): void;
  /** Une recette validée ailleurs : elle s'enregistre. */
  appliquer(recette: Recette): void;
  /** Une recette importée, ou la recette par défaut : elle remplace celle du fichier, même illisible, et s'enregistre. */
  importer(recette: Recette): void;
  /** Ouvre une palette dans le thème que sa fiche de l'onglet Palettes montrait (V8.3). */
  ouvrirLaPalette(id: string, mode: Mode): void;
  /** Le nombre de palettes que les variables du fichier portent hors du plugin : l'encart d'un fichier sans palette y mène ([UI-22]). */
  poserLesPalettesDuFichier(nombre: number): void;
  /** Ce que la barre de la palette demande ([UI-23]) : l'onglet porte la recette, donc ses gestes. */
  readonly gestesDeLaBarre: GestesDeLaBarre;
  /** Reprend la barre en tête de l'onglet, quand il redevient l'onglet actif. */
  placerLaBarre(): void;
  /** Ouvre et focalise le réglage qu'un message de Vérification nomme ([VER-15]). */
  ouvrir(cible: CibleDAction): void;
  /** Le thème de l'aperçu, que la carte des garanties de Vérification suit et change ([VER-20]). */
  readonly theme: {
    mode(): Mode;
    choisir(mode: Mode): void;
    montrer(mode: Mode): void;
    dAvant(): Mode | null;
    revenir(): void;
  };
}

/** La couleur dont l'encart d'un fichier sans palette montre la rampe : celle que le champ de création suggère. */
const COULEUR_D_EXEMPLE = '#1E6FD9';

function construireVues(i18n: Localisation) {
  const ecrireArrondi = i18n.arrondi;
  const { createButton } = creerSocleLocalise(i18n);
  const { blocDeConstat } = creerVuesConstats(i18n);
  const { createLigneFixe } = creerVuesLigneFixe(i18n);
  const { createPiedDeLaPalette } = creerVuesPiedDeLaPalette(i18n);
  const { createAjustement } = creerVuesAjustement(i18n);
  const { apercuCompact } = creerVuesApercuCompact(i18n);
  const { champEnColonne, createChoixDuModele, createPuces, createSegmentsDesIntensites } = creerVuesChamps(i18n);
  const { nuancesProposees } = creerVuesPropositions(i18n);
  const { createPipette } = creerVuesSelecteurCouleur(i18n);
  const { createCreation } = creerVuesCreation(i18n);
  const { createEditeur } = creerVuesEditeur(i18n);
  const { createReglagesDeLaPalette } = creerVuesReglagesDeLaPalette(i18n);
  const { createInterfaceDeTest } = creerVuesInterfaceDeTest(i18n);
  const { messagesDeLaPalette, tousLesMessages } = creerVuesMessagesDePalette(i18n);
  const { createNuancier } = creerVuesNuancier(i18n);
  const { TEXTES, TEXTES_DES_REGLAGES, TEXTES_DE_L_AJUSTEMENT, TEXTES_DE_LA_BASE, TEXTES_DE_LA_DERIVE, TEXTES_DE_L_ONGLET, TEXTES_DU_SELECTEUR, garantiesManqueesDeLaReference, hexaInvalide, ligneDeLaReference, nomDeLaCopie, nomDeLaPalette, originaleRetiree, palettesDansLesVariables, rangementInvalide, recetteFuture, recetteIllisible, recetteModifieeAilleurs, resumeDeLaDerive, resumeDesReglages, voirDansGestion } = i18n.messages;

  function ligneDEtat(texte: Texte): HTMLParagraphElement {
    const ligne = document.createElement('p');
    ligne.className = 'etat-lecture';
    i18n.lier(ligne, 'textContent', texte);
    return ligne;
  }

  /**
   * `etat` porte la recette affichée, la palette ouverte et l'état du geste,
   * que Vérification lit aussi ; `barre` rend la barre de la palette, qui
   * n'existe qu'une fois ([UI-23]).
   */
  function createOngletCreation(demandes: DemandesDeLOnglet, etat: PaletteOuverte, barre: BarreDePaletteUi): OngletCreationUi {
    const element = document.createElement('div');
    element.className = 'page-stack colonne';

    let classementLu: Classement | null = null;
    let creationOuverte = false;
    let note: Constat | null = null;
    let statut: StatutDuRangement = 'lu';
    let refus: Constat | null = null;

    const creation = createCreation({
      onCreer: (saisie, nom, intensites, base, crans) => creer(saisie, nom, intensites, base, crans),
      cransLibres: () => {
        const recette = etat.recette();
        return recette ? cransLibresParDefaut(recette) : [];
      },
      apercuDeLaSaisie: (saisie) => apercuDeLaSaisie(saisie),
      onAnnuler: () => {
        creationOuverte = false;
        rendre();
        // Dans un fichier sans palette, la barre est cachée : le focus revient à l'encart.
        if (appel.hidden) barre.focaliserNouvelle();
        else premiereNouvelle.focus();
      },
    });

    /*
     * L'encart d'un fichier sans palette ([UI-22]) : une rampe d'exemple, un
     * titre, une phrase et « Nouvelle palette », qui le remplace par la carte
     * de création. La rampe est celle que le moteur calcule pour la couleur
     * d'exemple du champ de création.
     */
    const appel = document.createElement('section');
    appel.className = 'appel';
    const rampeDExemple = document.createElement('div');
    rampeDExemple.className = 'appel-rampe';
    rampeDExemple.setAttribute('aria-hidden', 'true');
    const titreDeLAppel = document.createElement('h2');
    i18n.lier(titreDeLAppel, 'textContent', TEXTES.premierePaletteTitre);
    const texteDeLAppel = document.createElement('p');
    i18n.lier(texteDeLAppel, 'textContent', TEXTES.premierePalette);
    const premiereNouvelle = createButton({ label: TEXTES.nouvellePalette, onClick: () => ouvrirLaCreation() });
    appel.append(rampeDExemple, titreDeLAppel, texteDeLAppel, premiereNouvelle);

    // Sous l'encart : les palettes que les variables du fichier portent déjà, et le lien vers Gestion ([UI-22]).
    const ligneDuFichier = document.createElement('p');
    ligneDuFichier.className = 'lien-de-fichier';
    ligneDuFichier.hidden = true;
    const texteDuFichier = document.createElement('span');
    const lienDuFichier = document.createElement('button');
    lienDuFichier.type = 'button';
    lienDuFichier.className = 'lien-de-constat';
    lienDuFichier.addEventListener('click', () => demandes.versGestion());
    ligneDuFichier.append(texteDuFichier, lienDuFichier);
    let palettesDuFichier = 0;

    /** La ligne ne paraît qu'avec l'encart, quand le fichier porte au moins une palette. */
    function rendreLaLigneDuFichier(): void {
      ligneDuFichier.hidden = appel.hidden || palettesDuFichier === 0;
      if (ligneDuFichier.hidden) return;
      i18n.lier(texteDuFichier, 'textContent', palettesDansLesVariables(palettesDuFichier));
      i18n.lier(lienDuFichier, 'textContent', voirDansGestion(palettesDuFichier));
    }

    function peindreLExemple(lue: Recette): void {
      if (rampeDExemple.childElementCount > 0) return;
      const exemple = nouvellePalette(lue, 'p-00000000', COULEUR_D_EXEMPLE, 1);
      if (!exemple) return;
      for (const cran of rampeDe(analyserPalette(lue, exemple).rampes, 'unique').light) {
        const pastille = document.createElement('span');
        pastille.style.background = cran.hexa;
        rampeDExemple.append(pastille);
      }
    }

    const zoneDeLaNote = document.createElement('div');

    // Le choix ou la création d'une palette, en tête de l'onglet : la barre partagée, la création, puis la note.
    const choix = document.createElement('div');
    choix.className = 'choix-de-palette';
    choix.append(zoneDeLaNote);
    barre.placerDans(choix);

    // Le titre de premier rang, « Palette [nom] », seul sur sa ligne ([UI-11]) : un nom long se coupe.
    const titreDeConfiguration = document.createElement('h2');
    titreDeConfiguration.className = 'titre-de-premier-rang';
    const teteDeLaPalette = document.createElement('div');
    teteDeLaPalette.className = 'tete-de-la-palette';
    teteDeLaPalette.append(titreDeConfiguration);

    // Carte Configuration de la palette ([UI-11]).
    // La pastille ouvre le sélecteur de couleur, qui propose les nuances Vivid du thème montré (W4.1).
    const pipette = createPipette(TEXTES.reference, () => {
      const courante = ouverte();
      const analyse = etat.analyse();
      if (!courante || !analyse) return null;
      originaleAvantSaisie = courante.originale ?? null;
      return {
        hexa: courante.reference,
        titreDesPastilles: TEXTES_DU_SELECTEUR.nuancesDeLaPalette,
        pastilles: nuancesProposees(analyse, nuancier.mode()),
        saisir: (saisie, fin) => saisirReference(saisie, fin, true),
        abandonner: () => rendre(),
      };
    });
    const hexa = document.createElement('input');
    hexa.type = 'text';
    hexa.className = 'input champ-hexa';
    hexa.spellcheck = false;
    hexa.maxLength = 7;
    const erreurHexa = document.createElement('p');
    erreurHexa.className = 'field-error';
    erreurHexa.hidden = true;
    const nom = document.createElement('input');
    nom.type = 'text';
    nom.className = 'input';
    /*
     * Sous le code, hors du libellé qui focalise la pastille, une ligne fixe
     * dit l'état de la référence ([UI-11]) : les garanties manquées et
     * « Ajuster la référence », qui ouvre la modale (W7.1, Z5.2) ; l'originale
     * d'une référence ajustée et « Revenir à l'originale » ; sinon, une
     * référence employée telle quelle.
     */
    const lienDAjustement = document.createElement('button');
    lienDAjustement.type = 'button';
    lienDAjustement.className = 'lien-de-constat';
    i18n.lier(lienDAjustement, 'textContent', TEXTES_DE_L_AJUSTEMENT.lien);
    lienDAjustement.addEventListener('click', () => ouvrirLAjustement());
    const revenir = document.createElement('button');
    revenir.type = 'button';
    revenir.className = 'lien-de-constat';
    i18n.lier(revenir, 'textContent', TEXTES_DE_L_AJUSTEMENT.revenir);
    revenir.addEventListener('click', () => {
      const courante = ouverte();
      const recette = etat.recette();
      if (!recette || !courante) return;
      note = null;
      valider(remplacerPalette(recette, revenirALOriginale(recette, courante)));
      (lienDAjustement.isConnected ? lienDAjustement : hexa).focus();
    });
    const colonneDeLaReference = document.createElement('div');
    colonneDeLaReference.className = 'champ-colonne';
    const etatDeLaReference = createLigneFixe();
    etatDeLaReference.element.classList.add('ligne-de-la-reference');
    colonneDeLaReference.append(champEnColonne(TEXTES.reference, pipette.bouton, hexa), erreurHexa, etatDeLaReference.element);
    /** L'originale de la palette au début d'une saisie du code : la retirer se signale (section 3 de la conception). */
    let originaleAvantSaisie: string | null = null;
    hexa.addEventListener('focus', () => {
      originaleAvantSaisie = ouverte()?.originale ?? null;
    });
    // La modale part de la palette telle qu'elle est à son ouverture (X2.7, R3) ; le focus revient au lien, ou au code quand le lien a disparu (Y8.0).
    const ajustement = createAjustement({
      // R1 : le pas choisi devient la luminosité du porteur, comme dans la carte (Z10.4).
      appliquer: (pas) => {
        const courante = ouverte();
        const recette = etat.recette();
        if (!recette || !courante) return;
        note = null;
        valider(remplacerPalette(recette, reglerClarte(recette, courante, cleDuPorteur(recette, courante), pas / 100)));
      },
      retour: () => (lienDAjustement.isConnected ? lienDAjustement : hexa),
    });

    function ouvrirLAjustement(): void {
      const courante = ouverte();
      const recette = etat.recette();
      if (recette && courante) ajustement.ouvrir(recette, courante);
    }
    /*
     * Les intensités, en segments « Une · Deux » ([ENT-14]) ; le profil qui
     * porte la référence, Auto, Soft ou Vivid, se choisit sous « Deux »
     * ([ENT-11]). Passer de deux à une ne demande pas de confirmation (Y2.1).
     */
    const choixDesIntensites = createSegmentsDesIntensites((nombre) => {
      const courante = ouverte();
      const recette = etat.recette();
      if (recette && courante) valider(remplacerPalette(recette, choisirLesIntensites(recette, courante, nombre)));
    }, (valeur) => {
      const courante = ouverte();
      const recette = etat.recette();
      if (recette && courante) valider(remplacerPalette(recette, choisirLaBase(recette, courante, valeur)));
    });
    const choixDeBase = choixDesIntensites.base;
    const choixAutomatique = choixDeBase.aide;
    /*
     * Deux colonnes (recette v7) : le nom puis le modèle à gauche, la couleur
     * de référence puis les intensités à droite. Une palette libre n'a pas de
     * choix d'intensités : ses numéros se choisissent dessous.
     */
    const choixDuModele = createChoixDuModele((valeur) => {
      const courante = ouverte();
      const recette = etat.recette();
      if (!recette || !courante) return;
      valider(remplacerPalette(recette, valeur === 'libre' ? passerEnLibre(recette, courante) : revenirAuModele(recette, courante)));
    });
    const puces = createPuces((numero) => {
      const courante = ouverte();
      const recette = etat.recette();
      if (recette && courante) valider(remplacerPalette(recette, basculerNuance(courante, numero)));
    });
    const colonnes = document.createElement('div');
    colonnes.className = 'colonnes-de-base';
    colonnes.append(champEnColonne(TEXTES.nom, nom), colonneDeLaReference, choixDuModele.element, choixDesIntensites.element);
    const carteDeBase = createCarte({ titre: TEXTES_DE_L_ONGLET.configuration }, i18n);
    carteDeBase.corps.append(colonnes, puces.element);

    // Carte d'aperçu sans titre ([UI-04]) : thèmes et fond dans l'en-tête, la référence sous la surface.
    const nuancier = createNuancier({
      surMode: () => rendre(),
      saisirFond: (mode, hexa, fin) => saisirFond(mode, hexa, fin),
      abandonnerLeFond: () => rendre(),
      choisirGarantie: (association) => demandes.choisirGarantie(association),
    });
    const carteDApercu = createCarte({ titre: TEXTES_DE_L_ONGLET.apercu, sansTitre: true }, i18n);
    carteDApercu.tete.append(nuancier.tete);
    const repereDeReference = document.createElement('p');
    repereDeReference.className = 'repere-de-la-reference';
    carteDApercu.corps.append(nuancier.element, repereDeReference);

    // Les cartes « Réglage global » et « Color shift », sans titre de section (recette v7, [UI-12]).
    const carteDesIntensites = createCarte({ titre: TEXTES_DES_REGLAGES.titre, sousTitre: TEXTES_DES_REGLAGES.sousTitre, glyphe: creerGlyphe('reglageGlobal'), repliable: { ouverte: false } }, i18n);
    const intensites = createReglagesDeLaPalette({
      previsualiser: (suivante) => modifier(suivante),
      valider: (suivante) => {
        const recette = etat.recette();
        if (recette) valider(remplacerPalette(recette, suivante));
      },
      ouvrir: (cible) => ouvrir(cible),
    });
    carteDesIntensites.corps.append(intensites.element);
    // Les limites du réglage global ne se calculent que carte ouverte : l'ouvrir les lance.
    carteDesIntensites.surBascule(() => rendre());

    const carteDeLaDerive = createCarte({ titre: TEXTES_DE_L_ONGLET.derive, sousTitre: TEXTES_DE_L_ONGLET.sousTitreDeLaDerive, glyphe: creerGlyphe('colorShift'), repliable: { ouverte: false } }, i18n);
    const editeur = createEditeur({
      previsualiser: (suivante) => modifier(suivante),
      valider: (suivante) => {
        const recette = etat.recette();
        if (recette) valider(remplacerPalette(recette, suivante));
      },
    });
    carteDeLaDerive.corps.append(editeur.element);
    // L'éditeur ne se dessine que déplié : l'ouvrir le dessine.
    carteDeLaDerive.surBascule(() => rendre());

    // L'interface de test ferme l'onglet ([UI-14]) : repliée, elle ne se dessine qu'ouverte.
    const interfaceDeTest = createInterfaceDeTest();
    interfaceDeTest.surBascule(() => rendre());

    // Le bilan de la palette, dans un pied qui reste en vue ([UI-18]).
    const pied = createPiedDeLaPalette(() => demandes.verifier());

    // La palette se règle ici, et se juge dans Vérification ([UI-12]).
    const configuration = document.createElement('div');
    configuration.className = 'configuration-de-la-palette';
    configuration.append(
      teteDeLaPalette,
      carteDeBase.element,
      carteDApercu.element,
      carteDesIntensites.element,
      carteDeLaDerive.element,
      interfaceDeTest.element,
      pied.element,
    );

    /** Ouvre et focalise le réglage qu'un message nomme ([VER-15]) : dans l'onglet, ou dans les Réglages communs. */
    function ouvrir(cible: CibleDAction): void {
      if (CIBLES_COMMUNES.includes(cible)) {
        demandes.ouvrirReglages(cible);
        return;
      }
      if (cible === 'reference') {
        hexa.focus();
        hexa.select();
      } else if (cible === 'ajuster-reference') {
        ouvrirLAjustement();
      } else if (cible === 'intensites-palette' || cible === 'saturation-palette') {
        carteDesIntensites.ouvrir();
        if (cible === 'saturation-palette') intensites.focaliserLaSaturation();
        else intensites.ouvrir();
      } else {
        carteDeLaDerive.ouvrir();
        if (carteDeLaDerive.estOuverte()) editeur.focaliser();
      }
    }

    /**
     * La palette que le designer a choisie. Aucune à l'ouverture du plugin, et
     * aucune quand la palette choisie a disparu, par un import ou une autre
     * session ([UI-06]) : l'onglet attend alors un choix.
     */
    function ouverte(): Palette | null {
      return etat.palette();
    }

    /**
     * Remplace la recette affichée, sans l'enregistrer : une saisie en cours,
     * que `valider` termine. Le pied n'annonce son bilan qu'en dehors d'un
     * geste ([UI-20]).
     */
    function modifier(suivante: Palette): void {
      const recette = etat.recette();
      if (!recette) return;
      etat.poserRecette(remplacerPalette(recette, suivante));
      etat.poserGeste(true);
      rendre();
    }

    /*
     * Pendant un glisser dans le sélecteur de couleur, un rendu ne peint que
     * l'aperçu : champs, analyse et nuancier suivent le pointeur. Garanties,
     * messages, intensités, dérive et interface de test attendent la fin du
     * geste, qui range et rend tout, ou son abandon (Échap, fermeture), qui
     * rend tout sans ranger. Aucun rendu complet ne part en plein geste, même
     * quand le pointeur s'arrête (Z4.6).
     */
    let apercuSeul = false;
    /** Vrai tant qu'un rendu d'aperçu, ou une recette des Réglages, attend le rendu complet. */
    let renduDiffere = false;

    function rendreLApercu(): void {
      etat.poserGeste(true);
      apercuSeul = true;
      try {
        rendre();
      } finally {
        apercuSeul = false;
      }
      renduDiffere = true;
    }

    /** La fin d'un geste : la recette s'enregistre. */
    function valider(suivante: Recette): void {
      etat.poserRecette(suivante);
      etat.poserGeste(false);
      rendre();
      demandes.ranger(suivante);
    }

    function ouvrirLaCreation(): void {
      creationOuverte = true;
      barre.fermerLaConfirmation();
      // « Annuler » ramène à la barre, ou à l'encart d'un fichier sans palette.
      creation.ouvrir(true);
      rendre();
      creation.focaliser();
    }

    /** Ce que la couleur saisie dans la création donnerait, à une intensité et à deux ([ENT-14]). */
    function apercuDeLaSaisie(saisie: string): ApercuDeLaSaisie | null {
      const lue = etat.recette();
      if (!lue || !MOTIF_HEXA.test(saisie.trim())) return null;
      const [une, deux] = [nouvellePalette(lue, 'p-00000000', saisie, 1), nouvellePalette(lue, 'p-00000000', saisie, 2)];
      if (!une || !deux) return null;
      return {
        apercu: (nombre) => apercuCompact(lue, analyserPalette(lue, nombre === 1 ? une : deux), 'light'),
        part: ecrireArrondi(partDeLaReference(lue, une), 2),
        porteur: profilAutomatique(lue, deux),
      };
    }

    function creer(saisie: string, nomSaisi: string, intensites: 1 | 2, base: ChoixDeBase, crans: readonly number[] | null): void {
      const recette = etat.recette();
      if (!recette) return;
      const id = nouvelIdentifiant(recette, demandes.tirer);
      const palette = nouvellePalette(recette, id, saisie, crans ? 2 : intensites);
      if (!palette) {
        creation.signaler(hexaInvalide(saisie));
        return;
      }
      etat.ouvrir(id);
      creationOuverte = false;
      note = null;
      const dansLeModele = choisirLaBase(recette, renommer(palette, nomSaisi), base);
      valider(ajouter(recette, crans ? { ...passerEnLibre(recette, dansLeModele), crans: [...crans] } : dansLeModele));
      nom.focus();
    }

    /**
     * Un fond saisi depuis la pastille de l'aperçu : il change le réglage commun
     * `fonds` par `poserFond`, comme les Réglages communs, qui le relisent.
     */
    function saisirFond(mode: Mode, hexa: string, fin: boolean): void {
      const recette = etat.recette();
      const suivante = recette ? poserFond(recette, mode, hexa) : null;
      if (!suivante) return;
      if (fin) valider(suivante);
      else {
        etat.poserRecette(suivante);
        rendreLApercu();
      }
    }

    function agir(geste: GesteDePalette): void {
      const courante = ouverte();
      const recette = etat.recette();
      if (!recette || !courante) return;
      note = null;
      if (geste === 'dupliquer') {
        const id = nouvelIdentifiant(recette, demandes.tirer);
        const suivante = dupliquer(recette, courante.id, id, nomDeLaCopie(nomDeLaPalette(courante)));
        etat.ouvrir(id);
        valider(suivante);
      } else if (geste === 'monter' || geste === 'descendre') {
        valider(deplacer(recette, courante.id, geste === 'monter' ? -1 : 1));
      } else {
        // La barre ouvre sa confirmation : la création lui laisse la place.
        creationOuverte = false;
        rendre();
      }
    }

    function confirmerLaSuppression(): void {
      const courante = ouverte();
      const recette = etat.recette();
      if (!recette || !courante) return;
      const rang = recette.palettes.indexOf(courante);
      const suivante = supprimer(recette, courante.id);
      etat.ouvrir(suivante.palettes[Math.min(rang, suivante.palettes.length - 1)]?.id ?? '');
      valider(suivante);
      barre.focaliserLeSelecteur();
    }

    /** Une saisie d'hexa : l'aperçu suit une valeur complète, une valeur impossible se signale. */
    function saisirReference(saisie: string, fin: boolean, depuisLeSelecteur = false): void {
      const courante = ouverte();
      const recette = etat.recette();
      if (!recette || !courante) return;
      const suivante = changerReference(recette, courante, saisie);
      const impossible = !/^#?[0-9a-f]{0,6}$/i.test(saisie.trim()) || (fin && !MOTIF_HEXA.test(saisie.trim()));
      i18n.lier(erreurHexa, 'textContent', impossible ? hexaInvalide(saisie) : '');
      erreurHexa.hidden = !impossible;
      hexa.setAttribute('aria-invalid', String(impossible));
      if (!suivante) return;
      note = null;
      if (fin) {
        // Un code saisi est une nouvelle référence : il retire l'originale, sauf s'il la rend.
        if (originaleAvantSaisie && suivante.reference !== originaleAvantSaisie.toUpperCase()) note = originaleRetiree(originaleAvantSaisie);
        originaleAvantSaisie = null;
        valider(remplacerPalette(recette, suivante));
      } else if (depuisLeSelecteur) {
        etat.poserRecette(remplacerPalette(recette, suivante));
        rendreLApercu();
      } else modifier(suivante);
    }

    hexa.addEventListener('input', () => saisirReference(hexa.value, false));
    hexa.addEventListener('change', () => saisirReference(hexa.value, true));
    nom.addEventListener('input', () => {
      const courante = ouverte();
      if (courante) modifier(renommer(courante, nom.value));
    });
    nom.addEventListener('change', () => {
      const recette = etat.recette();
      if (recette) valider(recette);
    });

    /** Un champ que le designer est en train de saisir garde sa valeur. */
    function poser(saisie: HTMLInputElement, valeur: string): void {
      if (document.activeElement !== saisie) saisie.value = valeur;
    }

    /*
     * La structure ne se reconstruit jamais : un champ retiré du DOM perd son
     * focus, et `change` l'enregistrerait en pleine saisie. Chaque zone se montre
     * ou se cache ; seuls les blocs de texte se remplacent. Une zone vide se
     * cache : la grille compterait sinon son espacement.
     */
    const zoneDuRefus = document.createElement('div');
    const zoneDuBloquant = document.createElement('div');
    zoneDuBloquant.className = 'page-stack';
    const ligneVide = ligneDEtat('');
    const vide = document.createElement('div');
    vide.className = 'page-stack colonne';
    vide.append(ligneVide, appel, ligneDuFichier);
    // Sans palette choisie : un titre et une phrase, sans geste propre ; les gestes sont ceux de la barre (maquette Z3.3, D1).
    const invitation = document.createElement('div');
    invitation.className = 'invitation';
    const titreDeLInvitation = document.createElement('h2');
    titreDeLInvitation.className = 'titre-de-premier-rang';
    i18n.lier(titreDeLInvitation, 'textContent', TEXTES.invitationTitre);
    const texteDeLInvitation = document.createElement('p');
    i18n.lier(texteDeLInvitation, 'textContent', TEXTES.invitation);
    invitation.append(titreDeLInvitation, texteDeLInvitation);
    const vue = document.createElement('div');
    vue.className = 'page-stack colonne vue-de-la-palette';
    vue.append(choix, invitation, configuration);
    element.append(zoneDuRefus, zoneDuBloquant, vide, vue);

    /** Le panneau de création suit la vue montrée : seul, ou sous le sélecteur. */
    function placerLaCreation(parent: HTMLElement, avant: Node | null): void {
      if (creation.element.parentElement !== parent || creation.element.nextSibling !== avant) parent.insertBefore(creation.element, avant);
    }

    function rendreRefus(): void {
      zoneDuRefus.hidden = !refus;
      if (!refus) {
        zoneDuRefus.replaceChildren();
        return;
      }
      const bloc = blocDeConstat(refus, 'bloquant');
      const sortie = document.createElement('div');
      sortie.className = 'confirmation-gestes';
      // Pendant un conflit, le brouillon s'exporte avant qu'un rechargement ne le remplace (V12.1).
      if (statut === 'refuse') sortie.append(createButton({ label: TEXTES.exporterLeBrouillon, variant: 'secondary', onClick: () => demandes.exporterLeBrouillon() }));
      sortie.append(createButton({ label: TEXTES.recharger, onClick: () => demandes.recharger() }));
      bloc.append(sortie);
      zoneDuRefus.replaceChildren(bloc);
    }

    /** La création et la note, avec ou sans palette choisie ; la barre se rend à part. */
    function rendreLeChoix(courante: Palette | null): void {
      placerLaCreation(choix, zoneDeLaNote);
      creation.element.hidden = !creationOuverte;
      zoneDeLaNote.replaceChildren(...(note ? [blocDeConstat(note, 'notice')] : []));
      zoneDeLaNote.hidden = !note;
      // La création ouverte suffit à dire quoi faire : l'invitation lui laisse la place.
      invitation.hidden = courante !== null || creationOuverte;
      configuration.hidden = !courante;
    }

    function rendrePalette(courante: Palette, lue: Recette): void {
      const analyse = etat.analyse();
      if (!analyse) return;
      poser(hexa, courante.reference);
      pipette.poser(courante.reference);
      const manquees = (mode: Mode) => analyse.promesses.filter((promesse) => promesse.mode === mode && promesse.verdict === 'manquee').length;
      const trace = courante.originale ? TEXTES_DE_L_AJUSTEMENT.ajusteeDepuis(courante.originale) : null;
      if (analyse.manquees > 0) {
        const manque = garantiesManqueesDeLaReference({ light: manquees('light'), dark: manquees('dark') });
        etatDeLaReference.poser(trace ? i18n.composer`${manque} · ${trace}` : manque, 'danger', trace ? [lienDAjustement, revenir] : [lienDAjustement]);
      } else if (trace) etatDeLaReference.poser(trace, 'neutre', [revenir]);
      else etatDeLaReference.poser(TEXTES_DE_L_AJUSTEMENT.telleQuelle);
      poser(nom, courante.nom ?? '');
      i18n.lier(nom, 'placeholder', courante.reference);
      i18n.lier(titreDeConfiguration, 'textContent', TEXTES_DE_L_ONGLET.titre(nomDeLaPalette(courante)));
      choixDuModele.poser(analyse.libre ? 'libre' : 'modele');
      const une = aUneIntensite(courante);
      choixDesIntensites.poser({ intensites: une ? 1 : 2 });
      choixDesIntensites.element.hidden = analyse.libre;
      choixDeBase.poser(courante.base ?? 'auto');
      puces.element.hidden = !analyse.libre;
      puces.poser(analyse.grille.crans);
      // Des réglages figent le porteur, et changer de profil déplacerait la référence : l'aide le dit avant le geste (Z10.5).
      // Sa ligne garde sa place, vide sous une palette de base : un premier réglage ne la fait pas paraître ([UI-20]).
      const aideDuChoix = courante.reglages
        ? TEXTES_DES_REGLAGES.porteurFige(profilPorteur(lue, courante))
        : courante.base ? '' : TEXTES_DE_LA_BASE.choixAutomatique(profilAutomatique(lue, courante));
      i18n.lier(choixAutomatique, 'textContent', aideDuChoix);
      i18n.lier(choixAutomatique, 'title', aideDuChoix);
      i18n.lier(repereDeReference, 'textContent', i18n.composer`◆ ${ligneDeLaReference(analyse.ancrage, nuancier.mode())}`);

      nuancier.afficher({ recette: lue, analyse, confondues: analyse.confusions });
      if (apercuSeul) return;

      const nomDe = (id: string) => {
        const trouvee = lue.palettes.find((candidate) => candidate.id === id);
        return trouvee ? nomDeLaPalette(trouvee) : id;
      };
      const messages = messagesDeLaPalette(analyse, courante, { recette: lue, nomDe });
      // Toute palette a la carte, une intensité comprise : c'est là qu'elle affine sa référence (Z10.4, question 4).
      intensites.afficher(lue, courante, messages.intensite, carteDesIntensites.estOuverte());
      const pointsDIntensite = messages.intensite.filter((message) => message.severite !== 'notice').length;
      carteDesIntensites.poserResume(resumeDesReglages(reglageGlobalModifie(courante), pointsDIntensite));
      pied.afficher({
        garanties: analyse.libre ? 0 : analyse.promesses.length,
        manquees: analyse.manquees,
        libre: analyse.libre,
        messages: tousLesMessages(analyse, courante, { recette: lue, nomDe }),
      }, !etat.enGeste());

      // Une palette grise ne règle que sa luminosité : la carte reste ouverte, ses onglets Teinte et Saturation se désactivent ([DER-15]).
      const grise = estPaletteGrise(lue, courante);
      const pointsDeDerive = messages.liste.filter((message) => carteDuMessage(message.cibles) === 'derive').length;
      carteDeLaDerive.poserResume(resumeDeLaDerive(colorShiftModifie(courante, grise), aUneIntensite(courante) ? null : courante.derive.lien, pointsDeDerive));
      if (carteDeLaDerive.estOuverte()) editeur.afficher(lue, courante, analyse.rampes, analyse.ancrage, analyse, nuancier.mode());
      interfaceDeTest.afficher(lue, analyse, nuancier.mode(), courante.id);
    }

    /**
     * Montre une seule des trois zones. La visibilité se pose avant le
     * remplissage : un élément caché ne reçoit pas le focus, et la poignée
     * redessinée de l'éditeur doit le reprendre.
     */
    function montrer(zone: HTMLElement): void {
      for (const candidate of [zoneDuBloquant, vide, vue]) candidate.hidden = candidate !== zone;
    }

    /**
     * Rend l'onglet, puis le déclare à l'état partagé : un rendu complet
     * recalcule les verdicts à la fin d'un geste et prévient Vérification. La
     * barre se rend ensuite, avec ces verdicts.
     */
    function rendre(): void {
      rendreLesZones();
      etat.rendu(apercuSeul ? 'apercu' : 'complet');
      barre.afficher({ palettes: etat.recette()?.palettes ?? [], idOuvert: etat.id(), verdicts: etat.verdicts(), creationOuverte });
    }

    function rendreLesZones(): void {
      rendreLesZonesDeLaRecette();
      rendreLaLigneDuFichier();
    }

    function rendreLesZonesDeLaRecette(): void {
      const recette = etat.recette();
      if (!apercuSeul) renduDiffere = false;
      rendreRefus();
      if (!classementLu) {
        montrer(vide);
        ligneVide.hidden = false;
        appel.hidden = true;
        i18n.lier(ligneVide, 'textContent', TEXTES.lectureEnCours);
        return;
      }
      if (classementLu.etat === 'future' || classementLu.etat === 'illisible') {
        montrer(zoneDuBloquant);
        const constat = classementLu.etat === 'future' ? recetteFuture(classementLu.version) : recetteIllisible(classementLu.refus);
        demandes.recetteEnFichier.afficher(classementLu);
        zoneDuBloquant.replaceChildren(blocDeConstat(constat, 'bloquant'), demandes.recetteEnFichier.element);
        return;
      }
      if (!recette || recette.palettes.length === 0) {
        montrer(vide);
        ligneVide.hidden = true;
        if (recette) peindreLExemple(recette);
        appel.hidden = creationOuverte;
        placerLaCreation(vide, null);
        creation.element.hidden = !creationOuverte;
        return;
      }
      appel.hidden = true;
      const courante = ouverte();
      montrer(vue);
      rendreLeChoix(courante);
      if (courante) rendrePalette(courante, recette);
    }

    creation.ouvrir(true);
    creation.element.hidden = true;
    appel.hidden = true;
    vide.append(creation.element);
    rendre();

    return {
      element,
      afficher(classement) {
        classementLu = classement;
        etat.poserRecette(classement.etat === 'future' || classement.etat === 'illisible' ? null : classement.recette);
        refus = null;
        rendre();
      },
      recette: () => etat.recette(),
      ouverte() {
        const courante = ouverte();
        return courante ? { id: courante.id, mode: nuancier.mode() } : null;
      },
      // Les Réglages communs couvrent l'onglet : leur saisie ne le rend pas, leur fin passe par `appliquer`.
      previsualiser(suivante) {
        etat.poserRecette(suivante);
        renduDiffere = true;
      },
      rendreSiDiffere() {
        if (renduDiffere) rendre();
      },
      appliquer: (suivante) => valider(suivante),
      importer(suivante) {
        classementLu = { etat: 'courante', recette: suivante };
        valider(suivante);
      },
      poserStatut(suivant, refusDuSandbox) {
        statut = suivant;
        demandes.recetteEnFichier.bloquer(suivant === 'refuse' ? TEXTES.conflitEnCours : null);
        if (suivant === 'refuse') refus = recetteModifieeAilleurs();
        else if (suivant === 'invalide') refus = rangementInvalide(refusDuSandbox);
        // Une réponse du sandbox en plein aperçu ne montre que le refus : le rendu complet attend la fin du geste.
        if (renduDiffere) rendreRefus();
        else rendre();
      },
      poserLesPalettesDuFichier(nombre) {
        palettesDuFichier = nombre;
        rendreLaLigneDuFichier();
      },
      ouvrirLaPalette(id, mode) {
        etat.ouvrir(id);
        barre.fermerLaConfirmation();
        creationOuverte = false;
        rendre();
        nuancier.choisirLeTheme(mode);
      },
      gestesDeLaBarre: {
        choisir(id) {
          etat.ouvrir(id);
          rendre();
        },
        nouvelle: () => ouvrirLaCreation(),
        agir,
        supprimer: () => confirmerLaSuppression(),
      },
      placerLaBarre: () => barre.placerDans(choix),
      ouvrir,
      theme: {
        mode: () => nuancier.mode(),
        choisir: (mode) => nuancier.choisirLeTheme(mode),
        montrer: (mode) => nuancier.montrerLeTheme(mode),
        dAvant: () => nuancier.modeDAvant(),
        revenir: () => nuancier.revenir(),
      },
    };
  }
  return { createOngletCreation };
}

export const creerVuesOngletCreation = memoriserVues(construireVues);

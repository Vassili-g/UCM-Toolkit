/**
 * L'onglet Création (section 13.2) : le choix ou la création d'une palette.
 * Sans palette choisie, une invitation ([UI-06]) ; avec elle, le titre
 * « Palette [nom] » seul sur sa ligne, puis les cartes :
 * Configuration de la palette, aperçu, Intensités et Dérive de teinte
 * repliables, Garanties de contraste, et l'Interface de test en dernier
 * ([UI-12]). Un message se lit sous la carte qu'il concerne. La génération
 * appartient à l'onglet Palettes ([UI-05]).
 *
 * Une saisie recalcule l'aperçu dans l'interface ([ENT-02]). La recette
 * s'enregistre à la fin de chaque geste : valider un champ, relâcher un
 * curseur, créer, dupliquer, réordonner ou supprimer une palette (D-D). Jamais
 * pendant la saisie.
 */
import {
  aUneIntensite,
  estPresqueGrise,
  partDeLaReference,
  partsDesProfils,
  profilAutomatique,
  type Classement,
  type Mode,
  type Palette,
  type Recette,
  type Refus,
} from 'ucm-couleur';

import { analyserPalette } from '../analyse';
import { poserFond } from '../configuration';
import {
  MOTIF_HEXA,
  ajouter,
  appliquerLAjustement,
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
  revenirALOriginale,
  revenirAuModele,
  supprimer,
} from '../edition';
import { CIBLES_COMMUNES, carteDuMessage, type CarteDuMessage, type CibleDAction } from '../presentation';
import { creerVuesAjustement } from './ajustement';
import { creerVuesApercuCompact } from './apercuCompact';
import { createCarte } from './carte';
import { type ChoixDeBase } from './champs';
import { creerVuesChamps } from './champs';
import { type Message } from './constats';
import { creerVuesConstats } from './constats';
import { creerVuesPropositions } from './couleur/propositions';
import { creerVuesSelecteur as creerVuesSelecteurCouleur } from './couleur/selecteur';
import { type ApercuDeLaSaisie } from './creation';
import { creerVuesCreation } from './creation';
import { creerVuesEditeur } from './derive/editeur';
import type { StatutDuRangement } from './frontiere';
import { creerVuesGaranties } from './garanties';
import type { GestesDeLaRecetteUi } from './gestesDeLaRecette';
import { creerVuesIntensites } from './intensites';
import { creerVuesInterfaceDeTest } from './interfaceDeTest';
import { memoriserVues, type Localisation, type Texte } from './localisation';
import { type GesteDePalette } from './menuPalette';
import { creerVuesMenuPalette } from './menuPalette';
import { creerVuesMessagesDePalette } from './messagesDePalette';
import { creerVuesNuancier } from './nuancier';
import { creerVuesSelecteur } from './selecteur';
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
}

export interface OngletPalettesUi {
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
}

function construireVues(i18n: Localisation) {
  const ecrireArrondi = i18n.arrondi;
  const { createButton } = creerSocleLocalise(i18n);
  const { blocDeConstat, listeDesMessages } = creerVuesConstats(i18n);
  const { createAjustement } = creerVuesAjustement(i18n);
  const { apercuCompact } = creerVuesApercuCompact(i18n);
  const { champEnColonne, createChoixDuModele, createPuces, createSegmentsDesIntensites } = creerVuesChamps(i18n);
  const { nuancesProposees } = creerVuesPropositions(i18n);
  const { createPipette } = creerVuesSelecteurCouleur(i18n);
  const { createCreation } = creerVuesCreation(i18n);
  const { createEditeur } = creerVuesEditeur(i18n);
  const { createGaranties } = creerVuesGaranties(i18n);
  const { createIntensites } = creerVuesIntensites(i18n);
  const { createInterfaceDeTest } = creerVuesInterfaceDeTest(i18n);
  const { createMenuPalette } = creerVuesMenuPalette(i18n);
  const { messagesDeLaPalette } = creerVuesMessagesDePalette(i18n);
  const { createNuancier } = creerVuesNuancier(i18n);
  const { createSelecteur } = creerVuesSelecteur(i18n);
  const { TEXTES, TEXTES_DE_L_AJUSTEMENT, TEXTES_DE_LA_BASE, TEXTES_DE_LA_DERIVE, TEXTES_DE_L_ONGLET, TEXTES_DU_SELECTEUR, confirmationDeSuppression, garantiesManqueesDeLaReference, hexaInvalide, ligneDeLaReference, nomDeLaCopie, nomDeLaPalette, originaleRetiree, palettesDuFichier, rangementInvalide, recetteFuture, recetteIllisible, recetteModifieeAilleurs, resumeDeLaDerive, resumeDesIntensites } = i18n.messages;

  function ligneDEtat(texte: Texte): HTMLParagraphElement {
    const ligne = document.createElement('p');
    ligne.className = 'etat-lecture';
    i18n.lier(ligne, 'textContent', texte);
    return ligne;
  }

  function createOngletPalettes(demandes: DemandesDeLOnglet): OngletPalettesUi {
    const element = document.createElement('div');
    element.className = 'page-stack colonne';

    let recette: Recette | null = null;
    let classementLu: Classement | null = null;
    let idOuvert = '';
    let creationOuverte = false;
    let suppressionDemandee = false;
    let note: Constat | null = null;
    let statut: StatutDuRangement = 'lu';
    let refus: Constat | null = null;

    // Le choix ou la création d'une palette, en tête de l'onglet : la liste prend la largeur libre ([UI-06]).
    const selecteur = createSelecteur((id) => {
      idOuvert = id;
      suppressionDemandee = false;
      rendre();
    });
    // L'action principale de l'onglet : créer une palette.
    const plus = createButton({ label: TEXTES.nouvellePalette, onClick: () => ouvrirLaCreation() });
    plus.classList.add('bouton-de-barre');
    plus.setAttribute('aria-expanded', 'false');
    const menu = createMenuPalette(agir);
    const barre = document.createElement('div');
    barre.className = 'barre-gestes';
    barre.append(selecteur.element, plus, menu.element);

    const creation = createCreation({
      onCreer: (saisie, nom, intensites, base, crans) => creer(saisie, nom, intensites, base, crans),
      cransLibres: () => (recette ? cransLibresParDefaut(recette) : []),
      apercuDeLaSaisie: (saisie) => apercuDeLaSaisie(saisie),
      onAnnuler: () => {
        creationOuverte = false;
        rendre();
        plus.focus();
      },
    });

    const confirmation = document.createElement('div');
    confirmation.className = 'confirmation';
    const texteDeConfirmation = document.createElement('p');
    const gestesDeConfirmation = document.createElement('div');
    gestesDeConfirmation.className = 'confirmation-gestes';
    const supprimerVraiment = createButton({ label: TEXTES.supprimer, variant: 'danger', onClick: () => confirmerLaSuppression() });
    gestesDeConfirmation.append(
      supprimerVraiment,
      createButton({
        label: TEXTES.annuler,
        variant: 'secondary',
        onClick: () => {
          suppressionDemandee = false;
          rendre();
          menu.focaliser();
        },
      }),
    );
    confirmation.append(texteDeConfirmation, gestesDeConfirmation);
    const zoneDeLaNote = document.createElement('div');

    const choix = document.createElement('div');
    choix.className = 'choix-de-palette';
    choix.append(barre, confirmation, zoneDeLaNote);

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
      if (!recette || !courante) return null;
      originaleAvantSaisie = courante.originale ?? null;
      return {
        hexa: courante.reference,
        titreDesPastilles: TEXTES_DU_SELECTEUR.nuancesDeLaPalette,
        pastilles: nuancesProposees(analyserPalette(recette, courante), nuancier.mode()),
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
     * Sous le code, hors du libellé qui focalise la pastille : « Ajuster la
     * référence » ouvre la modale (W7.1, Z5.2), seulement quand une garantie
     * est manquée ; une référence ajustée dit son originale, que « Revenir à
     * l'originale » rend.
     */
    const lienDAjustement = document.createElement('button');
    lienDAjustement.type = 'button';
    lienDAjustement.className = 'lien-de-constat';
    i18n.lier(lienDAjustement, 'textContent', TEXTES_DE_L_AJUSTEMENT.lien);
    lienDAjustement.addEventListener('click', () => ouvrirLAjustement());
    const traceDeLAjustement = document.createElement('p');
    traceDeLAjustement.className = 'ligne-secondaire trace-de-l-ajustement';
    const ajusteeDepuis = document.createElement('span');
    const revenir = document.createElement('button');
    revenir.type = 'button';
    revenir.className = 'lien-de-constat';
    i18n.lier(revenir, 'textContent', TEXTES_DE_L_AJUSTEMENT.revenir);
    revenir.addEventListener('click', () => {
      const courante = ouverte();
      if (!recette || !courante) return;
      note = null;
      valider(remplacerPalette(recette, revenirALOriginale(recette, courante)));
      (lienDAjustement.hidden ? hexa : lienDAjustement).focus();
    });
    traceDeLAjustement.append(ajusteeDepuis, ' · ', revenir);
    const colonneDeLaReference = document.createElement('div');
    colonneDeLaReference.className = 'champ-colonne';
    // Avant le lien, ce qui manque : le designer sait pourquoi ajuster avant d'ouvrir le panneau (Z5.1).
    const manqueDeLaReference = document.createElement('p');
    manqueDeLaReference.className = 'manque-de-la-reference';
    manqueDeLaReference.id = 'manque-de-la-reference';
    lienDAjustement.setAttribute('aria-describedby', manqueDeLaReference.id);
    colonneDeLaReference.append(champEnColonne(TEXTES.reference, pipette.bouton, hexa), erreurHexa, manqueDeLaReference, lienDAjustement, traceDeLAjustement);
    /** L'originale de la palette au début d'une saisie du code : la retirer se signale (section 3 de la conception). */
    let originaleAvantSaisie: string | null = null;
    hexa.addEventListener('focus', () => {
      originaleAvantSaisie = ouverte()?.originale ?? null;
    });
    // La modale part de la palette telle qu'elle est à son ouverture (X2.7, R3) ; le focus revient au lien, ou au code quand le lien a disparu (Y8.0).
    const ajustement = createAjustement({
      appliquer: (proposition) => {
        const courante = ouverte();
        const ajustee = recette && courante ? appliquerLAjustement(recette, courante, proposition) : null;
        if (!recette || !ajustee) return;
        note = null;
        valider(remplacerPalette(recette, ajustee));
      },
      retour: () => (lienDAjustement.hidden ? hexa : lienDAjustement),
    });

    function ouvrirLAjustement(): void {
      const courante = ouverte();
      if (recette && courante) ajustement.ouvrir(recette, courante);
    }
    /*
     * Les intensités, en segments « Une · Deux » ([ENT-14]) ; le profil qui
     * porte la référence, Auto, Soft ou Vivid, se choisit sous « Deux »
     * ([ENT-11]). Passer de deux à une ne demande pas de confirmation (Y2.1).
     */
    const choixDesIntensites = createSegmentsDesIntensites((nombre) => {
      const courante = ouverte();
      if (recette && courante) valider(remplacerPalette(recette, choisirLesIntensites(recette, courante, nombre)));
    }, (valeur) => {
      const courante = ouverte();
      if (recette && courante) valider(remplacerPalette(recette, choisirLaBase(courante, valeur)));
    });
    const choixDeBase = choixDesIntensites.base;
    const choixAutomatique = choixDeBase.aide;
    /*
     * Disposition P2 (maquette Y2.6), la même que la création : le nom et la
     * couleur de référence sur une ligne, puis le modèle et les intensités,
     * chacun sur sa rangée. Une palette libre n'a pas de choix d'intensités :
     * ses numéros se choisissent à sa place.
     */
    const choixDuModele = createChoixDuModele((valeur) => {
      const courante = ouverte();
      if (!recette || !courante) return;
      valider(remplacerPalette(recette, valeur === 'libre' ? passerEnLibre(recette, courante) : revenirAuModele(courante)));
    });
    const puces = createPuces((numero) => {
      const courante = ouverte();
      if (recette && courante) valider(remplacerPalette(recette, basculerNuance(courante, numero)));
    });
    const colonnes = document.createElement('div');
    colonnes.className = 'colonnes-de-base';
    colonnes.append(champEnColonne(TEXTES.nom, nom), colonneDeLaReference);
    const carteDeBase = createCarte({ titre: TEXTES_DE_L_ONGLET.configuration }, i18n);
    const messagesDeBase = document.createElement('div');
    carteDeBase.corps.append(colonnes, choixDuModele.element, choixDesIntensites.element, puces.element, messagesDeBase);

    // Carte d'aperçu sans titre ([UI-04]) : thèmes et fond dans l'en-tête, la référence sous la surface.
    const nuancier = createNuancier({
      surMode: () => rendre(),
      saisirFond: (mode, hexa, fin) => saisirFond(mode, hexa, fin),
      abandonnerLeFond: () => rendre(),
      choisirGarantie: (association) => garanties.choisir(association),
    });
    const carteDApercu = createCarte({ titre: TEXTES_DE_L_ONGLET.apercu, sansTitre: true }, i18n);
    carteDApercu.tete.append(nuancier.tete);
    const repereDeReference = document.createElement('p');
    repereDeReference.className = 'repere-de-la-reference';
    carteDApercu.corps.append(nuancier.element, repereDeReference);
    const messagesDApercu = document.createElement('div');

    // Carte Garanties de contraste ([UI-09]) : elle suit le thème de l'aperçu.
    const garanties = createGaranties({
      ouvrir: (cible) => ouvrir(cible),
      montrerLeTheme: (mode) => nuancier.montrerLeTheme(mode),
    });

    // Cartes repliables Intensités et Dérive de teinte ([UI-12]).
    const carteDesIntensites = createCarte({ titre: TEXTES_DE_L_ONGLET.intensites, repliable: { ouverte: false } }, i18n);
    const intensites = createIntensites({
      previsualiser: (suivante) => modifier(suivante),
      valider: (suivante) => {
        if (recette) valider(remplacerPalette(recette, suivante));
      },
      ouvrir: (cible) => ouvrir(cible),
    });
    carteDesIntensites.corps.append(intensites.element);

    const carteDeLaDerive = createCarte({ titre: TEXTES_DE_L_ONGLET.derive, repliable: { ouverte: false } }, i18n);
    const editeur = createEditeur({
      previsualiser: (suivante) => modifier(suivante),
      valider: (suivante) => {
        if (recette) valider(remplacerPalette(recette, suivante));
      },
    });
    carteDeLaDerive.corps.append(editeur.element);
    // L'éditeur ne se dessine que déplié : l'ouvrir le dessine.
    carteDeLaDerive.surBascule(() => rendre());
    const messagesDeLaDerive = document.createElement('div');

    // L'interface de test ferme l'onglet ([UI-14]) : repliée, elle ne se dessine qu'ouverte.
    const interfaceDeTest = createInterfaceDeTest();
    interfaceDeTest.surBascule(() => rendre());

    // La palette se règle, puis se juge : Intensités et Dérive sous l'aperçu, les Garanties ensuite ([UI-12]).
    const configuration = document.createElement('div');
    configuration.className = 'configuration-de-la-palette';
    configuration.append(
      teteDeLaPalette,
      carteDeBase.element,
      carteDApercu.element,
      messagesDApercu,
      carteDesIntensites.element,
      carteDeLaDerive.element,
      messagesDeLaDerive,
      garanties.element,
      interfaceDeTest.element,
    );

    /** Les messages de la palette, chacun sous la carte qu'il concerne. */
    const ZONES_DES_MESSAGES: Record<CarteDuMessage, HTMLDivElement> = {
      'couleur-de-base': messagesDeBase,
      apercu: messagesDApercu,
      derive: messagesDeLaDerive,
    };

    function poserLesMessages(liste: readonly Message[]): void {
      for (const [carte, zone] of Object.entries(ZONES_DES_MESSAGES) as [CarteDuMessage, HTMLDivElement][]) {
        const ici = liste.filter((message) => carteDuMessage(message.cibles) === carte);
        zone.replaceChildren(...(ici.length > 0 ? [listeDesMessages(ici, ouvrir)] : []));
        zone.hidden = ici.length === 0;
      }
    }

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
      } else if (cible === 'intensites-palette') {
        carteDesIntensites.ouvrir();
        intensites.ouvrir();
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
      return recette?.palettes.find((candidate) => candidate.id === idOuvert) ?? null;
    }

    /** Remplace la recette affichée, sans l'enregistrer : une saisie en cours. */
    function modifier(suivante: Palette): void {
      if (!recette) return;
      recette = remplacerPalette(recette, suivante);
      rendre();
    }

    /*
     * Pendant un glisser dans le sélecteur de couleur, un rendu ne peint que
     * l'aperçu : champs, analyse et nuancier suivent le pointeur. Garanties,
     * messages, intensités, dérive et interface de test attendent la fin du
     * geste, qui range et rend tout, ou son abandon (Échap, fermeture,
     * pointeur perdu), qui rend tout sans ranger. Aucun rendu complet ne part
     * en plein geste, même quand le pointeur s'arrête (Z4.6).
     */
    let apercuSeul = false;
    /** Vrai tant qu'un rendu d'aperçu, ou une recette des Réglages, attend le rendu complet. */
    let renduDiffere = false;

    function rendreLApercu(): void {
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
      recette = suivante;
      rendre();
      demandes.ranger(suivante);
    }

    function ouvrirLaCreation(): void {
      creationOuverte = true;
      suppressionDemandee = false;
      creation.ouvrir(Boolean(recette && recette.palettes.length > 0));
      rendre();
      creation.focaliser();
    }

    /** Ce que la couleur saisie dans la création donnerait, à une intensité et à deux ([ENT-14]). */
    function apercuDeLaSaisie(saisie: string): ApercuDeLaSaisie | null {
      const lue = recette;
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
      if (!recette) return;
      const id = nouvelIdentifiant(recette, demandes.tirer);
      const palette = nouvellePalette(recette, id, saisie, crans ? 2 : intensites);
      if (!palette) {
        creation.signaler(hexaInvalide(saisie));
        return;
      }
      idOuvert = id;
      creationOuverte = false;
      note = null;
      const dansLeModele = choisirLaBase(renommer(palette, nomSaisi), base);
      valider(ajouter(recette, crans ? { ...passerEnLibre(recette, dansLeModele), crans: [...crans] } : dansLeModele));
      nom.focus();
    }

    /**
     * Un fond saisi depuis la pastille de l'aperçu : il change le réglage commun
     * `fonds` par `poserFond`, comme les Réglages communs, qui le relisent.
     */
    function saisirFond(mode: Mode, hexa: string, fin: boolean): void {
      const suivante = recette ? poserFond(recette, mode, hexa) : null;
      if (!suivante) return;
      if (fin) valider(suivante);
      else {
        recette = suivante;
        rendreLApercu();
      }
    }

    function agir(geste: GesteDePalette): void {
      const courante = ouverte();
      if (!recette || !courante) return;
      note = null;
      if (geste === 'dupliquer') {
        const id = nouvelIdentifiant(recette, demandes.tirer);
        const suivante = dupliquer(recette, courante.id, id, nomDeLaCopie(nomDeLaPalette(courante)));
        idOuvert = id;
        valider(suivante);
      } else if (geste === 'monter' || geste === 'descendre') {
        valider(deplacer(recette, courante.id, geste === 'monter' ? -1 : 1));
      } else {
        suppressionDemandee = true;
        creationOuverte = false;
        rendre();
        supprimerVraiment.focus();
      }
    }

    function confirmerLaSuppression(): void {
      const courante = ouverte();
      if (!recette || !courante) return;
      const rang = recette.palettes.indexOf(courante);
      const suivante = supprimer(recette, courante.id);
      idOuvert = suivante.palettes[Math.min(rang, suivante.palettes.length - 1)]?.id ?? '';
      suppressionDemandee = false;
      valider(suivante);
      selecteur.focaliser();
    }

    /** Une saisie d'hexa : l'aperçu suit une valeur complète, une valeur impossible se signale. */
    function saisirReference(saisie: string, fin: boolean, depuisLeSelecteur = false): void {
      const courante = ouverte();
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
        recette = remplacerPalette(recette, suivante);
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
    vide.append(ligneVide);
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

    /** La barre, la création, la confirmation et la note, avec ou sans palette choisie. */
    function rendreLaBarre(lue: Recette, courante: Palette | null): void {
      selecteur.afficher(lue.palettes, courante?.id ?? '');
      // Le menu porte sur la palette choisie : sans elle, il se cache.
      menu.element.hidden = !courante;
      if (courante) menu.afficher(lue.palettes.indexOf(courante), lue.palettes.length);
      placerLaCreation(choix, confirmation);
      creation.element.hidden = !creationOuverte;
      plus.setAttribute('aria-expanded', String(creationOuverte));
      i18n.lier(texteDeConfirmation, 'textContent', courante ? confirmationDeSuppression(nomDeLaPalette(courante)) : '');
      confirmation.hidden = !suppressionDemandee || !courante;
      zoneDeLaNote.replaceChildren(...(note ? [blocDeConstat(note, 'notice')] : []));
      zoneDeLaNote.hidden = !note;
      // La création ouverte suffit à dire quoi faire : l'invitation lui laisse la place.
      invitation.hidden = courante !== null || creationOuverte;
      configuration.hidden = !courante;
    }

    function rendrePalette(courante: Palette, lue: Recette): void {
      const analyse = analyserPalette(lue, courante);
      poser(hexa, courante.reference);
      pipette.poser(courante.reference);
      i18n.lier(ajusteeDepuis, 'textContent', courante.originale ? TEXTES_DE_L_AJUSTEMENT.ajusteeDepuis(courante.originale) : '');
      traceDeLAjustement.hidden = !courante.originale;
      lienDAjustement.hidden = analyse.manquees === 0;
      const manquees = (mode: Mode) => analyse.promesses.filter((promesse) => promesse.mode === mode && promesse.verdict === 'manquee').length;
      i18n.lier(manqueDeLaReference, 'textContent', analyse.manquees === 0 ? '' : garantiesManqueesDeLaReference({ light: manquees('light'), dark: manquees('dark') }));
      manqueDeLaReference.hidden = analyse.manquees === 0;
      poser(nom, courante.nom ?? '');
      i18n.lier(nom, 'placeholder', courante.reference);
      i18n.lier(titreDeConfiguration, 'textContent', TEXTES_DE_L_ONGLET.titre(nomDeLaPalette(courante)));
      choixDuModele.poser(analyse.libre ? 'libre' : 'modele');
      const une = aUneIntensite(courante);
      choixDesIntensites.poser({ intensites: une ? 1 : 2, part: ecrireArrondi(partDeLaReference(lue, courante), 2) });
      choixDesIntensites.element.hidden = analyse.libre;
      choixDeBase.poser(courante.base ?? 'auto');
      puces.element.hidden = !analyse.libre;
      puces.poser(analyse.grille.crans);
      i18n.lier(choixAutomatique, 'textContent', courante.base ? '' : TEXTES_DE_LA_BASE.choixAutomatique(profilAutomatique(lue, courante)));
      choixAutomatique.hidden = Boolean(courante.base);
      i18n.lier(repereDeReference, 'textContent', i18n.composer`◆ ${ligneDeLaReference(analyse.ancrage, nuancier.mode())}`);

      nuancier.afficher({ recette: lue, analyse, confondues: analyse.confusions });
      if (apercuSeul) return;

      const nomDe = (id: string) => {
        const trouvee = lue.palettes.find((candidate) => candidate.id === id);
        return trouvee ? nomDeLaPalette(trouvee) : id;
      };
      const messages = messagesDeLaPalette(analyse, courante, { recette: lue, nomDe });
      // Une palette libre n'a pas de garantie : sa carte se retire (W6.5).
      garanties.element.hidden = analyse.libre;
      if (!analyse.libre) garanties.afficher({ recette: lue, palette: courante, analyse, mode: nuancier.mode() });
      // Une palette à une intensité prend la part de sa référence : elle n'a pas de carte Intensités (I1, [ENT-14]).
      carteDesIntensites.element.hidden = une || analyse.libre;
      if (!une) {
        intensites.afficher(lue, courante, analyse.part, messages.intensite);
        const pointsDIntensite = messages.intensite.filter((message) => message.severite !== 'notice').length;
        carteDesIntensites.poserResume(resumeDesIntensites(courante.parts?.origine, courante.base, partsDesProfils(lue, courante), pointsDIntensite));
      }
      poserLesMessages(messages.liste);

      // Une référence presque grise n'a pas de teinte : l'éditeur se désactive ([DER-15]).
      const grise = estPresqueGrise(lue, courante);
      const pointsDeDerive = messages.liste.filter((message) => carteDuMessage(message.cibles) === 'derive').length;
      carteDeLaDerive.poserResume(resumeDeLaDerive(courante, grise, pointsDeDerive));
      carteDeLaDerive.desactiver(grise ? TEXTES_DE_LA_DERIVE.grisDesactive : null);
      if (carteDeLaDerive.estOuverte()) editeur.afficher(lue, courante, analyse.rampes, analyse.ancrage, analyse);
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

    function rendre(): void {
      if (!apercuSeul) renduDiffere = false;
      rendreRefus();
      if (!classementLu) {
        montrer(vide);
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
        i18n.lier(ligneVide, 'textContent', classementLu.etat === 'absente' ? TEXTES.recetteAbsente : palettesDuFichier(0));
        placerLaCreation(vide, null);
        creation.element.hidden = false;
        return;
      }
      const courante = ouverte();
      montrer(vue);
      rendreLaBarre(recette, courante);
      if (courante) rendrePalette(courante, recette);
    }

    creation.ouvrir(false);
    creation.element.hidden = true;
    vide.append(creation.element);
    rendre();

    return {
      element,
      afficher(classement) {
        classementLu = classement;
        recette = classement.etat === 'future' || classement.etat === 'illisible' ? null : classement.recette;
        refus = null;
        rendre();
      },
      recette: () => recette,
      ouverte() {
        const courante = ouverte();
        return courante ? { id: courante.id, mode: nuancier.mode() } : null;
      },
      // Les Réglages communs couvrent l'onglet : leur saisie ne le rend pas, leur fin passe par `appliquer`.
      previsualiser(suivante) {
        recette = suivante;
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
      ouvrirLaPalette(id, mode) {
        idOuvert = id;
        suppressionDemandee = false;
        creationOuverte = false;
        rendre();
        nuancier.choisirLeTheme(mode);
      },
    };
  }
  return { createOngletPalettes };
}

export const creerVuesOngletPalettes = memoriserVues(construireVues);

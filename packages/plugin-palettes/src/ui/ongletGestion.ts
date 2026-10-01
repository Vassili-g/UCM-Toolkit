/**
 * L'onglet Gestion (section 13.2, [UI-24] à [UI-32], [UI-35]). De haut en
 * bas : le bloc « Connexion à Figma », que la carte « Destination des
 * tokens » ou « Page des planches » remplace le temps d'un choix ; la barre
 * « Palettes du plugin · N » et ses deux bascules, la vue et le thème des
 * fiches ; puis les palettes de la recette, dans son ordre.
 *
 * En vue complète, une fiche par palette : le nom, la pastille d'état et
 * « Modifier » sur la première ligne, les rampes dans le thème choisi, la
 * référence et le résultat des garanties, puis une ligne par sortie, tokens
 * et planche. Les deux décisions d'écriture se prennent dans la fiche, sans
 * modale : l'encart d'une écriture qui crée des variables ([UI-31]), et
 * celui des couleurs changées dans Figma ([UI-32]). En vue condensée, un
 * tableau sans geste, une ligne par palette.
 *
 * Sous un filet, « Déjà dans le fichier » liste les palettes que les
 * variables du fichier portent hors du plugin, en fiches à tirets ([UI-33]) ;
 * « Modifier dans le plugin » en reprend une ([UI-34]).
 *
 * Suivent une carte par palette supprimée dont le cadre ou des variables
 * restent dans Figma ([PLA-27], [VAR-11]), les notices, puis la carte
 * repliée « Palettes et réglages » (V8.5). Chaque génération dessine les
 * parties que la recette choisit ([PLA-28]). « Tout mettre à jour » demande
 * confirmation, en comptant ce qu'il écrit ([UI-28]).
 */
import { MODES, rampeDe, type Classement, type Mode, type Recette } from 'ucm-couleur';

import { analyserPalette } from '../analyse';
import type { IssueDeLaPage, IssueDuRetrait } from '../ecriture/planche';
import type { IssueDeLaDestination, IssueDeLaReprise, IssueDuRetraitDesVariables, ResultatDeLEcriture } from '../ecriture/variables';
import { VERSION_DU_SUIVI, type CadreLu, type EtatDeLaPlanche, type ProfilDuDocument } from '../lecture';
import type { VariablesDuFichier } from '../lectureDesVariables';
import { fraicheurDeLaPlanche, type CadreDUnePalette, type FraicheurDeLaPlanche } from '../planche/fraicheur';
import type { VueDeGestion } from '../preferences';
import { etatDeLaFiche, type EtatDeLaFiche } from '../presentation';
import type { Destination } from '../variables/destination';
import { palettesDuFichier, type PaletteDuFichier } from '../variables/detection';
import { miseAJourDesTokens, tokensDeLaPalette, variablesDesPalettesSupprimees, type TokensDUnePalette, type VariablesOrphelines } from '../variables/gestion';
import { suiviFutur as suiviDesVariablesFutur, variablesSuivies } from '../variables/suivi';
import { creerVuesApercuCompact } from './apercuCompact';
import { createCarte } from './carte';
import { creerVuesConnexion } from './connexion';
import { creerVuesConstats } from './constats';
import { creerVuesDessin, type EtatDuDessin, type GestesDuResultat } from './dessin';
import { creerVuesDestination } from './destination';
import type { GestesDeLaRecetteUi } from './gestesDeLaRecette';
import { memoriserVues, type Localisation, type Texte } from './localisation';
import { creerVuesPageDesPlanches } from './pageDesPlanches';
import { creerSocleLocalise } from './socleLocalise';
import { lignesDeSortie, type LigneDeSortie } from './sorties';
import { type Constat, type ConstatIllustre } from './textes';

export interface OngletGestionUi {
  element: HTMLDivElement;
  /** `luLe` est l'heure du dernier état reçu du sandbox, que le bloc de la connexion écrit en durée ([UI-24]). */
  afficher(classement: Classement, recette: Recette | null, planche: EtatDeLaPlanche, profil: ProfilDuDocument, empreinte: string | null, variables: VariablesDuFichier, luLe: number): void;
  afficherDessin(etat: EtatDuDessin, noms: { readonly [id: string]: string }): void;
  /** Rend les gestes d'écriture inactifs, avec la raison ; `null` les rend (V12.1). */
  bloquer(raison: Texte | null): void;
  /**
   * L'issue de « Supprimer définitivement » ([PLA-27]). Un cadre retiré ou
   * déjà absent quitte la planche par l'état suivant ; sa carte disparaît
   * alors, et le focus passe à la carte suivante, ou au compte des palettes.
   */
  recevoirRetrait(issue: IssueDuRetrait): void;
  /** L'issue de « Enregistrer », dans la carte « Page des planches » ([UI-29]). */
  recevoirPage(issue: IssueDeLaPage): void;
  /** Ce que l'écriture a fait de chaque palette ; `null` quand un rangement refusé l'a abandonnée ([VAR-16]). */
  recevoirVariables(resultat: ResultatDeLEcriture | null): void;
  /** L'issue de « Enregistrer », dans la carte « Destination des tokens » ([UI-30]). */
  recevoirDestination(issue: IssueDeLaDestination): void;
  /** L'issue de « Supprimer les variables… » ([VAR-11]). */
  recevoirRetraitDesVariables(issue: IssueDuRetraitDesVariables): void;
  /** L'issue de « Modifier dans le plugin » ([VAR-13]) ; réussie, l'état relu ouvre Création sur la palette. */
  recevoirReprise(issue: IssueDeLaReprise): void;
}

export interface GestesDeLaGestion extends GestesDuResultat {
  dessiner(palettes: readonly string[], noms: { readonly [id: string]: string }): void;
  versLesPalettes(): void;
  /** Ouvre la palette dans l'onglet Création, dans le thème des fiches (V8.3). */
  modifier(id: string, mode: Mode): void;
  /** Ouvre Vérification sur la palette, dans le thème des fiches ([UI-26]). */
  verifier(id: string, mode: Mode): void;
  /** Relit le fichier, cadres cherchés sur toutes les pages, sans rien écrire ([UI-24], [PLA-26]). */
  synchroniser(): void;
  /** Demande le changement de la page des planches ; `false` quand rien ne part ([PLA-29]). */
  choisirLaPage(page: { id: string } | { nom: string }): boolean;
  /** Range la vue choisie avec les préférences ([UI-25]). */
  rangerLaVue(vue: VueDeGestion): void;
  /** Demande le retrait du cadre d'une palette supprimée ; `false` quand rien ne part, pendant un conflit. */
  retirer(palette: string, cadre: string): boolean;
  /** Écrit les variables des palettes ; `remettre` nomme celles dont le designer remet les couleurs ([VAR-06], [VAR-07]). */
  ecrireLesVariables(palettes: readonly string[], remettre: readonly string[]): void;
  /** Demande le rangement de la destination ; `false` quand rien ne part ([VAR-16]). */
  rangerLaDestination(destination: Destination): boolean;
  /** Demande le retrait des variables d'une palette supprimée ; `false` quand rien ne part ([VAR-11]). */
  retirerLesVariables(palette: string): boolean;
  /** Reprend une palette du fichier dans le plugin ; `false` quand rien ne part ([VAR-13]). */
  reprendre(source: PaletteDuFichier): boolean;
  /** Les gestes de la recette en fichier, dans la carte « Palettes et réglages » (V8.5). */
  recetteEnFichier: GestesDeLaRecetteUi;
}

/** Le nombre de couleurs que l'encart des couleurs changées dans Figma liste ([UI-32]). */
const COULEURS_LISTEES = 6;

function construireVues(i18n: Localisation) {
  const { createButton } = creerSocleLocalise(i18n);
  const { apercuCompact, resultatsDesGaranties } = creerVuesApercuCompact(i18n);
  const { blocDeConstat } = creerVuesConstats(i18n);
  const { blocDuResultat } = creerVuesDessin(i18n);
  const { createConnexion } = creerVuesConnexion(i18n);
  const { createDestination } = creerVuesDestination(i18n);
  const { createPageDesPlanches } = creerVuesPageDesPlanches(i18n);
  const {
    TEXTES, TEXTES_DE_LA_GESTION, TEXTES_DE_LA_PALETTE_SUPPRIMEE, TEXTES_DE_LA_REPRISE, TEXTES_DES_VARIABLES_SUPPRIMEES, TEXTES_DU_DESSIN,
    couleursSurNChangent, origineDesTokens, remplacerNCouleurs, repriseRefusee, titreDuRemplacement,
    avecLeNom, collectionDisparue, confirmationDeLaMiseAJour, copieDeCadre, couleursChangeesALaMain, couleursChangeesDansLePlugin, couleursDeLaPaletteDuFichier, dejaDansLeFichier, detailsTechniques,
    ecrireNVariables, ecritureInterrompue, etNAutres, etatDeLaFicheEcrit, etatDeLaPlancheEcrit, etatDesTokensEcrit, modesRefuses, nomDeLaPalette, nomDejaPris,
    nombreDeVariables, noticeDisplayP3, ouvrirLaFiche, pageDeLaPlanche, palettesDuPlugin, progressionDuDessin, recetteFuture, recetteIllisible, suiviFutur,
    suppressionDesVariablesRefusee, suppressionRefusee, texteDeLEcriture, titreDeLEcriture, titreDesModifiees, valeurDansFigma, valeurDansLePlugin,
    variablesACreer, variablesDisparues, variablesSurUneAutreRecette, verifierLaPalette,
  } = i18n.messages;

  function bouton(texte: Texte, classe: 'bouton-discret' | 'lien-de-constat', surClic: () => void): HTMLButtonElement {
    const element = document.createElement('button');
    element.type = 'button';
    element.className = classe;
    i18n.lier(element, 'textContent', texte);
    element.addEventListener('click', surClic);
    return element;
  }

  /** Une bascule à boutons pressés : la vue, le thème des fiches. */
  function creerBascule<Valeur extends string>(etiquette: Texte, options: readonly (readonly [Valeur, Texte])[], surChoix: (valeur: Valeur) => void) {
    const element = document.createElement('div');
    element.className = 'bascule';
    element.setAttribute('role', 'group');
    i18n.lier(element, 'aria-label', etiquette);
    const boutons = options.map(([valeur, libelle]) => {
      const choix = document.createElement('button');
      choix.type = 'button';
      choix.className = 'bascule-option';
      choix.dataset.valeur = valeur;
      i18n.lier(choix, 'textContent', libelle);
      choix.addEventListener('click', () => surChoix(valeur));
      element.append(choix);
      return { valeur, choix };
    });
    return {
      element,
      rendre(courante: Valeur): void {
        for (const { valeur, choix } of boutons) choix.setAttribute('aria-pressed', String(valeur === courante));
      },
    };
  }

  function pastille(etat: string, libelle: Texte): HTMLSpanElement {
    const marque = document.createElement('span');
    marque.className = 'pastille-d-etat';
    marque.dataset.etat = etat;
    i18n.lier(marque, 'textContent', libelle);
    return marque;
  }

  /** Une couleur dans un encart : sa pastille, puis ce qu'elle vaut et où. */
  function valeur(hexa: string | null, texte: Texte): HTMLSpanElement {
    const element = document.createElement('span');
    element.className = 'valeur';
    if (hexa !== null) {
      const couleur = document.createElement('i');
      // Une couleur qui n'est pas opaque porte huit chiffres : la pastille montre ses six premiers.
      couleur.style.background = hexa.slice(0, 7);
      element.append(couleur);
    }
    element.append(i18n.noeud(texte));
    return element;
  }

  function createOngletGestion(gestes: GestesDeLaGestion, vueInitiale: VueDeGestion): OngletGestionUi {
    const element = document.createElement('div');
    element.className = 'page-stack colonne';

    let vue: VueDeGestion = vueInitiale;
    let mode: Mode = 'light';

    // Le bloc de la connexion, et les deux cartes qui le remplacent le temps d'un choix ([UI-29], [UI-30]).
    const connexion = createConnexion({
      synchroniser: () => gestes.synchroniser(),
      changerLaDestination: () => ouvrirLaDestination(null),
      changerLaPage() {
        if (!planche) return;
        connexion.element.hidden = true;
        destination.fermer();
        pageDesPlanches.ouvrir(planche);
      },
      toutMettreAJour,
    });
    const pageDesPlanches = createPageDesPlanches({
      enregistrer: (page) => gestes.choisirLaPage(page),
      annuler: () => rendreLeBloc(connexion.changerLaPage),
    });
    const destination = createDestination({
      enregistrer: (proposee) => gestes.rangerLaDestination(proposee),
      annuler() {
        apresLaDestination = null;
        rendreLeBloc(connexion.changerLaDestination);
      },
    });

    /** Rend le bloc de la connexion à la place d'une carte, et le focus à son « Changer ». */
    function rendreLeBloc(changer: HTMLButtonElement): void {
      connexion.element.hidden = false;
      changer.focus();
    }

    /**
     * Ouvre la carte de la destination. `ensuite` nomme la palette dont
     * l'écriture attendait une destination confirmée : son encart s'ouvre
     * quand la destination est rangée ([UI-31]).
     */
    function ouvrirLaDestination(ensuite: string | null): void {
      if (!variables) return;
      apresLaDestination = ensuite;
      connexion.element.hidden = true;
      pageDesPlanches.element.hidden = true;
      destination.ouvrir(variables, recette);
    }

    // La barre des palettes : leur compte, la vue, puis le thème des fiches ([UI-25]).
    const compte = document.createElement('p');
    compte.className = 'planche-compte';
    // Le focus y revient quand la dernière carte de palette supprimée disparaît.
    compte.tabIndex = -1;
    const basculeDesVues = creerBascule<VueDeGestion>(
      TEXTES_DE_LA_GESTION.vues,
      [['complete', TEXTES_DE_LA_GESTION.vueComplete], ['condensee', TEXTES_DE_LA_GESTION.vueCondensee]],
      (choisie) => {
        if (choisie === vue) return;
        vue = choisie;
        gestes.rangerLaVue(vue);
        rendre();
      },
    );
    basculeDesVues.element.dataset.bascule = 'vue';
    const basculeDesThemes = creerBascule<Mode>(
      TEXTES_DU_DESSIN.themeDesFiches,
      MODES.map((theme) => [theme, theme === 'light' ? TEXTES.modeClair : TEXTES.modeSombre] as const),
      (choisi) => {
        mode = choisi;
        rendre();
      },
    );
    basculeDesThemes.element.dataset.bascule = 'theme';
    const enTete = document.createElement('div');
    enTete.className = 'planche-tete';
    enTete.append(compte, basculeDesVues.element, basculeDesThemes.element);

    const zoneDuResultat = document.createElement('div');
    zoneDuResultat.hidden = true;
    /** Ce qu'une écriture de variables refuse pour toutes les palettes : la recette a changé, ou le suivi est d'une version plus récente. */
    const zoneDesVariables = document.createElement('div');
    zoneDesVariables.className = 'page-stack';
    zoneDesVariables.hidden = true;
    const liste = document.createElement('div');
    liste.className = 'liste-planche';
    const notices = document.createElement('div');
    notices.className = 'page-stack';
    const vide = document.createElement('div');
    vide.className = 'page-stack';

    // La vue condensée : un tableau sans geste, sous ses en-têtes de colonne ([UI-27]).
    const table = document.createElement('table');
    table.className = 'table-des-palettes';
    const teteDeTable = document.createElement('thead');
    const titres = document.createElement('tr');
    const titreDesTokens = document.createElement('th');
    for (const [titre, cellule] of [
      [TEXTES_DE_LA_GESTION.colonnePalette, document.createElement('th')],
      [TEXTES_DE_LA_GESTION.colonneNuances, document.createElement('th')],
      [TEXTES_DE_LA_GESTION.tokensFigma, titreDesTokens],
      [TEXTES_DE_LA_GESTION.planche, document.createElement('th')],
    ] as const) {
      cellule.scope = 'col';
      i18n.lier(cellule, 'textContent', titre);
      titres.append(cellule);
    }
    teteDeTable.append(titres);
    const corpsDeTable = document.createElement('tbody');
    table.append(teteDeTable, corpsDeTable);
    table.hidden = true;

    // La confirmation de « Tout mettre à jour » : elle garde ce qu'elle confirme.
    const confirmation = document.createElement('div');
    confirmation.className = 'confirmation';
    const texteDeConfirmation = document.createElement('p');
    const gestesDeConfirmation = document.createElement('div');
    gestesDeConfirmation.className = 'confirmation-gestes';
    confirmation.append(texteDeConfirmation, gestesDeConfirmation);
    confirmation.hidden = true;
    let aConfirmer: { readonly variables: readonly string[]; readonly planches: readonly string[] } | null = null;
    const confirmer = createButton({
      label: TEXTES_DU_DESSIN.confirmer,
      onClick: () => {
        const confirmees = aConfirmer;
        aConfirmer = null;
        confirmation.hidden = true;
        if (!confirmees) return;
        // Les tokens d'abord, puis les planches, quand l'écriture est revenue ([UI-28]).
        if (confirmees.variables.length > 0) {
          planchesApresLesVariables = confirmees.planches;
          ecrire(confirmees.variables, []);
        } else lancer(confirmees.planches);
      },
    });
    confirmer.dataset.geste = 'confirmer';
    gestesDeConfirmation.append(
      confirmer,
      createButton({
        label: TEXTES_DU_DESSIN.annuler,
        variant: 'secondary',
        onClick: () => {
          aConfirmer = null;
          confirmation.hidden = true;
        },
      }),
    );

    // Import, export, rapport et détails techniques, repliés (V8.5).
    const carteDeLaRecette = createCarte({ titre: TEXTES_DU_DESSIN.palettesEtReglages, repliable: { ouverte: false } }, i18n);
    const details = document.createElement('p');
    details.className = 'ligne-secondaire';
    carteDeLaRecette.corps.append(gestes.recetteEnFichier.element, details);

    // Les palettes supprimées dont le cadre ou des variables restent dans Figma, puis l'issue du dernier retrait ([PLA-27], [VAR-11]).
    const supprimees = document.createElement('div');
    supprimees.className = 'liste-planche';
    const annonceDuRetrait = document.createElement('div');
    annonceDuRetrait.className = 'page-stack';
    annonceDuRetrait.setAttribute('role', 'status');
    annonceDuRetrait.hidden = true;

    // Les palettes que les variables du fichier portent hors du plugin, sous un filet et un titre ([UI-33]).
    const separation = document.createElement('div');
    separation.className = 'separation';
    const titreDuFichier = document.createElement('h3');
    titreDuFichier.className = 'titre-de-section';
    const sousTitreDuFichier = document.createElement('p');
    i18n.lier(sousTitreDuFichier, 'textContent', TEXTES_DE_LA_GESTION.horsDuPlugin);
    separation.append(titreDuFichier, sousTitreDuFichier);
    separation.hidden = true;
    const listeDuFichier = document.createElement('div');
    listeDuFichier.className = 'liste-planche';

    element.append(
      connexion.element, destination.element, pageDesPlanches.element, confirmation, zoneDesVariables, zoneDuResultat,
      enTete, vide, liste, table, supprimees, annonceDuRetrait, separation, listeDuFichier, notices, carteDeLaRecette.element,
    );

    let recette: Recette | null = null;
    let planche: EtatDeLaPlanche | null = null;
    let variables: VariablesDuFichier | null = null;
    /**
     * La fraîcheur, les analyses et l'état des tokens ne dépendent ni du
     * thème des fiches ni de la vue : ils se calculent à chaque état lu, pas
     * à chaque bascule.
     */
    let fraicheur: FraicheurDeLaPlanche | null = null;
    const analyses = new Map<string, ReturnType<typeof analyserPalette>>();
    /** L'état des tokens de chaque palette ; vide quand le suivi des variables vient d'une version plus récente. */
    let tokens = new Map<string, TokensDUnePalette>();
    let orphelines: readonly VariablesOrphelines[] = [];
    /** Les palettes que les variables du fichier portent et que le suivi ne désigne pas ([VAR-12]). */
    let duFichier: readonly PaletteDuFichier[] = [];
    let profil: ProfilDuDocument = 'SRGB';
    let luLe = Date.now();
    /** Les palettes dont « Tout mettre à jour » dessinerait la planche, dans l'ordre de la recette ([UI-28]). */
    let enRetard: readonly string[] = [];
    /**
     * Les palettes dont le cadre reste introuvable après une recherche sur
     * toutes les pages : leur planche se recrée sans risque de doublon. Un
     * cadre introuvable sur la seule page des planches attend « Synchroniser ».
     */
    let absentes: ReadonlySet<string> = new Set();
    let enCours = false;
    let blocage: Texte | null = null;
    /** Vrai entre une demande d'écriture de variables et son résultat : aucune autre ne part. */
    let ecritureEnCours = false;
    /** La palette dont l'encart d'écriture est ouvert ([UI-31]). */
    let encart: string | null = null;
    /** La palette dont l'encart s'ouvre quand la destination est rangée. */
    let apresLaDestination: string | null = null;
    /** Les palettes dont le designer a replié l'encart des couleurs changées, pour la session ([UI-32]). */
    const laissees = new Set<string>();
    /** Ce que la dernière écriture a refusé à une palette, que sa fiche montre jusqu'à l'écriture suivante. */
    const refusDesTokens = new Map<string, ConstatIllustre>();
    /** Les planches que « Tout mettre à jour » dessine quand l'écriture des tokens est revenue. */
    let planchesApresLesVariables: readonly string[] | null = null;
    /** La palette supprimée dont la suppression des variables attend sa confirmation, puis son issue. */
    let variablesAConfirmer: string | null = null;
    let retraitDesVariablesEnCours = false;
    /** Vrai entre « Modifier dans le plugin » et son issue : aucune autre reprise ne part. */
    let repriseEnCours = false;
    /** Le retrait demandé, jusqu'à son issue : le cadre, son nom et le rang de sa carte. */
    let retraitEnCours: { readonly cadre: string; readonly nom: string; readonly rang: number } | null = null;
    /** Le rang de la carte retirée, que le focus rejoint au rendu qui la fait disparaître. */
    let focusApresRetrait: number | null = null;
    /** La palette dont la fiche vient en vue au rendu qui suit le clic sur sa ligne du tableau. */
    let ficheAMontrer: string | null = null;
    /** Le geste d'une fiche que le focus rejoint au rendu suivant : l'encart qui s'ouvre, ou le geste qu'il rend. */
    let gesteAFocaliser: { readonly palette: string; readonly geste: string } | null = null;

    /** Les gestes d'écriture, inactifs pendant un dessin, une écriture de variables ou un conflit d'enregistrement. */
    function rendreLesGestes(): void {
      const inactif = enCours || ecritureEnCours || blocage !== null;
      for (const geste of [connexion.toutMettreAJour, confirmer, ...Array.from(liste.querySelectorAll<HTMLButtonElement>('[data-geste="generer"]'))]) {
        geste.disabled = inactif;
        i18n.lier(geste, 'title', blocage ?? '');
      }
      for (const geste of [...Array.from(liste.querySelectorAll<HTMLButtonElement>('[data-ecriture]')), ...Array.from(listeDuFichier.querySelectorAll<HTMLButtonElement>('[data-geste="reprendre"]'))]) {
        geste.disabled = inactif || repriseEnCours;
        i18n.lier(geste, 'title', blocage === null ? '' : TEXTES_DE_LA_GESTION.variablesEnConflit);
      }
      // Un suivi d'une version plus récente refuse le changement avant toute écriture ([PLA-29], [VAR-16]).
      connexion.changerLaPage.disabled = inactif || planche === null || planche.suiviFutur;
      i18n.lier(connexion.changerLaPage, 'title', blocage ?? '');
      connexion.changerLaDestination.disabled = inactif || variables === null;
      i18n.lier(connexion.changerLaDestination, 'title', blocage ?? '');
      for (const geste of Array.from(supprimees.querySelectorAll<HTMLButtonElement>('[data-geste="supprimer"], [data-geste="supprimer-variables"], [data-geste="confirmer-variables"]'))) {
        geste.disabled = inactif || retraitEnCours !== null || retraitDesVariablesEnCours;
        i18n.lier(geste, 'title', blocage === null ? '' : TEXTES_DE_LA_PALETTE_SUPPRIMEE.enConflit);
      }
    }

    function retirer(cadre: CadreLu, rang: number): void {
      if (retraitEnCours || !gestes.retirer(cadre.palette, cadre.cadre)) return;
      retraitEnCours = { cadre: cadre.cadre, nom: cadre.nom, rang };
      annonceDuRetrait.replaceChildren();
      rendreLesGestes();
    }

    /**
     * La carte d'une palette supprimée : son nom, ce qui reste d'elle dans
     * Figma, et un geste par reste. « Supprimer les variables… » demande
     * confirmation dans la carte ([VAR-11]).
     */
    function carteSupprimee(palette: string, cadre: CadreLu | undefined, restes: VariablesOrphelines | undefined, rang: number): HTMLElement {
      const carte = createCarte({ titre: cadre?.nom ?? restes?.chemin ?? palette }, i18n);
      carte.element.classList.add('fiche-planche', 'carte-supprimee');
      carte.element.dataset.supprimee = palette;
      if (cadre) carte.element.dataset.cadre = cadre.cadre;
      const texte = document.createElement('p');
      i18n.lier(texte, 'textContent', restes ? TEXTES_DES_VARIABLES_SUPPRIMEES.texte(restes.variables) : TEXTES_DE_LA_PALETTE_SUPPRIMEE.texte);
      const gestesDeLaCarte = document.createElement('div');
      gestesDeLaCarte.className = 'fiche-gestes';
      if (cadre) {
        const voir = createButton({ label: TEXTES_DU_DESSIN.voirSurLaPlanche, variant: 'secondary', compact: true, onClick: () => gestes.voirSurLaPlanche(cadre.page, [cadre.cadre]) });
        voir.dataset.geste = 'voir';
        const supprimer = createButton({ label: TEXTES_DE_LA_PALETTE_SUPPRIMEE.supprimer, variant: 'danger', compact: true, onClick: () => retirer(cadre, rang) });
        supprimer.dataset.geste = 'supprimer';
        gestesDeLaCarte.append(voir, supprimer);
      }
      carte.corps.append(texte, gestesDeLaCarte);
      if (restes && variablesAConfirmer === palette) {
        const demande = document.createElement('div');
        demande.className = 'confirmation';
        const question = document.createElement('p');
        i18n.lier(question, 'textContent', TEXTES_DES_VARIABLES_SUPPRIMEES.confirmation(restes.variables));
        const choix = document.createElement('div');
        choix.className = 'confirmation-gestes';
        const oui = createButton({
          label: TEXTES_DES_VARIABLES_SUPPRIMEES.confirmer(restes.variables),
          variant: 'danger',
          compact: true,
          onClick: () => {
            if (retraitDesVariablesEnCours || !gestes.retirerLesVariables(palette)) return;
            retraitDesVariablesEnCours = true;
            annonceDuRetrait.replaceChildren();
            rendreLesGestes();
          },
        });
        oui.dataset.geste = 'confirmer-variables';
        const non = createButton({
          label: TEXTES_DE_LA_GESTION.annuler,
          variant: 'secondary',
          compact: true,
          onClick: () => {
            variablesAConfirmer = null;
            rendre();
          },
        });
        non.dataset.geste = 'annuler-variables';
        choix.append(oui, non);
        demande.append(question, choix);
        carte.corps.append(demande);
      } else if (restes) {
        const supprimer = createButton({
          label: TEXTES_DE_LA_GESTION.supprimerLesVariables,
          variant: 'danger',
          compact: true,
          onClick: () => {
            variablesAConfirmer = palette;
            rendre();
            supprimees.querySelector<HTMLElement>(`.carte-supprimee[data-supprimee="${palette}"] [data-geste="confirmer-variables"]`)?.focus();
          },
        });
        supprimer.dataset.geste = 'supprimer-variables';
        gestesDeLaCarte.append(supprimer);
      }
      return carte.element;
    }

    const noms = (): { [id: string]: string } =>
      Object.fromEntries((recette?.palettes ?? []).map((palette) => [palette.id, nomDeLaPalette(palette)]));

    /**
     * Le geste d'une fiche qui a lancé la génération en cours : le panneau
     * inerte perd le focus, qui revient à ce geste, ou à « Modifier » de la
     * même fiche quand la planche n'en demande plus (Y6.3).
     */
    let gesteDeLaGeneration: { readonly palette: string; readonly geste: string } | null = null;

    /** Rend le focus au geste qui a lancé la génération, une fois qu'elle n'est plus en cours. */
    function rendreLeFocus(): void {
      if (!gesteDeLaGeneration || enCours) return;
      const fiche = liste.querySelector<HTMLElement>(`.fiche-planche[data-palette="${gesteDeLaGeneration.palette}"]`);
      const cible = fiche?.querySelector<HTMLElement>(`[data-geste="${gesteDeLaGeneration.geste}"]`) ?? fiche?.querySelector<HTMLElement>('[data-geste="modifier"]');
      cible?.focus();
    }

    function lancer(palettes: readonly string[]): void {
      if (palettes.length === 0) return;
      gestes.dessiner(palettes, noms());
    }

    /** Demande l'écriture des variables : une seule est en vol, et la fiche oublie le refus de l'écriture d'avant. */
    function ecrire(palettes: readonly string[], remettre: readonly string[]): void {
      if (ecritureEnCours || palettes.length === 0) return;
      ecritureEnCours = true;
      for (const id of palettes) refusDesTokens.delete(id);
      zoneDesVariables.replaceChildren();
      zoneDesVariables.hidden = true;
      rendreLesGestes();
      gestes.ecrireLesVariables(palettes, remettre);
    }

    /**
     * « Tout mettre à jour » ([UI-28]) : les tokens puis les planches des
     * palettes en retard ou absentes, après une confirmation qui compte ce
     * qui s'écrit. Tant que la destination n'est pas confirmée, sa carte
     * s'ouvre d'abord.
     */
    function toutMettreAJour(): void {
      if (!recette || !variables) return;
      const mise = miseAJourDesTokens(recette, tokens);
      if (mise.palettes.length === 0 && enRetard.length === 0) return;
      if (mise.palettes.length > 0 && !variables.suivi.confirmee) {
        ouvrirLaDestination(null);
        return;
      }
      aConfirmer = { variables: mise.palettes, planches: enRetard };
      i18n.lier(texteDeConfirmation, 'textContent', confirmationDeLaMiseAJour({ creees: mise.creees, ecrites: mise.ecrites, planches: enRetard.length, modifiees: mise.modifiees }));
      confirmation.hidden = false;
      confirmer.focus();
    }

    function analyseDe(lue: Recette, id: string): ReturnType<typeof analyserPalette> {
      const analyse = analyses.get(id) ?? analyserPalette(lue, lue.palettes.find((candidate) => candidate.id === id)!);
      analyses.set(id, analyse);
      return analyse;
    }

    /** Un geste d'écriture des tokens, dans une ligne ou un encart : inactif pendant une écriture ou un conflit. */
    function gesteDEcriture(libelle: Texte, variant: 'primary' | 'secondary', geste: string, surClic: () => void): HTMLButtonElement {
      const element = createButton({ label: libelle, variant, compact: true, onClick: surClic });
      element.dataset.geste = geste;
      element.dataset.ecriture = 'true';
      return element;
    }

    /**
     * Ouvre l'encart d'écriture d'une palette ; sans destination confirmée, la
     * carte de la destination d'abord ([UI-31]). Une palette reprise du
     * fichier écrit dans ses variables d'origine : la destination ne la
     * concerne pas.
     */
    function ouvrirLEcriture(id: string): void {
      if (!variables) return;
      if (!variables.suivi.confirmee && !tokens.get(id)?.reprise) {
        ouvrirLaDestination(id);
        return;
      }
      encart = id;
      gesteAFocaliser = { palette: id, geste: 'confirmer-ecriture' };
      rendre();
    }

    /** La ligne « Tokens Figma » d'une fiche : l'état des variables, ce qu'il compte, et le geste qu'il demande ([UI-26]). */
    function ligneDesTokens(id: string, etat: TokensDUnePalette): LigneDeSortie {
      const ligne = { sortie: 'tokens' as const, nom: TEXTES_DE_LA_GESTION.tokensFigma, etat: etat.etat, libelle: etatDesTokensEcrit(etat.etat) };
      // L'encart ouvert porte le geste : la ligne n'en garde pas.
      const mettreAJour = (variant: 'primary' | 'secondary'): HTMLElement[] => (encart === id ? [] : [gesteDEcriture(
        TEXTES_DE_LA_GESTION.mettreAJour,
        variant,
        'mettre-a-jour',
        () => {
          if (etat.etat === 'modifies') {
            laissees.delete(id);
            gesteAFocaliser = { palette: id, geste: 'remettre' };
            rendre();
          } else if (etat.aCreer.length > 0 || (etat.reprise && etat.aRemplacer > 0)) ouvrirLEcriture(id);
          else {
            gesteAFocaliser = { palette: id, geste: 'modifier' };
            ecrire([id], []);
          }
        },
      )]);
      if (etat.reprise && (etat.etat === 'a-jour' || etat.etat === 'a-mettre-a-jour')) {
        // Une palette reprise : sa collection et son chemin d'origine, puis ce que la mise à jour remplacerait ([UI-34]).
        const origine = origineDesTokens(etat.collection ?? TEXTES_DE_LA_GESTION.collectionIntrouvable, etat.origine ?? '');
        return etat.etat === 'a-jour'
          ? { ...ligne, detail: i18n.composer`${origine} · ${nombreDeVariables(etat.variables)}`, gestes: [] }
          : { ...ligne, detail: i18n.composer`${origine} · ${couleursSurNChangent(etat.aRemplacer, etat.variables)}`, gestes: mettreAJour('primary') };
      }
      switch (etat.etat) {
        case 'jamais-ecrits':
          return {
            ...ligne,
            detail: variablesACreer(etat.aCreer.length),
            gestes: encart === id ? [] : [gesteDEcriture(TEXTES_DE_LA_GESTION.ecrireDansLesTokens, 'primary', 'ecrire', () => ouvrirLEcriture(id))],
          };
        case 'a-jour':
          return { ...ligne, detail: nombreDeVariables(etat.variables), gestes: [] };
        case 'a-mettre-a-jour': {
          const changees = etat.aEcrire.filter((couleur) => couleur.ecrite !== null).length;
          const detail = etat.destinationChangee
            ? i18n.composer`${TEXTES_DE_LA_GESTION.destinationChangee} · ${variablesACreer(etat.aCreer.length)}`
            : changees > 0 ? couleursChangeesDansLePlugin(changees) : variablesACreer(etat.aCreer.length);
          return { ...ligne, detail, gestes: mettreAJour('primary') };
        }
        case 'modifies':
          // L'encart des couleurs changées porte les deux choix ; replié, la ligne le rouvre.
          return { ...ligne, detail: couleursChangeesALaMain(etat.modifiees.length), gestes: laissees.has(id) ? mettreAJour('secondary') : [] };
        case 'introuvables':
          return { ...ligne, detail: variablesDisparues(etat.introuvables.length), gestes: mettreAJour('primary') };
      }
    }

    /** L'encart d'une écriture qui crée des variables : combien, où, sous quels noms, puis « Écrire » ([UI-31]). */
    function encartDeLEcriture(id: string, nom: string, etat: TokensDUnePalette): HTMLDivElement {
      const bloc = document.createElement('div');
      bloc.className = 'encart';
      bloc.dataset.encart = 'ecriture';
      const titre = document.createElement('p');
      titre.className = 'encart-titre';
      i18n.lier(titre, 'textContent', titreDeLEcriture(nom));
      const texte = document.createElement('p');
      texte.className = 'ligne-secondaire';
      const collection: Texte = etat.collection ?? TEXTES_DE_LA_GESTION.collectionIntrouvable;
      i18n.lier(texte, 'textContent', texteDeLEcriture(etat.aCreer.length, collection, etat.aCreer[0] ?? '', etat.aCreer[etat.aCreer.length - 1] ?? '', etat.aRemplacer));
      const choix = document.createElement('div');
      choix.className = 'confirmation-gestes';
      const annuler = createButton({
        label: TEXTES_DE_LA_GESTION.annuler,
        variant: 'secondary',
        compact: true,
        onClick: () => {
          encart = null;
          gesteAFocaliser = { palette: id, geste: etat.etat === 'jamais-ecrits' ? 'ecrire' : 'mettre-a-jour' };
          rendre();
        },
      });
      annuler.dataset.geste = 'annuler-ecriture';
      choix.append(annuler, gesteDEcriture(ecrireNVariables(etat.aCreer.length), 'primary', 'confirmer-ecriture', () => {
        gesteAFocaliser = { palette: id, geste: 'modifier' };
        ecrire([id], []);
      }));
      bloc.append(titre, texte, choix);
      return bloc;
    }

    /**
     * L'encart de remplacement d'une palette reprise ([UI-34]) : les couleurs
     * qui changent, la valeur de Figma et celle du plugin côte à côte, ce que
     * les variables gardent, puis « Remplacer N couleurs ».
     */
    function encartDuRemplacement(id: string, nom: string, etat: TokensDUnePalette): HTMLDivElement {
      const bloc = document.createElement('div');
      bloc.className = 'encart';
      bloc.dataset.encart = 'remplacement';
      bloc.dataset.ton = 'avertissement';
      const titre = document.createElement('p');
      titre.className = 'encart-titre';
      i18n.lier(titre, 'textContent', titreDuRemplacement(etat.aRemplacer, nom));
      bloc.append(titre);
      const changees = etat.aEcrire.filter((couleur) => couleur.ecrite !== null);
      for (const couleur of changees.slice(0, COULEURS_LISTEES)) {
        const ecart = document.createElement('div');
        ecart.className = 'ecart';
        const variable = document.createElement('code');
        variable.textContent = couleur.nom;
        ecart.append(variable, valeur(couleur.ecrite, valeurDansFigma(couleur.ecrite!)), valeur(couleur.plugin, valeurDansLePlugin(couleur.plugin)));
        bloc.append(ecart);
      }
      const suite = document.createElement('p');
      suite.className = 'ligne-secondaire';
      i18n.lier(suite, 'textContent', changees.length > COULEURS_LISTEES
        ? i18n.composer`${etNAutres(changees.length - COULEURS_LISTEES)} ${TEXTES_DE_LA_REPRISE.gardentLeurNom}`
        : TEXTES_DE_LA_REPRISE.gardentLeurNom);
      bloc.append(suite);
      const choix = document.createElement('div');
      choix.className = 'confirmation-gestes';
      const annuler = createButton({
        label: TEXTES_DE_LA_GESTION.annuler,
        variant: 'secondary',
        compact: true,
        onClick: () => {
          encart = null;
          gesteAFocaliser = { palette: id, geste: 'mettre-a-jour' };
          rendre();
        },
      });
      annuler.dataset.geste = 'annuler-ecriture';
      choix.append(annuler, gesteDEcriture(remplacerNCouleurs(etat.aRemplacer), 'primary', 'confirmer-ecriture', () => {
        gesteAFocaliser = { palette: id, geste: 'modifier' };
        ecrire([id], []);
      }));
      bloc.append(choix);
      return bloc;
    }

    /** L'encart d'une palette « Modifiés dans Figma » : chaque couleur, côte à côte, puis les deux choix ([UI-32]). */
    function encartDesModifiees(id: string, nom: string, etat: TokensDUnePalette): HTMLDivElement {
      const bloc = document.createElement('div');
      bloc.className = 'encart';
      bloc.dataset.encart = 'modifiees';
      bloc.dataset.ton = 'avertissement';
      const titre = document.createElement('p');
      titre.className = 'encart-titre';
      i18n.lier(titre, 'textContent', titreDesModifiees(etat.modifiees.length, nom));
      bloc.append(titre);
      for (const couleur of etat.modifiees.slice(0, COULEURS_LISTEES)) {
        const ecart = document.createElement('div');
        ecart.className = 'ecart';
        const variable = document.createElement('code');
        variable.textContent = couleur.nom;
        ecart.append(
          variable,
          valeur(couleur.figma, couleur.figma === null ? TEXTES_DE_LA_GESTION.aliasDansFigma : valeurDansFigma(couleur.figma)),
          valeur(couleur.plugin, valeurDansLePlugin(couleur.plugin)),
        );
        bloc.append(ecart);
      }
      if (etat.modifiees.length > COULEURS_LISTEES) {
        const suite = document.createElement('p');
        suite.className = 'ligne-secondaire';
        i18n.lier(suite, 'textContent', etNAutres(etat.modifiees.length - COULEURS_LISTEES));
        bloc.append(suite);
      }
      const choix = document.createElement('div');
      choix.className = 'confirmation-gestes';
      const laisser = createButton({
        label: TEXTES_DE_LA_GESTION.laisser,
        variant: 'secondary',
        compact: true,
        onClick: () => {
          // Rien ne se range : l'état reste « Modifiés dans Figma », et l'encart se replie pour la session.
          laissees.add(id);
          gesteAFocaliser = { palette: id, geste: 'mettre-a-jour' };
          rendre();
        },
      });
      laisser.dataset.geste = 'laisser';
      choix.append(laisser, gesteDEcriture(TEXTES_DE_LA_GESTION.remettre, 'primary', 'remettre', () => {
        gesteAFocaliser = { palette: id, geste: 'modifier' };
        ecrire([id], [id]);
      }));
      bloc.append(choix);
      return bloc;
    }

    /** La ligne « Planche » d'une fiche : l'état du cadre, où il se trouve, et le geste qu'il demande ([UI-26]). */
    function ligneDeLaPlanche(id: string, cadre: CadreDUnePalette, sansGeneration: boolean): LigneDeSortie {
      const generer = (libelle: Texte): HTMLElement[] => {
        if (sansGeneration) return [];
        const geste = createButton({
          label: libelle,
          variant: 'secondary',
          compact: true,
          onClick: () => {
            gesteDeLaGeneration = { palette: id, geste: 'generer' };
            lancer([id]);
          },
        });
        geste.dataset.geste = 'generer';
        return [geste];
      };
      const afficher = (): HTMLElement[] => {
        if (!cadre.cadre || !cadre.page) return [];
        const geste = createButton({ label: TEXTES_DE_LA_GESTION.afficher, variant: 'secondary', compact: true, onClick: () => gestes.voirSurLaPlanche(cadre.page!, [cadre.cadre!]) });
        geste.dataset.geste = 'voir';
        return [geste];
      };
      const page: Texte = cadre.nomDeLaPage ? pageDeLaPlanche(cadre.nomDeLaPage) : '';
      const ligne = { sortie: 'planche' as const, nom: TEXTES_DE_LA_GESTION.planche, etat: cadre.etat, libelle: etatDeLaPlancheEcrit(cadre.etat) };
      switch (cadre.etat) {
        case 'jamais-dessinee':
          return { ...ligne, detail: '', gestes: generer(TEXTES_DE_LA_GESTION.creerLaPlanche) };
        case 'a-jour':
          return { ...ligne, detail: page, gestes: afficher() };
        case 'perimee':
          return { ...ligne, detail: page, gestes: [...generer(TEXTES_DE_LA_GESTION.actualiser), ...afficher()] };
        case 'introuvable':
          return absentes.has(id)
            ? { ...ligne, detail: TEXTES_DE_LA_GESTION.introuvableDansLeFichier, gestes: generer(TEXTES_DE_LA_GESTION.creerLaPlanche) }
            : { ...ligne, detail: TEXTES_DE_LA_GESTION.introuvableSurLaPage, gestes: [] };
        case 'illisible':
          return { ...ligne, detail: TEXTES_DE_LA_GESTION.illisible, gestes: [] };
      }
    }

    function ficheDePalette(lue: Recette, id: string, cadre: CadreDUnePalette, sansGeneration: boolean): HTMLElement {
      const palette = lue.palettes.find((candidate) => candidate.id === id)!;
      const analyse = analyseDe(lue, id);
      const nom = nomDeLaPalette(palette);
      const etatDesTokens = tokens.get(id);
      const etat: EtatDeLaFiche = etatDeLaFiche(etatDesTokens?.etat ?? null, cadre.etat);
      const fiche = createCarte({ titre: nom }, i18n);
      fiche.element.classList.add('fiche-planche');
      fiche.element.dataset.palette = id;
      fiche.element.dataset.etat = etat;

      // L'état le plus urgent des sorties, puis « Modifier », qui ouvre Création sur la palette.
      const tete = document.createElement('span');
      tete.className = 'tete-gestes';
      const modifier = bouton(TEXTES_DE_LA_GESTION.modifier, 'bouton-discret', () => gestes.modifier(id, mode));
      modifier.dataset.geste = 'modifier';
      tete.append(pastille(etat, etatDeLaFicheEcrit(etat)), modifier);
      fiche.tete.append(tete);

      // La référence : sa pastille, son code, et la nuance qui la porte dans le thème des fiches.
      const reference = document.createElement('span');
      reference.className = 'fiche-reference ligne-secondaire';
      const teinte = document.createElement('i');
      teinte.className = 'fiche-teinte';
      teinte.style.background = palette.reference;
      reference.append(teinte, i18n.noeud(i18n.composer`${palette.reference} ◆ ${avecLeNom(analyse.ancrage.profil, TEXTES.numeroDeNuance(analyse.ancrage.crans[mode]))}`));
      // Le résultat des garanties ouvre Vérification sur la palette : une garantie manquée n'empêche aucune écriture.
      const garanties = resultatsDesGaranties(analyse, mode, 'button');
      garanties.dataset.geste = 'verifier';
      i18n.lier(garanties, 'title', verifierLaPalette(nom));
      garanties.addEventListener('click', () => gestes.verifier(id, mode));
      const information = document.createElement('div');
      information.className = 'fiche-information';
      information.append(reference, garanties);

      const sorties = [...(etatDesTokens ? [ligneDesTokens(id, etatDesTokens)] : []), ligneDeLaPlanche(id, cadre, sansGeneration)];
      fiche.corps.append(apercuCompact(lue, analyse, mode), information, lignesDeSortie(sorties, i18n));
      if (etatDesTokens && encart === id) fiche.corps.append(etatDesTokens.reprise ? encartDuRemplacement(id, nom, etatDesTokens) : encartDeLEcriture(id, nom, etatDesTokens));
      else if (etatDesTokens?.etat === 'modifies' && !laissees.has(id)) fiche.corps.append(encartDesModifiees(id, nom, etatDesTokens));
      const refus = refusDesTokens.get(id);
      if (refus) fiche.corps.append(blocDeConstat(refus, 'alerte'));
      return fiche.element;
    }

    /** Passe à la vue complète et amène la fiche de la palette en vue ([UI-27]). */
    function ouvrirLaFicheDe(id: string): void {
      vue = 'complete';
      gestes.rangerLaVue(vue);
      ficheAMontrer = id;
      rendre();
    }

    /** Une ligne du tableau : le nom, la rampe de la dernière intensité en miniature, l'état de chaque sortie. */
    function ligneDeTable(lue: Recette, id: string, cadre: CadreDUnePalette): HTMLTableRowElement {
      const palette = lue.palettes.find((candidate) => candidate.id === id)!;
      const analyse = analyseDe(lue, id);
      const nom = nomDeLaPalette(palette);
      const rangee = document.createElement('tr');
      rangee.className = 'table-ligne';
      rangee.dataset.palette = id;
      // Le clic sur le nom remonte à la ligne : la ligne entière ouvre la fiche, et le bouton la rend atteignable au clavier.
      rangee.addEventListener('click', () => ouvrirLaFicheDe(id));

      const enTeteDeLigne = document.createElement('th');
      enTeteDeLigne.scope = 'row';
      const ouvrir = document.createElement('button');
      ouvrir.type = 'button';
      ouvrir.className = 'table-nom';
      ouvrir.dataset.geste = 'ouvrir';
      i18n.lier(ouvrir, 'aria-label', ouvrirLaFiche(nom));
      const teinte = document.createElement('i');
      teinte.className = 'fiche-teinte';
      teinte.style.background = palette.reference;
      const texte = document.createElement('span');
      texte.textContent = nom;
      ouvrir.append(teinte, texte);
      enTeteDeLigne.append(ouvrir);

      const nuances = document.createElement('td');
      const rampe = document.createElement('div');
      rampe.className = 'mini-rampe';
      rampe.setAttribute('aria-hidden', 'true');
      for (const cran of rampeDe(analyse.rampes, analyse.intensites[analyse.intensites.length - 1])[mode]) {
        const nuance = document.createElement('span');
        nuance.style.background = cran.hexa;
        rampe.append(nuance);
      }
      nuances.append(rampe);

      const etatDesTokens = tokens.get(id);
      const celluleDesTokens = document.createElement('td');
      if (etatDesTokens) celluleDesTokens.append(pastille(etatDesTokens.etat, etatDesTokensEcrit(etatDesTokens.etat)));
      const etat = document.createElement('td');
      etat.append(pastille(cadre.etat, etatDeLaPlancheEcrit(cadre.etat)));
      rangee.append(enTeteDeLigne, nuances, ...(tokens.size > 0 ? [celluleDesTokens] : []), etat);
      return rangee;
    }

    /** Le nom d'une palette du fichier : son chemin, ou sa collection quand ses variables sont à la racine. */
    const nomDuFichier = (palette: PaletteDuFichier): string => palette.chemin || palette.nomDeLaCollection;

    /** Les couleurs du premier mode d'une palette du fichier, une pastille par nuance ; un alias laisse la sienne vide. */
    function pastillesDuFichier(palette: PaletteDuFichier): HTMLSpanElement[] {
      const couleurs = palette.modes.length > 0 ? palette.couleurs[palette.modes[0].id] ?? [] : [];
      return palette.nuances.map((_, rang) => {
        const nuance = document.createElement('span');
        const couleur = couleurs[rang];
        if (couleur) nuance.style.background = couleur.slice(0, 7);
        return nuance;
      });
    }

    /**
     * La fiche d'une palette du fichier : en tirets, sans fond, l'étiquette
     * « Variables du fichier » et « Modifier dans le plugin » en tête, la
     * rampe de son premier mode, puis sa collection, son chemin, son nombre
     * de couleurs et ses modes ([UI-33]). Le geste la reprend dans le plugin
     * ([UI-34]).
     */
    function ficheDuFichier(palette: PaletteDuFichier): HTMLElement {
      const fiche = createCarte({ titre: nomDuFichier(palette) }, i18n);
      fiche.element.classList.add('fiche-planche', 'fiche-du-fichier');
      fiche.element.dataset.duFichier = `${palette.collection}/${palette.chemin}`;
      const tete = document.createElement('span');
      tete.className = 'tete-gestes';
      const etiquette = document.createElement('span');
      etiquette.className = 'etiquette';
      i18n.lier(etiquette, 'textContent', TEXTES_DE_LA_GESTION.variablesDuFichier);
      const reprendre = bouton(TEXTES_DE_LA_GESTION.modifierDansLePlugin, 'bouton-discret', () => {
        if (repriseEnCours || !gestes.reprendre(palette)) return;
        repriseEnCours = true;
        zoneDesVariables.replaceChildren();
        zoneDesVariables.hidden = true;
        rendreLesGestes();
      });
      reprendre.dataset.geste = 'reprendre';
      tete.append(etiquette, reprendre);
      fiche.tete.append(tete);

      const apercu = document.createElement('div');
      apercu.className = 'fiche-apercu';
      apercu.style.setProperty('--colonnes', String(palette.nuances.length));
      apercu.setAttribute('aria-hidden', 'true');
      const rangee = document.createElement('div');
      rangee.className = 'fiche-rangee';
      const profil = document.createElement('span');
      profil.className = 'fiche-profil';
      rangee.append(profil, ...pastillesDuFichier(palette).map((nuance) => {
        nuance.className = 'fiche-pastille';
        return nuance;
      }));
      apercu.append(rangee);

      const information = document.createElement('div');
      information.className = 'fiche-information';
      const ligne = document.createElement('span');
      ligne.className = 'ligne-secondaire chemin';
      const chemin = document.createElement('code');
      const bouts = `${palette.nuances[0]} … ${palette.nuances[palette.nuances.length - 1]}`;
      chemin.textContent = [palette.nomDeLaCollection, ...palette.chemin.split('/').filter(Boolean), bouts].join(' / ');
      ligne.append(chemin, i18n.noeud(couleursDeLaPaletteDuFichier(palette.nuances.length, palette.modes.map((modeLu) => modeLu.nom))));
      information.append(ligne);
      fiche.corps.append(apercu, information);
      return fiche.element;
    }

    /** La ligne d'une palette du fichier, dans le tableau : son nom, sa rampe, et l'étiquette à la place des états ([UI-27]). */
    function ligneDuFichier(palette: PaletteDuFichier): HTMLTableRowElement {
      const rangee = document.createElement('tr');
      rangee.className = 'table-ligne-du-fichier';
      const enTeteDeLigne = document.createElement('th');
      enTeteDeLigne.scope = 'row';
      enTeteDeLigne.textContent = nomDuFichier(palette);
      const nuances = document.createElement('td');
      const rampe = document.createElement('div');
      rampe.className = 'mini-rampe';
      rampe.setAttribute('aria-hidden', 'true');
      rampe.append(...pastillesDuFichier(palette));
      nuances.append(rampe);
      const etats = document.createElement('td');
      etats.colSpan = tokens.size > 0 ? 2 : 1;
      const etiquette = document.createElement('span');
      etiquette.className = 'etiquette';
      i18n.lier(etiquette, 'textContent', TEXTES_DE_LA_GESTION.variablesDuFichier);
      etats.append(etiquette);
      rangee.append(enTeteDeLigne, nuances, etats);
      return rangee;
    }

    /** Une notice sur un cadre, avec le geste qui le montre dans Figma (E18). */
    function noticeDeCadre(constat: Constat, page: string, cadre: string): HTMLDivElement {
      const bloc = blocDeConstat(constat, 'notice');
      bloc.append(bouton(TEXTES_DU_DESSIN.voirSurLaPlanche, 'bouton-discret', () => gestes.voirSurLaPlanche(page, [cadre])));
      return bloc;
    }

    /** Le nom de la collection de la destination, pour la ligne « Tokens » du bloc. */
    function collectionDeLaDestination(lues: VariablesDuFichier): Texte {
      const { collection } = lues.suivi.destination;
      if ('nom' in collection) return collection.nom;
      return lues.collections.find((candidate) => candidate.id === collection.id)?.nom ?? TEXTES_DE_LA_GESTION.collectionIntrouvable;
    }

    function rendre(): void {
      basculeDesVues.rendre(vue);
      basculeDesThemes.rendre(mode);
      // Le tableau ne montre qu'une rampe : le thème se choisit en vue complète.
      basculeDesThemes.element.hidden = vue === 'condensee';
      if (!recette || !planche || !fraicheur || !variables) return;
      const lue = recette;
      const etatDesCadres = fraicheur;
      const palettes = lue.palettes;
      const sansGeneration = planche.suiviFutur;
      i18n.lier(compte, 'textContent', palettesDuPlugin(palettes.length));
      i18n.lier(details, 'textContent', detailsTechniques(empreinte, VERSION_DU_SUIVI));

      vide.hidden = palettes.length > 0 && !planche.suiviFutur;
      if (planche.suiviFutur) vide.replaceChildren(blocDeConstat(suiviFutur(), 'bloquant'));
      else if (palettes.length === 0) {
        const texte = document.createElement('p');
        texte.className = 'etat-lecture';
        i18n.lier(texte, 'textContent', TEXTES_DU_DESSIN.plancheSansPalette);
        vide.replaceChildren(texte, createButton({ label: TEXTES_DU_DESSIN.versLesPalettes, variant: 'secondary', onClick: gestes.versLesPalettes }));
      }

      // Un suivi d'une version plus récente ne dit l'état d'aucune planche : ni bilan, ni mise à jour.
      enRetard = sansGeneration
        ? []
        : etatDesCadres.palettes
          .filter(({ palette, etat }) => etat === 'perimee' || etat === 'jamais-dessinee' || (etat === 'introuvable' && absentes.has(palette)))
          .map(({ palette }) => palette);
      const bilan = new Map<EtatDeLaFiche, number>();
      if (!sansGeneration) {
        for (const { palette, etat } of etatDesCadres.palettes) {
          const code = etatDeLaFiche(tokens.get(palette)?.etat ?? null, etat);
          bilan.set(code, (bilan.get(code) ?? 0) + 1);
        }
      }
      const aMettreAJour = new Set([...miseAJourDesTokens(lue, tokens).palettes, ...enRetard]);
      connexion.afficher({
        tokens: suiviDesVariablesFutur(variables.suivi) ? null : { collection: collectionDeLaDestination(variables), groupe: variables.suivi.destination.groupe },
        nomDeLaPage: planche.nomDeLaPage,
        bilan,
        enRetard: vue === 'complete' ? aMettreAJour.size : 0,
        luLe,
      });
      titreDesTokens.hidden = tokens.size === 0;

      // Les fiches et les lignes se reconstruisent : le focus d'un geste revient au même geste de la même palette.
      const actif = document.activeElement as HTMLElement | null;
      const repere = gesteAFocaliser ?? (actif && (liste.contains(actif) || table.contains(actif))
        ? { palette: actif.closest<HTMLElement>('[data-palette]')?.dataset.palette, geste: actif.dataset.geste }
        : null);
      gesteAFocaliser = null;
      const complete = vue === 'complete';
      liste.hidden = !complete;
      table.hidden = complete || (palettes.length === 0 && duFichier.length === 0);
      liste.replaceChildren(...(complete ? etatDesCadres.palettes.map((cadre) => ficheDePalette(lue, cadre.palette, cadre, sansGeneration)) : []));
      corpsDeTable.replaceChildren(...(complete ? [] : [...etatDesCadres.palettes.map((cadre) => ligneDeTable(lue, cadre.palette, cadre)), ...duFichier.map(ligneDuFichier)]));
      // En vue complète, les palettes du fichier ont leur liste ; en vue condensée, elles sont des lignes du tableau.
      separation.hidden = !complete || duFichier.length === 0;
      listeDuFichier.hidden = separation.hidden;
      i18n.lier(titreDuFichier, 'textContent', dejaDansLeFichier(duFichier.length));
      listeDuFichier.replaceChildren(...(separation.hidden ? [] : duFichier.map(ficheDuFichier)));
      if (ficheAMontrer !== null) {
        const fiche = liste.querySelector<HTMLElement>(`.fiche-planche[data-palette="${ficheAMontrer}"]`);
        ficheAMontrer = null;
        fiche?.scrollIntoView({ block: 'start' });
        fiche?.querySelector<HTMLElement>('[data-geste="modifier"]')?.focus({ preventScroll: true });
      } else if (repere?.palette && repere.geste) {
        const racine = complete ? liste : table;
        // Un geste que l'état a retiré laisse le focus à « Modifier » de la même fiche.
        (racine.querySelector<HTMLElement>(`[data-palette="${repere.palette}"] [data-geste="${repere.geste}"]`)
          ?? racine.querySelector<HTMLElement>(`[data-palette="${repere.palette}"] [data-geste="modifier"]`))?.focus();
      } else rendreLeFocus();

      // Une carte se reconstruit comme une fiche : le focus d'un geste revient au même geste de la même carte.
      const repereSupprime = actif && supprimees.contains(actif) ? { palette: actif.closest<HTMLElement>('.carte-supprimee')?.dataset.supprimee, geste: actif.dataset.geste } : null;
      const restes = new Map(orphelines.map((orpheline) => [orpheline.palette, orpheline]));
      const cadresOrphelins = new Map(etatDesCadres.orphelins.map((cadre) => [cadre.palette, cadre]));
      const palettesSupprimees = [...new Set([...cadresOrphelins.keys(), ...restes.keys()])];
      supprimees.replaceChildren(...palettesSupprimees.map((palette, rang) => carteSupprimee(palette, cadresOrphelins.get(palette), restes.get(palette), rang)));
      supprimees.hidden = palettesSupprimees.length === 0;
      rendreLesGestes();
      if (focusApresRetrait !== null) {
        const suivante = supprimees.querySelectorAll<HTMLElement>('.carte-supprimee')[focusApresRetrait];
        (suivante?.querySelector<HTMLElement>('button') ?? compte).focus();
        focusApresRetrait = null;
      } else if (repereSupprime?.palette && repereSupprime.geste) {
        supprimees.querySelector<HTMLElement>(`.carte-supprimee[data-supprimee="${repereSupprime.palette}"] [data-geste="${repereSupprime.geste}"]`)?.focus();
      }

      notices.replaceChildren(
        ...etatDesCadres.copies.map(({ nom, cadre, page }) => noticeDeCadre(copieDeCadre(nom), page, cadre)),
        ...(profil === 'DISPLAY_P3' ? [blocDeConstat(noticeDisplayP3(), 'notice')] : []),
      );
      notices.hidden = notices.childElementCount === 0;
    }

    /** L'état des tokens de chaque palette et les variables orphelines, recalculés sur le dernier état lu. */
    function calculerLesTokens(): void {
      tokens = new Map();
      orphelines = [];
      duFichier = [];
      if (!recette || !variables || suiviDesVariablesFutur(variables.suivi)) return;
      duFichier = palettesDuFichier(variables.variables, variables.collections, variablesSuivies(variables.suivi, new Set(recette.palettes.map((palette) => palette.id))));
      for (const palette of recette.palettes) tokens.set(palette.id, tokensDeLaPalette(recette, palette, variables));
      orphelines = variablesDesPalettesSupprimees(recette, variables);
    }

    let empreinte: string | null = null;

    return {
      element,
      afficher(classement, lue, plancheLue, profilLu, empreinteLue, variablesLues, luLeRecu) {
        gestes.recetteEnFichier.afficher(classement);
        if (classement.etat === 'future' || classement.etat === 'illisible') {
          recette = null;
          fraicheur = null;
          connexion.element.hidden = true;
          pageDesPlanches.element.hidden = true;
          destination.fermer();
          enTete.hidden = true;
          table.hidden = true;
          separation.hidden = true;
          liste.replaceChildren();
          listeDuFichier.replaceChildren();
          notices.replaceChildren();
          const constat = classement.etat === 'future' ? recetteFuture(classement.version) : recetteIllisible(classement.refus);
          vide.replaceChildren(blocDeConstat(constat, 'bloquant'));
          vide.hidden = false;
          // Les gestes de sortie d'une recette illisible ou future se montrent sans clic ([REC-11]).
          carteDeLaRecette.ouvrir();
          return;
        }
        connexion.element.hidden = pageDesPlanches.estOuverte() || destination.estOuverte();
        enTete.hidden = false;
        recette = lue;
        planche = plancheLue;
        variables = variablesLues;
        profil = profilLu;
        empreinte = empreinteLue;
        luLe = luLeRecu;
        fraicheur = lue ? fraicheurDeLaPlanche(lue, profil, plancheLue) : null;
        const introuvables = (fraicheur?.palettes ?? []).filter(({ etat }) => etat === 'introuvable').map(({ palette }) => palette);
        const dejaAbsentes = absentes;
        absentes = new Set(plancheLue.recherche === 'fichier' ? introuvables : introuvables.filter((id) => dejaAbsentes.has(id)));
        analyses.clear();
        calculerLesTokens();
        // Un encart ouvert sur une palette que la recette ne porte plus, ou qui n'a plus rien à créer ni à remplacer, se ferme.
        const ouvert = encart === null ? undefined : tokens.get(encart);
        if (encart !== null && (!ouvert || (ouvert.reprise ? ouvert.aRemplacer : ouvert.aCreer.length) === 0)) encart = null;
        if (variablesAConfirmer !== null && !orphelines.some((orpheline) => orpheline.palette === variablesAConfirmer)) variablesAConfirmer = null;
        rendre();
      },
      afficherDessin(etat, nomsDuDessin) {
        enCours = etat.phase === 'en-cours';
        connexion.synchroniser.disabled = enCours;
        rendreLesGestes();
        const resultat = blocDuResultat(etat, nomsDuDessin, gestes);
        const enfants: HTMLElement[] = resultat ? [resultat] : [];
        if (etat.phase === 'en-cours') {
          const progression = document.createElement('p');
          progression.className = 'ligne-secondaire';
          progression.setAttribute('role', 'status');
          i18n.lier(progression, 'textContent', progressionDuDessin(etat.fait, etat.total, etat.nom));
          enfants.push(progression);
        }
        zoneDuResultat.replaceChildren(...enfants);
        zoneDuResultat.hidden = enfants.length === 0;
        // Un résultat qui demande un geste, un refus ou une confirmation, garde le focus sur lui.
        if (etat.phase === 'fini' && resultat) gesteDeLaGeneration = null;
        rendreLeFocus();
      },
      bloquer(raison) {
        blocage = raison;
        gestes.recetteEnFichier.bloquer(raison);
        pageDesPlanches.bloquer(raison);
        destination.bloquer(raison);
        rendreLesGestes();
      },
      recevoirRetrait(issue) {
        const retrait = retraitEnCours;
        retraitEnCours = null;
        if (!retrait) return;
        if (issue.issue === 'retire' || issue.issue === 'deja-absent') {
          focusApresRetrait = retrait.rang;
          const annonce = document.createElement('p');
          annonce.className = 'ligne-secondaire';
          i18n.lier(annonce, 'textContent', TEXTES_DE_LA_PALETTE_SUPPRIMEE.supprime(retrait.nom));
          // Un cadre déjà absent n'a rien que Ctrl+Z puisse rendre : sa carte disparaît sans annonce.
          annonceDuRetrait.replaceChildren(...(issue.issue === 'retire' ? [annonce] : []));
        } else {
          const constat = issue.issue === 'suivi-futur' ? suiviFutur() : suppressionRefusee(retrait.nom);
          annonceDuRetrait.replaceChildren(blocDeConstat(constat, issue.issue === 'suivi-futur' ? 'bloquant' : 'notice'));
        }
        annonceDuRetrait.hidden = annonceDuRetrait.childElementCount === 0;
        rendreLesGestes();
      },
      recevoirPage(issue) {
        if (pageDesPlanches.recevoir(issue)) rendreLeBloc(connexion.changerLaPage);
      },
      recevoirVariables(resultat) {
        ecritureEnCours = false;
        const planches = planchesApresLesVariables;
        planchesApresLesVariables = null;
        if (resultat && resultat.issue !== 'ecrites') {
          // Rien ne s'est écrit, pour aucune palette : le message se lit sous le bloc de la connexion.
          if (resultat.issue === 'recette-changee') {
            const bloc = blocDeConstat(variablesSurUneAutreRecette(), 'bloquant');
            bloc.append(createButton({ label: TEXTES.recharger, onClick: () => gestes.recharger() }));
            zoneDesVariables.replaceChildren(bloc);
          } else if (resultat.issue === 'suivi-futur') zoneDesVariables.replaceChildren(blocDeConstat(suiviFutur(), 'bloquant'));
          zoneDesVariables.hidden = zoneDesVariables.childElementCount === 0;
        } else if (resultat) {
          const nom = (id: string): string => noms()[id] ?? id;
          for (const issue of resultat.palettes) {
            if (issue.issue === 'ecrite') {
              if (encart === issue.palette) encart = null;
              laissees.delete(issue.palette);
            } else if (issue.issue === 'nom-pris') refusDesTokens.set(issue.palette, nomDejaPris(nom(issue.palette), issue.nom));
            else if (issue.issue === 'collection-introuvable') refusDesTokens.set(issue.palette, collectionDisparue(nom(issue.palette)));
            else if (issue.issue === 'modes-refuses') refusDesTokens.set(issue.palette, modesRefuses(nom(issue.palette), issue.message));
            else if (issue.issue === 'interrompue') refusDesTokens.set(issue.palette, ecritureInterrompue(nom(issue.palette), issue.message));
          }
          // Les planches de « Tout mettre à jour » suivent les tokens.
          if (planches) lancer(planches);
        }
        rendre();
      },
      recevoirDestination(issue) {
        if (!destination.recevoir(issue)) return;
        // La destination rangée vaut tout de suite : la ligne du bloc et l'encart d'écriture la lisent avant l'état relu.
        if (issue.issue === 'rangee' && variables) {
          variables = { ...variables, suivi: { ...variables.suivi, destination: issue.destination, confirmee: true } };
          calculerLesTokens();
        }
        const ensuite = apresLaDestination;
        apresLaDestination = null;
        rendreLeBloc(connexion.changerLaDestination);
        if (ensuite !== null && (tokens.get(ensuite)?.aCreer.length ?? 0) > 0) {
          encart = ensuite;
          gesteAFocaliser = { palette: ensuite, geste: 'confirmer-ecriture' };
        }
        rendre();
      },
      recevoirReprise(issue) {
        repriseEnCours = false;
        // Une recette changée ailleurs ouvre le conflit d'enregistrement, que l'onglet Création dit.
        if (issue.issue === 'palette-introuvable' || issue.issue === 'invalide') zoneDesVariables.replaceChildren(blocDeConstat(repriseRefusee(), 'alerte'));
        else if (issue.issue === 'suivi-futur') zoneDesVariables.replaceChildren(blocDeConstat(suiviFutur(), 'bloquant'));
        else zoneDesVariables.replaceChildren();
        zoneDesVariables.hidden = zoneDesVariables.childElementCount === 0;
        rendreLesGestes();
      },
      recevoirRetraitDesVariables(issue) {
        retraitDesVariablesEnCours = false;
        variablesAConfirmer = null;
        if (issue.issue === 'retirees') {
          const annonce = document.createElement('p');
          annonce.className = 'ligne-secondaire';
          i18n.lier(annonce, 'textContent', TEXTES_DES_VARIABLES_SUPPRIMEES.supprimees(issue.retirees));
          annonceDuRetrait.replaceChildren(...(issue.retirees > 0 ? [annonce] : []));
        } else {
          annonceDuRetrait.replaceChildren(issue.issue === 'suivi-futur' ? blocDeConstat(suiviFutur(), 'bloquant') : blocDeConstat(suppressionDesVariablesRefusee(), 'notice'));
        }
        annonceDuRetrait.hidden = annonceDuRetrait.childElementCount === 0;
        rendre();
        // La carte disparaît à l'état relu : le focus rejoint alors la carte suivante, ou le compte des palettes.
        if (issue.issue === 'retirees') focusApresRetrait = 0;
      },
    };
  }
  return { createOngletGestion };
}

export const creerVuesOngletGestion = memoriserVues(construireVues);

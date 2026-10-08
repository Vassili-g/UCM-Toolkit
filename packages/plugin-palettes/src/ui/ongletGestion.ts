/**
 * L'onglet Gestion (section 13.2, [UI-24] à [UI-36]), en sections
 * repliables ([UI-36]). De haut en bas : « Connexion à Figma », que la carte
 * « Destination des tokens » ou « Page des planches » remplace le temps d'un
 * choix ; « Palettes du plugin », le thème des fiches, puis une liste
 * dépliable ([UI-27]).
 *
 * Une ligne par palette de la recette, dans son ordre : le nom, la rampe en
 * miniature, l'état des tokens et celui de la planche. Dépliée, la ligne
 * remplace ses deux états par « Modifier », et sa fiche s'ouvre dessous : les
 * rampes dans le thème choisi, la référence et le résultat des garanties,
 * puis une ligne par sortie, tokens et planche. Les deux décisions d'écriture
 * se prennent dans la fiche, sans modale : l'encart d'une écriture qui crée
 * des variables ([UI-31]), et celui des couleurs changées dans Figma
 * ([UI-32]). Une palette qui attend une décision se déplie seule.
 *
 * Sous un intertitre, « Déjà dans le fichier » liste dans la même liste les
 * palettes que les variables locales portent hors du plugin ([UI-33]) ;
 * « Modifier dans le plugin » en reprend une ([UI-34]). Les groupes d'une même
 * palette (Soft et Vivid, Light et Dark) tiennent une seule ligne, que le
 * compte compte pour une palette. « Dans les
 * bibliothèques » suit, avec celles des bibliothèques activées. Un groupe
 * sans palette ne paraît pas. Suivent une carte par palette supprimée dont
 * le cadre ou des variables restent dans Figma ([PLA-27], [VAR-11]).
 *
 * Viennent enfin les notices, puis la section « Palettes et réglages »
 * (V8.5). Chaque génération dessine les parties que la recette choisit
 * ([PLA-28]).
 */
import { MODES, rampeDe, type Classement, type Mode, type Recette } from 'ucm-couleur';

import { analyserPalette } from '../analyse';
import type { IssueDeLaPage, IssueDuRetrait } from '../ecriture/planche';
import type { IssueDeLaCopie, IssueDeLaDestination, IssueDeLaReprise, IssueDuRetraitDesVariables, ResultatDeLEcriture } from '../ecriture/variables';
import { VERSION_DU_SUIVI, type CadreLu, type EtatDeLaPlanche, type ProfilDuDocument } from '../lecture';
import type { VariablesDuFichier } from '../lectureDesVariables';
import { fraicheurDeLaPlanche, type CadreDUnePalette, type FraicheurDeLaPlanche } from '../planche/fraicheur';
import type { SectionDeGestion, SectionsDeGestion } from '../preferences';
import { etatDeLaFiche, type EtatDeLaFiche } from '../presentation';
import { SANS_BIBLIOTHEQUE, type Bibliotheques, type PaletteDeBibliotheque } from '../variables/bibliotheques';
import type { Destination } from '../variables/destination';
import { palettesDuFichier, regrouperLesPalettes, type PaletteDuFichier, type PaletteGroupee } from '../variables/detection';
import { tokensDeLaPalette, variablesDesPalettesSupprimees, type TokensDUnePalette, type VariablesOrphelines } from '../variables/gestion';
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
import { createSection } from './section';
import { creerSocleLocalise } from './socleLocalise';
import { lignesDeSortie, type LigneDeSortie } from './sorties';
import { type Constat, type ConstatIllustre } from './textes';

export interface OngletGestionUi {
  element: HTMLDivElement;
  /** `luLe` est l'heure du dernier état reçu du sandbox, que la section de la connexion écrit en durée ([UI-24]). */
  afficher(classement: Classement, recette: Recette | null, planche: EtatDeLaPlanche, profil: ProfilDuDocument, empreinte: string | null, variables: VariablesDuFichier, luLe: number): void;
  afficherDessin(etat: EtatDuDessin, noms: { readonly [id: string]: string }): void;
  /** Rend les gestes d'écriture inactifs, avec la raison ; `null` les rend (V12.1). */
  bloquer(raison: Texte | null): void;
  /**
   * L'issue de « Supprimer définitivement » ([PLA-27]). Un cadre retiré ou
   * déjà absent quitte la planche par l'état suivant ; sa carte disparaît
   * alors, et le focus passe à la carte suivante, ou à l'en-tête des
   * palettes du plugin.
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
  recevoirErreurDeLecture(message: string): void;
  /** L'issue de « Modifier dans le plugin » ([VAR-13]) ; réussie, l'état relu ouvre Création sur la palette. */
  recevoirReprise(issue: IssueDeLaReprise): void;
  /** L'issue de « Copier dans le plugin » ([VAR-14]) ; réussie, l'état relu ouvre Création sur la copie. */
  recevoirCopie(issue: IssueDeLaCopie): void;
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
  /** Range les sections ouvertes avec les préférences ([UI-36]). */
  rangerLesSections(sections: SectionsDeGestion): void;
  /** Demande le retrait du cadre d'une palette supprimée ; `false` quand rien ne part, pendant un conflit. */
  retirer(palette: string, cadre: string): boolean;
  /** Écrit les variables des palettes ; `remettre` nomme celles dont le designer remet les couleurs ([VAR-06], [VAR-07]). */
  ecrireLesVariables(palettes: readonly string[], remettre: readonly string[]): void;
  /** Demande le rangement de la destination ; `false` quand rien ne part ([VAR-16]). */
  rangerLaDestination(destination: Destination): boolean;
  /** Demande le retrait des variables d'une palette supprimée ; `false` quand rien ne part ([VAR-11]). */
  retirerLesVariables(palette: string): boolean;
  /**
   * Reprend une palette du fichier dans le plugin ; `false` quand rien ne part ([VAR-13]).
   * `imposee` est l'identifiant d'un cadre orphelin : la palette reprise le prend.
   */
  reprendre(source: PaletteDuFichier | PaletteGroupee, imposee?: string): boolean;
  /** Copie une palette de bibliothèque dans le plugin ; `false` quand rien ne part ([VAR-14]). */
  copier(source: PaletteDeBibliotheque): boolean;
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
    couleursSurNChangent, origineDesTokens, remplacerNCouleurs, repriseRefusee, texteDuRenommage, titreDuRemplacement, variablesARenommer,
    tokensPartiels, formeDesThemes, modeDisparu, gesteInterrompu, referencesImportees, ancienneSortie,
    bibliothequeIllisible, bibliothequesIllisibles, collectionDeBibliotheque, copieRefusee, copieSansCouleur, couleursDeBibliotheque, texteDeLaCopie, titreDeLaCopie,
    avecLeNom, collectionDisparue, copieDeCadre, couleursChangeesALaMain, couleursChangeesDansLePlugin, couleursDeLaPaletteDuFichier, detailsTechniques,
    ecrireNVariables, ecritureInterrompue, etNAutres, etatDeLaPlancheEcrit, etatDesTokensEcrit, modesRefuses, nomDeLaPalette, nomDejaPris,
    nombreDeVariables, noticeDisplayP3, pageDeLaPlanche, progressionDuBouton, progressionDuDessin,recetteFuture, recetteIllisible, suiviFutur,
    suppressionDesVariablesRefusee, suppressionRefusee, texteDeLEcriture, titreDeLEcriture, titreDesModifiees, valeurDansFigma, valeurDansLePlugin,
    variablesACreer, variablesDisparues, variablesSurUneAutreRecette, verifierLaPalette, regroupementDuFichier,
  } = i18n.messages;

  function bouton(texte: Texte, classe: 'bouton-discret' | 'lien-de-constat', surClic: () => void): HTMLButtonElement {
    const element = document.createElement('button');
    element.type = 'button';
    element.className = classe;
    i18n.lier(element, 'textContent', texte);
    element.addEventListener('click', surClic);
    return element;
  }

  /** Une bascule à boutons pressés : le thème des fiches. */
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

  function createOngletGestion(gestes: GestesDeLaGestion, sectionsInitiales: SectionsDeGestion): OngletGestionUi {
    const element = document.createElement('div');
    element.className = 'page-stack colonne';

    let mode: Mode = 'light';
    /**
     * Les lignes dépliées, pour la session : l'id d'une palette du plugin, la
     * clé d'une palette du fichier ou d'une bibliothèque ([UI-27]).
     */
    const depliees = new Set<string>();
    /** Les palettes qu'une décision attendue a dépliées seules : repliées par le designer, elles le restent tant que la décision attend. */
    const deplieesSeules = new Set<string>();

    const ouvertes = { ...sectionsInitiales };
    function basculer(code: SectionDeGestion, ouverte: boolean): void {
      ouvertes[code] = ouverte;
      gestes.rangerLesSections({ ...ouvertes });
    }
    const section = (code: SectionDeGestion, titre: Texte) =>
      createSection({ code, titre, ouverte: ouvertes[code], surBascule: (ouverte) => basculer(code, ouverte) }, i18n);

    // La section de la connexion, et les deux cartes qui la remplacent le temps d'un choix ([UI-29], [UI-30]).
    const connexion = createConnexion({
      synchroniser: () => gestes.synchroniser(),
      changerLaDestination: () => ouvrirLaDestination(null),
      changerLaPage() {
        if (!planche) return;
        connexion.element.hidden = true;
        destination.fermer();
        pageDesPlanches.ouvrir(planche);
      },
      basculer: (ouverte) => basculer('connexion', ouverte),
    }, ouvertes.connexion);
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

    /** Rend la section de la connexion à la place d'une carte, et le focus à son « Changer », ou à son en-tête quand elle est repliée. */
    function rendreLeBloc(changer: HTMLButtonElement): void {
      connexion.element.hidden = false;
      (connexion.estOuverte() ? changer : connexion.bascule).focus();
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

    // Les palettes du plugin : le thème des fiches, puis la liste ([UI-25]).
    const sectionDuPlugin = section('plugin', TEXTES_DE_LA_GESTION.palettesDuPlugin);
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
    enTete.append(basculeDesThemes.element);

    /** Ce qui empêche de lire l'onglet : une recette illisible ou future, un suivi d'une version plus récente. Hors des sections, pour rester lisible quand elles sont repliées. */
    const bloquant = document.createElement('div');
    bloquant.className = 'page-stack';
    bloquant.hidden = true;
    const zoneDuResultat = document.createElement('div');
    zoneDuResultat.hidden = true;
    /** L'annonce de la progression aux lecteurs d'écran : une région `status` sans place dans la page ([R4]). */
    const annonceDuDessin = document.createElement('div');
    annonceDuDessin.className = 'visuellement-masque';
    annonceDuDessin.setAttribute('role', 'status');
    /** Ce qu'une écriture de variables refuse pour toutes les palettes : la recette a changé, ou le suivi est d'une version plus récente. */
    const zoneDesVariables = document.createElement('div');
    zoneDesVariables.className = 'page-stack';
    zoneDesVariables.hidden = true;
    const notices = document.createElement('div');
    notices.className = 'page-stack';
    const vide = document.createElement('div');
    vide.className = 'page-stack';

    // La liste dépliable, sous ses en-têtes de colonne ([UI-27]).
    const liste = document.createElement('div');
    liste.className = 'liste-des-palettes';
    liste.hidden = true;
    const entetes = document.createElement('div');
    entetes.className = 'palette-entetes';
    const titreDesTokens = document.createElement('span');
    for (const [titre, cellule] of [
      [TEXTES_DE_LA_GESTION.colonnePalette, document.createElement('span')],
      [TEXTES_DE_LA_GESTION.colonneNuances, document.createElement('span')],
      [TEXTES_DE_LA_GESTION.tokensFigma, titreDesTokens],
      [TEXTES_DE_LA_GESTION.planche, document.createElement('span')],
    ] as const) {
      i18n.lier(cellule, 'textContent', titre);
      entetes.append(cellule);
    }
    const lignes = document.createElement('div');
    lignes.className = 'palette-lignes';
    liste.append(entetes, lignes);
    sectionDuPlugin.corps.append(enTete, vide, liste);

    // Import, export, rapport et détails techniques (V8.5).
    const sectionDeLaRecette = section('recette', TEXTES_DU_DESSIN.palettesEtReglages);
    sectionDeLaRecette.poserLeResume([i18n.noeud(TEXTES_DE_LA_GESTION.resumeDeLaRecette)]);
    const details = document.createElement('p');
    details.className = 'ligne-secondaire';
    sectionDeLaRecette.corps.append(gestes.recetteEnFichier.element, details);

    // Les palettes supprimées dont le cadre ou des variables restent dans Figma, puis l'issue du dernier retrait ([PLA-27], [VAR-11]).
    const supprimees = document.createElement('div');
    supprimees.className = 'liste-planche';
    const annonceDuRetrait = document.createElement('div');
    annonceDuRetrait.className = 'page-stack';
    annonceDuRetrait.setAttribute('role', 'status');
    annonceDuRetrait.hidden = true;

    element.append(
      connexion.element, destination.element, pageDesPlanches.element, bloquant, zoneDesVariables, zoneDuResultat, annonceDuDessin,
      sectionDuPlugin.element, supprimees, annonceDuRetrait, notices, sectionDeLaRecette.element,
    );

    let recette: Recette | null = null;
    let planche: EtatDeLaPlanche | null = null;
    let variables: VariablesDuFichier | null = null;
    /**
     * La fraîcheur, les analyses et l'état des tokens ne dépendent ni du
     * thème des fiches ni des lignes dépliées : ils se calculent à chaque
     * état lu, pas à chaque bascule.
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
    /** La palette supprimée dont la suppression des variables attend sa confirmation, puis son issue. */
    let variablesAConfirmer: string | null = null;
    let retraitDesVariablesEnCours = false;
    /** Vrai entre « Modifier dans le plugin » ou « Copier dans le plugin » et son issue : aucune autre reprise ne part. */
    let repriseEnCours = false;
    /** Les collections des bibliothèques activées et leurs palettes ([VAR-14]). */
    let bibliotheques: Bibliotheques = SANS_BIBLIOTHEQUE;
    /** La palette de bibliothèque dont la copie attend sa confirmation : sa collection et son chemin. */
    let copieAConfirmer: string | null = null;
    /** Le retrait demandé, jusqu'à son issue : le cadre, son nom et le rang de sa carte. */
    let retraitEnCours: { readonly cadre: string; readonly nom: string; readonly rang: number } | null = null;
    /** Le rang de la carte retirée, que le focus rejoint au rendu qui la fait disparaître. */
    let focusApresRetrait: number | null = null;
    /** Le geste d'une fiche que le focus rejoint au rendu suivant : l'encart qui s'ouvre, ou le geste qu'il rend. */
    let gesteAFocaliser: { readonly palette: string; readonly geste: string } | null = null;

    /*
     * Un clic dans la fenêtre lui rend le focus, et ce retour fait relire
     * l'état. Reçu entre l'appui et le relâchement, il remplacerait le bouton
     * pressé, et le clic n'aurait plus de cible. L'état reçu pendant un appui
     * attend donc le relâchement, et s'affiche après le clic.
     */
    let appui = false;
    let etatEnAttente: Parameters<OngletGestionUi['afficher']> | null = null;
    element.addEventListener('pointerdown', () => {
      appui = true;
    });
    function relacher(): void {
      if (!appui) return;
      appui = false;
      setTimeout(() => {
        const attendu = etatEnAttente;
        etatEnAttente = null;
        if (attendu && !appui) onglet.afficher(...attendu);
        else etatEnAttente = attendu;
      });
    }
    window.addEventListener('pointerup', relacher);
    window.addEventListener('pointercancel', relacher);

    /** La progression du dessin en cours, et la largeur que son bouton avait au départ ([R4]) : la boîte ne change pas de taille. */
    let progression: { readonly fait: number; readonly total: number; largeur: number | null } | null = null;
    /** Le libellé d'origine de chaque bouton qui porte la progression, rendu quand le dessin s'arrête sans reconstruire la ligne. */
    const libellesDeOrigine = new WeakMap<HTMLElement, Texte>();

    /** Le bouton qui montre la progression : « Tout mettre à jour » pour plusieurs palettes, sinon le geste de la palette dessinée. */
    function boutonDuDessin(): HTMLButtonElement | null {
      if (progression === null) return null;
      const global = element.querySelector<HTMLButtonElement>('[data-geste="tout-mettre-a-jour"]');
      if (progression.total > 1 && global) return global;
      if (!gesteDeLaGeneration) return null;
      return ligneDe(gesteDeLaGeneration.palette)?.querySelector<HTMLButtonElement>('[data-geste="generer"]') ?? null;
    }

    function porterLaProgression(geste: HTMLButtonElement, porte: boolean): void {
      const libelle = geste.firstElementChild;
      if (!libelle) return;
      if (porte && progression) {
        if (!libellesDeOrigine.has(geste)) libellesDeOrigine.set(geste, libelle.textContent ?? '');
        if (progression.largeur === null && geste.getBoundingClientRect().width > 0) progression.largeur = geste.getBoundingClientRect().width;
        geste.classList.add('geste-en-progression');
        if (progression.largeur !== null) geste.style.width = `${progression.largeur}px`;
        i18n.lier(libelle, 'textContent', progressionDuBouton(progression.fait, progression.total));
        i18n.lier(geste, 'title', progressionDuDessin(progression.fait, progression.total, nomDuDessin));
      } else if (geste.classList.contains('geste-en-progression')) {
        geste.classList.remove('geste-en-progression');
        geste.style.width = '';
        const origine = libellesDeOrigine.get(geste);
        if (origine !== undefined) i18n.lier(libelle, 'textContent', origine);
        libellesDeOrigine.delete(geste);
      }
    }
    let nomDuDessin = '';

    /** Les gestes d'écriture, inactifs pendant un dessin, une écriture de variables ou un conflit d'enregistrement. */
    function rendreLesGestes(): void {
      const inactif = enCours || ecritureEnCours || blocage !== null;
      const cible = boutonDuDessin();
      for (const geste of Array.from(element.querySelectorAll<HTMLButtonElement>('[data-geste="generer"], [data-geste="tout-mettre-a-jour"]'))) {
        geste.disabled = inactif;
        i18n.lier(geste, 'title', blocage ?? '');
        porterLaProgression(geste, enCours && geste === cible);
      }
      for (const geste of [
        ...Array.from(liste.querySelectorAll<HTMLButtonElement>('[data-ecriture]')),
        ...Array.from(liste.querySelectorAll<HTMLButtonElement>('[data-geste="reprendre"], [data-geste="copier"], [data-geste="confirmer-copie"]')),
      ]) {
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
      for (const geste of Array.from(supprimees.querySelectorAll<HTMLButtonElement>('[data-geste="reprendre-supprimee"]'))) {
        geste.disabled = inactif || repriseEnCours || retraitEnCours !== null || retraitDesVariablesEnCours;
        i18n.lier(geste, 'title', blocage === null ? '' : TEXTES_DE_LA_GESTION.variablesEnConflit);
      }
    }

    function retirer(cadre: CadreLu, rang: number): void {
      if (retraitEnCours || !gestes.retirer(cadre.palette, cadre.cadre)) return;
      retraitEnCours = { cadre: cadre.cadre, nom: cadre.nom, rang };
      annonceDuRetrait.replaceChildren();
      rendreLesGestes();
    }

    /**
     * La palette du fichier que le geste « Reprendre depuis les variables » reprend
     * sous l'identifiant d'un cadre orphelin : celle que les variables de la
     * liaison de reprise de ce cadre forment encore dans le fichier, en une
     * palette groupée ou en un seul groupe. `undefined` sans liaison de reprise
     * à cet identifiant, sans variable restée, ou quand elles se partagent entre
     * plusieurs palettes du fichier.
     */
    function repriseDuCadre(palette: string): PaletteDuFichier | PaletteGroupee | undefined {
      const suivie = variables?.suivi.palettes[palette];
      if (!suivie || suivie.liaison !== 'reprise') return undefined;
      const suivies = new Set(Object.values(suivie.variables).map((variable) => variable.id));
      const trouvees = regrouperLesPalettes(duFichier).filter((candidate) =>
        (candidate.type === 'groupee' ? candidate.groupes.map((groupe) => groupe.palette) : [candidate.palette]).some((groupe) => groupe.variables.some((id) => suivies.has(id))));
      if (trouvees.length !== 1) return undefined;
      return trouvees[0].type === 'groupee' ? trouvees[0] : trouvees[0].palette;
    }

    /**
     * La carte d'une palette supprimée : son nom, ce qui reste d'elle dans
     * Figma, et un geste par reste. « Supprimer les variables… » demande
     * confirmation dans la carte ([VAR-11]).
     */
    function carteSupprimee(palette: string, cadre: CadreLu | undefined, restes: VariablesOrphelines | undefined, rang: number): HTMLElement {
      const reprise = cadre ? repriseDuCadre(palette) : undefined;
      const carte = createCarte({ titre: cadre?.nom ?? restes?.chemin ?? palette }, i18n);
      carte.element.classList.add('carte-supprimee');
      carte.element.dataset.supprimee = palette;
      if (cadre) carte.element.dataset.cadre = cadre.cadre;
      const texte = document.createElement('p');
      i18n.lier(texte, 'textContent', restes?.ancienne ? ancienneSortie(restes.variables) : restes ? TEXTES_DES_VARIABLES_SUPPRIMEES.texte(restes.variables) : TEXTES_DE_LA_PALETTE_SUPPRIMEE.texte);
      const gestesDeLaCarte = document.createElement('div');
      gestesDeLaCarte.className = 'fiche-gestes';
      if (cadre) {
        const voir = createButton({ label: TEXTES_DU_DESSIN.voirSurLaPlanche, variant: 'secondary', compact: true, onClick: () => gestes.voirSurLaPlanche(cadre.page, [cadre.cadre]) });
        voir.dataset.geste = 'voir';
        const supprimer = createButton({ label: TEXTES_DE_LA_PALETTE_SUPPRIMEE.supprimer, variant: 'danger', compact: true, onClick: () => retirer(cadre, rang) });
        supprimer.dataset.geste = 'supprimer';
        gestesDeLaCarte.append(voir, supprimer);
        if (reprise) {
          const reprendre = createButton({
            label: TEXTES_DE_LA_PALETTE_SUPPRIMEE.reprendre,
            variant: 'secondary',
            compact: true,
            onClick: () => {
              if (repriseEnCours || !gestes.reprendre(reprise, palette)) return;
              repriseEnCours = true;
              zoneDesVariables.replaceChildren();
              zoneDesVariables.hidden = true;
              rendreLesGestes();
            },
          });
          reprendre.dataset.geste = 'reprendre-supprimee';
          gestesDeLaCarte.append(reprendre);
        }
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
      const ligne = ligneDe(gesteDeLaGeneration.palette);
      const cible = ligne?.querySelector<HTMLElement>(`[data-geste="${gesteDeLaGeneration.geste}"]`)
        ?? ligne?.querySelector<HTMLElement>('[data-geste="modifier"]')
        ?? ligne?.querySelector<HTMLElement>('[data-geste="deplier"]');
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
      depliees.add(id);
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
          if (etat.modifiees.length > 0) {
            laissees.delete(id);
            gesteAFocaliser = { palette: id, geste: 'remettre' };
            rendre();
          } else if (etat.aCreer.length > 0 || etat.aRenommer.length > 0 || (etat.reprise && etat.aRemplacer > 0)) ouvrirLEcriture(id);
          else {
            gesteAFocaliser = { palette: id, geste: 'modifier' };
            ecrire([id], []);
          }
        },
      )]);
      if (etat.reprise && (etat.etat === 'a-jour' || etat.etat === 'a-mettre-a-jour')) {
        // Une palette reprise : sa collection et son chemin d'origine, puis ce que la mise à jour créerait ou remplacerait ([UI-34]).
        const origine = i18n.composer`${origineDesTokens(etat.collection ?? TEXTES_DE_LA_GESTION.collectionIntrouvable, etat.origine ?? '')} · ${formeDesThemes(etat.themes)}`;
        if (etat.etat === 'a-jour') return { ...ligne, detail: i18n.composer`${origine} · ${nombreDeVariables(etat.variables)}`, gestes: [] };
        const ecart = etat.aCreer.length > 0
          ? variablesACreer(etat.aCreer.length)
          : etat.aRemplacer > 0 ? couleursSurNChangent(etat.aRemplacer, etat.variables) : etat.nomsOccupes.length > 0 ? tokensPartiels(etat.nomsOccupes).quoi : variablesARenommer(etat.aRenommer.length);
        return { ...ligne, detail: i18n.composer`${origine} · ${ecart}`, gestes: mettreAJour('primary') };
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
          return { ...ligne, detail: etat.reprise ? i18n.composer`${formeDesThemes(etat.themes)} · ${couleursChangeesALaMain(etat.modifiees.length)}` : couleursChangeesALaMain(etat.modifiees.length), gestes: laissees.has(id) ? mettreAJour('secondary') : [] };
        case 'introuvables':
          return { ...ligne, detail: etat.reprise ? i18n.composer`${formeDesThemes(etat.themes)} · ${variablesDisparues(etat.introuvables.length)}` : variablesDisparues(etat.introuvables.length), gestes: mettreAJour('primary') };
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
      i18n.lier(texte, 'textContent', texteDeLEcriture(etat.aCreer.length, collection, etat.aCreer[0] ?? '', etat.aCreer[etat.aCreer.length - 1] ?? '', etat.aRemplacer, etat.aRenommer.length));
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
      bloc.append(titre, texte, ...paragrapheDuRenommage(etat), choix);
      return bloc;
    }

    /** Ce que la mise à jour d'une palette reprise renomme, par l'exemple de sa première variable ([UI-34]) ; rien sans renommage. */
    function paragrapheDuRenommage(etat: TokensDUnePalette): HTMLParagraphElement[] {
      const [premiere] = etat.aRenommer;
      if (!premiere) return [];
      const paragraphe = document.createElement('p');
      paragraphe.className = 'ligne-secondaire';
      paragraphe.dataset.renommage = 'true';
      i18n.lier(paragraphe, 'textContent', texteDuRenommage(etat.aRenommer.length, premiere.de, premiere.vers));
      return [paragraphe];
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
      i18n.lier(titre, 'textContent', etat.aRemplacer === 0 ? titreDeLEcriture(nom) : titreDuRemplacement(etat.aRemplacer, nom));
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
      // Des variables à renommer ne gardent pas leur nom : leur paragraphe le dit à la place.
      const garde: Texte = etat.aRenommer.length > 0 ? '' : TEXTES_DE_LA_REPRISE.gardentLeurNom;
      i18n.lier(suite, 'textContent', changees.length > COULEURS_LISTEES
        ? i18n.composer`${etNAutres(changees.length - COULEURS_LISTEES)} ${garde}`
        : garde);
      bloc.append(suite, ...paragrapheDuRenommage(etat));
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
      choix.append(annuler, gesteDEcriture(etat.aRemplacer === 0 ? TEXTES_DE_LA_GESTION.mettreAJour : remplacerNCouleurs(etat.aRemplacer), 'primary', 'confirmer-ecriture', () => {
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

    /** Le compteur qui donne un identifiant à la fiche d'une ligne dépliée, que sa bascule désigne. */
    let fichesOuvertes = 0;

    /** La ligne de `cle` dans la liste. */
    const ligneDe = (cle: string): HTMLElement | undefined =>
      Array.from(lignes.querySelectorAll<HTMLElement>('.palette-depliable')).find((ligne) => ligne.dataset.cle === cle);

    /** Déplie ou replie une ligne ; le focus reste sur sa bascule, que le rendu reconstruit. */
    function basculerLaLigne(cle: string): void {
      if (depliees.has(cle)) depliees.delete(cle);
      else depliees.add(cle);
      rendre();
      ligneDe(cle)?.querySelector<HTMLElement>('[data-geste="deplier"]')?.focus();
    }

    interface LigneDepliable {
      readonly cle: string;
      readonly nom: string;
      /** Ce que la ligne regroupe, à la suite du nom ; seule une palette groupée du fichier en porte. */
      readonly precision?: Texte;
      /** La teinte de la référence ; `null` pour une palette hors du plugin, dont la teinte est en tirets. */
      readonly teinte: string | null;
      readonly rampe: readonly HTMLSpanElement[];
      /** Ce que la ligne repliée montre au bord droit : les états, ou l'étiquette d'une palette hors du plugin. */
      readonly etats: readonly HTMLElement[];
      /** Les gestes de la ligne dépliée, à la place des états. */
      readonly gestes: () => readonly HTMLElement[];
      readonly fiche: () => readonly HTMLElement[];
    }

    /**
     * Une ligne de la liste ([UI-27]) : la bascule porte le chevron, la teinte
     * et le nom, et un clic ailleurs sur la ligne, hors d'un geste, la bascule
     * aussi. Dépliée, ses gestes remplacent ses états, et sa fiche suit.
     */
    function ligneDepliable(ligne: LigneDepliable): HTMLElement {
      const ouverte = depliees.has(ligne.cle);
      const element = document.createElement('section');
      element.className = 'palette-depliable';
      element.dataset.cle = ligne.cle;
      element.dataset.ouverte = String(ouverte);
      element.setAttribute('aria-label', ligne.nom);

      const tete = document.createElement('div');
      tete.className = 'palette-ligne';
      const bascule = document.createElement('button');
      bascule.type = 'button';
      bascule.className = 'palette-bascule';
      bascule.dataset.geste = 'deplier';
      bascule.setAttribute('aria-expanded', String(ouverte));
      const chevron = document.createElement('span');
      chevron.className = 'palette-chevron';
      chevron.setAttribute('aria-hidden', 'true');
      const teinte = document.createElement('i');
      teinte.className = 'fiche-teinte';
      teinte.setAttribute('aria-hidden', 'true');
      if (ligne.teinte === null) teinte.classList.add('teinte-hors-du-plugin');
      else teinte.style.background = ligne.teinte;
      const nom = document.createElement('span');
      nom.className = 'palette-nom';
      nom.textContent = ligne.nom;
      bascule.append(chevron, teinte, nom);
      if (ligne.precision) {
        const precision = document.createElement('span');
        precision.className = 'palette-precision';
        i18n.lier(precision, 'textContent', ligne.precision);
        bascule.append(precision);
      }
      const rampe = document.createElement('div');
      rampe.className = 'mini-rampe';
      rampe.setAttribute('aria-hidden', 'true');
      rampe.append(...ligne.rampe);
      const droite = document.createElement('div');
      if (ouverte) {
        droite.className = 'tete-gestes palette-gestes';
        droite.append(...ligne.gestes());
      } else {
        droite.className = 'palette-etats';
        droite.append(...ligne.etats);
      }
      tete.append(bascule, rampe, droite);
      tete.addEventListener('click', (evenement) => {
        const cible = evenement.target as Element;
        if (cible.closest('button') !== null && !bascule.contains(cible)) return;
        basculerLaLigne(ligne.cle);
      });
      element.append(tete);

      if (ouverte) {
        fichesOuvertes += 1;
        const fiche = document.createElement('div');
        fiche.className = 'palette-fiche';
        fiche.id = `palette-fiche-${fichesOuvertes}`;
        fiche.append(...ligne.fiche());
        bascule.setAttribute('aria-controls', fiche.id);
        element.append(fiche);
      }
      return element;
    }

    /** Une pastille par couleur, pour une rampe en miniature ; une couleur absente laisse la sienne vide. */
    function pastillesDeLaRampe(couleurs: readonly (string | null)[]): HTMLSpanElement[] {
      return couleurs.map((couleur) => {
        const nuance = document.createElement('span');
        if (couleur) nuance.style.background = couleur;
        return nuance;
      });
    }

    /** La fiche d'une palette du plugin, sous sa ligne dépliée ([UI-26]). */
    function ficheDePalette(lue: Recette, id: string, cadre: CadreDUnePalette, sansGeneration: boolean): HTMLElement[] {
      const palette = lue.palettes.find((candidate) => candidate.id === id)!;
      const analyse = analyseDe(lue, id);
      const nom = nomDeLaPalette(palette);
      const etatDesTokens = tokens.get(id);

      // La référence : sa pastille, son code, et la nuance qui la porte dans le thème des fiches.
      const reference = document.createElement('span');
      reference.className = 'fiche-reference ligne-secondaire';
      const teinte = document.createElement('i');
      teinte.className = 'fiche-teinte';
      teinte.style.background = palette.reference;
      teinte.setAttribute('aria-hidden', 'true');
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
      const fiche: HTMLElement[] = [];
      if (etatDesTokens && etatDesTokens.nomsOccupes.length > 0) fiche.push(blocDeConstat(tokensPartiels(etatDesTokens.nomsOccupes), 'alerte'));
      fiche.push(apercuCompact(lue, analyse, mode), information, lignesDeSortie(sorties, i18n));
      if (etatDesTokens && etatDesTokens.modifiees.length > 0 && !laissees.has(id)) fiche.push(encartDesModifiees(id, nom, etatDesTokens));
      else if (etatDesTokens && encart === id) fiche.push(etatDesTokens.reprise && etatDesTokens.aCreer.length === 0 ? encartDuRemplacement(id, nom, etatDesTokens) : encartDeLEcriture(id, nom, etatDesTokens));
      const refus = refusDesTokens.get(id);
      if (refus) fiche.push(blocDeConstat(refus, 'alerte'));
      return fiche;
    }

    /** La ligne d'une palette du plugin : la rampe de sa dernière intensité en miniature et l'état de chaque sortie ; dépliée, « Modifier ». */
    function ligneDePalette(lue: Recette, id: string, cadre: CadreDUnePalette, sansGeneration: boolean): HTMLElement {
      const palette = lue.palettes.find((candidate) => candidate.id === id)!;
      const analyse = analyseDe(lue, id);
      const etatDesTokens = tokens.get(id);
      const element = ligneDepliable({
        cle: id,
        nom: nomDeLaPalette(palette),
        teinte: palette.reference,
        rampe: pastillesDeLaRampe(rampeDe(analyse.rampes, analyse.intensites[analyse.intensites.length - 1])[mode].map((cran) => cran.hexa)),
        etats: [
          ...(etatDesTokens ? [pastille(etatDesTokens.etat, etatDesTokensEcrit(etatDesTokens.etat))] : []),
          pastille(cadre.etat, etatDeLaPlancheEcrit(cadre.etat)),
        ],
        gestes() {
          // « Modifier » ouvre Création sur la palette.
          const modifier = bouton(TEXTES_DE_LA_GESTION.modifier, 'bouton-discret', () => gestes.modifier(id, mode));
          modifier.dataset.geste = 'modifier';
          return [modifier];
        },
        fiche: () => ficheDePalette(lue, id, cadre, sansGeneration),
      });
      element.dataset.palette = id;
      element.dataset.etat = etatDeLaFiche(etatDesTokens?.etat ?? null, cadre.etat);
      return element;
    }

    /**
     * Déplie les palettes qui attendent une décision ([UI-32]) : des couleurs
     * changées dans Figma, ou des noms pris par d'autres variables. Une
     * palette repliée par le designer reste repliée tant que la même décision
     * attend.
     */
    function deplierLesDecisions(): void {
      for (const [id, etat] of tokens) {
        const attend = (etat.modifiees.length > 0 && !laissees.has(id)) || etat.nomsOccupes.length > 0;
        if (!attend) deplieesSeules.delete(id);
        else if (!deplieesSeules.has(id)) {
          deplieesSeules.add(id);
          depliees.add(id);
        }
      }
    }

    /** L'intertitre d'un groupe de palettes hors du plugin : son titre, son compte, et d'où elles viennent ([UI-33]). */
    function intertitre(titre: Texte, nombre: number, phrase: Texte): HTMLElement {
      const element = document.createElement('p');
      element.className = 'palette-intertitre';
      const nom = document.createElement('strong');
      i18n.lier(nom, 'textContent', titre);
      const compte = document.createElement('span');
      compte.className = 'section-compte';
      compte.textContent = String(nombre);
      const origine = document.createElement('span');
      origine.className = 'ligne-secondaire';
      i18n.lier(origine, 'textContent', phrase);
      element.append(nom, compte, origine);
      return element;
    }

    /** L'étiquette d'une palette hors du plugin, à la place des deux états de sa ligne repliée. */
    function etiquetteHorsDuPlugin(libelle: Texte): HTMLSpanElement {
      const etiquette = document.createElement('span');
      etiquette.className = 'etiquette';
      i18n.lier(etiquette, 'textContent', libelle);
      return etiquette;
    }

    /** Le nom d'une palette du fichier : son chemin, ou sa collection quand ses variables sont à la racine. */
    const nomDuFichier = (palette: PaletteDuFichier): string => palette.chemin || palette.nomDeLaCollection;

    /** Les couleurs du premier mode d'une palette du fichier, une pastille par nuance ; un alias laisse la sienne vide. */
    function pastillesDuFichier(palette: PaletteDuFichier): HTMLSpanElement[] {
      const couleurs = palette.modes.length > 0 ? palette.couleurs[palette.modes[0].id] ?? [] : [];
      return pastillesDeLaRampe(palette.nuances.map((_, rang) => couleurs[rang]?.slice(0, 7) ?? null));
    }

    /** L'aperçu d'une palette hors du plugin, en tirets : une rangée de pastilles. */
    function apercuHorsDuPlugin(pastilles: readonly HTMLSpanElement[]): HTMLDivElement {
      const apercu = document.createElement('div');
      apercu.className = 'fiche-apercu';
      apercu.style.setProperty('--colonnes', String(pastilles.length));
      apercu.setAttribute('aria-hidden', 'true');
      const rangee = document.createElement('div');
      rangee.className = 'fiche-rangee';
      const profil = document.createElement('span');
      profil.className = 'fiche-profil';
      rangee.append(profil, ...pastilles.map((nuance) => {
        nuance.className = 'fiche-pastille';
        return nuance;
      }));
      apercu.append(rangee);
      return apercu;
    }

    /**
     * La ligne d'une palette du fichier ([UI-33]) : la teinte en tirets et
     * l'étiquette « Variables du fichier » ; dépliée, « Modifier dans le
     * plugin » ([UI-34]), puis la rampe de son premier mode, sa collection,
     * son chemin, son nombre de couleurs et ses modes.
     */
    function ligneDuFichier(palette: PaletteDuFichier): HTMLElement {
      const element = ligneDepliable({
        cle: `fichier:${palette.collection}/${palette.chemin}`,
        nom: nomDuFichier(palette),
        teinte: null,
        rampe: pastillesDuFichier(palette),
        etats: [etiquetteHorsDuPlugin(TEXTES_DE_LA_GESTION.variablesDuFichier)],
        gestes() {
          const reprendre = bouton(TEXTES_DE_LA_GESTION.modifierDansLePlugin, 'bouton-discret', () => {
            if (repriseEnCours || !gestes.reprendre(palette)) return;
            repriseEnCours = true;
            zoneDesVariables.replaceChildren();
            zoneDesVariables.hidden = true;
            rendreLesGestes();
          });
          reprendre.dataset.geste = 'reprendre';
          return [reprendre];
        },
        fiche() {
          const information = document.createElement('div');
          information.className = 'fiche-information';
          const ligne = document.createElement('span');
          ligne.className = 'ligne-secondaire chemin';
          const chemin = document.createElement('code');
          const bouts = `${palette.nuances[0]} … ${palette.nuances[palette.nuances.length - 1]}`;
          chemin.textContent = [palette.nomDeLaCollection, ...palette.chemin.split('/').filter(Boolean), bouts].join(' / ');
          ligne.append(chemin, i18n.noeud(couleursDeLaPaletteDuFichier(palette.nuances.length, palette.modes.map((modeLu) => modeLu.nom))));
          information.append(ligne);
          return [apercuHorsDuPlugin(pastillesDuFichier(palette)), information];
        },
      });
      element.classList.add('fiche-du-fichier');
      element.dataset.duFichier = `${palette.collection}/${palette.chemin}`;
      return element;
    }

    /**
     * La ligne d'une palette groupée du fichier : une seule pour ses groupes.
     * Elle montre la racine et ce qu'elle regroupe ; « Modifier dans le
     * plugin » reprend la palette entière, sous un identifiant neuf. Elle ne
     * porte pas « Copier » : la copie ne concerne que les bibliothèques.
     */
    function ligneGroupeeDuFichier(groupee: PaletteGroupee): HTMLElement {
      const premiere = groupee.groupes[0].palette;
      const element = ligneDepliable({
        cle: `fichier:${groupee.collection}/${groupee.racine}#${groupee.forme}`,
        nom: groupee.racine || groupee.nomDeLaCollection,
        precision: regroupementDuFichier(groupee.forme),
        teinte: null,
        rampe: pastillesDuFichier(premiere),
        etats: [etiquetteHorsDuPlugin(TEXTES_DE_LA_GESTION.variablesDuFichier)],
        gestes() {
          const reprendre = bouton(TEXTES_DE_LA_GESTION.modifierDansLePlugin, 'bouton-discret', () => {
            if (repriseEnCours || !gestes.reprendre(groupee)) return;
            repriseEnCours = true;
            zoneDesVariables.replaceChildren();
            zoneDesVariables.hidden = true;
            rendreLesGestes();
          });
          reprendre.dataset.geste = 'reprendre';
          return [reprendre];
        },
        fiche() {
          const information = document.createElement('div');
          information.className = 'fiche-information';
          const ligne = document.createElement('span');
          ligne.className = 'ligne-secondaire chemin';
          const chemin = document.createElement('code');
          const bouts = `${premiere.nuances[0]} … ${premiere.nuances[premiere.nuances.length - 1]}`;
          chemin.textContent = [groupee.nomDeLaCollection, ...groupee.racine.split('/').filter(Boolean), bouts].join(' / ');
          ligne.append(chemin, i18n.noeud(couleursDeLaPaletteDuFichier(premiere.nuances.length, premiere.modes.map((modeLu) => modeLu.nom))));
          information.append(ligne);
          return [apercuHorsDuPlugin(pastillesDuFichier(premiere)), information];
        },
      });
      element.classList.add('fiche-du-fichier');
      element.dataset.duFichier = `${groupee.collection}/${groupee.racine}`;
      return element;
    }

    /** Ce qui désigne une palette de bibliothèque : la clé de sa collection et son chemin. */
    const cleDeBibliotheque = (palette: PaletteDeBibliotheque): string => `${palette.collection}/${palette.chemin}`;
    const nomDeBibliotheque = (palette: PaletteDeBibliotheque): string => palette.chemin || palette.nomDeLaCollection;

    /** Une pastille vide par nuance : la couleur d'une variable de bibliothèque ne se lit qu'à la copie. */
    const pastillesVides = (palette: PaletteDeBibliotheque): HTMLSpanElement[] => pastillesDeLaRampe(palette.nuances.map(() => null));

    /**
     * La ligne d'une palette de bibliothèque ([UI-33], [VAR-14]) : l'étiquette
     * « Bibliothèque » et des pastilles vides ; dépliée, « Copier dans le
     * plugin », puis le nom de sa collection avec son nombre de variables. La
     * copie demande confirmation dans la fiche : elle ajoute des variables au
     * fichier.
     */
    function ligneDeBibliotheque(palette: PaletteDeBibliotheque): HTMLElement {
      const cle = cleDeBibliotheque(palette);
      const cleDeLaLigne = `bibliotheque:${cle}`;
      const element = ligneDepliable({
        cle: cleDeLaLigne,
        nom: nomDeBibliotheque(palette),
        teinte: null,
        rampe: pastillesVides(palette),
        etats: [etiquetteHorsDuPlugin(TEXTES_DE_LA_GESTION.bibliotheque)],
        gestes() {
          if (copieAConfirmer === cle) return [];
          const copier = bouton(TEXTES_DE_LA_GESTION.copierDansLePlugin, 'bouton-discret', () => {
            copieAConfirmer = cle;
            rendre();
            ligneDe(cleDeLaLigne)?.querySelector<HTMLElement>('[data-geste="confirmer-copie"]')?.focus();
          });
          copier.dataset.geste = 'copier';
          return [copier];
        },
        fiche() {
          const information = document.createElement('div');
          information.className = 'fiche-information';
          const ligne = document.createElement('span');
          ligne.className = 'ligne-secondaire chemin';
          const collection = i18n.noeud(collectionDeBibliotheque(palette.nomDeLaCollection, palette.variablesDeLaCollection));
          const chemin = document.createElement('code');
          const bouts = `${palette.nuances[0]} … ${palette.nuances[palette.nuances.length - 1]}`;
          chemin.textContent = [...palette.chemin.split('/').filter(Boolean), bouts].join(' / ');
          ligne.append(collection, chemin, i18n.noeud(i18n.composer`${couleursDeBibliotheque(palette.nuances.length)} · ${TEXTES_DE_LA_GESTION.couleursLuesALaCopie}`));
          information.append(ligne);
          const fiche: HTMLElement[] = [apercuHorsDuPlugin(pastillesVides(palette)), information];
          if (copieAConfirmer === cle) fiche.push(encartDeLaCopie(palette, cleDeLaLigne));
          return fiche;
        },
      });
      element.classList.add('fiche-du-fichier');
      element.dataset.bibliotheque = cle;
      return element;
    }

    /** L'encart qui confirme la copie d'une palette de bibliothèque ([VAR-14]). */
    function encartDeLaCopie(palette: PaletteDeBibliotheque, cleDeLaLigne: string): HTMLDivElement {
      const bloc = document.createElement('div');
      bloc.className = 'encart';
      bloc.dataset.encart = 'copie';
      const titre = document.createElement('p');
      titre.className = 'encart-titre';
      i18n.lier(titre, 'textContent', titreDeLaCopie(nomDeBibliotheque(palette)));
      const texte = document.createElement('p');
      texte.className = 'ligne-secondaire';
      i18n.lier(texte, 'textContent', texteDeLaCopie(palette.nuances.length));
      const choix = document.createElement('div');
      choix.className = 'confirmation-gestes';
      const annuler = createButton({
        label: TEXTES_DE_LA_GESTION.annuler,
        variant: 'secondary',
        compact: true,
        onClick: () => {
          copieAConfirmer = null;
          rendre();
          ligneDe(cleDeLaLigne)?.querySelector<HTMLElement>('[data-geste="copier"]')?.focus();
        },
      });
      annuler.dataset.geste = 'annuler-copie';
      const confirmerLaCopie = createButton({
        label: TEXTES_DE_LA_GESTION.copier,
        compact: true,
        onClick: () => {
          if (repriseEnCours || !gestes.copier(palette)) return;
          repriseEnCours = true;
          zoneDesVariables.replaceChildren();
          zoneDesVariables.hidden = true;
          rendreLesGestes();
        },
      });
      confirmerLaCopie.dataset.geste = 'confirmer-copie';
      choix.append(annuler, confirmerLaCopie);
      bloc.append(titre, texte, choix);
      return bloc;
    }

    /** Une notice sur un cadre, avec le geste qui le montre dans Figma (E18). */
    function noticeDeCadre(constat: Constat, page: string, cadre: string): HTMLDivElement {
      const bloc = blocDeConstat(constat, 'notice');
      bloc.append(bouton(TEXTES_DU_DESSIN.voirSurLaPlanche, 'bouton-discret', () => gestes.voirSurLaPlanche(page, [cadre])));
      return bloc;
    }

    /** Le nom de la collection de la destination, pour la ligne « Tokens » de la connexion. */
    function collectionDeLaDestination(lues: VariablesDuFichier): Texte {
      const { collection } = lues.suivi.destination;
      if ('nom' in collection) return collection.nom;
      return lues.collections.find((candidate) => candidate.id === collection.id)?.nom ?? TEXTES_DE_LA_GESTION.collectionIntrouvable;
    }

    function rendre(): void {
      basculeDesThemes.rendre(mode);
      if (!recette || !planche || !fraicheur || !variables) return;
      const lue = recette;
      const etatDesCadres = fraicheur;
      const palettes = lue.palettes;
      const sansGeneration = planche.suiviFutur;
      sectionDuPlugin.poserLeCompte(palettes.length);
      i18n.lier(details, 'textContent', detailsTechniques(empreinte, VERSION_DU_SUIVI));

      bloquant.replaceChildren(...(planche.suiviFutur ? [blocDeConstat(suiviFutur(), 'bloquant')] : []));
      bloquant.hidden = !planche.suiviFutur;
      vide.hidden = palettes.length > 0 || planche.suiviFutur;
      if (!vide.hidden) {
        const texte = document.createElement('p');
        texte.className = 'etat-lecture';
        i18n.lier(texte, 'textContent', TEXTES_DU_DESSIN.plancheSansPalette);
        vide.replaceChildren(texte, createButton({ label: TEXTES_DU_DESSIN.versLesPalettes, variant: 'secondary', onClick: gestes.versLesPalettes }));
      }

      connexion.afficher({
        tokens: suiviDesVariablesFutur(variables.suivi) ? null : { collection: collectionDeLaDestination(variables), groupe: variables.suivi.destination.groupe },
        nomDeLaPage: planche.nomDeLaPage,
        luLe,
      });
      titreDesTokens.hidden = tokens.size === 0;

      // Les lignes se reconstruisent : le focus d'un geste revient au même geste de la même ligne.
      const actif = document.activeElement as HTMLElement | null;
      const repere = gesteAFocaliser ?? (actif && lignes.contains(actif)
        ? { palette: actif.closest<HTMLElement>('.palette-depliable')?.dataset.cle, geste: actif.dataset.geste }
        : null);
      gesteAFocaliser = null;
      const groupes: HTMLElement[] = etatDesCadres.palettes.map((cadre) => ligneDePalette(lue, cadre.palette, cadre, sansGeneration));
      const regroupees = regrouperLesPalettes(duFichier);
      if (regroupees.length > 0) {
        groupes.push(
          intertitre(TEXTES_DE_LA_GESTION.dejaDansLeFichier, regroupees.length, TEXTES_DE_LA_GESTION.horsDuPlugin),
          ...regroupees.map((regroupee) => (regroupee.type === 'groupee' ? ligneGroupeeDuFichier(regroupee) : ligneDuFichier(regroupee.palette))),
        );
      }
      if (bibliotheques.palettes.length > 0) {
        groupes.push(
          intertitre(TEXTES_DE_LA_GESTION.dansLesBibliotheques, bibliotheques.palettes.length, TEXTES_DE_LA_GESTION.desBibliotheques),
          ...bibliotheques.palettes.map(ligneDeBibliotheque),
        );
      }
      lignes.replaceChildren(...groupes);
      liste.hidden = groupes.length === 0;
      liste.dataset.tokens = String(tokens.size > 0);
      if (repere?.palette && repere.geste) {
        const ligne = ligneDe(repere.palette);
        // Un geste que l'état a retiré laisse le focus à « Modifier » de la même ligne, ou à sa bascule.
        (ligne?.querySelector<HTMLElement>(`[data-geste="${repere.geste}"]`)
          ?? ligne?.querySelector<HTMLElement>('[data-geste="modifier"]')
          ?? ligne?.querySelector<HTMLElement>('[data-geste="deplier"]'))?.focus();
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
        (suivante?.querySelector<HTMLElement>('button') ?? sectionDuPlugin.bascule).focus();
        focusApresRetrait = null;
      } else if (repereSupprime?.palette && repereSupprime.geste) {
        supprimees.querySelector<HTMLElement>(`.carte-supprimee[data-supprimee="${repereSupprime.palette}"] [data-geste="${repereSupprime.geste}"]`)?.focus();
      }

      notices.replaceChildren(
        ...etatDesCadres.copies.map(({ nom, cadre, page }) => noticeDeCadre(copieDeCadre(nom), page, cadre)),
        ...(bibliotheques.lisibles ? [] : [blocDeConstat(bibliothequesIllisibles(bibliotheques.illisibles ?? []), 'notice')]),
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

    const onglet: OngletGestionUi = {
      element,
      afficher(classement, lue, plancheLue, profilLu, empreinteLue, variablesLues, luLeRecu) {
        if (appui) {
          etatEnAttente = [classement, lue, plancheLue, profilLu, empreinteLue, variablesLues, luLeRecu];
          return;
        }
        etatEnAttente = null;
        gestes.recetteEnFichier.afficher(classement);
        if (classement.etat === 'future' || classement.etat === 'illisible') {
          recette = null;
          fraicheur = null;
          connexion.element.hidden = true;
          pageDesPlanches.element.hidden = true;
          destination.fermer();
          sectionDuPlugin.element.hidden = true;
          lignes.replaceChildren();
          notices.replaceChildren();
          const constat = classement.etat === 'future' ? recetteFuture(classement.version) : recetteIllisible(classement.refus);
          bloquant.replaceChildren(blocDeConstat(constat, 'bloquant'));
          bloquant.hidden = false;
          // Les gestes de sortie d'une recette illisible ou future se montrent sans clic ([REC-11]).
          sectionDeLaRecette.ouvrir();
          return;
        }
        connexion.element.hidden = pageDesPlanches.estOuverte() || destination.estOuverte();
        sectionDuPlugin.element.hidden = false;
        recette = lue;
        planche = plancheLue;
        variables = variablesLues;
        bibliotheques = variablesLues.bibliotheques ?? SANS_BIBLIOTHEQUE;
        if (copieAConfirmer !== null && !bibliotheques.palettes.some((palette) => cleDeBibliotheque(palette) === copieAConfirmer)) copieAConfirmer = null;
        profil = profilLu;
        empreinte = empreinteLue;
        luLe = luLeRecu;
        fraicheur = lue ? fraicheurDeLaPlanche(lue, profil, plancheLue) : null;
        const introuvables = (fraicheur?.palettes ?? []).filter(({ etat }) => etat === 'introuvable').map(({ palette }) => palette);
        const dejaAbsentes = absentes;
        absentes = new Set(plancheLue.recherche === 'fichier' ? introuvables : introuvables.filter((id) => dejaAbsentes.has(id)));
        analyses.clear();
        calculerLesTokens();
        deplierLesDecisions();
        // Un encart ouvert sur une palette que la recette ne porte plus, ou qui n'a plus rien à créer ni à remplacer, se ferme.
        const ouvert = encart === null ? undefined : tokens.get(encart);
        if (encart !== null && (!ouvert || (ouvert.aCreer.length === 0 && ouvert.aRenommer.length === 0 && !(ouvert.reprise && ouvert.aRemplacer > 0)))) encart = null;
        if (variablesAConfirmer !== null && !orphelines.some((orpheline) => orpheline.palette === variablesAConfirmer)) variablesAConfirmer = null;
        rendre();
      },
      afficherDessin(etat, nomsDuDessin) {
        enCours = etat.phase === 'en-cours';
        connexion.synchroniser.disabled = enCours;
        if (etat.phase === 'en-cours') {
          progression = { fait: etat.fait, total: etat.total, largeur: progression?.largeur ?? null };
          nomDuDessin = etat.nom;
          // L'annonce reste dans une région masquée à l'œil : la page ne bouge pas.
          i18n.lier(annonceDuDessin, 'textContent', progressionDuDessin(etat.fait, etat.total, etat.nom));
        } else {
          progression = null;
          annonceDuDessin.textContent = '';
        }
        rendreLesGestes();
        const resultat = blocDuResultat(etat, nomsDuDessin, gestes);
        const enfants: HTMLElement[] = resultat ? [resultat] : [];
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
        if (resultat && resultat.issue !== 'ecrites') {
          // Rien ne s'est écrit, pour aucune palette : le message se lit sous la section de la connexion.
          if (resultat.issue === 'recette-changee') {
            const bloc = blocDeConstat(variablesSurUneAutreRecette(), 'bloquant');
            bloc.append(createButton({ label: TEXTES.recharger, onClick: () => gestes.recharger() }));
            zoneDesVariables.replaceChildren(bloc);
          } else if (resultat.issue === 'suivi-futur') zoneDesVariables.replaceChildren(blocDeConstat(suiviFutur(), 'bloquant'));
          else if (resultat.issue === 'interrompue') zoneDesVariables.replaceChildren(blocDeConstat(gesteInterrompu(resultat.message), 'alerte'));
          zoneDesVariables.hidden = zoneDesVariables.childElementCount === 0;
        } else if (resultat) {
          const nom = (id: string): string => noms()[id] ?? id;
          for (const issue of resultat.palettes) {
            // Un refus, ou des couleurs changées dans Figma, se lisent dans la fiche : sa ligne se déplie.
            if (issue.issue !== 'ecrite' && issue.issue !== 'absente') depliees.add(issue.palette);
            if (issue.issue === 'ecrite') {
              if (encart === issue.palette) encart = null;
              laissees.delete(issue.palette);
            } else if (issue.issue === 'nom-pris') refusDesTokens.set(issue.palette, nomDejaPris(nom(issue.palette), issue.nom));
            else if (issue.issue === 'collection-introuvable') refusDesTokens.set(issue.palette, collectionDisparue(nom(issue.palette)));
            else if (issue.issue === 'mode-introuvable') refusDesTokens.set(issue.palette, modeDisparu(nom(issue.palette), issue.mode));
            else if (issue.issue === 'modes-refuses') refusDesTokens.set(issue.palette, modesRefuses(nom(issue.palette), issue.message));
            else if (issue.issue === 'interrompue') refusDesTokens.set(issue.palette, ecritureInterrompue(nom(issue.palette), issue.message));
          }
        }
        rendre();
      },
      recevoirDestination(issue) {
        if (!destination.recevoir(issue)) return;
        // La destination rangée vaut tout de suite : la ligne de la connexion et l'encart d'écriture la lisent avant l'état relu.
        if (issue.issue === 'rangee' && variables) {
          variables = { ...variables, suivi: { ...variables.suivi, destination: issue.destination, confirmee: true } };
          calculerLesTokens();
          deplierLesDecisions();
        }
        const ensuite = apresLaDestination;
        apresLaDestination = null;
        rendreLeBloc(connexion.changerLaDestination);
        if (ensuite !== null && (tokens.get(ensuite)?.aCreer.length ?? 0) > 0) {
          encart = ensuite;
          depliees.add(ensuite);
          gesteAFocaliser = { palette: ensuite, geste: 'confirmer-ecriture' };
        }
        rendre();
      },
      recevoirReprise(issue) {
        repriseEnCours = false;
        // Une recette changée ailleurs ouvre le conflit d'enregistrement, que l'onglet Création dit.
        if (issue.issue === 'palette-introuvable' || issue.issue === 'invalide') zoneDesVariables.replaceChildren(blocDeConstat(repriseRefusee(), 'alerte'));
        else if (issue.issue === 'suivi-futur') zoneDesVariables.replaceChildren(blocDeConstat(suiviFutur(), 'bloquant'));
        else if (issue.issue === 'interrompue') zoneDesVariables.replaceChildren(blocDeConstat(gesteInterrompu(issue.message), 'alerte'));
        else zoneDesVariables.replaceChildren();
        zoneDesVariables.hidden = zoneDesVariables.childElementCount === 0;
        rendreLesGestes();
      },
      recevoirCopie(issue) {
        repriseEnCours = false;
        if (issue.issue === 'copiee') copieAConfirmer = null;
        // Une recette changée ailleurs ouvre le conflit d'enregistrement, que l'onglet Création dit.
        if (issue.issue === 'palette-introuvable' || issue.issue === 'invalide') zoneDesVariables.replaceChildren(blocDeConstat(copieRefusee(), 'alerte'));
        else if (issue.issue === 'sans-couleur') zoneDesVariables.replaceChildren(blocDeConstat(copieSansCouleur(), 'alerte'));
        else if (issue.issue === 'bibliotheque-illisible') zoneDesVariables.replaceChildren(blocDeConstat(bibliothequeIllisible(issue.message), 'alerte'));
        else zoneDesVariables.replaceChildren();
        if (issue.importsEffectues?.length) zoneDesVariables.append(blocDeConstat(referencesImportees(issue.importsEffectues), 'notice'));
        zoneDesVariables.hidden = zoneDesVariables.childElementCount === 0;
        rendre();
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
          annonceDuRetrait.replaceChildren(issue.issue === 'interrompue' ? blocDeConstat(gesteInterrompu(issue.message), 'alerte') : issue.issue === 'suivi-futur' ? blocDeConstat(suiviFutur(), 'bloquant') : blocDeConstat(suppressionDesVariablesRefusee(), 'notice'));
        }
        annonceDuRetrait.hidden = annonceDuRetrait.childElementCount === 0;
        rendre();
        // La carte disparaît à l'état relu : le focus rejoint alors la carte suivante, ou l'en-tête des palettes du plugin.
        if (issue.issue === 'retirees') focusApresRetrait = 0;
      },
      recevoirErreurDeLecture(message) {
        zoneDesVariables.replaceChildren(blocDeConstat(gesteInterrompu(message), 'alerte'));
        zoneDesVariables.hidden = false;
      },
    };
    return onglet;
  }
  return { createOngletGestion };
}

export const creerVuesOngletGestion = memoriserVues(construireVues);

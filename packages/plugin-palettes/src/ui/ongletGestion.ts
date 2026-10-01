/**
 * L'onglet Gestion (section 13.2, [UI-24] à [UI-29]). De haut en bas : le
 * bloc « Connexion à Figma », que la carte « Page des planches » remplace le
 * temps d'un choix ; la barre « Palettes du plugin · N » et ses deux
 * bascules, la vue et le thème des fiches ; puis les palettes de la recette,
 * dans son ordre.
 *
 * En vue complète, une fiche par palette : le nom, la pastille d'état et
 * « Modifier » sur la première ligne, les rampes dans le thème choisi, la
 * référence et le résultat des garanties, puis une ligne par sortie. En vue
 * condensée, un tableau sans geste, une ligne par palette.
 *
 * Suivent une carte par palette supprimée dont le cadre reste dans Figma
 * ([PLA-27]), les notices, puis la carte repliée « Palettes et réglages »
 * (V8.5). Chaque génération dessine les parties que la recette choisit
 * ([PLA-28]). Au-delà de six palettes, « Tout mettre à jour » demande
 * confirmation ([PLA-24], D-I).
 */
import { MODES, rampeDe, type Classement, type Mode, type Recette } from 'ucm-couleur';

import { analyserPalette } from '../analyse';
import type { IssueDeLaPage, IssueDuRetrait } from '../ecriture/planche';
import { VERSION_DU_SUIVI, type CadreLu, type EtatDeLaPlanche, type ProfilDuDocument } from '../lecture';
import { fraicheurDeLaPlanche, type CadreDUnePalette, type FraicheurDeLaPlanche } from '../planche/fraicheur';
import type { VueDeGestion } from '../preferences';
import { etatDeLaFiche, type EtatDeLaFiche } from '../presentation';
import { creerVuesApercuCompact } from './apercuCompact';
import { createCarte } from './carte';
import { creerVuesConnexion } from './connexion';
import { creerVuesConstats } from './constats';
import { type EtatDuDessin, type GestesDuResultat } from './dessin';
import { creerVuesDessin } from './dessin';
import type { GestesDeLaRecetteUi } from './gestesDeLaRecette';
import { memoriserVues, type Localisation, type Texte } from './localisation';
import { creerVuesPageDesPlanches } from './pageDesPlanches';
import { creerSocleLocalise } from './socleLocalise';
import { lignesDeSortie, type LigneDeSortie } from './sorties';
import { type Constat } from './textes';

export interface OngletGestionUi {
  element: HTMLDivElement;
  /** `luLe` est l'heure du dernier état reçu du sandbox, que le bloc de la connexion écrit en durée ([UI-24]). */
  afficher(classement: Classement, recette: Recette | null, planche: EtatDeLaPlanche, profil: ProfilDuDocument, empreinte: string | null, luLe: number): void;
  afficherDessin(etat: EtatDuDessin, noms: { readonly [id: string]: string }): void;
  /** Rend les gestes de génération inactifs, avec la raison ; `null` les rend (V12.1). */
  bloquer(raison: Texte | null): void;
  /**
   * L'issue de « Supprimer définitivement » ([PLA-27]). Un cadre retiré ou
   * déjà absent quitte la planche par l'état suivant ; sa carte disparaît
   * alors, et le focus passe à la carte suivante, ou au compte des palettes.
   */
  recevoirRetrait(issue: IssueDuRetrait): void;
  /** L'issue de « Enregistrer », dans la carte « Page des planches » ([UI-29]). */
  recevoirPage(issue: IssueDeLaPage): void;
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
  /** Les gestes de la recette en fichier, dans la carte « Palettes et réglages » (V8.5). */
  recetteEnFichier: GestesDeLaRecetteUi;
}

function construireVues(i18n: Localisation) {
  const { createButton } = creerSocleLocalise(i18n);
  const { apercuCompact, resultatsDesGaranties } = creerVuesApercuCompact(i18n);
  const { blocDeConstat } = creerVuesConstats(i18n);
  const { blocDuResultat } = creerVuesDessin(i18n);
  const { createConnexion } = creerVuesConnexion(i18n);
  const { createPageDesPlanches } = creerVuesPageDesPlanches(i18n);
  const { TEXTES, TEXTES_DE_LA_GESTION, TEXTES_DE_LA_PALETTE_SUPPRIMEE, TEXTES_DU_DESSIN, confirmationDuDessin, copieDeCadre, detailsTechniques, avecLeNom, etatDeLaFicheEcrit, etatDeLaPlancheEcrit, nomDeLaPalette, noticeDisplayP3, ouvrirLaFiche, pageDeLaPlanche, palettesDuPlugin, progressionDuDessin, recetteFuture, recetteIllisible, suiviFutur, suppressionRefusee, verifierLaPalette } = i18n.messages;

  /** Au-delà de ce nombre, une génération groupée demande confirmation (D-I). */
  const SEUIL_DE_CONFIRMATION = 6;


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

  function createOngletGestion(gestes: GestesDeLaGestion, vueInitiale: VueDeGestion): OngletGestionUi {
    const element = document.createElement('div');
    element.className = 'page-stack colonne';

    let vue: VueDeGestion = vueInitiale;
    let mode: Mode = 'light';

    // Le bloc de la connexion, et la carte qui le remplace le temps de choisir la page des planches ([UI-29]).
    const connexion = createConnexion({
      synchroniser: () => gestes.synchroniser(),
      changerLaPage() {
        if (!planche) return;
        connexion.element.hidden = true;
        pageDesPlanches.ouvrir(planche);
      },
      toutMettreAJour: () => demander(enRetard),
    });
    const pageDesPlanches = createPageDesPlanches({
      enregistrer: (page) => gestes.choisirLaPage(page),
      annuler: rendreLeBloc,
    });

    /** Rend le bloc de la connexion à la place de la carte, et le focus à « Changer ». */
    function rendreLeBloc(): void {
      connexion.element.hidden = false;
      connexion.changerLaPage.focus();
    }

    // La barre des palettes : leur compte, la vue, puis le thème des fiches ([UI-25]).
    const compte = document.createElement('p');
    compte.className = 'planche-compte';
    // Le focus y revient quand la dernière carte de palette supprimée disparaît.
    compte.tabIndex = -1;
    const basculeDesVues = creerBascule<VueDeGestion>(
      TEXTES_DE_LA_GESTION.vues,
      [['complete', TEXTES_DE_LA_GESTION.vueComplete], ['condensee', TEXTES_DE_LA_GESTION.vueCondensee]],
      (valeur) => {
        if (valeur === vue) return;
        vue = valeur;
        gestes.rangerLaVue(vue);
        rendre();
      },
    );
    basculeDesVues.element.dataset.bascule = 'vue';
    const basculeDesThemes = creerBascule<Mode>(
      TEXTES_DU_DESSIN.themeDesFiches,
      MODES.map((valeur) => [valeur, valeur === 'light' ? TEXTES.modeClair : TEXTES.modeSombre] as const),
      (valeur) => {
        mode = valeur;
        rendre();
      },
    );
    basculeDesThemes.element.dataset.bascule = 'theme';
    const enTete = document.createElement('div');
    enTete.className = 'planche-tete';
    enTete.append(compte, basculeDesVues.element, basculeDesThemes.element);

    const zoneDuResultat = document.createElement('div');
    zoneDuResultat.hidden = true;
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
    for (const titre of [TEXTES_DE_LA_GESTION.colonnePalette, TEXTES_DE_LA_GESTION.colonneNuances, TEXTES_DE_LA_GESTION.planche]) {
      const cellule = document.createElement('th');
      cellule.scope = 'col';
      i18n.lier(cellule, 'textContent', titre);
      titres.append(cellule);
    }
    teteDeTable.append(titres);
    const corpsDeTable = document.createElement('tbody');
    table.append(teteDeTable, corpsDeTable);
    table.hidden = true;

    // La confirmation de « Tout mettre à jour » : elle garde les palettes qu'elle confirme.
    const confirmation = document.createElement('div');
    confirmation.className = 'confirmation';
    const texteDeConfirmation = document.createElement('p');
    const gestesDeConfirmation = document.createElement('div');
    gestesDeConfirmation.className = 'confirmation-gestes';
    confirmation.append(texteDeConfirmation, gestesDeConfirmation);
    confirmation.hidden = true;
    let aConfirmer: readonly string[] | null = null;
    gestesDeConfirmation.append(
      createButton({ label: TEXTES_DU_DESSIN.confirmer, onClick: () => lancer(aConfirmer ?? []) }),
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

    // Les palettes supprimées dont le cadre reste dans Figma, puis l'issue du dernier retrait ([PLA-27]).
    const supprimees = document.createElement('div');
    supprimees.className = 'liste-planche';
    const annonceDuRetrait = document.createElement('div');
    annonceDuRetrait.className = 'page-stack';
    annonceDuRetrait.setAttribute('role', 'status');
    annonceDuRetrait.hidden = true;

    element.append(connexion.element, pageDesPlanches.element, confirmation, zoneDuResultat, enTete, vide, liste, table, supprimees, annonceDuRetrait, notices, carteDeLaRecette.element);

    let recette: Recette | null = null;
    let planche: EtatDeLaPlanche | null = null;
    /**
     * La fraîcheur et les analyses ne dépendent ni du thème des fiches ni de
     * la vue : elles se calculent à chaque état lu, pas à chaque bascule.
     */
    let fraicheur: FraicheurDeLaPlanche | null = null;
    const analyses = new Map<string, ReturnType<typeof analyserPalette>>();
    let profil: ProfilDuDocument = 'SRGB';
    let luLe = Date.now();
    /** Les palettes que « Tout mettre à jour » dessinerait, dans l'ordre de la recette ([UI-28]). */
    let enRetard: readonly string[] = [];
    /**
     * Les palettes dont le cadre reste introuvable après une recherche sur
     * toutes les pages : leur planche se recrée sans risque de doublon. Un
     * cadre introuvable sur la seule page des planches attend « Synchroniser ».
     */
    let absentes: ReadonlySet<string> = new Set();
    let enCours = false;
    let blocage: Texte | null = null;
    /** Le retrait demandé, jusqu'à son issue : le cadre, son nom et le rang de sa carte. */
    let retraitEnCours: { readonly cadre: string; readonly nom: string; readonly rang: number } | null = null;
    /** Le rang de la carte retirée, que le focus rejoint au rendu qui la fait disparaître. */
    let focusApresRetrait: number | null = null;
    /** La palette dont la fiche vient en vue au rendu qui suit le clic sur sa ligne du tableau. */
    let ficheAMontrer: string | null = null;

    /** Les gestes d'écriture, inactifs pendant un dessin ou un conflit d'enregistrement. */
    function rendreLesGestes(): void {
      const inactif = enCours || blocage !== null;
      for (const geste of [connexion.toutMettreAJour, ...Array.from(liste.querySelectorAll<HTMLButtonElement>('[data-geste="generer"]'))]) {
        geste.disabled = inactif;
        i18n.lier(geste, 'title', blocage ?? '');
      }
      // Un suivi d'une version plus récente refuse le changement de page avant toute écriture ([PLA-29]).
      connexion.changerLaPage.disabled = inactif || planche === null || planche.suiviFutur;
      i18n.lier(connexion.changerLaPage, 'title', blocage ?? '');
      for (const geste of Array.from(supprimees.querySelectorAll<HTMLButtonElement>('[data-geste="supprimer"]'))) {
        geste.disabled = inactif || retraitEnCours !== null;
        i18n.lier(geste, 'title', blocage === null ? '' : TEXTES_DE_LA_PALETTE_SUPPRIMEE.enConflit);
      }
    }

    function retirer(cadre: CadreLu, rang: number): void {
      if (retraitEnCours || !gestes.retirer(cadre.palette, cadre.cadre)) return;
      retraitEnCours = { cadre: cadre.cadre, nom: cadre.nom, rang };
      annonceDuRetrait.replaceChildren();
      rendreLesGestes();
    }

    /** La carte d'une palette supprimée : son nom, une phrase, « Afficher dans Figma » et « Supprimer définitivement ». */
    function carteSupprimee(cadre: CadreLu, rang: number): HTMLElement {
      const carte = createCarte({ titre: cadre.nom }, i18n);
      carte.element.classList.add('fiche-planche', 'carte-supprimee');
      carte.element.dataset.cadre = cadre.cadre;
      const texte = document.createElement('p');
      i18n.lier(texte, 'textContent', TEXTES_DE_LA_PALETTE_SUPPRIMEE.texte);
      const gestesDeLaCarte = document.createElement('div');
      gestesDeLaCarte.className = 'fiche-gestes';
      const voir = createButton({ label: TEXTES_DU_DESSIN.voirSurLaPlanche, variant: 'secondary', compact: true, onClick: () => gestes.voirSurLaPlanche(cadre.page, [cadre.cadre]) });
      voir.dataset.geste = 'voir';
      const supprimer = createButton({ label: TEXTES_DE_LA_PALETTE_SUPPRIMEE.supprimer, variant: 'danger', compact: true, onClick: () => retirer(cadre, rang) });
      supprimer.dataset.geste = 'supprimer';
      gestesDeLaCarte.append(voir, supprimer);
      carte.corps.append(texte, gestesDeLaCarte);
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
      aConfirmer = null;
      confirmation.hidden = true;
      gestes.dessiner(palettes, noms());
    }

    function demander(palettes: readonly string[]): void {
      if (palettes.length === 0) return;
      if (palettes.length <= SEUIL_DE_CONFIRMATION) {
        lancer(palettes);
        return;
      }
      aConfirmer = palettes;
      i18n.lier(texteDeConfirmation, 'textContent', confirmationDuDessin(palettes.length));
      confirmation.hidden = false;
    }

    function analyseDe(lue: Recette, id: string): ReturnType<typeof analyserPalette> {
      const analyse = analyses.get(id) ?? analyserPalette(lue, lue.palettes.find((candidate) => candidate.id === id)!);
      analyses.set(id, analyse);
      return analyse;
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
        geste.disabled = enCours || blocage !== null;
        i18n.lier(geste, 'title', blocage ?? '');
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

    function pastille(etat: string, libelle: Texte): HTMLSpanElement {
      const marque = document.createElement('span');
      marque.className = 'pastille-d-etat';
      marque.dataset.etat = etat;
      i18n.lier(marque, 'textContent', libelle);
      return marque;
    }

    function ficheDePalette(lue: Recette, id: string, cadre: CadreDUnePalette, sansGeneration: boolean): HTMLElement {
      const palette = lue.palettes.find((candidate) => candidate.id === id)!;
      const analyse = analyseDe(lue, id);
      const nom = nomDeLaPalette(palette);
      const etat: EtatDeLaFiche = etatDeLaFiche(null, cadre.etat);
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

      fiche.corps.append(apercuCompact(lue, analyse, mode), information, lignesDeSortie([ligneDeLaPlanche(id, cadre, sansGeneration)], i18n));
      return fiche.element;
    }

    /** Passe à la vue complète et amène la fiche de la palette en vue ([UI-27]). */
    function ouvrirLaFicheDe(id: string): void {
      vue = 'complete';
      gestes.rangerLaVue(vue);
      ficheAMontrer = id;
      rendre();
    }

    /** Une ligne du tableau : le nom, la rampe de la dernière intensité en miniature, l'état de la planche. */
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

      const etat = document.createElement('td');
      etat.append(pastille(cadre.etat, etatDeLaPlancheEcrit(cadre.etat)));
      rangee.append(enTeteDeLigne, nuances, etat);
      return rangee;
    }

    /** Une notice sur un cadre, avec le geste qui le montre dans Figma (E18). */
    function noticeDeCadre(constat: Constat, page: string, cadre: string): HTMLDivElement {
      const bloc = blocDeConstat(constat, 'notice');
      bloc.append(bouton(TEXTES_DU_DESSIN.voirSurLaPlanche, 'bouton-discret', () => gestes.voirSurLaPlanche(page, [cadre])));
      return bloc;
    }

    function rendre(): void {
      basculeDesVues.rendre(vue);
      basculeDesThemes.rendre(mode);
      // Le tableau ne montre qu'une rampe : le thème se choisit en vue complète.
      basculeDesThemes.element.hidden = vue === 'condensee';
      if (!recette || !planche || !fraicheur) return;
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
        for (const { etat } of etatDesCadres.palettes) {
          const code = etatDeLaFiche(null, etat);
          bilan.set(code, (bilan.get(code) ?? 0) + 1);
        }
      }
      connexion.afficher({ nomDeLaPage: planche.nomDeLaPage, bilan, enRetard: vue === 'complete' ? enRetard.length : 0, luLe });

      // Les fiches et les lignes se reconstruisent : le focus d'un geste revient au même geste de la même palette.
      const actif = document.activeElement as HTMLElement | null;
      const repere = actif && (liste.contains(actif) || table.contains(actif))
        ? { palette: actif.closest<HTMLElement>('[data-palette]')?.dataset.palette, geste: actif.dataset.geste }
        : null;
      const complete = vue === 'complete';
      liste.hidden = !complete;
      table.hidden = complete || palettes.length === 0;
      liste.replaceChildren(...(complete ? etatDesCadres.palettes.map((cadre) => ficheDePalette(lue, cadre.palette, cadre, sansGeneration)) : []));
      corpsDeTable.replaceChildren(...(complete ? [] : etatDesCadres.palettes.map((cadre) => ligneDeTable(lue, cadre.palette, cadre))));
      if (ficheAMontrer !== null) {
        const fiche = liste.querySelector<HTMLElement>(`.fiche-planche[data-palette="${ficheAMontrer}"]`);
        ficheAMontrer = null;
        fiche?.scrollIntoView({ block: 'start' });
        fiche?.querySelector<HTMLElement>('[data-geste="modifier"]')?.focus({ preventScroll: true });
      } else if (repere?.palette && repere.geste) {
        (complete ? liste : table).querySelector<HTMLElement>(`[data-palette="${repere.palette}"] [data-geste="${repere.geste}"]`)?.focus();
      } else rendreLeFocus();

      // Une carte se reconstruit comme une fiche : le focus d'un geste revient au même geste de la même carte.
      const repereSupprime = actif && supprimees.contains(actif) ? { cadre: actif.closest<HTMLElement>('.carte-supprimee')?.dataset.cadre, geste: actif.dataset.geste } : null;
      supprimees.replaceChildren(...etatDesCadres.orphelins.map((cadre, rang) => carteSupprimee(cadre, rang)));
      supprimees.hidden = etatDesCadres.orphelins.length === 0;
      rendreLesGestes();
      if (focusApresRetrait !== null) {
        const suivante = supprimees.querySelectorAll<HTMLElement>('.carte-supprimee')[focusApresRetrait];
        (suivante?.querySelector<HTMLElement>('[data-geste="voir"]') ?? compte).focus();
        focusApresRetrait = null;
      } else if (repereSupprime?.cadre && repereSupprime.geste) {
        supprimees.querySelector<HTMLElement>(`.carte-supprimee[data-cadre="${repereSupprime.cadre}"] [data-geste="${repereSupprime.geste}"]`)?.focus();
      }

      notices.replaceChildren(
        ...etatDesCadres.copies.map(({ nom, cadre, page }) => noticeDeCadre(copieDeCadre(nom), page, cadre)),
        ...(profil === 'DISPLAY_P3' ? [blocDeConstat(noticeDisplayP3(), 'notice')] : []),
      );
      notices.hidden = notices.childElementCount === 0;
    }

    let empreinte: string | null = null;

    return {
      element,
      afficher(classement, lue, plancheLue, profilLu, empreinteLue, luLeRecu) {
        gestes.recetteEnFichier.afficher(classement);
        if (classement.etat === 'future' || classement.etat === 'illisible') {
          recette = null;
          fraicheur = null;
          connexion.element.hidden = true;
          pageDesPlanches.element.hidden = true;
          enTete.hidden = true;
          table.hidden = true;
          liste.replaceChildren();
          notices.replaceChildren();
          const constat = classement.etat === 'future' ? recetteFuture(classement.version) : recetteIllisible(classement.refus);
          vide.replaceChildren(blocDeConstat(constat, 'bloquant'));
          vide.hidden = false;
          // Les gestes de sortie d'une recette illisible ou future se montrent sans clic ([REC-11]).
          carteDeLaRecette.ouvrir();
          return;
        }
        connexion.element.hidden = pageDesPlanches.estOuverte();
        enTete.hidden = false;
        recette = lue;
        planche = plancheLue;
        profil = profilLu;
        empreinte = empreinteLue;
        luLe = luLeRecu;
        fraicheur = lue ? fraicheurDeLaPlanche(lue, profil, plancheLue) : null;
        const introuvables = (fraicheur?.palettes ?? []).filter(({ etat }) => etat === 'introuvable').map(({ palette }) => palette);
        const dejaAbsentes = absentes;
        absentes = new Set(plancheLue.recherche === 'fichier' ? introuvables : introuvables.filter((id) => dejaAbsentes.has(id)));
        analyses.clear();
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
        if (pageDesPlanches.recevoir(issue)) rendreLeBloc();
      },
    };
  }
  return { SEUIL_DE_CONFIRMATION, createOngletGestion };
}

export const creerVuesOngletGestion = memoriserVues(construireVues);

/**
 * L'aperçu de la palette ouverte ([UI-04]) : une surface peinte du fond de la page du
 * thème choisi, les numéros de nuance alignés sur les rampes Soft et Vivid, la
 * case tiretée avant elles, qui porte le texte des boutons du thème, la
 * référence exacte repérée ([MOT-17]), les trois bandes `solid`, `surface` et
 * `page` sous les rampes, et le détail de la nuance choisie ([UI-10]). Les
 * crans des bandes suivent la table du sens du thème montré (I3).
 *
 * Les pastilles forment une grille au sens WAI-ARIA : une seule est atteinte
 * par la tabulation, les flèches, Origine et Fin déplacent le focus, Entrée et
 * Espace choisissent, et relâchent la nuance déjà choisie. La case tiretée est
 * la première colonne des deux rangées. La copie d'un code est un bouton du
 * détail, distinct du choix d'une nuance.
 *
 * Le survol lie les pastilles aux variables (I13). Survoler ou focaliser une
 * pastille, une petite pastille d'une rayure, un code, la case tiretée ou un
 * spécimen de dossier surligne ce que la table du sens du thème relie à cette
 * cible : `presentation.ts` dit quoi, cette vue pose les classes `lie`,
 * `loupe` et `active`. La nuance choisie garde son surlignage ; un survol le
 * remplace le temps du survol. Les bandes restent `aria-hidden` et hors de la
 * tabulation : le détail de la nuance choisie nomme ses variables.
 */
import {
  COULEUR_DU_TEXTE_DES_BOUTONS,
  ETATS,
  SUPPORT_DES_VARIABLES,
  TABLE_DES_DOSSIERS,
  contraste,
  cranDeLaVariable,
  lireHexa,
  mesurerCran,
  rampeDe,
  sensDuTheme,
  variablesDuCran,
  type Cran,
  type Mode,
  type Intensite,
  type Recette,
  type Rgb8,
  type VariableDuTheme,
} from 'ucm-couleur';

import type { AnalyseDePalette } from '../analyse';
import {
  apercuEnBandes,
  garantiesDeLaVariable,
  gesteDeLaCible,
  hauteursDesRayures,
  surlignageDe,
  type Accolade,
  type ApercuEnBandes,
  type Dossier,
  type GarantieDeLaVariable,
  type Geste,
} from '../presentation';
import { creerVuesBadge } from './badge';
import { creerVuesPropositions } from './couleur/propositions';
import { creerVuesSelecteur } from './couleur/selecteur';
import { memoriserVues, type Localisation, type Texte } from './localisation';
import { creerVuesSpecimens, type FormeDeSpecimen } from './specimens';

/** Ce que le nuancier montre. */
export interface EntreesDuNuancier {
  readonly recette: Recette;
  readonly analyse: AnalyseDePalette;
  /** Le thème montré, que `PaletteOuverte.theme()` tient. */
  readonly mode: Mode;
  /** Les nuances où soft et vivid se confondent ([VER-11]) : un indice discret les marque. */
  readonly confondues: readonly { readonly mode: Mode; readonly cran: number }[];
  /** Vrai pour la palette du neutre (`estLaPaletteNeutre`) : sa bande `page` et sa note changent. Absent, faux. */
  readonly neutre?: boolean;
}

/** Ce que le nuancier demande à l'onglet. */
export interface GestesDuNuancier {
  /**
   * Un fond saisi dans le sélecteur de couleur de la pastille ([UI-04]) :
   * `fin` à la fin du geste, qui enregistre.
   */
  saisirFond(mode: Mode, hexa: string, fin: boolean): void;
  /** La saisie du fond s'achève sans rien enregistrer : l'onglet rend ce que l'aperçu avait différé. */
  abandonnerLeFond(): void;
  /** Une garantie du détail se choisit dans la carte des garanties ([UI-10]). */
  choisirGarantie(numero: number): void;
}

export interface NuancierUi {
  /** La surface peinte, dans le corps de la carte Aperçu. */
  element: HTMLDivElement;
  /** Le fond de la page du thème montré et sa pastille, dans l'en-tête de la carte. */
  tete: HTMLDivElement;
  afficher(entrees: EntreesDuNuancier): void;
}

export type Choix =
  /** Une nuance, par son rang et par son numéro : quand la liste change, le choix suit le numéro. */
  | { readonly nature: 'nuance'; readonly profil: Intensite; readonly rang: number; readonly numero: number }
  /** La case tiretée, qui porte le texte des boutons du thème : `solid/foreground`. */
  | { readonly nature: 'fond' };
function construireVues(i18n: Localisation) {
  const { fondsProposes } = creerVuesPropositions(i18n);
  const { ouvrirLeSelecteur, suivreLaCouleur } = creerVuesSelecteur(i18n);
  const { badgeDeNiveau } = creerVuesBadge(i18n);
  const { specimenDuRole } = creerVuesSpecimens(i18n);
  const { LIBELLE_DE_LA_VARIABLE, NOM_DU_PROFIL, TEXTES, TEXTES_DE_CONFIGURATION, TEXTES_DE_L_APERCU, TEXTES_DES_GARANTIES, TEXTES_DU_DETAIL, TEXTES_DU_NUANCIER, TEXTES_DU_SELECTEUR, contrasteEcrit, jugementDuSeuil } = i18n.messages;

  /**
   * L'encre qui se lit sur le fond de la page : la sombre ou la claire des
   * couleurs de la planche, avec le fond léger des bandes et le liseré des
   * petites pastilles qui vont avec elle.
   */
  function encresSur(fond: Rgb8): { encre: string; seconde: string; bordure: string; bande: string; trait: string } {
    const sombre = contraste(fond, [30, 30, 30]) >= contraste(fond, [245, 245, 245]);
    return sombre
      ? { encre: '#1E1E1E', seconde: 'rgba(30, 30, 30, 0.72)', bordure: 'rgba(30, 30, 30, 0.28)', bande: 'rgba(30, 30, 30, 0.045)', trait: 'rgba(0, 0, 0, 0.14)' }
      : { encre: '#F5F5F5', seconde: 'rgba(245, 245, 245, 0.72)', bordure: 'rgba(245, 245, 245, 0.32)', bande: 'rgba(237, 237, 237, 0.06)', trait: 'rgba(255, 255, 255, 0.16)' };
  }

  function bouton(classe: 'bouton-discret' | 'bascule-option' | 'lien-de-constat', texte: Texte = ''): HTMLButtonElement {
    const element = document.createElement('button');
    element.type = 'button';
    if (classe === 'bouton-discret') element.className = 'bouton-discret';
    else if (classe === 'bascule-option') element.className = 'bascule-option';
    else element.className = 'lien-de-constat';
    i18n.lier(element, 'textContent', texte);
    return element;
  }

  function paragraphe(texte: Texte, classe = ''): HTMLParagraphElement {
    const element = document.createElement('p');
    i18n.lier(element, 'textContent', texte);
    if (classe) element.className = classe;
    return element;
  }

  /** Un sous-titre du détail : « Sert à », « Sans rôle », « Contrastes de la nuance ». */
  function sousTitre(texte: Texte): HTMLParagraphElement {
    const element = paragraphe(texte);
    element.className = 'detail-sous-titre';
    return element;
  }

  /** Un groupe du détail, dans son encadré : son titre, puis son contenu. */
  function groupe(titre: Texte, ...contenu: HTMLElement[]): HTMLElement {
    const element = document.createElement('section');
    element.className = 'detail-groupe';
    i18n.lier(element, 'aria-label', titre);
    element.append(sousTitre(titre), ...contenu);
    return element;
  }

  /** Un nom de variable en police de code. */
  function codeDeLaVariable(texte: Texte): HTMLElement {
    const code = document.createElement('code');
    code.className = 'code-du-role';
    i18n.lier(code, 'textContent', texte);
    return code;
  }

  /** Copie un texte sans l'API du presse-papiers, que l'iframe d'un plugin peut refuser. */
  function copier(texte: string): void {
    const zone = document.createElement('textarea');
    zone.value = texte;
    zone.setAttribute('readonly', '');
    zone.style.position = 'fixed';
    zone.style.opacity = '0';
    document.body.append(zone);
    zone.select();
    document.execCommand('copy');
    zone.remove();
  }

  /** Deux choix désignent la même cellule : même nature, et pour une nuance même profil et même rang. */
  function memeChoix(a: Choix | null, b: Choix): boolean {
    if (!a || a.nature !== b.nature) return false;
    return a.nature === 'fond' || (b.nature === 'nuance' && a.profil === b.profil && a.rang === b.rang);
  }

  /** Le code de la case tiretée, que son détail nomme avec son libellé. */
const VARIABLE_DU_TEXTE_DES_BOUTONS = 'solid/foreground';

/** La colonne CSS d'une colonne de l'aperçu : `-2` le nom du profil, `-1` la pastille `on-solid`, `0` la première nuance. */
  const colonne = (rang: number): number => rang + 3;

  function createNuancier(gestes: GestesDuNuancier): NuancierUi {
    // En-tête : le fond de la page du thème montré, à droite.
    const tete = document.createElement('div');
    tete.className = 'nuancier-tete';
    const fond = document.createElement('div');
    fond.className = 'nuancier-fond';
    const libelleDuFond = document.createElement('span');
    libelleDuFond.className = 'libelle-de-champ';
    i18n.lier(libelleDuFond, 'textContent', TEXTES_DU_NUANCIER.fond);
    // La pastille ouvre le sélecteur de couleur sur le fond de la page du thème montré, avec la mention du fond commun.
    const pastilleDuFond = document.createElement('button');
    pastilleDuFond.type = 'button';
    pastilleDuFond.className = 'pastille-du-fond';
    pastilleDuFond.setAttribute('aria-haspopup', 'dialog');
    pastilleDuFond.setAttribute('aria-expanded', 'false');
    const teinteDuFond = document.createElement('span');
    teinteDuFond.className = 'pastille-du-fond-teinte';
    teinteDuFond.setAttribute('aria-hidden', 'true');
    const hexaDuFond = document.createElement('span');
    hexaDuFond.className = 'ligne-secondaire';
    hexaDuFond.setAttribute('aria-hidden', 'true');
    pastilleDuFond.append(teinteDuFond, hexaDuFond);
    fond.append(libelleDuFond, pastilleDuFond);
    tete.append(fond);

    /** Le thème fixé à l'ouverture du sélecteur : changer de thème pendant la saisie ne détourne pas la valeur. */
    let modeDuSelecteur: Mode = 'light';
    pastilleDuFond.addEventListener('click', () => {
      if (!donnees) return;
      const { recette, analyse, mode } = donnees;
      modeDuSelecteur = mode;
      ouvrirLeSelecteur({
        ancre: pastilleDuFond,
        hexa: recette.fonds[modeDuSelecteur],
        etiquette: TEXTES_DE_CONFIGURATION.fondDuMode[modeDuSelecteur],
        mention: TEXTES_DU_NUANCIER.fondCommun,
        titreDesPastilles: TEXTES_DU_SELECTEUR.fondsProposes,
        pastilles: fondsProposes(analyse, modeDuSelecteur),
        saisir: (hexa, fin) => gestes.saisirFond(modeDuSelecteur, hexa, fin),
        abandonner: () => gestes.abandonnerLeFond(),
      });
    });

    const surface = document.createElement('div');
    surface.className = 'nuancier-surface';
    const grille = document.createElement('div');
    grille.className = 'nuancier-grille';
    grille.setAttribute('role', 'grid');
    i18n.lier(grille, 'aria-label', TEXTES.apercu);
    // Les trois bandes, hors de la tabulation et de l'arbre d'accessibilité : le détail de la nuance nomme ses variables (I5).
    const bandes = document.createElement('div');
    bandes.className = 'bandes';
    bandes.setAttribute('aria-hidden', 'true');
    // La note du neutre : `page/foreground-main` n'a pas de cran, elle se lit sous les bandes.
    const noteDuNeutre = document.createElement('p');
    noteDuNeutre.className = 'hors-rampe';
    const codeDeLaNote = document.createElement('span');
    codeDeLaNote.dataset.token = 'page/foreground-main';
    i18n.lier(codeDeLaNote, 'textContent', codeDeLaNote.dataset.token);
    noteDuNeutre.append(codeDeLaNote, i18n.noeud(i18n.composer` · ${TEXTES_DE_L_APERCU.noteDuNeutre}`));
    noteDuNeutre.hidden = true;
    const detail = document.createElement('div');
    detail.className = 'nuancier-detail';
    detail.setAttribute('aria-live', 'polite');
    detail.hidden = true;
    surface.append(grille, bandes, noteDuNeutre, detail);

    let choix: Choix | null = null;
    /** La cellule que la tabulation atteint : rang de la rampe, colonne ; la colonne 0 est `on-solid`. */
    let active = { rampe: 1, colonne: 8 };
    let donnees: EntreesDuNuancier | null = null;
    /** Les cellules de chaque rangée ; la pastille `on-solid` ouvre les deux. */
    let cellules: HTMLElement[][] = [];

    /** La première colonne atteignable : une palette libre n'a pas de pastille `on-solid` (W6.5). */
    const premiereColonne = (): number => (donnees?.analyse.libre ? 1 : 0);

    function activer(rampe: number, rang: number, focaliser: boolean): void {
      if (cellules.length === 0) return;
      const ligne = Math.max(0, Math.min(cellules.length - 1, rampe));
      const place = Math.max(premiereColonne(), Math.min(cellules[ligne].length - 1, rang));
      active = { rampe: ligne, colonne: place };
      const cible = cellules[ligne][place];
      for (const cellule of cellules.flat()) {
        const rang = cellule === cible ? 0 : -1;
        if (cellule.tabIndex !== rang) cellule.tabIndex = rang;
      }
      if (focaliser) cible.focus();
    }

    /** Le choix qu'une cellule porte : la colonne 0 est la pastille `on-solid`. */
    function choixDe(rampe: number, place: number): Choix {
      if (place === 0) return { nature: 'fond' };
      const numero = donnees?.analyse.grille.crans[place - 1] ?? 0;
      return { nature: 'nuance', profil: donnees?.analyse.intensites[rampe] ?? 'unique', rang: place - 1, numero };
    }

    function choisir(suivant: Choix | null): void {
      choix = suivant;
      dessiner();
    }

    /** Un clic, Entrée ou Espace : choisit la cellule, ou la relâche et referme son détail quand elle est déjà choisie ([UI-04]). */
    function basculer(suivant: Choix): void {
      choisir(memeChoix(choix, suivant) ? null : suivant);
    }

    grille.addEventListener('keydown', (evenement) => {
      const largeur = cellules[active.rampe]?.length ?? 0;
      if (evenement.key === 'Enter' || evenement.key === ' ') {
        evenement.preventDefault();
        basculer(choixDe(active.rampe, active.colonne));
        activer(active.rampe, active.colonne, true);
        return;
      }
      const cibles: Record<string, [number, number]> = {
        ArrowRight: [active.rampe, active.colonne + 1],
        ArrowLeft: [active.rampe, active.colonne - 1],
        ArrowDown: [active.rampe + 1, active.colonne],
        ArrowUp: [active.rampe - 1, active.colonne],
        Home: [active.rampe, premiereColonne()],
        End: [active.rampe, largeur - 1],
      };
      const cible = cibles[evenement.key];
      if (!cible) return;
      evenement.preventDefault();
      activer(cible[0], cible[1], true);
    });

    /** Une garantie du détail, qui la choisit dans la carte des garanties. */
    function lienDeGarantie({ promesse, role, partenaire }: GarantieDeLaVariable): HTMLButtonElement {
      const nom: Texte = partenaire === 'elevation/page' ? TEXTES_DES_GARANTIES.laPage : partenaire;
      const sens = role === 'premier' ? TEXTES_DU_DETAIL.sur(nom) : TEXTES_DU_DETAIL.dessus(nom);
      const lien = bouton('lien-de-constat', TEXTES_DU_DETAIL.garantie(promesse.verdict === 'tenue', sens, promesse.contraste));
      lien.classList.add('garantie-du-detail');
      lien.dataset.verdict = promesse.verdict;
      lien.append(badgeDeNiveau(promesse.contraste, jugementDuSeuil(promesse.garantie.seuil)));
      lien.addEventListener('click', () => gestes.choisirGarantie(promesse.garantie.numero));
      return lien;
    }

    /** Le libellé du lexique d'une variable (I1) ; `disabled/*` n'en a pas, son code se montre seul. */
    function libelleDe(variable: VariableDuTheme): Texte | undefined {
      return variable in LIBELLE_DE_LA_VARIABLE ? LIBELLE_DE_LA_VARIABLE[variable as keyof typeof LIBELLE_DE_LA_VARIABLE] : undefined;
    }

    /** Ce que la variable peint (S4) donne la forme de son spécimen. */
    function formeDe(variable: VariableDuTheme): FormeDeSpecimen {
      const { peint } = SUPPORT_DES_VARIABLES[variable];
      if (peint.includes('ring')) return 'focus';
      if (peint.includes('foreground')) return 'text';
      if (peint.includes('border') && !peint.includes('background')) return 'border';
      return peint.includes('background') && variable.startsWith('solid/') ? 'solid' : 'surface';
    }

    /** Une ligne « Sert à » : le spécimen, le code de la variable puis son libellé, et ses garanties. */
    function ligneDeVariable(variable: VariableDuTheme, specimen: HTMLElement, garanties: readonly GarantieDeLaVariable[]): HTMLDivElement {
      const ligne = document.createElement('div');
      ligne.className = 'usage-du-detail';
      const quoi = document.createElement('div');
      quoi.className = 'usage-quoi';
      const role = document.createElement('p');
      role.append(codeDeLaVariable(variable));
      const libelle = libelleDe(variable);
      if (libelle) role.append(i18n.noeud(i18n.composer` · ${libelle}`));
      const liens = document.createElement('p');
      liens.className = 'usage-garanties';
      for (const garantie of garanties) liens.append(lienDeGarantie(garantie));
      quoi.append(role, liens);
      ligne.append(specimen, quoi);
      return ligne;
    }

    /**
     * Les contrastes d'une nuance, en table : le fond de la page, le blanc et le
     * noir, un ratio et un badge par ligne, que le badge juge en texte courant
     * ([VER-13]). Suivent les nuances identiques ou confondues, s'il y en a.
     */
    function contrastesDeLaNuance(cran: Cran, profil: Intensite, rang: number, entrees: EntreesDuNuancier, fondDuMode: Rgb8): HTMLElement[] {
      const { recette, analyse, mode } = entrees;
      const numero = analyse.grille.crans[rang];
      const mesure = mesurerCran(cran.couleur, fondDuMode, recette.seuils);
      const table = document.createElement('div');
      table.className = 'detail-contrastes';
      table.setAttribute('role', 'table');
      i18n.lier(table, 'aria-label', TEXTES_DU_DETAIL.contrastes);
      for (const [nom, valeur] of [[TEXTES_DU_DETAIL.fondDuTheme, mesure.fond], [TEXTES_DU_DETAIL.blanc, mesure.blanc], [TEXTES_DU_DETAIL.noir, mesure.noir]] as const) {
        const ligne = document.createElement('div');
        ligne.className = 'detail-contraste';
        ligne.setAttribute('role', 'row');
        const ratio = paragraphe(contrasteEcrit(valeur));
        ratio.className = 'detail-ratio';
        const cellules = [paragraphe(nom, 'ligne-secondaire'), ratio, badgeDeNiveau(valeur, 'texte')];
        for (const cellule of cellules) cellule.setAttribute('role', 'cell');
        ligne.append(...cellules);
        table.append(ligne);
      }
      const blocs: HTMLElement[] = [table];
      for (const autre of [rang - 1, rang + 1].filter((voisin) => rampeDe(analyse.rampes, profil)[mode][voisin]?.hexa === cran.hexa)) {
        blocs.push(paragraphe(TEXTES_DU_NUANCIER.memeCouleur(analyse.grille.crans[autre]), 'ligne-secondaire'));
      }
      if (entrees.confondues.some((confondue) => confondue.mode === mode && confondue.cran === numero)) {
        blocs.push(paragraphe(TEXTES_DU_NUANCIER.tresProche(profil === 'soft' ? 'vivid' : 'soft'), 'ligne-secondaire'));
      }
      return [groupe(TEXTES_DU_DETAIL.contrastes, ...blocs)];
    }

    /** Les valeurs OKLCH, repliées : elles servent à qui compare deux nuances, pas à choisir un usage. */
    function repliOklch(cran: Cran): HTMLDetailsElement {
      const repli = document.createElement('details');
      repli.className = 'constat-detail';
      const resume = document.createElement('summary');
      i18n.lier(resume, 'textContent', TEXTES_DU_DETAIL.oklch);
      repli.append(resume, paragraphe(TEXTES_DU_NUANCIER.oklch(cran.L, cran.C, cran.H)));
      return repli;
    }

    /** L'en-tête d'un détail : grande pastille, titre, code, la mention de la référence, et « Copier ». */
    function enTeteDuDetail(couleur: string, titre: Texte, code: string, reference = false): HTMLDivElement {
      const enTete = document.createElement('div');
      enTete.className = 'detail-tete';
      const grande = document.createElement('span');
      grande.className = 'detail-pastille';
      grande.style.background = couleur;
      const nomme = document.createElement('div');
      const nomDuDetail = paragraphe(titre);
      nomDuDetail.className = 'detail-titre';
      const codeDuDetail = paragraphe(code);
      codeDuDetail.className = 'detail-code';
      nomme.append(nomDuDetail, codeDuDetail);
      if (reference) {
        const mention = paragraphe(TEXTES_DU_DETAIL.reference);
        mention.className = 'detail-reference';
        nomme.append(mention);
      }
      const copie = bouton('bouton-discret', TEXTES_DU_NUANCIER.copier);
      copie.addEventListener('click', () => {
        copier(code);
        i18n.lier(copie, 'textContent', TEXTES_DU_NUANCIER.copie);
      });
      enTete.append(grande, nomme, copie);
      return enTete;
    }

    function detailDeNuance(profil: Intensite, rang: number, entrees: EntreesDuNuancier): HTMLElement[] {
      const { recette, analyse, mode } = entrees;
      const cran = rampeDe(analyse.rampes, profil)[mode][rang];
      const fondDeLaPage = lireHexa(recette.fonds[mode]) ?? [255, 255, 255];
      const texteDesBoutons = lireHexa(COULEUR_DU_TEXTE_DES_BOUTONS[recette.texteDesBoutons[mode]]) ?? [255, 255, 255];
      const { crans } = analyse.grille;
      const reference = analyse.ancrage.profil === profil && analyse.ancrage.rangs[mode] === rang;
      const blocs: HTMLElement[] = [enTeteDuDetail(cran.hexa, TEXTES_DU_DETAIL.titre(profil, crans[rang]), cran.hexa, reference)];
      // Les variables que la nuance porte dans la table du sens du thème montré (I5). Une palette libre n'en a pas (W6.5).
      const sens = sensDuTheme(mode, recette.texteDesBoutons[mode]);
      const variables = analyse.libre ? [] : variablesDuCran(crans, rang, sens, entrees.neutre ?? false);
      blocs.push(variables.length === 0
        ? groupe(TEXTES_DU_DETAIL.sansRole, paragraphe(TEXTES_DU_DETAIL.aucunRole, 'ligne-secondaire'))
        : groupe(TEXTES_DU_DETAIL.sertA, ...variables.map((variable) => ligneDeVariable(
          variable,
          specimenDuRole(formeDe(variable), cran.couleur, fondDeLaPage, texteDesBoutons),
          garantiesDeLaVariable(analyse.promesses, mode, profil, variable),
        ))));
      blocs.push(...contrastesDeLaNuance(cran, profil, rang, entrees, fondDeLaPage), repliOklch(cran));
      return blocs;
    }

    /**
     * Le détail de la case tiretée : `solid/foreground`, le texte des boutons du
     * thème, blanc ou noir purs, et ses garanties par intensité. Il se montre
     * posé sur le bouton, `solid/default`, jamais sur le fond de la page.
     */
    function detailDuTexteDesBoutons(entrees: EntreesDuNuancier): HTMLElement[] {
      const { recette, analyse, mode } = entrees;
      const texte = recette.texteDesBoutons[mode];
      const couleur = COULEUR_DU_TEXTE_DES_BOUTONS[texte];
      const rgbDuTexte = lireHexa(couleur) ?? [255, 255, 255];
      const fondDeLaPage = lireHexa(recette.fonds[mode]) ?? [255, 255, 255];
      const table = TABLE_DES_DOSSIERS[sensDuTheme(mode, texte)];
      const depart = analyse.grille.crans.indexOf(table['solid/default']);
      const crans = ETATS.map((etat) => table[`solid/${etat}`]);
      const lignes: HTMLElement[] = [];
      for (const profil of analyse.intensites) {
        const plein = depart < 0 ? undefined : rampeDe(analyse.rampes, profil)[mode][depart];
        const specimen = specimenDuRole('solid', plein?.couleur ?? rgbDuTexte, fondDeLaPage, rgbDuTexte);
        const ligne = ligneDeVariable('solid/foreground', specimen, garantiesDeLaVariable(analyse.promesses, mode, profil, 'solid/foreground'));
        if (profil !== 'unique') ligne.querySelector('.usage-quoi p')?.prepend(i18n.noeud(i18n.composer`${NOM_DU_PROFIL[profil]} · `));
        lignes.push(ligne);
      }
      return [
        enTeteDuDetail(couleur, i18n.composer`${VARIABLE_DU_TEXTE_DES_BOUTONS} · ${LIBELLE_DE_LA_VARIABLE[VARIABLE_DU_TEXTE_DES_BOUTONS]}`, couleur),
        paragraphe(TEXTES_DU_DETAIL.texteDesBoutons(mode, texte, Math.min(...crans), Math.max(...crans))),
        groupe(TEXTES_DU_DETAIL.sertA, ...lignes),
      ];
    }

    function rendreLeDetail(entrees: EntreesDuNuancier): void {
      if (!choix) {
        detail.replaceChildren();
        detail.hidden = true;
        return;
      }
      detail.replaceChildren(...(choix.nature === 'nuance' ? detailDeNuance(choix.profil, choix.rang, entrees) : detailDuTexteDesBoutons(entrees)));
      detail.hidden = false;
    }

    /** La forme des bandes bâties : un changement de crans, d'intensités, de sens ou de neutre les rebâtit ; leurs couleurs se repeignent en place (Z4.9). */
    let bandesBaties = '';
    /** Les petites pastilles des rayures, avec leur intensité et leur rang, et celle de `solid/foreground`. */
    let petitesPastilles: { element: HTMLElement; profil: Intensite; rang: number }[] = [];
    let petiteDuTexte: HTMLElement | null = null;
    let specimens: { element: HTMLElement; dossier: Dossier }[] = [];

    /** Le spécimen d'un dossier : son nom dessiné comme ce qu'il peint, et son rôle dessous (S10, 4). */
    function specimenDuDossier(dossier: Dossier): HTMLElement {
      const caseDuSpecimen = document.createElement('span');
      caseDuSpecimen.className = 'specimen-case';
      const specimen = document.createElement('span');
      specimen.className = 'specimen';
      specimen.dataset.dossier = dossier;
      i18n.lier(specimen, 'textContent', dossier);
      const role = document.createElement('span');
      role.className = 'specimen-role';
      i18n.lier(role, 'textContent', TEXTES_DE_L_APERCU.roles[dossier]);
      caseDuSpecimen.append(specimen, role);
      specimens.push({ element: specimen, dossier });
      return caseDuSpecimen;
    }

    /** La rayure d'une accolade : une petite pastille par nuance couverte et par intensité, sous les colonnes de la rampe (S10, 5). */
    function rayureDeLAccolade(accolade: Accolade, intensites: readonly Intensite[], crans: readonly number[]): HTMLElement {
      const rayure = document.createElement('span');
      rayure.className = 'rayure';
      const hauteurs = hauteursDesRayures(intensites.length);
      if (accolade.debut < 0) {
        rayure.style.gridColumn = String(colonne(-1));
        rayure.style.gridTemplateRows = `${hauteurs.texteDesBoutons}px`;
        const petite = document.createElement('i');
        petite.dataset.token = 'solid/foreground';
        rayure.append(petite);
        petiteDuTexte = petite;
        return rayure;
      }
      const nombre = accolade.fin - accolade.debut + 1;
      rayure.style.gridColumn = `${colonne(accolade.debut)} / ${colonne(accolade.fin) + 1}`;
      rayure.style.gridTemplateColumns = `repeat(${nombre}, minmax(0, 1fr))`;
      rayure.style.gridTemplateRows = `repeat(${intensites.length}, ${hauteurs.petite}px)`;
      intensites.forEach((profil, ligne) => {
        for (let rang = accolade.debut; rang <= accolade.fin; rang += 1) {
          const petite = document.createElement('i');
          petite.dataset.cran = String(crans[rang]);
          petite.style.gridColumn = String(rang - accolade.debut + 1);
          petite.style.gridRow = String(ligne + 1);
          rayure.append(petite);
          petitesPastilles.push({ element: petite, profil, rang });
        }
      });
      return rayure;
    }

    /** Le libellé d'une accolade : ses codes en police de code, puis leurs noms ; il prend l'espace que `etaler` lui donne (S10, 6 et 9). */
    function libelleDeLAccolade(accolade: Accolade): HTMLElement {
      const libelle = document.createElement('span');
      libelle.className = 'accolade-libelle';
      libelle.style.gridColumn = `${colonne(accolade.libelle.debut)} / ${colonne(accolade.libelle.fin) + 1}`;
      libelle.style.textAlign = accolade.libelle.alignement;
      if (accolade.libelle.colle) {
        libelle.style.paddingRight = '12px';
        // Le blanc de 12 px ne fait passer le texte à la ligne que s'il dépasse la plage entière.
        libelle.style.setProperty('--colle', '12px');
      }
      const code = document.createElement('code');
      code.className = 'code-du-role';
      accolade.codes.forEach((entree, rang) => {
        if (rang > 0) code.append(document.createTextNode(' · '));
        const jeton = document.createElement('span');
        jeton.dataset.token = entree.variable;
        i18n.lier(jeton, 'textContent', entree.code);
        code.append(jeton);
      });
      const nom = document.createElement('span');
      nom.className = 'accolade-nom';
      i18n.lier(nom, 'textContent', i18n.joindre(accolade.codes.map((entree) => TEXTES_DE_L_APERCU.noms[entree.nom]), ' · '));
      libelle.append(code, nom);
      return libelle;
    }

    /** Les bandes `solid`, `surface` et `page` (S10) ; une palette libre n'en a pas (W6.5). */
    function batirLesBandes(analyse: AnalyseDePalette, apercu: ApercuEnBandes): void {
      petitesPastilles = [];
      petiteDuTexte = null;
      specimens = [];
      bandes.replaceChildren(...apercu.bandes.map((entree) => {
        const bande = document.createElement('div');
        bande.className = 'bande';
        bande.dataset.bande = entree.dossier;
        bande.append(specimenDuDossier(entree.dossier));
        for (const accolade of entree.accolades) bande.append(rayureDeLAccolade(accolade, analyse.intensites, analyse.grille.crans), libelleDeLAccolade(accolade));
        return bande;
      }));
    }

    /** Les couleurs des spécimens et des petites pastilles : celles de la palette dans le thème montré, Vivid quand elle a deux intensités. */
    function peindreLesBandes(entrees: EntreesDuNuancier, apercu: ApercuEnBandes): void {
      const { analyse, mode, neutre } = entrees;
      const { crans } = analyse.grille;
      const hexaDe = (variable: VariableDuTheme): string => {
        const cran = cranDeLaVariable(variable, apercu.sens);
        const rang = typeof cran === 'number' ? crans.indexOf(cran) : -1;
        return rang < 0 ? 'transparent' : rampeDe(analyse.rampes, analyse.intensites.includes('vivid') ? 'vivid' : 'unique')[mode][rang].hexa;
      };
      const texteDeLaPage = neutre ? 'page/foreground-subtle' : 'page/foreground';
      for (const { element, dossier } of specimens) {
        if (dossier === 'solid') {
          element.style.background = hexaDe('solid/default');
          element.style.borderColor = hexaDe('solid/default');
          element.style.color = apercu.couleurDuTexte;
        } else if (dossier === 'surface') {
          element.style.background = hexaDe('surface/default');
          element.style.borderColor = hexaDe('surface/border');
          element.style.color = hexaDe('surface/foreground');
        } else {
          element.style.background = 'transparent';
          element.style.borderColor = hexaDe('page/border');
          element.style.color = hexaDe(texteDeLaPage);
        }
      }
      for (const { element, profil, rang } of petitesPastilles) element.style.background = rampeDe(analyse.rampes, profil)[mode][rang].hexa;
      if (petiteDuTexte) petiteDuTexte.style.background = apercu.couleurDuTexte;
    }

    /** Le geste que le survol ou le focus désigne. Il remplace celui du choix le temps qu'il dure (S11). */
    let survol: Geste | null = null;
    /** Les éléments surlignés, pour les éteindre sans parcourir la surface à chaque rendu. */
    let allumes: Element[] = [];

    /** Le geste du choix : la nuance choisie, ou la case tiretée, qui est `solid/foreground`. */
    function gesteDuChoix(): Geste | null {
      if (!choix) return null;
      return choix.nature === 'fond' ? { nature: 'code', variable: 'solid/foreground' } : { nature: 'cran', numero: choix.numero };
    }

    /** Pose les classes `lie`, `loupe` et `active` d'après le geste en cours et la table du sens du thème montré (S11). */
    function surligner(): void {
      for (const element of allumes) element.classList.remove('lie', 'active');
      allumes = [];
      surface.classList.remove('loupe');
      if (!donnees || donnees.analyse.libre) return;
      const geste = survol ?? gesteDuChoix();
      if (!geste) return;
      const { recette, analyse, mode } = donnees;
      const sens = sensDuTheme(mode, recette.texteDesBoutons[mode]);
      const { crans, variables, dossier } = surlignageDe(geste, analyse.grille.crans, sens, donnees.neutre ?? false);
      // `lie` marque une cible surlignée, `active` la bande du dossier survolé : la loi des styles ne lit que des classes littérales.
      const allumer = (selecteur: string, bandeActive = false): void => {
        surface.querySelectorAll(selecteur).forEach((element) => {
          if (bandeActive) element.classList.add('active');
          else element.classList.add('lie');
          allumes.push(element);
        });
      };
      for (const numero of crans) allumer(`.pastille[data-cran="${numero}"], .rayure i[data-cran="${numero}"]`);
      for (const variable of variables) allumer(`[data-token="${variable}"]`);
      if (dossier) {
        allumer(`.specimen[data-dossier="${dossier}"]`);
        allumer(`.bande[data-bande="${dossier}"]`, true);
        surface.classList.add('loupe');
      }
    }

    /** Le geste d'un élément de l'aperçu : un code avant une pastille, une pastille avant un dossier. */
    function gesteDe(cible: EventTarget | null): Geste | null {
      if (!(cible instanceof Element)) return null;
      return gesteDeLaCible({
        token: cible.closest<HTMLElement>('[data-token]')?.dataset.token,
        cran: cible.closest<HTMLElement>('.pastille[data-cran], .rayure i[data-cran]')?.dataset.cran,
        dossier: cible.closest<HTMLElement>('[data-dossier]')?.dataset.dossier,
      });
    }

    function suivre(cible: EventTarget | null): void {
      survol = gesteDe(cible);
      surligner();
    }

    // Ni délai ni animation : le surlignage suit le pointeur et s'efface quand il quitte la cible.
    surface.addEventListener('mouseover', (evenement) => suivre(evenement.target));
    surface.addEventListener('mouseleave', () => suivre(null));
    surface.addEventListener('focusin', (evenement) => suivre(evenement.target));
    surface.addEventListener('focusout', () => suivre(null));

    function dessiner(): void {
      if (!donnees) return;
      const entrees = donnees;
      const { recette, analyse, mode } = entrees;
      const couleurDuFond = lireHexa(recette.fonds[mode]) ?? [255, 255, 255];
      const encres = encresSur(couleurDuFond);
      surface.style.background = recette.fonds[mode];
      surface.style.setProperty('--fond-surface', recette.fonds[mode]);
      surface.style.setProperty('--encre-surface', encres.encre);
      surface.style.setProperty('--encre-surface-seconde', encres.seconde);
      surface.style.setProperty('--bordure-surface', encres.bordure);
      surface.style.setProperty('--fond-de-bande', encres.bande);
      surface.style.setProperty('--trait-de-rayure', encres.trait);
      const { crans } = analyse.grille;
      if (analyse.libre && choix?.nature === 'fond') choix = null;
      // Une intensité que la palette ne porte plus referme son choix ([ENT-14]).
      if (choix?.nature === 'nuance' && !analyse.intensites.includes(choix.profil)) choix = null;
      // Une liste qui change, celle d'une palette libre, déplace les rangs : le choix suit son numéro, ou se referme.
      if (choix?.nature === 'nuance') {
        const rang = crans.indexOf(choix.numero);
        choix = rang < 0 ? null : { ...choix, rang };
      }
      surface.style.setProperty('--colonnes', String(crans.length));
      // Une palette libre n'a pas de pastille on-solid : sa colonne se referme.
      if (analyse.libre) surface.style.setProperty('--colonne-on-solid', '0px');
      else surface.style.removeProperty('--colonne-on-solid');
      teinteDuFond.style.background = recette.fonds[mode];
      i18n.lier(hexaDuFond, 'textContent', recette.fonds[mode]);
      i18n.lier(pastilleDuFond, 'aria-label', TEXTES_DU_NUANCIER.modifierLeFond(mode, recette.fonds[mode]));
      suivreLaCouleur(pastilleDuFond, recette.fonds[modeDuSelecteur]);

      // La grille ne se rebâtit que si sa forme change ; sinon ses cellules se repeignent en place (Z4.7).
      const structure = [mode, crans.join(','), analyse.intensites.join(','), analyse.libre].join('|');
      if (structure !== structureBatie) {
        structureBatie = structure;
        batirLaGrille(analyse);
      }
      peindreLaGrille(entrees);
      activer(active.rampe, active.colonne, false);
      // Les bandes suivent la table du sens que le texte des boutons donne au thème montré (I3).
      const neutre = entrees.neutre ?? false;
      const apercu = apercuEnBandes(mode, recette.texteDesBoutons[mode], crans, neutre);
      bandes.hidden = analyse.libre;
      noteDuNeutre.hidden = analyse.libre || !neutre;
      const formeDesBandes = [crans.join(','), analyse.intensites.join(','), analyse.libre, apercu.sens, neutre].join('|');
      if (formeDesBandes !== bandesBaties) {
        bandesBaties = formeDesBandes;
        if (analyse.libre) bandes.replaceChildren();
        else batirLesBandes(analyse, apercu);
      }
      if (!analyse.libre) peindreLesBandes(entrees, apercu);
      surligner();
      // Le détail dépend des couleurs de la nuance choisie : il se refait tant qu'un choix existe.
      if (choix || !detail.hidden) rendreLeDetail(entrees);
    }

    /** La forme de la grille bâtie : un changement la rebâtit. */
    let structureBatie = '';
    /** La case tiretée et les pastilles de chaque rangée, dans l'ordre des intensités. */
    let onSolid: HTMLElement | null = null;
    let pastillesDesRangees: HTMLElement[][] = [];

    /** Les éléments de la grille et leurs gestes, pour une forme donnée : thème, crans, intensités et modèle. */
    function batirLaGrille(analyse: AnalyseDePalette): void {
      const { crans } = analyse.grille;
      const numeros = document.createElement('div');
      numeros.className = 'nuancier-rangee';
      numeros.setAttribute('role', 'row');
      const coin = document.createElement('span');
      coin.className = 'nuancier-profil';
      coin.setAttribute('role', 'columnheader');
      coin.style.gridRow = '1';
      numeros.append(coin, ...crans.map((numero, rang) => {
        const entete = document.createElement('span');
        entete.style.gridColumn = String(colonne(rang));
        entete.style.gridRow = '1';
        entete.className = 'nuancier-numero';
        entete.setAttribute('role', 'columnheader');
        i18n.lier(entete, 'textContent', String(numero));
        return entete;
      }));

      // La case tiretée : peinte du texte des boutons du thème, `solid/foreground`, sur la hauteur des rangées.
      const pastilleOnSolid = document.createElement('span');
      pastilleOnSolid.className = 'pastille pastille-on-solid';
      pastilleOnSolid.dataset.token = 'solid/foreground';
      pastilleOnSolid.setAttribute('role', 'gridcell');
      pastilleOnSolid.style.gridColumn = String(colonne(-1));
      pastilleOnSolid.style.gridRow = `2 / span ${analyse.intensites.length}`;
      pastilleOnSolid.hidden = analyse.libre;
      pastilleOnSolid.addEventListener('click', () => {
        active = { rampe: active.rampe, colonne: 0 };
        basculer({ nature: 'fond' });
        activer(active.rampe, 0, true);
      });
      pastilleOnSolid.addEventListener('focus', () => { active = { rampe: active.rampe, colonne: 0 }; });
      onSolid = pastilleOnSolid;

      cellules = [];
      pastillesDesRangees = [];
      const rangees = analyse.intensites.map((profil, rangDeRampe) => {
        const rangee = document.createElement('div');
        rangee.className = 'nuancier-rangee';
        rangee.setAttribute('role', 'row');
        const entete = document.createElement('span');
        entete.className = 'nuancier-profil';
        entete.setAttribute('role', 'rowheader');
        entete.style.gridRow = String(rangDeRampe + 2);
        // La rampe d'une palette à une intensité n'a pas de nom de profil ([ENT-14]).
        i18n.lier(entete, 'textContent', profil === 'unique' ? '' : NOM_DU_PROFIL[profil]);
        rangee.append(entete);
        if (rangDeRampe === 0) rangee.append(pastilleOnSolid);
        const pastilles = crans.map((numero, rang) => {
          const pastille = document.createElement('span');
          pastille.className = 'pastille';
          pastille.setAttribute('role', 'gridcell');
          pastille.dataset.cran = String(numero);
          pastille.dataset.profil = profil;
          pastille.style.gridColumn = String(colonne(rang));
          pastille.style.gridRow = String(rangDeRampe + 2);
          pastille.tabIndex = -1;
          pastille.addEventListener('click', () => {
            active = { rampe: rangDeRampe, colonne: rang + 1 };
            basculer({ nature: 'nuance', profil, rang, numero });
            activer(rangDeRampe, rang + 1, true);
          });
          pastille.addEventListener('focus', () => { active = { rampe: rangDeRampe, colonne: rang + 1 }; });
          return pastille;
        });
        rangee.append(...pastilles);
        cellules.push([pastilleOnSolid, ...pastilles]);
        pastillesDesRangees.push(pastilles);
        return rangee;
      });
      grille.replaceChildren(numeros, ...rangees);
    }

    /** Les couleurs, le repère ◆, les indices de confusion, les noms accessibles et le choix de chaque cellule. */
    function peindreLaGrille(entrees: EntreesDuNuancier): void {
      const { recette, analyse, mode } = entrees;
      const { crans } = analyse.grille;
      if (onSolid) {
        onSolid.style.background = COULEUR_DU_TEXTE_DES_BOUTONS[recette.texteDesBoutons[mode]];
        i18n.lier(onSolid, 'aria-label', TEXTES_DU_NUANCIER.etiquetteDuTexteDesBoutons(COULEUR_DU_TEXTE_DES_BOUTONS[recette.texteDesBoutons[mode]]));
        onSolid.setAttribute('aria-selected', String(choix?.nature === 'fond'));
      }
      const confondues = new Set(entrees.confondues.filter((confondue) => confondue.mode === mode).map((confondue) => confondue.cran));
      analyse.intensites.forEach((profil, rangDeRampe) => {
        rampeDe(analyse.rampes, profil)[mode].forEach((cran, rang) => {
          const pastille = pastillesDesRangees[rangDeRampe][rang];
          const numero = crans[rang];
          pastille.style.background = cran.hexa;
          pastille.style.color = contraste(cran.couleur, [0, 0, 0]) >= contraste(cran.couleur, [255, 255, 255]) ? '#000000' : '#FFFFFF';
          const reference = analyse.ancrage.profil === profil && analyse.ancrage.rangs[mode] === rang;
          const confondue = confondues.has(numero);
          const etiquettes = [TEXTES_DU_NUANCIER.etiquetteDeNuance(profil, numero, cran.hexa)];
          if (reference) etiquettes.push(TEXTES_DU_NUANCIER.reference);
          if (confondue) etiquettes.push(TEXTES_DU_NUANCIER.tresProche(profil === 'soft' ? 'vivid' : 'soft'));
          if (reference) pastille.dataset.reference = 'true';
          else delete pastille.dataset.reference;
          if (confondue) pastille.dataset.confondue = 'true';
          else delete pastille.dataset.confondue;
          i18n.lier(pastille, 'textContent', reference ? '◆' : '');
          i18n.lier(pastille, 'aria-label', i18n.joindre(etiquettes, ', '));
          pastille.setAttribute('aria-selected', String(choix?.nature === 'nuance' && choix.profil === profil && choix.rang === rang));
        });
      });
    }

    return {
      element: surface,
      tete,
      afficher(entrees) {
        donnees = entrees;
        dessiner();
      },
    };
  }
  return { encresSur, memeChoix, createNuancier };
}

export const creerVuesNuancier = memoriserVues(construireVues);

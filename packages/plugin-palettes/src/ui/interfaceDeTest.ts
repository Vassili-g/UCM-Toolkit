/**
 * La section « Interface de test » ([UI-14]), dernière de l'onglet Création :
 * la palette ouverte, peinte dans le thème de l'aperçu et le profil porteur,
 * en deux vues que le choix « Vue » sélectionne, avant le choix « Afficher »
 * du profil, tous deux dans l'en-tête de la carte. « Écran » montre une page d'équipe sur
 * le modèle de Radix Themes, qui se manipule : survol et appui prennent les
 * fonds `hover` et `pressed`, la case, l'interrupteur, les lignes et la
 * navigation répondent, sans rien enregistrer. « États » montre chaque
 * composant à `default`, `hover`, `pressed` puis `focus`, d'après la recette du
 * Playground. Chaque couleur vient de la table des dossiers du sens du thème
 * montré ; le texte ne change pas avec l'état.
 *
 * Survoler un élément ou un spécimen ouvre une bulle sous lui : une ligne par
 * propriété, ce qu'elle peint, la variable et sa nuance. La bulle est une aide
 * à la souris, cachée aux lecteurs d'écran ; au clavier, rien ne change.
 *
 * Une palette libre n'a pas de rôles : la section se retire. Repliée à
 * l'ouverture, elle ne se dessine que dépliée ; la vue choisie dure la session.
 */
import {
  COULEUR_DU_TEXTE_DES_BOUTONS, ETATS, SUPPORT_DES_VARIABLES, TABLE_DES_DOSSIERS, lireHexa, rampeDe, sensDuTheme,
  type Intensite, type Mode, type Profil, type Recette, type SensDuTheme, type SupportDeVariable, type TexteDesBoutons, type VariableDePalette,
} from 'ucm-couleur';

import type { AnalyseDePalette } from '../analyse';
import { createCarte } from './carte';
import { creerVuesChoix } from './choix';
import { creerGlyphe } from './glyphes';
import { memoriserVues, lireTexte, type Localisation, type Texte } from './localisation';
import { creerVuesNuancier } from './nuancier';

/** Un état du fond, ou le focus de la vue États. */
type Etat = (typeof ETATS)[number];
type EtatMontre = Etat | 'focus';

/** Ce qu'une variable peint sur l'écran : les mots de la bulle. */
export const PROPRIETES = ['fond', 'texte', 'contour', 'anneau', 'coche', 'icone', 'pastille', 'separateur', 'fondAuSurvol', 'fondEtContour'] as const;
export type Propriete = (typeof PROPRIETES)[number];

/** Ce que la table de S4 doit dire d'une variable pour qu'elle peigne cette propriété. */
export const PEINT_PAR_PROPRIETE: Readonly<Record<Propriete, readonly SupportDeVariable['peint'][number][]>> = {
  fond: ['background'],
  texte: ['foreground'],
  contour: ['border'],
  anneau: ['ring'],
  coche: ['foreground'],
  icone: ['icon'],
  pastille: ['foreground'],
  separateur: ['border'],
  fondAuSurvol: ['background'],
  fondEtContour: ['background', 'border'],
};

/** Vrai quand la table de S4 laisse la variable peindre cette propriété. */
export function proprieteConvient(propriete: Propriete, variable: VariableDePalette): boolean {
  const peint = SUPPORT_DES_VARIABLES[variable].peint;
  return PEINT_PAR_PROPRIETE[propriete].every((genre) => peint.includes(genre));
}

/** Les couleurs de l'écran, chacune lue dans la table des dossiers du sens du thème, ou le fond et les encres du thème. */
export interface CouleursDeLInterface {
  readonly fond: string;
  readonly encre: string;
  readonly encreSeconde: string;
  readonly sens: SensDuTheme;
  readonly texteDesBoutons: TexteDesBoutons;
  /** La couleur d'une variable, dans l'intensité montrée ; `solid/foreground` est le texte des boutons du thème. */
  readonly variable: (variable: VariableDePalette) => string;
}

export interface InterfaceDeTestUi {
  readonly element: HTMLElement;
  /**
   * Dessine la vue choisie quand la carte est dépliée ; une palette libre retire la section.
   * `palette` est l'identifiant de la palette ouverte : en changer rouvre le choix du profil sur son porteur.
   */
  afficher(recette: Recette, analyse: AnalyseDePalette, mode: Mode, palette: string): void;
  /** Un geste sur l'en-tête qui déplie la carte : l'onglet redessine. */
  surBascule(action: () => void): void;
}

type Vue = 'ecran' | 'etats';
function construireVues(i18n: Localisation) {
  const { encresSur } = creerVuesNuancier(i18n);
  const { createChoix, createChoixDuProfil } = creerVuesChoix(i18n);
  const { NOM_DU_PROFIL, NOM_DU_TEXTE_DES_BOUTONS, TEXTES_DE_L_INTERFACE_DE_TEST } = i18n.messages;

  /**
   * Les couleurs de l'écran pour une palette et un thème. Une variable dont le
   * cran manque à la grille prend le fond du thème : la table n'exige que les
   * crans requis du sens, que la grille porte toujours.
   */
  function couleursDeLInterface(recette: Recette, analyse: AnalyseDePalette, mode: Mode, intensite: Intensite = analyse.ancrage.profil): CouleursDeLInterface {
    const fond = recette.fonds[mode];
    const encres = encresSur(lireHexa(fond) ?? [255, 255, 255]);
    const rampe = rampeDe(analyse.rampes, intensite)[mode];
    const texteDesBoutons = recette.texteDesBoutons[mode];
    const sens = sensDuTheme(mode, texteDesBoutons);
    return {
      fond,
      encre: encres.encre,
      encreSeconde: encres.seconde,
      sens,
      texteDesBoutons,
      variable(variable) {
        const cran = TABLE_DES_DOSSIERS[sens][variable];
        if (cran === 'texteDesBoutons') return COULEUR_DU_TEXTE_DES_BOUTONS[texteDesBoutons];
        const rang = analyse.grille.crans.indexOf(cran);
        return rang < 0 ? fond : rampe[rang].hexa;
      },
    };
  }

  /** Un élément et son texte. Sa classe s'écrit en littéral à l'appel : la loi des styles la lit là. */
  function noeud<K extends keyof HTMLElementTagNameMap>(nom: K, texte: Texte = ''): HTMLElementTagNameMap[K] {
    const element = document.createElement(nom);
    if (texte) i18n.lier(element, 'textContent', texte);
    return element;
  }

  /** Un bouton de l'écran, qui ne soumet rien. */
  function boutonDeLEcran(texte: Texte): HTMLButtonElement {
    const bouton = noeud('button', texte);
    bouton.type = 'button';
    return bouton;
  }

  /** Ce qu'un élément peint, lu au survol : `propriete=variable`, séparés par « ; ». */
  type Peint = readonly (readonly [Propriete, VariableDePalette])[];
  function peint<E extends HTMLElement>(element: E, ...paires: Peint): E {
    for (const [propriete, variable] of paires) {
      if (!proprieteConvient(propriete, variable)) throw new Error(`${variable} ne peint pas « ${propriete} » (S4)`);
    }
    element.setAttribute('data-variables', paires.map(([propriete, variable]) => `${propriete}=${variable}`).join(';'));
    return element;
  }

  /** Pose les trois fonds d'un contrôle, ceux de `default`, `hover` et `pressed` : la feuille les lit au survol et à l'appui. */
  function fonds(element: HTMLElement, couleurs: readonly [string, string, string]): void {
    element.style.setProperty('--essai-fond-repos', couleurs[0]);
    element.style.setProperty('--essai-fond-survol', couleurs[1]);
    element.style.setProperty('--essai-fond-appui', couleurs[2]);
  }

  /** Les trois fonds d'un dossier. */
  const troisFonds = (couleurs: CouleursDeLInterface, dossier: 'solid' | 'surface'): [string, string, string] =>
    [couleurs.variable(`${dossier}/default`), couleurs.variable(`${dossier}/hover`), couleurs.variable(`${dossier}/pressed`)];

  /** Les fonds d'un élément sans fond : transparent au repos, les fonds teintés au survol et à l'appui. */
  const fondsSansFond = (couleurs: CouleursDeLInterface): [string, string, string] =>
    ['transparent', couleurs.variable('surface/hover'), couleurs.variable('surface/pressed')];

  /** Une bascule à deux états : case ou interrupteur, qui change au clic. */
  function basculeDeLEcran(element: HTMLButtonElement, role: 'checkbox' | 'switch', libelle: Texte): void {
    element.setAttribute('role', role);
    element.setAttribute('aria-checked', 'true');
    i18n.lier(element, 'aria-label', libelle);
    element.addEventListener('click', () => {
      element.setAttribute('aria-checked', String(element.getAttribute('aria-checked') !== 'true'));
    });
  }

  /** L'écran « Membres de l'équipe » : navigation, en-tête, encart, tableau, champ, options, actions. */
  function ecranDeLEquipe(couleurs: CouleursDeLInterface): HTMLDivElement {
    const e = TEXTES_DE_L_INTERFACE_DE_TEST.equipe;
    const c = couleurs.variable;
    const racine = noeud('div');
    racine.className = 'essai-ecran';
    racine.setAttribute('role', 'group');
    i18n.lier(racine, 'aria-label', TEXTES_DE_L_INTERFACE_DE_TEST.ecran);

    // La navigation : l'entrée active en fond teinté ; un clic la déplace. Les autres prennent le fond teinté au survol.
    const navigation = noeud('nav');
    navigation.className = 'essai-navigation';
    peint(navigation, ['separateur', 'page/divider']);
    const organisation = noeud('p', e.organisation);
    organisation.className = 'essai-organisation';
    const peindreLEntree = (entree: HTMLElement, active: boolean) => {
      if (active) peint(entree, ['fond', 'surface/default'], ['texte', 'surface/foreground']);
      else peint(entree, ['fondAuSurvol', 'surface/hover']);
    };
    const entrees = e.navigation.map((libelle, rang) => {
      const entree = boutonDeLEcran(libelle);
      entree.className = 'essai-entree';
      fonds(entree, fondsSansFond(couleurs));
      entree.style.setProperty('--essai-fond-actif', c('surface/default'));
      entree.style.setProperty('--essai-texte-actif', c('surface/foreground'));
      if (rang === 0) entree.setAttribute('aria-current', 'page');
      peindreLEntree(entree, rang === 0);
      entree.addEventListener('click', () => {
        for (const autre of entrees) {
          autre.removeAttribute('aria-current');
          peindreLEntree(autre, false);
        }
        entree.setAttribute('aria-current', 'page');
        peindreLEntree(entree, true);
      });
      return entree;
    });
    navigation.append(organisation, ...entrees);

    const corps = noeud('div');
    corps.className = 'essai-corps';

    const tete = noeud('div');
    tete.className = 'essai-tete';
    const titres = noeud('div');
    const titre = noeud('p', e.titre);
    titre.className = 'essai-titre';
    const sousTitre = noeud('p', e.sousTitre);
    sousTitre.className = 'essai-sous-titre';
    titres.append(titre, sousTitre);
    const inviter = boutonDeLEcran(e.inviter);
    inviter.className = 'essai-bouton';
    fonds(inviter, troisFonds(couleurs, 'solid'));
    inviter.style.setProperty('--essai-texte', c('solid/foreground'));
    peint(inviter, ['fond', 'solid/default'], ['texte', 'solid/foreground']);
    tete.append(titres, inviter);

    const encart = noeud('div');
    encart.className = 'essai-encart';
    encart.style.background = c('surface/default');
    encart.style.color = c('surface/foreground');
    peint(encart, ['fond', 'surface/default'], ['texte', 'surface/foreground'], ['icone', 'surface/foreground']);
    const icone = noeud('span', e.icone);
    icone.setAttribute('aria-hidden', 'true');
    const renvoyer = boutonDeLEcran(e.renvoyer);
    renvoyer.className = 'essai-lien';
    peint(renvoyer, ['texte', 'surface/foreground']);
    encart.append(icone, noeud('span', e.encart), renvoyer);

    // Le tableau : une ligne se survole en fond teinté, et se choisit au clic. Sa carte est hors de la palette : il n'a pas de fond.
    const tableau = noeud('div');
    tableau.className = 'essai-tableau';
    tableau.setAttribute('role', 'listbox');
    peint(tableau, ['contour', 'page/divider']);
    i18n.lier(tableau, 'aria-label', e.titre);
    const lignes = e.membres.map(({ nom, role, badge: genre }, rang) => {
      const ligne = boutonDeLEcran('');
      ligne.className = 'essai-ligne';
      ligne.setAttribute('role', 'option');
      ligne.setAttribute('aria-selected', String(rang === 1));
      fonds(ligne, fondsSansFond(couleurs));
      ligne.style.setProperty('--essai-fond-actif', c('surface/default'));
      const avatar = noeud('span', lireTexte(nom)[0]);
      avatar.className = 'essai-avatar';
      avatar.style.background = c('surface/default');
      avatar.style.color = c('surface/foreground');
      peint(avatar, ['fond', 'surface/default'], ['texte', 'surface/foreground']);
      const badge = noeud('span', role);
      badge.className = 'essai-badge';
      if (genre === 'plein') {
        badge.style.background = c('solid/default');
        badge.style.color = c('solid/foreground');
        peint(badge, ['fond', 'solid/default'], ['texte', 'solid/foreground']);
      } else if (genre === 'texte') {
        badge.style.color = c('page/foreground');
        peint(badge, ['texte', 'page/foreground']);
      } else {
        badge.style.background = c('surface/default');
        badge.style.color = c('surface/foreground');
        peint(badge, ['fond', 'surface/default'], ['texte', 'surface/foreground']);
      }
      ligne.append(avatar, noeud('span', nom), badge);
      ligne.addEventListener('click', () => {
        for (const autre of lignes) autre.setAttribute('aria-selected', String(autre === ligne));
      });
      return ligne;
    });
    tableau.append(...lignes);

    // Le champ garde son contour : `page/border` n'a pas d'état ; le focus ajoute l'anneau.
    const champ = noeud('label');
    champ.className = 'essai-champ';
    const saisie = noeud('input');
    saisie.className = 'essai-saisie';
    saisie.type = 'text';
    i18n.lier(saisie, 'value', e.membre);
    saisie.style.setProperty('--essai-bord', c('page/border'));
    peint(saisie, ['contour', 'page/border']);
    champ.append(noeud('span', e.roleParDefaut), saisie);

    const options = noeud('div');
    options.className = 'essai-options';
    const caseACocher = boutonDeLEcran('');
    caseACocher.className = 'essai-case';
    basculeDeLEcran(caseACocher, 'checkbox', e.notifier);
    fonds(caseACocher, troisFonds(couleurs, 'solid'));
    caseACocher.style.setProperty('--essai-bord', c('page/border'));
    caseACocher.style.setProperty('--essai-sur-plein', c('solid/foreground'));
    peint(caseACocher, ['fond', 'solid/default'], ['coche', 'solid/foreground']);
    const coche = noeud('span', e.coche);
    coche.className = 'essai-coche';
    coche.setAttribute('aria-hidden', 'true');
    caseACocher.append(coche);
    const interrupteur = boutonDeLEcran('');
    interrupteur.className = 'essai-interrupteur';
    basculeDeLEcran(interrupteur, 'switch', e.acces);
    fonds(interrupteur, troisFonds(couleurs, 'solid'));
    interrupteur.style.setProperty('--essai-bord', c('page/border'));
    interrupteur.style.setProperty('--essai-sur-plein', c('solid/foreground'));
    peint(interrupteur, ['fond', 'solid/default'], ['pastille', 'solid/foreground']);
    const curseur = noeud('span');
    curseur.className = 'essai-curseur';
    interrupteur.append(curseur);
    const optionCase = noeud('div');
    optionCase.className = 'essai-option';
    optionCase.append(caseACocher, noeud('span', e.notifier));
    const optionInterrupteur = noeud('div');
    optionInterrupteur.className = 'essai-option';
    optionInterrupteur.append(interrupteur, noeud('span', e.acces));
    options.append(optionCase, optionInterrupteur);

    // Trois boutons : sans fond, soft, plein. Le texte reste le même aux trois fonds.
    const actions = noeud('div');
    actions.className = 'essai-actions';
    const annuler = boutonDeLEcran(e.boutons[0]);
    annuler.className = 'essai-bouton';
    annuler.style.setProperty('--essai-texte', c('surface/foreground'));
    fonds(annuler, fondsSansFond(couleurs));
    peint(annuler, ['texte', 'surface/foreground'], ['fondAuSurvol', 'surface/hover']);
    const brouillon = boutonDeLEcran(e.boutons[1]);
    brouillon.className = 'essai-bouton';
    brouillon.style.setProperty('--essai-texte', c('surface/foreground'));
    fonds(brouillon, troisFonds(couleurs, 'surface'));
    peint(brouillon, ['fond', 'surface/default'], ['texte', 'surface/foreground']);
    const enregistrer = boutonDeLEcran(e.boutons[2]);
    enregistrer.className = 'essai-bouton';
    enregistrer.style.setProperty('--essai-texte', c('solid/foreground'));
    fonds(enregistrer, troisFonds(couleurs, 'solid'));
    peint(enregistrer, ['fond', 'solid/default'], ['texte', 'solid/foreground']);
    actions.append(annuler, brouillon, enregistrer);

    corps.append(tete, encart, tableau, champ, options, actions);
    racine.append(navigation, corps);
    return racine;
  }

  /**
   * La grille des composants par état : une rangée par composant, une colonne
   * par état, `default`, `hover`, `pressed`, puis `focus`. Chaque cellule est
   * peinte de l'état qu'elle nomme, sans survol, d'après la recette du
   * Playground ; un composant sans cet état garde un tiret.
   */
  function composantsParEtat(couleurs: CouleursDeLInterface): HTMLDivElement {
    const t = TEXTES_DE_L_INTERFACE_DE_TEST.composants;
    const c = couleurs.variable;
    const grille = noeud('div');
    grille.className = 'essai-etats';
    grille.setAttribute('role', 'table');
    i18n.lier(grille, 'aria-label', TEXTES_DE_L_INTERFACE_DE_TEST.etats);

    interface Reglage {
      /** La variable du fond ; sans elle, le spécimen est sans fond. */
      readonly fond?: VariableDePalette;
      readonly texte: VariableDePalette;
      readonly contour?: VariableDePalette;
      /** Le fond porte aussi le contour (bouton contour survolé). */
      readonly fondEtContour?: boolean;
    }
    /** Un spécimen ; `focus` ajoute l'anneau, séparé du spécimen par un jour de la couleur du thème. */
    const specimen = (texte: Texte, etat: EtatMontre, reglage: Reglage): HTMLSpanElement => {
      const element = noeud('span', texte);
      element.className = 'essai-specimen';
      element.style.background = reglage.fond ? c(reglage.fond) : 'transparent';
      element.style.color = c(reglage.texte);
      if (reglage.contour) element.style.borderColor = c(reglage.contour);
      const paires: [Propriete, VariableDePalette][] = [];
      if (reglage.fondEtContour && reglage.fond) paires.push(['fondEtContour', reglage.fond]);
      else {
        if (reglage.fond) paires.push(['fond', reglage.fond]);
        if (reglage.contour) paires.push(['contour', reglage.contour]);
      }
      paires.push(['texte', reglage.texte]);
      if (etat === 'focus') {
        element.style.boxShadow = `0 0 0 2px ${couleurs.fond}, 0 0 0 4px ${c('page/focus')}`;
        paires.push(['anneau', 'page/focus']);
      }
      return peint(element, ...paires);
    };
    const tiret = (): HTMLSpanElement => {
      const element = noeud('span', t.sansEtat);
      element.className = 'essai-sans-etat';
      return element;
    };
    /** Le focus garde la forme du repos et ajoute l'anneau (S3) : `specimen` pose l'anneau, la forme se lit à l'état `default`. */
    const forme = (etat: EtatMontre): Etat => (etat === 'focus' ? 'default' : etat);
    const plein = (etat: EtatMontre) => specimen(t.action, etat, { fond: `solid/${forme(etat)}`, texte: 'solid/foreground' });
    const soft = (etat: EtatMontre) => specimen(t.action, etat, { fond: `surface/${forme(etat)}`, texte: 'surface/foreground' });
    const contour = (etat: EtatMontre) => (forme(etat) === 'default'
      ? specimen(t.action, etat, { texte: 'page/foreground', contour: 'page/border' })
      : specimen(t.action, etat, { fond: `solid/${forme(etat)}`, texte: 'solid/foreground', contour: `solid/${forme(etat)}`, fondEtContour: true }));
    const sansFond = (etat: EtatMontre) => (forme(etat) === 'default'
      ? specimen(t.action, etat, { texte: 'surface/foreground' })
      : specimen(t.action, etat, { fond: `surface/${forme(etat)}`, texte: 'surface/foreground' }));
    /** Le champ garde son contour aux quatre états ; le focus ajoute l'anneau. Il se peint du fond et de l'encre du thème. */
    const champ = (etat: EtatMontre) => {
      const element = noeud('span', t.texte);
      element.className = 'essai-specimen';
      element.style.background = couleurs.fond;
      element.style.color = couleurs.encre;
      element.style.borderColor = c('page/border');
      if (etat === 'focus') element.style.boxShadow = `0 0 0 2px ${couleurs.fond}, 0 0 0 4px ${c('page/focus')}`;
      return peint(element, ['contour', 'page/border'], ...(etat === 'focus' ? [['anneau', 'page/focus'] as const] : []));
    };
    const rangees: [Texte, (etat: EtatMontre) => HTMLElement | null][] = [
      [t.plein, plein],
      [t.soft, soft],
      [t.contour, contour],
      [t.sansFond, sansFond],
      [t.champ, champ],
      [t.lien, (etat) => {
        if (etat === 'focus') return null;
        const lien = noeud('span', t.lienColore);
        lien.className = 'essai-lien-peint';
        lien.style.color = c('page/foreground');
        return peint(lien, ['texte', 'page/foreground']);
      }],
      [t.badge, (etat) => (etat === 'default' ? specimen(t.nouveau, etat, { fond: 'surface/default', texte: 'surface/foreground' }) : null)],
    ];

    const entete = noeud('div');
    entete.className = 'essai-rangee';
    entete.setAttribute('role', 'row');
    entete.append(noeud('span'), ...t.etats.map((etat) => {
      const colonne = noeud('span', etat);
      colonne.className = 'essai-colonne';
      colonne.setAttribute('role', 'columnheader');
      return colonne;
    }));
    const lignes = rangees.map(([nom, rendu]) => {
      const rangee = noeud('div');
      rangee.className = 'essai-rangee';
      rangee.setAttribute('role', 'row');
      const titre = noeud('span', nom);
      titre.className = 'essai-nom';
      titre.setAttribute('role', 'rowheader');
      rangee.append(titre, ...(['default', 'hover', 'pressed', 'focus'] as const).map((etat) => {
        const cellule = noeud('span');
        cellule.setAttribute('role', 'cell');
        cellule.append(rendu(etat) ?? tiret());
        return cellule;
      }));
      return rangee;
    });
    grille.append(entete, ...lignes);
    return grille;
  }

  function createInterfaceDeTest(): InterfaceDeTestUi {
    const carte = createCarte({ titre: TEXTES_DE_L_INTERFACE_DE_TEST.titre, sousTitre: TEXTES_DE_L_INTERFACE_DE_TEST.sousTitreDeLaCarte, glyphe: creerGlyphe('interfaceDeTest'), repliable: { ouverte: false } }, i18n);
    let vue: Vue = 'ecran';
    let dernier: { recette: Recette; analyse: AnalyseDePalette; mode: Mode } | null = null;
    /** Le choix du profil peint d'une palette à deux intensités, ouvert sur son porteur (Y2.6) ; la palette dont il est le choix. */
    let profil: Profil = 'vivid';
    let paletteDuProfil: string | null = null;

    const choixDeLaVue = createChoix<Vue>({
      libelle: TEXTES_DE_L_INTERFACE_DE_TEST.libelleVue,
      nom: TEXTES_DE_L_INTERFACE_DE_TEST.vue,
      options: (['ecran', 'etats'] as const).map((valeur) => ({ valeur, texte: TEXTES_DE_L_INTERFACE_DE_TEST.vues[valeur] })),
      surChoix(valeur) {
        vue = valeur;
        dessiner();
      },
    });
    choixDeLaVue.element.classList.add('choix-de-la-vue');
    // Le profil peint, après la vue : seule une palette à deux intensités en a un à choisir ([ENT-14]).
    const choixDuProfil = createChoixDuProfil({
      portee: 'afficher',
      options: ['soft', 'vivid'],
      nom: TEXTES_DE_L_INTERFACE_DE_TEST.profil,
      surChoix(valeur) {
        if (valeur === 'deux') return;
        profil = valeur;
        rendreLeResume();
        dessiner();
      },
    });
    choixDuProfil.element.classList.add('choix-de-l-essai');
    const surface = noeud('div');
    surface.className = 'essai-surface';
    carte.poserLesChoix(choixDeLaVue, choixDuProfil);
    carte.corps.append(surface);

    // La bulle des variables : une aide à la souris, une ligne par propriété. Elle n'ajoute aucun texte lu à l'écran.
    const bulle = noeud('div');
    bulle.className = 'essai-bulle';
    bulle.setAttribute('aria-hidden', 'true');
    let couleursMontrees: CouleursDeLInterface | null = null;
    let survole: HTMLElement | null = null;

    function cacherLaBulle(): void {
      survole?.classList.remove('essai-survole');
      survole = null;
      bulle.remove();
    }

    function montrerLaBulle(element: HTMLElement): void {
      if (!couleursMontrees || element === survole) return;
      cacherLaBulle();
      survole = element;
      element.classList.add('essai-survole');
      const couleurs = couleursMontrees;
      bulle.replaceChildren(...(element.getAttribute('data-variables') ?? '').split(';').map((paire) => {
        const [propriete, variable] = paire.split('=') as [Propriete, VariableDePalette];
        const cran = TABLE_DES_DOSSIERS[couleurs.sens][variable];
        const ligne = noeud('div');
        ligne.className = 'essai-bulle-ligne';
        const quoi = noeud('span');
        quoi.className = 'essai-bulle-propriete';
        quoi.textContent = lireTexte(TEXTES_DE_L_INTERFACE_DE_TEST.peint[propriete]);
        const code = noeud('code');
        code.textContent = variable;
        const nuance = noeud('span');
        nuance.className = 'essai-bulle-propriete';
        nuance.textContent = cran === 'texteDesBoutons' ? lireTexte(NOM_DU_TEXTE_DES_BOUTONS[couleurs.texteDesBoutons]) : String(cran);
        ligne.append(quoi, code, nuance);
        return ligne;
      }));
      surface.append(bulle);
      const cible = element.getBoundingClientRect();
      const hote = surface.getBoundingClientRect();
      bulle.style.left = `${Math.max(0, Math.min(cible.left - hote.left, hote.width - bulle.offsetWidth))}px`;
      bulle.style.top = `${cible.bottom - hote.top + 6}px`;
    }

    surface.addEventListener('mouseover', (evenement) => {
      const cible = evenement.target instanceof Element ? evenement.target.closest<HTMLElement>('[data-variables]') : null;
      if (cible) montrerLaBulle(cible);
      else cacherLaBulle();
    });
    surface.addEventListener('mouseleave', cacherLaBulle);

    /** L'intensité peinte : la rampe unique, ou le profil choisi. */
    const intensiteMontree = (analyse: AnalyseDePalette): Intensite => (analyse.intensites.length === 1 ? 'unique' : profil);

    function rendreLeResume(): void {
      if (!dernier) return;
      const intensite = intensiteMontree(dernier.analyse);
      carte.poserResume(TEXTES_DE_L_INTERFACE_DE_TEST.resume(dernier.mode, intensite === 'unique' ? null : NOM_DU_PROFIL[intensite]));
    }

    function dessiner(): void {
      choixDeLaVue.poser(vue);
      choixDuProfil.poser(profil);
      choixDuProfil.cacher(!dernier || dernier.analyse.intensites.length === 1);
      cacherLaBulle();
      if (!dernier || dernier.analyse.libre || !carte.estOuverte()) {
        couleursMontrees = null;
        surface.replaceChildren();
        return;
      }
      const couleurs = couleursDeLInterface(dernier.recette, dernier.analyse, dernier.mode, intensiteMontree(dernier.analyse));
      couleursMontrees = couleurs;
      surface.style.setProperty('--essai-fond', couleurs.fond);
      surface.style.setProperty('--essai-encre', couleurs.encre);
      surface.style.setProperty('--essai-encre-seconde', couleurs.encreSeconde);
      surface.style.setProperty('--essai-separateur', couleurs.variable('page/divider'));
      surface.style.setProperty('--essai-focus', couleurs.variable('page/focus'));
      surface.replaceChildren(vue === 'ecran' ? ecranDeLEquipe(couleurs) : composantsParEtat(couleurs));
    }

    return {
      element: carte.element,
      afficher(recette, analyse, mode, palette) {
        // Une autre palette, ou une palette qui passe à deux intensités, rouvre le choix sur son profil porteur.
        const { profil: porteur } = analyse.ancrage;
        if (porteur === 'unique') paletteDuProfil = null;
        else if (palette !== paletteDuProfil) {
          profil = porteur;
          paletteDuProfil = palette;
        }
        dernier = { recette, analyse, mode };
        carte.element.hidden = analyse.libre;
        rendreLeResume();
        dessiner();
      },
      surBascule(action) {
        carte.surBascule(() => action());
      },
    };
  }
  return { couleursDeLInterface, createInterfaceDeTest };
}

export const creerVuesInterfaceDeTest = memoriserVues(construireVues);

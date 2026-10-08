/**
 * La carte « Garanties de contraste » de l'onglet Vérification ([UI-09]),
 * fixe et toujours ouverte : son en-tête ne nomme pas le thème, que la ligne du
 * titre de la palette choisit ([VER-20]). Le corps s'ouvre sur la rangée du
 * choix « Afficher » Soft/Vivid, dont chaque segment porte le résultat de
 * son profil ; viennent ensuite une réglette des nuances où la garantie
 * choisie se trace en éventail, sa légende, puis un encadré par minimum : les
 * quatre colonnes de fonds nommées une fois en tête (la page, `default`,
 * `hover`, `pressed`), une ligne par garantie, chaque fond dans sa colonne,
 * son ratio avec son niveau WCAG sur une seule ligne ([VER-13]). Une garantie
 * qui ne vise pas un fond laisse sa case vide. Sous 900 px, le spécimen passe
 * au-dessus des numéros. Une ligne en échec porte le fond fautif et les
 * réglages qui peuvent agir ([VER-06], [VER-15]).
 *
 * Le texte garde sa nuance dans tous les états : l'éventail part d'un seul
 * point, la nuance du premier membre (la case « boutons » pour le texte des
 * boutons), vers chacun de ses fonds. Les crans suivent la table du sens du
 * thème affiché. Aucun texte n'affiche le numéro d'une garantie : il sert de
 * clé à la ligne (`data-garantie`).
 *
 * Le profil affiché et la garantie choisie durent tant que la palette reste
 * ouverte ; ils se conservent au changement de profil et de thème.
 */
import {
  COULEUR_DU_TEXTE_DES_BOUTONS,
  MODES,
  PROFILS,
  TABLE_DES_DOSSIERS,
  lireHexa,
  rampeDe,
  sensDuTheme,
  type Intensite,
  type Mode,
  type Palette,
  type Promesse,
  type Recette,
} from 'ucm-couleur';

import type { AnalyseDePalette } from '../analyse';
import { ciblesDeLaPromesse, type CibleDAction } from '../presentation';
import { creerVuesBadge } from './badge';
import { createCarte } from './carte';
import { createRangeeDesChoix, creerVuesChoix } from './choix';
import { creerGlyphe } from './glyphes';
import { suivreLaLargeur } from './largeur';
import { memoriserVues, lireTexte, type Localisation, type MessageLocalise, type Texte } from './localisation';
import {
  COLONNES,
  blocsDeGaranties,
  caseDeLaReglette,
  ciblesDeLaGarantie,
  garantieParDefaut,
  lignesDesGaranties,
  type CaseDeLaReglette,
  type Colonne,
  type LigneDeGarantie,
} from './modeleDesGaranties';
import { creerVuesNuancier } from './nuancier';
import { creerVuesSpecimens } from './specimens';

export interface GestesDesGaranties {
  /** Ouvre le réglage qu'une ligne en échec nomme ([VER-15]). */
  ouvrir(cible: CibleDAction): void;
  /** Montre l'autre thème, avec un retour ([UI-09]). */
  montrerLeTheme(mode: Mode): void;
  /** Le thème d'avant `montrerLeTheme`, `null` sans retour à offrir. */
  themeDAvant(): Mode | null;
  revenirAuTheme(): void;
}

export interface EntreesDesGaranties {
  readonly recette: Recette;
  readonly palette: Palette;
  readonly analyse: AnalyseDePalette;
  readonly mode: Mode;
}

export interface GarantiesUi {
  element: HTMLElement;
  afficher(entrees: EntreesDesGaranties): void;
  /** Choisit une garantie par son numéro, depuis le détail d'une nuance, et l'amène en vue. */
  choisir(numero: number): void;
}

function construireVues(i18n: Localisation) {
  const { badgeDeNiveau } = creerVuesBadge(i18n);
  const { createChoixDuProfil } = creerVuesChoix(i18n);
  const { encresSur } = creerVuesNuancier(i18n);
  const { specimenDuRole } = creerVuesSpecimens(i18n);
  const { LIBELLE_DE_LA_VARIABLE, LIBELLES_DES_CIBLES, NOM_DU_TEXTE_DES_BOUTONS, TEXTES_DES_GARANTIES, TEXTES_DE_L_ONGLET, TEXTES_DU_NUANCIER, contrasteEcrit, jugementDuSeuil, niveauEcrit, resultatDuProfil, resultatDuProfilEnMots } = i18n.messages;

  const SVG = 'http://www.w3.org/2000/svg';

  /**
   * La trame de la réglette : l'écart entre deux cases, le pas avant la
   * première mesure, et les deux cases avant la première nuance, la page et
   * le texte des boutons. Le pas suit ensuite la largeur mesurée (Z8.3).
   */
  const ECART_ENTRE_CASES = 3.5;

  const PAS_AVANT_MESURE = 40.5;

  const CASES_AVANT = 2;

  /** La hauteur du viewBox, et les pixels d'une unité : l'échelle de la réglette dans la fenêtre minimale, 451 px pour 491,5 unités (Z8.1). */
  const HAUTEUR = 92;

  const PIXELS_PAR_UNITE = 451 / 491.5;

  /** Le trait de l'arc de chaque colonne : plein, tireté, pointillé, tiret-point pour la page. */
  const TIRETS: Record<Colonne, string> = { default: '', hover: '4 3', pressed: '1.5 2.5', page: '6 2 1.5 2' };

  function element<K extends keyof SVGElementTagNameMap>(nom: K, attributs: Record<string, string | number>): SVGElementTagNameMap[K] {
    const noeud = document.createElementNS(SVG, nom);
    for (const [cle, valeur] of Object.entries(attributs)) noeud.setAttribute(cle, String(valeur));
    return noeud;
  }

  function paragraphe(texte: Texte, classe = ''): HTMLParagraphElement {
    const noeud = document.createElement('p');
    i18n.lier(noeud, 'textContent', texte);
    if (classe) noeud.className = classe;
    return noeud;
  }

  /** Un nom de variable, en police de code. */
  function code(texte: Texte): HTMLElement {
    const noeud = document.createElement('code');
    noeud.className = 'code-du-role';
    i18n.lier(noeud, 'textContent', texte);
    return noeud;
  }

  const manquees = (promesses: readonly Promesse[]): number => promesses.filter((promesse) => promesse.verdict === 'manquee').length;

  /** Le numéro d'un membre dans une promesse : une nuance, « page », « blanc » ou « noir ». */
  function numeroDuMembre(promesse: Promesse, rang: 'premier' | 'second', recette: Recette): Texte {
    const designe = promesse[rang];
    if (designe.nature === 'cran') return String(designe.cran);
    return designe.nature === 'fond' ? TEXTES_DES_GARANTIES.casePage : NOM_DU_TEXTE_DES_BOUTONS[recette.texteDesBoutons[promesse.mode]];
  }

  /**
   * Le spécimen d'une promesse : le premier membre posé sur le second. Le texte
   * des boutons se peint en blanc ou noir purs, sur le bouton jugé, qui se
   * pose lui-même sur la page.
   */
  function specimenDeLaPromesse(promesse: Promesse, recette: Recette): HTMLElement {
    const { premier, second } = promesse;
    const variable = promesse.garantie.premier.variable;
    const page = lireHexa(recette.fonds[promesse.mode]) ?? [255, 255, 255];
    if (variable === 'solid/foreground') return specimenDuRole('solid', second.couleur, page, premier.couleur);
    if (variable === 'solid/default') {
      const texte = lireHexa(COULEUR_DU_TEXTE_DES_BOUTONS[recette.texteDesBoutons[promesse.mode]]) ?? [255, 255, 255];
      return specimenDuRole('solid', premier.couleur, second.couleur, texte);
    }
    if (variable === 'surface/foreground' || variable === 'page/foreground') return specimenDuRole('text', premier.couleur, second.couleur);
    if (variable === 'page/focus') return specimenDuRole('focus', premier.couleur, second.couleur);
    return specimenDuRole('border', premier.couleur, second.couleur);
  }

  /** Le libellé du lexique sous les variables d'une ligne ; le texte des boutons dit sur quoi il se pose. */
  function libelleDeLaLigne(ligne: LigneDeGarantie): Texte {
    const variable = ligne.garantie.premier.variable;
    if (variable === 'solid/foreground') return i18n.composer`${LIBELLE_DE_LA_VARIABLE[variable]} ${TEXTES_DES_GARANTIES.sur} ${LIBELLE_DE_LA_VARIABLE['solid/default']}`;
    return LIBELLE_DE_LA_VARIABLE[variable];
  }

  /** Les fonds d'une ligne en une phrase, pour l'assistance technique : « surface/* et la page ». */
  function fondsEcrits(ligne: LigneDeGarantie): MessageLocalise {
    const cibles = ciblesDeLaGarantie(ligne.garantie);
    return {
      lire: () => cibles.map((cible) => ('page' in cible ? lireTexte(TEXTES_DES_GARANTIES.laPage) : cible.code)).join(` ${lireTexte(TEXTES_DES_GARANTIES.et)} `),
    };
  }

  function createGaranties(gestes: GestesDesGaranties): GarantiesUi {
    const carte = createCarte({ titre: TEXTES_DE_L_ONGLET.garanties, sousTitre: TEXTES_DE_L_ONGLET.sousTitreDesGaranties, glyphe: creerGlyphe('garanties') }, i18n);
    const choixDuProfil = createChoixDuProfil({
      portee: 'afficher',
      options: PROFILS,
      nom: TEXTES_DES_GARANTIES.profils,
      surChoix(valeur) {
        if (valeur === 'deux') return;
        profil = valeur;
        rendre();
      },
    });
    const reglette = document.createElement('div');
    reglette.className = 'reglette-des-garanties';
    const legende = paragraphe(TEXTES_DES_GARANTIES.legende, 'ligne-secondaire');
    const liste = document.createElement('div');
    liste.className = 'liste-des-garanties';
    const autreTheme = document.createElement('p');
    autreTheme.className = 'autre-theme';
    carte.corps.append(createRangeeDesChoix(choixDuProfil), reglette, legende, liste, autreTheme);
    /** La largeur mesurée de la réglette, en unités ; `null` avant la première mesure. */
    let largeurDeLaReglette: number | null = null;
    let derniereReglette: (() => void) | null = null;
    suivreLaLargeur(reglette, (largeur) => {
      largeurDeLaReglette = largeur / PIXELS_PAR_UNITE;
      derniereReglette?.();
    });

    let entrees: EntreesDesGaranties | null = null;
    let palette = '';
    let profil: Intensite = 'vivid';
    /** Le numéro de la garantie choisie. */
    let choisie = 0;

    const promessesDe = (analyse: AnalyseDePalette, mode: Mode, duProfil: Intensite): Promesse[] =>
      analyse.promesses.filter((promesse) => promesse.mode === mode && promesse.profil === duProfil);

    /**
     * La réglette : la page et le texte des boutons, les nuances numérotées, et
     * l'éventail de la garantie choisie, un arc de son départ vers chacun de
     * ses fonds.
     */
    function dessinerLaReglette(recette: Recette, analyse: AnalyseDePalette, mode: Mode, ligne: LigneDeGarantie | undefined): void {
      derniereReglette = () => dessinerLaReglette(recette, analyse, mode, ligne);
      const nombreDeCases = recette.crans.length + CASES_AVANT;
      const largeur = largeurDeLaReglette ?? nombreDeCases * PAS_AVANT_MESURE;
      const PAS = largeur / nombreDeCases;
      const CASE = PAS - ECART_ENTRE_CASES;
      const fond = recette.fonds[mode];
      const couleurDuFond = lireHexa(fond) ?? [255, 255, 255];
      const encres = encresSur(couleurDuFond);
      reglette.style.background = fond;
      reglette.style.setProperty('--encre-surface', encres.encre);
      reglette.style.setProperty('--encre-surface-seconde', encres.seconde);
      reglette.style.setProperty('--bordure-surface', encres.bordure);
      const svg = element('svg', { viewBox: `0 0 ${largeur} ${HAUTEUR}`, 'aria-hidden': 'true' });
      svg.classList.add('reglette-svg');
      svg.style.height = `${HAUTEUR * PIXELS_PAR_UNITE}px`;
      const rangDeLaCase = (cas: CaseDeLaReglette): number => (cas === 'page' ? 0 : cas === 'boutons' ? 1 : recette.crans.indexOf(cas) + CASES_AVANT);
      const centre = (cas: CaseDeLaReglette): number => rangDeLaCase(cas) * PAS + CASE / 2;
      const vises = new Set<CaseDeLaReglette>();
      if (ligne) {
        const x1 = centre(ligne.depart);
        vises.add(ligne.depart);
        for (const { colonne, promesse } of ligne.cases) {
          const arrivee = caseDeLaReglette(promesse.second);
          const x2 = centre(arrivee);
          vises.add(arrivee);
          // Plus l'arrivée est loin du départ, plus l'arc monte : deux arcs du même départ ne se croisent pas.
          const haut = Math.max(4, 40 - 0.18 * Math.abs(x2 - x1));
          const arc = element('path', { d: `M${x1} 48 C${x1} ${haut}, ${x2} ${haut}, ${x2} 48`, 'stroke-dasharray': TIRETS[colonne] });
          arc.classList.add('reglette-arc');
          arc.dataset.verdict = promesse.verdict;
          svg.append(arc);
          for (const x of [x1, x2]) {
            const bout = element('circle', { cx: x, cy: 48, r: 2.2 });
            bout.classList.add('reglette-bout');
            bout.dataset.verdict = promesse.verdict;
            svg.append(bout);
          }
        }
      }
      const nom = (cas: CaseDeLaReglette, texte: Texte): SVGTextElement => {
        const noeud = element('text', { x: rangDeLaCase(cas) * PAS + CASE / 2, y: 87 });
        noeud.classList.add('reglette-numero');
        noeud.dataset.vise = String(vises.has(cas));
        i18n.lier(noeud, 'textContent', texte);
        return noeud;
      };
      const casePage = element('rect', { x: 0, y: 52, width: CASE, height: 22, rx: 3, fill: fond });
      casePage.classList.add('reglette-page');
      const caseBoutons = element('rect', { x: PAS, y: 52, width: CASE, height: 22, rx: 3, fill: COULEUR_DU_TEXTE_DES_BOUTONS[recette.texteDesBoutons[mode]] });
      caseBoutons.classList.add('reglette-boutons');
      svg.append(casePage, nom('page', TEXTES_DES_GARANTIES.casePage), caseBoutons, nom('boutons', TEXTES_DES_GARANTIES.caseBoutons));
      const rampe = rampeDe(analyse.rampes, profil)[mode];
      rampe.forEach((cran, rang) => {
        const x = (rang + CASES_AVANT) * PAS;
        svg.append(element('rect', { x, y: 52, width: CASE, height: 22, rx: 3, fill: cran.hexa }));
        if (analyse.ancrage.profil === profil && analyse.ancrage.rangs[mode] === rang) {
          const losange = element('text', { x: x + CASE / 2, y: 66.5, fill: cran.L > 0.6 ? '#000000' : '#FFFFFF' });
          losange.classList.add('reglette-reference');
          i18n.lier(losange, 'textContent', '◆');
          svg.append(losange);
        }
        svg.append(nom(recette.crans[rang], String(recette.crans[rang])));
      });
      reglette.replaceChildren(svg);
    }

    /** Un fond d'une garantie, dans sa colonne : son spécimen, les deux numéros, puis le résultat et son badge. */
    function caseDeLaLigne(colonne: Colonne, promesse: Promesse, recette: Recette): HTMLDivElement {
      const bloc = document.createElement('div');
      bloc.className = 'garantie-etat';
      bloc.dataset.rang = String(COLONNES.indexOf(colonne));
      const numeros = paragraphe(TEXTES_DES_GARANTIES.numeros(numeroDuMembre(promesse, 'premier', recette), numeroDuMembre(promesse, 'second', recette)));
      numeros.className = 'garantie-numeros';
      const resultat = paragraphe(TEXTES_DES_GARANTIES.resultat(promesse.verdict === 'tenue', promesse.contraste));
      resultat.className = 'garantie-resultat';
      resultat.dataset.verdict = promesse.verdict;
      resultat.append(badgeDeNiveau(promesse.contraste, jugementDuSeuil(promesse.garantie.seuil)));
      bloc.append(specimenDeLaPromesse(promesse, recette), numeros, resultat);
      return bloc;
    }

    /** L'étiquette accessible d'une ligne : les variables, le libellé, puis chaque fond avec ses numéros, son ratio et son résultat. */
    function etiquette(ligne: LigneDeGarantie, recette: Recette): Texte {
      const fonds = ligne.cases.map(({ colonne, promesse }) => i18n.composer`${TEXTES_DES_GARANTIES.colonnes[colonne]}, ${numeroDuMembre(promesse, 'premier', recette)} ${TEXTES_DES_GARANTIES.sur} ${numeroDuMembre(promesse, 'second', recette)}, ${contrasteEcrit(promesse.contraste)}, ${promesse.verdict === 'tenue' ? '✓' : '✗'}, ${niveauEcrit(promesse.contraste, jugementDuSeuil(promesse.garantie.seuil)).etiquette}`);
      return i18n.composer`${ligne.garantie.premier.variable} ${TEXTES_DES_GARANTIES.sur} ${fondsEcrits(ligne)}. ${libelleDeLaLigne(ligne)}. ${i18n.joindre(fonds, ' ; ')}`;
    }

    /** Ce que la ligne dit des variables : le premier membre, « sur », puis chacun de ses fonds. */
    function relationDeLaLigne(ligne: LigneDeGarantie): HTMLParagraphElement {
      const relation = document.createElement('p');
      relation.append(code(ligne.garantie.premier.variable), i18n.noeud(i18n.composer` ${TEXTES_DES_GARANTIES.sur} `));
      ciblesDeLaGarantie(ligne.garantie).forEach((cible, rang) => {
        if (rang > 0) relation.append(i18n.noeud(i18n.composer` ${TEXTES_DES_GARANTIES.et} `));
        relation.append('page' in cible ? i18n.noeud(TEXTES_DES_GARANTIES.laPage) : code(cible.code));
      });
      return relation;
    }

    function ligneDeGarantie(ligne: LigneDeGarantie, recette: Recette): HTMLElement[] {
      const numero = ligne.garantie.numero;
      const rangee = document.createElement('div');
      rangee.className = 'garantie';
      rangee.setAttribute('role', 'button');
      rangee.tabIndex = 0;
      rangee.dataset.garantie = String(numero);
      rangee.setAttribute('aria-pressed', String(numero === choisie));
      i18n.lier(rangee, 'aria-label', etiquette(ligne, recette));
      const choisir = () => {
        choisie = numero;
        rendre();
        liste.querySelector<HTMLElement>(`[data-garantie="${numero}"]`)?.focus();
      };
      rangee.addEventListener('click', choisir);
      rangee.addEventListener('keydown', (evenement) => {
        if (evenement.key !== 'Enter' && evenement.key !== ' ') return;
        evenement.preventDefault();
        choisir();
      });

      const qui = document.createElement('div');
      qui.className = 'garantie-qui';
      qui.append(relationDeLaLigne(ligne), paragraphe(libelleDeLaLigne(ligne), 'ligne-secondaire'));
      if (ligne.garantie.premier.variable === 'solid/foreground') {
        const note = document.createElement('p');
        note.className = 'ligne-secondaire';
        const mode = ligne.cases[0].promesse.mode;
        note.append(code(ligne.garantie.premier.variable), i18n.noeud(TEXTES_DES_GARANTIES.noteDuTexteDesBoutons(mode, recette.texteDesBoutons[mode])));
        qui.append(note);
      }
      rangee.append(qui, ...ligne.cases.map(({ colonne, promesse }) => caseDeLaLigne(colonne, promesse, recette)));

      const echecs = ligne.cases.filter(({ promesse }) => promesse.verdict === 'manquee');
      if (echecs.length === 0) return [rangee];
      const echec = document.createElement('div');
      echec.className = 'garantie-echec';
      for (const { colonne, promesse } of echecs) echec.append(paragraphe(TEXTES_DES_GARANTIES.echec(colonne, promesse.contraste, promesse.seuil)));
      const liens = document.createElement('div');
      liens.className = 'constat-liens';
      for (const cible of ciblesDeLaPromesse()) {
        const lien = document.createElement('button');
        lien.type = 'button';
        lien.className = 'lien-de-constat';
        lien.dataset.cible = cible;
        i18n.lier(lien, 'textContent', LIBELLES_DES_CIBLES[cible]);
        lien.addEventListener('click', () => gestes.ouvrir(cible));
        liens.append(lien);
      }
      echec.append(liens);
      return [rangee, echec];
    }

    /** La ligne du filet, sans minimum de contraste : son cran se lit dans la table du sens du thème montré. */
    function ligneDuFilet(recette: Recette, mode: Mode): HTMLElement | null {
      const cran = TABLE_DES_DOSSIERS[sensDuTheme(mode, recette.texteDesBoutons[mode])]['page/divider'];
      if (!recette.crans.includes(cran)) return null;
      const decoratif = document.createElement('p');
      decoratif.className = 'garantie-decorative';
      decoratif.append(code('page/divider'), i18n.noeud(TEXTES_DES_GARANTIES.filet(cran)));
      return decoratif;
    }

    function rendre(): void {
      if (!entrees) return;
      const { recette, analyse, mode } = entrees;
      const autre: Mode = MODES.find((candidat) => candidat !== mode) ?? mode;
      const parProfil = (duProfil: Intensite, dansLeMode: Mode) => manquees(promessesDe(analyse, dansLeMode, duProfil));
      // Une palette à une intensité n'a pas de profil à choisir : le choix, et sa rangée, se retirent ([ENT-14]).
      choixDuProfil.cacher(analyse.intensites.length === 1);
      choixDuProfil.poser(profil === 'unique' ? null : profil, null, (valeur) => {
        if (valeur === 'deux') return undefined;
        const manquees = parProfil(valeur, mode);
        return { texte: resultatDuProfil(valeur, manquees), nom: resultatDuProfilEnMots(valeur, manquees), verdict: manquees === 0 ? 'tenue' : 'manquee' };
      });

      const lignes = lignesDesGaranties(promessesDe(analyse, mode, profil));
      dessinerLaReglette(recette, analyse, mode, lignes.find((ligne) => ligne.garantie.numero === choisie));

      const blocs: HTMLElement[] = [];
      for (const { seuil, lignes: duBloc } of blocsDeGaranties(lignes)) {
        const bloc = document.createElement('section');
        bloc.className = 'garanties-bloc';
        const titre = seuil === 'texte' ? TEXTES_DES_GARANTIES.textes : TEXTES_DES_GARANTIES.visibles;
        i18n.lier(bloc, 'aria-label', titre);
        const tete = document.createElement('div');
        tete.className = 'garanties-bloc-tete';
        const minimum = document.createElement('span');
        minimum.className = 'ligne-secondaire';
        i18n.lier(minimum, 'textContent', TEXTES_DES_GARANTIES.minimum(recette.seuils[seuil]));
        tete.append(i18n.noeud(titre), minimum);
        // Les colonnes de fonds, nommées une fois en tête ; chaque ligne les redit à l'assistance technique.
        const colonnes = document.createElement('div');
        colonnes.className = 'garanties-colonnes';
        colonnes.setAttribute('aria-hidden', 'true');
        colonnes.append(document.createElement('span'), ...COLONNES.map((colonne, rang) => {
          const nom = i18n.noeud(TEXTES_DES_GARANTIES.colonnes[colonne]);
          nom.dataset.rang = String(rang);
          return nom;
        }));
        bloc.append(tete, colonnes);
        for (const ligne of duBloc) bloc.append(...ligneDeGarantie(ligne, recette));
        blocs.push(bloc);
      }
      const filet = ligneDuFilet(recette, mode);
      liste.replaceChildren(...blocs, ...(filet ? [filet] : []));

      // L'autre thème : ses garanties manquées et le lien qui le montre ; après ce lien, le retour au thème d'avant.
      const ailleurs = analyse.intensites.reduce((total, duProfil) => total + parProfil(duProfil, autre), 0);
      const avant = gestes.themeDAvant();
      autreTheme.hidden = ailleurs === 0 && avant === null;
      const lien = document.createElement('button');
      lien.type = 'button';
      lien.className = 'lien-de-constat';
      if (avant !== null) {
        lien.dataset.geste = 'revenir';
        i18n.lier(lien, 'textContent', TEXTES_DU_NUANCIER.revenirAuTheme(avant));
        lien.addEventListener('click', () => {
          gestes.revenirAuTheme();
          autreTheme.querySelector<HTMLElement>('.lien-de-constat')?.focus();
        });
      } else {
        lien.dataset.geste = 'voir';
        i18n.lier(lien, 'textContent', TEXTES_DES_GARANTIES.voirLeTheme(autre));
        lien.addEventListener('click', () => {
          gestes.montrerLeTheme(autre);
          autreTheme.querySelector<HTMLElement>('.lien-de-constat')?.focus();
        });
      }
      autreTheme.replaceChildren(...(ailleurs > 0 ? [i18n.noeud(i18n.composer`${TEXTES_DES_GARANTIES.autreTheme(autre, ailleurs)} · `)] : []), lien);
    }

    return {
      element: carte.element,
      afficher(suivantes) {
        // Une autre palette, ou une intensité qu'elle ne porte plus : son intensité porteuse, et sa première garantie en échec, sinon le texte sur fond teinté.
        if (suivantes.palette.id !== palette || !suivantes.analyse.intensites.includes(profil)) {
          palette = suivantes.palette.id;
          profil = suivantes.analyse.ancrage.profil;
          choisie = garantieParDefaut(lignesDesGaranties(promessesDe(suivantes.analyse, suivantes.mode, profil)));
        }
        entrees = suivantes;
        rendre();
      },
      choisir(numero) {
        choisie = numero;
        rendre();
        liste.querySelector<HTMLElement>(`[data-garantie="${numero}"]`)?.scrollIntoView({ block: 'nearest' });
      },
    };
  }
  return { createGaranties };
}

export const creerVuesGaranties = memoriserVues(construireVues);

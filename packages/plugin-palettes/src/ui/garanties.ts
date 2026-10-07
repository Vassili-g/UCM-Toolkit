/**
 * La carte « Garanties de contraste » de l'onglet Vérification ([UI-09]),
 * fixe et toujours ouverte : dans son en-tête, le nom du thème montré, que la
 * barre de la palette choisit ([VER-20]) ; puis
 * le choix « Afficher » Soft/Vivid, dont chaque segment porte le résultat de
 * son profil, une réglette
 * des nuances où la garantie choisie se trace en arcs, puis un encadré par
 * minimum (maquette Z3.2, G2) : les états nommés une fois en tête de
 * colonne, une ligne par association (section 9.4), chaque état dans sa
 * colonne, son ratio avec son niveau WCAG sur une seule ligne ([VER-13]).
 * Sous 700 px, le spécimen passe au-dessus des numéros (maquette Z3.5, N2).
 * Une ligne en échec porte l'état fautif et les réglages qui peuvent agir
 * ([VER-06], [VER-15]).
 *
 * Le profil affiché et la garantie choisie durent tant que la palette reste
 * ouverte ; ils se conservent au changement de profil et de thème.
 */
import {
  ASSOCIATIONS,
  MODES,
  PROFILS,
  TABLE_DES_EMPLOIS,
  associationDe,
  cleDeLAssociation,
  etatDeLaPaire,
  RANGS,
  lireHexa,
  rampeDe,
  type Association,
  type EtatDePaire,
  type Mode,
  type Palette,
  type Intensite,
  type Promesse,
  type Recette,
  type Rgb8,
} from 'ucm-couleur';

import type { AnalyseDePalette } from '../analyse';
import { ciblesDeLaPromesse, type CibleDAction } from '../presentation';
import { creerVuesBadge } from './badge';
import { createCarte } from './carte';
import { creerVuesChoixDuProfil } from './choixDuProfil';
import { creerGlyphe } from './glyphes';
import { suivreLaLargeur } from './largeur';
import { memoriserVues, lireTexte, type Localisation, type Texte } from './localisation';
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
  /** Choisit une garantie, depuis le détail d'une nuance, et l'amène en vue. */
  choisir(association: Association): void;
}

function construireVues(i18n: Localisation) {
  const { badgeDeNiveau } = creerVuesBadge(i18n);
  const { createChoixDuProfil } = creerVuesChoixDuProfil(i18n);
  const { encresSur } = creerVuesNuancier(i18n);
  const { specimenDuRole } = creerVuesSpecimens(i18n);
  const { LIBELLES_DES_CIBLES, NOM_DE_L_ETAT, NOM_DU_PROFIL, NOM_DU_ROLE, TEXTES, TEXTES_DES_GARANTIES, TEXTES_DE_L_ONGLET, TEXTES_DU_NUANCIER, contrasteEcrit, jugementDuSeuil, niveauEcrit, resultatDuProfil, resultatDuProfilEnMots } = i18n.messages;

  const SVG = 'http://www.w3.org/2000/svg';

  /**
   * La trame de la réglette : l'écart entre deux cases, le pas avant la
   * première mesure, et la case `on-solid` à gauche. Le pas suit ensuite la
   * largeur mesurée, moins la case `on-solid` (Z8.3).
   */
  const ECART_ENTRE_CASES = 3.5;

  const PAS_AVANT_MESURE = 40.5;

  const ON_SOLID = { x: -44, largeur: 36 };

  /** Ce que le viewBox montre à gauche de la première nuance : la case `on-solid` et sa marge. */
  const A_GAUCHE = 46;

  /** La hauteur du viewBox, et les pixels d'une unité : l'échelle de la réglette dans la fenêtre minimale, 451 px pour 491,5 unités (Z8.1). */
  const HAUTEUR = 92;

  const PIXELS_PAR_UNITE = 451 / 491.5;

  const TIRETS: Record<EtatDePaire, string> = { 0: '', 1: '4 3', 2: '1.5 2.5', 3: '6 2 1.5 2' };

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

  function code(texte: Texte): HTMLElement {
    const noeud = document.createElement('code');
    noeud.className = 'code-du-role';
    i18n.lier(noeud, 'textContent', texte);
    return noeud;
  }

  const manquees = (promesses: readonly Promesse[]): number => promesses.filter((promesse) => promesse.verdict === 'manquee').length;

  /** Le numéro d'un membre dans une promesse, ou « fond ». */
  function numeroDuMembre(promesse: Promesse, rang: 'premier' | 'second'): Texte {
    const designe = promesse[rang];
    return designe.nature === 'cran' ? String(designe.cran) : TEXTES_DES_GARANTIES.fond;
  }

  /** Le spécimen d'une promesse : le premier membre posé sur le second, un texte `on-solid` dans son bouton. */
  function specimenDeLaPromesse(promesse: Promesse, fond: Rgb8): HTMLElement {
    const association = associationDe(promesse.paire);
    if (association.premier === 'on-solid') return specimenDuRole('solid', promesse.second.couleur, fond, promesse.premier.couleur);
    return specimenDuRole(association.premier, promesse.premier.couleur, promesse.second.couleur);
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
    carte.corps.append(choixDuProfil.element, reglette, legende, liste, autreTheme);
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
    let choisie = '';

    const promessesDe = (analyse: AnalyseDePalette, mode: Mode, duProfil: Intensite): Promesse[] =>
      analyse.promesses.filter((promesse) => promesse.mode === mode && promesse.profil === duProfil);

    /** La réglette : la case `on-solid`, les nuances numérotées, et un arc par état de la garantie choisie. */
    function dessinerLaReglette(recette: Recette, analyse: AnalyseDePalette, mode: Mode, promesses: readonly Promesse[]): void {
      derniereReglette = () => dessinerLaReglette(recette, analyse, mode, promesses);
      const largeur = largeurDeLaReglette ?? recette.crans.length * PAS_AVANT_MESURE + A_GAUCHE;
      const PAS = (largeur - A_GAUCHE) / recette.crans.length;
      const CASE = PAS - ECART_ENTRE_CASES;
      const fond = recette.fonds[mode];
      const couleurDuFond = lireHexa(fond) ?? [255, 255, 255];
      const encres = encresSur(couleurDuFond);
      reglette.style.background = fond;
      reglette.style.setProperty('--encre-surface', encres.encre);
      reglette.style.setProperty('--encre-surface-seconde', encres.seconde);
      reglette.style.setProperty('--bordure-surface', encres.bordure);
      const svg = element('svg', { viewBox: `${-A_GAUCHE} 0 ${largeur} ${HAUTEUR}`, 'aria-hidden': 'true' });
      svg.classList.add('reglette-svg');
      svg.style.height = `${HAUTEUR * PIXELS_PAR_UNITE}px`;
      const centre = (promesse: Promesse, rang: 'premier' | 'second'): number => {
        const designe = promesse[rang];
        return designe.nature === 'cran' ? recette.crans.indexOf(designe.cran) * PAS + CASE / 2 : ON_SOLID.x + ON_SOLID.largeur / 2;
      };
      const vises = new Set<string>();
      for (const promesse of promesses) {
        const etat = etatDeLaPaire(promesse.paire);
        const [x1, x2] = [centre(promesse, 'premier'), centre(promesse, 'second')];
        const haut = 6 + 4 * etat;
        const arc = element('path', { d: `M${x1} 48 C${x1} ${haut}, ${x2} ${haut}, ${x2} 48`, 'stroke-dasharray': TIRETS[etat] });
        arc.classList.add('reglette-arc');
        arc.dataset.verdict = promesse.verdict;
        svg.append(arc);
        for (const x of [x1, x2]) {
          const bout = element('circle', { cx: x, cy: 48, r: 2.2 });
          bout.classList.add('reglette-bout');
          bout.dataset.verdict = promesse.verdict;
          svg.append(bout);
        }
        for (const rang of ['premier', 'second'] as const) vises.add(lireTexte(numeroDuMembre(promesse, rang)));
      }
      const rampe = rampeDe(analyse.rampes, profil)[mode];
      rampe.forEach((cran, rang) => {
        svg.append(element('rect', { x: rang * PAS, y: 52, width: CASE, height: 22, rx: 3, fill: cran.hexa }));
        if (analyse.ancrage.profil === profil && analyse.ancrage.rangs[mode] === rang) {
          const losange = element('text', { x: rang * PAS + CASE / 2, y: 66.5, fill: cran.L > 0.6 ? '#000000' : '#FFFFFF' });
          losange.classList.add('reglette-reference');
          i18n.lier(losange, 'textContent', '◆');
          svg.append(losange);
        }
        const numero = element('text', { x: rang * PAS + CASE / 2, y: 87 });
        numero.classList.add('reglette-numero');
        numero.dataset.vise = String(vises.has(String(recette.crans[rang])));
        i18n.lier(numero, 'textContent', String(recette.crans[rang]));
        svg.append(numero);
      });
      const caseOnSolid = element('rect', { x: ON_SOLID.x, y: 52, width: ON_SOLID.largeur, height: 22, rx: 3, fill: fond });
      caseOnSolid.classList.add('reglette-on-solid');
      svg.append(caseOnSolid);
      const nomOnSolid = element('text', { x: ON_SOLID.x + ON_SOLID.largeur / 2, y: 87 });
      nomOnSolid.classList.add('reglette-numero');
      nomOnSolid.dataset.vise = String(vises.has(lireTexte(TEXTES_DES_GARANTIES.fond)));
      i18n.lier(nomOnSolid, 'textContent', 'on-solid');
      svg.append(nomOnSolid);
      reglette.replaceChildren(svg);
    }

    /** Un état d'une association, dans la colonne de son état : son spécimen, les deux numéros, puis le résultat et son badge. */
    function etatDeLaGarantie(promesse: Promesse, fond: Rgb8): HTMLDivElement {
      const bloc = document.createElement('div');
      bloc.className = 'garantie-etat';
      bloc.dataset.rang = String(etatDeLaPaire(promesse.paire));
      const numeros = paragraphe(TEXTES_DES_GARANTIES.numeros(numeroDuMembre(promesse, 'premier'), numeroDuMembre(promesse, 'second')));
      numeros.className = 'garantie-numeros';
      const resultat = paragraphe(TEXTES_DES_GARANTIES.resultat(promesse.verdict === 'tenue', promesse.contraste));
      resultat.className = 'garantie-resultat';
      resultat.dataset.verdict = promesse.verdict;
      resultat.append(badgeDeNiveau(promesse.contraste, jugementDuSeuil(promesse.paire.seuil)));
      bloc.append(specimenDeLaPromesse(promesse, fond), numeros, resultat);
      return bloc;
    }

    /** L'étiquette accessible d'une ligne : la relation, puis chaque état avec ses numéros, son ratio et son résultat. */
    function etiquette(association: Association, promesses: readonly Promesse[]): Texte {
      const second = association.second === 'fond' ? TEXTES_DES_GARANTIES.fond : association.second;
      const etats = promesses.map((promesse) => i18n.composer`${NOM_DE_L_ETAT[etatDeLaPaire(promesse.paire)]}, ${numeroDuMembre(promesse, 'premier')} ${TEXTES_DES_GARANTIES.sur} ${numeroDuMembre(promesse, 'second')}, ${contrasteEcrit(promesse.contraste)}, ${promesse.verdict === 'tenue' ? '✓' : '✗'}, ${niveauEcrit(promesse.contraste, jugementDuSeuil(promesse.paire.seuil)).etiquette}`);
      return i18n.composer`${association.premier} ${TEXTES_DES_GARANTIES.sur} ${second}. ${i18n.joindre(etats, ' ; ')}`;
    }

    function ligneDAssociation(association: Association, promesses: readonly Promesse[], fond: Rgb8): HTMLElement[] {
      const cle = cleDeLAssociation(association);
      const ligne = document.createElement('div');
      ligne.className = 'garantie';
      ligne.setAttribute('role', 'button');
      ligne.tabIndex = 0;
      ligne.dataset.association = cle;
      ligne.setAttribute('aria-pressed', String(cle === choisie));
      i18n.lier(ligne, 'aria-label', etiquette(association, promesses));
      const choisir = () => {
        choisie = cle;
        rendre();
        liste.querySelector<HTMLElement>(`[data-association="${cle}"]`)?.focus();
      };
      ligne.addEventListener('click', choisir);
      ligne.addEventListener('keydown', (evenement) => {
        if (evenement.key !== 'Enter' && evenement.key !== ' ') return;
        evenement.preventDefault();
        choisir();
      });

      const qui = document.createElement('div');
      qui.className = 'garantie-qui';
      const relation = document.createElement('p');
      relation.append(code(association.premier), i18n.noeud(i18n.composer` ${TEXTES_DES_GARANTIES.sur} `));
      relation.append(association.second === 'fond' ? i18n.noeud(TEXTES_DES_GARANTIES.fond) : code(association.second));
      const francais = i18n.composer`${NOM_DU_ROLE[association.premier]} ${TEXTES_DES_GARANTIES.sur} ${association.second === 'fond' ? TEXTES_DES_GARANTIES.fond : NOM_DU_ROLE[association.second]}`;
      qui.append(relation, paragraphe(francais, 'ligne-secondaire'));
      if (association.premier === 'on-solid') qui.append(paragraphe(TEXTES_DES_GARANTIES.onSolid, 'ligne-secondaire'));
      ligne.append(qui, ...promesses.map((promesse) => etatDeLaGarantie(promesse, fond)));

      const echecs = promesses.filter((promesse) => promesse.verdict === 'manquee');
      if (echecs.length === 0) return [ligne];
      const echec = document.createElement('div');
      echec.className = 'garantie-echec';
      for (const promesse of echecs) echec.append(paragraphe(TEXTES_DES_GARANTIES.echec(etatDeLaPaire(promesse.paire), promesse.contraste, promesse.seuil)));
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
      return [ligne, echec];
    }

    function rendre(): void {
      if (!entrees) return;
      const { recette, analyse, mode } = entrees;
      const autre: Mode = MODES.find((candidat) => candidat !== mode) ?? mode;
      const parProfil = (duProfil: Intensite, dansLeMode: Mode) => manquees(promessesDe(analyse, dansLeMode, duProfil));
      carte.poserResume(mode === 'light' ? TEXTES.modeClair : TEXTES.modeSombre);
      // Une palette à une intensité n'a pas de profil à choisir : la bascule se retire ([ENT-14]).
      choixDuProfil.cacher(analyse.intensites.length === 1);
      choixDuProfil.poser(profil === 'unique' ? null : profil, null, (valeur) => {
        if (valeur === 'deux') return undefined;
        const manquees = parProfil(valeur, mode);
        return { texte: resultatDuProfil(valeur, manquees), nom: resultatDuProfilEnMots(valeur, manquees), verdict: manquees === 0 ? 'tenue' : 'manquee' };
      });

      const promesses = promessesDe(analyse, mode, profil);
      const fond = lireHexa(recette.fonds[mode]) ?? [255, 255, 255];
      const deLAssociation = (association: Association) => promesses
        .filter((promesse) => cleDeLAssociation(associationDe(promesse.paire)) === cleDeLAssociation(association))
        .sort((a, b) => etatDeLaPaire(a.paire) - etatDeLaPaire(b.paire));
      dessinerLaReglette(recette, analyse, mode, promesses.filter((promesse) => cleDeLAssociation(associationDe(promesse.paire)) === choisie));

      const groupes = [
        { seuil: 'texte' as const, titre: TEXTES_DES_GARANTIES.textes, minimum: recette.seuils.texte },
        { seuil: 'nonTexte' as const, titre: TEXTES_DES_GARANTIES.visibles, minimum: recette.seuils.nonTexte },
      ];
      const lignes: HTMLElement[] = [];
      for (const groupe of groupes) {
        const bloc = document.createElement('section');
        bloc.className = 'garanties-bloc';
        i18n.lier(bloc, 'aria-label', groupe.titre);
        const tete = document.createElement('div');
        tete.className = 'garanties-bloc-tete';
        const minimum = document.createElement('span');
        minimum.className = 'ligne-secondaire';
        i18n.lier(minimum, 'textContent', TEXTES_DES_GARANTIES.minimum(groupe.minimum));
        tete.append(i18n.noeud(groupe.titre), minimum);
        // Les états, nommés une fois en tête de leur colonne ; chaque ligne les redit à l'assistance technique.
        const colonnes = document.createElement('div');
        colonnes.className = 'garanties-colonnes';
        colonnes.setAttribute('aria-hidden', 'true');
        colonnes.append(document.createElement('span'), ...RANGS.map((_, rang) => {
          const etat = rang as EtatDePaire;
          const nom = i18n.noeud(NOM_DE_L_ETAT[etat]);
          nom.dataset.rang = String(etat);
          return nom;
        }));
        bloc.append(tete, colonnes);
        for (const association of ASSOCIATIONS) {
          const ici = deLAssociation(association);
          if (ici.length === 0 || ici[0].paire.seuil !== groupe.seuil) continue;
          bloc.append(...ligneDAssociation(association, ici, fond));
        }
        lignes.push(bloc);
      }
      const decoratif = document.createElement('p');
      decoratif.className = 'garantie-decorative';
      decoratif.append(code('border-decorative'), i18n.noeud(i18n.composer` ${TEXTES_DES_GARANTIES.decoratif(TABLE_DES_EMPLOIS['border-decorative'])}`));
      lignes.push(decoratif);
      liste.replaceChildren(...lignes);

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
        // Une autre palette, ou une intensité qu'elle ne porte plus : son intensité porteuse, et sa première garantie en échec, sinon text sur surface.
        if (suivantes.palette.id !== palette || !suivantes.analyse.intensites.includes(profil)) {
          palette = suivantes.palette.id;
          profil = suivantes.analyse.ancrage.profil;
          const enEchec = promessesDe(suivantes.analyse, suivantes.mode, profil).find((promesse) => promesse.verdict === 'manquee');
          choisie = enEchec ? cleDeLAssociation(associationDe(enEchec.paire)) : 'text/surface';
        }
        entrees = suivantes;
        rendre();
      },
      choisir(association) {
        choisie = cleDeLAssociation(association);
        rendre();
        liste.querySelector<HTMLElement>(`[data-association="${choisie}"]`)?.scrollIntoView({ block: 'nearest' });
      },
    };
  }
  return { createGaranties };
}

export const creerVuesGaranties = memoriserVues(construireVues);

/**
 * La carte « Roue des teintes » d'Harmonisation ([UI-43]) : un point par
 * palette colorée sur un cercle, à la teinte OKLCH de son cran 700 dans
 * l'intensité et le thème de l'aperçu. Glisser un point règle la teinte de sa
 * palette : le point passe dans « Régler », la palette se coche si elle ne
 * l'est pas, et la teinte suit le pointeur par `candidatDeTeinte`, dans la
 * course que les garanties tenues permettent. Un point se règle aussi au
 * clavier : flèches de 1°, Maj de 10°. Le point d'une palette figée ne se
 * saisit pas.
 *
 * La palette à régler montre sa course de ±30° et ses zones trop proches
 * (calculées comme celles de la carte « Réglages », au repos : un glisser garde
 * celles de son départ). Un arc ambre couvre les teintes de chaque paire trop
 * proche. La vision choisie repeint les points ; elle ne change ni la recette
 * ni les alertes.
 *
 * Un glisser prévisualise une fois par image au plus, sa fin range, Échap rend
 * la palette d'avant. Les points sont des éléments durables, repositionnés à
 * chaque rendu, pour que le focus du clavier reste sur le point réglé.
 */
import {
  aUneIntensite,
  candidatDeTeinte,
  CHROMA_DES_PALETTES_COLOREES,
  ecartAngulaire,
  estFigee,
  grilleDe,
  referenceDe,
  rgb8VersOklch,
  lireHexa,
  ecrireHexa,
  type Mode,
  type Palette,
  type PaireTropProche,
  type Profil,
  type Recette,
  type Refus,
} from 'ucm-couleur';

import { CENTRE_DE_LA_ROUE, HAUTEUR_DE_LA_ROUE, LARGEUR_DE_LA_ROUE, RAYON_DE_LA_ROUE, RAYON_DES_FAMILLES, arcDeLaPaire, arcDeLaRoue, palettesNommees, pointDeLaRoue, poserLesNoms, teinteDuPointeur, type PointDeLaRoue } from '../../roueDesTeintes';
import { FAMILLES_DE_TEINTE } from '../../familles';
import type { EtatHarmonisation } from '../../harmonisation';
import { CURSEURS, valeursDesProfils } from '../../reglagesParDefaut';
import { simulerLaVision, VISIONS, type Vision } from '../../vision';
import { createCarte } from '../carte';
import { outilsDesGrandeurs } from '../grandeursDuReglage';
import { memoriserVues, type Localisation, type Texte } from '../localisation';
import { couleurDuRole, ENCRE_D_APERCU, nuancesVues } from './apercu';
import { creerVuesCourseEtZones, type CourseEtZones } from './courseEtZones';
import { creerPrevisualisationParImage } from './previsualisationParImage';

export interface GestesDeLaCarteDeLaRoue {
  /** Le designer saisit le point d'une palette : l'onglet la met dans `regler` et la coche. Rend faux quand il n'y a pas de place pour la cocher. */
  saisir(id: string): boolean;
  choisirLaVision(vision: Vision): void;
  /** La carte s'ouvre ou se replie. */
  basculer(ouverte: boolean): void;
  /** Un glisser : l'onglet montre la palette, sans la ranger. */
  previsualiser(palette: Palette): void;
  /** La fin d'un geste : l'onglet range la palette. Rend le refus qui l'en empêche. */
  valider(palette: Palette): Refus | null;
  /** Échap : l'onglet rend la palette d'avant le geste. */
  abandonner(): void;
}

export interface CarteDeLaRoueUi {
  readonly element: HTMLElement;
  /**
   * Repeint la carte : appelé à chaque rendu de l'onglet, et à chaque image d'un
   * glisser. `enGeste` dit qu'un glisser de l'onglet est en cours, sur cette
   * carte ou sur la carte « Réglages ».
   */
  afficher(recette: Recette, paires: readonly PaireTropProche[], etat: EtatHarmonisation, enGeste: boolean): void;
}

const SVG = 'http://www.w3.org/2000/svg';

/** Le numéro de nuance dont la teinte place le point ; une grille qui ne le porte pas prend le numéro le plus proche. */
const CRAN_DU_POINT = 700;

/** Les couleurs de la plaque, par thème : le trait du cercle, le nom des familles, l'ambre des paires trop proches. */
const CERCLE: Readonly<Record<Mode, string>> = { light: '#D9D9D9', dark: '#3A3A3A' };
const FAMILLES: Readonly<Record<Mode, string>> = { light: '#9A9A9A', dark: '#7A7A7A' };
const AMBRE: Readonly<Record<Mode, string>> = { light: '#C77A00', dark: '#F3B53F' };

/** Les flèches vers les degrés croissants (+1) et décroissants (−1). */
const SENS_DES_FLECHES: Readonly<Record<string, 1 | -1>> = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 };
/** Le pas d'un point au clavier, et celui de Maj. */
const PAS_DU_POINT = 1;
const GRAND_PAS_DU_POINT = 10;

function noeud<K extends keyof SVGElementTagNameMap>(nom: K, attributs: Readonly<Record<string, string | number>> = {}): SVGElementTagNameMap[K] {
  const element = document.createElementNS(SVG, nom);
  poser(element, attributs);
  return element;
}

function poser(element: Element, attributs: Readonly<Record<string, string | number>>): void {
  for (const [cle, valeur] of Object.entries(attributs)) element.setAttribute(cle, String(valeur));
}

/** Un point de la roue : la palette, sa teinte, sa place et sa couleur dans la vision choisie. */
interface PointCalcule {
  readonly palette: Palette;
  readonly teinte: number;
  readonly position: PointDeLaRoue;
  readonly couleur: string;
}

/** Un glisser en cours. */
interface Glisser {
  readonly palette: Palette;
  readonly pointeur: number;
  /** La teinte du point au départ du glisser : l'écart de teinte se mesure depuis elle. */
  readonly teinteAuDepart: number;
  readonly course: CourseEtZones['course'];
  /** Vrai dès que le pointeur a demandé un écart autre que celui du départ. */
  deplace: boolean;
  /** Le dernier écart demandé, de zéro au départ. */
  ecart: number;
}

function construireVues(i18n: Localisation) {
  const { calculerLaCourseEtLesZones } = creerVuesCourseEtZones(i18n);
  const { ecrire } = outilsDesGrandeurs(i18n);
  const { TEXTES_DE_L_HARMONISATION: { roue: TEXTES }, TEXTES_DES_REGLAGES, nomDeLaPalette, texteDuRefus } = i18n.messages;

  /** Une palette sur la roue : colorée, comme celles que les paires comparent. Une palette libre y paraît comme les autres. */
  const estSurLaRoue = (palette: Palette): boolean => rgb8VersOklch(referenceDe(palette)).C > CHROMA_DES_PALETTES_COLOREES;

  /** Le rang du numéro le plus proche de 700 dans la grille de la palette. */
  function rangDuPoint(recette: Recette, palette: Palette): number {
    const { crans } = grilleDe(recette, palette);
    return crans.reduce((meilleur, cran, rang) => (Math.abs(cran - CRAN_DU_POINT) < Math.abs(crans[meilleur] - CRAN_DU_POINT) ? rang : meilleur), 0);
  }

  function createCarteDeLaRoue(gestes: GestesDeLaCarteDeLaRoue): CarteDeLaRoueUi {
    const carte = createCarte({ titre: TEXTES.titre, sousTitre: TEXTES.sousTitre, repliable: { ouverte: false } }, i18n);

    const choix = document.createElement('div');
    choix.className = 'choix-d-affichage';
    const libelle = document.createElement('span');
    libelle.className = 'choix-libelle';
    i18n.lier(libelle, 'textContent', TEXTES.vision);
    const selection = document.createElement('select');
    selection.className = 'input';
    i18n.lier(selection, 'aria-label', TEXTES.nomDeLaVision);
    for (const vision of VISIONS) {
      const option = document.createElement('option');
      option.value = vision;
      i18n.lier(option, 'textContent', TEXTES.visions[vision]);
      selection.append(option);
    }
    selection.addEventListener('change', () => gestes.choisirLaVision(selection.value as Vision));
    choix.append(libelle, selection);
    carte.poserLesChoix({ element: choix });

    const plaque = noeud('svg', { width: LARGEUR_DE_LA_ROUE, height: HAUTEUR_DE_LA_ROUE, viewBox: `0 0 ${LARGEUR_DE_LA_ROUE} ${HAUTEUR_DE_LA_ROUE}`, role: 'group' });
    plaque.setAttribute('class', 'roue plaque');
    i18n.lier(plaque, 'aria-label', TEXTES.titre);
    const cercle = noeud('circle', { cx: CENTRE_DE_LA_ROUE.x, cy: CENTRE_DE_LA_ROUE.y, r: RAYON_DE_LA_ROUE, fill: 'none' });
    const noms = FAMILLES_DE_TEINTE.map(({ famille, centre }) => {
      const { x, y } = pointDeLaRoue(centre, RAYON_DES_FAMILLES);
      const texte = noeud('text', { x, y: y + 3, 'text-anchor': 'middle' });
      texte.setAttribute('class', 'roue-famille');
      i18n.lier(texte, 'textContent', TEXTES_DES_REGLAGES.familles[famille]);
      return texte;
    });
    const couches = { course: noeud('g'), paires: noeud('g'), points: noeud('g'), noms: noeud('g') };
    plaque.append(cercle, ...noms, couches.course, couches.paires, couches.points, couches.noms);

    const erreur = document.createElement('p');
    erreur.className = 'field-error';
    erreur.hidden = true;
    carte.corps.append(plaque, erreur);

    let lue: Recette | null = null;
    let vue: EtatHarmonisation | null = null;
    let pairesLues: readonly PaireTropProche[] = [];
    let enGesteDeLOnglet = false;
    let glisser: Glisser | null = null;
    /** La course et les zones du dernier rendu au repos : un glisser garde celles de son départ. */
    let calcule: CourseEtZones | null = null;
    let calculePour: string | null = null;
    /** Les points, durables : le focus du clavier reste sur celui qu'on règle. */
    const elementsDesPoints = new Map<string, SVGCircleElement>();
    let points: readonly PointCalcule[] = [];
    const apercu = creerPrevisualisationParImage((palette) => gestes.previsualiser(palette));

    function signaler(texte: Texte | null): void {
      i18n.lier(erreur, 'textContent', texte ?? '');
      erreur.hidden = texte === null;
    }

    const profilVu = (palette: Palette, etat: EtatHarmonisation): Profil => (aUneIntensite(palette) ? 'vivid' : etat.intensite);

    /** Les points des palettes colorées, dans l'ordre de la recette. */
    function calculerLesPoints(recette: Recette, etat: EtatHarmonisation): PointCalcule[] {
      return recette.palettes.filter(estSurLaRoue).map((palette) => {
        const nuances = nuancesVues(recette, palette, etat.intensite, etat.mode);
        const teinte = nuances[rangDuPoint(recette, palette)].H;
        const plein = couleurDuRole(recette, palette, 'solid/default', etat.mode, etat.intensite) ?? nuances[rangDuPoint(recette, palette)].hexa;
        const rgb = lireHexa(plein);
        return { palette, teinte, position: pointDeLaRoue(teinte), couleur: rgb ? ecrireHexa(simulerLaVision(rgb, etat.vision)) : plein };
      });
    }

    function autresCochees(recette: Recette, etat: EtatHarmonisation, palette: Palette): Palette[] {
      return etat.cochees.filter((id) => id !== palette.id).flatMap((id) => recette.palettes.find((candidate) => candidate.id === id) ?? []);
    }

    /** La course et les zones de la palette à régler ; un glisser garde celles de son départ. */
    function courseEtZones(recette: Recette, etat: EtatHarmonisation, palette: Palette): CourseEtZones | null {
      if (estFigee(palette)) return null;
      if (glisser || enGesteDeLOnglet) return calculePour === palette.id ? calcule : null;
      const profil = profilVu(palette, etat);
      calcule = calculerLaCourseEtLesZones(recette, palette, autresCochees(recette, etat, palette), profil, valeursDesProfils(recette, palette)[profil].teinte);
      calculePour = palette.id;
      return calcule;
    }

    function dessinerLaCourse(recette: Recette, etat: EtatHarmonisation, encre: string, ambre: string): void {
      couches.course.replaceChildren();
      const palette = recette.palettes.find(({ id }) => id === etat.regler);
      const point = points.find((candidat) => candidat.palette.id === palette?.id);
      if (!palette || !point) return;
      const resultat = courseEtZones(recette, etat, palette);
      if (!resultat) return;
      const t = valeursDesProfils(recette, palette)[profilVu(palette, etat)].teinte;
      const borne = CURSEURS.teinte.max;
      couches.course.append(noeud('path', { d: arcDeLaRoue(point.teinte - (t + borne), point.teinte + (borne - t)), fill: 'none', stroke: encre, 'stroke-width': 12, opacity: 0.12 }));
      for (const { debut, fin } of resultat.zones) {
        const de = point.teinte + (Math.max(-borne, debut - 0.5) - t);
        const a = point.teinte + (Math.min(borne, fin + 0.5) - t);
        couches.course.append(noeud('path', { d: arcDeLaRoue(de, a), fill: 'none', stroke: ambre, 'stroke-width': 12, opacity: 0.9, 'stroke-dasharray': '2 2' }));
      }
    }

    function dessinerLesPaires(ambre: string): Set<string> {
      couches.paires.replaceChildren();
      const enPaire = new Set<string>();
      for (const paire of pairesLues) {
        const [a, b] = paire.palettes.map((id) => points.find((point) => point.palette.id === id));
        if (!a || !b) continue;
        paire.palettes.forEach((id) => enPaire.add(id));
        const arc = noeud('path', { d: arcDeLaPaire(a.teinte, b.teinte), fill: 'none', stroke: ambre, 'stroke-width': 10, 'stroke-linecap': 'round', opacity: 0.5 });
        const titre = noeud('title');
        i18n.lier(titre, 'textContent', TEXTES.paireTropProche(nomDeLaPalette(a.palette), nomDeLaPalette(b.palette)));
        arc.append(titre);
        couches.paires.append(arc);
      }
      return enPaire;
    }

    /** Le point durable d'une palette ; son clavier et son pointeur sont posés une fois. */
    function elementDuPoint(id: string): SVGCircleElement {
      let element = elementsDesPoints.get(id);
      if (element) return element;
      element = noeud('circle', { role: 'slider', 'data-palette': id, 'aria-valuemin': -CURSEURS.teinte.max, 'aria-valuemax': CURSEURS.teinte.max });
      element.setAttribute('class', 'roue-point');
      element.append(noeud('title'));
      element.addEventListener('pointerdown', (evenement) => commencerLeGlisser(id, evenement));
      element.addEventListener('keydown', (evenement) => toucherLePoint(id, evenement));
      elementsDesPoints.set(id, element);
      return element;
    }

    function dessinerLesPoints(recette: Recette, etat: EtatHarmonisation, encre: string, ambre: string, fond: string, enPaire: ReadonlySet<string>): void {
      const presents = new Set(points.map(({ palette }) => palette.id));
      for (const [id, element] of elementsDesPoints) {
        if (presents.has(id)) continue;
        element.remove();
        elementsDesPoints.delete(id);
      }
      points.forEach(({ palette, position, couleur }, rang) => {
        const element = elementDuPoint(palette.id);
        const cochee = etat.cochees.includes(palette.id);
        const nom = nomDeLaPalette(palette);
        const teinte = valeursDesProfils(recette, palette)[profilVu(palette, etat)].teinte;
        const figee = estFigee(palette);
        poser(element, {
          cx: position.x,
          cy: position.y,
          r: cochee ? 7 : 5,
          fill: couleur,
          stroke: enPaire.has(palette.id) ? ambre : cochee ? encre : fond,
          'stroke-width': cochee || enPaire.has(palette.id) ? 2 : 1,
          'aria-valuenow': teinte,
          'aria-disabled': String(figee),
          tabindex: figee ? -1 : 0,
        });
        i18n.lier(element, 'aria-label', TEXTES.nomDuPoint(nom));
        i18n.lier(element, 'aria-valuetext', ecrire('teinte', teinte));
        element.firstElementChild!.textContent = nom;
        if (couches.points.children[rang] !== element) couches.points.insertBefore(element, couches.points.children[rang] ?? null);
      });
    }

    function dessinerLesNoms(etat: EtatHarmonisation, encre: string, ambre: string, enPaire: ReadonlySet<string>): void {
      const nommees = palettesNommees(points.map(({ palette }) => palette.id), etat.cochees, enPaire);
      const aNommer = points.filter(({ palette }) => nommees.has(palette.id));
      const places = poserLesNoms(aNommer.map(({ position }) => position));
      couches.noms.replaceChildren(...aNommer.map(({ palette }, rang) => {
        const { x, y, ancre } = places[rang];
        const texte = noeud('text', { x, y, 'text-anchor': ancre, fill: enPaire.has(palette.id) ? ambre : encre });
        texte.textContent = nomDeLaPalette(palette);
        return texte;
      }));
    }

    function dessiner(recette: Recette, etat: EtatHarmonisation): void {
      const { mode } = etat;
      const [encre, ambre, fond] = [ENCRE_D_APERCU[mode], AMBRE[mode], recette.fonds[mode]];
      plaque.style.background = fond;
      cercle.setAttribute('stroke', CERCLE[mode]);
      for (const nom of noms) nom.setAttribute('fill', FAMILLES[mode]);
      points = calculerLesPoints(recette, etat);
      dessinerLaCourse(recette, etat, encre, ambre);
      const enPaire = dessinerLesPaires(ambre);
      dessinerLesPoints(recette, etat, encre, ambre, fond, enPaire);
      dessinerLesNoms(etat, encre, ambre, enPaire);
    }

    /** L'ouverture de la carte suit l'état de l'onglet sans le lui renvoyer. */
    let synchronisation = false;
    carte.surBascule((ouverte) => {
      if (!synchronisation) gestes.basculer(ouverte);
    });
    function accorderLOuverture(ouverte: boolean): void {
      if (carte.estOuverte() === ouverte) return;
      synchronisation = true;
      if (ouverte) carte.ouvrir();
      else carte.replier();
      synchronisation = false;
    }

    /** L'écart de teinte, entier, que le pointeur demande, borné par la course. */
    function ecartVise(en: Glisser, evenement: PointerEvent): number {
      const cadre = plaque.getBoundingClientRect();
      const [echelleX, echelleY] = [cadre.width / LARGEUR_DE_LA_ROUE, cadre.height / HAUTEUR_DE_LA_ROUE];
      const dx = evenement.clientX - (cadre.left + CENTRE_DE_LA_ROUE.x * echelleX);
      const dy = evenement.clientY - (cadre.top + CENTRE_DE_LA_ROUE.y * echelleY);
      const ecart = Math.round(ecartAngulaire(en.teinteAuDepart, teinteDuPointeur(dx, dy)));
      return Math.min(en.course.haut, Math.max(en.course.bas, ecart));
    }

    function arreterLeGlisser(): void {
      window.removeEventListener('pointermove', bouger, true);
      window.removeEventListener('pointerup', relacher, true);
      window.removeEventListener('pointercancel', relacher, true);
    }

    function bouger(evenement: PointerEvent): void {
      if (!glisser || !lue || glisser.pointeur !== evenement.pointerId) return;
      const ecart = ecartVise(glisser, evenement);
      if (ecart === glisser.ecart) return;
      glisser.deplace = true;
      glisser.ecart = ecart;
      apercu.proposer(candidatDeTeinte(lue, glisser.palette, ecart));
    }

    function relacher(evenement: PointerEvent): void {
      const fin = glisser;
      if (!fin || !lue || fin.pointeur !== evenement.pointerId) return;
      arreterLeGlisser();
      apercu.annuler();
      glisser = null;
      if (!fin.deplace) return;
      // Revenu à la teinte du départ : rien à ranger, la palette d'avant revient.
      if (fin.ecart === 0) gestes.abandonner();
      else signaler(avecLeRefus(gestes.valider(candidatDeTeinte(lue, fin.palette, fin.ecart))));
    }

    const avecLeRefus = (refus: Refus | null): Texte | null => (refus ? texteDuRefus(refus) : null);

    function abandonnerLeGlisser(): void {
      arreterLeGlisser();
      apercu.annuler();
      glisser = null;
      gestes.abandonner();
    }

    /** La palette du point saisi, à régler et cochée, avec la course de son écart commun ; `null` quand le point ne se saisit pas. */
    function saisirLaPalette(id: string): { palette: Palette; course: CourseEtZones['course'] } | null {
      const palette = lue?.palettes.find((candidate) => candidate.id === id);
      if (!palette || estFigee(palette) || !gestes.saisir(id) || !lue || !vue) return null;
      const profil = profilVu(palette, vue);
      const { course } = calculerLaCourseEtLesZones(lue, palette, autresCochees(lue, vue, palette), profil, valeursDesProfils(lue, palette)[profil].teinte);
      return { palette, course };
    }

    function commencerLeGlisser(id: string, evenement: PointerEvent): void {
      if (evenement.button !== 0 || glisser) return;
      const element = elementsDesPoints.get(id);
      if (!element || element.getAttribute('aria-disabled') === 'true') return;
      evenement.preventDefault();
      element.focus({ preventScroll: true });
      const saisie = saisirLaPalette(id);
      const point = points.find(({ palette }) => palette.id === id);
      if (!saisie || !point) return;
      signaler(null);
      glisser = { palette: saisie.palette, pointeur: evenement.pointerId, teinteAuDepart: point.teinte, course: saisie.course, deplace: false, ecart: 0 };
      element.setPointerCapture(evenement.pointerId);
      window.addEventListener('pointermove', bouger, true);
      window.addEventListener('pointerup', relacher, true);
      window.addEventListener('pointercancel', relacher, true);
    }

    function toucherLePoint(id: string, evenement: KeyboardEvent): void {
      if (evenement.key === 'Escape') {
        if (!glisser) return;
        evenement.preventDefault();
        abandonnerLeGlisser();
        return;
      }
      const sens = SENS_DES_FLECHES[evenement.key];
      if (sens === undefined || glisser) return;
      const element = elementsDesPoints.get(id);
      if (!element || element.getAttribute('aria-disabled') === 'true') return;
      evenement.preventDefault();
      const saisie = saisirLaPalette(id);
      if (!saisie || !lue) return;
      const demande = sens * (evenement.shiftKey ? GRAND_PAS_DU_POINT : PAS_DU_POINT);
      const ecart = Math.min(saisie.course.haut, Math.max(saisie.course.bas, demande));
      if (ecart === 0) return;
      signaler(avecLeRefus(gestes.valider(candidatDeTeinte(lue, saisie.palette, ecart))));
    }

    return {
      element: carte.element,
      afficher(recette, paires, etat, enGeste) {
        lue = recette;
        vue = etat;
        pairesLues = paires;
        enGesteDeLOnglet = enGeste;
        selection.value = etat.vision;
        carte.poserResume(TEXTES.resume(etat.vision));
        accorderLOuverture(etat.roue);
        if (carte.estOuverte()) dessiner(recette, etat);
      },
    };
  }
  return { createCarteDeLaRoue };
}

export const creerVuesCarteDeLaRoue = memoriserVues(construireVues);

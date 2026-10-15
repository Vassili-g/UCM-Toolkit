/**
 * La carte « Réglages » d'Harmonisation ([UI-42]) : les trois réglettes de
 * Création (teinte, saturation, luminosité) pour la palette que « Régler »
 * désigne, dans l'intensité vue. La teinte décale les deux intensités du même
 * écart (`candidatDeTeinte`) ; la saturation et la luminosité ne touchent que
 * l'intensité vue, par les gestes de Création. Sur la piste de teinte, une
 * zone hachurée couvre les valeurs trop proches de chaque autre palette
 * cochée, et la course que les garanties tenues permettent borne la piste.
 * Sur les deux autres, un point marque la valeur de chaque autre palette.
 *
 * Un glisser prévisualise une fois par image au plus, sa fin range, Échap
 * rend la palette d'avant. La course et les zones se calculent au repos : un
 * glisser garde celles de son départ. « Annuler les modifications » rend à la
 * palette choisie les réglages de son départ dans l'onglet, à elle seule.
 * Une palette figée ne se règle pas : la carte le dit à la place des réglettes.
 */
import {
  aUneIntensite,
  balayerLaLimite,
  candidatDeTeinte,
  estFigee,
  estPaletteGrise,
  grilleDe,
  pivotDe,
  type Limite,
  type Palette,
  type Profil,
  type Recette,
  type Refus,
} from 'ucm-couleur';

import { reglerClarte, reglerSaturation, retablirLaSaturation } from '../../edition';
import { modifieeDepuisLeDepart, type EtatHarmonisation } from '../../harmonisation';
import { CURSEURS, GRANDEURS, estModifiee, valeursDesProfils, valeursParDefaut, type Grandeur } from '../../reglagesParDefaut';
import { createCalculsDeLimites } from '../calculDesLimites';
import { createCarte } from '../carte';
import { creerVuesChoix, type ChoixUi } from '../choix';
import { outilsDesGrandeurs, peindreLaGrandeur } from '../grandeursDuReglage';
import { creerVuesReglette, type Intervalle, type MarqueDePalette, type RegletteUi } from '../derive/reglette';
import { memoriserVues, lireTexte, type Localisation, type Texte } from '../localisation';
import { creerSocleLocalise } from '../socleLocalise';
import { nuancesVues } from './apercu';
import { creerVuesCourseEtZones, type CourseEtZones } from './courseEtZones';
import { creerPrevisualisationParImage } from './previsualisationParImage';

export interface GestesDeLaCarteDesReglages {
  /** Le designer choisit la palette que les réglettes règlent. */
  choisir(id: string): void;
  /** Un glisser ou une saisie : l'onglet montre la palette, sans la ranger. */
  previsualiser(palette: Palette): void;
  /** La fin d'un geste : l'onglet range la palette. Rend le refus qui l'en empêche. */
  valider(palette: Palette): Refus | null;
  /** Échap : l'onglet rend la palette d'avant le geste. */
  abandonner(): void;
  /** « Annuler les modifications » : l'onglet rend à la palette choisie son départ. Rend le refus qui l'en empêche. */
  annulerLesModifications(): Refus | null;
}

export interface CarteDesReglagesUi {
  readonly element: HTMLElement;
  /**
   * Repeint la carte : appelé à chaque rendu de l'onglet, et à chaque image d'un
   * glisser. `enGeste` dit qu'un glisser de l'onglet est en cours, sur cette
   * carte ou sur la roue : la course et les zones gardent alors celles de son départ.
   */
  afficher(recette: Recette, etat: EtatHarmonisation, enGeste: boolean): void;
}

interface Rangee {
  readonly grandeur: Grandeur;
  readonly reglette: RegletteUi;
  readonly absolu: HTMLSpanElement;
}

/** Le cran dont la couleur représente une palette sur la piste d'une autre. */
const CRAN_DU_POINT = 600;

function construireVues(i18n: Localisation) {
  const { createChoix } = creerVuesChoix(i18n);
  const { createReglette } = creerVuesReglette(i18n);
  const { calculerLaCourseEtLesZones } = creerVuesCourseEtZones(i18n);
  const { createButton } = creerSocleLocalise(i18n);
  const {
    NOM_DU_PROFIL, TEXTES_DES_REGLAGES, TEXTES_DE_L_HARMONISATION: { liste, reglages: TEXTES },
    nombreInvalide, nomDeLaPalette, plageSureDuReglage, texteDuRefus,
  } = i18n.messages;

  const { ecrire, lire, boutsDe } = outilsDesGrandeurs(i18n);

  function createCarteDesReglages(gestes: GestesDeLaCarteDesReglages): CarteDesReglagesUi {
    const carte = createCarte({ titre: TEXTES.titre, sousTitre: TEXTES.sousTitre, repliable: { ouverte: true } }, i18n);
    const corps = document.createElement('div');
    corps.className = 'reglages-de-la-palette reglages-harmonie';

    const tete = document.createElement('div');
    tete.className = 'tete-des-reglages';
    const boutonAnnuler = createButton({
      label: TEXTES.annuler,
      variant: 'secondary',
      compact: true,
      onClick() {
        signalerLeRefus(gestes.annulerLesModifications());
        // Le bouton se cache avec la modification : le focus revient à la première réglette.
        if (tete.hidden) rangees[0].reglette.curseur.focus();
      },
    });
    tete.append(boutonAnnuler);

    const figee = document.createElement('p');
    figee.className = 'ligne-secondaire';
    i18n.lier(figee, 'textContent', TEXTES.figee);

    let lue: Recette | null = null;
    let vue: EtatHarmonisation | null = null;
    /** Un glisser de l'onglet est en cours, sur cette carte ou sur la roue. */
    let enGesteDeLOnglet = false;
    let courante: Palette | null = null;
    /** La palette d'avant le geste en cours : toutes les valeurs du geste se mesurent depuis elle. */
    let avantLeGeste: Palette | null = null;
    const apercu = creerPrevisualisationParImage((palette) => gestes.previsualiser(palette));
    let calcule: CourseEtZones | null = null;
    let limites: Record<Grandeur, Limite | null> = { teinte: null, saturation: null, luminosite: null };
    let cleDesLimites: string | null = null;
    const calculs = createCalculsDeLimites(() => {
      if (corps.offsetParent !== null) rendre();
    });

    const profilVu = (palette: Palette, etat: EtatHarmonisation): Profil => (aUneIntensite(palette) ? 'vivid' : etat.intensite);

    /** La palette `base` réglée à `valeur` : la teinte décale les deux intensités, les deux autres grandeurs visent l'intensité vue. */
    function avecLaValeur(grandeur: Grandeur, valeur: number, recette: Recette, base: Palette, etat: EtatHarmonisation): Palette {
      const profil = profilVu(base, etat);
      if (grandeur === 'teinte') return candidatDeTeinte(recette, base, valeur - valeursDesProfils(recette, base)[profil].teinte);
      return (grandeur === 'saturation' ? reglerSaturation : reglerClarte)(recette, base, profil, valeur);
    }

    const rangees: Rangee[] = GRANDEURS.map((grandeur) => {
      const absolu = document.createElement('span');
      absolu.className = 'ligne-secondaire absolu-du-reglage';
      const reglette = createReglette(TEXTES_DES_REGLAGES.grandeurs[grandeur], {
        commencer() {
          const termine = calculs.terminer();
          if (!avantLeGeste) avantLeGeste = courante;
          // La réglette relit ses bornes permises avant de borner le geste.
          if (termine) rendre();
        },
        previsualiser: (valeur) => prevoir(grandeur, valeur),
        valider: (valeur) => terminer(grandeur, valeur),
        annuler: abandonner,
        retablir: () => remettreParDefaut(grandeur),
        lire(saisie) {
          const valeur = lire(grandeur, saisie);
          if (valeur === null) signaler(nombreInvalide(saisie));
          return valeur;
        },
        buter() {},
      }, grandeur === 'teinte' ? absolu : undefined);
      reglette.element.classList.add('reglage-de-la-palette');
      return { grandeur, reglette, absolu };
    });

    const erreur = document.createElement('p');
    erreur.className = 'field-error';
    erreur.hidden = true;
    corps.append(tete, figee, ...rangees.map(({ reglette }) => reglette.element), erreur);
    carte.corps.append(corps);
    carte.surBascule(() => rendre());

    function signaler(texte: Texte | null): void {
      i18n.lier(erreur, 'textContent', texte ?? '');
      erreur.hidden = texte === null;
    }

    const signalerLeRefus = (refus: Refus | null): void => signaler(refus ? texteDuRefus(refus) : null);

    function prevoir(grandeur: Grandeur, valeur: number): void {
      if (!courante || !lue || !vue) return;
      if (!avantLeGeste) avantLeGeste = courante;
      apercu.proposer(avecLaValeur(grandeur, valeur, lue, avantLeGeste, vue));
    }

    function valider(suivante: Palette): void {
      apercu.annuler();
      avantLeGeste = null;
      signalerLeRefus(gestes.valider(suivante));
    }

    function terminer(grandeur: Grandeur, valeur: number): void {
      // Le geste part de la palette d'avant lui : la prévisualisation l'a déjà remplacée dans l'onglet.
      const base = avantLeGeste ?? courante;
      if (base && lue && vue) valider(avecLaValeur(grandeur, valeur, lue, base, vue));
    }

    function abandonner(): void {
      apercu.annuler();
      avantLeGeste = null;
      gestes.abandonner();
    }

    /** « Par défaut » d'une réglette ou un double-clic : la grandeur reprend sa valeur par défaut. */
    function remettreParDefaut(grandeur: Grandeur): void {
      if (!lue || !courante || !vue) return;
      calculs.terminer();
      const profil = profilVu(courante, vue);
      valider(grandeur === 'saturation'
        ? retablirLaSaturation(lue, courante, profil)
        : avecLaValeur(grandeur, 0, lue, courante, vue));
    }

    /**
     * La course de la teinte et ses zones trop proches, pour la palette, les
     * autres cochées et l'intensité vue. Un glisser garde celles de son départ ;
     * une carte repliée ne calcule rien.
     */
    function courseEtZones(recette: Recette, palette: Palette, autres: readonly Palette[], profil: Profil, valeurTeinte: number): CourseEtZones | null {
      if (avantLeGeste || enGesteDeLOnglet) return calcule;
      if (!carte.estOuverte()) return null;
      calcule = calculerLaCourseEtLesZones(recette, palette, autres, profil, valeurTeinte);
      return calcule;
    }

    /** Lance le calcul des limites de la saturation et de la luminosité quand l'état jugé a changé, carte ouverte, hors d'un geste. */
    function lancerLesLimites(recette: Recette, palette: Palette, valeurs: Record<Grandeur, number>, etat: EtatHarmonisation): void {
      if (!carte.estOuverte() || avantLeGeste || enGesteDeLOnglet) return;
      const cle = JSON.stringify([{ ...recette, palettes: [] }, palette, profilVu(palette, etat)]);
      if (cleDesLimites === cle) return;
      cleDesLimites = cle;
      limites = { teinte: null, saturation: null, luminosite: null };
      for (const grandeur of ['saturation', 'luminosite'] as const) {
        const { min, max, pas } = CURSEURS[grandeur];
        calculs.lancer(grandeur, balayerLaLimite({
          recette,
          palette,
          candidate: (valeur) => avecLaValeur(grandeur, valeur, recette, palette, etat),
          valeur: valeurs[grandeur],
          bornes: { bas: min, haut: max },
          pas,
          ordre: grandeur === 'luminosite',
        }), (limite) => {
          limites[grandeur] = limite;
        });
      }
    }

    // La bascule « Régler » refait ses segments quand les palettes cochées ou leurs noms changent.
    let cleDuChoix = '';
    let choix: ChoixUi<string> | null = null;
    let emplacement: HTMLElement | null = null;
    function poserLeChoix(recette: Recette, cochees: readonly Palette[], etat: EtatHarmonisation): void {
      const cle = cochees.map((palette) => `${palette.id} ${nomDeLaPalette(palette)}`).join('\n');
      if (cle !== cleDuChoix || !choix) {
        cleDuChoix = cle;
        choix = createChoix<string>({
          libelle: TEXTES_DES_REGLAGES.regler,
          nom: TEXTES.palette,
          options: cochees.map((palette) => ({ valeur: palette.id, texte: nomDeLaPalette(palette) })),
          surChoix: (id) => gestes.choisir(id),
        });
        if (emplacement) emplacement.replaceChildren(choix.element);
        else {
          carte.poserLesChoix(choix);
          emplacement = choix.element.parentElement;
        }
      }
      choix.poser(etat.regler);
      // Une pastille suit le nom de chaque palette modifiée depuis l'entrée dans l'onglet.
      const segments = choix.element.querySelectorAll('.bascule-option');
      cochees.forEach((palette, rang) => {
        segments[rang].querySelector('.pastille-reglee')?.remove();
        const depart = etat.departs.get(palette.id);
        if (!depart || !modifieeDepuisLeDepart(recette, palette, depart)) return;
        const pastille = document.createElement('span');
        pastille.className = 'pastille-reglee';
        pastille.setAttribute('aria-hidden', 'true');
        segments[rang].append(pastille);
      });
    }

    /** Le point de chaque autre palette cochée sur une piste : sa valeur courante, de la couleur de son cran 600 Light. */
    function marquesDes(recette: Recette, autres: readonly Palette[], etat: EtatHarmonisation, grandeur: Grandeur): MarqueDePalette[] {
      return autres.map((autre) => {
        const valeur = valeursDesProfils(recette, autre)[profilVu(autre, etat)][grandeur];
        const rang = grilleDe(recette, autre).crans.indexOf(CRAN_DU_POINT);
        const couleur = rang < 0 ? autre.reference : nuancesVues(recette, autre, etat.intensite, 'light')[rang].hexa;
        return { valeur, couleur, titre: TEXTES.marque(nomDeLaPalette(autre), ecrire(grandeur, valeur)) };
      });
    }

    function rendre(): void {
      if (!lue || !vue || !courante) return;
      const recette = lue;
      const etat = vue;
      const palette = courante;
      const rigide = estFigee(palette);
      figee.hidden = !rigide;
      for (const { reglette } of rangees) reglette.element.hidden = rigide;
      const depart = etat.departs.get(palette.id);
      tete.hidden = rigide || !depart || !modifieeDepuisLeDepart(recette, palette, depart);
      if (rigide) {
        signaler(null);
        return;
      }

      const uneSeule = aUneIntensite(palette);
      const profil = profilVu(palette, etat);
      const autres = etat.cochees.filter((id) => id !== palette.id).flatMap((id) => recette.palettes.find((candidate) => candidate.id === id) ?? []);
      const tous = valeursDesProfils(recette, palette);
      const defauts = valeursParDefaut(recette, palette);
      const valeurs = tous[profil];
      const teinteAffichee = Math.round(pivotDe(recette, palette, uneSeule ? 'unique' : profil).H) % 360;
      const grise = estPaletteGrise(recette, palette);
      lancerLesLimites(recette, palette, valeurs, etat);
      const course = grise ? null : courseEtZones(recette, palette, autres, profil, valeurs.teinte);
      const permisesDe = (grandeur: Grandeur): Intervalle | null => {
        if (grandeur === 'teinte') return course?.permises ?? null;
        const limite = limites[grandeur];
        return limite ? { bas: limite.bas.valeur, haut: limite.haut.valeur } : null;
      };

      for (const { grandeur, reglette, absolu } of rangees) {
        const inactive = grandeur === 'teinte' && grise;
        const valeur = valeurs[grandeur];
        const { min, max, pas, grandPas } = CURSEURS[grandeur];
        const permises = inactive ? null : permisesDe(grandeur);
        const parDefaut = defauts[profil][grandeur];
        const reglee = estModifiee(grandeur, valeur, parDefaut);
        const zones = grandeur === 'teinte' && !inactive ? course?.zones ?? [] : [];
        const dansLaZone = zones.filter(({ debut, fin }) => valeur >= debut - 0.5 && valeur <= fin + 0.5);
        const parties: Texte[] = [ecrire(grandeur, valeur)];
        if (permises) parties.push(plageSureDuReglage([{ grandeur: TEXTES_DES_REGLAGES.grandeurs[grandeur], bas: ecrire(grandeur, permises.bas), haut: ecrire(grandeur, permises.haut) }]));
        if (dansLaZone.length > 0) {
          const noms = dansLaZone.map(({ nom }) => nom);
          parties.push({ lire: () => { const dite = lireTexte(liste.tropProcheDe(noms)); return dite.charAt(0).toLowerCase() + dite.slice(1); } });
        }
        reglette.poser({
          valeur,
          bornes: { bas: min, haut: max },
          permises,
          pas,
          grandPas,
          piste: peindreLaGrandeur(recette, palette, profil, grandeur, valeurs),
          texte: ecrire(grandeur, valeur),
          etiquette: TEXTES_DES_REGLAGES.grandeurs[grandeur],
          annonce: i18n.joindre(parties, ', '),
          reperes: [],
          zones,
          marques: grandeur === 'teinte' ? [] : marquesDes(recette, autres, etat, grandeur),
          defaut: { valeur: parDefaut, titre: TEXTES_DES_REGLAGES.valeurParDefaut(ecrire(grandeur, parDefaut)), libelle: TEXTES_DES_REGLAGES.libelleDeLaMarque },
          // Une palette grise n'a pas de teinte : ses bouts ne nomment aucune famille.
          bouts: inactive ? undefined : boutsDe(grandeur, teinteAffichee),
          modifiee: reglee,
          desactivee: inactive,
          horsDeLaPlage: false,
          bouton: {
            texte: TEXTES_DES_REGLAGES.retablir,
            etiquette: TEXTES_DES_REGLAGES.retablirLa(TEXTES_DES_REGLAGES.grandeurs[grandeur]),
            inactif: !reglee,
            titre: reglee ? TEXTES_DES_REGLAGES.revenirALaValeurParDefaut(ecrire(grandeur, parDefaut)) : undefined,
          },
        });
        i18n.lier(absolu, 'textContent', grandeur === 'teinte' ? `${teinteAffichee}°` : '');
      }
      // L'état du calcul des limites, que les tests d'interface attendent avant un geste.
      corps.dataset.limites = calculs.enCours() ? 'en-cours' : 'pretes';
    }

    return {
      element: carte.element,
      afficher(recette, etat, enGeste) {
        enGesteDeLOnglet = enGeste;
        const cochees = etat.cochees.flatMap((id) => recette.palettes.find((palette) => palette.id === id) ?? []);
        carte.element.hidden = cochees.length < 2;
        const choisie = cochees.find(({ id }) => id === etat.regler);
        if (!choisie) {
          courante = null;
          return;
        }
        if (courante?.id !== choisie.id) {
          signaler(null);
          apercu.annuler();
          avantLeGeste = null;
          calculs.abandonner();
          calcule = null;
          cleDesLimites = null;
          limites = { teinte: null, saturation: null, luminosite: null };
        }
        lue = recette;
        vue = etat;
        courante = choisie;
        carte.poserResume(aUneIntensite(choisie) ? TEXTES.uneIntensite : NOM_DU_PROFIL[etat.intensite]);
        poserLeChoix(recette, cochees, etat);
        rendre();
      },
    };
  }
  return { createCarteDesReglages };
}

export const creerVuesCarteDesReglages = memoriserVues(construireVues);

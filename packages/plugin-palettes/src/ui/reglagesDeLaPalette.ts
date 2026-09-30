/**
 * La carte « Teinte, saturation, luminosité » de la palette ouverte (Z10.6,
 * maquette Z10.4, forme A) : le profil à régler en segments, Vivid, Soft ou
 * les deux, puis trois curseurs peints par le moteur, chacun avec son champ,
 * sa valeur absolue et « Rétablir ». La lettre de l'autre profil situe sa
 * valeur sur chaque piste, et un repère situe la saturation de la référence
 * sur celle des deux profils ([VER-10]). Une palette grise n'a pas de teinte à
 * régler ([DER-15]). Un avertissement précède un réglage qui déplace la
 * référence, et dit ensuite qu'elle a bougé. Sous les curseurs : l'origine
 * des parts, le retour aux réglages communs et les alertes qui comparent les
 * profils ([VER-10], [VER-11]).
 *
 * Un glisser prévisualise une fois par image au plus, la fin du geste
 * enregistre, Échap rend la palette d'avant le geste. Une palette à une
 * intensité n'a pas de segments : ses curseurs règlent sa rampe et sa
 * référence ([ENT-14]).
 */
import {
  aUnReglageDuPorteur,
  aUneIntensite,
  estPaletteGrise,
  fabriquerCran,
  partDeLaReference,
  partsDesProfils,
  pivotDe,
  profilPorteur,
  validerRecette,
  BORNES_DES_REGLAGES,
  type Palette,
  type Profil,
  type Recette,
} from 'ucm-couleur';

import { lireNombre } from '../configuration';
import {
  reglerClarte,
  reglerSaturation,
  reglerTeinte,
  remplacerPalette,
  reprendreLesParts,
  retablirLaSaturation,
  valeursDe,
  type CibleDuReglage,
} from '../edition';
import type { CibleDAction } from '../presentation';
import { type Message } from './constats';
import { creerVuesConstats } from './constats';
import { memoriserVues, lireTexte, type Localisation, type Texte } from './localisation';

export interface ReglagesDeLaPaletteUi {
  element: HTMLDivElement;
  /** `messages` : les alertes qui comparent les profils, sous les curseurs. */
  afficher(recette: Recette, palette: Palette, messages: readonly Message[]): void;
  /** Focalise le premier contrôle, quand un message y mène ([VER-15]). */
  ouvrir(): void;
}

export interface GestesDesReglages {
  previsualiser(palette: Palette): void;
  valider(palette: Palette): void;
  ouvrir(cible: CibleDAction): void;
}

type Grandeur = 'teinte' | 'saturation' | 'luminosite';

const GRANDEURS: readonly Grandeur[] = ['teinte', 'saturation', 'luminosite'];

/** Les bornes, le pas au clavier et le pas avec Maj de chaque curseur (maquette Z10.4, question 2). */
const CURSEURS: Record<Grandeur, { readonly min: number; readonly max: number; readonly pas: number; readonly grandPas: number }> = {
  teinte: { min: -BORNES_DES_REGLAGES.teinte, max: BORNES_DES_REGLAGES.teinte, pas: 1, grandPas: 5 },
  saturation: { min: 0, max: 1, pas: 0.01, grandPas: 0.05 },
  luminosite: { min: BORNES_DES_REGLAGES.clarte.bas, max: BORNES_DES_REGLAGES.clarte.haut, pas: 0.005, grandPas: 0.02 },
};

/** La moitié de la largeur du pouce (`.curseur-peint::-webkit-slider-thumb`) : son centre parcourt la piste moins deux demi-pouces. */
const DEMI_POUCE = 7;

interface Rangee {
  readonly grandeur: Grandeur;
  readonly ligne: HTMLDivElement;
  readonly curseur: HTMLInputElement;
  readonly piste: HTMLSpanElement;
  readonly fantome: HTMLSpanElement;
  readonly repere: HTMLSpanElement;
  readonly champ: HTMLInputElement;
  readonly absolu: HTMLSpanElement;
  readonly retablir: HTMLButtonElement;
}

function construireVues(i18n: Localisation) {
  const { blocDeConstat } = creerVuesConstats(i18n);
  const { NOM_DU_PROFIL, TEXTES, TEXTES_AVANCES, TEXTES_DE_LA_DERIVE, TEXTES_DES_INTENSITES, TEXTES_DES_REGLAGES, luminositeReglee, nombreEcrit, nombreInvalide, origineDesParts, saturationReglee, teinteReglee, texteDuRefus } = i18n.messages;

  /** Le texte d'un champ : la teinte signée en degrés, la saturation en pour cent, la luminosité signée. */
  const ecrire = (grandeur: Grandeur, valeur: number): Texte =>
    grandeur === 'teinte' ? teinteReglee(valeur) : grandeur === 'saturation' ? saturationReglee(valeur) : luminositeReglee(valeur);

  /** La valeur qu'un champ saisi porte, sans signe typographique ni unité ; la saturation se lit en pour cent. */
  function lire(grandeur: Grandeur, saisie: string): number | null {
    const nombre = lireNombre(saisie.replace(/[°%\s+]/g, '').replace('−', '-'));
    if (nombre === null) return null;
    return grandeur === 'saturation' ? nombre / 100 : nombre;
  }

  function createReglagesDeLaPalette(gestes: GestesDesReglages): ReglagesDeLaPaletteUi {
    const element = document.createElement('div');
    element.className = 'reglages-de-la-palette';

    // La cible : Vivid, Soft, ou les deux ; le ◆ marque le profil qui porte la référence.
    const cible = document.createElement('div');
    cible.className = 'cible-des-reglages';
    const libelleDeLaCible = document.createElement('span');
    libelleDeLaCible.className = 'field-label';
    i18n.lier(libelleDeLaCible, 'textContent', TEXTES_DES_REGLAGES.regler);
    const segments = document.createElement('div');
    segments.className = 'bascule bascule-de-base';
    segments.setAttribute('role', 'group');
    i18n.lier(segments, 'aria-label', TEXTES_DES_REGLAGES.cible);
    const boutonsDeCible = (['vivid', 'soft', 'deux'] as const).map((valeur) => {
      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = 'bascule-option';
      bouton.addEventListener('click', () => {
        choisie = valeur;
        rendre();
      });
      segments.append(bouton);
      return { valeur, bouton };
    });
    cible.append(libelleDeLaCible, segments);

    const avertissement = document.createElement('p');
    avertissement.className = 'avertissement-des-reglages';

    const rangees: Rangee[] = GRANDEURS.map((grandeur) => {
      const ligne = document.createElement('div');
      ligne.className = 'reglage-de-la-palette';
      const libelle = document.createElement('span');
      libelle.className = 'field-label';
      i18n.lier(libelle, 'textContent', TEXTES_DES_REGLAGES.grandeurs[grandeur]);
      const piste = document.createElement('span');
      piste.className = 'reglette-piste piste-peinte';
      const { min, max, pas } = CURSEURS[grandeur];
      const curseur = document.createElement('input');
      curseur.type = 'range';
      curseur.min = String(min);
      curseur.max = String(max);
      curseur.step = String(pas);
      curseur.className = 'reglette-curseur curseur-peint';
      const fantome = document.createElement('span');
      fantome.className = 'fantome-du-profil';
      fantome.setAttribute('aria-hidden', 'true');
      const repere = document.createElement('span');
      repere.className = 'reglette-repere repere-de-reference';
      piste.append(curseur, fantome, repere);
      const champ = document.createElement('input');
      champ.type = 'text';
      champ.inputMode = 'decimal';
      champ.className = 'input champ-nombre champ-du-reglage';
      champ.spellcheck = false;
      const absolu = document.createElement('span');
      absolu.className = 'ligne-secondaire absolu-du-reglage';
      const retablir = document.createElement('button');
      retablir.type = 'button';
      retablir.className = 'bouton-discret';
      i18n.lier(retablir, 'textContent', TEXTES_DES_REGLAGES.retablir);
      i18n.lier(retablir, 'aria-label', TEXTES_DES_REGLAGES.retablirLa(TEXTES_DES_REGLAGES.grandeurs[grandeur]));
      retablir.addEventListener('click', () => retablirLaGrandeur(grandeur));
      curseur.addEventListener('dblclick', () => retablirLaGrandeur(grandeur));
      curseur.addEventListener('pointerdown', (evenement) => commencer(grandeur, curseur, evenement));
      curseur.addEventListener('input', () => {
        if (abandonne === curseur) {
          curseur.value = valeurDAvant;
          return;
        }
        prevoir(grandeur, Number(curseur.value));
      });
      curseur.addEventListener('change', () => terminer(grandeur, Number(curseur.value)));
      curseur.addEventListener('keydown', (evenement) => {
        if (evenement.key === 'Escape' && avantLeGeste) {
          evenement.preventDefault();
          annuler();
          abandonne = curseur;
          valeurDAvant = curseur.value;
          return;
        }
        if (evenement.key !== 'Escape') abandonne = null;
        // Maj : le grand pas ; sans Maj, le pas du curseur, que le navigateur applique.
        const sens = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[evenement.key];
        if (!evenement.shiftKey || sens === undefined) return;
        evenement.preventDefault();
        const { grandPas } = CURSEURS[grandeur];
        terminer(grandeur, Math.min(max, Math.max(min, Number(curseur.value) + sens * grandPas)));
      });
      champ.addEventListener('input', () => {
        const valeur = lire(grandeur, champ.value);
        if (valeur !== null && valeur >= min && valeur <= max) prevoir(grandeur, valeur);
      });
      champ.addEventListener('change', () => {
        const valeur = lire(grandeur, champ.value);
        if (valeur === null) {
          signaler(nombreInvalide(champ.value));
          return;
        }
        terminer(grandeur, valeur);
      });
      champ.addEventListener('keydown', (evenement) => {
        if (evenement.key !== 'Escape' || !avantLeGeste) return;
        evenement.preventDefault();
        annuler();
      });
      ligne.append(libelle, piste, champ, absolu, retablir);
      return { grandeur, ligne, curseur, piste, fantome, repere, champ, absolu, retablir };
    });

    const erreur = document.createElement('p');
    erreur.className = 'field-error';
    erreur.hidden = true;
    const pied = document.createElement('p');
    pied.className = 'ligne-secondaire';
    i18n.lier(pied, 'textContent', TEXTES_DES_REGLAGES.pied);
    // Sous la piste de teinte, la raison qui la désactive ([DER-15]).
    const noteGrise = document.createElement('p');
    noteGrise.className = 'ligne-secondaire';
    noteGrise.hidden = true;
    i18n.lier(noteGrise, 'textContent', TEXTES_DE_LA_DERIVE.grisDesactive);
    const origine = document.createElement('p');
    origine.className = 'ligne-secondaire';
    const reprendre = document.createElement('button');
    reprendre.type = 'button';
    reprendre.className = 'lien-de-constat';
    i18n.lier(reprendre, 'textContent', TEXTES_AVANCES.reprendre);
    const messages = document.createElement('div');
    messages.className = 'constats';
    const details = document.createElement('details');
    details.className = 'constat-detail';
    const resume = document.createElement('summary');
    i18n.lier(resume, 'textContent', TEXTES.detailTechnique);
    details.append(resume);
    element.append(cible, avertissement, ...rangees.flatMap(({ grandeur, ligne }) => (grandeur === 'teinte' ? [ligne, noteGrise] : [ligne])), erreur, pied, origine, reprendre, messages, details);

    let lue: Recette | null = null;
    let courante: Palette | null = null;
    /** Le profil que les curseurs règlent ; il revient à l'autre profil que le porteur quand la palette change. */
    let choisie: CibleDuReglage = 'soft';
    /** La palette d'avant le geste en cours, qu'Échap rétablit. */
    let avantLeGeste: Palette | null = null;
    /** Un aperçu attend l'image suivante : un seul rendu par image pendant un glisser (Z4). */
    let enAttente: { palette: Palette; image: number } | null = null;
    /** Le curseur dont Échap a abandonné le glisser : il ne bouge plus jusqu'au relâcher. */
    let abandonne: HTMLInputElement | null = null;
    /** La valeur qu'un curseur abandonné garde jusqu'au relâcher. */
    let valeurDAvant = '';
    /** Le glisser en cours : sa grandeur, son curseur, son pointeur et la valeur au premier appui. */
    let glisse: { grandeur: Grandeur; curseur: HTMLInputElement; pointeur: number; depart: string } | null = null;

    /*
     * Le glisser d'un curseur se suit sur le document. Dans Figma, un mouvement arrive avec `buttons` à 0 bouton
     * enfoncé, et Chromium retire alors toute capture : le glisser natif s'arrête dès que la souris quitte la piste.
     * Le geste ne lit donc ni `buttons` ni la capture, et finit au relâcher, n'importe où dans le document. Sans
     * capture, le relâcher hors de la fenêtre n'arrive pas : la sortie de la fenêtre finit le geste à la dernière
     * valeur. `input` et `change` ne viennent plus que du clavier. Échap abandonne le geste : le curseur garde la
     * valeur d'avant jusqu'au relâcher, qui n'enregistre rien.
     */
    function commencer(grandeur: Grandeur, curseur: HTMLInputElement, evenement: PointerEvent): void {
      if (evenement.button !== 0 || curseur.disabled) return;
      evenement.preventDefault();
      curseur.focus({ preventScroll: true });
      curseur.setPointerCapture(evenement.pointerId);
      abandonne = null;
      glisse = { grandeur, curseur, pointeur: evenement.pointerId, depart: curseur.value };
      window.addEventListener('pointermove', bouger, true);
      window.addEventListener('pointerup', relacher, true);
      window.addEventListener('pointercancel', relacher, true);
      document.addEventListener('pointerout', sortir, true);
      suivre(evenement);
    }

    /** Pose la valeur sous le pointeur, arrondie au pas par le navigateur, puis la prévisualise. */
    function suivre(evenement: PointerEvent): void {
      if (!glisse || abandonne === glisse.curseur) return;
      const { grandeur, curseur } = glisse;
      const { min, max } = CURSEURS[grandeur];
      const cadre = curseur.getBoundingClientRect();
      const course = cadre.width - 2 * DEMI_POUCE;
      const rapport = course > 0 ? Math.min(1, Math.max(0, (evenement.clientX - cadre.left - DEMI_POUCE) / course)) : 0;
      const avant = curseur.value;
      curseur.value = String(min + rapport * (max - min));
      if (curseur.value !== avant) prevoir(grandeur, Number(curseur.value));
    }

    function bouger(evenement: PointerEvent): void {
      if (glisse && evenement.pointerId === glisse.pointeur) suivre(evenement);
    }

    function relacher(evenement: PointerEvent): void {
      if (glisse && evenement.pointerId === glisse.pointeur) finirLeGlisser();
    }

    /** Le pointeur quitte la fenêtre sans capture : le relâcher n'y serait pas vu. */
    function sortir(evenement: PointerEvent): void {
      if (!glisse || evenement.pointerId !== glisse.pointeur || evenement.relatedTarget !== null) return;
      if (!glisse.curseur.hasPointerCapture(glisse.pointeur)) finirLeGlisser();
    }

    function finirLeGlisser(): void {
      if (!glisse) return;
      const { grandeur, curseur, depart } = glisse;
      glisse = null;
      window.removeEventListener('pointermove', bouger, true);
      window.removeEventListener('pointerup', relacher, true);
      window.removeEventListener('pointercancel', relacher, true);
      document.removeEventListener('pointerout', sortir, true);
      if (abandonne === curseur) return;
      if (curseur.value !== depart) terminer(grandeur, Number(curseur.value));
      else if (avantLeGeste) annuler();
    }

    function signaler(texte: Texte | null): void {
      i18n.lier(erreur, 'textContent', texte ?? '');
      erreur.hidden = texte === null;
    }

    const une = (): boolean => (courante ? aUneIntensite(courante) : false);
    /** La cible que les gestes reçoivent : `vivid` pour une palette à une intensité. */
    const cibleDuGeste = (): CibleDuReglage => (une() ? 'vivid' : choisie);

    function avecLaValeur(grandeur: Grandeur, valeur: number): Palette | null {
      if (!lue || !courante) return null;
      const regler = grandeur === 'teinte' ? reglerTeinte : grandeur === 'saturation' ? reglerSaturation : reglerClarte;
      return regler(lue, courante, cibleDuGeste(), valeur);
    }

    function annulerLAttente(): void {
      if (enAttente) cancelAnimationFrame(enAttente.image);
      enAttente = null;
    }

    function prevoir(grandeur: Grandeur, valeur: number): void {
      if (!courante) return;
      if (!avantLeGeste) avantLeGeste = courante;
      const suivante = avecLaValeur(grandeur, valeur);
      if (!suivante) return;
      if (enAttente) {
        enAttente.palette = suivante;
        return;
      }
      const image = requestAnimationFrame(() => {
        const attente = enAttente;
        enAttente = null;
        if (attente) gestes.previsualiser(attente.palette);
      });
      enAttente = { palette: suivante, image };
    }

    function valider(suivante: Palette | null): void {
      annulerLAttente();
      avantLeGeste = null;
      if (!suivante || !lue) return;
      const jugee = validerRecette(remplacerPalette(lue, suivante));
      if ('refus' in jugee) {
        signaler(texteDuRefus(jugee.refus[0]));
        return;
      }
      signaler(null);
      gestes.valider(suivante);
    }

    function terminer(grandeur: Grandeur, valeur: number): void {
      valider(avecLaValeur(grandeur, valeur));
    }

    function annuler(): void {
      const avant = avantLeGeste;
      annulerLAttente();
      avantLeGeste = null;
      if (avant) {
        gestes.previsualiser(avant);
        courante = avant;
      }
      // Le contrôle a le focus, et un rendu ne récrit pas sa valeur : l'abandon la rend. Quitter le champ ensuite
      // n'émet pas `change`.
      rendre(true);
    }

    /**
     * « Rétablir » ou un double-clic : la valeur de départ, pour la cible ou pour les deux profils. Après un double-clic,
     * le curseur a le focus, qu'un rendu ne récrit pas : le rendu forcé le rend à sa valeur.
     */
    function retablirLaGrandeur(grandeur: Grandeur): void {
      if (!lue || !courante) return;
      if (grandeur === 'saturation') {
        valider(retablirLaSaturation(lue, courante, cibleDuGeste()));
      } else {
        const regler = grandeur === 'teinte' ? reglerTeinte : reglerClarte;
        const profils: readonly CibleDuReglage[] = cibleDuGeste() === 'deux' ? ['soft', 'vivid'] : [cibleDuGeste()];
        valider(profils.reduce((palette, profil) => regler(lue!, palette, profil, 0), courante));
      }
      rendre(true);
    }

    reprendre.addEventListener('click', () => {
      if (lue && courante) valider(reprendreLesParts(lue, courante));
    });

    /** Les valeurs d'un profil pour les trois curseurs, et sa teinte absolue. */
    function valeursDuProfil(recette: Recette, palette: Palette, profil: Profil): Record<Grandeur, number> & { absolue: number } {
      const { teinte, clarte } = valeursDe(palette);
      const saturation = aUneIntensite(palette) ? (palette.reglages?.part ?? partDeLaReference(recette, palette)) : partsDesProfils(recette, palette)[profil];
      return {
        teinte: teinte[profil] ?? 0,
        saturation,
        luminosite: clarte[profil] ?? 0,
        absolue: pivotDe(recette, palette, aUneIntensite(palette) ? 'unique' : profil).H,
      };
    }

    /** La piste peinte d'une grandeur : des couleurs fabriquées par le moteur, de la borne basse à la borne haute. */
    function peindre(recette: Recette, palette: Palette, profil: Profil, grandeur: Grandeur, valeurs: Record<Grandeur, number>): string {
      const pivot = pivotDe(recette, palette, aUneIntensite(palette) ? 'unique' : profil);
      const { min, max } = CURSEURS[grandeur];
      const depart = { L: pivot.L + valeurs.luminosite, H: pivot.H - valeurs.teinte, part: valeurs.saturation };
      const couleurs = Array.from({ length: 9 }, (_, rang) => {
        const x = min + ((max - min) * rang) / 8;
        const L = grandeur === 'luminosite' ? pivot.L + x : depart.L;
        const H = grandeur === 'teinte' ? depart.H + x : pivot.H;
        const part = grandeur === 'saturation' ? x : depart.part;
        return fabriquerCran(Math.min(1, Math.max(0, L)), H, Math.min(1, Math.max(0, part)), recette.gamut).hexa;
      });
      return `linear-gradient(to right, ${couleurs.join(', ')})`;
    }

    const position = (grandeur: Grandeur, valeur: number): number => {
      const { min, max } = CURSEURS[grandeur];
      return ((Math.min(max, Math.max(min, valeur)) - min) / (max - min)) * 100;
    };

    /** `forcer` récrit aussi le curseur et le champ qui ont le focus. */
    function rendre(forcer = false): void {
      if (!lue || !courante) return;
      const recette = lue;
      const palette = courante;
      const porteur = profilPorteur(recette, palette);
      const uneSeule = aUneIntensite(palette);
      cible.hidden = uneSeule;
      for (const { valeur, bouton } of boutonsDeCible) {
        const nom = valeur === 'deux' ? TEXTES_DES_REGLAGES.lesDeux : NOM_DU_PROFIL[valeur];
        i18n.lier(bouton, 'textContent', valeur === porteur ? i18n.composer`${nom} ◆` : nom);
        bouton.setAttribute('aria-pressed', String(valeur === choisie));
      }
      // L'avertissement : avant un réglage qui déplacera la référence, puis, à sa place, après qu'elle a bougé.
      const porteLaReference = uneSeule || choisie === 'deux' || choisie === porteur;
      avertissement.hidden = !porteLaReference;
      i18n.lier(avertissement, 'textContent', porteLaReference
        ? (aUnReglageDuPorteur(recette, palette) ? TEXTES_DES_REGLAGES.avertissementApres : TEXTES_DES_REGLAGES.avertissementAvant)
        : '');

      const profil: Profil = uneSeule ? 'vivid' : choisie === 'deux' ? porteur : choisie;
      const autre: Profil = profil === 'soft' ? 'vivid' : 'soft';
      const valeurs = valeursDuProfil(recette, palette, profil);
      const valeursDeLAutre = valeursDuProfil(recette, palette, autre);
      // Une palette grise ne montre pas de teinte : elle ne se règle pas, comme la dérive ([DER-15]).
      const grise = estPaletteGrise(recette, palette);
      noteGrise.hidden = !grise;
      const partDeReference = partDeLaReference(recette, palette);
      const nomDeLaCible = choisie === 'deux' ? TEXTES_DES_REGLAGES.deuxProfils : NOM_DU_PROFIL[choisie];
      for (const { grandeur, curseur, piste, fantome, repere, champ, absolu, retablir } of rangees) {
        const inactive = grandeur === 'teinte' && grise;
        const valeur = valeurs[grandeur];
        curseur.disabled = inactive;
        champ.disabled = inactive;
        // Une teinte rangée se remet toujours à zéro, même sur une palette devenue grise.
        retablir.disabled = inactive && valeur === 0;
        if (forcer || document.activeElement !== curseur) curseur.value = String(valeur);
        if (forcer || document.activeElement !== champ) champ.value = lireTexte(ecrire(grandeur, valeur));
        // Une palette à une intensité n'a qu'un profil : le curseur porte le nom de sa grandeur.
        const etiquette = uneSeule ? TEXTES_DES_REGLAGES.grandeurs[grandeur] : TEXTES_DES_REGLAGES.etiquette(TEXTES_DES_REGLAGES.grandeurs[grandeur], nomDeLaCible);
        i18n.lier(curseur, 'aria-label', etiquette);
        i18n.lier(champ, 'aria-label', etiquette);
        i18n.lier(curseur, 'aria-valuetext', ecrire(grandeur, valeur));
        piste.style.setProperty('--piste', peindre(recette, palette, profil, grandeur, valeurs));
        i18n.lier(absolu, 'textContent', grandeur === 'teinte' ? `${Math.round(valeurs.absolue) % 360}°` : '');
        // La lettre de l'autre profil situe sa valeur, quand un seul profil se règle.
        fantome.hidden = uneSeule || choisie === 'deux';
        fantome.style.left = `${position(grandeur, valeursDeLAutre[grandeur])}%`;
        const nomDeLAutre = NOM_DU_PROFIL[autre];
        i18n.lier(fantome, 'textContent', { lire: () => lireTexte(nomDeLAutre).charAt(0) });
        i18n.lier(fantome, 'title', NOM_DU_PROFIL[autre]);
        // À une intensité, la saturation est celle de la référence : le repère n'y situerait qu'elle-même.
        repere.hidden = grandeur !== 'saturation' || uneSeule;
        repere.style.left = `${position('saturation', partDeReference)}%`;
        i18n.lier(repere, 'title', grandeur === 'saturation' ? TEXTES_DES_INTENSITES.repere(nombreEcrit(Math.round(partDeReference * 100) / 100)) : '');
      }
    }

    return {
      element,
      ouvrir() {
        (cible.hidden ? rangees[0].curseur : boutonsDeCible[0].bouton).focus();
      },
      afficher(recette, palette, messagesDesReglages) {
        if (courante?.id !== palette.id) {
          signaler(null);
          annulerLAttente();
          avantLeGeste = null;
          // Le premier geste proposé ne déplace pas la référence : l'autre profil que le porteur.
          choisie = aUneIntensite(palette) ? 'vivid' : profilPorteur(recette, palette) === 'vivid' ? 'soft' : 'vivid';
        }
        lue = recette;
        courante = palette;
        rendre();
        const uneSeule = aUneIntensite(palette);
        const ligneDOrigine = uneSeule ? null : origineDesParts(palette.parts !== undefined, estPaletteGrise(recette, palette));
        origine.hidden = ligneDOrigine === null;
        i18n.lier(origine, 'textContent', ligneDOrigine ?? '');
        reprendre.hidden = palette.parts?.origine !== 'designer';
        // Les informations restent repliées ; les points à vérifier se lisent tout de suite.
        const visibles = messagesDesReglages.filter((message) => message.severite !== 'notice');
        const replies = messagesDesReglages.filter((message) => message.severite === 'notice');
        messages.replaceChildren(...visibles.map((message) => blocDeConstat(message.constat, message.severite, { cibles: message.cibles, ouvrir: gestes.ouvrir })));
        messages.hidden = visibles.length === 0;
        details.replaceChildren(resume, ...replies.map((message) => blocDeConstat(message.constat, message.severite)));
        details.hidden = replies.length === 0;
        i18n.lier(resume, 'textContent', TEXTES_DES_INTENSITES.detailDeLaReference);
      },
    };
  }
  return { createReglagesDeLaPalette };
}

export const creerVuesReglagesDeLaPalette = memoriserVues(construireVues);

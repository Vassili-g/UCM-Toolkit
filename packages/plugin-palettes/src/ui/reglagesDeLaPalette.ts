/**
 * La carte « Réglage global » de la palette ouverte ([UI-12], Z10.6, maquette
 * Z10.4, forme A) : le profil à régler en segments, Soft, Vivid ou les deux,
 * puis trois réglettes peintes par le moteur, chacune avec son champ, sa
 * valeur absolue et « Rétablir ». La lettre de l'autre profil situe sa valeur
 * sur chaque piste, et un repère situe la saturation de la référence sur
 * celle des deux profils ([VER-10]). Une palette grise n'a pas de teinte à
 * régler ([DER-15]).
 *
 * Chaque réglette s'arrête à la limite dynamique de `[DER-19]`, calculée pour
 * la cible choisie, carte ouverte, et étalée entre les images ; une ligne fixe
 * dit la cause de la butée, et reste vide sans butée ([DER-22]). Une ligne
 * fixe dit, avant les réglettes, si un réglage déplace la référence, et
 * ensuite qu'elle a bougé. Sous les réglettes, la note d'une palette grise ou
 * la première alerte qui compare les profils ([VER-10], [VER-11]). Aucune ne
 * change de hauteur pendant un geste ([UI-20]) ; le détail des alertes se lit
 * dans le volet du pied ([UI-18]).
 *
 * Un glisser prévisualise une fois par image au plus, la fin du geste
 * enregistre, Échap rend la palette d'avant le geste. Une palette à une
 * intensité n'a pas de segments : ses réglettes règlent sa rampe et sa
 * référence ([ENT-14]).
 */
import {
  aUnReglageDuPorteur,
  aUneIntensite,
  balayerLaLimite,
  estPaletteGrise,
  fabriquerCran,
  partDeLaReference,
  partsDesProfils,
  pivotDe,
  profilPorteur,
  validerRecette,
  BORNES_DES_REGLAGES,
  type Limite,
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
  retablirLaSaturation,
  valeursDe,
  type CibleDuReglage,
} from '../edition';
import type { CibleDAction } from '../presentation';
import { createCalculsDeLimites } from './calculDesLimites';
import { type Message } from './constats';
import { creerVuesReglette, type Intervalle, type RegletteUi, type RepereDeReglette } from './derive/reglette';
import { creerVuesChoix } from './choix';
import { creerVuesLigneFixe } from './ligneFixe';
import { memoriserVues, lireTexte, type Localisation, type Texte } from './localisation';

export interface ReglagesDeLaPaletteUi {
  element: HTMLDivElement;
  /**
   * `messages` : les alertes qui comparent les profils, sous les réglettes.
   * `ouverte` : la carte est dépliée, et ses limites se calculent.
   */
  afficher(recette: Recette, palette: Palette, messages: readonly Message[], ouverte: boolean): void;
  /** Focalise le premier contrôle, quand un message y mène ([VER-15]). */
  ouvrir(): void;
  /** Focalise la réglette de saturation, pour des profils presque identiques ([VER-15]). */
  focaliserLaSaturation(): void;
}

export interface GestesDesReglages {
  previsualiser(palette: Palette): void;
  valider(palette: Palette): void;
  ouvrir(cible: CibleDAction): void;
}

type Grandeur = 'teinte' | 'saturation' | 'luminosite';

const GRANDEURS: readonly Grandeur[] = ['teinte', 'saturation', 'luminosite'];

/** Les bornes, le pas au clavier et le pas avec Maj de chaque réglette (maquette Z10.4, question 2). */
const CURSEURS: Record<Grandeur, { readonly min: number; readonly max: number; readonly pas: number; readonly grandPas: number }> = {
  teinte: { min: -BORNES_DES_REGLAGES.teinte, max: BORNES_DES_REGLAGES.teinte, pas: 1, grandPas: 5 },
  saturation: { min: 0, max: 1, pas: 0.01, grandPas: 0.05 },
  luminosite: { min: BORNES_DES_REGLAGES.clarte.bas, max: BORNES_DES_REGLAGES.clarte.haut, pas: 0.005, grandPas: 0.02 },
};

interface Rangee {
  readonly grandeur: Grandeur;
  readonly reglette: RegletteUi;
  readonly absolu: HTMLSpanElement;
}

function construireVues(i18n: Localisation) {
  const { createChoixDuProfil } = creerVuesChoix(i18n);
  const { createLigneFixe } = creerVuesLigneFixe(i18n);
  const { createReglette } = creerVuesReglette(i18n);
  const { LIBELLES_DES_CIBLES, NOM_DU_PROFIL, TEXTES_DES_INTENSITES, TEXTES_DES_REGLAGES, buteeDuReglage, luminositeReglee, nombreEcrit, nombreInvalide, origineDesParts, plageSureDuReglage, saturationReglee, teinteReglee, texteDuRefus } = i18n.messages;

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

    // La cible : Soft, Vivid, ou les deux ; le ◆ marque le profil qui porte la référence.
    const cible = createChoixDuProfil({
      portee: 'regler',
      options: ['soft', 'vivid', 'deux'],
      surChoix(valeur) {
        if (choisie === valeur) return;
        choisie = valeur;
        butee = null;
        rendre();
      },
    });
    cible.element.classList.add('cible-des-reglages');

    const avertissement = createLigneFixe();
    avertissement.element.classList.add('avertissement-des-reglages');

    let lue: Recette | null = null;
    let courante: Palette | null = null;
    /** La carte est dépliée : ses limites se calculent. */
    let ouverte = false;
    /** Le profil que les réglettes règlent ; il revient à l'autre profil que le porteur quand la palette change. */
    let choisie: CibleDuReglage = 'soft';
    /** La palette d'avant le geste en cours, qu'Échap rétablit. */
    let avantLeGeste: Palette | null = null;
    /** Un aperçu attend l'image suivante : un seul rendu par image pendant un glisser (Z4). */
    let enAttente: { palette: Palette; image: number } | null = null;
    /** La butée du dernier geste, que sa ligne nomme jusqu'au geste suivant ([DER-22]). */
    let butee: { grandeur: Grandeur; cote: keyof Intervalle } | null = null;
    // Les limites des trois réglettes, pour la cible choisie, et la clé de l'état qu'elles jugent.
    let limites: Record<Grandeur, Limite | null> = { teinte: null, saturation: null, luminosite: null };
    let cleDesLimites: { readonly etat: string; readonly cible: CibleDuReglage } | null = null;
    const calculs = createCalculsDeLimites(() => {
      if (element.offsetParent !== null) rendre();
    });

    const une = (): boolean => (courante ? aUneIntensite(courante) : false);
    /** La cible que les gestes reçoivent : `vivid` pour une palette à une intensité. */
    const cibleDuGeste = (): CibleDuReglage => (une() ? 'vivid' : choisie);

    function avecLaValeur(grandeur: Grandeur, valeur: number, recette: Recette | null = lue, palette: Palette | null = courante): Palette | null {
      if (!recette || !palette) return null;
      const regler = grandeur === 'teinte' ? reglerTeinte : grandeur === 'saturation' ? reglerSaturation : reglerClarte;
      return regler(recette, palette, cibleDuGeste(), valeur);
    }

    const rangees: Rangee[] = GRANDEURS.map((grandeur) => {
      const absolu = document.createElement('span');
      absolu.className = 'ligne-secondaire absolu-du-reglage';
      const reglette = createReglette(TEXTES_DES_REGLAGES.grandeurs[grandeur], {
        commencer() {
          const termine = calculs.terminer();
          butee = null;
          if (!avantLeGeste) avantLeGeste = courante;
          // La réglette relit ses bornes permises avant de borner le geste.
          if (termine) rendre();
        },
        previsualiser: (valeur) => prevoir(grandeur, valeur),
        valider: (valeur) => terminer(grandeur, valeur),
        annuler,
        retablir: () => retablirLaGrandeur(grandeur),
        lire(saisie) {
          const valeur = lire(grandeur, saisie);
          if (valeur === null) signaler(nombreInvalide(saisie));
          return valeur;
        },
        buter(cote) {
          if (limites[grandeur]?.[cote].cause) butee = { grandeur, cote };
        },
      }, grandeur === 'teinte' ? absolu : undefined);
      reglette.element.classList.add('reglage-de-la-palette');
      return { grandeur, reglette, absolu };
    });

    const erreur = document.createElement('p');
    erreur.className = 'field-error';
    erreur.hidden = true;
    const plage = createLigneFixe();
    // Une palette grise dit que ses deux profils restent gris.
    const origine = createLigneFixe();
    // La raison qui désactive la teinte ([DER-15]), ou la première alerte de la carte et le réglage qu'elle ouvre.
    const alerte = createLigneFixe();
    const lienDeLAlerte = document.createElement('button');
    lienDeLAlerte.type = 'button';
    lienDeLAlerte.className = 'lien-de-constat';
    let cibleDeLAlerte: CibleDAction | null = null;
    lienDeLAlerte.addEventListener('click', () => {
      if (cibleDeLAlerte) gestes.ouvrir(cibleDeLAlerte);
    });
    element.append(cible.element, avertissement.element, ...rangees.map(({ reglette }) => reglette.element), erreur, plage.element, origine.element, alerte.element);

    function signaler(texte: Texte | null): void {
      i18n.lier(erreur, 'textContent', texte ?? '');
      erreur.hidden = texte === null;
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
      // Le geste part de la palette d'avant lui : la prévisualisation l'a déjà remplacée dans l'onglet.
      valider(avecLaValeur(grandeur, valeur, lue, avantLeGeste ?? courante));
    }

    function annuler(): void {
      const avant = avantLeGeste;
      annulerLAttente();
      avantLeGeste = null;
      if (avant) {
        gestes.previsualiser(avant);
        courante = avant;
      }
      rendre();
    }

    /** « Rétablir » ou un double-clic : la valeur de départ, pour la cible ou pour les deux profils. */
    function retablirLaGrandeur(grandeur: Grandeur): void {
      if (!lue || !courante) return;
      calculs.terminer();
      butee = null;
      if (grandeur === 'saturation') {
        valider(retablirLaSaturation(lue, courante, cibleDuGeste()));
      } else {
        const regler = grandeur === 'teinte' ? reglerTeinte : reglerClarte;
        const profils: readonly CibleDuReglage[] = cibleDuGeste() === 'deux' ? ['soft', 'vivid'] : [cibleDuGeste()];
        valider(profils.reduce((palette, profil) => regler(lue!, palette, profil, 0), courante));
      }
    }

    /** Les valeurs d'un profil pour les trois réglettes, et sa teinte absolue. */
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

    /** Lance le calcul des trois limites quand l'état jugé ou la cible a changé, carte ouverte, hors d'un geste ([DER-20]). */
    function lancerLesLimites(recette: Recette, palette: Palette, valeurs: Record<Grandeur, number>, grise: boolean): void {
      if (!ouverte || avantLeGeste) return;
      const etat = JSON.stringify([{ ...recette, palettes: [] }, palette]);
      const cibleLue = cibleDuGeste();
      if (cleDesLimites?.etat === etat && cleDesLimites.cible === cibleLue) return;
      if (cleDesLimites?.cible !== cibleLue) limites = { teinte: null, saturation: null, luminosite: null };
      cleDesLimites = { etat, cible: cibleLue };
      for (const grandeur of GRANDEURS) {
        if (grandeur === 'teinte' && grise) continue;
        const { min, max, pas } = CURSEURS[grandeur];
        calculs.lancer(grandeur, balayerLaLimite({
          recette,
          palette,
          candidate: (valeur) => avecLaValeur(grandeur, valeur, recette, palette) ?? palette,
          valeur: valeurs[grandeur],
          bornes: { bas: min, haut: max },
          pas,
          ordre: grandeur === 'luminosite',
        }), (limite) => {
          limites[grandeur] = limite;
        });
      }
    }

    function rendre(): void {
      if (!lue || !courante) return;
      const recette = lue;
      const palette = courante;
      const porteur = profilPorteur(recette, palette);
      const uneSeule = aUneIntensite(palette);
      cible.cacher(uneSeule);
      cible.poser(choisie, porteur);
      // L'avertissement : avant un réglage qui déplacera la référence, puis, à sa place, après qu'elle a bougé.
      const porteLaReference = uneSeule || choisie === 'deux' || choisie === porteur;
      if (!porteLaReference) avertissement.poser(TEXTES_DES_REGLAGES.neutre);
      else avertissement.poser(aUnReglageDuPorteur(recette, palette) ? TEXTES_DES_REGLAGES.avertissementApres : TEXTES_DES_REGLAGES.avertissementAvant, 'avertissement');

      const profil: Profil = uneSeule ? 'vivid' : choisie === 'deux' ? porteur : choisie;
      const autre: Profil = profil === 'soft' ? 'vivid' : 'soft';
      const valeurs = valeursDuProfil(recette, palette, profil);
      const valeursDeLAutre = valeursDuProfil(recette, palette, autre);
      // Une palette grise ne montre pas de teinte : elle ne se règle pas, comme le Color shift ([DER-15]).
      const grise = estPaletteGrise(recette, palette);
      lancerLesLimites(recette, palette, valeurs, grise);
      const partDeReference = partDeLaReference(recette, palette);
      const nomDeLaCible = choisie === 'deux' ? TEXTES_DES_REGLAGES.deuxProfils : NOM_DU_PROFIL[choisie];
      const etiquetteDe = (grandeur: Grandeur): Texte =>
        // Une palette à une intensité n'a qu'un profil : la réglette porte le nom de sa grandeur.
        uneSeule ? TEXTES_DES_REGLAGES.grandeurs[grandeur] : TEXTES_DES_REGLAGES.etiquette(TEXTES_DES_REGLAGES.grandeurs[grandeur], nomDeLaCible);
      const permisesDe = (grandeur: Grandeur): Intervalle | null => {
        const limite = limites[grandeur];
        return limite ? { bas: limite.bas.valeur, haut: limite.haut.valeur } : null;
      };
      for (const { grandeur, reglette, absolu } of rangees) {
        const inactive = grandeur === 'teinte' && grise;
        const valeur = valeurs[grandeur];
        const { min, max, pas, grandPas } = CURSEURS[grandeur];
        const reperes: RepereDeReglette[] = [];
        // La lettre de l'autre profil situe sa valeur, quand un seul profil se règle.
        if (!uneSeule && choisie !== 'deux') {
          const nomDeLAutre = NOM_DU_PROFIL[autre];
          reperes.push({ valeur: valeursDeLAutre[grandeur], classe: 'fantome-du-profil', titre: nomDeLAutre, lettre: { lire: () => lireTexte(nomDeLAutre).charAt(0) } });
        }
        // À une intensité, la saturation est celle de la référence : le repère n'y situerait qu'elle-même.
        if (grandeur === 'saturation' && !uneSeule) {
          reperes.push({ valeur: partDeReference, classe: 'repere-de-reference', titre: TEXTES_DES_INTENSITES.repere(nombreEcrit(Math.round(partDeReference * 100) / 100)) });
        }
        const permises = inactive ? null : permisesDe(grandeur);
        reglette.poser({
          valeur,
          bornes: { bas: min, haut: max },
          permises,
          pas,
          grandPas,
          piste: peindre(recette, palette, profil, grandeur, valeurs),
          texte: ecrire(grandeur, valeur),
          etiquette: etiquetteDe(grandeur),
          annonce: permises ? i18n.composer`${ecrire(grandeur, valeur)}, ${plageSureDuReglage([{ grandeur: TEXTES_DES_REGLAGES.grandeurs[grandeur], bas: ecrire(grandeur, permises.bas), haut: ecrire(grandeur, permises.haut) }])}` : ecrire(grandeur, valeur),
          reperes,
          desactivee: inactive,
          horsDeLaPlage: false,
          // Une teinte rangée se remet toujours à zéro, même sur une palette devenue grise.
          bouton: { texte: TEXTES_DES_REGLAGES.retablir, etiquette: TEXTES_DES_REGLAGES.retablirLa(TEXTES_DES_REGLAGES.grandeurs[grandeur]), inactif: inactive && valeur === 0 },
        });
        i18n.lier(absolu, 'textContent', grandeur === 'teinte' ? `${Math.round(valeurs.absolue) % 360}°` : '');
      }

      // L'état du calcul des limites, que les tests d'interface attendent avant un geste.
      element.dataset.limites = calculs.enCours() ? 'en-cours' : 'pretes';

      // La ligne de la butée : la cause de la borne que le dernier geste a touchée, sinon rien. Elle garde sa place vide.
      const borne = butee ? limites[butee.grandeur]?.[butee.cote] : null;
      if (butee && borne?.cause) plage.poser(buteeDuReglage(etiquetteDe(butee.grandeur), ecrire(butee.grandeur, borne.valeur), borne.cause), 'butee');
      else plage.poser('');
    }

    return {
      element,
      ouvrir() {
        (cible.element.hidden ? rangees[0].reglette.curseur : cible.premierSegment()).focus();
      },
      focaliserLaSaturation() {
        rangees.find(({ grandeur }) => grandeur === 'saturation')?.reglette.curseur.focus();
      },
      afficher(recette, palette, messagesDesReglages, ouverteLue) {
        if (courante?.id !== palette.id) {
          signaler(null);
          annulerLAttente();
          avantLeGeste = null;
          butee = null;
          calculs.abandonner();
          cleDesLimites = null;
          limites = { teinte: null, saturation: null, luminosite: null };
          // Le premier geste proposé ne déplace pas la référence : l'autre profil que le porteur.
          choisie = aUneIntensite(palette) ? 'vivid' : profilPorteur(recette, palette) === 'vivid' ? 'soft' : 'vivid';
        }
        lue = recette;
        courante = palette;
        ouverte = ouverteLue;
        rendre();
        const uneSeule = aUneIntensite(palette);
        const grise = estPaletteGrise(recette, palette);
        const ligneDOrigine = uneSeule ? null : origineDesParts(grise);
        // Une palette à une intensité n'a pas de profils à situer : la ligne ne paraît qu'avec deux, quelle que soit la saisie.
        origine.element.hidden = ligneDOrigine === null;
        origine.poser(ligneDOrigine ?? '');
        // Les informations se lisent dans le volet du pied ; la ligne garde le premier point à vérifier.
        const premiere = messagesDesReglages.find((message) => message.severite !== 'notice');
        cibleDeLAlerte = premiere?.cibles[0] ?? null;
        i18n.lier(lienDeLAlerte, 'textContent', cibleDeLAlerte ? LIBELLES_DES_CIBLES[cibleDeLAlerte] : '');
        if (grise) alerte.poser(TEXTES_DES_REGLAGES.grise);
        else if (premiere) alerte.poser(i18n.composer`${premiere.constat.ou} · ${premiere.constat.quoi}`, 'avertissement', cibleDeLAlerte ? [lienDeLAlerte] : []);
        else alerte.poser('');
      },
    };
  }
  return { createReglagesDeLaPalette };
}

export const creerVuesReglagesDeLaPalette = memoriserVues(construireVues);

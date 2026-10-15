/**
 * La carte « Réglage global » de la palette ouverte ([UI-12], Z10.6, maquette
 * Z10.4, forme A) : le choix « Régler », Soft, Vivid ou les deux, que la carte
 * pose dans son en-tête, puis « Tout par défaut » et trois réglettes peintes
 * par le moteur, chacune avec son champ, sa valeur absolue, sa marque par
 * défaut, ses deux bouts nommés et « Par défaut » ([UI-38]). Le nom de
 * l'autre profil situe sa valeur sur chaque piste, et un repère situe la
 * saturation de la référence sur celle des deux profils ([VER-10]). Une
 * palette grise n'a pas de teinte à régler ([DER-15]).
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
  enveloppeDe,
  estPaletteGrise,
  fabriquerCran,
  partDeLaReference,
  pivotDe,
  profilPorteur,
  validerRecette,
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
  type CibleDuReglage,
} from '../edition';
import { familleVoisine } from '../familles';
import type { CibleDAction } from '../presentation';
import { CURSEURS, GRANDEURS, estModifiee, valeursDesProfils, valeursParDefaut, type Grandeur } from '../reglagesParDefaut';
import { createCalculsDeLimites } from './calculDesLimites';
import { type Message } from './constats';
import { creerVuesReglette, type Intervalle, type RegletteUi, type RepereDeReglette } from './derive/reglette';
import { creerVuesChoix, type ChoixDuProfilUi } from './choix';
import { creerVuesLigneFixe } from './ligneFixe';
import { memoriserVues, type Localisation, type Texte } from './localisation';

export interface ReglagesDeLaPaletteUi {
  element: HTMLDivElement;
  /** Le choix « Régler » : la carte le pose dans son en-tête (`CarteUi.poserLesChoix`). */
  choix: ChoixDuProfilUi;
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

    // « Tout par défaut » agit sur le profil choisi dans « Régler », ou sur les deux.
    const tete = document.createElement('div');
    tete.className = 'tete-des-reglages';
    const toutRetablir = document.createElement('button');
    toutRetablir.type = 'button';
    toutRetablir.className = 'bouton-discret';
    i18n.lier(toutRetablir, 'textContent', TEXTES_DES_REGLAGES.toutRetablir);
    toutRetablir.addEventListener('click', () => remettreParDefaut(GRANDEURS));
    tete.append(toutRetablir);

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
        retablir: () => remettreParDefaut([grandeur]),
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
    element.append(tete, avertissement.element, ...rangees.map(({ reglette }) => reglette.element), erreur, plage.element, origine.element, alerte.element);

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

    /**
     * « Par défaut », « Tout par défaut » ou un double-clic : les grandeurs
     * demandées reprennent leur valeur par défaut, pour la cible ou pour les
     * deux profils. La saturation passe en dernier : sa valeur par défaut est
     * celle de la référence, une fois la teinte et la luminosité rendues.
     */
    function remettreParDefaut(grandeurs: readonly Grandeur[]): void {
      if (!lue || !courante) return;
      const recette = lue;
      calculs.terminer();
      butee = null;
      const profils: readonly CibleDuReglage[] = cibleDuGeste() === 'deux' ? ['soft', 'vivid'] : [cibleDuGeste()];
      const sansSaturation = grandeurs.filter((grandeur) => grandeur !== 'saturation').reduce((palette, grandeur) => {
        const regler = grandeur === 'teinte' ? reglerTeinte : reglerClarte;
        return profils.reduce((suivante, profil) => regler(recette, suivante, profil, 0), palette);
      }, courante);
      valider(grandeurs.includes('saturation') ? retablirLaSaturation(recette, sansSaturation, cibleDuGeste()) : sansSaturation);
    }

    /** Les mots des deux bouts d'une piste ; ceux de la teinte nomment les familles voisines de la teinte affichée. */
    function boutsDe(grandeur: Grandeur, teinte: number): { gauche: Texte; droite: Texte } {
      if (grandeur !== 'teinte') return TEXTES_DES_REGLAGES.bouts[grandeur];
      const { bouts, familles } = TEXTES_DES_REGLAGES;
      return { gauche: bouts.teinte(familles[familleVoisine(teinte, -1)]), droite: bouts.teinte(familles[familleVoisine(teinte, 1)]) };
    }

    /** La piste peinte d'une grandeur : des couleurs fabriquées par le moteur, de la borne basse à la borne haute. */
    function peindre(recette: Recette, palette: Palette, profil: Profil, grandeur: Grandeur, valeurs: Record<Grandeur, number>): string {
      const intensite = aUneIntensite(palette) ? 'unique' : profil;
      const pivot = pivotDe(recette, palette, intensite);
      // La référence est une couleur du thème Light : la piste en prend l'enveloppe ([MOT-35]).
      const enveloppe = enveloppeDe(recette, intensite, 'light');
      const { min, max } = CURSEURS[grandeur];
      const depart = { L: pivot.L + valeurs.luminosite, H: pivot.H - valeurs.teinte, part: valeurs.saturation };
      const couleurs = Array.from({ length: 9 }, (_, rang) => {
        const x = min + ((max - min) * rang) / 8;
        const L = grandeur === 'luminosite' ? pivot.L + x : depart.L;
        const H = grandeur === 'teinte' ? depart.H + x : pivot.H;
        const part = grandeur === 'saturation' ? x : depart.part;
        return fabriquerCran(Math.min(1, Math.max(0, L)), H, Math.min(1, Math.max(0, part)), recette.gamut, enveloppe).hexa;
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
      const tous = valeursDesProfils(recette, palette);
      const defauts = valeursParDefaut(recette, palette);
      const valeurs = tous[profil];
      const absolue = pivotDe(recette, palette, uneSeule ? 'unique' : profil).H;
      const teinteAffichee = Math.round(absolue) % 360;
      // Une réglette est modifiée dès qu'un profil visé s'écarte de son défaut : « Par défaut » a alors quelque chose à rendre.
      const profilsVises: readonly Profil[] = uneSeule ? ['vivid'] : choisie === 'deux' ? ['soft', 'vivid'] : [choisie];
      const modifiee = (grandeur: Grandeur): boolean => profilsVises.some((vise) => estModifiee(grandeur, tous[vise][grandeur], defauts[vise][grandeur]));
      toutRetablir.disabled = !GRANDEURS.some(modifiee);
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
        // Le nom de l'autre profil situe sa valeur, quand un seul profil se règle.
        if (!uneSeule && choisie !== 'deux') {
          const nomDeLAutre = NOM_DU_PROFIL[autre];
          reperes.push({ valeur: tous[autre][grandeur], classe: 'fantome-du-profil', titre: nomDeLAutre, nom: nomDeLAutre });
        }
        // À une intensité, la saturation est celle de la référence : le repère n'y situerait qu'elle-même.
        if (grandeur === 'saturation' && !uneSeule) {
          reperes.push({ valeur: partDeReference, classe: 'repere-de-reference', titre: TEXTES_DES_INTENSITES.repere(nombreEcrit(Math.round(partDeReference * 100) / 100)) });
        }
        const permises = inactive ? null : permisesDe(grandeur);
        const parDefaut = defauts[profil][grandeur];
        const reglee = modifiee(grandeur);
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
      element.dataset.limites = calculs.enCours() ? 'en-cours' : 'pretes';

      // La ligne de la butée : la cause de la borne que le dernier geste a touchée, sinon rien. Elle garde sa place vide.
      const borne = butee ? limites[butee.grandeur]?.[butee.cote] : null;
      if (butee && borne?.cause) plage.poser(buteeDuReglage(etiquetteDe(butee.grandeur), ecrire(butee.grandeur, borne.valeur), borne.cause), 'butee');
      else plage.poser('');
    }

    return {
      element,
      choix: cible,
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

/**
 * L'onglet Vérification ([VER-18]) : pour la palette ouverte, la barre de la
 * palette, le titre « Palette [nom] », le verdict sur son fond de sévérité,
 * les messages groupés par sévérité avec leurs liens ([VER-15]), la carte
 * « Garanties de contraste », fixe et toujours ouverte ([UI-09]), puis un pied
 * qui mène à Gestion, ou à Création quand une garantie manque.
 *
 * L'onglet lit l'état partagé (`paletteOuverte.ts`) et ne se rend que
 * visible, à la fin d'un geste : un glisser dans Création ne le recalcule pas.
 */
import { type Association, type Mode } from 'ucm-couleur';

import { verdictDeLaPalette, type CibleDAction } from '../presentation';
import type { BarreDePaletteUi } from './barreDePalette';
import { creerVuesConstats } from './constats';
import { creerVuesGaranties } from './garanties';
import { memoriserVues, type Localisation } from './localisation';
import { creerVuesMessagesDePalette } from './messagesDePalette';
import type { PaletteOuverte } from './paletteOuverte';
import { SIGNE_DU_VERDICT } from './selecteur';
import { creerSocleLocalise } from './socleLocalise';

/** Ce que l'onglet demande au reste de l'interface. */
export interface GestesDeLaVerification {
  /** Ouvre le réglage qu'un message nomme : dans Création, ou dans les Réglages communs ([VER-15]). */
  ouvrir(cible: CibleDAction): void;
  versCreation(): void;
  versGestion(): void;
  /** Le thème que l'aperçu de Création montre : la carte des garanties le suit ([VER-20]). */
  mode(): Mode;
  /** Pose le thème, sans retour. */
  choisirLeTheme(mode: Mode): void;
  /** Montre l'autre thème, et garde celui d'avant pour y revenir. */
  montrerLeTheme(mode: Mode): void;
  /** Le thème d'avant `montrerLeTheme`, `null` sans retour à offrir. */
  themeDAvant(): Mode | null;
  revenirAuTheme(): void;
}

export interface OngletVerificationUi {
  readonly element: HTMLDivElement;
  /** L'onglet devient l'onglet actif, ou cesse de l'être : actif, il reprend la barre et se rend. */
  montrer(actif: boolean): void;
  /** Choisit une garantie, depuis le détail d'une nuance de Création ([VER-20]). */
  choisirGarantie(association: Association): void;
  /** Le rang d'un lien de l'onglet parmi ses liens, -1 pour tout autre élément. */
  rangDuLien(element: Element | null): number;
  /** Rend le focus au lien de ce rang, au retour des Réglages communs ([VER-15]). */
  focaliserLeLien(rang: number): void;
}

function construireVues(i18n: Localisation) {
  const { createButton } = creerSocleLocalise(i18n);
  const { listeDesMessages } = creerVuesConstats(i18n);
  const { createGaranties } = creerVuesGaranties(i18n);
  const { tousLesMessages } = creerVuesMessagesDePalette(i18n);
  const { TEXTES, TEXTES_DE_CONFIGURATION, TEXTES_DE_LA_VERIFICATION, TEXTES_DE_L_ONGLET, nomDeLaPalette, pointsDuVerdict, verdictDesGaranties } = i18n.messages;

  function createOngletVerification(etat: PaletteOuverte, barre: BarreDePaletteUi, gestes: GestesDeLaVerification): OngletVerificationUi {
    const element = document.createElement('div');
    element.className = 'page-stack colonne';

    // La barre de la palette, quand l'onglet est actif ([UI-23]).
    const choix = document.createElement('div');
    choix.className = 'choix-de-palette';

    // Sans palette choisie : l'invitation de Création ([UI-06]).
    const invitation = document.createElement('div');
    invitation.className = 'invitation';
    const titreDeLInvitation = document.createElement('h2');
    titreDeLInvitation.className = 'titre-de-premier-rang';
    i18n.lier(titreDeLInvitation, 'textContent', TEXTES.invitationTitre);
    const texteDeLInvitation = document.createElement('p');
    i18n.lier(texteDeLInvitation, 'textContent', TEXTES.invitation);
    invitation.append(titreDeLInvitation, texteDeLInvitation);

    // Une recette illisible ou future : rien à vérifier, les gestes de sortie sont dans Création.
    const sansRecette = document.createElement('p');
    sansRecette.className = 'etat-lecture';
    i18n.lier(sansRecette, 'textContent', TEXTES_DE_CONFIGURATION.sansRecette);

    const titre = document.createElement('h2');
    titre.className = 'titre-de-premier-rang';
    const tete = document.createElement('div');
    tete.className = 'tete-de-la-palette';
    tete.append(titre);

    const verdict = document.createElement('div');
    verdict.className = 'verdict';
    verdict.setAttribute('role', 'status');
    const iconeDuVerdict = document.createElement('span');
    iconeDuVerdict.className = 'verdict-icone';
    iconeDuVerdict.setAttribute('aria-hidden', 'true');
    const texteDuVerdict = document.createElement('div');
    texteDuVerdict.className = 'verdict-texte';
    const bilan = document.createElement('strong');
    const points = document.createElement('span');
    texteDuVerdict.append(bilan, points);
    verdict.append(iconeDuVerdict, texteDuVerdict);

    const messages = document.createElement('div');
    messages.className = 'messages-de-la-verification';

    const garanties = createGaranties({
      ouvrir: (cible) => gestes.ouvrir(cible),
      montrerLeTheme: (mode) => gestes.montrerLeTheme(mode),
      choisirLeTheme: (mode) => gestes.choisirLeTheme(mode),
      themeDAvant: () => gestes.themeDAvant(),
      revenirAuTheme: () => gestes.revenirAuTheme(),
    });

    const pied = document.createElement('div');
    pied.className = 'pied-de-la-palette pied-de-la-verification';
    pied.setAttribute('role', 'region');
    i18n.lier(pied, 'aria-label', TEXTES_DE_LA_VERIFICATION.region);
    const texteDuPied = document.createElement('span');
    texteDuPied.className = 'pied-texte';
    const versGestion = createButton({ label: TEXTES_DE_LA_VERIFICATION.versGestion, compact: true, onClick: () => gestes.versGestion() });
    const versCreation = createButton({ label: TEXTES_DE_LA_VERIFICATION.versCreation, variant: 'secondary', compact: true, onClick: () => gestes.versCreation() });
    pied.append(texteDuPied, versCreation, versGestion);

    const corps = document.createElement('div');
    corps.className = 'configuration-de-la-palette';
    corps.append(tete, verdict, messages, garanties.element, pied);

    const vue = document.createElement('div');
    vue.className = 'page-stack colonne vue-de-la-palette';
    vue.append(choix, invitation, sansRecette, corps);
    element.append(vue);

    let actif = false;
    /** Vrai quand un rendu complet a eu lieu pendant que l'onglet était caché, ou pendant un geste. */
    let enRetard = true;

    function rendre(): void {
      enRetard = false;
      const recette = etat.recette();
      const courante = etat.palette();
      const analyse = etat.analyse();
      choix.hidden = !recette;
      sansRecette.hidden = recette !== null;
      invitation.hidden = !recette || courante !== null;
      corps.hidden = !recette || !courante || !analyse;
      if (!recette || !courante || !analyse) return;

      const nom = nomDeLaPalette(courante);
      i18n.lier(titre, 'textContent', TEXTES_DE_L_ONGLET.titre(nom));
      const liste = tousLesMessages(analyse, courante, {
        recette,
        nomDe: (id) => {
          const trouvee = recette.palettes.find((candidate) => candidate.id === id);
          return trouvee ? nomDeLaPalette(trouvee) : id;
        },
      });
      const alertes = liste.filter((message) => message.severite === 'alerte').length;
      const ton = verdictDeLaPalette(analyse);
      verdict.dataset.ton = ton;
      i18n.lier(iconeDuVerdict, 'textContent', SIGNE_DU_VERDICT[ton]);
      i18n.lier(bilan, 'textContent', analyse.libre
        ? TEXTES.paletteLibre(analyse.grille.crans.length)
        : verdictDesGaranties(analyse.promesses.length, analyse.manquees));
      i18n.lier(points, 'textContent', pointsDuVerdict(alertes));

      messages.replaceChildren(...(liste.length > 0 ? [listeDesMessages(liste, (cible) => gestes.ouvrir(cible))] : []));
      messages.hidden = liste.length === 0;

      // Une palette libre n'a pas de garantie : sa carte se retire (W6.5).
      garanties.element.hidden = analyse.libre;
      if (!analyse.libre) garanties.afficher({ recette, palette: courante, analyse, mode: gestes.mode() });

      const manque = analyse.manquees > 0;
      pied.dataset.ton = ton;
      i18n.lier(texteDuPied, 'textContent', analyse.libre ? TEXTES_DE_LA_VERIFICATION.libre : manque ? TEXTES_DE_LA_VERIFICATION.manquee : TEXTES_DE_LA_VERIFICATION.tenue);
      i18n.lier(texteDuPied, 'title', analyse.libre ? TEXTES_DE_LA_VERIFICATION.libre : manque ? TEXTES_DE_LA_VERIFICATION.manquee : TEXTES_DE_LA_VERIFICATION.tenue);
      versGestion.hidden = manque;
      versCreation.hidden = !manque;
    }

    // Un rendu complet de Création : visible et hors d'un geste, l'onglet suit ; sinon il se rendra à son ouverture.
    etat.abonner(() => {
      if (actif && !etat.enGeste()) rendre();
      else enRetard = true;
    });

    return {
      element,
      montrer(suivant) {
        actif = suivant;
        if (!actif) return;
        barre.placerDans(choix);
        if (enRetard) rendre();
      },
      choisirGarantie(association) {
        if (enRetard) rendre();
        garanties.choisir(association);
      },
      rangDuLien: (cherche) => (cherche ? Array.from(corps.querySelectorAll('.lien-de-constat')).indexOf(cherche) : -1),
      focaliserLeLien(rang) {
        corps.querySelectorAll<HTMLElement>('.lien-de-constat')[rang]?.focus({ preventScroll: true });
      },
    };
  }
  return { createOngletVerification };
}

export const creerVuesOngletVerification = memoriserVues(construireVues);

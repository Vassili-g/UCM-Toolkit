/**
 * Les demandes de l'interface au sandbox et le sort de leurs réponses
 * ([UI-08], [REC-06], [REC-10]).
 *
 * Un seul compteur numérote toutes les demandes. Un état n'est accepté que
 * s'il répond à la dernière demande envoyée : un état demandé avant un
 * rangement décrirait la recette d'avant. Un seul rangement est en vol ; un
 * geste qui arrive pendant ce temps attend la réponse, puis part avec
 * l'empreinte qu'elle apporte. Après un refus, rien ne se range avant
 * « Recharger ». Un dessin ou une écriture de variables part quand plus rien
 * n'est à ranger : ils se font sur la recette que l'aperçu montre.
 */
import type { Recette, Refus } from 'ucm-couleur';

import type { SourceDeLaReprise } from '../ecriture/variables';
import type { PluginMessage, UiRequest } from '../messages';
import type { Destination } from '../variables/destination';
import {
  ETAT_D_ANNULATION_VIDE,
  adopter,
  annuler,
  avancer,
  differeDeLOuverture,
  peutAvancer,
  peutReculer,
  peutRetablir,
  recetteCourante,
  reculer,
  regler,
  retablir,
  viderLaPile,
  type EtatDAnnulation,
  type Pas,
} from './annulation';

/** Ce que l'indication de rangement affiche. */
export type StatutDuRangement = 'lu' | 'en-cours' | 'range' | 'refuse' | 'invalide';

/** Ce qu'un dessin demande : des palettes, et les calques étrangers que le designer accepte de perdre (D-H). */
export interface DemandeDeDessin {
  readonly palettes: readonly string[];
  readonly etrangersConfirmes: readonly string[];
}

/** Ce qu'une écriture de variables demande : des palettes, et celles dont le designer remet les couleurs ([VAR-06]). */
export interface DemandeDeVariables {
  readonly palettes: readonly string[];
  readonly remettre: readonly string[];
}

export interface Frontiere {
  /** Relit l'état ; `'fichier'` cherche les cadres sur toutes les pages, au geste du designer (V8.6). */
  lireLEtat(recherche?: 'fichier'): void;
  ranger(recette: Recette): void;
  /**
   * Dessine les palettes nommées, dès que la recette affichée est rangée. Un
   * rangement refusé entre-temps abandonne le dessin : `surAbandon` le dit.
   */
  dessiner(demande: DemandeDeDessin, surAbandon: () => void): void;
  /**
   * Ouvre la planche et cadre les cadres (E18). La demande n'attend aucune
   * réponse : son numéro ne rend caduc aucun état attendu.
   */
  voirSurLaPlanche(page: string, cadres: readonly string[]): void;
  /**
   * Retire le cadre d'une palette supprimée ([PLA-27]). Pendant un conflit
   * d'enregistrement, rien ne part : la réponse est `false`. La demande rend
   * caduc un état demandé avant elle, qui montrerait encore le cadre.
   */
  retirer(palette: string, cadre: string): boolean;
  /** Vrai quand l'issue répond au dernier retrait demandé. */
  accepterRetrait(message: Extract<PluginMessage, { type: 'retrait' }>): boolean;
  /**
   * Change la page des planches ([PLA-29]). Une seule demande est en vol, et
   * rien ne part pendant un conflit d'enregistrement : la réponse est `false`.
   * La demande rend caduc un état demandé avant elle.
   */
  choisirLaPage(page: { id: string } | { nom: string }): boolean;
  /** Vrai quand l'issue répond au dernier choix de page demandé : la demande n'est plus en vol. */
  accepterPage(message: Extract<PluginMessage, { type: 'page-choisie' }>): boolean;
  /**
   * Écrit les variables des palettes nommées, dès que la recette affichée
   * est rangée ([VAR-16]). Comme un dessin : elle part après le rangement en
   * vol, un refus l'abandonne et `surAbandon` le dit, et rien ne part
   * pendant un conflit.
   */
  ecrireLesVariables(demande: DemandeDeVariables, surAbandon: () => void): void;
  /** Vrai quand le résultat répond à la dernière écriture de variables demandée. */
  accepterVariables(message: Extract<PluginMessage, { type: 'variables-ecrites' }>): boolean;
  /** Range la destination des tokens ; `false` quand rien ne part : une demande est en vol, ou un conflit est en cours. */
  rangerLaDestination(destination: Destination): boolean;
  /** Vrai quand l'issue répond au dernier rangement de destination : la demande n'est plus en vol. */
  accepterDestination(message: Extract<PluginMessage, { type: 'destination-rangee' }>): boolean;
  accepterErreurDeLecture(message: Extract<PluginMessage, { type: 'etat-refuse' }>): boolean;
  /** Retire les variables d'une palette supprimée ([VAR-11]) ; `false` pendant un conflit. */
  retirerLesVariables(palette: string): boolean;
  /** Vrai quand l'issue répond au dernier retrait de variables demandé. */
  accepterRetraitDesVariables(message: Extract<PluginMessage, { type: 'variables-retirees' }>): boolean;
  /**
   * Reprend une palette du fichier ([VAR-13]) : la recette qui la porte et
   * sa liaison se rangent ensemble. Rien ne part pendant un conflit, ni tant
   * qu'un rangement ou une autre reprise est en vol : la réponse est
   * `false`. Jusqu'à l'issue, aucun rangement ne part.
   */
  reprendre(recette: Recette, palette: string, source: SourceDeLaReprise): boolean;
  /**
   * Vrai quand l'issue répond à la dernière reprise demandée. Une reprise
   * rangée apporte l'empreinte de la recette ; une recette changée ailleurs
   * ouvre le conflit d'enregistrement.
   */
  recevoirReprise(message: Extract<PluginMessage, { type: 'reprise' }>): boolean;
  /**
   * Copie une palette de bibliothèque dans le plugin ([VAR-14]). La copie
   * range la recette : elle suit les règles de la reprise, et la réponse est
   * `false` quand rien ne part.
   */
  copier(palette: string, source: { collection: string; chemin: string }): boolean;
  /** Vrai quand l'issue répond à la dernière copie demandée ; réussie, elle apporte l'empreinte de la recette. */
  recevoirCopie(message: Extract<PluginMessage, { type: 'copie' }>): boolean;
  /** Vrai quand la progression ou le résultat répond au dernier dessin demandé. */
  accepterDessin(message: Extract<PluginMessage, { type: 'progression' | 'dessin' }>): boolean;
  /** Vrai quand l'état répond à la dernière demande : l'interface l'affiche. */
  accepterEtat(message: Extract<PluginMessage, { type: 'etat' }>): boolean;
  recevoirRangement(message: Extract<PluginMessage, { type: 'rangement' }>): void;
  /**
   * Range la recette courante avec cette palette dans son état d'ouverture
   * (D4), par le chemin d'un réglage : un refus [REC-10] reste un refus. Ni
   * les autres palettes ni les Réglages communs ne bougent. La réponse est
   * `false` quand rien ne part : la palette n'a pas bougé, ou un conflit est en cours.
   */
  annulerLesModifications(palette: string): boolean;
  /** Vrai quand la palette rangée n'est plus celle de son état d'ouverture. */
  differeDeLOuverture(palette: string): boolean;
  /** Range la palette d'avant la dernière annulation ; disponible jusqu'au réglage suivant. */
  retablir(): boolean;
  peutRetablir(): boolean;
  /** Range la recette précédente de la pile de la session ; `false` quand rien ne part. */
  reculer(): boolean;
  peutReculer(): boolean;
  /** Range la recette suivante de la pile ; `false` quand rien ne part. */
  avancer(): boolean;
  peutAvancer(): boolean;
  /**
   * Appelle `rappel` quand `differeDeLOuverture`, `peutRetablir`,
   * `peutReculer` ou `peutAvancer` ont pu changer : à chaque réglage, chaque
   * pas de la pile, chaque refus et chaque lecture d'une recette venue
   * d'ailleurs. Rend la fonction qui désabonne.
   */
  abonnerLAnnulation(rappel: () => void): () => void;
  /** L'empreinte de la recette rangée, telle que la dernière réponse l'a apportée. */
  empreinte(): string | null;
  /** Vrai quand aucun rangement n'est en vol ni en attente. */
  auRepos(): boolean;
  statut(): StatutDuRangement;
}

interface DemandeDeRangement {
  readonly recette: Recette;
  /** L'état d'annulation une fois cette recette rangée. */
  readonly apres: EtatDAnnulation;
}

export function createFrontiere(
  envoyer: (demande: UiRequest) => void,
  surStatut: (statut: StatutDuRangement, refus: readonly Refus[]) => void = () => {},
): Frontiere {
  let compteur = 0;
  let derniereDemande = 0;
  let dernierRangement = 0;
  let empreinte: string | null = null;
  let enVol = false;
  let enAttente: DemandeDeRangement | null = null;
  let enVolApres: EtatDAnnulation = ETAT_D_ANNULATION_VIDE;
  // L'état souhaité suit les gestes de l'interface ; le confirmé, les réponses du sandbox. Un refus ramène au second.
  let confirme: EtatDAnnulation = ETAT_D_ANNULATION_VIDE;
  let souhaite: EtatDAnnulation = ETAT_D_ANNULATION_VIDE;
  const abonnes = new Set<() => void>();
  let dessinEnAttente: { demande: DemandeDeDessin; surAbandon: () => void } | null = null;
  let dernierDessin = 0;
  let dernierRetrait = 0;
  let dernierChoixDePage = 0;
  let pageEnVol = false;
  let variablesEnAttente: { demande: DemandeDeVariables; surAbandon: () => void } | null = null;
  let dernieresVariables = 0;
  let derniereDestination = 0;
  let destinationEnVol = false;
  let dernierRetraitDesVariables = 0;
  let derniereReprise = 0;
  let derniereCopie = 0;
  let courant: StatutDuRangement = 'lu';

  function numeroter(): number {
    compteur += 1;
    derniereDemande = compteur;
    return compteur;
  }

  function poser(statut: StatutDuRangement, refus: readonly Refus[] = []): void {
    courant = statut;
    surStatut(statut, refus);
  }

  function envoyerDessin({ palettes, etrangersConfirmes }: DemandeDeDessin): void {
    dernierDessin = numeroter();
    envoyer({
      type: 'dessiner',
      demande: dernierDessin,
      palettes: [...palettes],
      empreinteLue: empreinte,
      etrangersConfirmes: [...etrangersConfirmes],
    });
  }

  function envoyerVariables({ palettes, remettre }: DemandeDeVariables): void {
    dernieresVariables = numeroter();
    envoyer({ type: 'ecrire-variables', demande: dernieresVariables, palettes: [...palettes], empreinteLue: empreinte, remettre: [...remettre] });
  }

  function poserLAnnulation(suivant: EtatDAnnulation): void {
    if (suivant === souhaite) return;
    souhaite = suivant;
    for (const rappel of [...abonnes]) rappel();
  }

  /** Remet l'état souhaité à celui que le sandbox a confirmé. */
  function revenirAuConfirme(): void {
    poserLAnnulation(confirme);
  }

  /** Un pas de l'annulation range sa recette comme un réglage : il attend le rangement en vol et se refuse pendant un conflit. */
  function demander(pas: Pas | null): boolean {
    if (courant === 'refuse' || pas === null) return false;
    poserLAnnulation(pas.etat);
    const demande = { recette: pas.recette, apres: pas.etat };
    if (enVol) enAttente = demande;
    else envoyerRangement(demande);
    return true;
  }

  function envoyerRangement({ recette, apres }: DemandeDeRangement): void {
    dernierRangement = numeroter();
    enVol = true;
    enVolApres = apres;
    poser('en-cours');
    envoyer({ type: 'ranger-recette', demande: dernierRangement, recette, empreinteLue: empreinte });
  }

  return {
    lireLEtat(recherche) {
      envoyer(recherche ? { type: 'lire-etat', demande: numeroter(), recherche } : { type: 'lire-etat', demande: numeroter() });
    },
    ranger(recette) {
      if (courant === 'refuse') return;
      const apres = regler(souhaite, recette);
      poserLAnnulation(apres);
      if (enVol) enAttente = { recette, apres };
      else envoyerRangement({ recette, apres });
    },
    annulerLesModifications(palette) {
      return demander(annuler(souhaite, palette));
    },
    differeDeLOuverture: (palette) => differeDeLOuverture(souhaite, palette),
    retablir: () => demander(retablir(souhaite)),
    peutRetablir: () => peutRetablir(souhaite),
    reculer: () => demander(reculer(souhaite)),
    peutReculer: () => peutReculer(souhaite),
    avancer: () => demander(avancer(souhaite)),
    peutAvancer: () => peutAvancer(souhaite),
    abonnerLAnnulation(rappel) {
      abonnes.add(rappel);
      return () => {
        abonnes.delete(rappel);
      };
    },
    dessiner(demande, surAbandon) {
      if (courant === 'refuse') {
        surAbandon();
        return;
      }
      if (enVol || enAttente) dessinEnAttente = { demande, surAbandon };
      else envoyerDessin(demande);
    },
    voirSurLaPlanche(page, cadres) {
      compteur += 1;
      envoyer({ type: 'voir-sur-la-planche', demande: compteur, page, cadres: [...cadres] });
    },
    retirer(palette, cadre) {
      if (courant === 'refuse') return false;
      dernierRetrait = numeroter();
      envoyer({ type: 'retirer-cadre', demande: dernierRetrait, palette, cadre });
      return true;
    },
    accepterRetrait(message) {
      return message.demande === dernierRetrait;
    },
    choisirLaPage(page) {
      if (courant === 'refuse' || pageEnVol) return false;
      dernierChoixDePage = numeroter();
      pageEnVol = true;
      envoyer({ type: 'choisir-page', demande: dernierChoixDePage, page });
      return true;
    },
    accepterPage(message) {
      if (message.demande !== dernierChoixDePage) return false;
      pageEnVol = false;
      return true;
    },
    ecrireLesVariables(demande, surAbandon) {
      if (courant === 'refuse') {
        surAbandon();
        return;
      }
      if (enVol || enAttente) variablesEnAttente = { demande, surAbandon };
      else envoyerVariables(demande);
    },
    accepterVariables(message) {
      return message.demande === dernieresVariables;
    },
    rangerLaDestination(destination) {
      if (courant === 'refuse' || destinationEnVol) return false;
      derniereDestination = numeroter();
      destinationEnVol = true;
      envoyer({ type: 'ranger-destination', demande: derniereDestination, destination });
      return true;
    },
    accepterDestination(message) {
      if (message.demande !== derniereDestination) return false;
      destinationEnVol = false;
      return true;
    },
    retirerLesVariables(palette) {
      if (courant === 'refuse') return false;
      dernierRetraitDesVariables = numeroter();
      envoyer({ type: 'retirer-variables', demande: dernierRetraitDesVariables, palette });
      return true;
    },
    accepterRetraitDesVariables(message) {
      return message.demande === dernierRetraitDesVariables;
    },
    reprendre(recette, palette, source) {
      if (courant === 'refuse' || enVol || enAttente) return false;
      derniereReprise = numeroter();
      // La reprise range la recette : un geste qui arrive entre-temps attend son issue, comme pendant un rangement.
      enVol = true;
      envoyer({ type: 'reprendre-palette', demande: derniereReprise, recette, empreinteLue: empreinte, palette, source });
      return true;
    },
    recevoirReprise(message) {
      if (message.demande !== derniereReprise) return false;
      enVol = false;
      // Un geste arrivé pendant la reprise portait la recette d'avant : il s'abandonne, et l'état relu rend la recette rangée.
      enAttente = null;
      if (message.issue.issue === 'reprise') {
        empreinte = message.issue.empreinte;
        // La reprise range aussi la liaison : reculer la défairait à moitié. La pile repart de l'état relu.
        confirme = viderLaPile(confirme);
        poser('range');
      } else if (message.issue.issue === 'modifiee-ailleurs') poser('refuse');
      revenirAuConfirme();
      return true;
    },
    copier(palette, source) {
      if (courant === 'refuse' || enVol || enAttente) return false;
      derniereCopie = numeroter();
      enVol = true;
      envoyer({ type: 'copier-palette', demande: derniereCopie, empreinteLue: empreinte, palette, source });
      return true;
    },
    recevoirCopie(message) {
      if (message.demande !== derniereCopie) return false;
      enVol = false;
      enAttente = null;
      if (message.issue.issue === 'copiee') {
        empreinte = message.issue.empreinte;
        confirme = viderLaPile(confirme);
        poser('range');
      } else if (message.issue.issue === 'modifiee-ailleurs') poser('refuse');
      revenirAuConfirme();
      return true;
    },
    accepterDessin(message) {
      return message.demande === dernierDessin;
    },
    accepterEtat(message) {
      if (enVol || message.demande < derniereDemande) return false;
      const venueDAilleurs = message.empreinte !== empreinte;
      empreinte = message.empreinte;
      enVol = false;
      enAttente = null;
      const { classement } = message;
      if (classement.etat === 'future' || classement.etat === 'illisible') confirme = ETAT_D_ANNULATION_VIDE;
      else if (venueDAilleurs || recetteCourante(confirme) === null) confirme = adopter(confirme, classement.recette);
      revenirAuConfirme();
      poser('lu');
      return true;
    },
    accepterErreurDeLecture(message) {
      return !enVol && message.demande >= derniereDemande;
    },
    recevoirRangement(message) {
      if (message.demande !== dernierRangement) return;
      enVol = false;
      const { issue } = message;
      if (issue.issue === 'rangee') {
        empreinte = issue.empreinte;
        confirme = enVolApres;
        const suivante = enAttente;
        enAttente = null;
        if (suivante) envoyerRangement(suivante);
        else {
          poser('range');
          // Les variables partent avant le dessin : « Tout mettre à jour » écrit les tokens, puis les planches.
          const variables = variablesEnAttente;
          variablesEnAttente = null;
          if (variables) envoyerVariables(variables.demande);
          const dessin = dessinEnAttente;
          dessinEnAttente = null;
          if (dessin) envoyerDessin(dessin.demande);
        }
      } else {
        enAttente = null;
        revenirAuConfirme();
        const abandonne = dessinEnAttente;
        dessinEnAttente = null;
        const abandonnees = variablesEnAttente;
        variablesEnAttente = null;
        if (issue.issue === 'modifiee-ailleurs') poser('refuse');
        else poser('invalide', issue.refus);
        abandonne?.surAbandon();
        abandonnees?.surAbandon();
      }
    },
    empreinte: () => empreinte,
    auRepos: () => !enVol && enAttente === null,
    statut: () => courant,
  };
}

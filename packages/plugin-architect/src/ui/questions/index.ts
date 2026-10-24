/**
 * L'onglet Questions du panneau des constats : une carte par question du moteur, au modèle d'« À trancher » de Nomenclature. Le titre
 * cite le premier candidat, chaque autre candidat a son bouton, et rien n'est choisi avant le clic. Une réponse remplace la carte par sa
 * ligne verte (la correction qu'elle tire passe dans Corrections), avec deux gestes : ouvrir Corrections, annuler la réponse. « Plus tard »
 * range la carte en fin de liste jusqu'à la prochaine analyse. Les questions identiques de plusieurs variants se montrent en une carte, qui
 * envoie une réponse par question du groupe.
 */
import { createButton } from 'ucm-plugin-socle/src/ui/Button';
import { creerResultat } from 'ucm-plugin-socle/src/ui/Changement';
import { creerCheminEnPhrase, creerVariantEnPhrase } from 'ucm-plugin-socle/src/ui/Chemin';

import type { AnalyseRecue } from '../composant/analyse';
import { poserLeTexteEnrichi } from '../ignores/texte';
import { TEXTES } from '../textes';
import { carteDeQuestion, estUneQuestion, regrouperLesCartes, reponsesDuGroupe, type CarteDeQuestion, type ContexteDeQuestions, type GroupeDeQuestions, type MorceauDEffet, type MorceauDeTitre, type ReponseProposee } from './modele';

const T = TEXTES.questionsDuComposant;

export interface OptionsDesQuestions {
  /** Envoie la réponse du designer à une question. */
  readonly repondre: (question: string, reponse: string) => void;
  /** Retire la réponse : la question revient à trancher. */
  readonly annuler: (question: string) => void;
  /** Passe à l'onglet Corrections. */
  readonly ouvrirCorrections: () => void;
}

export interface EntreeDesQuestions {
  readonly analyse: AnalyseRecue;
  readonly contexte: ContexteDeQuestions;
}

export interface Questions {
  /** Montre l'onglet pour cette analyse. */
  poser(entree: EntreeDesQuestions): void;
  /** Le nombre de questions qui attendent une réponse. */
  nombre(): number;
}

function motCite(texte: string, classe: 'mot-retire' | 'mot-retenu'): HTMLElement {
  const code = document.createElement('code');
  if (classe === 'mot-retire') code.className = 'mot-cite mot-retire';
  else code.className = 'mot-cite mot-retenu';
  code.textContent = texte;
  return code;
}

function poserLeTitre(parent: HTMLElement, titre: readonly MorceauDeTitre[]): void {
  for (const morceau of titre) {
    if (typeof morceau === 'string') parent.append(morceau);
    else if ('olive' in morceau) {
      const layer = document.createElement('span');
      layer.className = 'ch ch-variable-vu';
      layer.textContent = morceau.olive;
      parent.append(layer);
    } else if ('variant' in morceau) parent.append(creerVariantEnPhrase(morceau.variant));
    else if ('chemin' in morceau) parent.append(creerCheminEnPhrase(morceau.chemin, { vus: morceau.vus }));
    else if ('retire' in morceau) parent.append(motCite(morceau.retire, 'mot-retire'));
    else parent.append(motCite(morceau.retenu, 'mot-retenu'));
  }
}

function poserLEffet(ligne: HTMLElement, morceaux: readonly MorceauDEffet[]): void {
  for (const morceau of morceaux) {
    if (typeof morceau === 'string') ligne.append(morceau);
    else {
      const segment = document.createElement('span');
      if ('ancien' in morceau) {
        segment.className = 'seg-ancien';
        segment.textContent = morceau.ancien;
      } else {
        segment.className = 'seg-nouveau';
        segment.textContent = morceau.nouveau;
      }
      ligne.append(segment);
    }
  }
}

function boutonTexte(libelle: string, nomAccessible: string | null, auClic: () => void, inactif: boolean): HTMLButtonElement {
  const bouton = document.createElement('button');
  bouton.type = 'button';
  bouton.className = 'btn-texte';
  bouton.textContent = libelle;
  if (nomAccessible !== null) bouton.setAttribute('aria-label', nomAccessible);
  bouton.disabled = inactif;
  bouton.addEventListener('click', auClic);
  return bouton;
}

export function monterLesQuestions(hote: HTMLElement, options: OptionsDesQuestions): Questions {
  let identite = '';
  let entree: EntreeDesQuestions | null = null;
  let restantes = 0;
  const plusTard = new Set<string>();

  /** Une réponse au groupe : une demande `repondre` par question qu'il réunit. */
  const repondreAuGroupe = (groupe: GroupeDeQuestions, reponse: string): void => {
    for (const demande of reponsesDuGroupe(groupe, reponse)) options.repondre(demande.question, demande.reponse);
  };

  /** Le bouton d'un token proche, avec le nom du token à côté ; tous les candidats pèsent autant. */
  function boutonDeProche(proposition: ReponseProposee, carte: CarteDeQuestion, groupe: GroupeDeQuestions, inactif: boolean): HTMLElement {
    const bouton = createButton({ label: proposition.libelle, variant: 'secondary', compact: true, disabled: inactif, onClick: () => repondreAuGroupe(groupe, proposition.reponse) });
    bouton.setAttribute('aria-label', T.repondre(proposition.libelle, carte.titreEnTexte));
    const ensemble = document.createElement('span');
    ensemble.className = 'question-candidat';
    const nom = document.createElement('code');
    nom.className = 'question-candidat-token';
    nom.textContent = proposition.token ?? '';
    ensemble.append(bouton, nom);
    return ensemble;
  }

  function creerLaCarte(groupe: GroupeDeQuestions, inactif: boolean): HTMLElement {
    const { carte } = groupe;
    const element = document.createElement('div');
    element.className = 'carte question question-proposition';
    const entete = document.createElement('div');
    entete.className = 'question-entete';
    const titre = document.createElement('span');
    titre.className = 'question-titre';
    poserLeTitre(titre, carte.titre);
    entete.append(titre);
    if (carte.origine !== null) {
      const origine = document.createElement('span');
      origine.className = 'origine';
      origine.textContent = carte.origine;
      entete.append(origine);
    }
    const meta = document.createElement('span');
    meta.className = 'meta';
    poserLeTexteEnrichi(meta, carte.meta);
    if (carte.indice !== null) meta.append(` ${carte.indice}`);
    const effet = document.createElement('div');
    effet.className = 'renommage';
    const ancien = document.createElement('span');
    ancien.className = 'ancien';
    poserLEffet(ancien, carte.ancien);
    const fleche = document.createElement('span');
    fleche.className = 'fleche';
    fleche.setAttribute('aria-hidden', 'true');
    fleche.textContent = '→';
    const nouveau = document.createElement('span');
    nouveau.className = 'nouveau';
    poserLEffet(nouveau, carte.nouveau);
    effet.append(document.createElement('span'), ancien, fleche, nouveau);

    const gauche = document.createElement('span');
    gauche.className = 'question-actions';
    if (carte.proche) {
      gauche.append(...[carte.principal, ...carte.autres].map((proposition) => boutonDeProche(proposition, carte, groupe, inactif)));
    } else {
      const principal = createButton({ label: carte.principal.libelle, variant: 'secondary', compact: true, disabled: inactif, onClick: () => repondreAuGroupe(groupe, carte.principal.reponse) });
      principal.setAttribute('aria-label', T.repondre(carte.principal.libelle, carte.titreEnTexte));
      gauche.append(principal, ...carte.autres.map((autre) => boutonTexte(autre.libelle, T.repondre(autre.libelle, carte.titreEnTexte), () => repondreAuGroupe(groupe, autre.reponse), inactif)));
    }
    const droite = document.createElement('span');
    droite.className = 'question-actions';
    droite.append(boutonTexte(T.plusTard, T.plusTardPour(carte.titreEnTexte), () => {
      for (const membre of groupe.cartes) plusTard.add(membre.id);
      rendre();
    }, inactif));
    const pied = document.createElement('div');
    pied.className = 'question-pied';
    pied.append(gauche, droite);
    element.append(entete, meta);
    if (groupe.cartes.length > 1) {
      const nombreDeVariants = document.createElement('span');
      nombreDeVariants.className = 'meta question-groupe';
      nombreDeVariants.textContent = T.repondrePourLes(groupe.cartes.length);
      element.append(nombreDeVariants);
    }
    if (carte.ancien.length > 0 || carte.nouveau.length > 0) element.append(effet);
    element.append(pied);
    return element;
  }

  /** La ligne verte d'une réponse, puis les deux gestes qui la suivent. */
  function creerLaReponse(groupe: GroupeDeQuestions, texte: string, inactif: boolean): HTMLElement[] {
    const { carte } = groupe;
    const actions = document.createElement('div');
    actions.className = 'constat-actions';
    actions.append(
      boutonTexte(T.ouvrirCorrections, null, options.ouvrirCorrections, inactif),
      boutonTexte(T.annulerLaReponse, T.annulerLaReponseDe(carte.titreEnTexte), () => { for (const membre of groupe.cartes) options.annuler(membre.id); }, inactif),
    );
    return [creerResultat(texte, T.appliquerDansCorrections), actions];
  }

  function rendre(): void {
    if (!entree) return;
    const { analyse, contexte } = entree;
    const cartes = analyse.constats
      .filter((constat) => estUneQuestion(constat) || (constat.question !== undefined && analyse.repondues[constat.question.id] !== undefined))
      .flatMap((constat) => {
        const carte = carteDeQuestion(constat, contexte);
        return carte ? [carte] : [];
      });
    restantes = cartes.filter((carte) => analyse.repondues[carte.id] === undefined).length;
    if (cartes.length === 0) {
      const note = document.createElement('p');
      note.className = 'meta';
      note.textContent = T.aucuneQuestion;
      hote.replaceChildren(note);
      return;
    }
    const groupes = regrouperLesCartes(cartes, analyse.repondues);
    const reportee = ({ carte }: GroupeDeQuestions): boolean => analyse.repondues[carte.id] === undefined && plusTard.has(carte.id);
    const liste = document.createElement('div');
    liste.className = 'liste liste-questions';
    for (const groupe of [...groupes.filter((candidate) => !reportee(candidate)), ...groupes.filter(reportee)]) {
      const reponse = analyse.repondues[groupe.carte.id];
      if (reponse !== undefined) liste.append(...creerLaReponse(groupe, groupe.carte.reponseEnTexte(reponse), analyse.perimee));
      else liste.append(creerLaCarte(groupe, analyse.perimee));
    }
    hote.replaceChildren(liste);
  }

  return {
    poser(suivante) {
      const nouvelle = `${suivante.analyse.identite.sujet}:${suivante.analyse.identite.generation}`;
      if (nouvelle !== identite) {
        identite = nouvelle;
        plusTard.clear();
      }
      entree = suivante;
      rendre();
    },
    nombre: () => restantes,
  };
}

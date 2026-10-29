/**
 * Les constats à faire dans Figma du panneau des constats : un constat par carte, puis les constats ignorés sous leur intertitre. Le
 * liseré, l'icône et le mot de la carte disent le type ; la phrase dit le problème, la ligne grise dit où il est et où le régler. Rien
 * ne s'écrit d'ici : le geste se fait dans Figma. Ouvrir une carte ne change pas la sélection : le bouton Sélectionner, dans la ligne
 * d'actions en bas d'une carte qui vise des layers, la change. Ignorer écarte le constat de la liste, Ne plus ignorer le rend ; une
 * limite de lecture n'a pas de bouton Ignorer. La carte d'un modèle (C81) passe aussi par ce module, avec « Proposer les liaisons » à la
 * place d'Ignorer et la liste des layers du modèle dans son corps. Le panneau choisit les cartes à montrer ; ce module les dessine.
 */
import { creerGravite, marquerDuTon } from 'ucm-plugin-socle/src/ui/Alerte';
import { createButton } from 'ucm-plugin-socle/src/ui/Button';
import { creerColonnes, creerLigneDeDiff } from 'ucm-plugin-socle/src/ui/Changement';
import { creerCheminEnPhrase } from 'ucm-plugin-socle/src/ui/Chemin';

import type { Constat } from '../../messages/commun';
import { analyseApplicable, type AnalyseRecue } from '../composant/analyse';
import { creerBoutonSelectionner, creerCarte, creerIntertitre, creerLigneDActions, creerMotCite } from '../structure/carte';
import { TEXTES } from '../textes';
import { TEXTES_PREPARATION } from '../textes/preparation';
import { cartesDAFaire, type CarteDAFaire, type ContexteDAFaire, type FaitDeCarte, type MesureDeCarte, type ModeleDeCarte } from './modele';
import { poserLeLieuEnrichi, poserLeTexteEnrichi } from './texte';

const T = TEXTES.aFaireDuComposant;

export interface OptionsDeAFaire {
  /** Sélectionne ces layers dans Figma. */
  readonly selectionner: (layers: readonly string[]) => void;
  /** Les layers que le plugin a sélectionnés depuis le dernier changement de sélection de Figma ; aucun par défaut. */
  readonly selectionnes?: () => readonly string[];
  /** Demande les liaisons du variant modèle d'un constat C81 : le sandbox les calcule sans rien écrire. */
  readonly proposer: (constat: Constat, variant: string) => void;
  readonly ignorer: (constat: Constat) => void;
  readonly nePlusIgnorer: (constat: Constat) => void;
  /** Appelée quand une carte s'ouvre ou se ferme : le panneau se redessine. */
  readonly redessiner: () => void;
}

export interface EntreeDeAFaire {
  readonly analyse: AnalyseRecue;
  readonly contexte: ContexteDAFaire;
}

export interface AFaire {
  /** Retient l'analyse et son contexte. */
  poser(entree: EntreeDeAFaire): void;
  /** Dessine ces cartes ; la note de mesure suit celles du contraste. */
  cartes(cartes: readonly CarteDAFaire[]): HTMLElement[];
  /** La carte du composant sans token. */
  carteSansTokens(): HTMLElement;
  /** Les constats ignorés, sous leur intertitre ; rien quand il n'y en a pas. */
  ignores(constats: readonly Constat[]): HTMLElement[];
}

function boutonTexte(libelle: string, nomAccessible: string, auClic: () => void, inactif: boolean): HTMLButtonElement {
  const bouton = document.createElement('button');
  bouton.type = 'button';
  bouton.className = 'btn-texte';
  bouton.textContent = libelle;
  bouton.setAttribute('aria-label', nomAccessible);
  bouton.disabled = inactif;
  bouton.addEventListener('click', auClic);
  return bouton;
}

export function monterAFaire(options: OptionsDeAFaire): AFaire {
  let identite = '';
  let entree: EntreeDeAFaire | null = null;
  const ouvertes = new Set<string>();

  /** La mesure d'un contraste : le rapport en gras, puis le seuil et les modes en gris. */
  function creerLaMesure(mesure: MesureDeCarte): HTMLElement {
    const paire = document.createElement('span');
    paire.className = 'paire';
    if (mesure.echantillon !== null) {
      const echantillon = document.createElement('span');
      echantillon.className = 'paire-echantillon';
      echantillon.style.color = mesure.echantillon.premierPlan;
      echantillon.style.background = mesure.echantillon.fond;
      echantillon.textContent = T.echantillon;
      paire.append(echantillon);
    }
    const rapport = document.createElement('b');
    rapport.textContent = mesure.rapport;
    const seuil = document.createElement('span');
    seuil.className = 'meta';
    seuil.textContent = T.seuilEtModes(mesure.seuil, mesure.modes);
    paire.append(rapport, seuil);
    return paire;
  }

  function creerLesFaits(faits: readonly FaitDeCarte[]): HTMLElement {
    const liste = document.createElement('div');
    liste.className = 'constat-faits';
    for (const fait of faits) {
      const ligne = document.createElement('div');
      ligne.className = 'constat-fait';
      const libelle = document.createElement('span');
      libelle.textContent = fait.libelle;
      const valeur = document.createElement('span');
      if ('mesure' in fait) valeur.append(creerLaMesure(fait.mesure));
      else if ('lignes' in fait) {
        const lignes = document.createElement('span');
        lignes.className = 'mesures';
        for (const texte of fait.lignes) {
          const ligneDeMode = document.createElement('span');
          ligneDeMode.textContent = texte;
          lignes.append(ligneDeMode);
        }
        valeur.append(lignes);
      } else valeur.textContent = fait.texte;
      ligne.append(libelle, valeur);
      liste.append(ligne);
    }
    return liste;
  }

  function entete(carte: CarteDAFaire): HTMLElement {
    const ligne = document.createElement('span');
    ligne.className = 'constat-entete';
    const phrase = document.createElement('span');
    phrase.className = 'bloc-phrase';
    poserLeTexteEnrichi(phrase, carte.phrase);
    ligne.append(creerGravite(carte.constat.type), phrase);
    return ligne;
  }

  /** La liste d'un modèle : chaque layer avec son champ, et le token qu'il porte dans le variant modèle. */
  function creerLaListeDuModele(modele: ModeleDeCarte): HTMLElement {
    const liste = document.createElement('div');
    liste.append(creerColonnes(T.modeleLayer, T.modeleToken, { avecCase: false }));
    for (const ligne of modele.lignes) {
      const layer = document.createDocumentFragment();
      layer.append(creerMotCite(ligne.layer), ` ${ligne.champ}`);
      liste.append(creerLigneDeDiff(layer, creerCheminEnPhrase(ligne.token), { coche: null }));
    }
    return liste;
  }

  function creerLaCarte(carte: CarteDAFaire, inactif: boolean): HTMLElement {
    const { constat, modele } = carte;
    const lieu = document.createElement('span');
    lieu.className = 'constat-lieu';
    poserLeLieuEnrichi(lieu, carte.lieu, entree?.contexte.variants ?? []);
    const meta: Node[] = carte.lieu.length === 0 ? [] : [lieu];
    if (carte.statut !== null) {
      const statut = document.createElement('span');
      statut.className = 'constat-statut';
      poserLeTexteEnrichi(statut, carte.statut);
      meta.push(...(meta.length > 0 ? [document.createElement('br')] : []), statut);
    }
    let corps: HTMLElement | null = null;
    if (modele) {
      if (modele.lignes.length > 0) corps = creerLaListeDuModele(modele);
    } else if (constat.limite !== true) {
      corps = document.createElement('div');
      if (carte.faits.length > 0) corps.append(creerLesFaits(carte.faits));
      const actions = document.createElement('div');
      actions.className = 'constat-actions';
      actions.append(boutonTexte(constat.layers.length === 1 ? T.ignorerCeLayer : T.ignorer, T.ignorerCeConstat(carte.phrase.replace(/`/g, '')), () => options.ignorer(constat), inactif));
      corps.append(actions);
    }
    const { element } = creerCarte({
      tete: [entete(carte)],
      meta,
      corps,
      deplie: ouvertes.has(constat.id),
      auBasculement: (ouvert) => {
        if (ouvert) ouvertes.add(constat.id);
        else ouvertes.delete(constat.id);
        options.redessiner();
      },
    });
    let proposer: HTMLButtonElement | null = null;
    if (modele) {
      proposer = createButton({ label: T.proposerLesLiaisons, variant: 'secondary', compact: true, disabled: inactif, onClick: () => {
        // Le sandbox calcule, puis la carte est remplacée : un second clic n'a rien à demander.
        if (proposer) proposer.disabled = true;
        options.proposer(constat, modele.variant);
      } });
      proposer.setAttribute('aria-label', T.proposerLesLiaisonsDe(carte.phrase.replace(/`/g, '')));
    }
    const actions = creerLigneDActions([proposer, creerBoutonSelectionner({
      layers: constat.layers,
      selectionnes: options.selectionnes?.() ?? [],
      phrase: carte.phrase.replace(/`/g, ''),
      inactif,
      selectionner: options.selectionner,
    })]);
    if (actions) element.append(actions);
    element.classList.add('bloc-constat');
    marquerDuTon(element, constat.type);
    return element;
  }

  function creerLaCarteIgnoree(carte: CarteDAFaire, inactif: boolean): HTMLElement {
    const meta = [T.ignoreDansCeFichier, boutonTexte(T.nePlusIgnorer, T.nePlusIgnorerCeConstat(carte.phrase.replace(/`/g, '')), () => options.nePlusIgnorer(carte.constat), inactif)];
    const { element } = creerCarte({ tete: [entete(carte)], meta, corps: null, deplie: false });
    element.classList.add('bloc-constat', 'muette');
    return element;
  }

  /** Le composant n'a aucun token : l'analyse le dit, aucun constat du kit ne le porte. La carte ne s'ouvre pas, rien n'est à ignorer. */
  function creerLaCarteSansTokens(analyse: AnalyseRecue, contexte: ContexteDAFaire): HTMLElement {
    const phrase = document.createElement('span');
    phrase.className = 'bloc-phrase';
    phrase.textContent = TEXTES_PREPARATION.preparationAlerteTexte(contexte.composant);
    const entetePhrase = document.createElement('span');
    entetePhrase.className = 'constat-entete';
    entetePhrase.append(creerGravite('corriger'), phrase);
    const [resume, prochaineEtape] = TEXTES_PREPARATION.preparationAlerteMeta(analyse.variants.length, analyse.lecture?.layersLus ?? contexte.layers.size, contexte.composant);
    const lieu = document.createElement('span');
    lieu.className = 'constat-lieu';
    lieu.textContent = resume;
    const suite = document.createElement('span');
    suite.textContent = prochaineEtape;
    const { element } = creerCarte({ tete: [entetePhrase], meta: [lieu, suite], corps: null, deplie: false });
    element.classList.add('bloc-constat');
    element.querySelector('.bloc-pile > .meta')?.classList.add('prep-meta');
    marquerDuTon(element, 'corriger');
    return element;
  }

  return {
    poser(suivante) {
      const nouvelle = `${suivante.analyse.identite.sujet}:${suivante.analyse.identite.generation}`;
      if (nouvelle !== identite) {
        identite = nouvelle;
        ouvertes.clear();
      }
      entree = suivante;
    },
    cartes(cartes) {
      if (!entree) return [];
      const inactif = !analyseApplicable(entree.analyse);
      const sortie = cartes.map((carte) => creerLaCarte(carte, inactif));
      const mesures = cartes.filter((carte) => carte.section === 'contraste');
      if (mesures.some((carte) => typeof carte.constat.faits.rapport === 'number')) {
        const note = document.createElement('p');
        note.className = 'meta';
        note.textContent = mesures.some((carte) => carte.constat.limite === true) ? T.noteDeMesureAvecLimite : T.noteDeMesure;
        sortie.push(note);
      }
      return sortie;
    },
    carteSansTokens: () => creerLaCarteSansTokens(entree!.analyse, entree!.contexte),
    ignores(constats) {
      if (!entree || constats.length === 0) return [];
      const { analyse, contexte } = entree;
      return [creerIntertitre(T.ignores), ...cartesDAFaire(constats, contexte).map((carte) => creerLaCarteIgnoree(carte, !analyseApplicable(analyse)))];
    },
  };
}

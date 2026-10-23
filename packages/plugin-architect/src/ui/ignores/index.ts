/**
 * L'onglet À faire dans Figma du panneau des constats : un constat par carte, sous l'intertitre de sa famille, puis les constats ignorés
 * sous leur intertitre. Le liseré, l'icône et le mot de la carte disent le type ; la phrase dit le problème, la ligne grise dit où il est
 * et où le régler. Rien ne s'écrit d'ici : le geste se fait dans Figma. Le clic sur une carte qui s'ouvre sélectionne ses layers. Ignorer
 * écarte le constat de la liste, Ne plus ignorer le rend ; une limite de lecture n'a pas de bouton Ignorer.
 */
import { creerGravite, marquerDuTon } from 'ucm-plugin-socle/src/ui/Alerte';

import type { Constat } from '../../messages/commun';
import type { AnalyseRecue } from '../composant/analyse';
import { creerCarte, creerIntertitre } from '../structure/carte';
import { TEXTES } from '../textes';
import { cartesDAFaire, estAFaire, SECTIONS_D_A_FAIRE, type CarteDAFaire, type ContexteDAFaire } from './modele';
import { poserLeTexteEnrichi } from './texte';

const T = TEXTES.aFaireDuComposant;

export interface OptionsDeAFaire {
  /** Sélectionne ces layers dans Figma. */
  readonly selectionner: (layers: readonly string[]) => void;
  readonly ignorer: (constat: Constat) => void;
  readonly nePlusIgnorer: (constat: Constat) => void;
}

export interface EntreeDeAFaire {
  readonly analyse: AnalyseRecue;
  readonly contexte: ContexteDAFaire;
}

export interface AFaire {
  /** Montre l'onglet pour cette analyse. */
  poser(entree: EntreeDeAFaire): void;
  /** Le nombre de constats qui restent à faire dans Figma. */
  nombre(): number;
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

export function monterAFaire(hote: HTMLElement, options: OptionsDeAFaire): AFaire {
  let identite = '';
  let entree: EntreeDeAFaire | null = null;
  let restants = 0;
  /** La carte que le designer vient d'ouvrir : le plugin a sélectionné ses layers. */
  let cible: string | null = null;
  const ouvertes = new Set<string>();

  function entete(carte: CarteDAFaire): HTMLElement {
    const ligne = document.createElement('span');
    ligne.className = 'constat-entete';
    const phrase = document.createElement('span');
    phrase.className = 'bloc-phrase';
    poserLeTexteEnrichi(phrase, carte.phrase);
    ligne.append(creerGravite(carte.constat.type), phrase);
    return ligne;
  }

  function creerLaCarte(carte: CarteDAFaire, inactif: boolean): HTMLElement {
    const { constat } = carte;
    const ciblee = cible === constat.id && constat.layers.length > 0;
    const lieu = document.createElement('span');
    lieu.className = 'constat-lieu';
    poserLeTexteEnrichi(lieu, carte.lieu);
    if (ciblee) {
      lieu.append('. ');
      const marque = document.createElement('span');
      marque.className = 'constat-selection';
      marque.textContent = TEXTES.correctionsDuComposant.ciblee;
      lieu.append(marque);
    }
    const meta: Node[] = [lieu];
    if (carte.statut !== null) {
      const statut = document.createElement('span');
      statut.className = 'constat-statut';
      poserLeTexteEnrichi(statut, carte.statut);
      meta.push(document.createElement('br'), statut);
    }
    let corps: HTMLElement | null = null;
    if (constat.limite !== true) {
      corps = document.createElement('div');
      const actions = document.createElement('div');
      actions.className = 'constat-actions';
      actions.append(boutonTexte(T.ignorer, T.ignorerCeConstat(carte.phrase.replace(/`/g, '')), () => options.ignorer(constat), inactif));
      corps.append(actions);
    }
    const { element } = creerCarte({
      tete: [entete(carte)],
      meta,
      corps,
      deplie: ouvertes.has(constat.id),
      auBasculement: (ouvert) => {
        if (ouvert) {
          ouvertes.add(constat.id);
          cible = constat.id;
          if (constat.layers.length > 0) options.selectionner(constat.layers);
        } else ouvertes.delete(constat.id);
        rendre();
      },
    });
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

  function rendre(): void {
    if (!entree) return;
    const { analyse, contexte } = entree;
    const aFaire = cartesDAFaire(analyse.constats.filter(estAFaire), contexte);
    const ignores = analyse.tous.filter((constat) => analyse.ignores.includes(constat.id));
    restants = aFaire.length;
    const liste = document.createElement('div');
    liste.className = 'liste';
    if (aFaire.length === 0 && ignores.length === 0) {
      const note = document.createElement('p');
      note.className = 'meta';
      note.textContent = T.rienAFaire;
      hote.replaceChildren(note);
      return;
    }
    for (const section of SECTIONS_D_A_FAIRE) {
      const deLaSection = aFaire.filter((carte) => carte.section === section);
      if (deLaSection.length === 0) continue;
      liste.append(creerIntertitre(T.intertitres[section]), ...deLaSection.map((carte) => creerLaCarte(carte, analyse.perimee)));
    }
    if (ignores.length > 0) {
      liste.append(creerIntertitre(T.ignores), ...cartesDAFaire(ignores, contexte).map((carte) => creerLaCarteIgnoree(carte, analyse.perimee)));
    }
    hote.replaceChildren(liste);
  }

  return {
    poser(suivante) {
      const nouvelle = `${suivante.analyse.identite.sujet}:${suivante.analyse.identite.generation}`;
      if (nouvelle !== identite) {
        identite = nouvelle;
        ouvertes.clear();
        cible = null;
      }
      entree = suivante;
      rendre();
    },
    nombre: () => restants,
  };
}

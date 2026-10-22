/**
 * Les pièces de la coquille qui touchent le DOM : le panneau d'un onglet, la
 * vue de l'analyse en cours et le bandeau du fichier modifié. Chaque lot
 * d'onglet monte son contenu dans `contenu` ; le panneau le masque quand un
 * état particulier prend sa place.
 */
import { createButton } from 'ucm-plugin-socle/src/ui/Button';
import type { EtatParticulier } from './etat';
import { TEXTES } from '../textes/nomenclature';

type EtatDePanneau = Exclude<EtatParticulier, { type: 'analyse-en-cours' }>;

export interface Panneau {
  /** Le panneau que `createOnglets` reçoit. */
  readonly element: HTMLElement;
  /** Là où le lot de l'onglet monte ses cartes ; masqué pendant un état particulier. */
  readonly contenu: HTMLElement;
  /** Montre l'état s'il fait partie de ceux du panneau, sinon rend la place au contenu. */
  poserEtat(particulier: EtatParticulier | null): void;
}

export interface OptionsDePanneau {
  /** Les états que ce panneau montre à la place de son contenu. */
  readonly etats: readonly EtatDePanneau['type'][];
  readonly relancer: () => void;
}

function vueDeLEtat(particulier: EtatDePanneau, relancer: () => void): HTMLElement {
  const vue = document.createElement('div');
  vue.className = 'etat';
  const titre = document.createElement('div');
  titre.className = 'etat-titre';
  vue.append(titre);
  if (particulier.type === 'rien-a-faire') {
    titre.textContent = TEXTES.rienAFaire;
    vue.append(createButton({ label: TEXTES.relancerLAnalyse, variant: 'secondary', compact: true, onClick: relancer }));
  } else {
    titre.textContent = TEXTES.sansVariableLocale;
    const explication = document.createElement('p');
    explication.className = 'etat-texte';
    explication.textContent = TEXTES.sansVariableLocaleExplication;
    vue.append(explication);
  }
  return vue;
}

export function creerPanneau({ etats, relancer }: OptionsDePanneau): Panneau {
  const element = document.createElement('div');
  element.className = 'page-stack';
  const contenu = document.createElement('div');
  contenu.className = 'page-stack';
  const etat = document.createElement('div');
  etat.hidden = true;
  element.append(etat, contenu);
  let typeMontre: EtatDePanneau['type'] | null = null;

  return {
    element,
    contenu,
    poserEtat(particulier) {
      const montre = particulier !== null && particulier.type !== 'analyse-en-cours' && etats.includes(particulier.type) ? particulier : null;
      contenu.hidden = montre !== null;
      etat.hidden = montre === null;
      // Un état déjà montré garde sa vue : le bouton ne perd pas le focus à chaque message.
      if ((montre?.type ?? null) === typeMontre) return;
      typeMontre = montre?.type ?? null;
      etat.replaceChildren(...(montre ? [vueDeLEtat(montre, relancer)] : []));
    },
  };
}

export interface VueDAnalyse {
  readonly element: HTMLElement;
  poser(lues: number, total: number): void;
}

/** La lecture des variables : un titre, une barre et le compte, sans total tant que le sandbox ne l'a pas donné. */
export function creerVueDAnalyse(): VueDAnalyse {
  const element = document.createElement('div');
  element.className = 'etat';
  const titre = document.createElement('div');
  titre.className = 'etat-titre';
  titre.textContent = TEXTES.analyseEnCours;
  const barre = document.createElement('div');
  barre.className = 'avancement';
  barre.setAttribute('role', 'progressbar');
  barre.setAttribute('aria-label', TEXTES.avancementDeLAnalyse);
  barre.setAttribute('aria-valuemin', '0');
  const rempli = document.createElement('div');
  rempli.className = 'avancement-rempli';
  barre.append(rempli);
  const compte = document.createElement('p');
  compte.className = 'etat-texte';
  element.append(titre, barre, compte);

  return {
    element,
    poser(lues, total) {
      const connu = total > 0;
      rempli.style.width = connu ? `${Math.min(100, Math.round((lues / total) * 100))}%` : '0%';
      barre.setAttribute('aria-valuemax', String(total));
      barre.setAttribute('aria-valuenow', String(lues));
      compte.hidden = !connu;
      compte.textContent = connu ? TEXTES.variablesLues(lues, total) : '';
    },
  };
}

/** Le bandeau d'un fichier modifié pendant que le plugin est ouvert, avec son action. */
export function creerBandeau(relancer: () => void): HTMLElement {
  const bandeau = document.createElement('div');
  bandeau.className = 'bandeau';
  bandeau.setAttribute('role', 'status');
  const texte = document.createElement('span');
  texte.textContent = TEXTES.fichierModifie;
  const action = document.createElement('button');
  action.type = 'button';
  action.className = 'bandeau-action';
  action.textContent = TEXTES.relancerLAnalyse;
  action.addEventListener('click', () => relancer());
  bandeau.append(texte, action);
  return bandeau;
}

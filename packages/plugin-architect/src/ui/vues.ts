/** Les blocs de l'écran : chacun se construit une fois, puis se met à jour à chaque analyse. */
import { CATEGORIES_DE_NOM, type CategorieDeNom, type ConventionsParCategorie } from '@ucm-kit/core/referentiel';
import { createButton } from 'ucm-plugin-socle/src/ui/Button';
import { createInterrupteur } from 'ucm-plugin-socle/src/ui/Interrupteur';
import {
  ecritureDeValeur, nombreDeNomsBloques, texteDeSelection,
  type Doublon, type GroupeDeRenommages, type LigneDEcriture,
} from './presentation';
import { TEXTES } from './textes';

function code(texte: string): HTMLElement {
  const element = document.createElement('code');
  element.textContent = texte;
  return element;
}

/** Un texte dont les mots entre accents graves passent en code. */
export function texteAvecCode(texte: string): DocumentFragment {
  const fragment = document.createDocumentFragment();
  texte.split('`').forEach((morceau, rang) => fragment.append(rang % 2 === 0 ? morceau : code(morceau)));
  return fragment;
}

export function creerEntete(): HTMLElement {
  const entete = document.createElement('header');
  entete.className = 'entete';
  const marque = document.createElement('strong');
  marque.textContent = TEXTES.marque;
  entete.append(marque);
  return entete;
}

/** Le titre-bilan reste en tête de la fenêtre quand la liste défile. */
export function creerBilan() {
  const element = document.createElement('div');
  element.className = 'bilan';
  const titre = document.createElement('h1');
  titre.className = 'page-title';
  const aide = document.createElement('p');
  aide.className = 'field-help';
  element.append(titre, aide);
  return {
    element,
    poser(texteDuTitre: string, texteDAide: string): void {
      titre.textContent = texteDuTitre;
      aide.textContent = texteDAide;
      aide.hidden = texteDAide === '';
    },
  };
}

/** L'écriture détectée par catégorie, l'écriture choisie, et le remplacement des termes UCM. */
export function creerCarteDEcriture(surChangement: () => void) {
  const element = document.createElement('section');
  element.className = 'carte';
  element.setAttribute('aria-labelledby', 'ecriture-titre');
  const titre = document.createElement('h2');
  titre.id = 'ecriture-titre';
  titre.textContent = TEXTES.ecriture.titre;
  const table = document.createElement('table');
  table.className = 'ecritures';
  const colonnes = table.createTHead().insertRow();
  for (const libelle of TEXTES.ecriture.colonnes) {
    const entete = document.createElement('th');
    entete.textContent = libelle;
    colonnes.append(entete);
  }
  const corps = table.createTBody();
  const listes = new Map<CategorieDeNom, HTMLSelectElement>();
  const detectees = new Map<CategorieDeNom, { texte: Text; compte: HTMLElement }>();
  for (const categorie of CATEGORIES_DE_NOM) {
    const ligne = corps.insertRow();
    const nom = TEXTES.ecriture.categories[categorie];
    ligne.insertCell().textContent = nom;
    const detection = ligne.insertCell();
    const texte = document.createTextNode('');
    const compte = document.createElement('small');
    compte.className = 'field-help';
    detection.append(texte, compte);
    detectees.set(categorie, { texte, compte });
    const liste = document.createElement('select');
    liste.className = 'input';
    liste.setAttribute('aria-label', TEXTES.ecriture.choix(nom));
    // `input` suit chaque choix comme `change`, et c'est l'événement que joue la galerie.
    liste.addEventListener('input', surChangement);
    ligne.insertCell().append(liste);
    listes.set(categorie, liste);
  }
  const termes = createInterrupteur('termes-ucm', TEXTES.termes.libelle, TEXTES.termes.exemple.split('`').join(''), surChangement);
  termes.element.querySelector('.field-help')?.replaceChildren(texteAvecCode(TEXTES.termes.exemple));
  element.append(titre, table, termes.element);
  return {
    element,
    afficher(lignes: readonly LigneDEcriture[], termesUcm: boolean): void {
      for (const ligne of lignes) {
        const liste = listes.get(ligne.categorie)!;
        liste.replaceChildren(...ligne.options.map((option) => new Option(option.libelle, option.valeur)));
        liste.value = ligne.choisie;
        const detectee = detectees.get(ligne.categorie)!;
        detectee.texte.data = ligne.detectee;
        detectee.compte.textContent = ligne.compte;
      }
      termes.poser(termesUcm);
    },
    lire(): { conventions: ConventionsParCategorie; termesUcm: boolean } {
      const conventions = Object.fromEntries(CATEGORIES_DE_NOM.map((categorie) => [categorie, ecritureDeValeur(listes.get(categorie)!.value)]));
      return { conventions, termesUcm: termes.bouton.getAttribute('aria-checked') === 'true' };
    },
    occuper(occupe: boolean): void {
      for (const liste of listes.values()) liste.disabled = occupe;
      termes.bouton.disabled = occupe;
    },
  };
}

function creerGroupe(groupe: GroupeDeRenommages, surCoche: () => void): HTMLElement {
  const element = document.createElement('details');
  element.className = 'groupe';
  element.open = true;
  const resume = document.createElement('summary');
  const toutCocher = document.createElement('input');
  toutCocher.type = 'checkbox';
  toutCocher.setAttribute('aria-label', TEXTES.liste.cocherLeGroupe(groupe.libelle));
  const intitule = document.createElement('span');
  intitule.textContent = TEXTES.liste.titreDeGroupe(groupe.libelle, groupe.lignes.length);
  resume.append(toutCocher, intitule);
  element.append(resume);
  const cases: HTMLInputElement[] = [];
  for (const ligne of groupe.lignes) {
    const etiquette = document.createElement('label');
    etiquette.className = 'ligne';
    if (ligne.contexte) etiquette.title = ligne.contexte;
    const coche = document.createElement('input');
    coche.type = 'checkbox';
    coche.value = ligne.id;
    const avant = document.createElement('span');
    const contexte = document.createElement('small');
    contexte.className = 'field-help';
    contexte.textContent = ligne.categorie;
    avant.append(code(ligne.ancien), contexte);
    const apres = document.createElement('span');
    apres.append(code(ligne.nouveau));
    etiquette.append(coche, avant, apres);
    element.append(etiquette);
    cases.push(coche);
    coche.addEventListener('change', () => {
      const cochees = cases.filter((item) => item.checked).length;
      toutCocher.checked = cochees === cases.length;
      toutCocher.indeterminate = cochees > 0 && cochees < cases.length;
      surCoche();
    });
  }
  toutCocher.addEventListener('change', () => {
    for (const coche of cases) coche.checked = toutCocher.checked;
    surCoche();
  });
  return element;
}

function creerDoublon(doublon: Doublon): HTMLElement {
  const element = document.createElement('div');
  element.className = 'doublon';
  for (const nom of doublon) {
    const phrase = document.createElement('p');
    phrase.append(code(nom.ancien), TEXTES.doublons.deviendrait, code(nom.nouveau), TEXTES.doublons.lieu[nom.categorie]);
    element.append(phrase);
  }
  const action = document.createElement('p');
  action.textContent = TEXTES.doublons.action;
  element.append(action);
  return element;
}

/** Les renommages proposés par raison, puis les noms qu'un doublon bloque. */
export function creerListe(surCoche: () => void) {
  const element = document.createElement('section');
  element.setAttribute('aria-label', TEXTES.liste.libelle);
  const titres = document.createElement('div');
  titres.className = 'ligne ligne-titres field-help';
  titres.setAttribute('aria-hidden', 'true');
  for (const libelle of ['', TEXTES.liste.ancien, TEXTES.liste.nouveau]) {
    const colonne = document.createElement('span');
    colonne.textContent = libelle;
    titres.append(colonne);
  }
  const groupes = document.createElement('div');
  const bloques = document.createElement('details');
  bloques.className = 'doublons';
  const resume = document.createElement('summary');
  const detail = document.createElement('div');
  bloques.append(resume, detail);
  element.append(titres, groupes, bloques);
  return {
    element,
    afficher(lots: readonly GroupeDeRenommages[], doublons: readonly Doublon[]): void {
      groupes.replaceChildren(...lots.map((lot) => creerGroupe(lot, surCoche)));
      titres.hidden = lots.length === 0;
      resume.textContent = TEXTES.doublons.resume(nombreDeNomsBloques(doublons));
      detail.replaceChildren(...doublons.map(creerDoublon));
      bloques.hidden = doublons.length === 0;
      bloques.open = false;
      element.hidden = lots.length === 0 && doublons.length === 0;
    },
    cochees(): string[] {
      return Array.from(element.querySelectorAll<HTMLInputElement>('.ligne input:checked'), (coche) => coche.value);
    },
    occuper(occupe: boolean): void {
      element.querySelectorAll('input').forEach((coche) => { coche.disabled = occupe; });
    },
  };
}

/** Le compte des noms cochés et le geste qui les applique. */
export function creerPied(surApplication: () => void) {
  const element = document.createElement('footer');
  element.className = 'pied';
  const compte = document.createElement('span');
  compte.setAttribute('aria-live', 'polite');
  const appliquer = createButton({ label: TEXTES.pied.appliquer, onClick: surApplication, disabled: true });
  appliquer.id = 'appliquer';
  element.append(compte, appliquer);
  return {
    element,
    poser(cochees: number, occupe: boolean): void {
      compte.textContent = texteDeSelection(cochees);
      appliquer.disabled = occupe || cochees === 0;
    },
  };
}

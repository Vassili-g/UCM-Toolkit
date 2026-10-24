/**
 * Les pièces du panneau des constats du mode Composant : la puce du sommaire, la bande d'une section, la section tenue et l'en-tête des
 * Bloquants. Le modèle (`elements.ts`) dit quoi montrer ; ce module en pose le DOM, et ne garde aucun état.
 *
 * Le chevron d'une bande suit la règle du socle : à droite replié, vers le bas ouvert, sous `aria-expanded`.
 */
import { creerIcone, libelleDuType } from 'ucm-plugin-socle/src/ui/Alerte';
import { creerChevron } from 'ucm-plugin-socle/src/ui/Chevron';
import { creerSigne, type TailleDeSigne } from 'ucm-plugin-socle/src/ui/Signe';

import type { ElementChoisi } from '../etat';
import { TEXTES } from '../textes';
import { SIGNE_DE_L_ELEMENT, type ElementDuPanneau, type IdDElement } from './elements';

const T = TEXTES.elementsDuPanneau;

/** Le signe d'un élément, 14 px dans une puce et 24 px dans une bande. `informe` le teinte ; les couleurs prennent l'arc-en-ciel des couleurs. */
export function signeDeLElement(id: IdDElement, taille: TailleDeSigne, informe = true): HTMLElement {
  // `type-color` appartient aux types de Figma, sans teinte : l'usage d'une couleur le reprend pour porter l'arc-en-ciel.
  return creerSigne(SIGNE_DE_L_ELEMENT[id], { taille, informe, ...(id === 'couleurs' ? { famille: 'usage-couleur' } : {}) });
}

function puce(id: ElementChoisi, libelle: string, points: number, bloquant: boolean, actif: boolean, choisir: (id: ElementChoisi) => void): HTMLElement {
  const bouton = document.createElement('button');
  bouton.type = 'button';
  bouton.className = 'puce-element';
  if (actif) bouton.classList.add('actif');
  bouton.dataset.element = id;
  bouton.setAttribute('aria-pressed', String(actif));
  bouton.setAttribute('aria-label', T.nomDeLaPuce(libelle, points, bloquant ? libelleDuType('bloquant') : null));
  if (id !== 'tout') bouton.append(signeDeLElement(id, 14));
  const nom = document.createElement('span');
  nom.textContent = libelle;
  bouton.append(nom);
  if (bloquant) bouton.append(creerIcone('bloquant'));
  const nombre = document.createElement('span');
  nombre.className = 'nombre';
  nombre.textContent = String(points);
  bouton.append(nombre);
  bouton.addEventListener('click', () => choisir(id));
  return bouton;
}

/** « Tout », puis une puce par élément qui a des points ; les éléments tenus n'ont pas de puce. */
export function creerSommaire(elements: readonly ElementDuPanneau[], choisi: ElementChoisi, choisir: (id: ElementChoisi) => void): HTMLElement {
  const sommaire = document.createElement('div');
  sommaire.className = 'sommaire-elements';
  sommaire.setAttribute('role', 'group');
  sommaire.setAttribute('aria-label', T.etiquetteDuSommaire);
  const total = elements.reduce((somme, element) => somme + element.points, 0);
  sommaire.append(
    puce('tout', T.tout, total, false, choisi === 'tout', choisir),
    ...elements.map((element) => puce(element.id, T.libelles[element.id], element.points, element.bloquant, choisi === element.id, choisir)),
  );
  return sommaire;
}

export interface OptionsDeSection {
  readonly ouverte: boolean;
  readonly basculer: (ouverte: boolean) => void;
  /** Ce que la section montre ouverte : ses cartes. */
  readonly corps: () => readonly HTMLElement[];
}

/** Une section : sa bande (signe, titre, nombre de points, chevron) et, ouverte, ses cartes. */
export function creerSection(element: ElementDuPanneau, { ouverte, basculer, corps }: OptionsDeSection): HTMLElement {
  const section = document.createElement('div');
  section.className = 'section-element';
  section.dataset.element = element.id;
  const bande = document.createElement('button');
  bande.type = 'button';
  bande.className = 'bande-element';
  bande.setAttribute('aria-expanded', String(ouverte));
  bande.setAttribute('aria-label', T.nomDeLaBande(T.libelles[element.id], element.points));
  const titre = document.createElement('span');
  titre.className = 'titre';
  titre.textContent = T.libelles[element.id];
  const nombre = document.createElement('span');
  nombre.className = 'nombre';
  nombre.textContent = String(element.points);
  bande.append(signeDeLElement(element.id, 24), titre, nombre, creerChevron());
  bande.addEventListener('click', () => basculer(!ouverte));
  section.append(bande);
  if (ouverte) section.append(...corps());
  return section;
}

/** Un élément sans point : signe gris, titre en couleur secondaire, la coche Tenu seule. */
export function creerSectionTenue(id: IdDElement): HTMLElement {
  const section = document.createElement('div');
  section.className = 'section-element';
  section.dataset.element = id;
  const bande = document.createElement('div');
  bande.className = 'bande-element tenue';
  bande.setAttribute('role', 'group');
  bande.setAttribute('aria-label', T.nomDeLaBandeTenue(T.libelles[id], libelleDuType('tenu')));
  const titre = document.createElement('span');
  titre.className = 'titre';
  titre.textContent = T.libelles[id];
  bande.append(signeDeLElement(id, 24, false), titre, creerIcone('tenu'));
  section.append(bande);
  return section;
}

/** Les cartes Bloquant, en tête de « Tout », hors de toute section. */
export function creerEnTeteDesBloquants(cartes: readonly HTMLElement[]): HTMLElement {
  const enTete = document.createElement('div');
  enTete.className = 'en-tete-bloquants';
  enTete.setAttribute('role', 'group');
  enTete.setAttribute('aria-label', T.enTeteDesBloquants);
  enTete.append(...cartes);
  return enTete;
}

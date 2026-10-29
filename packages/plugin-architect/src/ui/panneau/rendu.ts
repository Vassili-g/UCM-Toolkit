/**
 * Les pièces du panneau des constats du mode Composant : la puce du sommaire, la bande d'une section, la section tenue, l'en-tête des
 * Bloquants et la section Informations. Le modèle (`elements.ts`) dit quoi montrer ; ce module en pose le DOM, et ne garde aucun état.
 *
 * Le chevron d'une bande suit la règle du socle : à droite replié, vers le bas ouvert, sous `aria-expanded`.
 */
import { creerIcone, libelleDuType } from 'ucm-plugin-socle/src/ui/Alerte';
import { creerChevron } from 'ucm-plugin-socle/src/ui/Chevron';
import { creerSigne, type TailleDeSigne } from 'ucm-plugin-socle/src/ui/Signe';

import type { VariantDuJeu } from '../composant/variants';
import type { ElementChoisi } from '../etat';
import { poserLeLieuEnrichi, poserLeTexteEnrichi } from '../ignores/texte';
import { creerBoutonSelectionner, creerLigneDActions } from '../structure/carte';
import { TEXTES } from '../textes';
import { SIGNE_DE_L_ELEMENT, type ElementDuPanneau, type IdDElement } from './elements';
import type { LigneDInformation } from './informations';

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

export interface OptionsDeLaLigneDInformation {
  /** Les variants du jeu, pour les puces de la ligne de lieu. */
  readonly variants: readonly VariantDuJeu[];
  /** Les layers que le plugin a sélectionnés depuis le dernier changement de sélection de Figma. */
  readonly selectionnes: readonly string[];
  readonly inactif: boolean;
  readonly selectionner: (layers: readonly string[]) => void;
}

/** Une ligne d'information : la phrase, la ligne de lieu à droite, Sélectionner dessous quand elle vise des layers. Ni liseré, ni sévérité, ni chevron. */
export function creerLigneDInformation({ constat, phrase, lieu }: LigneDInformation, { variants, selectionnes, inactif, selectionner }: OptionsDeLaLigneDInformation): HTMLElement {
  const ligne = document.createElement('div');
  ligne.className = 'info-ligne';
  const texte = document.createElement('span');
  texte.className = 'info-texte';
  poserLeTexteEnrichi(texte, phrase);
  ligne.append(texte);
  if (lieu.length > 0) {
    const endroit = document.createElement('span');
    endroit.className = 'info-lieu';
    poserLeLieuEnrichi(endroit, lieu, variants);
    ligne.append(endroit);
  }
  const actions = creerLigneDActions([creerBoutonSelectionner({ layers: constat.layers, selectionnes, phrase: phrase.replace(/`/g, ''), inactif, selectionner })]);
  if (actions) {
    actions.classList.add('info-actions');
    ligne.append(actions);
  }
  return ligne;
}

export interface OptionsDeLaSectionInformations {
  readonly ouverte: boolean;
  readonly basculer: (ouverte: boolean) => void;
  readonly lignes: () => readonly HTMLElement[];
  /** Le nombre de lignes, que la bande dit. */
  readonly nombre: number;
}

/**
 * La section Informations : une bande au signe gris de la note, avec le nombre de lignes, puis les lignes quand elle est ouverte. Elle
 * n'est pas un élément du composant : ni puce, ni point. Même chevron que les autres bandes.
 */
export function creerSectionInformations({ ouverte, basculer, lignes, nombre }: OptionsDeLaSectionInformations): HTMLElement {
  const section = document.createElement('div');
  section.className = 'section-element section-informations';
  section.dataset.element = 'informations';
  const bande = document.createElement('button');
  bande.type = 'button';
  bande.className = 'bande-element';
  bande.setAttribute('aria-expanded', String(ouverte));
  const titre = document.createElement('span');
  titre.className = 'titre';
  titre.textContent = TEXTES.informationsDuPanneau.titre;
  const compte = document.createElement('span');
  compte.className = 'nombre';
  compte.textContent = String(nombre);
  bande.append(creerSigne('information', { taille: 24 }), titre, compte, creerChevron());
  bande.addEventListener('click', () => basculer(!ouverte));
  section.append(bande);
  if (ouverte) section.append(...lignes());
  return section;
}

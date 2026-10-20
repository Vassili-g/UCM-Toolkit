/**
 * Le rendu d'une valeur : pastille de couleur, texte exact et statut d'une
 * chaîne qui n'aboutit pas. Les noms et valeurs externes passent par
 * `textContent`, jamais par du HTML. Une couleur n'entre dans une propriété
 * CSS qu'après validation de ses composantes.
 */
import { nomComplet } from '../copie';
import { versSrgb } from '../espace';
import type { Index } from '../indexation';
import { espaceDuReleve, pourcentageDOpacite, texteDeValeur, type Couleur, type EspaceDuReleve, type ValeurSource, type ValeurTerminale } from '../modele';
import type { Resultat } from '../resolution';
import { TEXTES } from './textes';

const composanteValide = (composante: number): boolean => Number.isFinite(composante) && composante >= 0 && composante <= 1;

/** La couleur CSS d'une couleur rangée, ou `null` quand une composante sort de [0, 1]. */
export function couleurCss(couleur: Couleur, espace: EspaceDuReleve = 'srgb'): string | null {
  if (![couleur.r, couleur.g, couleur.b, couleur.a].every(composanteValide)) return null;
  const affichee = versSrgb(couleur, espace).couleur;
  const canal = (composante: number) => Math.round(composante * 255);
  return `rgba(${canal(affichee.r)}, ${canal(affichee.g)}, ${canal(affichee.b)}, ${affichee.a})`;
}

/**
 * La pastille d'une couleur, sur un damier quand elle est transparente. Le
 * contour d'une couleur opaque se tire de cette couleur : une couleur sombre
 * garde un contour sombre sur l'écran sombre. Une couleur transparente garde
 * le contour commun, qui cadre le damier.
 */
export function pastille(couleur: Couleur, espace: EspaceDuReleve = 'srgb'): HTMLSpanElement {
  const element = document.createElement('span');
  element.className = 'pastille';
  element.setAttribute('aria-hidden', 'true');
  const remplissage = document.createElement('span');
  remplissage.className = 'pastille-remplissage';
  const css = couleurCss(couleur, espace);
  if (css) remplissage.style.background = css;
  if (css && couleur.a === 1) {
    element.classList.add('pastille-opaque');
    element.style.setProperty('--pastille-couleur', css);
  }
  element.append(remplissage);
  return element;
}

/** Le texte affiché d'une valeur terminale : la chaîne vide se nomme, rien n'est omis. */
export function texteAffiche(valeur: ValeurTerminale, espace: EspaceDuReleve = 'srgb'): string {
  if (valeur.nature === 'texte' && valeur.texte === '') return TEXTES.chaineVide;
  return texteDeValeur(valeur, espace);
}

/** Une valeur terminale : pastille éventuelle et texte. `sansPastille` laisse la pastille à l'alias voisin. */
export function rendreValeur(valeur: ValeurTerminale, sansPastille = false, espace: EspaceDuReleve = 'srgb'): HTMLSpanElement {
  const element = document.createElement('span');
  element.className = 'valeur';
  if (valeur.nature === 'couleur' && !sansPastille) element.append(pastille(valeur.couleur, espace));
  const texte = document.createElement('span');
  texte.className = 'valeur-texte';
  texte.classList.toggle('valeur-vide', valeur.nature === 'texte' && valeur.texte === '');
  texte.textContent = valeur.nature === 'non-prise-en-charge' ? TEXTES.nonPrisEnCharge : texteAffiche(valeur, espace);
  element.append(texte);
  return element;
}

/** Le résultat d'une chaîne : sa valeur, ou le nom de son statut. */
export function rendreResultat(resultat: Resultat, sansPastille = false, espace: EspaceDuReleve = 'srgb'): HTMLSpanElement {
  if (resultat.statut === 'resolu') return rendreValeur(resultat.valeur, sansPastille, espace);
  const element = document.createElement('span');
  element.className = 'statut-echec';
  element.textContent = TEXTES.statut[resultat.statut];
  return element;
}

/** Le nom lisible d'une cible : `Collection / nom`, ou l'identifiant d'une cible non lue. */
export function nomDeCible(index: Index, id: string): string {
  return index.variables.has(id) ? nomComplet(index, id) : TEXTES.cibleInconnue(id);
}

/**
 * Une valeur dans un contexte, sur une ligne. Une valeur directe s'affiche
 * seule. Un alias devient un bouton qui suit la cible et porte la pastille de
 * la couleur rendue ; ce que la chaîne rend le suit, en texte secondaire.
 * Une chaîne qui n'aboutit pas montre son statut à la place.
 *
 * `data-chaine` désigne la variable dont le survol montre la chaîne.
 */
export function rendreValeurResolue(index: Index, source: ValeurSource | undefined, resultat: Resultat, suivre: (cible: string) => void, survol: { variable: string; mode: string }): HTMLSpanElement {
  const element = document.createElement('span');
  element.className = 'valeur-resolue';
  const estAlias = source?.nature === 'alias';
  const espace = espaceDuReleve(index.releve);
  if (source?.nature === 'alias') {
    const cible = source.cible;
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'alias';
    const nom = nomDeCible(index, cible);
    if (resultat.statut === 'resolu' && resultat.valeur.nature === 'couleur') bouton.append(pastille(resultat.valeur.couleur, espace));
    const libelle = document.createElement('span');
    libelle.className = 'alias-nom';
    libelle.textContent = index.variables.get(cible)?.nom ?? nom;
    bouton.append(libelle);
    if (source.opacite !== undefined) {
      const opacite = document.createElement('span');
      opacite.className = 'alias-opacite';
      opacite.textContent = pourcentageDOpacite(source.opacite);
      opacite.title = TEXTES.opaciteDeLAlias(pourcentageDOpacite(source.opacite));
      bouton.append(opacite);
    }
    bouton.title = nom;
    bouton.setAttribute('aria-label', TEXTES.suivreAlias(nom));
    bouton.dataset.chaine = survol.variable;
    bouton.dataset.mode = survol.mode;
    bouton.addEventListener('click', () => suivre(cible));
    element.append(bouton);
  } else if (source && resultat.statut !== 'resolu') {
    element.append(rendreValeur(source, false, espace));
  }
  const rendu = rendreResultat(resultat, estAlias, espace);
  rendu.classList.toggle('valeur-rendue', estAlias);
  rendu.dataset.chaine = survol.variable;
  rendu.dataset.mode = survol.mode;
  rendu.tabIndex = -1;
  element.append(rendu);
  return element;
}

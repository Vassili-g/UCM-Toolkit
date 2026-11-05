/**
 * L'opérateur V de F5 : les valeurs d'axe, leur forme et leur casse (C7 à C13) sur P0. V1 renomme une valeur dans les variants, V2
 * en ajoute une, V3 change la casse d'un côté, V4 écrit une forme tolérée, V5 oppose une écriture attestée à son token UCM.
 *
 * Selon Q-F5-6, les variants de P0 écrivent les tailles en toutes lettres (`Small`, `Medium`, `Large`) et ses tokens par leur identifiant
 * (`sm`, `md`, `lg`). V4 écrit donc ses trois tailles tolérées `small`, `medium` et `large` dans le token : C10 les ramène à `sm`, `md`
 * et `lg`. V5 oppose les écritures attestées d'une taille (`S`, `Extra Large`, `Middle`) à ce que le token écrit.
 */
import { c8, c10, casDegrade, Numerotation, type CasDeVariants, type Degradation } from './cas.js';
import { AXES_DE_P0 } from './composantDeBase.js';
import type { ComposantDeBase } from './portF3.js';

const majuscule = (texte: string): string => texte.charAt(0).toUpperCase() + texte.slice(1);

/** Chaque valeur de P0, avec son axe, dans l'ordre des axes. */
const VALEURS_DE_P0: readonly (readonly [axe: string, valeur: string])[] = AXES_DE_P0.flatMap((axe) => axe.valeurs.map((valeur) => [axe.nom, valeur] as const));

const MOT_NEUF: Readonly<Record<string, string>> = { Style: 'Ghost', Color: 'Destructive', Size: 'Compact', State: 'Idle' };

/** V1 : une valeur renommée dans les variants, le token gardant l'ancien nom. */
function valeurRenommee(base: ComposantDeBase, numero: Numerotation): CasDeVariants[] {
  return VALEURS_DE_P0.map(([axe, valeur]) => casDegrade(base, {
    id: numero.prochain('V1'), operateur: 'V1', ...(axe === 'Size' ? { hypothese: 'H5' } : {}),
    description: `${axe} : ${valeur} devient ${MOT_NEUF[axe]} dans les variants, les tokens gardent ${valeur}`,
    zones: [{ axe, valeur }], degrader: (d) => d.renommerLaValeur(axe, valeur, MOT_NEUF[axe]),
  }));
}

const VALEUR_AJOUTEE: readonly (readonly [axe: string, valeur: string])[] = [['Color', 'Tertiary'], ['Size', 'Extra Large'], ['State', 'focus'], ['Style', 'dashed']];

/** V2 : une valeur neuve, ses variants créés sur le modèle de ceux de la première valeur de l'axe, aucun token pour elle. */
function valeurAjoutee(base: ComposantDeBase, numero: Numerotation): CasDeVariants[] {
  return VALEUR_AJOUTEE.map(([axe, valeur]) => casDegrade(base, {
    id: numero.prochain('V2'), operateur: 'V2', ...(axe === 'Size' ? { hypothese: 'H5' } : {}),
    description: `${axe} : la valeur ${valeur} s'ajoute avec ses variants, sans token`,
    zones: [{ axe, valeur }],
    degrader: (d) => {
      const propriete = d.propriete(axe);
      const modele = propriete.valeurs![0];
      const copies = d.variantsOu({ [axe]: modele });
      d.inserer(propriete.valeurs!, valeur);
      for (const variant of copies) d.copierLeVariant(variant, { [axe]: valeur });
    },
  }));
}

const minuscule = (texte: string): string => texte.charAt(0).toLowerCase() + texte.slice(1);
/** L'autre casse de l'initiale : un variant déjà capitalisé (`Small`) passe en minuscules, les autres prennent la majuscule. */
const autreCasse = (texte: string): string => (texte === majuscule(texte) ? minuscule(texte) : majuscule(texte));

/**
 * V3 : la casse d'un côté seulement (Q-F5-5). Les 12 premiers cas changent la casse de l'initiale du variant, les 12 suivants celle du
 * token. Un terme connu (état, taille, palette) ne donne aucun constat, un style hors registre donne C9.
 */
function casseDifferente(base: ComposantDeBase, numero: Numerotation): CasDeVariants[] {
  const variantAutreCasse = VALEURS_DE_P0.map(([axe, valeur]) => casDegrade(base, {
    id: numero.prochain('V3'), operateur: 'V3', hypothese: 'H6',
    description: `${axe} : le variant écrit ${autreCasse(valeur)}, le token garde sa forme de ${valeur}`,
    zones: [{ axe, valeur }], degrader: (d) => d.renommerLaValeur(axe, valeur, autreCasse(valeur)),
  }));
  const tokenCapitalise = VALEURS_DE_P0.map(([axe, valeur]) => casDegrade(base, {
    id: numero.prochain('V3'), operateur: 'V3', hypothese: 'H6',
    description: `${axe} : le token écrit la valeur ${valeur} avec une majuscule, le variant garde ${valeur}`,
    zones: [{ axe, valeur }], degrader: (d) => d.reecrireLeSegment(axe, valeur, majuscule),
  }));
  return [...variantAutreCasse, ...tokenCapitalise];
}

/** `focused` n'a pas de valeur à P0 : le cas renomme d'abord `hover` en `focus`, dans les variants et dans les tokens. */
const versFocus = (d: Degradation): void => {
  d.renommerLaValeur('State', 'hover', 'focus');
  d.reecrireLeSegment('State', 'hover', () => 'focus');
};

interface EtatToleree { readonly token: string; readonly valeur: string; readonly canonique: string; readonly avecFocus?: true }

const ETATS_TOLERES: readonly EtatToleree[] = [
  { token: 'hovered', valeur: 'hover', canonique: 'hover' },
  { token: 'focused', valeur: 'hover', canonique: 'focus', avecFocus: true },
  { token: 'press', valeur: 'pressed', canonique: 'pressed' },
  { token: 'disable', valeur: 'disabled', canonique: 'disabled' },
  { token: 'rest', valeur: 'default', canonique: 'default' },
  { token: 'normal', valeur: 'default', canonique: 'default' },
];

const TAILLES_TOLEREES: readonly (readonly [valeur: string, ecrite: string, canonique: string])[] = [['Small', 'small', 'sm'], ['Medium', 'medium', 'md'], ['Large', 'large', 'lg']];
const FAMILLES_TOLEREES = ['Colors', 'Colour', 'Colours'] as const;
const PALETTES_TOLEREES = ['error', 'critical'] as const;

/** V4 : une forme tolérée, dans le token (état, taille, famille, palette) ou dans la valeur du variant. */
function formeToleree(base: ComposantDeBase, numero: Numerotation): CasDeVariants[] {
  const dansLeToken = ETATS_TOLERES.map(({ token, valeur, canonique, avecFocus }) => casDegrade(base, {
    id: numero.prochain('V4'), operateur: 'V4',
    description: `State : les tokens de ${valeur} s'écrivent ${token}${avecFocus ? ' après le renommage de hover en focus' : ''}`,
    zones: [{ axe: 'State', valeur }],
    degrader: (d) => {
      if (avecFocus) versFocus(d);
      d.reecrireLeSegment('State', valeur, () => token);
    },
    attendus: [c8(token, canonique)],
  }));
  const taillesDansLeToken = TAILLES_TOLEREES.map(([valeur, ecrite, canonique]) => casDegrade(base, {
    id: numero.prochain('V4'), operateur: 'V4',
    description: `Size : les tokens de ${valeur} s'écrivent ${ecrite} au lieu de ${canonique}, l'abréviation du token`,
    zones: [{ axe: 'Size', valeur }], degrader: (d) => d.reecrireLeSegment('Size', valeur, () => ecrite),
    attendus: [c10(ecrite, canonique)],
  }));
  const familles = FAMILLES_TOLEREES.map((famille) => casDegrade(base, {
    id: numero.prochain('V4'), operateur: 'V4',
    description: `la famille des tokens de couleur s'écrit ${famille}`,
    zones: [], ...(famille === 'Colours' ? { verdict: 'mesure' as const, question: 'Q-F5-8', hypothese: 'H11' } : {}),
    degrader: (d) => { for (const variable of d.jetons({ nature: 'couleur' })) d.renommerLeSegment(variable, 1, famille); },
    attendus: [c8(famille, 'color')],
  }));
  const palettes = PALETTES_TOLEREES.map((palette) => casDegrade(base, {
    id: numero.prochain('V4'), operateur: 'V4', hypothese: 'H7',
    description: `Color : les tokens de danger s'écrivent ${palette}`,
    zones: [{ axe: 'Color', valeur: 'danger' }], degrader: (d) => d.reecrireLeSegment('Color', 'danger', () => palette),
    attendus: [c8(palette, 'danger')],
  }));
  const dansLaValeur = ETATS_TOLERES.map(({ token, valeur, avecFocus }) => casDegrade(base, {
    id: numero.prochain('V4'), operateur: 'V4', verdict: 'mesure', question: 'Q-F5-5',
    description: `State : le variant écrit ${token} pour ${avecFocus ? 'focus' : valeur}, les tokens sont canoniques`,
    zones: [{ axe: 'State', valeur }],
    degrader: (d) => {
      if (avecFocus) versFocus(d);
      d.renommerLaValeur('State', avecFocus ? 'focus' : valeur, token);
    },
  }));
  return [...dansLeToken, ...taillesDansLeToken, ...familles, ...palettes, ...dansLaValeur];
}

interface TailleAttestee { readonly valeur: string; readonly attestee: string; readonly token: string }

/**
 * Q-F5-6 : un variant écrit une taille en toutes lettres, un token par son identifiant. `S`, `M`, `L`, `XL` et `Middle` dans un variant
 * reçoivent une correction vers le mot entier ; `s`, `m`, `l`, `extra-large` et `middle` dans un token reçoivent C10 vers l'identifiant.
 * `xl` est l'identifiant, donc le token `xl` est tenu. L'oracle vient du modèle de référence.
 */
const TAILLES_ATTESTEES: readonly TailleAttestee[] = [
  { valeur: 'Small', attestee: 'S', token: 's' },
  { valeur: 'Medium', attestee: 'M', token: 'm' },
  { valeur: 'Large', attestee: 'L', token: 'l' },
  { valeur: 'Large', attestee: 'XL', token: 'xl' },
  { valeur: 'Large', attestee: 'Extra Large', token: 'extra-large' },
  { valeur: 'Medium', attestee: 'Middle', token: 'middle' },
];

/** V5 : le variant écrit la taille comme le design system, le token la met en minuscules et en tirets. */
function tailleAttestee(base: ComposantDeBase, numero: Numerotation): CasDeVariants[] {
  return TAILLES_ATTESTEES.map(({ valeur, attestee, token }) => casDegrade(base, {
    id: numero.prochain('V5'), operateur: 'V5', hypothese: 'H6',
    description: `Size : le variant ${valeur} s'écrit ${attestee}, les tokens ${token}`,
    zones: [{ axe: 'Size', valeur }],
    degrader: (d) => {
      d.renommerLaValeur('Size', valeur, attestee);
      d.reecrireLeSegment('Size', valeur, () => token);
    },
  }));
}

/** V (66) : 12 valeurs renommées, 4 ajoutées, 24 casses, 20 formes tolérées, 6 tailles attestées. */
export function operateursValeurs(base: ComposantDeBase, _graine: number): CasDeVariants[] {
  const numero = new Numerotation();
  return [...valeurRenommee(base, numero), ...valeurAjoutee(base, numero), ...casseDifferente(base, numero), ...formeToleree(base, numero), ...tailleAttestee(base, numero)];
}

/**
 * Les dix-neuf paires de la table des emplois, et leurs dix associations
 * (section 11.2 de la spécification d'UCM Palettes). Une paire se juge contre
 * un minimum de texte ou d'élément graphique ; ce module ne juge rien, il dit
 * quels membres se font face.
 */
import { EMPLOIS, EMPLOIS_FACULTATIFS, TABLE_DES_EMPLOIS, emploiPresent, type Emploi } from './emplois.js';

/** Le rang d'un membre : 0 au repos, puis un cran de plus par rang, jusqu'à `active-hover`. */
export type Decalage = 0 | 1 | 2 | 3;

/** Un membre de paire : un emploi, avancé de `decalage` crans, ou le fond de référence du thème. */
export type MembrePaire = { readonly emploi: Emploi; readonly decalage: Decalage } | { readonly fond: true };

export interface Paire {
  readonly numero: number;
  readonly premier: MembrePaire;
  readonly second: MembrePaire;
  readonly seuil: 'texte' | 'nonTexte';
}

const emploi = (nom: Emploi, decalage: Decalage = 0): MembrePaire => ({ emploi: nom, decalage });
const FOND: MembrePaire = { fond: true };

/**
 * Les dix-neuf paires, dans leur ordre. 15 et 16 jugent ce qu'une carte
 * porte ; 17 à 19, le quatrième rang, suivent les seize autres pour que les
 * numéros 1 à 16 cités par les rapports ne bougent pas.
 */
export const PAIRES: readonly Paire[] = [
  { numero: 1, premier: emploi('text'), second: FOND, seuil: 'texte' },
  { numero: 2, premier: emploi('text'), second: emploi('surface'), seuil: 'texte' },
  { numero: 3, premier: emploi('text', 1), second: emploi('surface', 1), seuil: 'texte' },
  { numero: 4, premier: emploi('text', 2), second: emploi('surface', 2), seuil: 'texte' },
  { numero: 5, premier: emploi('on-solid'), second: emploi('solid'), seuil: 'texte' },
  { numero: 6, premier: emploi('on-solid'), second: emploi('solid', 1), seuil: 'texte' },
  { numero: 7, premier: emploi('on-solid'), second: emploi('solid', 2), seuil: 'texte' },
  { numero: 8, premier: emploi('border-control'), second: FOND, seuil: 'nonTexte' },
  { numero: 9, premier: emploi('border-control'), second: emploi('surface'), seuil: 'nonTexte' },
  { numero: 10, premier: emploi('border-control', 1), second: emploi('surface', 1), seuil: 'nonTexte' },
  { numero: 11, premier: emploi('border-control', 2), second: emploi('surface', 2), seuil: 'nonTexte' },
  { numero: 12, premier: emploi('focus'), second: FOND, seuil: 'nonTexte' },
  { numero: 13, premier: emploi('focus'), second: emploi('surface'), seuil: 'nonTexte' },
  { numero: 14, premier: emploi('solid', 1), second: FOND, seuil: 'nonTexte' },
  { numero: 15, premier: emploi('text'), second: emploi('surface-card'), seuil: 'texte' },
  { numero: 16, premier: emploi('border-control'), second: emploi('surface-card'), seuil: 'nonTexte' },
  { numero: 17, premier: emploi('text', 3), second: emploi('surface', 3), seuil: 'texte' },
  { numero: 18, premier: emploi('on-solid'), second: emploi('solid', 3), seuil: 'texte' },
  { numero: 19, premier: emploi('border-control', 3), second: emploi('surface', 3), seuil: 'nonTexte' },
];

/**
 * Une association : les paires de même premier emploi et de même second
 * membre, emploi ou fond. `text` sur `surface` réunit les paires 2, 3, 4 et
 * 17.
 */
export interface Association {
  readonly premier: Emploi;
  readonly second: Emploi | 'fond';
}

/** L'état d'une paire : le plus grand décalage de ses membres, l'indice de son rang dans `RANGS`. */
export type EtatDePaire = Decalage;

const emploiDuMembre = (membre: MembrePaire): Emploi | 'fond' => ('fond' in membre ? 'fond' : membre.emploi);
const decalageDuMembre = (membre: MembrePaire): EtatDePaire => ('fond' in membre ? 0 : membre.decalage);

/** L'association d'une paire. `on-solid` vise le fond du thème, mais reste un emploi. */
export function associationDe(paire: Paire): Association {
  const premier = emploiDuMembre(paire.premier);
  if (premier === 'fond') throw new Error(`Paire ${paire.numero} : le premier membre est le fond.`);
  return { premier, second: emploiDuMembre(paire.second) };
}

export function etatDeLaPaire(paire: Paire): EtatDePaire {
  return Math.max(decalageDuMembre(paire.premier), decalageDuMembre(paire.second)) as EtatDePaire;
}

/** La clé d'une association, `text/surface` ou `border-control/fond`, pour grouper et comparer. */
export const cleDeLAssociation = (association: Association): string => `${association.premier}/${association.second}`;

/** Les dix associations, dans l'ordre de leur première paire. */
export const ASSOCIATIONS: readonly Association[] = PAIRES
  .map(associationDe)
  .filter((association, rang, toutes) => toutes.findIndex((autre) => cleDeLAssociation(autre) === cleDeLAssociation(association)) === rang);

/** Les décalages qu'un emploi prend dans les paires, 0 compris. */
export function decalagesDeLEmploi(nom: Emploi): Decalage[] {
  const vus = new Set<Decalage>([0]);
  for (const paire of PAIRES) {
    for (const membre of [paire.premier, paire.second]) {
      if ('emploi' in membre && membre.emploi === nom) vus.add(membre.decalage);
    }
  }
  return [...vus].sort((a, b) => a - b);
}

/** Un emploi, avancé de `decalage` crans : 1 pour `hover`, 2 pour `active`, 3 pour `active-hover`. */
export interface EmploiDUnCran {
  readonly emploi: Emploi;
  readonly decalage: Decalage;
}

/**
 * Les emplois que la table confie au cran de rang `rang` dans `crans`, rangs
 * compris, dans l'ordre des emplois. `on-solid` vise le fond et ne tombe sur
 * aucun cran.
 */
export function emploisDuCran(crans: readonly number[], rang: number): EmploiDUnCran[] {
  const trouves: EmploiDUnCran[] = [];
  for (const nom of EMPLOIS) {
    const cible = TABLE_DES_EMPLOIS[nom];
    if (cible === 'fond') continue;
    const depart = crans.indexOf(cible);
    if (depart < 0) continue;
    for (const decalage of decalagesDeLEmploi(nom)) {
      if (depart + decalage === rang) trouves.push({ emploi: nom, decalage });
    }
  }
  return trouves;
}

/** Vrai quand chaque membre de la paire a son cran dans la liste : un emploi facultatif peut manquer. */
export function paireJugeable(paire: Paire, crans: readonly number[]): boolean {
  return [paire.premier, paire.second].every((membre) =>
    'fond' in membre || !EMPLOIS_FACULTATIFS.includes(membre.emploi) || emploiPresent(membre.emploi, crans));
}

/**
 * Les 60 profils de base de F5 (p01 à p60) : 10 jeux d'axes de design systems (J1 à J10), 3 écritures du nom d'axe et 2 écritures des
 * valeurs, dans l'ordre du produit (la dernière dimension varie le plus vite). P0 n'en fait pas partie, c'est `composantP0`.
 *
 * Le rôle d'un axe vient du corpus `corpus/axes-attestes.json` : le rôle de la colonne pour un nom `attendu`, la proposition de la
 * section 9 du plan pour un nom `mesure`. Un rôle n'a qu'une place dans les tokens : le premier axe du jeu qui le porte l'occupe, les
 * suivants (`Fill style` après `Variant`, `Shape` après `Appearance`) et les booléens (`Destructive`, `Danger`, `High contrast`)
 * n'écrivent aucun segment. Les variants portent toujours leur matrice complète.
 */
import { readFileSync } from 'node:fs';
import type { AxeDuComposant } from '../../../src/controles/nommage.js';
import { composantDeBase, type AxeDeVariants } from './composantDeBase.js';
import type { ComposantDeBase } from './portF3.js';

export interface AxeAttesteDuCorpus {
  readonly nom: string;
  readonly systeme: string | null;
  readonly composant: string | null;
  readonly role: AxeDuComposant;
  /** Pour une entrée `mesure` : le rôle que la section 9 propose, `null` quand le nom n'est pas un axe. */
  readonly roleSelonLaProposition?: AxeDuComposant | null;
  readonly verdict: 'attendu' | 'mesure';
  readonly question?: string;
  readonly source: string;
}

export interface ValeurAttesteeDuCorpus {
  readonly valeur: string;
  readonly categorie: 'taille' | 'etat' | 'palette' | 'style';
  readonly axe: string;
  readonly systeme: string | null;
  readonly composant: string | null;
  readonly source: string;
  readonly verdict: 'attendu' | 'mesure';
  readonly question?: string;
  /** Le constat attendu pour un token écrit comme la valeur, ou `null`. */
  readonly constat: { readonly code: 'C8' | 'C10'; readonly attendu: string } | null;
  readonly constatSelonLaProposition?: { readonly code: 'C8' | 'C10'; readonly attendu: string };
}

const lire = <T>(fichier: string): T => JSON.parse(readFileSync(new URL(`./corpus/${fichier}`, import.meta.url), 'utf8')) as T;

export const AXES_ATTESTES: readonly AxeAttesteDuCorpus[] = lire('axes-attestes.json');
export const VALEURS_ATTESTEES: readonly ValeurAttesteeDuCorpus[] = lire('valeurs-attestees.json');

/** Le rôle qu'un nom du corpus doit avoir : `attendu` donne le rôle du corpus, `mesure` celui de la proposition (ou `null`). */
export function roleDuCorpus(nom: string): AxeDuComposant | null {
  const entree = AXES_ATTESTES.find((axe) => axe.nom === nom);
  if (!entree) throw new Error(`Nom d'axe hors corpus : ${nom}`);
  return entree.verdict === 'attendu' ? entree.role : entree.roleSelonLaProposition ?? null;
}

export type EcritureDuNom = 'corpus' | 'minuscules' | 'initiales';
export type EcritureDesValeurs = 'origine' | 'ucm';

export interface ProfilDeVariants {
  /** `p01` à `p60`. */
  readonly id: string;
  /** `J1` à `J10`. */
  readonly jeu: string;
  readonly composant: string;
  readonly ecritureDuNom: EcritureDuNom;
  readonly ecritureDesValeurs: EcritureDesValeurs;
}

interface JeuDAxes {
  readonly composant: string;
  readonly axes: readonly (readonly [nom: string, valeurs: readonly string[]])[];
}

export const JEUX_D_AXES: Readonly<Record<string, JeuDAxes>> = {
  J1: { composant: 'Button', axes: [['Variant', ['text', 'outlined', 'contained']], ['Color', ['primary', 'secondary', 'error', 'warning', 'info', 'success']], ['Size', ['small', 'medium', 'large']], ['State', ['default', 'hover', 'focus', 'disabled']]] },
  J2: { composant: 'Button', axes: [['Variant', ['default', 'primary', 'danger', 'invisible', 'link']], ['Size', ['small', 'medium', 'large']], ['State', ['default', 'hover', 'focus', 'disabled']]] },
  J3: { composant: 'Button', axes: [['Kind', ['primary', 'secondary', 'tertiary', 'ghost', 'danger']], ['Size', ['sm', 'md', 'lg', 'xl', '2xl']], ['State', ['default', 'hover', 'focus', 'disabled']]] },
  J4: { composant: 'Button', axes: [['Variant', ['primary', 'secondary', 'tertiary', 'plain']], ['Tone', ['critical', 'success']], ['Size', ['micro', 'slim', 'medium', 'large']], ['State', ['default', 'hover', 'pressed', 'disabled']]] },
  J5: { composant: 'Button', axes: [['Hierarchy', ['Primary', 'Secondary', 'Tertiary', 'Link']], ['Size', ['sm', 'md', 'lg', 'xl', '2xl']], ['State', ['Default', 'Hover', 'Focused', 'Disabled']], ['Destructive', ['True', 'False']]] },
  J6: { composant: 'Button', axes: [['Appearance', ['primary', 'outline', 'subtle', 'transparent']], ['Size', ['small', 'medium', 'large']], ['Shape', ['rounded', 'circular', 'square']], ['State', ['rest', 'hover', 'pressed', 'disabled']]] },
  J7: { composant: 'Button', axes: [['Variant', ['accent', 'primary', 'secondary', 'negative']], ['Fill style', ['fill', 'outline']], ['Size', ['S', 'M', 'L', 'XL']], ['State', ['default', 'hover', 'focus', 'disabled']]] },
  J8: { composant: 'Button', axes: [['Type', ['primary', 'default', 'dashed', 'text', 'link']], ['Size', ['large', 'middle', 'small']], ['Danger', ['True', 'False']], ['State', ['default', 'hover', 'active', 'disabled']]] },
  J9: { composant: 'Alert', axes: [['Severity', ['info', 'success', 'warning', 'danger']], ['Style', ['standard', 'outline']], ['Size', ['sm', 'md', 'lg']], ['State', ['default', 'hover', 'pressed', 'focus', 'disabled']]] },
  J10: { composant: 'Button', axes: [['Variant', ['classic', 'solid', 'soft', 'surface', 'outline', 'ghost']], ['Color', ['accent', 'gray', 'red']], ['Size', ['1', '2', '3', '4']], ['High contrast', ['True', 'False']]] },
};

const ECRITURES_DU_NOM: readonly EcritureDuNom[] = ['corpus', 'minuscules', 'initiales'];
const ECRITURES_DES_VALEURS: readonly EcritureDesValeurs[] = ['origine', 'ucm'];

export const PROFILS: readonly ProfilDeVariants[] = Object.entries(JEUX_D_AXES).flatMap(([jeu, { composant }]) =>
  ECRITURES_DU_NOM.flatMap((ecritureDuNom) => ECRITURES_DES_VALEURS.map((ecritureDesValeurs) => ({ jeu, composant, ecritureDuNom, ecritureDesValeurs })))).map((profil, rang) => ({
  id: `p${String(rang + 1).padStart(2, '0')}`, ...profil,
}));

const UCM_DES_TAILLES: Readonly<Record<string, string>> = { small: 'sm', medium: 'md', large: 'lg', middle: 'md', micro: 'xs', slim: 'sm', s: 'sm', m: 'md', l: 'lg', xl: 'xl', '1': 'sm', '2': 'md', '3': 'lg', '4': 'xl' };
const UCM_DES_ETATS: Readonly<Record<string, string>> = { rest: 'default', focused: 'focus', active: 'pressed' };

/** La forme UCM d'une valeur : minuscules, `sm` et `md` pour les tailles, `default` pour `rest`, `pressed` pour `active`. */
export function formeUcm(role: AxeDuComposant | null, valeur: string): string {
  const minuscules = valeur.toLowerCase();
  if (role === 'taille') return UCM_DES_TAILLES[minuscules] ?? minuscules;
  if (role === 'etat') return UCM_DES_ETATS[minuscules] ?? minuscules;
  return minuscules;
}

export function ecrireLeNom(nom: string, ecriture: EcritureDuNom): string {
  if (ecriture === 'minuscules') return nom.toLowerCase();
  if (ecriture === 'initiales') return nom.split(' ').map((mot) => mot.charAt(0).toUpperCase() + mot.slice(1)).join(' ');
  return nom;
}

/** Les axes d'un profil, avec le rôle de leur segment : un rôle déjà pris par un axe précédent, ou un nom qui n'est pas un axe, donne `null`. */
export function axesDuProfil(profil: ProfilDeVariants): AxeDeVariants[] {
  const pris = new Set<AxeDuComposant>();
  return JEUX_D_AXES[profil.jeu].axes.map(([nomDuCorpus, valeursDOrigine]) => {
    const role = roleDuCorpus(nomDuCorpus);
    const segment = role && !pris.has(role) ? role : null;
    if (segment) pris.add(segment);
    return {
      nom: ecrireLeNom(nomDuCorpus, profil.ecritureDuNom),
      valeurs: profil.ecritureDesValeurs === 'ucm' ? valeursDOrigine.map((valeur) => formeUcm(role, valeur)) : [...valeursDOrigine],
      segment,
    };
  });
}

export const profilParId = (id: string): ProfilDeVariants => {
  const profil = PROFILS.find((entree) => entree.id === id);
  if (!profil) throw new Error(`Profil inconnu : ${id}`);
  return profil;
};

/** Le rôle que le corpus donne à chaque nom d'axe du profil, tel que le profil l'écrit : `null` pour un nom qui n'est pas un axe. */
export function rolesAttendusDuProfil(profil: ProfilDeVariants): Record<string, AxeDuComposant | null> {
  return Object.fromEntries(JEUX_D_AXES[profil.jeu].axes.map(([nomDuCorpus]) => [ecrireLeNom(nomDuCorpus, profil.ecritureDuNom), roleDuCorpus(nomDuCorpus)]));
}

export function composantDuProfil(profil: ProfilDeVariants, graine?: number): ComposantDeBase {
  return composantDeBase(profil.composant, axesDuProfil(profil), graine);
}

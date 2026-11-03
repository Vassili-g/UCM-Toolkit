/**
 * Les 48 profils de règles du stress test F8 : six formes de jeu, des règles rédigées ou toutes marquées « [À compléter] », des
 * cibles écrites comme le contrat les nomme ou compactées par le designer (casse et espaces), un composant sur la page ou trois.
 *
 * Une forme est décrite comme Figma la décrit : des propriétés de composant (`ProprieteDuJeu`). La surface du moteur en est tirée par
 * les fonctions du socle (`lireLeModeleDeProprietes`, `lireLeModeleDEtats`), si bien que les clés et les valeurs du contrat sont
 * celles que l'export publie (`hasIcon`, `extra-large`). Les règles écrites sur la page viennent du modèle du socle
 * (`modeleDeRegles`), compactées au besoin ; les opérateurs les retirent ou les altèrent ensuite.
 *
 * Les profils se numèrent r01 à r48 : la forme varie le plus lentement, puis le nombre de composants, l'écriture des cibles, et
 * les règles (rédigées avant marquées) le plus vite. R0 est r09 (`button-36`, rédigées, cibles exactes, un composant) et r42 est
 * `tile-link` aux règles marquées.
 */
import { MARQUEUR_A_COMPLETER } from '@ucm-kit/core/referentiel';
import {
  isStateProperty, lireLeModeleDEtats, lireLeModeleDeProprietes, normalizePropKey, normalizePropValue, type DefinitionsDeProprietes,
} from 'ucm-plugin-socle/src/composant/analyse/proprietesEtEtats';
import { modeleDeRegles } from 'ucm-plugin-socle/src/composant/template/modele';
import type { ModeleDeRegles } from 'ucm-plugin-socle/src/composant/template/modele';

import { contratDesReglesDe, type SurfaceDuMoteur } from '../../../src/regles';

export type FormeDeRegles = 'alert-11' | 'button-36' | 'switch-4' | 'divider-1' | 'badge-9' | 'tile-link';
export const FORMES_DE_REGLES: readonly FormeDeRegles[] = ['alert-11', 'button-36', 'switch-4', 'divider-1', 'badge-9', 'tile-link'];

/** Une propriété de composant telle que Figma la porte. `wrapper` : elle vient du wrapper de dimensions et le moteur la fusionne. */
export interface ProprieteDuJeu {
  readonly nom: string;
  readonly type: 'VARIANT' | 'BOOLEAN' | 'TEXT';
  readonly options?: readonly string[];
  readonly wrapper?: boolean;
  /** Une propriété d'un composant imbriqué que le moteur rattache au parent : elle n'est pas dans les définitions du composant. */
  readonly imbrique?: boolean;
}

export interface FormeDuJeu {
  readonly composant: string;
  readonly proprietes: readonly ProprieteDuJeu[];
}

const variante = (nom: string, options: readonly string[], wrapper = false): ProprieteDuJeu => ({ nom, type: 'VARIANT', options, ...(wrapper ? { wrapper } : {}) });
const booleenne = (nom: string): ProprieteDuJeu => ({ nom, type: 'BOOLEAN' });

export const FORMES: Readonly<Record<FormeDeRegles, FormeDuJeu>> = {
  'alert-11': {
    composant: 'Alert',
    proprietes: [variante('Severity', ['info', 'error', 'success', 'warning']), variante('Variant', ['standard', 'outlined', 'filled']), booleenne('Dismissible')],
  },
  'button-36': {
    composant: 'Button',
    proprietes: [
      variante('Palette', ['primary', 'neutral', 'danger']), variante('Style', ['solid', 'outline']), variante('State', ['default', 'hover', 'disabled']),
      variante('Size', ['small', 'medium']), booleenne('Has Icon'), booleenne('Loading'),
    ],
  },
  'switch-4': { composant: 'Switch', proprietes: [variante('State', ['default', 'hover', 'pressed', 'disabled']), booleenne('Checked')] },
  'divider-1': { composant: 'Divider', proprietes: [] },
  'badge-9': { composant: 'Badge', proprietes: [variante('Type', ['filled', 'outlined', 'subtle']), variante('Tone', ['neutral', 'info', 'danger'])] },
  'tile-link': {
    composant: 'Tile Link',
    proprietes: [variante('Size', ['small', 'medium'], true), variante('Orientation', ['horizontal', 'vertical'], true), booleenne('Show Icon')],
  },
};

// ---------------------------------------------------------------------------------------------------------------------------
// Surface du moteur

export interface SurfaceFabriquee {
  readonly surface: SurfaceDuMoteur;
  /** `componentPropertyDefinitions` du composant : les propriétés du wrapper n'y figurent pas. */
  readonly definitions: DefinitionsDeProprietes;
}

function definitionsDe(proprietes: readonly ProprieteDuJeu[]): Record<string, unknown> {
  return Object.fromEntries(proprietes.map((propriete) => [
    propriete.nom,
    propriete.type === 'VARIANT'
      ? { type: 'VARIANT', defaultValue: propriete.options?.[0] ?? '', variantOptions: [...(propriete.options ?? [])] }
      : propriete.type === 'BOOLEAN' ? { type: 'BOOLEAN', defaultValue: false } : { type: 'TEXT', defaultValue: '' },
  ]));
}

/** La surface publiée d'un jeu : les props de l'export et son modèle d'états, lus par les fonctions du socle. */
export function surfaceDe(proprietes: readonly ProprieteDuJeu[]): SurfaceFabriquee {
  const propres = proprietes.filter((propriete) => !propriete.wrapper && !propriete.imbrique);
  const pretees = proprietes.filter((propriete) => propriete.wrapper || propriete.imbrique);
  const definitions = definitionsDe(propres) as unknown as DefinitionsDeProprietes;
  const props = { ...lireLeModeleDeProprietes(definitions).modele.props };
  for (const [cle, prop] of Object.entries(lireLeModeleDeProprietes(definitionsDe(pretees) as unknown as DefinitionsDeProprietes).modele.props)) props[cle] = prop;
  const axeDEtats = propres.find((propriete) => propriete.type === 'VARIANT' && isStateProperty(normalizePropKey(propriete.nom)));
  const stateModel = axeDEtats
    ? lireLeModeleDEtats([normalizePropKey(axeDEtats.nom)], (axeDEtats.options ?? []).map((valeur) => ({ [normalizePropKey(axeDEtats.nom)]: normalizePropValue(valeur) }))).modele
    : null;
  const surface = { props, stateModel, imbriques: { auParent: proprietes.filter((propriete) => propriete.imbrique).map((propriete) => normalizePropKey(propriete.nom)), sansRegles: [], sansPorteur: [] } } as unknown as SurfaceDuMoteur;
  return { surface, definitions };
}

export function modeleDuJeu(composant: string, proprietes: readonly ProprieteDuJeu[]): ModeleDeRegles {
  return modeleDeRegles(composant, contratDesReglesDe(surfaceDe(proprietes).surface));
}

/** Le nombre de règles du modèle, compté sur les propriétés Figma : `@usage`, `@icons`, une règle par valeur et par booléenne. */
export function nombreDeReglesDuJeu(proprietes: readonly ProprieteDuJeu[]): number {
  return 2 + proprietes.reduce((somme, propriete) => somme + (propriete.type === 'VARIANT' ? propriete.options?.length ?? 0 : propriete.type === 'BOOLEAN' ? 1 : 0), 0);
}

// ---------------------------------------------------------------------------------------------------------------------------
// Règles écrites

export type TagEcrit = 'usage' | 'prop' | 'boolean' | 'icons' | 'default' | 'do' | 'dont' | 'pairs';

/** Une règle telle que le designer la laisse dans l'instance de règles. */
export interface RegleEcrite {
  readonly tag: TagEcrit;
  /** Le texte du calque `prop`. */
  readonly cible?: string;
  /** Le texte du calque `content`. */
  readonly contenu: string;
  /** Le texte du calque `icon` d'un `@icons`. */
  readonly icone?: string;
}

export const REDIGE = 'Règle rédigée par le designer.';
export const MARQUE = `${MARQUEUR_A_COMPLETER} Décrivez cette règle.`;

const majuscule = (mot: string): string => mot.charAt(0).toUpperCase() + mot.slice(1);

/** La cible telle qu'un designer la compacte : `Has Icon`, `Palette.Primary`, `Size.Extra Large`. */
export function cibleCompactee(cible: string): string {
  const [axe, ...reste] = cible.split('.');
  const mots = (texte: string, separateur: string): string => texte.replace(/([a-z0-9])([A-Z])/g, '$1 $2').split(separateur).filter(Boolean).map(majuscule).join(' ');
  return reste.length === 0 ? mots(axe, ' ') : `${mots(axe, ' ')}.${mots(reste.join('.'), '-')}`;
}

export interface OptionsDesRegles { readonly marquees: boolean; readonly ecriture: 'exacte' | 'compactee' }

/** Les règles que le modèle pose, écrites comme le designer les laisse. */
export function reglesDuModele(modele: ModeleDeRegles, { marquees, ecriture }: OptionsDesRegles): RegleEcrite[] {
  const contenu = marquees ? MARQUE : REDIGE;
  return modele.sections.flatMap((section) => section.elements).flatMap((element): RegleEcrite[] => {
    if (element.genre !== 'regle') return [];
    if (element.tag === 'icons') return [{ tag: 'icons', contenu: '', icone: marquees ? MARQUEUR_A_COMPLETER : 'Icon' }];
    if (element.tag === 'usage') return [{ tag: 'usage', contenu }];
    const cible = element.cible ?? '';
    return [{ tag: element.tag as TagEcrit, cible: ecriture === 'compactee' ? cibleCompactee(cible) : cible, contenu }];
  });
}

/** Retire les règles `@prop` et `@boolean` d'une propriété (clé du contrat), et seulement elles. */
export function sansLesReglesDe(regles: readonly RegleEcrite[], cle: string, valeurs?: readonly string[]): RegleEcrite[] {
  const compact = (texte: string): string => texte.replace(/\s+/g, '').toLowerCase();
  return regles.filter((regle) => {
    if (regle.cible === undefined || (regle.tag !== 'prop' && regle.tag !== 'boolean')) return true;
    const [axe, ...reste] = regle.cible.split('.');
    if (compact(axe) !== compact(cle)) return true;
    if (valeurs === undefined) return false;
    return !valeurs.some((valeur) => compact(reste.join('.')) === compact(valeur));
  });
}

// ---------------------------------------------------------------------------------------------------------------------------
// Les 48 profils

export interface ProfilDeRegles {
  /** `r01` à `r48`. */
  readonly id: string;
  readonly forme: FormeDeRegles;
  readonly redigees: boolean;
  readonly ecriture: 'exacte' | 'compactee';
  readonly composants: 1 | 3;
}

export const PROFILS_DE_REGLES: readonly ProfilDeRegles[] = FORMES_DE_REGLES.flatMap((forme) =>
  ([1, 3] as const).flatMap((composants) =>
    (['exacte', 'compactee'] as const).flatMap((ecriture) =>
      [true, false].map((redigees) => ({ forme, composants, ecriture, redigees }))))).map((profil, rang) => ({ id: `r${String(rang + 1).padStart(2, '0')}`, ...profil }));

const profilDe = (id: string): ProfilDeRegles => PROFILS_DE_REGLES.find((profil) => profil.id === id)!;

/** `button-36`, règles rédigées, cibles exactes, un composant sur la page. */
export const PROFIL_R0: ProfilDeRegles = profilDe('r09');
/** `tile-link` aux règles marquées. */
export const PROFIL_R42: ProfilDeRegles = profilDe('r42');

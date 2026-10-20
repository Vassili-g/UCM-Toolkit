/**
 * Les rôles de rendu partagés par tous les contrats : fond, texte, icône,
 * contour, anneau de focus. Cette table est la seule liste de rôles du dépôt.
 * L'exporteur la publie dans chaque contrat (`rendering.roles`) et le
 * diagnostic des contrastes en dérive ses ensembles ; ajouter un rôle ici suffit
 * aux deux.
 *
 * L'élection d'un rôle à partir d'un calque Figma n'est pas ici : elle reste
 * dans l'exporteur.
 */
import type { RenderingRole } from './types.js';

/**
 * `peinture` : une couleur seule. `contour` : une couleur accompagnée d'une
 * géométrie (un trait Figma). Le contrat les publie sous `paint` et `stroke`.
 */
export type NatureDeRole = 'peinture' | 'contour';

/** Un rôle de rendu : sa nature est obligatoire, un rôle sans nature ne compile pas. */
export type RoleDeRendu = {
  nature: NatureDeRole;
  usageDeContraste?: 'texte' | 'nonTexte';
  /** Propriétés CSS candidates, telles que le contrat les publie. */
  cssProperties: readonly string[];
  /** Stratégie de rendu complémentaire, publiée telle quelle. */
  fallback?: string;
};

/**
 * L'ordre des entrées est celui du contrat publié. Un stroke Figma se dessine
 * hors du flux : il n'élargit pas la boîte et ne déplace aucun voisin.
 * `border-color` / `border-width` disaient le contraire au consommateur, qui
 * rendait une bordure CSS et décalait tout le contenu du composant.
 * `StrokeAlignment` dit de quel côté dessiner le trait ; aucune de ses valeurs
 * ne justifie une bordure.
 */
const ROLES = {
  background: { nature: 'peinture', cssProperties: ['background-color'] },
  foreground: { nature: 'peinture', usageDeContraste: 'texte', cssProperties: ['color', 'fill'] },
  icon: { nature: 'peinture', usageDeContraste: 'texte', cssProperties: ['color', 'fill'] },
  border: { nature: 'contour', usageDeContraste: 'nonTexte', cssProperties: ['box-shadow'] },
  ring: {
    nature: 'contour',
    usageDeContraste: 'nonTexte',
    cssProperties: ['outline-color', 'outline-width'],
    fallback: 'box-shadow',
  },
} as const satisfies Record<string, RoleDeRendu>;

/** Les identifiants des rôles partagés. */
export type IdentifiantDeRole = keyof typeof ROLES;

const NATURE_PUBLIEE = { peinture: 'paint', contour: 'stroke' } as const satisfies Record<
  NatureDeRole,
  RenderingRole['kind']
>;

/** Le rôle partagé de cet identifiant, ou `null` : un nom hérité (`constructor`) n'en est pas un. */
export function roleDeRendu(identifiant: string): RoleDeRendu | null {
  return Object.prototype.hasOwnProperty.call(ROLES, identifiant)
    ? ROLES[identifiant as IdentifiantDeRole]
    : null;
}

/** Les identifiants des rôles partagés, dans l'ordre du contrat. */
export function identifiantsDeRoles(): IdentifiantDeRole[] {
  return Object.keys(ROLES) as IdentifiantDeRole[];
}

/** La nature d'un rôle partagé, ou `null` pour un nom qui n'en désigne aucun. */
export function natureDuRole(identifiant: string): NatureDeRole | null {
  return roleDeRendu(identifiant)?.nature ?? null;
}

/** Le `kind` que le contrat publie pour une nature. */
export function kindDeNature(nature: NatureDeRole): RenderingRole['kind'] {
  return NATURE_PUBLIEE[nature];
}

/**
 * La table que l'exporteur écrit dans `rendering.roles` : une copie neuve à
 * chaque appel, dans l'ordre de la table du kit.
 */
export function tableDesRolesDeRendu(): Record<string, RenderingRole> {
  const table: Record<string, RenderingRole> = {};
  for (const identifiant of identifiantsDeRoles()) {
    const role: RoleDeRendu = ROLES[identifiant];
    table[identifiant] = {
      kind: kindDeNature(role.nature),
      cssProperties: [...role.cssProperties],
      ...(role.fallback === undefined ? {} : { fallback: role.fallback }),
    };
  }
  return table;
}

/**
 * La nature d'un rôle selon un contrat déjà publié.
 *
 * Un contrat qui porte sa table (`rendering.roles` non vide) se lit avec elle
 * seule : un rôle qu'elle ne cite pas est inconnu, même si la table du kit le
 * connaît aujourd'hui. Pour un rôle cité sans `kind` lisible, ou pour un contrat
 * sans table, la nature vient de la table du kit, pour les identifiants connus.
 */
export function natureDuRoleDuContrat(rendering: unknown, identifiant: string): NatureDeRole | null {
  const roles = (rendering as { roles?: unknown } | null | undefined)?.roles;
  if (typeof roles !== 'object' || roles === null || Array.isArray(roles)) return natureDuRole(identifiant);
  const citees = Object.keys(roles);
  if (citees.length === 0) return natureDuRole(identifiant);
  if (!citees.includes(identifiant)) return null;
  const kind = (roles as Record<string, { kind?: unknown } | null>)[identifiant]?.kind;
  if (kind === 'paint') return 'peinture';
  if (kind === 'stroke') return 'contour';
  return natureDuRole(identifiant);
}

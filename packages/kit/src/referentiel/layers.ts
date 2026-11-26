/**
 * Ce qu'un layer désigne : une icône, un anneau de focus, un séparateur. Les contrôles de mapping (C17), d'accessibilité (C49, C50)
 * et de typographie (C66, C67) et la colonne du mode Composant lisent ces définitions ; aucun ne reconnaît un layer par une
 * expression à lui (Q-F6-3, Q-F3-4, Q-F6-4, Q-F7-9, Q-F3-3).
 *
 * Un mot d'icône est un mot entier du nom : `Silicone`, `Lexicon` et `Icons` n'en contiennent pas, `ChevronIcon` et `leading-icon` oui.
 *
 * Après une modification : relancer `npm test` et changer la version du kit.
 */

/** Les mots qui disent « icône » dans un nom de layer, de propriété ou de composant. */
export const MOTS_D_ICONE = ['icon', 'icône', 'glyph', 'pictogram', 'symbol'] as const;

/** Les rôles de token qui désignent un layer précis ; `background`, `foreground`, `text` et `border` colorent n'importe quel layer. */
export const ROLES_QUI_DESIGNENT_UN_LAYER = ['divider', 'ring', 'icon'] as const;
export type RoleDeLayer = (typeof ROLES_QUI_DESIGNENT_UN_LAYER)[number];

/** Ce que les définitions lisent d'un layer : le relevé du kit (`LayerLu`) et la lecture d'Architect s'y conforment. */
export interface LayerPourLesDefinitions {
  readonly nom: string;
  readonly type: string;
  /**
   * Le composant que l'instance pose, et la propriété d'échange d'instance qui la pilote (`Icon#1:2`).
   * `dessin` : le composant principal n'a pour descendants visibles que des tracés (`VECTOR`, `BOOLEAN_OPERATION`), ou des groupes et des
   * cadres qui n'en contiennent que. `visibilitePar` : le nom brut de la propriété booléenne qui pilote la visibilité de l'instance
   * (`Icon-Left#1261:147`). Un champ absent ne dit rien.
   */
  readonly instanceDe?: { readonly nom: string; readonly pilotee: string | null; readonly dessin?: boolean; readonly visibilitePar?: string | null };
}

const NOMS_MEMORISES_MAX = 20_000;
const sansAccent = (texte: string): string => texte.normalize('NFD').replace(/\p{M}/gu, '');
const MOTS = new Set(MOTS_D_ICONE.map((mot) => sansAccent(mot)));
const memoire = new Map<string, boolean>();

/** Un mot d'icône entier dans le nom : séparateurs, chiffres et passage de la minuscule à la majuscule coupent les mots. */
export function motDIconeDansLeNom(nom: string): boolean {
  const connu = memoire.get(nom);
  if (connu !== undefined) return connu;
  const mots = sansAccent(nom).replace(/(\p{Ll})(\p{Lu})/gu, '$1 $2').match(/\p{L}+/gu) ?? [];
  const trouve = mots.some((mot) => MOTS.has(mot.toLowerCase()));
  if (memoire.size >= NOMS_MEMORISES_MAX) memoire.clear();
  memoire.set(nom, trouve);
  return trouve;
}

/**
 * La seule fonction qui décide de la position du mot d'icône dans le nom d'un composant (D29). Le mot est certain s'il est le dernier
 * mot du nom (`ChevronIcon`, `Icon`) ou s'il nomme un dossier du chemin, un segment avant le dernier `/` (`Icon/Close`). Il ne l'est
 * pas ailleurs : `IconButton` et `.sizeWrapperIconButton` posent un bouton, pas une icône.
 */
export function motDIconeCertainDansLeNom(nom: string): boolean {
  const segments = nom.split('/');
  const dernier = segments.pop() ?? '';
  if (segments.some(motDIconeDansLeNom)) return true;
  const mots = sansAccent(dernier).replace(/(\p{Ll})(\p{Lu})/gu, '$1 $2').match(/\p{L}+/gu) ?? [];
  const final = mots[mots.length - 1];
  return final !== undefined && MOTS.has(final.toLowerCase());
}

/** Cas 1, icône probable : le nom du composant ou de son jeu contient un mot d'icône entier, où qu'il soit. */
export function estUneInstanceDIcone(layer: LayerPourLesDefinitions): boolean {
  return layer.instanceDe !== undefined && motDIconeDansLeNom(layer.instanceDe.nom);
}

/** Cas 1, icône certaine : le mot d'icône est en position certaine dans le nom du composant (`motDIconeCertainDansLeNom`). */
export function estUneInstanceDIconeCertaine(layer: LayerPourLesDefinitions): boolean {
  return layer.instanceDe !== undefined && motDIconeCertainDansLeNom(layer.instanceDe.nom);
}

/** Cas 2 : une instance qu'une propriété d'échange d'instance pilote, sous un nom de propriété ou de layer qui dit icône (Q-F6-4). */
function estUneInstancePilotee(layer: LayerPourLesDefinitions): boolean {
  const pilotee = layer.instanceDe?.pilotee ?? null;
  return pilotee !== null && (motDIconeDansLeNom(pilotee.split('#')[0]) || motDIconeDansLeNom(layer.nom));
}

/** Cas 3 : un tracé dont le nom contient un mot d'icône. */
function estUnTraceNomme(layer: LayerPourLesDefinitions): boolean {
  return (layer.type === 'VECTOR' || layer.type === 'BOOLEAN_OPERATION') && motDIconeDansLeNom(layer.nom);
}

/** Cas 4 : l'instance d'un composant qui n'est qu'un dessin ; le critère ne lit aucun nom. */
function estUneInstanceDeDessin(layer: LayerPourLesDefinitions): boolean {
  return layer.instanceDe?.dessin === true;
}

/** Cas 5 : une instance dont la visibilité est pilotée par une propriété dont le nom dit icône (`Icon-Left#1261:147`). */
function estUneInstanceMontreeParUneIcone(layer: LayerPourLesDefinitions): boolean {
  const propriete = layer.instanceDe?.visibilitePar;
  return typeof propriete === 'string' && motDIconeDansLeNom(propriete.split('#')[0]);
}

/**
 * La définition d'une icône, la seule du kit : un FRAME ou un TEXT n'en est jamais une, quel que soit son nom. Les cinq cas : le nom
 * du composant, la propriété d'échange d'instance, le nom d'un tracé, le composant qui n'est qu'un dessin, la propriété de visibilité.
 */
export function estUneIcone(layer: LayerPourLesDefinitions): boolean {
  if (layer.type === 'FRAME' || layer.type === 'TEXT') return false;
  return estUneIconeCertaine(layer) || estUneInstanceDIcone(layer) || estUneInstanceDeDessin(layer);
}

/**
 * Une icône que son nom ou ses propriétés désignent : tous les cas sauf le dessin seul et le mot d'icône hors position certaine (`IconButton`), qui ne lit aucun nom et prend aussi une pointe
 * de Tooltip ou un logo. C17 n'accuse un autre rôle que sur une icône certaine (D1).
 */
export function estUneIconeCertaine(layer: LayerPourLesDefinitions): boolean {
  if (layer.type === 'FRAME' || layer.type === 'TEXT') return false;
  return estUneInstanceDIconeCertaine(layer) || estUneInstancePilotee(layer) || estUnTraceNomme(layer) || estUneInstanceMontreeParUneIcone(layer);
}

/**
 * L'icône que les règles propres aux icônes jugent (C66, C67, le contraste de C49) : une icône certaine ou faite d'un seul dessin. Une
 * instance que seul un mot d'icône hors position certaine désigne (`IconButton`) est une icône probable : elle ne reçoit aucune de ces
 * règles (D1, D29). Seul le choix de l'icône vit ici ; chaque contrôle l'appelle sans recopier la règle.
 */
export function estUneIconeJugee(layer: LayerPourLesDefinitions): boolean {
  return estUneIconeCertaine(layer) || (layer.type !== 'FRAME' && layer.type !== 'TEXT' && estUneInstanceDeDessin(layer));
}

/** `Ring`, `Focus ring` ou `focus-ring` ; un point ou un tiret bas en tête, la marque Figma d'un layer privé (`.Ring`), ne change pas le nom. */
const NOM_D_ANNEAU = /^[._]?(focus[-_ ]?)?ring$/i;
const NOM_DE_SEPARATEUR = /^[._]?(divider|separator)$/i;

export function estUnNomDAnneau(nom: string): boolean {
  return NOM_D_ANNEAU.test(nom);
}

export function estUnNomDeSeparateur(nom: string): boolean {
  return NOM_DE_SEPARATEUR.test(nom);
}

/**
 * La définition d'un anneau de focus : un layer lié à un token de rôle `ring`, ou nommé `Ring` ou `Focus ring`. `rolesLies` donne le rôle
 * de chaque token que le layer lie, que l'appelant lit dans son catalogue ; sans lui, seul le nom décide.
 */
export function estUnAnneau(layer: Pick<LayerPourLesDefinitions, 'nom'>, rolesLies: readonly string[] = []): boolean {
  return estUnNomDAnneau(layer.nom) || rolesLies.includes('ring');
}

/** Vrai pour `divider`, `ring` et `icon` ; faux pour tout autre rôle, dont le token colore n'importe quel layer. */
export function leNomDuLayerDitLeRole(role: string): boolean {
  return (ROLES_QUI_DESIGNENT_UN_LAYER as readonly string[]).includes(role);
}

/**
 * Le rôle que le layer désigne : `divider` par le nom `Divider` ou `Separator`, `ring` par `Ring` ou `Focus ring`, `icon` par l'instance
 * d'un composant Icon. Un autre layer n'en désigne aucun. Les contrôles de liaison comparent ce rôle à celui du token (Q-F3-3).
 */
export function roleQueLeLayerDesigne(layer: LayerPourLesDefinitions): RoleDeLayer | undefined {
  if (estUnNomDeSeparateur(layer.nom)) return 'divider';
  if (estUnNomDAnneau(layer.nom)) return 'ring';
  if (layer.type !== 'FRAME' && layer.type !== 'TEXT' && estUneInstanceDIconeCertaine(layer)) return 'icon';
  return undefined;
}

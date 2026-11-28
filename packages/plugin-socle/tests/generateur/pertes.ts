/**
 * Les pertes que la forme du contrat 15.0 prévoit (§2.11 et §2.14), avec ce que chacune couvre. Le comparateur (`comparateur.ts`) laisse
 * passer un écart seulement si une perte du contrat, reconnue dans cette liste, le couvre par son chemin et par son objet.
 *
 * Une perte du contrat est une entrée de `meta.diagnostics` de code `UCM_PORTABLE_PROJECTION_WARNING`. Elle couvre un écart quand
 * - son objet est celui d'une entrée de la liste : la propriété de l'API Figma qu'elle nomme (`figma.property`, ou le message), ou, pour
 *   un cas sans propriété, le motif de son message ;
 * - cette entrée couvre le champ de rendu de l'écart (`champs`) ;
 * - son chemin couvre le lieu de l'écart : `contractPath` égale le chemin du variant ou du renvoi lu, ou désigne le tableau d'une perte
 *   regroupée (`variants`, `pieces.<P>.variants`) dont `slotPath` égale l'adresse du calque. Une perte de catalogue (`effectStyles.`,
 *   `textStyles.`) ne dépend pas du variant.
 *
 * Les propriétés de l'API par ligne du §2.14 viennent de la table de couverture (`couvertureFigma.table.ts`), qui les classe une fois.
 * Il n'existe aucune perte de transfert : une valeur imposée perdue dans une variante atteinte reste un écart (§2.12, étape 6).
 *
 * Borne : le moteur 15.0 n'écrit pas encore ces pertes. Les motifs des cas sans propriété de la liste sont à caler sur les messages du
 * moteur quand il les écrira (lot 5 du plan de P22).
 */
import { TABLE, type Ligne214 } from '../couvertureFigma.table';
import type { ChampDeRendu } from './rendu';

export const CODE_DE_PERTE = 'UCM_PORTABLE_PROJECTION_WARNING';

/** Une entrée de `meta.diagnostics` que le contrat publie : seul `code` est garanti. */
export interface Diagnostic {
  code: string;
  [cle: string]: unknown;
}

/** Les champs qu'une perte peut couvrir : ceux du rendu, le calque entier et la résolution d'une occurrence. */
export type ChampCouvert = ChampDeRendu | 'calque' | 'resolution';

/** Où la perte se publie : sur le variant ou le renvoi, sur un seul renvoi, sur un slot, sur une prop, ou dans un catalogue partagé. */
export type Porte = 'variant-ou-renvoi' | 'renvoi' | 'slot' | 'propriete' | 'catalogue';

export interface PertePrevue {
  cle: string;
  /** La ligne du tableau de la forme qui prévoit cette perte. */
  cas: string;
  fondement: '§2.11' | '§2.14';
  porte: Porte;
  /** Les champs du rendu que la perte excuse ; vide pour une perte qui ne touche aucun rendu. */
  champs: readonly ChampCouvert[];
  /** Les propriétés ou types de l'API Figma que le message ou `figma.property` nomme. */
  proprietes: readonly string[];
  /** Pour un cas sans propriété : le motif du message. */
  motif?: RegExp;
}

/** Les cas du §2.11 qui ne sont pas des données de rendu manquantes. */
const CAS_DE_L_APPARIEMENT: readonly PertePrevue[] = [
  { cle: 'selection-non-unique', cas: 'une sélection d’axes exposés ou d’état n’a aucun variant, ou en a plusieurs', fondement: '§2.11', porte: 'renvoi', champs: ['resolution'], proprietes: [], motif: /s[ée]lection|aucun variant|plusieurs variants/i },
  { cle: 'appariement-ambigu', cas: 'le chemin d’un écart traverse deux calques frères de même nom', fondement: '§2.11', porte: 'renvoi', champs: ['resolution'], proprietes: [], motif: /fr[èe]res de m[êe]me nom|appariement/i },
  { cle: 'instance-a-plat', cas: 'une instance sans préfixe ni règles, dont le composant laisse un choix, est décrite à plat', fondement: '§2.11', porte: 'slot', champs: ['compose', 'calque'], proprietes: [], motif: /sans pr[ée]fixe|[àa] plat/i },
  { cle: 'exposition-partielle', cas: 'une instance est exposée dans une partie des variants seulement', fondement: '§2.11', porte: 'propriete', champs: [], proprietes: [], motif: /partie des variants|expos[ée]e? dans/i },
  { cle: 'echange-vers-une-piece', cas: 'un INSTANCE_SWAP exposé peut désigner une pièce par une valeur préférée', fondement: '§2.11', porte: 'propriete', champs: [], proprietes: [], motif: /valeur pr[ée]f[ée]r[ée]e|INSTANCE_SWAP/i },
  { cle: 'source-relative', cas: 'la source d’une propriété exposée change de chemin selon le variant, ou sa cible ne peut pas être lue', fondement: '§2.11', porte: 'propriete', champs: [], proprietes: [], motif: /source/i },
  { cle: 'slot-rempli', cas: 'l’hôte remplit un SLOT de pièce', fondement: '§2.11', porte: 'renvoi', champs: ['calque', 'texte', 'compose'], proprietes: [], motif: /SLOT/ },
  { cle: 'echange-non-nomme', cas: 'un INSTANCE_SWAP non exposé ne se nomme pas', fondement: '§2.11', porte: 'renvoi', champs: ['compose'], proprietes: [], motif: /ne se nomme pas|INSTANCE_SWAP/i },
  { cle: 'surcharge-de-peinture-de-dependance', cas: 'une surcharge de peinture dans une dépendance n’est pas celle d’une icône', fondement: '§2.11', porte: 'slot', champs: ['couleurs'], proprietes: [], motif: /surcharge/i },
];

/** Les champs de rendu qu'une ligne du §2.14 excuse, et où sa perte se publie. */
const LIGNES: Record<Ligne214, { cas: string; porte: Porte; champs: readonly ChampCouvert[] }> = {
  'contour': { cas: 'largeur uniforme ou par côté d’un contour, et contours particuliers', porte: 'variant-ou-renvoi', champs: ['contours'] },
  'ombre': { cas: 'couleur d’une ombre', porte: 'catalogue', champs: ['effets'] },
  'scale': { cas: 'proportions d’une contrainte scale', porte: 'variant-ou-renvoi', champs: ['boite'] },
  'variables-et-styles': { cas: 'variables liées et styles', porte: 'variant-ou-renvoi', champs: ['couleurs', 'contours', 'typographie', 'effets', 'boite', 'flux'] },
  'modes': { cas: 'modes de variables forcés par calque', porte: 'variant-ou-renvoi', champs: ['couleurs', 'contours', 'typographie', 'effets', 'boite', 'flux'] },
  'masque-et-fusion': { cas: 'masque, écrêtage, fusion et ordre de peinture particulier', porte: 'variant-ou-renvoi', champs: ['calque', 'couleurs', 'boite'] },
  'peinture': { cas: 'peinture non unie, image, vidéo, motif, peintures superposées', porte: 'variant-ou-renvoi', champs: ['couleurs', 'contours'] },
  'geometrie': { cas: 'géométrie vectorielle ou booléenne et contours particuliers', porte: 'variant-ou-renvoi', champs: ['icone', 'contours', 'calque'] },
  'typographie': { cas: 'typographie par plage', porte: 'variant-ou-renvoi', champs: ['typographie', 'texte'] },
  'grilles-et-dimensionnement': { cas: 'grilles de mise en page et modes de dimensionnement', porte: 'variant-ou-renvoi', champs: ['flux', 'boite'] },
  'transformation-2d': { cas: 'transformation 2D autre qu’une rotation, instance agrandie ou réduite', porte: 'variant-ou-renvoi', champs: ['boite'] },
  'effet': { cas: 'effet sans représentation', porte: 'variant-ou-renvoi', champs: ['effets'] },
  'prototype-et-3d': { cas: 'transformations 3D, scènes, animations et réactions', porte: 'variant-ou-renvoi', champs: ['calque'] },
  'texte-sur-trace': { cas: 'texte sur un tracé (TextPathNode)', porte: 'variant-ou-renvoi', champs: ['calque', 'texte', 'typographie'] },
  'groupe-de-transformation': { cas: 'groupe de transformation (TransformGroupNode)', porte: 'variant-ou-renvoi', champs: ['calque'] },
};

/**
 * Une propriété que la table classe `portable` ne conserve qu'une partie d'un objet : la donnée perdue a sa ligne du §2.14. La table ne
 * dit pas à quelle ligne ; `pertes.ts` la dit, et le test du banc relit chaque propriété dans la table.
 */
export const PROPRIETES_PARTIELLES: Partial<Record<Ligne214, readonly string[]>> = {
  contour: ['strokeWeight', 'strokeTopWeight', 'strokeRightWeight', 'strokeBottomWeight', 'strokeLeftWeight'],
  ombre: ['effects'],
  scale: ['constraints'],
  'variables-et-styles': ['boundVariables'],
  peinture: ['fills', 'strokes'],
  typographie: ['characters', 'textDecoration'],
  'transformation-2d': ['relativeTransform'],
  effet: ['effects'],
};

const nomsDeLaLigne = (ligne: Ligne214): string[] => [
  ...new Set([
    ...TABLE.filter((e) => (e.classe === 'perte' || e.classe === 'prototype') && e.ligne === ligne).flatMap((e) => (e.proprietes === '*' ? (e.types === 'noeuds' ? [] : [...e.types]) : [...e.proprietes])),
    ...(PROPRIETES_PARTIELLES[ligne] ?? []),
  ]),
];

const DONNEES_DE_RENDU: readonly PertePrevue[] = (Object.keys(LIGNES) as Ligne214[]).map((ligne) => ({
  cle: ligne,
  cas: LIGNES[ligne].cas,
  fondement: '§2.14',
  porte: LIGNES[ligne].porte,
  champs: LIGNES[ligne].champs,
  proprietes: nomsDeLaLigne(ligne),
}));

/** Toutes les pertes que la forme prévoit : les cas du §2.11, puis les lignes du §2.14. */
export const PERTES: readonly PertePrevue[] = [...CAS_DE_L_APPARIEMENT, ...DONNEES_DE_RENDU];

/** Où l'écart se lit : le chemin du variant ou du renvoi et, par identité de calque, l'adresse du slot (`RenduNormalise`). */
export interface Lieu {
  cheminDuContrat?: string;
  adresses?: Record<string, string[]>;
}

const nomme = (message: string, nom: string) => new RegExp(`(^|[^A-Za-z0-9_])${nom.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^A-Za-z0-9_]|$)`).test(message);

/** Le diagnostic est-il une perte de ce cas, par son objet ? */
export function reconnaitLaPerte(perte: PertePrevue, d: Diagnostic): boolean {
  if (d.code !== CODE_DE_PERTE) return false;
  const message = typeof d.message === 'string' ? d.message : '';
  const propriete = (d.figma as { property?: unknown } | undefined)?.property;
  if (perte.proprietes.length) return (typeof propriete === 'string' && perte.proprietes.includes(propriete)) || perte.proprietes.some((nom) => nomme(message, nom));
  return !!perte.motif?.test(message);
}

const estUnTableauDeVariantes = (chemin: string) => /^(variants|pieces\.[^.]+\.variants)$/.test(chemin);

/** Le chemin du diagnostic couvre-t-il le lieu et le calque de l'écart ? */
export function couvreLeLieu(perte: PertePrevue, d: Diagnostic, identite: string, lieu: Lieu): boolean {
  const chemin = typeof d.contractPath === 'string' ? d.contractPath : '';
  if (perte.porte === 'catalogue') return /^(effectStyles|textStyles)\./.test(chemin);
  const unite = lieu.cheminDuContrat;
  if (!unite) return false;
  const regroupee = Array.isArray(d.slotPath) && estUnTableauDeVariantes(chemin) && unite.startsWith(`${chemin}[`) && /^\[\d+\]$/.test(unite.slice(chemin.length));
  const dansLUnite = perte.porte === 'slot' ? chemin === unite || chemin.startsWith(`${unite}.`) || chemin.startsWith(`${unite}[`) : chemin === unite;
  if (!dansLUnite && !regroupee) return false;
  return !Array.isArray(d.slotPath) || JSON.stringify(d.slotPath) === JSON.stringify(lieu.adresses?.[identite]);
}

/**
 * Une perte du contrat couvre-t-elle cet écart, par son objet, son champ et son chemin ? Une occurrence non résolue des deux côtés est un
 * écart de champ `resolution` dont `attendu` et `lu` sont la même cause : seule la perte de cette cause le couvre.
 */
export function perteCouvre(d: Diagnostic, ecart: { identite: string; champ: ChampCouvert; attendu?: unknown; lu?: unknown }, lieu: Lieu): boolean {
  return PERTES.some((p) => {
    if (!p.champs.includes(ecart.champ) || !reconnaitLaPerte(p, d) || !couvreLeLieu(p, d, ecart.identite, lieu)) return false;
    return ecart.champ !== 'resolution' || (p.cle === ecart.attendu && ecart.lu === ecart.attendu);
  });
}

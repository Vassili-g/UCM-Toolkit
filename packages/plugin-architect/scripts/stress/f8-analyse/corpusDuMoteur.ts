/**
 * Le corpus des points du moteur du stress test F8 : 40 gabarits de `PointACorriger` recopiés des sites `pointDe` du socle
 * (`packages/plugin-socle/src/composant/`), rangés par famille. Chaque gabarit porte le sens du point et le constat que l'inventaire
 * (4.8) en attend : le code vient du sens, jamais d'un mot du titre.
 *
 *   variables 11, disposition 6, proprietes 9, imbriques 4, styles 2, regles 6, non-exportes 2.
 *
 * Les points `proprietes` autres que « pilote » suivent la décision Q-F89-10 : C34 pour une combinaison manquante et un état non reconnu
 * ou toléré, C42 bloquant pour « aucun variant », C42 à vérifier pour « aucune propriété définie » et les collisions de noms.
 *
 * `couvertureDesSites` compte les sites `famille: '…'` du socle par famille : une famille qui a des sites et aucun gabarit fait échouer
 * le contrôle. Il ne rapproche pas chaque site d'un gabarit (le socle en compte plusieurs dizaines, le corpus en garde 40).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import type { Constat, TypeDAlerte } from '@ucm-kit/core/controles';
import type { FamilleDePoint } from 'ucm-plugin-socle/src/composant/contract/famillesDePoint';
import type { PointACorriger } from 'ucm-plugin-socle/src/composant/contract/localisation';

export type CodeDuMoteur = 'C30' | 'C34' | 'C35' | 'C41' | 'C42' | 'C44';

/** Ce que le point dit, indépendamment des mots qu'il emploie. */
export type SensDuPoint =
  | 'variable-introuvable' | 'variable-absente' | 'masque' | 'pilote' | 'combinaison-manquante' | 'etat-inconnu' | 'etat-tolere'
  | 'aucun-variant' | 'aucune-propriete' | 'collision' | 'regle' | 'autre';

export interface GabaritDuMoteur {
  readonly id: string;
  readonly point: PointACorriger;
  readonly sens: SensDuPoint;
  /** Le code que l'oracle attend. */
  readonly code: CodeDuMoteur;
  readonly type: TypeDAlerte;
  /** La famille que le constat attend : celle de ce que le point lie (tailles, typographie, tokens), `liaisons` par défaut pour C30 et C41. */
  readonly famille?: Constat['famille'];
}

const FAMILLE_DU_CONSTAT: Readonly<Record<CodeDuMoteur, string>> = { C30: 'liaisons', C41: 'liaisons', C35: 'visibilite', C34: 'variants', C42: 'export', C44: 'regles' };
export const familleDuConstatAttendu = (code: CodeDuMoteur, famille?: Constat['famille']): string => famille ?? FAMILLE_DU_CONSTAT[code];

const IMPACT = 'Le contrat ne le transmettra pas.';
const ACTION = 'Corrigez ce point dans Figma, puis réexportez.';

function point(famille: FamilleDePoint, titre: string, plus: Partial<PointACorriger> = {}): PointACorriger {
  return { famille, titre, impact: IMPACT, action: ACTION, ...plus };
}

function gabarit(id: string, p: PointACorriger, sens: SensDuPoint, plus: { code?: CodeDuMoteur; famille?: Constat['famille']; type?: TypeDAlerte } = {}): GabaritDuMoteur {
  const code = plus.code ?? codeDuSens(p.famille, sens);
  const bloquant = code === 'C41' || p.severite === 'danger';
  return { id, point: p, sens, code, type: plus.type ?? (bloquant ? 'bloquant' : code === 'C30' || code === 'C44' ? 'corriger' : 'verifier'), ...(plus.famille ? { famille: plus.famille } : {}) };
}

/** Le code que le sens du point demande (inventaire 4.8 et proposition Q-F89-10). */
export function codeDuSens(famille: FamilleDePoint, sens: SensDuPoint): CodeDuMoteur {
  if (famille === 'variables') return sens === 'variable-introuvable' ? 'C41' : 'C30';
  if (famille === 'regles') return 'C44';
  if (sens === 'masque' || sens === 'pilote') return 'C35';
  if (sens === 'combinaison-manquante' || sens === 'etat-inconnu' || sens === 'etat-tolere') return 'C34';
  return 'C42';
}

const VARIABLES = [
  gabarit('variables-1', point('variables', 'Layer « Card », padding : certains côtés utilisent une variable introuvable.', { calque: 'Card' }), 'variable-introuvable', { famille: 'tailles' }),
  gabarit('variables-2', point('variables', 'Layer « Badge », cornerRadius : variable introuvable : cornerRadius.', { calque: 'Badge' }), 'variable-introuvable', { famille: 'tailles' }),
  gabarit('variables-3', point('variables', 'Layer « Card », padding : aucune variable Figma n\'est reliée.', { calque: 'Card' }), 'variable-absente', { famille: 'tailles' }),
  gabarit('variables-4', point('variables', 'Layer « Card », gap : aucune variable associée.', { calque: 'Card' }), 'variable-absente', { famille: 'tailles' }),
  gabarit('variables-5', point('variables', 'Layer « Card » : son fill n’est relié à aucune variable Figma.', { calque: 'Card' }), 'variable-absente'),
  gabarit('variables-6', point('variables', 'Layer « Card » : son stroke n’est relié à aucune variable Figma.', { calque: 'Card' }), 'variable-absente'),
  gabarit('variables-7', point('variables', 'Layer « Label », opacity : aucune variable associée.', { calque: 'Label' }), 'variable-absente', { famille: 'tokens' }),
  gabarit('variables-8', point('variables', 'Layer « Card » : son vertical gap est réglé sur « Auto », donc Figma répartit lui-même l\'espace.', { calque: 'Card' }), 'variable-absente', { famille: 'tailles' }),
  gabarit('variables-9', point('variables', 'Layer « Card », padding : les côtés ne sont pas reliés à la même variable.', { calque: 'Card' }), 'variable-absente', { famille: 'tailles' }),
  gabarit('variables-10', point('variables', 'Layer « Card » : il fixe minWidth sans variable Figma.', { calque: 'Card' }), 'variable-absente', { famille: 'tailles' }),
  gabarit('variables-11', point('variables', 'Layer « Title », font size : aucune variable Figma n\'est reliée.', { calque: 'Title' }), 'variable-absente', { famille: 'typographie' }),
];

const DISPOSITION = [
  gabarit('disposition-1', point('disposition', 'Layer « Badge » : il est masqué, et aucune propriété booléenne ni variable ne pilote sa visibilité.', { calque: 'Badge' }), 'masque'),
  gabarit('disposition-2', point('disposition', 'Layer « Card » : il range 3 calques mais n\'utilise pas d\'auto layout.', { calque: 'Card' }), 'autre'),
  gabarit('disposition-3', point('disposition', 'Layer « Card » : il n\'utilise pas d\'auto layout.', { calque: 'Card' }), 'autre'),
  gabarit('disposition-4', point('disposition', 'gap et padding : aucun auto layout configuré.'), 'autre'),
  gabarit('disposition-5', point('disposition', 'Layer « Card » : son alignement d\'auto layout est illisible.', { calque: 'Card' }), 'autre'),
  gabarit('disposition-6', point('disposition', 'Layer « Card » : il est imbriqué au-delà de 12 niveaux, la profondeur n\'est pas exportée.', { calque: 'Card' }), 'autre'),
];

const PROPRIETES = [
  gabarit('proprietes-1', point('proprietes', 'Propriété booléenne « Has Icon » : elle pilote aucun calque.'), 'pilote'),
  gabarit('proprietes-2', point('proprietes', 'Component Set « Button » : une combinaison de valeurs de ses propriétés de variante n\'a pas de variant.', { calque: 'Button' }), 'combinaison-manquante'),
  gabarit('proprietes-3', point('proprietes', 'Component Set « Button » : 4 combinaisons de valeurs de ses propriétés de variante n\'ont pas de variant.', { calque: 'Button' }), 'combinaison-manquante'),
  gabarit('proprietes-4', point('proprietes', 'Component Set sélectionné : il ne contient aucun variant.'), 'aucun-variant', { type: 'bloquant', code: 'C42' }),
  gabarit('proprietes-5', point('proprietes', 'Component Set « Button » : aucune propriété de composant n’est définie.', { calque: 'Button' }), 'aucune-propriete'),
  gabarit('proprietes-6', point('proprietes', 'Propriétés de composant « Icon Left » et « icon-left » : leurs noms donnent le même nom « iconLeft » dans le contrat.'), 'collision'),
  gabarit('proprietes-7', point('proprietes', 'Propriété de variante « Scale » : ses valeurs sont des tailles, mais une autre propriété de composant porte déjà le nom « size ».'), 'collision'),
  gabarit('proprietes-8', point('proprietes', 'Propriété de variante « State » : l\'état « busy » n\'est pas reconnu.'), 'etat-inconnu'),
  gabarit('proprietes-9', point('proprietes', 'Propriété de variante « State » : l’état « active » s’écrit « pressed » dans le vocabulaire UCM.'), 'etat-tolere'),
];

const IMBRIQUES = [
  gabarit('imbriques-1', point('imbriques', 'Le composant « Card » intègre « Icon », qui n’a pas ses règles d’usage.', { severite: 'danger' }), 'autre'),
  gabarit('imbriques-2', point('imbriques', 'Le composant « Card » intègre « Icon », dont 2 propriétés ne sont pas documentées :', { severite: 'danger', elements: ['size', 'tone'] }), 'autre'),
  gabarit('imbriques-3', point('imbriques', 'Icône « Close » du variant « Default » : le contrat ne décrit pas son calque dans ce variant.'), 'autre'),
  gabarit('imbriques-4', point('imbriques', 'Layer « Card » : le composant principal de cette instance est introuvable.', { calque: 'Card' }), 'autre'),
];

const STYLES = [
  gabarit('styles-1', point('styles', 'Layer « Title » : le style de texte appliqué est introuvable.', { calque: 'Title' }), 'autre'),
  gabarit('styles-2', point('styles', 'Layer « Card », effect : aucun style d’effets appliqué.', { calque: 'Card' }), 'autre'),
];

const REGLES = [
  gabarit('regles-1', point('regles', 'Layer « .ruleItem » : une règle @prop contient encore « [À compléter] ».'), 'regle'),
  gabarit('regles-2', point('regles', 'Règle @boolean « loading » : le composant n’a aucune propriété booléenne portant ce nom.'), 'regle'),
  gabarit('regles-3', point('regles', 'Règle @default « size » : la propriété de variante « size » n’a pas de valeur « xl ».'), 'regle'),
  gabarit('regles-4', point('regles', 'Règle @icons « Close » : aucun calque de ce nom dans le composant.'), 'regle'),
  gabarit('regles-5', point('regles', 'Règles d’usage : aucune règle @usage, @do, @dont ou @pairs n’est déclarée.'), 'regle'),
  gabarit('regles-6', point('regles', 'Règle @prop « size.md » : elle apparaît deux fois.'), 'regle'),
];

const NON_EXPORTES = [
  gabarit('non-exportes-1', point('non-exportes', 'Layer « Card », stroke : l’alignement ne peut pas être lu.', { calque: 'Card' }), 'autre'),
  gabarit('non-exportes-2', point('non-exportes', 'Layer « Card », blend mode : ce mode de fusion n’est pas pris en charge.', { calque: 'Card' }), 'autre'),
];

export const CORPUS_DU_MOTEUR: readonly GabaritDuMoteur[] = [...VARIABLES, ...DISPOSITION, ...PROPRIETES, ...IMBRIQUES, ...STYLES, ...REGLES, ...NON_EXPORTES];

export const gabaritDe = (id: string): GabaritDuMoteur => CORPUS_DU_MOTEUR.find((entree) => entree.id === id)!;

// ---------------------------------------------------------------------------------------------------------------------------
// Couverture

export interface CouvertureDUneFamille {
  readonly famille: string;
  readonly sites: number;
  readonly gabarits: number;
}

function fichiersTs(dossier: string): string[] {
  return readdirSync(dossier).flatMap((nom) => {
    const chemin = path.join(dossier, nom);
    return statSync(chemin).isDirectory() ? fichiersTs(chemin) : nom.endsWith('.ts') ? [chemin] : [];
  });
}

/** Les sites `famille: '…'` du socle (hors `template/`, qui écrit) contre les gabarits du corpus. */
export function couvertureDesSites(): CouvertureDUneFamille[] {
  const racine = path.resolve(__dirname, '../../../../plugin-socle/src/composant');
  const sites = new Map<string, number>();
  for (const fichier of fichiersTs(racine).filter((chemin) => !chemin.includes(`${path.sep}template${path.sep}`))) {
    for (const [, famille] of readFileSync(fichier, 'utf8').matchAll(/famille: '([a-z-]+)'/g)) sites.set(famille, (sites.get(famille) ?? 0) + 1);
  }
  return [...sites].map(([famille, nombre]) => ({ famille, sites: nombre, gabarits: CORPUS_DU_MOTEUR.filter((entree) => entree.point.famille === famille).length }));
}

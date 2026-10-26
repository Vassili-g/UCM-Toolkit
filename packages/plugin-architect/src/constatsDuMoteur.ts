/**
 * Les points à corriger du moteur de l'exporteur, traduits en `Constat` du kit.
 *
 * Le moteur ne donne aucun code à ses points : il les range par geste
 * (`FamilleDePoint`) et par phrase. La table ci-dessous dit quel code C30, C34,
 * C35, C41, C42 ou C44 chaque règle prend, dans l'ordre où elle s'applique. Un
 * point qu'aucune règle ne reconnaît garde son contenu : il devient un constat
 * C42, famille `export`, type `verifier`, avec ses faits.
 *
 * Le moteur place un point sur des nœuds de Figma, sans dire s'ils sont des
 * variants ou des calques : un nœud qui est un variant du relevé va dans
 * `variants`, les autres dans `layers`.
 */
import type { Constat, TypeDAlerte } from '@ucm-kit/core/controles';
import type { ComponentExport } from 'ucm-plugin-socle/src/composant/contract/exportComponent';
import type { FamilleDePoint } from 'ucm-plugin-socle/src/composant/contract/famillesDePoint';
import type { PointACorriger } from 'ucm-plugin-socle/src/composant/contract/localisation';

type CodeDuMoteur = 'C30' | 'C34' | 'C35' | 'C41' | 'C42' | 'C44';

interface Regle {
  readonly code: CodeDuMoteur;
  readonly famille: Constat['famille'];
  readonly type: TypeDAlerte;
  /** La famille du point dans le moteur. */
  readonly depuis: FamilleDePoint;
  /** Restreint la règle au texte du point (titre et éléments). Absent : tout point de la famille. */
  readonly texte?: RegExp;
}

/** L'ordre compte : la première règle qui reconnaît le point l'emporte. */
export const TABLE_DU_MOTEUR: readonly Regle[] = [
  { code: 'C41', famille: 'liaisons', type: 'bloquant', depuis: 'variables', texte: /[Vv]ariable introuvable/ },
  { code: 'C30', famille: 'liaisons', type: 'corriger', depuis: 'variables' },
  { code: 'C35', famille: 'visibilite', type: 'verifier', depuis: 'disposition', texte: /masqué/ },
  { code: 'C35', famille: 'visibilite', type: 'verifier', depuis: 'proprietes', texte: /pilote/ },
  { code: 'C34', famille: 'variants', type: 'verifier', depuis: 'proprietes' },
  { code: 'C42', famille: 'export', type: 'verifier', depuis: 'non-exportes' },
  { code: 'C44', famille: 'regles', type: 'corriger', depuis: 'regles' },
];

const CODE_DU_POINT_INCONNU: CodeDuMoteur = 'C42';

function regleDe(point: PointACorriger): Regle | null {
  const texte = [point.titre, ...(point.elements ?? [])].join(' ');
  return TABLE_DU_MOTEUR.find((regle) => regle.depuis === point.famille && (!regle.texte || regle.texte.test(texte))) ?? null;
}

/** FNV-1a 32 bits, en base 36 : une empreinte courte et stable du contenu d'un point. */
function empreinte(texte: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < texte.length; i += 1) {
    h ^= texte.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/**
 * Les constats d'un export du moteur, un par phrase distincte. `variants` sont
 * les identifiants des variants du relevé.
 */
export function constatsDuMoteur(moteur: Pick<ComponentExport, 'warnings' | 'parties' | 'localisations'>, variants: ReadonlySet<string> = new Set()): Constat[] {
  const constats: Constat[] = [];
  const vus = new Map<string, number>();
  for (const phrase of new Set(moteur.warnings)) {
    const point = moteur.parties.get(phrase);
    const regle = point ? regleDe(point) : null;
    const noeuds = moteur.localisations.get(phrase) ?? [];
    const code = regle?.code ?? CODE_DU_POINT_INCONNU;
    const faits: Record<string, string | number> = point
      ? { titre: point.titre, impact: point.impact, action: point.action, geste: point.famille, ...(point.calque ? { calque: point.calque } : {}), ...(point.elements?.length ? { elements: point.elements.join(', ') } : {}) }
      : { message: phrase };
    // L'identifiant vient du contenu, non du rang : Ignorer le range dans le document, et le moteur peut changer d'ordre d'une analyse à l'autre.
    const base = `moteur:${code}:${empreinte(`${point?.titre ?? phrase}|${[...noeuds].sort().join(',')}`)}`;
    const rang = (vus.get(base) ?? 0) + 1;
    vus.set(base, rang);
    constats.push({
      id: rang === 1 ? base : `${base}:${rang}`,
      code,
      type: point?.severite === 'danger' ? 'bloquant' : regle?.type ?? 'verifier',
      famille: regle?.famille ?? 'export',
      variants: noeuds.filter((id) => variants.has(id)),
      layers: noeuds.filter((id) => !variants.has(id)),
      faits,
    });
  }
  return constats;
}

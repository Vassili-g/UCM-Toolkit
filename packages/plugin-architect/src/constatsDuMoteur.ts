/**
 * Les points à corriger du moteur de l'exporteur, traduits en `Constat` du kit.
 *
 * Le moteur ne donne aucun code à ses points : il les range par geste
 * (`FamilleDePoint`) et par phrase. La table ci-dessous dit quel code C30, C34,
 * C35, C41, C42 ou C44 chaque règle prend, dans l'ordre où elle s'applique. Le
 * code suit le sens du point : les mots que la table cherche se lisent dans le
 * titre sans les noms entre « », que le designer a écrits (un calque nommé
 * « masqué » ne rend pas son point C35). Un point qu'aucune règle ne reconnaît
 * garde son contenu : il devient un constat C42, famille `export`, type
 * `verifier`, avec ses faits.
 *
 * Un point de variable (C30, C41) prend la famille de ce qu'il lie : tailles
 * pour une marge, un espacement, un rayon ou une épaisseur, typographie pour un
 * style de texte, tokens pour une opacité ou un effet, liaisons pour une
 * couleur. Le panneau le range dans l'élément de cette famille.
 *
 * Le moteur place un point sur des nœuds de Figma, sans dire s'ils sont des
 * variants ou des calques : un nœud qui est un variant du relevé va dans
 * `variants`, les autres dans `layers`.
 */
import type { Constat, TypeDAlerte } from '@ucm-kit/core/controles';
import type { ResultatInterne } from 'ucm-plugin-socle/src/composant/analyse/resultat';
import type { FamilleDePoint } from 'ucm-plugin-socle/src/composant/contract/famillesDePoint';
import { sorteDuPointDeRegles } from 'ucm-plugin-socle/src/composant/contract/extractRules';
import type { PointACorriger } from 'ucm-plugin-socle/src/composant/contract/localisation';

type CodeDuMoteur = 'C30' | 'C34' | 'C35' | 'C41' | 'C42' | 'C44';

interface Regle {
  readonly code: CodeDuMoteur;
  readonly famille: Constat['famille'];
  readonly type: TypeDAlerte;
  /** La famille du point dans le moteur. */
  readonly depuis: FamilleDePoint;
  /** Restreint la règle au titre du point sans ses noms entre « ». Absent avec `elements` : tout point de la famille. */
  readonly titre?: RegExp;
  /** Restreint la règle aux éléments du point. Un des deux motifs suffit. */
  readonly elements?: RegExp;
}

const VARIABLE_INTROUVABLE = /[Vv]ariable introuvable/;

/** L'ordre compte : la première règle qui reconnaît le point l'emporte. */
export const TABLE_DU_MOTEUR: readonly Regle[] = [
  { code: 'C41', famille: 'liaisons', type: 'bloquant', depuis: 'variables', titre: VARIABLE_INTROUVABLE, elements: VARIABLE_INTROUVABLE },
  { code: 'C30', famille: 'liaisons', type: 'corriger', depuis: 'variables' },
  { code: 'C35', famille: 'visibilite', type: 'verifier', depuis: 'disposition', titre: /masqué/ },
  { code: 'C35', famille: 'visibilite', type: 'verifier', depuis: 'proprietes', titre: /pilote/ },
  // « Aucun variant » est un contrat déjà vide : bloquant. « Aucune propriété » et les collisions de noms, sans règle ici, tombent en C42 à vérifier.
  { code: 'C42', famille: 'export', type: 'bloquant', depuis: 'proprietes', titre: /aucun variant/ },
  { code: 'C34', famille: 'variants', type: 'verifier', depuis: 'proprietes', titre: /n['’](?:a|ont) pas de variant|n['’]est pas reconnu|s['’]écrit/ },
  { code: 'C42', famille: 'export', type: 'verifier', depuis: 'non-exportes' },
  { code: 'C44', famille: 'regles', type: 'corriger', depuis: 'regles' },
];

/** Le titre d'un point sans les noms que le designer a écrits entre « et ». */
const titreSansLesNoms = (titre: string): string => titre.replace(/«[^»]*»/g, '');

const CODE_DU_POINT_INCONNU: CodeDuMoteur = 'C42';

function regleDe(point: PointACorriger): Regle | null {
  const titre = titreSansLesNoms(point.titre);
  const elements = (point.elements ?? []).join(' ');
  return TABLE_DU_MOTEUR.find((regle) => regle.depuis === point.famille
    && ((!regle.titre && !regle.elements) || regle.titre?.test(titre) || regle.elements?.test(elements))) ?? null;
}

/** La famille de ce qu'un point de variable lie, lue sur son titre sans les noms entre « ». */
function familleDeLaVariable(titre: string): Constat['famille'] {
  const nu = titreSansLesNoms(titre);
  if (/\b(?:opacity|opacité)\b|effet|effect/i.test(nu)) return 'tokens';
  if (/\bfont\b|line ?height|letter ?spacing|style de texte|text style/i.test(nu)) return 'typographie';
  if (/padding|\bgap\b|radius|stroke ?weight|(?:min|max)(?:width|height)|\bwidth\b|\bheight\b|spacing/i.test(nu)) return 'tailles';
  return 'liaisons';
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
 *
 * L'identifiant vient du contenu (titre, nœuds, éléments), jamais du rang des
 * phrases : Ignorer le range dans le document, et le moteur peut changer d'ordre
 * d'une analyse à l'autre. Deux points distincts n'ont donc aucun suffixe. Deux
 * phrases que le titre, les nœuds et les éléments ne distinguent pas (seuls
 * l'impact ou l'action diffèrent) prennent un rang dans l'ordre de leur texte,
 * non de leur arrivée.
 */
export function constatsDuMoteur(moteur: Pick<ResultatInterne, 'warnings' | 'parties' | 'localisations'>, variants: ReadonlySet<string> = new Set()): Constat[] {
  const entrees = [...new Set(moteur.warnings)].map((phrase) => {
    const point = moteur.parties.get(phrase);
    const regle = point ? regleDe(point) : null;
    const noeuds = moteur.localisations.get(phrase) ?? [];
    const code = regle?.code ?? CODE_DU_POINT_INCONNU;
    const elements = [...(point?.elements ?? [])].sort().join('\u001f');
    const base = `moteur:${code}:${empreinte(`${point?.titre ?? phrase}|${[...noeuds].sort().join(',')}${elements === '' ? '' : `|${elements}`}`)}`;
    return { phrase, point, regle, noeuds, code, base };
  });
  const jumelles = new Map<string, string[]>();
  for (const { base, phrase } of entrees) jumelles.set(base, [...(jumelles.get(base) ?? []), phrase]);
  const rangDe = (base: string, phrase: string): number => [...(jumelles.get(base) ?? [])].sort().indexOf(phrase) + 1;
  return entrees.map(({ phrase, point, regle, noeuds, code, base }): Constat => {
    const faits: Record<string, string | number> = point
      ? { titre: point.titre, impact: point.impact, action: point.action, geste: point.famille, ...(point.calque ? { calque: point.calque } : {}), ...(point.elements?.length ? { elements: point.elements.join(', ') } : {}) }
      : { message: phrase };
    const rang = rangDe(base, phrase);
    return {
      id: (jumelles.get(base)?.length ?? 1) === 1 || rang === 1 ? base : `${base}:${rang}`,
      code,
      type: point?.severite === 'danger' ? 'bloquant' : regle?.type ?? 'verifier',
      famille: point && (code === 'C30' || code === 'C41') ? familleDeLaVariable(point.titre) : regle?.famille ?? 'export',
      variants: noeuds.filter((id) => variants.has(id)),
      layers: noeuds.filter((id) => !variants.has(id)),
      faits,
    };
  });
}

/** Les champs Figma qu'un point de variable nomme dans son titre, sans les noms entre « ». */
function champsDuPoint(titre: string): Set<string> {
  const nu = titreSansLesNoms(titre);
  const champs = new Set<string>();
  const ajouter = (motif: RegExp, ...noms: string[]): void => { if (motif.test(nu)) for (const nom of noms) champs.add(nom); };
  ajouter(/\bfills?\b/, 'fills');
  ajouter(/\bstrokes?\b(?! ?weight)/i, 'strokes');
  ajouter(/stroke ?weight/i, 'strokeWeight');
  ajouter(/\bpadding\b/, 'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom');
  for (const nom of ['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom', 'itemSpacing', 'counterAxisSpacing', 'cornerRadius']) ajouter(new RegExp(`\\b${nom}\\b`), nom);
  ajouter(/vertical gap/, 'counterAxisSpacing');
  if (/(?<!vertical )\bgap\b/.test(nu)) champs.add('itemSpacing');
  ajouter(/\bradius\b/i, 'cornerRadius');
  return champs;
}

/**
 * Retire du moteur ce que le kit ou les règles disent déjà, pour qu'un défaut ne fasse qu'une carte. `constats` est la liste complète
 * de l'analyse, corrections comprises : C25 et C29 n'existent qu'après elles.
 *
 * - Un point C30 tombe quand un C25 ou un C29 porte le même layer et le même champ (Q-F3-17). Le kit compte même si le designer a
 *   ignoré son constat : Ignorer ne fait pas revenir le doublon (Q-F89-12), car la clé suffit.
 * - Un point C44 qui dit qu'aucune instance de règles n'écrit le composant, ou qu'un conteneur ne nomme personne, tombe quand C43 le
 *   dit (Q-09). Sans C43, il reste : il porte alors le geste.
 */
export function sansLesDoublonsDuMoteur(constats: readonly Constat[]): Constat[] {
  const c43 = constats.some((constat) => constat.code === 'C43');
  const jugesParLeKit = constats.filter((constat) => constat.code === 'C25' || constat.code === 'C29');
  return constats.filter((constat) => {
    if (constat.code === 'C44') {
      const sorte = sorteDuPointDeRegles(String(constat.faits.titre ?? ''));
      return !(c43 && (sorte === 'aucune-instance' || sorte === 'orphelin-vide' || sorte === 'orphelin-marque'));
    }
    if (constat.code !== 'C30') return true;
    const champs = champsDuPoint(String(constat.faits.titre ?? constat.faits.message ?? ''));
    return !jugesParLeKit.some((kit) => champs.has(String(kit.faits.champ)) && kit.layers.some((layer) => constat.layers.includes(layer)));
  });
}

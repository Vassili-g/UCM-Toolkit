/**
 * Typographie et icônes d'un composant (C64 à C67) sur le dessin Figma relevé.
 * Un style ou une liaison « attendu » est celui que tous les autres variants
 * portent pour un layer de même nom, et seulement s'ils sont au moins deux et
 * unanimes : sinon aucun constat de régularité, jamais une proposition par
 * ressemblance. Une variable que le catalogue ne permet pas de situer n'est
 * jamais jugée.
 */
import type { CatalogueDeReference } from './catalogue.js';
import { collectionDuCatalogue, variableDuCatalogue } from './catalogue.js';
import type { Constat } from './constat.js';
import type { LayerLu, LiaisonLue, ReleveDeComposant, VariantLu } from './releve.js';
import { layersVisiblesDuVariant } from './releve.js';

/** Champs Figma de la taille et de la graisse d'un texte. */
const CHAMPS_DE_TEXTE = ['fontSize', 'fontWeight'] as const;
const CHAMPS_DE_TYPOGRAPHIE = ['fontSize', 'fontWeight', 'fontFamily', 'lineHeight', 'letterSpacing', 'fontStyle'];
const CHAMPS_DE_TAILLE = ['width', 'height'];
/** Au moins deux autres variants, pour qu'un « autre » ne soit pas simplement l'unique voisin. */
const AUTRES_MINIMUM = 2;
const SEGMENT_D_ICONE = 'icon';
const SEGMENTS_DE_PREMIER_PLAN = ['icon', 'foreground'];
const NOM_D_ICONE = /icon/i;

type Source = { variant: VariantLu; layer: LayerLu };

export function controlerLaTypographie(releve: ReleveDeComposant, catalogue: CatalogueDeReference): Constat[] {
  const variants = releve.variants;
  const constats: Constat[] = [];
  const textes = sources(variants, (l) => l.type === 'TEXT');
  const icones = sources(variants, estIcone);
  constats.push(...controlerLesTextes(textes, catalogue));
  constats.push(...controlerLesTailleEtGraisse(textes, catalogue));
  constats.push(...controlerLesIcones(icones, catalogue));
  constats.push(...controlerLesReglesIcones(icones, releve));
  return constats;
}

function estIcone(layer: LayerLu): boolean {
  return (NOM_D_ICONE.test(layer.nom) || (layer.instanceDe?.pilotee ?? null) !== null);
}

function sources(variants: VariantLu[], garde: (l: LayerLu) => boolean): Map<string, Source[]> {
  const parNom = new Map<string, Source[]>();
  for (const variant of variants) {
    for (const layer of layersVisiblesDuVariant(variant)) {
      if (!garde(layer)) continue;
      const liste = parNom.get(layer.nom) ?? [];
      liste.push({ variant, layer });
      parNom.set(layer.nom, liste);
    }
  }
  return parNom;
}

/** Une même sorte de constat sur plusieurs variants devient un seul constat. */
function ajouter(groupes: Map<string, Constat>, id: string, source: Source, faits: Constat['faits'], base: Omit<Constat, 'id' | 'variants' | 'layers' | 'faits'>): void {
  const existant = groupes.get(id);
  if (existant) {
    if (!existant.variants.includes(source.variant.nom)) existant.variants.push(source.variant.nom);
    existant.layers.push(source.layer.id);
    return;
  }
  groupes.set(id, { ...base, id, variants: [source.variant.nom], layers: [source.layer.id], faits });
}

/** Les liaisons d'un champ, sur le layer ou sur ses plages de texte. */
function liaisonsDuChamp(layer: LayerLu, champs: readonly string[]): LiaisonLue[] {
  const plages = (layer.texte?.plages ?? []).flatMap((p) => p.liaisons);
  return [...layer.liaisons, ...plages].filter((l) => champs.includes(l.champ));
}

type Lieu = { collection: string; role: string | null } | null;

/** Une liaison illisible est liée, sans lieu connu : aucun contrôle ne la juge. */
function lieuDeLaVariable(catalogue: CatalogueDeReference, liaison: LiaisonLue): Lieu {
  if (liaison.illisible) return null;
  const variable = variableDuCatalogue(catalogue, liaison.variable.cle);
  const cleDeCollection = variable === 'absente' ? liaison.variable.collection : variable.collection;
  const collection = collectionDuCatalogue(catalogue, cleDeCollection);
  if (collection === 'absente') return null;
  return { collection: collection.nom, role: collection.role };
}

/** Les autres variants portent tous la même valeur pour ce layer : elle est rendue, sinon `null`. */
function valeurUnanime(autres: Source[], lire: (s: Source) => string | null): string | null | undefined {
  if (autres.length < AUTRES_MINIMUM) return undefined;
  const valeurs = new Set(autres.map(lire));
  return valeurs.size === 1 ? [...valeurs][0] : undefined;
}

/* ---------- C64 ---------- */

function controlerLesTextes(textes: Map<string, Source[]>, catalogue: CatalogueDeReference): Constat[] {
  const groupes = new Map<string, Constat>();
  const base = { code: 'C64', type: 'verifier', famille: 'typographie' } as const;
  for (const [nom, liste] of textes) {
    for (const source of liste) {
      const { layer } = source;
      if (layer.texte === undefined) continue;
      const typographie = liaisonsDuChamp(layer, CHAMPS_DE_TYPOGRAPHIE).some((l) => l.illisible || lieuDeLaVariable(catalogue, l)?.role === 'typography');
      if (layer.texte.style === null && !typographie) {
        ajouter(groupes, `C64:${nom}:sans-style`, source, { calque: nom, motif: 'sans-style-ni-variables' }, base);
      }
      const autres = liste.filter((s) => s !== source && s.layer.texte !== undefined);
      const attendu = valeurUnanime(autres, (s) => s.layer.texte?.style ?? null);
      const lu = layer.texte.style;
      if (attendu && lu !== attendu) {
        ajouter(groupes, `C64:${nom}:style:${attendu}:${lu ?? 'aucun'}`, source,
          { calque: nom, motif: 'style-different', styleAttendu: attendu, styleLu: lu ?? 'aucun' }, base);
      }
    }
  }
  return [...groupes.values()];
}

/* ---------- C65 ---------- */

function controlerLesTailleEtGraisse(textes: Map<string, Source[]>, catalogue: CatalogueDeReference): Constat[] {
  const groupes = new Map<string, Constat>();
  const base = { code: 'C65', type: 'verifier', famille: 'typographie' } as const;
  for (const [nom, liste] of textes) {
    for (const source of liste) {
      for (const champ of CHAMPS_DE_TEXTE) {
        const liaisons = liaisonsDuChamp(source.layer, [champ]);
        for (const liaison of liaisons) {
          const lieu = lieuDeLaVariable(catalogue, liaison);
          if (lieu === null || lieu.role === null || lieu.role === 'typography') continue;
          ajouter(groupes, `C65:${nom}:${champ}:mauvaise-collection:${liaison.variable.nom}`, source,
            { calque: nom, champ, motif: 'mauvaise-collection', variable: liaison.variable.nom, collection: lieu.collection, collectionAttendue: 'typography' }, base);
        }
        if (liaisons.length > 0) continue;
        const autres = liste.filter((s) => s !== source);
        const parVariant = valeurUnanime(autres, (s) => (liaisonsDuChamp(s.layer, [champ]).length > 0 ? 'liee' : null));
        if (parVariant === 'liee') {
          ajouter(groupes, `C65:${nom}:${champ}:sans-liaison`, source, { calque: nom, champ, motif: 'sans-liaison-comme-les-autres' }, base);
        }
      }
    }
  }
  return [...groupes.values()];
}

/* ---------- C66 ---------- */

function estUneTailleDIcone(catalogue: CatalogueDeReference, liaison: LiaisonLue): boolean | null {
  const lieu = lieuDeLaVariable(catalogue, liaison);
  if (lieu === null || lieu.role === null) return null;
  return lieu.role === 'layout' && liaison.variable.nom.split('/').includes(SEGMENT_D_ICONE);
}

function estUnPremierPlan(catalogue: CatalogueDeReference, liaison: LiaisonLue): boolean | null {
  const lieu = lieuDeLaVariable(catalogue, liaison);
  if (lieu === null || lieu.role === null) return null;
  return lieu.role === 'theme' && liaison.variable.nom.split('/').some((s) => SEGMENTS_DE_PREMIER_PLAN.includes(s));
}

function controlerLesIcones(icones: Map<string, Source[]>, catalogue: CatalogueDeReference): Constat[] {
  const groupes = new Map<string, Constat>();
  const base = { code: 'C66', type: 'verifier', famille: 'typographie' } as const;
  for (const [nom, liste] of icones) {
    for (const source of liste) {
      const { layer } = source;
      if (!layer.instanceDe?.distante) {
        ajouter(groupes, `C66:${nom}:pas-de-library`, source,
          { calque: nom, motif: layer.instanceDe ? 'instance-locale' : 'pas-une-instance' }, base);
      }
      const tailles = liaisonsDuChamp(layer, CHAMPS_DE_TAILLE);
      if (tailles.length === 0) {
        ajouter(groupes, `C66:${nom}:taille-sans-variable`, source, { calque: nom, motif: 'taille-sans-variable' }, base);
      }
      for (const liaison of tailles) {
        if (estUneTailleDIcone(catalogue, liaison) !== false) continue;
        ajouter(groupes, `C66:${nom}:taille:${liaison.champ}:${liaison.variable.nom}`, source,
          { calque: nom, motif: 'taille-hors-icone', champ: liaison.champ, variable: liaison.variable.nom }, base);
      }
      const couleurs = layer.liaisons.filter((l) => l.champ === 'fills');
      if (couleurs.length === 0) {
        ajouter(groupes, `C66:${nom}:couleur-sans-variable`, source, { calque: nom, motif: 'couleur-sans-variable' }, base);
      }
      for (const liaison of couleurs) {
        if (estUnPremierPlan(catalogue, liaison) !== false) continue;
        ajouter(groupes, `C66:${nom}:couleur:${liaison.variable.nom}`, source,
          { calque: nom, motif: 'couleur-hors-premier-plan', variable: liaison.variable.nom }, base);
      }
    }
  }
  return [...groupes.values()];
}

/* ---------- C67 ---------- */

/** Le relevé ne porte pas les règles `@icons` : il ne juge que la propriété qui pilote l'icône, et dit sa limite pour le reste. */
function controlerLesReglesIcones(icones: Map<string, Source[]>, releve: ReleveDeComposant): Constat[] {
  const groupes = new Map<string, Constat>();
  const declarees = new Set(releve.proprietes.filter((p) => p.type === 'INSTANCE_SWAP').map((p) => p.nom));
  for (const [nom, liste] of icones) {
    for (const source of liste) {
      const propriete = source.layer.instanceDe?.pilotee ?? null;
      if (propriete !== null && !declarees.has(propriete)) {
        ajouter(groupes, `C67:${nom}:propriete-absente`, source,
          { calque: nom, motif: 'propriete-absente', propriete }, { code: 'C67', type: 'verifier', famille: 'regles' });
        continue;
      }
      const faits: Constat['faits'] = propriete === null
        ? { calque: nom, cause: 'icone-non-pilotee' }
        : { calque: nom, cause: 'icones-permises-non-lues', propriete };
      ajouter(groupes, `C67:${nom}:limite:${String(faits.cause)}`, source, faits,
        { code: 'C67', type: 'info', famille: 'regles', limite: true });
    }
  }
  return [...groupes.values()];
}

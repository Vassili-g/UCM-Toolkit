/**
 * Contraste et accessibilité d'un composant (C49 à C53) sur le dessin Figma
 * relevé. Les seuils WCAG sont jugés sans arrondi, par `atteintLeSeuil`. La
 * cible, l'anneau UCM et la taille du texte sont des recommandations : le
 * dessin ne prouve pas la cible réelle. Un fond ou une couleur que le relevé
 * ne permet pas de calculer rend une limite, jamais un verdict.
 */
import { ETATS } from '../emplois/dossiers.js';
import { atteintLeSeuil, contraste, type Rgb8 } from '../emplois/contraste.js';
import { RECOMMANDATIONS } from '../referentiel/recommandations.js';
import type { CatalogueDeReference, CollectionDuCatalogue } from './catalogue.js';
import { collectionDuCatalogue, variableDuCatalogue } from './catalogue.js';
import type { Constat } from './constat.js';
import type { LayerLu, LiaisonLue, PeintureLue, ReleveDeComposant, VariantLu } from './releve.js';

export type NiveauWcag = 'AA' | 'AAA';

/** Borne des mesures : variants × combinaisons de modes. Au-delà, un constat d'information compte le reste. */
export const BORNE_DE_COMBINAISONS = 5000;

/** Seuils WCAG 2 : texte, grand texte, non-texte (1.4.11). */
export const SEUILS_D_ACCESSIBILITE = {
  texte: { AA: 4.5, AAA: 7 },
  grandTexte: { AA: 3, AAA: 4.5 },
  nonTexte: 3,
} as const;

/** Recommandations UCM, hors seuils WCAG : 24 px en constat, 44 px au tactile, 12 px de texte. */
export const CIBLE_MINIMALE_PX = 24;
export const CIBLE_TACTILE_PX = 44;
export const TEXTE_MINIMAL_PX = 12;

type Cause = 'fond-indetermine' | 'degrade' | 'image' | 'peinture-superposee' | 'mode-illisible' | 'couleur-absente';
type Rgba = { r: number; g: number; b: number; a: number };
type Combinaison = { modes: Map<string, string>; etiquette: string };
type Pile = { couches: Rgba[] } | { limite: Cause };
type Cible = {
  layer: LayerLu; code: 'C49' | 'C50'; usage: 'texte' | 'grand-texte' | 'icone' | 'stroke' | 'anneau';
  champ: 'fills' | 'strokes'; peintures: PeintureLue[]; liaisons: LiaisonLue[]; seuil: number; plage?: { debut: number; fin: number };
};

const OPAQUE = 1 - 1e-9;
const AXE_D_ETAT = /^(state|etat|état)$/i;
/** Un anneau se reconnaît à son nom seul, `ring` ou `focus-ring` (note P : le nom tranche). */
const NOM_D_ANNEAU = /^(focus[-_ ]?)?ring$/i;

export function controlerLAccessibilite(
  releve: ReleveDeComposant,
  catalogue: CatalogueDeReference,
  options: { niveau: NiveauWcag },
): Constat[] {
  const constats: Constat[] = [];
  const limites = new Map<string, Constat>();
  const desactives = releve.variants.filter((v) => etatDuVariant(v) === 'disabled');
  const mesures = releve.variants.filter((v) => etatDuVariant(v) !== 'disabled');

  if (desactives.length > 0) {
    constats.push({
      id: 'C53', code: 'C53', type: 'info', famille: 'contraste',
      variants: desactives.map((v) => v.nom), layers: [], faits: { variantsExclus: desactives.length },
    });
  }

  let reste = BORNE_DE_COMBINAISONS;
  let nonMesurees = 0;
  let mesureesTotal = 0;
  for (const variant of mesures) {
    const combinaisons = combinaisonsDeModes(variant, catalogue);
    const prises = combinaisons.slice(0, Math.max(0, reste));
    reste -= prises.length;
    mesureesTotal += prises.length;
    nonMesurees += combinaisons.length - prises.length;
    if (prises.length > 0) mesurerLeVariant(variant, prises, catalogue, options.niveau, constats, limites);
  }
  constats.push(...limites.values());
  if (nonMesurees > 0) {
    constats.push({
      id: 'C49:borne', code: 'C49', type: 'info', famille: 'contraste', variants: [], layers: [], limite: true,
      faits: { borne: BORNE_DE_COMBINAISONS, combinaisonsMesurees: mesureesTotal, combinaisonsNonMesurees: nonMesurees },
    });
  }

  constats.push(...controlerLesCibles(mesures, estInteractif(releve)));
  constats.push(...controlerLeTexteMinimal(mesures));
  constats.push(...controlerLAnneau(mesures));
  return constats;
}

function etatDuVariant(variant: VariantLu): string | null {
  for (const [axe, valeur] of Object.entries(variant.valeurs)) if (AXE_D_ETAT.test(axe)) return valeur.toLowerCase();
  return null;
}

function estInteractif(releve: ReleveDeComposant): boolean {
  return releve.proprietes.some((p) => p.type === 'VARIANT' && AXE_D_ETAT.test(p.nom)
    && (p.valeurs ?? []).some((v) => v.toLowerCase() !== 'default' && (ETATS as readonly string[]).includes(v.toLowerCase())));
}

function layersVisibles(variant: VariantLu): LayerLu[] {
  return variant.layers.filter((l) => l.visible);
}

function estGrandTexte(fontSize: number, fontWeight: number): boolean {
  return fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);
}

function estIcone(layer: LayerLu): boolean {
  return layer.type === 'VECTOR' || layer.type === 'BOOLEAN_OPERATION';
}

function aUnePeintureVisible(layer: LayerLu, champ: 'fills' | 'strokes'): boolean {
  return layer.peintures.some((p) => p.champ === champ && p.visible);
}

/* ---------- Couleurs et modes ---------- */

function collectionsAtteintes(
  catalogue: CatalogueDeReference, cle: string, vues: Set<string>, atteintes: Map<string, CollectionDuCatalogue>,
): void {
  if (vues.has(cle)) return;
  vues.add(cle);
  const variable = variableDuCatalogue(catalogue, cle);
  if (variable === 'absente') return;
  const collection = collectionDuCatalogue(catalogue, variable.collection);
  if (collection !== 'absente') atteintes.set(collection.cle, collection);
  for (const valeur of Object.values(variable.valeurs ?? {})) {
    if ('alias' in valeur) collectionsAtteintes(catalogue, valeur.alias, vues, atteintes);
  }
}

function liaisonsDeCouleur(layer: LayerLu): LiaisonLue[] {
  const plages = (layer.texte?.plages ?? []).flatMap((p) => p.liaisons);
  return [...layer.liaisons, ...plages].filter((l) => l.champ === 'fills' || l.champ === 'strokes');
}

function modeEffectif(variant: VariantLu, collection: CollectionDuCatalogue): string | null {
  const brut = variant.modesEffectifs[collection.cle] ?? variant.modesEffectifs[collection.nom];
  if (brut === undefined) return null;
  return collection.modes.find((m) => m.id === brut || m.nom === brut)?.id ?? null;
}

/** Le mode effectif du variant d'abord, puis les autres modes de chaque collection atteinte. */
function combinaisonsDeModes(variant: VariantLu, catalogue: CatalogueDeReference): Combinaison[] {
  const atteintes = new Map<string, CollectionDuCatalogue>();
  const vues = new Set<string>();
  for (const layer of layersVisibles(variant)) {
    for (const liaison of liaisonsDeCouleur(layer)) collectionsAtteintes(catalogue, liaison.variable.cle, vues, atteintes);
  }
  let combinaisons: Combinaison[] = [{ modes: new Map(), etiquette: '' }];
  for (const collection of atteintes.values()) {
    const effectif = modeEffectif(variant, collection);
    const modes = [...collection.modes].sort((a, b) => Number(b.id === effectif) - Number(a.id === effectif));
    if (modes.length === 0) continue;
    combinaisons = combinaisons.flatMap((c) => modes.map((m) => ({
      modes: new Map(c.modes).set(collection.cle, m.id),
      etiquette: [c.etiquette, `${collection.nom} en ${m.nom}`].filter(Boolean).join(', '),
    })));
  }
  return combinaisons;
}

function couleurDeLiaison(
  catalogue: CatalogueDeReference, variant: VariantLu, combinaison: Combinaison, cle: string, profondeur = 0,
): Rgba | 'mode-illisible' {
  if (profondeur > 10) return 'mode-illisible';
  const variable = variableDuCatalogue(catalogue, cle);
  if (variable === 'absente' || variable.etat !== 'presente' || !variable.valeurs) return 'mode-illisible';
  const collection = collectionDuCatalogue(catalogue, variable.collection);
  if (collection === 'absente' || collection.etat !== 'lue') return 'mode-illisible';
  const modeId = combinaison.modes.get(collection.cle) ?? modeEffectif(variant, collection) ?? collection.modes[0]?.id;
  const valeur = modeId !== undefined ? variable.valeurs[modeId] : undefined;
  if (!valeur) return 'mode-illisible';
  if ('alias' in valeur) return couleurDeLiaison(catalogue, variant, combinaison, valeur.alias, profondeur + 1);
  const c = valeur.valeur as Partial<Rgba> | null;
  if (!c || typeof c !== 'object' || typeof c.r !== 'number' || typeof c.g !== 'number' || typeof c.b !== 'number') return 'mode-illisible';
  return { r: c.r, g: c.g, b: c.b, a: typeof c.a === 'number' ? c.a : 1 };
}

/** Les couches unies d'une liste de peintures, de la plus haute à la première opaque. */
function pileDePeintures(
  peintures: PeintureLue[], liaisons: LiaisonLue[], opaciteDuLayer: number,
  catalogue: CatalogueDeReference, variant: VariantLu, combinaison: Combinaison,
): Pile {
  const couches: Rgba[] = [];
  for (let i = peintures.length - 1; i >= 0; i--) {
    const p = peintures[i];
    if (!p.visible || p.opacite === 0) continue;
    if (p.type !== 'SOLID') {
      if (couches.length > 0) return { limite: 'peinture-superposee' };
      return { limite: p.type.startsWith('GRADIENT') ? 'degrade' : p.type === 'IMAGE' || p.type === 'VIDEO' ? 'image' : 'peinture-superposee' };
    }
    if (p.blendMode !== 'NORMAL' && p.blendMode !== 'PASS_THROUGH') return { limite: 'peinture-superposee' };
    const liaison = liaisons.find((l) => l.champ === p.champ && (l.indice ?? 0) === p.indice);
    let couleur: Rgba | undefined = p.couleur;
    if (liaison) {
      const lue = couleurDeLiaison(catalogue, variant, combinaison, liaison.variable.cle);
      if (lue === 'mode-illisible') return { limite: 'mode-illisible' };
      couleur = lue;
    }
    if (!couleur) return { limite: 'couleur-absente' };
    const a = couleur.a * p.opacite * opaciteDuLayer;
    couches.push({ r: couleur.r, g: couleur.g, b: couleur.b, a });
    if (a >= OPAQUE) break;
  }
  return { couches };
}

/** Compose des couches (de la plus haute à la plus basse) sur une base ; sans base, la dernière doit être opaque. */
function composer(couches: Rgba[], base: Rgba | null): Rgba | null {
  let resultat = base;
  for (let i = couches.length - 1; i >= 0; i--) {
    const c = couches[i];
    if (!resultat) {
      if (c.a < OPAQUE) return null;
      resultat = { ...c, a: 1 };
      continue;
    }
    resultat = {
      r: c.r * c.a + resultat.r * (1 - c.a), g: c.g * c.a + resultat.g * (1 - c.a),
      b: c.b * c.a + resultat.b * (1 - c.a), a: 1,
    };
  }
  return resultat;
}

function fondEffectif(
  variant: VariantLu, layer: LayerLu, catalogue: CatalogueDeReference, combinaison: Combinaison,
): Rgba | { limite: Cause } {
  const parId = new Map(variant.layers.map((l) => [l.id, l]));
  const couches: Rgba[] = [];
  let courant = layer.parent ? parId.get(layer.parent) : undefined;
  while (courant) {
    if (courant.visible) {
      const fills = courant.peintures.filter((p) => p.champ === 'fills');
      const pile = pileDePeintures(fills, courant.liaisons, courant.opacite, catalogue, variant, combinaison);
      if ('limite' in pile) return pile;
      couches.push(...pile.couches);
      if (pile.couches.some((c) => c.a >= OPAQUE)) break;
    }
    courant = courant.parent ? parId.get(courant.parent) : undefined;
  }
  return composer(couches, null) ?? { limite: 'fond-indetermine' };
}

function versRgb8(c: Rgba): Rgb8 {
  const borne = (x: number) => Math.round(Math.min(1, Math.max(0, x)) * 255);
  return [borne(c.r), borne(c.g), borne(c.b)];
}

/* ---------- C49 et C50 ---------- */

function ciblesDeContraste(variant: VariantLu, niveau: NiveauWcag): Cible[] {
  const cibles: Cible[] = [];
  for (const layer of layersVisibles(variant)) {
    if (layer.type === 'TEXT') {
      for (const plage of layer.texte?.plages ?? []) {
        const grand = estGrandTexte(plage.fontSize, plage.fontWeight);
        cibles.push({
          layer, code: 'C49', usage: grand ? 'grand-texte' : 'texte', champ: 'fills',
          peintures: plage.peintures, liaisons: plage.liaisons,
          seuil: grand ? SEUILS_D_ACCESSIBILITE.grandTexte[niveau] : SEUILS_D_ACCESSIBILITE.texte[niveau],
          plage: { debut: plage.debut, fin: plage.fin },
        });
      }
      continue;
    }
    const anneau = NOM_D_ANNEAU.test(layer.nom);
    if (estIcone(layer) && !anneau && aUnePeintureVisible(layer, 'fills')) {
      cibles.push({
        layer, code: 'C49', usage: 'icone', champ: 'fills', peintures: layer.peintures.filter((p) => p.champ === 'fills'),
        liaisons: layer.liaisons, seuil: SEUILS_D_ACCESSIBILITE.nonTexte,
      });
    }
    if (aUnePeintureVisible(layer, 'strokes') && (layer.strokeWeight ?? 0) > 0) {
      cibles.push({
        layer, code: 'C50', usage: anneau ? 'anneau' : 'stroke', champ: 'strokes',
        peintures: layer.peintures.filter((p) => p.champ === 'strokes'), liaisons: layer.liaisons, seuil: SEUILS_D_ACCESSIBILITE.nonTexte,
      });
    }
  }
  return cibles;
}

function mesurerLeVariant(
  variant: VariantLu, combinaisons: Combinaison[], catalogue: CatalogueDeReference, niveau: NiveauWcag,
  constats: Constat[], limites: Map<string, Constat>,
): void {
  for (const cible of ciblesDeContraste(variant, niveau)) {
    let pire: { rapport: number; etiquette: string } | null = null;
    let echecs = 0;
    const causes = new Set<Cause>();
    for (const combinaison of combinaisons) {
      const fond = fondEffectif(variant, cible.layer, catalogue, combinaison);
      if ('limite' in fond) { causes.add(fond.limite); continue; }
      const pile = pileDePeintures(cible.peintures, cible.liaisons, cible.layer.opacite, catalogue, variant, combinaison);
      if ('limite' in pile) { causes.add(pile.limite); continue; }
      const premier = composer(pile.couches, fond);
      if (!premier) continue;
      const rapport = contraste(versRgb8(premier), versRgb8(fond));
      if (atteintLeSeuil(rapport, cible.seuil)) continue;
      echecs++;
      if (!pire || rapport < pire.rapport) pire = { rapport, etiquette: combinaison.etiquette };
    }
    const base = `${cible.code}:${cible.layer.nom}:${cible.usage}${cible.plage ? `:${cible.plage.debut}-${cible.plage.fin}` : ''}`;
    for (const cause of causes) {
      const cle = `${base}:limite:${cause}`;
      const existant = limites.get(cle);
      if (existant) {
        if (!existant.variants.includes(variant.nom)) existant.variants.push(variant.nom);
        existant.layers.push(cible.layer.id);
      } else {
        limites.set(cle, {
          id: cle, code: cible.code, type: 'info', famille: 'contraste', variants: [variant.nom], layers: [cible.layer.id],
          faits: { cause, champ: cible.champ, usage: cible.usage, calque: cible.layer.nom }, limite: true,
        });
      }
    }
    if (pire) {
      constats.push({
        id: `${base}:${variant.id}`, code: cible.code, type: 'corriger', famille: 'contraste',
        variants: [variant.nom], layers: [cible.layer.id],
        faits: {
          usage: cible.usage, champ: cible.champ, calque: cible.layer.nom, rapport: Math.floor(pire.rapport * 100) / 100,
          seuil: cible.seuil, niveau, mode: pire.etiquette, autresModes: echecs - 1,
        },
      });
    }
  }
}

/* ---------- C50 (anneau absent) et C51 ---------- */

function estEnFocus(variant: VariantLu): boolean {
  return etatDuVariant(variant)?.startsWith('focus') ?? false;
}

function anneauxDuVariant(variant: VariantLu): LayerLu[] {
  return layersVisibles(variant).filter((l) => NOM_D_ANNEAU.test(l.nom) && l.type !== 'TEXT' && l.peintures.some((p) => p.visible));
}

function controlerLAnneau(variants: VariantLu[]): Constat[] {
  const constats: Constat[] = [];
  const recommandation = RECOMMANDATIONS.find((r) => r.id === 'anneau-de-focus');
  const epaisseur = Number(recommandation?.parametres.epaisseur ?? 2);
  const espace = Number(recommandation?.parametres.espace ?? 2);
  const sansAnneau = variants.filter((v) => estEnFocus(v) && anneauxDuVariant(v).length === 0);
  if (sansAnneau.length > 0) {
    constats.push({
      id: 'C50:sans-anneau', code: 'C50', type: 'corriger', famille: 'contraste',
      variants: sansAnneau.map((v) => v.nom), layers: [], faits: { anneauVisible: 0, variantsEnFocus: sansAnneau.length },
    });
  }
  for (const variant of variants) {
    for (const anneau of anneauxDuVariant(variant)) {
      if (anneau.strokeWeight === undefined || anneau.strokeWeight === epaisseur) continue;
      constats.push({
        id: `C51:${anneau.nom}:${variant.id}`, code: 'C51', type: 'verifier', famille: 'contraste',
        variants: [variant.nom], layers: [anneau.id],
        faits: { calque: anneau.nom, strokeWeight: anneau.strokeWeight, epaisseurRecommandee: epaisseur, espaceRecommande: espace },
      });
    }
  }
  return constats;
}

/* ---------- C52 et texte sous 12 px ---------- */

function controlerLesCibles(variants: VariantLu[], interactif: boolean): Constat[] {
  if (!interactif) return [];
  const groupes = new Map<string, Constat>();
  for (const variant of variants) {
    const racine = variant.layers.find((l) => l.parent === null);
    if (!racine) continue;
    const { largeur, hauteur } = racine.dimensions;
    const minimum = Math.min(largeur, hauteur);
    const seuil = minimum < CIBLE_MINIMALE_PX ? CIBLE_MINIMALE_PX : minimum < CIBLE_TACTILE_PX ? CIBLE_TACTILE_PX : null;
    if (seuil === null) continue;
    const id = `C52:${largeur}x${hauteur}:${seuil}`;
    const existant = groupes.get(id);
    if (existant) { existant.variants.push(variant.nom); existant.layers.push(racine.id); continue; }
    groupes.set(id, {
      id, code: 'C52', type: seuil === CIBLE_MINIMALE_PX ? 'corriger' : 'verifier', famille: 'contraste',
      variants: [variant.nom], layers: [racine.id], faits: { largeur, hauteur, seuil },
    });
  }
  return [...groupes.values()];
}

function controlerLeTexteMinimal(variants: VariantLu[]): Constat[] {
  const groupes = new Map<string, Constat>();
  for (const variant of variants) {
    for (const layer of layersVisibles(variant)) {
      if (layer.type !== 'TEXT') continue;
      for (const plage of layer.texte?.plages ?? []) {
        if (plage.fontSize >= TEXTE_MINIMAL_PX) continue;
        const id = `C49:taille:${layer.nom}:${plage.fontSize}`;
        const existant = groupes.get(id);
        if (existant) {
          if (!existant.variants.includes(variant.nom)) existant.variants.push(variant.nom);
          existant.layers.push(layer.id);
          continue;
        }
        groupes.set(id, {
          id, code: 'C49', type: 'verifier', famille: 'contraste', variants: [variant.nom], layers: [layer.id],
          faits: { calque: layer.nom, fontSize: plage.fontSize, seuil: TEXTE_MINIMAL_PX },
        });
      }
    }
  }
  return [...groupes.values()];
}

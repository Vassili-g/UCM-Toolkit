/** Écarts entre les liaisons lues et les axes, rôles et portées du composant. */
import { formeReconnue, termeReconnu } from '../referentiel/reconnaissance.js';
import { REGISTRE_ROLES } from '../referentiel/vocabulaire.js';
import { collectionParCle, variableDuCatalogue, type CatalogueDeReference, type VariableDuCatalogue } from './catalogue.js';
import type { Constat } from './constat.js';
import { axesDuReleveParEtapes, constatDuComposant, estDuComposant, memeValeurDAxe, segmentDAxe, tokensDuComposantParEtapes, type AxeDuComposant, type ProprieteDAxe, type TokenDuComposant } from './nommage.js';
import type { LayerLu, LiaisonLue, ReleveDeComposant, VariantLu } from './releve.js';

export interface LiaisonDuComposant { variant: VariantLu; layer: LayerLu; liaison: LiaisonLue }

export function liaisonsDuReleve(releve: ReleveDeComposant): LiaisonDuComposant[] {
  const liaisons: LiaisonDuComposant[] = [];
  for (const liaison of parcourirLesLiaisons(releve)) if (liaison) liaisons.push(liaison);
  return liaisons;
}

function* parcourirLesLiaisons(releve: ReleveDeComposant): Generator<LiaisonDuComposant | undefined> {
  for (const variant of releve.variants) {
    yield;
    for (const layer of variant.layers) {
      yield;
      for (const liaison of layer.liaisons) yield { variant, layer, liaison };
    }
  }
}

/** Le layer que la liaison peint : celui de l'instance qu'une surcharge lie, sinon le layer lu. */
function layerPeint(layer: LayerLu, liaison: LiaisonLue): { nom: string; type: string } {
  return liaison.surcharge ?? layer;
}

/** Une icône : un tracé, un layer dont le nom dit « icon », ou une instance qu'une propriété INSTANCE_SWAP pilote. */
function estUneIcone(layer: LayerLu, liaison: LiaisonLue): boolean {
  const peint = layerPeint(layer, liaison);
  if (peint.type === 'VECTOR' || peint.type === 'BOOLEAN_OPERATION' || /icon/i.test(peint.nom)) return true;
  return !liaison.surcharge && (layer.instanceDe?.pilotee ?? null) !== null;
}

/** Les rôles admis pour la liaison : le premier est celui qu'une correction pose. Une icône prend `icon` ou `foreground`. */
function rolesAdmis(layer: LayerLu, liaison: LiaisonLue): readonly string[] | undefined {
  const peint = layerPeint(layer, liaison);
  if (liaison.champ === 'strokes') return /ring|focus/i.test(peint.nom) ? ['ring'] : ['border', 'foreground'];
  if (liaison.champ !== 'fills') return undefined;
  if (peint.type === 'TEXT' || liaison.plage) return ['foreground', 'text'];
  if (estUneIcone(layer, liaison)) return ['icon', 'foreground'];
  return ['background'];
}

function porteeAttendue(layer: LayerLu, liaison: LiaisonLue): string | undefined {
  if (liaison.champ === 'strokes') return 'STROKE_COLOR';
  if (liaison.champ === 'fills') return layerPeint(layer, liaison).type === 'TEXT' || liaison.plage ? 'TEXT_FILL' : 'FRAME_FILL';
  return undefined;
}

function porteeCompatible(scopes: readonly string[], attendue: string): boolean {
  if (scopes.includes('ALL_SCOPES')) return true;
  if (attendue === 'STROKE_COLOR') return scopes.includes('STROKE_COLOR');
  return scopes.includes(attendue) || scopes.includes('ALL_FILLS');
}

function signatureDeCible(retenue: VariableDuCatalogue, catalogue: CatalogueDeReference): string {
  const collection = collectionParCle(catalogue, retenue.collection);
  const segments = retenue.nom.split('/');
  if (collection?.role === 'theme' && segments.length > 1) return `${collection.role}:${segments.slice(1).map(formeReconnue).join('/')}`;
  return `${collection?.role ?? retenue.collection}:${segments.map(formeReconnue).join('/')}`;
}

/** Réunit la cible de chaque mode, triée : l'écart d'un seul mode change la signature, l'ordre des modes ne la change pas. */
function* signature(variable: VariableDuCatalogue, catalogue: CatalogueDeReference): Generator<void, string> {
  const modes = Object.values(variable.valeurs ?? {});
  const cibles: string[] = [];
  for (const valeur of modes.length ? modes : [{ valeur: null }]) {
    yield;
    const cible = 'alias' in valeur ? variableDuCatalogue(catalogue, valeur.alias) : 'absente';
    cibles.push(signatureDeCible(cible === 'absente' ? variable : cible, catalogue));
  }
  return [...new Set(cibles)].sort().join(' | ');
}

/**
 * Une liaison dont le token porte, sur chaque axe qu'il nomme, la valeur de son variant est juste : elle reste dans le groupe
 * et dans le compte de la majorité, mais C21 ne la vise pas. Un token sans segment d'axe n'est jamais juste.
 */
function* porteLesValeursDeSonVariant(
  variant: VariantLu, variable: VariableDuCatalogue,
  axes: Partial<Record<AxeDuComposant, ProprieteDAxe>>, tokens: Map<string, TokenDuComposant>,
): Generator<void, boolean> {
  const token = tokens.get(variable.cle);
  if (!token) return false;
  let lus = 0;
  for (const [axe, propriete] of Object.entries(axes) as [AxeDuComposant, NonNullable<typeof axes[AxeDuComposant]>][]) {
    yield;
    const dansLeToken = segmentDAxe(token, axe);
    const dansLeVariant = variant.valeurs[propriete.nom];
    if (!dansLeToken || !dansLeVariant) continue;
    if (!memeValeurDAxe(axe, dansLeToken, dansLeVariant)) return false;
    lus += 1;
  }
  return lus > 0;
}

function* ecartsDeFratrie(releve: ReleveDeComposant, catalogue: CatalogueDeReference): Generator<void, Constat[]> {
  const axes = yield* axesDuReleveParEtapes(releve);
  const tokens = new Map((yield* tokensDuComposantParEtapes(releve, catalogue)).map((token) => [token.variable.cle, token]));
  const groupes = new Map<string, { variant: VariantLu; layer: LayerLu; liaison: LiaisonLue; signe: string }[]>();
  for (const lue of parcourirLesLiaisons(releve)) {
    yield;
    if (!lue) continue;
    const { variant, layer, liaison } = lue;
    const variable = variableDuCatalogue(catalogue, liaison.variable.cle);
    if (variable === 'absente') continue;
    // Les liaisons d'une instance se départagent par le layer intérieur qu'elles peignent.
    const cle = `${formeReconnue(layer.nom)}:${liaison.surcharge ? formeReconnue(liaison.surcharge.nom) : ''}:${liaison.champ}:${liaison.indice ?? ''}:${liaison.plage?.debut ?? ''}`;
    const groupe = groupes.get(cle) ?? [];
    const signe = yield* signature(variable, catalogue);
    groupe.push({ variant, layer, liaison, signe });
    groupes.set(cle, groupe);
  }
  const constats: Constat[] = [];
  for (const groupe of groupes.values()) {
    yield;
    const occurrences = new Map<string, number>();
    for (const entree of groupe) {
      yield;
      occurrences.set(entree.signe, (occurrences.get(entree.signe) ?? 0) + 1);
    }
    const majoritaires: [string, number][] = [];
    for (const occurrence of occurrences) {
      yield;
      if (occurrence[1] >= 2) majoritaires.push(occurrence);
    }
    majoritaires.sort((a, b) => b[1] - a[1]);
    if (!majoritaires.length || majoritaires[0][1] <= groupe.length / 2) continue;
    let exemple = '';
    for (const entree of groupe) {
      yield;
      if (entree.signe !== majoritaires[0][0]) continue;
      exemple = entree.liaison.variable.nom;
      break;
    }
    for (const entree of groupe) {
      yield;
      if (entree.signe === majoritaires[0][0]) continue;
      const variable = variableDuCatalogue(catalogue, entree.liaison.variable.cle);
      if (variable !== 'absente' && (yield* porteLesValeursDeSonVariant(entree.variant, variable, axes, tokens))) continue;
      constats.push(constatDuComposant('C21', 'liaisons', 'verifier', `${entree.variant.id}:${entree.layer.id}:${entree.liaison.surcharge?.id ?? ''}:${entree.liaison.champ}`, {
        nom: entree.liaison.variable.nom, majorite: majoritaires[0][0], autres: majoritaires[0][1], exemple, champ: entree.liaison.champ,
      }, [entree.variant.id], [entree.layer.id]));
    }
  }
  return constats;
}

export function controlerMapping(releve: ReleveDeComposant, catalogue: CatalogueDeReference): Constat[] {
  const calcul = controlerMappingParEtapes(releve, catalogue);
  let etape = calcul.next();
  while (!etape.done) etape = calcul.next();
  return etape.value;
}

/** Cède dans les axes, les tokens, les liaisons, les modes et la fratrie ; les constats gardent leur ordre. */
export function* controlerMappingParEtapes(releve: ReleveDeComposant, catalogue: CatalogueDeReference): Generator<void, Constat[]> {
  const axes = yield* axesDuReleveParEtapes(releve);
  const tokens = new Map((yield* tokensDuComposantParEtapes(releve, catalogue)).map((token) => [token.variable.cle, token]));
  const constats: Constat[] = [];
  for (const lue of parcourirLesLiaisons(releve)) {
    yield;
    if (!lue) continue;
    const { variant, layer, liaison } = lue;
    const variable = variableDuCatalogue(catalogue, liaison.variable.cle);
    if (variable === 'absente') continue;
    const lieu = `${variant.id}:${layer.id}${liaison.surcharge ? `>${liaison.surcharge.id}` : ''}:${liaison.champ}:${liaison.indice ?? ''}:${liaison.plage?.debut ?? ''}`;
    const token = tokens.get(variable.cle);
    if (token) {
      for (const [axe, propriete] of Object.entries(axes) as [AxeDuComposant, NonNullable<typeof axes[AxeDuComposant]>][]) {
        yield;
        const dansLeToken = segmentDAxe(token, axe);
        const dansLeVariant = variant.valeurs[propriete.nom];
        if (!dansLeToken || !dansLeVariant || memeValeurDAxe(axe, dansLeToken, dansLeVariant)) continue;
        let appartientALAxe = false;
        for (const valeur of propriete.valeurs ?? []) {
          yield;
          if (memeValeurDAxe(axe, valeur, dansLeToken)) { appartientALAxe = true; break; }
        }
        if (!appartientALAxe) continue;
        const code = axe === 'etat' ? 'C16' : 'C15';
        constats.push(constatDuComposant(code, 'liaisons', 'corriger', `${lieu}:${axe}`, {
          axe: propriete.nom, valeur: dansLeVariant, token: variable.nom, segment: dansLeToken,
          champ: liaison.champ,
          ...(liaison.surcharge ? { surcharge: liaison.surcharge.id } : {}),
          ...(liaison.indice === undefined ? {} : { indice: liaison.indice }),
          ...(liaison.plage ? { plageDebut: liaison.plage.debut, plageFin: liaison.plage.fin } : {}),
        }, [variant.id], [layer.id]));
      }
      const role = token.lecture.find((segment) => segment.role === 'role')?.terme
        ?? termeReconnu(REGISTRE_ROLES, token.segments.at(-1) ?? '')?.id;
      const admis = rolesAdmis(layer, liaison);
      if (role && admis && !admis.includes(role)) {
        constats.push(constatDuComposant('C17', 'liaisons', 'corriger', lieu, {
          token: variable.nom, role, attendu: admis[0], champ: liaison.champ,
          ...(liaison.surcharge ? { surcharge: liaison.surcharge.id, calque: liaison.surcharge.nom } : {}),
          ...(liaison.indice === undefined ? {} : { indice: liaison.indice }),
          ...(liaison.plage ? { plageDebut: liaison.plage.debut, plageFin: liaison.plage.fin } : {}),
        }, [variant.id], [layer.id]));
      }
    } else {
      const collection = collectionParCle(catalogue, variable.collection);
      if (collection?.role === 'components' && !estDuComposant(variable.nom, releve.jeu.nom)) {
        constats.push(constatDuComposant('C19', 'liaisons', 'corriger', lieu, { token: variable.nom, composant: releve.jeu.nom }, [variant.id], [layer.id]));
      }
    }
    const attendue = porteeAttendue(layer, liaison);
    if (attendue && variable.scopes?.length && !porteeCompatible(variable.scopes, attendue)) {
      constats.push(constatDuComposant('C18', 'liaisons', 'verifier', lieu, {
        token: variable.nom, champ: liaison.champ, portee: attendue,
      }, [variant.id], [layer.id]));
    }
  }
  const fratrie = yield* ecartsDeFratrie(releve, catalogue);
  return [...constats, ...fratrie];
}

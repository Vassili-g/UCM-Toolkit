/** Écarts entre les liaisons lues et les axes, rôles et portées du composant. */
import { formeReconnue, termeReconnu } from '../referentiel/reconnaissance.js';
import { REGISTRE_ETATS, REGISTRE_ROLES, REGISTRE_TAILLES } from '../referentiel/vocabulaire.js';
import { variableDuCatalogue, type CatalogueDeReference, type VariableDuCatalogue } from './catalogue.js';
import type { Constat } from './constat.js';
import { axesDuReleve, constatDuComposant, segmentDAxe, tokensDuComposant, type AxeDuComposant } from './nommage.js';
import type { LayerLu, LiaisonLue, ReleveDeComposant, VariantLu } from './releve.js';

export interface LiaisonDuComposant { variant: VariantLu; layer: LayerLu; liaison: LiaisonLue }

export function liaisonsDuReleve(releve: ReleveDeComposant): LiaisonDuComposant[] {
  return releve.variants.flatMap((variant) => variant.layers.flatMap((layer) => layer.liaisons.map((liaison) => ({ variant, layer, liaison }))));
}

function memeValeur(axe: AxeDuComposant, gauche: string, droite: string): boolean {
  const registre = axe === 'etat' ? REGISTRE_ETATS : axe === 'taille' ? REGISTRE_TAILLES : null;
  const termeGauche = registre && termeReconnu(registre, gauche)?.id;
  const termeDroite = registre && termeReconnu(registre, droite)?.id;
  return !!(termeGauche && termeDroite && termeGauche === termeDroite) || formeReconnue(gauche) === formeReconnue(droite);
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
  if (liaison.champ === 'strokes') return /ring|focus/i.test(peint.nom) ? ['ring'] : ['border'];
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
  const collection = catalogue.collections.find((entree) => entree.cle === retenue.collection);
  const segments = retenue.nom.split('/');
  if (collection?.role === 'theme' && segments.length > 1) return `${collection.role}:${segments.slice(1).map(formeReconnue).join('/')}`;
  return `${collection?.role ?? retenue.collection}:${segments.map(formeReconnue).join('/')}`;
}

/** Réunit la cible de chaque mode, triée : l'écart d'un seul mode change la signature, l'ordre des modes ne la change pas. */
function signature(variable: VariableDuCatalogue, catalogue: CatalogueDeReference): string {
  const modes = Object.values(variable.valeurs ?? {});
  const cibles = (modes.length ? modes : [{ valeur: null }]).map((valeur) => {
    const cible = 'alias' in valeur ? variableDuCatalogue(catalogue, valeur.alias) : 'absente';
    return signatureDeCible(cible === 'absente' ? variable : cible, catalogue);
  });
  return [...new Set(cibles)].sort().join(' | ');
}

function ecartsDeFratrie(releve: ReleveDeComposant, catalogue: CatalogueDeReference): Constat[] {
  const groupes = new Map<string, { variant: VariantLu; layer: LayerLu; liaison: LiaisonLue; signe: string }[]>();
  for (const { variant, layer, liaison } of liaisonsDuReleve(releve)) {
    const variable = variableDuCatalogue(catalogue, liaison.variable.cle);
    if (variable === 'absente') continue;
    // Les liaisons d'une instance se départagent par le layer intérieur qu'elles peignent.
    const cle = `${formeReconnue(layer.nom)}:${liaison.surcharge ? formeReconnue(liaison.surcharge.nom) : ''}:${liaison.champ}:${liaison.indice ?? ''}:${liaison.plage?.debut ?? ''}`;
    const groupe = groupes.get(cle) ?? [];
    groupe.push({ variant, layer, liaison, signe: signature(variable, catalogue) });
    groupes.set(cle, groupe);
  }
  const constats: Constat[] = [];
  for (const groupe of groupes.values()) {
    const occurrences = new Map<string, number>();
    for (const entree of groupe) occurrences.set(entree.signe, (occurrences.get(entree.signe) ?? 0) + 1);
    const majoritaires = [...occurrences].filter(([, nombre]) => nombre >= 2).sort((a, b) => b[1] - a[1]);
    if (!majoritaires.length || majoritaires[0][1] <= groupe.length / 2) continue;
    const exemple = groupe.find((entree) => entree.signe === majoritaires[0][0])?.liaison.variable.nom ?? '';
    for (const entree of groupe) {
      if (entree.signe === majoritaires[0][0]) continue;
      constats.push(constatDuComposant('C21', 'liaisons', 'verifier', `${entree.variant.id}:${entree.layer.id}:${entree.liaison.surcharge?.id ?? ''}:${entree.liaison.champ}`, {
        nom: entree.liaison.variable.nom, majorite: majoritaires[0][0], autres: majoritaires[0][1], exemple, champ: entree.liaison.champ,
      }, [entree.variant.id], [entree.layer.id]));
    }
  }
  return constats;
}

export function controlerMapping(releve: ReleveDeComposant, catalogue: CatalogueDeReference): Constat[] {
  const axes = axesDuReleve(releve);
  const tokens = new Map(tokensDuComposant(releve, catalogue).map((token) => [token.variable.cle, token]));
  const constats: Constat[] = [];
  for (const { variant, layer, liaison } of liaisonsDuReleve(releve)) {
    const variable = variableDuCatalogue(catalogue, liaison.variable.cle);
    if (variable === 'absente') continue;
    const lieu = `${variant.id}:${layer.id}${liaison.surcharge ? `>${liaison.surcharge.id}` : ''}:${liaison.champ}:${liaison.indice ?? ''}:${liaison.plage?.debut ?? ''}`;
    const token = tokens.get(variable.cle);
    if (token) {
      for (const [axe, propriete] of Object.entries(axes) as [AxeDuComposant, NonNullable<typeof axes[AxeDuComposant]>][]) {
        const dansLeToken = segmentDAxe(token, axe);
        const dansLeVariant = variant.valeurs[propriete.nom];
        if (!dansLeToken || !dansLeVariant || memeValeur(axe, dansLeToken, dansLeVariant)) continue;
        if (!(propriete.valeurs ?? []).some((valeur) => memeValeur(axe, valeur, dansLeToken))) continue;
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
      const collection = catalogue.collections.find((entree) => entree.cle === variable.collection);
      if (collection?.role === 'components' && formeReconnue(variable.nom.split('/')[0]) !== formeReconnue(releve.jeu.nom)) {
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
  return [...constats, ...ecartsDeFratrie(releve, catalogue)];
}

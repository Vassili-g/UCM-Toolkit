/** Matrice des variants et couverture des tokens du catalogue. */
import { formeReconnue, termeReconnu } from '../referentiel/reconnaissance.js';
import { REGISTRE_ETATS, REGISTRE_TAILLES } from '../referentiel/vocabulaire.js';
import type { CatalogueDeReference } from './catalogue.js';
import type { Constat } from './constat.js';
import { liaisonsDuReleve } from './mapping.js';
import { axesDuReleve, constatDuComposant, segmentDAxe, tokensDuComposant, type AxeDuComposant, type TokenDuComposant } from './nommage.js';
import type { ReleveDeComposant, VariantLu } from './releve.js';

function memeValeur(axe: AxeDuComposant, gauche: string, droite: string): boolean {
  const registre = axe === 'etat' ? REGISTRE_ETATS : axe === 'taille' ? REGISTRE_TAILLES : null;
  const premier = registre && termeReconnu(registre, gauche)?.id;
  const second = registre && termeReconnu(registre, droite)?.id;
  return !!(premier && second && premier === second) || formeReconnue(gauche) === formeReconnue(droite);
}

function tokenDuVariant(
  token: TokenDuComposant, variant: VariantLu,
  axes: ReturnType<typeof axesDuReleve>,
): boolean {
  return (Object.entries(axes) as [AxeDuComposant, NonNullable<typeof axes[AxeDuComposant]>][]).every(([axe, propriete]) => {
    const segment = segmentDAxe(token, axe);
    return !segment || !!variant.valeurs[propriete.nom] && memeValeur(axe, segment, variant.valeurs[propriete.nom]);
  });
}

function* combinaisons(axes: ReleveDeComposant['proprietes']): Generator<void, Record<string, string>[]> {
  let resultat: Record<string, string>[] = [{}];
  for (const axe of axes) {
    yield;
    if (axe.type !== 'VARIANT' || !axe.valeurs?.length) continue;
    if (resultat.length * axe.valeurs.length > 4096) return [];
    const suivantes: Record<string, string>[] = [];
    for (const combinaison of resultat) {
      for (const valeur of axe.valeurs) {
        yield;
        suivantes.push({ ...combinaison, [axe.nom]: valeur });
      }
    }
    resultat = suivantes;
  }
  return resultat;
}

export function controlerOublis(releve: ReleveDeComposant, catalogue: CatalogueDeReference): Constat[] {
  const calcul = controlerOublisParEtapes(releve, catalogue);
  let etape = calcul.next();
  while (!etape.done) etape = calcul.next();
  return etape.value;
}

/** Cède pendant la construction du produit des variants, puis entre combinaisons, tokens et variants. */
export function* controlerOublisParEtapes(releve: ReleveDeComposant, catalogue: CatalogueDeReference): Generator<void, Constat[]> {
  const constats: Constat[] = [];
  const lectureComplete = releve.lecture.variantsNonLus.length === 0 && releve.lecture.layersNonLus === 0;
  if (!lectureComplete) return constats;
  const axes = axesDuReleve(releve);
  const tokens = tokensDuComposant(releve, catalogue);
  const collection = catalogue.collections.find((entree) => entree.role === 'components');

  const matrice = yield* combinaisons(releve.proprietes);
  for (const combinaison of matrice) {
    yield;
    if (!Object.keys(combinaison).length || releve.variants.some((variant) => Object.entries(combinaison).every(([axe, valeur]) => variant.valeurs[axe] === valeur))) continue;
    constats.push(constatDuComposant('C31', 'variants', 'verifier', Object.entries(combinaison).map(([nom, valeur]) => `${nom}=${valeur}`).join(','), combinaison));
  }

  if (collection?.etat !== 'lue') return constats;
  const liees = new Set(liaisonsDuReleve(releve).map(({ liaison }) => liaison.variable.cle));
  for (const token of tokens) {
    yield;
    if (!token.lecture.length) continue;
    const sansVariant = !releve.variants.some((variant) => tokenDuVariant(token, variant, axes));
    if (!sansVariant && liees.has(token.variable.cle)) continue;
    constats.push(constatDuComposant('C32', 'tokens', 'verifier', token.variable.cle, {
      token: token.variable.nom, motif: sansVariant ? 'sans-variant' : 'inutilise',
    }));
  }

  const familles = new Map<string, TokenDuComposant[]>();
  for (const token of tokens) {
    yield;
    if (!token.lecture.length) continue;
    const famille = token.lecture.find((segment) => segment.role === 'famille')?.terme;
    if (!famille) continue;
    const groupe = familles.get(famille) ?? [];
    groupe.push(token);
    familles.set(famille, groupe);
  }
  for (const variant of releve.variants) {
    yield;
    for (const [famille, groupe] of familles) {
      if (groupe.some((token) => tokenDuVariant(token, variant, axes))) continue;
      constats.push(constatDuComposant('C33', 'variants', 'verifier', `${variant.id}:${famille}`, {
        variant: variant.nom, famille,
      }, [variant.id]));
    }
  }
  return constats;
}

/** Matrice des variants et couverture des tokens du catalogue. */
import { formeReconnue, termeReconnu } from '../referentiel/reconnaissance.js';
import { REGISTRE_ETATS, REGISTRE_TAILLES } from '../referentiel/vocabulaire.js';
import type { CatalogueDeReference } from './catalogue.js';
import type { Constat } from './constat.js';
import { axesDesProprietes, axesDuReleve, axesDuReleveParEtapes, constatDuComposant, tokensDuComposantParEtapes, type AxeDuComposant, type TokenDuComposant } from './nommage.js';
import type { ReleveDeComposant, VariantLu, WrapperLu } from './releve.js';

function memeValeur(axe: AxeDuComposant, gauche: string, droite: string): boolean {
  const registre = axe === 'etat' ? REGISTRE_ETATS : axe === 'taille' ? REGISTRE_TAILLES : null;
  const premier = registre && termeReconnu(registre, gauche)?.id;
  const second = registre && termeReconnu(registre, droite)?.id;
  return !!(premier && second && premier === second) || formeReconnue(gauche) === formeReconnue(droite);
}

function* tokenDuVariant(
  token: TokenDuComposant, variant: VariantLu,
  axes: ReturnType<typeof axesDuReleve>,
): Generator<void, boolean> {
  for (const [axe, propriete] of Object.entries(axes) as [AxeDuComposant, NonNullable<typeof axes[AxeDuComposant]>][]) {
    yield;
    let segment: string | undefined;
    for (const [rang, partie] of token.lecture.entries()) {
      yield;
      if (partie.role !== axe) continue;
      segment = token.segments[rang];
      break;
    }
    if (segment && !(variant.valeurs[propriete.nom] && memeValeur(axe, segment, variant.valeurs[propriete.nom]))) return false;
  }
  return true;
}

/** Un axe qu'un wrapper de dimensions porte et que l'hôte ne porte pas : les tokens qui ont un segment de ce rôle se lient dans ce wrapper. */
interface AxeDeWrapper {
  wrapper: WrapperLu;
  propriete: NonNullable<ReturnType<typeof axesDuReleve>[AxeDuComposant]>;
}

/** Le rôle d'un axe de wrapper que l'hôte porte aussi reste à l'hôte. */
function* axesDesWrappers(releve: ReleveDeComposant, axes: ReturnType<typeof axesDuReleve>): Generator<void, Map<AxeDuComposant, AxeDeWrapper[]>> {
  const portes = new Map<AxeDuComposant, AxeDeWrapper[]>();
  for (const wrapper of releve.wrappers ?? []) {
    yield;
    for (const [role, propriete] of Object.entries(axesDesProprietes(wrapper.proprietes)) as [AxeDuComposant, AxeDeWrapper['propriete']][]) {
      yield;
      if (axes[role]) continue;
      const groupe = portes.get(role) ?? [];
      groupe.push({ wrapper, propriete });
      portes.set(role, groupe);
    }
  }
  return portes;
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
        const suivante: Record<string, string> = {};
        for (const nom of Object.keys(combinaison)) {
          yield;
          Object.defineProperty(suivante, nom, { value: combinaison[nom], enumerable: true, writable: true, configurable: true });
        }
        Object.defineProperty(suivante, axe.nom, { value: valeur, enumerable: true, writable: true, configurable: true });
        suivantes.push(suivante);
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

/** Cède pendant la construction de la matrice et entre les vérifications de couverture. */
export function* controlerOublisParEtapes(releve: ReleveDeComposant, catalogue: CatalogueDeReference): Generator<void, Constat[]> {
  const constats: Constat[] = [];
  const lectureComplete = releve.lecture.variantsNonLus.length === 0 && releve.lecture.layersNonLus === 0;
  if (!lectureComplete) return constats;
  const axes = yield* axesDuReleveParEtapes(releve);
  const tokens = yield* tokensDuComposantParEtapes(releve, catalogue);
  let collection: CatalogueDeReference['collections'][number] | undefined;
  for (const entree of catalogue.collections) {
    yield;
    if (entree.role !== 'components') continue;
    collection = entree;
    break;
  }

  const matrice = yield* combinaisons(releve.proprietes);
  for (const combinaison of matrice) {
    yield;
    const noms = Object.keys(combinaison);
    if (!noms.length) continue;
    let presente = false;
    for (const variant of releve.variants) {
      yield;
      let correspond = true;
      for (const nom of noms) {
        yield;
        if (variant.valeurs[nom] === combinaison[nom]) continue;
        correspond = false;
        break;
      }
      if (!correspond) continue;
      presente = true;
      break;
    }
    if (presente) continue;
    const coordonnees: string[] = [];
    for (const nom of noms) {
      yield;
      coordonnees.push(`${nom}=${combinaison[nom]}`);
    }
    constats.push(constatDuComposant('C31', 'variants', 'verifier', coordonnees.join(','), combinaison));
  }

  if (collection?.etat !== 'lue') return constats;
  const liees = new Set<string>();
  for (const variant of releve.variants) {
    yield;
    for (const layer of variant.layers) {
      yield;
      for (const liaison of layer.liaisons) {
        yield;
        liees.add(liaison.variable.cle);
      }
    }
  }
  const portes = yield* axesDesWrappers(releve, axes);
  const liaisonsDuWrapper = new Map<WrapperLu, Set<string>>();
  for (const token of tokens) {
    yield;
    if (!token.lecture.length) continue;
    let sansVariant = true;
    for (const variant of releve.variants) {
      yield;
      if (!(yield* tokenDuVariant(token, variant, axes))) continue;
      sansVariant = false;
      break;
    }
    // Les rôles que l'hôte n'a pas, un wrapper les porte : le token ne vaut que si un variant du wrapper a ce segment.
    const wrappersDuToken = new Set<WrapperLu>();
    const rolesVus = new Set<string>();
    for (const [rang, segment] of token.lecture.entries()) {
      yield;
      const porteurs = portes.get(segment.role as AxeDuComposant);
      if (!porteurs || rolesVus.has(segment.role)) continue;
      rolesVus.add(segment.role);
      let porte = false;
      for (const { wrapper, propriete } of porteurs) {
        yield;
        wrappersDuToken.add(wrapper);
        for (const variant of wrapper.variants) {
          yield;
          const valeur = variant.valeurs[propriete.nom];
          if (!valeur || !memeValeur(segment.role as AxeDuComposant, token.segments[rang], valeur)) continue;
          porte = true;
          break;
        }
      }
      if (!porte) sansVariant = true;
    }
    let liee = liees.has(token.variable.cle);
    for (const wrapper of wrappersDuToken) {
      if (liee) break;
      let liaisons = liaisonsDuWrapper.get(wrapper);
      if (!liaisons) {
        liaisons = new Set();
        for (const variant of wrapper.variants) {
          yield;
          for (const liaison of variant.liaisons) {
            yield;
            liaisons.add(liaison.variable.cle);
          }
        }
        liaisonsDuWrapper.set(wrapper, liaisons);
      }
      liee = liaisons.has(token.variable.cle);
    }
    if (!sansVariant && liee) continue;
    constats.push(constatDuComposant('C32', 'tokens', 'verifier', token.variable.cle, {
      token: token.variable.nom, motif: sansVariant ? 'sans-variant' : 'inutilise',
    }));
  }

  const familles = new Map<string, TokenDuComposant[]>();
  for (const token of tokens) {
    yield;
    if (!token.lecture.length) continue;
    let famille: string | undefined;
    for (const segment of token.lecture) {
      yield;
      if (segment.role !== 'famille') continue;
      famille = segment.terme;
      break;
    }
    if (!famille) continue;
    const groupe = familles.get(famille) ?? [];
    groupe.push(token);
    familles.set(famille, groupe);
  }
  for (const variant of releve.variants) {
    yield;
    for (const [famille, groupe] of familles) {
      yield;
      let couvert = false;
      for (const token of groupe) {
        yield;
        if (!(yield* tokenDuVariant(token, variant, axes))) continue;
        couvert = true;
        break;
      }
      if (couvert) continue;
      constats.push(constatDuComposant('C33', 'variants', 'verifier', `${variant.id}:${famille}`, {
        variant: variant.nom, famille,
      }, [variant.id]));
    }
  }
  return constats;
}

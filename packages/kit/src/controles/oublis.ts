/** Matrice des variants et couverture des tokens du catalogue. */
import { natureDuChamp } from '../referentiel/architecture.js';
import { formeReconnue } from '../referentiel/reconnaissance.js';
import type { CatalogueDeReference } from './catalogue.js';
import type { Constat } from './constat.js';
import { axesDesProprietes, axesDuReleve, axesDuReleveParEtapes, constatDuComposant, memeValeurDAxe, tokensDuComposantParEtapes, type AxeDuComposant, type TokenDuComposant } from './nommage.js';
import type { ReleveDeComposant, VariantLu, WrapperLu } from './releve.js';

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
    if (segment && !(variant.valeurs[propriete.nom] && memeValeurDAxe(axe, segment, variant.valeurs[propriete.nom]))) return false;
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

/** Au-delà de ce produit de valeurs, le plugin ne cherche plus les variants absents (Q-F5-7). */
const BORNE_DE_LA_MATRICE = 4096;
/** Sous la borne, les premiers constats de variant absent ; le reste se compte dans une ligne « Et N autres » (Q-F5-7). */
const PLAFOND_DE_CONSTATS_DE_LA_MATRICE = 200;

const SEPARATEUR_DE_VALEURS = '';

interface MatriceDesVariants {
  readonly noms: string[];
  /** Les valeurs distinctes de chaque axe, dans l'ordre déclaré : une valeur répétée ne fait qu'une combinaison (N-38). */
  readonly valeurs: string[][];
  /** Le produit des valeurs distinctes. */
  readonly total: number;
}

function* matriceDeclaree(axes: ReleveDeComposant['proprietes']): Generator<void, MatriceDesVariants> {
  const noms: string[] = [];
  const valeurs: string[][] = [];
  let total = 1;
  for (const axe of axes) {
    yield;
    if (axe.type !== 'VARIANT' || !axe.valeurs?.length) continue;
    const distinctes = new Set<string>();
    const liste: string[] = [];
    for (const valeur of axe.valeurs) {
      yield;
      if (distinctes.has(valeur)) continue;
      distinctes.add(valeur);
      liste.push(valeur);
    }
    noms.push(axe.nom);
    valeurs.push(liste);
    total *= liste.length;
  }
  return { noms, valeurs, total };
}

/** Les combinaisons de la matrice, la dernière propriété variant le plus vite, chacune écrite pour chaque nom d'axe. */
function* combinaisons(matrice: MatriceDesVariants): Generator<void, Record<string, string>[]> {
  let resultat: Record<string, string>[] = [{}];
  for (const [rang, nom] of matrice.noms.entries()) {
    yield;
    const suivantes: Record<string, string>[] = [];
    for (const combinaison of resultat) {
      for (const valeur of matrice.valeurs[rang]) {
        yield;
        const suivante: Record<string, string> = {};
        for (const autre of Object.keys(combinaison)) {
          yield;
          Object.defineProperty(suivante, autre, { value: combinaison[autre], enumerable: true, writable: true, configurable: true });
        }
        Object.defineProperty(suivante, nom, { value: valeur, enumerable: true, writable: true, configurable: true });
        suivantes.push(suivante);
      }
    }
    resultat = suivantes;
  }
  return resultat;
}

/** La clé d'un jeu de valeurs sur les axes de la matrice ; `undefined` quand le variant n'écrit pas toutes les valeurs. */
function cleDeValeurs(noms: readonly string[], valeurs: Readonly<Record<string, string | undefined>>): string | undefined {
  const parties: string[] = [];
  for (const nom of noms) {
    const valeur = valeurs[nom];
    if (valeur === undefined) return undefined;
    parties.push(valeur);
  }
  return parties.join(SEPARATEUR_DE_VALEURS);
}

/**
 * Les natures de token qu'une liaison illisible peut lier : sa variable ne s'est pas lue, donc tout token de la nature du champ peut être
 * celui qu'elle lie (E-33). Un champ de typographie se lie à `typography`, jamais à un token du composant : il ne protège aucun token.
 */
function* naturesDesLiaisonsIllisibles(releve: ReleveDeComposant): Generator<void, { couleur: boolean; autre: boolean }> {
  const natures = { couleur: false, autre: false };
  const noter = (liaison: { illisible?: true; champ: string }): void => {
    if (!liaison.illisible) return;
    const nature = natureDuChamp(liaison.champ, '');
    if (nature === 'couleur') natures.couleur = true;
    else if (nature === 'dimension') natures.autre = true;
  };
  for (const variant of releve.variants) {
    yield;
    for (const layer of variant.layers) {
      yield;
      for (const liaison of layer.liaisons) {
        yield;
        noter(liaison);
      }
      for (const plage of layer.texte?.plages ?? []) {
        yield;
        for (const liaison of plage.liaisons) {
          yield;
          noter(liaison);
        }
      }
    }
  }
  for (const wrapper of releve.wrappers ?? []) {
    yield;
    for (const variant of wrapper.variants) {
      yield;
      for (const liaison of variant.liaisons) {
        yield;
        noter(liaison);
      }
    }
  }
  return natures;
}

function* nomsDesLayers(releve: ReleveDeComposant): Generator<void, Set<string>> {
  const noms = new Set<string>();
  for (const variant of releve.variants) {
    yield;
    for (const layer of variant.layers) {
      yield;
      noms.add(formeReconnue(layer.nom));
    }
  }
  return noms;
}

/** Vrai pour un token de couleur dont aucun segment n'est une palette et dont un segment d'élément ne désigne aucun layer du composant. */
function estUnePaletteHorsRegistre(token: TokenDuComposant, nomsDeLayers: ReadonlySet<string>): boolean {
  if (!nomsDeLayers.size || token.lecture.some((segment) => segment.role === 'palette')) return false;
  if (!token.lecture.some((segment) => segment.role === 'famille' && segment.terme === 'color')) return false;
  return token.lecture.some((segment) => segment.role === 'element' && !nomsDeLayers.has(formeReconnue(segment.segment)));
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

  const declaree = yield* matriceDeclaree(releve.proprietes);
  if (declaree.total > BORNE_DE_LA_MATRICE) {
    constats.push(constatDuComposant('C31', 'variants', 'info', 'au-dela-de-la-borne', {
      genre: 'au-dela-de-la-borne', variants: releve.variants.length, combinaisons: declaree.total,
    }));
  } else if (declaree.noms.length) {
    // Un jeu de clés suffit : chaque combinaison se cherche une fois, sans parcourir les variants (N-41).
    const presentes = new Set<string>();
    for (const variant of releve.variants) {
      yield;
      const cle = cleDeValeurs(declaree.noms, variant.valeurs);
      if (cle !== undefined) presentes.add(cle);
    }
    const matrice = yield* combinaisons(declaree);
    let absentes = 0;
    for (const combinaison of matrice) {
      yield;
      if (presentes.has(cleDeValeurs(declaree.noms, combinaison)!)) continue;
      absentes += 1;
      if (absentes > PLAFOND_DE_CONSTATS_DE_LA_MATRICE) continue;
      const coordonnees: string[] = [];
      for (const nom of declaree.noms) {
        yield;
        coordonnees.push(`${nom}=${combinaison[nom]}`);
      }
      constats.push(constatDuComposant('C31', 'variants', 'verifier', coordonnees.join(','), combinaison));
    }
    if (absentes > PLAFOND_DE_CONSTATS_DE_LA_MATRICE) {
      constats.push(constatDuComposant('C31', 'variants', 'info', 'et-autres', { genre: 'et-autres', autres: absentes - PLAFOND_DE_CONSTATS_DE_LA_MATRICE }));
    }
  }

  if (collection?.etat !== 'lue') return constats;
  const liees = new Set<string>();
  for (const variant of releve.variants) {
    yield;
    for (const layer of variant.layers) {
      yield;
      for (const liaison of layer.liaisons) {
        yield;
        // Une liaison illisible n'a pas de clé : elle ne lie aucun token connu (E-33).
        if (!liaison.illisible) liees.add(liaison.variable.cle);
      }
    }
  }
  const illisibles = yield* naturesDesLiaisonsIllisibles(releve);
  let nomsDeLayers: Set<string> | undefined;
  const portes = yield* axesDesWrappers(releve, axes);
  const liaisonsDuWrapper = new Map<WrapperLu, Set<string>>();
  for (const token of tokens) {
    yield;
    // Un nom que la grammaire ne lit pas ne se compare à aucun variant : le designer le renomme ou ignore le constat (Q-F5-8).
    if (!token.lecture.length) {
      constats.push(constatDuComposant('C32', 'tokens', 'verifier', token.variable.cle, { token: token.variable.nom, motif: 'nom-illisible' }));
      continue;
    }
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
          if (!valeur || !memeValeurDAxe(segment.role as AxeDuComposant, token.segments[rang], valeur)) continue;
          porte = true;
          break;
        }
      }
      if (!porte) sansVariant = true;
    }
    // Un élément écrit dans une couleur désigne un layer du composant (corrections.ts) : le segment qui n'en désigne aucun, à la place d'une palette, nomme une palette hors registre (N-40).
    if (!sansVariant && axes.palette) {
      if (!nomsDeLayers) nomsDeLayers = yield* nomsDesLayers(releve);
      if (estUnePaletteHorsRegistre(token, nomsDeLayers)) sansVariant = true;
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
    // Une liaison illisible de sa nature peut être celle qui lie le token : il n'est pas accusé d'être inutilisé (E-33).
    if (!sansVariant && liee) continue;
    if (!sansVariant && (illisibles.couleur || illisibles.autre) && (token.variable.type === 'COLOR' ? illisibles.couleur : illisibles.autre)) continue;
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

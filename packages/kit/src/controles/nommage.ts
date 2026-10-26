/** Comparaison des axes du composant avec les noms de ses variables de référence. */
import { reconnaitreLeChemin, type SegmentReconnu } from '../referentiel/grammaire.js';
import { formeReconnue, termeReconnu } from '../referentiel/reconnaissance.js';
import { FAMILLES_PRIMITIVES, REGISTRE_PALETTES_COMPOSANT } from '../referentiel/architecture.js';
import { REGISTRE_ETATS, REGISTRE_TAILLES, STATE_AXIS_NAMES } from '../referentiel/vocabulaire.js';
import { collectionParCle, type CatalogueDeReference, type VariableDuCatalogue } from './catalogue.js';
import type { Constat } from './constat.js';
import type { ReleveDeComposant } from './releve.js';

export type AxeDuComposant = 'palette' | 'style' | 'taille' | 'etat';
export type ProprieteDAxe = ReleveDeComposant['proprietes'][number];
export interface TokenDuComposant {
  variable: VariableDuCatalogue;
  segments: string[];
  lecture: readonly SegmentReconnu[];
}

export function axeDePropriete(nom: string): AxeDuComposant | undefined {
  const forme = formeReconnue(nom);
  if (STATE_AXIS_NAMES.some((nomDAxe) => forme === formeReconnue(nomDAxe))) return 'etat';
  if (['size', 'sizes', 'taille'].includes(forme)) return 'taille';
  if (['palette', 'severity', 'intent'].includes(forme)) return 'palette';
  if (['style', 'variant', 'appearance'].includes(forme)) return 'style';
  return undefined;
}

type AxesDuReleve = Partial<Record<AxeDuComposant, ProprieteDAxe>>;

/**
 * Les deux mémoires ci-dessous partagent un résultat entre les contrôles, les corrections et la propagation d'une même
 * analyse. Leur clé est un tableau du relevé ou du catalogue, qu'une analyse ne modifie pas : un relevé copié par
 * `{ ...releve }` garde le même tableau `proprietes` et retrouve donc l'entrée. Un tableau remplacé ou dont la longueur
 * change écarte l'entrée. Les résultats rendus sont gelés, parce que tous les lecteurs les partagent.
 */
const axesMemorises = new WeakMap<ReleveDeComposant['proprietes'], { longueur: number; axes: AxesDuReleve }>();

export function axesDuReleve(releve: ReleveDeComposant): AxesDuReleve {
  return epuiser(axesDuReleveParEtapes(releve));
}

/** Rend l'entrée mémorisée s'il en existe une ; sinon cède entre les propriétés et ne range le résultat qu'une fois le calcul fini. */
export function* axesDuReleveParEtapes(releve: ReleveDeComposant): Generator<void, AxesDuReleve> {
  const connus = axesMemorises.get(releve.proprietes);
  if (connus && connus.longueur === releve.proprietes.length) return connus.axes;
  const axes: AxesDuReleve = {};
  for (const propriete of releve.proprietes) {
    yield;
    if (propriete.type !== 'VARIANT') continue;
    const axe = axeDePropriete(propriete.nom);
    if (axe && !axes[axe]) axes[axe] = propriete;
  }
  Object.freeze(axes);
  axesMemorises.set(releve.proprietes, { longueur: releve.proprietes.length, axes });
  return axes;
}

function epuiser<T>(calcul: Generator<void, T>): T {
  let etape = calcul.next();
  while (!etape.done) etape = calcul.next();
  return etape.value;
}

interface TokensMemorises {
  readonly variables: CatalogueDeReference['variables'];
  readonly nombreDeVariables: number;
  readonly collections: CatalogueDeReference['collections'];
  readonly nombreDeCollections: number;
  /** Par tableau `proprietes`, puis par nom du jeu. */
  readonly parProprietes: WeakMap<ReleveDeComposant['proprietes'], { longueur: number; parNom: Map<string, TokenDuComposant[]> }>;
}

const tokensMemorises = new WeakMap<CatalogueDeReference, TokensMemorises>();

/** Les résultats complets du couple relevé et catalogue ; une entrée périmée est remplacée. */
function resultatsMemorises(releve: ReleveDeComposant, catalogue: CatalogueDeReference): Map<string, TokenDuComposant[]> {
  const { variables, collections } = catalogue;
  let memoire = tokensMemorises.get(catalogue);
  if (!memoire || memoire.variables !== variables || memoire.nombreDeVariables !== variables.length
    || memoire.collections !== collections || memoire.nombreDeCollections !== collections.length) {
    memoire = { variables, nombreDeVariables: variables.length, collections, nombreDeCollections: collections.length, parProprietes: new WeakMap() };
    tokensMemorises.set(catalogue, memoire);
  }
  let parJeu = memoire.parProprietes.get(releve.proprietes);
  if (!parJeu || parJeu.longueur !== releve.proprietes.length) {
    parJeu = { longueur: releve.proprietes.length, parNom: new Map() };
    memoire.parProprietes.set(releve.proprietes, parJeu);
  }
  return parJeu.parNom;
}

/**
 * `types` écarte une variable dont le type n'est pas listé avant tout calcul sur son nom. Le résultat est alors un sous-ensemble de
 * l'appel sans filtre, dans le même ordre ; il n'entre pas dans la mémoire, qui ne garde que des résultats complets.
 */
export function tokensDuComposant(releve: ReleveDeComposant, catalogue: CatalogueDeReference, options: { readonly types?: readonly VariableDuCatalogue['type'][] } = {}): TokenDuComposant[] {
  if (options.types) return figer(epuiser(calculerLesTokensParEtapes(releve, catalogue, releve.jeu.nom, options.types)));
  return epuiser(tokensDuComposantParEtapes(releve, catalogue));
}

/**
 * Rend le résultat mémorisé s'il existe. Sinon le calcul cède par variable retenue et toutes les 256 variables parcourues ;
 * le résultat n'entre dans la mémoire qu'à la fin, donc une annulation n'y laisse aucune entrée.
 */
export function* tokensDuComposantParEtapes(releve: ReleveDeComposant, catalogue: CatalogueDeReference): Generator<void, TokenDuComposant[]> {
  const nomDuJeu = releve.jeu.nom;
  const connus = resultatsMemorises(releve, catalogue).get(nomDuJeu);
  if (connus) return connus;
  const tokens = figer(yield* calculerLesTokensParEtapes(releve, catalogue, nomDuJeu));
  resultatsMemorises(releve, catalogue).set(nomDuJeu, tokens);
  return tokens;
}

function figer(tokens: TokenDuComposant[]): TokenDuComposant[] {
  for (const token of tokens) Object.freeze(token.segments);
  return Object.freeze(tokens) as TokenDuComposant[];
}

/**
 * Un passage sur les variables du catalogue : ce qui ne dépend pas d'une variable se calcule avant la boucle, et le
 * découpage du nom, la copie pour la grammaire et la lecture ne concernent que les variables retenues.
 */
function* calculerLesTokensParEtapes(releve: ReleveDeComposant, catalogue: CatalogueDeReference, nomDuJeu: string, types?: readonly VariableDuCatalogue['type'][]): Generator<void, TokenDuComposant[]> {
  const axes = yield* axesDuReleveParEtapes(releve);
  const formeDuJeu = formeReconnue(nomDuJeu);
  const formesDesPremiersSegments = new Map<string, string>();
  const valeursDAxes = Object.fromEntries(Object.entries(axes).map(([axe, propriete]) => [axe, propriete.valeurs ?? []]));
  const tokens: TokenDuComposant[] = [];
  let parcourues = 0;
  for (const variable of catalogue.variables) {
    parcourues += 1;
    if (parcourues % 256 === 0) yield;
    if (types && !types.includes(variable.type)) continue;
    if (collectionParCle(catalogue, variable.collection)?.role !== 'components') continue;
    const nom = variable.nom;
    const finDuPremier = nom.indexOf('/');
    const premier = finDuPremier < 0 ? nom : nom.slice(0, finDuPremier);
    let forme = formesDesPremiersSegments.get(premier);
    if (forme === undefined) {
      forme = formeReconnue(premier);
      formesDesPremiersSegments.set(premier, forme);
    }
    if (forme !== formeDuJeu) continue;
    yield;
    const segments = nom.split('/');
    const pourLaGrammaire = [...segments];
    if (segments.length > 1 && termeReconnu(FAMILLES_PRIMITIVES, segments[1])?.id === 'color') pourLaGrammaire[1] = 'color';
    const lire = (axesSupplementaires: Record<string, readonly string[]> = {}) => reconnaitreLeChemin('components', pourLaGrammaire, {
      themes: 'chemin',
      axes: { ...valeursDAxes, ...axesSupplementaires },
    });
    let reconnu = lire();
    if (!reconnu.conforme && axes.style) {
      for (const segment of segments.slice(2)) {
        reconnu = lire({ style: [...(axes.style.valeurs ?? []), segment] });
        if (reconnu.conforme) break;
      }
    }
    tokens.push({ variable, segments, lecture: reconnu.conforme ? reconnu.segments : [] });
  }
  return tokens;
}

export function segmentDAxe(token: TokenDuComposant, axe: AxeDuComposant): string | undefined {
  const rang = token.lecture.findIndex((segment) => segment.role === axe);
  return rang < 0 ? undefined : token.segments[rang];
}

export function constatDuComposant(
  code: `C${number}`, famille: Constat['famille'], type: Constat['type'],
  identifiant: string, faits: Constat['faits'], variants: string[] = [], layers: string[] = [],
): Constat {
  return { id: `${code}:${identifiant}`, code, type, famille, variants, layers, faits };
}

export function controlerNommage(releve: ReleveDeComposant, catalogue: CatalogueDeReference): Constat[] {
  const calcul = controlerNommageParEtapes(releve, catalogue);
  let etape = calcul.next();
  while (!etape.done) etape = calcul.next();
  return etape.value;
}

/** Cède dans les tokens, les variants et les recherches de noms ; les groupes gardent leur ordre. */
export function* controlerNommageParEtapes(releve: ReleveDeComposant, catalogue: CatalogueDeReference): Generator<void, Constat[]> {
  const tokens = yield* tokensDuComposantParEtapes(releve, catalogue);
  const axes = yield* axesDuReleveParEtapes(releve);
  const constats: Constat[] = [];

  for (const [axe, propriete] of Object.entries(axes) as [AxeDuComposant, ProprieteDAxe][]) {
    yield;
    const segments: string[] = [];
    for (const token of tokens) {
      yield;
      const segment = segmentDAxe(token, axe);
      if (segment) segments.push(segment);
    }
    if (!segments.length) continue;
    for (const valeur of propriete.valeurs ?? []) {
      yield;
      if (yield* contientUnSegment(segments, (segment) => formeReconnue(segment) === formeReconnue(valeur))) continue;
      const registre = axe === 'etat' ? REGISTRE_ETATS : axe === 'taille' ? REGISTRE_TAILLES : null;
      if (registre && (yield* contientUnSegment(segments, (segment) => termeReconnu(registre, segment)?.id === termeReconnu(registre, valeur)?.id))) continue;
      constats.push(constatDuComposant('C7', 'variants', 'verifier', `${axe}:${valeur}`, { axe: propriete.nom, valeur }));
    }
  }

  // C8, C9 et C10 : un constat par segment à renommer, qui compte ses tokens ; `token` en nomme le premier.
  const formes = new Map<string, Constat>();
  const grouper = (code: 'C8' | 'C9' | 'C10', segment: string, faits: Record<string, string>, nom: string): void => {
    const identifiant = `${segment}:${Object.values(faits).join(':')}`;
    const connu = formes.get(`${code}:${identifiant}`);
    if (connu) {
      connu.faits.tokens = Number(connu.faits.tokens) + 1;
      return;
    }
    const famille = code === 'C10' ? 'tailles' : 'tokens';
    formes.set(`${code}:${identifiant}`, constatDuComposant(code, famille, code === 'C9' ? 'verifier' : 'corriger', identifiant, { token: nom, segment, ...faits, tokens: 1 }));
  };
  const formeToleree = (code: 'C8' | 'C10', segment: string, attendu: string, nom: string): void => grouper(code, segment, { attendu }, nom);
  for (const token of tokens) {
    yield;
    const { segments, lecture, variable } = token;
    if (segments.length > 1 && termeReconnu(FAMILLES_PRIMITIVES, segments[1])?.id === 'color' && formeReconnue(segments[1]) !== 'color') {
      formeToleree('C8', segments[1], 'color', variable.nom);
    }
    for (const [rang, reconnu] of lecture.entries()) {
      yield;
      const axe = reconnu.role;
      if (axe !== 'etat' && axe !== 'taille' && axe !== 'palette' && axe !== 'style') continue;
      const segment = segments[rang];
      const registre = axe === 'etat' ? REGISTRE_ETATS : axe === 'taille' ? REGISTRE_TAILLES : null;
      const terme = registre ? termeReconnu(registre, segment) : undefined;
      if (terme && formeReconnue(segment) !== formeReconnue(terme.id)) {
        formeToleree(axe === 'taille' ? 'C10' : 'C8', segment, terme.id, variable.nom);
        continue;
      }
      let valeur: string | undefined;
      for (const candidate of axes[axe]?.valeurs ?? []) {
        yield;
        if (formeReconnue(candidate) === formeReconnue(segment)) { valeur = candidate; break; }
      }
      if (valeur && valeur !== segment && !terme) grouper('C9', segment, { valeur }, variable.nom);
    }
  }
  constats.push(...formes.values());
  for (const [axe, propriete] of Object.entries(axes) as [AxeDuComposant, ProprieteDAxe][]) {
    yield;
    const anciennes = new Set<string>();
    for (const variant of releve.variants) {
      yield;
      const valeur = variant.valeurs[propriete.nom];
      if (valeur && (yield* contientUnSegment(propriete.valeurs ?? [], (candidate) => candidate === valeur))) anciennes.add(valeur);
    }
    for (const ancienne of anciennes) {
      yield;
      const variants: ReleveDeComposant['variants'] = [];
      for (const variant of releve.variants) {
        yield;
        if (variant.valeurs[propriete.nom] === ancienne) variants.push(variant);
      }
      const candidatsParFamille = new Map<string, Set<string>>();
      let dejaCouverte = false;
      for (const variant of variants) {
        yield;
        const tokensCorrespondants = new Map<string, TokenDuComposant[]>();
        for (const token of tokens) {
          yield;
          if (!segmentDAxe(token, axe) || !correspondAuxAutresAxes(token, variant, axes, axe)) continue;
          const famille = token.lecture.find((segment) => segment.role === 'famille')?.terme;
          if (!famille) continue;
          const groupe = tokensCorrespondants.get(famille) ?? [];
          groupe.push(token);
          tokensCorrespondants.set(famille, groupe);
        }
        for (const [famille, groupe] of tokensCorrespondants) {
          yield;
          let couverte = false;
          for (const token of groupe) {
            yield;
            const segment = segmentDAxe(token, axe)!;
            const termeActuel = termeCanoniqueDeLAxe(axe, ancienne);
            const termeDuToken = termeCanoniqueDeLAxe(axe, segment);
            if (formeReconnue(segment) === formeReconnue(ancienne) || (!!termeActuel && termeActuel.id === termeDuToken?.id)) {
              couverte = true;
              break;
            }
          }
          if (couverte) {
            dejaCouverte = true;
            continue;
          }
          const noms = candidatsParFamille.get(famille) ?? new Set<string>();
          for (const token of groupe) {
            yield;
            noms.add(segmentDAxe(token, axe)!);
          }
          candidatsParFamille.set(famille, noms);
        }
      }
      if (dejaCouverte) continue;
      if (!candidatsParFamille.size) continue;
      const nomsUniques = new Set<string>();
      for (const noms of candidatsParFamille.values()) {
        yield;
        for (const nom of noms) {
          yield;
          nomsUniques.add(nom);
        }
      }
      const uniques = [...nomsUniques];
      const candidatUnique = candidatsParFamille.size === 1 && uniques.length === 1;
      const code = candidatUnique ? 'C12' : 'C13';
      const identifiant = `${releve.jeu.cle}:${propriete.nom}:${ancienne}`;
      const id = `${code}:${identifiant}`;
      const identifiants: string[] = [];
      for (const variant of variants) {
        yield;
        identifiants.push(variant.id);
      }
      const candidats: { nom: string }[] = [];
      for (const nom of uniques) {
        yield;
        candidats.push({ nom });
      }
      const constat = constatDuComposant(code, 'variants', 'verifier', identifiant,
        { jeu: releve.jeu.nom, propriete: propriete.nom, avant: ancienne }, identifiants);
      constat.question = { id, candidats };
      constats.push(constat);
    }
  }
  return constats;
}

function* contientUnSegment(segments: readonly string[], predicat: (segment: string) => boolean): Generator<void, boolean> {
  for (const segment of segments) {
    yield;
    if (predicat(segment)) return true;
  }
  return false;
}

function termeCanoniqueDeLAxe(axe: AxeDuComposant, valeur: string) {
  const registre = axe === 'etat' ? REGISTRE_ETATS
    : axe === 'taille' ? REGISTRE_TAILLES
      : axe === 'palette' ? REGISTRE_PALETTES_COMPOSANT
        : undefined;
  return registre ? termeReconnu(registre, valeur) : undefined;
}

function correspondAuxAutresAxes(
  token: TokenDuComposant, variant: ReleveDeComposant['variants'][number],
  axes: Partial<Record<AxeDuComposant, ProprieteDAxe>>, axeCible: AxeDuComposant,
): boolean {
  return (Object.entries(axes) as [AxeDuComposant, ProprieteDAxe][]).every(([axe, propriete]) => {
    if (axe === axeCible) return true;
    const valeur = variant.valeurs[propriete.nom];
    if (!valeur) return false;
    const segment = segmentDAxe(token, axe);
    return !!segment && formeReconnue(segment) === formeReconnue(valeur);
  });
}

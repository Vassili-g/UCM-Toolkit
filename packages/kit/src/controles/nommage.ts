/** Comparaison des axes du composant avec les noms de ses variables de référence. */
import { reconnaitreLeChemin, type SegmentReconnu } from '../referentiel/grammaire.js';
import { formeReconnue, termeReconnu } from '../referentiel/reconnaissance.js';
import { FAMILLES_PRIMITIVES, REGISTRE_PALETTES_COMPOSANT } from '../referentiel/architecture.js';
import { REGISTRE_ETATS, REGISTRE_TAILLES, STATE_AXIS_NAMES } from '../referentiel/vocabulaire.js';
import type { CatalogueDeReference, VariableDuCatalogue } from './catalogue.js';
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
  const connus = axesMemorises.get(releve.proprietes);
  if (connus && connus.longueur === releve.proprietes.length) return connus.axes;
  const axes: AxesDuReleve = {};
  for (const propriete of releve.proprietes) {
    if (propriete.type !== 'VARIANT') continue;
    const axe = axeDePropriete(propriete.nom);
    if (axe && !axes[axe]) axes[axe] = propriete;
  }
  Object.freeze(axes);
  axesMemorises.set(releve.proprietes, { longueur: releve.proprietes.length, axes });
  return axes;
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

export function tokensDuComposant(releve: ReleveDeComposant, catalogue: CatalogueDeReference): TokenDuComposant[] {
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
  const connus = parJeu.parNom.get(releve.jeu.nom);
  if (connus) return connus;
  const tokens = calculerLesTokens(releve, catalogue);
  for (const token of tokens) Object.freeze(token.segments);
  Object.freeze(tokens);
  parJeu.parNom.set(releve.jeu.nom, tokens);
  return tokens;
}

function calculerLesTokens(releve: ReleveDeComposant, catalogue: CatalogueDeReference): TokenDuComposant[] {
  const axes = axesDuReleve(releve);
  return catalogue.variables.flatMap((variable) => {
    const collection = catalogue.collections.find((entree) => entree.cle === variable.collection);
    if (collection?.role !== 'components') return [];
    const segments = variable.nom.split('/');
    if (formeReconnue(segments[0]) !== formeReconnue(releve.jeu.nom)) return [];
    const pourLaGrammaire = [...segments];
    if (segments.length > 1 && termeReconnu(FAMILLES_PRIMITIVES, segments[1])?.id === 'color') pourLaGrammaire[1] = 'color';
    const lire = (axesSupplementaires: Record<string, readonly string[]> = {}) => reconnaitreLeChemin('components', pourLaGrammaire, {
      themes: 'chemin',
      axes: { ...Object.fromEntries(Object.entries(axes).map(([axe, propriete]) => [axe, propriete.valeurs ?? []])), ...axesSupplementaires },
    });
    let reconnu = lire();
    if (!reconnu.conforme && axes.style) {
      for (const segment of segments.slice(2)) {
        reconnu = lire({ style: [...(axes.style.valeurs ?? []), segment] });
        if (reconnu.conforme) break;
      }
    }
    return [{ variable, segments, lecture: reconnu.conforme ? reconnu.segments : [] }];
  });
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
  const tokens = tokensDuComposant(releve, catalogue);
  const axes = axesDuReleve(releve);
  const constats: Constat[] = [];

  for (const [axe, propriete] of Object.entries(axes) as [AxeDuComposant, ProprieteDAxe][]) {
    const segments = tokens.map((token) => segmentDAxe(token, axe)).filter((segment): segment is string => !!segment);
    if (!segments.length) continue;
    for (const valeur of propriete.valeurs ?? []) {
      if (segments.some((segment) => formeReconnue(segment) === formeReconnue(valeur))) continue;
      const registre = axe === 'etat' ? REGISTRE_ETATS : axe === 'taille' ? REGISTRE_TAILLES : null;
      if (registre && segments.some((segment) => termeReconnu(registre, segment)?.id === termeReconnu(registre, valeur)?.id)) continue;
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
    const { segments, lecture, variable } = token;
    if (segments.length > 1 && termeReconnu(FAMILLES_PRIMITIVES, segments[1])?.id === 'color' && formeReconnue(segments[1]) !== 'color') {
      formeToleree('C8', segments[1], 'color', variable.nom);
    }
    for (const [rang, reconnu] of lecture.entries()) {
      const axe = reconnu.role;
      if (axe !== 'etat' && axe !== 'taille' && axe !== 'palette' && axe !== 'style') continue;
      const segment = segments[rang];
      const registre = axe === 'etat' ? REGISTRE_ETATS : axe === 'taille' ? REGISTRE_TAILLES : null;
      const terme = registre ? termeReconnu(registre, segment) : undefined;
      if (terme && formeReconnue(segment) !== formeReconnue(terme.id)) {
        formeToleree(axe === 'taille' ? 'C10' : 'C8', segment, terme.id, variable.nom);
        continue;
      }
      const valeur = axes[axe]?.valeurs?.find((candidate) => formeReconnue(candidate) === formeReconnue(segment));
      if (valeur && valeur !== segment && !terme) grouper('C9', segment, { valeur }, variable.nom);
    }
  }
  constats.push(...formes.values());
  for (const [axe, propriete] of Object.entries(axes) as [AxeDuComposant, ProprieteDAxe][]) {
    const anciennes = new Set(releve.variants.map((variant) => variant.valeurs[propriete.nom])
      .filter((valeur): valeur is string => !!valeur && !!propriete.valeurs?.includes(valeur)));
    for (const ancienne of anciennes) {
      const variants = releve.variants.filter((variant) => variant.valeurs[propriete.nom] === ancienne);
      const candidatsParFamille = new Map<string, Set<string>>();
      let dejaCouverte = false;
      for (const variant of variants) {
        const tokensCorrespondants = new Map<string, TokenDuComposant[]>();
        for (const token of tokens) {
          if (!segmentDAxe(token, axe) || !correspondAuxAutresAxes(token, variant, axes, axe)) continue;
          const famille = token.lecture.find((segment) => segment.role === 'famille')?.terme;
          if (!famille) continue;
          const groupe = tokensCorrespondants.get(famille) ?? [];
          groupe.push(token);
          tokensCorrespondants.set(famille, groupe);
        }
        for (const [famille, groupe] of tokensCorrespondants) {
          if (groupe.some((token) => {
            const segment = segmentDAxe(token, axe)!;
            const termeActuel = termeCanoniqueDeLAxe(axe, ancienne);
            const termeDuToken = termeCanoniqueDeLAxe(axe, segment);
            return formeReconnue(segment) === formeReconnue(ancienne)
              || (!!termeActuel && termeActuel.id === termeDuToken?.id);
          })) {
            dejaCouverte = true;
            continue;
          }
          const noms = candidatsParFamille.get(famille) ?? new Set<string>();
          for (const token of groupe) noms.add(segmentDAxe(token, axe)!);
          candidatsParFamille.set(famille, noms);
        }
      }
      if (dejaCouverte) continue;
      if (!candidatsParFamille.size) continue;
      const uniques = [...new Set([...candidatsParFamille.values()].flatMap((noms) => [...noms]))];
      const candidatUnique = candidatsParFamille.size === 1 && uniques.length === 1;
      const code = candidatUnique ? 'C12' : 'C13';
      const identifiant = `${releve.jeu.cle}:${propriete.nom}:${ancienne}`;
      const id = `${code}:${identifiant}`;
      const constat = constatDuComposant(code, 'variants', 'verifier', identifiant,
        { jeu: releve.jeu.nom, propriete: propriete.nom, avant: ancienne }, variants.map(({ id: variantId }) => variantId));
      constat.question = { id, candidats: uniques.map((nom) => ({ nom })) };
      constats.push(constat);
    }
  }
  return constats;
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

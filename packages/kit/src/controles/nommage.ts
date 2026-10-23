/** Comparaison des axes du composant avec les noms de ses variables de référence. */
import { reconnaitreLeChemin, type SegmentReconnu } from '../referentiel/grammaire.js';
import { formeReconnue, termeReconnu } from '../referentiel/reconnaissance.js';
import { FAMILLES_PRIMITIVES } from '../referentiel/architecture.js';
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

export function axesDuReleve(releve: ReleveDeComposant): Partial<Record<AxeDuComposant, ProprieteDAxe>> {
  const axes: Partial<Record<AxeDuComposant, ProprieteDAxe>> = {};
  for (const propriete of releve.proprietes) {
    if (propriete.type !== 'VARIANT') continue;
    const axe = axeDePropriete(propriete.nom);
    if (axe && !axes[axe]) axes[axe] = propriete;
  }
  return axes;
}

export function tokensDuComposant(releve: ReleveDeComposant, catalogue: CatalogueDeReference): TokenDuComposant[] {
  const axes = axesDuReleve(releve);
  return catalogue.variables.flatMap((variable) => {
    const collection = catalogue.collections.find((entree) => entree.cle === variable.collection);
    if (collection?.role !== 'components') return [];
    const segments = variable.nom.split('/');
    if (formeReconnue(segments[0]) !== formeReconnue(releve.jeu.nom)) return [];
    const pourLaGrammaire = [...segments];
    if (termeReconnu(FAMILLES_PRIMITIVES, segments[1])?.id === 'color') pourLaGrammaire[1] = 'color';
    const reconnu = reconnaitreLeChemin('components', pourLaGrammaire, {
      themes: 'chemin',
      axes: Object.fromEntries(Object.entries(axes).map(([axe, propriete]) => [axe, propriete.valeurs ?? []])),
    });
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

  for (const token of tokens) {
    const { segments, lecture, variable } = token;
    if (termeReconnu(FAMILLES_PRIMITIVES, segments[1])?.id === 'color' && formeReconnue(segments[1]) !== 'color') {
      constats.push(constatDuComposant('C8', 'tokens', 'corriger', variable.cle, { token: variable.nom, segment: segments[1], attendu: 'color' }));
    }
    for (const [rang, reconnu] of lecture.entries()) {
      const axe = reconnu.role;
      if (axe !== 'etat' && axe !== 'taille' && axe !== 'palette' && axe !== 'style') continue;
      const segment = segments[rang];
      const registre = axe === 'etat' ? REGISTRE_ETATS : axe === 'taille' ? REGISTRE_TAILLES : null;
      const terme = registre ? termeReconnu(registre, segment) : undefined;
      if (terme && formeReconnue(segment) !== formeReconnue(terme.id)) {
        const code = axe === 'taille' ? 'C10' : 'C8';
        constats.push(constatDuComposant(code, axe === 'taille' ? 'tailles' : 'tokens', 'corriger', `${variable.cle}:${rang}`, {
          token: variable.nom, segment, attendu: terme.id,
        }));
        continue;
      }
      const valeur = axes[axe]?.valeurs?.find((candidate) => formeReconnue(candidate) === formeReconnue(segment));
      if (valeur && valeur !== segment && !terme) {
        constats.push(constatDuComposant('C9', 'tokens', 'verifier', `${variable.cle}:${rang}`, {
          token: variable.nom, segment, valeur,
        }));
      }
    }
  }
  return constats;
}

/**
 * Le bilan de chaque palette de la recette, pour l'onglet Vérification sans
 * palette ouverte. Pur : ni DOM, ni texte. Il lit ce que la vérification d'une
 * palette lit déjà, sans autre calcul : les promesses du moteur et leurs
 * groupes manqués (`presentation.ts`), les alertes de la recette
 * (`alertesDeRecette`), qui portent aussi les paires trop proches.
 *
 * Trois états :
 * - à corriger (rouge) : au moins une garantie manquée ;
 * - à vérifier (ambre) : au moins une alerte, ou membre d'une paire trop
 *   proche ;
 * - conforme : le reste.
 *
 * Les deux palettes d'une paire trop proche sont à vérifier, comme dans leur
 * vérification ; chacune nomme l'autre dans son détail. Une palette déjà à
 * corriger reste à corriger. Une notice ne change pas l'état d'une palette, comme elle ne
 * change pas son verdict ([VER-19]).
 */
import {
  alertesDeRecette,
  severiteDeLAlerte,
  verifierPromesses,
  type Alerte,
  type Mode,
  type Palette,
  type Recette,
  type VariableDePalette,
} from 'ucm-couleur';

import { groupesManques } from '../presentation';

/** L'état d'une palette, et le nom de l'onglet du bilan qui la range. */
export type EtatDuBilan = 'rouge' | 'ambre' | 'conforme';

/** Les onglets du bilan, dans l'ordre où ils s'affichent. */
export const ETATS_DU_BILAN: readonly EtatDuBilan[] = ['rouge', 'ambre', 'conforme'];

/** Le premier constat d'une palette qui n'est pas conforme, tel que la vérification de la palette le dit en premier. */
export type PremierConstat =
  | { readonly nature: 'garantie'; readonly mode: Mode; readonly variable: VariableDePalette; readonly contraste: number }
  | { readonly nature: 'proche'; readonly avec: Palette; readonly distance: number }
  | { readonly nature: 'alerte'; readonly alerte: Alerte };

export interface LigneDuBilan {
  readonly palette: Palette;
  readonly etat: EtatDuBilan;
  /** `null` pour une palette conforme. */
  readonly constat: PremierConstat | null;
}

export interface BilanDesPalettes {
  /** Une ligne par palette, dans l'ordre de la recette. */
  readonly lignes: readonly LigneDuBilan[];
  readonly comptes: Readonly<Record<EtatDuBilan, number>>;
}

/** Les alertes de sévérité « alerte » qui portent sur une palette seule, par palette, dans l'ordre du moteur. */
function alertesParPalette(alertes: readonly Alerte[]): Map<string, Alerte[]> {
  const parPalette = new Map<string, Alerte[]>();
  for (const alerte of alertes) {
    if (alerte.code === 'palettes-proches' || alerte.code === 'fond-hors-courbe') continue;
    if (severiteDeLAlerte(alerte) !== 'alerte') continue;
    parPalette.set(alerte.palette, [...(parPalette.get(alerte.palette) ?? []), alerte]);
  }
  return parPalette;
}

/** Pour chaque palette d'une paire trop proche, sa première partenaire dans l'ordre du moteur et leur distance. */
function partenaires(recette: Recette, alertes: readonly Alerte[]): Map<string, { avec: Palette; distance: number }> {
  const parId = new Map(recette.palettes.map((palette) => [palette.id, palette]));
  const proches = new Map<string, { avec: Palette; distance: number }>();
  for (const alerte of alertes) {
    if (alerte.code !== 'palettes-proches') continue;
    const [premiere, seconde] = alerte.palettes;
    const [a, b] = [parId.get(premiere), parId.get(seconde)];
    if (a && b) {
      if (!proches.has(premiere)) proches.set(premiere, { avec: b, distance: alerte.distance });
      if (!proches.has(seconde)) proches.set(seconde, { avec: a, distance: alerte.distance });
    }
  }
  return proches;
}

/**
 * Le bilan de la recette. Les garanties se jugent par `verifierPromesses` et
 * se rangent par `groupesManques`, comme l'analyse d'une palette le fait ; les
 * alertes et les paires viennent d'un seul appel à `alertesDeRecette`, au lieu
 * de refaire à chaque palette le calcul des distances de toutes les paires.
 */
export function bilanDesPalettes(recette: Recette): BilanDesPalettes {
  const alertes = alertesDeRecette(recette);
  const siennes = alertesParPalette(alertes);
  const proches = partenaires(recette, alertes);
  const comptes: Record<EtatDuBilan, number> = { rouge: 0, ambre: 0, conforme: 0 };

  const lignes = recette.palettes.map((palette): LigneDuBilan => {
    const manques = groupesManques(verifierPromesses(recette, palette));
    const premierGroupe = manques[0];
    let ligne: LigneDuBilan;
    if (premierGroupe) {
      const manquee = premierGroupe.resultats.find((promesse) => promesse.verdict === 'manquee') ?? premierGroupe.resultats[0];
      ligne = {
        palette,
        etat: 'rouge',
        constat: { nature: 'garantie', mode: premierGroupe.mode, variable: premierGroupe.garantie.premier.variable, contraste: manquee.contraste },
      };
    } else {
      const proche = proches.get(palette.id);
      const propre = siennes.get(palette.id)?.[0];
      // Dans les messages de la palette, la paire précède les alertes qui comparent les intensités.
      if (proche) ligne = { palette, etat: 'ambre', constat: { nature: 'proche', ...proche } };
      else if (propre) ligne = { palette, etat: 'ambre', constat: { nature: 'alerte', alerte: propre } };
      else ligne = { palette, etat: 'conforme', constat: null };
    }
    comptes[ligne.etat] += 1;
    return ligne;
  });
  return { lignes, comptes };
}

/** Vrai quand aucune palette n'est à corriger ni à vérifier : le bilan n'a pas d'onglets. */
export function toutEstConforme(comptes: BilanDesPalettes['comptes']): boolean {
  return comptes.rouge === 0 && comptes.ambre === 0;
}

/**
 * L'onglet actif du bilan : le choix du designer tant que son onglet existe ;
 * sinon « À corriger » s'il compte une palette, sinon « À vérifier ». `null`
 * quand tout est conforme : le bilan n'a pas d'onglets.
 */
export function ongletActifDuBilan(comptes: BilanDesPalettes['comptes'], choisi: EtatDuBilan | null): EtatDuBilan | null {
  if (toutEstConforme(comptes)) return null;
  if (choisi && comptes[choisi] > 0) return choisi;
  return comptes.rouge > 0 ? 'rouge' : 'ambre';
}

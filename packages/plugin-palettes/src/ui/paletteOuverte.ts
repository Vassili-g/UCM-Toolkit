/**
 * Ce que les onglets Création et Vérification partagent ([UI-23], [VER-18]) :
 * la recette affichée, la palette ouverte, son analyse, l'état du geste en
 * cours et le verdict de chaque palette ([VER-19]). Sans DOM ni texte :
 * `tests/paletteOuverte.test.ts` l'éprouve dans Node.
 *
 * L'onglet Création y range ce qu'il affiche et déclare chacun de ses rendus.
 * Un rendu complet prévient les abonnés ; un rendu d'aperçu, pendant un
 * glisser dans le sélecteur de couleur, ne prévient personne.
 */
import { severiteDeLAlerte, type Mode, type Palette, type Recette } from 'ucm-couleur';

import { analyserPalette, type AnalyseDePalette } from '../analyse';
import { verdictDe, type Verdict } from '../presentation';

export interface PaletteOuverte {
  /** La recette affichée, brouillon d'une saisie compris ; `null` quand elle ne se lit pas. */
  recette(): Recette | null;
  poserRecette(recette: Recette | null): void;
  /** L'identifiant de la palette que le designer a choisie ; vide sans choix. */
  id(): string;
  ouvrir(id: string): void;
  /** La palette choisie, `null` sans choix ou quand elle a quitté la recette. */
  palette(): Palette | null;
  /** L'analyse de la palette ouverte dans la recette affichée, calculée une fois par recette. */
  analyse(): AnalyseDePalette | null;
  /** Vrai entre la première prévisualisation d'une saisie et sa validation ([UI-20]). */
  enGeste(): boolean;
  poserGeste(enGeste: boolean): void;
  /** Le verdict de chaque palette de la recette, tel que la dernière fin de geste l'a laissé. */
  verdicts(): ReadonlyMap<string, Verdict>;
  /**
   * L'onglet Création vient de se rendre. Complet et hors d'un geste, le rendu
   * recalcule les verdicts des palettes qui ont changé ; complet, il prévient
   * les abonnés.
   */
  rendu(nature: 'complet' | 'apercu'): void;
  /** `abonne` est appelé après chaque rendu complet ; la fonction rendue le désabonne. */
  abonner(abonne: (etat: PaletteOuverte) => void): () => void;
  /** Le thème que l'aperçu et la carte des garanties montrent ; Light à la création de l'état, et il ne se range nulle part. */
  theme(): Mode;
  /** Le designer choisit un thème : le retour vers le thème d'avant s'efface. */
  choisirLeTheme(mode: Mode): void;
  /** Un lien montre l'autre thème en gardant celui d'avant, que `revenirAuTheme` rend. */
  montrerLeTheme(mode: Mode): void;
  /** Le thème d'avant un `montrerLeTheme`, `null` sans retour à offrir. */
  themeDAvant(): Mode | null;
  revenirAuTheme(): void;
  /** `abonne` est appelé une fois par changement effectif du thème ; la fonction rendue le désabonne. */
  abonnerAuTheme(abonne: (mode: Mode) => void): () => void;
}

/** Ce qu'un verdict retient d'une analyse, et les palettes proches de celle-ci. */
interface Faits {
  readonly cle: string;
  readonly libre: boolean;
  readonly manquees: number;
  /** Les alertes de sévérité « alerte », hors des palettes proches, que `voisines` porte. */
  readonly alertes: number;
  readonly voisines: Set<string>;
}

/**
 * `analyser` est le calcul d'une palette ; les tests le remplacent pour
 * compter les analyses.
 */
export function creerPaletteOuverte(analyser: (recette: Recette, palette: Palette) => AnalyseDePalette = analyserPalette): PaletteOuverte {
  let recette: Recette | null = null;
  let id = '';
  let enGeste = false;
  let analysee: { readonly recette: Recette; readonly id: string; readonly analyse: AnalyseDePalette } | null = null;
  const faits = new Map<string, Faits>();
  let verdicts = new Map<string, Verdict>();
  const abonnes = new Set<(etat: PaletteOuverte) => void>();
  let theme: Mode = 'light';
  let themeDAvant: Mode | null = null;
  const abonnesDuTheme = new Set<(mode: Mode) => void>();

  const prevenirDuTheme = (): void => {
    for (const abonne of [...abonnesDuTheme]) abonne(theme);
  };
  function changerDeTheme(suivant: Mode): void {
    theme = suivant;
    prevenirDuTheme();
  }

  const palette = (): Palette | null => recette?.palettes.find((candidate) => candidate.id === id) ?? null;

  function analyse(): AnalyseDePalette | null {
    const courante = palette();
    if (!recette || !courante) return null;
    if (analysee?.recette !== recette || analysee.id !== courante.id) analysee = { recette, id: courante.id, analyse: analyser(recette, courante) };
    return analysee.analyse;
  }

  /**
   * Les verdicts, à la fin d'un geste ([VER-19]). Une palette ne s'analyse
   * que si son JSON ou celui des réglages communs a changé. « Palettes
   * proches » dépend de l'autre palette de la paire : l'analyse fraîche d'une
   * palette met à jour les voisines des palettes qu'elle nomme, sans les
   * analyser.
   */
  function recalculerLesVerdicts(lue: Recette): void {
    const { palettes, ...communs } = lue;
    const cleDesCommuns = JSON.stringify(communs);
    const presentes = new Set(palettes.map((candidate) => candidate.id));
    for (const connue of [...faits.keys()]) if (!presentes.has(connue)) faits.delete(connue);
    for (const connus of faits.values()) for (const voisine of [...connus.voisines]) if (!presentes.has(voisine)) connus.voisines.delete(voisine);

    const fraiches: { readonly id: string; readonly voisines: Set<string> }[] = [];
    for (const candidate of palettes) {
      const cle = `${JSON.stringify(candidate)}|${cleDesCommuns}`;
      if (faits.get(candidate.id)?.cle === cle) continue;
      const resultat = candidate.id === id ? analyse() ?? analyser(lue, candidate) : analyser(lue, candidate);
      const voisines = new Set<string>();
      let alertes = 0;
      for (const alerte of resultat.alertes) {
        if (alerte.code === 'palettes-proches') voisines.add(alerte.palettes[0] === candidate.id ? alerte.palettes[1] : alerte.palettes[0]);
        else if (severiteDeLAlerte(alerte) === 'alerte') alertes += 1;
      }
      faits.set(candidate.id, { cle, libre: resultat.libre, manquees: resultat.manquees, alertes, voisines });
      fraiches.push({ id: candidate.id, voisines });
    }
    for (const fraiche of fraiches) {
      for (const [autre, connus] of faits) {
        if (autre === fraiche.id) continue;
        if (fraiche.voisines.has(autre)) connus.voisines.add(fraiche.id);
        else connus.voisines.delete(fraiche.id);
      }
    }
    verdicts = new Map(palettes.map((candidate) => {
      const connus = faits.get(candidate.id)!;
      return [candidate.id, verdictDe({ libre: connus.libre, manquees: connus.manquees, alertes: connus.alertes + connus.voisines.size })];
    }));
  }

  const etat: PaletteOuverte = {
    recette: () => recette,
    poserRecette(suivante) {
      recette = suivante;
    },
    id: () => id,
    ouvrir(suivant) {
      id = suivant;
    },
    palette,
    analyse,
    enGeste: () => enGeste,
    poserGeste(suivant) {
      enGeste = suivant;
    },
    verdicts: () => verdicts,
    rendu(nature) {
      if (nature === 'apercu') return;
      if (!recette) {
        faits.clear();
        verdicts = new Map();
      } else if (!enGeste) recalculerLesVerdicts(recette);
      for (const abonne of [...abonnes]) abonne(etat);
    },
    abonner(abonne) {
      abonnes.add(abonne);
      return () => {
        abonnes.delete(abonne);
      };
    },
    theme: () => theme,
    choisirLeTheme(suivant) {
      const retourEfface = themeDAvant !== null;
      themeDAvant = null;
      if (suivant !== theme) changerDeTheme(suivant);
      else if (retourEfface) prevenirDuTheme();
    },
    montrerLeTheme(suivant) {
      if (suivant === theme) return;
      themeDAvant = theme;
      changerDeTheme(suivant);
    },
    themeDAvant: () => themeDAvant,
    revenirAuTheme() {
      const cible = themeDAvant;
      themeDAvant = null;
      if (cible) changerDeTheme(cible);
    },
    abonnerAuTheme(abonne) {
      abonnesDuTheme.add(abonne);
      return () => {
        abonnesDuTheme.delete(abonne);
      };
    },
  };
  return etat;
}

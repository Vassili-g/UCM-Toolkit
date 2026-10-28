/**
 * L'enregistrement des accès du moteur (16.3, 16.4) : sur le double d'une capture, chaque lecture que le lecteur `moteur` fait
 * d'un nœud se range dans la région qui la couvre au second clic. Une lecture hors de ces régions serait un résultat repris
 * sans que rien ne l'ait revu.
 *
 * Régions, dans l'ordre où une lecture s'y range :
 * - `jeu` : l'inventaire du sujet (`suivi.noeuds`), suivi au journal et relu par le relevé ;
 * - `fermeture` : les maîtres locaux suivis et leurs descendants (`suivi.maitres`), suivis au journal. Un champ de liaison
 *   (`CHAMPS_DE_LIAISON`) n'y est couvert que si `dependancesDeFigma` le relit sur le même nœud : la matrice de couverture
 *   du socle ne lui reconnaît aucun événement ;
 * - `distant` : un maître distant de la fermeture. Chaque champ lu doit être relu par `dependancesDeFigma` sur le même
 *   nœud : une mise à jour de library le change sans événement ;
 * - `comparee` : un couple nœud et champ que `dependancesDeFigma`, lancé seul sur le même état, lit aussi hors des deux
 *   premières régions. Tout ce que ce lecteur lit là aboutit dans une sortie comparée : scan des règles, noms de la page,
 *   page et origine d'un maître.
 *
 * Dans le jeu et la fermeture, un nœud sous une instance dont le maître n'est pas suivi (`sousUneInstance`) suit la même
 * règle que le maître distant : son contenu suit le maître sans `nodechange`.
 *
 * Les appels de ressources du moteur (`getVariableByIdAsync`, `getVariableCollectionByIdAsync`, `getStyleByIdAsync`) suivent
 * la règle du maître distant : aucun événement ne dit qu'une variable de library a été renommée ou qu'un style a changé.
 * Chaque appel doit être refait, sur le même identifiant, par un lecteur dont la sortie est comparée : le relevé, ou les
 * dépendances (`dependancesDeFigma` puis `variablesDesDependances`).
 *
 * Le relevé, les dépendances et le moteur se rejouent chacun seul, mémoire des pages vidée avant : une lecture d'un autre
 * lecteur ne s'attribue à aucun, et l'index des noms contractés relit ses pages. Du relevé, seuls les appels de ressources
 * comptent.
 */
import { oublierLIndexDuDocument } from 'ucm-plugin-socle/src/composant/contract/composedComponents';

import type { CaptureArchitect } from '../../src/sandbox/capture';
import type { Contexte } from '../../src/sandbox/contexte';
import { LECTEURS_DE_FIGMA, dependancesDeFigma, reinitialiserLAnalyse, sessionDesAnalyses, traiter, variablesDesDependances } from '../../src/sandbox/analyse';
import { doubleDepuisCapture } from './capture';

export type RegionDAcces = 'jeu' | 'fermeture' | 'distant' | 'comparee' | 'hors';

export interface BilanDesAcces {
  /** Les nœuds distincts que le moteur lit, par région. */
  readonly noeuds: Record<RegionDAcces, number>;
  /** Les champs lus dans chaque région, avec le nombre de nœuds qui les voient lus. */
  readonly champs: Record<RegionDAcces, Record<string, number>>;
  /** Les couples nœud et champ qu'aucune région ne couvre. */
  readonly horsCouverture: readonly string[];
  /** Les champs lus sur chaque maître distant, par identifiant. */
  readonly distants: Record<string, readonly string[]>;
  /** Les nœuds du jeu et de la fermeture que le moteur lit sous une instance dont le maître n'est pas suivi, avec leurs champs lus. */
  readonly sousUneInstance: readonly string[];
  /** Les lectures de nœuds de `dependancesDeFigma` seul, et ses appels de `getMainComponentAsync`. */
  readonly dependances: { readonly lectures: number; readonly maitresLus: number };
  /** Les appels de ressources distincts du moteur (`getVariableByIdAsync(id)`…) ; ceux que les dépendances ne refont pas sont aussi dans `horsCouverture`. */
  readonly ressources: readonly string[];
}

/** Les appels de `figma` qui lisent une ressource par identifiant : une variable, une collection ou un style. */
const APPEL_DE_RESSOURCE = /^(getVariableByIdAsync|getVariableCollectionByIdAsync|getStyleByIdAsync)\(/;

const globale = globalThis as { figma?: unknown };

/** Les méthodes de page qui ne lisent aucune donnée : elles chargent la page, posent ou retirent une écoute. */
const SANS_DONNEE = new Set(['loadAsync', 'on', 'off']);

/** Les champs de l'entrée `liaisons-de-variables` de `MATRICE_DE_COUVERTURE` : à relire faute d'événement démontré. */
const CHAMPS_DE_LIAISON = new Set(['boundVariables', 'explicitVariableModes', 'resolvedVariableModes']);

/**
 * Analyse une fois la capture pour retenir une entrée, puis rejoue seuls les dépendances et le moteur en enregistrant
 * leurs lectures. `figma` est posé en global pendant l'appel, comme au runtime.
 */
export async function enregistrerLesAccesDuMoteur(capture: CaptureArchitect): Promise<BilanDesAcces> {
  let phase: 'releve' | 'dependances' | 'moteur' | null = null;
  const parPhase = { dependances: new Map<string, Set<string>>(), moteur: new Map<string, Set<string>>() };
  const ressourcesParPhase = { releve: new Set<string>(), dependances: new Set<string>(), moteur: new Set<string>() };
  let maitresLus = 0;
  let lecturesDesDependances = 0;
  const double = doubleDepuisCapture(capture, {
    surLecture: ({ noeud, champ }) => {
      if (phase && noeud === 'figma' && APPEL_DE_RESSOURCE.test(champ)) ressourcesParPhase[phase].add(champ);
      if (!phase || phase === 'releve' || noeud === 'figma' || SANS_DONNEE.has(champ)) return;
      if (phase === 'dependances') {
        lecturesDesDependances += 1;
        if (champ === 'getMainComponentAsync') maitresLus += 1;
      }
      const champs = parPhase[phase].get(noeud) ?? new Set<string>();
      champs.add(champ);
      parPhase[phase].set(noeud, champs);
    },
  });
  const precedent = globale.figma;
  globale.figma = double.figma;
  try {
    const contexte: Contexte = { figma: double.figma as unknown as PluginAPI, envoyer: () => {}, surveillerLeDocument: () => [] };
    reinitialiserLAnalyse();
    oublierLIndexDuDocument();
    await traiter({ type: 'analyser', demande: 1 }, contexte);
    const session = sessionDesAnalyses();
    const entree = session.entree(session.sujets()[0] ?? '');
    if (!entree) throw new Error('La capture ne laisse aucune entrée retenue.');
    const sujet = await LECTEURS_DE_FIGMA.sujet(contexte);
    if (!sujet) throw new Error('La capture ne désigne aucun sujet.');

    phase = 'releve';
    await LECTEURS_DE_FIGMA.releve(sujet, { leve: false }, contexte);
    oublierLIndexDuDocument();
    phase = 'dependances';
    await variablesDesDependances(await dependancesDeFigma(sujet, contexte), contexte);
    phase = null;
    oublierLIndexDuDocument();
    phase = 'moteur';
    await LECTEURS_DE_FIGMA.moteur(sujet, { leve: false }, contexte);
    phase = null;

    const jeu = entree.suivi.noeuds;
    const fermeture = entree.suivi.maitres ?? new Set<string>();
    const distants = new Set((entree.sorties.dependances?.maitres ?? []).filter(({ remote }) => remote !== false).map(({ id }) => id));
    const vide = (): Record<RegionDAcces, number> => ({ jeu: 0, fermeture: 0, distant: 0, comparee: 0, hors: 0 });
    const noeuds = vide();
    const champs: Record<RegionDAcces, Record<string, number>> = { jeu: {}, fermeture: {}, distant: {}, comparee: {}, hors: {} };
    const horsCouverture: string[] = [];
    const lusSurLesDistants: Record<string, string[]> = {};
    const sousUneInstance: string[] = [];
    const parentCapture = (id: string): string | undefined => (capture.noeuds[id]?.proprietes.parent as { id?: string } | undefined)?.id;
    const maitreCapture = (id: string): string | undefined => (capture.noeuds[id]?.maitre as { id?: string } | undefined)?.id;
    /** Vrai sous une instance dont le maître n'est pas suivi au journal : son contenu change sans événement. */
    const sousUneInstanceNonSuivie = (id: string): boolean => {
      for (let courant = parentCapture(id); courant !== undefined; courant = parentCapture(courant)) {
        const type = capture.noeuds[courant]?.type;
        if (type === 'INSTANCE') {
          const maitre = maitreCapture(courant);
          if (maitre === undefined || !fermeture.has(maitre)) return true;
        }
        if (type === 'COMPONENT' || type === 'COMPONENT_SET') return false;
      }
      return false;
    };
    for (const [noeud, lus] of parPhase.moteur) {
      const regionDuNoeud: RegionDAcces | null = jeu.has(noeud) ? 'jeu' : fermeture.has(noeud) ? 'fermeture' : distants.has(noeud) ? 'distant' : null;
      const regions = new Set<RegionDAcces>();
      for (const champ of lus) {
        const relu = parPhase.dependances.get(noeud)?.has(champ) ?? false;
        const liaisonNonRelue = regionDuNoeud === 'fermeture' && CHAMPS_DE_LIAISON.has(champ) && !relu;
        // Sous une instance non suivie, et sur un maître distant, tout champ lu doit être relu.
        const sansEvenement = (regionDuNoeud === 'distant' || (regionDuNoeud !== null && sousUneInstanceNonSuivie(noeud))) && !relu;
        const region = liaisonNonRelue || sansEvenement ? 'hors' : regionDuNoeud ?? (relu ? 'comparee' : 'hors');
        regions.add(region);
        champs[region][champ] = (champs[region][champ] ?? 0) + 1;
        if (region === 'hors') horsCouverture.push(`${noeud}.${champ}`);
      }
      // Un nœud dont un champ sort des régions compte comme hors couverture.
      noeuds[regions.has('hors') ? 'hors' : [...regions][0] ?? 'hors'] += 1;
      if (regionDuNoeud === 'distant') lusSurLesDistants[noeud] = [...lus].sort();
      if (regionDuNoeud !== null && sousUneInstanceNonSuivie(noeud)) sousUneInstance.push(`${noeud} : ${[...lus].sort().join(', ')}`);
    }
    for (const appel of ressourcesParPhase.moteur) {
      if (!ressourcesParPhase.dependances.has(appel) && !ressourcesParPhase.releve.has(appel)) horsCouverture.push(`figma.${appel}`);
    }
    return {
      noeuds, champs, horsCouverture: horsCouverture.sort(), distants: lusSurLesDistants, sousUneInstance: sousUneInstance.sort(),
      dependances: { lectures: lecturesDesDependances, maitresLus }, ressources: [...ressourcesParPhase.moteur].sort(),
    };
  } finally {
    phase = null;
    globale.figma = precedent;
    oublierLIndexDuDocument();
  }
}

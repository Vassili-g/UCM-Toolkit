/**
 * L'enregistrement des accès du relevé (16.15) : sur le double d'une capture, Actualiser lit le relevé par le chemin
 * complet, puis Analyser le valide. Chaque couple nœud et champ, et chaque appel d'API, que le relevé complet lit doit être
 * relu par la validation (relevé et prélecture) : un relevé retenu dont une lecture ne serait pas refaite servirait une
 * valeur que rien n'a revue. La validation relit le relevé entier ; l'enregistrement garde cette règle contre une
 * validation qui sauterait une lecture.
 *
 * Les lectures se notent pendant le seul lecteur `releve`, et pendant `prelecture` pour la validation, que le relevé attend
 * ici avant de lire. La lecture des libraries court en même temps et n'en fait pas partie : ses appels (`teamLibrary.*`,
 * `clientStorage.*`) sont écartés.
 */
import type { CaptureArchitect } from '../../src/sandbox/capture';
import type { Contexte } from '../../src/sandbox/contexte';
import { LECTEURS_DE_FIGMA, reinitialiserLAnalyse, traiterAvec, type Lecteurs } from '../../src/sandbox/analyse';
import type { PluginMessage } from '../../src/messages';
import { doubleDepuisCapture } from './capture';

export interface BilanDesAccesDuReleve {
  /** Les couples distincts que le relevé complet lit. */
  readonly lus: number;
  /** Les champs que le relevé complet lit, avec le nombre de nœuds (ou de ressources) qui les voient lus. */
  readonly champs: Readonly<Record<string, number>>;
  /** Les couples du relevé complet que la validation ne relit pas. */
  readonly horsCouverture: readonly string[];
  /** Ce que la trace de la demande validée dit du relevé : `repriseDuReleve` ou `nonRepriseDuReleve:<raison>`. */
  readonly releve: readonly string[];
}

const globale = globalThis as { figma?: unknown };
const HORS_DU_RELEVE = /^(teamLibrary\.|clientStorage\.)/;

/**
 * `alterer` reçoit les lecteurs et le double avant les deux demandes, et rend les lecteurs qu'elles prennent : un test y
 * joue une validation qui ne relit pas tout.
 */
export async function enregistrerLesAccesDuReleve(capture: CaptureArchitect, alterer?: (lecteurs: Lecteurs, figma: Record<string, unknown>) => Lecteurs): Promise<BilanDesAccesDuReleve> {
  let actifs = 0;
  let courant: Map<string, Set<string>> | null = null;
  const double = doubleDepuisCapture(capture, {
    surLecture: ({ noeud, champ }) => {
      if (actifs === 0 || !courant || HORS_DU_RELEVE.test(champ)) return;
      const lecteurs = courant.get(noeud) ?? new Set<string>();
      lecteurs.add(champ);
      courant.set(noeud, lecteurs);
    },
  });
  const pendant = <A extends unknown[], R>(lire: (...args: A) => Promise<R>) => async (...args: A): Promise<R> => {
    actifs += 1;
    try { return await lire(...args); } finally { actifs -= 1; }
  };
  // Le relevé attend la fin de la prélecture : rien d'autre que les libraries ne court pendant les deux, et une lecture des
  // dépendances ou du moteur ne peut pas passer pour une relecture.
  let prelue: Promise<unknown> = Promise.resolve();
  const prelire = pendant(LECTEURS_DE_FIGMA.prelecture!);
  const enregistres: Lecteurs = {
    ...LECTEURS_DE_FIGMA,
    prelecture: (...args) => { const lecture = prelire(...args); prelue = lecture.catch(() => undefined); return lecture; },
    releve: pendant(async (...args: Parameters<Lecteurs['releve']>) => { await prelue; return LECTEURS_DE_FIGMA.releve(...args); }),
  };
  const precedent = globale.figma;
  globale.figma = double.figma;
  try {
    const demander = async (lecteurs: Lecteurs, intention: 'analyser' | 'actualiser') => {
      const envoyes: PluginMessage[] = [];
      const contexte: Contexte = { figma: double.figma as unknown as PluginAPI, envoyer: (m) => envoyes.push(m), surveillerLeDocument: () => [] };
      await traiterAvec(lecteurs)({ type: 'analyser', intention, demande: 1, mesurer: true }, contexte);
      const final = envoyes.find((message) => message.type === 'analyse');
      return final && 'mesure' in final && final.mesure ? Object.keys(final.mesure.compteurs) : [];
    };
    reinitialiserLAnalyse();
    const lecteurs = alterer ? alterer(enregistres, double.figma) : enregistres;
    const complet = new Map<string, Set<string>>();
    courant = complet;
    await demander(lecteurs, 'actualiser');
    const valide = new Map<string, Set<string>>();
    courant = valide;
    const compteurs = await demander(lecteurs, 'analyser');
    courant = null;
    const champs: Record<string, number> = {};
    const horsCouverture: string[] = [];
    let lus = 0;
    for (const [noeud, lecteurs] of complet) {
      for (const champ of lecteurs) {
        lus += 1;
        const nom = champ.replace(/\(.*$/, '');
        champs[nom] = (champs[nom] ?? 0) + 1;
        if (!valide.get(noeud)?.has(champ)) horsCouverture.push(`${noeud}.${champ}`);
      }
    }
    return { lus, champs, horsCouverture: horsCouverture.sort(), releve: compteurs.filter((nom) => nom === 'repriseDuReleve' || nom.startsWith('nonRepriseDuReleve:')).sort() };
  } finally {
    globale.figma = precedent;
    reinitialiserLAnalyse();
  }
}

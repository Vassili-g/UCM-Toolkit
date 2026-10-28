/**
 * La lecture des libraries lancée à la sélection d'un composant, avant le clic sur Analyser.
 *
 * Elle ne vit que dans la mémoire du sandbox : un seul exemplaire, un jeton et une coopération à elle, aucune portée
 * d'analyse. Au clic, l'analyse la reprend si la liste des collections et de leurs variables n'a pas changé. Une
 * lecture encore en cours s'attend sans vérification. Une erreur de l'anticipation n'a aucun effet : le clic relit.
 */
import { compter } from 'ucm-plugin-socle/src/composant/contract/mesure';
import { creerContexteCooperatif, type ContexteCooperatif, type JetonDAnnulation } from 'ucm-plugin-socle/src/composant/contract/porteeDAnalyse';
import { lireLesLibraries, type LectureDesLibraries, type PortDeBibliotheque } from 'ucm-plugin-socle/src/bibliotheque';

/** Une sélection qui suit une lecture plus récente que cela ne la relance pas ; le clic vérifie de toute façon la liste. */
export const RECENCE_DE_L_ANTICIPATION_MS = 60_000;

interface Anticipee {
  readonly figma: PluginAPI;
  readonly jeton: { leve: boolean };
  readonly debut: number;
  etat: 'en-cours' | 'lue' | 'echec';
  lecture: Extract<LectureDesLibraries, { etat: 'lue' }> | null;
  /** Ne rejette jamais : `null` quand la lecture a échoué ou que les libraries sont illisibles. */
  readonly issue: Promise<Extract<LectureDesLibraries, { etat: 'lue' }> | null>;
}

let anticipee: Anticipee | null = null;

/** Lance la lecture des libraries, sauf si une lecture de ce fichier date de moins de `RECENCE_DE_L_ANTICIPATION_MS`. */
export function anticiperLesLibraries(figma: PluginAPI): void {
  if (anticipee && anticipee.figma === figma && Date.now() - anticipee.debut < RECENCE_DE_L_ANTICIPATION_MS) return;
  abandonnerLesLibrariesAnticipees();
  const jeton: JetonDAnnulation & { leve: boolean } = { leve: false };
  const cooperation = creerContexteCooperatif({ respirer: () => new Promise((resolve) => setTimeout(resolve, 0)), jeton });
  const courante: Anticipee = {
    figma, jeton, debut: Date.now(), etat: 'en-cours', lecture: null,
    issue: (async () => lireLesLibraries(figma as unknown as PortDeBibliotheque, cooperation))().then(
      (lecture) => {
        if (lecture.etat !== 'lue') { courante.etat = 'echec'; return null; }
        courante.etat = 'lue';
        courante.lecture = lecture;
        return lecture;
      },
      () => { courante.etat = 'echec'; return null; },
    ),
  };
  anticipee = courante;
}

/** Oublie la lecture anticipée et arrête celle qui court : changement de page, ou tests. */
export function abandonnerLesLibrariesAnticipees(): void {
  if (anticipee) anticipee.jeton.leve = true;
  anticipee = null;
}

/** Vrai quand une lecture anticipée de ce fichier existe, finie ou non. */
export function uneLectureAnticipeeExiste(figma: PluginAPI): boolean {
  return anticipee !== null && anticipee.figma === figma;
}

/** Les collections, leurs variables (clé, nom, type) et les collections illisibles, dans l'ordre de Figma ; le motif d'un refus n'y compte pas. */
function signature(lecture: Extract<LectureDesLibraries, { etat: 'lue' }>): string {
  return JSON.stringify([
    lecture.collections.map((c) => [c.cle, c.nom, c.library, c.variables.map((v) => [v.cle, v.nom, v.type])]),
    lecture.illisibles.map((c) => [c.cle, c.nom, c.library]),
  ]);
}

/**
 * La lecture des libraries d'une analyse. Sans lecture anticipée, elle lit. Avec une lecture en cours, elle l'attend.
 * Avec une lecture finie, elle relit les noms, clés et types, puis rend la lecture anticipée si la liste est
 * identique, la nouvelle sinon, qui remplace alors l'anticipée. La trace compte la reprise ou la relecture et le temps
 * de la vérification.
 */
export async function lireLesLibrariesAuClic(figma: PluginAPI, cooperation?: ContexteCooperatif): Promise<LectureDesLibraries> {
  const port = figma as unknown as PortDeBibliotheque;
  const prete = anticipee && anticipee.figma === figma ? anticipee : null;
  if (prete === null || prete.etat === 'echec') return lireLesLibraries(port, cooperation);
  if (prete.etat === 'en-cours') {
    const lue = await prete.issue;
    cooperation?.verifier();
    if (lue) {
      compter('librariesAnticipeesReprises');
      return lue;
    }
    return lireLesLibraries(port, cooperation);
  }
  const debut = Date.now();
  let nouvelle: LectureDesLibraries;
  try { nouvelle = await lireLesLibraries(port, cooperation); }
  finally { compter('msVerificationDesLibraries', Date.now() - debut); }
  if (nouvelle.etat === 'lue' && prete.lecture !== null && signature(nouvelle) === signature(prete.lecture)) {
    compter('librariesAnticipeesReprises');
    return prete.lecture;
  }
  compter('librariesAnticipeesRelues');
  if (nouvelle.etat === 'lue' && anticipee === prete) {
    anticipee = { figma, jeton: prete.jeton, debut: Date.now(), etat: 'lue', lecture: nouvelle, issue: Promise.resolve(nouvelle) };
  }
  return nouvelle;
}

/**
 * Relit la liste des libraries pour tenir la mémoire de Figma chaude : Figma garde les variables d'une library 5 à 10 s (E6, lot
 * 16), et la vérification du clic tombe dans cette mémoire. La prélecture l'appelle toutes les 5 s. Sans lecture anticipée, ou
 * après un échec, elle en lance une, sans attendre `RECENCE_DE_L_ANTICIPATION_MS` ; une lecture en cours s'attend ; une lecture
 * finie se vérifie comme au clic, et la nouvelle liste la remplace si elle diffère. Ne rejette jamais.
 */
export async function rafraichirLesLibraries(figma: PluginAPI): Promise<void> {
  try {
    const prete = anticipee && anticipee.figma === figma ? anticipee : null;
    if (prete === null || prete.etat === 'echec') {
      abandonnerLesLibrariesAnticipees();
      anticiperLesLibraries(figma);
      await anticipee?.issue;
    } else if (prete.etat === 'en-cours') await prete.issue;
    else await lireLesLibrariesAuClic(figma);
  } catch {
    // Sans cette relecture, la vérification du clic relit seule.
  }
}

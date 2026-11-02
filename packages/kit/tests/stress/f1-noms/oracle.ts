/**
 * Oracle du stress test F1 (plan F1, section 1) : pour un cas et la sortie du kit, rend un verdict par attente.
 * Un verdict est « détecté » ou « manqué » quand le cas attend une détection, « ok » ou « faux positif » quand il attend le
 * silence. Un cas qui dépend d'une décision provisoire (Q-Fx) porte le rôle `provisoire`, un cas que personne n'a classé ou
 * que le plan mesure sans le juger le rôle `informatif` ; ces deux rôles sont comptés à part dans le rapport.
 * L'oracle ne lit pas le code du kit : les distances et les places sont réécrites ici, pour que le verdict ne dépende pas de la
 * fonction que le kit emploie.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COLLECTIONS, FORMES_ANCIENNES_DES_COLLECTIONS } from '../../../src/referentiel/architecture.js';
import type { Collision, Question, Renommage } from '../../../src/referentiel/index.js';
import { REGISTRES, SYNONYMES_COURANTS } from '../../../src/referentiel/vocabulaire.js';
import { REGISTRES_ARCHITECTURE } from '../../../src/referentiel/architecture.js';
import { motsDeDetection, type Detecteur } from './detecteur.js';
import { mutationsDe, OPERATEURS_DE_FAUTE } from './mutations.js';
import type { Contexte, NomDeScenario, Scenario } from './scenarios.js';

const DOSSIER_DES_DONNEES = join(dirname(fileURLToPath(import.meta.url)), 'donnees');

export type Role = 'oracle' | 'provisoire' | 'informatif';
export type Issue = 'detecte' | 'manque' | 'ok' | 'faux-positif';
export type Visibilite = 'questions' | 'autres' | 'perdue';

export interface Verdict {
  readonly cas: string;
  readonly strate: string;
  readonly operateur: string;
  /** Les propriétés que ce verdict mesure ; la première est la principale. */
  readonly proprietes: readonly string[];
  readonly role: Role;
  /** La question du plan (Q-Fx) dont dépend un verdict `provisoire`. */
  readonly provisoire?: string;
  /** Vrai quand le cas attend une détection ; faux quand il attend le silence. */
  readonly attendu: boolean;
  readonly issue: Issue;
  readonly mot?: string;
  readonly reference?: string;
  readonly detail: string;
  /** Les écarts de l'inventaire que le verdict illustre, ou `nouveau`. */
  readonly ecarts: readonly string[];
  /** Où la question détectée arrive avec les paramètres de la session (N2). */
  readonly visibilite?: Visibilite;
  readonly axes: Readonly<Record<string, string | number>>;
}

/** La sortie du kit pour un fichier : renommages, collisions et questions de N1 (seuil 0, maximum sans borne). */
export interface Sortie {
  readonly noms: readonly NomDeScenario[];
  readonly renommages: readonly Renommage[];
  readonly collisions: readonly Collision[];
  readonly questions: readonly Question[];
  /** Les clés des questions que la session montre dans l'onglet Questions (N2). */
  readonly visibles: ReadonlySet<string>;
  /** Les clés des questions de N2 rangées dans « Autres pistes ». */
  readonly autres: ReadonlySet<string>;
  /** Identifiant d'un nom vers son chemin. */
  readonly nomsParId: ReadonlyMap<string, string>;
}

export interface Classements {
  /** Paires triées `a|b` que `formes.json` classe « formes d'un même mot ». */
  readonly memeMot: ReadonlySet<string>;
  /** Paires triées `a|b` que `formes.json` classe « mots distincts ». */
  readonly motsDistincts: ReadonlySet<string>;
  readonly groupes: readonly (readonly string[])[];
}

export interface ContexteOracle {
  readonly detecteur: Detecteur;
  readonly classements: Classements;
  readonly scenarios: Contexte;
  /** Les identifiants des termes UCM des registres de couleur, d'état, de taille et d'architecture. */
  readonly termesUcm: ReadonlySet<string>;
}

export const clePaire = (a: string, b: string): string => [a.toLowerCase(), b.toLowerCase()].sort().join('|');

export function chargerLesClassements(dossier: string = DOSSIER_DES_DONNEES): Classements {
  const formes = JSON.parse(readFileSync(join(dossier, 'formes.json'), 'utf8')) as { memeMot: [string, string][]; motsDistincts: [string, string][] };
  const synonymes = JSON.parse(readFileSync(join(dossier, 'synonymes.json'), 'utf8')) as { groupes: string[][] };
  return {
    memeMot: new Set(formes.memeMot.map(([a, b]) => clePaire(a, b))),
    motsDistincts: new Set(formes.motsDistincts.map(([a, b]) => clePaire(a, b))),
    groupes: synonymes.groupes,
  };
}

export function creerLeContexteOracle(scenarios: Contexte, detecteur: Detecteur, classements: Classements = chargerLesClassements()): ContexteOracle {
  const termesUcm = new Set([...REGISTRES, ...REGISTRES_ARCHITECTURE].flatMap((registre) => registre.termes.map((terme) => terme.id.toLowerCase())));
  return { detecteur, classements, scenarios, termesUcm };
}

// ---------------------------------------------------------------------------------------------------------------- outils

const echapper = (mot: string) => mot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const motifs = new Map<string, RegExp>();
/** Vrai si le nom contient le mot entre deux frontières (début, fin, `/`, `-`, `_`, espace). */
export function contient(nom: string, mot: string): boolean {
  let motif = motifs.get(mot);
  if (!motif) { motif = new RegExp(`(^|[^a-z0-9])${echapper(mot.toLowerCase())}($|[^a-z0-9])`); motifs.set(mot, motif); }
  return motif.test(nom.toLowerCase());
}

/** Les mots qu'une question met en jeu, en minuscules. */
export function motsEnJeu(question: Question): Set<string> {
  switch (question.type) {
    case 'paire': return new Set(question.termes.map((terme) => terme.mot.toLowerCase()));
    case 'ecriture-du-terme':
      return new Set([question.terme.mot, ...question.proposition, ...(question.reference ? [question.reference.mot] : [])].map((mot) => mot.toLowerCase()));
    case 'collection': return new Set([question.nom.toLowerCase()]);
  }
}

const questionSur = (sortie: Sortie, ...mots: string[]): Question | undefined =>
  sortie.questions.find((question) => { const enJeu = motsEnJeu(question); return mots.every((mot) => enJeu.has(mot.toLowerCase())); });
const questionAutour = (sortie: Sortie, mots: readonly string[]): Question | undefined =>
  sortie.questions.find((question) => { const enJeu = motsEnJeu(question); return mots.some((mot) => enJeu.has(mot.toLowerCase())); });
const fauteSur = (sortie: Sortie, mot: string): Question | undefined =>
  sortie.questions.find((question) => question.type === 'ecriture-du-terme' && question.indice === 'faute' && question.terme.mot.toLowerCase() === mot.toLowerCase());
const motsColles = (sortie: Sortie, mot: string): Question | undefined =>
  sortie.questions.find((question) => question.type === 'ecriture-du-terme' && question.indice === 'mots-colles' && question.terme.mot.toLowerCase() === mot.toLowerCase());
const variables = (sortie: Sortie): Renommage[] => sortie.renommages.filter((renommage) => renommage.categorie !== 'collections');

/** Un renommage qui retire `mot` d'un nom, avec `par` dans le nouveau nom quand il est donné. */
const renommeLeMot = (sortie: Sortie, mot: string, par?: string): Renommage | undefined =>
  variables(sortie).find((renommage) => contient(renommage.ancienNom, mot) && !contient(renommage.nouveauNom, mot) && (par === undefined || contient(renommage.nouveauNom, par)));

function compter(noms: readonly NomDeScenario[], mot: string): number {
  return noms.filter((nom) => motsDeDetection(nom.nom).includes(mot.toLowerCase()) || contient(nom.nom, mot)).length;
}

/** La place d'un mot, comme le plan la définit : collection, rang, voisin avant ou après. */
function lieux(noms: readonly NomDeScenario[], mot: string): Map<string, Set<string>> {
  const rendus = new Map<string, Set<string>>();
  for (const nom of noms) {
    const segments = nom.nom.split('/').map((segment) => segment.toLowerCase());
    segments.forEach((segment, rang) => {
      if (!segment.split('-').includes(mot.toLowerCase()) && segment !== mot.toLowerCase()) return;
      const cles = [];
      if (rang > 0) cles.push(JSON.stringify([nom.collection, rang, 'avant', segments[rang - 1]]));
      if (rang + 1 < segments.length) cles.push(JSON.stringify([nom.collection, rang, 'apres', segments[rang + 1]]));
      for (const cle of cles) (rendus.get(cle) ?? rendus.set(cle, new Set()).get(cle)!).add(`${nom.collection}|${nom.nom}`);
    });
  }
  return rendus;
}
export function partagentUnePlace(noms: readonly NomDeScenario[], a: string, b: string): boolean {
  const lieuxA = lieux(noms, a), lieuxB = lieux(noms, b);
  for (const [cle, nomsA] of lieuxA) {
    const nomsB = lieuxB.get(cle);
    if (nomsB && [...nomsA].some((x) => [...nomsB].some((y) => x !== y))) return true;
  }
  return false;
}

const estUnEchange = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  const rangs = [...a].flatMap((lettre, rang) => (lettre === b[rang] ? [] : [rang]));
  return rangs.length === 2 && rangs[1] === rangs[0] + 1 && a[rangs[0]] === b[rangs[1]] && a[rangs[1]] === b[rangs[0]];
};

// ---------------------------------------------------------------------------------------------------------------- verdicts

interface Option {
  readonly proprietes: readonly string[];
  readonly attendu: boolean;
  readonly ok: boolean;
  readonly detail: string;
  readonly mot?: string;
  readonly reference?: string;
  readonly ecarts?: readonly string[];
  readonly role?: Role;
  readonly provisoire?: string;
  readonly cle?: string;
}

function visibiliteDe(sortie: Sortie, cle: string | undefined): Visibilite | undefined {
  if (!cle) return undefined;
  return sortie.visibles.has(cle) ? 'questions' : sortie.autres.has(cle) ? 'autres' : 'perdue';
}

function verdict(cas: Pick<Scenario, 'id' | 'strate' | 'operateur' | 'axes' | 'oracle' | 'provisoire'>, sortie: Sortie, o: Option): Verdict {
  const role: Role = o.role ?? (!cas.oracle ? 'informatif' : (o.provisoire ?? cas.provisoire) ? 'provisoire' : 'oracle');
  const issue: Issue = o.attendu ? (o.ok ? 'detecte' : 'manque') : o.ok ? 'ok' : 'faux-positif';
  const provisoire = role === 'provisoire' ? (o.provisoire ?? cas.provisoire) : undefined;
  return {
    cas: cas.id, strate: cas.strate, operateur: cas.operateur, proprietes: o.proprietes, role, ...(provisoire ? { provisoire } : {}),
    attendu: o.attendu, issue, ...(o.mot ? { mot: o.mot } : {}), ...(o.reference ? { reference: o.reference } : {}), detail: o.detail,
    ecarts: issue === 'manque' || issue === 'faux-positif' ? (o.ecarts?.length ? o.ecarts : ['nouveau']) : [],
    ...(o.ok && o.attendu && o.cle ? { visibilite: visibiliteDe(sortie, o.cle) } : {}), axes: cas.axes,
  };
}

// ---------------------------------------------------------------------------------------------------------------- fautes

/** Les écarts connus qui expliquent qu'une faute manque, d'après le placement du cas. */
function ecartsDeFaute(noms: readonly NomDeScenario[], mot: string, reference: string, proprietes: readonly string[]): string[] {
  const ecarts: string[] = [];
  const m = compter(noms, mot), k = compter(noms, reference);
  if (proprietes.includes('P-04')) ecarts.push('E-04');
  if (estUnEchange(mot.toLowerCase(), reference.toLowerCase())) ecarts.push('E-03');
  if (k < 5) ecarts.push('E-01');
  if (m > 2) ecarts.push('E-02');
  if (!partagentUnePlace(noms, mot, reference)) ecarts.push('E-05');
  return ecarts;
}

/** Une faute `mot` attendue près de `reference` : une question faute sur `mot` dont la référence est `reference` ou un autre terme proche. */
export function jugerUneFaute(cas: Pick<Scenario, 'id' | 'strate' | 'operateur' | 'axes' | 'oracle' | 'provisoire'>, sortie: Sortie, ctx: ContexteOracle,
  mot: string, reference: string, proprietes: readonly string[], extra: Partial<Option> = {}): Verdict {
  const proches = ctx.detecteur.termesProches(mot);
  if (!proches.includes(reference)) {
    return verdict({ ...cas, oracle: false }, sortie, { proprietes, attendu: true, ok: !!fauteSur(sortie, mot), mot, reference,
      detail: `le détecteur ne retient pas ${mot} près de ${reference}`, ...extra });
  }
  const question = fauteSur(sortie, mot);
  const ref = question?.type === 'ecriture-du-terme' ? question.reference?.mot : undefined;
  const ok = !!question && (ref === reference || (ref !== undefined && proches.includes(ref)));
  const referenceRenommee = !ok && !!renommeLeMot(sortie, reference);
  const detail = ok ? `question faute ${mot} -> ${ref}`
    : (!question ? `aucune question faute pour ${mot}` : `question faute pour ${mot} avec la référence ${ref ?? '-'}, attendu ${reference}`)
      + (referenceRenommee ? ` (le kit renomme lui-même ${reference})` : '');
  return verdict(cas, sortie, { proprietes, attendu: true, ok, mot, reference, detail, cle: ok ? question!.cle : undefined,
    ecarts: ok ? [] : ecartsDeFaute(sortie.noms, mot, reference, proprietes), ...extra });
}

const horsPlacePartagee = (sortie: Sortie, mot: string, reference: string) => !partagentUnePlace(sortie.noms, mot, reference);

function s1ou2(cas: Scenario, sortie: Sortie, ctx: ContexteOracle): Verdict[] {
  const attendu = cas.attendus[0];
  const proprietes = [attendu.propriete];
  if (cas.strate === 'S2') proprietes.push('P-02');
  if (horsPlacePartagee(sortie, attendu.mot!, attendu.reference!)) proprietes.push('P-03');
  return [jugerUneFaute(cas, sortie, ctx, attendu.mot!, attendu.reference!, proprietes)];
}

/** M-06 (S3) : mesuré, jamais jugé (Q-F9). */
function s3(cas: Scenario, sortie: Sortie, ctx: ContexteOracle): Verdict[] {
  const attendu = cas.attendus[0];
  return [jugerUneFaute({ ...cas, oracle: false }, sortie, ctx, attendu.mot!, attendu.reference!, ['P-01'])];
}

// ---------------------------------------------------------------------------------------------------------------- S4

function s4(cas: Scenario, sortie: Sortie): Verdict[] {
  const { mot, reference } = cas.attendus[0];
  const m = compter(sortie.noms, mot!), k = compter(sortie.noms, reference!);
  const question = questionSur(sortie, mot!, reference!);
  let ok = !!question, detail = ok ? `question ${question!.type === 'paire' ? 'paire' : 'faute'} sur ${mot} et ${reference}` : `aucune question sur ${mot} et ${reference}`;
  if (question?.type === 'ecriture-du-terme' && question.indice === 'faute' && m !== k) {
    const rare = m < k ? mot! : reference!;
    if (question.terme.mot.toLowerCase() !== rare) { ok = false; detail = `la question va du fréquent ${question.terme.mot} vers le rare, attendu depuis ${rare}`; }
  }
  return [verdict(cas, sortie, { proprietes: ['P-06'], attendu: true, ok, mot, reference, detail, cle: ok ? question!.cle : undefined, ecarts: ok ? [] : ['E-06'] })];
}

// ---------------------------------------------------------------------------------------------------------------- S5, S6

function s5(cas: Scenario, sortie: Sortie): Verdict[] {
  const { mot, reference } = cas.attendus[0];
  const morceaux = mot!.split('-').filter((morceau) => !['thin', 'strong', '2'].includes(morceau));
  const nom = sortie.noms.findIndex((n) => contient(n.nom, mot!));
  const renomme = nom >= 0 && sortie.renommages.some((renommage) => renommage.id === `variable:${nom}` && renommage.nouveauNom !== renommage.ancienNom);
  const question = questionAutour(sortie, [mot!, ...morceaux]);
  const ok = renomme || !!question;
  return [verdict(cas, sortie, { proprietes: ['P-12'], attendu: true, ok, mot, reference,
    detail: renomme ? 'renommage' : question ? `question ${question.cle}` : `ni renommage ni question pour ${mot}`, cle: question?.cle, ecarts: ok ? [] : ['E-09'] })];
}

const ANALYSE_S6 = /^(table|abreviation|dictionnaire|valide|tolere:[^:]+):(.+)\|(.+)$/;

function groupeDeLaTable(a: string, b: string): readonly string[] | undefined {
  return (SYNONYMES_COURANTS as readonly (readonly string[])[]).find((groupe) => groupe.includes(a) && groupe.includes(b));
}

function choixOffert(sortie: Sortie, a: string, b: string): { ok: boolean; detail: string; cle?: string; collision?: true } {
  const question = questionSur(sortie, a, b);
  if (question) return { ok: true, detail: `question ${question.cle}`, cle: question.cle };
  const renomme = renommeLeMot(sortie, a, b) ?? renommeLeMot(sortie, b, a) ?? renommeLeMot(sortie, a) ?? renommeLeMot(sortie, b);
  if (renomme) return { ok: true, detail: `renommage ${renomme.ancienNom} -> ${renomme.nouveauNom}` };
  return sortie.collisions.length
    ? { ok: false, detail: `renommage retiré pour collision, aucune question sur ${a} et ${b}`, collision: true }
    : { ok: false, detail: `ni renommage ni question sur ${a} et ${b}` };
}

function s6(cas: Scenario, sortie: Sortie, ctx: ContexteOracle): Verdict[] {
  const analyse = ANALYSE_S6.exec(cas.terme);
  if (!analyse) throw new Error(`S6 : terme illisible ${cas.terme}`);
  const [, source, a, b] = analyse;
  const parente = String(cas.axes.parente);
  const seul = cas.axes.seul as 'a' | 'b' | undefined;
  const unique = (): Verdict[] => [];
  if (source.startsWith('tolere')) {
    // a est la forme tolérée, b le terme UCM
    if (parente === 'isoles') {
      if (seul !== 'a') return unique();
      const renomme = renommeLeMot(sortie, a, b);
      return [verdict(cas, sortie, { proprietes: ['P-10'], attendu: true, ok: !!renomme, mot: a, reference: b,
        detail: renomme ? `renommage ${renomme.ancienNom} -> ${renomme.nouveauNom}` : `aucun renommage de ${a} vers ${b}`, ecarts: [] })];
    }
    if (parente === 'freres') {
      const question = questionSur(sortie, a, b);
      const renomme = renommeLeMot(sortie, a, b);
      const ok = !!question || (!!renomme && sortie.collisions.length === 0);
      return [verdict(cas, sortie, { proprietes: ['P-11', 'P-10'], attendu: true, ok, mot: a, reference: b, cle: question?.cle,
        detail: question ? `question ${question.cle}` : renomme && sortie.collisions.length === 0 ? 'renommage sans collision' : `collision sans question sur ${a} et ${b}`, ecarts: ['E-08'] })];
    }
    const choix = choixOffert(sortie, a, b);
    return [verdict(cas, sortie, { proprietes: ['P-10'], attendu: true, ok: choix.ok, mot: a, reference: b, detail: choix.detail, cle: choix.cle, ecarts: [] })];
  }
  if (source === 'abreviation') {
    const choix = choixOffert(sortie, a, b);
    return [verdict(cas, sortie, { proprietes: ['P-14'], attendu: true, ok: choix.ok, mot: a, reference: b, detail: choix.detail, cle: choix.cle,
      role: parente === 'isoles' ? 'informatif' : undefined, ecarts: choix.collision ? ['E-08'] : [] })];
  }
  const groupeValide = ctx.classements.groupes.find((groupe) => groupe.includes(a) && groupe.includes(b));
  if (source === 'dictionnaire' && !groupeValide) {
    // synonymes.json : aucune des 40 paires candidates n'est un synonyme, donc aucune question n'est attendue
    if (parente === 'isoles') return unique();
    const question = questionSur(sortie, a, b);
    return [verdict(cas, sortie, { proprietes: ['P-14'], attendu: false, ok: !question, mot: a, reference: b,
      detail: question ? `question ${question.cle} sur deux mots que le classement écarte` : 'aucune question', ecarts: [] })];
  }
  if (parente === 'isoles') {
    // Q-F5 : un synonyme listé seul, dont le terme UCM du groupe est unique, donne une question ou un renommage
    const groupe = groupeValide ?? groupeDeLaTable(a, b) ?? [a, b];
    const ucm = groupe.filter((mot) => ctx.termesUcm.has(mot));
    const mot = seul === 'a' ? a : b;
    if (ucm.length !== 1 || ucm[0] === mot) return unique();
    const renomme = renommeLeMot(sortie, mot, ucm[0]) ?? renommeLeMot(sortie, mot);
    const question = questionAutour(sortie, [mot]);
    return [verdict(cas, sortie, { proprietes: ['P-14'], attendu: true, ok: !!renomme || !!question, mot, reference: ucm[0], provisoire: 'Q-F5',
      detail: renomme ? `renommage ${renomme.ancienNom} -> ${renomme.nouveauNom}` : question ? `question ${question.cle}` : `${mot} seul ne donne ni renommage ni question`,
      cle: question?.cle, ecarts: ['E-11'] })];
  }
  const choix = choixOffert(sortie, a, b);
  return [verdict(cas, sortie, { proprietes: ['P-14'], attendu: true, ok: choix.ok, mot: a, reference: b, detail: choix.detail, cle: choix.cle,
    role: parente === 'collections' ? 'informatif' : undefined, ecarts: [choix.collision ? 'E-08' : source === 'valide' ? 'E-11' : 'nouveau'] })];
}

// ---------------------------------------------------------------------------------------------------------------- S7

/** E-12 ne décrit que les paires `x` / `x+s`, `x+ed`… : une autre question sur deux mots distincts est un écart nouveau. */
const ecartDUneFormeFausse = (question: Question | undefined): string =>
  question?.type === 'paire' && (question.indice === 'pluriel' || question.indice === 'terminaison') ? 'E-12' : 'nouveau';

/** Une question sur les deux mots, ou un renommage qui ramène l'un à l'autre : les deux disent au designer qu'il y a un choix. */
function traitementDeLaPaire(sortie: Sortie, a: string, b: string): { trouve: boolean; cle?: string; detail: string } {
  const question = questionSur(sortie, a, b);
  if (question) return { trouve: true, cle: question.cle, detail: `question ${question.cle}` };
  const renomme = renommeLeMot(sortie, a, b) ?? renommeLeMot(sortie, b, a);
  if (renomme) return { trouve: true, detail: `renommage ${renomme.ancienNom} -> ${renomme.nouveauNom}` };
  return { trouve: false, detail: 'ni question ni renommage' };
}

function s7(cas: Scenario, sortie: Sortie, ctx: ContexteOracle): Verdict[] {
  const { propriete, mot, reference } = cas.attendus[0];
  const type = String(cas.axes.type);
  const informatif = type === 'mixte';
  if (propriete === 'P-13' && cas.terme.includes(':') && !cas.terme.startsWith('dictionnaire:')) {
    const renomme = renommeLeMot(sortie, mot!);
    const question = questionAutour(sortie, [mot!]);
    return [verdict(cas, sortie, { proprietes: ['P-13'], attendu: true, ok: !!renomme || !!question, mot, reference,
      role: informatif ? 'informatif' : undefined, cle: question?.cle,
      detail: renomme ? `renommage ${renomme.ancienNom} -> ${renomme.nouveauNom}` : question ? `question ${question.cle}` : `ni renommage ni question pour ${mot}`, ecarts: ['E-10'] })];
  }
  const cle = clePaire(mot!, reference!);
  const traitement = traitementDeLaPaire(sortie, mot!, reference!);
  const question = questionSur(sortie, mot!, reference!);
  const paire = (extra: Partial<Option>): Verdict => verdict(cas, sortie, { proprietes: ['P-15'], mot, reference, ...extra } as Option);
  if (ctx.classements.memeMot.has(cle)) {
    return [paire({ attendu: true, ok: traitement.trouve, role: informatif ? 'informatif' : undefined, cle: traitement.cle,
      detail: traitement.trouve ? traitement.detail : `ni question ni renommage pour les formes d'un même mot ${mot} et ${reference}`, ecarts: ['nouveau'] })];
  }
  if (ctx.classements.motsDistincts.has(cle)) {
    return [paire({ attendu: false, ok: !traitement.trouve, role: informatif ? 'informatif' : undefined,
      detail: traitement.trouve ? `${traitement.detail} sur deux mots distincts` : 'aucune question', ecarts: [ecartDUneFormeFausse(question)] })];
  }
  return [paire({ attendu: traitement.trouve, ok: true, role: 'informatif', detail: traitement.trouve ? `${traitement.detail}, paire non classée` : 'aucune question, paire non classée' })];
}

// ---------------------------------------------------------------------------------------------------------------- S8, S9

function fauteDeS8(cas: Scenario, ctx: ContexteOracle): string | undefined {
  return OPERATEURS_DE_FAUTE.flatMap((operateur) => mutationsDe(cas.terme, operateur, { graine: ctx.scenarios.graine, ecarte: ctx.scenarios.ecarte }))[0]?.mot;
}

function s8(cas: Scenario, sortie: Sortie, ctx: ContexteOracle): Verdict[] {
  const { mot: ecrit, reference } = cas.attendus[0];
  if (cas.axes.nature === 'fautif') {
    const faute = fauteDeS8(cas, ctx);
    if (!faute) return [];
    return [jugerUneFaute(cas, sortie, ctx, faute, reference!, ['P-17'], { ecarts: ecartsDeFaute(sortie.noms, faute, reference!, ['P-17']) })];
  }
  const mots = new Set([reference!, ecrit!.toLowerCase()]);
  const faute = sortie.questions.find((question) => question.type === 'ecriture-du-terme' && question.indice === 'faute' && (mots.has(question.terme.mot.toLowerCase()) || (question.reference && mots.has(question.reference.mot))));
  return [verdict(cas, sortie, { proprietes: ['P-17'], attendu: false, ok: !faute, mot: ecrit, reference,
    detail: faute ? `question faute ${faute.cle} sur un mot correct` : 'aucune question faute', ecarts: ['E-17'] })];
}

function s9(cas: Scenario, sortie: Sortie, ctx: ContexteOracle): Verdict[] {
  const { propriete, mot, reference } = cas.attendus[0];
  if (propriete === 'P-16') return [jugerUnSoude(cas, sortie, mot!, reference!)];
  const morceaux = new Set([...reference!.split('-'), reference!.replace(/-/g, '')]);
  const faute = sortie.questions.find((question) => question.type === 'ecriture-du-terme' && question.indice === 'faute'
    && ([...motsEnJeu(question)].some((enJeu) => morceaux.has(enJeu))));
  void ctx;
  return [verdict(cas, sortie, { proprietes: ['P-17'], attendu: false, ok: !faute, mot, reference,
    detail: faute ? `question faute ${faute.cle} sur un terme correct` : 'aucune question faute', ecarts: ['E-17'] })];
}

// ---------------------------------------------------------------------------------------------------------------- S10

/** P-16 : une question mots collés sur le segment soudé, ou un renommage qui le sépare, ou une question faute sur l'une de ses parties. */
function jugerUnSoude(cas: Scenario, sortie: Sortie, soude: string, reference: string, extra: Partial<Option> = {}): Verdict {
  const question = motsColles(sortie, soude);
  const renomme = variables(sortie).find((renommage) => contient(renommage.ancienNom, soude) && !contient(renommage.nouveauNom, soude));
  const faute = questionAutour(sortie, reference.split(/[ ,-]/).filter(Boolean).concat(soude));
  const ok = !!question || !!renomme || !!faute;
  const etat = cas.axes.parties ? ` (parties ${cas.axes.parties}, ${cas.axes.frequence} nom)` : '';
  return verdict(cas, sortie, { proprietes: ['P-16'], attendu: true, ok, mot: soude, reference, cle: question?.cle ?? faute?.cle,
    detail: (question ? `question mots collés ${question.cle}` : renomme ? `renommage ${renomme.ancienNom} -> ${renomme.nouveauNom}` : faute ? `question ${faute.cle}` : `${soude} ne donne ni question ni renommage`) + etat,
    ecarts: ['nouveau'], ...extra });
}

function s10(cas: Scenario, sortie: Sortie): Verdict[] {
  const { mot, reference } = cas.attendus[0];
  return [jugerUnSoude(cas, sortie, mot!, reference!)];
}

// ---------------------------------------------------------------------------------------------------------------- S11

/** Ce que le plan attend d'une paire de mots : une question, le silence, ou rien que l'on sache dire. */
export function attenduPourLaPaire(a: string, b: string, ctx: ContexteOracle): 'question' | 'aucune' | 'inconnu' {
  const cle = clePaire(a, b);
  if (cle === 'label|lable') return 'question';
  if (ctx.classements.memeMot.has(cle)) return 'question';
  if (ctx.classements.motsDistincts.has(cle)) return 'aucune';
  return 'inconnu';
}

function s11(cas: Scenario, sortie: Sortie, ctx: ContexteOracle): Verdict[] {
  const { mot: b, reference: a, note } = cas.attendus[0];
  const branches = Number(cas.axes.branches), entrees = Number(cas.axes.entrees), part = Number(cas.axes.communs);
  const question = questionSur(sortie, a!, b!);
  const parametres = `${branches} branches, ${entrees} entrées, ${part} % communs`;
  if (note?.startsWith('question')) {
    const ecart = branches > 12 ? ['E-45'] : ['nouveau'];
    // la disposition du lot 2 met les deux mots sous un même parent : ce sont des frères pour le kit, jamais des branches
    const dispositionDuLot2 = cas.axes.disposition !== 'kit';
    return [verdict(cas, sortie, { proprietes: ['P-18'], attendu: true, ok: !!question, mot: b, reference: a, cle: question?.cle, role: dispositionDuLot2 ? 'informatif' : undefined,
      detail: `${question ? `question ${question.cle}` : `aucune question sur ${a} et ${b}`} (${parametres}${dispositionDuLot2 ? ', disposition du lot 2' : ''})`, ecarts: ecart })];
  }
  const nature = String(cas.axes.nature);
  if (nature === 'distincts') {
    const attendu = attenduPourLaPaire(a!, b!, ctx);
    if (attendu === 'question') {
      return [verdict(cas, sortie, { proprietes: ['P-18'], attendu: true, ok: !!question, mot: b, reference: a, cle: question?.cle,
        detail: `${question ? `question ${question.cle}` : `aucune question sur ${a} et ${b}`}, paire que le classement tient pour une forme du même mot (${parametres})`, ecarts: ['nouveau'] })];
    }
  }
  return [verdict(cas, sortie, { proprietes: ['P-18'], attendu: false, ok: !question, mot: b, reference: a,
    detail: `${question ? `question ${question.cle} sur deux frères légitimes` : 'aucune question'} (${parametres})`, ecarts: ['nouveau'] })];
}

// ---------------------------------------------------------------------------------------------------------------- S12

function s12(cas: Scenario, sortie: Sortie): Verdict[] {
  const { mot: ecrite } = cas.attendus[0];
  const ecriture = String(cas.axes.ecriture);
  const collection = cas.terme;
  const question = sortie.questions.find((q) => q.type === 'collection' && q.nom === ecrite);
  const renomme = sortie.renommages.find((renommage) => renommage.categorie === 'collections' && renommage.ancienNom === ecrite);
  const cible = (nom: string) => nom[0].toUpperCase() + nom.slice(1);
  const connue = (COLLECTIONS as readonly string[]).includes(collection);
  if (ecriture === 'inconnue') {
    return [verdict(cas, sortie, { proprietes: ['P-19'], attendu: true, ok: !!question, mot: ecrite, cle: question?.cle,
      detail: question ? `question ${question.cle}` : `aucune question pour la collection ${ecrite}`, ecarts: ['nouveau'] })];
  }
  if (ecriture.startsWith('ancienne-')) {
    const nouvelle = FORMES_ANCIENNES_DES_COLLECTIONS[collection];
    return [verdict(cas, sortie, { proprietes: ['P-19'], attendu: true, ok: !!renomme, mot: ecrite, reference: nouvelle,
      detail: renomme ? `renommage ${renomme.ancienNom} -> ${renomme.nouveauNom}` : `aucun renommage de ${ecrite}`, ecarts: ['nouveau'] })];
  }
  if (!connue) return [];
  if (ecriture.startsWith('casse-')) {
    if (ecrite === cible(collection)) return [];
    return [verdict(cas, sortie, { proprietes: ['P-19'], attendu: true, ok: !!renomme, mot: ecrite, reference: cible(collection),
      detail: renomme ? `renommage ${renomme.ancienNom} -> ${renomme.nouveauNom}` : `aucun renommage de ${ecrite}`, ecarts: ['nouveau'] })];
  }
  if (ecriture.startsWith('separateur-')) {
    return [verdict(cas, sortie, { proprietes: ['P-19'], attendu: true, ok: !!question || !!renomme, mot: ecrite, cle: question?.cle,
      detail: question ? `question ${question.cle}` : renomme ? `renommage ${renomme.ancienNom} -> ${renomme.nouveauNom}` : `ni question ni renommage pour ${ecrite}`, ecarts: ['nouveau'] })];
  }
  // pluriel et fautes : une lettre de la collection UCM, la question propose cette collection (Q-F8)
  const propose = question?.type === 'collection' ? question.proposee : undefined;
  return [verdict(cas, sortie, { proprietes: ['P-19'], attendu: true, ok: !!question && propose === collection, mot: ecrite, reference: collection, provisoire: 'Q-F8',
    cle: question?.cle, detail: !question ? `aucune question pour la collection ${ecrite}` : propose ? `question ${question.cle} propose ${propose}` : `question ${question.cle} sans collection proposée`, ecarts: ['E-15'] })];
}

// ---------------------------------------------------------------------------------------------------------------- S13

/** Une collision est désignée quand une question met en jeu un mot qui distingue les noms en collision. */
function motsDeLaCollision(sortie: Sortie, collision: Collision): string[] {
  const noms = collision.ids.map((id) => sortie.nomsParId.get(id) ?? '');
  const mots = new Set<string>();
  for (const nom of noms) for (const segment of nom.split('/')) for (const mot of segment.toLowerCase().split(/[-_ ]/)) if (mot) mots.add(mot);
  return [...mots];
}

export function collisionsSansQuestion(sortie: Sortie): Collision[] {
  return sortie.collisions.filter((collision) => {
    const mots = motsDeLaCollision(sortie, collision);
    return !sortie.questions.some((question) => [...motsEnJeu(question)].some((mot) => mots.includes(mot)));
  });
}

function s13(cas: Scenario, sortie: Sortie, ctx: ContexteOracle): Verdict[] {
  const premiere = cas.attendus[0];
  if (premiere.mot !== undefined) {
    const { mot: forme, reference: terme } = premiere;
    const position = String(cas.axes.terme);
    if (position !== 'meme-dossier') {
      const choix = choixOffert(sortie, forme!, terme!);
      const renomme = renommeLeMot(sortie, forme!, terme!);
      return [verdict(cas, sortie, { proprietes: ['P-10'], attendu: true, ok: !!renomme || choix.ok, mot: forme, reference: terme, cle: choix.cle,
        detail: renomme ? `renommage ${renomme.ancienNom} -> ${renomme.nouveauNom}` : choix.detail, ecarts: ['nouveau'] })];
    }
    const question = questionSur(sortie, forme!, terme!);
    const renomme = renommeLeMot(sortie, forme!, terme!);
    const sans = collisionsSansQuestion(sortie);
    const ok = (!!question || (!!renomme && sortie.collisions.length === 0)) && sans.length === 0;
    return [verdict(cas, sortie, { proprietes: sortie.collisions.length ? ['P-11', 'P-20'] : ['P-11'], attendu: true, ok, mot: forme, reference: terme, cle: question?.cle,
      detail: question ? `question ${question.cle}` : renomme && sortie.collisions.length === 0 ? 'renommage sans collision' : `${sortie.collisions.length} collision, ${sans.length} sans question`, ecarts: ['E-08'] })];
  }
  const nature = cas.terme;
  const sans = collisionsSansQuestion(sortie);
  if (sortie.collisions.length === 0) return [];
  const duVocabulaire = nature === 'terme-du-fichier' || nature === 'destination-commune';
  return [verdict(cas, sortie, { proprietes: ['P-20'], attendu: true, ok: sans.length === 0, role: duVocabulaire ? undefined : 'informatif',
    detail: `${sortie.collisions.length} collision, ${sans.length} sans question (${nature})`, ecarts: duVocabulaire ? ['E-08'] : ['nouveau'] })];
}

// ---------------------------------------------------------------------------------------------------------------- S14, S15, S17

function s14(cas: Scenario, sortie: Sortie, ctx: ContexteOracle): Verdict[] {
  const { mot, reference } = cas.attendus[0];
  if (cas.axes.pluriel !== undefined) {
    // le mot est à deux lettres du terme : Q-F9 le laisse hors oracle
    return [jugerUneFaute({ ...cas, oracle: false }, sortie, ctx, mot!, reference!, ['P-01'])];
  }
  const proprietes = ['P-01'];
  if (horsPlacePartagee(sortie, mot!, reference!)) proprietes.push('P-03');
  return [jugerUneFaute(cas, sortie, ctx, mot!, reference!, proprietes)];
}

function s15(cas: Scenario, sortie: Sortie, ctx: ContexteOracle): Verdict[] {
  const { mot: b, reference: a } = cas.attendus[0];
  const attendu = attenduPourLaPaire(a!, b!, ctx);
  const traitement = traitementDeLaPaire(sortie, a!, b!);
  const question = questionSur(sortie, a!, b!);
  if (attendu === 'question') {
    return [verdict(cas, sortie, { proprietes: ['P-15'], attendu: true, ok: traitement.trouve, mot: b, reference: a, cle: traitement.cle,
      detail: traitement.trouve ? traitement.detail : `ni question ni renommage sur ${a} et ${b}`, ecarts: ['nouveau'] })];
  }
  if (attendu === 'aucune') {
    return [verdict(cas, sortie, { proprietes: ['P-09'], attendu: false, ok: !traitement.trouve, mot: b, reference: a,
      detail: traitement.trouve ? `${traitement.detail} sur deux mots distincts` : 'aucune question', ecarts: [ecartDUneFormeFausse(question)] })];
  }
  return [verdict({ ...cas, oracle: false }, sortie, { proprietes: ['P-09'], attendu: traitement.trouve, ok: true, mot: b, reference: a,
    detail: traitement.trouve ? `${traitement.detail}, paire non classée` : 'aucune question, paire non classée' })];
}

function s17(cas: Scenario, sortie: Sortie): Verdict[] {
  const { mot, reference } = cas.attendus[0];
  const candidats = reference!.split(',');
  const question = fauteSur(sortie, mot!);
  const proposes = question?.type === 'ecriture-du-terme' ? new Set([...question.proposition, ...(question.reference ? [question.reference.mot] : [])]) : new Set<string>();
  const ok = !!question && candidats.every((candidat) => proposes.has(candidat));
  return [verdict(cas, sortie, { proprietes: ['P-05'], attendu: true, ok, mot, reference, cle: ok ? question!.cle : undefined,
    detail: !question ? `aucune question faute pour ${mot}` : ok ? `question ${question.cle} liste ${candidats.join(', ')}` : `la question liste ${[...proposes].join(', ')}, attendu ${candidats.join(', ')}`, ecarts: ['E-06'] })];
}

// ---------------------------------------------------------------------------------------------------------------- entrée

const JUGES: Readonly<Record<string, (cas: Scenario, sortie: Sortie, ctx: ContexteOracle) => Verdict[]>> = {
  S1: s1ou2, S2: s1ou2, S3: s3, S4: (cas, sortie) => s4(cas, sortie), S5: (cas, sortie) => s5(cas, sortie), S6: s6, S7: s7, S8: s8, S9: s9,
  S10: (cas, sortie) => s10(cas, sortie), S11: s11, S12: (cas, sortie) => s12(cas, sortie), S13: s13, S14: s14, S15: s15, S17: (cas, sortie) => s17(cas, sortie),
};

/** Les verdicts d'un cas synthétique (toutes les strates sauf S16, jugée site par site par `execution.ts`). */
export function juger(cas: Scenario, sortie: Sortie, ctx: ContexteOracle): Verdict[] {
  const juge = JUGES[cas.strate];
  if (!juge) throw new Error(`Aucun juge pour la strate ${cas.strate}.`);
  return juge(cas, sortie, ctx);
}

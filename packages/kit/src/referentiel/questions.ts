/** Questions de nomenclature fondées sur les noms et les alias du lexique. */
import { COLLECTIONS, REGISTRES_ARCHITECTURE } from './architecture.js';
import { categorieDuSegment } from './ecriture-des-mots.js';
import type { DejaJuge, IndexDuVocabulaire, Lexique, Mots, NomLu, Question, ResultatDesQuestions, TermeEnQuestion, IndiceDePaire } from './harmonisation.js';
import { collectionUcmReconnue } from './normalisation.js';
import { ABREVIATIONS, ECHELLES_DE_TAILLES, REGISTRES, SYNONYMES_COURANTS } from './vocabulaire.js';

const TAILLE_D_UN_LOT = 200;
const comparer = (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0;
const lettres = /\p{L}/u;
const termesUcm = new Set([...REGISTRES, ...REGISTRES_ARCHITECTURE]
  .flatMap((registre) => registre.termes.map((terme) => terme.id.toLowerCase())));
const synonymesComposes = new Set<string>(SYNONYMES_COURANTS.flatMap((groupe) => groupe.filter((mot) => mot.includes('-'))));

type MotObserve = { readonly mot: string; readonly noms: Set<string>; readonly lieux: Map<string, string | null>; readonly exemples: string[] };
type PaireCandidate = { readonly mots: readonly [string, string]; readonly indices: Set<IndiceDePaire>; cibleAlias?: string };

function clePaire(a: string, b: string): string {
  return `paire:${[a, b].sort(comparer).join('|')}`;
}

function motJuge(mot: string): string {
  return mot.trim().toLowerCase().replace(/\s+/gu, '-');
}

type CacheDeContextes = Map<string, Map<number, { avant: Map<string, string>; apres: Map<string, string> }>>;

function contexte(nom: NomLu, segments: readonly string[], rang: number, cache: CacheDeContextes): string[] {
  const parPortee = cache.get(nom.portee) ?? new Map<number, { avant: Map<string, string>; apres: Map<string, string> }>();
  cache.set(nom.portee, parPortee);
  const parRang = parPortee.get(rang) ?? { avant: new Map<string, string>(), apres: new Map<string, string>() };
  parPortee.set(rang, parRang);
  const resultat: string[] = [];
  if (rang > 0) {
    const voisin = segments[rang - 1].toLowerCase();
    let cle = parRang.avant.get(voisin);
    if (!cle) { cle = JSON.stringify([nom.portee, String(rang), 'avant', voisin]); parRang.avant.set(voisin, cle); }
    resultat.push(cle);
  }
  if (rang + 1 < segments.length) {
    const voisin = segments[rang + 1].toLowerCase();
    let cle = parRang.apres.get(voisin);
    if (!cle) { cle = JSON.stringify([nom.portee, String(rang), 'apres', voisin]); parRang.apres.set(voisin, cle); }
    resultat.push(cle);
  }
  return resultat;
}

function* partagentUnePlace(a: MotObserve, b: MotObserve): Generator<void, boolean> {
  const petit = a.lieux.size <= b.lieux.size ? a.lieux : b.lieux;
  const grand = petit === a.lieux ? b.lieux : a.lieux;
  let lus = 0;
  for (const [cle, noms] of petit) {
    if (grand.has(cle) && nomsDistincts(noms, grand.get(cle)!)) return true;
    if (++lus % TAILLE_D_UN_LOT === 0) yield;
  }
  return false;
}

function nomsDistincts(a: string | null, b: string | null): boolean {
  return a === null || b === null || a !== b;
}

function terme(observe: MotObserve): TermeEnQuestion {
  return { mot: observe.mot, nombre: observe.noms.size, exemples: observe.exemples, ucm: termesUcm.has(observe.mot) };
}

function suppressions(mot: string): Set<string> {
  const cles = new Set<string>();
  let debut = 0;
  for (const lettre of mot) {
    const fin = debut + lettre.length;
    cles.add(mot.slice(0, debut) + mot.slice(fin));
    debut = fin;
  }
  return cles;
}

function distanceUn(a: string, b: string): boolean {
  const x = [...a], y = [...b];
  if (Math.abs(x.length - y.length) > 1 || a === b) return false;
  let i = 0, j = 0, ecarts = 0;
  while (i < x.length && j < y.length) {
    if (x[i] === y[j]) { i++; j++; continue; }
    if (++ecarts > 1) return false;
    if (x.length >= y.length) i++;
    if (y.length >= x.length) j++;
  }
  return ecarts + Number(i < x.length || j < y.length) === 1;
}

function* decoupageAtteste(mot: string, source: MotObserve, connus: ReadonlyMap<string, MotObserve>): Generator<void, Mots | undefined> {
  const solutions = new Map<number, string[] | null>();
  const admis = new Map<string, boolean>();
  let scans = 0;
  function* memePlace(partie: string): Generator<void, boolean> {
    if (admis.has(partie)) return admis.get(partie)!;
    const candidat = connus.get(partie);
    const valable = !!candidat && (yield* partagentUnePlace(source, candidat));
    admis.set(partie, valable);
    return valable;
  }
  function* depuis(debut: number): Generator<void, string[] | null> {
    if (debut === mot.length) return [];
    if (solutions.has(debut)) return solutions.get(debut)!;
    for (let fin = debut + 1; fin < mot.length; fin++) {
      const partie = mot.slice(debut, fin);
      if (++scans % TAILLE_D_UN_LOT === 0) yield;
      if (!(yield* memePlace(partie))) continue;
      const suite = yield* depuis(fin);
      if (suite) { const trouve = [partie, ...suite]; solutions.set(debut, trouve); return trouve; }
    }
    if (debut > 0 && (yield* memePlace(mot.slice(debut)))) return [mot.slice(debut)];
    solutions.set(debut, null);
    return null;
  }
  const morceaux = yield* depuis(0);
  return morceaux && morceaux.length > 1 ? morceaux : undefined;
}

function* scoreDesNoms(a: MotObserve, b?: MotObserve, indices = 1): Generator<void, number> {
  let nombre = a.noms.size, lus = 0;
  for (const id of b?.noms ?? []) {
    if (!a.noms.has(id)) nombre++;
    if (++lus % TAILLE_D_UN_LOT === 0) yield;
  }
  return nombre + Math.max(0, indices - 1) * 2;
}

function* trierQuestions(questions: Question[]): Generator<void, Question[]> {
  let source = questions;
  let cible = new Array<Question>(questions.length);
  let operations = 0;
  const compare = (a: Question, b: Question): number => b.score - a.score || comparer(a.cle, b.cle);
  for (let largeur = 1; largeur < questions.length; largeur *= 2) {
    for (let debut = 0; debut < questions.length; debut += largeur * 2) {
      const milieu = Math.min(debut + largeur, questions.length);
      const fin = Math.min(debut + largeur * 2, questions.length);
      let gauche = debut, droite = milieu;
      for (let rang = debut; rang < fin; rang++) {
        cible[rang] = droite >= fin || (gauche < milieu && compare(source[gauche], source[droite]) <= 0)
          ? source[gauche++] : source[droite++];
        if (++operations % TAILLE_D_UN_LOT === 0) yield;
      }
    }
    [source, cible] = [cible, source];
  }
  return source;
}

/** Détecte par tranches de deux cents noms et borne aussi les comparaisons internes. */
export function* detecterParEtapes(lexique: Lexique, index: IndexDuVocabulaire, dejaJuge: DejaJuge,
  options: { readonly seuil?: number; readonly maximum?: number } = {}): Generator<void, ResultatDesQuestions> {
  const observes = new Map<string, MotObserve>();
  const voisins = new Set<string>();
  const alias = new Map<string, Map<string, string | null>>();
  const collections: NomLu[] = [];
  const segmentsSoudes = new Set<string>();
  const cacheRemplacements = new Map<string, readonly { debut: number; fin: number }[]>();
  const cacheContextes: CacheDeContextes = new Map();
  let operations = 0;
  for (const nom of lexique.noms.values()) {
    if (nom.categorie === 'collections') { collections.push(nom); if (++operations % TAILLE_D_UN_LOT === 0) yield; continue; }
    const segments = nom.nom.split('/');
    for (const [rang, segment] of segments.entries()) {
      const mots = lexique.mots.get(segment) ?? [];
      const categorie = categorieDuSegment(nom, rang);
      const cleCache = JSON.stringify([segment, categorie]);
      let remplacements = cacheRemplacements.get(cleCache);
      if (!remplacements) {
        remplacements = index.remplacements(mots, categorie);
        cacheRemplacements.set(cleCache, remplacements);
      }
      const positionsCouvertes = new Set<number>();
      for (const remplacement of remplacements) for (let i = remplacement.debut; i < remplacement.fin; i++) {
        positionsCouvertes.add(i);
        if (++operations % TAILLE_D_UN_LOT === 0) yield;
      }
      if (mots.length === 1 && segment.toLowerCase() === mots[0].toLowerCase() && positionsCouvertes.size === 0) segmentsSoudes.add(mots[0].toLowerCase());
      let places: string[] | undefined;
      function observer(mot: string): void {
        const entree = observes.get(mot) ?? { mot, noms: new Set<string>(), lieux: new Map<string, string | null>(), exemples: [] };
        entree.noms.add(nom.id);
        if (entree.exemples.length < 2 && !entree.exemples.includes(nom.id)) entree.exemples.push(nom.id);
        places ??= contexte(nom, segments, rang, cacheContextes);
        for (const place of places) {
          if (!entree.lieux.has(place)) entree.lieux.set(place, nom.id);
          else if (entree.lieux.get(place) !== nom.id) entree.lieux.set(place, null);
          if (nom.cibleAlias) {
            const cle = JSON.stringify([place, nom.cibleAlias]);
            const bucket = alias.get(cle) ?? new Map<string, string | null>();
            if (!bucket.has(mot)) bucket.set(mot, nom.id);
            else if (bucket.get(mot) !== nom.id) bucket.set(mot, null);
            alias.set(cle, bucket);
          }
        }
        observes.set(mot, entree);
      }
      for (let i = 0; i < mots.length; i++) {
        const mot = mots[i].toLowerCase();
        if (positionsCouvertes.has(i)) continue;
        if (!lettres.test(mot)) continue;
        observer(mot);
        if (i > 0 && lettres.test(mots[i - 1])) voisins.add(clePaire(mots[i - 1].toLowerCase(), mot));
        if (++operations % TAILLE_D_UN_LOT === 0) yield;
      }
      const compose = mots.join('-').toLowerCase();
      if (mots.length > 1 && synonymesComposes.has(compose) && positionsCouvertes.size === 0) observer(compose);
      const suivants = segments[rang + 1] && lexique.mots.get(segments[rang + 1]);
      if (mots.length && suivants?.length) voisins.add(clePaire(mots[mots.length - 1].toLowerCase(), suivants[0].toLowerCase()));
      if (++operations % TAILLE_D_UN_LOT === 0) yield;
    }
    if (++operations % TAILLE_D_UN_LOT === 0) yield;
  }
  const distincts = new Set(dejaJuge.distincts.map(([a, b]) => clePaire(motJuge(a), motJuge(b))));
  const voulus = new Set(dejaJuge.voulus.map(motJuge));
  const plusTard = new Set(dejaJuge.plusTard);
  const paires = new Map<string, PaireCandidate>();
  function* ajouterPaire(a: string, b: string, indice: IndiceDePaire, cibleAlias?: string): Generator<void> {
    if (a === b || !observes.has(a) || !observes.has(b)) return;
    const cle = clePaire(a, b);
    if (distincts.has(cle) || voulus.has(a) || voulus.has(b) || !(yield* partagentUnePlace(observes.get(a)!, observes.get(b)!))) return;
    const precedente = paires.get(cle) ?? { mots: [a, b].sort(comparer) as [string, string], indices: new Set<IndiceDePaire>() };
    precedente.indices.add(indice);
    if (cibleAlias && (!precedente.cibleAlias || comparer(cibleAlias, precedente.cibleAlias) < 0)) precedente.cibleAlias = cibleAlias;
    paires.set(cle, precedente);
  }
  const motsLibres = [...observes.keys()];
  for (const mot of motsLibres) {
    for (const fin of ['ed', 'd', 'ing']) if (mot.endsWith(fin) && mot.length > fin.length + 1) yield* ajouterPaire(mot, mot.slice(0, -fin.length), 'terminaison');
    for (const fin of ['s', 'es']) if (mot.endsWith(fin) && mot.length > fin.length + 1) yield* ajouterPaire(mot, mot.slice(0, -fin.length), 'pluriel');
    const entier = ABREVIATIONS[mot];
    if (entier) yield* ajouterPaire(mot, entier, 'abreviation');
    if (++operations % TAILLE_D_UN_LOT === 0) yield;
  }
  for (const groupe of SYNONYMES_COURANTS) for (let i = 0; i < groupe.length; i++) for (let j = i + 1; j < groupe.length; j++) {
    yield* ajouterPaire(groupe[i], groupe[j], 'synonymes');
    if (++operations % TAILLE_D_UN_LOT === 0) yield;
  }
  for (const [cle, bucket] of alias) {
    const mots = [...bucket.keys()].filter((mot) => observes.has(mot));
    const cible = (JSON.parse(cle) as string[])[1];
    for (let i = 0; i < mots.length; i++) for (let j = i + 1; j < mots.length; j++) {
      if (!voisins.has(clePaire(mots[i], mots[j])) && nomsDistincts(bucket.get(mots[i])!, bucket.get(mots[j])!))
        yield* ajouterPaire(mots[i], mots[j], 'meme-place', cible);
      if (++operations % TAILLE_D_UN_LOT === 0) yield;
    }
    if (++operations % TAILLE_D_UN_LOT === 0) yield;
  }

  const questions: Question[] = [];
  const ordreIndices: readonly IndiceDePaire[] = ['synonymes', 'abreviation', 'terminaison', 'pluriel', 'meme-place'];
  for (const [cle, candidate] of paires) {
    if (plusTard.has(cle)) continue;
    const [a, b] = candidate.mots.map((mot) => observes.get(mot)!) as [MotObserve, MotObserve];
    const propose: 0 | 1 = terme(a).ucm !== terme(b).ucm ? (terme(a).ucm ? 0 : 1)
      : a.noms.size >= b.noms.size ? 0 : 1;
    const indice = ordreIndices.find((valeur) => candidate.indices.has(valeur))!;
    questions.push({ type: 'paire', cle, indice, termes: [terme(a), terme(b)], propose,
      score: yield* scoreDesNoms(a, b, candidate.indices.size), ...(candidate.cibleAlias ? { cibleAlias: candidate.cibleAlias } : {}) });
    if (++operations % TAILLE_D_UN_LOT === 0) yield;
  }

  const indexSuppressions = new Map<string, Set<string>>();
  for (const observe of observes.values()) {
    if (++operations % TAILLE_D_UN_LOT === 0) yield;
    if (observe.noms.size < 5) continue;
    const identique = indexSuppressions.get(observe.mot) ?? new Set<string>();
    identique.add(observe.mot);
    indexSuppressions.set(observe.mot, identique);
    for (const cle of suppressions(observe.mot)) {
      const bucket = indexSuppressions.get(cle) ?? new Set<string>(); bucket.add(observe.mot); indexSuppressions.set(cle, bucket);
      if (++operations % TAILLE_D_UN_LOT === 0) yield;
    }
    if (++operations % TAILLE_D_UN_LOT === 0) yield;
  }
  for (const observe of observes.values()) {
    if (++operations % TAILLE_D_UN_LOT === 0) yield;
    if (observe.noms.size > 2 || voulus.has(observe.mot) || termesUcm.has(observe.mot)) continue;
    const candidats = new Set<string>(indexSuppressions.get(observe.mot) ?? []);
    for (const suppression of suppressions(observe.mot)) for (const candidat of indexSuppressions.get(suppression) ?? []) {
      candidats.add(candidat);
      if (++operations % TAILLE_D_UN_LOT === 0) yield;
    }
    let reference: MotObserve | undefined;
    for (const candidat of candidats) {
      const autre = observes.get(candidat)!;
      if (!distincts.has(clePaire(observe.mot, candidat)) && !voulus.has(candidat)
        && distanceUn(observe.mot, candidat) && (yield* partagentUnePlace(observe, autre))
        && (!reference || (termesUcm.has(autre.mot) && !termesUcm.has(reference.mot))
          || (termesUcm.has(autre.mot) === termesUcm.has(reference.mot)
            && (autre.noms.size > reference.noms.size || (autre.noms.size === reference.noms.size && comparer(autre.mot, reference.mot) < 0))))) reference = autre;
      if (++operations % TAILLE_D_UN_LOT === 0) yield;
    }
    if (!reference) continue;
    const cle = `ecriture-du-terme:faute:${[observe.mot, reference.mot].sort(comparer).join('|')}`;
    if (!plusTard.has(cle)) questions.push({ type: 'ecriture-du-terme', cle, indice: 'faute', terme: terme(observe),
      proposition: [reference.mot], reference: { mot: reference.mot, nombre: reference.noms.size }, score: yield* scoreDesNoms(observe, reference) });
    if (++operations % TAILLE_D_UN_LOT === 0) yield;
  }
  for (const mot of segmentsSoudes) {
    if (++operations % TAILLE_D_UN_LOT === 0) yield;
    const observe = observes.get(mot);
    if (!observe || voulus.has(mot) || termesUcm.has(mot)) continue;
    const proposition = yield* decoupageAtteste(mot, observe, observes);
    if (proposition?.some((partie) => voulus.has(partie))) continue;
    const cle = `ecriture-du-terme:mots-colles:${[mot, ...(proposition ?? [])].sort(comparer).join('|')}`;
    if (proposition && !plusTard.has(cle)) questions.push({ type: 'ecriture-du-terme', cle, indice: 'mots-colles',
      terme: terme(observe), proposition, score: observe.noms.size });
    if (++operations % TAILLE_D_UN_LOT === 0) yield;
  }

  const formes = [ECHELLES_DE_TAILLES.map(([court]) => court), ECHELLES_DE_TAILLES.map(([, long]) => long)] as const;
  const exemples: [string | null, string | null] = [null, null];
  const nomsDesFormes: [Set<string>, Set<string>] = [new Set(), new Set()];
  for (const court of formes[0]) for (const long of formes[1]) {
    const a = observes.get(court), b = observes.get(long);
    if (!a || !b || voulus.has(court) || voulus.has(long) || !(yield* partagentUnePlace(a, b)) || distincts.has(clePaire(court, long))) continue;
    for (const id of a.noms) { nomsDesFormes[0].add(id); if (++operations % TAILLE_D_UN_LOT === 0) yield; }
    for (const id of b.noms) { nomsDesFormes[1].add(id); if (++operations % TAILLE_D_UN_LOT === 0) yield; }
    exemples[0] ??= a.exemples[0] ?? null; exemples[1] ??= b.exemples[0] ?? null;
  }
  const nombres: [number, number] = [nomsDesFormes[0].size, nomsDesFormes[1].size];
  const cleEchelle = `echelle:${formes.map((forme) => forme.join(',')).sort(comparer).join('|')}`;
  let scoreEchelle = nombres[0];
  for (const id of nomsDesFormes[1]) { if (!nomsDesFormes[0].has(id)) scoreEchelle++; if (++operations % TAILLE_D_UN_LOT === 0) yield; }
  if (nombres[0] > 0 && nombres[1] > 0 && !plusTard.has(cleEchelle)) questions.push({ type: 'echelle', cle: cleEchelle,
    formes, nombres, exemples, propose: nombres[0] > nombres[1] ? 0 : 1, score: scoreEchelle });

  for (const nom of collections) {
    if (++operations % TAILLE_D_UN_LOT === 0) yield;
    const id = nom.id;
    if ((COLLECTIONS as readonly string[]).includes(nom.nom) || collectionUcmReconnue(nom.nom) || dejaJuge.collectionsGardees.includes(id)) continue;
    const cle = `collection:${id}`;
    if (plusTard.has(cle)) continue;
    const nombre = lexique.portees.get(id)?.length ?? 0;
    questions.push({ type: 'collection', cle, collectionId: id, nom: nom.nom, nombre, score: nombre });
  }
  const seuil = options.seuil ?? 2;
  const maximum = Math.max(0, options.maximum ?? 10);
  const triees = yield* trierQuestions(questions);
  const retenues: Question[] = [], autres: Question[] = [];
  for (const question of triees) {
    if (question.score >= seuil && retenues.length < maximum) retenues.push(question);
    else autres.push(question);
    if (++operations % TAILLE_D_UN_LOT === 0) yield;
  }
  return { questions: retenues, autres };
}

/** Termine la détection par étapes. */
export function detecterLesQuestions(...memes: Parameters<typeof detecterParEtapes>): ResultatDesQuestions {
  const calcul = detecterParEtapes(...memes);
  let etape = calcul.next();
  while (!etape.done) etape = calcul.next();
  return etape.value;
}

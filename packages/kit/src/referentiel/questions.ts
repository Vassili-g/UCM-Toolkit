/** Questions de nomenclature fondées sur les noms et les alias du lexique. */
import { COLLECTIONS, REGISTRES_ARCHITECTURE } from './architecture.js';
import { categorieDuSegment } from './ecriture-des-mots.js';
import type { DejaJuge, IndexDuVocabulaire, Lexique, Mots, NomLu, Question, Remplacement, ResultatDesQuestions, TermeEnQuestion, IndiceDePaire } from './harmonisation.js';
import { collectionUcmReconnue } from './normalisation.js';
import { detecterBranchesParalleles } from './branches-paralleles.js';
import { decouperPourQuestions, distanceUnOuEchange, opposes, termeConnu, termeDeComposant, termeOuFormeConnu, termesADeuxLettres, termesAUneLettre } from './termes-connus.js';
import { ABREVIATIONS, FORMES_D_UN_MEME_MOT, MOTS_DISTINCTS, REGISTRES, SYNONYMES_COURANTS } from './vocabulaire.js';

const TAILLE_D_UN_LOT = 10;
const comparer = (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0;
const lettres = /\p{L}/u;
const uniquementDesLettres = /^\p{L}+$/u;
/**
 * Un mot fautif d'une lettre (ajoutée, retirée, remplacée, ou deux voisines échangées) a au moins cette longueur, et les deux mots d'un couple
 * proche aussi : en dessous, `top` et `tip` sont deux mots. Seule la longueur protège : aucun nombre d'emplois ni aucune place ne compte (D1, D2).
 * Valeur de la mesure de E2.5 (`npm run stress:f1 -- --faux-positifs`, 64 passes, 59 484 noms justes) : la plus petite longueur sous un faux
 * positif certain pour 1 000 noms vaut 7 (20 mots, 0,34 pour 1 000 ; 6 lettres : 100 mots, 1,68).
 */
export const LONGUEUR_MINIMALE_D_UNE_FAUTE_A_UNE_LETTRE = 7;
/** Même règle pour un mot fautif de deux lettres (Q-F9) : 8 (40 mots, 0,67 pour 1 000 ; 7 lettres : 78 mots, 1,31). Jamais sous la longueur d'une lettre. */
export const LONGUEUR_MINIMALE_D_UNE_FAUTE_A_DEUX_LETTRES = 8;
const termesUcm = new Set([...REGISTRES, ...REGISTRES_ARCHITECTURE]
  .flatMap((registre) => registre.termes.map((terme) => terme.id.toLowerCase())));

/** Les termes UCM qu'une forme tolérée d'un registre remplace : `attention` vers `warning`. */
const ucmDeLaForme = new Map<string, Set<string>>();
for (const registre of [...REGISTRES, ...REGISTRES_ARCHITECTURE]) for (const terme of registre.termes) for (const tolere of terme.toleres ?? []) {
  const forme = tolere.toLowerCase();
  if (forme === terme.id.toLowerCase() || termesUcm.has(forme)) continue;
  ucmDeLaForme.set(forme, (ucmDeLaForme.get(forme) ?? new Set<string>()).add(terme.id.toLowerCase()));
}
/** Les termes UCM qu'un synonyme remplace : les membres de son groupe qui sont des termes UCM, ou la forme entière d'une abréviation. */
const ucmDuSynonyme = new Map<string, Set<string>>();
for (const groupe of [...SYNONYMES_COURANTS.map((membres) => [...membres] as string[]), ...Object.entries(ABREVIATIONS).map(([court, long]) => [court, long])]) {
  const ucm = groupe.filter((mot) => termesUcm.has(mot));
  for (const mot of groupe) if (!termesUcm.has(mot)) ucmDuSynonyme.set(mot, new Set([...ucmDuSynonyme.get(mot) ?? [], ...ucm]));
}
/** Le terme UCM d'une forme tolérée d'un registre, quand il est unique. */
function termeUcmDeLaForme(mot: string): string | undefined {
  const termes = ucmDeLaForme.get(mot);
  return termes?.size === 1 ? [...termes][0] : undefined;
}
/** Le pluriel d'un terme de registre de composant : `widths` est le pluriel de `width`, et la question de pluriel le traite (E-10). */
const pluralDeComposant = (mot: string): boolean => ['s', 'es'].some((fin) => mot.endsWith(fin) && termeDeComposant(mot.slice(0, -fin.length)));
/** Le terme UCM unique d'un synonyme, ou `undefined` quand son groupe en compte zéro ou plusieurs : alors une information sans action, que le kit ne pose pas (Q-F5). */
function termeUcmDuSynonyme(mot: string): string | undefined {
  // Une forme tolérée d'un registre suit les règles de sa catégorie : ailleurs, c'est un mot du fichier. Une abréviation (`fg`) n'est pas un synonyme : elle a sa question de paire.
  if (ucmDeLaForme.has(mot) || mot in ABREVIATIONS) return undefined;
  const termes = ucmDuSynonyme.get(mot);
  return termes?.size === 1 ? [...termes][0] : undefined;
}

type MotObserve = { readonly mot: string; readonly noms: Set<string>; readonly lieux: Map<string, string | null>; readonly exemples: string[];
  /** Variable (dernier segment d'un nom de variable) ou groupe : un pluriel ne se compare qu'à un mot du même type (décision S06). */
  readonly types: Set<'variable' | 'groupe'> };
type PaireCandidate = { readonly mots: readonly [string, string]; readonly indices: Set<IndiceDePaire> };

function clePaire(a: string, b: string): string {
  return `paire:${[a, b].sort(comparer).join('|')}`;
}

function motJuge(mot: string): string {
  return mot.trim().toLowerCase().replace(/\s+/gu, '-');
}

const distinctsDuDictionnaire = new Set(MOTS_DISTINCTS.map(([a, b]) => clePaire(a, b)));
const formesDuDictionnaire = new Set(FORMES_D_UN_MEME_MOT.map(([a, b]) => clePaire(a, b)));

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

/** Détecte les questions avec des cessions pendant les parcours et les comparaisons internes. */
export function* detecterParEtapes(lexique: Lexique, index: IndexDuVocabulaire, dejaJuge: DejaJuge,
  options: { readonly seuil?: number; readonly maximum?: number } = {}): Generator<void, ResultatDesQuestions> {
  const observes = new Map<string, MotObserve>();
  const collections: NomLu[] = [];
  const aRenommer: { readonly nom: NomLu; readonly avant: string; readonly apres: string; readonly formes: readonly { forme: string; par: string; rang: number }[] }[] = [];
  const nomsParPortee = new Map<string, Map<string, { readonly id: string; readonly avant: string }[]>>();
  const segmentsSoudes = new Set<string>();
  const cacheRemplacements = new Map<string, readonly Remplacement[]>();
  const cacheReels = new Map<string, { readonly sansFrontieres: readonly Remplacement[]; readonly reels: readonly Remplacement[] }>();
  const gardesEntiers = new Map<string, { forme: string; par: string; noms: Set<string> }>();
  const cacheContextes: CacheDeContextes = new Map();
  let operations = 0;
  for (const nom of lexique.noms.values()) {
    if (nom.categorie === 'collections') { collections.push(nom); if (++operations % TAILLE_D_UN_LOT === 0) yield; continue; }
    const segments = nom.nom.split('/');
    const natures = lexique.natures.get(nom.id);
    // Le nom tel qu'il est, et tel que les formes tolérées des registres le renommeraient : deux noms qui visent le même nom se bloquent (E-08).
    const avant: string[] = [], apres: string[] = [], formes: { forme: string; par: string; rang: number }[] = [];
    for (const [rang, segment] of segments.entries()) {
      // Un nom de composant ou de palette n'est pas un mot du vocabulaire : aucune question ne le porte.
      if (natures?.[rang]) { avant.push(segment.toLowerCase()); apres.push(segment.toLowerCase()); continue; }
      const mots = decouperPourQuestions(segment);
      const motsPlats = mots.flatMap((mot) => mot.split('-'));
      const categorie = categorieDuSegment(nom, rang);
      const cleCache = JSON.stringify([segment, categorie]);
      let remplacements = cacheRemplacements.get(cleCache);
      if (!remplacements) {
        remplacements = index.remplacements(motsPlats, categorie);
        cacheRemplacements.set(cleCache, remplacements);
      }
      const positionsCouvertes = new Set<number>();
      for (const remplacement of remplacements) for (let i = remplacement.debut; i < remplacement.fin; i++) {
        positionsCouvertes.add(i);
        if (++operations % TAILLE_D_UN_LOT === 0) yield;
      }
      // Le renommage lit les blocs gardés entiers (`status-2`) : il ne remplace que ce que `frontieres` laisse passer (lexique.ts).
      const decoupe = lexique.mots.get(segment) ?? motsPlats;
      const bas = decoupe.map((mot) => mot.toLowerCase());
      avant.push(bas.join('-'));
      let lectures = cacheReels.get(cleCache);
      if (!lectures) {
        const plages = lexique.termes.get(nom.id)?.[rang] ?? [];
        const frontieres = new Set([...plages.map(([debut]) => debut), decoupe.length]);
        const memeDecoupe = decoupe.length === motsPlats.length && decoupe.every((mot, i) => mot.toLowerCase() === motsPlats[i].toLowerCase());
        const sansFrontieres = memeDecoupe ? remplacements : index.remplacements(decoupe, categorie);
        lectures = { sansFrontieres, reels: sansFrontieres.length === 0 ? [] : index.remplacements(decoupe, categorie, frontieres) };
        cacheReels.set(cleCache, lectures);
      }
      const renomme = [...bas];
      const reelles = new Set<string>();
      for (const remplacement of [...lectures.reels].sort((a, b) => b.debut - a.debut)) {
        const par = remplacement.par.map((mot) => mot.toLowerCase());
        const forme = bas.slice(remplacement.debut, remplacement.fin).join('-');
        reelles.add(forme);
        if (remplacement.origine === 'ucm' && par.join('-') !== forme) formes.push({ forme, par: par.join('-'), rang });
        renomme.splice(remplacement.debut, remplacement.fin - remplacement.debut, ...par);
      }
      apres.push(renomme.join('-'));
      // Un bloc gardé entier n'est ni renommé ni observé : sans cette question, la forme tolérée resterait sans réponse (E-09).
      for (const remplacement of lectures.sansFrontieres) {
        const forme = bas.slice(remplacement.debut, remplacement.fin).join('-');
        const par = remplacement.par.map((mot) => mot.toLowerCase()).join('-');
        if (remplacement.origine !== 'ucm' || reelles.has(forme) || forme === par) continue;
        const entree = gardesEntiers.get(`${forme}|${par}`) ?? { forme, par, noms: new Set<string>() };
        entree.noms.add(nom.id);
        gardesEntiers.set(`${forme}|${par}`, entree);
      }
      if (mots.length === 1 && segment.toLowerCase() === mots[0] && positionsCouvertes.size === 0) segmentsSoudes.add(mots[0]);
      let places: string[] | undefined;
      function observer(mot: string): void {
        const entree = observes.get(mot) ?? { mot, noms: new Set<string>(), lieux: new Map<string, string | null>(), exemples: [], types: new Set<'variable' | 'groupe'>() };
        entree.types.add(categorie === 'variables' && rang === segments.length - 1 ? 'variable' : 'groupe');
        entree.noms.add(nom.id);
        if (entree.exemples.length < 2 && !entree.exemples.includes(nom.id)) entree.exemples.push(nom.id);
        places ??= contexte(nom, segments, rang, cacheContextes);
        for (const place of places) {
          if (!entree.lieux.has(place)) entree.lieux.set(place, nom.id);
          else if (entree.lieux.get(place) !== nom.id) entree.lieux.set(place, null);
        }
        observes.set(mot, entree);
      }
      let plat = 0;
      for (const unite of mots) {
        const largeur = unite.split('-').length;
        let couverte = false;
        for (let i = plat; i < plat + largeur; i++) if (positionsCouvertes.has(i)) couverte = true;
        plat += largeur;
        const mot = unite.toLowerCase();
        if (couverte || !lettres.test(mot)) continue;
        observer(mot);
        if (++operations % TAILLE_D_UN_LOT === 0) yield;
      }
      if (++operations % TAILLE_D_UN_LOT === 0) yield;
    }
    if (formes.length > 0) aRenommer.push({ nom, avant: avant.join('/'), apres: apres.join('/'), formes });
    const cleDuNom = JSON.stringify([nom.categorie, nom.portee]);
    const parNom = nomsParPortee.get(cleDuNom) ?? new Map<string, { readonly id: string; readonly avant: string }[]>();
    nomsParPortee.set(cleDuNom, parNom);
    const destination = apres.join('/');
    const occupants = parNom.get(destination) ?? [];
    occupants.push({ id: nom.id, avant: avant.join('/') });
    parNom.set(destination, occupants);
    if (++operations % TAILLE_D_UN_LOT === 0) yield;
  }
  // Une réponse ne s'applique qu'aux mots que le renommage découpe de la même façon (lexique.ts) ; sans ce filtre, une question répondue disparaîtrait sans rien renommer.
  const motsApplicables = new Set<string>();
  for (const decoupe of lexique.mots.values()) {
    const bas = decoupe.map((mot) => mot.toLowerCase());
    for (let i = 0; i < bas.length; i++) for (let j = i + 1; j <= Math.min(bas.length, i + 3); j++) motsApplicables.add(bas.slice(i, j).join('-'));
    if (++operations % TAILLE_D_UN_LOT === 0) yield;
  }
  const distinctsDuFichier = new Set(dejaJuge.distincts.map(([a, b]) => clePaire(motJuge(a), motJuge(b))));
  const distincts = { has: (cle: string): boolean => distinctsDuFichier.has(cle) || distinctsDuDictionnaire.has(cle) };
  const voulus = new Set(dejaJuge.voulus.map(motJuge));
  const plusTard = new Set(dejaJuge.plusTard);
  const paires = new Map<string, PaireCandidate>();
  function* ajouterPaire(a: string, b: string, indice: IndiceDePaire): Generator<void> {
    if (a === b || !observes.has(a) || !observes.has(b)) return;
    const cle = clePaire(a, b);
    if (distincts.has(cle) || voulus.has(a) || voulus.has(b)) return;
    if (indice === 'ecriture-proche' && (paires.has(cle) || formesDuDictionnaire.has(cle))) return;
    if ((indice === 'synonymes' || indice === 'ecriture-proche') && !(yield* partagentUnePlace(observes.get(a)!, observes.get(b)!))) return;
    if ((indice === 'pluriel' || indice === 'terminaison') && ![...observes.get(a)!.types].some((type) => observes.get(b)!.types.has(type))) return;
    const precedente = paires.get(cle) ?? { mots: [a, b].sort(comparer) as [string, string], indices: new Set<IndiceDePaire>() };
    precedente.indices.add(indice);
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
  // Deux orthographes d'un même mot que ni le pluriel ni la terminaison ne relient (`gray`, `grey`) : le designer choisit celle qu'il garde.
  for (const [a, b] of FORMES_D_UN_MEME_MOT) {
    if (!paires.has(clePaire(a, b))) yield* ajouterPaire(a, b, 'synonymes');
    if (++operations % TAILLE_D_UN_LOT === 0) yield;
  }
  const segmentsObserves = new Map<string, MotObserve>();
  /** Les mots qu'une question propose sans que le fichier les emploie : `divider` pour `separator`, `separator` pour `separators`. */
  const synthetiques = new Set<string>();
  // QuickJS refuse un yield dans l'expression parcourue par for…of, dès la compilation du plugin.
  const branchesParalleles = yield* detecterBranchesParalleles(lexique);
  for (const branches of branchesParalleles) {
    const [a, b] = branches.mots;
    const cle = clePaire(a, b);
    if (distincts.has(cle) || voulus.has(motJuge(a)) || voulus.has(motJuge(b))) continue;
    branches.mots.forEach((mot, rang) => {
      const noms = branches.nomsDuMot[rang];
      segmentsObserves.set(mot, { mot, noms: new Set(noms), lieux: new Map(), exemples: [...noms].slice(0, 2), types: new Set() });
    });
    const precedente = paires.get(cle) ?? { mots: [a, b] as [string, string], indices: new Set<IndiceDePaire>() };
    precedente.indices.add('branches-paralleles');
    paires.set(cle, precedente);
  }
  // Deux mots à une lettre près (échange compris), que ni le dictionnaire ni le fichier n'ont jugés et dont aucun n'est connu du kit : le designer dit si c'est un même mot.
  const parCleProche = new Map<string, string[]>();
  const parLettres = new Map<string, string[]>();
  for (const observe of observes.values()) {
    yield;
    const mot = observe.mot;
    if ([...mot].length < LONGUEUR_MINIMALE_D_UNE_FAUTE_A_UNE_LETTRE || !uniquementDesLettres.test(mot) || termeOuFormeConnu(mot) || termesAUneLettre(mot).length > 0) continue;
    for (const cle of [mot, ...suppressions(mot)]) {
      const groupe = parCleProche.get(cle) ?? [];
      groupe.push(mot);
      parCleProche.set(cle, groupe);
    }
    const lettresTriees = [...mot].sort().join('');
    const memesLettres = parLettres.get(lettresTriees) ?? [];
    memesLettres.push(mot);
    parLettres.set(lettresTriees, memesLettres);
    if (++operations % TAILLE_D_UN_LOT === 0) yield;
  }
  for (const groupe of [...parCleProche.values(), ...parLettres.values()]) {
    for (let i = 0; i < groupe.length; i++) for (let j = i + 1; j < groupe.length; j++) {
      if (distanceUnOuEchange(groupe[i], groupe[j])) yield* ajouterPaire(groupe[i], groupe[j], 'ecriture-proche');
      if (++operations % TAILLE_D_UN_LOT === 0) yield;
    }
  }
  // E-08 : un renommage vers un terme UCM que deux noms se disputent est retiré (collision) ; la question demande alors lequel des deux mots reste.
  const bloques = new Map<string, { forme: string; par: string; noms: Set<string>; autres: Set<string>; exemples: string[] }>();
  for (const { nom, avant, apres, formes } of aRenommer) {
    const occupants = nomsParPortee.get(JSON.stringify([nom.categorie, nom.portee]))?.get(apres) ?? [];
    // Un nom qui s'écrit comme le sien n'est pas une collision du renommage : seuls comptent les noms d'origine différente,
    // et seules les formes des segments où ils diffèrent portent la collision (`colors` n'est pas en cause si `radius` et `border-radius` se rejoignent).
    const miens = avant.split('/');
    for (const occupant of occupants) {
      if (++operations % TAILLE_D_UN_LOT === 0) yield;
      if (occupant.avant === avant) continue;
      const siens = occupant.avant.split('/');
      for (const { forme, par, rang } of formes) {
        if (miens[rang] === siens[rang]) continue;
        const cle = `${forme}|${par}`;
        const entree = bloques.get(cle) ?? { forme, par, noms: new Set<string>(), autres: new Set<string>(), exemples: [] };
        entree.noms.add(nom.id);
        entree.autres.add(occupant.id);
        if (entree.exemples.length < 2 && !entree.exemples.includes(nom.id)) entree.exemples.push(nom.id);
        bloques.set(cle, entree);
      }
    }
    if (++operations % TAILLE_D_UN_LOT === 0) yield;
  }
  function ajouterUneForme(forme: string, par: string, nomsDeLaForme: ReadonlySet<string>, nomsDuTerme: ReadonlySet<string>, exemples: readonly string[]): void {
    const cle = clePaire(forme, par);
    if (paires.has(cle) || distincts.has(cle) || voulus.has(forme) || voulus.has(par)) return;
    if (!observes.has(forme)) segmentsObserves.set(forme, { mot: forme, noms: new Set(nomsDeLaForme), lieux: new Map(), exemples: [...exemples], types: new Set() });
    if (!observes.has(par)) synthetiques.add(par);
    if (!observes.has(par)) segmentsObserves.set(par, { mot: par, noms: new Set(nomsDuTerme), lieux: new Map(), exemples: [...nomsDuTerme].slice(0, 2), types: new Set() });
    paires.set(cle, { mots: [forme, par].sort(comparer) as [string, string], indices: new Set<IndiceDePaire>(['synonymes']) });
  }
  for (const { forme, par, noms, autres, exemples } of bloques.values()) ajouterUneForme(forme, par, noms, autres, exemples);
  for (const { forme, par, noms } of gardesEntiers.values()) ajouterUneForme(forme, par, noms, new Set(), [...noms].slice(0, 2));
  // Q-F5 : un synonyme employé seul donne une question quand un seul terme UCM du groupe le remplace ; une forme tolérée qu'aucun renommage ne couvre
  // (autre catégorie) n'en donne pas. E-10 : le pluriel d'un terme ou d'une forme d'un registre, sans le singulier au fichier.
  for (const observe of observes.values()) {
    const mot = observe.mot;
    if (++operations % TAILLE_D_UN_LOT === 0) yield;
    if (termesUcm.has(mot) || !uniquementDesLettres.test(mot)) continue;
    const ucm = termeUcmDuSynonyme(mot);
    if (ucm !== undefined) { ajouterUneForme(mot, ucm, observe.noms, new Set(), observe.exemples); continue; }
    if (termeConnu(mot) || termeDeComposant(mot)) continue;
    for (const fin of ['s', 'es']) {
      if (!mot.endsWith(fin) || mot.length <= fin.length + 2) continue;
      const base = mot.slice(0, -fin.length);
      if (observes.has(base) || !(termeConnu(base) || termeDeComposant(base))) continue;
      const cle = clePaire(mot, base);
      if (paires.has(cle) || distincts.has(cle) || voulus.has(mot) || voulus.has(base)) continue;
      synthetiques.add(base);
      segmentsObserves.set(base, { mot: base, noms: new Set(), lieux: new Map(), exemples: [], types: new Set() });
      paires.set(cle, { mots: [mot, base].sort(comparer) as [string, string], indices: new Set<IndiceDePaire>(['pluriel']) });
    }
  }
  const observe = (mot: string): MotObserve => observes.get(mot) ?? segmentsObserves.get(mot)!;

  const questions: Question[] = [];
  const ordreIndices: readonly IndiceDePaire[] = ['synonymes', 'abreviation', 'terminaison', 'pluriel', 'branches-paralleles', 'ecriture-proche'];
  for (const [cle, candidate] of paires) {
    if (plusTard.has(cle) || !candidate.mots.every((mot) => motsApplicables.has(mot) || (synthetiques.has(mot) && !observes.has(mot)))) continue;
    const [a, b] = candidate.mots.map(observe) as [MotObserve, MotObserve];
    const propose: 0 | 1 = terme(a).ucm !== terme(b).ucm ? (terme(a).ucm ? 0 : 1)
      : a.noms.size >= b.noms.size ? 0 : 1;
    const indice = ordreIndices.find((valeur) => candidate.indices.has(valeur))!;
    questions.push({ type: 'paire', cle, indice, termes: [terme(a), terme(b)], propose,
      score: yield* scoreDesNoms(a, b, candidate.indices.size) });
    if (++operations % TAILLE_D_UN_LOT === 0) yield;
  }

  // Une faute d'un terme connu (D1, D2) : une lettre, ou deux au-dessus de leur seuil, sans place partagée ni nombre d'emplois minimal, même si le terme manque au fichier.
  for (const observe of observes.values()) {
    yield;
    const mot = observe.mot;
    const longueur = [...mot].length;
    if (longueur < LONGUEUR_MINIMALE_D_UNE_FAUTE_A_UNE_LETTRE || voulus.has(mot) || termesUcm.has(mot) || !uniquementDesLettres.test(mot)
      || termeOuFormeConnu(mot) || termeDeComposant(mot) || pluralDeComposant(mot) || !motsApplicables.has(mot)) continue;
    const aUneLettre = termesAUneLettre(mot);
    const proches = aUneLettre.length > 0 ? aUneLettre : longueur >= LONGUEUR_MINIMALE_D_UNE_FAUTE_A_DEUX_LETTRES ? termesADeuxLettres(mot) : [];
    let reference: string | undefined;
    for (const proche of proches) {
      // N-02 : un terme proche qui est une forme tolérée (`attention`) vaut son terme UCM (`warning`), que le renommage lui substitue.
      const candidat = termeUcmDeLaForme(proche) ?? proche;
      // Une négation (`inactive` pour `active`) nomme l'état opposé : jamais une faute.
      if (opposes(mot, proche) || distincts.has(clePaire(mot, proche)) || distincts.has(clePaire(mot, candidat)) || voulus.has(proche) || voulus.has(candidat)) continue;
      const employe = observes.get(candidat)?.noms.size ?? 0;
      if (reference === undefined || (termesUcm.has(candidat) && !termesUcm.has(reference))
        || (termesUcm.has(candidat) === termesUcm.has(reference)
          && (employe > (observes.get(reference)?.noms.size ?? 0) || (employe === (observes.get(reference)?.noms.size ?? 0) && comparer(candidat, reference) < 0)))) reference = candidat;
    }
    if (reference === undefined) continue;
    const cle = `ecriture-du-terme:faute:${[mot, reference].sort(comparer).join('|')}`;
    if (plusTard.has(cle)) continue;
    const employee = observes.get(reference);
    questions.push({ type: 'ecriture-du-terme', cle, indice: 'faute', terme: terme(observe), proposition: [reference],
      reference: { mot: reference, nombre: employee?.noms.size ?? 0 }, score: yield* scoreDesNoms(observe, employee) });
  }
  for (const mot of segmentsSoudes) {
    if (++operations % TAILLE_D_UN_LOT === 0) yield;
    const observe = observes.get(mot);
    if (!observe || voulus.has(mot) || termesUcm.has(mot) || !motsApplicables.has(mot)) continue;
    const proposition = yield* decoupageAtteste(mot, observe, observes);
    if (proposition?.some((partie) => voulus.has(partie) || [...partie].length < 3) || (proposition && !proposition.some(termeOuFormeConnu))) continue;
    const cle = `ecriture-du-terme:mots-colles:${[mot, ...(proposition ?? [])].sort(comparer).join('|')}`;
    if (proposition && !plusTard.has(cle)) questions.push({ type: 'ecriture-du-terme', cle, indice: 'mots-colles',
      terme: terme(observe), proposition, score: observe.noms.size });
    if (++operations % TAILLE_D_UN_LOT === 0) yield;
  }

  for (const nom of collections) {
    if (++operations % TAILLE_D_UN_LOT === 0) yield;
    const id = nom.id;
    if ((COLLECTIONS as readonly string[]).includes(nom.nom) || collectionUcmReconnue(nom.nom) || dejaJuge.collectionsGardees.includes(id)) continue;
    const cle = `collection:${id}`;
    if (plusTard.has(cle)) continue;
    const nombre = lexique.portees.get(id)?.length ?? 0;
    // Q-F8, E-15 : une collection à une lettre d'une collection UCM (`thme`) propose celle-ci, sans la présélectionner côté interface.
    const proches = COLLECTIONS.filter((collection) => distanceUnOuEchange(nom.nom.trim().toLowerCase(), collection));
    questions.push({ type: 'collection', cle, collectionId: id, nom: nom.nom, nombre, ...(proches.length === 1 ? { proposee: proches[0] } : {}), score: nombre });
  }
  const seuil = options.seuil ?? 2;
  const maximum = Math.max(0, options.maximum ?? 10);
  const triees = yield* trierQuestions(questions);
  const retenues: Question[] = [], autres: Question[] = [];
  for (const question of triees) {
    // Une faute ou un mot collé d'un seul nom reste dans les questions (Q-F3) : le seuil de score ne range que les paires et les collections.
    const sansSeuil = question.type === 'ecriture-du-terme';
    if ((sansSeuil || question.score >= seuil) && retenues.length < maximum) retenues.push(question);
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

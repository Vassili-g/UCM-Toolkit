/**
 * Exécution du stress test F1 (plan F1, sections 1.1 et 5) : appelle le kit sur chaque cas, avec le chemin de calcul du plugin
 * (`nomsSelonLesReglesSync`, puis `detecterLesQuestions`), et confie la sortie à l'oracle. La sortie N1 prend le seuil 0 et aucun
 * maximum ; N2, qui reprend les paramètres de la session (seuil 2, maximum 10, aucune question mise à plus tard), se déduit de N1
 * parce que le kit trie ses questions avant de les répartir.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { nomsSelonLesReglesSync } from '../../../src/nommage/index.js';
import type { Inventaire } from '../../../src/nommage/inventaire.js';
import { lireReglesDeNommage, type ReglesPourLeCalcul } from '../../../src/protocoles/nommage.js';
import { detecterLesQuestions, type DejaJuge, type Question } from '../../../src/referentiel/index.js';
import { decouperPourQuestions } from '../../../src/referentiel/termes-connus.js';
import { echantillon, graineDe, melanger, mulberry32 } from '../commun/prng.js';
import { convertir, MODES_DE_CHEMINS, MODES_DE_COLLECTIONS, RACINE_DU_DEPOT, segmentsDuNom, type Systeme } from './corpus.js';
import { creerLeDetecteur } from './detecteur.js';
import {
  chargerLesClassements, collisionsSansQuestion, creerLeContexteOracle, dispense, estUneCollisionDeChemin, QUESTION_AXE_D_ETAT, ECART_AXE_D_ETAT, ECART_NOM_DE_COMPOSANT, estUneFormeDAxeDEtat, ECART_MUTANT_UCM, ECART_SYNONYME_EN_CASSE_MIXTE, ECART_TERME_UCM_NON_UNIQUE, QUESTION_SYNONYME_EN_CASSE_MIXTE, estUnTermeUcm, jugerUneFaute, juger, termesUcmDuMot, type ContexteOracle, type Sortie, type Verdict,
} from './oracle.js';
import {
  creerLeContexte, enInventaire, genererLesScenarios, squelette, STRATES, type Contexte, type Scenario,
} from './scenarios.js';
import { formeComposee } from './mutations.js';

const VIDE: DejaJuge = { distincts: [], plusTard: [], voulus: [], collectionsGardees: [] };
/** Les paramètres de la session d'Architect (`session.ts`) : seuil 2, maximum 10 plus les questions mises à plus tard (aucune ici). */
const SEUIL_DE_LA_SESSION = 2;
const MAXIMUM_DE_LA_SESSION = 10;

export const REGLES_FIXES = lireReglesDeNommage([['ecriture', JSON.stringify({ version: 1, groupes: { casse: 'minuscules', separateur: 'tiret' }, variables: { casse: 'minuscules', separateur: 'tiret' } })]])!;
/** Sans écriture rangée, le calcul prend la convention dominante du fichier : A-09 (E-17) ne s'exerce que par ce choix. */
export const REGLES_DETECTEES: ReglesPourLeCalcul = { vocabulaire: { personnalises: [], ecartsUcm: [] }, ordinaires: [], collectionsExclues: [] };
const STRATES_A_ECRITURE_DETECTEE = new Set(['S8', 'S9']);

export interface OptionsDeLaMesure {
  readonly strates?: readonly string[];
  readonly rapide: boolean;
  readonly graine: number;
  readonly progression?: (message: string) => void;
}

// ---------------------------------------------------------------------------------------------------------------- calcul

export interface Calcul {
  /** L'écriture que le calcul a suivie : celle des règles, ou la dominante du fichier quand les règles n'en rangent aucune. */
  readonly ecriture: NonNullable<ReglesPourLeCalcul['ecriture']>;
  readonly renommages: Sortie['renommages'];
  readonly collisions: Sortie['collisions'];
  readonly questions: readonly Question[];
  readonly nomsParId: ReadonlyMap<string, string>;
}

/** Le calcul du plugin sur un inventaire : renommages et collisions, puis les questions de N1. */
export function calculer(inventaire: Inventaire, regles: ReglesPourLeCalcul, nonRenommables: readonly string[] = []): Calcul {
  const { lexique, indexation, resultat, ecriture } = nomsSelonLesReglesSync(inventaire, regles, nonRenommables);
  const trouvees = detecterLesQuestions(lexique, indexation.index, VIDE, { seuil: 0, maximum: Number.MAX_SAFE_INTEGER });
  return {
    ecriture, renommages: resultat.renommages, collisions: resultat.collisions, questions: [...trouvees.questions, ...trouvees.autres],
    nomsParId: new Map([...lexique.noms].map(([id, nom]) => [id, nom.nom])),
  };
}

/** N2 : les questions que la session montre, et celles qui tombent dans « Autres pistes ». */
export function repartirSelonLaSession(questions: readonly Question[]): { visibles: Set<string>; autres: Set<string> } {
  const visibles = new Set<string>(), autres = new Set<string>();
  for (const question of questions) {
    if (question.score >= SEUIL_DE_LA_SESSION && visibles.size < MAXIMUM_DE_LA_SESSION) visibles.add(question.cle);
    else autres.add(question.cle);
  }
  return { visibles, autres };
}

function sortieDe(calcul: Calcul, noms: Sortie['noms']): Sortie {
  return { noms, renommages: calcul.renommages, collisions: calcul.collisions, questions: calcul.questions, nomsParId: calcul.nomsParId, ...repartirSelonLaSession(calcul.questions) };
}

function nonRenommablesDe(cas: Scenario): string[] {
  if (!cas.nonRenommables?.length) return [];
  const ids: string[] = [];
  cas.noms.forEach((nom, rang) => {
    for (const protegee of cas.nonRenommables!) {
      const [collection, chemin] = protegee.split('|');
      if (nom.collection === collection && (nom.nom === chemin || nom.nom.startsWith(`${chemin}/`) || nom.nom.endsWith(`/${chemin}`) || nom.nom.includes(`/${chemin}/`))) ids.push(`variable:${rang}`);
    }
  });
  return ids;
}

export function executerUnCas(cas: Scenario): Sortie {
  const regles = STRATES_A_ECRITURE_DETECTEE.has(cas.strate) ? REGLES_DETECTEES : REGLES_FIXES;
  return sortieDe(calculer(enInventaire(cas), regles, nonRenommablesDe(cas)), cas.noms);
}

// ---------------------------------------------------------------------------------------------------------------- cas des groupes validés

const GROUPES_VALIDES_FREQUENCES: readonly (readonly [number, number])[] = [[1, 1], [1, 5], [5, 1], [5, 5]];

/**
 * Les cas S6 des groupes de `synonymes.json` : aucun cas du lot 2 ne les emploie, puisque les 40 paires candidates du lot 1
 * ne contiennent aucun synonyme. Ils reprennent la forme des cas de la table (frères, cousins, isolés) sur des noms inventés.
 */
export function casDesGroupesValides(contexte: Contexte, groupes: readonly (readonly string[])[]): Scenario[] {
  const cas: Scenario[] = [];
  const pool = contexte.pool;
  const [parent, autreParent, suivant] = [pool[390], pool[391], pool[392]];
  for (const groupe of groupes) {
    const [a, b] = [groupe[0], groupe[1]];
    const terme = `valide:${a}|${b}`;
    const ajouter = (axes: Scenario['axes'], noms: [string, string][]) => cas.push({
      id: ['S6', 'M-07', terme, ...Object.entries(axes).map(([cle, valeur]) => `${cle}=${valeur}`)].join('/'), strate: 'S6', operateur: 'M-07', terme, axes,
      noms: [...squelette(pool), ...noms.map(([collection, nom]) => ({ collection, nom }))],
      attendus: [{ propriete: 'P-14', mot: a, reference: b }], oracle: true,
    });
    for (const [fa, fb] of GROUPES_VALIDES_FREQUENCES) {
      ajouter({ parente: 'freres', fa, fb }, [['theme', `${parent}/${a}/${suivant}`], ['theme', `${parent}/${b}/${suivant}`]]);
      ajouter({ parente: 'cousins', fa, fb }, [['theme', `${parent}/${a}/${suivant}`], ['theme', `${autreParent}/${b}/${suivant}`]]);
    }
    for (const mot of [a, b]) ajouter({ parente: 'isoles', seul: mot === a ? 'a' : 'b', n: 1 }, [['theme', `${parent}/${mot}/${suivant}`]]);
  }
  return cas;
}

// ---------------------------------------------------------------------------------------------------------------- cas de branches parallèles

const DEBUT_DES_BRANCHES = 300;

/**
 * Le fichier de branches parallèles tel que le kit les lit : `branches` branches sœurs portent les mêmes sous-chemins, sauf les
 * dernières entrées des deux premières, où le mot `a` de l'une fait face au mot `b` de l'autre. La disposition du lot 2 met `a`
 * et `b` sous un même parent, comme les branches elles-mêmes, que le kit tient pour des frères.
 */
function brancherSelonLeKit(pool: readonly string[], a: string, b: string, branches: number, entrees: number, part: number): Scenario['noms'] {
  const noms = [...squelette(pool)];
  const parent = pool[DEBUT_DES_BRANCHES];
  const parBranche = Math.max(2, Math.ceil(entrees / branches));
  // À 100 % les sous-chemins sont tous communs : une entrée de plus porte la différence
  const differents = part >= 100 ? 1 : Math.max(1, Math.ceil((parBranche * (100 - part)) / 100));
  const communs = part >= 100 ? parBranche : Math.max(0, parBranche - differents);
  const parBrancheAvecLaDifference = communs + differents;
  const mot = (rang: number, depart: number) => pool[depart + (rang % 35)] + pool[depart + 35 + Math.floor(rang / 35)];
  for (let branche = 0; branche < branches; branche++) {
    const nom = pool[DEBUT_DES_BRANCHES + 1 + branche];
    for (let k = 0; k < communs; k++) noms.push({ collection: 'theme', nom: `${parent}/${nom}/${mot(k, 330)}/${mot(k, 260)}` });
    if (branche < 2) for (let k = communs; k < parBrancheAvecLaDifference; k++) noms.push({ collection: 'theme', nom: `${parent}/${nom}/${mot(k, 330)}/${branche === 0 ? a : b}` });
  }
  return noms;
}

/** Les cas S11 du lot 2 repris dans la disposition du kit : mêmes paires, mêmes nombres de branches, d'entrées et de sous-chemins communs. */
export function casDeBranches(contexte: Contexte): Scenario[] {
  return [...STRATES.S11(contexte)].map((cas) => ({
    ...cas,
    id: cas.id.replace('S11/M-15/', 'S11/M-15/kit:'),
    axes: { ...cas.axes, disposition: 'kit' },
    noms: brancherSelonLeKit(contexte.pool, cas.attendus[0].reference!, cas.attendus[0].mot!, Number(cas.axes.branches), Number(cas.axes.entrees), Number(cas.axes.communs)),
  }));
}

// ---------------------------------------------------------------------------------------------------------------- S16

/** Les morceaux d'un segment que la strate S16 compte comme mots, avec leur position dans le segment. */
function morceauxDuSegment(segment: string): { debut: number; texte: string }[] {
  const decoupe = segment.replace(/([a-z])([A-Z])/g, '$1 $2').split(' ');
  const rendus: { debut: number; texte: string }[] = [];
  let curseur = 0;
  for (const texte of decoupe) {
    rendus.push({ debut: curseur, texte });
    curseur += texte.length;
    if (segment[curseur] === ' ') curseur++;
  }
  return rendus;
}

/** Le segment avec le mot du site remplacé par le mutant, dans la même casse. */
function segmentMute(segment: string, rangDuMot: number, mutant: string): string {
  const morceau = morceauxDuSegment(segment)[rangDuMot];
  const casse = morceau.texte === morceau.texte.toUpperCase() && morceau.texte.length > 1 ? mutant.toUpperCase()
    : morceau.texte[0] === morceau.texte[0].toUpperCase() && morceau.texte[0] !== morceau.texte[0].toLowerCase() ? mutant[0].toUpperCase() + mutant.slice(1) : mutant;
  return segment.slice(0, morceau.debut) + casse + segment.slice(morceau.debut + morceau.texte.length);
}

export interface PasseReelle { readonly cle: string; readonly systeme: string; readonly operateur: string; readonly cas: Scenario[] }

export function regrouperLesPasses(cas: readonly Scenario[]): PasseReelle[] {
  const passes = new Map<string, PasseReelle>();
  for (const unCas of cas) {
    const cle = `${unCas.site!.systeme}|${unCas.operateur}|${unCas.site!.lot}`;
    const passe = passes.get(cle) ?? { cle, systeme: unCas.site!.systeme, operateur: unCas.operateur, cas: [] };
    passe.cas.push(unCas);
    passes.set(cle, passe);
  }
  return [...passes.values()].sort((a, b) => a.cle.localeCompare(b.cle));
}

/** Le fichier d'une passe : le système converti, avec le mot de chaque site remplacé par son mutant. */
export function sortieDeLaPasse(passe: PasseReelle, systeme: Systeme): Sortie {
  const converti = convertir(systeme, 'tirets', 'couche');
  const segmentsParId = new Map<string, string[]>();
  for (const site of [...passe.cas].sort((x, y) => y.site!.rangDuMot - x.site!.rangDuMot)) {
    const id = `${systeme.id}:${site.site!.indice}`;
    const segments = segmentsParId.get(id) ?? segmentsDuNom(systeme.noms[site.site!.indice].nom, 'tirets');
    segments[site.site!.rang] = segmentMute(segments[site.site!.rang], site.site!.rangDuMot, site.site!.mutant);
    segmentsParId.set(id, segments);
  }
  const entrees = converti.inventaire.entrees.map((entree) => {
    const segments = segmentsParId.get(entree.nom.id);
    return segments ? { ...entree, nom: { ...entree.nom, nom: segments.join('/') } } : entree;
  });
  const calcul = calculer({ ...converti.inventaire, entrees }, REGLES_DETECTEES);
  const noms = entrees.filter((entree) => entree.nom.categorie === 'variables').map((entree) => ({ collection: entree.contexte?.collection ?? '', nom: entree.nom.nom }));
  return sortieDe(calcul, noms);
}

function jugerUnePasse(passe: PasseReelle, systeme: Systeme, ctx: ContexteOracle): Verdict[] {
  return jugerLesSitesDeLaPasse(passe, systeme, sortieDeLaPasse(passe, systeme), ctx);
}

/** Les verdicts des sites d'une passe sur la sortie du kit : le jugement de S16, repris tel quel pour Slice. */
export function jugerLesSitesDeLaPasse(passe: PasseReelle, systeme: Systeme, sortie: Sortie, ctx: ContexteOracle): Verdict[] {
  return passe.cas.map((cas) => {
    const segments = segmentsDuNom(systeme.noms[cas.site!.indice].nom, 'tirets');
    const { rang } = cas.site!;
    // `natures.ts` : un composant est un élément à la racine de `components`, ou l'enfant direct d'un segment `components`.
    const nomDeComposant = rang < segments.length - 1 && segments[rang].toLowerCase() !== 'components'
      && ((cas.site!.collection === 'components' && rang === 0) || (rang > 0 && segments[rang - 1].toLowerCase() === 'components'));
    return jugerUnSite(cas, sortie, ctx, morceauxDuSegment(segments[rang]).length > 1, nomDeComposant);
  });
}

/**
 * `enCasseMixte` : le mot du site est un morceau d'un segment en casse mixte (`controlItemBgAmctive`). Le kit lit la faute d'un tel morceau (E14, `morceauxDeCasse`),
 * mais non sa synonymie : PLAN-VOCABULAIRE ne fait pas de `wrap` un terme de `TileLinksWrap`. Le mainteneur n'a pas tranché le cas des synonymes (Q-E14-3).
 */
function jugerUnSite(cas: Scenario, sortie: Sortie, ctx: ContexteOracle, enCasseMixte: boolean, nomDeComposant: boolean): Verdict {
  const verdict = jugerLeSite(cas, sortie, ctx);
  const site = cas.site!;
  const propriete = cas.attendus[0].propriete;
  if (nomDeComposant) return dispense([verdict], ECART_NOM_DE_COMPOSANT)[0];
  if (propriete === 'P-10' && estUneFormeDAxeDEtat(site.mutant)) return dispense([verdict], ECART_AXE_D_ETAT, QUESTION_AXE_D_ETAT)[0];
  if (propriete === 'P-14') {
    // Q-F5 : un synonyme seul ne pose une question que si son terme UCM est unique, et un terme UCM n'est pas une faute (E2c).
    if (estUnTermeUcm(site.mutant)) return dispense([verdict], ECART_MUTANT_UCM)[0];
    if (termesUcmDuMot(site.mutant).length !== 1) return dispense([verdict], ECART_TERME_UCM_NON_UNIQUE)[0];
    if (enCasseMixte) return dispense([verdict], ECART_SYNONYME_EN_CASSE_MIXTE, QUESTION_SYNONYME_EN_CASSE_MIXTE)[0];
  }
  return verdict;
}

function jugerLeSite(cas: Scenario, sortie: Sortie, ctx: ContexteOracle): Verdict {
  const site = cas.site!;
  const id = `${site.systeme}:${site.indice}`;
  const { propriete } = cas.attendus[0];
  if (propriete === 'P-01') return jugerUneFaute(cas, sortie, ctx, site.mutant, site.mot, ['P-01']);
  const renommage = sortie.renommages.find((r) => r.id === id && r.termes.some((terme) => terme.avant.join('-').toLowerCase() === site.mutant.toLowerCase()));
  const enCollision = sortie.collisions.some((collision) => collision.ids.includes(id));
  const enJeuDe = (q: Question) => new Set(q.type === 'paire' ? q.termes.map((t) => t.mot.toLowerCase()) : q.type === 'ecriture-du-terme' ? [q.terme.mot.toLowerCase(), ...q.proposition] : [q.nom.toLowerCase()]);
  // E2c, E-08 : quand le renommage du mutant est retiré parce que son nom est pris, la question oppose le mutant à son terme UCM, pas au mot d'origine.
  const termesDuMutant = enCollision ? termesUcmDuMot(site.mutant) : [];
  // Q-F5 : un synonyme employé seul est opposé à son terme UCM unique (`down` à `pressed`), jamais au synonyme d'origine absent du fichier.
  const question = sortie.questions.find((q) => {
    const enJeu = enJeuDe(q);
    return enJeu.has(site.mutant.toLowerCase()) && (enJeu.has(site.mot) || (propriete === 'P-14' ? termesUcmDuMot(site.mutant) : termesDuMutant).some((terme) => enJeu.has(terme)));
  });
  // Un renommage retiré par un conflit de chemin a sa carte dans « Bloqués » (P-20) : la session désigne le mot sans question.
  const carte = sortie.collisions.some((collision) => estUneCollisionDeChemin(collision) && collision.ids.includes(id));
  const ok = !!renommage || !!question || carte;
  return {
    cas: cas.id, strate: cas.strate, operateur: cas.operateur, proprietes: [propriete], role: 'oracle', attendu: true, issue: ok ? 'detecte' : 'manque',
    mot: site.mutant, reference: site.mot, axes: cas.axes,
    detail: renommage ? `renommage ${renommage.ancienNom} -> ${renommage.nouveauNom}` : question ? `question ${question.cle}` : carte ? 'carte de résolution du conflit de chemin' : `${site.mutant} ne donne ni renommage ni question`,
    ecarts: ok ? [] : [enCollision ? 'E-08' : 'nouveau'],
  };
}

// ---------------------------------------------------------------------------------------------------------------- P-21, P-22, P-23

/** L'écart que rattache la décision provisoire de la conversation principale : un second passage qui renomme encore est un « renommage non idempotent » du kit. */
export const ECART_DE_P21 = 'renommage non idempotent';
export interface EchecDeStabilite { readonly fichier: string; readonly propriete: 'P-21' | 'P-22'; readonly detail: string; readonly ecart?: string }
export interface Stabilite {
  readonly fichiers: number;
  readonly noms: number;
  readonly p21: { readonly reussis: number; readonly echecs: number };
  readonly p22: { readonly reussis: number; readonly echecs: number };
  readonly echecs: readonly EchecDeStabilite[];
  /** Les questions du second passage que le renommage a rendues visibles (un mot qu'il a découpé ou soudé) : mesurées, jamais comptées en échec. */
  readonly revelees: number;
}

const PLAFOND_DE_NOMS_PAR_FICHIER = 1500;

/** Applique les renommages à l'inventaire : variables et collections prennent leur nouveau nom. */
function appliquer(inventaire: Inventaire, renommages: Sortie['renommages']): Inventaire {
  const parId = new Map(renommages.map((renommage) => [renommage.id, renommage.nouveauNom]));
  const collections = new Map<string, string>();
  for (const entree of inventaire.entrees) if (entree.cible.type === 'collection') collections.set(entree.nom.nom, parId.get(entree.nom.id) ?? entree.nom.nom);
  return {
    ...inventaire,
    entrees: inventaire.entrees.map((entree) => {
      const nouveau = parId.get(entree.nom.id);
      const collection = entree.contexte?.collection;
      return {
        ...entree, ...(nouveau !== undefined ? { nom: { ...entree.nom, nom: nouveau } } : {}),
        ...(collection !== undefined ? { contexte: { ...entree.contexte, collection: collections.get(collection) ?? collection } } : {}),
      };
    }),
  };
}

/** Les mots que le premier passage observe : ceux de `decouperPourQuestions` pour chaque segment, entiers et coupés sur `-`. */
function motsObserves(noms: Iterable<string>): Set<string> {
  const mots = new Set<string>();
  for (const nom of noms) for (const segment of nom.split('/')) for (const mot of decouperPourQuestions(segment)) {
    mots.add(mot.toLowerCase());
    for (const morceau of mot.toLowerCase().split('-')) mots.add(morceau);
  }
  return mots;
}

/** Les mots d'une clé de question de mot ou de paire (`ecriture-du-terme:faute:a|b`, `paire:a|b`) ; vide pour une question de collection. */
function motsDeLaCle(cle: string): string[] {
  return cle.startsWith('collection:') ? [] : cle.slice(cle.lastIndexOf(':') + 1).split('|');
}

export interface SecondPassage {
  /** Ce que le second passage renomme encore. */
  readonly renommages: Sortie['renommages'];
  /** Les questions qu'il pose sur des mots que le premier passage observait déjà : une faille d'idempotence. */
  readonly nouvelles: readonly string[];
  /** Les questions qu'il pose sur un mot que le renommage a fait naître (`additionLine` coupé en `addition-line`, `padding-x` soudé en `paddingx`). */
  readonly revelees: readonly string[];
}

/**
 * Applique les renommages du premier passage et relance le calcul. Le plugin range l'écriture au premier lancement : le second passage
 * suit celle que le premier a choisie. Une question sur un mot absent du premier passage n'a pu être posée avant le renommage : elle est
 * « révélée », pas nouvelle. Une question de collection, sans mot, compte toujours comme nouvelle.
 */
export function secondPassage(inventaire: Inventaire, regles: ReglesPourLeCalcul = REGLES_DETECTEES, premier: Calcul = calculer(inventaire, regles)): SecondPassage {
  const second = calculer(appliquer(inventaire, premier.renommages), { ...regles, ecriture: premier.ecriture });
  const cles = new Set(premier.questions.map((question) => question.cle));
  const avant = motsObserves(premier.nomsParId.values());
  const inedites = second.questions.map((question) => question.cle).filter((cle) => !cles.has(cle));
  const revelees = (cle: string) => motsDeLaCle(cle).some((mot) => !avant.has(mot));
  return { renommages: second.renommages, nouvelles: inedites.filter((cle) => !revelees(cle)), revelees: inedites.filter(revelees) };
}

/**
 * P-21 et P-22 sur des fichiers du corpus : `nombre` fichiers, un par système et variante à tour de rôle, de 1 500 noms au plus
 * tirés par la graine. Pour P-21, appliquer les renommages ne donne ni renommage ni question nouvelle. Pour P-22, permuter les
 * entrées ne change pas l'ensemble des clés de questions.
 */
export function verifierLaStabilite(systemes: readonly Systeme[], nombre: number, graine: number): Stabilite {
  const echecs: EchecDeStabilite[] = [];
  const variantes = MODES_DE_CHEMINS.flatMap((chemins) => MODES_DE_COLLECTIONS.map((collections) => [chemins, collections] as const));
  let noms = 0, reussis21 = 0, reussis22 = 0, revelees = 0;
  for (let i = 0; i < nombre; i++) {
    const systeme = systemes[i % systemes.length];
    const [chemins, collections] = variantes[Math.floor(i / systemes.length) % variantes.length];
    const tirage = mulberry32(graineDe(graine, `stabilite/${i}`));
    const extrait: Systeme = { id: systeme.id, noms: systeme.noms.length > PLAFOND_DE_NOMS_PAR_FICHIER ? echantillon(tirage, systeme.noms, PLAFOND_DE_NOMS_PAR_FICHIER) : systeme.noms };
    const fichier = `${systeme.id}/${chemins}/${collections}/${i}`;
    noms += extrait.noms.length;
    const inventaire = convertir(extrait, chemins, collections).inventaire;
    const premier = calculer(inventaire, REGLES_DETECTEES);
    const cles = new Set(premier.questions.map((question) => question.cle));

    const passage = secondPassage(inventaire, REGLES_DETECTEES, premier);
    revelees += passage.revelees.length;
    if (passage.renommages.length === 0 && passage.nouvelles.length === 0) reussis21++;
    else echecs.push({ fichier, propriete: 'P-21', ecart: ECART_DE_P21, detail: `${passage.renommages.length} renommage(s) au second passage${passage.renommages[0] ? ` (${passage.renommages[0].ancienNom} -> ${passage.renommages[0].nouveauNom})` : ''}, ${passage.nouvelles.length} question(s) nouvelle(s)${passage.nouvelles[0] ? ` (${passage.nouvelles[0]})` : ''}` });

    const permute = calculer({ ...inventaire, entrees: melanger(tirage, inventaire.entrees) }, REGLES_DETECTEES);
    const clesPermutees = new Set(permute.questions.map((question) => question.cle));
    const manquantes = [...cles].filter((cle) => !clesPermutees.has(cle)), ajoutees = [...clesPermutees].filter((cle) => !cles.has(cle));
    if (manquantes.length === 0 && ajoutees.length === 0) reussis22++;
    else echecs.push({ fichier, propriete: 'P-22', detail: `${manquantes.length} clé(s) perdue(s)${manquantes[0] ? ` (${manquantes[0]})` : ''}, ${ajoutees.length} clé(s) en plus${ajoutees[0] ? ` (${ajoutees[0]})` : ''}` });
  }
  return { fichiers: nombre, noms, p21: { reussis: reussis21, echecs: nombre - reussis21 }, p22: { reussis: reussis22, echecs: nombre - reussis22 }, echecs, revelees };
}

/** P-23, témoin négatif : le squelette seul ne donne ni question ni renommage. */
export function verifierLeSqueletteSeul(contexte: Contexte): { questions: number; renommages: number } {
  const sortie = executerUnCas({ id: 'squelette', strate: 'S0', operateur: '-', terme: '-', axes: {}, noms: squelette(contexte.pool), attendus: [], oracle: true });
  return { questions: sortie.questions.length, renommages: sortie.renommages.length };
}

// ---------------------------------------------------------------------------------------------------------------- témoins du mainteneur

export interface Temoin {
  readonly nom: string;
  readonly ecart: string;
  readonly attendu: string;
  readonly verdict: Verdict | undefined;
  readonly conforme: boolean;
}

/** Un fichier de faute au placement de référence (même collection, rang 1 de 3, voisin identique), pour un mot que la grille n'engendre pas. */
function fichierDeFaute(contexte: Contexte, id: string, operateur: string, juste: string, fautif: string, m: number, k: number, propriete: string): Scenario {
  const pool = contexte.pool;
  const noms = squelette(pool);
  const voisin = pool[20];
  let rempli = 0;
  const ajouter = (mot: string, nombre: number) => { for (let i = 0; i < nombre; i++) noms.push({ collection: 'theme', nom: `${voisin}/${mot}/${pool[40 + rempli++]}` }); };
  ajouter(juste, k);
  ajouter(fautif, m);
  return { id, strate: 'S1', operateur, terme: juste, axes: { a01: 'meme', a02: '1/3', m, k, a05: 'identique' }, noms, attendus: [{ propriete, mot: fautif, reference: juste }], oracle: true };
}

function premierCas(contexte: Contexte, strate: string, retenir: (cas: Scenario) => boolean): Scenario | undefined {
  for (const cas of STRATES[strate](contexte)) if (retenir(cas)) return cas;
  return undefined;
}

type IssueDeTemoin = 'detecte' | 'manque';

/**
 * Les cas que le plan nomme en 6.1, avec ce que les décisions de E2 en attendent : le plan les attendait manqués sur le kit d'avant E2,
 * et E2b, E2c et E2d les ont corrigés. `bordre` et `paddng` ont 6 lettres : Q-F4 (E2.5) fixe à 7 la longueur d'une faute d'une lettre, ces deux
 * mots restent sans question, et `backgorund` (E-03) et `paddign` (E-04) portent les mêmes écarts au-dessus du seuil.
 */
export function executerLesTemoins(contexte: Contexte, ctx: ContexteOracle): Temoin[] {
  const separator = premierCas(contexte, 'S13', (cas) => cas.axes.terme === 'meme-dossier' && cas.axes.type === 'variable' && cas.axes.frequence === 1 && cas.attendus[0].mot === 'separator' && cas.attendus[0].reference === 'divider');
  const thin = premierCas(contexte, 'S5', (cas) => cas.attendus[0].mot === formeComposee('separator', 'thin', 'suffixe') && cas.axes.terme === 'avec');
  const pluriel = premierCas(contexte, 'S7', (cas) => cas.attendus[0].mot === 'separators' && cas.axes.type === 'variable' && cas.attendus[0].propriete === 'P-13' && cas.terme.endsWith(':separator'));
  const candidats: { nom: string; ecart: string; propriete: string; issue: IssueDeTemoin; cas: Scenario | undefined }[] = [
    { nom: '`backgrond` dans `theme`, k = 4', ecart: 'E-01', propriete: 'P-01', issue: 'detecte', cas: fichierDeFaute(contexte, 'temoin/backgrond/k=4', 'M-02', 'background', 'backgrond', 1, 4, 'P-01') },
    { nom: '`separator` près de `divider`, même dossier', ecart: 'E-08', propriete: 'P-11', issue: 'detecte', cas: separator },
    { nom: '`bordre` (échange, 6 lettres), k = 8', ecart: 'E-03', propriete: 'P-01', issue: 'manque', cas: fichierDeFaute(contexte, 'temoin/bordre/k=8', 'M-04', 'border', 'bordre', 1, 8, 'P-01') },
    { nom: '`backgorund` (échange, 10 lettres), k = 8', ecart: 'E-03', propriete: 'P-01', issue: 'detecte', cas: fichierDeFaute(contexte, 'temoin/backgorund/k=8', 'M-04', 'background', 'backgorund', 1, 8, 'P-01') },
    { nom: '`paddng` (6 lettres), k = 8', ecart: 'E-04', propriete: 'P-04', issue: 'manque', cas: fichierDeFaute(contexte, 'temoin/paddng/k=8', 'M-02', 'padding', 'paddng', 1, 8, 'P-04') },
    { nom: '`paddign` (échange, 7 lettres), k = 8', ecart: 'E-04', propriete: 'P-04', issue: 'detecte', cas: fichierDeFaute(contexte, 'temoin/paddign/k=8', 'M-04', 'padding', 'paddign', 1, 8, 'P-04') },
    { nom: '`separator-thin`', ecart: 'E-09', propriete: 'P-12', issue: 'detecte', cas: thin },
    { nom: '`separators`', ecart: 'E-10', propriete: 'P-13', issue: 'detecte', cas: pluriel },
  ];
  return candidats.map(({ nom, ecart, propriete, issue, cas }) => {
    const attendu = `${propriete} ${issue === 'detecte' ? 'détecté' : 'manqué'}`;
    if (!cas) return { nom, ecart, attendu, verdict: undefined, conforme: false };
    const [verdict] = juger(cas, executerUnCas(cas), ctx);
    return { nom, ecart, attendu, verdict, conforme: verdict?.issue === issue && verdict.proprietes.includes(propriete) };
  });
}

// ---------------------------------------------------------------------------------------------------------------- mesure

export interface CasRendu {
  readonly id: string;
  readonly strate: string;
  readonly operateur: string;
  readonly noms: number;
  readonly renommages: number;
  readonly collisions: number;
  readonly questions: readonly string[];
  readonly verdicts: readonly { readonly proprietes: readonly string[]; readonly role: string; readonly issue: string; readonly detail: string }[];
}

export interface LigneDeCollision { readonly cas: string; readonly strate: string; readonly nature: string; readonly noms: readonly string[]; readonly motif: string }

export interface Mesure {
  readonly graine: number;
  readonly rapide: boolean;
  readonly complet: boolean;
  readonly strates: readonly string[];
  readonly empreinte: string;
  readonly version: string;
  readonly casParStrate: Readonly<Record<string, number>>;
  /** Les cas que le harnais ajoute à ceux du lot 2, par strate. */
  readonly casSupplementaires: Readonly<Record<string, number>>;
  readonly verdicts: readonly Verdict[];
  readonly cas: readonly CasRendu[];
  readonly temoins: readonly Temoin[];
  readonly squelette: { questions: number; renommages: number };
  readonly stabilite: Stabilite | undefined;
  readonly collisionsSansQuestion: readonly LigneDeCollision[];
  readonly dureeMs: number;
  readonly dureeParEtape: Readonly<Record<string, number>>;
}

const versionDuKit = (): string => (JSON.parse(readFileSync(join(RACINE_DU_DEPOT, 'packages/kit/package.json'), 'utf8')) as { version: string }).version;

function rendre(cas: Scenario, sortie: Sortie, verdicts: readonly Verdict[]): CasRendu {
  return {
    id: cas.id, strate: cas.strate, operateur: cas.operateur, noms: sortie.noms.length, renommages: sortie.renommages.length, collisions: sortie.collisions.length,
    questions: sortie.questions.map((question) => question.cle),
    verdicts: verdicts.map((v) => ({ proprietes: v.proprietes, role: v.role, issue: v.issue, detail: v.detail })),
  };
}

/** Le seul point d'entrée de la mesure : génère les cas, les exécute, les juge, puis vérifie la stabilité. */
export function mesurer(systemes: readonly Systeme[], options: OptionsDeLaMesure): Mesure {
  const debut = Date.now();
  const dire = options.progression ?? (() => undefined);
  const dureeParEtape: Record<string, number> = {};
  const etape = <T>(nom: string, travail: () => T): T => { const t = Date.now(); const rendu = travail(); dureeParEtape[nom] = Date.now() - t; return rendu; };

  const contexte = creerLeContexte(systemes, options.graine);
  const detecteur = creerLeDetecteur(contexte.vocabulaire, contexte.motsDuDictionnaire);
  const ctx = creerLeContexteOracle(contexte, detecteur, chargerLesClassements());
  const demandees = options.strates ?? Object.keys(STRATES);
  const verdicts: Verdict[] = [];
  const cas: CasRendu[] = [];
  const collisions: LigneDeCollision[] = [];
  const casParStrate: Record<string, number> = {};
  const hachage = createHash('sha256');
  const sitesReels: Scenario[] = [];
  const casSupplementaires: Record<string, number> = {};

  const suivre = (unCas: Scenario, sortie: Sortie, rendus: readonly Verdict[]) => {
    verdicts.push(...rendus);
    cas.push(rendre(unCas, sortie, rendus));
    for (const collision of collisionsSansQuestion(sortie)) {
      collisions.push({ cas: unCas.id, strate: unCas.strate, nature: unCas.strate === 'S13' ? unCas.terme : unCas.operateur, noms: collision.ids.map((id) => sortie.nomsParId.get(id) ?? id), motif: 'motif' in collision ? String((collision as { motif?: string }).motif) : 'noms identiques' });
    }
  };

  for (const strate of demandees) {
    if (strate === 'S16') {
      // S16 se juge par passes : le tirage d'un cas sur dix se fait sur les passes, pas sur les sites d'une passe
      for (const unCas of genererLesScenarios(contexte, { strates: ['S16'] })) {
        hachage.update(JSON.stringify([unCas.id, unCas.noms, unCas.attendus, unCas.nonRenommables ?? null, unCas.site ?? null]));
        sitesReels.push(unCas);
      }
      continue;
    }
    etape(strate, () => {
      let compte = 0;
      for (const unCas of genererLesScenarios(contexte, { strates: [strate], rapide: options.rapide })) {
        hachage.update(JSON.stringify([unCas.id, unCas.noms, unCas.attendus, unCas.nonRenommables ?? null, unCas.site ?? null]));
        const sortie = executerUnCas(unCas);
        suivre(unCas, sortie, juger(unCas, sortie, ctx));
        compte++;
      }
      casParStrate[strate] = compte;
    });
    dire(`${strate} : ${casParStrate[strate]} cas`);
    const supplementaires = strate === 'S6' ? casDesGroupesValides(contexte, ctx.classements.groupes) : strate === 'S11' ? casDeBranches(contexte) : [];
    for (const [rang, unCas] of supplementaires.entries()) {
      if (options.rapide && rang % 10 !== 0) continue;
      const sortie = executerUnCas(unCas);
      suivre(unCas, sortie, juger(unCas, sortie, ctx));
      casSupplementaires[strate] = (casSupplementaires[strate] ?? 0) + 1;
    }
  }

  if (sitesReels.length > 0) {
    etape('S16', () => {
      const parId = new Map(systemes.map((systeme) => [systeme.id, systeme]));
      const toutes = regrouperLesPasses(sitesReels);
      const passes = options.rapide ? toutes.filter((_, rang) => rang % 10 === 0) : toutes;
      let compte = 0;
      for (const passe of passes) {
        const rendus = jugerUnePasse(passe, parId.get(passe.systeme)!, ctx);
        verdicts.push(...rendus);
        for (const [rang, unCas] of passe.cas.entries()) cas.push({ id: unCas.id, strate: 'S16', operateur: unCas.operateur, noms: 0, renommages: 0, collisions: 0, questions: [],
          verdicts: [{ proprietes: rendus[rang].proprietes, role: rendus[rang].role, issue: rendus[rang].issue, detail: rendus[rang].detail }] });
        compte += passe.cas.length;
      }
      casParStrate.S16 = compte;
    });
    dire(`S16 : ${casParStrate.S16} cas`);
  }

  const temoins = etape('temoins', () => executerLesTemoins(contexte, ctx));
  const squelettePur = verifierLeSqueletteSeul(contexte);
  const stabilite = options.strates ? undefined : etape('stabilite', () => verifierLaStabilite(systemes, options.rapide ? 10 : 100, options.graine));
  if (stabilite) dire(`P-21 : ${stabilite.p21.reussis}/${stabilite.fichiers}, P-22 : ${stabilite.p22.reussis}/${stabilite.fichiers}`);

  return {
    graine: options.graine, rapide: options.rapide, complet: !options.rapide && !options.strates, strates: demandees, empreinte: hachage.digest('hex'), version: versionDuKit(),
    casParStrate, casSupplementaires, verdicts, cas, temoins, squelette: squelettePur, stabilite, collisionsSansQuestion: collisions,
    dureeMs: Date.now() - debut, dureeParEtape,
  };
}

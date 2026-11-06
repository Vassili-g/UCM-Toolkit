/**
 * Faux positifs et seuil de longueur du stress test F1 (plan F1, section 4) : exécute le kit sur les 64 passes du corpus de noms
 * justes (16 systèmes × 4 variantes), classe chaque question et chaque renommage en FP-A à FP-D, et mesure la courbe du seuil L.
 * Chaque passe exclut le système testé du dictionnaire (validation par exclusion), pour que FP-A ne se nourrisse pas du fichier jugé.
 *
 * Deux mesures de L se complètent. La règle voulue par D1 et D2 (détecteur sans dictionnaire, sans seuil de fréquence) compte les
 * mots du corpus que L seul protège : c'est la colonne que la règle Q-F4 lit. Le kit tel qu'il est ne lit pas L de la même façon, car
 * `LONGUEUR_MINIMALE_D_UNE_FAUTE` règle son découpage des mots collés : des processus enfants le mesurent pour chaque L avec le
 * chargeur `seuil.mjs`, qui réécrit la constante en mémoire.
 */
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { Question } from '../../../src/referentiel/index.js';
import { motsAnglaisConnus, remplacerLesMotsConnus } from '../../../src/referentiel/mots-connus.js';
import { varianteConnue } from '../../../src/referentiel/termes-connus.js';
import { segmentsParSysteme } from '../../../scripts/generer-mots-connus.js';
import { convertir, MODES_DE_CHEMINS, MODES_DE_COLLECTIONS, RACINE_DU_DEPOT, type ModeDeChemins, type ModeDeCollections, type Systeme } from './corpus.js';
import { construireLeDictionnaire } from './dictionnaire.js';
import { creerLeDetecteur, motsDeDetection } from './detecteur.js';
import { calculer, executerUnCas, REGLES_DETECTEES } from './execution.js';
import { chargerLesClassements, clePaire, creerLeContexteOracle, juger, type Classements } from './oracle.js';
import { csv } from './rapport.js';
import { creerLeContexte, genererLesScenarios, PAIRES_DISTINCTES_ECRITES, type Contexte } from './scenarios.js';

export const LONGUEURS_DU_SEUIL = [3, 4, 5, 6, 7, 8, 9, 10] as const;
export const BUDGET_Q_F4 = 1;
export const PLAFOND_A_JUGER = 200;
const DOSSIER_DE_CE_FICHIER = fileURLToPath(new URL('.', import.meta.url));

export type Classe = 'FP-A' | 'FP-B' | 'FP-C' | 'FP-D';
export const CLASSES: readonly Classe[] = ['FP-A', 'FP-B', 'FP-C', 'FP-D'];
/** Les classes que le plan compte comme faux positifs certains (4.1). */
export const CERTAINES: ReadonlySet<Classe> = new Set<Classe>(['FP-A', 'FP-C']);

export type TypeDeSortie =
  | 'faute' | 'synonymes' | 'abreviation' | 'terminaison' | 'pluriel' | 'branches-paralleles' | 'ecriture-proche' | 'mots-colles' | 'collection'
  | 'renommage-mot' | 'renommage-ecriture';
export const TYPES_DE_SORTIE: readonly TypeDeSortie[] = [
  'faute', 'synonymes', 'abreviation', 'terminaison', 'pluriel', 'branches-paralleles', 'ecriture-proche', 'mots-colles', 'collection', 'renommage-mot', 'renommage-ecriture',
];

export interface Passe { readonly systeme: Systeme; readonly chemins: ModeDeChemins; readonly collections: ModeDeCollections; readonly cle: string }

/** Les 64 passes : chaque système dans ses quatre variantes. `rapide` garde la variante `tirets/couche`, soit 16 passes. */
export function passesDuCorpus(systemes: readonly Systeme[], rapide = false): Passe[] {
  return systemes.flatMap((systeme) => MODES_DE_CHEMINS.flatMap((chemins) => MODES_DE_COLLECTIONS.map((collections) => ({ systeme, chemins, collections, cle: `${systeme.id}/${chemins}/${collections}` }))))
    .filter((passe) => !rapide || (passe.chemins === 'tirets' && passe.collections === 'couche'));
}

// ---------------------------------------------------------------------------------------------------------------- contexte de classement

export interface ContexteDeClassement {
  readonly vocabulaire: ReadonlySet<string>;
  readonly classements: Classements;
  /** Les paires de `distincts.json` qui sont de vrais mots distincts, hors témoin de faute. */
  readonly distinctsEcrits: ReadonlySet<string>;
}

function lireLesDistincts(dossier = join(DOSSIER_DE_CE_FICHIER, 'donnees')): Set<string> {
  const { paires, temoinsDeFaute } = JSON.parse(readFileSync(join(dossier, 'distincts.json'), 'utf8')) as { paires: [string, string][]; temoinsDeFaute: [string, string][] };
  const temoins = new Set(temoinsDeFaute.map(([a, b]) => clePaire(a, b)));
  return new Set(paires.map(([a, b]) => clePaire(a, b)).filter((cle) => !temoins.has(cle)));
}

export function creerLeContexteDeClassement(scenarios: Contexte, classements: Classements = chargerLesClassements()): ContexteDeClassement {
  return { vocabulaire: scenarios.vocabulaire.termes, classements, distinctsEcrits: lireLesDistincts() };
}

/** Ce que la passe sait du système testé : le dictionnaire des autres systèmes, et les mots qui ne désignent qu'un composant ou une palette. */
export interface ContexteDePasse {
  readonly dictionnaireDesAutres: ReadonlySet<string>;
  readonly nomsPropres: ReadonlySet<string>;
  readonly noms: ReadonlyMap<string, string>;
}

const dictionnairesDesAutres = new Map<string, Set<string>>();
export function dictionnaireSans(systemes: readonly Systeme[], id: string): ReadonlySet<string> {
  let mots = dictionnairesDesAutres.get(id);
  if (!mots) {
    mots = new Set(construireLeDictionnaire(systemes.filter((systeme) => systeme.id !== id)).mots.map((entree) => entree.mot));
    dictionnairesDesAutres.set(id, mots);
  }
  return mots;
}

/** Un mot est un nom propre quand tous ses emplois sont le premier segment d'un nom de `components` ou de `primitives` : un composant ou une palette. */
function nomsPropresDe(inventaire: ReturnType<typeof convertir>['inventaire']): Set<string> {
  const propres = new Set<string>(), ailleurs = new Set<string>();
  for (const entree of inventaire.entrees) {
    if (entree.nom.categorie !== 'variables') continue;
    const collection = entree.contexte?.collection;
    entree.nom.nom.split('/').forEach((segment, rang) => {
      for (const mot of motsDeDetection(segment)) (rang === 0 && (collection === 'components' || collection === 'primitives') ? propres : ailleurs).add(mot);
    });
  }
  for (const mot of ailleurs) propres.delete(mot);
  return propres;
}

// ---------------------------------------------------------------------------------------------------------------- classement

export interface SortieAClasser {
  readonly type: TypeDeSortie;
  /** Les mots que la sortie met en cause. */
  readonly signales: readonly string[];
  /** Le mot ou les mots vers lesquels elle renvoie. */
  readonly references: readonly string[];
  /** La paire quand la sortie en compare deux. */
  readonly paire?: readonly [string, string];
}

/**
 * Le classement du plan (4.1), dans l'ordre : une paire classée par `formes.json` ou `distincts.json` suit son classement ;
 * FP-B quand tous les mots signalés sont du vocabulaire (forme tolérée, synonyme, abréviation) ou que la sortie est un renommage
 * d'écriture ou une question de collection ; FP-C quand les mots hors vocabulaire ne désignent qu'un composant ou une palette ;
 * FP-A quand ces mots et leur référence sont attestés dans le dictionnaire des autres systèmes ; sinon FP-D.
 */
export function classer(sortie: SortieAClasser, contexte: ContexteDeClassement, passe: Pick<ContexteDePasse, 'dictionnaireDesAutres' | 'nomsPropres'>): { classe: Classe; motif: string } {
  if (sortie.type === 'renommage-ecriture') return { classe: 'FP-B', motif: 'renommage d\'écriture attendu' };
  if (sortie.type === 'collection') return { classe: 'FP-B', motif: 'collection hors UCM : la question est voulue' };
  if (sortie.paire) {
    const cle = clePaire(sortie.paire[0], sortie.paire[1]);
    if (contexte.classements.motsDistincts.has(cle) || contexte.distinctsEcrits.has(cle)) return { classe: 'FP-A', motif: 'mots distincts classés' };
    if (contexte.classements.memeMot.has(cle)) return { classe: 'FP-B', motif: 'formes d\'un même mot classées' };
  }
  const horsVocabulaire = sortie.signales.filter((mot) => !contexte.vocabulaire.has(mot));
  if (horsVocabulaire.length === 0) return { classe: 'FP-B', motif: 'forme ou synonyme du vocabulaire' };
  if (horsVocabulaire.every((mot) => passe.nomsPropres.has(mot))) return { classe: 'FP-C', motif: 'nom de composant ou de palette' };
  const atteste = (mot: string) => passe.dictionnaireDesAutres.has(mot) || contexte.vocabulaire.has(mot);
  if (horsVocabulaire.every((mot) => passe.dictionnaireDesAutres.has(mot)) && sortie.references.every(atteste)) return { classe: 'FP-A', motif: 'mots attestés dans les autres systèmes' };
  return { classe: 'FP-D', motif: 'mot attesté seulement dans ce système' };
}

export function sortieDeLaQuestion(question: Question): SortieAClasser {
  switch (question.type) {
    case 'paire': return { type: question.indice, signales: question.termes.map((terme) => terme.mot.toLowerCase()), references: [], paire: [question.termes[0].mot, question.termes[1].mot] };
    case 'ecriture-du-terme':
      return { type: question.indice === 'faute' ? 'faute' : 'mots-colles', signales: [question.terme.mot.toLowerCase()], references: question.reference ? [question.reference.mot.toLowerCase()] : question.proposition.map((mot) => mot.toLowerCase()) };
    case 'collection': return { type: 'collection', signales: [question.nom.toLowerCase()], references: [] };
  }
}

function exemplesDe(question: Question, noms: ReadonlyMap<string, string>): string[] {
  const ids = question.type === 'paire' ? question.termes.map((terme) => terme.exemples[0]) : question.type === 'ecriture-du-terme' ? question.terme.exemples.slice(0, 2) : [];
  const rendus = ids.filter(Boolean).map((id) => noms.get(id) ?? id);
  return question.type === 'collection' ? [question.nom] : rendus;
}

export interface LigneDeFauxPositif {
  readonly passe: string;
  readonly systeme: string;
  readonly type: TypeDeSortie;
  readonly classe: Classe;
  readonly score: number | undefined;
  readonly mot: string;
  readonly reference: string;
  /** Le nombre de sorties que la ligne regroupe : 1 pour une question, davantage pour des renommages du même mot. */
  readonly nombre: number;
  readonly exemples: readonly string[];
  readonly motif: string;
}

export interface ResultatDePasse {
  readonly passe: string;
  readonly noms: number;
  readonly lignes: readonly LigneDeFauxPositif[];
}

const multiensemble = (mots: readonly string[]): Map<string, number> => mots.reduce((m, mot) => m.set(mot, (m.get(mot) ?? 0) + 1), new Map<string, number>());
const lettresSeules = (nom: string): string => nom.replace(/[^a-z]/gi, '').toLowerCase();
function differenceDeMots(avant: string, apres: string): { retires: string[]; ajoutes: string[] } {
  // mêmes lettres dans le même ordre : seuls la casse et les séparateurs changent (`screenLGMax` devient `screenLgMax`)
  if (lettresSeules(avant) === lettresSeules(apres)) return { retires: [], ajoutes: [] };
  const a = multiensemble(motsDeDetection(avant)), b = multiensemble(motsDeDetection(apres));
  const retires: string[] = [], ajoutes: string[] = [];
  for (const [mot, n] of a) for (let i = 0; i < n - (b.get(mot) ?? 0); i++) retires.push(mot);
  for (const [mot, n] of b) for (let i = 0; i < n - (a.get(mot) ?? 0); i++) ajoutes.push(mot);
  return { retires, ajoutes };
}

let segmentsDesSystemes: Map<string, string[]> | undefined;
/**
 * Les mots connus du kit pour la passe d'un système (E15.4) : les mots anglais, et les segments de tous les autres design systems.
 * Sans cette exclusion, les mots du système mesuré seraient dans le dictionnaire du kit et la mesure des fautes de 4 à 6 lettres serait circulaire.
 */
export function motsConnusSans(id: string): string[] {
  segmentsDesSystemes ??= segmentsParSysteme();
  return [...motsAnglaisConnus(), ...[...segmentsDesSystemes].filter(([systeme]) => systeme !== id).flatMap(([, segments]) => segments)];
}

/** Une passe : le calcul du kit sur le système converti, puis le classement de chaque question et de chaque renommage. */
export function executerUnePasse(passe: Passe, systemes: readonly Systeme[], contexte: ContexteDeClassement): ResultatDePasse {
  const converti = convertir(passe.systeme, passe.chemins, passe.collections);
  remplacerLesMotsConnus(motsConnusSans(passe.systeme.id));
  const calcul = (() => { try { return calculer(converti.inventaire, REGLES_DETECTEES); } finally { remplacerLesMotsConnus(); } })();
  const du = { dictionnaireDesAutres: dictionnaireSans(systemes, passe.systeme.id), nomsPropres: nomsPropresDe(converti.inventaire) };
  const lignes: LigneDeFauxPositif[] = [];
  for (const question of calcul.questions) {
    const sortie = sortieDeLaQuestion(question);
    const { classe, motif } = classer(sortie, contexte, du);
    lignes.push({
      passe: passe.cle, systeme: passe.systeme.id, type: sortie.type, classe, score: question.score, mot: sortie.paire ? sortie.paire[0] : sortie.signales[0],
      reference: sortie.paire ? sortie.paire[1] : sortie.references.join('+'), nombre: 1, exemples: exemplesDe(question, calcul.nomsParId), motif,
    });
  }
  const groupes = new Map<string, { ligne: LigneDeFauxPositif; nombre: number }>();
  for (const renommage of calcul.renommages) {
    const { retires, ajoutes } = differenceDeMots(renommage.ancienNom, renommage.nouveauNom);
    const ecriture = retires.length === 0 && ajoutes.length === 0;
    const sortie: SortieAClasser = { type: ecriture ? 'renommage-ecriture' : 'renommage-mot', signales: retires, references: ajoutes };
    const { classe, motif } = classer(sortie, contexte, du);
    const mot = retires.join('+'), reference = ajoutes.join('+');
    const cle = `${sortie.type}|${mot}|${reference}`;
    const existant = groupes.get(cle);
    if (existant) existant.nombre++;
    else groupes.set(cle, { nombre: 1, ligne: { passe: passe.cle, systeme: passe.systeme.id, type: sortie.type, classe, score: undefined, mot, reference, nombre: 1, exemples: [`${renommage.ancienNom} -> ${renommage.nouveauNom}`], motif } });
  }
  for (const { ligne, nombre } of groupes.values()) lignes.push({ ...ligne, nombre });
  return { passe: passe.cle, noms: converti.nombreDeNoms, lignes };
}

// ---------------------------------------------------------------------------------------------------------------- règle voulue, par longueur

/** `editions` : 1 pour une lettre (échange compris), 2 pour une faute de deux lettres (Q-F9). */
export interface CandidatDeLaRegle { readonly passe: string; readonly mot: string; readonly termes: readonly string[]; readonly longueur: number; readonly classe: Classe; readonly editions: 1 | 2 }

/**
 * La règle voulue sans dictionnaire (plan F1, 4.2) sur les mots de chaque passe : tout mot absent du vocabulaire et à une lettre ou un
 * échange d'un terme. Le dictionnaire sert ensuite au classement : un mot attesté ailleurs est FP-A, c'est-à-dire un mot que seul L
 * protégerait.
 */
export function candidatsDeLaRegle(passes: readonly Passe[], systemes: readonly Systeme[], scenarios: Contexte, contexte: ContexteDeClassement): { candidats: CandidatDeLaRegle[]; noms: number } {
  const detecteur = creerLeDetecteur(scenarios.vocabulaire, new Set());
  const candidats: CandidatDeLaRegle[] = [];
  let noms = 0;
  for (const passe of passes) {
    const converti = convertir(passe.systeme, passe.chemins, passe.collections);
    noms += converti.nombreDeNoms;
    const du = { dictionnaireDesAutres: dictionnaireSans(systemes, passe.systeme.id), nomsPropres: nomsPropresDe(converti.inventaire) };
    const mots = new Set<string>();
    for (const entree of converti.inventaire.entrees) if (entree.nom.categorie === 'variables') for (const mot of motsDeDetection(entree.nom.nom)) mots.add(mot);
    for (const mot of [...mots].sort()) {
      const aUneLettre = detecteur.termesProches(mot);
      const termes = aUneLettre.length > 0 ? aUneLettre : detecteur.termesADeuxEditions(mot);
      if (termes.length === 0) continue;
      const { classe } = classer({ type: 'faute', signales: [mot], references: termes }, contexte, du);
      candidats.push({ passe: passe.cle, mot, termes, longueur: mot.length, classe, editions: aUneLettre.length > 0 ? 1 : 2 });
    }
  }
  return { candidats, noms };
}

export interface MesureDuKit {
  readonly seuil: number | 'defaut';
  readonly noms: number;
  readonly certains: number;
  readonly parType: Readonly<Record<string, number>>;
  readonly s1: { readonly attendus: number; readonly detectes: number };
  readonly s10: { readonly attendus: number; readonly detectes: number };
  /** Les segments soudés avec une faute de S9 (P-16) : ceux que le seuil de découpage de `termes-connus.ts` règle. */
  readonly s9: { readonly attendus: number; readonly detectes: number };
  readonly s15: { readonly attendus: number; readonly fauxPositifs: number };
  /** `colon` (5 lettres) est une faute connue de `color` si et seulement si le seuil de découpage vaut 5 ou moins : la preuve que le chargeur a réécrit la constante. */
  readonly sonde: boolean;
}

/** Le kit tel qu'il est chargé dans ce processus : passes du corpus, puis S1, S10 et S15. Un processus enfant l'appelle pour chaque L. */
export function mesurerLeKit(systemes: readonly Systeme[], graine: number, rapide: boolean): MesureDuKit {
  const scenarios = creerLeContexte(systemes, graine);
  const contexte = creerLeContexteDeClassement(scenarios);
  let noms = 0, certains = 0;
  const parType: Record<string, number> = {};
  for (const passe of passesDuCorpus(systemes, rapide)) {
    const resultat = executerUnePasse(passe, systemes, contexte);
    noms += resultat.noms;
    for (const ligne of resultat.lignes) if (CERTAINES.has(ligne.classe)) { certains += ligne.nombre; parType[ligne.type] = (parType[ligne.type] ?? 0) + ligne.nombre; }
  }
  const ctx = creerLeContexteOracle(scenarios, creerLeDetecteur(scenarios.vocabulaire, scenarios.motsDuDictionnaire));
  const mesure = { s1: { attendus: 0, detectes: 0 }, s9: { attendus: 0, detectes: 0 }, s10: { attendus: 0, detectes: 0 }, s15: { attendus: 0, fauxPositifs: 0 } };
  for (const strate of ['S1', 'S9', 'S10', 'S15'] as const) {
    for (const cas of genererLesScenarios(scenarios, { strates: [strate], rapide })) {
      for (const verdict of juger(cas, executerUnCas(cas), ctx)) {
        if (verdict.role !== 'oracle') continue;
        if (strate === 'S15') { mesure.s15.attendus++; if (verdict.issue === 'faux-positif') mesure.s15.fauxPositifs++; continue; }
        if (strate === 'S9' && !verdict.proprietes.includes('P-16')) continue;
        const cible = strate === 'S1' ? mesure.s1 : strate === 'S9' ? mesure.s9 : mesure.s10;
        cible.attendus++;
        if (verdict.issue === 'detecte') cible.detectes++;
      }
    }
  }
  const demande = process.env.STRESS_F1_SEUIL;
  return { seuil: demande === undefined ? 'defaut' : Number(demande), noms, certains, parType, ...mesure, sonde: varianteConnue('colon') };
}

/** Lance `mesurerLeKit` dans un processus enfant dont le chargeur `seuil.mjs` règle la constante de découpage. */
function mesurerLeKitAuSeuil(longueur: number, index: string, graine: number, rapide: boolean): Promise<MesureDuKit> {
  return new Promise((resolve, reject) => {
    const enfant = spawn(process.execPath, ['--import', 'tsx', '--import', pathToFileURL(join(DOSSIER_DE_CE_FICHIER, 'seuil.mjs')).href, index, '--mesure-du-seuil', '--graine', String(graine), ...(rapide ? ['--rapide'] : [])], {
      cwd: RACINE_DU_DEPOT, env: { ...process.env, STRESS_F1_SEUIL: String(longueur) },
    });
    let sortie = '', erreur = '';
    enfant.stdout.on('data', (morceau) => { sortie += morceau; });
    enfant.stderr.on('data', (morceau) => { erreur += morceau; });
    enfant.on('close', (code) => {
      if (code !== 0) return reject(new Error(`La mesure du seuil ${longueur} a échoué (code ${code}) : ${erreur.trim().split('\n').slice(0, 3).join(' ') || sortie.trim()}`));
      const ligne = sortie.trim().split('\n').reverse().find((texte) => texte.startsWith('{"seuil"'));
      if (!ligne) return reject(new Error(`La mesure du seuil ${longueur} n'a rien rendu.`));
      resolve(JSON.parse(ligne) as MesureDuKit);
    });
  });
}

// ---------------------------------------------------------------------------------------------------------------- courbe

export interface LigneDeCourbe {
  readonly longueur: number;
  /** Fautes de S1 dont le mot fautif a au moins L lettres, et celles que le détecteur de mesure retient. */
  readonly attendues: number;
  readonly detectees: number;
  /** Les termes du vocabulaire de moins de L lettres, que la règle ne couvre plus. */
  readonly termesPerdus: number;
  readonly exemplesPerdus: string;
  /** Règle voulue sans dictionnaire, sur les 64 passes : mots FP-A ou FP-C de L lettres ou plus. */
  readonly fauxPositifsCertains: number;
  readonly fauxPositifsPourMille: number;
  /** Même mesure pour les fautes de deux lettres (Q-F9) : mots FP-A ou FP-C de L lettres ou plus à deux éditions d'un terme, sans terme à une lettre. */
  readonly fauxPositifsDeuxLettres: number;
  readonly fauxPositifsDeuxLettresPourMille: number;
  /** Mots FP-D, soumis au mainteneur. */
  readonly aJuger: number;
  /** Paires de mots distincts légitimes (S15 : dictionnaire classé et liste écrite) que la règle sans dictionnaire signalerait. */
  readonly pairesDistinctesSignalees: number;
  readonly pairesDistinctes: number;
  readonly kit: MesureDuKit | undefined;
}

function pairesDistinctes(contexte: ContexteDeClassement, scenarios: Contexte): [string, string][] {
  const vues = new Set<string>();
  const rendues: [string, string][] = [];
  const ajouter = (a: string, b: string) => { const cle = clePaire(a, b); if (!vues.has(cle)) { vues.add(cle); rendues.push([a, b]); } };
  for (const [a, b] of PAIRES_DISTINCTES_ECRITES) if (contexte.distinctsEcrits.has(clePaire(a, b))) ajouter(a, b);
  for (const cle of contexte.classements.motsDistincts) { const [a, b] = cle.split('|'); if (scenarios.motsDuDictionnaire.has(a) && scenarios.motsDuDictionnaire.has(b)) ajouter(a, b); }
  return rendues;
}

export function courbeDuSeuil(scenarios: Contexte, contexte: ContexteDeClassement, candidats: { candidats: CandidatDeLaRegle[]; noms: number }, kits: ReadonlyMap<number, MesureDuKit>): LigneDeCourbe[] {
  const sansDictionnaire = creerLeDetecteur(scenarios.vocabulaire, new Set());
  const avecDictionnaire = creerLeDetecteur(scenarios.vocabulaire, scenarios.motsDuDictionnaire);
  const fautes = [...genererLesScenarios(scenarios, { strates: ['S1'] })].map((cas) => cas.attendus[0]);
  const paires = pairesDistinctes(contexte, scenarios);
  return LONGUEURS_DU_SEUIL.map((longueur) => {
    const attendues = fautes.filter((attendu) => attendu.mot!.length >= longueur);
    const perdus = scenarios.termesCibles.filter((terme) => terme.length < longueur);
    const retenus = candidats.candidats.filter((candidat) => candidat.longueur >= longueur);
    const certains = retenus.filter((candidat) => candidat.editions === 1 && CERTAINES.has(candidat.classe)).length;
    const certainsDeux = retenus.filter((candidat) => candidat.editions === 2 && CERTAINES.has(candidat.classe)).length;
    return {
      longueur, attendues: attendues.length, detectees: attendues.filter((attendu) => avecDictionnaire.confirme(attendu.mot!, attendu.reference!)).length,
      termesPerdus: perdus.length, exemplesPerdus: perdus.slice(0, 6).join(' '),
      fauxPositifsCertains: certains, fauxPositifsPourMille: Math.round((certains / candidats.noms) * 1000 * 100) / 100,
      fauxPositifsDeuxLettres: certainsDeux, fauxPositifsDeuxLettresPourMille: Math.round((certainsDeux / candidats.noms) * 1000 * 100) / 100,
      aJuger: retenus.filter((candidat) => candidat.editions === 1 && candidat.classe === 'FP-D').length,
      pairesDistinctesSignalees: paires.filter(([a, b]) => [a, b].some((mot) => mot.length >= longueur && sansDictionnaire.termesProches(mot).length > 0)).length,
      pairesDistinctes: paires.length, kit: kits.get(longueur),
    };
  });
}

/** Q-F4 : la plus petite longueur dont les faux positifs certains du corpus restent sous le budget pour 1 000 noms. */
export function longueurRetenue(courbe: readonly LigneDeCourbe[], budget = BUDGET_Q_F4): number | undefined {
  return courbe.find((ligne) => ligne.fauxPositifsPourMille < budget)?.longueur;
}

/** Q-F9 : la plus petite longueur dont les faux positifs certains de deux lettres restent sous le même budget, et jamais sous celle d'une lettre. */
export function longueurRetenueDeDeuxLettres(courbe: readonly LigneDeCourbe[], budget = BUDGET_Q_F4): number | undefined {
  const unelettre = longueurRetenue(courbe, budget) ?? 0;
  return courbe.find((ligne) => ligne.longueur >= unelettre && ligne.fauxPositifsDeuxLettresPourMille < budget)?.longueur;
}

/** La règle d'origine du plan (4.3) : zéro faux positif certain sur le corpus et sur S15. */
export function longueurSansFauxPositif(courbe: readonly LigneDeCourbe[]): number | undefined {
  return courbe.find((ligne) => ligne.fauxPositifsCertains === 0 && ligne.pairesDistinctesSignalees === 0)?.longueur;
}

// ---------------------------------------------------------------------------------------------------------------- mesure complète

export interface OptionsDesFauxPositifs {
  readonly rapide: boolean;
  readonly graine: number;
  readonly index: string;
  readonly progression?: (message: string) => void;
}

/** E15.4 : les questions de faute du kit sur les noms justes, pour les mots de 4 à 6 lettres, dictionnaire sans le système mesuré. */
export interface FautesCourtes {
  readonly longueur: number;
  /** Lignes de faute classées FP-A ou FP-C : une par passe et par question, comme les autres comptes de ce fichier. */
  readonly certains: number;
  readonly pourMille: number;
  readonly mots: readonly string[];
}
export const LONGUEURS_DES_MOTS_COURTS = [4, 5, 6] as const;

export function fautesCourtesParLongueur(lignes: readonly LigneDeFauxPositif[], noms: number): FautesCourtes[] {
  return LONGUEURS_DES_MOTS_COURTS.map((longueur) => {
    const retenues = lignes.filter((ligne) => ligne.type === 'faute' && CERTAINES.has(ligne.classe) && [...ligne.mot].length === longueur);
    const certains = retenues.reduce((somme, ligne) => somme + ligne.nombre, 0);
    return { longueur, certains, pourMille: noms === 0 ? 0 : Math.round((certains / noms) * 1000 * 100) / 100, mots: [...new Set(retenues.map((ligne) => `${ligne.mot}->${ligne.reference} (${ligne.systeme})`))].sort() };
  });
}

export interface MesureDesFauxPositifs {
  readonly passes: number;
  readonly noms: number;
  readonly lignes: readonly LigneDeFauxPositif[];
  readonly fautesCourtes?: readonly FautesCourtes[];
  readonly courbe: readonly LigneDeCourbe[];
  readonly retenue: number | undefined;
  /** Seuil des fautes de deux lettres (Q-F9). */
  readonly retenueDeDeuxLettres?: number | undefined;
  readonly sansFauxPositif: number | undefined;
  readonly dureeMs: number;
}

export async function mesurerLesFauxPositifs(systemes: readonly Systeme[], options: OptionsDesFauxPositifs): Promise<MesureDesFauxPositifs> {
  const debut = Date.now();
  const dire = options.progression ?? (() => undefined);
  const scenarios = creerLeContexte(systemes, options.graine);
  const contexte = creerLeContexteDeClassement(scenarios);
  const passes = passesDuCorpus(systemes, options.rapide);
  // les enfants démarrent d'abord : ils tournent pendant que ce processus classe ses propres passes
  const enfants = Promise.all(LONGUEURS_DU_SEUIL.map((longueur) => mesurerLeKitAuSeuil(longueur, options.index, options.graine, options.rapide)));
  enfants.catch(() => undefined);
  const lignes: LigneDeFauxPositif[] = [];
  let noms = 0;
  for (const passe of passes) {
    const resultat = executerUnePasse(passe, systemes, contexte);
    noms += resultat.noms;
    lignes.push(...resultat.lignes);
  }
  dire(`faux positifs : ${passes.length} passes, ${noms} noms, ${lignes.length} lignes`);
  const candidats = candidatsDeLaRegle(passes, systemes, scenarios, contexte);
  const mesures = await enfants;
  const courbe = courbeDuSeuil(scenarios, contexte, candidats, new Map(mesures.map((mesure, rang) => [LONGUEURS_DU_SEUIL[rang], mesure])));
  dire(`seuil : ${LONGUEURS_DU_SEUIL.length} longueurs, L retenu ${longueurRetenue(courbe) ?? 'aucun'} (une lettre), ${longueurRetenueDeDeuxLettres(courbe) ?? 'aucun'} (deux lettres)`);
  return { passes: passes.length, noms, lignes, fautesCourtes: fautesCourtesParLongueur(lignes, noms), courbe, retenue: longueurRetenue(courbe), retenueDeDeuxLettres: longueurRetenueDeDeuxLettres(courbe), sansFauxPositif: longueurSansFauxPositif(courbe), dureeMs: Date.now() - debut };
}

// ---------------------------------------------------------------------------------------------------------------- sorties

export function comptesParClasseEtType(lignes: readonly LigneDeFauxPositif[]): Map<TypeDeSortie, Record<Classe, number>> {
  const comptes = new Map<TypeDeSortie, Record<Classe, number>>();
  for (const type of TYPES_DE_SORTIE) comptes.set(type, { 'FP-A': 0, 'FP-B': 0, 'FP-C': 0, 'FP-D': 0 });
  for (const ligne of lignes) comptes.get(ligne.type)![ligne.classe] += ligne.nombre;
  return comptes;
}

function fauxPositifsCsv(lignes: readonly LigneDeFauxPositif[]): string {
  return `${[csv(['passe', 'type', 'classe', 'score', 'mot', 'reference', 'nombre', 'exemple_1', 'exemple_2', 'motif']),
    ...lignes.map((l) => csv([l.passe, l.type, l.classe, l.score, l.mot, l.reference, l.nombre, l.exemples[0], l.exemples[1], l.motif]))].join('\n')}\n`;
}

/** Les lignes FP-D, une par système, type, mot et référence (les quatre variantes d'un système répètent la même question), par score décroissant. */
export function lignesAJuger(lignes: readonly LigneDeFauxPositif[], plafond = PLAFOND_A_JUGER): (LigneDeFauxPositif & { passes: number })[] {
  const groupes = new Map<string, LigneDeFauxPositif & { passes: number }>();
  for (const ligne of lignes) {
    if (ligne.classe !== 'FP-D') continue;
    const cle = [ligne.systeme, ligne.type, ligne.mot, ligne.reference].join('|');
    const existante = groupes.get(cle);
    if (existante) groupes.set(cle, { ...existante, passes: existante.passes + 1, score: Math.max(existante.score ?? 0, ligne.score ?? 0) });
    else groupes.set(cle, { ...ligne, passes: 1 });
  }
  return [...groupes.values()].sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || b.nombre - a.nombre || a.systeme.localeCompare(b.systeme) || a.mot.localeCompare(b.mot)).slice(0, plafond);
}

function aJugerCsv(lignes: readonly LigneDeFauxPositif[]): string {
  return `${[csv(['systeme', 'type', 'score', 'mot', 'reference', 'nombre', 'passes', 'exemple_1', 'exemple_2']),
    ...lignesAJuger(lignes).map((l) => csv([l.systeme, l.type, l.score, l.mot, l.reference, l.nombre, l.passes, l.exemples[0], l.exemples[1]]))].join('\n')}\n`;
}

function tauxCsv(mesure: MesureDesFauxPositifs): string {
  const comptes = comptesParClasseEtType(mesure.lignes);
  const mille = (n: number) => Math.round((n / mesure.noms) * 1000 * 100) / 100;
  return `${[csv(['type', 'FP-A', 'FP-B', 'FP-C', 'FP-D', 'total', 'certains_pour_1000_noms', 'total_pour_1000_noms']),
    ...[...comptes].map(([type, c]) => csv([type, c['FP-A'], c['FP-B'], c['FP-C'], c['FP-D'], c['FP-A'] + c['FP-B'] + c['FP-C'] + c['FP-D'], mille(c['FP-A'] + c['FP-C']), mille(c['FP-A'] + c['FP-B'] + c['FP-C'] + c['FP-D'])]))].join('\n')}\n`;
}

function courbeCsv(courbe: readonly LigneDeCourbe[]): string {
  return `${[csv(['L', 'fautes_attendues_S1', 'detectees_detecteur', 'termes_perdus', 'exemples_perdus', 'fp_certains_corpus', 'fp_certains_pour_1000_noms', 'fp_deux_lettres_certains', 'fp_deux_lettres_pour_1000_noms', 'fp_a_juger_corpus',
    'paires_distinctes_signalees_S15', 'paires_distinctes_S15', 'kit_noms', 'kit_fp_certains', 'kit_fp_certains_pour_1000_noms', 'kit_S1_detectees', 'kit_S1_attendues', 'kit_S9_soudes_detectees', 'kit_S9_soudes_attendues', 'kit_S10_detectees', 'kit_S10_attendues', 'kit_S15_faux_positifs', 'kit_sonde_colon_faute_connue']),
  ...courbe.map((l) => csv([l.longueur, l.attendues, l.detectees, l.termesPerdus, l.exemplesPerdus, l.fauxPositifsCertains, l.fauxPositifsPourMille, l.fauxPositifsDeuxLettres, l.fauxPositifsDeuxLettresPourMille, l.aJuger, l.pairesDistinctesSignalees, l.pairesDistinctes,
    l.kit?.noms, l.kit?.certains, l.kit ? Math.round((l.kit.certains / l.kit.noms) * 1000 * 100) / 100 : undefined, l.kit?.s1.detectes, l.kit?.s1.attendus, l.kit?.s9.detectes, l.kit?.s9.attendus, l.kit?.s10.detectes, l.kit?.s10.attendus, l.kit?.s15.fauxPositifs, l.kit ? String(l.kit.sonde) : undefined]))].join('\n')}\n`;
}

/** Écrit les quatre fichiers sous le dossier de sortie (`_local/stress/f1-noms/` par défaut). */
export function ecrireLesFauxPositifs(mesure: MesureDesFauxPositifs, dossier: string): void {
  mkdirSync(dossier, { recursive: true });
  writeFileSync(join(dossier, 'faux-positifs.csv'), fauxPositifsCsv(mesure.lignes), 'utf8');
  writeFileSync(join(dossier, 'a-juger.csv'), aJugerCsv(mesure.lignes), 'utf8');
  writeFileSync(join(dossier, 'courbe-seuil.csv'), courbeCsv(mesure.courbe), 'utf8');
  writeFileSync(join(dossier, 'faux-positifs-par-type.csv'), tauxCsv(mesure), 'utf8');
}

/** Les deux tableaux de `rapport.md` : classes par type de sortie, puis la courbe du seuil. */
export function sectionDuRapport(mesure: MesureDesFauxPositifs): string {
  const table = (entete: readonly string[], rangees: readonly (readonly (string | number)[])[]) => [entete, entete.map(() => '---'), ...rangees].map((ligne) => `| ${ligne.join(' | ')} |`).join('\n');
  const comptes = comptesParClasseEtType(mesure.lignes);
  const mille = (n: number) => Math.round((n / mesure.noms) * 1000 * 100) / 100;
  const types = table(['Type de sortie', 'FP-A', 'FP-B', 'FP-C', 'FP-D', 'Certains pour 1 000 noms'],
    [...comptes].map(([type, c]) => [type, c['FP-A'], c['FP-B'], c['FP-C'], c['FP-D'], mille(c['FP-A'] + c['FP-C'])]));
  const courbe = table(['L', 'Fautes attendues (S1)', 'Détectées', 'Termes perdus', 'FP certains (règle voulue)', 'Pour 1 000 noms', 'FP certains à deux lettres', 'Pour 1 000 noms (deux lettres)', 'À juger', 'Paires S15 signalées', 'Kit : FP certains', 'Kit : S9 soudés', 'Kit : S10 détectées', 'Kit : S15 FP', 'Sonde colon'],
    mesure.courbe.map((l) => [l.longueur, l.attendues, l.detectees, l.termesPerdus, l.fauxPositifsCertains, l.fauxPositifsPourMille, l.fauxPositifsDeuxLettres, l.fauxPositifsDeuxLettresPourMille, l.aJuger, `${l.pairesDistinctesSignalees} / ${l.pairesDistinctes}`,
      l.kit?.certains ?? '.', l.kit ? `${l.kit.s9.detectes} / ${l.kit.s9.attendus}` : '.', l.kit ? `${l.kit.s10.detectes} / ${l.kit.s10.attendus}` : '.', l.kit?.s15.fauxPositifs ?? '.', l.kit ? (l.kit.sonde ? 'connu' : 'inconnu') : '.']));
  return [
    `${mesure.passes} passes, ${mesure.noms} noms, ${mesure.lignes.length} lignes de sortie (${(mesure.dureeMs / 1000).toFixed(1)} s).`, '', types, '',
    `La règle Q-F4 retient L = ${mesure.retenue ?? 'aucun (le budget n\'est tenu pour aucune longueur de 3 à 8)'} : la plus petite longueur sous ${BUDGET_Q_F4} faux positif certain pour 1 000 noms.`,
    `La règle Q-F9 retient L = ${mesure.retenueDeDeuxLettres ?? 'aucun'} pour une faute de deux lettres, avec le même budget et sans descendre sous la longueur d'une lettre.`,
    `Zéro faux positif certain sur le corpus et sur S15 (règle d'origine du plan) : L = ${mesure.sansFauxPositif ?? 'aucun de 3 à 10'}.`, '', courbe, '',
    ...(mesure.fautesCourtes ? [
      'Fautes de 4 à 6 lettres du kit sur les noms justes (E15.4), dictionnaire sans le système mesuré, FP-A et FP-C :', '',
      table(['L', 'Faux positifs certains', 'Pour 1 000 noms', 'Mots'], mesure.fautesCourtes.map((l) => [l.longueur, l.certains, l.pourMille, l.mots.join(', ') || '.'])),
    ] : []),
  ].join('\n');
}

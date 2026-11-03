/**
 * Mesure du stress test F5 (variants et nommage des tokens, opérateurs simples). Il passe chaque cas dans les deux contrôles de la
 * portée, `controlerNommage` (C7 à C13) et `controlerOublis` (C31 à C33), le compare à son oracle et écrit
 * `_local/stress/f5-variants/operateurs.txt` et `operateurs.json` (dossier ignoré par Git). Il mesure aussi P0 et les 60 profils de
 * base (zéro constat, lecture complète des tokens). Les opérateurs A, V, Q, M et O rendent 270 cas sur P0.
 *
 *   npx tsx packages/kit/tests/stress/f5-variants/mesurer.ts [--operateur V1] [--cas V1-4] [--profil p07] [--graine 7105]
 *
 * `--operateur`, `--cas` et `--profil` filtrent et n'écrivent rien (le tableau va à l'écran), et `--cas` imprime en plus les constats
 * émis et l'oracle. Le rapport ne porte ni date ni durée, pour que deux exécutions donnent le même `.json` ; les durées vont à l'écran
 * et dans la section « Durées » du `.txt`. Le harnais ne corrige rien. Un écart du kit est un résultat, pas un échec, et une exception
 * levée par un contrôle est un écart (colonne « Exceptions ») que le harnais attrape sans s'arrêter.
 *
 * Un cas qui porte un budget de durée (M3) tourne jusqu'à dix fois ce budget : au-delà, le harnais l'abandonne et le note comme une
 * exception ; en deçà, un dépassement du budget est compté dans la colonne « Hors budget » et la comparaison à l'oracle a lieu.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Constat } from '../../../src/controles/index.js';
import { axeDePropriete, controlerNommageParEtapes } from '../../../src/controles/nommage.js';
import { controlerOublisParEtapes } from '../../../src/controles/oublis.js';
import { comparer } from '../commun/comparer.js';
import type { Ecart, ResultatDuCas, SorteDEcart } from '../commun/types.js';
import { cleDeConstat, HYPOTHESES, type CasDeVariants } from './cas.js';
import { composantP0, constatsDeLaPortee, GRAINE_PAR_DEFAUT, verifierLaLecture } from './composantDeBase.js';
import { tousLesCas } from './operateurs.js';
import { PROFILS, composantDuProfil, type ProfilDeVariants } from './profils.js';

const messageDe = (erreur: unknown): string => (erreur instanceof Error ? erreur.message : String(erreur));

/** Conduit un contrôle pas à pas et l'abandonne au-delà de la limite. */
function conduire<T>(calcul: Generator<void, T>, limiteMs: number): { valeur: T } | { abandonne: true } {
  const fin = Date.now() + limiteMs;
  let pas = 0;
  let etape = calcul.next();
  while (!etape.done) {
    pas += 1;
    if ((pas & 1023) === 0 && Date.now() > fin) return { abandonne: true };
    etape = calcul.next();
  }
  return { valeur: etape.value };
}

interface Mesure {
  readonly cas: CasDeVariants;
  readonly emis: readonly Constat[];
  readonly resultat: ResultatDuCas;
  readonly exception?: string;
  readonly duree: number;
  readonly horsBudget: boolean;
}

const sortesDe = (resultat: ResultatDuCas, ...sortes: SorteDEcart[]): number => resultat.ecarts.filter((ecart) => sortes.includes(ecart.sorte)).length;

function mesurerLaLecture(cas: CasDeVariants): Mesure {
  const { nom, attendu } = cas.entree.lecture!;
  const lu = axeDePropriete(nom);
  const ecarts: Ecart[] = [];
  if (attendu !== undefined && lu !== attendu) ecarts.push({ cas: cas.id, sorte: 'manque', detail: `axeDePropriete("${nom}") rend ${lu ?? 'undefined'}, attendu ${attendu}` });
  if (attendu === undefined && lu !== undefined) ecarts.push({ cas: cas.id, sorte: 'faux-constat', detail: `axeDePropriete("${nom}") rend ${lu}, attendu undefined` });
  const attendus = attendu === undefined ? 0 : 1;
  const detectes = attendus === 1 && lu === attendu ? 1 : 0;
  const resultat: ResultatDuCas = { cas: cas.id, famille: cas.famille, operateur: cas.operateur, verdict: cas.verdict, attendus, detectes, ecarts };
  return { cas, emis: [], resultat, duree: 0, horsBudget: false };
}

function mesurerLeCas(cas: CasDeVariants): Mesure {
  if (cas.entree.lecture) return mesurerLaLecture(cas);
  const debut = Date.now();
  let attendus = 0;
  try {
    attendus = cas.attendus.length;
  } catch (erreur) {
    const vide: ResultatDuCas = { cas: cas.id, famille: cas.famille, operateur: cas.operateur, verdict: cas.verdict, attendus: 0, detectes: 0, ecarts: [] };
    return { cas, emis: [], resultat: vide, exception: `oracle : ${messageDe(erreur)}`, duree: 0, horsBudget: false };
  }
  const vide: ResultatDuCas = { cas: cas.id, famille: cas.famille, operateur: cas.operateur, verdict: cas.verdict, attendus, detectes: 0, ecarts: [] };
  const budget = cas.entree.budgetMs;
  const limite = budget === undefined ? 120_000 : budget * 10;
  let emis: Constat[];
  try {
    const { composant } = cas.entree.materialiser!();
    const nommage = conduire(controlerNommageParEtapes(composant.releve, composant.catalogue), limite);
    if ('abandonne' in nommage) return { cas, emis: [], resultat: vide, exception: `C7 à C13 abandonnés après ${limite} ms`, duree: Date.now() - debut, horsBudget: true };
    const oublis = conduire(controlerOublisParEtapes(composant.releve, composant.catalogue), limite - (Date.now() - debut));
    if ('abandonne' in oublis) return { cas, emis: [], resultat: vide, exception: `C31 à C33 abandonnés après ${limite} ms`, duree: Date.now() - debut, horsBudget: true };
    emis = [...nommage.valeur, ...oublis.valeur];
  } catch (erreur) {
    return { cas, emis: [], resultat: vide, exception: messageDe(erreur), duree: Date.now() - debut, horsBudget: false };
  }
  const duree = Date.now() - debut;
  const compare = comparer(cas, emis, cleDeConstat);
  const ecarts = [...compare.ecarts];
  const identifiants = new Map<string, number>();
  for (const constat of emis) identifiants.set(constat.id, (identifiants.get(constat.id) ?? 0) + 1);
  for (const [id, nombre] of identifiants) {
    if (nombre > 1 && !ecarts.some((ecart) => ecart.sorte === 'doublon' && ecart.emis?.id === id)) {
      ecarts.push({ cas: cas.id, sorte: 'doublon', emis: emis.find((constat) => constat.id === id), detail: `${id} émis ${nombre} fois : l'identifiant n'est pas unique` });
    }
  }
  const manques = ecarts.filter((ecart) => ecart.sorte === 'manque').length;
  return { cas, emis, resultat: { ...compare, detectes: compare.attendus - manques, ecarts }, duree, horsBudget: budget !== undefined && duree > budget };
}

function rattacher(cas: CasDeVariants): string {
  const liens = [cas.hypothese ? HYPOTHESES[cas.hypothese] : undefined, cas.ecartConnu].filter((lien): lien is string => lien !== undefined);
  return liens.length ? liens.join(' ; ') : 'nouveau';
}

interface Ligne {
  operateur: string;
  cas: number;
  attendus: number;
  detectes: number;
  manques: number;
  fauxConstats: number;
  correctionsInexactes: number;
  exceptions: number;
  enAttente: number;
  horsBudget: number;
}

const ligneVide = (operateur: string): Ligne => ({ operateur, cas: 0, attendus: 0, detectes: 0, manques: 0, fauxConstats: 0, correctionsInexactes: 0, exceptions: 0, enAttente: 0, horsBudget: 0 });

/** Les écarts d'un cas `mesure` vont dans `enAttente` seulement ; un doublon compte comme un faux constat et une question inexacte comme une correction inexacte. */
function agreger(mesures: readonly Mesure[]): Ligne[] {
  const lignes = new Map<string, Ligne>();
  const total = ligneVide('Total');
  const compter = (ligne: Ligne, { resultat, exception, horsBudget }: Mesure): void => {
    ligne.cas++;
    ligne.attendus += resultat.attendus;
    ligne.detectes += resultat.detectes;
    if (exception !== undefined) ligne.exceptions++;
    if (horsBudget) ligne.horsBudget++;
    if (resultat.verdict === 'mesure') { ligne.enAttente += resultat.ecarts.length; return; }
    ligne.manques += sortesDe(resultat, 'manque');
    ligne.fauxConstats += sortesDe(resultat, 'faux-constat', 'doublon');
    ligne.correctionsInexactes += sortesDe(resultat, 'correction-inexacte', 'question-inexacte');
  };
  for (const mesure of mesures) {
    const ligne = lignes.get(mesure.cas.operateur) ?? ligneVide(mesure.cas.operateur);
    lignes.set(mesure.cas.operateur, ligne);
    compter(ligne, mesure);
    compter(total, mesure);
  }
  return [...lignes.values(), total];
}

const tableauMarkdown = (entete: readonly string[], rangees: readonly (readonly (string | number)[])[]): string =>
  [entete, entete.map(() => '---'), ...rangees.map((rangee) => rangee.map(String))].map((rangee) => `| ${rangee.join(' | ')} |`).join('\n');

function tableau(lignes: readonly Ligne[]): string {
  return tableauMarkdown(
    ['Opérateur', 'Cas', 'Attendus', 'Détectés', 'Manqués', 'Faux constats', 'Corrections inexactes', 'Exceptions', 'En attente', 'Hors budget'],
    lignes.map((l) => [l.operateur, l.cas, l.attendus, l.detectes, l.manques, l.fauxConstats, l.correctionsInexactes, l.exceptions, l.enAttente, l.horsBudget]),
  );
}

interface GroupeDEcarts { readonly cas: CasDeVariants; readonly sorte: string; readonly code: string; readonly nombre: number; readonly exemple: string }

/** Un cas peut émettre des centaines de constats de même sorte : le rapport les range par (sorte, code) avec un exemple. */
function grouper(mesures: readonly Mesure[], verdict: 'attendu' | 'mesure'): GroupeDEcarts[] {
  return mesures.filter(({ cas }) => cas.verdict === verdict).flatMap(({ cas, resultat }) => {
    const groupes = new Map<string, GroupeDEcarts>();
    for (const ecart of resultat.ecarts) {
      const code = ecart.attendu?.code ?? ecart.emis?.code ?? '-';
      const cle = `${ecart.sorte}|${code}`;
      const connu = groupes.get(cle);
      groupes.set(cle, connu ? { ...connu, nombre: connu.nombre + 1 } : { cas, sorte: ecart.sorte, code, nombre: 1, exemple: ecart.detail });
    }
    return [...groupes.values()];
  });
}

const ligneDeGroupe = ({ cas, sorte, code, nombre, exemple }: GroupeDEcarts): string =>
  `- ${cas.id} | ${sorte} | ${code} x${nombre} | ${exemple} | ${rattacher(cas)}${cas.question ? ` | ${cas.question}` : ''}`;

interface MesureDeProfil {
  readonly id: string;
  readonly description: string;
  readonly variants: number;
  readonly constats: Record<string, number>;
  readonly sansLecture: number;
  readonly malLus: number;
  readonly exception?: string;
}

function mesurerLeProfil(id: string, description: string, fabriquer: () => ReturnType<typeof composantP0>): MesureDeProfil {
  try {
    const composant = fabriquer();
    const constats: Record<string, number> = {};
    for (const constat of constatsDeLaPortee(composant.releve, composant.catalogue)) constats[constat.code] = (constats[constat.code] ?? 0) + 1;
    const lecture = verifierLaLecture(composant);
    return { id, description, variants: composant.releve.variants.length, constats, sansLecture: lecture.sansLecture.length, malLus: lecture.malLus.length };
  } catch (erreur) {
    return { id, description, variants: 0, constats: {}, sansLecture: 0, malLus: 0, exception: messageDe(erreur) };
  }
}

const descriptionDuProfil = (profil: ProfilDeVariants): string => `${profil.jeu} ${profil.composant}, nom ${profil.ecritureDuNom}, valeurs ${profil.ecritureDesValeurs}`;

const nonVide = (profil: MesureDeProfil): boolean =>
  profil.exception !== undefined || Object.keys(profil.constats).length > 0 || profil.sansLecture > 0 || profil.malLus > 0;

const constatsEnTexte = (constats: Record<string, number>): string =>
  Object.entries(constats).sort(([a], [b]) => a.localeCompare(b, 'fr', { numeric: true })).map(([code, nombre]) => `${code} x${nombre}`).join(', ') || '-';

function rapportDesProfils(profils: readonly MesureDeProfil[]): string[] {
  const vides = profils.filter((profil) => !nonVide(profil)).length;
  const nonVides = profils.filter(nonVide);
  return [
    `Profils (P0 et ${profils.length - 1} profils de base) : ${vides} sans constat et à lecture complète, ${nonVides.length} non vides`,
    '',
    tableauMarkdown(
      ['Profil', 'Description', 'Variants', 'Constats', 'Tokens sans lecture', 'Tokens mal lus'],
      profils.map((profil) => [profil.id, profil.description, profil.variants, profil.exception ? `exception : ${profil.exception}` : constatsEnTexte(profil.constats), profil.sansLecture, profil.malLus]),
    ),
    '',
    `Profils non vides (${nonVides.length}) : profil | constats | tokens sans lecture | tokens mal lus`,
    ...nonVides.map((profil) => `- ${profil.id} | ${profil.exception ? `exception : ${profil.exception}` : constatsEnTexte(profil.constats)} | ${profil.sansLecture} | ${profil.malLus}`),
    '',
  ];
}

function rapportTexte(graine: number, mesures: readonly Mesure[], profils: readonly MesureDeProfil[]): string {
  const attentes = grouper(mesures, 'mesure').map(ligneDeGroupe);
  const ecarts = grouper(mesures, 'attendu').map(ligneDeGroupe);
  const exceptions = mesures.filter((mesure) => mesure.exception !== undefined)
    .map(({ cas, exception }) => `- ${cas.id} | exception | ${exception} | ${cas.verdict === 'mesure' ? `${rattacher(cas)} | ${cas.question}` : rattacher(cas)}`);
  const durees = mesures.filter((mesure) => mesure.cas.entree.budgetMs !== undefined)
    .map(({ cas, duree, horsBudget }) => `- ${cas.id} | ${duree} ms | budget ${cas.entree.budgetMs} ms${horsBudget ? ' | dépassé' : ''}`);
  return [
    `Stress test F5 (graine ${graine} ; opérateurs sur P0, Button à 72 variants)`,
    '',
    ...(mesures.length ? ['Opérateurs', '', tableau(agreger(mesures)), ''] : []),
    ...(mesures.length ? [
      `Écarts (${ecarts.length} groupes) : cas | sorte | code | exemple | rattachement`,
      ...ecarts,
      '',
      `Exceptions (${exceptions.length}) : cas | exception | message | rattachement`,
      ...exceptions,
      '',
      `En attente (${attentes.length} groupes) : cas | sorte | code | exemple | rattachement | question`,
      ...attentes,
      '',
      'Durées des cas qui portent un budget (M3) : cas | durée | budget',
      ...durees,
      '',
    ] : []),
    ...(profils.length ? rapportDesProfils(profils) : []),
  ].join('\n');
}

function resumeDuConstat(constat: Constat): unknown {
  const { id, code, faits, variants, question } = constat;
  return { id, code, faits, ...(variants.length ? { variants } : {}), ...(question ? { question: question.candidats.map((candidat) => candidat.nom) } : {}) };
}

function imprimerLeCas({ cas, emis, resultat, exception }: Mesure): void {
  console.log(`${cas.id} (${cas.verdict}${cas.question ? ` ${cas.question}` : ''}) : ${cas.entree.description}`);
  console.log(`zones : ${cas.entree.zones.map((zone) => `${zone.axe}=${zone.valeur}`).join(', ') || '-'}`);
  console.log('\nConstats émis');
  for (const constat of emis.slice(0, 60)) console.log(`  ${JSON.stringify(resumeDuConstat(constat))}`);
  if (emis.length > 60) console.log(`  … et ${emis.length - 60} autres`);
  if (emis.length === 0) console.log('  aucun');
  console.log('\nOracle');
  for (const attendu of cas.attendus.slice(0, 60)) console.log(`  ${JSON.stringify(attendu)}`);
  if (cas.attendus.length > 60) console.log(`  … et ${cas.attendus.length - 60} autres`);
  if (cas.attendus.length === 0) console.log(cas.entree.lecture ? `  rôle ${cas.entree.lecture.attendu ?? 'aucun'}` : '  aucun constat');
  console.log('\nÉcarts');
  if (exception !== undefined) console.log(`  exception | ${exception}`);
  for (const ecart of resultat.ecarts.slice(0, 60)) console.log(`  ${ecart.sorte} | ${ecart.detail} | ${rattacher(cas)}`);
  if (resultat.ecarts.length > 60) console.log(`  … et ${resultat.ecarts.length - 60} autres`);
  if (resultat.ecarts.length === 0 && exception === undefined) console.log('  aucun');
}

function option(nom: string): string | undefined {
  const rang = process.argv.indexOf(nom);
  return rang >= 0 ? process.argv[rang + 1] : undefined;
}

function principal(): void {
  const debut = Date.now();
  const graine = Number(option('--graine') ?? GRAINE_PAR_DEFAUT);
  const operateur = option('--operateur');
  const identifiant = option('--cas');
  const identifiantDeProfil = option('--profil');
  const filtre = operateur !== undefined || identifiant !== undefined || identifiantDeProfil !== undefined;
  const base = composantP0(graine);

  const cas = filtre && identifiantDeProfil !== undefined ? [] : tousLesCas(base, graine)
    .filter((entree) => (operateur === undefined || entree.operateur === operateur) && (identifiant === undefined || entree.id === identifiant));
  if (filtre && identifiantDeProfil === undefined && cas.length === 0) {
    console.error(`Aucun cas pour ${identifiant ?? operateur}.`);
    process.exitCode = 1;
    return;
  }
  const mesures = cas.map(mesurerLeCas);

  const profilsARetenir = !filtre ? PROFILS : PROFILS.filter((profil) => profil.id === identifiantDeProfil);
  const profils: MesureDeProfil[] = [
    ...(!filtre || identifiantDeProfil === 'P0' ? [mesurerLeProfil('P0', 'Button, 4 axes, 72 variants', () => composantP0(graine))] : []),
    ...profilsARetenir.map((profil) => mesurerLeProfil(profil.id, descriptionDuProfil(profil), () => composantDuProfil(profil, graine))),
  ];
  if (identifiantDeProfil !== undefined && profils.length === 0) {
    console.error(`Aucun profil ${identifiantDeProfil}.`);
    process.exitCode = 1;
    return;
  }

  const texte = rapportTexte(graine, mesures, profils);
  if (identifiant !== undefined) imprimerLeCas(mesures[0]);
  if (filtre) {
    console.log(`\n${texte}`);
    return;
  }
  const dossier = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../../_local/stress/f5-variants');
  mkdirSync(dossier, { recursive: true });
  writeFileSync(path.join(dossier, 'operateurs.txt'), texte);
  const json = {
    graine, profil: 'P0',
    lignes: agreger(mesures).map(({ horsBudget, ...ligne }) => ligne),
    cas: mesures.map(({ cas: c, resultat, exception }) => ({
      id: c.id, operateur: c.operateur, verdict: c.verdict, ...(c.question ? { question: c.question } : {}),
      attendus: resultat.attendus, detectes: resultat.detectes,
      ...(exception === undefined ? {} : { exception }),
      ecarts: resultat.ecarts.map((ecart) => ({ sorte: ecart.sorte, detail: ecart.detail, rattachement: rattacher(c) })),
    })),
    profils,
  };
  writeFileSync(path.join(dossier, 'operateurs.json'), `${JSON.stringify(json, null, 2)}\n`);
  console.log(texte);
  console.log(`Écrit dans ${dossier} en ${((Date.now() - debut) / 1000).toFixed(1)} s.`);
}

principal();

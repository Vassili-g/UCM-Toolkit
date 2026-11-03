/**
 * Mesure du stress test F2 sur le profil P0. Il passe chaque cas dans les deux contrôles du mode Tokens, le compare à son oracle
 * et écrit `_local/stress/f2-structure/operateurs.txt` et `operateurs.json` (dossier ignoré par Git). La section A porte les 85
 * faux positifs (72 profils et 13 thèmes ciblés, aucun constat attendu), la section B les 426 cas des opérateurs.
 *
 *   npx tsx packages/kit/tests/stress/f2-structure/mesurer.ts [--section A|B] [--operateur K1] [--cas K1-12] [--graine 7102]
 *
 * `--section`, `--operateur` et `--cas` filtrent et n'écrivent rien (le tableau va à l'écran), et `--cas` imprime en plus le
 * catalogue dégradé (les variables touchées seulement), les constats émis et l'oracle. Le rapport ne porte ni date ni durée, pour
 * que deux exécutions donnent le même `.json`. Le harnais ne corrige rien. Un écart du kit est un résultat, pas un échec, et une
 * exception levée par un contrôle est un écart (colonne « Exceptions ») que le harnais attrape sans s'arrêter.
 *
 * P8 rejoue chaque cas avec l'ordre des variables mélangé et avec une autre casse des noms (`metamorphiques.ts`) : les écarts
 * de ces relations vont dans leur propre section du rapport.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Constat } from '../../../src/controles/index.js';
import { comparer } from '../commun/comparer.js';
import type { Ecart, ResultatDuCas, SorteDEcart } from '../commun/types.js';
import { cleDeConstat, constatsBrutsDuCas, sansDoublon, verifierLesDetails, type CasDeStructure } from './cas.js';
import { fauxPositifs } from './fauxPositifs.js';
import { RELATIONS, verifierLesRelations, type EcartDeRelation, type Relation } from './metamorphiques.js';
import { tousLesCas } from './operateurs.js';
import { GRAINE_PAR_DEFAUT, PROFIL_P0, themeDuProfil } from './themeUcm.js';

const HYPOTHESES: Readonly<Record<string, string>> = {
  H1: 'hypothèse 1 (C60 ne lit pas le mode dans le chemin des modes de marque)',
  H2: 'hypothèse 2 (un rôle sur le cran de l\'autre table vote pour l\'autre sens)',
  H3: 'hypothèse 3 (la voisine d\'un alias supprimé est choisie sur le dernier segment seul)',
  H4: 'hypothèse 4 (une faute de rôle laisse la création du rôle absent)',
  H5: 'hypothèse 5 (un rôle reconnu deux fois n\'est jugé que pour le premier)',
};

/** L'hypothèse de la section 6.1 que le cas met à l'épreuve ; « nouveau » sinon. */
function rattacher(cas: CasDeStructure): string {
  return cas.hypothese ? HYPOTHESES[cas.hypothese] : 'nouveau';
}

type Section = 'A' | 'B';

interface Mesure {
  readonly section: Section;
  readonly cas: CasDeStructure;
  readonly emis: readonly Constat[];
  readonly resultat: ResultatDuCas;
  /** Le message d'une exception qu'un contrôle a levée sur ce cas ; un cas qui lève n'a ni constat émis ni relation mesurée. */
  readonly exception?: string;
  readonly relations: readonly EcartDeRelation[];
}

const messageDe = (erreur: unknown): string => (erreur instanceof Error ? erreur.message : String(erreur));

function mesurerLeCas(cas: CasDeStructure, section: Section, graine: number): Mesure {
  let brut: Constat[];
  try {
    brut = constatsBrutsDuCas(cas);
  } catch (erreur) {
    const vide: ResultatDuCas = { cas: cas.id, famille: cas.famille, operateur: cas.operateur, verdict: cas.verdict, attendus: cas.attendus.length, detectes: 0, ecarts: [] };
    return { section, cas, emis: [], resultat: vide, exception: messageDe(erreur), relations: [] };
  }
  const emis = sansDoublon(brut);
  const compare = comparer(cas, emis, cleDeConstat);
  const ecarts = [...compare.ecarts, ...verifierLesDetails(cas, emis)];
  const manques = ecarts.filter((ecart) => ecart.sorte === 'manque').length;
  let relations: EcartDeRelation[];
  try {
    relations = verifierLesRelations(cas, brut, graine);
  } catch (erreur) {
    relations = [{ cas: cas.id, operateur: cas.operateur, relation: 'ordre', detail: `exception : ${messageDe(erreur)}` }];
  }
  return { section, cas, emis, resultat: { ...compare, detectes: compare.attendus - manques, ecarts }, relations };
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
}

const ligneVide = (operateur: string): Ligne => ({ operateur, cas: 0, attendus: 0, detectes: 0, manques: 0, fauxConstats: 0, correctionsInexactes: 0, exceptions: 0, enAttente: 0 });

/** Les écarts d'un cas `mesure` vont dans `enAttente` seulement ; un doublon compte comme un faux constat et une question inexacte comme une correction inexacte. */
function agreger(mesures: readonly Mesure[]): Ligne[] {
  const lignes = new Map<string, Ligne>();
  const total = ligneVide('Total');
  const compter = (ligne: Ligne, { resultat, exception }: Mesure): void => {
    const nombre = (...sortes: SorteDEcart[]) => resultat.ecarts.filter((ecart) => sortes.includes(ecart.sorte)).length;
    ligne.cas++;
    ligne.attendus += resultat.attendus;
    ligne.detectes += resultat.detectes;
    if (exception !== undefined) ligne.exceptions++;
    if (resultat.verdict === 'mesure') { ligne.enAttente += resultat.ecarts.length; return; }
    ligne.manques += nombre('manque');
    ligne.fauxConstats += nombre('faux-constat', 'doublon');
    ligne.correctionsInexactes += nombre('correction-inexacte', 'question-inexacte');
  };
  for (const mesure of mesures) {
    const ligne = lignes.get(mesure.cas.operateur) ?? ligneVide(mesure.cas.operateur);
    lignes.set(mesure.cas.operateur, ligne);
    compter(ligne, mesure);
    compter(total, mesure);
  }
  return [...lignes.values(), total];
}

const ENTETE = ['Opérateur', 'Cas', 'Attendus', 'Détectés', 'Manqués', 'Faux constats', 'Corrections inexactes', 'Exceptions', 'En attente'];

function tableau(lignes: readonly Ligne[]): string {
  const rangees = lignes.map((l) => [l.operateur, l.cas, l.attendus, l.detectes, l.manques, l.fauxConstats, l.correctionsInexactes, l.exceptions, l.enAttente].map(String));
  return [ENTETE, ENTETE.map(() => '---'), ...rangees].map((rangee) => `| ${rangee.join(' | ')} |`).join('\n');
}

function listeDesEcarts(mesures: readonly Mesure[], verdict: 'attendu' | 'mesure'): string[] {
  return mesures
    .filter(({ cas }) => cas.verdict === verdict)
    .flatMap(({ cas, resultat }) => resultat.ecarts.map((ecart) =>
      `- ${cas.id} | ${ecart.sorte} | ${ecart.detail} | ${rattacher(cas)}${cas.question ? ` | ${cas.question}` : ''}`));
}

const listeDesExceptions = (mesures: readonly Mesure[]): string[] =>
  mesures.filter((mesure) => mesure.exception !== undefined).map(({ cas, exception }) => `- ${cas.id} | exception | ${exception} | nouveau`);

function tableauDesRelations(mesures: readonly Mesure[]): { tableau: string; ecarts: string[] } {
  const parSection = (section: Section): Mesure[] => mesures.filter((mesure) => mesure.section === section);
  const compte = (liste: readonly Mesure[], relation: Relation): number => liste.filter((mesure) => mesure.relations.some((ecart) => ecart.relation === relation)).length;
  const entete = ['Section', 'Cas rejoués', ...RELATIONS.map((relation) => `Écarts « ${relation} »`)];
  const rangees = (['A', 'B'] as const).map((section) => {
    const liste = parSection(section);
    return [section, String(liste.filter((mesure) => mesure.exception === undefined).length), ...RELATIONS.map((relation) => String(compte(liste, relation)))];
  });
  return {
    tableau: [entete, entete.map(() => '---'), ...rangees].map((rangee) => `| ${rangee.join(' | ')} |`).join('\n'),
    ecarts: mesures.flatMap((mesure) => mesure.relations.map((ecart) => `- ${ecart.cas} | ${ecart.relation} | ${ecart.detail}`)),
  };
}

function rapportTexte(graine: number, mesures: readonly Mesure[]): string {
  const sections = (['A', 'B'] as const).map((section) => ({ section, liste: mesures.filter((mesure) => mesure.section === section) })).filter(({ liste }) => liste.length > 0);
  const attentes = listeDesEcarts(mesures, 'mesure');
  const ecarts = [...listeDesEcarts(mesures, 'attendu'), ...listeDesExceptions(mesures)];
  const relations = tableauDesRelations(mesures);
  const nomDeSection: Record<Section, string> = { A: 'Section A, faux positifs (72 profils et 13 thèmes ciblés)', B: 'Section B, opérateurs' };
  return [
    `Stress test F2 sur ${PROFIL_P0.id} (graine ${graine})`,
    '',
    ...sections.flatMap(({ section, liste }) => [nomDeSection[section], '', tableau(agreger(liste)), '']),
    `Écarts (${ecarts.length}) : cas | sorte | détail | rattachement`,
    ...ecarts,
    '',
    `En attente (${attentes.length}) : cas | sorte | détail | rattachement | question`,
    ...attentes,
    '',
    'P8, relations métamorphiques : ordre des variables mélangé, casse des noms changée, identifiants stables, entrée intacte',
    '',
    relations.tableau,
    '',
    `Écarts de P8 (${relations.ecarts.length}) : cas | relation | détail`,
    ...relations.ecarts,
    '',
  ].join('\n');
}

function resumeDuConstat(constat: Constat): unknown {
  const { id, code, faits, correction, question } = constat;
  return {
    id, code, faits,
    ...(correction ? { correction: { sorte: correction.sorte, cible: correction.cible, avant: correction.avant, apres: correction.apres, creation: correction.creation } } : {}),
    ...(question ? { question: question.candidats.map((candidat) => candidat.nom) } : {}),
  };
}

function imprimerLeCas({ cas, emis, resultat, exception, relations }: Mesure): void {
  const { theme, touchees, description } = cas.entree;
  console.log(`${cas.id} (${cas.verdict}${cas.question ? ` ${cas.question}` : ''}) : ${description}`);
  console.log(`écriture : ${cas.entree.ecriture ? 'choisie' : 'aucune'} ; rôles ignorés : ${cas.entree.rolesIgnores.join(', ') || '-'}`);
  console.log('\nVariables touchées');
  for (const cle of touchees) {
    const variable = theme.catalogue.variables.find((entree) => entree.cle === cle);
    console.log(variable ? `  ${JSON.stringify({ cle, valeurs: variable.valeurs })}` : `  ${cle} (retirée)`);
  }
  if (touchees.length === 0) console.log('  aucune');
  console.log('\nConstats émis');
  for (const constat of emis) console.log(`  ${JSON.stringify(resumeDuConstat(constat))}`);
  if (emis.length === 0) console.log('  aucun');
  console.log('\nOracle');
  for (const attendu of cas.attendus) console.log(`  ${JSON.stringify(attendu)}`);
  for (const detail of cas.details ?? []) console.log(`  détail ${JSON.stringify(detail)}`);
  if (cas.attendus.length === 0) console.log('  aucun constat');
  console.log('\nÉcarts');
  if (exception !== undefined) console.log(`  exception | ${exception}`);
  for (const ecart of resultat.ecarts) console.log(`  ${ecart.sorte} | ${ecart.detail} | ${rattacher(cas)}`);
  for (const ecart of relations) console.log(`  P8 ${ecart.relation} | ${ecart.detail}`);
  if (resultat.ecarts.length === 0 && relations.length === 0 && exception === undefined) console.log('  aucun');
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
  const section = option('--section');
  if (section !== undefined && section !== 'A' && section !== 'B') {
    console.error('--section attend A ou B.');
    process.exitCode = 1;
    return;
  }
  const base = themeDuProfil(PROFIL_P0, graine);
  const candidats: { cas: CasDeStructure; section: Section }[] = [
    ...(section === 'B' ? [] : fauxPositifs(base, graine).map((cas) => ({ cas, section: 'A' as const }))),
    ...(section === 'A' ? [] : tousLesCas(base, graine).map((cas) => ({ cas, section: 'B' as const }))),
  ];
  const retenus = candidats.filter(({ cas }) => (operateur === undefined || cas.operateur === operateur) && (identifiant === undefined || cas.id === identifiant));
  if (retenus.length === 0) {
    console.error(`Aucun cas pour ${identifiant ?? operateur}.`);
    process.exitCode = 1;
    return;
  }
  const mesures = retenus.map((entree) => mesurerLeCas(entree.cas, entree.section, graine));
  const texte = rapportTexte(graine, mesures);
  if (identifiant !== undefined) imprimerLeCas(mesures[0]);
  if (operateur !== undefined || identifiant !== undefined || section !== undefined) {
    console.log(`\n${texte}`);
    return;
  }
  const dossier = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../../_local/stress/f2-structure');
  mkdirSync(dossier, { recursive: true });
  writeFileSync(path.join(dossier, 'operateurs.txt'), texte);
  const json = {
    graine, profil: PROFIL_P0.id,
    sections: (['A', 'B'] as const).map((s) => ({ section: s, lignes: agreger(mesures.filter((mesure) => mesure.section === s)) })),
    cas: mesures.map(({ cas: c, section: s, resultat, exception, relations }) => ({
      id: c.id, section: s, operateur: c.operateur, verdict: c.verdict, ...(c.question ? { question: c.question } : {}),
      attendus: resultat.attendus, detectes: resultat.detectes,
      ...(exception === undefined ? {} : { exception }),
      ecarts: resultat.ecarts.map((ecart) => ({ sorte: ecart.sorte, detail: ecart.detail, rattachement: rattacher(c) })),
      ...(relations.length > 0 ? { relations: relations.map((ecart) => ({ relation: ecart.relation, detail: ecart.detail })) } : {}),
    })),
  };
  writeFileSync(path.join(dossier, 'operateurs.json'), `${JSON.stringify(json, null, 2)}\n`);
  console.log(texte);
  console.log(`Écrit dans ${dossier} en ${((Date.now() - debut) / 1000).toFixed(1)} s.`);
}

principal();

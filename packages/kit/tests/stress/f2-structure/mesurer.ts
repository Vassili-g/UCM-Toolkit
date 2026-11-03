/**
 * Mesure des opérateurs simples du stress test F2 sur le profil P0. Il passe chaque cas dans les deux contrôles du mode Tokens,
 * le compare à son oracle et écrit `_local/stress/f2-structure/operateurs.txt` et `operateurs.json` (dossier ignoré par Git).
 *
 *   npx tsx packages/kit/tests/stress/f2-structure/mesurer.ts [--operateur K1] [--cas K1-12] [--graine 7102]
 *
 * `--operateur` et `--cas` filtrent et n'écrivent rien (le tableau va à l'écran), et `--cas` imprime en plus le catalogue dégradé
 * (les variables touchées seulement), les constats émis et l'oracle. Le rapport ne porte ni date ni durée, pour que deux
 * exécutions donnent le même `.json`. Le harnais ne corrige rien. Un écart du kit est un résultat, pas un échec.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Constat } from '../../../src/controles/index.js';
import { comparer } from '../commun/comparer.js';
import type { Ecart, ResultatDuCas, SorteDEcart } from '../commun/types.js';
import { cleDeConstat, constatsDuCas, verifierLesDetails, type CasDeStructure } from './cas.js';
import { tousLesCas } from './operateurs.js';
import { GRAINE_PAR_DEFAUT, PROFIL_P0, themeDuProfil } from './themeUcm.js';

const HYPOTHESES: Readonly<Record<string, string>> = {
  H1: 'hypothèse 1 (C60 ne lit pas le mode dans le chemin des modes de marque)',
  H2: 'hypothèse 2 (un rôle sur le cran de l\'autre table vote pour l\'autre sens)',
};

/** L'hypothèse de la section 6.1 que le cas met à l'épreuve, quand l'écart est un constat manquant ; « nouveau » sinon. */
function rattacher(cas: CasDeStructure, ecart: Ecart): string {
  return ecart.sorte === 'manque' && cas.hypothese ? HYPOTHESES[cas.hypothese] : 'nouveau';
}

interface Mesure {
  readonly cas: CasDeStructure;
  readonly emis: readonly Constat[];
  readonly resultat: ResultatDuCas;
}

function mesurerLeCas(cas: CasDeStructure): Mesure {
  const emis = constatsDuCas(cas);
  const compare = comparer(cas, emis, cleDeConstat);
  const ecarts = [...compare.ecarts, ...verifierLesDetails(cas, emis)];
  const manques = ecarts.filter((ecart) => ecart.sorte === 'manque').length;
  return { cas, emis, resultat: { ...compare, detectes: compare.attendus - manques, ecarts } };
}

interface Ligne {
  operateur: string;
  cas: number;
  attendus: number;
  detectes: number;
  manques: number;
  fauxConstats: number;
  correctionsInexactes: number;
  enAttente: number;
}

const ligneVide = (operateur: string): Ligne => ({ operateur, cas: 0, attendus: 0, detectes: 0, manques: 0, fauxConstats: 0, correctionsInexactes: 0, enAttente: 0 });

/** Les écarts d'un cas `mesure` vont dans `enAttente` seulement ; un doublon compte comme un faux constat et une question inexacte comme une correction inexacte. */
function agreger(mesures: readonly Mesure[]): Ligne[] {
  const lignes = new Map<string, Ligne>();
  const total = ligneVide('Total');
  const compter = (ligne: Ligne, { resultat }: Mesure): void => {
    const nombre = (...sortes: SorteDEcart[]) => resultat.ecarts.filter((ecart) => sortes.includes(ecart.sorte)).length;
    ligne.cas++;
    ligne.attendus += resultat.attendus;
    ligne.detectes += resultat.detectes;
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

const ENTETE = ['Opérateur', 'Cas', 'Attendus', 'Détectés', 'Manqués', 'Faux constats', 'Corrections inexactes', 'En attente'];

function tableau(lignes: readonly Ligne[]): string {
  const rangees = lignes.map((l) => [l.operateur, l.cas, l.attendus, l.detectes, l.manques, l.fauxConstats, l.correctionsInexactes, l.enAttente].map(String));
  return [ENTETE, ENTETE.map(() => '---'), ...rangees].map((rangee) => `| ${rangee.join(' | ')} |`).join('\n');
}

function listeDesEcarts(mesures: readonly Mesure[], verdict: 'attendu' | 'mesure'): string[] {
  return mesures
    .filter(({ cas }) => cas.verdict === verdict)
    .flatMap(({ cas, resultat }) => resultat.ecarts.map((ecart) =>
      `- ${cas.id} | ${ecart.sorte} | ${ecart.detail} | ${rattacher(cas, ecart)}${cas.question ? ` | ${cas.question}` : ''}`));
}

function rapportTexte(graine: number, mesures: readonly Mesure[]): string {
  const attentes = listeDesEcarts(mesures, 'mesure');
  const ecarts = listeDesEcarts(mesures, 'attendu');
  return [
    `Stress test F2, opérateurs R, K et M sur ${PROFIL_P0.id} (graine ${graine})`,
    '',
    tableau(agreger(mesures)),
    '',
    `Écarts (${ecarts.length}) : cas | sorte | détail | rattachement`,
    ...ecarts,
    '',
    `En attente (${attentes.length}) : cas | sorte | détail | rattachement | question`,
    ...attentes,
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

function imprimerLeCas({ cas, emis, resultat }: Mesure): void {
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
  for (const ecart of resultat.ecarts) console.log(`  ${ecart.sorte} | ${ecart.detail} | ${rattacher(cas, ecart)}`);
  if (resultat.ecarts.length === 0) console.log('  aucun');
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
  const base = themeDuProfil(PROFIL_P0, graine);
  const cas = tousLesCas(base, graine).filter((entree) => (operateur === undefined || entree.operateur === operateur) && (identifiant === undefined || entree.id === identifiant));
  if (cas.length === 0) {
    console.error(`Aucun cas pour ${identifiant ?? operateur}.`);
    process.exitCode = 1;
    return;
  }
  const mesures = cas.map(mesurerLeCas);
  const texte = rapportTexte(graine, mesures);
  if (identifiant !== undefined) imprimerLeCas(mesures[0]);
  if (operateur !== undefined || identifiant !== undefined) {
    console.log(`\n${texte}`);
    return;
  }
  const dossier = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../../_local/stress/f2-structure');
  mkdirSync(dossier, { recursive: true });
  writeFileSync(path.join(dossier, 'operateurs.txt'), texte);
  const lignes = agreger(mesures);
  const json = {
    graine, profil: PROFIL_P0.id, lignes,
    cas: mesures.map(({ cas: c, resultat }) => ({
      id: c.id, operateur: c.operateur, verdict: c.verdict, ...(c.question ? { question: c.question } : {}),
      attendus: resultat.attendus, detectes: resultat.detectes,
      ecarts: resultat.ecarts.map((ecart) => ({ sorte: ecart.sorte, detail: ecart.detail, rattachement: rattacher(c, ecart) })),
    })),
  };
  writeFileSync(path.join(dossier, 'operateurs.json'), `${JSON.stringify(json, null, 2)}\n`);
  console.log(texte);
  console.log(`Écrit dans ${dossier} en ${((Date.now() - debut) / 1000).toFixed(1)} s.`);
}

principal();

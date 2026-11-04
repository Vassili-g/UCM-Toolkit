/**
 * Exécute la section D du stress test F8 et F9 (chaîne jusqu'à l'écran, 129 cas) hors de `npm test`.
 *
 *   npm run stress:analyse [-- --famille F8|F9] [-- --section A|B|C|D] [-- --cas F9-D1-3]
 *
 * `--section D` joue les 129 cas, imprime le tableau de la section 5.4 du plan (une ligne par série D1 à D6 de F8 et D1 à D4 de F9,
 * un total par famille), puis écrit `_local/stress/f8-analyse/chaine.txt` et `chaine.json`. Les deux fichiers ne portent ni date ni
 * durée : deux exécutions donnent le même rapport. `--cas <id>` rejoue un cas et imprime son scénario, les messages du sandbox,
 * l'écran, l'oracle et les écarts avec leur rattachement. Les sections A à C et leurs identifiants de cas (`G1-1`) passent par
 * `mesurer.ts`. Sans `--section`, le script mesure les sections A à C, puis la section D.
 *
 * Un cas qui lève est un écart `exception`, jamais un arrêt. Un écart de cas `mesure` se compte à part (colonne « En attente »). Le
 * script sort sans erreur malgré les écarts : il mesure l'existant.
 */
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { casDeLaChaine } from './casDeLaChaine';
import type { CasDeChaine, EcartDeChaine, Jugement, SorteDEcartDeChaine } from './chaine';
import { etatDesSources, NOMBRE_DE_SOURCES } from './rejeu';
import { rattacher } from './signatures';

const argument = (nom: string): string | undefined => {
  const rang = process.argv.indexOf(nom);
  return rang >= 0 ? process.argv[rang + 1] : undefined;
};

// ---------------------------------------------------------------------------------------------------------------------------
// Colonnes du rapport (section 5.4)

const COLONNES = ['Cas', 'Attendus', 'Détectés', 'Manqués', 'Faux constats', 'Corrections inexactes', 'Non affichés', 'Conclusions fausses', 'Messages muets', 'Fuites d’état', 'Cochées', 'Non écrites', 'En attente', 'Absents'] as const;
type Colonne = typeof COLONNES[number];

const COLONNE_DE: Readonly<Record<SorteDEcartDeChaine, Colonne>> = {
  manque: 'Manqués', 'faux-constat': 'Faux constats', 'correction-inexacte': 'Corrections inexactes',
  'non-affiche': 'Non affichés', 'affiche-deux-fois': 'Non affichés', illisible: 'Non affichés',
  accusation: 'Conclusions fausses', muet: 'Messages muets', 'geste-sans-effet': 'Messages muets',
  fuite: 'Fuites d’état', exception: 'Fuites d’état', cochee: 'Cochées', 'bouton-manquant': 'Cochées', 'non-ecrite': 'Non écrites',
};

type Ligne = Record<Colonne, number> & { nom: string };
const ligneVide = (nom: string): Ligne => ({ nom, ...Object.fromEntries(COLONNES.map((colonne) => [colonne, 0])) } as Ligne);

// ---------------------------------------------------------------------------------------------------------------------------
// Un cas joué

interface EcartRapporte extends EcartDeChaine {
  readonly cas: string;
  readonly verdict: string;
  readonly connu: readonly string[];
  readonly resume: string;
  readonly commande: string;
}

interface CasJoue {
  readonly cas: CasDeChaine;
  readonly verifiees: number;
  readonly echouees: number;
  readonly absent: boolean;
  readonly ecarts: readonly EcartRapporte[];
  readonly notes: readonly string[];
  readonly jugement: Jugement | null;
}

async function jouer(cas: CasDeChaine): Promise<CasJoue> {
  const commande = `npm run stress:analyse -- --cas ${cas.id}`;
  const rapporter = (ecart: EcartDeChaine): EcartRapporte => {
    const { ids, resume } = rattacher({ cas: cas.id, propriete: ecart.propriete, sorte: ecart.sorte, detail: ecart.attendu ? `${ecart.attendu} — ${ecart.detail}` : ecart.detail }, cas.rattachement);
    return { ...ecart, cas: cas.id, verdict: cas.verdict, connu: ids, resume, commande };
  };
  try {
    const jugement = await cas.executer();
    return { cas, verifiees: jugement.verifiees, echouees: jugement.echouees, absent: jugement.absent, ecarts: jugement.ecarts.map(rapporter), notes: jugement.notes, jugement };
  } catch (erreur) {
    const detail = erreur instanceof Error ? `${erreur.name} : ${erreur.message}` : String(erreur);
    return { cas, verifiees: 0, echouees: 0, absent: false, ecarts: [rapporter({ propriete: cas.propriete, sorte: 'exception', detail })], notes: [], jugement: null };
  }
}

function agreger(joues: readonly CasJoue[], cle: (joue: CasJoue) => string): Ligne[] {
  const lignes = new Map<string, Ligne>();
  const total = ligneVide('Total');
  for (const joue of joues) {
    const nom = cle(joue);
    const ligne = lignes.get(nom) ?? ligneVide(nom);
    lignes.set(nom, ligne);
    for (const cible of [ligne, total]) {
      cible.Cas += 1;
      if (joue.absent) { cible.Absents += 1; continue; }
      cible.Attendus += joue.verifiees;
      cible.Détectés += joue.verifiees - joue.echouees;
      if (joue.cas.verdict === 'mesure') { cible['En attente'] += joue.ecarts.length; continue; }
      for (const ecart of joue.ecarts) cible[COLONNE_DE[ecart.sorte]] += 1;
    }
  }
  return [...lignes.values(), total];
}

function tableau(lignes: readonly Ligne[]): string[] {
  const entete = ['Série', ...COLONNES];
  return [entete, entete.map(() => '---'), ...lignes.map((ligne) => [ligne.nom, ...COLONNES.map((colonne) => String(ligne[colonne]))])].map((rangee) => `| ${rangee.join(' | ')} |`);
}

// ---------------------------------------------------------------------------------------------------------------------------
// Rapport

const nomDeSerie = (joue: CasJoue): string => `${joue.cas.famille} ${joue.cas.operateur}`;

function tableauxDuRapport(joues: readonly CasJoue[]): { readonly lignes: Ligne[]; readonly texte: string[] } {
  const parFamille = (famille: 'F8' | 'F9') => joues.filter((joue) => joue.cas.famille === famille);
  const f8 = agreger(parFamille('F8'), nomDeSerie);
  const f9 = agreger(parFamille('F9'), nomDeSerie);
  const general = agreger(joues, () => 'F8 + F9');
  const famille = (lignes: Ligne[], nom: string): Ligne[] => (lignes.length > 1 ? [...lignes.slice(0, -1), { ...lignes.at(-1)!, nom }] : []);
  const lignes = [...famille(f8, 'Total F8'), ...famille(f9, 'Total F9'), { ...general.at(-1)!, nom: 'Total' }];
  return { lignes, texte: tableau(lignes) };
}

function rapportTexte(joues: readonly CasJoue[], empreinte: string): string[] {
  const sortie: string[] = [];
  const sources = etatDesSources();
  const f8 = joues.filter((joue) => joue.cas.famille === 'F8').length;
  const f9 = joues.length - f8;
  sortie.push(`Stress test F8 et F9, section D (chaîne jusqu’à l’écran) : ${joues.length} cas (F8 ${f8}, F9 ${f9}).`);
  sortie.push(`Empreinte SHA-256 de la liste des cas : ${empreinte}`);
  sortie.push(`Sources de capture : ${NOMBRE_DE_SOURCES} attendues, ${sources.trouvees} trouvées, ${sources.absentes} absentes. Un cas dont la source manque compte « Absents », jamais « réussi ».`, '');
  sortie.push(...tableauxDuRapport(joues).texte, '');

  const ecarts = joues.flatMap((joue) => joue.ecarts);
  const attendus = ecarts.filter((ecart) => ecart.verdict === 'attendu');
  const mesures = ecarts.filter((ecart) => ecart.verdict === 'mesure');
  const groupes = (liste: readonly EcartRapporte[]): Array<[string, EcartRapporte[]]> => {
    const parConnu = new Map<string, EcartRapporte[]>();
    for (const ecart of liste) parConnu.set(ecart.connu.join('+'), [...(parConnu.get(ecart.connu.join('+')) ?? []), ecart]);
    return [...parConnu].sort(([a], [b]) => a.localeCompare(b, 'fr', { numeric: true }));
  };
  sortie.push(`Écarts par rattachement (${attendus.length} écarts sur des cas attendus)`);
  for (const [cle, liste] of groupes(attendus)) sortie.push(`${cle} : ${new Set(liste.map((ecart) => ecart.cas)).size} cas (${liste[0].resume}) : ${[...new Set(liste.map((ecart) => ecart.cas))].join(' ')}`);
  sortie.push('', `Cas à mesurer (${joues.filter((joue) => joue.cas.verdict === 'mesure').length}) : cas | question | écarts`);
  for (const joue of joues.filter((candidat) => candidat.cas.verdict === 'mesure')) sortie.push(`- ${joue.cas.id} | ${joue.cas.question} | ${joue.absent ? 'absent' : `${joue.ecarts.length} écart(s)`} | ${joue.cas.description}`);
  sortie.push('', `Écarts (${attendus.length}) : cas | propriété | sorte | détail | rattachement | commande`);
  for (const ecart of attendus) sortie.push(`- ${ecart.cas} | ${ecart.propriete} | ${ecart.sorte} | ${ecart.attendu ? `${ecart.attendu} — ` : ''}${ecart.detail} | ${ecart.connu.join(' ')} | ${ecart.commande}`);
  sortie.push('', `En attente (${mesures.length}) : cas | propriété | sorte | détail | rattachement | question`);
  for (const ecart of mesures) sortie.push(`- ${ecart.cas} | ${ecart.propriete} | ${ecart.sorte} | ${ecart.attendu ? `${ecart.attendu} — ` : ''}${ecart.detail} | ${ecart.connu.join(' ')} | ${joues.find((joue) => joue.cas.id === ecart.cas)?.cas.question}`);
  sortie.push('', 'Cas');
  for (const joue of joues) {
    const etat = joue.absent ? 'ABSENT' : joue.ecarts.length === 0 ? 'tient' : joue.cas.verdict === 'mesure' ? 'ECART (mesure)' : 'ECART';
    sortie.push(`${joue.cas.id} [${joue.cas.propriete}] ${etat} (${joue.verifiees} vérifiées, ${joue.echouees} échouées${joue.cas.question ? `, ${joue.cas.question}` : ''}) ${joue.cas.description}`);
    for (const note of joue.notes) sortie.push(`    note : ${note}`);
  }
  return sortie;
}

function imprimerLeCas(joue: CasJoue): void {
  const { cas, jugement } = joue;
  console.log(`${cas.id} (${cas.verdict}${cas.question ? ` ${cas.question}` : ''}, ${cas.propriete}) : ${cas.description}`);
  if (jugement) {
    console.log('\nScénario');
    for (const ligne of jugement.scenario) console.log(`  ${ligne}`);
    console.log('\nMessages du sandbox');
    for (const ligne of jugement.messages) console.log(`  ${ligne}`);
    console.log('\nÉcran');
    for (const ligne of jugement.ecran) console.log(`  ${ligne}`);
    console.log('\nOracle');
    for (const ligne of jugement.oracle) console.log(`  ${ligne}`);
    for (const note of jugement.notes) console.log(`  note : ${note}`);
  }
  console.log('\nÉcarts');
  if (joue.absent) console.log('  absent : la source du cas n’existe pas');
  for (const ecart of joue.ecarts) console.log(`  ${ecart.propriete} | ${ecart.sorte} | ${ecart.attendu ? `${ecart.attendu} — ` : ''}${ecart.detail} | ${ecart.connu.join(' ')} (${ecart.resume})`);
  if (!joue.absent && joue.ecarts.length === 0) console.log('  aucun');
}

// ---------------------------------------------------------------------------------------------------------------------------
// Point d'entrée

function mesurerLesSectionsAAC(famille: string | undefined, identifiant?: string): void {
  const mesurer = path.resolve(__dirname, 'mesurer.ts');
  const args = ['--import', 'tsx', mesurer, ...(famille ? ['--famille', famille] : []), ...(identifiant ? ['--cas', identifiant] : [])];
  const resultat = spawnSync(process.execPath, args, { stdio: 'inherit', cwd: path.resolve(__dirname, '../../..') });
  if (resultat.status) process.exitCode = resultat.status;
}

async function sectionD(famille: string | undefined, identifiant: string | undefined): Promise<boolean> {
  const debut = performance.now();
  const tous = casDeLaChaine();
  const retenus = tous.filter((cas) => (famille === undefined || cas.famille === famille) && (identifiant === undefined || cas.id === identifiant));
  if (retenus.length === 0) return false;
  const joues: CasJoue[] = [];
  for (const cas of retenus) joues.push(await jouer(cas));
  if (identifiant !== undefined) {
    imprimerLeCas(joues[0]);
    return true;
  }
  const empreinte = createHash('sha256').update(retenus.map((cas) => `${cas.id}|${cas.verdict}|${cas.question ?? ''}|${cas.description}`).join('\n')).digest('hex');
  const texte = `${rapportTexte(joues, empreinte).join('\n')}\n`;
  const pleine = famille === undefined;
  if (pleine) {
    const dossier = path.resolve(__dirname, '../../../../../_local/stress/f8-analyse');
    mkdirSync(dossier, { recursive: true });
    writeFileSync(path.join(dossier, 'chaine.txt'), texte);
    const { lignes } = tableauxDuRapport(joues);
    writeFileSync(path.join(dossier, 'chaine.json'), `${JSON.stringify({
      empreinte, sources: etatDesSources(), tableau: lignes,
      cas: joues.map((joue) => ({
        id: joue.cas.id, serie: nomDeSerie(joue), propriete: joue.cas.propriete, verdict: joue.cas.verdict, ...(joue.cas.question ? { question: joue.cas.question } : {}),
        description: joue.cas.description, absent: joue.absent, verifiees: joue.verifiees, echouees: joue.echouees,
        ecarts: joue.ecarts.map(({ propriete, sorte, attendu, detail, connu, resume }) => ({ propriete, sorte, ...(attendu ? { attendu } : {}), detail, connu, resume })), notes: joue.notes,
      })),
    }, null, 2)}\n`);
  }
  const lignes = texte.split('\n');
  console.log(lignes.slice(0, lignes.findIndex((ligne) => ligne.startsWith('Cas à mesurer'))).join('\n'));
  console.log(`\n${pleine ? 'Écrit dans _local/stress/f8-analyse (chaine.txt et chaine.json)' : 'Rapport partiel, non écrit'} en ${((performance.now() - debut) / 1000).toFixed(1)} s.`);
  return true;
}

async function principal(): Promise<void> {
  const famille = argument('--famille');
  const section = argument('--section');
  const identifiant = argument('--cas');
  if (famille !== undefined && famille !== 'F8' && famille !== 'F9') {
    console.error('--famille attend F8 ou F9.');
    process.exitCode = 1;
    return;
  }
  if (section !== undefined && !['A', 'B', 'C', 'D'].includes(section)) {
    console.error('--section attend A, B, C ou D.');
    process.exitCode = 1;
    return;
  }
  if (identifiant !== undefined) {
    if (!(await sectionD(famille, identifiant))) mesurerLesSectionsAAC(famille, identifiant);
    return;
  }
  if (section === undefined || section === 'A' || section === 'B' || section === 'C') mesurerLesSectionsAAC(famille);
  if (section === undefined || section === 'D') await sectionD(famille, undefined);
}

principal().catch((erreur) => {
  console.error(erreur);
  process.exitCode = 1;
});

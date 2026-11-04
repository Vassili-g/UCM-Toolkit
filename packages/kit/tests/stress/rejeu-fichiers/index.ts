/**
 * Point d'entrée du rejeu des fichiers réels, mode Tokens (hors de `npm test`). Il convertit chaque export DTCG en catalogue
 * (`dtcg.ts`), passe les deux contrôles du mode Tokens et mesure R1 à R5 (`proprietes.ts`). Il mesure et ne corrige rien dans
 * `packages/kit/src/`.
 *
 * Sources : le fichier Slice (confidentiel), les tokens d'Intencial, et tout `--fichier <chemin>`. Une source absente se saute.
 * Options : `--source slice|intencial`, `--fichier <chemin>` (répétable), `--propriete R1..R5` (répétable), `--chrono` (médiane de
 * `CHRONO_PASSES` passes de chaque contrôle, en ms, sans les propriétés R1 à R5 ; écrit `chrono.txt`, qui ne porte que des nombres).
 *
 * Sorties sous `_local/stress/rejeu-fichiers/` : `<source>/rapport.txt` et `rapport.json` portent des noms de variables ;
 * `resume.txt` ne porte que des nombres et des codes, comme la sortie standard. Aucun fichier ne porte de date ni de durée : la
 * durée s'imprime à l'écran. Si la source Slice a tourné, un contrôle cherche ses mots dans la sortie standard et `resume.txt`.
 */
import { performance } from 'node:perf_hooks';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { termeOuFormeConnu } from '../../../src/referentiel/termes-connus.js';
import { CHEMIN_DE_SLICE_PAR_DEFAUT, DOSSIER_DE_SLICE, lireLaSlice, lireLesSystemes, motsASurveiller, motsDuTexte, RACINE_DU_DEPOT } from '../f1-noms/corpus.js';
import { construireLeDictionnaire, vocabulaireDeReference } from '../f1-noms/dictionnaire.js';
import { controlerLIntegriteUcm, controlerLeCatalogue } from '../../../src/controles/index.js';
import { catalogueDepuisTokens } from './dtcg.js';
import { lire, r1Base, r2Determinisme, r3Ordre, r4PointFixe, r5DefautsMeles, type Resultat } from './proprietes.js';

export const DOSSIER_DU_REJEU = join(RACINE_DU_DEPOT, '_local/stress/rejeu-fichiers');
export const CHEMIN_D_INTENCIAL = join(RACINE_DU_DEPOT, '..', 'intencial-library/src/tokens/tokens.json');
const PROPRIETES = ['R1', 'R2', 'R3', 'R4', 'R5'] as const;
type Propriete = typeof PROPRIETES[number];

interface Source { id: string; chemin: string }

interface Options { sources: string[]; fichiers: string[]; proprietes: Propriete[]; chrono: boolean }

export const CHRONO_PASSES = 11;

function lireLesOptions(argv: readonly string[]): Options {
  const options: Options = { sources: [], fichiers: [], proprietes: [], chrono: false };
  for (let i = 0; i < argv.length; i++) {
    const option = argv[i];
    const valeur = (): string => {
      const suivante = argv[++i];
      if (suivante === undefined) throw new Error(`${option} attend une valeur.`);
      return suivante;
    };
    if (option === '--chrono') options.chrono = true;
    else if (option === '--source') {
      const source = valeur();
      if (source !== 'slice' && source !== 'intencial') throw new Error('--source admet slice ou intencial.');
      options.sources.push(source);
    } else if (option === '--fichier') options.fichiers.push(resolve(valeur()));
    else if (option === '--propriete') {
      const propriete = valeur() as Propriete;
      if (!PROPRIETES.includes(propriete)) throw new Error(`--propriete admet ${PROPRIETES.join(', ')}.`);
      options.proprietes.push(propriete);
    } else throw new Error(`Option inconnue : ${option}. Options admises : --source, --fichier, --propriete, --chrono.`);
  }
  return options;
}

function sourcesDemandees(options: Options): Source[] {
  const toutes = options.sources.length === 0 && options.fichiers.length === 0;
  const liste: Source[] = [];
  if (toutes || options.sources.includes('slice')) liste.push({ id: 'slice', chemin: CHEMIN_DE_SLICE_PAR_DEFAUT });
  if (toutes || options.sources.includes('intencial')) liste.push({ id: 'intencial', chemin: CHEMIN_D_INTENCIAL });
  options.fichiers.forEach((chemin, rang) => liste.push({ id: `fichier-${rang + 1}`, chemin }));
  return liste;
}

/** Une ligne par nombre, clés imbriquées jointes par un point : le résumé et la sortie standard n'ont que des comptes et des codes. */
function aplatir(valeur: unknown, prefixe: string, lignes: string[]): void {
  if (valeur !== null && typeof valeur === 'object') {
    for (const [cle, enfant] of Object.entries(valeur)) aplatir(enfant, prefixe === '' ? cle : `${prefixe}.${cle}`, lignes);
  } else lignes.push(`${prefixe} = ${String(valeur)}`);
}

function lignesDe(valeur: unknown, prefixe: string): string[] {
  const lignes: string[] = [];
  aplatir(valeur, prefixe, lignes);
  return lignes;
}

interface RapportDeSource { id: string; conversion: unknown; proprietes: Partial<Record<Propriete, Resultat>> }

function rapportEnTexte(rapport: RapportDeSource): string {
  const blocs = [`# ${rapport.id}`, '', '## Conversion', ...lignesDe(rapport.conversion, '')];
  for (const [nom, resultat] of Object.entries(rapport.proprietes)) {
    blocs.push('', `## ${nom}`, ...lignesDe(resultat.nombres, ''), '', `### ${nom}, détails nommés`, ...lignesDe(resultat.nommes, ''));
  }
  return `${blocs.join('\n')}\n`;
}

function resumeDe(rapport: RapportDeSource): string[] {
  const { jetonsSautesParType: _types, ...conversion } = rapport.conversion as Record<string, unknown>;
  const lignes = [`# ${rapport.id}`, ...lignesDe(conversion, 'conversion')];
  for (const [nom, resultat] of Object.entries(rapport.proprietes)) lignes.push(...lignesDe(resultat.nombres, nom));
  return lignes;
}

function rejouer(source: Source, proprietes: readonly Propriete[]): RapportDeSource | 'absente' | 'illisible' {
  if (!existsSync(source.chemin)) return 'absente';
  let tokens: unknown;
  try { tokens = JSON.parse(readFileSync(source.chemin, 'utf8')); } catch { return 'illisible'; }
  const { catalogue, bilan } = catalogueDepuisTokens(tokens);
  const base = lire(catalogue);
  const resultats: Partial<Record<Propriete, Resultat>> = {};
  for (const propriete of proprietes) {
    if (propriete === 'R1') resultats.R1 = r1Base(base);
    else if (propriete === 'R2') resultats.R2 = r2Determinisme(catalogue, base);
    else if (propriete === 'R3') resultats.R3 = r3Ordre(catalogue, base);
    else if (propriete === 'R4') resultats.R4 = r4PointFixe(catalogue, base);
    else resultats.R5 = r5DefautsMeles(catalogue, base);
  }
  return { id: source.id, conversion: bilan, proprietes: resultats };
}

/** Cherche les mots de Slice (hors vocabulaire, dictionnaire et mots admis) dans les textes donnés. Rend le nombre de textes en cause. */
function motsDeSliceDansLaSortie(textes: readonly string[]): { mots: number; textesEnCause: number } {
  const slice = lireLaSlice(CHEMIN_DE_SLICE_PAR_DEFAUT);
  const connus = new Set<string>([...vocabulaireDeReference().termes, ...construireLeDictionnaire(lireLesSystemes()).mots.map((entree) => entree.mot)]);
  let admis = new Set<string>();
  try { admis = new Set(readFileSync(join(DOSSIER_DE_SLICE, 'mots-admis.txt'), 'utf8').toLowerCase().match(/[a-z]+/g) ?? []); } catch { /* aucun mot admis */ }
  const mots = new Set(motsASurveiller(slice, (mot) => connus.has(mot) || termeOuFormeConnu(mot) || admis.has(mot)));
  const textesEnCause = textes.filter((texte) => [...motsDuTexte(texte)].some((mot) => mots.has(mot))).length;
  return { mots: mots.size, textesEnCause };
}

const mediane = (valeurs: readonly number[]): number => [...valeurs].sort((a, b) => a - b)[Math.floor(valeurs.length / 2)] ?? 0;

/** Médiane en ms de `CHRONO_PASSES` passes de chaque contrôle sur le catalogue converti, après une passe d'échauffement. */
function chronometrer(source: Source): string[] | 'absente' | 'illisible' {
  if (!existsSync(source.chemin)) return 'absente';
  let tokens: unknown;
  try { tokens = JSON.parse(readFileSync(source.chemin, 'utf8')); } catch { return 'illisible'; }
  const { catalogue } = catalogueDepuisTokens(tokens);
  const options = { ecriture: null, rolesIgnores: [] };
  controlerLeCatalogue(catalogue);
  controlerLIntegriteUcm(catalogue, options);
  const catalogueMs: number[] = [];
  const integriteMs: number[] = [];
  let constatsCatalogue = 0;
  let constatsIntegrite = 0;
  for (let passe = 0; passe < CHRONO_PASSES; passe++) {
    const t0 = performance.now();
    constatsCatalogue = controlerLeCatalogue(catalogue).length;
    const t1 = performance.now();
    constatsIntegrite = controlerLIntegriteUcm(catalogue, options).length;
    const t2 = performance.now();
    catalogueMs.push(t1 - t0);
    integriteMs.push(t2 - t1);
  }
  const arrondi = (n: number): string => n.toFixed(1);
  return [
    `# ${source.id}`,
    `variables = ${catalogue.variables.length}`,
    `passes = ${CHRONO_PASSES}`,
    `controlerLeCatalogue.constats = ${constatsCatalogue}`,
    `controlerLeCatalogue.medianeMs = ${arrondi(mediane(catalogueMs))}`,
    `controlerLeCatalogue.minMs = ${arrondi(Math.min(...catalogueMs))}`,
    `controlerLeCatalogue.maxMs = ${arrondi(Math.max(...catalogueMs))}`,
    `controlerLIntegriteUcm.constats = ${constatsIntegrite}`,
    `controlerLIntegriteUcm.medianeMs = ${arrondi(mediane(integriteMs))}`,
    `controlerLIntegriteUcm.minMs = ${arrondi(Math.min(...integriteMs))}`,
    `controlerLIntegriteUcm.maxMs = ${arrondi(Math.max(...integriteMs))}`,
  ];
}

function mainChrono(options: Options): void {
  mkdirSync(DOSSIER_DU_REJEU, { recursive: true });
  const lignes: string[] = [];
  for (const source of sourcesDemandees(options)) {
    const bloc = chronometrer(source);
    lignes.push(...(typeof bloc === 'string' ? [`# ${source.id}`, `etat = ${bloc}`] : bloc));
  }
  for (const ligne of lignes) console.log(ligne);
  writeFileSync(join(DOSSIER_DU_REJEU, 'chrono.txt'), lignes.join('\n') + '\n');
}

function main(): void {
  const debut = Date.now();
  const options = lireLesOptions(process.argv.slice(2));
  if (options.chrono) { mainChrono(options); return; }
  const proprietes = options.proprietes.length > 0 ? PROPRIETES.filter((p) => options.proprietes.includes(p)) : PROPRIETES;
  const sortie: string[] = [];
  const dire = (ligne: string): void => { sortie.push(ligne); console.log(ligne); };
  const resume: string[] = [];
  mkdirSync(DOSSIER_DU_REJEU, { recursive: true });

  let sliceJouee = false;
  for (const source of sourcesDemandees(options)) {
    const rapport = rejouer(source, proprietes);
    if (rapport === 'absente' || rapport === 'illisible') {
      dire(`${source.id} : ${rapport}`);
      resume.push(`# ${source.id}`, `etat = ${rapport}`);
      continue;
    }
    if (source.id === 'slice') sliceJouee = true;
    const dossier = join(DOSSIER_DU_REJEU, source.id);
    mkdirSync(dossier, { recursive: true });
    writeFileSync(join(dossier, 'rapport.txt'), rapportEnTexte(rapport));
    writeFileSync(join(dossier, 'rapport.json'), `${JSON.stringify(rapport, null, 2)}\n`);
    const lignes = resumeDe(rapport);
    resume.push(...lignes);
    for (const ligne of lignes) dire(ligne);
  }

  const texteDuResume = `${resume.join('\n')}\n`;
  writeFileSync(join(DOSSIER_DU_REJEU, 'resume.txt'), texteDuResume);
  if (sliceJouee) {
    const { mots, textesEnCause } = motsDeSliceDansLaSortie([sortie.join('\n'), texteDuResume]);
    console.log(`Fuite : ${mots} mots de Slice surveillés, ${textesEnCause} texte(s) en cause sur 2 (sortie standard, resume.txt).`);
    if (textesEnCause > 0) process.exitCode = 1;
  }
  console.log(`Durée : ${((Date.now() - debut) / 1000).toFixed(1)} s`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (erreur) {
    console.error(erreur instanceof Error ? erreur.message : String(erreur));
    process.exitCode = 1;
  }
}

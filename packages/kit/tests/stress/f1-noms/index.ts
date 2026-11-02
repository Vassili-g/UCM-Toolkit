/**
 * Point d'entrée du harnais de stress test F1 (noms de Nomenclature), hors de `npm test`. `--corpus` (lot 1) lit les design
 * systems, écrit le tableau de conversion, le dictionnaire et les listes de candidats sous `_local/stress/f1-noms/`.
 * `--scenarios` (lot 2) génère les cas des strates, compte ceux de chaque strate contre le plan et écrit l'empreinte.
 * Les autres options du plan sont reconnues et refusées tant que leur lot n'existe pas.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  bilanDuCorpus, DOSSIER_DE_SORTIE, lireLesSystemes, MODES_DE_CHEMINS, MODES_DE_COLLECTIONS, tableauDeConversion,
} from './corpus.js';
import {
  candidatsADistanceUn, candidatsAmbigus, candidatsDeFormes, candidatsDeSynonymes, construireLeDictionnaire, vocabulaireDeReference,
} from './dictionnaire.js';
import { bilanDesScenarios, creerLeContexte, GRAINE_PAR_DEFAUT } from './scenarios.js';

const PAS_ENCORE: Readonly<Record<string, string>> = {
  '--attendre-zero': 'lot 3',
  '--slice': 'lot 5 : le fichier Slice est confidentiel et le harnais ne le lit pas avant ce lot', '--verifier-fuite': 'lot 5',
};

interface Options { corpus: boolean; scenarios: boolean; strates?: string[]; rapide: boolean; graine: number; sortie: string }

function lireLesOptions(argv: readonly string[]): Options {
  const options: Options = { corpus: false, scenarios: false, rapide: false, graine: GRAINE_PAR_DEFAUT, sortie: DOSSIER_DE_SORTIE };
  for (let i = 0; i < argv.length; i++) {
    const option = argv[i];
    if (option in PAS_ENCORE) throw new Error(`L'option ${option} n'existe pas encore (${PAS_ENCORE[option]}).`);
    if (option === '--corpus') options.corpus = true;
    else if (option === '--scenarios') options.scenarios = true;
    else if (option === '--rapide') options.rapide = true;
    else if (option === '--strate') {
      const valeur = argv[++i];
      if (!valeur) throw new Error('--strate demande une liste, par exemple S1,S2.');
      options.strates = valeur.split(',').map((strate) => strate.trim().toUpperCase());
    } else if (option === '--graine') {
      const graine = Number(argv[++i]);
      if (!Number.isInteger(graine)) throw new Error('--graine demande un entier.');
      options.graine = graine;
    }
    else if (option === '--sortie') {
      const valeur = argv[++i];
      if (!valeur) throw new Error('--sortie demande un dossier.');
      options.sortie = resolve(valeur);
    } else throw new Error(`Option inconnue : ${option}. Options admises : --corpus, --scenarios, --strate, --rapide, --graine, --sortie <dossier>.`);
  }
  return options;
}

const ecrire = (chemin: string, contenu: unknown) => writeFileSync(chemin, `${JSON.stringify(contenu, null, 2)}\n`, 'utf8');

function lancerLeCorpus(sortie: string): void {
  const systemes = lireLesSystemes();
  const bilan = bilanDuCorpus(systemes);
  console.log(`${bilan.systemes} systèmes, ${bilan.noms} noms`);
  const variantes = Object.entries(bilan.nomsParVariante);
  for (const [variante, noms] of variantes) console.log(`  ${variante} : ${noms} noms`);
  const comptes = new Set(variantes.map(([, noms]) => noms));
  if (comptes.size !== 1 || !comptes.has(bilan.noms)) {
    throw new Error(`Les quatre variantes ne rendent pas le même nombre de noms : ${JSON.stringify(bilan.nomsParVariante)}.`);
  }
  console.log(`  ${MODES_DE_CHEMINS.length * MODES_DE_COLLECTIONS.length} variantes par système, même nombre de noms.`);

  mkdirSync(sortie, { recursive: true });
  ecrire(join(sortie, 'conversion.json'), tableauDeConversion(systemes));

  const dictionnaire = construireLeDictionnaire(systemes);
  const vocabulaire = vocabulaireDeReference();
  const dossier = join(sortie, 'dictionnaire');
  mkdirSync(dossier, { recursive: true });
  const formes = candidatsDeFormes(dictionnaire);
  const distanceUn = candidatsADistanceUn(dictionnaire);
  const ambigus = candidatsAmbigus(dictionnaire, vocabulaire);
  const synonymes = candidatsDeSynonymes(systemes, dictionnaire);
  ecrire(join(dossier, 'dictionnaire.json'), { motsDistincts: dictionnaire.motsDistincts, mots: dictionnaire.mots });
  ecrire(join(dossier, 'candidats-formes.json'), formes);
  ecrire(join(dossier, 'candidats-distance-un.json'), distanceUn);
  ecrire(join(dossier, 'candidats-ambigus.json'), ambigus);
  ecrire(join(dossier, 'candidats-synonymes.json'), synonymes);
  console.log(`Dictionnaire : ${dictionnaire.mots.length} mots (${dictionnaire.motsDistincts} mots distincts avant le filtre).`);
  console.log(`Vocabulaire de référence : ${vocabulaire.termes.size} termes, ${vocabulaire.alphabetiques.length} alphabétiques sans tiret.`);
  console.log(`Candidats de formes : ${formes.length} paires (${formes.filter((p) => p.terminaison === 's').length} en s).`);
  console.log(`Candidats à distance 1 : ${distanceUn.length} paires (${distanceUn.filter((p) => p.longueur === 3).length} de 3 lettres, ${distanceUn.filter((p) => p.longueur === 4).length} de 4).`);
  console.log(`Candidats ambigus : ${ambigus.length} mots, dont ${ambigus.filter((m) => !m.dansLeVocabulaire).length} hors vocabulaire.`);
  console.log(`Candidats de synonymes : ${synonymes.length} paires.`);
  console.log(`Écrit sous ${sortie}`);
}

function lancerLesScenarios(options: Options): void {
  const debut = Date.now();
  const contexte = creerLeContexte(lireLesSystemes(), options.graine);
  const bilan = bilanDesScenarios(contexte, { strates: options.strates, rapide: options.rapide });
  console.log(`Graine ${bilan.graine}, empreinte ${bilan.empreinte}${options.rapide ? ' (un cas sur dix)' : ''}`);
  for (const [strate, ligne] of Object.entries(bilan.parStrate)) {
    const ecart = `${ligne.ecart >= 0 ? '+' : ''}${(ligne.ecart * 100).toFixed(1)} %`;
    console.log(`  ${strate.padEnd(4)} ${String(ligne.cas).padStart(6)} cas, plan ${String(ligne.plan).padStart(6)}, écart ${ecart}${options.rapide || ligne.dansLaMarge ? '' : ' (hors marge)'}`);
  }
  console.log(`  Total ${bilan.total} cas en ${Date.now() - debut} ms`);
  mkdirSync(options.sortie, { recursive: true });
  ecrire(join(options.sortie, 'scenarios-bilan.json'), bilan);
}

try {
  const options = lireLesOptions(process.argv.slice(2));
  if (!options.corpus && !options.scenarios) throw new Error('Rien à lancer : choisir --corpus ou --scenarios.');
  if (options.corpus) lancerLeCorpus(options.sortie);
  if (options.scenarios) lancerLesScenarios(options);
} catch (erreur) {
  console.error(erreur instanceof Error ? erreur.message : String(erreur));
  process.exitCode = 1;
}

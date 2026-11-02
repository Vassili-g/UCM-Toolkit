/**
 * Point d'entrée du harnais de stress test F1 (noms de Nomenclature), hors de `npm test`. Lot 1 du plan : `--corpus` lit les
 * design systems, écrit le tableau de conversion, le dictionnaire et les listes de candidats sous `_local/stress/f1-noms/`.
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

const PAS_ENCORE: Readonly<Record<string, string>> = {
  '--strate': 'lot 2', '--rapide': 'lot 2', '--graine': 'lot 2', '--attendre-zero': 'lot 3',
  '--slice': 'lot 5 : le fichier Slice est confidentiel et le harnais ne le lit pas avant ce lot', '--verifier-fuite': 'lot 5',
};

interface Options { corpus: boolean; sortie: string }

function lireLesOptions(argv: readonly string[]): Options {
  const options: Options = { corpus: false, sortie: DOSSIER_DE_SORTIE };
  for (let i = 0; i < argv.length; i++) {
    const option = argv[i];
    if (option in PAS_ENCORE) throw new Error(`L'option ${option} n'existe pas encore (${PAS_ENCORE[option]}).`);
    if (option === '--corpus') options.corpus = true;
    else if (option === '--sortie') {
      const valeur = argv[++i];
      if (!valeur) throw new Error('--sortie demande un dossier.');
      options.sortie = resolve(valeur);
    } else throw new Error(`Option inconnue : ${option}. Options admises : --corpus, --sortie <dossier>.`);
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

try {
  const options = lireLesOptions(process.argv.slice(2));
  if (!options.corpus) throw new Error('Rien à lancer : le lot 1 ne fournit que --corpus. Les strates arrivent avec le lot 2.');
  lancerLeCorpus(options.sortie);
} catch (erreur) {
  console.error(erreur instanceof Error ? erreur.message : String(erreur));
  process.exitCode = 1;
}

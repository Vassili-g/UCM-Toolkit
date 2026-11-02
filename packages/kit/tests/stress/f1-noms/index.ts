/**
 * Point d'entrée du harnais de stress test F1 (noms de Nomenclature), hors de `npm test`. `--corpus` (lot 1) lit les design
 * systems, écrit le tableau de conversion, le dictionnaire et les listes de candidats sous `_local/stress/f1-noms/`.
 * `--scenarios` (lot 2) génère les cas des strates, compte ceux de chaque strate contre le plan et écrit l'empreinte.
 * Sans `--corpus` ni `--scenarios` (lot 3), le harnais exécute les cas sur le kit, juge les sorties et écrit `rapport.md`,
 * `rapport.json`, `manques.csv` et `collisions-sans-question.csv` ; `--attendre-zero` sort 1 s'il reste un manqué ou un faux positif.
 * Le lot 4 ajoute à cette mesure, hors `--strate`, les passes de faux positifs et la courbe du seuil (`faux-positifs.csv`, `a-juger.csv`,
 * `courbe-seuil.csv`, `faux-positifs-par-type.csv`, et une section de `rapport.md`). `--faux-positifs` les lance seules ;
 * `--mesure-du-seuil` est l'entrée des processus enfants que lance la courbe, sous le chargeur `seuil.mjs`.
 * Le lot 5 ajoute `--slice <chemin>` et `--verifier-fuite`. `--slice` lit le fichier Slice (confidentiel), le convertit comme un système
 * du corpus et lance sur lui la passe de faux positifs, le second passage de P-21 et les 240 cas de S16 ; toutes ses sorties vont sous
 * `_local/stress/f1-noms/slice/`, en comptes et en identifiants de cas. Sans cette option, le fichier n'est jamais ouvert.
 * `--verifier-fuite` sort 1 si un mot de Slice, inconnu du vocabulaire et du dictionnaire, apparaît dans un fichier suivi par Git.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { termeOuFormeConnu } from '../../../src/referentiel/termes-connus.js';
import {
  bilanDuCorpus, CHEMIN_DE_SLICE_PAR_DEFAUT, DOSSIER_DE_SLICE, DOSSIER_DE_SORTIE, fichiersEnFuite, lireLaSlice, lireLesSystemes, motsASurveiller,
  MODES_DE_CHEMINS, MODES_DE_COLLECTIONS, RACINE_DU_DEPOT, tableauDeConversion, type Systeme,
} from './corpus.js';
import {
  candidatsADistanceUn, candidatsAmbigus, candidatsDeFormes, candidatsDeSynonymes, construireLeDictionnaire, vocabulaireDeReference,
} from './dictionnaire.js';
import { creerLeDetecteur } from './detecteur.js';
import { mesurer, regrouperLesPasses, sortieDeLaPasse, verifierLaStabilite } from './execution.js';
import {
  CERTAINES, CLASSES, comptesParClasseEtType, creerLeContexteDeClassement, ecrireLesFauxPositifs, executerUnePasse, mesurerLeKit, mesurerLesFauxPositifs,
  sectionDuRapport, type MesureDesFauxPositifs, type Passe,
} from './faux-positifs.js';
import { chargerLesClassements, creerLeContexteOracle, jugerUneFaute, type ContexteOracle, type Sortie, type Verdict } from './oracle.js';
import { ecrireLeRapport, resteDesEcarts } from './rapport.js';
import { bilanDesScenarios, creerLeContexte, genererLesScenarios, GRAINE_PAR_DEFAUT, STRATES, type Contexte, type Scenario } from './scenarios.js';

interface Options {
  corpus: boolean; scenarios: boolean; fauxPositifs: boolean; mesureDuSeuil: boolean; strates?: string[]; rapide: boolean; attendreZero: boolean; graine: number; sortie: string;
  slice?: string; verifierFuite: boolean; sortieDonnee: boolean;
}

function lireLesOptions(argv: readonly string[]): Options {
  const options: Options = { corpus: false, scenarios: false, fauxPositifs: false, mesureDuSeuil: false, rapide: false, attendreZero: false, graine: GRAINE_PAR_DEFAUT, sortie: DOSSIER_DE_SORTIE, verifierFuite: false, sortieDonnee: false };
  for (let i = 0; i < argv.length; i++) {
    const option = argv[i];
    if (option === '--slice') {
      const valeur = argv[++i];
      if (!valeur) throw new Error('--slice demande le chemin du fichier Slice.');
      options.slice = resolve(valeur);
    } else if (option === '--verifier-fuite') options.verifierFuite = true;
    else if (option === '--corpus') options.corpus = true;
    else if (option === '--scenarios') options.scenarios = true;
    else if (option === '--faux-positifs') options.fauxPositifs = true;
    else if (option === '--mesure-du-seuil') options.mesureDuSeuil = true;
    else if (option === '--rapide') options.rapide = true;
    else if (option === '--attendre-zero') options.attendreZero = true;
    else if (option === '--strate') {
      const valeur = argv[++i];
      if (!valeur) throw new Error('--strate demande une liste, par exemple S1,S2.');
      options.strates = valeur.split(',').map((strate) => strate.trim().toUpperCase());
      const inconnue = options.strates.find((strate) => !(strate in STRATES));
      if (inconnue) throw new Error(`Strate inconnue : ${inconnue}. Strates admises : ${Object.keys(STRATES).join(', ')}.`);
    } else if (option === '--graine') {
      const graine = Number(argv[++i]);
      if (!Number.isInteger(graine)) throw new Error('--graine demande un entier.');
      options.graine = graine;
    }
    else if (option === '--sortie') {
      const valeur = argv[++i];
      if (!valeur) throw new Error('--sortie demande un dossier.');
      options.sortie = resolve(valeur);
      options.sortieDonnee = true;
    } else throw new Error(`Option inconnue : ${option}. Options admises : --corpus, --scenarios, --faux-positifs, --strate, --rapide, --graine, --attendre-zero, --sortie <dossier>, --slice <chemin>, --verifier-fuite.`);
  }
  if (options.slice && options.sortieDonnee) throw new Error('--slice écrit sous _local/stress/f1-noms/slice/ et refuse --sortie : un dossier suivi par Git recevrait des sorties tirées de Slice.');
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

const INDEX = fileURLToPath(import.meta.url);

async function mesurerLesFauxPositifsDuHarnais(options: Options): Promise<MesureDesFauxPositifs> {
  const mesure = await mesurerLesFauxPositifs(lireLesSystemes(), { rapide: options.rapide, graine: options.graine, index: INDEX, progression: (message) => console.log(`  ${message}`) });
  ecrireLesFauxPositifs(mesure, options.sortie);
  return mesure;
}

async function lancerLaMesure(options: Options): Promise<void> {
  const mesure = mesurer(lireLesSystemes(), { strates: options.strates, rapide: options.rapide, graine: options.graine, progression: (message) => console.log(`  ${message}`) });
  const fauxPositifs = options.strates ? undefined : await mesurerLesFauxPositifsDuHarnais(options);
  ecrireLeRapport(mesure, options.sortie, fauxPositifs ? sectionDuRapport(fauxPositifs) : undefined);
  const total = Object.values(mesure.casParStrate).reduce((somme, n) => somme + n, 0);
  console.log(`${total} cas en ${(mesure.dureeMs / 1000).toFixed(1)} s${mesure.complet ? ' (mode complet)' : ''}, rapport sous ${options.sortie}`);
  const certains = fauxPositifs ? fauxPositifs.lignes.filter((ligne) => CERTAINES.has(ligne.classe)).reduce((somme, ligne) => somme + ligne.nombre, 0) : 0;
  const reste = resteDesEcarts(mesure) + certains;
  if (options.attendreZero && reste > 0) {
    console.error(`${reste} manqué(s) ou faux positif(s) restent.`);
    process.exitCode = 1;
  }
}

async function lancerLesFauxPositifs(options: Options): Promise<void> {
  const mesure = await mesurerLesFauxPositifsDuHarnais(options);
  console.log(`${sectionDuRapport(mesure)}
Écrit sous ${options.sortie}`);
}

// ---------------------------------------------------------------------------------------------------------------- Slice

/** Le dossier de Slice doit être ignoré par Git avant la première écriture : une sortie de ce mode ne doit jamais devenir un fichier suivi. */
function exigerUnDossierIgnore(dossier: string): void {
  const resultat = spawnSync('git', ['check-ignore', '-q', join(dossier, 'rapport.md')], { cwd: RACINE_DU_DEPOT });
  if (resultat.status !== 0) throw new Error(`${dossier} n'est pas ignoré par Git : le mode Slice n'écrit rien.`);
}

/** Même jugement que `jugerUnSite` d'`execution.ts` (non exporté) : la faute ou le synonyme muté du site donne un renommage ou une question. */
function jugerUnSiteDeSlice(cas: Scenario, sortie: Sortie, ctx: ContexteOracle): Verdict {
  const site = cas.site!;
  const id = `${site.systeme}:${site.indice}`;
  const { propriete } = cas.attendus[0];
  if (propriete === 'P-01') return jugerUneFaute(cas, sortie, ctx, site.mutant, site.mot, ['P-01']);
  const renommage = sortie.renommages.find((r) => r.id === id && r.termes.some((terme) => terme.avant.join('-').toLowerCase() === site.mutant.toLowerCase()));
  const enCollision = sortie.collisions.some((collision) => collision.ids.includes(id));
  const question = sortie.questions.find((q) => {
    const enJeu = new Set(q.type === 'paire' ? q.termes.map((t) => t.mot.toLowerCase()) : q.type === 'ecriture-du-terme' ? [q.terme.mot.toLowerCase(), ...q.proposition] : [q.nom.toLowerCase()]);
    return enJeu.has(site.mutant.toLowerCase()) && enJeu.has(site.mot);
  });
  const ok = !!renommage || !!question;
  return {
    cas: cas.id, strate: cas.strate, operateur: cas.operateur, proprietes: [propriete], role: 'oracle', attendu: true, issue: ok ? 'detecte' : 'manque',
    mot: site.mutant, reference: site.mot, axes: cas.axes, detail: ok ? 'détecté' : 'ni renommage ni question', ecarts: ok ? [] : [enCollision ? 'E-08' : 'nouveau'],
  };
}

interface ComptesDeMutation { cas: number; detectes: number; manques: number }

/** Rend le nombre de manqués, de faux positifs certains et d'échecs de stabilité, pour `--attendre-zero`. */
function lancerLaSlice(options: Options, corpus: readonly Systeme[], slice: Systeme): number {
  const debut = Date.now();
  const scenarios = creerLeContexte(corpus, options.graine);
  const dossier = DOSSIER_DE_SLICE;
  exigerUnDossierIgnore(dossier);
  mkdirSync(dossier, { recursive: true });

  const collections = new Set(slice.noms.map((nom) => nom.collection)).size;
  const alias = slice.noms.filter((nom) => nom.alias !== undefined).length;
  console.log(`Slice : ${slice.noms.length} noms, ${collections} collections, ${alias} alias`);

  // Faux positifs : le dictionnaire du classement vient des seize systèmes, jamais de Slice ; la variante `points` garde les noms tels que le fichier les publie
  const passe: Passe = { systeme: slice, chemins: 'points', collections: 'couche', cle: `${slice.id}/points/couche` };
  const resultat = executerUnePasse(passe, corpus, creerLeContexteDeClassement(scenarios));
  const fauxPositifs: MesureDesFauxPositifs = { passes: 1, noms: resultat.noms, lignes: resultat.lignes, courbe: [], retenue: undefined, sansFauxPositif: undefined, dureeMs: Date.now() - debut };
  ecrireLesFauxPositifs(fauxPositifs, dossier);
  rmSync(join(dossier, 'courbe-seuil.csv'), { force: true }); // la courbe du seuil se mesure sur le corpus, pas sur Slice
  const parClasse = Object.fromEntries(CLASSES.map((classe) => [classe, resultat.lignes.filter((ligne) => ligne.classe === classe).reduce((somme, ligne) => somme + ligne.nombre, 0)]));
  const parType = Object.fromEntries(comptesParClasseEtType(resultat.lignes));
  console.log(`Faux positifs : ${resultat.lignes.length} lignes, ${CLASSES.map((classe) => `${classe} ${parClasse[classe]}`).join(', ')}`);

  // Idempotence (P-21) et ordre des entrées (P-22) : `verifierLaStabilite` tire 1 500 noms au plus
  const stabilite = verifierLaStabilite([slice], 1, options.graine);
  console.log(`Idempotence : P-21 ${stabilite.p21.reussis}/${stabilite.fichiers} (${stabilite.noms} noms tirés), P-22 ${stabilite.p22.reussis}/${stabilite.fichiers}`);

  // S16 sur Slice seul : 6 opérateurs × 40 sites au plus, par passes de 20 sites
  const sites = [...genererLesScenarios({ ...scenarios, systemes: [slice] } as Contexte, { strates: ['S16'] })];
  const toutes = regrouperLesPasses(sites);
  const passes = options.rapide ? toutes.filter((_, rang) => rang % 10 === 0) : toutes;
  const ctx = creerLeContexteOracle(scenarios, creerLeDetecteur(scenarios.vocabulaire, scenarios.motsDuDictionnaire), chargerLesClassements());
  const verdicts: Verdict[] = [];
  for (const unePasse of passes) {
    const sortie = sortieDeLaPasse(unePasse, slice);
    verdicts.push(...unePasse.cas.map((cas) => jugerUnSiteDeSlice(cas, sortie, ctx)));
  }
  const parOperateur: Record<string, ComptesDeMutation> = {};
  for (const verdict of verdicts) {
    const comptes = parOperateur[verdict.operateur] ?? (parOperateur[verdict.operateur] = { cas: 0, detectes: 0, manques: 0 });
    comptes.cas++;
    if (verdict.issue === 'detecte') comptes.detectes++;
    else if (verdict.issue === 'manque') comptes.manques++;
  }
  const detectes = verdicts.filter((verdict) => verdict.issue === 'detecte').length, manques = verdicts.filter((verdict) => verdict.issue === 'manque').length;
  console.log(`Mutations (S16) : ${verdicts.length} cas en ${passes.length} passes, ${detectes} détectés, ${manques} manqués`);
  for (const [operateur, c] of Object.entries(parOperateur).sort()) console.log(`  ${operateur} : ${c.cas} cas, ${c.detectes} détectés, ${c.manques} manqués`);

  // Ces sorties ne citent que des comptes et des identifiants de cas ; `faux-positifs.csv` et `a-juger.csv` portent des exemples, donc des noms de Slice
  const certains = resultat.lignes.filter((ligne) => CERTAINES.has(ligne.classe)).reduce((somme, ligne) => somme + ligne.nombre, 0);
  const rapport = {
    graine: options.graine, noms: slice.noms.length, collections, alias, fauxPositifs: { lignes: resultat.lignes.length, parClasse, parType, certains },
    stabilite: { fichiers: stabilite.fichiers, noms: stabilite.noms, p21: stabilite.p21, p22: stabilite.p22, echecs: stabilite.echecs.map((echec) => echec.propriete) },
    mutations: { cas: verdicts.length, passes: passes.length, detectes, manques, parOperateur },
    cas: verdicts.map((verdict) => ({ id: verdict.cas, operateur: verdict.operateur, issue: verdict.issue })),
  };
  writeFileSync(join(dossier, 'rapport.json'), `${JSON.stringify(rapport)}\n`, 'utf8');
  writeFileSync(join(dossier, 'manques.csv'), `${['cas,operateur,propriete,mutant,reference,ecart', ...verdicts.filter((verdict) => verdict.issue === 'manque')
    .map((verdict) => [verdict.cas, verdict.operateur, verdict.proprietes[0], verdict.mot, verdict.reference, verdict.ecarts[0]].join(','))].join('\n')}\n`, 'utf8');
  writeFileSync(join(dossier, 'rapport.md'), `${[
    '# Mesure sur Slice', '',
    `${slice.noms.length} noms, ${collections} collections, ${alias} alias, graine ${options.graine}.`, '',
    `Faux positifs : ${CLASSES.map((classe) => `${classe} ${parClasse[classe]}`).join(', ')}.`,
    `Idempotence : P-21 ${stabilite.p21.reussis}/${stabilite.fichiers}, P-22 ${stabilite.p22.reussis}/${stabilite.fichiers} (${stabilite.noms} noms tirés).`,
    `Mutations : ${verdicts.length} cas, ${detectes} détectés, ${manques} manqués.`, '',
    '| Opérateur | Cas | Détectés | Manqués |', '| --- | --- | --- | --- |',
    ...Object.entries(parOperateur).sort().map(([operateur, c]) => `| ${operateur} | ${c.cas} | ${c.detectes} | ${c.manques} |`),
  ].join('\n')}\n`, 'utf8');
  console.log(`${(Date.now() - debut) / 1000} s, sorties sous ${dossier}`);
  return manques + certains + stabilite.p21.echecs + stabilite.p22.echecs;
}

/**
 * Les mots de Slice que le mainteneur a relus et reconnus pour des mots ordinaires (des mots séparés par un espace ou un retour à la ligne). Le fichier reste sous `_local/` : le
 * ranger dans un fichier suivi par Git publierait la liste. Un mot ordinaire que ni le vocabulaire ni le dictionnaire des design systems
 * ne couvrent s'écrit dans bien des fichiers suivis et ferait sortir le contrôle en erreur à chaque lancement.
 */
function lireLesMotsAdmis(): Set<string> {
  try {
    return new Set((readFileSync(join(DOSSIER_DE_SLICE, 'mots-admis.txt'), 'utf8').toLowerCase().match(/[a-z]+/g) ?? []));
  } catch { return new Set(); }
}

/**
 * Cherche dans les fichiers de `git ls-files` les mots de Slice qui ne sont ni du vocabulaire du kit ni du dictionnaire des design systems.
 * Le terminal donne le nombre de mots et les fichiers en cause, jamais un mot. Rend 0 sans fuite, 1 sinon.
 */
function verifierLaFuite(chemin: string, corpus: readonly Systeme[]): number {
  const slice = lireLaSlice(chemin);
  const connus = new Set<string>([...vocabulaireDeReference().termes, ...construireLeDictionnaire(corpus).mots.map((entree) => entree.mot)]);
  const admis = lireLesMotsAdmis();
  const mots = motsASurveiller(slice, (mot) => connus.has(mot) || termeOuFormeConnu(mot) || admis.has(mot));
  const suivis = spawnSync('git', ['ls-files', '-z'], { cwd: RACINE_DU_DEPOT, maxBuffer: 1 << 28, encoding: 'utf8' });
  if (suivis.status !== 0) throw new Error('git ls-files a échoué.');
  const fichiers = suivis.stdout.split('\0').filter((fichier) => fichier !== '');
  const lire = (fichier: string): string | undefined => {
    try {
      const contenu = readFileSync(join(RACINE_DU_DEPOT, fichier));
      return contenu.subarray(0, 8000).includes(0) ? undefined : contenu.toString('utf8');
    } catch { return undefined; }
  };
  const touches = fichiersEnFuite(mots, fichiers, lire);
  console.log(`${mots.length} mots de Slice hors vocabulaire, hors dictionnaire et hors mots admis (${admis.size} admis), cherchés dans ${fichiers.length} fichiers suivis par Git.`);
  if (touches.length === 0) { console.log('Aucune fuite.'); return 0; }
  console.error(`Fuite possible dans ${touches.length} fichier(s) :`);
  for (const fichier of touches) console.error(`  ${fichier}`);
  return 1;
}

async function main(): Promise<void> {
  const options = lireLesOptions(process.argv.slice(2));
  if (options.verifierFuite) process.exitCode = verifierLaFuite(options.slice ?? CHEMIN_DE_SLICE_PAR_DEFAUT, lireLesSystemes());
  else if (options.slice) {
    const reste = lancerLaSlice(options, lireLesSystemes(), lireLaSlice(options.slice));
    if (options.attendreZero && reste > 0) {
      console.error(`${reste} manqué(s) ou faux positif(s) restent.`);
      process.exitCode = 1;
    }
  } else if (options.mesureDuSeuil) console.log(JSON.stringify(mesurerLeKit(lireLesSystemes(), options.graine, options.rapide)));
  else if (options.corpus || options.scenarios) {
    if (options.corpus) lancerLeCorpus(options.sortie);
    if (options.scenarios) lancerLesScenarios(options);
  } else if (options.fauxPositifs) await lancerLesFauxPositifs(options);
  else await lancerLaMesure(options);
}

main().catch((erreur) => {
  console.error(erreur instanceof Error ? erreur.message : String(erreur));
  process.exitCode = 1;
});

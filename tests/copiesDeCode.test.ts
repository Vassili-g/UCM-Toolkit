/**
 * Refuse les blocs de code recopiés d'un fichier à l'autre. Un élément a une
 * seule source : la deuxième occurrence s'importe de son propriétaire.
 *
 * Complète `reglesUniques.test.ts`, qui garde des règles nommées ; celui-ci
 * garde toutes les autres, sans les connaître. Une copie est une suite d'au
 * moins SEUIL_DE_LIGNES lignes significatives (voir `normaliser`) identiques
 * à une autre suite, dans un autre fichier ou plus loin dans le même.
 *
 * `tests/copiesDeCode.reference.json` liste les copies existantes à la date de
 * ce test. Elle ne fait que rétrécir : une copie nouvelle échoue, une copie
 * disparue échoue tant qu'on ne l'a pas retirée de la liste. Régénérer :
 *   UCM_COPIES_REGENERER=1 npx tsx --test tests/copiesDeCode.test.ts
 * La régénération refuse toute entrée nouvelle, sauf un bloc qui a rétréci.
 * Ajouter une entrée demande en plus UCM_COPIES_AJOUTER=1, option réservée au
 * mainteneur. La régénération lit seulement les fichiers que git suit.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import test from 'node:test';

const RACINE = join(__dirname, '..');
const CHEMIN_REFERENCE = join(__dirname, 'copiesDeCode.reference.json');

/** Seuil retenu après mesure sur le dépôt (6, 8 et 10 lignes) : voir le compte rendu du lot 1.14 de P22. */
const SEUIL_DE_LIGNES = 6;

const EXTENSIONS = ['.ts', '.mjs', '.cjs', '.js'];

/** Sous-dossiers lus dans chaque paquet. */
const SOUS_DOSSIERS_DE_PAQUET = ['src', 'tests', 'scripts'];

/** Dossiers jamais lus : dépendances, sorties de build, travail local. */
const DOSSIERS_EXCLUS = new Set(['node_modules', 'dist', '_local']);

/** Le hub est abandonné au profit de Storybook et sort du workspace. */
const PAQUETS_EXCLUS = new Set(['hub']);

/** Un fichier généré se recopie par construction : sa source est son générateur. */
const EN_TETE_GENERE = /g[ée]n[ée]r[ée] par|@generated/i;

/** Tables de cas et de littéraux : leurs entrées se ressemblent sans que du code soit copié. */
const FICHIERS_DE_DONNEES = new Set<string>([
  'packages/plugin-socle/tests/couvertureFigma.table.ts',
  // Table des cas de la confrontation : 3282 lignes d'appels de fabriques, une entrée par cas.
  'packages/kit/tests/banc/cas-conformes.mjs',
]);

function fichiersDuDepot(): string[] {
  const trouves: string[] = [];
  const parcourir = (dossier: string) => {
    for (const nom of readdirSync(dossier)) {
      if (DOSSIERS_EXCLUS.has(nom)) continue;
      const chemin = join(dossier, nom);
      if (statSync(chemin).isDirectory()) parcourir(chemin);
      else if (EXTENSIONS.some((extension) => nom.endsWith(extension)) && !nom.endsWith('.d.ts')) trouves.push(chemin);
    }
  };
  for (const paquet of readdirSync(join(RACINE, 'packages'))) {
    if (PAQUETS_EXCLUS.has(paquet)) continue;
    for (const sous of SOUS_DOSSIERS_DE_PAQUET) {
      const dossier = join(RACINE, 'packages', paquet, sous);
      if (existsSync(dossier)) parcourir(dossier);
    }
  }
  parcourir(join(RACINE, 'scripts'));
  return trouves.map((chemin) => relative(RACINE, chemin).split('\\').join('/')).sort();
}

function suivisParGit(): Set<string> {
  const sortie = execFileSync('git', ['ls-files'], { cwd: RACINE, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return new Set(sortie.split('\n'));
}

interface LigneSignificative {
  texte: string;
  numero: number;
}

/**
 * Ce qui reste d'un fichier une fois retirés les commentaires, les lignes vides,
 * les imports et les lignes de pure ponctuation ; les espaces sont réduits.
 */
function normaliser(source: string): LigneSignificative[] {
  const sansBlocs = source.replace(/\/\*[\s\S]*?\*\//g, (bloc) => bloc.replace(/[^\n]/g, ''));
  const retenues: LigneSignificative[] = [];
  let dansImport = false;
  sansBlocs.split('\n').forEach((brute, index) => {
    const ligne = brute.replace(/(^|\s)\/\/.*$/, '').replace(/\s+/g, ' ').trim();
    if (ligne === '') return;
    if (dansImport) {
      if (/['"];?$/.test(ligne)) dansImport = false;
      return;
    }
    if (/^import\b/.test(ligne) || /^export (\*|\{[^}]*\}) from\b/.test(ligne)) {
      if (!/['"];?$/.test(ligne)) dansImport = true;
      return;
    }
    if (/^[\s{}()[\],;:.]*$/.test(ligne)) return;
    retenues.push({ texte: ligne, numero: index + 1 });
  });
  return retenues;
}

interface EntreeDeReference {
  empreinte: string;
  fichiers: [string, string];
  lignes: number;
}

interface Copie extends EntreeDeReference {
  /** Pour le message ; absents de la référence, que les numéros de ligne casseraient. */
  emplacements: [string, string];
}

/** Trouve les blocs copiés, un par paire de fichiers et par bloc maximal. */
function trouverLesCopies(fichiers: Map<string, LigneSignificative[]>, seuil = SEUIL_DE_LIGNES): Copie[] {
  const noms = [...fichiers.keys()].sort();
  const textes = noms.map((nom) => fichiers.get(nom)!.map((ligne) => ligne.texte));
  const index = new Map<string, Array<[number, number]>>();
  textes.forEach((lignes, fichier) => {
    for (let debut = 0; debut + seuil <= lignes.length; debut++) {
      const cle = lignes.slice(debut, debut + seuil).join('\n');
      const liste = index.get(cle);
      if (liste === undefined) index.set(cle, [[fichier, debut]]);
      else liste.push([fichier, debut]);
    }
  });

  // Une copie se lit sur une diagonale (fichier a, fichier b, décalage) : les fenêtres consécutives s'y fusionnent.
  const diagonales = new Map<string, number[]>();
  for (const occurrences of index.values()) {
    for (let premier = 0; premier < occurrences.length; premier++) {
      for (let second = premier + 1; second < occurrences.length; second++) {
        let [a, debutA] = occurrences[premier];
        let [b, debutB] = occurrences[second];
        if (a > b || (a === b && debutA > debutB)) [a, debutA, b, debutB] = [b, debutB, a, debutA];
        const cle = `${a}|${b}|${debutB - debutA}`;
        const liste = diagonales.get(cle);
        if (liste === undefined) diagonales.set(cle, [debutA]);
        else liste.push(debutA);
      }
    }
  }

  const copies: Copie[] = [];
  const vues = new Set<string>();
  for (const [cle, debuts] of diagonales) {
    const [a, b, decalage] = cle.split('|').map(Number);
    debuts.sort((x, y) => x - y);
    const fermer = (debutDuBloc: number, dernierDebut: number) => {
      let lignes = dernierDebut - debutDuBloc + seuil;
      // Dans un même fichier, un bloc ne recouvre pas sa propre copie.
      if (a === b) lignes = Math.min(lignes, decalage);
      if (lignes < seuil) return;
      const nomA = noms[a];
      const nomB = noms[b];
      const bloc = textes[a].slice(debutDuBloc, debutDuBloc + lignes);
      const empreinte = createHash('sha1').update(bloc.join('\n')).digest('hex').slice(0, 12);
      const identifiant = `${empreinte}|${nomA}|${nomB}`;
      if (vues.has(identifiant)) return;
      vues.add(identifiant);
      const lignesA = fichiers.get(nomA)!;
      const lignesB = fichiers.get(nomB)!;
      const debutB = debutDuBloc + decalage;
      copies.push({
        empreinte,
        fichiers: [nomA, nomB],
        lignes,
        emplacements: [
          `${nomA} lignes ${lignesA[debutDuBloc].numero} à ${lignesA[debutDuBloc + lignes - 1].numero}`,
          `${nomB} lignes ${lignesB[debutB].numero} à ${lignesB[debutB + lignes - 1].numero}`,
        ],
      });
    };
    let debutDuBloc = debuts[0];
    let dernier = debuts[0];
    for (const debut of debuts.slice(1)) {
      if (debut === dernier + 1) {
        dernier = debut;
        continue;
      }
      fermer(debutDuBloc, dernier);
      debutDuBloc = debut;
      dernier = debut;
    }
    fermer(debutDuBloc, dernier);
  }
  return copies.sort((x, y) => x.fichiers.join('|').localeCompare(y.fichiers.join('|')) || x.empreinte.localeCompare(y.empreinte));
}

function lireLesFichiers(restreintA?: Set<string>): Map<string, LigneSignificative[]> {
  const resultat = new Map<string, LigneSignificative[]>();
  for (const chemin of fichiersDuDepot()) {
    if (FICHIERS_DE_DONNEES.has(chemin)) continue;
    if (restreintA !== undefined && !restreintA.has(chemin)) continue;
    const source = readFileSync(join(RACINE, chemin), 'utf8');
    if (EN_TETE_GENERE.test(source.split('\n').slice(0, 5).join('\n'))) continue;
    resultat.set(chemin, normaliser(source));
  }
  return resultat;
}

const identifiantDe = (copie: EntreeDeReference) => `${copie.empreinte}|${copie.fichiers.join('|')}`;
const lireReference = (): EntreeDeReference[] => JSON.parse(readFileSync(CHEMIN_REFERENCE, 'utf8'));
const enEntree = ({ empreinte, fichiers, lignes }: Copie): EntreeDeReference => ({ empreinte, fichiers, lignes });

/** Une copie nouvelle qui rétrécit une copie disparue des mêmes fichiers n'ajoute rien à la liste. */
function estReduction(copie: Copie, disparues: EntreeDeReference[]): boolean {
  return disparues.some((entree) => entree.fichiers.join('|') === copie.fichiers.join('|') && entree.lignes >= copie.lignes);
}

function comparer(copies: Copie[], reference: EntreeDeReference[]) {
  const connues = new Set(reference.map(identifiantDe));
  const presentes = new Set(copies.map(identifiantDe));
  return {
    nouvelles: copies.filter((copie) => !connues.has(identifiantDe(copie))),
    disparues: reference.filter((entree) => !presentes.has(identifiantDe(entree))),
  };
}

const decrire = (copie: Copie) => `  ${copie.emplacements[0]}\n  = ${copie.emplacements[1]} (${copie.lignes} lignes significatives)`;
const REGLE = 'Importer la fonction de son propriétaire au lieu de la recopier ; voir CONTRIBUTING.md.';

if (process.env.UCM_COPIES_REGENERER === '1') {
  test('régénère la liste de référence des copies de code', () => {
    const copies = trouverLesCopies(lireLesFichiers(suivisParGit()));
    const { nouvelles, disparues } = comparer(copies, lireReference());
    const ajouts = nouvelles.filter((copie) => !estReduction(copie, disparues));
    if (ajouts.length > 0 && process.env.UCM_COPIES_AJOUTER !== '1') {
      assert.fail(
        `La régénération refuse d'ajouter ${ajouts.length} copie(s) nouvelle(s) :\n${ajouts.map(decrire).join('\n')}\n${REGLE} ` +
          'UCM_COPIES_AJOUTER=1 est réservé au mainteneur.',
      );
    }
    writeFileSync(CHEMIN_REFERENCE, `${JSON.stringify(copies.map(enEntree), null, 2)}\n`);
  });
} else {
  test('aucune copie de code nouvelle, et la liste de référence ne garde que des copies présentes', () => {
    const copies = trouverLesCopies(lireLesFichiers());
    const { nouvelles, disparues } = comparer(copies, lireReference());
    const messages: string[] = [];
    const ajouts = nouvelles.filter((copie) => !estReduction(copie, disparues));
    if (ajouts.length > 0) messages.push(`Copie de code nouvelle (${ajouts.length}) :\n${ajouts.map(decrire).join('\n')}\n${REGLE}`);
    if (disparues.length > 0) {
      messages.push(
        `${disparues.length} copie(s) de la liste a (ont) disparu ou rétréci ; la retirer de tests/copiesDeCode.reference.json ` +
          `(UCM_COPIES_REGENERER=1 npx tsx --test tests/copiesDeCode.test.ts) :\n${disparues
            .map((entree) => `  ${entree.fichiers.join(' = ')} (${entree.lignes} lignes)`)
            .join('\n')}`,
      );
    }
    assert.equal(messages.length, 0, messages.join('\n\n'));
  });
}

test('normaliser retire commentaires, imports et ponctuation, et garde les numéros de ligne', () => {
  const source = ['import { a,', '  b } from "x";', '/** doc', ' * suite */', 'const  x = 1; // note', '', '}', 'return x;'].join('\n');
  assert.deepEqual(normaliser(source), [
    { texte: 'const x = 1;', numero: 5 },
    { texte: 'return x;', numero: 8 },
  ]);
});

test('trouverLesCopies fusionne les fenêtres qui se chevauchent en un bloc par copie', () => {
  const bloc = Array.from({ length: 9 }, (_, i) => `ligne ${i};`);
  const fichiers = new Map([
    ['a.ts', bloc.map((texte, i) => ({ texte, numero: i + 1 }))],
    ['b.ts', [{ texte: 'autre', numero: 1 }, ...bloc.map((texte, i) => ({ texte, numero: i + 2 }))]],
  ]);
  const copies = trouverLesCopies(fichiers, 6);
  assert.equal(copies.length, 1);
  assert.equal(copies[0].lignes, 9);
  assert.deepEqual(copies[0].emplacements, ['a.ts lignes 1 à 9', 'b.ts lignes 2 à 10']);
});

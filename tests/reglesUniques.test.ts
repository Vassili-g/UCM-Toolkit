/**
 * Une règle que le code confie à une fonction unique n'a pas de seconde écriture.
 * `REGLES` liste, par fiche d'audit, le motif qui trahit une copie de la règle,
 * les fichiers où le motif est admis (les propriétaires) et les exceptions
 * justifiées. Un lot qui rend une règle unique ajoute sa ligne ici.
 *
 * Le motif se cherche sur le texte entier du fichier, sans ses commentaires, pour
 * qu'il puisse couvrir plusieurs lignes. Hors du contrôle : `dist/`,
 * `node_modules/` et `_local/`.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const racine = path.resolve(__dirname, '..');

export type Regle = {
  fiche: string;
  raison: string;
  motif: RegExp;
  /** Globs relatifs à la racine ; `*` reste dans un segment, `**` en traverse. */
  dossiers?: string[];
  proprietaires: string[];
  exceptions: { fichier: string; raison: string }[];
};

export type Copie = { fichier: string; ligne: number; extrait: string };

const DOSSIERS_PAR_DEFAUT = ['packages/*/src/**'];

export const REGLES: Regle[] = [
  {
    fiche: 'D-02',
    raison: "Les variables du thème se trouvent, se trient et se reconnaissent par les fonctions de `referentiel/theme.ts` et de `emplois/dossiers.ts`.",
    motif: /\bVARIABLES_DU_THEME\b[^;]*?\.(?:find|sort|endsWith)\(/,
    proprietaires: ['packages/kit/src/referentiel/theme.ts', 'packages/kit/src/emplois/dossiers.ts'],
    exceptions: [],
  },
  {
    fiche: 'D-02',
    raison: "Le dossier d'une variable du thème se lit par `emplois/dossiers.ts`, pas par un `endsWith` sur le chemin.",
    motif: /endsWith\(`\/\$\{/,
    dossiers: ['packages/kit/src/controles/**'],
    proprietaires: [],
    exceptions: [],
  },
  {
    fiche: 'D-02',
    raison: "Un nom du thème se reconnaît par `variableDuThemeReconnue` ; `cleDuTheme` n'existe plus.",
    motif: /\bcleDuTheme\b/,
    proprietaires: [],
    exceptions: [],
  },
  {
    fiche: 'D-17',
    raison: "La forme de chemin d'un nom vient de `formeDuChemin`, pas d'un `.map(formeReconnue).join('/')`.",
    motif: /\.map\(\s*formeReconnue\s*\)\s*\.join\(\s*(['"])\/\1\s*\)/,
    proprietaires: ['packages/kit/src/referentiel/reconnaissance.ts'],
    exceptions: [],
  },
  {
    fiche: 'D-23',
    raison: "Le mode d'une collection se compare par la forme reconnue (`modeDuThemeReconnu`, `formeReconnue`), pas par `trim().toLowerCase()` sur son nom.",
    motif: /\bmode\.(?:name|nom)\.trim\(\)\.toLowerCase\(\)/,
    proprietaires: [],
    exceptions: [
      { fichier: 'packages/plugin-palettes/src/ecriture/variables.ts', raison: 'levée par U7' },
      { fichier: 'packages/plugin-palettes/src/variables/lot.ts', raison: 'levée par U7' },
      { fichier: 'packages/plugin-palettes/src/variables/detection.ts', raison: 'levée par U7' },
    ],
  },
];

/** Remplace les commentaires par des blancs, sans toucher aux chaînes ni aux numéros de ligne. */
function sansCommentaires(source: string): string {
  let sortie = '';
  let i = 0;
  while (i < source.length) {
    const c = source[i];
    const suite = source[i + 1];
    if (c === '/' && suite === '/') {
      while (i < source.length && source[i] !== '\n') { sortie += ' '; i++; }
    } else if (c === '/' && suite === '*') {
      const fin = source.indexOf('*/', i + 2);
      const bloc = source.slice(i, fin === -1 ? source.length : fin + 2);
      sortie += bloc.replace(/[^\n]/g, ' ');
      i += bloc.length;
    } else if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      while (j < source.length && source[j] !== c) { if (source[j] === '\\') j++; j++; }
      sortie += source.slice(i, j + 1);
      i = j + 1;
    } else {
      sortie += c;
      i++;
    }
  }
  return sortie;
}

/**
 * Les occurrences du motif de `regle` dans `texte`, le fichier étant `fichier`
 * (chemin relatif à la racine). Un fichier propriétaire ou en exception n'en rend aucune.
 */
export function chercherLesCopies(texte: string, regle: Regle, fichier: string): Copie[] {
  if (regle.proprietaires.includes(fichier) || regle.exceptions.some((e) => e.fichier === fichier)) return [];
  const source = sansCommentaires(texte);
  const motif = new RegExp(regle.motif.source, regle.motif.flags.includes('g') ? regle.motif.flags : `${regle.motif.flags}g`);
  return [...source.matchAll(motif)].map((m) => ({
    fichier,
    ligne: source.slice(0, m.index).split('\n').length,
    extrait: m[0].replace(/\s+/g, ' ').slice(0, 90),
  }));
}

function globVersRegExp(glob: string): RegExp {
  const corps = glob
    .split('**')
    .map((morceau) => morceau.split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*'))
    .join('.*');
  return new RegExp(`^${corps}$`);
}

function fichiersDeSource(dossier: string): string[] {
  const trouves: string[] = [];
  for (const entree of fs.readdirSync(dossier, { withFileTypes: true })) {
    if (['node_modules', 'dist', '_local'].includes(entree.name)) continue;
    const complet = path.join(dossier, entree.name);
    if (entree.isDirectory()) trouves.push(...fichiersDeSource(complet));
    else if (/\.(ts|mjs|js)$/.test(entree.name)) trouves.push(complet);
  }
  return trouves;
}

function fichiersBalayes(): string[] {
  const relatifs: string[] = [];
  for (const paquet of fs.readdirSync(path.join(racine, 'packages'))) {
    const src = path.join(racine, 'packages', paquet, 'src');
    if (!fs.existsSync(src)) continue;
    for (const fichier of fichiersDeSource(src)) relatifs.push(path.relative(racine, fichier).split(path.sep).join('/'));
  }
  return relatifs;
}

function copiesDeLArbre(fichiers: string[]): { regle: Regle; copie: Copie }[] {
  const trouvees: { regle: Regle; copie: Copie }[] = [];
  for (const regle of REGLES) {
    const globs = (regle.dossiers ?? DOSSIERS_PAR_DEFAUT).map(globVersRegExp);
    for (const fichier of fichiers) {
      if (!globs.some((g) => g.test(fichier))) continue;
      const texte = fs.readFileSync(path.join(racine, fichier), 'utf8');
      for (const copie of chercherLesCopies(texte, regle, fichier)) trouvees.push({ regle, copie });
    }
  }
  return trouvees;
}

test('aucune règle à fonction unique n\'est recopiée', () => {
  const fichiers = fichiersBalayes();
  assert.ok(fichiers.length > 50, `seuls ${fichiers.length} fichiers lus sous packages/*/src`);
  assert.deepEqual(
    copiesDeLArbre(fichiers).map(({ regle, copie }) => `${copie.fichier}:${copie.ligne} ${copie.extrait} : ${regle.fiche}, ${regle.raison}`),
    [],
    "Ces lignes recopient une règle qu'une fonction unique possède. Appeler la fonction ; "
      + "si la copie est légitime, l'ajouter aux exceptions de la règle avec sa raison.",
  );
});

test('chaque propriétaire et chaque exception désigne un fichier qui existe', () => {
  const fichiers = new Set(fichiersBalayes());
  const absents = REGLES.flatMap((r) =>
    [...r.proprietaires, ...r.exceptions.map((e) => e.fichier)].filter((f) => !fichiers.has(f)).map((f) => `${r.fiche} : ${f}`),
  );
  assert.deepEqual(absents, [], 'Ces fichiers n\'existent plus. Retirer ou corriger la ligne de REGLES.');
  for (const r of REGLES) for (const e of r.exceptions) assert.ok(e.raison.length > 10, `l'exception ${e.fichier} n'a pas de raison`);
});

test('chercherLesCopies voit le motif, y compris sur plusieurs lignes, et épargne les propriétaires', () => {
  const regle: Regle = {
    fiche: 'T-00',
    raison: 'exemple',
    motif: /\bTABLE\b[^;]*?\.find\(/,
    proprietaires: ['a/proprio.ts'],
    exceptions: [{ fichier: 'a/exception.ts', raison: 'une exception de test' }],
  };
  const texte = ['const x = 1;', 'const y = TABLE', '  .filter(Boolean)', '  .find((v) => v);', '// TABLE.find(z)'].join('\n');

  const copies = chercherLesCopies(texte, regle, 'a/autre.ts');
  assert.equal(copies.length, 1);
  assert.equal(copies[0].ligne, 2);
  assert.equal(copies[0].fichier, 'a/autre.ts');
  assert.deepEqual(chercherLesCopies(texte, regle, 'a/proprio.ts'), []);
  assert.deepEqual(chercherLesCopies(texte, regle, 'a/exception.ts'), []);
  assert.deepEqual(chercherLesCopies('// TABLE.find(z)', regle, 'a/autre.ts'), []);
});

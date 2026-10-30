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

/** Le socle porte le contrat des plugins : il reste hors des lois sur les champs de texte. */
const DOSSIERS_HORS_SOCLE = ['kit', 'cli', 'adapter-typescript', 'couleur', 'hub', 'plugin-exporter', 'plugin-palettes', 'plugin-architect'].map((paquet) => `packages/${paquet}/src/**`);

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
  {
    fiche: 'D-01',
    raison: "Le registre d'un axe se choisit par `registreDeLAxe`, pas par une chaîne de `axe === 'etat' ? REGISTRE_…` écrite en ligne.",
    motif: /\baxe === 'etat' \? REGISTRE_/,
    proprietaires: ['packages/kit/src/controles/nommage.ts'],
    exceptions: [],
  },
  {
    fiche: 'D-01',
    raison: "Une valeur de taille ne se compare pas par un `termeReconnu(REGISTRE_TAILLES, …)` écrit en ligne : `memeValeurDAxe('taille', …)`.",
    motif: /\btermeReconnu\(\s*REGISTRE_TAILLES\b/,
    proprietaires: ['packages/kit/src/controles/nommage.ts'],
    exceptions: [
      { fichier: 'packages/kit/src/controles/preparation.ts', raison: 'écrit un nom, ne compare pas une valeur d\'axe' },
    ],
  },
  {
    fiche: 'D-01',
    raison: "Une valeur d'état se lit par `etatReconnu` et se compare par `memeValeurDAxe('etat', …)`, pas par un `termeReconnu(REGISTRE_ETATS, …)` écrit en ligne.",
    motif: /\btermeReconnu\(\s*REGISTRE_ETATS\b/,
    proprietaires: ['packages/kit/src/controles/nommage.ts'],
    exceptions: [
      { fichier: 'packages/kit/src/controles/preparation.ts', raison: 'écrit un nom, ne compare pas une valeur d\'axe' },
      { fichier: 'packages/kit/src/format/names.ts', raison: "`estUneValeurDesactivee` lit le registre à la source : `format/` ne peut pas importer `controles/nommage.ts`, où vit `etatReconnu`" },
    ],
  },
  {
    fiche: 'D-03',
    raison: "L'axe d'états se reconnaît par `estLAxeDEtats`, pas par `STATE_AXIS_NAMES` parcouru à la main.",
    motif: /\bSTATE_AXIS_NAMES\s*\.\s*(?:includes|some|every|find|indexOf)\(/,
    proprietaires: ['packages/kit/src/referentiel/vocabulaire.ts'],
    exceptions: [],
  },
  {
    fiche: 'D-03',
    raison: "Un nom de propriété ne se compare pas au littéral `'state'` : `estLAxeDEtats` reconnaît aussi `States`, `Status`, `État` et `Etat`.",
    motif: /[!=]==\s*(['"])state\1/,
    proprietaires: ['packages/kit/src/referentiel/vocabulaire.ts'],
    exceptions: [],
  },
  {
    fiche: 'D-03',
    raison: "Une expression régulière ne cite pas `state`, `etat` ou `état` comme nom d'axe : `estLAxeDEtats`.",
    motif: /\/\^\(?(?:state|states|status|etat|état)\b[^/\n]*\$\//i,
    proprietaires: ['packages/kit/src/referentiel/vocabulaire.ts'],
    exceptions: [],
  },
  {
    fiche: 'D-04',
    raison: "Les contrôles lisent un état par `etatReconnu`, pas par `ETATS` de `emplois/dossiers.ts`, qui nomme les dossiers du thème.",
    motif: /\bimport\s*\{[^}]*\bETATS\b[^}]*\}\s*from\s*(['"])[^'"]*emplois\/dossiers\.js\1/,
    dossiers: ['packages/kit/src/controles/**'],
    proprietaires: ['packages/kit/src/controles/preparation.ts'],
    exceptions: [],
  },
  {
    fiche: 'D-04',
    raison: "Un état se compare par `etatReconnu(…) === '<état>'`, pas par `formeReconnue(…)` contre un littéral d'état : `Hovered` et `Press` seraient manqués.",
    motif: /\bformeReconnue\((?:[^()]|\([^()]*\))*\)\s*[!=]==\s*(['"])(?:default|hover|pressed|focus|disabled)\1/,
    dossiers: ['packages/kit/src/controles/**'],
    proprietaires: [],
    exceptions: [],
  },
  {
    fiche: 'D-18',
    raison: "La famille `color` se reconnaît par `estLaFamilleCouleur`, pas par `formeReconnue(…) === 'color'` : `Colors` et `colour` seraient manqués.",
    motif: /\bformeReconnue\((?:[^()]|\([^()]*\))*\)\s*[!=]==\s*(['"])color\1/,
    dossiers: ['packages/kit/src/controles/**'],
    proprietaires: ['packages/kit/src/controles/nommage.ts'],
    exceptions: [],
  },
  {
    fiche: 'D-19',
    raison: "Un token appartient au composant par `estDuComposant`, pas par la forme de son premier segment comparée à celle du jeu.",
    motif: /\bformeReconnue\(\s*[\w.]+\.nom\.split\(\s*(['"])\/\1\s*\)\s*\[0\]\s*\)/,
    proprietaires: ['packages/kit/src/controles/nommage.ts'],
    exceptions: [],
  },
  {
    fiche: 'D-20',
    raison: "Une peinture se voit par `peintureVisible` (visible et d'opacité non nulle), pas par un `.visible !== false && …opacity` écrit en ligne.",
    motif: /\.visible !== false\s*&&\s*\(?\s*[\w.]*opaci/,
    proprietaires: ['packages/kit/src/controles/releve.ts'],
    exceptions: [
      { fichier: 'packages/plugin-palettes/src/lecture.ts', raison: 'juge une peinture opaque, autre question' },
    ],
  },
  {
    fiche: 'D-24',
    raison: "Une composante de Figma devient un octet par `versOctet`, `versRgb8` ou `hexaDeFigma` de `emplois/couleur.ts`, pas par un `Math.round(… * 255)` : 1,002 écrirait `100`.",
    motif: /Math\.round\([^;]*?\*\s*255\)/,
    proprietaires: ['packages/kit/src/emplois/couleur.ts', 'packages/couleur/src/conversions.ts'],
    exceptions: [
      { fichier: 'packages/plugin-architect/src/contraste.ts', raison: 'composantes contrôlées avant, sans hexa' },
      { fichier: 'packages/plugin-architect/src/ui/valeurs.ts', raison: 'composantes contrôlées avant, sans hexa' },
      { fichier: 'packages/plugin-architect/src/modele.ts', raison: "le noyau d'Architect n'importe pas le kit (loiDEcriture.test.ts) ; il borne avant d'arrondir et signale l'arrondi" },
      { fichier: 'packages/plugin-palettes/src/ui/couleur/formats.ts', raison: 'conversion HSV vers 8 bits d\'une saisie, sans composante de Figma ni hexa' },
    ],
  },
  {
    fiche: 'D-08',
    raison: "Un contraste se tronque et s'écrit par `contrasteTronque` et `ecrireContraste` de `emplois/contraste.ts`, pas par un `aDixDecimales(…).split('.')` ou `.replace(` écrit en ligne.",
    motif: /\baDixDecimales\((?:[^()]|\([^()]*\))*\)\s*\.(?:split|replace)\(/,
    proprietaires: ['packages/kit/src/emplois/contraste.ts'],
    exceptions: [],
  },
  {
    fiche: 'D-08',
    raison: "Un contraste ne se tronque pas par `Math.floor(… * 100) / 100` : 4,35 donnerait 4,34. `contrasteTronque` lit l'écriture à dix décimales.",
    motif: /Math\.floor\([^;]*?\*\s*100\)\s*\/\s*100/,
    proprietaires: ['packages/kit/src/emplois/contraste.ts'],
    exceptions: [],
  },
  {
    fiche: 'D-08',
    raison: "Un rapport de contraste s'écrit par `ecrireContraste`, pas par un `${String(x).replace('.', ',')}:1` écrit en ligne.",
    motif: /\$\{String\(\w+\)\.replace\(\s*(['"])\.\1\s*,\s*(['"]),\2\s*\)\}:1/,
    proprietaires: ['packages/kit/src/emplois/contraste.ts'],
    exceptions: [
      { fichier: 'packages/plugin-architect/src/ui/ignores/modele.ts', raison: 'levée par I7, fichier en cours dans le plan Règles manquantes' },
      { fichier: 'packages/kit/src/lecteurs/diagnostic-contrastes.mjs', raison: 'écrit un seuil sans décimale inutile (4,5 et 3), pas un contraste tronqué' },
    ],
  },
  {
    fiche: 'D-07',
    raison: "Un champ de texte se reconnaît par `natureDuChamp` du référentiel, pas par une expression régulière sur `font` et `text`.",
    motif: /\/(?=[^/\n]*font)(?=[^/\n]*text)[^/\n]+\/[a-z]*/i,
    dossiers: DOSSIERS_HORS_SOCLE,
    proprietaires: [],
    exceptions: [],
  },
  {
    fiche: 'D-07',
    raison: "Les champs liables d'un texte se listent une fois, dans `CHAMPS_DE_TYPOGRAPHIE` du référentiel, pas dans une liste littérale qui contient `'letterSpacing'`.",
    motif: /\[[^\]]*'letterSpacing'[^\]]*\]/,
    dossiers: DOSSIERS_HORS_SOCLE,
    proprietaires: ['packages/kit/src/referentiel/architecture.ts'],
    exceptions: [
      { fichier: 'packages/plugin-architect/src/sandbox/capture.ts', raison: 'inventorie les propriétés Figma lues par la capture, dont les champs de texte, sans décider de leur nature' },
      { fichier: 'packages/plugin-architect/src/composant.ts', raison: 'le noyau n’importe pas le kit ; consommateurs.test.ts compare sa liste à celle du référentiel' },
    ],
  },
  {
    fiche: 'D-29',
    raison: "Une clé `com.ucm.…` de `tokens.json` s'écrit par la constante de `format/tokens.ts` (`EXTENSION_…_TOKENS`), pas par un littéral.",
    motif: /['"]com\.ucm\./,
    proprietaires: ['packages/kit/src/format/tokens.ts'],
    exceptions: [],
  },
  {
    fiche: 'D-13',
    raison: "Un nom Figma devient un identifiant de code par `codeIdentifier` de `format/names.ts`, pas par une fonction `pascal` ni par un `toUpperCase()` après `[^a-zA-Z0-9]`.",
    motif: /\bfunction\s+pascal\b|\[\^a-zA-Z0-9\][^;]*?toUpperCase\(\)/,
    dossiers: ['packages/adapter-typescript/src/**', 'packages/cli/src/**'],
    proprietaires: [],
    exceptions: [],
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

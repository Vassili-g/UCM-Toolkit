/**
 * Une donnée du référentiel UCM n'a qu'une écriture : `packages/kit/src/referentiel/`
 * et `packages/kit/src/emplois/`. Une liste littérale ailleurs (crans, modes,
 * profils, états, collections, tags des règles d'usage) en est une copie, qui
 * dérive en silence le jour où le référentiel change.
 *
 * Le contrôle lit les sources `.ts`, `.mjs` et `.js` de `packages/*\/src`, sans
 * leurs commentaires, et refuse tout tableau (un `Set` en contient un) qui
 * recopie l'une de ces données. Une liste légitime, propre à un écran, entre
 * dans `EXCEPTIONS` avec sa raison.
 *
 * Hors du contrôle : `tests/` et les `tests/` des paquets, qui écrivent leurs
 * attendus en clair à dessein. Les catalogues `i18n` sont lus comme le reste.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { NUMEROS_DE_PALETTE } from '../packages/kit/src/referentiel/vocabulaire';

const racine = path.resolve(__dirname, '..');

const CRANS = new Set<number>(NUMEROS_DE_PALETTE);
const ETATS = ['default', 'hover', 'pressed', 'press', 'disabled', 'disable', 'focus'];

/** Les noms de `COLLECTIONS` et les tags de `TAGS_DES_REGLES`, lus dans le référentiel. */
function lireListe(fichier: string, nom: string): string[] {
  const source = fs.readFileSync(path.join(racine, 'packages/kit/src/referentiel', fichier), 'utf8');
  const trouve = source.match(new RegExp(`export const ${nom} = \\[([^\\]]+)\\]`));
  assert.ok(trouve, `${nom} n'est plus déclaré dans ${fichier}`);
  return [...trouve[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
}
const COLLECTIONS = lireListe('architecture.ts', 'COLLECTIONS');
const TAGS = lireListe('regles.ts', 'TAGS_DES_REGLES');

type Regle = { nom: string; import: string; reconnait: (mots: string[], nombres: number[]) => boolean };

const REGLES: Regle[] = [
  {
    nom: 'crans',
    import: "`CRANS` de '@ucm-kit/core/referentiel'",
    reconnait: (mots, nombres) => mots.length === 0 && nombres.length >= 3 && nombres.every((n) => CRANS.has(n)),
  },
  { nom: 'modes', import: "`MODES` de '@ucm-kit/core/referentiel'", reconnait: (m) => m.includes('light') && m.includes('dark') },
  { nom: 'profils', import: "`PROFILS` de '@ucm-kit/core/referentiel'", reconnait: (m) => m.includes('soft') && m.includes('vivid') },
  {
    nom: 'états',
    import: "`ETATS` de '@ucm-kit/core/referentiel' (ou le registre `REGISTRE_ETATS`)",
    reconnait: (m) => new Set(m.filter((mot) => ETATS.includes(mot))).size >= 2,
  },
  {
    nom: 'collections',
    import: "`COLLECTIONS` de '@ucm-kit/core/referentiel'",
    reconnait: (m) => new Set(m.filter((mot) => COLLECTIONS.includes(mot))).size >= 2,
  },
  {
    nom: "tags des règles d'usage",
    import: "`TAGS_DES_REGLES` de '@ucm-kit/core/referentiel'",
    reconnait: (m) => new Set(m.filter((mot) => TAGS.includes(mot))).size >= 3,
  },
];

/**
 * Les listes légitimes : le fichier, un extrait de la ligne et la raison.
 * Un extrait qui ne correspond plus à aucune liste trouvée fait échouer le test.
 */
const EXCEPTIONS: { fichier: string; extrait: string; raison: string }[] = [
  {
    fichier: 'packages/couleur/src/nuances.ts',
    extrait: '[500, 600, 700, 800]',
    raison: "Les crans où le texte des boutons remplace la courbe : un sous-ensemble propre au moteur, que la table du référentiel ne nomme pas.",
  },
  {
    fichier: 'packages/couleur/src/recette.ts',
    extrait: "['p0', 'light', 'dark']",
    raison: "Les clés permises d'une enveloppe de la recette, mêlées à `p0` : un contrat de lecture du fichier, pas la liste des modes.",
  },
  {
    fichier: 'packages/couleur/src/recette.ts',
    extrait: "['lien', 'soft', 'vivid']",
    raison: "Les clés permises du bloc `derive` d'une palette, où `lien` côtoie les deux profils.",
  },
  {
    fichier: 'packages/couleur/src/recette.ts',
    extrait: "['soft', 'vivid', 'origine']",
    raison: "Les clés permises du bloc `parts`, où `origine` côtoie les deux profils.",
  },
  {
    fichier: 'packages/couleur/src/recette.ts',
    extrait: "['note', 'usages', 'grilles', 'light', 'dark']",
    raison: "Les clés permises du contenu d'une recette : un contrat de lecture du fichier, pas la liste des modes.",
  },
  {
    fichier: 'packages/couleur/src/recette.ts',
    extrait: '[400, 500, 950]',
    raison: "Les crans que le format 11 ajoute à une recette du format 10 : une migration figée dans l'histoire du format, qui ne suit pas le référentiel.",
  },
  {
    fichier: 'packages/plugin-palettes/src/i18n/en.ts',
    extrait: "['default', 'hover', 'pressed', 'focus']",
    raison: "Les colonnes d'états de l'Interface de test, dans l'ordre de l'écran, focus compris.",
  },
  {
    fichier: 'packages/plugin-palettes/src/i18n/fr.ts',
    extrait: "['default', 'hover', 'pressed', 'focus']",
    raison: "Les colonnes d'états de l'Interface de test, dans l'ordre de l'écran, focus compris.",
  },
  {
    fichier: 'packages/plugin-palettes/src/ui/configuration.ts',
    extrait: "['dark', 'light']",
    raison: "Une clé de comparaison de l'effet : `dark` d'abord, l'ordre n'est pas celui des modes et ne doit pas le suivre.",
  },
  {
    fichier: 'packages/plugin-palettes/src/ui/interfaceDeTest.ts',
    extrait: "['default', 'hover', 'pressed', 'focus']",
    raison: "Les états que l'Interface de test montre, focus compris : un choix de l'écran, pas la liste des états du thème.",
  },
  {
    fichier: 'packages/plugin-palettes/src/i18n/en.ts',
    extrait: '{ page: "on the page", carte: "on the card", default:',
    raison: "Les textes d'un écran de Palettes, indexés par état et par fond : une table d'affichage, pas la liste des états.",
  },
  {
    fichier: 'packages/plugin-palettes/src/i18n/en.ts',
    extrait: "'page' | 'carte' | 'default' | 'hover' | 'pressed'",
    raison: "Le type du fond d'un écran de Palettes, qui mêle deux fonds et trois états : un choix de l'écran, pas la liste des états.",
  },
  {
    fichier: 'packages/plugin-palettes/src/i18n/fr.ts',
    extrait: "'page' | 'carte' | 'default' | 'hover' | 'pressed'",
    raison: "Le type du fond d'un écran de Palettes, qui mêle deux fonds et trois états : un choix de l'écran, pas la liste des états.",
  },
  {
    fichier: 'packages/plugin-palettes/src/i18n/fr.ts',
    extrait: "{ page: 'sur la page', carte: 'sur la carte', default:",
    raison: "Les textes d'un écran de Palettes, indexés par état et par fond : une table d'affichage, pas la liste des états.",
  },
  {
    fichier: 'packages/plugin-palettes/src/ui/apercuCompact.ts',
    extrait: "{ default: TEXTES_DE_L_APERCU.noms.repos",
    raison: "Le nom de trois états sur leur bouton dans l'aperçu : un choix de l'écran, pas la liste des états du thème.",
  },
  {
    fichier: 'packages/plugin-palettes/src/ui/garanties.ts',
    extrait: "{ default: '', hover: '4 3', pressed:",
    raison: "Le motif de trait de chaque état dans l'écran des garanties : une table d'affichage, pas la liste des états.",
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

function fichiersDeSource(dossier: string): string[] {
  const trouves: string[] = [];
  for (const entree of fs.readdirSync(dossier, { withFileTypes: true })) {
    if (['node_modules', 'dist'].includes(entree.name)) continue;
    const complet = path.join(dossier, entree.name);
    if (entree.isDirectory()) trouves.push(...fichiersDeSource(complet));
    else if (/\.(ts|mjs|js)$/.test(entree.name)) trouves.push(complet);
  }
  return trouves;
}

function fichiersControles(): string[] {
  const relatifs: string[] = [];
  for (const paquet of fs.readdirSync(path.join(racine, 'packages'))) {
    const src = path.join(racine, 'packages', paquet, 'src');
    if (!fs.existsSync(src)) continue;
    for (const fichier of fichiersDeSource(src)) {
      const rel = path.relative(racine, fichier).split(path.sep).join('/');
      if (rel.startsWith('packages/kit/src/referentiel/') || rel.startsWith('packages/kit/src/emplois/')) continue;
      relatifs.push(rel);
    }
  }
  return relatifs;
}

type Trouvaille = { fichier: string; ligne: number; texte: string; regle: Regle };

function recopiesDe(fichier: string): Trouvaille[] {
  return recopiesDuTexte(fichier, fs.readFileSync(path.join(racine, fichier), 'utf8'));
}

function recopiesDuTexte(fichier: string, texte: string): Trouvaille[] {
  const source = sansCommentaires(texte);
  const trouvees: Trouvaille[] = [];
  for (const m of source.matchAll(/\[([^[\]]*)\]/g)) {
    const contenu = m[1];
    const mots = [...contenu.matchAll(/'([^'\n]*)'|"([^"\n]*)"|`([^`\n$]*)`/g)].map((t) => t[1] ?? t[2] ?? t[3]);
    const nombres = [...contenu.matchAll(/(?<![\w.'"])(\d+)(?![\w.'"])/g)].map((t) => Number(t[1]));
    const reste = contenu.replace(/'[^'\n]*'|"[^"\n]*"|`[^`\n$]*`|\d+|[\s,]/g, '');
    // Un crochet d'indexation ou de type contient autre chose que des littéraux.
    if (reste !== '' && !/^\.\.\.$/.test(reste)) continue;
    for (const regle of REGLES) {
      if (!regle.reconnait(mots, nombres)) continue;
      const ligne = source.slice(0, m.index).split('\n').length;
      trouvees.push({ fichier, ligne, texte: m[0].replace(/\s+/g, ' ').slice(0, 90), regle });
    }
  }
  const signaler = (index: number, texte: string, mots: string[], nombres: number[], familles: Regle[] = REGLES) => {
    for (const regle of familles) {
      if (!regle.reconnait(mots, nombres)) continue;
      trouvees.push({ fichier, ligne: source.slice(0, index).split('\n').length, texte: texte.replace(/\s+/g, ' ').slice(0, 90), regle });
    }
  };
  // Une union de littéraux recopie la famille même quand elle ne sert qu'à typer une valeur.
  const litteral = String.raw`(?:'[^'\n]*'|"[^"\n]*"|` + '`[^`\\n$]*`' + String.raw`|\d+)`;
  for (const m of source.matchAll(new RegExp(`${litteral}(?:\\s*\\|\\s*${litteral})+`, 'g'))) {
    const mots = [...m[0].matchAll(/'([^'\n]*)'|"([^"\n]*)"|`([^`\n$]*)`/g)].map((t) => t[1] ?? t[2] ?? t[3]);
    const nombres = [...m[0].matchAll(/(?<![\w.'"])(\d+)(?![\w.'"])/g)].map((t) => Number(t[1]));
    signaler(m.index ?? 0, m[0], mots, nombres);
  }
  // Pour les modes et profils, seules les déclarations de type se contrôlent ici. Les objets de valeurs suivent leur type au compilateur.
  for (const m of source.matchAll(/\{([^{}]*)\}/g)) {
    const cles = [...m[1].matchAll(/(?:^|[,{;\s])(?:'([^'\n]+)'|"([^"\n]+)"|([\w-]+))\s*:/g)].map((t) => t[1] ?? t[2] ?? t[3]);
    if (cles.length < 2) continue;
    const declarationDeType = /\breadonly\b|;/u.test(m[1]);
    signaler(m.index ?? 0, m[0], cles, cles.filter((c) => /^\d+$/.test(c)).map(Number),
      REGLES.filter((r) => declarationDeType || !['modes', 'profils'].includes(r.nom)));
  }
  return trouvees;
}

test('aucune liste littérale ne recopie une donnée du référentiel', () => {
  const fichiers = fichiersControles();
  assert.ok(fichiers.length > 50, `seuls ${fichiers.length} fichiers lus sous packages/*/src`);

  const toutes = fichiers.flatMap(recopiesDe);
  const refusees = toutes.filter((t) => !EXCEPTIONS.some((e) => e.fichier === t.fichier && t.texte.includes(e.extrait)));

  assert.deepEqual(
    refusees.map((t) => `${t.fichier}:${t.ligne} ${t.texte} : ${t.regle.nom}, importer ${t.regle.import}`),
    [],
    "Ces listes recopient une donnée du référentiel. L'importer au lieu de la réécrire ; "
      + "si la liste est propre à un écran, l'ajouter à EXCEPTIONS avec sa raison.",
  );
});

test('chaque exception correspond encore à une liste du code', () => {
  const toutes = fichiersControles().flatMap(recopiesDe);
  const perimees = EXCEPTIONS.filter((e) => !toutes.some((t) => t.fichier === e.fichier && t.texte.includes(e.extrait)));
  assert.deepEqual(
    perimees.map((e) => `${e.fichier} : ${e.extrait}`),
    [],
    "Ces exceptions ne désignent plus aucune liste. Retirer l'entrée d'EXCEPTIONS.",
  );
  for (const e of EXCEPTIONS) assert.ok(e.raison.length > 10, `l'exception ${e.fichier} n'a pas de raison`);
});

test('le contrôle voit une copie des crans, des modes, des profils, des états, des collections et des tags', () => {
  const exemple = [
    'const a = [100, 200, 300];',
    "const b = ['light', 'dark'];",
    "const c = new Set(['soft', 'vivid']);",
    "const d = ['hover', 'pressed'];",
    "const e = ['theme', 'primitives'];",
    "const f = ['usage', 'do', 'dont'];",
    "// const g = ['light', 'dark'];",
    'const h = [100, 200];',
    'const i = tableau[100];',
    "type J = 'hover' | 'pressed';",
    'const k = { hover: 1, pressed: 2 };',
    'const l = { light: 1, dark: 2 };',
    "type M = 'light' | 'dark';",
    "type L = 'theme' | 'primitives' | 'layouts';",
    'type N = { readonly light: number; readonly dark: number };',
    'const o = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950, 1000, 1050];',
  ].join('\n');
  const noms = recopiesDuTexte('exemple.ts', exemple).map((t) => `${t.ligne}:${t.regle.nom}`);
  assert.deepEqual(noms, ['1:crans', '2:modes', '3:profils', '4:états', '5:collections', "6:tags des règles d'usage", '16:crans', '10:états', '13:modes', '14:collections', '11:états', '15:modes']);
});

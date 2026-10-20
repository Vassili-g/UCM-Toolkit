/**
 * La garde de conservation relève les atomes d'un texte et signale ceux que
 * l'arrivée a perdus.
 *
 * Le test tient, sur de petits textes écrits ici et un manifeste en mémoire,
 * sans toucher au disque :
 * - une copie exacte ne rend aucun manque ;
 * - une réécriture qui raccourcit un chemin et passe un lien en ligne en lien
 *   de référence ne rend aucun manque ;
 * - un span, un nombre, un nombre en lettres, un identifiant `[UI-20]` ou une
 *   ancre perdus rendent chacun un manque dans leur catégorie ;
 * - un fichier d'arrivée absent donne un groupe « non écrit », sans échec, et
 *   un échec avec `--strict` ou avec `--domaines`.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  atomesDe,
  controler,
  decouperSource,
  formaterRapport,
  manques,
  normaliserCible,
  totalDe,
} from '../scripts/verifier-conservation.mjs';

const SOURCE = [
  '# Guide',
  '',
  'Le plugin écrit `packages/couleur/src/rampe.ts` seize fois.',
  '',
  '## Avant de modifier',
  '',
  '1. Lire [CONCEPT.md](./CONCEPT.md) avant de toucher à `src/ecriture/`.',
  '2. Le seuil vaut 50 et le pas 1,5.',
  '',
  '## Carte du code',
  '',
  '```text',
  'packages/couleur/         le moteur',
  '  src/',
  '    rampe.ts            la rampe, jamais plus de 99',
  '```',
  '',
  '## Invariants',
  '',
  'Un préambule avec [FORMAT.md](./docs/format/FORMAT.md).',
  '',
  '### Grilles',
  '',
  '- Une grille fixe `columnSizes` et `rowStart`, sauf 3 exceptions. [UI-20]',
  '- Voir [la spec](../../docs/format/FORMAT.md#grilles) et le point N01.',
  '',
  '### Couleurs',
  '',
  '- Le `contrast` reste au moins à 4,5. AUD-E2b, D14.',
  '',
  '## Vérification',
  '',
  '```sh',
  'npm test',
  '```',
  '',
  'Trois commandes lancent `npm run typecheck`.',
  '',
  '### La frontière de recette',
  '',
  'Le test `[UI-21]` est lu à la main.',
  '',
  '## Publier les paquets',
  '',
  'Publier avec `npm publish`.',
  '',
  '## Limites d’environnement',
  '',
  'Windows seulement.',
].join('\n');

const MANIFESTE = {
  version: 1,
  domaines: [
    { id: 'grilles', titre: 'Grilles', fichier: 'invariants/grilles.md' },
    { id: 'couleurs', titre: 'Couleurs', fichier: 'invariants/couleurs.md' },
    { id: 'publier', titre: 'Publier les paquets', fichier: 'skills/publier.md' },
  ],
  cartes: { 'packages/couleur': 'packages/couleur/CARTE.md' },
  registre: [],
};

/** Un lecteur en mémoire : les chemins absents rendent `null`. */
function lecteurDe(fichiers) {
  return {
    lire: (chemin) => (chemin in fichiers ? fichiers[chemin] : null),
    lister: () => [],
  };
}

function arriveeIdentique() {
  const { groupes, horsGroupe } = decouperSource(SOURCE);
  return {
    'invariants/grilles.md': groupes[0].texte,
    'invariants/couleurs.md': groupes[1].texte,
    'AGENTS.md': horsGroupe,
  };
}

function lancer(fichiers, options = {}) {
  return controler({ source: SOURCE, manifeste: MANIFESTE, lecteur: lecteurDe(fichiers), ...options });
}

function entree(resultat, titre) {
  return resultat.entrees.find((candidate) => candidate.titre === titre);
}

test('la découpe sépare les groupes de Invariants et le reste', () => {
  const { groupes, horsGroupe } = decouperSource(SOURCE);
  assert.deepEqual(groupes.map((groupe) => groupe.titre), ['Grilles', 'Couleurs']);
  assert.match(horsGroupe, /## Invariants/);
  assert.match(horsGroupe, /Un préambule/);
  assert.match(horsGroupe, /### La frontière de recette/);
  assert.doesNotMatch(horsGroupe, /columnSizes/);
});

test('une copie exacte ne rend aucun manque', () => {
  const resultat = lancer(arriveeIdentique());
  assert.equal(resultat.manquesTotal, 0);
  assert.deepEqual(resultat.erreurs, []);
  assert.deepEqual(resultat.entrees.map((candidate) => candidate.statut), ['ok', 'ok', 'ok']);
});

test('une copie exacte du texte entier ne rend aucun manque', () => {
  assert.deepEqual(
    manques(SOURCE, SOURCE),
    { code: [], nombres: [], identifiants: [], liens: [] },
  );
});

test('un chemin raccourci et un lien de référence ne rendent aucun manque', () => {
  const fichiers = arriveeIdentique();
  fichiers['invariants/grilles.md'] = [
    '- Une grille fixe `columnSizes` et `rowStart`, sauf 3 exceptions. [UI-20]',
    '- Voir [la spec] et le point N01.',
    '',
    '[la spec]: ../../docs/format/FORMAT.md#grilles',
  ].join('\n');
  fichiers['AGENTS.md'] = arriveeIdentique()['AGENTS.md']
    .replace('`packages/couleur/src/rampe.ts`', '`couleur/src/rampe.ts`')
    .replace('`src/ecriture/`', '`ecriture/`');
  const resultat = lancer(fichiers);
  assert.equal(resultat.manquesTotal, 0, formaterRapport(resultat));
});

test('un chemin se réduit à son dernier segment', () => {
  const atomes = atomesDe('`packages/couleur/src/rampe.ts`, `src/ecriture/`, `rampe.ts`, ` npm test `.');
  assert.deepEqual([...atomes.code].sort(), ['ecriture', 'npm test', 'rampe.ts']);
});

test('un lien se réduit à fichier et ancre, décodés', () => {
  assert.equal(normaliserCible('../../docs/format/FORMAT.md#grilles'), 'FORMAT.md#grilles');
  assert.equal(normaliserCible('./docs/Evolutions%20globales/PISTES.md'), 'PISTES.md');
  assert.equal(normaliserCible('#invariants'), '#invariants');
  assert.equal(normaliserCible('https://exemple.fr/a/b#c'), 'https://exemple.fr/a/b#c');
  const atomes = atomesDe('[a](./x/A.md#haut) et\n\n[b]: ../B.md');
  assert.deepEqual([...atomes.liens].sort(), ['A.md#haut', 'B.md']);
});

test('les nombres en chiffres et en lettres sont relevés, pas ceux du code', () => {
  const atomes = atomesDe('Seize fois 50, puis 1,5 et dix-sept, `12` et [x](./v2/p10.md).\n\n1. Un item');
  assert.deepEqual([...atomes.nombres].sort(), ['1,5', '50', 'dix-sept', 'seize']);
});

test('les identifiants de test et de décision sont relevés hors du code', () => {
  const atomes = atomesDe('[UI-20], N01, AUD-E2b, D14 et G7 mais pas `D99`, ni UTF-8.');
  assert.deepEqual([...atomes.identifiants].sort(), ['AUD-E2b', 'D14', 'G7', 'N01', '[UI-20]']);
});

test('un bloc text apporte le premier mot de ses lignes quand il ressemble à un chemin', () => {
  const atomes = atomesDe('```text\npackages/couleur/   moteur\n  src/\n    rampe.ts   la rampe\n  note sans chemin\n```\n```sh\nnpm test\n```');
  assert.deepEqual([...atomes.code].sort(), ['couleur', 'rampe.ts', 'src']);
});

test('un span retiré rend un manque de code', () => {
  const fichiers = arriveeIdentique();
  fichiers['invariants/grilles.md'] = fichiers['invariants/grilles.md'].replace('`rowStart`', 'rowStart');
  const resultat = lancer(fichiers);
  const grilles = entree(resultat, 'Grilles');
  assert.deepEqual(grilles.manques.code, ['rowStart']);
  assert.equal(totalDe(grilles.manques), 1);
  assert.equal(resultat.manquesTotal, 1);
});

test('un nombre retiré rend un manque de nombres', () => {
  const fichiers = arriveeIdentique();
  fichiers['invariants/couleurs.md'] = fichiers['invariants/couleurs.md'].replace('4,5', 'une valeur');
  const couleurs = entree(lancer(fichiers), 'Couleurs');
  assert.deepEqual(couleurs.manques.nombres, ['4,5']);
  assert.equal(totalDe(couleurs.manques), 1);
});

test('seize remplacé par 16 rend un manque de nombres', () => {
  const fichiers = arriveeIdentique();
  fichiers['AGENTS.md'] = fichiers['AGENTS.md'].replace('seize', '16');
  const resultat = lancer(fichiers);
  assert.deepEqual(entree(resultat, 'partie hors groupe (en-tête, carte, vérification, publication, limites)').manques.nombres, ['seize']);
});

test('un identifiant [UI-20] retiré rend un manque d’identifiants', () => {
  const fichiers = arriveeIdentique();
  fichiers['invariants/grilles.md'] = fichiers['invariants/grilles.md'].replace(' [UI-20]', '');
  const grilles = entree(lancer(fichiers), 'Grilles');
  assert.deepEqual(grilles.manques.identifiants, ['[UI-20]']);
  assert.equal(totalDe(grilles.manques), 1);
});

test('une ancre changée rend un manque de liens', () => {
  const fichiers = arriveeIdentique();
  fichiers['invariants/grilles.md'] = fichiers['invariants/grilles.md'].replace('#grilles', '#grilles-2');
  const grilles = entree(lancer(fichiers), 'Grilles');
  assert.deepEqual(grilles.manques.liens, ['FORMAT.md#grilles']);
  assert.equal(totalDe(grilles.manques), 1);
});

test('un fichier d’arrivée absent rend un groupe non écrit, sans échec', () => {
  const fichiers = arriveeIdentique();
  delete fichiers['invariants/couleurs.md'];
  const resultat = lancer(fichiers);
  assert.equal(entree(resultat, 'Couleurs').statut, 'non-ecrit');
  assert.deepEqual(resultat.erreurs, []);
  assert.equal(resultat.manquesTotal, 0);
  assert.match(formaterRapport(resultat), /NON ÉCRIT {2}groupe « Couleurs »/);
});

test('un fichier d’arrivée absent échoue avec strict', () => {
  const fichiers = arriveeIdentique();
  delete fichiers['invariants/couleurs.md'];
  const resultat = lancer(fichiers, { strict: true });
  assert.equal(resultat.erreurs.length, 1);
  assert.match(resultat.erreurs[0], /invariants\/couleurs\.md/);
  assert.match(formaterRapport(resultat), /^ÉCHEC|\nÉCHEC/);
});

test('domaines limite le contrôle, saute le hors groupe et exige le fichier nommé', () => {
  const fichiers = arriveeIdentique();
  delete fichiers['invariants/couleurs.md'];
  const seulGrilles = lancer(fichiers, { domaines: ['grilles'] });
  assert.deepEqual(seulGrilles.entrees.map((candidate) => candidate.titre), ['Grilles']);
  assert.deepEqual(seulGrilles.erreurs, []);

  const nommeAbsent = lancer(fichiers, { domaines: ['couleurs'] });
  assert.equal(nommeAbsent.erreurs.length, 1);

  assert.throws(() => lancer(fichiers, { domaines: ['inconnu'] }), /Domaine inconnu/);
});

test('un groupe sans domaine du même titre est une erreur', () => {
  const manifeste = { ...MANIFESTE, domaines: MANIFESTE.domaines.filter((domaine) => domaine.id !== 'couleurs') };
  const resultat = controler({
    source: SOURCE, manifeste, lecteur: lecteurDe(arriveeIdentique()),
  });
  assert.equal(resultat.erreurs.length, 1);
  assert.equal(entree(resultat, 'Couleurs').statut, 'sans-domaine');
});

test('des fichiers d’arrivée vides listent tous les atomes de la source', () => {
  const resultat = lancer({
    'invariants/grilles.md': '',
    'invariants/couleurs.md': '',
    'AGENTS.md': '',
  });
  const grilles = entree(resultat, 'Grilles');
  assert.deepEqual(grilles.manques.code, ['columnSizes', 'rowStart']);
  assert.deepEqual(grilles.manques.nombres, ['3']);
  assert.deepEqual(grilles.manques.identifiants, ['N01', '[UI-20]']);
  assert.deepEqual(grilles.manques.liens, ['FORMAT.md#grilles']);
  assert.ok(resultat.manquesTotal > totalDe(grilles.manques));
});

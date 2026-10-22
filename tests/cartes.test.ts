/**
 * Tient les cartes du code contre le disque.
 *
 * `.agents/domiciles.json` (clé `cartes`) range chaque dossier de paquet, et la
 * racine, vers son fichier de carte. Dans une carte, chaque ligne
 * `- <nom> : <rôle>` sous un titre `## <dossier>/` (ou `## ./`) désigne un
 * chemin relatif au dossier de la carte : un nom qui finit par `/` est un
 * dossier, un nom qui porte `*` désigne au moins un fichier du dossier.
 *
 * La section `## tests/` de `CARTE.md` à la racine liste exactement les
 * fichiers `*.test.ts` et `*.test.mjs` de `tests/`, `cartes.test.ts` compris.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const racine = path.resolve(__dirname, '..');

interface Entree {
  dossier: string;
  nom: string;
  ligne: number;
}

const manifeste = JSON.parse(
  fs.readFileSync(path.join(racine, '.agents', 'domiciles.json'), 'utf8'),
) as { cartes: Record<string, string> };

/** Les entrées `- <nom> : <rôle>` d'une carte, avec le titre `##` qui les porte. */
function entreesDe(fichier: string): Entree[] {
  const entrees: Entree[] = [];
  let dossier: string | null = null;
  fs.readFileSync(path.join(racine, fichier), 'utf8')
    .split(/\r?\n/)
    .forEach((texte, index) => {
      const titre = texte.match(/^## (\S+)\s*$/);
      if (titre) {
        dossier = titre[1];
        return;
      }
      const entree = texte.match(/^- (\S+) :/);
      if (entree && dossier !== null) {
        entrees.push({ dossier, nom: entree[1], ligne: index + 1 });
      }
    });
  return entrees;
}

/** Vrai si le chemin existe ; un `*` dans le dernier segment désigne un motif de nom. */
function existe(dossierDeLaCarte: string, entree: Entree): boolean {
  const base = path.join(dossierDeLaCarte, entree.dossier);
  const nom = entree.nom.replace(/\/$/, '');
  if (!nom.includes('*')) {
    const chemin = path.join(base, nom);
    if (!fs.existsSync(chemin)) return false;
    return entree.nom.endsWith('/') ? fs.statSync(chemin).isDirectory() : true;
  }
  if (!fs.existsSync(base)) return false;
  const motif = new RegExp(
    `^${nom.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`,
  );
  return fs.readdirSync(base).some((fichier) => motif.test(fichier));
}

test('les cartes sont rangées dans le manifeste, et leurs fichiers existent', () => {
  const cartes = Object.entries(manifeste.cartes);
  assert.ok(cartes.length >= 9, `seules ${cartes.length} cartes dans le manifeste`);
  for (const [dossier, fichier] of cartes) {
    assert.ok(
      fs.existsSync(path.join(racine, fichier)),
      `La carte ${fichier} du dossier ${dossier} manque.`,
    );
  }
});

for (const [dossier, fichier] of Object.entries(manifeste.cartes)) {
  test(`${fichier} : chaque entrée désigne un chemin qui existe`, () => {
    const entrees = entreesDe(fichier);
    assert.ok(entrees.length > 0, `La carte ${fichier} ne contient aucune entrée.`);
    const dossierDeLaCarte = path.join(racine, dossier);
    const absents = entrees
      .filter((entree) => !existe(dossierDeLaCarte, entree))
      .map((entree) => {
        const chemin = path.posix.join(entree.dossier, entree.nom);
        return `${chemin} (ligne ${entree.ligne})`;
      });
    assert.deepEqual(
      absents,
      [],
      `La carte ${fichier} nomme des chemins absents de ${dossier} : ${absents.join(', ')}. `
        + 'Corriger la ligne, ou retirer celle de ce qui a été supprimé.',
    );
  });
}

test('la section tests/ de CARTE.md liste exactement les tests du monorepo', () => {
  const reels = fs.readdirSync(path.join(racine, 'tests'))
    .filter((nom) => nom.endsWith('.test.ts') || nom.endsWith('.test.mjs'))
    .sort();
  const listes = entreesDe('CARTE.md')
    .filter((entree) => entree.dossier === 'tests/')
    .map((entree) => entree.nom)
    .sort();

  assert.ok(reels.length >= 5, `seuls ${reels.length} tests trouvés sous tests/`);
  assert.ok(listes.includes('cartes.test.ts'), '`cartes.test.ts` manque à la section tests/ de CARTE.md.');
  assert.deepEqual(
    listes,
    reels,
    'La section tests/ de CARTE.md ne décrit plus le dossier `tests/`. Y ajouter le '
      + "test manquant avec ce qu'il tient, ou en retirer la ligne devenue fausse.",
  );
});

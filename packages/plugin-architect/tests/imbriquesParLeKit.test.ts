/**
 * La sorte d'un composant imbriqué se décide dans le kit, et nulle part ailleurs.
 *
 * Le relevé relève des faits (nom, règles trouvées, dimensions liées) et appelle `sorteDeLImbrique`. La loi lit les
 * sources de `src/`, commentaires retirés, et refuse ce qui réinventerait la décision sans passer par elle : un test de
 * préfixe `.` ou `_`, une sorte nommée par un fichier qui n'importe pas la fonction, un relevé des dimensions liées dont
 * aucun appel à la fonction ne tire la conclusion. Elle exige aussi que le lecteur connu appelle la fonction, pour ne pas
 * passer à vide si le code déménage. Le socle a la même loi pour l'exporteur (`plugin-socle/tests/imbriquesParLeKit.test.ts`).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const SRC = path.resolve(__dirname, '..', 'src');

const SORTES = ['dependance', 'wrapper-de-dimensions', 'piece-interne', 'detail'];

function fichiersDe(dossier: string): string[] {
  return fs.readdirSync(dossier, { withFileTypes: true }).flatMap((entree) => {
    const chemin = path.join(dossier, entree.name);
    if (entree.isDirectory()) return fichiersDe(chemin);
    return /\.tsx?$/.test(entree.name) ? [chemin] : [];
  });
}

/** Les sources de `src/`, commentaires retirés : un commentaire peut citer `'.'` sans le décider. */
function sources(): Array<{ fichier: string; code: string }> {
  return fichiersDe(SRC).map((chemin) => {
    const brut = fs.readFileSync(chemin, 'utf8');
    const code = brut.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
    return { fichier: path.relative(SRC, chemin).replace(/\\/g, '/'), code };
  });
}

/** Les formes d'un test de préfixe de pièce interne. */
const TESTS_DE_PREFIXE: ReadonlyArray<{ nom: string; motif: RegExp }> = [
  { nom: 'comparaison à `.` ou `_`', motif: /[!=]==?\s*['"`][._]['"`]|['"`][._]['"`]\s*[!=]==?/ },
  { nom: 'startsWith sur `.` ou `_`', motif: /startsWith\(\s*['"`][._]['"`]/ },
  { nom: 'expression régulière ancrée sur `.` ou `_`', motif: /\/\^(?:\[[^\]]*[._][^\]]*\]|\\\.|_)/ },
  { nom: 'liste des préfixes du kit lue hors du kit', motif: /PREFIXES_DE_PIECE_INTERNE/ },
];

test('aucun fichier de src/ ne teste un préfixe de pièce interne', () => {
  const trouves: string[] = [];
  for (const { fichier, code } of sources()) {
    for (const { nom, motif } of TESTS_DE_PREFIXE) {
      if (motif.test(code)) trouves.push(`${fichier} : ${nom}`);
    }
  }
  assert.deepEqual(trouves, [], 'La pièce interne se reconnaît par sorteDeLImbrique (@ucm-kit/core/referentiel).');
});

test('un fichier qui nomme une sorte ou compte les dimensions liées appelle sorteDeLImbrique', () => {
  const sansLaFonction: string[] = [];
  for (const { fichier, code } of sources()) {
    const nommeUneSorte = SORTES.some((sorte) => code.includes(`'${sorte}'`) || code.includes(`"${sorte}"`));
    const relevePourClasser = /\b(?:countLayoutBindings|releverLesFaitsDUnImbrique|dimensionsLiees)\(/.test(code);
    if ((nommeUneSorte || relevePourClasser) && !/\bsorteDeLImbrique\(/.test(code)) sansLaFonction.push(fichier);
  }
  assert.deepEqual(sansLaFonction, [], 'Ces fichiers décident une sorte sans appeler sorteDeLImbrique.');
});

test('le relevé des imbriqués appelle sorteDeLImbrique, et lui seul', () => {
  const appelants = sources().filter(({ code }) => /\bsorteDeLImbrique\(/.test(code)).map(({ fichier }) => fichier);
  assert.deepEqual(appelants.sort(), ['imbriquesDuReleve.ts']);
});

test('la liste des dimensions de layout vient de nodeBindings, pas d’une copie de BINDING_PATTERNS', () => {
  const copies = sources().filter(({ code }) => /BINDING_PATTERNS\.gap\s*,\s*BINDING_PATTERNS\.paddingX/.test(code)).map(({ fichier }) => fichier);
  assert.deepEqual(copies, [], 'Importer DIMENSIONS_DE_LAYOUT de nodeBindings.ts.');
});

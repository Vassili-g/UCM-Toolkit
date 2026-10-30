/**
 * Trois tests du navigateur de Palettes gardent leur copie de la luminance WCAG
 * ou du décodage sRGB : le navigateur évalue leur texte, qui ne peut rien
 * importer. Ce test lit chaque copie dans son fichier et la compare au kit sur
 * une grille de couleurs, pour qu'une copie qui dérive échoue ici (D-09, Q-06).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import ts from 'typescript';
import { decoder, luminanceRelative, type Rgb8 } from 'ucm-couleur';

const tests = path.resolve(__dirname);

/** La première définition `const <nom> = …;` d'un fichier de test, sur une ou plusieurs lignes, compilée et évaluée. */
function copieDe(fichier: string, nom: string): (...arguments_: never[]) => unknown {
  const texte = readFileSync(path.join(tests, fichier), 'utf8');
  const debut = texte.search(new RegExp(`^\\s*const ${nom} = `, 'm'));
  assert.notEqual(debut, -1, `${fichier} ne définit plus ${nom}`);
  const reste = texte.slice(debut);
  const fin = reste.search(/;\r?\n(?=\s*(?:const|\/\*\*|\/\/|return|function|\}))/);
  const definition = reste.slice(0, fin + 1).trim();
  const js = ts.transpileModule(definition, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return new Function(`${js}\nreturn ${nom};`)();
}

const GRILLE: Rgb8[] = [];
for (let r = 0; r <= 255; r += 51) for (let g = 0; g <= 255; g += 51) for (let b = 0; b <= 255; b += 51) GRILLE.push([r, g, b]);
GRILLE.push([30, 111, 217], [200, 30, 30], [1, 2, 3], [254, 253, 252]);

test('la luminance du test de contraste du navigateur égale celle du kit', () => {
  const texte = readFileSync(path.join(tests, 'interface/interface.test.mjs'), 'utf8');
  const debut = texte.indexOf('const luminance = (canaux) => {');
  assert.notEqual(debut, -1, 'interface.test.mjs ne définit plus `luminance`');
  const fin = texte.indexOf('\n  };', debut);
  const luminance = new Function(`${texte.slice(debut, fin + 5)}\nreturn luminance;`)() as (canaux: number[]) => number;
  for (const couleur of GRILLE) {
    const copie = luminance(couleur.map((canal) => canal / 255));
    assert.ok(Math.abs(copie - luminanceRelative(couleur)) < 1e-12, `${couleur} : ${copie} contre ${luminanceRelative(couleur)}`);
  }
});

test('le décodage sRGB de la clarté OKLab du navigateur et celui de la roue des teintes égalent celui du kit', () => {
  const copies = [
    copieDe('interface/interface.test.mjs', 'lineaire'),
    copieDe('roueDesTeintes.test.ts', 'lineaire'),
  ] as ((x: number) => number)[];
  for (const copie of copies) {
    for (let octet = 0; octet <= 255; octet += 5) {
      assert.ok(Math.abs(copie(octet) - decoder(octet / 255)) < 1e-12, `${octet}`);
    }
  }
});

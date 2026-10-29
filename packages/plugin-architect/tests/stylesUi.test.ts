/**
 * Le DOM de l'interface et ses feuilles parlent des mêmes classes, et aucune
 * couleur n'est écrite hors des rôles. La loi est celle du socle. Les
 * couleurs d'Architect vivent dans `roles.css`, placée avant le socle.
 * `ui/nomenclature/` et `styles/nomenclature.css` ont leur propre loi
 * (`nomenclatureSocle.test.ts`).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  classesSansRegle,
  couleursHorsDesRoles,
  feuilleDuSocle,
  reglesMortes,
  sourcesDuSocle,
  variantesDeBouton,
  type EntreesLoiDesStyles,
} from 'ucm-plugin-socle/lois/styles';

const dossierUi = path.resolve(__dirname, '..', 'src', 'ui');
const lire = (fichier: string): string => fs.readFileSync(fichier, 'utf8');

function sourcesUi(dossier: string): string[] {
  return fs.readdirSync(dossier, { withFileTypes: true }).flatMap((entree) => {
    const chemin = path.join(dossier, entree.name);
    if (entree.isDirectory()) return entree.name === 'nomenclature' ? [] : sourcesUi(chemin);
    return entree.name.endsWith('.ts') ? [chemin] : [];
  });
}

const source = [...sourcesUi(dossierUi), ...sourcesDuSocle()].map(lire).join('\n');
const roles = lire(path.join(dossierUi, 'roles.css'));
/** Les feuilles de chaque domaine, hors Nomenclature qui a sa propre loi. */
const feuilleDuPlugin = fs.readdirSync(path.join(dossierUi, 'styles')).filter((nom) => nom.endsWith('.css') && nom !== 'nomenclature.css').sort().map((nom) => lire(path.join(dossierUi, 'styles', nom))).join('\n');

const ENTREES: EntreesLoiDesStyles = {
  source,
  feuille: roles + feuilleDuSocle() + feuilleDuPlugin,
  valeursDeGabarit: { variant: () => variantesDeBouton(source) },
  poseesParLHote: new Set(['figma-dark']),
};

test('toute classe posée par l’interface a une règle dans les feuilles', () => {
  assert.deepEqual(classesSansRegle(ENTREES), []);
});

test('toute règle de la feuille du plugin vise une classe que l’interface pose', () => {
  assert.deepEqual(reglesMortes({ ...ENTREES, feuille: feuilleDuPlugin }), []);
});

test('les feuilles n’écrivent aucune couleur en dur hors des blocs de rôles', () => {
  assert.deepEqual(couleursHorsDesRoles(ENTREES.feuille), []);
  assert.deepEqual(couleursHorsDesRoles(`* {}${feuilleDuPlugin}`), []);
});

test('chaque rôle de couleur du socle reçoit une valeur sombre de l’explorateur', () => {
  const socle = feuilleDuSocle();
  const blocRacine = socle.slice(socle.indexOf(':root {'), socle.indexOf('}', socle.indexOf(':root {')));
  const rolesDuSocle = [...blocRacine.matchAll(/(--(?:fond|bordure|texte)[\w-]*)\s*:/g)].map((trouve) => trouve[1]);
  const redefinis = new Set([...feuilleDuPlugin.matchAll(/(--[\w-]+)\s*:\s*var\(--sombre-/g)].map((trouve) => trouve[1]));
  const exemptes = new Set(['--fond-niveau-atteint', '--texte-niveau-atteint', '--fond-niveau-manque', '--texte-niveau-manque']);
  assert.deepEqual(rolesDuSocle.filter((role) => !redefinis.has(role) && !exemptes.has(role)), []);
  assert.doesNotMatch(feuilleDuPlugin, /prefers-color-scheme/);
  assert.doesNotMatch(feuilleDuPlugin, /--figma-color/);
});

test('chaque rôle du langage commun qui a une valeur sombre la reçoit d’Architect, toujours sombre', () => {
  const langage = lire(path.resolve(__dirname, '..', '..', 'plugin-socle', 'src', 'ui', 'langage.css'));
  // Un rôle a une paire quand le socle écrit aussi sa valeur claire ; `--encre-sur-sombre` est un rôle à lui seul.
  const sombres = [...langage.matchAll(/(--[\w-]+)-sombre\s*:/g)].map((trouve) => trouve[1]).filter((role) => new RegExp(String.raw`${role}\s*:`).test(langage));
  const affectes = new Set([...feuilleDuPlugin.matchAll(/(--[\w-]+)\s*:\s*var\(\1-sombre\)/g)].map((trouve) => trouve[1]));
  assert.ok(sombres.includes('--texte-terme-figma'));
  assert.deepEqual(sombres.filter((role) => !affectes.has(role)), []);
});

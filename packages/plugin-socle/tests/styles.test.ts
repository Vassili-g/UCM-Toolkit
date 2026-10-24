/** La loi des styles lit chaque forme par laquelle une interface pose une classe. */
import assert from 'node:assert/strict';
import test from 'node:test';

import fs from 'node:fs';
import path from 'node:path';

import { classesDuLangage, classesPosees, classesSansRegle, couleursHorsDesRoles, feuilleDuLangage, feuilleDuSocle, redefinitionsDuLangage, reglesMortes, sourcesDuSocle, variantesDeBouton } from '../lois/styles';

const lire = (source: string) =>
  [...classesPosees({ source, feuille: '', valeursDeGabarit: {}, poseesParLHote: new Set() })].sort();

test('une classe posée par className, littérale ou par gabarit, est lue', () => {
  const source = "a.className = 'carte carte-vide';\nb.className = `btn btn-${variant}`;";
  assert.deepEqual(
    [...classesPosees({ source, feuille: '', valeursDeGabarit: { variant: () => ['primary'] }, poseesParLHote: new Set() })].sort(),
    ['btn', 'btn-primary', 'carte', 'carte-vide'],
  );
});

test('un élément SVG pose sa classe par setAttribute ou classList, et la loi la lit', () => {
  const source = [
    "trait.setAttribute('class', 'derive-trait derive-trait-soft');",
    "poignee.classList.add('derive-poignee', 'derive-poignee-claire');",
    "poignee.classList.toggle('derive-poignee-active', actif);",
  ].join('\n');
  assert.deepEqual(lire(source), [
    'derive-poignee',
    'derive-poignee-active',
    'derive-poignee-claire',
    'derive-trait',
    'derive-trait-soft',
  ]);
});

const lireFeuille = (...chemin: string[]): string => fs.readFileSync(path.resolve(__dirname, '..', '..', ...chemin), 'utf8');
/** Les feuilles de chaque plugin, dans l'ordre où son build les concatène. */
const FEUILLES_DES_PLUGINS: Readonly<Record<string, string>> = {
  exporter: lireFeuille('plugin-exporter', 'src', 'ui', 'styles.css'),
  palettes: lireFeuille('plugin-palettes', 'src', 'ui', 'styles.css'),
  architect: ['commun', 'arbre', 'fiche', 'composant', 'nomenclature'].map((domaine) => lireFeuille('plugin-architect', 'src', 'ui', 'styles', `${domaine}.css`)).join('\n'),
};

test('le langage définit les classes de chaque signal de la liste', () => {
  const definies = classesDuLangage();
  const attendues = [
    'ch-groupe', 'ch-variable', 'ch-groupe-vu', 'ch-variable-vu', 'ch-ajout', 'seg-ancien', 'seg-nouveau', 'ch-inline', 'ch-lien',
    'jeton', 'jeton-retire', 'jeton-retenu', 'fleche', 'puce-couleur', 'alerte', 'ton-bloquant', 'ton-corriger', 'ton-verifier', 'ton-info', 'ton-tenu',
    'gravite', 'resultat', 'colonnes-tete', 'diff', 'carte-ciblee', 'puce-filtre', 'recherche-active', 'pastille-compte', 'arch-poignee',
    'signe', 'signe-14', 'signe-24', 'signe-informe', 'signe-teinte-couleurs', 'signe-valeur', 'signe-contour', 'signe-absent',
  ];
  assert.deepEqual(attendues.filter((classe) => !definies.has(classe)), []);
  // Une classe que le langage ne fait que placer (`.diff .case`) reste à qui la définit.
  assert.ok(!definies.has('case') && !definies.has('carte') && !definies.has('btn'));
});

test('la loi refuse un sélecteur sans ancêtre qui nomme une classe du langage, et laisse passer celui qui la place', () => {
  assert.deepEqual(redefinitionsDuLangage('.jeton { color: red; }'), ['.jeton']);
  assert.deepEqual(redefinitionsDuLangage('.a, .diff.reste, .jeton:hover { x: y; }'), ['.diff.reste', '.jeton:hover']);
  assert.deepEqual(redefinitionsDuLangage('@media (max-width: 519px) { .diff { x: y; } }'), ['.diff']);
  assert.deepEqual(redefinitionsDuLangage('/* .jeton { } */ .fiche-liste .diff { x: y; } .ligne > .jeton { x: y; } .a { x: y; }'), []);
});

test('aucune feuille de plugin ne redéfinit une classe du langage', () => {
  for (const [plugin, feuille] of Object.entries(FEUILLES_DES_PLUGINS)) {
    assert.deepEqual(redefinitionsDuLangage(feuille), [], plugin);
  }
});

test('le langage ne contient aucune couleur en dur hors de ses blocs de rôles, et chaque classe qu’il stylise est posée par un composant', () => {
  assert.deepEqual(couleursHorsDesRoles(feuilleDuSocle()), []);
  assert.deepEqual(couleursHorsDesRoles(`${feuilleDuSocle()}\n.a { color: #fff; }`), ['#fff']);
  const source = sourcesDuSocle().map((fichier) => fs.readFileSync(fichier, 'utf8')).join('\n');
  const entrees = { source, feuille: feuilleDuLangage(), valeursDeGabarit: { variant: () => variantesDeBouton(source) }, poseesParLHote: new Set(['figma-dark']) };
  assert.deepEqual(reglesMortes(entrees), []);
  assert.deepEqual(classesSansRegle({ ...entrees, feuille: feuilleDuSocle() }), []);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import * as produits from '../src/referentiel/produits.js';

for (const [texte, attendu] of [
  ['', 'absente'], ['{"version":1,"ucm":true}', 'ucm'], ['{"version":1,"ucm":false}', 'libre'],
  ['{"version":2}', 'future'], ['{}', 'illisible'], ['{"version":1}', 'illisible'], ['pas du JSON', 'illisible'],
  ['null', 'illisible'], ['[]', 'illisible'], ['{"version":1,"ucm":"true"}', 'illisible'], ['{"version":2.5}', 'illisible'],
] as const) {
  test(`architecture du fichier : ${JSON.stringify(texte)} se lit ${attendu}`, () => {
    assert.equal(produits.lireLArchitectureDuFichier(texte), attendu);
  });
}

test('la déclaration écrite se relit pour les deux états', () => {
  assert.equal(produits.CLE_ARCHITECTURE_DU_FICHIER, 'architecture');
  for (const ucm of [false, true]) {
    assert.equal(produits.lireLArchitectureDuFichier(produits.texteDeLArchitectureDuFichier(ucm)), ucm ? 'ucm' : 'libre');
  }
});

test('Nomenclature écrit la déclaration que Palettes lit', () => {
  assert.ok(produits.PRODUITS.find((p) => p.id === 'architect')?.ecrit.some((s) => s.destination === 'donnees-partagees-figma' && s.donnees.includes('architecture-du-fichier')));
  assert.ok(produits.PRODUITS.find((p) => p.id === 'palettes')?.lit.includes('architecture-du-fichier'));
});

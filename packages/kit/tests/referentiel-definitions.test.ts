import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  SUPPORT_DES_VARIABLES, VARIABLES_DE_PALETTE, DEFINITIONS_DES_VARIABLES, REGISTRE_VARIABLES_THEME,
  REGLE_SCALE, libellesDesVariables, niveauxWcag, SEUILS_PAR_USAGE, SEUILS_PAR_ROLE,
  TAGS_DES_REGLES, TAGS_D_INTENTION, RECOMMANDATIONS, PRODUITS, ESPACE_PARTAGE, CLE_RECETTE,
  CLES_PARTAGEES_DE_PALETTES, ESPACE_ARCHITECT,
  type VariableLibellee,
} from '../src/referentiel/index.js';

test('chaque variable du thème a une définition et reprend son support sans le recopier', () => {
  assert.deepEqual(DEFINITIONS_DES_VARIABLES.map(({ id }) => id).sort(), Object.keys(SUPPORT_DES_VARIABLES).sort());
  for (const variable of DEFINITIONS_DES_VARIABLES) {
    assert.equal(variable.support, SUPPORT_DES_VARIABLES[variable.id]);
    for (const langue of ['fr', 'en'] as const) {
      assert.ok(variable.libelle[langue].trim(), variable.id);
      assert.ok(variable.definition[langue].trim(), variable.id);
      assert.ok(!variable.definition[langue].includes('?'), variable.id);
    }
  }
  assert.equal(REGISTRE_VARIABLES_THEME.termes.length, DEFINITIONS_DES_VARIABLES.length + 1);
  assert.equal(REGLE_SCALE.palettes, 'toutes');
  assert.equal(REGLE_SCALE.support, SUPPORT_DES_VARIABLES['scale/0']);
});

test('les dix-sept libellés gardent les textes validés dans les deux langues', () => {
  const attendus = {
    fr: ['bouton', 'bouton survolé', 'bouton appuyé', 'texte des boutons', 'fond teinté', 'fond teinté survolé', 'fond teinté appuyé', 'texte sur fond teinté', 'contour sur fond teinté', 'texte coloré', 'contour', 'filet', 'anneau de focus', 'corps de texte', 'texte secondaire', 'fond de la page', 'fond de la carte'],
    en: ['button', 'button, hovered', 'button, pressed', 'button text', 'tinted fill', 'tinted fill, hovered', 'tinted fill, pressed', 'text on tinted fill', 'border on tinted fill', 'colored text', 'border', 'divider', 'focus ring', 'body text', 'secondary text', 'page background', 'card background'],
  };
  for (const langue of ['fr', 'en'] as const) {
    const projection: Record<VariableLibellee, string> = libellesDesVariables(langue);
    assert.equal(Object.keys(projection).length, 17);
    assert.deepEqual(Object.values(projection), attendus[langue]);
    assert.deepEqual(Object.keys(projection), [...VARIABLES_DE_PALETTE, 'page/foreground-main', 'page/foreground-subtle', 'elevation/page', 'elevation/raised']);
  }
});

test('les niveaux WCAG jugent les limites sur dix décimales', () => {
  assert.deepEqual(SEUILS_PAR_USAGE, { texte: 4.5, nonTexte: 3 });
  assert.deepEqual(SEUILS_PAR_ROLE, { foreground: 4.5, icon: 4.5, border: 3, ring: 3 });
  assert.deepEqual(niveauxWcag(3), { texte: null, grandTexte: 'AA', graphique: true });
  assert.deepEqual(niveauxWcag(4.5), { texte: 'AA', grandTexte: 'AAA', graphique: true });
  assert.deepEqual(niveauxWcag(7), { texte: 'AAA', grandTexte: 'AAA', graphique: true });
  for (const seuil of [3, 4.5, 7]) {
    assert.deepEqual(niveauxWcag(seuil - 0.00000000001), niveauxWcag(seuil));
    assert.notDeepEqual(niveauxWcag(seuil - 0.0000000001), niveauxWcag(seuil));
  }
});

test('les recommandations visent des caractéristiques relevées par les lecteurs', () => {
  const source = readFileSync(new URL('../src/lecteurs/caracteristiques.mjs', import.meta.url), 'utf8');
  const bloc = source.split('export const CARACTERISTIQUES = [')[1].split('];')[0];
  const caracteristiques = [...bloc.matchAll(/id: "([^"]+)"/g)].map((match) => match[1]);
  for (const recommandation of RECOMMANDATIONS) {
    assert.ok(caracteristiques.includes(recommandation.declencheur));
    for (const langue of ['fr', 'en'] as const) {
      assert.ok(recommandation.regle[langue].trim());
      assert.ok(recommandation.preuve[langue].trim());
    }
  }
  assert.deepEqual(RECOMMANDATIONS.find(({ id }) => id === 'anneau-de-focus')?.parametres,
    { espace: 2, epaisseur: 2, unite: 'px', couleurDeLEspace: 'fond', couleurDuTrait: 'ring' });
  assert.deepEqual(RECOMMANDATIONS.find(({ id }) => id === 'bouton-basculable')?.parametres, { repos: 'surface', active: 'solid' });
});

test('les huit tags distinguent les quatre entrées de l’intention', () => {
  assert.deepEqual(TAGS_DES_REGLES, ['usage', 'prop', 'boolean', 'do', 'dont', 'pairs', 'icons', 'default']);
  assert.deepEqual(TAGS_D_INTENTION, ['usage', 'do', 'dont', 'pairs']);
});

test('les neuf produits décrivent leurs responsabilités et leurs destinations', () => {
  assert.equal(PRODUITS.length, 9);
  assert.equal(new Set(PRODUITS.map(({ id }) => id)).size, 9);
  for (const produit of PRODUITS) {
    for (const langue of ['fr', 'en'] as const) {
      assert.ok(produit.libelle[langue].trim());
      assert.ok(produit.definition[langue].trim());
    }
  }
  assert.deepEqual(PRODUITS.find(({ id }) => id === 'explorateur')?.ecrit, []);
  assert.deepEqual(PRODUITS.find(({ id }) => id === 'exporter')?.ecrit.find(({ destination }) => destination === 'document-figma')?.donnees, ['regles-usage']);
  assert.deepEqual(PRODUITS.find(({ id }) => id === 'adapter-typescript')?.ecrit.find(({ destination }) => destination === 'repository')?.donnees, ['types']);
  assert.deepEqual(PRODUITS.find(({ id }) => id === 'architect')?.lit, ['noms-collections', 'noms-variables', 'regles-de-nommage']);
  assert.deepEqual(PRODUITS.find(({ id }) => id === 'architect')?.ecrit, [
    { donnees: ['noms-collections', 'noms-variables'], destination: 'document-figma' },
    { donnees: ['regles-de-nommage'], destination: 'donnees-partagees-figma' },
  ]);
  assert.equal(ESPACE_PARTAGE, 'ucm_palettes');
  assert.equal(CLE_RECETTE, 'recette');
  assert.deepEqual(CLES_PARTAGEES_DE_PALETTES, { variables: 'variables', palette: 'palette', cle: 'cle' });
  assert.equal(ESPACE_ARCHITECT, 'ucm_architect');
});

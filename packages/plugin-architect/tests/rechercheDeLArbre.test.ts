/** La recherche de l'arbre : ce que dit le champ, quelles variables il retient, quels segments il colore. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { indexer } from '../src/indexation';
import { emploieUneForme, formesDuReferentiel, lireLaRecherche, motsDuSegment, segmentsCherches, variablesQuiVisent } from '../src/ui/recherche/requete';
import { comptesParCollection, variablesTrouvees } from '../src/ui/recherche/resultats';
import { cinqCollections } from './fixtures';

test('un texte libre, terme: et vise: se lisent par leur préfixe', () => {
  assert.deepEqual(lireLaRecherche('Surface'), { sorte: 'texte', terme: 'surface' });
  assert.deepEqual(lireLaRecherche('terme:Background'), { sorte: 'terme', mot: 'background' });
  assert.deepEqual(lireLaRecherche('vise:Card/bg/default'), { sorte: 'vise', cible: 'Card/bg/default' });
});

test('un préfixe sans rien derrière lui reste un texte libre', () => {
  assert.deepEqual(lireLaRecherche('terme:'), { sorte: 'texte', terme: 'terme:' });
  assert.deepEqual(lireLaRecherche('vise:'), { sorte: 'texte', terme: 'vise:' });
});

test('les mots d’un segment se coupent aux tirets, aux soulignés et aux majuscules', () => {
  assert.deepEqual(motsDuSegment('padding-x'), ['padding', 'x']);
  assert.deepEqual(motsDuSegment('paddingX'), ['padding', 'x']);
  assert.deepEqual(motsDuSegment('border_width'), ['border', 'width']);
  assert.deepEqual(motsDuSegment('contrasthovered'), ['contrasthovered']);
});

test('un nom emploie une forme par un segment entier ou par l’un de ses mots, jamais par un mot collé', () => {
  assert.equal(emploieUneForme('Button/bg/default', ['background', 'bg']), true);
  assert.equal(emploieUneForme('Button/bgColor/default', ['bg']), true);
  assert.equal(emploieUneForme('Link/contrasthovered/text', ['hovered']), false);
  assert.equal(emploieUneForme('Button/Background/default', ['background']), true);
});

test('le référentiel donne les formes d’un terme, et le terme seul quand il n’en a pas', () => {
  assert.deepEqual(formesDuReferentiel('background'), ['background', 'bg']);
  assert.deepEqual(formesDuReferentiel('inconnu'), ['inconnu']);
});

test('terme: retient les noms qui emploient une forme, vise: ceux qui visent la variable, un texte libre le texte cherché', () => {
  const index = indexer(cinqCollections());
  const toutes = () => true;
  const texte = (variable: { nom: string }) => variable.nom;
  assert.deepEqual(variablesTrouvees(index, 'terme:background', toutes, texte).map((variable) => variable.id), ['bouton-fond']);
  assert.deepEqual(variablesTrouvees(index, 'vise:surface/primary', toutes, texte).map((variable) => variable.id), ['bouton-fond']);
  assert.deepEqual(variablesTrouvees(index, 'vise:inconnue', toutes, texte), []);
  assert.deepEqual(variablesTrouvees(index, 'red/500', toutes, texte).map((variable) => variable.id), ['rouge-500']);
  assert.deepEqual([...variablesQuiVisent(index, 'primary/500')], ['usage-surface']);
});

test('les filtres du tableau restent appliqués pendant une recherche', () => {
  const index = indexer(cinqCollections());
  assert.deepEqual(variablesTrouvees(index, 'terme:background', () => false, (variable) => variable.nom), []);
});

test('les comptes par collection suivent l’ordre du relevé et omettent les collections sans résultat', () => {
  const index = indexer(cinqCollections());
  const trouvees = variablesTrouvees(index, 'primary', () => true, (variable) => variable.nom);
  assert.deepEqual(comptesParCollection(index, trouvees), [{ collection: 'composants', nombre: 1 }, { collection: 'usage', nombre: 1 }, { collection: 'theme', nombre: 1 }, { collection: 'marque', nombre: 2 }]);
});

test('une recherche colore le segment cherché, une forme du terme, et rien pour vise:', () => {
  assert.deepEqual(segmentsCherches(lireLaRecherche('backgrond'), 'Modal/backgrond/default'), ['backgrond']);
  assert.deepEqual(segmentsCherches(lireLaRecherche('terme:background'), 'Button/bg/default'), ['bg']);
  assert.deepEqual(segmentsCherches(lireLaRecherche('vise:Card/bg/default'), 'Drawer/backgrond/default'), []);
  assert.deepEqual(segmentsCherches(lireLaRecherche(''), 'Card/bg/default'), []);
});

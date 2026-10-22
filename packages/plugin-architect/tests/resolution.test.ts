/** La chaîne explicative dans un contexte de modes. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { dependantsDirects, dependantsTransitifs, indexer } from '../src/indexation';
import { BORNE_DES_ETAPES, contexteDeColonne, creerResolveur, resoudre, type Resultat } from '../src/resolution';
import { alias, cinqCollections, constructeur, couleur, nombre, projetLibre, texte } from './fixtures';

const valeur = (resultat: Resultat) => (resultat.statut === 'resolu' ? resultat.valeur : null);

test('une chaîne traverse cinq collections, chaque étape garde sa variable, sa collection et son mode', () => {
  const index = indexer(cinqCollections());
  const resultat = resoudre(index, 'bouton-fond', { theme: 'theme:Light', marque: 'marque:Beta' });
  assert.equal(resultat.statut, 'resolu');
  assert.deepEqual(resultat.etapes.map((etape) => [etape.variable, etape.collection, etape.mode, etape.origine]), [
    ['bouton-fond', 'composants', 'composants:Valeur', 'defaut'],
    ['usage-surface', 'usage', 'usage:Valeur', 'defaut'],
    ['theme-primary', 'theme', 'theme:Light', 'contexte'],
    ['marque-500-clair', 'marque', 'marque:Beta', 'contexte'],
    ['vert-500', 'primitives', 'primitives:Valeur', 'defaut'],
  ]);
});

test('l’opacité d’un alias multiplie l’alpha de la couleur terminale, et les opacités d’une chaîne se multiplient', () => {
  const c = constructeur();
  c.collection('c', 'Couleurs', ['M']);
  c.variable('bleu', 'c', 'bleu', 'COLOR', { M: couleur('#0000FF') });
  c.variable('voile', 'c', 'voile', 'COLOR', { M: couleur('#0000FF', 0.8) });
  c.variable('nul', 'c', 'bordure', 'COLOR', { M: { nature: 'alias', cible: 'bleu', opacite: 0 } });
  c.variable('demi', 'c', 'demi', 'COLOR', { M: { nature: 'alias', cible: 'voile', opacite: 0.5 } });
  c.variable('quart', 'c', 'quart', 'COLOR', { M: { nature: 'alias', cible: 'demi', opacite: 0.5 } });
  c.variable('plein', 'c', 'plein', 'COLOR', { M: alias('voile') });
  const index = indexer(c.releve());
  const alpha = (id: string) => {
    const resultat = resoudre(index, id, {});
    return resultat.statut === 'resolu' && resultat.valeur.nature === 'couleur' ? resultat.valeur.couleur.a : null;
  };
  assert.equal(alpha('nul'), 0);
  assert.equal(alpha('demi'), 0.4);
  assert.equal(alpha('quart'), 0.2);
  assert.equal(alpha('plein'), 0.8);
  assert.equal(resoudre(index, 'nul', {}).etapes.length, 2);
});

test('une famille absente du contexte prend le mode par défaut déclaré, pas la première colonne', () => {
  const index = indexer(cinqCollections());
  const resultat = resoudre(index, 'theme-primary', {});
  assert.equal(resultat.etapes[0].mode, 'theme:Dark');
  assert.equal(resultat.etapes[0].origine, 'defaut');
  assert.equal(resultat.etapes[1].variable, 'marque-500-sombre');
});

test('deux axes indépendants : chaque collection garde son propre mode', () => {
  const index = indexer(cinqCollections());
  const alphaClair = resoudre(index, 'bouton-fond', { theme: 'theme:Light', marque: 'marque:Alpha' });
  const betaSombre = resoudre(index, 'bouton-fond', { theme: 'theme:Dark', marque: 'marque:Beta' });
  assert.equal(alphaClair.etapes[4].variable, 'rouge-500');
  assert.equal(betaSombre.etapes[4].variable, 'vert-400');
});

test('un mode n’est jamais rapproché par son nom entre deux collections', () => {
  const c = constructeur();
  c.collection('a', 'A', ['Dark', 'Light']);
  c.collection('b', 'B', ['Light', 'Dark']);
  c.variable('x', 'a', 'x', 'FLOAT', { Dark: alias('y'), Light: alias('y') });
  c.variable('y', 'b', 'y', 'FLOAT', { Light: nombre(1), Dark: nombre(2) });
  const index = indexer(c.releve());
  // Le contexte choisit Dark pour A seulement : B garde son défaut, Light.
  const resultat = resoudre(index, 'x', { a: 'a:Dark' });
  assert.deepEqual(valeur(resultat), { nature: 'nombre', nombre: 1 });
  // Un mode d'une autre collection, placé sous la mauvaise famille, est ignoré.
  assert.equal(resoudre(index, 'x', { b: 'a:Light' }).etapes[1].origine, 'defaut');
});

test('un cycle actif dans un seul mode : l’autre mode se résout', () => {
  const c = constructeur();
  c.collection('x', 'X', ['Un', 'Deux']);
  c.variable('a', 'x', 'a', 'FLOAT', { Un: alias('b'), Deux: alias('b') });
  c.variable('b', 'x', 'b', 'FLOAT', { Un: alias('a'), Deux: nombre(3) });
  const index = indexer(c.releve());
  const un = resoudre(index, 'a', { x: 'x:Un' });
  assert.equal(un.statut, 'cycle');
  if (un.statut === 'cycle') assert.equal(un.debut, 0);
  assert.deepEqual(valeur(resoudre(index, 'a', { x: 'x:Deux' })), { nature: 'nombre', nombre: 3 });
});

test('deux branches qui atteignent la même primitive ne forment pas un cycle', () => {
  const index = indexer(projetLibre());
  const resolveur = creerResolveur(index);
  const fond = resolveur.resoudre('carte-fond', {});
  const entete = resolveur.resoudre('entete-fond', {});
  assert.equal(fond.statut, 'resolu');
  assert.equal(entete.statut, 'resolu');
  assert.equal(fond.etapes[fond.etapes.length - 1].variable, entete.etapes[entete.etapes.length - 1].variable);
});

test('une cible inaccessible garde le préfixe connu, sans valeur', () => {
  const index = indexer(projetLibre());
  const resultat = resoudre(index, 'legacy', {});
  assert.equal(resultat.statut, 'inaccessible');
  if (resultat.statut === 'inaccessible') assert.equal(resultat.cible, 'distante-absente');
  assert.equal(resultat.etapes.length, 1);
  assert.equal(index.manquees.get('distante-absente')?.issue, 'introuvable');
});

test('zéro, faux, chaîne vide et alpha se résolvent sans être omis', () => {
  const index = indexer(projetLibre());
  assert.deepEqual(valeur(resoudre(index, 'zero', {})), { nature: 'nombre', nombre: 0 });
  assert.deepEqual(valeur(resoudre(index, 'visible', {})), { nature: 'booleen', booleen: false });
  assert.deepEqual(valeur(resoudre(index, 'libelle', {})), { nature: 'texte', texte: '' });
  const voile = valeur(resoudre(index, 'voile', { couleurs: 'couleurs:Jour' }));
  assert.equal(voile?.nature === 'couleur' && voile.couleur.a, 0.4);
});

test('un mode sans valeur rend « mode absent » avec la variable et le mode', () => {
  const c = constructeur();
  c.collection('x', 'X', ['Un', 'Deux']);
  c.variable('a', 'x', 'a', 'FLOAT', { Un: nombre(1) });
  const resultat = resoudre(indexer(c.releve()), 'a', { x: 'x:Deux' });
  assert.equal(resultat.statut, 'mode-absent');
  if (resultat.statut === 'mode-absent') assert.deepEqual([resultat.variable, resultat.mode], ['a', 'x:Deux']);
});

test('un alias vers un autre type, ou une valeur du mauvais type, est incompatible sans coercition', () => {
  const c = constructeur();
  c.collection('x', 'X', ['M']);
  c.variable('nombre', 'x', 'nombre', 'FLOAT', { M: alias('texte') });
  c.variable('texte', 'x', 'texte', 'STRING', { M: texte('12') });
  c.variable('couleur-fausse', 'x', 'couleur', 'COLOR', { M: nombre(1) });
  const index = indexer(c.releve());
  const premier = resoudre(index, 'nombre', {});
  assert.equal(premier.statut, 'type-incompatible');
  if (premier.statut === 'type-incompatible') assert.deepEqual([premier.variable, premier.attendu, premier.obtenu], ['texte', 'FLOAT', 'STRING']);
  assert.equal(resoudre(index, 'couleur-fausse', {}).statut, 'type-incompatible');
});

test('une valeur non prise en charge garde sa source, sans valeur terminale', () => {
  const c = constructeur();
  c.collection('x', 'X', ['M']);
  c.variable('expr', 'x', 'expr', 'FLOAT', { M: { nature: 'non-prise-en-charge', brut: '{"expressionFunction":"ADDITION"}' } });
  const resultat = resoudre(indexer(c.releve()), 'expr', {});
  assert.equal(resultat.statut, 'non-pris-en-charge');
  assert.equal(resultat.etapes[0].source.nature, 'non-prise-en-charge');
});

test(`une chaîne plus longue que ${BORNE_DES_ETAPES} étapes est interrompue, pas cyclique`, () => {
  const c = constructeur();
  c.collection('x', 'X', ['M']);
  const longueur = BORNE_DES_ETAPES + 5;
  for (let rang = 0; rang < longueur; rang += 1) {
    c.variable(`v${rang}`, 'x', `v${rang}`, 'FLOAT', { M: rang === longueur - 1 ? nombre(1) : alias(`v${rang + 1}`) });
  }
  const resultat = resoudre(indexer(c.releve()), 'v0', {});
  assert.equal(resultat.statut, 'interrompu');
  assert.equal(resultat.etapes.length, BORNE_DES_ETAPES);
});

test('une collection étendue lit sa surcharge, puis le mode parent de sa base', () => {
  const c = constructeur();
  c.collection('base', 'Base', ['Light', 'Dark']);
  c.collection('ext', 'Marque B', ['Light B', 'Dark B'], {
    extension: { parent: 'base', racine: 'base', surcharges: { fond: { 'ext:Light B': couleur('#00FF00') } } },
    parents: { 'Light B': 'base:Light', 'Dark B': 'base:Dark' },
  });
  c.variable('fond', 'base', 'fond', 'COLOR', { Light: couleur('#FFFFFF'), Dark: couleur('#000000') });
  const index = indexer(c.releve());
  const surcharge = resoudre(index, 'fond', { base: 'ext:Light B' });
  assert.equal(surcharge.etapes[0].surcharge, 'ext');
  assert.deepEqual(valeur(surcharge), couleur('#00FF00'));
  const heritee = resoudre(index, 'fond', { base: 'ext:Dark B' });
  assert.equal(heritee.etapes[0].surcharge, undefined);
  assert.deepEqual(valeur(heritee), couleur('#000000'));
  assert.deepEqual(index.collections.get('ext')!.variables, ['fond']);
});

test('le contexte d’une colonne remplace le mode de sa famille et garde les autres', () => {
  const index = indexer(cinqCollections());
  const contexte = contexteDeColonne(index, { marque: 'marque:Beta' }, 'theme:Light');
  assert.deepEqual(contexte, { marque: 'marque:Beta', theme: 'theme:Light' });
});

test('le résolveur mémorise par contexte, quel que soit l’ordre des clés', () => {
  const index = indexer(cinqCollections());
  const resolveur = creerResolveur(index);
  const premier = resolveur.resoudre('bouton-fond', { theme: 'theme:Light', marque: 'marque:Beta' });
  const second = resolveur.resoudre('bouton-fond', { marque: 'marque:Beta', theme: 'theme:Light' });
  assert.equal(premier, second);
  assert.equal(resolveur.taille(), 1);
});

test('les références inverses se lisent par mode, directes puis transitives', () => {
  const index = indexer(cinqCollections());
  assert.deepEqual(dependantsDirects(index, 'vert-500'), ['marque-500-clair']);
  assert.deepEqual(dependantsDirects(index, 'vert-500', new Set(['marque:Alpha'])), []);
  assert.deepEqual(dependantsTransitifs(index, 'rouge-500').map((entree) => [entree.id, entree.distance]), [
    ['marque-500-clair', 1],
    ['theme-primary', 2],
    ['usage-surface', 3],
    ['bouton-fond', 4],
  ]);
});

/**
 * La mémoire des champs d'un nœud dans la portée d'analyse : `name`, `layoutMode` et `boundVariables` que plusieurs
 * lecteurs relisent sur le même nœud ne coûtent qu'un accès natif. Hors portée, chaque lecture passe ; une lecture
 * qui lève lève toujours, et ne se mémorise pas.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { getBinding } from '../src/composant/contract/nodeBindings';
import { isGridAutoLayout, isLinearAutoLayout } from '../src/composant/contract/flexLayout';
import { champDuNoeud, dansUnePorteeDAnalyse, etatDuChamp } from '../src/composant/contract/porteeDAnalyse';
import { isIconLayer } from '../src/composant/contract/slotNames';

const ALIAS = { type: 'VARIABLE_ALIAS', id: 'VariableID:1:2' };

/** Un nœud dont chaque accès aux champs listés se compte, et qui rend une copie neuve de `boundVariables` comme Figma. */
function noeudCompte(id: string | undefined, champs: Record<string, () => unknown>): { noeud: SceneNode; lectures: Record<string, number> } {
  const lectures: Record<string, number> = {};
  const noeud: Record<string, unknown> = { ...(id === undefined ? {} : { id }), type: 'FRAME' };
  for (const [champ, lire] of Object.entries(champs)) {
    lectures[champ] = 0;
    Object.defineProperty(noeud, champ, { enumerable: true, get() { lectures[champ] += 1; return lire(); } });
  }
  return { noeud: noeud as unknown as SceneNode, lectures };
}

const lecteurs = (noeud: SceneNode) => {
  isIconLayer(noeud, new Set(['icon']));
  isIconLayer(noeud, new Set(['icon']));
  isLinearAutoLayout(noeud);
  isGridAutoLayout(noeud);
  getBinding(noeud, 'itemSpacing');
  getBinding(noeud, 'paddingLeft');
};

const champs = () => ({
  name: () => 'icon',
  layoutMode: () => 'HORIZONTAL',
  boundVariables: () => ({ itemSpacing: ALIAS }),
});

test('dans une portée, plusieurs lecteurs lisent name, layoutMode et boundVariables une seule fois par nœud', async () => {
  const { noeud, lectures } = noeudCompte('1:1', champs());
  await dansUnePorteeDAnalyse({}, async () => {
    lecteurs(noeud);
    assert.deepEqual(getBinding(noeud, 'itemSpacing'), ALIAS);
    assert.equal(isLinearAutoLayout(noeud), true);
    assert.equal(isGridAutoLayout(noeud), false);
  });
  assert.deepEqual(lectures, { name: 1, layoutMode: 1, boundVariables: 1 });
});

test('deux nœuds d’identifiants différents ne partagent rien', async () => {
  const premier = noeudCompte('1:1', champs());
  const second = noeudCompte('1:2', { ...champs(), name: () => 'autre' });
  await dansUnePorteeDAnalyse({}, async () => {
    assert.equal(champDuNoeud(premier.noeud, 'name'), 'icon');
    assert.equal(champDuNoeud(second.noeud, 'name'), 'autre');
    assert.equal(champDuNoeud(premier.noeud, 'name'), 'icon');
  });
  assert.equal(premier.lectures.name, 1);
  assert.equal(second.lectures.name, 1);
});

test('la mémoire garde les lectures des champs absents et ne les relit pas', async () => {
  const { noeud, lectures } = noeudCompte('1:1', { layoutWrap: () => undefined });
  await dansUnePorteeDAnalyse({}, async () => {
    assert.deepEqual(etatDuChamp(noeud, 'layoutWrap'), { etat: 'refuse', raison: 'absent' });
    assert.deepEqual(etatDuChamp(noeud, 'layoutWrap'), { etat: 'refuse', raison: 'absent' });
  });
  assert.equal(lectures.layoutWrap, 1);
});

test('hors portée, chaque lecteur lit le nœud et rend la valeur de Figma', () => {
  const { noeud, lectures } = noeudCompte('1:1', champs());
  lecteurs(noeud);
  assert.deepEqual(lectures, { name: 2, layoutMode: 2, boundVariables: 2 });
  assert.equal(isLinearAutoLayout(noeud), true);
});

test('un nœud sans identifiant se lit à chaque fois, même dans une portée', async () => {
  const { noeud, lectures } = noeudCompte(undefined, champs());
  await dansUnePorteeDAnalyse({}, async () => {
    champDuNoeud(noeud, 'name');
    champDuNoeud(noeud, 'name');
  });
  assert.equal(lectures.name, 2);
});

test('une lecture qui lève lève à chaque appel, dans la portée comme hors portée, et ne se mémorise pas', async () => {
  let essais = 0;
  const { noeud, lectures } = noeudCompte('1:1', {
    boundVariables: () => { essais += 1; if (essais < 3) throw new Error('nœud supprimé'); return { itemSpacing: ALIAS }; },
  });
  await dansUnePorteeDAnalyse({}, async () => {
    assert.throws(() => getBinding(noeud, 'itemSpacing'), /nœud supprimé/);
    assert.throws(() => getBinding(noeud, 'itemSpacing'), /nœud supprimé/);
    assert.deepEqual(getBinding(noeud, 'itemSpacing'), ALIAS);
    assert.deepEqual(getBinding(noeud, 'itemSpacing'), ALIAS);
  });
  assert.equal(lectures.boundVariables, 3);
  const { noeud: casse } = noeudCompte('1:2', { layoutMode: () => { throw new Error('refusé'); } });
  await dansUnePorteeDAnalyse({}, async () => {
    for (let rang = 0; rang < 2; rang += 1) {
      assert.deepEqual(etatDuChamp(casse, 'layoutMode'), { etat: 'refuse', raison: 'leve', message: 'refusé' });
    }
    assert.throws(() => isLinearAutoLayout(casse), /refusé/);
  });
});

test('une portée refusée, ouverte pendant une autre, ne mémorise rien', async () => {
  const { noeud, lectures } = noeudCompte('1:1', champs());
  await dansUnePorteeDAnalyse({}, async () => {
    await dansUnePorteeDAnalyse({}, async () => {
      champDuNoeud(noeud, 'name');
      champDuNoeud(noeud, 'name');
    });
  });
  assert.equal(lectures.name, 2);
});

test('la mémoire s’oublie avec la portée', async () => {
  const { noeud, lectures } = noeudCompte('1:1', champs());
  await dansUnePorteeDAnalyse({}, async () => { champDuNoeud(noeud, 'name'); });
  await dansUnePorteeDAnalyse({}, async () => { champDuNoeud(noeud, 'name'); });
  assert.equal(lectures.name, 2);
});

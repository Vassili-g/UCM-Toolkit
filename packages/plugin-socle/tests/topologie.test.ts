/** La topologie du jeu et l'inventaire de péremption : mêmes identifiants qu'avant, trous visibles, lectures bornées. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { doitEtreRelue } from '../src/composant/analyse/faits';
import { avecLesPagesNonEcoutees, inventaireDePeremption, lireLaTopologieDuJeu, type NoeudALire } from '../src/composant/analyse/topologie';

interface Double extends NoeudALire {
  readonly lectures: string[];
}

/** Un nœud qui compte les champs lus ; `children` et `findAll` peuvent lever ou manquer. */
function noeud(id: string, type: string, options: { enfants?: readonly NoeudALire[] | 'leve' | 'absent'; tous?: readonly NoeudALire[] | 'leve' | 'absent' } = {}): Double {
  const lectures: string[] = [];
  const { enfants = [], tous = [] } = options;
  const base: Record<string, unknown> = { lectures };
  Object.defineProperties(base, {
    id: { get: () => { lectures.push('id'); return id; } },
    type: { get: () => { lectures.push('type'); return type; } },
    name: { get: () => { lectures.push('name'); return `nom-${id}`; } },
    children: {
      get: () => {
        lectures.push('children');
        if (enfants === 'leve') throw new Error('nœud supprimé');
        return enfants === 'absent' ? undefined : enfants;
      },
    },
  });
  if (tous !== 'absent') {
    base.findAll = () => {
      lectures.push('findAll');
      if (tous === 'leve') throw new Error('findAll refusé');
      return tous;
    };
  }
  return base as unknown as Double;
}

/** L'ensemble que la surveillance construisait avant la topologie : le jeu, ses enfants, puis `findAll`. */
const avant = (jeu: { id: string; children?: readonly { id: string }[]; findAll?: (filtre: () => boolean) => readonly { id: string }[] }) => ({
  noeuds: [jeu.id, ...(jeu.children ?? []).map((enfant) => enfant.id), ...(jeu.findAll?.(() => true) ?? []).map((enfant) => enfant.id)],
  admis: [jeu.id, ...(jeu.children ?? []).map((enfant) => enfant.id)],
});

function unJeu() {
  const interne = noeud('interne', 'RECTANGLE');
  const dansInstance = noeud('dans-instance', 'TEXT');
  const instance = noeud('instance', 'INSTANCE', { enfants: [dansInstance] });
  const repos = noeud('repos', 'COMPONENT', { enfants: [interne, instance] });
  const survol = noeud('survol', 'COMPONENT', { enfants: [] });
  const tous = [repos, interne, instance, dansInstance, survol];
  return { jeu: noeud('jeu', 'COMPONENT_SET', { enfants: [repos, survol], tous }), repos, survol, interne, instance, dansInstance };
}

test('un jeu complet donne les mêmes identifiants surveillés qu’avant, instances descendues comprises', () => {
  const { jeu } = unJeu();
  const inventaire = inventaireDePeremption(lireLaTopologieDuJeu(jeu));
  assert.deepEqual({ noeuds: inventaire.noeuds, admis: inventaire.admis }, avant(jeu));
  assert.deepEqual(inventaire.noeuds, ['jeu', 'repos', 'survol', 'repos', 'interne', 'instance', 'dans-instance', 'survol']);
  assert.deepEqual(inventaire.couverture, { instances: 'descendues', complete: true });
  assert.equal(doitEtreRelue(inventaire.couverture), false);
});

test('un composant seul garde ses calques admis, et son instance est une frontière', () => {
  const instance = noeud('instance', 'INSTANCE');
  const calque = noeud('calque', 'FRAME');
  const jeu = noeud('seul', 'COMPONENT', { enfants: [calque, instance], tous: [calque, instance] });
  const lue = lireLaTopologieDuJeu(jeu);
  assert.deepEqual(inventaireDePeremption(lue).admis, avant(jeu).admis);
  assert.deepEqual(['calque', 'instance'].map((id) => [lue.topologie[id].frontiere, lue.topologie[id].parent, lue.topologie[id].rang]), [['ordinaire', 'seul', 0], ['instance', 'seul', 1]]);
});

test('la topologie du jeu de variants porte la racine, les variants et leur rang', () => {
  const { jeu } = unJeu();
  const lue = lireLaTopologieDuJeu(jeu);
  assert.deepEqual(lue.sommets, ['jeu']);
  assert.deepEqual(lue.topologie.jeu, {
    id: 'jeu', type: 'COMPONENT_SET', nom: 'nom-jeu', parent: null, rang: null,
    enfants: { etat: 'acquis', valeur: ['repos', 'survol'] }, frontiere: 'racine', sousUneInstance: false,
  });
  assert.deepEqual(lue.topologie.survol, {
    id: 'survol', type: 'COMPONENT', nom: 'nom-survol', parent: 'jeu', rang: 1,
    enfants: { etat: 'non-demande' }, frontiere: 'racine', sousUneInstance: false,
  });
  assert.deepEqual(Object.keys(lue.topologie), ['repos', 'survol', 'jeu'], 'les descendants plus profonds n’ont pas d’entrée');
});

test('les descendants au-delà des enfants directs ne se lisent que par leur identifiant', () => {
  const { jeu, interne, instance, dansInstance } = unJeu();
  lireLaTopologieDuJeu(jeu);
  assert.deepEqual([interne.lectures, instance.lectures, dansInstance.lectures], [['id'], ['id'], ['id']]);
});

test('un children qui lève est un trou, et les descendants de findAll restent surveillés', () => {
  const dessous = noeud('dessous', 'FRAME');
  const jeu = noeud('jeu', 'COMPONENT_SET', { enfants: 'leve', tous: [dessous] });
  const inventaire = inventaireDePeremption(lireLaTopologieDuJeu(jeu));
  assert.deepEqual(inventaire.couverture, { instances: 'descendues', complete: false, trous: [{ type: 'enfants', noeud: 'jeu', raison: 'leve', message: 'nœud supprimé' }] });
  assert.equal(doitEtreRelue(inventaire.couverture), true);
  assert.deepEqual(inventaire.noeuds, ['jeu', 'dessous']);
  assert.deepEqual(inventaire.admis, ['jeu']);
  assert.deepEqual(lireLaTopologieDuJeu(jeu).topologie.jeu.enfants, { etat: 'refuse', raison: 'leve', message: 'nœud supprimé' });
});

test('un findAll qui lève laisse le jeu et ses variants surveillés, avec un trou', () => {
  const repos = noeud('repos', 'COMPONENT');
  const jeu = noeud('jeu', 'COMPONENT_SET', { enfants: [repos], tous: 'leve' });
  const inventaire = inventaireDePeremption(lireLaTopologieDuJeu(jeu));
  assert.deepEqual(inventaire.noeuds, ['jeu', 'repos']);
  assert.deepEqual(inventaire.couverture, { instances: 'descendues', complete: false, trous: [{ type: 'enfants', noeud: 'jeu', raison: 'leve', message: 'findAll refusé' }] });
});

test('un children et un findAll qui lèvent ne donnent qu’un trou pour le jeu', () => {
  const jeu = noeud('jeu', 'COMPONENT_SET', { enfants: 'leve', tous: 'leve' });
  const { couverture } = inventaireDePeremption(lireLaTopologieDuJeu(jeu));
  assert.deepEqual(couverture.complete ? [] : couverture.trous.map((trou) => trou.type), ['enfants']);
});

test('un nœud sans enfants ni findAll est complet ; sans findAll mais avec enfants, il a un trou', () => {
  const feuille = noeud('feuille', 'COMPONENT', { enfants: 'absent', tous: 'absent' });
  assert.deepEqual(inventaireDePeremption(lireLaTopologieDuJeu(feuille)).couverture, { instances: 'descendues', complete: true });
  const sansListe = noeud('jeu', 'COMPONENT_SET', { enfants: [noeud('repos', 'COMPONENT')], tous: 'absent' });
  assert.deepEqual(inventaireDePeremption(lireLaTopologieDuJeu(sansListe)).couverture, { instances: 'descendues', complete: false, trous: [{ type: 'enfants', noeud: 'jeu', raison: 'absent' }] });
});

test('une page non écoutée s’ajoute aux trous, et une liste vide laisse la couverture telle quelle', () => {
  const complete = { instances: 'descendues', complete: true } as const;
  assert.equal(avecLesPagesNonEcoutees(complete, []), complete);
  const une = avecLesPagesNonEcoutees(complete, ['0:2']);
  assert.deepEqual(une, { instances: 'descendues', complete: false, trous: [{ type: 'page-non-ecoutee', page: '0:2' }] });
  assert.equal(doitEtreRelue(une), true);
  const deux = avecLesPagesNonEcoutees(une, ['0:3']);
  assert.deepEqual(deux.complete ? [] : deux.trous.map((trou) => trou.type === 'page-non-ecoutee' ? trou.page : trou.noeud), ['0:2', '0:3']);
  const inconnue = avecLesPagesNonEcoutees({ instances: 'descendues', complete: false, trous: [] }, ['0:2']);
  assert.equal(inconnue.complete, false);
});

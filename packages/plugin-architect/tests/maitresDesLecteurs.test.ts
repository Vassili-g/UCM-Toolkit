/**
 * Les maîtres d'un même jeu d'instances, lus par le relevé (manquée `instanceDe`, nom du composant publié) et par le
 * moteur (`maitreDe`, nom du propriétaire) au travers de la même acquisition : frontière, instance imbriquée, maître
 * introuvable, maître qui lève, maître distant. Les attendus sont ceux des lecteurs d'avant la mémoire commune ; seul
 * le nombre de lectures change, et il ne monte pas.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { creerMemoireDeRessources } from 'ucm-plugin-socle/src/composant/analyse/ressources';
import { ownerComponentName } from 'ucm-plugin-socle/src/composant/contract/composedComponents';
import { dansUnePorteeDAnalyse, maitreDe } from 'ucm-plugin-socle/src/composant/contract/porteeDAnalyse';
import { lireLeReleve } from '../src/releveDuComposant';
import { atelierDeCalques, portDeTest } from './figmaDeTest';
import type { NoeudLu } from '../src/consommateurs';

const boite = { x: 0, y: 0, width: 10, height: 10 };

function monterLesInstances() {
  const a = atelierDeCalques();
  const lectures = { appels: new Map<string, number>(), cles: new Map<string, number>() };
  const noter = (table: Map<string, number>, cle: string) => table.set(cle, (table.get(cle) ?? 0) + 1);
  const maitre = (id: string, nom: string, cle: string, remote: boolean): NoeudLu =>
    a.calque(id, 'COMPONENT', { name: nom, remote, get key() { noter(lectures.cles, id); return cle; } });
  const taille = maitre('maitre-m', 'Taille=M', 'cle-m', true);
  a.calque('jeu-icone', 'COMPONENT_SET', { name: 'Icone', key: 'cle-icone', remote: true }, [taille]);
  const autonome = maitre('autonome', 'Badge', 'cle-badge', false);
  const instance = (id: string, lire: () => Promise<NoeudLu | null>, enfants: readonly NoeudLu[] = []) =>
    a.calque(id, 'INSTANCE', {
      absoluteBoundingBox: boite,
      componentPropertyReferences: id === 'pilotee' ? { mainComponent: 'Icone#1:0' } : {},
      getMainComponentAsync: () => { noter(lectures.appels, id); return lire(); },
    }, enfants);
  const sansJeu = a.calque('sans-jeu', 'COMPONENT', { name: 'Seul', get key(): string { throw new Error('clé illisible'); } });
  const dansUnJeu = a.calque('cle-du-jeu-leve', 'COMPONENT', { name: 'Taille=S' });
  a.calque('jeu-leve', 'COMPONENT_SET', { name: 'Fragile', get key(): string { throw new Error('clé du jeu illisible'); } }, [dansUnJeu]);
  const imbriquee = instance('imbriquee', async () => autonome);
  const instances = [
    instance('pilotee', async () => taille, [imbriquee]),
    instance('jumelle', async () => taille),
    instance('badge', async () => autonome),
    instance('orpheline', async () => null),
    instance('qui-leve', async () => { throw new Error('maître illisible'); }),
    instance('cle-leve', async () => sansJeu),
    instance('cle-du-jeu-leve', async () => dansUnJeu),
  ];
  const variant = a.calque('variant', 'COMPONENT', { name: 'Etat=Repos', absoluteBoundingBox: boite, variantProperties: { Etat: 'Repos' } }, instances);
  const jeu = a.calque('jeu', 'COMPONENT_SET', { name: 'Button', key: 'cle-jeu', defaultVariant: variant, componentPropertyDefinitions: {} }, [variant]);
  const variables = portDeTest([], []);
  return { jeu, instances, imbriquee, port: a.port(variables.port), lectures };
}

test('le relevé rend le composant publié du maître et la raison du refus, instance par instance', async () => {
  const { jeu, port, lectures } = monterLesInstances();
  const issue = await lireLeReleve(port, jeu);
  assert.equal(issue.statut, 'lu');
  const { variants, lecture } = (issue as { releve: { variants: Array<{ layers: Array<{ id: string; instanceDe?: unknown }> }>; lecture: { manquees: unknown[] } } }).releve;

  assert.deepEqual(variants[0].layers.filter((layer) => layer.id !== 'variant').map((layer) => [layer.id, layer.instanceDe ?? null]), [
    ['pilotee', { cle: 'cle-icone', nom: 'Icone', distante: true, pilotee: 'Icone#1:0' }],
    ['jumelle', { cle: 'cle-icone', nom: 'Icone', distante: true, pilotee: null }],
    ['badge', { cle: 'cle-badge', nom: 'Badge', distante: false, pilotee: null }],
    ['orpheline', null],
    ['qui-leve', null],
    ['cle-leve', null],
    ['cle-du-jeu-leve', null],
  ]);
  assert.deepEqual(lecture.manquees, [
    { layer: 'orpheline', champ: 'instanceDe', motif: 'composant source introuvable' },
    { layer: 'qui-leve', champ: 'instanceDe', motif: 'maître illisible' },
    { layer: 'cle-leve', champ: 'instanceDe', motif: 'clé illisible' },
    { layer: 'cle-du-jeu-leve', champ: 'instanceDe', motif: 'clé du jeu illisible' },
  ]);
  assert.equal(lectures.appels.get('imbriquee') ?? 0, 0, 'le relevé ne descend pas dans une instance');
  assert.deepEqual([...lectures.appels.entries()], [['pilotee', 1], ['jumelle', 1], ['badge', 1], ['orpheline', 1], ['qui-leve', 1], ['cle-leve', 1], ['cle-du-jeu-leve', 1]]);
  assert.equal(lectures.cles.get('maitre-m'), 1, 'deux instances du même variant ne lisent sa clé qu’une fois');
});

test('le moteur lit les mêmes maîtres : propriétaire nommé ou null, et un maître partagé ne se copie qu’une fois', async () => {
  const { instances, imbriquee, lectures } = monterLesInstances();
  const noms = await dansUnePorteeDAnalyse({}, async () => {
    const lus: Array<[string, string | null]> = [];
    for (const instance of [...instances, imbriquee, instances[1]]) {
      const main = await maitreDe(instance as never);
      lus.push([(instance as { id: string }).id, main ? ownerComponentName(main) : null]);
    }
    return lus;
  });
  assert.deepEqual(noms, [
    ['pilotee', 'Icone'], ['jumelle', 'Icone'], ['badge', 'Badge'], ['orpheline', null], ['qui-leve', null], ['cle-leve', 'Seul'], ['cle-du-jeu-leve', 'Fragile'], ['imbriquee', 'Badge'], ['jumelle', 'Icone'],
  ]);
  assert.equal(lectures.appels.get('jumelle'), 1, 'une instance relue dans la portée ne rappelle pas Figma');
});

test('la mémoire copie un maître une seule fois pour toutes ses instances, refus compris', async () => {
  const { instances, lectures } = monterLesInstances();
  const memoire = creerMemoireDeRessources({ lectures: () => ({ getVariableByIdAsync: async () => null, getVariableCollectionByIdAsync: async () => null }) });
  const copies = [];
  for (const instance of [instances[0], instances[1], instances[3], instances[4]]) {
    const lu = await memoire.maitre(instance as never);
    copies.push(lu.etat === 'lu' ? (await memoire.faitDuMaitre((instance as { id: string }).id, lu.natif)).etat : lu);
  }
  assert.deepEqual(copies.map((etat) => etat.etat), ['acquis', 'acquis', 'refuse', 'refuse']);
  assert.deepEqual(copies[0], copies[1], 'deux instances du même maître rendent la même copie');
  assert.equal(lectures.cles.get('maitre-m'), 1, 'la clé du maître n’est lue qu’une fois');
  assert.deepEqual(copies.slice(2), [{ etat: 'refuse', raison: 'introuvable' }, { etat: 'refuse', raison: 'leve', message: 'maître illisible' }]);
});

test('un maître de wrapper de dimensions posé par plusieurs instances ne fait lister les variants de son jeu qu’une fois', async () => {
  const a = atelierDeCalques();
  const lectures = { enfants: 0 };
  const alias = { type: 'VARIABLE_ALIAS', id: 'rayon' };
  const moyen = a.calque('wrapper-m', 'COMPONENT', { name: 'Size=M', key: 'cle-wrapper-m', remote: false, absoluteBoundingBox: boite });
  const jeuDuWrapper = a.calque('jeu-wrapper', 'COMPONENT_SET', {
    name: '.sizeWrapper', key: 'cle-jeu-wrapper',
    componentPropertyDefinitions: { Size: { type: 'VARIANT', defaultValue: 'M', variantOptions: ['M'] } },
    get children(): NoeudLu[] { lectures.enfants += 1; return [moyen]; },
  }, [moyen]);
  const instances = ['un', 'deux', 'trois'].map((id) => a.calque(id, 'INSTANCE', { absoluteBoundingBox: boite, boundVariables: { cornerRadius: alias }, getMainComponentAsync: async () => moyen }));
  const variants = ['Repos', 'Survol'].map((etat, rang) => a.calque(`variant-${etat}`, 'COMPONENT', { name: `Etat=${etat}`, absoluteBoundingBox: boite }, rang === 0 ? instances : []));
  const jeu = a.calque('jeu', 'COMPONENT_SET', { name: 'Button', key: 'cle-jeu', defaultVariant: variants[0], componentPropertyDefinitions: {} }, variants);
  const { port } = portDeTest([], []);
  const issue = await lireLeReleve(a.port(port), jeu);
  assert.equal(issue.statut, 'lu');
  if (issue.statut !== 'lu') return;
  assert.equal(issue.releve.wrappers?.length, 1);
  assert.equal(lectures.enfants, 1, 'trois instances du même maître, un seul jeu lu');
});

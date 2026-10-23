/** Les préparations de tokens : identifiant, texte échangé et ses refus, rangement, plan rangé, liaisons du retour, règles reçues. */
import assert from 'node:assert/strict';
import test from 'node:test';

import type { LayerLu, PreparationDesTokens, ReleveDeComposant } from '@ucm-kit/core/controles';

import {
  CLE_DES_PREPARATIONS, COUCHE_DES_COMPOSANTS, COUCHE_DES_COULEURS, COUCHE_DES_TAILLES, identifiantDePreparation, liaisonsDeLaPreparation, lireLeTexte,
  lireLesPreparations, preparationDuPlan, rangerUnePreparation, reglesRecuesDeLaPreparation, retirerUnePreparation, texteDeLaPreparation,
  trouverUnePreparation, type PortDeStockage, type PreparationRangee,
} from '../src/preparations';

function stockage(options: { leve?: boolean } = {}): PortDeStockage & { donnees: Map<string, unknown> } {
  const donnees = new Map<string, unknown>();
  return {
    donnees,
    async getAsync(cle) { if (options.leve) throw new Error('stockage'); return donnees.get(cle); },
    async setAsync(cle, valeur) { if (options.leve) throw new Error('stockage'); donnees.set(cle, valeur); },
  };
}

const preparation = (id = 'prep-1', extras: Partial<PreparationRangee> = {}): PreparationRangee => ({
  id, creeLe: '2026-10-23T10:00:00.000Z',
  source: { fichier: 'Composants', cleDuFichier: 'abc', jeu: { cle: 'jeu-1', nom: 'Alert' } },
  variables: [{ nom: 'components/alert/color/danger/soft/background', type: 'COLOR', cibles: { Light: 'theme/danger/soft/surface/default' }, layers: [{ id: 'l1', variant: 'v1', champ: 'fills', indice: 0 }] }],
  regles: [], ...extras,
});

test('les couches viennent du kit : composant, couleurs, tailles', () => {
  assert.deepEqual([COUCHE_DES_COMPOSANTS, COUCHE_DES_COULEURS, COUCHE_DES_TAILLES], ['components', 'theme', 'layout']);
});

test('l’identifiant est prep-<horodatage>-<aléa> et diffère d’un appel à l’autre', () => {
  assert.match(identifiantDePreparation(), /^prep-[0-9a-z]+-[0-9a-z]{6}$/u);
  assert.notEqual(identifiantDePreparation(1, () => 0.1), identifiantDePreparation(1, () => 0.2));
});

test('le texte échangé se relit tel quel, sans les états', () => {
  const rangee = preparation('prep-1', { etats: { 'components/alert/color/danger/soft/background': 'creee' }, regles: [{ ancien: 'error', nouveau: 'danger', composant: 'alert' }] });
  const texte = texteDeLaPreparation(rangee);
  assert.equal(JSON.parse(texte).format, 'ucm-preparation');
  assert.equal(JSON.parse(texte).version, 1);
  assert.equal('etats' in JSON.parse(texte), false);
  const lue = lireLeTexte(texte);
  assert.ok(lue.lue);
  assert.deepEqual(lue.preparation, preparation('prep-1', { regles: rangee.regles }));
});

test('un texte qui n’est pas du JSON, d’un autre format, d’une version future ou à champ manquant est refusé avec son motif', () => {
  const valide = JSON.parse(texteDeLaPreparation(preparation()));
  assert.deepEqual(lireLeTexte('pas du json'), { lue: false, motif: 'illisible' });
  assert.deepEqual(lireLeTexte(JSON.stringify({ ...valide, format: 'autre' })), { lue: false, motif: 'format' });
  assert.deepEqual(lireLeTexte('[]'), { lue: false, motif: 'format' });
  assert.deepEqual(lireLeTexte(JSON.stringify({ ...valide, version: 2 })), { lue: false, motif: 'future' });
  // Le format est jugé avant la version, la version avant les champs.
  assert.deepEqual(lireLeTexte(JSON.stringify({ format: 'autre', version: 9 })), { lue: false, motif: 'format' });
  assert.deepEqual(lireLeTexte(JSON.stringify({ format: 'ucm-preparation', version: 9 })), { lue: false, motif: 'future' });
  const sansId = { ...valide }; delete sansId.id;
  assert.deepEqual(lireLeTexte(JSON.stringify(sansId)), { lue: false, motif: 'champ-faux', champ: 'id' });
  assert.deepEqual(lireLeTexte(JSON.stringify({ ...valide, variables: [{ ...valide.variables[0], type: 'STRING' }] })), { lue: false, motif: 'champ-faux', champ: 'variables[0].type' });
  assert.deepEqual(lireLeTexte(JSON.stringify({ ...valide, variables: [{ ...valide.variables[0], cibles: {} }] })), { lue: false, motif: 'champ-faux', champ: 'variables[0].cibles' });
  assert.deepEqual(lireLeTexte(JSON.stringify({ ...valide, variables: [{ ...valide.variables[0], layers: [{ id: 'l1' }] }] })), { lue: false, motif: 'champ-faux', champ: 'variables[0].layers[0]' });
  assert.deepEqual(lireLeTexte(JSON.stringify({ ...valide, variables: [{ ...valide.variables[0], nom: 'theme/x' }] })), { lue: false, motif: 'champ-faux', champ: 'variables[0].nom' });
  assert.deepEqual(lireLeTexte(JSON.stringify({ ...valide, source: { ...valide.source, jeu: {} } })), { lue: false, motif: 'champ-faux', champ: 'source.jeu.cle' });
  assert.deepEqual(lireLeTexte(JSON.stringify({ ...valide, regles: [{ ancien: 'a' }] })), { lue: false, motif: 'champ-faux', champ: 'regles[0]' });
});

test('un champ de plus que la forme est ignoré', () => {
  const valide = JSON.parse(texteDeLaPreparation(preparation()));
  const lue = lireLeTexte(JSON.stringify({ ...valide, extra: 1 }));
  assert.ok(lue.lue);
  assert.equal('extra' in lue.preparation, false);
});

test('une préparation se range sous la clé du kit, se retrouve par son id et se retire', async () => {
  const s = stockage();
  assert.equal(await rangerUnePreparation(s, preparation('prep-1')), true);
  assert.equal(await rangerUnePreparation(s, preparation('prep-2', { creeLe: '2026-10-24T10:00:00.000Z' })), true);
  assert.ok(s.donnees.has(CLE_DES_PREPARATIONS));
  assert.deepEqual((await lireLesPreparations(s)).map(({ id }) => id), ['prep-2', 'prep-1']);
  assert.equal((await trouverUnePreparation(s, 'prep-1'))?.id, 'prep-1');
  assert.equal(await retirerUnePreparation(s, 'prep-1'), true);
  assert.equal(await retirerUnePreparation(s, 'prep-1'), false);
  assert.deepEqual((await lireLesPreparations(s)).map(({ id }) => id), ['prep-2']);
});

test('deux fichiers homonymes gardent deux préparations, distinguées par leur id et la clé du fichier', async () => {
  const s = stockage();
  const autre = preparation('prep-2', { source: { fichier: 'Composants', cleDuFichier: 'xyz', jeu: { cle: 'jeu-1', nom: 'Alert' } } });
  await rangerUnePreparation(s, preparation('prep-1'));
  await rangerUnePreparation(s, autre);
  const liste = await lireLesPreparations(s);
  assert.deepEqual(liste.map(({ id, source }) => [id, source.fichier, source.cleDuFichier]).sort(), [['prep-1', 'Composants', 'abc'], ['prep-2', 'Composants', 'xyz']]);
  assert.equal((await trouverUnePreparation(s, 'prep-2'))?.source.cleDuFichier, 'xyz');
});

test('deux préparations d’un même composant restent deux entrées ; ranger la même id remplace, ne double pas', async () => {
  const s = stockage();
  await rangerUnePreparation(s, preparation('prep-1'));
  await rangerUnePreparation(s, preparation('prep-2'));
  await rangerUnePreparation(s, preparation('prep-1', { etats: { 'components/alert/color/danger/soft/background': 'echec' } }));
  const liste = await lireLesPreparations(s);
  assert.equal(liste.length, 2);
  assert.equal(liste.find(({ id }) => id === 'prep-1')?.etats?.['components/alert/color/danger/soft/background'], 'echec');
});

test('un stockage qui lève rend une liste vide ; une écriture refusée rend faux ; une entrée illisible est écartée', async () => {
  const casse = stockage({ leve: true });
  assert.deepEqual(await lireLesPreparations(casse), []);
  assert.equal(await rangerUnePreparation(casse, preparation()), false);
  const abime = stockage();
  abime.donnees.set(CLE_DES_PREPARATIONS, [{ id: 'x' }, 42, preparation('prep-9')]);
  assert.deepEqual((await lireLesPreparations(abime)).map(({ id }) => id), ['prep-9']);
});

test('les états rangés sont relus ; un état inconnu ou d’une variable absente est écarté', async () => {
  const s = stockage();
  s.donnees.set(CLE_DES_PREPARATIONS, [{
    ...preparation(),
    etats: { 'components/alert/color/danger/soft/background': 'creee', 'components/alert/inconnue': 'creee' },
  }, {
    ...preparation('prep-2'),
    etats: { 'components/alert/color/danger/soft/background': 'bizarre' },
  }]);
  const liste = await lireLesPreparations(s);
  assert.deepEqual(liste.find(({ id }) => id === 'prep-1')?.etats, { 'components/alert/color/danger/soft/background': 'creee' });
  assert.deepEqual(liste.find(({ id }) => id === 'prep-2')?.etats, {});
});

// Du plan à la préparation

const source = { fichier: 'Composants', cleDuFichier: null, jeu: { cle: 'jeu-1', nom: 'Alert' } };
const plan = (extras: Partial<PreparationDesTokens> = {}): PreparationDesTokens => ({
  questions: [],
  variables: [{
    nom: 'components/alert/color/danger/soft/background', type: 'COLOR', statut: 'a-creer', attend: [],
    vise: { nom: 'theme/danger/soft/surface/default' }, concerne: [{ variant: 'v1', layer: 'l1', champ: 'fills', indice: 0 }],
  }],
  ...extras,
});

test('un plan sans question devient une préparation qui vise la même cible dans chaque mode de components', () => {
  const rangee = preparationDuPlan(plan(), { id: 'prep-1', creeLe: '2026-10-23T10:00:00.000Z', source, modes: ['Light', 'Dark'] });
  assert.deepEqual(rangee?.variables[0].cibles, { Light: 'theme/danger/soft/surface/default', Dark: 'theme/danger/soft/surface/default' });
  assert.deepEqual(rangee?.variables[0].layers, [{ id: 'l1', variant: 'v1', champ: 'fills', indice: 0 }]);
  assert.equal(rangee?.source.cleDuFichier, null);
});

test('un plan vide, ou qui attend une réponse, ne devient pas une préparation', () => {
  const contexte = { id: 'p', creeLe: '2026-10-23T10:00:00.000Z', source, modes: [] };
  assert.equal(preparationDuPlan(plan({ variables: [] }), contexte), null);
  assert.equal(preparationDuPlan(plan({ questions: [{ id: 'dossier:soft' } as never] }), contexte), null);
  assert.equal(preparationDuPlan(plan({ variables: [{ ...plan().variables[0], vise: null, attend: ['dossier:soft'] }] }), contexte), null);
});

// Le retour au composant

const layer = (id: string, extras: Partial<LayerLu> = {}): LayerLu => ({
  id, nom: id, type: 'FRAME', parent: null, visible: true, opacite: 1, dimensions: { x: 0, y: 0, largeur: 10, hauteur: 10 },
  peintures: [{ champ: 'fills', indice: 0, type: 'SOLID', visible: true, opacite: 1, blendMode: 'NORMAL', couleur: { r: 1, g: 0, b: 0, a: 1 } }],
  liaisons: [], valeursEnDur: [], ...extras,
});
const releve = (layers: LayerLu[] = [layer('l1')]): ReleveDeComposant => ({
  version: 1, jeu: { cle: 'jeu-1', id: 'jeu-1', nom: 'Alert' }, proprietes: [],
  variants: [{ id: 'v1', nom: 'v1', valeurs: { Palette: 'danger' }, modesEffectifs: {}, layers }],
  lecture: { layersLus: 0, layersNonLus: 0, variantsNonLus: [], manquees: [] }, espaceDeCouleur: 'srgb',
});

test('une variable publiée donne une liaison ; une variable pas encore publiée laisse sa ligne sans case', () => {
  const publiee = liaisonsDeLaPreparation(preparation(), releve(), new Map([['components/alert/color/danger/soft/background', 'cle-1']]));
  assert.deepEqual(publiee.corrections.map(({ sorte, cible, apres }) => [sorte, cible.layer, cible.champ, apres]), [['liaison', 'l1', 'fills', { cle: 'cle-1', nom: 'components/alert/color/danger/soft/background' }]]);
  assert.deepEqual(publiee.enAttente, []);
  const attente = liaisonsDeLaPreparation(preparation(), releve(), new Map());
  assert.deepEqual(attente.corrections, []);
  assert.deepEqual(attente.enAttente, [{ variable: 'components/alert/color/danger/soft/background', layer: 'l1', variant: 'v1', champ: 'fills' }]);
});

test('un layer disparu ou un champ déjà lié est écarté, non proposé de nouveau', () => {
  const publiees = new Map([['components/alert/color/danger/soft/background', 'cle-1']]);
  assert.equal(liaisonsDeLaPreparation(preparation(), releve([layer('autre')]), publiees).ecartees, 1);
  const lie = layer('l1', { liaisons: [{ champ: 'fills', indice: 0, variable: 'cle-1' } as never] });
  const rendu = liaisonsDeLaPreparation(preparation(), releve([lie]), publiees);
  assert.deepEqual([rendu.corrections.length, rendu.ecartees], [0, 1]);
});

// Les règles reçues

test('une règle reçue s’illustre par un nom de la préparation qui porte le terme voulu', () => {
  const rangee = preparation('p', { regles: [{ ancien: 'error', nouveau: 'danger', composant: 'alert' }, { ancien: 'x', nouveau: 'x', composant: 'alert' }] });
  assert.deepEqual(reglesRecuesDeLaPreparation(rangee), [{
    ancien: 'error', nouveau: 'danger', composant: 'alert',
    exemple: { ancien: 'components/alert/color/error/soft/background', nouveau: 'components/alert/color/danger/soft/background' },
  }]);
});

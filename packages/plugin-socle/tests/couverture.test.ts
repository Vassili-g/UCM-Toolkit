/** La matrice de couverture des événements et la portée d'un changement reçu : sans couverture démontrée, on relit ou on invalide largement. */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  doitSeRelire, MATRICE_DE_COUVERTURE, porteeDesChangements, porteeDuChangement, relecturesObligatoires,
  type ChangementRecu, type EntreeLue, type NoeudDEvenement, type SuivisDuSujet,
} from '../src/composant/analyse/couverture';
import type { Ressources } from '../src/composant/analyse/faits';

const suivis = (noeuds: readonly string[], maitres: readonly string[] = []): SuivisDuSujet => ({
  noeuds: new Set(noeuds), maitres: new Set(maitres),
});

/** Un nœud et sa chaîne de parents, du plus proche au plus lointain. */
function chaine(id: string, ...parents: string[]): NoeudDEvenement {
  let parent: NoeudDEvenement | null = null;
  for (const ancetre of [...parents].reverse()) parent = { id: ancetre, parent };
  return { id, parent };
}

const ecoutee = { pageEcoutee: true, locale: true };

test('les entrées sans événement se relisent toujours, même sur une page écoutée', () => {
  const sansEvenement: readonly EntreeLue[] = ['liaisons-de-variables', 'variable', 'collection', 'style', 'inventaire', 'library'];
  for (const entree of sansEvenement) assert.equal(doitSeRelire(entree, ecoutee), true, entree);
  for (const entree of ['noeud', 'page', 'regles', 'maitre', 'valeur-heritee'] as const) {
    assert.equal(doitSeRelire(entree, ecoutee), false, entree);
  }
});

test('chaque entrée de la matrice porte un motif de relecture ou une condition', () => {
  for (const [entree, couverture] of Object.entries(MATRICE_DE_COUVERTURE)) {
    if (couverture.suivi === 'relecture') assert.ok(couverture.motif.length > 0, entree);
    else assert.ok(['page-ecoutee', 'locale-et-page-ecoutee'].includes(couverture.condition), entree);
  }
});

test('une page non écoutée et un maître distant se relisent', () => {
  assert.equal(doitSeRelire('noeud', { pageEcoutee: false, locale: true }), true);
  assert.equal(doitSeRelire('maitre', { pageEcoutee: true, locale: false }), true);
  assert.equal(doitSeRelire('valeur-heritee', { pageEcoutee: true, locale: false }), true);
  assert.equal(doitSeRelire('page', { pageEcoutee: true, locale: false }), false);
});

test('un identifiant suivi touche le sujet, quel que soit le type du changement', () => {
  const sujet = suivis(['jeu', 'v1']);
  for (const type of ['CREATE', 'DELETE', 'PROPERTY_CHANGE', 'FUTUR']) {
    assert.deepEqual(porteeDuChangement({ type, id: 'v1' }, sujet), { portee: 'sujet' }, type);
  }
});

test('un calque créé sous un variant touche le sujet par ses ancêtres', () => {
  const sujet = suivis(['jeu', 'v1']);
  const cree: ChangementRecu = { type: 'CREATE', id: 'nouveau', node: chaine('nouveau', 'cadre', 'v1', 'jeu', 'page') };
  assert.deepEqual(porteeDuChangement(cree, sujet), { portee: 'sujet' });
  const deplace: ChangementRecu = { type: 'PROPERTY_CHANGE', id: 'x', properties: ['parent'], node: chaine('x', 'v1') };
  assert.deepEqual(porteeDuChangement(deplace, sujet), { portee: 'sujet' });
});

test('un changement sous le maître d\'une instance du sujet touche le sujet', () => {
  const sujet = suivis(['jeu', 'v1'], ['icone']);
  const peint: ChangementRecu = { type: 'PROPERTY_CHANGE', id: 'trace', properties: ['fills'], node: chaine('trace', 'icone', 'page') };
  assert.deepEqual(porteeDuChangement(peint, sujet), { portee: 'sujet' });
  assert.deepEqual(porteeDuChangement({ type: 'PROPERTY_CHANGE', id: 'icone', properties: ['fills'] }, sujet), { portee: 'sujet' });
});

test('un changement ailleurs sur la page reste hors du sujet', () => {
  const sujet = suivis(['jeu', 'v1']);
  const ailleurs: ChangementRecu = { type: 'PROPERTY_CHANGE', id: 'autre', properties: ['fills'], node: chaine('autre', 'cadre', 'page') };
  assert.deepEqual(porteeDuChangement(ailleurs, sujet), { portee: 'hors-sujet' });
  assert.deepEqual(porteeDuChangement({ type: 'DELETE', id: 'autre', node: { id: 'autre', removed: true } }, sujet), { portee: 'hors-sujet' });
});

test('portée inconnue : type futur, nœud supprimé, ancêtres illisibles, suppression sous un maître possible', () => {
  const sujet = suivis(['jeu'], ['icone']);
  assert.deepEqual(porteeDuChangement({ type: 'REORDER', id: 'x' }, sujet), { portee: 'inconnue', raison: 'type-inconnu' });
  assert.deepEqual(
    porteeDuChangement({ type: 'PROPERTY_CHANGE', id: 'x', properties: ['fills'], node: { id: 'x', removed: true } }, sujet),
    { portee: 'inconnue', raison: 'noeud-supprime' },
  );
  const illisible = { id: 'x', get parent(): NoeudDEvenement { throw new Error('nœud supprimé'); } };
  assert.deepEqual(porteeDuChangement({ type: 'CREATE', id: 'x', node: illisible }, sujet), { portee: 'inconnue', raison: 'ancetres-illisibles' });
  assert.deepEqual(porteeDuChangement({ type: 'CREATE', id: 'x' }, sujet), { portee: 'inconnue', raison: 'ancetres-illisibles' });
  const sousUnSupprime: NoeudDEvenement = { id: 'x', parent: { id: 'cadre', removed: true, parent: null } };
  assert.deepEqual(porteeDuChangement({ type: 'CREATE', id: 'x', node: sousUnSupprime }, sujet), { portee: 'inconnue', raison: 'ancetres-illisibles' });
  assert.deepEqual(
    porteeDuChangement({ type: 'DELETE', id: 'y', node: { id: 'y', removed: true } }, sujet),
    { portee: 'inconnue', raison: 'parent-de-suppression-inconnu' },
  );
});

test('une série touche le sujet dès un changement, sinon garde la première portée inconnue', () => {
  const sujet = suivis(['jeu']);
  const hors: ChangementRecu = { type: 'PROPERTY_CHANGE', id: 'a', node: chaine('a', 'page') };
  const futur: ChangementRecu = { type: 'FUTUR', id: 'b' };
  const supprime: ChangementRecu = { type: 'CREATE', id: 'c', node: { id: 'c', removed: true } };
  assert.deepEqual(porteeDesChangements([hors, futur, supprime], sujet), { portee: 'inconnue', raison: 'type-inconnu' });
  assert.deepEqual(porteeDesChangements([futur, { type: 'CREATE', id: 'jeu' }], sujet), { portee: 'sujet' });
  assert.deepEqual(porteeDesChangements([hors], sujet), { portee: 'hors-sujet' });
  assert.deepEqual(porteeDesChangements([], sujet), { portee: 'hors-sujet' });
});

/** Une ressource acquise, avec son origine. */
function fait<V>(id: string, valeur: V, origine: 'locale' | 'distante' | 'library' | 'inconnue' = 'locale') {
  return { id, provenance: { appel: { appel: 'propriete' as const, nom: id }, origine }, etat: { etat: 'acquis' as const, valeur } };
}

const maitre = (id: string, remote: boolean) => ({ id, key: `cle-${id}`, nom: id, remote, jeu: null });

function ressources(): Ressources {
  return {
    noeudsParIdentifiant: {},
    variables: { 'v:1': fait('v:1', {}, 'distante') },
    collections: { 'c:1': fait('c:1', {}) },
    styles: { 's:1': fait('s:1', {}) },
    maitres: {
      local: fait('local', maitre('local', false)),
      ailleurs: fait('ailleurs', maitre('ailleurs', false)),
      distant: fait('distant', maitre('distant', true), 'distante'),
      refuse: { id: 'refuse', provenance: { appel: { appel: 'propriete', nom: 'refuse' }, origine: 'inconnue' }, etat: { etat: 'refuse', raison: 'leve' } },
    },
    variablesDeLibrary: { 'cle-collection': fait('cle-collection', []) },
    inventaires: { variablesLocales: { provenance: { appel: { appel: 'propriete', nom: 'x' }, origine: 'locale' }, etat: { etat: 'acquis', valeur: [] } } },
  };
}

test('une ressource externe modifiée sans événement se relit : variables, styles, libraries, maîtres distants ou hors page', () => {
  const pages = { ecoutees: new Set(['page-sujet']), pageDe: (id: string) => (id === 'local' ? 'page-sujet' : id === 'ailleurs' ? 'page-autre' : null) };
  const relectures = relecturesObligatoires(ressources(), pages);
  assert.deepEqual(relectures, {
    variables: ['v:1'],
    collections: ['c:1'],
    styles: ['s:1'],
    maitres: ['ailleurs', 'distant', 'refuse'],
    variablesDeLibrary: ['cle-collection'],
    inventaires: ['variablesLocales'],
    maitresSuivis: ['local'],
  });
  // Aucun événement reçu : la portée ne touche pas le sujet, mais les relectures restent dues.
  assert.deepEqual(porteeDesChangements([], suivis(['jeu'], relectures.maitresSuivis)), { portee: 'hors-sujet' });
});

test('un maître local sur une page qui n\'est plus écoutée se relit', () => {
  const relectures = relecturesObligatoires(ressources(), { ecoutees: new Set(), pageDe: () => 'page-sujet' });
  assert.deepEqual(relectures.maitresSuivis, []);
  assert.deepEqual(relectures.maitres, ['local', 'ailleurs', 'distant', 'refuse']);
});

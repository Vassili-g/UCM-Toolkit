/** La matrice de couverture des événements et la portée d'un changement reçu : sans couverture démontrée, on relit ou on invalide largement. */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  doitSeRelire, MATRICE_DE_COUVERTURE, porteeDesChangements, porteeDesChangementsDeStyle, porteeDuChangement, relecturesObligatoires,
  type AnciensParents, type ChangementRecu, type EntreeLue, type NoeudDEvenement, type SuivisDuSujet,
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
  const sansEvenement: readonly EntreeLue[] = ['liaisons-de-variables', 'variable', 'collection', 'inventaire', 'library'];
  for (const entree of sansEvenement) assert.equal(doitSeRelire(entree, ecoutee), true, entree);
  for (const entree of ['noeud', 'page', 'regles', 'maitre', 'valeur-heritee'] as const) {
    assert.equal(doitSeRelire(entree, ecoutee), false, entree);
  }
});

test('chaque entrée de la matrice porte un motif de relecture ou une condition', () => {
  for (const [entree, couverture] of Object.entries(MATRICE_DE_COUVERTURE)) {
    if (couverture.suivi === 'relecture') assert.ok(couverture.motif.length > 0, entree);
    else assert.ok(['page-ecoutee', 'locale-et-page-ecoutee', 'locale'].includes(couverture.condition), entree);
  }
});

test('un style local est couvert par stylechange sans page écoutée ; un style distant se relit', () => {
  assert.deepEqual(MATRICE_DE_COUVERTURE.style, { suivi: 'stylechange', condition: 'locale' });
  assert.equal(doitSeRelire('style', { pageEcoutee: false, locale: true }), false);
  assert.equal(doitSeRelire('style', { pageEcoutee: true, locale: false }), true);
});

test('un style suivi modifié ou supprimé touche le sujet ; un autre style reste hors du sujet', () => {
  const suivis = new Set(['S:1']);
  assert.deepEqual(porteeDesChangementsDeStyle([{ type: 'STYLE_PROPERTY_CHANGE', id: 'S:1', properties: ['fontSize'] }], suivis), { portee: 'sujet' });
  assert.deepEqual(porteeDesChangementsDeStyle([{ type: 'STYLE_DELETE', id: 'S:1' }], suivis), { portee: 'sujet' });
  assert.deepEqual(porteeDesChangementsDeStyle([{ type: 'STYLE_PROPERTY_CHANGE', id: 'S:2' }, { type: 'STYLE_DELETE', id: 'S:3' }], suivis), { portee: 'hors-sujet' });
  assert.deepEqual(porteeDesChangementsDeStyle([], suivis), { portee: 'hors-sujet' });
});

test('un style créé, un type futur ou des styles lus inconnus rendent la portée inconnue', () => {
  const suivis = new Set(['S:1']);
  assert.deepEqual(porteeDesChangementsDeStyle([{ type: 'STYLE_CREATE', id: 'S:9' }], suivis), { portee: 'inconnue', raison: 'style-cree' });
  assert.deepEqual(porteeDesChangementsDeStyle([{ type: 'STYLE_FUTUR', id: 'S:9' }], suivis), { portee: 'inconnue', raison: 'type-inconnu' });
  assert.deepEqual(porteeDesChangementsDeStyle([{ type: 'STYLE_PROPERTY_CHANGE', id: 'S:2' }], null), { portee: 'inconnue', raison: 'styles-lus-inconnus' });
  assert.deepEqual(porteeDesChangementsDeStyle([{ type: 'STYLE_CREATE', id: 'S:9' }, { type: 'STYLE_PROPERTY_CHANGE', id: 'S:1' }], suivis), { portee: 'sujet' });
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
    styles: {
      's:1': fait('s:1', {}),
      's:distant': fait('s:distant', {}, 'distante'),
      's:inconnu': fait('s:inconnu', {}, 'inconnue'),
      's:refuse': { id: 's:refuse', provenance: { appel: { appel: 'propriete', nom: 's' }, origine: 'inconnue' }, etat: { etat: 'refuse', raison: 'leve' } },
    },
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
    styles: ['s:distant', 's:inconnu', 's:refuse'],
    stylesSuivis: ['s:1'],
    maitres: ['ailleurs', 'distant', 'refuse'],
    variablesDeLibrary: ['cle-collection'],
    inventaires: ['variablesLocales'],
    maitresSuivis: ['local'],
  });
  // Aucun événement reçu : la portée ne touche pas le sujet, mais les relectures restent dues.
  assert.deepEqual(porteeDesChangements([], suivis(['jeu'], relectures.maitresSuivis)), { portee: 'hors-sujet' });
  // Le style local acquis est suivi par stylechange ; le style distant n'émet pas d'événement documenté et reste en relecture.
  const stylesSuivis = new Set(relectures.stylesSuivis);
  assert.deepEqual(porteeDesChangementsDeStyle([{ type: 'STYLE_PROPERTY_CHANGE', id: 's:1' }], stylesSuivis), { portee: 'sujet' });
  assert.deepEqual(porteeDesChangementsDeStyle([{ type: 'STYLE_PROPERTY_CHANGE', id: 's:distant' }], stylesSuivis), { portee: 'hors-sujet' });
});

test('un maître local sur une page qui n\'est plus écoutée se relit', () => {
  const relectures = relecturesObligatoires(ressources(), { ecoutees: new Set(), pageDe: () => 'page-sujet' });
  assert.deepEqual(relectures.maitresSuivis, []);
  assert.deepEqual(relectures.maitres, ['local', 'ailleurs', 'distant', 'refuse']);
});

/** Une table d'anciens parents : `null` marque un nœud apparu sans parent lisible. */
const anciens = (parents: Record<string, string | null>, deborde = false): AnciensParents => ({
  parentDe: (id) => (id in parents ? parents[id] : undefined),
  deborde,
});

test('la suppression d’un calque créé sous un variant touche le sujet par son ancien parent', () => {
  const sujet = suivis(['jeu', 'v1']);
  const suppression: ChangementRecu = { type: 'DELETE', id: 'neuf', node: { id: 'neuf', removed: true } };
  assert.deepEqual(porteeDuChangement(suppression, sujet), { portee: 'hors-sujet' }, 'sans table, comme avant');
  assert.deepEqual(porteeDuChangement(suppression, sujet, anciens({ neuf: 'v1' })), { portee: 'sujet' });
  assert.deepEqual(porteeDuChangement(suppression, sujet, anciens({ neuf: 'cadre', cadre: 'v1' })), { portee: 'sujet' }, 'par un ancêtre');
});

test('une suppression ailleurs reste hors du sujet, même avec la table', () => {
  const sujet = suivis(['jeu', 'v1']);
  const suppression: ChangementRecu = { type: 'DELETE', id: 'autre', node: { id: 'autre', removed: true } };
  assert.deepEqual(porteeDuChangement(suppression, sujet, anciens({})), { portee: 'hors-sujet' });
  assert.deepEqual(porteeDuChangement(suppression, sujet, anciens({ autre: 'page', page: 'doc' })), { portee: 'hors-sujet' });
});

test('une suppression dont l’ancien parent est inconnu est de portée inconnue si le nœud est apparu depuis le curseur ou si un maître est suivi', () => {
  const suppression: ChangementRecu = { type: 'DELETE', id: 'neuf', node: { id: 'neuf', removed: true } };
  assert.deepEqual(porteeDuChangement(suppression, suivis(['jeu']), anciens({ neuf: null })), { portee: 'inconnue', raison: 'ancien-parent-inconnu' });
  assert.deepEqual(porteeDuChangement(suppression, suivis(['jeu'], ['icone']), anciens({})), { portee: 'inconnue', raison: 'parent-de-suppression-inconnu' });
  assert.deepEqual(porteeDuChangement(suppression, suivis(['jeu']), anciens({ neuf: 'cadre', cadre: null })), { portee: 'inconnue', raison: 'ancien-parent-inconnu' }, 'un ancêtre apparu sans parent');
});

test('un calque déplacé hors du variant touche le sujet par son ancien parent', () => {
  const sujet = suivis(['jeu', 'v1']);
  const deplace: ChangementRecu = { type: 'PROPERTY_CHANGE', id: 'neuf', properties: ['parent'], node: chaine('neuf', 'autre-cadre', 'page') };
  assert.deepEqual(porteeDuChangement(deplace, sujet), { portee: 'hors-sujet' }, 'sans table, il paraît ailleurs');
  assert.deepEqual(porteeDuChangement(deplace, sujet, anciens({ neuf: 'v1' })), { portee: 'sujet' });
  assert.deepEqual(porteeDuChangement(deplace, sujet, anciens({ neuf: null })), { portee: 'inconnue', raison: 'ancien-parent-inconnu' });
  const autreProp: ChangementRecu = { ...deplace, properties: ['fills'] };
  assert.deepEqual(porteeDuChangement(autreProp, sujet, anciens({ neuf: 'v1' })), { portee: 'hors-sujet' }, 'seul un changement de parent relit l’ancien parent');
});

test('un journal débordé rend la portée inconnue, sauf pour un identifiant suivi', () => {
  const sujet = suivis(['jeu']);
  const perdu = anciens({}, true);
  assert.deepEqual(porteeDuChangement({ type: 'PROPERTY_CHANGE', id: 'x', node: chaine('x', 'page') }, sujet, perdu), { portee: 'inconnue', raison: 'journal-deborde' });
  assert.deepEqual(porteeDuChangement({ type: 'DELETE', id: 'x' }, sujet, perdu), { portee: 'inconnue', raison: 'journal-deborde' });
  assert.deepEqual(porteeDuChangement({ type: 'DELETE', id: 'jeu' }, sujet, perdu), { portee: 'sujet' });
  assert.deepEqual(porteeDesChangements([{ type: 'PROPERTY_CHANGE', id: 'x', node: chaine('x', 'page') }], sujet, perdu), { portee: 'inconnue', raison: 'journal-deborde' });
});

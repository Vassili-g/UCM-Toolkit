/** Les consommateurs dans Figma : liaisons lues, périmètre, dédoublonnage, annulation, lecture seule. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { chercherLesConsommateurs, liaisonsDuNoeud, modesDuNoeud, type NoeudLu, type OccurrenceDeVariable, type PageLue, type PortDesCalques, type StyleLu } from '../src/consommateurs';
import { indexer } from '../src/indexation';
import { afficherCalque, valeursDeFigma } from '../src/navigation';
import { consommateursDistincts, occurrencesDuToken } from '../src/occurrences';
import { enLectureSeule, MutationInterdite } from './figmaDeTest';
import { projetLibre } from './fixtures';

const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id });

function noeud(id: string, type: string, champs: Partial<NoeudLu> = {}, enfants: NoeudLu[] = []): NoeudLu {
  const brut = { id, name: `Calque ${id}`, type, parent: null as NoeudLu | null, ...champs, findAll: () => enfants.flatMap((enfant) => [enfant, ...(enfant.findAll?.() ?? [])]) };
  for (const enfant of enfants) (enfant as { parent: NoeudLu | null }).parent = brut;
  return brut;
}

test('les liaisons se lisent sur les propriétés, peintures, arrêts, effets, grilles et propriétés d’instance', () => {
  const lu = liaisonsDuNoeud(noeud('1', 'FRAME', {
    boundVariables: { itemSpacing: alias('gap'), fills: [alias('fond')], componentProperties: { Label: alias('libelle') } },
    fills: [{ type: 'SOLID', boundVariables: { color: alias('fond') } }, { type: 'GRADIENT_LINEAR', gradientStops: [{ boundVariables: { color: alias('arret') } }] }],
    strokes: [{ type: 'SOLID', boundVariables: { color: alias('bord') } }],
    effects: [{ type: 'DROP_SHADOW', boundVariables: { radius: alias('flou'), color: alias('ombre') } }],
    layoutGrids: [{ boundVariables: { count: alias('colonnes') } }],
  }));
  assert.deepEqual(lu.map((liaison) => `${liaison.propriete}=${liaison.variable}`), [
    'itemSpacing=gap',
    'componentProperties.Label=libelle',
    'fills[0]=fond',
    'fills[1].gradientStops[0].color=arret',
    'strokes[0]=bord',
    'effects[0].radius=flou',
    'effects[0].color=ombre',
    'layoutGrids[0].count=colonnes',
  ]);
});

test('un texte mixte se lit segment par segment, sans doublon des champs agrégés', () => {
  const texte = noeud('2', 'TEXT', {
    boundVariables: { fontSize: [alias('taille-a'), alias('taille-b')] },
    fills: Symbol('mixed') as unknown,
    getStyledTextSegments: () => [
      { start: 0, end: 5, boundVariables: { fontSize: alias('taille-a') }, fills: [{ boundVariables: { color: alias('encre') } }] },
      { start: 5, end: 9, boundVariables: { fontSize: alias('taille-b') }, fills: [] },
    ],
  });
  assert.deepEqual(liaisonsDuNoeud(texte).map((liaison) => `${liaison.propriete}=${liaison.variable}`), [
    'texte[0–5].fontSize=taille-a',
    'texte[0–5].fills[0]=encre',
    'texte[5–9].fontSize=taille-b',
  ]);
});

test('les modes d’un calque distinguent l’explicite de l’hérité, sans contexte fictif', () => {
  const modes = modesDuNoeud(noeud('3', 'FRAME', { resolvedVariableModes: { couleurs: 'couleurs:Jour', mesures: 'mesures:Compact' }, explicitVariableModes: { couleurs: 'couleurs:Jour' } }));
  assert.deepEqual(modes, { couleurs: { mode: 'couleurs:Jour', explicite: true }, mesures: { mode: 'mesures:Compact', explicite: false } });
});

function port(pages: PageLue[], selection: NoeudLu[] = [], styles: StyleLu[] = []): PortDesCalques & { chargees: string[] } {
  const chargees: string[] = [];
  return {
    chargees,
    pageCourante: () => pages[0],
    pages: () => pages,
    selection: () => selection,
    stylesLocaux: async () => styles,
    pause: async () => {},
  };
}

function page(id: string, noeuds: NoeudLu[], chargees: string[] = []): PageLue {
  const racine = { id, name: `Page ${id}`, type: 'PAGE', parent: null } as NoeudLu;
  for (const calque of noeuds) (calque as { parent: NoeudLu | null }).parent = racine;
  return { id, name: `Page ${id}`, loadAsync: async () => { chargees.push(id); }, findAll: () => noeuds.flatMap((calque) => [calque, ...(calque.findAll?.() ?? [])]) };
}

test('la sélection ne charge aucune page, et un calque atteint par deux chemins compte une fois', async () => {
  const enfant = noeud('e', 'RECTANGLE', { fills: [{ boundVariables: { color: alias('surface') } }] });
  const parent = noeud('p', 'FRAME', {}, [enfant]);
  const chargees: string[] = [];
  const p = port([page('0:1', [parent], chargees)], [parent, enfant]);
  const issue = await chercherLesConsommateurs(p, 'selection', { annulee: () => false });
  assert.equal(issue.statut, 'lu');
  if (issue.statut !== 'lu') return;
  assert.deepEqual(chargees, []);
  assert.equal(issue.resultat.calques, 2);
  assert.equal(issue.resultat.occurrences.length, 1);
  assert.deepEqual(issue.resultat.nonInspecte, ['reactions', 'valeurs-par-defaut', 'calques-masques-des-instances']);
});

test('le document charge chaque page et lit les styles locaux ; un calque illisible est rangé, pas bloquant', async () => {
  const chargees: string[] = [];
  const casse = noeud('x', 'FRAME');
  Object.defineProperty(casse, 'boundVariables', { get() { throw new Error('calque illisible'); } });
  const p = port(
    [page('0:1', [noeud('a', 'FRAME', { fills: [{ boundVariables: { color: alias('surface') } }] })], chargees), page('0:2', [casse, noeud('b', 'FRAME', { strokes: [{ boundVariables: { color: alias('surface') } }] })], chargees)],
    [],
    [{ id: 'S:1', name: 'Fond', type: 'PAINT', paints: [{ boundVariables: { color: alias('surface') } }] }],
  );
  const issue = await chercherLesConsommateurs(p, 'document', { annulee: () => false });
  assert.equal(issue.statut, 'lu');
  if (issue.statut !== 'lu') return;
  assert.deepEqual(chargees, ['0:1', '0:2']);
  assert.equal(issue.resultat.styles, 1);
  assert.deepEqual(issue.resultat.erreurs.map((erreur) => erreur.consommateur), ['x']);
  assert.deepEqual(issue.resultat.occurrences.map((occurrence) => [occurrence.consommateur, occurrence.genre, occurrence.page?.id ?? null]), [['a', 'calque', '0:1'], ['b', 'calque', '0:2'], ['S:1', 'style', null]]);
});

test('une analyse annulée ne rend aucun résultat partiel', async () => {
  const calques = Array.from({ length: 2000 }, (_, rang) => noeud(`n${rang}`, 'FRAME', { fills: [{ boundVariables: { color: alias('surface') } }] }));
  let appels = 0;
  const issue = await chercherLesConsommateurs(port([page('0:1', calques)]), 'page', { annulee: () => { appels += 1; return appels > 2; } });
  assert.deepEqual(issue, { statut: 'annule' });
});

test('les occurrences d’un token : directes, puis par alias avec les modes du calque ; consommateurs distincts des propriétés', () => {
  const index = indexer(projetLibre());
  const occurrences: OccurrenceDeVariable[] = [
    { consommateur: '1', genre: 'calque' as const, nom: 'Carte', page: null, propriete: 'fills[0]', variable: 'carte-fond', modes: { couleurs: { mode: 'couleurs:Jour', explicite: true } } },
    { consommateur: '1', genre: 'calque' as const, nom: 'Carte', page: null, propriete: 'strokes[0]', variable: 'surface', modes: {} },
    { consommateur: '2', genre: 'calque' as const, nom: 'Titre', page: null, propriete: 'fills[0]', variable: 'carte-fond', modes: {} },
  ];
  const papier = occurrencesDuToken(index, occurrences, 'papier', {});
  assert.deepEqual(papier.indirectes.map((entree) => entree.occurrence.consommateur), ['1']);
  const surface = occurrencesDuToken(index, occurrences, 'surface', {});
  assert.equal(surface.directes.length, 1);
  assert.equal(surface.indirectes.length, 2);
  assert.equal(surface.consommateurs, 2);
  assert.equal(consommateursDistincts(occurrences), 2);
});

test('afficher un calque vérifie son existence ; un calque supprimé rend introuvable sans naviguer', async () => {
  const montres: string[] = [];
  const pageNoeud = { id: '0:1', type: 'PAGE', parent: null };
  const calque = { id: '1:2', type: 'FRAME', parent: pageNoeud };
  const navigation = enLectureSeule({
    getNodeByIdAsync: async (id: string) => (id === '1:2' ? enLectureSeule(calque) : null),
    montrer: async (_page: unknown, cible: { id: string }) => { montres.push(cible.id); },
  }, ['getNodeByIdAsync', 'montrer']);
  assert.equal(await afficherCalque(navigation, '1:2'), 'affiche');
  assert.equal(await afficherCalque(navigation, '9:9'), 'introuvable');
  assert.deepEqual(montres, ['1:2']);
});

test('la vérification par resolveForConsumer ne crée aucun consommateur et rend chaque erreur', async () => {
  const valeurs = await valeursDeFigma(enLectureSeule({
    getNodeByIdAsync: async () => enLectureSeule({ id: '1:2' }),
    getVariableByIdAsync: async (id: string) => (id === 'absente' ? null : enLectureSeule({ resolveForConsumer: () => ({ value: { r: 1, g: 0, b: 0, a: 1 } }), setValueForMode() {} }, ['resolveForConsumer'])),
  }, ['getNodeByIdAsync', 'getVariableByIdAsync']), '1:2', ['a', 'absente']);
  assert.deepEqual(valeurs, [{ variable: 'a', valeur: { nature: 'couleur', couleur: { r: 1, g: 0, b: 0, a: 1 } } }, { variable: 'absente', erreur: 'variable-introuvable' }]);
});

test('le double lève sur toute mutation : la loi s’éprouve elle-même', () => {
  const double = enLectureSeule({ name: 'x', setValueForMode() {} });
  assert.throws(() => { (double as { name: string }).name = 'y'; }, MutationInterdite);
  assert.throws(() => double.setValueForMode(), MutationInterdite);
});

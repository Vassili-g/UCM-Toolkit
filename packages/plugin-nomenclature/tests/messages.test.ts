/** Une demande valide et au moins un refus par type de demande. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { estUiMessage } from '../src/messages';

const ecriture = { groupes: { casse: 'minuscules', separateur: 'tiret' }, variables: { casse: 'camelCase', separateur: 'camelCase' } };
const selection = { groupes: ['a'], exclus: ['b'], inclus: ['c'] };

const valides: Record<string, unknown> = {
  analyser: { type: 'analyser', demande: 1 },
  lignes: { type: 'lignes', demande: 2, generation: 1, groupe: 'g', debut: 0 },
  termes: { type: 'termes', demande: 3, generation: 1, recherche: 'bg', types: ['remplace', 'conforme'], origines: ['ucm'], places: ['groupes'], tri: 'nombre', section: 'remplace', place: 'variables', debut: 50 },
  fiche: { type: 'fiche', demande: 4, generation: 1, terme: 'bg' },
  selection: { type: 'selection', demande: 14, generation: 1, exclus: ['b'], inclus: ['c'] },
  diagnostic: { type: 'diagnostic', demande: 13, generation: 1 },
  simuler: { type: 'simuler', demande: 5, generation: 1, geste: { type: 'supprimer', terme: 'bg' } },
  repondre: { type: 'repondre', demande: 6, question: 'q', reponse: { type: 'garder', rang: 1 } },
  regle: { type: 'regle', demande: 7, geste: { type: 'ecriture', ecriture } },
  appliquer: { type: 'appliquer', demande: 8, generation: 2, selection },
  'annuler-dernier': { type: 'annuler-dernier', demande: 9 },
  exporter: { type: 'exporter', demande: 10 },
  importer: { type: 'importer', demande: 11, texte: '{}' },
  configurer: { type: 'configurer', demande: 12, collectionsExclues: ['c1'] },
  resize: { type: 'resize', largeur: 400, hauteur: 600, fin: true },
};
const refuses: Record<string, readonly unknown[]> = {
  analyser: [{ type: 'analyser' }, { type: 'analyser', demande: 0 }, { type: 'analyser', demande: 1.5 }],
  lignes: [{ ...(valides.lignes as object), debut: -1 }, { ...(valides.lignes as object), generation: 0 }, { ...(valides.lignes as object), groupe: 3 }],
  termes: [{ ...(valides.termes as object), types: ['autre'] }, { ...(valides.termes as object), debut: -1 }, { ...(valides.termes as object), recherche: null }],
  fiche: [{ ...(valides.fiche as object), terme: 3 }, { type: 'fiche', demande: 4, terme: 'bg' }],
  selection: [
    { type: 'selection', demande: 14, exclus: [], inclus: [] },
    { ...(valides.selection as object), generation: 0 },
    { ...(valides.selection as object), exclus: ['b', 'b'] },
    { ...(valides.selection as object), inclus: [1] },
    { ...(valides.selection as object), exclus: 'b' },
    { type: 'selection', demande: 14, generation: 1, exclus: [] },
  ],
  diagnostic: [{ type: 'diagnostic', demande: 13 }, { type: 'diagnostic', demande: 13, generation: 0 }],
  simuler: [{ ...(valides.simuler as object), geste: { type: 'inconnu' } }, { ...(valides.simuler as object), geste: null }],
  repondre: [{ ...(valides.repondre as object), reponse: { type: 'garder', rang: 2 } }, { ...(valides.repondre as object), reponse: { type: 'echelle', forme: 0 } }],
  regle: [
    { ...(valides.regle as object), geste: { type: 'ecriture', ecriture: { groupes: ecriture.groupes } } },
    { ...(valides.regle as object), geste: { type: 'ecriture', ecriture: { ...ecriture, variables: { casse: 'x', separateur: 'tiret' } } } },
    { ...(valides.regle as object), geste: { type: 'retirer-distinct', termes: ['a'] } },
  ],
  appliquer: [{ ...(valides.appliquer as object), selection: { ...selection, groupes: ['a', 'a'] } }, { ...(valides.appliquer as object), selection: { ...selection, inclus: [1] } }, { type: 'appliquer', demande: 8, selection }],
  'annuler-dernier': [{ type: 'annuler-dernier', demande: -1 }],
  exporter: [{ type: 'exporter', demande: '10' }],
  importer: [{ ...(valides.importer as object), texte: 'x'.repeat(1_000_001) }, { ...(valides.importer as object), texte: 3 }],
  configurer: [{ ...(valides.configurer as object), collectionsExclues: 'c1' }, { ...(valides.configurer as object), collectionsExclues: [1] }],
  resize: [{ type: 'resize', largeur: Infinity, hauteur: 600 }, { type: 'resize', largeur: 400, hauteur: 600, fin: 'oui' }],
};

for (const [type, message] of Object.entries(valides)) {
  test(`${type} : une demande conforme est acceptée`, () => assert.equal(estUiMessage(message), true));
}
for (const [type, messages] of Object.entries(refuses)) {
  test(`${type} : une demande hors contrat est refusée`, () => {
    for (const message of messages) assert.equal(estUiMessage(message), false, JSON.stringify(message).slice(0, 120));
  });
}
test('termes accepte chaque type, origine, tri et section, et refuse le reste', () => {
  const termes = valides.termes as object;
  for (const type of ['a-trancher', 'remplace', 'conforme', 'sans-regle', 'composant', 'palette']) {
    assert.equal(estUiMessage({ ...termes, types: [type], section: type }), true, type);
  }
  assert.equal(estUiMessage({ ...termes, types: [], origines: [], section: null }), true, 'vide = tous');
  for (const origines of [['ucm'], ['personnalise'], ['ucm', 'personnalise']]) assert.equal(estUiMessage({ ...termes, origines }), true, origines.join());
  for (const tri of ['alpha', 'nombre']) assert.equal(estUiMessage({ ...termes, tri }), true, tri);
  for (const places of [[], ['groupes'], ['variables'], ['groupes', 'variables']]) assert.equal(estUiMessage({ ...termes, places }), true, places.join() || 'vide = toutes');
  for (const place of [null, 'groupes', 'variables']) assert.equal(estUiMessage({ ...termes, place }), true, String(place));
  const refus: Record<string, unknown> = {
    'ancien filtre': { type: 'termes', demande: 3, generation: 1, recherche: '', filtre: 'tous', debut: 0 },
    'types absent': { ...termes, types: undefined }, 'types en chaîne': { ...termes, types: 'remplace' }, 'type inconnu': { ...termes, types: ['composants'] },
    'origine inconnue': { ...termes, origines: ['perso'] }, 'origines absent': { ...termes, origines: undefined },
    'tri inconnu': { ...termes, tri: 'nom' }, 'tri absent': { ...termes, tri: undefined },
    'section inconnue': { ...termes, section: 'palettes' }, 'section absente': { ...termes, section: undefined },
    'place inconnue': { ...termes, places: ['noms'] }, 'places absent': { ...termes, places: undefined }, 'places en chaîne': { ...termes, places: 'groupes' },
    'page de place inconnue': { ...termes, place: 'noms' }, 'page de place absente': { ...termes, place: undefined },
  };
  for (const [nom, message] of Object.entries(refus)) assert.equal(estUiMessage(message), false, nom);
});
test('une valeur qui n’est pas un objet, ou de type inconnu, est refusée', () => {
  for (const brut of [null, undefined, 'analyser', 3, [], { type: 'inconnu', demande: 1 }]) assert.equal(estUiMessage(brut), false);
});
test('une réponse sans paramètre et une collection sans cible sont acceptées', () => {
  for (const reponse of [{ type: 'distincts' }, { type: 'plus-tard' }, { type: 'voulu' }, { type: 'collection', cible: null }, { type: 'corriger', mots: ['a'] }, { type: 'autre', terme: 'x' }]) {
    assert.equal(estUiMessage({ type: 'repondre', demande: 1, question: 'q', reponse }), true);
  }
});
test('terme-ordinaire demande un terme et un booléen, dans une règle comme dans une simulation', () => {
  for (const type of ['regle', 'simuler']) {
    assert.equal(estUiMessage({ type, demande: 1, generation: 1, geste: { type: 'terme-ordinaire', terme: 'stress-test', actif: true } }), true, type);
    for (const geste of [{ type: 'terme-ordinaire', terme: 'stress-test' }, { type: 'terme-ordinaire', terme: 3, actif: true }, { type: 'terme-ordinaire', terme: 'x', actif: 'oui' }]) {
      assert.equal(estUiMessage({ type, demande: 1, generation: 1, geste }), false, JSON.stringify(geste));
    }
  }
});
test('annuler-import est un geste sans paramètre, valide dans une règle et une simulation', () => {
  for (const type of ['regle', 'simuler']) {
    assert.equal(estUiMessage({ type, demande: 1, generation: 1, geste: { type: 'annuler-import' } }), true, type);
  }
  assert.equal(estUiMessage({ type: 'regle', demande: 1, geste: { type: 'annuler-imports' } }), false);
});

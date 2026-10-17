/** Une demande valide et au moins un refus par type de demande. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { estUiMessage } from '../src/messages';

const ecriture = { groupes: { casse: 'minuscules', separateur: 'tiret' }, variables: { casse: 'camelCase', separateur: 'camelCase' } };
const selection = { groupes: ['a'], exclus: ['b'], inclus: ['c'] };

const valides: Record<string, unknown> = {
  analyser: { type: 'analyser', demande: 1 },
  lignes: { type: 'lignes', demande: 2, generation: 1, groupe: 'g', debut: 0 },
  termes: { type: 'termes', demande: 3, generation: 1, recherche: 'bg', filtre: 'tous', debut: 50 },
  fiche: { type: 'fiche', demande: 4, generation: 1, terme: 'bg' },
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
  termes: [{ ...(valides.termes as object), filtre: 'autre' }, { ...(valides.termes as object), debut: -1 }, { ...(valides.termes as object), recherche: null }],
  fiche: [{ ...(valides.fiche as object), terme: 3 }, { type: 'fiche', demande: 4, terme: 'bg' }],
  simuler: [{ ...(valides.simuler as object), geste: { type: 'inconnu' } }, { ...(valides.simuler as object), geste: null }],
  repondre: [{ ...(valides.repondre as object), reponse: { type: 'garder', rang: 2 } }, { ...(valides.repondre as object), reponse: { type: 'echelle', forme: -1 } }],
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
test('une valeur qui n’est pas un objet, ou de type inconnu, est refusée', () => {
  for (const brut of [null, undefined, 'analyser', 3, [], { type: 'inconnu', demande: 1 }]) assert.equal(estUiMessage(brut), false);
});
test('une réponse sans paramètre et une collection sans cible sont acceptées', () => {
  for (const reponse of [{ type: 'distincts' }, { type: 'plus-tard' }, { type: 'voulu' }, { type: 'collection', cible: null }, { type: 'corriger', mots: ['a'] }, { type: 'autre', terme: 'x' }]) {
    assert.equal(estUiMessage({ type: 'repondre', demande: 1, question: 'q', reponse }), true);
  }
});

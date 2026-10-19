/** Les choix de la fiche d'un terme : sa forme, les termes envoyés et la proposition faite à UCM. */
import assert from 'node:assert/strict';
import test from 'node:test';
import type { FicheVue } from '../src/messages';
import {
  blocsDeLaFiche,
  formesDeLaRegle,
  formesToutesFixeesParUcm,
  libelleDeLAction,
  motsSaisis,
  pastilleDeLaFiche,
  piedDeLaFiche,
  sorteDeFiche,
  termeProposeAUcm,
  termesDuReferentiel,
  termesRemplaces,
  texteDeLaProposition,
} from '../src/ui/feuilles';

const FICHE: FicheVue = {
  mot: 'outlined',
  forme: 'outlined',
  nature: null,
  origine: 'personnalise',
  categorieUcm: null,
  definition: 'Bordure sans fond.',
  remplace: [
    { mot: 'outline', nombre: 8, ucm: false },
    { mot: 'stroked', nombre: 2, ucm: false },
  ],
  emploi: { nombre: 24, exemples: [] },
  aRenommer: { nombre: 0, exemples: [] },
  ecart: false,
  voulu: false,
  distincts: [],
  question: null,
};

const LIGNE = { id: 'v1', ancien: 'Button/outline/hover', nouveau: 'Button/outlined/hover', marques: [1], aussi: [] };
const FICHE_UCM: FicheVue = {
  ...FICHE,
  mot: 'background',
  origine: 'ucm',
  categorieUcm: 'roles',
  remplace: [{ mot: 'bg', nombre: 12, ucm: true }, { mot: 'back', nombre: 3, ucm: true }],
  emploi: { nombre: 40, exemples: [LIGNE] },
  aRenommer: { nombre: 12, exemples: [LIGNE] },
};
const FICHE_SANS_REGLE: FicheVue = { ...FICHE, mot: 'radius', origine: null, definition: null, remplace: [], aRenommer: { nombre: 0, exemples: [] }, question: 'paire:radius|corner' };

test('la fiche suit l’origine du terme', () => {
  assert.equal(sorteDeFiche({ origine: 'ucm' }), 'ucm');
  assert.equal(sorteDeFiche({ origine: 'personnalise' }), 'personnalise');
  assert.equal(sorteDeFiche({ origine: null }), 'sans-regle');
});

test('la pastille de l’en-tête dit la famille UCM, Personnalisé, Sans règle ou À trancher', () => {
  assert.deepEqual(pastilleDeLaFiche('ucm', FICHE_UCM, false), { texte: 'UCM · rôle', variante: 'ucm' });
  assert.deepEqual(pastilleDeLaFiche('ucm', { categorieUcm: null }, false), { texte: 'UCM', variante: 'ucm' });
  assert.deepEqual(pastilleDeLaFiche('personnalise', FICHE, false), { texte: 'Personnalisé', variante: 'personnalise' });
  assert.deepEqual(pastilleDeLaFiche('sans-regle', FICHE_SANS_REGLE, false), { texte: 'Sans règle', variante: 'indice' });
  assert.deepEqual(pastilleDeLaFiche('sans-regle', FICHE_SANS_REGLE, true), { texte: 'À trancher', variante: 'indice' });
});

test('une fiche de terme montre l’identité, la règle, À renommer puis Déjà employé, dans cet ordre', () => {
  assert.deepEqual(blocsDeLaFiche('ucm', FICHE_UCM), ['identite', 'regle', 'a-renommer', 'deja-employe']);
  assert.deepEqual(blocsDeLaFiche('personnalise', { ...FICHE_UCM, definition: null, distincts: ['pressed'], voulu: true }), [
    'identite', 'regle', 'gardes-separes', 'ecriture-gardee', 'a-renommer', 'deja-employe',
  ]);
});

test('le bloc À renommer disparaît quand aucun nom ne change, Déjà employé quand aucun nom n’emploie le terme', () => {
  const rien = { aRenommer: { nombre: 0, exemples: [] }, emploi: { nombre: 0, exemples: [] } };
  assert.deepEqual(blocsDeLaFiche('ucm', { ...FICHE_UCM, ...rien }), ['identite', 'regle']);
  assert.deepEqual(blocsDeLaFiche('ucm', { ...FICHE_UCM, aRenommer: rien.aRenommer }), ['identite', 'regle', 'deja-employe']);
});

test('un terme sans règle montre sa question, puis la preuve : ni règle ni À renommer', () => {
  assert.deepEqual(blocsDeLaFiche('sans-regle', { ...FICHE_SANS_REGLE, emploi: { nombre: 9, exemples: [LIGNE] } }), ['identite', 'deja-employe']);
});

test('le × d’un terme remplacé manque sur une forme UCM, et « Formes fixées par UCM » demande qu’elles le soient toutes', () => {
  assert.deepEqual(formesDeLaRegle(FICHE_UCM), [{ mot: 'bg', nombre: 12, retirable: false }, { mot: 'back', nombre: 3, retirable: false }]);
  assert.deepEqual(formesDeLaRegle(FICHE).map(({ retirable }) => retirable), [true, true]);
  const mixte = { remplace: [{ mot: 'bg', nombre: 12, ucm: true }, { mot: 'bgcolor', nombre: 1, ucm: false }] };
  assert.deepEqual(formesDeLaRegle(mixte).map(({ retirable }) => retirable), [false, true]);
  assert.equal(formesToutesFixeesParUcm(FICHE_UCM), true);
  assert.equal(formesToutesFixeesParUcm(mixte), false);
  assert.equal(formesToutesFixeesParUcm(FICHE), false);
  assert.equal(formesToutesFixeesParUcm({ remplace: [] }), false);
});

test('le pied d’un terme UCM ne propose que de l’écarter, celui d’un terme personnalisé de le supprimer ou de le proposer à UCM', () => {
  assert.deepEqual(piedDeLaFiche('ucm', { ecart: false }), { gauche: 'ne-pas-appliquer', droite: [] });
  assert.deepEqual(piedDeLaFiche('ucm', { ecart: true }), { gauche: 'appliquer-de-nouveau', droite: [] });
  assert.deepEqual(piedDeLaFiche('personnalise', { ecart: false }), { gauche: 'supprimer-la-regle', droite: ['proposer-a-ucm'] });
  assert.deepEqual(piedDeLaFiche('sans-regle', { ecart: false }), { gauche: 'remplace-d-autres-termes', droite: ['remplacer-par'] });
});

test('aucun pied de fiche de terme n’a de bouton Fermer', () => {
  for (const sorte of ['ucm', 'personnalise', 'sans-regle'] as const) {
    for (const ecart of [false, true]) {
      const { gauche, droite } = piedDeLaFiche(sorte, { ecart });
      const libelles = [...(gauche === null ? [] : [gauche]), ...droite].map(libelleDeLAction);
      assert.ok(libelles.length > 0 && !libelles.includes('Fermer'), `${sorte} ${ecart}`);
    }
  }
  assert.equal(libelleDeLAction('ne-pas-appliquer'), 'Ne pas appliquer ce terme dans ce fichier');
  assert.equal(libelleDeLAction('supprimer-la-regle'), 'Supprimer la règle');
  assert.equal(libelleDeLAction('proposer-a-ucm'), 'Proposer à UCM');
});

test('la saisie se découpe en termes en minuscules, sans doublon', () => {
  assert.deepEqual(motsSaisis('Press, pressing ;press  Tap'), ['press', 'pressing', 'tap']);
  assert.deepEqual(motsSaisis('  , ; '), []);
});

test('les termes envoyés gardent ceux que le fichier a ajoutés et laissent ceux d’UCM', () => {
  const ucm = { remplace: [{ mot: 'press', nombre: 60, ucm: true }, { mot: 'tapped', nombre: 1, ucm: false }] };
  assert.deepEqual(termesRemplaces(ucm, ['pressing', 'tapped']), ['tapped', 'pressing']);
  assert.deepEqual(termesRemplaces({ remplace: [] }, ['bg']), ['bg']);
});

test('la proposition à UCM a la forme d’un terme du référentiel', () => {
  assert.deepEqual(termeProposeAUcm(FICHE), {
    id: 'outlined',
    toleres: ['outline', 'stroked'],
    libelle: { fr: 'outlined', en: 'outlined' },
    definition: { fr: 'Bordure sans fond.', en: '' },
  });
  assert.deepEqual(JSON.parse(texteDeLaProposition(FICHE)), termeProposeAUcm(FICHE));
});

test('un terme sans définition ni terme remplacé garde un texte complet, sans clé `toleres`', () => {
  const terme = termeProposeAUcm({ mot: 'tile-link', definition: null, remplace: [] });
  assert.deepEqual(terme, { id: 'tile-link', libelle: { fr: 'tile-link', en: 'tile-link' }, definition: { fr: '', en: '' } });
  assert.equal('toleres' in terme, false);
});

test('les suggestions de « Remplacer par… » sont les termes du référentiel, sans les crans', () => {
  const termes = termesDuReferentiel();
  assert.ok(termes.includes('pressed') && termes.includes('background'));
  assert.ok(!termes.includes('500'));
  assert.deepEqual(termes, [...new Set(termes)].sort());
});

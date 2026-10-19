/** Les choix de la fiche d'un terme : sa forme, les termes envoyés et la proposition faite à UCM. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { FicheVue } from '../src/messages';
import {
  blocsDeLaFiche,
  definitionDeLaFiche,
  formesDeLaRegle,
  formesToutesFixeesParUcm,
  libelleDeLAction,
  motsSaisis,
  pastilleDeLaFiche,
  piedDeLaFiche,
  lienDeLaFiche,
  lignesDIdentite,
  sorteDeFiche,
  termeProposeAUcm,
  titreDeLaFiche,
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
    { mot: 'outline', forme: 'outline', nombre: 8, ucm: false },
    { mot: 'stroked', forme: 'stroked', nombre: 2, ucm: false },
  ],
  emploi: { nombre: 24, exemples: [] },
  aRenommer: { nombre: 0, exemples: [] },
  ecart: false,
  voulu: false,
  ordinaire: false,
  distincts: [],
  question: null,
};

const LIGNE = { id: 'v1', ancien: 'Button/outline/hover', nouveau: 'Button/outlined/hover', marques: [1], aussi: [] };
const FICHE_UCM: FicheVue = {
  ...FICHE,
  mot: 'background',
  origine: 'ucm',
  categorieUcm: 'roles',
  remplace: [{ mot: 'bg', forme: 'bg', nombre: 12, ucm: true }, { mot: 'back', forme: 'back', nombre: 3, ucm: true }],
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
  assert.deepEqual(pastilleDeLaFiche('ucm', { categorieUcm: null, nature: null }, false), { texte: 'UCM', variante: 'ucm' });
  assert.deepEqual(pastilleDeLaFiche('personnalise', FICHE, false), { texte: 'Personnalisé', variante: 'personnalise' });
  assert.deepEqual(pastilleDeLaFiche('sans-regle', FICHE_SANS_REGLE, false), { texte: 'Sans règle', variante: 'indice' });
  assert.deepEqual(pastilleDeLaFiche('sans-regle', FICHE_SANS_REGLE, true), { texte: 'À trancher', variante: 'indice' });
});

test('la définition est dans l’en-tête de la feuille, plus dans le corps', () => {
  assert.equal(definitionDeLaFiche('ucm', FICHE_UCM), 'Bordure sans fond.');
  assert.ok(definitionDeLaFiche('personnalise', { definition: null })?.length);
  assert.equal(definitionDeLaFiche('ucm', { definition: null }), null);
  assert.deepEqual(lignesDIdentite('ucm', FICHE_UCM), []);
  assert.ok(!blocsDeLaFiche('ucm', FICHE_UCM).includes('identite'));
  const source = readFileSync(new URL('../src/ui/feuilles.ts', import.meta.url), 'utf8');
  assert.match(source, /'titre-et-definition'/);
  assert.match(source, /'avec-definition'/);
  assert.match(source, /'titre-ligne'/);
});

test('le jeton du terme prend le fond de la page et une bordure dans le bloc gris de la règle', () => {
  const css = readFileSync(new URL('../src/ui/styles.css', import.meta.url), 'utf8');
  assert.match(css, /\.fiche-regle \.jeton-neutre \{\s*background: var\(--fond\);\s*box-shadow: inset 0 0 0 1px var\(--bordure\);/);
  assert.match(css, /\.feuille-entete\.avec-definition \{/);
});

test('une fiche de terme montre la règle, À renommer puis Déjà employé, dans cet ordre', () => {
  assert.deepEqual(blocsDeLaFiche('ucm', FICHE_UCM), ['regle', 'a-renommer', 'deja-employe']);
  assert.deepEqual(blocsDeLaFiche('personnalise', { ...FICHE_UCM, ecart: true, distincts: ['pressed'], voulu: true }), [
    'identite', 'regle', 'gardes-separes', 'ecriture-gardee', 'a-renommer', 'deja-employe',
  ]);
});

test('le bloc À renommer disparaît quand aucun nom ne change, Déjà employé quand aucun nom n’emploie le terme', () => {
  const rien = { aRenommer: { nombre: 0, exemples: [] }, emploi: { nombre: 0, exemples: [] } };
  assert.deepEqual(blocsDeLaFiche('ucm', { ...FICHE_UCM, ...rien }), ['regle']);
  assert.deepEqual(blocsDeLaFiche('ucm', { ...FICHE_UCM, aRenommer: rien.aRenommer }), ['regle', 'deja-employe']);
});

test('un terme sans règle montre sa question, puis la preuve : ni règle ni À renommer', () => {
  assert.deepEqual(blocsDeLaFiche('sans-regle', { ...FICHE_SANS_REGLE, emploi: { nombre: 9, exemples: [LIGNE] } }), ['identite', 'deja-employe']);
});

test('le × d’un terme remplacé manque sur une forme UCM, et « Formes fixées par UCM » demande qu’elles le soient toutes', () => {
  assert.deepEqual(formesDeLaRegle(FICHE_UCM), [{ mot: 'bg', nombre: 12, retirable: false }, { mot: 'back', nombre: 3, retirable: false }]);
  assert.deepEqual(formesDeLaRegle(FICHE).map(({ retirable }) => retirable), [true, true]);
  const mixte = { remplace: [{ mot: 'bg', forme: 'bg', nombre: 12, ucm: true }, { mot: 'bgcolor', forme: 'bgcolor', nombre: 1, ucm: false }] };
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
  const ucm = { remplace: [{ mot: 'press', forme: 'press', nombre: 60, ucm: true }, { mot: 'tapped', forme: 'tapped', nombre: 1, ucm: false }] };
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

const FICHE_NOM: FicheVue = { ...FICHE_SANS_REGLE, mot: 'button', forme: 'Button', nature: 'composant', question: null, emploi: { nombre: 245, exemples: [LIGNE] } };
const FICHE_ORDINAIRE: FicheVue = { ...FICHE_SANS_REGLE, mot: 'button', forme: 'Button', ordinaire: true, question: null };

test('le titre est la forme du fichier quand le terme n’a pas de règle, sinon sa clé', () => {
  assert.equal(titreDeLaFiche('sans-regle', FICHE_NOM), 'Button');
  assert.equal(titreDeLaFiche('ucm', { mot: 'background', forme: 'Background' }), 'background');
  assert.equal(titreDeLaFiche('personnalise', FICHE), 'outlined');
});

test('la pastille grise de la nature remplace Sans règle, même quand une question attend', () => {
  assert.deepEqual(pastilleDeLaFiche('sans-regle', FICHE_NOM, false), { texte: 'Composant', variante: 'indice' });
  assert.deepEqual(pastilleDeLaFiche('sans-regle', { ...FICHE_NOM, nature: 'palette' }, false), { texte: 'Palette', variante: 'indice' });
});

test('l’en-tête d’un nom dit sa nature ; celui d’un terme ordinaire dit qu’il est traité comme un terme', () => {
  assert.deepEqual(lignesDIdentite('sans-regle', FICHE_NOM), ['Nom d’un composant du fichier. Aucune question ne porte sur un nom.']);
  assert.deepEqual(lignesDIdentite('sans-regle', { ...FICHE_NOM, nature: 'palette' }), ['Nom d’une palette du fichier. Aucune question ne porte sur un nom.']);
  assert.deepEqual(lignesDIdentite('sans-regle', FICHE_ORDINAIRE), ['Ce nom est traité comme un terme du vocabulaire.']);
  assert.deepEqual(blocsDeLaFiche('sans-regle', FICHE_NOM), ['identite', 'deja-employe']);
  assert.deepEqual(blocsDeLaFiche('sans-regle', { ...FICHE_NOM, emploi: { nombre: 0, exemples: [] } }), ['identite']);
  assert.deepEqual(lignesDIdentite('sans-regle', FICHE_SANS_REGLE), ['Une question à trancher porte sur ce terme.']);
});

test('le lien de l’en-tête envoie terme-ordinaire : actif pour un nom, inactif pour un terme ordinaire, absent sinon', () => {
  assert.deepEqual(lienDeLaFiche(FICHE_NOM), { libelle: 'Traiter comme un terme', geste: { type: 'terme-ordinaire', terme: 'button', actif: true } });
  assert.deepEqual(lienDeLaFiche(FICHE_ORDINAIRE), { libelle: 'Traiter comme un nom', geste: { type: 'terme-ordinaire', terme: 'button', actif: false } });
  assert.equal(lienDeLaFiche(FICHE_SANS_REGLE), null);
  assert.equal(lienDeLaFiche(FICHE_UCM), null);
});

test('la fiche d’un nom garde les actions du pied d’un terme sans règle', () => {
  assert.deepEqual(piedDeLaFiche(sorteDeFiche(FICHE_NOM), FICHE_NOM), { gauche: 'remplace-d-autres-termes', droite: ['remplacer-par'] });
});

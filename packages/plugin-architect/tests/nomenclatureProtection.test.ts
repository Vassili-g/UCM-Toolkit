/** Ce que l'écran dit des variables protégées : un titre en trois parties, une ligne et un texte par cause. */
import assert from 'node:assert/strict';
import test from 'node:test';
import type { ProtectionVue } from '../src/messages/nomenclature';
import { lignesDeProtection, totauxDeProtection } from '../src/ui/nomenclature/protection';
import { TEXTES } from '../src/ui/textes/nomenclature';

const toutes: readonly ProtectionVue[] = [
  { cause: 'marque-absente', nombre: 3 }, { cause: 'marque-illisible', nombre: 1 }, { cause: 'marque-future', nombre: 2 },
  { cause: 'sans-regles', nombre: 120 }, { cause: 'lecture-refusee', nombre: 40 },
];

test('le titre des non renommés dit les bloqués, les protégés et les non vérifiés', () => {
  assert.equal(TEXTES.nonRenommes(1, 3, 40), 'Non renommés : 1 bloqué, 3 protégés, 40 non vérifiés');
  assert.equal(TEXTES.nonRenommes(0, 1, 1), 'Non renommés : 1 protégé, 1 non vérifié');
  assert.equal(TEXTES.nonRenommes(2, 0, 0), 'Non renommés : 2 bloqués');
  assert.equal(TEXTES.nonRenommes(0, 0, 5), 'Non renommés : 5 non vérifiés');
});

test('les protégés du titre comptent les quatre premières causes, les non vérifiés la cinquième', () => {
  assert.deepEqual(totauxDeProtection(toutes), { proteges: 126, nonVerifiees: 40 });
  assert.deepEqual(totauxDeProtection([]), { proteges: 0, nonVerifiees: 0 });
});

test('une ligne par cause, dans l’ordre reçu, avec le texte de la note', () => {
  const lignes = lignesDeProtection(toutes);
  assert.deepEqual(lignes.map(({ cause }) => cause), toutes.map(({ cause }) => cause));
  const parCause = Object.fromEntries(lignes.map((ligne) => [ligne.cause, ligne]));
  assert.equal(parCause['marque-absente'].nombre, '3 noms écrits par UCM Palettes');
  assert.equal(parCause['marque-absente'].explication,
    'UCM Palettes écrit ces variables, et leur groupe garde son nom. Ouvrez UCM Palettes une fois dans ce fichier pour qu’il suive les règles, puis revenez ici.');
  assert.equal(parCause['marque-illisible'].nombre, '1 nom écrit par UCM Palettes');
  assert.equal(parCause['marque-illisible'].explication, 'Ce qu’UCM Palettes a noté dans ce fichier est illisible. Signalez ce fichier au mainteneur des plugins UCM.');
  assert.equal(parCause['marque-future'].explication,
    'Ce fichier a été ouvert avec une version d’UCM Palettes plus récente que celle qu’UCM Nomenclature connaît. Mettez à jour UCM Nomenclature pour renommer ces variables.');
  assert.equal(parCause['sans-regles'].explication,
    'Les variables d’UCM Palettes gardent leur nom tant que l’écriture des noms n’est pas enregistrée. Choisissez l’écriture, puis appuyez sur Continuer.');
  assert.equal(parCause['lecture-refusee'].nombre, '40 variables de couleur non vérifiées');
  assert.equal(parCause['lecture-refusee'].explication,
    'UCM Nomenclature n’a pas pu lire ce qu’UCM Palettes a noté dans ce fichier. Relancez l’analyse pour renommer ces variables.');
});

test('seule la ligne des non vérifiés a la pastille « Non vérifié » et le bouton Relancer l’analyse', () => {
  const lignes = lignesDeProtection(toutes);
  assert.deepEqual(lignes.map((ligne) => ligne.pastille), ['protege', 'protege', 'protege', 'protege', 'non-verifie']);
  assert.deepEqual(lignes.map((ligne) => ligne.relancer), [false, false, false, false, true]);
  assert.equal(TEXTES.pastilleProtege, 'Protégé');
  assert.equal(TEXTES.pastilleNonVerifie, 'Non vérifié');
  assert.equal(lignesDeProtection([{ cause: 'lecture-refusee', nombre: 1 }])[0].nombre, '1 variable de couleur non vérifiée');
});

test('la ligne d’une collection dit combien de ses variables gardent leur nom', () => {
  assert.equal(TEXTES.variablesEtProtegees(346, 0), '346 variables');
  assert.equal(TEXTES.variablesEtProtegees(1, 0), '1 variable');
  assert.equal(TEXTES.variablesEtProtegees(346, 120), '346 variables, dont 120 gardent leur nom');
  assert.equal(TEXTES.variablesEtProtegees(346, 346), '346 variables, qui gardent leur nom');
  assert.equal(TEXTES.variablesEtProtegees(346, 1), '346 variables, dont 1 garde son nom');
  assert.equal(TEXTES.variablesEtProtegees(1, 1), '1 variable, qui garde son nom');
});

test('un lot partiel ou refusé dit que la protection n’a pas pu être lue', () => {
  assert.equal(TEXTES.nonVerifieesNonRenommees(1),
    '1 variable de couleur n’a pas été renommée. UCM Nomenclature n’a pas pu lire ce qu’UCM Palettes a noté dans ce fichier.');
  assert.equal(TEXTES.nonVerifieesNonRenommees(2),
    '2 variables de couleur n’ont pas été renommées. UCM Nomenclature n’a pas pu lire ce qu’UCM Palettes a noté dans ce fichier.');
  assert.equal(TEXTES.rienNAEteRenommeNonVerifie,
    'Rien n’a été renommé. UCM Nomenclature n’a pas pu lire ce qu’UCM Palettes a noté dans ce fichier. Relancez l’analyse.');
});

/**
 * Une variable supprimée que Figma rend encore tant qu'un alias ou un calque la cite (D-30) : la lecture la range en
 * `manquees` avec l'issue `supprimee`, jamais en `variables`, et le mode Tokens signale l'alias cassé.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { ESPACE_ARCHITECT, CLE_ARCHITECTURE_DU_FICHIER, texteDeLArchitectureDuFichier } from '@ucm-kit/core/referentiel';

import { estSupprimee, lireLesVariables, lireLeReleve } from '../src/lecture';
import { lireLeComposant } from '../src/lectureDuComposant';
import type { PluginMessage } from '../src/messages';
import type { Contexte } from '../src/sandbox/contexte';
import { traiter } from '../src/sandbox/structure';
import { atelierDeCalques, collectionFigma, portDeTest, variableFigma } from './figmaDeTest';

const sansAnnulation = { annulee: () => false };
const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id });
const horloge = () => 1;

/** `fond` vise `supprimee`, que Figma rend encore (non distante) alors que le fichier ne la porte plus. */
function fichierAvecUneCibleSupprimee(distante = false) {
  const cible = variableFigma('supprimee', 'c', 'carte/fond-ancien', 'COLOR', { 'c:Valeur': { r: 1, g: 0, b: 0, a: 1 } }, distante);
  return portDeTest(
    [collectionFigma('c', 'components', ['Valeur'], ['fond'])],
    [variableFigma('fond', 'c', 'carte/fond', 'COLOR', { 'c:Valeur': alias('supprimee') })],
    [cible],
    distante ? [collectionFigma('bib', 'Bibliothèque', ['Valeur'], ['supprimee'], true)] : [],
  );
}

test('estSupprimee : ni distante ni locale', () => {
  const locaux = new Set(['a']);
  assert.equal(estSupprimee({ id: 'z', remote: false }, locaux), true);
  assert.equal(estSupprimee({ id: 'z' }, locaux), true);
  assert.equal(estSupprimee({ id: 'a', remote: false }, locaux), false);
  assert.equal(estSupprimee({ id: 'z', remote: true }, locaux), false);
});

test('la lecture range une cible d’alias non distante et absente des locales en manquees, supprimee', async () => {
  const { port } = fichierAvecUneCibleSupprimee();
  const issue = await lireLeReleve(port, 'Fichier', 1, sansAnnulation, horloge);
  assert.equal(issue.statut, 'lu');
  if (issue.statut !== 'lu') return;
  assert.deepEqual(issue.releve.variables.map((variable) => variable.id), ['fond']);
  assert.deepEqual(issue.releve.manquees.map(({ id, genre, issue: motif, depuis }) => [id, genre, motif, depuis]), [['supprimee', 'variable', 'supprimee', 'fond']]);
});

test('témoin : une cible distante reste une variable lue', async () => {
  const { port } = fichierAvecUneCibleSupprimee(true);
  const issue = await lireLeReleve(port, 'Fichier', 1, sansAnnulation, horloge);
  assert.equal(issue.statut, 'lu');
  if (issue.statut !== 'lu') return;
  assert.deepEqual(issue.releve.variables.map((variable) => variable.id).sort(), ['fond', 'supprimee']);
  assert.deepEqual(issue.releve.manquees, []);
});

test('une variable liée à un calque et supprimée entre dans les lectures manquées de la lecture du composant', async () => {
  const a = atelierDeCalques();
  const racine = a.calque('racine', 'COMPONENT', { name: 'Alert', fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, boundVariables: { color: alias('supprimee') } }] });
  const { port } = fichierAvecUneCibleSupprimee();
  const issue = await lireLeComposant(a.port(port), racine, sansAnnulation);
  assert.equal(issue.statut, 'lu');
  if (issue.statut !== 'lu') return;
  assert.deepEqual(issue.lecture.releve.variables.map((variable) => variable.id), []);
  assert.deepEqual(issue.lecture.releve.manquees.map(({ id, issue: motif }) => [id, motif]), [['supprimee', 'supprimee']]);
});

test('les identifiants locaux ne se lisent qu’une fois, et seulement si une variable non distante est lue', async () => {
  const { port } = fichierAvecUneCibleSupprimee();
  let demandes = 0;
  const lues = await lireLesVariables(port, ['fond', 'supprimee'], sansAnnulation, async () => { demandes += 1; return new Set(['fond']); });
  assert.ok(lues);
  assert.deepEqual([...lues.variables.keys()], ['fond']);
  assert.deepEqual([...lues.manquees.keys()], ['supprimee']);
  assert.equal(demandes, 1, 'deux variables non distantes lues : une seule demande');

  const distante = fichierAvecUneCibleSupprimee(true);
  let aucune = 0;
  await lireLesVariables(distante.port, ['supprimee'], sansAnnulation, async () => { aucune += 1; return new Set(); });
  assert.equal(aucune, 0, 'une variable distante n’a pas à être comparée aux locales');
});

test('lire-structure rend C63 alias-supprime pour un alias qui vise une variable supprimée, avec un seul getLocalVariablesAsync', async () => {
  const { port, appels } = fichierAvecUneCibleSupprimee();
  const envoyes: PluginMessage[] = [];
  const figma = {
    root: { getSharedPluginData: (espace: string, cle: string) => (espace === ESPACE_ARCHITECT && cle === CLE_ARCHITECTURE_DU_FICHIER ? texteDeLArchitectureDuFichier(true) : '') },
    variables: port,
  } as unknown as PluginAPI;
  const contexte: Contexte = { figma, envoyer: (message) => envoyes.push(message), surveillerLeDocument: () => {} };
  await traiter({ type: 'lire-structure', demande: 1 }, contexte);
  const message = envoyes[0] as Extract<PluginMessage, { type: 'structure' }>;
  assert.deepEqual(message.constats.map(({ code, faits }) => [code, faits.genre, faits.variable]), [['C63', 'alias-supprime', 'carte/fond']]);
  assert.equal(appels.get('local:variables'), 1);
});

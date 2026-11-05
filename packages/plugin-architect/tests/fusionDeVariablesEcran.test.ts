/**
 * Lot E4c, l'écran. La question d'un rôle écrit deux fois propose « Garder … » en bouton, un par variable. Un clic envoie la fusion ;
 * rien n'est coché d'avance (Q-F2-6, option C, sans case cochée). La réponse dit ce qui s'est écrit ou pourquoi la fusion saute.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import type { Bilan } from '../src/messages/nomenclature';
import type { Constat } from '../src/messages/commun';
import type { DemandeDeStructure } from '../src/messages/structure';

import { comme, poserLeDom } from './domDeTest';

poserLeDom();

const images: Array<() => void> = [];
Object.defineProperty(globalThis, 'CSS', { configurable: true, value: { escape: (texte: string) => texte } });
Object.defineProperty(globalThis, 'requestAnimationFrame', { configurable: true, value: (image: () => void) => images.push(image) });
Object.defineProperty(globalThis, 'HTMLElement', { configurable: true, value: comme(document.createElement('div')).constructor });
Object.defineProperty(globalThis, 'MutationObserver', { configurable: true, value: class { observe(): void {} } });
Object.assign(document, { body: comme(document.createElement('div')), addEventListener() {}, removeEventListener() {} });

import { monterStructure } from '../src/ui/structure';
import type { Coquille } from '../src/ui/nomenclature/coquille';
import type { Noms } from '../src/ui/structure/lecture';
import { SANS_RENOMMAGES } from '../src/ui/tokens/cochage';
import { monterLePanneauDesTokens } from '../src/ui/tokens/panneau';

const { bilans } = require('../galerie/nomenclature/donnees.cjs') as { bilans: { rienAFaire: Bilan } };

const SANS_NOMS: Noms = { nom: () => null, cle: () => null };
const element = (): HTMLElement => document.createElement('div');
const ID = 'C82:role-en-double:theme:primary/surface/default';

const roleEnDouble = (avecCles = true): Constat => ({
  id: ID, code: 'C82', type: 'verifier', famille: 'liaisons', variants: [], layers: [],
  faits: { genre: 'role-en-double', variable: 'surface/default', groupe: 'primary', variables: 2 },
  question: { id: ID, candidats: [{ ...(avecCles ? { cle: 'k-b' } : {}), nom: 'primary/surface/Default' }, { ...(avecCles ? { cle: 'k-a' } : {}), nom: 'primary/surface/default' }] },
});

function monter(constat: Constat) {
  const racine = element();
  const tokens = monterLePanneauDesTokens({ racine, nomenclature: { questions: element(), renommages: element(), remises: element() }, auChangement() {} });
  const envoyes: DemandeDeStructure[] = [];
  const structure = monterStructure({ pied: element(), tokens, renommages: () => SANS_RENOMMAGES } as unknown as Coquille, { envoyer: (message) => envoyes.push(message), noms: SANS_NOMS, ouvrirLaFiche() {} });
  tokens.poser({ bilan: bilans.rienAFaire, reglesRecues: 0 });
  structure.demander();
  structure.recevoir({ type: 'structure', demande: 1, constats: [constat], corrections: [], ignores: { constats: [], roles: [] } });
  return { racine: comme(racine), tokens, structure, envoyes, pied: comme(tokens.pied) };
}

const choix = (banc: ReturnType<typeof monter>) => banc.racine.querySelectorAll('.constat-choix-ligne');

test('E4.4 : chaque variable du rôle en double a son bouton « Garder … », sans case cochée', () => {
  const banc = monter(roleEnDouble());
  assert.deepEqual(choix(banc).map((ligne) => ligne.textContent), ['Garder primary/surface/Default', 'Garder primary/surface/default']);
  assert.equal(choix(banc).flatMap((ligne) => ligne.querySelectorAll('button')).length, 2);
  assert.equal(banc.racine.querySelectorAll('input').length, 0, 'aucune case : le designer choisit en cliquant');
  assert.equal(comme(banc.pied.querySelector('.corrections-resume')).textContent, 'Aucune correction cochée');
});

test('E4.4 : un clic sur « Garder … » envoie la fusion avec le constat et la clé de la variable gardée', () => {
  const banc = monter(roleEnDouble());
  const [premier, second] = choix(banc).map((ligne) => comme(ligne.querySelector('button')));
  second.clic();
  assert.deepEqual(banc.envoyes.at(-1), { type: 'fusionner-variables', demande: 2, constat: ID, garder: 'k-a' });
  premier.clic();
  assert.deepEqual(banc.envoyes.at(-1), { type: 'fusionner-variables', demande: 3, constat: ID, garder: 'k-b' });
});

test('E4.4 : la fusion écrite se dit, puis la structure est relue', () => {
  const banc = monter(roleEnDouble());
  comme(choix(banc)[1].querySelector('button')).clic();
  banc.structure.recevoir({ type: 'structure-appliquee', demande: 2, ecrites: 1, sautees: [], sansAnnulation: [] });
  assert.equal(comme(banc.racine.querySelector('.resultat')).textContent.includes('1 correction écrite.'), true);
  assert.deepEqual(banc.envoyes.at(-1), { type: 'lire-structure', demande: 3 });
});

test('E4.4 : une fusion sautée dit son motif, une réponse d’une autre demande est laissée', () => {
  const banc = monter(roleEnDouble());
  comme(choix(banc)[0].querySelector('button')).clic();
  banc.structure.recevoir({ type: 'structure-appliquee', demande: 99, ecrites: 1, sautees: [], sansAnnulation: [] });
  assert.equal(banc.racine.querySelectorAll('.resultat').filter((resultat) => !resultat.hidden).length, 0, 'la demande 99 n’est pas la nôtre');
  banc.structure.recevoir({ type: 'structure-appliquee', demande: 2, ecrites: 0, sautees: [{ id: ID, motif: 'erreur' }], sansAnnulation: [] });
  const suites = banc.racine.querySelectorAll('.resultat-suite').map((suite) => suite.textContent);
  assert.deepEqual(suites, ['Figma a refusé l’écriture. Recommencez, ou faites-la dans la fenêtre Variables.']);
});

test('E4.4 : sans clé de variable dans la question, le choix reste une ligne', () => {
  const banc = monter(roleEnDouble(false));
  assert.equal(choix(banc).length, 2);
  assert.equal(choix(banc).flatMap((ligne) => ligne.querySelectorAll('button')).length, 0);
});

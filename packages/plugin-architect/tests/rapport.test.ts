/**
 * Le rapport d'analyse. Côté sandbox : `preparer-le-rapport` rend la capture d'un nœud sans rien écrire, et `rapport-echoue`
 * pour un nœud absent ou une lecture qui lève. Côté interface : le lien, sa préparation, le téléchargement et l'échec.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import type { Constat } from '@ucm-kit/core/controles';

import { poserLeDom, comme, type ElementDeTest } from './domDeTest';

poserLeDom();

import type { PluginMessage } from '../src/messages';
import type { MessageDeRapport } from '../src/messages/rapport';
import type { CaptureArchitect } from '../src/sandbox/capture';
import type { Contexte } from '../src/sandbox/contexte';
import { DOMAINES, tableDesTypes } from '../src/sandbox/index';
import { traiter } from '../src/sandbox/rapport';
import { creerApplication } from '../src/ui/application';
import { monterLePanneau } from '../src/ui/analyse';
import { contenuDuRapport, nomDuRapport } from '../src/ui/analyse/rapport';
import type { AnalyseRecue } from '../src/ui/composant/analyse';
import { fabriquerLeMonde } from './outils/mondeFabrique';

const { constatsAlert, alertCorrections } = require('../galerie/etats/corrections.cjs') as { constatsAlert: Constat[]; alertCorrections: { sujet: { nom: string; variants: Array<{ id: string; nom: string }> } } };

const ECRITURE = /^(set|create|remove|delete|insert|append|import|clone|resize|move|load|save|flatten|group|ungroup)/;

/** Un double qui note toute affectation et tout appel d'une méthode d'écriture : la liste doit rester vide. */
function noterLesEcritures<T extends object>(objet: T, ecritures: string[]): T {
  return new Proxy(objet, {
    set(_cible, cle) {
      ecritures.push(`affectation ${String(cle)}`);
      return true;
    },
    get(cible, cle, receveur) {
      const valeur = Reflect.get(cible, cle, receveur);
      if (typeof valeur !== 'function') return valeur;
      if (ECRITURE.test(String(cle))) ecritures.push(`appel ${String(cle)}`);
      return valeur.bind(cible);
    },
  });
}

function banc() {
  const monde = fabriquerLeMonde();
  const ecritures: string[] = [];
  const envoyes: PluginMessage[] = [];
  const figma = noterLesEcritures(monde.figma as object, ecritures) as unknown as PluginAPI;
  const contexte: Contexte = { figma, envoyer: (message) => envoyes.push(message), surveillerLeDocument() {} };
  return { ecritures, envoyes, contexte };
}

test('le sandbox déclare preparer-le-rapport dans la table des types', () => {
  assert.equal(tableDesTypes().get('preparer-le-rapport'), 'rapport');
  assert.ok(DOMAINES.rapport);
});

test('rapport.ts rend la capture du jeu en JSON, sans rien écrire', async () => {
  const b = banc();
  await traiter({ type: 'preparer-le-rapport', demande: 7, sujet: 'jeu' }, b.contexte);
  assert.equal(b.envoyes.length, 1);
  const message = b.envoyes[0] as Extract<MessageDeRapport, { type: 'rapport-pret' }>;
  assert.equal(message.type, 'rapport-pret');
  assert.equal(message.demande, 7);
  const capture = JSON.parse(message.capture) as CaptureArchitect;
  assert.ok(capture.noeuds.jeu);
  assert.ok(capture.noeuds.repos);
  assert.deepEqual(b.ecritures, []);
});

test('rapport.ts capture le jeu entier quand on lui donne un de ses variants', async () => {
  const b = banc();
  await traiter({ type: 'preparer-le-rapport', demande: 8, sujet: 'repos' }, b.contexte);
  const message = b.envoyes[0] as Extract<MessageDeRapport, { type: 'rapport-pret' }>;
  assert.equal(message.type, 'rapport-pret');
  const capture = JSON.parse(message.capture) as CaptureArchitect;
  assert.equal(capture.jeu, 'jeu');
});

test('rapport.ts rend rapport-echoue pour un identifiant absent', async () => {
  const b = banc();
  await traiter({ type: 'preparer-le-rapport', demande: 3, sujet: 'inconnu' }, b.contexte);
  assert.deepEqual(b.envoyes, [{ type: 'rapport-echoue', demande: 3 }]);
  assert.deepEqual(b.ecritures, []);
});

test('rapport.ts rend rapport-echoue quand la lecture du nœud lève', async () => {
  const b = banc();
  const contexte: Contexte = { ...b.contexte, figma: { getNodeByIdAsync: async () => { throw new Error('illisible'); } } as unknown as PluginAPI };
  await traiter({ type: 'preparer-le-rapport', demande: 4, sujet: 'jeu' }, contexte);
  assert.deepEqual(b.envoyes, [{ type: 'rapport-echoue', demande: 4 }]);
});

// L'interface

// La clé publiée du jeu, qui n'est pas un identifiant de nœud : la demande doit porter celui de la lecture.
const IDENTITE = { sujet: 'cle-publiee-du-jeu', generation: 1 };

function monter(surcharge: Partial<AnalyseRecue> = {}, constats: readonly Constat[] = constatsAlert) {
  const demandes: Array<{ sujet: string; auRetour: (capture: string | null) => void }> = [];
  const telechargements: Array<{ nom: string; contenu: string; type: string }> = [];
  const analyse = {
    identite: IDENTITE, statut: 'complete', constats, tous: constats, ignores: ['C1:x'], repondues: {}, variants: alertCorrections.sujet.variants, lecture: null, sansTokens: false,
    progression: null, perimee: false, cause: null, ecriture: null, lot: null, appliquees: [], liaisons: null, liaisonsDemandees: false, recueA: 12, dureeMs: 345, ...surcharge,
  } as unknown as AnalyseRecue;
  const etat = { composant: { lecture: alertCorrections }, analyse, architecture: null, reference: null, panneau: { ouvert: true, largeurDeLaVue: 400, element: 'tout' } };
  const app = {
    etat, selectionner() {}, ignorerLaProposition() {}, repondre() {}, ignorer() {}, nePlusIgnorer() {}, ouvrirLaConfiguration() {}, rendre() {},
    preparerLeRapport: (sujet: string, auRetour: (capture: string | null) => void) => demandes.push({ sujet, auRetour }),
  };
  const panneau = monterLePanneau(app as never, { poserLaSelectionDuPlugin() {}, poserLesCorrections() {} } as never, {
    telecharger: (nom, contenu, type) => telechargements.push({ nom, contenu, type }),
    maintenant: () => new Date('2026-10-28T09:08:07.000Z'),
  });
  panneau.mettreAJour();
  const racine = comme(panneau.element);
  const lien = (): ElementDeTest | null => racine.querySelector('.lien-rapport');
  return { racine, demandes, telechargements, lien };
}

test('le lien n’apparaît que sur une analyse rendue qui porte des constats', () => {
  assert.ok(monter().lien());
  assert.ok(monter({ statut: 'partielle' }).lien());
  assert.equal(monter({ statut: 'provisoire' }).lien(), null);
  assert.equal(monter({ perimee: true }).lien(), null);
  assert.equal(monter({ ecriture: { liaisons: 0, ids: ['C1:a'] } }).lien(), null);
  assert.equal(monter({}, []).lien(), null);
  assert.equal(monter({ statut: 'partielle' }, []).lien(), null);
});

test('le lien dit son libellé et son infobulle, et reste un bouton focalisable', () => {
  const { lien } = monter();
  assert.equal(lien()?.textContent, 'Télécharger le rapport d’analyse');
  assert.equal(lien()?.title, 'Les points relevés et la description du composant, avec ses variables. Pour signaler un problème.');
  assert.equal(lien()?.tagName, 'BUTTON');
  assert.equal(lien()?.type, 'button');
});

test('le clic envoie la demande avec le sujet, puis la réponse déclenche le téléchargement', () => {
  const b = monter();
  b.lien()?.clic();
  assert.deepEqual(b.demandes.map((demande) => demande.sujet), ['alert:0']);
  assert.equal(b.lien()?.textContent, 'Préparation du rapport…');
  assert.equal(b.lien()?.disabled, true);
  b.lien()?.clic();
  assert.equal(b.demandes.length, 1);
  b.demandes[0].auRetour(JSON.stringify({ noeuds: { jeu: { id: 'jeu' } } }));
  assert.equal(b.telechargements.length, 1);
  const [{ nom, contenu, type }] = b.telechargements;
  assert.equal(type, 'application/json');
  assert.match(nom, /^ucm-architect-rapport-.+-2026-10-28-09-08-07\.json$/);
  const rapport = JSON.parse(contenu);
  assert.equal(rapport.version, 1);
  assert.equal(rapport.composant.id, 'alert:0');
  assert.equal(rapport.analyse.statut, 'complete');
  assert.equal(rapport.analyse.constats.length, constatsAlert.length);
  assert.deepEqual(rapport.analyse.ignores, ['C1:x']);
  assert.deepEqual(rapport.capture, { noeuds: { jeu: { id: 'jeu' } } });
  assert.equal(b.lien()?.textContent, 'Télécharger le rapport d’analyse');
  assert.equal(b.lien()?.disabled, false);
});

test('un échec de préparation écrit la ligne d’échec à côté du lien, qui reste actif', () => {
  const b = monter();
  b.lien()?.clic();
  b.demandes[0].auRetour(null);
  assert.equal(b.telechargements.length, 0);
  assert.equal(comme(b.racine.querySelector('.note-rapport')).textContent, 'Le rapport n’a pas pu être préparé.');
  assert.equal(b.lien()?.disabled, false);
  b.lien()?.clic();
  assert.equal(b.demandes.length, 2);
});

test('le nom du fichier nettoie le nom du composant', () => {
  assert.equal(nomDuRapport('Bouton / Été (v2)', new Date('2026-01-02T03:04:05Z')), 'ucm-architect-rapport-Bouton-Ete-v2-2026-01-02-03-04-05.json');
  assert.equal(nomDuRapport('///', new Date('2026-01-02T03:04:05Z')), 'ucm-architect-rapport-composant-2026-01-02-03-04-05.json');
});

test('le contenu du rapport garde tous les constats, ignorés compris', () => {
  const analyse = { statut: 'complete', recueA: 1, ignores: ['a'], constats: [], tous: constatsAlert } as unknown as AnalyseRecue;
  const rapport = JSON.parse(contenuDuRapport({ id: 'x', nom: 'X' }, analyse, '{}', new Date(0)));
  assert.equal(rapport.analyse.constats.length, constatsAlert.length);
  assert.equal(rapport.analyse.dureeMs, null);
});

test('l’application envoie la demande et ignore la réponse d’une demande plus ancienne', () => {
  const envoyes: unknown[] = [];
  (globalThis as { parent?: unknown }).parent = { postMessage: (message: unknown) => envoyes.push(message) };
  const app = creerApplication({} as never, () => ({}) as never);
  const retours: Array<string | null> = [];
  app.preparerLeRapport('Alert', (capture) => retours.push(capture));
  app.preparerLeRapport('Alert', (capture) => retours.push(capture));
  const demandes = envoyes.map((envoi) => (envoi as { pluginMessage: { type: string; demande: number; sujet: string } }).pluginMessage);
  assert.deepEqual(demandes.map(({ type, sujet }) => [type, sujet]), [['preparer-le-rapport', 'Alert'], ['preparer-le-rapport', 'Alert']]);
  app.recevoirLeRapport({ type: 'rapport-pret', demande: demandes[0].demande, capture: '{}' });
  assert.deepEqual(retours, []);
  app.recevoirLeRapport({ type: 'rapport-pret', demande: demandes[1].demande, capture: '{"a":1}' });
  assert.deepEqual(retours, ['{"a":1}']);
  app.recevoirLeRapport({ type: 'rapport-echoue', demande: demandes[1].demande });
  assert.deepEqual(retours, ['{"a":1}']);
});

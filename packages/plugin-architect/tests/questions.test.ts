/** Les questions : une réponse tire une correction exacte retenue dans l’analyse, qu’appliquer-corrections trouve ; hors candidats, refusée. */
import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';

import { controlerMapping, controlerNommage, type CatalogueDeReference, type Constat, type ReleveDeComposant } from '@ucm-kit/core/controles';
import { texteDeLArchitectureDuFichier } from '@ucm-kit/core/referentiel';

import type { PluginMessage } from '../src/messages';
import { commencerUneAnalyse, correctionsDeLAnalyse, reinitialiserLAnalyse, retenirLesCorrections } from '../src/sandbox/analyse';
import type { Contexte } from '../src/sandbox/contexte';
import { traiterAvec as appliquer } from '../src/sandbox/corrections';
import { traiter } from '../src/sandbox/questions';
import { ecrireLesNomsDeValeurs, type ApiDeNomsDeValeurs } from '../src/ecriture/noms-de-valeurs';

const liaison = { champ: 'fills', indice: 0, porteur: 'L1', variable: { id: 'V:0', cle: 'k-hover-actuel', nom: 'button/color/default/background', collection: 'c', distante: false } };
const releve = {
  version: 1, jeu: { cle: 'Button', id: 'jeu', nom: 'Button' }, proprietes: [], espaceDeCouleur: 'srgb',
  lecture: { layersLus: 1, layersNonLus: 0, variantsNonLus: [], manquees: [] },
  variants: [{ id: 'v1', nom: 'State=hover', valeurs: { State: 'hover' }, modesEffectifs: {}, layers: [{ id: 'L1', nom: 'bg', type: 'FRAME', parent: null, visible: true, opacite: 1, dimensions: { x: 0, y: 0, largeur: 1, hauteur: 1 }, peintures: [], liaisons: [liaison], valeursEnDur: [] }] }],
} as unknown as ReleveDeComposant;
const constat: Constat = {
  id: 'C16:v1', code: 'C16', type: 'corriger', famille: 'liaisons', variants: ['v1'], layers: ['L1'], faits: { token: 'button/color/default/background', axe: 'State', champ: 'fills', indice: 0 },
  question: { id: 'C16:v1', candidats: [{ cle: 'k-hover', nom: 'button/color/hover/background' }, { cle: 'k-autre', nom: 'button/color/pressed/background' }] },
};

function banc() {
  const envoyes: PluginMessage[] = [];
  const contexte: Contexte = { figma: {} as PluginAPI, envoyer: (m) => envoyes.push(m), surveillerLeDocument() {} };
  const analyse = commencerUneAnalyse('Button', ['jeu'], contexte);
  retenirLesCorrections(analyse, [constat], releve);
  return { envoyes, contexte, analyse };
}

beforeEach(() => reinitialiserLAnalyse());

test('une réponse choisit un candidat : correction exacte retenue dans l’analyse', async () => {
  const b = banc();
  await traiter({ type: 'repondre', analyse: b.analyse, question: 'C16:v1', reponse: 'k-hover' }, b.contexte);
  const attendue = {
    id: 'C16:v1', sorte: 'liaison',
    cible: { layer: 'L1', champ: 'fills', indice: 0, variable: 'k-hover-actuel' },
    avant: 'button/color/default/background', apres: { cle: 'k-hover', nom: 'button/color/hover/background' },
    aRelire: { axes: { State: 'hover' }, regle: 'Le designer a choisi ce token parmi les candidats du moteur.', avant: 'button/color/default/background' },
  };
  assert.deepEqual(b.envoyes, [{ type: 'question-repondue', analyse: b.analyse, question: 'C16:v1', correction: attendue }]);
  assert.deepEqual(correctionsDeLAnalyse(b.analyse)?.get('C16:v1'), attendue);
});

test('une réponse C12 issue du contrôle de nommage devient un renommage appliquable du jeu', async () => {
  const releveNom = structuredClone(releve);
  releveNom.jeu = { cle: 'jeu', id: 'jeu', nom: 'Alert' };
  releveNom.proprietes = [
    { nom: 'Severity', type: 'VARIANT', valeurs: ['info'], defaut: 'info' },
    { nom: 'Variant', type: 'VARIANT', valeurs: ['Outlined'], defaut: 'Outlined' },
  ];
  releveNom.variants = [{ id: 'v1', nom: 'Variant=Outlined', valeurs: { Severity: 'info', Variant: 'Outlined' }, modesEffectifs: {}, layers: [] }];
  const catalogue: CatalogueDeReference = {
    version: 1, library: null,
    collections: [{ cle: 'components', nom: 'components', role: 'components', modes: [], etat: 'lue' }],
    variables: [{ cle: 'outline', nom: 'alert/color/info/outline/background', collection: 'components', type: 'COLOR', etat: 'presente' }],
  };
  const constats = controlerNommage(releveNom, catalogue).filter(({ code }) => code === 'C12');
  assert.equal(constats.length, 1);
  assert.deepEqual(constats[0].question?.candidats, [{ nom: 'outline' }]);
  const envoyes: PluginMessage[] = [];
  const contexte: Contexte = { figma: {} as PluginAPI, envoyer: (message) => envoyes.push(message), surveillerLeDocument() {} };
  const analyse = commencerUneAnalyse('Alert', ['jeu'], contexte);
  retenirLesCorrections(analyse, constats, releveNom);

  await traiter({ type: 'repondre', analyse, question: constats[0].id, reponse: 'outline' }, contexte);
  const correction = (envoyes[0] as Extract<PluginMessage, { type: 'question-repondue' }>).correction;
  assert.deepEqual(correction, {
    id: constats[0].id, sorte: 'nom-de-valeur', cible: { layer: 'jeu', champ: 'Variant' },
    avant: 'Outlined', apres: { nom: 'outline' },
    aRelire: { regle: 'Le designer a choisi cette valeur parmi les candidats du moteur.', avant: 'Outlined' },
  });
  const variantes = [{ name: 'Variant=Outlined, Severity=info' }];
  const api: ApiDeNomsDeValeurs = {
    root: { getSharedPluginData: () => texteDeLArchitectureDuFichier(true) },
    async getNodeByIdAsync(id) { return id === 'jeu' ? { type: 'COMPONENT_SET', children: variantes } : null; },
  };
  assert.deepEqual(await ecrireLesNomsDeValeurs(correction ? [correction] : [], api), { ecrites: [constats[0].id], sautees: [] });
  assert.equal(variantes[0].name, 'Variant=outline, Severity=info');
});

test('une réponse à chaque constat de mapping cible sa peinture quand deux peintures lient le même token', async () => {
  const releveDouble = structuredClone(releve);
  releveDouble.proprietes = [{ nom: 'State', type: 'VARIANT', valeurs: ['hover', 'default'], defaut: 'hover' }];
  releveDouble.variants[0].layers[0].peintures = [0, 1].map((indice) => ({ champ: 'fills', indice, type: 'SOLID', visible: true, opacite: 1, blendMode: 'NORMAL' }));
  releveDouble.variants[0].layers[0].liaisons.push({ ...liaison, indice: 1 });
  const catalogue: CatalogueDeReference = {
    version: 1, library: null,
    collections: [{ cle: 'components', nom: 'components', role: 'components', modes: [], etat: 'lue' }],
    variables: [{ cle: 'k-hover-actuel', nom: 'button/color/default/background', collection: 'components', type: 'COLOR', etat: 'presente' }],
  };
  const mapping = controlerMapping(releveDouble, catalogue).filter(({ code }) => code === 'C16');
  assert.equal(mapping.length, 2);
  const constats = mapping.map((entree) => ({ ...entree, question: { id: entree.id, candidats: [{ cle: 'k-hover', nom: 'button/color/hover/background' }] } }));
  const b = banc();
  retenirLesCorrections(b.analyse, constats, releveDouble);

  for (const constat of constats) {
    await traiter({ type: 'repondre', analyse: b.analyse, question: constat.id, reponse: 'k-hover' }, b.contexte);
  }

  assert.deepEqual(b.envoyes.filter((message) => message.type === 'question-repondue')
    .map((message) => message.type === 'question-repondue' ? message.correction?.cible.indice : undefined), [0, 1], JSON.stringify({ mapping, constats, envoyes: b.envoyes }));
});

test('une réponse hors des candidats est refusée, rien n’est retenu', async () => {
  const b = banc();
  await traiter({ type: 'repondre', analyse: b.analyse, question: 'C16:v1', reponse: 'k-inconnu' }, b.contexte);
  assert.deepEqual(b.envoyes, [{ type: 'question-repondue', analyse: b.analyse, question: 'C16:v1', correction: null }]);
  assert.equal(correctionsDeLAnalyse(b.analyse)?.size, 0);
});

test('une question inconnue rend correction null', async () => {
  const b = banc();
  await traiter({ type: 'repondre', analyse: b.analyse, question: 'fantome', reponse: 'k-hover' }, b.contexte);
  assert.deepEqual(b.envoyes, [{ type: 'question-repondue', analyse: b.analyse, question: 'fantome', correction: null }]);
});

test('annuler-reponse retire la correction', async () => {
  const b = banc();
  await traiter({ type: 'repondre', analyse: b.analyse, question: 'C16:v1', reponse: 'k-hover' }, b.contexte);
  await traiter({ type: 'annuler-reponse', analyse: b.analyse, question: 'C16:v1' }, b.contexte);
  assert.deepEqual(b.envoyes.at(-1), { type: 'question-repondue', analyse: b.analyse, question: 'C16:v1', correction: null });
  assert.equal(correctionsDeLAnalyse(b.analyse)?.size, 0);
});

test('une identité périmée est ignorée : aucun message, rien de retenu', async () => {
  const b = banc();
  await traiter({ type: 'repondre', analyse: { sujet: 'Button', generation: b.analyse.generation + 1 }, question: 'C16:v1', reponse: 'k-hover' }, b.contexte);
  assert.deepEqual(b.envoyes, []);
  assert.equal(correctionsDeLAnalyse(b.analyse)?.size, 0);
});

test('une correction née d’une réponse est appliquée par appliquer-corrections', async () => {
  const b = banc();
  await traiter({ type: 'repondre', analyse: b.analyse, question: 'C16:v1', reponse: 'k-hover' }, b.contexte);
  const lots: string[][] = [];
  await appliquer({ async lot(corrections) { lots.push(corrections.map(({ id }) => id)); return { ecrites: corrections.map(({ id }) => id), sautees: [] }; }, async selectionner() {} })({ type: 'appliquer-corrections', analyse: b.analyse, ids: ['C16:v1'] }, b.contexte);
  assert.deepEqual(lots, [['C16:v1']]);
  assert.equal((b.envoyes.find((m) => m.type === 'corrections-appliquees') as { ecrites: number }).ecrites, 1);
});

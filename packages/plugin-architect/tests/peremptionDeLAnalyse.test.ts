/** La surveillance de l'analyse : écoute ouverte avant la lecture du sujet, événements gardés jusqu'à l'inventaire, couverture portée. */
import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';

import type { CatalogueDeReference, ReleveDeComposant } from '@ucm-kit/core/controles';
import type { Couverture } from 'ucm-plugin-socle/src/composant/analyse/faits';
import type { ResultatDAnalyse } from 'ucm-plugin-socle/src/composant/contract/exportComponent';

import type { PluginMessage } from '../src/messages';
import type { IdentiteDAnalyse } from '../src/messages/commun';
import {
  analyseARelire, analyseCourante, couvertureDeLAnalyse, reinitialiserLAnalyse, surChangementDuDocument, traiter, traiterAvec, type Lecteurs, type SujetAAnalyser,
} from '../src/sandbox/analyse';
import type { Contexte } from '../src/sandbox/contexte';
import { atelierDeCalques } from './figmaDeTest';

const catalogueVide: CatalogueDeReference = { version: 1, library: null, collections: [], variables: [] };
const moteur = async (): Promise<ResultatDAnalyse> => ({ etat: 'complete', export: { warnings: [], parties: new Map(), localisations: new Map() } as never });
const complete: Couverture = { instances: 'descendues', complete: true };

const releve = (): ReleveDeComposant => ({
  version: 1, jeu: { cle: 'Alert', id: 'jeu', nom: 'Alert' }, proprietes: [],
  variants: [{ id: 'v', nom: 'Alert défaut', valeurs: {}, layers: [], modesEffectifs: {} }],
  lecture: { layersLus: 0, layersNonLus: 0, variantsNonLus: [], manquees: [] }, espaceDeCouleur: 'srgb',
});

interface Banc {
  readonly contexte: Contexte;
  readonly envoyes: PluginMessage[];
  /** Les appels à `surveillerLeDocument` et aux lecteurs, dans l'ordre. */
  readonly journal: string[];
}

function banc(pagesNonEcoutees: readonly string[] = []): Banc {
  const envoyes: PluginMessage[] = [];
  const journal: string[] = [];
  let appels = 0;
  const contexte: Contexte = {
    figma: { root: { getSharedPluginData: () => '' } } as unknown as PluginAPI,
    envoyer: (message) => envoyes.push(message),
    // Seul le second appel, celui du sujet résolu, dit les pages que Figma refuse.
    surveillerLeDocument: () => { appels += 1; journal.push('surveiller'); return appels === 1 ? [] : pagesNonEcoutees; },
  };
  return { contexte, envoyes, journal };
}

function lecteurs(b: Banc, options: { sujet?: (contexte: Contexte) => void; releve?: (contexte: Contexte) => void; couverture?: Couverture } = {}): Lecteurs {
  return {
    async sujet(contexte) {
      b.journal.push('sujet');
      options.sujet?.(contexte);
      return { cle: 'Alert', noeud: { id: 'jeu' } as never, noeuds: ['jeu', 'v', 'calque'], admis: ['jeu', 'v'], ...(options.couverture ? { couverture: options.couverture } : {}) } satisfies SujetAAnalyser;
    },
    async releve(_sujet, _jeton, contexte) {
      options.releve?.(contexte);
      return { statut: 'lu', releve: releve() };
    },
    async catalogue() { return catalogueVide; },
    moteur,
  };
}

const types = (b: Banc) => b.envoyes.map((message) => message.type);
const perimes = (b: Banc) => b.envoyes.filter((message): message is Extract<PluginMessage, { type: 'perime' }> => message.type === 'perime');

beforeEach(() => reinitialiserLAnalyse());

test('l’écoute précède la lecture du sujet, puis le sujet abonne sa page', async () => {
  const b = banc();
  await traiterAvec(lecteurs(b, { couverture: complete }))({ type: 'analyser' }, b.contexte);
  assert.deepEqual(b.journal, ['surveiller', 'sujet', 'surveiller']);
});

test('un événement reçu pendant la lecture du sujet, sur un nœud de l’inventaire, périme l’analyse après analyse-commencee', async () => {
  const b = banc();
  await traiterAvec(lecteurs(b, { couverture: complete, sujet: (contexte) => surChangementDuDocument(['calque'], contexte) }))({ type: 'analyser' }, b.contexte);
  const analyse = analyseCourante() as IdentiteDAnalyse;
  assert.deepEqual(perimes(b), [{ type: 'perime', analyse, cause: 'document' }]);
  assert.ok(types(b).indexOf('analyse-commencee') < types(b).indexOf('perime'), 'l’interface ignore une péremption qui précède l’analyse qu’elle vise');
});

test('un événement reçu pendant la lecture du sujet, hors de l’inventaire, ne périme rien', async () => {
  const b = banc();
  await traiterAvec(lecteurs(b, { couverture: complete, sujet: (contexte) => surChangementDuDocument(['ailleurs'], contexte) }))({ type: 'analyser' }, b.contexte);
  assert.deepEqual(perimes(b), []);
});

test('un événement émis pendant le relevé périme l’analyse, un événement hors inventaire non', async () => {
  const b = banc();
  await traiterAvec(lecteurs(b, { couverture: complete, releve: (contexte) => { surChangementDuDocument(['ailleurs'], contexte); surChangementDuDocument(['v'], contexte); } }))({ type: 'analyser' }, b.contexte);
  assert.deepEqual(perimes(b).map((message) => message.cause), ['document']);
});

test('les événements gardés ne passent pas à l’analyse suivante, ni après l’inventaire', async () => {
  const b = banc();
  await traiterAvec(lecteurs(b, { couverture: complete, sujet: (contexte) => surChangementDuDocument(['calque'], contexte) }))({ type: 'analyser' }, b.contexte);
  assert.equal(perimes(b).length, 1);
  await traiterAvec(lecteurs(b, { couverture: complete }))({ type: 'analyser' }, b.contexte);
  assert.equal(perimes(b).length, 1, 'la seconde analyse ne rejoue pas l’événement de la première');
  surChangementDuDocument(['ailleurs'], b.contexte);
  assert.equal(perimes(b).length, 1, 'un nœud hors inventaire est ignoré une fois l’inventaire connu');
  surChangementDuDocument(['calque'], b.contexte);
  assert.equal(perimes(b).length, 2);
});

test('une analyse arrêtée avant son inventaire ne garde aucun événement', async () => {
  const b = banc();
  const arret: Lecteurs = { ...lecteurs(b), sujet: async () => { throw new Error('sujet illisible'); } };
  await traiterAvec(arret)({ type: 'analyser' }, b.contexte);
  surChangementDuDocument(['calque'], b.contexte);
  assert.deepEqual(perimes(b), [], 'l’analyse vide n’a aucun nœud');
  await traiterAvec(lecteurs(b, { couverture: complete }))({ type: 'analyser' }, b.contexte);
  assert.deepEqual(perimes(b), []);
});

test('une couverture complète ne demande pas de relecture', async () => {
  const b = banc();
  await traiterAvec(lecteurs(b, { couverture: complete }))({ type: 'analyser' }, b.contexte);
  const analyse = analyseCourante() as IdentiteDAnalyse;
  assert.deepEqual(couvertureDeLAnalyse(analyse), complete);
  assert.equal(analyseARelire(analyse), false);
});

test('un trou de lecture rend l’analyse à relire, et les nœuds lus restent surveillés', async () => {
  const b = banc();
  const trouee: Couverture = { instances: 'descendues', complete: false, trous: [{ type: 'enfants', noeud: 'jeu', raison: 'leve', message: 'nœud supprimé' }] };
  await traiterAvec(lecteurs(b, { couverture: trouee }))({ type: 'analyser' }, b.contexte);
  const analyse = analyseCourante() as IdentiteDAnalyse;
  assert.deepEqual(couvertureDeLAnalyse(analyse), trouee);
  assert.equal(analyseARelire(analyse), true);
  surChangementDuDocument(['v'], b.contexte);
  assert.equal(perimes(b).length, 1);
});

test('un sujet sans couverture déclarée est une couverture inconnue : relecture obligatoire', async () => {
  const b = banc();
  await traiterAvec(lecteurs(b))({ type: 'analyser' }, b.contexte);
  const analyse = analyseCourante() as IdentiteDAnalyse;
  assert.deepEqual(couvertureDeLAnalyse(analyse), { instances: 'descendues', complete: false, trous: [] });
  assert.equal(analyseARelire(analyse), true);
});

test('une page que Figma ne laisse pas écouter est un trou de la couverture', async () => {
  const b = banc(['0:7']);
  await traiterAvec(lecteurs(b, { couverture: complete }))({ type: 'analyser' }, b.contexte);
  const analyse = analyseCourante() as IdentiteDAnalyse;
  assert.deepEqual(couvertureDeLAnalyse(analyse), { instances: 'descendues', complete: false, trous: [{ type: 'page-non-ecoutee', page: '0:7' }] });
  assert.equal(analyseARelire(analyse), true);
});

test('une analyse qui n’est plus la courante est à relire', async () => {
  const b = banc();
  await traiterAvec(lecteurs(b, { couverture: complete }))({ type: 'analyser' }, b.contexte);
  const premiere = analyseCourante() as IdentiteDAnalyse;
  await traiterAvec(lecteurs(b, { couverture: complete }))({ type: 'analyser' }, b.contexte);
  assert.equal(couvertureDeLAnalyse(premiere), null);
  assert.equal(analyseARelire(premiere), true);
});

test('un children qui lève sur le jeu laisse l’analyse continuer avec une couverture à relire', async () => {
  const a = atelierDeCalques();
  const variant = a.calque('variant', 'COMPONENT', { name: 'Etat=Repos' });
  const jeu = a.calque('jeu', 'COMPONENT_SET', {
    name: 'Alert', key: 'cle-jeu',
    get children(): never { throw new Error('nœud supprimé'); },
    findAll: () => [variant],
  });
  const envoyes: PluginMessage[] = [];
  const figma = { currentPage: { selection: [jeu] }, root: { documentColorProfile: 'SRGB', getSharedPluginData: () => '' } };
  const contexte: Contexte = { figma: figma as never, envoyer: (message) => envoyes.push(message), surveillerLeDocument() {} };
  await traiter({ type: 'analyser' }, contexte);
  const analyse = analyseCourante() as IdentiteDAnalyse;
  assert.equal(analyse.sujet, 'cle-jeu', 'le sujet se résout malgré le trou');
  const couverture = couvertureDeLAnalyse(analyse) as Couverture;
  assert.equal(couverture.complete, false);
  assert.deepEqual(couverture.complete ? [] : couverture.trous, [{ type: 'enfants', noeud: 'jeu', raison: 'leve', message: 'nœud supprimé' }]);
  assert.equal(analyseARelire(analyse), true);
  surChangementDuDocument(['variant'], contexte);
  assert.equal(envoyes.filter((message) => message.type === 'perime').length, 1, 'les nœuds que findAll a rendus restent surveillés');
});

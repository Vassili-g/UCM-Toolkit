/**
 * D22 (recette du Button, C7) : `.sizeWrapperButton` analysé seul lie les tokens de Button. Il ne réclame aucun token à son nom : l'analyse
 * dit une fois, dans la section Informations, qu'il se juge depuis le composant qui l'utilise. Analysé comme composant d'un hôte, le même
 * relevé garde ses constats.
 */
import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';

import { controlerCouches, controlerMapping, controlerNommage, controlerOublis, type CatalogueDeReference } from '@ucm-kit/core/controles';
import type { ResultatInterne } from 'ucm-plugin-socle/src/composant/analyse/resultat';
import type { ResultatSansPublication } from 'ucm-plugin-socle/src/composant/contract/exportComponent';

import type { PluginMessage } from '../src/messages';
import type { Constat } from '../src/messages/commun';
import { lireLeReleve } from '../src/releveDuComposant';
import type { Contexte } from '../src/sandbox/contexte';
import { reinitialiserLAnalyse, traiterAvec, type Lecteurs, type SujetAAnalyser } from '../src/sandbox/analyse';
import { ligneDInformation } from '../src/ui/panneau/informations';
import type { ContexteDAFaire } from '../src/ui/ignores/modele';
import { atelierDeCalques, collectionFigma, portDeTest, variableFigma } from './figmaDeTest';

const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id });
const noir = { r: 0, g: 0, b: 0 };

/** Un jeu de composants d'un variant dont le fond est lié à un token de Button, sous le nom donné. */
async function relever(nomDuJeu: string) {
  const a = atelierDeCalques();
  const fond = a.calque('fond', 'RECTANGLE', { name: 'container', absoluteBoundingBox: { x: 0, y: 0, width: 10, height: 10 }, fills: [{ type: 'SOLID', color: noir, boundVariables: { color: alias('fond') } }] });
  const variant = a.calque('variant', 'COMPONENT', { name: 'Size=Medium' }, [fond]);
  const jeu = a.calque('jeu', 'COMPONENT_SET', { name: nomDuJeu, key: `cle-${nomDuJeu}`, componentPropertyDefinitions: { Size: { type: 'VARIANT', defaultValue: 'Medium', variantOptions: ['Medium'] } } }, [variant]);
  const { port } = portDeTest(
    [collectionFigma('c', 'components', ['Valeur'], ['fond'])],
    [variableFigma('fond', 'c', 'button/color/primary/default/background', 'COLOR', { 'c:Valeur': { r: 1, g: 1, b: 1, a: 1 } })],
  );
  const issue = await lireLeReleve(a.port(port), jeu);
  assert.equal(issue.statut, 'lu');
  if (issue.statut !== 'lu') throw new Error('relevé attendu');
  return issue.releve;
}

const catalogue: CatalogueDeReference = {
  version: 1, library: null,
  collections: [{ cle: 'c', nom: 'components', role: 'components', modes: [], etat: 'lue' }],
  variables: [{ cle: 'cle-fond', nom: 'button/color/primary/default/background', collection: 'c', type: 'COLOR', etat: 'presente' }],
};

test('D22 : sur le relevé de Figma, .sizeWrapperButton seul ne rend aucun C19 et rend un C85', async () => {
  const releve = await relever('.sizeWrapperButton');
  assert.deepEqual(controlerMapping(releve, catalogue), []);
  assert.deepEqual(controlerNommage(releve, catalogue), []);
  assert.deepEqual(controlerCouches(releve, catalogue), []);
  assert.deepEqual(controlerOublis(releve, catalogue).map(({ code }) => code), ['C85']);
});

test('D22 : le même relevé sous le nom d’un hôte garde son C19, et aucun C85', async () => {
  const releve = await relever('Alert');
  assert.deepEqual(controlerMapping(releve, catalogue).map(({ code }) => code), ['C19']);
  assert.ok(!controlerOublis(releve, catalogue).some(({ code }) => code === 'C85'));
});

test('D22 : la carte d’information de C85 donne la phrase de la note, sans statut', async () => {
  const [c85] = controlerOublis(await relever('.sizeWrapperButton'), catalogue);
  const contexte: ContexteDAFaire = { composant: '.sizeWrapperButton', variants: [], layers: new Map() };
  const ligne = ligneDInformation(c85 as Constat, contexte);
  assert.equal(ligne.phrase, 'Analysez le composant qui l’utilise pour juger ses tokens.');
});

// ---------------------------------------------------------------------------------------------------------------------------
// L'analyse : ni C19, ni C43, un seul C85

beforeEach(() => reinitialiserLAnalyse());

test('D22 : l’analyse de .sizeWrapperButton seul rend un C85, ni C19 ni C43, au provisoire comme au résultat', async () => {
  const releve = await relever('.sizeWrapperButton');
  const moteur = async (): Promise<ResultatSansPublication> => ({
    etat: 'calculee', interne: { warnings: [], parties: new Map(), localisations: new Map(), couverture: { etat: 'complete' } } as unknown as ResultatInterne,
  });
  const lecteurs: Lecteurs = {
    async sujet() { return { cle: '.sizeWrapperButton', noeud: { id: 'jeu' } as never, noeuds: ['jeu'] } satisfies SujetAAnalyser; },
    async releve() { return { statut: 'lu', releve }; },
    async catalogue() { return catalogue; },
    moteur,
    async regles() {
      return { composant: { id: 'jeu', nom: '.sizeWrapperButton' }, instancePresente: false, modele: { nom: '.sizeWrapperButton', sections: [] }, proprietes: [], documentees: [], presentes: [], manquantes: { nom: '.sizeWrapperButton', sections: [] } };
    },
  };
  const envoyes: PluginMessage[] = [];
  const contexte: Contexte = { figma: { root: { getSharedPluginData: () => '' } } as unknown as PluginAPI, envoyer: (message) => envoyes.push(message), surveillerLeDocument() {} };
  await traiterAvec(lecteurs)({ type: 'analyser' }, contexte);
  const analyses = envoyes.filter((message) => message.type === 'analyse' || message.type === 'analyse-provisoire') as Array<Extract<PluginMessage, { type: 'analyse' | 'analyse-provisoire' }>>;
  assert.ok(analyses.length >= 2, 'un provisoire et un résultat');
  for (const analyse of analyses) {
    const codes = analyse.constats.map(({ code }) => code);
    assert.equal(codes.filter((code) => code === 'C85').length, 1, analyse.type);
    assert.ok(!codes.includes('C19') && !codes.includes('C43') && !codes.includes('C7'), `${analyse.type} : ${codes.join(', ')}`);
  }
});

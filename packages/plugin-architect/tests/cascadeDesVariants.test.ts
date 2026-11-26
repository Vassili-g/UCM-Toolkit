/**
 * Recette d'Alert, D10 : une lecture fausse des axes ne donne qu'un constat C84. La carte dit combien de tokens de couleur ne
 * correspondent à aucun variant, et l'analyse retire la cascade de C7, C13, C32 `sans-variant` et C33.
 */
import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';

import type { CatalogueDeReference, ReleveDeComposant } from '@ucm-kit/core/controles';
import type { ResultatInterne } from 'ucm-plugin-socle/src/composant/analyse/resultat';
import type { ResultatSansPublication } from 'ucm-plugin-socle/src/composant/contract/exportComponent';

import type { PluginMessage } from '../src/messages';
import type { Constat } from '../src/messages/commun';
import type { Contexte } from '../src/sandbox/contexte';
import { reinitialiserLAnalyse, traiterAvec, type Lecteurs, type SujetAAnalyser } from '../src/sandbox/analyse';
import { carteDAFaire, type ContexteDAFaire } from '../src/ui/ignores/modele';

const contexte: ContexteDAFaire = { composant: 'Alert', variants: [], layers: new Map() };
const constat = (faits: Constat['faits']): Constat => ({ id: 'C84:alert', code: 'C84', type: 'verifier', famille: 'variants', variants: [], layers: [], faits });

test('D10 : la carte dit combien de tokens de couleur ne correspondent à aucun variant, et demande de vérifier les noms', () => {
  const carte = carteDAFaire(constat({ n: 32, total: 48 }), contexte);
  assert.equal(carte.phrase, '32 tokens de couleur sur 48 ne correspondent à aucun variant.');
  assert.equal(carte.statut, 'Vérifiez le nom des propriétés et des tokens');
});

test('D10 : avec un axe, la phrase ajoute le rôle que les tokens donnent à ses valeurs, en mots simples', () => {
  const dit = (role: string): string => carteDAFaire(constat({ n: 32, total: 32, axe: 'Style', role }), contexte).phrase;
  assert.equal(dit('palette'), '32 tokens de couleur sur 32 ne correspondent à aucun variant. Les valeurs de `Style` sont écrites dans les tokens à la place de la couleur.');
  assert.ok(dit('style').endsWith('à la place du style.'));
  assert.ok(dit('taille').endsWith('à la place de la taille.'));
  assert.ok(dit('etat').endsWith('à la place de l’état.'));
});

test('D10 : sans axe, la phrase n’ajoute rien', () => {
  assert.equal(carteDAFaire(constat({ n: 4, total: 8 }), contexte).phrase, '4 tokens de couleur sur 8 ne correspondent à aucun variant.');
});

// ---------------------------------------------------------------------------------------------------------------------------
// L'analyse retire la cascade

const ROLES = ['foreground', 'background', 'border', 'icon'];
const PALETTES = ['Info', 'Success', 'Warning', 'Danger'];

function alert(): ReleveDeComposant {
  const axes: readonly (readonly [string, string[]])[] = [['Style', PALETTES], ['Variant', ['Filled', 'Outlined']]];
  const combinaisons = axes.reduce<Record<string, string>[]>((debut, [nom, valeurs]) => debut.flatMap((partiel) => valeurs.map((valeur) => ({ ...partiel, [nom]: valeur }))), [{}]);
  return {
    version: 1, jeu: { cle: 'Alert', id: 'jeu-Alert', nom: 'Alert' },
    proprietes: axes.map(([nom, valeurs]) => ({ nom, type: 'VARIANT' as const, valeurs, defaut: valeurs[0] })),
    variants: combinaisons.map((valeurs, rang) => ({ id: `v${rang}`, nom: `v${rang}`, valeurs, modesEffectifs: {}, layers: [] })),
    lecture: { layersLus: 0, layersNonLus: 0, variantsNonLus: [], manquees: [] }, espaceDeCouleur: 'srgb',
  };
}

const catalogue: CatalogueDeReference = {
  version: 1, library: null,
  collections: [{ cle: 'components', nom: 'components', role: 'components', modes: [{ id: 'l', nom: 'Light' }], etat: 'lue' }],
  variables: PALETTES.flatMap((palette) => ['Filled', 'Outlined'].flatMap((style) => ROLES.map((role) => {
    const nom = `Alert/Color/${palette}/${style}/${role}`;
    return { cle: nom, nom, collection: 'components', type: 'COLOR' as const, etat: 'presente' as const };
  }))),
};

const moteur = async (): Promise<ResultatSansPublication> => ({
  etat: 'calculee', interne: { warnings: [], parties: new Map(), localisations: new Map(), couverture: { etat: 'complete' } } as unknown as ResultatInterne,
});

const lecteurs = (): Lecteurs => ({
  async sujet() { return { cle: 'Alert', noeud: { id: 'jeu-Alert' } as never, noeuds: ['jeu-Alert'] } satisfies SujetAAnalyser; },
  async releve() { return { statut: 'lu', releve: alert() }; },
  async catalogue() { return catalogue; },
  moteur,
});

beforeEach(() => reinitialiserLAnalyse());

test('D10 : l’analyse d’Alert rend un C84 et aucun C7, C13, C32 sans-variant ni C33, au provisoire comme au résultat', async () => {
  const envoyes: PluginMessage[] = [];
  const contexteDeTest: Contexte = { figma: { root: { getSharedPluginData: () => '' } } as unknown as PluginAPI, envoyer: (message) => envoyes.push(message), surveillerLeDocument() {} };
  await traiterAvec(lecteurs())({ type: 'analyser' }, contexteDeTest);
  const analyses = envoyes.filter((message) => message.type === 'analyse' || message.type === 'analyse-provisoire') as Array<Extract<PluginMessage, { type: 'analyse' | 'analyse-provisoire' }>>;
  assert.ok(analyses.length >= 2, 'un provisoire et un résultat');
  for (const analyse of analyses) {
    const constats: readonly Constat[] = analyse.constats;
    assert.equal(constats.filter(({ code }) => code === 'C84').length, 1, analyse.type);
    assert.deepEqual(constats.filter(({ code, faits }) => ['C7', 'C13', 'C33'].includes(code) || (code === 'C32' && faits.motif === 'sans-variant')), [], analyse.type);
  }
});

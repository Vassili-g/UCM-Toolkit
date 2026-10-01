/**
 * L'intégration des contrats et de `tokens.json`. Les verdicts viennent de la
 * porte navigateur du kit ; ces tests vérifient que l'explorateur les
 * emploie, et ce qu'il ajoute : l'adresse de chaque référence, le
 * rapprochement par chemin et la comparaison avec l'export. Les contrats de
 * test sont fabriqués en code.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { collecterReferences, sansEchantillon } from '@ucm-kit/core/lecteurs';
import { joinTokenPath } from 'ucm-plugin-socle/src/cheminsDeTokens';

import {
  TAILLE_MAXIMALE_D_UN_FICHIER,
  cheminPublie,
  classerImport,
  correspondance,
  ecartsAvecLExport,
  occurrencesDeLaVariable,
  occurrencesDuContrat,
  variablesParChemin,
  type ContratImporte,
  type TokensImportes,
} from '../src/integrations/contrats';
import { indexer } from '../src/indexation';
import { constructeur, couleur, nombre, projetLibre } from './fixtures';

/** Un contrat 14.0 que `champsInvalidesDuContrat` accepte. */
function contrat(version = '14.0'): Record<string, unknown> {
  return {
    name: 'Card',
    meta: { contractVersion: version, exportedAt: '2026-01-01T00:00:00.000Z', figma: { fileName: 'f', nodeId: '1:1' }, coverage: { portable: 'complete' } },
    figmaVariantLabels: { axes: { size: 'Size' }, values: { size: { s: 'Small', l: 'Large' } } },
    viewStructures: { s0: { layout: 'flex-row', gap: '{interface.card.gap}', sizing: { width: 'fit-content', height: 'fit-content' } } },
    viewPaintPlacements: { p0: { fills: { background: [[]] } } },
    variantViews: { v0: { structure: 's0', paintPlacements: 'p0' }, v1: { structure: 's0', paintPlacements: 'p0' } },
    variants: [
      { nodeId: '1:1', values: { size: 's' }, view: 'v0', tokens: { background: '{interface.card.fill}' } },
      { nodeId: '1:2', values: { size: 'l' }, view: 'v1', tokens: { background: '{interface.card.fill}' } },
    ],
    structure: { view: 's0', variantAxes: ['size'] },
    rendering: { roles: {} },
  };
}

test('un contrat valide s’importe ; hors de la fenêtre de version ou mal formé, il est refusé par les verdicts du kit', () => {
  const accepte = classerImport('card.contract.json', JSON.stringify(contrat()), 0);
  assert.ok('import' in accepte && accepte.import.genre === 'contrat' && accepte.import.composant === 'Card');
  assert.deepEqual(classerImport('a.json', JSON.stringify(contrat('2.0')), 0), { refus: { raison: 'version', version: '2.0' } });
  assert.deepEqual(classerImport('a.json', JSON.stringify(contrat('99.0')), 0), { refus: { raison: 'version', version: '99.0' } });
  const casse = { ...contrat(), variants: [{ nodeId: '1:1', view: 'inconnue' }] };
  const refus = classerImport('casse.json', JSON.stringify(casse), 0);
  assert.ok('refus' in refus && refus.refus.raison === 'structure');
});

test('le relevé des références rend l 19ensemble du kit, échantillons et méta exclus', () => {
  // Le texte d'une maquette ressemble à une référence sans en être une.
  const brut = { ...contrat(), samples: { texte: '{montant.total}' } };
  const notre = new Set(occurrencesDuContrat(brut).map((occurrence) => occurrence.reference));
  assert.deepEqual([...notre].sort(), [...collecterReferences(sansEchantillon(brut))].sort());
  assert.equal(notre.has('{montant.total}'), false);
});

test('chaque référence est située : adresse, variants concernés et propriété', () => {
  const occurrences = occurrencesDuContrat(contrat());
  assert.deepEqual(occurrences.map((occurrence) => [occurrence.adresse, occurrence.variants, occurrence.propriete]), [
    ['viewStructures.s0.gap', ['Size=Small', 'Size=Large'], 'gap'],
    ['variants[0].tokens.background', ['Size=Small'], 'background'],
    ['variants[1].tokens.background', ['Size=Large'], 'background'],
  ]);
});

test('un import trop grand, illisible, inconnu ou d’une version refusée est refusé sans rien ajouter', () => {
  assert.deepEqual(classerImport('a.json', ' '.repeat(TAILLE_MAXIMALE_D_UN_FICHIER + 1), 0), { refus: { raison: 'taille', limite: 20 } });
  assert.deepEqual(classerImport('a.json', '{}', 50 * 1024 * 1024), { refus: { raison: 'ensemble', limite: 50 } });
  assert.deepEqual(classerImport('a.json', '{ casse', 0), { refus: { raison: 'illisible' } });
  assert.deepEqual(classerImport('a.json', '{"x": 1}', 0), { refus: { raison: 'inconnu' } });
  assert.deepEqual(classerImport('a.json', JSON.stringify({ $extensions: { 'com.ucm.formatVersion': 99 }, a: { $value: 1 } }), 0), { refus: { raison: 'version', version: '99' } });
});

/** Le tokens.json qu'UCM Exporter écrirait pour une partie du projet libre. */
function tokensDuProjetLibre(): TokensImportes {
  const document = {
    $extensions: { 'com.ucm.formatVersion': 2 },
    interface: { card: { fill: { $value: '{couleurs.surface}', $type: 'color' }, gap: { $value: '{mesures.spacing.card}', $type: 'number' } } },
    mesures: { spacing: { card: { $value: 12, $type: 'number', $extensions: { 'com.ucm.modes': { compact: 12, confort: 20 } } } } },
    couleurs: { encre: { $value: { colorSpace: 'srgb', components: [0x22 / 255, 0x26 / 255, 0x30 / 255], alpha: 1 }, $type: 'color', $extensions: { 'com.ucm.modes': { jour: { colorSpace: 'srgb', components: [0x22 / 255, 0x26 / 255, 0x30 / 255], alpha: 1 } } } } },
  };
  const issue = classerImport('tokens.json', JSON.stringify(document), 0);
  if (!('import' in issue) || issue.import.genre !== 'tokens') throw new Error('import refusé');
  return issue.import;
}

test('le chemin publié est celui de l’exporteur, et le rapprochement se fait par chemin, jamais par valeur', () => {
  const index = indexer(projetLibre());
  assert.equal(cheminPublie(index, index.variables.get('carte-fond')!), joinTokenPath('Interface', 'card/fill'));
  const tokens = tokensDuProjetLibre();
  const parChemin = variablesParChemin(index);
  assert.deepEqual(correspondance(index, parChemin, tokens, 'carte-fond'), { statut: 'unique', chemin: 'interface.card.fill' });
  assert.deepEqual(correspondance(index, parChemin, tokens, 'papier'), { statut: 'absente', chemin: 'couleurs.papier' });
});

test('une collision de chemins rend le rapprochement ambigu', () => {
  const c = constructeur();
  c.collection('a', 'Tokens', ['M']);
  c.collection('b', 'tokens', ['M']);
  c.variable('x', 'a', 'gap', 'FLOAT', { M: nombre(1) });
  c.variable('y', 'b', 'Gap', 'FLOAT', { M: nombre(2) });
  const index = indexer(c.releve());
  const trouve = correspondance(index, variablesParChemin(index), tokensDuProjetLibre(), 'x');
  assert.deepEqual(trouve, { statut: 'ambigue', chemin: 'tokens.gap', variables: ['x', 'y'] });
});

test('Figma comparé à l’export, par mode : alias identique, valeur différente, mode absent', () => {
  const index = indexer(projetLibre());
  const tokens = tokensDuProjetLibre();
  assert.deepEqual(ecartsAvecLExport(index, 'carte-fond', tokens.feuilles.get('interface.card.fill')!), []);
  assert.deepEqual(ecartsAvecLExport(index, 'espace-carte', tokens.feuilles.get('mesures.spacing.card')!), [{ ecart: 'valeur', mode: 'Confort' }]);
  assert.deepEqual(ecartsAvecLExport(index, 'encre', tokens.feuilles.get('couleurs.encre')!), [{ ecart: 'mode', mode: 'Nuit' }]);
});

test('les occurrences contractuelles d’une variable passent par sa référence publiée', () => {
  const index = indexer(projetLibre());
  const issue = classerImport('card.contract.json', JSON.stringify(contrat()), 0);
  const importe = ('import' in issue ? issue.import : null) as ContratImporte;
  const trouvees = occurrencesDeLaVariable(index, [importe], 'carte-fond');
  assert.deepEqual(trouvees.map((entree) => entree.occurrence.adresse), ['variants[0].tokens.background', 'variants[1].tokens.background']);
  assert.deepEqual(occurrencesDeLaVariable(index, [importe], 'carte-gap').map((entree) => entree.occurrence.variants), [['Size=Small', 'Size=Large']]);
  assert.deepEqual(occurrencesDeLaVariable(index, [importe], 'papier'), []);
  // Une couleur égale ne suffit pas : papier vaut la même couleur dans les deux modes sans être citée.
  assert.equal(couleur('#F7F8FA').nature, 'couleur');
});

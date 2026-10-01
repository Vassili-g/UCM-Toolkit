/**
 * L'intégration des contrats et de `tokens.json`. Les règles reprises des
 * lecteurs Node du kit rendent ici les mêmes verdicts qu'eux, sur les mêmes
 * entrées : la fenêtre de version, le relevé des références et l'index DTCG.
 * Les contrats de test sont fabriqués en code.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { CONTRACT_VERSION } from '@ucm-kit/core/format';
import { collecterReferences, indexerTokensDtcg, sansEchantillon, verdictDeVersion } from '@ucm-kit/core/lecteurs';
import { joinTokenPath } from 'ucm-plugin-socle/src/cheminsDeTokens';

import {
  TAILLE_MAXIMALE_D_UN_FICHIER,
  cheminPublie,
  classerImport,
  correspondance,
  ecartsAvecLExport,
  feuillesDtcg,
  occurrencesDeLaVariable,
  occurrencesDuContrat,
  variablesParChemin,
  versionDeContratLue,
  type ContratImporte,
  type TokensImportes,
} from '../src/integrations/contrats';
import { indexer } from '../src/indexation';
import { constructeur, couleur, nombre, projetLibre } from './fixtures';

function contrat(version = CONTRACT_VERSION): Record<string, unknown> {
  return {
    name: 'Card',
    meta: { contractVersion: version, warnings: ['{interface.ne.compte.pas}'] },
    figmaVariantLabels: { axes: { size: 'Size' }, values: { size: { s: 'Small', l: 'Large' } } },
    viewStructures: { s0: { children: [] } },
    viewPaintPlacements: { p0: { background: { token: '{interface.card.fill}' } } },
    variantViews: { v0: { structure: 's0', paintPlacements: 'p0' }, v1: { structure: 's0' } },
    variants: [
      { nodeId: '1:1', values: { size: 's' }, view: 'v0', tokens: { gap: '{interface.card.gap}' } },
      { nodeId: '1:2', values: { size: 'l' }, view: 'v1', tokens: { gap: '{interface.card.gap}' } },
    ],
    samples: { texte: '{interface.card.fill}', libelle: '{montant.total}' },
  };
}

test('la fenêtre de version rend les verdicts du kit', () => {
  const [majeure] = CONTRACT_VERSION.split('.').map(Number);
  const essais = ['0.1', `${majeure - 2}.9`, `${majeure - 1}.0`, `${majeure - 1}.7`, CONTRACT_VERSION, `${majeure}.1`, `${majeure + 1}.0`, 'abc', '14'];
  for (const version of essais) assert.equal(versionDeContratLue(version), verdictDeVersion(version), version);
});

test('le relevé des références rend l’ensemble du kit, échantillons et méta exclus', () => {
  const brut = contrat();
  const notre = new Set(occurrencesDuContrat(brut).map((occurrence) => occurrence.reference));
  assert.deepEqual([...notre].sort(), [...collecterReferences(sansEchantillon(brut))].sort());
  assert.equal(notre.has('{montant.total}'), false);
});

test('chaque référence est située : adresse, variants concernés et propriété', () => {
  const occurrences = occurrencesDuContrat(contrat());
  assert.deepEqual(occurrences.map((occurrence) => [occurrence.adresse, occurrence.variants, occurrence.propriete]), [
    ['viewPaintPlacements.p0.background.token', ['Size=Small'], 'token'],
    ['variants[0].tokens.gap', ['Size=Small'], 'gap'],
    ['variants[1].tokens.gap', ['Size=Large'], 'gap'],
  ]);
});

test('l’index DTCG rend les chemins et les types hérités du kit', () => {
  const document = { $extensions: { 'com.ucm.formatVersion': 2 }, interface: { $type: 'color', card: { fill: { $value: '{couleurs.surface}' } } }, mesures: { zero: { $value: 0, $type: 'number' } } };
  const notre = feuillesDtcg(document);
  const kit = indexerTokensDtcg(document) as Map<string, { $type?: string }>;
  assert.deepEqual([...notre.keys()].sort(), [...kit.keys()].sort());
  for (const [chemin, feuille] of notre) assert.equal(feuille.$type, kit.get(chemin)?.$type, chemin);
});

test('un import trop grand, illisible, inconnu ou d’une version refusée est refusé sans rien ajouter', () => {
  assert.deepEqual(classerImport('a.json', ' '.repeat(TAILLE_MAXIMALE_D_UN_FICHIER + 1), 0), { refus: { raison: 'taille', limite: 20 } });
  assert.deepEqual(classerImport('a.json', '{}', 50 * 1024 * 1024), { refus: { raison: 'ensemble', limite: 50 } });
  assert.deepEqual(classerImport('a.json', '{ casse', 0), { refus: { raison: 'illisible' } });
  assert.deepEqual(classerImport('a.json', '{"x": 1}', 0), { refus: { raison: 'inconnu' } });
  assert.deepEqual(classerImport('a.json', JSON.stringify(contrat('2.0')), 0), { refus: { raison: 'version', version: '2.0' } });
  assert.deepEqual(classerImport('a.json', JSON.stringify({ $extensions: { 'com.ucm.formatVersion': 99 }, a: { $value: 1 } }), 0), { refus: { raison: 'version', version: '99' } });
  const accepte = classerImport('card.contract.json', JSON.stringify(contrat()), 0);
  assert.ok('import' in accepte && accepte.import.genre === 'contrat' && accepte.import.composant === 'Card');
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
  const trouvees = occurrencesDeLaVariable(index, [importe], 'carte-gap');
  assert.deepEqual(trouvees.map((entree) => entree.occurrence.adresse), ['variants[0].tokens.gap', 'variants[1].tokens.gap']);
  assert.deepEqual(occurrencesDeLaVariable(index, [importe], 'papier'), []);
  // Une couleur égale ne suffit pas : papier vaut la même couleur dans les deux modes sans être citée.
  assert.equal(couleur('#F7F8FA').nature, 'couleur');
});

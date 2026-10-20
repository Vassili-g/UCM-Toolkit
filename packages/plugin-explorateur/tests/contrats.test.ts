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
import { joinTokenPath } from '@ucm-kit/core/format';

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
import { convertirValeur } from '../src/lecture';
import type { Releve, TypeDeVariable, ValeurSource } from '../src/modele';
import { alias, constructeur, couleur, nombre, projetLibre, texte } from './fixtures';
import { releveDesLimitesDExport, tokensDesLimitesDExport } from './fixturesDesLimites';

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
  assert.deepEqual(ecartsAvecLExport(index, 'carte-fond', tokens.feuilles.get('interface.card.fill')!), { ecarts: [], limites: [] });
  assert.deepEqual(ecartsAvecLExport(index, 'espace-carte', tokens.feuilles.get('mesures.spacing.card')!), { ecarts: [{ ecart: 'valeur', mode: 'Confort' }], limites: [] });
  assert.deepEqual(ecartsAvecLExport(index, 'encre', tokens.feuilles.get('couleurs.encre')!), { ecarts: [{ ecart: 'mode', mode: 'Nuit' }], limites: [] });
});

/** Une variable seule dans une collection `Tokens` à ses modes, pour comparer une valeur à une feuille publiée. */
function variableSeule(type: TypeDeVariable, valeurs: Record<string, ValeurSource>, modes = Object.keys(valeurs), espace?: Releve['espace']) {
  const c = constructeur('Comparaison');
  c.collection('t', 'Tokens', modes);
  c.variable('x', 't', 'x', type, valeurs);
  return indexer(espace ? { ...c.releve(), espace } : c.releve());
}

const feuille = ($type: string | undefined, $value: unknown, modes?: Record<string, unknown>) => ({ ...($type ? { $type } : {}), $value, ...(modes ? { $extensions: { 'com.ucm.modes': modes } } : {}) });
const compare = (index: ReturnType<typeof indexer>, publiee: ReturnType<typeof feuille>) => ecartsAvecLExport(index, 'x', publiee);

test('[C02-courbe] deux courbes différentes ne passent pas pour égales ; deux courbes identiques sont égales', () => {
  const courbe = convertirValeur({ type: 'CUSTOM_CUBIC_BEZIER', easingFunctionCubicBezier: { x1: 0.1, y1: 0.2, x2: 0.3, y2: 0.4 } });
  const index = variableSeule('EASING', { M: courbe });
  assert.deepEqual(compare(index, feuille('cubicBezier', [0.9, 0.8, 0.7, 0.6])), { ecarts: [{ ecart: 'valeur', mode: 'M' }], limites: [] });
  assert.deepEqual(compare(index, feuille('cubicBezier', [0.1, 0.2, 0.3, 0.4])), { ecarts: [], limites: [] });
});

test('une courbe de Figma sans points de contrôle est une limite, jamais une égalité', () => {
  const index = variableSeule('EASING', { M: convertirValeur({ type: 'EASE_IN' }) });
  assert.deepEqual(compare(index, feuille('cubicBezier', [0.4, 0, 1, 1])), { ecarts: [], limites: [{ cause: 'courbe-sans-points', mode: 'M' }] });
});

test('[espace-ignore] la même couleur en Display P3 et en sRGB ne passe pas pour égale', () => {
  const canaux = { colorSpace: 'display-p3', components: [128 / 255, 64 / 255, 32 / 255], alpha: 1 };
  const srgb = variableSeule('COLOR', { M: couleur('#804020') });
  assert.deepEqual(compare(srgb, feuille('color', canaux)), { ecarts: [{ ecart: 'valeur', mode: 'M' }], limites: [] });
  const p3 = variableSeule('COLOR', { M: couleur('#804020') }, ['M'], 'display-p3');
  assert.deepEqual(compare(p3, feuille('color', canaux)), { ecarts: [], limites: [] });
  assert.deepEqual(compare(p3, feuille('color', { ...canaux, colorSpace: 'srgb' })), { ecarts: [{ ecart: 'valeur', mode: 'M' }], limites: [] });
});

test('un relevé sans espace compare ses couleurs en sRGB', () => {
  const index = variableSeule('COLOR', { M: couleur('#804020') });
  assert.equal(index.releve.espace, undefined);
  assert.deepEqual(compare(index, feuille('color', { colorSpace: 'srgb', components: [128 / 255, 64 / 255, 32 / 255], alpha: 1 })), { ecarts: [], limites: [] });
});

test('[unite-ignoree] une dimension en rem est une limite ; en px, elle se compare', () => {
  const index = variableSeule('FLOAT', { M: nombre(1) });
  assert.deepEqual(compare(index, feuille('dimension', { value: 1, unit: 'rem' })), { ecarts: [], limites: [{ cause: 'unite-relative', mode: 'M', detail: 'rem' }] });
  assert.deepEqual(compare(index, feuille('dimension', { value: 1, unit: 'vh' })), { ecarts: [], limites: [{ cause: 'unite-inconnue', mode: 'M', detail: 'vh' }] });
  assert.deepEqual(compare(index, feuille('dimension', { value: 1, unit: 'px' })), { ecarts: [], limites: [] });
  assert.deepEqual(compare(index, feuille('dimension', { value: 2, unit: 'px' })), { ecarts: [{ ecart: 'valeur', mode: 'M' }], limites: [] });
});

test('[duree-unite-ignoree] une durée se compare en secondes : 1 s diffère de 1 ms', () => {
  const index = variableSeule('TIMING', { M: nombre(1) });
  assert.deepEqual(compare(index, feuille('duration', { value: 1, unit: 's' })), { ecarts: [], limites: [] });
  assert.deepEqual(compare(index, feuille('duration', { value: 1, unit: 'ms' })), { ecarts: [{ ecart: 'valeur', mode: 'M' }], limites: [] });
  assert.deepEqual(compare(index, feuille('duration', { value: 1000, unit: 'ms' })), { ecarts: [], limites: [] });
});

test('[mode-non-lu] un mode sans valeur dans Figma est une limite, pas un mode sauté', () => {
  const c = constructeur('Comparaison');
  c.collection('t', 'Tokens', ['M', 'Dark']);
  c.variable('x', 't', 'x', 'FLOAT', { M: nombre(1) });
  const index = indexer(c.releve());
  const resultat = compare(index, feuille('number', 1, { m: 1, dark: 1 }));
  assert.deepEqual(resultat, { ecarts: [], limites: [{ cause: 'mode-sans-valeur', mode: 'Dark' }] });
});

test('chaque mode donne un seul résultat : égal, écart ou limite', () => {
  const index = variableSeule('FLOAT', { A: nombre(1), B: nombre(2), C: nombre(3), D: nombre(4) });
  const resultat = compare(index, feuille('dimension', { value: 1, unit: 'px' }, { a: { value: 1, unit: 'px' }, b: { value: 9, unit: 'px' }, c: { value: 1, unit: 'em' } }));
  assert.deepEqual(resultat, { ecarts: [{ ecart: 'valeur', mode: 'B' }, { ecart: 'mode', mode: 'D' }], limites: [{ cause: 'unite-relative', mode: 'C', detail: 'em' }] });
});

test('une forme que l’export ne décrit pas est une limite : forme inconnue, $type absent ou inconnu', () => {
  const index = variableSeule('FLOAT', { M: nombre(16) });
  assert.deepEqual(compare(index, feuille('dimension', '1rem')), { ecarts: [], limites: [{ cause: 'forme-inconnue', mode: 'M' }] });
  assert.deepEqual(compare(index, feuille(undefined, 16)), { ecarts: [], limites: [{ cause: 'forme-inconnue', mode: 'M' }] });
  assert.deepEqual(compare(index, feuille('number', null)), { ecarts: [], limites: [{ cause: 'forme-inconnue', mode: 'M' }] });
});

test('un écart de type arrête la comparaison des valeurs : aucun mode n’est dit égal', () => {
  const index = variableSeule('COLOR', { A: couleur('#804020'), B: couleur('#804020') });
  const resultat = compare(index, feuille('dimension', { value: 1, unit: 'px' }, { a: { value: 1, unit: 'px' } }));
  assert.deepEqual(resultat, { ecarts: [{ ecart: 'type' }, { ecart: 'mode', mode: 'B' }], limites: [] });
});

test('un alias avec opacité est une limite ; un alias vers un autre chemin est un écart', () => {
  const c = constructeur('Comparaison');
  c.collection('t', 'Tokens', ['M', 'N']);
  c.variable('cible', 't', 'cible', 'COLOR', { M: couleur('#804020'), N: couleur('#804020') });
  c.variable('x', 't', 'x', 'COLOR', { M: { nature: 'alias', cible: 'cible', opacite: 0.5 }, N: alias('cible') });
  const index = indexer(c.releve());
  assert.deepEqual(compare(index, feuille('color', '{tokens.cible}', { m: '{tokens.cible}', n: '{tokens.cible}' })), { ecarts: [], limites: [{ cause: 'alias-a-opacite', mode: 'M' }] });
  assert.deepEqual(compare(index, feuille('color', '{tokens.autre}', { m: '{tokens.cible}', n: '{tokens.autre}' })), { ecarts: [{ ecart: 'alias', mode: 'N' }], limites: [{ cause: 'alias-a-opacite', mode: 'M' }] });
});

test('une graisse numérique publiée en number se compare par le poids du nom de Figma', () => {
  const index = variableSeule('STRING', { A: texte('Bold'), B: texte('Regular'), C: texte('Fraktur') });
  const resultat = compare(index, feuille('number', 700, { a: 700, b: 700, c: 'Fraktur' }));
  assert.deepEqual(resultat, { ecarts: [{ ecart: 'valeur', mode: 'B' }], limites: [] });
});

test('le fichier de limites donne, pour chaque variable, la limite ou l’écart attendu dans chaque mode', () => {
  const index = indexer(releveDesLimitesDExport());
  const issue = classerImport('tokens.json', tokensDesLimitesDExport(), 0);
  assert.ok('import' in issue && issue.import.genre === 'tokens');
  if (!('import' in issue) || issue.import.genre !== 'tokens') return;
  const resultat = (variable: string) => ecartsAvecLExport(index, variable, issue.import.genre === 'tokens' ? issue.import.feuilles.get(`tokens.${variable}`)! : { $value: null });
  assert.deepEqual(resultat('egal'), { ecarts: [], limites: [] });
  assert.deepEqual(resultat('sans-valeur').limites, [{ cause: 'mode-sans-valeur', mode: 'Sombre' }]);
  assert.deepEqual(resultat('opacite').limites, [{ cause: 'alias-a-opacite', mode: 'Sombre' }]);
  assert.deepEqual(resultat('forme').limites, [{ cause: 'forme-inconnue', mode: 'Sombre' }]);
  assert.deepEqual(resultat('relative').limites, [{ cause: 'unite-relative', mode: 'Sombre', detail: 'rem' }]);
  assert.deepEqual(resultat('unite').limites, [{ cause: 'unite-inconnue', mode: 'Sombre', detail: 'vh' }]);
  assert.deepEqual(resultat('espace').limites, [{ cause: 'espace-inconnu', mode: 'Sombre', detail: 'oklch' }]);
  assert.deepEqual(resultat('courbe').limites, [{ cause: 'courbe-sans-points', mode: 'Sombre' }]);
  assert.deepEqual(resultat('mixte'), { ecarts: [{ ecart: 'valeur', mode: 'Clair' }], limites: [{ cause: 'unite-relative', mode: 'Sombre', detail: 'rem' }] });
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

/** L'exploration étendue : graphe local, relevés exportés et comparés, simulation en mémoire. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { grapheLocal, NOEUDS_MAXIMAUX } from '../src/graphe';
import { indexer } from '../src/indexation';
import { comparerReleves, exporterReleve, importerReleve } from '../src/releves';
import { resoudre } from '../src/resolution';
import { effetsDeLaSimulation, lireSaisie, simuler } from '../src/simulation';
import { alias, cinqCollections, constructeur, couleur, nombre, projetLibre } from './fixtures';

test('le graphe et la table rendent la même chaîne : les arêtes actives sont celles de resoudre', () => {
  const index = indexer(cinqCollections());
  const contexte = { theme: 'theme:Light', marque: 'marque:Beta' };
  const graphe = grapheLocal(index, 'theme-primary', contexte, new Set(['marque-500-clair', 'usage-surface']));
  const chaine = resoudre(index, 'theme-primary', contexte).etapes.map((etape) => etape.variable);
  const actives = graphe.aretes.filter((arete) => arete.active).map((arete) => `${arete.de}>${arete.vers}`);
  assert.deepEqual(actives, chaine.slice(0, -1).map((id, rang) => `${id}>${chaine[rang + 1]}`).filter((cle) => actives.includes(cle)));
  assert.ok(actives.includes('theme-primary>marque-500-clair'));
  assert.ok(actives.includes('marque-500-clair>vert-500'));
  assert.deepEqual(graphe.noeuds.filter((noeud) => noeud.colonne < 0).map((noeud) => noeud.id), ['usage-surface', 'bouton-fond']);
  // Une branche non déployée s'annonce déployable.
  assert.equal(graphe.noeuds.find((noeud) => noeud.id === 'marque-500-sombre')?.deployable, true);
});

test(`le premier affichage du graphe s’arrête à ${NOEUDS_MAXIMAUX} nœuds et compte le reste`, () => {
  const c = constructeur();
  c.collection('x', 'X', ['M']);
  c.variable('centre', 'x', 'centre', 'FLOAT', { M: nombre(1) });
  for (let rang = 0; rang < 260; rang += 1) c.variable(`d${rang}`, 'x', `d${rang}`, 'FLOAT', { M: alias('centre') });
  const graphe = grapheLocal(indexer(c.releve()), 'centre', {}, new Set());
  assert.equal(graphe.noeuds.length, NOEUDS_MAXIMAUX);
  assert.equal(graphe.masques, 61);
});

test('un relevé exporté puis importé garde références, contextes et provenance', () => {
  const releve = projetLibre();
  const relu = importerReleve(exporterReleve(releve));
  assert.ok('releve' in relu);
  if (!('releve' in relu)) return;
  assert.deepEqual(relu.releve.variables, releve.variables);
  assert.deepEqual(relu.releve.collections, releve.collections);
  assert.deepEqual(relu.releve.manquees, releve.manquees);
  assert.deepEqual(resoudre(indexer(relu.releve), 'carte-fond', {}), resoudre(indexer(releve), 'carte-fond', {}));
});

test('un relevé importé invalide est refusé, situé', () => {
  assert.deepEqual(importerReleve('{ casse'), { refus: 'illisible' });
  assert.deepEqual(importerReleve(JSON.stringify({ format: 'autre' })), { refus: 'format' });
  assert.deepEqual(importerReleve(JSON.stringify({ format: 'ucm-explorateur/releve', version: 99, releve: {} })), { refus: 'version', detail: '99' });
  const casse = JSON.parse(exporterReleve(projetLibre()));
  casse.releve.variables[0].valeurs = { m: { nature: 'alias' } };
  assert.deepEqual(importerReleve(JSON.stringify(casse)), { refus: 'format', detail: 'variables[0].valeurs' });
});

test('deux relevés se comparent par identité : un renommage reste un renommage, une cible et une valeur se distinguent', () => {
  const avant = projetLibre();
  const apres = {
    ...avant,
    variables: avant.variables.map((variable) => {
      if (variable.id === 'carte-fond') return { ...variable, nom: 'card/background' };
      if (variable.id === 'surface') return { ...variable, valeurs: { ...variable.valeurs, 'couleurs:Jour': alias('encre') } };
      if (variable.id === 'espace-carte') return { ...variable, valeurs: { ...variable.valeurs, 'mesures:Confort': nombre(32) } };
      return variable;
    }),
  };
  const comparaison = comparerReleves(apres, avant);
  assert.deepEqual(comparaison.ecarts.map((ecart) => `${ecart.nature}:${ecart.courante}`).sort(), ['cible:surface', 'renommee:carte-fond', 'valeur:espace-carte']);
  assert.deepEqual(comparaison.nonRapprochees, { courantes: [], autres: [] });
});

test('sans identité commune, la clé publiée rapproche ; un nom égal ne fait qu’une proposition', () => {
  const avant = projetLibre();
  const autreFichier = {
    ...avant,
    variables: avant.variables.map((variable) => ({ ...variable, id: `autre-${variable.id}`, cle: variable.id === 'papier' ? variable.cle : `autre-${variable.cle}` })),
  };
  const comparaison = comparerReleves(avant, autreFichier);
  assert.equal(comparaison.rapprochees.get('autre-papier')?.par, 'cle');
  assert.ok(comparaison.nonRapprochees.autres.includes('autre-surface'));
  assert.ok(comparaison.propositions.some((proposition) => proposition.autre === 'autre-surface' && proposition.courante === 'surface'));
  const confirmee = comparerReleves(avant, autreFichier, new Map([['autre-surface', 'surface']]));
  assert.equal(confirmee.rapprochees.get('autre-surface')?.par, 'designer');
});

test('une simulation valide change la copie, annonce ses effets, et l’original reste identique', () => {
  const original = projetLibre();
  const instantane = JSON.stringify(original);
  const index = indexer(original);
  const saisie = lireSaisie(index, 'COLOR', '#FF0000');
  assert.equal('nature' in saisie && saisie.nature, 'couleur');
  const issue = simuler(original, 'encre', 'couleurs:Nuit', saisie as never, {});
  assert.equal(issue.statut, 'simule');
  if (issue.statut !== 'simule') return;
  const effets = effetsDeLaSimulation(index, indexer(issue.releve), 'encre', {});
  assert.deepEqual(effets.map((effet) => effet.id).sort(), ['carte-fond', 'encre', 'entete-fond', 'surface', 'usage']);
  assert.equal(JSON.stringify(original), instantane);
});

test('une simulation refuse un autre type, une cible inconnue et un cycle', () => {
  const original = projetLibre();
  const index = indexer(original);
  assert.deepEqual(simuler(original, 'zero', 'mesures:Compact', couleur('#000000'), {}), { statut: 'refuse', raison: 'type' });
  assert.deepEqual(simuler(original, 'surface', 'couleurs:Nuit', alias('zero'), {}), { statut: 'refuse', raison: 'type' });
  assert.deepEqual(simuler(original, 'papier', 'couleurs:Jour', alias('carte-fond'), {}), { statut: 'refuse', raison: 'cycle' });
  assert.deepEqual(lireSaisie(index, 'FLOAT', 'douze'), { refus: 'valeur' });
  assert.deepEqual(lireSaisie(index, 'FLOAT', '12,5'), { nature: 'nombre', nombre: 12.5 });
  assert.deepEqual(lireSaisie(index, 'COLOR', 'Couleurs / encre'), { nature: 'alias', cible: 'encre' });
});

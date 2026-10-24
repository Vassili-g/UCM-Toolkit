/** Identités des constats du moteur, page du sujet analysé, sélection d'un nœud imbriqué. */
import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';

import { phraseDe, type PointACorriger } from 'ucm-plugin-socle/src/composant/contract/localisation';

import { constatsDuMoteur } from '../src/constatsDuMoteur';
import type { PluginMessage } from '../src/messages';
import { commencerUneAnalyse, pageDuNoeud, reinitialiserLAnalyse, surSelection } from '../src/sandbox/analyse';
import type { Contexte } from '../src/sandbox/contexte';

const point = (titre: string): PointACorriger => ({ famille: 'variables', titre, impact: 'Impact.', action: 'Action.' });

function moteurDans(points: readonly PointACorriger[]) {
  const phrases = points.map(phraseDe);
  return { warnings: phrases, parties: new Map(points.map((p, i) => [phrases[i], p])), localisations: new Map<string, string[]>() };
}

const idsParTitre = (points: readonly PointACorriger[]) => new Map(constatsDuMoteur(moteurDans(points)).map((c) => [c.faits.titre, c.id]));

beforeEach(() => reinitialiserLAnalyse());

test('défaut 6 : l’identifiant d’un point du moteur ne dépend pas de son rang', () => {
  const a = point('Layer « A » : son fill n’est relié à aucune variable.');
  const b = point('Layer « B » : son fill n’est relié à aucune variable.');
  const avant = idsParTitre([a, b]);
  const apres = idsParTitre([b, a]);
  assert.equal(avant.get(a.titre), apres.get(a.titre));
  assert.equal(avant.get(b.titre), apres.get(b.titre));
  assert.notEqual(avant.get(a.titre), avant.get(b.titre));
});

test('défaut 6 : deux points de même contenu reçoivent un suffixe dans l’ordre', () => {
  const moteur = moteurDans([point('Layer « A » : x.')]);
  const phrase = moteur.warnings[0];
  const double = { ...moteur, warnings: [phrase, `${phrase} `], parties: new Map([[phrase, point('Layer « A » : x.')], [`${phrase} `, point('Layer « A » : x.')]]) };
  const ids = constatsDuMoteur(double).map((c) => c.id);
  assert.equal(new Set(ids).size, 2);
  assert.equal(ids[1], `${ids[0]}:2`);
});

test('défaut 7 : la page du sujet est trouvée en remontant parent, sinon le repli', () => {
  const page = { type: 'PAGE', id: 'p' };
  const jeu = { type: 'COMPONENT_SET', parent: { type: 'FRAME', parent: page } };
  assert.equal(pageDuNoeud(jeu, 'courante'), page);
  assert.equal(pageDuNoeud({ type: 'COMPONENT_SET', parent: null }, 'courante'), 'courante');
});

test('défaut 9 : sélectionner un nœud imbriqué périme l’analyse, un variant non', () => {
  const envoyes: PluginMessage[] = [];
  const contexte = { figma: {}, envoyer: (m: PluginMessage) => envoyes.push(m), surveillerLeDocument() {} } as unknown as Contexte;
  commencerUneAnalyse('cle', ['jeu', 'variant', 'imbrique'], contexte, ['jeu', 'variant']);
  surSelection('variant', 'figma', contexte);
  assert.equal(envoyes.filter((m) => m.type === 'perime').length, 0);
  surSelection('imbrique', 'figma', contexte);
  assert.equal(envoyes.filter((m) => m.type === 'perime').length, 1);
});

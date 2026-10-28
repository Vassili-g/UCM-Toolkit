import assert from 'node:assert/strict';
import test from 'node:test';
import { FAMILLES_DE_SIGNES, REPRISES_DE_SIGNES, SIGNES, svgDuSigne } from '../src/referentiel/index.js';

test('les identifiants de signes sont uniques', () => {
  const ids = SIGNES.map((signe) => signe.id);
  assert.equal(new Set(ids).size, ids.length);
  const familles = FAMILLES_DE_SIGNES.map((famille) => famille.id);
  assert.equal(new Set(familles).size, familles.length);
});

test('chaque signe vise une famille existante et porte libellé, sens et mot', () => {
  const familles = new Set<string>(FAMILLES_DE_SIGNES.map((famille) => famille.id));
  for (const signe of SIGNES) {
    assert.ok(familles.has(signe.famille), signe.id);
    assert.ok(signe.libelle && signe.sens && signe.mot, signe.id);
  }
});

test('chaque famille a au moins un signe propre ou repris', () => {
  for (const famille of FAMILLES_DE_SIGNES) {
    const propres = SIGNES.filter((signe) => signe.famille === famille.id).length;
    const repris = REPRISES_DE_SIGNES.filter((reprise) => reprise.famille === famille.id).flatMap((reprise) => reprise.reprend).length;
    assert.ok(propres + repris > 0, famille.id);
  }
});

test('chaque reprise vise un signe existant d’une autre famille', () => {
  const familles = new Set<string>(FAMILLES_DE_SIGNES.map((famille) => famille.id));
  for (const reprise of REPRISES_DE_SIGNES) {
    assert.ok(familles.has(reprise.famille), reprise.famille);
    for (const repris of reprise.reprend) {
      const signe = SIGNES.find((candidat) => candidat.id === repris.id);
      assert.ok(signe, repris.id);
      assert.notEqual(signe.famille, reprise.famille, repris.id);
    }
  }
});

test('un tracé n’emploie que path, rect, circle et text', () => {
  for (const signe of SIGNES) {
    for (const [, balise] of signe.trace.matchAll(/<([a-zA-Z]+)/g)) {
      assert.ok(['path', 'rect', 'circle', 'text'].includes(balise!), `${signe.id} : <${balise}>`);
    }
  }
});

test('svgDuSigne rend un SVG de la taille demandée', () => {
  const svg = svgDuSigne('existe');
  assert.match(svg, /^<svg [^>]*viewBox="0 0 16 16"[^>]*>.*<\/svg>$/s);
  assert.match(svg, /width="16" height="16"/);
  assert.match(svgDuSigne('existe', 24), /width="24" height="24"/);
  assert.match(svg, /aria-hidden="true"/);
  assert.match(svgDuSigne('usage-fill'), /^<svg [^>]*><\/svg>$/);
});

test('svgDuSigne lève une erreur claire pour un identifiant inconnu', () => {
  assert.throws(() => svgDuSigne('nexiste-pas'), /Signe inconnu : « nexiste-pas »/);
});

test('le signe information, une note, range ce que l’analyse dit sans geste attendu', () => {
  const signe = SIGNES.find((candidat) => candidat.id === 'information');
  assert.equal(signe?.famille, 'proposition');
  assert.match(svgDuSigne('information'), /<path d="M3\.5 2h6\.5l2\.5 2\.5V14h-9z"\/>/);
});

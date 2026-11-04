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

test('le signe information est un rond à « i » et ignore un œil barré', () => {
  const signe = SIGNES.find((candidat) => candidat.id === 'information');
  assert.equal(signe?.famille, 'proposition');
  assert.match(svgDuSigne('information'), /<circle cx="8" cy="8" r="5\.8"\/><path d="M8 7\.2v4\.2"\/>/);
  assert.equal(SIGNES.find((candidat) => candidat.id === 'ignore')?.famille, 'proposition');
  assert.match(svgDuSigne('ignore'), /<circle cx="8" cy="8" r="1\.8"\/><path d="M2\.8 13\.2 13\.2 2\.8"\/>/);
});

test('les cinq signes propres au mode Tokens se rendent', () => {
  const attendus = { nom: /<text [^>]*>a\/b<\/text>/, valeurs: /M5\.6 6\.9h4\.8M5\.6 9\.1h4\.8/, couches: /M12\.8 13V3\.5/, types: /M8 9\.2l3\.2 5H4\.8z/, rangement: /M1\.8 4\.2a1 1 0 0 1 1-1h3\.4/ };
  for (const [id, motif] of Object.entries(attendus)) {
    assert.equal(SIGNES.find((signe) => signe.id === id)?.famille, 'rubrique-tokens', id);
    assert.match(svgDuSigne(id), motif, id);
  }
});

test('les dix catégories du mode Tokens ont un signe dans rubrique-tokens', () => {
  const propres = SIGNES.filter((signe) => signe.famille === 'rubrique-tokens').map((signe) => signe.id);
  const reprises = REPRISES_DE_SIGNES.filter((reprise) => reprise.famille === 'rubrique-tokens').flatMap((reprise) => reprise.reprend.map((repris) => repris.id));
  assert.deepEqual([...propres, ...reprises].sort(), ['a-creer', 'couches', 'cran', 'mode', 'nom', 'rangement', 'rompue', 'scope', 'types', 'valeurs']);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { FAMILLES_DE_SIGNES, POSE_DES_ALERTES, REPRISES_DE_SIGNES, SIGNES, TYPES_D_ALERTE, svgDuSigne } from '../src/referentiel/index.js';

const sansEmploi = (reprises: readonly { id: string; libelle: string }[] | undefined) => reprises?.map(({ id, libelle }) => ({ id, libelle }));

test('les identifiants de signes sont uniques', () => {
  const ids = SIGNES.map((signe) => signe.id);
  assert.equal(new Set(ids).size, ids.length);
  const familles = FAMILLES_DE_SIGNES.map((famille) => famille.id);
  assert.equal(new Set(familles).size, familles.length);
});

test('un tracé non vide appartient à un seul signe', () => {
  const proprietaires = new Map<string, string>();
  for (const signe of SIGNES) {
    if (!signe.trace) continue;
    assert.equal(proprietaires.get(signe.trace), undefined, `${signe.id} reprend le tracé de ${proprietaires.get(signe.trace)}`);
    proprietaires.set(signe.trace, signe.id);
  }
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

test('les propriétés reprennent les signes booléen, texte et slot avec leurs libellés', () => {
  assert.deepEqual(sansEmploi(REPRISES_DE_SIGNES.find((reprise) => reprise.famille === 'property')?.reprend), [
    { id: 'type-boolean', libelle: 'boolean property' },
    { id: 'text', libelle: 'text property' },
    { id: 'slot', libelle: 'slot property' },
  ]);
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

test('la famille interface porte quinze signes propres et reprend « différent » à écart', () => {
  const propres = SIGNES.filter((signe) => signe.famille === 'interface').map((signe) => signe.id);
  assert.deepEqual(propres, ['chevron', 'fermer', 'lien-externe', 'reglages', 'poignee', 'loupe', 'tout-replier', 'panneau-lateral', 'synchroniser', 'menu', 'ajouter', 'retirer', 'avant-apres', 'separateur', 'vide']);
  assert.deepEqual(sansEmploi(REPRISES_DE_SIGNES.find((reprise) => reprise.famille === 'interface')?.reprend), [{ id: 'ecart', libelle: 'différent' }]);
  assert.equal(FAMILLES_DE_SIGNES.find((famille) => famille.id === 'interface')?.teinte, null);
});

test('un signe à grille propre déclare sa grille dans le viewBox, les autres gardent 16', () => {
  assert.match(svgDuSigne('reglages'), /viewBox="0 0 512 512"/);
  assert.match(svgDuSigne('chevron'), /viewBox="0 0 16 16"/);
  assert.deepEqual(SIGNES.filter((signe) => signe.grille !== undefined).map((signe) => signe.id), ['reglages']);
});

test('aucune forme d’alerte du socle n’est recopiée dans SIGNES', () => {
  // Les cinq formes de packages/plugin-socle/src/ui/Alerte.ts restent au socle (R-8, QM-11).
  const formes = ['M4 .5h4L11.5 4v4L8 11.5H4L.5 8V4z', 'M6 .6l5.6 10.4H.4z', 'M3.3 6h5.4', 'M6 4.2v3.3', 'M6 5.2v3.6', 'M4.5 4.7a1.6 1.6 0 1 1 2.3 1.4c-.5.3-.8.6-.8 1.1', 'M3.4 6.1l1.8 1.8 3.5-3.7'];
  for (const signe of SIGNES) for (const forme of formes) assert.ok(!signe.trace.includes(forme), `${signe.id} recopie la forme ${forme}`);
});

test('la famille type-de-terme définit remplace et sans-regle, et reprend palette, component, question et applique', () => {
  const famille = FAMILLES_DE_SIGNES.find((candidat) => candidat.id === 'type-de-terme');
  assert.equal(famille?.teinte, 'regles');
  assert.deepEqual(SIGNES.filter((signe) => signe.famille === 'type-de-terme').map((signe) => signe.id), ['remplace', 'sans-regle']);
  assert.deepEqual(sansEmploi(REPRISES_DE_SIGNES.find((reprise) => reprise.famille === 'type-de-terme')?.reprend), [
    { id: 'palette', libelle: 'palette' },
    { id: 'component', libelle: 'composant' },
    { id: 'question', libelle: 'à trancher' },
    { id: 'applique', libelle: 'conforme' },
  ]);
});

test('les tracés de remplace et sans-regle sont ceux de l’icône de Nomenclature', () => {
  assert.equal(SIGNES.find((signe) => signe.id === 'remplace')?.trace, '<path d="M2.5 4.5h7M2.5 11.5h7M9.5 4.5 13 8l-3.5 3.5M13 8H6"/>');
  assert.equal(SIGNES.find((signe) => signe.id === 'sans-regle')?.trace, '<circle cx="8" cy="8" r="5.5" stroke-dasharray="2.2 2"/>');
});

test('chaque type d’alerte porte un repli texte brut et un repli de forge', () => {
  const attendus: Record<string, [string, string]> = {
    bloquant: ['✗', '❌'],
    corriger: ['⚠', '⚠️'],
    verifier: ['⚠', '⚠️'],
    info: ['ℹ', 'ℹ️'],
    tenu: ['✓', '✅'],
  };
  assert.deepEqual(TYPES_D_ALERTE.map((type) => type.id), Object.keys(attendus));
  for (const type of TYPES_D_ALERTE) assert.deepEqual([type.texte.brut, type.texte.forge], attendus[type.id], type.id);
});

test('chaque signe porte un emploi, et chaque reprise un emploi non vide quand elle en déclare un', () => {
  for (const signe of SIGNES) assert.ok(signe.emploi.trim(), `${signe.id} : emploi vide`);
  for (const reprise of REPRISES_DE_SIGNES) {
    for (const repris of reprise.reprend) assert.ok(repris.emploi === undefined || repris.emploi.trim(), `${reprise.famille}/${repris.id} : emploi vide`);
  }
});

test('un emploi ne désigne que des signes qui existent', () => {
  const ids = new Set(SIGNES.map((signe) => signe.id));
  const emplois = [...SIGNES.map((signe) => [signe.id, signe.emploi]), ...REPRISES_DE_SIGNES.flatMap((reprise) => reprise.reprend.map((repris) => [repris.id, repris.emploi ?? '']))];
  for (const [id, emploi] of emplois) {
    for (const [, cite] of emploi!.matchAll(/`([a-z0-9-]+)`/g)) assert.ok(ids.has(cite!), `${id} cite le signe inconnu « ${cite} »`);
  }
});

test('chaque famille et la pose des alertes décrivent fonction, tailles, teinte et nom accessible', () => {
  for (const pose of [...FAMILLES_DE_SIGNES.map((famille) => famille.pose), POSE_DES_ALERTES]) {
    for (const champ of ['fonction', 'tailles', 'teinte', 'nom'] as const) assert.ok(pose[champ].trim(), champ);
  }
  for (const famille of FAMILLES_DE_SIGNES) assert.ok(famille.pose.fonction.includes('socle') || famille.pose.fonction.includes('creer'), famille.id);
});

test('sept signes portent un glyphe, les autres aucun', () => {
  const attendus = { fermer: '×', 'avant-apres': '→', menu: '⋯', ajouter: '+', retirer: '−', separateur: '›', ecart: '≠' };
  assert.deepEqual(Object.fromEntries(SIGNES.filter((signe) => signe.glyphe !== undefined).map((signe) => [signe.id, signe.glyphe])), attendus);
  for (const id of ['fermer', 'avant-apres', 'menu', 'ajouter', 'retirer', 'separateur']) assert.equal(SIGNES.find((signe) => signe.id === id)?.famille, 'interface', id);
  assert.equal(SIGNES.find((signe) => signe.id === 'ecart')?.famille, 'etat-token');
});

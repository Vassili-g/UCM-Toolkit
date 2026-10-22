import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CRANS, FORMES_DES_CHEMINS, NUMEROS_DE_PALETTE, PLACES_DES_THEMES, PROFILS, REGISTRE_CRANS,
  cheminConforme, formesReconnues, porteeDeLaGrammaire, reconnaitreLeChemin,
  type PlaceDesThemes, type RoleDeSegment,
} from '../src/referentiel/index.js';

test('les numéros de palette sont les crans, puis 1000 et 1050, et le registre des crans reste à onze termes', () => {
  assert.deepEqual(NUMEROS_DE_PALETTE, [...CRANS, 1000, 1050]);
  assert.equal(REGISTRE_CRANS.termes.length, 11);
  assert.deepEqual(PLACES_DES_THEMES, ['chemin', 'modes']);
});

interface CasDeLaMatrice {
  readonly themes: PlaceDesThemes;
  readonly intensites: readonly string[];
  readonly forme: string;
  readonly roles: readonly RoleDeSegment[];
}

const CAS: readonly CasDeLaMatrice[] = [
  { themes: 'chemin', intensites: [], forme: 'primitives:color/palette/theme/cran', roles: ['famille', 'palette', 'theme', 'cran'] },
  { themes: 'chemin', intensites: PROFILS, forme: 'primitives:color/palette/intensite/theme/cran', roles: ['famille', 'palette', 'intensite', 'theme', 'cran'] },
  { themes: 'modes', intensites: [], forme: 'primitives:color/palette/cran', roles: ['famille', 'palette', 'cran'] },
  { themes: 'modes', intensites: PROFILS, forme: 'primitives:color/palette/intensite/cran', roles: ['famille', 'palette', 'intensite', 'cran'] },
];

/** Les noms que `planDesVariables` produit : un segment de thème dans le chemin, aucun en modes. */
function cheminsDe(cas: CasDeLaMatrice, numeros: readonly number[], ecriture: (segment: string) => string = (segment) => segment): string[][] {
  const themes = cas.themes === 'chemin' ? ['light', 'dark'] : [];
  return (cas.intensites.length ? cas.intensites : [null]).flatMap((intensite) => (themes.length ? themes : [null]).flatMap((theme) => numeros.map((numero) => [
    'color', 'Ocean', ...(intensite ? [intensite] : []), ...(theme ? [theme] : []), String(numero),
  ].map(ecriture))));
}

test('la matrice de Palettes est conforme : une ou deux intensités, onze ou treize nuances, thèmes dans le chemin ou en modes', () => {
  for (const cas of CAS) for (const numeros of [CRANS, NUMEROS_DE_PALETTE]) {
    for (const segments of cheminsDe(cas, numeros)) {
      const nom = `${cas.themes} ${cas.intensites.length} ${numeros.length} ${segments.join('/')}`;
      const reconnu = reconnaitreLeChemin('primitives', segments, { themes: cas.themes });
      assert.ok(reconnu.conforme, nom);
      assert.equal(reconnu.forme, cas.forme, nom);
      assert.deepEqual(reconnu.segments.map((segment) => segment.role), cas.roles, nom);
      assert.deepEqual(formesReconnues('primitives', segments, { themes: cas.themes }), [cas.forme], `une seule forme du contexte : ${nom}`);
    }
  }
});

test('la matrice reste conforme sous une autre casse', () => {
  for (const cas of CAS) for (const segments of cheminsDe(cas, NUMEROS_DE_PALETTE, (segment) => segment.toUpperCase())) {
    assert.ok(reconnaitreLeChemin('primitives', segments, { themes: cas.themes }).conforme, segments.join('/'));
  }
});

test('un segment dit son registre et son terme ; 1000, 1050 et un nom de palette n’ont pas de terme', () => {
  const reconnu = reconnaitreLeChemin('primitives', ['Color', 'Ocean', 'soft', 'dark', '1000'], { themes: 'chemin' });
  assert.ok(reconnu.conforme);
  assert.deepEqual(reconnu.segments, [
    { segment: 'Color', role: 'famille', registre: 'familles-primitives', terme: 'color' },
    { segment: 'Ocean', role: 'palette', registre: 'palettes' },
    { segment: 'soft', role: 'intensite', registre: 'profils', terme: 'soft' },
    { segment: 'dark', role: 'theme', registre: 'modes', terme: 'dark' },
    { segment: '1000', role: 'cran', registre: 'crans' },
  ]);
  const cran = reconnaitreLeChemin('primitives', ['color', 'Ocean', 'light', '950'], { themes: 'chemin' });
  assert.ok(cran.conforme);
  assert.equal(cran.segments[3].terme, '950');
});

test('color/Ocean/soft/50 en modes est une intensité, jamais un thème', () => {
  for (const segments of [['color', 'Ocean', 'soft', '50'], ['Color', 'Ocean', 'Soft', '50']]) {
    const reconnu = reconnaitreLeChemin('primitives', segments, { themes: 'modes' });
    assert.ok(reconnu.conforme, segments.join('/'));
    assert.equal(reconnu.forme, 'primitives:color/palette/intensite/cran');
    assert.equal(reconnu.segments[2].role, 'intensite');
  }
  assert.deepEqual(reconnaitreLeChemin('primitives', ['color', 'Ocean', 'soft', '50'], { themes: 'chemin' }), {
    conforme: false, raison: 'hors-contexte', forme: 'primitives:color/palette/intensite/cran',
  });
});

test('cheminConforme refuse un profil à la place d’un thème, en primitives comme en brands', () => {
  assert.equal(cheminConforme('primitives', ['color', 'Ocean', 'soft', '50']), false);
  assert.equal(cheminConforme('brands', ['primary', 'soft', '500']), false);
  assert.equal(cheminConforme('brands', ['primary', 'light', '500']), true);
  assert.equal(cheminConforme('utility', ['success', 'soft', 'light', '500']), true);
});

test('cheminConforme accepte 1000 et 1050 dans une palette de primitives', () => {
  for (const numero of ['1000', '1050']) {
    assert.equal(cheminConforme('primitives', ['color', 'Ocean', 'light', numero]), true, numero);
    assert.equal(cheminConforme('primitives', ['color', 'Ocean', 'soft', 'dark', numero]), true, numero);
  }
});

test('les contre-exemples ambigus rendent le contexte ou le rang fautif', () => {
  assert.deepEqual(reconnaitreLeChemin('primitives', ['color', 'Ocean', 'light', '50'], { themes: 'modes' }), {
    conforme: false, raison: 'hors-contexte', forme: 'primitives:color/palette/theme/cran',
  });
  assert.deepEqual(reconnaitreLeChemin('primitives', ['color', 'Ocean', '50'], { themes: 'chemin' }), {
    conforme: false, raison: 'hors-contexte', forme: 'primitives:color/palette/cran',
  });
  assert.deepEqual(reconnaitreLeChemin('primitives', ['color', 'Ocean', 'light', '1100'], { themes: 'chemin' }), {
    conforme: false, raison: 'aucune-forme', forme: 'primitives:color/palette/theme/cran', rang: 3, role: 'cran',
  });
  assert.deepEqual(reconnaitreLeChemin('primitives', ['color', 'Ocean', 'soft', 'vivid', '500'], { themes: 'chemin' }), {
    conforme: false, raison: 'aucune-forme', forme: 'primitives:color/palette/intensite/theme/cran', rang: 3, role: 'theme',
  });
  assert.deepEqual(reconnaitreLeChemin('primitives', ['inconnue', 'valeur'], { themes: 'chemin' }), {
    conforme: false, raison: 'aucune-forme', forme: 'primitives:dimension/valeur', rang: 0, role: 'famille',
  });
  assert.deepEqual(reconnaitreLeChemin('primitives', ['a', 'b', 'c', 'd', 'e', 'f'], { themes: 'chemin' }), { conforme: false, raison: 'aucune-forme' });
});

test('le thème garde 1000 pour la borne du neutre, et pas pour une palette', () => {
  assert.equal(cheminConforme('theme', ['neutral', 'scale', '1000']), true);
  assert.equal(cheminConforme('theme', ['primary', 'scale', '1000']), false);
  assert.equal(cheminConforme('theme', ['primary', 'scale', '950']), true);
  assert.equal(cheminConforme('brands', ['primary', 'light', '1000']), false);
  assert.equal(cheminConforme('utility', ['success', 'soft', 'light', '1050']), false);
});

test('les segments mal formés et les chemins inconnus sont refusés avec leur raison', () => {
  assert.deepEqual(reconnaitreLeChemin('components', ['button', 'colors'], { themes: 'chemin' }), { conforme: false, raison: 'aucune-forme' });
  for (const [segments, rang] of [
    [['color', '', 'light', '50'], 1], [['color', ' Ocean', 'light', '50'], 1], [['color', 'Oc.ean', 'light', '50'], 1], [['color', 'Ocean', 'light', 'a/b'], 3],
  ] as const) assert.deepEqual(reconnaitreLeChemin('primitives', segments, { themes: 'chemin' }), { conforme: false, raison: 'segment-mal-forme', rang });
  assert.deepEqual(formesReconnues('primitives', ['color', '', 'light', '50'], { themes: 'chemin' }), []);
});

test('les cas nommés de components gardent les positions présentes', () => {
  const cas = [
    ['button/color/primary/contained/hover/background', 'components:color', ['composant', 'famille', 'palette', 'style', 'etat', 'role']],
    ['button/size/md/padding-x', 'components:size', ['composant', 'famille', 'taille', 'propriete']],
    ['button/size/medium/padding-x', 'components:size', ['composant', 'famille', 'taille', 'propriete']],
    ['alert/color/danger/standard/foreground', 'components:color', ['composant', 'famille', 'palette', 'style', 'role']],
    ['alert/size/gap', 'components:size', ['composant', 'famille', 'propriete']],
    ['tilelink/color/info/hover/foreground', 'components:color', ['composant', 'famille', 'palette', 'etat', 'role']],
    ['stresstest/color/head/info/foreground', 'components:color', ['composant', 'famille', 'element', 'palette', 'role']],
  ] as const;
  for (const [chemin, forme, roles] of cas) {
    const segments = chemin.split('/');
    const reconnu = reconnaitreLeChemin('components', segments, { themes: 'chemin' });
    assert.equal(reconnu.conforme, true, chemin);
    if (!reconnu.conforme) continue;
    assert.equal(reconnu.forme, forme, chemin);
    assert.deepEqual(reconnu.segments.map((segment) => segment.role), roles, chemin);
    assert.deepEqual(formesReconnues('components', segments, { themes: 'chemin' }), [forme], chemin);
  }
  assert.equal(reconnaitreLeChemin('components', 'stresstest/info/head/color/text'.split('/'), { themes: 'chemin' }).conforme, false);
});

test('un segment à deux lectures demande les axes du composant', () => {
  const segments = 'button/color/text/foreground'.split('/');
  const sansAxes = reconnaitreLeChemin('components', segments, { themes: 'chemin' });
  assert.equal(sansAxes.conforme, false);
  if (sansAxes.conforme || sansAxes.raison !== 'ambigu') return assert.fail('deux lectures attendues');
  assert.deepEqual(sansAxes.lectures.map((lecture) => lecture.segments.map((segment) => segment.role)), [
    ['composant', 'famille', 'element', 'role'],
    ['composant', 'famille', 'style', 'role'],
  ]);
  const style = reconnaitreLeChemin('components', segments, { themes: 'chemin', axes: { style: ['text'] } });
  assert.ok(style.conforme);
  assert.deepEqual(style.segments.map((segment) => segment.role), ['composant', 'famille', 'style', 'role']);
  const element = reconnaitreLeChemin('components', segments, { themes: 'chemin', axes: { style: ['contained'] } });
  assert.ok(element.conforme);
  assert.deepEqual(element.segments.map((segment) => segment.role), ['composant', 'famille', 'element', 'role']);
});

test('layout distingue la taille d’icône des mesures de sizing', () => {
  assert.equal(reconnaitreLeChemin('layout', ['icon', 'xl'], { themes: 'chemin' }).conforme, true);
  assert.equal(reconnaitreLeChemin('layout', ['sizing', 'xl'], { themes: 'chemin' }).conforme, false);
  assert.equal(reconnaitreLeChemin('layout', ['sizing', '3,5'], { themes: 'chemin' }).conforme, true);
});

test('une forme sans themes vaut dans les deux contextes', () => {
  for (const themes of PLACES_DES_THEMES) {
    const reconnu = reconnaitreLeChemin('primitives', ['color', 'Ocean', 'white'], { themes });
    assert.ok(reconnu.conforme, themes);
    assert.equal(reconnu.forme, 'primitives:color/palette/couleur-absolue');
  }
  for (const formes of Object.values(FORMES_DES_CHEMINS)) for (const forme of formes) {
    if (forme.themes) assert.ok(forme.id.startsWith('primitives:'), `seules les formes de primitives dépendent de la place des thèmes : ${forme.id}`);
  }
});

test('la portée de la grammaire est la destination de référence, jamais une sortie libre', () => {
  assert.equal(porteeDeLaGrammaire('Primitives', ['Color']), 'reference');
  assert.equal(porteeDeLaGrammaire('primitives', ['color']), 'reference');
  for (const [collection, groupe] of [
    ['Primitives', ['palettes']], ['Primitives', []], ['Primitives', ['colors']], ['Primitives', ['color', 'brand']],
    ['Brand', ['color']], ['color-brands', ['color']], ['Autre', ['color']],
  ] as const) assert.equal(porteeDeLaGrammaire(collection, groupe), 'libre', `${collection}/${groupe.join('/')}`);
});

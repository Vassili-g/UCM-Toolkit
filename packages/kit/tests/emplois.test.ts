/**
 * Le vocabulaire commun de `@ucm-kit/core/emplois` : la table des emplois,
 * les dix-neuf paires, les rangs, la table des états, la collection `usage`
 * et le contraste à dix décimales (section 11.2 de la spécification d'UCM
 * Palettes, sections 4 et 5 d'ARCHITECTURE-FINALE).
 *
 * Les tables attendues sont recopiées des deux documents : les tests bouclent
 * sur elles et non sur le module, sans quoi une paire retirée retirerait son
 * propre test.
 */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  ASSOCIATIONS,
  CIBLE_DE_L_ETAT,
  CRANS_DES_EMPLOIS,
  PAIRES,
  RANGS,
  SUPPORT_DES_USAGES,
  TABLE_DES_EMPLOIS,
  associationDe,
  atteintLeSeuil,
  cleDeLAssociation,
  contraste,
  emploisDuCran,
  etatDeLaPaire,
  usagesDElevation,
  usagesDeLaPalette,
  usagesPropresAuNeutre,
  type MembrePaire,
} from '../src/emplois/index';

const ONZE = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

const EMPLOIS_11_2 = {
  solid: 700,
  'on-solid': 'fond',
  text: 700,
  surface: 100,
  'surface-card': 50,
  'border-control': 600,
  'border-decorative': 300,
  focus: 600,
};

/** Numéro, premier membre, second membre, seuil, puis les crans visés sur la liste de onze nuances. */
const TABLE_11_2: [number, string, string, 'texte' | 'nonTexte', number | 'fond', number | 'fond'][] = [
  [1, 'text', 'fond', 'texte', 700, 'fond'],
  [2, 'text', 'surface', 'texte', 700, 100],
  [3, 'text+1', 'surface+1', 'texte', 800, 200],
  [4, 'text+2', 'surface+2', 'texte', 900, 300],
  [5, 'on-solid', 'solid', 'texte', 'fond', 700],
  [6, 'on-solid', 'solid+1', 'texte', 'fond', 800],
  [7, 'on-solid', 'solid+2', 'texte', 'fond', 900],
  [8, 'border-control', 'fond', 'nonTexte', 600, 'fond'],
  [9, 'border-control', 'surface', 'nonTexte', 600, 100],
  [10, 'border-control+1', 'surface+1', 'nonTexte', 700, 200],
  [11, 'border-control+2', 'surface+2', 'nonTexte', 800, 300],
  [12, 'focus', 'fond', 'nonTexte', 600, 'fond'],
  [13, 'focus', 'surface', 'nonTexte', 600, 100],
  [14, 'solid+1', 'fond', 'nonTexte', 800, 'fond'],
  [15, 'text', 'surface-card', 'texte', 700, 50],
  [16, 'border-control', 'surface-card', 'nonTexte', 600, 50],
  [17, 'text+3', 'surface+3', 'texte', 950, 400],
  [18, 'on-solid', 'solid+3', 'texte', 'fond', 950],
  [19, 'border-control+3', 'surface+3', 'nonTexte', 900, 400],
];

const ecrire = (membre: MembrePaire) =>
  'fond' in membre ? 'fond' : `${membre.emploi}${membre.decalage ? `+${membre.decalage}` : ''}`;

test('[VER-03] la table des emplois est celle de la section 11.2', () => {
  assert.deepEqual(TABLE_DES_EMPLOIS, EMPLOIS_11_2);
});

test('[VER-03] les dix-neuf paires de la section 11.2, dans leur ordre : 17 à 19 suivent les seize autres', () => {
  assert.deepEqual(
    PAIRES.map((p) => [p.numero, ecrire(p.premier), ecrire(p.second), p.seuil]),
    TABLE_11_2.map(([numero, premier, second, seuil]) => [numero, premier, second, seuil]),
  );
});

test('[VER-05] les paires visent 400 et 950 : les crans que la validation exige, et la 50 facultative', () => {
  const vises = new Set(TABLE_11_2.flatMap(([, , , , a, b]) => [a, b]).filter((c) => c !== 'fond'));
  assert.deepEqual([...vises].sort((a, b) => (a as number) - (b as number)), [50, ...CRANS_DES_EMPLOIS]);
  assert.deepEqual(CRANS_DES_EMPLOIS, [100, 200, 300, 400, 600, 700, 800, 900, 950]);
});

test('[VER-05] sur la liste de onze nuances, chaque membre avancé vise le cran de la table', () => {
  const vise = (membre: MembrePaire): number | 'fond' => {
    if ('fond' in membre) return 'fond';
    const cible = TABLE_DES_EMPLOIS[membre.emploi];
    return cible === 'fond' ? 'fond' : ONZE[ONZE.indexOf(cible) + membre.decalage];
  };
  assert.deepEqual(
    PAIRES.map((p) => [vise(p.premier), vise(p.second)]),
    TABLE_11_2.map(([, , , , a, b]) => [a, b]),
  );
});

test('section 9.3 : chaque cran porte les emplois que la table lui confie, rangs compris', () => {
  const nommer = (rang: number) => emploisDuCran(ONZE, rang)
    .map(({ emploi, decalage }) => `${emploi}${decalage ? `+${decalage}` : ''}`);
  assert.deepEqual(Object.fromEntries(ONZE.map((cran, rang) => [cran, nommer(rang)])), {
    50: ['surface-card'],
    100: ['surface'],
    200: ['surface+1'],
    300: ['surface+2', 'border-decorative'],
    400: ['surface+3'],
    500: [],
    600: ['border-control', 'focus'],
    700: ['solid', 'text', 'border-control+1'],
    800: ['solid+1', 'text+1', 'border-control+2'],
    900: ['solid+2', 'text+2', 'border-control+3'],
    950: ['solid+3', 'text+3'],
  });
});

test('section 11.2 : les dix-neuf paires forment dix associations, avec leurs états', () => {
  const decrites = ASSOCIATIONS.map((association) => {
    const paires = PAIRES.filter((paire) => cleDeLAssociation(associationDe(paire)) === cleDeLAssociation(association));
    return `${cleDeLAssociation(association)} ${paires.map((paire) => `${paire.numero}:${etatDeLaPaire(paire)}`).join(',')}`;
  });
  assert.deepEqual(decrites, [
    'text/fond 1:0',
    'text/surface 2:0,3:1,4:2,17:3',
    'on-solid/solid 5:0,6:1,7:2,18:3',
    'border-control/fond 8:0',
    'border-control/surface 9:0,10:1,11:2,19:3',
    'focus/fond 12:0',
    'focus/surface 13:0',
    'solid/fond 14:1',
    'text/surface-card 15:0',
    'border-control/surface-card 16:0',
  ]);
});

test('D17 : quatre rangs, et l’état d’une paire est l’indice de son rang', () => {
  assert.deepEqual(RANGS, ['default', 'hover', 'active', 'active-hover']);
  assert.deepEqual([...new Set(PAIRES.map((paire) => RANGS[etatDeLaPaire(paire)]))], ['default', 'hover', 'active', 'active-hover']);
});

test('D17 : la table de l’état d’un composant vers son rang', () => {
  assert.deepEqual(CIBLE_DE_L_ETAT, {
    repos: { rang: 'default' },
    survol: { rang: 'hover' },
    appui: { rang: 'active' },
    selectionne: { rang: 'active' },
    'selectionne-survole': { rang: 'active-hover' },
    'selectionne-appuye': { rang: 'active-hover' },
    focus: { rang: 'default', anneau: 'focus' },
    desactive: { neutre: ['fill-disabled', 'text-disabled'] },
  });
});

test('D13 : une palette a vingt usages, dix-neuf sans la 50 ; le neutre vingt-trois ; l’élévation trois', () => {
  const primaire = usagesDeLaPalette('primary', ONZE);
  assert.equal(primaire.length, 20);
  assert.equal(usagesDeLaPalette('primary', ONZE.slice(1)).length, 19);
  assert.equal(usagesDeLaPalette('neutral', ONZE).length + usagesPropresAuNeutre().length, 23);
  assert.equal(usagesDElevation().length, 3);
  const nom = (chemin: readonly string[]) => chemin.join('.');
  assert.deepEqual(
    primaire.filter((usage) => usage.usage === 'solid').map((usage) => `${nom(usage.chemin)} → ${nom(usage.cible)}`),
    ['primary.solid.default → primary.700', 'primary.solid.hover → primary.800', 'primary.solid.active → primary.900', 'primary.solid.active-hover → primary.950'],
  );
  assert.deepEqual(
    primaire.filter((usage) => usage.rang === undefined).map((usage) => `${nom(usage.chemin)} → ${nom(usage.cible)}`),
    ['primary.on-solid → neutral.50', 'primary.surface-card → primary.50', 'primary.border-decorative → primary.300', 'primary.focus → primary.600'],
  );
});

test('D13 : un statut porte son intensité dans le chemin et dans la cible', () => {
  const surface = usagesDeLaPalette('success', ONZE, 'soft').find((usage) => usage.usage === 'surface' && usage.rang === 'default');
  assert.deepEqual(surface && [surface.chemin, surface.cible], [['success', 'soft', 'surface', 'default'], ['success', 'soft', '100']]);
});

test('D14 : les usages du neutre visent 900, 500 et 200, et chaque usage peint ce que la table dit', () => {
  assert.deepEqual(usagesPropresAuNeutre().map((usage) => usage.cible.join('.')), ['neutral.900', 'neutral.500', 'neutral.200']);
  const peint = (usage: keyof typeof SUPPORT_DES_USAGES) => SUPPORT_DES_USAGES[usage].peint.join(',');
  assert.equal(peint('solid'), 'background');
  assert.equal(peint('text'), 'foreground,icon');
  assert.equal(peint('border-control'), 'border');
  assert.equal(peint('focus'), 'ring');
  assert.deepEqual(SUPPORT_DES_USAGES.text.portees, ['TEXT_FILL', 'SHAPE_FILL']);
});

test('[MOT-21] [MOT-22] le contraste se compare au seuil sur son écriture à dix décimales', () => {
  assert.equal(contraste([0, 0, 0], [255, 255, 255]), 21);
  assert.equal(atteintLeSeuil(4.499, 4.5), false);
  assert.equal(atteintLeSeuil(4.5 - 1e-11, 4.5), true);
  assert.equal(atteintLeSeuil(4.35, 4.35), true);
});

test('le kit n’importe rien du moteur de couleur d’UCM Palettes', () => {
  const racine = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
  const fichiers = readdirSync(racine, { recursive: true, withFileTypes: true })
    .filter((entree) => entree.isFile() && /\.(ts|mjs)$/.test(entree.name))
    .map((entree) => join(entree.parentPath ?? entree.path, entree.name));
  assert.ok(fichiers.length > 20, `seuls ${fichiers.length} fichiers trouvés sous src/`);
  const importe = /(?:from|import)\s*\(?\s*['"]ucm-couleur/;
  assert.deepEqual(fichiers.filter((fichier) => importe.test(readFileSync(fichier, 'utf8'))), []);
});

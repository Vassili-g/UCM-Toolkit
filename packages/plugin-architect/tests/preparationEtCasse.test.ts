/** P2 (P27, 5.2) : la préparation reconnaît un composant et sa variable publiée quelle que soit la casse que le designer a écrite. */
import assert from 'node:assert/strict';
import test from 'node:test';

import type { CatalogueDeReference, LayerLu, ReleveDeComposant, VariableDuCatalogue } from '@ucm-kit/core/controles';
import { cheminComplet } from '@ucm-kit/core/controles';

import { liaisonsDeLaPreparation, type PreparationRangee } from '../src/preparations';
import { clesAChargerPourLeJeu } from '../src/sandbox/preparation';

const variable = (cle: string, nom: string, collection: string): VariableDuCatalogue => ({ cle, nom, collection, type: 'COLOR', etat: 'non-chargee', distante: true });

const catalogue: CatalogueDeReference = {
  version: 1,
  library: { nom: 'UCM', cle: 'lib' },
  collections: [
    { cle: 'c-composants', nom: 'components', role: 'components', modes: [], etat: 'lue' },
    { cle: 'c-tailles', nom: 'layout', role: 'layout', modes: [], etat: 'lue' },
    { cle: 'c-couleurs', nom: 'theme', role: 'theme', modes: [], etat: 'lue' },
  ],
  variables: [
    variable('v-button', 'Button/color/background', 'c-composants'),
    variable('v-icon-button', 'IconButton/color/background', 'c-composants'),
    variable('v-text-field', 'Text Field/color/border', 'c-composants'),
    variable('v-badge', 'components/Badge/color/background', 'c-composants'),
    variable('v-taille', 'radius/md', 'c-tailles'),
    variable('v-couleur', 'danger/soft/surface/default', 'c-couleurs'),
  ],
};

const JEUX = [
  { jeu: 'Button', cle: 'v-button' },
  { jeu: 'Icon Button', cle: 'v-icon-button' },
  { jeu: 'Text Field', cle: 'v-text-field' },
  { jeu: 'Badge', cle: 'v-badge' },
] as const;

for (const { jeu, cle } of JEUX) {
  test(`P2 : la préparation de « ${jeu} » charge sa variable et les tailles, et aucune variable d’un autre composant`, () => {
    assert.deepEqual(clesAChargerPourLeJeu(catalogue, jeu), [cle, 'v-taille']);
  });
}

test('P2 : un jeu écrit autrement que ses variables charge les mêmes variables', () => {
  assert.deepEqual(clesAChargerPourLeJeu(catalogue, 'TEXT FIELD'), ['v-text-field', 'v-taille']);
  assert.deepEqual(clesAChargerPourLeJeu(catalogue, 'iconbutton'), ['v-icon-button', 'v-taille']);
  assert.deepEqual(clesAChargerPourLeJeu(catalogue, 'Inconnu'), ['v-taille']);
});

const layer: LayerLu = {
  id: 'l1', nom: 'l1', type: 'FRAME', parent: null, visible: true, opacite: 1, dimensions: { x: 0, y: 0, largeur: 10, hauteur: 10 },
  peintures: [{ champ: 'fills', indice: 0, type: 'SOLID', visible: true, opacite: 1, blendMode: 'NORMAL', couleur: { r: 1, g: 0, b: 0, a: 1 } }],
  liaisons: [], valeursEnDur: [],
};
const releve: ReleveDeComposant = {
  version: 1, jeu: { cle: 'jeu-1', id: 'jeu-1', nom: 'Composant' }, proprietes: [],
  variants: [{ id: 'v1', nom: 'v1', valeurs: {}, modesEffectifs: {}, layers: [layer] }],
  lecture: { layersLus: 0, layersNonLus: 0, variantsNonLus: [], manquees: [] }, espaceDeCouleur: 'srgb',
};
const preparation = (nom: string): PreparationRangee => ({
  id: 'prep-1', creeLe: '2026-10-23T10:00:00.000Z',
  source: { fichier: 'Composants', cleDuFichier: 'abc', jeu: { cle: 'jeu-1', nom: 'Composant' } },
  variables: [{ nom, type: 'COLOR', cibles: { Light: 'theme/danger/soft/surface/default' }, layers: [{ id: 'l1', variant: 'v1', champ: 'fills', indice: 0 }] }],
  regles: [],
});

// La préparation écrit les chemins sous leur forme reconnue ; la library publie la casse du designer.
const CHEMINS = [
  { prepare: 'components/button/color/background', publie: 'Button/color/background', cle: 'v-button' },
  { prepare: 'components/icon-button/color/background', publie: 'IconButton/color/background', cle: 'v-icon-button' },
  { prepare: 'components/text-field/color/border', publie: 'Text Field/color/border', cle: 'v-text-field' },
  { prepare: 'components/badge/color/background', publie: 'components/Badge/color/background', cle: 'v-badge' },
] as const;

for (const { prepare, publie, cle } of CHEMINS) {
  test(`P2 : la liaison de « ${prepare} » trouve la variable publiée « ${publie} »`, () => {
    const collection = catalogue.collections[0];
    const publiees = new Map([[cheminComplet(publie, collection), cle]]);
    const rendu = liaisonsDeLaPreparation(preparation(prepare), releve, publiees);
    assert.deepEqual(rendu.enAttente, []);
    assert.deepEqual(rendu.corrections.map((correction) => [correction.sorte, correction.apres]), [['liaison', { cle, nom: prepare }]]);
  });
}

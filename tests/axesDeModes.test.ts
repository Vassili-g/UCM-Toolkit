/// <reference types="@figma/plugin-typings" />
/** Les adaptateurs de lecture et d’export transmettent les mêmes collections à la décision des axes du kit. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { deciderAxesDesCollections } from '@ucm-kit/core/format';
import { axesDeLExport, cheminsEnConflit, inventairePublie } from '@ucm-kit/core/nommage';

import { axesDesCollections } from '../packages/plugin-exporter/src/tokens/exportTokens';
import { inventaireDeLectures } from '../packages/plugin-socle/src/inventaireDeNoms';

/** Une collection du fichier inventé. `racine` en fait une extension de cette collection ; `modes` vaut 2 par défaut. */
interface Collection { readonly id: string; readonly nom: string; readonly modes?: number; readonly racine?: string }

/** Les objets que l'exporteur lit et que le socle reçoit du port de lecture : ceux de Figma, avec leurs modes. */
function objetsFigma(collections: readonly Collection[], noms: ReadonlyMap<string, string> = new Map()) {
  return collections.map(({ id, nom, modes, racine }) => {
    // Une extension a les modes de sa racine, et une racine absente du fichier en a deux.
    const nombre = modes ?? (racine ? collections.find((collection) => collection.id === racine)?.modes ?? 2 : 2);
    const liste = Array.from({ length: nombre }, (_, rang) => ({
      modeId: `${id}:${rang}`, name: `Mode ${rang}`, ...(racine ? { parentModeId: `${racine}:${rang}` } : {}),
    }));
    return {
      id, name: noms.get(id) ?? nom, remote: false, modes: liste, defaultModeId: liste[0]!.modeId, variableIds: [],
      ...(racine ? { isExtension: true, parentVariableCollectionId: racine, rootVariableCollectionId: racine, variableOverrides: {} } : {}),
    };
  });
}

/** Ce que l'export retient : l'identifiant de collection, la clé de l'axe et la présence de ses extensions. */
function axesDeLExporteur(objets: ReturnType<typeof objetsFigma>) {
  const { axes } = axesDesCollections(objets as unknown as VariableCollection[]);
  return [...axes].map(([id, axe]) => [id, { cle: axe.cle, extensions: axe.extensions.length > 0 }] as const);
}

/** Ce que le socle prévoit pour les mêmes objets, d'après l'inventaire que les plugins construisent. */
function axesDuSocle(objets: ReturnType<typeof objetsFigma>) {
  const inventaire = inventaireDeLectures(objets, [], { cibleAlias: () => undefined, protegee: () => false, palette: () => undefined });
  const collections = inventairePublie(inventaire, (entree) => entree.cible.collectionId).collections;
  const decision = deciderAxesDesCollections(collections);
  assert.deepEqual([...axesDeLExport(collections)], [...decision.axes]);
  return [...decision.axes];
}

/** Un axe est perdu quand l'export le retenait avant et plus après, ou qu'il en perd ses extensions. */
function perte(avant: ReturnType<typeof axesDeLExporteur>, apres: ReturnType<typeof axesDeLExporteur>): boolean {
  const restants = new Map(apres);
  return avant.some(([id, axe]) => {
    const reste = restants.get(id);
    return reste === undefined || (axe.extensions && !reste.extensions);
  });
}

const brand: Collection = { id: 'b', nom: 'Brand' };
const brandDark: Collection = { id: 'e', nom: 'Brand dark', racine: 'b' };

interface Cas { readonly titre: string; readonly collections: readonly Collection[]; readonly renommer: readonly (readonly [id: string, nom: string])[] }
const CAS: readonly Cas[] = [
  { titre: 'deux collections à deux modes, à la casse près (AUD-E2)', collections: [{ id: 'c', nom: 'Zorglub' }, { id: 'd', nom: 'Primitives' }], renommer: [['c', 'primitives']] },
  { titre: 'deux noms qui ne diffèrent que par les espaces de bord', collections: [{ id: 'c', nom: 'Zorglub' }, { id: 'd', nom: 'Primitives' }], renommer: [['c', ' Primitives ']] },
  { titre: 'deux renommages qui se rejoignent', collections: [{ id: 'c', nom: 'Un' }, { id: 'd', nom: 'Deux' }], renommer: [['c', 'zorglub'], ['d', 'Zorglub']] },
  { titre: 'un nom différent', collections: [{ id: 'c', nom: 'Zorglub' }, { id: 'd', nom: 'Primitives' }], renommer: [['c', 'Nouveau']] },
  { titre: 'une collection à un seul mode porte le nom visé', collections: [{ id: 'c', nom: 'Zorglub' }, { id: 'd', nom: 'Primitives', modes: 1 }], renommer: [['c', 'primitives']] },
  { titre: 'la collection renommée n\'a qu\'un seul mode', collections: [{ id: 'c', nom: 'Zorglub', modes: 1 }, { id: 'd', nom: 'Primitives' }], renommer: [['c', 'primitives']] },
  { titre: 'une collection déjà en collision avec une autre', collections: [{ id: 'c', nom: 'primitives' }, { id: 'd', nom: 'Primitives' }], renommer: [['c', 'PRIMITIVES']] },
  { titre: 'une troisième collection rejoint deux collections déjà en collision', collections: [{ id: 'c', nom: 'primitives' }, { id: 'd', nom: 'Primitives' }, { id: 'f', nom: 'Autre' }], renommer: [['f', 'Primitives']] },
  { titre: 'une collection quitte une collision', collections: [{ id: 'c', nom: 'primitives' }, { id: 'd', nom: 'Primitives' }], renommer: [['c', 'Autre']] },
  { titre: 'une racine à un seul mode, étendue par une extension locale', collections: [{ ...brand, modes: 1 }, brandDark, { id: 'd', nom: 'Zorglub' }], renommer: [['d', 'brand']] },
  { titre: 'une racine à un seul mode sans extension', collections: [{ ...brand, modes: 1 }, { id: 'd', nom: 'Zorglub' }], renommer: [['d', 'brand']] },
  { titre: 'le nom d\'une extension ne donne pas de clé d\'axe', collections: [brand, brandDark, { id: 'd', nom: 'Zorglub' }], renommer: [['e', 'zorglub']] },
  { titre: 'une extension dont la racine est dans une bibliothèque', collections: [{ ...brandDark, racine: 'ailleurs' }, { id: 'd', nom: 'Zorglub' }, { id: 'f', nom: 'Brand', modes: 1 }], renommer: [['d', 'brand']] },
  { titre: 'le nom que l\'export réserve aux extensions d\'un axe', collections: [brand, brandDark, { id: 'd', nom: 'Zorglub' }], renommer: [['d', 'Brand Extensions']] },
  { titre: 'la collection étendue reçoit le nom d\'un axe qui réserve ce nom', collections: [{ id: 'b', nom: 'Zorglub' }, brandDark, { id: 'd', nom: 'Brand extensions' }], renommer: [['b', 'Brand']] },
  { titre: 'le nom réservé aux extensions d\'une racine à un seul mode', collections: [{ ...brand, modes: 1 }, brandDark, { id: 'd', nom: 'Zorglub' }], renommer: [['d', 'brand-extensions']] },
  { titre: 'le nom réservé, sans extension à protéger', collections: [brand, { id: 'd', nom: 'Zorglub' }], renommer: [['d', 'Brand Extensions']] },
  { titre: 'un nom réservé qui existait déjà', collections: [brand, brandDark, { id: 'd', nom: 'Brand extensions' }], renommer: [['d', 'BRAND EXTENSIONS']] },
  { titre: 'une extension renommée du nom de sa racine', collections: [brand, brandDark], renommer: [['e', 'Brand']] },
];

for (const cas of CAS) {
  test(`axes de modes : le socle et l'exporteur retiennent les mêmes axes, avant et après (${cas.titre})`, () => {
    const noms = new Map(cas.renommer);
    const avant = objetsFigma(cas.collections);
    const apres = objetsFigma(cas.collections, noms);
    assert.deepEqual(axesDuSocle(avant), axesDeLExporteur(avant), 'avant le renommage');
    assert.deepEqual(axesDuSocle(apres), axesDeLExporteur(apres), 'après le renommage');
  });

  test(`axes de modes : le renommage est en cause quand l'export perd un axe ou ses extensions (${cas.titre})`, () => {
    const noms = new Map(cas.renommer);
    const avant = objetsFigma(cas.collections);
    const apres = objetsFigma(cas.collections, noms);
    const inventaire = inventairePublie(
      inventaireDeLectures(avant, [], { cibleAlias: () => undefined, protegee: () => false, palette: () => undefined }),
      (entree) => entree.cible.collectionId,
    );
    const enCause = cheminsEnConflit(inventaire, noms);
    assert.equal(enCause.length > 0, perte(axesDeLExporteur(avant), axesDeLExporteur(apres)), JSON.stringify(enCause));
  });
}

test('axes de modes : un nom sans préfixe écarte l\'axe, et le socle le prévoit', () => {
  const collections: Collection[] = [{ id: 'c', nom: 'Zorglub' }];
  const apres = objetsFigma(collections, new Map([['c', '$']]));
  assert.deepEqual(axesDuSocle(apres), axesDeLExporteur(apres));
  assert.deepEqual(axesDuSocle(apres), []);
});

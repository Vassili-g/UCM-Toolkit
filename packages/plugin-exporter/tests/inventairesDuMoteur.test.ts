/**
 * Le moteur lit le scan des règles et la liste locale des variables par les inventaires de la demande quand on les lui
 * donne, et seul quand on ne les donne pas : la sortie est la même, le nombre de lectures natives baisse (6.6).
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { creerInventairesDeLaDemande } from 'ucm-plugin-socle/src/composant/analyse/inventaires';
import { analyserLeComposant } from 'ucm-plugin-socle/src/composant/contract/exportComponent';
import { extractRules } from 'ucm-plugin-socle/src/composant/contract/extractRules';

import { node } from './aides/figmaFaux';

/** Un composant seul sur sa page, avec des lectures natives comptées. */
function monterUnComposant() {
  const lectures = { variables: 0, collections: 0, scans: 0 };
  const composant = node('COMPONENT', 'Root', [node('TEXT', 'Leaf', [], { characters: 'Suivant' })], { layoutMode: 'HORIZONTAL', componentPropertyDefinitions: {} });
  const page = node('PAGE', 'Page', [composant]);
  const parcourir = page.findAll;
  // `extractRules` balaye la page par `findAll` quand `findAllWithCriteria` manque : chaque scan en appelle un.
  page.findAll = (...arguments_: unknown[]) => { lectures.scans += 1; return (parcourir as (...valeurs: unknown[]) => unknown)(...arguments_); };
  const precedent = (globalThis as { figma?: unknown }).figma;
  (globalThis as { figma?: unknown }).figma = {
    currentPage: Object.assign(page, { selection: [composant] }),
    root: { name: 'Fichier' },
    fileKey: null,
    getStyleByIdAsync: async () => null,
    variables: {
      getLocalVariableCollectionsAsync: async () => { lectures.collections += 1; return []; },
      getLocalVariablesAsync: async () => { lectures.variables += 1; return []; },
      getVariableByIdAsync: async () => null,
      getVariableCollectionByIdAsync: async () => null,
    },
  };
  return { composant, page, lectures, restaurer: () => { (globalThis as { figma?: unknown }).figma = precedent; } };
}

/** Le contrat sans sa date ni le numéro que `node` donne à chaque calque : deux montages du même composant en diffèrent. */
const sansDate = (contenu: string) => contenu.replace(/"exportedAt":\s*"[^"]*"/, '"exportedAt": "-"').replace(/"(Root|Leaf)-\d+"/g, '"$1"');

test('avec les inventaires de la demande, le moteur lit la liste locale et le scan des règles une fois pour ses lecteurs', async () => {
  const { composant, page, lectures, restaurer } = monterUnComposant();
  try {
    const inventaires = creerInventairesDeLaDemande();
    // Ce qu'un autre lecteur de la demande a déjà lu : le catalogue du fichier, la lecture des règles d'Architect.
    await inventaires.variablesLocales(async () => (await (globalThis as { figma?: PluginAPI }).figma!.variables.getLocalVariablesAsync()));
    await inventaires.reglesDeLaPage(page, composant, () => extractRules(composant, page));
    const scansAvant = lectures.scans;
    assert.ok(scansAvant > 0);
    assert.deepEqual([lectures.variables, lectures.collections], [1, 0]);

    const resultat = await analyserLeComposant(async () => {}, { composant, page, inventaires });
    assert.equal(resultat.etat, 'complete');
    assert.equal(lectures.variables, 1, 'la liste locale lue avant le moteur est reprise');
    assert.equal(lectures.collections, 1, 'les collections, lues par le moteur seul, se lisent une fois');
    assert.equal(lectures.scans, scansAvant, 'le moteur ne scanne pas la page une seconde fois');

    const seul = monterUnComposant();
    try {
      const sans = await analyserLeComposant(async () => {}, { composant: seul.composant, page: seul.page });
      assert.equal(sans.etat, 'complete');
      assert.equal(seul.lectures.variables, 1);
      assert.equal(seul.lectures.collections, 1);
      assert.equal(seul.lectures.scans, scansAvant, 'sans inventaires, le moteur scanne la page lui-même, une fois');
      assert.equal(sansDate((sans as { export: { content: string } }).export.content), sansDate((resultat as { export: { content: string } }).export.content));
    } finally { seul.restaurer(); }
  } finally { restaurer(); }
});

test('deux analyses avec deux inventaires de demande lisent chacune la liste locale', async () => {
  const { composant, page, lectures, restaurer } = monterUnComposant();
  try {
    await analyserLeComposant(async () => {}, { composant, page, inventaires: creerInventairesDeLaDemande() });
    await analyserLeComposant(async () => {}, { composant, page, inventaires: creerInventairesDeLaDemande() });
    assert.deepEqual([lectures.variables, lectures.collections], [2, 2]);
  } finally { restaurer(); }
});

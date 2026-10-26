/**
 * Le budget de layers et le jeton d'annulation de l'analyse d'un composant.
 *
 * Le faux `figma` est un modèle : ces tests prouvent le câblage (qui est lu,
 * qui est compté, quand l'analyse s'arrête), pas la fidélité à Figma.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  analyserLeComposant,
  handleExportComponent,
} from 'ucm-plugin-socle/src/composant/contract/exportComponent';
import {
  BUDGET_DE_LAYERS_PAR_DEFAUT,
  bornerLesVariants, bornerLesVariantsParTranches,
} from 'ucm-plugin-socle/src/composant/contract/budget';
import {
  AnalyseAnnulee, calculerParTranches, dansUnePorteeDAnalyse, respirerSiBesoin,
} from 'ucm-plugin-socle/src/composant/contract/porteeDAnalyse';
import { compactVariants, compactVariantsParEtapes, signature, signatureParEtapes } from 'ucm-plugin-socle/src/composant/contract/compactVariants';
import { elideNeutrals, elideNeutralsParEtapes } from 'ucm-plugin-socle/src/composant/contract/elideNeutrals';
import { serializeJson, serializeJsonParEtapes } from 'ucm-plugin-socle/src/composant/contract/serializeJson';
import type { ExtractedContractVariant } from '@ucm-kit/core/format';
import { indexVariables, indexVariablesParEtapes } from 'ucm-plugin-socle/src/composant/variables';
import { getAllNodes, getAllNodesParEtapes, contientUneInstanceRendue, contientUneInstanceRendueParEtapes } from 'ucm-plugin-socle/src/composant/contract/exportableNodes';
import { buildVariantMatrix, buildVariantMatrixParEtapes, findMissingVariantCombinations, findMissingVariantCombinationsParEtapes } from 'ucm-plugin-socle/src/composant/contract/componentTree';
import { extractPropertyBindings, extractPropertyBindingsParEtapes } from 'ucm-plugin-socle/src/composant/contract/propertyBindings';
import { node } from './aides/figmaFaux';

const OPTIONS = ['A', 'B', 'C', 'D'];
const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id });

/** Un variant de 3 layers : lui, son texte et un cadre vide. */
function variant(valeur: string) {
  return node('COMPONENT', `Variant=${valeur}`, [
    node('TEXT', 'Label', [], { characters: 'Label' }),
    node('FRAME', 'Fond', []),
  ], {
    layoutMode: 'HORIZONTAL',
    primaryAxisAlignItems: 'MIN',
    counterAxisAlignItems: 'CENTER',
    variantProperties: { Variant: valeur },
    boundVariables: { itemSpacing: alias('gap') },
  });
}

function monterFigma() {
  const variants = OPTIONS.map(variant);
  const componentSet = node('COMPONENT_SET', 'Pastille', variants, {
    key: 'cle-pastille',
    componentPropertyDefinitions: {
      Variant: { type: 'VARIANT', variantOptions: OPTIONS, defaultValue: 'A' },
    },
    defaultVariant: variants[0],
  });
  const page = node('PAGE', 'Composants', [componentSet]);
  const collection = {
    id: 'collection',
    name: 'Tokens',
    defaultModeId: 'mode',
    modes: [{ modeId: 'mode', name: 'Défaut' }],
  };
  const gap = {
    id: 'gap',
    name: 'sizes/gap',
    variableCollectionId: 'collection',
    resolvedType: 'FLOAT',
    scopes: ['GAP'],
    valuesByMode: { mode: 8 },
  };
  const precedent = (globalThis as { figma?: unknown }).figma;
  (globalThis as { figma?: unknown }).figma = {
    currentPage: Object.assign(page, { selection: [componentSet] }),
    root: { name: 'Design System' },
    fileKey: null,
    getStyleByIdAsync: async () => null,
    variables: {
      getLocalVariableCollectionsAsync: async () => [collection],
      getLocalVariablesAsync: async () => [gap],
      getVariableByIdAsync: async () => null,
      getVariableCollectionByIdAsync: async () => collection,
    },
  };
  return () => { (globalThis as { figma?: unknown }).figma = precedent; };
}

/** Le contrat sans sa date : deux exports du même composant diffèrent par elle. */
const sansDate = (contenu: string) => contenu.replace(/"exportedAt":\s*"[^"]*"/, '"exportedAt": "-"');

test('le budget coopératif cède pendant 90 comptes de variants et garde le préfixe de la voie synchrone', async () => {
  let horloge = 0;
  let comptes = 0;
  const variants = Array.from({ length: 90 }, (_, rang) => ({
    component: { id: `v-${rang}`, findAll: () => { comptes += 1; horloge += 1; return []; } },
  })) as unknown as Parameters<typeof bornerLesVariants>[0];
  const cessions: number[] = [];
  const courant = await dansUnePorteeDAnalyse({
    horloge: () => horloge, budgetDeCalculMs: 25,
    respirer: async () => { cessions.push(comptes); },
  }, () => bornerLesVariantsParTranches(variants, variants[0].component, 50, () => {}));
  assert.equal(comptes, 90);
  assert.deepEqual(cessions, [25, 50, 75]);
  const reference = bornerLesVariants(variants, variants[0].component, 50, () => {});
  assert.deepEqual(courant, reference);
});

test('le budget interrompt son décompte dès le retour de la pause annulée', async () => {
  let horloge = 0;
  let comptes = 0;
  const jeton = { leve: false };
  const variants = Array.from({ length: 90 }, (_, rang) => ({
    component: { id: `v-${rang}`, findAll: () => { comptes += 1; horloge += 1; return []; } },
  })) as unknown as Parameters<typeof bornerLesVariants>[0];
  await assert.rejects(dansUnePorteeDAnalyse({
    jeton, horloge: () => horloge, budgetDeCalculMs: 25,
    respirer: async () => { jeton.leve = true; },
  }, () => bornerLesVariantsParTranches(variants, variants[0].component, 50, () => {})), AnalyseAnnulee);
  assert.equal(comptes, 25);
});

test('sans budget ni jeton, l’analyse rend la sortie de l’export, complète', async () => {
  const restaurer = monterFigma();
  try {
    const attendu = await handleExportComponent();
    const resultat = await analyserLeComposant();
    assert.equal(resultat.etat, 'complete');
    if (resultat.etat !== 'complete') return;
    assert.equal(sansDate(resultat.export.content), sansDate(attendu.content));
    assert.deepEqual(resultat.export.warnings, attendu.warnings);
    assert.equal(JSON.parse(resultat.export.content).variants.length, OPTIONS.length);
  } finally { restaurer(); }
});

test('un budget qui couvre tous les variants rend la même sortie, complète', async () => {
  const restaurer = monterFigma();
  try {
    const attendu = await handleExportComponent();
    const resultat = await analyserLeComposant(undefined, { budgetDeLayers: BUDGET_DE_LAYERS_PAR_DEFAUT });
    assert.equal(resultat.etat, 'complete');
    if (resultat.etat !== 'complete') return;
    assert.equal(sansDate(resultat.export.content), sansDate(attendu.content));
  } finally { restaurer(); }
});

test('un budget dépassé arrête la lecture des variants et compte les layers lus et non lus', async () => {
  const restaurer = monterFigma();
  try {
    // 3 layers par variant : 7 en laissent lire deux, et deux restent, soit 6 layers.
    const resultat = await analyserLeComposant(undefined, { budgetDeLayers: 7 });
    assert.equal(resultat.etat, 'partielle');
    if (resultat.etat !== 'partielle') return;
    assert.equal(resultat.lus, 6);
    assert.equal(resultat.nonLus, 6);
    const contrat = JSON.parse(resultat.export.content);
    assert.equal(contrat.variants.length, 2);
    // Rien n'est inventé pour la partie non lue : aucun point ne nomme les variants C et D.
    assert.ok(!resultat.export.warnings.some((message) => /Variant=[CD]/.test(message)));
  } finally { restaurer(); }
});

test('un budget plus petit que le variant de référence lit ce variant seul', async () => {
  const restaurer = monterFigma();
  try {
    const resultat = await analyserLeComposant(undefined, { budgetDeLayers: 1 });
    assert.equal(resultat.etat, 'partielle');
    if (resultat.etat !== 'partielle') return;
    assert.equal(resultat.lus, 3);
    assert.equal(resultat.nonLus, 9);
    assert.equal(JSON.parse(resultat.export.content).variants.length, 1);
  } finally { restaurer(); }
});

test('un compte impossible des variants non lus se dit inconnu', async () => {
  const restaurer = monterFigma();
  try {
    const set = (globalThis as any).figma.currentPage.selection[0];
    set.children[3].findAll = () => { throw new Error('illisible'); };
    const resultat = await analyserLeComposant(undefined, { budgetDeLayers: 7 });
    assert.equal(resultat.etat, 'partielle');
    if (resultat.etat !== 'partielle') return;
    assert.equal(resultat.lus, 6);
    assert.equal(resultat.nonLus, 'inconnu');
  } finally { restaurer(); }
});

test('un jeton levé pendant l’analyse la rend annulée, sans exception ni point', async () => {
  const restaurer = monterFigma();
  try {
    const jeton = { leve: false };
    const resultat = await analyserLeComposant(
      async (etape) => { if (etape.startsWith('Lecture des composants')) jeton.leve = true; },
      { jeton },
    );
    assert.deepEqual(resultat, { etat: 'annulee' });
  } finally { restaurer(); }
});

test('un jeton levé pendant le décompte du budget rend l’analyse annulée', async () => {
  const restaurer = monterFigma();
  try {
    const jeton = { leve: false };
    const set = (globalThis as any).figma.currentPage.selection[0];
    const findAll = set.children[1].findAll;
    set.children[1].findAll = (...args: unknown[]) => {
      jeton.leve = true;
      return findAll(...args);
    };
    const resultat = await analyserLeComposant(undefined, { jeton, budgetDeLayers: 7 });
    assert.deepEqual(resultat, { etat: 'annulee' });
  } finally { restaurer(); }
});

test('un jeton jamais levé laisse l’analyse aller au bout', async () => {
  const restaurer = monterFigma();
  try {
    const resultat = await analyserLeComposant(undefined, { jeton: { leve: false } });
    assert.equal(resultat.etat, 'complete');
  } finally { restaurer(); }
});

test('un point de respiration lève sur un jeton levé, avant la fin du budget de calcul', async () => {
  const jeton = { leve: false };
  await dansUnePorteeDAnalyse({ jeton }, async () => {
    await respirerSiBesoin();
    jeton.leve = true;
    await assert.rejects(respirerSiBesoin(), AnalyseAnnulee);
  });
});

for (const passe of ['signature', 'élision', 'compaction', 'sérialisation'] as const) {
  test(`${passe} découpe un bloc croissant et conserve la sortie synchrone`, async () => {
    for (const nombre of [128, 256]) {
      let lectures = 0;
      const bloc = { valeurs: Array.from({ length: nombre }, (_, rang) => ({ get valeur() { lectures += 1; return rang; } })) };
      const extrait = {
        nodeId: 'v', figmaName: 'Etat=Repos', values: { etat: 'repos' },
        structure: { children: Array.from({ length: nombre }, (_, rang) => ({ get slot() { lectures += 1; return `s${rang}`; } })) },
        typography: [], composes: [], icons: {}, paintPlacements: { fills: {}, strokes: {} },
      } as unknown as ExtractedContractVariant;
      const reference = () => passe === 'signature' ? signature(bloc)
        : passe === 'élision' ? elideNeutrals(bloc)
          : passe === 'compaction' ? compactVariants([extrait], []) : serializeJson({ catalogue: { entree: bloc } });
      const calcul = (): Generator<void, unknown> => passe === 'signature' ? signatureParEtapes(bloc)
        : passe === 'élision' ? elideNeutralsParEtapes(bloc)
          : passe === 'compaction' ? compactVariantsParEtapes([extrait], []) : serializeJsonParEtapes({ catalogue: { entree: bloc } });
      const attendu = reference();
      assert.equal(lectures, nombre);
      lectures = 0;
      const parEtapes = calcul();
      let avant = 0;
      let etape = parEtapes.next();
      while (!etape.done) {
        assert.ok(lectures - avant <= 1, `${passe}: ${lectures - avant} lectures dans une avancée`);
        avant = lectures;
        etape = parEtapes.next();
      }
      assert.deepEqual(etape.value, attendu);
      lectures = 0;
      let precedent = 0;
      const cessions: number[] = [];
      const courant = await dansUnePorteeDAnalyse({
        horloge: () => lectures, budgetDeCalculMs: 25,
        respirer: async () => {
          cessions.push(lectures);
          assert.ok(lectures - precedent <= 25);
          precedent = lectures;
        },
      }, () => calculerParTranches(calcul()));
      assert.deepEqual(courant, attendu);
      assert.equal(cessions[0], 25);
      assert.equal(lectures, nombre);
      lectures = 0;
      const jeton = { leve: false };
      await assert.rejects(dansUnePorteeDAnalyse({
        jeton, horloge: () => lectures, budgetDeCalculMs: 25,
        respirer: async () => { jeton.leve = true; },
      }, () => calculerParTranches(calcul())), AnalyseAnnulee);
      assert.equal(lectures, 25);
    }
  });
}

test('la fin du moteur conserve le contrat avec cessions et annule avant de le rendre', async () => {
  const restaurer = monterFigma();
  try {
    const attendu = await analyserLeComposant();
    assert.equal(attendu.etat, 'complete');
    if (attendu.etat !== 'complete') return;
    let ecriture = false;
    let horloge = 0;
    let cessions = 0;
    const annoncer = (message: string) => { if (message.startsWith('Écriture')) ecriture = true; };
    const courant = await analyserLeComposant(annoncer, {
      horloge: () => ecriture ? horloge++ : 0, budgetDeCalculMs: 25,
      respirer: async () => { assert.equal(ecriture, true); cessions += 1; },
    });
    assert.ok(cessions > 0);
    assert.equal(courant.etat, 'complete');
    if (courant.etat !== 'complete') return;
    assert.equal(sansDate(courant.export.content), sansDate(attendu.export.content));
    assert.deepEqual(courant.export.warnings, attendu.export.warnings);
    ecriture = false;
    horloge = 0;
    const jeton = { leve: false };
    const annule = await analyserLeComposant(annoncer, {
      jeton, horloge: () => ecriture ? horloge++ : 0, budgetDeCalculMs: 25,
      respirer: async () => { jeton.leve = true; },
    });
    assert.deepEqual(annule, { etat: 'annulee' });
  } finally { restaurer(); }
});

for (const passe of ['variables', 'calques', 'instances', 'liaisons', 'matrice', 'combinaisons'] as const) {
  test(`la passe ${passe} cède pendant 128 puis 256 lectures et conserve son résultat`, async () => {
    for (const nombre of [128, 256]) {
      let lectures = 0;
      const variables = Array.from({ length: nombre }, (_, rang) => ({
        id: `v${rang}`, variableCollectionId: 'c', get name() { lectures += 1; return `groupe/v${rang}`; },
      })) as Variable[];
      const enfants = Array.from({ length: nombre }, () => {
        const enfant = node(passe === 'instances' ? 'INSTANCE' : 'TEXT', `n`, [], { characters: 'Label' });
        Object.defineProperty(enfant, passe === 'liaisons' ? 'componentPropertyReferences' : 'visible', {
          get() { lectures += 1; return passe === 'liaisons' ? { characters: 'Label#1' } : passe !== 'instances'; },
        });
        return enfant;
      });
      const composant = node('COMPONENT', 'Seul', enfants);
      const matrice = { axes: [], variants: [{ component: composant, values: {} }] };
      const variants = Array.from({ length: nombre }, (_, rang) => {
        const variant = node('COMPONENT', `State=V${rang}, Size=M`);
        Object.defineProperty(variant, 'variantProperties', { get() { lectures += 1; return { State: `V${rang}`, Size: 'M' }; } });
        return variant;
      });
      const jeu = node('COMPONENT_SET', 'Jeu', variants, { componentPropertyDefinitions: {
        State: { type: 'VARIANT', defaultValue: 'V0', variantOptions: ['V0'] },
        Size: { type: 'VARIANT', defaultValue: 'M', variantOptions: ['M', 'L'] },
      } });
      const reference = () => passe === 'variables' ? indexVariables(variables, new Map())
        : passe === 'calques' ? getAllNodes(composant)
          : passe === 'instances' ? contientUneInstanceRendue(composant)
            : passe === 'matrice' ? buildVariantMatrix(jeu, new Map([['state', 'status']]))
              : passe === 'combinaisons' ? findMissingVariantCombinations(jeu)
            : extractPropertyBindings(matrice, new Map([['Label#1', 'label']]), []);
      const calcul = (): Generator<void, unknown> => passe === 'variables' ? indexVariablesParEtapes(variables, new Map())
        : passe === 'calques' ? getAllNodesParEtapes(composant)
          : passe === 'instances' ? contientUneInstanceRendueParEtapes(composant)
            : passe === 'matrice' ? buildVariantMatrixParEtapes(jeu, new Map([['state', 'status']]))
              : passe === 'combinaisons' ? findMissingVariantCombinationsParEtapes(jeu)
            : extractPropertyBindingsParEtapes(matrice, new Map([['Label#1', 'label']]), []);
      const attendu = reference();
      assert.equal(lectures, nombre);
      lectures = 0;
      let precedent = 0;
      const cessions: number[] = [];
      const courant = await dansUnePorteeDAnalyse({
        horloge: () => lectures, budgetDeCalculMs: 25,
        respirer: async () => { cessions.push(lectures); assert.ok(lectures - precedent <= 25); precedent = lectures; },
      }, () => calculerParTranches(calcul()));
      assert.deepEqual(courant, attendu);
      assert.equal(cessions[0], 25);
      lectures = 0;
      const jeton = { leve: false };
      await assert.rejects(dansUnePorteeDAnalyse({
        jeton, horloge: () => lectures, budgetDeCalculMs: 25, respirer: async () => { jeton.leve = true; },
      }, () => calculerParTranches(calcul())), AnalyseAnnulee);
      assert.equal(lectures, 25);
    }
  });
}

test('le moteur annule pendant son index des variables locales', async () => {
  const restaurer = monterFigma();
  try {
    const api = (globalThis as any).figma.variables;
    const [modele] = await api.getLocalVariablesAsync();
    let lectures = 0;
    api.getLocalVariablesAsync = async () => Array.from({ length: 256 }, (_, rang) => ({
      ...modele, id: `v${rang}`, get name() { lectures += 1; return `groupe/v${rang}`; },
    }));
    const jeton = { leve: false };
    const issue = await analyserLeComposant(undefined, {
      jeton, horloge: () => lectures, budgetDeCalculMs: 25, respirer: async () => { jeton.leve = true; },
    });
    assert.deepEqual(issue, { etat: 'annulee' });
    assert.equal(lectures, 25);
  } finally { restaurer(); }
});

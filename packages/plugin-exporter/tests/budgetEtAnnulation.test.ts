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
} from 'ucm-plugin-socle/src/composant/contract/budget';
import {
  AnalyseAnnulee, dansUnePorteeDAnalyse, respirerSiBesoin,
} from 'ucm-plugin-socle/src/composant/contract/porteeDAnalyse';
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

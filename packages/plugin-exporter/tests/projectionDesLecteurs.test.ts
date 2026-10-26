/**
 * Les champs que le moteur du socle et le budget lisent sur un même jeu de nœuds, dans l'ordre de première lecture, et
 * la sortie qu'ils en tirent. Ce fichier est l'oracle des cases du lot 6 qui déplacent l'acquisition : une lecture qui
 * change de champ, d'ordre ou de refus le fait échouer. Les lecteurs d'Architect ont le leur dans
 * `plugin-architect/tests/projectionDesLecteurs.test.ts`, sur un jeu équivalent.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import exporterLeComposant from 'ucm-plugin-socle/src/composant/contract/exportComponent';
import { bornerLesVariants } from 'ucm-plugin-socle/src/composant/contract/budget';
import type { VariantEntry } from 'ucm-plugin-socle/src/composant/contract/componentTree';

import { espionDeChamps } from './aides/accesDesChamps';
import { conteneurDeRegles, node } from './aides/figmaFaux';
import { sansDate } from './aides/parite';

const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id });
const noir = { r: 0, g: 0, b: 0, a: 1 };

/** Un nœud à l'identifiant stable : le compteur de `figmaFaux.node` dépend de l'ordre des tests du processus. */
const n = (type: string, nom: string, enfants: any[] = [], champs: any = {}) => node(type, nom, enfants, { id: nom, ...champs });

/**
 * Un jeu `Root` de deux variants. Chacun porte un auto layout lié, un fond lié, un texte sous style, un cadre masqué
 * qui porte une variable et une instance d'une dépendance contractée par un conteneur de règles.
 */
function monterLeJeu(observer = true) {
  const e = espionDeChamps();
  const voir = <T extends object>(objet: T): T => (observer ? e.espion(objet) : objet);
  const appels: string[] = [];
  const maitre = n('COMPONENT', 'Taille=Défaut', [n('TEXT', 'Leaf', [], { characters: 'Feuille' })], { layoutMode: 'HORIZONTAL' });
  const dependance = n('COMPONENT_SET', 'Branch', [maitre], { componentPropertyDefinitions: {}, defaultVariant: maitre });
  const variant = (taille: string) => {
    const f = (type: string, nom: string, enfants: any[], champs: any = {}) => n(type, nom, enfants, { id: `${nom}-${taille}`, ...champs });
    return n('COMPONENT', `Taille=${taille}`, [
    f('TEXT', 'Label', [], {
      getStyledTextSegments: (champs: string[]) => [{ start: 0, end: 1, ...Object.fromEntries(champs.map((champ) => [champ, null])) }],
      characters: taille, textStyleId: 'style-label', fills: [{ type: 'SOLID', color: noir, boundVariables: { color: alias('fond') } }],
      layoutSizingHorizontal: 'HUG', layoutSizingVertical: 'HUG',
    }),
    f('RECTANGLE', 'Fond', [], {
      fills: [{ type: 'SOLID', color: noir, boundVariables: { color: alias('fond') } }],
      cornerRadius: 4, boundVariables: { cornerRadius: alias('rayon') },
    }),
    f('FRAME', 'Archive', [
      f('RECTANGLE', 'Ancien fond', [], { boundVariables: { fills: [alias('fond')] } }),
    ], { visible: false }),
    f('INSTANCE', 'Branch A', [], {
      componentProperties: {}, layoutSizingHorizontal: 'HUG', layoutSizingVertical: 'HUG', opacity: 1,
      getMainComponentAsync: async () => maitre,
    }),
  ], {
    layoutMode: 'HORIZONTAL',
    primaryAxisAlignItems: 'MIN',
    counterAxisAlignItems: 'CENTER',
    itemSpacing: 8,
    variantProperties: { Taille: taille },
    boundVariables: { itemSpacing: alias('gap') },
    });
  };
  const variants = ['S', 'M'].map(variant);
  const racine = n('COMPONENT_SET', 'Root', variants, {
    key: 'cle-root',
    componentPropertyDefinitions: { Taille: { type: 'VARIANT', variantOptions: ['S', 'M'], defaultValue: 'S' } },
    defaultVariant: variants[0],
  });
  const page = n('PAGE', 'Composants', [racine, dependance, conteneurDeRegles('Branch'), conteneurDeRegles('Root')]);
  e.declarerLArbre(page);

  const collection = { id: 'collection', name: 'Tokens', defaultModeId: 'mode', modes: [{ modeId: 'mode', name: 'Défaut' }] };
  const variable = (id: string, name: string, resolvedType: string, valeur: unknown, scopes: string[]) => ({
    id, name, variableCollectionId: 'collection', resolvedType, scopes, valuesByMode: { mode: valeur },
  });
  const variables = [
    variable('gap', 'sizes/gap', 'FLOAT', 8, ['GAP']),
    variable('rayon', 'sizes/radius', 'FLOAT', 4, ['CORNER_RADIUS']),
    variable('fond', 'color/surface', 'COLOR', noir, ['ALL_FILLS']),
    variable('taille', 'font/size', 'FLOAT', 14, ['FONT_SIZE']),
    variable('graisse', 'font/weight', 'FLOAT', 500, ['FONT_WEIGHT']),
    variable('interligne', 'font/line-height', 'FLOAT', 20, ['LINE_HEIGHT']),
    variable('approche', 'font/letter-spacing', 'FLOAT', 0, ['LETTER_SPACING']),
    variable('police', 'font/family', 'STRING', 'Inter', ['FONT_FAMILY']),
  ];
  const styleDeTexte = e.declarerUnStyle({
    type: 'TEXT',
    name: 'Label/Medium',
    boundVariables: { fontFamily: alias('police'), fontSize: alias('taille'), fontWeight: alias('graisse'), lineHeight: alias('interligne'), letterSpacing: alias('approche') },
    fontName: { family: 'Inter', style: 'Regular' },
    textCase: 'ORIGINAL',
    textDecoration: 'NONE',
  });
  const noter = <A extends unknown[], R>(nom: string, appel: (...arguments_: A) => R) => (...arguments_: A): R => {
    appels.push(`${nom}(${arguments_.join(',')})`);
    return appel(...arguments_);
  };
  const precedent = (globalThis as { figma?: unknown }).figma;
  (globalThis as { figma?: unknown }).figma = {
    currentPage: voir(Object.assign(page, { selection: [racine] })),
    root: { name: 'Fichier', children: [voir(page)] },
    fileKey: null,
    getStyleByIdAsync: noter('getStyleByIdAsync', async (id: string) => (id === 'style-label' ? voir(styleDeTexte) : null)),
    variables: {
      getLocalVariableCollectionsAsync: noter('getLocalVariableCollectionsAsync', async () => [collection]),
      getLocalVariablesAsync: noter('getLocalVariablesAsync', async () => variables),
      getVariableByIdAsync: noter('getVariableByIdAsync', async () => null),
      getVariableCollectionByIdAsync: noter('getVariableCollectionByIdAsync', async () => collection),
    },
  };
  return { e, appels, racine, variants, page, restaurer: () => { (globalThis as { figma?: unknown }).figma = precedent; } };
}

test('le moteur lit ces champs dans cet ordre et en tire ce contrat', async () => {
  const jeu = monterLeJeu();
  let resultat: Awaited<ReturnType<typeof exporterLeComposant>>;
  try {
    resultat = await exporterLeComposant();
    assert.deepEqual(jeu.e.releverEtVider(), {
      PAGE: ['selection', 'findAllWithCriteria', 'findAll(filtre)', 'type', 'id', 'loadAsync', 'on'],
      COMPONENT_SET: ['type', 'name', 'componentPropertyDefinitions', 'children', 'defaultVariant', 'remote', 'parent', 'id', 'key'],
      COMPONENT: ['type', 'name', 'variantProperties', 'in findAll', 'findAllWithCriteria', 'findAll(filtre)', 'id', 'parent', 'remote', 'in children', 'children', 'componentPropertyReferences', 'boundVariables', 'fills', 'strokes', 'layoutMode', 'primaryAxisAlignItems', 'blendMode', 'isMask', 'dashPattern', 'layoutWrap', 'counterAxisSpacing', 'itemSpacing', 'paddingLeft', 'paddingTop', 'cornerRadius', 'topLeftRadius', 'layoutSizingHorizontal', 'layoutSizingVertical', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight', 'opacity', 'counterAxisAlignItems', 'rotation', 'effectStyleId', 'effects', 'in visible', 'visible'],
      INSTANCE: ['type', 'findOne(filtre)', 'findAll(filtre)', 'id', 'visible', 'parent', 'in visible', 'getMainComponentAsync()', 'name', 'componentPropertyReferences', 'layoutPositioning', 'layoutSizingHorizontal', 'layoutSizingVertical', 'layoutAlign', 'rotation', 'opacity', 'in children', 'children', 'componentProperties', 'overrides'],
      TEXT: ['characters', 'visible', 'parent', 'in visible', 'id', 'type', 'name', 'in children', 'children', 'componentPropertyReferences', 'boundVariables', 'fills', 'strokes', 'layoutMode', 'in findAll', 'findAll(filtre)', 'layoutPositioning', 'layoutSizingHorizontal', 'layoutSizingVertical', 'layoutAlign', 'rotation', 'blendMode', 'isMask', 'dashPattern', 'getStyledTextSegments(listOptions,textStyleOverrides)', 'textDecorationStyle', 'textDecorationOffset', 'textDecorationThickness', 'textDecorationColor', 'textDecorationSkipInk', 'openTypeFeatures', 'listSpacing', 'hangingList', 'hangingPunctuation', 'opacity', 'cornerRadius', 'topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight', 'effectStyleId', 'effects', 'textStyleId', 'textCase', 'textDecoration', 'textWrapStyle', 'leadingTrim', 'textAlignHorizontal', 'textAlignVertical', 'textTruncation'],
      RECTANGLE: ['visible', 'parent', 'in visible', 'id', 'boundVariables', 'type', 'componentPropertyReferences', 'fills', 'name', 'strokes', 'layoutMode', 'in findAll', 'findAll(filtre)', 'layoutPositioning', 'layoutSizingHorizontal', 'layoutSizingVertical', 'layoutAlign', 'layoutGrow', 'rotation', 'blendMode', 'isMask', 'dashPattern', 'opacity', 'in children', 'children', 'cornerRadius', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight', 'effectStyleId', 'effects'],
      FRAME: ['visible', 'componentPropertyReferences', 'boundVariables', 'parent', 'in visible', 'id', 'name', 'type', 'in children', 'children'],
      STYLE: ['type', 'name', 'boundVariables', 'paragraphSpacing', 'paragraphIndent', 'textCase', 'textDecoration', 'fontName', 'textWrapStyle', 'leadingTrim'],
    });
    assert.deepEqual(jeu.appels, ['getLocalVariableCollectionsAsync()', 'getLocalVariablesAsync()', 'getStyleByIdAsync(style-label)'], 'la typographie de référence et la typographie exacte partagent un seul appel par style');
  } finally {
    jeu.restaurer();
  }

  assert.deepEqual(resultat.warnings.map((message) => message.slice(0, 60)), [
    'Layer « .componentRules » : il ne contient aucune instance d',
    'Layer « Archive » : il est masqué, et aucune propriété boolé',
    'Règles d’usage : aucune règle @usage, @do, @dont ou @pairs n',
    'Layer « Fond » : la couleur {tokens.color.surface} peint ici',
    'horizontal padding : aucune variable Figma n’est reliée à ce',
    'vertical padding : aucune variable Figma n’est reliée à cett',
    'corner radius : aucune variable Figma n’est reliée à cette p',
    "Layer « Fond », width : aucune variable Figma n'est reliée. ",
    "Layer « Fond », height : aucune variable Figma n'est reliée.",
  ]);
  const contrat = JSON.parse(resultat.content);
  assert.deepEqual({
    nom: contrat.name, coverage: contrat.meta.coverage, figma: contrat.meta.figma, props: contrat.props, variants: contrat.variants,
    viewStructures: contrat.viewStructures, viewTypographies: contrat.viewTypographies, viewComposes: contrat.viewComposes,
    textStyles: contrat.textStyles, composes: contrat.composes, samples: contrat.samples,
  }, {
    nom: 'Root',
    coverage: { portable: 'partial' },
    figma: { fileName: 'Fichier', nodeId: 'Root', componentKey: 'cle-root' },
    props: { taille: { type: 'enum', values: ['s', 'm'] } },
    variants: [
      { nodeId: 'Taille=S', values: { taille: 's' }, tokens: { surface: '{tokens.color.surface}' }, view: 'v1', sample: 's1' },
      { nodeId: 'Taille=M', values: { taille: 'm' }, tokens: { surface: '{tokens.color.surface}' }, view: 'v1', sample: 's2' },
    ],
    viewStructures: {
      st1: {
        layout: 'flex-row', sizing: { width: 'stretch', height: 'stretch' }, justifyContent: 'flex-start', alignItems: 'center', gap: '{tokens.sizes.gap}',
        children: [{ slot: 'label', figmaLayer: 'Label' }, { slot: 'fond', figmaLayer: 'Fond', radius: '{tokens.sizes.radius}', optional: true }, { slot: 'branch-a', figmaLayer: 'Branch A', composes: 'Branch' }],
      },
    },
    viewTypographies: { ty1: [{ slotPath: ['label'], style: 'label.medium' }] },
    viewComposes: { cp1: [{ component: 'Branch', figmaLayer: 'Branch A' }] },
    textStyles: { 'label.medium': { figmaName: 'Label/Medium', tokens: { fontFamily: '{tokens.font.family}', fontSize: '{tokens.font.size}', fontWeight: '{tokens.font.weight}', lineHeight: '{tokens.font.line-height}', letterSpacing: '{tokens.font.letter-spacing}' } } },
    composes: [{ component: 'Branch', figmaLayer: 'Branch A' }],
    samples: {
      s1: { text: [{ slotPath: ['label'], figmaLayer: 'Label', value: 'S' }], composes: [{ figmaLayer: 'Branch A', component: 'Branch', slotPath: ['branch-a'] }] },
      s2: { text: [{ slotPath: ['label'], figmaLayer: 'Label', value: 'M' }], composes: [{ figmaLayer: 'Branch A', component: 'Branch', slotPath: ['branch-a'] }] },
    },
  });

  // L'espion ne change rien à ce que le moteur rend.
  const sansEspion = monterLeJeu(false);
  try {
    // Les conteneurs de règles tirent leur identifiant du compteur de `figmaFaux` : seules les sorties stables se comparent.
    const sans = await exporterLeComposant();
    assert.equal(sansDate(sans.content), sansDate(resultat.content));
    assert.deepEqual(sans.warnings, resultat.warnings);
  } finally {
    sansEspion.restaurer();
  }
});

test('le budget lit l’identifiant et le relevé natif de chaque variant, et en tire ce bilan', () => {
  const jeu = monterLeJeu();
  try {
    const variants = jeu.variants.map((component) => ({ component: jeu.e.espion(component) })) as unknown as VariantEntry[];
    const [premier] = variants;

    const large = bornerLesVariants(variants, premier.component, 100, () => {});
    assert.deepEqual([large.gardes.map((entry) => entry.component.id), large.bilan], [['Taille=S', 'Taille=M'], null]);
    const serre = bornerLesVariants(variants, premier.component, 7, () => {});
    assert.deepEqual([serre.gardes.map((entry) => entry.component.id), serre.bilan], [['Taille=S'], { lus: 6, nonLus: 6 }]);
    assert.deepEqual(jeu.e.releverEtVider(), { COMPONENT: ['in findAll', 'id', 'findAll(filtre)'] });
  } finally {
    jeu.restaurer();
  }
});

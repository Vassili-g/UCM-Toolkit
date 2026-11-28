// Classement de chaque propriété de l'API Plugin de Figma selon le §2.14 de la forme 15.0
// (« Données de rendu et limites de projection »). Lu par `couvertureFigma.test.ts`, qui
// compare cette table aux typages installés de `@figma/plugin-typings`.
//
// Une entrée désigne des types et des propriétés ; la première entrée qui reconnaît une paire
// (type, propriété) la classe, donc les cas particuliers précèdent les règles générales.
// `types: 'noeuds'` vise les 34 types de l'union `SceneNode` ; `proprietes: '*'` vise toutes
// celles du type. La table dit où le contrat 15.0 porte la propriété ou quelle perte il signale,
// et ne prouve pas que le moteur extrait le champ.

export type Classe = 'portable' | 'perte' | 'editeur' | 'tracabilite' | 'prototype' | 'sans-objet';

/** Les lignes de la table du §2.14, par un mot de leur première colonne. */
export type Ligne214 =
  | 'contour'
  | 'ombre'
  | 'scale'
  | 'variables-et-styles'
  | 'modes'
  | 'masque-et-fusion'
  | 'peinture'
  | 'geometrie'
  | 'typographie'
  | 'grilles-et-dimensionnement'
  | 'transformation-2d'
  | 'effet'
  | 'prototype-et-3d'
  | 'texte-sur-trace'
  | 'groupe-de-transformation';

export type Entree = {
  types: 'noeuds' | readonly string[];
  proprietes: '*' | readonly string[];
  classe: Classe;
  /** `portable` : le champ du contrat 15.0 qui porte la propriété. */
  champ?: string;
  /**
   * `portable` : ce que le champ ne conserve pas, dit par une perte du §2.14.
   * `perte` et `prototype` : le nom de la donnée du §2.14 ; absent, c'est le nom de la propriété.
   */
  donnee?: string;
  /** `perte` : la ligne du §2.14 qui l'exige. */
  ligne?: Ligne214;
  /** `sans-objet`, `editeur`, `tracabilite` : pourquoi le contrat ne la porte pas. */
  raison?: string;
};

/** Types de nœud qu'un composant Figma Design ne peut pas contenir. */
export const TYPES_HORS_COMPOSANT = [
  'SliceNode', 'StickyNode', 'ConnectorNode', 'ShapeWithTextNode', 'CodeBlockNode', 'StampNode',
  'WidgetNode', 'EmbedNode', 'LinkUnfurlNode', 'MediaNode', 'SectionNode', 'HighlightNode',
  'WashiTapeNode', 'TableNode', 'SlideNode', 'SlideRowNode', 'SlideGridNode',
  'InteractiveSlideElementNode',
] as const;

/** Structures que les propriétés d'un nœud contiennent, hors de l'union `SceneNode`. */
export const RACINES_DE_SOUS_STRUCTURES = {
  alias: ['Paint', 'Effect', 'LayoutGrid', 'VariableWidthStrokeProperties', 'ComplexStrokeProperties'],
  interfaces: ['StyledTextSegment', 'VectorNetwork', 'VectorVertex', 'VectorSegment', 'VectorPath', 'ArcData'],
} as const;

const TEXT_PATH = ['TextPathNode'] as const;
const TRANSFORM_GROUP = ['TransformGroupNode'] as const;
const PAINTS_NON_UNIES = ['GradientPaint', 'ImagePaint', 'VideoPaint', 'PatternPaint', 'ShaderPaint'] as const;
const OMBRES = ['DropShadowEffect', 'InnerShadowEffect'] as const;
const FLOUS = ['BlurEffectNormal'] as const;
const EFFETS_SANS_REPRESENTATION = [
  'BlurEffectProgressive', 'NoiseEffectMonotone', 'NoiseEffectDuotone', 'NoiseEffectMultitone',
  'TextureEffect', 'GlassEffect', 'ShaderEffect',
] as const;
const GRILLES = ['RowsColsLayoutGrid', 'GridLayoutGrid'] as const;
const TRACES = ['VectorNetwork', 'VectorVertex', 'VectorSegment', 'VectorPath', 'ArcData',
  'PresetVariableWidthStrokeProperties', 'CustomVariableWidthStrokeProperties', 'DynamicStrokeProperties',
  'StretchBrushProperties', 'ScatterBrushProperties'] as const;

const portable = (proprietes: readonly string[], champ: string, donnee?: string): Entree =>
  ({ types: 'noeuds', proprietes, classe: 'portable', champ, ...(donnee ? { donnee } : {}) });
const perte = (proprietes: readonly string[], ligne: Ligne214, donnee?: string): Entree =>
  ({ types: 'noeuds', proprietes, classe: 'perte', ligne, ...(donnee ? { donnee } : {}) });
const sansObjet = (proprietes: readonly string[], raison: string, classe: Classe = 'sans-objet'): Entree =>
  ({ types: 'noeuds', proprietes, classe, raison });
const toutEnPerte = (types: readonly string[], ligne: Ligne214): Entree =>
  ({ types, proprietes: '*', classe: 'perte', ligne });

export const TABLE: readonly Entree[] = [
  // Types que le contrat ne rencontre pas.
  { types: TYPES_HORS_COMPOSANT, proprietes: '*', classe: 'sans-objet',
    raison: 'FigJam, Slides, section ou zone d’export : un composant Design ne contient pas ce type' },

  // Types qui reçoivent une perte de calque (§2.14).
  { types: TEXT_PATH, proprietes: ['vectorPaths', 'textPathStartData'], classe: 'perte',
    ligne: 'texte-sur-trace', donnee: 'TEXT_PATH, vectorPaths, textPathStartData' },
  { types: TRANSFORM_GROUP, proprietes: ['transformModifiers'], classe: 'perte',
    ligne: 'groupe-de-transformation', donnee: 'transformModifiers' },

  // Sous-structures : peintures.
  { types: ['SolidPaint'], proprietes: ['type', 'color', 'boundVariables'], classe: 'portable',
    champ: 'tokens, viewPaintPlacements.fills ou strokes (peinture unie liée à une variable)' },
  { types: ['SolidPaint'], proprietes: ['visible', 'opacity', 'blendMode'], classe: 'perte', ligne: 'peinture' },
  toutEnPerte(PAINTS_NON_UNIES, 'peinture'),

  // Sous-structures : effets.
  { types: OMBRES, proprietes: ['type', 'color', 'offset', 'radius', 'spread', 'boundVariables'], classe: 'portable',
    champ: 'effectStyles.*.effects[] : color, offsetX, offsetY, blur, spread (références de tokens)',
    donnee: 'color absente : perte au chemin de la couleur dans effectStyles' },
  { types: OMBRES, proprietes: '*', classe: 'perte', ligne: 'effet' },
  { types: FLOUS, proprietes: ['type', 'radius', 'boundVariables'], classe: 'portable',
    champ: 'effectStyles.*.effects[] : layer-blur ou backdrop-blur, blur' },
  { types: FLOUS, proprietes: '*', classe: 'perte', ligne: 'effet' },
  toutEnPerte(EFFETS_SANS_REPRESENTATION, 'effet'),

  // Sous-structures : plages de texte, grilles, tracés.
  { types: ['StyledTextSegment'], proprietes: ['characters'], classe: 'portable',
    champ: 'samples.text (contenu indicatif)', donnee: 'plages de texte : style par plage' },
  toutEnPerte(['StyledTextSegment'], 'typographie'),
  toutEnPerte(GRILLES, 'grilles-et-dimensionnement'),
  toutEnPerte(TRACES, 'geometrie'),

  // Traçabilité : identité, noms, descriptions.
  sansObjet(['id', 'parent', 'name', 'type', 'removed', 'key', 'remote', 'description',
    'descriptionMarkdown', 'documentationLinks'],
  'identité, nom ou description : traçabilité (figmaName, nodeId), aucun rendu', 'tracabilite'),

  // Éditeur : aucun effet sur le dessin.
  sansObjet(['isAsset', 'locked', 'expanded', 'guides', 'annotations', 'devStatus', 'detachedInfo',
    'exportSettings', 'stuckNodes', 'attachedConnectors', 'inferredVariables', 'inferredAutoLayout',
    'instances', 'hasMissingFont', 'autoRename', 'limitViolations'],
  'propriété d’éditeur ou donnée dérivée : le contrat visuel ne change pas', 'editeur'),

  // Prototype, animations : perte signalée si présents.
  { types: 'noeuds', proprietes: ['reactions', 'overflowDirection', 'overlayPositionType', 'overlayBackground',
    'overlayBackgroundInteraction', 'animations', 'animationStyles', 'manualKeyframeTracks', 'timelines',
    'numberOfFixedChildren'], classe: 'prototype', ligne: 'prototype-et-3d' },

  // Données dérivées.
  sansObjet(['absoluteTransform', 'absoluteBoundingBox', 'absoluteRenderBounds'],
    'dérivée de relativeTransform, des dimensions et des effets, qui ont leur classement'),
  sansObjet(['resolvedVariableModes'], 'dérivée de explicitVariableModes et des modes de la page'),
  sansObjet(['fillGeometry', 'strokeGeometry'], 'dérivée du tracé et du contour, qui ont leur classement'),

  // Champs portables.
  portable(['children'], 'viewStructures.*.children, PieceReference.pieces, composes'),
  portable(['visible'], 'viewStructures.*.optional, visibilityProp'),
  portable(['opacity'], 'viewStructures.*.opacity'),
  portable(['rotation'], 'viewStructures.*.rotation'),
  portable(['x', 'y'], 'viewStructures.*.position et inset (hors flux)'),
  portable(['relativeTransform'], 'viewStructures.*.rotation et inset', 'relativeTransform pour un miroir ou un cisaillement'),
  portable(['width', 'height', 'layoutSizingHorizontal', 'layoutSizingVertical', 'primaryAxisSizingMode',
    'counterAxisSizingMode', 'textAutoResize'], 'viewStructures.*.sizing, size, structuralSize'),
  portable(['minWidth', 'maxWidth', 'minHeight', 'maxHeight'], 'viewStructures.*.bounds'),
  portable(['constraints'], 'viewStructures.*.constraints et inset', 'proportions d’une contrainte scale'),
  portable(['layoutMode'], 'viewStructures.*.layout'),
  portable(['layoutWrap'], 'viewStructures.*.wrap'),
  portable(['primaryAxisAlignItems'], 'viewStructures.*.justifyContent'),
  portable(['counterAxisAlignItems'], 'viewStructures.*.alignItems'),
  portable(['itemSpacing'], 'viewStructures.*.gap'),
  portable(['counterAxisSpacing'], 'viewStructures.*.rowGap, columnGap'),
  portable(['layoutGrow'], 'viewStructures.*.flexGrow'),
  portable(['layoutAlign'], 'viewStructures.*.alignSelf'),
  portable(['layoutPositioning'], 'viewStructures.*.position'),
  portable(['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'horizontalPadding', 'verticalPadding'],
    'viewStructures.*.padding'),
  portable(['cornerRadius', 'topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'],
    'viewStructures.*.radius'),
  portable(['gridRowCount', 'gridColumnCount', 'gridRowGap', 'gridColumnGap', 'gridRowSizes', 'gridColumnSizes'],
    'viewStructures.*.rows, columns, rowGap, columnGap, rowSizes, columnSizes'),
  portable(['gridRowAnchorIndex', 'gridColumnAnchorIndex', 'gridRowSpan', 'gridColumnSpan'],
    'viewStructures.*.rowStart, columnStart, rowSpan, columnSpan'),
  portable(['gridChildHorizontalAlign'], 'viewStructures.*.justifySelf'),
  portable(['gridChildVerticalAlign'], 'viewStructures.*.alignSelf'),
  portable(['fills', 'fillStyleId', 'backgrounds', 'backgroundStyleId'],
    'tokens et viewPaintPlacements.fills (peinture unie liée)', 'peinture non unie, image, vidéo, motif, pile'),
  portable(['strokes', 'strokeStyleId'], 'strokes et viewPaintPlacements.strokes (peinture unie liée)',
    'peinture non unie, image, vidéo, motif, pile'),
  portable(['strokeAlign'], 'StrokeTokens.align'),
  portable(['strokeWeight'], 'StrokeTokens.width', 'strokeWeight non tokenisé'),
  portable(['strokeTopWeight', 'strokeRightWeight', 'strokeBottomWeight', 'strokeLeftWeight'],
    'StrokeTokens.width.top, right, bottom, left', 'côté non tokenisé'),
  portable(['effects', 'effectStyleId'], 'effectStyles et viewEffects', 'effet sans représentation'),
  portable(['textStyleId'], 'textStyles et viewTypographies'),
  portable(['fontName', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'paragraphSpacing',
    'paragraphIndent', 'textCase', 'textWrapStyle', 'leadingTrim'], 'textStyles.*.tokens et literals'),
  portable(['textDecoration'], 'textStyles.*.literals.textDecorationLine', 'décoration : style, décalage, épaisseur, couleur'),
  portable(['textAlignHorizontal'], 'viewTypographies.*.textAlign'),
  portable(['textAlignVertical'], 'viewTypographies.*.alignContent'),
  portable(['textTruncation', 'maxLines'], 'viewTypographies.*.lineClamp, textOverflow'),
  portable(['characters'], 'samples.text, samples.args (indicatif)', 'plages de texte : style par plage'),
  portable(['boundVariables'], 'références de tokens des champs représentés', 'champ lié non représenté'),
  portable(['componentPropertyDefinitions'], 'props et stateModel'),
  portable(['componentProperties'], 'variants.values, PieceReference.values, samples.args'),
  portable(['componentPropertyReferences'], 'propertyBindingDefinitions et variants.bindings'),
  portable(['variantProperties'], 'variants.values, figmaVariantLabels'),
  portable(['variantGroupProperties'], 'props.*.values, figmaVariantLabels'),
  portable(['defaultVariant'], 'repère de présentation des variantes'),
  portable(['mainComponent'], 'PieceReference.variant, composes, instance-swap'),
  portable(['exposedInstances', 'isExposedInstance'], 'props.*.source'),
  portable(['overrides'], 'vue et feuilles effectives du renvoi'),

  // Pertes nommées par le §2.14.
  perte(['explicitVariableModes'], 'modes'),
  perte(['scaleFactor'], 'transformation-2d'),
  perte(['isMask', 'maskType', 'clipsContent', 'blendMode', 'itemReverseZIndex', 'strokesIncludedInLayout'],
    'masque-et-fusion'),
  perte(['strokeCap', 'strokeJoin', 'strokeMiterLimit', 'dashPattern', 'variableWidthStrokeProperties',
    'complexStrokeProperties', 'cornerSmoothing'], 'contour'),
  perte(['booleanOperation', 'vectorNetwork', 'vectorPaths', 'handleMirroring', 'pointCount', 'innerRadius',
    'arcData'], 'geometrie'),
  perte(['openTypeFeatures', 'hyperlink', 'listSpacing', 'hangingPunctuation', 'hangingList',
    'textDecorationStyle', 'textDecorationOffset', 'textDecorationThickness', 'textDecorationColor',
    'textDecorationSkipInk'], 'typographie'),
  perte(['layoutGrids', 'gridStyleId', 'gridAutoTracks', 'gridItemsPositioning', 'counterAxisAlignContent',
    'constrainProportions', 'targetAspectRatio'], 'grilles-et-dimensionnement'),
];


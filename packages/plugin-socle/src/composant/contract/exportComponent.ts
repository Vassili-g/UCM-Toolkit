/**
 * Commande « Export composant » : transforme le Component ou Component Set sélectionné
 * en contrat de composant (fichier `<Nom>.contract.json` téléchargé).
 *
 * Déroulé : sélection → props → matrice de variantes → wrapper de dimensions
 * → structure (layout, tailles, tokens) → intention → contrat final.
 */
import { buildFigmaVariantLabels } from './componentTree';
import type { InventairesDeLaDemande } from '../analyse/inventaires';
import { calculerLAnalyse, ComponentExportError } from '../analyse/resultat';
import type { ResultatInterne } from '../analyse/resultat';
export { ComponentExportError } from '../analyse/resultat';
import { avancer, etape } from './mesure';
import type { EtapePrevue } from './mesure';
import {
  AnalyseAnnulee,
  calculerParTranches,
  dansUnePorteeDAnalyse,
  respirerSiBesoin,
  verifierLAnnulation,
} from './porteeDAnalyse';
import type { ContexteCooperatif, JetonDAnnulation, OptionsDeCooperation } from './porteeDAnalyse';
export { mergeWrapperProps } from './propertySurface';
import { compactVariantsParEtapes, internParEtapes, signatureParEtapes } from './compactVariants';
import { CATALOGUES_DE_VUES, elideContractParEtapes, elideNeutralsParEtapes } from './elideNeutrals';
import { serializeJsonParEtapes } from './serializeJson';
import { extractVariantSampleParEtapes } from './extractSamples';
export { mergeIconRules } from './mergeIconRules';
export { mergePropDescriptions } from './mergePropDescriptions';
import { renderingSemanticsFor } from './semantics';
import { codeIdentifier } from '@ucm-kit/core/format';
import { CONTRACT_VERSION } from '@ucm-kit/core/format';
import type { Annonce } from '../annonce';
import type { Contract, ContractMeta } from '@ucm-kit/core/format';
import type { ReleveDesImbriques } from './imbriques';
import type { PointACorriger } from './localisation';

/** Ce que la commande renvoie à l'UI : le fichier à télécharger + un bilan. */
export type ComponentExport = {
  filename: string;
  content: string;
  warningCount: number;
  /**
   * Seul canal des données manquantes qui demandent un geste dans Figma. Les
   * transformations complètes restent silencieuses et documentées par le format.
   */
  warnings: string[];
  /**
   * Nodes du sujet dans l'ordre d'émission, indexés par la phrase qui sert aussi
   * au dédoublonnage. Cette aide d'interface n'entre jamais dans le contrat ;
   * son absence peut être voulue.
   */
  localisations: ReadonlyMap<string, readonly string[]>;
  /**
   * Parties du message indexées par sa phrase. L'UI les met en page ; le contrat
   * et la pull request publient la phrase dérivée par `phraseDe`.
   */
  parties: ReadonlyMap<string, PointACorriger>;
  /**
   * Justification explicite des messages sans node, utilisée par la loi de couverture.
   */
  localisationsDeclarees: ReadonlyMap<string, string>;
  /** Les imbriqués sans règles : la création des règles en tire son modèle et ses points. */
  imbriques: ReleveDesImbriques;
};

/**
 * Comment une analyse a fini. `partielle` : le budget de layers a arrêté la
 * lecture des variants ; `export` ne décrit que les variants lus, sans point à
 * corriger pour les autres. `annulee` : le jeton s'est levé, rien n'est produit.
 * `interne` porte le résultat que l'export a publié ; aucun consommateur ne le
 * lit encore.
 */
export type ResultatDAnalyse =
  | { etat: 'complete'; export: ComponentExport; interne?: ResultatInterne }
  | { etat: 'partielle'; export: ComponentExport; lus: number; nonLus: number | 'inconnu'; interne?: ResultatInterne }
  | { etat: 'annulee' };

/** Les options de `analyserLeComposant`. Sans `budgetDeLayers` : tout se lit. Sans `jeton` : jamais annulée. */
export type OptionsDAnalyse = OptionsDeCooperation & {
  /** Le contexte d'une analyse plus large (Architect) ; il remplace celui que la portée créerait. */
  cooperation?: ContexteCooperatif;
  composant?: ComponentNode | ComponentSetNode;
  page?: PageNode;
  /** Le nombre de layers de variants à ne pas dépasser, `BUDGET_DE_LAYERS_PAR_DEFAUT` pour la borne commune. */
  budgetDeLayers?: number;
  jeton?: JetonDAnnulation;
  /** Les inventaires de la demande d'Architect : le scan des règles et la liste des variables locales s'y lisent une fois pour tous ses lecteurs. Sans eux, le moteur lit seul. */
  inventaires?: InventairesDeLaDemande;
};

/** Message bloquant, formulé comme une action Figma plutôt que comme un concept mathématique. */
/**
 * Vérifie que la sélection est bien un composant exportable, sinon erreur claire.
 *
 * Exporté parce que la création des règles vise le même composant que l'export,
 * et qu'une seconde lecture de la sélection se désaccorderait de celle-ci le
 * jour où l'une des deux changerait.
 */
export function getSelectedComponent(): ComponentNode | ComponentSetNode {
  const selection = figma.currentPage.selection;
  if (selection.length !== 1) {
    throw new ComponentExportError('Sélectionnez un seul composant principal ou ensemble de variantes dans Figma.');
  }

  const node = selection[0];
  if (node.type !== 'COMPONENT_SET' && node.type !== 'COMPONENT') {
    throw new ComponentExportError(
      'La sélection n’est pas un composant principal ni un ensemble de variantes. Sélectionnez le composant principal à exporter.',
    );
  }

  return node;
}

/**
 * Construit les métadonnées de traçabilité vers Figma.
 * `url` reste optionnelle : la distribution Community n'expose généralement
 * pas `figma.fileKey`, réservé à `enablePrivatePluginApi`. `fileName` et
 * `nodeId` assurent alors la traçabilité ; une distribution privée peut encore
 * fournir le lien sans changer le format.
 */
function buildMeta(
  componentSet: ComponentNode | ComponentSetNode,
): Omit<ContractMeta, 'diagnostics' | 'coverage'> {
  const fileKey = figma.fileKey ?? null;
  const fileName = figma.root.name;
  const nodeId = componentSet.id;
  // Format d'URL Figma : les « : » de l'id de nœud deviennent des « - ».
  const url = fileKey
    ? `https://www.figma.com/design/${fileKey}/${encodeURIComponent(fileName)}?node-id=${nodeId.replace(/:/g, '-')}`
    : undefined;

  return {
    contractVersion: CONTRACT_VERSION,
    exportedAt: new Date().toISOString(),
    figma: {
      fileName,
      nodeId,
      ...(componentSet.key ? { componentKey: componentSet.key } : {}),
      ...(url ? { url } : {}),
    },
  };
}

/** Le nom de fichier est l'identifiant de code canonique du composant. */
export function componentContractFilename(name: string): string {
  return `${codeIdentifier(name)}.contract.json`;
}

/**
 * Les étapes de l'analyse d'un composant, dans leur ordre, et leur part
 * supposée du temps total. La barre de chargement avance d'après ces poids ;
 * la trace de mesure (`mesure.ts`) relève les durées réelles, qui servent à
 * les corriger. Les poids viennent de la trace d'un set de 140 variants, en
 * pour cent. Une étape mesurée sous 1 % pèse 1. `regles` pèse sa durée
 * habituelle, 0,1 s ; une lecture de 6,5 s a été mesurée une fois, sans cause
 * connue. Les étapes `structure.*` s'ouvrent dans `extractStructure`.
 */
export const ETAPES_DE_L_ANALYSE: readonly EtapePrevue[] = [
  { nom: 'regles', poids: 1 },
  { nom: 'variants', poids: 1 },
  { nom: 'index', poids: 3 },
  { nom: 'composition', poids: 1 },
  { nom: 'wrapper', poids: 4, origineDuRythme: true },
  { nom: 'variables', poids: 1 },
  { nom: 'structure.couleurs', poids: 4 },
  { nom: 'structure.election', poids: 4 },
  { nom: 'structure.icones', poids: 1 },
  { nom: 'structure.reference', poids: 1 },
  { nom: 'structure.vues', poids: 46 },
  { nom: 'structure.effets', poids: 1 },
  { nom: 'structure.typographie', poids: 6, compte: false },
  { nom: 'structure.typographie-exacte', poids: 12 },
  { nom: 'structure.tailles', poids: 1 },
  { nom: 'echantillons', poids: 12 },
  { nom: 'compaction', poids: 1 },
  { nom: 'serialisation', poids: 1 },
];

/**
 * Point d'entrée de la commande : crée le contrat du composant sélectionné.
 *
 * `annoncer` nomme les étapes traversées, il n'en décide aucune. Quand le
 * composant porte des instances, cet export résout leurs maîtres et charge la
 * page de chacun, une fois par session et par page tant qu'elle ne change pas.
 * Les étapes que la trace de mesure relève (`etape`) sont celles de
 * `ETAPES_DE_L_ANALYSE`, et `code.ts` ouvre et ferme cette trace.
 *
 * `options.respirer` rend la main au sandbox dans les boucles longues, une
 * fois le budget de calcul écoulé ; `code.ts` y lit l'annulation.
 * La création transmet `composant` et `page` capturés avant ses attentes.
 * À défaut, l'export capture la sélection et la page courantes à l'appel.
 */
export async function handleExportComponent(
  annoncer: Annonce = () => {},
  options: Omit<OptionsDAnalyse, 'budgetDeLayers' | 'jeton'> = {},
): Promise<ComponentExport> {
  const resultat = await analyserLeComposant(annoncer, options);
  if (resultat.etat === 'annulee') throw new Error('analyse annulée sans jeton');
  return resultat.export;
}

/**
 * Comme `handleExportComponent`, avec un budget de layers et un jeton
 * d'annulation, et un résultat qui dit comment l'analyse a fini. Le jeton levé
 * rend `annulee`, sans exception ni point à corriger ; il se lit après chaque
 * étape annoncée, entre deux variants du budget et aux points de respiration.
 */
export async function analyserLeComposant(
  annoncer: Annonce = () => {},
  options: OptionsDAnalyse = {},
): Promise<ResultatDAnalyse> {
  const composant = options.composant ?? getSelectedComponent();
  const page = options.page ?? figma.currentPage;
  try {
    return await dansUnePorteeDAnalyse(options, () => exporterLeComposant(
      annoncer, composant, page, options.budgetDeLayers, options.jeton, options.inventaires,
    ));
  } catch (erreur) {
    if (erreur instanceof AnalyseAnnulee) return { etat: 'annulee' };
    throw erreur;
  }
}

async function exporterLeComposant(
  annoncer: Annonce,
  componentSet: ComponentNode | ComponentSetNode,
  page: PageNode,
  budgetDeLayers?: number,
  jeton?: JetonDAnnulation,
  inventaires?: InventairesDeLaDemande,
): Promise<ResultatDAnalyse> {
  const verifier = () => verifierLAnnulation(jeton);
  const interne = await calculerLAnalyse(annoncer, componentSet, page, budgetDeLayers, jeton, inventaires);
  const {
    matrix,
    extracted,
    propertyModel,
    propertyBindings,
    appliedByVariant,
    composed,
    mainByInstanceId,
    swapDefaults,
    propertySurfaces,
    icons,
    composesPlacees,
    intent,
  } = interne.pourLaPublication;
  const { props, stateModel, imbriques } = interne;

  // L'échantillon se pose ici, une fois l'arbre exact connu et les valeurs
  // appliquées relevées : il ne recalcule ni chemin de slot, ni reconnaissance
  // de dépendance, il assemble ce que les deux extractions savent déjà.
  await annoncer('Préparation des exemples…');
  verifier();
  etape('echantillons');
  const componentsById = new Map(matrix.variants.map(({ component }) => [component.id, component]));
  for (const [rang, variant] of extracted.variants.entries()) {
    avancer(rang, extracted.variants.length);
    await respirerSiBesoin();
    const component = componentsById.get(variant.nodeId);
    if (!component) continue;
    const sample = await calculerParTranches(extractVariantSampleParEtapes(
      { component, paths: extracted.exactPathsByVariant.get(component) ?? new Map() },
      appliedByVariant.get(variant.nodeId),
      extracted.targetedLayers,
      composed,
      mainByInstanceId,
      swapDefaults,
      propertySurfaces,
    ));
    if (Object.keys(sample).length > 0) variant.sample = sample;
  }

  await annoncer('Écriture du contrat…');
  verifier();
  etape('compaction');
  const compacted = await calculerParTranches(compactVariantsParEtapes(extracted.variants, propertyBindings));

  // Le lien Figma absent ne se signale pas. Distribué par la Community, le
  // plugin n'a pas `enablePrivatePluginApi`, donc jamais la clé du fichier : le
  // message s'imprimerait sur chaque export, pour un constat que le designer ne
  // peut pas corriger. Un état normal du format se documente dans le type
  // (`ContractMeta.figma.url`) et dans la spécification, pas dans un diagnostic
  // répété à l'infini.
  const meta = buildMeta(componentSet);

  // Les messages sont joints et les codes décidés dès `calculerLAnalyse` : la
  // compaction et les échantillons n'en émettent aucun. Deux codes, et une
  // seule question qu'ils tranchent : la projection portable a-t-elle perdu
  // quelque chose ? Les deux demandent un geste (c'est la condition d'entrée
  // dans ce canal), mais seul le premier dégrade `meta.coverage.portable`, et
  // le rapport de CI ne remonte que celui-là.
  const hasPortableLoss = interne.projectionWarnings.size > 0;
  const diagnostics = interne.warnings.map((message) => ({
    code: interne.projectionWarnings.has(message)
      ? 'UCM_PORTABLE_PROJECTION_WARNING'
      : 'UCM_EXPORT_NOTICE',
    severity: 'warning' as const,
    message,
  }));
  const {
    variantTokens: _variantTokens,
    variantStrokes: _variantStrokes,
    variantTypography: _variantTypography,
    sizes,
    variantAxes,
    ...projectionDeReference
  } = extracted.structure;
  // La projection de référence rejoint le catalogue des structures au lieu d'en
  // recopier une. Le renvoi est inconditionnel : quand l'élection du node de
  // layout la fait différer de toutes les vues (un wrapper de dimensions
  // sauté), elle ajoute son entrée. Une seule forme, donc un seul chemin de
  // lecture chez le consommateur.
  const viewStructures = compacted.viewStructures;
  const structureIds = new Map<string, string>();
  for (const id of Object.keys(viewStructures)) {
    await respirerSiBesoin();
    structureIds.set(await calculerParTranches(signatureParEtapes(viewStructures[id])), id);
  }
  const projectionPropre = await calculerParTranches(elideNeutralsParEtapes(projectionDeReference, 'viewStructures.*'));
  const structureView = await calculerParTranches(internParEtapes(projectionPropre, 'st', structureIds, viewStructures));
  // Les étiquettes Figma des axes viennent de la source, jamais d'une relecture
  // des noms publiés : reconstruire un nom depuis la table et le comparer ne
  // valide pas l'appariement axe ↔ étiquette, qu'une permutation traverse sans
  // être vue.
  const figmaVariantLabels = buildFigmaVariantLabels(componentSet, matrix, propertyModel.publicVariantKeyByRawKey);
  const variants = figmaVariantLabels
    ? compacted.variants.map(({ figmaName: _figmaName, ...reste }) => reste)
    : compacted.variants;

  const contract: Contract = await calculerParTranches(elideContractParEtapes<Contract>({
    name: componentSet.name || 'Component',
    meta: {
      ...meta,
      diagnostics,
      coverage: {
        portable: hasPortableLoss ? 'partial' : 'complete',
      },
    },
    props,
    ...(figmaVariantLabels ? { figmaVariantLabels } : {}),
    viewStructures,
    viewTypographies: compacted.viewTypographies,
    viewComposes: compacted.viewComposes,
    viewIcons: compacted.viewIcons,
    viewPaintPlacements: compacted.viewPaintPlacements,
    viewEffects: compacted.viewEffects,
    variantViews: compacted.variantViews,
    propertyBindingDefinitions: compacted.propertyBindingDefinitions,
    variants,
    structure: {
      view: structureView,
      ...(sizes ? { sizes } : {}),
      variantAxes,
    },
    ...(stateModel ? { stateModel } : {}),
    rendering: renderingSemanticsFor(extracted.discoveredRoles),
    icons,
    textStyles: extracted.textStyles,
    effectStyles: extracted.effectStyles,
    composes: composesPlacees,
    samples: compacted.samples,
    ...(intent ? { intent } : {}),
  }, CATALOGUES_DE_VUES));

  etape('serialisation');
  const sortie: ComponentExport = {
    filename: componentContractFilename(contract.name),
    content: await calculerParTranches(serializeJsonParEtapes(contract)),
    warningCount: interne.warnings.length,
    warnings: interne.warnings,
    localisations: interne.localisations,
    parties: interne.parties,
    localisationsDeclarees: interne.localisationsDeclarees,
    imbriques,
  };
  verifier();
  return interne.couverture.etat === 'partielle'
    ? { etat: 'partielle', export: sortie, lus: interne.couverture.lus, nonLus: interne.couverture.nonLus, interne }
    : { etat: 'complete', export: sortie, interne };
}

export default handleExportComponent;

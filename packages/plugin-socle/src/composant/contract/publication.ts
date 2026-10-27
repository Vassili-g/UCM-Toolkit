/**
 * La publication d'une analyse : échantillons, compaction, métadonnées,
 * élision, signatures, contrat et sérialisation.
 *
 * `publierLeContrat` ne lit que le `ResultatInterne` : les messages, les codes
 * de diagnostic et la couverture portable sont décidés avant elle par
 * `calculerLAnalyse`, et rien ici n'émet de message.
 */
import { buildFigmaVariantLabels } from './componentTree';
import type { ComponentExport } from './exportComponent';
import { avancer, etape } from './mesure';
import { calculerParTranches, respirerSiBesoin } from './porteeDAnalyse';
import { compactVariantsParEtapes, internParEtapes, signatureParEtapes } from './compactVariants';
import { CATALOGUES_DE_VUES, elideContractParEtapes, elideNeutralsParEtapes } from './elideNeutrals';
import { serializeJsonParEtapes } from './serializeJson';
import { extractVariantSampleParEtapes } from './extractSamples';
import { renderingSemanticsFor } from './semantics';
import { CONTRACT_VERSION, codeIdentifier } from '@ucm-kit/core/format';
import type { Annonce } from '../annonce';
import type { Contract, ContractMeta } from '@ucm-kit/core/format';
import type { ResultatInterne } from '../analyse/resultat';

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
 * Écrit le contrat du composant analysé. `annoncer` nomme les étapes
 * `echantillons`, `compaction` et `serialisation` ; `verifier` lève si l'analyse
 * est annulée.
 */
export async function publierLeContrat(
  interne: ResultatInterne,
  annoncer: Annonce,
  verifier: () => void,
): Promise<ComponentExport> {
  const {
    componentSet,
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
  return sortie;
}

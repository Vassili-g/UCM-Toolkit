/**
 * La publication telle qu'elle s'écrivait dans `exporterLeComposant` avant son
 * extraction en `publierLeContrat` (`contract/publication.ts`), recopiée sans
 * changement de corps. Le banc de parité l'exécute sur le même résultat interne
 * et compare les deux sorties ; la case 7.8 retire l'ancien chemin et ce fichier
 * avec lui.
 */
import { buildFigmaVariantLabels } from '../../src/composant/contract/componentTree';
import type { ComponentExport } from '../../src/composant/contract/exportComponent';
import { componentContractFilename } from '../../src/composant/contract/publication';
import { avancer, etape } from '../../src/composant/contract/mesure';
import { calculerParTranches, respirerSiBesoin } from '../../src/composant/contract/porteeDAnalyse';
import { compactVariantsParEtapes, internParEtapes, signatureParEtapes } from '../../src/composant/contract/compactVariants';
import { CATALOGUES_DE_VUES, elideContractParEtapes, elideNeutralsParEtapes } from '../../src/composant/contract/elideNeutrals';
import { serializeJsonParEtapes } from '../../src/composant/contract/serializeJson';
import { extractVariantSampleParEtapes } from '../../src/composant/contract/extractSamples';
import { renderingSemanticsFor } from '../../src/composant/contract/semantics';
import { CONTRACT_VERSION } from '@ucm-kit/core/format';
import type { Annonce } from '../../src/composant/annonce';
import type { Contract, ContractMeta } from '@ucm-kit/core/format';
import type { ResultatInterne } from '../../src/composant/analyse/resultat';

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


export async function publierAvant(
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

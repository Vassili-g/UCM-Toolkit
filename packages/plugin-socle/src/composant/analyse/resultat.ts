/**
 * Le résultat interne d'une analyse de composant : ce que les diagnostics, les
 * règles et la publication lisent, avant que l'exporteur n'écrive son contrat.
 *
 * `calculerLAnalyse` exécute les étapes `regles` à `structure.tailles`, puis
 * joint les canaux de messages. Les échantillons, la compaction et la
 * sérialisation n'émettent aucun message et ne lisent que `pourLaPublication` :
 * `exportComponent.ts` les exécute après ce calcul. Le résultat ne dépend
 * d'aucune génération d'interface.
 */
import {
  buildVariantMatrixParEtapes,
  findMissingVariantCombinationsParEtapes,
  findWrapperReference,
} from '../contract/componentTree';
import type { VariantMatrix } from '../contract/componentTree';
import { indexContractedNames, scanComposedMatrix } from '../contract/composedComponents';
import type { ComposedMatrixScan } from '../contract/composedComponents';
import { extractRules } from '../contract/extractRules';
import type { ExtractedRules } from '../contract/extractRules';
import { contientUneInstanceRendueParEtapes } from '../contract/exportableNodes';
import { etape } from '../contract/mesure';
import { calculerParTranches, respirerSiBesoin, verifierLAnnulation } from '../contract/porteeDAnalyse';
import type { JetonDAnnulation } from '../contract/porteeDAnalyse';
import { bornerLesVariantsParTranches } from '../contract/budget';
import type { BilanDeBudget } from '../contract/budget';
import { pousserLesImbriques, releverLesImbriques } from '../contract/imbriques';
import type { ReleveDesImbriques } from '../contract/imbriques';
import { TAGS_D_INTENTION } from '../contract/rulesModel';
import { extractStructure } from '../contract/extractStructure';
import { collidingVariantAxes, extractContractPropertyModel } from '../contract/parsers';
import type { ContractPropertyModel } from './proprietesEtEtats';
import { buildContractPropertySurface } from '../contract/propertySurface';
import { mergeBooleanDescriptions } from '../contract/mergeBooleanDescriptions';
import { mergeEnumDefaults } from '../contract/mergeEnumDefaults';
import { extractPropertyBindingsParEtapes } from '../contract/propertyBindings';
import type { AppliedPropertyValues, PropertyBindingScan } from '../contract/propertyBindings';
import { mergeIconRules } from '../contract/mergeIconRules';
import { mergePropDescriptions } from '../contract/mergePropDescriptions';
import { buildStateModel } from '../contract/semantics';
import { indexVariablesParEtapes, VariableNameResolver } from '../variables';
import type { InventairesDeLaDemande } from './inventaires';
import type { Annonce } from '../annonce';
import type {
  ChildStructure,
  ComposedDependency,
  ContractProp,
  ExtractedContractVariant,
  StateModel,
} from '@ucm-kit/core/format';
import {
  localisationsDe,
  partiesDe,
  pousserLocalise,
  pousserSansNode,
  raisonsSansNode,
  reporterLocalisations,
  sujetSansNode,
} from '../contract/localisation';
import type { PointACorriger } from '../contract/localisation';

/** Erreur « métier » : son message est affiché tel quel à l'utilisateur. */
export class ComponentExportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ComponentExportError';
  }
}

/**
 * Ce que l'analyse a lu : tous les variants, ou le préfixe que le budget de
 * layers a admis. `lus` et `nonLus` comptent des layers.
 */
export type CouvertureDeLAnalyse =
  | { etat: 'complete' }
  | { etat: 'partielle'; lus: number; nonLus: number | 'inconnu' };

/** Sans bilan de budget, tous les variants ont été lus. */
export function couvertureDe(bilan: BilanDeBudget | null | undefined): CouvertureDeLAnalyse {
  return bilan ? { etat: 'partielle', lus: bilan.lus, nonLus: bilan.nonLus } : { etat: 'complete' };
}

/**
 * Les entrées dont la seule publication du contrat a besoin. Les échantillons,
 * la compaction et la sérialisation les lisent ; aucun diagnostic ni modèle de
 * règles ne les lit.
 */
export type PourLaPublication = {
  componentSet: ComponentNode | ComponentSetNode;
  matrix: VariantMatrix;
  extracted: Awaited<ReturnType<typeof extractStructure>>;
  propertyModel: ContractPropertyModel;
  propertyBindings: PropertyBindingScan['bindings'];
  appliedByVariant: AppliedPropertyValues;
  composed: ComposedMatrixScan['composed'];
  mainByInstanceId: ComposedMatrixScan['mainByInstanceId'];
  swapDefaults: ComposedMatrixScan['swapDefaults'];
  propertySurfaces: ComposedMatrixScan['propertySurfaces'];
  icons: ReturnType<typeof mergeIconRules>;
  composesPlacees: ComposedDependency[];
  intent: ExtractedRules['intent'];
};

/** Ce que les diagnostics, les règles et la couverture lisent d'une analyse. */
export type ResultatInterne = {
  /** Messages dédoublonnés, dans l'ordre : bloquants des imbriqués, canal principal, structure. */
  warnings: string[];
  parties: ReadonlyMap<string, PointACorriger>;
  localisations: ReadonlyMap<string, readonly string[]>;
  localisationsDeclarees: ReadonlyMap<string, string>;
  /** Les messages qui dégradent `meta.coverage.portable` et qui prennent le code `UCM_PORTABLE_PROJECTION_WARNING`. */
  projectionWarnings: ReadonlySet<string>;
  /** Les props au terme des fusions de documentation et d'icônes. */
  props: Record<string, ContractProp>;
  stateModel: StateModel | null;
  imbriques: ReleveDesImbriques;
  /** Les règles telles que l'étape `regles` les a lues. */
  rules: ExtractedRules;
  couverture: CouvertureDeLAnalyse;
  pourLaPublication: PourLaPublication;
};

/** Ce que la jonction des canaux rend. */
export type JonctionDesCanaux = Pick<
  ResultatInterne,
  'warnings' | 'parties' | 'localisations' | 'localisationsDeclarees' | 'projectionWarnings'
>;

/**
 * Joint les canaux de messages : les points bloquants des imbriqués en tête
 * (la demande de fusion coupe sa liste par la fin), puis `warnings`, puis
 * `avertissementsDeStructure`, chaque phrase gardée à sa première occurrence.
 * Les registres de localisation suivent le canal d'origine. Les bloquants
 * rejoignent `projectionWarnings`, qui est modifié.
 *
 * Le relevé de localisation ne va pas plus loin que la frontière sandbox ↔ UI :
 * le contrat n'en voit rien, et une loi de `lois.ts` le refuse.
 */
export function joindreLesCanaux(entrees: {
  composant: ComponentNode | ComponentSetNode;
  imbriques: ReleveDesImbriques;
  warnings: readonly string[];
  avertissementsDeStructure: readonly string[];
  projectionWarnings: string[];
}): JonctionDesCanaux {
  const { warnings, avertissementsDeStructure, projectionWarnings } = entrees;
  const bloquants: string[] = [];
  pousserLesImbriques(bloquants, entrees.composant, entrees.imbriques);
  projectionWarnings.push(...bloquants);
  const allWarnings = Array.from(new Set([...bloquants, ...warnings, ...avertissementsDeStructure]));
  reporterLocalisations(bloquants, allWarnings);
  reporterLocalisations(warnings, allWarnings);
  reporterLocalisations(avertissementsDeStructure, allWarnings);
  return {
    warnings: allWarnings,
    localisations: localisationsDe(allWarnings),
    parties: partiesDe(allWarnings),
    localisationsDeclarees: raisonsSansNode(allWarnings),
    projectionWarnings: new Set(projectionWarnings),
  };
}

/** Union ordonnée des dépendances exactes, avec leur cardinalité maximale. */
async function mergeVariantDependencies(
  variants: ReadonlyArray<ExtractedContractVariant>,
): Promise<ComposedDependency[]> {
  const result: ComposedDependency[] = [];
  const maximumBySignature = new Map<string, number>();
  for (const variant of variants) {
    await respirerSiBesoin();
    const occurrences = new Map<string, number>();
    for (const dependency of variant.composes) {
      await respirerSiBesoin();
      const signature = JSON.stringify([
        dependency.component,
        dependency.figmaLayer,
        dependency.visibilityProp ?? null,
      ]);
      const occurrence = (occurrences.get(signature) ?? 0) + 1;
      occurrences.set(signature, occurrence);
      if (occurrence > (maximumBySignature.get(signature) ?? 0)) {
        maximumBySignature.set(signature, occurrence);
        result.push(dependency);
      }
    }
  }
  return result;
}

async function iconPaths(children: readonly ChildStructure[], figmaName: string): Promise<string[][]> {
  const paths: string[][] = [];
  const visit = async (entries: readonly ChildStructure[], parent: string[]) => {
    for (const entry of entries) {
      await respirerSiBesoin();
      const path = [...parent, entry.slot];
      if (entry.figmaLayer === figmaName || (!entry.figmaLayer && entry.slot === figmaName)) {
        paths.push(path);
      }
      if (entry.children) await visit(entry.children, path);
    }
  };
  await visit(children, []);
  return paths;
}

/**
 * Exécute les étapes `regles` à `structure.tailles` et rend leur résultat
 * interne. `annoncer` nomme les étapes ; un jeton levé lève `AnalyseAnnulee`.
 */
export async function calculerLAnalyse(
  annoncer: Annonce,
  componentSet: ComponentNode | ComponentSetNode,
  page: PageNode,
  budgetDeLayers?: number,
  jeton?: JetonDAnnulation,
  inventaires?: InventairesDeLaDemande,
): Promise<ResultatInterne> {
  const verifier = () => verifierLAnnulation(jeton);
  verifier();
  await annoncer('Lecture des règles d’usage…');
  verifier();
  etape('regles');

  // Les règles enrichissent l'intention et la documentation, mais ne sont plus
  // une précondition d'export. Leur absence reste visible dans les diagnostics.
  const scanDesRegles = () => extractRules(componentSet, page);
  const rules = await (inventaires ? inventaires.reglesDeLaPage(page, componentSet, scanDesRegles) : scanDesRegles());
  const warnings: string[] = [...rules.warnings];
  reporterLocalisations(rules.warnings, warnings);
  // Sous-ensemble qui mesure réellement la projection UCM. Les avertissements
  // de documentation (règles), de traçabilité (URL) et de compatibilité avec
  // l'ancienne vue de référence ne rendent pas un arbre exact incomplet.
  const projectionWarnings: string[] = [];
  const addProjectionWarnings = (messages: readonly string[]) => {
    projectionWarnings.push(...messages);
  };
  const markProjectionWarningsSince = (index: number) => {
    addProjectionWarnings(warnings.slice(index));
  };
  let warningCursor = warnings.length;
  // Deux axes qui se confondent sont la seule collision de noms que l'export ne
  // sait pas trancher. Ailleurs, le premier arrivé garde la clé et le second est
  // signalé ; ici, le second emporte les coordonnées des variants avec lui, et
  // aucune des deux propriétés ne peut être servie sans l'autre.
  const axesConfondus = collidingVariantAxes(componentSet.componentPropertyDefinitions);
  if (axesConfondus) {
    const [premier, second] = axesConfondus;
    throw new ComponentExportError(
      `Les propriétés de variante « ${premier} » et « ${second} » produisent le même nom à `
      + `l’export. L’export est bloqué pour éviter de les confondre. Donnez-leur des noms `
      + `qui diffèrent autrement que par les majuscules, espaces ou tirets, puis relancez l’analyse.`,
    );
  }
  const propertyModel = extractContractPropertyModel(
    componentSet.componentPropertyDefinitions,
    warnings,
  );
  markProjectionWarningsSince(warningCursor);
  warningCursor = warnings.length;
  const missingVariants = componentSet.type === 'COMPONENT_SET'
    ? await calculerParTranches(findMissingVariantCombinationsParEtapes(componentSet))
    : null;
  if (missingVariants) {
    // Une matrice clairsemée est parfois voulue, parfois oubliée : le contrat ne
    // peut pas trancher, mais le designer si. Le constat reste donc un
    // avertissement, et nomme le geste, sans quoi il ne serait qu'une ligne de
    // plus à survoler dans la pull request.
    const plusieurs = missingVariants.missing > 1;
    pousserLocalise(warnings, 'Component Set', componentSet, {
      famille: 'proprietes',
      manque: plusieurs
        ? `${missingVariants.missing} combinaisons de valeurs de ses propriétés de variante `
          + `n'ont pas de variant.`
        : `une combinaison de valeurs de ses propriétés de variante n'a pas de variant.`,
      impact: plusieurs
        ? 'Le développeur ne pourra pas afficher ces combinaisons.'
        : 'Le développeur ne pourra pas afficher cette combinaison.',
      action: `${plusieurs ? 'Si ces combinaisons doivent exister, ajoutez-les'
        : 'Si cette combinaison doit exister, ajoutez-la'} dans Figma, puis réexportez.`,
    });
  }
  // La liste exacte porte cet écart : il ne manque rien à la projection v8.
  warningCursor = warnings.length;
  await annoncer('Lecture des variants…');
  verifier();
  etape('variants');
  const { matrix: matriceLue, warnings: matrixWarnings } = await calculerParTranches(buildVariantMatrixParEtapes(
    componentSet,
    propertyModel.publicVariantKeyByRawKey,
  ));
  if (matriceLue.variants.length === 0) {
    throw new ComponentExportError(
      `Export impossible pour « ${componentSet.name} » : ce component set ne contient aucun `
        + `variant. Ajoutez au moins un variant dans Figma, puis réexportez.`,
    );
  }
  // Le variant de référence sert de base au layout.
  const referenceComponent = componentSet.type === 'COMPONENT_SET'
    ? componentSet.defaultVariant ?? matriceLue.variants[0]?.component ?? null
    : componentSet;
  // Le budget retire des variants avant toute extraction : le reste du moteur
  // ne voit qu'une matrice plus courte, et n'a rien à dire des variants absents.
  const bornee = budgetDeLayers === undefined
    ? null
    : await bornerLesVariantsParTranches(matriceLue.variants, referenceComponent, budgetDeLayers, verifier);
  const matrix = bornee ? { ...matriceLue, variants: bornee.gardes } : matriceLue;

  // La composition se relève avant toute extraction : un composant unifié
  // imbriqué n'est ni un wrapper, ni un slot à parcourir, et cette décision
  // conditionne tout ce qui suit.
  await annoncer('Lecture des composants imbriqués…');
  verifier();
  etape('index');
  let contientDesInstances = false;
  for (const { component } of matrix.variants) {
    await respirerSiBesoin();
    if (!await calculerParTranches(contientUneInstanceRendueParEtapes(component))) continue;
    contientDesInstances = true;
    break;
  }
  const contractes = contientDesInstances
    ? await indexContractedNames(
      matrix.variants.map((entry) => entry.component),
      { priorite: 'analyse' },
    )
    : new Set<string>();
  etape('composition');
  const {
    composes: scannedComposes,
    composed,
    mainByInstanceId,
    warnings: compositionWarnings,
    swapDefaults,
    propertySurfaces,
  } = await scanComposedMatrix(
    matrix.variants.map((entry) => entry.component),
    referenceComponent,
    contractes,
  );
  warnings.push(...compositionWarnings);
  // Un message qui change de canal laisse sa cible derrière lui si le registre
  // ne suit pas. C'est le prix du registre indexé par canal, et le seul endroit
  // où un oubli serait muet : d'où la loi qui compte, à la sortie, les messages
  // localisables restés sans node.
  reporterLocalisations(compositionWarnings, warnings);
  // Une instance dont le composant maître est illisible coûte au contrat : ses
  // layers passent pour les nôtres et la dépendance manque à `composes`. C'est
  // une perte de portabilité, et elle se marque comme telle.
  addProjectionWarnings(compositionWarnings);
  warningCursor = warnings.length;

  await annoncer('Lecture des variables…');
  verifier();
  etape('wrapper');
  const wrapper = referenceComponent
    ? await findWrapperReference(referenceComponent, warnings, composed)
    : null;
  const stateNotices: string[] = [];
  const stateModel = buildStateModel(
    matrix.axes,
    matrix.variants.map((entry) => entry.values),
    warnings,
    stateNotices,
  );

  const propertySurface = buildContractPropertySurface(
    componentSet.componentPropertyDefinitions,
    wrapper?.componentSet?.componentPropertyDefinitions,
    warnings,
    propertyModel,
    wrapper?.componentSet?.name,
  );
  const props = propertySurface.props;
  // Aucune prop `icon` n'existe encore : `mergeIconRules` les ajoute plus loin,
  // depuis une règle du composant lui-même, que nul imbriqué ne déclare.
  const clesDuParent = new Set(Object.keys(propertyModel.props));
  const imbriques = releverLesImbriques({
    composant: componentSet,
    variants: matrix.variants.map((entry) => entry.component),
    maitres: mainByInstanceId,
    contractes,
    composed,
    horsDuParent: Object.keys(props).filter((cle) => !clesDuParent.has(cle)),
  });
  const publicPropertyKeyByFigmaName = propertySurface.publicPropertyKeyByFigmaName;
  markProjectionWarningsSince(warningCursor);
  warnings.push(...stateNotices);
  reporterLocalisations(stateNotices, warnings);
  warningCursor = warnings.length;

  const { bindings: propertyBindings, applied: appliedByVariant } = await calculerParTranches(extractPropertyBindingsParEtapes(
    matrix,
    publicPropertyKeyByFigmaName,
    warnings,
    composed,
    mainByInstanceId,
  ));
  markProjectionWarningsSince(warningCursor);
  warningCursor = warnings.length;

  if (Object.keys(componentSet.componentPropertyDefinitions).length === 0) {
    pousserLocalise(warnings, 'Component Set', componentSet, {
      famille: 'proprietes',
      manque: 'aucune propriété de composant n’est définie.',
      impact: 'Le contrat ne décrira ni variants ni options.',
      action: 'Si ce composant doit en avoir, déclarez-les dans Figma, puis réexportez.',
    });
  }
  // Une API vide est complète pour un composant qui n'expose aucune propriété.
  warningCursor = warnings.length;

  // Le résolveur reçoit l'index des variables locales pour deux raisons : il y
  // lit les chemins sans un aller-retour par variable, et il sait quelles
  // variables partagent un nom, les seules qu'un contrat ne doit jamais citer.
  etape('variables');
  const lireLesCollections = () => figma.variables.getLocalVariableCollectionsAsync();
  const lireLesVariables = () => figma.variables.getLocalVariablesAsync();
  const [collections, variables] = await Promise.all([
    inventaires ? inventaires.collectionsLocales(lireLesCollections) : lireLesCollections(),
    inventaires ? inventaires.variablesLocales(lireLesVariables) : lireLesVariables(),
  ]);
  const collectionById = new Map<string, VariableCollection>();
  for (const collection of collections) {
    await respirerSiBesoin();
    collectionById.set(collection.id, collection);
  }
  const index = await calculerParTranches(indexVariablesParEtapes(variables, collectionById));
  const resolver = new VariableNameResolver({ index, warnings, ressources: inventaires?.ressources });

  const extracted = await extractStructure(
    matrix,
    matrixWarnings,
    wrapper,
    referenceComponent,
    resolver,
    composed,
    rules.iconRules.map((rule) => rule.iconName),
    imbriques,
    annoncer,
  );
  markProjectionWarningsSince(warningCursor);
  addProjectionWarnings(extracted.warnings);
  warnings.push(...extracted.notices);
  reporterLocalisations(extracted.notices, warnings);
  warningCursor = warnings.length;

  // La documentation issue des règles s'accroche aux props de même nature, et
  // aux états pour l'axe que `stateModel` publie à la place des props.
  mergePropDescriptions(props, stateModel, rules.propDescriptions, warnings);
  mergeBooleanDescriptions(props, rules.booleanDescriptions, warnings);
  mergeEnumDefaults(props, rules.enumDefaults, warnings);
  // Ces deux fusions ne portent que la documentation des règles.
  warningCursor = warnings.length;
  const icons = mergeIconRules(props, extracted.iconLayers, rules.iconRules, warnings);
  markProjectionWarningsSince(warningCursor);
  warningCursor = warnings.length;
  for (const variant of extracted.variants) {
    await respirerSiBesoin();
    for (const [key, definition] of Object.entries(icons)) {
      await respirerSiBesoin();
      const exactLayer = extracted.iconLayers.find(
        (layer) => layer.figmaLayer === definition.figmaName,
      );
      // Les coordonnées d'axes ne suffisent pas quand deux variants se
      // normalisent pareil. L'inventaire garde donc l'id du node exact : une
      // icône présente dans le second ne doit pas être inventée dans le premier.
      const active = exactLayer?.variantNodeIds.includes(variant.nodeId) ?? false;
      if (!active) continue;
      const paths = await iconPaths(variant.structure.children ?? [], definition.figmaName);
      if (paths.length === 1) {
        variant.icons[key] = { figmaName: definition.figmaName, slotPath: paths[0] };
        continue;
      }
      const sujetDeLIcone =
        `Icône « ${definition.figmaName} » du variant « ${variant.figmaName} »`;
      const message = pousserSansNode(warnings, sujetDeLIcone, paths.length === 0
        ? {
          famille: 'imbriques',
          manque: 'le contrat ne décrit pas son calque dans ce variant.',
          impact: 'Le développeur ne saura pas où la placer et ne la rendra pas.',
          action: 'Rendez son calque visible et placez-le dans le cadre en auto layout qui porte '
            + 'le gap et le padding, puis réexportez.',
        }
        : {
          famille: 'imbriques',
          manque: 'plusieurs calques de ce variant portent ce nom.',
          impact: 'Le développeur ne saura pas lequel est l’icône.',
          action: 'Donnez un nom distinct à chaque calque, puis réexportez.',
        });
      projectionWarnings.push(message);
    }
  }
  warningCursor = warnings.length;
  const intent = rules.intent;
  const intentionARediger = rules.tagsARediger.some((tag) => TAGS_D_INTENTION.includes(tag));
  if (!intent && !intentionARediger) {
    pousserSansNode(warnings, 'Règles d’usage', {
      famille: 'regles',
      manque: 'aucune règle @usage, @do, @dont ou @pairs n’est déclarée.',
      impact: 'Le développeur ne recevra aucune consigne sur les cas d’usage du composant.',
      action: 'Ajoutez au moins une règle @usage, puis réexportez.',
    });
  }
  warningCursor = warnings.length;

  // Chaque composition de vue se dérive de son arbre exact, comme
  // `tokensUsed` se dérive du contrat terminé. Le champ global en est l'union
  // ordonnée à cardinalité maximale : une dépendance conditionnelle ne disparaît
  // donc pas seulement parce qu'elle manque au variant de référence.
  //
  // Chaque séquence se lit sur son arbre, pas sur l'ordre où l'extraction a rangé ses
  // trouvailles : celui-ci dépend de l'ordonnancement des `await`, et deux
  // cadres frères pourraient se doubler sans qu'aucun design ait changé.
  const composesPlacees = await mergeVariantDependencies(extracted.variants);
  const placees = new Set(composesPlacees);
  for (const dependency of scannedComposes) {
    await respirerSiBesoin();
    if (placees.has(dependency)) continue;
    const message = pousserSansNode(
      warnings,
      sujetSansNode('Layer', dependency.figmaLayer, 'nom-publie'),
      {
        famille: 'imbriques',
        manque: `il contient le composant « ${dependency.component} », mais le contrat ne `
          + `décrit ce calque nulle part.`,
        impact: `Le développeur ne rendra pas « ${dependency.component} » dans ce composant.`,
        action: `Placez ce calque dans le cadre en auto layout qui porte le gap et le padding, puis `
          + `réexportez.`,
      },
    );
    projectionWarnings.push(message);
  }

  const jonction = joindreLesCanaux({
    composant: componentSet,
    imbriques,
    warnings,
    avertissementsDeStructure: extracted.warnings,
    projectionWarnings,
  });
  return {
    ...jonction,
    props,
    stateModel,
    imbriques,
    rules,
    couverture: couvertureDe(bornee?.bilan),
    pourLaPublication: {
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
    },
  };
}

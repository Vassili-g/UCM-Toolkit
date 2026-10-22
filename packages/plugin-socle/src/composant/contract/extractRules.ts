/**
 * Lecture des règles d'usage d'un composant depuis son « .componentRules ».
 *
 * Chaque composant décrit ses règles dans une instance du composant Figma
 * `.componentRules`, posée sur la même page que lui. Le lien entre les deux ne
 * passe plus par un nom de calque mais par un texte affiché : le calque
 * « component-name » du conteneur porte le nom du composant documenté.
 *
 * Le conteneur range des instances de `.ruleItem`, une par règle, dont le
 * calque nommé `@usage`, `@prop`, `@boolean`, `@do`, `@dont`, `@pairs`,
 * `@icons` ou `@default` porte le tag, et dont le calque « content » porte le
 * texte (plus un calque « prop » pour `@prop`, `@boolean` et `@default`, ex.
 * « variant.contained » ou « icon-left », un calque « icon » pour `@icons`).
 *
 * Aucune logique spécifique à un composant : le conteneur, le composant de
 * règle et les tags sont des conventions uniformes, valables pour n'importe
 * quel composant.
 *
 * Ce fichier ne fait que lire : le conteneur reste la source de vérité, lu tel
 * quel et reversé dans le contrat. Le geste qui le pose vit dans
 * `src/composant/template/ecriture.ts`, seul fichier du moteur qui écrive dans le
 * document.
 */
import {
  CALQUES_DE_CONTENU,
  CALQUES_DU_KIT_DE_REGLES,
  CALQUES_LUS_PAR_TAG,
  MAITRES_COMPACTES,
  MAITRES_DU_KIT_DE_REGLES,
  MARQUEUR_A_COMPLETER,
  TAGS_DES_REGLES,
  estUneInstanceVierge,
  nomCompacte,
  porteLeMarqueur,
} from '@ucm-kit/core/referentiel';
import type { TextesDesCalques } from '@ucm-kit/core/referentiel';
import {
  buildRules,
  iconPolicyFromVisibility,
  ruleTagFromLayerName,
  ruleTagFromValue,
} from './rulesModel';
import type { RuleEntry, RuleTag, RulesResult } from './rulesModel';
export {
  buildRules,
  hasUsableRules,
  iconPolicyFromVisibility,
  ruleTagFromLayerName,
  ruleTagFromValue,
} from './rulesModel';
import {
  noter,
  noterSansNode,
  pointDe,
  pousserLocalise,
  pousserNote,
  pousserSansNode,
  reporterLocalisations,
  sujetNomme,
  sujetSansNode,
} from './localisation';
export type { IconRule, RuleEntry, RuleTag, RulesResult } from './rulesModel';

/**
 * Ce que le parcours de page retient en plus des conteneurs du composant.
 *
 * L'interface offre de créer les règles d'un composant qui n'en a pas, et
 * cette offre dépend de ce que la page porte. Le relevé se remplit pendant le
 * parcours que la lecture des règles fait déjà : un second coûterait une
 * traversée complète à chaque changement de sélection, sur le chemin que le
 * designer sent passer.
 *
 * Ce que `extractRules` remplit vient de la page active. Le parcours des
 * sources (`src/composant/template/sources.ts`) rend un relevé de même forme pour une
 * autre page, dont `code.ts` ne garde que les deux maîtres : les deux premiers
 * champs décrivent toujours la page active.
 */
export type ReleveDeSource = {
  /** Un conteneur écrit déjà le nom du composant sélectionné, sur la page active. */
  conteneurDuComposant: boolean;
  /** Instance de la page active, collée et jamais remplie, prête à recevoir des règles. */
  conteneurVierge: InstanceNode | null;
  /** Le maître « .componentRules », de la page active ou d'une autre page. */
  maitreLocal: ComponentNode | null;
  /** L'instance qui sert de source à défaut du maître, de la page active ou d'une autre. */
  instanceSource: InstanceNode | null;
};

/** Un relevé qui n'a encore rien vu. */
export function releveVide(): ReleveDeSource {
  return {
    conteneurDuComposant: false,
    conteneurVierge: null,
    maitreLocal: null,
    instanceSource: null,
  };
}

/**
 * Vrai d'un conteneur au nom marqué qu'aucune règle rédigée n'occupe.
 *
 * Le nom marqué ne suffit pas : un conteneur dont on aurait effacé le nom par
 * erreur serait rempli par-dessus son travail. Le critère est ce que ses
 * instances écrivent, et non ce qu'elles sont : `isRuleInstance` est
 * asynchrone, et ce relevé se fait pendant le parcours de page. Une instance
 * qui n'est pas une règle et qui écrit quelque chose compte donc pour du
 * travail, ce qui range la prudence du bon côté.
 */
function estVierge(conteneur: InstanceNode): boolean {
  return estUneInstanceVierge(
    conteneur
      .findAll((node) => node.type === 'INSTANCE')
      .map((node) => textesDesCalques(node as InstanceNode, CALQUES_DE_CONTENU)),
  );
}

/** Résultat de lecture enrichi pour distinguer l'absence du conteneur de son contenu invalide. */
export type ExtractedRules = RulesResult & {
  sectionFound: boolean;
  releve: ReleveDeSource;
  /**
   * Combien de règles posées attendent encore leur texte, c'est-à-dire portent
   * le marqueur dans un calque que leur tag lit.
   *
   * La carte du composant s'en sert pour séparer deux situations qui ne
   * demandent pas le même geste : poser un conteneur, ou rédiger celui qui
   * vient d'être posé. Sans ce compte, la carte dirait « aucune règle » juste
   * après en avoir créé vingt-deux.
   */
  aRediger: number;
  /**
   * Les tags qui ont au moins une règle marquée. L'export ne redit pas
   * l'absence d'intention quand une règle d'intention attend son texte : la
   * ligne du marqueur demande déjà le geste.
   */
  tagsARediger: readonly RuleTag[];
};

/**
 * Ce qu'un node doit offrir pour qu'on cherche un calque dans sa descendance.
 *
 * `findOne` est facultatif parce que le prédicat d'un `findAll` de page reçoit
 * tous les types de node, feuilles comprises : un `TextNode` n'a pas de
 * descendance, et exiger la méthode ferait de ce fait un cast.
 */
export type NodeFouillable = {
  type: string;
  findOne?: (predicat: (child: SceneNode) => boolean) => SceneNode | null;
};

/**
 * Nom d'un node, ou null quand Figma refuse de le servir.
 *
 * Un sous-calque d'instance reste annoncé par le parcours de la page alors que
 * Figma ne le rend plus : lire son nom lève « The node ... does not exist », et
 * l'exception traverse le `findOne` natif, qui fait échouer la lecture des
 * règles du composant sélectionné. Un node que Figma ne rend pas n'est le
 * calque cherché par aucun parcours d'ici, et le passer laisse les autres
 * lisibles.
 */
export function nomLisible(node: { name: string }): string | null {
  try {
    return node.name;
  } catch {
    return null;
  }
}

/** Vrai d'un node dont le nom vaut la cible, espaces et casse en moins. */
export function porteLeNom(node: { name: string }, cible: string): boolean {
  return nomLisible(node)?.trim().toLowerCase() === cible;
}

/** Texte du premier calque texte d'un nom donné dans un node (vide si absent). */
export function textOfLayer(node: NodeFouillable, layerName: string): string {
  const found = layerOfName(node, layerName.trim().toLowerCase());
  return found ? found.characters : '';
}

/** Premier calque texte d'un nom donné, ou null : `textOfLayer` confond les deux. */
function layerOfName(node: NodeFouillable, target: string): TextNode | null {
  const found = node.findOne?.(
    (child) => child.type === 'TEXT' && porteLeNom(child, target),
  );
  return (found ?? null) as TextNode | null;
}

/**
 * Le relevé portable d'un node : pour chaque calque demandé qu'il porte, son
 * texte, ou une chaîne vide si le calque n'est pas un texte (`modifiable`,
 * `strict`). Un calque absent n'a pas d'entrée, ce que le validateur du kit lit
 * comme manquant.
 */
export function textesDesCalques(
  node: NodeFouillable,
  calques: readonly string[],
): TextesDesCalques {
  const textes: Record<string, string> = {};
  for (const calque of calques) {
    const cible = calque.trim().toLowerCase();
    const texte = layerOfName(node, cible);
    if (texte) textes[calque] = texte.characters;
    else if (node.findOne?.((enfant) => porteLeNom(enfant, cible))) textes[calque] = '';
  }
  return textes;
}

/**
 * Nom écrit dans le calque « component-name » d'un node, ou null si le node
 * n'en porte pas.
 *
 * La chaîne vide et l'absence ne disent pas la même chose, et c'est pourquoi
 * elles ne se confondent pas ici : un conteneur au calque vide documente
 * personne et peut se signaler, tandis qu'un node ordinaire n'a rien à dire.
 *
 * Le type `INSTANCE` est exigé pour une raison mesurée : le composant maître
 * `.componentRules` porte lui aussi ce calque, pré-rempli avec le nom du
 * composant qui a servi de modèle. Sans cette borne, ce maître revendiquerait
 * les règles d'un composant qu'il ne documente pas.
 */
export function nomDeComposantEcrit(node: NodeFouillable): string | null {
  if (node.type !== 'INSTANCE') return null;
  const calque = layerOfName(node, CALQUES_DU_KIT_DE_REGLES.nomDuComposant);
  return calque ? calque.characters : null;
}

/**
 * Nom compacté du composant dont ce node porte les règles, ou null si ce n'en
 * est pas un conteneur.
 *
 * Unique définition de « ce node porte les règles de X ». `extractRules`
 * l'utilise pour enrichir le contrat et `composedComponents` pour reconnaître
 * une dépendance unifiée. L'absence de règles n'empêche pas de capturer le
 * composant sélectionné, mais elle empêche ses parents de supposer qu'un
 * contrat autonome existe déjà pour lui.
 *
 * Le critère est le calque, jamais le composant maître : une instance de
 * `.componentRules` que le designer renomme reste un conteneur, et résoudre son
 * maître demanderait un aller-retour asynchrone sur chaque instance de chaque
 * page, sur le chemin que le designer sent passer à chaque sélection.
 *
 * La comparaison ignore la casse et les espaces : dans un nom écrit à la main,
 * ils ne portent aucune intention de design et ne doivent bloquer aucun export.
 * Un nom qui porte le marqueur est le texte d'aide du maître : il ne nomme
 * personne.
 */
export function rulesContainerOwner(
  node: NodeFouillable,
  nom: string | null = nomDeComposantEcrit(node),
): string | null {
  if (nom === null || porteLeMarqueur(nom)) return null;
  return nomCompacte(nom) || null;
}

/**
 * Le calque de nom d'un conteneur qui ne nomme personne : vide, ou encore
 * marqué. Null d'un node qui n'est pas un conteneur, ou qui nomme un composant.
 */
function nomOrphelin(node: NodeFouillable): 'vide' | 'marque' | null {
  const nom = nomDeComposantEcrit(node);
  if (nom === null) return null;
  if (porteLeMarqueur(nom)) return 'marque';
  return nomCompacte(nom) === '' ? 'vide' : null;
}

/**
 * Lit la visibilité d'un calque de règle. `null` signifie que le calque est
 * absent : on le distingue d'un calque présent mais masqué pour diagnostiquer
 * correctement une configuration Figma incomplète.
 */
function visibilityOfLayer(instance: InstanceNode, layerName: string): boolean | null {
  const target = layerName.trim().toLowerCase();
  const node = instance.findOne((child) => porteLeNom(child, target)) as
    | (SceneNode & { visible?: boolean })
    | null;
  return node ? node.visible !== false : null;
}

/** Construit l'entrée `@icons` à partir de ses trois calques dédiés. */
function iconRuleEntry(instance: InstanceNode): RuleEntry {
  const modifiable = visibilityOfLayer(instance, CALQUES_DU_KIT_DE_REGLES.modifiable);
  const strict = visibilityOfLayer(instance, CALQUES_DU_KIT_DE_REGLES.strict);

  return {
    tag: 'icons',
    content: '',
    iconName: textOfLayer(instance, CALQUES_DU_KIT_DE_REGLES.icone),
    iconPolicy: iconPolicyFromVisibility(modifiable, strict),
  };
}

/**
 * Nom compacté du catalogue d'où vient un maître : son component set quand il
 * en a un, lui-même sinon.
 *
 * Un composant de règle ou de section vit dans un component set, et c'est le
 * set qui porte le nom que les conventions emploient ; le variant, lui, porte
 * `Type=@usage`. Un composant sans set reste lisible par son propre nom.
 */
export function nomDuCatalogue(main: ComponentNode | null): string {
  const owner = main?.parent?.type === 'COMPONENT_SET' ? main.parent.name : main?.name ?? '';
  return nomCompacte(owner);
}

/**
 * Vrai si une instance est bien un `.ruleItem` : on remonte à son composant
 * maître, puis à son component set, qui porte le nom du composant de règle.
 *
 * Le coût asynchrone est borné au sous-arbre du conteneur déjà trouvé, et non
 * à la page : c'est ce qui permet à `rulesContainerOwner` de rester synchrone.
 */
async function isRuleInstance(instance: InstanceNode): Promise<boolean> {
  const main = await instance.getMainComponentAsync().catch(() => null);
  return nomDuCatalogue(main) === MAITRES_COMPACTES.regle;
}

/**
 * Vrai d'une instance de règle qui n'écrit ni texte ni cible.
 *
 * Le catalogue `.ruleItem` porte des variants de mise en page, `divider` par
 * exemple, qui ne documentent aucune règle. Les écarter sans un mot est ce que
 * la borne du dépôt demande : rien n'est perdu, donc rien ne se dit, et un
 * message qui réclame un geste déjà fait apprend au designer à survoler.
 *
 * Le critère est ce que l'instance écrit, jamais le nom d'un variant : un
 * séparateur ajouté plus tard ne demandera aucune mise à jour du moteur.
 */
function nEcritRien(instance: InstanceNode): boolean {
  return CALQUES_DE_CONTENU.every((calque) => textOfLayer(instance, calque).trim() === '');
}

/** Vrai d'une règle dont un calque lu porte encore le marqueur. */
function nEstPasRedigee(instance: InstanceNode, tag: RuleTag): boolean {
  return CALQUES_LUS_PAR_TAG[tag].some((calque) => porteLeMarqueur(textOfLayer(instance, calque)));
}

/**
 * Une ligne par tag pour les règles encore marquées. Chaque ligne porte toutes
 * les instances de son tag : un clic les sélectionne ensemble, et dix-sept
 * `@prop` ne font pas dix-sept lignes.
 */
function signalerNonRedigees(
  warnings: string[],
  parTag: ReadonlyMap<RuleTag, readonly InstanceNode[]>,
): void {
  const marqueur = `« ${MARQUEUR_A_COMPLETER} »`;
  for (const [tag, regles] of parTag) {
    const sujetDesRegles = sujetNomme('Layer', MAITRES_DU_KIT_DE_REGLES.regle, regles[0]);
    const une = regles.length === 1;
    const message = pousserNote(
      warnings,
      pointDe(sujetDesRegles.texte, une
        ? {
          famille: 'regles',
          manque: `une règle @${tag} contient encore ${marqueur}.`,
          impact: 'Le développeur ne recevra pas sa documentation.',
          action: `Remplacez ${marqueur} par le texte de la règle, ou supprimez-la, `
            + 'puis réexportez.',
        }
        : {
          famille: 'regles',
          manque: `${regles.length} règles @${tag} contiennent encore ${marqueur}.`,
          impact: 'Le développeur ne recevra pas leur documentation.',
          action: `Remplacez ${marqueur} par le texte de chaque règle, ou supprimez-les, `
            + 'puis réexportez.',
        }),
      sujetDesRegles,
    );
    for (const regle of regles.slice(1)) {
      noter(warnings, message, sujetNomme('Layer', MAITRES_DU_KIT_DE_REGLES.regle, regle));
    }
  }
}

/**
 * Le tag d'une règle, lu sur deux témoins : le calque `@…` que le designer voit
 * et la valeur de variante que Figma range.
 *
 * Le calque tranche, parce qu'il est le seul des deux à s'afficher, et parce
 * que Figma auto-nomme un variant ajouté « TypeN » sans toucher à ce qu'il
 * montre. Une valeur de variante qui ne nomme aucun tag n'est donc pas une
 * contradiction mais un témoin muet, et rien ne se dit puisque rien n'est
 * perdu. Deux témoins qui nomment chacun un tag différent se contredisent, et
 * c'est au designer de trancher.
 */
function ruleTagOf(instance: InstanceNode, warnings: string[]): RuleTag | null {
  const calque = instance.findOne(
    (child) => child.type === 'TEXT' && ruleTagFromLayerName(nomLisible(child) ?? '') !== null,
  );
  const affiche = calque ? ruleTagFromLayerName(calque.name) : null;
  const range = Object.values(instance.variantProperties ?? {})
    .map(ruleTagFromValue)
    .find((value): value is RuleTag => value !== null) ?? null;

  if (affiche !== null && range !== null && affiche !== range) {
    pousserLocalise(warnings, 'Layer', instance, {
      famille: 'regles',
      manque: `il affiche le tag « @${affiche} », mais son variant est « @${range} ».`,
      impact: `Le contrat range cette règle en « @${affiche} », pas en « @${range} ».`,
      action: 'Choisissez le variant qui correspond au tag voulu, puis réexportez.',
    });
  }
  return affiche ?? range;
}

/** Les instances sans calque de nom ne demandent aucune fouille de leur contenu. */
function candidatsDeRegles(page: PageNode): SceneNode[] {
  if (typeof page.findAllWithCriteria !== 'function') {
    return page.findAll((node) => node.type === 'INSTANCE' || node.type === 'COMPONENT');
  }
  const instances = new Set<string>();
  for (const texte of page.findAllWithCriteria({ types: ['TEXT'] })) {
    if (!porteLeNom(texte, CALQUES_DU_KIT_DE_REGLES.nomDuComposant)) continue;
    let parent = texte.parent;
    while (parent && parent !== page) {
      if (parent.type === 'INSTANCE') instances.add(parent.id);
      parent = parent.parent;
    }
  }
  return page.findAllWithCriteria({ types: ['INSTANCE', 'COMPONENT'] })
    .filter((node) => node.type === 'COMPONENT' || instances.has(node.id));
}

/**
 * Point d'entrée : lit le `.componentRules` du composant sélectionné et en tire
 * l'intention + la doc par valeur. `sectionFound` distingue « pas de conteneur »
 * (composant sans règles) de « conteneur présent mais vide », pour un warning
 * précis.
 *
 * La page est capturée au début du geste : un changement de page pendant
 * l'attente ne doit pas changer les règles du composant ciblé.
 */
export async function extractRules(
  componentSet: ComponentNode | ComponentSetNode,
  page: PageNode = figma.currentPage,
): Promise<ExtractedRules> {
  const owner = nomCompacte(componentSet.name);
  const releve = releveVide();
  // On les cherche tous : n'en lire qu'un alors que la page en porte plusieurs
  // ferait disparaître des règles sans que rien ne le dise. Le même parcours
  // relève ce dont l'offre de création a besoin.
  const candidats = candidatsDeRegles(page);
  const containers = candidats.filter((node) => {
    if (node.type === 'COMPONENT' && nomCompacte(node.name) === MAITRES_COMPACTES.conteneur) {
      releve.maitreLocal ??= node;
      return false;
    }
    const nom = nomDeComposantEcrit(node);
    if (nom === null) return false;
    releve.instanceSource ??= node as InstanceNode;
    if (porteLeMarqueur(nom) && estVierge(node as InstanceNode)) {
      releve.conteneurVierge ??= node as InstanceNode;
    }
    const estConteneur = rulesContainerOwner(node, nom) === owner;
    if (estConteneur) releve.conteneurDuComposant = true;
    return estConteneur;
  }) as (SceneNode & ChildrenMixin)[];

  const container = containers[0];
  if (!container) {
    const absent: string[] = [];
    // Un conteneur au calque vide ne documente personne, et son travail est
    // perdu en silence. Il ne mérite pas son propre message, qui partirait dans
    // l'export de composants qui n'y sont pour rien : il devient l'action de
    // celui-ci, seul message que son absence de règles concerne vraiment.
    const orphelin = candidats.find((node) => nomOrphelin(node) !== null);
    if (orphelin) {
      const marque = nomOrphelin(orphelin) === 'marque';
      pousserLocalise(absent, 'Layer', orphelin, {
        famille: 'regles',
        manque: marque
          ? `son calque « ${CALQUES_DU_KIT_DE_REGLES.nomDuComposant} » contient encore « ${MARQUEUR_A_COMPLETER} », `
            + 'donc il ne documente aucun composant.'
          : `son calque « ${CALQUES_DU_KIT_DE_REGLES.nomDuComposant} » est vide, donc il ne documente `
            + 'aucun composant.',
        impact: 'Le contrat ne contiendra aucune règle d’usage, '
          + 'documentation de propriété ou règle d’icône.',
        action: marque
          ? `Remplacez ce texte par « ${componentSet.name} », puis réexportez.`
          : `Écrivez « ${componentSet.name} » dans ce calque, puis réexportez.`,
      });
    } else {
      // La cible n'existe pas : son absence est déclarée, pas subie. Le message
      // nomme aussi le composant, qui est un calque : sans cette déclaration, la
      // loi de localisation le lirait comme un site qu'on a oublié de convertir.
      const message = pousserSansNode(
        absent,
        sujetSansNode('Layer', MAITRES_DU_KIT_DE_REGLES.conteneur, 'inexistant'),
        {
          famille: 'regles',
          manque: `aucune instance de cette page n’écrit « ${componentSet.name} » dans son `
            + `calque « ${CALQUES_DU_KIT_DE_REGLES.nomDuComposant} ».`,
          impact: 'Le contrat ne contiendra aucune règle d’usage, '
            + 'documentation de propriété ou règle d’icône.',
          action: `Posez une instance de « ${MAITRES_DU_KIT_DE_REGLES.conteneur} » à côté du composant, `
            + `écrivez « ${componentSet.name} » dans son calque « ${CALQUES_DU_KIT_DE_REGLES.nomDuComposant} », `
            + 'puis réexportez.',
        },
      );
      noterSansNode(absent, message, 'inexistant');
    }
    return {
      intent: null,
      propDescriptions: {},
      booleanDescriptions: {},
      enumDefaults: {},
      iconRules: [],
      warnings: absent,
      sectionFound: false,
      releve,
      aRediger: 0,
      tagsARediger: [],
    };
  }

  const instances = container
    .findAll((node) => node.type === 'INSTANCE')
    .filter((node): node is InstanceNode => node.type === 'INSTANCE');

  const entries: RuleEntry[] = [];
  const nonRedigees = new Map<RuleTag, InstanceNode[]>();
  const warnings: string[] = [];
  if (containers.length > 1) {
    // La cause n'est pas un rangement à refaire : le maître `.componentRules`
    // est livré avec un `component-name` pré-rempli, et toute instance fraîche
    // revendique donc ce nom-là jusqu'à sa première édition.
    const sujetDuDoublon = sujetNomme('Layer', MAITRES_DU_KIT_DE_REGLES.conteneur, container);
    const ignorees = containers.length - 1;
    pousserNote(
      warnings,
      pointDe(sujetDuDoublon.texte, {
        famille: 'regles',
        manque: `${containers.length} instances écrivent « ${componentSet.name} » dans leur `
          + `calque « ${CALQUES_DU_KIT_DE_REGLES.nomDuComposant} », et l’export n’en lit qu’une.`,
        impact: ignorees === 1
          ? 'Les règles de l’autre instance manqueront au développeur.'
          : `Les règles des ${ignorees} autres instances manqueront au développeur.`,
        action: `Ne laissez « ${componentSet.name} » que dans une instance : écrivez dans `
          + 'les autres le nom du composant qu’elles documentent, puis réexportez.',
      }),
      sujetDuDoublon,
    );
  }

  for (const instance of instances) {
    if (!(await isRuleInstance(instance))) continue;

    const tag = ruleTagOf(instance, warnings);
    if (!tag) {
      if (nEcritRien(instance)) continue;
      pousserSansNode(warnings, `Une règle de « ${MAITRES_DU_KIT_DE_REGLES.conteneur} »`, {
        famille: 'regles',
        manque: `aucun de ses calques ne porte de tag (${TAGS_DES_REGLES.map((tag) => `@${tag}`).join(', ')}).`,
        impact: 'Sa documentation manquera au développeur.',
        action: 'Choisissez son variant dans Figma, puis réexportez.',
      });
      continue;
    }
    // Avant `buildRules` : une règle marquée ne dit pas en plus que son
    // content est vide ou que sa politique d'icône est illisible.
    if (nEstPasRedigee(instance, tag)) {
      nonRedigees.set(tag, [...(nonRedigees.get(tag) ?? []), instance]);
      continue;
    }

    entries.push(
      tag === 'icons'
        ? iconRuleEntry(instance)
        : {
            tag,
            content: textOfLayer(instance, CALQUES_DU_KIT_DE_REGLES.contenu),
            prop: tag === 'prop' || tag === 'boolean' || tag === 'default'
              ? textOfLayer(instance, CALQUES_DU_KIT_DE_REGLES.cible)
              : undefined,
          },
    );
  }

  signalerNonRedigees(warnings, nonRedigees);
  // Une règle marquée porte un tag : le conteneur n'est pas vide pour autant.
  if (entries.length === 0 && nonRedigees.size === 0) {
    const sujetDuConteneur = sujetNomme('Layer', MAITRES_DU_KIT_DE_REGLES.conteneur, container);
    pousserNote(
      warnings,
      pointDe(sujetDuConteneur.texte, {
        famille: 'regles',
        manque: `il ne contient aucune instance de « ${MAITRES_DU_KIT_DE_REGLES.regle} » qui porte un tag.`,
        impact: 'Le développeur ne recevra aucune règle d’usage pour ce composant.',
        action: 'Ajoutez-y au moins une règle, puis réexportez.',
      }),
      sujetDuConteneur,
    );
  }

  const built = buildRules(entries);
  // Deux canaux fusionnés, donc deux registres à reporter : sans cela le
  // message arrive et ses parties restent derrière.
  const tous = [...warnings, ...built.warnings];
  reporterLocalisations(warnings, tous);
  reporterLocalisations(built.warnings, tous);
  return {
    intent: built.intent,
    propDescriptions: built.propDescriptions,
    booleanDescriptions: built.booleanDescriptions,
    enumDefaults: built.enumDefaults,
    iconRules: built.iconRules,
    warnings: tous,
    sectionFound: true,
    releve,
    aRediger: [...nonRedigees.values()].reduce((total, regles) => total + regles.length, 0),
    tagsARediger: [...nonRedigees.keys()],
  };
}

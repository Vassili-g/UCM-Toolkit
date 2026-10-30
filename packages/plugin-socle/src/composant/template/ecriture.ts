/**
 * Poser dans le document les règles d'usage d'un composant.
 *
 * Seul fichier du moteur qui écrit dans Figma, et seul exclu de la loi du
 * document intact. Ce qu'il pose se défait d'un geste : supprimer le conteneur.
 * Il crée un conteneur (`creerLesRegles`), ou complète un conteneur déjà rempli
 * sans retirer aucune règle rédigée (`ajouterLesRegles`).
 *
 * Trois règles d'écriture, mesurées dans Figma (`SPEC.md`, « Comment l'écriture
 * range une règle »), et aucune n'est négociable :
 *
 * - une règle s'écrit hors de l'arbre, puis se range d'un seul geste. Un ajout
 *   dans un slot déjà imbriqué laisse une coquille à l'ancien chemin du node,
 *   et tout parcours du conteneur lève jusqu'à la fin de la session ;
 * - aucun handle de sous-calque ne se garde : son id est un chemin, et le
 *   chemin bouge dès qu'on écrit ailleurs dans l'instance. Chaque calque se
 *   retrouve juste avant usage ;
 * - une écriture se relit. Reçue par un handle périmé, elle est perdue sans
 *   lever, et le texte d'aide du maître partirait dans le contrat.
 *
 * Une section déjà rangée dans le conteneur ne reçoit donc jamais de règle, et
 * ne se copie pas non plus : mesuré, les règles d'un `clone()` de section remplie
 * gardent des chemins morts, et l'analyse ne les reconnaît plus. Elle se
 * reconstruit : ses règles se relisent (cible et description, telles qu'écrites),
 * une section neuve les reçoit avec les manquantes hors de l'arbre, puis prend
 * la place de l'ancienne d'un seul geste, comme à la création.
 */
import {
  CALQUES_DU_KIT_DE_REGLES,
  MAITRES_DU_KIT_DE_REGLES,
  MARQUEUR_A_COMPLETER,
  porteLeMarqueur,
} from '@ucm-kit/core/referentiel';
import { completerLaSection, nombreDeRegles } from './modele';
import type { ElementDeModele, ModeleDeRegles, SectionDeModele } from './modele';
import type { SourcesDeCreation } from './sources';
import type { RuleTag } from '../contract/extractRules';
import { ruleTagFromLayerName, ruleTagFromValue } from '../contract/rulesModel';
import type { Annonce } from '../annonce';

/** Nom du slot qui porte les sections d'un conteneur. */
const SLOT_DES_SECTIONS = 'Sections-Wrapper';
/** Nom du slot qui porte les règles d'une section. */
const SLOT_DES_REGLES = 'Rules-Wrapper';
/** Distance entre le composant et son conteneur, et entre le conteneur et un voisin. */
const ECART = 80;
/**
 * Borne des boucles qui retirent un enfant à la fois. Un retrait qui n'aboutit
 * pas ferait tourner Figma à vide ; la borne en fait une erreur, que le
 * designer voit.
 */
const TOURS_MAX = 200;

/** Ce que la création laisse au designer. */
export type ResultatDeCreation = {
  conteneur: InstanceNode;
  /** Nombre de règles posées, séparateurs exclus : ce qu'il reste à rédiger. */
  regles: number;
};

/** Un node retrouvé par son id, ou lui-même quand l'id ne résout plus. */
async function frais<T extends BaseNode>(node: T): Promise<T> {
  const vivant = await figma.getNodeByIdAsync(node.id).catch(() => null);
  return (vivant as T | null) ?? node;
}

/**
 * Le slot d'un nom donné, ou le premier que le node porte.
 *
 * Le repli sur le premier slot est ce qui fait tenir un maître dont le slot a
 * été renommé : la structure compte, pas le nom, et un conteneur n'en porte
 * qu'un à chaque niveau.
 */
function slotDe(node: SceneNode & ChildrenMixin, nom: string): SlotNode | null {
  const cible = nom.trim().toLowerCase();
  const nomme = node.findOne(
    (enfant) => enfant.type === 'SLOT' && enfant.name.trim().toLowerCase() === cible,
  );
  return (nomme ?? node.findOne((enfant) => enfant.type === 'SLOT')) as SlotNode | null;
}

/** Le slot d'un porteur, retrouvé depuis lui : après un ajout, seul ce chemin le rend. */
async function slotFrais(porteur: InstanceNode, nom: string): Promise<SlotNode> {
  const slot = slotDe(await frais(porteur), nom);
  if (!slot) {
    throw new Error(
      `« ${porteur.name} » ne porte pas de slot « ${nom} ». Ce composant n'est pas celui `
        + `que « ${MAITRES_DU_KIT_DE_REGLES.conteneur} » attend.`,
    );
  }
  return slot;
}

/** Vide un slot, un enfant à la fois, en le retrouvant après chaque retrait. */
async function viderLeSlot(porteur: InstanceNode, nom: string): Promise<void> {
  for (let tour = 0; tour < TOURS_MAX; tour += 1) {
    const slot = await slotFrais(porteur, nom);
    if (slot.children.length === 0) return;
    slot.children[0].remove();
  }
  throw new Error(`Le slot « ${nom} » de « ${porteur.name} » ne se vide pas.`);
}

/**
 * Charge les polices de tous les textes d'un node, et refuse une police absente
 * du poste.
 *
 * Une police absente rend `fontName` illisible et toute écriture impossible :
 * mieux vaut refuser avant d'avoir rien créé que s'arrêter au milieu.
 */
async function chargerLesPolices(node: SceneNode): Promise<void> {
  const textes = node.type === 'TEXT'
    ? [node]
    : 'findAll' in node
      ? (node.findAll((enfant) => enfant.type === 'TEXT') as TextNode[])
      : [];
  const vues = new Set<string>();
  for (const texte of textes) {
    if (texte.hasMissingFont) {
      throw new Error(
        `La police du calque « ${texte.name} » est absente de ce poste. Installez-la, `
          + 'puis recommencez.',
      );
    }
    const polices = texte.characters.length > 0
      ? texte.getRangeAllFontNames(0, texte.characters.length)
      : [texte.fontName as FontName];
    for (const police of polices) {
      const cle = `${police.family} ${police.style}`;
      if (vues.has(cle)) continue;
      vues.add(cle);
      await figma.loadFontAsync(police);
    }
  }
}

/** Le premier calque texte d'un nom donné, retrouvé dans le porteur. */
function calqueTexte(porteur: SceneNode & ChildrenMixin, nom: string): TextNode | null {
  const cible = nom.trim().toLowerCase();
  return porteur.findOne(
    (enfant) => enfant.type === 'TEXT' && enfant.name.trim().toLowerCase() === cible,
  ) as TextNode | null;
}

/**
 * Écrit un texte dans un calque du porteur, puis relit.
 *
 * La seconde tentative n'est pas une superstition : un handle périmé avale
 * l'écriture sans rien dire, et la relecture est le seul témoin. Le calque est
 * retrouvé entre les deux, puisque c'est la péremption qu'on corrige.
 */
async function ecrireDans(
  porteur: InstanceNode,
  nomDuCalque: string,
  texte: string,
): Promise<void> {
  for (let essai = 0; essai < 2; essai += 1) {
    const calque = calqueTexte(await frais(porteur), nomDuCalque);
    if (!calque) {
      throw new Error(`« ${porteur.name} » ne porte pas de calque « ${nomDuCalque} ».`);
    }
    await chargerLesPolices(calque);
    calque.characters = texte;
    if (calque.characters === texte) return;
  }
  throw new Error(`Le calque « ${nomDuCalque} » n’a pas gardé le texte écrit.`);
}

/** Le maître d'un élément du modèle, ou `null` pour un séparateur sans catalogue. */
function maitreDe(element: ElementDeModele, sources: SourcesDeCreation): ComponentNode | null {
  if (element.genre === 'separateur') return sources.separateur;
  const variante = sources.regles.get(element.tag);
  if (!variante) {
    throw new Error(
      `« ${MAITRES_DU_KIT_DE_REGLES.regle} » ne porte aucun exemple « @${element.tag} » dans `
        + `« ${MAITRES_DU_KIT_DE_REGLES.conteneur} ». Ajoutez-en un, puis recommencez.`,
    );
  }
  return variante;
}

/**
 * Préfixe du marqueur le calque `icon` d'une règle `@icons` dont le maître ne
 * le porte pas.
 *
 * Un maître antérieur y écrit `icon-name` seul, et la création l'accepte. Sans
 * le marqueur, l'analyse lirait la règle comme rédigée et réclamerait sa
 * politique d'icône au lieu de son texte. Un maître qui porte déjà le marqueur
 * n'est pas réécrit.
 */
async function marquerLeCalqueIcon(regle: InstanceNode): Promise<void> {
  const calque = calqueTexte(await frais(regle), CALQUES_DU_KIT_DE_REGLES.icone);
  if (!calque || porteLeMarqueur(calque.characters)) return;
  await ecrireDans(regle, CALQUES_DU_KIT_DE_REGLES.icone, `${MARQUEUR_A_COMPLETER} ${calque.characters}`);
}

/**
 * Pose une règle dans une section : créée hors de l'arbre, écrite, puis rangée.
 *
 * Un séparateur sans variante muette n'arrête rien : les règles se suivent
 * alors sans lui, et un groupe de moins se voit.
 */
async function poserUnElement(
  element: ElementDeModele,
  section: InstanceNode,
  sources: SourcesDeCreation,
  enAttente: Set<SceneNode>,
): Promise<void> {
  const maitre = maitreDe(element, sources);
  if (!maitre) return;
  const regle = maitre.createInstance();
  enAttente.add(regle);
  if (element.genre === 'regle' && element.cible !== undefined) {
    await ecrireDans(regle, CALQUES_DU_KIT_DE_REGLES.cible, element.cible);
  }
  if (element.genre === 'regle' && element.description !== undefined) {
    await ecrireDans(regle, CALQUES_DU_KIT_DE_REGLES.contenu, element.description);
  }
  if (element.genre === 'regle' && element.tag === 'icons') await marquerLeCalqueIcon(regle);
  (await slotFrais(section, SLOT_DES_REGLES)).appendChild(regle);
  enAttente.delete(regle);
  etirer(await slotFrais(section, SLOT_DES_REGLES));
}

/**
 * Étire le dernier enfant d'un slot à sa largeur.
 *
 * Mesuré : sans cette affectation, un node ajouté garde la largeur de son
 * variant, 689 px pour une règle, et déborde d'un slot de 526 px. Aucun
 * `slotSettings` ne le fait à sa place.
 */
function etirer(slot: SlotNode): void {
  const dernier = slot.children[slot.children.length - 1];
  if (dernier && 'layoutSizingHorizontal' in dernier) dernier.layoutSizingHorizontal = 'FILL';
}

/** Crée une section et la remplit, hors de l'arbre : elle reste à ranger. */
async function remplirUneSection(
  section: SectionDeModele,
  sources: SourcesDeCreation,
  enAttente: Set<SceneNode>,
): Promise<InstanceNode> {
  const maitre = sources.sections.get(section.tag);
  if (!maitre) {
    throw new Error(
      `« ${MAITRES_DU_KIT_DE_REGLES.conteneur} » ne range aucune section pour « @${section.tag} ». `
        + 'Ajoutez-y un exemple de cette règle, puis recommencez.',
    );
  }
  const instance = maitre.createInstance();
  enAttente.add(instance);
  await viderLeSlot(instance, SLOT_DES_REGLES);
  for (const element of section.elements) {
    await poserUnElement(element, instance, sources, enAttente);
  }
  return instance;
}

/** Pose une section entière, remplie hors de l'arbre, puis rangée d'un geste. */
async function poserUneSection(
  section: SectionDeModele,
  conteneur: InstanceNode,
  sources: SourcesDeCreation,
  enAttente: Set<SceneNode>,
): Promise<void> {
  const instance = await remplirUneSection(section, sources, enAttente);
  (await slotFrais(conteneur, SLOT_DES_SECTIONS)).appendChild(instance);
  enAttente.delete(instance);
  etirer(await slotFrais(conteneur, SLOT_DES_SECTIONS));
}

/** La section Figma la plus proche qui contienne ce node, ou `null`. */
function sectionAncetre(node: SceneNode): SectionNode | null {
  let courant: BaseNode | null = node.parent;
  while (courant && courant.type !== 'PAGE') {
    if (courant.type === 'SECTION') return courant;
    courant = courant.parent;
  }
  return null;
}

/** Vrai de deux rectangles qui se recouvrent, même d'un pixel. */
function chevauche(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width
    && a.y < b.y + b.height && b.y < a.y + a.height;
}

/**
 * Place le conteneur à droite du composant, dans la section qui le contient.
 *
 * Mesuré : posé à la distance voulue, le conteneur recouvre un voisin dès que
 * la page en porte un. Il glisse donc vers la droite tant qu'une boîte occupe
 * sa place. Un parent en auto layout est écarté : un ajout y décalerait les
 * voisins, ce qui est une modification du travail du designer, pas une pose.
 */
function placer(conteneur: InstanceNode, composant: ComponentNode | ComponentSetNode): void {
  const boite = composant.absoluteBoundingBox;
  if (!boite) return;
  const hote = sectionAncetre(composant);
  if (hote && !('layoutMode' in hote && hote.layoutMode !== 'NONE')) hote.appendChild(conteneur);

  const origine = conteneur.parent && 'absoluteBoundingBox' in conteneur.parent
    ? conteneur.parent.absoluteBoundingBox ?? { x: 0, y: 0 }
    : { x: 0, y: 0 };
  const voisins = (conteneur.parent?.children ?? [])
    .filter((node): node is SceneNode => node.id !== conteneur.id && 'absoluteBoundingBox' in node)
    .map((node) => node.absoluteBoundingBox)
    .filter((rect): rect is Rect => rect !== null);

  let x = boite.x + boite.width + ECART;
  for (let tour = 0; tour < TOURS_MAX; tour += 1) {
    const place = { x, y: boite.y, width: conteneur.width, height: conteneur.height };
    const gene = voisins.find((voisin) => chevauche(place, voisin));
    if (!gene) break;
    x = gene.x + gene.width + ECART;
  }
  conteneur.x = x - origine.x;
  conteneur.y = boite.y - origine.y;
}

/**
 * Défait une création interrompue, et dit ce qu'elle laisse.
 *
 * Une instance vierge que le designer avait collée ne se supprime jamais :
 * elle est son travail, pas celui du plugin. Le message dit alors quoi faire
 * de ce qu'elle porte.
 */
async function defaire(
  conteneur: InstanceNode,
  remplissait: boolean,
  enAttente: Set<SceneNode>,
  erreur: unknown,
): Promise<Error> {
  for (const node of enAttente) {
    try {
      node.remove();
    } catch {
      // Un node déjà rangé, donc déjà mort sous son ancien chemin : rien à faire.
    }
  }
  const cause = erreur instanceof Error ? erreur.message : 'La création n’a pas abouti.';
  if (remplissait) {
    return new Error(
      `${cause} Le conteneur que vous aviez collé porte une création à moitié faite : `
        + 'supprimez ses règles, puis recommencez.',
    );
  }
  const id = conteneur.id;
  try {
    conteneur.remove();
  } catch {
    // La suppression refusée est dite par la relecture qui suit.
  }
  const reste = await figma.getNodeByIdAsync(id).catch(() => null);
  return new Error(reste === null
    ? `${cause} Rien n’a été laissé dans le document.`
    : `${cause} Le conteneur à moitié créé n’a pas pu être supprimé : supprimez-le, `
      + 'puis recommencez.');
}

/**
 * Pose les règles d'un composant, et rend le conteneur qui les porte.
 *
 * `component-name` s'écrit en dernier, et ce n'est pas indifférent : tant qu'il
 * n'est pas écrit, le conteneur ne revendique le nom d'aucun composant. Une
 * création interrompue dont la suppression échoue laisse donc un conteneur
 * orphelin, que l'analyse signale, plutôt qu'un doublon qui ferait disparaître
 * les règles écrites ailleurs.
 */
export async function creerLesRegles(
  composant: ComponentNode | ComponentSetNode,
  modele: ModeleDeRegles,
  sources: SourcesDeCreation,
  annoncer: Annonce,
): Promise<ResultatDeCreation> {
  annoncer('Vérification des polices…');
  await chargerLesPolices(sources.maitre);
  for (const variante of sources.regles.values()) await chargerLesPolices(variante);

  const remplissait = sources.aRemplir !== null;
  annoncer(remplissait ? 'Remplissage du conteneur…' : 'Création du conteneur…');
  const conteneur = sources.aRemplir ?? sources.maitre.createInstance();
  const enAttente = new Set<SceneNode>();
  try {
    await viderLeSlot(conteneur, SLOT_DES_SECTIONS);
    let posees = 0;
    for (const section of modele.sections) {
      annoncer(`Règles posées : ${posees} sur ${nombreDeRegles(modele)}…`);
      await poserUneSection(section, conteneur, sources, enAttente);
      posees += section.elements.filter((element) => element.genre === 'regle').length;
    }
    await ecrireDans(conteneur, CALQUES_DU_KIT_DE_REGLES.nomDuComposant, modele.nom);
    if (!remplissait) placer(conteneur, composant);
    return { conteneur, regles: nombreDeRegles(modele) };
  } catch (erreur) {
    throw await defaire(conteneur, remplissait, enAttente, erreur);
  }
}

/** L'ordre où le template range les sections d'un conteneur. */
const ORDRE_DES_SECTIONS: RuleTag[] = ['usage', 'prop', 'boolean', 'icons'];

/**
 * Où se range une section de ce tag : l'index de la dernière section du même
 * tag (`existante`, -1 s'il n'y en a pas), et l'index d'une section neuve,
 * qui suit la dernière du même tag, sinon la dernière d'un tag placé avant,
 * sinon la tête.
 *
 * Une section dont le maître n'est celui d'aucun tag connu est ignorée.
 */
async function placeDeLaSection(
  enfants: readonly SceneNode[],
  tag: RuleTag,
  sources: SourcesDeCreation,
): Promise<{ existante: number; index: number }> {
  const rang = ORDRE_DES_SECTIONS.indexOf(tag);
  let memeTag = -1;
  let avant = -1;
  for (let index = 0; index < enfants.length; index += 1) {
    const enfant = enfants[index];
    if (enfant.type !== 'INSTANCE') continue;
    const maitre = await enfant.getMainComponentAsync().catch(() => null);
    if (!maitre) continue;
    for (const [autre, source] of sources.sections) {
      if (source.id !== maitre.id) continue;
      if (autre === tag) memeTag = index;
      else if (ORDRE_DES_SECTIONS.indexOf(autre) < rang) avant = index;
    }
  }
  return { existante: memeTag, index: (memeTag >= 0 ? memeTag : avant) + 1 };
}

/**
 * Relit les enfants du slot de règles d'une section rangée, dans l'ordre, sans
 * rien écrire : pour une règle, son tag, le texte de son calque de cible et celui
 * de son calque de description, tels qu'écrits ; pour une instance sans aucun de
 * ces deux calques, un séparateur, à sa place.
 *
 * Le tag se lit sur le calque `@tag`, sinon sur le variant, sinon c'est celui de
 * la section. Un enfant qui n'est pas une instance ne se recopie pas : il lève.
 * Seuls ces deux textes se recopient. La mise en forme interne d'un texte et les
 * propriétés de variant de la règle (hors tag) se perdent.
 */
async function relireLaSection(
  conteneur: InstanceNode,
  index: number,
  tag: RuleTag,
): Promise<ElementDeModele[]> {
  const section = (await slotFrais(conteneur, SLOT_DES_SECTIONS)).children[index];
  if (!section || section.type !== 'INSTANCE') {
    throw new Error(`La section « @${tag} » n’a pas pu être relue.`);
  }
  const elements: ElementDeModele[] = [];
  for (const enfant of (await slotFrais(section, SLOT_DES_REGLES)).children) {
    if (enfant.type !== 'INSTANCE') {
      throw new Error(`Un calque « ${enfant.name} » de la section « @${tag} » n’est pas une règle.`);
    }
    const cible = calqueTexte(enfant, CALQUES_DU_KIT_DE_REGLES.cible);
    const description = calqueTexte(enfant, CALQUES_DU_KIT_DE_REGLES.contenu);
    if (!cible && !description) {
      elements.push({ genre: 'separateur' });
      continue;
    }
    elements.push({
      genre: 'regle',
      tag: tagDeLaRegle(enfant, tag),
      cible: cible?.characters,
      description: description?.characters,
    });
  }
  return elements;
}

/** Le tag d'une règle rangée : son calque `@tag`, son variant, sinon `parDefaut`. */
function tagDeLaRegle(regle: InstanceNode, parDefaut: RuleTag): RuleTag {
  const calque = regle.findOne(
    (enfant) => enfant.type === 'TEXT' && ruleTagFromLayerName(enfant.name) !== null,
  );
  const affiche = calque ? ruleTagFromLayerName(calque.name) : null;
  const range = Object.values(regle.variantProperties ?? {})
    .map(ruleTagFromValue)
    .find((valeur): valeur is RuleTag => valeur !== null) ?? null;
  return affiche ?? range ?? parDefaut;
}

/** Une section prête, hors de l'arbre : elle remplace l'ancienne section du tag, ou s'ajoute. */
type SectionPrete = { tag: RuleTag; instance: InstanceNode; remplace: boolean };

/**
 * Range une section prête dans le slot du conteneur. Une section qui en remplace
 * une prend son index, et l'ancienne ne part qu'une fois la neuve rangée.
 */
async function rangerLaSection(
  prete: SectionPrete,
  conteneur: InstanceNode,
  sources: SourcesDeCreation,
  enAttente: Set<SceneNode>,
  rangees: string[],
): Promise<void> {
  const { existante, index } = await placeDeLaSection(
    (await slotFrais(conteneur, SLOT_DES_SECTIONS)).children, prete.tag, sources,
  );
  const remplace = prete.remplace && existante >= 0;
  const place = remplace ? existante : index;
  (await slotFrais(conteneur, SLOT_DES_SECTIONS)).insertChild(place, prete.instance);
  enAttente.delete(prete.instance);

  const enfants = (await slotFrais(conteneur, SLOT_DES_SECTIONS)).children;
  rangees.push(enfants[place].id);
  if (remplace) {
    const ancienne = enfants[place + 1];
    const maitre = ancienne?.type === 'INSTANCE'
      ? await ancienne.getMainComponentAsync().catch(() => null)
      : null;
    if (!maitre || maitre.id !== sources.sections.get(prete.tag)?.id) {
      throw new Error(`La section « @${prete.tag} » n’a pas pu être remplacée par sa version complétée.`);
    }
    ancienne.remove();
    rangees.pop();
  }
  const rangee = (await slotFrais(conteneur, SLOT_DES_SECTIONS)).children[place];
  if ('layoutSizingHorizontal' in rangee) rangee.layoutSizingHorizontal = 'FILL';
}

/**
 * Pose les règles manquantes dans un conteneur déjà rempli. Une section du même
 * tag se reconstruit avec ses règles relues et les manquantes, et prend la place
 * de l'ancienne ; sans section de ce tag, une section neuve se range après la
 * dernière d'un tag placé avant.
 * Ne vide rien, n'écrit pas `component-name`, ne déplace pas le conteneur.
 *
 * Tout se relit, puis tout se prépare hors de l'arbre, avant que la première
 * section se range : une erreur de lecture ou de préparation ne touche à rien du
 * conteneur. Le conteneur est le travail du designer : une erreur retire ce que
 * l'appel a posé, jamais le conteneur ni une section dont la nouvelle version
 * a déjà remplacé l'ancienne.
 */
export async function ajouterLesRegles(
  conteneur: InstanceNode,
  manquantes: ModeleDeRegles,
  sources: SourcesDeCreation,
  annoncer: Annonce,
): Promise<ResultatDeCreation> {
  annoncer('Vérification des polices…');
  await chargerLesPolices(sources.maitre);
  for (const variante of sources.regles.values()) await chargerLesPolices(variante);

  const enAttente = new Set<SceneNode>();
  const rangees: string[] = [];
  try {
    const aPreparer: Array<{ section: SectionDeModele; remplace: boolean; ajoutees: number }> = [];
    for (const manquante of manquantes.sections) {
      const enfants = (await slotFrais(conteneur, SLOT_DES_SECTIONS)).children;
      const { existante } = await placeDeLaSection(enfants, manquante.tag, sources);
      const ajoutees = manquante.elements.filter((element) => element.genre === 'regle').length;
      aPreparer.push(existante >= 0
        ? {
            section: completerLaSection(
              await relireLaSection(conteneur, existante, manquante.tag),
              manquante,
            ),
            remplace: true,
            ajoutees,
          }
        : { section: manquante, remplace: false, ajoutees });
    }

    const pretes: SectionPrete[] = [];
    let posees = 0;
    for (const { section, remplace, ajoutees } of aPreparer) {
      annoncer(`Règles ajoutées : ${posees} sur ${nombreDeRegles(manquantes)}…`);
      const instance = await remplirUneSection(section, sources, enAttente);
      pretes.push({ tag: section.tag, instance, remplace });
      posees += ajoutees;
    }
    for (const prete of pretes) {
      await rangerLaSection(prete, conteneur, sources, enAttente, rangees);
    }
    return { conteneur, regles: nombreDeRegles(manquantes) };
  } catch (erreur) {
    for (const node of enAttente) {
      try {
        node.remove();
      } catch {
        // Un node déjà rangé, donc déjà mort sous son ancien chemin : rien à faire.
      }
    }
    for (const id of rangees) {
      try {
        (await figma.getNodeByIdAsync(id))?.remove();
      } catch {
        // Une section déjà partie : le résultat voulu est atteint.
      }
    }
    const cause = erreur instanceof Error ? erreur.message : 'L’ajout n’a pas abouti.';
    throw new Error(`${cause} Les règles déjà rédigées n’ont pas été touchées.`);
  }
}

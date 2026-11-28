/**
 * Le modèle de vérité : à partir d'un `DocumentGenere`, ce qu'un variant de l'hôte ou une occurrence de pièce doit montrer selon la
 * convention d'UCM (§2.12 de la forme du contrat 15.0). Il ne connaît ni le format du contrat ni le moteur : il lit le dessin que le
 * document décrit (calques, variantes, instances, variables liées) et l'écrit dans la langue de `rendu.ts`. Ce que le contrat dit
 * autrement que le dessin, sans rien perdre, passe par `equivalences.ts` : ce fichier n'en porte aucune.
 *
 * La convention d'UCM, seule règle de conservation que ce modèle porte : une valeur que l'hôte impose à l'occurrence suit
 * l'identité du calque dans toutes les variantes que l'occurrence atteint, que la valeur initiale du calque y soit la même ou non ; un
 * calque absent de la variante d'arrivée ne reçoit rien ; les dimensions que l'auto layout calcule ne sont pas imposées. La règle
 * documentée de Figma (valeur initiale) reste hors du dépôt, dans `_local/`.
 *
 * Une occurrence est une instance que l'hôte pose dans un variant. `Occurrence.adresse` la désigne par l'identité de ses calques dans
 * la vue du variant de l'hôte (`['Header#0', 'Piece#0']`), jamais par les clés de slot du contrat : le modèle ne les connaît pas. Son
 * rendu suit la forme §2.12 : sans changement d'axe ni d'état, le dessin de l'instance tel que l'hôte l'a laissé ; sinon la variante V′
 * que les coordonnées désignent, avec chaque écart que l'hôte a posé sur la variante citée (par identité de calque et par champ du
 * dessin). La boîte du slot (largeur, hauteur, bornes, rotation, opacité de l'instance) fait autorité à la racine (§2.3). Aucune variante
 * V′ unique, ou un écart dont le chemin traverse deux frères de même nom dans V ou V′ : l'occurrence est « non résolue », sans rendu.
 *
 * Bornes : un écart sur une instance imbriquée porte le maître entier (l'axe imbriqué relève de l'imbrication, sous-lot 1.10) ; un frère
 * masqué en dur ne compte pas pour l'homonymie quand un frère visible du même nom existe.
 *
 * Un calque entre dans le rendu s'il est visible, ou si une propriété de composant peut le montrer, et s'il porte une information
 * (couleur, texte, composant posé, jeton de dimension, effet) ou contient un calque qui en porte. Une instance est une feuille :
 * ni les calques de son maître ni leurs couleurs n'appartiennent au variant, hormis le tracé d'une icône, dont la couleur est celle
 * du calque qui la pose. La disposition et l'alignement d'un conteneur ne comptent pas comme information : le contrat ne les écrit
 * que pour un conteneur qui a des enfants.
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- le dessin du document est un enregistrement libre */
import { calqueDe, idDeCopie } from './capacites';
import { PROJECTION, type Projection } from './equivalences';
import { egaux, elaguer, identiteDe, jetonDeVariable, nomAvecRang, type Boite, type Contour, type Coin, type Cote, type Flux, type RenduDeCalque, type RenduNormalise, type Typographie } from './rendu';
import type { DocumentGenere, Noeud } from './types';

/** Une occurrence de pièce, vue de l'hôte : son adresse, les coordonnées d'axes demandées et l'état que le code applicatif choisit. */
export interface Occurrence {
  /** L'identité des calques, depuis la racine de la vue du variant de l'hôte, jusqu'à l'instance. */
  adresse: string[];
  /** Les axes exposés que le code règle, avec leur valeur : les autres axes gardent la coordonnée de la variante citée. */
  coordonnees?: Record<string, string>;
  /** La valeur de l'axe d'état, que le code choisit dans le modèle d'états de la pièce. */
  etat?: string;
  /** Le nom de l'axe d'état de la pièce ; à défaut, l'axe `State` ou `Etat`. */
  axeDEtat?: string;
}

/** Ce que le modèle rend : un variant de l'hôte, ou une occurrence dans ce variant. */
export interface Cible {
  variant: string;
  occurrence?: Occurrence;
}

/** Les variants de l'hôte, dans l'ordre du jeu : les `COMPONENT` fils de la sélection. */
export function variantsDeLHote(doc: DocumentGenere): string[] {
  const jeu = calqueDe(doc, doc.selection[0]);
  return jeu.children.filter((id) => calqueDe(doc, id).type === 'COMPONENT');
}

const COTES: Record<Cote, string> = { top: 'paddingTop', right: 'paddingRight', bottom: 'paddingBottom', left: 'paddingLeft' };
const COINS: Record<Coin, string> = { topLeft: 'topLeftRadius', topRight: 'topRightRadius', bottomRight: 'bottomRightRadius', bottomLeft: 'bottomLeftRadius' };
const COTES_DU_CONTOUR: Record<Cote, string> = { top: 'strokeTopWeight', right: 'strokeRightWeight', bottom: 'strokeBottomWeight', left: 'strokeLeftWeight' };
const BORNES = ['minWidth', 'maxWidth', 'minHeight', 'maxHeight'] as const;
const TYPOGRAPHIE = ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'paragraphSpacing', 'paragraphIndent'] as const;
const DISPOSITIONS: Record<string, NonNullable<Flux['disposition']>> = { HORIZONTAL: 'flex-row', VERTICAL: 'flex-column', GRID: 'grid' };
const JUSTIFICATIONS: Record<string, string> = { CENTER: 'center', MAX: 'flex-end', SPACE_BETWEEN: 'space-between' };
const ALIGNEMENTS: Record<string, string> = { CENTER: 'center', MAX: 'flex-end', BASELINE: 'baseline' };

interface Arbre {
  rendu: RenduDeCalque;
  nom: string;
  noeud: Noeud;
  enfants: Arbre[];
}

/** Les corrections d'un dessin : ce que l'occurrence change dans la variante d'arrivée, par calque. */
type Corrections = Map<string, { props?: Record<string, any>; main?: string }>;

interface OptionsDeVue {
  corrections?: Corrections;
  /** L'instance dont la boîte (§2.3) remplace celle de la racine : à une occurrence, le slot de l'hôte fait autorité. */
  boiteDuSlot?: string;
  projection?: Projection;
}

interface Vue {
  calques: Record<string, RenduDeCalque>;
  noeuds: Record<string, Noeud>;
}

/** Le rendu normalisé du dessin sous `racineId`, avec le calque qui porte chaque identité. */
function dessinerLaVue(doc: DocumentGenere, racineId: string, options: OptionsDeVue = {}): Vue {
  const projection = options.projection ?? PROJECTION;
  const parId = new Map<string, Noeud>(
    doc.noeuds.map((n) => {
      const correction = options.corrections?.get(n.id);
      return [n.id, correction ? { ...n, ...(correction.main ? { main: correction.main } : {}), props: { ...n.props, ...correction.props } } : n];
    }),
  );
  const racine = parId.get(racineId);
  if (!racine) throw new Error(`calque absent ${racineId}`);

  const jeton = (alias: unknown): string | undefined => {
    const id = (alias as { id?: string } | undefined)?.id;
    const variable = id ? doc.variables.find((v) => v.id === id) : undefined;
    const collection = variable && doc.collections.find((c) => c.id === variable.variableCollectionId);
    return variable && collection ? jetonDeVariable(collection.name, variable.name) : undefined;
  };
  const lie = (n: Noeud, champ: string) => jeton(n.props.boundVariables?.[champ]);
  // La racine de la vue s'ouvre toujours : l'instance d'une occurrence se rend comme la racine de sa pièce, avec ses enfants.
  const estIcone = (n: Noeud) => n.type === 'INSTANCE' && n.id !== racineId && doc.spec.roles?.[n.id] === 'icone';
  const estCompose = (n: Noeud) => n.type === 'INSTANCE' && n.id !== racineId && !estIcone(n) && !projection.enveloppeDeTailleEnCadre(doc, n);
  const peintures = (n: Noeud, champ: 'fills' | 'strokes'): any[] => (n.props[champ] ?? []).filter((p: any) => p.type === 'SOLID' && p.visible !== false && p.boundVariables?.color?.id);
  /** La couleur d'une icône est celle du tracé que son instance recouvre, quand l'instance n'en porte pas. */
  const couleursDe = (n: Noeud): string[] => {
    if (estCompose(n)) return [];
    let pose = peintures(n, 'fills');
    if (!pose.length && estIcone(n)) pose = n.children.map((id) => peintures(parId.get(id)!, 'fills')).find((x) => x.length) ?? [];
    return [...new Set(pose.map((p) => jeton(p.boundVariables.color)!))].sort();
  };
  const typographieDe = (n: Noeud): Typographie | undefined => {
    const style = doc.styles.find((s) => s.id === n.props.textStyleId);
    if (!style) return undefined;
    return { style: style.name, jetons: Object.fromEntries(TYPOGRAPHIE.map((champ) => [champ, jeton(style.props.boundVariables?.[champ])]).filter(([, v]) => v !== undefined)) };
  };
  const contoursDe = (n: Noeud): Contour[] => {
    const parCote = Object.fromEntries((Object.keys(COTES_DU_CONTOUR) as Cote[]).map((c) => [c, lie(n, COTES_DU_CONTOUR[c])]).filter(([, v]) => v !== undefined));
    const largeur = lie(n, 'strokeWeight') ?? (Object.keys(parCote).length ? parCote : undefined);
    const alignement = typeof n.props.strokeAlign === 'string' ? n.props.strokeAlign.toLowerCase() : undefined;
    return peintures(n, 'strokes').map((p) => ({ couleur: jeton(p.boundVariables.color)!, largeur, alignement }));
  };
  const boiteDe = (n: Noeud): Boite => {
    const rotationCss = typeof n.props.rotation === 'number' ? -n.props.rotation : 0;
    return {
      largeur: lie(n, 'width'),
      hauteur: lie(n, 'height'),
      bornes: Object.fromEntries(BORNES.map((b) => [b, lie(n, b)])),
      rotation: Math.abs(rotationCss) >= 0.01 ? Math.round(rotationCss * 100) / 100 : undefined,
      opacite: lie(n, 'opacity'),
    };
  };
  /** La disposition, la répartition et l'alignement ne se disent que d'un conteneur qui range des enfants dans un auto layout. */
  const fluxDe = (n: Noeud, enfants: number, estRacine: boolean): Flux => {
    const avecEnfants = enfants > 0;
    const lue = n.props.layoutMode as string | undefined;
    const enflux = avecEnfants && !!lue && lue !== 'NONE';
    const rayon = lie(n, 'cornerRadius');
    return {
      disposition: enflux ? DISPOSITIONS[lue] : undefined,
      gap: projection.gapDUnSeulEnfant(enfants, estRacine) ? lie(n, 'itemSpacing') : undefined,
      padding: Object.fromEntries((Object.keys(COTES) as Cote[]).map((c) => [c, lie(n, COTES[c])])),
      rayon: Object.fromEntries((Object.keys(COINS) as Coin[]).map((c) => [c, rayon ?? lie(n, COINS[c])])),
      justification: enflux ? JUSTIFICATIONS[n.props.primaryAxisAlignItems] : undefined,
      alignement: enflux ? ALIGNEMENTS[n.props.counterAxisAlignItems] : undefined,
    };
  };

  /** `null` quand le calque n'entre pas dans la vue. */
  const construire = (n: Noeud, estRacine: boolean): Arbre | null => {
    if (n.props.visible === false) {
      const pilote = typeof n.props.componentPropertyReferences?.visible === 'string';
      return estRacine || !pilote ? null : { nom: n.name, noeud: n, rendu: { visible: false }, enfants: [] };
    }
    const feuille = estCompose(n) || estIcone(n) || n.type === 'TEXT';
    const enfants = feuille ? [] : n.children.map((id) => construire(parId.get(id)!, false)).filter((x): x is Arbre => x !== null);
    const propre: Omit<RenduDeCalque, 'visible'> = {
      couleurs: couleursDe(n),
      contours: estCompose(n) ? [] : contoursDe(n),
      texte: n.type === 'TEXT' ? String(n.props.characters ?? '') : undefined,
      compose: estCompose(n) ? projection.nomDuJeuPourUneVariante(doc, n.main!) : undefined,
      icone: estIcone(n) ? n.name : undefined,
      boite: boiteDe(estRacine && options.boiteDuSlot ? parId.get(options.boiteDuSlot)! : n),
      flux: feuille ? undefined : fluxDe(n, enfants.length, estRacine),
      typographie: n.type === 'TEXT' ? typographieDe(n) : undefined,
      effets: [doc.styles.find((s) => s.id === n.props.effectStyleId)?.name].filter((x): x is string => x !== undefined),
    };
    const informe = elaguer({ ...propre, flux: propre.flux && { ...propre.flux, disposition: undefined, justification: undefined, alignement: undefined } });
    if (!estRacine && !projection.instanceEnSlotFacultatif(n) && !informe && enfants.length === 0) return null;
    return { nom: n.name, noeud: n, rendu: elaguer({ visible: true, ...propre }) as RenduDeCalque, enfants };
  };

  const calques: Record<string, RenduDeCalque> = {};
  const noeuds: Record<string, Noeud> = {};
  const ranger = (a: Arbre, chemin: string[]) => {
    calques[identiteDe(chemin)] = a.rendu;
    noeuds[identiteDe(chemin)] = a.noeud;
    const vus = new Map<string, number>();
    for (const enfant of a.enfants) ranger(enfant, [...chemin, nomAvecRang(enfant.nom, vus)]);
  };
  ranger(construire(racine, true)!, []);
  return { calques, noeuds };
}

/** Un champ du dessin que l'hôte impose à un calque de l'occurrence : l'identité du calque dans la variante citée et la valeur posée. */
interface Impose {
  /** Les noms des calques depuis la racine de la pièce. */
  chemin: string[];
  champ: string;
  /** Pour `boundVariables`, la clé de la liaison. */
  cle?: string;
  valeur: unknown;
  /** Un frère de même nom rend l'appariement impossible dans la variante citée. */
  ambigu: boolean;
}

/** Ce que l'auto layout calcule, ce que l'identité ne porte pas et ce que la copie d'une instance renomme : jamais imposé. */
const NON_IMPOSES = new Set([
  'x', 'y', 'width', 'height', 'absoluteBoundingBox', 'absoluteRenderBounds', 'relativeTransform', 'resolvedVariableModes',
  'overrides', 'componentProperties', 'variantProperties', 'componentPropertyDefinitions', 'componentPropertyReferences',
  'exposedInstances', 'isExposedInstance', 'key', 'remote', 'defaultVariant',
]);
/** À la racine, le slot de l'hôte fait autorité sur ces liaisons (§2.3) : l'instance les porte, la racine de la pièce ne les applique pas. */
const BOITE_DU_SLOT = ['width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight', 'opacity'];

const dansLaVue = (n: Noeud) => n.props.visible !== false || typeof n.props.componentPropertyReferences?.visible === 'string';

/** Les frères de `parent` que ce nom désigne : ceux que la vue porte, ou à défaut tous. */
function freresDeMemeNom(doc: DocumentGenere, parent: Noeud, nom: string): Noeud[] {
  const freres = parent.children.map((id) => calqueDe(doc, id)).filter((n) => n.name === nom);
  const visibles = freres.filter(dansLaVue);
  return visibles.length ? visibles : freres;
}

/** Les valeurs que l'hôte a imposées à l'instance : les écarts entre son dessin et celui de la variante qu'elle cite, calque par calque. */
function valeursImposees(doc: DocumentGenere, instance: Noeud, citee: Noeud): Impose[] {
  const imposes: Impose[] = [];
  const visiter = (d: Noeud, copie: Noeud, chemin: string[], ambigu: boolean, estRacine: boolean) => {
    const poser = (champ: string, valeur: unknown, cle?: string) => imposes.push({ chemin, champ, ...(cle === undefined ? {} : { cle }), valeur, ambigu });
    const lies = (n: Noeud): Record<string, unknown> => n.props.boundVariables ?? {};
    for (const champ of new Set([...Object.keys(copie.props), ...Object.keys(d.props)])) {
      if (NON_IMPOSES.has(champ) || (estRacine && (champ === 'visible' || champ === 'opacity' || champ === 'rotation'))) continue;
      if (champ === 'boundVariables') {
        for (const cle of new Set([...Object.keys(lies(copie)), ...Object.keys(lies(d))])) {
          if (estRacine && BOITE_DU_SLOT.includes(cle)) continue;
          // Une dimension que l'auto layout calcule n'est pas une valeur que l'hôte impose.
          if ((cle === 'width' && ['HUG', 'FILL'].includes(copie.props.layoutSizingHorizontal)) || (cle === 'height' && ['HUG', 'FILL'].includes(copie.props.layoutSizingVertical))) continue;
          if (!egaux(lies(copie)[cle], lies(d)[cle])) poser(champ, lies(copie)[cle], cle);
        }
      } else if (!egaux(copie.props[champ], d.props[champ])) poser(champ, copie.props[champ]);
    }
    if (copie.main !== d.main) poser('main', copie.main);
    if (d.type === 'INSTANCE' && !estRacine) return;
    for (const id of d.children) {
      const enfant = calqueDe(doc, id);
      const homonymes = new Set([...freresDeMemeNom(doc, d, enfant.name), enfant]);
      visiter(enfant, calqueDe(doc, idDeCopie(instance.id, id)), [...chemin, enfant.name], ambigu || homonymes.size > 1, false);
    }
  };
  visiter(citee, instance, [], false, true);
  return imposes;
}

/** Le calque de la variante d'arrivée que ce chemin de noms désigne : `'absent'`, `'ambigu'` ou le calque. */
function calqueDuChemin(doc: DocumentGenere, racine: Noeud, chemin: readonly string[]): Noeud | 'absent' | 'ambigu' {
  let courant = racine;
  for (const nom of chemin) {
    const candidats = freresDeMemeNom(doc, courant, nom);
    if (candidats.length === 0) return 'absent';
    if (candidats.length > 1) return 'ambigu';
    courant = candidats[0];
  }
  return courant;
}

const AXES_D_ETAT = new Set(['state', 'etat', 'état']);

/** Les coordonnées que le code demande, depuis celles de la variante citée. */
function coordonneesDemandees(citee: Noeud, occurrence: Occurrence): Record<string, string> {
  const demandees = { ...(citee.props.variantProperties ?? {}), ...occurrence.coordonnees };
  if (occurrence.etat !== undefined) {
    const axe = occurrence.axeDEtat ?? Object.keys(demandees).find((k) => AXES_D_ETAT.has(k.toLowerCase()));
    if (!axe) throw new Error(`la pièce ${citee.name} n’a aucun axe d’état`);
    demandees[axe] = occurrence.etat;
  }
  return demandees;
}

function instanceDeLOccurrence(doc: DocumentGenere, variant: string, adresse: string[], projection: Projection): Noeud {
  const instance = dessinerLaVue(doc, variant, { projection }).noeuds[identiteDe(adresse)];
  if (!instance || instance.type !== 'INSTANCE' || !instance.main) throw new Error(`occurrence introuvable : ${identiteDe(adresse)} n’est pas une instance du variant ${variant}`);
  return instance;
}

/** Les variantes du jeu de la variante citée, ou elle seule pour un composant sans jeu. */
function variantesDuJeu(doc: DocumentGenere, citee: Noeud): Noeud[] {
  const jeu = citee.parent ? calqueDe(doc, citee.parent) : undefined;
  return jeu?.type === 'COMPONENT_SET' ? jeu.children.map((id) => calqueDe(doc, id)).filter((n) => n.type === 'COMPONENT') : [citee];
}

/**
 * Les occurrences qu'une pièce atteint depuis la variante citée : chaque combinaison des valeurs des axes exposés et de l'axe d'état,
 * les autres axes gardant la coordonnée de la variante citée (§2.12, étape 6). La combinaison qui reprend les coordonnées de la
 * variante citée y figure.
 */
export function occurrencesAtteignables(doc: DocumentGenere, variant: string, adresse: string[], axesExposes: readonly string[] = [], axeDEtat?: string): Occurrence[] {
  const citee = calqueDe(doc, instanceDeLOccurrence(doc, variant, adresse, PROJECTION).main!);
  const jeu = citee.parent ? calqueDe(doc, citee.parent) : undefined;
  const axes = [...axesExposes];
  const etat = axeDEtat ?? Object.keys(citee.props.variantProperties ?? {}).find((k) => AXES_D_ETAT.has(k.toLowerCase()));
  if (etat && !axes.includes(etat)) axes.push(etat);
  let combinaisons: Record<string, string>[] = [{}];
  for (const axe of axes) {
    const options: string[] = jeu?.props.componentPropertyDefinitions?.[axe]?.variantOptions ?? [citee.props.variantProperties?.[axe]];
    combinaisons = combinaisons.flatMap((c) => options.map((valeur) => ({ ...c, [axe]: valeur })));
  }
  return combinaisons.map((coordonnees) => ({ adresse, coordonnees }));
}

function renduDeLOccurrence(doc: DocumentGenere, cible: Cible, occurrence: Occurrence, projection: Projection): RenduNormalise {
  const instance = instanceDeLOccurrence(doc, cible.variant, occurrence.adresse, projection);
  const citee = calqueDe(doc, instance.main!);
  const nonResolu = (cause: NonNullable<RenduNormalise['nonResolu']>): RenduNormalise => ({ variant: cible.variant, calques: {}, nonResolu: cause });
  // La racine d'une occurrence se rend toujours : sa visibilité se lit sur le slot de l'hôte.
  const visible = (id: string, corrections: Corrections): Corrections => corrections.set(id, { ...corrections.get(id), props: { ...corrections.get(id)?.props, visible: true } });

  const demandees = coordonneesDemandees(citee, occurrence);
  if (egaux(demandees, citee.props.variantProperties ?? {})) {
    return { variant: cible.variant, calques: dessinerLaVue(doc, instance.id, { corrections: visible(instance.id, new Map()), projection }).calques };
  }
  const candidates = variantesDuJeu(doc, citee).filter((v) => egaux(v.props.variantProperties ?? {}, demandees));
  if (candidates.length !== 1) return nonResolu('selection-non-unique');
  const arrivee = candidates[0];

  const imposes = valeursImposees(doc, instance, citee);
  if (imposes.some((i) => i.ambigu)) return nonResolu('appariement-ambigu');
  const corrections: Corrections = new Map();
  for (const impose of imposes) {
    const calque = calqueDuChemin(doc, arrivee, impose.chemin);
    if (calque === 'ambigu') return nonResolu('appariement-ambigu');
    // Un calque qui n'existe pas dans la variante d'arrivée ne reçoit rien.
    if (calque === 'absent') continue;
    const courante = corrections.get(calque.id) ?? {};
    if (impose.champ === 'main') courante.main = impose.valeur as string;
    else if (impose.champ === 'boundVariables') {
      const lies = { ...(courante.props?.boundVariables ?? calque.props.boundVariables) };
      if (impose.valeur === undefined) delete lies[impose.cle!];
      else lies[impose.cle!] = impose.valeur;
      courante.props = { ...courante.props, boundVariables: lies };
    } else courante.props = { ...courante.props, [impose.champ]: structuredClone(impose.valeur) };
    corrections.set(calque.id, courante);
  }
  return { variant: cible.variant, calques: dessinerLaVue(doc, arrivee.id, { corrections: visible(arrivee.id, corrections), boiteDuSlot: instance.id, projection }).calques };
}

/** Le modèle de vérité d'un variant ou d'une occurrence. `projection` ne change que dans les tests des équivalences. */
export function renduAttendu(doc: DocumentGenere, cible: Cible, projection: Projection = PROJECTION): RenduNormalise {
  if (cible.occurrence) return renduDeLOccurrence(doc, cible, cible.occurrence, projection);
  if (calqueDe(doc, cible.variant).type !== 'COMPONENT') throw new Error(`${cible.variant} n’est pas un variant`);
  return { variant: cible.variant, calques: dessinerLaVue(doc, cible.variant, { projection }).calques };
}

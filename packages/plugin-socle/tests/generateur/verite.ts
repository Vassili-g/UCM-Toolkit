/**
 * Le modèle de vérité : à partir d'un `DocumentGenere`, ce qu'un variant de l'hôte, et plus tard une occurrence de pièce, doit montrer
 * selon la convention d'UCM (§2.12 de la forme du contrat 15.0). Il ne connaît ni le format du contrat ni le moteur : il lit le
 * dessin que le document décrit (calques, variantes, instances, variables liées) et l'écrit dans la langue de `rendu.ts`.
 *
 * La convention d'UCM, seule règle de conservation que ce modèle porte : une valeur que l'hôte impose à l'occurrence suit
 * l'identité du calque dans toutes les variantes que l'occurrence atteint, que la valeur initiale du calque y soit la même ou non ; un
 * calque absent de la variante d'arrivée ne reçoit rien ; les dimensions que l'auto layout calcule ne sont pas imposées. La règle
 * documentée de Figma (valeur initiale) reste hors du dépôt, dans `_local/`.
 *
 * Ce que ce fichier rend aujourd'hui : un variant de l'hôte, sans pièce. Une occurrence se désigne déjà dans `Cible` ; elle se rend
 * quand le document sait poser une pièce (sous-lot 1.10), et `renduAttendu` refuse en attendant. La règle d'une occurrence sera la
 * suivante : prendre le rendu du variant V′ que l'état et les axes exposés désignent, puis appliquer chaque écart que l'hôte a posé
 * sur le variant cité, par identité de calque et par champ.
 *
 * Un calque entre dans le rendu s'il est visible, ou si une propriété de composant peut le montrer, et s'il porte une information
 * (couleur, texte, composant posé, jeton de dimension, effet) ou contient un calque qui en porte ; une instance y est toujours, même
 * sans information (le contrat la publie comme un slot facultatif). Une instance est une feuille :
 * ni les calques de son maître ni leurs couleurs n'appartiennent au variant, hormis le tracé d'une icône, dont la couleur est celle
 * du calque qui la pose. La disposition et l'alignement d'un conteneur ne comptent pas comme information : le contrat ne les écrit
 * que pour un conteneur qui a des enfants.
 */
import { calqueDe } from './capacites';
import { elaguer, identiteDe, jetonDeVariable, nomAvecRang, type Boite, type Contour, type Coin, type Cote, type Flux, type RenduDeCalque, type RenduNormalise, type Typographie } from './rendu';
import type { DocumentGenere, Noeud } from './types';

/** Une occurrence de pièce, vue de l'hôte : son adresse, les coordonnées d'axes demandées et l'état que le code applicatif choisit. */
export interface Occurrence {
  adresse: string[];
  coordonnees?: Record<string, string>;
  etat?: string;
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
  enfants: Arbre[];
}

/** Le modèle de vérité d'un variant ou d'une occurrence. */
export function renduAttendu(doc: DocumentGenere, cible: Cible): RenduNormalise {
  if (cible.occurrence) throw new Error('Le modèle de vérité ne rend pas encore d’occurrence : le document ne pose aucune pièce avant le sous-lot 1.10.');
  const racine = calqueDe(doc, cible.variant);
  if (racine.type !== 'COMPONENT') throw new Error(`${cible.variant} n’est pas un variant`);
  const parId = new Map(doc.noeuds.map((n) => [n.id, n]));

  const jeton = (alias: unknown): string | undefined => {
    const id = (alias as { id?: string } | undefined)?.id;
    const variable = id ? doc.variables.find((v) => v.id === id) : undefined;
    const collection = variable && doc.collections.find((c) => c.id === variable.variableCollectionId);
    return variable && collection ? jetonDeVariable(collection.name, variable.name) : undefined;
  };
  const lie = (n: Noeud, champ: string) => jeton(n.props.boundVariables?.[champ]);
  const estIcone = (n: Noeud) => n.type === 'INSTANCE' && doc.spec.roles?.[n.id] === 'icone';
  /** Le wrapper de taille que la spec décrit se lit comme un cadre : il règle les dimensions de ses enfants, il n'est pas une dépendance. */
  const estEnveloppeDeTaille = (n: Noeud) => n.type === 'INSTANCE' && !!doc.spec.wrapperTaille && n.name === `.sizeWrapper${doc.spec.nom}`;
  const estCompose = (n: Noeud) => n.type === 'INSTANCE' && !estIcone(n) && !estEnveloppeDeTaille(n);
  /** Une variante se nomme `Axe=Valeur` : le composant posé porte le nom de son jeu. */
  const nomDuComposant = (id: string): string => {
    const maitre = calqueDe(doc, id);
    const jeu = maitre.parent ? parId.get(maitre.parent) : undefined;
    return jeu?.type === 'COMPONENT_SET' ? jeu.name : maitre.name;
  };
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
  /**
   * La disposition, la répartition et l'alignement ne se disent que d'un conteneur qui range des enfants dans un auto layout. Le gap d'un
   * conteneur de la vue se publie à partir de deux enfants ; celui de la racine se publie toujours.
   */
  const fluxDe = (n: Noeud, enfants: number, estRacine: boolean): Flux => {
    const avecEnfants = enfants > 0;
    const lue = n.props.layoutMode as string | undefined;
    const enflux = avecEnfants && !!lue && lue !== 'NONE';
    const rayon = lie(n, 'cornerRadius');
    return {
      disposition: enflux ? DISPOSITIONS[lue] : undefined,
      gap: estRacine || enfants > 1 ? lie(n, 'itemSpacing') : undefined,
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
      return estRacine || !pilote ? null : { nom: n.name, rendu: { visible: false }, enfants: [] };
    }
    const feuille = estCompose(n) || estIcone(n) || n.type === 'TEXT';
    const enfants = feuille ? [] : n.children.map((id) => construire(parId.get(id)!, false)).filter((x): x is Arbre => x !== null);
    const propre: Omit<RenduDeCalque, 'visible'> = {
      couleurs: couleursDe(n),
      contours: estCompose(n) ? [] : contoursDe(n),
      texte: n.type === 'TEXT' ? String(n.props.characters ?? '') : undefined,
      compose: estCompose(n) ? nomDuComposant(n.main!) : undefined,
      icone: estIcone(n) ? n.name : undefined,
      boite: boiteDe(n),
      flux: feuille ? undefined : fluxDe(n, enfants.length, estRacine),
      typographie: n.type === 'TEXT' ? typographieDe(n) : undefined,
      effets: [doc.styles.find((s) => s.id === n.props.effectStyleId)?.name].filter((x): x is string => x !== undefined),
    };
    const informe = elaguer({ ...propre, flux: propre.flux && { ...propre.flux, disposition: undefined, justification: undefined, alignement: undefined } });
    if (!estRacine && n.type !== 'INSTANCE' && !informe && enfants.length === 0) return null;
    return { nom: n.name, rendu: elaguer({ visible: true, ...propre }) as RenduDeCalque, enfants };
  };

  const calques: Record<string, RenduDeCalque> = {};
  const ranger = (a: Arbre, chemin: string[]) => {
    calques[identiteDe(chemin)] = a.rendu;
    const vus = new Map<string, number>();
    for (const enfant of a.enfants) ranger(enfant, [...chemin, nomAvecRang(enfant.nom, vus)]);
  };
  ranger(construire(racine, true)!, []);
  return { variant: cible.variant, calques };
}

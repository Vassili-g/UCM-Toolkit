/**
 * Le relevé complet d'un jeu de variants : tous ses variants, leurs layers,
 * peintures, liaisons, textes, valeurs sans variable et instances, tels que
 * les contrôles du kit les lisent (`ReleveDeComposant`). Rien n'est écrit
 * dans le document, et aucune variable n'est importée.
 *
 * La vue Composant lit le seul variant par défaut (`lectureDuComposant.ts`) ;
 * ce relevé en reprend le parcours : une instance sous la racine est une
 * frontière, ses calques ne sont pas lus, et les liaisons que le parent y pose
 * se rattachent au layer de l'instance, qui en est le porteur.
 *
 * Le budget compte les layers de variants, racine comprise, comme S3. Un
 * variant se lit en entier ou pas du tout ; le premier se lit toujours. Une
 * lecture qui échoue est comptée dans `lecture.manquees` et ne devient jamais
 * un constat : une variable liée qui ne se lit pas reste une liaison
 * (`illisible`), et une boîte illisible ne donne aucune valeur en dur de taille.
 *
 * Une liaison se découpe en `champ`, `indice` et `plage` : `fills[0]` donne
 * le champ `fills` et l'indice 0 ; `fills[0].gradientStops[1].color` donne
 * `fills.gradientStops[1].color` et l'indice 0. Une liaison de texte garde sa
 * plage et figure à la fois dans `layer.liaisons` et dans `texte.plages`.
 */
import type { LayerLu, LiaisonLue, PeintureLue, ReleveDeComposant, VariantLu } from '@ucm-kit/core/controles';
import { copierLaMiseEnPage, copierLesPeinturesParEtapes, lectureNative, lireLesPeinturesParEtapes, lireLesSegmentsCooperatif, lireLesSegmentsParEtapes, type ChampDeMiseEnPage, type ChampsDeMiseEnPage, type EtatDesSegments, type LecteurDeChamp, type PlageLue } from 'ucm-plugin-socle/src/composant/analyse/acquisition';
import { champDe, type ChampDeSegment, type EtatEcrit, type MaitreLu, type ModeDeCollectionLu, type PeintureLue as PeintureCopiee, type TableDesChamps } from 'ucm-plugin-socle/src/composant/analyse/faits';
import { creerMemoireDeRessources, type MemoireDeRessources } from 'ucm-plugin-socle/src/composant/analyse/ressources';
import { BUDGET_DE_LAYERS_PAR_DEFAUT } from 'ucm-plugin-socle/src/composant/contract/budget';
import { espacementSansEffet } from 'ucm-plugin-socle/src/composant/contract/nodeBindings';
import { compter } from 'ucm-plugin-socle/src/composant/contract/mesure';
import { AnalyseAnnulee, creerContexteCooperatif, type ContexteCooperatif, type JetonDAnnulation } from 'ucm-plugin-socle/src/composant/contract/porteeDAnalyse';

import { liaisonsDuNoeudCooperatives, type NoeudLu, type SegmentsPartages } from './consommateurs';
import { decouper, LiaisonsDesMaitres, marquerLImbrique } from './imbriquesDuReleve';
import { liaisonsDesSurcharges, type PortDuComposant } from './lectureDuComposant';
import type { EspaceDuReleve } from './modele';

export interface OptionsDuReleve {
  readonly progresser?: (fait: number, total: number) => void;
  /** Défaut : `BUDGET_DE_LAYERS_PAR_DEFAUT`. */
  readonly budgetDeLayers?: number;
  readonly jeton?: JetonDAnnulation;
  /** Le budget que l'analyse partage avec le moteur et les contrôles ; sans lui, le relevé en crée un qui cède par `port.pause`. */
  readonly cooperation?: ContexteCooperatif;
  /** L'espace du document ; le sandbox le lit dans `figma.root.documentColorProfile`. */
  readonly espaceDeCouleur?: EspaceDuReleve;
  /** La mémoire de ressources de la demande, que le moteur lit après lui ; sans elle, le relevé garde la sienne. */
  readonly ressources?: MemoireDeRessources;
  /** La mémoire de champs de la demande (`name`, `parent`, `children`, `fills`, `strokes`, `boundVariables`…), que les dépendances et le moteur lisent aussi ; sans elle, chaque lecture est directe. */
  readonly champs?: LecteurDeChamp;
  /** Vrai quand un conteneur de règles nomme le composant de ce maître sur sa page : l'instance est une dépendance. Sans lui, aucune instance n'en est une. */
  readonly reglesTrouvees?: (maitre: NoeudLu) => boolean;
}

export type IssueDuReleve =
  | { readonly statut: 'lu'; readonly releve: ReleveDeComposant }
  | { readonly statut: 'annule' }
  | { readonly statut: 'sans-sujet' };

type Manquee = ReleveDeComposant['lecture']['manquees'][number];
type Brut = Record<string, unknown>;
type Etape = { noeud: NoeudLu; parent: string | null; frontiere: boolean };

const estUnNombre = (valeur: unknown): valeur is number => typeof valeur === 'number' && Number.isFinite(valeur);
const estUnObjet = (valeur: unknown): valeur is Brut => typeof valeur === 'object' && valeur !== null;
const messageDErreur = (erreur: unknown): string => (erreur instanceof Error ? erreur.message : String(erreur));
const champLu = (noeud: NoeudLu, champ: string, lire: LecteurDeChamp = lectureNative): unknown => {
  compter('proprietesDuReleve');
  return lire(noeud, champ);
};

const estUnVariant = (noeud: NoeudLu, lire: LecteurDeChamp = lectureNative): boolean => noeud.type === 'COMPONENT' && lire<NoeudLu | null>(noeud, 'parent')?.type === 'COMPONENT_SET';

/** Les layers d'un variant, racine d'abord ; une instance sous la racine n'est pas descendue. */
async function parcourir(racine: NoeudLu, cooperation: ContexteCooperatif, lire: LecteurDeChamp): Promise<Etape[]> {
  const etapes: Etape[] = [];
  const aVisiter: Array<{ noeud: NoeudLu; parent: string | null }> = [{ noeud: racine, parent: null }];
  while (aVisiter.length > 0) {
    await cooperation.cederSiBesoin();
    const { noeud, parent } = aVisiter.pop() as { noeud: NoeudLu; parent: string | null };
    const frontiere = noeud.type === 'INSTANCE' && noeud.id !== racine.id;
    etapes.push({ noeud, parent, frontiere });
    if (frontiere) continue;
    const enfants = lire<readonly NoeudLu[] | undefined>(noeud, 'children') ?? [];
    for (let rang = enfants.length - 1; rang >= 0; rang -= 1) {
      await cooperation.cederSiBesoin();
      aVisiter.push({ noeud: enfants[rang], parent: noeud.id });
    }
  }
  return etapes;
}

/**
 * Les peintures d'un champ copié. Un champ que le nœud n'expose pas n'a aucune peinture ; une valeur mixte ou une lecture
 * refusée est une manquée : le relevé ne dit pas quelles peintures le layer porte.
 */
async function peinturesDe(champ: 'fills' | 'strokes', copie: EtatEcrit<readonly PeintureCopiee[]>, layer: string, manquees: Manquee[], cooperation: ContexteCooperatif): Promise<PeintureLue[]> {
  if (copie.etat === 'refuse' && copie.raison === 'absent') return [];
  if (copie.etat !== 'acquis') {
    manquees.push({ layer, champ, motif: 'peintures mixtes ou illisibles' });
    return [];
  }
  const peintures: PeintureLue[] = [];
  for (const [indice, peinture] of copie.valeur.entries()) {
    await cooperation.cederSiBesoin();
    const lue: PeintureLue = {
      champ,
      indice,
      type: peinture.type,
      visible: peinture.visible !== false,
      opacite: estUnNombre(peinture.opacity) ? peinture.opacity : 1,
      blendMode: peinture.blendMode ?? 'NORMAL',
    };
    if (peinture.color) lue.couleur = { r: peinture.color.r, g: peinture.color.g, b: peinture.color.b, a: estUnNombre(peinture.color.a) ? peinture.color.a : 1 };
    peintures.push(lue);
  }
  return peintures;
}

/** Copie des champs de mise en page, une lecture chacun, comptée comme les autres propriétés du relevé. */
const miseEnPage = <K extends ChampDeMiseEnPage>(noeud: NoeudLu, champs: readonly K[], lire?: LecteurDeChamp) => copierLaMiseEnPage(noeud, champs, () => compter('proprietesDuReleve'), lire);

/**
 * Le nombre fini d'un champ copié ; `undefined` sinon. Un champ mixte ou absent n'est pas une valeur en dur. Une
 * lecture qui a levé est consignée dans `manquees` et ne devient jamais un constat.
 */
function nombreDe<K extends ChampDeMiseEnPage>(table: TableDesChamps<Pick<ChampsDeMiseEnPage, K>>, champ: K, layer: string, manquees: Manquee[]): number | undefined {
  const etat = champDe(table, champ);
  if (etat.etat === 'acquis') return estUnNombre(etat.valeur) ? etat.valeur : undefined;
  if (etat.etat === 'refuse' && etat.raison === 'leve') manquees.push({ layer, champ, motif: etat.message ?? 'lecture refusée' });
  return undefined;
}

const CHAMPS_NUMERIQUES = ['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom', 'itemSpacing'] as const;
const RAYONS = ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'] as const;

/** Les champs numériques qu'aucune variable ne lie sur ce layer. */
async function valeursEnDur(noeud: NoeudLu, liaisons: readonly LiaisonLue[], dimensions: LayerLu['dimensions'] | null, epaisseur: number | undefined, contours: EtatEcrit<readonly PeintureCopiee[]>, manquees: Manquee[], cooperation: ContexteCooperatif): Promise<LayerLu['valeursEnDur']> {
  const liees = new Set<string>();
  for (const liaison of liaisons) {
    await cooperation.cederSiBesoin();
    if (!liaison.plage && !liaison.surcharge) liees.add(liaison.champ);
  }
  const liee = (...champs: string[]): boolean => champs.some((champ) => liees.has(champ));
  const valeurs: LayerLu['valeursEnDur'] = [];
  const ajouter = (champ: string, valeur: unknown, ...aussi: string[]) => {
    if (estUnNombre(valeur) && !liee(champ, ...aussi)) valeurs.push({ champ, valeur });
  };
  const mode = champDe(miseEnPage(noeud, ['layoutMode']), 'layoutMode');
  if (mode.etat === 'acquis' && typeof mode.valeur === 'string' && mode.valeur !== 'NONE') {
    const espacements = miseEnPage(noeud, CHAMPS_NUMERIQUES);
    for (const champ of CHAMPS_NUMERIQUES) {
      if (espacementSansEffet(noeud as unknown as SceneNode, champ)) continue;
      ajouter(champ, nombreDe(espacements, champ, noeud.id, manquees));
    }
  }
  const rayon = miseEnPage(noeud, ['cornerRadius']);
  const commun = nombreDe(rayon, 'cornerRadius', noeud.id, manquees);
  if (commun !== undefined) ajouter('cornerRadius', commun, ...RAYONS);
  else {
    const coins = miseEnPage(noeud, RAYONS);
    for (const coin of RAYONS) ajouter(coin, nombreDe(coins, coin, noeud.id, manquees), 'cornerRadius');
  }
  // Figma donne une épaisseur (1 par défaut) à tout layer, même sans contour : sans contour visible, elle ne se voit pas.
  let contourVisible = false;
  if (contours.etat === 'acquis') for (const peinture of contours.valeur) {
    await cooperation.cederSiBesoin();
    if (peinture.visible !== false && peinture.opacity !== 0) {
      contourVisible = true;
      break;
    }
  }
  if (contourVisible) ajouter('strokeWeight', epaisseur, 'strokeTopWeight', 'strokeRightWeight', 'strokeBottomWeight', 'strokeLeftWeight');
  if (dimensions) {
    if (!liee('width')) valeurs.push({ champ: 'width', valeur: dimensions.largeur });
    if (!liee('height')) valeurs.push({ champ: 'height', valeur: dimensions.hauteur });
  }
  return valeurs;
}

/** `null` quand la boîte ne se lit pas : la manquée est consignée, le layer garde des dimensions nulles. */
function dimensionsDe(noeud: NoeudLu, manquees: Manquee[]): LayerLu['dimensions'] | null {
  const boite = noeud.absoluteBoundingBox;
  if (boite) return { x: boite.x, y: boite.y, largeur: boite.width, hauteur: boite.height };
  if ([champLu(noeud, 'x'), champLu(noeud, 'y'), champLu(noeud, 'width'), champLu(noeud, 'height')].every(estUnNombre)) {
    return { x: champLu(noeud, 'x') as number, y: champLu(noeud, 'y') as number, largeur: champLu(noeud, 'width') as number, hauteur: champLu(noeud, 'height') as number };
  }
  manquees.push({ layer: noeud.id, champ: 'dimensions', motif: 'boîte illisible' });
  return null;
}

/**
 * Garde en mémoire les variables, collections et styles déjà demandés, et la lecture en cours de chacun : une même variable
 * ne se lit jamais deux fois, même si deux demandes se croisent.
 */
class Lecteur {
  private readonly demandees = new Set<string>();
  private readonly styles = new Map<string, string | null>();
  private readonly ressources: MemoireDeRessources;
  /** Les liaisons des composants principaux, que la provenance d'une liaison d'instance compare à la sienne. */
  readonly maitres: LiaisonsDesMaitres;
  /** Vrai d'un maître dont le composant a ses règles : l'instance est alors une dépendance. Jugé une fois par maître. */
  readonly reglesTrouvees: (maitre: NoeudLu) => boolean;

  constructor(
    private readonly port: PortDuComposant,
    readonly manquees: Manquee[],
    readonly cooperation: ContexteCooperatif,
    ressources?: MemoireDeRessources,
    /** Ce qui lit un champ de nœud : la mémoire de la demande, ou l'accès direct. */
    readonly lire: LecteurDeChamp = lectureNative,
    reglesTrouvees: (maitre: NoeudLu) => boolean = () => false,
  ) {
    const jugees = new Map<string, boolean>();
    this.reglesTrouvees = (maitre) => {
      let trouvees = jugees.get(maitre.id);
      if (trouvees === undefined) {
        trouvees = reglesTrouvees(maitre);
        jugees.set(maitre.id, trouvees);
      }
      return trouvees;
    };
    this.maitres = new LiaisonsDesMaitres(cooperation, lire);
    this.ressources = ressources ?? creerMemoireDeRessources({
      lectures: () => ({
        getVariableByIdAsync: (id) => this.port.variables.getVariableByIdAsync(id),
        getVariableCollectionByIdAsync: (id) => this.port.variables.getVariableCollectionByIdAsync(id),
        getStyleByIdAsync: (id) => this.port.getStyleByIdAsync(id),
      }),
      champsDeVariable: ['key', 'name', 'variableCollectionId'],
      champsDeCollection: ['name', 'modes'],
      cooperation,
      propager: (erreur) => erreur instanceof AnalyseAnnulee,
    });
  }

  /** `null` quand la collection ne se lit pas : la manquée est consignée, une seule fois par collection. */
  async collection(id: string): Promise<{ nom: string; modes: readonly ModeDeCollectionLu[] } | null> {
    const fait = await this.ressources.collection(id);
    if (fait.etat.etat === 'refuse') {
      if (fait.etat.raison === 'leve' && !this.demandees.has(`collection ${id}`)) this.manquees.push({ champ: `collection ${id}`, motif: fait.etat.message ?? '' });
      this.demandees.add(`collection ${id}`);
      return null;
    }
    this.demandees.add(`collection ${id}`);
    const { name, modes } = fait.etat.valeur;
    return { nom: name?.etat === 'acquis' ? name.valeur : '', modes: modes?.etat === 'acquis' ? modes.valeur : [] };
  }

  private async variable(id: string, layer: string, champ: string): Promise<LiaisonLue['variable'] | null> {
    const premiere = !this.demandees.has(`variable ${id}`);
    this.demandees.add(`variable ${id}`);
    const fait = await this.ressources.variable(id);
    if (fait.etat.etat === 'refuse') {
      this.manquees.push({ layer, champ, motif: premiere && fait.etat.raison === 'leve' ? fait.etat.message ?? '' : 'variable illisible' });
      return null;
    }
    const { key, name, variableCollectionId } = fait.etat.valeur;
    const identifiant = variableCollectionId?.etat === 'acquis' ? variableCollectionId.valeur : '';
    const collection = await this.collection(identifiant);
    return {
      id,
      cle: key?.etat === 'acquis' ? key.valeur : '',
      nom: name?.etat === 'acquis' ? name.valeur : '',
      collection: collection?.nom ?? identifiant,
      distante: fait.provenance.origine === 'distante',
    };
  }

  async liaisons(brutes: ReadonlyArray<{ propriete: string; variable: string }>, porteur: string): Promise<LiaisonLue[]> {
    const liaisons: LiaisonLue[] = [];
    for (const { propriete, variable } of brutes) {
      await this.cooperation.cederSiBesoin();
      const lue = await this.variable(variable, porteur, propriete);
      liaisons.push(
        lue
          ? { ...decouper(propriete), porteur, variable: lue }
          : { ...decouper(propriete), porteur, illisible: true, variable: { id: variable, cle: '', nom: '', collection: '', distante: false } },
      );
    }
    return liaisons;
  }

  async style(id: string, layer: string): Promise<string | null> {
    if (!this.styles.has(id)) {
      const { etat } = await this.ressources.style(id);
      const nom = etat.etat === 'acquis' ? etat.valeur.name : undefined;
      const motif = etat.etat === 'refuse' ? etat : nom?.etat === 'refuse' ? nom : null;
      if (motif?.raison === 'leve') this.manquees.push({ layer, champ: 'textStyleId', motif: motif.message ?? '' });
      this.styles.set(id, nom?.etat === 'acquis' && typeof nom.valeur === 'string' ? nom.valeur : null);
    }
    return this.styles.get(id) ?? null;
  }

  /** Le maître de l'instance, son jeu et le nœud natif ; un refus rend la phrase de la manquée `instanceDe`. */
  async maitre(instance: NoeudLu): Promise<{ maitre: MaitreLu; natif: NoeudLu } | { motif: string }> {
    const lu = await this.ressources.maitre(instance as { id: string; getMainComponentAsync?(): Promise<object | null> });
    if (lu.etat === 'refuse') return { motif: lu.raison === 'leve' ? lu.message ?? '' : 'composant source introuvable' };
    const fait = await this.ressources.faitDuMaitre(instance.id, lu.natif);
    if (fait.etat.etat === 'acquis') return { maitre: fait.etat.valeur, natif: lu.natif as NoeudLu };
    return { motif: fait.etat.etat === 'refuse' && fait.etat.raison === 'leve' ? fait.etat.message ?? '' : 'composant source introuvable' };
  }

  async modes(noeud: NoeudLu): Promise<Record<string, string>> {
    const modes: Record<string, string> = {};
    const effectifs = noeud.resolvedVariableModes ?? {};
    for (const idDeCollection of Object.keys(effectifs)) {
      await this.cooperation.cederSiBesoin();
      const idDeMode = effectifs[idDeCollection];
      const collection = await this.collection(idDeCollection);
      if (!collection) continue;
      let nom: string | undefined;
      for (let rang = collection.modes.length - 1; rang >= 0 && nom === undefined; rang -= 1) if (collection.modes[rang].modeId === idDeMode) nom = collection.modes[rang].name;
      modes[collection.nom] = nom ?? idDeMode;
    }
    return modes;
  }
}

/** Les champs de segments du relevé : `fontSize`, `fontWeight`, `fills` et `textStyleId` pour les plages, `boundVariables` et `fills` pour les liaisons. */
const CHAMPS_DE_SEGMENT: readonly ChampDeSegment[] = ['fontSize', 'fontWeight', 'fills', 'boundVariables', 'textStyleId'];

/**
 * Les segments d'un calque texte, lus par un seul appel natif pour les liaisons de plage et pour les plages du texte.
 * `parEtapes` sert les liaisons, `cooperatif` les plages, qui reprennent la lecture déjà faite si les liaisons l'ont menée jusque-là.
 */
class SegmentsDuTexte {
  private lus: EtatDesSegments | undefined;

  constructor(private readonly noeud: NoeudLu) {}

  readonly parEtapes: SegmentsPartages = () => this.etapes();

  private *etapes(): Generator<undefined, EtatDesSegments> {
    if (this.lus) return this.lus;
    const lus = yield* lireLesSegmentsParEtapes(this.noeud, CHAMPS_DE_SEGMENT);
    this.lus = lus;
    return lus;
  }

  async cooperatif(cooperation: ContexteCooperatif): Promise<EtatDesSegments> {
    if (this.lus) return this.lus;
    const lus = await lireLesSegmentsCooperatif(this.noeud, CHAMPS_DE_SEGMENT, cooperation);
    this.lus = lus;
    return lus;
  }
}

async function texteDe(lecteur: Lecteur, noeud: NoeudLu, liaisons: readonly LiaisonLue[], manquees: Manquee[], partages: SegmentsDuTexte): Promise<LayerLu['texte']> {
  const lus = await partages.cooperatif(lecteur.cooperation);
  let segments: readonly PlageLue[] = [];
  if (lus.etat === 'acquis') segments = lus.valeur;
  else if (lus.raison === 'leve') manquees.push({ layer: noeud.id, champ: 'texte', motif: lus.message ?? '' });
  const identifiants = new Set<unknown>();
  const styleDuTexte = lecteur.lire(noeud, 'textStyleId');
  if (typeof styleDuTexte === 'string') identifiants.add(styleDuTexte);
  else for (const segment of segments) {
    await lecteur.cooperation.cederSiBesoin();
    identifiants.add(segment.valeurs.textStyleId);
  }
  const premier = identifiants.values().next().value;
  const unique = identifiants.size === 1 && typeof premier === 'string' && premier !== '' ? premier : null;
  const liaisonsParPlage = new Map<string, LiaisonLue[]>();
  for (const liaison of liaisons) {
    await lecteur.cooperation.cederSiBesoin();
    if (!liaison.plage) continue;
    const cle = `${liaison.plage.debut}:${liaison.plage.fin}`;
    const groupe = liaisonsParPlage.get(cle) ?? [];
    groupe.push(liaison);
    liaisonsParPlage.set(cle, groupe);
  }
  const plages: NonNullable<LayerLu['texte']>['plages'] = [];
  for (const segment of segments) {
    await lecteur.cooperation.cederSiBesoin();
    const { fontSize, fontWeight, fills } = segment.valeurs;
    plages.push({
      debut: segment.debut,
      fin: segment.fin,
      fontSize: estUnNombre(fontSize) ? fontSize : 0,
      fontWeight: estUnNombre(fontWeight) ? fontWeight : 0,
      peintures: await peinturesDe('fills', await copierLesPeinturesParEtapes(fills, lecteur.cooperation), noeud.id, manquees, lecteur.cooperation),
      liaisons: liaisonsParPlage.get(`${segment.debut}:${segment.fin}`) ?? [],
    });
  }
  return {
    style: unique ? await lecteur.style(unique, noeud.id) : null,
    plages,
  };
}

async function instanceDe(noeud: NoeudLu, lecteur: Lecteur, manquees: Manquee[]): Promise<{ instanceDe: NonNullable<LayerLu['instanceDe']>; natif: NoeudLu } | undefined> {
  const lu = await lecteur.maitre(noeud);
  if ('motif' in lu) {
    manquees.push({ layer: noeud.id, champ: 'instanceDe', motif: lu.motif });
    return undefined;
  }
  try {
    const references = champLu(noeud, 'componentPropertyReferences', lecteur.lire);
    const pilotee = estUnObjet(references) && typeof references.mainComponent === 'string' ? references.mainComponent : null;
    const publie = lu.maitre.jeu ?? lu.maitre;
    return { instanceDe: { cle: publie.key, nom: publie.nom, distante: lu.maitre.remote, pilotee }, natif: lu.natif };
  } catch (erreur) {
    manquees.push({ layer: noeud.id, champ: 'instanceDe', motif: messageDErreur(erreur) });
    return undefined;
  }
}

async function lireLeLayer(port: PortDuComposant, lecteur: Lecteur, etape: Etape, manquees: Manquee[]): Promise<LayerLu> {
  const { noeud, parent, frontiere } = etape;
  const dimensions = dimensionsDe(noeud, manquees);
  const [id, nom, type] = [noeud.id, lecteur.lire<string>(noeud, 'name'), noeud.type];
  const visible = champLu(noeud, 'visible', lecteur.lire) !== false;
  const opacite = estUnNombre(champLu(noeud, 'opacity')) ? champLu(noeud, 'opacity') as number : 1;
  const compterLaLecture = () => compter('proprietesDuReleve');
  const fills = await lireLesPeinturesParEtapes(noeud, 'fills', lecteur.cooperation, compterLaLecture, lecteur.lire);
  const layer: LayerLu = {
    id,
    nom,
    type,
    parent,
    visible,
    opacite,
    dimensions: dimensions ?? { x: 0, y: 0, largeur: 0, hauteur: 0 },
    peintures: await peinturesDe('fills', fills, noeud.id, manquees, lecteur.cooperation),
    liaisons: [],
    valeursEnDur: [],
  };
  const strokes = await lireLesPeinturesParEtapes(noeud, 'strokes', lecteur.cooperation, compterLaLecture, lecteur.lire);
  for (const peinture of await peinturesDe('strokes', strokes, noeud.id, manquees, lecteur.cooperation)) {
    await lecteur.cooperation.cederSiBesoin();
    layer.peintures.push(peinture);
  }
  const epaisseur = nombreDe(miseEnPage(noeud, ['strokeWeight'], lecteur.lire), 'strokeWeight', noeud.id, manquees);
  if (epaisseur !== undefined) layer.strokeWeight = epaisseur;
  const segments = noeud.type === 'TEXT' ? new SegmentsDuTexte(noeud) : undefined;
  try {
    layer.liaisons = await lecteur.liaisons(await liaisonsDuNoeudCooperatives(noeud, lecteur.cooperation, { fills, strokes }, segments?.parEtapes, lecteur.lire), noeud.id);
    if (frontiere) {
      const lues: LiaisonLue[] = [];
      for (const { propriete, variable, porteur } of await liaisonsDesSurcharges(port, noeud, true, lecteur.cooperation)) {
        await lecteur.cooperation.cederSiBesoin();
        const surcharge = porteur.id === noeud.id ? {} : { surcharge: { id: porteur.id, nom: porteur.name, type: porteur.type } };
        lues.push(...(await lecteur.liaisons([{ propriete, variable }], noeud.id)).map((liaison) => ({ ...liaison, ...surcharge })));
      }
      const cle = (liaison: LiaisonLue): string => JSON.stringify([liaison.surcharge?.id ?? null, liaison.champ, liaison.indice, liaison.variable.id]);
      const connues = new Set<string>();
      for (const liaison of layer.liaisons) {
        await lecteur.cooperation.cederSiBesoin();
        connues.add(cle(liaison));
      }
      for (const liaison of lues) {
        await lecteur.cooperation.cederSiBesoin();
        if (!connues.has(cle(liaison))) layer.liaisons.push(liaison);
      }
      const instance = await instanceDe(noeud, lecteur, manquees);
      if (instance) {
        layer.instanceDe = instance.instanceDe;
        await marquerLImbrique(layer, instance.instanceDe.nom, instance.natif, lecteur, manquees);
      }
    }
  } catch (erreur) {
    if (erreur instanceof AnalyseAnnulee) throw erreur;
    manquees.push({ layer: noeud.id, champ: 'liaisons', motif: messageDErreur(erreur) });
  }
  layer.valeursEnDur = await valeursEnDur(noeud, layer.liaisons, dimensions, epaisseur, strokes, manquees, lecteur.cooperation);
  if (segments) layer.texte = await texteDe(lecteur, noeud, layer.liaisons, manquees, segments);
  return layer;
}

/** Les valeurs de variant d'un composant : `variantProperties`, sinon son nom `Propriété=Valeur, …`. */
async function valeursDuVariant(variant: NoeudLu, cooperation: ContexteCooperatif, lire: LecteurDeChamp): Promise<Record<string, string>> {
  const propres = champLu(variant, 'variantProperties');
  if (estUnObjet(propres)) {
    const valeurs: Record<string, string> = {};
    for (const nom of Object.keys(propres)) {
      await cooperation.cederSiBesoin();
      Object.defineProperty(valeurs, nom, { value: String(propres[nom]), enumerable: true, configurable: true, writable: true });
    }
    return valeurs;
  }
  if (!estUnVariant(variant, lire)) return {};
  const valeurs: Record<string, string> = {};
  const nom = lire<string>(variant, 'name');
  let debut = 0;
  while (debut <= nom.length) {
    await cooperation.cederSiBesoin();
    const virgule = nom.indexOf(',', debut);
    const morceau = nom.slice(debut, virgule < 0 ? nom.length : virgule);
    const coupe = morceau.indexOf('=');
    if (coupe >= 0) Object.defineProperty(valeurs, morceau.slice(0, coupe).trim(), { value: morceau.slice(coupe + 1).trim(), enumerable: true, configurable: true, writable: true });
    if (virgule < 0) break;
    debut = virgule + 1;
  }
  return valeurs;
}

const TYPES_DE_PROPRIETE = new Set(['VARIANT', 'BOOLEAN', 'TEXT', 'INSTANCE_SWAP']);

async function proprietesDe(jeu: NoeudLu, manquees: Manquee[], cooperation: ContexteCooperatif, lire: LecteurDeChamp): Promise<ReleveDeComposant['proprietes']> {
  let definitions: unknown;
  try {
    definitions = champLu(jeu, 'componentPropertyDefinitions', lire);
  } catch (erreur) {
    manquees.push({ champ: 'componentPropertyDefinitions', motif: messageDErreur(erreur) });
    return [];
  }
  if (!estUnObjet(definitions)) return [];
  const proprietes: ReleveDeComposant['proprietes'] = [];
  for (const nom of Object.keys(definitions)) {
    await cooperation.cederSiBesoin();
    const definition = definitions[nom];
    if (!estUnObjet(definition) || typeof definition.type !== 'string' || !TYPES_DE_PROPRIETE.has(definition.type)) continue;
    const defaut = typeof definition.defaultValue === 'boolean' ? definition.defaultValue : String(definition.defaultValue ?? '');
    const options = definition.variantOptions;
    const valeurs: string[] = Array.isArray(options) ? new Array(options.length) : [];
    if (Array.isArray(options)) for (let rang = 0; rang < options.length; rang += 1) {
      await cooperation.cederSiBesoin();
      if (rang in options) valeurs[rang] = String(options[rang]);
    }
    proprietes.push({ nom, type: definition.type as ReleveDeComposant['proprietes'][number]['type'], ...(Array.isArray(definition.variantOptions) ? { valeurs } : {}), defaut });
  }
  return proprietes;
}

/**
 * Le relevé du jeu de variants qui contient `depart`. Un composant seul se
 * lit comme un jeu d'un variant. Une annulation ne rend aucun résultat partiel.
 */
export async function lireLeReleve(port: PortDuComposant, depart: NoeudLu, options: OptionsDuReleve = {}): Promise<IssueDuReleve> {
  try {
    return await lireLeReleveInterruptible(port, depart, options);
  } catch (erreur) {
    if (erreur instanceof AnalyseAnnulee) return { statut: 'annule' };
    throw erreur;
  }
}

async function lireLeReleveInterruptible(port: PortDuComposant, depart: NoeudLu, options: OptionsDuReleve): Promise<IssueDuReleve> {
  const budget = options.budgetDeLayers ?? BUDGET_DE_LAYERS_PAR_DEFAUT;
  const cooperation = options.cooperation ?? creerContexteCooperatif({ jeton: options.jeton, respirer: () => port.pause() });
  const annule = (): boolean => options.jeton?.leve === true;
  const lire = options.champs ?? lectureNative;
  let sujet: NoeudLu | null = depart;
  while (sujet && !['COMPONENT', 'COMPONENT_SET', 'INSTANCE'].includes(sujet.type)) {
    await cooperation.cederSiBesoin();
    sujet = lire<NoeudLu | null>(sujet, 'parent');
  }
  if (!sujet) return { statut: 'sans-sujet' };
  if (sujet.type === 'INSTANCE') {
    const maitre = await sujet.getMainComponentAsync?.().catch(() => null);
    if (!maitre) return { statut: 'sans-sujet' };
    sujet = maitre;
  }
  const parentDuVariant = sujet.type !== 'COMPONENT_SET' && estUnVariant(sujet, lire) ? lire<NoeudLu | null>(sujet, 'parent') : null;
  const jeu = sujet.type === 'COMPONENT_SET' ? sujet : parentDuVariant ?? sujet;
  const composants: NoeudLu[] = [];
  if (jeu.type === 'COMPONENT_SET') {
    for (const enfant of lire<readonly NoeudLu[] | undefined>(jeu, 'children') ?? []) {
      await cooperation.cederSiBesoin();
      if (enfant.type === 'COMPONENT') composants.push(enfant);
    }
  } else composants.push(jeu);
  if (composants.length === 0) return { statut: 'sans-sujet' };
  if (annule()) return { statut: 'annule' };

  const manquees: Manquee[] = [];
  const lecteur = new Lecteur(port, manquees, cooperation, options.ressources, lire, options.reglesTrouvees);
  const variants: VariantLu[] = [];
  const variantsNonLus: string[] = [];
  let layersLus = 0;
  let layersNonLus = 0 as number | 'inconnu';
  let coupe = false;

  for (const composant of composants) {
    await cooperation.cederSiBesoin();
    if (annule()) return { statut: 'annule' };
    let etapes: Etape[] | null = null;
    try {
      etapes = await parcourir(composant, cooperation, lire);
    } catch (erreur) {
      if (erreur instanceof AnalyseAnnulee) throw erreur;
      manquees.push({ layer: composant.id, champ: 'children', motif: messageDErreur(erreur) });
    }
    if (!coupe && etapes && (variants.length === 0 || layersLus + etapes.length <= budget)) {
      const layers: LayerLu[] = [];
      for (const etape of etapes) {
        await cooperation.cederSiBesoin();
        layers.push(await lireLeLayer(port, lecteur, etape, manquees));
      }
      layersLus += layers.length;
      variants.push({ id: composant.id, nom: composant.name, valeurs: await valeursDuVariant(composant, cooperation, lire), layers, modesEffectifs: await lecteur.modes(composant) });
      options.progresser?.(variants.length, composants.length);
      continue;
    }
    coupe = true;
    variantsNonLus.push(composant.name);
    layersNonLus = etapes && layersNonLus !== 'inconnu' ? layersNonLus + etapes.length : 'inconnu';
  }

  const proprietes = await proprietesDe(jeu, manquees, cooperation, lire);
  cooperation.verifier();

  return {
    statut: 'lu',
    releve: {
      version: 1,
      jeu: { cle: String(champLu(jeu, 'key') ?? ''), id: jeu.id, nom: jeu.name },
      proprietes,
      variants,
      lecture: { layersLus, layersNonLus, variantsNonLus, manquees },
      espaceDeCouleur: options.espaceDeCouleur ?? 'srgb',
    },
  };
}

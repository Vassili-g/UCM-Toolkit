/**
 * Toutes les mutations du document sont réunies ici : le `name` d'une variable ou d'une collection locale,
 * les données partagées d'`ESPACE_ARCHITECT` (par `PortDeRegles`) et le point d'annulation.
 *
 * Un lot se contrôle sur le document relu avant la première écriture. Figma n'offre pas de transaction :
 * une exception laisse un lot partiel, et le résultat dit ce qui a vraiment changé.
 */
import { ESPACE_ARCHITECT } from '@ucm-kit/core/referentiel';
import type { Inventaire } from './lecture';
import { effacerLeJournal, lireLesRegles, lireLeStockage, preparerJournal, rangerLesEcritures, type RenommageJournal } from './regles';

export interface ObjetModifiable { readonly id: string; name: string; readonly remote: boolean }
export interface VariableModifiable extends ObjetModifiable { readonly variableCollectionId: string }

/** Les objets locaux sont résolus avant les écritures, qui sont synchrones. */
export interface SessionEcriture {
  collection(id: string): ObjetModifiable | null;
  variable(id: string): VariableModifiable | null;
  commitUndo(): void;
}
export interface PortEcriture { ouvrir(): Promise<SessionEcriture> }

interface DemandeCommune {
  /** Identifiant de l'entrée de l'inventaire. */
  readonly id: string;
  /** Identifiant Figma de la variable ou de la collection. */
  readonly figmaId: string;
  readonly ancienNom: string;
  readonly nouveauNom: string;
}
/** Un renommage coché, déjà résolu par la session. */
export type RenommageDemande =
  | (DemandeCommune & { readonly type: 'collection' })
  | (DemandeCommune & { readonly type: 'variable'; readonly collectionId: string });

export type MotifSaute = 'fichier-modifie' | 'protegee' | 'collision' | 'ecriture-interrompue';
export interface RenommageFait {
  /** L'entrée de l'inventaire pour une application ; l'identifiant Figma pour une annulation. */
  readonly id: string;
  readonly type: 'variable' | 'collection';
  readonly figmaId: string;
  readonly ancienNom: string;
  /** Le nom que l'objet porte après l'écriture. */
  readonly nouveauNom: string;
}
export interface RenommageSaute { readonly id: string; readonly motif: MotifSaute }
export interface ResultatEcriture {
  readonly statut: 'applique' | 'partiel' | 'refuse';
  readonly renommes: readonly RenommageFait[];
  readonly sautes: readonly RenommageSaute[];
  /** Vrai quand le journal garde de quoi remettre les anciens noms. */
  readonly annulable: boolean;
}

interface ObjetDuDocument { readonly nom: string; readonly portee: string; readonly collectionId?: string; readonly protegee: boolean }
interface Element { readonly demande: RenommageDemande; readonly portee: string; readonly objet: ObjetModifiable }
interface Etape { readonly element: Element; readonly nom: string }

const PORTEE_DU_DOCUMENT = 'document';
const porteeDeLaCollection = (collectionId: string): string => `collection:${collectionId}`;
const cleDObjet = (type: string, figmaId: string): string => `${type}:${figmaId}`;
const cleDeNom = (portee: string, nom: string): string => JSON.stringify([portee, nom]);
const heureActuelle = (): string => new Date().toISOString();

/** Les noms de l'inventaire relu, par objet. */
function lireLeDocument(inventaire: Inventaire): Map<string, ObjetDuDocument> {
  const document = new Map<string, ObjetDuDocument>();
  for (const entree of inventaire.entrees) {
    const cible = entree.cible;
    if (cible.type === 'collection') {
      document.set(cleDObjet('collection', cible.collectionId), { nom: entree.nom.nom, portee: PORTEE_DU_DOCUMENT, protegee: false });
    } else {
      document.set(cleDObjet('variable', cible.variableId),
        { nom: entree.nom.nom, portee: porteeDeLaCollection(cible.collectionId), collectionId: cible.collectionId, protegee: entree.protegee });
    }
  }
  return document;
}

/**
 * Retire les renommages dont le nom final n'est pas unique dans sa portée (la collection pour une variable,
 * le document pour une collection), puis recommence : un renommage retiré rend son ancien nom à l'objet,
 * qui peut en bloquer un autre. Tous les renommages en cause à un tour sont retirés ensemble.
 */
function retirerLesDoublons(retenus: readonly Element[], document: ReadonlyMap<string, ObjetDuDocument>, sautes: RenommageSaute[]): Element[] {
  let restants = [...retenus];
  for (;;) {
    const nouveaux = new Map(restants.map((element) => [cleDObjet(element.demande.type, element.demande.figmaId), element.demande.nouveauNom]));
    const comptes = new Map<string, number>();
    for (const [cle, objet] of document) {
      const nom = nouveaux.get(cle) ?? objet.nom;
      comptes.set(cleDeNom(objet.portee, nom), (comptes.get(cleDeNom(objet.portee, nom)) ?? 0) + 1);
    }
    const gardes: Element[] = [];
    let retire = false;
    for (const element of restants) {
      if (comptes.get(cleDeNom(element.portee, element.demande.nouveauNom)) === 1) gardes.push(element);
      else { sautes.push({ id: element.demande.id, motif: 'collision' }); retire = true; }
    }
    if (!retire) return gardes;
    restants = gardes;
  }
}

/**
 * Ordonne les écritures. Une chaîne (`a` devient `b` pendant que `b` devient `c`) s'écrit par la fin.
 * Un cycle passe par un nom provisoire, absent de la portée, que le dernier maillon remplace par le nom final.
 */
function planifier(elements: readonly Element[], document: ReadonlyMap<string, ObjetDuDocument>): Etape[] {
  const reserves = new Map<string, Set<string>>();
  const reserver = (portee: string, nom: string): void => {
    const noms = reserves.get(portee) ?? new Set<string>();
    noms.add(nom);
    reserves.set(portee, noms);
  };
  for (const objet of document.values()) reserver(objet.portee, objet.nom);
  for (const element of elements) reserver(element.portee, element.demande.nouveauNom);
  const provisoire = (element: Element): string => {
    let rang = 1;
    let nom: string;
    do { nom = `${element.demande.ancienNom}~ucm${rang > 1 ? `-${rang}` : ''}`; rang++; } while (reserves.get(element.portee)!.has(nom));
    reserver(element.portee, nom);
    return nom;
  };
  // Le prédécesseur d'un renommage est celui qui doit libérer le nom visé avant lui.
  const parAncienNom = new Map(elements.map((element) => [cleDeNom(element.portee, element.demande.ancienNom), element]));
  const etapes: Etape[] = [];
  const faits = new Set<Element>();
  const finale = (element: Element): Etape => ({ element, nom: element.demande.nouveauNom });
  for (const depart of elements) {
    if (faits.has(depart)) continue;
    const chaine = [depart];
    let cycle: Element | undefined;
    for (let courant = depart; ;) {
      const predecesseur = parAncienNom.get(cleDeNom(courant.portee, courant.demande.nouveauNom));
      if (!predecesseur || faits.has(predecesseur)) break;
      if (chaine.includes(predecesseur)) { cycle = predecesseur; break; }
      chaine.push(predecesseur);
      courant = predecesseur;
    }
    const rang = cycle ? chaine.indexOf(cycle) : chaine.length;
    if (cycle) {
      etapes.push({ element: cycle, nom: provisoire(cycle) });
      for (let i = chaine.length - 1; i > rang; i--) etapes.push(finale(chaine[i]!));
      etapes.push(finale(cycle));
    }
    for (let i = rang - 1; i >= 0; i--) etapes.push(finale(chaine[i]!));
    for (const element of chaine) faits.add(element);
  }
  return etapes;
}

interface Execution { readonly renommes: RenommageFait[]; readonly sautes: RenommageSaute[]; readonly erreur: boolean }

/** Contrôle les renommages sur le document relu, les ordonne et les écrit ; l'état final se lit sur les objets. */
function executer(demandes: readonly RenommageDemande[], inventaire: Inventaire, session: SessionEcriture): Execution {
  const document = lireLeDocument(inventaire);
  const sautes: RenommageSaute[] = [];
  const retenus: Element[] = [];
  const vus = new Set<string>();
  for (const demande of demandes) {
    if (demande.nouveauNom === demande.ancienNom) continue;
    const cle = cleDObjet(demande.type, demande.figmaId);
    const actuel = document.get(cle);
    const objet = demande.type === 'collection' ? session.collection(demande.figmaId) : session.variable(demande.figmaId);
    const doublon = vus.has(cle);
    vus.add(cle);
    const collectionChangee = demande.type === 'variable'
      && (actuel?.collectionId !== demande.collectionId || (objet as VariableModifiable | null)?.variableCollectionId !== demande.collectionId);
    if (doublon || !actuel || !objet || objet.remote || actuel.nom !== demande.ancienNom || objet.name !== demande.ancienNom || collectionChangee) {
      sautes.push({ id: demande.id, motif: 'fichier-modifie' });
    } else if (actuel.protegee) sautes.push({ id: demande.id, motif: 'protegee' });
    else retenus.push({ demande, portee: actuel.portee, objet });
  }
  const elements = retirerLesDoublons(retenus, document, sautes);
  let erreur = false;
  try {
    for (const etape of planifier(elements, document)) etape.element.objet.name = etape.nom;
  } catch { erreur = true; }
  const renommes: RenommageFait[] = [];
  for (const { demande, objet } of elements) {
    if (objet.name !== demande.ancienNom) {
      renommes.push({ id: demande.id, type: demande.type, figmaId: demande.figmaId, ancienNom: demande.ancienNom, nouveauNom: objet.name });
    }
    if (objet.name !== demande.nouveauNom) sautes.push({ id: demande.id, motif: 'ecriture-interrompue' });
  }
  return { renommes, sautes, erreur };
}

function resultat(execution: Execution, annulable: boolean, erreur: boolean): ResultatEcriture {
  const { renommes, sautes } = execution;
  const statut = erreur || sautes.length > 0 ? (renommes.length > 0 ? 'partiel' : 'refuse') : 'applique';
  return { statut, renommes, sautes, annulable };
}

/**
 * Applique les renommages cochés sur le document relu par `relireInventaireAvantEcriture`.
 * Saute ce qui a changé depuis la lecture, les variables protégées et les renommages qui créent un doublon.
 * Range le journal du lot par `stockage`, puis ouvre un seul point d'annulation. Sans renommage effectif,
 * le journal précédent reste en place.
 */
export function appliquerLesRenommages(options: {
  readonly demandes: readonly RenommageDemande[];
  readonly inventaire: Inventaire;
  readonly session: SessionEcriture;
  readonly stockage: PortDeRegles;
  /** Heure du journal ; l'heure courante par défaut. */
  readonly heure?: () => string;
}): ResultatEcriture {
  const { inventaire, session, stockage } = options;
  const execution = executer(options.demandes, inventaire, session);
  let erreur = execution.erreur;
  let annulable = false;
  if (execution.renommes.length > 0) {
    const renommages: RenommageJournal[] = execution.renommes.map(({ type, figmaId, ancienNom, nouveauNom }) => ({ type, id: figmaId, ancienNom, nouveauNom }));
    try {
      rangerLesEcritures(stockage, preparerJournal({ heure: (options.heure ?? heureActuelle)(), renommages }, stockage.cles()));
      annulable = true;
    } catch { erreur = true; }
    try { session.commitUndo(); } catch { erreur = true; }
  }
  return resultat(execution, annulable, erreur);
}

/**
 * Remet l'ancien nom à chaque objet du journal dont le nom est encore celui que le lot a écrit ; saute les autres.
 * Le journal est effacé, sauf si une exception interrompt l'annulation : il garde alors les objets non remis.
 * Les identifiants du résultat sont ceux de Figma.
 */
export function annulerLeDernierRenommage(options: {
  readonly inventaire: Inventaire;
  readonly session: SessionEcriture;
  readonly stockage: PortDeRegles;
}): ResultatEcriture {
  const { inventaire, session, stockage } = options;
  const journal = lireLesRegles(lireLeStockage(stockage)).journal;
  if (!journal) return { statut: 'refuse', renommes: [], sautes: [], annulable: false };
  const document = lireLeDocument(inventaire);
  const demandes = journal.renommages.map((renommage): RenommageDemande => {
    const base = { id: renommage.id, figmaId: renommage.id, ancienNom: renommage.nouveauNom, nouveauNom: renommage.ancienNom };
    return renommage.type === 'collection'
      ? { ...base, type: 'collection' }
      : { ...base, type: 'variable', collectionId: document.get(cleDObjet('variable', renommage.id))?.collectionId ?? '' };
  });
  const execution = executer(demandes, inventaire, session);
  let { erreur } = execution;
  const restants = journal.renommages.filter((renommage) => !execution.renommes.some((fait) =>
    fait.type === renommage.type && fait.figmaId === renommage.id && fait.nouveauNom === renommage.ancienNom));
  const garder = erreur && restants.length > 0;
  if (!erreur || execution.renommes.length > 0) {
    try {
      rangerLesEcritures(stockage, garder
        ? preparerJournal({ heure: journal.heure, renommages: restants }, stockage.cles())
        : effacerLeJournal(stockage.cles()));
    } catch { erreur = true; }
  }
  if (execution.renommes.length > 0) {
    try { session.commitUndo(); } catch { erreur = true; }
  }
  return resultat(execution, garder, erreur);
}

/** Les objets locaux sont résolus avant les écritures synchrones. */
export function creerPortEcriture(api: PluginAPI): PortEcriture {
  return { ouvrir: async () => {
    const collections = new Map((await api.variables.getLocalVariableCollectionsAsync()).map((objet) => [objet.id, objet]));
    const variables = new Map((await api.variables.getLocalVariablesAsync()).map((objet) => [objet.id, objet]));
    return {
      collection: (id) => collections.get(id) ?? null,
      variable: (id) => variables.get(id) ?? null,
      commitUndo: () => api.commitUndo(),
    };
  } };
}

/** Le stockage des règles du fichier : une clé par règle, dans l'espace d'Architect. Une écriture de règle n'ouvre pas de point d'annulation. */
export interface PortDeRegles {
  cles(): readonly string[];
  lire(cle: string): string;
  ecrire(cle: string, texte: string): void;
  effacer(cle: string): void;
}

export function creerPortDeRegles(api: PluginAPI): PortDeRegles {
  return {
    cles: () => api.root.getSharedPluginDataKeys(ESPACE_ARCHITECT),
    lire: (cle) => api.root.getSharedPluginData(ESPACE_ARCHITECT, cle),
    ecrire: (cle, texte) => api.root.setSharedPluginData(ESPACE_ARCHITECT, cle, texte),
    effacer: (cle) => api.root.setSharedPluginData(ESPACE_ARCHITECT, cle, ''),
  };
}

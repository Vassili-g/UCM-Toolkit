/**
 * Toutes les mutations du document sont réunies ici : le `name` d'une variable ou d'une collection locale,
 * les données partagées d'`ESPACE_ARCHITECT` (par `PortDeRegles`) et le point d'annulation.
 *
 * Un lot se contrôle sur le document relu avant la première écriture. Figma n'offre pas de transaction :
 * une exception laisse un lot partiel, et le résultat dit ce qui a vraiment changé.
 * Le journal du lot est donc rangé avant le premier nom : si le fichier ne peut pas le garder, aucun nom ne change.
 */
import { ESPACE_ARCHITECT } from '@ucm-kit/core/referentiel';
import { lireReglesDeNommage } from '@ucm-kit/core/protocoles';
import {
  causeDeProtection, cheminsEnConflit, inventairePublie, pairesDejaEnConflit,
  type CauseDeProtection, type EntreeInventaire, type Inventaire, type PaireEnConflit,
} from '@ucm-kit/core/nommage';
import { inventaireDeLectures } from './lecture';
import { lecteurDeVariablesFigma } from './lectureFigma';
import type { CauseDeRefus } from './messages';
import { CLE_JOURNAL, effacerLeJournal, lireLesRegles, lireLeStockage, preparerJournal, rangerLesEcritures, type Journal, type RenommageJournal } from './regles';

export interface ObjetModifiable { readonly id: string; name: string; readonly remote: boolean }
export interface VariableModifiable extends ObjetModifiable { readonly variableCollectionId: string }

/**
 * Les objets locaux sont résolus avant les écritures, qui sont synchrones.
 * `inventaire` vient de la même lecture que les objets, protection comprise : aucune attente ne les sépare.
 */
export interface SessionEcriture {
  readonly inventaire: Inventaire;
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

/**
 * `exclue` : l'annulation saute un objet qui est dans une collection exclue de l'analyse (voir `annulerLeDernierRenommage`).
 * `non-verifiee` : la protection de la variable ne se lit pas (`lecture-refusee`), l'application comme l'annulation la sautent.
 */
export type MotifSaute = 'fichier-modifie' | 'protegee' | 'non-verifiee' | 'collision' | 'nom-invalide' | 'ecriture-interrompue' | 'exclue';
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
  /** Pourquoi le lot est refusé avant tout renommage, quand ce n'est pas un contrôle sur un objet. */
  readonly cause?: CauseDeRefus;
}

interface ObjetDuDocument { readonly nom: string; readonly portee: string; readonly collectionId?: string; readonly protection?: CauseDeProtection }
interface Element { readonly demande: RenommageDemande; readonly portee: string; readonly objet: ObjetModifiable }
interface Etape { readonly element: Element; readonly nom: string }

const PORTEE_DU_DOCUMENT = 'document';
const porteeDeLaCollection = (collectionId: string): string => `collection:${collectionId}`;
const cleDObjet = (type: string, figmaId: string): string => `${type}:${figmaId}`;
const cleDeEntree = (entree: EntreeInventaire): string =>
  entree.cible.type === 'collection' ? cleDObjet('collection', entree.cible.collectionId) : cleDObjet('variable', entree.cible.variableId);
const cleDeNom = (portee: string, nom: string): string => JSON.stringify([portee, nom]);
const heureActuelle = (): string => new Date().toISOString();

/**
 * Les règles rangées dans le fichier à ce moment ont une écriture en v2. Avec la marque de l'inventaire relu, c'est le jugement du
 * calcul de la session (`palettesLibres`), refait au moment d'écrire parce que les règles ont pu changer depuis. Un stockage
 * illisible donne `false` : la protection reste.
 */
function reglesRangeesMaintenant(stockage: PortDeRegles): boolean {
  try { return lireReglesDeNommage(lireLeStockage(stockage)) !== null; } catch { return false; }
}

/**
 * Les clés de nommage que le stockage porte d'une version plus récente du plugin. Tant qu'il y en a, le plugin ne renomme rien et
 * n'écrit aucune règle : il calculerait les noms sans ces règles, et un geste pourrait écraser une entrée qu'il ne sait pas lire.
 * Un stockage illisible rend une liste vide : ce que le plugin écrit ensuite échoue par ses propres refus.
 */
export function reglesFuturesDuStockage(stockage: PortDeRegles): readonly string[] {
  try { return lireLesRegles(lireLeStockage(stockage)).futures; } catch { return []; }
}

/** Les noms de l'inventaire relu, par objet, avec la cause qui interdit de renommer une variable. */
function lireLeDocument(inventaire: Inventaire, reglesRangees: boolean): Map<string, ObjetDuDocument> {
  const document = new Map<string, ObjetDuDocument>();
  for (const entree of inventaire.entrees) {
    const cible = entree.cible;
    if (cible.type === 'collection') {
      document.set(cleDObjet('collection', cible.collectionId), { nom: entree.nom.nom, portee: PORTEE_DU_DOCUMENT });
    } else {
      const protection = causeDeProtection(entree, inventaire, reglesRangees);
      document.set(cleDObjet('variable', cible.variableId),
        { nom: entree.nom.nom, portee: porteeDeLaCollection(cible.collectionId), collectionId: cible.collectionId, ...(protection ? { protection } : {}) });
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
 * Figma refuse `.`, `{` et `}` dans le nom d'une variable, et `$` en tête d'un segment ; un nom vide, un `/` de tête ou de fin
 * et un `//` ne désignent aucun segment. Une collection n'a pas de segments, et Figma accepte `Brand 2.0` : seul le nom vide y est refusé.
 */
const nomInvalide = (nom: string, type: RenommageDemande['type']): boolean =>
  nom.trim() === '' || (type === 'variable'
    && (nom.startsWith('/') || nom.endsWith('/') || nom.includes('//') || /[.{}]/u.test(nom) || nom.split('/').some((segment) => segment.startsWith('$'))));

/**
 * Retire les renommages qui feraient disparaître un token de `tokens.json` (voir `cheminsEnConflit`), puis les doublons
 * que ce retrait fait naître, jusqu'à ce que plus rien ne bouge. `origine` est la liste des paires déjà en conflit avant le lot.
 */
function retirerLesConflitsDeChemin(
  retenus: readonly Element[], document: ReadonlyMap<string, ObjetDuDocument>, inventaire: Inventaire, sautes: RenommageSaute[], origine: readonly PaireEnConflit[],
): Element[] {
  const publie = inventairePublie(inventaire, cleDeEntree);
  let elements = retirerLesDoublons(retenus, document, sautes);
  for (;;) {
    const enCause = new Set(cheminsEnConflit(publie, new Map(elements.map((element) => [cleDObjet(element.demande.type, element.demande.figmaId), element.demande.nouveauNom])), origine).map(({ id }) => id));
    if (enCause.size === 0) return elements;
    const gardes = elements.filter((element) => {
      if (!enCause.has(cleDObjet(element.demande.type, element.demande.figmaId))) return true;
      sautes.push({ id: element.demande.id, motif: 'collision' });
      return false;
    });
    elements = retirerLesDoublons(gardes, document, sautes);
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

interface Controle { readonly elements: readonly Element[]; readonly sautes: readonly RenommageSaute[]; readonly document: ReadonlyMap<string, ObjetDuDocument> }
interface Execution { readonly renommes: RenommageFait[]; readonly sautes: RenommageSaute[]; readonly erreur: boolean }

/**
 * Contrôle les renommages sur le document relu : ce qui reste est à écrire.
 * `nomFinal` ajoute le contrôle du nom (`nom-invalide`) : une annulation rend des noms que le document a déjà portés et ne
 * le refait pas. Les chemins de `tokens.json` se contrôlent toujours ; `origine` donne à une annulation les paires de variables
 * que le lot avait trouvées en conflit, qu'elle peut rétablir.
 */
function controler(
  demandes: readonly RenommageDemande[], inventaire: Inventaire, session: SessionEcriture, nomFinal: boolean, reglesRangees: boolean, origine: readonly PaireEnConflit[] = [],
): Controle {
  const document = lireLeDocument(inventaire, reglesRangees);
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
    } else if (actuel.protection) sautes.push({ id: demande.id, motif: actuel.protection === 'lecture-refusee' ? 'non-verifiee' : 'protegee' });
    else if (nomFinal && nomInvalide(demande.nouveauNom, demande.type)) sautes.push({ id: demande.id, motif: 'nom-invalide' });
    else retenus.push({ demande, portee: actuel.portee, objet });
  }
  return { elements: retirerLesConflitsDeChemin(retenus, document, inventaire, sautes, origine), sautes, document };
}

/** Ordonne et écrit les renommages contrôlés ; l'état final se lit sur les objets. */
function ecrire({ elements, sautes: sautesDuControle, document }: Controle): Execution {
  const sautes = [...sautesDuControle];
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

// Le journal

let compteurDeLots = 0;
/** Un identifiant de lot unique : heure, compteur du processus et hasard, en base 36. */
const identifiantDeLot = (): string => `${Date.now().toString(36)}${(compteurDeLots++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Les clés d'un lot rangé, et le texte de la référence qu'il a remplacée (vide : aucune). */
interface LotRange { readonly cles: ReadonlySet<string>; readonly entrees: readonly string[]; readonly referenceAvant: string }

/**
 * Range un lot du journal : ses entrées, puis la référence en dernier. Rend `undefined` quand le lot ne tient pas
 * ou qu'une écriture échoue ; il efface alors les clés neuves et remet la référence d'avant.
 */
function ranger(stockage: PortDeRegles, journal: Journal, lot: string): LotRange | undefined {
  const prepare = preparerJournal(journal, lot);
  if (!prepare) return undefined;
  const referenceAvant = stockage.lire(CLE_JOURNAL);
  try {
    for (const { cle, texte } of [...prepare.entrees, prepare.reference]) stockage.ecrire(cle, texte);
  } catch {
    // Une clé qui lève a pu être écrite : toutes celles du lot s'effacent.
    for (const { cle } of prepare.entrees) { try { stockage.effacer(cle); } catch { /* orpheline, effacée au lot suivant */ } }
    try {
      if (stockage.lire(CLE_JOURNAL) !== referenceAvant) { if (referenceAvant) stockage.ecrire(CLE_JOURNAL, referenceAvant); else stockage.effacer(CLE_JOURNAL); }
    } catch { /* la référence reste celle du lot raté, dont les entrées sont effacées */ }
    return undefined;
  }
  const entrees = prepare.entrees.map(({ cle }) => cle);
  return { cles: new Set([...entrees, CLE_JOURNAL]), entrees, referenceAvant };
}

/** Efface les clés du journal qui ne sont pas à `garder` ; une clé qui résiste reste orpheline, sans effet sur la lecture. */
function nettoyer(stockage: PortDeRegles, garder: ReadonlySet<string>): void {
  try {
    for (const { cle } of effacerLeJournal(stockage.cles(), garder)) { try { stockage.effacer(cle); } catch { /* effacée au lot suivant */ } }
  } catch { /* idem */ }
}

/** Un lot sans renommage effectif rend le journal d'avant : la référence reprend son texte, puis les entrées du lot partent. */
function retirer(stockage: PortDeRegles, lot: LotRange): void {
  try {
    if (lot.referenceAvant) stockage.ecrire(CLE_JOURNAL, lot.referenceAvant); else stockage.effacer(CLE_JOURNAL);
  } catch { return; }
  for (const cle of lot.entrees) { try { stockage.effacer(cle); } catch { /* orpheline */ } }
}

const PREFIXE_DE_VARIABLE = 'variable:';
/** Les paires du journal portent des identifiants Figma ; le contrôle des chemins nomme les variables par `cleDObjet`. */
const paireDeLInventaire = ([a, b]: PaireEnConflit): PaireEnConflit => [cleDObjet('variable', a), cleDObjet('variable', b)];
const paireDuJournal = ([a, b]: PaireEnConflit): PaireEnConflit => [a.slice(PREFIXE_DE_VARIABLE.length), b.slice(PREFIXE_DE_VARIABLE.length)];

/**
 * Les paires de variables que le document relu avait déjà en conflit de chemin, pour les objets du lot (une collection compte
 * par ses variables). Le champ est omis quand il n'y en a aucune.
 */
function pairesDeLOrigine(elements: readonly Element[], inventaire: Inventaire): Pick<Journal, 'dejaEnConflit'> {
  if (elements.length === 0) return {};
  const touches = new Set(elements.map(({ demande }) => cleDObjet(demande.type, demande.figmaId)));
  const paires = pairesDejaEnConflit(inventairePublie(inventaire, cleDeEntree), touches).map(paireDuJournal);
  return paires.length > 0 ? { dejaEnConflit: paires } : {};
}

const lignesDuJournal = (renommages: readonly { readonly type: 'variable' | 'collection'; readonly figmaId: string; readonly ancienNom: string; readonly nouveauNom: string }[]): RenommageJournal[] =>
  renommages.map(({ type, figmaId, ancienNom, nouveauNom }) => ({ type, id: figmaId, ancienNom, nouveauNom }));

/**
 * Applique les renommages cochés sur le document que `session.inventaire` décrit.
 * Saute ce qui a changé depuis la lecture, les variables protégées (`protegee`) ou dont la protection ne se lit pas (`non-verifiee`),
 * les noms que Figma refuse, et les renommages qui créent un doublon de nom ou de chemin dans `tokens.json`. Une variable de
 * Palettes n'est protégée que si le fichier ne dit pas qu'elle suit les règles (`causeDeProtection`, avec `reglesRangeesMaintenant`).
 * Range d'abord le journal prévu du lot par `stockage` : s'il ne tient pas ou ne s'écrit pas, aucun nom ne change
 * et le résultat est `refuse` avec la cause `journal-impossible`. Quand une règle de nommage vient d'une version plus récente du plugin
 * (`reglesFuturesDuStockage`), le résultat est `refuse` avec la cause `regles-futures`, avant toute lecture du journal ou écriture. Les noms écrits, le journal est réécrit
 * avec les noms constatés (noms provisoires compris), puis un seul point d'annulation s'ouvre.
 * Sans renommage effectif, le journal précédent reste en place.
 */
export function appliquerLesRenommages(options: {
  readonly demandes: readonly RenommageDemande[];
  readonly session: SessionEcriture;
  readonly stockage: PortDeRegles;
  /** Heure du journal ; l'heure courante par défaut. */
  readonly heure?: () => string;
  /** Identifiant de lot, sans `:` ; un identifiant neuf à chaque appel par défaut. */
  readonly lot?: () => string;
}): ResultatEcriture {
  const { session, stockage } = options;
  if (reglesFuturesDuStockage(stockage).length > 0) return { statut: 'refuse', renommes: [], sautes: [], annulable: false, cause: 'regles-futures' };
  const inventaire = session.inventaire;
  const nouveauLot = options.lot ?? identifiantDeLot;
  const controle = controler(options.demandes, inventaire, session, true, reglesRangeesMaintenant(stockage));
  const heure = (options.heure ?? heureActuelle)();
  const prevu = lignesDuJournal(controle.elements.map(({ demande }) => demande));
  const dejaEnConflit = pairesDeLOrigine(controle.elements, inventaire);
  const lotPrevu = controle.elements.length > 0 ? ranger(stockage, { heure, renommages: prevu, ...dejaEnConflit }, nouveauLot()) : undefined;
  if (controle.elements.length > 0 && !lotPrevu) {
    return { statut: 'refuse', renommes: [], sautes: [...controle.sautes], annulable: false, cause: 'journal-impossible' };
  }
  const execution = ecrire(controle);
  let erreur = execution.erreur;
  let annulable = false;
  if (lotPrevu && execution.renommes.length === 0) retirer(stockage, lotPrevu);
  else if (lotPrevu) {
    const constate = lignesDuJournal(execution.renommes);
    const reecrit = JSON.stringify(constate) === JSON.stringify(prevu) ? undefined : ranger(stockage, { heure, renommages: constate, ...dejaEnConflit }, nouveauLot());
    // Si la réécriture échoue, le journal prévu reste valide : l'annulation reconnaît aussi un nom provisoire.
    nettoyer(stockage, (reecrit ?? lotPrevu).cles);
    annulable = true;
    try { session.commitUndo(); } catch { erreur = true; }
  }
  return resultat(execution, annulable, erreur);
}

/** Les noms provisoires de `planifier` : `base~ucm`, `base~ucm-2`, et leurs suites après une annulation interrompue. */
const estProvisoire = (nom: string, base: string): boolean => nom.length > base.length && nom.startsWith(base) && /^(~ucm(-\d+)?)+$/u.test(nom.slice(base.length));
/** Le nom que le lot a écrit, ou un nom provisoire laissé par une écriture interrompue (à l'application ou à l'annulation). */
const nomDuLot = (nom: string, renommage: RenommageJournal): boolean =>
  nom === renommage.nouveauNom || estProvisoire(nom, renommage.nouveauNom) || estProvisoire(nom, renommage.ancienNom);

/**
 * Le sort d'une entrée du journal : `retabli` (l'objet porte déjà son ancien nom), `change-depuis` (l'objet a disparu, est distant,
 * ou porte un nom qui n'est ni celui du lot ni un nom provisoire), `exclue` (sa collection est exclue de l'analyse), sinon `revient`.
 */
export type SortDuRenommage = 'retabli' | 'revient' | 'change-depuis' | 'exclue';

/** Ce que le classement lit du document : l'annulation le tire de ses objets, la projection de l'inventaire. Les identifiants sont ceux de Figma. */
export interface LecteursDuJournal {
  /** Le nom actuel de l'objet et s'il est distant ; `null` quand il n'existe plus. */
  objet(type: 'variable' | 'collection', figmaId: string): { readonly nom: string; readonly remote: boolean } | null;
  /** La collection qui porte la variable ; `undefined` quand la variable est introuvable. */
  collectionDeLaVariable(figmaId: string): string | undefined;
  /** Les collections exclues de l'analyse. */
  readonly exclues: ReadonlySet<string>;
}

/**
 * Classe une entrée du journal selon le document lu. L'ordre des contrôles est celui de l'annulation : un objet déjà rétabli
 * passe avant tout, et un objet changé depuis le lot passe avant l'exclusion de sa collection. Une entrée de collection est exclue
 * quand sa propre collection l'est.
 */
export function classerLeRenommage(renommage: RenommageJournal, lecteurs: LecteursDuJournal): SortDuRenommage {
  const objet = lecteurs.objet(renommage.type, renommage.id);
  if (objet?.nom === renommage.ancienNom) return 'retabli';
  if (!objet || objet.remote || !nomDuLot(objet.nom, renommage)) return 'change-depuis';
  const collection = renommage.type === 'collection' ? renommage.id : lecteurs.collectionDeLaVariable(renommage.id);
  return collection !== undefined && lecteurs.exclues.has(collection) ? 'exclue' : 'revient';
}

/**
 * Remet l'ancien nom à chaque objet du journal dont le nom est celui que le lot a écrit (ou un nom provisoire) ;
 * saute les autres. Un objet qui porte déjà son ancien nom compte comme rétabli.
 * Saute aussi les variables protégées ou non vérifiées au moment d'écrire (motifs `protegee` et `non-verifiee`, le journal les garde),
 * les objets d'une collection exclue de l'analyse au moment d'écrire (motif `exclue`), et les restitutions qui
 * créeraient un conflit de chemin dans `tokens.json` que le lot n'avait pas trouvé (motif `collision`, voir `Journal.dejaEnConflit`).
 * Le contrôle du nom (`nom-invalide`) n'est pas refait : ces noms ont déjà été portés.
 * Le journal garde chaque entrée non rétablie, avec le nom provisoire que l'objet porte s'il en porte un, et les paires
 * d'origine qui concernent ces entrées ; il n'est effacé que quand toutes le sont. Un journal illisible refuse l'annulation
 * sans être touché. Les identifiants du résultat sont ceux de Figma.
 */
export function annulerLeDernierRenommage(options: {
  readonly session: SessionEcriture;
  readonly stockage: PortDeRegles;
  /** Identifiant du lot qui garde les entrées non rétablies ; voir `appliquerLesRenommages`. */
  readonly lot?: () => string;
}): ResultatEcriture {
  const { session, stockage } = options;
  if (reglesFuturesDuStockage(stockage).length > 0) return { statut: 'refuse', renommes: [], sautes: [], annulable: false, cause: 'regles-futures' };
  const inventaire = session.inventaire;
  const regles = lireLesRegles(lireLeStockage(stockage));
  const journal = regles.journal;
  if (!journal) return { statut: 'refuse', renommes: [], sautes: [], annulable: false };
  const reglesRangees = reglesRangeesMaintenant(stockage);
  const document = lireLeDocument(inventaire, reglesRangees);
  const exclues = new Set(regles.collectionsExclues);
  const objetDe = (renommage: RenommageJournal): ObjetModifiable | null => renommage.type === 'collection' ? session.collection(renommage.id) : session.variable(renommage.id);
  const lecteurs: LecteursDuJournal = {
    objet: (type, figmaId) => {
      const objet = type === 'collection' ? session.collection(figmaId) : session.variable(figmaId);
      return objet ? { nom: objet.name, remote: objet.remote } : null;
    },
    collectionDeLaVariable: (figmaId) => document.get(cleDObjet('variable', figmaId))?.collectionId,
    exclues,
  };
  const demandes: RenommageDemande[] = [];
  const horsDuLot: RenommageSaute[] = [];
  for (const renommage of journal.renommages) {
    const sort = classerLeRenommage(renommage, lecteurs);
    if (sort === 'retabli') continue;
    const objet = objetDe(renommage);
    // Sans objet, le sort est `change-depuis` ; le test sert aussi à resserrer le type de `objet`.
    if (sort === 'change-depuis' || !objet) { horsDuLot.push({ id: renommage.id, motif: 'fichier-modifie' }); continue; }
    if (sort === 'exclue') { horsDuLot.push({ id: renommage.id, motif: 'exclue' }); continue; }
    const base = { id: renommage.id, figmaId: renommage.id, ancienNom: objet.name, nouveauNom: renommage.ancienNom };
    demandes.push(renommage.type === 'collection'
      ? { ...base, type: 'collection' }
      : { ...base, type: 'variable', collectionId: document.get(cleDObjet('variable', renommage.id))?.collectionId ?? '' });
  }
  const origine = (journal.dejaEnConflit ?? []).map(paireDeLInventaire);
  const fait = ecrire(controler(demandes, inventaire, session, false, reglesRangees, origine));
  const execution: Execution = { ...fait, sautes: [...horsDuLot, ...fait.sautes] };
  let erreur = execution.erreur;
  const restants: RenommageJournal[] = [];
  for (const renommage of journal.renommages) {
    const objet = objetDe(renommage);
    if (objet?.name === renommage.ancienNom) continue;
    restants.push(objet && nomDuLot(objet.name, renommage) ? { ...renommage, nouveauNom: objet.name } : renommage);
  }
  if (restants.length === 0) {
    try { rangerLesEcritures(stockage, effacerLeJournal(stockage.cles())); } catch { erreur = true; }
  } else if (JSON.stringify(restants) !== JSON.stringify(journal.renommages)) {
    // Une paire reste tant qu'une des deux variables est une entrée restante ou dans la collection d'une entrée restante.
    const objetsRestants = new Set(restants.map(({ type, id }) => cleDObjet(type, id)));
    const concernee = (id: string): boolean => {
      const collection = document.get(cleDObjet('variable', id))?.collectionId;
      return objetsRestants.has(cleDObjet('variable', id)) || (collection !== undefined && objetsRestants.has(cleDObjet('collection', collection)));
    };
    const gardees = (journal.dejaEnConflit ?? []).filter(([a, b]) => concernee(a) || concernee(b));
    const lot = ranger(stockage, { heure: journal.heure, renommages: restants, ...(gardees.length > 0 ? { dejaEnConflit: gardees } : {}) }, (options.lot ?? identifiantDeLot)());
    if (lot) nettoyer(stockage, lot.cles); else erreur = true;
  }
  if (execution.renommes.length > 0) {
    try { session.commitUndo(); } catch { erreur = true; }
  }
  return resultat(execution, restants.length > 0, erreur);
}

/** Les objets locaux sont résolus avant les écritures synchrones. */
export function creerPortEcriture(api: PluginAPI): PortEcriture {
  return { ouvrir: async () => {
    const lesCollections = await api.variables.getLocalVariableCollectionsAsync();
    const lesVariables = await api.variables.getLocalVariablesAsync();
    // Plus d'attente après ces deux lectures : l'inventaire et les objets décrivent le même état.
    const collections = new Map(lesCollections.map((objet) => [objet.id, objet]));
    const variables = new Map(lesVariables.map((objet) => [objet.id, objet]));
    return {
      inventaire: inventaireDeLectures(lesCollections, lesVariables, lecteurDeVariablesFigma(api, lesVariables)),
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

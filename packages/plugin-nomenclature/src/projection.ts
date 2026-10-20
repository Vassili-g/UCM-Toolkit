/**
 * La projection du calcul vers l'écran : le résultat du lexique, les questions, les règles du fichier et l'inventaire
 * deviennent les types de vue de `messages.ts`. Le module est pur : ni Figma, ni DOM, aucun texte pour le designer.
 *
 * Un terme se désigne par son mot en minuscules, ses mots joints par un tiret (`extra-small`).
 * Un renommage appartient au groupe de sa première règle dans l'ordre du bilan et apparaît dans les autres par `aussi`.
 */
import {
  REGISTRES, REGISTRES_ARCHITECTURE, REGISTRE_AXES_ETAT, REGISTRE_TAILLES, assembler, categorieDuSegment, collectionUcmReconnue, decouperSegment, motsAvecCasse,
  termePourCategorie, type Terme,
  type CategorieDeNom, type ChangementDeTerme, type ConflitDeVocabulaire, type Convention, type Lexique, type Mots, type NatureDeSegment, type NomLu,
  type OccurrenceDeTerme, type OrigineDuTerme, type Question, type Renommage, type ResultatDesQuestions, type ResultatDuLexique, type TermeEnQuestion,
} from '@ucm-kit/core/referentiel';
import { CLE_ECRITURE, lireEcriture, lireEntree, lireTerme, motsDe } from 'ucm-plugin-socle/src/reglesDeNommage';
import { estCollisionDeChemin } from './cheminsPublies';
import { classerLeRenommage, type LecteursDuJournal } from './ecriture';
import type { Inventaire } from './lecture';
import {
  PLACES_DE_TERMES, TYPES_DE_TERMES,
  type Bilan, type BloqueVue, type CollectionDuJournal, type CollectionVue, type ComptesDeTermes, type ConflitVue, type EcritureChoisie, type EffetVue, type FicheVue, type GroupeVue,
  type LigneDEcriture, type LigneDImport, type LigneDuJournal, type LigneVue, type PlaceDuTerme, type QuestionVue, type RegleVue, type RequeteDeTermes, type SectionDeTermes, type Selection, type TermeDeListe, type TermeVue,
  type TriDeTermes, type TypeDeTerme,
} from './messages';
import type { ImportRange, ReglesDuFichier } from './regles';

export type { RequeteDeTermes };

/** Nombre d'entrées d'une page de `lignes` ou de `termes`. */
export const TAILLE_DE_PAGE = 50;
/** Nombre de lignes que chaque section de `termes` porte quand l'écran ne demande pas une section précise : en tri alphabétique, autant pour chaque place. */
export const LIGNES_PAR_SECTION = 5;
/** Nombre de lignes que `GroupeVue.apercu` porte. */
export const TAILLE_DE_L_APERCU = 3;
const EXEMPLES_D_EMPLOI = 3;
/** Les termes du référentiel dont la forme change avec la place (les tailles) : leur identifiant et chacune de leurs formes. */
/** Le terme du registre dont la forme dépend de la place (les tailles), retrouvé par chacune de ses formes en minuscules. */
const TERME_SELON_LA_PLACE: ReadonlyMap<string, Terme> = new Map([...REGISTRES, ...REGISTRES_ARCHITECTURE].flatMap((registre) => registre.termes)
  .filter((terme) => terme.identifiantParCategorie !== undefined)
  .flatMap((terme) => [terme.id, ...Object.values(terme.identifiantParCategorie ?? {})].map((forme) => [forme.toLowerCase(), terme] as const)));
const TERMES_SELON_LA_PLACE: ReadonlySet<string> = new Set([...REGISTRES, ...REGISTRES_ARCHITECTURE].flatMap((registre) => registre.termes)
  .filter((terme) => terme.identifiantParCategorie !== undefined)
  .flatMap((terme) => [terme.id, ...Object.values(terme.identifiantParCategorie ?? {})].map((forme) => forme.toLowerCase())));
const DEFAUT: Convention = { casse: 'inchangee', separateur: 'inchange' };

export interface EntreeDeProjection {
  readonly generation: number;
  readonly lexique: Lexique;
  readonly resultat: ResultatDuLexique;
  /** Toutes les questions retenues, y compris celles que `regles.plusTard` met de côté : la projection les sépare. */
  readonly questions: ResultatDesQuestions;
  readonly regles: ReglesDuFichier;
  /** L'écriture avec laquelle `resultat` a été calculé. */
  readonly ecriture: EcritureChoisie;
  /** Toutes les collections locales, analysées ou non. */
  readonly inventaire: Inventaire;
  /** Nom complet de la variable que vise un alias, d'après l'identifiant de son nom lu ; absent, `cibleCommune` vaut `null`. */
  readonly nomDeLaCible?: (identifiant: string) => string | undefined;
}

export interface PageDeLignes { readonly lignes: readonly LigneVue[]; readonly total: number }
export interface PageDeTermes {
  readonly section: TypeDeTerme | null;
  readonly debut: number;
  readonly sections: readonly SectionDeTermes[];
  readonly comptes: ComptesDeTermes;
}

/** Un segment du fichier où le terme se lit, avec les mots que le découpage y a vus. */
export interface SegmentDuTerme { readonly segment: string; readonly mots: Mots; readonly noms: number; readonly exemple: string }
/**
 * Un nom analysé : les mots de chacun de ses segments, sa nature par segment, les formes des termes de chaque segment
 * (la liste est vide pour une collection, qui n'a pas de terme) et son nom après le renommage proposé.
 */
export interface NomDuDiagnostic {
  readonly nom: string; readonly collection: string | null; readonly categorie: CategorieDeNom;
  readonly mots: readonly Mots[]; readonly natures: readonly (NatureDeSegment | null)[]; readonly termes: readonly (readonly string[])[];
  readonly nouveau: string | null;
}
/** L'export du vocabulaire pour l'analyser hors du plugin : chaque terme de la liste et d'où il vient, chaque nom et son découpage. */
export interface DiagnosticDuVocabulaire {
  readonly ecriture: EcritureChoisie;
  readonly termes: readonly (Omit<TermeDeListe, 'trouve'> & { readonly question: string | null; readonly segments: readonly SegmentDuTerme[] })[];
  readonly noms: readonly NomDuDiagnostic[];
}

export interface Projection {
  bilan(): Bilan;
  diagnostic(): DiagnosticDuVocabulaire;
  /** Les lignes d'un groupe : ses renommages propres d'abord, puis ceux qui n'y figurent que par `aussi`. */
  lignes(groupe: string, debut: number): PageDeLignes;
  termes(requete: RequeteDeTermes): PageDeTermes;
  fiche(mot: string): FicheVue;
  /** Les identifiants cochés : groupe principal coché sans exclusion, plus les inclus qui sont des renommages. */
  identifiants(selection: Selection): readonly string[];
  /** Pour chaque identifiant reçu (une fois) qui est un renommage, la clé de son groupe principal ; les autres sont omis. Même groupe que `identifiants`. */
  principaux(ids: readonly string[]): readonly (readonly [string, string])[];
}

// Les segments

const motsEnMinuscules = (mots: Mots): string[] => mots.map((mot) => mot.toLowerCase());
const cleDesMots = (mots: Mots): string => motsEnMinuscules(mots).join('-');
const comparer = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
const motsDeLaCle = (cle: string): string[] => cle.split('-').filter((mot) => mot !== '');

// Le dernier import

/** L'écriture que le texte d'une entrée `ecriture` range ; `null` quand l'entrée manque ou ne se lit pas. */
function ecritureDuTexte(texte: string | null | undefined): EcritureChoisie | null {
  const brut = texte ? lireEntree(texte) : undefined;
  return (brut && lireEcriture(brut)) || null;
}

/** Les formes remplacées par le terme d'une entrée `terme:`, écrites comme sa clé ; `null` quand l'entrée manque ou ne se lit pas. */
function formesDuTexte(mots: Mots, texte: string | null | undefined): readonly string[] | null {
  const brut = texte ? lireEntree(texte) : undefined;
  const terme = brut && lireTerme(mots, brut);
  return terme ? terme.remplace.map(cleDesMots) : null;
}

/**
 * Ce qu'un import a changé : l'écriture (sa clé précède celles des termes), puis chaque terme dans l'ordre de sa clé, puis le nombre des autres clés.
 * Une clé dont ni l'avant ni l'après ne se lisent compte parmi les autres.
 */
function lignesDeLImport(importe: ImportRange): LigneDImport[] {
  const cles = [...new Set([...Object.keys(importe.avant), ...Object.keys(importe.apres)])].sort(comparer);
  const lignes: LigneDImport[] = [];
  let autres = 0;
  for (const cle of cles) {
    const avant = importe.avant[cle], apres = importe.apres[cle];
    const reste = cle.startsWith('terme:') ? cle.slice('terme:'.length) : undefined;
    const mots = reste === undefined ? undefined : motsDe(reste);
    if (cle === CLE_ECRITURE) {
      const ligne = { sorte: 'ecriture', avant: ecritureDuTexte(avant), apres: ecritureDuTexte(apres) } as const;
      if (ligne.avant || ligne.apres) lignes.push(ligne); else autres++;
    } else if (mots) {
      const ligne = { sorte: 'terme', terme: cleDesMots(mots), avant: formesDuTexte(mots, avant), apres: formesDuTexte(mots, apres) } as const;
      if (ligne.avant || ligne.apres) lignes.push(ligne); else autres++;
    } else autres++;
  }
  return autres > 0 ? [...lignes, { sorte: 'autres', nombre: autres }] : lignes;
}

function motsDuSegment(lexique: Lexique, segment: string): Mots {
  return lexique.mots.get(segment) ?? decouperSegment(segment);
}

function contientLaSuite(segment: Mots, suite: readonly string[], debut = 0): boolean {
  return suite.length > 0 && suite.every((mot, rang) => segment[debut + rang]?.toLowerCase() === mot);
}

/** Où la suite de mots tient dans les mots d'un segment : `[début, fin[`, ou `null`. Une suite d'un seul mot retrouve aussi un mot collé que le découpage a séparé. */
function placeDeLaSuite(segment: Mots, suite: readonly string[]): readonly [number, number] | null {
  if (suite.length === 0) return null;
  for (let debut = 0; debut + suite.length <= segment.length; debut++) {
    if (contientLaSuite(segment, suite, debut)) return [debut, debut + suite.length];
  }
  if (suite.length > 1) return null;
  for (let debut = 0; debut < segment.length; debut++) {
    let cumul = '';
    for (let fin = debut; fin < segment.length && suite[0].startsWith(cumul); fin++) {
      cumul += segment[fin].toLowerCase();
      if (cumul === suite[0]) return [debut, fin + 1];
    }
  }
  return null;
}

/**
 * Le texte du segment qui porte les mots `[debut, fin[` : le segment entier si la plage le couvre, sinon le morceau qui porte ces mots,
 * séparateurs d'origine compris. Les mots sont des tranches du segment, dans l'ordre, séparées seulement par `-`, `_` ou une espace.
 */
function formeDeLaPlage(segment: string, mots: Mots, debut: number, fin: number): string {
  if (debut === 0 && fin >= mots.length) return segment;
  let position = 0;
  let depart = 0;
  for (let rang = 0; rang < fin; rang++) {
    const place = segment.indexOf(mots[rang], position);
    if (place < 0) return mots.slice(debut, fin).join('-');
    if (rang === debut) depart = place;
    position = place + mots[rang].length;
  }
  return segment.slice(depart, position);
}

/** Les rangs des segments du nom qui contiennent la suite de mots. */
function rangsDeLaSuite(lexique: Lexique, nom: string, suite: readonly string[]): number[] {
  const voulue = suite.map((mot) => mot.toLowerCase());
  return nom.split('/').flatMap((segment, rang) => (placeDeLaSuite(motsDuSegment(lexique, segment), voulue) ? [rang] : []));
}

/** Les rangs des segments que le renommage écrit autrement. */
function segmentsModifies(renommage: Pick<Renommage, 'ancienNom' | 'nouveauNom'>): number[] {
  const apres = renommage.nouveauNom.split('/');
  return renommage.ancienNom.split('/').flatMap((segment, rang) => (segment !== apres[rang] ? [rang] : []));
}

/** Les segments où le terme a changé : ceux qui contenaient `avant` et que le renommage a écrits autrement ; à défaut, le premier segment modifié. */
function marquesDuTerme(lexique: Lexique, renommage: Pick<Renommage, 'ancienNom' | 'nouveauNom'>, avant: Mots): number[] {
  const modifies = new Set(segmentsModifies(renommage));
  const rangs = rangsDeLaSuite(lexique, renommage.ancienNom, avant).filter((rang) => modifies.has(rang));
  return rangs.length > 0 ? rangs : segmentsModifies(renommage).slice(0, 1);
}

function categorieDuSegmentRenomme(lexique: Lexique, renommage: Renommage, rang: number): CategorieDeNom {
  return lexique.noms.get(renommage.id)?.categoriesDesSegments?.[rang] ?? renommage.categorie;
}

/** Les segments de la catégorie dont l'écriture change. */
function segmentsDEcriture(lexique: Lexique, renommage: Renommage, categorie: CategorieDeNom): number[] {
  return segmentsModifies(renommage).filter((rang) => categorieDuSegmentRenomme(lexique, renommage, rang) === categorie);
}

const capitale = (mot: string): string => mot.replace(/^./u, (lettre) => lettre.toUpperCase());

/** Le mot `nouveau` écrit comme le mot `modele` : tout en capitales, capitale initiale ou minuscules. */
function memeCasse(modele: string, nouveau: string): string {
  if (modele.length > 1 && modele === modele.toUpperCase() && modele !== modele.toLowerCase()) return nouveau.toUpperCase();
  return modele !== modele.toLowerCase() && modele[0] === modele[0].toUpperCase() ? capitale(nouveau.toLowerCase()) : nouveau.toLowerCase();
}

/**
 * Le segment avec les mots `[debut, fin[` remplacés par `par`, dans l'écriture du segment : chaque mot reprend la casse du mot qu'il
 * remplace, les séparateurs du segment restent. Un segment sans séparateur qui doit en recevoir un prend celui de sa convention.
 */
function reecrireLeSegment(segment: string, mots: Mots, place: readonly [number, number], par: Mots, convention: Convention): string | null {
  const morceaux = segment.split(/([-_\s]+)/u);
  const separateurs: string[] = [];
  let nombre = 0;
  for (let rang = 0; rang < morceaux.length; rang += 2) {
    const dans = morceaux[rang] === '' ? 0 : decouperSegment(morceaux[rang]).length;
    for (let k = 1; k < dans; k++) separateurs.push('');
    nombre += dans;
    if (rang + 1 < morceaux.length) separateurs.push(morceaux[rang + 1]);
  }
  if (nombre !== mots.length || separateurs.length !== Math.max(0, nombre - 1)) return null;
  const [debut, fin] = place;
  const unSeparateur = separateurs.find((separateur) => separateur !== '');
  const jonction = fin - debut > 1 && separateurs[debut] !== '' ? separateurs[debut]
    : unSeparateur ?? (mots.length > 1 ? '' : ({ tiret: '-', 'tiret-bas': '_', espace: ' ', soude: '', camelCase: '', inchange: '-' })[convention.separateur]);
  const enCamel = jonction === '' && (mots.length > 1 ? unSeparateur === undefined : convention.separateur === 'camelCase');
  const sortie: string[] = [];
  const poser = (mot: string, avant: string): void => { sortie.push(avant, mot); };
  for (let rang = 0; rang < debut; rang++) poser(mots[rang], rang === 0 ? '' : separateurs[rang - 1]);
  par.forEach((mot, rang) => {
    const modele = mots[debut + Math.min(rang, fin - debut - 1)];
    const ecrit = enCamel && rang > 0 ? capitale(mot.toLowerCase()) : memeCasse(modele, mot);
    poser(ecrit, rang === 0 ? (debut === 0 ? '' : separateurs[debut - 1]) : jonction);
  });
  for (let rang = fin; rang < mots.length; rang++) poser(mots[rang], separateurs[rang - 1]);
  return sortie.join('');
}

// Les clés de règle

const cleDeTerme = (apres: Mots): string => `terme:${cleDesMots(apres)}`;
const estTerme = (cle: string): boolean => cle.startsWith('terme:');
const estCollection = (cle: string): boolean => cle.startsWith('collection:');
const categorieDeLEcriture = (cle: string): CategorieDeNom => cle.slice('ecriture:'.length) as CategorieDeNom;

/** Le changement de terme que chaque clé de terme du renommage a produit. */
function changementsParCle(renommage: Renommage): Map<string, ChangementDeTerme> {
  const cles = renommage.regles.filter(estTerme);
  const connus = new Set(cles.map((cle) => cle.toLowerCase()));
  const sansCle = renommage.termes.filter((changement) => !connus.has(cleDeTerme(changement.apres)));
  const resultat = new Map<string, ChangementDeTerme>();
  for (const cle of cles) {
    const trouve = renommage.termes.find((changement) => cleDeTerme(changement.apres) === cle.toLowerCase());
    const changement = trouve ?? sansCle.shift();
    if (changement) resultat.set(cle, changement);
  }
  return resultat;
}

// L'analyse des groupes

interface Analyse {
  /** Les clés des groupes qui possèdent au moins un renommage, dans l'ordre du bilan. */
  readonly ordre: readonly string[];
  readonly origines: ReadonlyMap<string, OrigineDuTerme>;
  readonly principal: ReadonlyMap<string, string>;
  /** Pour un renommage, ses clés de groupe dans l'ordre du bilan. */
  readonly groupesDe: ReadonlyMap<string, readonly string[]>;
  /** Pour un renommage, toutes ses clés de règle, y compris celles dont le groupe n'a aucun renommage propre. */
  readonly clesDe: ReadonlyMap<string, readonly string[]>;
  readonly propres: ReadonlyMap<string, readonly Renommage[]>;
  readonly secondaires: ReadonlyMap<string, readonly Renommage[]>;
  readonly changements: ReadonlyMap<string, ReadonlyMap<string, ChangementDeTerme>>;
}

function classeDeLaCle(cle: string, origines: ReadonlyMap<string, OrigineDuTerme>): number {
  if (estTerme(cle)) return origines.get(cle) === 'personnalise' ? 1 : 0;
  return estCollection(cle) ? 2 : 3;
}

function ajouter<T>(liste: Map<string, T[]>, cle: string, valeur: T): void {
  const existante = liste.get(cle);
  if (existante) existante.push(valeur);
  else liste.set(cle, [valeur]);
}

/**
 * Un terme dont la forme change avec la place (`sm` dans les noms, `small` dans les groupes) a une seule clé de règle. Ses renommages se
 * rangent pourtant sous la forme qu'ils écrivent : `Sm` devenu `Small` dans un groupe va dans la carte `terme:small`, pas dans `terme:sm`.
 */
function cleSelonLaPlace(cle: string, changement: ChangementDeTerme): string {
  if (!TERMES_SELON_LA_PLACE.has(cle.slice('terme:'.length).toLowerCase())) return cle;
  const ecrite = cleDeTerme(changement.apres);
  return ecrite !== cle.toLowerCase() && TERMES_SELON_LA_PLACE.has(ecrite.slice('terme:'.length)) ? ecrite : cle;
}

function analyser(entree: EntreeDeProjection): Analyse {
  const personnalises = new Set(entree.regles.termes.map((terme) => cleDeTerme(terme.terme)));
  const clesDe = new Map<string, readonly string[]>();
  const changements = new Map<string, ReadonlyMap<string, ChangementDeTerme>>();
  const origines = new Map<string, OrigineDuTerme>();
  const emploi = new Map<string, number>();
  for (const renommage of entree.resultat.renommages) {
    const brutes = renommage.regles.length > 0 ? [...new Set(renommage.regles)] : [`ecriture:${renommage.categorie}`];
    const associes = brutes.some(estTerme) ? changementsParCle(renommage) : new Map<string, ChangementDeTerme>();
    const renommees = new Map<string, ChangementDeTerme>();
    const cles = [...new Set(brutes.map((cle) => {
      const changement = associes.get(cle);
      const nouvelle = changement ? cleSelonLaPlace(cle, changement) : cle;
      if (changement) renommees.set(nouvelle, changement);
      return nouvelle;
    }))];
    clesDe.set(renommage.id, cles);
    for (const cle of cles) emploi.set(cle, (emploi.get(cle) ?? 0) + 1);
    if (renommees.size === 0) continue;
    changements.set(renommage.id, renommees);
    for (const [cle, changement] of renommees) if (origines.get(cle) !== 'ucm') origines.set(cle, changement.origine);
  }
  for (const cle of emploi.keys()) {
    if (estTerme(cle) && !origines.has(cle)) origines.set(cle, personnalises.has(cle) ? 'personnalise' : 'ucm');
  }
  const toutes = [...emploi.keys()].sort((a, b) =>
    classeDeLaCle(a, origines) - classeDeLaCle(b, origines) || (emploi.get(b) ?? 0) - (emploi.get(a) ?? 0) || comparer(a, b));
  const rang = new Map(toutes.map((cle, index) => [cle, index]));
  const principal = new Map<string, string>();
  const propres = new Map<string, Renommage[]>();
  const secondaires = new Map<string, Renommage[]>();
  const classes = new Map<string, string[]>();
  for (const renommage of entree.resultat.renommages) {
    const cles = [...(clesDe.get(renommage.id) ?? [])].sort((a, b) => rang.get(a)! - rang.get(b)!);
    classes.set(renommage.id, cles);
    principal.set(renommage.id, cles[0]);
    ajouter(propres, cles[0], renommage);
    for (const cle of cles.slice(1)) ajouter(secondaires, cle, renommage);
  }
  const ordre = toutes.filter((cle) => propres.has(cle));
  const groupes = new Set(ordre);
  const groupesDe = new Map([...classes].map(([id, cles]) => [id, cles.filter((cle) => groupes.has(cle))]));
  return { ordre, origines, principal, groupesDe, clesDe, propres, secondaires, changements };
}

// Les termes du référentiel et du fichier

interface TermeUcm { readonly id: string; readonly cle: string; readonly registre: string; readonly definition: string | null; readonly formes: readonly string[] }
interface Table {
  readonly ucm: ReadonlyMap<string, TermeUcm>;
  readonly ecartes: ReadonlyMap<string, TermeUcm>;
  /** Forme remplacée vers la clé du terme gardé. */
  readonly remplaceesParUcm: ReadonlyMap<string, string>;
  readonly personnalises: ReadonlyMap<string, { readonly terme: Mots; readonly remplace: readonly string[]; readonly definition: string | null }>;
  readonly remplaceesParPerso: ReadonlyMap<string, string>;
}

function construireLaTable(regles: ReglesDuFichier): Table {
  const ecarts = new Set(regles.ecartsUcm.map((id) => id.toLowerCase()));
  const ucm = new Map<string, TermeUcm>();
  const ecartes = new Map<string, TermeUcm>();
  const remplaceesParUcm = new Map<string, string>();
  for (const registre of [...REGISTRES, ...REGISTRES_ARCHITECTURE]) {
    const reel = REGISTRES.includes(registre);
    for (const terme of registre.termes) {
      const cle = terme.id.toLowerCase();
      const ecarte = ecarts.has(cle);
      if ((ecarte ? ecartes : ucm).has(cle)) continue;
      const formes = registre === REGISTRE_AXES_ETAT || ecarte ? [] : (terme.toleres ?? []).map((tolere) => cleDesMots(decouperSegment(tolere))).filter((forme) => forme !== cle);
      const entree: TermeUcm = { id: terme.id, cle, registre: registre.id, definition: reel ? terme.definition.fr : null, formes };
      (ecarte ? ecartes : ucm).set(cle, entree);
      for (const forme of formes) if (!remplaceesParUcm.has(forme)) remplaceesParUcm.set(forme, cle);
    }
  }
  for (const id of ecarts) if (!ecartes.has(id)) ecartes.set(id, { id, cle: id, registre: '', definition: null, formes: [] });
  const personnalises = new Map<string, { terme: Mots; remplace: readonly string[]; definition: string | null }>();
  const remplaceesParPerso = new Map<string, string>();
  for (const personnalise of regles.termes) {
    const cle = cleDesMots(personnalise.terme);
    const formes = personnalise.remplace.map(cleDesMots).filter((forme) => forme !== cle);
    personnalises.set(cle, { terme: personnalise.terme, remplace: formes, definition: personnalise.definition ?? null });
    for (const forme of formes) if (!remplaceesParUcm.has(forme) && !remplaceesParPerso.has(forme)) remplaceesParPerso.set(forme, cle);
  }
  return { ucm, ecartes, remplaceesParUcm, personnalises, remplaceesParPerso };
}

/**
 * Les occurrences du terme `cle` (mots en minuscules joints par `-`) : un terme du lexique, jamais un morceau de terme ni un nom de collection.
 * Le lexique ne connaît pas le terme de plusieurs mots qu'une règle du fichier ajoute (`extra-small`) : à défaut, la suite de ses mots se
 * cherche dans les segments sans nature.
 */
function occurrencesDuTerme(lexique: Lexique, cle: string): readonly OccurrenceDeTerme[] {
  const connues = lexique.occurrencesDesTermes.get(cle);
  if (connues) return connues;
  const suite = motsDeLaCle(cle);
  if (suite.length < 2) return [];
  return (lexique.occurrences.get(suite[0]) ?? []).flatMap((occurrence): OccurrenceDeTerme[] => {
    const nom = lexique.noms.get(occurrence.nomId);
    if (!nom || nom.categorie === 'collections' || lexique.natures.get(occurrence.nomId)?.[occurrence.rangSegment]) return [];
    const mots = motsDuSegment(lexique, nom.nom.split('/')[occurrence.rangSegment] ?? '');
    return contientLaSuite(mots, suite, occurrence.rangMot) ? [{ ...occurrence, longueur: suite.length }] : [];
  });
}

/** Les noms (identifiants) où le terme apparaît, chacun une fois. */
const nomsEmployant = (occurrences: readonly OccurrenceDeTerme[]): string[] => [...new Set(occurrences.map((occurrence) => occurrence.nomId))];

/** Quand les occurrences d'un terme n'ont pas la même nature : composant, puis palette. */
const ORDRE_DES_NATURES: readonly NatureDeSegment[] = ['composant', 'palette'];
const natureLaPlusHaute = (a: NatureDeSegment | null, b: NatureDeSegment | null): NatureDeSegment | null =>
  a === null ? b : b === null ? a : ORDRE_DES_NATURES.indexOf(b) < ORDRE_DES_NATURES.indexOf(a) ? b : a;

/** Les écritures d'un terme dans le fichier, chacune avec son nombre d'occurrences, dans l'ordre où le fichier les montre. */
function formesDuFichier(lexique: Lexique, occurrences: readonly OccurrenceDeTerme[]): Map<string, number> {
  const formes = new Map<string, number>();
  for (const occurrence of occurrences) {
    const segment = lexique.noms.get(occurrence.nomId)?.nom.split('/')[occurrence.rangSegment];
    if (segment === undefined) continue;
    const forme = formeDeLaPlage(segment, motsDuSegment(lexique, segment), occurrence.rangMot, occurrence.rangMot + occurrence.longueur);
    formes.set(forme, (formes.get(forme) ?? 0) + 1);
  }
  return formes;
}

/** Les formes de la plus fréquente à la moins fréquente ; à égalité, la première rencontrée. */
const formesParFrequence = (formes: ReadonlyMap<string, number>): string[] =>
  [...formes].map(([forme, nombre], rang) => ({ forme, nombre, rang })).sort((a, b) => b.nombre - a.nombre || a.rang - b.rang).map(({ forme }) => forme);

/** Ce que le fichier montre d'un terme : sa forme la plus fréquente (à égalité, la première rencontrée) et la nature de son segment. */
function presenceDuTerme(lexique: Lexique, cle: string, occurrences: readonly OccurrenceDeTerme[]): { readonly forme: string; readonly nature: NatureDeSegment | null } {
  let nature: NatureDeSegment | null = null;
  for (const occurrence of occurrences) nature = natureLaPlusHaute(nature, lexique.natures.get(occurrence.nomId)?.[occurrence.rangSegment] ?? null);
  return { forme: formesParFrequence(formesDuFichier(lexique, occurrences))[0] ?? cle, nature };
}

// L'exemple d'une écriture

/**
 * La valeur d'un nom comme exemple d'écriture : un nom dont chaque segment contient une lettre passe avant les autres (`Sizing/0` montre
 * mal une écriture), puis le plus profond jusqu'à quatre segments ; au-delà, chaque segment de plus coûte de la largeur et le classe plus bas.
 */
function valeurDExemple(nom: string): number {
  const segments = nom.split('/');
  const profondeur = segments.length <= 4 ? segments.length : 8 - segments.length;
  return (segments.every((segment) => /\p{L}/u.test(segment)) ? 10 : 0) + profondeur;
}

/** Les rangs des segments d'un nom qui sont à `place` : tous ses groupes, ou sa variable. */
function rangsDeLaPlace(nom: NomLu, place: 'groupes' | 'variables'): number[] {
  const segments = nom.nom.split('/');
  if (place === 'variables') return [segments.length - 1];
  return segments.flatMap((_, rang) => (nom.categoriesDesSegments?.[rang] === 'groupes' ? [rang] : []));
}

// Le tri de la liste

const TAILLES = new Map(REGISTRE_TAILLES.termes.map((terme, rang) => [terme.id, rang]));

/** Coupe un texte en suites de chiffres (lues par leur valeur) et en suites d'autres signes, en minuscules. */
function jetonsDuTexte(texte: string): readonly { readonly chiffres: boolean; readonly texte: string }[] {
  return (texte.toLowerCase().match(/\d+|\D+/gu) ?? []).map((jeton) => ({ chiffres: /^\d/u.test(jeton), texte: jeton }));
}

/** Compare deux textes sans tenir compte des majuscules, les suites de chiffres par leur valeur (`50` avant `100`), sans `Intl` ni `localeCompare`. */
function comparerLesTextes(a: string, b: string): number {
  const [jetonsA, jetonsB] = [jetonsDuTexte(a), jetonsDuTexte(b)];
  for (let rang = 0; rang < Math.min(jetonsA.length, jetonsB.length); rang++) {
    const [x, y] = [jetonsA[rang], jetonsB[rang]];
    if (x.chiffres !== y.chiffres) return x.chiffres ? -1 : 1;
    if (x.chiffres) {
      const [valeurX, valeurY] = [x.texte.replace(/^0+(?=\d)/u, ''), y.texte.replace(/^0+(?=\d)/u, '')];
      const ordre = valeurX.length - valeurY.length || comparer(valeurX, valeurY);
      if (ordre !== 0) return ordre;
    } else if (x.texte !== y.texte) {
      return comparer(x.texte, y.texte);
    }
  }
  return jetonsA.length - jetonsB.length || comparer(a, b);
}

/**
 * L'ordre alphabétique de la liste, sur la forme affichée. Les tailles du référentiel (`2xs`, `xs`, `md`, `2xl`) forment un bloc, après les
 * autres termes et dans l'ordre de l'échelle : deux ordres qui se croiseraient (`md` avant `2xl`, mais `2xl` avant `abc` avant `md`) ne
 * donneraient pas un tri stable.
 */
function comparerAlphabetiquement(a: TermeDeListe, b: TermeDeListe): number {
  const [tailleA, tailleB] = [TAILLES.get(a.mot), TAILLES.get(b.mot)];
  if (tailleA !== undefined || tailleB !== undefined) {
    if (tailleA === undefined) return -1;
    if (tailleB === undefined) return 1;
    return tailleA - tailleB || comparer(a.place, b.place);
  }
  return comparerLesTextes(a.forme, b.forme) || comparer(a.mot, b.mot) || comparer(a.place, b.place);
}

const TRIS: Readonly<Record<TriDeTermes, (a: TermeDeListe, b: TermeDeListe) => number>> = {
  alpha: comparerAlphabetiquement,
  nombre: (a, b) => b.nombre - a.nombre || comparerAlphabetiquement(a, b),
};

// La projection

export function projeter(entree: EntreeDeProjection): Projection {
  const { lexique, regles } = entree;
  const memo = new Map<string, unknown>();
  const unique = <T>(nom: string, calcul: () => T): T => {
    if (!memo.has(nom)) memo.set(nom, calcul());
    return memo.get(nom) as T;
  };
  const analyse = (): Analyse => unique('analyse', () => analyser(entree));
  const table = (): Table => unique('table', () => construireLaTable(regles));
  const occurrences = (cle: string): readonly OccurrenceDeTerme[] => unique(`occurrences:${cle}`, () => occurrencesDuTerme(lexique, cle));
  const emploi = (cle: string): readonly string[] => unique(`emploi:${cle}`, () => nomsEmployant(occurrences(cle)));
  const presence = (cle: string) => unique(`presence:${cle}`, () => presenceDuTerme(lexique, cle, occurrences(cle)));
  /** La question qui porte le terme ; un nom (composant, palette) n'en a jamais. */
  const questionDuTerme = (cle: string) => (presence(cle).nature === null ? termesEnQuestion().get(cle) : undefined);

  const conventionDe = (categorie: CategorieDeNom): Convention =>
    categorie === 'groupes' ? entree.ecriture.groupes : categorie === 'variables' ? entree.ecriture.variables : DEFAUT;

  /** Les segments que la règle `cle` change dans le nom : le terme, l'écriture de la catégorie, ou le rang 0 d'une collection. */
  function marquesDeLaRegle(renommage: Renommage, cle: string): number[] {
    if (renommage.categorie === 'collections') return [0];
    if (estTerme(cle)) {
      const changement = analyse().changements.get(renommage.id)?.get(cle);
      if (changement) return marquesDuTerme(lexique, renommage, changement.avant);
    } else if (cle.startsWith('ecriture:')) {
      const rangs = segmentsDEcriture(lexique, renommage, categorieDeLEcriture(cle));
      if (rangs.length > 0) return rangs;
    }
    return segmentsModifies(renommage).slice(0, 1);
  }

  const ligneDuNom = (renommage: Renommage, marques: readonly number[], aussi: readonly string[]): LigneVue =>
    ({ id: renommage.id, ancien: renommage.ancienNom, nouveau: renommage.nouveauNom, marques, aussi });

  function ligneDuRenommage(renommage: Renommage, cle: string): LigneVue {
    const aussi = (analyse().groupesDe.get(renommage.id) ?? []).filter((autre) => autre !== cle);
    return ligneDuNom(renommage, marquesDeLaRegle(renommage, cle), aussi);
  }

  /** Les noms qui emploient le terme, sans changement : le segment entier du terme est marqué dans chacun. */
  function exemplesDEmploi(cle: string): LigneVue[] {
    const rangsParNom = new Map<string, Set<number>>();
    for (const occurrence of occurrences(cle)) {
      const rangs = rangsParNom.get(occurrence.nomId) ?? new Set<number>();
      rangs.add(occurrence.rangSegment);
      rangsParNom.set(occurrence.nomId, rangs);
    }
    return [...rangsParNom].slice(0, EXEMPLES_D_EMPLOI).flatMap(([id, rangs]): LigneVue[] => {
      const nom = lexique.noms.get(id);
      return nom ? [{ id, ancien: nom.nom, nouveau: nom.nom, marques: [...rangs].sort((a, b) => a - b), aussi: [] }] : [];
    });
  }

  /** Un nom qui emploie déjà le terme d'une question : il ne change pas, le segment du terme est marqué. */
  function ligneDeNom(id: string, mots: readonly string[]): LigneVue | null {
    const nom = lexique.noms.get(id);
    if (!nom) return null;
    const marques = nom.categorie === 'collections' ? [0] : rangsDeLaSuite(lexique, nom.nom, mots);
    return { id, ancien: nom.nom, nouveau: nom.nom, marques, aussi: [] };
  }

  /** Le premier nom réel du terme remplacé, avec ce nom après le oui : le terme `par` écrit dans l'écriture de chaque segment qui l'emploie. */
  function effetDuRemplacement(remplace: TermeEnQuestion, par: Mots): LigneVue | null {
    const voulus = motsDeLaCle(remplace.mot);
    for (const id of remplace.exemples) {
      const nom = lexique.noms.get(id);
      if (!nom || nom.categorie === 'collections') continue;
      const marques: number[] = [];
      const nouveau = nom.nom.split('/').map((segment, rang) => {
        const mots = motsDuSegment(lexique, segment);
        const place = placeDeLaSuite(mots, voulus);
        const categorie = nom.categoriesDesSegments?.[rang] ?? nom.categorie;
        const reecrit = place ? reecrireLeSegment(segment, mots, place, par, conventionDe(categorie)) : null;
        if (reecrit === null || reecrit === segment) return segment;
        marques.push(rang);
        return reecrit;
      });
      if (marques.length > 0) return { id, ancien: nom.nom, nouveau: nouveau.join('/'), marques, aussi: [] };
    }
    return null;
  }

  function termeVue(terme: TermeEnQuestion): TermeVue {
    const mots = motsDeLaCle(terme.mot);
    const exemples = terme.exemples.map((id) => ligneDeNom(id, mots)).filter((ligne): ligne is LigneVue => ligne !== null);
    return { mot: terme.mot, nombre: terme.nombre, exemples, ucm: terme.ucm };
  }

  function questionVue(question: Question): QuestionVue {
    switch (question.type) {
      case 'paire':
        return {
          type: 'paire', cle: question.cle, indice: question.indice, termes: [termeVue(question.termes[0]), termeVue(question.termes[1])],
          propose: question.propose,
          effet: effetDuRemplacement(question.termes[question.propose === 0 ? 1 : 0], motsDeLaCle(question.termes[question.propose].mot)),
          cibleCommune: (question.cibleAlias !== undefined && entree.nomDeLaCible?.(question.cibleAlias)) || null,
        };
      case 'ecriture-du-terme':
        return {
          type: 'ecriture-du-terme', cle: question.cle, indice: question.indice, terme: termeVue(question.terme),
          proposition: [...question.proposition], reference: question.reference ?? null,
          effet: effetDuRemplacement(question.terme, question.proposition),
        };
      case 'collection':
        return { type: 'collection', cle: question.cle, nom: question.nom, nombre: question.nombre, proposee: question.proposee ?? null };
    }
  }

  /** Les questions affichées, avec le terme que chacune met en cause et son vis-à-vis. */
  const questionsAffichees = (): { readonly questions: readonly Question[]; readonly misesDeCote: readonly Question[]; readonly autres: number } =>
    unique('questions', () => {
      const plusTard = new Set(regles.plusTard);
      return {
        questions: entree.questions.questions.filter((question) => !plusTard.has(question.cle)),
        misesDeCote: entree.questions.questions.filter((question) => plusTard.has(question.cle)),
        autres: entree.questions.autres.filter((question) => !plusTard.has(question.cle)).length,
      };
    });

  const termesEnQuestion = (): ReadonlyMap<string, { readonly question: string; readonly avec: string | null }> => unique('termesEnQuestion', () => {
    const liste = new Map<string, { question: string; avec: string | null }>();
    const poser = (mot: string, question: string, avec: string | null): void => {
      const cle = mot.toLowerCase();
      if (!liste.has(cle)) liste.set(cle, { question, avec });
    };
    const { questions, misesDeCote } = questionsAffichees();
    for (const question of [...questions, ...misesDeCote]) {
      if (question.type === 'paire') {
        poser(question.termes[0].mot, question.cle, question.termes[1].mot);
        poser(question.termes[1].mot, question.cle, question.termes[0].mot);
      } else if (question.type === 'ecriture-du-terme') {
        poser(question.terme.mot, question.cle, null);
      }
    }
    return liste;
  });

  // Le bilan

  function ligneDEcriture(categorie: 'groupes' | 'variables'): LigneDEcriture {
    const cle = `ecriture:${categorie}`;
    let total = 0;
    let modele: NomLu | null = null;
    for (const nom of lexique.noms.values()) {
      if (nom.categorie !== 'variables' || (categorie === 'groupes' && !nom.categoriesDesSegments?.includes('groupes'))) continue;
      total++;
      if (!modele || valeurDExemple(nom.nom) > valeurDExemple(modele.nom)) modele = nom;
    }
    const concernes = entree.resultat.renommages.filter((renommage) => (renommage.regles as readonly string[]).includes(cle));
    const concerne = concernes.reduce<Renommage | null>((meilleur, renommage) =>
      (!meilleur || valeurDExemple(renommage.ancienNom) > valeurDExemple(meilleur.ancienNom) ? renommage : meilleur), null);
    const exemple = concerne
      ? ligneDuNom(concerne, marquesDeLaRegle(concerne, cle), [])
      : modele && { id: modele.id, ancien: modele.nom, nouveau: modele.nom, marques: rangsDeLaPlace(modele, categorie), aussi: [] };
    return { convention: conventionDe(categorie), suivent: Math.max(0, total - concernes.length), total, exemple };
  }

  /** La place où un terme qui change de forme avec elle est écrit : celle de la plupart de ses renommages ; `null` pour les autres termes. */
  function categorieDuTerme(cle: string, renommages: readonly Renommage[]): 'variables' | 'groupes' | null {
    if (!TERMES_SELON_LA_PLACE.has(cle.slice('terme:'.length))) return null;
    const { changements } = analyse();
    const comptes = { variables: 0, groupes: 0 };
    for (const renommage of renommages) {
      const changement = changements.get(renommage.id)?.get(cle);
      const rang = changement ? marquesDuTerme(lexique, renommage, changement.avant)[0] : undefined;
      const categorie = rang === undefined ? null : categorieDuSegmentRenomme(lexique, renommage, rang);
      if (categorie === 'variables' || categorie === 'groupes') comptes[categorie]++;
    }
    if (comptes.variables === 0 && comptes.groupes === 0) return null;
    return comptes.groupes > comptes.variables ? 'groupes' : 'variables';
  }

  function groupeVue(cle: string): GroupeVue {
    const { propres, origines, changements, clesDe } = analyse();
    const renommages = propres.get(cle) ?? [];
    const variables = renommages.filter((renommage) => renommage.categorie !== 'collections').length;
    const collections = renommages.length - variables;
    const apercu = renommages.slice(0, TAILLE_DE_L_APERCU).map((renommage) => ligneDuRenommage(renommage, cle));
    let regle: RegleVue;
    let avant = '';
    let apres = '';
    if (estTerme(cle)) {
      regle = { sorte: 'terme', origine: origines.get(cle) ?? 'ucm', categorie: categorieDuTerme(cle, renommages) };
      const comptes = new Map<string, { avant: string; apres: string; nombre: number }>();
      for (const renommage of renommages) {
        const changement = changements.get(renommage.id)?.get(cle);
        if (!changement) continue;
        const paire = { avant: cleDesMots(changement.avant), apres: cleDesMots(changement.apres), nombre: 0 };
        const connue = comptes.get(`${paire.avant}\n${paire.apres}`) ?? paire;
        connue.nombre++;
        comptes.set(`${paire.avant}\n${paire.apres}`, connue);
      }
      const gagnante = [...comptes.values()].sort((a, b) => b.nombre - a.nombre || comparer(a.avant, b.avant))[0];
      if (gagnante) ({ avant, apres } = gagnante);
    } else if (estCollection(cle)) {
      regle = { sorte: 'collection' };
      avant = renommages[0]?.ancienNom ?? '';
      apres = renommages[0]?.nouveauNom ?? '';
    } else {
      const categorie = categorieDeLEcriture(cle);
      regle = { sorte: 'ecriture', categorie, convention: conventionDe(categorie) };
      const comptes = new Map<string, { avant: string; apres: string; nombre: number }>();
      for (const renommage of renommages) {
        const rang = segmentsDEcriture(lexique, renommage, categorie)[0];
        if (rang === undefined) continue;
        const paire = { avant: renommage.ancienNom.split('/')[rang], apres: renommage.nouveauNom.split('/')[rang], nombre: 0 };
        const connue = comptes.get(`${paire.avant}\n${paire.apres}`) ?? paire;
        connue.nombre++;
        comptes.set(`${paire.avant}\n${paire.apres}`, connue);
      }
      const gagnante = [...comptes.values()].sort((a, b) => b.nombre - a.nombre || comparer(a.avant, b.avant))[0];
      if (gagnante) ({ avant, apres } = gagnante);
    }
    const aussiDEcriture = estTerme(cle)
      ? renommages.filter((renommage) => (clesDe.get(renommage.id) ?? []).some((autre) => autre.startsWith('ecriture:'))).length
      : 0;
    return {
      cle, regle, avant, apres, autres: Math.max(0, renommages.length - apercu.length), variables, collections, aussiDEcriture,
      nouveau: !premierLancement() && !regles.vus.includes(cle), apercu,
    };
  }

  const premierLancement = (): boolean => regles.ecriture === undefined || regles.ecritureDeLaV1;

  function bloques(): BloqueVue[] {
    const collections = new Map(entree.inventaire.entrees.filter((e) => e.cible.type === 'collection').map((e) => [e.nom.id, e.nom.nom]));
    return entree.resultat.collisions.flatMap((collision) => collision.ids.flatMap((id): BloqueVue[] => {
      const nom = lexique.noms.get(id);
      if (!nom || nom.nom === collision.nom) return [];
      const bloque = { avant: nom.nom, apres: collision.nom, collection: collision.categorie === 'collections' ? '' : collections.get(collision.portee) ?? '' };
      return [estCollisionDeChemin(collision) ? { ...bloque, chemin: { motif: collision.motif, apres: collision.apres, autre: collision.autre } } : bloque];
    }));
  }

  function collectionsVues(): { readonly collections: CollectionVue[]; readonly proteges: number } {
    const exclues = new Set(regles.collectionsExclues);
    const nombre = new Map<string, number>();
    const palettes = new Set<string>();
    let proteges = 0;
    for (const e of entree.inventaire.entrees) {
      if (e.cible.type !== 'variable') continue;
      nombre.set(e.cible.collectionId, (nombre.get(e.cible.collectionId) ?? 0) + 1);
      if (e.protegee) {
        palettes.add(e.cible.collectionId);
        if (!exclues.has(e.cible.collectionId)) proteges++;
      }
    }
    const collections = entree.inventaire.entrees.flatMap((e): CollectionVue[] => e.cible.type === 'collection'
      ? [{ id: e.cible.collectionId, nom: e.nom.nom, nombre: nombre.get(e.cible.collectionId) ?? 0, analysee: !exclues.has(e.cible.collectionId), palettes: palettes.has(e.cible.collectionId) }]
      : []);
    return { collections, proteges };
  }

  function bilan(): Bilan {
    return unique('bilan', (): Bilan => {
      const { collections, proteges } = collectionsVues();
      const noms = [...lexique.noms.values()].filter((nom) => nom.categorie === 'collections');
      const { questions, misesDeCote, autres } = questionsAffichees();
      return {
        generation: entree.generation,
        premierLancement: premierLancement(),
        sansVariableLocale: !entree.inventaire.entrees.some((e) => e.cible.type === 'variable'),
        ecriture: {
          groupes: ligneDEcriture('groupes'),
          variables: ligneDEcriture('variables'),
          collections: { reconnues: noms.filter((nom) => collectionUcmReconnue(nom.nom) !== undefined).length, total: noms.length },
        },
        groupes: analyse().ordre.map(groupeVue),
        bloques: bloques(),
        proteges,
        questions: questions.map(questionVue),
        autresPistes: autres,
        plusTard: misesDeCote.map(questionVue),
        collections,
        dernierRenommage: dernierRenommage(),
        dernierImport: regles.dernierImport ? { heure: regles.dernierImport.heure, lignes: lignesDeLImport(regles.dernierImport) } : null,
      };
    });
  }

  /**
   * Les entrées du journal que l'annulation ne rétablit pas encore, rangées par collection dans l'ordre de l'inventaire ; les objets
   * introuvables forment le dernier groupe. Le sort se juge sans les exclusions, que `exclue` et `reviennent` portent à part.
   */
  function dernierRenommage(): Bilan['dernierRenommage'] {
    const journal = regles.journal;
    if (!journal || journal.renommages.length === 0) return null;
    const exclues = new Set(regles.collectionsExclues);
    const collections = new Map<string, string>();
    const variables = new Map<string, { readonly nom: string; readonly collectionId: string }>();
    for (const e of entree.inventaire.entrees) {
      if (e.cible.type === 'collection') collections.set(e.cible.collectionId, e.nom.nom);
      else variables.set(e.cible.variableId, { nom: e.nom.nom, collectionId: e.cible.collectionId });
    }
    const lecteurs: LecteursDuJournal = {
      objet: (type, figmaId) => {
        const nom = type === 'collection' ? collections.get(figmaId) : variables.get(figmaId)?.nom;
        return nom === undefined ? null : { nom, remote: false };
      },
      collectionDeLaVariable: (figmaId) => variables.get(figmaId)?.collectionId,
      exclues: new Set(),
    };
    const rangees = new Map<string | null, LigneDuJournal[]>();
    let reviennent = 0;
    for (const renommage of journal.renommages) {
      const sort = classerLeRenommage(renommage, lecteurs);
      if (sort === 'retabli' || sort === 'exclue') continue;
      const nom = lecteurs.objet(renommage.type, renommage.id)?.nom ?? null;
      const collection = renommage.type === 'collection'
        ? (collections.has(renommage.id) ? renommage.id : null)
        : variables.get(renommage.id)?.collectionId ?? null;
      if (sort === 'revient' && (collection === null || !exclues.has(collection))) reviennent++;
      const ligne: LigneDuJournal = { type: renommage.type, aujourdhui: nom, ancien: renommage.ancienNom, sort };
      const rangee = rangees.get(collection);
      if (rangee) rangee.push(ligne); else rangees.set(collection, [ligne]);
    }
    const groupes: CollectionDuJournal[] = [...collections]
      .filter(([id]) => rangees.has(id))
      .map(([id, nom]) => ({ id, nom, exclue: exclues.has(id), lignes: rangees.get(id) ?? [] }));
    const introuvables = rangees.get(null);
    if (introuvables) groupes.push({ id: null, nom: null, exclue: false, lignes: introuvables });
    return { nombre: journal.renommages.length, reviennent, heure: journal.heure, collections: groupes };
  }

  function lignes(groupe: string, debut: number): PageDeLignes {
    const { propres, secondaires } = analyse();
    const siens = propres.get(groupe) ?? [];
    if (siens.length === 0) return { lignes: [], total: 0 };
    const autres = secondaires.get(groupe) ?? [];
    const total = siens.length + autres.length;
    const page = [...siens.slice(debut, debut + TAILLE_DE_PAGE), ...autres.slice(Math.max(0, debut - siens.length), Math.max(0, debut + TAILLE_DE_PAGE - siens.length))]
      .slice(0, TAILLE_DE_PAGE);
    return { lignes: page.map((renommage) => ligneDuRenommage(renommage, groupe)), total };
  }

  // La liste des termes et la fiche

  /** Le statut d'un terme et les clés des variantes qu'il remplace, d'après les règles du fichier. */
  function entreeDuTerme(cle: string): Omit<TermeDeListe, 'mot' | 'place' | 'forme' | 'type' | 'nature' | 'nombre' | 'trouve' | 'remplace'> & { readonly variantes: readonly string[] } {
    const { ucm, ecartes, remplaceesParUcm, personnalises, remplaceesParPerso } = table();
    const perso = personnalises.get(cle);
    const gardeParUcm = ucm.get(cle);
    if (ecartes.has(cle)) return { origine: 'ucm', statut: 'ecart', variantes: [], avec: null };
    if (gardeParUcm) return { origine: 'ucm', statut: 'regle', variantes: [...new Set([...gardeParUcm.formes, ...(perso?.remplace ?? [])])], avec: null };
    if (perso) return { origine: 'personnalise', statut: 'regle', variantes: [...perso.remplace], avec: null };
    const parUcm = remplaceesParUcm.get(cle);
    if (parUcm) return { origine: 'ucm', statut: 'regle', variantes: [], avec: parUcm };
    const parPerso = remplaceesParPerso.get(cle);
    if (parPerso) return { origine: 'personnalise', statut: 'regle', variantes: [], avec: parPerso };
    const enQuestion = questionDuTerme(cle);
    if (enQuestion) return { origine: null, statut: 'a-trancher', variantes: [], avec: enQuestion.avec };
    return { origine: null, statut: 'sans-regle', variantes: [], avec: null };
  }


  /** La catégorie où le fichier emploie le plus le terme et ses variantes ; les variables, à égalité ou sans emploi. */
  function categorieDEmploi(cles: readonly string[]): 'groupes' | 'variables' {
    return categorieDesOccurrences(cles.flatMap((cle) => occurrences(cle)));
  }

  /** La place d'une occurrence : les groupes, ou les variables pour toute autre catégorie de segment. */
  function placeDeLOccurrence(occurrence: OccurrenceDeTerme): PlaceDuTerme {
    const nom = lexique.noms.get(occurrence.nomId);
    return nom !== undefined && categorieDuSegment(nom, occurrence.rangSegment) === 'groupes' ? 'groupes' : 'variables';
  }

  /** Les occurrences d'une place. Un nom (composant, palette) n'a qu'une ligne : toutes ses occurrences y comptent. */
  const dansLaPlace = (liste: readonly OccurrenceDeTerme[], nature: NatureDeSegment | null, place: PlaceDuTerme): readonly OccurrenceDeTerme[] =>
    nature !== null ? liste : liste.filter((occurrence) => placeDeLOccurrence(occurrence) === place);

  /** La catégorie la plus fréquente parmi des occurrences ; les variables, à égalité ou sans occurrence. */
  function categorieDesOccurrences(liste: readonly OccurrenceDeTerme[]): 'groupes' | 'variables' {
    let groupes = 0;
    let variables = 0;
    for (const occurrence of liste) {
      const nom = lexique.noms.get(occurrence.nomId);
      if (!nom) continue;
      const categorie = categorieDuSegment(nom, occurrence.rangSegment);
      if (categorie === 'groupes') groupes++;
      else if (categorie === 'variables') variables++;
    }
    return groupes > variables ? 'groupes' : 'variables';
  }

  /**
   * L'écriture d'un terme dans la liste. Un terme réglé s'écrit dans la convention de la catégorie qui l'emploie le plus, lui ou l'une de ses
   * variantes (`Color` en dossier, `line-height` en variable). Un nom (composant, palette) et un mot sans règle gardent leur écriture du fichier.
   */
  /**
   * Les occurrences d'une variante que la règle de `cle` remplace vraiment. Pour un terme dont la forme dépend de la place, la forme retenue à la
   * place de l'occurrence n'est pas une variante : `Small` reste dans un dossier, seul `small` dans un nom de variable devient `sm`.
   */
  function occurrencesRemplacees(cle: string, variante: string): readonly OccurrenceDeTerme[] {
    const terme = TERME_SELON_LA_PLACE.get(cle);
    if (!terme) return occurrences(variante);
    return occurrences(variante).filter((occurrence) => {
      const nom = lexique.noms.get(occurrence.nomId);
      return !nom || termePourCategorie(terme, categorieDuSegment(nom, occurrence.rangSegment)).id.toLowerCase() !== variante;
    });
  }

  /**
   * Avec `place`, l'écriture de la ligne de cette place ; sans elle (la fiche), celle de la place choisie pour tout le terme.
   * Un nom ou un mot sans règle garde son écriture du fichier, la plus fréquente à `place`.
   */
  function formeAffichee(cle: string, nature: NatureDeSegment | null, statut: TermeDeListe['statut'], variantes: readonly string[], place?: PlaceDuTerme): string {
    const mots = motsDeLaCle(cle);
    if (nature !== null || (statut !== 'regle' && statut !== 'ecart') || mots.length === 0) {
      return place === undefined ? presence(cle).forme : presenceDuTerme(lexique, cle, dansLaPlace(occurrences(cle), nature, place)).forme;
    }
    const terme = TERME_SELON_LA_PLACE.get(cle);
    // Sans `place`, un terme dont la forme dépend de la place s'écrit à la place où il remplace des variantes, sinon à celle qui l'emploie
    // le plus, avec l'identifiant de cette place : `sm remplace small` pour une variable, `Small` en dossier.
    const remplacees = place === undefined && terme ? variantes.flatMap((variante) => occurrencesRemplacees(cle, variante)) : [];
    const categorie = place ?? (remplacees.length > 0 ? categorieDesOccurrences(remplacees) : categorieDEmploi([cle, ...variantes]));
    const convention = conventionDe(categorie);
    const retenus = terme ? motsDeLaCle(termePourCategorie(terme, categorie).id.toLowerCase()) : mots;
    return assembler(retenus.join('-'), motsAvecCasse(retenus, convention.casse), convention.separateur);
  }

  /** Les formes du fichier des variantes que le terme remplace vraiment à `place`, de la plus fréquente à la moins fréquente. */
  function formesDesVariantes(cle: string, nature: NatureDeSegment | null, variantes: readonly string[], place: PlaceDuTerme): string[] {
    const comptes = new Map<string, number>();
    for (const variante of variantes) {
      for (const [forme, nombre] of formesDuFichier(lexique, dansLaPlace(occurrencesRemplacees(cle, variante), nature, place))) comptes.set(forme, (comptes.get(forme) ?? 0) + nombre);
    }
    return formesParFrequence(comptes);
  }

  const typeDuTerme = (cle: string, nature: NatureDeSegment | null, statut: TermeDeListe['statut'], variantes: readonly string[], place: PlaceDuTerme): TypeDeTerme =>
    nature !== null ? nature : statut === 'a-trancher' ? 'a-trancher'
      : statut === 'regle' ? (variantes.some((variante) => dansLaPlace(occurrencesRemplacees(cle, variante), nature, place).length > 0) ? 'remplace' : 'conforme') : 'sans-regle';

  /** Une ligne de la liste, avec l'écriture du fichier du terme et de chacune de ses variantes à sa place, que la recherche lit aussi. */
  interface EntreeDeListe {
    readonly terme: TermeDeListe;
    readonly fichier: string;
    readonly variantes: readonly { readonly cle: string; readonly forme: string }[];
  }

  const listeDesTermes = (): readonly EntreeDeListe[] => unique('liste', () => {
    const { ucm, ecartes, remplaceesParUcm, personnalises, remplaceesParPerso } = table();
    const cles = new Set<string>();
    for (const cle of lexique.occurrencesDesTermes.keys()) if (/\p{L}/u.test(cle)) cles.add(cle);
    for (const cle of [...personnalises.keys(), ...ecartes.keys()]) cles.add(cle);
    for (const cle of [...ucm.keys(), ...remplaceesParUcm.keys(), ...remplaceesParPerso.keys()]) {
      if (!cles.has(cle) && emploi(cle).length > 0) cles.add(cle);
    }
    for (const terme of ucm.values()) {
      if (!cles.has(terme.cle) && terme.formes.some((forme) => emploi(forme).length > 0)) cles.add(terme.cle);
    }
    // Un terme remplacé n'a pas de ligne : sa référence le porte dans `remplace`.
    return [...cles].flatMap((cle): EntreeDeListe[] => {
      const { variantes, ...reste } = entreeDuTerme(cle);
      if (reste.statut === 'regle' && reste.avec !== null) return [];
      const { nature } = presence(cle);
      const employees = [...occurrences(cle), ...variantes.flatMap((variante) => occurrences(variante))];
      // Une ligne par place où le terme ou une de ses variantes apparaît, un nom sur la seule place des groupes ; sans occurrence, une ligne
      // à la place où le fichier emploie le plus le terme.
      const lieux = nature !== null ? ['groupes' as const] : PLACES_DE_TERMES.filter((place) => employees.some((occurrence) => placeDeLOccurrence(occurrence) === place));
      return (lieux.length > 0 ? lieux : [categorieDEmploi([cle, ...variantes])]).map((place): EntreeDeListe => {
        const terme: TermeDeListe = {
          mot: cle, place, forme: formeAffichee(cle, nature, reste.statut, variantes, place), type: typeDuTerme(cle, nature, reste.statut, variantes, place), nature,
          // Une règle compte les noms du terme et ceux de ses variantes : `Color`, que seuls `Colors` et `colors` emploient, ne vaut pas 0.
          ...reste, remplace: formesDesVariantes(cle, nature, variantes, place), nombre: nomsEmployant(dansLaPlace(employees, nature, place)).length, trouve: null,
        };
        // Une variante que le fichier emploie ailleurs qu'à cette place ne fait pas trouver cette ligne ; une variante absente du fichier, si.
        const vues = variantes.flatMap((variante) => {
          const ici = dansLaPlace(occurrences(variante), nature, place);
          return ici.length > 0 || occurrences(variante).length === 0 ? [{ cle: variante, forme: presenceDuTerme(lexique, variante, ici).forme }] : [];
        });
        return { terme, fichier: presenceDuTerme(lexique, cle, dansLaPlace(occurrences(cle), nature, place)).forme, variantes: vues };
      });
    }).sort((a, b) => b.terme.nombre - a.terme.nombre || comparer(a.terme.mot, b.terme.mot) || comparer(a.terme.place, b.terme.place));
  });

  const reglee = (terme: TermeDeListe): boolean => terme.type === 'remplace' || terme.type === 'conforme';

  /** Les comptes de toutes les lignes de la liste : ni la recherche ni les filtres ne les changent. */
  const comptesDeLaListe = (): ComptesDeTermes => unique('comptes', () => {
    const types: Record<TypeDeTerme, number> = { 'a-trancher': 0, remplace: 0, conforme: 0, 'sans-regle': 0, composant: 0, palette: 0 };
    const origines = { ucm: 0, personnalise: 0 };
    const places = { groupes: 0, variables: 0 };
    for (const { terme } of listeDesTermes()) {
      types[terme.type]++;
      places[terme.place]++;
      if (reglee(terme) && terme.origine !== null) origines[terme.origine]++;
    }
    return { types, origines, places };
  });

  function termes(requete: RequeteDeTermes): PageDeTermes {
    const recherche = requete.recherche.trim().toLowerCase();
    const types = new Set<TypeDeTerme>(requete.types);
    const origines = new Set(requete.origines);
    const places = new Set(requete.places);
    const retenues = new Map<TypeDeTerme, Record<PlaceDuTerme, TermeDeListe[]>>(TYPES_DE_TERMES.map((type) => [type, { groupes: [], variables: [] }]));
    for (const { terme, fichier, variantes } of listeDesTermes()) {
      if (types.size > 0 && !types.has(terme.type)) continue;
      if (places.size > 0 && !places.has(terme.place)) continue;
      if (origines.size > 0 && reglee(terme) && (terme.origine === null || !origines.has(terme.origine))) continue;
      const liste = retenues.get(terme.type)![terme.place];
      if (recherche === '' || terme.mot.includes(recherche) || terme.forme.toLowerCase().includes(recherche) || fichier.toLowerCase().includes(recherche)) {
        liste.push(terme);
        continue;
      }
      const variante = variantes.find(({ cle, forme }) => cle.includes(recherche) || forme.toLowerCase().includes(recherche));
      // Une variante que le fichier n'emploie pas n'est pas dans `remplace` : la ligne trouvée la porte, pour que `trouve` en soit un élément.
      if (variante !== undefined) liste.push({ ...terme, remplace: terme.remplace.includes(variante.forme) ? terme.remplace : [...terme.remplace, variante.forme], trouve: variante.forme });
    }
    const tri = TRIS[requete.tri];
    const sections = (requete.section === null ? TYPES_DE_TERMES : [requete.section]).flatMap((type): SectionDeTermes[] => {
      const { groupes, variables } = retenues.get(type)!;
      const totaux = { groupes: groupes.length, variables: variables.length };
      const total = totaux.groupes + totaux.variables;
      if (requete.section === null && total === 0) return [];
      const debut = requete.debut;
      let termes: TermeDeListe[];
      if (requete.tri === 'nombre') {
        // Les places se mêlent : une seule suite, une seule page.
        const melees = [...groupes, ...variables].sort(tri);
        termes = requete.section === null ? melees.slice(0, LIGNES_PAR_SECTION) : melees.slice(debut, debut + TAILLE_DE_PAGE);
      } else {
        groupes.sort(tri);
        variables.sort(tri);
        // Sans section, autant de lignes pour chaque place. Avec section, la place demandée seule, sinon les groupes puis les variables.
        const lues = requete.place === null ? [...groupes, ...variables] : requete.place === 'groupes' ? groupes : variables;
        termes = requete.section === null ? [...groupes.slice(0, LIGNES_PAR_SECTION), ...variables.slice(0, LIGNES_PAR_SECTION)] : lues.slice(debut, debut + TAILLE_DE_PAGE);
      }
      return [{ type, total, totaux, termes }];
    });
    return { section: requete.section, debut: requete.debut, sections, comptes: comptesDeLaListe() };
  }

  function fiche(mot: string): FicheVue {
    const cle = mot.trim().toLowerCase();
    const { ucm, ecartes, personnalises } = table();
    const dedans = entreeDuTerme(cle);
    const { nature } = presence(cle);
    const ucmDuTerme = ucm.get(cle) ?? ecartes.get(cle);
    const perso = personnalises.get(cle);
    const variantes = [...(ucm.get(cle)?.formes ?? []).map((variante) => ({ variante, ucm: true })), ...(perso?.remplace ?? []).map((variante) => ({ variante, ucm: false }))];
    const ids = emploi(cle);
    const voulu = motsDeLaCle(cle).join(' ');
    const cleDeRegle = `terme:${cle}`;
    const { clesDe } = analyse();
    const dues = entree.resultat.renommages.flatMap((renommage) => {
      const trouvee = clesDe.get(renommage.id)?.find((autre) => autre.toLowerCase() === cleDeRegle);
      return trouvee ? [ligneDuRenommage(renommage, trouvee)] : [];
    });
    return {
      mot: cle,
      // Une variante remplacée garde son écriture du fichier : elle n'est pas le terme de référence.
      forme: dedans.avec === null ? formeAffichee(cle, nature, dedans.statut, dedans.variantes) : presence(cle).forme,
      nature,
      origine: dedans.origine,
      categorieUcm: ucmDuTerme && ucmDuTerme.registre !== '' ? ucmDuTerme.registre : null,
      definition: ucmDuTerme?.definition ?? perso?.definition ?? null,
      remplace: variantes.map(({ variante, ucm: deLUcm }) => ({ mot: variante, forme: presence(variante).forme, nombre: emploi(variante).length, ucm: deLUcm })),
      emploi: {
        nombre: ids.length,
        exemples: exemplesDEmploi(cle),
      },
      aRenommer: { nombre: dues.length, exemples: dues.slice(0, EXEMPLES_D_EMPLOI) },
      ecart: ecartes.has(cle),
      voulu: regles.voulus.includes(voulu),
      ordinaire: regles.ordinaires.includes(motsDeLaCle(cle).join('-')),
      distincts: regles.distincts.flatMap(([a, b]) => (a.toLowerCase() === cle ? [b] : b.toLowerCase() === cle ? [a] : [])),
      question: questionDuTerme(cle)?.question ?? null,
    };
  }

  function segmentsDuTerme(cle: string): SegmentDuTerme[] {
    const parSegment = new Map<string, { mots: Mots; noms: Set<string>; exemple: string }>();
    for (const occurrence of occurrences(cle)) {
      const nom = lexique.noms.get(occurrence.nomId);
      if (!nom) continue;
      const segment = nom.nom.split('/')[occurrence.rangSegment] ?? '';
      const mots = motsDuSegment(lexique, segment);
      const vu = parSegment.get(segment) ?? { mots, noms: new Set<string>(), exemple: nom.nom };
      vu.noms.add(nom.id);
      parSegment.set(segment, vu);
    }
    return [...parSegment].map(([segment, vu]) => ({ segment, mots: vu.mots, noms: vu.noms.size, exemple: vu.exemple }))
      .sort((a, b) => b.noms - a.noms || comparer(a.segment, b.segment));
  }

  function diagnostic(): DiagnosticDuVocabulaire {
    const collections = new Map(entree.inventaire.entrees.map((dedans) => [dedans.nom.id, dedans.contexte?.collection ?? null]));
    const nouveaux = new Map(entree.resultat.renommages.map((renommage) => [renommage.id, renommage.nouveauNom]));
    return {
      ecriture: entree.ecriture,
      termes: listeDesTermes().map(({ terme: { trouve: _trouve, ...terme } }) => ({
        ...terme, question: questionDuTerme(terme.mot)?.question ?? null, segments: segmentsDuTerme(terme.mot),
      })),
      noms: [...lexique.noms.values()].map((nom) => {
        const segments = nom.nom.split('/');
        const plages = lexique.termes.get(nom.id) ?? [];
        return {
          nom: nom.nom, collection: collections.get(nom.id) ?? null, categorie: nom.categorie,
          mots: segments.map((segment) => motsDuSegment(lexique, segment)),
          natures: lexique.natures.get(nom.id) ?? segments.map(() => null),
          termes: segments.map((segment, rang) => nom.categorie === 'collections' ? []
            : (plages[rang] ?? []).map(([debut, fin]) => formeDeLaPlage(segment, motsDuSegment(lexique, segment), debut, fin))),
          nouveau: nouveaux.get(nom.id) ?? null,
        };
      }),
    };
  }

  function identifiants(selection: Selection): readonly string[] {
    const { principal } = analyse();
    const groupes = new Set(selection.groupes);
    const exclus = new Set(selection.exclus);
    const inclus = new Set(selection.inclus);
    return entree.resultat.renommages
      .filter((renommage) => inclus.has(renommage.id) || (groupes.has(principal.get(renommage.id) ?? '') && !exclus.has(renommage.id)))
      .map((renommage) => renommage.id);
  }

  function principaux(ids: readonly string[]): readonly (readonly [string, string])[] {
    const { principal } = analyse();
    return [...new Set(ids)].flatMap((id): [string, string][] => {
      const cle = principal.get(id);
      return cle === undefined ? [] : [[id, cle]];
    });
  }

  return { bilan, diagnostic, lignes, termes, fiche, identifiants, principaux };
}

// Les conflits et les effets

const nomDuTerme = (mots: Mots): string => mots.join('-');

export function conflitVue(conflit: ConflitDeVocabulaire): ConflitVue {
  switch (conflit.type) {
    case 'contredit-ucm':
      return { type: 'contredit-ucm', terme: nomDuTerme(conflit.terme), remplace: nomDuTerme(conflit.remplace), termeUcm: nomDuTerme(conflit.termeUcm) };
    case 'deja-remplace':
      return { type: 'deja-remplace', remplace: nomDuTerme(conflit.remplace), par: nomDuTerme(conflit.par) };
    case 'cycle':
      return { type: 'cycle', termes: conflit.termes.map(nomDuTerme) };
  }
}

/**
 * L'effet d'un terme : les noms dont le nouveau nom diffère entre le calcul courant et le calcul simulé, avec un exemple
 * pris dans le calcul simulé, sinon dans le calcul courant. Les deux entrées partagent le même lexique.
 */
export function effetDeTerme(courante: EntreeDeProjection, simulee: EntreeDeProjection, terme: { readonly avant: string; readonly apres: string }): EffetVue {
  const avant = new Map(courante.resultat.renommages.map((renommage) => [renommage.id, renommage]));
  const apres = new Map(simulee.resultat.renommages.map((renommage) => [renommage.id, renommage]));
  const changes = [
    ...simulee.resultat.renommages.filter((renommage) => avant.get(renommage.id)?.nouveauNom !== renommage.nouveauNom),
    ...courante.resultat.renommages.filter((renommage) => !apres.has(renommage.id)),
  ];
  const premier = changes[0];
  let exemple: LigneVue | null = null;
  if (premier) {
    const marques = premier.categorie === 'collections' ? [0] : marquesDuTerme(simulee.lexique, premier, motsDeLaCle(terme.avant));
    exemple = { id: premier.id, ancien: premier.ancienNom, nouveau: premier.nouveauNom, marques, aussi: [] };
  }
  return { sorte: 'terme', avant: terme.avant, apres: terme.apres, nombre: changes.length, exemple };
}

/** L'effet d'une écriture : les comptes et les exemples du calcul simulé, et ses renommages d'écriture. */
export function effetDEcriture(simulee: EntreeDeProjection): EffetVue {
  const bilan = projeter(simulee).bilan();
  const concernes = simulee.resultat.renommages.filter((renommage) =>
    renommage.regles.some((cle) => cle === 'ecriture:groupes' || cle === 'ecriture:variables'));
  const premier = concernes[0];
  return {
    sorte: 'ecriture',
    groupes: bilan.ecriture.groupes,
    variables: bilan.ecriture.variables,
    renommages: concernes.length,
    exemple: premier ? { avant: premier.ancienNom, apres: premier.nouveauNom } : null,
  };
}

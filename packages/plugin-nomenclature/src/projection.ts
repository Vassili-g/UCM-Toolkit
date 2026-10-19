/**
 * La projection du calcul vers l'écran : le résultat du lexique, les questions, les règles du fichier et l'inventaire
 * deviennent les types de vue de `messages.ts`. Le module est pur : ni Figma, ni DOM, aucun texte pour le designer.
 *
 * Un terme se désigne par son mot en minuscules, ses mots joints par un tiret (`extra-small`).
 * Un renommage appartient au groupe de sa première règle dans l'ordre du bilan et apparaît dans les autres par `aussi`.
 */
import {
  REGISTRES, REGISTRES_ARCHITECTURE, REGISTRE_AXES_ETAT, collectionUcmReconnue, decouperSegment,
  type CategorieDeNom, type ChangementDeTerme, type ConflitDeVocabulaire, type Convention, type Lexique, type Mots,
  type OrigineDuTerme, type Question, type Renommage, type ResultatDesQuestions, type ResultatDuLexique, type TermeEnQuestion,
} from '@ucm-kit/core/referentiel';
import { estCollisionDeChemin } from './cheminsPublies';
import type { Inventaire } from './lecture';
import type {
  Bilan, BloqueVue, CollectionVue, ConflitVue, EcritureChoisie, EffetVue, FicheVue, GroupeVue, LigneDEcriture, LigneVue,
  QuestionVue, RegleVue, Selection, TermeDeListe, TermeVue,
} from './messages';
import type { ReglesDuFichier } from './regles';

/** Nombre d'entrées d'une page de `lignes` ou de `termes`. */
export const TAILLE_DE_PAGE = 50;
/** Nombre de lignes que `GroupeVue.apercu` porte. */
export const TAILLE_DE_L_APERCU = 3;
const EXEMPLES_D_EMPLOI = 3;
/** Les termes du référentiel dont la forme change avec la place (les tailles) : leur identifiant et chacune de leurs formes. */
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
  /** Nom complet de la variable que vise un alias, d'après l'identifiant de Figma ; absent, `cibleCommune` vaut `null`. */
  readonly nomDeLaCible?: (identifiant: string) => string | undefined;
}

export interface RequeteDeTermes { readonly recherche: string; readonly filtre: 'tous' | 'avec-regle' | 'sans-regle'; readonly debut: number }
export interface PageDeLignes { readonly lignes: readonly LigneVue[]; readonly total: number }
export interface PageDeTermes {
  readonly termes: readonly TermeDeListe[];
  readonly total: number;
  readonly comptes: { readonly tous: number; readonly avecRegle: number; readonly sansRegle: number };
}

export interface Projection {
  bilan(): Bilan;
  /** Les lignes d'un groupe : ses renommages propres d'abord, puis ceux qui n'y figurent que par `aussi`. */
  lignes(groupe: string, debut: number): PageDeLignes;
  termes(requete: RequeteDeTermes): PageDeTermes;
  fiche(mot: string): FicheVue;
  /** Les identifiants cochés : groupe principal coché sans exclusion, plus les inclus qui sont des renommages. */
  identifiants(selection: Selection): readonly string[];
}

// Les segments

const motsEnMinuscules = (mots: Mots): string[] => mots.map((mot) => mot.toLowerCase());
const cleDesMots = (mots: Mots): string => motsEnMinuscules(mots).join('-');
const comparer = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
const motsDeLaCle = (cle: string): string[] => cle.split('-').filter((mot) => mot !== '');

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

function categorieDuSegment(lexique: Lexique, renommage: Renommage, rang: number): CategorieDeNom {
  return lexique.noms.get(renommage.id)?.categoriesDesSegments?.[rang] ?? renommage.categorie;
}

/** Les segments de la catégorie dont l'écriture change. */
function segmentsDEcriture(lexique: Lexique, renommage: Renommage, categorie: CategorieDeNom): number[] {
  return segmentsModifies(renommage).filter((rang) => categorieDuSegment(lexique, renommage, rang) === categorie);
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

/** Les noms (identifiants) où la suite de mots apparaît, chacun une fois. */
function nomsEmployant(lexique: Lexique, cle: string): string[] {
  const suite = motsDeLaCle(cle);
  if (suite.length === 0) return [];
  const ids = new Set<string>();
  for (const occurrence of lexique.occurrences.get(suite[0]) ?? []) {
    if (suite.length > 1) {
      const nom = lexique.noms.get(occurrence.nomId);
      if (!nom) continue;
      const mots = motsDuSegment(lexique, nom.nom.split('/')[occurrence.rangSegment] ?? '');
      if (!contientLaSuite(mots, suite, occurrence.rangMot)) continue;
    }
    ids.add(occurrence.nomId);
  }
  return [...ids];
}

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
  const emploi = (cle: string): readonly string[] => unique(`emploi:${cle}`, () => nomsEmployant(lexique, cle));

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

  /** Un nom qui emploie déjà le terme : il ne change pas, le segment du terme est marqué. */
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
    let premier: LigneVue | null = null;
    for (const nom of lexique.noms.values()) {
      if (nom.categorie !== 'variables' || (categorie === 'groupes' && !nom.categoriesDesSegments?.includes('groupes'))) continue;
      total++;
      if (!premier) {
        const rang = categorie === 'groupes' ? nom.categoriesDesSegments!.indexOf('groupes') : nom.nom.split('/').length - 1;
        premier = { id: nom.id, ancien: nom.nom, nouveau: nom.nom, marques: [rang], aussi: [] };
      }
    }
    const concernes = entree.resultat.renommages.filter((renommage) => (renommage.regles as readonly string[]).includes(cle));
    const exemple = concernes.length > 0
      ? ligneDuNom(concernes[0], marquesDeLaRegle(concernes[0], cle), [])
      : premier;
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
      const categorie = rang === undefined ? null : categorieDuSegment(lexique, renommage, rang);
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
      const journal = regles.journal;
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
        dernierRenommage: journal && journal.renommages.length > 0 ? { nombre: journal.renommages.length, heure: journal.heure } : null,
      };
    });
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

  /** Le statut d'un terme et ce qu'il remplace, d'après les règles du fichier. */
  function entreeDuTerme(cle: string): Omit<TermeDeListe, 'mot' | 'nombre' | 'trouve'> {
    const { ucm, ecartes, remplaceesParUcm, personnalises, remplaceesParPerso } = table();
    const perso = personnalises.get(cle);
    const gardeParUcm = ucm.get(cle);
    if (ecartes.has(cle)) return { origine: 'ucm', statut: 'ecart', remplace: [], avec: null };
    if (gardeParUcm) return { origine: 'ucm', statut: 'regle', remplace: [...new Set([...gardeParUcm.formes, ...(perso?.remplace ?? [])])], avec: null };
    if (perso) return { origine: 'personnalise', statut: 'regle', remplace: [...perso.remplace], avec: null };
    const parUcm = remplaceesParUcm.get(cle);
    if (parUcm) return { origine: 'ucm', statut: 'regle', remplace: [], avec: parUcm };
    const parPerso = remplaceesParPerso.get(cle);
    if (parPerso) return { origine: 'personnalise', statut: 'regle', remplace: [], avec: parPerso };
    const enQuestion = termesEnQuestion().get(cle);
    if (enQuestion) return { origine: null, statut: 'a-trancher', remplace: [], avec: enQuestion.avec };
    return { origine: null, statut: 'sans-regle', remplace: [], avec: null };
  }

  const listeDesTermes = (): readonly TermeDeListe[] => unique('liste', () => {
    const { ucm, ecartes, remplaceesParUcm, personnalises, remplaceesParPerso } = table();
    const cles = new Set<string>();
    for (const mot of lexique.occurrences.keys()) if (/\p{L}/u.test(mot)) cles.add(mot);
    for (const cle of [...personnalises.keys(), ...ecartes.keys()]) cles.add(cle);
    for (const cle of [...ucm.keys(), ...remplaceesParUcm.keys(), ...remplaceesParPerso.keys()]) {
      if (!cles.has(cle) && emploi(cle).length > 0) cles.add(cle);
    }
    for (const terme of ucm.values()) {
      if (!cles.has(terme.cle) && terme.formes.some((forme) => emploi(forme).length > 0)) cles.add(terme.cle);
    }
    // Un terme remplacé n'a pas de ligne : sa référence le porte dans `remplace`.
    return [...cles].map((cle): TermeDeListe => ({ mot: cle, nombre: emploi(cle).length, ...entreeDuTerme(cle), trouve: null }))
      .filter((terme) => !(terme.statut === 'regle' && terme.avec !== null))
      .sort((a, b) => b.nombre - a.nombre || comparer(a.mot, b.mot));
  });

  const aUneRegle = (terme: TermeDeListe): boolean => terme.statut === 'regle' || terme.statut === 'ecart';

  function termes(requete: RequeteDeTermes): PageDeTermes {
    const toutes = listeDesTermes();
    const recherche = requete.recherche.trim().toLowerCase();
    const retenues: TermeDeListe[] = [];
    for (const terme of toutes) {
      if (requete.filtre !== 'tous' && aUneRegle(terme) !== (requete.filtre === 'avec-regle')) continue;
      if (recherche === '' || terme.mot.includes(recherche)) { retenues.push(terme); continue; }
      const variante = terme.remplace.find((forme) => forme.includes(recherche));
      if (variante !== undefined) retenues.push({ ...terme, trouve: variante });
    }
    const avecRegle = toutes.filter(aUneRegle).length;
    return {
      termes: retenues.slice(requete.debut, requete.debut + TAILLE_DE_PAGE),
      total: retenues.length,
      comptes: { tous: toutes.length, avecRegle, sansRegle: toutes.length - avecRegle },
    };
  }

  function fiche(mot: string): FicheVue {
    const cle = mot.trim().toLowerCase();
    const { ucm, ecartes, personnalises } = table();
    const dedans = entreeDuTerme(cle);
    const ucmDuTerme = ucm.get(cle) ?? ecartes.get(cle);
    const perso = personnalises.get(cle);
    const formes = [...(ucm.get(cle)?.formes ?? []).map((forme) => ({ forme, ucm: true })), ...(perso?.remplace ?? []).map((forme) => ({ forme, ucm: false }))];
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
      origine: dedans.origine,
      categorieUcm: ucmDuTerme && ucmDuTerme.registre !== '' ? ucmDuTerme.registre : null,
      definition: ucmDuTerme?.definition ?? perso?.definition ?? null,
      remplace: formes.map(({ forme, ucm: deLUcm }) => ({ mot: forme, nombre: emploi(forme).length, ucm: deLUcm })),
      emploi: {
        nombre: ids.length,
        exemples: ids.slice(0, EXEMPLES_D_EMPLOI).map((id) => ligneDeNom(id, motsDeLaCle(cle))).filter((ligne): ligne is LigneVue => ligne !== null),
      },
      aRenommer: { nombre: dues.length, exemples: dues.slice(0, EXEMPLES_D_EMPLOI) },
      ecart: ecartes.has(cle),
      voulu: regles.voulus.includes(voulu),
      distincts: regles.distincts.flatMap(([a, b]) => (a.toLowerCase() === cle ? [b] : b.toLowerCase() === cle ? [a] : [])),
      question: termesEnQuestion().get(cle)?.question ?? null,
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

  return { bilan, lignes, termes, fiche, identifiants };
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

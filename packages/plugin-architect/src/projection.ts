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

/** Le rang du premier segment du nom qui contient la suite de mots, ou -1. */
function rangDeLaSuite(lexique: Lexique, nom: string, suite: Mots): number {
  const voulue = motsEnMinuscules(suite);
  const segments = nom.split('/');
  for (let rang = 0; rang < segments.length; rang++) {
    const mots = motsDuSegment(lexique, segments[rang]);
    for (let debut = 0; debut < mots.length; debut++) if (contientLaSuite(mots, voulue, debut)) return rang;
  }
  return -1;
}

/** Le rang du premier segment qui contient l'un des mots, ou -1. */
function rangDUnDesMots(lexique: Lexique, nom: string, mots: readonly string[]): number {
  const voulus = new Set(mots.map((mot) => mot.toLowerCase()));
  const segments = nom.split('/');
  for (let rang = 0; rang < segments.length; rang++) {
    if (motsDuSegment(lexique, segments[rang]).some((mot) => voulus.has(mot.toLowerCase()))) return rang;
  }
  return -1;
}

/** Un chemin découpé autour du segment `rang` ; le nom d'une collection reste entier. */
function ligneAutour(id: string, nom: string, rang: number, collection: boolean, aussi: readonly string[]): LigneVue {
  if (collection) return { id, avant: '', terme: nom, apres: '', aussi };
  const segments = nom.split('/');
  const cible = Math.min(Math.max(rang, 0), segments.length - 1);
  return {
    id, aussi,
    avant: segments.slice(0, cible).map((segment) => `${segment}/`).join(''),
    terme: segments[cible],
    apres: segments.slice(cible + 1).map((segment) => `/${segment}`).join(''),
  };
}

function categorieDuSegment(lexique: Lexique, renommage: Renommage, rang: number): CategorieDeNom {
  return lexique.noms.get(renommage.id)?.categoriesDesSegments?.[rang] ?? renommage.categorie;
}

/** Le premier segment de la catégorie dont l'écriture change, ou -1. */
function segmentDEcriture(lexique: Lexique, renommage: Renommage, categorie: CategorieDeNom): number {
  const avant = renommage.ancienNom.split('/');
  const apres = renommage.nouveauNom.split('/');
  for (let rang = 0; rang < avant.length; rang++) {
    if (avant[rang] !== apres[rang] && categorieDuSegment(lexique, renommage, rang) === categorie) return rang;
  }
  return -1;
}

function premierSegmentModifie(renommage: Renommage): number {
  const avant = renommage.ancienNom.split('/');
  const apres = renommage.nouveauNom.split('/');
  return Math.max(0, avant.findIndex((segment, rang) => segment !== apres[rang]));
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

function analyser(entree: EntreeDeProjection): Analyse {
  const personnalises = new Set(entree.regles.termes.map((terme) => cleDeTerme(terme.terme)));
  const clesDe = new Map<string, readonly string[]>();
  const changements = new Map<string, ReadonlyMap<string, ChangementDeTerme>>();
  const origines = new Map<string, OrigineDuTerme>();
  const emploi = new Map<string, number>();
  for (const renommage of entree.resultat.renommages) {
    const cles = renommage.regles.length > 0 ? [...new Set(renommage.regles)] : [`ecriture:${renommage.categorie}`];
    clesDe.set(renommage.id, cles);
    for (const cle of cles) emploi.set(cle, (emploi.get(cle) ?? 0) + 1);
    if (!cles.some(estTerme)) continue;
    const associes = changementsParCle(renommage);
    changements.set(renommage.id, associes);
    for (const [cle, changement] of associes) if (origines.get(cle) !== 'ucm') origines.set(cle, changement.origine);
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
  return { ordre, origines, principal, groupesDe, propres, secondaires, changements };
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

  function ligneDuRenommage(renommage: Renommage, cle: string): LigneVue {
    const { groupesDe, changements } = analyse();
    const aussi = (groupesDe.get(renommage.id) ?? []).filter((autre) => autre !== cle);
    const collection = renommage.categorie === 'collections';
    let rang = -1;
    if (!collection) {
      if (estTerme(cle)) {
        const changement = changements.get(renommage.id)?.get(cle);
        rang = changement ? rangDeLaSuite(lexique, renommage.ancienNom, changement.avant) : -1;
      } else if (cle.startsWith('ecriture:')) {
        rang = segmentDEcriture(lexique, renommage, categorieDeLEcriture(cle));
      }
      if (rang < 0) rang = premierSegmentModifie(renommage);
    }
    return ligneAutour(renommage.id, renommage.ancienNom, rang, collection, aussi);
  }

  function ligneDeNom(id: string, mots: readonly string[], toutes = false): LigneVue | null {
    const nom = lexique.noms.get(id);
    if (!nom) return null;
    const rang = toutes ? rangDUnDesMots(lexique, nom.nom, mots) : rangDeLaSuite(lexique, nom.nom, mots);
    return ligneAutour(id, nom.nom, rang < 0 ? 0 : rang, nom.categorie === 'collections', []);
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
          cibleCommune: (question.cibleAlias !== undefined && entree.nomDeLaCible?.(question.cibleAlias)) || null,
        };
      case 'ecriture-du-terme':
        return {
          type: 'ecriture-du-terme', cle: question.cle, indice: question.indice, terme: termeVue(question.terme),
          proposition: [...question.proposition], reference: question.reference ?? null,
        };
      case 'echelle':
        return {
          type: 'echelle', cle: question.cle, formes: question.formes, nombres: question.nombres, propose: question.propose,
          exemples: [
            question.exemples[0] === null ? null : ligneDeNom(question.exemples[0], question.formes[0], true),
            question.exemples[1] === null ? null : ligneDeNom(question.exemples[1], question.formes[1], true),
          ],
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
      } else if (question.type === 'echelle') {
        question.formes[0].forEach((forme, rang) => {
          const autre = question.formes[1][rang] ?? null;
          poser(forme, question.cle, autre);
          if (autre !== null) poser(autre, question.cle, forme);
        });
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
        premier = ligneAutour(nom.id, nom.nom, rang, false, []);
      }
    }
    const concernes = entree.resultat.renommages.filter((renommage) => (renommage.regles as readonly string[]).includes(cle));
    const exemple = concernes.length > 0
      ? ligneAutour(concernes[0].id, concernes[0].ancienNom, Math.max(0, segmentDEcriture(lexique, concernes[0], categorie)), false, [])
      : premier;
    return { convention: conventionDe(categorie), suivent: Math.max(0, total - concernes.length), total, exemple };
  }

  function groupeVue(cle: string): GroupeVue {
    const { propres, origines, changements } = analyse();
    const renommages = propres.get(cle) ?? [];
    const variables = renommages.filter((renommage) => renommage.categorie !== 'collections').length;
    const collections = renommages.length - variables;
    const apercu = renommages.slice(0, TAILLE_DE_L_APERCU).map((renommage) => ligneDuRenommage(renommage, cle));
    let regle: RegleVue;
    let avant = '';
    let apres = '';
    if (estTerme(cle)) {
      regle = { sorte: 'terme', origine: origines.get(cle) ?? 'ucm' };
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
        const rang = segmentDEcriture(lexique, renommage, categorie);
        if (rang < 0) continue;
        const paire = { avant: renommage.ancienNom.split('/')[rang], apres: renommage.nouveauNom.split('/')[rang], nombre: 0 };
        const connue = comptes.get(`${paire.avant}\n${paire.apres}`) ?? paire;
        connue.nombre++;
        comptes.set(`${paire.avant}\n${paire.apres}`, connue);
      }
      const gagnante = [...comptes.values()].sort((a, b) => b.nombre - a.nombre || comparer(a.avant, b.avant))[0];
      if (gagnante) ({ avant, apres } = gagnante);
    }
    return {
      cle, regle, avant, apres, autres: Math.max(0, renommages.length - apercu.length), variables, collections,
      nouveau: !premierLancement() && !regles.vus.includes(cle), apercu,
    };
  }

  const premierLancement = (): boolean => regles.ecriture === undefined || regles.ecritureDeLaV1;

  function bloques(): BloqueVue[] {
    const collections = new Map(entree.inventaire.entrees.filter((e) => e.cible.type === 'collection').map((e) => [(e.cible as { collectionId: string }).collectionId, e.nom.nom]));
    return entree.resultat.collisions.flatMap((collision) => collision.ids.flatMap((id) => {
      const nom = lexique.noms.get(id);
      if (!nom || nom.nom === collision.nom) return [];
      return [{ avant: nom.nom, apres: collision.nom, collection: collision.categorie === 'collections' ? '' : collections.get(collision.portee) ?? '' }];
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
  function entreeDuTerme(cle: string): Omit<TermeDeListe, 'mot' | 'nombre'> {
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
    return [...cles].map((cle): TermeDeListe => ({ mot: cle, nombre: emploi(cle).length, ...entreeDuTerme(cle) }))
      .sort((a, b) => b.nombre - a.nombre || comparer(a.mot, b.mot));
  });

  const aUneRegle = (terme: TermeDeListe): boolean => terme.statut === 'regle' || terme.statut === 'ecart';

  function termes(requete: RequeteDeTermes): PageDeTermes {
    const toutes = listeDesTermes();
    const recherche = requete.recherche.trim().toLowerCase();
    const retenues = toutes.filter((terme) =>
      (requete.filtre === 'tous' || aUneRegle(terme) === (requete.filtre === 'avec-regle')) && terme.mot.includes(recherche));
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
    const rang = rangDeLaSuite(simulee.lexique, premier.ancienNom, motsDeLaCle(terme.avant));
    exemple = ligneAutour(premier.id, premier.ancienNom, rang < 0 ? premierSegmentModifie(premier) : rang, premier.categorie === 'collections', []);
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

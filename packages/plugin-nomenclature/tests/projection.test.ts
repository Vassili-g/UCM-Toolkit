/** La projection : groupes, lignes, sélection, pages, questions, termes, fiche et effets, sur des calculs réels du kit. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  commencerLexique, indexerVocabulaire, normaliserLeLexique,
  type ConventionsParCategorie, type Lexique, type NomLu, type Question, type ResultatDesQuestions, type TermePersonnalise,
} from '@ucm-kit/core/referentiel';
import { idsNonRenommables, inventaireSelonLaProtection, palettesLibres, type EntreeInventaire, type Inventaire } from '@ucm-kit/core/nommage';
import type { EtatDeLaMarque } from '@ucm-kit/core/protocoles';
import { PLACES_DE_TERMES, TYPES_DE_TERMES, type EcritureChoisie, type PlaceDuTerme, type TermeDeListe, type TypeDeTerme } from '../src/messages';
import { conflitVue, effetDEcriture, effetDeTerme, LIGNES_PAR_SECTION, projeter, TAILLE_DE_L_APERCU, TAILLE_DE_PAGE, type EntreeDeProjection, type PageDeTermes, type RequeteDeTermes } from '../src/projection';
import { reglesVides, type ReglesDuFichier } from '../src/regles';

const minusculesTirets = { casse: 'minuscules', separateur: 'tiret' } as const;
const ecritureParDefaut: EcritureChoisie = { groupes: minusculesTirets, variables: minusculesTirets };

interface Variable { readonly id: string; readonly nom: string; readonly collection?: string; readonly protegee?: boolean; readonly indecidable?: boolean; readonly alias?: string }
interface Fichier { readonly collections: readonly (readonly [string, string])[]; readonly variables: readonly Variable[]; readonly marque?: EtatDeLaMarque }

function lexiqueDe(noms: readonly NomLu[]): Lexique {
  const preparation = commencerLexique();
  preparation.ajouter(noms);
  const calcul = preparation.terminer();
  let etape = calcul.next();
  while (!etape.done) etape = calcul.next();
  return etape.value;
}

function inventaireDe(fichier: Fichier): { readonly inventaire: Inventaire; readonly noms: NomLu[] } {
  const entrees: EntreeInventaire[] = [];
  for (const [id, nom] of fichier.collections) {
    entrees.push({ nom: { id: `c:${id}`, categorie: 'collections', portee: 'document', nom }, cible: { type: 'collection', collectionId: id }, renommable: true, protegee: false });
  }
  for (const variable of fichier.variables) {
    const collectionId = variable.collection ?? fichier.collections[0][0];
    const segments = variable.nom.split('/');
    entrees.push({
      nom: {
        id: variable.id, categorie: 'variables', portee: `c:${collectionId}`, nom: variable.nom,
        ...(segments.length > 1 ? { categoriesDesSegments: segments.map((_, rang) => (rang < segments.length - 1 ? 'groupes' as const : null)) } : {}),
        ...(variable.alias ? { cibleAlias: variable.alias } : {}),
      },
      cible: { type: 'variable', variableId: variable.id, collectionId }, renommable: true, protegee: variable.protegee === true,
      ...(variable.indecidable === true ? { indecidable: true as const } : {}),
    });
  }
  return { inventaire: { entrees, ...(fichier.marque ? { marque: fichier.marque } : {}) }, noms: entrees.map((entree) => entree.nom) };
}

interface Options {
  readonly termes?: readonly TermePersonnalise[];
  readonly ecarts?: readonly string[];
  readonly ecriture?: EcritureChoisie;
  readonly regles?: Partial<ReglesDuFichier>;
  readonly questions?: ResultatDesQuestions;
  readonly lexique?: Lexique;
}

function calculer(fichier: Fichier, options: Options = {}): EntreeDeProjection {
  const { inventaire, noms } = inventaireDe(fichier);
  const lexique = options.lexique ?? lexiqueDe(noms);
  const ecriture = options.ecriture ?? ecritureParDefaut;
  const conventions: ConventionsParCategorie = { ...ecriture, collections: minusculesTirets };
  const { index } = indexerVocabulaire({ personnalises: options.termes ?? [], ecartsUcm: options.ecarts ?? [] });
  const protegees = inventaire.entrees.filter((entree) => entree.protegee || entree.indecidable === true).map((entree) => entree.nom.id);
  const resultat = normaliserLeLexique(lexique, conventions, index, { nonRenommables: protegees });
  return {
    generation: 3, lexique, resultat, ecriture, inventaire,
    questions: options.questions ?? { questions: [], autres: [] },
    regles: { ...reglesVides, ecriture, ecritureDeLaV1: false, termes: options.termes ?? [], ecartsUcm: options.ecarts ?? [], ...options.regles },
  };
}

const variables = (...paires: readonly (readonly [string, string])[]): Variable[] => paires.map(([id, nom]) => ({ id, nom }));

/** Cinq renommages `press` → `pressed`, dont trois écrivent aussi les groupes. */
const fichierDeBase: Fichier = {
  collections: [['c1', 'components'], ['c2', 'Color Brands']],
  variables: [
    ...variables(
      ['v1', 'Button/press/fontSize'], ['v2', 'Button/press/padding'], ['v3', 'card/disable/fontSize'], ['v4', 'card/hover/gap'],
      ['v5', 'card/outline/gap'], ['v6', 'Tile/hover/space'], ['v7', 'Font Size'], ['v8', 'font-size'],
      ['v9', 'link/press/colour'], ['v10', 'chip/press/color'], ['v11', 'tag/press/color'], ['v13', 'tile/hover/fontSize'],
    ),
    { id: 'v12', nom: 'Palette/press/Brand', collection: 'c2' },
  ],
};

const outlined: TermePersonnalise = { terme: ['outlined'], remplace: [['outline']] };

test('les groupes suivent l’ordre terme UCM, terme personnalisé, collection, écriture', () => {
  const bilan = projeter(calculer(fichierDeBase, { termes: [outlined] })).bilan();
  const cles = bilan.groupes.map((groupe) => groupe.cle);
  assert.deepEqual(cles, ['terme:pressed', 'terme:disabled', 'terme:outlined', 'collection:c:c2', 'ecriture:groupes', 'ecriture:variables']);
  assert.deepEqual(bilan.groupes.map((groupe) => groupe.regle), [
    { sorte: 'terme', origine: 'ucm', categorie: null }, { sorte: 'terme', origine: 'ucm', categorie: null }, { sorte: 'terme', origine: 'personnalise', categorie: null },
    { sorte: 'collection' },
    { sorte: 'ecriture', categorie: 'groupes', convention: minusculesTirets },
    { sorte: 'ecriture', categorie: 'variables', convention: minusculesTirets },
  ]);
});

test('un renommage compte dans le groupe de sa première règle et apparaît ailleurs par aussi', () => {
  const projection = projeter(calculer(fichierDeBase, { termes: [outlined] }));
  const bilan = projection.bilan();
  const parCle = new Map(bilan.groupes.map((groupe) => [groupe.cle, groupe]));
  const pressed = parCle.get('terme:pressed')!;
  assert.equal(pressed.variables, 6);
  assert.equal(pressed.collections, 0);
  assert.deepEqual([pressed.avant, pressed.apres], ['press', 'pressed']);
  const total = bilan.groupes.reduce((somme, groupe) => somme + groupe.variables + groupe.collections, 0);
  assert.equal(total, new Set(calculer(fichierDeBase, { termes: [outlined] }).resultat.renommages.map((renommage) => renommage.id)).size);

  const v1 = pressed.apercu.find((ligne) => ligne.id === 'v1')!;
  assert.deepEqual(v1, { id: 'v1', ancien: 'Button/press/fontSize', nouveau: 'button/pressed/font-size', marques: [1], aussi: ['ecriture:groupes', 'ecriture:variables'] });
  const dansLEcriture = projection.lignes('ecriture:variables', 0).lignes.find((ligne) => ligne.id === 'v1')!;
  assert.deepEqual(dansLEcriture, { id: 'v1', ancien: 'Button/press/fontSize', nouveau: 'button/pressed/font-size', marques: [2], aussi: ['terme:pressed', 'ecriture:groupes'] });
});

test('un groupe sans renommage propre n’est pas un groupe', () => {
  const projection = projeter(calculer({ collections: [['c1', 'components']], variables: variables(['v1', 'Button/press/padding']) }));
  assert.deepEqual(projection.bilan().groupes.map((groupe) => groupe.cle), ['terme:pressed']);
  assert.deepEqual(projection.lignes('ecriture:groupes', 0), { lignes: [], total: 0 });
});

test('l’aperçu porte trois lignes et autres le reste du groupe', () => {
  const pressed = projeter(calculer(fichierDeBase)).bilan().groupes[0];
  assert.equal(TAILLE_DE_L_APERCU, 3);
  assert.equal(pressed.apercu.length, 3);
  assert.equal(pressed.autres, pressed.variables + pressed.collections - 3);
});

test('une collection reconnue forme un groupe sans variable', () => {
  const groupe = projeter(calculer(fichierDeBase)).bilan().groupes.find((autre) => autre.cle === 'collection:c:c2')!;
  assert.equal(groupe.variables, 0);
  assert.equal(groupe.collections, 1);
  assert.deepEqual([groupe.avant, groupe.apres], ['Color Brands', 'brands']);
  assert.deepEqual(groupe.apercu, [{ id: 'c:c2', ancien: 'Color Brands', nouveau: 'brands', marques: [0], aussi: [] }]);
  assert.equal(groupe.autres, 0);
});

test('un groupe d’écriture montre le segment réécrit', () => {
  const groupe = projeter(calculer(fichierDeBase)).bilan().groupes.find((autre) => autre.cle === 'ecriture:variables')!;
  assert.deepEqual([groupe.avant, groupe.apres], ['fontSize', 'font-size']);
  assert.deepEqual(groupe.apercu[0], { id: 'v13', ancien: 'tile/hover/fontSize', nouveau: 'tile/hover/font-size', marques: [2], aussi: [] });
});

test('nouveau suit les groupes déjà vus, sauf au premier lancement', () => {
  const connu = projeter(calculer(fichierDeBase, { regles: { vus: ['terme:pressed'] } })).bilan();
  assert.equal(connu.premierLancement, false);
  assert.deepEqual(connu.groupes.map((groupe) => groupe.nouveau), [false, true, true, true, true]);
  const premier = projeter(calculer(fichierDeBase, { regles: { ecriture: undefined } })).bilan();
  assert.equal(premier.premierLancement, true);
  assert.ok(premier.groupes.every((groupe) => !groupe.nouveau));
  const reprise = projeter(calculer(fichierDeBase, { regles: { ecritureDeLaV1: true } })).bilan();
  assert.equal(reprise.premierLancement, true);
});

test('une page de lignes porte cinquante entrées, les renommages propres d’abord', () => {
  const beaucoup = Array.from({ length: 120 }, (_, rang) => ({ id: `n${rang}`, nom: `x${rang}/press/gap` }));
  const projection = projeter(calculer({ collections: [['c1', 'components']], variables: [...beaucoup, { id: 'z', nom: 'Z/hover/gap' }] }));
  const groupe = projection.bilan().groupes.find((autre) => autre.cle === 'terme:pressed')!;
  assert.equal(groupe.variables, 120);
  assert.equal(groupe.autres, 117);
  const pages = [0, 50, 100, 150].map((debut) => projection.lignes('terme:pressed', debut));
  assert.deepEqual(pages.map((page) => page.lignes.length), [50, 50, 20, 0]);
  assert.ok(pages.every((page) => page.total === 120));
  assert.equal(TAILLE_DE_PAGE, 50);
  assert.equal(new Set(pages.flatMap((page) => page.lignes.map((ligne) => ligne.id))).size, 120);
  assert.deepEqual(pages[0].lignes[0], { id: 'n0', ancien: 'x0/press/gap', nouveau: 'x0/pressed/gap', marques: [1], aussi: [] });
});

test('la sélection coche le groupe principal sans exclusion, plus les inclus', () => {
  const entree = calculer(fichierDeBase);
  const projection = projeter(entree);
  const tous = entree.resultat.renommages.map((renommage) => renommage.id);
  assert.deepEqual(projection.identifiants({ groupes: [], exclus: [], inclus: [] }), []);
  assert.deepEqual(projection.identifiants({ groupes: ['terme:disabled'], exclus: [], inclus: [] }), ['v3']);
  // v1 appartient à terme:pressed : cocher ses groupes secondaires ne le coche pas.
  assert.deepEqual(projection.identifiants({ groupes: ['ecriture:groupes', 'ecriture:variables'], exclus: [], inclus: [] }).includes('v1'), false);
  const pressed = projection.identifiants({ groupes: ['terme:pressed'], exclus: ['v1'], inclus: ['v3', 'inconnu'] });
  assert.equal(pressed.includes('v1'), false);
  assert.equal(pressed.includes('v2'), true);
  assert.equal(pressed.includes('v3'), true);
  assert.equal(pressed.includes('inconnu'), false);
  assert.deepEqual(projection.identifiants({ groupes: projection.bilan().groupes.map((groupe) => groupe.cle), exclus: [], inclus: [] }), tous);
});

test('les noms qui entrent en collision sont bloqués avec le nom de leur collection', () => {
  const bilan = projeter(calculer(fichierDeBase)).bilan();
  assert.deepEqual(bilan.bloques, [{ avant: 'Font Size', apres: 'font-size', collection: 'components' }]);
});

test('les collections de l’inventaire, les noms protégés et le dernier renommage', () => {
  const fichier: Fichier = {
    collections: [['c1', 'components'], ['c2', 'primitives'], ['c3', 'Color Brands']],
    variables: [{ id: 'a', nom: 'Button/press/gap' }, { id: 'b', nom: 'colors/Red', collection: 'c2', protegee: true }, { id: 'c', nom: 'colors/Blue', collection: 'c2', protegee: true }],
  };
  const journal = { heure: '14:32', renommages: [{ type: 'variable', id: 'a', ancienNom: 'x', nouveauNom: 'y' }, { type: 'variable', id: 'b', ancienNom: 'x', nouveauNom: 'y' }] } as const;
  const bilan = projeter(calculer(fichier, { regles: { collectionsExclues: ['c2'], journal } })).bilan();
  assert.deepEqual(bilan.collections, [
    { id: 'c1', nom: 'components', nombre: 1, analysee: true, protegees: 0 },
    { id: 'c2', nom: 'primitives', nombre: 2, analysee: false, protegees: 2 },
    { id: 'c3', nom: 'Color Brands', nombre: 0, analysee: true, protegees: 0 },
  ]);
  assert.equal(bilan.proteges, 0);
  assert.deepEqual(bilan.dernierRenommage, {
    nombre: 2, reviennent: 0, heure: '14:32',
    collections: [
      { id: 'c1', nom: 'components', exclue: false, lignes: [{ type: 'variable', aujourdhui: 'Button/press/gap', ancien: 'x', sort: 'change-depuis' }] },
      { id: 'c2', nom: 'primitives', exclue: true, lignes: [{ type: 'variable', aujourdhui: 'colors/Red', ancien: 'x', sort: 'change-depuis' }] },
    ],
  });
  assert.equal(bilan.generation, 3);
  assert.equal(projeter(calculer(fichier)).bilan().proteges, 2);
  assert.equal(projeter(calculer(fichier)).bilan().dernierRenommage, null);
  assert.deepEqual(bilan.ecriture.collections, { reconnues: 3, total: 3 });
});

test('l’exemple d’une écriture suivie est le chemin le plus complet dont chaque segment a une lettre', () => {
  const fichier: Fichier = {
    collections: [['c1', 'theme']],
    variables: variables(['a', 'sizing/0'], ['b', 'card/gap'], ['c', 'surface/brand/primary/background'], ['d', 'one/two/three/four/five']),
  };
  const { ecriture } = projeter(calculer(fichier)).bilan();
  assert.deepEqual(ecriture.groupes.exemple, { id: 'c', ancien: 'surface/brand/primary/background', nouveau: 'surface/brand/primary/background', marques: [0, 1, 2], aussi: [] });
  assert.deepEqual(ecriture.variables.exemple, { id: 'c', ancien: 'surface/brand/primary/background', nouveau: 'surface/brand/primary/background', marques: [3], aussi: [] });
});

test('un fichier sans variable locale se signale', () => {
  const bilan = projeter(calculer({ collections: [['c1', 'components']], variables: [] })).bilan();
  assert.equal(bilan.sansVariableLocale, true);
  assert.equal(projeter(calculer(fichierDeBase)).bilan().sansVariableLocale, false);
});

test('les lignes d’écriture comptent les noms qui suivent déjà l’écriture', () => {
  const fichier: Fichier = {
    collections: [['c1', 'components']],
    variables: variables(['a', 'button/Sizes/fontSize'], ['b', 'button/sizes/gap'], ['c', 'plain'], ['d', 'card/hover/gap']),
  };
  const { ecriture } = projeter(calculer(fichier)).bilan();
  assert.equal(ecriture.groupes.total, 3);
  assert.equal(ecriture.groupes.suivent, 2);
  assert.deepEqual(ecriture.groupes.exemple, { id: 'a', ancien: 'button/Sizes/fontSize', nouveau: 'button/size/font-size', marques: [1], aussi: [] });
  assert.equal(ecriture.variables.total, 4);
  assert.equal(ecriture.variables.suivent, 3);
  assert.deepEqual(ecriture.variables.exemple, { id: 'a', ancien: 'button/Sizes/fontSize', nouveau: 'button/size/font-size', marques: [2], aussi: [] });
  assert.deepEqual(ecriture.variables.convention, minusculesTirets);
});

// Les questions

const termeEnQuestion = (mot: string, nombre: number, exemples: readonly string[], ucm = false) => ({ mot, nombre, exemples, ucm });
const questionsDeTest: readonly Question[] = [
  { type: 'paire', cle: 'paire:gap|space', indice: 'synonymes', termes: [termeEnQuestion('gap', 3, ['v4', 'v5']), termeEnQuestion('space', 1, ['v6'], true)], propose: 1, score: 5, cibleAlias: 'ALIAS' },
  { type: 'ecriture-du-terme', cle: 'ecriture-du-terme:faute:color|colour', indice: 'faute', terme: termeEnQuestion('colour', 1, ['v9']), proposition: ['color'], reference: { mot: 'color', nombre: 3 }, score: 3 },
  { type: 'collection', cle: 'collection:c1', collectionId: 'c1', nom: 'Couleurs', nombre: 34, proposee: 'brands', score: 4 },
  { type: 'collection', cle: 'collection:c2', collectionId: 'c2', nom: 'Typo', nombre: 3, score: 4 },
];

test('les questions deviennent des vues, les questions mises de côté vont à plusTard', () => {
  const questions: ResultatDesQuestions = {
    questions: questionsDeTest,
    autres: [{ ...questionsDeTest[3], cle: 'collection:c3' } as Question, { ...questionsDeTest[3], cle: 'collection:c4' } as Question],
  };
  const entree = { ...calculer(fichierDeBase, { questions, regles: { plusTard: ['collection:c2', 'collection:c4'] } }), nomDeLaCible: (id: string) => (id === 'ALIAS' ? 'theme/surface' : undefined) };
  const bilan = projeter(entree).bilan();
  assert.equal(bilan.autresPistes, 1);
  assert.deepEqual(bilan.plusTard.map((question) => question.cle), ['collection:c2']);
  assert.deepEqual(bilan.questions.map((question) => question.cle), ['paire:gap|space', 'ecriture-du-terme:faute:color|colour', 'collection:c1']);

  const [paire, faute, collection] = bilan.questions;
  assert.deepEqual(paire, {
    type: 'paire', cle: 'paire:gap|space', indice: 'synonymes', propose: 1, cibleCommune: 'theme/surface',
    termes: [
      { mot: 'gap', nombre: 3, ucm: false, exemples: [{ id: 'v4', ancien: 'card/hover/gap', nouveau: 'card/hover/gap', marques: [2], aussi: [] }, { id: 'v5', ancien: 'card/outline/gap', nouveau: 'card/outline/gap', marques: [2], aussi: [] }] },
      { mot: 'space', nombre: 1, ucm: true, exemples: [{ id: 'v6', ancien: 'Tile/hover/space', nouveau: 'Tile/hover/space', marques: [2], aussi: [] }] },
    ],
    effet: { id: 'v4', ancien: 'card/hover/gap', nouveau: 'card/hover/space', marques: [2], aussi: [] },
  } satisfies typeof paire);
  assert.deepEqual(faute.type === 'ecriture-du-terme' && [faute.terme.exemples[0].ancien, faute.terme.exemples[0].marques], ['link/press/colour', [2]]);
  assert.deepEqual(faute.type === 'ecriture-du-terme' && faute.effet, { id: 'v9', ancien: 'link/press/colour', nouveau: 'link/press/color', marques: [2], aussi: [] });
  assert.deepEqual(faute.type === 'ecriture-du-terme' && [faute.proposition, faute.reference], [['color'], { mot: 'color', nombre: 3 }]);
  assert.deepEqual(collection, { type: 'collection', cle: 'collection:c1', nom: 'Couleurs', nombre: 34, proposee: 'brands' });
  assert.equal(bilan.plusTard[0].type === 'collection' && bilan.plusTard[0].proposee, null);
});

test('sans nom de cible, la paire n’a pas de cible commune', () => {
  const bilan = projeter(calculer(fichierDeBase, { questions: { questions: [questionsDeTest[0]], autres: [] } })).bilan();
  assert.equal(bilan.questions[0].type === 'paire' && bilan.questions[0].cibleCommune, null);
});

// La liste des termes et la fiche

const requete = (reste: Partial<RequeteDeTermes> = {}): RequeteDeTermes => ({ recherche: '', types: [], origines: [], places: [], tri: 'alpha', section: null, place: null, debut: 0, ...reste });
const premiers = (projection: ReturnType<typeof projeter>, reste: Partial<RequeteDeTermes> = {}) => projection.termes(requete(reste));
const aplatir = (page: PageDeTermes): TermeDeListe[] => page.sections.flatMap((section) => section.termes);

/** Tous les termes d'un type, page après page. */
function termesDuType(projection: ReturnType<typeof projeter>, type: TypeDeTerme, reste: Partial<RequeteDeTermes> = {}): TermeDeListe[] {
  const termes: TermeDeListe[] = [];
  for (let debut = 0; ; debut += TAILLE_DE_PAGE) {
    const [section] = projection.termes(requete({ ...reste, section: type, debut })).sections;
    termes.push(...section.termes);
    if (termes.length >= section.total) return termes;
  }
}

/** Tous les termes de la liste, section après section. */
const toutLeVocabulaire = (projection: ReturnType<typeof projeter>, reste: Partial<RequeteDeTermes> = {}): TermeDeListe[] =>
  TYPES_DE_TERMES.flatMap((type) => termesDuType(projection, type, reste));

const mots = (termes: readonly TermeDeListe[]): string[] => termes.map((terme) => terme.mot);
/** Les lignes d'un terme, une par place, les groupes d'abord : leurs types peuvent les ranger dans des sections différentes. */
const lignesDuTerme = (termes: readonly TermeDeListe[], mot: string): TermeDeListe[] =>
  termes.filter((terme) => terme.mot === mot).sort((a, b) => PLACES_DE_TERMES.indexOf(a.place) - PLACES_DE_TERMES.indexOf(b.place));

const fichierDesTermes: Fichier = {
  collections: [['c1', 'components']],
  variables: variables(
    ['a', 'button/press/gap'], ['b', 'button/pressed/gap'], ['c', 'button/disable/gap'], ['d', 'button/outline/space'],
    ['e', 'button/hover/space'], ['f', 'button/extra-small/space'],
  ),
};

test('la liste des termes dit le type, le statut, l’origine et ce que chaque terme remplace', () => {
  const projection = projeter(calculer(fichierDesTermes, {
    termes: [outlined], ecarts: ['disabled'],
    questions: { questions: [{ ...questionsDeTest[0], cle: 'paire:gap|space' } as Question], autres: [] },
  }));
  const liste = toutLeVocabulaire(projection);
  const parMot = new Map(liste.map((terme) => [terme.mot, terme]));
  assert.deepEqual(parMot.get('pressed'), { mot: 'pressed', place: 'groupes', forme: 'pressed', type: 'remplace', nature: null, origine: 'ucm', statut: 'regle', remplace: ['press'], avec: null, nombre: 2, trouve: null });
  assert.equal(parMot.has('press'), false);
  assert.deepEqual(parMot.get('outlined'), { mot: 'outlined', place: 'groupes', forme: 'outlined', type: 'remplace', nature: null, origine: 'personnalise', statut: 'regle', remplace: ['outline'], avec: null, nombre: 1, trouve: null });
  assert.equal(parMot.has('outline'), false);
  assert.deepEqual(parMot.get('disabled'), { mot: 'disabled', place: 'variables', forme: 'disabled', type: 'sans-regle', nature: null, origine: 'ucm', statut: 'ecart', remplace: [], avec: null, nombre: 0, trouve: null });
  assert.deepEqual(parMot.get('gap'), { mot: 'gap', place: 'variables', forme: 'gap', type: 'a-trancher', nature: null, origine: null, statut: 'a-trancher', remplace: [], avec: 'space', nombre: 3, trouve: null });
  assert.deepEqual(parMot.get('button'), { mot: 'button', place: 'groupes', forme: 'button', type: 'composant', nature: 'composant', origine: null, statut: 'sans-regle', remplace: [], avec: null, nombre: 6, trouve: null });
  assert.equal(parMot.has('extra-small'), false);
  assert.equal(parMot.has('hover'), true);
  const { comptes } = premiers(projection);
  for (const type of TYPES_DE_TERMES) assert.equal(comptes.types[type], liste.filter((terme) => terme.type === type).length, type);
  assert.equal(Object.values(comptes.types).reduce((somme, nombre) => somme + nombre, 0), liste.length);
  for (const place of PLACES_DE_TERMES) assert.equal(comptes.places[place], liste.filter((terme) => terme.place === place).length, place);
});

test('un terme réglé est « remplace » quand le fichier emploie une variante, « conforme » sinon ; une règle écartée est « sans règle »', () => {
  const fichier: Fichier = {
    collections: [['c1', 'components']],
    variables: variables(['a', 'card/press/gap'], ['b', 'card/pressed/gap'], ['c', 'card/wobble/gap'], ['d', 'card/disable/gap'], ['e', 'card/hover/gap']),
  };
  const projection = projeter(calculer(fichier, { termes: [{ terme: ['extra', 'small'], remplace: [['xs']] }], ecarts: ['disabled'] }));
  const liste = toutLeVocabulaire(projection);
  const type = new Map(liste.map((terme) => [terme.mot, terme.type]));
  assert.equal(type.get('pressed'), 'remplace', 'press est dans le fichier');
  assert.equal(type.get('wobble'), 'sans-regle', 'wobble n’a ni règle ni variante');
  assert.equal(type.get('hover'), 'conforme', 'hover est un terme UCM que le fichier écrit déjà ainsi');
  assert.equal(type.get('extra-small'), 'conforme', 'xs n’est pas dans le fichier');
  assert.equal(type.get('disabled'), 'sans-regle');
  assert.equal(liste.find((terme) => terme.mot === 'disabled')!.statut, 'ecart', 'l’écart garde son statut pour son libellé');
  assert.equal(type.get('card'), 'composant', 'la nature passe avant la règle et la question');
});

test('la recherche trouve une référence par une de ses variantes et le dit', () => {
  const projection = projeter(calculer(fichierDesTermes, { termes: [{ terme: ['extra', 'small'], remplace: [['xs']] }] }));
  const parVariante = aplatir(premiers(projection, { recherche: 'XS' }));
  assert.deepEqual(parVariante.map((terme) => [terme.mot, terme.trouve]), [['extra-small', 'xs']]);
  assert.ok(parVariante[0].remplace.includes(parVariante[0].trouve!), 'trouve est un élément de remplace');
  const parMot = aplatir(premiers(projection, { recherche: 'extra-s' }));
  assert.deepEqual(parMot.map((terme) => [terme.mot, terme.trouve]), [['extra-small', null]]);
  assert.equal(aplatir(premiers(projection)).every((terme) => terme.trouve === null), true);
  assert.equal(premiers(projection, { recherche: 'xs', types: ['sans-regle'] }).sections.length, 0);
  assert.equal(premiers(projection, { recherche: 'xs', types: ['remplace', 'conforme'] }).sections[0].total, 1);
});

test('la recherche lit aussi la forme que le fichier donne à la variante', () => {
  const fichier: Fichier = { collections: [['c1', 'components']], variables: variables(['a', 'Button/Colors/Primary'], ['b', 'Button/colors/Secondary'], ['c', 'Button/colors/Tertiary']) };
  const projection = projeter(calculer(fichier));
  const trouves = (recherche: string) => aplatir(premiers(projection, { recherche })).filter((terme) => terme.mot === 'color').map((terme) => terme.trouve);
  assert.deepEqual(trouves('colors'), ['colors'], 'la forme la plus fréquente de la variante est celle qui a été trouvée');
  assert.deepEqual(trouves('COLO'), [null], 'la clé du terme suffit');
  assert.deepEqual(trouves('zzz'), []);
});

test('les types, les origines et la recherche réduisent les sections sans changer les comptes', () => {
  const projection = projeter(calculer(fichierDesTermes, { termes: [outlined], ecarts: ['disabled'] }));
  const tout = premiers(projection);
  const sectionsDe = (page: PageDeTermes) => page.sections.map((section) => [section.type, section.total]);
  const seulement = premiers(projection, { types: ['composant'] });
  assert.deepEqual(sectionsDe(seulement), [['composant', 1]]);
  assert.deepEqual(mots(aplatir(seulement)), ['button']);
  assert.deepEqual(sectionsDe(premiers(projection, { types: ['remplace', 'conforme'] })).map(([type]) => type), ['remplace', 'conforme']);
  assert.deepEqual(sectionsDe(premiers(projection, { types: [] })), sectionsDe(tout), 'vide = tous les types');
  assert.deepEqual(seulement.comptes, tout.comptes);

  const ucm = toutLeVocabulaire(projection, { origines: ['ucm'] });
  const personnalise = toutLeVocabulaire(projection, { origines: ['personnalise'] });
  assert.deepEqual(mots(personnalise.filter((terme) => terme.type === 'remplace')), ['outlined']);
  assert.equal(ucm.some((terme) => terme.mot === 'outlined'), false);
  assert.ok(ucm.some((terme) => terme.mot === 'pressed'));
  const sansOrigine = toutLeVocabulaire(projection);
  for (const filtree of [ucm, personnalise]) {
    for (const type of ['a-trancher', 'sans-regle', 'composant', 'palette'] as const) {
      assert.deepEqual(mots(filtree.filter((terme) => terme.type === type)), mots(sansOrigine.filter((terme) => terme.type === type)), `l’origine ne filtre pas ${type}`);
    }
  }
  assert.deepEqual(premiers(projection, { origines: ['personnalise'] }).comptes, tout.comptes);

  const recherche = premiers(projection, { recherche: '  PRESS ' });
  assert.deepEqual(aplatir(recherche).map((terme) => [terme.mot, terme.trouve]), [['pressed', null]]);
  assert.deepEqual(recherche.comptes, tout.comptes);
  assert.equal(premiers(projection, { recherche: 'press', types: ['sans-regle'] }).sections.length, 0);
});

test('chaque type porte son total et ses cinq premières lignes ; une section se lit par pages de cinquante', () => {
  assert.equal(LIGNES_PAR_SECTION, 5);
  const trenteEtCent = Array.from({ length: 130 }, (_, rang) => ({ id: `n${rang}`, nom: `groupe/mot${String.fromCharCode(97 + (rang % 26))}${String.fromCharCode(97 + Math.floor(rang / 26))}x` }));
  const projection = projeter(calculer({ collections: [['c1', 'components']], variables: trenteEtCent }));
  const resume = premiers(projection, { recherche: 'mot' });
  assert.deepEqual(resume.sections.map((section) => [section.type, section.total, section.termes.length]), [['sans-regle', 130, 5]]);
  assert.deepEqual([resume.section, resume.debut], [null, 0]);
  const pages = [0, 50, 100, 150].map((debut) => premiers(projection, { recherche: 'mot', section: 'sans-regle', debut }));
  assert.deepEqual(pages.map((page) => page.sections.length), [1, 1, 1, 1], 'une seule section, même vide');
  assert.deepEqual(pages.map((page) => page.sections[0].termes.length), [50, 50, 30, 0]);
  assert.ok(pages.every((page) => page.sections[0].total === 130 && page.sections[0].type === 'sans-regle'));
  assert.deepEqual(pages.map((page) => [page.section, page.debut]), [['sans-regle', 0], ['sans-regle', 50], ['sans-regle', 100], ['sans-regle', 150]]);
  assert.equal(new Set(pages.flatMap((page) => mots(page.sections[0].termes))).size, 130);
  assert.equal(premiers(projection, { recherche: 'zzz', section: 'palette' }).sections[0].total, 0);
});

test('les sections suivent l’ordre des types et ne gardent que celles qui ont des termes', () => {
  const projection = projeter(calculer(playground, {
    questions: { questions: [{ type: 'paire', cle: 'paire:outlined|padding', indice: 'synonymes', termes: [termeEnQuestion('outlined', 2, ['b1']), termeEnQuestion('padding', 1, ['b3'])], propose: 0, score: 5 }], autres: [] },
  }));
  const page = premiers(projection);
  assert.deepEqual(page.sections.map((section) => section.type), ['a-trancher', 'remplace', 'conforme', 'sans-regle', 'composant', 'palette']);
  assert.ok(page.sections.every((section) => PLACES_DE_TERMES.every((place) => section.termes.filter((terme) => terme.place === place).length === Math.min(section.totaux[place], LIGNES_PAR_SECTION))));
  assert.ok(page.sections.every((section) => section.total === section.totaux.groupes + section.totaux.variables));
  assert.deepEqual(page.sections.map((section) => section.total), TYPES_DE_TERMES.map((type) => page.comptes.types[type]));
  assert.deepEqual(premiers(projection, { types: ['palette', 'conforme'] }).sections.map((section) => section.type), ['conforme', 'palette'], 'l’ordre des types demandés ne compte pas');
  const sansComposant = projeter(calculer({ collections: [['c1', 'primitives']], variables: [{ id: 'p', nom: 'colors/Poppy/soft/light/500' }] }));
  assert.ok(premiers(sansComposant).sections.every((section) => section.total > 0), 'une section vide n’est pas rendue');
});

test('les comptes ne dépendent ni de la recherche ni des filtres', () => {
  const projection = projeter(calculer(playground, { termes: [outlined] }));
  const { comptes } = premiers(projection);
  const toutesLesDemandes = [
    { recherche: 'xyz' }, { types: ['palette'] }, { origines: ['personnalise'] }, { section: 'conforme', debut: 50 }, { recherche: 'button', types: ['composant'], origines: ['ucm'], tri: 'nombre' },
  ] satisfies Partial<RequeteDeTermes>[];
  for (const demande of toutesLesDemandes) assert.deepEqual(premiers(projection, demande).comptes, comptes, JSON.stringify(demande));
  assert.equal(comptes.types.composant, 2);
  assert.equal(comptes.types.palette, 1);
  const reglees = toutLeVocabulaire(projection).filter((terme) => terme.type === 'remplace' || terme.type === 'conforme');
  assert.deepEqual(comptes.origines, { ucm: reglees.filter((terme) => terme.origine === 'ucm').length, personnalise: reglees.filter((terme) => terme.origine === 'personnalise').length });
  assert.ok(comptes.origines.ucm > 0);
});

// L'ordre de la liste

test('le tri alphabétique lit les nombres par leur valeur et les tailles dans l’ordre de l’échelle', () => {
  const crans = projeter(calculer({ collections: [['c1', 'primitives']], variables: ['200', '50', '100', '950', '900'].map((cran) => ({ id: `c${cran}`, nom: `colors/Poppy/soft/light/${cran}` })) }));
  assert.deepEqual(mots(termesDuType(crans, 'conforme').filter((terme) => /^\d+$/.test(terme.mot))), ['50', '100', '200', '900', '950']);
  const echelle = projeter(calculer({ collections: [['c1', 'theme']], variables: ['2xl', 'md', 'xs', '2xs', 'lg', 'sm'].map((taille) => ({ id: `t${taille}`, nom: `spacing/${taille}` })) }));
  assert.deepEqual(mots(termesDuType(echelle, 'conforme').filter((terme) => terme.mot !== 'spacing')), ['2xs', 'xs', 'sm', 'md', 'lg', '2xl']);
});

test('le tri alphabétique ignore les majuscules et lit les nombres d’un mot par leur valeur', () => {
  const fichier: Fichier = {
    collections: [['c1', 'theme']],
    variables: variables(['a', 'zebra/Banana'], ['b', 'zebra/apple'], ['c', 'zebra/Cherry'], ['d', 'zebra/item2'], ['e', 'zebra/item10'], ['f', 'zebra/item1']),
  };
  const formes = termesDuType(projeter(calculer(fichier)), 'sans-regle').map((terme) => terme.forme);
  const avant = (a: string, b: string): boolean => formes.indexOf(a) >= 0 && formes.indexOf(a) < formes.indexOf(b);
  assert.ok(avant('apple', 'Banana') && avant('Banana', 'Cherry'), formes.join());
  assert.ok(avant('item1', 'item2') && avant('item2', 'item10'), formes.join());
});

test('le tri par nombre met les termes les plus employés d’abord, puis suit l’ordre alphabétique', () => {
  const fichier: Fichier = {
    collections: [['c1', 'theme']],
    variables: variables(['a', 'zeta/Banana/x'], ['b', 'zeta/Banana/y'], ['c', 'zeta/Banana/z'], ['d', 'zeta/apple/x'], ['e', 'zeta/Cherry/x'], ['f', 'zeta/Dune/x'], ['g', 'zeta/Dune/y']),
  };
  const projection = projeter(calculer(fichier));
  const choisis = (tri: 'alpha' | 'nombre') => termesDuType(projection, 'sans-regle', { tri }).filter((terme) => ['Banana', 'apple', 'Cherry', 'Dune'].includes(terme.forme));
  assert.deepEqual(choisis('nombre').map((terme) => [terme.forme, terme.nombre]), [['Banana', 3], ['Dune', 2], ['apple', 1], ['Cherry', 1]]);
  assert.deepEqual(choisis('alpha').map((terme) => terme.forme), ['apple', 'Banana', 'Cherry', 'Dune']);
  assert.deepEqual(mots(premiers(projection, { tri: 'nombre', types: ['sans-regle'] }).sections[0].termes).slice(0, 2), ['zeta', 'banana'], 'le tri s’applique avant de prendre les cinq premières lignes');
});

test('la fiche d’un terme UCM garde sa définition, ses formes remplacées et ses exemples', () => {
  const fiche = projeter(calculer(fichierDesTermes)).fiche('Pressed');
  assert.equal(fiche.mot, 'pressed');
  assert.equal(fiche.origine, 'ucm');
  assert.equal(typeof fiche.categorieUcm, 'string');
  assert.ok(fiche.definition && fiche.definition.length > 0);
  assert.deepEqual(fiche.remplace, [{ mot: 'press', forme: 'press', nombre: 1, ucm: true }]);
  assert.deepEqual(fiche.emploi, { nombre: 1, exemples: [{ id: 'b', ancien: 'button/pressed/gap', nouveau: 'button/pressed/gap', marques: [1], aussi: [] }] });
  assert.deepEqual(fiche.aRenommer, { nombre: 0, exemples: [] }, 'button/press/gap entre en collision avec button/pressed/gap : il n’est pas renommé');
  assert.deepEqual([fiche.ecart, fiche.voulu, fiche.distincts, fiche.question], [false, false, [], null]);
});

test('la fiche d’un terme du fichier donne sa règle, ses jugements et sa question', () => {
  const regles = { distincts: [['gap', 'space']] as const, voulus: ['gap'] };
  const entree = calculer(fichierDesTermes, {
    termes: [{ terme: ['outlined'], remplace: [['outline']], definition: 'Contour seul.' }],
    regles: { distincts: regles.distincts, voulus: regles.voulus },
    questions: { questions: [questionsDeTest[0]], autres: [] },
  });
  const projection = projeter(entree);
  const personnalise = projection.fiche('outlined');
  assert.equal(personnalise.origine, 'personnalise');
  assert.equal(personnalise.categorieUcm, null);
  assert.equal(personnalise.definition, 'Contour seul.');
  assert.deepEqual(personnalise.remplace, [{ mot: 'outline', forme: 'outline', nombre: 1, ucm: false }]);
  const gap = projection.fiche('gap');
  assert.deepEqual([gap.origine, gap.voulu, gap.distincts, gap.question], [null, true, ['space'], 'paire:gap|space']);
  assert.equal(projection.fiche('space').distincts[0], 'gap');
  const ecart = projeter(calculer(fichierDesTermes, { ecarts: ['disabled'] })).fiche('disabled');
  assert.deepEqual([ecart.ecart, ecart.origine], [true, 'ucm']);
});

test('un terme de plusieurs mots se compte par la suite de ses mots', () => {
  const projection = projeter(calculer(fichierDesTermes, { termes: [{ terme: ['extra', 'small'], remplace: [['xs']] }] }));
  assert.equal(projection.fiche('extra-small').emploi.nombre, 1);
  const terme = aplatir(premiers(projection, { recherche: 'extra-small' }))[0];
  assert.deepEqual(terme, { mot: 'extra-small', place: 'groupes', forme: 'extra-small', type: 'conforme', nature: null, origine: 'personnalise', statut: 'regle', remplace: [], avec: null, nombre: 1, trouve: null });
});

// Les conflits et les effets

test('les conflits du vocabulaire deviennent des conflits de vue', () => {
  assert.deepEqual(conflitVue({ type: 'contredit-ucm', terme: ['outline'], remplace: ['press'], termeUcm: ['pressed'] }),
    { type: 'contredit-ucm', terme: 'outline', remplace: 'press', termeUcm: 'pressed' });
  assert.deepEqual(conflitVue({ type: 'deja-remplace', remplace: ['extra', 'small'], par: ['xs'] }), { type: 'deja-remplace', remplace: 'extra-small', par: 'xs' });
  assert.deepEqual(conflitVue({ type: 'cycle', termes: [['a'], ['b', 'c']] }), { type: 'cycle', termes: ['a', 'b-c'] });
});

test('l’effet d’un terme compte les noms dont le nouveau nom change', () => {
  const courante = calculer(fichierDesTermes);
  const simulee = calculer(fichierDesTermes, { termes: [outlined], lexique: courante.lexique });
  const effet = effetDeTerme(courante, simulee, { avant: 'outline', apres: 'outlined' });
  assert.deepEqual(effet, { sorte: 'terme', avant: 'outline', apres: 'outlined', nombre: 1, exemple: { id: 'd', ancien: 'button/outline/space', nouveau: 'button/outlined/space', marques: [1], aussi: [] } });
  const retrait = effetDeTerme(simulee, courante, { avant: 'outline', apres: 'outlined' });
  assert.equal(retrait.sorte === 'terme' && retrait.nombre, 1);
  assert.deepEqual(effetDeTerme(courante, courante, { avant: 'x', apres: 'y' }), { sorte: 'terme', avant: 'x', apres: 'y', nombre: 0, exemple: null });
});

test('l’effet d’une écriture donne les comptes du calcul simulé et ses renommages d’écriture', () => {
  const fichier: Fichier = { collections: [['c1', 'components']], variables: variables(['a', 'Button/fontSize'], ['b', 'button/gap']) };
  const pascal = { casse: 'PascalCase', separateur: 'camelCase' } as const;
  const effet = effetDEcriture(calculer(fichier, { ecriture: { groupes: pascal, variables: minusculesTirets } }));
  assert.equal(effet.sorte, 'ecriture');
  if (effet.sorte !== 'ecriture') return;
  assert.deepEqual(effet.groupes.convention, pascal);
  assert.equal(effet.groupes.total, 2);
  assert.equal(effet.groupes.suivent, 1);
  assert.equal(effet.renommages, 2);
  assert.deepEqual(effet.exemple, { avant: 'Button/fontSize', apres: 'Button/font-size' });
  const rien = effetDEcriture(calculer({ collections: [['c1', 'components']], variables: variables(['a', 'button/gap']) }));
  assert.deepEqual(rien.sorte === 'ecriture' && [rien.renommages, rien.exemple], [0, null]);
});

// Les lignes avant → après

test('un renommage garde son nombre de segments, ses marques désignent des segments qui changent', () => {
  const projection = projeter(calculer(fichierDeBase, { termes: [outlined] }));
  const bilan = projection.bilan();
  const lignes = bilan.groupes.flatMap((groupe) => projection.lignes(groupe.cle, 0).lignes);
  assert.ok(lignes.length > 10);
  for (const ligne of lignes) {
    const [avant, apres] = [ligne.ancien.split('/'), ligne.nouveau.split('/')];
    assert.equal(avant.length, apres.length, ligne.id);
    assert.ok(ligne.marques.length > 0 && ligne.marques.every((rang) => rang < avant.length), ligne.id);
  }
  const collection = lignes.find((ligne) => ligne.id === 'c:c2')!;
  assert.deepEqual([collection.ancien, collection.nouveau, collection.marques], ['Color Brands', 'brands', [0]]);
});

test('les marques d’une carte de terme suivent la règle du terme, pas l’écriture', () => {
  const fichier: Fichier = { collections: [['c1', 'components']], variables: variables(['a', 'colors/Neutral/light/700'], ['b', 'Brand/Primary/light']) };
  const projection = projeter(calculer(fichier, { termes: [{ terme: ['color'], remplace: [['colors']] }] }));
  const [terme, ...autres] = projection.bilan().groupes;
  assert.equal(terme.cle, 'terme:color');
  assert.deepEqual(terme.apercu[0], {
    id: 'a', ancien: 'colors/Neutral/light/700', nouveau: 'color/neutral/light/700', marques: [0], aussi: ['ecriture:groupes'],
  });
  assert.equal(terme.aussiDEcriture, 1);
  const ecriture = autres.find((groupe) => groupe.cle === 'ecriture:groupes');
  assert.ok(ecriture);
  assert.deepEqual(projection.lignes('ecriture:groupes', 0).lignes[0].marques, [0, 1]);
});

test('aussiDEcriture compte les renommages d’un terme qui changent aussi d’écriture, 0 hors des termes', () => {
  const bilan = projeter(calculer(fichierDeBase)).bilan();
  const parCle = new Map(bilan.groupes.map((groupe) => [groupe.cle, groupe]));
  assert.equal(parCle.get('terme:pressed')!.aussiDEcriture, 3, 'v1, v2 et v12 changent aussi de casse ; les autres noms de press sont déjà écrits ainsi');
  assert.equal(parCle.get('ecriture:variables')!.aussiDEcriture, 0);
  assert.equal(parCle.get('collection:c:c2')!.aussiDEcriture, 0);
});

test('une taille qui s’écrit autrement dans les noms et dans les groupes donne deux cartes UCM de catégories différentes', () => {
  const fichier: Fichier = { collections: [['c1', 'components']], variables: variables(['a', 'Radius/small'], ['b', 'Button/Size/Sm/padding-y']) };
  const bilan = projeter(calculer(fichier)).bilan();
  const cartes = bilan.groupes.filter((groupe) => groupe.regle.sorte === 'terme');
  const carte = (cle: string) => cartes.find((groupe) => groupe.cle === cle)!;
  assert.deepEqual(cartes.map((groupe) => groupe.cle).sort(), ['terme:sm', 'terme:small']);
  assert.deepEqual([carte('terme:sm').avant, carte('terme:sm').apres, carte('terme:sm').regle], ['small', 'sm', { sorte: 'terme', origine: 'ucm', categorie: 'variables' }]);
  assert.deepEqual([carte('terme:small').avant, carte('terme:small').apres, carte('terme:small').regle], ['sm', 'small', { sorte: 'terme', origine: 'ucm', categorie: 'groupes' }]);
});

test('la fiche d’un terme liste les renommages qu’il provoque, trois exemples au plus', () => {
  const fichier: Fichier = {
    collections: [['c1', 'components']],
    variables: variables(['a', 'Button/press/gap'], ['b', 'Card/press/gap'], ['c', 'Tile/press/gap'], ['d', 'Chip/press/gap'], ['e', 'Chip/pressed/size']),
  };
  const projection = projeter(calculer(fichier));
  const fiche = projection.fiche('pressed');
  assert.equal(fiche.aRenommer.nombre, 4);
  assert.equal(fiche.aRenommer.exemples.length, 3);
  assert.deepEqual(fiche.aRenommer.exemples[0], { id: 'a', ancien: 'Button/press/gap', nouveau: 'button/pressed/gap', marques: [1], aussi: ['ecriture:groupes'] });
  assert.equal(fiche.emploi.nombre, 1);
  assert.deepEqual(projection.fiche('gap').aRenommer, { nombre: 0, exemples: [] });
});

test('l’effet d’une question réécrit le terme remplacé dans l’écriture de son segment', () => {
  const fichier: Fichier = {
    collections: [['c1', 'components']],
    variables: variables(['a', 'Button/bg/hover'], ['b', 'Card/Bg/hover'], ['c', 'Page/background/default'], ['d', 'link/contrasthovered/text'], ['e', 'Link/ButtonBg/text']),
  };
  const background = termeEnQuestion('background', 1, ['c'], true);
  const paireDe = (cle: string, termes: readonly [ReturnType<typeof termeEnQuestion>, ReturnType<typeof termeEnQuestion>], propose: 0 | 1): Question =>
    ({ type: 'paire', cle, indice: 'abreviation', termes, propose, score: 5 });
  const effets = (...questions: Question[]) => projeter(calculer(fichier, { questions: { questions, autres: [] } })).bilan().questions
    .map((question) => (question.type === 'paire' || question.type === 'ecriture-du-terme' ? question.effet : undefined));
  const [direct, inverse, majuscule] = effets(
    paireDe('p1', [termeEnQuestion('bg', 2, ['a', 'b']), background], 1),
    paireDe('p2', [background, termeEnQuestion('bg', 2, ['a', 'b'])], 0),
    paireDe('p3', [termeEnQuestion('bg', 1, ['b']), background], 1),
  );
  assert.deepEqual(direct, { id: 'a', ancien: 'Button/bg/hover', nouveau: 'Button/background/hover', marques: [1], aussi: [] });
  assert.deepEqual(inverse, direct, 'le terme remplacé est celui que la question ne propose pas');
  assert.deepEqual(majuscule, { id: 'b', ancien: 'Card/Bg/hover', nouveau: 'Card/Background/hover', marques: [1], aussi: [] });
  const colles: Question = { type: 'ecriture-du-terme', cle: 'colles', indice: 'mots-colles', terme: termeEnQuestion('contrasthovered', 1, ['d']), proposition: ['contrast', 'hovered'], score: 1 };
  assert.deepEqual(effets(colles)[0], { id: 'd', ancien: 'link/contrasthovered/text', nouveau: 'link/contrast-hovered/text', marques: [1], aussi: [] });
  assert.equal(effets(paireDe('p4', [termeEnQuestion('bg', 1, ['e']), background], 1))[0]?.nouveau, 'Link/ButtonBackground/text');
  assert.equal(effets(paireDe('p5', [termeEnQuestion('bg', 1, []), background], 1))[0], null);
});

// Le vocabulaire sur un extrait du Playground

const crans = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];
const playground: Fichier = {
  collections: [['c1', 'components'], ['c2', 'primitives'], ['c3', 'typography'], ['c4', 'theme']],
  variables: [
    ...variables(
      ['s1', 'StressTest/Info/ScaleWrap/Colors/Scale-1'], ['s2', 'StressTest/Info/ScaleWrap/Colors/Scale-2'], ['s3', 'StressTest/Info/TextColumns/Colors/Title'],
      ['b1', 'Button/Colors/Primary/Outlined/Default/Background'], ['b2', 'Button/Colors/Primary/Outlined/Hover/Background'], ['b3', 'Button/Sizes/Medium/Padding-x'],
    ),
    ...crans.map((cran) => ({ id: `p${cran}`, nom: `colors/Poppy/soft/light/${cran}`, collection: 'c2' })),
    ...['3xl', 'xl', 'base'].map((taille) => ({ id: `l${taille}`, nom: `lineheight/${taille}`, collection: 'c3' })),
    ...['base', 'lg'].map((taille) => ({ id: `f${taille}`, nom: `fontsize/${taille}`, collection: 'c3' })),
    { id: 'd1', nom: 'Display/Large/LineHeight', collection: 'c4' },
  ],
};

test('les morceaux de termes et les noms de collections n’ont plus de ligne', () => {
  const termes = toutLeVocabulaire(projeter(calculer(playground)));
  const clefs = new Set(mots(termes));
  for (const absent of ['line', 'height', 'stress', 'test', 'wrap', 'columns', 'text', 'components', 'primitives', 'typography', 'theme']) {
    assert.equal(clefs.has(absent), false, absent);
  }
  for (const present of ['stress-test', 'scale-wrap', 'text-columns', 'line-height', 'font-size', 'button', 'poppy']) assert.equal(clefs.has(present), true, present);
});

test('un nom de composant se compte une fois par nom et porte sa forme et sa nature', () => {
  const projection = projeter(calculer(playground));
  const termes = toutLeVocabulaire(projection);
  const terme = (mot: string) => termes.find((autre) => autre.mot === mot)!;
  assert.deepEqual(terme('stress-test'), { mot: 'stress-test', place: 'groupes', forme: 'StressTest', type: 'composant', nature: 'composant', origine: null, statut: 'sans-regle', remplace: [], avec: null, nombre: 3, trouve: null });
  assert.deepEqual([terme('button').forme, terme('button').nature, terme('button').nombre], ['Button', 'composant', 3]);
  assert.deepEqual([terme('scale-wrap').forme, terme('scale-wrap').nature, terme('scale-wrap').nombre, terme('scale-wrap').type], ['ScaleWrap', null, 2, 'sans-regle']);
  assert.deepEqual([terme('text-columns').forme, terme('text-columns').nature], ['TextColumns', null]);
  assert.deepEqual([terme('poppy').forme, terme('poppy').nature, terme('poppy').nombre, terme('poppy').type], ['Poppy', 'palette', crans.length, 'palette']);
  assert.equal(terme('info').nature, null);
});

// L'écriture d'un terme réglé

const pascalEtMinuscules: EcritureChoisie = { groupes: { casse: 'PascalCase', separateur: 'camelCase' }, variables: minusculesTirets };

test('un terme réglé s’écrit dans la convention de la catégorie qui l’emploie le plus', () => {
  const projection = projeter(calculer(playground, { ecriture: pascalEtMinuscules }));
  const termes = toutLeVocabulaire(projection);
  const terme = (mot: string) => termes.find((autre) => autre.mot === mot)!;
  assert.deepEqual([terme('color').forme, terme('color').type, terme('color').nombre], ['Color', 'remplace', 16], '« color » est surtout employé en dossier, par ses variantes Colors et colors, dont il compte les noms');
  assert.equal(terme('line-height').forme, 'LineHeight', 'lineheight et LineHeight sont en dossier trois fois sur quatre');
  assert.equal(projection.fiche('color').forme, 'Color', 'la fiche écrit le terme comme la liste');
  assert.equal(projection.fiche('line-height').forme, 'LineHeight');
  assert.equal(terme('stress-test').forme, 'StressTest', 'un nom garde son écriture du fichier');
  assert.equal(terme('outlined').forme, 'Outlined', 'un mot sans règle garde son écriture du fichier');
});

test('line-height s’écrit « line-height » quand c’est une variable qui l’emploie le plus', () => {
  const fichier: Fichier = { collections: [['c1', 'theme']], variables: variables(['a', 'Display/Large/LineHeight'], ['b', 'Display/Small/LineHeight'], ['c', 'lineheight/base']) };
  const projection = projeter(calculer(fichier, { ecriture: pascalEtMinuscules }));
  assert.deepEqual(lignesDuTerme(termesDuType(projection, 'conforme'), 'line-height').map((terme) => [terme.place, terme.forme, terme.nombre]), [['groupes', 'LineHeight', 1], ['variables', 'line-height', 2]]);
  assert.equal(projection.fiche('line-height').forme, 'line-height', 'la fiche garde une seule écriture, celle de la place qui l’emploie le plus');
  const enDossier = projeter(calculer({ collections: [['c1', 'theme']], variables: variables(['a', 'lineheight/base'], ['b', 'lineheight/lg'], ['c', 'Display/Large/LineHeight']) }, { ecriture: pascalEtMinuscules }));
  assert.equal(enDossier.fiche('line-height').forme, 'LineHeight');
});

test('sans occurrence, un terme réglé s’écrit dans la convention des variables', () => {
  const fichier: Fichier = { collections: [['c1', 'theme']], variables: variables(['a', 'Button/gap']) };
  const projection = projeter(calculer(fichier, { ecriture: pascalEtMinuscules, termes: [{ terme: ['extra', 'small'], remplace: [] }, { terme: ['mon', 'terme', 'neuf'], remplace: [] }] }));
  const termes = toutLeVocabulaire(projection);
  assert.deepEqual([termes.find((terme) => terme.mot === 'extra-small')!.forme, termes.find((terme) => terme.mot === 'mon-terme-neuf')!.forme], ['extra-small', 'mon-terme-neuf']);
  const camel: EcritureChoisie = { groupes: pascalEtMinuscules.groupes, variables: { casse: 'camelCase', separateur: 'camelCase' } };
  assert.equal(termesDuType(projeter(calculer(fichier, { ecriture: camel, termes: [{ terme: ['mon', 'terme', 'neuf'], remplace: [] }] })), 'conforme').find((terme) => terme.mot === 'mon-terme-neuf')!.forme, 'monTermeNeuf');
});

test('les variantes portent leur forme du fichier, les plus fréquentes d’abord', () => {
  const projection = projeter(calculer(playground, { ecriture: pascalEtMinuscules }));
  const color = toutLeVocabulaire(projection).find((terme) => terme.mot === 'color')!;
  assert.deepEqual(color.remplace, ['colors', 'Colors'], 'colors est écrit dans 11 noms, Colors dans 5 ; colour et colours, absents du fichier, n’y sont pas');
  assert.equal(projection.fiche('color').remplace[0].mot, 'colors', 'la clé de la variante reste celle des gestes');
  assert.equal(projection.fiche('color').remplace[0].forme, 'colors');
  const parFrequence = (fichier: Fichier) => toutLeVocabulaire(projeter(calculer(fichier))).find((terme) => terme.mot === 'color')!.remplace;
  const colors = (nom: string, id: string) => ({ id, nom });
  assert.deepEqual(parFrequence({ collections: [['c', 'theme']], variables: [colors('Colors/a', '1'), colors('colors/b', '2'), colors('colors/c', '3')] }), ['colors', 'Colors']);
  assert.deepEqual(parFrequence({ collections: [['c', 'theme']], variables: [colors('Colors/a', '1'), colors('colors/b', '2')] }), ['Colors', 'colors'], 'à égalité, la première rencontrée');
  assert.deepEqual(parFrequence({ collections: [['c', 'theme']], variables: [colors('colors/b', '2'), colors('Colors/a', '1')] }), ['colors', 'Colors']);
});

test('line-height compte lineheight et LineHeight, une ligne par place, et garde la forme du fichier à cette place pour la recherche', () => {
  const projection = projeter(calculer(playground));
  const lignes = lignesDuTerme(toutLeVocabulaire(projection), 'line-height');
  assert.deepEqual(lignes.map((ligne) => [ligne.place, ligne.nature, ligne.nombre, ligne.type]), [['groupes', null, 3, 'conforme'], ['variables', null, 1, 'conforme']]);
  assert.deepEqual(aplatir(premiers(projection, { recherche: 'lineheight' })).map((terme) => [terme.mot, terme.place]), [['line-height', 'groupes'], ['line-height', 'variables']], 'la forme du fichier se lit encore, dans chaque place');
  assert.deepEqual(projection.fiche('line-height').emploi.exemples.map((ligne) => [ligne.ancien, ligne.marques]), [
    ['lineheight/3xl', [0]], ['lineheight/xl', [0]], ['lineheight/base', [0]],
  ]);
  assert.equal(projection.fiche('line-height').emploi.nombre, 4);
});

test('à égalité, la forme d’un mot sans règle est la première rencontrée ; une forme partielle garde ses séparateurs d’origine', () => {
  const egalite: Fichier = { collections: [['c', 'theme']], variables: variables(['a', 'Stress/x'], ['b', 'stress/y']) };
  assert.equal(projeter(calculer(egalite)).fiche('stress').forme, 'Stress');
  const partielles: Fichier = {
    collections: [['c', 'theme']],
    variables: variables(['a', 'Card/max-width-large'], ['b', 'Card/Max-Width-xl'], ['c', 'Card/max-width-sm'], ['d', 'Card/primaryBg']),
  };
  const projection = projeter(calculer(partielles));
  assert.equal(projection.fiche('max-width').forme, 'max-width');
  assert.equal(projection.fiche('max-width').emploi.nombre, 3);
  assert.equal(projection.fiche('bg').forme, 'Bg');
  assert.equal(projection.fiche('primary').forme, 'primary');
  assert.equal(projection.fiche('inconnu').forme, 'inconnu', 'sans occurrence, la forme est la clé');
});

test('Sans règle ne contient ni composant ni palette, mais les noms de groupe ; Composants et Palettes séparent les noms', () => {
  const projection = projeter(calculer(playground));
  const sans = mots(termesDuType(projection, 'sans-regle'));
  for (const nom of ['button', 'stress-test', 'poppy']) assert.equal(sans.includes(nom), false, nom);
  assert.deepEqual([...sans].sort(), ['outlined', 'padding', 'scale-wrap', 'text-columns'], 'les mots du fichier et les noms de groupe que ni le référentiel ni une règle ne couvrent');
  assert.deepEqual(mots(termesDuType(projection, 'composant')).sort(), ['button', 'stress-test']);
  assert.deepEqual(mots(termesDuType(projection, 'palette')), ['poppy']);
});

test('la recherche lit la clé, la forme et les variantes', () => {
  const projection = projeter(calculer(playground));
  const cherche = (recherche: string) => mots(aplatir(premiers(projection, { recherche })));
  assert.deepEqual(cherche('stress-t'), ['stress-test']);
  assert.deepEqual(cherche('STRESSTEST'), ['stress-test'], 'la forme, sans le tiret de la clé');
  assert.deepEqual(cherche('lineheight'), ['line-height', 'line-height'], 'une ligne par place');
  assert.deepEqual(cherche('line-height'), ['line-height', 'line-height']);
});

test('la fiche d’un nom rend sa forme et sa nature, et marque le segment entier du nom', () => {
  const projection = projeter(calculer(playground));
  const fiche = projection.fiche('scale-wrap');
  assert.deepEqual([fiche.mot, fiche.forme, fiche.nature, fiche.origine, fiche.question], ['scale-wrap', 'ScaleWrap', null, null, null]);
  assert.deepEqual(fiche.emploi.exemples, [
    { id: 's1', ancien: 'StressTest/Info/ScaleWrap/Colors/Scale-1', nouveau: 'StressTest/Info/ScaleWrap/Colors/Scale-1', marques: [2], aussi: [] },
    { id: 's2', ancien: 'StressTest/Info/ScaleWrap/Colors/Scale-2', nouveau: 'StressTest/Info/ScaleWrap/Colors/Scale-2', marques: [2], aussi: [] },
  ]);
  assert.equal(fiche.emploi.nombre, 2);
  const composant = projection.fiche('Stress-Test');
  assert.deepEqual([composant.forme, composant.nature, composant.emploi.nombre, composant.emploi.exemples[0].marques], ['StressTest', 'composant', 3, [0]]);
  assert.deepEqual([projection.fiche('poppy').nature, projection.fiche('info').nature, projection.fiche('info').forme], ['palette', null, 'info'], 'info est un terme UCM : la fiche l’écrit dans la convention du projet');
});

test('un terme règle ne perd pas sa nature, et une question ne rend jamais un nom « à trancher »', () => {
  const entree = calculer(playground, {
    termes: [{ terme: ['button'], remplace: [['btn']] }],
    questions: { questions: [{ type: 'paire', cle: 'paire:outlined|stress-test', indice: 'synonymes', termes: [termeEnQuestion('outlined', 2, ['b1']), termeEnQuestion('stress-test', 3, ['s1'])], propose: 0, score: 5 }], autres: [] },
  });
  const projection = projeter(entree);
  const termes = toutLeVocabulaire(projection);
  const button = termes.find((terme) => terme.mot === 'button')!;
  assert.deepEqual([button.statut, button.nature, button.avec, button.type, button.forme], ['regle', 'composant', null, 'composant', 'Button']);
  assert.equal(termes.find((terme) => terme.mot === 'stress-test')!.statut, 'sans-regle');
  assert.deepEqual(termes.find((terme) => terme.mot === 'outlined')!.statut, 'a-trancher');
  assert.equal(termes.find((terme) => terme.mot === 'outlined')!.type, 'a-trancher');
  assert.equal(projection.fiche('stress-test').question, null);
  assert.equal(projection.fiche('outlined').question, 'paire:outlined|stress-test');
  assert.equal(mots(termesDuType(projection, 'composant')).includes('button'), true);
  assert.equal(mots(termesDuType(projection, 'a-trancher')).includes('outlined'), true);
});

test('le détail du vocabulaire porte le type, la forme et la nature de chaque terme, et les natures et termes de chaque nom', () => {
  const projection = projeter(calculer(playground));
  const detail = projection.diagnostic();
  const terme = detail.termes.find((autre) => autre.mot === 'stress-test')!;
  assert.deepEqual([terme.forme, terme.nature, terme.type, terme.nombre], ['StressTest', 'composant', 'composant', 3]);
  assert.deepEqual(detail.termes.find((autre) => autre.mot === 'line-height')!.type, 'conforme');
  assert.ok(detail.termes.every((autre) => TYPES_DE_TERMES.includes(autre.type)));
  assert.deepEqual(terme.segments, [{ segment: 'StressTest', mots: ['Stress', 'Test'], noms: 3, exemple: 'StressTest/Info/ScaleWrap/Colors/Scale-1' }]);
  const nom = (texte: string) => detail.noms.find((autre) => autre.nom === texte)!;
  const scale = nom('StressTest/Info/ScaleWrap/Colors/Scale-1');
  assert.deepEqual(scale.natures, ['composant', null, null, null, null]);
  assert.deepEqual(scale.termes, [['StressTest'], ['Info'], ['ScaleWrap'], ['Colors'], ['Scale', '1']]);
  assert.deepEqual(nom('Display/Large/LineHeight').termes, [['Display'], ['Large'], ['LineHeight']]);
  assert.deepEqual(nom('lineheight/3xl').termes, [['lineheight'], ['3xl']]);
  assert.deepEqual(nom('colors/Poppy/soft/light/50').natures, [null, 'palette', null, null, null]);
  const collection = nom('components');
  assert.deepEqual([collection.categorie, collection.natures, collection.termes], ['collections', [null], [[]]]);
  assert.equal(detail.termes.length, toutLeVocabulaire(projection).length);
});

test('une taille s’écrit à sa place : Small reste en dossier, small devient sm dans un nom de variable', () => {
  const enDossier: Fichier = { collections: [['c1', 'components']], variables: variables(['v1', 'Button/Sizes/Small/Gap'], ['v2', 'Display/Small/FontSize']) };
  const seul = lignesDuTerme(toutLeVocabulaire(projeter(calculer(enDossier, { ecriture: pascalEtMinuscules }))), 'sm');
  assert.deepEqual(seul.map((ligne) => [ligne.place, ligne.forme, ligne.type, ligne.remplace]), [['groupes', 'Small', 'conforme', []]], 'en dossier, small est la forme retenue');
  const avecVariable: Fichier = { ...enDossier, variables: [...enDossier.variables, ...variables(['v3', 'spacing/small'])] };
  const mixte = lignesDuTerme(toutLeVocabulaire(projeter(calculer(avecVariable, { ecriture: pascalEtMinuscules }))), 'sm');
  assert.deepEqual(mixte.map((ligne) => [ligne.place, ligne.forme, ligne.type, ligne.remplace, ligne.nombre]), [
    ['groupes', 'Small', 'conforme', [], 2], ['variables', 'sm', 'remplace', ['small'], 1],
  ], 'chaque place a sa ligne, et seul le nom de variable est remplacé');
});

// La liste par place

const lignesParPlace = (termes: readonly TermeDeListe[]): Record<PlaceDuTerme, string[]> =>
  ({ groupes: mots(termes.filter((terme) => terme.place === 'groupes')), variables: mots(termes.filter((terme) => terme.place === 'variables')) });

test('un terme employé aux deux places a une ligne par place, avec sa forme, son type, ses variantes et son nombre à cette place', () => {
  const fichier: Fichier = { collections: [['c1', 'components']], variables: variables(['a', 'Card/Color/fill'], ['b', 'Card/Colors/fill'], ['c', 'Card/gap/colors'], ['d', 'Card/gap/color']) };
  const projection = projeter(calculer(fichier, { ecriture: pascalEtMinuscules }));
  const color = lignesDuTerme(toutLeVocabulaire(projection), 'color');
  assert.deepEqual(color.map((ligne) => [ligne.place, ligne.forme, ligne.type, ligne.remplace, ligne.nombre]), [
    ['groupes', 'Color', 'remplace', ['Colors'], 2], ['variables', 'color', 'remplace', ['colors'], 2],
  ]);
  const conforme: Fichier = { collections: [['c1', 'components']], variables: variables(['a', 'Card/Color/fill'], ['c', 'Card/gap/colors']) };
  const separees = lignesDuTerme(toutLeVocabulaire(projeter(calculer(conforme, { ecriture: pascalEtMinuscules }))), 'color');
  assert.deepEqual(separees.map((ligne) => [ligne.place, ligne.type, ligne.remplace, ligne.nombre]), [['groupes', 'conforme', [], 1], ['variables', 'remplace', ['colors'], 1]], 'le type se calcule à chaque place');
  const trouvees = aplatir(premiers(projeter(calculer(conforme, { ecriture: pascalEtMinuscules })), { recherche: 'colors' }));
  assert.deepEqual(trouvees.map((ligne) => [ligne.place, ligne.trouve]), [['variables', 'colors']], 'la recherche se juge ligne par ligne : la variante n’est employée qu’en variable');
  assert.deepEqual(projeter(calculer(conforme, { ecriture: pascalEtMinuscules })).fiche('color').remplace.map((variante) => variante.mot), ['colors', 'colour', 'colours'], 'la fiche reste celle du terme, toutes places confondues');
});

test('un composant, une palette et un terme sans occurrence n’ont qu’une ligne', () => {
  const termes = toutLeVocabulaire(projeter(calculer(playground, { termes: [{ terme: ['extra', 'small'], remplace: [['xs']] }], ecarts: ['disabled'] })));
  for (const mot of ['button', 'stress-test', 'poppy']) assert.deepEqual(lignesDuTerme(termes, mot).map((ligne) => ligne.place), ['groupes'], mot);
  for (const mot of ['extra-small', 'disabled']) assert.deepEqual(lignesDuTerme(termes, mot).map((ligne) => ligne.place), ['variables'], `${mot} : sans occurrence, les variables`);
  const enGroupe = toutLeVocabulaire(projeter(calculer({ collections: [['c1', 'components']], variables: variables(['a', 'Card/disabled/fill']) }, { ecarts: ['disabled'] })));
  assert.deepEqual(lignesDuTerme(enGroupe, 'disabled').map((ligne) => ligne.place), ['groupes'], 'la place que le fichier emploie le plus');
});

const fichierDesNombres: Fichier = {
  collections: [['c1', 'theme']],
  variables: variables(['a', 'zeta/Banana/alfa'], ['b', 'zeta/Banana/bravo'], ['c', 'zeta/Banana/charlie'], ['d', 'zeta/apple/alfa'], ['e', 'zeta/Cherry/alfa'], ['f', 'zeta/Dune/alfa'], ['g', 'zeta/Dune/bravo']),
};

test('en tri alphabétique, une section porte ses groupes puis ses variables, cinq de chaque, avec le total de chaque place', () => {
  const projection = projeter(calculer(fichierDesNombres));
  const [section] = premiers(projection, { types: ['sans-regle'] }).sections;
  assert.deepEqual(lignesParPlace(section.termes), { groupes: ['apple', 'banana', 'cherry', 'dune', 'zeta'], variables: ['alfa', 'bravo', 'charlie'] });
  assert.deepEqual(section.termes.map((terme) => terme.place), ['groupes', 'groupes', 'groupes', 'groupes', 'groupes', 'variables', 'variables', 'variables'], 'les groupes d’abord');
  assert.deepEqual([section.total, section.totaux], [8, { groupes: 5, variables: 3 }]);

  const nombreux: Fichier = {
    collections: [['c1', 'theme']],
    variables: Array.from({ length: 60 }, (_, rang) => {
      const lettres = `${String.fromCharCode(97 + (rang % 26))}${String.fromCharCode(97 + Math.floor(rang / 26))}`;
      return { id: `n${rang}`, nom: `grp${lettres}x/val${lettres}x` };
    }),
  };
  const grande = projeter(calculer(nombreux));
  const [resume] = premiers(grande, { types: ['sans-regle'] }).sections;
  assert.deepEqual([resume.total, resume.totaux, resume.termes.length], [120, { groupes: 60, variables: 60 }, 10]);
  assert.deepEqual(resume.termes.map((terme) => terme.place), [...Array(5).fill('groupes'), ...Array(5).fill('variables')], 'cinq lignes de chaque place');
  const page = (place: PlaceDuTerme | null, debut: number) => premiers(grande, { types: ['sans-regle'], section: 'sans-regle', place, debut }).sections[0];
  const groupes = [page('groupes', 0), page('groupes', 50)];
  assert.deepEqual(groupes.map((lue) => [lue.termes.length, lue.total, lue.totaux]), [[50, 120, { groupes: 60, variables: 60 }], [10, 120, { groupes: 60, variables: 60 }]]);
  assert.ok([...groupes[0].termes, ...groupes[1].termes].every((terme) => terme.place === 'groupes'), 'la page d’une place ne lit que cette place');
  assert.equal(new Set([...groupes[0].termes, ...groupes[1].termes].map((terme) => terme.mot)).size, 60);
  const variablesLues = [page('variables', 0), page('variables', 50)];
  assert.deepEqual(variablesLues.map((lue) => lue.termes.length), [50, 10]);
  assert.ok(variablesLues.flatMap((lue) => lue.termes).every((terme) => terme.place === 'variables'));
  assert.deepEqual(page('variables', 60).termes, [], 'au-delà de la place, rien');
  assert.deepEqual(page(null, 55).termes.map((terme) => terme.place), [...Array(5).fill('groupes'), ...Array(45).fill('variables')], 'sans place, les groupes puis les variables');
});

test('en tri par nombre, les deux places se mêlent et la section porte cinq lignes', () => {
  const projection = projeter(calculer(fichierDesNombres));
  const [section] = premiers(projection, { types: ['sans-regle'], tri: 'nombre' }).sections;
  assert.deepEqual(section.termes.map((terme) => [terme.mot, terme.place, terme.nombre]), [
    ['zeta', 'groupes', 7], ['alfa', 'variables', 4], ['banana', 'groupes', 3], ['bravo', 'variables', 2], ['dune', 'groupes', 2],
  ]);
  assert.deepEqual([section.total, section.totaux], [8, { groupes: 5, variables: 3 }]);
  const suite = premiers(projection, { types: ['sans-regle'], tri: 'nombre', section: 'sans-regle', place: 'groupes', debut: 5 }).sections[0];
  assert.deepEqual(suite.termes.map((terme) => [terme.mot, terme.place]), [['apple', 'groupes'], ['charlie', 'variables'], ['cherry', 'groupes']], 'la page suit la suite mêlée ; place est ignoré');
});

test('le filtre de place garde les lignes d’une place sans changer les comptes', () => {
  const projection = projeter(calculer(playground, { ecriture: pascalEtMinuscules }));
  const tout = premiers(projection);
  const toutes = toutLeVocabulaire(projection);
  const enVariable = toutLeVocabulaire(projection, { places: ['variables'] });
  assert.ok(enVariable.length > 0 && enVariable.every((terme) => terme.place === 'variables'));
  assert.deepEqual(mots(enVariable), mots(toutes.filter((terme) => terme.place === 'variables')));
  assert.deepEqual(lignesDuTerme(enVariable, 'line-height').map((terme) => terme.forme), ['line-height']);
  const enGroupe = toutLeVocabulaire(projection, { places: ['groupes'] });
  assert.deepEqual(lignesDuTerme(enGroupe, 'line-height').map((terme) => terme.forme), ['LineHeight']);
  assert.equal(enGroupe.length + enVariable.length, toutes.length);
  assert.deepEqual(mots(toutLeVocabulaire(projection, { places: ['groupes', 'variables'] })), mots(toutes), 'les deux places = toutes');
  assert.deepEqual(premiers(projection, { places: ['variables'] }).comptes, tout.comptes);
  assert.deepEqual(premiers(projection, { places: ['variables'] }).sections.map((section) => section.totaux.groupes), premiers(projection, { places: ['variables'] }).sections.map(() => 0));
  assert.equal(premiers(projection, { places: ['groupes'], types: ['composant'] }).sections[0].total, 2);
  assert.equal(premiers(projection, { places: ['variables'], types: ['composant'] }).sections.length, 0, 'un nom n’a pas de ligne en variable');
});

test('les comptes de places comptent les lignes, hors recherche et filtres', () => {
  const projection = projeter(calculer(playground, { ecriture: pascalEtMinuscules }));
  const { comptes } = premiers(projection);
  const toutes = toutLeVocabulaire(projection);
  assert.deepEqual(comptes.places, { groupes: toutes.filter((terme) => terme.place === 'groupes').length, variables: toutes.filter((terme) => terme.place === 'variables').length });
  assert.equal(comptes.places.groupes + comptes.places.variables, toutes.length);
  assert.equal(Object.values(comptes.types).reduce((somme, nombre) => somme + nombre, 0), toutes.length, 'les types comptent des lignes');
  assert.ok(toutes.filter((terme) => terme.mot === 'line-height').length === 2 && comptes.places.variables > 0);
  for (const demande of [{ recherche: 'zzz' }, { places: ['groupes'] }, { places: ['variables'], tri: 'nombre' }, { section: 'conforme', place: 'groupes', debut: 5 }] satisfies Partial<RequeteDeTermes>[]) {
    assert.deepEqual(premiers(projection, demande).comptes, comptes, JSON.stringify(demande));
  }
});

// Le dernier renommage et le dernier import du bilan

const fichierDuJournal: Fichier = {
  collections: [['c1', 'components'], ['c2', 'primitives'], ['c3', 'theme']],
  variables: [
    { id: 'a', nom: 'new/a' }, { id: 'b', nom: 'new/b~ucm' }, { id: 'c', nom: 'autre/c' }, { id: 'd', nom: 'old/d' },
    { id: 'e', nom: 'new/e', collection: 'c2' }, { id: 'f', nom: 'autre/f', collection: 'c2' },
    { id: 'g', nom: 'new/g', collection: 'c3' },
  ],
};
const renommage = (type: 'variable' | 'collection', id: string, ancienNom: string, nouveauNom: string) => ({ type, id, ancienNom, nouveauNom }) as const;

test('le journal du bilan range les noms qui ne sont pas rétablis par collection, dans l’ordre de l’inventaire', () => {
  const journal = {
    heure: '2026-10-20T12:32:00.000Z',
    renommages: [
      renommage('variable', 'g', 'old/g', 'new/g'),
      renommage('variable', 'a', 'old/a', 'new/a'),
      renommage('variable', 'b', 'old/b', 'new/b'),
      renommage('variable', 'c', 'old/c', 'new/c'),
      renommage('variable', 'd', 'old/d', 'new/d'),
      renommage('variable', 'disparue', 'old/x', 'new/x'),
      renommage('collection', 'c1', 'old-components', 'components'),
      renommage('collection', 'disparue', 'old-gone', 'gone'),
    ],
  };
  const dernier = projeter(calculer(fichierDuJournal, { regles: { journal } })).bilan().dernierRenommage;
  assert.equal(dernier?.nombre, 8);
  assert.equal(dernier?.heure, '2026-10-20T12:32:00.000Z', 'la date reste celle du journal');
  assert.equal(dernier?.reviennent, 4, 'g, a, b (nom provisoire) et la collection c1');
  assert.deepEqual(dernier?.collections, [
    { id: 'c1', nom: 'components', exclue: false, lignes: [
      { type: 'variable', aujourdhui: 'new/a', ancien: 'old/a', sort: 'revient' },
      { type: 'variable', aujourdhui: 'new/b~ucm', ancien: 'old/b', sort: 'revient' },
      { type: 'variable', aujourdhui: 'autre/c', ancien: 'old/c', sort: 'change-depuis' },
      { type: 'collection', aujourdhui: 'components', ancien: 'old-components', sort: 'revient' },
    ] },
    { id: 'c3', nom: 'theme', exclue: false, lignes: [{ type: 'variable', aujourdhui: 'new/g', ancien: 'old/g', sort: 'revient' }] },
    { id: null, nom: null, exclue: false, lignes: [
      { type: 'variable', aujourdhui: null, ancien: 'old/x', sort: 'change-depuis' },
      { type: 'collection', aujourdhui: null, ancien: 'old-gone', sort: 'change-depuis' },
    ] },
  ]);
});

test('le journal du bilan omet les entrées déjà rétablies et garde un groupe vide absent', () => {
  const retablies = { heure: '14:32', renommages: [renommage('variable', 'd', 'old/d', 'new/d'), renommage('collection', 'c1', 'components', 'new-components')] };
  const dernier = projeter(calculer(fichierDuJournal, { regles: { journal: retablies } })).bilan().dernierRenommage;
  assert.deepEqual(dernier, { nombre: 2, reviennent: 0, heure: '14:32', collections: [] });
});

test('le journal du bilan garde les lignes d’une collection exclue sans les compter parmi celles qui reviennent', () => {
  const journal = {
    heure: '14:32',
    renommages: [renommage('variable', 'e', 'old/e', 'new/e'), renommage('variable', 'f', 'old/f', 'new/f'), renommage('variable', 'a', 'old/a', 'new/a')],
  };
  const dernier = projeter(calculer(fichierDuJournal, { regles: { journal, collectionsExclues: ['c2'] } })).bilan().dernierRenommage;
  assert.equal(dernier?.reviennent, 1, 'seule a, de la collection analysée, reviendrait');
  assert.deepEqual(dernier?.collections.map(({ id, exclue }) => [id, exclue]), [['c1', false], ['c2', true]]);
  assert.deepEqual(dernier?.collections[1].lignes, [
    { type: 'variable', aujourdhui: 'new/e', ancien: 'old/e', sort: 'revient' },
    { type: 'variable', aujourdhui: 'autre/f', ancien: 'old/f', sort: 'change-depuis' },
  ]);
  const collectionExclue = { heure: '14:32', renommages: [renommage('collection', 'c2', 'old-primitives', 'primitives')] };
  const seule = projeter(calculer(fichierDuJournal, { regles: { journal: collectionExclue, collectionsExclues: ['c2'] } })).bilan().dernierRenommage;
  assert.equal(seule?.reviennent, 0);
  assert.deepEqual(seule?.collections, [{ id: 'c2', nom: 'primitives', exclue: true, lignes: [{ type: 'collection', aujourdhui: 'primitives', ancien: 'old-primitives', sort: 'revient' }] }]);
});

const ecrire = (groupes: EcritureChoisie['groupes'], variables: EcritureChoisie['variables']) => JSON.stringify({ version: 1, groupes, variables });
const pascalEspaces = { casse: 'PascalCase', separateur: 'espace' } as const;
const entreeDeTerme = (terme: string[], remplace: string[][]) => JSON.stringify({ version: 1, terme, remplace });

test('le dernier import du bilan donne une ligne par écriture et par terme changés', () => {
  const dernierImport = {
    heure: '14:35',
    avant: { ecriture: ecrire(minusculesTirets, minusculesTirets), 'terme:colors': entreeDeTerme(['colors'], [['color']]), 'terme:size': entreeDeTerme(['size'], [['sz'], ['big', 'size']]), 'terme:gone': entreeDeTerme(['gone'], [['old']]) },
    apres: { ecriture: ecrire(pascalEspaces, minusculesTirets), 'terme:colors': entreeDeTerme(['colors'], [['color'], ['colours']]), 'terme:size': null, 'terme:gone': '{pas du json' },
  };
  const lignes = projeter(calculer(fichierDuJournal, { regles: { dernierImport } })).bilan().dernierImport;
  assert.equal(lignes?.heure, '14:35');
  assert.deepEqual(lignes?.lignes, [
    { sorte: 'ecriture', avant: { groupes: minusculesTirets, variables: minusculesTirets }, apres: { groupes: pascalEspaces, variables: minusculesTirets } },
    { sorte: 'terme', terme: 'colors', avant: ['color'], apres: ['color', 'colours'] },
    { sorte: 'terme', terme: 'gone', avant: ['old'], apres: null },
    { sorte: 'terme', terme: 'size', avant: ['sz', 'big-size'], apres: null },
  ]);
});

test('le dernier import du bilan donne null pour une règle absente avant, et compte les autres clés en une ligne', () => {
  const dernierImport = {
    heure: '14:35',
    avant: { ecriture: null, 'terme:neuf': null, 'ecart:tailles': entreeDeTerme(['x'], []), 'ordinaire:foo': null, 'terme:': 'x' },
    apres: { ecriture: ecrire(minusculesTirets, pascalEspaces), 'terme:neuf': entreeDeTerme(['neuf'], []), 'ecart:tailles': null, 'ordinaire:foo': '{}', 'terme:': 'x' },
  };
  const lignes = projeter(calculer(fichierDuJournal, { regles: { dernierImport } })).bilan().dernierImport?.lignes;
  assert.deepEqual(lignes, [
    { sorte: 'ecriture', avant: null, apres: { groupes: minusculesTirets, variables: pascalEspaces } },
    { sorte: 'terme', terme: 'neuf', avant: null, apres: [] },
    { sorte: 'autres', nombre: 3 },
  ]);
});

test('le bilan sans journal ni import les donne à null', () => {
  const bilan = projeter(calculer(fichierDuJournal)).bilan();
  assert.equal(bilan.dernierRenommage, null);
  assert.equal(bilan.dernierImport, null);
  assert.equal(projeter(calculer(fichierDuJournal, { regles: { journal: { heure: '14:32', renommages: [] } } })).bilan().dernierRenommage, null);
});

// Les comptes de protection : une ligne par cause, la même que `causeDeProtection` du socle.

const FICHIER_PROTEGE: Fichier = {
  collections: [['c1', 'components'], ['c2', 'primitives'], ['c3', 'brands']],
  variables: [
    { id: 'a', nom: 'Button/press/gap' },
    { id: 'p1', nom: 'colors/Red/50', collection: 'c2', protegee: true }, { id: 'p2', nom: 'colors/Red/100', collection: 'c2', protegee: true },
    { id: 'p3', nom: 'color/Red/200', collection: 'c2', protegee: true },
    { id: 'i1', nom: 'Card/hover/gap', collection: 'c1', indecidable: true }, { id: 'i2', nom: 'Chip/Hover/gap', collection: 'c1', indecidable: true },
    { id: 'i3', nom: 'Tag/Hover/gap', collection: 'c3', indecidable: true },
  ],
};
const sommeDe = (protections: readonly { readonly nombre: number }[]): number => protections.reduce((total, { nombre }) => total + nombre, 0);

test('protections : une ligne par cause présente, dans l’ordre des causes, sans nombre nul, et la somme vaut proteges', () => {
  const cas: readonly (readonly [EtatDeLaMarque, boolean, readonly { cause: string; nombre: number }[]])[] = [
    ['absente', false, [{ cause: 'marque-absente', nombre: 3 }, { cause: 'lecture-refusee', nombre: 3 }]],
    ['illisible', false, [{ cause: 'marque-illisible', nombre: 3 }, { cause: 'lecture-refusee', nombre: 3 }]],
    ['future', false, [{ cause: 'marque-future', nombre: 3 }, { cause: 'lecture-refusee', nombre: 3 }]],
    ['refusee', false, [{ cause: 'lecture-refusee', nombre: 6 }]],
    ['courante', true, [{ cause: 'sans-regles', nombre: 3 }, { cause: 'lecture-refusee', nombre: 3 }]],
  ];
  for (const [marque, premierLancement, attendu] of cas) {
    const bilan = projeter(calculer({ ...FICHIER_PROTEGE, marque }, { regles: { ecritureDeLaV1: premierLancement } })).bilan();
    assert.deepEqual(bilan.protections, attendu, `${marque} ${premierLancement}`);
    assert.equal(bilan.proteges, sommeDe(bilan.protections), `${marque} : la somme vaut proteges`);
    assert.equal(bilan.proteges, 6);
  }
  assert.deepEqual(projeter(calculer({ collections: [['c', 'x']], variables: variables(['a', 'Button/press/gap']) })).bilan().protections, []);
});

test('protections : une marque courante avec les règles rangées libère les variables, protégées ou non vérifiées', () => {
  const entree = calculer({ ...FICHIER_PROTEGE, marque: 'courante' });
  const libre = inventaireSelonLaProtection(entree.inventaire, { palettesLibres: palettesLibres(entree.inventaire, true) });
  const bilan = projeter({ ...entree, inventaire: libre }).bilan();
  assert.deepEqual([bilan.protections, bilan.proteges], [[], 0]);
  assert.deepEqual(bilan.collections.map((collection) => collection.protegees), [0, 0, 0]);
});

test('protections : les causes comptent les variables que idsNonRenommables fige, collection par collection', () => {
  for (const marque of ['absente', 'illisible', 'future', 'refusee', 'courante'] as const) {
    const fichier = { ...FICHIER_PROTEGE, marque };
    const regles = { collectionsExclues: ['c3'], ecritureDeLaV1: marque === 'courante' };
    const entree = calculer(fichier, { regles });
    const bilan = projeter(entree).bilan();
    const figes = new Set(idsNonRenommables(entree.inventaire, [], {}));
    const figesDe = (collection: string, exclues: readonly string[]): number => entree.inventaire.entrees.filter((e) =>
      e.cible.type === 'variable' && e.cible.collectionId === collection && !exclues.includes(collection) && figes.has(e.nom.id)).length;
    assert.deepEqual(bilan.collections.map((c) => c.protegees), ['c1', 'c2', 'c3'].map((id) => figesDe(id, [])), marque);
    assert.equal(bilan.proteges, ['c1', 'c2', 'c3'].reduce((total, id) => total + figesDe(id, ['c3']), 0), `${marque} : collections exclues retirées du total`);
    assert.equal(sommeDe(bilan.protections), bilan.proteges, marque);
  }
});

test('CollectionVue.protegees compte toutes les causes, collections exclues comprises', () => {
  const bilan = projeter(calculer({ ...FICHIER_PROTEGE, marque: 'absente' }, { regles: { collectionsExclues: ['c1'] } })).bilan();
  assert.deepEqual(bilan.collections.map(({ id, analysee, protegees }) => [id, analysee, protegees]), [['c1', false, 2], ['c2', true, 3], ['c3', true, 1]]);
  assert.equal(bilan.proteges, 4, 'les deux variables de la collection exclue ne comptent pas dans le total');
});

test('proteges garde son sens : toute variable protégée, même celle dont le nom suit déjà les règles', () => {
  const bilan = projeter(calculer({ collections: [['c', 'x']], variables: [{ id: 'p', nom: 'color/red/50', protegee: true }] })).bilan();
  assert.equal(bilan.proteges, 1);
  assert.deepEqual(bilan.protections, [{ cause: 'marque-absente', nombre: 1 }]);
  assert.deepEqual(bilan.groupes, []);
});

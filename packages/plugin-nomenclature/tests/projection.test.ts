/** La projection : groupes, lignes, sélection, pages, questions, termes, fiche et effets, sur des calculs réels du kit. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  commencerLexique, indexerVocabulaire, normaliserLeLexique,
  type ConventionsParCategorie, type Lexique, type NomLu, type Question, type ResultatDesQuestions, type TermePersonnalise,
} from '@ucm-kit/core/referentiel';
import type { EntreeInventaire, Inventaire } from '../src/lecture';
import { TYPES_DE_TERMES, type EcritureChoisie, type TermeDeListe, type TypeDeTerme } from '../src/messages';
import { conflitVue, effetDEcriture, effetDeTerme, LIGNES_PAR_SECTION, projeter, TAILLE_DE_L_APERCU, TAILLE_DE_PAGE, type EntreeDeProjection, type PageDeTermes, type RequeteDeTermes } from '../src/projection';
import { reglesVides, type ReglesDuFichier } from '../src/regles';

const minusculesTirets = { casse: 'minuscules', separateur: 'tiret' } as const;
const ecritureParDefaut: EcritureChoisie = { groupes: minusculesTirets, variables: minusculesTirets };

interface Variable { readonly id: string; readonly nom: string; readonly collection?: string; readonly protegee?: boolean; readonly alias?: string }
interface Fichier { readonly collections: readonly (readonly [string, string])[]; readonly variables: readonly Variable[] }

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
    });
  }
  return { inventaire: { entrees }, noms: entrees.map((entree) => entree.nom) };
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
  const protegees = inventaire.entrees.filter((entree) => entree.protegee).map((entree) => entree.nom.id);
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
  assert.deepEqual([groupe.avant, groupe.apres], ['Color Brands', 'color-brands']);
  assert.deepEqual(groupe.apercu, [{ id: 'c:c2', ancien: 'Color Brands', nouveau: 'color-brands', marques: [0], aussi: [] }]);
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
    { id: 'c1', nom: 'components', nombre: 1, analysee: true, palettes: false },
    { id: 'c2', nom: 'primitives', nombre: 2, analysee: false, palettes: true },
    { id: 'c3', nom: 'Color Brands', nombre: 0, analysee: true, palettes: false },
  ]);
  assert.equal(bilan.proteges, 0);
  assert.deepEqual(bilan.dernierRenommage, { nombre: 2, heure: '14:32' });
  assert.equal(bilan.generation, 3);
  assert.equal(projeter(calculer(fichier)).bilan().proteges, 2);
  assert.equal(projeter(calculer(fichier)).bilan().dernierRenommage, null);
  assert.deepEqual(bilan.ecriture.collections, { reconnues: 3, total: 3 });
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
  { type: 'collection', cle: 'collection:c1', collectionId: 'c1', nom: 'Couleurs', nombre: 34, proposee: 'color-brands', score: 4 },
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
  assert.deepEqual(collection, { type: 'collection', cle: 'collection:c1', nom: 'Couleurs', nombre: 34, proposee: 'color-brands' });
  assert.equal(bilan.plusTard[0].type === 'collection' && bilan.plusTard[0].proposee, null);
});

test('sans nom de cible, la paire n’a pas de cible commune', () => {
  const bilan = projeter(calculer(fichierDeBase, { questions: { questions: [questionsDeTest[0]], autres: [] } })).bilan();
  assert.equal(bilan.questions[0].type === 'paire' && bilan.questions[0].cibleCommune, null);
});

// La liste des termes et la fiche

const requete = (reste: Partial<RequeteDeTermes> = {}): RequeteDeTermes => ({ recherche: '', types: [], origines: [], tri: 'alpha', section: null, debut: 0, ...reste });
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
  assert.deepEqual(parMot.get('pressed'), { mot: 'pressed', forme: 'pressed', type: 'remplace', nature: null, origine: 'ucm', statut: 'regle', remplace: ['press'], avec: null, nombre: 2, trouve: null });
  assert.equal(parMot.has('press'), false);
  assert.deepEqual(parMot.get('outlined'), { mot: 'outlined', forme: 'outlined', type: 'remplace', nature: null, origine: 'personnalise', statut: 'regle', remplace: ['outline'], avec: null, nombre: 1, trouve: null });
  assert.equal(parMot.has('outline'), false);
  assert.deepEqual(parMot.get('disabled'), { mot: 'disabled', forme: 'disabled', type: 'sans-regle', nature: null, origine: 'ucm', statut: 'ecart', remplace: [], avec: null, nombre: 0, trouve: null });
  assert.deepEqual(parMot.get('gap'), { mot: 'gap', forme: 'gap', type: 'a-trancher', nature: null, origine: null, statut: 'a-trancher', remplace: [], avec: 'space', nombre: 3, trouve: null });
  assert.deepEqual(parMot.get('button'), { mot: 'button', forme: 'button', type: 'composant', nature: 'composant', origine: null, statut: 'sans-regle', remplace: [], avec: null, nombre: 6, trouve: null });
  assert.equal(parMot.has('extra-small'), false);
  assert.equal(parMot.has('hover'), true);
  const { comptes } = premiers(projection);
  for (const type of TYPES_DE_TERMES) assert.equal(comptes.types[type], liste.filter((terme) => terme.type === type).length, type);
  assert.equal(Object.values(comptes.types).reduce((somme, nombre) => somme + nombre, 0), liste.length);
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
  assert.ok(page.sections.every((section) => section.termes.length === Math.min(section.total, LIGNES_PAR_SECTION)));
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
  assert.deepEqual(terme, { mot: 'extra-small', forme: 'extra-small', type: 'conforme', nature: null, origine: 'personnalise', statut: 'regle', remplace: [], avec: null, nombre: 1, trouve: null });
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
  assert.deepEqual([collection.ancien, collection.nouveau, collection.marques], ['Color Brands', 'color-brands', [0]]);
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
  assert.deepEqual(terme('stress-test'), { mot: 'stress-test', forme: 'StressTest', type: 'composant', nature: 'composant', origine: null, statut: 'sans-regle', remplace: [], avec: null, nombre: 3, trouve: null });
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
  assert.equal(termesDuType(projection, 'conforme').find((terme) => terme.mot === 'line-height')!.forme, 'line-height');
  assert.equal(projection.fiche('line-height').forme, 'line-height');
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

test('line-height compte lineheight et LineHeight, et garde la forme la plus fréquente du fichier pour la recherche', () => {
  const projection = projeter(calculer(playground));
  const lineHeight = toutLeVocabulaire(projection).find((terme) => terme.mot === 'line-height')!;
  assert.deepEqual([lineHeight.nature, lineHeight.nombre, lineHeight.type], [null, 4, 'conforme']);
  assert.deepEqual(mots(aplatir(premiers(projection, { recherche: 'lineheight' }))), ['line-height'], 'la forme du fichier se lit encore');
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
  assert.deepEqual(cherche('lineheight'), ['line-height']);
  assert.deepEqual(cherche('line-height'), ['line-height']);
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
  const seul = toutLeVocabulaire(projeter(calculer(enDossier, { ecriture: pascalEtMinuscules }))).find((terme) => terme.mot === 'sm')!;
  assert.deepEqual([seul.forme, seul.type, seul.remplace], ['Small', 'conforme', []], 'en dossier, small est la forme retenue');
  const avecVariable: Fichier = { ...enDossier, variables: [...enDossier.variables, ...variables(['v3', 'spacing/small'])] };
  const mixte = toutLeVocabulaire(projeter(calculer(avecVariable, { ecriture: pascalEtMinuscules }))).find((terme) => terme.mot === 'sm')!;
  assert.deepEqual([mixte.forme, mixte.type, mixte.remplace], ['sm', 'remplace', ['small']], 'seul le nom de variable est remplacé');
});

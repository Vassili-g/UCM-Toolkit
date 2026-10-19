/** La projection : groupes, lignes, sélection, pages, questions, termes, fiche et effets, sur des calculs réels du kit. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  commencerLexique, indexerVocabulaire, normaliserLeLexique,
  type ConventionsParCategorie, type Lexique, type NomLu, type Question, type ResultatDesQuestions, type TermePersonnalise,
} from '@ucm-kit/core/referentiel';
import type { EntreeInventaire, Inventaire } from '../src/lecture';
import type { EcritureChoisie } from '../src/messages';
import { conflitVue, effetDEcriture, effetDeTerme, projeter, TAILLE_DE_L_APERCU, TAILLE_DE_PAGE, type EntreeDeProjection, type RequeteDeTermes } from '../src/projection';
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

const fichierDesTermes: Fichier = {
  collections: [['c1', 'components']],
  variables: variables(
    ['a', 'button/press/gap'], ['b', 'button/pressed/gap'], ['c', 'button/disable/gap'], ['d', 'button/outline/space'],
    ['e', 'button/hover/space'], ['f', 'button/extra-small/space'],
  ),
};

test('la liste des termes dit le statut, l’origine et ce que chaque terme remplace', () => {
  const projection = projeter(calculer(fichierDesTermes, {
    termes: [outlined], ecarts: ['disabled'],
    questions: { questions: [{ ...questionsDeTest[0], cle: 'paire:gap|space' } as Question], autres: [] },
  }));
  const liste = projection.termes({ recherche: '', filtre: 'tous', debut: 0 });
  const parMot = new Map(liste.termes.map((terme) => [terme.mot, terme]));
  assert.deepEqual(parMot.get('pressed'), { mot: 'pressed', forme: 'pressed', nature: null, origine: 'ucm', statut: 'regle', remplace: ['press'], avec: null, nombre: 1, trouve: null });
  assert.equal(parMot.has('press'), false);
  assert.deepEqual(parMot.get('outlined'), { mot: 'outlined', forme: 'outlined', nature: null, origine: 'personnalise', statut: 'regle', remplace: ['outline'], avec: null, nombre: 0, trouve: null });
  assert.equal(parMot.has('outline'), false);
  assert.deepEqual(parMot.get('disabled'), { mot: 'disabled', forme: 'disabled', nature: null, origine: 'ucm', statut: 'ecart', remplace: [], avec: null, nombre: 0, trouve: null });
  assert.deepEqual(parMot.get('gap'), { mot: 'gap', forme: 'gap', nature: null, origine: null, statut: 'a-trancher', remplace: [], avec: 'space', nombre: 3, trouve: null });
  assert.deepEqual(parMot.get('button'), { mot: 'button', forme: 'button', nature: 'composant', origine: null, statut: 'sans-regle', remplace: [], avec: null, nombre: 6, trouve: null });
  assert.equal(parMot.has('extra-small'), false);
  assert.equal(parMot.has('hover'), true);
  assert.deepEqual(liste.comptes, {
    tous: liste.total, avecRegle: liste.termes.filter((t) => t.statut === 'regle' || t.statut === 'ecart').length,
    sansRegle: liste.termes.filter((t) => (t.statut === 'a-trancher' || t.statut === 'sans-regle') && t.nature === null).length, composants: 1, palettes: 0,
  });
  assert.deepEqual(liste.termes.slice(0, 2).map((terme) => terme.mot), ['button', 'gap']);
});

test('la recherche trouve une référence par une de ses variantes et le dit', () => {
  const projection = projeter(calculer(fichierDesTermes, { termes: [{ terme: ['extra', 'small'], remplace: [['xs']] }] }));
  const parVariante = projection.termes({ recherche: 'XS', filtre: 'tous', debut: 0 });
  assert.deepEqual(parVariante.termes.map((terme) => [terme.mot, terme.trouve]), [['extra-small', 'xs']]);
  const parMot = projection.termes({ recherche: 'extra-s', filtre: 'tous', debut: 0 });
  assert.deepEqual(parMot.termes.map((terme) => [terme.mot, terme.trouve]), [['extra-small', null]]);
  assert.equal(projection.termes({ recherche: '', filtre: 'tous', debut: 0 }).termes.every((terme) => terme.trouve === null), true);
  assert.equal(projection.termes({ recherche: 'xs', filtre: 'sans-regle', debut: 0 }).total, 0);
  assert.equal(projection.termes({ recherche: 'xs', filtre: 'avec-regle', debut: 0 }).total, 1);
});

test('les filtres et la recherche réduisent la liste sans changer les comptes', () => {
  const projection = projeter(calculer(fichierDesTermes, { termes: [outlined], ecarts: ['disabled'] }));
  const tous = projection.termes({ recherche: '', filtre: 'tous', debut: 0 });
  const avec = projection.termes({ recherche: '', filtre: 'avec-regle', debut: 0 });
  const sans = projection.termes({ recherche: '', filtre: 'sans-regle', debut: 0 });
  const composants = projection.termes({ recherche: '', filtre: 'composants', debut: 0 });
  assert.deepEqual(composants.termes.map((terme) => terme.mot), ['button']);
  assert.equal(avec.total + sans.total + composants.total, tous.total, 'un nom n’est ni avec règle ni sans règle');
  assert.ok(avec.termes.every((terme) => terme.statut === 'regle' || terme.statut === 'ecart'));
  assert.ok(sans.termes.every((terme) => (terme.statut === 'sans-regle' || terme.statut === 'a-trancher') && terme.nature === null));
  assert.deepEqual(avec.comptes, tous.comptes);
  const recherche = projection.termes({ recherche: '  PRESS ', filtre: 'tous', debut: 0 });
  assert.deepEqual(recherche.termes.map((terme) => [terme.mot, terme.trouve]), [['pressed', null]]);
  assert.equal(recherche.total, 1);
  assert.deepEqual(recherche.comptes, tous.comptes);
  assert.equal(projection.termes({ recherche: 'press', filtre: 'sans-regle', debut: 0 }).total, 0);
});

test('une page de termes porte cinquante entrées', () => {
  const mots = Array.from({ length: 130 }, (_, rang) => ({ id: `n${rang}`, nom: `groupe/mot${String.fromCharCode(97 + (rang % 26))}${String.fromCharCode(97 + Math.floor(rang / 26))}x` }));
  const projection = projeter(calculer({ collections: [['c1', 'components']], variables: mots }));
  const pages = [0, 50, 100, 150].map((debut) => projection.termes({ recherche: 'mot', filtre: 'tous', debut }));
  assert.deepEqual(pages.map((page) => page.termes.length), [50, 50, 30, 0]);
  assert.ok(pages.every((page) => page.total === 130));
  assert.equal(new Set(pages.flatMap((page) => page.termes.map((terme) => terme.mot))).size, 130);
});

test('la fiche d’un terme UCM garde sa définition, ses formes remplacées et ses exemples', () => {
  const fiche = projeter(calculer(fichierDesTermes)).fiche('Pressed');
  assert.equal(fiche.mot, 'pressed');
  assert.equal(fiche.origine, 'ucm');
  assert.equal(typeof fiche.categorieUcm, 'string');
  assert.ok(fiche.definition && fiche.definition.length > 0);
  assert.deepEqual(fiche.remplace, [{ mot: 'press', nombre: 1, ucm: true }]);
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
  assert.deepEqual(personnalise.remplace, [{ mot: 'outline', nombre: 1, ucm: false }]);
  const gap = projection.fiche('gap');
  assert.deepEqual([gap.origine, gap.voulu, gap.distincts, gap.question], [null, true, ['space'], 'paire:gap|space']);
  assert.equal(projection.fiche('space').distincts[0], 'gap');
  const ecart = projeter(calculer(fichierDesTermes, { ecarts: ['disabled'] })).fiche('disabled');
  assert.deepEqual([ecart.ecart, ecart.origine], [true, 'ucm']);
});

test('un terme de plusieurs mots se compte par la suite de ses mots', () => {
  const projection = projeter(calculer(fichierDesTermes, { termes: [{ terme: ['extra', 'small'], remplace: [['xs']] }] }));
  assert.equal(projection.fiche('extra-small').emploi.nombre, 1);
  const terme = projection.termes({ recherche: 'extra-small', filtre: 'tous', debut: 0 }).termes[0];
  assert.deepEqual(terme, { mot: 'extra-small', forme: 'extra-small', nature: null, origine: 'personnalise', statut: 'regle', remplace: ['xs'], avec: null, nombre: 1, trouve: null });
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

/** Toutes les pages d'un filtre, du premier terme au dernier. */
function listeComplete(projection: ReturnType<typeof projeter>, filtre: RequeteDeTermes['filtre']) {
  const termes = [];
  for (let debut = 0; ; debut += TAILLE_DE_PAGE) {
    const page = projection.termes({ recherche: '', filtre, debut });
    termes.push(...page.termes);
    if (termes.length >= page.total) return { termes, comptes: page.comptes };
  }
}

test('les morceaux de termes et les noms de collections n’ont plus de ligne', () => {
  const { termes } = listeComplete(projeter(calculer(playground)), 'tous');
  const mots = new Set(termes.map((terme) => terme.mot));
  for (const absent of ['line', 'height', 'stress', 'test', 'wrap', 'columns', 'text', 'components', 'primitives', 'typography', 'theme']) {
    assert.equal(mots.has(absent), false, absent);
  }
  for (const present of ['stress-test', 'scale-wrap', 'text-columns', 'line-height', 'font-size', 'button', 'poppy']) assert.equal(mots.has(present), true, present);
});

test('un nom de composant se compte une fois par nom et porte sa forme et sa nature', () => {
  const projection = projeter(calculer(playground));
  const { termes } = listeComplete(projection, 'tous');
  const terme = (mot: string) => termes.find((autre) => autre.mot === mot)!;
  assert.deepEqual(terme('stress-test'), { mot: 'stress-test', forme: 'StressTest', nature: 'composant', origine: null, statut: 'sans-regle', remplace: [], avec: null, nombre: 3, trouve: null });
  assert.deepEqual([terme('button').forme, terme('button').nature, terme('button').nombre], ['Button', 'composant', 3]);
  assert.deepEqual([terme('scale-wrap').forme, terme('scale-wrap').nature, terme('scale-wrap').nombre], ['ScaleWrap', null, 2]);
  assert.deepEqual([terme('text-columns').forme, terme('text-columns').nature], ['TextColumns', null]);
  assert.deepEqual([terme('poppy').forme, terme('poppy').nature, terme('poppy').nombre], ['Poppy', 'palette', crans.length]);
  assert.equal(terme('info').nature, null);
});

test('line-height compte lineheight et LineHeight, et garde la forme la plus fréquente', () => {
  const projection = projeter(calculer(playground));
  const { termes } = listeComplete(projection, 'tous');
  const lineHeight = termes.find((terme) => terme.mot === 'line-height')!;
  assert.deepEqual([lineHeight.forme, lineHeight.nature, lineHeight.nombre], ['lineheight', null, 4]);
  assert.deepEqual(projection.fiche('line-height').emploi.exemples.map((ligne) => [ligne.ancien, ligne.marques]), [
    ['lineheight/3xl', [0]], ['lineheight/xl', [0]], ['lineheight/base', [0]],
  ]);
  assert.equal(projection.fiche('line-height').emploi.nombre, 4);
});

test('à égalité, la forme est la première rencontrée ; une forme partielle garde ses séparateurs d’origine', () => {
  const egalite: Fichier = { collections: [['c', 'theme']], variables: variables(['a', 'lineHeight/a'], ['b', 'lineheight/b']) };
  assert.equal(projeter(calculer(egalite)).fiche('line-height').forme, 'lineHeight');
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
  const sans = listeComplete(projection, 'sans-regle').termes.map((terme) => terme.mot);
  for (const nom of ['button', 'stress-test', 'poppy']) assert.equal(sans.includes(nom), false, nom);
  assert.deepEqual(sans, ['outlined', 'scale-wrap', 'padding', 'text-columns'], 'les mots du fichier et les noms de groupe que ni le référentiel ni une règle ne couvrent');
  const composants = listeComplete(projection, 'composants').termes.map((terme) => terme.mot).sort();
  assert.deepEqual(composants, ['button', 'stress-test']);
  assert.deepEqual(listeComplete(projection, 'palettes').termes.map((terme) => terme.mot), ['poppy']);
});

test('les cinq comptes sont ceux des cinq filtres et ne changent pas avec la recherche', () => {
  const projection = projeter(calculer(playground));
  const { termes, comptes } = listeComplete(projection, 'tous');
  assert.equal(comptes.tous, termes.length);
  assert.equal(comptes.avecRegle, listeComplete(projection, 'avec-regle').termes.length);
  assert.equal(comptes.sansRegle, listeComplete(projection, 'sans-regle').termes.length);
  assert.equal(comptes.composants, 2);
  assert.equal(comptes.palettes, 1);
  assert.equal(comptes.tous, comptes.avecRegle + comptes.sansRegle + comptes.composants + comptes.palettes, 'aucun nom n’a de règle ici : chaque terme est dans un seul groupe');
  assert.deepEqual(projection.termes({ recherche: 'xyz', filtre: 'palettes', debut: 0 }), { termes: [], total: 0, comptes });
});

test('la recherche lit la clé, la forme et les variantes', () => {
  const projection = projeter(calculer(playground));
  const cherche = (recherche: string) => projection.termes({ recherche, filtre: 'tous', debut: 0 }).termes.map((terme) => terme.mot);
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
  assert.deepEqual([projection.fiche('poppy').nature, projection.fiche('info').nature, projection.fiche('info').forme], ['palette', null, 'Info']);
});

test('un terme règle ne perd pas sa nature, et une question ne rend jamais un nom « à trancher »', () => {
  const entree = calculer(playground, {
    termes: [{ terme: ['button'], remplace: [['btn']] }],
    questions: { questions: [{ type: 'paire', cle: 'paire:outlined|stress-test', indice: 'synonymes', termes: [termeEnQuestion('outlined', 2, ['b1']), termeEnQuestion('stress-test', 3, ['s1'])], propose: 0, score: 5 }], autres: [] },
  });
  const projection = projeter(entree);
  const { termes } = listeComplete(projection, 'tous');
  const button = termes.find((terme) => terme.mot === 'button')!;
  assert.deepEqual([button.statut, button.nature, button.avec], ['regle', 'composant', null]);
  assert.equal(termes.find((terme) => terme.mot === 'stress-test')!.statut, 'sans-regle');
  assert.deepEqual(termes.find((terme) => terme.mot === 'outlined')!.statut, 'a-trancher');
  assert.equal(projection.fiche('stress-test').question, null);
  assert.equal(projection.fiche('outlined').question, 'paire:outlined|stress-test');
  assert.equal(listeComplete(projection, 'avec-regle').termes.some((terme) => terme.mot === 'button'), true);
  assert.equal(listeComplete(projection, 'composants').termes.some((terme) => terme.mot === 'button'), true);
  assert.equal(listeComplete(projection, 'sans-regle').termes.some((terme) => terme.mot === 'outlined'), true);
});

test('le détail du vocabulaire porte la forme et la nature de chaque terme, et les natures et termes de chaque nom', () => {
  const projection = projeter(calculer(playground));
  const detail = projection.diagnostic();
  const terme = detail.termes.find((autre) => autre.mot === 'stress-test')!;
  assert.deepEqual([terme.forme, terme.nature, terme.nombre], ['StressTest', 'composant', 3]);
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
  assert.equal(detail.termes.length, listeComplete(projection, 'tous').termes.length);
});

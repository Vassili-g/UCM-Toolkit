/** La projection : groupes, lignes, sélection, pages, questions, termes, fiche et effets, sur des calculs réels du kit. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  commencerLexique, indexerVocabulaire, normaliserLeLexique,
  type ConventionsParCategorie, type Lexique, type NomLu, type Question, type ResultatDesQuestions, type TermePersonnalise,
} from '@ucm-kit/core/referentiel';
import type { EntreeInventaire, Inventaire } from '../src/lecture';
import type { EcritureChoisie } from '../src/messages';
import { conflitVue, effetDEcriture, effetDeTerme, projeter, TAILLE_DE_L_APERCU, TAILLE_DE_PAGE, type EntreeDeProjection } from '../src/projection';
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
        id: variable.id, categorie: 'variables', portee: collectionId, nom: variable.nom,
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
    { sorte: 'terme', origine: 'ucm' }, { sorte: 'terme', origine: 'ucm' }, { sorte: 'terme', origine: 'personnalise' },
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
  assert.deepEqual(v1, { id: 'v1', avant: 'Button/', terme: 'press', apres: '/fontSize', aussi: ['ecriture:groupes', 'ecriture:variables'] });
  const dansLEcriture = projection.lignes('ecriture:variables', 0).lignes.find((ligne) => ligne.id === 'v1')!;
  assert.deepEqual(dansLEcriture, { id: 'v1', avant: 'Button/press/', terme: 'fontSize', apres: '', aussi: ['terme:pressed', 'ecriture:groupes'] });
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
  assert.deepEqual(groupe.apercu, [{ id: 'c:c2', avant: '', terme: 'Color Brands', apres: '', aussi: [] }]);
  assert.equal(groupe.autres, 0);
});

test('un groupe d’écriture montre le segment réécrit', () => {
  const groupe = projeter(calculer(fichierDeBase)).bilan().groupes.find((autre) => autre.cle === 'ecriture:variables')!;
  assert.deepEqual([groupe.avant, groupe.apres], ['fontSize', 'font-size']);
  assert.deepEqual(groupe.apercu[0], { id: 'v13', avant: 'tile/hover/', terme: 'fontSize', apres: '', aussi: [] });
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
  assert.deepEqual(pages[0].lignes[0], { id: 'n0', avant: 'x0/', terme: 'press', apres: '/gap', aussi: [] });
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
  assert.deepEqual(ecriture.groupes.exemple, { id: 'a', avant: 'button/', terme: 'Sizes', apres: '/fontSize', aussi: [] });
  assert.equal(ecriture.variables.total, 4);
  assert.equal(ecriture.variables.suivent, 3);
  assert.deepEqual(ecriture.variables.exemple, { id: 'a', avant: 'button/Sizes/', terme: 'fontSize', apres: '', aussi: [] });
  assert.deepEqual(ecriture.variables.convention, minusculesTirets);
});

// Les questions

const termeEnQuestion = (mot: string, nombre: number, exemples: readonly string[], ucm = false) => ({ mot, nombre, exemples, ucm });
const questionsDeTest: readonly Question[] = [
  { type: 'paire', cle: 'paire:gap|space', indice: 'synonymes', termes: [termeEnQuestion('gap', 3, ['v4', 'v5']), termeEnQuestion('space', 1, ['v6'], true)], propose: 1, score: 5, cibleAlias: 'ALIAS' },
  { type: 'ecriture-du-terme', cle: 'ecriture-du-terme:faute:color|colour', indice: 'faute', terme: termeEnQuestion('colour', 1, ['v9']), proposition: ['color'], reference: { mot: 'color', nombre: 3 }, score: 3 },
  { type: 'echelle', cle: 'echelle:a', formes: [['sm', 'gap'], ['small', 'medium']], nombres: [2, 1], exemples: ['v4', null], propose: 0, score: 2 },
  { type: 'collection', cle: 'collection:c1', collectionId: 'c1', nom: 'Couleurs', nombre: 34, proposee: 'color-brands', score: 4 },
  { type: 'collection', cle: 'collection:c2', collectionId: 'c2', nom: 'Typo', nombre: 3, score: 4 },
];

test('les questions deviennent des vues, les questions mises de côté vont à plusTard', () => {
  const questions: ResultatDesQuestions = {
    questions: questionsDeTest,
    autres: [{ ...questionsDeTest[4], cle: 'collection:c3' } as Question, { ...questionsDeTest[4], cle: 'collection:c4' } as Question],
  };
  const entree = { ...calculer(fichierDeBase, { questions, regles: { plusTard: ['collection:c2', 'collection:c4'] } }), nomDeLaCible: (id: string) => (id === 'ALIAS' ? 'theme/surface' : undefined) };
  const bilan = projeter(entree).bilan();
  assert.equal(bilan.autresPistes, 1);
  assert.deepEqual(bilan.plusTard.map((question) => question.cle), ['collection:c2']);
  assert.deepEqual(bilan.questions.map((question) => question.cle), ['paire:gap|space', 'ecriture-du-terme:faute:color|colour', 'echelle:a', 'collection:c1']);

  const [paire, faute, echelle, collection] = bilan.questions;
  assert.deepEqual(paire, {
    type: 'paire', cle: 'paire:gap|space', indice: 'synonymes', propose: 1, cibleCommune: 'theme/surface',
    termes: [
      { mot: 'gap', nombre: 3, ucm: false, exemples: [{ id: 'v4', avant: 'card/hover/', terme: 'gap', apres: '', aussi: [] }, { id: 'v5', avant: 'card/outline/', terme: 'gap', apres: '', aussi: [] }] },
      { mot: 'space', nombre: 1, ucm: true, exemples: [{ id: 'v6', avant: 'Tile/hover/', terme: 'space', apres: '', aussi: [] }] },
    ],
  } satisfies typeof paire);
  assert.equal(faute.type === 'ecriture-du-terme' && faute.terme.exemples[0].terme, 'colour');
  assert.deepEqual(faute.type === 'ecriture-du-terme' && [faute.proposition, faute.reference], [['color'], { mot: 'color', nombre: 3 }]);
  assert.deepEqual(echelle.type === 'echelle' && echelle.exemples, [{ id: 'v4', avant: 'card/hover/', terme: 'gap', apres: '', aussi: [] }, null]);
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
  assert.deepEqual(parMot.get('pressed'), { mot: 'pressed', origine: 'ucm', statut: 'regle', remplace: ['press'], avec: null, nombre: 1 });
  assert.deepEqual(parMot.get('press'), { mot: 'press', origine: 'ucm', statut: 'regle', remplace: [], avec: 'pressed', nombre: 1 });
  assert.deepEqual(parMot.get('outlined'), { mot: 'outlined', origine: 'personnalise', statut: 'regle', remplace: ['outline'], avec: null, nombre: 0 });
  assert.deepEqual(parMot.get('outline'), { mot: 'outline', origine: 'personnalise', statut: 'regle', remplace: [], avec: 'outlined', nombre: 1 });
  assert.deepEqual(parMot.get('disabled'), { mot: 'disabled', origine: 'ucm', statut: 'ecart', remplace: [], avec: null, nombre: 0 });
  assert.deepEqual(parMot.get('gap'), { mot: 'gap', origine: null, statut: 'a-trancher', remplace: [], avec: 'space', nombre: 3 });
  assert.deepEqual(parMot.get('button'), { mot: 'button', origine: null, statut: 'sans-regle', remplace: [], avec: null, nombre: 6 });
  assert.equal(parMot.has('extra-small'), false);
  assert.equal(parMot.has('hover'), true);
  assert.deepEqual(liste.comptes, { tous: liste.total, avecRegle: liste.termes.filter((t) => t.statut === 'regle' || t.statut === 'ecart').length, sansRegle: liste.termes.filter((t) => t.statut === 'a-trancher' || t.statut === 'sans-regle').length });
  assert.deepEqual(liste.termes.slice(0, 2).map((terme) => terme.mot), ['button', 'gap']);
});

test('les filtres et la recherche réduisent la liste sans changer les comptes', () => {
  const projection = projeter(calculer(fichierDesTermes, { termes: [outlined], ecarts: ['disabled'] }));
  const tous = projection.termes({ recherche: '', filtre: 'tous', debut: 0 });
  const avec = projection.termes({ recherche: '', filtre: 'avec-regle', debut: 0 });
  const sans = projection.termes({ recherche: '', filtre: 'sans-regle', debut: 0 });
  assert.equal(avec.total + sans.total, tous.total);
  assert.ok(avec.termes.every((terme) => terme.statut === 'regle' || terme.statut === 'ecart'));
  assert.ok(sans.termes.every((terme) => terme.statut === 'sans-regle' || terme.statut === 'a-trancher'));
  assert.deepEqual(avec.comptes, tous.comptes);
  const recherche = projection.termes({ recherche: '  PRESS ', filtre: 'tous', debut: 0 });
  assert.deepEqual(recherche.termes.map((terme) => terme.mot).sort(), ['press', 'pressed']);
  assert.equal(recherche.total, 2);
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
  assert.deepEqual(fiche.emploi, { nombre: 1, exemples: [{ id: 'b', avant: 'button/', terme: 'pressed', apres: '/gap', aussi: [] }] });
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
  assert.deepEqual(terme, { mot: 'extra-small', origine: 'personnalise', statut: 'regle', remplace: ['xs'], avec: null, nombre: 1 });
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
  assert.deepEqual(effet, { sorte: 'terme', avant: 'outline', apres: 'outlined', nombre: 1, exemple: { id: 'd', avant: 'button/', terme: 'outline', apres: '/space', aussi: [] } });
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

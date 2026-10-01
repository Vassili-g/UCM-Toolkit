/** Les collections des bibliothèques distantes et « Copier dans le plugin », contre un double de Figma ([VAR-14]). */
import assert from 'node:assert/strict';
import test from 'node:test';

import { fnv1a, jsonCanonique, octetsUtf8, recetteParDefaut, type Recette } from 'ucm-couleur';

import { copierLaPalette, ecrireLesVariables, type FigmaDeLaCopie, type FigmaDesVariablesEcrites } from '../src/ecriture/variables';
import { lireEtat } from '../src/lecture';
import { lireLesBibliotheques, lireLesVariablesDuFichier, lireLeSuiviRange } from '../src/lectureDesVariables';
import { palettesDeLaCollection } from '../src/variables/bibliotheques';
import { tokensDeLaPalette } from '../src/variables/gestion';
import { FauxFigma } from './figmaDeTest';

const TAILWIND = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const GRAY = ['#F9FAFB', '#F3F4F6', '#E5E7EB', '#D1D5DB', '#9CA3AF', '#6B7280', '#4B5563', '#374151', '#1F2937', '#111827', '#030712'];

const rampe = (chemin: string, modes = 1): { [nom: string]: string[] } =>
  Object.fromEntries(TAILWIND.map((nuance, rang) => [`${chemin}/${nuance}`, Array.from({ length: modes }, (_, colonne) => (colonne === 0 ? GRAY[rang] : GRAY[10 - rang]))]));

/** Un fichier où deux bibliothèques publient chacune une collection « primitive base », l'une de 23 variables, l'autre de 6. */
function fichier(): FauxFigma {
  const figma = new FauxFigma();
  figma.bibliotheque('Design system', 'primitive base', ['Mode 1'], { ...rampe('gray'), ...rampe('brand/blue') }, ['spacing/4']);
  figma.bibliotheque('Ancien kit', 'primitive base', ['Light', 'Dark'], { ...Object.fromEntries(Object.entries(rampe('zinc', 2)).slice(0, 4)), 'white': ['#FFFFFF', '#000000'] }, ['radius/2']);
  figma.journal.length = 0;
  return figma;
}

const copie = (figma: FauxFigma) => figma as unknown as FigmaDeLaCopie;
const ecriture = (figma: FauxFigma) => figma as unknown as FigmaDesVariablesEcrites;
const empreinte = (recette: Recette): string => fnv1a(octetsUtf8(jsonCanonique(recette)));

test('[VAR-14] la lecture liste les collections des bibliothèques, leur nombre de variables et leurs palettes, sur les seuls noms', async () => {
  const figma = fichier();
  const lues = await lireLesBibliotheques(figma as never);
  assert.equal(lues.lisibles, true);
  // Deux collections du même nom se distinguent par leur nombre de variables.
  assert.deepEqual(lues.collections.map(({ nom, bibliotheque, variables }) => [nom, bibliotheque, variables]), [
    ['primitive base', 'Design system', 23],
    ['primitive base', 'Ancien kit', 6],
  ]);
  assert.deepEqual(lues.palettes.map(({ nomDeLaCollection, variablesDeLaCollection, chemin, nuances }) => [nomDeLaCollection, variablesDeLaCollection, chemin, nuances.length]), [
    ['primitive base', 23, 'gray', 11],
    ['primitive base', 23, 'brand/blue', 11],
  ]);
  assert.deepEqual(lues.palettes[0].nuances, TAILWIND);
  // Aucune variable n'est importée pour lire : la couleur ne se connaît qu'à la copie.
  assert.equal(figma.importees.size, 0);
  assert.deepEqual(figma.journal, []);
});

test('[VAR-14] une rampe de quatre variables, une variable d’un autre type et un nom sans nuance ne font pas une palette', () => {
  const collection = { cle: 'c', nom: 'Tokens', bibliotheque: 'Kit', variables: 0 };
  const variable = (nom: string, couleur = true) => ({ nom, cle: nom, couleur });
  const palettes = palettesDeLaCollection(collection, [
    ...[100, 200, 300, 400].map((nuance) => variable(`court/${nuance}`)),
    ...[1, 2, 3, 4, 5].map((nuance) => variable(`spacing/${nuance}`, false)),
    ...['a', 'b', 'c', 'd', 'e'].map((nom) => variable(`brand/${nom}`)),
    ...[500, 50, 100, 300, 900, 100].map((nuance) => variable(`bleu/${nuance}`)),
    // Une variable d'un autre type sous le même chemin n'est pas une nuance.
    variable('bleu/700', false),
  ]);
  assert.deepEqual(palettes.map(({ chemin, nuances }) => [chemin, nuances]), [['bleu', [50, 100, 300, 500, 900]]]);
});

test('[VAR-14] sans `teamLibrary`, ou quand Figma lève, la lecture rend une liste vide, dite illisible, et l’état se lit quand même', async () => {
  const sans = new FauxFigma();
  assert.deepEqual(await lireLesBibliotheques({}), { collections: [], palettes: [], lisibles: false });
  sans.bibliothequesRefusees = true;
  const lues = await lireLesBibliotheques(sans as never);
  assert.deepEqual(lues, { collections: [], palettes: [], lisibles: false });
  const etat = await lireLesVariablesDuFichier(sans as never, lues);
  assert.deepEqual([etat.collections, etat.variables, etat.bibliotheques?.lisibles], [[], [], false]);
});

test('[VAR-14] « Copier dans le plugin » importe les variables de la seule palette, lit leurs couleurs et range la recette sous un seul commitUndo', async () => {
  const figma = fichier();
  const [collection] = figma.distantes;
  const issue = await copierLaPalette(copie(figma), { empreinteLue: null, palette: 'p-000000b1', source: { collection: collection.key, chemin: 'gray' } });
  const { classement, empreinte: rangee } = lireEtat(figma.root);
  assert.equal(classement.etat, 'courante');
  if (classement.etat !== 'courante') return;
  assert.deepEqual(issue, { issue: 'copiee', empreinte: empreinte(classement.recette), importees: 11 });
  assert.equal(rangee, empreinte(classement.recette));
  assert.deepEqual(figma.journal, [...TAILWIND.map((nuance) => `importer gray/${nuance}`), 'commitUndo']);
  assert.equal(figma.importees.size, 11);

  const [palette] = classement.recette.palettes;
  assert.deepEqual([palette.id, palette.nom, palette.reference, palette.intensites, palette.figees], ['p-000000b1', 'gray', GRAY[6], 1, undefined]);
  // La copie n'a pas de liaison : ses tokens ne sont pas encore écrits, et s'écriront dans la destination.
  assert.equal(lireLeSuiviRange(figma.root).palettes[palette.id], undefined);
  const lu = await lireLesVariablesDuFichier(ecriture(figma));
  assert.deepEqual([tokensDeLaPalette(classement.recette, palette, lu).etat, tokensDeLaPalette(classement.recette, palette, lu).reprise], ['jamais-ecrits', false]);
});

test('[VAR-14] la copie s’écrit dans la destination des tokens, jamais dans la bibliothèque', async () => {
  const figma = fichier();
  const [collection] = figma.distantes;
  const origine = collection.publiees.map((variable) => JSON.stringify(variable.valuesByMode));
  await copierLaPalette(copie(figma), { empreinteLue: null, palette: 'p-000000b1', source: { collection: collection.key, chemin: 'gray' } });
  const { classement, empreinte: lue } = lireEtat(figma.root);
  const resultat = await ecrireLesVariables(ecriture(figma), { palettes: ['p-000000b1'], empreinteLue: lue, remettre: [] });
  assert.deepEqual(resultat, { issue: 'ecrites', palettes: [{ palette: 'p-000000b1', issue: 'ecrite', creees: 22, ecrites: 22 }] });
  const [locale] = [...figma.collections.values()];
  assert.equal(locale.name, 'primitives');
  assert.equal(figma.variablesDe(locale)[0].name, 'colors/gray/light/50');
  assert.deepEqual(collection.publiees.map((variable) => JSON.stringify(variable.valuesByMode)), origine);
  assert.equal(classement.etat, 'courante');
});

test('[VAR-14] une copie dans un fichier qui porte déjà des palettes les garde, et deux modes Light et Dark donnent leurs deux rampes à lire', async () => {
  const figma = new FauxFigma();
  const collection = figma.bibliotheque('Kit', 'Thèmes', ['Light', 'Dark'], rampe('accent', 2));
  const avant = { ...recetteParDefaut(), seuils: { ...recetteParDefaut().seuils, texte: 7 } };
  figma.root.setSharedPluginData('ucm_palettes', 'recette', jsonCanonique(avant));
  const issue = await copierLaPalette(copie(figma), { empreinteLue: empreinte(avant), palette: 'p-000000b2', source: { collection: collection.key, chemin: 'accent' } });
  assert.equal(issue.issue, 'copiee');
  const { classement } = lireEtat(figma.root);
  assert.equal(classement.etat === 'courante' && classement.recette.seuils.texte, 7);
  assert.equal(classement.etat === 'courante' && classement.recette.palettes[0].reference, GRAY[6]);
});

test('[VAR-14] la copie refuse une recette changée ailleurs, une palette que la bibliothèque ne porte plus, et un import que Figma refuse', async () => {
  const figma = fichier();
  const [collection] = figma.distantes;
  const demande = { empreinteLue: null, palette: 'p-000000b1', source: { collection: collection.key, chemin: 'gray' } };
  assert.deepEqual(await copierLaPalette(copie(figma), { ...demande, empreinteLue: 'aaaaaaaa' }), { issue: 'modifiee-ailleurs' });
  assert.deepEqual(await copierLaPalette(copie(figma), { ...demande, source: { ...demande.source, chemin: 'zinc' } }), { issue: 'palette-introuvable' });
  assert.equal((await copierLaPalette(copie(figma), { ...demande, source: { collection: 'inconnue', chemin: 'gray' } })).issue, 'bibliotheque-illisible');
  figma.importsRefuses = true;
  const refusee = await copierLaPalette(copie(figma), demande);
  assert.equal(refusee.issue, 'bibliotheque-illisible');
  assert.match(refusee.issue === 'bibliotheque-illisible' ? refusee.message : '', /import refusé/);
  assert.equal(await copierLaPalette({ ...copie(figma), teamLibrary: undefined } as FigmaDeLaCopie, demande).then((issue) => issue.issue), 'bibliotheque-illisible');
  assert.equal(figma.root.getSharedPluginData('ucm_palettes', 'recette'), '');
  assert.deepEqual(figma.journal.filter((ligne) => ligne === 'commitUndo'), []);
  // Un identifiant de palette mal formé rend la recette invalide : rien n'est rangé.
  figma.importsRefuses = false;
  assert.equal((await copierLaPalette(copie(figma), { ...demande, palette: 'copie' })).issue, 'invalide');
  assert.equal(figma.root.getSharedPluginData('ucm_palettes', 'recette'), '');
});

test('[VAR-14] des variables de bibliothèque qui ne portent que des alias n’ont aucune couleur à copier', async () => {
  const figma = new FauxFigma();
  const collection = figma.bibliotheque('Kit', 'Alias', ['Mode 1'], rampe('brand'));
  for (const variable of (collection as unknown as { publiees: { valuesByMode: Record<string, unknown> }[] }).publiees) {
    for (const mode of Object.keys(variable.valuesByMode)) variable.valuesByMode[mode] = { type: 'VARIABLE_ALIAS', id: 'VariableID:0:0' };
  }
  assert.deepEqual(await copierLaPalette(copie(figma), { empreinteLue: null, palette: 'p-000000b1', source: { collection: collection.key, chemin: 'brand' } }), { issue: 'sans-couleur' });
  assert.equal(figma.root.getSharedPluginData('ucm_palettes', 'recette'), '');
});

/** Ce que l'écran affiche d'une analyse se calcule sans DOM. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { analyserInventaire } from '../src/analyse';
import type { EntreeInventaire } from '../src/lecture';
import {
  bilanDeLAnalyse, doublonsDeLAnalyse, ecritureDeValeur, grouperLesRenommages, libelleDEcriture,
  lignesDEcriture, nombreDeNomsBloques, texteDApplication, texteDeSelection, valeurDEcriture,
} from '../src/ui/presentation';

const variable = (rang: number, nom: string, renommable = true): EntreeInventaire => ({
  nom: { id: `v${rang}`, categorie: 'variables', portee: 'c', nom },
  cible: { type: 'variable', variableId: `v${rang}`, collectionId: 'c' },
  contexte: { collection: 'Tokens' },
  renommable,
});
const inventaire = (...noms: string[]) => ({ entrees: noms.map((nom, rang) => variable(rang, nom)), pages: [] });
const tiret = { casse: 'minuscules', separateur: 'tiret' } as const;

test('les propositions se rangent par raison, dans un ordre fixe, et un terme UCM l’emporte', () => {
  const analyse = analyserInventaire(inventaire('Font Size', 'color/Blue', 'lineHeight', 'press-state', 'a-b'), { variables: tiret }, true);
  const groupes = grouperLesRenommages(analyse);
  assert.deepEqual(groupes.map((groupe) => [groupe.raison, groupe.lignes.map((ligne) => ligne.ancien)]), [
    ['casse-separateur', ['Font Size', 'lineHeight']],
    ['casse', ['color/Blue']],
    ['terme', ['press-state']],
  ]);
  assert.equal(groupes[0].lignes[0].nouveau, 'font-size');
  assert.equal(groupes[0].lignes[0].contexte, 'Tokens');
});

test('une proposition qui ne change que le séparateur forme son propre groupe', () => {
  const groupes = grouperLesRenommages(analyserInventaire(inventaire('font_size'), { variables: tiret }));
  assert.deepEqual(groupes.map((groupe) => groupe.raison), ['separateur']);
});

test('le bilan nomme le nombre de noms et dit pourquoi il n’y a rien à faire', () => {
  assert.equal(bilanDeLAnalyse(analyserInventaire(inventaire('A B'), { variables: tiret })).titre, '1 nom à harmoniser');
  assert.equal(bilanDeLAnalyse(analyserInventaire(inventaire('A B', 'C D'), { variables: tiret })).titre, '2 noms à harmoniser');
  const conforme = bilanDeLAnalyse(analyserInventaire(inventaire('a-b'), { variables: tiret }));
  assert.deepEqual(conforme, { titre: 'Aucun nom à harmoniser', aide: 'Tous les noms suivent déjà l’écriture choisie.' });
});

test('un doublon nomme les noms qui voulaient changer et laisse l’occupant en place', () => {
  const analyse = analyserInventaire({ entrees: [variable(0, 'A B'), variable(1, 'a-b', false)], pages: [] }, { variables: tiret });
  assert.equal(analyse.normalisation.propositions.length, 0);
  const doublons = doublonsDeLAnalyse(analyse);
  assert.deepEqual(doublons, [[{ categorie: 'variables', ancien: 'A B', nouveau: 'a-b' }]]);
  assert.equal(nombreDeNomsBloques(doublons), 1);
  assert.equal(bilanDeLAnalyse(analyse).aide, 'Les noms restants sont bloqués par un doublon.');
});

test('l’écriture détectée porte ses comptes et l’écriture choisie reste dans la liste', () => {
  const analyse = analyserInventaire(inventaire('font-size', 'line-height', 'Color'));
  const variables = lignesDEcriture(analyse).find((ligne) => ligne.categorie === 'variables')!;
  assert.equal(variables.detectee, 'Minuscules · tirets');
  assert.equal(variables.compte, '2 sur 3');
  assert.equal(variables.choisie, valeurDEcriture(tiret));
  assert.ok(variables.options.some((option) => option.valeur === variables.choisie));
  const collections = lignesDEcriture(analyse).find((ligne) => ligne.categorie === 'collections')!;
  assert.equal(collections.compte, 'Aucun nom');
});

test('la ligne des groupes n’existe que si une variable a des groupes', () => {
  const pascal = { casse: 'PascalCase', separateur: 'camelCase' } as const;
  const sans = lignesDEcriture(analyserInventaire(inventaire('opacity')));
  assert.deepEqual(sans.map((ligne) => ligne.categorie), ['collections', 'variables', 'proprietes', 'valeurs']);
  const entree = variable(0, 'DeepBlue/Light/500');
  const marquee = { ...entree, nom: { ...entree.nom, categoriesDesSegments: ['groupes', 'groupes', null] as const } };
  const avec = lignesDEcriture(analyserInventaire({ entrees: [marquee], pages: [] }));
  assert.deepEqual(avec.map((ligne) => ligne.nom), ['Collections', 'Noms des variables', 'Groupes des variables', 'Propriétés', 'Valeurs']);
  const groupes = avec.find((ligne) => ligne.categorie === 'groupes')!;
  assert.equal(groupes.detectee, 'PascalCase');
  assert.equal(groupes.choisie, valeurDEcriture(pascal));
});

test('une écriture hors du registre reste proposée sous ses deux termes', () => {
  const inhabituelle = { casse: 'initiale', separateur: 'tiret' } as const;
  assert.equal(libelleDEcriture(inhabituelle), 'Majuscule initiale · Tiret');
  const ligne = lignesDEcriture(analyserInventaire(inventaire('A B'), { variables: inhabituelle })).find((item) => item.categorie === 'variables')!;
  assert.ok(ligne.options.some((option) => option.valeur === ligne.choisie));
  assert.deepEqual(ecritureDeValeur(valeurDEcriture(inhabituelle)), inhabituelle);
});

test('le texte de fin distingue l’application entière, partielle et refusée', () => {
  const base = { renommages: [], ignores: [], conventionRangee: false, annulationPossible: false, erreur: false };
  const renommage = { type: 'variable', id: 'v', ancienNom: 'A', nouveauNom: 'a' } as const;
  assert.equal(texteDApplication({ ...base, statut: 'applique', renommages: [renommage] }), '1 nom modifié');
  assert.equal(texteDApplication({ ...base, statut: 'applique', renommages: [renommage, renommage] }), '2 noms modifiés');
  assert.match(texteDApplication({ ...base, statut: 'partiel' }), /^Certains noms n’ont pas pu être modifiés/);
  assert.match(texteDApplication({ ...base, statut: 'refuse' }), /^Aucun nom n’a été modifié/);
});

test('le pied compte les noms cochés', () => {
  assert.deepEqual([0, 1, 3].map(texteDeSelection), ['Aucun nom coché', '1 nom coché', '3 noms cochés']);
});

/** La création des variables d'une préparation dans le fichier des tokens : destination, états, reprise sans doublon, journal. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { texteDeLArchitectureDuFichier } from '@ucm-kit/core/referentiel';

import { annulerLeDernierLotDeStructure, type ApiDeStructure } from '../src/ecriture/structure';
import { lireLeJournalDeStructure, type PortDeRegles } from '../src/ecriture/journal';
import { creerLesVariables, type ApiDeVariables } from '../src/ecriture/variables';
import type { PreparationRangee } from '../src/preparations';
import { atelierDEcriture, type OptionsDeLEcriture, type VariableDEcriture } from './figmaDeTest';

const THEME = 'C:1';
const LAYOUT = 'C:2';
const COMPOSANTS = 'C:3';
const CLAIR = `${COMPOSANTS}:Light`;
const SOMBRE = `${COMPOSANTS}:Dark`;
const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id });

// Une préparation nomme tout par son chemin complet ; Figma écrit les noms sans la collection.
const FOND = 'components/alert/color/danger/soft/background';
const TEXTE = 'components/alert/color/danger/soft/foreground';
const MARGE = 'components/alert/size/padding-x';
const nomFigma = (chemin: string) => chemin.split('/').slice(1).join('/');

const cible = (id: string, nom: string, collection: string, type = 'COLOR'): VariableDEcriture => ({ id, key: `k-${id}`, name: nom, valuesByMode: {}, collection, type });
const fond = () => cible('V:1', 'danger/soft/surface/default', THEME);
const texte = () => cible('V:2', 'danger/soft/surface/foreground', THEME);
const taille = () => cible('V:3', 'sizing/2', LAYOUT, 'FLOAT');

const COLLECTIONS = [
  { id: THEME, name: 'theme', modes: ['light'] },
  { id: LAYOUT, name: 'layout', modes: ['default'] },
  { id: COMPOSANTS, name: 'components', modes: ['Light', 'Dark'] },
];

const preparation = (): PreparationRangee => ({
  id: 'prep-1', creeLe: '2026-10-23T10:00:00.000Z', regles: [],
  source: { fichier: 'Composants', cleDuFichier: 'abc', jeu: { cle: 'jeu', nom: 'Alert' } },
  variables: [
    { nom: FOND, type: 'COLOR', cibles: { Light: 'theme/danger/soft/surface/default', Dark: 'theme/danger/soft/surface/default' }, layers: [] },
    { nom: TEXTE, type: 'COLOR', cibles: { Light: 'theme/danger/soft/surface/foreground', Dark: 'theme/danger/soft/surface/foreground' }, layers: [] },
    { nom: MARGE, type: 'FLOAT', cibles: { Light: 'layout/sizing/2', Dark: 'layout/sizing/2' }, layers: [] },
  ],
});

const divergente = (): VariableDEcriture => ({ id: 'V:20', key: 'k-20', name: nomFigma(FOND), collection: COMPOSANTS, type: 'COLOR', valuesByMode: { [CLAIR]: alias('V:2'), [SOMBRE]: alias('V:2') } });

function monde(options: OptionsDeLEcriture = {}, refuserLeJournal = false) {
  const a = atelierDEcriture({ collections: COLLECTIONS, locales: [fond(), texte(), taille()], ...options });
  const donnees = new Map<string, string>();
  const stockage: PortDeRegles = {
    cles: () => [...donnees.keys()],
    lire: (cle) => donnees.get(cle) ?? '',
    ecrire: (cle, valeur) => { if (refuserLeJournal) throw new Error('Figma refuse'); donnees.set(cle, valeur); },
    effacer: (cle) => { donnees.delete(cle); },
  };
  let rang = 0;
  const choix = { api: a.api as unknown as ApiDeVariables, stockage, heure: () => 'h', lot: () => `lot${rang++}` };
  return {
    a, stockage, donnees,
    creer: (prep: PreparationRangee = preparation(), plus: { collection?: string; reponses?: Record<string, string> } = {}) => creerLesVariables(prep, { ...choix, ...plus }),
    annuler: () => annulerLeDernierLotDeStructure({ api: a.api as unknown as ApiDeStructure, stockage }),
    creations: () => a.journal.filter((ligne) => ligne.startsWith('creer:')),
    points: () => a.journal.filter((ligne) => ligne === 'commitUndo').length,
  };
}

test('les variables manquantes sont créées dans components, alias de chaque mode compris, puis journalisées en un lot', async () => {
  const m = monde();
  const rendu = await m.creer();
  assert.equal(rendu.refus, null);
  assert.deepEqual([rendu.creees, rendu.gardees, rendu.sautees], [3, 0, 0]);
  assert.deepEqual(Object.values(rendu.etats), ['creee', 'creee', 'creee']);
  const fondCree = m.a.locales().find((variable) => variable.name === nomFigma(FOND))!;
  assert.deepEqual(fondCree.valuesByMode, { [CLAIR]: alias('V:1'), [SOMBRE]: alias('V:1') });
  assert.equal((fondCree as unknown as { variableCollectionId: string }).variableCollectionId, COMPOSANTS);
  assert.equal(rendu.journal, true);
  assert.deepEqual(lireLeJournalDeStructure(m.stockage)?.lignes.map((ligne) => ligne.sorte), ['creation', 'creation', 'creation']);
  assert.equal(m.points(), 1);
  // Aucun dossier `components` n'entre dans la collection : le nom écrit ne redit pas la collection.
  assert.deepEqual(m.creations(), [FOND, TEXTE, MARGE].map((chemin) => `creer:${nomFigma(chemin)}`));
  assert.ok(m.a.locales().every((variable) => !variable.name.startsWith('components/')));
});

test('une création interrompue se reprend sans doublon : l’identique est gardée, la manquante créée', async () => {
  const premiere = monde({ refusees: new Set([`creer:${nomFigma(MARGE)}`]) });
  const interrompu = await premiere.creer();
  assert.deepEqual([interrompu.creees, interrompu.sautees], [2, 1]);
  assert.deepEqual(interrompu.echecs, [{ nom: MARGE, motif: 'erreur' }]);
  assert.equal(interrompu.etats[MARGE], 'echec');

  // Le fichier garde les deux variables écrites ; la reprise relit le fichier, jamais l'état rangé.
  const deja = premiere.a.locales().filter((variable) => variable.name.startsWith('alert/')).map((variable) => ({ id: variable.id, key: variable.key, name: variable.name, collection: COMPOSANTS, type: 'COLOR', valuesByMode: { ...variable.valuesByMode } }));
  assert.equal(deja.length, 2);
  const reprise = monde({ locales: [fond(), texte(), taille(), ...deja] });
  const rendu = await reprise.creer();
  assert.deepEqual([rendu.creees, rendu.gardees, rendu.sautees], [1, 2, 0]);
  assert.deepEqual(reprise.creations(), [`creer:${nomFigma(MARGE)}`]);
  assert.equal(rendu.etats[FOND], 'existe-identique');
  assert.equal(rendu.etats[MARGE], 'creee');
});

test('rejouer une création terminée ne crée rien et ne pose ni journal ni point d’annulation', async () => {
  const m = monde();
  await m.creer();
  const avant = m.points();
  const rendu = await m.creer();
  assert.deepEqual([rendu.creees, rendu.gardees], [0, 3]);
  assert.equal(m.creations().length, 3);
  assert.equal(m.points(), avant);
});

test('une variable existante qui vise autre chose reste telle quelle et pose une question', async () => {
  const m = monde({ locales: [fond(), texte(), taille(), divergente()] });
  const rendu = await m.creer();
  assert.deepEqual(rendu.divergentes, [{ nom: FOND, vise: 'theme/danger/soft/surface/default' }]);
  assert.equal(rendu.etats[FOND], 'existe-divergente');
  assert.deepEqual([rendu.creees, rendu.sautees], [2, 1]);
  assert.deepEqual(m.a.variable('V:20')!.valuesByMode, { [CLAIR]: alias('V:2'), [SOMBRE]: alias('V:2') });
});

test('garder une divergente la compte gardée ; remplacer réécrit ses alias et l’annulation les remet', async () => {
  const garde = monde({ locales: [fond(), texte(), taille(), divergente()] });
  const rendu = await garde.creer(preparation(), { reponses: { [`existante:${FOND}`]: 'garder' } });
  assert.deepEqual([rendu.creees, rendu.gardees, rendu.divergentes.length], [2, 1, 0]);

  const remplace = monde({ locales: [fond(), texte(), taille(), divergente()] });
  const refait = await remplace.creer(preparation(), { reponses: { [`existante:${FOND}`]: 'remplacer' } });
  assert.deepEqual([refait.creees, refait.remplacees], [2, 1]);
  assert.deepEqual(remplace.a.variable('V:20')!.valuesByMode, { [CLAIR]: alias('V:1'), [SOMBRE]: alias('V:1') });
  const defait = await remplace.annuler();
  assert.equal(defait.journal, 'lu');
  assert.equal(defait.defaites, 4);
  assert.deepEqual(remplace.a.variable('V:20')!.valuesByMode, { [CLAIR]: alias('V:2'), [SOMBRE]: alias('V:2') });
});

test('les variables créées se défont depuis l’annulation de la structure', async () => {
  const m = monde();
  await m.creer();
  const defait = await m.annuler();
  assert.equal(defait.defaites, 3);
  assert.deepEqual(m.a.locales().map((variable) => variable.name).filter((nom) => nom.startsWith('alert/')), []);
});

test('un fichier qui ne garde pas le journal crée quand même et le dit', async () => {
  const m = monde({}, true);
  const rendu = await m.creer();
  assert.equal(rendu.creees, 3);
  assert.equal(rendu.journal, false);
});

test('une cible absente ou un type faux saute la variable, les autres s’écrivent', async () => {
  const prep = preparation();
  const m = monde();
  const rendu = await m.creer({
    ...prep,
    variables: [
      { ...prep.variables[0], cibles: { Light: 'theme/danger/soft/surface/inconnu', Dark: 'theme/danger/soft/surface/inconnu' } },
      { ...prep.variables[1], type: 'FLOAT' },
      prep.variables[2],
    ],
  });
  assert.deepEqual(rendu.echecs, [{ nom: FOND, motif: 'cible-introuvable' }, { nom: TEXTE, motif: 'type-incompatible' }]);
  assert.equal(rendu.creees, 1);
});

test('un mode de la destination sans cible, et sans cible unique, saute la variable', async () => {
  const prep = preparation();
  const m = monde();
  const rendu = await m.creer({ ...prep, variables: [{ ...prep.variables[0], cibles: { Light: 'theme/danger/soft/surface/default', Autre: 'theme/danger/soft/surface/foreground' } }] });
  assert.deepEqual(rendu.echecs, [{ nom: FOND, motif: 'mode-sans-cible' }]);
});

test('la destination se reconnaît par la déclaration UCM, pas par un nom exact', async () => {
  const m = monde({ collections: [COLLECTIONS[0], COLLECTIONS[1], { id: COMPOSANTS, name: 'Components', modes: ['Light', 'Dark'] }] });
  assert.equal((await m.creer()).creees, 3);
});

test('deux collections components : un choix à faire, rien n’est écrit', async () => {
  const m = monde({ collections: [...COLLECTIONS, { id: 'C:4', name: 'Components', modes: ['Light', 'Dark'] }] });
  const rendu = await m.creer();
  assert.equal(rendu.refus, 'destination-ambigue');
  assert.deepEqual(rendu.collections.map(({ id }) => id), [COMPOSANTS, 'C:4']);
  assert.deepEqual(m.creations(), []);
  assert.equal((await m.creer(preparation(), { collection: 'C:9' })).refus, 'destination-inconnue');
  assert.equal((await m.creer(preparation(), { collection: 'C:4' })).creees, 3);
});

test('sans theme, sans components ou hors UCM, rien n’est écrit', async () => {
  const sansTheme = monde({ collections: COLLECTIONS.filter(({ name }) => name !== 'theme') });
  assert.equal((await sansTheme.creer()).refus, 'sans-cibles');
  const sansDestination = monde({ collections: COLLECTIONS.filter(({ name }) => name !== 'components') });
  assert.equal((await sansDestination.creer()).refus, 'sans-destination');
  const hors = monde({ declaration: texteDeLArchitectureDuFichier(false) });
  assert.equal((await hors.creer()).refus, 'hors-ucm');
  for (const m of [sansTheme, sansDestination, hors]) {
    assert.deepEqual(m.creations(), []);
    assert.equal(m.points(), 0);
  }
});

test('les cibles se trouvent aussi dans un fichier dont les noms redisent leur collection', async () => {
  const m = monde({ locales: [
    cible('V:1', 'theme/danger/soft/surface/default', THEME), cible('V:2', 'theme/danger/soft/surface/foreground', THEME), cible('V:3', 'layout/sizing/2', LAYOUT, 'FLOAT'),
  ] });
  const rendu = await m.creer();
  assert.deepEqual([rendu.creees, rendu.echecs], [3, []]);
  assert.deepEqual(m.creations(), [FOND, TEXTE, MARGE].map((chemin) => `creer:${nomFigma(chemin)}`));
});

test('une cible se cherche dans sa collection : un nom pareil dans une autre collection ne la remplace pas', async () => {
  const m = monde({ locales: [fond(), texte(), cible('V:3', 'sizing/2', THEME, 'FLOAT')] });
  const rendu = await m.creer();
  assert.deepEqual(rendu.echecs, [{ nom: MARGE, motif: 'cible-introuvable' }]);
  assert.equal(rendu.creees, 2);
});

test('une variable existante, nommée sans la collection, est reconnue identique', async () => {
  const existante = (id: string, chemin: string, cibleId: string): VariableDEcriture => ({
    id, key: `k-${id}`, name: nomFigma(chemin), collection: COMPOSANTS, type: 'COLOR', valuesByMode: { [CLAIR]: alias(cibleId), [SOMBRE]: alias(cibleId) },
  });
  const m = monde({ locales: [fond(), texte(), taille(), existante('V:20', FOND, 'V:1')] });
  const rendu = await m.creer();
  assert.equal(rendu.etats[FOND], 'existe-identique');
  assert.deepEqual([rendu.creees, rendu.gardees], [2, 1]);
});

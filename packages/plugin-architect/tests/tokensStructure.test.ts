/**
 * Les sections de structure de l'onglet Constats : chaque genre de constat et chaque correction n'a qu'une catégorie, les cartes À faire
 * et les corrections se posent dans le conteneur de cette catégorie, et les ignorés ferment la liste de Tout.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import type { Constat, Correction } from '../src/messages/commun';
import type { Bilan } from '../src/messages/nomenclature';

import { poserLeDom, comme, type ElementDeTest } from './domDeTest';

poserLeDom();

import { lireLesCategories, type IdDeCategorie } from '../src/ui/tokens/categories';
import { monterLePanneauDesTokens } from '../src/ui/tokens/panneau';
import { monterAFaire, type GestesDIgnorer } from '../src/ui/structure/aFaire';
import { monterLesCorrections } from '../src/ui/structure/corrections';
import { GROUPES, lireLesConstats, lireLesCorrections, type Noms } from '../src/ui/structure/lecture';

const integrite = require('../galerie/structure/integrite.cjs') as Record<'manquantes' | 'crans' | 'sansEcriture' | 'libraryEtScopes' | 'aFaire' | 'sensInconnu', readonly Constat[]>;
const { structure } = require('../galerie/structure/donnees.cjs') as { structure(demande: number): { constats: readonly Constat[]; corrections: readonly Correction[] } };
const { bilans } = require('../galerie/nomenclature/donnees.cjs') as { bilans: { rienAFaire: Bilan } };

const SANS_NOMS: Noms = { nom: () => null, cle: () => null };

/** La catégorie où chaque genre de constat se range (`GROUPE_DU_GENRE` de `structure/lecture.ts`, relu ici en clair). */
const CATEGORIE_DU_GENRE: Readonly<Record<string, IdDeCategorie>> = {
  'alias-supprime': 'alias',
  'library-inactive': 'alias',
  'sans-valeur-en-mode': 'modes',
  'valeur-vide': 'valeurs',
  doublons: 'valeurs',
  'couleur-sans-alias': 'couches',
  'variable-absente': 'manquantes',
  'cran-absent': 'manquantes',
  cran: 'crans',
  couche: 'couches',
  'valeur-directe': 'couches',
  'mode-du-theme': 'modes',
  type: 'types',
  'mal-rangee': 'rangement',
};

const constatDe = (id: string, faits: Constat['faits']): Constat => ({ id, code: 'C82', type: 'corriger', famille: 'liaisons', variants: [], layers: [], faits });

/** Le genre d'un constat, comme `lecture.ts` le lit : le fait `genre`, sinon `soeurs` (valeur vide), sinon `doublons`. */
function genreDe(constat: Constat): string {
  if (typeof constat.faits.genre === 'string') return constat.faits.genre;
  return typeof constat.faits.soeurs === 'number' ? 'valeur-vide' : 'doublons';
}

/** Les constats et les corrections des états de galerie, une fois par identifiant. */
function constatsDesFixtures(): Constat[] {
  const parId = new Map<string, Constat>();
  const listes = [integrite.manquantes, integrite.crans, integrite.sansEcriture, integrite.libraryEtScopes, integrite.aFaire, integrite.sensInconnu];
  // Un même constat paraît avec et sans correction selon l'écriture des noms choisie : l'exemplaire à correction l'emporte.
  for (const constat of [...listes.flat(), ...structure(1).constats]) if (!parId.get(constat.id)?.correction) parId.set(constat.id, constat);
  return [...parId.values()];
}

/** Un constat par genre, sans correction : les faits que sa phrase lit, et rien de plus. */
function constatsDeTousLesGenres(): Constat[] {
  const faits = { variable: 'primary/ring', mode: 'light', collection: 'theme', rampe: 'primary/light', cran: 50, variables: 'primary/ring', manque: 'dark', cible: 'color/red/500' };
  return [
    ...Object.keys(CATEGORIE_DU_GENRE).filter((genre) => genre !== 'valeur-vide' && genre !== 'doublons').map((genre) => constatDe(`C82:${genre}:x`, { genre, ...faits })),
    constatDe('C63:vide', { soeurs: 3, variable: 'primary/ring', mode: 'light' }),
    constatDe('C63:doublons', { doublons: 2, mode: 'light' }),
  ];
}

test('chaque genre de constat à régler dans Figma a une seule catégorie, et ne paraît qu’une fois', () => {
  const constats = constatsDeTousLesGenres();
  assert.equal(constats.length, Object.keys(CATEGORIE_DU_GENRE).length, 'un constat par genre');
  const categories = lireLesCategories({ nomenclature: null, constats, corrections: [], noms: SANS_NOMS, partielle: false });
  const placements = categories.flatMap((categorie) => categorie.cartes.flatMap((carte) => (carte.sorte === 'constat' ? [[carte.constat.id, categorie.id] as const] : [])));
  assert.deepEqual(placements.map(([id]) => id).sort(), constats.map(({ id }) => id).sort(), 'chaque constat paraît une seule fois');
  for (const constat of constats) {
    assert.deepEqual(placements.filter(([id]) => id === constat.id).map(([, categorie]) => categorie), [CATEGORIE_DU_GENRE[genreDe(constat)]], genreDe(constat));
  }
  assert.equal(Object.keys(CATEGORIE_DU_GENRE).length, 14);
  assert.deepEqual(GROUPES, ['manquantes', 'crans', 'alias', 'modes', 'valeurs', 'couches', 'types', 'rangement']);
});

test('les constats des états de galerie sont tous rangés, chacun dans la catégorie de son genre', () => {
  const constats = constatsDesFixtures();
  const corrections = constats.flatMap((constat) => (constat.correction ? [constat.correction] : []));
  const categories = lireLesCategories({ nomenclature: null, constats, corrections, noms: SANS_NOMS, partielle: false });
  const rangesParConstat = new Map<string, IdDeCategorie[]>();
  for (const categorie of categories) {
    for (const carte of categorie.cartes) if (carte.sorte === 'constat') rangesParConstat.set(carte.constat.id, [...(rangesParConstat.get(carte.constat.id) ?? []), categorie.id]);
  }
  const aRegler = constats.filter((constat) => !constat.correction);
  assert.ok(aRegler.length >= 15, 'les fixtures couvrent plusieurs constats');
  assert.deepEqual([...rangesParConstat.keys()].sort(), aRegler.map(({ id }) => id).sort(), 'seuls les constats sans correction deviennent des cartes À faire');
  for (const constat of aRegler) assert.deepEqual(rangesParConstat.get(constat.id), [CATEGORIE_DU_GENRE[genreDe(constat)]], constat.id);
  assert.ok(new Set(aRegler.map(genreDe)).size >= 9, 'les fixtures portent la plupart des genres');
});

test('chaque correction de structure va dans la seule catégorie de sa sorte, ligne par ligne', () => {
  const constats = constatsDesFixtures();
  const corrections = constats.flatMap((constat) => (constat.correction ? [constat.correction] : []));
  const lues = lireLesCorrections(corrections, SANS_NOMS, constats);
  assert.ok(lues.variables.length > 0 && lues.crans.length > 0 && lues.modes.length > 0 && lues.scopes.length > 0, 'les quatre sortes sont présentes');
  const idsParCategorie = {
    manquantes: lues.variables.flatMap((carte) => carte.lignes.map(({ id }) => id)),
    crans: lues.crans.flatMap((carte) => carte.lignes.map(({ id }) => id)),
    modes: lues.modes.flatMap((carte) => carte.lignes.map(({ id }) => id)),
    scopes: lues.scopes.flatMap((carte) => carte.lignes.map(({ id }) => id)),
  };
  const toutes = Object.values(idsParCategorie).flat();
  assert.equal(new Set(toutes).size, toutes.length, 'aucune correction dans deux catégories');
  assert.deepEqual([...toutes].sort(), corrections.map(({ id }) => id).sort(), 'aucune correction perdue');
  const categories = lireLesCategories({ nomenclature: null, constats, corrections, noms: SANS_NOMS, partielle: false });
  for (const categorie of categories) {
    const lignes = categorie.cartes.flatMap((carte) => (carte.sorte === 'correction' ? carte.correction.lignes.map(({ id }) => id) : []));
    const attendues = (idsParCategorie as Record<string, string[]>)[categorie.id] ?? [];
    assert.deepEqual([...lignes].sort(), [...attendues].sort(), categorie.id);
  }
  // Une correction d'une sorte que le domaine n'écrit pas n'entre dans aucune catégorie.
  const liaison: Correction = { id: 'C22:a', sorte: 'liaison', cible: { layer: '1:1', champ: 'fills', indice: 0 }, avant: 'x', apres: { cle: 'k', nom: 'y' }, aRelire: { regle: 'r', avant: 'x' } };
  assert.deepEqual(Object.values(lireLesCorrections([liaison], SANS_NOMS)).flat(), []);
});

const gestes: GestesDIgnorer = { ignorerPourLaPalette() {}, ignorerDansLeFichier() {}, nePlusIgnorerLeConstat() {}, nePlusIgnorerLeRole() {} };
const element = (): HTMLElement => document.createElement('div');
const cartesDe = (hote: HTMLElement): ElementDeTest[] => comme(hote).querySelectorAll('.bloc-constat');

test('chaque carte À faire se pose dans le conteneur de son groupe, avec son menu Ignorer', () => {
  const hotes = Object.fromEntries(GROUPES.map((groupe) => [groupe, element()])) as Record<(typeof GROUPES)[number], HTMLElement>;
  const aFaire = monterAFaire(hotes, element(), () => {}, gestes);
  const constats = lireLesConstats([...integrite.aFaire, ...integrite.sansEcriture], SANS_NOMS);
  aFaire.poser(constats);
  let total = 0;
  for (const groupe of GROUPES) {
    const attendus = constats.filter((constat) => constat.groupe === groupe);
    assert.equal(cartesDe(hotes[groupe]).length, attendus.length, groupe);
    total += attendus.length;
  }
  assert.equal(total, constats.length, 'chaque carte tombe dans un conteneur, et un seul');
  const avecRole = constats.filter((constat) => constat.role !== null);
  assert.ok(avecRole.length > 0);
  assert.equal(comme(hotes.manquantes).querySelectorAll('.ignorer-hote').length, avecRole.length);
  for (const groupe of GROUPES) if (groupe !== 'manquantes') assert.equal(comme(hotes[groupe]).querySelectorAll('.ignorer-hote').length, 0, groupe);
});

test('chaque correction se pose dans le conteneur de sa catégorie, avec ses cases', () => {
  const hotes = { manquantes: element(), crans: element(), modes: element(), scopes: element() };
  const corrections = monterLesCorrections({ element: element(), hotes, auChangement() {} });
  const constats = constatsDesFixtures();
  const toutes = constats.flatMap((constat) => (constat.correction ? [constat.correction] : []));
  const lues = lireLesCorrections(toutes, SANS_NOMS, constats);
  corrections.poser(lues);
  const attendu = { manquantes: lues.variables, crans: lues.crans, modes: lues.modes, scopes: lues.scopes };
  for (const [categorie, cartes] of Object.entries(attendu)) {
    const hote = comme(hotes[categorie as keyof typeof hotes]);
    assert.ok(cartes.length > 0, categorie);
    assert.equal(hote.querySelectorAll('.bloc').length, cartes.length, categorie);
    assert.ok(hote.querySelectorAll('.case').length > 0, `${categorie} porte ses cases`);
  }
  assert.equal(corrections.nombre(), toutes.length);
});

test('les ignorés ferment la liste de Tout, sous leur intertitre, et se retirent sous une catégorie', () => {
  const racine = element();
  const nomenclature = { questions: element(), renommages: element(), remises: element() };
  const panneau = monterLePanneauDesTokens({ racine, nomenclature, auChangement() {} });
  const hotes = Object.fromEntries(GROUPES.map((groupe) => [groupe, panneau.hote(groupe)])) as Record<(typeof GROUPES)[number], HTMLElement>;
  const aFaire = monterAFaire(hotes, panneau.ignores, () => {}, gestes);
  const constats = lireLesConstats(integrite.sansEcriture, SANS_NOMS);
  aFaire.poser(constats.slice(1), { constats: constats.slice(0, 1), roles: ['surface/subtle'] });
  panneau.poser({ bilan: bilans.rienAFaire, reglesRecues: 0 });
  panneau.poserLaStructure({ constats: integrite.sansEcriture.slice(1), corrections: [], noms: SANS_NOMS });
  const liste = comme(comme(racine).querySelector('.liste-des-constats'));
  assert.equal(liste.children[liste.children.length - 1], comme(panneau.ignores), 'les ignorés sont le dernier enfant de la liste');
  assert.equal(panneau.ignores.hidden, false);
  const ignores = comme(panneau.ignores);
  assert.ok(ignores.children[0].classes.has('intertitre-structure'), 'l’intertitre ouvre les ignorés');
  assert.equal(ignores.querySelectorAll('.muette').length, 2, 'un rôle ignoré et un constat ignoré');
  assert.equal(ignores.querySelectorAll('.btn-texte').length, 2, 'chacun avec « Ne plus ignorer »');
  comme(comme(racine).querySelectorAll('.puce-element').find((puce) => puce.dataset.element === 'manquantes')).clic();
  assert.equal(comme(comme(racine).querySelector('.liste-des-constats')).contains(comme(panneau.ignores)), false, 'sous une catégorie, les ignorés sont retirés');
});

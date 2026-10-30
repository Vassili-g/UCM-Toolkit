/** La lecture des constats et des corrections de C82 par l'écran de structure : groupes, phrases, cartes de variables manquantes et de crans. */
import assert from 'node:assert/strict';
import test from 'node:test';

import type { Constat, Correction } from '../src/messages/commun';
import { GROUPES, lireLesConstats, lireLesCorrections, type Noms } from '../src/ui/structure/lecture';

const connus = new Map([
  ['theme|primary/ring', 'theme/primary/ring'],
  ['theme|primary/page/border:m-light', 'theme/primary/page/border'],
  ['theme|primary/surface/default', 'theme/primary/surface/default'],
  ['brands|primary/dark/300', 'brands/primary/dark/300'],
  ['brands|primary/dark/200', 'brands/primary/dark/200'],
  ['brands|primary/light/50', 'brands/primary/light/50'],
  ['brands|primary/dark/100', 'brands/primary/dark/100'],
  ['theme|primary/page/border', 'theme/primary/page/border'],
]);
const noms: Noms = {
  nom: (cle) => connus.get(cle) ?? null,
  cle: (nom) => [...connus].find(([, valeur]) => valeur === nom)?.[0] ?? null,
};

const c82 = (id: string, faits: Constat['faits'], plus: Partial<Constat> = {}): Constat => ({ id, code: 'C82', type: 'corriger', famille: 'liaisons', variants: [], layers: [], faits, ...plus });
const texte = (morceaux: readonly (string | { chemin: string })[]): string => morceaux.map((morceau) => (typeof morceau === 'string' ? morceau : `\`${morceau.chemin}\``)).join('');

test('les constats de C82 vont sous leurs intertitres, dans l’ordre de la maquette', () => {
  assert.deepEqual(GROUPES, ['manquantes', 'crans', 'alias', 'modes', 'valeurs', 'couches', 'types', 'rangement']);
  const lus = lireLesConstats([
    c82('C82:type:theme|primary/ring', { genre: 'type', variable: 'primary/ring', type: 'FLOAT' }),
    c82('C82:mal-rangee:brands|x', { genre: 'mal-rangee', variable: 'primary/surface/default', collection: 'brands' }),
    c82('C82:mode-du-theme:theme:dark', { genre: 'mode-du-theme', collection: 'theme', manque: 'dark' }),
    c82('C82:variable-absente:theme:tertiary/ring', { genre: 'variable-absente', variable: 'ring', groupe: 'tertiary', raison: 'sans-jumelle' }),
  ], noms);
  assert.deepEqual(lus.map(({ groupe }) => groupe), ['manquantes', 'modes', 'types', 'rangement']);
});

test('une variable absente dit pourquoi le plugin ne la crée pas', () => {
  const lire = (raison: string) => lireLesConstats([c82('C82:variable-absente:theme:tertiary/ring', { genre: 'variable-absente', variable: 'ring', groupe: 'tertiary', raison })], noms)[0];
  const sansJumelle = lire('sans-jumelle');
  assert.equal(texte(sansJumelle.phrase), 'Cette palette n’a pas `ring`. Aucune de ses variables n’a d’alias vers brands ou utility.');
  assert.equal(sansJumelle.statut, 'Créez ring dans la fenêtre Variables');
  assert.deepEqual(sansJumelle.lieu, [{ chemin: 'theme/tertiary' }]);
  assert.equal(sansJumelle.variable, null);
  assert.equal(texte(lire('prefixes-multiples').phrase), 'Cette palette n’a pas `ring`. Ses variables visent plusieurs rampes.');
  const sansEcriture = lire('sans-ecriture');
  assert.equal(texte(sansEcriture.phrase), 'Cette palette n’a pas `ring`.');
  assert.equal(sansEcriture.statut, 'Choisissez l’écriture des noms dans Nomenclature. Architect pourra alors la créer');
  assert.equal(texte(lire('cible-ambigue').phrase), 'Cette palette n’a pas `ring`.');
  assert.equal(lire('cible-ambigue').statut, 'Créez ring dans la fenêtre Variables');
});

test('un cran absent de la rampe renvoie à UCM Palettes', () => {
  const [lu] = lireLesConstats([c82('C82:cran-absent:primary/light/50', { genre: 'cran-absent', rampe: 'primary/light', cran: 50, variables: 'primary/surface/subtle, secondary/surface/subtle' })], noms);
  assert.equal(texte(lu.phrase), 'La rampe `primary/light` n’a pas le cran 50.');
  assert.equal(texte(lu.lieu), '`theme/primary/surface/subtle`, `theme/secondary/surface/subtle`');
  assert.equal(lu.statut, 'Ajoutez ce cran avec UCM Palettes');
});

test('les modes de theme : un mode manquant, ou les deux', () => {
  const [un, deux] = lireLesConstats([
    c82('C82:mode-du-theme:theme:dark', { genre: 'mode-du-theme', collection: 'theme', manque: 'dark' }),
    c82('C82:mode-du-theme:theme:les-deux', { genre: 'mode-du-theme', collection: 'theme', manque: 'les-deux' }),
  ], noms);
  assert.equal(texte(un.phrase), 'La collection theme n’a pas de mode Dark.');
  assert.equal(un.statut, 'Ajoutez un mode Dark à theme dans la fenêtre Variables');
  assert.equal(texte(deux.phrase), 'La collection theme n’a ni mode Light ni mode Dark.');
  assert.equal(deux.statut, 'Nommez ses modes Light et Dark dans la fenêtre Variables');
});

test('type et rangement citent la variable entière', () => {
  const [type, rangement] = lireLesConstats([
    c82('C82:type:theme|primary/ring', { genre: 'type', variable: 'primary/ring', type: 'FLOAT' }),
    c82('C82:mal-rangee:brands|inconnue', { genre: 'mal-rangee', variable: 'primary/surface/default', collection: 'brands' }),
  ], noms);
  assert.equal(texte(type.lieu), '`theme/primary/ring`');
  assert.deepEqual(type.variable, { nom: 'theme/primary/ring', cle: 'theme|primary/ring' });
  assert.equal(type.statut, 'Recréez-la en couleur dans la fenêtre Variables');
  assert.equal(texte(rangement.phrase), 'Cette variable du thème est rangée dans brands.');
  assert.equal(texte(rangement.lieu), '`brands/primary/surface/default`');
  assert.equal(rangement.statut, 'Déplacez-la dans theme dans la fenêtre Variables');
});

test('une couche dit les collections attendues de la collection de la variable ; la clé se retrouve malgré les « : » du mode', () => {
  const [couche, directe] = lireLesConstats([
    c82('C82:couche:theme|primary/page/border:m-light', { genre: 'couche', variable: 'primary/page/border', mode: 'light', cible: 'color/red/500', coucheCible: 'primitives' }),
    c82('C82:valeur-directe:theme|primary/page/border:m-dark', { genre: 'valeur-directe', variable: 'primary/page/border', mode: 'dark' }),
  ], { ...noms, nom: (cle) => (cle === 'theme|primary/page/border' ? 'theme/primary/page/border' : null) });
  assert.equal(texte(couche.phrase), 'Cette couleur vise primitives. UCM attend brands ou utility.');
  assert.equal(couche.statut, 'Choisissez une cible dans brands ou utility dans la fenêtre Variables');
  assert.equal(texte(couche.lieu), '`theme/primary/page/border`, light');
  assert.equal(directe.statut, 'Liez-la à une couleur de brands ou utility dans la fenêtre Variables');
  assert.equal(texte(directe.phrase), 'Cette couleur n’est pas un alias.');
});

test('un cran à question devient une carte avec ses deux candidats, sous Crans', () => {
  const question = { id: 'C82:cran:theme|primary/surface/default:m-light', candidats: [{ cle: 'brands|primary/dark/200', nom: 'primary/dark/200' }, { cle: 'brands|primary/dark/300', nom: 'primary/dark/300' }] };
  const faits = { genre: 'cran', variable: 'primary/surface/default', mode: 'light', avant: 800, attendu: '200 ou 300' };
  const lus = lireLesConstats([c82(question.id, faits, { question })], noms);
  assert.equal(lus.length, 1);
  assert.equal(lus[0].groupe, 'crans');
  assert.equal(texte(lus[0].phrase), 'UCM ne sait pas si cette palette met un texte blanc ou noir sur ses boutons.');
  assert.equal(lus[0].faits[0].etiquette, 'En Light');
  assert.equal(texte(lus[0].faits[0].valeur), '`brands/primary/dark/200` ou `brands/primary/dark/300`');
  assert.equal(lus[0].statut, 'Choisissez la cible dans la fenêtre Variables');
});

const creation = (palette: string, cran: number): { constat: Constat; correction: Correction } => {
  const id = `C82:variable-absente:theme:${palette}/surface/subtle`;
  const correction: Correction = {
    id, sorte: 'variable', cible: {}, avant: null, apres: { nom: `${palette}/surface/subtle`, collection: 'theme' }, aRelire: { regle: 'r', avant: null },
    creation: { collection: 'theme', nom: `${palette}/surface/subtle`, type: 'COLOR', scopes: ['FRAME_FILL', 'SHAPE_FILL'], alias: { 'm-light': { cle: 'brands|primary/light/50', nom: 'primary/light/50' }, 'm-dark': { cle: 'brands|primary/dark/100', nom: 'primary/dark/100' } } },
  };
  return { constat: c82(id, { genre: 'variable-absente', variable: 'surface/subtle', groupe: palette, 'cran:light': cran, 'cran:dark': 100 }, { correction }), correction };
};

test('les variables manquantes d’un rôle forment une carte, avec un cran par mode, Light avant Dark', () => {
  const [a, b] = [creation('primary', 50), creation('secondary', 50)];
  const lues = lireLesCorrections([a.correction, b.correction], noms, [a.constat, b.constat]);
  assert.equal(lues.variables.length, 1);
  const [carte] = lues.variables;
  assert.equal(carte.role, 'surface/subtle');
  assert.deepEqual(carte.crans, [{ mode: 'Light', valeur: 50 }, { mode: 'Dark', valeur: 100 }]);
  assert.deepEqual(carte.scopes, ['FRAME_FILL', 'SHAPE_FILL']);
  assert.deepEqual(carte.lignes.map(({ nom }) => nom), ['theme/primary/surface/subtle', 'theme/secondary/surface/subtle']);
  assert.deepEqual(carte.lignes[0].cibles, [{ mode: 'Light', cible: 'brands/primary/light/50' }, { mode: 'Dark', cible: 'brands/primary/dark/100' }]);
});

test('deux crans visés différents pour un même rôle font deux cartes ; une création sans son constat ne se montre pas', () => {
  const [a, b] = [creation('primary', 50), creation('secondary', 100)];
  assert.equal(lireLesCorrections([a.correction, b.correction], noms, [a.constat, b.constat]).variables.length, 2);
  assert.equal(lireLesCorrections([a.correction], noms).variables.length, 0);
});

test('les crans d’un rôle dans un mode forment une carte, et les lignes gardent la variable', () => {
  const ligne = (palette: string): { constat: Constat; correction: Correction } => {
    const id = `C82:cran:theme|${palette}/surface/default:m-dark`;
    const correction: Correction = {
      id, sorte: 'alias-de-mode', cible: { variable: 'theme|primary/surface/default', mode: 'm-dark' }, avant: 'brands|primary/dark/300',
      apres: { cle: 'brands|primary/dark/200', nom: 'primary/dark/200' }, aRelire: { axes: { mode: 'dark' }, regle: 'r', avant: 'brands|primary/dark/300' },
    };
    return { correction, constat: c82(id, { genre: 'cran', variable: `${palette}/surface/default`, mode: 'dark', avant: 300, attendu: 200 }, { correction }) };
  };
  const [a, b] = [ligne('primary'), ligne('primary')];
  const lues = lireLesCorrections([a.correction, b.correction], noms, [a.constat, b.constat]);
  assert.equal(lues.modes.length, 0);
  assert.equal(lues.crans.length, 1);
  const [carte] = lues.crans;
  assert.deepEqual([carte.role, carte.mode, carte.lu, carte.attendu], ['surface/default', 'Dark', 300, 200]);
  assert.deepEqual([carte.lignes[0].avant, carte.lignes[0].apres, carte.lignes[0].variable], ['brands/primary/dark/300', 'brands/primary/dark/200', 'theme/primary/surface/default']);
});

test('une correction d’alias de mode sans constat de cran reste une carte de modes', () => {
  const correction: Correction = {
    id: 'C60:x', sorte: 'alias-de-mode', cible: { variable: 'theme|primary/ring', mode: 'm-dark' }, avant: 'brands|primary/dark/300',
    apres: { cle: 'brands|primary/dark/200', nom: 'primary/dark/200' }, aRelire: { axes: { mode: 'Dark' }, regle: 'r', avant: 'brands|primary/dark/300' },
  };
  const lues = lireLesCorrections([correction], noms, []);
  assert.equal(lues.modes.length, 1);
  assert.equal(lues.crans.length, 0);
});

test('un cran sans correction ni question (cible de library) est une carte sous Crans', () => {
  const [lu] = lireLesConstats([c82('C82:cran:theme|primary/surface/default:m-dark', { genre: 'cran', variable: 'primary/surface/default', mode: 'dark', avant: 300, attendu: 200 })], noms);
  assert.equal(lu.groupe, 'crans');
  assert.equal(texte(lu.phrase), 'En Dark, UCM attend le cran 200. Aujourd’hui elle vise le cran 300.');
  assert.equal(lu.statut, 'Changez sa cible dans la fenêtre Variables');
  assert.equal(texte(lu.lieu), '`theme/primary/surface/default`');
  assert.deepEqual(lu.variable, { nom: 'theme/primary/surface/default', cle: 'theme|primary/surface/default' });
});

test('seule la carte d’un rôle absent porte son rôle, pour Ignorer dans tout le fichier', () => {
  const lus = lireLesConstats([
    c82('C82:variable-absente:theme:primary/surface/subtle', { genre: 'variable-absente', variable: 'surface/subtle', groupe: 'primary', raison: 'sans-ecriture' }),
    c82('C82:type:theme|primary/ring', { genre: 'type', variable: 'primary/ring', type: 'FLOAT' }),
  ], noms);
  assert.deepEqual(lus.map(({ role }) => role), ['surface/subtle', null]);
});

test('retirer tous les scopes d’une collection est une carte de scopes sans scope après, qui nomme la collection', () => {
  const retrait = (cle: string): Correction => ({
    id: `C82:scopes:${cle}`, sorte: 'scope', cible: { variable: cle }, avant: 'ALL_SCOPES', apres: { nom: '' }, aRelire: { regle: 'r', avant: 'ALL_SCOPES' },
  });
  const lues = lireLesCorrections([retrait('brands|primary/dark/200'), retrait('brands|primary/dark/300')], noms);
  assert.equal(lues.scopes.length, 1);
  const [carte] = lues.scopes;
  assert.deepEqual([carte.collection, carte.apres, carte.avant, carte.lignes.length], ['brands', [], ['ALL_SCOPES'], 2]);
});

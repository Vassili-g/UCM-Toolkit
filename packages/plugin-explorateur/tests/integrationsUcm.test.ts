/** Les intégrations UCM facultatives : recette Palettes, association à un cran, profil d'architecture. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { FORMAT_RECETTE, recetteParDefaut, type Palette, type Recette } from 'ucm-couleur';

import { indexer } from '../src/indexation';
import { emploisDeLAssociation, lireLaRecette, validerAssociation } from '../src/integrations/palettes';
import { cibleAttendue, controlerLeProfil, emploiDuNom } from '../src/integrations/profilUcm';
import { alias, constructeur, couleur, projetLibre } from './fixtures';

function recetteAvec(...noms: string[]): Recette {
  const palettes = noms.map((nom, rang) => ({ id: `p${rang}`, nom, reference: '#3366FF', derive: { lien: true, soft: [0, 0], vivid: [0, 0] } }) as unknown as Palette);
  return { ...recetteParDefaut(), palettes };
}

test('la recette se classe sans migration : absente, illisible, future', () => {
  assert.equal(lireLaRecette('').etat, 'absente');
  assert.equal(lireLaRecette('{ casse').etat, 'illisible');
  assert.equal(lireLaRecette(JSON.stringify({ formatVersion: FORMAT_RECETTE + 1 })).etat, 'future');
  assert.equal(lireLaRecette(JSON.stringify({ formatVersion: FORMAT_RECETTE - 1 })).etat, 'illisible');
});

test('une association se refuse hors d’une variable de couleur, d’une palette, d’une intensité ou d’un cran de la recette', () => {
  const index = indexer(projetLibre());
  const recette = recetteAvec('primary');
  const valide = { palette: 'p0', intensite: 'soft' as const, theme: 'light' as const, cran: 700 };
  assert.equal(validerAssociation(index, recette, 'papier', valide), null);
  assert.equal(validerAssociation(index, recette, 'zero', valide), 'type');
  assert.equal(validerAssociation(index, recette, 'papier', { ...valide, palette: 'inconnue' }), 'palette');
  assert.equal(validerAssociation(index, recette, 'papier', { ...valide, intensite: null }), 'intensite');
  assert.equal(validerAssociation(index, recette, 'papier', { ...valide, cran: 750 }), 'cran');
});

test('les emplois d’un cran viennent de la table du kit, rangs compris ; le neutre ajoute ses usages propres', () => {
  const recette = recetteAvec('primary', 'neutral');
  const sept = emploisDeLAssociation(recette, { palette: 'p0', intensite: 'soft', theme: 'light', cran: 700 });
  // 700 porte solid et text au repos, et border-control au survol : 600 avancé d'un cran.
  assert.deepEqual(sept.map((emploi) => `${emploi.emploi}:${emploi.rang}`), ['solid:default', 'text:default', 'border-control:hover']);
  const quatre = emploisDeLAssociation(recette, { palette: 'p0', intensite: 'soft', theme: 'light', cran: 400 });
  assert.ok(quatre.some((emploi) => emploi.emploi === 'surface' && emploi.rang === 'active-hover'));
  const cinq = emploisDeLAssociation(recette, { palette: 'p1', intensite: 'soft', theme: 'dark', cran: 500 });
  assert.deepEqual(cinq.map((emploi) => emploi.emploi), ['text-disabled']);
});

test('un nom de usage porte son emploi, son rang et son support', () => {
  assert.deepEqual(emploiDuNom('primary/solid/active-hover')?.rang, 'active-hover');
  assert.deepEqual(emploiDuNom('primary/focus')?.support.peint, ['ring']);
  assert.equal(emploiDuNom('primary/divers'), null);
  assert.equal(cibleAttendue('primary/solid/hover', recetteAvec('primary')), 'primary/800');
  assert.equal(cibleAttendue('neutral/text-disabled', recetteAvec('neutral')), 'neutral/500');
});

/** Un fichier aux noms libres, associé au profil par le designer. */
function fichierAssocie() {
  const c = constructeur('Multimarque');
  c.collection('c', 'Composants', ['M']);
  c.collection('u', 'Emplois', ['M']);
  c.collection('t', 'Thème', ['Light', 'Dark']);
  c.collection('p', 'Catalogue', ['M']);
  c.variable('bouton', 'c', 'button/bg', 'COLOR', { M: alias('u-solid') });
  c.variable('saut', 'c', 'button/border', 'COLOR', { M: alias('cat') });
  c.variable('u-solid', 'u', 'primary/solid/hover', 'COLOR', { M: alias('t-700') }, { portees: ['FRAME_FILL', 'SHAPE_FILL'] });
  c.variable('u-texte', 'u', 'primary/text/default', 'COLOR', { M: couleur('#000000') }, { portees: ['ALL_SCOPES'] });
  c.variable('t-700', 't', 'primary/700', 'COLOR', { Light: alias('cat'), Dark: alias('cat') }, { portees: [] });
  c.variable('cat', 'p', 'colors/blue/700', 'COLOR', { M: couleur('#1E40AF') }, { portees: ['ALL_SCOPES'] });
  return indexer(c.releve());
}

test('le profil contrôle les couches, les valeurs directes, les portées et la cible attendue, sur des noms libres', () => {
  const index = fichierAssocie();
  const constats = controlerLeProfil(index, { c: 'components', u: 'usage', t: 'theme', p: 'primitives' }, { recette: recetteAvec('primary') });
  assert.deepEqual(constats.map((constat) => `${constat.regle}:${constat.variable}`).sort(), [
    'cible:u-solid',
    'couche:saut',
    'couche:t-700',
    'couche:t-700',
    'portee:cat',
    'portee:u-texte',
    'valeur-directe:u-texte',
  ]);
});

test('sans association, le profil ne contrôle rien : un groupe nommé usage n’active aucun contrôle', () => {
  assert.deepEqual(controlerLeProfil(indexer(projetLibre()), {}), []);
  assert.deepEqual(controlerLeProfil(fichierAssocie(), {}), []);
});

test('une exception du designer retire l’écart ; un calque hors des couches citées est signalé', () => {
  const index = fichierAssocie();
  const couches = { c: 'components', u: 'usage', t: 'theme', p: 'primitives' } as const;
  const occurrences = [{ consommateur: '1:1', genre: 'calque' as const, nom: 'Bouton', page: null, propriete: 'fills[0]', variable: 'cat', modes: {} }];
  const avec = controlerLeProfil(index, couches, { occurrences });
  assert.ok(avec.some((constat) => constat.regle === 'calque' && constat.calque?.id === '1:1'));
  const exceptions = new Set(['calque:1:1:fills[0]', 'couche:saut:c:M']);
  const sans = controlerLeProfil(index, couches, { occurrences, exceptions });
  assert.equal(sans.some((constat) => exceptions.has(constat.cle)), false);
  assert.equal(sans.length, avec.length - 2);
});

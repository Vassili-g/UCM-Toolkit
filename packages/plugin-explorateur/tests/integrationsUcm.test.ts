/** Les intégrations UCM facultatives : recette Palettes, association à un cran, profil d'architecture. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { FORMAT_RECETTE, recetteParDefaut, type Palette, type Recette } from 'ucm-couleur';

import { indexer } from '../src/indexation';
import { lireLaRecette, validerAssociation, variablesDeLAssociation } from '../src/integrations/palettes';
import { coucheRangee, controlerLeProfil, nuanceAttendue, variableDuNom } from '../src/integrations/profilUcm';
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

test('les variables d’un cran viennent de la table des dossiers, dans le sens du thème ; le neutre ajoute les siennes', () => {
  const recette = recetteAvec('primary', 'neutral');
  const normal = variablesDeLAssociation(recette, { palette: 'p0', intensite: 'soft', theme: 'light', cran: 700 });
  assert.deepEqual(normal, ['solid/default', 'page/foreground', 'page/border']);
  const inverse = variablesDeLAssociation({ ...recette, texteDesBoutons: { light: 'noir', dark: 'noir' } }, { palette: 'p0', intensite: 'soft', theme: 'light', cran: 700 });
  assert.deepEqual(inverse, ['solid/default', 'page/focus']);
  const neutre = variablesDeLAssociation(recette, { palette: 'p1', intensite: 'soft', theme: 'dark', cran: 500 });
  assert.deepEqual(neutre, ['disabled/foreground', 'disabled/border']);
});

test('un nom de theme porte sa variable de dossier et son support', () => {
  assert.equal(variableDuNom('primary/solid/hover')?.variable, 'solid/hover');
  assert.equal(variableDuNom('success/vivid/page/focus')?.support.peint[0], 'ring');
  assert.equal(variableDuNom('neutral/page/foreground-main')?.variable, 'page/foreground-main');
  assert.deepEqual(variableDuNom('neutral/scale/0')?.support.portees, []);
  assert.equal(variableDuNom('primary/identity'), null);
  assert.equal(nuanceAttendue('primary/solid/hover', 'light', recetteAvec('primary')), 800);
  assert.equal(nuanceAttendue('primary/solid/foreground', 'light', recetteAvec('primary')), null);
});

const SOLID = ['FRAME_FILL', 'SHAPE_FILL', 'STROKE_COLOR'];

/** Un fichier remappé : `theme` en deux modes, aliasé vers `color-brands` et `color-utilities`. */
function fichierRemappe(aliasDeHover = 'b-800', portees: string[] = SOLID) {
  const c = constructeur('Multimarque');
  c.collection('c', 'Composants', ['M']);
  c.collection('t', 'Thème', ['Light', 'Dark']);
  c.collection('b', 'Marques', ['M']);
  c.collection('u', 'Utilitaires', ['M']);
  c.collection('p', 'Catalogue', ['M']);
  c.variable('bouton', 'c', 'button/bg', 'COLOR', { M: alias('t-hover') });
  c.variable('t-hover', 't', 'primary/solid/hover', 'COLOR', { Light: alias(aliasDeHover), Dark: alias('b-800') }, { portees });
  c.variable('t-defaut', 't', 'primary/solid/default', 'COLOR', { Light: alias('b-700'), Dark: alias('b-700') }, { portees: SOLID });
  c.variable('t-echelle', 't', 'neutral/scale/0', 'COLOR', { Light: alias('u-0'), Dark: alias('u-0') }, { portees: [] });
  c.variable('t-identite', 't', 'primary/identity', 'COLOR', { Light: alias('b-700'), Dark: alias('b-700') }, { portees: [] });
  c.variable('b-700', 'b', 'primary/light/700', 'COLOR', { M: alias('cat') }, { portees: [] });
  c.variable('b-600', 'b', 'primary/light/600', 'COLOR', { M: alias('cat') }, { portees: [] });
  c.variable('b-800', 'b', 'primary/light/800', 'COLOR', { M: alias('cat') }, { portees: [] });
  c.variable('u-0', 'u', 'neutral/0', 'COLOR', { M: alias('cat') }, { portees: [] });
  c.variable('cat', 'p', 'colors/blue/700', 'COLOR', { M: couleur('#1E40AF') }, { portees: [] });
  return indexer(c.releve());
}

test('une association rangée sous brand se lit color-brands ; usage et l’inconnu se lisent sans couche', () => {
  assert.equal(coucheRangee('brand'), 'color-brands');
  assert.equal(coucheRangee('theme'), 'theme');
  assert.equal(coucheRangee('usage'), null);
  assert.equal(coucheRangee('autre'), null);
});

const COUCHES_REMAPPEES = { c: 'components', t: 'theme', b: 'color-brands', u: 'color-utilities', p: 'primitives' } as const;

test('un fichier à la forme du fichier remappé ne rend aucun constat', () => {
  assert.deepEqual(controlerLeProfil(fichierRemappe(), COUCHES_REMAPPEES, { recette: recetteAvec('primary') }), []);
});

test('un alias de solid/hover vers la 700 en Light rend un constat de nuance', () => {
  const constats = controlerLeProfil(fichierRemappe('b-700'), COUCHES_REMAPPEES, { recette: recetteAvec('primary') });
  assert.deepEqual(constats.map((constat) => `${constat.regle}:${constat.variable}:${constat.attendue}`), ['nuance:t-hover:800']);
});

test('en Dark inversé, la 600 est attendue pour solid/hover', () => {
  const recette = { ...recetteAvec('primary'), texteDesBoutons: { light: 'blanc', dark: 'blanc' } } as Recette;
  const constats = controlerLeProfil(fichierRemappe(), COUCHES_REMAPPEES, { recette });
  // Light reste normal et vise 800 : seul Dark, qui vise 800 au lieu de 600, déroge.
  assert.deepEqual(constats.map((constat) => `${constat.regle}:${constat.mode}:${constat.attendue}`), ['nuance:t:Dark:600']);
  const lightInverse = { ...recetteAvec('primary'), texteDesBoutons: { light: 'noir', dark: 'noir' } } as Recette;
  // Light inversé attend 600 et le trouve ; Dark normal attend 800 et le trouve.
  assert.deepEqual(controlerLeProfil(fichierRemappe('b-600'), COUCHES_REMAPPEES, { recette: lightInverse }), []);
});

test('une variable de dossier sans portée rend un constat de portée, avec les portées de la table', () => {
  const constats = controlerLeProfil(fichierRemappe('b-800', []), COUCHES_REMAPPEES);
  assert.deepEqual(constats.map((constat) => `${constat.regle}:${constat.variable}:${constat.attendue}`), ['portee:t-hover:FRAME_FILL, SHAPE_FILL, STROKE_COLOR']);
});

/** Un fichier aux noms libres, associé au profil par le designer. */
function fichierAssocie() {
  const c = constructeur('Multimarque');
  c.collection('c', 'Composants', ['M']);
  c.collection('t', 'Thème', ['M']);
  c.collection('b', 'Marques', ['M']);
  c.collection('p', 'Catalogue', ['M']);
  c.variable('bouton', 'c', 'button/bg', 'COLOR', { M: alias('t-solid') });
  c.variable('saut', 'c', 'button/border', 'COLOR', { M: alias('cat') });
  c.variable('t-solid', 't', 'primary/solid/default', 'COLOR', { M: alias('b-700') }, { portees: ['FRAME_FILL', 'SHAPE_FILL', 'STROKE_COLOR'] });
  c.variable('t-texte', 't', 'primary/page/foreground', 'COLOR', { M: couleur('#000000') }, { portees: ['ALL_SCOPES'] });
  c.variable('b-700', 'b', 'primary/light/700', 'COLOR', { M: alias('cat') }, { portees: [] });
  c.variable('cat', 'p', 'colors/blue/700', 'COLOR', { M: couleur('#1E40AF') }, { portees: ['ALL_SCOPES'] });
  return indexer(c.releve());
}

const COUCHES_ASSOCIEES = { c: 'components', t: 'theme', b: 'color-brands', p: 'primitives' } as const;

test('le profil contrôle les couches, les valeurs directes et les portées, sur des noms libres', () => {
  const constats = controlerLeProfil(fichierAssocie(), COUCHES_ASSOCIEES, { recette: recetteAvec('primary') });
  assert.deepEqual(constats.map((constat) => `${constat.regle}:${constat.variable}`).sort(), [
    'couche:saut',
    'portee:cat',
    'portee:t-texte',
    'valeur-directe:t-texte',
  ]);
});

test('sans association, le profil ne contrôle rien : un groupe nommé usage n’active aucun contrôle', () => {
  assert.deepEqual(controlerLeProfil(indexer(projetLibre()), {}), []);
  assert.deepEqual(controlerLeProfil(fichierAssocie(), {}), []);
});

test('une exception du designer retire l’écart', () => {
  const index = fichierAssocie();
  const avec = controlerLeProfil(index, COUCHES_ASSOCIEES);
  const exceptions = new Set(['couche:saut:c:M']);
  const sans = controlerLeProfil(index, COUCHES_ASSOCIEES, { exceptions });
  assert.equal(sans.some((constat) => exceptions.has(constat.cle)), false);
  assert.equal(sans.length, avec.length - 1);
});

test('une recette au format 8 se lit avec une palette figée : sa liste de nuances est la sienne, à une seule intensité', () => {
  const nuances = [0, 10, 20, 30, 40];
  const nulle = { clair: 0, sombre: 0, origine: 'tailwind' };
  const figee = { id: 'p-000000f8', nom: 'slate', reference: '#475569', derive: { lien: true, soft: nulle, vivid: nulle }, intensites: 1 as const, crans: nuances, figees: { light: ['#FFFFFF', '#E2E8F0', '#94A3B8', '#475569', '#0F172A'] } };
  const lue = lireLaRecette(JSON.stringify({ ...recetteParDefaut(), palettes: [figee] }));
  assert.equal(lue.etat, 'courante');
  if (lue.etat !== 'courante') return;
  assert.equal(lue.recette.formatVersion, FORMAT_RECETTE);
  const index = indexer(projetLibre());
  const variable = [...index.variables.values()].find((candidate) => candidate.type === 'COLOR')!.id;
  assert.equal(validerAssociation(index, lue.recette, variable, { palette: figee.id, intensite: null, theme: 'light', cran: 30 }), null);
  assert.equal(validerAssociation(index, lue.recette, variable, { palette: figee.id, intensite: null, theme: 'light', cran: 50 }), 'cran');
  assert.equal(validerAssociation(index, lue.recette, variable, { palette: figee.id, intensite: 'soft', theme: 'light', cran: 30 }), 'intensite');
});

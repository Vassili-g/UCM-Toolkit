/**
 * Garde le thème de base des stress tests F2 : P0, p37 et un échantillon de profils donnent zéro constat de
 * `controlerLeCatalogue` et de `controlerLIntegriteUcm`, chaque profil a une carte complète et une valeur dans chaque mode de
 * chaque collection. Les 72 profils se construisent ici ; le contrôle complet de chacun se lance par le harnais, hors de `npm test`.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { controlerLIntegriteUcm, controlerLeCatalogue, type CatalogueDeReference } from '../src/controles/index.js';
import { variableDuThemeReconnue } from '../src/referentiel/theme.js';
import { MODES_DU_THEME, paletteDeCarte, roleDeCarte, tousLesRoles, verifierLaCarte } from './stress/f2-structure/carte.js';
import {
  PROFILS_DE_THEME, PROFIL_P0, PROFIL_P37, copierLeTheme, profilTire, themeDuProfil, type ProfilDeTheme, type ThemeDeBase,
} from './stress/f2-structure/themeUcm.js';

const parId = (id: string): ProfilDeTheme => PROFILS_DE_THEME.find((profil) => profil.id === id)!;

const constats = (base: ThemeDeBase) => [...controlerLeCatalogue(base.catalogue), ...controlerLIntegriteUcm(base.catalogue, { ecriture: base.ecriture })];

/** Un profil par écriture, par palettes, par rampes et par sens, avec et sans collection redite : un échantillon de toutes les dimensions. */
const ECHANTILLON = ['p01', 'p14', 'p20', 'p37', 'p42', 'p53', 'p60', 'p72'].map(parId);

test('les 72 profils sont uniques, numérotés de p01 à p72, et P0 et p37 en font partie', () => {
  assert.equal(PROFILS_DE_THEME.length, 72);
  assert.equal(new Set(PROFILS_DE_THEME.map((profil) => profil.id)).size, 72);
  assert.equal(PROFILS_DE_THEME[0].id, 'p01');
  assert.equal(PROFILS_DE_THEME[71].id, 'p72');
  assert.deepEqual({ ...PROFIL_P0, id: '' }, { id: '', palettes: 'moyenne', ecriture: 'minuscules-tiret', collectionRedite: false, sens: 'mixte', rampes: 'locales' });
  assert.deepEqual({ ...PROFIL_P37, id: '' }, { id: '', palettes: 'minimale', ecriture: 'capitales-tiret', collectionRedite: false, sens: 'mixte', rampes: 'locales' });
  assert.equal(profilTire().palettes, 'large');
});

test('P0 compte 2 marques, le neutre et 8 statuts, avec secondary en sens inverse sur les deux modes', () => {
  const base = themeDuProfil(PROFIL_P0);
  assert.deepEqual(base.carte.palettes.map((palette) => palette.id), [
    'primary', 'secondary', 'neutral', 'success/soft', 'success/vivid', 'warning/soft', 'warning/vivid', 'info/soft', 'info/vivid', 'danger/soft', 'danger/vivid',
  ]);
  for (const palette of base.carte.palettes) {
    const attendu = palette.id === 'secondary' ? 'inverse' : 'normal';
    assert.deepEqual(palette.sens, { light: attendu, dark: attendu }, palette.id);
  }
  assert.deepEqual(constats(base), []);
});

test('p37 est minimal, en capitales initiales, avec primary en sens inverse', () => {
  const base = themeDuProfil(PROFIL_P37);
  assert.deepEqual(base.carte.palettes.map((palette) => [palette.id, palette.sens.light]), [['primary', 'inverse'], ['neutral', 'normal']]);
  assert.equal(base.carte.palettes[0].roles['solid/default'].nom, 'Primary/Solid/Default');
  assert.equal(base.carte.palettes[1].roles['page/foreground-main'].nom, 'Neutral/Page/Foreground-Main');
  assert.deepEqual(constats(base), []);
});

test('un échantillon de profils, de chaque dimension, ne donne aucun constat', () => {
  for (const profil of [...ECHANTILLON, profilTire()]) assert.deepEqual(constats(themeDuProfil(profil)), [], profil.id);
});

test('les 72 profils se construisent avec une carte complète, des noms uniques et des rôles reconnus', () => {
  for (const profil of PROFILS_DE_THEME) {
    const base = themeDuProfil(profil);
    assert.deepEqual(verifierLaCarte(base.catalogue, base.carte), [], profil.id);
    assert.equal(new Set(base.catalogue.variables.map((variable) => variable.cle)).size, base.catalogue.variables.length, `${profil.id} : clés en double`);
    for (const { role } of tousLesRoles(base.carte)) assert.equal(variableDuThemeReconnue(role.nom), role.role, `${profil.id} ${role.nom}`);
    assert.equal(tousLesRoles(base.carte).filter(({ palette }) => palette === null).length, 5, profil.id);
  }
});

test('chaque profil compte au moins une valeur dans chaque mode de chaque collection', () => {
  for (const profil of PROFILS_DE_THEME) {
    const { catalogue } = themeDuProfil(profil);
    assert.equal(catalogue.collections.length, 6, profil.id);
    for (const collection of catalogue.collections) {
      assert.ok(collection.modes.length >= 1, `${profil.id} ${collection.cle}`);
      for (const mode of collection.modes) {
        const nombre = catalogue.variables.filter((variable) => variable.collection === collection.cle && variable.valeurs?.[mode.id] !== undefined).length;
        assert.ok(nombre > 0, `${profil.id} : ${collection.cle} sans valeur en ${mode.nom}`);
      }
    }
    for (const variable of catalogue.variables) {
      const modes = catalogue.collections.find((collection) => collection.cle === variable.collection)!.modes;
      assert.deepEqual(Object.keys(variable.valeurs ?? {}).sort(), modes.map((mode) => mode.id).sort(), `${profil.id} ${variable.cle}`);
    }
  }
});

test('la carte donne le sens par mode, la clé de chaque rôle et la cible de la table', () => {
  const { carte, catalogue } = themeDuProfil(PROFIL_P0);
  const secondary = paletteDeCarte(carte, 'secondary');
  assert.equal(secondary.sens.dark, 'inverse');
  const survol = roleDeCarte(carte, 'secondary', 'solid/hover');
  assert.equal(survol.cle, 'theme|secondary/solid/hover');
  assert.deepEqual(survol.cibles.light.vise, { cran: 600 });
  assert.equal(survol.cibles.light.nom, 'secondary/light/600');
  assert.deepEqual(roleDeCarte(carte, 'primary', 'solid/hover').cibles.dark.vise, { cran: 800 });
  assert.deepEqual(roleDeCarte(carte, 'secondary', 'solid/foreground').cibles.light.vise, { absolue: 'black' });
  assert.equal(roleDeCarte(carte, 'secondary', 'solid/foreground').cibles.light.nom, 'neutral/light/black');
  assert.deepEqual(roleDeCarte(carte, 'neutral', 'scale/0').cibles.dark.vise, { absolue: 'black' });
  assert.equal(roleDeCarte(carte, null, 'disabled/border').cibles.dark.nom, 'neutral/dark/500');
  assert.equal(roleDeCarte(carte, null, 'elevation/raised').cibles.light.nom, 'elevation/light/raised');
  assert.equal(secondary.rampes.dark[950].nom, 'secondary/dark/950');
  const variable = catalogue.variables.find((entree) => entree.cle === survol.cle)!;
  assert.deepEqual(variable.scopes, ['FRAME_FILL', 'SHAPE_FILL']);
  assert.equal(variable.valeurs![carte.modes.dark.id] && 'alias' in variable.valeurs![carte.modes.dark.id] && (variable.valeurs![carte.modes.dark.id] as { alias: string }).alias, survol.cibles.dark.cle);
  assert.deepEqual(MODES_DU_THEME, ['light', 'dark']);
});

test('les rampes de library sont marquées distantes, les autres locales', () => {
  const distant = themeDuProfil(parId('p05'));
  assert.equal(distant.profil.rampes, 'distantes');
  assert.ok(distant.catalogue.library);
  assert.ok(distant.catalogue.variables.filter((variable) => variable.collection === 'brands').every((variable) => variable.distante === true));
  assert.ok(distant.catalogue.variables.filter((variable) => variable.collection !== 'brands').every((variable) => variable.distante === undefined));
  const local = themeDuProfil(PROFIL_P0);
  assert.equal(local.catalogue.library, null);
  assert.ok(local.catalogue.variables.every((variable) => variable.distante === undefined));
});

test('le sens ne dépend d\'aucune teinte : changer les couleurs des primitives ne change aucun constat', () => {
  const a = themeDuProfil(PROFIL_P0, 7102);
  const b = themeDuProfil(PROFIL_P0, 1);
  const couleurs = (base: ThemeDeBase) => base.catalogue.variables.filter((variable) => variable.collection === 'primitives').map((variable) => JSON.stringify(variable.valeurs));
  assert.notDeepEqual(couleurs(a), couleurs(b));
  assert.deepEqual(constats(b), []);
});

test('une même graine rend le même thème', () => {
  assert.deepEqual(themeDuProfil(PROFIL_P0, 7102), themeDuProfil(PROFIL_P0, 7102));
});

test('une copie ne partage rien avec la base, et dégrader la copie n\'altère pas la base', () => {
  const base = themeDuProfil(PROFIL_P0);
  const copie = copierLeTheme(base);
  assert.deepEqual(copie, base);
  copie.catalogue.variables.pop();
  copie.catalogue.variables[0].nom = 'autre';
  (copie.carte.palettes[0].roles['ring'] as { nom: string }).nom = 'autre';
  assert.deepEqual(constats(base), []);
  assert.deepEqual(verifierLaCarte(base.catalogue, base.carte), []);
  assert.notDeepEqual(verifierLaCarte(copie.catalogue as CatalogueDeReference, copie.carte), []);
});

test('le profil large compte environ 1 000 variables et se contrôle en moins d\'une seconde', () => {
  const large = themeDuProfil(PROFILS_DE_THEME.find((profil) => profil.palettes === 'large')!);
  assert.ok(large.catalogue.variables.length > 800 && large.catalogue.variables.length < 1400, String(large.catalogue.variables.length));
  const debut = Date.now();
  assert.deepEqual(constats(large), []);
  assert.ok(Date.now() - debut < 1000, `${Date.now() - debut} ms`);
});

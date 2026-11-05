/** C82 : le cran qu'une variable de `theme` vise, jugé sur la table des dossiers et sur le sens que la palette établit. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { controlerLIntegriteUcm, type CatalogueDeReference, type Constat } from '../src/controles/index.js';
import { MODE_DARK, MODE_LIGHT, PALETTES, avecEcriture, catalogueDeStructure, cleDeLaFixture } from './fixtures/catalogueDeStructure.js';

const ecriture = avecEcriture('minuscules', 'tiret');
const crans = (catalogue: CatalogueDeReference): Constat[] => controlerLIntegriteUcm(catalogue, { ecriture }).filter((constat) => constat.faits.genre === 'cran');

const du = (constats: readonly Constat[], variable: string, mode: string): Constat => {
  const constat = constats.find((entree) => entree.faits.variable === variable && entree.faits.mode === mode);
  assert.ok(constat, `${variable} ${mode}`);
  return constat;
};

/** Le même catalogue, avec un alias de plus ou de remplacé dans un mode d'une variable de `theme`. */
const avecAlias = (catalogue: CatalogueDeReference, nom: string, mode: string, cible: string): CatalogueDeReference => ({
  ...catalogue,
  variables: catalogue.variables.map((entree) => (entree.cle === cleDeLaFixture('theme', nom)
    ? { ...entree, valeurs: { ...entree.valeurs, [mode]: { alias: cible } } } : entree)),
});

test('1. la fixture rend les six écarts relevés dans le fichier, et aucun autre', () => {
  const constats = crans(catalogueDeStructure());
  assert.equal(constats.length, 3 * PALETTES.length + 3);
  assert.equal(new Set(constats.map((constat) => constat.id)).size, constats.length);
  assert.ok(constats.every((constat) => constat.code === 'C82' && constat.type === 'corriger' && constat.famille === 'liaisons' && constat.correction?.sorte === 'alias-de-mode'));
  const attendus: [string, number, number][] = [['surface/default', 300, 200], ['surface/hover', 400, 300], ['surface/pressed', 500, 400]];
  for (const [role, lu, attendu] of attendus) {
    const memes = constats.filter((constat) => String(constat.faits.variable).endsWith(`/${role}`));
    assert.equal(memes.length, PALETTES.length, role);
    assert.ok(memes.every((constat) => constat.faits.mode === 'dark' && constat.faits.avant === lu && constat.faits.attendu === attendu), role);
  }
});

test('2. surface/default en Dark vise la 300 au lieu de la 200 : la correction pointe la variable du même préfixe', () => {
  const constat = du(crans(catalogueDeStructure()), 'primary/surface/default', 'dark');
  assert.equal(constat.id, `C82:cran:${cleDeLaFixture('theme', 'primary/surface/default')}:${MODE_DARK}`);
  assert.deepEqual(constat.correction?.cible, { variable: cleDeLaFixture('theme', 'primary/surface/default'), mode: MODE_DARK });
  assert.equal(constat.correction?.avant, cleDeLaFixture('brands', 'primary/dark/300'));
  assert.deepEqual(constat.correction?.apres, { cle: cleDeLaFixture('brands', 'primary/dark/200'), nom: 'primary/dark/200' });
  const statut = du(crans(catalogueDeStructure()), 'success/vivid/surface/default', 'dark');
  assert.equal(statut.correction?.apres.nom, 'success/vivid/dark/200');
  const neutre = du(crans(catalogueDeStructure()), 'neutral/surface/default', 'dark');
  assert.equal(neutre.correction?.apres.cle, cleDeLaFixture('utility', 'neutral/dark/200'));
});

test('3. surface/foreground en Light vise la 800 : la 700 est attendue dans le sens normal', () => {
  const constat = du(crans(catalogueDeStructure()), 'primary/surface/foreground', 'light');
  assert.equal(constat.faits.avant, 800);
  assert.equal(constat.faits.attendu, 700);
  assert.equal(constat.correction?.apres.nom, 'primary/light/700');
});

test('4. ring en Dark vise la 700 : la 800 est attendue dans le sens inverse', () => {
  const constat = du(crans(catalogueDeStructure()), 'primary/ring', 'dark');
  assert.equal(constat.faits.avant, 700);
  assert.equal(constat.faits.attendu, 800);
  assert.equal(constat.correction?.apres.nom, 'primary/dark/800');
});

test('5. disabled/background en Light vise la 100 du neutre : la 200 est attendue', () => {
  const constat = du(crans(catalogueDeStructure()), 'disabled/background', 'light');
  assert.equal(constat.faits.avant, 100);
  assert.equal(constat.faits.attendu, 200);
  assert.equal(constat.correction?.avant, cleDeLaFixture('utility', 'neutral/light/100'));
  assert.deepEqual(constat.correction?.apres, { cle: cleDeLaFixture('utility', 'neutral/light/200'), nom: 'neutral/light/200' });
});

test('6. une variable du neutre qui vise la mauvaise couleur absolue se corrige vers l’absolue attendue', () => {
  const catalogue = avecAlias(catalogueDeStructure(), 'neutral/scale/0', MODE_LIGHT, cleDeLaFixture('utility', 'neutral/light/black'));
  const constat = du(crans(catalogue), 'neutral/scale/0', 'light');
  assert.equal(constat.faits.avant, 'black');
  assert.equal(constat.faits.attendu, 'white');
  assert.equal(constat.correction?.apres.nom, 'neutral/light/white');
});

test('7. solid/foreground noir en Light ne vote pas et ne se corrige pas : il rend une question à deux réponses, le blanc et le noir (Q-F2-3)', () => {
  const catalogue = avecAlias(catalogueDeStructure(), 'primary/solid/foreground', MODE_LIGHT, cleDeLaFixture('utility', 'neutral/light/black'));
  const lus = crans(catalogue).filter((constat) => constat.faits.mode === 'light' && String(constat.faits.variable).startsWith('primary/'));
  assert.deepEqual(lus.map((constat) => constat.faits.variable), ['primary/solid/foreground', 'primary/surface/foreground']);
  assert.equal(lus[0].correction, undefined);
  assert.equal(lus[0].type, 'verifier');
  assert.deepEqual(lus[0].question?.candidats.map(({ nom }) => nom), ['neutral/light/white', 'neutral/light/black']);
  // Le sens reste le sens normal : surface/foreground garde sa correction vers la 700.
  assert.equal(lus[1].correction?.apres.nom, 'primary/light/700');
});

test('8. un alias vers l’autre branche de mode ne rend pas de C82 : C60 le rend', () => {
  const catalogue = avecAlias(catalogueDeStructure(), 'primary/surface/default', MODE_LIGHT, cleDeLaFixture('brands', 'primary/dark/300'));
  const lus = crans(catalogue).filter((constat) => constat.faits.variable === 'primary/surface/default');
  assert.deepEqual(lus.map((constat) => constat.faits.mode), ['dark']);
});

test('9. un rôle déplacé sur le cran de l’autre table ne retourne pas le sens : il reçoit sa correction, et les autres gardent la leur (N-25)', () => {
  const catalogue = avecAlias(catalogueDeStructure(), 'primary/solid/pressed', MODE_LIGHT, cleDeLaFixture('brands', 'primary/light/500'));
  const lus = crans(catalogue).filter((constat) => constat.faits.mode === 'light' && String(constat.faits.variable).startsWith('primary/'));
  assert.equal(du(lus, 'primary/solid/pressed', 'light').correction?.apres.nom, 'primary/light/900');
  assert.equal(du(lus, 'primary/surface/foreground', 'light').correction?.apres.nom, 'primary/light/700');
  assert.equal(controlerLIntegriteUcm(catalogue, { ecriture }).some((constat) => constat.faits.genre === 'sens-partage'), false);
});

/** Un groupe sans vote : deux variables seulement, dont le cran n'est dans aucune table, qui visent la rampe de `primary` en Light. */
function groupeSansVote(): CatalogueDeReference {
  const catalogue = catalogueDeStructure();
  const variable = (nom: string, cran: number) => ({
    cle: cleDeLaFixture('theme', nom), nom, collection: 'theme', type: 'COLOR' as const, etat: 'presente' as const,
    valeurs: { [MODE_LIGHT]: { alias: cleDeLaFixture('brands', `primary/light/${cran}`) } },
  });
  return { ...catalogue, variables: [...catalogue.variables, variable('tertiary/ring', 500), variable('tertiary/surface/foreground', 800)] };
}

test('10. sans sens établi, un cran d’aucune table rend une question ; avec des votes contraires, un cran de l’une des deux ne rend rien', () => {
  const constats = crans(groupeSansVote()).filter((constat) => String(constat.faits.variable).startsWith('tertiary/'));
  assert.deepEqual(constats.map((constat) => constat.faits.variable).sort(), ['tertiary/ring', 'tertiary/surface/foreground']);
  assert.ok(constats.every((constat) => constat.correction === undefined));
  assert.deepEqual(du(constats, 'tertiary/ring', 'light').question?.candidats.map(({ nom }) => nom), ['primary/light/600', 'primary/light/700']);
  assert.deepEqual(du(constats, 'tertiary/surface/foreground', 'light').question?.candidats.map(({ nom }) => nom), ['primary/light/700', 'primary/light/900']);
  const contraires = avecAlias(catalogueDeStructure(), 'primary/solid/pressed', MODE_LIGHT, cleDeLaFixture('brands', 'primary/light/500'));
  assert.equal(crans(contraires).some((constat) => constat.faits.variable === 'primary/ring' && constat.faits.mode === 'light'), false);
});

test('11. un cran absent de la rampe est le constat de rampe de I1, sans constat de cran', () => {
  const catalogue = catalogueDeStructure();
  const sansDeux: CatalogueDeReference = { ...catalogue, variables: catalogue.variables.filter((entree) => entree.cle !== cleDeLaFixture('brands', 'primary/dark/200')) };
  const constats = controlerLIntegriteUcm(sansDeux, { ecriture });
  const rampe = constats.filter((constat) => constat.id === 'C82:cran-absent:theme:primary/dark/200');
  assert.equal(rampe.length, 1);
  assert.match(String(rampe[0].faits.variables), /primary\/surface\/default/);
  assert.equal(constats.some((constat) => constat.faits.genre === 'cran' && constat.faits.variable === 'primary/surface/default'), false);
});

test('12. une rampe de library donne le constat de cran, sans correction', () => {
  const catalogue = catalogueDeStructure();
  const distante: CatalogueDeReference = {
    ...catalogue,
    variables: catalogue.variables.map((entree) => (entree.collection === 'brands' && entree.nom.startsWith('primary/') ? { ...entree, distante: true as const } : entree)),
  };
  const constat = du(crans(distante), 'primary/surface/default', 'dark');
  assert.equal(constat.correction, undefined);
  assert.equal(constat.question, undefined);
  assert.equal(constat.faits.attendu, 200);
});

test('13. un rôle ignoré n’est cité par aucun constat de cran', () => {
  const constats = controlerLIntegriteUcm(catalogueDeStructure(), { ecriture, rolesIgnores: ['surface/default'] }).filter((constat) => constat.faits.genre === 'cran');
  assert.equal(constats.some((constat) => String(constat.faits.variable).endsWith('/surface/default')), false);
});

test('14. page/foreground ou page/border déplacé sur le cran de l’autre table garde son cran faux visible (N-25)', () => {
  for (const role of ['page/foreground', 'page/border']) {
    const catalogue = avecAlias(catalogueDeStructure(), `primary/${role}`, MODE_LIGHT, cleDeLaFixture('brands', 'primary/light/800'));
    const constat = du(crans(catalogue), `primary/${role}`, 'light');
    assert.equal(constat.faits.avant, 800);
    assert.equal(constat.correction?.apres.nom, 'primary/light/700');
  }
});

test('15. une palette dont les rôles se répartissent entre les deux tables rend une question par mode sur le texte des boutons, sans correction (Q-F2-3)', () => {
  let catalogue = catalogueDeStructure();
  catalogue = avecAlias(catalogue, 'primary/solid/hover', MODE_LIGHT, cleDeLaFixture('brands', 'primary/light/600'));
  catalogue = avecAlias(catalogue, 'primary/solid/pressed', MODE_LIGHT, cleDeLaFixture('brands', 'primary/light/500'));
  const constats = controlerLIntegriteUcm(catalogue, { ecriture });
  const partages = constats.filter((constat) => constat.faits.genre === 'sens-partage');
  assert.equal(partages.length, 1);
  assert.deepEqual([partages[0].faits.groupe, partages[0].faits.mode, partages[0].type], ['primary', 'light', 'verifier']);
  assert.equal(partages[0].correction, undefined);
  assert.deepEqual(partages[0].question?.candidats.map(({ nom }) => nom), ['neutral/light/white', 'neutral/light/black']);
  // Les rôles sur le cran de l’une des deux tables passent sans bruit tant que la palette n’a pas choisi.
  assert.equal(crans(catalogue).some((constat) => constat.faits.mode === 'light' && ['primary/solid/hover', 'primary/solid/pressed'].includes(String(constat.faits.variable))), false);
});

test('16. un rôle sur la rampe d’une autre palette, au bon cran, rend une question sans correction ni cran (Q-F2-2)', () => {
  const catalogue = avecAlias(catalogueDeStructure(), 'primary/surface/default', MODE_LIGHT, cleDeLaFixture('brands', 'secondary/light/100'));
  const constats = controlerLIntegriteUcm(catalogue, { ecriture });
  const etrangeres = constats.filter((constat) => constat.faits.genre === 'rampe-autre-palette');
  assert.equal(etrangeres.length, 1);
  assert.deepEqual([etrangeres[0].faits.variable, etrangeres[0].faits.mode, etrangeres[0].type], ['primary/surface/default', 'light', 'verifier']);
  assert.equal(etrangeres[0].correction, undefined);
  assert.deepEqual(etrangeres[0].question?.candidats.map(({ nom }) => nom), ['primary/light/100', 'secondary/light/100']);
  assert.equal(crans(catalogue).some((constat) => constat.faits.variable === 'primary/surface/default' && constat.faits.mode === 'light'), false);
});

test('17. deux variables sur la rampe d’une autre palette ne votent pas pour le sens', () => {
  let catalogue = catalogueDeStructure();
  catalogue = avecAlias(catalogue, 'primary/solid/hover', MODE_LIGHT, cleDeLaFixture('brands', 'secondary/light/600'));
  catalogue = avecAlias(catalogue, 'primary/solid/pressed', MODE_LIGHT, cleDeLaFixture('brands', 'secondary/light/500'));
  const constats = controlerLIntegriteUcm(catalogue, { ecriture });
  assert.equal(constats.filter((constat) => constat.faits.genre === 'rampe-autre-palette').length, 2);
  assert.equal(constats.some((constat) => constat.faits.genre === 'sens-partage'), false);
});

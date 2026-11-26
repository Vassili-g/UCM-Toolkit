/**
 * Recette d'Alert, D9 et D14 : `Type` et `Kind` ne disent pas ce que leurs valeurs pilotent. Elles le disent, par leur registre
 * (palettes, tailles, états) puis par la position où les tokens les écrivent ; sans indice, le nom générique pilote le style.
 * Un renommage proposé n'a jamais pour candidat la valeur d'un autre axe.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  axeDePropriete, axesDuReleve, controlerNommage, controlerOublis, rolesDesProprietes,
  type CatalogueDeReference, type Constat, type ReleveDeComposant, type VariableDuCatalogue,
} from '../src/controles/index.js';

type Axe = readonly [nom: string, valeurs: readonly string[]];

function combinaisons(axes: readonly Axe[]): Record<string, string>[] {
  return axes.reduce<Record<string, string>[]>((debut, [nom, valeurs]) => debut.flatMap((partiel) => valeurs.map((valeur) => ({ ...partiel, [nom]: valeur }))), [{}]);
}

function releve(composant: string, axes: readonly Axe[]): ReleveDeComposant {
  const variants = combinaisons(axes).map((valeurs, rang) => ({
    id: `v${rang}`, nom: Object.entries(valeurs).map(([nom, valeur]) => `${nom}=${valeur}`).join(', '), valeurs, modesEffectifs: {}, layers: [],
  }));
  return {
    version: 1, jeu: { cle: composant.toLowerCase(), id: composant.toLowerCase(), nom: composant },
    proprietes: axes.map(([nom, valeurs]) => ({ nom, type: 'VARIANT' as const, valeurs: [...valeurs], defaut: valeurs[0] })),
    variants, lecture: { layersLus: 0, layersNonLus: 0, variantsNonLus: [], manquees: [] }, espaceDeCouleur: 'srgb',
  };
}

const jeton = (nom: string): VariableDuCatalogue => ({ cle: nom, nom, collection: 'components', type: 'COLOR', etat: 'presente' });

function catalogue(noms: readonly string[]): CatalogueDeReference {
  return {
    version: 1, library: null,
    collections: [{ cle: 'components', nom: 'components', role: 'components', modes: [{ id: 'l', nom: 'Light' }], etat: 'lue' }],
    variables: noms.map(jeton),
  };
}

const codes = (constats: readonly Constat[]): string[] => constats.map(({ code }) => code);

// ---------------------------------------------------------------------------------------------------------------------------
// Alert : Type vaut Info, Success, Warning ou Error, Variant vaut Filled ou Outlined

const ALERT: readonly Axe[] = [['Type', ['Info', 'Success', 'Warning', 'Error']], ['Variant', ['Filled', 'Outlined']]];
const ROLES_D_ALERT = ['foreground', 'background', 'border', 'icon', 'text', 'ring'];
const PALETTES_D_ALERT = ['Info', 'Success', 'Warning', 'Danger'];
const TOKENS_D_ALERT = PALETTES_D_ALERT.flatMap((palette) => ['Filled', 'Outlined'].flatMap((style) => ROLES_D_ALERT.map((role) => `Alert/Color/${palette}/${style}/${role}`)));

test('D9 : le relevé d’Alert (8 variants, 48 tokens de couleur) lit Type comme la palette et Variant comme le style', () => {
  assert.equal(TOKENS_D_ALERT.length, 48);
  const axes = axesDuReleve(releve('Alert', ALERT), catalogue(TOKENS_D_ALERT));
  assert.equal(axes.palette?.nom, 'Type');
  assert.equal(axes.style?.nom, 'Variant');
});

test('D9 : Alert ne donne ni C63 deux-axes-de-style, ni C13, ni C7, ni C32 sans-variant, ni C33', () => {
  const r = releve('Alert', ALERT);
  const c = catalogue(TOKENS_D_ALERT);
  const constats = [...controlerNommage(r, c), ...controlerOublis(r, c)];
  assert.ok(!constats.some((constat) => constat.code === 'C63' && constat.faits.genre === 'deux-axes-de-style'), 'C63 deux-axes-de-style');
  for (const code of ['C13', 'C7', 'C33']) assert.deepEqual(constats.filter((constat) => constat.code === code), [], code);
  assert.deepEqual(constats.filter((constat) => constat.code === 'C32' && constat.faits.motif === 'sans-variant'), [], 'C32 sans-variant');
  // Les tokens n'ont aucun layer qui les lie dans ce relevé : C32 `inutilise` se juge dans les tests de couverture, il n'est pas l'objet de D9. Seul reste le constat d'écriture : `Error` s'écrit `Danger`, comme le token.
  const restants = constats.filter(({ code, faits }) => !(code === 'C32' && faits.motif === 'inutilise'));
  assert.deepEqual(restants.map(({ code, faits }) => [code, faits.valeur, faits.attendu]), [['C8', 'Error', 'Danger']]);
});

// ---------------------------------------------------------------------------------------------------------------------------
// D9 : le rôle d'un nom générique

test('D9 : Kind=Info|Success donne une palette', () => {
  const r = releve('Alert', [['Kind', ['Info', 'Success']]]);
  assert.equal(axesDuReleve(r).palette?.nom, 'Kind');
  assert.equal(axesDuReleve(r).style, undefined);
  assert.equal(axeDePropriete('Kind', ['Info', 'Success']), 'palette');
});

test('D9 : Type=Primary|Secondary|Tertiary donne un style', () => {
  const r = releve('Button', [['Type', ['Primary', 'Secondary', 'Tertiary']]]);
  assert.equal(axesDuReleve(r).style?.nom, 'Type');
  assert.equal(axesDuReleve(r).palette, undefined);
});

test('D9 : Type=Small|Large donne une taille', () => {
  const r = releve('Chip', [['Type', ['Small', 'Large']]]);
  assert.equal(axesDuReleve(r).taille?.nom, 'Type');
  assert.equal(axesDuReleve(r).style, undefined);
});

test('D9 : Type=Hover|Disabled donne un état', () => {
  const r = releve('Chip', [['Type', ['Default', 'Hover', 'Disabled']]]);
  assert.equal(axesDuReleve(r).etat?.nom, 'Type');
});

test('D9 : un Type aux valeurs mêlées (Info, Large) garde le repli du style', () => {
  const r = releve('Chip', [['Type', ['Info', 'Large']]]);
  assert.equal(axesDuReleve(r).style?.nom, 'Type');
  assert.equal(axeDePropriete('Type', ['Info', 'Large']), 'style');
  assert.equal(axeDePropriete('Type'), 'style');
});

test('D9 : un nom explicite décide comme avant, même quand ses valeurs sont des palettes', () => {
  const r = releve('Button', [['Variant', ['primary', 'danger']]]);
  assert.equal(axesDuReleve(r).style?.nom, 'Variant');
  assert.equal(axesDuReleve(r).palette, undefined);
  assert.equal(axeDePropriete('Variant', ['primary', 'danger']), 'style');
});

test('D9 : un nom inconnu aux valeurs d’un seul registre prend ce rôle, sinon il ne pilote rien', () => {
  assert.equal(axeDePropriete('Scale', ['Small', 'Large']), 'taille');
  assert.equal(axeDePropriete('Scale', ['Small', 'Soft']), undefined);
  assert.equal(axeDePropriete('Scale'), undefined);
  assert.equal(axeDePropriete('Loading', ['Info', 'Success']), undefined, 'un interrupteur ne pilote aucun segment');
});

test('D9 : le rôle déjà pris par un nom explicite ne se donne pas une seconde fois', () => {
  // Color est la palette. Type=Info|Success ne reçoit donc pas la palette, il garde le repli du style.
  const r = releve('Alert', [['Color', ['Info', 'Success']], ['Type', ['Info', 'Success']]]);
  const roles = rolesDesProprietes(r);
  assert.deepEqual(r.proprietes.map((propriete) => roles.get(propriete)), ['palette', 'style']);
  assert.equal(axesDuReleve(r).palette?.nom, 'Color');
});

test('D9 : deux noms génériques de palette ne la prennent pas tous les deux', () => {
  const r = releve('Alert', [['Type', ['Info', 'Success']], ['Kind', ['Warning', 'Danger']]]);
  const roles = rolesDesProprietes(r);
  assert.deepEqual(r.proprietes.map((propriete) => roles.get(propriete)), ['palette', 'style']);
});

test('D9 : sans valeur dans un registre, la position où les tokens écrivent les valeurs donne le rôle', () => {
  const axes: readonly Axe[] = [['Variant', ['Filled', 'Outlined']], ['Type', ['Soft', 'Strong']]];
  const noms = ['Soft', 'Strong'].flatMap((palette) => ['Filled', 'Outlined'].map((style) => `Chip/Color/${palette}/${style}/foreground`));
  const r = releve('Chip', axes);
  assert.equal(axesDuReleve(r, catalogue(noms)).palette?.nom, 'Type');
  assert.equal(axesDuReleve(r, catalogue(noms)).style?.nom, 'Variant');
  // Sans catalogue, rien ne dit la position : Type garde le repli du style.
  assert.equal(axesDuReleve(r).palette, undefined);
});

test('D9 : une position que plusieurs rôles admettent laisse le repli du style', () => {
  const noms = ['Soft', 'Strong'].map((valeur) => `Chip/Color/${valeur}/foreground`);
  const r = releve('Chip', [['Type', ['Soft', 'Strong']]]);
  assert.equal(axesDuReleve(r, catalogue(noms)).style?.nom, 'Type');
});

test('D9 : une valeur que les tokens n’écrivent nulle part laisse le repli du style', () => {
  const noms = ['Filled', 'Outlined'].map((style) => `Chip/Color/Soft/${style}/foreground`);
  const r = releve('Chip', [['Variant', ['Filled', 'Outlined']], ['Type', ['Soft', 'Strong']]]);
  assert.equal(axesDuReleve(r, catalogue(noms)).style?.nom, 'Variant');
  assert.equal(rolesDesProprietes(r, catalogue(noms)).get(r.proprietes[1]), 'style');
});

// ---------------------------------------------------------------------------------------------------------------------------
// D14 : un renommage ne propose jamais la valeur d'un autre axe

test('D14 : sur un composant à deux axes, aucune question de renommage ne propose une valeur de l’autre axe', () => {
  // Style et Variant sont deux noms de style : Style porte l'axe lu, Variant garde ses valeurs. Les tokens écrivent `Filled` et `Outlined`
  // à la position du style, ce sont des valeurs de Variant et jamais le nouveau nom de `Info`.
  const axes: readonly Axe[] = [['Style', ['Info', 'Success', 'Warning', 'Error']], ['Variant', ['Filled', 'Outlined']]];
  const r = releve('Alert', axes);
  const constats = controlerNommage(r, catalogue(TOKENS_D_ALERT));
  const candidats = constats.flatMap(({ question }) => question?.candidats.map(({ nom }) => nom) ?? []);
  assert.deepEqual(candidats.filter((nom) => ['Filled', 'Outlined'].includes(nom)), []);
  assert.deepEqual(constats.filter(({ code }) => code === 'C12' || code === 'C13'), []);
});

test('D14 : une valeur de variant qui s’écrit en toutes lettres n’est pas corrigée vers un mot que l’autre axe porte déjà', () => {
  const axes: readonly Axe[] = [['Size', ['S', 'M']], ['Density', ['Small', 'Large']]];
  const noms = ['sm', 'md'].map((taille) => `Chip/Color/${taille}/foreground`);
  const r = releve('Chip', axes);
  const constats = controlerNommage(r, catalogue(noms)).filter(({ code, faits }) => code === 'C10' && faits.cote === 'variant');
  const parValeur = Object.fromEntries(constats.map(({ faits, correction }) => [faits.valeur, correction?.apres]));
  assert.deepEqual(parValeur, { S: undefined, M: { nom: 'Medium' } });
});

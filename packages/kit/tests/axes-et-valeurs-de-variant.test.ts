/**
 * Lot E7a : le nom d'un axe décide de son rôle avant les termes d'un autre registre (Q-F5-2), deux axes renommés à la fois ne posent
 * aucune question et les candidats ne comptent pas une valeur déjà présente (Q-F5-4, N-35), deux axes de style (Q-F5-3), l'écriture
 * d'une valeur de variant et de son token (Q-F5-5, Q-F5-6, N-34, N-37) et la valeur à point ou à barre (Q-F5-10). Un variant s'écrit en
 * toutes lettres (`Size=Small`), un token par son abréviation (`sm`).
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  controlerMapping, controlerNommage, proposerLaPropagation, proposerLesCorrections, tokensDuComposant,
  type CatalogueDeReference, type Constat, type LayerLu, type ReleveDeComposant, type VariableDuCatalogue,
} from '../src/controles/index.js';

type Axe = readonly [nom: string, valeurs: readonly string[]];

function combinaisons(axes: readonly Axe[]): Record<string, string>[] {
  return axes.reduce<Record<string, string>[]>((debut, [nom, valeurs]) => debut.flatMap((partiel) => valeurs.map((valeur) => ({ ...partiel, [nom]: valeur }))), [{}]);
}

/** Un composant `Button` dont les variants sont la matrice des axes. `renommes` remplace une valeur dans les variants, pas dans la propriété. */
function releve(axes: readonly Axe[], renommes: Record<string, Record<string, string>> = {}): ReleveDeComposant {
  const variants = combinaisons(axes).map((valeurs, rang) => ({
    id: `v${rang}`, nom: Object.entries(valeurs).map(([nom, valeur]) => `${nom}=${valeur}`).join(', '), valeurs, modesEffectifs: {}, layers: [],
  }));
  return {
    version: 1, jeu: { cle: 'button', id: 'button', nom: 'Button' },
    proprietes: axes.map(([nom, valeurs]) => ({ nom, type: 'VARIANT' as const, valeurs: valeurs.map((valeur) => renommes[nom]?.[valeur] ?? valeur), defaut: valeurs[0] })),
    variants: variants.map((variant) => ({ ...variant, valeurs: Object.fromEntries(Object.entries(variant.valeurs).map(([nom, valeur]) => [nom, renommes[nom]?.[valeur] ?? valeur])) })),
    lecture: { layersLus: 0, layersNonLus: 0, variantsNonLus: [], manquees: [] }, espaceDeCouleur: 'srgb',
  };
}

const jeton = (nom: string, plus: Partial<VariableDuCatalogue> = {}): VariableDuCatalogue => ({ cle: nom, nom, collection: 'components', type: 'COLOR', etat: 'presente', ...plus });

function catalogue(variables: VariableDuCatalogue[], theme: VariableDuCatalogue[] = []): CatalogueDeReference {
  return {
    version: 1, library: null,
    collections: [
      { cle: 'components', nom: 'components', role: 'components', modes: [{ id: 'l', nom: 'Light' }], etat: 'lue' },
      { cle: 'theme', nom: 'theme', role: 'theme', modes: [{ id: 'l', nom: 'Light' }], etat: 'lue' },
    ],
    variables: [...variables, ...theme],
  };
}

/** Les tokens de couleur de la matrice : un par combinaison des axes donnés, dont `segment` écrit chaque valeur. */
function tokensDeCouleur(axes: readonly Axe[], segment: (axe: string, valeur: string) => string, role = 'background'): VariableDuCatalogue[] {
  return combinaisons(axes).map((valeurs) => jeton(['button', 'color', ...Object.entries(valeurs).map(([nom, valeur]) => segment(nom, valeur)), role].join('/')));
}

const codes = (constats: readonly Constat[]): string[] => constats.map(({ code }) => code);
const minuscules = (_axe: string, valeur: string): string => valeur.toLowerCase();

// ---------------------------------------------------------------------------------------------------------------------------
// E7.1 : le nom de l'axe décide

const PRIMER: readonly Axe[] = [['Variant', ['default', 'primary', 'danger']], ['State', ['default', 'hover']]];

test('E7.1 : les valeurs primary et danger d’un axe Variant se lisent comme des styles, sans C7 ni token illisible', () => {
  const c = catalogue(tokensDeCouleur(PRIMER, minuscules));
  const r = releve(PRIMER);
  assert.deepEqual(controlerNommage(r, c), []);
  const illisibles = tokensDuComposant(r, c).filter((token) => token.lecture.length === 0);
  assert.deepEqual(illisibles.map(({ variable }) => variable.nom), []);
  const lecture = tokensDuComposant(r, c).find((token) => token.variable.nom === 'button/color/primary/hover/background')!.lecture;
  assert.deepEqual(lecture.map(({ role }) => role), ['composant', 'famille', 'style', 'etat', 'role']);
});

test('E7.1 : un axe Color garde ses valeurs de palette à la position de la palette', () => {
  const axes: readonly Axe[] = [['Color', ['primary', 'danger']], ['State', ['default', 'hover']]];
  const lecture = tokensDuComposant(releve(axes), catalogue(tokensDeCouleur(axes, minuscules)))[0].lecture;
  assert.deepEqual(lecture.map(({ role }) => role), ['composant', 'famille', 'palette', 'etat', 'role']);
});

// ---------------------------------------------------------------------------------------------------------------------------
// E7.2 : deux axes renommés, candidats

const MATRICE: readonly Axe[] = [['Color', ['primary', 'danger']], ['Size', ['Small', 'Medium', 'Large']], ['State', ['default', 'hover']]];
const jetonsDeLaMatrice = (): VariableDuCatalogue[] => [
  ...tokensDeCouleur(MATRICE, (axe, valeur) => (axe === 'Size' ? { Small: 'sm', Medium: 'md', Large: 'lg' }[valeur]! : valeur)),
  ...['Small', 'Medium', 'Large'].map((taille) => jeton(`button/size/${{ Small: 'sm', Medium: 'md', Large: 'lg' }[taille]}/gap`, { type: 'FLOAT' })),
];

test('E7.2 : la matrice de départ ne donne aucun constat de nom', () => {
  assert.deepEqual(controlerNommage(releve(MATRICE), catalogue(jetonsDeLaMatrice())), []);
});

test('E7.2 : deux valeurs renommées dans deux axes donnent C7 seul, sans question', () => {
  const r = releve(MATRICE, { Color: { primary: 'Brand' }, Size: { Small: 'Compact' } });
  const constats = controlerNommage(r, catalogue(jetonsDeLaMatrice()));
  assert.deepEqual(codes(constats).sort(), ['C7', 'C7']);
  assert.ok(constats.every(({ question }) => question === undefined));
});

test('E7.2 : un seul axe ouvert donne une question dont le candidat est l’orphelin, sans valeur déjà présente', () => {
  const r = releve(MATRICE, { Size: { Small: 'Compact' } });
  const constats = controlerNommage(r, catalogue(jetonsDeLaMatrice()));
  assert.deepEqual(codes(constats).sort(), ['C12', 'C7']);
  const question = constats.find(({ code }) => code === 'C12')!.question!;
  // `md` et `lg` sont les segments de variants présents ; `sm` est le seul orphelin, dans les tokens de couleur comme dans ceux de taille.
  assert.deepEqual(question.candidats.map(({ nom }) => nom), ['sm']);
});

test('E7.2 : deux valeurs renommées dans le même axe gardent deux questions à deux candidats', () => {
  const r = releve(MATRICE, { Size: { Small: 'Compact', Medium: 'Cozy' } });
  const constats = controlerNommage(r, catalogue(jetonsDeLaMatrice())).filter(({ code }) => code === 'C13');
  assert.equal(constats.length, 2);
  for (const constat of constats) assert.deepEqual(constat.question!.candidats.map(({ nom }) => nom).sort(), ['md', 'sm']);
});

// ---------------------------------------------------------------------------------------------------------------------------
// E7.3 : deux axes de style

const DEUX_STYLES: readonly Axe[] = [['Variant', ['Solid', 'Outline']], ['Appearance', ['Default', 'Subtle']]];

test('E7.3 : deux axes de style donnent un constat à faire, sans correction ni question', () => {
  const r = releve(DEUX_STYLES);
  const [constat] = controlerNommage(r, catalogue([])).filter(({ faits }) => faits.genre === 'deux-axes-de-style');
  assert.equal(constat.code, 'C63');
  assert.equal(constat.type, 'corriger');
  assert.deepEqual([constat.faits.axes, constat.correction, constat.question], ['Variant, Appearance', undefined, undefined]);
  assert.deepEqual(controlerNommage(releve([['Variant', ['Solid', 'Outline']], ['Size', ['Small']]]), catalogue([])).filter(({ faits }) => faits.genre === 'deux-axes-de-style'), []);
});

const STYLES: readonly Axe[] = [['Style', ['solid', 'subtle', 'outline']]];
const theme = (nom: string): VariableDuCatalogue => jeton(nom, { collection: 'theme', valeurs: { l: { valeur: '#000000' } } });
const aliasVers = (nom: string, cible: string): VariableDuCatalogue => jeton(nom, { valeurs: { l: { alias: cible } } });

test('E7.3 : un token du style subtle qui vise solid, ou du style solid qui vise surface, est un écart', () => {
  const c = catalogue([
    aliasVers('button/color/solid/background', 'primary/surface/default'), aliasVers('button/color/subtle/background', 'primary/solid/default'),
    aliasVers('button/color/outline/background', 'primary/solid/default'),
  ], [theme('primary/solid/default'), theme('primary/surface/default')]);
  const ecarts = controlerNommage(releve(STYLES), c).filter(({ faits }) => faits.genre === 'style-et-dossier');
  assert.deepEqual(ecarts.map(({ faits }) => [faits.variable, faits.dossier, faits.attendu]),
    [['button/color/solid/background', 'surface', 'solid'], ['button/color/subtle/background', 'solid', 'surface']]);
  assert.ok(ecarts.every(({ correction, question }) => correction === undefined && question === undefined));
});

test('E7.3 : les styles qui visent leur dossier, ou un dossier hors solid et surface, ne donnent rien', () => {
  const c = catalogue([
    aliasVers('button/color/solid/background', 'primary/solid/default'), aliasVers('button/color/subtle/background', 'primary/surface/default'),
    aliasVers('button/color/subtle/border', 'primary/ring'), aliasVers('button/color/solid/foreground', 'disabled/foreground'),
  ], [theme('primary/solid/default'), theme('primary/surface/default'), theme('primary/ring'), theme('disabled/foreground')]);
  assert.deepEqual(controlerNommage(releve(STYLES), c).filter(({ faits }) => faits.genre === 'style-et-dossier'), []);
});

// ---------------------------------------------------------------------------------------------------------------------------
// E7.4 : casse et forme

const TAILLES: readonly Axe[] = [['Size', ['Small', 'Medium', 'Large']]];
const tokensDeTaille = (...segments: string[]): VariableDuCatalogue[] => segments.map((segment) => jeton(`button/size/${segment}/gap`, { type: 'FLOAT' }));

test('E7.4 : le variant Small correspond au token sm, sans C7 ni constat de casse', () => {
  assert.deepEqual(controlerNommage(releve(TAILLES), catalogue(tokensDeTaille('sm', 'md', 'lg'))), []);
});

test('E7.4 : le token small reçoit C10 vers sm, et le variant en minuscules reste tenu', () => {
  const r = releve([['Size', ['small', 'medium', 'large']]]);
  const constats = controlerNommage(r, catalogue(tokensDeTaille('small', 'medium', 'large')));
  assert.deepEqual(constats.map(({ code, faits }) => [code, faits.segment, faits.attendu]), [['C10', 'small', 'sm'], ['C10', 'medium', 'md'], ['C10', 'large', 'lg']]);
  assert.deepEqual(controlerNommage(r, catalogue(tokensDeTaille('sm', 'md', 'lg'))), []);
});

test('E7.4 : S, sm et Middle dans un variant reçoivent une correction vers le mot entier, Extra Large est tenu', () => {
  const r = releve([['Size', ['S', 'sm', 'Middle', 'Large', 'Extra Large']]]);
  const constats = controlerNommage(r, catalogue(tokensDeTaille('sm', 'md', 'lg', 'xl'))).filter(({ faits }) => faits.cote === 'variant');
  assert.deepEqual(constats.map(({ code, faits }) => [code, faits.valeur, faits.attendu]), [['C10', 'S', 'Small'], ['C10', 'sm', 'Small'], ['C10', 'Middle', 'Medium']]);
  const [premier, second] = constats;
  assert.deepEqual([premier.correction?.sorte, premier.correction?.avant, premier.correction?.apres.nom, premier.correction?.cible], ['nom-de-valeur', 'S', 'Small', { layer: 'button', champ: 'Size' }]);
  assert.ok(premier.variants.length > 0 && second.variants.length > 0);
});

test('E7.4 : sans le jeu, ou quand le mot entier est déjà une valeur, la valeur reçoit le constat sans correction', () => {
  const dejaLa = releve([['Size', ['S', 'Small']]]);
  const [constat] = controlerNommage(dejaLa, catalogue(tokensDeTaille('sm'))).filter(({ faits }) => faits.cote === 'variant');
  assert.equal(constat.faits.valeur, 'S');
  assert.equal(constat.correction, undefined);
  const sansJeu = { ...releve([['Size', ['S']]]), jeu: { cle: 'button', id: '', nom: 'Button' } };
  assert.equal(controlerNommage(sansJeu, catalogue(tokensDeTaille('sm'))).find(({ faits }) => faits.cote === 'variant')!.correction, undefined);
});

test('E7.4 : la palette Error reçoit C8 vers Danger dans le variant, et error dans le token vers danger', () => {
  const axes: readonly Axe[] = [['Color', ['Primary', 'Error']]];
  const dansLeVariant = controlerNommage(releve(axes), catalogue(tokensDeCouleur(axes, (_axe, valeur) => (valeur === 'Error' ? 'danger' : 'primary'))));
  assert.deepEqual(dansLeVariant.map(({ code, faits }) => [code, faits.valeur, faits.attendu]), [['C8', 'Error', 'Danger']]);
  const dansLeToken = controlerNommage(releve([['Color', ['Primary', 'Danger']]]), catalogue(tokensDeCouleur([['Color', ['Primary', 'Danger']]], (_axe, valeur) => (valeur === 'Danger' ? 'error' : 'primary'))));
  assert.deepEqual(dansLeToken.map(({ code, faits }) => [code, faits.segment, faits.attendu]), [['C8', 'error', 'danger']]);
});

test('E7.4 : la casse seule d’un terme connu ne donne rien, celle d’un style inconnu garde C9', () => {
  const connus: readonly Axe[] = [['Color', ['Primary', 'Danger']], ['State', ['Default', 'Hover']]];
  assert.deepEqual(controlerNommage(releve(connus), catalogue(tokensDeCouleur(connus, minuscules))), []);
  const styles: readonly Axe[] = [['Style', ['Ghost', 'Link']]];
  assert.deepEqual(codes(controlerNommage(releve(styles), catalogue(tokensDeCouleur(styles, minuscules)))), ['C9', 'C9']);
});

// ---------------------------------------------------------------------------------------------------------------------------
// E7.7 : point et barre

test('E7.7 : une valeur à point ou à barre se lit avec le tiret du token, sans C7 ni token illisible', () => {
  const axes: readonly Axe[] = [['Ratio', ['1.5', '16/9']], ['Style', ['solid', 'outline']]];
  const c = catalogue(tokensDeCouleur(axes, (axe, valeur) => (axe === 'Ratio' ? valeur.replace(/[./]/g, '-') : valeur)));
  const tokens = tokensDuComposant(releve(axes), c);
  assert.ok(tokens.length > 0);
  const r = releve([['Style', ['solid', 'outline']], ['Size', ['1.5', '16/9']]]);
  const tailles = catalogue(tokensDeCouleur([['Style', ['solid', 'outline']], ['Size', ['1-5', '16-9']]], (_axe, valeur) => valeur));
  assert.deepEqual(controlerNommage(r, tailles).filter(({ code }) => code === 'C7'), []);
  assert.equal(tokensDuComposant(r, tailles).filter((token) => token.lecture.length === 0).length, 0);
});

// ---------------------------------------------------------------------------------------------------------------------------
// Corrections et propagation : le token se retrouve par l'écriture que le composant donne à la valeur

function layerLie(variable: VariableDuCatalogue): LayerLu {
  return {
    id: 'root', nom: 'Root', type: 'FRAME', parent: null, visible: true, opacite: 1, dimensions: { x: 0, y: 0, largeur: 20, hauteur: 20 },
    peintures: [{ champ: 'fills', indice: 0, type: 'SOLID', visible: true, opacite: 1, blendMode: 'NORMAL' }], valeursEnDur: [],
    liaisons: [{ champ: 'fills', indice: 0, porteur: 'root', variable: { id: variable.cle, cle: variable.cle, nom: variable.nom, collection: 'components', distante: false } }],
  };
}

test('E7.4 : la correction d’un token d’une autre taille vise le token abrégé du variant', () => {
  const axes: readonly Axe[] = [['Size', ['Small', 'Medium']]];
  const c = catalogue(tokensDeCouleur(axes, (_axe, valeur) => ({ Small: 'sm', Medium: 'md' }[valeur]!)));
  const r = releve(axes);
  const [medium] = r.variants.filter((variant) => variant.valeurs.Size === 'Medium');
  medium.layers = [layerLie(c.variables.find(({ nom }) => nom === 'button/color/sm/background')!)];
  const constats = proposerLesCorrections(r, c, controlerMapping(r, c)).filter(({ code }) => code === 'C22');
  assert.equal(constats.length, 1);
  assert.equal(constats[0].correction?.apres.nom, 'button/color/md/background');
});

test('E7.4 : la propagation d’un variant modèle écrit le token abrégé du variant visé', () => {
  const axes: readonly Axe[] = [['Size', ['Small', 'Medium']]];
  const c = catalogue(tokensDeCouleur(axes, (_axe, valeur) => ({ Small: 'sm', Medium: 'md' }[valeur]!)));
  const r = releve(axes);
  const [petit, moyen] = r.variants;
  petit.layers = [layerLie(c.variables.find(({ nom }) => nom === 'button/color/sm/background')!)];
  moyen.layers = [{ ...layerLie(c.variables[0]), liaisons: [], peintures: petit.layers[0].peintures }];
  const [constat] = proposerLaPropagation(r, c, petit.id);
  assert.equal(constat.correction?.apres.nom, 'button/color/md/background');
});

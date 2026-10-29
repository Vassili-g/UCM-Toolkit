import assert from 'node:assert/strict';
import test from 'node:test';
import { liaisonsDuReleve } from '../src/controles/mapping.js';
import {
  axeDePropriete, axesDesProprietes, axesDuReleve, axesDuReleveParEtapes, tokensDuComposant, tokensDuComposantParEtapes,
  controlerNommage, controlerNommageParEtapes, controlerMapping, controlerMappingParEtapes, controlerCouches, controlerCouchesParEtapes, controlerOublis, controlerOublisParEtapes,
  type CatalogueDeReference, type ReleveDeComposant, type VariantLu, type WrapperLu,
} from '../src/controles/index.js';

function releve(nom: string, proprietes: ReleveDeComposant['proprietes'] = []): ReleveDeComposant {
  return {
    version: 1, jeu: { cle: nom, id: nom, nom }, proprietes, variants: [],
    lecture: { layersLus: 0, layersNonLus: 0, variantsNonLus: [], manquees: [] }, espaceDeCouleur: 'srgb',
  };
}

function catalogue(...noms: string[]): CatalogueDeReference {
  return {
    version: 1, library: null,
    collections: [{ cle: 'composants', nom: 'components', role: 'components', modes: [], etat: 'lue' }],
    variables: noms.map((nom, rang) => ({ cle: `v${rang}`, nom, collection: 'composants', type: 'COLOR', etat: 'presente' })),
  };
}

const axe = (nom: string, valeurs: string[]): ReleveDeComposant['proprietes'][number] => ({
  nom, type: 'VARIANT', valeurs, defaut: valeurs[0],
});

function epuiser<T>(calcul: Generator<void, T>): T {
  let etape = calcul.next();
  while (!etape.done) etape = calcul.next();
  return etape.value;
}

test('les axes et tokens par étapes conservent priorité, références et lecture du style', () => {
  const r = releve('Alert', [
    axe('Severity', ['info', 'warning']), axe('Variant', ['Outlined']), axe('Style', ['standard']),
    { nom: 'State', type: 'TEXT', defaut: 'default' },
  ]);
  const c = catalogue('alert/color/info/outline/background', 'other/color/background');
  c.variables.push({ cle: 'hors-components', nom: 'alert/color/background', collection: 'absente', type: 'COLOR', etat: 'presente' });
  const axes = epuiser(axesDuReleveParEtapes(r));
  assert.deepEqual(axes, { palette: r.proprietes[0], style: r.proprietes[1] });
  assert.deepEqual(axes, axesDuReleve(r));
  const tokens = epuiser(tokensDuComposantParEtapes(r, c));
  assert.deepEqual(tokens, tokensDuComposant(r, c));
  assert.equal(tokens.length, 1);
  assert.equal(tokens[0].variable, c.variables[0]);
  assert.deepEqual(tokens[0].segments, ['alert', 'color', 'info', 'outline', 'background']);
  assert.deepEqual(tokens[0].lecture, [
    { segment: 'alert', role: 'composant', registre: 'composants' },
    { segment: 'color', role: 'famille', registre: 'familles-composant', terme: 'color' },
    { segment: 'info', role: 'palette', registre: 'palettes-composant', terme: 'info' },
    { segment: 'outline', role: 'style', registre: 'styles-composant' },
    { segment: 'background', role: 'role', registre: 'roles', terme: 'background' },
  ]);
});

test('le nommage par étapes conserve les constats et candidats ordonnés', () => {
  const r = releve('Alert', [axe('Severity', ['info', 'warning']), axe('Variant', ['Outlined'])]);
  r.variants = [variante('a', { Severity: 'info', Variant: 'Outlined' }, 'v0'), variante('b', { Severity: 'info', Variant: 'Outlined' }, 'v0')];
  const c = catalogue('alert/colors/info/outline/background', 'alert/color/warning/filled/background');
  const attendu = [
    {
      id: 'C7:style:Outlined', code: 'C7', famille: 'variants', type: 'verifier', variants: [], layers: [],
      faits: { axe: 'Variant', valeur: 'Outlined' },
    },
    {
      id: 'C8:colors:color', code: 'C8', famille: 'tokens', type: 'corriger', variants: [], layers: [],
      faits: { token: 'alert/colors/info/outline/background', segment: 'colors', attendu: 'color', tokens: 1 },
    },
    {
      id: 'C12:Alert:Variant:Outlined', code: 'C12', famille: 'variants', type: 'verifier', variants: ['a', 'b'], layers: [],
      faits: { jeu: 'Alert', propriete: 'Variant', avant: 'Outlined' },
      question: { id: 'C12:Alert:Variant:Outlined', candidats: [{ nom: 'outline' }] },
    },
  ];
  assert.deepEqual(epuiser(controlerNommageParEtapes(r, c)), attendu);
  assert.deepEqual(controlerNommage(r, c), attendu);
});

test('mapping et oublis cèdent avant la lecture de tous les tokens partagés', () => {
  for (const controler of [controlerMappingParEtapes, controlerOublisParEtapes]) {
    const r = releve('Alert');
    const c = catalogue();
    let nomsLus = 0;
    c.variables = Array.from({ length: 256 }, (_, i) => ({
      cle: `v${i}`, get nom() { nomsLus += 1; return 'alert/color/background'; }, collection: 'composants', type: 'COLOR', etat: 'presente',
    }));
    const calcul = controler(r, c);
    for (let i = 0; i < 16; i += 1) assert.equal(calcul.next().done, false);
    assert.ok(nomsLus > 0 && nomsLus < 256, `${controler.name} : ${nomsLus} noms lus`);
    const avantAnnulation = nomsLus;
    calcul.return([]);
    assert.equal(calcul.next().done, true);
    assert.equal(nomsLus, avantAnnulation);
  }
});

test('C7 signale une valeur d’axe absente, mais ignore un axe que les tokens ne portent pas', () => {
  const composant = releve('Button', [axe('Palette', ['primary', 'secondary'])]);
  assert.deepEqual(controlerNommage(composant, catalogue('button/color/primary/background')).map(({ code, faits }) => [code, faits.valeur]),
    [['C7', 'secondary']]);
  assert.deepEqual(controlerNommage(composant, catalogue('button/size/gap')), []);
});

test('C8 distingue la forme tolérée colors de la famille canonique color', () => {
  const composant = releve('Alert');
  assert.deepEqual(controlerNommage(composant, catalogue('alert/colors/info/standard/background')).map(({ code }) => code), ['C8']);
  assert.deepEqual(controlerNommage(composant, catalogue('alert/color/info/standard/background')), []);
});

test('C9 compare casse et séparateur sans confondre deux valeurs différentes', () => {
  const composant = releve('Button', [axe('Style', ['IconLeft'])]);
  assert.deepEqual(controlerNommage(composant, catalogue('button/color/icon-left/background')).map(({ code }) => code), ['C9']);
  assert.deepEqual(controlerNommage(composant, catalogue('button/color/IconLeft/background')), []);
});

test('C10 reconnaît md comme forme de variable de medium et accepte le mot entier dans le dossier', () => {
  const composant = releve('Button', [axe('Size', ['medium'])]);
  assert.deepEqual(controlerNommage(composant, catalogue('button/size/md/padding-x')).map(({ code, faits }) => [code, faits.segment, faits.attendu]), [['C10', 'md', 'medium']]);
  assert.deepEqual(controlerNommage(composant, catalogue('button/size/medium/padding-x')), []);
});

test('C10 lit l’écriture des dossiers : le mot entier est tenu dans un dossier', () => {
  const composant = releve('Button', [axe('Size', ['Large'])]);
  const lire = (nom: string) => controlerNommage(composant, catalogue(nom)).map(({ code, faits }) => [code, faits.segment, faits.attendu]);
  assert.deepEqual(lire('Button/Size/Large/radius'), []);
  assert.deepEqual(lire('Button/Size/lg/radius'), [['C10', 'lg', 'Large']]);
  assert.deepEqual(lire('button/size/lg/radius'), [['C10', 'lg', 'large']]);
});

test('C11 reconnaît les noms de l’axe d’état sans attribuer ce rôle à Variant', () => {
  assert.equal(axeDePropriete('States'), 'etat');
  assert.equal(axeDePropriete('STATE'), 'etat');
  assert.equal(axeDePropriete('Variant'), 'style');
  assert.equal(axeDePropriete('Label'), undefined);
});

test('C12 pose une question pour Variant=Outlined avec les tokens outline, sans précocher un style custom', () => {
  const composant = releve('Alert', [axe('Severity', ['info']), axe('Variant', ['Outlined'])]);
  composant.variants = [{ id: 'variant-1', nom: 'Variant=Outlined', valeurs: { Severity: 'info', Variant: 'Outlined' }, layers: [], modesEffectifs: {} }];
  composant.variants.push({ id: 'variant-2', nom: 'Variant=Outlined, Severity=info', valeurs: { Variant: 'Outlined', Severity: 'info' }, layers: [], modesEffectifs: {} });
  const constats = controlerNommage(composant, catalogue(
    'alert/color/info/outline/background', 'alert/color/warning/filled/background',
  )).filter(({ code }) => code === 'C12');
  assert.equal(constats.length, 1);
  const resultat = constats[0];
  assert.deepEqual(resultat.variants, ['variant-1', 'variant-2']);
  assert.deepEqual(resultat?.question?.candidats, [{ nom: 'outline' }]);
  assert.equal(resultat?.correction, undefined);
  assert.equal(controlerNommage(composant, catalogue('alert/color/info/outlined/background'))
    .some(({ code }) => code === 'C12'), false);
});

test('des tokens qui couvrent déjà chaque style ne proposent aucun renommage réciproque', () => {
  const composant = releve('Alert', [axe('Severity', ['info']), axe('Variant', ['filled', 'outlined'])]);
  composant.variants = [
    { id: 'filled', nom: 'Variant=filled', valeurs: { Severity: 'info', Variant: 'filled' }, layers: [], modesEffectifs: {} },
    { id: 'outlined', nom: 'Variant=outlined', valeurs: { Severity: 'info', Variant: 'outlined' }, layers: [], modesEffectifs: {} },
  ];
  const constats = controlerNommage(composant, catalogue(
    'alert/color/info/filled/background', 'alert/color/info/outlined/background',
  )).filter(({ code }) => code === 'C12' || code === 'C13');
  assert.deepEqual(constats, []);
});

test('un style sans règle sémantique reste une question, même avec un token candidat unique', () => {
  const composant = releve('Alert', [axe('Severity', ['info']), axe('Variant', ['Outlined'])]);
  composant.variants = [{ id: 'outlined', nom: 'Variant=Outlined', valeurs: { Severity: 'info', Variant: 'Outlined' }, layers: [], modesEffectifs: {} }];
  const resultat = controlerNommage(composant, catalogue('alert/color/info/filled/background'))
    .find(({ code }) => code === 'C12');
  assert.deepEqual(resultat?.question?.candidats, [{ nom: 'filled' }]);
  assert.equal(resultat?.correction, undefined);
});

test('un alias de registre couvre déjà la valeur de l’axe State', () => {
  const composant = releve('Button', [axe('State', ['normal'])]);
  composant.variants = [{ id: 'normal', nom: 'State=normal', valeurs: { State: 'normal' }, layers: [], modesEffectifs: {} }];
  assert.deepEqual(controlerNommage(composant, catalogue('button/color/primary/contained/md/default/foreground'))
    .filter(({ code }) => code === 'C12' || code === 'C13'), []);
});

test('C13 demande un choix quand les tokens portent plusieurs noms pour la valeur du variant', () => {
  const composant = releve('Alert', [axe('Severity', ['info']), axe('Variant', ['Outlined'])]);
  composant.variants = [{ id: 'variant-1', nom: 'Variant=Outlined', valeurs: { Severity: 'info', Variant: 'Outlined' }, layers: [], modesEffectifs: {} }];
  const resultat = controlerNommage(composant, catalogue('alert/color/info/outline/background', 'alert/color/info/bordered/border'))
    .find(({ code }) => code === 'C13');
  assert.deepEqual(resultat?.question?.candidats.map(({ nom }) => nom), ['outline', 'bordered']);
  assert.equal(resultat?.correction, undefined);
  assert.equal(controlerNommage(composant, catalogue('alert/color/info/outline/background'))
    .some(({ code }) => code === 'C13'), false);
});

function catalogueEtendu(...variables: { nom: string; collection: string; scopes?: string[]; type?: 'COLOR' | 'FLOAT'; alias?: string }[]): CatalogueDeReference {
  return {
    version: 1, library: null,
    collections: ['components', 'theme', 'layout', 'primitives'].map((role) => ({
      cle: role, nom: role, role: role as 'components' | 'theme' | 'layout' | 'primitives', modes: [], etat: 'lue' as const,
    })),
    variables: variables.map(({ nom, collection, scopes, type, alias }, rang) => ({
      cle: `v${rang}`, nom, collection, type: type ?? 'COLOR', etat: 'presente' as const, scopes,
      ...(alias ? { valeurs: { light: { alias } } } : {}),
    })),
  };
}

function variante(id: string, valeurs: Record<string, string>, cle: string, options: {
  champ?: string; nom?: string; type?: string;
} = {}): VariantLu {
  const champ = options.champ ?? 'fills';
  return {
    id, nom: id, valeurs, modesEffectifs: {}, layers: [{
      id: `layer-${id}`, nom: options.nom ?? 'container', type: options.type ?? 'FRAME', parent: null,
      visible: true, opacite: 1, dimensions: { x: 0, y: 0, largeur: 100, hauteur: 40 },
      peintures: [], valeursEnDur: [], liaisons: [{
        champ, indice: champ === 'fills' || champ === 'strokes' ? 0 : undefined, porteur: `layer-${id}`,
        variable: { id: cle, cle, nom: cle, collection: 'components', distante: false },
      }],
    }],
  };
}

const codes = (constats: ReturnType<typeof controlerMapping>): string[] => constats.map(({ code }) => code);

test('le parcours commun des liaisons conserve variants, layers et indices dans leur ordre', () => {
  const r = releve('Alert');
  const a = variante('a', {}, 'v0');
  const b = variante('b', {}, 'v1');
  a.layers[0].liaisons.push({ ...a.layers[0].liaisons[0], indice: 1 });
  a.layers.push({ ...b.layers[0], liaisons: [] }, b.layers[0]);
  r.variants = [{ ...a, id: 'vide', layers: [] }, a, b];
  const attendu = r.variants.flatMap((variant) => variant.layers.flatMap((layer) => layer.liaisons.map((liaison) => ({ variant, layer, liaison }))));
  assert.deepEqual(liaisonsDuReleve(r), attendu);
});

test('le mapping par étapes conserve les écarts ordonnés puis la fratrie', () => {
  const r = releve('Alert', [axe('Severity', ['info', 'success'])]);
  // Le variant `c` vise `success` avec `Severity=info` : C15 le relève, et son token n'est plus celui de son variant, donc C21 le garde.
  r.variants = ['a', 'b', 'c'].map((id) => variante(id, { Severity: id === 'c' ? 'info' : 'success' }, id === 'c' ? 'v1' : 'v0'));
  const c = catalogueEtendu(
    { nom: 'alert/color/info/background', collection: 'components', scopes: ['TEXT_FILL'], alias: 'v2' },
    { nom: 'alert/color/success/foreground', collection: 'components', alias: 'v3' },
    { nom: 'default/background', collection: 'theme' },
    { nom: 'default/foreground', collection: 'theme' },
  );
  const attendu: ReturnType<typeof controlerMapping> = ['a', 'b'].flatMap((id): ReturnType<typeof controlerMapping> => [
    {
      id: `C15:${id}:layer-${id}:fills:0::palette`, code: 'C15', type: 'corriger', famille: 'liaisons', variants: [id], layers: [`layer-${id}`],
      faits: { axe: 'Severity', valeur: 'success', token: 'alert/color/info/background', segment: 'info', champ: 'fills', indice: 0 },
    },
    {
      id: `C18:${id}:layer-${id}:fills:0:`, code: 'C18', type: 'verifier', famille: 'liaisons', variants: [id], layers: [`layer-${id}`],
      faits: { token: 'alert/color/info/background', champ: 'fills', portee: 'FRAME_FILL' },
    },
  ]);
  attendu.push({
    id: 'C15:c:layer-c:fills:0::palette', code: 'C15', type: 'corriger', famille: 'liaisons', variants: ['c'], layers: ['layer-c'],
    faits: { axe: 'Severity', valeur: 'info', token: 'alert/color/success/foreground', segment: 'success', champ: 'fills', indice: 0 },
  });
  attendu.push({
    id: 'C17:c:layer-c:fills:0:', code: 'C17', type: 'corriger', famille: 'liaisons', variants: ['c'], layers: ['layer-c'],
    faits: { token: 'alert/color/success/foreground', role: 'foreground', attendu: 'background', champ: 'fills', indice: 0 },
  });
  attendu.push({
    id: 'C21:c:layer-c::fills', code: 'C21', type: 'verifier', famille: 'liaisons', variants: ['c'], layers: ['layer-c'],
    faits: { nom: 'v1', majorite: 'theme:background', autres: 2, exemple: 'v0', champ: 'fills' },
  });
  const calcul = controlerMappingParEtapes(r, c);
  let resultat = calcul.next();
  while (!resultat.done) resultat = calcul.next();
  assert.deepEqual(resultat.value, attendu);
  assert.deepEqual(controlerMapping(r, c), attendu);
});

test('les couches par étapes conservent l’ordre des liaisons et des cibles distinctes', () => {
  const r = releve('Button');
  r.variants = [variante('direct', {}, 'v0'), variante('alias', {}, 'v1')];
  const c = catalogueEtendu(
    { nom: 'primitive', collection: 'primitives' },
    { nom: 'button/color/background', collection: 'components' },
    { nom: 'layout/color', collection: 'layout' },
  );
  c.variables[1].valeurs = { premier: { alias: 'v2' }, second: { alias: 'v0' }, doublon: { alias: 'v2' }, absent: { alias: 'introuvable' } };
  const attendu = [
    {
      id: 'C80:direct:layer-direct:fills:0', code: 'C80', type: 'corriger', famille: 'liaisons', variants: ['direct'], layers: ['layer-direct'],
      faits: { token: 'primitive', couche: 'primitives', champ: 'fills', calque: 'container' },
    },
    {
      id: 'C20:alias:layer-alias:fills:0:v2', code: 'C20', type: 'corriger', famille: 'liaisons', variants: ['alias'], layers: ['layer-alias'],
      faits: { token: 'button/color/background', couche: 'layout', nature: 'couleur', admises: 'theme', cible: 'layout/color' },
    },
    {
      id: 'C20:alias:layer-alias:fills:0:v0', code: 'C20', type: 'corriger', famille: 'liaisons', variants: ['alias'], layers: ['layer-alias'],
      faits: { token: 'button/color/background', couche: 'primitives', nature: 'couleur', admises: 'theme', cible: 'primitive' },
    },
  ];
  const calcul = controlerCouchesParEtapes(r, c);
  let resultat = calcul.next();
  while (!resultat.done) resultat = calcul.next();
  assert.deepEqual(resultat.value, attendu);
  assert.deepEqual(controlerCouches(r, c), attendu);
});

test('C15 compare la palette du token à la valeur du variant', () => {
  const r = releve('Alert', [axe('Severity', ['info', 'success'])]);
  r.variants = [variante('success', { Severity: 'success' }, 'v0')];
  assert.ok(codes(controlerMapping(r, catalogueEtendu({ nom: 'alert/color/info/standard/background', collection: 'components' }))).includes('C15'));
  r.variants = [variante('info', { Severity: 'info' }, 'v0')];
  assert.ok(!codes(controlerMapping(r, catalogueEtendu({ nom: 'alert/color/info/standard/background', collection: 'components' }))).includes('C15'));
});

test('C16 distingue un état erroné d’un token partagé entre états', () => {
  const r = releve('Button', [axe('State', ['default', 'hover'])]);
  r.variants = [variante('hover', { State: 'hover' }, 'v0')];
  assert.ok(codes(controlerMapping(r, catalogueEtendu({ nom: 'button/color/default/background', collection: 'components' }))).includes('C16'));
  assert.ok(!codes(controlerMapping(r, catalogueEtendu({ nom: 'button/color/background', collection: 'components' }))).includes('C16'));
});

test('C17 refuse un token background sur un texte, mais accepte foreground', () => {
  const r = releve('Button');
  r.variants = [variante('default', {}, 'v0', { nom: 'label', type: 'TEXT' })];
  assert.ok(codes(controlerMapping(r, catalogueEtendu({ nom: 'button/color/background', collection: 'components' }))).includes('C17'));
  assert.ok(!codes(controlerMapping(r, catalogueEtendu({ nom: 'button/color/foreground', collection: 'components' }))).includes('C17'));
  r.variants = [variante('default', {}, 'v0')];
  assert.ok(!codes(controlerMapping(r, catalogueEtendu({ nom: 'button/size/gap', collection: 'components', type: 'FLOAT' }))).includes('C17'));
});

test('C18 juge la portée seulement quand le catalogue la connaît', () => {
  const r = releve('Button');
  r.variants = [variante('default', {}, 'v0')];
  assert.ok(codes(controlerMapping(r, catalogueEtendu({ nom: 'button/color/background', collection: 'components', scopes: ['TEXT_FILL'] }))).includes('C18'));
  assert.ok(!codes(controlerMapping(r, catalogueEtendu({ nom: 'button/color/background', collection: 'components', scopes: ['FRAME_FILL'] }))).includes('C18'));
  assert.ok(!codes(controlerMapping(r, catalogueEtendu({ nom: 'button/color/background', collection: 'components' }))).includes('C18'));
});

test('C19 signale un token d’un autre composant et garde celui du composant courant', () => {
  const r = releve('Button');
  r.variants = [variante('default', {}, 'v0')];
  assert.ok(codes(controlerMapping(r, catalogueEtendu({ nom: 'alert/color/background', collection: 'components' }))).includes('C19'));
  assert.ok(!codes(controlerMapping(r, catalogueEtendu({ nom: 'button/color/background', collection: 'components' }))).includes('C19'));
});

// Avant le lot K1, un lien direct vers `layout` ou `theme` passait, et un lien vers une primitive donnait C20 (puis C61, fondu
// dans C20 pour n'avoir qu'une carte). Un layer ne se lie plus qu'aux tokens de son composant : tout lien direct hors de
// `components` donne C80, et C20 ne juge plus que la cible des alias d'un token de `components`.
test('C80 signale une taille liée directement à une primitive ou à layout, sans C20 en double', () => {
  const r = releve('Button');
  r.variants = [variante('default', {}, 'v0', { champ: 'paddingLeft' })];
  const versPrimitive = controlerCouches(r, catalogueEtendu({ nom: 'dimension/14', collection: 'primitives', type: 'FLOAT' }));
  assert.deepEqual(codes(versPrimitive), ['C80']);
  assert.equal(versPrimitive[0].famille, 'tailles');
  assert.equal(versPrimitive[0].type, 'corriger');
  assert.deepEqual(versPrimitive[0].faits, { token: 'dimension/14', couche: 'primitives', champ: 'paddingLeft', calque: 'container' });
  assert.deepEqual([versPrimitive[0].variants, versPrimitive[0].layers], [['default'], ['layer-default']]);
  const versLayout = controlerCouches(r, catalogueEtendu({ nom: 'sizing/14', collection: 'layout', type: 'FLOAT' }));
  assert.deepEqual(codes(versLayout), ['C80']);
  assert.deepEqual(versLayout[0].faits, { token: 'sizing/14', couche: 'layout', champ: 'paddingLeft', calque: 'container' });
});

test('C80 signale une couleur liée directement à theme ou à une primitive, en famille liaisons', () => {
  const r = releve('Button');
  r.variants = [variante('default', {}, 'v0')];
  const versTheme = controlerCouches(r, catalogueEtendu({ nom: 'primary/solid/background', collection: 'theme' }));
  assert.deepEqual(codes(versTheme), ['C80']);
  assert.equal(versTheme[0].famille, 'liaisons');
  assert.deepEqual(versTheme[0].faits, { token: 'primary/solid/background', couche: 'theme', champ: 'fills', calque: 'container' });
  assert.deepEqual(codes(controlerCouches(r, catalogueEtendu({ nom: 'color/blue/500', collection: 'primitives' }))), ['C80']);
  // Une couleur de strokes suit la même règle.
  r.variants = [variante('default', {}, 'v0', { champ: 'strokes' })];
  assert.deepEqual(codes(controlerCouches(r, catalogueEtendu({ nom: 'primary/surface/border', collection: 'theme' }))), ['C80']);
});

test('C80 nomme le layer peint par une surcharge d’instance, pas l’instance', () => {
  const r = releve('Button');
  r.variants = [variante('default', {}, 'v0')];
  r.variants[0].layers[0].liaisons[0].surcharge = { id: 'dedans', nom: 'glyph', type: 'VECTOR' };
  const [constat] = controlerCouches(r, catalogueEtendu({ nom: 'primary/solid/background', collection: 'theme' }));
  assert.equal(constat.faits.calque, 'glyph');
  assert.ok(constat.id.includes('>dedans'));
});

test('C80 : la liaison tenue du composant principal d’une pièce interne passe, celle de l’instance reste jugée', () => {
  const ring = (provenance: 'composant-principal' | 'instance' | undefined, champ: string) => {
    const r = releve('Button');
    r.variants = [variante('default', {}, 'v0', { champ, nom: '.Ring', type: 'INSTANCE' })];
    r.variants[0].layers[0].sorte = 'piece-interne';
    if (provenance) r.variants[0].layers[0].liaisons[0].provenance = provenance;
    return r;
  };
  const layout = catalogueEtendu({ nom: 'Radius/lg', collection: 'layout', type: 'FLOAT' });
  assert.deepEqual(codes(controlerCouches(ring('composant-principal', 'topLeftRadius'), layout)), []);
  assert.deepEqual(codes(controlerCouches(ring(undefined, 'topLeftRadius'), layout)), ['C80']);
  assert.deepEqual(codes(controlerCouches(ring('instance', 'topLeftRadius'), layout)), ['C80']);
  const couleurLayout = catalogueEtendu({ nom: 'Color/ring', collection: 'layout' });
  assert.deepEqual(codes(controlerCouches(ring('instance', 'fills'), couleurLayout)), ['C80']);
  const couleurBouton = catalogueEtendu({ nom: 'Button/Color/Focus/ring', collection: 'components' });
  assert.deepEqual(codes(controlerCouches(ring('instance', 'fills'), couleurBouton)), []);
  // Une primitive reste jugée, et un détail d'implémentation ne profite pas de l'exception.
  assert.deepEqual(codes(controlerCouches(ring('composant-principal', 'topLeftRadius'), catalogueEtendu({ nom: 'dimension/8', collection: 'primitives', type: 'FLOAT' }))), ['C80']);
  const detail = ring('composant-principal', 'topLeftRadius');
  detail.variants[0].layers[0].sorte = 'detail';
  assert.deepEqual(codes(controlerCouches(detail, layout)), ['C80']);
});

test('C80 : un layer descendant d’une pièce interne prend la sorte de l’instance la plus proche', () => {
  const r = releve('Button');
  r.variants = [variante('default', {}, 'v0', { champ: 'topLeftRadius' })];
  const [racine] = r.variants[0].layers;
  racine.sorte = 'piece-interne';
  r.variants[0].layers.push({ ...racine, id: 'enfant', parent: racine.id, sorte: undefined, liaisons: [{ ...racine.liaisons[0], provenance: 'composant-principal' }] });
  racine.liaisons = [];
  assert.deepEqual(codes(controlerCouches(r, catalogueEtendu({ nom: 'Radius/lg', collection: 'layout', type: 'FLOAT' }))), []);
});

test('C80 ne juge pas la typographie : fontSize lié à typography, comme lineHeight, ne donne rien', () => {
  const r = releve('Button');
  const lie = (champ: string) => { r.variants = [variante('default', {}, 'v0', { champ, nom: 'label', type: 'TEXT' })]; };
  for (const champ of ['fontSize', 'fontWeight', 'fontFamily', 'lineHeight', 'letterSpacing']) {
    lie(champ);
    assert.deepEqual(codes(controlerCouches(r, catalogueEtendu({ nom: 'body/md/font-size', collection: 'typography', type: 'FLOAT' }))), [], champ);
  }
  // Hors de la règle ne veut pas dire hors de tout jugement : une primitive de typographie reste C20, comme avant.
  lie('lineHeight');
  assert.deepEqual(codes(controlerCouches(r, catalogueEtendu({ nom: 'font-size/base', collection: 'primitives', type: 'FLOAT' }))), ['C20']);
});

test('C80 ne dit rien d’un token de components, ni d’un fichier sans rôle de collection', () => {
  const r = releve('Button');
  r.variants = [variante('default', {}, 'v0', { champ: 'paddingLeft' })];
  assert.deepEqual(codes(controlerCouches(r, catalogueEtendu({ nom: 'button/size/padding-x', collection: 'components', type: 'FLOAT' }))), []);
  const libre = catalogueEtendu({ nom: 'sizing/14', collection: 'layout', type: 'FLOAT' });
  for (const collection of libre.collections) collection.role = null;
  assert.deepEqual(codes(controlerCouches(r, libre)), []);
});

test('C20 juge un token de components lié à un layer par la cible de ses alias', () => {
  const r = releve('TileLink');
  r.variants = [variante('default', {}, 'v0', { champ: 'width' })];
  const lie = (alias?: string) => ({ nom: 'TileLink/Size/width', collection: 'components', type: 'FLOAT' as const, alias });
  assert.deepEqual(codes(controlerCouches(r, catalogueEtendu(lie('v1'), { nom: 'sizing/40', collection: 'layout', type: 'FLOAT' }))), []);
  assert.deepEqual(codes(controlerCouches(r, catalogueEtendu(lie()))), []);
  assert.deepEqual(codes(controlerCouches(r, catalogueEtendu(lie('absente')))), []);
  const versPrimitive = controlerCouches(r, catalogueEtendu(lie('v1'), { nom: 'dimension/40', collection: 'primitives', type: 'FLOAT' }));
  assert.deepEqual(codes(versPrimitive), ['C20']);
  assert.deepEqual(versPrimitive[0].faits, { token: 'TileLink/Size/width', couche: 'primitives', nature: 'dimension', admises: 'theme,layout,typography', cible: 'dimension/40' });
  assert.deepEqual(codes(controlerCouches(r, catalogueEtendu(lie('v1'), { nom: 'icon/size/xl', collection: 'components', type: 'FLOAT' }))), ['C20']);
});

test('C21 repère une liaison isolée parmi trois frères et tait un partage égal', () => {
  const r = releve('Button');
  r.variants = [variante('a', {}, 'v0'), variante('b', {}, 'v0'), variante('c', {}, 'v1')];
  const c = catalogueEtendu(
    { nom: 'button/color/background', collection: 'components' },
    { nom: 'button/color/foreground', collection: 'components' },
  );
  assert.equal(controlerMapping(r, c).filter(({ code }) => code === 'C21').length, 1);
  r.variants = [variante('a', {}, 'v0'), variante('b', {}, 'v1')];
  assert.equal(controlerMapping(r, c).filter(({ code }) => code === 'C21').length, 0);
});

test('C31 relève une combinaison absente et se tait quand la matrice est entière', () => {
  const r = releve('Alert', [axe('Severity', ['info', 'warning']), axe('Variant', ['standard', 'filled'])]);
  r.variants = [
    variante('info-standard', { Severity: 'info', Variant: 'standard' }, 'v0'),
    variante('info-filled', { Severity: 'info', Variant: 'filled' }, 'v0'),
    variante('warning-standard', { Severity: 'warning', Variant: 'standard' }, 'v0'),
  ];
  assert.deepEqual(controlerOublis(r, catalogue()).filter(({ code }) => code === 'C31').map(({ faits }) => faits),
    [{ Severity: 'warning', Variant: 'filled' }]);
  r.variants.push(variante('warning-filled', { Severity: 'warning', Variant: 'filled' }, 'v0'));
  assert.equal(controlerOublis(r, catalogue()).filter(({ code }) => code === 'C31').length, 0);
});

test('C32 trouve un token inutilisé et un frère non chargé, sans exiger ses valeurs', () => {
  const r = releve('Alert', [axe('Severity', ['info', 'warning'])]);
  r.variants = [variante('info', { Severity: 'info' }, 'v0')];
  const c = catalogueEtendu(
    { nom: 'alert/color/info/background', collection: 'components' },
    { nom: 'alert/color/warning/background', collection: 'components' },
    { nom: 'alert/color/info/icon', collection: 'components' },
  );
  c.variables[1].etat = 'non-chargee';
  assert.deepEqual(controlerOublis(r, c).filter(({ code }) => code === 'C32').map(({ faits }) => [faits.token, faits.motif]), [
    ['alert/color/warning/background', 'sans-variant'], ['alert/color/info/icon', 'inutilise'],
  ]);
  r.variants[0].layers[0].liaisons.push({
    champ: 'fills', indice: 1, porteur: 'layer-info',
    variable: { id: 'v2', cle: 'v2', nom: 'alert/color/info/icon', collection: 'components', distante: false },
  });
  assert.equal(controlerOublis(r, c).filter(({ code, faits }) => code === 'C32' && faits.motif === 'inutilise').length, 0);
});

function wrapper(nom: string, proprietes: WrapperLu['proprietes'], variants: [Record<string, string>, string[]][]): WrapperLu {
  return {
    id: `${nom}-id`, cle: `${nom}-cle`, nom, proprietes,
    variants: variants.map(([valeurs, cles], rang) => ({
      id: `${nom}-${rang}`, nom: Object.values(valeurs).join(','), valeurs,
      liaisons: cles.map((cle) => ({ champ: 'itemSpacing', porteur: `${nom}-${rang}`, variable: { id: cle, cle, nom: cle, collection: 'components', distante: false } })),
    })),
  };
}

const tailles = (...liaisons: [string, string[]][]): WrapperLu => wrapper('.sizeWrapperButton', [axe('Size', liaisons.map(([taille]) => taille))], liaisons.map(([taille, cles]) => [{ Size: taille }, cles]));

/** Un composant à l'axe State, dont les variants lient `hote` et dont les tailles vivent dans un wrapper. */
function composantAvecWrapper(...wrappers: WrapperLu[]): ReleveDeComposant {
  const r = releve('Button', [axe('State', ['default', 'hover'])]);
  r.variants = [variante('default', { State: 'default' }, 'hote'), variante('hover', { State: 'hover' }, 'hote')];
  if (wrappers.length) r.wrappers = wrappers;
  return r;
}

const c32 = (r: ReleveDeComposant, c: CatalogueDeReference): [unknown, unknown][] =>
  controlerOublis(r, c).filter(({ code }) => code === 'C32').map(({ faits }) => [faits.token, faits.motif]);

const CATALOGUE_DES_TAILLES = (): CatalogueDeReference => catalogue('Button/Size/Large/gap', 'Button/Size/Small/gap', 'Button/Size/XL/gap');

test('axesDesProprietes lit les axes d’un wrapper et partage la mémoire d’axesDuReleve', () => {
  const r = composantAvecWrapper(tailles(['Small', []], ['Large', []]));
  assert.deepEqual(Object.keys(axesDesProprietes(r.wrappers![0].proprietes)), ['taille']);
  assert.equal(axesDesProprietes(r.proprietes), axesDuReleve(r));
});

test('C32 : un token de taille lié seulement dans un variant du wrapper est utilisé', () => {
  const r = composantAvecWrapper(tailles(['Small', ['v1']], ['Large', ['v0']], ['Medium', []]));
  assert.deepEqual(c32(r, catalogue('Button/Size/Large/gap', 'Button/Size/Small/gap')), []);
});

test('C32 : un token de taille lié nulle part reste inutilisé, wrapper lu ou non', () => {
  const r = composantAvecWrapper(tailles(['Small', []], ['Large', []]));
  const attendu = [['Button/Size/Large/gap', 'inutilise'], ['Button/Size/Small/gap', 'inutilise']];
  assert.deepEqual(c32(r, catalogue('Button/Size/Large/gap', 'Button/Size/Small/gap')), attendu);
  delete r.wrappers;
  assert.deepEqual(c32(r, catalogue('Button/Size/Large/gap', 'Button/Size/Small/gap')), attendu);
});

test('C32 : sans wrappers, un token de taille lié dans le wrapper reste inutilisé comme avant', () => {
  const r = composantAvecWrapper();
  assert.deepEqual(c32(r, catalogue('Button/Size/Large/gap')), [['Button/Size/Large/gap', 'inutilise']]);
});

test('C32 : une taille qu’aucun variant du wrapper ne porte est sans variant', () => {
  const r = composantAvecWrapper(tailles(['Small', ['v1']], ['Large', ['v0']]));
  assert.deepEqual(c32(r, CATALOGUE_DES_TAILLES()), [['Button/Size/XL/gap', 'sans-variant']]);
});

test('C32 : un token sans segment de taille lié seulement dans le wrapper reste inutilisé', () => {
  const r = composantAvecWrapper(tailles(['Small', ['v0']], ['Large', []]));
  r.variants[0].layers[0].liaisons = [];
  r.variants[1].layers[0].liaisons = [];
  assert.deepEqual(c32(r, catalogue('Button/Color/default/background')).map(([, motif]) => motif), ['inutilise']);
});

test('C32 : un wrapper sans axe nouveau, comme un anneau, ne change rien', () => {
  const anneau = wrapper('.Ring', [axe('Property 1', ['Default', 'Focus'])], [[{ 'Property 1': 'Default' }, ['v1']], [{ 'Property 1': 'Focus' }, ['v1']]]);
  const r = composantAvecWrapper(anneau);
  assert.deepEqual(c32(r, catalogue('Button/Size/Large/gap')), [['Button/Size/Large/gap', 'inutilise']]);
});

test('C32 : quand l’hôte et le wrapper portent tous deux Size, l’hôte l’emporte', () => {
  const r = releve('Button', [axe('Size', ['Small', 'Large'])]);
  r.variants = [variante('small', { Size: 'Small' }, 'v0'), variante('large', { Size: 'Large' }, 'v0')];
  r.wrappers = [tailles(['Small', ['v1']], ['Large', ['v1']])];
  assert.deepEqual(c32(r, catalogue('Button/Size/Large/gap', 'Button/Size/Small/gap')), [['Button/Size/Small/gap', 'inutilise']]);
});

test('les oublis par étapes conservent les identifiants, faits et ordre de C31 à C33', () => {
  const r = releve('Button', [axe('State', ['default', 'hover']), axe('Size', ['sm', 'md'])]);
  r.variants = [
    variante('default', { State: 'default', Size: 'sm' }, 'v0'),
    variante('hover', { State: 'hover', Size: 'sm' }, 'v0'),
  ];
  const c = catalogue('button/color/default/background', 'button/size/sm/gap');
  const attendu = [
    {
      id: 'C31:State=default,Size=md', code: 'C31', type: 'verifier', famille: 'variants', variants: [], layers: [],
      faits: { State: 'default', Size: 'md' },
    },
    {
      id: 'C31:State=hover,Size=md', code: 'C31', type: 'verifier', famille: 'variants', variants: [], layers: [],
      faits: { State: 'hover', Size: 'md' },
    },
    {
      id: 'C32:v1', code: 'C32', type: 'verifier', famille: 'tokens', variants: [], layers: [],
      faits: { token: 'button/size/sm/gap', motif: 'inutilise' },
    },
    {
      id: 'C33:hover:color', code: 'C33', type: 'verifier', famille: 'variants', variants: ['hover'], layers: [],
      faits: { variant: 'hover', famille: 'color' },
    },
  ];
  const calcul = controlerOublisParEtapes(r, c);
  let resultat = calcul.next();
  while (!resultat.done) resultat = calcul.next();
  assert.deepEqual(resultat.value, attendu);
  assert.deepEqual(controlerOublis(r, c), attendu);
});

test('la matrice des oublis conserve sa borne de 4 096 combinaisons', () => {
  const valeurs = Array.from({ length: 16 }, (_, i) => String(i));
  const r = releve('Button', ['A', 'B', 'C'].map((nom) => axe(nom, valeurs)));
  const c = catalogue();
  const calcul = controlerOublisParEtapes(r, c);
  let resultat = calcul.next();
  while (!resultat.done) resultat = calcul.next();
  assert.equal(resultat.value.length, 4096);
  assert.deepEqual(resultat.value, controlerOublis(r, c));
  r.proprietes.push(axe('D', ['0', '1']));
  assert.deepEqual(controlerOublis(r, c), []);
  const depasse = controlerOublisParEtapes(r, c);
  let fin = depasse.next();
  while (!fin.done) fin = depasse.next();
  assert.deepEqual(fin.value, []);
});

for (const passe of ['C31', 'C32', 'C33', 'liaisons'] as const) {
  test(`les oublis découpent les recherches ${passe} quand leur entrée grandit`, () => {
    for (const nombre of [128, 256]) {
      let lectures = 0;
      const r = releve('Button', [axe('State', passe === 'C31' ? ['default'] : [])]);
      const c = passe === 'C31' || passe === 'liaisons' ? catalogue() : catalogue('button/color/default/background');
      const valeurs = () => ({ get State() { lectures += 1; return 'hover'; } });
      r.variants = Array.from({ length: passe === 'C33' || passe === 'liaisons' ? 1 : nombre }, (_, rang) => variante(`v${rang}`, valeurs(), 'v0'));
      if (passe === 'C33') c.variables = Array.from({ length: nombre }, (_, rang) => ({ ...c.variables[0], cle: `t${rang}` }));
      if (passe === 'liaisons') r.variants[0].layers[0].liaisons = Array.from({ length: nombre }, () => ({
        champ: 'fills', porteur: 'layer', variable: { id: 'v', get cle() { lectures += 1; return 'v0'; }, nom: '', collection: '', distante: false },
      }));
      const attendu = controlerOublis(r, c);
      const total = lectures;
      assert.ok(total >= nombre, `${passe}: ${total}`);
      lectures = 0;
      const calcul = controlerOublisParEtapes(r, c);
      let etape = calcul.next();
      let avant = 0;
      while (!etape.done) {
        assert.ok(lectures - avant <= 2, `${passe}: ${lectures - avant} lectures dans une avancée`);
        avant = lectures;
        etape = calcul.next();
      }
      assert.equal(lectures, total);
      assert.deepEqual(etape.value, attendu);
      lectures = 0;
      const annule = controlerOublisParEtapes(r, c);
      while (lectures < 25) assert.equal(annule.next().done, false);
      annule.return([]);
      const arret = lectures;
      assert.equal(annule.next().done, true);
      assert.equal(lectures, arret);
      assert.ok(arret <= 26 && arret < total);
    }
  });
}

test('C33 trouve un variant sans token de sa famille et accepte un token partagé', () => {
  const r = releve('Button', [axe('State', ['default', 'hover'])]);
  r.variants = [variante('default', { State: 'default' }, 'v0'), variante('hover', { State: 'hover' }, 'v0')];
  assert.deepEqual(controlerOublis(r, catalogueEtendu({ nom: 'button/color/default/background', collection: 'components' }))
    .filter(({ code }) => code === 'C33').map(({ variants }) => variants), [['hover']]);
  assert.equal(controlerOublis(r, catalogueEtendu({ nom: 'button/color/background', collection: 'components' }))
    .filter(({ code }) => code === 'C33').length, 0);
});

test('une lecture partielle ne crée pas de faux oublis', () => {
  const r = releve('Button', [axe('State', ['default', 'hover'])]);
  r.variants = [variante('default', { State: 'default' }, 'v0')];
  r.lecture.variantsNonLus.push('hover');
  assert.deepEqual(controlerOublis(r, catalogueEtendu({ nom: 'button/color/hover/background', collection: 'components' })), []);
});

test('table T : le relevé Alert rend les écarts de nom, de liaison, de couche et de matrice', () => {
  const severites = ['info', 'success', 'warning', 'error'];
  const styles = ['standard', 'outlined', 'filled'];
  const r = releve('Alert', [axe('Severity', severites), axe('Variant', styles)]);
  r.variants = severites.flatMap((severity) => styles.filter((style) => !(severity === 'warning' && style === 'filled'))
    .map((style) => variante(`${severity}-${style}`, { Severity: severity, Variant: style },
      severity === 'info' && style === 'filled' ? 'v1' : 'v0', { nom: 'icon' })));
  const c = catalogueEtendu(
    { nom: 'alert/colors/info/standard/icon', collection: 'components' },
    { nom: 'alert/color/info/filled/icon', collection: 'components' },
    ...['background', 'foreground', 'icon'].map((role) => ({ nom: `alert/color/warning/filled/${role}`, collection: 'components' })),
    { nom: 'dimension/14', collection: 'primitives', type: 'FLOAT' },
    { nom: 'alert/size/gap', collection: 'components', type: 'FLOAT' },
  );
  for (const variant of r.variants) {
    if (variant.id !== 'success-standard') continue;
    variant.layers.push({ ...variant.layers[0], id: 'container-success', nom: 'container',
      liaisons: [{ ...variant.layers[0].liaisons[0], porteur: 'container-success' }] });
  }
  r.variants[0].layers.push({ ...r.variants[0].layers[0], id: 'gap-info', nom: 'gap',
    liaisons: [{ ...r.variants[0].layers[0].liaisons[0], champ: 'itemSpacing', porteur: 'gap-info',
      variable: { id: 'v5', cle: 'v5', nom: 'dimension/14', collection: 'primitives', distante: false } }] });
  const constats = [
    ...controlerNommage(r, c), ...controlerMapping(r, c), ...controlerCouches(r, c), ...controlerOublis(r, c),
  ];
  assert.equal(r.variants.length, 11);
  assert.ok(constats.some(({ code, variants }) => code === 'C15' && variants.includes('success-standard')));
  assert.ok(constats.some(({ code }) => code === 'C8'));
  // Le layer `gap` est lié directement à une primitive : C80 depuis le lot K1 (c'était C20).
  assert.ok(constats.some(({ code, faits }) => code === 'C80' && faits.token === 'dimension/14'));
  assert.ok(constats.some(({ code, faits }) => code === 'C31' && faits.Severity === 'warning' && faits.Variant === 'filled'));
  assert.equal(constats.filter(({ code, faits }) => code === 'C32' && String(faits.token).includes('warning/filled')).length, 3);
  // Le variant `info-filled` porte `alert/color/info/filled/icon` : ses valeurs sont les siennes, C21 ne le vise plus (lot K1).
  assert.ok(!constats.some(({ code, variants }) => code === 'C21' && variants.includes('info-filled')));
  assert.ok(!constats.some(({ code, faits }) => code === 'C7' && faits.valeur === 'gap'));
});

test('table T : le relevé Button couvre les 216 variants et les écarts de survol, taille et fratrie', () => {
  const styles = ['contained', 'outlined', 'text'];
  const palettes = ['primary', 'secondary', 'info', 'success', 'warning', 'danger'];
  const etats = ['default', 'hover', 'focus'];
  const tailles = ['small', 'medium', 'large', 'xl'];
  const r = releve('Button', [axe('Style', styles), axe('Palette', palettes), axe('State', etats), axe('Size', tailles)]);
  r.variants = styles.flatMap((style) => palettes.flatMap((palette) => etats.flatMap((state) => tailles.map((size) => {
    const id = `${style}-${palette}-${state}-${size}`;
    return variante(id, { Style: style, Palette: palette, State: state, Size: size },
      id === 'contained-primary-hover-medium' ? 'v1' : 'v0');
  }))));
  const c = catalogueEtendu(
    { nom: 'button/color/background', collection: 'components' },
    { nom: 'button/color/primary/contained/md/default/background', collection: 'components' },
    { nom: 'button/size/medium/padding-x', collection: 'components', type: 'FLOAT' },
    { nom: 'dimension/14', collection: 'primitives', type: 'FLOAT' },
    ...palettes.map((palette) => ({ nom: `button/color/${palette}/text/sm/focus/foreground`, collection: 'components' })),
    ...palettes.map((palette) => ({ nom: `${palette}/${palette === 'primary' ? 'surface' : 'page'}/foreground`, collection: 'theme' })),
  );
  for (const [rang, palette] of palettes.entries()) {
    c.variables[4 + rang].valeurs = { light: { alias: `v${10 + rang}` } };
    const variant = r.variants.find(({ valeurs }) => valeurs.Style === 'text' && valeurs.Palette === palette
      && valeurs.State === 'focus' && valeurs.Size === 'small')!;
    variant.layers.push(variante(variant.id, variant.valeurs, `v${4 + rang}`, { nom: 'label', type: 'TEXT' }).layers[0]);
  }
  const premier = r.variants[0];
  premier.layers.push(variante(premier.id, premier.valeurs, 'v3', { champ: 'paddingLeft', nom: 'padding' }).layers[0]);
  const constats = [
    ...controlerNommage(r, c), ...controlerMapping(r, c), ...controlerCouches(r, c), ...controlerOublis(r, c),
  ];
  assert.equal(r.variants.length, 216);
  assert.ok(constats.some(({ code, variants }) => code === 'C16' && variants.includes('contained-primary-hover-medium')));
  // Dans un dossier, `md` reçoit C10 (le mot entier est attendu) et `medium` est tenu (lot K2).
  assert.ok(constats.some(({ code, faits }) => code === 'C10' && faits.token === 'button/color/primary/contained/md/default/background' && faits.attendu === 'medium'));
  assert.ok(!constats.some(({ code, faits }) => code === 'C10' && faits.token === 'button/size/medium/padding-x'));
  // Le layer `padding` est lié directement à une primitive : C80 depuis le lot K1 (c'était C20).
  assert.ok(constats.some(({ code, faits }) => code === 'C80' && faits.token === 'dimension/14'));
  // Le label de `text-primary-focus-small` porte `button/color/primary/text/sm/focus/foreground` : ses valeurs sont les siennes, C21 ne le vise plus (lot K1).
  assert.ok(!constats.some(({ code, variants }) => code === 'C21' && variants.includes('text-primary-focus-small')));
  assert.ok(!constats.some(({ code, faits }) => code === 'C16' && faits.token === 'button/color/background'));
});

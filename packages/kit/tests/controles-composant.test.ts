import assert from 'node:assert/strict';
import test from 'node:test';
import {
  axeDePropriete, controlerNommage, controlerMapping, controlerCouches, controlerOublis,
  type CatalogueDeReference, type ReleveDeComposant, type VariantLu,
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

test('C10 reconnaît medium comme forme tolérée de md et accepte md', () => {
  const composant = releve('Button', [axe('Size', ['medium'])]);
  assert.deepEqual(controlerNommage(composant, catalogue('button/size/medium/padding-x')).map(({ code }) => code), ['C10']);
  assert.deepEqual(controlerNommage(composant, catalogue('button/size/md/padding-x')), []);
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

test('C20 juge la couche d’une dimension et C61 celle d’une couleur primitive', () => {
  const r = releve('Button');
  r.variants = [variante('default', {}, 'v0', { champ: 'paddingLeft' })];
  assert.ok(codes(controlerCouches(r, catalogueEtendu({ nom: 'dimension/14', collection: 'primitives', type: 'FLOAT' }))).includes('C20'));
  assert.deepEqual(codes(controlerCouches(r, catalogueEtendu({ nom: 'sizing/14', collection: 'layout', type: 'FLOAT' }))), []);
  r.variants = [variante('default', {}, 'v0')];
  assert.deepEqual(codes(controlerCouches(r, catalogueEtendu({ nom: 'color/blue/500', collection: 'primitives' }))), ['C20', 'C61']);
  assert.deepEqual(codes(controlerCouches(r, catalogueEtendu({ nom: 'primary/solid/background', collection: 'theme' }))), []);
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
  assert.ok(constats.some(({ code, faits }) => code === 'C20' && faits.token === 'dimension/14'));
  assert.ok(constats.some(({ code, faits }) => code === 'C31' && faits.Severity === 'warning' && faits.Variant === 'filled'));
  assert.equal(constats.filter(({ code, faits }) => code === 'C32' && String(faits.token).includes('warning/filled')).length, 3);
  assert.ok(constats.some(({ code, variants }) => code === 'C21' && variants.includes('info-filled')));
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
  assert.ok(constats.some(({ code, faits }) => code === 'C10' && faits.token === 'button/size/medium/padding-x'));
  assert.ok(constats.some(({ code, faits }) => code === 'C20' && faits.token === 'dimension/14'));
  assert.ok(constats.some(({ code, variants, layers }) => code === 'C21' && variants.includes('text-primary-focus-small')
    && layers.some((layer) => layer.startsWith('layer-'))));
  assert.ok(!constats.some(({ code, faits }) => code === 'C16' && faits.token === 'button/color/background'));
});

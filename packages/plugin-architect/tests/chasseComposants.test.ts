/**
 * La chasse aux faux constats (recette du Button, L10 volet c) : des composants de ce que les design systems du marché dessinent,
 * fabriqués sur `atelierDeCalques`, passent par l'analyse complète (`LECTEURS_DE_FIGMA`, relevé, catalogue, moteur, contrôles du kit).
 * Chaque composant juste n'attend aucun constat à traiter. Chaque cas de défaut attend l'absence du faux constat que le journal de
 * Codex avait reproduit (C1 à C13, N2, N3). Les structures sont celles qui diffèrent : un point en ELLIPSE, une pointe de Tooltip,
 * un indicateur de Tabs, une image d'Avatar, des séparateurs de Breadcrumb, un anneau sous instance.
 */
import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';

import { proposerLaPropagation } from '@ucm-kit/core/controles';
import { CLE_ARCHITECTURE_DU_FICHIER, ECHELLES_DE_REFERENCE, ESPACE_ARCHITECT, texteDeLArchitectureDuFichier } from '@ucm-kit/core/referentiel';
import { oublierLIndexDuDocument } from 'ucm-plugin-socle/src/composant/contract/composedComponents';

import { themeDuProfil, PROFIL_P37 } from '../../kit/tests/stress/f2-structure/themeUcm';
import type { PluginMessage } from '../src/messages';
import type { Constat } from '../src/messages/commun';
import type { Contexte } from '../src/sandbox/contexte';
import { LECTEURS_DE_FIGMA, reinitialiserLAnalyse, traiterAvec } from '../src/sandbox/analyse';
import { atelierDeCalques, collectionFigma, portDeTest, variableFigma } from './figmaDeTest';

beforeEach(() => {
  reinitialiserLAnalyse();
  oublierLIndexDuDocument();
});

// ---------------------------------------------------------------------------------------------------------------------------
// L'atelier : un composant, ses variants, ses tokens et ses règles, dans un faux Figma que l'analyse complète lit. Les doubles de
// Figma sont des objets ordinaires : leur forme dépasse les types du plugin, d'où les `any` de cette section.

/* eslint-disable @typescript-eslint/no-explicit-any */
const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id });
const noir = { r: 0, g: 0, b: 0, a: 1 };
const blanc = { r: 1, g: 1, b: 1, a: 1 };
const MODES_PAR_DEFAUT = { c: 'c:Valeur', t: 't:Light', p: 'p:Valeur', ty: 'ty:Valeur', lo: 'lo:Valeur' };

function atelier(nom: string, axes: Record<string, string[]> = { State: ['Default'] }) {
  const a = atelierDeCalques();
  const definitions: Record<string, any> = {};
  const variables: any[] = [];
  const collections: any[] = [];
  const collection = (id: string, name: string, modes = ['Valeur']) => { collections.push(collectionFigma(id, name, modes, [])); };
  collection('c', 'components'); collection('t', 'theme', ['Light', 'Dark']); collection('p', 'primitives'); collection('ty', 'typography'); collection('lo', 'layout');
  const variable = (id: string, c: string, name: string, type: string, valeur: unknown) => {
    const co = collections.find((x) => x.id === c);
    variables.push(variableFigma(id, c, name, type, Object.fromEntries(co.modes.map((m: any) => [m.modeId, valeur]))));
    (co.variableIds as string[]).push(id);
    return id;
  };
  variable('p-noir', 'p', 'color/black', 'COLOR', noir); variable('p-blanc', 'p', 'color/white', 'COLOR', blanc);
  variable('t-bg', 't', 'neutral/background', 'COLOR', alias('p-blanc')); variable('t-fg', 't', 'neutral/foreground', 'COLOR', alias('p-noir'));
  variable('family', 'p', 'font-family/base', 'STRING', 'Inter');
  variable('font-size', 'ty', 'body/md/font-size', 'FLOAT', 16); variable('font-weight', 'ty', 'body/md/font-weight', 'FLOAT', 400);
  const token = (role: string, valeur: unknown = role === 'background' ? blanc : noir, suffix = 'Primary/Filled/Default') => {
    void valeur;
    const id = `token-${role}-${suffix}`;
    if (!variables.some((v) => v.id === id)) variable(id, 'c', `${nom}/Color/${suffix}/${role}`, 'COLOR', alias(role === 'background' ? 't-bg' : 't-fg'));
    return id;
  };
  const dejaPris = new Set<string>();
  const calque = (id: string, type: string, champs: Record<string, unknown> = {}, enfants: any[] = []) => {
    const nodeId = dejaPris.has(id) ? `${id}-${dejaPris.size}` : id;
    dejaPris.add(nodeId);
    return a.calque(nodeId, type, {
      name: id, visible: true, opacity: 1, blendMode: 'NORMAL', fills: [], strokes: [], effects: [], boundVariables: {},
      resolvedVariableModes: { ...MODES_PAR_DEFAUT }, explicitVariableModes: {},
      absoluteBoundingBox: { x: 0, y: 0, width: 120, height: 48 }, width: 120, height: 48, layoutMode: 'NONE', ...champs,
    }, enfants);
  };
  const paint = (id: string, color = noir) => ({ type: 'SOLID', visible: true, opacity: 1, blendMode: 'NORMAL', color, boundVariables: { color: alias(id) } });
  const text = (id: string, role = 'foreground', suffix = 'Primary/Filled/Default', style = 'S:body', family = 'Inter') => {
    const fills = [paint(token(role, noir, suffix))];
    const boundVariables = { fontFamily: alias('family'), fontSize: alias('font-size'), fontWeight: alias('font-weight') };
    a.styleDeTexte(style, 'Body/Medium', boundVariables);
    return calque(id, 'TEXT', {
      name: id, absoluteBoundingBox: { x: 32, y: 12, width: 70, height: 24 }, width: 70, height: 24, characters: 'Exemple', fontSize: 16, fontWeight: 400,
      fontName: { family, style: 'Regular' }, textStyleId: style, boundVariables, fills,
      getStyledTextSegments: (champs: string[]) => [{ start: 0, end: 7, ...Object.fromEntries(champs.map((k) => [k, ({ fills, boundVariables, fontSize: 16, fontWeight: 400, fontName: { family, style: 'Regular' }, textStyleId: style } as any)[k]])) }],
    });
  };
  const variantes: any[] = [];
  const variant = (valeurs: Record<string, string>, enfants: any[], champs: Record<string, unknown> = {}) => {
    const nomVariant = Object.entries(valeurs).map(([k, v]) => `${k}=${v}`).join(', ');
    for (const prop of ['gap', 'padding-x', 'padding-y', 'radius']) {
      if (variables.some((v) => v.id === prop)) continue;
      variable(`layout-${prop}`, 'lo', prop === 'radius' ? 'radius/none' : 'spacing/none', 'FLOAT', 0);
      variable(prop, 'c', `${nom}/Size/md/${prop}`, 'FLOAT', alias(`layout-${prop}`));
    }
    const n = calque(`v${variantes.length}`, 'COMPONENT', {
      name: nomVariant, key: `cle-v${variantes.length}`, variantProperties: valeurs, componentPropertyDefinitions: {},
      fills: [paint(token('background', blanc, `Primary/Filled/${valeurs.State ?? 'Default'}`), blanc)],
      layoutMode: 'HORIZONTAL', primaryAxisSizingMode: 'AUTO', counterAxisSizingMode: 'AUTO', itemSpacing: 0, paddingLeft: 0, paddingRight: 0, paddingTop: 0, paddingBottom: 0, cornerRadius: 0,
      boundVariables: { itemSpacing: alias('gap'), paddingLeft: alias('padding-x'), paddingRight: alias('padding-x'), paddingTop: alias('padding-y'), paddingBottom: alias('padding-y'), cornerRadius: alias('radius') },
      ...champs,
    }, enfants);
    variantes.push(n);
    return n;
  };
  const finir = (options: { sansRegles?: boolean; nomDuJeu?: string } = {}) => {
    const jeu = calque('jeu', 'COMPONENT_SET', {
      name: options.nomDuJeu ?? nom, key: `cle-${nom}`, defaultVariant: variantes[0],
      componentPropertyDefinitions: { ...Object.fromEntries(Object.entries(axes).map(([k, v]) => [k, { type: 'VARIANT', defaultValue: v[0], variantOptions: v }])), ...definitions },
    }, variantes);
    const descendants = (n: any): any[] => (n.children ?? []).flatMap((e: any) => [e, ...descendants(e)]);
    const root: any = { id: '0:0', type: 'DOCUMENT', name: 'Cas fabriqué', documentColorProfile: 'SRGB', getSharedPluginData: (espace: string, cle: string) => (espace === ESPACE_ARCHITECT && cle === CLE_ARCHITECTURE_DU_FICHIER ? texteDeLArchitectureDuFichier(true) : ''), getSharedPluginDataKeys: () => [] };
    const page: any = {
      id: 'page', type: 'PAGE', name: 'Composants', parent: root, selection: [jeu], children: [jeu], backgrounds: [{ type: 'SOLID', color: blanc }],
      loadAsync: async () => {}, on: () => {}, off: () => {},
      findAll: (f: any = () => true) => descendants(page).filter(f),
      findAllWithCriteria: ({ types }: any) => descendants(page).filter((n) => types.includes(n.type)),
    };
    root.children = [page];
    if (!options.sansRegles) {
      const ruleNode = (id: string, name: string, type = 'FRAME', champs: Record<string, unknown> = {}, children: any[] = []) => {
        const n: any = { id, name, type, children, parent: null, ...champs };
        for (const c of children) c.parent = n;
        n.findAll = (f: any = () => true) => descendants(n).filter(f);
        n.findOne = (f: any) => descendants(n).find(f) ?? null;
        n.findChildren = (f: any) => children.filter(f);
        return n;
      };
      let count = 0;
      const texte = (name: string, characters: string) => ruleNode(`r${count++}`, name, 'TEXT', { characters });
      const regle = (tag: string, cible = '') => ruleNode(`r${count++}`, '.ruleItem', 'INSTANCE', { getMainComponentAsync: async () => ({ id: 'rule-main', type: 'COMPONENT', name: '.ruleItem', remote: false, parent: null }) }, [texte(`@${tag}`, `@${tag}`), texte('content', 'Description du comportement.'), ...(cible ? [texte('prop', cible)] : [])]);
      const elements = [texte('component-name', nom), regle('usage')];
      for (const [axe, vals] of Object.entries(axes)) for (const val of vals) elements.push(regle('prop', `${axe.toLowerCase()}.${val.toLowerCase()}`));
      for (const [key, def] of Object.entries(definitions)) if (def.type === 'BOOLEAN') elements.push(regle('boolean', key.split('#')[0].toLowerCase()));
      const regles = ruleNode('regles', '.componentRules', 'INSTANCE', { getMainComponentAsync: async () => ({ id: 'rules-main', type: 'COMPONENT', name: '.componentRules', remote: false, parent: null }) }, elements);
      regles.parent = page;
      page.children.push(regles);
    }
    const { port } = portDeTest(collections, variables);
    const p = a.port(port, [jeu]);
    const figma: any = {
      root, currentPage: page, mixed: Symbol('mixed'), skipInvisibleInstanceChildren: false, variables: port,
      getNodeByIdAsync: p.getNodeByIdAsync, getStyleByIdAsync: p.getStyleByIdAsync,
      clientStorage: { getAsync: async () => undefined }, teamLibrary: { getAvailableLibraryVariableCollectionsAsync: async () => [] },
    };
    return { figma, jeu, page, variables, collections };
  };
  return { a, calque, paint, text, token, variable, variant, finir, definitions };
}

type Monde = ReturnType<ReturnType<typeof atelier>['finir']>;

interface Resultat {
  final: Extract<PluginMessage, { type: 'analyse' }>;
  releve: any;
  catalogue: any;
}

/** L'analyse complète du monde : le dernier message `analyse`, le relevé et le catalogue que les lecteurs ont lus. */
async function analyser(monde: Monde): Promise<Resultat> {
  const globale = globalThis as { figma?: unknown };
  const precedent = globale.figma;
  globale.figma = monde.figma;
  let releve: any;
  let catalogue: any;
  const messages: PluginMessage[] = [];
  try {
    const traiter = traiterAvec({
      ...LECTEURS_DE_FIGMA,
      releve: async (...args: Parameters<typeof LECTEURS_DE_FIGMA.releve>) => {
        const r = await LECTEURS_DE_FIGMA.releve(...args);
        if (r.statut === 'lu') releve = r.releve;
        return r;
      },
      catalogue: async (...args: Parameters<typeof LECTEURS_DE_FIGMA.catalogue>) => {
        catalogue = await LECTEURS_DE_FIGMA.catalogue(...args);
        return catalogue;
      },
    });
    const contexte: Contexte = { figma: monde.figma as PluginAPI, envoyer: (m) => messages.push(m), surveillerLeDocument: () => [] };
    await traiter({ type: 'analyser', demande: 1 }, contexte);
  } finally {
    globale.figma = precedent;
  }
  const final = messages.find((m) => m.type === 'analyse') as Resultat['final'] | undefined;
  assert.ok(final, 'l’analyse rend un résultat');
  assert.equal(final.statut, 'complete', JSON.stringify(final.statut === 'complete' ? '' : final.constats));
  return { final, releve, catalogue };
}

const codes = (r: Resultat): string[] => r.final.constats.map((c: Constat) => c.code);
const sans = (r: Resultat, ...liste: string[]): Constat[] => r.final.constats.filter((c: Constat) => liste.includes(c.code));
const ATraiter = (r: Resultat): string[] => r.final.constats.filter((c: Constat) => c.type !== 'info').map((c: Constat) => `${c.code}:${JSON.stringify(c.faits)}`);

// ---------------------------------------------------------------------------------------------------------------------------
// Les composants justes : aucun constat à traiter

/** Un composant par structure de calques ; `combos` fixe les axes, `couches` rend les calques de chaque combinaison. */
interface Composant { nom: string; axes: Record<string, string[]>; couches: (b: ReturnType<typeof atelier>, v: Record<string, string>, suffix: string) => any[] }
const COMPOSANTS: Composant[] = (() => {
  const forme = (b: ReturnType<typeof atelier>, suffix: string, id: string, type = 'RECTANGLE', role = 'foreground', champs: Record<string, unknown> = {}) =>
    b.calque(id, type, { name: id, absoluteBoundingBox: { x: 8, y: 16, width: 16, height: 16 }, width: 16, height: 16, fills: [b.paint(b.token(role, undefined, suffix), role === 'background' ? blanc : noir)], ...champs });
  /** Une instance d'icône : son tracé porte la surcharge de remplissage, son composant principal vient d'une bibliothèque. */
  const icone = (b: ReturnType<typeof atelier>, suffix: string, name: string, swap = false) => {
    const dessin = forme(b, suffix, `${name}-vector`, 'VECTOR');
    const maitre = b.calque(`${name}-main`, 'COMPONENT', { name: 'Icon', key: `${name}-key`, remote: true }, [b.calque(`${name}-source`, 'VECTOR', { name: 'Vector' })]);
    if (swap) b.definitions['Icon#1:0'] = { type: 'INSTANCE_SWAP', defaultValue: maitre.id };
    return b.calque(name, 'INSTANCE', {
      name, componentPropertyReferences: swap ? { mainComponent: 'Icon#1:0' } : {}, componentProperties: {}, variantProperties: {},
      getMainComponentAsync: async () => maitre, overrides: [{ id: dessin.id, overriddenFields: ['fills'] }],
    }, [dessin]);
  };
  const image = (b: ReturnType<typeof atelier>, id: string, type = 'RECTANGLE') => b.calque(id, type, { name: id, fills: [{ type: 'IMAGE', visible: true, opacity: 1, scaleMode: 'FILL', imageHash: `${id}-fabriquee` }] });
  const liste: Composant[] = [
    { nom: 'Radio', axes: { State: ['Default'], Selected: ['Off', 'On'] }, couches: (b, v, s) => (v.Selected === 'On' ? [forme(b, s, 'Dot', 'ELLIPSE')] : []) },
    { nom: 'Switch', axes: { State: ['Default'], Checked: ['Off', 'On'] }, couches: (b, _v, s) => [forme(b, s, 'Track', 'RECTANGLE', 'background'), forme(b, s, 'Thumb', 'ELLIPSE')] },
    { nom: 'TextField', axes: { State: ['Default', 'Hover'] }, couches: (b, _v, s) => [b.text('Label', 'foreground', s), b.text('Helper', 'foreground', s), b.text('Placeholder', 'foreground', s), icone(b, s, 'arrow-right')] },
    { nom: 'Tabs', axes: { State: ['Default'] }, couches: (b, _v, s) => [b.text('Tab label', 'foreground', s), forme(b, s, 'Indicator')] },
    { nom: 'Badge', axes: { State: ['Default'] }, couches: (b, _v, s) => [forme(b, s, 'Dot', 'ELLIPSE'), b.text('Label', 'foreground', s)] },
    { nom: 'Chip', axes: { State: ['Default'] }, couches: (b, _v, s) => [b.text('Label', 'foreground', s), icone(b, s, 'xmark', true)] },
    { nom: 'Avatar', axes: { Content: ['Image', 'Initials'], State: ['Default'] }, couches: (b, v, s) => (v.Content === 'Image' ? [image(b, 'Photo', 'ELLIPSE')] : [b.text('Initials', 'foreground', s)]) },
    { nom: 'Tooltip', axes: { State: ['Default'] }, couches: (b, _v, s) => [b.text('Label', 'foreground', s), forme(b, s, 'Pointer', 'VECTOR', 'background')] },
    { nom: 'Card', axes: { State: ['Default'] }, couches: (b, _v, s) => [image(b, 'Image'), b.text('Title', 'foreground', s), forme(b, s, 'Divider', 'RECTANGLE', 'divider')] },
    { nom: 'Dialog', axes: { State: ['Default'] }, couches: (b, _v, s) => [forme(b, s, 'Scrim', 'RECTANGLE', 'background'), b.text('Title', 'foreground', s), icone(b, s, 'xmark')] },
    { nom: 'Progress', axes: { State: ['Default'] }, couches: (b, _v, s) => [forme(b, s, 'Track', 'RECTANGLE', 'background'), forme(b, s, 'Value')] },
    { nom: 'Slider', axes: { State: ['Default'] }, couches: (b, _v, s) => [forme(b, s, 'Track', 'RECTANGLE', 'background'), forme(b, s, 'Range'), forme(b, s, 'Thumb', 'ELLIPSE')] },
    { nom: 'IconButton', axes: { State: ['Default'] }, couches: (b, _v, s) => [icone(b, s, 'plus')] },
    { nom: 'Breadcrumb', axes: { State: ['Default'] }, couches: (b, _v, s) => [b.text('Label', 'foreground', s), icone(b, s, 'chevron-right'), b.text('Current', 'foreground', s)] },
  ];
  return liste;
})();

for (const { nom, axes, couches } of COMPOSANTS) {
  test(`${nom} juste ne rend aucun constat à traiter`, async () => {
    const b = atelier(nom, axes);
    let combos: Array<Record<string, string>> = [{}];
    for (const [k, vals] of Object.entries(axes)) combos = combos.flatMap((c) => vals.map((v) => ({ ...c, [k]: v })));
    for (const [rang, valeurs] of combos.entries()) {
      const suffix = `Primary/Filled/${valeurs.State ?? 'Default'}`;
      if (nom === 'TextField' && rang === 1) {
        // L'état Hover pose un contour lié au token de bordure de cet état.
        const hover = b.token('border', noir, suffix);
        b.variable('layout-stroke', 'lo', 'stroke/sm', 'FLOAT', 1);
        b.variable('stroke-width', 'c', 'TextField/Size/md/border-width', 'FLOAT', alias('layout-stroke'));
        b.variant(valeurs, couches(b, valeurs, suffix), {
          strokes: [b.paint(hover)], strokeAlign: 'INSIDE', strokeWeight: 1,
          boundVariables: { itemSpacing: alias('gap'), paddingLeft: alias('padding-x'), paddingRight: alias('padding-x'), paddingTop: alias('padding-y'), paddingBottom: alias('padding-y'), cornerRadius: alias('radius'), strokeWeight: alias('stroke-width') },
        });
      } else b.variant(valeurs, couches(b, valeurs, suffix));
    }
    const r = await analyser(b.finir());
    assert.deepEqual(ATraiter(r), []);
  });
}

test('Checkbox lie sa coche et son tiret au foreground sans C24 ni C66', async () => {
  const b = atelier('Checkbox', { State: ['Default'], Checked: ['Off', 'On', 'Indeterminate'] });
  for (const checked of ['Off', 'On', 'Indeterminate']) {
    const enfants = [];
    if (checked !== 'Off') enfants.push(b.calque(`mark-${checked}`, checked === 'On' ? 'VECTOR' : 'RECTANGLE', { name: checked === 'On' ? 'Check' : 'Indeterminate', fills: [b.paint(b.token('foreground'))] }));
    b.variant({ State: 'Default', Checked: checked }, enfants);
  }
  const r = await analyser(b.finir());
  assert.deepEqual(sans(r, 'C24', 'C66'), []);
});

// ---------------------------------------------------------------------------------------------------------------------------
// C1 : un axe générique ne produit ni proposition d'un autre axe ni constat d'ensemble

for (const axe of ['Type', 'Kind', 'Status', 'Tone', 'Emphasis', 'Look', 'Intent', 'Couleur', 'Taille', 'État']) {
  test(`C1 : l’axe ${axe} se lit sans constat à traiter`, async () => {
    const style = ['Emphasis', 'Look'].includes(axe);
    const taille = axe === 'Taille';
    const etat = axe === 'État';
    const valeurs = style ? ['Filled', 'Outlined'] : taille ? ['Medium'] : etat ? ['Default'] : ['Primary', 'Danger'];
    const axes: Record<string, string[]> = { State: ['Default'], [axe]: valeurs };
    if (etat) delete axes.State;
    const b = atelier('Badge', axes);
    for (const valeur of valeurs) {
      const suffix = `${style || taille || etat ? 'Primary' : valeur}/${style ? valeur : 'Filled'}/Default`;
      const token = b.token('background', blanc, suffix);
      b.variant(etat ? { [axe]: valeur } : { State: 'Default', [axe]: valeur }, [], { fills: [b.paint(token, blanc)] });
    }
    const r = await analyser(b.finir());
    assert.deepEqual(ATraiter(r), []);
  });
}

// ---------------------------------------------------------------------------------------------------------------------------
// C2 et C4 : une famille de police conforme à la référence ne reçoit ni C20 ni C65

test('C4 : un texte sans style qui lie fontFamily à primitives ne reçoit ni C20 ni C65', async () => {
  const b = atelier('TextField');
  b.variant({ State: 'Default' }, [b.text('Label', 'foreground', 'Primary/Filled/Default', '')]);
  const r = await analyser(b.finir());
  assert.deepEqual(sans(r, 'C20', 'C65'), []);
});

test('C2 : le thème complet de la référence accepte un style body/md lié, sans constat à traiter', async () => {
  const b = atelier('Reference', { Size: ['Medium'], State: ['Default'] });
  const label = b.text('Label', 'foreground', 'Primary/Filled/Default', 'S:body', 'Open Sans');
  b.a.styleDeTexte('S:body', 'body/md', { fontFamily: alias('family'), fontSize: alias('font-size'), fontWeight: alias('font-weight'), lineHeight: alias('typography|body/md/line-height'), letterSpacing: alias('typography|body/md/letter-spacing') });
  b.variant({ Size: 'Medium', State: 'Default' }, [label], { cornerRadius: 4 });
  const monde = b.finir();
  const components = monde.variables.filter((v: any) => v.variableCollectionId === 'c');
  const source = themeDuProfil({ ...PROFIL_P37, ecriture: 'minuscules-tiret', collectionRedite: false, rampes: 'locales' }).catalogue;
  const variables: any[] = source.variables.filter((v: any) => v.collection !== 'components' && v.collection !== 'layout');
  for (const [collection, entries] of Object.entries(ECHELLES_DE_REFERENCE)) {
    for (const entry of entries) {
      variables.push({
        cle: `${collection}|${entry.chemin}`, nom: entry.chemin, collection, type: typeof entry.valeur === 'string' ? 'STRING' : 'FLOAT', etat: 'presente', scopes: ['ALL_SCOPES'],
        valeurs: { ref: entry.alias ? { alias: entry.alias.replace('/', '|') } : { valeur: entry.valeur } },
      });
    }
  }
  const sourceCollections: any[] = [...source.collections, { cle: 'typography', nom: 'typography', role: 'typography', etat: 'lue', modes: [{ id: 'ref', nom: 'Valeur' }] }];
  const collectionId: Record<string, string> = { primitives: 'p', brands: 'brands', utility: 'utility', theme: 't', layout: 'lo', typography: 'ty', components: 'c' };
  const special: Record<string, string> = { 'primitives|font-family/base': 'family', 'typography|body/md/font-size': 'font-size', 'typography|body/md/font-weight': 'font-weight' };
  const id = (key: string) => special[key] ?? key;
  const modeName = (c: any, m: any, i: number) => (c.cle === 'theme' ? (i === 0 ? 'Light' : 'Dark') : c.modes.length === 1 ? 'Valeur' : m.nom);
  monde.collections.splice(0);
  for (const c of sourceCollections) monde.collections.push(collectionFigma(collectionId[c.cle], c.nom, c.modes.map((m: any, i: number) => modeName(c, m, i)), []));
  monde.variables.splice(0);
  for (const v of variables) {
    const c = sourceCollections.find((x) => x.cle === v.collection);
    const valeurs = Object.fromEntries(c.modes.map((m: any, i: number) => {
      const val = v.valeurs?.[m.id] ?? Object.values(v.valeurs ?? {})[0] as any;
      return [`${collectionId[c.cle]}:${modeName(c, m, i)}`, val && 'alias' in val ? alias(id(val.alias)) : val && 'valeur' in val ? val.valeur : null];
    }));
    monde.variables.push({ ...variableFigma(id(v.cle), collectionId[v.collection], v.nom, v.type, valeurs), key: v.cle, scopes: v.scopes ?? ['ALL_SCOPES'] });
  }
  for (const v of components) {
    const target = v.name.endsWith('/background') ? 'theme|neutral/scale/0' : v.name.includes('/Color/') ? 'theme|neutral/scale/1000' : v.name.endsWith('/radius') ? 'layout|radius/sm' : 'layout|sizing/0';
    monde.variables.push({ ...v, valuesByMode: { 'c:Valeur': alias(id(target)) } });
  }
  for (const c of monde.collections) (c as any).variableIds = monde.variables.filter((v: any) => v.variableCollectionId === c.id).map((v: any) => v.id);
  const r = await analyser(monde);
  assert.deepEqual(ATraiter(r), []);
});

// ---------------------------------------------------------------------------------------------------------------------------
// C5, C8, C9, C13 : la preuve du fond et la couleur des propositions

test('C5 : un point noir de Radio sur un fond blanc ne reçoit pas le fond en correction cochée', async () => {
  const b = atelier('Radio', { State: ['Default'], Selected: ['On'] });
  const dot = b.calque('Dot', 'ELLIPSE', { name: 'Dot', absoluteBoundingBox: { x: 8, y: 16, width: 16, height: 16 }, fills: [{ type: 'SOLID', visible: true, opacity: 1, color: noir }] });
  b.variant({ State: 'Default', Selected: 'On' }, [dot]);
  const r = await analyser(b.finir());
  const c = r.final.constats.find((x: Constat) => x.code === 'C25' && x.layers.includes('Dot'));
  assert.ok(c, 'le point en dur reste signalé');
  assert.equal((c as { correction?: unknown }).correction, undefined);
});

test('C8 : un rectangle frère qui peint la surface sous le texte évite C59', async () => {
  const b = atelier('Card');
  b.variable('surface-bg', 't', 'primary/surface/default', 'COLOR', alias('p-noir'));
  b.variable('surface-fg', 't', 'primary/surface/foreground', 'COLOR', alias('p-blanc'));
  b.variable('page-fg', 't', 'primary/page/foreground', 'COLOR', alias('p-noir'));
  b.variable('background', 'c', 'Card/Color/background', 'COLOR', alias('surface-bg'));
  b.variable('foreground', 'c', 'Card/Color/foreground', 'COLOR', alias('surface-fg'));
  b.variable('text', 'c', 'Card/Color/text', 'COLOR', alias('page-fg'));
  const fond = b.calque('Surface', 'RECTANGLE', { name: 'Surface', fills: [b.paint('background', noir)] });
  b.a.styleDeTexte('S:body', 'body/md', {});
  const fills = [b.paint('foreground', blanc)];
  const label = b.calque('Label', 'TEXT', {
    name: 'Label', characters: 'Exemple', fontSize: 16, textStyleId: 'S:body', absoluteBoundingBox: { x: 32, y: 12, width: 70, height: 24 }, fills,
    getStyledTextSegments: () => [{ start: 0, end: 7, fontSize: 16, fontWeight: 400, textStyleId: 'S:body', fills, boundVariables: {} }],
  });
  b.variant({ State: 'Default' }, [fond, label], { fills: [] });
  const monde = b.finir();
  for (let i = monde.variables.length - 1; i >= 0; i -= 1) if (monde.variables[i].id.startsWith('token-')) monde.variables.splice(i, 1);
  const r = await analyser(monde);
  assert.deepEqual(sans(r, 'C59'), []);
});

test('C9 : un texte noir dans le coin vide de la boîte d’une ellipse noire ne donne pas de C49 à corriger', async () => {
  const b = atelier('Badge');
  const cercle = b.calque('Circle', 'ELLIPSE', { name: 'Circle', absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 100 }, fills: [b.paint(b.token('foreground'))] });
  b.a.styleDeTexte('S:body', 'body/md', {});
  const fills = [b.paint(b.token('foreground'))];
  const label = b.calque('Label', 'TEXT', {
    name: 'Label', characters: 'A', fontSize: 12, textStyleId: 'S:body', absoluteBoundingBox: { x: 0, y: 0, width: 8, height: 8 }, fills,
    getStyledTextSegments: () => [{ start: 0, end: 1, fontSize: 12, fontWeight: 400, textStyleId: 'S:body', fills, boundVariables: {} }],
  });
  b.variant({ State: 'Default' }, [cercle, label]);
  const r = await analyser(b.finir());
  assert.deepEqual(r.final.constats.filter((c: Constat) => c.code === 'C49' && c.type === 'corriger'), []);
});

test('C13 : un fond forcé en Dark et un texte forcé en Light se mesurent chacun dans son mode', async () => {
  const b = atelier('Card');
  b.variable('local-bg', 't', 'neutral/surface/default', 'COLOR', blanc);
  b.variable('local-fg', 't', 'neutral/solid/foreground', 'COLOR', blanc);
  b.variable('panel', 'c', 'Card/Color/background', 'COLOR', alias('local-bg'));
  b.variable('label', 'c', 'Card/Color/foreground', 'COLOR', alias('local-fg'));
  const fond = b.calque('Panel', 'RECTANGLE', { name: 'Panel', fills: [b.paint('panel', noir)], explicitVariableModes: { t: 't:Dark' }, resolvedVariableModes: { ...MODES_PAR_DEFAUT, t: 't:Dark' } });
  const fills = [b.paint('label', blanc)];
  b.a.styleDeTexte('S:body', 'body/md', {});
  const label = b.calque('Label', 'TEXT', {
    name: 'Label', characters: 'Exemple', fontSize: 16, textStyleId: 'S:body', absoluteBoundingBox: { x: 32, y: 12, width: 70, height: 24 }, fills,
    explicitVariableModes: { t: 't:Light' }, resolvedVariableModes: { ...MODES_PAR_DEFAUT, t: 't:Light' },
    getStyledTextSegments: () => [{ start: 0, end: 7, fontSize: 16, fontWeight: 400, textStyleId: 'S:body', fills, boundVariables: {} }],
  });
  b.variant({ State: 'Default' }, [fond, label]);
  const monde = b.finir();
  for (const v of monde.variables) if (['local-bg', 'local-fg'].includes(v.id)) (v as any).valuesByMode = { 't:Light': blanc, 't:Dark': noir };
  const r = await analyser(monde);
  assert.deepEqual(r.final.constats.filter((c: Constat) => c.code === 'C49' && c.type === 'corriger'), []);
});

// ---------------------------------------------------------------------------------------------------------------------------
// C6 et C10 : l'identité d'un calque est son chemin, pas son nom

test('C6 : le titre d’une Card ne se compare pas aux deux textes de contenu de même nom', async () => {
  const b = atelier('Card');
  b.variable('heading-theme', 't', 'primary/solid/foreground', 'COLOR', alias('p-noir'));
  b.variable('body-theme', 't', 'neutral/page/foreground-main', 'COLOR', alias('p-noir'));
  b.variable('heading', 'c', 'Card/Color/foreground', 'COLOR', alias('heading-theme'));
  b.variable('body', 'c', 'Card/Color/text', 'COLOR', alias('body-theme'));
  b.a.styleDeTexte('S:body', 'Body/Medium', {});
  const texte = (id: string, variable: string) => {
    const fills = [b.paint(variable)];
    return b.calque(id, 'TEXT', { name: 'Label', characters: 'Exemple', fontSize: 16, textStyleId: 'S:body', fills, getStyledTextSegments: () => [{ start: 0, end: 7, fontSize: 16, fontWeight: 400, textStyleId: 'S:body', fills, boundVariables: {} }] });
  };
  const sections = [['Header', 'heading'], ['Body', 'body'], ['Footer', 'body']].map(([section, v]) => b.calque(section, 'FRAME', { name: section }, [texte(`${section}-text`, v)]));
  b.variant({ State: 'Default' }, sections);
  const r = await analyser(b.finir());
  assert.deepEqual(sans(r, 'C21'), []);
});

test('C10 : le corps d’une Card garde body/md quand son titre homonyme est masqué dans un variant', async () => {
  const b = atelier('Card', { Layout: ['Compact', 'Standard', 'Expanded'], State: ['Default'] });
  const token = b.token('foreground');
  b.a.styleDeTexte('S:title', 'title/md', {});
  b.a.styleDeTexte('S:body', 'body/md', {});
  const texte = (id: string, style: string, size: number) => {
    const fills = [b.paint(token)];
    return b.calque(id, 'TEXT', { name: 'Label', characters: 'Exemple', fontSize: size, textStyleId: style, fills, getStyledTextSegments: () => [{ start: 0, end: 7, fontSize: size, fontWeight: 400, textStyleId: style, fills, boundVariables: {} }] });
  };
  for (const layout of ['Compact', 'Standard', 'Expanded']) {
    const titre = b.calque(`Header-${layout}`, 'FRAME', { name: 'Header', visible: layout !== 'Compact' }, [texte(`title-${layout}`, 'S:title', 20)]);
    const corps = b.calque(`Body-${layout}`, 'FRAME', { name: 'Body' }, [texte(`body-${layout}`, 'S:body', 16)]);
    b.variant({ Layout: layout, State: 'Default' }, [titre, corps]);
  }
  const r = await analyser(b.finir());
  assert.deepEqual(sans(r, 'C64'), []);
});

// ---------------------------------------------------------------------------------------------------------------------------
// C11, C12 : liaisons sous une instance

test('C11 : l’anneau de TextField peint dans une instance sans peinture propre n’est pas absent', async () => {
  const b = atelier('TextField', { State: ['Focus'] });
  const ring = b.token('ring', undefined, 'Primary/Filled/Focus');
  const rectangle = b.calque('Iring;stroke', 'RECTANGLE', { name: 'Ring', strokes: [b.paint(ring)], strokeWeight: 2, strokeAlign: 'OUTSIDE' });
  const source = b.calque('stroke', 'RECTANGLE', { name: 'Ring', strokes: [], strokeWeight: 2, strokeAlign: 'OUTSIDE' });
  const master = b.calque('ring-main', 'COMPONENT', { name: '.Ring', key: 'ring-key', remote: true }, [source]);
  const instance = b.calque('ring', 'INSTANCE', {
    name: '.Ring', variantProperties: {}, componentProperties: {}, componentPropertyReferences: {},
    overrides: [{ id: rectangle.id, overriddenFields: ['strokes'] }], getMainComponentAsync: async () => master,
  }, [rectangle]);
  b.variant({ State: 'Focus' }, [instance]);
  const r = await analyser(b.finir());
  assert.deepEqual(r.final.constats.filter((c: Constat) => c.code === 'C50' && c.faits.anneauVisible === 0), []);
});

test('C12 : Alert ne juge ni C19 ni C80 sur les tokens du Button documenté qu’il imbrique', async () => {
  const b = atelier('Alert');
  b.variable('button-bg', 'c', 'Button/Color/Primary/Filled/Default/background', 'COLOR', alias('t-bg'));
  const fills = [b.paint('button-bg', blanc)];
  const main: any = {
    id: 'button-main', type: 'COMPONENT', name: 'Button', key: 'button-key', remote: false, parent: null, children: [], componentPropertyDefinitions: {}, variantProperties: {},
    visible: true, opacity: 1, fills, strokes: [], effects: [], boundVariables: {}, layoutMode: 'HORIZONTAL', width: 80, height: 48, absoluteBoundingBox: { x: 0, y: 0, width: 80, height: 48 },
  };
  const bouton = b.calque('button', 'INSTANCE', { name: 'Action', fills, variantProperties: {}, componentProperties: {}, componentPropertyReferences: {}, overrides: [], getMainComponentAsync: async () => main });
  b.variant({ State: 'Default' }, [bouton]);
  const monde = b.finir();
  main.parent = monde.page;
  monde.page.children.push(main);
  const source = monde.page.children.find((n: any) => n.name === '.componentRules');
  const descendants = (n: any): any[] => n.children.flatMap((c: any) => [c, ...descendants(c)]);
  const copier = (n: any, parent: any = null): any => {
    const c: any = { ...n, id: `button-${n.id}`, parent, children: [] };
    c.children = (n.children ?? []).map((x: any) => copier(x, c));
    if (c.name === 'component-name') c.characters = 'Button';
    c.findAll = (f: any = () => true) => descendants(c).filter(f);
    c.findOne = (f: any) => descendants(c).find(f) ?? null;
    c.findChildren = (f: any) => c.children.filter(f);
    return c;
  };
  const rules = copier(source, monde.page);
  rules.children = rules.children.slice(0, 2);
  monde.page.children.push(rules);
  const r = await analyser(monde);
  assert.equal(r.releve.variants[0].layers.find((l: any) => l.id === 'button').sorte, 'dependance');
  assert.deepEqual(sans(r, 'C19', 'C80'), []);
});

// ---------------------------------------------------------------------------------------------------------------------------
// C7 et D4 : la pièce interne seule et les règles absentes

test('C7 : la pièce interne du Button analysée seule ne réclame aucun C19', async () => {
  const b = atelier('Button', { Size: ['Medium'] });
  b.variant({ Size: 'Medium' }, []);
  const r = await analyser(b.finir({ sansRegles: true, nomDuJeu: '.sizeWrapperButton' }));
  assert.deepEqual(sans(r, 'C19'), []);
});

test('D4 : l’absence des règles de Progress donne une seule cause à traiter', async () => {
  const b = atelier('Progress');
  b.variant({ State: 'Default' }, []);
  const r = await analyser(b.finir({ sansRegles: true }));
  assert.equal(r.final.constats.filter((c: Constat) => c.famille === 'regles').length, 1, codes(r).join(', '));
});

// ---------------------------------------------------------------------------------------------------------------------------
// N2 et N3 : propagation sous deux racines et clé de collection

test('N2 : Progress retrouve son remplissage homologue sous deux racines de variants de noms différents', async () => {
  const b = atelier('Progress', { State: ['Default', 'Hover'] });
  const defaut = b.token('foreground', noir, 'Primary/Filled/Default');
  b.token('foreground', noir, 'Primary/Filled/Hover');
  const modele = b.calque('value-default', 'RECTANGLE', { name: 'Value', fills: [b.paint(defaut)] });
  const cible = b.calque('value-hover', 'RECTANGLE', { name: 'Value', fills: [{ type: 'SOLID', color: noir, visible: true, opacity: 1 }] });
  b.variant({ State: 'Default' }, [modele]);
  b.variant({ State: 'Hover' }, [cible]);
  const r = await analyser(b.finir());
  const props = proposerLaPropagation(r.releve, r.catalogue, 'v0');
  assert.ok(props.some((c: any) => c.layers.includes('value-hover') && c.correction?.apres.nom.endsWith('/Hover/foreground')), JSON.stringify(props));
  assert.ok(codes(r).includes('C81'));
});

test('N3 : C24 retrouve son candidat quand la clé de la collection diffère de son nom', async () => {
  const b = atelier('Button');
  const foreground = b.token('foreground');
  b.variant({ State: 'Default' }, [], { fills: [b.paint(foreground)] });
  const r = await analyser(b.finir());
  const c: any = r.final.constats.find((x: Constat) => x.code === 'C24');
  assert.ok(c, 'le fond lié à foreground reste signalé');
  const attendu = r.catalogue.variables.find((v: any) => v.nom === 'Button/Color/Primary/Filled/Default/background');
  assert.ok(attendu);
  assert.equal(c.correction?.apres.cle, attendu.cle, JSON.stringify({ constat: c, attendu }));
});

// ---------------------------------------------------------------------------------------------------------------------------
// D5 : une pointe de Tooltip, imbriquée à deux ou trois niveaux d'instances, n'est ni C19 ni C24. L'instance d'un composant fait d'un
// seul tracé n'est qu'une icône probable (`estUneIconeCertaine` faux) : sa pointe admet aussi `background` (D1, D3).
for (const profondeur of [2, 3]) {
  for (const expose of [false, true]) {
    test(`D5 : Tooltip imbriqué à ${profondeur} niveaux, exposition ${expose}, ne rend ni C24 ni C19`, async () => {
      const b = atelier('Tooltip');
      b.definitions['Arrow#1:0'] = { type: 'BOOLEAN', defaultValue: true };
      const arrow = b.calque('Ipointe;vector', 'VECTOR', { name: 'Vector', fills: [b.paint(b.token('background'), blanc)] });
      let branche: any = arrow;
      for (let n = profondeur; n > 0; n -= 1) {
        const master = b.calque(`master${n}`, 'COMPONENT', { name: '.Arrow', key: `master${n}`, remote: true }, [b.calque(`source${n}`, 'VECTOR', { name: 'Vector' })]);
        branche = b.calque(`instance${n}`, 'INSTANCE', {
          name: '.Arrow', isExposedInstance: expose, visible: true, componentPropertyReferences: n === 1 ? { visible: 'Arrow#1:0' } : {}, variantProperties: {}, componentProperties: {},
          overrides: [{ id: arrow.id, overriddenFields: ['fills'] }], getMainComponentAsync: async () => master,
        }, [branche]);
      }
      b.variant({ State: 'Default' }, [branche]);
      const r = await analyser(b.finir());
      assert.deepEqual(sans(r, 'C24', 'C19'), []);
    });
  }
}

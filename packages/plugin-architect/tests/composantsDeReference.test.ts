/**
 * D15, premier filet. Button et Alert, tels que leurs recettes du 25 novembre les décrivent, passent par l'analyse complète
 * (`LECTEURS_DE_FIGMA` : relevé, catalogue, moteur du socle, règles, contrôles du kit) sur `atelierDeCalques`. Chaque test écrit
 * d'abord la liste exacte des constats que les décisions D1 à D26 du plan font attendre, avec leur code, leur type et leur cible,
 * puis lance l'analyse et compare. Un constat que la liste ne prévoit pas fait échouer le test. Il révèle un défaut du moteur, ou
 * une attente à ajouter avec sa raison.
 *
 * Button : le wrapper `.sizeWrapperButton` (non exposé, trois tailles écrites en entier), des icônes de bibliothèque d'un seul
 * `Vector` que pilotent `Icon-Left` et `Icon-Right`, un label au style de texte, les tokens
 * `Button/Color/<couleur>/<style>/<état>/<rôle>`. Alert : `Type` et `Variant`, les tokens
 * `Alert/Color/<Info|Success|Warning|Danger>/<Filled|Outlined>/<rôle>`, des icônes que pilote `Icon`, Titre et Description au style
 * `Body/Large`, un Button documenté imbriqué, des règles qui décrivent `severity`.
 *
 * Les composants sont construits pour ne rien porter d'autre que ces constats : chaque token est lié, chaque taille est liée ou
 * s'adapte au contenu, les règles couvrent les propriétés et les icônes. Un défaut de fabrication de ce fichier ne doit pas
 * passer pour un constat attendu.
 */
import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';

import { CLE_ARCHITECTURE_DU_FICHIER, ESPACE_ARCHITECT, texteDeLArchitectureDuFichier } from '@ucm-kit/core/referentiel';
import { oublierLIndexDuDocument } from 'ucm-plugin-socle/src/composant/contract/composedComponents';

import type { PluginMessage } from '../src/messages';
import type { Constat } from '../src/messages/commun';
import type { Contexte } from '../src/sandbox/contexte';
import { LECTEURS_DE_FIGMA, reinitialiserLAnalyse, traiterAvec } from '../src/sandbox/analyse';
import { atelierDeCalques, collectionFigma, portDeTest, variableFigma } from './figmaDeTest';

beforeEach(() => {
  reinitialiserLAnalyse();
  oublierLIndexDuDocument();
});

/* eslint-disable @typescript-eslint/no-explicit-any -- les doubles de Figma dépassent les types du plugin */
const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id });
const noir = { r: 0, g: 0, b: 0, a: 1 };
const blanc = { r: 1, g: 1, b: 1, a: 1 };
const MODES = { c: 'c:Valeur', t: 't:Light', p: 'p:Valeur', ty: 'ty:Valeur', lo: 'lo:Valeur' };

const descendants = (noeud: any): any[] => (noeud.children ?? []).flatMap((enfant: any) => [enfant, ...descendants(enfant)]);

// ---------------------------------------------------------------------------------------------------------------------------
// L'atelier : un document, sa page, ses collections, ses règles et ses calques.

function atelier() {
  const a = atelierDeCalques();
  const collections: any[] = [];
  const variables: any[] = [];
  const collection = (id: string, nom: string, modes = ['Valeur']) => { collections.push(collectionFigma(id, nom, modes, [])); };
  collection('c', 'components'); collection('t', 'theme', ['Light', 'Dark']); collection('p', 'primitives'); collection('ty', 'typography'); collection('lo', 'layout');
  const variable = (id: string, c: string, nom: string, type: string, valeur: unknown) => {
    if (variables.some((v) => v.id === id)) return id;
    const proprietaire = collections.find((x) => x.id === c);
    variables.push(variableFigma(id, c, nom, type, Object.fromEntries(proprietaire.modes.map((m: any) => [m.modeId, valeur]))));
    proprietaire.variableIds.push(id);
    return id;
  };
  variable('p-noir', 'p', 'color/black', 'COLOR', noir); variable('p-blanc', 'p', 'color/white', 'COLOR', blanc);
  variable('t-fond', 't', 'neutral/background', 'COLOR', alias('p-blanc')); variable('t-texte', 't', 'neutral/foreground', 'COLOR', alias('p-noir'));
  variable('famille', 'p', 'font-family/base', 'STRING', 'Inter');
  for (const taille of ['md', 'lg']) {
    variable(`taille-${taille}`, 'ty', `body/${taille}/font-size`, 'FLOAT', 16); variable(`graisse-${taille}`, 'ty', `body/${taille}/font-weight`, 'FLOAT', 400);
    variable(`interligne-${taille}`, 'ty', `body/${taille}/line-height`, 'FLOAT', 24); variable(`espacement-${taille}`, 'ty', `body/${taille}/letter-spacing`, 'FLOAT', 0);
  }
  variable('l-zero', 'lo', 'spacing/none', 'FLOAT', 0); variable('l-rayon', 'lo', 'radius/none', 'FLOAT', 0); variable('l-icone', 'lo', 'sizing/icon', 'FLOAT', 20);

  const racine: any = { id: '0:0', type: 'DOCUMENT', name: 'Composants de référence', documentColorProfile: 'SRGB', getSharedPluginData: (espace: string, cle: string) => (espace === ESPACE_ARCHITECT && cle === CLE_ARCHITECTURE_DU_FICHIER ? texteDeLArchitectureDuFichier(true) : ''), getSharedPluginDataKeys: () => [] };
  const page: any = {
    id: 'page', type: 'PAGE', name: 'Composants', parent: racine, selection: [], children: [], backgrounds: [{ type: 'SOLID', color: blanc }],
    loadAsync: async () => {}, on: () => {}, off: () => {},
    findAll: (filtre: any = () => true) => descendants(page).filter(filtre),
    findAllWithCriteria: ({ types }: any) => descendants(page).filter((n) => types.includes(n.type)),
  };
  racine.children = [page];

  /** Un calque que l'API lit comme Figma : `findAll` descend tout le sous-arbre, un calque de premier niveau a la page pour parent. */
  const calque = (id: string, type: string, champs: Record<string, unknown> = {}, enfants: any[] = []) => {
    const noeud: any = a.calque(id, type, {
      name: id, parent: page, visible: true, opacity: 1, blendMode: 'NORMAL', fills: [], strokes: [], effects: [], boundVariables: {},
      resolvedVariableModes: { ...MODES }, explicitVariableModes: {}, absoluteBoundingBox: { x: 0, y: 0, width: 120, height: 48 }, width: 120, height: 48, layoutMode: 'NONE',
      ...champs,
      findAll: (filtre: any = () => true) => descendants(noeud).filter(filtre),
    }, enfants);
    return noeud;
  };
  const peinture = (id: string, couleur = noir) => ({ type: 'SOLID', visible: true, opacity: 1, blendMode: 'NORMAL', color: couleur, boundVariables: { color: alias(id) } });

  /** Un texte au style donné, qui lie la police, la taille, la graisse, l'interligne et l'espacement des lettres. */
  const texte = (id: string, nom: string, fills: any[], style: { id: string; nom: string; taille: string }, champs: Record<string, unknown> = {}) => {
    const liees = { fontFamily: alias('famille'), fontSize: alias(`taille-${style.taille}`), fontWeight: alias(`graisse-${style.taille}`),
      lineHeight: alias(`interligne-${style.taille}`), letterSpacing: alias(`espacement-${style.taille}`),
    };
    a.styleDeTexte(style.id, style.nom, liees);
    const lecture = { fills, boundVariables: liees, fontSize: 16, fontWeight: 400, fontName: { family: 'Inter', style: 'Regular' }, textStyleId: style.id };
    return calque(id, 'TEXT', {
      name: nom, absoluteBoundingBox: { x: 32, y: 12, width: 70, height: 24 }, width: 70, height: 24, layoutSizingHorizontal: 'HUG', layoutSizingVertical: 'HUG', characters: 'Exemple', fontSize: 16, fontWeight: 400,
      fontName: { family: 'Inter', style: 'Regular' }, textStyleId: style.id, boundVariables: liees, fills,
      getStyledTextSegments: (champsDemandes: string[]) => [{ start: 0, end: 7, ...Object.fromEntries(champsDemandes.map((c) => [c, (lecture as any)[c]])) }],
      ...champs,
    });
  };

  /** Une icône de bibliothèque : une instance dont le composant principal, distant, n'a qu'un `Vector`. Le fill de son tracé est une surcharge. */
  const icone = (id: string, nom: string, fills: any[], taille: string, champs: Record<string, unknown> = {}) => {
    const dessin = calque(`${id}-vecteur`, 'VECTOR', { name: 'Vector', absoluteBoundingBox: { x: 2, y: 4, width: 16, height: 12 }, width: 16, height: 12, fills });
    const source = calque(`${id}-source`, 'VECTOR', { name: 'Vector', fills: [] });
    const maitre = calque(`${id}-maitre`, 'COMPONENT', { name: nom, key: `cle-${nom}`, remote: true, parent: null, componentPropertyDefinitions: {} }, [source]);
    return {
      dessin,
      instance: calque(id, 'INSTANCE', {
        name: nom, absoluteBoundingBox: { x: 0, y: 0, width: 20, height: 20 }, width: 20, height: 20, variantProperties: {}, componentProperties: {}, boundVariables: { width: alias(taille), height: alias(taille) },
        overrides: [{ id: dessin.id, overriddenFields: ['fills'] }], getMainComponentAsync: async () => maitre, ...champs,
      }, [dessin]),
    };
  };

  /** Le conteneur de règles d'usage d'un composant : `@prop` pour chaque cible de `proprietes`, `@boolean` pour chaque booléen. */
  const regles = (composant: string, cibles: string[], booleens: string[] = [], icones: string[] = [], politique: 'strict' | 'modifiable' = 'modifiable') => {
    let compte = 0;
    const noeud = (id: string, nom: string, type = 'FRAME', champs: Record<string, unknown> = {}, enfants: any[] = []) => {
      const n: any = { id: `${composant}-${id}`, name: nom, type, children: enfants, parent: null, ...champs };
      for (const e of enfants) e.parent = n;
      n.findAll = (f: any = () => true) => descendants(n).filter(f);
      n.findOne = (f: any) => descendants(n).find(f) ?? null;
      n.findChildren = (f: any) => enfants.filter(f);
      return n;
    };
    const ligne = (nom: string, characters: string) => noeud(`t${compte++}`, nom, 'TEXT', { characters });
    const regle = (etiquette: string, cible = '') => noeud(`r${compte++}`, '.ruleItem', 'INSTANCE', {
      getMainComponentAsync: async () => ({ id: 'rule-main', type: 'COMPONENT', name: '.ruleItem', remote: false, parent: null }),
    }, [ligne(`@${etiquette}`, `@${etiquette}`), ligne('content', 'Description du comportement.'), ...(cible ? [ligne('prop', cible)] : [])]);
    /** `@icons` nomme l'icône que dessine un tracé ; le calque `strict` ou `modifiable` visible dit si l'icône peut s'échanger. */
    const regleDIcone = (nom: string) => noeud(`r${compte++}`, '.ruleItem', 'INSTANCE', {
      getMainComponentAsync: async () => ({ id: 'rule-main', type: 'COMPONENT', name: '.ruleItem', remote: false, parent: null }),
    }, [ligne('@icons', '@icons'), ligne('icon', nom), noeud(`t${compte++}`, 'strict', 'TEXT', { characters: 'strict', visible: politique === 'strict' }), noeud(`t${compte++}`, 'modifiable', 'TEXT', { characters: 'modifiable', visible: politique === 'modifiable' })]);
    const elements = [ligne('component-name', composant), regle('usage'), ...cibles.map((c) => regle('prop', c)), ...booleens.map((b) => regle('boolean', b)), ...icones.map(regleDIcone)];
    const conteneur = noeud('regles', '.componentRules', 'INSTANCE', {
      getMainComponentAsync: async () => ({ id: 'rules-main', type: 'COMPONENT', name: '.componentRules', remote: false, parent: null }),
    }, elements);
    conteneur.parent = page;
    page.children.push(conteneur);
  };

  /** Le jeu de composants du sujet, posé sur la page et sélectionné. */
  const finir = (jeu: any) => {
    page.children.push(jeu);
    page.selection = [jeu];
    const { port } = portDeTest(collections, variables);
    const p = a.port(port, [jeu]);
    const figma: any = {
      root: racine, currentPage: page, mixed: Symbol('mixed'), skipInvisibleInstanceChildren: false, variables: port,
      getNodeByIdAsync: p.getNodeByIdAsync, getStyleByIdAsync: p.getStyleByIdAsync,
      clientStorage: { getAsync: async () => undefined }, teamLibrary: { getAvailableLibraryVariableCollectionsAsync: async () => [] },
    };
    return { figma, jeu, page };
  };

  return { a, variable, calque, peinture, texte, icone, regles, finir, page };
}

type Atelier = ReturnType<typeof atelier>;
type Monde = ReturnType<Atelier['finir']>;

/** Un jeu de composants à poser sur la page. */
const jeuDe = (b: Atelier, nom: string, definitions: Record<string, unknown>, variants: any[]) =>
  b.calque(`jeu-${nom}`, 'COMPONENT_SET', { name: nom, key: `cle-${nom}`, defaultVariant: variants[0], componentPropertyDefinitions: definitions }, variants);

const axe = (valeurs: string[]) => ({ type: 'VARIANT', defaultValue: valeurs[0], variantOptions: valeurs });
const booleen = (defaut = true) => ({ type: 'BOOLEAN', defaultValue: defaut });

// ---------------------------------------------------------------------------------------------------------------------------
// L'analyse complète et la lecture de ses constats

async function analyser(monde: Monde): Promise<readonly Constat[]> {
  const globale = globalThis as { figma?: unknown };
  const precedent = globale.figma;
  globale.figma = monde.figma;
  const messages: PluginMessage[] = [];
  try {
    const contexte: Contexte = { figma: monde.figma as PluginAPI, envoyer: (message) => messages.push(message), surveillerLeDocument: () => [] };
    await traiterAvec(LECTEURS_DE_FIGMA)({ type: 'analyser', demande: 1 }, contexte);
  } finally {
    globale.figma = precedent;
  }
  const final = messages.find((message): message is Extract<PluginMessage, { type: 'analyse' }> => message.type === 'analyse');
  assert.ok(final, 'l’analyse rend un résultat');
  assert.equal(final.statut, 'complete', JSON.stringify(final.constats));
  return final.constats;
}

/** La cible d'un constat : le fait qui le distingue des autres du même code. */
function cibleDe(constat: Constat): string {
  const f = constat.faits;
  switch (constat.code) {
    case 'C8': case 'C10': return String(f.valeur ?? f.segment);
    case 'C45': return `${f.ecart}:${f.propriete}:${f.regle}`;
    case 'C53': return `${f.variantsExclus} variants`;
    case 'C83': return `${f.wrapper}:${f.proprietes}`;
    case 'C66': case 'C67': return String(f.calque);
    case 'C49': case 'C50': return String(f.cause ?? f.calque);
    default: return constat.id;
  }
}

type Attendu = readonly [code: string, type: string, famille: string, cible: string];
const lire = (constats: readonly Constat[]): Attendu[] => constats.map((c) => [c.code, c.type, c.famille, cibleDe(c)] as const).sort((x, y) => x.join('|').localeCompare(y.join('|')));
const trier = (attendus: readonly Attendu[]): Attendu[] => [...attendus].sort((x, y) => x.join('|').localeCompare(y.join('|')));

// ---------------------------------------------------------------------------------------------------------------------------
// Button

const COULEURS = ['Primary', 'Secondary'];
const STYLES = ['Contained', 'Outlined'];
const ETATS = ['Default', 'Hover', 'Disabled'];
const TAILLES = ['Medium', 'Large', 'Small'];

/**
 * Le Button de la recette : 12 variants (2 couleurs, 2 styles, 3 états), un wrapper `.sizeWrapperButton` non exposé à trois tailles.
 * `texteClair` donne au premier plan de `Primary Contained Hover` la couleur du fond : le label et les flèches, que le wrapper porte,
 * manquent alors de contraste, ce que seule la mesure sous l'instance peut voir (D31).
 */
function button(texteClair = false): Monde {
  const b = atelier();
  const jeton = (couleur: string, style: string, etat: string, role: string) => {
    const clair = texteClair && couleur === 'Primary' && style === 'Contained' && etat === 'Hover' && role === 'foreground';
    return b.variable(`button-${couleur}-${style}-${etat}-${role}`, 'c', `Button/Color/${couleur}/${style}/${etat}/${role}`, 'COLOR', alias(role === 'background' || clair ? 't-fond' : 't-texte'));
  };
  const mesure: Record<string, string> = {};
  for (const taille of TAILLES) {
    for (const propriete of ['padding-x', 'padding-y', 'gap', 'radius']) {
      mesure[`${taille}/${propriete}`] = b.variable(`taille-${taille}-${propriete}`, 'c', `Button/Size/${taille}/${propriete}`, 'FLOAT', alias(propriete === 'radius' ? 'l-rayon' : 'l-zero'));
    }
  }

  const style = { id: 'S:label', nom: 'Body/Medium', taille: 'md' };
  const liaisonsDeTaille = (taille: string) => ({
    itemSpacing: alias(mesure[`${taille}/gap`]), paddingLeft: alias(mesure[`${taille}/padding-x`]), paddingRight: alias(mesure[`${taille}/padding-x`]),
    paddingTop: alias(mesure[`${taille}/padding-y`]), paddingBottom: alias(mesure[`${taille}/padding-y`]), cornerRadius: alias(mesure[`${taille}/radius`]),
  });

  // Le wrapper : un jeu de trois tailles, dont chaque variant lie ses espacements. Ses booleans pilotent les icônes et le label.
  const definitionsDuWrapper = { Size: axe(TAILLES), 'Icon-Left#1261:147': booleen(), 'Icon-Right#1261:138': booleen(), 'Label#234:0': booleen() };
  const variantsDuWrapper = TAILLES.map((taille) => b.calque(`wrapper-${taille}`, 'COMPONENT', {
    name: `Size=${taille}`, key: `cle-wrapper-${taille}`, remote: false, variantProperties: { Size: taille }, layoutMode: 'HORIZONTAL', itemSpacing: 0, paddingLeft: 0, paddingRight: 0, paddingTop: 0, paddingBottom: 0, cornerRadius: 0,
    boundVariables: liaisonsDuWrapper(taille),
  }));
  function liaisonsDuWrapper(taille: string) { return liaisonsDeTaille(taille); }
  const jeuDuWrapper = b.calque('jeu-wrapper', 'COMPONENT_SET', { name: '.sizeWrapperButton', key: 'cle-wrapper', componentPropertyDefinitions: definitionsDuWrapper }, variantsDuWrapper);

  const variants: any[] = [];
  for (const couleur of COULEURS) {
    for (const styleDuBouton of STYLES) {
      for (const etat of ETATS) {
        const id = `${couleur}-${styleDuBouton}-${etat}`;
        const role = (r: string) => jeton(couleur, styleDuBouton, etat, r);
        const premierPlan = [b.peinture(role('foreground'))];
        const gauche = b.icone(`gauche-${id}`, 'arrow-left-long', premierPlan, 'l-icone', { componentPropertyReferences: { visible: 'Icon-Left#1261:147' } });
        const droite = b.icone(`droite-${id}`, 'arrow-right-long', premierPlan, 'l-icone', { componentPropertyReferences: { visible: 'Icon-Right#1261:138' } });
        const label = b.texte(`label-${id}`, 'Suivant', premierPlan, style, { componentPropertyReferences: { visible: 'Label#234:0' }, characters: 'Suivant' });
        const plein = styleDuBouton === 'Contained';
        const enveloppe = b.calque(`enveloppe-${id}`, 'INSTANCE', {
          name: '.sizeWrapperButton', variantProperties: { Size: 'Medium' }, componentProperties: { Size: { type: 'VARIANT', value: 'Medium' } }, isExposedInstance: false,
          absoluteBoundingBox: { x: 0, y: 0, width: 125, height: 44 }, width: 125, height: 44, layoutMode: 'HORIZONTAL', itemSpacing: 0, paddingLeft: 0, paddingRight: 0, paddingTop: 0, paddingBottom: 0, cornerRadius: 0,
          boundVariables: { ...liaisonsDeTaille('Medium'), strokeWeight: alias(b.variable('button-bordure', 'c', 'Button/Size/Medium/border-width', 'FLOAT', alias('l-zero'))) },
          strokeWeight: 1,
          fills: plein ? [b.peinture(role('background'), blanc)] : [],
          ...(plein ? {} : { strokes: [b.peinture(role('border'))], strokeAlign: 'INSIDE' }),
          overrides: [
            { id: `enveloppe-${id}`, overriddenFields: plein ? ['fills'] : ['strokes'] },
            { id: gauche.dessin.id, overriddenFields: ['fills'] }, { id: droite.dessin.id, overriddenFields: ['fills'] }, { id: label.id, overriddenFields: ['fills'] },
          ],
          getMainComponentAsync: async () => variantsDuWrapper[0],
        }, [gauche.instance, label, droite.instance]);
        variants.push(b.calque(`variant-${id}`, 'COMPONENT', {
          name: `Color=${couleur}, Variant=${styleDuBouton}, State=${etat}`, key: `cle-${id}`, variantProperties: { Color: couleur, Variant: styleDuBouton, State: etat },
          absoluteBoundingBox: { x: 0, y: 0, width: 125, height: 44 }, width: 125, height: 44, layoutMode: 'HORIZONTAL', itemSpacing: 0, paddingLeft: 0, paddingRight: 0, paddingTop: 0, paddingBottom: 0, cornerRadius: 0,
        }, [enveloppe]));
      }
    }
  }
  const jeu = jeuDe(b, 'Button', { Color: axe(COULEURS), Variant: axe(STYLES), State: axe(ETATS) }, variants);
  b.regles('Button', [
    ...COULEURS.map((c) => `color.${c.toLowerCase()}`), ...STYLES.map((s) => `variant.${s.toLowerCase()}`), ...ETATS.map((e) => `state.${e.toLowerCase()}`), ...TAILLES.map((t) => `size.${t.toLowerCase()}`),
  ], ['icon-left', 'icon-right', 'label'], ['arrow-left-long', 'arrow-right-long']);
  b.page.children.push(jeuDuWrapper);
  return b.finir(jeu);
}

// Les attentes de Button, écrites avant l'analyse.
//   C10 : D'après la table des tailles, `Medium`, `Large` et `Small` s'écrivent `Md`, `Lg` et `Sm` dans un token. Les tokens `Button/Size/<taille>/…` les
//         écrivent en entier : un constat corriger par taille, comme le rapport du 25 novembre.
//   C83 : D8. `.sizeWrapperButton` porte l'axe `Size` que Button n'a pas, et son instance n'est exposée dans aucun variant (`isExposedInstance` faux).
//   C53 : les 4 variants `State=Disabled` (2 couleurs x 2 styles) sortent des mesures d'accessibilité, une information.
//   C50 : les variants Outlined n'ont aucun fill. Leur contour se mesure sur le fond de la page (blanc), que le plugin ne garantit pas :
//         une information `fond-de-repli` pour les 4 variants Outlined non désactivés, un seul constat (D17).
//   Aucun C24 (D2, D3, D4) : le `Vector` des icônes, lié à `foreground`, est un tracé dans une icône.
//   Aucun C49 : le label `Suivant` et les flèches `arrow-left-long` vivent sous l'instance du wrapper ; le relevé les lit et C49 les mesure (D31),
//         noir sur blanc dans chaque état, ce qui passe. Le test suivant les fait échouer pour le montrer.
//   Aucun C42, C45 ni C19 : les règles de Button couvrent `size`, `iconLeft`, `iconRight`, `label` et `@icons` pour les deux flèches.
const ATTENDUS_DE_BUTTON: readonly Attendu[] = [
  ['C10', 'corriger', 'tailles', 'Medium'],
  ['C10', 'corriger', 'tailles', 'Large'],
  ['C10', 'corriger', 'tailles', 'Small'],
  ['C83', 'verifier', 'variants', '.sizeWrapperButton:Size'],
  ['C53', 'info', 'contraste', '4 variants'],
  ['C50', 'info', 'contraste', 'fond-de-repli'],
];

test('D15 : Button rend les constats que ses décisions attendent, et aucun C24', async () => {
  const constats = await analyser(button());
  assert.deepEqual(lire(constats), trier(ATTENDUS_DE_BUTTON));
});

test('D31 : le label et les flèches que le wrapper porte sont mesurés, et un premier plan clair sur fond clair donne C49 à corriger', async () => {
  const constats = await analyser(button(true));
  const mesures = lire(constats.filter((c) => c.code === 'C49' && !c.limite));
  assert.deepEqual(mesures, trier([['C49', 'corriger', 'contraste', 'Suivant'], ['C49', 'corriger', 'contraste', 'Vector']]));
  const label = constats.find((c) => c.code === 'C49' && c.faits.calque === 'Suivant')!;
  assert.deepEqual([label.faits.usage, label.faits.rapport, label.variants.length], ['texte', 1, 1], 'un seul variant : Primary Contained Hover');
  assert.deepEqual(lire(constats.filter((c) => c.code !== 'C49')), trier(ATTENDUS_DE_BUTTON.filter(([code]) => code !== 'C49')));
});

// ---------------------------------------------------------------------------------------------------------------------------
// Alert

const TYPES = ['Info', 'Success', 'Warning', 'Error'];
const PALETTES: Record<string, string> = { Info: 'Info', Success: 'Success', Warning: 'Warning', Error: 'Danger' };
const ICONES: Record<string, string> = { Info: 'circle-info', Success: 'circle-check', Warning: 'triangle-exclamation', Error: 'triangle-exclamation' };

/** L'Alert de la recette : 8 variants (4 types, 2 variantes), un Button documenté dans `Action`, des règles qui écrivent `severity`. */
function alert(): Monde {
  const b = atelier();
  const jeton = (palette: string, variante: string, role: string) =>
    b.variable(`alert-${palette}-${variante}-${role}`, 'c', `Alert/Color/${palette}/${variante}/${role}`, 'COLOR', alias(role === 'background' ? 't-fond' : 't-texte'));
  for (const propriete of ['gap', 'padding-x', 'padding-y', 'radius', 'border-width', 'icon-size']) {
    b.variable(`alert-${propriete}`, 'c', `Alert/Size/md/${propriete}`, 'FLOAT', alias(propriete === 'radius' ? 'l-rayon' : propriete === 'icon-size' ? 'l-icone' : 'l-zero'));
  }
  const liaisons = {
    itemSpacing: alias('alert-gap'), paddingLeft: alias('alert-padding-x'), paddingRight: alias('alert-padding-x'), paddingTop: alias('alert-padding-y'), paddingBottom: alias('alert-padding-y'), cornerRadius: alias('alert-radius'),
  };
  const style = { id: 'S:body-large', nom: 'Body/Large', taille: 'lg' };

  // Le Button documenté que l'Alert imbrique : son composant principal vit sur la même page, avec ses règles.
  b.variable('button-fond', 'c', 'Button/Color/Primary/Contained/Default/background', 'COLOR', alias('t-fond'));
  const maitreDuBouton = b.calque('maitre-button', 'COMPONENT', {
    name: 'Button', key: 'cle-button', remote: false, variantProperties: {}, componentPropertyDefinitions: {}, fills: [b.peinture('button-fond', blanc)], layoutMode: 'HORIZONTAL',
    absoluteBoundingBox: { x: 0, y: 0, width: 80, height: 40 }, width: 80, height: 40,
  });
  b.page.children.push(maitreDuBouton);
  b.regles('Button', ['color.primary']);

  const variants: any[] = [];
  for (const type of TYPES) {
    for (const variante of ['Filled', 'Outlined']) {
      const id = `${type}-${variante}`;
      const palette = PALETTES[type];
      const role = (r: string) => jeton(palette, variante, r);
      const texteDeLAlert = [b.peinture(role('foreground'))];
      const { instance: icone } = b.icone(`icone-${id}`, ICONES[type], [b.peinture(role('icon'))], 'alert-icon-size', { componentPropertyReferences: { visible: 'Icon#265:4' }, absoluteBoundingBox: { x: 16, y: 14, width: 20, height: 20 } });
      const titre = b.texte(`titre-${id}`, 'Titre', texteDeLAlert, style, { componentPropertyReferences: { visible: 'Title#265:13' }, characters: 'Titre', absoluteBoundingBox: { x: 48, y: 12, width: 120, height: 24 } });
      const description = b.texte(`description-${id}`, 'Description', texteDeLAlert, style, { characters: 'Description', absoluteBoundingBox: { x: 48, y: 36, width: 200, height: 24 } });
      const enCadre = { layoutMode: 'VERTICAL', itemSpacing: 0, paddingLeft: 0, paddingRight: 0, paddingTop: 0, paddingBottom: 0, layoutSizingHorizontal: 'HUG', layoutSizingVertical: 'HUG' };
      const zoneDeTexte = b.calque(`zone-${id}`, 'FRAME', { name: 'Text', ...enCadre, absoluteBoundingBox: { x: 48, y: 12, width: 200, height: 48 } }, [titre, description]);
      const bouton = b.calque(`bouton-${id}`, 'INSTANCE', {
        name: 'Button', variantProperties: {}, componentProperties: {}, componentPropertyReferences: { visible: 'Action#265:22' }, overrides: [], absoluteBoundingBox: { x: 280, y: 10, width: 80, height: 40 },
        width: 80, height: 40, fills: [b.peinture('button-fond', blanc)], getMainComponentAsync: async () => maitreDuBouton,
      });
      const action = b.calque(`action-${id}`, 'FRAME', { name: 'Action', ...enCadre, layoutMode: 'HORIZONTAL', absoluteBoundingBox: { x: 280, y: 10, width: 80, height: 40 } }, [bouton]);
      const remplie = variante === 'Filled';
      variants.push(b.calque(`variant-${id}`, 'COMPONENT', {
        name: `Type=${type}, Variant=${variante}`, key: `cle-${id}`, variantProperties: { Type: type, Variant: variante }, layoutMode: 'HORIZONTAL', itemSpacing: 0, paddingLeft: 0, paddingRight: 0, paddingTop: 0, paddingBottom: 0, cornerRadius: 0,
        boundVariables: remplie ? liaisons : { ...liaisons, strokeWeight: alias('alert-border-width') },
        absoluteBoundingBox: { x: 0, y: 0, width: 380, height: 72 }, width: 380, height: 72,
        fills: remplie ? [b.peinture(role('background'), blanc)] : [],
        ...(remplie ? {} : { strokes: [b.peinture(role('border'))], strokeWeight: 1, strokeAlign: 'INSIDE' }),
      }, [icone, zoneDeTexte, action]));
    }
  }
  const jeu = jeuDe(b, 'Alert', { 'Icon#265:4': booleen(), 'Title#265:13': booleen(), 'Action#265:22': booleen(), Type: axe(TYPES), Variant: axe(['Filled', 'Outlined']) }, variants);
  // Les règles décrivent la propriété `severity` et la propriété `variant`, que le composant appelle `Type` et `Variant`.
  b.regles('Alert', [...TYPES.map((t) => `severity.${t.toLowerCase()}`), 'variant.filled', 'variant.outlined'], ['icon', 'title', 'action'], ['circle-info', 'circle-check', 'triangle-exclamation'], 'strict');
  return b.finir(jeu);
}

// Les attentes d'Alert, écrites avant l'analyse.
//   C8  : D9. `Type` prend le rôle de palette, car ses valeurs sont des palettes, et la table des palettes écrit `Danger` ce que le variant écrit `Error`.
//   C45 : D13. Les règles disent `severity` pour les valeurs de `Type` : un seul constat `renommee`, ni C44 ni deux C45 `sans-règle`, `sans-propriété`.
//   Aucun C7, C13, C32, C33 (D9, D10), aucun C63 : `Type` n'est pas un second axe de style.
//   Aucun C65 (D11, D12) : `Body/Large` lie `fontFamily` à `primitives`, ce que la référence admet.
//   Aucun C24 (D2 à D4) : le `Vector` des icônes est un tracé dans une icône.
//   C66 et C67 : une icône qui n'est pas une instance de `Icon` et que `Icon#265:4` n'échange pas ; le rapport du 25 novembre les rendait déjà.
//   C50 : les 4 variants Outlined n'ont aucun fill : contour, icône, titre et description se mesurent sur le fond de la page (blanc), une
//         information `fond-de-repli` (D17).
//   Aucun C53 : Alert n'a pas d'axe d'état, donc aucun variant désactivé.
//   Aucun C19, C80 : le Button documenté garde ses tokens, et les calques d'Alert lient ses tokens à lui, pas ceux du layout.
const ATTENDUS_D_ALERT: readonly Attendu[] = [
  ['C8', 'corriger', 'variants', 'Error'],
  ['C45', 'corriger', 'regles', 'renommee:type:severity'],
  ['C66', 'verifier', 'typographie', 'circle-info'],
  ['C66', 'verifier', 'typographie', 'circle-check'],
  ['C66', 'verifier', 'typographie', 'triangle-exclamation'],
  ['C67', 'info', 'regles', 'circle-info'],
  ['C67', 'info', 'regles', 'circle-check'],
  ['C67', 'info', 'regles', 'triangle-exclamation'],
  ['C50', 'info', 'contraste', 'fond-de-repli'],
];

test('D15 : Alert rend les constats que ses décisions attendent, et aucun C24, C65 ni C84', async () => {
  const constats = await analyser(alert());
  assert.deepEqual(lire(constats), trier(ATTENDUS_D_ALERT));
});

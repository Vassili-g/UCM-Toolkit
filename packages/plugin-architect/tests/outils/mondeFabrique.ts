/**
 * Un document Figma fabriqué pour la capture : un jeu `Button` de trois variants, une instance dont le maître est distant,
 * un texte à plages et à valeur mixte, une lecture qui lève, une variable de library qu'un import rend, les règles d'usage
 * sur la page. Les nœuds sont des objets ordinaires avec des accesseurs : le monde ne passe ni par la capture ni par son
 * chargeur, et sert d'original à l'aller-retour. Avec `avecWrapper`, le variant `Repos` pose une instance d'un wrapper de
 * dimensions dont le jeu, hors de `Button`, lie ses espacements dans deux variants.
 */
import { CLE_ARCHITECTURE_DU_FICHIER, ESPACE_ARCHITECT, texteDeLArchitectureDuFichier } from '@ucm-kit/core/referentiel';

type Champs = Record<string, unknown>;
export type NoeudFabrique = Champs & { id: string; type: string; parent: NoeudFabrique | null; children?: NoeudFabrique[] };

export const MIXTE = Symbol('figma.mixed');
const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id });
const noir = { r: 0, g: 0, b: 0, a: 1 };
const boite = (x: number, y: number, width: number, height: number) => ({ x, y, width, height });

function descendants(racine: NoeudFabrique): NoeudFabrique[] {
  return (racine.children ?? []).flatMap((enfant) => [enfant, ...descendants(enfant)]);
}

/** Un nœud : les champs gardent leurs accesseurs, `parent` se pose sur chaque enfant, et un conteneur reçoit les recherches de l'API. */
export function noeud(id: string, type: string, champs: Champs = {}, enfants?: NoeudFabrique[]): NoeudFabrique {
  const brut = Object.defineProperties({ id, type, name: `Calque ${id}`, parent: null as NoeudFabrique | null }, Object.getOwnPropertyDescriptors(champs)) as NoeudFabrique;
  if (enfants) {
    brut.children = enfants;
    for (const enfant of enfants) enfant.parent = brut;
    brut.findAll = (filtre: (n: NoeudFabrique) => boolean = () => true) => descendants(brut).filter(filtre);
    brut.findOne = (filtre: (n: NoeudFabrique) => boolean) => descendants(brut).find(filtre) ?? null;
    brut.findChildren = (filtre: (n: NoeudFabrique) => boolean = () => true) => enfants.filter(filtre);
    brut.findAllWithCriteria = ({ types }: { types: string[] }) => descendants(brut).filter((n) => types.includes(n.type));
  }
  return brut;
}

/** Les plages d'un texte pour un jeu de champs : la segmentation dépend des champs demandés, comme dans Figma. */
function segmentsDuTexte(champs: string[]): Champs[] {
  const sorte = champs.some((c) => c === 'listOptions' || c === 'textStyleOverrides');
  const valeurs: Champs[] = sorte
    ? [{ start: 0, end: 7, listOptions: { type: 'NONE' }, textStyleOverrides: [] }]
    : [
      { start: 0, end: 3, fontSize: 14, fontWeight: 400, fills: [{ type: 'SOLID', color: noir, boundVariables: { color: alias('VariableID:cle-lib-v/1:1') } }], boundVariables: { fontSize: alias('taille') }, textStyleId: 'S:titre' },
      { start: 3, end: 7, fontSize: 16, fontWeight: MIXTE, fills: MIXTE, boundVariables: {}, textStyleId: 'S:titre' },
    ];
  return valeurs.map((valeur) => Object.fromEntries(['start', 'end', ...champs].map((champ) => [champ, valeur[champ]])));
}

export function fabriquerLeMonde({ avecWrapper = false }: { avecWrapper?: boolean } = {}) {
  let libraryImportee = false;

  const vecteur = noeud('vecteur', 'VECTOR', { absoluteBoundingBox: boite(0, 0, 12, 12), fills: [{ type: 'SOLID', color: noir }] });
  const maitre = noeud('maitre', 'COMPONENT', { name: 'Taille=M', key: 'cle-maitre', remote: true, variantProperties: { Taille: 'M' } }, [vecteur]);
  const jeuDIcone = noeud('jeu-icone', 'COMPONENT_SET', { name: 'Icone', key: 'cle-icone', remote: true, defaultVariant: maitre, componentPropertyDefinitions: { Taille: { type: 'VARIANT', defaultValue: 'M', variantOptions: ['M'] } } }, [maitre]);

  const interne = noeud('interne', 'RECTANGLE', { fills: [{ type: 'SOLID', color: noir, boundVariables: { color: alias('fond') } }] });
  const variant = (id: string, etat: string, champs: Champs, enfants: NoeudFabrique[]) => noeud(id, 'COMPONENT', {
    name: `Etat=${etat}`, absoluteBoundingBox: boite(0, 0, 120, 40), variantProperties: { Etat: etat }, visible: true, opacity: 1,
    layoutMode: 'HORIZONTAL', primaryAxisAlignItems: 'CENTER', counterAxisAlignItems: 'CENTER', itemSpacing: 8,
    paddingLeft: 12, paddingRight: 12, paddingTop: 8, paddingBottom: 8, cornerRadius: 4, strokeWeight: 1, strokes: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }],
    fills: [{ type: 'SOLID', color: noir, boundVariables: { color: alias('fond') } }],
    boundVariables: { paddingLeft: alias('espace'), itemSpacing: alias('espace') },
    resolvedVariableModes: { c: 'c:Valeur' }, explicitVariableModes: { c: 'c:Valeur' },
    ...champs,
  }, enfants);

  const texte = noeud('texte', 'TEXT', {
    absoluteBoundingBox: boite(12, 8, 40, 14), characters: 'Valider', fontSize: 14, textStyleId: 'S:titre', fills: MIXTE, strokes: [],
    textAlignHorizontal: 'LEFT', textCase: 'ORIGINAL', visible: true,
    get absoluteRenderBounds(): unknown { throw new Error('Rendu illisible'); },
    getStyledTextSegments: (champs: string[]) => segmentsDuTexte(champs),
  });
  const instance = noeud('instance', 'INSTANCE', {
    name: 'Icone', absoluteBoundingBox: boite(60, 8, 16, 16), visible: true,
    overrides: [{ id: 'interne', overriddenFields: ['fills'] }, { id: 'hors-arbre', overriddenFields: ['name'] }],
    componentPropertyReferences: { mainComponent: 'Icone#1:0' }, componentProperties: {},
    getMainComponentAsync: async () => maitre,
  }, [interne]);
  const masque = noeud('masque', 'FRAME', { visible: false, absoluteBoundingBox: boite(0, 0, 4, 4) }, []);
  const tailleDeWrapper = (taille: string) => noeud(`wrapper-${taille}`, 'COMPONENT', {
    name: `Size=${taille}`, key: `cle-wrapper-${taille}`, remote: false, variantProperties: { Size: taille }, visible: true, absoluteBoundingBox: boite(0, 0, 20, 20),
    boundVariables: { itemSpacing: alias('espace') },
  }, []);
  const petit = tailleDeWrapper('Small');
  const jeuDeWrapper = noeud('jeu-wrapper', 'COMPONENT_SET', {
    name: '.sizeWrapperButton', key: 'cle-jeu-wrapper', remote: false, defaultVariant: petit,
    componentPropertyDefinitions: { Size: { type: 'VARIANT', defaultValue: 'Small', variantOptions: ['Small', 'Large'] } },
  }, [petit, tailleDeWrapper('Large')]);
  const enveloppe = noeud('enveloppe', 'INSTANCE', {
    name: '.sizeWrapperButton', absoluteBoundingBox: boite(0, 0, 20, 20), visible: true,
    boundVariables: { itemSpacing: alias('espace') }, overrides: [], componentProperties: {}, componentPropertyReferences: null,
    getMainComponentAsync: async () => petit,
  }, []);
  const repos = variant('repos', 'Repos', {}, [texte, instance, masque, ...(avecWrapper ? [enveloppe] : [])]);
  const survol = variant('survol', 'Survol', { layoutMode: 'NONE' }, [
    noeud('texte-survol', 'TEXT', { absoluteBoundingBox: boite(0, 0, 10, 10), characters: 'Aide', fontSize: 12, textStyleId: '', fills: [], getStyledTextSegments: (champs: string[]) => segmentsDuTexte(champs).slice(0, 1) }),
    noeud('cadre', 'FRAME', { absoluteBoundingBox: boite(0, 0, 10, 10) }, []),
  ]);
  const inactif = variant('inactif', 'Inactif', { opacity: 0.4 }, []);
  const jeu = noeud('jeu', 'COMPONENT_SET', {
    name: 'Button', key: 'cle-jeu', defaultVariant: repos,
    componentPropertyDefinitions: {
      Etat: { type: 'VARIANT', defaultValue: 'Repos', variantOptions: ['Repos', 'Survol', 'Inactif'] },
      'Avec icone#1:2': { type: 'BOOLEAN', defaultValue: true },
    },
  }, [repos, survol, inactif]);

  const regles = noeud('regles', 'INSTANCE', { name: '.componentRules', getMainComponentAsync: async () => null }, [
    noeud('nom-wrap', 'FRAME', {}, [noeud('nom', 'TEXT', { name: 'component-name', characters: 'Button' })]),
  ]);
  const autre = noeud('autre-texte', 'TEXT', { name: 'Titre', characters: 'Page' });
  const page = noeud('page', 'PAGE', { name: 'Composants', selection: [jeu], loadAsync: async () => {}, on() {}, off() {} }, [jeu, jeuDIcone, regles, autre, ...(avecWrapper ? [jeuDeWrapper] : [])]);
  const racine = noeud('0:0', 'DOCUMENT', { name: 'Fichier fabriqué', documentColorProfile: 'SRGB' }, [page]);
  page.parent = racine;
  const horsArbre = noeud('hors-arbre', 'FRAME', {}, []);

  const collection = { id: 'c', name: 'components', key: 'cle-c', remote: false, hiddenFromPublishing: false, isExtension: false, modes: [{ modeId: 'c:Valeur', name: 'Valeur' }], defaultModeId: 'c:Valeur', variableIds: ['espace', 'fond', 'taille'] };
  const variable = (id: string, name: string, resolvedType: string, valeur: unknown) => ({
    id, name, description: '', key: `cle-${id}`, remote: false, hiddenFromPublishing: false, variableCollectionId: 'c', resolvedType, scopes: ['ALL_SCOPES'], codeSyntax: {}, valuesByMode: { 'c:Valeur': valeur },
  });
  const locales = [variable('espace', 'espace/m', 'FLOAT', 8), variable('fond', 'carte/fond', 'COLOR', { r: 1, g: 1, b: 1, a: 1 }), variable('taille', 'texte/taille', 'FLOAT', 14)];
  const variableDeLibrary = { id: 'VariableID:cle-lib-v/1:1', name: 'texte/principal', description: '', key: 'cle-lib-v', remote: true, hiddenFromPublishing: false, variableCollectionId: 'VariableCollectionId:lib/1:0', resolvedType: 'COLOR', scopes: ['ALL_SCOPES'], codeSyntax: {}, valuesByMode: { 'lib:Valeur': { r: 0, g: 0, b: 0, a: 1 } } };
  const collectionDeLibrary = { id: 'VariableCollectionId:lib/1:0', name: 'color', key: 'lib-c', remote: true, hiddenFromPublishing: false, isExtension: false, modes: [{ modeId: 'lib:Valeur', name: 'Valeur' }], defaultModeId: 'lib:Valeur', variableIds: [variableDeLibrary.id] };

  const style = { id: 'S:titre', name: 'Titre/M', type: 'TEXT', boundVariables: { fontSize: alias('taille') }, fontName: { family: 'Inter', style: 'Regular' }, textCase: 'ORIGINAL', textDecoration: 'NONE', paragraphSpacing: 0, paragraphIndent: 0 };

  const tous = new Map<string, NoeudFabrique>([jeuDIcone, regles, autre, page, horsArbre, jeu, ...descendants(jeu), ...descendants(jeuDIcone), ...descendants(regles), ...(avecWrapper ? [jeuDeWrapper, ...descendants(jeuDeWrapper)] : [])].map((n) => [n.id, n]));
  const figma = {
    mixed: MIXTE,
    fileKey: 'cle-de-fichier',
    skipInvisibleInstanceChildren: false,
    currentPage: page,
    root: Object.assign(racine, {
      getSharedPluginData: (espace: string, cle: string) => (espace === ESPACE_ARCHITECT && cle === CLE_ARCHITECTURE_DU_FICHIER ? texteDeLArchitectureDuFichier(true) : ''),
      getSharedPluginDataKeys: (espace: string) => (espace === ESPACE_ARCHITECT ? [CLE_ARCHITECTURE_DU_FICHIER] : []),
    }),
    clientStorage: { getAsync: async () => 'AAA' },
    getNodeByIdAsync: async (id: string) => tous.get(id) ?? null,
    getStyleByIdAsync: async (id: string) => (id === style.id ? style : null),
    variables: {
      getLocalVariableCollectionsAsync: async () => [collection],
      getLocalVariablesAsync: async () => locales,
      getVariableByIdAsync: async (id: string) => [...locales, ...(libraryImportee ? [variableDeLibrary] : [])].find((v) => v.id === id) ?? null,
      getVariableCollectionByIdAsync: async (id: string) => [collection, ...(libraryImportee ? [collectionDeLibrary] : [])].find((c) => c.id === id) ?? null,
      importVariableByKeyAsync: async (cle: string) => {
        if (cle !== variableDeLibrary.key) throw new Error('Clé absente de la bibliothèque');
        libraryImportee = true;
        return variableDeLibrary;
      },
    },
    teamLibrary: {
      getAvailableLibraryVariableCollectionsAsync: async () => [{ key: 'lib-c', name: 'color', libraryName: 'Lib' }],
      getVariablesInLibraryCollectionAsync: async (cle: string) => {
        if (cle !== 'lib-c') throw new Error('Collection inconnue');
        return [{ key: variableDeLibrary.key, name: variableDeLibrary.name, resolvedType: 'COLOR' }];
      },
    },
  };
  return { figma, jeu, repos, texte, instance, page, jeuDeWrapper: avecWrapper ? jeuDeWrapper : null };
}

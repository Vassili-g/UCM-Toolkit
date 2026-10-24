import assert from 'node:assert/strict';
import test from 'node:test';
import { preparerLesTokens, type CatalogueDeReference, type LayerLu, type ReleveDeComposant } from '../src/controles/index.js';

type EntreeDeVariable = { nom: string; collection: 'theme' | 'layout' | 'components'; type?: 'COLOR' | 'FLOAT'; valeur?: number; alias?: string };

function catalogue(...variables: EntreeDeVariable[]): CatalogueDeReference {
  return {
    version: 1, library: null,
    collections: (['theme', 'layout', 'components'] as const).map((role) => ({
      cle: role, nom: role, role, modes: role === 'components' ? [{ id: 'l', nom: 'Light' }, { id: 'd', nom: 'Dark' }] : [], etat: 'lue' as const,
    })),
    variables: variables.map(({ nom, collection, type, valeur, alias }, rang): CatalogueDeReference['variables'][number] => ({
      cle: `v${rang}`, nom, collection, type: type ?? (collection === 'layout' ? 'FLOAT' : 'COLOR'), etat: 'presente',
      ...(valeur !== undefined ? { valeurs: { m: { valeur } } } : {}),
      ...(alias ? { valeurs: { l: { alias }, d: { alias } } } : {}),
    })),
  };
}

const themeDuStatut = (statut: string, ...intensites: string[]): EntreeDeVariable[] => intensites.flatMap((intensite) =>
  ['surface/default', 'surface/foreground', 'surface/border', 'solid/default'].map((fin) => ({ nom: `theme/${statut}/${intensite}/${fin}`, collection: 'theme' as const })));
const sizing = (...valeurs: [string, number][]): EntreeDeVariable[] => valeurs.map(([nom, valeur]) => ({ nom: `layout/sizing/${nom}`, collection: 'layout', valeur }));

const rouge = { r: 1, g: 0, b: 0, a: 1 };
function layer(id: string, nom: string, type: string, extras: Partial<LayerLu> = {}): LayerLu {
  return {
    id, nom, type, parent: null, visible: true, opacite: 1, dimensions: { x: 0, y: 0, largeur: 100, hauteur: 40 },
    peintures: [], liaisons: [], valeursEnDur: [], ...extras,
  };
}
const fond = (): LayerLu['peintures'] => [{ champ: 'fills', indice: 0, type: 'SOLID', visible: true, opacite: 1, blendMode: 'NORMAL', couleur: rouge }];
const plage = (): NonNullable<LayerLu['texte']> => ({ style: null, plages: [{ debut: 0, fin: 3, fontSize: 14, fontWeight: 400, peintures: fond(), liaisons: [] }] });

function alert(options: { nomDuFond?: string; rayon?: number; palettes?: string[] } = {}): ReleveDeComposant {
  const palettes = options.palettes ?? ['danger'];
  return {
    version: 1, jeu: { cle: 'a', id: 'a', nom: 'Alert' },
    proprietes: [
      { nom: 'Palette', type: 'VARIANT', valeurs: palettes, defaut: palettes[0] },
      { nom: 'Style', type: 'VARIANT', valeurs: ['soft'], defaut: 'soft' },
    ],
    variants: palettes.map((palette) => ({
      id: palette, nom: palette, valeurs: { Palette: palette, Style: 'soft' }, modesEffectifs: {},
      layers: [
        layer(`${palette}:f`, options.nomDuFond ?? 'container', 'FRAME', {
          peintures: fond(),
          valeursEnDur: [{ champ: 'paddingLeft', valeur: 8 }, { champ: 'paddingRight', valeur: 8 }, ...(options.rayon ? [{ champ: 'cornerRadius', valeur: options.rayon }] : []), { champ: 'width', valeur: 100 }],
        }),
        layer(`${palette}:t`, 'label', 'TEXT', { parent: `${palette}:f`, texte: plage() }),
      ],
    })),
    lecture: { layersLus: 0, layersNonLus: 0, variantsNonLus: [], manquees: [] }, espaceDeCouleur: 'srgb',
  };
}

const reponses = { 'dossier:soft': 'surface' };
const theme = (...intensites: string[]) => themeDuStatut('danger', ...intensites);
const complet = (...intensites: string[]) => [...theme(...intensites), ...sizing(['2', 8])];

test('Alert rend ses variables de couleur et de taille une fois le dossier répondu', () => {
  const resultat = preparerLesTokens(alert(), catalogue(...theme('soft'), ...sizing(['2', 8], ['4', 16])), reponses);
  assert.deepEqual(resultat.questions, []);
  assert.deepEqual(resultat.variables.map(({ nom, type, vise, statut, attend }) => [nom, type, vise?.nom, statut, attend]), [
    ['components/alert/color/danger/soft/background', 'COLOR', 'theme/danger/soft/surface/default', 'a-creer', []],
    ['components/alert/color/danger/soft/foreground', 'COLOR', 'theme/danger/soft/surface/foreground', 'a-creer', []],
    ['components/alert/size/padding-x', 'FLOAT', 'layout/sizing/2', 'a-creer', []],
  ]);
  assert.deepEqual(resultat.variables[0].vise?.crans, { light: 100, dark: 300 });
});

test('sans réponse, le dossier est une question sans candidat coché et la variable attend', () => {
  const resultat = preparerLesTokens(alert(), catalogue(...complet('soft')));
  assert.deepEqual(resultat.questions.map(({ id, candidats }) => [id, candidats.map(({ nom }) => nom)]), [['dossier:soft', ['solid', 'surface', 'page']]]);
  assert.deepEqual(resultat.variables.filter(({ type }) => type === 'COLOR').map(({ vise, attend }) => [vise, attend]), [[null, ['dossier:soft']], [null, ['dossier:soft']]]);
});

test('un layer Frame 12 rend une question de nom, puis le nom devient un segment', () => {
  const ouvert = preparerLesTokens(alert({ nomDuFond: 'Frame 12' }), catalogue(...complet('soft')), reponses);
  assert.deepEqual(ouvert.questions.map(({ id }) => id), ['nom:Frame 12']);
  const repondu = preparerLesTokens(alert({ nomDuFond: 'Frame 12' }), catalogue(...complet('soft')), { ...reponses, 'nom:Frame 12': 'badge' });
  assert.deepEqual(repondu.questions, []);
  assert.equal(repondu.variables[0].nom, 'components/alert/color/badge/danger/soft/background');
});

test('des layers homonymes du même rôle gardent une question par layer, y compris entre variants ambigus', () => {
  const composant = alert({ palettes: ['danger', 'success'] });
  const [danger, success] = composant.variants;
  danger.layers.push(
    layer('danger:badge-1', 'badge', 'FRAME', { peintures: fond() }),
    layer('danger:badge-2', 'badge', 'FRAME', { peintures: fond() }),
  );
  success.layers.push(layer('success:badge', 'badge', 'FRAME', { peintures: fond() }));
  const entreesTheme = [...theme('soft'), ...themeDuStatut('success', 'soft')];
  const ouverts = preparerLesTokens(composant, catalogue(...entreesTheme, ...sizing(['2', 8])), reponses);
  const questions = ouverts.questions.filter(({ id }) => id.startsWith('nom:badge:'));
  assert.equal(questions.length, 3);
  assert.equal(new Set(questions.map(({ id }) => id)).size, 3);
  assert.deepEqual(questions.map(({ id }) => id).sort(), [
    'nom:badge:danger:danger:badge-1', 'nom:badge:danger:danger:badge-2', 'nom:badge:success:success:badge',
  ]);

  const reponsesDistinctes = Object.fromEntries(questions.map(({ id }, rang) => [id, ['badge-one', 'badge-two', 'badge-three'][rang]]));
  const repondu = preparerLesTokens(composant, catalogue(...entreesTheme, ...sizing(['2', 8])), { ...reponses, ...reponsesDistinctes });
  for (const [layerId, nom] of [['danger:badge-1', 'badge-one'], ['danger:badge-2', 'badge-two'], ['success:badge', 'badge-three']]) {
    const variable = repondu.variables.find(({ concerne }) => concerne.some((lieu) => lieu.layer === layerId));
    assert.ok(variable?.nom.includes(`/${nom}/`), `${layerId} doit recevoir ${nom}`);
  }
});

test('un seul layer homonyme par variant garde la question de nom partagée historique', () => {
  const composant = alert({ palettes: ['danger', 'success'] });
  composant.variants.forEach((variant) => { variant.layers[0].nom = 'Frame 12'; });
  const resultat = preparerLesTokens(composant, catalogue(...theme('soft'), ...themeDuStatut('success', 'soft'), ...sizing(['2', 8])), reponses);
  assert.deepEqual(resultat.questions.filter(({ id }) => id.startsWith('nom:')).map(({ id }) => id), ['nom:Frame 12']);
  const repondu = preparerLesTokens(composant, catalogue(...theme('soft'), ...themeDuStatut('success', 'soft'), ...sizing(['2', 8])), { ...reponses, 'nom:Frame 12': 'badge' });
  assert.deepEqual(repondu.variables.filter(({ nom, concerne }) => nom.includes('/color/') && concerne.some(({ layer }) => layer === 'danger:f' || layer === 'success:f'))
    .map(({ nom }) => nom).sort(), [
    'components/alert/color/badge/danger/soft/background',
    'components/alert/color/badge/success/soft/background',
  ]);
});

test('une taille se lie seulement si un seul token de sizing a la valeur', () => {
  const avec = (jetons: EntreeDeVariable[]) => preparerLesTokens(alert(), catalogue(...theme('soft'), ...jetons), reponses);
  assert.equal(avec(sizing(['2', 8])).variables[2].vise?.nom, 'layout/sizing/2');
  const deux = avec(sizing(['2', 8], ['huit', 8]));
  assert.equal(deux.variables[2].vise, null);
  assert.deepEqual(deux.questions.map(({ id, candidats }) => [id, candidats.length]), [['cible:components/alert/size/padding-x', 2]]);
  const aucun = avec(sizing(['4', 16]));
  assert.deepEqual(aucun.questions, []);
  assert.deepEqual(aucun.variables.filter(({ type }) => type === 'FLOAT'), []);
});

const rayons = (...jetons: [string, number][]): EntreeDeVariable[] => jetons.map(([nom, valeur]) => ({ nom: `layout/radius/${nom}`, collection: 'layout', valeur }));

test('une taille sans token exact reste en dur : ni variable, ni question, et la préparation reste possible', () => {
  const resultat = preparerLesTokens(alert({ rayon: 13 }), catalogue(...complet('soft'), ...rayons(['14', 14])), reponses);
  assert.deepEqual(resultat.questions, []);
  assert.deepEqual(resultat.sansCible?.map(({ nom, champ, famille, valeur }) => [nom, champ, famille, valeur]), [['components/alert/size/radius', 'cornerRadius', 'radius', 13]]);
  assert.ok(resultat.variables.every(({ vise, attend }) => vise !== null && attend.length === 0));
  assert.ok(!resultat.variables.some(({ nom }) => nom.endsWith('/radius')));
});

test('des lieux de mesures différentes sous un même nom ne partagent pas une variable', () => {
  const composant = alert({ palettes: ['danger', 'success'] });
  const rayonDe = (palette: string, valeur: number) => composant.variants.find(({ id }) => id === palette)!.layers[0].valeursEnDur.push({ champ: 'cornerRadius', valeur });
  rayonDe('danger', 12); rayonDe('success', 13);
  const themes = [...themeDuStatut('danger', 'soft'), ...themeDuStatut('success', 'soft'), ...sizing(['2', 8])];
  const un = preparerLesTokens(composant, catalogue(...themes, ...rayons(['12', 12])), reponses);
  const rayon = un.variables.find(({ nom }) => nom === 'components/alert/size/radius');
  assert.deepEqual(rayon?.concerne.map(({ variant }) => variant), ['danger']);
  assert.equal(rayon?.vise?.nom, 'layout/radius/12');
  assert.deepEqual(un.sansCible?.map(({ lieu, valeur }) => [lieu.variant, valeur]), [['success', 13]]);
  assert.deepEqual(un.questions, []);
  const deux = preparerLesTokens(composant, catalogue(...themes, ...rayons(['12', 12], ['13', 13])), reponses);
  assert.ok(!deux.variables.some(({ nom }) => nom === 'components/alert/size/radius'));
  assert.deepEqual(deux.sansCible?.map(({ valeur }) => valeur), [12, 13]);
});

test('une réponse libre à une question cible ne pose aucune cible', () => {
  const taille = 'components/alert/size/padding-x';
  const libreTaille = preparerLesTokens(alert(), catalogue(...theme('soft'), ...sizing(['4', 16])), { ...reponses, [`cible:${taille}`]: 'layout/sizing/4' });
  assert.deepEqual(libreTaille.variables.filter(({ type }) => type === 'FLOAT'), []);
  const jetons = catalogue(...theme('soft'), ...sizing(['2', 8], ['huit', 8]));
  const choisie = preparerLesTokens(alert(), jetons, { ...reponses, [`cible:${taille}`]: 'layout/sizing/huit' });
  assert.equal(choisie.variables.find((variable) => variable.nom === taille)?.vise?.nom, 'layout/sizing/huit');
});

test('un token qui vaut la taille par alias est reconnu', () => {
  const jetons: EntreeDeVariable[] = [{ nom: 'dimension/8', collection: 'layout', valeur: 8 }, { nom: 'layout/sizing/2', collection: 'layout', type: 'FLOAT', alias: 'dimension/8' }];
  const resultat = preparerLesTokens(alert(), catalogue(...theme('soft'), ...jetons), reponses);
  assert.equal(resultat.variables[2].vise?.nom, 'layout/sizing/2');
});

test('l’intensité est exacte avec seulement soft, une seule question avec les deux', () => {
  const seulementVivid = preparerLesTokens(alert(), catalogue(...complet('vivid')), reponses);
  assert.equal(seulementVivid.variables[0].vise?.nom, 'theme/danger/vivid/surface/default');
  const deux = preparerLesTokens(alert({ palettes: ['danger', 'success'] }), catalogue(...complet('soft', 'vivid'), ...themeDuStatut('success', 'soft', 'vivid')), reponses);
  assert.deepEqual(deux.questions.map(({ id }) => id), ['intensite']);
  assert.ok(deux.variables.filter(({ type }) => type === 'COLOR').every(({ vise, attend }) => vise === null && attend.includes('intensite')));
  const repondu = preparerLesTokens(alert(), catalogue(...complet('soft', 'vivid')), { ...reponses, intensite: 'vivid' });
  assert.equal(repondu.variables[0].vise?.nom, 'theme/danger/vivid/surface/default');
});

test('une variable existante n’est réutilisée que si son alias égale le choix', () => {
  const nom = 'components/alert/color/danger/soft/background';
  const existante = (alias: string): EntreeDeVariable => ({ nom, collection: 'components', alias });
  const memeChoix = preparerLesTokens(alert(), catalogue(...complet('soft'), existante('theme/danger/soft/surface/default')), reponses);
  assert.deepEqual([memeChoix.variables[0].statut, memeChoix.questions], ['existe', []]);
  const divergente = preparerLesTokens(alert(), catalogue(...complet('soft'), existante('theme/danger/soft/solid/default')), reponses);
  assert.deepEqual(divergente.questions.map(({ id }) => id), [`existante:${nom}`]);
  assert.equal(divergente.variables[0].statut, 'a-creer');
  assert.deepEqual(divergente.variables[0].attend, [`existante:${nom}`]);
  const remplacee = preparerLesTokens(alert(), catalogue(...complet('soft'), existante('theme/danger/soft/solid/default')), { ...reponses, [`existante:${nom}`]: 'remplacer' });
  assert.equal(remplacee.variables[0].statut, 'a-remplacer');
});

test('une cible absente du catalogue laisse la couleur en dur, sans question', () => {
  const resultat = preparerLesTokens(alert(), catalogue(...complet('soft')), { 'dossier:soft': 'page' });
  assert.deepEqual(resultat.questions, []);
  assert.deepEqual(resultat.couleursSansCible?.map(({ nom }) => nom), ['components/alert/color/danger/soft/background', 'components/alert/color/danger/soft/foreground']);
  assert.equal(resultat.variables.some(({ type }) => type === 'COLOR'), false);
});

test('un état désactivé vise theme/disabled', () => {
  const composant = alert();
  composant.proprietes.push({ nom: 'State', type: 'VARIANT', valeurs: ['disabled'], defaut: 'disabled' });
  composant.variants.forEach((variant) => { variant.valeurs.State = 'disabled'; });
  const resultat = preparerLesTokens(composant, catalogue(...theme('soft'), { nom: 'theme/disabled/background', collection: 'theme' }, { nom: 'theme/disabled/foreground', collection: 'theme' }), reponses);
  assert.deepEqual(resultat.variables.filter(({ type }) => type === 'COLOR').map(({ nom, vise }) => [nom, vise?.nom]), [
    ['components/alert/color/danger/soft/disabled/background', 'theme/disabled/background'],
    ['components/alert/color/danger/soft/disabled/foreground', 'theme/disabled/foreground'],
  ]);
});

const sansFond = () => catalogue(...theme('soft').filter(({ nom }) => !nom.endsWith('surface/default')), ...sizing(['2', 8]));

test('une couleur dont aucun token du thème est la cible reste en dur : ni variable, ni question', () => {
  const fond = 'components/alert/color/danger/soft/background';
  const resultat = preparerLesTokens(alert(), sansFond(), reponses);
  assert.deepEqual(resultat.questions, []);
  assert.deepEqual(resultat.couleursSansCible?.map(({ nom, champ, hexa, lieu }) => [nom, champ, hexa, lieu.layer]), [[fond, 'fills', '#FF0000', 'danger:f']]);
  assert.ok(!resultat.variables.some(({ nom }) => nom === fond));
  assert.ok(resultat.variables.every(({ vise, attend }) => vise !== null && attend.length === 0));
});

test('une préparation où ne restent que des valeurs en dur n’a plus de question', () => {
  const resultat = preparerLesTokens(alert({ rayon: 13 }), catalogue(...theme('soft').filter(({ nom }) => !nom.endsWith('surface/default')), ...sizing(['2', 8]), ...rayons(['14', 14])), reponses);
  assert.deepEqual(resultat.questions, []);
  assert.equal(resultat.couleursSansCible?.length, 1);
  assert.equal(resultat.sansCible?.length, 1);
});

test('une question de nom sans candidat se résout par un texte libre', () => {
  const composant = alert({ nomDuFond: 'Frame 12' });
  const ouvert = preparerLesTokens(composant, catalogue(...complet('soft')), reponses);
  assert.deepEqual(ouvert.questions.map(({ id, candidats }) => [id, candidats.length]), [['nom:Frame 12', 0]]);
  const repondu = preparerLesTokens(composant, catalogue(...complet('soft')), { ...reponses, 'nom:Frame 12': 'carte' });
  assert.deepEqual(repondu.questions, []);
  assert.ok(repondu.variables.some(({ nom }) => nom === 'components/alert/color/carte/danger/soft/background'));
});

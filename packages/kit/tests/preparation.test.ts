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

test('une taille se lie seulement si un seul token de sizing a la valeur', () => {
  const avec = (jetons: EntreeDeVariable[]) => preparerLesTokens(alert(), catalogue(...theme('soft'), ...jetons), reponses);
  assert.equal(avec(sizing(['2', 8])).variables[2].vise?.nom, 'layout/sizing/2');
  const deux = avec(sizing(['2', 8], ['huit', 8]));
  assert.equal(deux.variables[2].vise, null);
  assert.deepEqual(deux.questions.map(({ id, candidats }) => [id, candidats.length]), [['cible:components/alert/size/padding-x', 2]]);
  const aucun = avec(sizing(['4', 16]));
  assert.deepEqual(aucun.questions.map(({ id, candidats }) => [id, candidats.length]), [['cible:components/alert/size/padding-x', 0]]);
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

test('une cible absente du catalogue devient une question', () => {
  const resultat = preparerLesTokens(alert(), catalogue(...complet('soft')), { 'dossier:soft': 'page' });
  assert.deepEqual(resultat.questions.map(({ id }) => id), ['cible:components/alert/color/danger/soft/background', 'cible:components/alert/color/danger/soft/foreground']);
  assert.equal(resultat.variables[1].vise, null);
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

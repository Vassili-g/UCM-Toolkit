/**
 * Les segments d'un calque texte (`getStyledTextSegments`) que le relevé d'Architect lit pour ses liaisons de plage et
 * pour ses plages de texte. Chaque cas fixe ce que le relevé en tire : liaisons, plages, style, manquées, et le nombre
 * d'appels natifs. Le double de Figma découpe le texte comme Figma : une plage se coupe dès qu'un des champs demandés
 * change. Les attendus de sortie sont ceux du relevé avant l'union des champs ; seul le nombre d'appels change, de deux
 * à un.
 *
 * Le moteur a le sien dans `plugin-exporter/tests/segmentsDuMoteur.test.ts`.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { lireLeReleve } from '../src/releveDuComposant';
import { atelierDeCalques, collectionFigma, portDeTest, variableFigma } from './figmaDeTest';

const boite = { x: 0, y: 0, width: 10, height: 10 };
const noir = { r: 0, g: 0, b: 0, a: 1 };
const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id });
const solide = (extra: Record<string, unknown> = {}) => ({ type: 'SOLID', color: noir, ...extra });
const MIXTE_FIGMA = Symbol('figma.mixed');

/** Les attributs d'un caractère, tels que Figma les rend pour un des champs demandés. */
interface Plage {
  start: number;
  end: number;
  fontSize: number;
  fontWeight: number;
  fills: unknown[];
  boundVariables: Record<string, unknown>;
  textStyleId: string;
}

const plage = (start: number, end: number, extra: Partial<Plage> = {}): Plage => ({
  start, end, fontSize: 14, fontWeight: 400, fills: [solide()], boundVariables: {}, textStyleId: '', ...extra,
});

const memes = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

/**
 * `getStyledTextSegments` de Figma sur un texte dont `fines` donne les plages les plus fines : une plage se coupe dès
 * qu'un des champs demandés change, et les plages voisines qui s'accordent sur ces champs se rejoignent.
 */
function figmaDecoupe(fines: readonly Plage[], appels: string[]) {
  return (champs: string[]) => {
    appels.push(champs.join(','));
    const sortie: Array<Record<string, unknown> & { start: number; end: number }> = [];
    for (const fine of fines) {
      const demandes = Object.fromEntries(champs.map((champ) => [champ, (fine as unknown as Record<string, unknown>)[champ]]));
      const derniere = sortie[sortie.length - 1];
      if (derniere && derniere.end === fine.start && champs.every((champ) => memes(derniere[champ], demandes[champ]))) derniere.end = fine.end;
      else sortie.push({ start: fine.start, end: fine.end, ...structuredClone(demandes) });
    }
    return sortie;
  };
}

interface Cas {
  nom: string;
  /** Les plages les plus fines du texte ; `undefined` : le calque n'a pas `getStyledTextSegments`. */
  fines?: Plage[];
  /** `getStyledTextSegments` lève avec ce message. */
  leve?: string;
  /** Le `textStyleId` du calque ; `MIXTE_FIGMA` quand le texte porte plusieurs styles. */
  style?: string | symbol;
}

const cas: Cas[] = [
  { nom: 'texte uniforme', fines: [plage(0, 5)], style: 'S:1' },
  {
    nom: 'plages égales sur les liaisons, différentes par la taille',
    fines: [14, 16, 18].map((fontSize, rang) => plage(rang * 3, rang * 3 + 3, { fontSize, fills: [solide({ boundVariables: { color: alias('fond') } })] })),
    style: '',
  },
  {
    nom: 'plages liées à des variables différentes',
    fines: [plage(0, 3, { boundVariables: { fontSize: alias('taille') } }), plage(3, 6, { boundVariables: {} }), plage(6, 9, { boundVariables: { fontSize: alias('taille') } })],
    style: '',
  },
  {
    nom: 'fills liés à des variables différentes, voisines égales par ailleurs',
    fines: [
      plage(0, 3, { fills: [solide({ boundVariables: { color: alias('fond') } })] }),
      plage(3, 6, { fills: [solide({ boundVariables: { color: alias('fond') } })], fontWeight: 700 }),
      plage(6, 9, { fills: [solide({ boundVariables: { color: alias('autre') } })] }),
    ],
    style: '',
  },
  {
    nom: 'texte mixte, style sur une partie',
    fines: [plage(0, 4, { textStyleId: 'S:1' }), plage(4, 8, { textStyleId: '' }), plage(8, 12, { textStyleId: 'S:1' })],
    style: MIXTE_FIGMA,
  },
  {
    nom: 'dégradés qui ne diffèrent que par leur transformation',
    fines: [
      plage(0, 3, { fills: [{ type: 'GRADIENT_LINEAR', gradientTransform: [[1, 0, 0], [0, 1, 0]], gradientStops: [{ position: 0, color: noir, boundVariables: { color: alias('fond') } }] }] }),
      plage(3, 6, { fills: [{ type: 'GRADIENT_LINEAR', gradientTransform: [[0, 1, 0], [1, 0, 0]], gradientStops: [{ position: 0, color: noir, boundVariables: { color: alias('fond') } }] }] }),
    ],
    style: '',
  },
  { nom: 'texte vide', fines: [], style: '' },
  { nom: 'getStyledTextSegments absent', style: '' },
  { nom: 'getStyledTextSegments lève', leve: 'police non chargée', style: '' },
];

const variables = () => portDeTest(
  [collectionFigma('c', 'Composants', ['Valeur'], ['fond', 'taille', 'autre'])],
  ['fond', 'taille', 'autre'].map((id) => variableFigma(id, 'c', `couleur/${id}`, 'COLOR', { 'c:Valeur': noir })),
).port;

/** Ce que le relevé tire du calque texte `n`, avec les champs que chaque appel natif a demandés. */
async function leReleve(c: Cas) {
  const appels: string[] = [];
  const a = atelierDeCalques();
  a.styleDeTexte('S:1', 'Label/Medium', {});
  const champs: Record<string, unknown> = { absoluteBoundingBox: boite, fills: [solide()], textStyleId: c.style };
  if (c.fines) champs.getStyledTextSegments = figmaDecoupe(c.fines, appels);
  if (c.leve) champs.getStyledTextSegments = (demandes: string[]) => { appels.push(demandes.join(',')); throw new Error(c.leve); };
  const noeud = a.calque('n', 'TEXT', champs);
  const racine = a.calque('r', 'COMPONENT', { absoluteBoundingBox: boite }, [noeud]);
  const issue = await lireLeReleve(a.port(variables()), racine);
  if (issue.statut !== 'lu') return { echec: issue.statut, appels };
  const layer = issue.releve.variants[0].layers.find((candidat) => candidat.id === 'n');
  return {
    liaisons: layer?.liaisons.map((l) => `${l.champ}${l.indice ?? ''}${l.plage ? `[${l.plage.debut}-${l.plage.fin}]` : ''}=${l.variable.nom}`),
    style: layer?.texte?.style,
    plages: layer?.texte?.plages.map((p) => `${p.debut}-${p.fin}:${p.fontSize}:${p.fontWeight}:${p.peintures.map((peinture) => peinture.type).join('+')}:${p.liaisons.map((l) => l.variable.nom).join('+')}`),
    manquees: issue.releve.lecture.manquees.map((m) => `${m.layer}.${m.champ}:${m.motif}`),
    appels,
  };
}

type Sortie = Awaited<ReturnType<typeof leReleve>>;
const enJson = (valeur: unknown): unknown => JSON.parse(JSON.stringify(valeur));

/** La sortie du relevé d'avant l'union des champs, et ses deux appels : liaisons, puis plages. */
const attendus = new Map<string, Omit<Sortie, 'appels'>>([
  ['texte uniforme', {"liaisons": [], "style": "Label/Medium", "plages": ["0-5:14:400:SOLID:"], "manquees": []}],
  ['plages égales sur les liaisons, différentes par la taille', {"liaisons": ["fills0[0-9]=couleur/fond"], "style": null, "plages": ["0-3:14:400:SOLID:", "3-6:16:400:SOLID:", "6-9:18:400:SOLID:"], "manquees": []}],
  ['plages liées à des variables différentes', {"liaisons": ["fontSize[0-3]=couleur/taille", "fontSize[6-9]=couleur/taille"], "style": null, "plages": ["0-3:14:400:SOLID:couleur/taille", "3-6:14:400:SOLID:", "6-9:14:400:SOLID:couleur/taille"], "manquees": []}],
  ['fills liés à des variables différentes, voisines égales par ailleurs', {"liaisons": ["fills0[0-6]=couleur/fond", "fills0[6-9]=couleur/autre"], "style": null, "plages": ["0-3:14:400:SOLID:", "3-6:14:700:SOLID:", "6-9:14:400:SOLID:couleur/autre"], "manquees": []}],
  ['texte mixte, style sur une partie', {"liaisons": [], "style": null, "plages": ["0-4:14:400:SOLID:", "4-8:14:400:SOLID:", "8-12:14:400:SOLID:"], "manquees": []}],
  ['dégradés qui ne diffèrent que par leur transformation', {"liaisons": ["fills.gradientStops[0].color0[0-3]=couleur/fond", "fills.gradientStops[0].color0[3-6]=couleur/fond"], "style": null, "plages": ["0-3:14:400:GRADIENT_LINEAR:couleur/fond", "3-6:14:400:GRADIENT_LINEAR:couleur/fond"], "manquees": []}],
  ['texte vide', {"liaisons": [], "style": null, "plages": [], "manquees": []}],
  ['getStyledTextSegments absent', {"liaisons": [], "style": null, "plages": [], "manquees": []}],
  ['getStyledTextSegments lève', {"liaisons": [], "style": null, "plages": [], "manquees": ["n.liaisons:police non chargée", "n.texte:police non chargée"]}],
]);

const ALL = 'fontSize,fontWeight,fills,boundVariables,textStyleId';

for (const c of cas) {
  test(`le relevé tire ses liaisons et ses plages d'un seul appel natif : ${c.nom}`, async () => {
    const { appels, ...sortie } = await leReleve(c);
    if (process.env.DUMP_SEGMENTS) console.log(JSON.stringify([c.nom, enJson(sortie), appels]));
    assert.deepEqual(enJson(sortie), attendus.get(c.nom));
    assert.deepEqual(appels, c.fines || c.leve ? [ALL] : []);
  });
}

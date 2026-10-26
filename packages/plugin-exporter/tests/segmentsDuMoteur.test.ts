/**
 * Les segments d'un calque texte que le moteur lit pour ses avertissements : les listes (`listOptions`, propriétés non
 * portées) et les surcharges de style (`textStyleOverrides`, typographie). Chaque cas fixe les avertissements des deux
 * lecteurs et le nombre d'appels natifs, dans et hors d'une portée d'analyse. Le double de Figma découpe le texte comme
 * Figma : une plage se coupe dès qu'un des champs demandés change. Les attendus d'avertissements sont ceux du moteur
 * avant l'union des champs ; seul le nombre d'appels change, de deux à un dans une portée.
 *
 * Le relevé d'Architect a le sien dans `plugin-architect/tests/segmentsDesLecteurs.test.ts`.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { extractVariantTypography } from 'ucm-plugin-socle/src/composant/contract/extractVariantTypography';
import { findLayoutNode } from 'ucm-plugin-socle/src/composant/contract/layoutNodes';
import { phraseDe } from 'ucm-plugin-socle/src/composant/contract/localisation';
import { dansUnePorteeDAnalyse } from 'ucm-plugin-socle/src/composant/contract/porteeDAnalyse';
import { unsupportedPropertyWarnings } from 'ucm-plugin-socle/src/composant/contract/unsupportedProperties';

interface Plage {
  start: number;
  end: number;
  listOptions: unknown;
  textStyleOverrides: unknown[];
}

const plage = (start: number, end: number, type: string, surcharges: string[] = []): Plage => ({
  start, end, listOptions: { type }, textStyleOverrides: surcharges.map((surcharge) => ({ type: surcharge })),
});

const memes = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

/** `getStyledTextSegments` de Figma sur un texte dont `fines` donne les plages les plus fines. */
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
  fines?: Plage[];
  leve?: string;
}

const cas: Cas[] = [
  { nom: 'texte uniforme', fines: [plage(0, 5, 'NONE')] },
  { nom: 'puces sur une partie, sans surcharge', fines: [plage(0, 3, 'NONE'), plage(3, 6, 'UNORDERED'), plage(6, 9, 'NONE')] },
  { nom: 'listes égales, surcharges différentes', fines: [plage(0, 3, 'NONE', ['SEMANTIC_ITALIC']), plage(3, 6, 'NONE', ['SEMANTIC_WEIGHT']), plage(6, 9, 'NONE')] },
  { nom: 'liste numérotée et surcharge sur des plages voisines', fines: [plage(0, 2, 'ORDERED', ['SEMANTIC_ITALIC']), plage(2, 4, 'ORDERED', ['SEMANTIC_ITALIC']), plage(4, 6, 'UNORDERED', ['SEMANTIC_WEIGHT'])] },
  { nom: 'texte vide', fines: [] },
  { nom: 'getStyledTextSegments absent' },
  { nom: 'getStyledTextSegments lève', leve: 'police non chargée' },
];

const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id }) as VariableAlias;
const resolver = { resolve: async (candidat: VariableAlias | null | undefined) => (candidat ? `typography.${candidat.id}` : null) };
const styleDeTexte = async () => ({ type: 'TEXT', name: 'Overline', boundVariables: { fontSize: alias('size') } } as unknown as BaseStyle);

function monter(c: Cas, appels: string[]) {
  const champs: Record<string, unknown> = { characters: 'Texte', textStyleId: 'overline', fills: [], strokes: [], effects: [] };
  if (c.fines) champs.getStyledTextSegments = figmaDecoupe(c.fines, appels);
  if (c.leve) champs.getStyledTextSegments = (demandes: string[]) => { appels.push(demandes.join(',')); throw new Error(c.leve); };
  const texte: any = { type: 'TEXT', id: 'label', name: 'Label', children: [], boundVariables: {}, findAll: () => [], ...champs };
  const composant: any = { type: 'COMPONENT', id: 'default', name: 'State=default', children: [texte], boundVariables: {}, layoutMode: 'HORIZONTAL' };
  texte.parent = composant;
  composant.findAll = (filtre: (candidat: any) => boolean) => [texte].filter(filtre);
  return { texte: texte as SceneNode, composant: composant as ComponentNode };
}

/** Ce que les deux lecteurs du moteur tirent du texte : propriétés non portées, puis surcharges de style. */
async function leMoteur(c: Cas, dansUnePortee: boolean) {
  const appels: string[] = [];
  const { texte, composant } = monter(c, appels);
  const lire = async () => {
    const nonPortees = unsupportedPropertyWarnings(texte).map(phraseDe).map((phrase) => phrase.slice(0, 40));
    const avertissements: string[] = [];
    await extractVariantTypography(
      { axes: ['state'], variants: [{ values: { state: 'default' }, component: composant }] },
      new Map([[composant, findLayoutNode(composant)]]),
      resolver,
      avertissements,
      new Map(),
      new Set(),
      undefined,
      styleDeTexte,
    );
    return { nonPortees, surcharges: avertissements.filter((phrase) => phrase.includes('ajoute')).map((phrase) => phrase.slice(0, 60)) };
  };
  const sortie = dansUnePortee ? await dansUnePorteeDAnalyse({}, lire) : await lire();
  return { sortie, appels };
}

const enJson = (valeur: unknown): unknown => JSON.parse(JSON.stringify(valeur));

const attendus = new Map<string, unknown>([
  ['texte uniforme', {"nonPortees": [], "surcharges": []}],
  ['puces sur une partie, sans surcharge', {"nonPortees": ["Layer « Label », bulleted list : ce régl"], "surcharges": []}],
  ['listes égales, surcharges différentes', {"nonPortees": [], "surcharges": ["Layer « Label », font style : le calque ajoute de l’italique", "Layer « Label », font weight : le calque ajoute du gras au s"]}],
  ['liste numérotée et surcharge sur des plages voisines', {"nonPortees": ["Layer « Label », bulleted list : ce régl", "Layer « Label », numbered list : ce régl"], "surcharges": ["Layer « Label », font style : le calque ajoute de l’italique", "Layer « Label », font weight : le calque ajoute du gras au s"]}],
  ['texte vide', {"nonPortees": [], "surcharges": []}],
  ['getStyledTextSegments absent', {"nonPortees": [], "surcharges": []}],
  ['getStyledTextSegments lève', {"nonPortees": [], "surcharges": []}],
]);

for (const c of cas) {
  test(`le moteur tire ses listes et ses surcharges de la même lecture dans une portée : ${c.nom}`, async () => {
    const { sortie, appels } = await leMoteur(c, true);
    if (process.env.DUMP_SEGMENTS) console.log(JSON.stringify([c.nom, enJson(sortie), appels]));
    assert.deepEqual(enJson(sortie), attendus.get(c.nom));
    assert.deepEqual(appels, c.fines || c.leve ? ['listOptions,textStyleOverrides'] : []);
  });

  test(`hors d'une portée, le moteur lit chaque champ à part : ${c.nom}`, async () => {
    const { sortie, appels } = await leMoteur(c, false);
    assert.deepEqual(enJson(sortie), attendus.get(c.nom));
    assert.deepEqual(appels, c.fines || c.leve ? ['listOptions', 'textStyleOverrides'] : []);
  });
}

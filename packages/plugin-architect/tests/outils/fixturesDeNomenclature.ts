/**
 * Les fixtures du calcul pur des noms : une liste de collections et de variables, ses protections, la marque de Palettes et les
 * règles du fichier. Elles servent la session du sandbox (par `portDeLecture` et `stockageDeRegles`) et le calcul pur (par
 * `entreeDeFixture`), pour que les deux lisent exactement les mêmes données. Aucun nom ne vient d'un fichier client.
 */
import type { EtatDeLaMarque } from '@ucm-kit/core/protocoles';
import type { EntreeDuCalcul } from '../../src/nomenclature/calcul';
import type { PortDeRegles } from '../../src/ecriture/noms';
import { lireInventaire, type PortDeLecture } from '../../src/nomenclature/lecture';
import { lireLesRegles, lireLeStockage, serialiserRegle, type Regle } from '../../src/nomenclature/regles';

export interface FixtureDeNomenclature {
  readonly nom: string;
  readonly collections: readonly { readonly id: string; readonly name: string; readonly modes?: readonly unknown[] }[];
  readonly variables: readonly (readonly [id: string, name: string, collection: string])[];
  /** Les identifiants de variable que la donnée partagée de Palettes protège. */
  readonly protegees?: readonly string[];
  /** Les identifiants dont la lecture de Palettes est refusée. */
  readonly indecidables?: readonly string[];
  readonly marque?: EtatDeLaMarque;
  readonly regles: readonly Regle[];
}

const ECRITURE: Regle = {
  type: 'ecriture',
  ecriture: { groupes: { casse: 'minuscules', separateur: 'tiret' }, variables: { casse: 'minuscules', separateur: 'tiret' } },
};

const COMPOSANTS: readonly (readonly [string, string, string])[] = [
  ['v1', 'Button/Background/Hover', 'c1'], ['v2', 'Button/background/hovered', 'c1'], ['v3', 'Button/Foreground/disabled', 'c1'],
  ['v4', 'Button/foreground/disable', 'c1'], ['v5', 'Card/Radius/Small', 'c1'], ['v6', 'Card/Radius/sm', 'c1'],
  ['v7', 'tile/quux/fill', 'c1'], ['v8', 'tile/quux/fg', 'c1'], ['v9', 'tile/quuxed/text', 'c1'], ['v10', 'tile/quuxed/line', 'c1'],
  ['v11', 'surface/default', 'c2'], ['v12', 'Surface/Default', 'c2'], ['v13', 'page/foreground-main', 'c2'], ['v14', 'Page/Foreground Main', 'c2'],
  ['v15', 'Text Color/Primary', 'c2'], ['v16', 'text-color/primary-hover', 'c2'],
  ['p1', 'color/blue/500', 'c3'], ['p2', 'Color/Blue/600', 'c3'], ['i1', 'color/red/500', 'c3'],
];
const COLLECTIONS_DE_BASE = [{ id: 'c1', name: 'Components' }, { id: 'c2', name: 'Thème', modes: [{}, {}] }, { id: 'c3', name: 'Primitives' }];

export const FIXTURES: readonly FixtureDeNomenclature[] = [
  { nom: 'premier lancement, sans règle', collections: COLLECTIONS_DE_BASE, variables: COMPOSANTS, protegees: ['p1', 'p2'], regles: [] },
  { nom: 'écriture choisie, protection de Palettes', collections: COLLECTIONS_DE_BASE, variables: COMPOSANTS, protegees: ['p1', 'p2'], indecidables: ['i1'], regles: [ECRITURE] },
  {
    nom: 'terme, écart, mot ordinaire et paire distincte', collections: COLLECTIONS_DE_BASE, variables: COMPOSANTS, protegees: ['p1'],
    regles: [
      ECRITURE,
      { type: 'terme', terme: { terme: ['quux'], remplace: [['quuxed']] } },
      { type: 'ecart', id: 'disabled' },
      { type: 'ordinaire', cle: 'tile' },
      { type: 'distinct', termes: ['primary', 'primary-hover'] },
    ],
  },
  {
    nom: 'collection exclue et collection renommée', collections: COLLECTIONS_DE_BASE, variables: COMPOSANTS,
    regles: [ECRITURE, { type: 'exclues', ids: ['c3'] }, { type: 'collection', id: 'c2', cible: 'theme' }],
  },
  { nom: 'marque courante de Palettes : les variables protégées suivent les règles', collections: COLLECTIONS_DE_BASE, variables: COMPOSANTS, protegees: ['p1', 'p2'], marque: 'courante', regles: [ECRITURE] },
  { nom: 'lecture de la marque refusée', collections: COLLECTIONS_DE_BASE, variables: COMPOSANTS, indecidables: ['p1', 'p2', 'i1'], marque: 'illisible', regles: [ECRITURE] },
  { nom: 'fichier sans variable', collections: COLLECTIONS_DE_BASE, variables: [], regles: [ECRITURE] },
];

export function stockageDeRegles(fixture: FixtureDeNomenclature): Map<string, string> {
  const stock = new Map<string, string>();
  for (const regle of fixture.regles) {
    const { cle, texte } = serialiserRegle(regle);
    if (texte !== null) stock.set(cle, texte);
  }
  return stock;
}

export function portDeRegles(stock: Map<string, string>): PortDeRegles {
  return {
    cles: () => [...stock.keys()],
    lire: (cle) => stock.get(cle) ?? '',
    ecrire: (cle, texte) => { stock.set(cle, texte); },
    effacer: (cle) => { stock.delete(cle); },
  };
}

export function portDeLecture(fixture: FixtureDeNomenclature): PortDeLecture {
  const protegees = new Set(fixture.protegees ?? []);
  const indecidables = new Set(fixture.indecidables ?? []);
  return {
    collections: async () => fixture.collections.map((collection) => ({ id: collection.id, name: collection.name, remote: false, ...(collection.modes ? { modes: collection.modes } : {}) })),
    variables: async () => fixture.variables.map(([id, name, collection]) => ({ id, name, variableCollectionId: collection, remote: false })),
    cibleAlias: () => undefined,
    protegee: (variable) => protegees.has(variable.id),
    palette: (variable) => (protegees.has(variable.id) ? `palette-${variable.id}` : undefined),
    indecidable: (variable) => indecidables.has(variable.id),
    ...(fixture.marque ? { marqueDePalettes: () => fixture.marque! } : {}),
  };
}

/** L'entrée du calcul pur telle que le sandbox la construirait : une acquisition fraîche et les règles lues avant elle. */
export async function entreeDeFixture(fixture: FixtureDeNomenclature, generation = 1): Promise<EntreeDuCalcul> {
  const regles = lireLesRegles(lireLeStockage(portDeRegles(stockageDeRegles(fixture))));
  const inventaire = await lireInventaire(portDeLecture(fixture), { pause: async () => {} });
  return { generation, inventaire, regles };
}

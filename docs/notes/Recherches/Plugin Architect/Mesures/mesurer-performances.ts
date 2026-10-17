import { cpus } from 'node:os';
import { execFileSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { detecterLesConventions, normaliserLesNoms, type ConventionsParCategorie } from '@ucm-kit/core/referentiel';
import { analyserInventaire } from '../../../../../packages/plugin-architect/src/analyse';
import { lireInventaire, type ComposantLu, type Inventaire, type PortDeLecture } from '../../../../../packages/plugin-architect/src/lecture';
import { doublonsDeLAnalyse, grouperLesRenommages, lignesDEcriture } from '../../../../../packages/plugin-architect/src/ui/presentation';

const repetitions = 7;
const convention = { casse: 'minuscules', separateur: 'tiret' } as const;
const conventions: ConventionsParCategorie = {
  collections: convention, variables: convention, groupes: convention,
  proprietes: convention, valeurs: convention,
};

function mediane(valeurs: number[]): number {
  return Number([...valeurs].sort((a, b) => a - b)[Math.floor(valeurs.length / 2)].toFixed(3));
}

function mesurer(action: () => unknown): number {
  for (let rang = 0; rang < 2; rang++) action();
  const temps: number[] = [];
  for (let rang = 0; rang < repetitions; rang++) {
    const debut = performance.now();
    action();
    temps.push(performance.now() - debut);
  }
  return mediane(temps);
}

async function mesurerAsync(action: () => Promise<unknown>): Promise<number> {
  for (let rang = 0; rang < 2; rang++) await action();
  const temps: number[] = [];
  for (let rang = 0; rang < repetitions; rang++) {
    const debut = performance.now();
    await action();
    temps.push(performance.now() - debut);
  }
  return mediane(temps);
}

function inventaireDeVariables(nombre: number): Inventaire {
  return {
    pages: [], composants: [],
    entrees: Array.from({ length: nombre }, (_, rang) => ({
      nom: {
        id: `v${rang}`, categorie: 'variables' as const, portee: `c${rang % 8}`,
        nom: `Button ${Math.floor(rang / 32)}/State Hover/Font Size ${rang}`,
        categoriesDesSegments: ['groupes', 'groupes', null] as const,
      },
      cible: { type: 'variable' as const, variableId: `v${rang}`, collectionId: `c${rang % 8}` },
      contexte: { collection: `Collection ${rang % 8}` }, renommable: true,
    })),
  };
}

function portDeVariantes(nombre: number): PortDeLecture {
  const definitions = { State: { type: 'VARIANT' }, Size: { type: 'VARIANT' } };
  const set: ComposantLu = {
    id: 'set', name: 'Button', remote: false, type: 'COMPONENT_SET', parentId: null,
    componentPropertyDefinitions: definitions, variantProperties: null,
  };
  const variantes: ComposantLu[] = Array.from({ length: nombre }, (_, rang) => ({
    id: `n${rang}`, name: `State=Default, Size=${rang}`, remote: false, type: 'COMPONENT', parentId: 'set',
    componentPropertyDefinitions: definitions, variantProperties: { State: 'Default', Size: String(rang) },
  }));
  return {
    collections: async () => [], variables: async () => [],
    pages: () => [{ id: 'p', name: 'Page', charger: async () => {}, composants: () => [set, ...variantes] }],
  };
}

async function main(): Promise<void> {
  const variables = [800, 8000, 32000].map((nombre) => {
    const inventaire = inventaireDeVariables(nombre);
    const noms = inventaire.entrees.map((entree) => entree.nom);
    const analyse = analyserInventaire(inventaire, conventions, true);
    const message = { type: 'pret', demande: 1, analyseId: 1, analyse };
    const groupes = grouperLesRenommages(analyse);
    const projection = {
      type: 'pret', demande: 1, analyseId: 1,
      ecritures: lignesDEcriture(analyse), groupes, doublons: doublonsDeLAnalyse(analyse),
    };
    return {
      nombre, propositions: analyse.normalisation.propositions.length,
      detectionMs: mesurer(() => detecterLesConventions(noms)),
      normalisationMs: mesurer(() => normaliserLesNoms(noms, conventions, { termesUcm: true })),
      analyseMs: mesurer(() => analyserInventaire(inventaire, conventions, true)),
      analyseSansTermesMs: mesurer(() => analyserInventaire(inventaire, conventions, false)),
      presentationMs: mesurer(() => {
        grouperLesRenommages(analyse); doublonsDeLAnalyse(analyse); lignesDEcriture(analyse);
      }),
      cloneNodeMs: mesurer(() => structuredClone(message)),
      jsonOctets: Buffer.byteLength(JSON.stringify(message)),
      projectionCompleteJsonOctets: Buffer.byteLength(JSON.stringify(projection)),
      elementsDeLignesDeduits: nombre * 7,
    };
  });
  const variantes = [];
  for (const nombre of [1000, 4000, 12000]) {
    const port = portDeVariantes(nombre);
    const inventaire = await lireInventaire(port, { pause: async () => {} });
    const analyse = analyserInventaire(inventaire, conventions);
    variantes.push({
      nombre, entrees: inventaire.entrees.length,
      lecturePureMs: await mesurerAsync(() => lireInventaire(port, { pause: async () => {} })),
      referencesAnterieuresRecopiees: nombre * (nombre - 1) / 2,
      analyseJsonOctets: Buffer.byteLength(JSON.stringify(analyse)),
    });
  }
  console.log(JSON.stringify({
    environnement: {
      node: process.version, plateforme: process.platform, architecture: process.arch,
      cpu: cpus()[0]?.model, revision: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
      repetitions, echauffements: 2,
    },
    limites: [
      'Objets synthétiques, sans appel Figma, sans DOM, sans transfert réel sandbox/interface.',
      'Les pauses de lecture sont des promesses résolues ; leur coût réel est exclu.',
      'structuredClone Node mesure une copie locale ; il ne mesure pas figma.ui.postMessage.',
      'Les variantes partagent State=Default et portent chacune une valeur Size distincte ; leurs combinaisons sont uniques.',
      'La projection complète garde toutes les lignes ; une fenêtre de résultats réduirait encore le message.',
    ], variables, variantes,
  }, null, 2));
}

void main();

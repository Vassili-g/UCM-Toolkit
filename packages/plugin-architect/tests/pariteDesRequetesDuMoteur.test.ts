/**
 * Les requêtes pures du modèle de propriétés et d'états face à l'ancien chemin, dans l'analyse complète d'Architect : le
 * moteur lit un monde Figma fabriqué dont l'axe d'états et deux propriétés produisent les messages de la famille, et
 * les messages, constats, corrections, modèles et relevé rendus sont comparés dans leur ordre.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { remplacerLesRequetesPourLeBanc } from 'ucm-plugin-socle/src/composant/analyse/proprietesEtEtats';

import type { Contexte } from '../src/sandbox/contexte';
import { traiter, type Lecteurs } from '../src/sandbox/analyse';
import { modeleDEtatsAvant, modeleDeProprietesAvant } from '../../plugin-socle/tests/aides/cheminAvantLesRequetes';
import { capturerLAnalyse } from './parite';
import { fabriquerLeMonde } from './outils/mondeFabrique';

const globale = globalThis as { figma?: unknown };

/** Le jeu `Button` du monde fabriqué, avec un axe `State` aux valeurs inconnues et deux propriétés qui se confondent. */
function monterLeMonde() {
  const monde = fabriquerLeMonde();
  const jeu = monde.jeu as unknown as { children: Array<{ name: string; variantProperties: Record<string, string> }>; componentPropertyDefinitions: unknown };
  for (const variant of jeu.children) {
    variant.variantProperties = { State: variant.variantProperties.Etat };
    variant.name = `State=${variant.variantProperties.State}`;
  }
  jeu.componentPropertyDefinitions = {
    State: { type: 'VARIANT', defaultValue: 'Repos', variantOptions: ['Repos', 'Survol', 'Inactif'] },
    'Avec icone#1:2': { type: 'BOOLEAN', defaultValue: true },
    'Icon Left#1:3': { type: 'TEXT', defaultValue: 'a' },
    'icon-left#1:4': { type: 'TEXT', defaultValue: 'b' },
  };
  return monde;
}

async function analyser() {
  const monde = monterLeMonde();
  const precedent = globale.figma;
  globale.figma = monde.figma;
  try {
    return await capturerLAnalyse(() => {
      const envoyes: never[] = [];
      const contexte: Contexte = {
        figma: monde.figma as unknown as PluginAPI,
        envoyer: (message) => envoyes.push(message as never),
        surveillerLeDocument: () => [],
      };
      return { b: { contexte, envoyes }, lectures: {} as Lecteurs };
    }, () => async (_demande, contexte) => traiter({ type: 'analyser' }, contexte));
  } finally {
    globale.figma = precedent;
  }
}

test('l’analyse complète rend la même sortie avec les requêtes pures et avec l’ancien chemin, messages de la famille compris', async () => {
  const nouveau = await analyser();
  remplacerLesRequetesPourLeBanc({ modeleDeProprietes: modeleDeProprietesAvant, modeleDEtats: modeleDEtatsAvant });
  let avant: Awaited<ReturnType<typeof analyser>>;
  try {
    avant = await analyser();
  } finally {
    remplacerLesRequetesPourLeBanc({});
  }

  const texte = JSON.stringify(nouveau.messages);
  assert.match(texte, /l'état « repos » n'est pas reconnu/);
  assert.match(texte, /leurs noms donnent le même nom « iconLeft » dans le contrat/);
  assert.deepEqual(nouveau, avant);
});

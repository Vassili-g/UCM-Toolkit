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
import { monterLeMonde } from './outils/mondeAvecEtats';

const globale = globalThis as { figma?: unknown };

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

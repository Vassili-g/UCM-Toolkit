/**
 * Architect lit le résultat interne du moteur, sans contrat publié : sur les mondes fabriqués, l'analyse complète rend
 * les mêmes messages, constats, corrections, modèles de règles et relevé que l'ancienne voie (contrat publié relu
 * par `JSON.parse`, copie dans `aides/voieAvantLInterne.ts`). Le contrat n'est plus écrit : la trace ne compte aucune
 * étape de publication.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { ETAPES_DE_PUBLICATION } from 'ucm-plugin-socle/src/composant/contract/exportComponent';

import type { Contexte } from '../src/sandbox/contexte';
import { LECTEURS_DE_FIGMA, traiterAvec, type Lecteurs } from '../src/sandbox/analyse';
import { capturerLAnalyse } from './parite';
import { LECTEURS_AVANT } from './aides/voieAvantLInterne';
import { fabriquerLeMonde } from './outils/mondeFabrique';
import { monterLeMonde } from './outils/mondeAvecEtats';

const globale = globalThis as { figma?: unknown };

type Monde = ReturnType<typeof fabriquerLeMonde>;

async function analyser(monter: () => Monde, lecteurs: Lecteurs, mesurer = false) {
  const monde = monter();
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
    }, () => async (_demande, contexte) => traiterAvec(lecteurs)({ type: 'analyser', ...(mesurer ? { mesurer: true } : {}) }, contexte));
  } finally {
    globale.figma = precedent;
  }
}

const AVANT: Lecteurs = { ...LECTEURS_DE_FIGMA, ...LECTEURS_AVANT };

const MONDES: Array<[string, () => Monde]> = [
  ['le monde fabriqué', fabriquerLeMonde],
  ['le monde à axe d’états inconnus et propriétés en conflit', monterLeMonde],
];

for (const [nom, monter] of MONDES) {
  test(`${nom} : Architect lit le résultat interne et rend la sortie de l’ancienne voie`, async () => {
    const nouveau = await analyser(monter, LECTEURS_DE_FIGMA);
    const avant = await analyser(monter, AVANT);
    assert.ok(nouveau.messages.length > 0);
    assert.deepEqual(nouveau, avant);
  });
}

test('Architect ne publie plus le contrat : la trace ne compte ni échantillons, ni compaction, ni sérialisation', async () => {
  const nouveau = await analyser(monterLeMonde, LECTEURS_DE_FIGMA, true);
  const avant = await analyser(monterLeMonde, AVANT, true);
  const etapes = (capture: typeof nouveau) => capture.messages
    .flatMap((message) => ('mesure' in message && typeof message.mesure === 'object' ? [message.mesure] : []))
    .flatMap((mesure) => (mesure as { etapes: Array<{ nom: string }> }).etapes.map((etape) => etape.nom));
  const sans = etapes(nouveau);
  assert.ok(sans.includes('wrapper'), 'la trace relève les étapes du calcul commun');
  assert.deepEqual(sans.filter((nom) => ETAPES_DE_PUBLICATION.includes(nom)), []);
  assert.deepEqual(ETAPES_DE_PUBLICATION.filter((nom) => !etapes(avant).includes(nom)), [], 'l’ancienne voie les trace');
});

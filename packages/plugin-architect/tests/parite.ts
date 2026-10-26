import assert from 'node:assert/strict';
import type { PluginMessage } from '../src/messages';
import type { Contexte } from '../src/sandbox/contexte';
import { analyseCourante, catalogueDeLAnalyse, constatDeLAnalyse, correctionsDeLAnalyse, releveDeLAnalyse, reinitialiserLAnalyse, traiterAvec, type Lecteurs } from '../src/sandbox/analyse';
import type { IdentiteDAnalyse } from '../src/messages/commun';
import { modelesDeLAnalyse } from '../src/regles';

/** Les générations sont relatives à cette exécution ; leurs écarts restent comparés. */
export type ApresAnalyse = (b: { contexte: Contexte; envoyes: PluginMessage[] }, identite: IdentiteDAnalyse) => Promise<void>;

export async function capturerLAnalyse(fabriquer: () => { b: { contexte: Contexte; envoyes: PluginMessage[] }; lectures: Lecteurs }, voie = traiterAvec, apres?: ApresAnalyse) {
  reinitialiserLAnalyse();
  const { b, lectures } = fabriquer();
  await voie(lectures)({ type: 'analyser' }, b.contexte);
  const identite = analyseCourante()!;
  if (apres) await apres(b, identite);
  const resultat = b.envoyes.find((message) => message.type === 'analyse')!;
  return structuredClone({
    messages: b.envoyes.map((message) => 'analyse' in message && message.analyse
      ? { ...message, analyse: { ...message.analyse, generation: message.analyse.generation - identite.generation + 1 } }
      : message),
    constatsRetenus: resultat.constats.map(({ id }) => constatDeLAnalyse(identite, id)),
    corrections: [...correctionsDeLAnalyse(identite) ?? []],
    modeles: [...modelesDeLAnalyse()],
    releve: releveDeLAnalyse(identite),
    catalogue: catalogueDeLAnalyse(identite),
  });
}

export async function verifierLaPariteDeLAnalyse(fabriquer: Parameters<typeof capturerLAnalyse>[0], voie = traiterAvec, apres?: ApresAnalyse) {
  const reference = await capturerLAnalyse(fabriquer, traiterAvec, apres);
  const candidate = await capturerLAnalyse(fabriquer, voie, apres);
  assert.deepEqual(candidate, reference);
  return reference;
}

/**
 * Le raccord du générateur commun à l'analyse d'Architect : le double du document vient du socle, l'analyse est celle du plugin
 * (`traiterAvec` et `LECTEURS_DE_FIGMA`), relevé et catalogue compris. `tirer` et `reduire` reçoivent cette fonction en paramètre.
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- les doubles de Figma dépassent les types du plugin */
import { oublierLIndexDuDocument } from 'ucm-plugin-socle/src/composant/contract/composedComponents';

import { doubleDuDocument, type ResultatDAnalyse } from '../../../plugin-socle/tests/generateur/double';
import type { DocumentGenere } from '../../../plugin-socle/tests/generateur/types';
import { LECTEURS_DE_FIGMA, reinitialiserLAnalyse, traiterAvec } from '../../src/sandbox/analyse';

/** L'analyse complète du document : le dernier message `analyse`, avec le relevé et le catalogue que les lecteurs ont lus. */
export async function analyserDocument(doc: DocumentGenere): Promise<ResultatDAnalyse> {
  const { figma, journal } = doubleDuDocument(doc);
  const globale = globalThis as { figma?: unknown };
  const precedent = globale.figma;
  globale.figma = figma;
  reinitialiserLAnalyse();
  oublierLIndexDuDocument();
  const messages: any[] = [];
  let releve: any;
  let catalogue: any;
  try {
    const traiter = traiterAvec({
      ...LECTEURS_DE_FIGMA,
      releve: async (...args: Parameters<typeof LECTEURS_DE_FIGMA.releve>) => {
        const r = await LECTEURS_DE_FIGMA.releve(...args);
        if (r.statut === 'lu') releve = r.releve;
        return r;
      },
      catalogue: async (...args: Parameters<typeof LECTEURS_DE_FIGMA.catalogue>) => {
        catalogue = await LECTEURS_DE_FIGMA.catalogue(...args);
        return catalogue;
      },
    });
    const debut = performance.now();
    await traiter({ type: 'analyser', demande: 1 }, { figma, envoyer: (m: any) => messages.push(m), surveillerLeDocument: () => [] } as any);
    const final = messages.find((m) => m.type === 'analyse');
    if (!final) throw new Error(`Analyse sans final ${JSON.stringify(messages)}`);
    return { statut: final.statut, constats: final.constats, releve, catalogue, lecture: final.lecture, causes: final.causes, dureeMs: performance.now() - debut, journal };
  } finally {
    globale.figma = precedent;
  }
}

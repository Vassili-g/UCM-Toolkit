/**
 * Le parcours complet du banc des pièces : tirage d'un composant, export par le moteur sur le double de Figma, résolution par le kit,
 * comparaison au modèle de vérité, réduction de chaque écart non couvert. Le test du banc et `npm run banc:pieces` l'appellent tous deux.
 *
 * Un tirage qui contient une pièce interne (anatomie `piece-interne`) est classé « attendu en 15.0 » : le moteur 14.0 ne publie pas les
 * pièces, le banc le compte à part et ne le juge pas.
 */
import { graineDe } from '../../../kit/tests/stress/commun/prng';
import { comparer, type Ecart } from '../../../plugin-socle/tests/generateur/comparateur';
import { generer, tirerSpec } from '../../../plugin-socle/tests/generateur/generateur';
import { renduLu, variantsDuContrat } from '../../../plugin-socle/tests/generateur/lecture';
import { reduireLeDocumentDuBanc, signatureDEcart } from '../../../plugin-socle/tests/generateur/reductionDuBanc';
import type { DocumentGenere } from '../../../plugin-socle/tests/generateur/types';
import { renduAttendu, variantsDeLHote } from '../../../plugin-socle/tests/generateur/verite';
import { exporterLeDocument } from './documentDuBanc';

/** Les écarts non couverts d'un document : chaque variant de l'hôte, rendu attendu contre rendu lu dans le contrat exporté. */
export async function ecartsDuDocument(doc: DocumentGenere): Promise<Ecart[]> {
  const { contrat } = await exporterLeDocument(doc);
  const pertes = contrat.meta?.diagnostics ?? [];
  const ecarts: Ecart[] = [];
  const publies = variantsDuContrat(contrat);
  for (const variant of variantsDeLHote(doc)) {
    if (!publies.includes(variant)) {
      ecarts.push({ variant, identite: '(variant)', champ: 'calque', attendu: 'publié', lu: 'absent', normatif: true });
      continue;
    }
    ecarts.push(...comparer(renduAttendu(doc, { variant }), renduLu(contrat, variant), pertes));
  }
  return ecarts;
}

export const aUnePieceInterne = (doc: DocumentGenere): boolean => doc.spec.anatomie.includes('piece-interne');

export interface CasEnEcart {
  /** Rang du tirage dans la série, et sa graine : `generer(graine, tirerSpec(graine, rang))` le refait. */
  rang: number;
  graine: number;
  ecarts: Ecart[];
  /** Une exception de l'export ou de la lecture, au lieu d'écarts. */
  erreur?: string;
}

export interface EcartReduit {
  signature: string;
  champ: string;
  /** Les rangs des tirages qui rendent cette signature. */
  rangs: number[];
  graine: number;
  ecart: Ecart;
  avant: { calques: number; variables: number };
  apres: { calques: number; variables: number };
  document: DocumentGenere;
}

export interface ResultatDuBanc {
  graine: number;
  nombre: number;
  dureeMs: number;
  juges: number;
  attenduEn15: { rang: number; graine: number }[];
  enEcart: CasEnEcart[];
  reduits: EcartReduit[];
}

export interface OptionsDuBanc {
  graine: number;
  nombre: number;
  reduire?: boolean;
}

export const graineDuTirage = (graine: number, rang: number): number => graineDe(graine, `cas-${rang}`);

export async function lancerLeBanc(options: OptionsDuBanc): Promise<ResultatDuBanc> {
  const { graine, nombre } = options;
  if (!Number.isInteger(graine) || !Number.isInteger(nombre) || nombre < 1) throw new Error('Graine entière et nombre positif requis.');
  const debut = performance.now();
  const resultat: ResultatDuBanc = { graine, nombre, dureeMs: 0, juges: 0, attenduEn15: [], enEcart: [], reduits: [] };
  const temoins = new Map<string, { doc: DocumentGenere; ecart: Ecart; graine: number; rangs: number[] }>();
  for (let rang = 0; rang < nombre; rang++) {
    const sousGraine = graineDuTirage(graine, rang);
    const doc = generer(sousGraine, tirerSpec(sousGraine, rang));
    if (aUnePieceInterne(doc)) {
      resultat.attenduEn15.push({ rang, graine: sousGraine });
      continue;
    }
    resultat.juges++;
    let ecarts: Ecart[];
    try {
      ecarts = await ecartsDuDocument(doc);
    } catch (erreur) {
      resultat.enEcart.push({ rang, graine: sousGraine, ecarts: [], erreur: String((erreur as Error).stack ?? erreur).split('\n').slice(0, 4).join(' | ') });
      continue;
    }
    if (!ecarts.length) continue;
    resultat.enEcart.push({ rang, graine: sousGraine, ecarts });
    for (const ecart of ecarts) {
      const signature = signatureDEcart(ecart);
      const connu = temoins.get(signature);
      if (connu) connu.rangs.push(rang);
      else temoins.set(signature, { doc: structuredClone(doc), ecart, graine: sousGraine, rangs: [rang] });
    }
  }
  if (options.reduire !== false) {
    for (const [signature, t] of temoins) {
      const r = await reduireLeDocumentDuBanc(t.doc, t.ecart, ecartsDuDocument);
      resultat.reduits.push({ signature, champ: t.ecart.champ, rangs: t.rangs, graine: t.graine, ecart: t.ecart, avant: r.avant, apres: r.apres, document: r.document });
    }
  }
  resultat.dureeMs = Math.round(performance.now() - debut);
  return resultat;
}

/** Le résumé en lignes : les comptes, puis chaque écart réduit avec sa graine et son champ. */
export function resumerLeBanc(r: ResultatDuBanc): string[] {
  const lignes = [`Banc des pièces : graine ${r.graine}, ${r.nombre} tirages, ${(r.dureeMs / 1000).toFixed(1)} s.`];
  lignes.push(`Jugés : ${r.juges}. Attendu en 15.0 (pièce interne, non jugés) : ${r.attenduEn15.length}. Tirages en écart non couvert : ${r.enEcart.length}.`);
  for (const c of r.enEcart.filter((c) => c.erreur)) lignes.push(`Exception, tirage ${c.rang} (graine ${c.graine}) : ${c.erreur}`);
  for (const e of r.reduits) {
    lignes.push(`Écart ${e.signature} : champ ${e.champ}, ${e.rangs.length} tirage(s), premier rang ${e.rangs[0]} (graine ${e.graine}), réduit de ${e.avant.calques} à ${e.apres.calques} calques.`);
    lignes.push(`  attendu ${JSON.stringify(e.ecart.attendu)} ; lu ${JSON.stringify(e.ecart.lu)} ; calque ${e.ecart.identite}`);
  }
  return lignes;
}

/**
 * Un tirage du générateur : pour chaque cas, un composant fabriqué depuis la graine, l'analyse complète d'Architect, puis la
 * comparaison à la carte que le générateur a écrite avant l'analyse. Le même module sert l'échantillon fixe de `npm test`
 * (`generateurEchantillon.test.ts`) et le grand tirage de `npm run stress:composant` (`scripts/stress/generateur/executer.ts`).
 *
 * Un cas sur quatre suit chaque famille d'attentes : juste (zéro constat, ou les attentes que les décisions D1 à D26 prévoient),
 * défaut injecté (le constat attendu sur la cible attendue, et la restauration rend le résultat de départ), transformation neutre
 * (mêmes verdicts, mêmes candidats, mêmes cibles) et abstention (aucun constat ne repose sur la donnée refusée). Les quatre cas
 * d'un même rang partent du même composant de base.
 */
import { graineDe } from '../../../kit/tests/stress/commun/prng';
import { analyserDocument } from './double';
import { generer, tirerSpec } from './generateur';
import { ABSTENTIONS, DEFAUTS, TRANSFORMATIONS, injecter, rendreIllisible, restaurer, signatureConstats, transformer } from './operateurs';
import { comparerConstats, verifierDocument } from './oracle';
import { reduire, signatureEcart } from './reduction';
import type { DocumentGenere, RefusOracle } from './types';

export const FAMILLES = ['juste', 'defaut', 'transformation', 'abstention'] as const;
export type Famille = (typeof FAMILLES)[number];

export interface CompteDeFamille { tirages: number; ecarts: number; refusOracle: number; conformes: number }

export interface EcartDuTirage {
  id: string;
  /** Une clé par sorte d'écart : les cas qui la partagent se regroupent. */
  signature: string;
  sorte: 'inattendu' | 'manquant' | 'restauration' | 'neutralite' | 'arret' | 'exception';
  cas: string[];
  graine: number;
  familleAttentes: Famille;
  operation?: string;
  /** Le constat inattendu, ou l'attente sans constat. */
  detail: unknown;
  /** La cause commune M1 à M10 du plan, ou « à établir ». */
  famille: string;
  cause: string;
  /** Le plus petit composant qui reproduit l'écart, quand la réduction l'a trouvé. */
  reduit?: { document: DocumentGenere; avant: unknown; apres: unknown };
}

export interface ResultatDuTirage {
  graine: number;
  nombre: number;
  dureeMs: number;
  familles: Record<Famille, CompteDeFamille>;
  ecarts: EcartDuTirage[];
  refus: { cas: string; graine: number; refus: RefusOracle[] }[];
  couverture: Record<'anatomies' | 'constructions' | 'dialectes' | 'operations' | 'statuts' | 'attentes', Record<string, number>>;
  cas: { id: string; graine: number; famille: Famille; operation?: string; statut: string; constats: number; dureeMs: number; conforme: boolean; documentRefuse?: boolean }[];
}

export interface OptionsDuTirage {
  graine: number;
  nombre: number;
  /** Réduit chaque écart au plus petit composant. Hors de `npm test`, la réduction relit l'analyse des centaines de fois. */
  reduire?: boolean;
  /** Appelé après chaque cas : le script s'en sert pour écrire son avancement. */
  surCas?: (ligne: ResultatDuTirage['cas'][number]) => void;
}

/** Ce que le plan sait de chaque code d'écart : sa cause commune M1 à M10 et la cause que le générateur suppose. Un code absent reste « à établir ». */
function classer(code: string): { famille: string; cause: string } {
  const connus: Record<string, { famille: string; cause: string }> = {
    C19: { famille: 'M8', cause: 'un token d’un composant imbriqué ou d’une pièce interne est jugé comme celui du sujet' },
    C20: { famille: 'M3', cause: 'l’attente de typographie ne suit pas la référence du kit' },
    C24: { famille: 'M1', cause: 'le rôle admis d’un calque se décide sur un seul indice' },
    C25: { famille: 'M6', cause: 'la proposition de liaison est fausse ou manque' },
    C30: { famille: 'M5', cause: 'le moteur des règles du socle relève une valeur qu’il ne devrait pas' },
    C42: { famille: 'M10', cause: 'un blocage du moteur ou une lecture refusée' },
    C49: { famille: 'M9', cause: 'la preuve du fond du contraste diffère de celle du générateur' },
    C59: { famille: 'M9', cause: 'la surface et le contraste ne lisent pas le même fond' },
    C64: { famille: 'M7', cause: 'un nom remplace l’identité d’un calque' },
    C65: { famille: 'M3', cause: 'l’attente de typographie ne suit pas la référence du kit' },
    C66: { famille: 'M1', cause: 'la définition d’icône est tranchée sur un seul indice' },
    C67: { famille: 'M1', cause: 'la définition d’icône est tranchée sur un seul indice' },
    C83: { famille: 'M2', cause: 'un axe d’un composant imbriqué est mal lu' },
  };
  return connus[code] ?? { famille: 'à établir', cause: 'à établir' };
}

const compteurs = (): Record<Famille, CompteDeFamille> => ({
  juste: { tirages: 0, ecarts: 0, refusOracle: 0, conformes: 0 },
  defaut: { tirages: 0, ecarts: 0, refusOracle: 0, conformes: 0 },
  transformation: { tirages: 0, ecarts: 0, refusOracle: 0, conformes: 0 },
  abstention: { tirages: 0, ecarts: 0, refusOracle: 0, conformes: 0 },
});

/** Les cas d'un tirage, dans l'ordre : le cas `i` suit la famille d'attentes `i % 4`, sur le composant de rang `i / 4`. */
export async function tirer(options: OptionsDuTirage): Promise<ResultatDuTirage> {
  const { graine, nombre } = options;
  if (!Number.isInteger(graine) || !Number.isInteger(nombre) || nombre < 1) throw new Error('Graine entière et nombre positif requis.');
  const debut = performance.now();
  const resultat: ResultatDuTirage = {
    graine, nombre, dureeMs: 0, familles: compteurs(), ecarts: [], refus: [], cas: [],
    couverture: { anatomies: {}, constructions: {}, dialectes: {}, operations: {}, statuts: {}, attentes: {} },
  };
  const bases = new Map<number, { doc: DocumentGenere; resultat: Awaited<ReturnType<typeof analyserDocument>> | null }>();
  const temoins = new Map<string, { doc: DocumentGenere; constat: any }>();
  const compter = (cle: keyof ResultatDuTirage['couverture'], valeurs: readonly string[]) => {
    for (const valeur of valeurs) resultat.couverture[cle][valeur] = (resultat.couverture[cle][valeur] ?? 0) + 1;
  };
  const noter = (ecart: Omit<EcartDuTirage, 'id' | 'cas'> & { cas: string }, temoin?: { doc: DocumentGenere; constat: any }) => {
    const connu = resultat.ecarts.find((e) => e.signature === ecart.signature);
    if (connu) { connu.cas.push(ecart.cas); return; }
    const id = `G${resultat.ecarts.length + 1}`;
    resultat.ecarts.push({ ...ecart, id, cas: [ecart.cas] });
    if (temoin) temoins.set(id, temoin);
  };

  for (let i = 0; i < nombre; i++) {
    const famille = FAMILLES[i % 4];
    const rang = Math.floor(i / 4);
    const sousGraine = graineDe(graine, `cas-${rang}`);
    let entree = bases.get(sousGraine);
    if (!entree) {
      const doc = generer(sousGraine, tirerSpec(sousGraine, rang));
      entree = { doc, resultat: verifierDocument(doc).length ? null : await analyserDocument(doc) };
      bases.set(sousGraine, entree);
    }
    const base = entree.doc;
    let doc = base;
    if (famille === 'defaut') doc = injecter(base, DEFAUTS[rang % DEFAUTS.length]);
    if (famille === 'transformation') doc = transformer(base, TRANSFORMATIONS[rang % TRANSFORMATIONS.length], sousGraine);
    if (famille === 'abstention') doc = rendreIllisible(base, ABSTENTIONS[rang % ABSTENTIONS.length]);
    const id = `T${String(i + 1).padStart(4, '0')}`;
    doc.id = id;
    compter('anatomies', doc.spec.anatomie);
    compter('constructions', doc.spec.construction);
    compter('dialectes', [doc.spec.dialecte]);
    compter('operations', [doc.operation ?? 'aucune']);
    compter('attentes', [...doc.oracle.attendus, ...doc.oracle.infos].map((a) => `${a.code} ${a.type ?? 'info'}`));
    const compte = resultat.familles[famille];
    compte.tirages++;
    const refus = verifierDocument(doc);
    if (refus.length) {
      compte.refusOracle++;
      resultat.refus.push({ cas: id, graine: sousGraine, refus });
      const ligne = { id, graine: sousGraine, famille, operation: doc.operation, statut: 'refuse', constats: 0, dureeMs: 0, conforme: false, documentRefuse: true };
      resultat.cas.push(ligne);
      options.surCas?.(ligne);
      continue;
    }
    let analyse;
    try {
      analyse = famille === 'juste' ? entree.resultat! : await analyserDocument(doc);
    } catch (erreur) {
      compte.ecarts++;
      noter({ signature: `exception:${famille}:${doc.operation ?? ''}:${(erreur as Error).message.slice(0, 80)}`, sorte: 'exception', cas: id, graine: sousGraine, familleAttentes: famille, operation: doc.operation, detail: String((erreur as Error).stack ?? erreur), ...classer('exception') });
      const ligne = { id, graine: sousGraine, famille, operation: doc.operation, statut: 'exception', constats: 0, dureeMs: 0, conforme: false };
      resultat.cas.push(ligne);
      options.surCas?.(ligne);
      continue;
    }
    resultat.couverture.statuts[analyse.statut] = (resultat.couverture.statuts[analyse.statut] ?? 0) + 1;
    const comparaison = comparerConstats(doc, analyse.constats);
    let restauration: boolean | undefined;
    let neutre: boolean | undefined;
    if (famille === 'defaut') {
      // La restauration repart de l'entrée conservée, jamais d'une sortie de l'analyse.
      const inverse = restaurer(doc);
      const restaure = await analyserDocument(inverse);
      restauration = JSON.stringify(inverse) === JSON.stringify(base) && signatureConstats(inverse, restaure.constats) === signatureConstats(base, entree.resultat!.constats);
    }
    if (famille === 'transformation') neutre = signatureConstats(doc, analyse.constats) === signatureConstats(base, entree.resultat!.constats);
    const arretPrevu = doc.oracle.attendus.some((a) => a.code === 'C42' && a.type === 'bloquant');
    const arretImprevu = analyse.statut === 'arretee' && !arretPrevu;
    const ecart = !comparaison.conformes || arretImprevu || restauration === false || neutre === false;
    if (ecart) compte.ecarts++; else compte.conformes++;
    for (const c of comparaison.inattendus) {
      noter({ signature: `inattendu:${signatureEcart(c)}`, sorte: 'inattendu', cas: id, graine: sousGraine, familleAttentes: famille, operation: doc.operation, detail: c, ...classer(c.code) }, { doc: structuredClone(doc), constat: c });
    }
    for (const manque of comparaison.manquants) {
      noter({ signature: `manquant:${manque.code}:${JSON.stringify(manque.faits ?? {})}`, sorte: 'manquant', cas: id, graine: sousGraine, familleAttentes: famille, operation: doc.operation, detail: manque, ...classer(manque.code) });
    }
    if (arretImprevu && !comparaison.inattendus.length) {
      noter({ signature: `arret:${famille}:${doc.operation ?? ''}`, sorte: 'arret', cas: id, graine: sousGraine, familleAttentes: famille, operation: doc.operation, detail: analyse.constats.map((c) => [c.code, c.faits]), ...classer('C42') });
    }
    if (restauration === false) noter({ signature: `restauration:${doc.operation}`, sorte: 'restauration', cas: id, graine: sousGraine, familleAttentes: famille, operation: doc.operation, detail: 'la restauration ne rend pas le résultat de départ', famille: 'M6', cause: 'l’opérateur ou son inverse laisse une trace' });
    if (neutre === false) noter({ signature: `neutralite:${doc.operation}`, sorte: 'neutralite', cas: id, graine: sousGraine, familleAttentes: famille, operation: doc.operation, detail: 'la transformation change un verdict, un candidat ou une cible', famille: 'M7', cause: 'le moteur lit un nom, un rang ou un identifiant au lieu de l’identité du calque' });
    const ligne = { id, graine: sousGraine, famille, operation: doc.operation, statut: analyse.statut, constats: analyse.constats.length, dureeMs: Math.round(analyse.dureeMs), conforme: !ecart };
    resultat.cas.push(ligne);
    options.surCas?.(ligne);
  }

  if (options.reduire) {
    for (const [id, temoin] of temoins) {
      const ecart = resultat.ecarts.find((e) => e.id === id)!;
      const r = await reduire(temoin.doc, temoin.constat);
      ecart.reduit = { document: r.document, avant: r.avant, apres: r.apres };
    }
  }
  resultat.dureeMs = Math.round(performance.now() - debut);
  return resultat;
}

/** Les écarts d'un tirage en lignes lisibles, pour un message d'échec : la graine du cas, sa famille d'attentes, le constat et le plus petit composant. */
export function decrireLesEcarts(resultat: ResultatDuTirage): string[] {
  const lignes: string[] = [];
  for (const e of resultat.ecarts) {
    lignes.push(`${e.id} ${e.sorte} (${e.famille}), famille d’attentes ${e.familleAttentes}${e.operation ? `, ${e.operation}` : ''}, graine ${e.graine}, cas ${e.cas.join(' ')}`);
    lignes.push(`  ${JSON.stringify(e.detail).slice(0, 600)}`);
    if (e.reduit) lignes.push(`  réduit : ${JSON.stringify(e.reduit.apres)}`);
  }
  for (const r of resultat.refus) lignes.push(`${r.cas} document refusé par le garde, graine ${r.graine} : ${r.refus.slice(0, 3).map((x) => `${x.code} ${x.message}`).join(' ; ')}`);
  return lignes;
}

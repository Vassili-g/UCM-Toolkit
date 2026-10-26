/**
 * Rejoue l'analyse complète sur une capture (`src/sandbox/capture.ts`) et compte chaque lecture du double par étape de la
 * trace, par champ, par sorte de nœud et par fonction appelante. Les comptes sont pondérés par le banc de coût de la même
 * capture : la durée estimée d'une lecture est le coût unitaire mesuré dans Figma pour sa sorte de nœud. Travail de mesure,
 * hors des tests ; la capture reste dans `_local/`.
 *
 *   npx tsx scripts/rejouer-la-capture.ts <capture.json> [--json <sortie.json>]
 *
 * L'étape d'une lecture se déduit de son instant : les étapes de la trace se suivent sans trou, leur fin est la fin de la
 * trace moins les étapes suivantes. Le coût d'une sorte que le banc ne mesure pas (FRAME, RECTANGLE…) est celui de la sorte
 * voisine nommée dans `SORTE_DU_BANC`. `findAll` et ses variantes coûtent leur mesure sur un nœud du banc, quelle que soit
 * la taille du sous-arbre : leur part est une borne basse.
 */
import { readFileSync, writeFileSync } from 'node:fs';

import type { Contexte } from '../src/sandbox/contexte';
import { reinitialiserLAnalyse, traiter } from '../src/sandbox/analyse';
import type { CaptureArchitect } from '../src/sandbox/capture';
import type { TraceDeMesure } from 'ucm-plugin-socle/src/composant/contract/mesure';
import { doubleDepuisCapture, type LectureDuDouble } from '../tests/outils/capture';

type Mesure = { type: string; lecture: string; microsecondesParLecture: number };
type Fichier = { capture: CaptureArchitect; banc?: { mesures: Mesure[] } };

const SORTE_DU_BANC: Record<string, string> = {
  COMPONENT_SET: 'COMPONENT', FRAME: 'COMPONENT', GROUP: 'COMPONENT', SECTION: 'COMPONENT',
  RECTANGLE: 'VECTOR', ELLIPSE: 'VECTOR', LINE: 'VECTOR', POLYGON: 'VECTOR', STAR: 'VECTOR', BOOLEAN_OPERATION: 'VECTOR',
};

const [chemin, ...reste] = process.argv.slice(2);
if (!chemin) throw new Error('Donner le chemin de la capture.');
const sortieJson = reste[0] === '--json' ? reste[1] : undefined;
const { capture, banc } = JSON.parse(readFileSync(chemin, 'utf8')) as Fichier;

const cout = new Map<string, number>();
for (const mesure of banc?.mesures ?? []) cout.set(`${mesure.type}|${mesure.lecture}`, mesure.microsecondesParLecture);
const champDuBanc = (champ: string): string => (/^find(All|One|Children|AllWithCriteria)$/.test(champ) ? 'findAll(() => true)' : champ === 'getMainComponentAsync' ? 'getMainComponentAsync()' : champ);
const coutDe = (type: string | undefined, champ: string): number | undefined => {
  if (!type) return undefined;
  return cout.get(`${type}|${champDuBanc(champ)}`) ?? cout.get(`${SORTE_DU_BANC[type] ?? ''}|${champDuBanc(champ)}`);
};

/** La première fonction de `src/` au-dessus du double : celle qui lit. */
const appelant = (): string => {
  const pile = new Error().stack?.split('\n').slice(2) ?? [];
  for (const ligne of pile) {
    if (/tests[\\/]outils[\\/]capture|scripts[\\/]rejouer|node:/.test(ligne)) continue;
    const trouve = /at (?:async )?([^\s(]+)? ?\(?(.*[\\/]src[\\/][^:]+):\d+/.exec(ligne);
    if (trouve) return `${trouve[1] ?? '<anonyme>'} (${trouve[2].replace(/^.*[\\/]packages[\\/]/, '').replace(/\\/g, '/')})`;
  }
  return '<inconnu>';
};

type Lecture = { instant: number; noeud: string; type: string | undefined; champ: string; methode: boolean; appelant: string };
const lectures: Lecture[] = [];
let origine = 0;
Error.stackTraceLimit = 25;
const enregistrer = ({ noeud, champ, methode }: LectureDuDouble): void => {
  // La méthode de segments passe deux fois : son enveloppe, puis son corps avec les champs demandés.
  if (champ === 'getStyledTextSegments') return;
  lectures.push({ instant: Date.now() - origine, noeud, type: capture.noeuds[noeud]?.type, champ, methode, appelant: appelant() });
};

const double = doubleDepuisCapture(capture, { surLecture: enregistrer });
const globale = globalThis as { figma?: unknown };
globale.figma = double.figma;
const envoyes: { type: string; mesure?: TraceDeMesure; statut?: string }[] = [];
const contexte: Contexte = {
  figma: double.figma as unknown as PluginAPI,
  envoyer: (message) => envoyes.push(message as never),
  surveillerLeDocument: () => [],
};

async function rejouer(): Promise<void> {
reinitialiserLAnalyse();
origine = Date.now();
await traiter({ type: 'analyser', demande: 1, mesurer: true }, contexte);
const resultat = envoyes.find((message) => message.type === 'analyse');
const trace = resultat?.mesure;
if (!trace) throw new Error('L’analyse rejouée ne rend pas de trace.');

// Les étapes se suivent jusqu'à la fermeture : on les borne depuis la fin.
const bornes: { nom: string; debut: number; fin: number }[] = [];
let fin = trace.totalMs;
for (const etape of [...trace.etapes].reverse()) {
  bornes.unshift({ nom: etape.nom, debut: fin - etape.ms, fin });
  fin -= etape.ms;
}
const etapeDe = (instant: number): string => bornes.find((borne) => instant >= borne.debut && instant <= borne.fin)?.nom ?? '<avant>';

type Agregat = { lectures: number; us: number; sansCout: number };
const ajouter = (table: Map<string, Agregat>, cle: string, us: number | undefined): void => {
  const agregat = table.get(cle) ?? { lectures: 0, us: 0, sansCout: 0 };
  agregat.lectures += 1;
  if (us === undefined) agregat.sansCout += 1;
  else agregat.us += us;
  table.set(cle, agregat);
};
const parEtape = new Map<string, Agregat>();
const parEtapeEtAppelant = new Map<string, Agregat>();
const parEtapeEtChamp = new Map<string, Agregat>();
const repetees = new Map<string, Agregat>();
const vues = new Map<string, number>();
const repeteesParAppelant = new Map<string, Agregat>();
const repeteesDuMoteur = new Map<string, Agregat>();
const vuesDuMoteur = new Map<string, number>();
const HORS_DU_MOTEUR = new Set(['sujet', 'releve', 'catalogue', 'catalogue-valeurs', 'controles', 'provisoire', 'regles', 'controle-fusion', 'corrections', 'projection', '<avant>']);
for (const lecture of lectures) {
  const etape = etapeDe(lecture.instant);
  const us = lecture.noeud === 'figma' ? undefined : coutDe(lecture.type, lecture.champ);
  ajouter(parEtape, etape, us);
  ajouter(parEtapeEtAppelant, `${etape} | ${lecture.appelant}`, us);
  ajouter(parEtapeEtChamp, `${etape} | ${lecture.type ?? lecture.noeud} | ${lecture.champ}`, us);
  // Une lecture répétée relit le même champ du même nœud dans la même étape.
  const cle = `${etape}|${lecture.noeud}|${lecture.champ}`;
  const deja = vues.get(cle) ?? 0;
  vues.set(cle, deja + 1);
  if (deja > 0) {
    ajouter(repetees, `${etape} | ${lecture.champ}`, us);
    ajouter(repeteesParAppelant, `${etape} | ${lecture.champ} | ${lecture.appelant}`, us);
  }
  // Dans le moteur, une portée vit toute la demande : une relecture d'une étape à l'autre compte aussi.
  if (!HORS_DU_MOTEUR.has(etape)) {
    const cleDuMoteur = `${lecture.noeud}|${lecture.champ}`;
    const avant = vuesDuMoteur.get(cleDuMoteur) ?? 0;
    vuesDuMoteur.set(cleDuMoteur, avant + 1);
    if (avant > 0) ajouter(repeteesDuMoteur, lecture.champ, us);
  }
}

const tableau = (table: Map<string, Agregat>, limite: number) => [...table.entries()]
  .sort(([, a], [, b]) => b.us - a.us || b.lectures - a.lectures)
  .slice(0, limite)
  .map(([cle, { lectures: n, us, sansCout }]) => ({ cle, lectures: n, ms: Math.round(us / 100) / 10, ...(sansCout ? { sansCout } : {}) }));

const total = [...parEtape.values()].reduce((somme, agregat) => somme + agregat.us, 0);
console.log(`Statut ${resultat?.statut}, ${lectures.length} lectures, ${Math.round(total / 1000)} ms estimés dans Figma.`);
console.log('\nPar étape'); console.table(tableau(parEtape, 60));
console.log('\nPar étape et fonction appelante'); console.table(tableau(parEtapeEtAppelant, 50));
console.log('\nPar étape, sorte et champ'); console.table(tableau(parEtapeEtChamp, 50));
console.log('\nRelectures du même champ du même nœud dans une étape'); console.table(tableau(repetees, 30));
console.log('\nRelectures par fonction appelante'); console.table(tableau(repeteesParAppelant, 30));
console.log('\nRelectures du même champ du même nœud dans tout le moteur'); console.table(tableau(repeteesDuMoteur, 20));
if (sortieJson) {
  writeFileSync(sortieJson, JSON.stringify({
    statut: resultat?.statut, lectures: lectures.length, msEstimes: total / 1000, etapes: trace.etapes.map(({ nom, ms }) => ({ nom, ms })),
    parEtape: tableau(parEtape, Infinity), parEtapeEtAppelant: tableau(parEtapeEtAppelant, Infinity), parEtapeEtChamp: tableau(parEtapeEtChamp, Infinity), repetees: tableau(repetees, Infinity), repeteesParAppelant: tableau(repeteesParAppelant, Infinity), repeteesDuMoteur: tableau(repeteesDuMoteur, Infinity),
  }, null, 1));
}
}

void rejouer();

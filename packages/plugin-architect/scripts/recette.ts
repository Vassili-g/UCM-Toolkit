/**
 * Le banc de recette d'Architect (D15, second filet) : il rejoue une capture de `_local/recettes/` par `doubleDepuisCapture` et
 * l'analyse complète du sandbox, puis compare les constats finaux à `<capture>.attendus.json`, posé à côté de la capture.
 * Il rend 0 quand tout correspond, 1 sinon, avec la liste des écarts. Le mainteneur le lance avant une publication.
 *
 *   npm run recette:architect -- <capture.json>
 *   npm run recette:architect -- <capture.json> --lister    # écrit les groupes de constats rendus, sans comparer
 *   npm run recette:architect -- <capture.json> --detail     # écrit chaque constat rendu, avec ses variants et ses layers
 *
 * Le fichier d'attentes est `{ "attentes": [ { code, type, famille, nombre, cible?, raison } ] }`. Une attente compte les
 * constats du même code, du même type et de la même famille de constats ; `cible`, quand elle est donnée, restreint ce compte aux constats
 * qui la nomment (nom d'un layer, d'un variant, ou valeur d'un fait : `token`, `wrapper`, `propriete`, `valeur`…). Un constat
 * qu'aucune attente ne couvre est un écart, comme une attente dont le nombre ne tombe pas juste. `raison` dit en une ligne
 * pourquoi le constat est juste ; le banc la recopie dans chaque écart. `reportees` liste les constats justes que la capture ne
 * permet pas de rendre (un champ qu'elle ne porte pas) : le banc les rappelle sans les compter, et une nouvelle capture les fait
 * passer dans `attentes`.
 */
import { readFileSync } from 'node:fs';

import type { Constat } from '@ucm-kit/core/controles';

import type { Contexte } from '../src/sandbox/contexte';
import { reinitialiserLAnalyse, traiter } from '../src/sandbox/analyse';
import type { CaptureArchitect } from '../src/sandbox/capture';
import { doubleDepuisCapture } from '../tests/outils/capture';

export interface Attente {
  readonly code: string;
  readonly type: string;
  readonly famille: string;
  readonly nombre: number;
  readonly cible?: string;
  readonly raison: string;
}

interface Fichier { capture: CaptureArchitect }

const nomsDe = (capture: CaptureArchitect, ids: readonly string[]): string[] =>
  ids.map((id) => capture.noeuds[id]?.proprietes.name).filter((nom): nom is string => typeof nom === 'string');

/** Ce qu'un constat désigne, en clair : les noms de ses variants et de ses layers, et chaque fait textuel ou numérique. */
export function ciblesDuConstat(constat: Constat, capture: CaptureArchitect): string[] {
  const faits = Object.values(constat.faits).map(String);
  return [...nomsDe(capture, constat.variants), ...nomsDe(capture, constat.layers), ...constat.variants, ...constat.layers, ...faits];
}

const cleDuGroupe = (constat: { readonly code: string; readonly type: string; readonly famille: string }): string => `${constat.code} ${constat.type} ${constat.famille}`;

/** Compare les constats aux attentes ; rend la liste des écarts, vide quand tout correspond. */
export function comparerAuxAttentes(constats: readonly Constat[], attentes: readonly Attente[], capture: CaptureArchitect): string[] {
  const ecarts: string[] = [];
  const couverts = new Set<Constat>();
  for (const attente of attentes) {
    const retenus = constats.filter((constat) => constat.code === attente.code && constat.type === attente.type && constat.famille === attente.famille
      && (attente.cible === undefined || ciblesDuConstat(constat, capture).some((cible) => cible === attente.cible)));
    for (const constat of retenus) couverts.add(constat);
    if (retenus.length !== attente.nombre) {
      ecarts.push(`${cleDuGroupe(attente)}${attente.cible ? ` [${attente.cible}]` : ''} : ${attente.nombre} attendu, ${retenus.length} rendu(s). Attendu parce que : ${attente.raison}`);
    }
  }
  for (const constat of constats) {
    if (couverts.has(constat)) continue;
    const phrase = Object.entries(constat.faits).slice(0, 4).map(([cle, valeur]) => `${cle}=${String(valeur)}`).join(', ');
    ecarts.push(`${cleDuGroupe(constat)} imprévu (${constat.id}) : ${phrase}`);
  }
  return ecarts;
}

/** Les groupes de constats rendus, avec leur compte, pour écrire un fichier d'attentes. */
export function grouperLesConstats(constats: readonly Constat[]): { groupe: string; nombre: number; exemple: string }[] {
  const groupes = new Map<string, { nombre: number; exemple: string }>();
  for (const constat of constats) {
    const cle = cleDuGroupe(constat);
    const connu = groupes.get(cle);
    if (connu) connu.nombre += 1;
    else groupes.set(cle, { nombre: 1, exemple: `${constat.id} ${JSON.stringify(constat.faits).slice(0, 200)}` });
  }
  return [...groupes].map(([groupe, { nombre, exemple }]) => ({ groupe, nombre, exemple }));
}

/** Les constats finaux de l'analyse complète de la capture, le résultat de la dernière demande. */
export async function constatsDeLaCapture(captureLue: CaptureArchitect): Promise<readonly Constat[]> {
  // La capture garde la sélection du moment : un clic sur un constat l'a pu déplacer vers un calque. L'analyse part du composant analysé.
  const page = captureLue.pages[captureLue.page];
  const capture: CaptureArchitect = { ...captureLue, pages: { ...captureLue.pages, [captureLue.page]: { ...page, selection: [captureLue.jeu] } } };
  const double = doubleDepuisCapture(capture);
  const globale = globalThis as { figma?: unknown };
  const precedent = globale.figma;
  globale.figma = double.figma;
  try {
    const envoyes: { type: string; constats?: readonly Constat[]; statut?: string }[] = [];
    const contexte: Contexte = {
      figma: double.figma as unknown as PluginAPI,
      envoyer: (message) => envoyes.push(message as never),
      surveillerLeDocument: () => [],
    };
    reinitialiserLAnalyse();
    await traiter({ type: 'analyser', demande: 1 }, contexte);
    const resultat = envoyes.find((message) => message.type === 'analyse');
    if (!resultat?.constats) throw new Error(`L’analyse rejouée ne rend pas de résultat (${envoyes.map(({ type }) => type).join(', ')}).`);
    return resultat.constats;
  } finally {
    globale.figma = precedent;
  }
}

async function main(): Promise<number> {
  const [chemin, ...options] = process.argv.slice(2);
  if (!chemin) throw new Error('Donner le chemin de la capture : npm run recette:architect -- _local/recettes/<capture>.json');
  const { capture } = JSON.parse(readFileSync(chemin, 'utf8')) as Fichier;
  const constats = await constatsDeLaCapture(capture);
  if (options.includes('--detail')) {
    for (const constat of constats) console.log(`${cleDuGroupe(constat)} | ${constat.id} | variants ${nomsDe(capture, constat.variants).join(' ; ')} | layers ${nomsDe(capture, constat.layers).join(' ; ')} | ${JSON.stringify(constat.faits)}`);
    return 0;
  }
  if (options.includes('--lister')) {
    console.log(JSON.stringify(grouperLesConstats(constats), null, 2));
    return 0;
  }
  const fichierDAttentes = chemin.replace(/\.json$/, '.attendus.json');
  const { attentes, reportees = [] } = JSON.parse(readFileSync(fichierDAttentes, 'utf8')) as { attentes: Attente[]; reportees?: Omit<Attente, 'nombre'>[] };
  const ecarts = comparerAuxAttentes(constats, attentes, capture);
  for (const { code, type, famille, cible, raison } of reportees) console.log(`Non vérifiée sur cette capture : ${code} ${type} ${famille}${cible ? ` [${cible}]` : ''}. ${raison}`);
  if (ecarts.length === 0) {
    console.log(`${constats.length} constat(s), ${attentes.length} attente(s) : aucun écart.`);
    return 0;
  }
  console.log(`${ecarts.length} écart(s) sur ${constats.length} constat(s) :`);
  for (const ecart of ecarts) console.log(`- ${ecart}`);
  return 1;
}

// Lancé par `tsx`, le fichier tourne ; importé par un test, il n'expose que ses fonctions.
if (require.main === module) main().then((code) => { process.exitCode = code; }, (erreur) => { console.error(erreur); process.exitCode = 1; });

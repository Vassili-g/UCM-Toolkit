/**
 * La mesure d'un cas de F7 et le tableau du rapport : chaque cas passe dans `controlerLAccessibilite` (C49 à C53) avec le niveau
 * qu'il déclare, puis son résultat est comparé à son oracle. Un cas dont un constat attendu est émis avec un rapport, un seuil, un
 * niveau, un type, des variants, un mode ou une couleur différents de l'oracle compte comme une correction inexacte. Une exception
 * du contrôle est un écart (colonne « Exceptions ») et le harnais continue.
 *
 * Un cas qui peut ne jamais finir (`risqueDeBoucle`) s'exécute dans un processus fils à délai : `mesurer.ts --sonde <cas>` rend ses
 * constats en JSON sur sa dernière ligne.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { controlerLAccessibilite, controlerLAccessibiliteParEtapes } from '../../../src/controles/accessibilite.js';
import type { Constat } from '../../../src/controles/index.js';
import { comparer } from '../commun/comparer.js';
import type { Ecart, ResultatDuCas, SorteDEcart } from '../commun/types.js';
import { cleDeConstat, HYPOTHESES, type AttenduAcc, type CasAccessibilite } from './cas.js';

export const messageDe = (erreur: unknown): string => (erreur instanceof Error ? erreur.message : String(erreur));

/** Le délai d'un cas à risque de boucle, en millisecondes. */
const DELAI_DE_SONDE = 8000;
export const MARQUE_DE_SONDE = 'SONDE-DE-CONSTATS:';

export interface Mesure {
  readonly cas: CasAccessibilite;
  readonly emis: readonly Constat[];
  readonly resultat: ResultatDuCas;
  readonly exception?: string;
}

// ---------------------------------------------------------------------------------------------------------------------------
// Détail d'un constat attendu

const normaliserLEtiquette = (etiquette: string): string => etiquette.split(', ').sort().join(', ');

/** Les différences entre un constat émis et le détail que l'attendu donne (rapport, seuil, niveau, type, variants, couleurs, modes, comptes). */
function differences(attendu: AttenduAcc, constat: Constat): string[] {
  const faits = constat.faits as Record<string, unknown>;
  const dit: string[] = [];
  const comparerLesValeurs = (nom: string, attenduValeur: unknown, emisValeur: unknown): void => {
    if (attenduValeur !== undefined && attenduValeur !== emisValeur) dit.push(`${nom} ${String(emisValeur)}, attendu ${String(attenduValeur)}`);
  };
  comparerLesValeurs('type', attendu.type, constat.type);
  comparerLesValeurs('rapport', attendu.rapport, faits.rapport);
  comparerLesValeurs('seuil', attendu.seuil, faits.seuil);
  comparerLesValeurs('niveau', attendu.niveau, faits.niveau);
  comparerLesValeurs('premier plan', attendu.premierPlan, faits.premierPlan);
  comparerLesValeurs('fond', attendu.fond, faits.fond);
  comparerLesValeurs('autres modes', attendu.autresModes, faits.autresModes);
  comparerLesValeurs('variable du thème', attendu.variableDuTheme, faits.variableDuTheme);
  comparerLesValeurs('taille', attendu.fontSize, faits.fontSize);
  comparerLesValeurs('variants exclus', attendu.exclus, faits.variantsExclus);
  comparerLesValeurs('combinaisons mesurées', attendu.combinaisonsMesurees, faits.combinaisonsMesurees);
  comparerLesValeurs('combinaisons non mesurées', attendu.combinaisonsNonMesurees, faits.combinaisonsNonMesurees);
  for (const [nom, valeur] of Object.entries(attendu.faitsEnPlus ?? {})) comparerLesValeurs(nom, valeur, faits[nom]);
  if (attendu.mode !== undefined && normaliserLEtiquette(String(faits.mode ?? '')) !== normaliserLEtiquette(attendu.mode)) dit.push(`mode « ${String(faits.mode)} », attendu « ${attendu.mode} »`);
  if (attendu.variants) {
    const [a, b] = [new Set(attendu.variants), new Set(constat.variants)];
    if (a.size !== b.size || [...a].some((v) => !b.has(v))) dit.push(`variants [${constat.variants.join(' ; ')}], attendu [${attendu.variants.join(' ; ')}]`);
  }
  if (attendu.rapports) {
    const lus = (JSON.parse(String(faits.rapports ?? '[]')) as [string, number][]).map(([etiquette, rapport]) => [normaliserLEtiquette(etiquette), rapport] as const);
    const voulus = attendu.rapports.map(([etiquette, rapport]) => [normaliserLEtiquette(etiquette), rapport] as const);
    const parEtiquette = new Map(lus);
    const pareils = attendu.rapportsOrdonnes
      ? lus.length === voulus.length && voulus.every(([etiquette, rapport], rang) => lus[rang][0] === etiquette && lus[rang][1] === rapport)
      : parEtiquette.size === voulus.length && voulus.every(([etiquette, rapport]) => parEtiquette.get(etiquette) === rapport);
    if (!pareils) dit.push(`rapports ${JSON.stringify(lus)}, attendu ${JSON.stringify(voulus)}`);
  }
  return dit;
}

// ---------------------------------------------------------------------------------------------------------------------------
// Mesure d'un cas

/** Les constats d'un cas qui peut ne jamais finir, rendus par un processus fils à délai ; une exception dit pourquoi il n'a rien rendu. */
function constatsParSonde(cas: CasAccessibilite, graine: number): { emis: Constat[] } | { exception: string } {
  const fils = spawnSync(process.execPath, ['--import', 'tsx', fileURLToPath(new URL('./mesurer.ts', import.meta.url)), '--sonde', cas.id, '--graine', String(graine)], {
    encoding: 'utf8', timeout: DELAI_DE_SONDE, maxBuffer: 64 * 1024 * 1024,
  });
  if (fils.error || fils.signal) return { exception: `le contrôle ne finit pas : délai de ${DELAI_DE_SONDE / 1000} s dépassé, processus arrêté` };
  const ligne = fils.stdout.split('\n').find((texte) => texte.startsWith(MARQUE_DE_SONDE));
  if (!ligne) return { exception: `la sonde n'a rien rendu : ${fils.stderr.trim().split('\n').pop() ?? 'sortie vide'}` };
  const rendu = JSON.parse(ligne.slice(MARQUE_DE_SONDE.length)) as { emis?: Constat[]; exception?: string };
  return rendu.exception === undefined ? { emis: rendu.emis ?? [] } : { exception: rendu.exception };
}

/** Les constats de la voie par étapes, celle que le plugin avance un pas à la fois. */
function constatsParEtapes(cas: CasAccessibilite): Constat[] {
  const { composant } = cas.entree.materialiser();
  const calcul = controlerLAccessibiliteParEtapes(composant.releve, composant.catalogue, { niveau: cas.entree.niveau });
  let etape = calcul.next();
  while (!etape.done) etape = calcul.next();
  return etape.value;
}

export function mesurerLeCas(cas: CasAccessibilite, graine: number): Mesure {
  const vide: ResultatDuCas = { cas: cas.id, famille: cas.famille, operateur: cas.operateur, verdict: cas.verdict, attendus: cas.attendus.length, detectes: 0, ecarts: [] };
  let emis: Constat[];
  try {
    if (cas.risqueDeBoucle) {
      const sonde = constatsParSonde(cas, graine);
      if ('exception' in sonde) return { cas, emis: [], resultat: vide, exception: sonde.exception };
      emis = sonde.emis;
    } else {
      const { composant } = cas.entree.materialiser();
      emis = controlerLAccessibilite(composant.releve, composant.catalogue, { niveau: cas.entree.niveau });
    }
  } catch (erreur) {
    return { cas, emis: [], resultat: vide, exception: messageDe(erreur) };
  }
  const compare = comparer(cas, emis, cleDeConstat);
  const ecarts: Ecart[] = [...compare.ecarts];
  const emisParCle = new Map<string, Constat>();
  for (const constat of emis) if (!emisParCle.has(`${constat.code}|${cleDeConstat(constat)}`)) emisParCle.set(`${constat.code}|${cleDeConstat(constat)}`, constat);
  let inexacts = 0;
  for (const attendu of cas.attendus) {
    const constat = emisParCle.get(`${attendu.code}|${attendu.cle}`);
    if (!constat) continue;
    const dit = differences(attendu, constat);
    if (dit.length === 0) continue;
    inexacts++;
    ecarts.push({ cas: cas.id, sorte: 'correction-inexacte', attendu, emis: constat, detail: `${attendu.code}|${attendu.cle} : ${dit.join(' ; ')}` });
  }
  const identifiants = new Map<string, number>();
  for (const constat of emis) identifiants.set(constat.id, (identifiants.get(constat.id) ?? 0) + 1);
  for (const [id, nombre] of identifiants) {
    if (nombre > 1) ecarts.push({ cas: cas.id, sorte: 'doublon', emis: emis.find((constat) => constat.id === id), detail: `${id} émis ${nombre} fois : l'identifiant n'est pas unique` });
  }
  if (cas.layersUniques) {
    for (const constat of emis.filter((entree) => new Set(entree.layers).size !== entree.layers.length)) {
      ecarts.push({ cas: cas.id, sorte: 'doublon', emis: constat, detail: `${constat.id} nomme ${constat.layers.length} layers dont ${new Set(constat.layers).size} distincts` });
    }
  }
  if (cas.operateur.startsWith('Q')) {
    try {
      if (JSON.stringify(constatsParEtapes(cas)) !== JSON.stringify(emis)) ecarts.push({ cas: cas.id, sorte: 'faux-constat', detail: 'la voie par étapes rend d\'autres constats que la voie directe' });
    } catch (erreur) {
      ecarts.push({ cas: cas.id, sorte: 'faux-constat', detail: `la voie par étapes lève : ${messageDe(erreur)}` });
    }
  }
  return { cas, emis, resultat: { ...compare, detectes: compare.detectes - inexacts, ecarts } };
}

// ---------------------------------------------------------------------------------------------------------------------------
// Tableau

export interface Ligne {
  operateur: string;
  cas: number;
  attendus: number;
  detectes: number;
  manques: number;
  fauxConstats: number;
  correctionsInexactes: number;
  exceptions: number;
  enAttente: number;
}

const ligneVide = (operateur: string): Ligne => ({ operateur, cas: 0, attendus: 0, detectes: 0, manques: 0, fauxConstats: 0, correctionsInexactes: 0, exceptions: 0, enAttente: 0 });
const sortes = (resultat: ResultatDuCas, ...liste: SorteDEcart[]): number => resultat.ecarts.filter((ecart) => liste.includes(ecart.sorte)).length;

/**
 * Une ligne par opérateur, puis une par lettre (S, G, O…) si `lettres`, puis le total. Les écarts d'un cas `mesure` vont dans
 * `enAttente` seulement.
 */
export function agreger(mesures: readonly Mesure[], lettres = true): Ligne[] {
  const lignes = new Map<string, Ligne>();
  const parLettre = new Map<string, Ligne>();
  const total = ligneVide('Total');
  const compter = (ligne: Ligne, { resultat, exception }: Mesure): void => {
    ligne.cas++;
    ligne.attendus += resultat.attendus;
    ligne.detectes += resultat.detectes;
    if (exception !== undefined) ligne.exceptions++;
    if (resultat.verdict === 'mesure') { ligne.enAttente += resultat.ecarts.length; return; }
    ligne.manques += sortes(resultat, 'manque');
    ligne.fauxConstats += sortes(resultat, 'faux-constat', 'doublon');
    ligne.correctionsInexactes += sortes(resultat, 'correction-inexacte', 'question-inexacte');
  };
  for (const mesure of mesures) {
    const { operateur } = mesure.cas;
    const ligne = lignes.get(operateur) ?? ligneVide(operateur);
    lignes.set(operateur, ligne);
    const lettre = parLettre.get(operateur[0]) ?? ligneVide(`Total ${operateur[0]}`);
    parLettre.set(operateur[0], lettre);
    for (const cible of lettres ? [ligne, lettre, total] : [ligne, total]) compter(cible, mesure);
  }
  if (!lettres) return [...lignes.values(), total];
  return [...[...parLettre.keys()].flatMap((initiale) => [...[...lignes.values()].filter((ligne) => ligne.operateur.startsWith(initiale)), parLettre.get(initiale)!]), total];
}

export const tableauMarkdown = (entete: readonly string[], rangees: readonly (readonly (string | number)[])[]): string =>
  [entete, entete.map(() => '---'), ...rangees.map((rangee) => rangee.map(String))].map((rangee) => `| ${rangee.join(' | ')} |`).join('\n');

export const tableau = (lignes: readonly Ligne[]): string => tableauMarkdown(
  ['Opérateur', 'Cas', 'Attendus', 'Détectés', 'Manqués', 'Faux constats', 'Corrections inexactes', 'Exceptions', 'En attente'],
  lignes.map((l) => [l.operateur, l.cas, l.attendus, l.detectes, l.manques, l.fauxConstats, l.correctionsInexactes, l.exceptions, l.enAttente]),
);

/** L'hypothèse de la section 6.1 et l'écart de l'inventaire que le cas déclare ; sans lien, « nouveau ». */
export function rattacher(cas: CasAccessibilite): string {
  const liens = [cas.hypothese ? HYPOTHESES[cas.hypothese] ?? cas.hypothese : undefined, cas.ecartConnu].filter((lien): lien is string => lien !== undefined);
  return liens.length ? liens.join(' ; ') : 'nouveau';
}

interface Groupe { readonly cas: CasAccessibilite; readonly sorte: string; readonly code: string; readonly nombre: number; readonly exemple: string }

/** Un cas peut émettre plusieurs écarts de même sorte : le rapport les range par (sorte, code) avec un exemple. */
function grouper(mesures: readonly Mesure[], verdict: 'attendu' | 'mesure'): Groupe[] {
  return mesures.filter(({ cas }) => cas.verdict === verdict).flatMap(({ cas, resultat }) => {
    const groupes = new Map<string, Groupe>();
    for (const ecart of resultat.ecarts) {
      const code = ecart.attendu?.code ?? ecart.emis?.code ?? '-';
      const cle = `${ecart.sorte}|${code}`;
      const connu = groupes.get(cle);
      groupes.set(cle, connu ? { ...connu, nombre: connu.nombre + 1 } : { cas, sorte: ecart.sorte, code, nombre: 1, exemple: ecart.detail });
    }
    return [...groupes.values()];
  });
}

const ligneDeGroupe = ({ cas, sorte, code, nombre, exemple }: Groupe): string =>
  `- ${cas.id} | ${sorte} | ${code}${nombre > 1 ? ` x${nombre}` : ''} | ${exemple} | ${rattacher(cas)}${cas.question ? ` | ${cas.question}` : ''}`;

/** Le corps d'une section : son tableau, ses écarts, ses exceptions et ses cas en attente. */
export function rapportDeSection(titre: string, mesures: readonly Mesure[], lettres = true): string[] {
  if (mesures.length === 0) return [];
  const ecarts = grouper(mesures, 'attendu').map(ligneDeGroupe);
  const attentes = grouper(mesures, 'mesure').map(ligneDeGroupe);
  const exceptions = mesures.filter((mesure) => mesure.exception !== undefined)
    .map(({ cas, exception }) => `- ${cas.id} | exception | ${exception} | ${rattacher(cas)}${cas.question ? ` | ${cas.question}` : ''}`);
  return [
    `${titre} (${mesures.length} cas)`, '', tableau(agreger(mesures, lettres)), '',
    `Écarts (${ecarts.length} groupes) : cas | sorte | code | détail | rattachement`, ...ecarts, '',
    `Exceptions (${exceptions.length}) : cas | exception | message | rattachement`, ...exceptions, '',
    `En attente (${attentes.length} groupes) : cas | sorte | code | détail | rattachement | question`, ...attentes, '',
  ];
}

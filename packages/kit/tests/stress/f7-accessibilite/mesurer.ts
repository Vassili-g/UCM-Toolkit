/**
 * Mesure du stress test F7 (accessibilité du mode Composant, lot des opérateurs S, G, O, F, M et Y). Chaque cas passe dans
 * `controlerLAccessibilite` (C49 à C53) avec le niveau qu'il déclare, puis son résultat est comparé à son oracle. Le rapport
 * s'écrit dans `_local/stress/f7-accessibilite/operateurs.txt` et `operateurs.json` (dossier ignoré par Git). Deux sections :
 *
 *   A  les 48 profils sRGB (P0 compris) : zéro constat C49 à C52, seul C53 sort ;
 *   B  les opérateurs sur P0 (Button, 48 variants, `Light` et `Dark`, fond opaque lié, niveau AA).
 *
 *   npx tsx packages/kit/tests/stress/f7-accessibilite/mesurer.ts [--operateur S1] [--cas S1-4] [--graine 7107]
 *
 * Une option de filtre n'écrit rien (le tableau va à l'écran), et `--cas` imprime en plus les constats émis et l'oracle. Le rapport ne
 * porte ni date ni durée, pour que deux exécutions donnent le même `.json`. Le harnais ne corrige rien : un écart du kit est un
 * résultat, une exception levée par un contrôle est un écart (colonne « Exceptions ») et le harnais continue.
 *
 * Un cas dont un constat attendu est émis avec un rapport, un seuil, un niveau, un type, des variants, un mode ou une couleur
 * différents de l'oracle compte comme une correction inexacte (colonne « Corrections inexactes »).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { controlerLAccessibilite } from '../../../src/controles/accessibilite.js';
import type { Constat } from '../../../src/controles/index.js';
import { comparer } from '../commun/comparer.js';
import type { Ecart, ResultatDuCas, SorteDEcart } from '../commun/types.js';
import { cleDeConstat, HYPOTHESES, type AttenduAcc, type CasAccessibilite } from './cas.js';
import { composantDeContraste, GRAINE_F7 } from './composantDeContraste.js';
import { tousLesCas } from './operateurs.js';
import { constatsDuProfil, constatsInterdits, composantDuProfil, PROFILS, PROFIL_P0 } from './profils.js';

const messageDe = (erreur: unknown): string => (erreur instanceof Error ? erreur.message : String(erreur));

interface Mesure {
  readonly cas: CasAccessibilite;
  readonly emis: readonly Constat[];
  readonly resultat: ResultatDuCas;
  readonly exception?: string;
  readonly duree: number;
}

// ---------------------------------------------------------------------------------------------------------------------------
// Détail d'un constat attendu

const normaliserLEtiquette = (etiquette: string): string => etiquette.split(', ').sort().join(', ');

/** Les différences entre un constat émis et le détail que l'attendu donne (rapport, seuil, niveau, type, variants, couleurs, modes). */
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

function mesurerLeCas(cas: CasAccessibilite): Mesure {
  const debut = Date.now();
  const vide: ResultatDuCas = { cas: cas.id, famille: cas.famille, operateur: cas.operateur, verdict: cas.verdict, attendus: cas.attendus.length, detectes: 0, ecarts: [] };
  let emis: Constat[];
  try {
    const { composant } = cas.entree.materialiser();
    emis = controlerLAccessibilite(composant.releve, composant.catalogue, { niveau: cas.entree.niveau });
  } catch (erreur) {
    return { cas, emis: [], resultat: vide, exception: messageDe(erreur), duree: Date.now() - debut };
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
  return { cas, emis, resultat: { ...compare, detectes: compare.detectes - inexacts, ecarts }, duree: Date.now() - debut };
}

// ---------------------------------------------------------------------------------------------------------------------------
// Rapport

interface Ligne {
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

/** Une ligne par opérateur, puis une par lettre (S, G, O…), puis le total. Les écarts d'un cas `mesure` vont dans `enAttente` seulement. */
function agreger(mesures: readonly Mesure[]): Ligne[] {
  const lignes = new Map<string, Ligne>();
  const lettres = new Map<string, Ligne>();
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
    const lettre = lettres.get(operateur[0]) ?? ligneVide(`Total ${operateur[0]}`);
    lettres.set(operateur[0], lettre);
    for (const cible of [ligne, lettre, total]) compter(cible, mesure);
  }
  const rangees: Ligne[] = [];
  for (const [initiale, lettre] of lettres) {
    rangees.push(...[...lignes.values()].filter((ligne) => ligne.operateur.startsWith(initiale)), lettre);
  }
  return [...rangees, total];
}

const tableauMarkdown = (entete: readonly string[], rangees: readonly (readonly (string | number)[])[]): string =>
  [entete, entete.map(() => '---'), ...rangees.map((rangee) => rangee.map(String))].map((rangee) => `| ${rangee.join(' | ')} |`).join('\n');

const tableau = (lignes: readonly Ligne[]): string => tableauMarkdown(
  ['Opérateur', 'Cas', 'Attendus', 'Détectés', 'Manqués', 'Faux constats', 'Corrections inexactes', 'Exceptions', 'En attente'],
  lignes.map((l) => [l.operateur, l.cas, l.attendus, l.detectes, l.manques, l.fauxConstats, l.correctionsInexactes, l.exceptions, l.enAttente]),
);

/** L'hypothèse de la section 6.1 et l'écart de l'inventaire que le cas déclare ; sans lien, « nouveau ». */
function rattacher(cas: CasAccessibilite): string {
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

// ---------------------------------------------------------------------------------------------------------------------------
// Profils

interface MesureDeProfil {
  readonly id: string;
  readonly description: string;
  readonly variants: number;
  /** Les constats par code, C53 compris. */
  readonly constats: Record<string, number>;
  /** Les constats que P1 interdit (tous sauf C53). */
  readonly interdits: number;
  readonly exception?: string;
}

function mesurerLeProfil(id: string, fabriquer: () => ReturnType<typeof composantDuProfil>): MesureDeProfil {
  try {
    const composant = fabriquer();
    const constats: Record<string, number> = {};
    const tous = constatsDuProfil(composant);
    for (const constat of tous) constats[constat.code] = (constats[constat.code] ?? 0) + 1;
    const { forme, modes, fond, niveau } = composant.profil;
    return { id, description: `${forme}, ${modes} mode${modes > 1 ? 's' : ''}, fond ${fond}, ${niveau}`, variants: composant.releve.variants.length, constats, interdits: constatsInterdits(tous).length };
  } catch (erreur) {
    return { id, description: '', variants: 0, constats: {}, interdits: 0, exception: messageDe(erreur) };
  }
}

const constatsEnTexte = (constats: Record<string, number>): string =>
  Object.entries(constats).sort(([a], [b]) => a.localeCompare(b, 'fr', { numeric: true })).map(([code, nombre]) => `${code} x${nombre}`).join(', ') || '-';

function rapportDesProfils(profils: readonly MesureDeProfil[]): string[] {
  const nonVides = profils.filter((profil) => profil.exception !== undefined || profil.interdits > 0);
  return [
    `Profils (${profils.length}, P0 = ${PROFIL_P0.id}) : ${profils.length - nonVides.length} sans constat C49 à C52, ${nonVides.length} non vides`,
    '',
    tableauMarkdown(
      ['Profil', 'Description', 'Variants', 'Constats', 'Constats C49 à C52'],
      profils.map((profil) => [profil.id, profil.description, profil.variants, profil.exception ? `exception : ${profil.exception}` : constatsEnTexte(profil.constats), profil.interdits]),
    ),
    '',
    `Profils non vides (${nonVides.length}) : profil | constats`,
    ...nonVides.map((profil) => `- ${profil.id} | ${profil.exception ? `exception : ${profil.exception}` : constatsEnTexte(profil.constats)}`),
    '',
  ];
}

function rapportTexte(graine: number, mesures: readonly Mesure[], profils: readonly MesureDeProfil[]): string {
  const ecarts = grouper(mesures, 'attendu').map(ligneDeGroupe);
  const attentes = grouper(mesures, 'mesure').map(ligneDeGroupe);
  const exceptions = mesures.filter((mesure) => mesure.exception !== undefined)
    .map(({ cas, exception }) => `- ${cas.id} | exception | ${exception} | ${rattacher(cas)}${cas.question ? ` | ${cas.question}` : ''}`);
  return [
    `Stress test F7, accessibilité (graine ${graine} ; sRGB seul ; opérateurs sur P0 = ${PROFIL_P0.id}, Button à 48 variants)`,
    '',
    ...(mesures.length ? [
      `Section B, opérateurs S, G, O, F, M et Y (${mesures.length} cas)`,
      '',
      tableau(agreger(mesures)),
      '',
      `Écarts (${ecarts.length} groupes) : cas | sorte | code | détail | rattachement`,
      ...ecarts,
      '',
      `Exceptions (${exceptions.length}) : cas | exception | message | rattachement`,
      ...exceptions,
      '',
      `En attente (${attentes.length} groupes) : cas | sorte | code | détail | rattachement | question`,
      ...attentes,
      '',
    ] : []),
    ...(profils.length ? ['Section A, profils', '', ...rapportDesProfils(profils)] : []),
  ].join('\n');
}

function resumeDuConstat(constat: Constat): unknown {
  const { id, code, type, faits, variants } = constat;
  return { id, code, type, faits, ...(variants.length ? { variants: variants.length > 4 ? [...variants.slice(0, 4), `… ${variants.length} au total`] : variants } : {}) };
}

function imprimerLeCas({ cas, emis, resultat, exception }: Mesure): void {
  console.log(`${cas.id} (${cas.verdict}${cas.question ? ` ${cas.question}` : ''}, niveau ${cas.entree.niveau}) : ${cas.entree.description}`);
  console.log('\nConstats émis (hors C53)');
  const jugeables = emis.filter((constat) => constat.code !== 'C53');
  for (const constat of jugeables.slice(0, 60)) console.log(`  ${JSON.stringify(resumeDuConstat(constat))}`);
  if (jugeables.length === 0) console.log('  aucun');
  console.log('\nOracle');
  for (const attendu of cas.attendus.slice(0, 60)) console.log(`  ${JSON.stringify(attendu)}`);
  if (cas.attendus.length === 0) console.log('  aucun constat');
  console.log('\nÉcarts');
  if (exception !== undefined) console.log(`  exception | ${exception}`);
  for (const ecart of resultat.ecarts.slice(0, 60)) console.log(`  ${ecart.sorte} | ${ecart.detail} | ${rattacher(cas)}`);
  if (resultat.ecarts.length === 0 && exception === undefined) console.log('  aucun');
}

function option(nom: string): string | undefined {
  const rang = process.argv.indexOf(nom);
  return rang >= 0 ? process.argv[rang + 1] : undefined;
}

function principal(): void {
  const debut = Date.now();
  const graine = Number(option('--graine') ?? GRAINE_F7);
  const operateur = option('--operateur');
  const identifiant = option('--cas');
  const filtre = operateur !== undefined || identifiant !== undefined;
  const base = composantDeContraste(PROFIL_P0, graine);
  const cas = tousLesCas(base, graine).filter((entree) => (operateur === undefined || entree.operateur === operateur) && (identifiant === undefined || entree.id === identifiant));
  if (filtre && cas.length === 0) {
    console.error(`Aucun cas pour ${identifiant ?? operateur}.`);
    process.exitCode = 1;
    return;
  }
  const mesures = cas.map(mesurerLeCas);
  const profils = filtre ? [] : PROFILS.map((profil) => mesurerLeProfil(profil.id, () => composantDuProfil(profil, graine)));
  const texte = rapportTexte(graine, mesures, profils);
  if (identifiant !== undefined) imprimerLeCas(mesures[0]);
  if (filtre) {
    console.log(`\n${texte}`);
    return;
  }
  const dossier = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../../_local/stress/f7-accessibilite');
  mkdirSync(dossier, { recursive: true });
  writeFileSync(path.join(dossier, 'operateurs.txt'), texte);
  const json = {
    graine,
    operateurs: agreger(mesures),
    cas: mesures.map(({ cas: c, resultat, exception }) => ({
      id: c.id, operateur: c.operateur, verdict: c.verdict, ...(c.question ? { question: c.question } : {}),
      attendus: resultat.attendus, detectes: resultat.detectes, ...(exception === undefined ? {} : { exception }),
      ecarts: resultat.ecarts.map((ecart) => ({ sorte: ecart.sorte, detail: ecart.detail, rattachement: rattacher(c) })),
    })),
    profils,
  };
  writeFileSync(path.join(dossier, 'operateurs.json'), `${JSON.stringify(json, null, 2)}\n`);
  console.log(texte);
  console.log(`Écrit dans ${dossier} en ${((Date.now() - debut) / 1000).toFixed(1)} s.`);
}

principal();

/**
 * Mesure du stress test F5 et F6 (variants, nommage des tokens, typographie et icônes). Chaque cas passe dans les contrôles qu'il
 * déclare (`controlerNommage` pour C7 à C13, `controlerOublis` pour C31 à C33, `controlerLaTypographie` pour C64 à C67), puis son
 * résultat est comparé à son oracle. Le rapport s'écrit dans `_local/stress/f5-variants/operateurs.txt` et `operateurs.json` (dossier
 * ignoré par Git). Trois sections :
 *
 *   A  les 180 faux positifs (FP1 à FP4), et P0 avec les 60 profils de base (zéro constat, lecture complète des tokens) ;
 *   B  les 371 opérateurs : A, V, Q, M, O sur P0 (F5, 270 cas) et S, I sur la base de 12 variants (F6, 101 cas) ;
 *   C  les 32 interactions déclarées, 16 couples sur P0 et p18.
 *
 * Les relations métamorphiques (ordre des variants mélangé, écriture du nom d'axe changée) tournent à part, sur les sections A et B.
 * L'opérateur I6 compare, pour chaque layer, les trois définitions d'icône du kit (C66, C49, C17) entre elles et à l'attendu.
 *
 *   npx tsx packages/kit/tests/stress/f5-variants/mesurer.ts [--section A|B|C] [--famille F5|F6] [--operateur V1] [--cas V1-4] [--profil p07] [--graine 7105]
 *
 * Une option de filtre n'écrit rien (le tableau va à l'écran), et `--cas` imprime en plus les constats émis et l'oracle. Le rapport ne
 * porte ni date ni durée, pour que deux exécutions donnent le même `.json` ; les durées vont à l'écran et dans la section « Durées »
 * du `.txt`. Le harnais ne corrige rien. Un écart du kit est un résultat, pas un échec, et une exception levée par un contrôle est un
 * écart (colonne « Exceptions ») que le harnais attrape sans s'arrêter.
 *
 * Un cas qui porte un budget de durée (M3) tourne jusqu'à dix fois ce budget : au-delà, le harnais l'abandonne et le note comme une
 * exception ; en deçà, un dépassement du budget est compté dans la colonne « Hors budget » et la comparaison à l'oracle a lieu.
 * Un constat de C67 qui dit seulement une limite (`limite: true`) n'est jugé que si le cas l'attend.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Constat } from '../../../src/controles/index.js';
import { axeDePropriete } from '../../../src/controles/nommage.js';
import { comparer } from '../commun/comparer.js';
import type { Ecart, ResultatDuCas, SorteDEcart } from '../commun/types.js';
import { HYPOTHESES, type CasDeVariants } from './cas.js';
import { composantF6, composantP0, constatsDeLaPortee, GRAINE_PAR_DEFAUT, verifierLaLecture } from './composantDeBase.js';
import { fauxPositifs } from './fauxPositifs.js';
import { interactions } from './interactions.js';
import { tousLesCasDeLaSectionB } from './operateurs.js';
import type { ComposantDeBase } from './portF3.js';
import { PROFILS, composantDuProfil, type ProfilDeVariants } from './profils.js';
import { controlesDuCas, executerLesControles, RELATIONS, verifierLesRelations, type EcartDeRelation, type Relation, type ResultatDesRelations } from './relations.js';
import { estUneDefinition, verdictsDesTroisFonctions, type CasDeDefinition, type VerdictsDIcone } from './typo/definitionsDIcone.js';
import { cleDeConstatDuHarnais, HYPOTHESES_F6, type CasMixte } from './typo/operateursTexte.js';

const messageDe = (erreur: unknown): string => (erreur instanceof Error ? erreur.message : String(erreur));

type Section = 'A' | 'B' | 'C';
const SECTIONS: readonly Section[] = ['A', 'B', 'C'];
const TITRES: Readonly<Record<Section, string>> = { A: 'Section A, faux positifs', B: 'Section B, opérateurs F5 et F6', C: 'Section C, interactions déclarées' };

interface Mesure {
  readonly section: Section;
  readonly cas: CasDeVariants;
  readonly emis: readonly Constat[];
  readonly resultat: ResultatDuCas;
  readonly exception?: string;
  readonly duree: number;
  readonly horsBudget: boolean;
  readonly verdicts?: VerdictsDIcone;
  readonly relations?: ResultatDesRelations;
}

const sortesDe = (resultat: ResultatDuCas, ...sortes: SorteDEcart[]): number => resultat.ecarts.filter((ecart) => sortes.includes(ecart.sorte)).length;
const resultatVide = (cas: CasDeVariants, attendus = 0): ResultatDuCas => ({ cas: cas.id, famille: cas.famille, operateur: cas.operateur, verdict: cas.verdict, attendus, detectes: 0, ecarts: [] });

function mesurerLaLecture(section: Section, cas: CasDeVariants): Mesure {
  const { nom, attendu } = cas.entree.lecture!;
  const lu = axeDePropriete(nom);
  const ecarts: Ecart[] = [];
  if (attendu !== undefined && lu !== attendu) ecarts.push({ cas: cas.id, sorte: 'manque', detail: `axeDePropriete("${nom}") rend ${lu ?? 'undefined'}, attendu ${attendu}` });
  if (attendu === undefined && lu !== undefined) ecarts.push({ cas: cas.id, sorte: 'faux-constat', detail: `axeDePropriete("${nom}") rend ${lu}, attendu undefined` });
  const attendus = attendu === undefined ? 0 : 1;
  const detectes = attendus === 1 && lu === attendu ? 1 : 0;
  return { section, cas, emis: [], resultat: { ...resultatVide(cas, attendus), detectes, ecarts }, duree: 0, horsBudget: false };
}

const FONCTIONS_D_ICONE = [['c66', 'C66'], ['c49', 'C49'], ['c17', 'C17']] as const;

/** I6 : chacune des trois fonctions d'icône doit rendre le verdict attendu ; un désaccord est un manque (icône ignorée) ou un faux constat (icône inventée). */
function mesurerLaDefinition(section: Section, cas: CasDeDefinition, baseF6: ComposantDeBase): Mesure {
  const { definition } = cas;
  const debut = Date.now();
  try {
    const verdicts = verdictsDesTroisFonctions(baseF6, definition);
    const ecarts: Ecart[] = [];
    for (const [fonction, code] of FONCTIONS_D_ICONE) {
      if (verdicts[fonction] === definition.estUneIcone) continue;
      ecarts.push({
        cas: cas.id, sorte: definition.estUneIcone ? 'manque' : 'faux-constat', attendu: { code, cle: definition.nom, forme: 'a-faire' },
        detail: `${code} juge « ${definition.nom} » (${definition.type}) ${verdicts[fonction] ? 'icône' : 'non-icône'}, attendu ${definition.estUneIcone ? 'icône' : 'non-icône'}`,
      });
    }
    return { section, cas, emis: [], resultat: { ...resultatVide(cas, 3), detectes: 3 - ecarts.length, ecarts }, duree: Date.now() - debut, horsBudget: false, verdicts };
  } catch (erreur) {
    return { section, cas, emis: [], resultat: resultatVide(cas, 3), exception: messageDe(erreur), duree: Date.now() - debut, horsBudget: false };
  }
}

/** Un constat de C67 qui ne fait que dire une limite n'est jugé que si le cas l'attend. */
function sansLesLimitesNonAttendues(emis: readonly Constat[], cas: CasDeVariants): Constat[] {
  const attendus = new Set(cas.attendus.map((attendu) => `${attendu.code}|${attendu.cle}`));
  return emis.filter((constat) => !(constat.code === 'C67' && constat.limite === true && !attendus.has(`C67|${cleDeConstatDuHarnais(constat)}`)));
}

function mesurerLeCas(section: Section, cas: CasDeVariants, baseF6: ComposantDeBase): Mesure {
  if (estUneDefinition(cas)) return mesurerLaDefinition(section, cas, baseF6);
  if (cas.entree.lecture) return mesurerLaLecture(section, cas);
  const debut = Date.now();
  let attendus = 0;
  try {
    attendus = cas.attendus.length;
  } catch (erreur) {
    return { section, cas, emis: [], resultat: resultatVide(cas), exception: `oracle : ${messageDe(erreur)}`, duree: 0, horsBudget: false };
  }
  const vide = resultatVide(cas, attendus);
  const budget = cas.entree.budgetMs;
  const limite = budget === undefined ? 120_000 : budget * 10;
  let emis: Constat[];
  let composant: ComposantDeBase;
  try {
    ({ composant } = cas.entree.materialiser!());
    const rendu = executerLesControles(composant, controlesDuCas(cas), limite);
    if ('abandonne' in rendu) {
      return { section, cas, emis: [], resultat: vide, exception: `${rendu.abandonne} abandonné après ${limite} ms`, duree: Date.now() - debut, horsBudget: true };
    }
    emis = rendu.constats;
  } catch (erreur) {
    return { section, cas, emis: [], resultat: vide, exception: messageDe(erreur), duree: Date.now() - debut, horsBudget: false };
  }
  const duree = Date.now() - debut;
  const retenus = sansLesLimitesNonAttendues(emis, cas);
  const compare = comparer(cas, retenus, cleDeConstatDuHarnais);
  const ecarts = [...compare.ecarts];
  const identifiants = new Map<string, number>();
  for (const constat of retenus) identifiants.set(constat.id, (identifiants.get(constat.id) ?? 0) + 1);
  for (const [id, nombre] of identifiants) {
    if (nombre > 1 && !ecarts.some((ecart) => ecart.sorte === 'doublon' && ecart.emis?.id === id)) {
      ecarts.push({ cas: cas.id, sorte: 'doublon', emis: retenus.find((constat) => constat.id === id), detail: `${id} émis ${nombre} fois : l'identifiant n'est pas unique` });
    }
  }
  if ((cas as Partial<CasMixte>).verifierLaLecture) {
    const lecture = verifierLaLecture(composant);
    if (lecture.sansLecture.length > 0) ecarts.push({ cas: cas.id, sorte: 'faux-constat', detail: `lecture : ${lecture.sansLecture.length} tokens ne se lisent pas, dont ${lecture.sansLecture[0]}` });
    if (lecture.malLus.length > 0) ecarts.push({ cas: cas.id, sorte: 'faux-constat', detail: `lecture : ${lecture.malLus.length} tokens ont un segment d'axe lu avec un autre rôle que celui du corpus, dont ${lecture.malLus[0]}` });
  }
  const manques = ecarts.filter((ecart) => ecart.sorte === 'manque').length;
  return { section, cas, emis, resultat: { ...compare, detectes: compare.attendus - manques, ecarts }, duree, horsBudget: budget !== undefined && duree > budget };
}

const TOUTES_LES_HYPOTHESES: Readonly<Record<string, string>> = { ...HYPOTHESES, ...HYPOTHESES_F6 };

/**
 * Ce à quoi un écart se rattache : l'hypothèse et l'écart de l'inventaire que le cas déclare, puis le N de `MESURE-DES-FAILLES.md`
 * que la nature de l'écart désigne. Un écart de p18 vient de l'axe `Kind`, dont les valeurs sont des termes de palette (hypothèse 2) ;
 * un C12 ou un C13 attendu et absent est N-34 ; un C17 de I6 est H18. Sans lien, l'écart est « nouveau ».
 */
function rattacher(cas: CasDeVariants, ecart?: { sorte: string; code: string }): string {
  const hypotheses = new Set([cas.hypothese, ...(ecart?.code === 'C17' && cas.operateur === 'I6' ? ['H18'] : []), ...(cas.id.endsWith('-p18') ? ['H2'] : [])]);
  const notes = new Set<string>();
  if (ecart?.sorte === 'manque' && (ecart.code === 'C12' || ecart.code === 'C13')) notes.add('N-34');
  for (const hypothese of hypotheses) {
    const note = hypothese && N_DE_L_HYPOTHESE[hypothese];
    if (note) notes.add(note);
  }
  if (cas.id === 'O1-2') notes.add('N-40');
  const liens = [...[...hypotheses].map((h) => (h ? TOUTES_LES_HYPOTHESES[h] : undefined)), cas.ecartConnu, ...notes].filter((lien): lien is string => lien !== undefined);
  return liens.length ? liens.join(' ; ') : 'nouveau';
}

/** Les N de `MESURE-DES-FAILLES.md` (lot 1) qui confirment une hypothèse de la section 6.1. */
const N_DE_L_HYPOTHESE: Readonly<Record<string, string>> = { H2: 'N-36', H5: 'N-35', H6: 'N-37', H10: 'N-38', H11: 'N-39', H8: 'E-44' };

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
  horsBudget: number;
}

const ligneVide = (operateur: string): Ligne => ({ operateur, cas: 0, attendus: 0, detectes: 0, manques: 0, fauxConstats: 0, correctionsInexactes: 0, exceptions: 0, enAttente: 0, horsBudget: 0 });

/** Les écarts d'un cas `mesure` vont dans `enAttente` seulement ; un doublon compte comme un faux constat et une question inexacte comme une correction inexacte. */
function agreger(mesures: readonly Mesure[], totauxParFamille: readonly string[] = []): Ligne[] {
  const lignes = new Map<string, Ligne>();
  const compter = (ligne: Ligne, { resultat, exception, horsBudget }: Mesure): void => {
    ligne.cas++;
    ligne.attendus += resultat.attendus;
    ligne.detectes += resultat.detectes;
    if (exception !== undefined) ligne.exceptions++;
    if (horsBudget) ligne.horsBudget++;
    if (resultat.verdict === 'mesure') { ligne.enAttente += resultat.ecarts.length; return; }
    ligne.manques += sortesDe(resultat, 'manque');
    ligne.fauxConstats += sortesDe(resultat, 'faux-constat', 'doublon');
    ligne.correctionsInexactes += sortesDe(resultat, 'correction-inexacte', 'question-inexacte');
  };
  const total = ligneVide('Total');
  const parFamille = new Map(totauxParFamille.map((famille) => [famille, ligneVide(`Total ${famille}`)]));
  for (const mesure of mesures) {
    const ligne = lignes.get(mesure.cas.operateur) ?? ligneVide(mesure.cas.operateur);
    lignes.set(mesure.cas.operateur, ligne);
    compter(ligne, mesure);
    compter(total, mesure);
    const famille = parFamille.get(mesure.cas.famille);
    if (famille) compter(famille, mesure);
  }
  return [...lignes.values(), ...[...parFamille.values()].filter((ligne) => ligne.cas > 0), total];
}

const tableauMarkdown = (entete: readonly string[], rangees: readonly (readonly (string | number)[])[]): string =>
  [entete, entete.map(() => '---'), ...rangees.map((rangee) => rangee.map(String))].map((rangee) => `| ${rangee.join(' | ')} |`).join('\n');

function tableau(lignes: readonly Ligne[]): string {
  return tableauMarkdown(
    ['Opérateur', 'Cas', 'Attendus', 'Détectés', 'Manqués', 'Faux constats', 'Corrections inexactes', 'Exceptions', 'En attente', 'Hors budget'],
    lignes.map((l) => [l.operateur, l.cas, l.attendus, l.detectes, l.manques, l.fauxConstats, l.correctionsInexactes, l.exceptions, l.enAttente, l.horsBudget]),
  );
}

interface GroupeDEcarts { readonly cas: CasDeVariants; readonly sorte: string; readonly code: string; readonly nombre: number; readonly exemple: string }

/** Un cas peut émettre des centaines de constats de même sorte : le rapport les range par (sorte, code) avec un exemple. */
function grouper(mesures: readonly Mesure[], verdict: 'attendu' | 'mesure'): GroupeDEcarts[] {
  return mesures.filter(({ cas }) => cas.verdict === verdict).flatMap(({ cas, resultat }) => {
    const groupes = new Map<string, GroupeDEcarts>();
    for (const ecart of resultat.ecarts) {
      const code = ecart.attendu?.code ?? ecart.emis?.code ?? '-';
      const cle = `${ecart.sorte}|${code}`;
      const connu = groupes.get(cle);
      groupes.set(cle, connu ? { ...connu, nombre: connu.nombre + 1 } : { cas, sorte: ecart.sorte, code, nombre: 1, exemple: ecart.detail });
    }
    return [...groupes.values()];
  });
}

const ligneDeGroupe = ({ cas, sorte, code, nombre, exemple }: GroupeDEcarts): string =>
  `- ${cas.id} | ${sorte} | ${code} x${nombre} | ${exemple} | ${rattacher(cas, { sorte, code })}${cas.question ? ` | ${cas.question}` : ''}`;

// ---------------------------------------------------------------------------------------------------------------------------
// Profils (FP1, détail)

interface MesureDeProfil {
  readonly id: string;
  readonly description: string;
  readonly variants: number;
  readonly constats: Record<string, number>;
  readonly sansLecture: number;
  readonly malLus: number;
  readonly exception?: string;
}

function mesurerLeProfil(id: string, description: string, fabriquer: () => ReturnType<typeof composantP0>): MesureDeProfil {
  try {
    const composant = fabriquer();
    const constats: Record<string, number> = {};
    for (const constat of constatsDeLaPortee(composant.releve, composant.catalogue)) constats[constat.code] = (constats[constat.code] ?? 0) + 1;
    const lecture = verifierLaLecture(composant);
    return { id, description, variants: composant.releve.variants.length, constats, sansLecture: lecture.sansLecture.length, malLus: lecture.malLus.length };
  } catch (erreur) {
    return { id, description, variants: 0, constats: {}, sansLecture: 0, malLus: 0, exception: messageDe(erreur) };
  }
}

const descriptionDuProfil = (profil: ProfilDeVariants): string => `${profil.jeu} ${profil.composant}, nom ${profil.ecritureDuNom}, valeurs ${profil.ecritureDesValeurs}`;

const nonVide = (profil: MesureDeProfil): boolean =>
  profil.exception !== undefined || Object.keys(profil.constats).length > 0 || profil.sansLecture > 0 || profil.malLus > 0;

const constatsEnTexte = (constats: Record<string, number>): string =>
  Object.entries(constats).sort(([a], [b]) => a.localeCompare(b, 'fr', { numeric: true })).map(([code, nombre]) => `${code} x${nombre}`).join(', ') || '-';

function rapportDesProfils(profils: readonly MesureDeProfil[]): string[] {
  const vides = profils.filter((profil) => !nonVide(profil)).length;
  const nonVides = profils.filter(nonVide);
  return [
    `Profils (P0 et ${profils.length - 1} profils de base) : ${vides} sans constat et à lecture complète, ${nonVides.length} non vides`,
    '',
    tableauMarkdown(
      ['Profil', 'Description', 'Variants', 'Constats', 'Tokens sans lecture', 'Tokens mal lus'],
      profils.map((profil) => [profil.id, profil.description, profil.variants, profil.exception ? `exception : ${profil.exception}` : constatsEnTexte(profil.constats), profil.sansLecture, profil.malLus]),
    ),
    '',
    `Profils non vides (${nonVides.length}) : profil | constats | tokens sans lecture | tokens mal lus`,
    ...nonVides.map((profil) => `- ${profil.id} | ${profil.exception ? `exception : ${profil.exception}` : constatsEnTexte(profil.constats)} | ${profil.sansLecture} | ${profil.malLus}`),
    '',
  ];
}

// ---------------------------------------------------------------------------------------------------------------------------
// Relations et définitions d'icône

interface LigneDeRelation { readonly relation: Relation; cas: number; applicables: number; ecarts: number; exceptions: number }

function lignesDeRelations(mesures: readonly Mesure[]): LigneDeRelation[] {
  return RELATIONS.map((relation) => {
    const ligne: LigneDeRelation = { relation, cas: 0, applicables: 0, ecarts: 0, exceptions: 0 };
    for (const { relations } of mesures) {
      if (!relations) continue;
      ligne.cas++;
      if (relations.applicables[relation]) ligne.applicables++;
      ligne.ecarts += relations.ecarts.filter((ecart) => ecart.relation === relation).length;
      ligne.exceptions += relations.exceptions.filter((message) => message.startsWith(`${relation} :`)).length;
    }
    return ligne;
  });
}

function rapportDesRelations(mesures: readonly Mesure[]): string[] {
  const lignes = lignesDeRelations(mesures);
  const ecarts: { ecart: EcartDeRelation; cas: CasDeVariants }[] = mesures.flatMap(({ cas, relations }) => (relations?.ecarts ?? []).map((ecart) => ({ ecart, cas })));
  const exceptions = mesures.flatMap(({ cas, relations }) => (relations?.exceptions ?? []).map((message) => `- ${cas.id} | ${message}`));
  return [
    'Relations métamorphiques (sections A et B ; les cas A1, A2 et I6 n\'ont pas de composant)',
    '',
    tableauMarkdown(['Relation', 'Cas passés', 'Applicables', 'Écarts', 'Exceptions'], lignes.map((l) => [l.relation, l.cas, l.applicables, l.ecarts, l.exceptions])),
    '',
    `Écarts de relation (${ecarts.length}) : cas | relation | détail | rattachement`,
    ...ecarts.map(({ ecart, cas }) => `- ${ecart.cas} | ${ecart.relation} | ${ecart.detail} | ${rattacher(cas)}`),
    '',
    `Exceptions de relation (${exceptions.length}) : cas | message`,
    ...exceptions,
    '',
  ];
}

function rapportDesDefinitions(mesures: readonly Mesure[]): string[] {
  const definitions = mesures.filter((mesure): mesure is Mesure & { cas: CasDeDefinition; verdicts: VerdictsDIcone } => estUneDefinition(mesure.cas) && mesure.verdicts !== undefined);
  if (definitions.length === 0) return [];
  const oui = (valeur: boolean): string => (valeur ? 'icône' : 'non');
  const accordent = (v: VerdictsDIcone): boolean => v.c66 === v.c49 && v.c49 === v.c17;
  const divergentes = definitions.filter(({ verdicts }) => !accordent(verdicts));
  return [
    `Définitions d'icône, I6 (E-26) : ${definitions.length} layers, les trois fonctions s'accordent sur ${definitions.length - divergentes.length}, divergent sur ${divergentes.length}`,
    '',
    tableauMarkdown(
      ['Cas', 'Layer', 'Type', 'Instance', 'Attendu', 'Verdict', 'C66', 'C49', 'C17', 'Accord'],
      definitions.map(({ cas, verdicts }) => [
        cas.id, cas.definition.nom, cas.definition.type, cas.definition.instance ?? '-', oui(cas.definition.estUneIcone), cas.verdict,
        oui(verdicts.c66), oui(verdicts.c49), oui(verdicts.c17), accordent(verdicts) ? 'oui' : 'non',
      ]),
    ),
    '',
  ];
}

// ---------------------------------------------------------------------------------------------------------------------------
// Rapport

function rapportTexte(graine: number, mesures: readonly Mesure[], profils: readonly MesureDeProfil[], avecRelations: boolean): string {
  const attentes = grouper(mesures, 'mesure').map(ligneDeGroupe);
  const ecarts = grouper(mesures, 'attendu').map(ligneDeGroupe);
  const exceptions = mesures.filter((mesure) => mesure.exception !== undefined)
    .map(({ cas, exception }) => `- ${cas.id} | exception | ${exception} | ${cas.verdict === 'mesure' ? `${rattacher(cas)} | ${cas.question}` : rattacher(cas)}`);
  const durees = mesures.filter((mesure) => mesure.cas.entree.budgetMs !== undefined)
    .map(({ cas, duree, horsBudget }) => `- ${cas.id} | ${duree} ms | budget ${cas.entree.budgetMs} ms${horsBudget ? ' | dépassé' : ''}`);
  const sections = SECTIONS.flatMap((section) => {
    const deLaSection = mesures.filter((mesure) => mesure.section === section);
    if (deLaSection.length === 0) return [];
    return [`${TITRES[section]} (${deLaSection.length} cas)`, '', tableau(agreger(deLaSection, section === 'B' ? ['F5', 'F6'] : [])), ''];
  });
  return [
    `Stress test F5 et F6 (graine ${graine} ; F5 sur P0, Button à 72 variants ; F6 sur Button à 12 variants)`,
    '',
    ...sections,
    ...(mesures.length ? [
      `Écarts (${ecarts.length} groupes) : cas | sorte | code | exemple | rattachement`,
      ...ecarts,
      '',
      `Exceptions (${exceptions.length}) : cas | exception | message | rattachement`,
      ...exceptions,
      '',
      `En attente (${attentes.length} groupes) : cas | sorte | code | exemple | rattachement | question`,
      ...attentes,
      '',
      'Durées des cas qui portent un budget (M3) : cas | durée | budget',
      ...durees,
      '',
    ] : []),
    ...(avecRelations ? rapportDesRelations(mesures) : []),
    ...rapportDesDefinitions(mesures),
    ...(profils.length ? rapportDesProfils(profils) : []),
  ].join('\n');
}

function resumeDuConstat(constat: Constat): unknown {
  const { id, code, faits, variants, question } = constat;
  return { id, code, faits, ...(variants.length ? { variants } : {}), ...(question ? { question: question.candidats.map((candidat) => candidat.nom) } : {}) };
}

function imprimerLeCas({ cas, emis, resultat, exception, verdicts }: Mesure): void {
  console.log(`${cas.id} (${cas.verdict}${cas.question ? ` ${cas.question}` : ''}) : ${cas.entree.description}`);
  console.log(`zones : ${cas.entree.zones.map((zone) => `${zone.axe}=${zone.valeur}`).join(', ') || '-'}`);
  if (verdicts) console.log(`verdicts : C66 ${verdicts.c66}, C49 ${verdicts.c49}, C17 ${verdicts.c17}`);
  console.log('\nConstats émis');
  for (const constat of emis.slice(0, 60)) console.log(`  ${JSON.stringify(resumeDuConstat(constat))}`);
  if (emis.length > 60) console.log(`  … et ${emis.length - 60} autres`);
  if (emis.length === 0) console.log('  aucun');
  console.log('\nOracle');
  for (const attendu of cas.attendus.slice(0, 60)) console.log(`  ${JSON.stringify(attendu)}`);
  if (cas.attendus.length > 60) console.log(`  … et ${cas.attendus.length - 60} autres`);
  if (cas.attendus.length === 0) console.log(cas.entree.lecture ? `  rôle ${cas.entree.lecture.attendu ?? 'aucun'}` : '  aucun constat');
  console.log('\nÉcarts');
  if (exception !== undefined) console.log(`  exception | ${exception}`);
  for (const ecart of resultat.ecarts.slice(0, 60)) console.log(`  ${ecart.sorte} | ${ecart.detail} | ${rattacher(cas, { sorte: ecart.sorte, code: ecart.attendu?.code ?? ecart.emis?.code ?? '-' })}`);
  if (resultat.ecarts.length > 60) console.log(`  … et ${resultat.ecarts.length - 60} autres`);
  if (resultat.ecarts.length === 0 && exception === undefined) console.log('  aucun');
}

function option(nom: string): string | undefined {
  const rang = process.argv.indexOf(nom);
  return rang >= 0 ? process.argv[rang + 1] : undefined;
}

function principal(): void {
  const debut = Date.now();
  const graine = Number(option('--graine') ?? GRAINE_PAR_DEFAUT);
  const operateur = option('--operateur');
  const identifiant = option('--cas');
  const identifiantDeProfil = option('--profil');
  const famille = option('--famille');
  const sectionVoulue = option('--section') as Section | undefined;
  if (sectionVoulue !== undefined && !SECTIONS.includes(sectionVoulue)) { console.error(`Section inconnue : ${sectionVoulue} (A, B ou C).`); process.exitCode = 1; return; }
  if (famille !== undefined && famille !== 'F5' && famille !== 'F6') { console.error(`Famille inconnue : ${famille} (F5 ou F6).`); process.exitCode = 1; return; }
  const filtre = [operateur, identifiant, identifiantDeProfil, famille, sectionVoulue].some((valeur) => valeur !== undefined);
  const baseP0 = composantP0(graine);
  const baseF6 = composantF6(graine);

  const retenu = (section: Section, cas: CasDeVariants): boolean =>
    (sectionVoulue === undefined || sectionVoulue === section) && (famille === undefined || cas.famille.includes(famille))
    && (operateur === undefined || cas.operateur === operateur) && (identifiant === undefined || cas.id === identifiant);
  const sources: readonly (readonly [Section, () => CasDeVariants[]])[] = [
    ['A', () => fauxPositifs(graine)], ['B', () => tousLesCasDeLaSectionB(baseP0, graine)], ['C', () => interactions(graine)],
  ];
  const cas = identifiantDeProfil !== undefined ? [] : sources.flatMap(([section, generer]) => (sectionVoulue === undefined || sectionVoulue === section ? generer() : []).filter((entree) => retenu(section, entree)).map((entree) => [section, entree] as const));
  if (filtre && identifiantDeProfil === undefined && cas.length === 0) {
    console.error(`Aucun cas pour ${identifiant ?? operateur ?? famille ?? sectionVoulue}.`);
    process.exitCode = 1;
    return;
  }

  const mesures: Mesure[] = [];
  const dureeDesRelations = { ms: 0 };
  for (const [section, entree] of cas) {
    const mesure = mesurerLeCas(section, entree, baseF6);
    if (section === 'C' || mesure.exception !== undefined || estUneDefinition(entree) || entree.entree.lecture || !entree.entree.materialiser) { mesures.push(mesure); continue; }
    const avant = Date.now();
    const relations = verifierLesRelations(entree, mesure.emis, graine, entree.entree.budgetMs === undefined ? 60_000 : entree.entree.budgetMs * 10);
    dureeDesRelations.ms += Date.now() - avant;
    mesures.push({ ...mesure, relations });
  }

  const profilsARetenir = !filtre ? PROFILS : PROFILS.filter((profil) => profil.id === identifiantDeProfil);
  const profils: MesureDeProfil[] = [
    ...(!filtre || identifiantDeProfil === 'P0' ? [mesurerLeProfil('P0', 'Button, 4 axes, 72 variants', () => composantP0(graine))] : []),
    ...profilsARetenir.map((profil) => mesurerLeProfil(profil.id, descriptionDuProfil(profil), () => composantDuProfil(profil, graine))),
  ];
  if (identifiantDeProfil !== undefined && profils.length === 0) {
    console.error(`Aucun profil ${identifiantDeProfil}.`);
    process.exitCode = 1;
    return;
  }

  const avecRelations = mesures.some((mesure) => mesure.relations !== undefined);
  const texte = rapportTexte(graine, mesures, profils, avecRelations);
  if (identifiant !== undefined) imprimerLeCas(mesures[0]);
  if (filtre) {
    console.log(`\n${texte}`);
    return;
  }
  const dossier = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../../_local/stress/f5-variants');
  mkdirSync(dossier, { recursive: true });
  writeFileSync(path.join(dossier, 'operateurs.txt'), texte);
  const json = {
    graine,
    sections: Object.fromEntries(SECTIONS.map((section) => [section, agreger(mesures.filter((mesure) => mesure.section === section), section === 'B' ? ['F5', 'F6'] : []).map(({ horsBudget, ...ligne }) => ligne)])),
    relations: lignesDeRelations(mesures),
    ecartsDeRelation: mesures.flatMap(({ cas: c, relations }) => (relations?.ecarts ?? []).map((ecart) => ({ ...ecart, rattachement: rattacher(c) }))),
    exceptionsDeRelation: mesures.flatMap(({ cas: c, relations }) => (relations?.exceptions ?? []).map((message) => ({ cas: c.id, message }))),
    definitions: mesures.filter((mesure) => mesure.verdicts !== undefined).map(({ cas: c, verdicts }) => ({ cas: c.id, verdicts })),
    cas: mesures.map(({ section, cas: c, resultat, exception }) => ({
      section, id: c.id, famille: c.famille, operateur: c.operateur, verdict: c.verdict, ...(c.question ? { question: c.question } : {}),
      attendus: resultat.attendus, detectes: resultat.detectes,
      ...(exception === undefined ? {} : { exception }),
      ecarts: resultat.ecarts.map((ecart) => ({ sorte: ecart.sorte, detail: ecart.detail, rattachement: rattacher(c, { sorte: ecart.sorte, code: ecart.attendu?.code ?? ecart.emis?.code ?? '-' }) })),
    })),
    profils,
  };
  writeFileSync(path.join(dossier, 'operateurs.json'), `${JSON.stringify(json, null, 2)}\n`);
  console.log(texte);
  console.log(`Écrit dans ${dossier} en ${((Date.now() - debut) / 1000).toFixed(1)} s (dont ${(dureeDesRelations.ms / 1000).toFixed(1)} s de relations).`);
}

principal();

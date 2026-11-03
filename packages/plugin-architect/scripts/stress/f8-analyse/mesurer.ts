/**
 * Mesure du stress test F8 (règles d'usage et moteur de l'exporteur) et F9 (lecture et états de l'analyse). Il passe chaque cas dans le
 * sandbox d'analyse, le compare à son oracle, attrape toute exception comme un écart, rejoue chaque cas sous les deux relations de
 * `metamorphiques.ts`, et écrit dans `_local/stress/f8-analyse/` (dossier ignoré par Git) un rapport par famille : `operateurs.txt` et
 * `operateurs.json` pour F8, `operateurs-f9.txt` et `operateurs-f9.json` pour F9.
 *
 *   npx tsx packages/plugin-architect/scripts/stress/f8-analyse/mesurer.ts [--famille F8|F9|toutes] [--operateur G1] [--cas G1-3] [--bases] [--graine 7108]
 *
 * Sans filtre, il mesure les cas de chaque famille : pour F8, les bases (48 profils de règles, 72 profils d'analyse, 40 gabarits du
 * moteur), les 235 opérateurs (section B), les 67 faux positifs (section A) et les 16 interactions (section C) ; pour F9, les 344
 * opérateurs, les 88 faux positifs, dont les 72 profils d'analyse, et les 20 interactions. `--famille` vaut `toutes` par défaut.
 * `--operateur`, `--cas` et `--bases` filtrent et n'écrivent rien : le rapport va à l'écran, et `--cas` imprime en plus les constats
 * émis et l'oracle. Le rapport ne porte ni date ni durée, pour que deux exécutions donnent le même `.json`. Le harnais ne corrige rien :
 * un écart du plugin est un résultat, pas un échec.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { cleComplete, HYPOTHESES, mesurerLeCas, messageDe, type CasF8, type EcartDeRelation, type EcartF8, type ResultatF8 } from './cas';
import { CORPUS_DU_MOTEUR, couvertureDesSites } from './corpusDuMoteur';
import { lireLaPage, specDuProfil } from './pageDeRegles';
import { FAUX_POSITIFS, GRAINE_PAR_DEFAUT, INTERACTIONS, tousLesCas, type Famille, type Section } from './operateurs';
import { verifierLesRelations, RELATIONS } from './metamorphiques';
import { PROFILS_DE_REGLES } from './profilsRegles';
import { mesurerLesProfilsDAnalyse } from './scenarioDeBase';

const NOMS_DE_SECTION: Readonly<Record<Famille, Readonly<Record<Section, string>>>> = {
  F8: {
    A: 'Section A, faux positifs (48 profils de règles et 19 thèmes ciblés)',
    B: 'Section B, opérateurs simples',
    C: 'Section C, interactions déclarées (8 couples, 2 profils)',
  },
  F9: {
    A: 'Section A, faux positifs (72 profils d’analyse et 16 thèmes ciblés)',
    B: 'Section B, opérateurs simples',
    C: 'Section C, interactions déclarées (10 couples, 2 profils)',
  },
};
const SECTIONS: readonly Section[] = ['A', 'B', 'C'];

interface Mesure {
  readonly section: Section;
  readonly cas: CasF8;
  readonly resultat: ResultatF8;
  readonly relations: readonly EcartDeRelation[];
}

// ---------------------------------------------------------------------------------------------------------------------------
// Rattachement

/** Les écarts connus que le texte d'un écart reconnaît quel que soit le cas ; sinon le rattachement du cas ; sinon « nouveau ». */
const SIGNATURES: ReadonlyArray<{ readonly reconnait: RegExp; readonly rattachement: string }> = [
  { reconnait: /C44\|aucune-instance émis/, rattachement: `${HYPOTHESES.H08} ; E-30` },
];

/** F9 : le rattachement du cas l'emporte ; à défaut, le texte de l'écart reconnaît une hypothèse ou un écart connu. */
const SIGNATURES_F9: ReadonlyArray<{ readonly reconnait: RegExp; readonly rattachement: string }> = [
  { reconnait: /statut final : "complete", attendu "partielle"/, rattachement: `${HYPOTHESES.H13} ; E-31` },
  { reconnait: /lus sur \\1/, rattachement: `${HYPOTHESES.H14} ; E-32` },
  { reconnait: /l’écran montre \d+ section\(s\) de constats/, rattachement: `${HYPOTHESES.H19} ; E-38` },
  { reconnait: /`occupe` a mis `ecriture`/, rattachement: `${HYPOTHESES.H20} ; E-39` },
  { reconnait: /l’écran ne dit pas \/catalogue/, rattachement: `${HYPOTHESES.H18} ; E-31` },
  { reconnait: /retenu après l’annulation : .* modèles [1-9]/, rattachement: 'N-71' },
];

function rattacher(cas: CasF8, detail: string): string {
  if (cas.famille === 'F9') return cas.entree.rattachement ?? SIGNATURES_F9.find((signature) => signature.reconnait.test(detail))?.rattachement ?? 'nouveau';
  return SIGNATURES.find((signature) => signature.reconnait.test(detail))?.rattachement ?? cas.entree.rattachement ?? 'nouveau';
}

// ---------------------------------------------------------------------------------------------------------------------------
// Mesure

async function mesurer(cas: CasF8, section: Section, graine: number): Promise<Mesure> {
  const resultat = await mesurerLeCas(cas);
  const relations = resultat.sortie ? await verifierLesRelations(cas, resultat.sortie, graine) : [];
  return { section, cas, resultat, relations };
}

interface Ligne {
  nom: string;
  cas: number;
  attendus: number;
  detectes: number;
  manques: number;
  fauxConstats: number;
  correctionsInexactes: number;
  faitsInexacts: number;
  exceptions: number;
  enAttente: number;
}

const ligneVide = (nom: string): Ligne => ({ nom, cas: 0, attendus: 0, detectes: 0, manques: 0, fauxConstats: 0, correctionsInexactes: 0, faitsInexacts: 0, exceptions: 0, enAttente: 0 });

/** Les écarts d'un cas `mesure` vont dans `enAttente` seulement ; un doublon compte comme un faux constat. */
function agreger(mesures: readonly Mesure[], cle: (mesure: Mesure) => string): Ligne[] {
  const lignes = new Map<string, Ligne>();
  const total = ligneVide('Total');
  const compter = (ligne: Ligne, { resultat, cas }: Mesure): void => {
    const nombre = (...sortes: EcartF8['sorte'][]) => resultat.ecarts.filter((ecart) => sortes.includes(ecart.sorte)).length;
    ligne.cas++;
    ligne.attendus += resultat.attendus;
    ligne.detectes += resultat.detectes;
    if (resultat.exception !== undefined) ligne.exceptions++;
    if (cas.verdict === 'mesure') { ligne.enAttente += resultat.ecarts.length; return; }
    ligne.manques += nombre('manque');
    ligne.fauxConstats += nombre('faux-constat', 'doublon');
    ligne.correctionsInexactes += nombre('correction-inexacte', 'question-inexacte');
    ligne.faitsInexacts += nombre('fait-inexact');
  };
  for (const mesure of mesures) {
    const nom = cle(mesure);
    const ligne = lignes.get(nom) ?? ligneVide(nom);
    lignes.set(nom, ligne);
    compter(ligne, mesure);
    compter(total, mesure);
  }
  return [...lignes.values(), total];
}

const ENTETE = ['Opérateur', 'Cas', 'Attendus', 'Détectés', 'Manqués', 'Faux constats', 'Corrections inexactes', 'Faits inexacts', 'Exceptions', 'En attente'];

function tableau(lignes: readonly Ligne[]): string {
  const rangees = lignes.map((l) => [l.nom, l.cas, l.attendus, l.detectes, l.manques, l.fauxConstats, l.correctionsInexactes, l.faitsInexacts, l.exceptions, l.enAttente].map(String));
  return [ENTETE, ENTETE.map(() => '---'), ...rangees].map((rangee) => `| ${rangee.join(' | ')} |`).join('\n');
}

function listeDesEcarts(mesures: readonly Mesure[], verdict: 'attendu' | 'mesure'): string[] {
  return mesures.filter(({ cas }) => cas.verdict === verdict).flatMap(({ cas, resultat }) =>
    resultat.ecarts.map((ecart) => `- ${cas.id} | ${ecart.sorte} | ${ecart.detail} | ${rattacher(cas, ecart.detail)}${cas.question ? ` | ${cas.question}` : ''}`));
}

const listeDesExceptions = (mesures: readonly Mesure[]): string[] =>
  mesures.filter(({ resultat }) => resultat.exception !== undefined).map(({ cas, resultat }) => `- ${cas.id} | exception | ${resultat.exception} | ${cas.entree.rattachement ?? 'nouveau'}`);

function tableauDesRelations(mesures: readonly Mesure[]): { tableau: string; ecarts: string[] } {
  const entete = ['Section', 'Cas rejoués', ...RELATIONS.map((relation) => `Écarts « ${relation} »`)];
  const rangees = SECTIONS.map((section) => {
    const liste = mesures.filter((mesure) => mesure.section === section && mesure.resultat.exception === undefined);
    return [section, String(liste.length), ...RELATIONS.map((relation) => String(liste.filter((mesure) => mesure.relations.some((ecart) => ecart.relation === relation)).length))];
  });
  return {
    tableau: [entete, entete.map(() => '---'), ...rangees].map((rangee) => `| ${rangee.join(' | ')} |`).join('\n'),
    ecarts: mesures.flatMap((mesure) => mesure.relations.map((ecart) => `- ${ecart.cas} | ${ecart.relation} | ${ecart.detail}`)),
  };
}

/** Pour chaque hypothèse de la section 6.1 que F8 touche : un cas qui la met à l'épreuve, et s'il montre un écart. */
function tableauDesHypotheses(famille: Famille, mesures: readonly Mesure[]): string[] {
  const numero = (id: string): number => Number(id.slice(1));
  return (Object.entries(HYPOTHESES) as Array<[string, string]>).filter(([id]) => (famille === 'F8' ? numero(id) <= 12 : numero(id) >= 13)).map(([id, texte]) => {
    const touches = mesures.filter(({ cas }) => cas.entree.rattachement?.includes(texte));
    const avecEcart = touches.find(({ resultat, relations }) => resultat.ecarts.length > 0 || resultat.exception !== undefined || relations.length > 0);
    if (touches.length === 0) return `- ${id} | ${texte} | aucun cas de ce lot`;
    return avecEcart
      ? `- ${id} | ${texte} | écart observé sur ${avecEcart.cas.id} (${touches.length} cas)`
      : `- ${id} | ${texte} | aucun écart sur ${touches.map(({ cas }) => cas.id).slice(0, 4).join(', ')}${touches.length > 4 ? '…' : ''} (${touches.length} cas)`;
  });
}

// ---------------------------------------------------------------------------------------------------------------------------
// Bases

interface Bases {
  readonly profilsDeRegles: { readonly total: number; readonly avecConstat: string[] };
  readonly profilsDAnalyse: { readonly total: number; readonly statuts: Record<string, number>; readonly nonComplets: string[] } | null;
  readonly corpus: { readonly gabarits: number; readonly couverture: ReadonlyArray<{ famille: string; sites: number; gabarits: number }>; readonly famillesSansGabarit: string[] };
}

async function mesurerLesBases(avecLAnalyse: boolean): Promise<Bases> {
  const avecConstat: string[] = [];
  for (const profil of PROFILS_DE_REGLES) {
    const { constats } = await lireLaPage(specDuProfil(profil));
    const trouves = constats.filter((constat) => constat.code === 'C43' || constat.code === 'C45');
    if (trouves.length > 0) avecConstat.push(`${profil.id} (${trouves.map(cleComplete).join(' ; ')})`);
  }
  let profilsDAnalyse: Bases['profilsDAnalyse'] = null;
  if (avecLAnalyse) {
    const mesures = await mesurerLesProfilsDAnalyse();
    const statuts: Record<string, number> = {};
    for (const { statut } of mesures) statuts[statut] = (statuts[statut] ?? 0) + 1;
    profilsDAnalyse = { total: mesures.length, statuts, nonComplets: mesures.filter(({ statut }) => statut !== 'complete').map(({ profil, statut }) => `${profil.id} (${statut})`) };
  }
  const couverture = couvertureDesSites();
  return {
    profilsDeRegles: { total: PROFILS_DE_REGLES.length, avecConstat },
    profilsDAnalyse,
    corpus: { gabarits: CORPUS_DU_MOTEUR.length, couverture, famillesSansGabarit: couverture.filter(({ sites, gabarits }) => sites > 0 && gabarits === 0).map(({ famille }) => famille) },
  };
}

function texteDesBases(bases: Bases): string[] {
  return [
    'Bases',
    `- Profils de règles : ${bases.profilsDeRegles.total}, dont ${bases.profilsDeRegles.avecConstat.length} avec C43 ou C45${bases.profilsDeRegles.avecConstat.length > 0 ? ` : ${bases.profilsDeRegles.avecConstat.join(', ')}` : ''}`,
    ...(bases.profilsDAnalyse
      ? [`- Profils d'analyse : ${bases.profilsDAnalyse.total}, statuts ${Object.entries(bases.profilsDAnalyse.statuts).map(([statut, nombre]) => `${statut} ${nombre}`).join(', ')}${bases.profilsDAnalyse.nonComplets.length > 0 ? `, hors complete : ${bases.profilsDAnalyse.nonComplets.join(', ')}` : ''}`]
      : []),
    `- Corpus du moteur : ${bases.corpus.gabarits} gabarits ; sites du socle par famille : ${bases.corpus.couverture.map(({ famille, sites, gabarits }) => `${famille} ${sites} sites, ${gabarits} gabarits`).join(' ; ')}${bases.corpus.famillesSansGabarit.length > 0 ? ` ; sans gabarit : ${bases.corpus.famillesSansGabarit.join(', ')}` : ''}`,
    '',
  ];
}

// ---------------------------------------------------------------------------------------------------------------------------
// Rapport

function rapportTexte(famille: Famille, graine: number, mesures: readonly Mesure[], bases: Bases | null): string {
  const sections = SECTIONS.map((section) => ({ section, liste: mesures.filter((mesure) => mesure.section === section) })).filter(({ liste }) => liste.length > 0);
  const ecarts = [...listeDesEcarts(mesures, 'attendu'), ...listeDesExceptions(mesures)];
  const attentes = listeDesEcarts(mesures, 'mesure');
  const relations = tableauDesRelations(mesures);
  return [
    famille === 'F8' ? `Stress test F8 (graine ${graine} ; opérateurs sur R0 et r42)` : `Stress test F9 (graine ${graine} ; opérateurs sur A0, interactions sur A0 et a55)`,
    '',
    ...(bases ? texteDesBases(bases) : []),
    ...sections.flatMap(({ section, liste }) => [NOMS_DE_SECTION[famille][section], '', tableau(agreger(liste, (mesure) => mesure.cas.operateur)), '']),
    famille === 'F8'
      ? 'Relations métamorphiques : ordre mélangé (règles, conteneurs, points, corrections), casse changée des noms de propriété'
      : 'Relations métamorphiques : ordre mélangé (variants du relevé, règles de la page), casse changée des noms de propriété des règles ; jugées sur les constats, le statut, les péremptions, les refus et les ignorés',
    '',
    relations.tableau,
    '',
    `Écarts de relations (${relations.ecarts.length}) : cas | relation | détail`,
    ...relations.ecarts,
    '',
    `Écarts (${ecarts.length}) : cas | sorte | détail | rattachement`,
    ...ecarts,
    '',
    `En attente (${attentes.length}) : cas | sorte | détail | rattachement | question`,
    ...attentes,
    '',
    `Hypothèses de la section 6.1 que ${famille} touche : identifiant | hypothèse | résultat`,
    ...tableauDesHypotheses(famille, mesures),
    '',
  ].join('\n');
}

const resumeDuConstat = (constat: { code: string; type: string; faits: Record<string, unknown>; correction?: { apres: { nom: string } } }): string =>
  `${constat.code} ${constat.type} ${JSON.stringify(constat.faits)}${constat.correction ? ` correction ${constat.correction.apres.nom}` : ''}`;

function imprimerLeCas({ cas, resultat, relations }: Mesure): void {
  console.log(`${cas.id} (${cas.verdict}${cas.question ? ` ${cas.question}` : ''}) : ${cas.entree.description}`);
  console.log('\nOracle');
  for (const attendu of cas.attendus) console.log(`  ${attendu.code}|${attendu.cle} ${attendu.forme}${attendu.faits ? ` ${JSON.stringify(attendu.faits)}` : ''}${attendu.apres ? ` apres ${JSON.stringify(attendu.apres)}` : ''}`);
  if (cas.attendus.length === 0) console.log('  aucun constat');
  console.log('\nConstats émis');
  for (const constat of resultat.sortie?.constats ?? []) console.log(`  ${cleComplete(constat)} :: ${resumeDuConstat(constat)}`);
  if ((resultat.sortie?.constats.length ?? 0) === 0) console.log('  aucun');
  if (resultat.sortie?.donnees) console.log(`\nDonnées : ${JSON.stringify(resultat.sortie.donnees, (_cle, valeur) => (valeur instanceof Map ? [...valeur] : valeur)).slice(0, 1500)}`);
  console.log('\nÉcarts');
  if (resultat.exception !== undefined) console.log(`  exception | ${resultat.exception}`);
  for (const ecart of resultat.ecarts) console.log(`  ${ecart.sorte} | ${ecart.detail} | ${rattacher(cas, ecart.detail)}`);
  for (const ecart of relations) console.log(`  relation ${ecart.relation} | ${ecart.detail}`);
  if (resultat.ecarts.length === 0 && relations.length === 0 && resultat.exception === undefined) console.log('  aucun');
}

function option(nom: string): string | undefined {
  const rang = process.argv.indexOf(nom);
  return rang >= 0 ? process.argv[rang + 1] : undefined;
}

async function mesurerUneFamille(famille: Famille, graine: number, operateur: string | undefined, identifiant: string | undefined, seulesLesBases: boolean): Promise<boolean> {
  const debut = Date.now();
  const filtre = operateur !== undefined || identifiant !== undefined;
  const candidats: Array<{ cas: CasF8; section: Section }> = seulesLesBases ? [] : [
    ...FAUX_POSITIFS[famille]().map((cas) => ({ cas, section: 'A' as const })),
    ...tousLesCas(famille).map((cas) => ({ cas, section: 'B' as const })),
    ...INTERACTIONS[famille]().map((cas) => ({ cas, section: 'C' as const })),
  ];
  const retenus = candidats.filter(({ cas }) => (operateur === undefined || cas.operateur === operateur) && (identifiant === undefined || cas.id === identifiant));
  if (!seulesLesBases && retenus.length === 0) return false;
  const bases = famille === 'F9' || (filtre && !seulesLesBases) ? null : await mesurerLesBases(true);
  const mesures: Mesure[] = [];
  for (const { cas, section } of retenus) {
    try {
      mesures.push(await mesurer(cas, section, graine));
    } catch (erreur) {
      mesures.push({ section, cas, resultat: { cas, exception: messageDe(erreur), attendus: cas.attendus.length, detectes: 0, ecarts: [] }, relations: [] });
    }
  }
  const texte = rapportTexte(famille, graine, mesures, bases);
  if (identifiant !== undefined) imprimerLeCas(mesures[0]);
  if (filtre || seulesLesBases) {
    console.log(`\n${texte}`);
    return true;
  }
  const dossier = path.resolve(__dirname, '../../../../../_local/stress/f8-analyse');
  mkdirSync(dossier, { recursive: true });
  const suffixe = famille === 'F8' ? '' : '-f9';
  writeFileSync(path.join(dossier, `operateurs${suffixe}.txt`), texte);
  const json = {
    graine, famille, bases,
    sections: SECTIONS.map((section) => ({ section, lignes: agreger(mesures.filter((mesure) => mesure.section === section), (mesure) => mesure.cas.operateur) })),
    cas: mesures.map(({ cas, section, resultat, relations }) => ({
      id: cas.id, section, operateur: cas.operateur, verdict: cas.verdict, ...(cas.question ? { question: cas.question } : {}),
      attendus: resultat.attendus, detectes: resultat.detectes, ...(resultat.exception === undefined ? {} : { exception: resultat.exception }),
      ecarts: resultat.ecarts.map((ecart) => ({ sorte: ecart.sorte, detail: ecart.detail, rattachement: rattacher(cas, ecart.detail) })),
      ...(relations.length > 0 ? { relations: relations.map((ecart) => ({ relation: ecart.relation, detail: ecart.detail })) } : {}),
    })),
  };
  writeFileSync(path.join(dossier, `operateurs${suffixe}.json`), `${JSON.stringify(json, null, 2)}\n`);
  console.log(texte);
  console.log(`${famille} : écrit dans ${dossier} (operateurs${suffixe}.txt et .json) en ${((Date.now() - debut) / 1000).toFixed(1)} s.`);
  return true;
}

async function principal(): Promise<void> {
  const graine = Number(option('--graine') ?? GRAINE_PAR_DEFAUT);
  const demandee = option('--famille') ?? 'toutes';
  const operateur = option('--operateur');
  const identifiant = option('--cas');
  const seulesLesBases = process.argv.includes('--bases');
  if (demandee !== 'F8' && demandee !== 'F9' && demandee !== 'toutes') {
    console.error('--famille attend F8, F9 ou toutes.');
    process.exitCode = 1;
    return;
  }
  const familles: Famille[] = demandee === 'toutes' ? ['F8', 'F9'] : [demandee];
  let trouve = false;
  for (const famille of familles) trouve = (await mesurerUneFamille(famille, graine, operateur, identifiant, seulesLesBases)) || trouve;
  if (!trouve) {
    console.error(`Aucun cas pour ${identifiant ?? operateur ?? demandee}.`);
    process.exitCode = 1;
  }
}

principal().catch((erreur) => {
  console.error(erreur);
  process.exitCode = 1;
});

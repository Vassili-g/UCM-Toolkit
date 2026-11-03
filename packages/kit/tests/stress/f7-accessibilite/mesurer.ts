/**
 * Mesure du stress test F7 (accessibilité du mode Composant). Chaque cas passe dans `controlerLAccessibilite` (C49 à C53) avec le
 * niveau qu'il déclare, puis son résultat est comparé à son oracle (`mesureDesCas.ts`). Le rapport s'écrit dans
 * `_local/stress/f7-accessibilite/operateurs.txt` et `operateurs.json` (dossier ignoré par Git). Trois sections et les relations :
 *
 *   A  les 48 profils sRGB (zéro constat C49 à C52, seul C53 sort), les 22 thèmes ciblés (FP1) et les 72 cas de garantie (FP2) ;
 *   B  les 519 cas des opérateurs S, G, O, F, M, Y, I, R, Z, X, Q, T et L sur P0 (Button, 48 variants, `Light` et `Dark`) ;
 *   C  les interactions déclarées, sept couples sur trois profils ;
 *   R  les relations métamorphiques (ordre mélangé, casse changée) sur les faux positifs et les 519 cas.
 *
 *   npx tsx packages/kit/tests/stress/f7-accessibilite/mesurer.ts [--section A|B|C|R] [--operateur S1] [--cas S1-4] [--graine 7107]
 *
 * Une option de filtre n'écrit rien (le tableau va à l'écran), et `--cas` imprime en plus les constats émis et l'oracle. Le rapport
 * ne porte ni date ni durée, pour que deux exécutions donnent le même `.json`. Le harnais ne corrige rien.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { controlerLAccessibilite } from '../../../src/controles/accessibilite.js';
import type { Constat } from '../../../src/controles/index.js';
import { verdictsDesTroisFonctions, type DefinitionDIcone } from '../f5-variants/typo/definitionsDIcone.js';
import type { CasAccessibilite } from './cas.js';
import { composantDeContraste, GRAINE_F7 } from './composantDeContraste.js';
import { tousLesFauxPositifs } from './fauxPositifs.js';
import { lesInteractions } from './interactions.js';
import { MARQUE_DE_SONDE, agreger, mesurerLeCas, messageDe, rapportDeSection, rattacher, tableauMarkdown, type Mesure } from './mesureDesCas.js';
import { rejouerLaRelation, RELATIONS, type ResultatDeRelation } from './metamorphiques.js';
import { tousLesCasDesOperateurs } from './operateurs.js';
import { constatsDuProfil, constatsInterdits, composantDuProfil, PROFILS, PROFIL_P0 } from './profils.js';

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

// ---------------------------------------------------------------------------------------------------------------------------
// Définitions d'icône (E-26)

interface VerdictsDesDefinitions {
  readonly cas: string;
  readonly layer: string;
  readonly attendu: boolean;
  readonly c66: boolean;
  readonly c49: boolean;
  readonly c17: boolean;
}

/** Pour chaque cas qui pose un layer et sa définition d'icône, le verdict des trois fonctions du kit (C66, C49, C17) contre Q-F3-4. */
function definitionsDIcone(cas: readonly CasAccessibilite[], base: ReturnType<typeof composantDeContraste>): VerdictsDesDefinitions[] {
  return cas.filter((entree) => entree.icone).map((entree) => {
    const { nom, type, instance, estUneIcone } = entree.icone!;
    const verdicts = verdictsDesTroisFonctions(base, { nom, type: type as DefinitionDIcone['type'], ...(instance ? { instance } : {}), estUneIcone, verdict: 'attendu' });
    return { cas: entree.id, layer: `${nom} (${type}${instance ? ` ${instance}` : ''})`, attendu: estUneIcone, ...verdicts };
  });
}

function rapportDesDefinitions(lignes: readonly VerdictsDesDefinitions[]): string[] {
  if (lignes.length === 0) return [];
  const oui = (valeur: boolean): string => (valeur ? 'icône' : '-');
  const discordants = lignes.filter((l) => l.c66 !== l.c49 || l.c49 !== l.c17 || l.c66 !== l.c17);
  const horsDefinition = lignes.filter((l) => l.c66 !== l.attendu || l.c49 !== l.attendu || l.c17 !== l.attendu);
  return [
    `Définitions d'icône, E-26 (${lignes.length} layers) : ${discordants.length} sur lesquels C66, C49 et C17 se contredisent, ${horsDefinition.length} où l'une des trois s'écarte de Q-F3-4`,
    '',
    tableauMarkdown(['Cas', 'Layer', 'Q-F3-4', 'C66', 'C49', 'C17'], lignes.map((l) => [l.cas, l.layer, oui(l.attendu), oui(l.c66), oui(l.c49), oui(l.c17)])),
    '',
  ];
}

// ---------------------------------------------------------------------------------------------------------------------------
// Relations

interface LigneDeRelation { ensemble: string; relation: string; rejoues: number; tenues: number; ecarts: number; exceptions: number; ignores: number }

function rapportDesRelations(parEnsemble: readonly { ensemble: string; cas: Map<string, CasAccessibilite>; resultats: ResultatDeRelation[] }[]): { texte: string[]; lignes: LigneDeRelation[] } {
  const lignes: LigneDeRelation[] = [];
  const ecarts: string[] = [];
  const exceptions: string[] = [];
  const ignores = new Map<string, number>();
  for (const { ensemble, cas, resultats } of parEnsemble) {
    for (const relation of RELATIONS) {
      const dEnsemble = resultats.filter((r) => r.relation === relation);
      const compte = (issue: ResultatDeRelation['issue']): number => dEnsemble.filter((r) => r.issue === issue).length;
      lignes.push({ ensemble, relation, rejoues: dEnsemble.length - compte('ignore'), tenues: compte('tenue'), ecarts: compte('ecart'), exceptions: compte('exception'), ignores: compte('ignore') });
      for (const r of dEnsemble) {
        const ligne = `- ${relation} | ${r.cas} | ${r.detail} | ${rattacher(cas.get(r.cas)!)}`;
        if (r.issue === 'ecart') ecarts.push(ligne);
        else if (r.issue === 'exception') exceptions.push(ligne);
        else if (r.issue === 'ignore') ignores.set(`${relation} | ${r.detail}`, (ignores.get(`${relation} | ${r.detail}`) ?? 0) + 1);
      }
    }
  }
  const total = lignes.reduce((somme, l) => ({ ...somme, rejoues: somme.rejoues + l.rejoues, tenues: somme.tenues + l.tenues, ecarts: somme.ecarts + l.ecarts, exceptions: somme.exceptions + l.exceptions, ignores: somme.ignores + l.ignores }),
    { ensemble: 'Total', relation: '', rejoues: 0, tenues: 0, ecarts: 0, exceptions: 0, ignores: 0 });
  return {
    lignes,
    texte: [
      'Relations métamorphiques (P8) : ordre des variants et des layers mélangé, casse des noms changée',
      '',
      tableauMarkdown(['Ensemble', 'Relation', 'Rejoués', 'Tenues', 'Écarts', 'Exceptions', 'Ignorés'], [...lignes, total].map((l) => [l.ensemble, l.relation, l.rejoues, l.tenues, l.ecarts, l.exceptions, l.ignores])),
      '',
      `Écarts (${ecarts.length}) : relation | cas | première différence | rattachement`, ...ecarts, '',
      `Exceptions (${exceptions.length}) : relation | cas | message | rattachement`, ...exceptions, '',
      `Cas ignorés (${total.ignores}) : relation | raison`, ...[...ignores].map(([raison, nombre]) => `- ${raison} x${nombre}`), '',
    ],
  };
}

// ---------------------------------------------------------------------------------------------------------------------------
// Impression d'un cas

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

const jsonDeCas = (mesures: readonly Mesure[]): unknown[] => mesures.map(({ cas: c, resultat, exception }) => ({
  id: c.id, operateur: c.operateur, verdict: c.verdict, ...(c.question ? { question: c.question } : {}),
  attendus: resultat.attendus, detectes: resultat.detectes, ...(exception === undefined ? {} : { exception }),
  ecarts: resultat.ecarts.map((ecart) => ({ sorte: ecart.sorte, detail: ecart.detail, rattachement: rattacher(c) })),
}));

/** Le processus fils d'un cas à risque de boucle : ses constats en JSON sur la dernière ligne, ou son exception. */
function sonde(identifiant: string, graine: number): void {
  const base = composantDeContraste(PROFIL_P0, graine);
  const cas = tousLesCasDesOperateurs(base, graine).find((entree) => entree.id === identifiant);
  if (!cas) { console.log(`${MARQUE_DE_SONDE}${JSON.stringify({ exception: `Aucun cas ${identifiant}` })}`); return; }
  try {
    const { composant } = cas.entree.materialiser();
    console.log(`${MARQUE_DE_SONDE}${JSON.stringify({ emis: controlerLAccessibilite(composant.releve, composant.catalogue, { niveau: cas.entree.niveau }) })}`);
  } catch (erreur) {
    console.log(`${MARQUE_DE_SONDE}${JSON.stringify({ exception: messageDe(erreur) })}`);
  }
}

function principal(): void {
  const debut = Date.now();
  const graine = Number(option('--graine') ?? GRAINE_F7);
  if (option('--sonde') !== undefined) { sonde(option('--sonde')!, graine); return; }
  const section = option('--section');
  const operateur = option('--operateur');
  const identifiant = option('--cas');
  const filtre = section !== undefined || operateur !== undefined || identifiant !== undefined;
  const voulue = (lettre: string): boolean => section === undefined || section === lettre;
  const selection = (cas: readonly CasAccessibilite[]): CasAccessibilite[] =>
    cas.filter((entree) => (operateur === undefined || entree.operateur === operateur) && (identifiant === undefined || entree.id === identifiant));

  const base = composantDeContraste(PROFIL_P0, graine);
  const faux = tousLesFauxPositifs(base, graine);
  const operateurs = tousLesCasDesOperateurs(base, graine);
  const interactions = lesInteractions(graine);
  const [casFaux, casOperateurs, casInteractions] = [selection(faux.cas), selection(operateurs), selection(interactions)];
  if (filtre && casFaux.length + casOperateurs.length + casInteractions.length === 0) {
    console.error(`Aucun cas pour ${identifiant ?? operateur ?? section}.`);
    process.exitCode = 1;
    return;
  }
  const mesuresFaux = voulue('A') || voulue('R') ? casFaux.map((cas) => mesurerLeCas(cas, graine)) : [];
  const mesuresOperateurs = voulue('B') || voulue('R') ? casOperateurs.map((cas) => mesurerLeCas(cas, graine)) : [];
  const mesuresInteractions = voulue('C') ? casInteractions.map((cas) => mesurerLeCas(cas, graine)) : [];
  const profils = !filtre || (section === 'A' && operateur === undefined && identifiant === undefined) ? PROFILS.map((profil) => mesurerLeProfil(profil.id, () => composantDuProfil(profil, graine))) : [];
  const relations = voulue('R') && (section === 'R' || !filtre)
    ? [
      { ensemble: `Faux positifs (${mesuresFaux.length})`, mesures: mesuresFaux },
      { ensemble: `Opérateurs (${mesuresOperateurs.length})`, mesures: mesuresOperateurs },
    ].map(({ ensemble, mesures }) => ({
      ensemble, cas: new Map(mesures.map((m) => [m.cas.id, m.cas] as const)),
      resultats: mesures.flatMap((m) => RELATIONS.map((relation): ResultatDeRelation => (m.exception === undefined
        ? rejouerLaRelation(m.cas, relation, m.emis, graine)
        : { cas: m.cas.id, relation, issue: 'ignore', detail: 'le contrôle lève déjà sur le cas tel quel' }))),
    }))
    : [];
  const rapportRelations = rapportDesRelations(relations);
  const sectionsA = voulue('A') ? mesuresFaux : [];
  const sectionsB = voulue('B') ? mesuresOperateurs : [];
  const definitions = voulue('B') ? definitionsDIcone(casOperateurs, base) : [];
  const texte = [
    `Stress test F7, accessibilité (graine ${graine} ; sRGB seul ; opérateurs sur P0 = ${PROFIL_P0.id}, Button à 48 variants)`,
    '',
    ...(profils.length ? ['Section A, profils', '', ...rapportDesProfils(profils)] : []),
    ...rapportDeSection('Section A, faux positifs : FP1 (thèmes ciblés) et FP2 (garanties de palettes)', sectionsA, false),
    ...(voulue('A') && sectionsA.length ? [`Cas de garantie vides (${faux.vides.length}) : cas | raison`, ...faux.vides.map((v) => `- ${v.id} | ${v.raison}`), ''] : []),
    ...rapportDeSection('Section B, opérateurs S, G, O, F, M, Y, I, R, Z, X, Q, T et L', sectionsB),
    ...rapportDesDefinitions(definitions),
    ...rapportDeSection('Section C, interactions déclarées (sept couples sur P0, Pα et le profil tiré ; le couple O2 et E1 est retiré avec Display P3)', mesuresInteractions, false),
    ...(relations.length ? rapportRelations.texte : []),
  ].join('\n');

  if (identifiant !== undefined) imprimerLeCas([...mesuresFaux, ...mesuresOperateurs, ...mesuresInteractions][0]);
  if (filtre) {
    console.log(`\n${texte}`);
    return;
  }
  const dossier = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../../_local/stress/f7-accessibilite');
  mkdirSync(dossier, { recursive: true });
  writeFileSync(path.join(dossier, 'operateurs.txt'), texte);
  const json = {
    graine,
    fauxPositifs: { lignes: agreger(mesuresFaux, false), videsDeGarantie: faux.vides, cas: jsonDeCas(mesuresFaux) },
    operateurs: agreger(mesuresOperateurs),
    cas: jsonDeCas(mesuresOperateurs),
    definitionsDIcone: definitions,
    interactions: { lignes: agreger(mesuresInteractions, false), cas: jsonDeCas(mesuresInteractions) },
    relations: { lignes: rapportRelations.lignes, resultats: relations.flatMap((r) => r.resultats.filter((x) => x.issue !== 'tenue')) },
    profils,
  };
  writeFileSync(path.join(dossier, 'operateurs.json'), `${JSON.stringify(json, null, 2)}\n`);
  console.log(texte);
  console.log(`Écrit dans ${dossier} en ${((Date.now() - debut) / 1000).toFixed(1)} s.`);
}

principal();

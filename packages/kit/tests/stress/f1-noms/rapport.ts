/**
 * Rapport du stress test F1 (plan F1, section 5.3) : `rapport.md` avec le tableau opérateur × axe et ses marges, `rapport.json`,
 * `manques.csv` et `collisions-sans-question.csv`. Les cas qui dépendent d'une décision provisoire (Q-Fx) et ceux que le plan
 * mesure sans les juger sont comptés à part : le tableau principal ne contient que les verdicts du rôle `oracle`.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ECART_DE_P21, type Mesure } from './execution.js';
import type { Verdict } from './oracle.js';

export interface Compte { n: number; attendus: number; detectes: number; manques: number; fp: number }
const compteVide = (): Compte => ({ n: 0, attendus: 0, detectes: 0, manques: 0, fp: 0 });

function ajouter(compte: Compte, verdict: Verdict): void {
  compte.n++;
  if (verdict.attendu) compte.attendus++;
  if (verdict.issue === 'detecte') compte.detectes++;
  if (verdict.issue === 'manque') compte.manques++;
  if (verdict.issue === 'faux-positif') compte.fp++;
}

export const compter = (verdicts: readonly Verdict[]): Compte => { const compte = compteVide(); for (const verdict of verdicts) ajouter(compte, verdict); return compte; };
/** `attendus / détectés / manqués / FP`, ou `.` pour une cellule sans verdict. */
export const cellule = (compte: Compte): string => (compte.n === 0 ? '.' : `${compte.attendus} / ${compte.detectes} / ${compte.manques} / ${compte.fp}`);

const NOMS_DES_OPERATEURS: Readonly<Record<string, string>> = {
  'M-01': 'lettre ajoutée', 'M-02': 'lettre retirée', 'M-03': 'lettre remplacée', 'M-04': 'échange', 'M-05': 'première lettre', 'M-06': 'deux lettres',
  'M-07': 'synonyme', 'M-08': 'forme tolérée', 'M-09': 'forme tolérée composée', 'M-10': 'pluriel', 'M-11': 'terminaison', 'M-12': 'casse',
  'M-13': 'séparateur', 'M-14': 'mots collés', 'M-15': 'branches parallèles', 'M-16': 'collection', 'M-17': 'collision', distincts: 'mots distincts légitimes',
};
const nomDeLOperateur = (operateur: string): string => (NOMS_DES_OPERATEURS[operateur] ? `${operateur} ${NOMS_DES_OPERATEURS[operateur]}` : operateur);

type Axes = Verdict['axes'];
interface Colonne { readonly titre: string; readonly retient: (axes: Axes) => boolean }
const nombre = (valeur: unknown): number => (typeof valeur === 'number' ? valeur : Number.NaN);

const COLONNES_DE_PLACEMENT: readonly Colonne[] = [
  { titre: 'A-01 même collection', retient: (a) => a.a01 === 'meme' },
  { titre: 'A-01 autre collection', retient: (a) => a.a01 === 'autre' || a.a01 === 'hors-ucm' },
  { titre: 'A-02 seul segment', retient: (a) => a.a02 === '0/1' },
  { titre: 'A-03 m = 1', retient: (a) => a.m === 1 },
  { titre: 'A-03 m ≥ 3', retient: (a) => nombre(a.m) >= 3 },
  { titre: 'A-04 k = 0', retient: (a) => a.k === 0 },
  { titre: 'A-04 k ≥ 5', retient: (a) => nombre(a.k) >= 5 },
  { titre: 'A-05 voisin différent', retient: (a) => a.a05 === 'different' },
];
const COLONNES_DE_FORME: readonly Colonne[] = [
  { titre: 'A-06 frères', retient: (a) => a.parente === 'freres' },
  { titre: 'A-06 cousins', retient: (a) => a.parente === 'cousins' },
  { titre: 'A-06 isolés', retient: (a) => a.parente === 'isoles' },
  { titre: 'A-08 variable', retient: (a) => a.type === 'variable' },
  { titre: 'A-08 groupe', retient: (a) => a.type === 'groupe' },
  { titre: 'A-09 1/20', retient: (a) => a.part === '1/20' },
  { titre: 'A-09 10/20', retient: (a) => a.part === '10/20' },
  { titre: 'A-09 19/20', retient: (a) => a.part === '19/20' },
  { titre: 'A-10 même dossier', retient: (a) => a.terme === 'meme-dossier' },
  { titre: 'A-10 absent', retient: (a) => a.terme === 'absent' },
  { titre: 'A-10 autre dossier', retient: (a) => a.terme === 'autre-dossier' },
];

/** Le tableau opérateur × axe, avec la marge de chaque ligne (tous les verdicts de l'opérateur) et de chaque colonne. */
export function tableauOperateurParAxe(verdicts: readonly Verdict[], colonnes: readonly Colonne[]): string {
  const operateurs = [...new Set(verdicts.map((verdict) => verdict.operateur))].sort();
  const lignes = [
    ['Opérateur', ...colonnes.map((colonne) => colonne.titre), 'Marge'],
    ['---', ...colonnes.map(() => '---'), '---'],
  ];
  for (const operateur of operateurs) {
    const deLOperateur = verdicts.filter((verdict) => verdict.operateur === operateur);
    lignes.push([nomDeLOperateur(operateur), ...colonnes.map((colonne) => cellule(compter(deLOperateur.filter((verdict) => colonne.retient(verdict.axes))))), cellule(compter(deLOperateur))]);
  }
  lignes.push(['**Marge**', ...colonnes.map((colonne) => cellule(compter(verdicts.filter((verdict) => colonne.retient(verdict.axes))))), cellule(compter(verdicts))]);
  return lignes.map((ligne) => `| ${ligne.join(' | ')} |`).join('\n');
}

const cellulePourMarkdown = (valeur: string | number): string => String(valeur).replace(/\|/g, '\\|');
const table = (entete: readonly string[], rangees: readonly (readonly (string | number)[])[]): string =>
  [entete, entete.map(() => '---'), ...rangees].map((ligne) => `| ${ligne.map(cellulePourMarkdown).join(' | ')} |`).join('\n');

const NOMBRE_DE_STRATES = (a: string, b: string) => Number(a.slice(1)) - Number(b.slice(1));

function tableauParStrate(mesure: Mesure): string {
  const strates = [...new Set(mesure.verdicts.map((verdict) => verdict.strate))].sort(NOMBRE_DE_STRATES);
  const rangees = strates.map((strate) => {
    const deLaStrate = mesure.verdicts.filter((verdict) => verdict.strate === strate);
    const oracle = compter(deLaStrate.filter((verdict) => verdict.role === 'oracle'));
    return [strate, mesure.casParStrate[strate] ?? '.', oracle.attendus, oracle.detectes, oracle.manques, oracle.fp,
      compter(deLaStrate.filter((verdict) => verdict.role === 'provisoire')).n, compter(deLaStrate.filter((verdict) => verdict.role === 'informatif')).n];
  });
  const oracle = compter(mesure.verdicts.filter((verdict) => verdict.role === 'oracle'));
  rangees.push(['**Total**', Object.values(mesure.casParStrate).reduce((somme, n) => somme + n, 0), oracle.attendus, oracle.detectes, oracle.manques, oracle.fp,
    compter(mesure.verdicts.filter((verdict) => verdict.role === 'provisoire')).n, compter(mesure.verdicts.filter((verdict) => verdict.role === 'informatif')).n]);
  return table(['Strate', 'Cas', 'Attendus', 'Détectés', 'Manqués', 'Faux positifs', 'Verdicts provisoires', 'Verdicts informatifs'], rangees);
}

function tableauParPropriete(mesure: Mesure): string {
  const proprietes = [...new Set(mesure.verdicts.flatMap((verdict) => verdict.proprietes))].sort((a, b) => Number(a.slice(2)) - Number(b.slice(2)));
  const rangees = proprietes.map((propriete) => {
    const compte = compter(mesure.verdicts.filter((verdict) => verdict.role === 'oracle' && verdict.proprietes.includes(propriete)));
    const provisoires = compter(mesure.verdicts.filter((verdict) => verdict.role === 'provisoire' && verdict.proprietes.includes(propriete)));
    return [propriete, compte.attendus, compte.detectes, compte.manques, compte.fp, compte.n - (compte.detectes + compte.manques + compte.fp), provisoires.n];
  });
  return table(['Propriété', 'Attendus', 'Détectés', 'Manqués', 'Faux positifs', 'Silences tenus', 'Verdicts provisoires'], rangees);
}

function tableauDesProvisoires(mesure: Mesure): string {
  const decisions = [...new Set(mesure.verdicts.filter((verdict) => verdict.role === 'provisoire').map((verdict) => verdict.provisoire!))].sort();
  if (decisions.length === 0) return 'Aucun cas ne dépend d\'une décision provisoire dans cette exécution.';
  return table(['Décision', 'Attendus', 'Détectés', 'Manqués', 'Faux positifs'], decisions.map((decision) => {
    const compte = compter(mesure.verdicts.filter((verdict) => verdict.provisoire === decision));
    return [decision, compte.attendus, compte.detectes, compte.manques, compte.fp];
  }));
}

function tableauDesEcarts(mesure: Mesure): string {
  const parEcart = new Map<string, Compte>();
  for (const verdict of mesure.verdicts) {
    if (verdict.role !== 'oracle' || (verdict.issue !== 'manque' && verdict.issue !== 'faux-positif')) continue;
    for (const ecart of verdict.ecarts) {
      const compte = parEcart.get(ecart) ?? compteVide();
      ajouter(compte, verdict);
      parEcart.set(ecart, compte);
    }
  }
  const ordre = (a: string, b: string) => (a === 'nouveau' ? 1 : b === 'nouveau' ? -1 : a.localeCompare(b));
  const lignes = [...parEcart.entries()].sort(([a], [b]) => ordre(a, b)).map(([ecart, compte]) => [ecart, compte.manques, compte.fp] as (string | number)[]);
  if (mesure.stabilite && mesure.stabilite.p21.echecs > 0) lignes.push([`${ECART_DE_P21} (P-21, fichiers)`, mesure.stabilite.p21.echecs, 0]);
  return table(['Écart', 'Manqués', 'Faux positifs'], lignes);
}

function tableauDeVisibilite(mesure: Mesure): string {
  const detectes = mesure.verdicts.filter((verdict) => verdict.issue === 'detecte' && verdict.visibilite);
  const strates = [...new Set(detectes.map((verdict) => verdict.strate))].sort(NOMBRE_DE_STRATES);
  const rangees = strates.map((strate) => {
    const deLaStrate = detectes.filter((verdict) => verdict.strate === strate);
    return [strate, deLaStrate.length, ...(['questions', 'autres', 'perdue'] as const).map((lieu) => deLaStrate.filter((verdict) => verdict.visibilite === lieu).length)];
  });
  const total = ['**Total**', detectes.length, ...(['questions', 'autres', 'perdue'] as const).map((lieu) => detectes.filter((verdict) => verdict.visibilite === lieu).length)];
  return table(['Strate', 'Questions détectées en N1', 'Dans l\'onglet Questions', 'Dans « Autres pistes »', 'Perdues'], [...rangees, total]);
}

function tableauDesTemoins(mesure: Mesure): string {
  return table(['Cas du plan (section 6.1)', 'Écart', 'Attendu', 'Obtenu', 'Détail'], mesure.temoins.map((temoin) => [
    temoin.nom, temoin.ecart, temoin.attendu,
    temoin.verdict ? `${temoin.verdict.proprietes.join(', ')} ${{ manque: 'manqué', detecte: 'détecté', ok: 'ok', 'faux-positif': 'faux positif' }[temoin.verdict.issue]}${temoin.conforme ? '' : ' (hors attendu)'}` : 'cas introuvable',
    temoin.verdict?.detail ?? '',
  ]));
}

const NATURE_DES_SUPPLEMENTS: Readonly<Record<string, string>> = {
  S6: 'groupes validés de `synonymes.json`',
  S11: 'les paires du lot 2 dans la disposition de branches que le kit lit',
};

/** Les manqués et faux positifs qui ne relèvent d'aucun écart connu, regroupés par strate, propriété et cause apparente. */
function tableauDesNouveaux(mesure: Mesure): string {
  const groupes = new Map<string, { strate: string; propriete: string; cause: string; role: string; manques: number; fp: number; exemple: string }>();
  for (const verdict of mesure.verdicts) {
    if (verdict.role === 'provisoire' || !verdict.ecarts.includes('nouveau')) continue;
    const cause = verdict.detail.includes('renomme lui-même') ? 'la référence est une forme que le kit renomme' : verdict.detail.includes('disposition du lot 2') ? 'disposition du lot 2' : '';
    const cle = [verdict.strate, verdict.proprietes[0], cause, verdict.role].join('|');
    const groupe = groupes.get(cle) ?? { strate: verdict.strate, propriete: verdict.proprietes[0], cause, role: verdict.role, manques: 0, fp: 0, exemple: verdict.cas };
    if (verdict.issue === 'manque') groupe.manques++; else groupe.fp++;
    groupes.set(cle, groupe);
  }
  const lignes = [...groupes.values()].sort((a, b) => NOMBRE_DE_STRATES(a.strate, b.strate) || a.propriete.localeCompare(b.propriete) || a.cause.localeCompare(b.cause));
  return table(['Strate', 'Propriété', 'Rôle', 'Cause apparente', 'Manqués', 'Faux positifs', 'Premier cas'], lignes.map((l) => [l.strate, l.propriete, l.role, l.cause || '.', l.manques, l.fp, `\`${l.exemple}\``]));
}

const secondes = (ms: number): string => `${(ms / 1000).toFixed(1)} s`;

interface DureeComplete { readonly ms: number; readonly cas: number; readonly date: string; readonly graine: number }

function lireLaDureeComplete(dossier: string): DureeComplete | undefined {
  const chemin = join(dossier, 'duree-complete.json');
  return existsSync(chemin) ? (JSON.parse(readFileSync(chemin, 'utf8')) as DureeComplete) : undefined;
}

export const csv = (valeurs: readonly (string | number | undefined)[]): string =>
  valeurs.map((valeur) => { const texte = String(valeur ?? ''); return /[",\n;]/.test(texte) ? `"${texte.replace(/"/g, '""')}"` : texte; }).join(',');

function manquesCsv(mesure: Mesure): string {
  const lignes = [csv(['cas', 'strate', 'operateur', 'propriete', 'verdict', 'role', 'decision', 'mot', 'reference', 'ecart', 'detail'])];
  for (const verdict of mesure.verdicts) {
    if (verdict.issue !== 'manque' && verdict.issue !== 'faux-positif') continue;
    lignes.push(csv([verdict.cas, verdict.strate, verdict.operateur, verdict.proprietes.join(' '), verdict.issue === 'manque' ? 'manqué' : 'faux positif', verdict.role,
      verdict.provisoire, verdict.mot, verdict.reference, verdict.ecarts.join(' '), verdict.detail]));
  }
  return `${lignes.join('\n')}\n`;
}

function collisionsCsv(mesure: Mesure): string {
  return `${[csv(['cas', 'strate', 'nature', 'noms', 'motif']), ...mesure.collisionsSansQuestion.map((ligne) => csv([ligne.cas, ligne.strate, ligne.nature, ligne.noms.join(' | '), ligne.motif]))].join('\n')}\n`;
}

/** Le texte de `rapport.md`. */
export function texteDuRapport(mesure: Mesure, dureeComplete: DureeComplete | undefined, fauxPositifs?: string): string {
  const mode = mesure.complet ? 'complet' : mesure.rapide ? 'rapide (un cas sur dix)' : `limité aux strates ${mesure.strates.join(', ')}`;
  const nombreDeCas = Object.values(mesure.casParStrate).reduce((somme, n) => somme + n, 0);
  const complete = mesure.complet ? { ms: mesure.dureeMs, cas: nombreDeCas, date: new Date().toISOString(), graine: mesure.graine } : dureeComplete;
  const stabilite = mesure.stabilite;
  const lignes = [
    '# Stress test F1 : noms de Nomenclature',
    '',
    `- Mode : ${mode}`,
    `- Durée de cette exécution : ${secondes(mesure.dureeMs)}`,
    `- Durée du mode complet : ${complete ? `${secondes(complete.ms)} pour ${complete.cas} cas${mesure.complet ? '' : ` (mesurée le ${complete.date.slice(0, 10)}, graine ${complete.graine})`}` : 'non mesurée, lancer `npm run stress:f1` sans option'}`,
    `- Graine : ${mesure.graine}`,
    `- Empreinte SHA-256 des cas : ${mesure.empreinte}`,
    `- Version du kit : ${mesure.version}`,
    `- Cas exécutés : ${nombreDeCas}`,
    `- Cas supplémentaires : ${Object.entries(mesure.casSupplementaires).map(([strate, n]) => `${strate} ${n} (${NATURE_DES_SUPPLEMENTS[strate] ?? 'supplément'})`).join(', ') || 'aucun'}`,
    '',
    'Chaque cellule porte `attendus / détectés / manqués / faux positifs`. Une cellule `.` n\'a aucun verdict. Les tableaux comptent les verdicts du rôle `oracle` ; les cas qui dépendent d\'une décision provisoire (Q-Fx) et les cas hors oracle sont comptés à part.',
    '',
    '## Cas du plan',
    '',
    tableauDesTemoins(mesure),
    '',
    '## Synthèse par strate',
    '',
    tableauParStrate(mesure),
    '',
    '## Tableau opérateur × axe, placement',
    '',
    tableauOperateurParAxe(mesure.verdicts.filter((verdict) => verdict.role === 'oracle'), COLONNES_DE_PLACEMENT),
    '',
    '## Tableau opérateur × axe, forme',
    '',
    tableauOperateurParAxe(mesure.verdicts.filter((verdict) => verdict.role === 'oracle'), COLONNES_DE_FORME),
    '',
    '## Synthèse par propriété',
    '',
    tableauParPropriete(mesure),
    '',
    `Le squelette seul (P-23) donne ${mesure.squelette.questions} question et ${mesure.squelette.renommages} renommage.`,
    stabilite
      ? `P-21 (idempotence, définition stricte) : ${stabilite.p21.reussis} fichiers sur ${stabilite.fichiers}${stabilite.p21.echecs > 0 ? `, ${stabilite.p21.echecs} échecs rattachés à l'écart nouveau « ${ECART_DE_P21} »` : ''}. P-22 (stabilité à la permutation) : ${stabilite.p22.reussis} fichiers sur ${stabilite.fichiers}. ${stabilite.noms} noms lus, 1 500 noms au plus par fichier.`
      : 'P-21 et P-22 ne sont mesurées que sans `--strate`.',
    ...(stabilite && stabilite.echecs.length > 0 ? ['', ...stabilite.echecs.slice(0, 20).map((echec) => `- ${echec.propriete} ${echec.fichier} : ${echec.detail}${echec.ecart ? ` [${echec.ecart}]` : ''}`)] : []),
    '',
    '## Rattachement des manqués aux écarts de l\'inventaire',
    '',
    tableauDesEcarts(mesure),
    '',
    '## Écarts nouveaux, à rattacher',
    '',
    tableauDesNouveaux(mesure),
    '',
    '## Décisions provisoires, comptées à part',
    '',
    tableauDesProvisoires(mesure),
    '',
    '## Visibilité dans la session (N2)',
    '',
    tableauDeVisibilite(mesure),
    '',
    `${mesure.collisionsSansQuestion.length} collisions sans question sont listées dans \`collisions-sans-question.csv\`.`,
    '',
    ...(fauxPositifs ? ['## Faux positifs et seuil de longueur', '', fauxPositifs, ''] : []),
    '## Durée par étape',
    '',
    table(['Étape', 'Durée'], Object.entries(mesure.dureeParEtape).map(([etape, ms]) => [etape, secondes(ms)])),
    '',
  ];
  return lignes.join('\n');
}

export function ecrireLeRapport(mesure: Mesure, dossier: string, fauxPositifs?: string): void {
  mkdirSync(dossier, { recursive: true });
  const dureeComplete = lireLaDureeComplete(dossier);
  const nombreDeCas = Object.values(mesure.casParStrate).reduce((somme, n) => somme + n, 0);
  if (mesure.complet) writeFileSync(join(dossier, 'duree-complete.json'), `${JSON.stringify({ ms: mesure.dureeMs, cas: nombreDeCas, date: new Date().toISOString(), graine: mesure.graine })}\n`, 'utf8');
  writeFileSync(join(dossier, 'rapport.md'), texteDuRapport(mesure, dureeComplete, fauxPositifs), 'utf8');
  writeFileSync(join(dossier, 'rapport.json'), JSON.stringify({
    graine: mesure.graine, empreinte: mesure.empreinte, version: mesure.version, dureeMs: mesure.dureeMs, casParStrate: mesure.casParStrate,
    temoins: mesure.temoins, stabilite: mesure.stabilite, cas: mesure.cas,
  }), 'utf8');
  writeFileSync(join(dossier, 'manques.csv'), manquesCsv(mesure), 'utf8');
  writeFileSync(join(dossier, 'collisions-sans-question.csv'), collisionsCsv(mesure), 'utf8');
}

/** Le nombre de manqués et de faux positifs certains du rôle `oracle`, pour `--attendre-zero`. */
export function resteDesEcarts(mesure: Mesure): number {
  const verdicts = compter(mesure.verdicts.filter((verdict) => verdict.role === 'oracle'));
  const stabilite = mesure.stabilite ? mesure.stabilite.p21.echecs + mesure.stabilite.p22.echecs : 0;
  return verdicts.manques + verdicts.fp + stabilite + mesure.squelette.questions + mesure.squelette.renommages + mesure.temoins.filter((temoin) => temoin.verdict?.issue === 'manque').length;
}

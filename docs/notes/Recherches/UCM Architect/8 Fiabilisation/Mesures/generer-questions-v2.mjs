// Écrit QUESTIONS-V2.html : les questions de la section 9 des six plans de stress test, les questions nées de la mesure, et pour
// chacune le nombre de cas `mesure` qu'elle tient dans les rapports de `_local/stress/`, dont ceux qui ont un écart.
// La page ne cite aucun nom tiré d'un fichier client : elle ne reprend que les plans, MESURE-DES-FAILLES.md et des nombres.
// Lancer depuis la racine du dépôt, après les harnais : `node "docs/notes/Recherches/UCM Architect/8 Fiabilisation/Mesures/generer-questions-v2.mjs"`.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ici = path.dirname(fileURLToPath(import.meta.url));
const dossier = path.resolve(ici, '..');
const local = path.resolve(ici, '../../../../../../_local/stress');

const PLANS = [
  ['F1 Noms de Nomenclature', 'PLAN-STRESS-F1-NOMS.md'],
  ['F2 Structure du mode Tokens', 'PLAN-STRESS-F2-STRUCTURE.md'],
  ['F3-F4 Liaisons et tailles', 'PLAN-STRESS-F3-F4-COMPOSANT.md'],
  ['F5-F6 Variants, typographie et icônes', 'PLAN-STRESS-F5-F6-VARIANTS-TYPO.md'],
  ['F7 Accessibilité', 'PLAN-STRESS-F7-ACCESSIBILITE.md'],
  ['F8-F9 Règles, moteur, lecture et états', 'PLAN-STRESS-F8-F9-ANALYSE.md'],
];
const RAPPORTS = [
  'f2-structure/operateurs.json', 'f2-structure/chaine.json', 'f3-composant/chaine.json', 'f5-variants/operateurs.json',
  'f7-accessibilite/operateurs.json', 'f8-analyse/operateurs.json', 'f8-analyse/operateurs-f9.json', 'f8-analyse/chaine.json',
];
// Les questions que le mainteneur a déjà tranchées, ou qu'il s'est réservées.
const ETATS = { 'Q-F2-7': 'decidee', 'Q-F2-9': 'decidee', 'Q-F3-15': 'reservee' };
// Les questions des écrans, toutes validées par le mainteneur (option B pour QM-1).
const ECRANS_VALIDES = new Set(['QM-1', 'QM-2', 'QM-3', 'QM-4', 'QM-5', 'QM-6', 'QM-7', 'QM-10', 'QM-11']);
// Un exemple concret par question, écrit dans exemples-v2.json : ce que le designer voit dans Figma, avant et après.
const cheminDesExemples = path.join(ici, 'exemples-v2.json');
const EXEMPLES = existsSync(cheminDesExemples) ? JSON.parse(readFileSync(cheminDesExemples, 'utf8')) : {};

const cellules = (ligne) => ligne.replace(/^\|\s*/, '').replace(/\s*\|\s*$/, '').split(/\s*\|\s*/);

// La section 9 de F1 porte deux tableaux, les décisions puis les questions. Les lignes se fusionnent par identifiant.
function questionsDuPlan(fichier) {
  const texte = readFileSync(path.join(dossier, fichier), 'utf8');
  const lignes = texte.slice(texte.indexOf('## 9.')).split('\n');
  const parId = new Map();
  let entete = null;
  for (const ligne of lignes) {
    if (!ligne.startsWith('|')) { entete = null; continue; }
    const c = cellules(ligne);
    if (!entete) { entete = c; continue; }
    if (!/^Q-/.test(c[0])) continue;
    const q = parId.get(c[0]) ?? { id: c[0], question: '', proposition: '' };
    entete.forEach((titre, i) => {
      if (titre === 'Question') q.question = c[i];
      if (titre === 'Proposition' || titre === 'Décision provisoire') q.proposition = c[i];
    });
    parId.set(c[0], q);
  }
  return [...parId.values()];
}

// Les cas `mesure` par question, et ceux d'entre eux qui ont un écart.
const comptes = new Map();
const compter = (id, ecart) => {
  const c = comptes.get(id) ?? { cas: 0, ecarts: 0 };
  c.cas += 1;
  if (ecart) c.ecarts += 1;
  comptes.set(id, c);
};
for (const rapport of RAPPORTS) {
  const chemin = path.join(local, rapport);
  if (!existsSync(chemin)) { console.log(`${rapport} absent`); continue; }
  for (const cas of JSON.parse(readFileSync(chemin, 'utf8')).cas ?? []) {
    if (cas.verdict !== 'mesure' || typeof cas.question !== 'string') continue;
    compter(cas.question, (cas.ecarts?.length ?? 0) > 0 || (cas.echouees ?? 0) > 0);
  }
}
// F1 range ses cas en attente par strate : S3 dépend de Q-F9, S4 de Q-F1.
const f1 = path.join(local, 'f1-noms/rapport.json');
if (existsSync(f1)) {
  const { casParStrate } = JSON.parse(readFileSync(f1, 'utf8'));
  const nombre = (strate) => { const v = casParStrate?.[strate]; return typeof v === 'number' ? v : (v?.cas ?? v?.total ?? 0); };
  comptes.set('Q-F9', { cas: nombre('S3'), ecarts: null });
  comptes.set('Q-F1', { cas: nombre('S4'), ecarts: null });
}

// Les écarts de MESURE-DES-FAILLES.md dont la ligne cite la question.
const mesure = readFileSync(path.join(dossier, 'MESURE-DES-FAILLES.md'), 'utf8').split('\n');
const ecartsLies = (id) => {
  const motif = new RegExp(`${id.replace(/-/g, '\\-')}(?![\\d-])`);
  const ids = new Set();
  for (const ligne of mesure) if (motif.test(ligne)) for (const e of ligne.match(/\b[EN]-\d{2}\b/g) ?? []) ids.add(e);
  return [...ids].sort();
};

const familles = PLANS.map(([famille, fichier]) => ({
  famille, fichier,
  questions: questionsDuPlan(fichier).map((q) => ({ ...q, etat: ETATS[q.id] ?? 'ouverte', mesure: comptes.get(q.id) ?? { cas: 0, ecarts: 0 }, ecarts: ecartsLies(q.id) })),
}));

familles.push({
  famille: 'Questions nées de la mesure', fichier: 'MESURE-DES-FAILLES.md',
  questions: [
    { id: 'QV-1', question: 'Un sujet d\'analyse sans nœud finit `complete` avec un message vide (cas N9-3). Que montre l\'écran ?', proposition: 'L\'écran existant « Aucun composant n\'est sélectionné », sans statut `complete`.', ecarts: [], mesure: { cas: 1, ecarts: 1 } },
    { id: 'QV-2', question: 'Ignorer un constat sur une analyse périmée range sa clé (cas Ig-10). Le geste reste-t-il permis ?', proposition: 'Non. Ignorer est inactif sur une analyse périmée, comme les cases (QM-6 de la maquette).', ecarts: [], mesure: { cas: 1, ecarts: 1 } },
    { id: 'QV-3', question: 'Un thème dont 908 variables visent le thème lui-même reçoit 4 359 cartes C82 `couche`, une par variable et par mode. Comment les regrouper ?', proposition: 'Une carte par couple de collections et par couche visée, avec le nombre de variables et de modes. La liste des variables se déplie.', ecarts: ['N-87'], mesure: { cas: 0, ecarts: 0 } },
    { id: 'QV-4', question: 'Un fichier sans collection reconnue comme `theme` ne reçoit aucun contrôle d\'intégrité, sans le dire. Que dit l\'écran ?', proposition: 'Une information dans le mode Tokens : aucune collection n\'est reconnue comme `theme`, l\'intégrité UCM n\'est pas contrôlée. Nomenclature propose déjà le renommage de la collection.', ecarts: ['N-88'], mesure: { cas: 0, ecarts: 0 } },
    { id: 'QV-5', question: 'Le rejeu du mode Composant n\'a qu\'un Button capturé. Pouvez-vous capturer Alert et Input ?', proposition: 'Oui, au prochain passage dans Figma, par « Télécharger le rapport d\'analyse ». Les fichiers vont dans `_local/recette-v2/`.', ecarts: [], mesure: { cas: 0, ecarts: 0 } },
  ].map((q) => ({ ...q, etat: 'ouverte' })),
});

// Les questions des écrans, reprises du tableau de MAQUETTE-FIABILISATION.html pour qu'elles se répondent ici.
familles.push({
  famille: 'Écrans de la maquette', fichier: 'MAQUETTE-FIABILISATION.html',
  questions: [
    ['QM-1', 'Le mode Tokens passe-t-il à deux onglets, Constats et Règles ?', 'Oui, option B de la section 1 de la maquette.'],
    ['QM-2', 'Quelles catégories pour le mode Tokens ?', 'Noms, puis les huit rubriques de l’onglet À faire dans Figma (Variables manquantes, Crans, Alias, Modes, Valeurs, Couches, Types, Rangement), puis Scopes des corrections. Une catégorie sans constat se montre tenue.'],
    ['QM-3', 'Quels signes pour les catégories du mode Tokens ?', 'Ceux de la section 8 de la maquette. Cinq sont repris du kit (`a-creer`, `cran`, `rompue`, `mode`, `scope`), cinq sont nouveaux (`nom`, `valeurs`, `couches`, `types`, `rangement`).'],
    ['QM-4', 'Où vont les questions dans une catégorie ?', 'En tête de la catégorie. La puce Questions du sommaire les isole.'],
    ['QM-5', '« Plus tard » reste-t-il à côté d’Ignorer et de « Ne plus proposer » ?', 'Oui sur les questions. « Plus tard » vaut pour la session, Ignorer pour le fichier, « Ne plus proposer » pour la proposition.'],
    ['QM-6', 'Les constats d’une analyse périmée gardent-ils leurs cases ?', 'Non. Les cases et Appliquer sont inactifs jusqu’à Actualiser (Q-F89-15).'],
    ['QM-7', 'La bannière partielle liste-t-elle chaque cause ?', 'Oui, une ligne par cause, et jamais « N lus sur N ».'],
    ['QM-10', 'Les catégories du mode Tokens prennent-elles toutes la teinte tokens ?', 'Oui. La forme porte la catégorie, et les sept teintes restent aux éléments du mode Composant.'],
    ['QM-11', 'Les doublons R-1 à R-8 de la section 8 se corrigent-ils dans le plan de correction ?', 'Oui, en deux lots. Le premier change `signes.ts` du kit, le second fait lire le kit à Nomenclature.'],
  ].map(([id, question, proposition]) => ({ id, question, proposition, etat: ECRANS_VALIDES.has(id) ? 'decidee' : 'ouverte', ecarts: [], mesure: { cas: 0, ecarts: 0 } })),
});

for (const famille of familles) for (const q of famille.questions) q.exemple = EXEMPLES[q.id] ?? '';
const sansExemple = familles.flatMap((f) => f.questions).filter((q) => q.etat === 'ouverte' && !q.exemple).map((q) => q.id);

const total = familles.reduce((s, f) => s + f.questions.length, 0);
const ouvertes = familles.reduce((s, f) => s + f.questions.filter((q) => q.etat === 'ouverte').length, 0);
const gabarit = readFileSync(path.join(ici, 'questions-v2.gabarit.html'), 'utf8');
const page = gabarit
  .replace('/*DONNEES*/', `const FAMILLES = ${JSON.stringify(familles)};`)
  .replace('<!--TOTAL-->', String(total))
  .replace('<!--OUVERTES-->', String(ouvertes));
writeFileSync(path.join(dossier, 'QUESTIONS-V2.html'), page);
console.log(`QUESTIONS-V2.html : ${total} questions, ${ouvertes} ouvertes`);
if (sansExemple.length) console.log(`Sans exemple : ${sansExemple.join(', ')}`);
for (const f of familles) console.log(`  ${f.famille} : ${f.questions.length}, ${f.questions.reduce((s, q) => s + q.mesure.cas, 0)} cas mesure`);

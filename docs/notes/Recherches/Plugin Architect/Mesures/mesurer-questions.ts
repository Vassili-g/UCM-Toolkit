/** Relève les questions d'un export DTCG ; écrit seulement sur la sortie standard. */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { cheminDeReference, indexerTokensDtcg } from '@ucm-kit/core/lecteurs';
import {
  commencerLexique, detecterLesQuestions, indexerVocabulaire,
  type NomLu, type Question,
} from '@ucm-kit/core/referentiel';

const source = process.argv[2];
if (!source) throw new Error('Usage : node --import tsx mesurer-questions.ts C1|C2|<tokens.json>');
const fichier = source === 'C1'
  ? fileURLToPath(new URL('../../../../../../UCM-Playground/src/tokens/tokens.json', import.meta.url))
  : source === 'C2'
    ? fileURLToPath(new URL('../1 Architecture globale/Mesures/tokens-slice-exemple.json', import.meta.url))
    : source;
const octets = readFileSync(fichier);
const tokens = indexerTokensDtcg(JSON.parse(octets.toString('utf8')));
const noms: NomLu[] = [];
const collections = new Set<string>();
for (const [chemin, feuille] of tokens) {
  const [collection, ...segments] = chemin.split('.');
  if (segments.length === 0) throw new Error(`Token sans collection racine : ${chemin}`);
  collections.add(collection);
  const valeur = feuille !== null && typeof feuille === 'object' && '$value' in feuille ? feuille.$value : undefined;
  const cibleAlias = cheminDeReference(valeur);
  noms.push({
    id: chemin, nom: segments.join('/'), categorie: 'variables', portee: collection,
    categoriesDesSegments: segments.map((_, rang) => rang + 1 < segments.length ? 'groupes' : null),
    ...(cibleAlias ? { cibleAlias } : {}),
  });
}
for (const collection of collections) noms.push({ id: collection, nom: collection, categorie: 'collections', portee: 'document' });
const preparation = commencerLexique();
preparation.ajouter(noms);
const calcul = preparation.terminer();
let etape = calcul.next();
while (!etape.done) etape = calcul.next();
const index = indexerVocabulaire({ personnalises: [], ecartsUcm: [] }).index;
const resultat = detecterLesQuestions(etape.value, index,
  { distincts: [], plusTard: [], voulus: [], collectionsGardees: [] }, { maximum: 20 });
const toutes = [...resultat.questions, ...resultat.autres].sort((a, b) => b.score - a.score || (a.cle < b.cle ? -1 : a.cle > b.cle ? 1 : 0));
const parDetecteur: Record<string, number> = Object.fromEntries([
  'terminaison', 'pluriel', 'abreviation', 'synonymes', 'branches-paralleles', 'faute', 'mots-colles', 'echelle', 'collection',
].map((nom) => [nom, 0]));
for (const question of toutes) parDetecteur['indice' in question ? question.indice : question.type]++;

function resumer(question: Question) {
  const commun = { cle: question.cle, score: question.score };
  if (question.type === 'paire') return { ...commun, detecteur: question.indice,
    termes: question.termes.map(({ mot, nombre }) => ({ mot, nombre })), proposition: question.termes[question.propose].mot };
  if (question.type === 'ecriture-du-terme') return { ...commun, detecteur: question.indice,
    terme: question.terme.mot, nombre: question.terme.nombre, proposition: question.proposition };
  if (question.type === 'echelle') return { ...commun, detecteur: question.type,
    formes: question.formes, nombres: question.nombres, proposition: question.formes[question.propose] };
  return { ...commun, detecteur: question.type, collection: question.nom, nombre: question.nombre };
}

process.stdout.write(`${JSON.stringify({
  corpus: source === 'C1' || source === 'C2' ? source : 'fichier',
  environnement: { node: process.version, revision: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim() },
  sha256: createHash('sha256').update(octets).digest('hex'),
  variables: tokens.size, collections: collections.size,
  seuil: 2, maximum: 20, total: toutes.length, retenues: resultat.questions.length, autres: resultat.autres.length,
  parDetecteur, premieres: toutes.slice(0, 40).map(resumer),
  limites: [
    'La racine DTCG représente la collection ; le reste du chemin représente le nom de variable.',
    'Seul un alias direct de $value est relevé ; les autres modes et les valeurs identiques ne sont pas des indices.',
    'Les noms exportés ont déjà été normalisés ; la casse et les séparateurs originaux de Figma sont perdus.',
    'Le comptage par détecteur porte sur les questions dédupliquées et inclut les pistes sous le seuil ou au-delà du plafond.',
    'Les quarante premières sont triées avant seuil et plafond pour leur jugement par le mainteneur.',
  ],
}, null, 2)}\n`);

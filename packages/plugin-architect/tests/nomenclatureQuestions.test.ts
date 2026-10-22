/** Ce que l'onglet Questions affiche d'une question et la réponse de chaque bouton. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { COLLECTIONS, type IndiceDePaire } from '@ucm-kit/core/referentiel';
import type { LigneVue, QuestionVue, Reponse, TermeVue } from '../src/messages/nomenclature';
import {
  carteDeConflit,
  carteDeQuestion,
  champAutreTerme,
  composerLaListe,
  ligneDeReprise,
  ligneFaite,
  type ActionDeCarte,
  type CarteDeQuestion,
  texteDuTitre,
} from '../src/ui/nomenclature/questions';
import { ligneDeLaVueVide } from '../src/ui/nomenclature/aTrancher';
import { TEXTES } from '../src/ui/nomenclature/textes';

const chemin = (avant: string, terme: string, apres: string): LigneVue => {
  const nom = `${avant}${terme}${apres}`;
  return { id: terme, ancien: nom, nouveau: nom, marques: [avant.split('/').length - 1], aussi: [] };
};
const terme = (mot: string, nombre: number, ucm = false): TermeVue => ({ mot, nombre, ucm, exemples: [chemin('components/button/', mot, '/border')] });

const paire = (indice: IndiceDePaire = 'terminaison', cibleCommune: string | null = null): Extract<QuestionVue, { type: 'paire' }> => ({
  type: 'paire', cle: 'paire:outline', indice, termes: [terme('outline', 8), terme('outlined', 24)], propose: 1, cibleCommune, effet: null,
});
const faute: Extract<QuestionVue, { type: 'ecriture-du-terme' }> = {
  type: 'ecriture-du-terme', cle: 'faute', indice: 'faute', terme: terme('contrashovered', 1), proposition: ['contrasthovered'], reference: { mot: 'contrasthovered', nombre: 14 }, effet: null,
};
const colles: Extract<QuestionVue, { type: 'ecriture-du-terme' }> = {
  type: 'ecriture-du-terme', cle: 'colles', indice: 'mots-colles', terme: terme('vspacingsmall', 3), proposition: ['v', 'spacing', 'small'], reference: null, effet: null,
};
const collection = (proposee: string | null): Extract<QuestionVue, { type: 'collection' }> => ({ type: 'collection', cle: 'collection', nom: 'Typo Tokens', nombre: 48, proposee });

/** Les réponses que les boutons d'une carte envoient, par identifiant d'action. */
function reponses(carte: CarteDeQuestion): Record<string, Reponse | 'champ' | 'choix'> {
  const actions: ActionDeCarte[] = [...carte.pied.actions, carte.pied.plusTard];
  return Object.fromEntries(actions.map((action) => [action.id, action.suite.sorte === 'repondre' ? action.suite.reponse : action.suite.sorte === 'saisir' ? 'champ' : 'choix']));
}

const poidsDuPied = (carte: CarteDeQuestion): string[] => [...carte.pied.actions, carte.pied.plusTard].map((action) => action.poids as string);

test('une paire pose la proposition en titre, le terme écarté en rouge et le terme proposé en vert', () => {
  const carte = carteDeQuestion(paire('pluriel', 'theme/primary/solid/default'));
  assert.equal(carte.forme, 'proposition');
  if (carte.forme !== 'proposition') return;
  assert.equal(texteDuTitre(carte.titre), 'Remplacer outline par outlined ?');
  assert.deepEqual([carte.titre.ancien, carte.titre.nouveau], ['outline', 'outlined']);
  assert.equal(carte.detail, 'Singulier et pluriel · 8 variables à renommer · outlined déjà dans 24. Les deux visent theme/primary/solid/default.');
  assert.equal(carte.effet, null);
});

test('l’effet de la carte est celui du bilan', () => {
  const effet = chemin('components/button/', 'outlined', '/border');
  const carte = carteDeQuestion({ ...paire(), effet });
  assert.equal(carte.forme === 'proposition' ? carte.effet : 'autre forme', effet);
});

test('chaque indice de paire a son texte, et sans cible commune le détail s’arrête au terme proposé', () => {
  const details = (['terminaison', 'pluriel', 'abreviation', 'synonymes', 'branches-paralleles'] as const).map((indice) => {
    const carte = carteDeQuestion(paire(indice));
    return carte.forme === 'proposition' ? carte.detail.split(' · ')[0] : 'autre forme';
  });
  assert.deepEqual(details, ['Terminaison', 'Singulier et pluriel', 'Abréviation', 'Synonymes', 'Branches parallèles']);
  const carte = carteDeQuestion(paire());
  assert.equal(carte.forme === 'proposition' ? carte.detail : 'autre forme', 'Terminaison · 8 variables à renommer · outlined déjà dans 24');
});

test('le titre suit `propose`, et la pastille UCM suit le terme proposé', () => {
  const question = { ...paire('synonymes'), propose: 0 as const, termes: [terme('danger', 40, true), terme('error', 18)] as const };
  const carte = carteDeQuestion(question);
  if (carte.forme !== 'proposition') throw new Error('forme inattendue');
  assert.equal(texteDuTitre(carte.titre), 'Remplacer error par danger ?');
  assert.equal(carte.ucm, true);
  assert.equal(carte.detail, 'Synonymes · 18 variables à renommer · danger déjà dans 40');
  const sansUcm = carteDeQuestion({ ...question, propose: 1 });
  assert.equal(sansUcm.forme === 'proposition' ? sansUcm.ucm : 'autre forme', false);
});

test('les boutons d’une paire : Remplacer garde le proposé, Garder le terme écarté, Termes différents, Autre terme… ouvre le champ', () => {
  const carte = carteDeQuestion(paire());
  assert.deepEqual(reponses(carte), {
    remplacer: { type: 'garder', rang: 1 },
    garder: { type: 'garder', rang: 0 },
    'termes-differents': { type: 'distincts' },
    'autre-terme': 'champ',
    'plus-tard': { type: 'plus-tard' },
  });
  assert.deepEqual(carte.pied.actions.map((action) => action.libelle), ['Remplacer', 'Garder outline', 'Termes différents', 'Autre terme…']);
  assert.equal(carte.pied.plusTard.libelle, 'Plus tard');
});

test('la carte de paire n’a qu’un bouton bordé et aucun bouton principal', () => {
  const carte = carteDeQuestion(paire());
  assert.deepEqual(poidsDuPied(carte), ['borde', 'texte', 'texte', 'texte', 'texte']);
  assert.equal(poidsDuPied(carte).includes('principal'), false);
  assert.equal(carte.pied.actions[0].libelle, 'Remplacer');
});

test('un terme mal écrit propose de corriger, avec le nombre et la référence', () => {
  const carte = carteDeQuestion(faute);
  if (carte.forme !== 'proposition') throw new Error('forme inattendue');
  assert.equal(texteDuTitre(carte.titre), 'Corriger contrashovered en contrasthovered ?');
  assert.equal(carte.detail, 'Une lettre d’écart · 1 variable ; contrasthovered est employé dans 14 variables');
  assert.deepEqual(carte.pied.actions.map((action) => [action.libelle, action.poids]), [['Corriger', 'borde'], ['C’est voulu', 'texte']]);
  assert.deepEqual(reponses(carte), { corriger: { type: 'corriger', mots: ['contrasthovered'] }, voulu: { type: 'voulu' }, 'plus-tard': { type: 'plus-tard' } });
  assert.equal(poidsDuPied(carte).filter((poids) => poids === 'borde').length, 1);
});

test('des mots collés se séparent par des tirets, sans référence', () => {
  const carte = carteDeQuestion(colles);
  if (carte.forme !== 'proposition') throw new Error('forme inattendue');
  assert.equal(texteDuTitre(carte.titre), 'Séparer vspacingsmall en v-spacing-small ?');
  assert.equal(carte.detail, 'Mots collés · 3 variables');
  assert.deepEqual(carte.pied.actions.map((action) => [action.libelle, action.poids]), [['Séparer', 'borde'], ['C’est un seul mot', 'texte']]);
  assert.deepEqual(reponses(carte), { separer: { type: 'corriger', mots: ['v', 'spacing', 'small'] }, 'seul-mot': { type: 'voulu' }, 'plus-tard': { type: 'plus-tard' } });
});

test('une collection propose la liste du référentiel, présélectionnée sur la proposition', () => {
  const carte = carteDeQuestion(collection('typography'));
  if (carte.forme !== 'collection') throw new Error('forme inattendue');
  assert.equal(carte.question, 'À quelle collection UCM correspond Typo Tokens ?');
  assert.equal(carte.indice, '48 variables');
  assert.deepEqual(carte.options, COLLECTIONS);
  assert.equal(carte.choix, 'typography');
});

test('une proposition absente ou hors référentiel ne présélectionne aucune collection', () => {
  for (const proposee of [null, 'Typo Tokens']) {
    const carte = carteDeQuestion(collection(proposee));
    if (carte.forme !== 'collection') throw new Error('forme inattendue');
    assert.equal(carte.choix, null);
  }
});

test('« Renommer » répond avec la collection choisie, « Garder ce nom » avec null', () => {
  const carte = carteDeQuestion(collection('typography'));
  const [renommer, garder] = carte.pied.actions;
  assert.equal(renommer.suite.sorte, 'choisir');
  if (renommer.suite.sorte === 'choisir') assert.deepEqual(renommer.suite.reponse('layout'), { type: 'collection', cible: 'layout' });
  assert.deepEqual([renommer.libelle, garder.libelle], ['Renommer', 'Garder ce nom']);
  assert.deepEqual(poidsDuPied(carte), ['borde', 'texte', 'texte']);
  assert.deepEqual(garder.suite, { sorte: 'repondre', reponse: { type: 'collection', cible: null } });
});

test('« Autre terme… » montre l’avant → après de la saisie et n’enregistre pas une saisie vide', () => {
  const champ = champAutreTerme({ ...paire(), termes: [terme('contained', 16), terme('filled', 6)] });
  assert.equal(champ.question, 'Remplacer contained et filled par');
  assert.deepEqual(champ.effet(' solid '), { avant: 'contained, filled', apres: 'solid', detail: '22 variables rejoindront les renommages' });
  assert.deepEqual(champ.reponse(' solid '), { type: 'autre', terme: 'solid' });
  assert.equal(champ.reponse('   '), null);
  assert.equal(champAutreTerme({ ...paire(), termes: [terme('a', 1), terme('b', 0)] }).effet('c').detail, '1 variable rejoindra les renommages');
});

test('la ligne de réussite d’une paire dit ce qui change et ce que Renommages reçoit', () => {
  assert.deepEqual(ligneFaite(paire(), { type: 'garder', rang: 1 }), { avant: 'outline', separateur: '→', apres: 'outlined', detail: '8 variables ajoutées aux renommages' });
  assert.deepEqual(ligneFaite(paire(), { type: 'garder', rang: 0 }), { avant: 'outlined', separateur: '→', apres: 'outline', detail: '24 variables ajoutées aux renommages' });
  assert.deepEqual(ligneFaite(paire(), { type: 'autre', terme: 'solid' }), { avant: 'outline, outlined', separateur: '→', apres: 'solid', detail: '32 variables ajoutées aux renommages' });
  assert.deepEqual(ligneFaite(paire(), { type: 'distincts' }), { avant: 'outline', separateur: '≠', apres: 'outlined', detail: 'Gardés séparés' });
  assert.deepEqual(ligneFaite(paire(), { type: 'plus-tard' }), { avant: 'outline, outlined', separateur: null, apres: null, detail: 'Remis à plus tard' });
  assert.equal(ligneFaite(paire(), { type: 'voulu' }), null);
});

test('la ligne de réussite des autres questions', () => {
  assert.deepEqual(ligneFaite(faute, { type: 'corriger', mots: ['contrasthovered'] }), { avant: 'contrashovered', separateur: '→', apres: 'contrasthovered', detail: '1 variable ajoutée aux renommages' });
  assert.deepEqual(ligneFaite(colles, { type: 'corriger', mots: ['v', 'spacing', 'small'] }), { avant: 'vspacingsmall', separateur: '→', apres: 'v-spacing-small', detail: '3 variables ajoutées aux renommages' });
  assert.deepEqual(ligneFaite(faute, { type: 'voulu' }), { avant: 'contrashovered', separateur: null, apres: null, detail: 'Écriture gardée' });
  assert.deepEqual(ligneFaite(collection(null), { type: 'collection', cible: 'typography' }), { avant: 'Typo Tokens', separateur: '→', apres: 'typography', detail: '1 collection ajoutée aux renommages' });
  assert.deepEqual(ligneFaite(collection(null), { type: 'collection', cible: null }), { avant: 'Typo Tokens', separateur: null, apres: null, detail: 'Nom gardé' });
  assert.equal(ligneFaite(collection(null), { type: 'distincts' }), null);
});

test('une question remise à plus tard se reprend avec sa proposition', () => {
  assert.deepEqual(ligneDeReprise(paire()), { cle: 'paire:outline', avant: 'outline', apres: 'outlined' });
  assert.deepEqual(ligneDeReprise(colles), { cle: 'colles', avant: 'vspacingsmall', apres: 'v-spacing-small' });
  assert.deepEqual(ligneDeReprise(collection(null)), { cle: 'collection', avant: 'Typo Tokens', apres: null });
});

test('une règle qui contredit UCM montre son avant → après et le terme UCM à écarter', () => {
  const carte = carteDeConflit([{ type: 'contredit-ucm', terme: 'hovered', remplace: 'hover', termeUcm: 'hover' }]);
  assert.equal(carte.titre, 'Cette règle contredit UCM');
  assert.deepEqual(carte.blocs, [{ avant: 'hover', apres: 'hovered', explication: '`hover` est un terme UCM.', termeUcm: 'hover' }]);
  const synonyme = carteDeConflit([{ type: 'contredit-ucm', terme: 'custom', remplace: 'press', termeUcm: 'pressed' }]);
  assert.deepEqual(synonyme.blocs, [{ avant: 'press', apres: 'custom', explication: 'UCM remplace `press` par `pressed`.', termeUcm: 'pressed' }]);
});

test('un terme déjà remplacé et une boucle s’expliquent sans proposer d’écarter un terme UCM', () => {
  const dejaRemplace = carteDeConflit([{ type: 'deja-remplace', remplace: 'bg', par: 'background' }]);
  assert.equal(dejaRemplace.titre, 'Ce terme a déjà un remplaçant');
  assert.deepEqual(dejaRemplace.blocs.map((bloc) => [bloc.avant, bloc.apres, bloc.termeUcm]), [['bg', 'background', null]]);
  const boucle = carteDeConflit([{ type: 'cycle', termes: ['a', 'b', 'c'] }]);
  assert.equal(boucle.titre, 'Cette règle crée une boucle');
  assert.deepEqual(boucle.blocs.map((bloc) => [bloc.avant, bloc.apres, bloc.termeUcm]), [[null, null, null]]);
  assert.match(boucle.blocs[0].explication, /a, b, c/);
});

test('une ligne de réussite reprend la place de sa carte, sans passer devant les questions qui la précèdent', () => {
  assert.deepEqual(composerLaListe(['a', 'b', 'c'], ['a', 'c'], new Set(['b'])), ['a', 'b', 'c']);
  assert.deepEqual(composerLaListe(['a', 'b', 'c', 'd'], ['c', 'd'], new Set(['a', 'b'])), ['a', 'b', 'c', 'd']);
  assert.deepEqual(composerLaListe(['a', 'b', 'c'], ['b', 'c'], new Set(['a'])), ['a', 'b', 'c']);
});

test('la liste suit l’ordre du bilan, une question annulée y reprend sa place, une ligne inconnue passe en dernier', () => {
  assert.deepEqual(composerLaListe(['a', 'b'], ['a', 'x', 'b'], new Set()), ['a', 'x', 'b']);
  assert.deepEqual(composerLaListe(['a'], ['a', 'b'], new Set(['z'])), ['a', 'b', 'z']);
  assert.deepEqual(composerLaListe([], [], new Set()), []);
  assert.deepEqual(composerLaListe(['a', 'b'], ['a', 'b'], new Set(['b'])), ['a', 'b']);
});

test('sans question mais avec un renommage, l’onglet montre la vue vide et sa ligne', () => {
  assert.equal(ligneDeLaVueVide(0, 0), TEXTES.questionsVides.ligne);
  assert.match(TEXTES.questionsVides.ligne, /`bg`/u);
});

test('la vue vide dit combien de questions sont gardées pour plus tard, au pluriel et au singulier', () => {
  assert.equal(ligneDeLaVueVide(0, 2), 'Vous avez gardé 2 questions pour plus tard. Elles sont ci-dessous.');
  assert.equal(ligneDeLaVueVide(0, 1), 'Vous avez gardé 1 question pour plus tard. Elle est ci-dessous.');
});

test('la vue vide ne se montre pas quand une question attend', () => {
  assert.equal(ligneDeLaVueVide(1, 0), null);
  assert.equal(ligneDeLaVueVide(1, 2), null);
});

const source = (fichier: string): string => fs.readFileSync(path.join(__dirname, '..', 'src', 'ui', 'nomenclature', fichier), 'utf8');

test('le bouton de la vue vide ouvre Renommages par l’API d’onglets de la coquille', () => {
  assert.match(source('aTrancher.ts'), /TEXTES\.questionsVides\.bouton, \(\) => coquille\.choisirOnglet\('a-appliquer'\)/u);
});

test('UCM et Personnalisé s’écrivent en texte gris dans une carte de question, une fiche et une carte de Renommages', () => {
  for (const fichier of ['aTrancher.ts', 'feuilles.ts', 'aAppliquer.ts']) {
    const texte = source(fichier);
    assert.doesNotMatch(texte, /pastille-ucm|pastille-personnalise|pastille-\$\{/u, fichier);
    assert.match(texte, /'origine'/u, fichier);
  }
});

/** Ce que l'onglet À trancher affiche d'une question et la réponse de chaque bouton. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { COLLECTIONS, type IndiceDePaire } from '@ucm-kit/core/referentiel';
import type { LigneVue, QuestionVue, Reponse, TermeVue } from '../src/messages';
import {
  carteDeConflit,
  carteDeQuestion,
  champAutreTerme,
  composerLaListe,
  ligneDeReprise,
  ligneFaite,
  type ActionDeCarte,
  type CarteDeQuestion,
} from '../src/ui/questions';

const chemin = (avant: string, terme: string, apres: string): LigneVue => ({ id: terme, avant, terme, apres, aussi: [] });
const terme = (mot: string, nombre: number, ucm = false): TermeVue => ({ mot, nombre, ucm, exemples: [chemin('components/button/', mot, '/border')] });

const paire = (indice: IndiceDePaire = 'terminaison', cibleCommune: string | null = null): Extract<QuestionVue, { type: 'paire' }> => ({
  type: 'paire', cle: 'paire:outline', indice, termes: [terme('outline', 8), terme('outlined', 24)], propose: 1, cibleCommune,
});
const faute: Extract<QuestionVue, { type: 'ecriture-du-terme' }> = {
  type: 'ecriture-du-terme', cle: 'faute', indice: 'faute', terme: terme('contrashovered', 1), proposition: ['contrasthovered'], reference: { mot: 'contrasthovered', nombre: 14 },
};
const colles: Extract<QuestionVue, { type: 'ecriture-du-terme' }> = {
  type: 'ecriture-du-terme', cle: 'colles', indice: 'mots-colles', terme: terme('vspacingsmall', 3), proposition: ['v', 'spacing', 'small'], reference: null,
};
const collection = (proposee: string | null): Extract<QuestionVue, { type: 'collection' }> => ({ type: 'collection', cle: 'collection', nom: 'Typo Tokens', nombre: 48, proposee });

/** Les réponses que les boutons d'une carte envoient, par identifiant d'action. */
function reponses(carte: CarteDeQuestion): Record<string, Reponse | 'champ' | 'choix'> {
  const actions: ActionDeCarte[] = [
    ...(carte.forme === 'face-a-face' ? carte.colonnes.map((colonne) => colonne.garder) : []),
    ...carte.pied.actions,
    carte.pied.plusTard,
  ];
  return Object.fromEntries(
    actions.map((action, rang) => [
      carte.forme === 'face-a-face' && action.id === 'garder' ? `garder-${rang}` : action.id,
      action.suite.sorte === 'repondre' ? action.suite.reponse : action.suite.sorte === 'saisir' ? 'champ' : 'choix',
    ]),
  );
}

test('une paire pose la question, l’indice et deux colonnes dont la proposée porte le bouton plein', () => {
  const carte = carteDeQuestion(paire('pluriel', 'theme/primary/solid/default'));
  assert.equal(carte.forme, 'face-a-face');
  if (carte.forme !== 'face-a-face') return;
  assert.equal(carte.question, 'Ces termes désignent-ils la même chose ?');
  assert.equal(carte.indice, 'Singulier et pluriel');
  assert.deepEqual(carte.colonnes.map(({ terme: mot, detail, propose }) => [mot, detail, propose]), [['outline', '8 variables', false], ['outlined', '24 variables', true]]);
  assert.deepEqual(carte.colonnes.map((colonne) => colonne.garder.poids), ['secondaire', 'principal']);
  assert.deepEqual(carte.colonnes.map((colonne) => colonne.garder.libelle), ['Garder outline', 'Garder outlined']);
  assert.equal(carte.colonnes[1].exemple?.terme, 'outlined');
  assert.equal(carte.preuve, 'Les deux visent theme/primary/solid/default.');
});

test('chaque indice de paire a son texte, et sans cible commune la carte n’a pas de preuve', () => {
  const textes = (['terminaison', 'pluriel', 'abreviation', 'synonymes', 'branches-paralleles'] as const).map((indice) => carteDeQuestion(paire(indice)).indice);
  assert.deepEqual(textes, ['Terminaison', 'Singulier et pluriel', 'Abréviation', 'Synonymes', 'Branches parallèles']);
  const carte = carteDeQuestion(paire());
  assert.equal(carte.forme === 'face-a-face' ? carte.preuve : 'autre forme', null);
});

test('la colonne proposée suit `propose`, et la pastille UCM suit le terme', () => {
  const question = { ...paire('synonymes'), propose: 0 as const, termes: [terme('danger', 40, true), terme('error', 18)] as const };
  const carte = carteDeQuestion(question);
  if (carte.forme !== 'face-a-face') throw new Error('forme inattendue');
  assert.deepEqual(carte.colonnes.map((colonne) => [colonne.propose, colonne.ucm]), [[true, true], [false, false]]);
  assert.deepEqual(carte.colonnes.map((colonne) => colonne.garder.poids), ['principal', 'secondaire']);
});

test('les boutons d’une paire envoient garder, termes différents, plus tard, et « Autre terme… » ouvre le champ', () => {
  assert.deepEqual(reponses(carteDeQuestion(paire())), {
    'garder-0': { type: 'garder', rang: 0 },
    'garder-1': { type: 'garder', rang: 1 },
    'termes-differents': { type: 'distincts' },
    'autre-terme': 'champ',
    'plus-tard': { type: 'plus-tard' },
  });
  assert.deepEqual(carteDeQuestion(paire()).pied.actions.map((action) => action.libelle), ['Termes différents', 'Autre terme…']);
  assert.equal(carteDeQuestion(paire()).pied.plusTard.libelle, 'Plus tard');
});

test('un terme mal écrit propose de corriger, avec le nombre et la référence', () => {
  const carte = carteDeQuestion(faute);
  if (carte.forme !== 'avant-apres') throw new Error('forme inattendue');
  assert.deepEqual([carte.question, carte.indice, carte.avant, carte.apres], ['Ce terme est-il mal écrit ?', 'Une lettre d’écart', 'contrashovered', 'contrasthovered']);
  assert.equal(carte.detail, '1 variable ; contrasthovered est employé dans 14 variables');
  assert.deepEqual(carte.pied.actions.map((action) => [action.libelle, action.poids]), [['Corriger', 'principal'], ['C’est voulu', 'secondaire']]);
  assert.deepEqual(reponses(carte), { corriger: { type: 'corriger', mots: ['contrasthovered'] }, voulu: { type: 'voulu' }, 'plus-tard': { type: 'plus-tard' } });
});

test('des mots collés se séparent par des tirets, sans référence', () => {
  const carte = carteDeQuestion(colles);
  if (carte.forme !== 'avant-apres') throw new Error('forme inattendue');
  assert.deepEqual([carte.question, carte.indice, carte.apres, carte.detail], ['Ce terme réunit-il plusieurs mots ?', 'Mots collés', 'v-spacing-small', '3 variables']);
  assert.deepEqual(carte.pied.actions.map((action) => action.libelle), ['Séparer', 'C’est un seul mot']);
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
  if (renommer.suite.sorte === 'choisir') assert.deepEqual(renommer.suite.reponse('layouts'), { type: 'collection', cible: 'layouts' });
  assert.deepEqual([renommer.libelle, garder.libelle], ['Renommer', 'Garder ce nom']);
  assert.deepEqual(garder.suite, { sorte: 'repondre', reponse: { type: 'collection', cible: null } });
});

test('« Autre terme… » montre l’avant → après de la saisie et n’enregistre pas une saisie vide', () => {
  const champ = champAutreTerme({ ...paire(), termes: [terme('contained', 16), terme('filled', 6)] });
  assert.equal(champ.question, 'Remplacer contained et filled par');
  assert.deepEqual(champ.effet(' solid '), { avant: 'contained, filled', apres: 'solid', detail: '22 variables rejoindront À appliquer' });
  assert.deepEqual(champ.reponse(' solid '), { type: 'autre', terme: 'solid' });
  assert.equal(champ.reponse('   '), null);
  assert.equal(champAutreTerme({ ...paire(), termes: [terme('a', 1), terme('b', 0)] }).effet('c').detail, '1 variable rejoindra À appliquer');
});

test('la ligne de réussite d’une paire dit ce qui change et ce que À appliquer reçoit', () => {
  assert.deepEqual(ligneFaite(paire(), { type: 'garder', rang: 1 }), { avant: 'outline', separateur: '→', apres: 'outlined', detail: '8 variables ajoutées à À appliquer' });
  assert.deepEqual(ligneFaite(paire(), { type: 'garder', rang: 0 }), { avant: 'outlined', separateur: '→', apres: 'outline', detail: '24 variables ajoutées à À appliquer' });
  assert.deepEqual(ligneFaite(paire(), { type: 'autre', terme: 'solid' }), { avant: 'outline, outlined', separateur: '→', apres: 'solid', detail: '32 variables ajoutées à À appliquer' });
  assert.deepEqual(ligneFaite(paire(), { type: 'distincts' }), { avant: 'outline', separateur: '≠', apres: 'outlined', detail: 'Gardés séparés' });
  assert.deepEqual(ligneFaite(paire(), { type: 'plus-tard' }), { avant: 'outline, outlined', separateur: null, apres: null, detail: 'Remis à plus tard' });
  assert.equal(ligneFaite(paire(), { type: 'voulu' }), null);
});

test('la ligne de réussite des autres questions', () => {
  assert.deepEqual(ligneFaite(faute, { type: 'corriger', mots: ['contrasthovered'] }), { avant: 'contrashovered', separateur: '→', apres: 'contrasthovered', detail: '1 variable ajoutée à À appliquer' });
  assert.deepEqual(ligneFaite(colles, { type: 'corriger', mots: ['v', 'spacing', 'small'] }), { avant: 'vspacingsmall', separateur: '→', apres: 'v-spacing-small', detail: '3 variables ajoutées à À appliquer' });
  assert.deepEqual(ligneFaite(faute, { type: 'voulu' }), { avant: 'contrashovered', separateur: null, apres: null, detail: 'Écriture gardée' });
  assert.deepEqual(ligneFaite(collection(null), { type: 'collection', cible: 'typography' }), { avant: 'Typo Tokens', separateur: '→', apres: 'typography', detail: '1 collection ajoutée à À appliquer' });
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

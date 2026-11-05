/**
 * Lot E4a : la question du texte des boutons décrit le rendu (E4.1), la carte groupée des couches et l'information du thème non reconnu
 * (E4.6), et les textes des genres de structure et de composant qui n'avaient que le repli `sansPhrase` (E4.8).
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import type { Constat } from '../src/messages/commun';

import { poserLeDom, comme } from './domDeTest';

poserLeDom();

import { carteDAFaire, type ContexteDAFaire } from '../src/ui/ignores/modele';
import { carteDeQuestion } from '../src/ui/questions/modele';
import { cartesDeCorrections } from '../src/ui/corrections/modele';
import { monterAFaire, type GestesDIgnorer } from '../src/ui/structure/aFaire';
import { GROUPES, lireLInformationDuTheme, lireLesConstats, type ConstatAFaire, type Noms } from '../src/ui/structure/lecture';

const SANS_NOMS: Noms = { nom: () => null, cle: () => null };
const gestes: GestesDIgnorer = { ignorerPourLaPalette() {}, ignorerDansLeFichier() {}, nePlusIgnorerLeConstat() {}, nePlusIgnorerLeRole() {} };

const c82 = (id: string, faits: Constat['faits'], plus: Partial<Constat> = {}): Constat => ({ id, code: 'C82', type: 'verifier', famille: 'liaisons', variants: [], layers: [], faits, ...plus });
const texte = (morceaux: readonly (string | { chemin: string })[]): string => morceaux.map((morceau) => (typeof morceau === 'string' ? morceau : `\`${morceau.chemin}\``)).join('');
const unique = (constats: readonly Constat[]): ConstatAFaire => lireLesConstats(constats, SANS_NOMS)[0];

function monter(constats: readonly ConstatAFaire[]): Record<(typeof GROUPES)[number], HTMLElement> {
  const hotes = Object.fromEntries(GROUPES.map((groupe) => [groupe, document.createElement('div')])) as unknown as Record<(typeof GROUPES)[number], HTMLElement>;
  monterAFaire(hotes, document.createElement('div'), () => {}, gestes).poser(constats);
  return hotes;
}

const blanc = { cle: 'utility|neutral/light/white', nom: 'utility/neutral/light/white' };
const noir = { cle: 'utility|neutral/light/black', nom: 'utility/neutral/light/black' };

// ---------------------------------------------------------------------------------------------------------------------------
// E4.1 : le texte des boutons décrit le rendu

test('E4.1 : le texte des boutons à contre-sens propose « Garder le texte noir sur les boutons » ou « Passer au texte blanc »', () => {
  const id = 'C82:cran:theme|primary/solid/foreground:m-light';
  const lu = unique([c82(id, { genre: 'cran', variable: 'primary/solid/foreground', mode: 'light', avant: 'black', attendu: 'white' }, { question: { id, candidats: [blanc, noir] } })]);
  assert.equal(texte(lu.phrase), 'Texte sur les boutons primary');
  assert.deepEqual(lu.choix.map(({ libelle }) => libelle), ['Garder le texte noir sur les boutons', 'Passer au texte blanc']);
  assert.deepEqual(lu.faits, [], 'les candidats ne sont plus un fait « En Light »');
  assert.doesNotMatch(texte(lu.phrase), /sens (normal|inverse)/);
});

test('E4.1 : le texte blanc actuel se garde ou passe au noir', () => {
  const id = 'C82:cran:theme|primary/solid/foreground:m-dark';
  const lu = unique([c82(id, { genre: 'cran', variable: 'primary/solid/foreground', mode: 'dark', avant: 'white', attendu: 'black' }, { question: { id, candidats: [blanc, noir] } })]);
  assert.deepEqual(lu.choix.map(({ libelle }) => libelle), ['Garder le texte blanc sur les boutons', 'Passer au texte noir']);
});

test('E4.1 : une palette partagée dessine un bouton et un encadré dans chaque couleur, sans réponse cochée', () => {
  const id = 'C82:sens-partage:theme:secondary:m-light';
  const lu = unique([c82(id, { genre: 'sens-partage', variable: 'secondary', groupe: 'secondary', mode: 'light' }, { question: { id, candidats: [blanc, noir] } })]);
  assert.equal(texte(lu.phrase), 'Texte sur secondary, que les boutons et les encadrés partagent');
  assert.deepEqual(lu.choix, [{ libelle: 'Passer au texte blanc', dessin: 'blanc' }, { libelle: 'Passer au texte noir', dessin: 'noir' }]);
  assert.equal(lu.groupe, 'crans');
  assert.equal(lu.variable, null);
  const carte = comme(monter([lu]).crans);
  assert.equal(carte.querySelectorAll('.sens-dessin').length, 2, 'un dessin par réponse');
  assert.equal(carte.querySelectorAll('.sens-bouton').length, 2);
  assert.equal(carte.querySelectorAll('.sens-encadre').length, 2);
  assert.deepEqual(carte.querySelectorAll('.sens-legende').map((legende) => legende.textContent), ['Bouton', 'Encadré', 'Bouton', 'Encadré']);
  assert.equal(carte.querySelectorAll('.sens-bouton.texte-blanc').length, 1);
  assert.equal(carte.querySelectorAll('.sens-bouton.texte-noir').length, 1);
  assert.equal(carte.querySelectorAll('input').length, 0, 'aucune case : les réponses ne s’écrivent pas d’ici');
  assert.equal(carte.querySelectorAll('.constat-choix-ligne').length, 2);
});

// ---------------------------------------------------------------------------------------------------------------------------
// E4.6 : la carte groupée des couches et l'information de QV-4

const couche = (variable: string, mode: string, coucheCible = 'primitives'): Constat =>
  c82(`C82:couche:theme|${variable}:${mode}`, { genre: 'couche', variable, mode, cible: 'color/red/500', coucheCible, collection: 'theme' }, { type: 'corriger' });

test('E4.6 : les couches d’une collection et d’une couche visée forment une carte, qui compte variables et modes', () => {
  const lus = lireLesConstats([
    couche('primary/page/border', 'light'), couche('primary/page/border', 'dark'), couche('primary/page/divider', 'light'), couche('primary/ring', 'light', 'layout'),
  ], SANS_NOMS);
  assert.equal(lus.length, 2);
  const [primitives, layout] = lus;
  assert.equal(texte(primitives.phrase), '2 variables de `theme` visent `primitives`, sur 2 modes.');
  assert.equal(texte(layout.phrase), '1 variable de `theme` vise `layout`, sur 1 mode.');
  assert.equal(primitives.statut, 'Choisissez une cible dans brands ou utility dans la fenêtre Variables');
  assert.deepEqual(primitives.variables, ['theme/primary/page/border', 'theme/primary/page/divider']);
  assert.equal(primitives.groupe, 'couches');
});

test('E4.6 : la carte groupée annonce « Voir les 2 variables » et déplie la liste', () => {
  const [carte] = lireLesConstats([couche('primary/page/border', 'light'), couche('primary/page/divider', 'light')], SANS_NOMS);
  const hote = comme(monter([carte]).couches);
  assert.equal(hote.querySelectorAll('.bloc-constat').length, 1);
  assert.equal(hote.querySelector('.constat-voir')?.textContent, 'Voir les 2 variables');
  assert.equal(hote.querySelectorAll('.constat-variables > div').length, 2);
  assert.equal(hote.querySelector('.bloc-bouton')?.getAttribute('aria-expanded'), 'false', 'la liste arrive repliée');
});

test('E4.6 : « Aucune collection n’est reconnue comme theme » est une information en tête, pas une carte', () => {
  const information = c82('C82:theme-non-reconnu', { genre: 'theme-non-reconnu' }, { type: 'info' });
  assert.deepEqual(lireLesConstats([information], SANS_NOMS), []);
  const lue = lireLInformationDuTheme([information]);
  assert.ok(lue);
  assert.equal(texte(lue.phrase), 'Aucune collection n’est reconnue comme `theme`. L’intégrité UCM n’est pas contrôlée.');
  assert.equal(lue.statut, 'Répondez à la question de collection dans la section Noms');
  assert.equal(lireLInformationDuTheme([couche('primary/ring', 'light')]), null);
});

// ---------------------------------------------------------------------------------------------------------------------------
// E4.8 : les genres de structure

test('E4.8 : un nom proche d’un rôle dit le rôle et où le renommer', () => {
  const lu = unique([c82('C82:variable-inconnue:theme|primary/surface/defalt', { genre: 'variable-inconnue', variable: 'primary/surface/defalt', roles: 'surface/default' }, { question: { id: 'q', candidats: [{ nom: 'primary/surface/default' }] } })]);
  assert.equal(texte(lu.phrase), 'Le nom `primary/surface/defalt` ressemble au rôle `surface/default`.');
  assert.equal(lu.statut, 'Renommez-la en surface/default dans la fenêtre Variables si c’est ce rôle');
  assert.equal(lu.groupe, 'manquantes');
});

test('E4.8 : une variable sur la rampe d’une autre palette propose « Viser » pour chaque candidat', () => {
  const id = 'C82:rampe-autre-palette:theme|primary/page/border:m-light';
  const lu = unique([c82(id, { genre: 'rampe-autre-palette', variable: 'primary/page/border', mode: 'light', rampe: 'secondary/light', rampeDeLaPalette: 'primary/light' }, {
    question: { id, candidats: [{ cle: 'b|primary/light/300', nom: 'primary/light/300' }, { cle: 'b|secondary/light/300', nom: 'secondary/light/300' }] },
  })]);
  assert.equal(texte(lu.phrase), 'Cette variable de `primary/light` vise la rampe `secondary/light`.');
  assert.deepEqual(lu.choix.map(({ libelle }) => libelle), ['Viser primary/light/300', 'Viser secondary/light/300']);
  assert.equal(lu.statut, null);
});

test('E4.8 : une branche de mode nomme le mode, propose chaque candidat, et sans candidat renvoie à la cible', () => {
  const faits = { genre: 'branche-de-mode', variable: 'primary/page/border', mode: 'Dark', cible: 'primary/light/300' };
  const avec = unique([{ id: 'C60:v:m', code: 'C60', type: 'corriger', famille: 'liaisons', variants: [], layers: [], faits, question: { id: 'C60:v:m', candidats: [{ nom: 'primary/dark/300' }, { nom: 'primary/dark/200' }] } }]);
  assert.equal(texte(avec.phrase), 'En Dark, cette variable vise la branche Light de sa palette.');
  assert.deepEqual(avec.choix.map(({ libelle }) => libelle), ['Viser primary/dark/300', 'Viser primary/dark/200']);
  assert.equal(avec.groupe, 'modes');
  const sans = unique([{ id: 'C60:v:m', code: 'C60', type: 'corriger', famille: 'liaisons', variants: [], layers: [], faits, question: { id: 'C60:v:m', candidats: [] } }]);
  assert.deepEqual(sans.choix, []);
  assert.equal(sans.statut, 'Choisissez la cible dans la fenêtre Variables');
});

test('E4.8 : deux collections de thème, deux variables d’un même rôle, des cibles non lues', () => {
  const double = unique([c82('C82:theme-en-double:b', { genre: 'theme-en-double', collection: 'theme (copy)', reference: 'theme' })]);
  assert.equal(texte(double.phrase), 'Deux collections se lisent comme theme : `theme` et `theme (copy)`.');
  assert.equal(double.statut, 'Supprimez ou renommez la copie dans la fenêtre Variables');
  const id = 'C82:role-en-double:theme:primary/surface/default';
  const role = unique([c82(id, { genre: 'role-en-double', variable: 'surface/default', groupe: 'primary', variables: 2 }, { question: { id, candidats: [{ nom: 'theme/primary/surface/default' }, { nom: 'theme/primary/Surface/Default' }] } })]);
  assert.equal(texte(role.phrase), '2 variables portent le rôle `surface/default`.');
  assert.deepEqual(role.choix.map(({ libelle }) => libelle), ['Garder theme/primary/surface/default', 'Garder theme/primary/Surface/Default']);
  assert.equal(role.statut, 'Les autres deviendront des alias de celle que vous gardez. Supprimez-les ensuite dans la fenêtre Variables');
  const inaccessible = unique([{ ...c82('C63:b:cible-inaccessible', { genre: 'cible-inaccessible', collection: 'brands', cibles: 3, alias: 12 }), code: 'C63', type: 'info' }]);
  assert.equal(texte(inaccessible.phrase), 'Les cibles rangées dans `brands` ne sont pas lues, car aucune library n’est choisie.');
  assert.equal(inaccessible.statut, 'Choisissez la library du fichier pour les contrôler');
  assert.equal(inaccessible.groupe, 'alias');
});

// ---------------------------------------------------------------------------------------------------------------------------
// E4.8 : les genres du composant

const contexte: ContexteDAFaire = {
  composant: 'Button',
  variants: [{ id: 'v1', nom: 'Size=Small, State=Default' }],
  layers: new Map([['l1', 'label'], ['l2', 'Divider']]),
};
const duComposant = (code: string, faits: Constat['faits'], plus: Partial<Constat> = {}): Constat => ({ id: `${code}:x`, code: code as `C${number}`, type: 'corriger', famille: 'liaisons', variants: ['v1'], layers: ['l1'], faits, ...plus });

test('E5.1 : un layer masqué le dit avant la phrase du constat, par lui-même ou par son ancêtre', () => {
  const seul = carteDAFaire(duComposant('C25', { calque: 'label', champ: 'fills', masque: 'layer' }), contexte);
  assert.ok(seul.phrase.startsWith('Le layer label est masqué. '), seul.phrase);
  const sous = carteDAFaire(duComposant('C29', { calque: 'label', champ: 'width', valeur: 12, masque: 'ancetre', ancetre: 'Icon wrapper' }), contexte);
  assert.ok(sous.phrase.startsWith('Le layer label est dans Icon wrapper, qui est masqué. '), sous.phrase);
  assert.ok(!carteDAFaire(duComposant('C25', { calque: 'label', champ: 'fills' }), contexte).phrase.includes('masqué'));
});

test('E5.1 : la carte d’une question et celle d’une correction disent aussi le layer masqué', () => {
  const question = duComposant('C25', { calque: 'label', champ: 'fills', masque: 'ancetre', ancetre: 'Icon wrapper' }, {
    question: { id: 'q1', candidats: [{ cle: 'k1', nom: 'button/colors/default/foreground' }, { cle: 'k2', nom: 'button/colors/default/text' }] },
  });
  const carte = carteDeQuestion(question, { composant: 'Button', variants: contexte.variants, layers: contexte.layers });
  assert.ok(carte?.meta.includes('Le layer label est dans Icon wrapper, qui est masqué.'), carte?.meta);
});

test('E5.3 : un layer dont le nom annonce un rôle dit pourquoi le token ne convient pas', () => {
  const carte = carteDAFaire(duComposant('C17', { token: 'Button/colors/default/background', role: 'background', attendu: 'divider', champ: 'fills' }, { layers: ['l2'] }), contexte);
  assert.equal(carte.phrase, 'Le layer Divider porte le nom d’un divider.');
  assert.equal(carte.statut, 'Renommez le layer dans Figma s’il n’est pas un divider');
  const autre = carteDAFaire(duComposant('C17', { token: 'Button/colors/default/divider', role: 'divider', attendu: 'background', champ: 'fills' }), contexte);
  assert.doesNotMatch(autre.phrase, /porte le nom/, 'un layer qui n’annonce aucun rôle garde la phrase des rôles');
});

test('E5.4 : deux layers du même nom sous un parent : Architect ne sait pas lequel lier', () => {
  const carte = carteDAFaire(duComposant('C24', { modele: 'Size=Medium', calque: 'label', champ: 'fills', homonymes: 2, parent: 'Content' }, { question: { id: 'q', candidats: [] } }), contexte);
  assert.equal(carte.phrase, 'Deux layers s’appellent label sous Content. Architect ne sait pas lequel lier.');
  assert.equal(carte.statut, 'Renommez l’un des deux dans Figma');
  const sansParent = carteDAFaire(duComposant('C24', { modele: 'Size=Medium', calque: 'label', champ: 'fills', homonymes: 2 }, { question: { id: 'q', candidats: [] } }), contexte);
  assert.equal(sansParent.phrase, 'Deux layers s’appellent label. Architect ne sait pas lequel lier.');
});

test('E5.7 : la carte d’une liaison à plusieurs segments faux dit que la correction règle les autres', () => {
  const question = duComposant('C22', { calque: 'label', champ: 'fills', axe: 'State', valeur: 'disabled', token: 'button/colors/default/foreground', segment: 'default', autresEcarts: 'State=disabled, rôle border' }, {
    question: { id: 'q1', candidats: [{ cle: 'k1', nom: 'button/colors/disabled/border' }, { cle: 'k2', nom: 'button/colors/disabled/foreground' }] },
  });
  const carte = carteDeQuestion(question, { composant: 'Button', variants: contexte.variants, layers: contexte.layers });
  assert.ok(carte?.meta.includes('La correction règle aussi State=disabled et rôle border.'), carte?.meta);
  const avecCorrection = duComposant('C22', { calque: 'label', champ: 'fills', autresEcarts: 'State=disabled' }, {
    correction: { id: 'c1', sorte: 'liaison', cible: { layer: 'l1', champ: 'fills' }, avant: 'button/colors/default/foreground', apres: { cle: 'k', nom: 'button/colors/disabled/border' }, aRelire: { regle: 'r', avant: 'button/colors/default/foreground' } },
  });
  const [ficheDeCorrection] = cartesDeCorrections([avecCorrection], { composant: 'Button', variants: contexte.variants, layers: contexte.layers, constats: [avecCorrection] });
  assert.ok(ficheDeCorrection.meta.includes(' La correction règle aussi State=disabled.'));
});

test('E6.3 : un token de taille qui change selon le mode dit ses deux valeurs', () => {
  const carte = carteDAFaire(duComposant('C63', { genre: 'taille-selon-le-mode', variable: 'button/sizes/sm/height', cle: 'k', modeClair: 'Light', valeurClair: 32, modeSombre: 'Dark', valeurSombre: 36 }, { famille: 'tailles' }), contexte);
  assert.equal(carte.phrase, 'sizes/sm/height vaut 32 px en Light et 36 px en Dark.');
  assert.equal(carte.statut, 'Donnez-lui la même valeur dans les deux modes, dans la fenêtre Variables');
});

test('E7.3 : deux axes de style et un style qui utilise les couleurs d’un autre dossier', () => {
  const axes = carteDAFaire(duComposant('C63', { genre: 'deux-axes-de-style', jeu: 'Button', axes: 'Variant, Style' }, { famille: 'variants', variants: [], layers: [] }), contexte);
  assert.equal(axes.phrase, 'Les axes Variant et Style décrivent tous deux le style.');
  assert.equal(axes.statut, 'Gardez un seul axe de style dans les propriétés du composant');
  const dossier = carteDAFaire(duComposant('C63', { genre: 'style-et-dossier', variable: 'button/colors/subtle/background', style: 'subtle', dossier: 'solid', attendu: 'surface' }), contexte);
  assert.equal(dossier.phrase, 'Le style subtle utilise les couleurs de solid.');
  assert.equal(dossier.statut, 'Liez-le aux couleurs de surface');
});

test('E7.4 : la valeur d’un variant écrite autrement dit son écriture dans UCM', () => {
  const faits = { jeu: 'Button', propriete: 'Size', valeur: 'S', attendu: 'Small', cote: 'variant' };
  for (const code of ['C8', 'C10']) {
    const carte = carteDAFaire(duComposant(code, faits, { famille: 'variants', layers: [] }), contexte);
    assert.equal(carte.phrase, 'La valeur S de Size s’écrit Small dans UCM.', code);
  }
});

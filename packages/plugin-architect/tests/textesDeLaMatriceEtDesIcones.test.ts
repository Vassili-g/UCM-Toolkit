/**
 * Les phrases de C31 (borne et « et N autres »), de C32 `nom-illisible` et de C66 (instance d'Icon, propriété Size, token de premier
 * plan du composant) telles que le designer les lit (E7.5, E7.6, E8.1). Un variant s'écrit en toutes lettres (`Size=Small`).
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import type { Constat } from '../src/messages/commun';
import { carteDAFaire, type ContexteDAFaire } from '../src/ui/ignores/modele';
import { ligneDInformation } from '../src/ui/panneau/informations';

const contexte: ContexteDAFaire = { composant: 'Button', variants: [{ id: 'v1', nom: 'Color=Primary, Size=Small' }], layers: new Map([['i', 'Icon']]) };

const constat = (plus: Partial<Constat> & Pick<Constat, 'code' | 'faits'>): Constat => ({
  id: `${plus.code}:x`, type: 'verifier', famille: 'typographie', variants: ['v1'], layers: ['i'], ...plus,
});

test('E7.5 : au-delà de la borne, l’information donne le nombre de variants et le total de combinaisons', () => {
  const borne = constat({ code: 'C31', type: 'info', famille: 'variants', faits: { genre: 'au-dela-de-la-borne', variants: 800, combinaisons: 4352 } });
  assert.equal(ligneDInformation(borne, contexte).phrase, '800 variants donnent 4352 combinaisons. Le plugin ne cherche pas les variants absents au-delà de 4 096 combinaisons.');
});

test('E7.5 : après les 200 premiers constats, une ligne compte les variants absents restants', () => {
  const ligne = (autres: number) => ligneDInformation(constat({ code: 'C31', type: 'info', famille: 'variants', faits: { genre: 'et-autres', autres } }), contexte).phrase;
  assert.equal(ligne(1), 'Et 1 autre variant absent');
  assert.equal(ligne(3896), 'Et 3896 autres variants absents');
});

test('E7.5 : un variant absent dont un axe s’appelle genre garde sa phrase de variant absent', () => {
  const absent = constat({ code: 'C31', famille: 'variants', faits: { genre: 'Outline', Size: 'Small' } });
  assert.equal(carteDAFaire(absent, contexte).phrase, 'genre=Outline, Size=Small n’existe pas.');
});

test('E7.6 : un token au nom illisible dit que le plugin ne le lit pas et propose de le renommer ou de l’ignorer', () => {
  const carte = carteDAFaire(constat({ code: 'C32', famille: 'tokens', faits: { token: 'button/color/primary/sm/glow', motif: 'nom-illisible' } }), contexte);
  assert.equal(carte.phrase, 'Le plugin ne lit pas le nom du token `color/primary/sm/glow`.');
  assert.equal(carte.statut, 'Renommez-le comme les autres tokens du composant, ou ignorez ce constat');
});

test('E8.1 : une icône qui n’est pas une instance d’Icon, d’un autre composant ou sans instance, reçoit la même phrase', () => {
  for (const motif of ['pas-une-instance', 'autre-composant']) {
    const carte = carteDAFaire(constat({ code: 'C66', faits: { calque: 'Icon', motif } }), contexte);
    assert.equal(carte.phrase, 'L’icône n’est pas une instance du composant Icon.', motif);
    assert.equal(carte.statut, 'Remplacez-la par une instance d’Icon', motif);
  }
});

test('E8.1 : la propriété Size de l’icône dit sa valeur et la taille du variant', () => {
  const carte = carteDAFaire(constat({ code: 'C66', faits: { calque: 'Icon', motif: 'taille-differente', valeur: 'Medium', taille: 'Small' } }), contexte);
  assert.equal(carte.phrase, 'La propriété Size de l’icône vaut Medium. Le variant est en Small.');
  assert.equal(carte.statut, 'Réglez Size sur Small');
});

test('E8.1 : la couleur de l’icône nomme le token que le composant prévoit, ou deux tokens quand le variant en prévoit deux', () => {
  const lie = constat({ code: 'C66', faits: { calque: 'Icon', motif: 'couleur-hors-premier-plan', variable: 'neutral/surface/foreground', attendu: 'button/color/primary/sm/foreground' } });
  const carte = carteDAFaire(lie, contexte);
  assert.equal(carte.phrase, 'La couleur de l’icône est liée à `neutral/surface/foreground`. Le composant prévoit `button/color/primary/sm/foreground`.');
  assert.equal(carte.statut, 'Liez-la à `button/color/primary/sm/foreground`');
  const deux = carteDAFaire(constat({ code: 'C66', faits: { calque: 'Icon', motif: 'couleur-sans-variable', attendu: 'a/icon,a/foreground' } }), contexte);
  assert.equal(deux.phrase, 'La couleur de l’icône n’a pas de token.');
  assert.equal(deux.statut, 'Liez-la à `a/icon` ou `a/foreground`');
});

test('E8.1 : sans token prévu par le variant, la couleur de l’icône garde le statut « token icon ou foreground »', () => {
  const carte = carteDAFaire(constat({ code: 'C66', faits: { calque: 'Icon', motif: 'couleur-hors-premier-plan', variable: 'neutral/surface/foreground' } }), contexte);
  assert.equal(carte.statut, 'Liez-la à un token icon ou foreground');
});

test('E8.3 : un texte à plusieurs text styles dit son layer dans la section Informations', () => {
  const info = constat({ code: 'C64', type: 'info', faits: { calque: 'Label', motif: 'styles-mixtes' } });
  assert.equal(ligneDInformation(info, contexte).phrase, 'Le layer Label porte plusieurs text styles.');
});

/** La phrase de la borne des combinaisons de modes (C49) dit le compte exact, y compris au-delà de 2^53. */
import assert from 'node:assert/strict';
import test from 'node:test';

import type { Constat } from '../src/messages/commun';
import type { ContexteDAFaire } from '../src/ui/ignores/modele';
import { ligneDInformation } from '../src/ui/panneau/informations';

const contexte: ContexteDAFaire = { composant: 'Button', variants: [], layers: new Map() };

const borne = (nonMesurees: string | number): Constat => ({
  id: 'C49:borne', code: 'C49', type: 'info', famille: 'contraste', variants: [], layers: [], limite: true,
  faits: { borne: 5000, combinaisonsMesurees: 5000, combinaisonsNonMesurees: nonMesurees },
});

test('la borne dit le nombre de paires non mesurées sur le total quand il tient dans un nombre', () => {
  assert.equal(ligneDInformation(borne(1000), contexte).phrase, '1000 paires de couleurs non mesurées sur 6000.');
});

test('la borne recopie les chiffres d’un compte plus grand que 2^53', () => {
  assert.equal(ligneDInformation(borne('16677181699661569'), contexte).phrase, '16677181699661569 paires de couleurs non mesurées sur 16677181699666569.');
});

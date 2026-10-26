/** La phrase de la borne des combinaisons de modes (C49) dit le compte exact, y compris au-delà de 2^53. */
import assert from 'node:assert/strict';
import test from 'node:test';

import type { Constat } from '../src/messages/commun';
import { carteDAFaire, type ContexteDAFaire } from '../src/ui/ignores/modele';

const contexte: ContexteDAFaire = { composant: 'Button', variants: [], layers: new Map() };

const borne = (nonMesurees: string | number): Constat => ({
  id: 'C49:borne', code: 'C49', type: 'info', famille: 'contraste', variants: [], layers: [], limite: true,
  faits: { borne: 5000, combinaisonsMesurees: 5000, combinaisonsNonMesurees: nonMesurees },
});

test('la borne dit le nombre de combinaisons non mesurées quand il tient dans un nombre', () => {
  assert.equal(
    carteDAFaire(borne(1000), contexte).phrase,
    'Le contraste n’a été mesuré que sur 5000 combinaisons de modes. 1000 autres n’ont pas été mesurées.',
  );
});

test('la borne recopie les chiffres d’un compte plus grand que 2^53', () => {
  assert.equal(
    carteDAFaire(borne('16677181699661569'), contexte).phrase,
    'Le contraste n’a été mesuré que sur 5000 combinaisons de modes. 16677181699661569 autres n’ont pas été mesurées.',
  );
});

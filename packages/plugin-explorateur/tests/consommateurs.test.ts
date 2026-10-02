/** Les liaisons et les modes d'un calque, et le double de Figma qui lève à toute mutation. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { liaisonsDuNoeud, modesDuNoeud, type NoeudLu } from '../src/consommateurs';
import { enLectureSeule, MutationInterdite } from './figmaDeTest';

const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id });

function noeud(id: string, type: string, champs: Partial<NoeudLu> = {}, enfants: NoeudLu[] = []): NoeudLu {
  const brut = { id, name: `Calque ${id}`, type, parent: null as NoeudLu | null, ...champs, findAll: () => enfants.flatMap((enfant) => [enfant, ...(enfant.findAll?.() ?? [])]) };
  for (const enfant of enfants) (enfant as { parent: NoeudLu | null }).parent = brut;
  return brut;
}

test('les liaisons se lisent sur les propriétés, peintures, arrêts, effets, grilles et propriétés d’instance', () => {
  const lu = liaisonsDuNoeud(noeud('1', 'FRAME', {
    boundVariables: { itemSpacing: alias('gap'), fills: [alias('fond')], componentProperties: { Label: alias('libelle') } },
    fills: [{ type: 'SOLID', boundVariables: { color: alias('fond') } }, { type: 'GRADIENT_LINEAR', gradientStops: [{ boundVariables: { color: alias('arret') } }] }],
    strokes: [{ type: 'SOLID', boundVariables: { color: alias('bord') } }],
    effects: [{ type: 'DROP_SHADOW', boundVariables: { radius: alias('flou'), color: alias('ombre') } }],
    layoutGrids: [{ boundVariables: { count: alias('colonnes') } }],
  }));
  assert.deepEqual(lu.map((liaison) => `${liaison.propriete}=${liaison.variable}`), [
    'itemSpacing=gap',
    'componentProperties.Label=libelle',
    'fills[0]=fond',
    'fills[1].gradientStops[0].color=arret',
    'strokes[0]=bord',
    'effects[0].radius=flou',
    'effects[0].color=ombre',
    'layoutGrids[0].count=colonnes',
  ]);
});

test('un texte mixte se lit segment par segment, sans doublon des champs agrégés', () => {
  const texte = noeud('2', 'TEXT', {
    boundVariables: { fontSize: [alias('taille-a'), alias('taille-b')] },
    fills: Symbol('mixed') as unknown,
    getStyledTextSegments: () => [
      { start: 0, end: 5, boundVariables: { fontSize: alias('taille-a') }, fills: [{ boundVariables: { color: alias('encre') } }] },
      { start: 5, end: 9, boundVariables: { fontSize: alias('taille-b') }, fills: [] },
    ],
  });
  assert.deepEqual(liaisonsDuNoeud(texte).map((liaison) => `${liaison.propriete}=${liaison.variable}`), [
    'texte[0–5].fontSize=taille-a',
    'texte[0–5].fills[0]=encre',
    'texte[5–9].fontSize=taille-b',
  ]);
});

test('les modes d’un calque distinguent l’explicite de l’hérité, sans contexte fictif', () => {
  const modes = modesDuNoeud(noeud('3', 'FRAME', { resolvedVariableModes: { couleurs: 'couleurs:Jour', mesures: 'mesures:Compact' }, explicitVariableModes: { couleurs: 'couleurs:Jour' } }));
  assert.deepEqual(modes, { couleurs: { mode: 'couleurs:Jour', explicite: true }, mesures: { mode: 'mesures:Compact', explicite: false } });
});

test('le double lève sur toute mutation : la loi s’éprouve elle-même', () => {
  const double = enLectureSeule({ name: 'x', setValueForMode() {} });
  assert.throws(() => { (double as { name: string }).name = 'y'; }, MutationInterdite);
  assert.throws(() => double.setValueForMode(), MutationInterdite);
});

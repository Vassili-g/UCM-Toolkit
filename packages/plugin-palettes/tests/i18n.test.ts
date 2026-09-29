/** Les catalogues et la préférence personnelle se vérifient sans document ni DOM. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { creerTraducteur, CATALOGUES } from '../src/i18n';
import { LANGUES, resoudreDansRegistre, resoudreLangue } from '../src/i18n/langues';
import { arrondi, contraste, pluriel } from '../src/i18n/nombres';
import { CLE_DE_LANGUE, creerPreferences } from '../src/preferences';
import { creerLocalisation, lireTexte } from '../src/ui/localisation';

function structure(objet: object, prefixe = ''): string[] {
  return Object.entries(objet).flatMap(([cle, valeur]) => {
    const chemin = `${prefixe}.${cle}`;
    return valeur && typeof valeur === 'object' ? structure(valeur, chemin) : [`${chemin}:${typeof valeur}`];
  }).sort();
}

test('les catalogues ont les mêmes clés, types et tableaux', () => {
  assert.deepEqual(structure(CATALOGUES.en), structure(CATALOGUES.fr));
  assert.equal(creerTraducteur().langue, 'en');
  for (const valeur of [undefined, null, 12, {}, 'FR', 'de']) assert.equal(resoudreLangue(valeur), 'en');
  for (const langue of LANGUES) assert.equal(resoudreLangue(langue.code), langue.code);
});

test('une troisième langue se résout par le registre, sans condition sur l’anglais ou le français', () => {
  const registre = [...LANGUES, { code: 'xx-fictive' as const }];
  assert.equal(resoudreDansRegistre('xx-fictive', registre, 'en'), 'xx-fictive');
  assert.equal(resoudreDansRegistre('de', registre, 'en'), 'en');
  for (const { code, nom, decimale } of LANGUES) {
    assert.ok(nom.length > 0 && CATALOGUES[code], `${code} n’a pas de nom natif ou de catalogue`);
    assert.equal(arrondi(0.5, 1, code), `0${decimale}5`);
  }
});

test('les nombres gardent les arrondis du moteur et le séparateur de la langue', () => {
  assert.equal(arrondi(0.9751, 3, 'en'), '0.975');
  assert.equal(arrondi(0.9751, 3, 'fr'), '0,975');
  assert.equal(contraste(4.319, 'en'), '4.31');
  assert.equal(contraste(4.319, 'fr'), '4,31');
  assert.deepEqual([0, 1, 2].map((n) => pluriel(n, 'en')), ['other', 'one', 'other']);
  assert.deepEqual([0, 1, 2].map((n) => pluriel(n, 'fr')), ['one', 'one', 'other']);
});

test('les messages dynamiques nomment les données et accordent les comptes', () => {
  const anglais = creerTraducteur('en').messages;
  const francais = creerTraducteur('fr').messages;
  assert.deepEqual([0, 1, 2].map(anglais.enTeteDeLaPlanche), ['No palettes', '1 palette', '2 palettes']);
  assert.deepEqual([0, 1, 2].map(francais.enTeteDeLaPlanche), ['Aucune palette', '1 palette', '2 palettes']);
  assert.equal(anglais.nommerChamp('crans[1]'), '2nd shade');
  assert.equal(anglais.nommerChamp('crans[10]'), '11th shade');
  assert.equal(anglais.nommerChamp('crans[21]'), '22nd shade');
  assert.equal(anglais.progressionDuDessin(1, 3, 'Été'), 'Palette 2 of 3: generating “Été”…');
  assert.match(anglais.dessinInterrompu('Été', 'Erreur externe').detail!, /Erreur externe$/);
  assert.equal(francais.texteDuRefus({ regle: 'courbes-bornes', chemin: 'courbes.light[0]', valeur: 1.2 }).includes('1,2'), true);
});

test('un contexte ne partage pas ses messages avec un autre contexte', () => {
  const en = creerLocalisation('en');
  const fr = creerLocalisation('fr');
  assert.equal(lireTexte(en.messages.TEXTES.annuler), 'Cancel');
  assert.equal(lireTexte(fr.messages.TEXTES.annuler), 'Annuler');
  assert.equal(lireTexte(en.messages.retablirLaCarte(en.messages.TEXTES_DE_CONFIGURATION.fonds)), 'Reset to defaults: Background colours');
});

test('une lecture absente, invalide ou refusée reprend l’anglais', async () => {
  for (const valeur of [undefined, {}, 'inconnue', 'en', 'fr']) {
    const preferences = creerPreferences({ getAsync: async () => valeur, setAsync: async () => {} });
    assert.equal(await preferences.lire(), valeur === 'fr' ? 'fr' : 'en');
  }
  const preferences = creerPreferences({ getAsync: async () => { throw new Error('indisponible'); }, setAsync: async () => {} });
  assert.equal(await preferences.lire(), 'en');
});

test('les rangements rapides restent ordonnés après un échec', async () => {
  let liberer!: () => void;
  let stockee: unknown;
  const appels: unknown[] = [];
  const preferences = creerPreferences({
    getAsync: async () => stockee,
    async setAsync(cle, langue) {
      assert.equal(cle, CLE_DE_LANGUE);
      appels.push(langue);
      if (appels.length === 1) { await new Promise<void>((resolve) => { liberer = resolve; }); throw new Error('refus'); }
      stockee = langue;
    },
  });
  const premiere = preferences.ranger('fr');
  const derniere = preferences.ranger('en');
  await Promise.resolve();
  assert.deepEqual(appels, ['fr']);
  liberer();
  assert.equal(await premiere, false);
  assert.equal(await derniere, true);
  assert.deepEqual(appels, ['fr', 'en']);
  assert.equal(await preferences.lire(), 'en');
});

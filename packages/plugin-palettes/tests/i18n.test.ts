/** Les catalogues et la préférence personnelle se vérifient sans document ni DOM. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { creerTraducteur, CATALOGUES } from '../src/i18n';
import { LANGUES, resoudreDansRegistre, resoudreLangue } from '../src/i18n/langues';
import { arrondi, contraste, pluriel } from '../src/i18n/nombres';
import { CLE_DE_LANGUE, CLE_DE_VUE, CLE_DES_SECTIONS, SECTIONS_PAR_DEFAUT, creerPreferences } from '../src/preferences';
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
  assert.deepEqual([0, 1, 2].map(anglais.planchesDeLaPage), ['', '1 board', '2 boards']);
  assert.deepEqual([0, 1, 2].map(francais.planchesDeLaPage), ['', '1 planche', '2 planches']);
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

test('[UI-18] le bilan du pied accorde les garanties et les alertes, dans les deux langues', () => {
  const anglais = creerTraducteur('en').messages;
  const francais = creerTraducteur('fr').messages;
  assert.equal(francais.bilanDuPied(76, 0, 0, false), '76 garanties tenues · aucune alerte');
  assert.equal(francais.bilanDuPied(1, 0, 1, false), '1 garantie tenue · 1 alerte');
  assert.equal(francais.bilanDuPied(76, 1, 2, false), '1 garantie manquée sur 76 · 2 alertes');
  assert.equal(francais.bilanDuPied(76, 3, 0, false), '3 garanties manquées sur 76 · aucune alerte');
  assert.equal(francais.bilanDuPied(0, 0, 1, true), 'Palette libre · 1 alerte');
  assert.equal(anglais.bilanDuPied(76, 0, 0, false), '76 guarantees met · no alerts');
  assert.equal(anglais.bilanDuPied(1, 0, 1, false), '1 guarantee met · 1 alert');
  assert.equal(anglais.bilanDuPied(76, 1, 2, false), '1 of 76 guarantees unmet · 2 alerts');
  assert.equal(anglais.bilanDuPied(0, 0, 3, true), 'Free palette · 3 alerts');
});

test('[UI-25] la vue de Gestion se range sous sa clé ; une valeur absente, inconnue ou refusée donne la vue complète', async () => {
  for (const valeur of [undefined, {}, 'liste', 'complete', 'condensee']) {
    const preferences = creerPreferences({ getAsync: async (cle) => (cle === CLE_DE_VUE ? valeur : undefined), setAsync: async () => {} });
    assert.equal(await preferences.lireLaVue(), valeur === 'condensee' ? 'condensee' : 'complete');
  }
  const refusees = creerPreferences({ getAsync: async () => { throw new Error('indisponible'); }, setAsync: async () => {} });
  assert.equal(await refusees.lireLaVue(), 'complete');
  const rangees: [string, unknown][] = [];
  const preferences = creerPreferences({ getAsync: async () => undefined, setAsync: async (cle, valeur) => { rangees.push([cle, valeur]); } });
  assert.equal(await preferences.rangerLaVue('condensee'), true);
  assert.equal(await preferences.rangerLaVue('inconnue'), true);
  assert.deepEqual(rangees, [[CLE_DE_VUE, 'condensee'], [CLE_DE_VUE, 'complete']]);
});

test('[UI-36] les sections gardent leurs choix valides et reprennent les défauts pour les autres valeurs', async () => {
  const rangees: [string, unknown][] = [];
  const preferences = creerPreferences({
    getAsync: async () => ({ connexion: true, plugin: false, fichier: 'oui', bibliotheques: true }),
    setAsync: async (cle, valeur) => { rangees.push([cle, valeur]); },
  });
  const sections = await preferences.lireLesSections();
  assert.deepEqual(sections, { connexion: true, plugin: false, fichier: false, bibliotheques: true, recette: false });
  await preferences.rangerLesSections(sections);
  assert.deepEqual(rangees, [[CLE_DES_SECTIONS, sections]]);
  const refusees = creerPreferences({ getAsync: async () => { throw new Error('indisponible'); }, setAsync: async () => {} });
  assert.deepEqual(await refusees.lireLesSections(), SECTIONS_PAR_DEFAUT);
});

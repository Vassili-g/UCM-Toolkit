/** Le corpus UCM suit l'instantané multimarques et conserve les limites de sa lecture. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { COLLECTIONS, REGISTRES, REGISTRES_ARCHITECTURE } from '@ucm-kit/core/referentiel';
import { extraireNoms, lireDonnees } from '../docs/references/design-systems/_outils/ucm.mjs';

const lire = (chemin: string): string => readFileSync(new URL(chemin, import.meta.url), 'utf8');
const lireJson = (chemin: string) => JSON.parse(lire(chemin));
const corpus = '../docs/references/design-systems/ucm/';

test('les modes et les alias donnent un seul nom, typé depuis sa cible et classé par collection', () => {
  const noms = extraireNoms({ collections: {
    primitives: { 'primitives.color.coral.500': '#AABBCC', 'primitives.fontweight.600': '600', 'primitives.fontfamily.base': 'Exemple Sans' },
    theme: { 'theme.primary.foreground': { light: 'primitives.color.coral.500', dark: 'primitives.color.coral.500' } },
    components: { 'components.button.foreground': 'theme.primary.foreground', 'components.button.inconnu': '∅' },
  } });
  assert.deepEqual(noms, [
    { nom: 'components/button/foreground', type: 'color', couche: 'composant' },
    { nom: 'components/button/inconnu', type: null, couche: 'composant' },
    { nom: 'primitives/color/coral/500', type: 'color', couche: 'primitive' },
    { nom: 'primitives/fontfamily/base', type: 'fontFamily', couche: 'primitive' },
    { nom: 'primitives/fontweight/600', type: 'fontWeight', couche: 'primitive' },
    { nom: 'theme/primary/foreground', type: 'color', couche: 'semantique' },
  ]);
});

test('un type absent ou différent entre modes reste indéterminé', () => {
  const noms = extraireNoms({ collections: { theme: {
    'theme.melange': { light: '#AABBCC', dark: '12px' },
    'theme.absent': { light: '#AABBCC', dark: '∅' },
  } } });
  assert.ok(noms.every((nom) => nom.type === null));
});

test('un cycle ou une cible absente refuse l’extraction', () => {
  assert.throws(() => extraireNoms({ collections: { theme: { 'theme.a': 'theme.b', 'theme.b': 'theme.a' } } }), /Cycle d'alias/);
  assert.throws(() => extraireNoms({ collections: { theme: { 'theme.a': 'theme.absent' } } }), /Cible d'alias absente/);
});

test('la lecture accepte le JSON du générateur et refuse du code à exécuter', () => {
  assert.deepEqual(lireDonnees('// Généré\nwindow.VUE_DONNEES = {"collections":{}};\n'), { collections: {} });
  assert.throws(() => lireDonnees('window.VUE_DONNEES = (() => ({collections:{}}))();'), SyntaxError);
});

test('les noms et leur provenance suivent les données de la vue illustrée', () => {
  const provenance = lireJson(`${corpus}sources.json`);
  const source = lire(`../${provenance.source.fichier}`);
  const donnees = lireDonnees(source);
  const noms = lireJson(`${corpus}noms.json`);
  assert.deepEqual(noms, extraireNoms(donnees));
  assert.deepEqual(Object.keys(donnees.collections).sort(), [...COLLECTIONS].sort());
  assert.equal(provenance.source.sha256, createHash('sha256').update(source).digest('hex'));
  assert.equal(provenance.extracteur.sha256, createHash('sha256').update(lire(`../${provenance.extracteur.fichier}`)).digest('hex'));
  assert.deepEqual(provenance.source.modes, donnees.modes);
  assert.equal(provenance.comptes.noms, noms.length);
  assert.equal(provenance.comptes.sansType, noms.filter((nom: { type: unknown }) => nom.type === null).length);
});

test('le corpus relève aussi les registres d’architecture du kit', () => {
  const registres = lireJson(`${corpus}registres.json`);
  assert.deepEqual(registres, [...REGISTRES, ...REGISTRES_ARCHITECTURE].map((registre) => ({
    id: registre.id, extensible: registre.extensible,
    termes: registre.termes.map((terme) => ({ id: terme.id, toleres: [...(terme.toleres ?? [])] })),
  })));
  const provenance = lireJson(`${corpus}sources.json`);
  assert.equal(provenance.kit.sha256Registres, createHash('sha256').update(lire(`${corpus}registres.json`)).digest('hex'));
  assert.equal(provenance.kit.version, lireJson('../packages/kit/package.json').version);
});

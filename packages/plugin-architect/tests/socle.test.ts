/** Les lois du socle couvrent le manifest, le gabarit et les scénarios réels. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { domainesOuverts, manifestsAuxDroitsPrives, reperesManquants } from 'ucm-plugin-socle/lois/distribution';
import { ecartsDesMessages, fautesDIdentite, fautesDeScenario, scriptsQuiNeCompilentPas, typesDeLUnion, variablesAbsentesDuDecalque, type EtatDeGalerie } from 'ucm-plugin-socle/lois/galerie';
import { classesSansRegle, couleursHorsDesRoles, feuilleDuSocle, reglesMortes, sourcesDuSocle, variantesDeBouton } from 'ucm-plugin-socle/lois/styles';
import { BORNES, tailleValide } from '../src/fenetre';
const racine = path.resolve(__dirname, '..');
const lire = (fichier: string) => fs.readFileSync(path.join(racine, fichier), 'utf8');
const { ETATS } = require('../galerie/etats.cjs') as { ETATS: EtatDeGalerie[] };

test('le manifest dynamique n’ouvre aucun domaine ni droit privé', () => {
  assert.deepEqual(domainesOuverts(racine), ['none']);
  assert.deepEqual(manifestsAuxDroitsPrives(racine), []);
  const manifest = JSON.parse(lire('manifest.json')) as Record<string, unknown>;
  assert.equal(manifest.documentAccess, 'dynamic-page');
  assert.deepEqual(manifest.editorType, ['figma']);
  assert.equal('permissions' in manifest, false);
});
test('le gabarit contient les repères du build autonome', () => {
  assert.deepEqual(reperesManquants(lire('src/ui/index.html')), []);
});
test('chaque réponse possède un scénario de galerie compilable', () => {
  assert.deepEqual(fautesDIdentite(ETATS), []);
  assert.deepEqual(fautesDeScenario(ETATS), []);
  assert.deepEqual(ecartsDesMessages(typesDeLUnion(lire('src/messages.ts'), 'PluginMessage'), ETATS), { jamaisRegardes: [], inventes: [] });
  assert.deepEqual(scriptsQuiNeCompilentPas(path.join(racine, 'galerie')), []);
  assert.deepEqual(variablesAbsentesDuDecalque(feuilleDuSocle() + lire('src/ui/styles.css')), []);
});
test('la fenêtre a sa propre clé et borne les tailles invalides', () => {
  assert.equal(BORNES.cle, 'ucm-architect/tailleFenetre');
  assert.deepEqual(tailleValide({ largeur: 0, hauteur: NaN }), { largeur: 360, hauteur: 720 });
});
test('les classes du socle ont leur règle et la feuille ne contient aucune couleur hors des rôles', () => {
  const sourcesUi = fs.readdirSync(path.join(racine, 'src/ui')).filter((nom) => nom.endsWith('.ts')).map((nom) => lire(`src/ui/${nom}`));
  const source = sourcesUi.join('\n') + sourcesDuSocle().map((fichier) => fs.readFileSync(fichier, 'utf8')).join('\n');
  const feuille = lire('src/ui/styles.css');
  const entrees = { source, feuille: feuilleDuSocle() + feuille, valeursDeGabarit: { variant: () => variantesDeBouton(source) }, poseesParLHote: new Set(['figma-dark']) };
  assert.deepEqual(classesSansRegle(entrees), []);
  assert.deepEqual(reglesMortes({ ...entrees, feuille }), []);
  assert.deepEqual(couleursHorsDesRoles(entrees.feuille), []);
});

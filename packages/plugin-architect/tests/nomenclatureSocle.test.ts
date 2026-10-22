/** Les lois du socle couvrent le gabarit et les scénarios réels. Le manifest est celui d'Architect : `manifest.test.ts`. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { reperesManquants } from 'ucm-plugin-socle/lois/distribution';
import { ecartsDesMessages, fautesDIdentite, fautesDeScenario, scriptsQuiNeCompilentPas, typesDeLUnion, variablesAbsentesDuDecalque, type EtatDeGalerie } from 'ucm-plugin-socle/lois/galerie';
import { classesSansRegle, couleursHorsDesRoles, feuilleDuSocle, reglesMortes, sourcesDuSocle, variantesDeBouton } from 'ucm-plugin-socle/lois/styles';
import { BORNES, tailleValide } from '../src/nomenclature/fenetre';
const racine = path.resolve(__dirname, '..');
const lire = (fichier: string) => fs.readFileSync(path.join(racine, fichier), 'utf8');
const { ETATS } = require('../galerie/nomenclature/etats.cjs') as { ETATS: EtatDeGalerie[] };

test('le gabarit contient les repères du build autonome', () => {
  assert.deepEqual(reperesManquants(lire('src/ui/nomenclature/index.html')), []);
});
test('chaque réponse possède un scénario de galerie compilable', () => {
  assert.deepEqual(fautesDIdentite(ETATS), []);
  assert.deepEqual(fautesDeScenario(ETATS), []);
  assert.deepEqual(ecartsDesMessages(typesDeLUnion(lire('src/nomenclature/messages.ts'), 'PluginMessage'), ETATS), { jamaisRegardes: [], inventes: [] });
  assert.deepEqual(scriptsQuiNeCompilentPas(path.join(racine, 'galerie', 'nomenclature')), []);
  assert.deepEqual(variablesAbsentesDuDecalque(feuilleDuSocle() + lire('src/ui/nomenclature/styles.css')), []);
});
test('la fenêtre a sa propre clé et borne les tailles invalides', () => {
  assert.equal(BORNES.cle, 'ucm-architect/tailleFenetre');
  assert.deepEqual(tailleValide({ largeur: 0, hauteur: NaN }), { largeur: 360, hauteur: 720 });
});
test('les classes du socle ont leur règle et la feuille ne contient aucune couleur hors des rôles', () => {
  const sourcesUi = fs.readdirSync(path.join(racine, 'src/ui/nomenclature')).filter((nom) => nom.endsWith('.ts')).map((nom) => lire(`src/ui/nomenclature/${nom}`));
  const source = sourcesUi.join('\n') + sourcesDuSocle().map((fichier) => fs.readFileSync(fichier, 'utf8')).join('\n');
  const feuille = lire('src/ui/nomenclature/styles.css');
  const entrees = { source, feuille: feuilleDuSocle() + feuille, valeursDeGabarit: { variant: () => variantesDeBouton(source) }, poseesParLHote: new Set(['figma-dark']) };
  assert.deepEqual(classesSansRegle(entrees), []);
  assert.deepEqual(reglesMortes({ ...entrees, feuille }), []);
  assert.deepEqual(couleursHorsDesRoles(entrees.feuille), []);
});

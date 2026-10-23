/** Les lois du socle couvrent les états et les feuilles de Nomenclature, montée dans le panneau latéral d'Architect. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { ecartsDesMessages, fautesDIdentite, fautesDeScenario, typesDeLUnion, variablesAbsentesDuDecalque, type EtatDeGalerie } from 'ucm-plugin-socle/lois/galerie';
import { classesSansRegle, couleursHorsDesRoles, feuilleDuSocle, reglesMortes, sourcesDuSocle, variantesDeBouton } from 'ucm-plugin-socle/lois/styles';
import { BORNES, tailleValide } from '../src/nomenclature/fenetre';
const racine = path.resolve(__dirname, '..');
const lire = (fichier: string) => fs.readFileSync(path.join(racine, fichier), 'utf8');
const { ETATS } = require('../galerie/etats/nomenclature.cjs') as { ETATS: EtatDeGalerie[] };

test('chaque réponse possède un scénario de galerie compilable', () => {
  assert.deepEqual(fautesDIdentite(ETATS), []);
  assert.deepEqual(fautesDeScenario(ETATS), []);
  // Un état du mode Tokens (`t-renommages`) lit d'abord le relevé du fichier, que l'arbre et la table montrent : `preferences` et `releve` y précèdent les messages de Nomenclature.
  // `structure` répond au domaine de la structure, dont les pastilles de ces états dépendent ; `regles-recues` est le message que l'interface lit pour les règles du mode Composant (`ui/nomenclature/reglesRecues.ts`).
  const declares = new Set([...typesDeLUnion(lire('src/messages/nomenclature.ts'), 'MessageDeNomenclature'), 'preferences', 'releve', 'structure', 'regles-recues']);
  assert.deepEqual(ecartsDesMessages(declares, ETATS), { jamaisRegardes: [], inventes: [] });
  assert.deepEqual(variablesAbsentesDuDecalque(feuilleDuSocle() + lire('src/ui/styles/nomenclature.css')), []);
});
test('la fenêtre a sa propre clé et borne les tailles invalides', () => {
  assert.equal(BORNES.cle, 'ucm-architect/tailleFenetre');
  assert.deepEqual(tailleValide({ largeur: 0, hauteur: NaN }), { largeur: 360, hauteur: 720 });
});
test('les classes du socle ont leur règle et la feuille ne contient aucune couleur hors des rôles', () => {
  const sourcesUi = fs.readdirSync(path.join(racine, 'src/ui/nomenclature')).filter((nom) => nom.endsWith('.ts')).map((nom) => lire(`src/ui/nomenclature/${nom}`));
  const source = sourcesUi.join('\n') + sourcesDuSocle().map((fichier) => fs.readFileSync(fichier, 'utf8')).join('\n');
  const feuille = lire('src/ui/styles/nomenclature.css');
  const entrees = { source, feuille: feuilleDuSocle() + feuille, valeursDeGabarit: { variant: () => variantesDeBouton(source) }, poseesParLHote: new Set(['figma-dark']) };
  assert.deepEqual(classesSansRegle(entrees), []);
  assert.deepEqual(reglesMortes({ ...entrees, feuille }), []);
  assert.deepEqual(couleursHorsDesRoles(entrees.feuille), []);
});

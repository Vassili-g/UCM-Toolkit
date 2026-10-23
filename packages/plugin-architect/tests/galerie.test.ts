/** L'inventaire des états de la galerie ne vieillit pas en silence. La loi est celle du socle. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  ecartsDesMessages,
  fautesDAttente,
  fautesDeScenario,
  fautesDIdentite,
  scriptsQuiNeCompilentPas,
  typesDeLUnion,
  variablesAbsentesDuDecalque,
  type EtatDeGalerie,
} from 'ucm-plugin-socle/lois/galerie';
import { feuilleDuSocle } from 'ucm-plugin-socle/lois/styles';

const racine = path.resolve(__dirname, '..');

/**
 * Les messages du sandbox que l'interface d'Architect reçoit, par domaine. Ceux de Nomenclature ont leurs états
 * dans `nomenclatureSocle.test.ts`. Les domaines construits par les lots suivants ajoutent ici leur fichier.
 */
const DOMAINES_DE_MESSAGES: readonly (readonly [string, string])[] = [['commun.ts', 'MessageDeCommun'], ['arbre.ts', 'MessageDArbre'], ['composant.ts', 'MessageDeComposant']];
const { ETATS: TOUS } = require('../galerie/etats.cjs') as { ETATS: EtatDeGalerie[] };
/** Les états d'Architect ; ceux de Nomenclature sont jugés par `nomenclatureSocle.test.ts`. */
const ETATS = TOUS.filter((etat) => (etat as { domaine?: string }).domaine !== 'nomenclature');

test('chaque état porte son identité et sa situation', () => {
  assert.deepEqual(fautesDIdentite(ETATS), []);
});

test('un état absent nomme la case du plan qui le créera', () => {
  assert.deepEqual(fautesDAttente(ETATS, /^Lot [A-Z]?\d+$/), []);
});

test('un état atteignable dit ce qu’on regarde, et chaque étape porte un seul geste', () => {
  assert.deepEqual(fautesDeScenario(ETATS), []);
});

test('tout message que le sandbox peut envoyer a un état où le regarder', () => {
  const declares = new Set(DOMAINES_DE_MESSAGES.flatMap(([fichier, nom]) => [...typesDeLUnion(fs.readFileSync(path.join(racine, 'src', 'messages', fichier), 'utf8'), nom)]));
  assert.ok(declares.size > 0);
  // Les états de la recherche et de la fiche jouent des messages de Nomenclature, que ces domaines ne déclarent pas : ils n'ont aucun message propre.
  const avecMessages = ETATS.filter((etat) => !['recherche', 'fiche'].includes((etat as { domaine?: string }).domaine ?? ''));
  assert.deepEqual(ecartsDesMessages(declares, avecMessages), { jamaisRegardes: [], inventes: [] });
});

test('le décalque sert toutes les variables de thème que les feuilles demandent', () => {
  const feuilles = feuilleDuSocle() + fs.readdirSync(path.join(racine, 'src', 'ui', 'styles')).map((nom) => fs.readFileSync(path.join(racine, 'src', 'ui', 'styles', nom), 'utf8')).join('\n');
  assert.deepEqual(variablesAbsentesDuDecalque(feuilles), []);
});

test('chaque script de la galerie se compile', () => {
  const dossier = path.join(racine, 'galerie');
  assert.ok(fs.readdirSync(dossier).includes('capturer.cjs'), 'capturer.cjs a quitté la galerie');
  for (const sous of ['', 'etats', 'nomenclature']) assert.deepEqual(scriptsQuiNeCompilentPas(path.join(dossier, sous)), []);
});

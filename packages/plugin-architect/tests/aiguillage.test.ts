/** L'aiguillage du sandbox : chaque type de demande a un seul domaine, les souches répondent `non-construit`, la péremption suit N1. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { typesDeLUnion } from 'ucm-plugin-socle/lois/galerie';

import { dispositionDeLOuverture, origineDeLaSelection, retenirLaSelectionDuPlugin } from '../src/sandbox/commun';
import { analyseCourante, commencerUneAnalyse, oublierLAnalyse, perimerApresUneEcriture, surChangementDuDocument, surSelection } from '../src/sandbox/analyse';
import type { Contexte } from '../src/sandbox/contexte';
import { DOMAINES, tableDesTypes } from '../src/sandbox/index';
import { souche } from '../src/sandbox/souche';
import type { PluginMessage } from '../src/messages';

const racine = path.resolve(__dirname, '..');
const messages = (fichier: string) => fs.readFileSync(path.join(racine, 'src', 'messages', fichier), 'utf8');

/** Le nom de l'union de demandes de chaque domaine, lu dans son fichier de messages. */
const UNIONS: Readonly<Record<string, string>> = {
  commun: 'DemandeDeCommun', arbre: 'DemandeDArbre', recherche: 'DemandeDeRecherche', fiche: 'DemandeDeFiche', bibliotheque: 'DemandeDeBibliotheque',
  nomenclature: 'DemandeDeNomenclature', structure: 'DemandeDeStructure', composant: 'DemandeDeComposant', analyse: 'DemandeDAnalyse',
  corrections: 'DemandeDeCorrections', questions: 'DemandeDeQuestions', ignores: 'DemandeDIgnores', accessibilite: 'DemandeDAccessibilite',
  regles: 'DemandeDeRegles', preparation: 'DemandeDePreparation', configuration: 'DemandeDeConfiguration', rapport: 'DemandeDeRapport',
};

function contexteDeTest(): { contexte: Contexte; envoyes: PluginMessage[]; abonnements: number[] } {
  const envoyes: PluginMessage[] = [];
  const abonnements = [0];
  const contexte: Contexte = { figma: {} as PluginAPI, envoyer: (message) => envoyes.push(message), surveillerLeDocument: () => { abonnements[0] += 1; } };
  return { contexte, envoyes, abonnements };
}

test('chaque domaine de N1 a son fichier de messages, son sandbox et sa table de types', () => {
  assert.deepEqual(Object.keys(DOMAINES).sort(), Object.keys(UNIONS).sort());
  for (const domaine of Object.keys(UNIONS)) {
    assert.ok(fs.existsSync(path.join(racine, 'src', 'messages', `${domaine}.ts`)), `messages/${domaine}.ts`);
    assert.ok(fs.existsSync(path.join(racine, 'src', 'sandbox', `${domaine}.ts`)), `sandbox/${domaine}.ts`);
  }
});

test('la table de chaque domaine liste exactement les types de ses demandes', () => {
  for (const [domaine, union] of Object.entries(UNIONS)) {
    const lus = domaine === 'commun' ? new Set(['lire-preferences', 'ranger-preferences', 'changer-disposition', 'resize']) : typesDeLUnion(messages(`${domaine}.ts`), union);
    assert.deepEqual([...DOMAINES[domaine as keyof typeof DOMAINES].TYPES].sort(), [...lus].sort(), domaine);
  }
});

test('aucun type de demande n’appartient à deux domaines', () => {
  const table = tableDesTypes();
  assert.equal(table.get('noms-analyser'), 'nomenclature');
  assert.equal(table.get('analyser'), 'analyse');
  assert.equal(table.get('resize'), 'commun');
  assert.throws(() => tableDesTypes({ a: { TYPES: ['x'] }, b: { TYPES: ['x'] } }), /x.*a.*b/);
});

test('une souche répond non-construit, sans rien écrire', async () => {
  const { contexte, envoyes } = contexteDeTest();
  await souche<never>('essai')({} as never, contexte);
  assert.deepEqual(envoyes, [{ type: 'non-construit', domaine: 'essai' }]);
});

test('le mode d’ouverture suit le sujet de la sélection', () => {
  assert.equal(dispositionDeLOuverture(null), 'large');
  assert.equal(dispositionDeLOuverture({ id: '1:2', portee: '1:2' }), 'etroite');
});

test('la sélection que le plugin vient de poser porte origine plugin, une seule fois', () => {
  assert.equal(origineDeLaSelection(['1:1']), 'figma');
  retenirLaSelectionDuPlugin(['1:1', '1:2']);
  assert.equal(origineDeLaSelection(['1:2', '1:1']), 'plugin');
  assert.equal(origineDeLaSelection(['1:2', '1:1']), 'figma');
  retenirLaSelectionDuPlugin(['1:1']);
  assert.equal(origineDeLaSelection(['1:9']), 'figma');
});

test('la génération monte à chaque analyse et abonne le document', () => {
  const { contexte, abonnements } = contexteDeTest();
  const premiere = commencerUneAnalyse('cle', ['a'], contexte);
  const seconde = commencerUneAnalyse('cle', ['a'], contexte);
  assert.equal(seconde.generation, premiere.generation + 1);
  assert.deepEqual(analyseCourante(), seconde);
  assert.equal(abonnements[0], 2);
  oublierLAnalyse();
  assert.equal(analyseCourante(), null);
});

test('une écriture du plugin périme l’analyse une seule fois', () => {
  const { contexte, envoyes } = contexteDeTest();
  const analyse = commencerUneAnalyse('cle', ['a'], contexte);
  perimerApresUneEcriture(contexte);
  perimerApresUneEcriture(contexte);
  assert.deepEqual(envoyes, [{ type: 'perime', analyse, cause: 'ecriture' }]);
});

test('un changement de la page périme l’analyse seulement s’il touche son jeu', () => {
  const { contexte, envoyes } = contexteDeTest();
  const analyse = commencerUneAnalyse('cle', ['jeu', 'variant'], contexte);
  surChangementDuDocument(['autre'], contexte);
  assert.deepEqual(envoyes, []);
  surChangementDuDocument(['autre', 'variant'], contexte);
  assert.deepEqual(envoyes, [{ type: 'perime', analyse, cause: 'document' }]);
});

test('seule une sélection Figma d’un autre jeu périme l’analyse', () => {
  const { contexte, envoyes } = contexteDeTest();
  const analyse = commencerUneAnalyse('cle', ['jeu', 'variant'], contexte);
  surSelection('variant', 'figma', contexte);
  surSelection(null, 'figma', contexte);
  surSelection('autre', 'plugin', contexte);
  assert.deepEqual(envoyes, []);
  surSelection('autre', 'figma', contexte);
  assert.deepEqual(envoyes, [{ type: 'perime', analyse, cause: 'selection' }]);
});

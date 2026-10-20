/** Le plan et l'écriture voient les réservations du même lot. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { lireLesVariablesDuFichier } from '../src/lectureDesVariables';
import { tokensDeLaPalette } from '../src/variables/gestion';
import { planDuLot } from '../src/variables/lot';
import { api, autre, bleu, ecrire, fichierDuLot, verifierLaLoiDuLot } from './lotDeTest';

for (const palettes of [[bleu, autre], [autre, bleu]]) {
  for (const permissif of [false, true]) {
    test(`le lot refuse le second nom convergent avant création, ordre ${palettes[0].nom}, doublons ${permissif}`, async () => {
      const { figma, recette } = fichierDuLot(palettes);
      figma.accepterLesDoublons = permissif;
      const fichier = await lireLesVariablesDuFichier(api(figma));
      const avant = JSON.stringify(fichier);
      const plan = planDuLot(recette, fichier, { palettes: palettes.map((palette) => palette.id), remettre: [], remplacer: [] });
      assert.equal(JSON.stringify(fichier), avant);
      const [premiere, seconde] = plan.palettes;
      assert.ok(premiere.decision === 'ecrire');
      assert.equal(premiere.creations.length, 44);
      assert.ok(seconde.decision === 'nom-pris');
      assert.equal(seconde.nom, 'Color/OceanBlue/Soft/Light/50');
      assert.equal(seconde.occupant.par, 'palette');
      assert.deepEqual(seconde.occupant.par === 'palette' ? [seconde.occupant.palette, seconde.occupant.dansLeLot] : null, [palettes[0].id, true]);
      figma.journal.length = 0;
      const resultat = await ecrire(figma, recette);
      assert.ok(resultat.issue === 'ecrites');
      assert.deepEqual(resultat.palettes[1], { palette: palettes[1].id, issue: 'nom-pris', nom: 'Color/OceanBlue/Soft/Light/50', occupant: { palette: palettes[0].id, dansLeLot: true } });
      assert.equal(figma.locales.size, 44);
      assert.equal(figma.journal.filter((ligne) => ligne === 'commitUndo').length, 1);
      const mutation = figma.journal.findIndex((ligne) => ligne.startsWith('créer variable'));
      assert.ok(!figma.journal.slice(mutation).includes('lire variables'));
      await verifierLaLoiDuLot(figma, plan);
    });
  }
}

test('Gestion annonce le refus d’une variable tenue par une autre palette de la recette', async () => {
  const { figma, recette } = fichierDuLot();
  await ecrire(figma, recette, [bleu.id]);
  const tokens = tokensDeLaPalette(recette, autre, await lireLesVariablesDuFichier(api(figma)));
  assert.deepEqual(tokens.refus, { nom: 'Color/OceanBlue/Soft/Light/50', palette: bleu.id });
});

test('Gestion propose le remplacement tiers que le plan n’admet que sur confirmation', async () => {
  const { figma, collection, recette } = fichierDuLot([bleu]);
  const variable = figma.variables.createVariable('Color/OceanBlue/Soft/Light/50', collection!, 'COLOR');
  const fichier = await lireLesVariablesDuFichier(api(figma));
  const refuse = planDuLot(recette, fichier, { palettes: [bleu.id], remettre: [], remplacer: [] }).palettes[0];
  assert.ok(refuse.decision === 'nom-pris' && refuse.occupant.par === 'tiers');
  const tokens = tokensDeLaPalette(recette, bleu, fichier);
  assert.equal(tokens.refus, null);
  assert.deepEqual(tokens.variablesExistantes, [variable.id]);
  assert.equal(tokens.aCreer.length, 43);
  // Sans confirmation, l'écriture refuse comme le plan : l'issue ne nomme aucune palette occupante.
  const sans = await ecrire(figma, recette, [bleu.id]);
  assert.ok(sans.issue === 'ecrites');
  assert.deepEqual(sans.palettes, [{ palette: bleu.id, issue: 'nom-pris', nom: 'Color/OceanBlue/Soft/Light/50' }]);
  assert.equal(figma.locales.size, 1);
  const confirme = planDuLot(recette, fichier, { palettes: [bleu.id], remettre: [], remplacer: [bleu.id] });
  figma.journal.length = 0;
  const resultat = await ecrire(figma, recette, [bleu.id], [bleu.id]);
  assert.ok(resultat.issue === 'ecrites' && resultat.palettes[0].issue === 'ecrite');
  assert.equal(figma.locales.size, 44);
  await verifierLaLoiDuLot(figma, confirme);
});

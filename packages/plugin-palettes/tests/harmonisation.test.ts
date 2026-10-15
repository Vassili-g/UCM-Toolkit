/** Les choix de session suivent les identifiants, y compris quand la recette est remplacée. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { recetteParDefaut, type Palette, type Recette } from 'ucm-couleur';

import { choisirPaletteARegler, cocherPalette, entrerEnHarmonisation, harmonisationInitiale, synchroniserHarmonisation, toutDecocher } from '../src/harmonisation';

const defaut = recetteParDefaut();
const palettes: Palette[] = Array.from({ length: 5 }, (_, rang) => ({
  id: `p-0000000${rang}`, nom: 'Même nom', reference: '#0891B2',
  derive: { lien: true, soft: { clair: 0, sombre: 0, origine: 'libre' }, vivid: { clair: 0, sombre: 0, origine: 'libre' } },
}));
const recette: Recette = { ...defaut, palettes };
const selectionner = (ids: readonly string[]) => ids.reduce((etat, id) => cocherPalette(etat, recette, id), harmonisationInitiale());

test('[UI-39] deux palettes de même nom se cochent séparément, dans l’ordre de cochage', () => {
  const etat = selectionner([palettes[1].id, palettes[0].id]);
  assert.deepEqual(etat.cochees, [palettes[1].id, palettes[0].id]);
  assert.equal(etat.regler, palettes[1].id);
  assert.equal(etat.mode, 'light');
  assert.equal(etat.intensite, 'vivid');
  assert.equal(etat.affichage, 'couleurs');
  assert.equal(etat.roue, false);
  assert.equal(etat.vision, 'Normale');
});

test('[UI-39] une cinquième palette est refusée ; un changement des cochées efface le refus', () => {
  const quatre = selectionner(palettes.slice(0, 4).map(({ id }) => id));
  const refusee = cocherPalette(quatre, recette, palettes[4].id);
  assert.deepEqual(refusee.cochees, quatre.cochees);
  assert.equal(refusee.trop, true);
  assert.equal(quatre.trop, false);
  const decochee = cocherPalette(refusee, recette, palettes[0].id);
  assert.equal(decochee.trop, false);
  assert.equal(decochee.regler, palettes[1].id);
  assert.equal(cocherPalette(decochee, recette, palettes[4].id).cochees.at(-1), palettes[4].id);
  const vide = toutDecocher(refusee);
  assert.deepEqual(vide.cochees, []);
  assert.equal(vide.regler, null);
  assert.equal(vide.trop, false);
});

test('[UI-39] Régler accepte seulement une cochée et suit le décochage', () => {
  const deux = selectionner(palettes.slice(0, 2).map(({ id }) => id));
  assert.equal(choisirPaletteARegler(deux, palettes[4].id), deux);
  const choisie = choisirPaletteARegler(deux, palettes[1].id);
  assert.equal(choisie.regler, palettes[1].id);
  assert.equal(cocherPalette(choisie, recette, palettes[1].id).regler, palettes[0].id);
  assert.equal(cocherPalette(cocherPalette(choisie, recette, palettes[1].id), recette, palettes[0].id).regler, null);
});

test('[UI-39] renommage, import et synchronisation conservent les identifiants présents', () => {
  const etat = selectionner([palettes[1].id, palettes[0].id]);
  const importee = { ...recette, palettes: [...palettes].reverse().map((palette) => ({ ...palette, nom: 'Renommée', reference: '#FACC15' })) };
  assert.deepEqual(synchroniserHarmonisation(etat, importee).cochees, etat.cochees);
  assert.equal(synchroniserHarmonisation(etat, importee).regler, etat.regler);
  const supprimee = synchroniserHarmonisation({ ...etat, departs: new Map(palettes.map((palette) => [palette.id, palette])) }, { ...recette, palettes: palettes.filter(({ id }) => id !== palettes[1].id) });
  assert.deepEqual(supprimee.cochees, [palettes[0].id]);
  assert.equal(supprimee.regler, palettes[0].id);
  assert.equal(supprimee.departs.has(palettes[1].id), false);
});

test('[UI-39] sous deux palettes, tout l’état se vide ; un identifiant disparu ne se coche pas', () => {
  const plein = { ...selectionner(palettes.slice(0, 4).map(({ id }) => id)), mode: 'dark' as const, intensite: 'soft' as const, affichage: 'gris' as const, roue: true, vision: 'Protanopie' as const, trop: true, departs: new Map([[palettes[0].id, palettes[0]]]) };
  for (const lue of [null, { ...recette, palettes: [] }, { ...recette, palettes: [palettes[0]] }]) {
    assert.deepEqual(synchroniserHarmonisation(plein, lue), harmonisationInitiale());
  }
  assert.deepEqual(cocherPalette(harmonisationInitiale(), { ...recette, palettes: [palettes[0]] }, palettes[0].id), harmonisationInitiale());
  assert.deepEqual(cocherPalette(harmonisationInitiale(), recette, 'absente'), harmonisationInitiale());
});

test('[UI-39] entrer renouvelle les départs sans effacer les choix de session', () => {
  const precedente = { ...selectionner([palettes[0].id]), mode: 'dark' as const, departs: new Map([[palettes[0].id, palettes[0]]]) };
  const entree = entrerEnHarmonisation(precedente);
  assert.equal(entree.departs.size, 0);
  assert.equal(precedente.departs.size, 1);
  assert.deepEqual(entree.cochees, precedente.cochees);
  assert.equal(entree.mode, 'dark');
});

test('[UI-39] les palettes libres, figées et à une intensité restent sélectionnables', () => {
  const lue = { ...recette, palettes: [
    { ...palettes[0], crans: [100, 500, 900] },
    { ...palettes[1], intensites: 1 as const, crans: [100, 500], figees: { light: ['#111111', '#777777'] } },
    { ...palettes[2], intensites: 1 as const },
  ] };
  const etat = lue.palettes.reduce((precedent, palette) => cocherPalette(precedent, lue, palette.id), harmonisationInitiale());
  assert.deepEqual(etat.cochees, lue.palettes.map(({ id }) => id));
});

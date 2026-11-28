/**
 * Le banc des pièces, premier parcours : un composant généré sans pièce s'exporte, le kit résout chaque variant (`vueExacteDuVariant`),
 * et le comparateur rapproche cette vue du rendu que le modèle de vérité attend, sans contrat de référence.
 *
 * Borne : ce parcours juge le moteur 14.0 sur un composant sans pièce. Une occurrence se juge avec le sous-lot 1.10 ; son erreur d'adresse
 * est testée dans `plugin-socle/tests/comparateurDuBanc.test.ts`.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { comparer } from '../../plugin-socle/tests/generateur/comparateur';
import { renduLu, variantsDuContrat } from '../../plugin-socle/tests/generateur/lecture';
import { renduAttendu, variantsDeLHote } from '../../plugin-socle/tests/generateur/verite';
import { lancerLeBanc, resumerLeBanc } from './aides/banc';
import { composantDuBanc, exporterLeDocument } from './aides/documentDuBanc';

/** Deux `Label` frères sous la racine : le rang départage leurs identités. L'icône est masquable et la couleur d'un anneau est un contour. */
const document = () => composantDuBanc(['texte', 'icone', 'texte', 'anneau'], ['visibilite', 'homonymes'], 2);

test('un composant sans pièce : le comparateur ne rend aucun écart sur chaque variant', async () => {
  const doc = document();
  const { contrat } = await exporterLeDocument(doc);
  const variants = variantsDeLHote(doc);
  assert.equal(variants.length, 2, 'le document pose deux variants');
  assert.deepEqual(variantsDuContrat(contrat), variants, 'le contrat publie les mêmes variants que l’hôte');
  for (const variant of variants) {
    const attendu = renduAttendu(doc, { variant });
    const lu = renduLu(contrat, variant);
    assert.ok(Object.keys(attendu.calques).length >= 8, `le rendu de ${variant} ne doit pas être vide : ${Object.keys(attendu.calques).join(' | ')}`);
    assert.deepEqual(comparer(attendu, lu, contrat.meta.diagnostics ?? []), [], variant);
  }
});

test('un calque porte l’identité de son chemin et du rang de son nom parmi ses frères', async () => {
  const doc = document();
  const { calques } = renduAttendu(doc, { variant: 'v' });
  assert.deepEqual(Object.keys(calques).filter((k) => k.startsWith('Label#')), ['Label#0', 'Label#1']);
  assert.ok(calques['Header#0 › Label#0'] && calques['Body#0 › Label#0'], 'deux Label sous des parents différents gardent le rang 0');
});

test('un défaut injecté dans le contrat (la couleur d’un seul calque) fait rendre exactement cet écart', async () => {
  const doc = document();
  const { contrat } = await exporterLeDocument(doc);
  const variant = 'v';
  const attendu = renduAttendu(doc, { variant });
  const jeton = '{components.compose.color.primary.filled.default.divider}';
  const abime = structuredClone(contrat);
  const donnee = abime.variants.find((v: { nodeId: string }) => v.nodeId === variant);
  // La vue du variant se copie : l'autre variant partage le même catalogue et ne doit pas bouger.
  const vue = structuredClone(abime.variantViews[donnee.view]);
  const placements = structuredClone(abime.viewPaintPlacements[vue.paintPlacements]);
  const cle = Object.keys(placements.fills).find((k) => placements.fills[k].some((c: string[]) => c.join('/') === 'label'));
  assert.ok(cle, 'un calque Label est peint par un jeton de la feuille');
  placements.fills[cle] = placements.fills[cle].filter((c: string[]) => c.join('/') !== 'label');
  placements.fills.defautInjecte = [['label']];
  donnee.tokens = { ...donnee.tokens, defautInjecte: jeton };
  abime.viewPaintPlacements.ppDefaut = placements;
  abime.variantViews.vDefaut = { ...vue, paintPlacements: 'ppDefaut' };
  donnee.view = 'vDefaut';

  const ecarts = comparer(attendu, renduLu(abime, variant), []);
  assert.equal(ecarts.length, 1, JSON.stringify(ecarts));
  assert.deepEqual(ecarts[0], { variant, identite: 'Label#0', champ: 'couleurs', attendu: [contrat.variants.find((v: { nodeId: string }) => v.nodeId === variant).tokens[cle]], lu: [jeton], normatif: true });
  const intact = 'v-bis';
  assert.deepEqual(comparer(renduAttendu(doc, { variant: intact }), renduLu(abime, intact), []), [], 'l’autre variant garde son contrat');
});

test('le comparateur voit un calque manquant, un espacement changé et un texte changé, chacun une fois', async () => {
  const doc = document();
  const { contrat } = await exporterLeDocument(doc);
  const variant = 'v';
  const attendu = renduAttendu(doc, { variant });
  const structure = (c: { variantViews: Record<string, { structure: string }>; viewStructures: Record<string, any> }) => c.viewStructures[c.variantViews[contrat.variants[0].view].structure];

  const sansAnneau = structuredClone(contrat);
  structure(sansAnneau).children = structure(sansAnneau).children.filter((s: { figmaLayer: string }) => s.figmaLayer !== 'Ring');
  assert.deepEqual(comparer(attendu, renduLu(sansAnneau, variant), []), [{ variant, identite: 'Ring#0', champ: 'calque', attendu: 'présent', lu: 'absent', normatif: true }]);

  const autreGap = structuredClone(contrat);
  structure(autreGap).gap = '{components.compose.size.small.padding-x}';
  const [ecartGap, ...restes] = comparer(attendu, renduLu(autreGap, variant), []);
  assert.deepEqual(restes, []);
  assert.deepEqual([ecartGap.identite, ecartGap.champ, ecartGap.lu], ['(racine)', 'flux', { ...attendu.calques['(racine)'].flux, gap: '{components.compose.size.small.padding-x}' }]);

  const autreTexte = structuredClone(contrat);
  autreTexte.samples[contrat.variants[0].sample].text[0].value = 'Autre texte';
  assert.deepEqual(comparer(attendu, renduLu(autreTexte, variant), []), [{ variant, identite: 'Label#0', champ: 'texte', attendu: 'Exemple', lu: 'Autre texte', normatif: false }]);
});

test('200 tirages à graine fixe : aucun écart non couvert sur les composants sans pièce, les pièces internes comptées à part', async () => {
  const resultat = await lancerLeBanc({ graine: 1729, nombre: 200 });
  assert.equal(resultat.juges + resultat.attenduEn15.length, 200);
  assert.ok(resultat.attenduEn15.length > 0, 'le tirage contient des pièces internes, attendues en 15.0');
  assert.deepEqual(resumerLeBanc(resultat).filter((l) => !l.startsWith('Banc des pièces') && !l.startsWith('Jugés')), [], 'aucun écart non couvert');
  assert.equal(resultat.enEcart.length, 0);
});

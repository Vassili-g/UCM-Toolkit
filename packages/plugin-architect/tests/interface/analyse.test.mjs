/**
 * Les interactions du domaine `analyse` : le panneau des constats, ses états, et l'identité de l'analyse.
 * Ces tests jouent des messages d'analyse que `fermer` ne connaît pas : ils vérifient eux-mêmes les erreurs de la page.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { lancerLeNavigateur, envoyer, exiger, ouvrirComposant } from './aide.mjs';

lancerLeNavigateur();
const { alertCorrections, analyseCorrections, aucunIgnore } = exiger('../../galerie/etats/corrections.cjs');
const { IDENTITE } = exiger('../../galerie/composant/donnees.cjs');
const variants = analyseCorrections.variants;

const terminer = async (page) => {
  assert.deepEqual(page.erreurs, []);
  await page.context().close();
};

/** La fenêtre du mode Composant, panneau ouvert : le relevé de la lecture n'a pas besoin d'image. */
async function ouvrirLePanneau(messages = [], lecture = alertCorrections) {
  const page = await ouvrirComposant(lecture, { image: false });
  await page.setViewportSize({ width: 1040, height: 760 });
  for (const message of messages) await envoyer(page, message);
  await page.getByRole('button', { name: 'Constats' }).click();
  return page;
}

const lu = (statut, constats, lecture = null, lus = variants) => ({ type: 'analyse', analyse: IDENTITE, statut, constats, lecture, variants: lus });
const texteDuPanneau = (page) => page.locator('.arch-laterale').innerText();
/** Les demandes de l'interface au sandbox : l'envoi se relève un instant après le geste. */
const demandes = async (page, type) => {
  await page.waitForTimeout(30);
  return page.evaluate((cherche) => window.demandes.filter((demande) => demande.type === cherche), type);
};

test('le panneau annonce chaque état de l’analyse, et ne dit « aucun constat » que d’une analyse complète', async () => {
  const page = await ouvrirLePanneau();
  try {
    assert.equal(await page.locator('.arch-resume .meta').textContent(), '11 variants, pas encore analysé');
    assert.equal(await page.locator('.sommaire-elements').count(), 0);

    await envoyer(page, { type: 'analyse-commencee', analyse: IDENTITE });
    await envoyer(page, { type: 'analyse-en-cours', analyse: IDENTITE, variantsLus: 5, variantsTotal: 11 });
    assert.equal(await page.locator('.arch-resume .meta').textContent(), '11 variants, analyse en cours, 5 variants sur 11');
    assert.doesNotMatch(await texteDuPanneau(page), /s’afficheront à la fin/);
    assert.equal(await page.getByRole('button', { name: 'Analyser' }).isDisabled(), true);

    const lecture = { layersLus: 2000, layersNonLus: 640, variantsNonLus: ['Severity=warning, Variant=standard'], manquees: [] };
    for (const constats of [analyseCorrections.constats, []]) {
      await envoyer(page, lu('partielle', constats, lecture));
      const texte = await texteDuPanneau(page);
      assert.match(texte, /Analyse partielle : 2 000 layers lus sur 2 640\./);
      assert.match(texte, /Les variants non lus ne sont pas contrôlés\./);
      assert.doesNotMatch(texte, /Aucun constat/);
    }

    await envoyer(page, lu('annulee', [], null, []));
    assert.match(await texteDuPanneau(page), /L’analyse a été annulée\./);
    assert.equal(await page.locator('.arch-laterale .alerte.ton-tenu').count(), 0);

    const arret = { id: 'C42:0', code: 'C42', type: 'bloquant', famille: 'export', variants: [], layers: [], faits: { message: 'deux variant properties s’écrivent de la même façon, State et state' } };
    await envoyer(page, lu('arretee', [arret], null, []));
    assert.match(await texteDuPanneau(page), /Message de l’exporteur : deux variant properties s’écrivent de la même façon, State et state, puis cliquez Actualiser\./);
    assert.match(await texteDuPanneau(page), /Aucun autre contrôle n’a été fait\./);
    assert.equal(await page.locator('.arch-laterale .alerte.ton-bloquant').count(), 1);

    await envoyer(page, lu('complete', []));
    assert.match(await texteDuPanneau(page), /Aucun constat sur les 11 variants d’Alert\./);
    assert.equal(await page.locator('.arch-laterale .alerte.ton-tenu').count(), 1);
    assert.equal(await page.locator('.sommaire-elements').count(), 0);
  } finally { await terminer(page); }
});

test('le sommaire porte le nombre de points de chaque élément, et le panneau se ferme et se rouvre sur le même élément', async () => {
  const page = await ouvrirLePanneau([analyseCorrections, aucunIgnore]);
  try {
    assert.equal(await page.locator('.onglets').count(), 0);
    assert.deepEqual(await page.locator('.puce-element').evaluateAll((puces) => puces.map((puce) => puce.getAttribute('aria-label'))), [
      'Tout, 24 points', 'Couleurs, 18 points', 'Tailles et forme, 2 points', 'Tokens du composant, 3 points', 'Règles d’utilisation, 1 point',
    ]);
    assert.equal(await page.locator('.arch-resume .meta').textContent().then((texte) => texte.endsWith('24 points')), true);
    assert.equal(await page.locator('.bouton-panneau .pastille-compte').textContent(), '24');
    await page.locator('.puce-element[data-element="tailles"]').click();
    assert.equal(await page.locator('.puce-element[data-element="tailles"]').getAttribute('aria-pressed'), 'true');
    assert.deepEqual(await page.locator('.section-element').evaluateAll((sections) => sections.map((section) => section.dataset.element)), ['tailles']);
    await page.getByRole('button', { name: 'Constats' }).click();
    await page.getByRole('button', { name: 'Constats' }).click();
    assert.equal(await page.locator('.puce-element[data-element="tailles"]').getAttribute('aria-pressed'), 'true');
  } finally { await terminer(page); }
});

test('un message d’une autre analyse est ignoré, une analyse plus récente prend la place', async () => {
  const page = await ouvrirLePanneau([analyseCorrections, aucunIgnore]);
  try {
    const autre = { sujet: 'autre-jeu', generation: 1 };
    await envoyer(page, { type: 'perime', analyse: autre, cause: 'document' });
    await envoyer(page, { type: 'ignores', analyse: autre, constats: analyseCorrections.constats.map((constat) => constat.id) });
    await envoyer(page, { ...lu('complete', []), analyse: autre });
    assert.equal(await page.locator('.bouton-panneau .pastille-compte').textContent(), '24');
    assert.doesNotMatch(await texteDuPanneau(page), /Le composant a changé depuis l’analyse/);

    await envoyer(page, { type: 'perime', analyse: IDENTITE, cause: 'document' });
    assert.match(await texteDuPanneau(page), /Le composant a changé depuis l’analyse\./);
    await envoyer(page, { ...lu('complete', []), analyse: { ...IDENTITE, generation: 2 } });
    assert.match(await texteDuPanneau(page), /Aucun constat sur les 11 variants d’Alert\./);
  } finally { await terminer(page); }
});

test('un panneau périmé garde ses constats, dit pourquoi et ne relance rien', async () => {
  const page = await ouvrirLePanneau([analyseCorrections, aucunIgnore]);
  try {
    await envoyer(page, { type: 'perime', analyse: IDENTITE, cause: 'selection' });
    const texte = await texteDuPanneau(page);
    assert.match(texte, /Le composant a changé depuis l’analyse\./);
    assert.match(texte, /Cliquez Actualiser pour relire\./);
    assert.match(texte, /Les constats datent d’avant le changement\./);
    assert.equal(await page.locator('.bouton-panneau .pastille-compte').textContent(), '24');
    assert.equal(await page.locator('.sommaire-elements').count(), 0);
    assert.equal(await page.locator('.section-element').count(), 0);
    assert.equal(await page.locator('.corrections-pied').count(), 0);
    assert.equal((await demandes(page, 'analyser')).length, 0, 'rien ne se relance tout seul');
    assert.equal(await page.getByRole('button', { name: 'Actualiser' }).isEnabled(), true);
    await page.getByRole('button', { name: 'Actualiser' }).click();
    assert.equal((await demandes(page, 'analyser')).length, 1);
  } finally { await terminer(page); }
});

test('deux libraries sans choix demandent la Configuration ; un fichier hors UCM remplace le sommaire par la déclaration', async () => {
  const page = await ouvrirLePanneau();
  try {
    assert.equal((await demandes(page, 'lire-configuration')).length, 1, 'le panneau demande la library à son ouverture');
    await envoyer(page, { type: 'configuration', library: null, candidates: [{ cle: 'a', nom: 'Intencial Tokens', liaisons: 24 }, { cle: 'b', nom: 'Autre', liaisons: 3 }], niveau: 'AA' });
    assert.match(await texteDuPanneau(page), /Choisissez la library de tokens\./);
    assert.match(await texteDuPanneau(page), /Deux libraries activées portent des variables\. Aucune n’est encore liée à ce composant\./);
    assert.equal(await page.getByRole('button', { name: 'Analyser' }).isDisabled(), true);
    await envoyer(page, { type: 'configuration', library: { cle: 'a', nom: 'Intencial Tokens', liaisons: 24 }, candidates: [{ cle: 'a', nom: 'Intencial Tokens', liaisons: 24 }], niveau: 'AA' });
    assert.doesNotMatch(await texteDuPanneau(page), /Choisissez la library/);
    assert.equal(await page.getByRole('button', { name: 'Analyser' }).isEnabled(), true);

    await envoyer(page, { type: 'declaration', architecture: 'absente' });
    assert.match(await texteDuPanneau(page), /Ce fichier n’est pas déclaré UCM\./);
    assert.equal(await page.getByRole('button', { name: 'Déclarer dans la Configuration' }).isVisible(), true);
    assert.equal(await page.locator('.sommaire-elements').count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Analyser' }).isHidden(), true);
  } finally { await terminer(page); }
});

test('Préparer les tokens suit sansTokens : un constat d’état sans correction ne l’offre pas, un composant sans token l’offre avec sa carte', async () => {
  const page = await ouvrirLePanneau();
  try {
    const constatDEtat = { id: 'C16:v1', code: 'C16', type: 'corriger', famille: 'liaisons', variants: [], layers: [], faits: {} };
    await envoyer(page, lu('complete', [constatDEtat]));
    assert.equal(await page.locator('.prep-ouvrir').isHidden(), true);
    assert.doesNotMatch(await texteDuPanneau(page), /n’a pas de tokens/);

    await envoyer(page, { ...lu('complete', []), sansTokens: true });
    assert.equal(await page.locator('.prep-ouvrir').isVisible(), true);
    assert.match(await texteDuPanneau(page), /Alert n’a pas de tokens\. Ses couleurs sont en dur\./);
    assert.equal(await page.locator('.puce-element[data-element="tokens"] .nombre').textContent(), '1');

    await envoyer(page, { type: 'perime', analyse: IDENTITE, cause: 'document' });
    assert.equal(await page.locator('.prep-ouvrir').isHidden(), true);
    assert.doesNotMatch(await texteDuPanneau(page), /n’a pas de tokens/);
  } finally { await terminer(page); }
});

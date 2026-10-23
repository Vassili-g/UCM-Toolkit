/**
 * Les interactions du domaine `preparation` dans le fichier des tokens : l'alerte des variables à créer, la feuille qui les liste, la
 * création et son résultat ; puis, dans le fichier des composants, le retour de la préparation (`lier-preparation`) et la carte des
 * liaisons préparées. Écrites au lot U8, lancées par `test:ui`. Les autres écrans du mode Composant se rejouent par la galerie.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { attendreLesDemandes, avecReleve, envoyer, exiger, fermer, lancerLeNavigateur, ouvrir, ouvrirComposant } from './aide.mjs';

lancerLeNavigateur();
const { bilans, messages } = exiger('../../galerie/nomenclature/donnees.cjs');
const { releveIntencial } = exiger('../../galerie/etats/nomenclature.cjs');
const { rangeeAvec, variablesRangee, tagLie, analyseTag, analyseLiaisons, liaisonsPreparees, identiteLiaisons, messageDuPlan, configuration } = exiger('../../galerie/etats/preparation.cjs');

const aCreer = (rang) => (rang === 15 ? 'existe-identique' : 'a-creer');
const preparations = (etat = aCreer, extras = {}) => ({ type: 'preparations', preparations: [{ ...rangeeAvec(etat), ...extras }] });
const creees = (resume = {}) => ({
  type: 'variables-creees', preparation: 'prep-tag', creees: 15, gardees: 1, sautees: 0, remplacees: 0, divergentes: [], echecs: [], journal: true, refus: null, collections: [], ...resume,
});

/** Le fichier des tokens ouvert sur le bilan de Nomenclature, avec la préparation rangée sur ce poste. */
async function ouvrirLeFichierDesTokens() {
  const page = await ouvrir();
  await avecReleve(page, { ...releveIntencial(), fichier: 'Intencial Tokens' });
  await envoyer(page, messages.initial(true));
  await envoyer(page, messages.bilan(1, bilans.travail));
  await envoyer(page, preparations());
  return page;
}

test('le fichier des tokens lit les préparations rangées dès l’ouverture du plugin', async () => {
  const page = await ouvrir();
  try {
    await attendreLesDemandes(page, 'lire-preparations');
  } finally { await fermer(page); }
});

test('une préparation à créer annonce ses variables ; Voir ouvre la feuille, trois lignes d’abord', async () => {
  const page = await ouvrirLeFichierDesTokens();
  try {
    const alerte = page.locator('.alerte', { hasText: '16 variables à créer pour Tag.' });
    assert.equal(await alerte.count(), 1);
    await page.locator('[data-action="preparation-voir"]').click();
    assert.equal(await page.locator('.feuille-titre').textContent(), 'Variables à créer pour Tag');
    assert.match(await page.locator('.feuille-entete .meta').textContent(), /^Préparées dans le fichier des composants, aujourd’hui à 14:20\.$/);
    assert.equal(await page.locator('.feuille-contenu > p').first().textContent(), '15 variables à créer. 1 existe déjà.');
    const lignes = page.locator('.fiche-liste .diff');
    assert.equal(await lignes.count(), 4);
    assert.equal(await lignes.nth(3).locator('.chemin-apres').textContent(), 'existe déjà, vise theme/info/vivid/surface/default gardée');
    await page.getByRole('button', { name: 'Afficher les 12 autres' }).click();
    assert.equal(await page.locator('.fiche-liste .diff').count(), 16);
    assert.equal(await page.locator('[data-action="preparation-creer"]').textContent(), 'Créer 15 variables');
  } finally { await fermer(page); }
});

test('Créer envoie la préparation au sandbox et reste inactif jusqu’à la réponse', async () => {
  const page = await ouvrirLeFichierDesTokens();
  try {
    await page.locator('[data-action="preparation-voir"]').click();
    await page.locator('[data-action="preparation-creer"]').click();
    const [demande] = await attendreLesDemandes(page, 'creer-variables');
    assert.deepEqual(demande, { type: 'creer-variables', preparation: 'prep-tag' });
    assert.equal(await page.locator('[data-action="preparation-creer"]').isDisabled(), true);
  } finally { await fermer(page); }
});

test('une création réussie ferme la feuille, retire l’alerte et dit où publier', async () => {
  const page = await ouvrirLeFichierDesTokens();
  try {
    await page.locator('[data-action="preparation-voir"]').click();
    await page.locator('[data-action="preparation-creer"]').click();
    await envoyer(page, creees());
    await envoyer(page, preparations((rang) => (rang === 15 ? 'existe-identique' : 'creee')));
    assert.equal(await page.locator('.feuille-voile').count(), 0);
    assert.equal(await page.locator('[data-action="preparation-voir"]').count(), 0);
    const resultat = page.locator('.resultat');
    assert.equal(await resultat.locator('.pile > span').first().textContent(), '✓ 15 variables créées pour Tag');
    assert.match(await resultat.textContent(), /Publiez Intencial Tokens : Assets, Libraries, puis Publish\./);
    assert.match(await resultat.textContent(), /Configuration › Historique annule la création\./);
  } finally { await fermer(page); }
});

test('un refus de la création garde la feuille ouverte et en dit la raison', async () => {
  const page = await ouvrirLeFichierDesTokens();
  try {
    await page.locator('[data-action="preparation-voir"]').click();
    await page.locator('[data-action="preparation-creer"]').click();
    await envoyer(page, creees({ creees: 0, gardees: 0, refus: 'sans-destination' }));
    assert.match(await page.locator('.feuille-contenu .alerte').textContent(), /Ce fichier n’a pas de collection components où créer les variables\./);
    assert.equal(await page.locator('[data-action="preparation-creer"]').isDisabled(), false);
    assert.equal(await page.locator('.resultat').count(), 0);
  } finally { await fermer(page); }
});

test('une destination ambiguë propose les collections, et le choix part avec la demande', async () => {
  const page = await ouvrirLeFichierDesTokens();
  try {
    await page.locator('[data-action="preparation-voir"]').click();
    await page.locator('[data-action="preparation-creer"]').click();
    await envoyer(page, creees({ creees: 0, gardees: 0, refus: 'destination-ambigue', collections: [{ id: 'c1', nom: 'components' }, { id: 'c2', nom: 'components 2' }] }));
    await page.getByLabel('Collection components').selectOption('c2');
    await page.locator('[data-action="preparation-creer"]').click();
    const demandes = await attendreLesDemandes(page, 'creer-variables', 2);
    assert.deepEqual(demandes[1], { type: 'creer-variables', preparation: 'prep-tag', collection: 'c2' });
  } finally { await fermer(page); }
});

test('une variable existante qui vise autre chose attend Garder ou Remplacer, les échecs disent pourquoi', async () => {
  const page = await ouvrirLeFichierDesTokens();
  try {
    await page.locator('[data-action="preparation-voir"]').click();
    await page.locator('[data-action="preparation-creer"]').click();
    const divergente = variablesRangee[2][0];
    await envoyer(page, creees({ creees: 12, sautees: 3, divergentes: [{ nom: divergente, vise: variablesRangee[2][1] }], echecs: [{ nom: variablesRangee[4][0], motif: 'cible-introuvable' }, { nom: variablesRangee[5][0], motif: 'erreur' }] }));
    await envoyer(page, preparations((rang) => (rang === 15 ? 'existe-identique' : rang === 2 ? 'existe-divergente' : rang === 4 || rang === 5 ? 'echec' : 'creee')));
    assert.match(await page.locator('.feuille-contenu .alerte').textContent(), /3 variables restent à régler\./);
    assert.equal(await page.getByText('La variable visée n’existe pas dans la collection choisie.').count(), 1);
    assert.equal(await page.getByText('Figma n’a pas pu créer cette variable.').count(), 1);
    await page.locator(`input[name="existante:${divergente}"][value="remplacer"]`).check();
    await page.locator('[data-action="preparation-creer"]').click();
    const demandes = await attendreLesDemandes(page, 'creer-variables', 2);
    assert.deepEqual(demandes[1], { type: 'creer-variables', preparation: 'prep-tag', reponses: { [`existante:${divergente}`]: 'remplacer' } });
  } finally { await fermer(page); }
});

test('Abandonner la préparation demande son retrait au sandbox, et la feuille se ferme quand il l’a rangée', async () => {
  const page = await ouvrirLeFichierDesTokens();
  try {
    await page.locator('[data-action="preparation-voir"]').click();
    await page.locator('.prep-abandonner').click();
    const [demande] = await attendreLesDemandes(page, 'abandonner-preparation');
    assert.deepEqual(demande, { type: 'abandonner-preparation', preparation: 'prep-tag' });
    await envoyer(page, { type: 'preparations', preparations: [] });
    assert.equal(await page.locator('.feuille-voile').count(), 0);
    assert.equal(await page.locator('[data-action="preparation-voir"]').count(), 0);
  } finally { await fermer(page); }
});

/** Les demandes d'un type que l'interface a envoyées ; l'envoi se relève un instant après le geste. */
const demandes = async (page, type) => {
  await page.waitForTimeout(30);
  return page.evaluate((cherche) => window.demandes.filter((demande) => demande.type === cherche), type);
};

/** Le mode Composant sur Tag, fenêtre assez large pour le panneau des constats. */
async function ouvrirTag() {
  const page = await ouvrirComposant(tagLie, { image: false });
  await page.setViewportSize({ width: 1040, height: 760 });
  return page;
}
const rangeeDeTag = { type: 'preparations', preparations: [rangeeAvec((rang) => (rang === 15 ? 'existe-identique' : 'a-creer'))] };
const rangeeDUnAutreJeu = { type: 'preparations', preparations: [{ ...rangeeAvec(aCreer), source: { fichier: 'Autre', cleDuFichier: null, jeu: { cle: 'autre:jeu', nom: 'Autre' } } }] };

test('lier-preparation part une fois par analyse, quand une préparation du même jeu est rangée', async () => {
  const page = await ouvrirTag();
  try {
    await envoyer(page, rangeeDeTag);
    await envoyer(page, analyseTag);
    const premieres = await demandes(page, 'lier-preparation');
    assert.deepEqual(premieres, [{ type: 'lier-preparation', analyse: analyseTag.analyse, preparation: 'prep-tag' }]);
    await envoyer(page, rangeeDeTag);
    await envoyer(page, analyseTag);
    assert.equal((await demandes(page, 'lier-preparation')).length, 1);
    await envoyer(page, { type: 'analyse-commencee', analyse: identiteLiaisons });
    await envoyer(page, analyseLiaisons);
    const toutes = await demandes(page, 'lier-preparation');
    assert.deepEqual(toutes.map((demande) => demande.analyse.generation), [1, 2]);
  } finally { await fermer(page); }
});

test('lier-preparation ne part pas sans préparation du même jeu, ni avant que l’analyse soit complète', async () => {
  const page = await ouvrirTag();
  try {
    await envoyer(page, rangeeDUnAutreJeu);
    await envoyer(page, analyseTag);
    assert.deepEqual(await demandes(page, 'lier-preparation'), []);
    await envoyer(page, { type: 'analyse-commencee', analyse: identiteLiaisons });
    await envoyer(page, rangeeDeTag);
    assert.deepEqual(await demandes(page, 'lier-preparation'), []);
    await envoyer(page, { ...analyseLiaisons, statut: 'partielle' });
    assert.deepEqual(await demandes(page, 'lier-preparation'), []);
  } finally { await fermer(page); }
});

test('les liaisons préparées d’une autre analyse sont ignorées, celles de l’analyse retenue ouvrent Corrections', async () => {
  const page = await ouvrirTag();
  try {
    await envoyer(page, rangeeDeTag);
    await envoyer(page, analyseLiaisons);
    await page.getByRole('button', { name: 'Constats' }).click();
    assert.equal(await page.locator('.onglets').count(), 0);
    await envoyer(page, { ...liaisonsPreparees, analyse: { ...identiteLiaisons, generation: 1 } });
    assert.equal(await page.locator('.onglets').count(), 0);
    await envoyer(page, liaisonsPreparees);
    assert.equal(await page.locator('.onglets').count(), 1);
    assert.equal(await page.locator('#onglet-corrections .compte').textContent(), '1');
  } finally { await fermer(page); }
});

test('une liaison en attente n’a pas de case et dit qu’elle n’est pas publiée ; les autres se cochent et s’appliquent', async () => {
  const page = await ouvrirTag();
  try {
    await envoyer(page, rangeeDeTag);
    await envoyer(page, analyseLiaisons);
    await envoyer(page, liaisonsPreparees);
    await page.getByRole('button', { name: 'Constats' }).click();
    const carte = page.locator('#panneau-corrections .liste .bloc').first();
    assert.equal(await carte.locator('.diff input.case').count(), 2);
    const enAttente = carte.locator('.diff.reste');
    assert.equal(await enAttente.count(), 1);
    assert.equal(await enAttente.locator('input').count(), 0);
    assert.match(await enAttente.locator('.chemin').innerText(), /^Layer container\s+Severity=warning, Style=outline$/);
    assert.match(await enAttente.locator('.chemin-apres').innerText(), /components\/tag\/color\/warning\/outline\/border\s+Créée, pas encore publiée$/);
    assert.match(await carte.locator('.alerte').innerText(), /1 variable créée n’est pas encore dans la library publiée\./);
    assert.match(await page.locator('.corrections-pied').innerText(), /^2 liaisons cochées/);
    await page.getByRole('button', { name: 'Appliquer' }).click();
    const [envoyee] = await demandes(page, 'appliquer-corrections');
    assert.deepEqual([...envoyee.ids].sort(), liaisonsPreparees.corrections.map((correction) => correction.id).sort());
  } finally { await fermer(page); }
});

test('une nouvelle analyse retire la carte des liaisons préparées', async () => {
  const page = await ouvrirTag();
  try {
    await envoyer(page, rangeeDeTag);
    await envoyer(page, analyseLiaisons);
    await envoyer(page, liaisonsPreparees);
    await page.getByRole('button', { name: 'Constats' }).click();
    assert.equal(await page.locator('#panneau-corrections .liste .bloc').count(), 1);
    await envoyer(page, { type: 'analyse-commencee', analyse: { ...identiteLiaisons, generation: 3 } });
    assert.equal(await page.locator('#panneau-corrections .liste .bloc').count(), 0);
  } finally { await fermer(page); }
});

test('lier-preparation ne part pas tant qu’aucune variable de la préparation n’a vu de création', async () => {
  const page = await ouvrirTag();
  try {
    await envoyer(page, { type: 'preparations', preparations: [rangeeAvec(() => 'a-creer')] });
    await envoyer(page, analyseTag);
    assert.deepEqual(await demandes(page, 'lier-preparation'), []);
  } finally { await fermer(page); }
});

test('la carte des liaisons nomme la library de la Configuration pour la publication', async () => {
  const page = await ouvrirTag();
  try {
    await envoyer(page, configuration);
    await envoyer(page, rangeeDeTag);
    await envoyer(page, analyseLiaisons);
    await envoyer(page, liaisonsPreparees);
    await page.getByRole('button', { name: 'Constats' }).click();
    assert.match(await page.locator('#panneau-corrections .alerte').innerText(), /Publiez Intencial Tokens, puis cliquez Actualiser\./);
  } finally { await fermer(page); }
});

const ouvrirLaPreparation = async () => {
  const page = await ouvrirTag();
  await envoyer(page, analyseTag);
  await page.locator('.bouton-panneau').click();
  await page.locator('[data-focus="directes"]').click();
  await page.locator('#onglet-a-faire').click();
  await page.locator('.prep-ouvrir').click();
  return page;
};

test('la feuille de préparation montre les cibles du plan, une ligne par taille et toutes les variables, sans donnée de maquette', async () => {
  const page = await ouvrirLaPreparation();
  try {
    await envoyer(page, messageDuPlan);
    const surface = page.locator('[data-preparation-question="dossier:soft"] .prep-option', { has: page.locator('input[value="surface"]') });
    assert.equal(await surface.locator('.prep-cible').count(), 3);
    assert.equal(await surface.locator('.prep-cible .cran').first().textContent(), 'cran 100, Dark 300');
    assert.equal(await page.locator('[data-preparation-question="nom:Frame 12"] .prep-cible').count(), 0);
    assert.equal(await page.locator('.fiche-bloc:has(> .fiche-liste) .diff').count(), 18);
    assert.match(await page.locator('.fiche-bloc:has(> .fiche-liste)').last().locator('.fiche-bloc-tete').innerText(), /16 variables\s+10 savent déjà ce qu’elles visent/);
    assert.match(await page.locator('.fiche-bloc:has(> .fiche-liste)').first().locator('.diff').last().innerText(), /aucun token ne vaut 13 px : une question/);
  } finally { await fermer(page); }
});

test('sans aperçu dans le plan, une réponse ne montre aucune cible', async () => {
  const page = await ouvrirLaPreparation();
  try {
    await envoyer(page, { ...messageDuPlan, apercus: {} });
    assert.equal(await page.locator('.prep-cible').count(), 0);
  } finally { await fermer(page); }
});

test('la zone de collage d’une préparation reçue est vide et ne porte qu’un placeholder', async () => {
  const page = await ouvrirLaPreparation();
  try {
    await envoyer(page, { type: 'preparations', preparations: [] });
    await page.locator('.prep-coller').click();
    const zone = page.locator('.prep-mode-colle textarea');
    assert.equal(await zone.inputValue(), '');
    assert.match(await zone.getAttribute('placeholder'), /^\{ "format": "ucm-preparation"/);
  } finally { await fermer(page); }
});

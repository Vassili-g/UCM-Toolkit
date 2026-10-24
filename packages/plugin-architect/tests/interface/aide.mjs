/**
 * Ce que les tests d'interface se partagent : la page compilée, l'envoi des
 * messages du sandbox et la fermeture qui vérifie les demandes envoyées. Les
 * relevés viennent des fixtures, compilées par la galerie (`npm run galerie`
 * précède ces tests dans `test:ui`).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { after, before } from 'node:test';
import { chromium } from 'playwright';

export const exiger = createRequire(import.meta.url);
export const fixtures = exiger('../../dist/galerie-fixtures.cjs');
export const { imagePng } = exiger('../../galerie/image.cjs');
export const html = readFileSync(new URL('../../dist/ui.html', import.meta.url), 'utf8');

let navigateur;
/** À appeler une fois par fichier de test : ouvre Chromium avant les tests et le ferme après. */
export function lancerLeNavigateur() {
  before(async () => { navigateur = await chromium.launch(); });
  after(async () => { await navigateur?.close(); });
}

/** Relève chaque demande que l'interface envoie au sandbox ; posé avant le bundle. */
const RELEVE = `<script>
  // La page de test n'est pas un contexte sécurisé : le presse-papiers est simulé.
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (texte) => { window.copie = texte; }, readText: async () => window.copie } });
  window.demandes = [];
  window.addEventListener('message', (event) => {
    const message = event.data && event.data.pluginMessage;
    if (message && message.type) window.demandes.push(message);
  });
</script>`;

/**
 * Dans une page sans iframe, `parent` est la fenêtre elle-même : le relevé voit
 * aussi les messages que le test joue au nom du sandbox.
 */
const MESSAGES_DU_SANDBOX = new Set(['preferences', 'preferences-rangees', 'progression', 'releve', 'lecture-echouee', 'annulation', 'selection', 'disposition', 'composant', 'apercu-du-composant', 'declaration', 'non-construit',
  // L'analyse, les corrections, les questions, les ignorés et la configuration.
  'analyse-commencee', 'analyse-en-cours', 'analyse', 'perime', 'occupe', 'corrections-appliquees', 'modele-propose', 'question-repondue', 'ignores', 'configuration', 'structure-annulee',
  // La préparation des tokens et la création de ses variables.
  'plan-de-preparation', 'preparations', 'preparation-texte', 'texte-refuse', 'variables-creees', 'liaisons-preparees']);

/** Les demandes qu'un explorateur en lecture seule peut envoyer. */
const DEMANDES_PERMISES = new Set(['lire-preferences', 'ranger-preferences', 'lire-releve', 'lire-structure', 'annuler', 'lire-composant', 'changer-disposition', 'resize',
  // L'analyse, les corrections, les questions, les ignorés et la configuration.
  'analyser', 'annuler-analyse', 'appliquer-corrections', 'selectionner', 'servir-de-modele', 'repondre', 'annuler-reponse', 'ignorer', 'ne-plus-ignorer', 'lire-configuration', 'ranger-library', 'ranger-niveau', 'annuler-structure',
  // La préparation des tokens et la création de ses variables.
  'preparer', 'lire-preparations', 'lire-texte', 'creer-variables', 'abandonner-preparation', 'copier-preparation', 'lier-preparation']);

export async function ouvrir({ largeur = 1360, hauteur = 800, classe = '', presse = true } = {}) {
  const contexte = await navigateur.newContext({ viewport: { width: largeur, height: hauteur }, permissions: presse ? ['clipboard-read', 'clipboard-write'] : [] });
  const page = await contexte.newPage();
  page.setDefaultTimeout(5000);
  const erreurs = [];
  page.on('pageerror', (erreur) => erreurs.push(erreur.message));
  await page.setContent(html.replace('<head>', () => `<head>${RELEVE}`).replace('<html lang="fr" dir="ltr">', () => `<html lang="fr" dir="ltr" class="${classe}">`));
  page.erreurs = erreurs;
  return page;
}

/**
 * Joue un message du sandbox, puis attend que l'interface ait fini : deux messages témoins, postés l'un après l'autre, passent derrière
 * la réponse et derrière ce que l'interface a posté en réponse ; un dernier cadre d'animation laisse le rendu se faire.
 */
export async function envoyer(page, message) {
  await page.evaluate(async (m) => {
    const temoin = () => new Promise((resolve) => {
      const id = `temoin-${Math.random()}`;
      const ecouter = (evenement) => {
        if (evenement.data !== id) return;
        window.removeEventListener('message', ecouter);
        resolve();
      };
      window.addEventListener('message', ecouter);
      window.postMessage(id, '*');
    });
    window.postMessage({ pluginMessage: m }, '*');
    await temoin();
    await temoin();
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }, message);
  await page.waitForTimeout(30);
}

/** Attend que l'interface ait envoyé `nombre` demandes de ce type, puis les rend. */
export async function attendreLesDemandes(page, type, nombre = 1) {
  await page.waitForFunction(([cherche, attendu]) => window.demandes.filter((demande) => demande.type === cherche).length >= attendu, [type, nombre]);
  return page.evaluate((cherche) => window.demandes.filter((demande) => demande.type === cherche), type);
}

export async function avecReleve(page, releve, demande = 1) {
  await envoyer(page, { type: 'releve', demande, releve });
}

export async function fermer(page) {
  assert.deepEqual(page.erreurs, []);
  const demandes = await page.evaluate(() => window.demandes.map((demande) => demande.type));
  assert.deepEqual(demandes.filter((type) => !DEMANDES_PERMISES.has(type) && !MESSAGES_DU_SANDBOX.has(type)), []);
  await page.context().close();
}

/** La fenêtre du mode Composant que ces tests simulent : la vue garde sa mise en page d'avant, que le lot U1 reprend. */
export const FENETRE_COMPOSANT = { largeur: 364, hauteur: 724 };

export const choisir = (lecture, portee = lecture.sujet.id, ignores = 0) => ({ type: 'selection', sujet: { id: lecture.sujet.id, portee }, ignores, origine: 'figma' });

/** Les lectures de composant demandées ; une demande arrive au relevé un instant après le geste. */
export async function lecturesDemandees(page) {
  await page.waitForTimeout(30);
  return page.evaluate(() => window.demandes.filter((demande) => demande.type === 'lire-composant').map((demande) => [demande.demande, demande.calque]));
}

export const ligne = (page, debut) => page.locator(`[data-focus^='ligne:${debut}']`);

export function apercuDe(lecture, demande) {
  const { largeur, hauteur } = lecture.calques[0].boite;
  return { type: 'apercu-du-composant', demande, sujet: lecture.sujet.id, octets: [...imagePng(largeur, hauteur, fixtures.peinturesDe(lecture))], largeur, hauteur, origine: { x: 0, y: 0 } };
}

/** Ouvre la fenêtre étroite sur un composant sélectionné et lu, image comprise. */
export async function ouvrirComposant(lecture, { image = true } = {}) {
  const page = await ouvrir(FENETRE_COMPOSANT);
  await envoyer(page, { type: 'disposition', disposition: 'etroite' });
  await envoyer(page, choisir(lecture));
  await envoyer(page, { type: 'composant', demande: 2, lecture });
  if (image) {
    await envoyer(page, apercuDe(lecture, 2));
    await page.waitForFunction(() => [...document.images].every((candidate) => candidate.complete && candidate.naturalWidth > 0));
  }
  return page;
}

/**
 * Déplie les sections du panneau des constats que l'ouverture a repliées (plus de cinq points) : leurs cartes ne se dessinent
 * qu'ouvertes. Une section déjà ouverte ne bouge pas.
 */
export async function deplierLesSections(page) {
  const repliees = page.locator('.bande-element[aria-expanded="false"]');
  while (await repliees.count() > 0) await repliees.first().click();
}

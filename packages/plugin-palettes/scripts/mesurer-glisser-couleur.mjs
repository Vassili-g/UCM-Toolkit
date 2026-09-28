#!/usr/bin/env node
/**
 * Mesure ce qu'un glisser dans le sélecteur de couleur coûte, sur la galerie
 * construite, dans Chromium : dans la zone et le curseur de teinte de la
 * couleur de référence, puis dans la zone d'un fond des Réglages communs.
 *
 * Deux chiffres par commande :
 * - le travail d'un `pointermove`, synchrone, et celui de l'image suivante,
 *   médiane et pire de cinquante images, quatre mouvements par image comme
 *   une souris rapide ;
 * - le nombre de rendus de l'aperçu par image, sur un glisser réel de la
 *   souris de Playwright.
 *
 * Aucun test ne porte ces seuils : les chiffres entrent dans le plan et dans
 * le message du commit.
 *
 *   npm run galerie --workspace ucm-palettes-plugin
 *   node packages/plugin-palettes/scripts/mesurer-glisser-couleur.mjs
 */
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const MOUVEMENTS_PAR_IMAGE = 4;
const IMAGES = 50;
const mediane = (durees) => [...durees].sort((a, b) => a - b)[Math.floor(durees.length / 2)];
const ms = (valeur) => `${valeur.toFixed(1)} ms`;

const galerie = (etat) => `file:///${fileURLToPath(new URL(`../dist/galerie/clair/${etat}.html`, import.meta.url)).replace(/\\/g, '/')}`;

/**
 * Glisse dans `commande` par événements synthétiques : chaque image reçoit
 * quatre `pointermove`. Rend le travail synchrone d'un mouvement, et celui
 * de l'image qui suit, entre un repère posé avant les mouvements et un repère
 * posé après.
 */
async function travail(onglet, commande, temoin) {
  return onglet.evaluate(async ({ commande, temoin, images, parImage }) => {
    const cible = document.querySelector(commande);
    const cadre = cible.getBoundingClientRect();
    const options = (rang) => ({
      bubbles: true,
      pointerId: 1,
      isPrimary: true,
      button: 0,
      clientX: cadre.left + cadre.width * (0.2 + 0.6 * ((rang % 40) / 40)),
      clientY: cadre.top + cadre.height * (0.3 + 0.4 * ((rang % 17) / 17)),
    });
    const image = () => new Promise((resolve) => requestAnimationFrame(() => resolve(performance.now())));
    // Chaque rendu de l'aperçu réécrit la ligne de la référence : un enregistrement par rendu.
    const observe = document.querySelector(temoin);
    let rendus = 0;
    // Un rendu dans une image arrive à l'observateur par sa file ; un rendu dans un mouvement, par takeRecords.
    const observateur = new MutationObserver(() => { rendus += 1; });
    observateur.observe(observe, { childList: true, characterData: true, subtree: true });
    cible.setPointerCapture = () => {};
    cible.hasPointerCapture = () => true;
    cible.dispatchEvent(new PointerEvent('pointerdown', options(0)));
    await image();
    observateur.takeRecords();
    const mouvements = [];
    const imagesSuivantes = [];
    rendus = 0;
    for (let rang = 1; rang <= images; rang += 1) {
      let repere = 0;
      requestAnimationFrame(() => { repere = performance.now(); });
      for (let pas = 0; pas < parImage; pas += 1) {
        const debut = performance.now();
        cible.dispatchEvent(new PointerEvent('pointermove', options(rang * parImage + pas)));
        mouvements.push(performance.now() - debut);
        if (observateur.takeRecords().length > 0) rendus += 1;
      }
      const fin = await image();
      imagesSuivantes.push(fin - repere);
      if (observateur.takeRecords().length > 0) rendus += 1;
    }
    cible.dispatchEvent(new PointerEvent('pointerup', options(images * parImage)));
    observateur.disconnect();
    return { mouvements, imagesSuivantes, rendus };
  }, { commande, temoin, images: IMAGES, parImage: MOUVEMENTS_PAR_IMAGE });
}

/** Un glisser réel de la souris : rendus de l'aperçu et images peintes pendant le geste. */
async function glisserReel(onglet, commande, temoin) {
  const boite = await onglet.locator(commande).boundingBox();
  await onglet.evaluate((temoin) => {
    window.compte = { rendus: 0, images: 0, actif: true };
    new MutationObserver(() => { window.compte.rendus += 1; }).observe(document.querySelector(temoin), { childList: true, characterData: true, subtree: true });
    const boucle = () => { if (!window.compte.actif) return; window.compte.images += 1; requestAnimationFrame(boucle); };
    requestAnimationFrame(boucle);
  }, temoin);
  await onglet.mouse.move(boite.x + boite.width * 0.2, boite.y + boite.height * 0.3);
  await onglet.mouse.down();
  await onglet.mouse.move(boite.x + boite.width * 0.8, boite.y + boite.height * 0.7, { steps: 200 });
  const compte = await onglet.evaluate(() => { window.compte.actif = false; return window.compte; });
  await onglet.mouse.up();
  return compte;
}

/** Les cartes repliées à l'ouverture, qui ne se rendent que dépliées : Dérive, Garanties, Interface de test. */
const DEPLIER = ['Dérive de teinte', 'Garanties de contraste', 'Interface de test'].map((titre) => `[aria-label="${titre}"] .carte-bascule`);

const navigateur = await chromium.launch();
const CAS = [
  { nom: 'Référence, zone', etat: 'reference-dans-le-selecteur', gestes: [], commande: '.selecteur-zone', temoin: '.repere-de-la-reference' },
  { nom: 'Référence, teinte', etat: 'reference-dans-le-selecteur', gestes: [], commande: '.selecteur-teinte', temoin: '.repere-de-la-reference' },
  { nom: 'Référence, zone, cartes dépliées', etat: 'palette-deux-intensites', gestes: [...DEPLIER, '[aria-label="Configuration de la palette"] .pipette'], commande: '.selecteur-zone', temoin: '.repere-de-la-reference' },
  { nom: 'Fond des Réglages communs, zone', etat: 'configuration-de-la-recette', gestes: ['[aria-label="Couleurs de fond"] .pipette'], commande: '.selecteur-zone', temoin: '.reglages-apercu' },
];
for (const { nom, etat, gestes, commande, temoin } of CAS) {
  const onglet = await navigateur.newPage({ viewport: { width: 770, height: 720 } });
  await onglet.goto(galerie(etat));
  await onglet.waitForFunction(() => document.documentElement.dataset.galerie === 'pret');
  for (const geste of gestes) await onglet.locator(geste).first().click();
  const { mouvements, imagesSuivantes, rendus } = await travail(onglet, commande, temoin);
  const reel = await glisserReel(onglet, commande, temoin);
  console.log(`${nom} : pointermove médiane ${ms(mediane(mouvements))}, pire ${ms(Math.max(...mouvements))} ; image suivante médiane ${ms(mediane(imagesSuivantes))}, pire ${ms(Math.max(...imagesSuivantes))} ; ${(rendus / IMAGES).toFixed(1)} rendus par image synthétique ; glisser réel : ${reel.rendus} rendus pour ${reel.images} images.`);
  await onglet.close();
}
await navigateur.close();

#!/usr/bin/env node
/**
 * Mesure ce qu'un glisser dans le sélecteur de couleur coûte, sur la galerie
 * construite, dans Chromium : dans la zone et le curseur de teinte de la
 * couleur de référence, puis dans la zone d'un fond des Réglages communs.
 *
 * Trois mesures :
 * - le travail d'un `pointermove`, synchrone, et celui de l'image suivante,
 *   médiane et pire de cinquante images, quatre mouvements par image comme
 *   une souris rapide ;
 * - l'image entière pendant un glisser réel de la souris de Playwright, style,
 *   mise en page et peinture compris : l'écart entre deux rappels d'image,
 *   le temps du fil principal par image (`Performance.getMetrics`) et les
 *   images longues (`long-animation-frame`), processeur ralenti ×1, ×4 et ×6
 *   (`Emulation.setCPUThrottlingRate`) ;
 * - un glisser avec des pauses de 300 ms, bouton enfoncé : les rendus
 *   complets qu'il déclenche, lus sur la carte Garanties dépliée.
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
const RALENTISSEMENTS = (process.env.RALENTISSEMENTS ?? '1,4,6').split(',').map(Number);
const LARGEUR = 770;
const mediane = (durees) => [...durees].sort((a, b) => a - b)[Math.floor(durees.length / 2)];
const centile = (durees, part) => [...durees].sort((a, b) => a - b)[Math.min(durees.length - 1, Math.floor(durees.length * part))];
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
      buttons: 1,
      clientX: cadre.left + cadre.width * (0.2 + 0.6 * ((rang % 40) / 40)),
      clientY: cadre.top + cadre.height * (0.3 + 0.4 * ((rang % 17) / 17)),
    });
    const image = () => new Promise((resolve) => requestAnimationFrame(() => resolve(performance.now())));
    // Chaque rendu de l'aperçu repeint les pastilles : au moins un enregistrement par rendu.
    const observe = document.querySelector(temoin);
    let rendus = 0;
    // Un rendu dans une image arrive à l'observateur par sa file ; un rendu dans un mouvement, par takeRecords.
    const observateur = new MutationObserver(() => { rendus += 1; });
    observateur.observe(observe, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['style'] });
    const capture = { poser: cible.setPointerCapture, lire: cible.hasPointerCapture };
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
    cible.dispatchEvent(new PointerEvent('pointerup', { ...options(images * parImage), buttons: 0 }));
    observateur.disconnect();
    cible.setPointerCapture = capture.poser;
    cible.hasPointerCapture = capture.lire;
    return { mouvements, imagesSuivantes, rendus };
  }, { commande, temoin, images: IMAGES, parImage: MOUVEMENTS_PAR_IMAGE });
}

/** Le temps du fil principal, en millisecondes, par nature, que Chromium cumule depuis l'ouverture de la page. */
async function tempsDuFil(cdp) {
  const { metrics } = await cdp.send('Performance.getMetrics');
  const lire = (nom) => (metrics.find((metrique) => metrique.name === nom)?.value ?? 0) * 1000;
  return { tache: lire('TaskDuration'), script: lire('ScriptDuration'), style: lire('RecalcStyleDuration'), miseEnPage: lire('LayoutDuration') };
}

/**
 * Un glisser réel de la souris, en deux cents pas ; avec `pauses`, cinq
 * arrêts de 300 ms bouton enfoncé. Rend l'écart entre deux rappels d'image,
 * les images longues, le temps du fil principal par image, et les mutations
 * du témoin : un rendu de l'aperçu, ou un rendu complet selon le témoin.
 */
async function glisserReel(onglet, cdp, commande, temoin, pauses) {
  const boite = await onglet.locator(commande).boundingBox();
  await onglet.evaluate((temoin) => {
    window.mesure = { temps: [], longues: [], rendus: 0, actif: true };
    new MutationObserver(() => { if (window.mesure.actif) window.mesure.rendus += 1; }).observe(document.querySelector(temoin), { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['style'] });
    const boucle = (horodatage) => { if (!window.mesure.actif) return; window.mesure.temps.push(horodatage); requestAnimationFrame(boucle); };
    requestAnimationFrame(boucle);
    try {
      new PerformanceObserver((liste) => { for (const entree of liste.getEntries()) if (window.mesure.actif) window.mesure.longues.push(entree.duration); }).observe({ type: 'long-animation-frame' });
    } catch {
      // Un Chromium sans `long-animation-frame` rend une liste vide.
    }
  }, temoin);
  const depart = { x: boite.x + boite.width * 0.2, y: boite.y + boite.height * 0.3 };
  const arrivee = { x: boite.x + boite.width * 0.8, y: boite.y + boite.height * 0.7 };
  await onglet.mouse.move(depart.x, depart.y);
  await onglet.mouse.down();
  const avant = await tempsDuFil(cdp);
  const troncons = pauses ? 5 : 1;
  for (let troncon = 1; troncon <= troncons; troncon += 1) {
    const part = troncon / troncons;
    await onglet.mouse.move(depart.x + (arrivee.x - depart.x) * part, depart.y + (arrivee.y - depart.y) * part, { steps: 200 / troncons });
    if (pauses) await onglet.waitForTimeout(300);
  }
  const apres = await tempsDuFil(cdp);
  const mesure = await onglet.evaluate(() => { window.mesure.actif = false; return window.mesure; });
  await onglet.mouse.up();
  const ecarts = mesure.temps.slice(1).map((horodatage, rang) => horodatage - mesure.temps[rang]);
  const images = Math.max(1, ecarts.length);
  const parImage = (nature) => (apres[nature] - avant[nature]) / images;
  return {
    ecarts,
    longues: mesure.longues,
    rendus: mesure.rendus,
    fil: { tache: parImage('tache'), script: parImage('script'), style: parImage('style'), miseEnPage: parImage('miseEnPage') },
    parRendu: (apres.tache - avant.tache) / Math.max(1, mesure.rendus),
  };
}

/** Les cartes repliées à l'ouverture, qui ne se rendent que dépliées : Dérive, Garanties, Interface de test. */
const DEPLIER = ['Dérive de teinte', 'Garanties de contraste', 'Interface de test'].map((titre) => `[aria-label="${titre}"] .carte-bascule`);
const PIPETTE = '[aria-label="Configuration de la palette"] .pipette';
const GARANTIES = '[aria-label="Garanties de contraste"] .carte-corps';

async function ouvrir(navigateur, etat, gestes) {
  const onglet = await navigateur.newPage({ viewport: { width: LARGEUR, height: 720 } });
  await onglet.goto(galerie(etat));
  await onglet.waitForFunction(() => document.documentElement.dataset.galerie === 'pret');
  for (const geste of gestes) await onglet.locator(geste).first().click();
  const cdp = await onglet.context().newCDPSession(onglet);
  await cdp.send('Performance.enable');
  return { onglet, cdp };
}

const navigateur = await chromium.launch();

console.log(`Travail d'un mouvement, ${LARGEUR} px, sans ralentissement :`);
const CAS_SYNTHETIQUES = [
  { nom: 'Référence, zone', etat: 'reference-dans-le-selecteur', gestes: [], commande: '.selecteur-zone', temoin: '.nuancier-surface' },
  { nom: 'Référence, teinte', etat: 'reference-dans-le-selecteur', gestes: [], commande: '.selecteur-teinte', temoin: '.nuancier-surface' },
  { nom: 'Référence, zone, cartes dépliées', etat: 'palette-deux-intensites', gestes: [...DEPLIER, PIPETTE], commande: '.selecteur-zone', temoin: '.nuancier-surface' },
  { nom: 'Fond des Réglages communs, zone', etat: 'configuration-de-la-recette', gestes: ['[aria-label="Couleurs de fond"] .pipette'], commande: '.selecteur-zone', temoin: '.reglages-apercu' },
];
for (const { nom, etat, gestes, commande, temoin } of CAS_SYNTHETIQUES) {
  const { onglet } = await ouvrir(navigateur, etat, gestes);
  const { mouvements, imagesSuivantes, rendus } = await travail(onglet, commande, temoin);
  console.log(`  ${nom} : pointermove médiane ${ms(mediane(mouvements))}, pire ${ms(Math.max(...mouvements))} ; image suivante médiane ${ms(mediane(imagesSuivantes))}, pire ${ms(Math.max(...imagesSuivantes))} ; ${(rendus / IMAGES).toFixed(1)} rendus par image synthétique.`);
  await onglet.close();
}

console.log(`\nImage entière pendant un glisser réel, ${LARGEUR} px :`);
const CAS_REELS = [
  { nom: 'Référence, cartes repliées', etat: 'reference-dans-le-selecteur', gestes: [], temoin: '.nuancier-surface' },
  { nom: 'Référence, cartes dépliées', etat: 'palette-deux-intensites', gestes: [...DEPLIER, PIPETTE], temoin: '.nuancier-surface' },
  { nom: 'Fond des Réglages communs', etat: 'configuration-de-la-recette', gestes: ['[aria-label="Couleurs de fond"] .pipette'], temoin: '.reglages-apercu' },
];
for (const ralentissement of RALENTISSEMENTS) {
  for (const { nom, etat, gestes, temoin } of CAS_REELS) {
    const { onglet, cdp } = await ouvrir(navigateur, etat, gestes);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: ralentissement });
    const { ecarts, longues, rendus, fil, parRendu } = await glisserReel(onglet, cdp, '.selecteur-zone', temoin, false);
    const lentes = ecarts.filter((ecart) => ecart > 20).length;
    console.log(`  ×${ralentissement} ${nom} : écart entre images médiane ${ms(mediane(ecarts))}, 95e centile ${ms(centile(ecarts, 0.95))}, pire ${ms(Math.max(...ecarts))} ; ${lentes} images sur ${ecarts.length} au-delà de 20 ms ; ${longues.length} images longues${longues.length ? `, pire ${ms(Math.max(...longues))}` : ''} ; fil principal par image ${ms(fil.tache)} (script ${ms(fil.script)}, style ${ms(fil.style)}, mise en page ${ms(fil.miseEnPage)}) ; ${rendus} rendus de l'aperçu, ${ms(parRendu)} de fil principal par rendu.`);
    await onglet.close();
  }
}

console.log(`\nGlisser avec cinq pauses de 300 ms, bouton enfoncé, cartes dépliées, ${LARGEUR} px :`);
for (const ralentissement of [1, 4]) {
  const { onglet, cdp } = await ouvrir(navigateur, 'palette-deux-intensites', [...DEPLIER, PIPETTE]);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: ralentissement });
  const { rendus, ecarts } = await glisserReel(onglet, cdp, '.selecteur-zone', GARANTIES, true);
  console.log(`  ×${ralentissement} : ${rendus} mutations de la carte Garanties avant le relâcher ; pire écart entre images ${ms(Math.max(...ecarts))}.`);
  await onglet.close();
}
await navigateur.close();

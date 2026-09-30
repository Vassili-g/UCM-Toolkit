#!/usr/bin/env node
/**
 * Mesure la poignée de redimensionnement (lot Z9), dans Chromium, sur
 * l'interface construite d'UCM Palettes. Une page hôte joue Figma : elle pose
 * l'interface dans une iframe, et répond au message `resize` en
 * redimensionnant l'iframe après un délai réglable, bornée à 500 × 520 comme
 * `tailleValide`.
 *
 * Gestes, au pointeur réel de Playwright, pour chaque délai (0, 16, 50 ms) :
 * - agrandir vite de 200 px, puis rétrécir vite de 200 px ;
 * - relâcher hors de l'iframe, puis la survoler sans bouton ;
 * - reprendre la poignée ;
 * - un mouvement sans bouton en plein geste, comme Figma en donne
 *   (9400091), puis le survol de la poignée sans bouton.
 *
 * Pour chacun : les messages par image au plus, la taille finale contre la
 * position du relâcher, les messages reçus après le relâcher, l'élément
 * focalisé avant et après. Aucun test ne porte ces chiffres : ils entrent dans
 * le plan.
 *
 *   npm run build:ui --workspace ucm-palettes-plugin
 *   node packages/plugin-palettes/scripts/mesurer-redimensionnement.mjs
 */
import { readFileSync } from 'node:fs';

import { chromium } from 'playwright';

const DELAIS = (process.env.DELAIS ?? '0,16,50').split(',').map(Number);
const GAUCHE = 40;
const HAUT = 40;
const DEPART = { largeur: 600, hauteur: 600 };
const html = readFileSync(new URL('../dist/ui.html', import.meta.url), 'utf8');

const hote = (delai) => `<!doctype html><body style="margin:0;background:#777">
<iframe id="ui" style="position:absolute;left:${GAUCHE}px;top:${HAUT}px;width:${DEPART.largeur}px;height:${DEPART.hauteur}px;border:0"></iframe>
<script>
  window.image = 0;
  (function compter() { window.image += 1; requestAnimationFrame(compter); })();
  window.messages = [];
  const ui = document.getElementById('ui');
  window.addEventListener('message', (event) => {
    const message = event.data && event.data.pluginMessage;
    if (event.source !== ui.contentWindow || !message) return;
    if (message.type === 'lire-langue') ui.contentWindow.postMessage({ pluginMessage: { type: 'langue', langue: 'fr' } }, '*');
    if (message.type !== 'resize') return;
    window.messages.push({ ...message, image: window.image, instant: performance.now() });
    setTimeout(() => {
      ui.style.width = Math.max(500, Math.round(message.largeur)) + 'px';
      ui.style.height = Math.max(520, Math.round(message.hauteur)) + 'px';
    }, ${delai});
  });
</script></body>`;

async function ouvrir(navigateur, delai) {
  const page = await navigateur.newPage({ viewport: { width: 1200, height: 1000 } });
  await page.setContent(hote(delai));
  await page.evaluate((contenu) => { document.getElementById('ui').srcdoc = contenu; }, html);
  await page.waitForFunction(() => document.getElementById('ui').contentDocument?.querySelector('.resize-grip'));
  const cdp = await page.context().newCDPSession(page);
  const souris = (type, x, y, buttons) => cdp.send('Input.dispatchMouseEvent', { type, x, y, buttons, clickCount: 1, button: type === 'mouseMoved' && buttons === 0 ? 'none' : 'left' });
  return { page, souris };
}

const attendre = (page, ms) => page.evaluate((duree) => new Promise((resolve) => setTimeout(resolve, duree)), ms);

async function etat(page) {
  return page.evaluate(() => {
    const ui = document.getElementById('ui');
    const actif = ui.contentDocument.activeElement;
    return {
      largeur: ui.getBoundingClientRect().width,
      hauteur: ui.getBoundingClientRect().height,
      focus: actif ? `${actif.tagName.toLowerCase()}${actif.className ? `.${String(actif.className).split(' ')[0]}` : ''}` : 'aucun',
      messages: window.messages.length,
    };
  });
}

/** Le coin de la poignée, en coordonnées de la page hôte. */
async function poignee(page) {
  return page.evaluate(({ gauche, haut }) => {
    const cadre = document.getElementById('ui').contentDocument.querySelector('.resize-grip').getBoundingClientRect();
    return { x: gauche + cadre.left + cadre.width / 2, y: haut + cadre.top + cadre.height / 2 };
  }, { gauche: GAUCHE, haut: HAUT });
}

function parImage(messages) {
  const compte = new Map();
  for (const { image } of messages) compte.set(image, (compte.get(image) ?? 0) + 1);
  return Math.max(0, ...compte.values());
}

/** Un geste : appui sur la poignée, `mouvements`, relâcher, puis `apres`, des écarts à la poignée survolés sans bouton. */
async function geste(page, souris, mouvements, { apres = [] } = {}) {
  const avant = await etat(page);
  const depart = await poignee(page);
  await souris('mouseMoved', depart.x, depart.y, 0);
  const debut = avant.messages;
  await souris('mousePressed', depart.x, depart.y, 1);
  let dernier = depart;
  for (const [dx, dy, buttons = 1] of mouvements) {
    dernier = { x: depart.x + dx, y: depart.y + dy };
    await souris('mouseMoved', dernier.x, dernier.y, buttons);
  }
  await souris('mouseReleased', dernier.x, dernier.y, 0);
  await attendre(page, 120);
  const auRelacher = await etat(page);
  // Le survol vise la poignée à sa place d'après le geste.
  const coin = await poignee(page);
  for (const [dx, dy] of apres) await souris('mouseMoved', coin.x + dx, coin.y + dy, 0);
  await attendre(page, 120);
  const fin = await etat(page);
  const messages = await page.evaluate(({ a, b }) => window.messages.slice(a, b), { a: debut, b: auRelacher.messages });
  return {
    'msg/image': parImage(messages),
    messages: messages.length,
    'après relâcher': fin.messages - auRelacher.messages,
    taille: `${Math.round(fin.largeur)} × ${Math.round(fin.hauteur)}`,
    visée: `${Math.max(500, Math.ceil(dernier.x - GAUCHE + 4))} × ${Math.max(520, Math.ceil(dernier.y - HAUT + 4))}`,
    focus: `${avant.focus} → ${fin.focus}`,
  };
}

const vite = (dx, dy, pas = 10) => Array.from({ length: pas }, (_, rang) => [(dx * (rang + 1)) / pas, (dy * (rang + 1)) / pas]);

const navigateur = await chromium.launch();
try {
  for (const delai of DELAIS) {
    const lignes = {};
    let { page, souris } = await ouvrir(navigateur, delai);
    lignes['agrandir de 200 px'] = await geste(page, souris, vite(200, 200));
    lignes['rétrécir de 200 px'] = await geste(page, souris, vite(-200, -200));
    // Relâcher hors de l'iframe, puis la survoler sans bouton, poignée comprise.
    lignes['relâcher dehors, survoler'] = await geste(page, souris, vite(300, 0, 5), { apres: [[-100, -100], [0, 0], [-20, -10], [-50, -30]] });
    lignes['reprendre la poignée'] = await geste(page, souris, vite(-60, -60, 5));
    await page.close();
    ({ page, souris } = await ouvrir(navigateur, delai));
    // Figma donne des mouvements sans bouton, bouton enfoncé : Chromium lâche alors la capture.
    lignes['sans bouton en plein geste'] = await geste(page, souris, [[20, 20], [40, 40, 0], [80, 80], [300, 60]], {
      apres: [[0, 0], [-20, -10], [-50, -30], [-100, -100]],
    });
    await page.close();
    console.log(`\nDélai de Figma : ${delai} ms`);
    console.table(lignes);
  }
} finally {
  await navigateur.close();
}

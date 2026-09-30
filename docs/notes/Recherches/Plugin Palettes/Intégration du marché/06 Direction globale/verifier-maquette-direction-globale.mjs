#!/usr/bin/env node
/**
 * Joue chaque scénario de MAQUETTE-DIRECTION-GLOBALE.html dans Chromium, à
 * 600 × 720 et à 500 × 520, dans le thème clair et le thème sombre de Figma,
 * puis imprime le tableau des contrôles. Depuis la racine du dépôt, après le
 * générateur :
 *
 *   node "docs/notes/Recherches/Plugin Palettes/Intégration du marché/06 Direction globale/verifier-maquette-direction-globale.mjs"
 *
 * Contrôles, pour chaque scénario et chaque combinaison : aucune erreur
 * JavaScript ; aucun débordement horizontal du plugin ; aucun élément dont
 * l'`overflow` masque du contenu sans barre de défilement ; le bouton principal
 * du pied, ou de la modale ouverte, entier dans la fenêtre ; chaque objet de
 * rang 1 lisible sans défiler à l'ouverture de l'écran ; l'état final attendu
 * du scénario atteint. Une fois par combinaison : Tab reste dans la revue, et
 * Échap la ferme sans rien écrire. Sortie 1 s'il reste un échec.
 */
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const PAGE = pathToFileURL(path.join(ICI, 'MAQUETTE-DIRECTION-GLOBALE.html')).href;
const TAILLES = [[600, 720], [500, 520]];
const THEMES = ['clair', 'sombre'];

/** Les contrôles de mise en page de l'écran courant, faits dans la page. */
function controlerLaMiseEnPage() {
  const plugin = document.querySelector('#plugin');
  const cadre = plugin.getBoundingClientRect();
  const defauts = [];
  const corps = plugin.querySelector('.p-corps');
  const dialogue = plugin.querySelector('.dialogue-corps');
  for (const zone of [corps, dialogue].filter(Boolean)) zone.scrollTop = 0;
  for (const el of plugin.querySelectorAll('*')) {
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || el.closest('.masque')) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    if (r.right > cadre.right + 1 || r.left < cadre.left - 1) defauts.push(`débordement horizontal : ${el.tagName.toLowerCase()}.${el.className} (${Math.round(r.right - cadre.right)} px)`);
    const masque = ['hidden', 'clip'].includes(style.overflowY) || ['hidden', 'clip'].includes(style.overflowX);
    if (masque && el !== plugin && el !== corps && (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1)) {
      defauts.push(`contenu masqué sans défilement : ${el.tagName.toLowerCase()}.${el.className}`);
    }
  }
  if (corps && corps.scrollWidth > corps.clientWidth + 1) defauts.push('le corps défile en largeur');
  const principal = plugin.querySelector('.dialogue-pied .b.principal') || plugin.querySelector('.p-pied .b.principal');
  if (principal) {
    const r = principal.getBoundingClientRect();
    if (r.top < cadre.top || r.bottom > cadre.bottom + 1 || r.right > cadre.right + 1) defauts.push('bouton principal hors de la fenêtre');
  }
  if (corps && !dialogue) {
    const c = corps.getBoundingClientRect();
    for (const el of corps.querySelectorAll('[data-rang="1"]')) {
      const r = el.getBoundingClientRect();
      if (r.top < c.top - 1 || r.bottom > c.bottom + 1) defauts.push(`rang 1 hors de vue sans défiler : ${el.dataset.objet}`);
    }
  }
  return defauts;
}

async function jouerUnPas(page, pas) {
  if (pas.clic) await page.click(pas.clic, { timeout: 4000 });
  else if (pas.saisir) {
    const [selecteur, valeur] = pas.saisir;
    await page.fill(selecteur, valeur, { timeout: 4000 });
    await page.dispatchEvent(selecteur, 'change');
  } else if (pas.choisir) {
    await page.selectOption(pas.choisir[0], pas.choisir[1], { timeout: 4000 });
  }
}

const navigateur = await chromium.launch();
const page = await navigateur.newPage({ viewport: { width: 1600, height: 1100 } });
const erreursJs = [];
page.on('pageerror', (e) => erreursJs.push(e.message));
await page.goto(PAGE);
const scenarios = await page.evaluate(() => window.__maquette.scenarios);

const resultats = [];
for (const [largeur, hauteur] of TAILLES) {
  for (const theme of THEMES) {
    await page.evaluate(([l, h, t]) => { window.__maquette.taille(l, h); window.__maquette.theme(t); }, [largeur, hauteur, theme]);
    for (const s of scenarios) {
      const avant = erreursJs.length;
      const defauts = [];
      await page.evaluate((id) => window.__maquette.charger(id), s.id);
      defauts.push(...(await page.evaluate(controlerLaMiseEnPage)).map((d) => `à l'ouverture, ${d}`));
      let rang = 0;
      try {
        for (const pas of s.pas) {
          rang += 1;
          await jouerUnPas(page, pas);
          const ecran = await page.evaluate(controlerLaMiseEnPage);
          defauts.push(...ecran.filter((d) => !d.startsWith('rang 1')).map((d) => `après le pas ${rang}, ${d}`));
        }
      } catch (erreur) {
        defauts.push(`pas ${rang} impossible : ${String(erreur.message).split('\n')[0]}`);
      }
      const attendu = await page.evaluate((id) => window.__maquette.attendu(id), s.id);
      if (!attendu.ok) defauts.push(`état attendu non atteint${attendu.erreur ? ` (${attendu.erreur})` : ''} ; journal : ${JSON.stringify(attendu.journal)}`);
      const js = erreursJs.slice(avant).concat(await page.evaluate(() => window.__maquette.erreurs.splice(0)));
      if (js.length) defauts.push(`erreur JavaScript : ${js.join(' | ')}`);
      resultats.push({ combinaison: `${largeur}×${hauteur} ${theme}`, scenario: s.id, defauts });
    }
    // La modale de revue : Tab y reste, Échap la ferme sans rien écrire.
    const defauts = [];
    await page.evaluate(() => window.__maquette.charger('S05'));
    await page.click('[data-geste="relire-retouches"]');
    let sortie = false;
    for (let i = 0; i < 60; i += 1) {
      await page.keyboard.press(i % 7 === 6 ? 'Shift+Tab' : 'Tab');
      if (!(await page.evaluate(() => Boolean(document.activeElement && document.activeElement.closest('.dialogue'))))) sortie = true;
    }
    if (sortie) defauts.push('le focus sort de la revue');
    const journalAvant = await page.evaluate(() => window.__maquette.etat().journal.length);
    await page.keyboard.press('Escape');
    const apres = await page.evaluate(() => ({ ouverte: Boolean(document.querySelector('.dialogue')), journal: window.__maquette.etat().journal.length }));
    if (apres.ouverte) defauts.push('Échap ne ferme pas la revue');
    if (apres.journal !== journalAvant) defauts.push('Échap a écrit');
    resultats.push({ combinaison: `${largeur}×${hauteur} ${theme}`, scenario: 'modale', defauts });
  }
}
await navigateur.close();

const echecs = resultats.filter((r) => r.defauts.length);
console.log('| Combinaison | Scénario | Résultat |');
console.log('|---|---|---|');
for (const r of resultats) console.log(`| ${r.combinaison} | ${r.scenario} | ${r.defauts.length ? `échec : ${r.defauts.join(' ; ')}` : 'réussi'} |`);
console.log(`\n${resultats.length - echecs.length} contrôles réussis sur ${resultats.length}.`);
if (echecs.length) process.exit(1);

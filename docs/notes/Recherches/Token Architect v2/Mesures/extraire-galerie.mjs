// Fige des états sombres des galeries de l'explorateur et de Nomenclature : le DOM rendu, sans script, et la feuille du plugin.
// Les maquettes de Token Architect modifient ces écrans réels au lieu de les redessiner.
// Préalable : `npm run galerie:plugin -- explorateur` et `npm run galerie:plugin -- nomenclature`.
// Lancer depuis la racine du dépôt : `node "docs/notes/Recherches/Token Architect v2/Mesures/extraire-galerie.mjs"`.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const ici = path.dirname(fileURLToPath(import.meta.url));
const paquets = path.resolve(ici, '../../../../../packages');
const maquettes = path.resolve(ici, '../Maquettes');

const GALERIES = [
  {
    nom: 'explorateur-large',
    dossier: path.join(paquets, 'plugin-explorateur/dist/galerie/sombre'),
    largeur: 1200, hauteur: 800,
    etats: ['bascule-tokens', 'arbre-profond', 'survol-chaine', 'dependants', 'comparaison', 'diagnostics', 'vide', 'integrations', 'releves'],
  },
  {
    nom: 'explorateur-etroit',
    dossier: path.join(paquets, 'plugin-explorateur/dist/galerie-etroite/sombre'),
    largeur: 364, hauteur: 724,
    etats: ['composant-complexe', 'composant-valeurs-sans-token', 'composant-variants', 'composant-simple', 'composant-frontiere', 'composant-lecture', 'composant-vide'],
  },
  {
    nom: 'nomenclature',
    dossier: path.join(paquets, 'plugin-nomenclature/dist/galerie/sombre'),
    largeur: 640, hauteur: 720,
    // Hors de Figma, `parent` est la fenêtre elle-même : l'écran reçoit ses propres demandes comme des réponses.
    echos: true,
    etats: ['a-appliquer', 'a-appliquer-depliee', 'a-trancher', 'regles-noms', 'configuration-architecture-ucm', 'configuration-architecture-libre',
      'configuration-historique', 'historique-apres-annulation', 'application', 'confirmation', 'rien-a-faire', 'feuille-terme-ucm', 'sans-variable-locale'],
  },
];

const navigateur = await chromium.launch();
for (const galerie of GALERIES) {
  const page = await navigateur.newPage({ viewport: { width: galerie.largeur, height: galerie.hauteur } });
  if (galerie.echos) {
    await page.addInitScript(() => {
      window.addEventListener('message', (evenement) => {
        const message = evenement.data?.pluginMessage;
        const echo = message && ((message.type === 'termes' && !('sections' in message))
          || (message.type === 'fiche' && !('fiche' in message))
          || (message.type === 'lignes' && !('lignes' in message)));
        if (echo) evenement.stopImmediatePropagation();
      }, true);
    });
  }
  const etats = {};
  let feuille = '';
  for (const etat of galerie.etats) {
    await page.goto(pathToFileURL(path.join(galerie.dossier, `${etat}.html`)).href);
    try {
      await page.waitForFunction(() => document.documentElement.dataset.galerie === 'pret', null, { timeout: 15000 });
    } catch {
      console.log(`${galerie.nom}/${etat} : la galerie n'a pas signalé « pret », état figé tel quel`);
    }
    await page.waitForTimeout(300);
    const lu = await page.evaluate(() => {
      document.querySelectorAll('input').forEach((e) => {
        e.setAttribute('value', e.value);
        if (e.checked) e.setAttribute('checked', '');
      });
      document.querySelectorAll('select').forEach((s) => [...s.options].forEach((o) => { if (o.selected) o.setAttribute('selected', ''); }));
      document.querySelectorAll('script, .largeur-fenetre, .resize-grip, [hidden]').forEach((e) => e.remove());
      return { corps: document.body.innerHTML, feuille: [...document.querySelectorAll('style')].map((s) => s.textContent).join('\n'), classe: document.documentElement.className };
    });
    etats[etat] = { corps: lu.corps, classe: lu.classe, largeur: galerie.largeur, hauteur: galerie.hauteur };
    feuille = lu.feuille;
    console.log(`${galerie.nom}/${etat}`, `${Math.round(lu.corps.length / 1024)} Ko`);
  }
  await page.close();
  const sortie = path.join(maquettes, 'galerie', galerie.nom);
  mkdirSync(sortie, { recursive: true });
  writeFileSync(path.join(sortie, 'plugin.css'), feuille);
  writeFileSync(path.join(sortie, 'etats.js'), `// Généré par Mesures/extraire-galerie.mjs depuis la galerie sombre ; ne pas modifier à la main.\nwindow.GALERIES = window.GALERIES || {};\nwindow.GALERIES[${JSON.stringify(galerie.nom)}] = ${JSON.stringify(etats)};\n`);
}
await navigateur.close();

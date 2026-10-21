// Cherche les défauts de la maquette de Token Architect sans la capturer : erreurs de script, cadres vides,
// barre latérale vide, page qui déborde en largeur, textes qui sortent de leur boîte, jetons et boutons coupés sur deux lignes.
// Lancer depuis la racine du dépôt : `node "docs/notes/Recherches/Token Architect v2/Mesures/auditer-maquette.mjs"`.
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const ici = path.dirname(fileURLToPath(import.meta.url));
const maquette = path.resolve(ici, '../Maquettes/MAQUETTE-TOKEN-ARCHITECT.html');
const navigateur = await chromium.launch();
const page = await navigateur.newPage({ viewport: { width: 1600, height: 900 } });
const erreurs = [];
page.on('pageerror', (e) => erreurs.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') erreurs.push(m.text()); });
await page.goto(pathToFileURL(maquette).href);
await page.waitForTimeout(4000);

const rapport = await page.evaluate(() => {
  const nom = (e) => `${e.tagName.toLowerCase()}${e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 3).join('.') : ''} « ${(e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40)} »`;
  const auditer = (doc, lieu) => {
    const defauts = [];
    if (!doc || !doc.body || doc.body.children.length === 0) return [`${lieu} : vide`];
    if (doc.documentElement.scrollWidth > doc.documentElement.clientWidth + 1) defauts.push(`${lieu} : déborde en largeur de ${doc.documentElement.scrollWidth - doc.documentElement.clientWidth} px`);
    for (const e of doc.querySelectorAll('body *')) {
      const r = e.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const s = doc.defaultView.getComputedStyle(e);
      if (s.overflowX === 'visible' && e.scrollWidth > e.clientWidth + 2 && e.clientWidth > 0 && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) defauts.push(`${lieu} : texte qui sort de ${nom(e)}`);
      if (e.matches('.jeton, .btn, .sev, .choix, .onglet') && r.height > 2 * parseFloat(s.lineHeight || '16') + 8) defauts.push(`${lieu} : coupé sur deux lignes ${nom(e)}`);
    }
    return defauts;
  };
  return [...document.querySelectorAll('.cadre')].map((hote) => {
    const f = hote.querySelector('iframe');
    const doc = f?.contentDocument;
    const defauts = auditer(doc, hote.id);
    const aside = doc?.querySelector('.arch-laterale');
    if (aside) {
      const interne = aside.querySelector('iframe')?.contentDocument;
      defauts.push(...auditer(interne, `${hote.id} › barre latérale`));
      if (interne && !interne.querySelector('.onglets, .bandeau, .arch-resume, .liste')) defauts.push(`${hote.id} › barre latérale : sans contenu attendu`);
      const hauteur = aside.querySelector('iframe')?.getBoundingClientRect().height ?? 0;
      if (hauteur < 300) defauts.push(`${hote.id} › barre latérale : haute de ${Math.round(hauteur)} px seulement`);
    }
    return { id: hote.id, defauts };
  });
});
await navigateur.close();
for (const e of erreurs) console.log('ERREUR', e);
let total = 0;
for (const { id, defauts } of rapport) {
  total += defauts.length;
  console.log(`${id} : ${defauts.length ? '' : 'ok'}`);
  for (const d of defauts.slice(0, 12)) console.log('   ', d);
}
console.log(`${rapport.length} cadres, ${total} défauts, ${erreurs.length} erreurs`);

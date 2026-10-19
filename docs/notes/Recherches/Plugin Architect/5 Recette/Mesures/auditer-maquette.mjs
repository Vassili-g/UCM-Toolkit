// Cherche les défauts visuels de la maquette sans la capturer : chevauchements entre voisins,
// textes qui débordent de leur boîte, jetons, pastilles et boutons coupés sur deux lignes, éléments hors de leur parent.
// `node "docs/notes/Recherches/Plugin Architect/5 Recette/Mesures/auditer-maquette.mjs"`
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const ici = path.dirname(fileURLToPath(import.meta.url));
// `MAQUETTE` désigne une autre maquette, par un chemin depuis la racine du dépôt.
const maquette = process.env.MAQUETTE ? path.resolve(process.env.MAQUETTE) : path.resolve(ici, '../Maquettes/MAQUETTE-RECETTE-ARCHITECT.html');
const navigateur = await chromium.launch();
const page = await navigateur.newPage({ viewport: { width: 1400, height: 900 } });
await page.goto(pathToFileURL(maquette).href);
await page.waitForTimeout(1500);
// Le tour 1 est replié : on l'ouvre pour le mesurer aussi.
await page.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true; }));
await page.waitForTimeout(500);

const rapport = await page.evaluate(() => [...document.querySelectorAll('.cadre')].map((hote) => {
  const doc = hote.querySelector('iframe').contentDocument;
  const nom = (e) => `${e.tagName.toLowerCase()}${e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).join('.') : ''} « ${(e.textContent || '').trim().slice(0, 30)} »`;
  const visibles = [...doc.querySelectorAll('body *')].filter((e) => {
    const r = e.getBoundingClientRect();
    const s = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'contents';
  });
  const defauts = [];
  for (const e of visibles) {
    const s = getComputedStyle(e);
    // Texte qui sort de sa boîte.
    if (e.scrollWidth > e.clientWidth + 1 && e.clientWidth > 0 && s.overflowX !== 'auto' && s.overflowX !== 'scroll' && e.tagName !== 'INPUT')
      defauts.push(`déborde de ${e.scrollWidth - e.clientWidth}px : ${nom(e)}`);
    // Jeton, pastille, bouton coupé sur deux lignes.
    if (e.matches('.jeton, .pastille, .btn, .btn-texte, .filtre, .etat-terme, .onglet, code.mot') && e.getClientRects().length > 1)
      defauts.push(`coupé en ${e.getClientRects().length} morceaux : ${nom(e)}`);
    if (e.matches('.btn, .btn-texte, .pastille, .jeton, .etat-terme') && e.getBoundingClientRect().height > 34)
      defauts.push(`haut de ${Math.round(e.getBoundingClientRect().height)}px (texte replié ?) : ${nom(e)}`);
    // Chemin écrasé dans une colonne trop étroite : il se replie lettre par lettre sans déborder.
    if (e.matches('.chemin, .chemin-apres, .ancien, .nouveau, .exemple-diff, .exemple') && (e.textContent || '').trim().length > 6 && e.getBoundingClientRect().width < 60)
      defauts.push(`écrasé dans ${Math.round(e.getBoundingClientRect().width)}px : ${nom(e)}`);
    // Hors de son parent.
    const parent = e.parentElement;
    if (parent && parent !== doc.body) {
      const r = e.getBoundingClientRect();
      const p = parent.getBoundingClientRect();
      const ps = getComputedStyle(parent);
      if (ps.overflow === 'visible' && (r.right > p.right + 1.5 || r.left < p.left - 1.5) && p.width > 0)
        defauts.push(`sort de son parent (${Math.round(r.left - p.left)}, ${Math.round(r.right - p.right)}) : ${nom(e)} dans ${nom(parent)}`);
    }
  }
  // Chevauchement entre frères.
  for (const parent of visibles) {
    const enfants = [...parent.children].filter((e) => visibles.includes(e) && getComputedStyle(e).position === 'static');
    for (let i = 0; i < enfants.length; i++) for (let j = i + 1; j < enfants.length; j++) {
      const a = enfants[i].getBoundingClientRect();
      const b = enfants[j].getBoundingClientRect();
      const x = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (x > 1 && y > 1) defauts.push(`chevauchement ${Math.round(x)}×${Math.round(y)} : ${nom(enfants[i])} / ${nom(enfants[j])}`);
    }
  }
  return { id: hote.id, defauts: [...new Set(defauts)].slice(0, 40) };
}));
await navigateur.close();
for (const { id, defauts } of rapport) {
  console.log(`\n## ${id} (${defauts.length})`);
  for (const d of defauts) console.log(' -', d);
}

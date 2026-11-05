import '@carbon/web-components/es/components/content-switcher/index.js';
import { toString } from '@carbon/icon-helpers';
import list from '@carbon/icons/es/list/16.js';
import grid from '@carbon/icons/es/grid/16.js';
import table from '@carbon/icons/es/table/16.js';

feuille('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600&display=swap');
document.body.style.fontFamily = '"IBM Plex Sans", sans-serif';
const pictos = { liste: list, grille: grid, tableau: table };

monter((cas, hote, signaler) => {
  const items = cas === 'icones'
    ? ICONES.map(([v, l]) => `<cds-content-switcher-item icon value="${v}">${toString(pictos[v])}<span slot="tooltip-content">${l}</span></cds-content-switcher-item>`)
    : libellesDe(cas).map((l) => `<cds-content-switcher-item value="${l}"${cas === 'desactive' && l === 'Mois' ? ' disabled' : ''}>${l}</cds-content-switcher-item>`);
  // Le content switcher prend toute la largeur de son parent : 360 px le ramènent à la taille des autres.
  const largeur = cas === 'icones' || cas === 'long' ? '' : ' style="max-width:360px"';
  hote.innerHTML = `<cds-content-switcher value="${premierDe(cas)}"${cas === 'icones' ? ' icon-only' : ''}${largeur}>${items.join('')}</cds-content-switcher>`;
  signaler(premierDe(cas));
  hote.firstElementChild.addEventListener('cds-content-switcher-selected', (e) => signaler(e.detail.item.value));
});

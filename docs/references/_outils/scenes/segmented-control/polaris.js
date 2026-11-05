import { createElement as h, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider, ButtonGroup, Button } from '@shopify/polaris';
import { ListBulletedIcon, LayoutColumns3Icon, DataTableIcon } from '@shopify/polaris-icons';

feuille('https://ga.jspm.io/npm:@shopify/polaris@13.9.5/build/esm/styles.css');
const pictos = { liste: ListBulletedIcon, grille: LayoutColumns3Icon, tableau: DataTableIcon };

// Polaris ne retient pas la sélection : la scène tient la valeur et pose `pressed`.
function Groupe({ cas, signaler }) {
  const [valeur, poser] = useState(premierDe(cas));
  const choisir = (v) => { poser(v); signaler(v); };
  const boutons = cas === 'icones'
    ? ICONES.map(([v, l]) => h(Button, { key: v, icon: pictos[v], accessibilityLabel: l, pressed: valeur === v, onClick: () => choisir(v) }))
    : libellesDe(cas).map((l) => h(Button, { key: l, pressed: valeur === l, disabled: cas === 'desactive' && l === 'Mois', onClick: () => choisir(l) }, l));
  return h(ButtonGroup, { variant: 'segmented' }, boutons);
}

monter((cas, hote, signaler) => {
  signaler(premierDe(cas));
  createRoot(hote).render(h(AppProvider, { i18n: {} }, h(Groupe, { cas, signaler })));
});

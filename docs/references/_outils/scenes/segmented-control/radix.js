import { createElement as h } from 'react';
import { createRoot } from 'react-dom/client';
import { Theme, SegmentedControl } from '@radix-ui/themes';

feuille('https://ga.jspm.io/npm:@radix-ui/themes@3.3.0/styles.css');
const icone = (v) => h('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'currentColor', 'aria-hidden': true },
  h('path', { d: TRACES[v], fillRule: 'evenodd' }));

monter((cas, hote, signaler) => {
  const items = cas === 'icones'
    ? ICONES.map(([v, l]) => h(SegmentedControl.Item, { key: v, value: v, 'aria-label': l }, icone(v)))
    : libellesDe(cas).map((l) => h(SegmentedControl.Item, { key: l, value: l }, l));
  signaler(premierDe(cas));
  createRoot(hote).render(h(Theme, { appearance: 'light', hasBackground: false },
    h(SegmentedControl.Root, { defaultValue: premierDe(cas), onValueChange: signaler, disabled: cas === 'desactive' }, items)));
  if (cas === 'desactive') return 'Un segment seul ne se désactive pas : Radix Themes retire <code>disabled</code> de <code>Item</code>. Ici, tout le groupe est désactivé.';
});

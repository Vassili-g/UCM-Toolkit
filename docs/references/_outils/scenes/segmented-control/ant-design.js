import { createElement as h } from 'react';
import { createRoot } from 'react-dom/client';
import { Segmented } from 'antd';

const icone = (v) => h('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'currentColor', 'aria-hidden': true },
  h('path', { d: TRACES[v], fillRule: 'evenodd' }));

monter((cas, hote, signaler) => {
  let options = LIBELLES;
  if (cas === 'icones') options = ICONES.map(([v, l]) => ({ value: v, icon: icone(v), 'aria-label': l, title: l }));
  else if (cas === 'long') options = LONG;
  else if (cas === 'desactive') options = LIBELLES.map((l) => ({ value: l, label: l, disabled: l === 'Mois' }));
  signaler(premierDe(cas));
  createRoot(hote).render(h(Segmented, { name: `ant-${cas}`, options, onChange: signaler }));
});

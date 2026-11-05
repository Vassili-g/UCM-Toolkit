import { createElement as h } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider, SegmentedControl, SegmentedControlItem, Text } from '@react-spectrum/s2';
import ViewList from '@react-spectrum/s2/icons/ViewList';
import ViewGrid from '@react-spectrum/s2/icons/ViewGrid';
import Table from '@react-spectrum/s2/icons/Table';

const pictos = { liste: ViewList, grille: ViewGrid, tableau: Table };

monter((cas, hote, signaler) => {
  const items = cas === 'icones'
    ? ICONES.map(([v, l]) => h(SegmentedControlItem, { key: v, id: v, 'aria-label': l }, h(pictos[v])))
    : libellesDe(cas).map((l) => h(SegmentedControlItem, { key: l, id: l, isDisabled: cas === 'desactive' && l === 'Mois' }, h(Text, null, l)));
  signaler(premierDe(cas));
  createRoot(hote).render(h(Provider, { colorScheme: 'light', locale: 'fr-FR' },
    h(SegmentedControl, { 'aria-label': 'Période', defaultSelectedKey: premierDe(cas), onSelectionChange: signaler }, items)));
});

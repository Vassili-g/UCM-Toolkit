/**
 * Un relevé et un catalogue UCM assez riches pour que chaque famille de contrôles du kit rende des constats : axes de
 * variants nommés comme le kit les reconnaît, variants manquants, calques masqués, texte à plusieurs plages, instances
 * pilotées, liaisons illisibles ou par surcharge, alias vers le thème et vers les marques, valeurs en dur.
 * Chaque appel rend des données neuves : un test les altère sans toucher aux suivants.
 */
import type { CatalogueDeReference, LayerLu, LiaisonLue, PeintureLue, ReleveDeComposant, VariantLu } from '@ucm-kit/core/controles';

const dimensions = (largeur: number, hauteur: number) => ({ x: 0, y: 0, largeur, hauteur });
const peinture = (champ: PeintureLue['champ'], indice: number, v: number, extra: Partial<PeintureLue> = {}): PeintureLue => ({
  champ, indice, type: 'SOLID', visible: true, opacite: 1, blendMode: 'NORMAL', couleur: { r: v, g: v, b: v, a: 1 }, ...extra,
});
const variable = (cle: string, nom: string, collection: string) => ({ id: `id-${cle}`, cle, nom, collection, distante: false });
const liaison = (champ: string, porteur: string, v: ReturnType<typeof variable>, extra: Partial<LiaisonLue> = {}): LiaisonLue => ({ champ, porteur, variable: v, ...extra });

/** Un variant : trois calques de base, plus ce que `extra` ajoute. */
function variant(valeurs: Record<string, string>, extra: (id: string) => LayerLu[] = () => []): VariantLu {
  const nom = Object.values(valeurs).join(' ');
  const id = `v-${nom.replace(/ /g, '-')}`;
  const fond = variable('b-fond', 'Button/color/primary/contained/default/background', 'components');
  const racine: LayerLu = {
    id: `${id}/racine`, nom: 'Root', type: 'FRAME', parent: null, visible: true, opacite: 1, dimensions: dimensions(120, valeurs.Size === 'small' ? 20 : 40),
    peintures: [peinture('fills', 0, 1), peinture('strokes', 0, 0.2)], strokeWeight: 1,
    liaisons: [liaison('fills', `${id}/racine`, fond, { indice: 0 }), liaison('cornerRadius', `${id}/racine`, variable('b-rayon', 'Button/radius/medium', 'components'))],
    valeursEnDur: [{ champ: 'paddingLeft', valeur: 8 }],
  };
  const texte: LayerLu = {
    id: `${id}/texte`, nom: 'Label', type: 'TEXT', parent: `${id}/racine`, visible: true, opacite: 1, dimensions: dimensions(80, 16),
    peintures: [], valeursEnDur: [],
    liaisons: [
      liaison('fills', `${id}/texte`, variable('t-fg', 'surface/foreground', 'theme'), { plage: { debut: 0, fin: 5 } }),
      liaison('fontFamily', `${id}/texte`, variable('absente-du-catalogue', 'Button/text/family', 'components')),
    ],
    texte: {
      style: valeurs.Size === 'small' ? null : 'Body',
      plages: [
        { debut: 0, fin: 5, fontSize: valeurs.Size === 'small' ? 10 : 14, fontWeight: 400, peintures: [peinture('fills', 0, 0.45)], liaisons: [
        liaison('fills', `${id}/texte`, variable('t-fg', 'surface/foreground', 'theme'), { indice: 0 }),
        liaison('fontSize', `${id}/texte`, variable('b-rayon', 'Button/radius/medium', 'components')),
        liaison('lineHeight', `${id}/texte`, variable('introuvable', 'Button/text/line', 'components')),
        liaison('fontWeight', `${id}/texte`, variable('inconnue', '', ''), { illisible: true }),
      ] },
        { debut: 5, fin: 8, fontSize: 24, fontWeight: 700, peintures: [peinture('fills', 0, 0.2)], liaisons: [] },
      ],
    },
  };
  const icone: LayerLu = {
    id: `${id}/icone`, nom: 'Icon', type: 'INSTANCE', parent: `${id}/racine`, visible: true, opacite: 0.9, dimensions: dimensions(16, 16),
    peintures: [peinture('fills', 0, 0)], valeursEnDur: [],
    liaisons: [
      liaison('fills', `${id}/icone`, variable('b-fond-icone', 'Button/color/secondary/contained/default/background', 'components'), { indice: 0 }),
      liaison('width', `${id}/icone`, variable('l-icone', 'icon/size/md', 'layout')),
      liaison('fills', `${id}/icone`, variable('b-fond', 'Button/color/primary/contained/default/background', 'components'), { indice: 0, surcharge: { id: 'vecteur', nom: 'Vector', type: 'VECTOR' } }),
      liaison('strokes', `${id}/icone`, variable('inconnue', '', ''), { indice: 0, illisible: true }),
    ],
    instanceDe: { cle: 'icone', nom: 'Icon', distante: true, pilotee: 'Icone' },
  };
  return { id, nom, valeurs, modesEffectifs: { components: 'Light', theme: 'l' }, layers: [racine, texte, icone, ...extra(id)] };
}

export function releveRiche(): ReleveDeComposant {
  const masque = (id: string): LayerLu[] => [
    { id: `${id}/cache`, nom: 'Caché', type: 'FRAME', parent: `${id}/racine`, visible: false, opacite: 1, dimensions: dimensions(10, 10), peintures: [peinture('fills', 0, 0)], liaisons: [], valeursEnDur: [] },
    { id: `${id}/sous-cache`, nom: 'Sous caché', type: 'TEXT', parent: `${id}/cache`, visible: true, opacite: 1, dimensions: dimensions(10, 10), peintures: [], liaisons: [], valeursEnDur: [], texte: { style: null, plages: [{ debut: 0, fin: 1, fontSize: 8, fontWeight: 400, peintures: [peinture('fills', 0, 0.5)], liaisons: [] }] } },
  ];
  const focus = (id: string): LayerLu[] => [
    { id: `${id}/ring`, nom: 'ring', type: 'RECTANGLE', parent: null, visible: true, opacite: 1, dimensions: dimensions(130, 50), peintures: [peinture('strokes', 0, 0)], strokeWeight: 1, liaisons: [], valeursEnDur: [] },
  ];
  return {
    version: 1,
    jeu: { cle: 'cle-button', id: 'jeu-Button', nom: 'Button' },
    proprietes: [
      { nom: 'Palette', type: 'VARIANT', valeurs: ['primary', 'secondary', 'tertiary'], defaut: 'primary' },
      { nom: 'Style', type: 'VARIANT', valeurs: ['contained', 'outlined'], defaut: 'contained' },
      { nom: 'Size', type: 'VARIANT', valeurs: ['small', 'medium'], defaut: 'medium' },
      { nom: 'State', type: 'VARIANT', valeurs: ['default', 'hover', 'disabled', 'focus'], defaut: 'default' },
      { nom: 'Icone', type: 'INSTANCE_SWAP', defaut: 'icone' },
      { nom: 'Avec icône', type: 'BOOLEAN', defaut: true },
      { nom: 'Libellé', type: 'TEXT', defaut: 'Bouton' },
    ],
    variants: [
      variant({ Palette: 'primary', Style: 'contained', Size: 'medium', State: 'default' }),
      variant({ Palette: 'primary', Style: 'contained', Size: 'medium', State: 'hover' }, masque),
      variant({ Palette: 'primary', Style: 'contained', Size: 'small', State: 'default' }),
      variant({ Palette: 'primary', Style: 'contained', Size: 'medium', State: 'disabled' }),
      variant({ Palette: 'primary', Style: 'contained', Size: 'medium', State: 'focus' }, focus),
      variant({ Palette: 'secondary', Style: 'outlined', Size: 'medium', State: 'default' }),
    ],
    lecture: { layersLus: 24, layersNonLus: 0, variantsNonLus: [], manquees: [{ layer: 'v-primary-contained-medium-default/icone', champ: 'strokes', motif: 'variable illisible' }] },
    espaceDeCouleur: 'srgb',
  };
}

/**
 * Le relevé riche dont l'hôte n'a plus d'axe de taille : un wrapper de dimensions le porte, et les tokens de taille du
 * catalogue se lient dans ses variants.
 */
export function releveRicheAvecWrapper(): ReleveDeComposant {
  const releve = releveRiche();
  releve.proprietes = releve.proprietes.map((propriete) => (propriete.nom === 'Size' ? { ...propriete, nom: 'Density' } : propriete));
  for (const variante of releve.variants) {
    const { Size: densite, ...autres } = variante.valeurs;
    variante.valeurs = { ...autres, Density: densite };
  }
  releve.wrappers = [{
    id: 'jeu-sizeWrapper', cle: 'cle-sizeWrapper', nom: '.sizeWrapperButton',
    proprietes: [{ nom: 'Size', type: 'VARIANT', valeurs: ['small', 'medium'], defaut: 'medium' }],
    variants: [
      { id: 'w-small', nom: 'Size=small', valeurs: { Size: 'small' }, liaisons: [liaison('height', 'w-small', variable('b-hauteur', 'Button/size/small/height', 'components'))] },
      { id: 'w-medium', nom: 'Size=medium', valeurs: { Size: 'medium' }, liaisons: [liaison('fills', 'w-medium', variable('b-fond-moyen', 'Button/color/primary/contained/medium/default/background', 'components'), { indice: 0 })] },
    ],
  }];
  return releve;
}

const modes = (...noms: string[]) => noms.map((nom) => ({ id: nom.slice(0, 1).toLowerCase(), nom }));
const couleur = (v: number) => ({ valeur: { r: v, g: v, b: v, a: 1 } });

export function catalogueRiche(): CatalogueDeReference {
  const theme = (cle: string, nom: string, v: number, extra: object = {}) => ({
    cle, nom, collection: 'theme', type: 'COLOR' as const, etat: 'presente' as const, valeurs: { l: couleur(v), d: couleur(1 - v) }, ...extra,
  });
  const composant = (cle: string, nom: string, alias: string | null, extra: object = {}) => ({
    cle, nom, collection: 'components', type: 'COLOR' as const, etat: 'presente' as const,
    valeurs: { l: alias ? { alias } : couleur(0.3), d: alias ? { alias } : couleur(0.7) }, ...extra,
  });
  return {
    version: 1, library: { nom: 'Intencial', cle: 'k-lib' },
    collections: [
      { cle: 'theme', nom: 'Theme', role: 'theme', etat: 'lue', modes: modes('Light', 'Dark') },
      { cle: 'components', nom: 'Components', role: 'components', etat: 'lue', modes: modes('Light', 'Dark') },
      { cle: 'brands', nom: 'Brands', role: 'brands', etat: 'lue', modes: modes('Light') },
      { cle: 'layout', nom: 'Layout', role: 'layout', etat: 'lue', modes: modes('Default') },
      { cle: 'primitives', nom: 'Primitives', role: null, etat: 'inaccessible', modes: modes('Default') },
    ],
    variables: [
      theme('t-fg', 'surface/foreground', 0.1, { scopes: ['TEXT_FILL'] }),
      theme('t-bg', 'surface/default', 0.95, { scopes: ['ALL_FILLS'] }),
      theme('t-page-fg', 'page/foreground', 0.2),
      theme('t-primary', 'primary/solid/default', 0.4),
      theme('t-secondary', 'secondary/solid/default', 0.5),
      composant('b-fond', 'Button/color/primary/contained/default/background', 't-primary', { scopes: ['ALL_FILLS'] }),
      composant('b-fond-icone', 'Button/color/secondary/contained/default/background', 'brand-secondary'),
      composant('b-fond-hover', 'Button/color/primary/contained/hover/background', 't-primary'),
      composant('b-fond-outlined', 'Button/color/primary/outlined/default/background', 't-primary'),
      composant('b-fond-moyen', 'Button/color/primary/contained/medium/default/background', 't-primary'),
      composant('b-fond-moyen-hover', 'Button/color/primary/contained/medium/hover/background', 't-primary'),
      composant('b-fond-tertiary', 'Button/color/tertiary/contained/default/background', null),
      { cle: 'b-rayon', nom: 'Button/radius/medium', collection: 'components', type: 'FLOAT', etat: 'presente', valeurs: { l: { valeur: 8 }, d: { valeur: 8 } } },
      { cle: 'b-hauteur', nom: 'Button/size/small/height', collection: 'components', type: 'FLOAT', etat: 'presente', valeurs: { l: { valeur: 24 } } },
      { cle: 'b-vide', nom: 'Button/color/secondary/outlined/default/border', collection: 'components', type: 'COLOR', etat: 'presente', valeurs: { l: { valeur: null }, d: { valeur: null } } },
      { cle: 'brand-secondary', nom: 'secondary/light/700', collection: 'brands', type: 'COLOR', etat: 'presente', valeurs: { l: couleur(0.4) } },
      { cle: 'l-icone', nom: 'icon/size/md', collection: 'layout', type: 'FLOAT', etat: 'presente', valeurs: { d: { valeur: 16 } } },
      { cle: 'l-s4', nom: 'sizing/4', collection: 'layout', type: 'FLOAT', etat: 'presente', valeurs: { d: { valeur: 16 } } },
      { cle: 'l-s5', nom: 'sizing/5', collection: 'layout', type: 'FLOAT', etat: 'presente', valeurs: { d: { valeur: 16 } } },
      { cle: 'p-gris', nom: 'gray/500', collection: 'primitives', type: 'COLOR', etat: 'inaccessible' },
    ],
  };
}

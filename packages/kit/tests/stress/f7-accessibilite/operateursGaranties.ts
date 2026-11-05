/**
 * Les opérateurs de garanties du thème sur P0 : Y1 (le type du constat selon la variable de `theme` liée) et Y2 (laquelle des
 * liaisons d'une cible donne la variable du thème). Un constat sur la page ou la carte se corrige quand la garantie de la variable
 * nomme ce fond (`emplois/garanties.ts`) ; sinon, et pour la page Figma, il se vérifie. Les cas de Y1 qui posent un seuil ou un
 * niveau que la garantie ne vise pas sont `mesure` (Q-F7-7) : la proposition les range en « à vérifier ».
 *
 * Le `Root` n'a pas de fond, donc le layer testé se mesure sur la page et la carte du thème, dans ses deux modes ; la variable liée vaut
 * `#CCCCCC` en Light, où elle échoue sur les deux fonds, et blanc en Dark, où elle passe : le pire mode est toujours Light.
 */
import {
  attendusSurPageEtCarte, fabrique, nomDeLaCible, type AttenduAcc, type CasAccessibilite, type Usage,
} from './cas.js';
import { themeDuCatalogue, type ComposantDeContraste } from './composantDeContraste.js';
import { solide, type Degradation } from './degradation.js';
import { couleurDeHex } from './oracleContraste.js';

const ECHEC = '#CCCCCC';
const REUSSITE = '#FFFFFF';
const DEUX_COULEURS = [couleurDeHex(ECHEC), couleurDeHex(REUSSITE)];

/** L'élément que Y1 pose pour chaque variable : un texte pour une garantie de texte, un contour ou une icône pour une garantie de non-texte. */
interface Element { readonly usage: Usage; readonly niveau: 'AA' | 'AAA'; readonly seuil: number }
const TEXTE: Element = { usage: 'texte', niveau: 'AA', seuil: 4.5 };
const TEXTE_AAA: Element = { usage: 'texte', niveau: 'AAA', seuil: 7 };
const ICONE: Element = { usage: 'icone', niveau: 'AA', seuil: 3 };
const CONTOUR: Element = { usage: 'stroke', niveau: 'AA', seuil: 3 };
const ANNEAU: Element = { usage: 'anneau', niveau: 'AA', seuil: 3 };

/** Le layer de l'élément, sans peinture liée : l'appelant lie sa peinture. */
function poserLElement(d: Degradation, element: Element): ReturnType<Degradation['racine']> {
  switch (element.usage) {
    case 'texte': return d.ajouterUnTexte('Texte', { peintures: [solide('#000000')] });
    case 'icone': return d.ajouterUnLayer({ nom: 'Pictogram', type: 'VECTOR', peintures: [solide('#000000')] });
    case 'stroke': return d.ajouterUnLayer({ nom: 'Contour', peintures: [solide('#000000', { champ: 'strokes' })], strokeWeight: 1 });
    default: return d.ajouterUnLayer({ nom: 'Ring', peintures: [solide('#000000', { champ: 'strokes' })], strokeWeight: 2 });
  }
}

const lierLElement = (d: Degradation, element: Element, layer: ReturnType<Degradation['racine']>, variable: Parameters<Degradation['lier']>[1], indice?: number): void => {
  if (element.usage === 'texte') d.lier(layer, variable, { plage: 0 });
  else d.lier(layer, variable, { champ: element.usage === 'icone' ? 'fills' : 'strokes', indice: indice ?? 0 });
};

export function operateurY(base: ComposantDeContraste): CasAccessibilite[] {
  const faire = fabrique(base);
  const cible = nomDeLaCible(base);
  const cas: CasAccessibilite[] = [];
  const numero = (operateur: string): number => cas.filter((c) => c.operateur === operateur).length + 1;

  /** Le texte ou le contour lié à une variable `nom` de la collection `theme`, `Root` sans fond. Hors thème : variable en dur dans `components`. */
  const surLaVariable = (element: Element, nom: string, o: { horsTheme?: boolean } = {}) => (d: Degradation): void => {
    d.scene({ fond: null });
    const variable = o.horsTheme
      ? d.nouvelleVariable({ nom, collection: d.catalogue.collections.find((c) => c.role === 'components')!, valeurs: [ECHEC] })
      : d.nouvelleVariable({ nom, collection: themeDuCatalogue(d.catalogue), valeurs: [ECHEC, REUSSITE] });
    const layer = poserLElement(d, element);
    lierLElement(d, element, layer, variable);
  };
  const attendus = (element: Element, type: 'corriger' | 'verifier', variableDuTheme: string, valeurs = DEUX_COULEURS): AttenduAcc[] =>
    attendusSurPageEtCarte({
      usage: element.usage, seuil: element.seuil, niveau: element.niveau, cible, type, variableDuTheme,
      premierPlan: (mode) => [mode === 'light' ? valeurs[0] : valeurs[1]],
    });

  // Y1 : les sept variables qui portent une garantie, quand le seuil de l'élément est celui de la garantie.
  const garanties: [string, Element, 'corriger' | 'verifier'][] = [
    ['solid/foreground', TEXTE, 'verifier'], ['solid/default', ICONE, 'corriger'], ['surface/foreground', TEXTE, 'corriger'], ['surface/border', CONTOUR, 'corriger'],
    ['page/foreground', TEXTE, 'corriger'], ['page/border', CONTOUR, 'corriger'], ['ring', ANNEAU, 'corriger'],
  ];
  for (const [variable, element, type] of garanties) {
    cas.push(faire(`Y1-${numero('Y1')}`, 'Y1', {
      description: `${element.usage} lié à primary/${variable} : échec sur la page et la carte, ${type}`, niveau: element.niveau,
      degrader: surLaVariable(element, `primary/${variable}`), attendus: attendus(element, type, variable),
    }));
  }
  // Une variable hors du thème, une variable du thème que le référentiel ne reconnaît pas : jamais garanties.
  cas.push(faire(`Y1-${numero('Y1')}`, 'Y1', {
    description: 'texte lié à une variable de components en dur, hors du thème : à vérifier', degrader: surLaVariable(TEXTE, 'test/hors-theme', { horsTheme: true }),
    attendus: attendus(TEXTE, 'verifier', '', [couleurDeHex(ECHEC), couleurDeHex(ECHEC)]),
  }));
  cas.push(faire(`Y1-${numero('Y1')}`, 'Y1', {
    description: 'texte lié à primary/custom/accent, variable du thème non reconnue : à vérifier', degrader: surLaVariable(TEXTE, 'primary/custom/accent'), attendus: attendus(TEXTE, 'verifier', ''),
  }));
  // Q-F7-7 : un texte à 4,5 lié à une garantie de non-texte, et un texte à 7 lié à une garantie à 4,5, ne sont pas couverts.
  const auDela: [string, Element][] = [['solid/default', TEXTE], ['surface/border', TEXTE], ['page/border', TEXTE], ['ring', TEXTE], ['surface/foreground', TEXTE_AAA]];
  for (const [variable, element] of auDela) {
    cas.push(faire(`Y1-${numero('Y1')}`, 'Y1', {
      description: `texte de seuil ${element.seuil} (${element.niveau}) lié à primary/${variable}, dont la garantie vise un autre seuil ou un autre niveau`, niveau: element.niveau,
      degrader: surLaVariable(element, `primary/${variable}`), attendus: attendus(element, 'verifier', variable), hypothese: 'H5',
    }));
  }

  // Y2 : deux liaisons sur la même cible, un alias à deux renvois, deux collections `theme`, une liaison d'un autre champ.
  const deux = (d: Degradation, premiere: string, seconde: string, champDuSecond: 'fills' | 'strokes'): void => {
    d.scene({ fond: null });
    const theme = themeDuCatalogue(d.catalogue);
    const [a, b] = [d.nouvelleVariable({ nom: premiere, collection: theme, valeurs: [ECHEC, REUSSITE] }), d.nouvelleVariable({ nom: seconde, collection: theme, valeurs: [ECHEC, REUSSITE] })];
    const icone = d.ajouterUnLayer({
      nom: 'Pictogram', type: 'VECTOR', peintures: champDuSecond === 'fills' ? [solide('#000000', { indice: 0 }), solide('#000000', { indice: 1 })] : [solide('#000000')],
    });
    if (champDuSecond === 'fills') {
      d.lier(icone, a, { champ: 'fills', indice: 0 });
      d.lier(icone, b, { champ: 'fills', indice: 1 });
    } else {
      d.lier(icone, b, { champ: 'strokes', indice: 0 });
      d.lier(icone, a, { champ: 'fills', indice: 0 });
    }
  };
  cas.push(faire(`Y2-${numero('Y2')}`, 'Y2', {
    description: 'deux liaisons de fills sur la même icône (indices 0 et 1) : la variable du thème est lue sur la première, primary/surface/border',
    degrader: (d) => deux(d, 'primary/surface/border', 'primary/solid/foreground', 'fills'), attendus: attendus(ICONE, 'corriger', 'surface/border'),
  }));
  cas.push(faire(`Y2-${numero('Y2')}`, 'Y2', {
    description: 'texte lié à une variable de components qui renvoie à une autre, puis à primary/surface/foreground : deux renvois',
    degrader: (d) => {
      d.scene({ fond: null });
      const components = d.catalogue.collections.find((c) => c.role === 'components')!;
      const duTheme = d.nouvelleVariable({ nom: 'primary/surface/foreground', collection: themeDuCatalogue(d.catalogue), valeurs: [ECHEC, REUSSITE] });
      const milieu = d.nouvelleVariable({ nom: 'test/milieu', collection: components, valeurs: [{ alias: duTheme.cle }] });
      const debut = d.nouvelleVariable({ nom: 'test/debut', collection: components, valeurs: [{ alias: milieu.cle }] });
      lierLElement(d, TEXTE, poserLElement(d, TEXTE), debut);
    },
    attendus: attendus(TEXTE, 'corriger', 'surface/foreground'),
  }));
  cas.push(faire(`Y2-${numero('Y2')}`, 'Y2', {
    description: 'deux collections theme dans le catalogue, texte lié à primary/surface/foreground de la seconde',
    degrader: (d) => {
      d.scene({ fond: null });
      const seconde = d.nouvelleCollection('theme', ['Light', 'Dark'], 'theme');
      const variable = d.nouvelleVariable({ nom: 'primary/surface/foreground', collection: seconde, valeurs: [ECHEC, ECHEC] });
      lierLElement(d, TEXTE, poserLElement(d, TEXTE), variable);
    },
    attendus: attendus(TEXTE, 'corriger', 'surface/foreground', [couleurDeHex(ECHEC), couleurDeHex(ECHEC)]),
  }));
  cas.push(faire(`Y2-${numero('Y2')}`, 'Y2', {
    description: 'une icône dont le fill est lié à primary/surface/border et le contour à primary/solid/foreground, contour listé en premier : seule la liaison du champ mesuré compte',
    degrader: (d) => deux(d, 'primary/surface/border', 'primary/solid/foreground', 'strokes'), attendus: attendus(ICONE, 'corriger', 'surface/border'),
  }));
  return cas;
}

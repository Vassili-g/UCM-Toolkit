/**
 * L'opérateur d'icône sur P0 : I1 (douze types de layer sous deux noms), I2 (noms qui contiennent `icon` sans en être le mot),
 * I3 (VECTOR de nom libre), I4 (fill, stroke et fills empilés), I5 (VECTOR nommé comme un anneau) et I6 (icône sans fill visible).
 *
 * Le verdict suit la définition unique de Q-F3-4 : un VECTOR, un BOOLEAN_OPERATION, une instance pilotée par INSTANCE_SWAP ou un
 * layer dont un mot entier du nom est `icon` est une icône. Il reste `mesure` tant que Q-F3-4 n'a pas de réponse, sauf pour un
 * VECTOR ou un BOOLEAN_OPERATION de nom libre. La peinture des layers posés vaut 2:1 sur le fond blanc de la scène : une icône
 * reconnue donne un constat, une autre aucun.
 */
import {
  contrasteAttendu, fabrique, nomDeLaCible, type AttenduAcc, type CasAccessibilite, type IconeDuCas, type Usage,
} from './cas.js';
import type { ComposantDeContraste } from './composantDeContraste.js';
import { solide, type Degradation } from './degradation.js';
import { couleurDeHex, mesurerLaPaire, rapportDeHex } from './oracleContraste.js';

const BLANC = '#FFFFFF';
const FAIBLE = '#B8B8B8';
const GRIS = '#A0A0A0';
const SEUIL = 3;

const TYPES = [
  'VECTOR', 'BOOLEAN_OPERATION', 'ELLIPSE', 'RECTANGLE', 'STAR', 'POLYGON', 'LINE', 'FRAME', 'GROUP', 'COMPONENT', 'INSTANCE pilotée', 'INSTANCE non pilotée',
] as const;

/** Q-F3-4 : le mot entier `icon` dans un nom (`Icon Leading`, `icon-trailing`), jamais au milieu d'un mot (`Silicone`). */
const contientLeMotIcon = (nom: string): boolean => /(^|[^a-z0-9])icon($|[^a-z0-9])/i.test(nom);

/** Ce que Q-F3-4 dit du layer posé. */
function definitionDuLayer(nom: string, type: string): IconeDuCas {
  const base = type.split(' ')[0];
  const instance = type === 'INSTANCE pilotée' ? 'pilotee' : type === 'INSTANCE non pilotée' ? 'bibliotheque' : undefined;
  const estUneIcone = base === 'VECTOR' || base === 'BOOLEAN_OPERATION' || instance === 'pilotee' || contientLeMotIcon(nom);
  return { nom, type: base, ...(instance ? { instance } : {}), estUneIcone };
}

function poserLeLayer(d: Degradation, nom: string, type: string, peintures = [solide(FAIBLE)]): ReturnType<Degradation['ajouterUnLayer']> {
  const base = type.split(' ')[0];
  const layer = d.ajouterUnLayer({ nom, type: base, peintures });
  if (base === 'INSTANCE') {
    d.fixer(layer, 'instanceDe', { cle: 'lib-forme', nom: 'Forme', distante: true, pilotee: type === 'INSTANCE pilotée' ? 'Icon#1:2' : null });
  }
  return layer;
}

/** Le constat d'icône d'un layer de fill opaque `couleur` sur le fond blanc de la scène, ou aucun. */
function iconeAttendue(nom: string, cible: string, couleur = FAIBLE): AttenduAcc {
  return contrasteAttendu({ usage: 'icone', layer: nom, rapport: rapportDeHex(couleur, BLANC), seuil: SEUIL, variants: [cible], premierPlan: couleur, fondHex: BLANC });
}

const contourAttendu = (nom: string, cible: string, couleur: string): AttenduAcc =>
  contrasteAttendu({ usage: 'stroke' as Usage, layer: nom, rapport: rapportDeHex(couleur, BLANC), seuil: SEUIL, variants: [cible], premierPlan: couleur, fondHex: BLANC });

export function operateurI(base: ComposantDeContraste): CasAccessibilite[] {
  const faire = fabrique(base);
  const cible = nomDeLaCible(base);
  const cas: CasAccessibilite[] = [];
  const numero = (operateur: string): number => cas.filter((c) => c.operateur === operateur).length + 1;

  // I1 : douze types sous le nom `icon` ou `Shape`, peinture à 2:1.
  for (const type of TYPES) {
    for (const nom of ['icon', 'Shape']) {
      const icone = definitionDuLayer(nom, type);
      const libre = icone.type === 'VECTOR' || icone.type === 'BOOLEAN_OPERATION';
      cas.push(faire(`I1-${numero('I1')}`, 'I1', {
        description: `${type} nommé ${nom}, peinture ${FAIBLE} (2:1) : ${icone.estUneIcone ? 'une icône' : 'pas une icône'}`,
        degrader: (d) => { d.scene(); poserLeLayer(d, nom, type); },
        attendus: icone.estUneIcone ? [iconeAttendue(nom, cible)] : [],
        icone, ...(libre ? {} : { verdict: 'mesure' as const, question: 'Q-F3-4', hypothese: 'H10', ecartConnu: 'E-26' }),
      }));
    }
  }

  // I2 : des RECTANGLE dont le nom contient `icon` sans en être le mot, ou en est le mot.
  for (const nom of ['Silicone', 'Lexicon', 'Icon Leading', 'icon-trailing', 'IconButton', 'Icons']) {
    const icone = definitionDuLayer(nom, 'RECTANGLE');
    cas.push(faire(`I2-${numero('I2')}`, 'I2', {
      description: `RECTANGLE nommé ${nom}, peinture ${FAIBLE} : ${icone.estUneIcone ? 'une icône' : 'pas une icône'}`,
      degrader: (d) => { d.scene(); poserLeLayer(d, nom, 'RECTANGLE'); },
      attendus: icone.estUneIcone ? [iconeAttendue(nom, cible)] : [],
      icone, ...(icone.estUneIcone ? { verdict: 'mesure' as const, question: 'Q-F3-4', hypothese: 'H10', ecartConnu: 'E-26' } : {}),
    }));
  }

  // I3 : un VECTOR qui sert de séparateur ou de chevron est mesuré comme icône, quel que soit son nom.
  for (const nom of ['Divider', 'Separator', 'Chevron', 'Glyph']) {
    cas.push(faire(`I3-${numero('I3')}`, 'I3', {
      description: `VECTOR nommé ${nom}, peinture ${FAIBLE} : mesuré comme icône`,
      degrader: (d) => { d.scene(); poserLeLayer(d, nom, 'VECTOR'); },
      attendus: [iconeAttendue(nom, cible)], icone: definitionDuLayer(nom, 'VECTOR'), hypothese: 'H10', ecartConnu: 'E-26',
    }));
  }

  // I4 : le fill décide de C49, le stroke relève de C50.
  cas.push(faire(`I4-${numero('I4')}`, 'I4', {
    description: `icône avec un fill ${FAIBLE} et un stroke ${GRIS} de 1 px : un constat d'icône et un constat de contour`,
    degrader: (d) => {
      d.scene();
      d.ajouterUnLayer({ nom: 'Pictogram', type: 'VECTOR', peintures: [solide(FAIBLE), solide(GRIS, { champ: 'strokes' })], strokeWeight: 1 });
    },
    attendus: [iconeAttendue('Pictogram', cible), contourAttendu('Pictogram', cible, GRIS)],
  }));
  cas.push(faire(`I4-${numero('I4')}`, 'I4', {
    description: 'icône à deux fills opaques : #404040 dessous, #A8A8A8 dessus, la peinture du dessus décide',
    degrader: (d) => { d.scene(); d.ajouterUnLayer({ nom: 'Pictogram', type: 'VECTOR', peintures: [solide('#404040', { indice: 0 }), solide('#A8A8A8', { indice: 1 })] }); },
    attendus: [iconeAttendue('Pictogram', cible, '#A8A8A8')],
  }));
  {
    const mesure = mesurerLaPaire([couleurDeHex('#000000', 0.2)], [couleurDeHex(BLANC)], null)!;
    cas.push(faire(`I4-${numero('I4')}`, 'I4', {
      description: 'icône à fill noir d\'alpha 0,2, composé sur le fond blanc',
      degrader: (d) => { d.scene(); d.ajouterUnLayer({ nom: 'Pictogram', type: 'VECTOR', peintures: [solide('#000000', { alpha: 0.2 })] }); },
      attendus: [contrasteAttendu({ usage: 'icone', layer: 'Pictogram', rapport: mesure.rapport, seuil: SEUIL, variants: [cible], premierPlan: mesure.premierPlan, fondHex: mesure.fond })],
    }));
  }

  // I5 : un VECTOR nommé comme un anneau n'est pas une icône ; rempli sans contour, il se mesure comme anneau sur son remplissage (Q-F7-9).
  for (const nom of ['ring', 'Focus ring']) {
    cas.push(faire(`I5-${numero('I5')}`, 'I5', {
      description: `VECTOR nommé ${nom}, peinture ${FAIBLE} : pas mesuré comme icône, mesuré comme anneau`,
      degrader: (d) => { d.scene(); poserLeLayer(d, nom, 'VECTOR'); },
      attendus: [contrasteAttendu({ usage: 'anneau', layer: nom, rapport: rapportDeHex(FAIBLE, BLANC), seuil: 3, variants: [cible], premierPlan: FAIBLE, fondHex: BLANC })],
      icone: { nom, type: 'VECTOR', estUneIcone: false },
    }));
  }

  // I6 : sans fill visible, une icône n'a pas de constat d'icône ; son stroke seul relève de C50.
  cas.push(faire(`I6-${numero('I6')}`, 'I6', {
    description: 'icône dont le fill est masqué : aucun constat',
    degrader: (d) => { d.scene(); d.ajouterUnLayer({ nom: 'Pictogram', type: 'VECTOR', peintures: [solide(FAIBLE, { visible: false })] }); }, attendus: [],
  }));
  cas.push(faire(`I6-${numero('I6')}`, 'I6', {
    description: `icône à stroke seul ${GRIS} de 1 px : un constat de contour, aucun d'icône`,
    degrader: (d) => { d.scene(); d.ajouterUnLayer({ nom: 'Pictogram', type: 'VECTOR', peintures: [solide(GRIS, { champ: 'strokes' })], strokeWeight: 1 }); },
    attendus: [contourAttendu('Pictogram', cible, GRIS)],
  }));
  return cas;
}

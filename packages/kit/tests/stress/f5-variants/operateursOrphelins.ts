/**
 * L'opérateur O de F5 : les tokens orphelins, inutilisés ou illisibles, et la couverture des variants (C32 et C33), sur P0.
 *
 * O3 et O4 testent E-33 et P10 : un token que seule une liaison illisible ou un wrapper de dimensions lie n'est jamais accusé.
 * O4 part d'un hôte sans axe `Size`, parce que `oublis.ts` ne confie à un wrapper que les rôles d'axe que l'hôte n'a pas. O6 attend
 * la proposition de Q-F5-8 : un token du composant au nom illisible donne C32, motif `nom-illisible`.
 */
import type { LiaisonLue } from '../../../src/controles/index.js';
import { c32, casDegrade, Numerotation, type CasDeVariants } from './cas.js';
import { composantDeBase, AXES_DE_P0 } from './composantDeBase.js';
import type { ComposantDeBase } from './portF3.js';

/** Un token ajouté pour une valeur d'axe qu'aucun variant ne porte. */
const VALEURS_ABSENTES: readonly (readonly [axe: string, role: 'style' | 'palette' | 'taille' | 'etat', valeur: string])[] = [
  ['Style', 'style', 'ghost'], ['Color', 'palette', 'tertiary'], ['Size', 'taille', 'xl'], ['State', 'etat', 'focus'],
];

function tokensSansVariant(base: ComposantDeBase, numero: Numerotation): CasDeVariants[] {
  const premier = base.releve.variants[0].valeurs;
  return VALEURS_ABSENTES.map(([axe, role, valeur]) => casDegrade(base, {
    id: numero.prochain('O1'), operateur: 'O1',
    description: `un token de couleur nomme ${axe}=${valeur}, qu'aucun variant ne porte`,
    zones: [{ axe, valeur }],
    degrader: (d) => {
      const modele = d.jetons({ nature: 'couleur', role: 'background', valeurs: premier })[0];
      const segments = modele.nom.split('/');
      segments[d.rangDuSegment('color', role)] = valeur;
      d.cloner(modele, segments.join('/'));
    },
  }));
}

const JETONS_NON_LIES: readonly (readonly [famille: 'couleur' | 'taille', nom: string])[] = [
  ['couleur', 'border'], ['couleur', 'icon'], ['couleur', 'foreground'], ['taille', 'gap'], ['taille', 'padding-x'], ['taille', 'radius'],
];

function tokensInutilises(base: ComposantDeBase, numero: Numerotation): CasDeVariants[] {
  const premier = base.releve.variants[0].valeurs;
  return JETONS_NON_LIES.map(([nature, nom]) => casDegrade(base, {
    id: numero.prochain('O2'), operateur: 'O2',
    description: `le token ${nature === 'couleur' ? 'de couleur' : 'de taille'} ${nom} n'est lié par aucun layer`,
    zones: nature === 'couleur' ? Object.entries(premier).map(([axe, valeur]) => ({ axe, valeur })) : [{ axe: 'Size', valeur: 'sm' }],
    degrader: (d) => {
      const [jeton] = nature === 'couleur'
        ? d.jetons({ nature, role: nom, valeurs: premier })
        : d.jetons({ nature, propriete: nom, valeurs: { Size: 'sm' } });
      d.delier(jeton.cle);
    },
  }));
}

/**
 * O3 : la liaison qui lie le token est illisible. Le relevé la note dans `lecture.manquees` et ne la porte pas, donc le token n'a
 * aucune liaison connue, et C32 ne doit pas l'accuser (P10, E-33).
 */
function liaisonsIllisibles(base: ComposantDeBase, numero: Numerotation): CasDeVariants[] {
  const premier = base.releve.variants[0].valeurs;
  const racine = base.carte.variants[0].layers.Root!;
  const specs: readonly (readonly [champ: 'fills' | 'strokes' | 'width', role: string])[] = [['fills', 'background'], ['strokes', 'border'], ['width', 'gap']];
  return specs.map(([champ, role]) => {
    const jeton = base.carte.jetons.find((entree) => entree.role === role && Object.entries(premier).every(([axe, valeur]) => entree.valeurs[axe] === valeur))
      ?? base.carte.jetons.find((entree) => entree.propriete === role && entree.valeurs.Size === 'sm')!;
    const nom = champ === 'width' ? jeton.nom.replace(/\/gap$/, '/width') : jeton.nom;
    return casDegrade(base, {
      id: numero.prochain('O3'), operateur: 'O3', ecartConnu: 'E-33',
      description: `le seul lien du token ${nom} est la liaison ${champ} du layer Root, que la lecture n'a pas pu lire`,
      zones: [{ axe: 'Style', valeur: premier.Style }],
      degrader: (d) => {
        if (champ === 'width') d.cloner(d.variable(jeton.cle), nom);
        else d.delier(jeton.cle);
        d.inserer(d.releve.lecture.manquees, { layer: racine, champ, motif: 'illisible' });
      },
      ajuster: (attendus) => attendus.filter((constat) => !(constat.code === 'C32' && constat.cle.startsWith(`${nom}|`))),
    });
  });
}

/** O4 : un hôte sans axe `Size`, dont un wrapper de dimensions porte la taille et lie le token. */
function tokensDeWrapper(numero: Numerotation): CasDeVariants[] {
  const hote = composantDeBase('Button', AXES_DE_P0.filter((axe) => axe.nom !== 'Size'));
  const tokens: readonly (readonly [taille: string, forme: string, propriete: string, champ: string])[] = [['sm', 'small', 'gap', 'itemSpacing'], ['md', 'medium', 'radius', 'cornerRadius']];
  return tokens.map(([taille, forme, propriete, champ]) => casDegrade(hote, {
    id: numero.prochain('O4'), operateur: 'O4', ecartConnu: 'E-33',
    description: `le token size/${forme}/${propriete} n'est lié que par le variant Size=${taille} du wrapper de dimensions`,
    zones: [{ axe: 'Size', valeur: taille }],
    degrader: (d) => {
      const modele = d.jetons({ nature: 'taille', propriete })[0];
      const jeton = d.cloner(modele, `button/size/${forme}/${propriete}`);
      const liaison: LiaisonLue = { champ, porteur: 'w:1', variable: { id: `VariableID:${jeton.cle}`, cle: jeton.cle, nom: jeton.nom, collection: jeton.collection, distante: false } };
      d.fixer(d.releve, 'wrappers', [{
        id: 'w:0', cle: 'wrapper-cle', nom: 'SizeWrapper',
        proprietes: [{ nom: 'Size', type: 'VARIANT', valeurs: ['sm', 'md'], defaut: 'sm' }],
        variants: [{ id: 'w:1', nom: `Size=${taille}`, valeurs: { Size: taille }, liaisons: [liaison] }],
      }]);
    },
    attendus: [],
  }));
}

/** O5 : tous les tokens qui nomment une valeur d'axe disparaissent, avec leurs liaisons. */
function tokensRetires(base: ComposantDeBase, numero: Numerotation): CasDeVariants[] {
  return AXES_DE_P0.flatMap((axe) => axe.valeurs.map((valeur) => casDegrade(base, {
    id: numero.prochain('O5'), operateur: 'O5', ...(axe.nom === 'Size' ? { hypothese: 'H5' } : {}),
    description: `tous les tokens de ${axe.nom}=${valeur} sont supprimés, les variants restent`,
    zones: [{ axe: axe.nom, valeur }],
    degrader: (d) => {
      for (const { variable } of d.jetonsDe(axe.nom, valeur)) {
        d.delier(variable.cle);
        d.retirer(d.catalogue.variables, variable);
      }
    },
  })));
}

const NOMS_ILLISIBLES: readonly (readonly [description: string, nom: string])[] = [
  ['les segments d\'état et de palette sont échangés', 'button/color/default/solid/small/primary/background'],
  ['un segment de trop s\'ajoute avant le rôle', 'button/color/primary/solid/small/default/extra/background'],
  ['la famille color est absente', 'button/primary/solid/small/default/background'],
  ['le préfixe devient BtnPrimary, un autre composant', 'BtnPrimary/color/primary/solid/small/default/background'],
  ['le nom se réduit à button/colours', 'button/colours'],
  ['le rôle devient glow, que le registre ne connaît pas', 'button/color/primary/solid/small/default/glow'],
];

/** O6 : le token de fond du premier variant prend un nom illisible. Q-F5-8 propose C32 `nom-illisible` ; un autre préfixe n'est plus un token du composant. */
function nomsIllisibles(base: ComposantDeBase, numero: Numerotation): CasDeVariants[] {
  const premier = base.releve.variants[0].valeurs;
  return NOMS_ILLISIBLES.map(([description, nom]) => casDegrade(base, {
    id: numero.prochain('O6'), operateur: 'O6', verdict: 'mesure', question: 'Q-F5-8', hypothese: 'H11',
    description: `${description} : ${nom}`,
    zones: Object.entries(premier).map(([axe, valeur]) => ({ axe, valeur })),
    degrader: (d) => d.fixer(d.jetons({ nature: 'couleur', role: 'background', valeurs: premier })[0], 'nom', nom),
    attendus: nom.startsWith('BtnPrimary') ? [] : [c32(nom, 'nom-illisible')],
  }));
}

/** O (33) : 4 tokens sans variant, 6 inutilisés, 3 à liaison illisible, 2 de wrapper, 12 retraits d'une valeur, 6 noms illisibles. */
export function operateursOrphelins(base: ComposantDeBase, _graine: number): CasDeVariants[] {
  const numero = new Numerotation();
  return [
    ...tokensSansVariant(base, numero), ...tokensInutilises(base, numero), ...liaisonsIllisibles(base, numero),
    ...tokensDeWrapper(numero), ...tokensRetires(base, numero), ...nomsIllisibles(base, numero),
  ];
}

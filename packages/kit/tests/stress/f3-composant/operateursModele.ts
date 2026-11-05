/**
 * Les opérateurs de dégradation de la fratrie (M1, C21) et de la propagation depuis un variant modèle (M2, C24 de propagation et
 * C81) des stress tests F3.
 *
 * M1 : C21 vise la liaison d'un variant dont la cible de thème sort d'une majorité stricte de son groupe (même layer, même champ),
 * sauf si son token porte les valeurs d'axe du variant. Le groupe naturel le plus uniforme de `button-36` est `Ring` (36 liaisons à
 * `ring`) ; les champs dont les tokens varient avec l'état ou la taille sont d'abord alignés sur un token commun.
 *
 * M2 : le modèle est le premier variant du jeu, comme `candidatsDeModele` le choisit à égalité. Les autres variants sont « nus » :
 * des liaisons retirées, les peintures restent en dur. L'oracle déduit de la carte, pour chaque liaison retirée, le token du
 * variant visé : C24 avec correction, plus un C81 par sorte (couleurs ou tailles) dont le premier layer concerné est celui du
 * modèle. Les cas de M2 portent `entree.modele`, que le harnais passe à `proposerLaPropagation`.
 */
import type { Constat, VariableDuCatalogue } from '../../../src/controles/index.js';
import type { ConstatAttendu } from '../commun/types.js';
import type { CarteDuComposant, LiaisonAttendue, VariantDeCarte } from './carte.js';
import { construireLeComposant, GRAINE_PAR_DEFAUT, type ComposantDeBase } from './composantDeBase.js';
import {
  attendu, axeDeSegment, cleDeConstat, Degradation, jetonCouleur, liaisonDeCible, lieuDe, Registre,
  type CasDeComposant, type EntreeDeCas,
} from './operateursAxes.js';
import { ajouterAvecCodes, ajouterUnLayer, delier, lierLaPeinture, peintureUnie } from './operateursPeinture.js';

/** Un cas de propagation sait de quel variant le harnais lance `proposerLaPropagation`. */
export interface EntreeDeModele extends EntreeDeCas { readonly modele: string }

/**
 * La clé de comparaison des opérateurs M, U, T et S. Elle reprend `cleDeConstat` et ajoute ce que deux constats d'un même code ne
 * partagent pas dans les faits clés : le mode d'un C63 (sans variant, ni layer, ni champ) et la famille d'un C81 (couleurs ou
 * tailles du même modèle). Les autres codes gardent la clé de `cleDeConstat`.
 */
export function cleDeConstatEtendue(constat: Constat): string {
  if (constat.code === 'C63') return `${cleDeConstat(constat)}|${constat.faits.mode ?? ''}`;
  if (constat.code === 'C81') return `${cleDeConstat(constat)}|${constat.famille}`;
  return cleDeConstat(constat);
}

export const modeleDuCas = (cas: CasDeComposant): string | undefined => (cas.entree as Partial<EntreeDeModele>).modele;

const CODES_DE_M1: readonly string[] = ['C21'];
const CODES_DE_M2: readonly string[] = ['C24', 'C81'];

// ---------------------------------------------------------------------------------------------------------------------------
// M1. La fratrie

/** Un clone du token qui vise `cible` dans chaque mode, nommé sans segment d'axe : il ne porte jamais les valeurs de son variant. */
function cloneVers(degradation: Degradation, modele: VariableDuCatalogue, nom: string, cible: VariableDuCatalogue): VariableDuCatalogue {
  const modes = degradation.catalogue.collections.find((collection) => collection.cle === modele.collection)!.modes;
  return degradation.cloner(modele, { nom: `${modele.nom.split('/')[0]}/${nom}`, valeurs: Object.fromEntries(modes.map((mode) => [mode.id, { alias: cible.cle }])) });
}

function m1(base: ComposantDeBase, registre: Registre, deuxModes: () => ComposantDeBase, reduit: (palettes: number) => ComposantDeBase | undefined): void {
  const carte = base.carte;
  const anneau = (b: ComposantDeBase, variant: VariantDeCarte): LiaisonAttendue => liaisonDeCible(b.carte, variant.id, 'anneau')!;
  const attenduC21 = (variant: string, layer: string, champ: string): ConstatAttendu => attendu('C21', 'a-faire', { variant, layer, champ, token: '' });
  const theme = (degradation: Degradation, nom: string): VariableDuCatalogue => degradation.variableParNom(`neutral/${nom}`)!;
  const jeton = (b: ComposantDeBase, variant: VariantDeCarte, role: 'ring' | 'icon' | 'foreground') => jetonCouleur(b.carte, variant, role)!;

  /** Lie `Ring` strokes d'un variant à un intrus de cible `nom`. */
  const intrus = (degradation: Degradation, b: ComposantDeBase, variant: VariantDeCarte, rang: number, nom: string): void => {
    const modele = degradation.variable(jeton(b, variant, 'ring').cle);
    degradation.lierA(anneau(b, variant), cloneVers(degradation, modele, `intrus-${rang}`, theme(degradation, nom)));
  };
  const ajouter = (description: string, degradation: Degradation, attendus: ConstatAttendu[]): void =>
    ajouterAvecCodes(registre, 'M1', degradation, { description: `M1 : ${description}`, attendus }, CODES_DE_M1);

  if (carte.variants.length < 3) return;
  // 1. Un intrus : un variant lié à un token d'une autre cible de thème, sans axe dans son nom.
  {
    const variant = registre.tirer('M1', carte.variants);
    const degradation = new Degradation(base);
    intrus(degradation, base, variant, 1, 'surface/border');
    ajouter(`un intrus, Ring du variant ${variant.nom}`, degradation, [attenduC21(variant.id, anneau(base, variant).layer, 'strokes')]);
  }
  // 2. Deux intrus, deux cibles différentes.
  {
    const deux = [registre.tirer('M1', carte.variants), carte.variants.at(-1)!];
    const [premier, second] = deux[0] === deux[1] ? [deux[0], carte.variants[0]] : deux;
    const degradation = new Degradation(base);
    intrus(degradation, base, premier, 1, 'surface/border');
    intrus(degradation, base, second, 2, 'surface/divider');
    ajouter(`deux intrus, Ring des variants ${premier.nom} et ${second.nom}`, degradation,
      [premier, second].map((variant) => attenduC21(variant.id, anneau(base, variant).layer, 'strokes')));
  }
  // 3. Un intrus dont le token porte les valeurs de son variant : C21 se tait.
  {
    const variant = registre.tirer('M1', carte.variants);
    const degradation = new Degradation(base);
    degradation.lierA(anneau(base, variant), degradation.variable(jeton(base, variant, 'foreground').cle));
    ajouter(`un intrus qui porte les valeurs de son variant, Ring du variant ${variant.nom}`, degradation, []);
  }
  // 4 et 5. Un jeu de 3 variants (majorité de 2, donc un C21), puis un jeu de 2 variants (pas de majorité, donc silence).
  for (const [palettes, rang] of [[3, 4], [2, 5]] as const) {
    const petite = reduit(palettes);
    if (!petite) continue;
    const variant = registre.tirer('M1', petite.carte.variants);
    const degradation = new Degradation(petite);
    intrus(degradation, petite, variant, rang, 'surface/border');
    ajouter(`jeu de ${palettes} variants, un intrus sur Ring du variant ${variant.nom}`, degradation,
      palettes === 3 ? [attenduC21(variant.id, anneau(petite, variant).layer, 'strokes')] : []);
  }
  // 6. Égalité : la moitié des variants lie un autre token, aucune majorité stricte.
  if (carte.variants.length % 2 === 0) {
    const degradation = new Degradation(base);
    const moitie = carte.variants.slice(0, carte.variants.length / 2);
    const commun = cloneVers(degradation, degradation.variable(jeton(base, moitie[0], 'ring').cle), 'intrus-6', theme(degradation, 'surface/border'));
    for (const variant of moitie) degradation.lierA(anneau(base, variant), commun);
    ajouter(`égalité de ${moitie.length} contre ${moitie.length}, Ring`, degradation, []);
  }
  // 7 à 9. Un champ dont les tokens varient d'un variant à l'autre : tous sont d'abord liés à un token commun, un seul à un intrus.
  const alignes = (description: string, liaisonDe: (variant: VariantDeCarte) => LiaisonAttendue | undefined, nature: 'couleur' | 'taille', champDeLaCarte: string): void => {
    if (!liaisonDe(carte.variants[0])) return;
    const variant = registre.tirer('M1', carte.variants);
    const degradation = new Degradation(base);
    const modele = degradation.variable(liaisonDe(variant)!.cle);
    const [communeCible, intrusCible] = nature === 'couleur'
      ? [theme(degradation, 'surface/foreground'), theme(degradation, 'page/foreground')]
      : degradation.catalogue.variables.filter((variable) => variable.type === 'FLOAT' && degradation.catalogue.collections.find((collection) => collection.cle === variable.collection)?.role === 'layout').slice(0, 2);
    const commun = cloneVers(degradation, modele, 'commun', communeCible);
    const autre = cloneVers(degradation, modele, 'intrus', intrusCible);
    for (const entree of carte.variants) degradation.lierA(liaisonDe(entree)!, entree === variant ? autre : commun);
    ajouter(`${description} du variant ${variant.nom}`, degradation, [attenduC21(variant.id, liaisonDe(variant)!.layer, champDeLaCarte)]);
  };
  alignes('intrus sur la surcharge de Glyph', (variant) => carte.liaisons.find((l) => l.variant === variant.id && l.nomDuLayer === 'Glyph' && l.surcharge !== undefined), 'couleur', 'fills');
  alignes('intrus sur paddingLeft de Root', (variant) => carte.liaisons.find((l) => l.variant === variant.id && l.nomDuLayer === 'Root' && l.champ === 'paddingLeft'), 'taille', 'paddingLeft');
  alignes('intrus sur la plage de texte de Label', (variant) => liaisonDeCible(carte, variant.id, 'texte'), 'couleur', 'fills');
  // 10. Un token à deux modes dont un seul vise une autre cible : sa signature diffère.
  {
    const deux = deuxModes();
    const variant = registre.tirer('M1', deux.carte.variants);
    const degradation = new Degradation(deux);
    const modele = degradation.variable(jeton(deux, variant, 'ring').cle);
    const [mode1, mode2] = Object.keys(modele.valeurs!);
    const clone = degradation.cloner(modele, { nom: `${modele.nom.split('/')[0]}/intrus-10`, valeurs: { [mode1]: modele.valeurs![mode1], [mode2]: { alias: theme(degradation, 'surface/border').cle } } });
    degradation.lierA(anneau(deux, variant), clone);
    ajouter(`intrus dans un seul des deux modes, Ring du variant ${variant.nom}`, degradation, [attenduC21(variant.id, anneau(deux, variant).layer, 'strokes')]);
  }
}

// ---------------------------------------------------------------------------------------------------------------------------
// M2. La propagation

/** La clé d'une liaison retirée : variant, nom du layer, champ, indice, début de plage. */
const cleDeLaLiaison = (l: LiaisonAttendue): string => [l.variant, l.nomDuLayer, l.champ, l.indice ?? '', l.plage?.debut ?? ''].join('|');

/** Les liaisons du composant que la propagation reprend : celles du layer, ni héritées ni portées par une surcharge. */
const proposables = (carte: CarteDuComposant, variant: string): LiaisonAttendue[] =>
  carte.liaisons.filter((liaison) => liaison.variant === variant && liaison.origine === 'composant' && liaison.surcharge === undefined);

/**
 * Ce que l'oracle attend de la propagation depuis le modèle : un C24 avec correction vers le token du variant visé pour chaque
 * liaison retirée, et un C81 par sorte dont au moins une liaison manque, sur le premier layer du modèle concerné.
 */
function attendusDePropagation(carte: CarteDuComposant, modele: string, retirees: ReadonlySet<string>): ConstatAttendu[] {
  const attendus: ConstatAttendu[] = [];
  const premieresCouches = new Map<string, string>();
  for (const liaisonDuModele of proposables(carte, modele)) {
    for (const vise of carte.variants) {
      if (vise.id === modele) continue;
      const juste = proposables(carte, vise.id).find((liaison) => liaison.nomDuLayer === liaisonDuModele.nomDuLayer && liaison.champ === liaisonDuModele.champ
        && liaison.indice === liaisonDuModele.indice && liaison.plage?.debut === liaisonDuModele.plage?.debut);
      if (!juste || !retirees.has(cleDeLaLiaison(juste))) continue;
      attendus.push(attendu('C24', 'correction', lieuDe(juste, ''), { apres: { cle: juste.cle, nom: juste.nom } }));
      if (!premieresCouches.has(juste.nature)) premieresCouches.set(juste.nature, liaisonDuModele.layer);
    }
  }
  for (const [nature, layer] of premieresCouches) {
    attendus.push({ code: 'C81', cle: [modele, layer, '', '', '', nature === 'couleur' ? 'liaisons' : 'tailles'].join('|'), forme: 'a-faire' });
  }
  return attendus.sort((a, b) => (a.code === 'C81' ? 1 : 0) - (b.code === 'C81' ? 1 : 0));
}

export function operateursModele(base: ComposantDeBase, graine: number = GRAINE_PAR_DEFAUT): CasDeComposant[] {
  const registre = new Registre(base, graine);
  const carte = base.carte;

  const memoire = new Map<string, ComposantDeBase | undefined>();
  const deuxModes = (): ComposantDeBase => {
    if (base.spec.modesDeTaille === 2) return base;
    if (!memoire.has('2 modes')) memoire.set('2 modes', construireLeComposant({ ...base.spec, modesDeTaille: 2 }));
    return memoire.get('2 modes')!;
  };
  /** La base à `palettes` variants, sur l'axe de palette si le jeu en a un, sinon sur son premier axe. */
  const reduit = (palettes: number): ComposantDeBase | undefined => {
    const cle = `reduit ${palettes}`;
    if (!memoire.has(cle)) {
      const axe = axeDeSegment(carte, 'palette') ?? carte.axes[0];
      const spec = axe && base.spec.axes.find((entree) => entree.nom === axe.propriete);
      memoire.set(cle, spec && spec.valeurs.length >= palettes
        ? construireLeComposant({ ...base.spec, axes: [{ ...spec, valeurs: spec.valeurs.slice(0, palettes) }], exclus: undefined })
        : undefined);
    }
    return memoire.get(cle);
  };
  m1(base, registre, deuxModes, reduit);

  if (carte.variants.length < 3) return registre.cas;
  const modele = carte.variants[0];
  const autres = carte.variants.slice(1);

  /** Retire les liaisons proposables des variants visés que `filtre` retient : leurs peintures restent en dur. */
  const nus = (degradation: Degradation, visees: readonly VariantDeCarte[], filtre: (liaison: LiaisonAttendue) => boolean = () => true): Set<string> => {
    const retirees = new Set<string>();
    for (const vise of visees) {
      for (const liaison of proposables(carte, vise.id)) {
        if (!filtre(liaison)) continue;
        delier(degradation, liaison);
        retirees.add(cleDeLaLiaison(liaison));
      }
    }
    return retirees;
  };
  const ajouter = (degradation: Degradation, description: string, attendus: ConstatAttendu[]): void => {
    ajouterAvecCodes(registre, 'M2', degradation, { description: `M2 : ${description}`, attendus }, CODES_DE_M2);
    Object.assign(registre.cas.at(-1)!.entree, { modele: modele.id });
  };
  const fond = (liaison: LiaisonAttendue): boolean => liaison.nomDuLayer === 'Root' && liaison.champ === 'fills';
  const racine = (variant: VariantDeCarte): LiaisonAttendue => liaisonDeCible(carte, variant.id, 'fond')!;
  const complet = (degradation: Degradation, visees: readonly VariantDeCarte[], filtre?: (liaison: LiaisonAttendue) => boolean) =>
    attendusDePropagation(carte, modele.id, nus(degradation, visees, filtre));

  // 1 à 5. Des variants nus : tous, un seul, les couleurs, les tailles, deux modèles à égalité.
  {
    const degradation = new Degradation(base);
    ajouter(degradation, `modèle complet, ${autres.length} variants nus`, complet(degradation, autres));
  }
  {
    const variant = registre.tirer('M2', autres);
    const degradation = new Degradation(base);
    ajouter(degradation, `modèle complet, le variant ${variant.nom} nu`, complet(degradation, [variant]));
  }
  {
    const degradation = new Degradation(base);
    ajouter(degradation, 'couleurs nues dans les autres variants', complet(degradation, autres, (liaison) => liaison.nature === 'couleur'));
  }
  {
    const degradation = new Degradation(base);
    ajouter(degradation, 'tailles nues dans les autres variants', complet(degradation, autres, (liaison) => liaison.nature === 'taille'));
  }
  {
    const degradation = new Degradation(base);
    ajouter(degradation, `deux modèles à égalité (${modele.nom} et ${autres[0].nom}), les autres variants nus`, complet(degradation, autres.slice(1)));
  }

  // 6. Un layer propre au modèle : aucun constat ne sort pour les variants qui ne l'ont pas (Q-F3-7).
  {
    const degradation = new Degradation(base);
    const extra = ajouterUnLayer(degradation, modele.id, { nom: 'Badge', type: 'FRAME', peintures: [peintureUnie('fills')] });
    lierLaPeinture(degradation, modele.id, extra, 'fills', degradation.variable(jetonCouleur(carte, modele, 'background')!.cle));
    ajouter(degradation, `layer Badge propre au modèle ${modele.nom}`, []);
  }
  // 7. Deux layers homonymes sous le parent dans un variant visé : l'homologue est ambigu, une question sans candidat (Q-F3-7).
  // La question nomme les homonymes du variant visé, dont le premier est le layer de la base.
  if (carte.variants[0].layers.Icon) {
    const variant = registre.tirer('M2', autres);
    const degradation = new Degradation(base);
    const premier = degradation.layer(variant.id, 'Icon');
    ajouterUnLayer(degradation, variant.id, { nom: 'Icon', type: 'VECTOR', peintures: [peintureUnie('fills')] });
    ajouter(degradation, `deux layers Icon dans le variant ${variant.nom}`,
      [attendu('C24', 'question', { variant: variant.id, layer: premier.id, champ: 'fills', token: '' }, { candidats: [] })]);
  }
  // 8. Un variant nu sauf le fond de Root, déjà lié au bon token : rien pour cette liaison.
  {
    const variant = registre.tirer('M2', autres);
    const degradation = new Degradation(base);
    ajouter(degradation, `variant ${variant.nom} nu, sauf le fond de Root déjà lié au bon token`, complet(degradation, [variant], (liaison) => !fond(liaison)));
  }
  // 9. Le fond de Root d'un variant visé est lié à un autre token : la propagation ne l'écrase pas (Q-F3-6).
  {
    const variant = registre.tirer('M2', autres);
    const degradation = new Degradation(base);
    const juste = jetonCouleur(carte, variant, 'background')!;
    const autre = carte.axes.flatMap((axe) => axe.valeurs.map((valeur) => jetonCouleur(carte, variant, 'background', { [axe.propriete]: valeur })))
      .find((jeton) => jeton !== undefined && jeton.cle !== juste.cle);
    if (autre) {
      degradation.lierA(racine(variant), degradation.variable(autre.cle));
      ajouter(degradation, `fond de Root du variant ${variant.nom} lié à ${autre.nom}`, []);
    }
  }
  // 10. Le token du modèle porte un nom que la grammaire ne lit pas : la propagation ne le recopie pas (Q-F3-6).
  {
    const degradation = new Degradation(base);
    const source = degradation.variable(jetonCouleur(carte, modele, 'background')!.cle);
    degradation.lierA(racine(modele), degradation.cloner(source, { nom: `${source.nom.split('/')[0]}/color/fond-libre` }));
    nus(degradation, autres, fond);
    ajouter(degradation, 'fond de Root du modèle lié à un token au nom illisible, fonds des autres variants nus', []);
  }
  // 11. Le modèle lie son fond directement à theme : la propagation ne le recopie pas (Q-F3-6).
  {
    const degradation = new Degradation(base);
    const direct = degradation.variable(jetonCouleur(carte, modele, 'background')!.cible.cle);
    degradation.lierA(racine(modele), direct);
    nus(degradation, autres, fond);
    ajouter(degradation, `fond de Root du modèle lié directement à theme/${direct.nom}, fonds des autres variants nus`, []);
  }
  // 12. Deux variables portent le nom visé : une question à deux candidats, aucune correction.
  {
    const variant = registre.tirer('M2', autres);
    const degradation = new Degradation(base);
    const juste = degradation.variable(racine(variant).cle);
    nus(degradation, [variant], fond);
    degradation.cloner(juste);
    ajouter(degradation, `deux variables de nom ${juste.nom} pour le fond du variant ${variant.nom}`,
      [attendu('C24', 'question', lieuDe(racine(variant), ''), { candidats: [juste.nom, juste.nom] })]);
  }
  // 13. La variable du modèle n'est pas chargée : la propagation ne lit pas ce qu'elle ne peut pas lire.
  {
    const degradation = new Degradation(base);
    degradation.fixer(degradation.variable(racine(modele).cle), 'etat', 'non-chargee');
    nus(degradation, autres, fond);
    ajouter(degradation, 'variable du fond du modèle non chargée, fonds des autres variants nus', []);
  }
  // 14. La peinture manque chez le variant visé : aucun constat ne sort (Q-F3-7).
  {
    const variant = registre.tirer('M2', autres);
    const degradation = new Degradation(base);
    const layer = degradation.layer(variant.id, 'Root');
    delier(degradation, racine(variant));
    degradation.retirer(layer.peintures, layer.peintures.find((peinture) => peinture.champ === 'fills')!);
    ajouter(degradation, `fond de Root du variant ${variant.nom} sans peinture`, []);
  }
  // 15. Les plages de texte du variant visé ne sont pas celles du modèle : la correction reprend celles du modèle.
  {
    const variant = registre.tirer('M2', autres);
    const degradation = new Degradation(base);
    const retirees = nus(degradation, [variant], (liaison) => liaison.nomDuLayer === 'Label');
    const label = degradation.layer(variant.id, 'Label');
    const decalees = [{ debut: 0, fin: 4 }, { debut: 4, fin: 10 }].map((plage) => ({ ...plage, fontSize: 14, fontWeight: 500, peintures: [peintureUnie('fills')], liaisons: [] }));
    degradation.fixer(label.texte!, 'plages', decalees);
    ajouter(degradation, `plages de texte de Label du variant ${variant.nom} décalées`, attendusDePropagation(carte, modele.id, retirees));
  }
  // 16. La surcharge de Glyph du modèle n'est jamais propagée.
  if (carte.variants[0].layers.Glyph) {
    const variant = registre.tirer('M2', autres);
    const degradation = new Degradation(base);
    const surcharge = carte.liaisons.find((liaison) => liaison.variant === variant.id && liaison.nomDuLayer === 'Glyph' && liaison.surcharge !== undefined)!;
    delier(degradation, surcharge);
    ajouter(degradation, `surcharge de Glyph du variant ${variant.nom} retirée`, []);
  }
  return registre.cas;
}

/**
 * Les opérateurs de dégradation de la lecture et des entrées (X1 et X2) des stress tests F3.
 *
 * X1 : une lecture partielle (variant ou layers non lus, peinture mixte, liaison illisible, variable absente, non chargée ou
 * inaccessible, catalogue sans `components`, `components` inaccessible, catalogue vide). La propriété P18 veut qu'aucun constat de la
 * portée ne vise ce que la lecture n'a pas établi : le cas n'attend donc aucun constat, et tout constat émis est un faux constat.
 * Les cas qui lient une variable absente ou non lue la lient d'abord à un token d'une autre valeur d'axe, pour qu'un contrôle qui
 * lirait quand même le nom de la liaison accuse. Le cas du fond illisible lie le texte à `theme` : C80 accuse alors cette liaison
 * directe, c'est un autre opérateur (K2), donc C80 n'est pas jugé ici.
 *
 * X2 : une entrée dégradée (cycle de `parent`, identifiants dupliqués, nom de jeu vide, variable sans valeurs, alias en cycle, nom
 * vide…). La propriété P17 veut qu'aucun contrôle ne lève : le cas n'attend rien et ne juge aucun code (`codesJuges` vide), puisque
 * l'entrée est fausse et que ses constats ne relèvent pas de ce plan. C'est l'absence d'exception que le harnais mesure.
 */
import type { LayerLu, LiaisonLue, VariableDuCatalogue } from '../../../src/controles/index.js';
import type { JetonDeCarte, VariantDeCarte } from './carte.js';
import { CODES_DE_LA_PORTEE, GRAINE_PAR_DEFAUT, type ComposantDeBase } from './composantDeBase.js';
import {
  axeDeSegment, CIBLES, Degradation, jetonCouleur, liaisonDeCible, Registre, type CasDeComposant, type NomDeCible,
} from './operateursAxes.js';
import { ajouterAvecCodes, ajouterUnLayer, delierLaCible, peintureUnie } from './operateursPeinture.js';

const CODES_DE_X1: readonly string[] = CODES_DE_LA_PORTEE;
const CODES_DE_X1_SANS_C80: readonly string[] = CODES_DE_LA_PORTEE.filter((code) => code !== 'C80');

/** Le token de même rôle que la cible, pour une autre valeur du premier axe qui en a une ; il peut manquer à un jeu sans axe. */
function tokenDUneAutreValeur(degradation: Degradation, variant: VariantDeCarte, cible: NomDeCible): JetonDeCarte | undefined {
  for (const role of ['etat', 'palette', 'style', 'taille'] as const) {
    const axe = axeDeSegment(degradation.carte, role);
    const autre = axe?.valeurs.find((valeur) => valeur !== variant.valeurs[axe.propriete]);
    if (!axe || autre === undefined) continue;
    const jeton = jetonCouleur(degradation.carte, variant, CIBLES[cible].role, { [axe.propriete]: autre });
    if (jeton) return jeton;
  }
  return undefined;
}

/** Rend la liaison illisible : seul l'identifiant de la variable est sûr. */
function rendreIllisible(degradation: Degradation, liaison: LiaisonLue): void {
  degradation.fixer(liaison, 'illisible', true);
  degradation.fixer(liaison, 'variable', { id: liaison.variable.id, cle: '', nom: '', collection: '', distante: false });
}

export function operateursEntrees(base: ComposantDeBase, graine: number = GRAINE_PAR_DEFAUT): CasDeComposant[] {
  const registre = new Registre(base, graine);
  const carte = base.carte;

  const x1 = (
    degradation: Degradation, description: string, variant: VariantDeCarte, champ: string, layer: string,
    codes: readonly string[] = CODES_DE_X1,
  ): void => {
    degradation.zones.push({ variant: variant.id, layer, champ });
    ajouterAvecCodes(registre, 'X1', degradation, { description: `X1 : ${description}, variant ${variant.nom}`, attendus: [] }, codes);
  };
  /** Lie la cible à un token d'une autre valeur d'axe et rend ce token. */
  const mallier = (degradation: Degradation, variant: VariantDeCarte, cible: NomDeCible): VariableDuCatalogue | undefined => {
    const liaison = liaisonDeCible(carte, variant.id, cible);
    const mauvais = tokenDUneAutreValeur(degradation, variant, cible);
    if (!liaison || !mauvais) return undefined;
    degradation.lierA(liaison, degradation.variable(mauvais.cle));
    return degradation.variable(mauvais.cle);
  };

  // X1. Lecture partielle : douze cas, aucune accusation sur ce que la lecture n'a pas établi.
  {
    const variant = registre.tirer('X1', carte.variants);
    const degradation = new Degradation(base);
    const lu = degradation.releve.variants.find((entree) => entree.id === variant.id)!;
    degradation.retirer(degradation.releve.variants, lu);
    degradation.inserer(degradation.releve.lecture.variantsNonLus, variant.id);
    x1(degradation, 'variant non lu, absent des variants', variant, 'variants', variant.layers.Root!);
  }
  {
    const variant = registre.tirer('X1', carte.variants);
    const degradation = new Degradation(base);
    degradation.fixer(degradation.releve.lecture, 'layersNonLus', 'inconnu');
    x1(degradation, 'nombre de layers non lus inconnu', variant, 'layersNonLus', variant.layers.Root!);
  }
  {
    const variant = registre.tirer('X1', carte.variants);
    const degradation = new Degradation(base);
    const texte = delierLaCible(degradation, variant.id, 'texte');
    if (texte) degradation.inserer(degradation.releve.lecture.manquees, { layer: texte.id, champ: 'fills', motif: 'peintures mixtes ou illisibles' });
    x1(degradation, 'peinture mixte sur le texte Label', variant, 'fills', variant.layers.Label!);
  }
  {
    // C59 : le texte se lie à `surface/foreground` pendant que le fond de Root est illisible.
    const variant = registre.tirer('X1', carte.variants);
    const degradation = new Degradation(base);
    const fond = degradation.liaison(liaisonDeCible(carte, variant.id, 'fond')!);
    rendreIllisible(degradation, fond);
    const thematique = degradation.variableParNom('primary/surface/foreground');
    if (thematique) degradation.lierA(liaisonDeCible(carte, variant.id, 'texte')!, thematique);
    x1(degradation, 'liaison illisible sur le fond de Root, texte lié à surface/foreground', variant, 'fills', variant.layers.Root!, CODES_DE_X1_SANS_C80);
  }
  {
    // C21 : une liaison de la fratrie des Ring devient illisible.
    const variant = registre.tirer('X1', carte.variants);
    const degradation = new Degradation(base);
    rendreIllisible(degradation, degradation.liaison(liaisonDeCible(carte, variant.id, 'anneau')!));
    x1(degradation, 'liaison illisible sur Ring dans la fratrie', variant, 'strokes', variant.layers.Ring!);
  }
  {
    // C25 : une peinture en dur dont la liaison est illisible.
    const variant = registre.tirer('X1', carte.variants);
    const degradation = new Degradation(base);
    const titre = ajouterUnLayer(degradation, variant.id, { nom: 'title', type: 'TEXT', peintures: [peintureUnie('fills')] });
    degradation.inserer(titre.liaisons, {
      champ: 'fills', indice: 0, porteur: titre.id, illisible: true, variable: { id: 'VariableID:99999:0', cle: '', nom: '', collection: '', distante: false },
    });
    x1(degradation, 'liaison illisible sur la peinture du texte title', variant, 'fills', titre.id);
  }
  {
    const variant = registre.tirer('X1', carte.variants);
    const degradation = new Degradation(base);
    const mauvaise = mallier(degradation, variant, 'fond');
    if (mauvaise) degradation.retirer(degradation.catalogue.variables, mauvaise);
    x1(degradation, 'variable liée absente du catalogue', variant, 'fills', variant.layers.Root!);
  }
  for (const etat of ['non-chargee', 'inaccessible'] as const) {
    const variant = registre.tirer('X1', carte.variants);
    const degradation = new Degradation(base);
    const mauvaise = mallier(degradation, variant, 'icone');
    if (mauvaise) degradation.fixer(mauvaise, 'etat', etat);
    x1(degradation, `variable liée ${etat}`, variant, 'fills', variant.layers.Icon!);
  }
  {
    const variant = registre.tirer('X1', carte.variants);
    const degradation = new Degradation(base);
    mallier(degradation, variant, 'fond');
    const composants = degradation.catalogue.collections.find((collection) => collection.role === 'components')!;
    degradation.retirer(degradation.catalogue.collections, composants);
    x1(degradation, 'catalogue sans collection components', variant, 'fills', variant.layers.Root!);
  }
  {
    const variant = registre.tirer('X1', carte.variants);
    const degradation = new Degradation(base);
    mallier(degradation, variant, 'fond');
    degradation.fixer(degradation.catalogue.collections.find((collection) => collection.role === 'components')!, 'etat', 'inaccessible');
    x1(degradation, 'collection components inaccessible', variant, 'fills', variant.layers.Root!);
  }
  {
    const variant = registre.tirer('X1', carte.variants);
    const degradation = new Degradation(base);
    mallier(degradation, variant, 'fond');
    degradation.fixer(degradation.catalogue, 'variables', []);
    degradation.fixer(degradation.catalogue, 'collections', []);
    x1(degradation, 'catalogue vide', variant, 'fills', variant.layers.Root!);
  }

  // X2. Entrées dégradées : douze cas, aucune exception.
  const x2 = (degradation: Degradation, description: string, variant: VariantDeCarte, champ: string, layer: string): void => {
    degradation.zones.push({ variant: variant.id, layer, champ });
    ajouterAvecCodes(registre, 'X2', degradation, { description: `X2 : ${description}, variant ${variant.nom}`, attendus: [] }, []);
  };
  const jetonCouleurDuVariant = (degradation: Degradation, variant: VariantDeCarte): VariableDuCatalogue =>
    degradation.variable(jetonCouleur(carte, variant, 'background')!.cle);
  const premier = (): VariantDeCarte => registre.tirer('X2', carte.variants);
  {
    const variant = premier();
    const degradation = new Degradation(base);
    const racine = degradation.layer(variant.id, 'Root');
    degradation.fixer(racine, 'parent', variant.layers.Label!);
    x2(degradation, 'cycle de parent entre Root et Label', variant, 'parent', racine.id);
  }
  {
    const variant = premier();
    const degradation = new Degradation(base);
    const label = degradation.layer(variant.id, 'Label');
    const lu = degradation.releve.variants.find((entree) => entree.id === variant.id)!;
    degradation.inserer(lu.layers, structuredClone(label) as LayerLu);
    x2(degradation, 'deux layers de même identifiant', variant, 'id', label.id);
  }
  {
    const variant = premier();
    const degradation = new Degradation(base);
    const autre = degradation.releve.variants.find((entree) => entree.id !== variant.id)!;
    degradation.fixer(autre, 'id', variant.id);
    x2(degradation, 'deux variants de même identifiant', variant, 'id', variant.layers.Root!);
  }
  {
    const variant = premier();
    const degradation = new Degradation(base);
    degradation.fixer(degradation.releve.jeu, 'nom', '');
    x2(degradation, 'nom du jeu vide', variant, 'nom', variant.layers.Root!);
  }
  {
    const variant = premier();
    const degradation = new Degradation(base);
    degradation.fixer(degradation.releve, 'proprietes', []);
    x2(degradation, 'propriétés vides', variant, 'proprietes', variant.layers.Root!);
  }
  {
    const variant = premier();
    const degradation = new Degradation(base);
    degradation.fixer(degradation.releve.variants.find((entree) => entree.id === variant.id)!, 'layers', []);
    x2(degradation, 'variant sans layer', variant, 'layers', variant.layers.Root!);
  }
  {
    const variant = premier();
    const degradation = new Degradation(base);
    degradation.fixer(jetonCouleurDuVariant(degradation, variant), 'valeurs', undefined);
    x2(degradation, 'variable sans valeurs', variant, 'valeurs', variant.layers.Root!);
  }
  {
    const variant = premier();
    const degradation = new Degradation(base);
    const a = jetonCouleurDuVariant(degradation, variant);
    const b = degradation.variable(jetonCouleur(carte, variant, 'border')!.cle);
    const modes = degradation.catalogue.collections.find((collection) => collection.role === 'components')!.modes;
    degradation.fixer(a, 'valeurs', Object.fromEntries(modes.map((mode) => [mode.id, { alias: b.cle }])));
    degradation.fixer(b, 'valeurs', Object.fromEntries(modes.map((mode) => [mode.id, { alias: a.cle }])));
    x2(degradation, 'alias en cycle entre deux tokens', variant, 'valeurs', variant.layers.Root!);
  }
  {
    const variant = premier();
    const degradation = new Degradation(base);
    degradation.fixer(jetonCouleurDuVariant(degradation, variant), 'collection', 'col-orpheline');
    x2(degradation, 'variable dont la collection est inconnue', variant, 'collection', variant.layers.Root!);
  }
  {
    const variant = premier();
    const degradation = new Degradation(base);
    const jeton = jetonCouleurDuVariant(degradation, variant);
    const copie = degradation.cloner(jeton);
    degradation.fixer(copie, 'cle', jeton.cle);
    x2(degradation, 'clé de variable en double', variant, 'cle', variant.layers.Root!);
  }
  {
    const variant = premier();
    const degradation = new Degradation(base);
    degradation.fixer(jetonCouleurDuVariant(degradation, variant), 'nom', '');
    x2(degradation, 'nom de variable vide', variant, 'nom', variant.layers.Root!);
  }
  {
    const variant = premier();
    const degradation = new Degradation(base);
    degradation.fixer(jetonCouleurDuVariant(degradation, variant), 'nom', 'Button');
    x2(degradation, 'nom de variable d\'un seul segment', variant, 'nom', variant.layers.Root!);
  }
  return registre.cas;
}

/**
 * Les faux positifs des stress tests F3 et F4 (section A du plan) : des composants écrits justes, dont aucun contrôle de la portée ne
 * doit rien dire. Le cas `A0-<n>` est le n-ième des 96 profils de base (P1) ; les cas `A1` à `A9` sont les 43 thèmes ciblés de la
 * section 4. Chaque thème part de `button-36` (P0) ou de la forme qu'il nomme, y ajoute ce qu'il teste et n'attend aucun constat :
 * tout code de la portée émis est un faux constat.
 *
 * Les cas A0 ne dégradent rien : leur composant est le profil lui-même, sans zone. Les thèmes A1 reconstruisent le composant avec
 * l'écriture de valeur d'axe qu'ils testent, donc leur base est la reconstruction et leur dégradation une copie sans écriture. Les
 * autres thèmes ajoutent des layers, des tokens ou des états de lecture, et `annuler` les retire. Les quatre rôles de A2 qui
 * dépendent de Q-F3-3 (`divider`, `inverse`, `ring` en fond) sont tranchés : un rôle `divider` ou `ring` se pose sur le layer que son nom
 * désigne (`Divider`, `Separator`, `Ring`, `Focus ring`), `inverse` colore n'importe quel layer.
 *
 * Les tokens qu'un thème ajoute portent un segment d'élément (`button/color/<élément>/…/<rôle>`), pour qu'ils ne reprennent pas le
 * nom d'un token de la base ; leurs scopes sont `ALL_SCOPES` quand le thème ne teste pas le scope, pour ne pas mêler C18 à un rôle.
 */
import type { LayerLu, LiaisonLue, VariableDuCatalogue } from '../../../src/controles/index.js';
import type { RoleDeCouleur, VariantDeCarte } from './carte.js';
import {
  CODES_DE_LA_PORTEE, construireLeComposant, GRAINE_PAR_DEFAUT, type AxeDeSpec, type ComposantDeBase,
} from './composantDeBase.js';
import {
  axeDeSegment, Degradation, jetonCouleur, liaisonDeCible, Registre, variableLue, type CasDeComposant,
} from './operateursAxes.js';
import { ajouterAvecCodes, ajouterUnLayer, lierLaPeinture, peintureUnie, type SpecDeLayer } from './operateursPeinture.js';
import { composantDuProfil, JEUX_DE_VARIANTS, PROFILS_DE_BASE, type ProfilDeBase } from './profils.js';

const FAMILLE_DE_A = 'A';

// ---------------------------------------------------------------------------------------------------------------------------
// A0 : les 96 profils

/** Un cas par profil : le composant du profil lui-même, sans dégradation ni zone. */
export function fauxPositifsDesProfils(profils: readonly ProfilDeBase[] = PROFILS_DE_BASE, graine: number = GRAINE_PAR_DEFAUT): CasDeComposant[] {
  return profils.map((profil, rang) => {
    const composant = composantDuProfil(profil, graine);
    return {
      id: `A0-${rang + 1}`, famille: FAMILLE_DE_A, operateur: 'A0', verdict: 'attendu', attendus: [], codesJuges: CODES_DE_LA_PORTEE,
      entree: { composant, base: composant, annuler: () => undefined, zones: [], description: `A0 : profil ${profil.id} (${profil.forme}, ${profil.scopes}, ${profil.imbriques ? 'avec' : 'sans'} imbriqués, ${profil.plages} plage(s), ${profil.modesDeTaille} mode(s))` },
    };
  });
}

// ---------------------------------------------------------------------------------------------------------------------------
// Gestes

/** Un token qui reprend celui d'un rôle pour ce variant, avec un segment d'élément et ces scopes, sous le nom de rôle donné. */
function tokenAElement(
  degradation: Degradation, variant: VariantDeCarte, roleDuModele: RoleDeCouleur, element: string, nomDuRole: string, scopes: string[],
): VariableDuCatalogue {
  const modele = degradation.variable(jetonCouleur(degradation.carte, variant, roleDuModele)!.cle);
  const segments = modele.nom.split('/');
  segments.splice(2, 0, element);
  segments[segments.length - 1] = nomDuRole;
  return degradation.cloner(modele, { nom: segments.join('/'), scopes });
}

/** Un layer peint et lié : la peinture est unie, visible et sa liaison porte le token. */
function layerLie(degradation: Degradation, variant: VariantDeCarte, spec: Omit<SpecDeLayer, 'peintures'>, champ: 'fills' | 'strokes', variable: VariableDuCatalogue): LayerLu {
  const layer = ajouterUnLayer(degradation, variant.id, { ...spec, peintures: [peintureUnie(champ)] });
  lierLaPeinture(degradation, variant.id, layer, champ, variable);
  return layer;
}

/** Un texte dont l'unique plage est liée au token. */
function texteLie(degradation: Degradation, variant: VariantDeCarte, nom: string, variable: VariableDuCatalogue): LayerLu {
  const layer = ajouterUnLayer(degradation, variant.id, { nom, type: 'TEXT' });
  const liaison: LiaisonLue = { champ: 'fills', plage: { debut: 0, fin: 5 }, porteur: layer.id, variable: variableLue(variable) };
  degradation.inserer(layer.liaisons, liaison);
  degradation.inserer(layer.texte!.plages, { debut: 0, fin: 5, fontSize: 14, fontWeight: 500, peintures: [peintureUnie('fills')], liaisons: [liaison] });
  return layer;
}

/** Remplace le premier segment du nom des tokens du jeu et des liaisons qui les portent. */
function renommerLePrefixe(degradation: Degradation, ancien: string, nouveau: string): void {
  const reecrire = (nom: string): string => [nouveau, ...nom.split('/').slice(1)].join('/');
  for (const variable of degradation.catalogue.variables) {
    if (variable.nom.split('/')[0] === ancien) degradation.fixer(variable, 'nom', reecrire(variable.nom));
  }
  const liaisons = (layer: LayerLu): LiaisonLue[] => [...layer.liaisons, ...(layer.texte?.plages ?? []).flatMap((plage) => plage.liaisons)];
  for (const variant of degradation.releve.variants) {
    for (const layer of variant.layers) {
      for (const liaison of liaisons(layer)) {
        if (liaison.variable.nom.split('/')[0] === ancien) degradation.fixer(liaison.variable, 'nom', reecrire(liaison.variable.nom));
      }
    }
  }
}

const modesDesComposants = (degradation: Degradation) => degradation.catalogue.collections.find((collection) => collection.role === 'components')!.modes;

// ---------------------------------------------------------------------------------------------------------------------------
// Thèmes ciblés

export function fauxPositifsCibles(base: ComposantDeBase, graine: number = GRAINE_PAR_DEFAUT): CasDeComposant[] {
  const registre = new Registre(base, graine, FAMILLE_DE_A);
  const carte = base.carte;
  const ajouter = (operateur: string, degradation: Degradation, description: string): void => {
    if (degradation.zones.length === 0) degradation.zones.push({ variant: degradation.base.carte.variants[0].id, layer: degradation.base.carte.variants[0].layers.Root!, champ: 'fills' });
    ajouterAvecCodes(registre, operateur, degradation, { description: `${operateur} : ${description}`, attendus: [] }, CODES_DE_LA_PORTEE);
  };
  const unVariant = (operateur: string, depart: ComposantDeBase = base): VariantDeCarte => registre.tirer(operateur, depart.carte.variants);

  // A1. Écritures d'une valeur d'axe : le variant dit une valeur, le token une écriture tolérée de la même valeur. Huit cas.
  const reecrit = (role: 'palette' | 'etat' | 'taille', valeurs: string[], ecriture: Record<string, string>): ComposantDeBase | undefined => {
    const axe = axeDeSegment(carte, role);
    if (!axe) return undefined;
    const axes: AxeDeSpec[] = base.spec.axes.map((spec) => (spec.nom === axe.propriete ? { ...spec, valeurs } : spec));
    const construit = construireLeComposant({
      ...base.spec, axes,
      ecritureDesValeurs: (propriete, valeur) => (propriete === axe.propriete ? ecriture[valeur] : undefined) ?? valeur.toLowerCase(),
    });
    // `structuredClone` ne copie pas une fonction : la spec garde le reste, comme dans U4.
    return { ...construit, spec: { ...construit.spec, ecritureDesValeurs: undefined } };
  };
  const ecritures: readonly (readonly [libelle: string, role: 'palette' | 'etat' | 'taille', valeurs: string[], ecriture: Record<string, string>])[] = [
    ['variant Hover, token Hovered', 'etat', ['Default', 'Hover', 'Disabled'], { Hover: 'Hovered' }],
    ['variant Default, token rest', 'etat', ['Default', 'Hover', 'Disabled'], { Default: 'rest' }],
    ['variant Primary, token primary', 'palette', ['Primary', 'Neutral', 'Danger'], {}],
    ['variant danger, token error', 'palette', ['primary', 'neutral', 'danger'], { danger: 'error' }],
    ['variant Medium, token md', 'taille', ['Small', 'Medium'], { Medium: 'md' }],
    ['variant Selected, token selected-true', 'etat', ['Default', 'Hover', 'Selected'], { Selected: 'selected-true' }],
    ['variant Focus, token focused', 'etat', ['Default', 'Hover', 'Focus'], { Focus: 'focused' }],
    ['variant Disabled, token disable', 'etat', ['Default', 'Hover', 'Disabled'], { Disabled: 'disable' }],
  ];
  for (const [libelle, role, valeurs, ecriture] of ecritures) {
    const reconstruit = reecrit(role, valeurs, ecriture);
    if (!reconstruit) continue;
    const variant = unVariant('A1', reconstruit);
    const degradation = new Degradation(reconstruit);
    degradation.zones.push({ variant: variant.id, layer: variant.layers.Root!, champ: 'fills' });
    ajouter('A1', degradation, `${libelle}, variant ${variant.nom}`);
  }

  // A2. Rôles légitimes : un layer ajouté (ou un trait ou un texte rebranché) porte un rôle que la table risque de refuser.
  const roles: readonly (readonly [libelle: string, poser: (degradation: Degradation, variant: VariantDeCarte) => void])[] = [
    ['divider sur un RECTANGLE nommé Divider', (d, v) => { layerLie(d, v, { nom: 'Divider', type: 'RECTANGLE' }, 'fills', tokenAElement(d, v, 'background', 'divider', 'divider', ['ALL_SCOPES'])); }],
    ['divider sur le trait d’un layer nommé Separator', (d, v) => { layerLie(d, v, { nom: 'Separator', type: 'FRAME' }, 'strokes', tokenAElement(d, v, 'border', 'edge', 'divider', ['ALL_SCOPES'])); }],
    ['inverse sur le texte Label', (d, v) => { d.lierA(liaisonDeCible(d.carte, v.id, 'texte')!, tokenAElement(d, v, 'foreground', 'label', 'inverse', ['ALL_SCOPES'])); }],
    ['ring en fond d\'un layer nommé ring', (d, v) => { layerLie(d, v, { nom: 'ring', type: 'RECTANGLE' }, 'fills', tokenAElement(d, v, 'ring', 'halo', 'ring', ['ALL_SCOPES'])); }],
    ['border sur un trait', (d, v) => { layerLie(d, v, { nom: 'Edge', type: 'FRAME' }, 'strokes', tokenAElement(d, v, 'border', 'edge', 'border', ['STROKE_COLOR'])); }],
    ['foreground sur un trait', (d, v) => { layerLie(d, v, { nom: 'Edge', type: 'FRAME' }, 'strokes', tokenAElement(d, v, 'foreground', 'edge', 'foreground', ['ALL_SCOPES'])); }],
    ['text sur une plage', (d, v) => { texteLie(d, v, 'Caption', tokenAElement(d, v, 'text', 'caption', 'text', ['ALL_FILLS'])); }],
    ['foreground sur une icône', (d, v) => { layerLie(d, v, { nom: 'Pictogram', type: 'VECTOR' }, 'fills', tokenAElement(d, v, 'foreground', 'pict', 'foreground', ['ALL_SCOPES'])); }],
  ];
  for (const [libelle, poser] of roles) {
    const variant = unVariant('A2');
    const degradation = new Degradation(base);
    poser(degradation, variant);
    degradation.zones.push({ variant: variant.id, layer: variant.layers.Root!, champ: 'fills' });
    ajouter('A2', degradation, `${libelle}, variant ${variant.nom}`);
  }

  // A3. Scopes précis : un layer de chaque type lié à un token du scope qui lui convient ; ALL_SCOPES sur chaque type.
  const scopes: readonly (readonly [libelle: string, poser: (degradation: Degradation, variant: VariantDeCarte) => void])[] = [
    ['FRAME_FILL sur un FRAME', (d, v) => { layerLie(d, v, { nom: 'Box', type: 'FRAME' }, 'fills', tokenAElement(d, v, 'background', 'box', 'background', ['FRAME_FILL'])); }],
    ['SHAPE_FILL sur un RECTANGLE', (d, v) => { layerLie(d, v, { nom: 'Plate', type: 'RECTANGLE' }, 'fills', tokenAElement(d, v, 'background', 'plate', 'background', ['SHAPE_FILL'])); }],
    ['SHAPE_FILL sur un VECTOR', (d, v) => { layerLie(d, v, { nom: 'Pictogram', type: 'VECTOR' }, 'fills', tokenAElement(d, v, 'icon', 'pict', 'icon', ['SHAPE_FILL'])); }],
    ['TEXT_FILL sur un TEXT', (d, v) => { texteLie(d, v, 'Caption', tokenAElement(d, v, 'foreground', 'caption', 'foreground', ['TEXT_FILL'])); }],
    ['STROKE_COLOR sur un trait', (d, v) => { layerLie(d, v, { nom: 'Edge', type: 'FRAME' }, 'strokes', tokenAElement(d, v, 'border', 'edge', 'border', ['STROKE_COLOR'])); }],
    ['ALL_SCOPES sur chaque type', (d, v) => {
      const tout = ['ALL_SCOPES'];
      layerLie(d, v, { nom: 'Box', type: 'FRAME' }, 'fills', tokenAElement(d, v, 'background', 'box', 'background', tout));
      layerLie(d, v, { nom: 'Plate', type: 'RECTANGLE' }, 'fills', tokenAElement(d, v, 'background', 'plate', 'background', tout));
      layerLie(d, v, { nom: 'Pictogram', type: 'VECTOR' }, 'fills', tokenAElement(d, v, 'icon', 'pict', 'icon', tout));
      texteLie(d, v, 'Caption', tokenAElement(d, v, 'foreground', 'caption', 'foreground', tout));
      layerLie(d, v, { nom: 'Edge', type: 'FRAME' }, 'strokes', tokenAElement(d, v, 'border', 'edge', 'border', tout));
    }],
  ];
  for (const [libelle, poser] of scopes) {
    const variant = unVariant('A3');
    const degradation = new Degradation(base);
    poser(degradation, variant);
    degradation.zones.push({ variant: variant.id, layer: variant.layers.Root!, champ: 'fills' });
    ajouter('A3', degradation, `${libelle}, variant ${variant.nom}`);
  }

  // A4. Nom du jeu et préfixe des tokens : le relevé dit une écriture, les tokens une autre, de la même suite de mots.
  const noms: readonly (readonly [jeu: string, relevé: string | undefined, prefixe: string])[] = [
    ['Icon Button', undefined, 'IconButton'], ['icon-button', undefined, 'IconButton'], ['alert', 'Alert', 'alert'], ['Tile Link', undefined, 'TileLink'],
  ];
  for (const [jeu, releve, prefixe] of noms) {
    const reconstruit = construireLeComposant({ ...base.spec, jeu });
    const variant = unVariant('A4', reconstruit);
    const degradation = new Degradation(reconstruit);
    const ancien = reconstruit.catalogue.variables.find((variable) => variable.collection === 'col-components')!.nom.split('/')[0];
    if (releve) degradation.fixer(degradation.releve.jeu, 'nom', releve);
    else renommerLePrefixe(degradation, ancien, prefixe);
    degradation.zones.push({ variant: variant.id, layer: variant.layers.Root!, champ: 'fills' });
    ajouter('A4', degradation, `jeu ${degradation.releve.jeu.nom}, préfixe ${prefixe}`);
  }

  // A5. Instances imbriquées : une pièce interne qui hérite de `theme`, un wrapper qui hérite de `layout`, une dépendance dont la
  // surcharge vise un token du composant, une instance pilotée par INSTANCE_SWAP.
  const instances: readonly (readonly [libelle: string, poser: (degradation: Degradation, variant: VariantDeCarte) => void])[] = [
    ['pièce interne qui hérite de theme', (d, v) => {
      const layer = ajouterUnLayer(d, v.id, { nom: '.Rule', type: 'INSTANCE', peintures: [peintureUnie('fills')] });
      d.fixer(layer, 'sorte', 'piece-interne');
      d.fixer(layer, 'instanceDe', { cle: 'lib-rule', nom: '.Rule', distante: false, pilotee: null });
      d.inserer(layer.liaisons, { champ: 'fills', indice: 0, porteur: layer.id, provenance: 'composant-principal', variable: variableLue(d.variableParNom('neutral/surface/default')!) });
    }],
    ['wrapper de dimensions qui hérite de layout', (d, v) => {
      const layer = ajouterUnLayer(d, v.id, { nom: 'Pad', type: 'INSTANCE' });
      d.fixer(layer, 'sorte', 'wrapper-de-dimensions');
      d.fixer(layer, 'instanceDe', { cle: 'lib-pad', nom: 'Pad', distante: false, pilotee: null });
      d.inserer(layer.liaisons, { champ: 'paddingLeft', porteur: layer.id, provenance: 'composant-principal', variable: variableLue(d.variableParNom('sizing/8')!) });
    }],
    ['dépendance dont la surcharge vise un token du composant', (d, v) => {
      const layer = ajouterUnLayer(d, v.id, { nom: 'Badge', type: 'INSTANCE' });
      d.fixer(layer, 'sorte', 'dependance');
      d.fixer(layer, 'instanceDe', { cle: 'lib-badge', nom: 'Badge', distante: true, pilotee: null });
      const jeton = d.variable(jetonCouleur(d.carte, v, 'icon')!.cle);
      d.inserer(layer.liaisons, {
        champ: 'fills', indice: 0, porteur: layer.id, surcharge: { id: `${layer.id};30:6`, nom: 'Glyph', type: 'VECTOR' }, provenance: 'instance', variable: variableLue(jeton),
      });
    }],
    ['instance pilotée par INSTANCE_SWAP', (d, v) => {
      const layer = ajouterUnLayer(d, v.id, { nom: 'Swap', type: 'INSTANCE' });
      d.fixer(layer, 'sorte', 'dependance');
      d.fixer(layer, 'instanceDe', { cle: 'lib-swap', nom: 'Swap', distante: true, pilotee: 'Icon#1:2' });
      const jeton = d.variable(jetonCouleur(d.carte, v, 'icon')!.cle);
      d.inserer(layer.liaisons, {
        champ: 'fills', indice: 0, porteur: layer.id, surcharge: { id: `${layer.id};30:7`, nom: 'Vector', type: 'VECTOR' }, provenance: 'instance', variable: variableLue(jeton),
      });
    }],
  ];
  for (const [libelle, poser] of instances) {
    const variant = unVariant('A5');
    const degradation = new Degradation(base);
    poser(degradation, variant);
    degradation.zones.push({ variant: variant.id, layer: variant.layers.Root!, champ: 'fills' });
    ajouter('A5', degradation, `${libelle}, variant ${variant.nom}`);
  }

  // A6. Tailles : ce que C29 ne juge pas. Un layer masqué avec un rayon en dur est jugé (Q-F3-1) : Z7 le porte, et le cas A6 garde un
  // layer masqué dont le rayon est déjà lié.
  const tailles: readonly (readonly [libelle: string, poser: (degradation: Degradation, variant: VariantDeCarte) => void])[] = [
    ['layer masqué dont le rayon est déjà lié', (d, v) => {
      const layer = ajouterUnLayer(d, v.id, { nom: 'Box', type: 'FRAME', visible: false });
      const jeton = d.carte.jetons.find((entree) => entree.propriete === 'radius' && v.valeurs && Object.entries(entree.valeurs).every(([propriete, valeur]) => v.valeurs[propriete] === valeur))!;
      d.inserer(layer.liaisons, { champ: 'cornerRadius', porteur: layer.id, variable: variableLue(d.variable(jeton.cle)) });
    }],
    ['instance imbriquée qui porte une marge de 20', (d, v) => { const layer = ajouterUnLayer(d, v.id, { nom: 'Nested', type: 'INSTANCE' }); d.inserer(layer.valeursEnDur, { champ: 'paddingLeft', valeur: 20 }); }],
    ['rayon de valeur 0 sur un layer ajouté', (d, v) => { const layer = ajouterUnLayer(d, v.id, { nom: 'Box', type: 'FRAME' }); d.inserer(layer.valeursEnDur, { champ: 'cornerRadius', valeur: 0 }); }],
    ['largeur et hauteur fixes de 20 sur Label', (d, v) => {
      for (const champ of ['width', 'height']) d.fixer(d.layer(v.id, 'Label').valeursEnDur.find((entree) => entree.champ === champ)!, 'valeur', 20);
    }],
    ['marge déjà liée sur un layer ajouté', (d, v) => {
      const layer = ajouterUnLayer(d, v.id, { nom: 'Box', type: 'FRAME' });
      const jeton = d.carte.jetons.find((entree) => entree.propriete === 'padding-x' && v.valeurs && Object.entries(entree.valeurs).every(([propriete, valeur]) => v.valeurs[propriete] === valeur))!;
      d.inserer(layer.liaisons, { champ: 'paddingLeft', porteur: layer.id, variable: variableLue(d.variable(jeton.cle)) });
    }],
    ['rayon de 20 dont la lecture a échoué', (d, v) => {
      const layer = ajouterUnLayer(d, v.id, { nom: 'Box', type: 'FRAME' });
      d.inserer(layer.valeursEnDur, { champ: 'cornerRadius', valeur: 20 });
      d.inserer(d.releve.lecture.manquees, { layer: layer.id, champ: 'cornerRadius', motif: 'lecture refusée' });
    }],
  ];
  for (const [libelle, poser] of tailles) {
    const variant = unVariant('A6');
    const degradation = new Degradation(base);
    poser(degradation, variant);
    degradation.zones.push({ variant: variant.id, layer: variant.layers.Root!, champ: 'cornerRadius' });
    ajouter('A6', degradation, `${libelle}, variant ${variant.nom}`);
  }

  // A7. Fratries légitimes.
  {
    // Cinq états : quatre partagent la cible de Ring, le cinquième porte son propre token, dont le nom dit son état.
    const cinq = construireLeComposant({
      jeu: 'Chip', axes: [{ nom: 'State', valeurs: ['default', 'hover', 'pressed', 'focus', 'disabled'] }],
      scopes: 'larges', imbriques: false, plages: 1, modesDeTaille: 1, graine,
    });
    const variant = cinq.carte.variants.find((entree) => entree.valeurs.State === 'focus')!;
    const degradation = new Degradation(cinq);
    const anneau = degradation.variable(liaisonDeCible(cinq.carte, variant.id, 'anneau')!.cle);
    const cible = degradation.variableParNom('danger/ring')!;
    degradation.fixer(anneau, 'valeurs', Object.fromEntries(modesDesComposants(degradation).map((mode) => [mode.id, { alias: cible.cle }])));
    degradation.zones.push({ variant: variant.id, layer: variant.layers.Ring!, champ: 'strokes' });
    ajouter('A7', degradation, 'cinq états, quatre sur la même cible de Ring et un sur son propre token');
  }
  {
    // Une fratrie dont chaque variant a son token par palette : un second anneau lié au token de Ring de chaque variant.
    const degradation = new Degradation(base);
    for (const variant of carte.variants) {
      layerLie(degradation, variant, { nom: 'Focus ring', type: 'RECTANGLE' }, 'strokes', degradation.variable(jetonCouleur(carte, variant, 'ring')!.cle));
    }
    ajouter('A7', degradation, 'fratrie à tokens distincts par palette, un second anneau dans chaque variant');
  }
  {
    // Une fratrie d'un seul variant.
    const seul = construireLeComposant({ ...base.spec, ...JEUX_DE_VARIANTS['divider-1'] });
    const variant = seul.carte.variants[0];
    const degradation = new Degradation(seul);
    layerLie(degradation, variant, { nom: 'Edge', type: 'FRAME' }, 'strokes', degradation.variable(jetonCouleur(seul.carte, variant, 'border')!.cle));
    ajouter('A7', degradation, 'fratrie d\'un seul variant');
  }

  // A8. Hors UCM : sans rôle de collection, ni C59 ni C63 ni C20 ni C80.
  {
    // Sur un fond plein, un texte de `surface/foreground` serait un C59 dans un fichier UCM.
    const variant = registre.tirer('A8', carte.variants.filter((entree) => jetonCouleur(carte, entree, 'background')?.cible.nom.includes('/solid/')));
    const degradation = new Degradation(base);
    const themeUcm = degradation.variableParNom('primary/surface/foreground')!;
    degradation.lierA(liaisonDeCible(carte, variant.id, 'texte')!, themeUcm);
    for (const collection of degradation.catalogue.collections) degradation.fixer(collection, 'role', null);
    degradation.zones.push({ variant: variant.id, layer: variant.layers.Label!, champ: 'fills' });
    ajouter('A8', degradation, `composant d'un fichier libre, texte lié à surface/foreground sur un fond plein, variant ${variant.nom}`);
  }
  {
    const variant = unVariant('A8');
    const degradation = new Degradation(base);
    const themeUcm = degradation.premiereDe('theme', 'COLOR')!;
    degradation.lierA(liaisonDeCible(carte, variant.id, 'fond')!, themeUcm);
    const collection = degradation.catalogue.collections.find((entree) => entree.cle === themeUcm.collection)!;
    degradation.fixer(collection, 'role', null);
    ajouter('A8', degradation, `collection sans rôle, fond de Root lié à ${themeUcm.nom}, variant ${variant.nom}`);
  }

  // A9. Variables de library.
  {
    const variant = unVariant('A9');
    const degradation = new Degradation(base);
    const liaison = degradation.liaison(liaisonDeCible(carte, variant.id, 'fond')!);
    degradation.fixer(degradation.catalogue, 'library', { nom: 'Library UCM', cle: 'lib-ucm' });
    degradation.fixer(degradation.variable(liaison.variable.cle), 'distante', true);
    degradation.fixer(liaison.variable, 'distante', true);
    degradation.zones.push({ variant: variant.id, layer: variant.layers.Root!, champ: 'fills' });
    ajouter('A9', degradation, `fond de Root lié à un token distant, variant ${variant.nom}`);
  }
  {
    const variant = unVariant('A9');
    const degradation = new Degradation(base);
    const liaison = degradation.liaison(carte.liaisons.find((entree) => entree.variant === variant.id && entree.nomDuLayer === 'Root' && entree.champ === 'cornerRadius')!);
    degradation.fixer(degradation.catalogue, 'library', { nom: 'Library UCM', cle: 'lib-ucm' });
    degradation.fixer(degradation.variable(liaison.variable.cle), 'distante', true);
    degradation.fixer(liaison.variable, 'distante', true);
    degradation.zones.push({ variant: variant.id, layer: variant.layers.Root!, champ: 'cornerRadius' });
    ajouter('A9', degradation, `rayon de Root lié à un token de taille distant, variant ${variant.nom}`);
  }
  return registre.cas;
}

/**
 * Les opérateurs de dégradation des cibles et des couches (K1 à K4 : C19, C80, C20, C18) des stress tests F3. Un layer se lie
 * seulement aux tokens de son composant, qui visent `theme` pour les couleurs et `layout` ou `typography` pour les tailles :
 * K1 lie le token d'un autre composant, K2 saute le token pour une variable d'une autre collection, K3 déplace la cible d'un
 * alias, K4 change les scopes du token lié. Les cas qui dépendent de Q-F3-8 et de Q-F3-15 portent le verdict `mesure`.
 */
import type { CollectionDuCatalogue, VariableDuCatalogue } from '../../../src/controles/index.js';
import type { ConstatAttendu } from '../commun/types.js';
import type { NomDeLayer, VariantDeCarte } from './carte.js';
import { construireLeComposant, GRAINE_PAR_DEFAUT, type ComposantDeBase } from './composantDeBase.js';
import {
  attendu, attendusDePortee, CIBLES, Degradation, jetonCouleur, jetonTaille, lieuDe, liaisonDeCible, porteeAdmise, Registre, variantsOu,
  type CasDeComposant, type LieuDeConstat, type NomDeCible, type SorteDeCible,
} from './operateursAxes.js';

const LIAISONS_DE_COULEUR: readonly NomDeCible[] = ['fond', 'trait', 'texte', 'icone'];

export function operateursCibles(base: ComposantDeBase, graine: number = GRAINE_PAR_DEFAUT): CasDeComposant[] {
  const registre = new Registre(base, graine);
  const carte = base.carte;
  const aGlyph = carte.liaisons.some((liaison) => liaison.nomDuLayer === 'Glyph');
  const aUnePieceInterne = carte.liaisons.some((liaison) => liaison.nomDuLayer === '.Bar');
  const sansEtatDesactive = variantsOu(carte, (variant) => !jetonCouleur(carte, variant, 'background')?.cible.nom.startsWith('disabled/'));

  // K1. Le token d'un autre composant : C19 seul, sans C16 ni C24, puis le même token sur la surcharge de Glyph (Q-F3-8).
  const autreComposant = (cible: NomDeCible, composant: string): void => {
    const variant = registre.tirer('K1', carte.variants);
    const deBase = liaisonDeCible(carte, variant.id, cible);
    if (!deBase) return;
    const degradation = new Degradation(base);
    const modele = degradation.variable(deBase.cle);
    // Le token garde ses scopes et son alias vers le thème : seule l'appartenance au composant change.
    const etranger = degradation.cloner(modele, { nom: [composant, ...modele.nom.split('/').slice(1)].join('/') });
    degradation.lierA(deBase, etranger);
    registre.ajouter('K1', degradation, {
      description: `K1 : ${CIBLES[cible].layer} (${cible}) du variant ${variant.nom} lié à ${etranger.nom}`,
      attendus: [attendu('C19', 'a-faire', lieuDe(deBase, etranger.nom)), ...attendusDePortee(deBase, CIBLES[cible].sorte, etranger)],
      ...(cible === 'glyph' ? { verdict: 'mesure' as const, question: 'Q-F3-8' } : {}),
    });
  };
  for (const composant of ['alert', 'button-group']) for (const cible of LIAISONS_DE_COULEUR) autreComposant(cible, composant);
  if (aGlyph) for (const composant of ['alert', 'button-group']) autreComposant('glyph', composant);

  // K2. Liaison directe hors de `components` : C80 seul (E-42).
  const themeDe = (degradation: Degradation, variant: { id: string }, suffixe: string): VariableDuCatalogue | undefined => {
    const jeton = jetonCouleur(carte, carte.variants.find((entree) => entree.id === variant.id)!, 'background');
    return jeton ? degradation.variableParNom(`${jeton.cible.nom.split('/')[0]}/${suffixe}`) : undefined;
  };
  const couleurVersTheme = (cible: NomDeCible, suffixe: string): void => {
    const variant = registre.tirer('K2', sansEtatDesactive);
    const deBase = liaisonDeCible(carte, variant.id, cible);
    const degradation = new Degradation(base);
    const direct = themeDe(degradation, variant, suffixe);
    if (!deBase || !direct) return;
    degradation.lierA(deBase, direct);
    registre.ajouter('K2', degradation, {
      description: `K2 : ${CIBLES[cible].layer} (${cible}) du variant ${variant.nom} lié directement à theme/${direct.nom}`,
      attendus: [attendu('C80', 'a-faire', lieuDe(deBase, direct.nom)), ...attendusDePortee(deBase, CIBLES[cible].sorte, direct)],
    });
  };
  couleurVersTheme('fond', 'surface/default');
  couleurVersTheme('trait', 'surface/border');
  couleurVersTheme('texte', 'solid/foreground');
  couleurVersTheme('icone', 'solid/foreground');

  for (const [champ, propriete] of [['paddingLeft', 'padding-x'], ['itemSpacing', 'gap'], ['cornerRadius', 'radius'], ['strokeWeight', 'border-width']] as const) {
    const variant = registre.tirer('K2', carte.variants);
    const deBase = carte.liaisons.find((liaison) => liaison.variant === variant.id && liaison.nomDuLayer === 'Root' && liaison.champ === champ);
    const jeton = jetonTaille(carte, variant, propriete);
    if (!deBase || !jeton) continue;
    const degradation = new Degradation(base);
    const direct = degradation.variable(jeton.cible.cle);
    degradation.lierA(deBase, direct);
    registre.ajouter('K2', degradation, {
      description: `K2 : ${champ} du variant ${variant.nom} lié directement à layout/${direct.nom}`,
      attendus: [attendu('C80', 'a-faire', lieuDe(deBase, direct.nom))],
    });
  }

  for (const role of ['primitives', 'brands', 'utility']) {
    const variant = registre.tirer('K2', carte.variants);
    const deBase = liaisonDeCible(carte, variant.id, 'fond');
    const degradation = new Degradation(base);
    const direct = degradation.premiereDe(role, 'COLOR');
    if (!deBase || !direct) continue;
    degradation.lierA(deBase, direct);
    registre.ajouter('K2', degradation, {
      description: `K2 : fond de Root du variant ${variant.nom} lié directement à ${role}/${direct.nom}`,
      attendus: [attendu('C80', 'a-faire', lieuDe(deBase, direct.nom))],
    });
  }

  // Témoins : la typographie se juge sur sa collection, et un fond hérité d'une pièce interne peut viser `theme`.
  {
    const variant = registre.tirer('K2', carte.variants);
    const degradation = new Degradation(base);
    const police = degradation.premiereDe('typography', 'FLOAT');
    if (police) {
      const label = degradation.layer(variant.id, 'Label');
      degradation.inserer(label.liaisons, { champ: 'fontSize', porteur: label.id, variable: { id: 'VariableID:0:0', cle: police.cle, nom: police.nom, collection: police.collection, distante: false } });
      degradation.zones.push({ variant: variant.id, layer: label.id, champ: 'fontSize' });
      registre.ajouter('K2', degradation, { description: `K2 : fontSize de Label du variant ${variant.nom} lié à typography/${police.nom}`, attendus: [] });
    }
  }
  if (aUnePieceInterne) {
    const variant = registre.tirer('K2', carte.variants);
    const deBase = carte.liaisons.find((liaison) => liaison.variant === variant.id && liaison.nomDuLayer === '.Bar');
    const degradation = new Degradation(base);
    const autre = degradation.variableParNom('neutral/surface/subtle');
    if (deBase && autre) {
      degradation.lierA(deBase, autre);
      registre.ajouter('K2', degradation, { description: `K2 : fond hérité de .Bar du variant ${variant.nom} lié à theme/${autre.nom}`, attendus: [] });
    }
  }

  // K3. Alias d'un token de `components`. Un token de couleur admet `theme` seul ; un token de taille `theme`, `layout` ou `typography`.
  const modes = (variable: VariableDuCatalogue): string[] => Object.keys(variable.valeurs ?? {});
  const viser = (degradation: Degradation, token: VariableDuCatalogue, cle: string, seulement?: string): void => {
    for (const mode of modes(token)) if (seulement === undefined || mode === seulement) degradation.fixer(token.valeurs!, mode, { alias: cle });
  };
  /** Un C20 par liaison du token : un token de taille sert tous les variants de sa taille. */
  const c20Du = (token: VariableDuCatalogue): ConstatAttendu[] =>
    carte.liaisons.filter((liaison) => liaison.cle === token.cle && liaison.origine === 'composant').map((liaison) => attendu('C20', 'a-faire', lieuDe(liaison, token.nom)));

  const couleurVers = (decrit: string, cible: (degradation: Degradation, token: VariableDuCatalogue) => VariableDuCatalogue | undefined, interdit: boolean, mesure = false): void => {
    const variant = registre.tirer('K3', carte.variants);
    const jeton = jetonCouleur(carte, variant, 'background');
    if (!jeton) return;
    const degradation = new Degradation(base);
    const token = degradation.variable(jeton.cle);
    const visee = cible(degradation, token);
    if (!visee) return;
    viser(degradation, token, visee.cle);
    degradation.zones.push({ variant: variant.id, layer: degradation.layer(variant.id, 'Root').id, champ: 'fills' });
    registre.ajouter('K3', degradation, {
      description: `K3 : l'alias de ${token.nom} (variant ${variant.nom}) vise ${decrit} ${visee.nom}`,
      attendus: interdit ? c20Du(token) : [], ...(mesure ? { verdict: 'mesure' as const, question: 'Q-F3-15' } : {}),
    });
  };
  const tailleVers = (decrit: string, cible: (degradation: Degradation, token: VariableDuCatalogue, variant: VariantDeCarte) => VariableDuCatalogue | undefined, interdit: boolean, mesure = false): void => {
    const variant = registre.tirer('K3', carte.variants);
    const jeton = jetonTaille(carte, variant, 'gap');
    if (!jeton) return;
    const degradation = new Degradation(base);
    const token = degradation.variable(jeton.cle);
    const visee = cible(degradation, token, variant);
    if (!visee) return;
    viser(degradation, token, visee.cle);
    for (const liaison of carte.liaisons.filter((entree) => entree.cle === token.cle)) degradation.zones.push({ variant: liaison.variant, layer: liaison.layer, champ: liaison.champ });
    registre.ajouter('K3', degradation, {
      description: `K3 : l'alias de ${token.nom} vise ${decrit} ${visee.nom}`,
      attendus: interdit ? c20Du(token) : [], ...(mesure ? { verdict: 'mesure' as const, question: 'Q-F3-15' } : {}),
    });
  };
  const premiere = (role: string, type: VariableDuCatalogue['type']) => (degradation: Degradation) => degradation.premiereDe(role, type);

  // Une variable de `brands` sans segment de mode : avec `light` ou `dark`, le token porterait aussi un C63 `theme`, que S2 mesure.
  const brandsSansMode = (degradation: Degradation): VariableDuCatalogue | undefined => {
    const modele = degradation.premiereDe('brands', 'COLOR');
    return modele && degradation.cloner(modele, { nom: 'accent/500' });
  };
  couleurVers('brands', brandsSansMode, true);
  couleurVers('utility', premiere('utility', 'COLOR'), true);
  couleurVers('primitives', premiere('primitives', 'COLOR'), true);
  // Un autre token de `components` qui porte une valeur directe : Q-F3-15.
  couleurVers('le token de components', (degradation, token) => degradation.cloner(token, {
    nom: `${token.nom.split('/')[0]}/color/valeur-directe`, valeurs: Object.fromEntries(modes(token).map((mode) => [mode, { valeur: { r: 0.1, g: 0.2, b: 0.3, a: 1 } }])),
  }), true, true);
  couleurVers('theme', (degradation, token) => {
    const actuelle = Object.values(token.valeurs ?? {}).map((valeur) => ('alias' in valeur ? valeur.alias : ''));
    return degradation.catalogue.variables.find((variable) => variable.nom === 'neutral/surface/subtle' && !actuelle.includes(variable.cle));
  }, false);

  tailleVers('primitives', premiere('primitives', 'FLOAT'), true);
  tailleVers('brands', premiere('brands', 'FLOAT'), true);
  tailleVers('le token de components', (degradation, _token, variant) => {
    const radius = jetonTaille(carte, variant, 'radius');
    return radius ? degradation.variable(radius.cle) : undefined;
  }, true, true);
  tailleVers('theme', premiere('theme', 'FLOAT'), false);
  // Un autre token de `layout` que celui où le token vise déjà.
  tailleVers('layout', (degradation, token) => {
    const actuelles = Object.values(token.valeurs ?? {}).map((valeur) => ('alias' in valeur ? valeur.alias : ''));
    return degradation.catalogue.variables.find((variable) => variable.type === 'FLOAT' && degradation.catalogue.collections.find((entree) => entree.cle === variable.collection)?.role === 'layout' && !actuelles.includes(variable.cle));
  }, false);
  tailleVers('typography', premiere('typography', 'FLOAT'), false);

  // Chaîne : le token vise un token de `components` qui vise lui-même `theme` (Q-F3-15).
  {
    const variant = registre.tirer('K3', carte.variants);
    const autres = carte.variants.filter((entree) => entree.id !== variant.id);
    const jeton = jetonCouleur(carte, variant, 'background');
    const intermediaire = autres.length > 0 ? jetonCouleur(carte, registre.tirer('K3', autres), 'background') : undefined;
    if (jeton && intermediaire) {
      const degradation = new Degradation(base);
      const token = degradation.variable(jeton.cle);
      viser(degradation, token, intermediaire.cle);
      degradation.zones.push({ variant: variant.id, layer: degradation.layer(variant.id, 'Root').id, champ: 'fills' });
      registre.ajouter('K3', degradation, {
        description: `K3 : chaîne, ${token.nom} (variant ${variant.nom}) vise ${intermediaire.nom}, qui vise theme`,
        attendus: c20Du(token), verdict: 'mesure', question: 'Q-F3-15',
      });
    }
  }

  // Deux modes de `components`, dont un seul vise `brands` : la base change, elle compte deux modes.
  const deuxModes = base.spec.modesDeTaille === 2 ? base : construireLeComposant({ ...base.spec, modesDeTaille: 2 });
  for (const modeInterdit of [1, 0]) {
    const variant = registre.tirer('K3', carte.variants);
    const jeton = jetonCouleur(deuxModes.carte, variant, 'background');
    const degradation = new Degradation(deuxModes);
    const brands = brandsSansMode(degradation);
    if (!jeton || !brands) continue;
    const token = degradation.variable(jeton.cle);
    viser(degradation, token, brands.cle, modes(token)[modeInterdit]);
    degradation.zones.push({ variant: variant.id, layer: degradation.layer(variant.id, 'Root').id, champ: 'fills' });
    registre.ajouter('K3', degradation, {
      description: `K3 : ${token.nom} vise brands/${brands.nom} dans son mode ${modeInterdit + 1} seulement`,
      attendus: deuxModes.carte.liaisons.filter((liaison) => liaison.cle === token.cle).map((liaison) => attendu('C20', 'a-faire', lieuDe(liaison, token.nom))),
    });
  }

  // Une cible hors du catalogue ou dans une collection sans rôle n'est pas jugée.
  couleurVers('une cible absente du catalogue', (degradation, token) => ({ ...token, cle: 'k-absente', nom: 'absente' }), false);
  couleurVers('une collection sans rôle', (degradation) => {
    const collection: CollectionDuCatalogue = { cle: 'col-sans-role', nom: 'notes', role: null, modes: [{ id: '90:0', nom: 'Mode 1' }], etat: 'lue' };
    degradation.inserer(degradation.catalogue.collections, collection);
    return degradation.cloner(degradation.premiereDe('theme', 'COLOR')!, { nom: 'notes/couleur', collection: collection.cle });
  }, false);

  // K4. Scopes du token lié : 6 cibles × 4 jeux. Un clone dédié du token porte le jeu, pour qu'une seule liaison le lise.
  const CIBLES_K4: readonly { libelle: string; cible?: NomDeCible; ajout?: { layer: NomDeLayer; champ: 'fills' | 'strokes' }; sorte: SorteDeCible; role: 'background' | 'foreground' | 'icon' | 'border' }[] = [
    { libelle: 'fond de Root', cible: 'fond', sorte: 'cadre', role: 'background' },
    { libelle: 'fond d\'un RECTANGLE (Ring)', ajout: { layer: 'Ring', champ: 'fills' }, sorte: 'forme', role: 'background' },
    { libelle: 'fond de Icon (VECTOR)', cible: 'icone', sorte: 'forme', role: 'icon' },
    { libelle: 'texte plein (Label)', ajout: { layer: 'Label', champ: 'fills' }, sorte: 'texte', role: 'foreground' },
    { libelle: 'plage de texte (Label)', cible: 'texte', sorte: 'texte', role: 'foreground' },
    { libelle: 'trait de Root', cible: 'trait', sorte: 'trait', role: 'border' },
  ];
  const JEUX: Readonly<Record<SorteDeCible, Readonly<Record<'precis' | 'large' | 'incompatible' | 'vide', readonly string[]>>>> = {
    cadre: { precis: ['FRAME_FILL'], large: ['ALL_FILLS'], incompatible: ['TEXT_FILL'], vide: [] },
    forme: { precis: ['SHAPE_FILL'], large: ['ALL_FILLS'], incompatible: ['FRAME_FILL'], vide: [] },
    texte: { precis: ['TEXT_FILL'], large: ['ALL_FILLS'], incompatible: ['SHAPE_FILL'], vide: [] },
    trait: { precis: ['STROKE_COLOR'], large: ['ALL_SCOPES'], incompatible: ['ALL_FILLS'], vide: [] },
  };
  for (const description of CIBLES_K4) {
    for (const jeu of ['precis', 'large', 'incompatible', 'vide'] as const) {
      const variant = registre.tirer('K4', carte.variants);
      const jeton = jetonCouleur(carte, variant, description.role);
      if (!jeton) continue;
      const degradation = new Degradation(base);
      const scopes = [...JEUX[description.sorte][jeu]];
      const clone = degradation.cloner(degradation.variable(jeton.cle), { scopes });
      let lieu: LieuDeConstat;
      if (description.cible) {
        const deBase = liaisonDeCible(carte, variant.id, description.cible);
        if (!deBase) continue;
        degradation.lierA(deBase, clone);
        lieu = lieuDe(deBase, clone.nom);
      } else {
        const ajout = description.ajout!;
        const { layer, champ } = degradation.ajouterPeintureLiee(variant.id, ajout.layer, ajout.champ, clone);
        lieu = { variant: variant.id, layer, champ, token: clone.nom };
      }
      registre.ajouter('K4', degradation, {
        description: `K4 : ${description.libelle} du variant ${variant.nom}, token aux scopes ${scopes.length ? scopes.join(', ') : '(vides)'}`,
        attendus: porteeAdmise(scopes, description.sorte) ? [] : [attendu('C18', 'a-faire', lieu)],
      });
    }
  }
  return registre.cas;
}

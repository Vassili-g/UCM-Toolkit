/**
 * Ce que chaque famille de contrôles du kit lit du relevé et du catalogue. La reprise d'une famille compare cette part
 * des données, pas les données entières : une peinture changée ne rejoue ni le nommage ni la structure.
 *
 * Un gabarit liste des chemins ; `*` désigne tout indice de liste ou toute clé d'objet. Un chemin qui s'arrête garde tout
 * ce qu'il porte dessous. La projection garde la forme de ce qu'elle traverse (longueur des listes, clés des objets
 * énumérés, présence d'un champ), parce que la famille la lit aussi.
 *
 * Le gabarit s'établit sur le code du kit (`packages/kit/src/controles/`) : un champ qu'une branche rare lit y figure
 * même si la fixture ne l'atteint pas. Un champ lu et absent d'un gabarit fait reprendre à tort un résultat périmé ;
 * `tests/projectionsDesControles.test.ts` l'attrape par l'enregistrement des accès et par des perturbations.
 */
import type { CatalogueDeReference, ReleveDeComposant } from '@ucm-kit/core/controles';

import type { NiveauDAccessibilite } from '../messages/configuration';

export type Gabarit = readonly string[];

export const FAMILLES_DE_CONTROLES = [
  'controle-nommage', 'controle-mapping', 'controle-couches', 'controle-oublis', 'controle-accessibilite', 'controle-typographie',
  'controle-theme', 'controle-structure',
] as const;

export type NomDeFamille = (typeof FAMILLES_DE_CONTROLES)[number];

/** Les familles que seule une architecture déclarée UCM lance. */
export const FAMILLES_UCM: readonly NomDeFamille[] = ['controle-theme', 'controle-structure'];

/** Ce que le jugement lit en plus du relevé et du catalogue. */
export interface ParametresDesControles {
  readonly niveau: NiveauDAccessibilite;
}

/** Les champs `champs` sous `racine`, un chemin chacun. */
const sous = (racine: string, ...champs: string[]): string[] => champs.map((champ) => `${racine}.${champ}`);

const PROPRIETES = sous('releve.proprietes.*', 'nom', 'type', 'valeurs');
const COLLECTIONS = sous('catalogue.collections.*', 'cle', 'nom', 'role');
const LAYERS = 'releve.variants.*.layers.*';
const LIAISONS_DU_LAYER = `${LAYERS}.liaisons.*`;
const LIAISONS_DE_PLAGE = `${LAYERS}.texte.plages.*.liaisons.*`;
const ALIAS = 'valeurs.*.alias';

/** Les champs lus sur les liaisons d'un layer, puis sur celles de ses plages de texte. */
const liaisons = (duLayer: string[], dePlage: string[]): string[] => [...sous(LIAISONS_DU_LAYER, ...duLayer), ...sous(LIAISONS_DE_PLAGE, ...dePlage)];

export const GABARITS: Readonly<Record<NomDeFamille, Gabarit>> = {
  'controle-nommage': [
    'releve.jeu.nom', 'releve.jeu.cle', ...PROPRIETES,
    ...sous('releve.variants.*', 'id', 'valeurs'),
    ...COLLECTIONS, ...sous('catalogue.variables.*', 'cle', 'nom', 'collection'),
  ],
  'controle-mapping': [
    'releve.jeu.nom', ...PROPRIETES,
    ...sous('releve.variants.*', 'id', 'valeurs'),
    ...sous(LAYERS, 'id', 'nom', 'type', 'instanceDe.pilotee'),
    ...sous(LIAISONS_DU_LAYER, 'champ', 'indice', 'plage', 'surcharge', 'variable.cle', 'variable.nom'),
    ...COLLECTIONS, ...sous('catalogue.variables.*', 'cle', 'nom', 'collection', 'scopes', ALIAS),
  ],
  'controle-couches': [
    'releve.jeu.nom', ...PROPRIETES,
    ...sous('releve.variants.*', 'id', 'nom', 'valeurs'),
    ...sous(LAYERS, 'id', 'nom', 'parent', 'sorte', 'peintures'),
    ...sous(LIAISONS_DU_LAYER, 'champ', 'indice', 'plage', 'provenance', 'surcharge.id', 'surcharge.nom', 'variable.cle', 'variable.nom'),
    ...COLLECTIONS, ...sous('catalogue.variables.*', 'cle', 'nom', 'collection', 'type', 'etat', ALIAS),
  ],
  'controle-oublis': [
    'releve.jeu.nom', 'releve.lecture.variantsNonLus', 'releve.lecture.layersNonLus', ...PROPRIETES,
    ...sous('releve.variants.*', 'id', 'nom', 'valeurs'),
    `${LIAISONS_DU_LAYER}.variable.cle`,
    ...COLLECTIONS, 'catalogue.collections.*.etat', ...sous('catalogue.variables.*', 'cle', 'nom', 'collection'),
  ],
  'controle-accessibilite': [
    'niveau', ...sous('releve.lecture.manquees.*', 'layer', 'champ'), ...PROPRIETES,
    ...sous('releve.variants.*', 'nom', 'valeurs', 'modesEffectifs'),
    ...sous(LAYERS, 'id', 'nom', 'type', 'parent', 'visible', 'opacite', 'strokeWeight', 'dimensions.largeur', 'dimensions.hauteur', 'peintures'),
    ...liaisons(['champ', 'indice', 'surcharge.id', 'illisible', 'variable.cle'], ['champ', 'indice', 'illisible', 'variable.cle']),
    ...sous(`${LAYERS}.texte.plages.*`, 'debut', 'fin', 'fontSize', 'fontWeight', 'peintures'),
    ...sous('catalogue.collections.*', 'cle', 'nom', 'role', 'etat', 'modes'), ...sous('catalogue.variables.*', 'cle', 'nom', 'collection', 'etat', 'valeurs'),
    'catalogue.fondsDElevation', 'catalogue.fondDeLaPageFigma',
  ],
  'controle-typographie': [
    ...sous('releve.proprietes.*', 'nom', 'type'), 'releve.variants.*.nom',
    ...sous(LAYERS, 'id', 'nom', 'type', 'parent', 'visible', 'instanceDe.distante', 'instanceDe.pilotee', 'texte.style'),
    ...liaisons(['champ', 'illisible', 'variable.cle', 'variable.nom', 'variable.collection'], ['champ', 'illisible', 'variable.cle', 'variable.nom', 'variable.collection']),
    ...COLLECTIONS, ...sous('catalogue.variables.*', 'cle', 'nom', 'collection'),
  ],
  'controle-theme': [
    'releve.variants.*.id',
    ...sous(LAYERS, 'id', 'nom', 'parent', 'peintures.*.champ', 'peintures.*.visible', 'peintures.*.indice'),
    ...liaisons(['champ', 'indice', 'plage', 'surcharge', 'illisible', 'variable.cle'], ['champ', 'indice', 'plage', 'surcharge', 'variable.cle']),
    ...COLLECTIONS, ...sous('catalogue.variables.*', 'cle', 'nom', 'collection', 'etat'),
  ],
  'controle-structure': [
    'releve.jeu.nom', ...PROPRIETES,
    ...sous('catalogue.collections.*', 'cle', 'nom', 'role', 'etat', 'modes'),
    ...sous('catalogue.variables.*', 'cle', 'nom', 'collection', 'etat', 'valeurs'),
  ],
};

interface Noeud {
  complet: boolean;
  /** `*` est le seul enfant d'un nœud qui l'a. */
  readonly enfants: Map<string, Noeud>;
}

function arbreDe(gabarit: Gabarit): Noeud {
  const racine: Noeud = { complet: false, enfants: new Map() };
  for (const chemin of gabarit) {
    let noeud = racine;
    for (const segment of chemin.split('.')) {
      if (noeud.complet) break;
      let enfant = noeud.enfants.get(segment);
      if (!enfant) {
        const aUneEtoile = noeud.enfants.has('*');
        if (noeud.enfants.size > 0 && (segment === '*') !== aUneEtoile) throw new Error(`Gabarit : « * » et un nom partagent le chemin ${chemin}.`);
        enfant = { complet: false, enfants: new Map() };
        noeud.enfants.set(segment, enfant);
      }
      noeud = enfant;
    }
    noeud.complet = true;
  }
  return racine;
}

const arbres = new Map<Gabarit, Noeud>();

function extraire(valeur: unknown, noeud: Noeud): unknown {
  if (noeud.complet || noeud.enfants.size === 0 || typeof valeur !== 'object' || valeur === null) return valeur;
  const tous = noeud.enfants.get('*');
  if (Array.isArray(valeur)) return tous ? valeur.map((element) => extraire(element, tous)) : valeur;
  const source = valeur as Record<string, unknown>;
  const projetee: Record<string, unknown> = {};
  if (tous) {
    for (const cle of Object.keys(source)) projetee[cle] = extraire(source[cle], tous);
    return projetee;
  }
  for (const [cle, enfant] of noeud.enfants) {
    if (Object.prototype.hasOwnProperty.call(source, cle)) projetee[cle] = extraire(source[cle], enfant);
  }
  return projetee;
}

/** La part de `source` que le gabarit désigne, avec la forme de ce qu'il traverse. Pure : deux sources égales sur le gabarit rendent des valeurs égales. */
export function projeter(source: unknown, gabarit: Gabarit): unknown {
  let arbre = arbres.get(gabarit);
  if (!arbre) {
    arbre = arbreDe(gabarit);
    arbres.set(gabarit, arbre);
  }
  return extraire(source, arbre);
}

function entreesDe(famille: NomDeFamille, releve: ReleveDeComposant, catalogue: CatalogueDeReference, parametres: ParametresDesControles): unknown {
  return projeter({ releve, catalogue, niveau: parametres.niveau }, GABARITS[famille]);
}

export const entreesDeNommage = (releve: ReleveDeComposant, catalogue: CatalogueDeReference, parametres: ParametresDesControles) => entreesDe('controle-nommage', releve, catalogue, parametres);
export const entreesDeMapping = (releve: ReleveDeComposant, catalogue: CatalogueDeReference, parametres: ParametresDesControles) => entreesDe('controle-mapping', releve, catalogue, parametres);
export const entreesDeCouches = (releve: ReleveDeComposant, catalogue: CatalogueDeReference, parametres: ParametresDesControles) => entreesDe('controle-couches', releve, catalogue, parametres);
export const entreesDeOublis = (releve: ReleveDeComposant, catalogue: CatalogueDeReference, parametres: ParametresDesControles) => entreesDe('controle-oublis', releve, catalogue, parametres);
export const entreesDeAccessibilite = (releve: ReleveDeComposant, catalogue: CatalogueDeReference, parametres: ParametresDesControles) => entreesDe('controle-accessibilite', releve, catalogue, parametres);
export const entreesDeTypographie = (releve: ReleveDeComposant, catalogue: CatalogueDeReference, parametres: ParametresDesControles) => entreesDe('controle-typographie', releve, catalogue, parametres);
export const entreesDeTheme = (releve: ReleveDeComposant, catalogue: CatalogueDeReference, parametres: ParametresDesControles) => entreesDe('controle-theme', releve, catalogue, parametres);
export const entreesDeStructure = (releve: ReleveDeComposant, catalogue: CatalogueDeReference, parametres: ParametresDesControles) => entreesDe('controle-structure', releve, catalogue, parametres);

/** Les projections par famille, dans l'ordre de `FAMILLES_DE_CONTROLES`. */
export const PROJECTIONS: Readonly<Record<NomDeFamille, (releve: ReleveDeComposant, catalogue: CatalogueDeReference, parametres: ParametresDesControles) => unknown>> = {
  'controle-nommage': entreesDeNommage,
  'controle-mapping': entreesDeMapping,
  'controle-couches': entreesDeCouches,
  'controle-oublis': entreesDeOublis,
  'controle-accessibilite': entreesDeAccessibilite,
  'controle-typographie': entreesDeTypographie,
  'controle-theme': entreesDeTheme,
  'controle-structure': entreesDeStructure,
};

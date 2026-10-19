/**
 * Les responsabilités des produits UCM et l'adresse de la recette partagée dans Figma.
 *
 * Après une modification : relancer `npm test`, régénérer la vue illustrée (`generer-donnees-referentiel.ts`) (elle en tire les produits), et changer la version du kit.
 */
import type { Langues } from './termes.js';

export const CLES_PARTAGEES_DE_PALETTES = { variables: 'variables', palette: 'palette', cle: 'cle' } as const;
export const ESPACE_ARCHITECT = 'ucm_architect';

/** L'adresse partagée survit à un changement d'identifiant du plugin Palettes. */
export const ESPACE_PARTAGE = 'ucm_palettes';
/**
 * La marque que Palettes range à la racine de `ESPACE_PARTAGE` : dans ce fichier, il nomme ses variables selon les règles
 * d'UCM Nomenclature. UCM Nomenclature la lit pour cesser de protéger les variables de Palettes.
 */
export const CLE_NOMMAGE_DE_PALETTES = 'nommage';
export const CLE_RECETTE = 'recette';

export type DonneeDeProduit = 'composants' | 'variables' | 'recette' | 'planches' | 'regles-usage' | 'regles-de-nommage' | 'contrats' | 'tokens-dtcg' | 'configuration' | 'implementation' | 'rapports' | 'css' | 'types' | 'couleurs' | 'sources-plugin' | 'bundle-plugin' | 'conventions' | 'noms-collections' | 'noms-variables' | 'noms-proprietes' | 'valeurs-proprietes';
export type DestinationDeProduit = 'document-figma' | 'donnees-partagees-figma' | 'repository' | 'memoire' | 'distribution-plugin';
export type SortieDeProduit = { readonly donnees: readonly DonneeDeProduit[]; readonly destination: DestinationDeProduit };
export type Produit = {
  readonly id: 'exporter' | 'palettes' | 'explorateur' | 'kit' | 'cli' | 'adapter-typescript' | 'couleur' | 'socle' | 'architect';
  readonly libelle: Langues;
  readonly definition: Langues;
  readonly lit: readonly DonneeDeProduit[];
  readonly ecrit: readonly SortieDeProduit[];
  readonly execution: 'figma' | 'pur' | 'node' | 'pur-et-node';
};

export const PRODUITS: readonly Produit[] = [
  {
    id: 'exporter', libelle: { fr: 'UCM Exporter', en: 'UCM Exporter' },
    definition: { fr: 'Publie les contrats de composants et les tokens DTCG ; seule la création des règles d’usage écrit dans Figma.', en: 'Publishes component contracts and DTCG tokens; only usage rule creation writes to Figma.' },
    lit: ['composants', 'variables', 'regles-usage', 'configuration'], execution: 'figma',
    ecrit: [{ donnees: ['contrats', 'tokens-dtcg'], destination: 'repository' }, { donnees: ['regles-usage'], destination: 'document-figma' }],
  },
  {
    id: 'palettes', libelle: { fr: 'UCM Palettes', en: 'UCM Palettes' },
    definition: { fr: 'Calcule les palettes et écrit leur recette, leurs variables primitives et leurs planches dans Figma.', en: 'Computes palettes and writes their recipe, primitive variables and boards to Figma.' },
    lit: ['recette', 'variables', 'planches'], execution: 'figma',
    ecrit: [{ donnees: ['recette'], destination: 'donnees-partagees-figma' }, { donnees: ['variables', 'planches'], destination: 'document-figma' }],
  },
  {
    id: 'explorateur', libelle: { fr: 'UCM Explorateur', en: 'UCM Explorer' },
    definition: { fr: 'Présente les variables, les composants et la recette des palettes sans écrire dans le document Figma.', en: 'Displays variables, components and the palette recipe without writing to the Figma document.' },
    lit: ['variables', 'composants', 'recette'], execution: 'figma', ecrit: [],
  },
  {
    id: 'kit', libelle: { fr: 'UCM Kit', en: 'UCM Kit' },
    definition: { fr: 'Définit le format et les lecteurs : format, emplois et référentiel sont purs ; les lecteurs complets emploient Node.', en: 'Defines the format and readers: format, color usage and reference data are pure; full readers use Node.' },
    lit: ['contrats', 'tokens-dtcg', 'configuration', 'implementation'], execution: 'pur-et-node',
    ecrit: [{ donnees: ['rapports'], destination: 'memoire' }],
  },
  {
    id: 'cli', libelle: { fr: 'UCM CLI', en: 'UCM CLI' },
    definition: { fr: 'Installe la configuration manquante, contrôle le repository et produit le CSS des tokens.', en: 'Installs missing configuration, checks the repository and produces token CSS.' },
    lit: ['contrats', 'tokens-dtcg', 'configuration', 'implementation'], execution: 'node',
    ecrit: [{ donnees: ['configuration', 'rapports', 'css'], destination: 'repository' }],
  },
  {
    id: 'adapter-typescript', libelle: { fr: 'Adaptateur TypeScript UCM', en: 'UCM TypeScript adapter' },
    definition: { fr: 'Contrôle la parité TS et TSX avec les contrats et dérive les types de leurs variantes.', en: 'Checks TS and TSX parity with contracts and derives their variant types.' },
    lit: ['contrats', 'implementation'], execution: 'node',
    ecrit: [{ donnees: ['types'], destination: 'repository' }, { donnees: ['rapports'], destination: 'memoire' }],
  },
  {
    id: 'couleur', libelle: { fr: 'UCM Couleur', en: 'UCM Color' },
    definition: { fr: 'Calcule les couleurs et les garanties des palettes sans dépendre de Figma ni du DOM.', en: 'Computes palette colors and guarantees without depending on Figma or the DOM.' },
    lit: ['recette', 'couleurs'], execution: 'pur', ecrit: [{ donnees: ['couleurs'], destination: 'memoire' }],
  },
  {
    id: 'socle', libelle: { fr: 'Socle des plugins UCM', en: 'UCM plugin foundation' },
    definition: { fr: 'Fournit les composants d’interface et la construction des distributions des plugins.', en: 'Provides UI components and builds plugin distributions.' },
    lit: ['sources-plugin'], execution: 'pur-et-node', ecrit: [{ donnees: ['bundle-plugin'], destination: 'distribution-plugin' }],
  },
  {
    id: 'architect', libelle: { fr: 'UCM Nomenclature', en: 'UCM Nomenclature' },
    definition: { fr: 'Normalise les noms de collections et de variables, puis range les règles de nommage choisies.', en: 'Normalizes collection and variable names, then stores the chosen naming rules.' },
    lit: ['noms-collections', 'noms-variables', 'regles-de-nommage'], execution: 'figma',
    ecrit: [{ donnees: ['noms-collections', 'noms-variables'], destination: 'document-figma' }, { donnees: ['regles-de-nommage'], destination: 'donnees-partagees-figma' }],
  },
];

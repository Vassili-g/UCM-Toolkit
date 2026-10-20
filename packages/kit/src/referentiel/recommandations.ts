/**
 * Les conseils d'implémentation ne déclarent aucun champ normatif du contrat.
 *
 * Aucun produit ne consomme encore `RECOMMANDATIONS` : seuls l'index du référentiel, les tests du kit et le générateur
 * de la vue illustrée la lisent. Ces conseils ne sont donc pas une règle distribuée aux plugins.
 *
 * Après une modification : relancer `npm test`, régénérer la vue illustrée (`generer-donnees-referentiel.ts`) (elle en tire les recommandations), et changer la version du kit.
 */
import type { Langues } from './termes.js';

export type DeclencheurDeRecommandation = 'focus' | 'etats';
export type Recommandation = {
  readonly id: 'anneau-de-focus' | 'bouton-basculable';
  readonly declencheur: DeclencheurDeRecommandation;
  readonly regle: Langues;
  readonly parametres: Readonly<Record<string, string | number>>;
  readonly preuve: Langues;
};

export const RECOMMANDATIONS: readonly Recommandation[] = [
  {
    id: 'anneau-de-focus', declencheur: 'focus',
    regle: {
      fr: 'Séparer le composant de son anneau de focus par 2 px de la couleur du fond, puis tracer un anneau de 2 px.',
      en: 'Separate the component from its focus ring with 2 px of the background color, then draw a 2 px ring.',
    },
    parametres: { espace: 2, epaisseur: 2, unite: 'px', couleurDeLEspace: 'fond', couleurDuTrait: 'ring' },
    preuve: {
      fr: 'Au focus visible, vérifier les 2 px de fond et les 2 px de trait autour du composant.',
      en: 'With visible focus, check the 2 px background gap and the 2 px stroke around the component.',
    },
  },
  {
    id: 'bouton-basculable', declencheur: 'etats',
    regle: {
      fr: 'Pour un bouton basculable, employer surface au repos et solid quand il est activé.',
      en: 'For a toggle button, use surface at rest and solid when toggled on.',
    },
    parametres: { repos: 'surface', active: 'solid' },
    preuve: {
      fr: 'Comparer les fonds du bouton au repos et activé aux variables surface et solid.',
      en: 'Compare the button backgrounds at rest and toggled on with the surface and solid variables.',
    },
  },
];

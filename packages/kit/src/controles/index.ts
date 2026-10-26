/** Porte des faits et des résultats portables des contrôles de composants. */
export type { ReleveDeComposant, VariantLu, LayerLu, PeintureLue, LiaisonLue } from './releve.js';
export { lectureManquee, layersVisiblesDuVariant } from './releve.js';
export type { CatalogueDeReference, CollectionDuCatalogue, VariableDuCatalogue } from './catalogue.js';
export { cheminDansLaCollection, collectionsDeReference, variableDuCatalogue, collectionDuCatalogue } from './catalogue.js';
export type { Constat, Correction, Question } from './constat.js';
export type { TypeDAlerte } from '../referentiel/signaux.js';
export type { NiveauWcag } from './accessibilite.js';
export {
  controlerLAccessibilite, controlerLAccessibiliteParEtapes, BORNE_DE_COMBINAISONS, SEUILS_D_ACCESSIBILITE,
  CIBLE_MINIMALE_PX, CIBLE_TACTILE_PX, TEXTE_MINIMAL_PX,
} from './accessibilite.js';
export { controlerLaTypographie, controlerLaTypographieParEtapes } from './typographie.js';
export { axeDePropriete, axesDuReleve, axesDuReleveParEtapes, tokensDuComposant, tokensDuComposantParEtapes, segmentDAxe, controlerNommage, controlerNommageParEtapes } from './nommage.js';
export type { AxeDuComposant, TokenDuComposant } from './nommage.js';
export { controlerMapping, controlerMappingParEtapes } from './mapping.js';
export { controlerCouches, controlerCouchesParEtapes } from './couche.js';
export { controlerOublis, controlerOublisParEtapes } from './oublis.js';
export { preparerLesTokens } from './preparation.js';
export type { PreparationDesTokens, VariableAPreparer, ViseDePreparation, LieuDePreparation, ReponsesDePreparation, TailleSansCible, CouleurSansCible } from './preparation.js';
export { clesDesTokensDeTailleAttendus, proposerLesCorrections, proposerLesCorrectionsParEtapes } from './corrections.js';
export { proposerLaPropagation } from './propagation.js';
export { controlerLeTheme, controlerLesModes } from './theme.js';
export { controlerLaStructure, controlerLeCatalogue } from './structure.js';

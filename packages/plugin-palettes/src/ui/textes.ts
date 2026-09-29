/** Types partagés par les vues ; les catalogues sont choisis par leur contexte. */
import type * as Francais from '../i18n/fr';
import type { Localiser } from './localisation';
export type Constat = Localiser<Francais.Constat>;
export type ConstatIllustre = Localiser<Francais.ConstatIllustre>;
export type ContexteDAlerte = Francais.ContexteDAlerte;
export type Jugement = Francais.Jugement;
export type NiveauEcrit = Localiser<Francais.NiveauEcrit>;

/**
 * Ce que l'écran montre, tiré des messages que la frontière lui rend et des
 * gestes locaux (configuration, onglet). Le module est pur : `etatSuivant`
 * rend un nouvel état, ou le même quand l'événement ne change rien.
 */
import type { Bilan } from '../../messages/nomenclature';
import type { MessageAAfficher } from './frontiere';

export type Onglet = 'a-appliquer' | 'a-trancher' | 'a-faire' | 'regles';
export type EcranDeTravail = 'premier-lancement' | 'lecture' | 'travail';
export type Ecran = EcranDeTravail | 'configuration';

/**
 * Un état qui prend la place du contenu. `analyse-en-cours` occupe l'écran
 * `lecture` ; les deux autres occupent les panneaux de l'écran `travail`.
 */
export type EtatParticulier =
  | { readonly type: 'analyse-en-cours'; readonly lues: number; readonly total: number }
  | { readonly type: 'rien-a-faire' }
  | { readonly type: 'sans-variable-locale' };

export interface EtatDeLEcran {
  /** L'écran visible, la Configuration comprise. */
  readonly ecran: Ecran;
  /** L'écran où `Retour` ramène depuis la Configuration. */
  readonly ecranDeTravail: EcranDeTravail;
  readonly onglet: Onglet;
  readonly bilan: Bilan | null;
  /** L'avancement de l'analyse en cours, `null` hors analyse. */
  readonly analyse: { readonly lues: number; readonly total: number } | null;
  readonly comptes: { readonly aAppliquer: number; readonly aTrancher: number };
  readonly particulier: EtatParticulier | null;
  /** Vrai de l'erreur `fichier-modifie` jusqu'au bilan suivant. */
  readonly fichierModifie: boolean;
  readonly configurationOuverte: boolean;
  /** La clé du groupe que la fiche d'un terme a demandé de déplier dans À appliquer ; `null` dès que l'onglet change ou qu'un bilan arrive. */
  readonly carteDemandee: string | null;
}

/** Les gestes locaux, qui ne passent pas par le sandbox. */
export type EvenementLocal =
  | { readonly type: 'configuration-ouverte' }
  | { readonly type: 'configuration-fermee' }
  | { readonly type: 'onglet-choisi'; readonly onglet: Onglet }
  /** Ouvre l'onglet À appliquer et retient la clé du groupe à déplier. */
  | { readonly type: 'carte-demandee'; readonly cle: string };

export type Evenement = MessageAAfficher | EvenementLocal;

type Brut = Pick<EtatDeLEcran, 'onglet' | 'bilan' | 'analyse' | 'fichierModifie' | 'configurationOuverte' | 'carteDemandee'>;

/** Les noms que le bilan propose de renommer, collections comprises, et les questions à trancher. */
export function comptesDuBilan(bilan: Bilan | null): EtatDeLEcran['comptes'] {
  if (!bilan) return { aAppliquer: 0, aTrancher: 0 };
  const renommages = bilan.groupes.reduce((total, groupe) => total + groupe.variables + groupe.collections, 0);
  return { aAppliquer: renommages, aTrancher: bilan.questions.length };
}

/**
 * Rien dans À appliquer ni dans À trancher : ni groupe, ni nom bloqué, ni variable protégée, ni question, ni question remise à plus tard.
 * Une variable protégée a un geste que « Tous les noms suivent vos règles » cacherait.
 */
function rienAFaire(bilan: Bilan): boolean {
  return bilan.groupes.length === 0 && bilan.bloques.length === 0 && bilan.proteges === 0 && bilan.questions.length === 0 && bilan.plusTard.length === 0;
}

/**
 * Un fichier sans variable locale n'a rien à harmoniser, même au premier
 * lancement. Sans bilan, l'écran attend le geste du designer.
 */
function ecranDeTravailDe({ analyse, bilan }: Pick<Brut, 'analyse' | 'bilan'>): EcranDeTravail {
  if (analyse) return 'lecture';
  if (!bilan) return 'premier-lancement';
  if (bilan.sansVariableLocale) return 'travail';
  return bilan.premierLancement ? 'premier-lancement' : 'travail';
}

function particulierDe(ecranDeTravail: EcranDeTravail, { analyse, bilan }: Pick<Brut, 'analyse' | 'bilan'>): EtatParticulier | null {
  if (analyse) return { type: 'analyse-en-cours', lues: analyse.lues, total: analyse.total };
  if (!bilan || ecranDeTravail !== 'travail') return null;
  if (bilan.sansVariableLocale) return { type: 'sans-variable-locale' };
  return rienAFaire(bilan) ? { type: 'rien-a-faire' } : null;
}

function composer(brut: Brut): EtatDeLEcran {
  const ecranDeTravail = ecranDeTravailDe(brut);
  return {
    ecran: brut.configurationOuverte ? 'configuration' : ecranDeTravail,
    ecranDeTravail,
    onglet: brut.onglet,
    bilan: brut.bilan,
    analyse: brut.analyse,
    comptes: comptesDuBilan(brut.bilan),
    particulier: particulierDe(ecranDeTravail, brut),
    fichierModifie: brut.fichierModifie,
    configurationOuverte: brut.configurationOuverte,
    carteDemandee: brut.carteDemandee,
  };
}

export const ETAT_INITIAL: EtatDeLEcran = composer({ onglet: 'a-appliquer', bilan: null, analyse: null, fichierModifie: false, configurationOuverte: false, carteDemandee: null });

/**
 * Les messages qui ne changent pas l'écran (`lignes`, `termes`, `fiche`,
 * `simulation`, `refus`, `application`, `regles-exportees`) rendent l'état reçu.
 * Une `erreur` met fin à l'analyse en cours : l'écran ne reste pas sur la lecture.
 */
export function etatSuivant(etat: EtatDeLEcran, evenement: Evenement): EtatDeLEcran {
  switch (evenement.type) {
    case 'initial':
      return composer({ ...ETAT_INITIAL, analyse: evenement.dejaAnalyse ? { lues: 0, total: 0 } : null });
    case 'analyse-demandee':
      return composer({ ...etat, analyse: { lues: 0, total: 0 }, fichierModifie: false, carteDemandee: null });
    case 'lecture':
      return composer({ ...etat, analyse: { lues: evenement.lues, total: evenement.total } });
    case 'bilan':
      return composer({ ...etat, bilan: evenement.bilan, analyse: null, fichierModifie: false, carteDemandee: null });
    case 'erreur': {
      const fichierModifie = etat.fichierModifie || evenement.code === 'fichier-modifie';
      return etat.analyse === null && fichierModifie === etat.fichierModifie ? etat : composer({ ...etat, analyse: null, fichierModifie });
    }
    case 'configuration-ouverte':
      return etat.configurationOuverte ? etat : composer({ ...etat, configurationOuverte: true });
    case 'configuration-fermee':
      return etat.configurationOuverte ? composer({ ...etat, configurationOuverte: false }) : etat;
    case 'onglet-choisi':
      return evenement.onglet === etat.onglet && etat.carteDemandee === null ? etat : composer({ ...etat, onglet: evenement.onglet, carteDemandee: null });
    case 'carte-demandee':
      return evenement.cle === etat.carteDemandee && etat.onglet === 'a-appliquer' ? etat : composer({ ...etat, onglet: 'a-appliquer', carteDemandee: evenement.cle });
    default:
      return etat;
  }
}

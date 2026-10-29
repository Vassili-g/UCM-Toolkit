/**
 * Ce que la section Informations du panneau montre d'un constat `info` : sa phrase et sa ligne de lieu. Le calcul ne touche pas au DOM.
 * Une information dit ce que l'analyse n'a pas pu ou pas voulu mesurer ; elle n'a ni sévérité, ni statut, ni geste. La phrase est une
 * chaîne où les mots entre accents graves sont cités en code, comme celle d'un constat à faire dans Figma.
 *
 * Le kit rend cinq sortes d'information : les variants désactivés exclus du contraste (C53), une limite de lecture du contraste (C49,
 * C50), le fond de repli pris sur la page Figma (C49, C50), la borne des combinaisons de modes (C49) et une règle d'icônes que le relevé
 * ne lit pas (C67). Un autre constat `info` garde la phrase qu'il porte, ou une phrase générique.
 */
import type { Constat } from '../../messages/commun';
import { lieuDe, nomsDesVariants, type ContexteDAFaire } from '../ignores/modele';
import type { MorceauDeLieu } from '../composant/variants';
import { TEXTES } from '../textes';

const T = TEXTES.informationsDuPanneau;

export interface LigneDInformation {
  readonly constat: Constat;
  readonly phrase: string;
  /** La ligne de lieu ; vide quand l'information ne désigne aucun variant ni layer. */
  readonly lieu: readonly MorceauDeLieu[];
}

const texte = (valeur: string | number | undefined): string | null => (typeof valeur === 'string' && valeur !== '' ? valeur : typeof valeur === 'number' ? String(valeur) : null);

/** L'état exclu, écrit comme les variants l'écrivent (`Disabled`), pris dans le premier variant dont la valeur est « disabled ». */
function etatExclu(constat: Constat, contexte: ContexteDAFaire): string {
  for (const nom of nomsDesVariants(constat, contexte)) {
    for (const paire of nom.split(', ')) {
      const valeur = paire.slice(paire.indexOf('=') + 1);
      if (valeur.toLowerCase() === 'disabled') return valeur;
    }
  }
  return 'Disabled';
}

/** Le total de paires, sans passer par un nombre : le kit rend un compte plus grand que 2^53 en chiffres. */
function total(mesurees: string | number | undefined, nonMesurees: string): string {
  try {
    return String(BigInt(nonMesurees) + BigInt(texte(mesurees) ?? '0'));
  } catch {
    return nonMesurees;
  }
}

export function ligneDInformation(constat: Constat, contexte: ContexteDAFaire): LigneDInformation {
  const { faits } = constat;
  const calque = texte(faits.calque);
  const sansLayer = (phrase: string): LigneDInformation => ({ constat, phrase, lieu: lieuDe(constat, contexte, { sansLayer: true }) });
  if (constat.code === 'C53') return sansLayer(T.variantsExclus(etatExclu(constat, contexte)));
  if (constat.code === 'C67' && faits.cause === 'icone-non-pilotee') return sansLayer(T.iconeNonPilotee(calque ?? ''));
  if (constat.code === 'C67' && faits.cause === 'icones-permises-non-lues') return { constat, phrase: T.iconesPermisesNonLues(texte(faits.propriete) ?? ''), lieu: lieuDe(constat, contexte) };
  if (constat.code === 'C49' || constat.code === 'C50') {
    if (faits.cause === 'fond-de-repli') return { constat, phrase: T.fondDeRepli, lieu: lieuDe(constat, contexte) };
    if (faits.borne !== undefined) return { constat, phrase: T.pairesNonMesurees(texte(faits.combinaisonsNonMesurees) ?? '0', total(faits.combinaisonsMesurees, texte(faits.combinaisonsNonMesurees) ?? '0')), lieu: [] };
    if (faits.cause !== undefined) return sansLayer(T.contrasteNonMesure(texte(faits.champ) ?? 'fills', calque, texte(faits.cause) ?? ''));
  }
  const phrase = texte(faits.titre) ?? texte(faits.message) ?? TEXTES.aFaireDuComposant.sansPhrase(constat.code);
  return { constat, phrase, lieu: lieuDe(constat, contexte) };
}

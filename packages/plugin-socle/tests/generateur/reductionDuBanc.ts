/**
 * La réduction du banc : un document dont le banc rend un écart se ramène au plus petit document qui rend encore le même écart. Elle
 * reprend `reduireSelon` de `reduction.ts`, donc le retrait des calques, des sous-arbres et des variables et le garde du document avant
 * chaque jugement, et ne change que le jugement : l'écart témoin doit rester.
 *
 * `ecartsDuDocument` est le banc d'un document (tirage lu, export, lecture, comparaison). Le test sans moteur lui donne une lecture
 * fabriquée depuis le modèle de vérité ; le parcours complet (`banc.ts`, sous-lot 1.9c) lui donne l'export du moteur. Un candidat que le
 * banc ne sait pas juger, parce qu'un calque dont il a besoin a disparu, n'est pas une réduction valable : l'erreur du banc compte
 * comme « l'écart a disparu ».
 */
import type { Ecart } from './comparateur';
import { verifierDocument } from './oracle';
import { reduireSelon } from './reduction';
import type { DocumentGenere } from './types';

/** Le garde d'Architect sans la règle des origines de liaison : `spec.origines` décrit l'analyse d'Architect, le banc des pièces ne l'écrit pas. */
const gardeDuBanc = (document: DocumentGenere) => verifierDocument(document).filter((refus) => refus.code !== 'origine-incoherente');

export type EcartsDuDocument = (document: DocumentGenere) => Promise<readonly Ecart[]>;

/** Le même écart : le variant, l'identité du calque et le champ. Les valeurs peuvent changer quand le document rétrécit. */
export const signatureDEcart = (e: Ecart): string => JSON.stringify([e.variant, e.identite, e.champ]);

export async function reduireLeDocumentDuBanc(document: DocumentGenere, temoin: Ecart, ecartsDuDocument: EcartsDuDocument) {
  const signature = signatureDEcart(temoin);
  const resultat = await reduireSelon(document, async (candidat) => {
    try {
      return (await ecartsDuDocument(candidat)).some((e) => signatureDEcart(e) === signature);
    } catch {
      return false;
    }
  }, gardeDuBanc);
  return { ...resultat, signature };
}

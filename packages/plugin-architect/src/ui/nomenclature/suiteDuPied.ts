/**
 * L'issue d'une demande de renommage que le pied commun a lancée (`tokens/cochage.ts`). Le pied écrit les corrections de structure
 * seulement quand les renommages sont écrits et le fichier relu : l'issue `ecrit` part donc avec le `bilan` de la demande, non avec
 * la réponse `application`. Un refus, une erreur ou une nouvelle lecture donnent `echec`, et l'issue ne part qu'une fois.
 * Le module ne touche pas au DOM : `aAppliquer.ts` lui rend les messages du sandbox.
 */
import type { ResultatVue } from '../../messages/nomenclature';
import type { IssueDesRenommages } from '../tokens/cochage';

export interface SuiteDuPied {
  /** Une demande de renommage est partie ; `suite` reçoit son issue. */
  attendre(demande: number, suite: (issue: IssueDesRenommages) => void): void;
  /** Vrai de l'envoi à l'issue. */
  enCours(): boolean;
  /** Le sandbox a répondu `application` ou `annulation` à `demande`. */
  recevoirLeResultat(demande: number, resultat: Pick<ResultatVue, 'sorte' | 'statut'>): void;
  /** Le sandbox a relu le fichier après l'écriture de `demande`. */
  recevoirLeBilan(demande: number): void;
  /** Le sandbox a répondu `erreur` à `demande`. */
  recevoirUneErreur(demande: number): void;
  /** L'écran repart de zéro : la demande en cours n'a plus de suite. */
  repartir(): void;
}

export function creerLaSuiteDuPied(): SuiteDuPied {
  let courante: { readonly demande: number; readonly suite: (issue: IssueDesRenommages) => void; ecrit: boolean } | null = null;

  function conclure(issue: IssueDesRenommages): void {
    const finie = courante;
    courante = null;
    finie?.suite(issue);
  }

  return {
    attendre(demande, suite) {
      courante = { demande, suite, ecrit: false };
    },
    enCours: () => courante !== null,
    recevoirLeResultat(demande, resultat) {
      if (courante?.demande !== demande || resultat.sorte !== 'application') return;
      if (resultat.statut === 'refuse') conclure('echec');
      else courante.ecrit = true;
    },
    recevoirLeBilan(demande) {
      if (courante?.demande === demande && courante.ecrit) conclure('ecrit');
    },
    recevoirUneErreur(demande) {
      if (courante?.demande === demande) conclure('echec');
    },
    repartir() {
      if (courante) conclure('echec');
    },
  };
}

/**
 * Le domaine `structure` de l'interface : il demande au sandbox les constats et les corrections de structure, ignore une réponse dont la
 * demande est remplacée, puis monte « À faire dans Figma » dans son onglet et les corrections de modes et de scopes à la suite des
 * renommages dans l'onglet Corrections. Les comptes des deux onglets passent par la coquille.
 */
import type { DemandeDeStructure, MessageDeStructure } from '../../messages/structure';
import type { Constat, Correction } from '../../messages/commun';
import type { Coquille } from '../nomenclature/coquille';
import { monterAFaire } from './aFaire';
import { monterLesCorrections } from './corrections';
import { lireLesConstats, lireLesCorrections, type Noms } from './lecture';

export interface OptionsDeStructure {
  readonly envoyer: (message: DemandeDeStructure) => void;
  /** Le relevé courant, lu au moment du rendu : une variable se retrouve par sa clé ou par son nom entier. */
  readonly noms: Noms;
  /** Montre une variable dans l'explorateur, fiche ouverte. */
  readonly ouvrirLaFiche: (cle: string) => void;
}

export interface Structure {
  /** Demande une nouvelle lecture ; la réponse d'une demande plus ancienne est ignorée. */
  demander(): void;
  recevoir(message: MessageDeStructure): void;
}

export function monterStructure(coquille: Coquille, { envoyer, noms, ouvrirLaFiche }: OptionsDeStructure): Structure {
  /** Les demandes de ce domaine se numérotent à part : prendre un numéro du compteur de l'application décalerait celui de la vue composant. */
  let compteur = 0;
  const nouvelleDemande = (): number => (compteur += 1);
  let demande: number | null = null;
  let demandeDApplication: number | null = null;
  let recu: { readonly constats: readonly Constat[]; readonly corrections: readonly Correction[] } | null = null;

  const aFaire = monterAFaire(coquille.panneaux.aFaire.contenu, ({ nom, cle }) => {
    const cible = cle ?? noms.cle(nom);
    if (cible !== null) ouvrirLaFiche(cible);
  });
  const hoteDesCorrections = document.createElement('div');
  hoteDesCorrections.className = 'page-stack';
  coquille.panneaux.aAppliquer.element.append(hoteDesCorrections);
  let afficheLesComptes = (): void => {};
  const corrections = monterLesCorrections({
    element: hoteDesCorrections,
    auChangement: () => afficheLesComptes(),
    appliquer(ids) {
      demandeDApplication = nouvelleDemande();
      corrections.attendre(true);
      envoyer({ type: 'appliquer-structure', demande: demandeDApplication, ids });
    },
  });

  let constatsLus = 0;
  afficheLesComptes = () => coquille.poserLesComptesDeStructure({ aFaire: constatsLus, corrections: corrections.nombre() });

  function rendre(): void {
    const constats = recu ? lireLesConstats(recu.constats, noms) : null;
    constatsLus = constats?.length ?? 0;
    aFaire.poser(constats);
    corrections.poser(recu ? lireLesCorrections(recu.corrections, noms) : null);
  }

  function demander(): void {
    demande = nouvelleDemande();
    envoyer({ type: 'lire-structure', demande });
  }

  return {
    demander,
    recevoir(message) {
      if (message.type === 'structure') {
        if (message.demande !== demande) return;
        recu = { constats: message.constats, corrections: message.corrections };
        rendre();
        return;
      }
      if (message.demande !== demandeDApplication) return;
      demandeDApplication = null;
      corrections.attendre(false);
      corrections.appliquee(message.ecrites, message.sautees.length);
      demander();
    },
  };
}

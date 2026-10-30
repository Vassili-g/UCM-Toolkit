/**
 * Le domaine `structure` de l'interface : il demande au sandbox les constats et les corrections de structure, ignore une réponse dont la
 * demande est remplacée, puis monte « À faire dans Figma » dans son onglet et les corrections de variables manquantes, de crans, de
 * modes et de scopes à la suite des renommages dans l'onglet Corrections. « Tout désélectionner » ouvre cet onglet : il décoche les
 * renommages de Nomenclature et les corrections de structure d'un seul geste. Les comptes des deux onglets passent par la coquille.
 */
import { createButton } from 'ucm-plugin-socle/src/ui/Button';
import { TEXTES } from '../textes';
import type { DemandeDeStructure, IgnoresDeStructure, MessageDeStructure } from '../../messages/structure';
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
  let recu: { readonly constats: readonly Constat[]; readonly corrections: readonly Correction[]; readonly ignores: IgnoresDeStructure } | null = null;

  /** Un geste d'Ignorer prend un numéro neuf : la réponse est la relecture de la structure, et celle d'une lecture plus ancienne est laissée. */
  const demanderAvec = (message: (numero: number) => DemandeDeStructure): void => {
    demande = nouvelleDemande();
    envoyer(message(demande));
  };
  const aFaire = monterAFaire(coquille.panneaux.aFaire.contenu, ({ nom, cle }) => {
    const cible = cle ?? noms.cle(nom);
    if (cible !== null) ouvrirLaFiche(cible);
  }, {
    ignorerPourLaPalette: (constat) => demanderAvec((numero) => ({ type: 'ignorer-constat-de-structure', demande: numero, constat })),
    ignorerDansLeFichier: (role) => demanderAvec((numero) => ({ type: 'ignorer-role', demande: numero, role })),
    nePlusIgnorerLeConstat: (constat) => demanderAvec((numero) => ({ type: 'retablir-constat-de-structure', demande: numero, constat })),
    nePlusIgnorerLeRole: (role) => demanderAvec((numero) => ({ type: 'retablir-role', demande: numero, role })),
  });
  const hoteDesCorrections = document.createElement('div');
  hoteDesCorrections.className = 'page-stack';
  coquille.panneaux.aAppliquer.element.append(hoteDesCorrections);
  let afficheLesComptes = (): void => {};
  const toutDeselectionner = document.createElement('div');
  toutDeselectionner.className = 'tout-deselectionner';
  toutDeselectionner.hidden = true;
  toutDeselectionner.append(
    createButton({
      label: TEXTES.toutDeselectionner,
      variant: 'secondary',
      compact: true,
      onClick: () => {
        coquille.toutDecocher();
        corrections.toutDecocher();
      },
    }),
  );
  coquille.panneaux.aAppliquer.element.prepend(toutDeselectionner);
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
  afficheLesComptes = () => {
    toutDeselectionner.hidden = corrections.nombre() === 0;
    coquille.poserLesComptesDeStructure({ aFaire: constatsLus, corrections: corrections.nombre() });
  };

  function rendre(): void {
    const constats = recu ? lireLesConstats(recu.constats, noms) : null;
    constatsLus = constats?.length ?? 0;
    aFaire.poser(constats, recu ? { constats: lireLesConstats(recu.ignores.constats, noms), roles: recu.ignores.roles } : undefined);
    corrections.poser(recu ? lireLesCorrections(recu.corrections, noms, recu.constats) : null);
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
        recu = { constats: message.constats, corrections: message.corrections, ignores: message.ignores };
        rendre();
        return;
      }
      if (message.demande !== demandeDApplication) return;
      demandeDApplication = null;
      corrections.attendre(false);
      corrections.appliquee(message.ecrites, message.sautees, message.sansAnnulation);
      demander();
    },
  };
}

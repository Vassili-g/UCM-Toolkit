/**
 * Le rapport d'analyse du mode Tokens. Le panneau mesure ce que le sandbox ne voit pas : la durée du rendu de `structure` et la taille
 * des messages `releve` et `structure`. Le lien demande au sandbox son journal des phases, y joint ces mesures et télécharge le fichier.
 * Des durées et des octets, jamais un nom de variable.
 */
import { TEXTES } from '../textes';
import { contenuDuRapportDeTokens, nomDuRapportDeTokens, telecharger } from '../telechargement';

const T = TEXTES.panneauDesConstats;

/** Les derniers rendus que le rapport garde : chaque geste d'Ignorer ou d'Appliquer en ajoute un. */
export const RENDUS_RETENUS = 60;

export interface MesuresDuPanneau {
  /** Range la taille en caractères d'un message reçu, `JSON.stringify(message).length`. */
  noterLaTaille(message: 'releve' | 'structure', octets: number): void;
  /** Range la durée d'un rendu de `structure`, de la réception du message à la fin du rendu. */
  noterLeRendu(ms: number): void;
  /** Ajoute le rendu et les tailles aux mesures du sandbox : un passage `rendu` par rendu, puis `tailles`. */
  joindre(mesuresDuSandbox: unknown): unknown;
}

export function creerLesMesuresDuPanneau(): MesuresDuPanneau {
  const tailles: Partial<Record<'releve' | 'structure', number>> = {};
  const rendus: number[] = [];
  return {
    noterLaTaille(message, octets) {
      tailles[message] = octets;
    },
    noterLeRendu(ms) {
      rendus.push(ms);
      if (rendus.length > RENDUS_RETENUS) rendus.splice(0, rendus.length - RENDUS_RETENUS);
    },
    joindre(mesuresDuSandbox) {
      const base = (typeof mesuresDuSandbox === 'object' && mesuresDuSandbox !== null ? mesuresDuSandbox : {}) as { passages?: readonly unknown[] };
      return { ...base, passages: [...(base.passages ?? []), ...rendus.map((ms) => ({ phase: 'rendu', ms, appels: {} }))], tailles: { ...tailles } };
    },
  };
}

export interface OptionsDuRapportDeTokens {
  /** Demande les mesures du sandbox ; `auRetour` les reçoit en JSON, ou `null` en cas d'échec. */
  readonly preparer: (auRetour: (mesures: string | null) => void) => void;
  readonly mesures: MesuresDuPanneau;
  readonly telecharger?: (nom: string, contenu: string, type: string) => void;
  readonly maintenant?: () => Date;
}

export interface RapportDeTokens {
  readonly element: HTMLElement;
  /** Montre ou masque le lien : il n'a rien à rendre avant la première lecture de la structure. */
  poser(visible: boolean): void;
}

/** Le lien discret du rapport, au pied des onglets : même classes, même libellé que sous la liste du mode Composant. */
export function monterLeRapportDeTokens({ preparer, mesures, telecharger: telechargerLeFichier = telecharger, maintenant = () => new Date() }: OptionsDuRapportDeTokens): RapportDeTokens {
  const element = document.createElement('div');
  element.className = 'pied-rapport';
  element.hidden = true;
  let etat: 'repos' | 'prepare' | 'echoue' = 'repos';

  function dessiner(): void {
    const lien = document.createElement('button');
    lien.type = 'button';
    lien.className = 'lien-rapport';
    lien.textContent = etat === 'prepare' ? T.rapportEnCours : T.rapport;
    lien.disabled = etat === 'prepare';
    lien.addEventListener('click', demander);
    element.replaceChildren(lien);
    if (etat === 'echoue') {
      const note = document.createElement('span');
      note.className = 'note-rapport';
      note.textContent = T.rapportEchoue;
      element.append(note);
    }
  }

  function demander(): void {
    if (etat === 'prepare') return;
    etat = 'prepare';
    dessiner();
    preparer((brut) => {
      try {
        if (brut === null) throw new Error('rapport illisible');
        const date = maintenant();
        telechargerLeFichier(nomDuRapportDeTokens(date), contenuDuRapportDeTokens(mesures.joindre(JSON.parse(brut)), date), 'application/json');
        etat = 'repos';
      } catch {
        etat = 'echoue';
      }
      dessiner();
    });
  }

  dessiner();
  return {
    element,
    poser(visible) {
      element.hidden = !visible;
    },
  };
}

/** La feuille modale commune : étapes, focus clavier et fermeture. */

export interface LibellesDeFeuille {
  retour: string;
  fermer: string;
}

export interface OptionsFeuille {
  titre: string;
  retour?: () => void;
  corps: HTMLElement;
  pied: HTMLElement;
  onFermer: () => void;
  libelles?: Partial<LibellesDeFeuille>;
}

export interface ContenuFeuille {
  titre: string;
  retour?: () => void;
  corps: HTMLElement;
  pied: HTMLElement;
  libelles?: Partial<LibellesDeFeuille>;
}

export interface FeuilleUi {
  element: HTMLDivElement;
  remplacer(contenu: ContenuFeuille): void;
  fermer(): void;
}

/** Crée une feuille modale qui garde le focus et le rend à son ouvreur. */
export function createFeuille(options: OptionsFeuille): FeuilleUi {
  const element = document.createElement('div');
  element.className = 'feuille-voile';

  const dialogue = document.createElement('section');
  dialogue.className = 'feuille';
  dialogue.setAttribute('role', 'dialog');
  dialogue.setAttribute('aria-modal', 'true');

  const poignee = document.createElement('div');
  poignee.className = 'feuille-poignee';
  poignee.setAttribute('aria-hidden', 'true');

  const entete = document.createElement('header');
  entete.className = 'feuille-entete';
  const titre = document.createElement('h2');
  titre.className = 'feuille-titre';
  titre.id = `feuille-titre-${Math.random().toString(36).slice(2)}`;
  dialogue.setAttribute('aria-labelledby', titre.id);

  const boutonRetour = document.createElement('button');
  boutonRetour.type = 'button';
  boutonRetour.className = 'feuille-retour';
  boutonRetour.setAttribute('aria-label', options.libelles?.retour ?? 'Retour');
  boutonRetour.textContent = '‹';

  const boutonFermer = document.createElement('button');
  boutonFermer.type = 'button';
  boutonFermer.className = 'feuille-fermer';
  boutonFermer.setAttribute('aria-label', options.libelles?.fermer ?? 'Fermer');
  boutonFermer.textContent = '×';

  const corps = document.createElement('div');
  corps.className = 'feuille-corps';
  const pied = document.createElement('footer');
  pied.className = 'feuille-pied';

  let fermee = false;
  let retour: (() => void) | undefined;
  let libelleRetour = options.libelles?.retour ?? 'Retour';
  let libelleFermer = options.libelles?.fermer ?? 'Fermer';
  const declencheur = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  let dernierFocus: HTMLElement = boutonFermer;

  function fermer() {
    if (fermee) return;
    fermee = true;
    document.removeEventListener('focusin', garderFocusDansLaFeuille, true);
    element.remove();
    if (declencheur?.isConnected) declencheur.focus();
    options.onFermer();
  }

  function garderFocusDansLaFeuille(evenement: FocusEvent) {
    if (!(evenement.target instanceof HTMLElement)) return;
    if (dialogue.contains(evenement.target)) {
      dernierFocus = evenement.target;
      return;
    }
    const focusDeRetour = dernierFocus.isConnected ? dernierFocus : boutonFermer;
    focusDeRetour.focus();
  }

  function estVisible(cible: HTMLElement): boolean {
    for (let ancetre: HTMLElement | null = cible; ancetre && ancetre !== dialogue; ancetre = ancetre.parentElement) {
      if (ancetre.hidden || ancetre.inert || ancetre.getAttribute('aria-hidden') === 'true') return false;
    }
    return true;
  }

  function afficher(contenu: ContenuFeuille) {
    titre.textContent = contenu.titre;
    retour = contenu.retour;
    libelleRetour = contenu.libelles?.retour ?? libelleRetour;
    libelleFermer = contenu.libelles?.fermer ?? libelleFermer;
    boutonRetour.setAttribute('aria-label', libelleRetour);
    boutonFermer.setAttribute('aria-label', libelleFermer);
    boutonRetour.hidden = contenu.retour === undefined;
    corps.replaceChildren(contenu.corps);
    pied.replaceChildren(contenu.pied);
  }

  boutonFermer.addEventListener('click', fermer);
  boutonRetour.addEventListener('click', () => retour?.());
  element.addEventListener('click', (evenement) => {
    if (evenement.target === element) fermer();
  });
  element.addEventListener('keydown', (evenement) => {
    if (evenement.key === 'Escape') {
      evenement.preventDefault();
      fermer();
      return;
    }
    if (evenement.key !== 'Tab') return;

    const elements = Array.from(dialogue.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])',
    )).filter((cible) => cible.tabIndex >= 0 && estVisible(cible));
    if (elements.length === 0) {
      evenement.preventDefault();
      dialogue.focus();
      return;
    }

    const premier = elements[0];
    const dernier = elements[elements.length - 1];
    if (evenement.shiftKey && (document.activeElement === premier || !dialogue.contains(document.activeElement))) {
      evenement.preventDefault();
      dernier.focus();
    } else if (!evenement.shiftKey && (document.activeElement === dernier || !dialogue.contains(document.activeElement))) {
      evenement.preventDefault();
      premier.focus();
    }
  });

  dialogue.tabIndex = -1;
  entete.append(boutonRetour, titre, boutonFermer);
  dialogue.append(poignee, entete, corps, pied);
  element.append(dialogue);
  afficher(options);
  document.body.append(element);
  document.addEventListener('focusin', garderFocusDansLaFeuille, true);
  boutonFermer.focus();

  return {
    element,
    remplacer(contenu) {
      if (fermee) return;
      afficher(contenu);
      (contenu.retour ? boutonRetour : boutonFermer).focus();
    },
    fermer,
  };
}

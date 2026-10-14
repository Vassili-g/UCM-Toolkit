/**
 * Onglets selon le motif WAI-ARIA « tabs » : la tabulation n'atteint que
 * l'onglet actif, les flèches, Début et Fin déplacent le focus, et le focus
 * active l'onglet. Les panneaux sont locaux et s'affichent sans délai, cas où
 * le guide recommande l'activation automatique.
 *
 * Tous les panneaux restent dans le DOM : une saisie en cours survit à un
 * changement d'onglet.
 */

export interface DefinitionOnglet<Id extends string> {
  id: Id;
  libelle: string;
  panneau: HTMLElement;
}

export interface OngletsUi<Id extends string> {
  liste: HTMLDivElement;
  selectionner(id: Id): void;
  /** Si l'actif devient indisponible, le premier disponible s'active. */
  definirDisponible(id: Id, disponible: boolean): void;
  /** Sans onglet disponible, aucun panneau n'est affiché. */
  actif(): Id | undefined;
}

export function createOnglets<Id extends string>(
  etiquette: string,
  definitions: DefinitionOnglet<Id>[],
  onSelection: (id: Id) => void = () => {},
): OngletsUi<Id> {
  const liste = document.createElement('div');
  liste.className = 'onglets';
  liste.setAttribute('role', 'tablist');
  liste.setAttribute('aria-label', etiquette);

  const onglets = definitions.map(({ id, libelle, panneau }) => {
    const onglet = document.createElement('button');
    onglet.type = 'button';
    onglet.className = 'onglet';
    onglet.id = `onglet-${id}`;
    onglet.textContent = libelle;
    onglet.setAttribute('role', 'tab');
    onglet.setAttribute('aria-disabled', 'false');
    onglet.setAttribute('aria-controls', `panneau-${id}`);
    onglet.addEventListener('click', () => selectionner(id));

    panneau.id = `panneau-${id}`;
    panneau.setAttribute('role', 'tabpanel');
    panneau.setAttribute('aria-labelledby', onglet.id);
    panneau.tabIndex = 0;

    liste.appendChild(onglet);
    return { id, onglet, panneau };
  });

  let courant: Id | undefined;

  function afficher(id: Id | undefined) {
    courant = id;
    for (const { id: candidat, onglet, panneau } of onglets) {
      const choisi = candidat === id;
      onglet.setAttribute('aria-selected', String(choisi));
      onglet.tabIndex = choisi ? 0 : -1;
      panneau.hidden = !choisi;
    }
  }

  function selectionner(id: Id) {
    const cible = onglets.find((candidat) => candidat.id === id);
    if (!cible || cible.onglet.disabled) return;
    afficher(id);
    onSelection(id);
  }

  function definirDisponible(id: Id, disponible: boolean) {
    const cible = onglets.find((candidat) => candidat.id === id);
    if (!cible || cible.onglet.disabled === !disponible) return;
    const avaitLeFocus = document.activeElement === cible.onglet;
    cible.onglet.disabled = !disponible;
    cible.onglet.setAttribute('aria-disabled', String(!disponible));
    if (courant !== id && courant !== undefined) return;
    const premier = onglets.find(({ onglet }) => !onglet.disabled);
    if (premier) {
      selectionner(premier.id);
      if (avaitLeFocus) premier.onglet.focus();
    } else {
      afficher(undefined);
    }
  }

  liste.addEventListener('keydown', (evenement) => {
    const disponibles = onglets.filter(({ onglet }) => !onglet.disabled);
    if (disponibles.length === 0) return;
    const rang = disponibles.findIndex(({ id }) => id === courant);
    const cibles: Record<string, number> = {
      ArrowRight: (rang + 1) % disponibles.length,
      ArrowLeft: (rang - 1 + disponibles.length) % disponibles.length,
      Home: 0,
      End: disponibles.length - 1,
    };
    const cible = cibles[evenement.key];
    if (cible === undefined) return;
    evenement.preventDefault();
    selectionner(disponibles[cible].id);
    disponibles[cible].onglet.focus();
  });

  if (definitions[0]) selectionner(definitions[0].id);
  return { liste, selectionner, definirDisponible, actif: () => courant };
}

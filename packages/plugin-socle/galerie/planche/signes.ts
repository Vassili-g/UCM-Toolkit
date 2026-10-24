/**
 * La planche des signes du socle : chaque signe de `SIGNES`, rangé par famille,
 * en gris puis dans la couleur de sa famille, aux trois tailles (24, 16, 14 px).
 * Une famille sans teinte (types Figma, propositions, publication) reste grise
 * dans les deux groupes. Une dernière section montre les tuiles qui portent une
 * valeur. Les coques (rangée, intertitre) n'ont de style que dans `planche.css`.
 */
import { FAMILLES_DE_SIGNES, REPRISES_DE_SIGNES, SIGNES, type IdDeFamilleDeSignes } from '@ucm-kit/core/referentiel';
import { creerSigne, type TailleDeSigne } from '../../src/ui/Signe';

const TAILLES: readonly TailleDeSigne[] = [24, 16, 14];

function intertitre(texte: string): HTMLDivElement {
  const element = document.createElement('div');
  element.className = 'intertitre';
  const titre = document.createElement('h2');
  titre.textContent = texte;
  element.append(titre);
  return element;
}

function groupe(...signes: HTMLElement[]): HTMLSpanElement {
  const element = document.createElement('span');
  element.className = 'planche-signe-groupe';
  element.append(...signes);
  return element;
}

function rangee(libelle: string, ...groupes: HTMLElement[]): HTMLDivElement {
  const element = document.createElement('div');
  element.className = 'planche-signe';
  const nom = document.createElement('span');
  nom.className = 'planche-signe-id';
  nom.textContent = libelle;
  element.append(nom, ...groupes);
  return element;
}

/** Un signe aux trois tailles, gris puis en couleur. */
function rangeeDeSigne(libelle: string, id: string, famille: IdDeFamilleDeSignes): HTMLDivElement {
  return rangee(
    libelle,
    groupe(...TAILLES.map((taille) => creerSigne(id, { taille, famille }))),
    groupe(...TAILLES.map((taille) => creerSigne(id, { taille, famille, informe: true }))),
  );
}

function grille(...rangees: HTMLElement[]): HTMLDivElement {
  const element = document.createElement('div');
  element.className = 'planche-signes';
  element.append(...rangees);
  return element;
}

/** Les tuiles qui portent une valeur : la couleur d'un token remplit la tuile, l'encre suit sa clarté. */
function rangeesDeValeurs(): HTMLElement[] {
  const valeurs: readonly { libelle: string; id: string; valeur?: string; clair?: boolean }[] = [
    { libelle: 'fill, clair', id: 'usage-fill', valeur: '#fbbf24', clair: true },
    { libelle: 'fill, sombre', id: 'usage-fill', valeur: '#1e3a8a' },
    { libelle: 'texte, clair', id: 'usage-texte', valeur: '#e5e7eb', clair: true },
    { libelle: 'texte, sombre', id: 'usage-texte', valeur: '#0d6b3f' },
    { libelle: 'icône, sombre', id: 'usage-icone', valeur: '#b91c1c' },
    { libelle: 'stroke', id: 'usage-stroke', valeur: '#0d99ff' },
    { libelle: 'shadow, sombre', id: 'usage-effet', valeur: '#4b5563' },
    { libelle: 'à créer, sans couleur', id: 'a-creer' },
    { libelle: 'à créer, avec couleur', id: 'a-creer', valeur: '#7c3aed' },
  ];
  return valeurs.map(({ libelle, id, valeur, clair }) =>
    rangee(libelle, groupe(...TAILLES.map((taille) => creerSigne(id, { taille, valeur, clair })))),
  );
}

export function montrerLesSignes(hote: HTMLElement): void {
  hote.append(intertitre('Gris à gauche, dans la couleur de la famille à droite ; 24, 16 et 14 px'));
  for (const famille of FAMILLES_DE_SIGNES) {
    const propres = SIGNES.filter((signe) => signe.famille === famille.id).map((signe) => rangeeDeSigne(signe.id, signe.id, famille.id));
    const reprises = (REPRISES_DE_SIGNES.find((reprise) => reprise.famille === famille.id)?.reprend ?? []).map((repris) =>
      rangeeDeSigne(`${repris.id} (repris)`, repris.id, famille.id),
    );
    hote.append(intertitre(`${famille.libelle}${famille.teinte ? ` · ${famille.teinte}` : ' · gris'}`), grille(...propres, ...reprises));
  }
  hote.append(intertitre('Une valeur dans la tuile'), grille(...rangeesDeValeurs()));
}

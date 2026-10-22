/**
 * L'onglet Historique de la Configuration : le dernier renommage et le dernier import, chacun avec son bouton d'annulation et le diff de ce
 * que l'annulation remettrait. Le module ne parle pas au sandbox : `configuration.ts` lui donne les actions et le dernier bilan.
 *
 * Les classes s'écrivent en toutes lettres dans une affectation de `className` : la loi des styles ne lit que celles-là.
 */
import { createButton } from 'ucm-plugin-socle/src/ui/Button';
import { creerChevron } from 'ucm-plugin-socle/src/ui/Chevron';
import type { Convention } from '@ucm-kit/core/referentiel';
import type { Bilan, CollectionDuJournal, LigneDImport, LigneDuJournal } from '../../nomenclature/messages';
import { poserLesSegments, specimenDeConvention } from './aAppliquer';
import { TEXTES } from './textes';

type DernierRenommage = NonNullable<Bilan['dernierRenommage']>;
type DernierImport = NonNullable<Bilan['dernierImport']>;

export interface ActionsDeLHistorique {
  /** Le designer demande l'annulation du renommage ; la configuration ouvre la confirmation. */
  readonly annulerLeRenommage: () => void;
  readonly annulerLImport: () => void;
}

export interface Historique {
  readonly element: HTMLElement;
  /** Redessine le dernier renommage et le dernier import ; les cartes gardent leur état ouvert ou fermé. */
  poser(renommage: DernierRenommage | null, dernierImport: DernierImport | null): void;
  /** La ligne verte qui suit une annulation réussie ; `null` la retire. */
  reussite(retablis: number | null): void;
  /** Un bouton reste inactif tant que la réponse à sa demande n'est pas arrivée. */
  bloquer(enCours: { readonly renommage: boolean; readonly importe: boolean }): void;
}

function creer<T extends keyof HTMLElementTagNameMap>(balise: T, texte?: string): HTMLElementTagNameMap[T] {
  const element = document.createElement(balise);
  if (texte !== undefined) element.textContent = texte;
  return element;
}

function jeton(texte: string): HTMLElement {
  const element = creer('span', texte);
  element.className = 'jeton jeton-neutre';
  return element;
}

function meta(texte: string): HTMLElement {
  const element = creer('span', texte);
  element.className = 'meta';
  return element;
}

function note(texte: string): HTMLElement {
  const element = creer('p', texte);
  element.className = 'historique-note';
  return element;
}

function phraseDeRegle(texte: string): HTMLElement {
  const element = creer('span', texte);
  element.className = 'phrase-regle';
  return element;
}

/** La flèche d'une règle, ou celle qui précède le nom d'après l'annulation sous 520 px. */
function fleche(texte: string, dansUneLigne: boolean): HTMLElement {
  const element = creer('span', texte);
  if (dansUneLigne) element.className = 'fleche-ligne';
  else element.className = 'fleche';
  return element;
}

function intertitre(texte: string): HTMLElement {
  const element = creer('h2', texte);
  element.className = 'config-titre';
  return element;
}

function section(...enfants: HTMLElement[]): HTMLElement {
  const element = creer('div');
  element.className = 'config-section';
  element.append(...enfants);
  return element;
}

/** La ligne du lot et son bouton d'annulation. */
function ligneDuLot(texte: string, bouton: HTMLElement): HTMLElement {
  const ligne = creer('div');
  ligne.className = 'config-boutons config-ecartes';
  const phrase = creer('p', texte);
  phrase.className = 'config-renommage';
  ligne.append(phrase, bouton);
  return ligne;
}

function legende(): HTMLElement {
  const tete = creer('div');
  tete.className = 'colonnes-tete sans-case';
  tete.append(creer('span', TEXTES.legendeAujourdhui), creer('span', TEXTES.legendeApresAnnulation));
  return tete;
}

/**
 * Les segments (séparés par `/`) qui changent entre deux noms. Deux noms de même longueur ne marquent que les rangs différents ;
 * sinon les rangs ne se correspondent plus et tout est marqué.
 */
export function segmentsQuiChangent(aujourdhui: string, apres: string): number[] {
  const gauche = aujourdhui.split('/');
  const droite = apres.split('/');
  if (gauche.length !== droite.length) return [...Array(Math.max(gauche.length, droite.length)).keys()];
  return gauche.flatMap((segment, rang) => (segment === droite[rang] ? [] : [rang]));
}

function memeConvention(a: Convention, b: Convention): boolean {
  return a.casse === b.casse && a.separateur === b.separateur;
}

/** Une ligne de renommage : le nom actuel à gauche, le nom que l'annulation remet à droite. */
function ligneDeRenommage(ligne: LigneDuJournal): HTMLElement {
  const diff = creer('div');
  diff.className = 'diff sans-case';
  const chemin = creer('span');
  chemin.className = 'chemin';
  const apres = creer('span');
  apres.className = 'chemin-apres';
  if (ligne.sort === 'change-depuis') {
    diff.classList.add('reste');
    chemin.append(document.createTextNode(ligne.aujourdhui ?? ligne.ancien));
    apres.textContent = ligne.aujourdhui === null ? TEXTES.supprimeDansFigma : TEXTES.changeDepuisDansFigma;
  } else {
    const actuel = ligne.aujourdhui ?? ligne.ancien;
    const marques = segmentsQuiChangent(actuel, ligne.ancien);
    poserLesSegments(chemin, actuel, marques, 'ancien');
    apres.append(fleche('→ ', true));
    poserLesSegments(apres, ligne.ancien, marques, 'nouveau');
  }
  if (ligne.type === 'collection') chemin.append(document.createTextNode(' '), meta(TEXTES.uneCollection));
  diff.append(chemin, apres);
  return diff;
}

/** Une ligne de règle d'import : `gauche` est la règle d'aujourd'hui, `droite` celle d'après l'annulation. */
function ligneDeRegle(gauche: readonly Node[] | null, droite: readonly Node[] | null): HTMLElement {
  const diff = creer('div');
  diff.className = 'diff sans-case regle';
  for (const cote of [gauche, droite]) {
    const cellule = creer('span');
    if (cote) cellule.append(...cote);
    else cellule.append(meta(TEXTES.aucuneRegle));
    diff.append(cellule);
  }
  return diff;
}

function ecritureEnJetons(place: 'groupes' | 'variables', convention: Convention): Node[] {
  return [phraseDeRegle(TEXTES.ecrireEn[place]), jeton(specimenDeConvention(convention))];
}

function termeEnJetons(terme: string, formes: readonly string[]): Node[] {
  return [...formes.map(jeton), fleche('→', false), jeton(terme)];
}

/** Les lignes de règle à montrer : celles dont les deux côtés diffèrent. `autres` compte les clés que le diff ne détaille pas. */
function lignesDeRegles(lignes: readonly LigneDImport[]): { readonly lignes: HTMLElement[]; readonly autres: number } {
  const montrees: HTMLElement[] = [];
  let autres = 0;
  for (const ligne of lignes) {
    if (ligne.sorte === 'autres') {
      autres += ligne.nombre;
    } else if (ligne.sorte === 'ecriture') {
      for (const place of ['groupes', 'variables'] as const) {
        const apres = ligne.apres?.[place] ?? null;
        const avant = ligne.avant?.[place] ?? null;
        if (apres && avant && memeConvention(apres, avant)) continue;
        montrees.push(ligneDeRegle(apres && ecritureEnJetons(place, apres), avant && ecritureEnJetons(place, avant)));
      }
    } else {
      if (ligne.avant && ligne.apres && ligne.avant.join(' ') === ligne.apres.join(' ')) continue;
      montrees.push(ligneDeRegle(ligne.apres && termeEnJetons(ligne.terme, ligne.apres), ligne.avant && termeEnJetons(ligne.terme, ligne.avant)));
    }
  }
  return { lignes: montrees, autres };
}

const CLE_DES_INTROUVABLES = '';

/** Monte l'onglet. `maintenant` situe la date des lots (aujourd'hui, hier). */
export function creerHistorique(actions: ActionsDeLHistorique, maintenant: () => Date = () => new Date()): Historique {
  const element = creer('div');
  element.className = 'page-stack';
  /** L'état ouvert des cartes d'une collection ; la première s'ouvre tant que le designer n'a pas choisi. */
  const ouvertes = new Map<string, boolean>();
  let reussite: number | null = null;
  let derniers: { renommage: DernierRenommage | null; importe: DernierImport | null } = { renommage: null, importe: null };
  let enCours = { renommage: false, importe: false };
  let boutonDuRenommage: HTMLButtonElement | null = null;
  let boutonDeLImport: HTMLButtonElement | null = null;

  function carteDeCollection(collection: CollectionDuJournal, rang: number): HTMLElement {
    const cle = collection.id ?? CLE_DES_INTROUVABLES;
    const carte = creer('div');
    carte.className = 'carte';
    const tete = creer('div');
    tete.className = 'tete sans-coche';
    const bouton = creer('button');
    bouton.className = 'tete-bouton';
    bouton.type = 'button';
    const pile = creer('div');
    pile.className = 'pile';
    const nom = creer('span');
    nom.className = 'nom-de-collection';
    const code = creer('code', collection.nom ?? TEXTES.collectionsIntrouvables);
    code.className = 'config-nom';
    nom.append(code);
    if (collection.exclue) {
      const pastille = creer('span', TEXTES.pastilleNonAnalysee);
      pastille.className = 'pastille pastille-attente';
      nom.append(pastille);
    }
    pile.append(nom, meta(TEXTES.nomsDuLot(collection.lignes.length)));
    const droite = creer('span');
    droite.className = 'droite';
    droite.append(creerChevron());
    bouton.append(pile, droite);
    tete.append(bouton);

    const corps = creer('div');
    corps.className = 'corps';
    if (collection.exclue) corps.append(note(TEXTES.cocherPourRetablir));
    const enTete = collection.lignes.filter((ligne) => ligne.type === 'collection');
    const suite = collection.lignes.filter((ligne) => ligne.type !== 'collection');
    corps.append(legende(), ...[...enTete, ...suite].map(ligneDeRenommage));

    function regler(ouverte: boolean): void {
      ouvertes.set(cle, ouverte);
      corps.hidden = !ouverte;
      bouton.setAttribute('aria-expanded', String(ouverte));
    }
    regler(ouvertes.get(cle) ?? rang === 0);
    bouton.addEventListener('click', () => regler(corps.hidden));
    carte.append(tete, corps);
    return carte;
  }

  function sectionDuRenommage(dernier: DernierRenommage): HTMLElement {
    boutonDuRenommage = createButton({ label: TEXTES.annulerLeRenommage, variant: 'secondary', compact: true, onClick: actions.annulerLeRenommage });
    const ligne = ligneDuLot(TEXTES.renommagesALHeure(dernier.nombre, TEXTES.quandLeLot(dernier.heure, maintenant())), boutonDuRenommage);
    const enfants = [intertitre(TEXTES.dernierRenommage), ligne, note(TEXTES.seulLeDernierRenommage)];
    const affichees = dernier.collections.reduce((somme, collection) => somme + collection.lignes.length, 0);
    if (affichees - dernier.reviennent > 0) {
      const avertissement = creer('p', TEXTES.nomsNeReviendrontPas(affichees - dernier.reviennent));
      avertissement.className = 'historique-avertissement';
      enfants.push(avertissement);
    }
    const liste = creer('div');
    liste.className = 'historique-liste';
    liste.append(...dernier.collections.map(carteDeCollection));
    return section(...enfants, liste);
  }

  function sectionDeLImport(dernier: DernierImport): HTMLElement {
    const { lignes, autres } = lignesDeRegles(dernier.lignes);
    boutonDeLImport = createButton({ label: TEXTES.annulerLImport, variant: 'secondary', compact: true, onClick: actions.annulerLImport });
    const ligne = ligneDuLot(TEXTES.importeALHeure(lignes.length + autres, TEXTES.quandLeLot(dernier.heure, maintenant())), boutonDeLImport);
    const corps = creer('div');
    corps.className = 'corps';
    corps.append(legende(), ...lignes);
    if (autres > 0) corps.append(meta(TEXTES.autresReglesChangees(autres)));
    const carte = creer('div');
    carte.className = 'carte';
    carte.append(corps);
    return section(intertitre(TEXTES.dernierImport), ligne, carte);
  }

  function ligneDeReussite(retablis: number): HTMLElement {
    const ligne = creer('div');
    ligne.className = 'resultat';
    ligne.setAttribute('role', 'status');
    const pile = creer('div');
    pile.className = 'pile';
    const titre = creer('span');
    const coche = creer('span', '✓ ');
    coche.setAttribute('aria-hidden', 'true');
    titre.append(coche, TEXTES.nomsRetablis(retablis));
    pile.append(titre, meta(TEXTES.renommagesReviennent));
    ligne.append(pile);
    return ligne;
  }

  function synchroniser(): void {
    if (boutonDuRenommage) boutonDuRenommage.disabled = enCours.renommage || (derniers.renommage?.reviennent ?? 0) === 0;
    if (boutonDeLImport) boutonDeLImport.disabled = enCours.importe;
  }

  function rendre(): void {
    boutonDuRenommage = null;
    boutonDeLImport = null;
    const enfants: HTMLElement[] = [];
    if (reussite !== null) enfants.push(ligneDeReussite(reussite));
    if (derniers.renommage) enfants.push(sectionDuRenommage(derniers.renommage));
    if (derniers.importe) enfants.push(sectionDeLImport(derniers.importe));
    if (enfants.length === 0) enfants.push(note(TEXTES.rienAAnnuler), note(TEXTES.rienAAnnulerExplication));
    element.replaceChildren(...enfants);
    synchroniser();
  }

  rendre();
  return {
    element,
    poser(renommage, importe) {
      derniers = { renommage, importe };
      rendre();
    },
    reussite(retablis) {
      if (reussite === retablis) return;
      reussite = retablis;
      rendre();
    },
    bloquer(nouveau) {
      enCours = nouveau;
      synchroniser();
    },
  };
}

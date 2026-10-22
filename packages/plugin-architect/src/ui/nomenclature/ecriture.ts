/**
 * La carte de l'écriture des noms : les groupes et les noms ont chacun un
 * compte, un chemin exemple et une liste de conventions ; les collections
 * suivent UCM et n'ont pas de choix. L'écran du premier lancement la monte, et
 * la feuille de l'écriture (onglet Règles) la réutilise.
 */
import { CONVENTIONS, type Convention } from '@ucm-kit/core/referentiel';
import type { Bilan, EcritureChoisie, LigneDEcriture, LigneVue } from '../../nomenclature/messages';
import { TEXTES } from './textes';

type EcritureDuBilan = Bilan['ecriture'];

export interface CarteDEcriture {
  readonly element: HTMLElement;
  /** Pose les comptes, les exemples et les conventions d'un bilan, en écrasant le choix en cours. */
  poser(ecriture: EcritureDuBilan): void;
  /** Pose les comptes et les exemples d'une simulation, sans toucher aux conventions choisies. */
  poserLesLignes(groupes: LigneDEcriture, variables: LigneDEcriture): void;
  /** La convention de chaque liste. */
  choix(): EcritureChoisie;
}

interface RangeeChoisie {
  readonly compte: HTMLElement;
  readonly chemin: HTMLElement;
  readonly liste: HTMLSelectElement;
}

/** La liste d'une rangée : les spécimens français du registre du kit, dans son ordre ; le libellé nomme l'option. */
function creerListe(etiquette: string, auChangement: () => void): HTMLSelectElement {
  const liste = document.createElement('select');
  liste.className = 'input ecriture-liste';
  liste.setAttribute('aria-label', etiquette);
  for (const { id, libelle, specimen } of CONVENTIONS) {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = specimen.fr;
    option.setAttribute('aria-label', libelle.fr);
    liste.append(option);
  }
  liste.addEventListener('change', auChangement);
  return liste;
}

function identifiantDe(convention: Convention): string | null {
  return CONVENTIONS.find((entree) => entree.convention.casse === convention.casse && entree.convention.separateur === convention.separateur)?.id ?? null;
}

/** Le chemin d'un nom, avec le segment concerné dans un `mark`. */
function poserLeChemin(chemin: HTMLElement, exemple: LigneVue | null): void {
  chemin.hidden = exemple === null;
  if (!exemple) {
    chemin.replaceChildren();
    return;
  }
  chemin.replaceChildren(...exemple.ancien.split('/').flatMap((segment, rang): (string | HTMLElement)[] => {
    const separateur = rang > 0 ? ['/'] : [];
    if (!exemple.marques.includes(rang)) return [...separateur, segment];
    const concerne = document.createElement('mark');
    concerne.textContent = segment;
    return [...separateur, concerne];
  }));
}

function creerNom(titre: string, compte: HTMLElement): HTMLElement {
  const nom = document.createElement('span');
  nom.className = 'field-label';
  nom.append(titre, ' ', compte);
  return nom;
}

function creerRangee(titre: string, etiquette: string, auChangement: () => void): { rangee: HTMLElement; choisie: RangeeChoisie } {
  const compte = document.createElement('span');
  compte.className = 'ecriture-meta';
  const chemin = document.createElement('span');
  chemin.className = 'ecriture-chemin';
  const liste = creerListe(etiquette, auChangement);
  const pile = document.createElement('div');
  pile.className = 'ecriture-pile';
  pile.append(creerNom(titre, compte), chemin);
  const rangee = document.createElement('div');
  rangee.className = 'ecriture-rangee';
  rangee.append(pile, liste);
  return { rangee, choisie: { compte, chemin, liste } };
}

export interface OptionsDeCarteDEcriture {
  /** Appelé quand le designer change une convention, avec le choix des deux listes. */
  readonly auChangement?: (choix: EcritureChoisie) => void;
}

export function creerCarteDEcriture({ auChangement }: OptionsDeCarteDEcriture = {}): CarteDEcriture {
  const element = document.createElement('div');
  element.className = 'ecriture';
  /** La convention des listes sans entrée du registre : le choix garde celle du bilan. */
  let reprise: EcritureChoisie | null = null;

  const choix = (): EcritureChoisie => {
    const lue = (liste: HTMLSelectElement, repli: Convention | undefined): Convention => {
      const trouvee = CONVENTIONS.find((entree) => entree.id === liste.value)?.convention;
      const convention = trouvee ?? repli;
      if (!convention) throw new Error('Aucune convention choisie pour l’écriture');
      return convention;
    };
    return { groupes: lue(groupes.liste, reprise?.groupes), variables: lue(noms.liste, reprise?.variables) };
  };
  const changement = (): void => auChangement?.(choix());

  const { rangee: rangeeDesGroupes, choisie: groupes } = creerRangee(TEXTES.ecritureDesGroupes, TEXTES.choisirLEcritureDesGroupes, changement);
  const { rangee: rangeeDesNoms, choisie: noms } = creerRangee(TEXTES.ecritureDesNoms, TEXTES.choisirLEcritureDesNoms, changement);

  const collectionsCompte = document.createElement('span');
  collectionsCompte.className = 'ecriture-meta';
  const collectionsAide = document.createElement('span');
  collectionsAide.className = 'ecriture-meta';
  collectionsAide.textContent = TEXTES.collectionsSuiventUcm;
  const collectionsPile = document.createElement('div');
  collectionsPile.className = 'ecriture-pile';
  collectionsPile.append(creerNom(TEXTES.ecritureDesCollections, collectionsCompte), collectionsAide);
  const fixe = document.createElement('span');
  fixe.className = 'ecriture-fixe';
  fixe.textContent = TEXTES.nomsUcm;
  const rangeeDesCollections = document.createElement('div');
  rangeeDesCollections.className = 'ecriture-rangee';
  rangeeDesCollections.append(collectionsPile, fixe);

  element.append(rangeeDesGroupes, rangeeDesNoms, rangeeDesCollections);

  function poserLaRangee(rangee: RangeeChoisie, ligne: LigneDEcriture): void {
    rangee.compte.textContent = TEXTES.suiventSurTotal(ligne.suivent, ligne.total);
    poserLeChemin(rangee.chemin, ligne.exemple);
  }

  return {
    element,
    poser(ecriture) {
      reprise = { groupes: ecriture.groupes.convention, variables: ecriture.variables.convention };
      for (const [rangee, ligne] of [[groupes, ecriture.groupes], [noms, ecriture.variables]] as const) {
        poserLaRangee(rangee, ligne);
        const id = identifiantDe(ligne.convention);
        if (id) rangee.liste.value = id;
        else rangee.liste.selectedIndex = -1;
      }
      collectionsCompte.textContent = TEXTES.collectionsReconnues(ecriture.collections.reconnues, ecriture.collections.total);
    },
    poserLesLignes(lignesDesGroupes, lignesDesNoms) {
      poserLaRangee(groupes, lignesDesGroupes);
      poserLaRangee(noms, lignesDesNoms);
    },
    choix,
  };
}

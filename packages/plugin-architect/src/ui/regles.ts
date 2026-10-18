/**
 * Le contenu de l'onglet Règles : le résumé de l'écriture avec son bouton
 * Modifier, puis la liste des termes du fichier avec sa recherche et ses
 * filtres. La liste se lit par pages de cinquante (demande `termes`) ; l'état
 * qu'elle suit vit dans `listeDesTermes.ts`. Les feuilles de l'écriture et d'un
 * terme (lot U4b) se branchent sur les deux rappels que `monterRegles` rend.
 */
import { CONVENTIONS, REGISTRE_CASSES, REGISTRE_SEPARATEURS, libelleDuTerme, termeRetenu, type Convention } from '@ucm-kit/core/referentiel';
import { createButton } from 'ucm-plugin-socle/src/ui/Button';
import type { Bilan, TermeDeListe } from '../messages';
import type { Coquille } from './coquille';
import {
  LISTE_INITIALE,
  choisir,
  debutSuivant,
  filtrer,
  recevoir,
  resteAAfficher,
  resumeDuTerme,
  saisir,
  type EtatDeLaListe,
  type FiltreDesTermes,
} from './listeDesTermes';
import { TEXTES } from './textes';

/** Le délai après lequel une saisie calme déclenche la recherche. */
const DELAI_DE_SAISIE = 200;

export interface ReglesMontees {
  /** Branche l'ouverture de la feuille de l'écriture sur le bouton Modifier. */
  surModifierLEcriture(rappel: () => void): void;
  /** Branche l'ouverture de la feuille d'un terme sur le clic d'une ligne. */
  surChoisirUnTerme(rappel: (terme: TermeDeListe) => void): void;
  /** Désigne le terme dont la feuille est ouverte, ou aucun : sa ligne prend l'apparence choisie. */
  designerLeTerme(mot: string | null): void;
}

/** Le libellé français du registre du kit ; une convention hors registre se dit par sa casse et son séparateur. */
function libelleDeConvention(convention: Convention): string {
  const connue = CONVENTIONS.find(({ convention: autre }) => autre.casse === convention.casse && autre.separateur === convention.separateur);
  if (connue) return connue.libelle.fr;
  const casse = termeRetenu(REGISTRE_CASSES, convention.casse);
  const separateur = termeRetenu(REGISTRE_SEPARATEURS, convention.separateur);
  return `${casse ? libelleDuTerme(casse, 'fr') : convention.casse} · ${(separateur ? libelleDuTerme(separateur, 'fr') : convention.separateur).toLowerCase()}`;
}

function creerIntertitre(texte: string, ...actions: HTMLElement[]): HTMLElement {
  const intertitre = document.createElement('div');
  intertitre.className = 'intertitre intertitre-avec-action';
  const titre = document.createElement('h2');
  titre.textContent = texte;
  intertitre.append(titre, ...actions);
  return intertitre;
}

function creerLigneDuResume(): { readonly nom: HTMLElement; readonly valeur: HTMLElement } {
  return { nom: document.createElement('span'), valeur: document.createElement('span') };
}

const FILTRES: readonly { readonly filtre: FiltreDesTermes; readonly libelle: (nombre: number | null) => string; readonly compte: (comptes: NonNullable<EtatDeLaListe['comptes']>) => number }[] = [
  { filtre: 'tous', libelle: TEXTES.filtreTous, compte: (comptes) => comptes.tous },
  { filtre: 'avec-regle', libelle: TEXTES.filtreAvecRegle, compte: (comptes) => comptes.avecRegle },
  { filtre: 'sans-regle', libelle: TEXTES.filtreSansRegle, compte: (comptes) => comptes.sansRegle },
];

function creerLigneDeTerme(terme: TermeDeListe, choisie: boolean, auClic: () => void): HTMLElement {
  const ligne = document.createElement('button');
  ligne.type = 'button';
  ligne.className = 'ligne-terme';
  ligne.classList.toggle('choisie', choisie);
  ligne.setAttribute('aria-pressed', String(choisie));

  const identite = document.createElement('span');
  identite.className = 'terme-identite';
  const mot = document.createElement('code');
  mot.className = 'mot';
  mot.textContent = terme.mot;
  identite.append(mot);
  const parties: string[] = [terme.mot];
  if (terme.origine !== null) {
    const pastille = document.createElement('span');
    const ucm = terme.origine === 'ucm';
    pastille.classList.add('pastille', ucm ? 'pastille-ucm' : 'pastille-personnalise');
    pastille.textContent = ucm ? TEXTES.pastilleUcm : TEXTES.pastillePersonnalise;
    identite.append(pastille);
    parties.push(pastille.textContent);
  }

  const resume = document.createElement('span');
  resume.className = 'meta';
  resume.textContent = resumeDuTerme(terme);
  const nombre = document.createElement('span');
  nombre.className = 'meta terme-nombre';
  nombre.textContent = String(terme.nombre);
  const chevron = document.createElement('span');
  chevron.className = 'chevron';
  chevron.setAttribute('aria-hidden', 'true');
  chevron.textContent = '›';

  if (resume.textContent) parties.push(resume.textContent);
  parties.push(TEXTES.nomsDuTerme(terme.nombre));
  ligne.setAttribute('aria-label', parties.join(', '));
  ligne.append(identite, resume, nombre, chevron);
  ligne.addEventListener('click', auClic);
  return ligne;
}

/** Monte l'onglet dans `coquille.panneaux.regles.contenu`. */
export function monterRegles(coquille: Coquille): ReglesMontees {
  const { frontiere } = coquille;
  let liste: EtatDeLaListe = LISTE_INITIALE;
  /** Le numéro de la demande de page dont la réponse est attendue. */
  let enCours: number | null = null;
  let minuteur: ReturnType<typeof setTimeout> | null = null;
  let modifierLEcriture: () => void = () => {};
  let choisirUnTerme: (terme: TermeDeListe) => void = () => {};

  // Le résumé de l'écriture.
  const modifier = createButton({ label: TEXTES.modifier, variant: 'secondary', compact: true, onClick: () => modifierLEcriture() });
  modifier.setAttribute('aria-label', TEXTES.modifierLEcriture);
  const groupes = creerLigneDuResume();
  const noms = creerLigneDuResume();
  const collections = creerLigneDuResume();
  groupes.nom.textContent = TEXTES.ecritureDesGroupes;
  noms.nom.textContent = TEXTES.ecritureDesNoms;
  collections.nom.textContent = TEXTES.ecritureDesCollections;
  collections.valeur.textContent = TEXTES.nomsUcm;
  const resumeDeLEcriture = document.createElement('div');
  resumeDeLEcriture.className = 'resume-ecriture';
  resumeDeLEcriture.append(groupes.nom, groupes.valeur, noms.nom, noms.valeur, collections.nom, collections.valeur);
  const carteDeLEcriture = document.createElement('div');
  carteDeLEcriture.className = 'carte';
  carteDeLEcriture.append(resumeDeLEcriture);

  // La recherche, les filtres et la liste.
  const recherche = document.createElement('input');
  recherche.type = 'search';
  recherche.className = 'input recherche';
  recherche.placeholder = TEXTES.chercherUnTerme;
  recherche.setAttribute('aria-label', TEXTES.chercherUnTerme);
  const barreDeFiltres = document.createElement('div');
  barreDeFiltres.className = 'filtres';
  barreDeFiltres.setAttribute('role', 'group');
  barreDeFiltres.setAttribute('aria-label', TEXTES.filtresDesTermes);
  const boutonsDeFiltre = FILTRES.map(({ filtre }) => {
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'filtre';
    bouton.addEventListener('click', () => {
      const suivante = filtrer(liste, filtre);
      if (suivante === liste) return;
      liste = suivante;
      demander(0);
    });
    return bouton;
  });
  barreDeFiltres.append(...boutonsDeFiltre);
  const lignes = document.createElement('div');
  lignes.className = 'liste-termes';
  lignes.setAttribute('role', 'group');
  lignes.setAttribute('aria-label', TEXTES.listeDesTermes);
  const aucun = document.createElement('p');
  aucun.className = 'aucun-terme meta';
  aucun.textContent = TEXTES.aucunTerme;
  const afficherPlus = createButton({ label: TEXTES.afficherPlus, variant: 'secondary', compact: true, onClick: () => demander(debutSuivant(liste)) });
  afficherPlus.classList.add('afficher-plus');

  coquille.panneaux.regles.contenu.append(
    creerIntertitre(TEXTES.intertitreEcriture, modifier),
    carteDeLEcriture,
    creerIntertitre(TEXTES.intertitreTermes, recherche),
    barreDeFiltres,
    lignes,
    aucun,
    afficherPlus,
  );

  function rendreLEcriture(bilan: Bilan | null): void {
    const connue = bilan !== null;
    groupes.valeur.textContent = bilan ? libelleDeConvention(bilan.ecriture.groupes.convention) : '';
    noms.valeur.textContent = bilan ? libelleDeConvention(bilan.ecriture.variables.convention) : '';
    modifier.disabled = !connue;
  }

  function rendre(): void {
    FILTRES.forEach(({ filtre, libelle, compte }, rang) => {
      const bouton = boutonsDeFiltre[rang];
      bouton.textContent = libelle(liste.comptes ? compte(liste.comptes) : null);
      bouton.setAttribute('aria-pressed', String(liste.filtre === filtre));
    });
    lignes.replaceChildren(
      ...liste.termes.map((terme) =>
        creerLigneDeTerme(terme, terme.mot === liste.choisi, () => {
          choisirUnTerme(terme);
        }),
      ),
    );
    lignes.hidden = liste.termes.length === 0;
    aucun.hidden = liste.total !== 0;
    afficherPlus.hidden = !resteAAfficher(liste);
    afficherPlus.disabled = enCours !== null;
  }

  /** Une demande de même clé rend la précédente caduque côté frontière : seul `enCours` fait foi. */
  function demander(debut: number): void {
    if (minuteur !== null) {
      clearTimeout(minuteur);
      minuteur = null;
    }
    enCours = frontiere.termes(liste.recherche, liste.filtre, debut);
    rendre();
  }

  recherche.addEventListener('input', () => {
    const suivante = saisir(liste, recherche.value.trim());
    if (suivante === liste) return;
    liste = suivante;
    if (minuteur !== null) clearTimeout(minuteur);
    minuteur = setTimeout(() => demander(0), DELAI_DE_SAISIE);
    rendre();
  });

  // L'ouverture de l'onglet relit la liste : la coquille ne signale pas le changement d'onglet, le panneau se montre.
  const panneau = coquille.panneaux.regles.element;
  let etaitMasque = panneau.hidden;
  new MutationObserver(() => {
    const masque = panneau.hidden;
    if (etaitMasque && !masque && coquille.etat().bilan) demander(0);
    etaitMasque = masque;
  }).observe(panneau, { attributes: true, attributeFilter: ['hidden'] });

  coquille.abonner((message) => {
    switch (message.type) {
      case 'initial':
      case 'analyse-demandee':
        rendreLEcriture(null);
        break;
      case 'bilan':
        rendreLEcriture(message.bilan);
        demander(0);
        break;
      case 'termes':
        if (message.demande !== enCours) break;
        enCours = null;
        liste = recevoir(liste, message);
        rendre();
        break;
      case 'erreur':
        if (message.demande !== enCours) break;
        enCours = null;
        rendre();
        break;
      default:
        break;
    }
  });

  const dejaLu = coquille.etat().bilan;
  rendreLEcriture(dejaLu);
  if (dejaLu) demander(0);
  else rendre();

  return {
    surModifierLEcriture(rappel) {
      modifierLEcriture = rappel;
    },
    surChoisirUnTerme(rappel) {
      choisirUnTerme = rappel;
    },
    designerLeTerme(mot) {
      liste = choisir(liste, mot);
      rendre();
    },
  };
}

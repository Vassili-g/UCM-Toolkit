/**
 * Le contenu de l'onglet Règles : la section des conventions d'écriture avec
 * son bouton Modifier, puis la section du vocabulaire, liste des termes du
 * fichier avec sa recherche et ses filtres. La liste se lit par pages de cinquante (demande `termes`) ; l'état
 * qu'elle suit vit dans `listeDesTermes.ts`. Les feuilles de l'écriture et d'un
 * terme (lot U4b) se branchent sur les deux rappels que `monterRegles` rend. En bas de page, un lien discret
 * télécharge le détail du vocabulaire (demande `diagnostic`).
 */
import { CONVENTIONS, REGISTRE_CASSES, REGISTRE_SEPARATEURS, collectionUcmReconnue, libelleDuTerme, termeRetenu, type Convention } from '@ucm-kit/core/referentiel';
import { createButton } from 'ucm-plugin-socle/src/ui/Button';
import { creerChevron } from 'ucm-plugin-socle/src/ui/Chevron';
import type { Bilan, LigneVue, TermeDeListe } from '../messages';
import type { Coquille } from './coquille';
import {
  LISTE_INITIALE,
  choisir,
  debutSuivant,
  filtrer,
  morceauxDuTerme,
  nomAccessibleDuTerme,
  phraseDeRecherche,
  recevoir,
  resteAAfficher,
  saisir,
  termeATrancher,
  type EtatDeLaListe,
  type FiltreDesTermes,
} from './listeDesTermes';
import { telecharger } from './telechargement';
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

/** Le spécimen et le libellé français d'une convention ; hors registre, la casse et le séparateur disent les deux. */
function textesDeConvention(convention: Convention): { readonly specimen: string; readonly libelle: string } {
  const connue = CONVENTIONS.find(({ convention: autre }) => autre.casse === convention.casse && autre.separateur === convention.separateur);
  if (connue) return { specimen: connue.specimen.fr, libelle: connue.libelle.fr };
  const casse = termeRetenu(REGISTRE_CASSES, convention.casse);
  const separateur = termeRetenu(REGISTRE_SEPARATEURS, convention.separateur);
  const texte = `${casse ? libelleDuTerme(casse, 'fr') : convention.casse} · ${(separateur ? libelleDuTerme(separateur, 'fr') : convention.separateur).toLowerCase()}`;
  return { specimen: texte, libelle: texte };
}

/** Une section titrée : le titre et sa phrase, une action à droite du titre si elle existe. */
function creerSection(titre: string, phrase: string, action?: HTMLElement): HTMLElement {
  const intitule = document.createElement('h2');
  intitule.textContent = titre;
  const explication = document.createElement('p');
  explication.textContent = phrase;
  const texte = document.createElement('div');
  texte.append(intitule, explication);
  const tete = document.createElement('div');
  tete.className = 'section-tete';
  tete.append(texte);
  if (action) tete.append(action);
  const section = document.createElement('section');
  section.className = 'section-regles';
  section.append(tete);
  return section;
}

interface LigneDuResume {
  readonly ligne: HTMLElement;
  readonly specimen: HTMLElement;
  readonly exemple: HTMLElement;
}

function creerLigneDuResume(nom: string): LigneDuResume {
  const categorie = document.createElement('span');
  categorie.className = 'meta';
  categorie.textContent = nom;
  const specimen = document.createElement('span');
  specimen.className = 'jeton jeton-neutre';
  specimen.setAttribute('role', 'img');
  const exemple = document.createElement('span');
  exemple.className = 'ecriture-exemple';
  const ligne = document.createElement('div');
  ligne.className = 'ecriture-regle';
  ligne.append(categorie, specimen, exemple);
  return { ligne, specimen, exemple };
}

/** Le spécimen en pastille ; le libellé de la convention reste le nom accessible de la pastille. */
function poserLeSpecimen(cible: LigneDuResume, textes: { readonly specimen: string; readonly libelle: string } | null): void {
  cible.specimen.textContent = textes?.specimen ?? '';
  if (textes) cible.specimen.setAttribute('aria-label', textes.libelle);
  else cible.specimen.removeAttribute('aria-label');
}

/** L'exemple d'une ligne : le nom réel, la partie concernée dans un `span`, le reste en gris. */
function poserLExemple(cible: LigneDuResume, exemple: LigneVue | null): void {
  cible.exemple.replaceChildren(...(exemple?.ancien.split('/') ?? []).flatMap((segment, rang): (string | HTMLElement)[] => {
    const separateur = rang > 0 ? ['/'] : [];
    if (!exemple?.marques.includes(rang)) return [...separateur, segment];
    const concerne = document.createElement('span');
    concerne.className = 'ecriture-partie';
    concerne.textContent = segment;
    return [...separateur, concerne];
  }));
}

/** Le premier nom de collection que le kit reconnaît, tout entier concerné ; `null` si aucune. */
function exempleDeCollection(bilan: Bilan): LigneVue | null {
  const reconnue = bilan.collections.find(({ nom }) => collectionUcmReconnue(nom) !== undefined);
  return reconnue ? { id: reconnue.id, ancien: reconnue.nom, nouveau: reconnue.nom, marques: [0], aussi: [] } : null;
}

const FILTRES: readonly { readonly filtre: FiltreDesTermes; readonly libelle: (nombre: number | null) => string; readonly compte: (comptes: NonNullable<EtatDeLaListe['comptes']>) => number }[] = [
  { filtre: 'tous', libelle: TEXTES.filtreTous, compte: (comptes) => comptes.tous },
  { filtre: 'avec-regle', libelle: TEXTES.filtreAvecRegle, compte: (comptes) => comptes.avecRegle },
  { filtre: 'sans-regle', libelle: TEXTES.filtreSansRegle, compte: (comptes) => comptes.sansRegle },
];

function creerPastilleDeReference(texte: string): HTMLElement {
  const reference = document.createElement('span');
  reference.className = 'jeton jeton-neutre petit';
  reference.textContent = texte;
  return reference;
}

function creerLigneDeTerme(terme: TermeDeListe, choisie: boolean, auClic: () => void): HTMLElement {
  const ligne = document.createElement('button');
  ligne.type = 'button';
  ligne.className = 'ligne-terme';
  ligne.classList.toggle('choisie', choisie);
  ligne.setAttribute('aria-pressed', String(choisie));

  const regle = document.createElement('span');
  regle.className = 'terme-regle';
  const variantes = document.createElement('span');
  for (const morceau of morceauxDuTerme(terme)) {
    if (morceau.sorte === 'reference') {
      regle.append(creerPastilleDeReference(morceau.texte));
    } else if (morceau.sorte === 'mot') {
      const mot = document.createElement('code');
      mot.className = 'mot';
      mot.textContent = morceau.texte;
      regle.append(mot);
    } else if (morceau.sorte === 'gris') {
      const gris = document.createElement('span');
      gris.className = 'variantes';
      gris.textContent = morceau.texte;
      regle.append(gris);
    } else if (morceau.sorte === 'variante') {
      const variante = document.createElement('code');
      variante.className = 'variante';
      variante.classList.toggle('trouvee', morceau.trouvee);
      variante.textContent = morceau.texte;
      variantes.append(variante);
    }
  }
  if (variantes.childElementCount > 0) regle.append(variantes);

  const droite = document.createElement('span');
  if (termeATrancher(terme)) {
    droite.className = 'pastille pastille-bloque';
    droite.textContent = TEXTES.pastilleATrancherDuTerme;
  } else if (terme.origine !== null) {
    const ucm = terme.origine === 'ucm';
    droite.classList.add('pastille', ucm ? 'pastille-ucm' : 'pastille-personnalise');
    droite.textContent = ucm ? TEXTES.pastilleUcm : TEXTES.pastillePersonnalise;
  }
  const nombre = document.createElement('span');
  nombre.className = 'meta terme-nombre';
  nombre.textContent = String(terme.nombre);

  ligne.setAttribute('aria-label', nomAccessibleDuTerme(terme));
  ligne.append(regle, droite, nombre, creerChevron('suivant'));
  ligne.addEventListener('click', auClic);
  return ligne;
}

/** Monte l'onglet dans `coquille.panneaux.regles.contenu`. */
export function monterRegles(coquille: Coquille): ReglesMontees {
  const { frontiere } = coquille;
  let liste: EtatDeLaListe = LISTE_INITIALE;
  /** Le numéro de la demande de page dont la réponse est attendue. */
  let enCours: number | null = null;
  /** La dernière demande du détail du vocabulaire : un nouveau clic la remplace. */
  let demandeDuDetail: number | null = null;
  let minuteur: ReturnType<typeof setTimeout> | null = null;
  let modifierLEcriture: () => void = () => {};
  let choisirUnTerme: (terme: TermeDeListe) => void = () => {};

  // Les conventions d'écriture.
  const modifier = createButton({ label: TEXTES.modifier, variant: 'secondary', compact: true, onClick: () => modifierLEcriture() });
  modifier.setAttribute('aria-label', TEXTES.modifierLEcriture);
  const groupes = creerLigneDuResume(TEXTES.ecritureDesGroupes);
  const noms = creerLigneDuResume(TEXTES.ecritureDesNoms);
  const collections = creerLigneDuResume(TEXTES.ecritureDesCollections);
  poserLeSpecimen(collections, { specimen: TEXTES.nomsUcm, libelle: TEXTES.nomsUcm });
  const lignesDeLEcriture = document.createElement('div');
  lignesDeLEcriture.className = 'ecriture-regles';
  lignesDeLEcriture.append(groupes.ligne, noms.ligne, collections.ligne);
  const sectionDesConventions = creerSection(TEXTES.intertitreConventions, TEXTES.phraseDesConventions, modifier);
  sectionDesConventions.append(lignesDeLEcriture);

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
  const outils = document.createElement('div');
  outils.className = 'outils-termes';
  outils.append(barreDeFiltres, recherche);
  const resultat = document.createElement('p');
  resultat.className = 'resultat-recherche';
  resultat.hidden = true;
  const aucun = document.createElement('p');
  aucun.className = 'aucun-terme meta';
  aucun.textContent = TEXTES.aucunTerme;
  const afficherPlus = createButton({ label: TEXTES.afficherPlus, variant: 'secondary', compact: true, onClick: () => demander(debutSuivant(liste)) });
  afficherPlus.classList.add('afficher-plus');

  const sectionDuVocabulaire = creerSection(TEXTES.intertitreVocabulaire, TEXTES.phraseDuVocabulaire);
  sectionDuVocabulaire.append(outils, resultat, lignes, aucun, afficherPlus);
  // En bas de page, l'export qui sert à étudier le découpage des noms hors du plugin.
  const exporterLeDetail = document.createElement('button');
  exporterLeDetail.type = 'button';
  exporterLeDetail.className = 'lien export-du-detail';
  exporterLeDetail.textContent = TEXTES.exporterLeDetailDuVocabulaire;
  exporterLeDetail.addEventListener('click', () => {
    demandeDuDetail = frontiere.diagnostic();
  });
  coquille.panneaux.regles.contenu.append(sectionDesConventions, sectionDuVocabulaire, exporterLeDetail);

  function rendreLEcriture(bilan: Bilan | null): void {
    poserLeSpecimen(groupes, bilan ? textesDeConvention(bilan.ecriture.groupes.convention) : null);
    poserLeSpecimen(noms, bilan ? textesDeConvention(bilan.ecriture.variables.convention) : null);
    poserLExemple(groupes, bilan?.ecriture.groupes.exemple ?? null);
    poserLExemple(noms, bilan?.ecriture.variables.exemple ?? null);
    poserLExemple(collections, bilan ? exempleDeCollection(bilan) : null);
    modifier.disabled = bilan === null;
    exporterLeDetail.disabled = bilan === null;
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
    const phrase = phraseDeRecherche(liste.termes);
    resultat.hidden = phrase === null;
    if (phrase) {
      const variante = document.createElement('code');
      variante.className = 'variante trouvee';
      variante.textContent = phrase.variante;
      resultat.replaceChildren(variante, ` ${TEXTES.estRemplacePar} `, creerPastilleDeReference(phrase.reference));
    }
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
      case 'diagnostic':
        if (message.demande !== demandeDuDetail) break;
        demandeDuDetail = null;
        telecharger(TEXTES.nomDuFichierDuVocabulaire, message.texte, 'application/json');
        break;
      case 'termes':
        if (message.demande !== enCours) break;
        enCours = null;
        liste = recevoir(liste, message);
        rendre();
        break;
      case 'erreur':
        if (message.demande === demandeDuDetail) demandeDuDetail = null;
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

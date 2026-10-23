/**
 * Le contenu de l'onglet Règles : la section des conventions d'écriture avec
 * son bouton Modifier, puis la section du vocabulaire : une section par type de
 * terme, sous une barre qui porte le menu Filtrer, la recherche et le tri. Chaque
 * section arrive avec ses premières lignes, puis se lit par pages (demande
 * `termes`), par place en tri A → Z ; l'état qu'elle suit vit dans `listeDesTermes.ts`. Les feuilles de l'écriture et d'un
 * terme (lot U4b) se branchent sur les deux rappels que `monterRegles` rend. En bas de page, un lien discret
 * télécharge le détail du vocabulaire (demande `diagnostic`).
 */
import { CONVENTIONS, REGISTRE_CASSES, REGISTRE_SEPARATEURS, collectionUcmReconnue, libelleDuTerme, termeRetenu, type Convention } from '@ucm-kit/core/referentiel';
import { createButton } from 'ucm-plugin-socle/src/ui/Button';
import { creerChevron } from 'ucm-plugin-socle/src/ui/Chevron';
import { ORIGINES_DE_FILTRE, PLACES_DE_TERMES, TRIS_DE_TERMES, TYPES_DE_TERMES } from '../../messages/nomenclature';
import type { Bilan, LigneVue, OrigineDeFiltre, PlaceDuTerme, SectionDeTermes, TermeDeListe, TriDeTermes, TypeDeTerme } from '../../messages/nomenclature';
import type { Coquille } from './coquille';
import { creerIconeDeType } from './icones';
import { fusionnerLesTextes } from './lignes';
import {
  LISTE_INITIALE,
  bandeDeLaSection,
  basculerLePli,
  basculerUneOrigine,
  basculerUnePlace,
  basculerUnType,
  blocsDeLaSection,
  choisir,
  estRepliee,
  filtresActifs,
  morceauxDuTerme,
  nomAccessibleDuTerme,
  origineDeLaLigne,
  pastilleDeLaLigne,
  phraseDeRecherche,
  recevoir,
  requeteDeLaListe,
  retirerUnFiltre,
  saisir,
  teinter,
  termesRecus,
  texteDeLaSuite,
  trier,
  type BlocDeSection,
  type EtatDeLaListe,
  type FiltreActif,
} from './listeDesTermes';
import { telecharger } from './telechargement';
import { TEXTES } from '../textes/nomenclature';

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
  /** La place dont le spécimen et la partie de l'exemple prennent la teinte ; `null` pour les collections, qui restent neutres. */
  readonly place: PlaceDuTerme | null;
}

function creerLigneDuResume(nom: string, place: PlaceDuTerme | null): LigneDuResume {
  const categorie = document.createElement('span');
  categorie.className = 'meta';
  categorie.textContent = nom;
  const specimen = document.createElement('span');
  specimen.className = 'jeton';
  if (place === null) specimen.classList.add('jeton-neutre');
  else teinter(specimen, place, 'jeton');
  specimen.setAttribute('role', 'img');
  const exemple = document.createElement('span');
  exemple.className = 'ecriture-exemple';
  const ligne = document.createElement('div');
  ligne.className = 'ecriture-regle';
  ligne.append(categorie, specimen, exemple);
  return { ligne, specimen, exemple, place };
}

/** Le spécimen en pastille ; le libellé de la convention reste le nom accessible de la pastille. */
function poserLeSpecimen(cible: LigneDuResume, textes: { readonly specimen: string; readonly libelle: string } | null): void {
  cible.specimen.textContent = textes?.specimen ?? '';
  if (textes) cible.specimen.setAttribute('aria-label', textes.libelle);
  else cible.specimen.removeAttribute('aria-label');
}

/** L'exemple d'une ligne : le nom réel, la partie concernée dans un `span`, le reste en gris. */
function poserLExemple(cible: LigneDuResume, exemple: LigneVue | null): void {
  cible.exemple.replaceChildren(...fusionnerLesTextes((exemple?.ancien.split('/') ?? []).flatMap((segment, rang): (string | HTMLElement)[] => {
    const separateur = rang > 0 ? ['/'] : [];
    if (!exemple?.marques.includes(rang)) return [...separateur, segment];
    const concerne = document.createElement('span');
    concerne.className = 'ecriture-partie';
    if (cible.place !== null) teinter(concerne, cible.place, 'mot');
    concerne.textContent = segment;
    return [...separateur, concerne];
  })));
}

/** Le premier nom de collection que le kit reconnaît, tout entier concerné ; `null` si aucune. */
function exempleDeCollection(bilan: Bilan): LigneVue | null {
  const reconnue = bilan.collections.find(({ nom }) => collectionUcmReconnue(nom) !== undefined);
  return reconnue ? { id: reconnue.id, ancien: reconnue.nom, nouveau: reconnue.nom, marques: [0], aussi: [] } : null;
}

/** Le terme de référence d'une phrase, en jeton gris : il ne dit pas sa place. */
function creerPastilleDeReference(texte: string): HTMLElement {
  const reference = document.createElement('span');
  reference.className = 'jeton jeton-neutre petit';
  reference.textContent = texte;
  return reference;
}

/** Le terme d'une règle en jeton, teinté selon sa place. */
function creerJetonDeTerme(texte: string, place: PlaceDuTerme): HTMLElement {
  const jeton = document.createElement('span');
  jeton.className = 'jeton petit';
  teinter(jeton, place, 'jeton');
  jeton.textContent = texte;
  return jeton;
}

function creerLigneDeTerme(terme: TermeDeListe, choisie: boolean, auClic: () => void): HTMLElement {
  const ligne = document.createElement('button');
  ligne.type = 'button';
  ligne.className = 'ligne-terme';
  ligne.dataset.mot = terme.mot;
  ligne.classList.toggle('choisie', choisie);
  ligne.setAttribute('aria-pressed', String(choisie));

  const regle = document.createElement('span');
  regle.className = 'terme-regle';
  const variantes = document.createElement('span');
  for (const morceau of morceauxDuTerme(terme)) {
    if (morceau.sorte === 'reference') {
      regle.append(creerJetonDeTerme(morceau.texte, terme.place));
    } else if (morceau.sorte === 'mot') {
      const mot = document.createElement('code');
      mot.className = 'mot';
      teinter(mot, terme.place, 'mot');
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

  // À droite : la pastille « À trancher », sinon l'origine en texte gris, sinon une cellule vide.
  const droite = document.createElement('span');
  const pastille = pastilleDeLaLigne(terme);
  const origine = origineDeLaLigne(terme);
  if (pastille) {
    droite.classList.add('noms-pastille', pastille.classe);
    droite.textContent = pastille.texte;
  } else if (origine !== null) {
    droite.className = 'origine';
    droite.textContent = origine;
  }
  const nombre = document.createElement('span');
  nombre.className = 'meta terme-nombre';
  nombre.textContent = String(terme.nombre);

  ligne.setAttribute('aria-label', nomAccessibleDuTerme(terme));
  ligne.append(creerIconeDeType(terme.type, TEXTES.typeDeTermeAuSingulier[terme.type]), regle, droite, nombre, creerChevron('suivant'));
  ligne.addEventListener('click', auClic);
  return ligne;
}

/** Une case du menu Filtrer : l'icône du type si elle existe, le libellé et le compte du fichier. */
interface CaseDuMenu {
  readonly ligne: HTMLElement;
  readonly caseACocher: HTMLInputElement;
  readonly compte: HTMLElement;
}

function creerCaseDuMenu(libelle: string, icone: HTMLElement | null, auChangement: () => void): CaseDuMenu {
  const caseACocher = document.createElement('input');
  caseACocher.type = 'checkbox';
  caseACocher.className = 'case';
  caseACocher.addEventListener('change', auChangement);
  const texte = document.createElement('span');
  texte.textContent = libelle;
  const compte = document.createElement('span');
  compte.className = 'meta';
  const ligne = document.createElement('label');
  ligne.append(caseACocher, icone ?? document.createElement('span'), texte, compte);
  return { ligne, caseACocher, compte };
}

/** Le petit carré de la couleur d'une place, devant l'intertitre d'un bloc et la case du menu. */
function creerEchantillonDePlace(place: PlaceDuTerme): HTMLElement {
  const echantillon = document.createElement('span');
  teinter(echantillon, place, 'echantillon');
  return echantillon;
}

function creerIntituleDuMenu(texte: string): HTMLElement {
  const intitule = document.createElement('h4');
  intitule.textContent = texte;
  return intitule;
}

/** Un jeton de filtre actif, avec le × qui le retire. */
function creerJetonDeFiltre(filtre: FiltreActif, auRetrait: () => void): HTMLElement {
  const retirer = document.createElement('button');
  retirer.type = 'button';
  retirer.className = 'retirer-jeton';
  retirer.textContent = '×';
  retirer.setAttribute('aria-label', TEXTES.retirerLeFiltre(filtre.libelle));
  retirer.addEventListener('click', auRetrait);
  const jeton = document.createElement('span');
  jeton.className = 'filtre-actif';
  jeton.append(filtre.libelle, retirer);
  return jeton;
}

/** Monte l'onglet dans `coquille.panneaux.regles.contenu`. */
export function monterRegles(coquille: Coquille): ReglesMontees {
  const { frontiere } = coquille;
  let liste: EtatDeLaListe = LISTE_INITIALE;
  /** Le numéro de la demande de page dont la réponse est attendue. */
  let enCours: number | null = null;
  let menuOuvert = false;
  /** La dernière demande du détail du vocabulaire : un nouveau clic la remplace. */
  let demandeDuDetail: number | null = null;
  let minuteur: ReturnType<typeof setTimeout> | null = null;
  let modifierLEcriture: () => void = () => {};
  let choisirUnTerme: (terme: TermeDeListe) => void = () => {};

  // Les conventions d'écriture.
  const modifier = createButton({ label: TEXTES.modifier, variant: 'secondary', compact: true, onClick: () => modifierLEcriture() });
  modifier.setAttribute('aria-label', TEXTES.modifierLEcriture);
  const groupes = creerLigneDuResume(TEXTES.ecritureDesGroupes, 'groupes');
  const noms = creerLigneDuResume(TEXTES.ecritureDesNoms, 'variables');
  const collections = creerLigneDuResume(TEXTES.ecritureDesCollections, null);
  poserLeSpecimen(collections, { specimen: TEXTES.nomsUcm, libelle: TEXTES.nomsUcm });
  const lignesDeLEcriture = document.createElement('div');
  lignesDeLEcriture.className = 'ecriture-regles';
  lignesDeLEcriture.append(groupes.ligne, noms.ligne, collections.ligne);
  const sectionDesConventions = creerSection(TEXTES.intertitreConventions, TEXTES.phraseDesConventions, modifier);
  sectionDesConventions.append(lignesDeLEcriture);

  // La barre : le menu Filtrer, les jetons des filtres actifs, la recherche et le tri.
  const boutonFiltrer = createButton({ label: TEXTES.filtrer, variant: 'secondary', compact: true, onClick: () => poserLeMenu(!menuOuvert) });
  boutonFiltrer.setAttribute('aria-expanded', 'false');
  boutonFiltrer.setAttribute('aria-controls', 'menu-filtres');
  const casesDeTypes = new Map<TypeDeTerme, CaseDuMenu>(
    TYPES_DE_TERMES.map((type) => [type, creerCaseDuMenu(TEXTES.typeDeTermeAuSingulier[type], creerIconeDeType(type), () => {
      liste = basculerUnType(liste, type);
      demander(null);
    })]),
  );
  const casesDOrigine = new Map<OrigineDeFiltre, CaseDuMenu>(
    ORIGINES_DE_FILTRE.map((origine) => [origine, creerCaseDuMenu(TEXTES.origineDeFiltre[origine], null, () => {
      liste = basculerUneOrigine(liste, origine);
      demander(null);
    })]),
  );
  const casesDePlace = new Map<PlaceDuTerme, CaseDuMenu>(
    PLACES_DE_TERMES.map((place) => [place, creerCaseDuMenu(TEXTES.placeDeFiltre[place], creerEchantillonDePlace(place), () => {
      liste = basculerUnePlace(liste, place);
      demander(null);
    })]),
  );
  const menu = document.createElement('div');
  menu.className = 'menu-filtres';
  menu.id = 'menu-filtres';
  menu.hidden = true;
  menu.setAttribute('role', 'group');
  menu.setAttribute('aria-label', TEXTES.filtrer);
  menu.append(
    creerIntituleDuMenu(TEXTES.titreDesTypes), ...[...casesDeTypes.values()].map(({ ligne }) => ligne),
    creerIntituleDuMenu(TEXTES.titreDesOrigines), ...[...casesDOrigine.values()].map(({ ligne }) => ligne),
    creerIntituleDuMenu(TEXTES.titreDesPlaces), ...[...casesDePlace.values()].map(({ ligne }) => ligne),
  );
  const ancreDuMenu = document.createElement('span');
  ancreDuMenu.className = 'ancre-menu';
  ancreDuMenu.append(boutonFiltrer, menu);
  const jetons = document.createElement('span');
  jetons.className = 'filtres-actifs';
  const recherche = document.createElement('input');
  recherche.type = 'search';
  recherche.className = 'input noms-recherche';
  recherche.placeholder = TEXTES.chercherUnTerme;
  recherche.setAttribute('aria-label', TEXTES.chercherUnTerme);
  const choixDuTri = document.createElement('select');
  choixDuTri.className = 'input tri';
  choixDuTri.setAttribute('aria-label', TEXTES.trier);
  const libellesDuTri: Readonly<Record<TriDeTermes, string>> = { alpha: TEXTES.trierAlpha, nombre: TEXTES.trierNombre };
  for (const tri of TRIS_DE_TERMES) {
    const option = document.createElement('option');
    option.value = tri;
    option.textContent = libellesDuTri[tri];
    choixDuTri.append(option);
  }
  choixDuTri.addEventListener('change', () => {
    const choisi = TRIS_DE_TERMES.find((tri) => tri === choixDuTri.value);
    if (choisi === undefined) return;
    liste = trier(liste, choisi);
    demander(null);
  });
  const outils = document.createElement('div');
  outils.className = 'outils-termes';
  outils.append(ancreDuMenu, jetons, recherche, choixDuTri);
  const sections = document.createElement('div');
  sections.className = 'sections-termes';
  sections.setAttribute('role', 'group');
  sections.setAttribute('aria-label', TEXTES.listeDesTermes);
  const resultat = document.createElement('p');
  resultat.className = 'resultat-recherche';
  resultat.hidden = true;
  const aucun = document.createElement('p');
  aucun.className = 'aucun-terme meta';
  aucun.textContent = TEXTES.aucunTerme;

  const sectionDuVocabulaire = creerSection(TEXTES.intertitreVocabulaire, TEXTES.phraseDuVocabulaire);
  sectionDuVocabulaire.append(outils, resultat, sections, aucun);
  // En bas de page, l'export qui sert à étudier le découpage des noms hors du plugin.
  const exporterLeDetail = document.createElement('button');
  exporterLeDetail.type = 'button';
  exporterLeDetail.className = 'noms-lien export-du-detail';
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

  /** Ouvre ou ferme le menu Filtrer. Ouvert, il se ferme par Échap et par un clic hors de lui, comme par son bouton. */
  function poserLeMenu(ouvert: boolean): void {
    if (ouvert === menuOuvert) return;
    menuOuvert = ouvert;
    menu.hidden = !ouvert;
    boutonFiltrer.setAttribute('aria-expanded', String(ouvert));
    if (ouvert) {
      document.addEventListener('click', clicHorsDuMenu);
      document.addEventListener('keydown', toucheDuMenu);
    } else {
      document.removeEventListener('click', clicHorsDuMenu);
      document.removeEventListener('keydown', toucheDuMenu);
    }
  }

  function clicHorsDuMenu(evenement: MouseEvent): void {
    if (!(evenement.target instanceof Node) || !ancreDuMenu.contains(evenement.target)) poserLeMenu(false);
  }

  function toucheDuMenu(evenement: KeyboardEvent): void {
    if (evenement.key !== 'Escape') return;
    poserLeMenu(false);
    boutonFiltrer.focus();
  }

  /** La bande en tête du cadre d'une section : toute la bande plie ou déplie la section. */
  function creerLaBande(section: SectionDeTermes): HTMLElement {
    const type = section.type;
    const bande = bandeDeLaSection(liste, section);
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'bande-section';
    bouton.dataset.cle = `entete:${type}`;
    bouton.setAttribute('aria-expanded', String(bande.ouverte));
    bouton.setAttribute('aria-label', bande.libelle);
    bouton.addEventListener('click', () => {
      liste = basculerLePli(liste, type);
      rendre();
    });
    const nom = document.createElement('span');
    nom.className = 'titre-de-section';
    nom.append(bande.titre, ' ');
    const total = document.createElement('span');
    total.className = 'meta';
    total.textContent = String(bande.total);
    nom.append(total);
    const ligne = document.createElement('span');
    ligne.className = 'ligne-de-section';
    ligne.textContent = bande.ligne;
    const texte = document.createElement('span');
    texte.className = 'texte-de-section';
    texte.append(nom, ligne);
    bouton.append(creerIconeDeType(type), texte, creerChevron());
    const intitule = document.createElement('h3');
    intitule.append(bouton);
    return intitule;
  }

  /** L'intertitre d'un bloc : l'échantillon de la place, son nom et son total. */
  function creerLIntertitre(bloc: BlocDeSection, place: PlaceDuTerme): HTMLElement {
    const total = document.createElement('span');
    total.className = 'meta';
    total.textContent = String(bloc.total);
    const intertitre = document.createElement('div');
    intertitre.className = 'intertitre-place';
    intertitre.append(creerEchantillonDePlace(place), TEXTES.intertitreDePlace[place], total);
    return intertitre;
  }

  /** « Afficher les n autres » d'un bloc : la page de sa place, ou de la section en tri par nombre. */
  function creerLaSuite(type: TypeDeTerme, bloc: BlocDeSection): HTMLElement {
    const afficherLaSuite = document.createElement('button');
    afficherLaSuite.type = 'button';
    afficherLaSuite.className = 'noms-lien';
    afficherLaSuite.dataset.cle = bloc.intertitre && bloc.place !== null ? `plus:${type}:${bloc.place}` : `plus:${type}`;
    afficherLaSuite.textContent = texteDeLaSuite(bloc);
    afficherLaSuite.disabled = enCours !== null;
    afficherLaSuite.addEventListener('click', () => demander(type, bloc.place));
    const pied = document.createElement('div');
    pied.className = 'plus-dans-section';
    pied.append(afficherLaSuite);
    return pied;
  }

  /** Une section : un cadre dont la bande est le titre, puis ses blocs de lignes, chacun avec de quoi demander la suite. */
  function creerLaSection(section: SectionDeTermes): HTMLElement {
    const type = section.type;
    const lignes = document.createElement('div');
    lignes.className = 'liste-termes';
    lignes.setAttribute('role', 'group');
    lignes.setAttribute('aria-label', TEXTES.typeDeTerme[type]);
    lignes.append(creerLaBande(section));
    if (!estRepliee(liste, type)) {
      for (const bloc of blocsDeLaSection(section, liste.tri)) {
        if (bloc.intertitre && bloc.place !== null) lignes.append(creerLIntertitre(bloc, bloc.place));
        lignes.append(...bloc.termes.map((terme) => creerLigneDeTerme(terme, terme.mot === liste.choisi, () => choisirUnTerme(terme))));
        if (bloc.reste > 0) lignes.append(creerLaSuite(type, bloc));
      }
    }
    return lignes;
  }

  /** Les sections se reconstruisent à chaque rendu : la clé de l'élément qui avait le focus permet de le retrouver. */
  function cleDuFocusDansLesSections(): string | undefined {
    const actif = document.activeElement;
    return actif instanceof HTMLElement && sections.contains(actif) ? actif.dataset.cle : undefined;
  }

  function rendre(): void {
    const actifs = filtresActifs(liste);
    boutonFiltrer.setLabel(actifs.length === 0 ? TEXTES.filtrer : TEXTES.filtrerAvecNombre(actifs.length));
    jetons.replaceChildren(
      ...actifs.map((filtre) => creerJetonDeFiltre(filtre, () => {
        liste = retirerUnFiltre(liste, filtre);
        demander(null);
        boutonFiltrer.focus();
      })),
    );
    for (const [type, { caseACocher, compte }] of casesDeTypes) {
      caseACocher.checked = liste.types.includes(type);
      compte.textContent = liste.comptes ? String(liste.comptes.types[type]) : '';
    }
    for (const [origine, { caseACocher, compte }] of casesDOrigine) {
      caseACocher.checked = liste.origines.includes(origine);
      compte.textContent = liste.comptes ? String(liste.comptes.origines[origine]) : '';
    }
    for (const [place, { caseACocher, compte }] of casesDePlace) {
      caseACocher.checked = liste.places.includes(place);
      compte.textContent = liste.comptes ? String(liste.comptes.places[place]) : '';
    }
    choixDuTri.value = liste.tri;

    const cle = cleDuFocusDansLesSections();
    sections.replaceChildren(...(liste.sections ?? []).map(creerLaSection));
    if (cle !== undefined) {
      // Un lien « Afficher les n autres » qui disparaît laisse le focus à la bande de sa section.
      const retrouve = sections.querySelector<HTMLElement>(`[data-cle="${cle}"]`) ?? sections.querySelector<HTMLElement>(`[data-cle="entete:${cle.split(':')[1]}"]`);
      retrouve?.focus();
    }
    const phrase = phraseDeRecherche(termesRecus(liste));
    resultat.hidden = phrase === null;
    if (phrase) {
      const variante = document.createElement('code');
      variante.className = 'variante trouvee';
      variante.textContent = phrase.variante;
      resultat.replaceChildren(variante, ` ${TEXTES.estRemplacePar} `, creerPastilleDeReference(phrase.reference));
    }
    sections.hidden = liste.sections === null || liste.sections.length === 0;
    aucun.hidden = liste.sections === null || liste.sections.length > 0;
  }

  /**
   * Demande les premières lignes de chaque section (`section` à `null`), ou la page suivante d'une section, ou d'une place de la section
   * en tri A → Z. Une demande de même clé rend la précédente caduque côté frontière : seul `enCours` fait foi.
   */
  function demander(section: TypeDeTerme | null, place: PlaceDuTerme | null = null): void {
    if (minuteur !== null) {
      clearTimeout(minuteur);
      minuteur = null;
    }
    enCours = frontiere.termes(requeteDeLaListe(liste, section, place));
    rendre();
  }

  recherche.addEventListener('input', () => {
    const suivante = saisir(liste, recherche.value.trim());
    if (suivante === liste) return;
    liste = suivante;
    if (minuteur !== null) clearTimeout(minuteur);
    minuteur = setTimeout(() => demander(null), DELAI_DE_SAISIE);
    rendre();
  });

  // L'ouverture de l'onglet relit la liste : la coquille ne signale pas le changement d'onglet, le panneau se montre.
  const panneau = coquille.panneaux.regles.element;
  let etaitMasque = panneau.hidden;
  new MutationObserver(() => {
    const masque = panneau.hidden;
    if (etaitMasque && !masque && coquille.etat().bilan) demander(null);
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
        demander(null);
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
  if (dejaLu) demander(null);
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

/**
 * Les Réglages communs, derrière l'engrenage ([UI-02], section 8.3, lot V9).
 * En tête, l'aperçu compact de la palette ouverte et le résultat de ses
 * garanties (V9.3). Suivent six cartes, dans l'ordre de V9.2 : Couleurs de
 * fond, Intensités, fonds du thème Dark compris ([MOT-28]), Luminosité des
 * nuances, puis, repliées, Minimums des promesses, Détection des couleurs
 * proches et Contenu des planches ([PLA-28]). Chaque groupe dit combien de
 * palettes il modifie ([ENT-07]) ; chaque carte se remet aux valeurs par
 * défaut sans toucher aux autres ni aux palettes (V9.5).
 *
 * Une saisie valide recalcule la garantie des courbes, le tracé et l'aperçu ;
 * la validation du champ range la recette (D-D). Une saisie intermédiaire
 * garde son champ. Un refus de `[REC-05]` s'écrit sous la carte, et rien
 * n'est rangé. Pendant la saisie d'un fond, seul l'aperçu compact suit : ni
 * le tracé ni la garantie ne lisent les fonds (Z4.8).
 */
import {
  COULEUR_DU_TEXTE_DES_BOUTONS,
  MODES,
  PREREGLAGES,
  PROFILS,
  TEXTE_DES_BOUTONS_PAR_DEFAUT,
  courbesParDefaut,
  garantieDesCourbes,
  type ContenuDesPlanches,
  type ManqueDeGarantie,
  nombreDeNuancesDe,
  nuancesReglees,
  rgb8VersOklch,
  referenceDe,
  sensDuTheme,
  validerRecette,
  type Mode,
  type NombreDeNuances,
  type Profil,
  type Recette,
  type TexteDesBoutons,
} from 'ucm-couleur';
import { type InterrupteurUi } from 'ucm-plugin-socle/src/ui/Interrupteur';

import { analyserPalette } from '../analyse';
import {
  carteDuGroupe,
  effetDuPrereglage,
  estParDefaut,
  lireNombre,
  palettesModifiees,
  poserFond,
  poserPartie,
  poserTexteDesBoutons,
  poserValeur,
  retablir,
  valeurDe,
  type CarteDesReglages,
  type ChampDeConfiguration,
  type GroupeDeConfiguration,
} from '../configuration';
import { calquesDesParties } from '../planche/modele';
import { creerVuesApercuCompact } from './apercuCompact';
import { createCarte, type CarteUi } from './carte';
import { creerGlyphe, type NomDeGlyphe } from './glyphes';
import { creerVuesChamps } from './champs';
import { creerVuesConstats } from './constats';
import { creerVuesPropositions } from './couleur/propositions';
import { creerVuesSelecteur } from './couleur/selecteur';
import { memoriserVues, lireTexte, type Localisation, type Texte } from './localisation';
import { creerSocleLocalise } from './socleLocalise';
import { suivreLaLargeur } from './largeur';
import { PIXELS_PAR_UNITE_DU_TRACE, dessinerLesCourbes, geometrieDesCourbes } from './traceDesCourbes';

export interface ConfigurationUi {
  element: HTMLDivElement;
  /** Relit la recette ; un champ en cours de saisie garde sa valeur. */
  afficher(): void;
  /** Ouvre la carte du groupe, y fait défiler et focalise son premier champ ([VER-15], V9.7). */
  focaliser(groupe: GroupeDeConfiguration): void;
}

/** Ce que la configuration lit et modifie : la recette de l'onglet Création. */
export interface RecetteDeLaConfiguration {
  lire(): Recette | null;
  /** La palette ouverte dans l'onglet Création, et le thème de son aperçu ; `null` sans palette. */
  ouverte(): { readonly id: string; readonly mode: Mode } | null;
  /** Une saisie en cours : l'aperçu la suit, rien ne se range. */
  previsualiser(recette: Recette): void;
  /** La fin d'un geste : la recette se range. */
  appliquer(recette: Recette): void;
  /** Le nombre de cadres à jour qu'une recette proposée ferait passer « À actualiser » (W6.4). */
  cadresAMettreAJour(proposee: Recette): number;
}

/** Un groupe de champs : ce qu'un lien vise, et où son compte s'écrit ([ENT-07]). */
interface Groupe {
  readonly carte: CarteDesReglages;
  /** Ce qu'un lien fait défiler, et dont il focalise le premier champ. */
  readonly element: HTMLElement;
  compter(texte: Texte): void;
}

/** Les nuances que le texte des boutons remplace : 500 à 800 (S5). */
const PLAGE_DU_TEXTE_DES_BOUTONS = { premiere: 500, derniere: 800 } as const;
const TEXTES_DES_BOUTONS_INVERSES: Recette['texteDesBoutons'] = { light: 'noir', dark: 'blanc' };
/** Les numéros des préréglages ; les valeurs de 500 à 800 sont les mêmes à onze et à treize nuances. */
const CRANS_DE_REFERENCE = PREREGLAGES[13].crans;
const COURBES_DU_SENS_NORMAL = courbesParDefaut(13, TEXTE_DES_BOUTONS_PAR_DEFAUT);
const COURBES_DU_SENS_INVERSE = courbesParDefaut(13, TEXTES_DES_BOUTONS_INVERSES);

const estInverse = (recette: Recette, mode: Mode): boolean => sensDuTheme(mode, recette.texteDesBoutons[mode]) === 'inverse';

/**
 * Les nuances présentes dans la liste dont la valeur par défaut change dans le
 * sens inversé, avec ces valeurs : ce que le message d'effet annonce.
 */
function nuancesDeLInversion(recette: Recette, mode: Mode): { readonly nuances: number[]; readonly valeurs: number[] } {
  const nuances = recette.crans.filter((cran) => {
    const rang = CRANS_DE_REFERENCE.indexOf(cran);
    return rang >= 0 && COURBES_DU_SENS_INVERSE[mode][rang] !== COURBES_DU_SENS_NORMAL[mode][rang];
  });
  return { nuances, valeurs: nuances.map((cran) => COURBES_DU_SENS_INVERSE[mode][CRANS_DE_REFERENCE.indexOf(cran)]) };
}

/** Les voisines de la plage 500 à 800 dans la liste : celles que le refus nomme (400 et 900 pour un préréglage). */
function voisinesDeLaPlage(recette: Recette): number[] {
  const avant = recette.crans.filter((cran) => cran < PLAGE_DU_TEXTE_DES_BOUTONS.premiere);
  const apres = recette.crans.filter((cran) => cran > PLAGE_DU_TEXTE_DES_BOUTONS.derniere);
  return [...(avant.length ? [Math.max(...avant)] : []), ...(apres.length ? [Math.min(...apres)] : [])];
}

function construireVues(i18n: Localisation) {
  const { createButton, createInterrupteur } = creerSocleLocalise(i18n);
  const { apercuCompact, resultatsDesGaranties } = creerVuesApercuCompact(i18n);
  const { champEnColonne } = creerVuesChamps(i18n);
  const { fondsProposes } = creerVuesPropositions(i18n);
  const { createPipette } = creerVuesSelecteur(i18n);
  const { blocDeConstat } = creerVuesConstats(i18n);
  const { NOM_DU_PROFIL, TEXTES_DE_CONFIGURATION, TEXTES_DES_INTENSITES, TEXTES_DU_CONTENU, TEXTES_DU_PREREGLAGE, TEXTES_DU_SELECTEUR, TEXTES_DU_TEXTE_DES_BOUTONS, constatDeGarantie, effetEcrit, hexaInvalide, legendeDesCourbes, nomDeLaPalette, nombreEcrit, nombreInvalide, paletteDeLApercu, palettesConcernees, resumeDesEcarts, resumeDesMinimums, retablirLaCarte, texteDuRefus } = i18n.messages;

  function paragraphe(texte: Texte = '', classe = ''): HTMLParagraphElement {
    const element = document.createElement('p');
    i18n.lier(element, 'textContent', texte);
    if (classe) element.className = classe;
    return element;
  }

  function unite(texte: Texte): HTMLSpanElement {
    const element = document.createElement('span');
    element.className = 'unite';
    i18n.lier(element, 'textContent', texte);
    return element;
  }

  const TITRES: Record<CarteDesReglages, Texte> = {
    fonds: TEXTES_DE_CONFIGURATION.fonds,
    parts: TEXTES_DE_CONFIGURATION.parts,
    courbes: TEXTES_DE_CONFIGURATION.courbes,
    minimums: TEXTES_DE_CONFIGURATION.seuilsDeContraste,
    proches: TEXTES_DE_CONFIGURATION.couleursProches,
    contenu: TEXTES_DE_CONFIGURATION.contenu,
  };

  /** Le glyphe de chaque carte ([UI-19]). */
  const GLYPHES_DES_CARTES: Record<CarteDesReglages, NomDeGlyphe> = {
    fonds: 'fonds',
    parts: 'intensites',
    courbes: 'courbes',
    minimums: 'minimums',
    proches: 'proches',
    contenu: 'contenu',
  };

  /** Les parties d'un cadre que le designer choisit, dans l'ordre de la carte ([PLA-28]). */
  const PARTIES: readonly (keyof ContenuDesPlanches)[] = ['note', 'usages', 'grilles', 'light', 'dark'];

  function createConfiguration(recette: RecetteDeLaConfiguration): ConfigurationUi {
    const element = document.createElement('div');
    element.className = 'page-stack colonne';

    const sansRecette = paragraphe(TEXTES_DE_CONFIGURATION.sansRecette, 'etat-lecture');

    // Les cartes, fixes ou repliées ; chacune a son erreur et son « Rétablir ».
    const cartes = {} as Record<CarteDesReglages, { readonly ui: CarteUi; readonly erreur: HTMLParagraphElement; readonly retablir: HTMLButtonElement }>;
    for (const carte of Object.keys(TITRES) as CarteDesReglages[]) {
      const repliee = carte === 'minimums' || carte === 'proches' || carte === 'contenu';
      const ui = createCarte({ titre: TITRES[carte], glyphe: creerGlyphe(GLYPHES_DES_CARTES[carte]), ...(repliee ? { repliable: { ouverte: false } } : {}) }, i18n);
      ui.element.classList.add('carte-de-reglage');
      const erreur = paragraphe('', 'field-error');
      erreur.hidden = true;
      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = 'bouton-discret';
      i18n.lier(bouton, 'textContent', TEXTES_DE_CONFIGURATION.retablir);
      i18n.lier(bouton, 'aria-label', retablirLaCarte(TITRES[carte]));
      bouton.addEventListener('click', () => retablirLaCarteChoisie(carte));
      // Une carte repliable a pour en-tête un bouton : « Rétablir » va dans son corps.
      if (repliee) {
        const pied = document.createElement('div');
        pied.className = 'pied-de-reglage';
        pied.append(bouton);
        ui.corps.append(erreur, pied);
      } else {
        ui.tete.append(bouton);
        ui.corps.append(erreur);
      }
      cartes[carte] = { ui, erreur, retablir: bouton };
    }

    const champs: { champ: ChampDeConfiguration; saisie: HTMLInputElement }[] = [];
    const groupes = {} as Record<GroupeDeConfiguration, Groupe>;

    /** Un groupe dont le compte s'écrit dans le résumé de sa carte fixe. */
    function groupeDeCarte(nom: GroupeDeConfiguration, carte: CarteDesReglages, cible: HTMLElement): void {
      groupes[nom] = { carte, element: cible, compter: (texte) => cartes[carte].ui.poserResume(texte) };
    }

    function champDeSaisie(champ: ChampDeConfiguration, carte: CarteDesReglages, etiquette: Texte): HTMLInputElement {
      const saisie = document.createElement('input');
      saisie.type = 'text';
      saisie.inputMode = 'decimal';
      saisie.className = 'input champ-nombre';
      saisie.spellcheck = false;
      i18n.lier(saisie, 'aria-label', etiquette);
      if ('courbe' in champ) {
        saisie.dataset.mode = champ.courbe;
        saisie.dataset.rang = String(champ.rang);
        saisie.classList.add('champ-de-courbe');
        // Flèches : 0,005, et 0,05 avec Maj (W3.2) ; chaque pression est un geste fini.
        saisie.addEventListener('keydown', (evenement) => {
          if (evenement.key !== 'ArrowUp' && evenement.key !== 'ArrowDown') return;
          const valeur = lireNombre(saisie.value);
          if (valeur === null) return;
          evenement.preventDefault();
          const pas = (evenement.shiftKey ? 0.05 : 0.005) * (evenement.key === 'ArrowUp' ? 1 : -1);
          saisie.value = lireTexte(nombreEcrit(Math.min(1, Math.max(0, Math.round((valeur + pas) * 1000) / 1000))));
          saisir(champ, saisie.value, carte, true);
        });
      }
      saisie.addEventListener('input', () => saisir(champ, saisie.value, carte, false));
      saisie.addEventListener('change', () => saisir(champ, saisie.value, carte, true));
      champs.push({ champ, saisie });
      return saisie;
    }

    // Tête : l'aperçu compact de la palette ouverte, jamais une palette inventée (V9.3).
    const apercu = document.createElement('div');
    apercu.className = 'reglages-apercu';

    /** Un libellé suivi du code de la variable que le champ règle (I10, I9). */
    function enteteDeChamp(libelle: Texte, code: Texte): HTMLSpanElement {
      const entete = document.createElement('span');
      entete.className = 'entete-de-champ';
      const texte = document.createElement('span');
      texte.className = 'libelle-de-champ';
      i18n.lier(texte, 'textContent', libelle);
      const variable = document.createElement('code');
      variable.className = 'code-de-variable';
      i18n.lier(variable, 'textContent', code);
      entete.append(texte, variable);
      return entete;
    }

    /** `champEnColonne`, avec le code de la variable à côté du libellé. */
    function champAvecCode(libelle: Texte, code: Texte, ...saisies: HTMLElement[]): HTMLLabelElement {
      const etiquette = document.createElement('label');
      etiquette.className = 'champ-colonne';
      const ligne = document.createElement('span');
      ligne.className = 'champ-ligne';
      ligne.append(...saisies);
      etiquette.append(enteteDeChamp(libelle, code), ligne);
      return etiquette;
    }

    /** Les segments Blanc et Noir de chaque thème ; l'état pressé se pose dans `afficher`. */
    const segmentsDuTexte = {} as Record<Mode, { readonly valeur: TexteDesBoutons; readonly bouton: HTMLButtonElement }[]>;

    /** Le texte des boutons d'un thème : libellé, code, puis les segments, une pastille de la couleur dans chacun (I9). */
    function choixDuTexte(mode: Mode): HTMLDivElement {
      const groupe = document.createElement('div');
      groupe.className = 'bascule bascule-de-base';
      groupe.setAttribute('role', 'group');
      i18n.lier(groupe, 'aria-label', TEXTES_DU_TEXTE_DES_BOUTONS.groupe(mode));
      segmentsDuTexte[mode] = (['blanc', 'noir'] as const).map((valeur) => {
        const bouton = document.createElement('button');
        bouton.type = 'button';
        bouton.className = 'bascule-option bascule-option-avec-pastille';
        const pastille = document.createElement('span');
        pastille.className = 'pastille-du-texte';
        pastille.setAttribute('aria-hidden', 'true');
        pastille.style.background = COULEUR_DU_TEXTE_DES_BOUTONS[valeur];
        const nom = document.createElement('span');
        i18n.lier(nom, 'textContent', TEXTES_DU_TEXTE_DES_BOUTONS[valeur]);
        bouton.append(pastille, nom);
        bouton.addEventListener('click', () => choisirLeTexte(mode, valeur));
        groupe.append(bouton);
        return { valeur, bouton };
      });
      const colonne = document.createElement('div');
      colonne.className = 'champ-colonne';
      colonne.append(enteteDeChamp(TEXTES_DU_TEXTE_DES_BOUTONS.libelle, TEXTES_DU_TEXTE_DES_BOUTONS.code), groupe);
      return colonne;
    }

    // Couleurs de fond : pastille, sélecteur de couleur et code, comme la couleur de référence (V9.6).
    const nomDuMode: Record<Mode, Texte> = { light: TEXTES_DE_CONFIGURATION.clair, dark: TEXTES_DE_CONFIGURATION.sombre };
    const colonnesDesFonds = document.createElement('div');
    colonnesDesFonds.className = 'colonnes-de-reglage';
    const saisiesDesFonds = MODES.map((mode) => {
      const pipette = createPipette(TEXTES_DE_CONFIGURATION.fondDuMode[mode], () => {
        const lue = recette.lire();
        if (!lue) return null;
        const ouverte = recette.ouverte();
        const palette = ouverte ? lue.palettes.find((candidate) => candidate.id === ouverte.id) : undefined;
        return {
          hexa: lue.fonds[mode],
          titreDesPastilles: TEXTES_DU_SELECTEUR.fondsProposes,
          pastilles: fondsProposes(palette ? analyserPalette(lue, palette) : null, mode),
          saisir: (hexa, fin) => saisirFond(mode, hexa, fin),
          // Un aperçu abandonné relit tout, champ et pastille du fond compris, sans ranger.
          abandonner: () => afficher(),
        };
      });
      const saisie = document.createElement('input');
      saisie.type = 'text';
      saisie.className = 'input champ-hexa';
      saisie.spellcheck = false;
      saisie.maxLength = 7;
      i18n.lier(saisie, 'aria-label', TEXTES_DE_CONFIGURATION.fondDuMode[mode]);
      saisie.addEventListener('input', () => saisirFond(mode, saisie.value, false));
      saisie.addEventListener('change', () => saisirFond(mode, saisie.value, true));
      const colonne = document.createElement('div');
      colonne.className = 'champ-colonne colonne-de-fond';
      colonne.append(champAvecCode(TEXTES_DE_CONFIGURATION.fondDuMode[mode], TEXTES_DU_TEXTE_DES_BOUTONS.codeDuFond, pipette.bouton, saisie), choixDuTexte(mode));
      colonnesDesFonds.append(colonne);
      return { mode, pipette, saisie };
    });

    // Le message d'effet d'un thème inversé, la confirmation d'un remplacement, puis l'erreur de la carte.
    const effetDuTexte = document.createElement('div');
    effetDuTexte.className = 'effet-du-texte-des-boutons';
    effetDuTexte.setAttribute('role', 'status');
    effetDuTexte.hidden = true;
    const texteDeLaConfirmation = paragraphe('');
    const remplacerLesNuances = createButton({ label: TEXTES_DU_TEXTE_DES_BOUTONS.remplacer, onClick: () => remplacerLaCourbe() });
    const annulerLeRemplacement = createButton({ label: TEXTES_DU_TEXTE_DES_BOUTONS.annuler, variant: 'secondary', onClick: () => annulerLeChoixDuTexte() });
    const gestesDeLaConfirmation = document.createElement('div');
    gestesDeLaConfirmation.className = 'confirmation-gestes';
    gestesDeLaConfirmation.append(remplacerLesNuances, annulerLeRemplacement);
    const confirmationDuTexte = document.createElement('div');
    confirmationDuTexte.className = 'confirmation';
    confirmationDuTexte.hidden = true;
    confirmationDuTexte.append(texteDeLaConfirmation, gestesDeLaConfirmation);
    cartes.fonds.ui.corps.insertBefore(colonnesDesFonds, cartes.fonds.erreur);
    cartes.fonds.ui.corps.insertBefore(confirmationDuTexte, cartes.fonds.erreur);
    cartes.fonds.ui.corps.insertBefore(effetDuTexte, cartes.fonds.erreur);
    groupeDeCarte('fonds', 'fonds', colonnesDesFonds);

    // Intensités : un curseur et un champ par profil ; Soft ne dépasse jamais Vivid.
    const reglagesDesParts = document.createElement('div');
    reglagesDesParts.className = 'intensites-reglages';
    const curseurs = PROFILS.map((profil) => {
      const ligne = document.createElement('div');
      ligne.className = 'intensite';
      const libelle = document.createElement('span');
      libelle.className = 'field-label';
      i18n.lier(libelle, 'textContent', TEXTES_DES_INTENSITES.libelle(NOM_DU_PROFIL[profil]));
      const piste = document.createElement('span');
      piste.className = 'piste-d-intensite';
      const curseur = document.createElement('input');
      curseur.type = 'range';
      curseur.min = '0';
      curseur.max = '1';
      curseur.step = '0.01';
      curseur.className = 'curseur-d-intensite';
      i18n.lier(curseur, 'aria-label', TEXTES_DES_INTENSITES.libelle(NOM_DU_PROFIL[profil]));
      curseur.addEventListener('input', () => glisser(profil, curseur, false));
      curseur.addEventListener('change', () => glisser(profil, curseur, true));
      piste.append(curseur);
      ligne.append(libelle, piste, champDeSaisie({ part: profil }, 'parts', TEXTES_DES_INTENSITES.libelle(NOM_DU_PROFIL[profil])));
      reglagesDesParts.append(ligne);
      return { profil, curseur };
    });
    cartes.parts.ui.corps.prepend(reglagesDesParts);
    groupeDeCarte('parts', 'parts', reglagesDesParts);

    // Les fonds du thème Dark : leur part à la nuance 50, sous les deux intensités ([MOT-28], maquette Y2.5).
    const ligneDesFondsSombres = document.createElement('div');
    ligneDesFondsSombres.className = 'intensite';
    const libelleDesFondsSombres = document.createElement('span');
    libelleDesFondsSombres.className = 'field-label';
    i18n.lier(libelleDesFondsSombres, 'textContent', TEXTES_DE_CONFIGURATION.fondsSombres);
    const pisteDesFondsSombres = document.createElement('span');
    pisteDesFondsSombres.className = 'piste-d-intensite';
    const curseurDesFondsSombres = document.createElement('input');
    curseurDesFondsSombres.type = 'range';
    curseurDesFondsSombres.min = '0';
    curseurDesFondsSombres.max = '1';
    curseurDesFondsSombres.step = '0.01';
    curseurDesFondsSombres.className = 'curseur-d-intensite';
    i18n.lier(curseurDesFondsSombres, 'aria-label', TEXTES_DE_CONFIGURATION.fondsSombres);
    const glisserLesFondsSombres = (fin: boolean) => {
      const lue = recette.lire();
      if (lue) proposer(poserValeur(lue, { fondsSombres: true }, Number(curseurDesFondsSombres.value)), 'parts', fin);
    };
    curseurDesFondsSombres.addEventListener('input', () => glisserLesFondsSombres(false));
    curseurDesFondsSombres.addEventListener('change', () => glisserLesFondsSombres(true));
    pisteDesFondsSombres.append(curseurDesFondsSombres);
    ligneDesFondsSombres.append(libelleDesFondsSombres, pisteDesFondsSombres, champDeSaisie({ fondsSombres: true }, 'parts', TEXTES_DE_CONFIGURATION.fondsSombres));
    const compteDesFondsSombres = paragraphe('', 'ligne-secondaire');
    const blocDesFondsSombres = document.createElement('div');
    blocDesFondsSombres.className = 'bloc-des-fonds-sombres';
    blocDesFondsSombres.append(ligneDesFondsSombres, paragraphe(TEXTES_DE_CONFIGURATION.aideFondsSombres, 'ligne-secondaire'), compteDesFondsSombres);
    cartes.parts.ui.corps.insertBefore(blocDesFondsSombres, cartes.parts.erreur);
    groupes.fondsSombres = { carte: 'parts', element: blocDesFondsSombres, compter: (texte) => { i18n.lier(compteDesFondsSombres, 'textContent', texte); } };

    /*
     * Luminosité des nuances (W3.2, disposition A) : le tracé prend la largeur
     * des colonnes, et chaque nuance a sa colonne sous son point, Light puis Dark.
     */
    /*
     * Le préréglage du nombre de nuances, en tête de « Luminosité des nuances »
     * (W6.4) : il décide des colonnes de la table. Un changement dit d'abord ce
     * qu'il changerait, et ne se range qu'à sa confirmation.
     */
    const choixDuNombre = document.createElement('div');
    choixDuNombre.className = 'bascule bascule-de-base bascule-du-prereglage';
    choixDuNombre.setAttribute('role', 'group');
    i18n.lier(choixDuNombre, 'aria-label', TEXTES_DU_PREREGLAGE.libelle);
    const boutonsDuNombre = ([11, 13] as const).map((nombre) => {
      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = 'bascule-option';
      i18n.lier(bouton, 'textContent', String(nombre));
      i18n.lier(bouton, 'aria-label', TEXTES_DU_PREREGLAGE.option(nombre));
      bouton.addEventListener('click', () => proposerLePrereglage(nombre));
      choixDuNombre.append(bouton);
      return { nombre, bouton };
    });
    const listeImportee = paragraphe(TEXTES_DU_PREREGLAGE.importee, 'ligne-secondaire');
    const texteDeLEffet = paragraphe('');
    const appliquerLePrereglage = createButton({ label: '', onClick: () => appliquerLaProposition() });
    const annulerLePrereglage = createButton({ label: TEXTES_DU_PREREGLAGE.annuler, variant: 'secondary', onClick: () => annulerLaProposition() });
    const gestesDeLEffet = document.createElement('div');
    gestesDeLEffet.className = 'confirmation-gestes';
    gestesDeLEffet.append(appliquerLePrereglage, annulerLePrereglage);
    const confirmationDuPrereglage = document.createElement('div');
    confirmationDuPrereglage.className = 'confirmation';
    confirmationDuPrereglage.hidden = true;
    confirmationDuPrereglage.append(texteDeLEffet, gestesDeLEffet);
    let prereglagePropose: Recette | null = null;

    function proposerLePrereglage(nombre: NombreDeNuances): void {
      const lue = recette.lire();
      if (!lue || nombreDeNuancesDe(lue.crans) === nombre) return;
      const effet = effetDuPrereglage(lue, nombre);
      prereglagePropose = effet.recette;
      i18n.lier(texteDeLEffet, 'textContent', effetEcrit({
        nombre,
        ajoutes: effet.ajoutes,
        retires: effet.retires,
        changees: effet.changees.map(nomDeLaPalette),
        cadres: recette.cadresAMettreAJour(effet.recette),
      }));
      i18n.lier(appliquerLePrereglage, 'textContent', TEXTES_DU_PREREGLAGE.appliquer(nombre));
      confirmationDuPrereglage.hidden = false;
      appliquerLePrereglage.focus();
    }
    function fermerLaProposition(): void {
      prereglagePropose = null;
      confirmationDuPrereglage.hidden = true;
    }
    function appliquerLaProposition(): void {
      const proposee = prereglagePropose;
      fermerLaProposition();
      if (proposee) proposer(proposee, 'courbes', true);
    }
    function annulerLaProposition(): void {
      fermerLaProposition();
      const lue = recette.lire();
      const actuel = lue ? nombreDeNuancesDe(lue.crans) : null;
      boutonsDuNombre.find(({ nombre }) => nombre === actuel)?.bouton.focus();
    }
    const blocDuPrereglage = document.createElement('div');
    blocDuPrereglage.className = 'bloc-du-prereglage';
    blocDuPrereglage.append(champEnColonne(TEXTES_DU_PREREGLAGE.libelle, choixDuNombre), listeImportee, confirmationDuPrereglage);

    const trace = document.createElement('div');
    trace.className = 'trace-des-courbes';
    /** La largeur mesurée du tracé, en unités, et son dernier dessin, refait quand la largeur change (Z8.4). */
    let largeurDuTrace: number | undefined;
    let dernierTrace: (() => void) | null = null;
    suivreLaLargeur(trace, (largeur) => {
      largeurDuTrace = largeur / PIXELS_PAR_UNITE_DU_TRACE;
      dernierTrace?.();
    });
    const legende = paragraphe('', 'ligne-secondaire');
    const table = document.createElement('div');
    table.className = 'table-courbes';
    table.setAttribute('role', 'group');
    i18n.lier(table, 'aria-label', TEXTES_DE_CONFIGURATION.tableDesCourbes);
    const garantie = document.createElement('div');
    garantie.className = 'constats';
    const noteDeGarantie = paragraphe(TEXTES_DE_CONFIGURATION.garantieCommune, 'ligne-secondaire');
    cartes.courbes.ui.corps.prepend(blocDuPrereglage, table, legende, paragraphe(TEXTES_DE_CONFIGURATION.aideCourbes, 'ligne-secondaire'), garantie, noteDeGarantie);
    groupeDeCarte('courbes', 'courbes', table);

    /** Une ligne de seuil (W3.3, disposition A) : libellé et aide à gauche, champ et unité alignés à droite. */
    function ligneDeSeuil(etiquette: Texte, saisie: HTMLInputElement, texteDUnite: Texte, ...notes: HTMLElement[]): HTMLDivElement {
      const ligne = document.createElement('div');
      ligne.className = 'ligne-de-seuil';
      const textes = document.createElement('div');
      textes.className = 'ligne-de-seuil-textes';
      const libelle = document.createElement('span');
      libelle.className = 'libelle-de-champ';
      i18n.lier(libelle, 'textContent', etiquette);
      textes.append(libelle, ...notes);
      ligne.append(textes, saisie, unite(texteDUnite));
      return ligne;
    }

    // Minimums des promesses, repliée : un compte pour les deux seuils, puis une ligne par seuil.
    const compteDesMinimums = paragraphe('', 'ligne-secondaire');
    const lignesDesMinimums = document.createElement('div');
    lignesDesMinimums.className = 'lignes-de-seuil';
    for (const [seuil, etiquette, aide] of [
      ['texte', TEXTES_DE_CONFIGURATION.seuilTexte, TEXTES_DE_CONFIGURATION.aideSeuilTexte],
      ['nonTexte', TEXTES_DE_CONFIGURATION.seuilNonTexte, TEXTES_DE_CONFIGURATION.aideSeuilNonTexte],
    ] as const) {
      lignesDesMinimums.append(ligneDeSeuil(etiquette, champDeSaisie({ seuil }, 'minimums', etiquette), TEXTES_DE_CONFIGURATION.uniteDeContraste, paragraphe(aide, 'ligne-secondaire')));
    }
    cartes.minimums.ui.corps.prepend(compteDesMinimums, lignesDesMinimums, paragraphe(TEXTES_DE_CONFIGURATION.aideMinimums, 'ligne-secondaire'));
    groupes.contraste = { carte: 'minimums', element: lignesDesMinimums, compter: (texte) => { i18n.lier(compteDesMinimums, 'textContent', texte); } };

    // Détection des couleurs proches, repliée : une ligne par seuil, son aide et son compte sous le libellé.
    const seuilsProches = [
      { seuil: 'profilsConfondus', etiquette: TEXTES_DE_CONFIGURATION.seuilProfilsConfondus, unite: TEXTES_DE_CONFIGURATION.uniteDEcart, aide: TEXTES_DE_CONFIGURATION.aideProfilsConfondus },
      { seuil: 'palettesProches', etiquette: TEXTES_DE_CONFIGURATION.seuilPalettesProches, unite: TEXTES_DE_CONFIGURATION.uniteDEcart, aide: TEXTES_DE_CONFIGURATION.aidePalettesProches },
    ] as const;
    const lignesProches = document.createElement('div');
    lignesProches.className = 'lignes-de-seuil';
    for (const { seuil, etiquette, unite: texteDUnite, aide } of seuilsProches) {
      const compte = paragraphe('', 'ligne-secondaire');
      const ligne = ligneDeSeuil(etiquette, champDeSaisie({ seuil }, 'proches', etiquette), texteDUnite, paragraphe(aide, 'ligne-secondaire'), compte);
      groupes[seuil] = { carte: 'proches', element: ligne, compter: (texte) => { i18n.lier(compte, 'textContent', texte); } };
      lignesProches.append(ligne);
    }
    // L'unité ΔEok reste (W3.3) : l'aide de la carte dit ce qu'elle compare.
    cartes.proches.ui.corps.prepend(lignesProches, paragraphe(TEXTES_DE_CONFIGURATION.aideEcarts, 'ligne-secondaire'));

    /*
     * Contenu des planches, repliée en dernier (C1) : un interrupteur par partie
     * d'un cadre, avec ses calques dans le cadre de la palette ouverte. L'en-tête
     * et les rampes se dessinent toujours ; le dernier thème allumé se bloque.
     */
    const compteDuContenu = paragraphe('', 'ligne-secondaire');
    const lignesDuContenu = document.createElement('div');
    lignesDuContenu.className = 'lignes-du-contenu';
    const interrupteurs = {} as Record<keyof ContenuDesPlanches | 'rampes', { ui: InterrupteurUi; calques: HTMLSpanElement; aide: HTMLParagraphElement }>;
    const titreDeGroupe = (texte: Texte) => {
      const titre = paragraphe(texte);
      titre.className = 'groupe-du-contenu';
      return titre;
    };
    for (const partie of ['rampes', ...PARTIES] as const) {
      if (partie === 'rampes') lignesDuContenu.append(titreDeGroupe(TEXTES_DU_CONTENU.parties));
      if (partie === 'light') lignesDuContenu.append(titreDeGroupe(TEXTES_DU_CONTENU.themes));
      const ui = createInterrupteur(`contenu-${partie}`, TEXTES_DU_CONTENU.lignes[partie].nom, '', (active) => {
        const lue = recette.lire();
        if (lue && partie !== 'rampes') proposer(poserPartie(lue, partie, active), 'contenu', true);
      });
      const calques = document.createElement('span');
      calques.className = 'ligne-secondaire calques-de-la-partie';
      ui.element.firstElementChild?.insertBefore(calques, ui.bouton);
      const aide = ui.element.querySelector<HTMLParagraphElement>('.field-help')!;
      interrupteurs[partie] = { ui, calques, aide };
      lignesDuContenu.append(ui.element);
    }
    const effetDuContenu = paragraphe('', 'ligne-secondaire');
    cartes.contenu.ui.corps.prepend(compteDuContenu, lignesDuContenu, effetDuContenu);
    groupes.contenu = { carte: 'contenu', element: lignesDuContenu, compter: (texte) => { i18n.lier(compteDuContenu, 'textContent', texte); } };

    /** Les interrupteurs, leurs calques dans le cadre de la palette ouverte, et l'effet du contenu choisi. */
    function rendreLeContenu(lue: Recette): void {
      const contenu = lue.contenuDesPlanches;
      const ouverte = recette.ouverte();
      const palette = ouverte ? lue.palettes.find((candidate) => candidate.id === ouverte.id) : undefined;
      const calques = palette ? calquesDesParties(lue, palette, 'SRGB') : null;
      const unSeulTheme = !contenu.light || !contenu.dark;
      for (const partie of ['rampes', ...PARTIES] as const) {
        const { ui, calques: nombre, aide } = interrupteurs[partie];
        const allumee = partie === 'rampes' || contenu[partie];
        ui.poser(allumee);
        const theme = partie === 'light' || partie === 'dark';
        const bloquee = partie === 'rampes' || (theme && unSeulTheme && allumee);
        ui.bouton.disabled = bloquee;
        const ligne = TEXTES_DU_CONTENU.lignes[partie];
        i18n.lier(aide, 'textContent', i18n.composer`${typeof ligne.aide === 'function' ? ligne.aide(lue.fonds[partie as 'light' | 'dark']) : ligne.aide}${theme && bloquee ? TEXTES_DU_CONTENU.auMoinsUnTheme : ''}`);
        i18n.lier(nombre, 'textContent', calques && partie !== 'rampes' ? TEXTES_DU_CONTENU.calques(calques[partie]) : '');
        nombre.hidden = nombre.textContent === '';
      }
      const retirees = PARTIES.filter((partie) => !contenu[partie]);
      cartes.contenu.ui.poserResume(retirees.length === 0 ? TEXTES_DU_CONTENU.resume.tout : i18n.joindre(retirees.map((partie) => TEXTES_DU_CONTENU.resume[partie]), ' · '));
      const retires = calques ? retirees.reduce((total, partie) => total + calques[partie], 0) : 0;
      i18n.lier(effetDuContenu, 'textContent', retirees.length === 0
        ? TEXTES_DU_CONTENU.toutGenere
        : palette && calques ? TEXTES_DU_CONTENU.effet(nomDeLaPalette(palette), calques.total, calques.total - retires) : '');
    }

    const vue = document.createElement('div');
    vue.className = 'page-stack colonne';
    vue.append(apercu, ...Object.values(cartes).map(({ ui }) => ui.element));
    element.append(sansRecette, vue);

    /**
     * La table n'est bâtie qu'une fois par liste de crans : un champ retiré
     * perdrait son focus. Le tracé en occupe la première ligne, au-dessus des
     * colonnes : le point d'une nuance tombe au milieu de sa colonne.
     */
    let cransBatis = '';
    const etiquettesDeLigne: Partial<Record<Mode, HTMLSpanElement>> = {};
    function batirLaTable(crans: readonly number[]): void {
      if (cransBatis === crans.join(',')) return;
      cransBatis = crans.join(',');
      for (let rang = champs.length - 1; rang >= 0; rang -= 1) if ('courbe' in champs[rang].champ) champs.splice(rang, 1);
      table.style.setProperty('--colonnes', String(crans.length));
      // Au-delà de onze nuances, les champs se resserrent : « 0,975 » tient encore dans un treizième de carte à 500 px.
      table.classList.toggle('table-serree', crans.length > 11);
      const titreDeLigne = (texte: Texte): HTMLSpanElement => {
        const titre = document.createElement('span');
        titre.className = 'titre-de-courbe';
        i18n.lier(titre, 'textContent', texte);
        return titre;
      };
      const numeros = crans.map((cran) => {
        const numero = document.createElement('span');
        numero.className = 'numero-de-courbe';
        i18n.lier(numero, 'textContent', String(cran));
        return numero;
      });
      // Le titre d'une ligne porte, sous son nom, l'étiquette du thème inversé ; `rendreLesSens` la montre.
      const titreDeLaLigne = (mode: Mode): HTMLSpanElement => {
        const titre = document.createElement('span');
        titre.className = 'titre-de-courbe titre-de-ligne';
        const nom = document.createElement('span');
        i18n.lier(nom, 'textContent', TEXTES_DE_CONFIGURATION.courbeDuMode[mode]);
        const etiquette = document.createElement('span');
        etiquette.className = 'etiquette-de-ligne';
        etiquette.hidden = true;
        i18n.lier(etiquette, 'textContent', TEXTES_DU_TEXTE_DES_BOUTONS.etiquetteDeLigne);
        titre.append(nom, etiquette);
        etiquettesDeLigne[mode] = etiquette;
        return titre;
      };
      const lignes = MODES.flatMap((mode) => [
        titreDeLaLigne(mode),
        ...crans.map((cran, rang) => champDeSaisie({ courbe: mode, rang }, 'courbes', i18n.composer`${nomDuMode[mode]} ${cran}`)),
      ]);
      table.replaceChildren(trace, titreDeLigne(''), ...numeros, ...lignes);
    }

    function signaler(carte: CarteDesReglages, texte: Texte | null): void {
      const { erreur } = cartes[carte];
      i18n.lier(erreur, 'textContent', texte ?? '');
      erreur.hidden = texte === null;
    }

    /** L'aperçu compact de la palette ouverte ; sans palette, il se cache. Rend l'analyse, pour le tracé. */
    function rendreLApercu(lue: Recette) {
      const ouverte = recette.ouverte();
      const palette = ouverte ? lue.palettes.find((candidate) => candidate.id === ouverte.id) : undefined;
      const analyse = palette ? analyserPalette(lue, palette) : null;
      if (ouverte && palette && analyse) {
        apercu.replaceChildren(
          paragraphe(paletteDeLApercu(nomDeLaPalette(palette), ouverte.mode), 'ligne-secondaire'),
          resultatsDesGaranties(analyse, ouverte.mode),
          apercuCompact(lue, analyse, ouverte.mode),
        );
      }
      apercu.hidden = !analyse;
      return { palette, analyse };
    }

    /**
     * La dernière garantie des courbes, et la clé des champs qu'elle lit :
     * crans, courbes, gamut, les deux seuils et les deux parts. Une recette
     * qui ne change que les fonds, les palettes ou les autres seuils la
     * retrouve sans la recalculer (Z4.8).
     */
    let garantieCalculee: { readonly cle: string; readonly manques: readonly ManqueDeGarantie[] } | null = null;

    function rendreLaGarantie(lue: Recette): void {
      const cle = JSON.stringify([lue.crans, lue.courbes.light, lue.courbes.dark, lue.gamut, lue.seuils.texte, lue.seuils.nonTexte, lue.profils.soft.part, lue.profils.vivid.part]);
      if (garantieCalculee?.cle === cle) return;
      const manques = garantieDesCourbes(lue);
      garantieCalculee = { cle, manques };
      garantie.replaceChildren(...manques.map((manque) => blocDeConstat(constatDeGarantie(manque), 'alerte')));
      noteDeGarantie.hidden = manques.length === 0;
    }

    /**
     * Le sens de chaque thème dans la table des courbes : l'étiquette « inversé »
     * sur sa ligne, et un cercle sur chaque valeur qui diffère de la courbe du
     * sens normal. Un thème normal n'a ni l'un ni l'autre.
     */
    function rendreLesSens(lue: Recette): void {
      for (const mode of MODES) {
        const etiquette = etiquettesDeLigne[mode];
        if (etiquette) etiquette.hidden = !estInverse(lue, mode);
      }
      table.classList.toggle('table-avec-etiquette', MODES.some((mode) => estInverse(lue, mode)));
      for (const { champ, saisie } of champs) {
        if (!('courbe' in champ)) continue;
        const rang = CRANS_DE_REFERENCE.indexOf(lue.crans[champ.rang]);
        saisie.dataset.cerclee = String(estInverse(lue, champ.courbe) && rang >= 0 && lue.courbes[champ.courbe][champ.rang] !== COURBES_DU_SENS_NORMAL[champ.courbe][rang]);
      }
    }

    /**
     * Le message d'effet : un paragraphe par thème inversé, puis l'effet commun.
     * Il se reconstruit quand ses nombres changent seulement, pour que la région
     * `status` n'annonce pas deux fois le même texte.
     */
    let cleDeLEffet = '';
    function rendreLEffet(lue: Recette): void {
      const inverses = (['dark', 'light'] as const).filter((mode) => estInverse(lue, mode));
      const cle = JSON.stringify([inverses, lue.crans]);
      if (cle === cleDeLEffet) return;
      cleDeLEffet = cle;
      effetDuTexte.hidden = inverses.length === 0;
      effetDuTexte.replaceChildren(...(inverses.length === 0 ? [] : [
        ...inverses.map((mode) => {
          const { nuances, valeurs } = nuancesDeLInversion(lue, mode);
          return paragraphe(TEXTES_DU_TEXTE_DES_BOUTONS.effetDuTheme(mode, nuances, valeurs));
        }),
        paragraphe(TEXTES_DU_TEXTE_DES_BOUTONS.effetCommun),
      ]));
    }

    /**
     * Ce que chaque saisie valide redessine sans toucher aux champs : l'aperçu
     * compact, le tracé des courbes et la garantie commune.
     */
    function rendreLesVues(lue: Recette): void {
      rendreLesSens(lue);
      const { palette, analyse } = rendreLApercu(lue);
      // Le tracé montre les courbes communes : le ◆ d'une palette libre, posé sur sa propre liste, n'y a pas de colonne.
      const commune = palette && analyse && !analyse.libre ? analyse : null;
      const reference = palette && commune ? { clarte: rgb8VersOklch(referenceDe(palette)).L, rangs: commune.ancrage.rangs } : null;
      dernierTrace = () => trace.replaceChildren(dessinerLesCourbes(geometrieDesCourbes(lue.courbes, reference, largeurDuTrace)));
      dernierTrace();
      i18n.lier(legende, 'textContent', legendeDesCourbes(palette && commune ? { nom: nomDeLaPalette(palette), crans: commune.ancrage.crans } : null));
      rendreLaGarantie(lue);
    }

    /** Les recettes que `validerRecette` a acceptées ici, et celles qu'un fond saisi en tire. */
    const recettesValides = new WeakSet<Recette>();

    /** Une recette déjà acceptée, ou acceptée maintenant : la validation ne se refait pas à chaque image. */
    function estValide(lue: Recette): boolean {
      if (recettesValides.has(lue)) return true;
      if ('refus' in validerRecette(lue)) return false;
      recettesValides.add(lue);
      return true;
    }

    /** La recette jugée : une recette valide se prévisualise, et se range à la fin du geste. */
    function proposer(suivante: Recette, carte: CarteDesReglages, fin: boolean): void {
      const jugee = validerRecette(suivante);
      if ('refus' in jugee) {
        if (fin) signaler(carte, texteDuRefus(jugee.refus[0]));
        return;
      }
      recettesValides.add(suivante);
      signaler(carte, null);
      if (!fin) {
        rendreLesVues(suivante);
        recette.previsualiser(suivante);
        return;
      }
      // La fin d'un geste relit tout : comptes, résumés, « Rétablir », les autres champs et les vues.
      recette.appliquer(suivante);
      afficher();
    }

    /**
     * Une saisie : un nombre qui forme une recette valide se prévisualise, et se
     * range à la validation du champ. Un refus ne se dit qu'à la validation :
     * pendant la frappe, « 0, » n'est pas encore une faute (V9.9).
     */
    function saisir(champ: ChampDeConfiguration, texte: string, carte: CarteDesReglages, fin: boolean): void {
      const lue = recette.lire();
      if (!lue) return;
      const valeur = lireNombre(texte);
      if (valeur === null) {
        if (fin) signaler(carte, nombreInvalide(texte));
        return;
      }
      proposer(poserValeur(lue, champ, valeur), carte, fin);
    }

    /**
     * Un curseur d'intensité, borné pour que Soft ne dépasse pas Vivid. Le
     * curseur revient à la borne : focalisé, `afficher` ne le toucherait pas.
     */
    function glisser(profil: Profil, curseur: HTMLInputElement, fin: boolean): void {
      const lue = recette.lire();
      if (!lue) return;
      const { soft, vivid } = lue.profils;
      const valeur = Number(curseur.value);
      const bornee = profil === 'soft' ? Math.min(valeur, vivid.part) : Math.max(valeur, soft.part);
      if (bornee !== valeur) curseur.value = String(bornee);
      proposer(poserValeur(lue, { part: profil }, bornee), 'parts', fin);
    }

    /** Un fond saisi, au clavier ou au sélecteur de couleur. */
    function saisirFond(mode: Mode, texte: string, fin: boolean): void {
      const lue = recette.lire();
      if (!lue) return;
      const suivante = poserFond(lue, mode, texte);
      if (suivante === null) {
        if (fin) signaler('fonds', hexaInvalide(texte));
        return;
      }
      /*
       * Pendant la saisie d'un fond, seul l'aperçu compact suit. La validation
       * reste vraie par construction : `poserFond` ne change qu'un fond, en
       * `#RRGGBB`, d'une recette que `validerRecette` a déjà acceptée (Z4.8).
       */
      if (!fin && estValide(lue)) {
        recettesValides.add(suivante);
        signaler('fonds', null);
        rendreLApercu(suivante);
        recette.previsualiser(suivante);
        return;
      }
      proposer(suivante, 'fonds', fin);
    }

    /** La recette sur laquelle le refus du texte des boutons s'affiche : un autre état de la recette l'efface. */
    let refusSur: Recette | null = null;
    /** Le choix d'un segment qui attend la confirmation du remplacement des nuances réglées. */
    let texteEnAttente: { readonly mode: Mode; readonly texte: TexteDesBoutons } | null = null;

    /** Une courbe qui ne reste pas monotone : la recette ne change pas, et la carte des fonds dit pourquoi. */
    function refuserLeTexte(lue: Recette, sens: 'normal' | 'inverse'): void {
      refusSur = lue;
      signaler('fonds', TEXTES_DU_TEXTE_DES_BOUTONS.refus(voisinesDeLaPlage(lue), sens));
    }

    function segmentDuTexte(mode: Mode, texte: TexteDesBoutons): HTMLButtonElement | undefined {
      return segmentsDuTexte[mode].find(({ valeur }) => valeur === texte)?.bouton;
    }

    function fermerLaConfirmationDuTexte(): void {
      texteEnAttente = null;
      confirmationDuTexte.hidden = true;
    }

    /** Pose le texte des boutons du thème : les nuances 500 à 800 prennent la courbe du sens d'arrivée. */
    function poserLeTexte(mode: Mode, texte: TexteDesBoutons): void {
      const lue = recette.lire();
      if (!lue) return;
      const posee = poserTexteDesBoutons(lue, mode, texte);
      if ('refus' in posee) {
        refuserLeTexte(lue, sensDuTheme(mode, texte));
        return;
      }
      proposer(posee.recette, 'fonds', true);
    }

    /** Un segment : la pose directe, ou d'abord la confirmation quand des nuances 500 à 800 sont réglées. */
    function choisirLeTexte(mode: Mode, texte: TexteDesBoutons): void {
      const lue = recette.lire();
      if (!lue || lue.texteDesBoutons[mode] === texte) return;
      if (nuancesReglees(lue, mode).length === 0) {
        fermerLaConfirmationDuTexte();
        poserLeTexte(mode, texte);
        segmentDuTexte(mode, texte)?.focus();
        return;
      }
      texteEnAttente = { mode, texte };
      i18n.lier(texteDeLaConfirmation, 'textContent', TEXTES_DU_TEXTE_DES_BOUTONS.confirmation(mode, sensDuTheme(mode, texte)));
      confirmationDuTexte.hidden = false;
      remplacerLesNuances.focus();
    }

    function remplacerLaCourbe(): void {
      const attente = texteEnAttente;
      fermerLaConfirmationDuTexte();
      if (!attente) return;
      poserLeTexte(attente.mode, attente.texte);
      segmentDuTexte(attente.mode, attente.texte)?.focus();
    }

    function annulerLeChoixDuTexte(): void {
      const attente = texteEnAttente;
      fermerLaConfirmationDuTexte();
      const lue = recette.lire();
      if (attente && lue) segmentDuTexte(attente.mode, lue.texteDesBoutons[attente.mode])?.focus();
    }

    function retablirLaCarteChoisie(carte: CarteDesReglages): void {
      const lue = recette.lire();
      const suivante = lue ? retablir(lue, carte) : null;
      if (!suivante) {
        // Pour les fonds, `null` est le refus d'une courbe non monotone au retour au sens normal.
        if (lue && carte === 'fonds') refuserLeTexte(lue, 'normal');
        return;
      }
      fermerLaConfirmationDuTexte();
      proposer(suivante, carte, true);
    }

    function afficher(): void {
      const lue = recette.lire();
      sansRecette.hidden = lue !== null;
      vue.hidden = lue === null;
      if (!lue) return;
      batirLaTable(lue.crans);
      const nombre = nombreDeNuancesDe(lue.crans);
      for (const { nombre: valeur, bouton } of boutonsDuNombre) bouton.setAttribute('aria-pressed', String(valeur === nombre));
      listeImportee.hidden = nombre !== null;
      for (const { champ, saisie } of champs) {
        if (document.activeElement !== saisie) saisie.value = lireTexte(nombreEcrit(valeurDe(lue, champ)));
      }
      for (const { mode, pipette, saisie } of saisiesDesFonds) {
        if (document.activeElement !== saisie) saisie.value = lue.fonds[mode];
        pipette.poser(lue.fonds[mode]);
      }
      for (const mode of MODES) {
        for (const { valeur, bouton } of segmentsDuTexte[mode]) bouton.setAttribute('aria-pressed', String(lue.texteDesBoutons[mode] === valeur));
      }
      // Un autre état de la recette rend le refus ou la confirmation obsolètes.
      if (refusSur && refusSur !== lue) {
        refusSur = null;
        signaler('fonds', null);
      }
      if (texteEnAttente && lue.texteDesBoutons[texteEnAttente.mode] === texteEnAttente.texte) fermerLaConfirmationDuTexte();
      rendreLEffet(lue);
      for (const { profil, curseur } of curseurs) {
        if (document.activeElement !== curseur) curseur.value = String(lue.profils[profil].part);
        i18n.lier(curseur, 'aria-valuetext', nombreEcrit(lue.profils[profil].part));
      }
      if (document.activeElement !== curseurDesFondsSombres) curseurDesFondsSombres.value = String(lue.intensiteDesFondsSombres);
      i18n.lier(curseurDesFondsSombres, 'aria-valuetext', nombreEcrit(lue.intensiteDesFondsSombres));
      rendreLeContenu(lue);
      for (const [nom, groupe] of Object.entries(groupes) as [GroupeDeConfiguration, Groupe][]) {
        groupe.compter(palettesConcernees(palettesModifiees(lue, nom)));
      }
      cartes.minimums.ui.poserResume(resumeDesMinimums(lue.seuils.texte, lue.seuils.nonTexte));
      cartes.proches.ui.poserResume(resumeDesEcarts(lue.seuils.profilsConfondus, lue.seuils.palettesProches));
      const inverses = MODES.filter((mode) => estInverse(lue, mode));
      if (inverses.length > 0) cartes.courbes.ui.poserResume(TEXTES_DU_TEXTE_DES_BOUTONS.resumeDesCourbes(inverses));
      for (const carte of Object.keys(cartes) as CarteDesReglages[]) {
        // « Rétablir » des fonds rend `null` pour un refus, que son geste dit ; seules les courbes d'une liste importée n'ont pas de défaut.
        const sansDefaut = carte !== 'fonds' && retablir(lue, carte) === null;
        cartes[carte].retablir.disabled = sansDefaut || estParDefaut(lue, carte);
        i18n.lier(cartes[carte].retablir, 'title', sansDefaut ? TEXTES_DE_CONFIGURATION.courbesSansDefaut : '');
      }
      rendreLesVues(lue);
    }

    return {
      element,
      focaliser(nom) {
        const groupe = groupes[nom];
        cartes[carteDuGroupe(nom)].ui.ouvrir();
        groupe.element.scrollIntoView({ block: 'start' });
        groupe.element.querySelector<HTMLInputElement>('input')?.focus();
      },
      afficher,
    };
  }
  return { createConfiguration };
}

export const creerVuesConfiguration = memoriserVues(construireVues);

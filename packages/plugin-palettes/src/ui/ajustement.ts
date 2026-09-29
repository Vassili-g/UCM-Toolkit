/**
 * Ajuster la référence ([UI-15], W7), en modale centrée au-dessus du panneau
 * (maquette Z3.4, forme A et présentation M2) : la phrase qui dit pourquoi,
 * l'originale et la proposition côte à côte, un pas de 0,01 de luminosité
 * OKLCH vers le sombre ou le clair, chroma et teinte gardées, une piste qui
 * marque d'un trait le passage d'une nuance à la suivante, une ligne pour la
 * nuance visée et ce que chaque pas voisin changerait, le code de la
 * proposition saisissable, les garanties avant et après en tableau, et le
 * bilan par intensité.
 *
 * Rien ne change pendant les pas : seul « Appliquer » rend la proposition,
 * que l'onglet applique à la palette courante. Le reste de la page est inerte
 * pendant la modale, et Tab y reste. « Annuler », Échap, « Appliquer » et un
 * clic sur le voile la referment, et rendent le focus à l'élément que
 * l'onglet désigne à ce moment.
 */
import { associationDe, etatDeLaPaire, verifierPromesses, type Emploi, type Intensite, type Mode, type Palette, type Promesse, type Recette } from 'ucm-couleur';

import {
  changementAuPasVoisin,
  garantiesComparees,
  manqueesParIntensite,
  nuancesVisees,
  paletteAjustee,
  pasALOuverture,
  pasLePlusProche,
  propositionAuPas,
} from '../ajustementDeLaReference';
import { MOTIF_HEXA, originaleDe } from '../edition';
import { creerVuesBadge } from './badge';
import { creerVuesChamps } from './champs';
import { memoriserVues, type Localisation, type Texte } from './localisation';
import { creerSocleLocalise } from './socleLocalise';

export interface GestesDeLAjustement {
  /** Reçoit la proposition, que l'onglet applique à la palette courante. */
  appliquer(proposition: string): void;
  /** L'élément qui reprend le focus à la fermeture : le lien, ou le code quand le lien a disparu (Y8.0). */
  retour(): HTMLElement;
}

export interface AjustementUi {
  /** Ouvre la modale sur la palette telle qu'elle est rangée, au pas qui mène à sa référence. */
  ouvrir(recette: Recette, palette: Palette): void;
  estOuverte(): boolean;
}

function construireVues(i18n: Localisation) {
  const { createButton } = creerSocleLocalise(i18n);
  const { badgeDeNiveau } = creerVuesBadge(i18n);
  const { champEnColonne } = creerVuesChamps(i18n);
  const { NOM_DE_L_ETAT, TEXTES_DE_L_AJUSTEMENT, bilanDeLAjustement, jugementDuSeuil, nuancesDeLAjustement, pourquoiAjuster, resultatDeLaGarantie, themeDeLaGarantie } = i18n.messages;

  /** Le nombre de pas que la piste montre de chaque côté de la proposition. */
  const DEMI_PISTE = 8;

  let compteur = 0;

  function paragraphe(texte: Texte, classe = ''): HTMLParagraphElement {
    const element = document.createElement('p');
    i18n.lier(element, 'textContent', texte);
    if (classe) element.className = classe;
    return element;
  }

  const cellule = (): HTMLSpanElement => document.createElement('span');

  /** Un nom de rôle en police de code. */
  function codeDuRole(emploi: Emploi): HTMLElement {
    const code = document.createElement('code');
    code.className = 'code-du-role';
    i18n.lier(code, 'textContent', emploi);
    return code;
  }

  /** Une grande pastille et son code, sous un libellé : l'originale, puis la proposition. */
  function temoin(libelle: Texte): { element: HTMLDivElement; poser(hexa: string): void } {
    const element = document.createElement('div');
    element.className = 'ajustement-temoin';
    const pastille = document.createElement('span');
    pastille.className = 'ajustement-pastille';
    pastille.setAttribute('aria-hidden', 'true');
    const code = paragraphe('', 'detail-code');
    element.append(pastille, paragraphe(libelle, 'libelle-de-champ'), code);
    return {
      element,
      poser(hexa) {
        pastille.style.background = hexa;
        i18n.lier(code, 'textContent', hexa);
      },
    };
  }

  /** Le résultat d'une garantie, ✓ ou ✗ et son ratio, en couleur de succès ou de danger. */
  function resultat(promesse: Promesse): HTMLSpanElement {
    const element = cellule();
    if (promesse.verdict === 'tenue') element.className = 'ajustement-tenue';
    else element.className = 'ajustement-manquee';
    i18n.lier(element, 'textContent', resultatDeLaGarantie(promesse.verdict === 'tenue', promesse.contraste));
    return element;
  }

  /** L'association d'une garantie en codes de rôles : « `text` sur fond », puis l'état quand ce n'est pas le repos. */
  function association(promesse: Promesse): HTMLSpanElement {
    const { premier, second } = associationDe(promesse.paire);
    const qui = cellule();
    qui.className = 'ajustement-qui';
    qui.append(codeDuRole(premier), i18n.noeud(i18n.composer` ${TEXTES_DE_L_AJUSTEMENT.sur} `));
    qui.append(second === 'fond' ? i18n.noeud(TEXTES_DE_L_AJUSTEMENT.fond) : codeDuRole(second));
    const etat = etatDeLaPaire(promesse.paire);
    if (etat > 0) qui.append(i18n.noeud(i18n.composer` · ${NOM_DE_L_ETAT[etat]}`));
    return qui;
  }

  function createAjustement(gestes: GestesDeLAjustement): AjustementUi {
    compteur += 1;
    const voile = document.createElement('div');
    voile.className = 'voile-de-modale';
    voile.hidden = true;
    const modale = document.createElement('div');
    modale.className = 'modale';
    modale.setAttribute('role', 'dialog');
    modale.setAttribute('aria-modal', 'true');
    const titre = document.createElement('h2');
    titre.className = 'modale-titre';
    titre.id = `titre-de-l-ajustement-${compteur}`;
    i18n.lier(titre, 'textContent', TEXTES_DE_L_AJUSTEMENT.titre);
    modale.setAttribute('aria-labelledby', titre.id);
    const pourquoi = paragraphe('');
    pourquoi.className = 'ajustement-pourquoi';

    const originale = temoin(TEXTES_DE_L_AJUSTEMENT.originale);
    const proposition = temoin(TEXTES_DE_L_AJUSTEMENT.proposition);
    const temoins = document.createElement('div');
    temoins.className = 'ajustement-temoins';
    temoins.append(originale.element, proposition.element);

    // Les deux pas de part et d'autre de la piste.
    const plusSombre = createButton({ label: '−', variant: 'secondary', onClick: () => faireUnPas(-1) });
    i18n.lier(plusSombre, 'aria-label', TEXTES_DE_L_AJUSTEMENT.plusSombre);
    const plusClair = createButton({ label: '+', variant: 'secondary', onClick: () => faireUnPas(1) });
    i18n.lier(plusClair, 'aria-label', TEXTES_DE_L_AJUSTEMENT.plusClair);
    const piste = document.createElement('div');
    piste.className = 'ajustement-piste';
    piste.setAttribute('aria-hidden', 'true');
    const reglette = document.createElement('div');
    reglette.className = 'ajustement-reglette';
    reglette.append(plusSombre, piste, plusClair);
    // Une ligne : la nuance visée, puis ce que chaque pas voisin changerait (maquette Z3.1, forme A).
    const nuances = paragraphe('');
    nuances.className = 'ligne-secondaire ajustement-nuances';
    nuances.setAttribute('aria-live', 'polite');

    const code = document.createElement('input');
    code.type = 'text';
    code.className = 'input champ-hexa';
    code.spellcheck = false;
    code.maxLength = 7;
    const champDuCode = champEnColonne(TEXTES_DE_L_AJUSTEMENT.code, code);
    champDuCode.classList.add('ajustement-code');

    // Le tableau : une ligne par garantie ; sous 552 px, le thème et l'intensité passent en titre de groupe.
    const tableau = document.createElement('div');
    tableau.className = 'ajustement-tableau';
    const bilan = paragraphe('');
    bilan.className = 'ligne-secondaire ajustement-bilan';

    const boutonAppliquer = createButton({ label: TEXTES_DE_L_AJUSTEMENT.appliquer, onClick: () => valider() });
    const boutons = document.createElement('div');
    boutons.className = 'confirmation-gestes';
    boutons.append(createButton({ label: TEXTES_DE_L_AJUSTEMENT.annuler, variant: 'secondary', onClick: () => fermer() }), boutonAppliquer);

    modale.append(titre, pourquoi, temoins, reglette, nuances, champDuCode, tableau, bilan, boutons);
    voile.append(modale);
    document.body.append(voile);

    let recette: Recette | null = null;
    let palette: Palette | null = null;
    let pas = 0;
    /** La proposition montrée : celle du pas, ou un code saisi dans la modale. */
    let courante: string | null = null;
    /** L'inertie de chaque élément de la page avant l'ouverture, rendue à la fermeture. */
    let inerties: { element: HTMLElement; inerte: boolean }[] = [];

    function faireUnPas(sens: -1 | 1): void {
      if (!recette || !palette) return;
      const suivante = propositionAuPas(recette, palette, pas + sens);
      if (!suivante) return;
      pas += sens;
      courante = suivante;
      rendre();
    }

    code.addEventListener('change', () => {
      if (!recette || !palette || !MOTIF_HEXA.test(code.value.trim())) {
        code.setAttribute('aria-invalid', 'true');
        return;
      }
      code.setAttribute('aria-invalid', 'false');
      const saisie = code.value.trim().startsWith('#') ? code.value.trim() : `#${code.value.trim()}`;
      courante = saisie.toUpperCase();
      pas = pasLePlusProche(recette, palette, courante);
      rendre();
    });

    /**
     * La piste : les propositions de part et d'autre du pas courant, peintes en
     * dégradé, un trait là où la nuance visée change dans un thème, et le
     * curseur au pas courant.
     */
    function rendreLaPiste(lue: Recette, ajustee: Palette): void {
      const pasMontres = Array.from({ length: 2 * DEMI_PISTE + 1 }, (_, rang) => pas - DEMI_PISTE + rang);
      const propositions = pasMontres.map((candidat) => propositionAuPas(lue, ajustee, candidat));
      const visees = propositions.map((hexa) => {
        const apres = hexa ? paletteAjustee(lue, ajustee, hexa) : null;
        return apres ? nuancesVisees(lue, apres) : null;
      });
      const couleurs = propositions.filter((hexa): hexa is string => hexa !== null);
      piste.style.background = couleurs.length > 1 ? `linear-gradient(to right, ${couleurs.join(', ')})` : couleurs[0] ?? 'transparent';
      const traits = visees.slice(1).flatMap((visee, rang) => {
        const avant = visees[rang];
        if (!visee || !avant || (visee.light === avant.light && visee.dark === avant.dark)) return [];
        const trait = document.createElement('span');
        trait.className = 'ajustement-frontiere';
        trait.style.left = `${((rang + 0.5) / (pasMontres.length - 1)) * 100}%`;
        return [trait];
      });
      const curseur = document.createElement('span');
      curseur.className = 'ajustement-curseur';
      curseur.style.left = '50%';
      piste.replaceChildren(...traits, curseur);
    }

    /** Les garanties manquées avant ou après, groupées par thème et par intensité, dans l'ordre du moteur. */
    function rendreLeTableau(lue: Recette, avant: Palette, apres: Palette): void {
      // Une palette libre n'a pas de garanties : le tableau et le bilan se taisent.
      const libre = avant.crans !== undefined;
      tableau.hidden = libre;
      bilan.hidden = libre;
      if (libre) {
        tableau.replaceChildren();
        return;
      }
      const manqueesAvant = manqueesParIntensite(lue, avant);
      const manqueesApres = manqueesParIntensite(lue, apres);
      i18n.lier(bilan, 'textContent', i18n.joindre(manqueesAvant.map(({ intensite, manquees }, rang) => bilanDeLAjustement(intensite, manquees, manqueesApres[rang].manquees)), ' · '));
      const comparees = garantiesComparees(lue, avant, apres);
      if (comparees.length === 0) {
        tableau.replaceChildren(paragraphe(TEXTES_DE_L_AJUSTEMENT.aucuneGarantieManquee, 'ligne-secondaire'));
        return;
      }
      const entete = document.createElement('div');
      entete.className = 'ajustement-ligne ajustement-entete';
      const colonnes = TEXTES_DE_L_AJUSTEMENT.colonnes;
      entete.append(paragraphe(colonnes.garantie), paragraphe(colonnes.theme), paragraphe(colonnes.avant), cellule(), paragraphe(colonnes.apres));
      const lignes: HTMLElement[] = [entete];
      let groupe = '';
      for (const { avant: promesseAvant, apres: promesseApres } of comparees) {
        const cle = `${promesseAvant.mode}|${promesseAvant.profil}`;
        const [mode, profil] = [promesseAvant.mode as Mode, promesseAvant.profil as Intensite];
        if (cle !== groupe) {
          groupe = cle;
          const titreDuGroupe = paragraphe(themeDeLaGarantie(mode, profil, true));
          titreDuGroupe.className = 'ajustement-groupe';
          lignes.push(titreDuGroupe);
        }
        const ligne = document.createElement('div');
        ligne.className = 'ajustement-ligne';
        ligne.dataset.verdict = promesseApres.verdict;
        const themeDeLaLigne = cellule();
        themeDeLaLigne.className = 'ajustement-theme ligne-secondaire';
        i18n.lier(themeDeLaLigne, 'textContent', themeDeLaGarantie(mode, profil, false));
        const fleche = cellule();
        fleche.className = 'ajustement-fleche';
        fleche.setAttribute('aria-hidden', 'true');
        i18n.lier(fleche, 'textContent', '→');
        const apresEtBadge = cellule();
        apresEtBadge.className = 'ajustement-apres';
        apresEtBadge.append(resultat(promesseApres), badgeDeNiveau(promesseApres.contraste, jugementDuSeuil(promesseApres.paire.seuil)));
        ligne.append(association(promesseAvant), themeDeLaLigne, resultat(promesseAvant), fleche, apresEtBadge);
        lignes.push(ligne);
      }
      tableau.replaceChildren(...lignes);
    }

    /** Pourquoi ajuster : dans chaque thème qui manque une garantie, le premier rôle manqué. */
    function manquesDeLaPalette(lue: Recette, ajustee: Palette): { readonly mode: Mode; readonly emploi: Emploi }[] {
      const manquees = verifierPromesses(lue, ajustee).filter((promesse) => promesse.verdict === 'manquee');
      return (['light', 'dark'] as const).flatMap((mode) => {
        const premiere = manquees.find((promesse) => promesse.mode === mode);
        return premiere ? [{ mode, emploi: associationDe(premiere.paire).premier }] : [];
      });
    }

    function rendre(): void {
      if (!recette || !palette || !courante) return;
      const manques = manquesDeLaPalette(recette, palette);
      i18n.lier(pourquoi, 'textContent', manques.length > 0 ? pourquoiAjuster(manques) : '');
      pourquoi.hidden = manques.length === 0;
      originale.poser(originaleDe(palette).toUpperCase());
      proposition.poser(courante);
      if (document.activeElement !== code) code.value = courante;
      rendreLaPiste(recette, palette);
      plusSombre.disabled = propositionAuPas(recette, palette, pas - 1) === null;
      plusClair.disabled = propositionAuPas(recette, palette, pas + 1) === null;

      const apres = paletteAjustee(recette, palette, courante);
      const voisins = ([-1, 1] as const).flatMap((sens) => {
        const changements = changementAuPasVoisin(recette!, palette!, pas, sens);
        return changements && changements.length > 0 ? [{ sens, changements }] : [];
      });
      i18n.lier(nuances, 'textContent', apres ? nuancesDeLAjustement(nuancesVisees(recette, apres), voisins) : '');
      if (apres) rendreLeTableau(recette, palette, apres);
      boutonAppliquer.disabled = !apres || apres.reference === palette.reference;
    }

    /** Les éléments focalisables de la modale, dans l'ordre de la tabulation. */
    function focalisables(): HTMLElement[] {
      return Array.from(modale.querySelectorAll<HTMLElement>('button, input')).filter((element) => !(element as HTMLButtonElement).disabled && element.offsetParent !== null);
    }

    /** Cache la modale et rend à la page son inertie d'avant. */
    function refermer(): void {
      voile.hidden = true;
      for (const { element, inerte } of inerties) element.inert = inerte;
      inerties = [];
      recette = null;
      palette = null;
    }

    function fermer(): void {
      if (voile.hidden) return;
      refermer();
      gestes.retour().focus();
    }

    /** « Appliquer » : la modale se referme avant que l'onglet se rende, et le focus suit le rendu. */
    function valider(): void {
      if (!recette || !palette || !courante) return;
      const choisie = courante;
      if (!paletteAjustee(recette, palette, choisie)) return;
      refermer();
      gestes.appliquer(choisie);
      gestes.retour().focus();
    }

    // Sur le document : un clic dans la modale hors d'un contrôle rend le focus au corps de la page, et Échap doit encore la refermer.
    document.addEventListener('keydown', (evenement) => {
      if (voile.hidden) return;
      if (evenement.key === 'Escape') {
        evenement.preventDefault();
        evenement.stopPropagation();
        fermer();
        return;
      }
      if (evenement.key !== 'Tab') return;
      // Tab reste dans la modale : du dernier élément au premier, et l'inverse avec Maj.
      const liste = focalisables();
      const [premier, dernier] = [liste[0], liste[liste.length - 1]];
      if (!premier) return;
      if (!modale.contains(document.activeElement)) {
        evenement.preventDefault();
        (evenement.shiftKey ? dernier : premier).focus();
      } else if (evenement.shiftKey && document.activeElement === premier) {
        evenement.preventDefault();
        dernier.focus();
      } else if (!evenement.shiftKey && document.activeElement === dernier) {
        evenement.preventDefault();
        premier.focus();
      }
    });
    // Un clic sur le voile, hors de la modale, la referme comme « Annuler ».
    voile.addEventListener('click', (evenement) => {
      if (evenement.target === voile) fermer();
    });

    return {
      ouvrir(lue, ajustee) {
        recette = lue;
        palette = ajustee;
        pas = pasALOuverture(lue, ajustee);
        courante = ajustee.reference.toUpperCase();
        code.setAttribute('aria-invalid', 'false');
        rendre();
        inerties = Array.from(document.body.children).filter((element): element is HTMLElement => element instanceof HTMLElement && element !== voile).map((element) => ({ element, inerte: element.inert }));
        for (const { element } of inerties) element.inert = true;
        voile.hidden = false;
        plusSombre.focus();
      },
      estOuverte: () => !voile.hidden,
    };
  }
  return { createAjustement };
}

export const creerVuesAjustement = memoriserVues(construireVues);

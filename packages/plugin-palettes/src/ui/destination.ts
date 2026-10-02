/**
 * La carte « Destination des tokens » ([UI-30]) : « Changer », sur la ligne
 * « Tokens », l'ouvre à la place du bloc de la connexion. Trois champs, sans
 * texte d'aide : la collection, en liste à choix unique, « Nouvelle
 * collection » et son champ puis chaque collection locale avec son nombre de
 * variables, puis les collections de bibliothèque, grisées et non
 * choisissables ([VAR-14]) ; le groupe et les thèmes sur une rangée. Dessous, une
 * simulation liste les chemins que la destination crée, sans couleur ni
 * valeur, et suit chaque choix, sans rien ranger. « Enregistrer » range la destination ([VAR-16]) ;
 * un refus se lit dans la carte, qui reste ouverte.
 */
import type { Recette } from 'ucm-couleur';

import type { IssueDeLaDestination } from '../ecriture/variables';
import type { VariablesDuFichier } from '../lectureDesVariables';
import type { Destination, ThemesDeLaDestination } from '../variables/destination';
import { simulationDeLaDestination } from '../variables/gestion';
import { createCarte } from './carte';
import { creerVuesConstats } from './constats';
import { memoriserVues, type Localisation, type Texte } from './localisation';
import { creerSocleLocalise } from './socleLocalise';

export interface DestinationUi {
  readonly element: HTMLElement;
  /** Montre les collections de l'état lu et la destination rangée, et prend le focus. */
  ouvrir(fichier: VariablesDuFichier, recette: Recette | null): void;
  estOuverte(): boolean;
  fermer(): void;
  /** L'issue de « Enregistrer » ; vrai quand la destination est rangée : la carte peut se fermer. */
  recevoir(issue: IssueDeLaDestination): boolean;
  /** Rend « Enregistrer » inactif, avec la raison ; `null` le rend. */
  bloquer(raison: Texte | null): void;
}

export interface GestesDeLaDestination {
  /** Demande le rangement ; `false` quand rien ne part, pendant un conflit d'enregistrement. */
  enregistrer(destination: Destination): boolean;
  annuler(): void;
}

function construireVues(i18n: Localisation) {
  const { createButton } = creerSocleLocalise(i18n);
  const { blocDeConstat } = creerVuesConstats(i18n);
  const { TEXTES_DE_LA_GESTION, lectureSeule, nombreDeVariables, refusDeLaDestination, resumeDeLaSimulation, suiviFutur } = i18n.messages;

  function createDestination(gestes: GestesDeLaDestination): DestinationUi {
    const carte = createCarte({ titre: TEXTES_DE_LA_GESTION.destinationDesTokens }, i18n);
    carte.element.classList.add('carte-ouverte');
    carte.element.hidden = true;

    function champ(libelle: Texte, id: string): { element: HTMLDivElement; libelle: HTMLSpanElement } {
      const element = document.createElement('div');
      element.className = 'champ-colonne';
      const titre = document.createElement('span');
      titre.className = 'libelle-de-champ';
      titre.id = id;
      i18n.lier(titre, 'textContent', libelle);
      element.append(titre);
      return { element, libelle: titre };
    }

    // La collection : une liste à choix unique.
    const champDeLaCollection = champ(TEXTES_DE_LA_GESTION.collection, 'libelle-de-la-collection-des-tokens');
    const liste = document.createElement('div');
    liste.className = 'liste-de-choix';
    liste.setAttribute('role', 'radiogroup');
    liste.setAttribute('aria-labelledby', champDeLaCollection.libelle.id);
    champDeLaCollection.element.append(liste);
    const nomDeLaNouvelle = document.createElement('input');
    nomDeLaNouvelle.type = 'text';
    nomDeLaNouvelle.className = 'input';
    i18n.lier(nomDeLaNouvelle, 'aria-label', TEXTES_DE_LA_GESTION.nomDeLaNouvelleCollection);

    // Le groupe et les thèmes, sur une rangée.
    const champDuGroupe = champ(TEXTES_DE_LA_GESTION.groupe, 'libelle-du-groupe-des-tokens');
    const groupe = document.createElement('input');
    groupe.type = 'text';
    groupe.className = 'input';
    groupe.setAttribute('aria-labelledby', champDuGroupe.libelle.id);
    champDuGroupe.element.append(groupe);
    const champDesThemes = champ(TEXTES_DE_LA_GESTION.themes, 'libelle-des-themes-des-tokens');
    const bascule = document.createElement('div');
    bascule.className = 'bascule bascule-de-base';
    bascule.setAttribute('role', 'group');
    bascule.setAttribute('aria-labelledby', champDesThemes.libelle.id);
    let themes: ThemesDeLaDestination = 'chemin';
    const choixDesThemes = ([['chemin', TEXTES_DE_LA_GESTION.dansLeChemin], ['modes', TEXTES_DE_LA_GESTION.enModes]] as const).map(([valeur, libelle]) => {
      const choix = document.createElement('button');
      choix.type = 'button';
      choix.className = 'bascule-option';
      choix.dataset.valeur = valeur;
      i18n.lier(choix, 'textContent', libelle);
      choix.addEventListener('click', () => {
        themes = valeur;
        rendre();
      });
      bascule.append(choix);
      return { valeur, choix };
    });
    champDesThemes.element.append(bascule);
    const rangee = document.createElement('div');
    rangee.className = 'colonnes-de-base';
    rangee.append(champDuGroupe.element, champDesThemes.element);

    const simulation = document.createElement('div');
    simulation.className = 'simulation';
    const refus = document.createElement('div');
    refus.className = 'page-stack';
    refus.hidden = true;

    const enregistrer = createButton({ label: TEXTES_DE_LA_GESTION.enregistrer, compact: true, onClick: demander });
    enregistrer.dataset.geste = 'enregistrer';
    const annuler = createButton({
      label: TEXTES_DE_LA_GESTION.annuler,
      variant: 'secondary',
      compact: true,
      onClick: () => {
        carte.element.hidden = true;
        gestes.annuler();
      },
    });
    annuler.dataset.geste = 'annuler';
    const pied = document.createElement('div');
    pied.className = 'confirmation-gestes';
    pied.append(annuler, enregistrer);

    carte.corps.classList.add('carte-aeree');
    carte.corps.append(champDeLaCollection.element, rangee, simulation, refus, pied);

    let fichier: VariablesDuFichier | null = null;
    let recette: Recette | null = null;
    let enVol = false;
    let blocage: Texte | null = null;

    const choisie = (): HTMLInputElement | null => liste.querySelector<HTMLInputElement>('input[type="radio"]:checked');

    /** La destination que les champs décrivent, sans validation : le sandbox la valide et nomme le champ fautif. */
    function proposee(): Destination {
      const radio = choisie();
      return {
        collection: radio && radio.value !== '' ? { id: radio.value } : { nom: nomDeLaNouvelle.value },
        groupe: groupe.value,
        themes,
      };
    }

    /** La simulation : le nom de la collection et ses modes, puis un chemin par rampe, de sa première à sa dernière nuance, et son nombre de variables. */
    function rendreLaSimulation(): void {
      const destination = proposee();
      const simulee = recette ? simulationDeLaDestination(recette, { ...destination, groupe: destination.groupe.split('/').map((segment) => segment.trim()).filter(Boolean).join('/') }) : null;
      simulation.hidden = simulee === null;
      if (!simulee) return;
      const tete = document.createElement('div');
      tete.className = 'simulation-tete';
      const titre = document.createElement('span');
      titre.className = 'libelle-de-champ';
      i18n.lier(titre, 'textContent', TEXTES_DE_LA_GESTION.simulation);
      const resume = document.createElement('span');
      resume.className = 'ligne-secondaire';
      i18n.lier(resume, 'textContent', resumeDeLaSimulation(simulee.variables, simulee.modes));
      tete.append(titre, resume);

      const chemins = document.createElement('div');
      chemins.className = 'chemins';
      const teteDesChemins = document.createElement('div');
      teteDesChemins.className = 'chemins-tete';
      const nom = document.createElement('span');
      const radio = choisie();
      nom.textContent = radio && radio.value !== '' ? fichier?.collections.find((collection) => collection.id === radio.value)?.nom ?? '' : nomDeLaNouvelle.value.trim();
      teteDesChemins.append(nom);
      if (simulee.modes > 1) teteDesChemins.append(i18n.noeud(TEXTES_DE_LA_GESTION.modesLightEtDark));
      chemins.append(teteDesChemins);
      for (const groupeSimule of simulee.groupes) {
        const ligne = document.createElement('div');
        ligne.className = 'chemin-cree';
        const chemin = document.createElement('code');
        const nuances = document.createElement('span');
        nuances.className = 'chemin-nuances';
        nuances.textContent = `${groupeSimule.nuances[0]} … ${groupeSimule.nuances[groupeSimule.nuances.length - 1]}`;
        chemin.append(`${[...groupeSimule.chemin.split('/').filter(Boolean), ''].join(' / ')}`, nuances);
        const compte = document.createElement('span');
        compte.className = 'chemin-compte';
        compte.textContent = String(groupeSimule.nuances.length);
        ligne.append(chemin, compte);
        chemins.append(ligne);
      }
      simulation.replaceChildren(tete, chemins);
    }

    function rendre(): void {
      for (const { valeur: theme, choix } of choixDesThemes) choix.setAttribute('aria-pressed', String(theme === themes));
      enregistrer.disabled = enVol || blocage !== null;
      i18n.lier(enregistrer, 'title', blocage ?? '');
      annuler.disabled = enVol;
      rendreLaSimulation();
    }

    function demander(): void {
      if (enVol || !gestes.enregistrer(proposee())) return;
      enVol = true;
      refus.hidden = true;
      rendre();
    }

    function choix(id: string, contenu: readonly (Node | string)[], detail: Texte, coche: boolean): HTMLLabelElement {
      const ligne = document.createElement('label');
      ligne.className = 'choix';
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'collection-des-tokens';
      radio.value = id;
      radio.checked = coche;
      radio.addEventListener('change', rendre);
      const nom = document.createElement('span');
      nom.className = 'choix-nom';
      nom.append(...contenu);
      const compte = document.createElement('span');
      compte.className = 'ligne-secondaire';
      i18n.lier(compte, 'textContent', detail);
      ligne.append(radio, nom, compte);
      return ligne;
    }

    nomDeLaNouvelle.addEventListener('input', () => {
      const radio = liste.querySelector<HTMLInputElement>('input[type="radio"][value=""]');
      if (radio) radio.checked = true;
      rendre();
    });
    groupe.addEventListener('input', rendre);

    return {
      element: carte.element,
      ouvrir(lu, recetteLue) {
        fichier = lu;
        recette = recetteLue;
        enVol = false;
        const { destination } = lu.suivi;
        // Une destination qui désigne une collection disparue retombe sur une collection neuve, à nommer.
        const rangee = 'id' in destination.collection && lu.collections.some((collection) => collection.id === (destination.collection as { id: string }).id) ? destination.collection.id : '';
        nomDeLaNouvelle.value = 'nom' in destination.collection ? destination.collection.nom : 'primitives';
        groupe.value = destination.groupe;
        themes = destination.themes;
        refus.replaceChildren();
        refus.hidden = true;
        liste.replaceChildren(
          choix('', [i18n.noeud(TEXTES_DE_LA_GESTION.nouvelleCollection), nomDeLaNouvelle], '', rangee === ''),
          ...lu.collections.map((collection) => choix(collection.id, [collection.nom], nombreDeVariables(collection.variables), collection.id === rangee)),
          // Une bibliothèque ne s'écrit que depuis son propre fichier : ses collections se lisent, sans se choisir.
          ...(lu.bibliotheques?.collections ?? []).map((collection) => {
            const etiquette = document.createElement('span');
            etiquette.className = 'etiquette';
            i18n.lier(etiquette, 'textContent', TEXTES_DE_LA_GESTION.bibliotheque);
            const ligne = choix(`bibliotheque:${collection.cle}`, [collection.nom, etiquette], lectureSeule(collection.variables), false);
            ligne.dataset.distante = 'true';
            ligne.querySelector<HTMLInputElement>('input')!.disabled = true;
            return ligne;
          }),
        );
        carte.element.hidden = false;
        rendre();
        choisie()?.focus();
      },
      estOuverte: () => !carte.element.hidden,
      fermer() {
        carte.element.hidden = true;
      },
      recevoir(issue) {
        enVol = false;
        if (issue.issue === 'rangee') {
          carte.element.hidden = true;
          return true;
        }
        refus.replaceChildren(issue.issue === 'suivi-futur' ? blocDeConstat(suiviFutur(), 'bloquant') : blocDeConstat(refusDeLaDestination(issue.refus), 'alerte'));
        refus.hidden = false;
        rendre();
        return false;
      },
      bloquer(raison) {
        blocage = raison;
        rendre();
      },
    };
  }
  return { createDestination };
}

export const creerVuesDestination = memoriserVues(construireVues);

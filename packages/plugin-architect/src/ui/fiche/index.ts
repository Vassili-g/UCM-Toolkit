/**
 * La fiche d'une variable : une feuille qui prend la place de l'inspecteur
 * dans la barre latérale. Elle montre la chaîne d'alias de la variable dans
 * les modes affichés, le renommage que Corrections propose pour elle, et les
 * variables qui la visent. Elle s'ouvre quand le designer choisit une ligne du
 * tableau et se ferme par sa croix, Échap ou un lien qui écrit dans la
 * recherche. La ligne choisie du tableau reste marquée tant qu'elle est ouverte.
 */
import { creerChemin, creerPastilleDeCouleur } from 'ucm-plugin-socle/src/ui/Chemin';
import { createFeuille, type FeuilleUi } from 'ucm-plugin-socle/src/ui/Feuille';
import { espaceDuReleve } from '../../modele';
import type { Application } from '../application';
import { TEXTES } from '../textes';
import { couleurCss } from '../valeurs';
import { NOMS_LISTES_AU_PLUS, modeleDeLaFiche, type FicheDeVariable } from './modele';

function el<K extends keyof HTMLElementTagNameMap>(balise: K, classe = '', texte = ''): HTMLElementTagNameMap[K] {
  const element = document.createElement(balise);
  if (classe !== '') element.className = classe;
  if (texte !== '') element.textContent = texte;
  return element;
}

function lien(libelle: string, auClic: () => void): HTMLButtonElement {
  const bouton = el('button', '', libelle);
  bouton.className = 'btn-texte';
  bouton.type = 'button';
  bouton.addEventListener('click', auClic);
  return bouton;
}

/** Un bloc titré : le titre à gauche, un complément ou un lien à droite, puis le corps. */
function bloc(titre: string, corps: HTMLElement, aDroite: HTMLElement | null, complement?: string): HTMLElement {
  const tete = el('div');
  tete.className = 'fiche-bloc-tete';
  tete.append(el('h3', '', titre));
  if (complement !== undefined) tete.append(el('span', 'meta', complement));
  if (aDroite) tete.append(aDroite);
  const element = el('div');
  element.className = 'fiche-bloc';
  element.append(tete, corps);
  return element;
}

/** Une liste de noms, chacun sur une ligne bordée. */
function listeDeNoms(chemins: readonly HTMLElement[]): HTMLElement {
  const liste = el('div');
  liste.className = 'fiche-liste';
  for (const chemin of chemins) {
    const ligne = el('div', 'diff sans-case');
    const conteneur = el('span', 'chemin');
    conteneur.append(chemin);
    ligne.append(conteneur);
    liste.append(ligne);
  }
  return liste;
}

export interface Fiche {
  mettreAJour(): void;
}

export function creerFiche(app: Application): Fiche {
  let feuille: FeuilleUi | null = null;
  let ouverte: string | null = null;
  /** Vrai quand le code ferme la feuille pour en ouvrir une autre ou parce que l'état l'a déjà fermée : la fermeture ne change alors pas la ligne choisie. */
  let parLeCode = false;

  function creerLaChaine(fiche: FicheDeVariable): HTMLElement {
    const chaine = el('ol');
    chaine.className = 'chaine-alias';
    for (const etape of fiche.etapes) {
      const rang = el('li');
      const colonne = el('span');
      colonne.className = 'chaine-col';
      colonne.append(etape.collection);
      if (etape.mode !== null) {
        const mode = el('span', '', etape.mode);
        mode.className = 'chaine-mode';
        colonne.append(mode);
      }
      rang.append(colonne, creerChemin(etape.nom));
      chaine.append(rang);
    }
    const fin = el('li');
    fin.className = 'terme';
    if (fiche.fin.sorte === 'valeur') {
      const valeur = el('span');
      valeur.className = 'chaine-valeur';
      const { index } = app.etat;
      const css = fiche.fin.valeur.nature === 'couleur' && index ? couleurCss(fiche.fin.valeur.couleur, espaceDuReleve(index.releve)) : null;
      if (css) valeur.append(creerPastilleDeCouleur(css));
      valeur.append(fiche.fin.texte);
      fin.append(valeur);
    } else {
      const echec = el('span', '', fiche.fin.statut);
      echec.className = 'chaine-valeur';
      fin.append(echec);
      if (fiche.fin.detail !== null) fin.append(el('p', 'meta', fiche.fin.detail));
    }
    chaine.append(fin);
    return chaine;
  }

  function creerLeRenommage(fiche: FicheDeVariable): HTMLElement | null {
    const { renommage } = fiche;
    if (!renommage) return null;
    const regle = renommage.regle;
    const ouvrirLaRegle = regle
      ? lien(TEXTES.voirLaRegle(regle.avant, regle.apres), () => {
          app.fermerLaFiche();
          app.renommages.ouvrir(fiche.id, regle.rang);
        })
      : null;
    const element = bloc(TEXTES.renommageAAppliquer, listeDeNoms([creerChemin(renommage.nouveau, { ajouts: renommage.ajouts })]), ouvrirLaRegle);
    element.dataset.l = 'renommage';
    return element;
  }

  function creerLUtilisation(fiche: FicheDeVariable): HTMLElement | null {
    const { utilisee } = fiche;
    if (utilisee.total === 0) return null;
    const lignes = listeDeNoms(utilisee.noms.map((nom) => creerChemin(nom)));
    if (utilisee.total > NOMS_LISTES_AU_PLUS) {
      lignes.append(el('span', 'meta', TEXTES.etAutres(utilisee.total - NOMS_LISTES_AU_PLUS)));
    }
    const element = bloc(TEXTES.utiliseePar(utilisee.total), lignes, lien(TEXTES.afficherLesVariables(utilisee.total), () => app.rechercherParLien(utilisee.recherche)));
    element.dataset.l = 'utilisee';
    return element;
  }

  function creerLeContenu(fiche: FicheDeVariable): HTMLElement {
    const contenu = el('div');
    contenu.className = 'feuille-contenu';
    contenu.append(bloc(TEXTES.valeur, creerLaChaine(fiche), null, TEXTES.dansLesModesAffiches));
    for (const partie of [creerLeRenommage(fiche), creerLUtilisation(fiche)]) if (partie) contenu.append(partie);
    return contenu;
  }

  /** Le titre est le nom de la variable en chemin ; l'origine et la description se posent dessous, dans l'en-tête du socle. */
  function poserLEntete(element: HTMLElement, fiche: FicheDeVariable): void {
    const entete = element.querySelector('.feuille-entete');
    const titre = entete?.querySelector('.feuille-titre');
    if (!entete || !titre) return;
    const segments = fiche.nom.split('/');
    titre.replaceChildren(creerChemin(fiche.nom, { vus: [segments[segments.length - 1]], titre: true }));
    const ligne = el('div');
    ligne.className = 'titre-ligne';
    const origine = el('span', '', fiche.origine);
    origine.className = 'origine';
    ligne.append(titre, origine);
    const definition = el('div');
    definition.className = 'titre-et-definition';
    definition.append(ligne);
    if (fiche.description !== '') definition.append(el('p', 'meta', fiche.description));
    entete.classList.add('avec-definition');
    entete.querySelector('.feuille-fermer')?.before(definition);
  }

  function fermer(): void {
    const courante = feuille;
    feuille = null;
    ouverte = null;
    parLeCode = true;
    courante?.fermer();
    parLeCode = false;
  }

  return {
    mettreAJour() {
      const choisie = app.etat.position.inspectee;
      const fiche = choisie === null ? null : modeleDeLaFiche(app, choisie);
      if (!fiche) {
        fermer();
        return;
      }
      if (feuille && ouverte === fiche.id) {
        // Même variable : seul le contenu suit le nouveau contexte, la feuille et le focus restent.
        feuille.element.querySelector('.feuille-corps')?.replaceChildren(creerLeContenu(fiche));
        return;
      }
      fermer();
      const nouvelle = createFeuille({
        titre: fiche.nom,
        corps: creerLeContenu(fiche),
        pied: el('div'),
        onFermer: () => {
          if (feuille === nouvelle) {
            feuille = null;
            ouverte = null;
          }
          if (!parLeCode) app.fermerLaFiche();
        },
      });
      feuille = nouvelle;
      ouverte = fiche.id;
      nouvelle.element.classList.add('feuille-terme');
      nouvelle.element.querySelector('.feuille-pied')?.replaceWith();
      poserLEntete(nouvelle.element, fiche);
    },
  };
}

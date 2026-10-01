/**
 * Comparer : la variable inspectée dans deux contextes indépendants. Le
 * contexte A est celui de la barre ; le contexte B se choisit ici, famille par
 * famille. Rien n'est modifié, ni les valeurs, ni le mode d'un calque.
 */
import { comparer, type Ecart } from '../../comparaison';
import { nomComplet } from '../../copie';
import type { Resultat } from '../../resolution';
import type { Application, Composant } from '../application';
import { selecteursDeContexte } from '../barre';
import { constatDeChaine, rendreChaine, rendreConstat } from '../chaine';
import { variablesAffichees } from '../etat';
import { TEXTES } from '../textes';
import { rendreResultat } from '../valeurs';
import { lienVersVariable, liste, note, titreDeVue } from './outils';

/** Le texte d'un écart, numéroté à partir de 1 pour le designer. */
export function texteDEcart(ecart: Ecart): string {
  switch (ecart.nature) {
    case 'identique':
      return TEXTES.ecart.identique;
    case 'cible-differente':
      return TEXTES.ecart['cible-differente'](ecart.rang + 1, ecart.modeAuRang === null ? null : ecart.modeAuRang + 1);
    case 'mode-different':
      return TEXTES.ecart['mode-different'](ecart.rang + 1);
    case 'valeur-differente':
      return TEXTES.ecart['valeur-differente'];
    case 'resolution-echouee':
      return TEXTES.ecart['resolution-echouee'];
  }
}

/** Le nombre de variables de la vue comparées au plus, pour garder la vue réactive. */
const COMPARAISONS_MAXIMALES = 2000;

export function creerVueComparer(app: Application): Composant {
  const element = document.createElement('div');
  element.className = 'vue';

  function carte(titre: string, resultat: Resultat, marque: number | null, contextes: HTMLElement[]): HTMLElement {
    const bloc = document.createElement('section');
    bloc.className = 'carte-comparee';
    const entete = document.createElement('h3');
    entete.className = 'surtitre';
    entete.textContent = titre;
    const choix = document.createElement('div');
    choix.className = 'contextes';
    choix.append(...contextes);
    const valeur = rendreResultat(resultat);
    valeur.classList.add('valeur-grande');
    bloc.append(entete, choix, valeur, rendreChaine(app, resultat, (cible) => app.suivre(cible), marque));
    const constat = constatDeChaine(app, resultat);
    if (constat) bloc.append(rendreConstat(constat));
    return bloc;
  }

  return {
    element,
    mettreAJour() {
      const { etat } = app;
      const { index } = etat;
      const variable = etat.position.inspectee;
      if (!index) {
        element.replaceChildren();
        return;
      }
      const parties: HTMLElement[] = [titreDeVue(TEXTES.comparerTitre)];
      if (!variable || !index.variables.has(variable)) {
        parties.push(note(TEXTES.choisirUnToken));
      } else {
        const a = app.resultat(variable);
        const b = app.resultatB(variable);
        const ecart = comparer(a, b);
        const rang = 'rang' in ecart ? ecart.rang : null;
        const nom = document.createElement('p');
        nom.className = 'code';
        nom.textContent = nomComplet(index, variable);
        const verdict = document.createElement('p');
        verdict.className = 'verdict';
        verdict.dataset.ecart = ecart.nature;
        const egalite = 'valeursEgales' in ecart && ecart.valeursEgales !== null ? ` ${ecart.valeursEgales ? TEXTES.ecart.valeursEgales : TEXTES.ecart.valeursDifferentes}` : '';
        verdict.textContent = `${texteDEcart(ecart)}${egalite}`;
        const grille = document.createElement('div');
        grille.className = 'grille-comparee';
        const lectureSeule = selecteursDeContexte(index, etat.contexte, 'A', (famille, mode) => app.changerContexte(famille, mode, 'A'));
        const choixB = selecteursDeContexte(index, etat.contexteB, 'B', (famille, mode) => app.changerContexte(famille, mode, 'B'));
        grille.append(carte(TEXTES.contexteA, a, rang, lectureSeule), carte(TEXTES.contexteB, b, rang, choixB));
        parties.push(nom, verdict, grille);
      }
      const affichees = variablesAffichees(etat, () => '').slice(0, COMPARAISONS_MAXIMALES);
      const differentes = affichees.filter((candidate) => comparer(app.resultat(candidate.id), app.resultatB(candidate.id)).nature !== 'identique');
      parties.push(note(differentes.length === 0 ? TEXTES.aucunEcartDansLaVue : TEXTES.ecartsDeLaVue(differentes.length, affichees.length)));
      if (differentes.length > 0) {
        parties.push(liste(differentes.slice(0, 100).map((candidate) => lienVersVariable(app, candidate.id, undefined, 'inspecter'))));
      }
      element.replaceChildren(...parties);
    },
  };
}

/**
 * L'onglet « À faire dans Figma » du mode Tokens : un constat par carte, sous l'intertitre de sa famille. Le liseré, l'icône et le mot de la
 * carte disent le type ; la phrase dit le problème, le lieu cite les variables, la ligne grise dit où le régler. Rien ne s'écrit d'ici :
 * le geste se fait dans la fenêtre Variables de Figma, et « Ouvrir la fiche » montre la variable dans l'explorateur.
 */
import { creerGravite, marquerDuTon } from 'ucm-plugin-socle/src/ui/Alerte';
import { createButton } from 'ucm-plugin-socle/src/ui/Button';
import { TEXTES } from '../textes';
import { creerCarte, creerIntertitre, poserLesMorceaux } from './carte';
import { GROUPES, type ConstatAFaire, type GroupeDeConstat } from './lecture';

const INTERTITRES: Readonly<Record<GroupeDeConstat, string>> = {
  alias: TEXTES.groupeAlias,
  modes: TEXTES.groupeModes,
  valeurs: TEXTES.groupeValeurs,
  couches: TEXTES.groupeCouches,
};

export interface AFaire {
  /** Montre les constats reçus ; `null` tant que le sandbox n'a pas répondu. */
  poser(constats: readonly ConstatAFaire[] | null): void;
}

function creerLeCorps(constat: ConstatAFaire, ouvrirLaFiche: (variable: { nom: string; cle: string | null }) => void): HTMLElement | null {
  const { faits, variable } = constat;
  if (faits.length === 0 && !variable) return null;
  const corps = document.createElement('div');
  if (faits.length > 0) {
    const liste = document.createElement('div');
    liste.className = 'constat-faits';
    for (const { etiquette, valeur } of faits) {
      const ligne = document.createElement('div');
      ligne.className = 'constat-fait';
      const nom = document.createElement('span');
      nom.textContent = etiquette;
      const contenu = document.createElement('span');
      poserLesMorceaux(contenu, valeur);
      ligne.append(nom, contenu);
      liste.append(ligne);
    }
    corps.append(liste);
  }
  if (variable) {
    const actions = document.createElement('div');
    actions.className = 'constat-actions';
    const bouton = createButton({ label: TEXTES.ouvrirLaFiche, variant: 'secondary', compact: true, onClick: () => ouvrirLaFiche(variable) });
    bouton.setAttribute('aria-label', TEXTES.ouvrirLaFicheDe(variable.nom));
    actions.append(bouton);
    corps.append(actions);
  }
  return corps;
}

export function monterAFaire(contenu: HTMLElement, ouvrirLaFiche: (variable: { nom: string; cle: string | null }) => void): AFaire {
  const liste = document.createElement('div');
  liste.className = 'structure-liste';
  const vide = document.createElement('p');
  vide.className = 'meta';
  vide.hidden = true;
  contenu.append(vide, liste);
  /** Les constats dépliés par le designer : un nouveau message ne les replie pas. */
  const deplies = new Set<string>();

  function creerLaCarte(constat: ConstatAFaire): HTMLElement {
    const entete = document.createElement('span');
    entete.className = 'constat-entete';
    const phrase = document.createElement('span');
    phrase.className = 'bloc-phrase';
    phrase.textContent = constat.phrase;
    entete.append(creerGravite(constat.type), phrase);
    const lieu = document.createElement('span');
    lieu.className = 'constat-lieu';
    poserLesMorceaux(lieu, constat.lieu);
    const meta: Node[] = [lieu];
    if (constat.statut !== null) {
      const statut = document.createElement('span');
      statut.className = 'constat-statut';
      statut.textContent = constat.statut;
      meta.push(document.createElement('br'), statut);
    }
    const { element } = creerCarte({
      tete: [entete],
      meta,
      corps: creerLeCorps(constat, ouvrirLaFiche),
      deplie: deplies.has(constat.id),
      auBasculement: (ouvert) => {
        if (ouvert) deplies.add(constat.id);
        else deplies.delete(constat.id);
      },
    });
    element.classList.add('bloc-constat');
    marquerDuTon(element, constat.type);
    return element;
  }

  return {
    poser(constats) {
      vide.hidden = constats === null || constats.length > 0;
      vide.textContent = vide.hidden ? '' : TEXTES.rienAFaireDansFigma;
      const enfants: HTMLElement[] = [];
      for (const groupe of GROUPES) {
        const duGroupe = (constats ?? []).filter((constat) => constat.groupe === groupe);
        if (duGroupe.length === 0) continue;
        enfants.push(creerIntertitre(INTERTITRES[groupe]), ...duGroupe.map(creerLaCarte));
      }
      liste.replaceChildren(...enfants);
    },
  };
}

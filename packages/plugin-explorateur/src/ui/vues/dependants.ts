/**
 * Dépendants : les variables qui pointent la variable inspectée, dans le
 * contexte courant, dans tous les modes chargés, puis indirectement. Le
 * relevé borne ce qui est trouvé : une variable d'un autre fichier n'y est pas.
 */
import { dependantsDirects, dependantsTransitifs } from '../../indexation';
import { modePour } from '../../resolution';
import type { Application, Composant } from '../application';
import { TEXTES } from '../textes';
import { lienVersVariable, liste, note, titreDeVue } from './outils';

const AFFICHES = 200;

function sousTitre(texte: string): HTMLHeadingElement {
  const titre = document.createElement('h3');
  titre.className = 'surtitre';
  titre.textContent = texte;
  return titre;
}

export function creerVueDependants(app: Application): Composant {
  const element = document.createElement('div');
  element.className = 'vue';
  return {
    element,
    mettreAJour() {
      const { index, position, contexte } = app.etat;
      const variable = position.inspectee;
      if (!index || !variable) {
        element.replaceChildren(titreDeVue(TEXTES.dependantsTitre), note(TEXTES.choisirUnToken));
        return;
      }
      const modes = new Set(index.releve.collections.map((collection) => modePour(index, collection, contexte).mode));
      const duContexte = dependantsDirects(index, variable, modes);
      const tous = dependantsDirects(index, variable);
      const transitifs = dependantsTransitifs(index, variable).filter((entree) => entree.distance > 1);
      const parties: HTMLElement[] = [titreDeVue(TEXTES.dependantsTitre), lienVersVariable(app, variable)];
      if (tous.length === 0) {
        parties.push(note(TEXTES.aucunDependant));
        element.replaceChildren(...parties);
        return;
      }
      parties.push(sousTitre(`${TEXTES.dependantsDuContexte} · ${duContexte.length}`), liste(duContexte.slice(0, AFFICHES).map((id) => lienVersVariable(app, id))));
      parties.push(sousTitre(`${TEXTES.dependantsTousModes} · ${tous.length}`), liste(tous.slice(0, AFFICHES).map((id) => lienVersVariable(app, id))));
      parties.push(sousTitre(`${TEXTES.dependantsTransitifs} · ${transitifs.length}`), liste(transitifs.slice(0, AFFICHES).map((entree) => {
        const ligne = document.createElement('span');
        ligne.className = 'ligne-de-lien';
        const distance = document.createElement('span');
        distance.className = 'note';
        distance.textContent = TEXTES.distance(entree.distance);
        ligne.append(lienVersVariable(app, entree.id), distance);
        return ligne;
      })));
      element.replaceChildren(...parties);
    },
  };
}

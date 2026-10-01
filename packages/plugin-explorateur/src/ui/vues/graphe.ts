/**
 * Graphe : la variable inspectée, ses cibles et ses dépendants en SVG, avec
 * une liste textuelle équivalente pour le clavier. Les branches se déploient
 * à la demande ; la chaîne du contexte actif est surlignée.
 */
import { grapheLocal, type GrapheLocal } from '../../graphe';
import type { Application, Composant } from '../application';
import { TEXTES } from '../textes';
import { nomDeCible } from '../valeurs';
import { boutonDiscret, note, titreDeVue } from './outils';

const LARGEUR_DE_NOEUD = 168;
const HAUTEUR_DE_NOEUD = 28;
const ECART_X = 64;
const ECART_Y = 12;
const SVG = 'http://www.w3.org/2000/svg';

export function creerVueGraphe(app: Application): Composant {
  const element = document.createElement('div');
  element.className = 'vue';
  const deployes = new Set<string>();
  let centreConnu: string | null = null;
  let echelle = 1;

  function dessiner(graphe: GrapheLocal): SVGSVGElement {
    const index = app.etat.index!;
    const colonnes = graphe.noeuds.map((noeud) => noeud.colonne);
    const minimum = Math.min(0, ...colonnes);
    const maximum = Math.max(0, ...colonnes);
    const hauteur = Math.max(1, ...graphe.noeuds.map((noeud) => noeud.ligne + 1));
    const largeurTotale = (maximum - minimum + 1) * (LARGEUR_DE_NOEUD + ECART_X);
    const hauteurTotale = hauteur * (HAUTEUR_DE_NOEUD + ECART_Y);
    const position = new Map(graphe.noeuds.map((noeud) => [noeud.id, { x: (noeud.colonne - minimum) * (LARGEUR_DE_NOEUD + ECART_X), y: noeud.ligne * (HAUTEUR_DE_NOEUD + ECART_Y) }]));
    const svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('class', 'graphe');
    svg.setAttribute('viewBox', `0 0 ${largeurTotale} ${hauteurTotale}`);
    svg.setAttribute('width', String(Math.round(largeurTotale * echelle)));
    svg.setAttribute('height', String(Math.round(hauteurTotale * echelle)));
    svg.setAttribute('aria-hidden', 'true');
    for (const arete of graphe.aretes) {
      const de = position.get(arete.de);
      const vers = position.get(arete.vers);
      if (!de || !vers) continue;
      const trait = document.createElementNS(SVG, 'path');
      trait.setAttribute('class', 'graphe-arete');
      if (arete.active) trait.classList.add('graphe-arete-active');
      const x1 = de.x + LARGEUR_DE_NOEUD;
      const y1 = de.y + HAUTEUR_DE_NOEUD / 2;
      const x2 = vers.x;
      const y2 = vers.y + HAUTEUR_DE_NOEUD / 2;
      trait.setAttribute('d', `M${x1} ${y1} C${x1 + ECART_X / 2} ${y1} ${x2 - ECART_X / 2} ${y2} ${x2} ${y2}`);
      svg.append(trait);
    }
    for (const noeud of graphe.noeuds) {
      const { x, y } = position.get(noeud.id)!;
      const groupe = document.createElementNS(SVG, 'g');
      groupe.setAttribute('class', 'graphe-noeud');
      if (noeud.colonne === 0) groupe.classList.add('graphe-centre');
      const cadre = document.createElementNS(SVG, 'rect');
      cadre.setAttribute('x', String(x));
      cadre.setAttribute('y', String(y));
      cadre.setAttribute('width', String(LARGEUR_DE_NOEUD));
      cadre.setAttribute('height', String(HAUTEUR_DE_NOEUD));
      cadre.setAttribute('rx', '6');
      const texte = document.createElementNS(SVG, 'text');
      texte.setAttribute('x', String(x + 8));
      texte.setAttribute('y', String(y + HAUTEUR_DE_NOEUD / 2 + 4));
      const nom = index.variables.get(noeud.id)?.nom ?? nomDeCible(index, noeud.id);
      texte.textContent = nom.length > 24 ? `…${nom.slice(-23)}` : nom;
      groupe.append(cadre, texte);
      groupe.addEventListener('click', () => app.inspecter(noeud.id));
      svg.append(groupe);
    }
    return svg;
  }

  function listeEquivalente(graphe: GrapheLocal): HTMLElement {
    const index = app.etat.index!;
    const liste = document.createElement('ul');
    liste.className = 'liens';
    const ordonnes = [...graphe.noeuds].sort((a, b) => a.colonne - b.colonne || a.ligne - b.ligne);
    for (const noeud of ordonnes) {
      const ligne = document.createElement('li');
      ligne.className = 'ligne-de-lien';
      const sens = document.createElement('span');
      sens.className = 'note';
      sens.textContent = noeud.colonne === 0 ? '●' : noeud.colonne > 0 ? `${TEXTES.grapheAncetres} ${noeud.colonne}` : `${TEXTES.grapheDependants} ${-noeud.colonne}`;
      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = 'lien';
      bouton.textContent = nomDeCible(index, noeud.id);
      bouton.dataset.chaine = noeud.id;
      bouton.dataset.mode = '';
      bouton.addEventListener('click', () => app.inspecter(noeud.id));
      ligne.append(sens, bouton);
      if (noeud.deployable) {
        const deployer = boutonDiscret(TEXTES.deployer(nomDeCible(index, noeud.id)), () => {
          deployes.add(noeud.id);
          app.rendre(['vue']);
        });
        ligne.append(deployer);
      }
      liste.append(ligne);
    }
    return liste;
  }

  return {
    element,
    mettreAJour() {
      const { index, position, contexte } = app.etat;
      const centre = position.inspectee;
      if (!index || !centre) {
        element.replaceChildren(titreDeVue(TEXTES.grapheTitre), note(TEXTES.choisirUnToken));
        return;
      }
      if (centre !== centreConnu) {
        deployes.clear();
        centreConnu = centre;
      }
      const graphe = grapheLocal(index, centre, contexte, deployes);
      const commandes = document.createElement('div');
      commandes.className = 'gestes';
      commandes.append(
        boutonDiscret(TEXTES.zoomMoins, () => {
          echelle = Math.max(0.4, echelle - 0.2);
          app.rendre(['vue']);
        }),
        boutonDiscret(TEXTES.zoomPlus, () => {
          echelle = Math.min(2, echelle + 0.2);
          app.rendre(['vue']);
        }),
        boutonDiscret(TEXTES.recentrer, () => {
          echelle = 1;
          deployes.clear();
          app.rendre(['vue']);
        }),
      );
      const cadre = document.createElement('div');
      cadre.className = 'graphe-cadre';
      cadre.append(dessiner(graphe));
      const titreListe = document.createElement('h3');
      titreListe.className = 'surtitre';
      titreListe.textContent = TEXTES.grapheListe;
      const parties: HTMLElement[] = [titreDeVue(TEXTES.grapheTitre), commandes, cadre];
      if (graphe.masques > 0) parties.push(note(TEXTES.grapheMasques(graphe.masques)));
      parties.push(titreListe, listeEquivalente(graphe));
      element.replaceChildren(...parties);
    },
  };
}


/**
 * L'onglet Corrections du panneau des constats : une carte par règle, sous
 * quatre intertitres, la case de chaque ligne, le pied qui compte ce qui est
 * coché, la ligne de réussite d'un lot écrit et le message du composant périmé.
 *
 * Appliquer n'envoie que les corrections cochées d'une carte visible. Le clic
 * sur une carte qui s'ouvre sélectionne ses layers dans Figma et dit « Sélectionnés dans Figma » ;
 * l'écran ne change jamais la sélection ailleurs. Ce que le designer a coché
 * ou ouvert vit ici et tombe quand une nouvelle analyse arrive.
 */
import { createButton } from 'ucm-plugin-socle/src/ui/Button';
import { creerColonnes, creerLigneDeDiff, creerResultat } from 'ucm-plugin-socle/src/ui/Changement';
import { creerCheminEnPhrase, creerSegmentAncien, creerSegmentNouveau, creerVariantEnPhrase } from 'ucm-plugin-socle/src/ui/Chemin';
import { creerRenommage } from 'ucm-plugin-socle/src/ui/Jeton';

import type { Constat } from '../../messages/commun';
import type { AnalyseRecue } from '../composant/analyse';
import { TEXTES } from '../textes';
import { creerCarte, creerIntertitre } from '../structure/carte';
import { cartesDeCorrections, SECTIONS, type CarteDeCorrections, type ContexteDeCartes, type LigneDeCarte, type Morceau } from './modele';

const T = TEXTES.correctionsDuComposant;

export interface OptionsDesCorrections {
  /** Envoie le lot : les identifiants cochés et le nombre de liaisons qu'il écrit. */
  readonly appliquer: (ids: readonly string[], liaisons: number) => void;
  /** Sélectionne ces layers dans Figma. */
  readonly selectionner: (layers: readonly string[]) => void;
  /** Range le choix de ne plus proposer ces corrections. */
  readonly ignorer: (constats: readonly Constat[]) => void;
  /** Appelée quand ce qui est coché change, pour que la vue Composant montre les liaisons à venir. */
  readonly auChangement: () => void;
}

export interface EntreeDesCorrections {
  readonly analyse: AnalyseRecue;
  readonly contexte: ContexteDeCartes;
}

/** Une liaison que la vue Composant montrera changée : le layer, le nom d'avant et celui d'après. */
export interface LiaisonAVenir {
  readonly calques: readonly string[];
  readonly avant: string;
  readonly apres: string;
}

export interface Corrections {
  /** Montre l'onglet pour cette analyse. */
  poser(entree: EntreeDesCorrections): void;
  /** Le nombre de cartes qui restent à appliquer. */
  nombre(): number;
  /** Les liaisons que les corrections cochées vont changer. */
  liaisonsAVenir(): readonly LiaisonAVenir[];
  /** Ouvre la carte qui change ces layers et sélectionne ses layers ; vrai quand une carte l'a fait. */
  ouvrirPourLesCalques(calques: readonly string[]): boolean;
}

/** Les morceaux de texte qui se suivent ne font qu'un nœud de texte : la ligne grise d'une carte se lit comme une phrase. */
function poserLesMorceaux(parent: Element | DocumentFragment, morceaux: readonly Morceau[]): void {
  let texte = '';
  const vider = (): void => {
    if (texte !== '') parent.append(texte);
    texte = '';
  };
  for (const morceau of morceaux) {
    if (typeof morceau === 'string') {
      texte += morceau;
      continue;
    }
    vider();
    if ('variant' in morceau) parent.append(creerVariantEnPhrase(morceau.variant));
    else if ('chemin' in morceau) parent.append(creerCheminEnPhrase(morceau.chemin));
    else {
      const marque = document.createElement('span');
      marque.className = 'constat-selection';
      marque.textContent = morceau.selection;
      parent.append(marque);
    }
  }
  vider();
}

/** Un chemin écrit en texte, dont les segments marqués prennent la couleur de leur colonne. */
function cheminAvecSegments(nom: string, marques: readonly number[], colonne: 'ancien' | 'nouveau'): Node[] {
  const noeuds: Node[] = [];
  let reste = '';
  nom.split('/').forEach((segment, rang) => {
    const devant = rang > 0 ? '/' : '';
    if (!marques.includes(rang)) {
      reste += `${devant}${segment}`;
      return;
    }
    if (`${reste}${devant}` !== '') noeuds.push(document.createTextNode(`${reste}${devant}`));
    reste = '';
    noeuds.push(colonne === 'ancien' ? creerSegmentAncien(segment) : creerSegmentNouveau(segment));
  });
  if (reste !== '') noeuds.push(document.createTextNode(reste));
  return noeuds;
}

const dans = (noeuds: Node[]): DocumentFragment => {
  const morceau = document.createDocumentFragment();
  morceau.append(...noeuds);
  return morceau;
};

const ecritLaLigne = (ligne: LigneDeCarte): boolean => ligne.correction.sorte === 'liaison' || ligne.correction.sorte === 'regles' || ligne.correction.sorte === 'nom-de-valeur';

export function monterLesCorrections(hote: HTMLElement, options: OptionsDesCorrections): Corrections {
  let entree: EntreeDesCorrections | null = null;
  let cartes: CarteDeCorrections[] = [];
  let identite = '';
  const decochees = new Set<string>();
  const ouvertes = new Map<string, boolean>();
  let cible: string | null = null;
  let derniereAVenir = '';

  const cochee = (ligne: LigneDeCarte): boolean => !decochees.has(ligne.id);
  const lignesCochees = (): LigneDeCarte[] => cartes.flatMap((carte) => carte.lignes.filter(cochee));
  const estOuverte = (carte: CarteDeCorrections, rang: number): boolean => ouvertes.get(carte.cle) ?? rang === 0;

  function pied(inactif: boolean): HTMLElement {
    const element = document.createElement('div');
    element.className = 'corrections-pied';
    const resume = document.createElement('span');
    resume.className = 'corrections-resume';
    const cochees = lignesCochees();
    if (cochees.length === 0) resume.textContent = T.aucuneCochee;
    else {
      const cartesCochees = cartes.filter((carte) => carte.lignes.some(cochee));
      const sorte = (ligne: LigneDeCarte): string => ligne.correction.sorte;
      const texte = cartesCochees.every((carte) => carte.modele)
        ? T.piedDeLaCopie(cochees.length)
        : T.pied(
          cartesCochees.length,
          new Set(cochees.filter((ligne) => sorte(ligne) === 'liaison').map((ligne) => ligne.correction.cible.layer)).size,
          cochees.filter((ligne) => sorte(ligne) === 'regles').length,
          cochees.filter((ligne) => sorte(ligne) === 'nom-de-valeur').length,
        );
      const gras = document.createElement('b');
      gras.textContent = texte.gras;
      resume.append(gras, texte.suite);
    }
    const appliquer = createButton({
      label: T.appliquer,
      disabled: inactif || cochees.length === 0,
      onClick: () => {
        const aEcrire = lignesCochees().filter(ecritLaLigne);
        options.appliquer(aEcrire.map((ligne) => ligne.id), aEcrire.filter((ligne) => ligne.correction.sorte === 'liaison').length);
      },
    });
    element.append(resume, appliquer);
    return element;
  }

  function faitsEtActions(carte: CarteDeCorrections): HTMLElement[] {
    const blocs: HTMLElement[] = [];
    if (carte.faits.length > 0) {
      const faits = document.createElement('div');
      faits.className = 'constat-faits';
      for (const { etiquette, valeur } of carte.faits) {
        const ligne = document.createElement('div');
        ligne.className = 'constat-fait';
        const nom = document.createElement('span');
        nom.textContent = etiquette;
        const contenu = document.createElement('span');
        contenu.textContent = valeur;
        ligne.append(nom, contenu);
        faits.append(ligne);
      }
      blocs.push(faits);
    }
    const actions = document.createElement('div');
    actions.className = 'constat-actions';
    const lien = document.createElement('button');
    lien.type = 'button';
    lien.className = 'btn-texte';
    lien.textContent = T.nePlusProposer(carte.layers.length);
    lien.addEventListener('click', () => options.ignorer(carte.constats));
    actions.append(lien);
    blocs.push(actions);
    return blocs;
  }

  function creerLaCarte(carte: CarteDeCorrections, rang: number, casesDeLignes: Map<string, HTMLInputElement>, casesDeCartes: Array<{ element: HTMLInputElement; ids: readonly string[] }>): HTMLElement {
    const corps = document.createElement('div');
    corps.append(creerColonnes(TEXTES.legendeAujourdhui, TEXTES.legendeApres));
    for (const ligne of carte.lignes) {
      const diff = creerLigneDeDiff(dans(cheminAvecSegments(ligne.avant, ligne.marquesAvant, 'ancien')), dans(cheminAvecSegments(ligne.apres, ligne.marquesApres, 'nouveau')), { coche: cochee(ligne) });
      const caseACocher = diff.querySelector('input') as HTMLInputElement;
      caseACocher.setAttribute('aria-label', TEXTES.caseDeCorrection(ligne.apres));
      caseACocher.addEventListener('change', () => {
        if (caseACocher.checked) decochees.delete(ligne.id);
        else decochees.add(ligne.id);
        rafraichir(casesDeLignes, casesDeCartes);
      });
      casesDeLignes.set(ligne.id, caseACocher);
      corps.append(diff);
    }
    const ciblee = cible === carte.cle;
    if (ciblee) corps.append(...faitsEtActions(carte));

    let tete: Node[];
    if (carte.jetons) tete = creerRenommage(carte.jetons[0], carte.jetons[1]);
    else {
      const phrase = document.createElement('span');
      phrase.className = 'bloc-phrase';
      poserLesMorceaux(phrase, carte.phrase);
      tete = [phrase];
    }
    const meta: Node[] = [];
    const morceauxDeLaMeta: Morceau[] = ciblee ? [...carte.meta, '. ', { selection: T.ciblee }] : [...carte.meta];
    const conteneur = document.createDocumentFragment();
    poserLesMorceaux(conteneur, morceauxDeLaMeta);
    meta.push(...Array.from(conteneur.childNodes));

    const ids = carte.lignes.map((ligne) => ligne.id);
    const caseDeCarte = document.createElement('input');
    caseDeCarte.type = 'checkbox';
    caseDeCarte.className = 'case';
    caseDeCarte.setAttribute('aria-label', TEXTES.caseDeCarte(carte.lignes[0].apres));
    caseDeCarte.addEventListener('change', () => {
      for (const id of ids) {
        if (caseDeCarte.checked) decochees.delete(id);
        else decochees.add(id);
      }
      rafraichir(casesDeLignes, casesDeCartes);
    });
    casesDeCartes.push({ element: caseDeCarte, ids });
    return creerCarte({
      tete,
      meta,
      caseACocher: caseDeCarte,
      corps,
      deplie: estOuverte(carte, rang),
      auBasculement: (ouvert) => {
        ouvertes.set(carte.cle, ouvert);
        if (ouvert) {
          cible = carte.cle;
          if (carte.layers.length > 0) options.selectionner(carte.layers);
        }
        rendre();
      },
    }).element;
  }

  /** Reflète les cases dans les lignes et les cartes, puis recompte le pied. */
  function rafraichir(casesDeLignes: Map<string, HTMLInputElement>, casesDeCartes: Array<{ element: HTMLInputElement; ids: readonly string[] }>): void {
    for (const [id, caseACocher] of casesDeLignes) caseACocher.checked = !decochees.has(id);
    for (const { element, ids } of casesDeCartes) {
      const nombre = ids.filter((id) => !decochees.has(id)).length;
      element.checked = nombre === ids.length;
      element.indeterminate = nombre > 0 && nombre < ids.length;
    }
    const ancien = hote.querySelector('.corrections-pied');
    ancien?.replaceWith(pied(false));
    annoncerLaVue();
  }

  function annoncerLaVue(): void {
    const cle = JSON.stringify(liaisonsAVenir());
    if (cle === derniereAVenir) return;
    derniereAVenir = cle;
    options.auChangement();
  }

  function liaisonsAVenir(): LiaisonAVenir[] {
    if (!entree || entree.analyse.perimee || entree.analyse.ecriture !== null) return [];
    return lignesCochees().flatMap((ligne) => {
      const { correction } = ligne;
      return correction.sorte === 'liaison' && correction.avant !== null && correction.cible.layer !== undefined ? [{ calques: [correction.cible.layer], avant: correction.avant, apres: correction.apres.nom }] : [];
    });
  }

  function note(texte: string): HTMLElement {
    const element = document.createElement('p');
    element.className = 'meta';
    element.textContent = texte;
    return element;
  }

  function rendre(): void {
    if (!entree) return;
    const { analyse } = entree;
    if (analyse.ecriture !== null) {
      hote.replaceChildren(note(analyse.ecriture.liaisons > 0 ? T.ecritureEnCours(analyse.ecriture.liaisons) : T.ecritureSansLiaison), pied(true));
      return;
    }
    if (analyse.perimee) {
      hote.replaceChildren(analyse.lot ? creerResultat(analyse.lot.resume, analyse.lot.ecrites > 0 ? T.ctrlZ : undefined) : note(TEXTES.panneauDesConstats.perimeMeta));
      return;
    }
    if (cartes.length === 0) {
      hote.replaceChildren(note(T.aucuneCorrection));
      return;
    }
    const casesDeLignes = new Map<string, HTMLInputElement>();
    const casesDeCartes: Array<{ element: HTMLInputElement; ids: readonly string[] }> = [];
    const liste = document.createElement('div');
    liste.className = 'liste';
    for (const section of SECTIONS) {
      const deLaSection = cartes.filter((carte) => carte.section === section);
      if (deLaSection.length === 0) continue;
      liste.append(creerIntertitre(T.intertitres[section]), ...deLaSection.map((carte) => creerLaCarte(carte, cartes.indexOf(carte), casesDeLignes, casesDeCartes)));
    }
    liste.append(pied(false));
    const pile = document.createElement('div');
    pile.className = 'page-stack';
    pile.append(liste);
    hote.replaceChildren(pile);
    rafraichir(casesDeLignes, casesDeCartes);
  }

  return {
    poser(suivante) {
      const nouvelle = `${suivante.analyse.identite.sujet}:${suivante.analyse.identite.generation}`;
      if (nouvelle !== identite) {
        identite = nouvelle;
        decochees.clear();
        ouvertes.clear();
        cible = null;
      }
      entree = suivante;
      const { analyse, contexte } = suivante;
      const restantes = analyse.constats.map((constat) => (constat.correction && analyse.appliquees.includes(constat.correction.id) ? { ...constat, correction: undefined } : constat));
      cartes = cartesDeCorrections(restantes, { ...contexte, constats: analyse.constats });
      rendre();
      annoncerLaVue();
    },
    nombre: () => cartes.length,
    liaisonsAVenir,
    ouvrirPourLesCalques(calques) {
      const carte = cartes.find((candidate) => candidate.lignes.some((ligne) => ligne.correction.cible.layer !== undefined && calques.includes(ligne.correction.cible.layer)));
      if (!carte) return false;
      ouvertes.set(carte.cle, true);
      cible = carte.cle;
      if (carte.layers.length > 0) options.selectionner(carte.layers);
      rendre();
      return true;
    },
  };
}

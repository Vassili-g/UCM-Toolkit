/**
 * La table des variables : nom, type, puis une colonne par mode de la
 * collection affichée. Chaque cellule montre la valeur rangée ou l'alias
 * direct, puis le résultat. Les autres collections traversées suivent le
 * contexte de la barre. La vue compacte et la recherche n'ont qu'une colonne,
 * celle du contexte actif.
 *
 * Les lignes sont virtualisées : une table de dix mille variables ne monte
 * que les lignes visibles.
 */
import { texteDeValeur, TYPES_DE_VARIABLE, type CollectionRelevee, type VariableRelevee } from '../modele';
import { valeurPourLeMode } from '../resolution';
import type { Application, Composant } from './application';
import { FILTRES_PAR_DEFAUT, variablesAffichees, type Filtres } from './etat';
import { TEXTES } from './textes';
import { nomDeCible, rendreResultat, rendreSource } from './valeurs';
import { creerListeVirtuelle } from './virtualisation';

export const HAUTEUR_DE_LIGNE = 44;

/** Les largeurs de colonne, en pixels : nom, type, puis chaque valeur. */
const LARGEUR_DU_NOM = 220;
const LARGEUR_DU_TYPE = 72;
const LARGEUR_D_UNE_VALEUR = 190;

function choixDeFiltre<C extends string>(etiquette: string, valeurs: ReadonlyArray<[C, string]>, actuel: C, changer: (valeur: C) => void): HTMLLabelElement {
  const champ = document.createElement('label');
  champ.className = 'filtre';
  const nom = document.createElement('span');
  nom.className = 'filtre-nom';
  nom.textContent = etiquette;
  const choix = document.createElement('select');
  choix.className = 'choix';
  for (const [valeur, libelle] of valeurs) {
    const option = document.createElement('option');
    option.value = valeur;
    option.textContent = libelle;
    option.selected = valeur === actuel;
    choix.append(option);
  }
  choix.addEventListener('change', () => changer(choix.value as C));
  champ.append(nom, choix);
  return champ;
}

export function creerTable(app: Application): Composant & { montrer(variable: string): void; defilement(): number; rendues(): number } {
  const element = document.createElement('section');
  element.className = 'table';

  const tete = document.createElement('div');
  tete.className = 'table-tete';
  const emplacement = document.createElement('p');
  emplacement.className = 'emplacement';
  const titre = document.createElement('h2');
  titre.className = 'table-titre';
  const resume = document.createElement('p');
  resume.className = 'note';
  tete.append(emplacement, titre, resume);

  const filtres = document.createElement('div');
  filtres.className = 'filtres';
  filtres.setAttribute('role', 'group');
  filtres.setAttribute('aria-label', TEXTES.filtres);

  const entete = document.createElement('div');
  entete.className = 'table-entete';
  entete.setAttribute('role', 'row');
  const liste = creerListeVirtuelle(HAUTEUR_DE_LIGNE, 'table', entete);
  liste.element.classList.add('table-corps');
  liste.element.setAttribute('aria-label', TEXTES.onglets.table);

  const vide = document.createElement('div');
  vide.className = 'vide';

  element.append(tete, filtres, liste.element, vide);

  let lignes: VariableRelevee[] = [];
  let modes: CollectionRelevee['modes'] = [];
  let cleDeVue = '';

  const valeurCherchee = (id: string): string => {
    const resultat = app.resultat(id);
    return resultat.statut === 'resolu' ? texteDeValeur(resultat.valeur) : '';
  };

  function cellule(texte: string): HTMLDivElement {
    const element = document.createElement('div');
    element.className = 'cellule-entete';
    element.setAttribute('role', 'columnheader');
    element.textContent = texte;
    return element;
  }

  function celluleDeValeur(variable: VariableRelevee, mode: string | null): HTMLDivElement {
    const { index } = app.etat;
    const contenu = document.createElement('div');
    contenu.className = 'cellule-valeur';
    contenu.setAttribute('role', 'cell');
    if (!index) return contenu;
    const resultat = app.resultat(variable.id, mode);
    const premiere = resultat.etapes[0];
    const source = mode ? valeurPourLeMode(index, variable.id, variable.collection, mode)?.valeur : premiere?.source;
    const haut = document.createElement('div');
    haut.className = 'cellule-source';
    if (source) haut.append(rendreSource(index, source, (cible) => app.suivre(cible), { variable: variable.id, mode: mode ?? '' }));
    const bas = document.createElement('div');
    bas.className = 'cellule-resultat';
    bas.dataset.chaine = variable.id;
    bas.dataset.mode = mode ?? '';
    bas.tabIndex = -1;
    bas.append(rendreResultat(resultat));
    contenu.append(haut, bas);
    return contenu;
  }

  function rendreLigne(rang: number): HTMLElement {
    const variable = lignes[rang];
    const { etat } = app;
    const rangee = document.createElement('div');
    rangee.className = 'table-ligne';
    rangee.setAttribute('role', 'row');
    rangee.classList.toggle('ligne-choisie', etat.position.inspectee === variable.id);
    const nom = document.createElement('div');
    nom.className = 'cellule-nom';
    nom.setAttribute('role', 'rowheader');
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'nom-de-token';
    bouton.dataset.focus = `nom:${variable.id}`;
    bouton.dataset.chaine = variable.id;
    bouton.dataset.mode = '';
    bouton.textContent = etat.position.recherche ? variable.nom : variable.nom.slice(etat.position.groupe.join('/').length + (etat.position.groupe.length ? 1 : 0));
    bouton.setAttribute('aria-label', TEXTES.ouvrir(nomDeCible(etat.index!, variable.id)));
    bouton.addEventListener('click', () => app.inspecter(variable.id));
    nom.append(bouton);
    if (etat.position.recherche) {
      const collection = document.createElement('span');
      collection.className = 'note';
      collection.textContent = etat.index?.collections.get(variable.collection)?.nom ?? '';
      nom.append(collection);
    }
    const type = document.createElement('div');
    type.className = 'cellule-type';
    type.setAttribute('role', 'cell');
    type.textContent = TEXTES.types[variable.type];
    rangee.append(nom, type);
    if (modes.length === 0) rangee.append(celluleDeValeur(variable, null));
    else for (const mode of modes) rangee.append(celluleDeValeur(variable, mode.id));
    return rangee;
  }

  function poserFiltres(): void {
    const { etat } = app;
    const actuels: Filtres = etat.position.filtres;
    const changer = (partiel: Partial<Filtres>) => app.filtrer(partiel);
    const type = choixDeFiltre<Filtres['type']>(TEXTES.filtreType, [['tous', TEXTES.tous], ...TYPES_DE_VARIABLE.map((valeur) => [valeur, TEXTES.types[valeur]] as [Filtres['type'], string])], actuels.type, (valeur) => changer({ type: valeur }));
    const nature = choixDeFiltre<Filtres['nature']>(TEXTES.filtreNature, [['toutes', TEXTES.natures.toutes], ['alias', TEXTES.natures.alias], ['directe', TEXTES.natures.directe]], actuels.nature, (valeur) => changer({ nature: valeur }));
    const provenance = choixDeFiltre<Filtres['provenance']>(TEXTES.filtreProvenance, [['toutes', TEXTES.provenances.toutes], ['locale', TEXTES.provenances.locale], ['distante', TEXTES.provenances.distante]], actuels.provenance, (valeur) => changer({ provenance: valeur }));
    const elements: HTMLElement[] = [type, nature, provenance];
    if (etat.concernees) {
      const champ = document.createElement('label');
      champ.className = 'filtre';
      const case_ = document.createElement('input');
      case_.type = 'checkbox';
      case_.checked = actuels.concernees;
      case_.addEventListener('change', () => changer({ concernees: case_.checked }));
      const texte = document.createElement('span');
      texte.textContent = TEXTES.filtreConcernees;
      champ.append(case_, texte);
      elements.push(champ);
    }
    const compacte = document.createElement('label');
    compacte.className = 'filtre';
    const caseCompacte = document.createElement('input');
    caseCompacte.type = 'checkbox';
    caseCompacte.checked = etat.preferences.vueCompacte;
    caseCompacte.title = TEXTES.vueCompacteAide;
    caseCompacte.addEventListener('change', () => {
      app.rangerPreferences({ ...app.etat.preferences, vueCompacte: caseCompacte.checked });
      app.rendre(['table']);
    });
    const texteCompacte = document.createElement('span');
    texteCompacte.textContent = TEXTES.vueCompacte;
    compacte.append(caseCompacte, texteCompacte);
    elements.push(compacte);
    filtres.replaceChildren(...elements);
  }

  return {
    element,
    mettreAJour() {
      const { etat } = app;
      element.hidden = etat.onglet !== 'table';
      if (!etat.index) {
        tete.hidden = true;
        filtres.hidden = true;
        liste.element.hidden = true;
        vide.hidden = true;
        return;
      }
      tete.hidden = false;
      filtres.hidden = false;
      const { index, position } = etat;
      const collection = position.collection ? index.collections.get(position.collection) : undefined;
      const recherche = position.recherche.trim() !== '';
      lignes = variablesAffichees(etat, valeurCherchee);
      modes = recherche || etat.preferences.vueCompacte || !collection ? [] : collection.modes;

      emplacement.textContent = recherche ? TEXTES.rechercheEtiquette : [collection?.nom ?? '', ...position.groupe.map((segment) => segment || TEXTES.segmentVide)].join(' / ');
      titre.textContent = recherche ? TEXTES.resultatsDeRecherche : (position.groupe[position.groupe.length - 1] ?? collection?.nom ?? '') || TEXTES.segmentVide;
      resume.textContent = recherche ? TEXTES.rechercheGlobale(lignes.length) : `${TEXTES.compte(lignes.length)}. ${TEXTES.autresCollections}`;
      poserFiltres();

      const colonnes = [`${LARGEUR_DU_NOM}px`, `${LARGEUR_DU_TYPE}px`, ...(modes.length === 0 ? [`minmax(${LARGEUR_D_UNE_VALEUR}px, 1fr)`] : modes.map(() => `minmax(${LARGEUR_D_UNE_VALEUR}px, 1fr)`))];
      liste.element.style.setProperty('--colonnes', colonnes.join(' '));
      liste.element.style.setProperty('--largeur-minimale', `${LARGEUR_DU_NOM + LARGEUR_DU_TYPE + Math.max(1, modes.length) * LARGEUR_D_UNE_VALEUR}px`);
      entete.replaceChildren(
        cellule(TEXTES.colonneNom),
        cellule(TEXTES.colonneType),
        ...(modes.length === 0 ? [cellule(TEXTES.colonneContexte)] : modes.map((mode) => cellule(mode.id === collection?.modeParDefaut ? TEXTES.defautDeFamille(mode.nom) : mode.nom))),
      );

      const cle = JSON.stringify([position.collection, position.groupe, position.recherche, position.filtres, modes.length, etat.preferences.vueCompacte, etat.releve?.revision]);
      const memeVue = cle === cleDeVue;
      cleDeVue = cle;
      liste.element.hidden = lignes.length === 0;
      vide.hidden = lignes.length > 0;
      vide.textContent = recherche || JSON.stringify(position.filtres) !== JSON.stringify(FILTRES_PAR_DEFAUT) ? TEXTES.aucunResultat : TEXTES.aucuneVariableIci;
      liste.poser(lignes.length, rendreLigne, memeVue);
      if (!memeVue && position.defilement > 0) liste.defiler(position.defilement);
    },
    montrer(variable) {
      const rang = lignes.findIndex((ligne) => ligne.id === variable);
      if (rang < 0) return;
      liste.montrer(rang);
      liste.element.querySelector<HTMLElement>(`[data-focus="${CSS.escape(`nom:${variable}`)}"]`)?.focus({ preventScroll: true });
    },
    defilement: () => liste.defilement(),
    rendues: () => liste.rendues(),
  };
}


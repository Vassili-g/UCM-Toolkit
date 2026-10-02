/**
 * La table des variables : nom, type, puis une colonne par mode de la
 * collection affichée. Chaque cellule montre sur une ligne la valeur rangée,
 * ou l'alias direct suivi de ce qu'il rend. Les autres collections traversées
 * suivent le contexte actif. La vue compacte et la recherche n'ont
 * qu'une colonne, celle du contexte actif.
 *
 * Chaque colonne se règle par la poignée de son en-tête. Les largeurs du nom
 * et du type se rangent dans les préférences. Celle d'une colonne de valeur
 * vaut jusqu'à la fermeture du plugin : un identifiant de mode se répète d'un
 * fichier à l'autre.
 *
 * Les lignes sont virtualisées : une table de dix mille variables ne monte
 * que les lignes visibles.
 *
 * `tete` nomme le groupe ouvert. L'entrée la place au-dessus des onglets :
 * elle se lit dans chaque vue, et se met à jour même quand la table est cachée.
 */
import { texteDeValeur, TYPES_DE_VARIABLE, type CollectionRelevee, type VariableRelevee } from '../modele';
import { valeurPourLeMode } from '../resolution';
import type { Application, Composant } from './application';
import { FILTRES_PAR_DEFAUT, variablesAffichees, type Filtres } from './etat';
import { creerPoignee } from './poignee';
import { TEXTES } from './textes';
import { nomDeCible, rendreValeurResolue } from './valeurs';
import { creerListeVirtuelle } from './virtualisation';

export const HAUTEUR_DE_LIGNE = 40;

/**
 * Les largeurs de colonne, en pixels : défaut, puis bornes du réglage. Une
 * colonne de valeur non réglée part de son défaut et partage la place libre.
 */
const COLONNES = {
  nom: { defaut: 240, min: 120, max: 640 },
  type: { defaut: 84, min: 60, max: 200 },
  valeur: { defaut: 220, min: 120, max: 800 },
} as const;

/** La clé de la colonne unique de la vue compacte et de la recherche. */
const COLONNE_DU_CONTEXTE = 'contexte';

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

export function creerTable(app: Application): Composant & { readonly tete: HTMLElement; montrer(variable: string): void; rendues(): number } {
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

  element.append(filtres, liste.element, vide);

  let lignes: VariableRelevee[] = [];
  let modes: CollectionRelevee['modes'] = [];
  let cleDeVue = '';
  /** Les colonnes de valeur affichées, par clé, et les largeurs réglées depuis l'ouverture. */
  let colonnesDeValeur: string[] = [];
  const largeursDeValeur = new Map<string, number>();
  /** La largeur du nom ou du type pendant un geste, avant son rangement. */
  const enCours: { nom?: number; type?: number } = {};

  const borner = (colonne: keyof typeof COLONNES, largeur: number): number => Math.max(COLONNES[colonne].min, Math.min(COLONNES[colonne].max, largeur));
  const largeurFixe = (colonne: 'nom' | 'type'): number => borner(colonne, enCours[colonne] ?? app.etat.preferences.largeurs[colonne] ?? COLONNES[colonne].defaut);

  function poserColonnes(): void {
    const valeurs = colonnesDeValeur.map((cle) => largeursDeValeur.get(cle));
    const colonnes = [`${largeurFixe('nom')}px`, `${largeurFixe('type')}px`, ...valeurs.map((largeur) => (largeur === undefined ? `minmax(${COLONNES.valeur.defaut}px, 1fr)` : `${largeur}px`))];
    liste.element.style.setProperty('--colonnes', colonnes.join(' '));
    liste.element.style.setProperty('--largeur-minimale', `${largeurFixe('nom') + largeurFixe('type') + valeurs.reduce<number>((somme, largeur) => somme + (largeur ?? COLONNES.valeur.defaut), 0)}px`);
  }

  function rangerLargeur(colonne: 'nom' | 'type', largeur: number | undefined): void {
    const { [colonne]: _retiree, ...autres } = app.etat.preferences.largeurs;
    delete enCours[colonne];
    app.rangerPreferences({ ...app.etat.preferences, largeurs: largeur === undefined ? autres : { ...autres, [colonne]: largeur } });
    poserColonnes();
  }

  const valeurCherchee = (id: string): string => {
    const resultat = app.resultat(id);
    return resultat.statut === 'resolu' ? texteDeValeur(resultat.valeur) : '';
  };

  /** L'en-tête d'une colonne et sa poignée. `cle` désigne une colonne de valeur ; sans elle, `colonne` est le nom ou le type. */
  function cellule(texte: string, colonne: keyof typeof COLONNES, cle?: string): HTMLDivElement {
    const element = document.createElement('div');
    element.className = 'cellule-entete';
    element.setAttribute('role', 'columnheader');
    const libelle = document.createElement('span');
    libelle.className = 'cellule-entete-nom';
    libelle.textContent = texte;
    const poignee = creerPoignee({
      etiquette: TEXTES.largeurDe(texte),
      infobulle: TEXTES.largeurAide,
      min: COLONNES[colonne].min,
      max: COLONNES[colonne].max,
      lire: () => element.getBoundingClientRect().width,
      poser(largeur, fin) {
        if (cle !== undefined) largeursDeValeur.set(cle, largeur);
        else if (colonne !== 'valeur' && fin) return rangerLargeur(colonne, largeur);
        else if (colonne !== 'valeur') enCours[colonne] = largeur;
        poserColonnes();
      },
      retablir() {
        if (cle !== undefined) largeursDeValeur.delete(cle);
        else if (colonne !== 'valeur') return rangerLargeur(colonne, undefined);
        poserColonnes();
      },
    });
    element.append(libelle, poignee);
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
    contenu.append(rendreValeurResolue(index, source, resultat, (cible) => app.suivre(cible), { variable: variable.id, mode: mode ?? '' }));
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
    const nomAffiche = etat.position.recherche ? variable.nom : variable.nom.slice(etat.position.groupe.join('/').length + (etat.position.groupe.length ? 1 : 0));
    const debutDuNom = nomAffiche.lastIndexOf('/') + 1;
    const chemin = document.createElement('span');
    chemin.className = 'nom-de-token-chemin';
    chemin.textContent = nomAffiche.slice(0, debutDuNom);
    bouton.append(chemin, document.createTextNode(nomAffiche.slice(debutDuNom)));
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
    tete,
    mettreAJour() {
      const { etat } = app;
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
      if (etat.onglet !== 'table') return;
      poserFiltres();

      colonnesDeValeur = modes.length === 0 ? [COLONNE_DU_CONTEXTE] : modes.map((mode) => `${collection?.id}:${mode.id}`);
      poserColonnes();
      entete.replaceChildren(
        cellule(TEXTES.colonneNom, 'nom'),
        cellule(TEXTES.colonneType, 'type'),
        ...(modes.length === 0
          ? [cellule(TEXTES.colonneContexte, 'valeur', COLONNE_DU_CONTEXTE)]
          : modes.map((mode, rang) => cellule(mode.id === collection?.modeParDefaut ? TEXTES.defautDeFamille(mode.nom) : mode.nom, 'valeur', colonnesDeValeur[rang]))),
      );

      const cle = JSON.stringify([position.collection, position.groupe, position.recherche, position.filtres, modes.length, etat.preferences.vueCompacte, etat.releve?.revision]);
      const memeVue = cle === cleDeVue;
      cleDeVue = cle;
      liste.element.hidden = lignes.length === 0;
      vide.hidden = lignes.length > 0;
      vide.textContent = recherche || JSON.stringify(position.filtres) !== JSON.stringify(FILTRES_PAR_DEFAUT) ? TEXTES.aucunResultat : TEXTES.aucuneVariableIci;
      liste.poser(lignes.length, rendreLigne, memeVue);
    },
    montrer(variable) {
      const rang = lignes.findIndex((ligne) => ligne.id === variable);
      if (rang < 0) return;
      liste.montrer(rang);
      liste.element.querySelector<HTMLElement>(`[data-focus="${CSS.escape(`nom:${variable}`)}"]`)?.focus({ preventScroll: true });
    },
    rendues: () => liste.rendues(),
  };
}

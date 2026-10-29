/**
 * Les corrections du panneau des constats : la carte de chaque règle, avec sa case par ligne et son bouton Appliquer, le pied qui
 * compte ce qui est coché, la ligne de réussite d'un lot écrit et le message du composant périmé. Le panneau range les cartes dans
 * les sections ; ce module les dessine et garde ce que le designer a coché ou ouvert.
 *
 * Appliquer, sur une carte, n'envoie que les lignes cochées de cette carte. « Appliquer tout », dans le pied, envoie toutes les lignes
 * cochées, de toutes les cartes du panneau, qu'une section les montre ou non. Ouvrir une carte ne change pas la sélection de Figma : le
 * bouton Sélectionner, dans le corps déplié d'une carte qui vise des layers, la change, et l'écran ne la change jamais ailleurs. Ce que
 * le designer a coché ou ouvert tombe quand une nouvelle analyse arrive.
 */
import { createButton } from 'ucm-plugin-socle/src/ui/Button';
import { creerAlerte } from 'ucm-plugin-socle/src/ui/Alerte';
import { creerColonnes, creerLigneDeDiff, creerResultat } from 'ucm-plugin-socle/src/ui/Changement';
import { creerCheminEnPhrase, creerSegmentAncien, creerSegmentNouveau, creerVariantEnPhrase } from 'ucm-plugin-socle/src/ui/Chemin';
import { creerRenommage } from 'ucm-plugin-socle/src/ui/Jeton';

import type { Constat } from '../../messages/commun';
import { analyseApplicable, type AnalyseRecue } from '../composant/analyse';
import { creerPuces, pairesDuNom, type VariantDuJeu } from '../composant/variants';
import { TEXTES } from '../textes';
import { TEXTES_PREPARATION } from '../textes/preparation';
import { creerBoutonSelectionner, creerCarte } from '../structure/carte';
import { variablesNonPublieesDeLaListe } from './liaisons';
import type { CarteDeCorrections, ContexteDeCartes, GroupeDeTaille, LigneDeCarte, LigneEnAttente, Morceau } from './modele';

const T = TEXTES.correctionsDuComposant;

export interface OptionsDesCorrections {
  /** Envoie le lot : les identifiants cochés et le nombre de liaisons qu'il écrit. */
  readonly appliquer: (ids: readonly string[], liaisons: number) => void;
  /** Sélectionne ces layers dans Figma. */
  readonly selectionner: (layers: readonly string[]) => void;
  /** Les layers que le plugin a sélectionnés depuis le dernier changement de sélection de Figma ; aucun par défaut. */
  readonly selectionnes?: () => readonly string[];
  /** Range le choix de ne plus proposer ces corrections. */
  readonly ignorer: (constats: readonly Constat[]) => void;
  /** Appelée quand ce qui est coché change, pour que la vue Composant montre les liaisons à venir. */
  readonly auChangement: () => void;
  /** Appelée quand une carte s'ouvre ou se ferme : le panneau se redessine. */
  readonly redessiner: () => void;
}

export interface EntreeDesCorrections {
  readonly analyse: AnalyseRecue;
  readonly contexte: ContexteDeCartes;
  /** Toutes les cartes du panneau, visibles ou non, dans l'ordre où le panneau les range : la première s'ouvre d'elle-même. */
  readonly cartes: readonly CarteDeCorrections[];
}

/** Ce que la vue montre des cartes cochées quand un seul élément est choisi : ses cartes et son libellé. */
export interface PartVisible {
  readonly cartes: readonly CarteDeCorrections[];
  readonly element: string;
}

/** Une liaison que la vue Composant montrera changée : le layer, le nom d'avant et celui d'après. */
export interface LiaisonAVenir {
  readonly calques: readonly string[];
  readonly avant: string;
  readonly apres: string;
}

export interface Corrections {
  /** Retient les cartes de cette analyse. */
  poser(entree: EntreeDesCorrections): void;
  /** À appeler avant de dessiner : les cases d'un dessin précédent ne comptent plus. */
  commencer(): void;
  /** Dessine ces cartes. */
  cartes(cartes: readonly CarteDeCorrections[]): HTMLElement[];
  /** Le pied : le résumé de ce qui est coché dans tout le panneau, et « Appliquer tout ». `visible` dit la part que la vue montre, quand elle n'est pas entière. */
  pied(visible: PartVisible | null, inactif?: boolean): HTMLElement;
  /** Les liaisons que les corrections cochées vont changer. */
  liaisonsAVenir(): readonly LiaisonAVenir[];
  /** Ouvre la carte qui change ces layers ; rend la carte, ou `null` quand aucune ne les change. Le panneau se redessine ensuite. */
  ouvrirPourLesCalques(calques: readonly string[]): CarteDeCorrections | null;
}

/** La ligne de réussite du lot écrit, ou la note du composant périmé. */
export function resultatApresPeremption(analyse: AnalyseRecue): HTMLElement {
  if (analyse.lot) return creerResultat(analyse.lot.resume, analyse.lot.ecrites > 0 ? T.ctrlZ : undefined);
  const element = document.createElement('p');
  element.className = 'meta';
  element.textContent = TEXTES.panneauDesConstats.perimeMeta;
  return element;
}

/** Le message de l'écriture en cours. */
export function noteDeLEcriture(analyse: AnalyseRecue): HTMLElement {
  const element = document.createElement('p');
  element.className = 'meta';
  element.textContent = analyse.ecriture !== null && analyse.ecriture.liaisons > 0 ? T.ecritureEnCours(analyse.ecriture.liaisons) : T.ecritureSansLiaison;
  return element;
}

/** Les morceaux de texte qui se suivent ne font qu'un nœud de texte : la ligne grise d'une carte se lit comme une phrase. */
function poserLesMorceaux(parent: Element | DocumentFragment, morceaux: readonly Morceau[], jeu: readonly VariantDuJeu[]): void {
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
    if ('puces' in morceau) parent.append(creerPuces(morceau.puces, jeu));
    else if ('variant' in morceau) parent.append(creerVariantEnPhrase(morceau.variant));
    else parent.append(creerCheminEnPhrase(morceau.chemin));
  }
  vider();
}

/** La phrase d'une carte en texte brut, pour le nom accessible de ses boutons. */
function texteDeLaPhrase(morceaux: readonly Morceau[]): string {
  return morceaux.map((morceau) => (typeof morceau === 'string' ? morceau : 'variant' in morceau ? morceau.variant : 'chemin' in morceau ? morceau.chemin : '')).join('');
}

/** Un chemin écrit en texte, dont les segments marqués prennent la couleur de leur colonne. */
function cheminAvecSegments(nom: string, marques: readonly number[], colonne: 'ancien' | 'nouveau', langage = false): Node[] {
  if (langage) {
    const ajouts = marques.map((rang) => nom.split('/')[rang]);
    return Array.from(creerCheminEnPhrase(nom, { ajouts }).childNodes);
  }
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

export function monterLesCorrections(options: OptionsDesCorrections): Corrections {
  let entree: EntreeDesCorrections | null = null;
  let identite = '';
  const decochees = new Set<string>();
  const ouvertes = new Map<string, boolean>();
  let cible: string | null = null;
  let derniereAVenir = '';
  let casesDeLignes = new Map<string, HTMLInputElement>();
  let casesDeCartes: Array<{ element: HTMLInputElement; ids: readonly string[] }> = [];
  let boutonsDeCartes: Array<{ element: HTMLButtonElement; carte: CarteDeCorrections }> = [];
  let piedPose: { element: HTMLElement; visible: PartVisible | null; inactif: boolean } | null = null;

  const cartesDuPanneau = (): readonly CarteDeCorrections[] => entree?.cartes ?? [];
  const jeuDuComposant = (): readonly VariantDuJeu[] => entree?.contexte.variants ?? [];
  const cochee = (ligne: LigneDeCarte): boolean => !decochees.has(ligne.id);
  const lignesCochees = (cartes: readonly CarteDeCorrections[] = cartesDuPanneau()): LigneDeCarte[] => cartes.flatMap((carte) => carte.lignes.filter(cochee));
  /** Seule une analyse finale non périmée laisse cocher, appliquer ou écarter ; replier et déplier restent permis. */
  const applicable = (): boolean => analyseApplicable(entree?.analyse ?? null);
  const estOuverte = (carte: CarteDeCorrections): boolean => ouvertes.get(carte.cle) ?? cartesDuPanneau()[0]?.cle === carte.cle;

  /** Envoie ces lignes : celles qu'une écriture sait faire, et le nombre de liaisons qu'elles écrivent. */
  function ecrire(lignes: readonly LigneDeCarte[]): void {
    const aEcrire = lignes.filter(ecritLaLigne);
    options.appliquer(aEcrire.map((ligne) => ligne.id), aEcrire.filter((ligne) => ligne.correction.sorte === 'liaison').length);
  }

  function creerLePied(visible: PartVisible | null, inactif: boolean): HTMLElement {
    const element = document.createElement('div');
    element.className = 'corrections-pied';
    const resume = document.createElement('span');
    resume.className = 'corrections-resume';
    const cochees = lignesCochees();
    if (cochees.length === 0) resume.textContent = T.aucuneCochee;
    else {
      const cartesCochees = cartesDuPanneau().filter((carte) => carte.lignes.some(cochee));
      const sorte = (ligne: LigneDeCarte): string => ligne.correction.sorte;
      const cles = new Set(visible?.cartes.map((carte) => carte.cle));
      const cachees = visible !== null && cartesCochees.some((carte) => !cles.has(carte.cle))
        ? { dans: cartesCochees.filter((carte) => cles.has(carte.cle)).length, element: visible.element }
        : null;
      const texte = cartesCochees.every((carte) => carte.origine !== 'constats')
        ? T.piedDeLaCopie(cochees.length, cachees)
        : T.pied(
          cartesCochees.length,
          new Set(cochees.filter((ligne) => sorte(ligne) === 'liaison').map((ligne) => ligne.correction.cible.layer)).size,
          cochees.filter((ligne) => sorte(ligne) === 'regles').length,
          cochees.filter((ligne) => sorte(ligne) === 'nom-de-valeur').length,
          cachees,
        );
      const gras = document.createElement('b');
      gras.textContent = texte.gras;
      resume.append(gras, texte.suite);
    }
    const appliquer = createButton({
      label: T.appliquerTout,
      disabled: inactif || !applicable() || cochees.length === 0,
      onClick: () => ecrire(lignesCochees()),
    });
    element.append(resume, appliquer);
    piedPose = { element, visible, inactif };
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
    return blocs;
  }

  /** Les gestes du corps déplié : Sélectionner pour une carte qui vise des layers, puis « Ne plus proposer » sur la carte ouverte par un clic. */
  function actionsDeLaCarte(carte: CarteDeCorrections, ciblee: boolean): HTMLElement | null {
    const selectionner = creerBoutonSelectionner({
      layers: carte.layers,
      selectionnes: options.selectionnes?.() ?? [],
      phrase: texteDeLaPhrase(carte.phrase) || carte.lignes[0]?.apres || '',
      inactif: !applicable(),
      selectionner: options.selectionner,
    });
    let nePlusProposer: HTMLButtonElement | null = null;
    if (ciblee && carte.constats.length > 0) {
      nePlusProposer = document.createElement('button');
      nePlusProposer.type = 'button';
      nePlusProposer.className = 'btn-texte';
      nePlusProposer.textContent = T.nePlusProposer(carte.layers.length);
      nePlusProposer.disabled = !applicable();
      nePlusProposer.addEventListener('click', () => options.ignorer(carte.constats));
    }
    if (selectionner === null && nePlusProposer === null) return null;
    const ligne = document.createElement('div');
    ligne.className = 'constat-actions';
    ligne.append(...[selectionner, nePlusProposer].filter((bouton): bouton is HTMLButtonElement => bouton !== null));
    return ligne;
  }

  /** Une liaison dont la variable n'est pas publiée : le layer et le variant comme Figma les nomme, aucune case, et pourquoi sous le chemin. */
  function creerLaLigneEnAttente(entree: LigneEnAttente): HTMLElement {
    const avant = document.createDocumentFragment();
    if (entree.layer !== null) avant.append(T.layerNomme(entree.layer));
    if (entree.layer !== null && entree.variant !== null) avant.append(document.createElement('br'));
    if (entree.variant !== null) {
      const paires = pairesDuNom(entree.variant);
      avant.append(paires.length > 0 ? creerPuces(paires, jeuDuComposant()) : creerVariantEnPhrase(entree.variant));
    }
    if (entree.layer === null && entree.variant === null) avant.append(T.layers([], 1));
    const diff = creerLigneDeDiff(avant, dans(cheminAvecSegments(entree.variable, [], 'nouveau', true)), { reste: true });
    diff.classList.add('preparation-liaison');
    diff.querySelector('input')?.replaceWith(document.createElement('span'));
    const attente = document.createElement('span');
    attente.className = 'meta';
    attente.textContent = TEXTES_PREPARATION.preparationLiaisonNonPubliee;
    diff.querySelector('.chemin-apres')?.append(document.createElement('br'), attente);
    return diff;
  }

  /**
   * Une ligne d'une carte de tailles : le layer et ses variants, la valeur lue en dur, puis le token du composant avec sa collection,
   * sa valeur et « existe », en mots. La case coche toutes les corrections de la ligne.
   */
  function creerLaLigneDeTaille(groupe: GroupeDeTaille): HTMLElement {
    const deuxEtages = (haut: Node[], bas: Node[]): DocumentFragment => {
      const pile = document.createElement('span');
      pile.className = 'taille-pile';
      const etageHaut = document.createElement('span');
      etageHaut.className = 'taille-haut';
      etageHaut.append(...haut);
      const etageBas = document.createElement('span');
      etageBas.className = 'taille-bas';
      etageBas.append(...bas);
      pile.append(etageHaut, etageBas);
      return dans([pile]);
    };
    // Un littéral par classe : la loi des styles ne lit que les classes écrites en toutes lettres.
    const morceau = (classe: 'fois' | 'en-dur' | 'collection' | null, texte: string): HTMLElement => {
      const element = document.createElement('span');
      if (classe === 'fois') element.className = 'taille-fois';
      if (classe === 'en-dur') element.className = 'taille-en-dur';
      if (classe === 'collection') element.className = 'taille-collection';
      element.textContent = texte;
      return element;
    };
    const avant = deuxEtages(
      [document.createTextNode(groupe.layer), morceau('fois', T.fois(groupe.fois))],
      [morceau('en-dur', groupe.valeur === null ? T.enDur(groupe.champ) : T.enDurEnPixels(groupe.valeur))],
    );
    const apres = deuxEtages(
      [document.createTextNode(groupe.apres)],
      [
        ...(groupe.collection === null ? [] : [morceau('collection', groupe.collection)]),
        ...(groupe.valeurApres === null ? [] : [morceau(null, T.enPixels(groupe.valeurApres))]),
        morceau(null, T.existe),
      ],
    );
    const cochee = groupe.ids.every((id) => !decochees.has(id));
    const diff = creerLigneDeDiff(avant, apres, { coche: cochee });
    diff.classList.add('ligne-de-taille');
    const caseACocher = diff.querySelector('input') as HTMLInputElement;
    caseACocher.setAttribute('aria-label', TEXTES.caseDeCorrection(groupe.apres));
    caseACocher.disabled = !applicable();
    caseACocher.addEventListener('change', () => {
      for (const id of groupe.ids) {
        if (caseACocher.checked) decochees.delete(id);
        else decochees.add(id);
      }
      rafraichir();
    });
    for (const id of groupe.ids) casesDeLignes.set(id, caseACocher);
    return diff;
  }

  function creerLaCarte(carte: CarteDeCorrections): HTMLElement {
    const corps = document.createElement('div');
    corps.append(creerColonnes(TEXTES.legendeAujourdhui, TEXTES.legendeApres));
    const preparation = carte.origine === 'preparation';
    for (const groupe of carte.groupes ?? []) corps.append(creerLaLigneDeTaille(groupe));
    for (const ligne of carte.groupes ? [] : carte.lignes) {
      const avant = dans(cheminAvecSegments(ligne.avant, ligne.marquesAvant, 'ancien'));
      if (ligne.variant.length > 0) avant.append(document.createElement('br'), creerPuces(ligne.variant, jeuDuComposant()));
      const diff = creerLigneDeDiff(avant, dans(cheminAvecSegments(ligne.apres, ligne.marquesApres, 'nouveau', preparation)), { coche: cochee(ligne) });
      if (preparation) diff.classList.add('preparation-liaison');
      const caseACocher = diff.querySelector('input') as HTMLInputElement;
      caseACocher.setAttribute('aria-label', TEXTES.caseDeCorrection(ligne.apres));
      caseACocher.disabled = !applicable();
      caseACocher.addEventListener('change', () => {
        if (caseACocher.checked) decochees.delete(ligne.id);
        else decochees.add(ligne.id);
        rafraichir();
      });
      casesDeLignes.set(ligne.id, caseACocher);
      corps.append(diff);
    }
    for (const attente of carte.attente) corps.append(creerLaLigneEnAttente(attente));
    if (carte.attente.length > 0) {
      corps.append(creerAlerte('info', {
        texte: TEXTES_PREPARATION.preparationVariablesNonPubliees(variablesNonPublieesDeLaListe(carte.attente)),
        meta: TEXTES_PREPARATION.preparationPublierPourLier(entree?.contexte.library ?? null),
      }));
    }
    const ciblee = cible === carte.cle;
    if (ciblee) corps.append(...faitsEtActions(carte));
    const actions = actionsDeLaCarte(carte, ciblee);
    if (actions) corps.append(actions);

    let tete: Node[];
    if (carte.jetons) tete = creerRenommage(carte.jetons[0], carte.jetons[1]);
    else {
      const phrase = document.createElement('span');
      phrase.className = 'bloc-phrase';
      poserLesMorceaux(phrase, carte.phrase, jeuDuComposant());
      tete = [phrase];
    }
    const meta: Node[] = [];
    const conteneur = document.createDocumentFragment();
    poserLesMorceaux(conteneur, carte.meta, jeuDuComposant());
    meta.push(...Array.from(conteneur.childNodes));

    const ids = carte.lignes.map((ligne) => ligne.id);
    // Une carte dont toutes les liaisons attendent leur publication n'a rien à cocher ni à appliquer.
    let caseDeCarte: HTMLInputElement | undefined;
    let appliquerLaCarte: HTMLButtonElement | undefined;
    if (carte.lignes.length > 0) {
      const element = document.createElement('input');
      element.type = 'checkbox';
      element.className = 'case';
      element.setAttribute('aria-label', TEXTES.caseDeCarte(carte.lignes[0].apres));
      const cochees = ids.filter((id) => !decochees.has(id)).length;
      element.checked = cochees === ids.length;
      element.indeterminate = cochees > 0 && cochees < ids.length;
      element.disabled = !applicable();
      element.addEventListener('change', () => {
        for (const id of ids) {
          if (element.checked) decochees.delete(id);
          else decochees.add(id);
        }
        rafraichir();
      });
      casesDeCartes.push({ element, ids });
      caseDeCarte = element;
      appliquerLaCarte = createButton({
        label: T.appliquer,
        variant: 'secondary',
        compact: true,
        disabled: !applicable() || !carte.lignes.some(cochee),
        onClick: () => ecrire(lignesCochees([carte])),
      }) as HTMLButtonElement;
      appliquerLaCarte.classList.add('appliquer-carte');
      appliquerLaCarte.setAttribute('aria-label', T.appliquerLaCarte(carte.lignes[0].apres));
      boutonsDeCartes.push({ element: appliquerLaCarte, carte });
    }
    return creerCarte({
      tete,
      meta,
      caseACocher: caseDeCarte,
      action: appliquerLaCarte,
      nomDuChevron: TEXTES.elementsDuPanneau.deplierLaCarte,
      corps,
      deplie: estOuverte(carte),
      auBasculement: (ouvert) => {
        ouvertes.set(carte.cle, ouvert);
        if (ouvert) cible = carte.cle;
        options.redessiner();
      },
    }).element;
  }

  /** Reflète les cases dans les lignes et les cartes, puis recompte le pied. */
  function rafraichir(): void {
    for (const [id, caseACocher] of casesDeLignes) caseACocher.checked = !decochees.has(id);
    for (const { element, ids } of casesDeCartes) {
      const nombre = ids.filter((id) => !decochees.has(id)).length;
      element.checked = nombre === ids.length;
      element.indeterminate = nombre > 0 && nombre < ids.length;
    }
    for (const { element, carte } of boutonsDeCartes) element.disabled = !applicable() || !carte.lignes.some(cochee);
    if (piedPose) {
      const { element, visible, inactif } = piedPose;
      element.replaceWith(creerLePied(visible, inactif));
    }
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
      annoncerLaVue();
    },
    commencer() {
      casesDeLignes = new Map();
      casesDeCartes = [];
      boutonsDeCartes = [];
      piedPose = null;
    },
    cartes: (cartes) => cartes.map(creerLaCarte),
    pied: (visible, inactif = false) => creerLePied(visible, inactif),
    liaisonsAVenir,
    ouvrirPourLesCalques(calques) {
      const carte = cartesDuPanneau().find((candidate) => candidate.lignes.some((ligne) => ligne.correction.cible.layer !== undefined && calques.includes(ligne.correction.cible.layer)));
      if (!carte) return null;
      ouvertes.set(carte.cle, true);
      cible = carte.cle;
      return carte;
    },
  };
}

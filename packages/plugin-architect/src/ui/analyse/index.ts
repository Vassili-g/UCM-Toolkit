/**
 * Le panneau des constats du mode Composant : le résumé du composant, puis ce que l'analyse en dit. Chaque état de l'analyse a son
 * écran : aucune sélection, fichier hors UCM, library à choisir, pas encore analysé, en cours, arrêtée, annulée, partielle, sans
 * constat, périmée. Une analyse partielle, annulée ou arrêtée ne dit jamais « aucun constat ».
 *
 * Une analyse rendue se lit par élément du composant (`../panneau/elements.ts`) : un sommaire de puces, puis une section par élément qui
 * a des points. Dans une section, les corrections (`corrections/`), les questions (`questions/`), puis ce qui reste à faire dans Figma
 * (`ignores/`). « Tout » montre les Bloquants en tête, les sections, puis les éléments tenus ; une puce choisie ne montre que son élément.
 * Une section s'ouvre d'elle-même jusqu'à cinq points, ou quand elle est seule ; le choix du designer survit à une nouvelle analyse du
 * même sujet et tombe quand le sujet change.
 */
import { creerAlerte } from 'ucm-plugin-socle/src/ui/Alerte';
import { createButton } from 'ucm-plugin-socle/src/ui/Button';

import type { LectureDeComposant } from '../../composant';
import type { Constat } from '../../messages/commun';
import type { Application } from '../application';
import { calculEnCours, demandeDAnalyseEnCours, analyseDuComposant, aDesLiaisonsPreparees, aPreparer, libraryAChoisir, type AnalyseRecue } from '../composant/analyse';
import { monterLesCorrections, noteDeLEcriture, resultatApresPeremption } from '../corrections';
import { carteDesLiaisonsPreparees } from '../corrections/liaisons';
import type { CarteDeCorrections, ContexteDeCartes } from '../corrections/modele';
import type { ElementChoisi } from '../etat';
import { monterAFaire } from '../ignores';
import { elementDuConstat, elementsDuPanneau, sansLesBloquants, type ElementDuPanneau, type IdDElement, type PanneauParElements } from '../panneau/elements';
import { creerEnTeteDesBloquants, creerSection, creerSectionTenue, creerSommaire } from '../panneau/rendu';
import { monterLesQuestions } from '../questions';
import { TEXTES } from '../textes';
import type { VueComposant } from '../vues/composant';
import { estHorsUcm } from '../vues/horsUcm';

const T = TEXTES.panneauDesConstats;
const P = TEXTES.panneau;

/** Une section s'ouvre d'elle-même jusqu'à ce nombre de points, comme les sections du compte rendu d'UCM Exporter. */
const POINTS_D_OUVERTURE = 5;

const heure = (millisecondes: number): string => new Date(millisecondes).toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' });

export interface PanneauDesConstats {
  readonly element: HTMLElement;
  /** Le sommaire des éléments : hôte durable, que le mode Composant masque pendant la préparation des tokens. */
  readonly sommaire: HTMLElement;
  /** Les sections, le pied et les constats ignorés : hôte durable, masqué de même. */
  readonly liste: HTMLElement;
  mettreAJour(): void;
  /** Le panneau se ferme : la vue ne montre plus les liaisons à venir. */
  retirerLesLiaisonsDeLaVue(): void;
}

/** Ce que le panneau a calculé pour l'analyse rendue : de quoi redessiner sans tout recalculer. */
interface Rendu {
  readonly analyse: AnalyseRecue;
  readonly panneau: PanneauParElements;
  /** Les cartes de corrections de tout le panneau, visibles ou non : le pied les compte toutes. */
  readonly cartes: readonly CarteDeCorrections[];
  readonly ignores: readonly Constat[];
}

function bouton(libelle: string, onClick: () => void): HTMLElement {
  return createButton({ label: libelle, variant: 'secondary', compact: true, onClick });
}

function note(texte: string): HTMLElement {
  const element = document.createElement('p');
  element.className = 'meta';
  element.textContent = texte;
  return element;
}

/** Les cartes de corrections d'un élément : celles d'une préparation d'abord. */
const correctionsDe = (element: Pick<ElementDuPanneau, 'corrections'> & { readonly preparee?: CarteDeCorrections | null }): readonly CarteDeCorrections[] =>
  [...(element.preparee ? [element.preparee] : []), ...element.corrections];

export function monterLePanneau(app: Application, vue: VueComposant): PanneauDesConstats {
  const { etat } = app;
  const colonne = document.createElement('div');
  colonne.className = 'container';
  const pile = document.createElement('div');
  pile.className = 'page-stack';
  colonne.append(pile);

  const sommaireHote = document.createElement('div');
  const listeHote = document.createElement('div');
  listeHote.className = 'liste';
  let rendu: Rendu | null = null;
  /** Les sections que le designer a ouvertes ou fermées, pour le sujet `sujetDesChoix`. */
  const choixDeSections = new Map<IdDElement, boolean>();
  let sujetDesChoix = '';

  /** Quand le designer coche ou décoche, la vue Composant montre les liaisons à venir. */
  const corrections = monterLesCorrections({
    appliquer: (ids, liaisons) => app.appliquer(ids, liaisons),
    selectionner: (layers) => {
      vue.poserLaSelectionDuPlugin(layers);
      app.selectionner(layers);
    },
    ignorer: (constats) => app.ignorerLaProposition(constats),
    auChangement: () => poserLesLiaisonsDansLaVue(),
    redessiner: () => dessiner(),
  });
  const questions = monterLesQuestions({
    repondre: (question, reponse) => app.repondre(question, reponse),
    annuler: (question) => app.annulerLaReponse(question),
    redessiner: () => dessiner(),
  });
  const aFaire = monterAFaire({
    selectionner: (layers) => {
      vue.poserLaSelectionDuPlugin(layers);
      app.selectionner(layers);
    },
    ignorer: (constat) => app.ignorer(constat),
    nePlusIgnorer: (constat) => app.nePlusIgnorer(constat),
    redessiner: () => dessiner(),
  });

  /** Ce que la vue montre déjà des liaisons à venir : la vue ne se redessine que si cela change. */
  let dansLaVue = '[]';
  function poserLesLiaisonsDansLaVue(): void {
    const liaisons = corrections.liaisonsAVenir();
    const cle = JSON.stringify(liaisons);
    if (cle === dansLaVue) return;
    dansLaVue = cle;
    vue.poserLesCorrections(liaisons, (calques) => {
      const carte = corrections.ouvrirPourLesCalques(calques);
      if (carte) reveler(carte);
    });
  }

  /** La carte que la vue désigne se voit : son élément est choisi ou « Tout », et sa section est ouverte. */
  function reveler(carte: CarteDeCorrections): void {
    const element = rendu?.panneau.elements.find((candidat) => correctionsDe(candidat).some((autre) => autre.cle === carte.cle));
    if (element) {
      choixDeSections.set(element.id, true);
      if (etat.panneau.element !== 'tout' && etat.panneau.element !== element.id) etat.panneau = { ...etat.panneau, element: 'tout' };
    }
    dessiner();
    app.rendre(['barre']);
  }

  function resume(lecture: LectureDeComposant, etatDeLAnalyse: string, nombreDeVariants = lecture.sujet.variants.length): HTMLElement {
    const element = document.createElement('div');
    element.className = 'arch-resume';
    const ligne = document.createElement('div');
    ligne.className = 'arch-resume-ligne';
    const titre = document.createElement('span');
    titre.className = 'arch-resume-titre';
    const meta = document.createElement('span');
    meta.className = 'meta';
    meta.textContent = P.resume(Math.max(1, nombreDeVariants), etatDeLAnalyse);
    titre.append(`${lecture.sujet.nom} `, meta);
    ligne.append(titre);
    element.append(ligne);
    return element;
  }

  function ouvrirLaConfiguration(): void {
    app.ouvrirLaConfiguration();
  }

  function contexteDe(lecture: LectureDeComposant, analyse: AnalyseRecue): ContexteDeCartes {
    return {
      composant: lecture.sujet.nom,
      variants: [...analyse.variants, ...lecture.sujet.variants.filter((variant) => !analyse.variants.some((lu) => lu.id === variant.id))],
      layers: new Map(lecture.calques.map((calque) => [calque.id, calque.nom])),
      library: etat.reference?.nom ?? null,
      constats: analyse.constats,
    };
  }

  /**
   * Les constats que le panneau range : une question répondue porte déjà sa correction, et une correction écrite n'est plus un point.
   * La ligne de réponse de la question reste (`reponses`) pour que le designer puisse l'annuler.
   */
  function constatsAMontrer(analyse: AnalyseRecue): Constat[] {
    const ecrites = new Set(analyse.appliquees);
    return analyse.constats
      .map((constat) => {
        const reponse = constat.question === undefined ? undefined : analyse.repondues[constat.question.id];
        return reponse === undefined ? constat : { ...constat, correction: reponse };
      })
      .filter((constat) => constat.correction === undefined || !ecrites.has(constat.correction.id));
  }

  /** Range l'analyse par élément, remet les modules à jour, puis dessine. Rend le nombre de points. */
  function preparer(lecture: LectureDeComposant, analyse: AnalyseRecue): number {
    const sujet = analyse.identite.sujet;
    if (sujet !== sujetDesChoix) {
      sujetDesChoix = sujet;
      choixDeSections.clear();
    }
    const contexte = contexteDe(lecture, analyse);
    const preparee = analyse.liaisons === null ? null : carteDesLiaisonsPreparees(analyse.liaisons, analyse.appliquees, contexte);
    const panneau = elementsDuPanneau(constatsAMontrer(analyse), contexte, { reponses: analyse.repondues, preparee, sansTokens: aPreparer(analyse) });
    const cartes = panneau.elements.flatMap(correctionsDe);
    rendu = { analyse, panneau, cartes, ignores: analyse.tous.filter((constat) => analyse.ignores.includes(constat.id)) };
    corrections.poser({ analyse, contexte, cartes });
    questions.poser(analyse);
    aFaire.poser({ analyse, contexte });
    dessiner();
    return panneau.elements.reduce((somme, element) => somme + element.points, 0);
  }

  /** L'élément que le sommaire montre seul ; « Tout » quand le choix n'a plus de point. */
  function elementChoisi(panneau: PanneauParElements): ElementChoisi {
    const { element } = etat.panneau;
    return element !== 'tout' && panneau.elements.some((candidat) => candidat.id === element) ? element : 'tout';
  }

  function choisir(element: ElementChoisi): void {
    etat.panneau = { ...etat.panneau, element };
    dessiner();
    for (const puce of Array.from(sommaireHote.querySelectorAll<HTMLElement>('.puce-element'))) if (puce.dataset.element === element) puce.focus();
  }

  /** Les cartes d'une section ou de l'en-tête : corrections, puis questions, puis ce qui reste à faire dans Figma. */
  function cartesDe(element: Pick<ElementDuPanneau, 'corrections' | 'questions' | 'aFaire'> & { readonly preparee?: CarteDeCorrections | null; readonly sansTokens?: boolean }): HTMLElement[] {
    return [
      ...corrections.cartes(correctionsDe(element)),
      ...questions.cartes(element.questions),
      ...(element.sansTokens ? [aFaire.carteSansTokens()] : []),
      ...aFaire.cartes(element.aFaire),
    ];
  }

  function dessiner(): void {
    if (!rendu) return;
    const { analyse, panneau, cartes, ignores } = rendu;
    corrections.commencer();
    if (analyse.perimee) {
      sommaireHote.replaceChildren();
      listeHote.replaceChildren(resultatApresPeremption(analyse));
      return;
    }
    if (analyse.ecriture !== null) {
      sommaireHote.replaceChildren();
      listeHote.replaceChildren(noteDeLEcriture(analyse), corrections.pied(null, true));
      return;
    }
    const choisi = elementChoisi(panneau);
    const tout = choisi === 'tout';
    const montres = tout ? panneau.elements : panneau.elements.filter((element) => element.id === choisi);
    const sections = montres.map((element) => {
      const ouverte = choixDeSections.get(element.id) ?? (element.points <= POINTS_D_OUVERTURE || montres.length === 1);
      const aMontrer = tout ? sansLesBloquants(element) : element;
      return creerSection(element, {
        ouverte,
        basculer: (suite) => {
          choixDeSections.set(element.id, suite);
          dessiner();
          // Le dessin remplace la bande : le clavier reprend là où il était.
          for (const section of Array.from(listeHote.querySelectorAll<HTMLElement>('.section-element'))) if (section.dataset.element === element.id) section.querySelector<HTMLElement>('.bande-element')?.focus();
        },
        corps: () => cartesDe(aMontrer),
      });
    });
    const cartesEnTete = tout ? cartesDe(panneau.enTete) : [];
    const enTete = cartesEnTete.length > 0 ? [creerEnTeteDesBloquants(cartesEnTete)] : [];
    const tenus = tout ? panneau.tenus.map(creerSectionTenue) : [];
    const ignoresMontres = tout ? ignores : ignores.filter((constat) => elementDuConstat(constat) === choisi);
    const visible = tout ? null : { cartes: montres.flatMap(correctionsDe), element: TEXTES.elementsDuPanneau.libelles[choisi] };
    sommaireHote.replaceChildren(...(panneau.elements.length > 0 ? [creerSommaire(panneau.elements, choisi, choisir)] : []));
    listeHote.replaceChildren(...enTete, ...sections, ...tenus, ...aFaire.ignores(ignoresMontres), ...(cartes.length > 0 ? [corrections.pied(visible)] : []));
  }

  /** Le sommaire et la liste d'une analyse rendue. */
  function montrerLesElements(lecture: LectureDeComposant, analyse: AnalyseRecue): { readonly points: number; readonly enfants: HTMLElement[] } {
    const points = preparer(lecture, analyse);
    return { points, enfants: [...(sommaireHote.hasChildNodes() ? [sommaireHote] : []), listeHote] };
  }

  function enfants(): HTMLElement[] {
    const { lecture } = etat.composant;
    const brute = etat.analyse;
    if (estHorsUcm(etat.architecture)) return [creerAlerte('info', { titre: T.horsUcmTitre, texte: T.horsUcmTexte, actions: [bouton(T.declarer, ouvrirLaConfiguration)] })];
    if (!lecture) return [creerAlerte('info', { texte: T.aucunComposant })];
    const variants = Math.max(1, lecture.sujet.variants.length);

    if ((brute && calculEnCours(brute)) || demandeDAnalyseEnCours(etat) !== null) {
      const enCours = brute && calculEnCours(brute) ? brute.progression : null;
      const libelle = enCours?.phase ? T.phases[enCours.phase] : enCours ? T.progression(enCours.lus, enCours.total) : P.enCours;
      const progression = enCours?.fait !== undefined && enCours.total > 0 ? T.compteDeLecture(libelle, enCours.fait, enCours.total) : libelle;
      const barre = document.createElement('progress');
      barre.className = 'progression-analyse';
      barre.max = 1;
      barre.value = enCours?.fraction ?? 0;
      barre.setAttribute('aria-label', progression);
      return [resume(lecture, progression), barre, bouton(TEXTES.annuler, () => app.annulerAnalyse()), note(T.attendreLesConstats)];
    }
    if (brute?.statut === 'arretee') {
      const message = String(brute.constats[0]?.faits.message ?? '');
      return [resume(lecture, T.arretee), creerAlerte('bloquant', { titre: T.arreteTitre, texte: T.arreteTexte(message), meta: T.arreteMeta })];
    }
    if (brute?.statut === 'annulee') return [resume(lecture, T.annulee), creerAlerte('info', { titre: T.annuleeTitre, texte: T.annuleeTexte, meta: T.annuleeMeta })];

    const analyse = analyseDuComposant(etat, lecture);
    if (!analyse) {
      if (etat.reference && libraryAChoisir(etat)) {
        return [resume(lecture, P.pasAnalyse), creerAlerte('info', { titre: T.libraryTitre, texte: T.libraryTexte(etat.reference.candidates), actions: [bouton(T.ouvrirLaConfiguration, ouvrirLaConfiguration)] })];
      }
      return [resume(lecture, P.pasAnalyse), creerAlerte('info', { texte: P.avantAnalyse(variants, lecture.sujet.nom), meta: P.duree })];
    }

    const alertes: HTMLElement[] = [];
    if (analyse.statut === 'partielle') {
      const lus = analyse.lecture?.layersLus ?? 0;
      const nonLus = analyse.lecture?.layersNonLus;
      const echecs = analyse.lecture?.manquees.length ?? 0;
      const rienNonLu = nonLus === 0 && (analyse.lecture?.variantsNonLus.length ?? 0) === 0;
      if (rienNonLu && echecs > 0) {
        alertes.push(creerAlerte('verifier', { titre: T.partielleDesLecturesTitre(echecs), texte: T.partielleDesLecturesTexte }));
      } else {
        const titre = typeof nonLus === 'number' && nonLus > 0 ? T.partielleTitre(lus, lus + nonLus) : T.partielleTitreDesVariants(analyse.variants.length, analyse.variants.length + (analyse.lecture?.variantsNonLus.length ?? 0));
        alertes.push(creerAlerte('verifier', { titre, texte: T.partielleTexte }));
      }
    } else if (analyse.constats.length === 0 && !aPreparer(analyse) && !aDesLiaisonsPreparees(analyse) && !analyse.perimee && analyse.ecriture === null) {
      return [resume(lecture, P.analyseA(heure(analyse.recueA), analyse.dureeMs), analyse.variants.length), creerAlerte('tenu', { titre: T.aucunTitre(lecture.sujet.nom, variants), meta: T.aucunMeta })];
    }
    if (analyse.perimee) alertes.push(creerAlerte('info', { titre: T.perimeTitre, texte: T.perimeTexte }));
    const { points, enfants: elements } = montrerLesElements(lecture, analyse);
    const analyseA = P.analyseA(heure(analyse.recueA), analyse.dureeMs);
    const etatDeLAnalyse = points > 0 ? `${analyseA}, ${TEXTES.elementsDuPanneau.points(points)}` : analyseA;
    return [resume(lecture, etatDeLAnalyse, analyse.variants.length), ...alertes, ...elements];
  }

  return {
    element: colonne,
    sommaire: sommaireHote,
    liste: listeHote,
    retirerLesLiaisonsDeLaVue() {
      if (dansLaVue === '[]') return;
      dansLaVue = '[]';
      vue.poserLesCorrections([], () => {});
    },
    mettreAJour() {
      // Remplacer les enfants peut ramener le défilement à zéro : celui du panneau et de ses parents est rendu après le dessin.
      const defilements: Array<{ element: HTMLElement; haut: number; gauche: number }> = [];
      for (let element: HTMLElement | null = colonne; element; element = element.parentElement) defilements.push({ element, haut: element.scrollTop, gauche: element.scrollLeft });
      pile.replaceChildren(...enfants());
      poserLesLiaisonsDansLaVue();
      for (const { element, haut, gauche } of defilements) { element.scrollTop = haut; element.scrollLeft = gauche; }
    },
  };
}

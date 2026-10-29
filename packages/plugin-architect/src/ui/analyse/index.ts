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
 *
 * Les constats `info` ne sont pas des points : ils forment la section Informations, après les éléments tenus de « Tout », repliée à
 * l'arrivée. Ils ne comptent ni dans le résumé, ni dans le sommaire.
 */
import { creerAlerte } from 'ucm-plugin-socle/src/ui/Alerte';
import { createButton } from 'ucm-plugin-socle/src/ui/Button';

import { champDe, natureDe, type LectureDeComposant } from '../../composant';
import type { Constat } from '../../messages/commun';
import type { Application } from '../application';
import { analyseApplicable, calculEnCours, demandeDAnalyseEnCours, analyseDuComposant, aDesLiaisonsPreparees, aPreparer, libraryAChoisir, type AnalyseRecue } from '../composant/analyse';
import { monterLesCorrections, noteDeLEcriture, resultatApresPeremption } from '../corrections';
import { carteDesLiaisonsPreparees } from '../corrections/liaisons';
import type { CarteDeCorrections, ContexteDeCartes } from '../corrections/modele';
import type { ElementChoisi } from '../etat';
import { monterAFaire } from '../ignores';
import type { LiaisonDuVariantAffiche } from '../ignores/modele';
import { elementDuConstat, elementsDuPanneau, estUneInformation, sansLesBloquants, type ElementDuPanneau, type IdDElement, type PanneauParElements } from '../panneau/elements';
import { ligneDInformation } from '../panneau/informations';
import { creerEnTeteDesBloquants, creerLigneDInformation, creerSection, creerSectionInformations, creerSectionTenue, creerSommaire } from '../panneau/rendu';
import { monterLesQuestions } from '../questions';
import { TEXTES } from '../textes';
import { telecharger } from '../telechargement';
import type { VueComposant } from '../vues/composant';
import { estHorsUcm } from '../vues/horsUcm';
import { contenuDuRapport, nomDuRapport } from './rapport';

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
  /** La sélection de Figma a changé : les boutons « Sélectionnés » redeviennent Sélectionner au prochain dessin. */
  oublierLaSelection(): void;
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
  readonly contexte: ContexteDeCartes;
}

function bouton(libelle: string, onClick: () => void): HTMLElement {
  return createButton({ label: libelle, variant: 'secondary', compact: true, onClick });
}

/** Les cartes de corrections d'un élément : celles d'une préparation d'abord. */
const correctionsDe = (element: Pick<ElementDuPanneau, 'corrections'> & { readonly preparee?: CarteDeCorrections | null }): readonly CarteDeCorrections[] =>
  [...(element.preparee ? [element.preparee] : []), ...element.corrections];

/** Ce que les tests remplacent : le téléchargement et l'horloge. */
export interface OptionsDuPanneau {
  readonly telecharger?: typeof telecharger;
  readonly maintenant?: () => Date;
}

export function monterLePanneau(app: Application, vue: VueComposant, options: OptionsDuPanneau = {}): PanneauDesConstats {
  const { etat } = app;
  const colonne = document.createElement('div');
  colonne.className = 'container';
  const pile = document.createElement('div');
  pile.className = 'page-stack';
  colonne.append(pile);

  const sommaireHote = document.createElement('div');
  const listeHote = document.createElement('div');
  listeHote.className = 'liste liste-des-constats';
  let rendu: Rendu | null = null;
  /** Les sections que le designer a ouvertes ou fermées, pour le sujet `sujetDesChoix`. */
  const choixDeSections = new Map<IdDElement, boolean>();
  /** La section Informations arrive repliée ; le designer l'ouvre pour le sujet `sujetDesChoix`. */
  let informationsOuvertes = false;
  let sujetDesChoix = '';
  /** Le rapport : au repos, en préparation chez le sandbox, ou échoué. */
  let etatDuRapport: 'repos' | 'prepare' | 'echoue' = 'repos';
  /** Les layers que le plugin a sélectionnés depuis le dernier changement de sélection de Figma. */
  let selectionDuPlugin: readonly string[] = [];

  function selectionner(layers: readonly string[]): void {
    selectionDuPlugin = layers;
    vue.poserLaSelectionDuPlugin(layers);
    app.selectionner(layers);
    dessiner();
  }
  const selectionnes = (): readonly string[] => selectionDuPlugin;

  /** Quand le designer coche ou décoche, la vue Composant montre les liaisons à venir. */
  const corrections = monterLesCorrections({
    appliquer: (ids, liaisons) => app.appliquer(ids, liaisons),
    selectionner,
    selectionnes,
    ignorer: (constats) => app.ignorerLaProposition(constats),
    auChangement: () => poserLesLiaisonsDansLaVue(),
    redessiner: () => dessiner(),
  });
  const questions = monterLesQuestions({
    repondre: (question, reponse) => app.repondre(question, reponse),
    annuler: (question) => app.annulerLaReponse(question),
    selectionner,
    selectionnes,
    redessiner: () => dessiner(),
  });
  const aFaire = monterAFaire({
    selectionner,
    selectionnes,
    proposer: (constat, variant) => {
      // Les corrections arrivent dans la section du constat, dont le nombre de points peut la replier : elle reste ouverte.
      for (const autre of rendu?.analyse.constats ?? []) if (autre.code === 'C81' && autre.faits.modele === constat.faits.modele) choixDeSections.set(elementDuConstat(autre), true);
      app.servirDeModele(variant);
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

  /** Les couleurs et les tailles que le variant lu lie à un token : de quoi lister, sur la carte d'un modèle, ce que le modèle lie. */
  function liaisonsDuVariantLu(lecture: LectureDeComposant): LiaisonDuVariantAffiche[] {
    return lecture.liaisons.flatMap((liaison) => {
      const { nature } = natureDe(liaison.propriete, '');
      const sorte = nature === 'couleur' ? 'couleurs' : nature === 'forme' || nature === 'espacement' || nature === 'taille' ? 'tailles' : null;
      if (sorte === null) return [];
      return [{ layer: liaison.calque, champ: champDe(liaison.propriete).champ, sorte, token: etat.composant.index?.variables.get(liaison.variable)?.nom ?? liaison.variable }];
    });
  }

  function contexteDe(lecture: LectureDeComposant, analyse: AnalyseRecue): ContexteDeCartes {
    return {
      composant: lecture.sujet.nom,
      variants: [...analyse.variants, ...lecture.sujet.variants.filter((variant) => !analyse.variants.some((lu) => lu.id === variant.id))],
      layers: new Map(lecture.calques.map((calque) => [calque.id, calque.nom])),
      library: etat.reference?.nom ?? null,
      constats: analyse.constats,
      liaisons: liaisonsDuVariantLu(lecture),
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
      informationsOuvertes = false;
      etatDuRapport = 'repos';
    }
    const contexte = contexteDe(lecture, analyse);
    const preparee = analyse.liaisons === null ? null : carteDesLiaisonsPreparees(analyse.liaisons, analyse.appliquees, contexte);
    const panneau = elementsDuPanneau(constatsAMontrer(analyse), contexte, { reponses: analyse.repondues, preparee, sansTokens: aPreparer(analyse) });
    const cartes = panneau.elements.flatMap(correctionsDe);
    rendu = { analyse, panneau, cartes, contexte, ignores: analyse.tous.filter((constat) => analyse.ignores.includes(constat.id) && !estUneInformation(constat)) };
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

  /** Le lien discret sous la liste, quand une analyse rendue porte des constats. */
  function pied(analyse: AnalyseRecue): HTMLElement {
    const hote = document.createElement('div');
    hote.className = 'pied-rapport';
    const lien = document.createElement('button');
    lien.type = 'button';
    lien.className = 'lien-rapport';
    const enCours = etatDuRapport === 'prepare';
    lien.textContent = enCours ? T.rapportEnCours : T.rapport;
    lien.disabled = enCours;
    if (!enCours) lien.title = T.rapportInfobulle;
    lien.addEventListener('click', () => preparerLeRapport(analyse));
    hote.append(lien);
    if (etatDuRapport === 'echoue') {
      const note = document.createElement('span');
      note.className = 'note-rapport';
      note.textContent = T.rapportEchoue;
      hote.append(note);
    }
    return hote;
  }

  function preparerLeRapport(analyse: AnalyseRecue): void {
    if (etatDuRapport === 'prepare') return;
    etatDuRapport = 'prepare';
    dessiner();
    // `identite.sujet` est la clé publiée du jeu quand il en a une : le sandbox lit le nœud par son identifiant, celui de la lecture.
    const id = etat.composant.lecture?.sujet.id ?? analyse.identite.sujet;
    app.preparerLeRapport(id, (capture) => {
      try {
        if (capture === null) throw new Error('rapport illisible');
        const date = (options.maintenant ?? (() => new Date()))();
        const nom = etat.composant.lecture?.sujet.nom ?? analyse.identite.sujet;
        (options.telecharger ?? telecharger)(nomDuRapport(nom, date), contenuDuRapport({ id, nom }, analyse, capture, date), 'application/json');
        etatDuRapport = 'repos';
      } catch {
        etatDuRapport = 'echoue';
      }
      dessiner();
    });
  }

  /** La section Informations, en dernier : une ligne par information, avec Sélectionner quand elle vise des layers. */
  function sectionDesInformations(analyse: AnalyseRecue, panneau: PanneauParElements, contexte: ContexteDeCartes): HTMLElement {
    return creerSectionInformations({
      ouverte: informationsOuvertes,
      nombre: panneau.informations.length,
      basculer: (suite) => {
        informationsOuvertes = suite;
        dessiner();
        // Le dessin remplace la bande : le clavier reprend là où il était.
        for (const section of Array.from(listeHote.querySelectorAll<HTMLElement>('.section-element'))) if (section.dataset.element === 'informations') section.querySelector<HTMLElement>('.bande-element')?.focus();
      },
      lignes: () => panneau.informations.map((constat) => creerLigneDInformation(ligneDInformation(constat, contexte), {
        variants: contexte.variants, selectionnes: selectionnes(), inactif: !analyseApplicable(analyse), selectionner,
      })),
    });
  }

  function dessiner(): void {
    if (!rendu) return;
    const { analyse, panneau, cartes, ignores, contexte } = rendu;
    corrections.commencer();
    if (analyse.perimee && analyse.statut !== 'provisoire') {
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
    // Une section tenue dirait que le moteur a tout contrôlé : elle attend le résultat final.
    const provisoire = analyse.statut === 'provisoire';
    const tenus = tout && !provisoire ? panneau.tenus.map(creerSectionTenue) : [];
    const informations = tout && panneau.informations.length > 0 ? [sectionDesInformations(analyse, panneau, contexte)] : [];
    const ignoresMontres = tout ? ignores : ignores.filter((constat) => elementDuConstat(constat) === choisi);
    const visible = tout ? null : { cartes: montres.flatMap(correctionsDe), element: TEXTES.elementsDuPanneau.libelles[choisi] };
    sommaireHote.replaceChildren(...(panneau.elements.length > 0 ? [creerSommaire(panneau.elements, choisi, choisir)] : []));
    listeHote.replaceChildren(...enTete, ...sections, ...tenus, ...informations, ...aFaire.ignores(ignoresMontres), ...(cartes.length > 0 && !provisoire ? [corrections.pied(visible)] : []), ...(!provisoire && analyse.constats.length > 0 ? [pied(analyse)] : []));
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

    /** Le libellé de la phase en cours, la barre et Annuler : les mêmes avant et après les premiers constats. */
    const progressionDe = (enCours: AnalyseRecue['progression']): { readonly libelle: string; readonly barre: HTMLElement; readonly annuler: HTMLElement } => {
      const phase = enCours?.phase ? T.phases[enCours.phase] : enCours ? T.progression(enCours.lus, enCours.total) : P.enCours;
      const libelle = enCours?.fait !== undefined && enCours.total > 0 ? T.compteDeLecture(phase, enCours.fait, enCours.total) : phase;
      const barre = document.createElement('progress');
      barre.className = 'progression-analyse';
      barre.max = 1;
      barre.value = enCours?.fraction ?? 0;
      barre.setAttribute('aria-label', libelle);
      return { libelle, barre, annuler: bouton(TEXTES.annuler, () => app.annulerAnalyse()) };
    };

    if (brute?.statut === 'provisoire' && !brute.perimee) {
      // Les premiers constats sont là, le moteur lit encore : la progression reste, les sections se remplissent, aucune n'est tenue.
      const { libelle, barre, annuler } = progressionDe(brute.progression);
      const { points, enfants: elements } = montrerLesElements(lecture, brute);
      const etatDeLAnalyse = points > 0 ? `${libelle}, ${TEXTES.elementsDuPanneau.points(points)}` : libelle;
      return [resume(lecture, etatDeLAnalyse, brute.variants.length), barre, annuler, creerAlerte('verifier', { texte: T.provisoire }), ...elements];
    }
    if ((brute && calculEnCours(brute)) || demandeDAnalyseEnCours(etat) !== null) {
      const { libelle, barre, annuler } = progressionDe(brute && calculEnCours(brute) ? brute.progression : null);
      return [resume(lecture, libelle), barre, annuler];
    }
    if (brute?.statut === 'arretee') {
      const message = String(brute.constats[0]?.faits.message ?? '');
      return [resume(lecture, T.arretee), creerAlerte('bloquant', { titre: T.arreteTitre, texte: T.arreteTexte(message), meta: T.arreteMeta })];
    }
    if (brute?.statut === 'annulee') return [resume(lecture, T.annulee), creerAlerte('info', { titre: T.annuleeTitre, texte: T.annuleeTexte, meta: T.annuleeMeta })];

    if (brute?.perimee && brute.statut === 'en-cours' && demandeDAnalyseEnCours(etat) === null) {
      return [resume(lecture, P.pasAnalyse), creerAlerte('info', { titre: T.perimeTitre, texte: T.perimeTexte })];
    }
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
    // Un provisoire périmé n'a pas d'heure d'analyse à dire : seuls ses points sont connus.
    const analyseA = analyse.statut === 'provisoire' ? P.pasAnalyse : P.analyseA(heure(analyse.recueA), analyse.dureeMs);
    const etatDeLAnalyse = points > 0 ? `${analyse.statut === 'provisoire' ? '' : `${analyseA}, `}${TEXTES.elementsDuPanneau.points(points)}` : analyseA;
    return [resume(lecture, etatDeLAnalyse, analyse.variants.length), ...alertes, ...elements];
  }

  return {
    element: colonne,
    sommaire: sommaireHote,
    liste: listeHote,
    oublierLaSelection() {
      selectionDuPlugin = [];
    },
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

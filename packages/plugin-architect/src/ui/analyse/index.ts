/**
 * Le panneau des constats du mode Composant : le résumé du composant, puis
 * ce que l'analyse en dit. Chaque état de l'analyse a son écran : aucune
 * sélection, fichier hors UCM, library à choisir, pas encore analysé, en
 * cours, arrêtée, annulée, partielle, sans constat, périmée. Une analyse
 * partielle, annulée ou arrêtée ne dit jamais « aucun constat ».
 *
 * Les trois onglets, Corrections, Questions et À faire dans Figma, portent le
 * compte de ce que leur liste montre. Chacun a son module : `corrections/`,
 * `questions/` et `ignores/` (À faire dans Figma, puis les constats ignorés).
 */
import { creerAlerte } from 'ucm-plugin-socle/src/ui/Alerte';
import { createButton } from 'ucm-plugin-socle/src/ui/Button';
import { createOnglets } from 'ucm-plugin-socle/src/ui/Onglets';

import type { LectureDeComposant } from '../../composant';
import type { Application } from '../application';
import { analyseDuComposant, aDesLiaisonsPreparees, aPreparer, libraryAChoisir, type AnalyseRecue } from '../composant/analyse';
import { monterLesCorrections } from '../corrections';
import { monterAFaire } from '../ignores';
import { monterLesQuestions } from '../questions';
import type { OngletDuPanneau } from '../etat';
import { TEXTES } from '../textes';
import type { VueComposant } from '../vues/composant';
import { estHorsUcm } from '../vues/horsUcm';

const T = TEXTES.panneauDesConstats;
const P = TEXTES.panneau;

const heure = (millisecondes: number): string => new Date(millisecondes).toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' });

export interface PanneauDesConstats {
  readonly element: HTMLElement;
  readonly panneauAFaire: HTMLElement;
  mettreAJour(): void;
  /** Le panneau se ferme : la vue ne montre plus les liaisons à venir. */
  retirerLesLiaisonsDeLaVue(): void;
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

export function monterLePanneau(app: Application, vue: VueComposant): PanneauDesConstats {
  const { etat } = app;
  const colonne = document.createElement('div');
  colonne.className = 'container';
  const pile = document.createElement('div');
  pile.className = 'page-stack';
  colonne.append(pile);

  const panneaux = { corrections: document.createElement('div'), questions: document.createElement('div'), aFaire: document.createElement('div') };
  for (const panneau of Object.values(panneaux)) panneau.className = 'page-stack';
  let synchronise = false;
  const onglets = createOnglets<OngletDuPanneau>(T.etiquetteDesOnglets, [
    { id: 'corrections', libelle: T.ongletCorrections, panneau: panneaux.corrections },
    { id: 'questions', libelle: T.ongletQuestions, panneau: panneaux.questions },
    { id: 'a-faire', libelle: T.ongletAFaire, panneau: panneaux.aFaire },
  ], (id) => {
    if (synchronise) return;
    etat.panneau = { ...etat.panneau, onglet: id };
  });
  const comptes = new Map<OngletDuPanneau, HTMLElement>();
  for (const [id, libelle] of [['corrections', T.ongletCorrections], ['questions', T.ongletQuestions], ['a-faire', T.ongletAFaire]] as const) {
    const bout = onglets.liste.querySelector<HTMLElement>(`#onglet-${id}`) as HTMLElement;
    const pastille = document.createElement('span');
    pastille.className = 'compte';
    pastille.setAttribute('aria-hidden', 'true');
    bout.append(pastille);
    comptes.set(id, pastille);
    bout.dataset.libelle = libelle;
  }

  /** Quand le designer coche ou décoche, la vue Composant montre les liaisons à venir. */
  const corrections = monterLesCorrections(panneaux.corrections, {
    appliquer: (ids, liaisons) => app.appliquer(ids, liaisons),
    selectionner: (layers) => {
      vue.poserLaSelectionDuPlugin(layers);
      app.selectionner(layers);
    },
    ignorer: (constats) => app.ignorerLaProposition(constats),
    auChangement: () => poserLesLiaisonsDansLaVue(),
  });

  const questions = monterLesQuestions(panneaux.questions, {
    repondre: (question, reponse) => app.repondre(question, reponse),
    annuler: (question) => app.annulerLaReponse(question),
    ouvrirCorrections: () => {
      etat.panneau = { ...etat.panneau, onglet: 'corrections' };
      app.rendre(['barre']);
    },
  });
  const aFaire = monterAFaire(panneaux.aFaire, {
    selectionner: (layers) => {
      vue.poserLaSelectionDuPlugin(layers);
      app.selectionner(layers);
    },
    ignorer: (constat) => app.ignorer(constat),
    nePlusIgnorer: (constat) => app.nePlusIgnorer(constat),
  });

  /** Ce que la vue montre déjà des liaisons à venir : la vue ne se redessine que si cela change. */
  let dansLaVue = '[]';
  function poserLesLiaisonsDansLaVue(): void {
    const liaisons = corrections.liaisonsAVenir();
    const cle = JSON.stringify(liaisons);
    if (cle === dansLaVue) return;
    dansLaVue = cle;
    vue.poserLesCorrections(liaisons, (calques) => {
      if (corrections.ouvrirPourLesCalques(calques)) {
        etat.panneau = { ...etat.panneau, onglet: 'corrections' };
        app.rendre(['barre']);
      }
    });
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

  function contexteDe(lecture: LectureDeComposant, analyse: AnalyseRecue): Parameters<typeof corrections.poser>[0]['contexte'] {
    return {
      composant: lecture.sujet.nom,
      variants: [...analyse.variants, ...lecture.sujet.variants.filter((variant) => !analyse.variants.some((lu) => lu.id === variant.id))],
      layers: new Map(lecture.calques.map((calque) => [calque.id, calque.nom])),
      library: etat.reference?.nom ?? null,
      constats: analyse.constats,
    };
  }

  /** Les comptes des trois onglets et leur contenu, pour une analyse rendue. */
  function montrerLesOnglets(lecture: LectureDeComposant, analyse: AnalyseRecue): HTMLElement[] {
    const contexte = contexteDe(lecture, analyse);
    // Une question répondue a déjà sa correction : Corrections la compte et l'applique avec les autres.
    const avecLesReponses = analyse.constats.map((constat) => {
      const reponse = constat.question === undefined ? undefined : analyse.repondues[constat.question.id];
      return reponse === undefined ? constat : { ...constat, correction: reponse };
    });
    corrections.poser({ analyse: { ...analyse, constats: avecLesReponses }, contexte });
    questions.poser({ analyse, contexte });
    aFaire.poser({ analyse, contexte });
    const nombres: Record<OngletDuPanneau, number> = { corrections: corrections.nombre(), questions: questions.nombre(), 'a-faire': aFaire.nombre() };
    for (const [id, pastille] of comptes) {
      pastille.textContent = String(nombres[id]);
      onglets.liste.querySelector(`#onglet-${id}`)?.setAttribute('aria-label', T.nomDeLOnglet(TEXTES.panneauDesConstats[id === 'corrections' ? 'ongletCorrections' : id === 'questions' ? 'ongletQuestions' : 'ongletAFaire'], nombres[id]));
    }
    // Un panneau périmé ne liste plus rien à décider : Corrections dit pourquoi, les deux autres le répètent.
    if (analyse.perimee) {
      panneaux.questions.replaceChildren(note(T.perimeMeta));
      panneaux.aFaire.replaceChildren(note(T.perimeMeta));
    }
    synchronise = true;
    if (onglets.actif() !== etat.panneau.onglet) onglets.selectionner(etat.panneau.onglet);
    synchronise = false;
    return [onglets.liste, panneaux.corrections, panneaux.questions, panneaux.aFaire];
  }

  function enfants(): HTMLElement[] {
    const { lecture } = etat.composant;
    const brute = etat.analyse;
    if (estHorsUcm(etat.architecture)) return [creerAlerte('info', { titre: T.horsUcmTitre, texte: T.horsUcmTexte, actions: [bouton(T.declarer, ouvrirLaConfiguration)] })];
    if (!lecture) return [creerAlerte('info', { texte: T.aucunComposant })];
    const variants = Math.max(1, lecture.sujet.variants.length);

    if (brute?.statut === 'en-cours') {
      const progression = brute.progression ? T.progression(brute.progression.lus, brute.progression.total) : P.enCours;
      return [resume(lecture, progression), note(T.attendreLesConstats)];
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

    const sortie: HTMLElement[] = [resume(lecture, P.analyseA(heure(analyse.recueA)), analyse.variants.length)];
    if (analyse.statut === 'partielle') {
      const lus = analyse.lecture?.layersLus ?? 0;
      const nonLus = analyse.lecture?.layersNonLus;
      const titre = typeof nonLus === 'number' && nonLus > 0 ? T.partielleTitre(lus, lus + nonLus) : T.partielleTitreDesVariants(analyse.variants.length, analyse.variants.length + (analyse.lecture?.variantsNonLus.length ?? 0));
      sortie.push(creerAlerte('verifier', { titre, texte: T.partielleTexte }));
    } else if (analyse.constats.length === 0 && !aPreparer(analyse) && !aDesLiaisonsPreparees(analyse) && !analyse.perimee && analyse.ecriture === null) {
      return [...sortie, creerAlerte('tenu', { titre: T.aucunTitre(lecture.sujet.nom, variants), meta: T.aucunMeta })];
    }
    if (analyse.perimee) sortie.push(creerAlerte('info', { titre: T.perimeTitre, texte: T.perimeTexte }));
    return [...sortie, ...montrerLesOnglets(lecture, analyse)];
  }

  return {
    element: colonne,
    panneauAFaire: panneaux.aFaire,
    retirerLesLiaisonsDeLaVue() {
      if (dansLaVue === '[]') return;
      dansLaVue = '[]';
      vue.poserLesCorrections([], () => {});
    },
    mettreAJour() {
      pile.replaceChildren(...enfants());
      poserLesLiaisonsDansLaVue();
    },
  };
}

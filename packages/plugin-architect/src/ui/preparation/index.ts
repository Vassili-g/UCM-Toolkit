import type { PreparationDesTokens, Question } from '@ucm-kit/core/controles';
import { creerAlerte } from 'ucm-plugin-socle/src/ui/Alerte';
import { createButton } from 'ucm-plugin-socle/src/ui/Button';
import type { ApercusDePreparation, MessageDePreparation, PreparationVue } from '../../messages/preparation';
import { deLAnalyseCourante } from '../composant/analyse';
import type { Etat } from '../etat';
import { TEXTES } from '../textes';
import { TEXTES_PREPARATION as T } from '../textes/preparation';
import { versSandbox } from '../pont';
import { copierTexte } from '../pressePapiers';

export interface Preparation {
  readonly element: HTMLElement;
  readonly panneau: HTMLElement;
  ouvrir(): void;
  /** Ouvre la zone de texte d'une préparation reçue, sans passer par le bouton Préparer les tokens. */
  ouvrirPourColler(): void;
  recevoir(message: MessageDePreparation): void;
  /** Retire l'alerte des liaisons préparées ou du refus : l'analyse qu'elle disait est remplacée ou périmée. */
  retirerLesLiaisons(): void;
}

const titreDeLaQuestion = (question: Question): string => question.indice ?? question.id;

export function monterPreparation(etat: Etat): Preparation {
  const voile = document.createElement('div');
  voile.className = 'prep-voile feuille-terme';
  voile.hidden = true;
  const feuille = document.createElement('section');
  feuille.className = 'prep-feuille feuille';
  feuille.setAttribute('role', 'dialog');
  feuille.setAttribute('aria-modal', 'true');
  const entete = document.createElement('header');
  entete.className = 'prep-entete feuille-entete avec-definition';
  const titre = document.createElement('h2');
  titre.className = 'feuille-titre';
  const titreLigne = document.createElement('div'); titreLigne.className = 'titre-ligne'; titreLigne.append(titre);
  const definition = document.createElement('div'); definition.className = 'titre-et-definition'; definition.append(titreLigne);
  const fermer = document.createElement('button');
  fermer.type = 'button'; fermer.className = 'feuille-fermer'; fermer.textContent = T.preparationSymboleFermer;
  fermer.setAttribute('aria-label', T.preparationFermer);
  fermer.addEventListener('click', () => { voile.hidden = true; });
  entete.append(definition, fermer);
  const description = document.createElement('p');
  description.className = 'meta'; description.textContent = T.preparationDescription;
  definition.append(description);
  const cadreCorps = document.createElement('div'); cadreCorps.className = 'feuille-corps';
  const corps = document.createElement('div'); corps.className = 'prep-corps feuille-contenu'; cadreCorps.append(corps);
  const pied = document.createElement('footer'); pied.className = 'prep-pied feuille-pied';
  const statut = document.createElement('span');
  const coller = createButton({ label: T.preparationColler, variant: 'secondary', compact: true, onClick: () => { rangee = null; modeColle = true; rendre(); } });
  coller.classList.add('prep-coller');
  const preparer = document.createElement('button');
  preparer.type = 'button'; preparer.className = 'btn btn-primary'; preparer.textContent = T.preparationAction;
  preparer.disabled = true;
  pied.append(statut, coller, preparer);
  feuille.append(entete, cadreCorps, pied); voile.append(feuille);

  const panneau = document.createElement('div');
  panneau.className = 'prep-panneau page-stack';
  panneau.hidden = true;
  let plan: PreparationDesTokens | null = null;
  let apercus: ApercusDePreparation = {};
  let mesures: Readonly<Record<string, number>> = {};
  let rangee: PreparationVue | null = null;
  let refus: string | null = null;
  let reponses: Record<string, string> = {};
  let enCours = false;
  let modeColle = false;

  const bouton = (texte: string, action: () => void, nom: string): HTMLButtonElement => {
    const resultat = createButton({ label: texte, variant: 'secondary', compact: true, onClick: action });
    resultat.classList.add(nom);
    return resultat;
  };
  const chemin = (texte: string, parent: HTMLElement): void => {
    texte.split('/').forEach((segment, rang, morceaux) => {
      const partie = document.createElement('span'); partie.className = 'prep-chemin-segment';
      if (rang === morceaux.length - 1) partie.classList.add('prep-chemin-dernier');
      partie.textContent = segment; parent.append(partie);
      if (rang < morceaux.length - 1) { const separateur = document.createElement('span'); separateur.className = 'prep-chemin-separateur'; separateur.textContent = '/'; parent.append(separateur); }
    });
  };
  /** Le titre de chaque question que ces identifiants désignent dans le plan. */
  const titresDesQuestions = (ids: readonly string[]): string[] => ids.map((id) => {
    const question = plan?.questions.find((candidate) => candidate.id === id);
    return question === undefined ? id : titreDeLaQuestion(question);
  });
  // Les questions de dossier portent l'identifiant `dossier:<valeur de style>` (kit, `preparerLesTokens`) : une seule note, sous la première, nomme la palette de l'exemple.
  const noteDuDossier = (questions: readonly Question[]): { question: string; palette: string } | null => {
    for (const question of questions) {
      if (!question.id.startsWith('dossier:')) continue;
      const palette = Object.values(apercus[question.id] ?? {}).flat()[0]?.cible.split('/')[1];
      if (palette) return { question: question.id, palette };
    }
    return null;
  };
  const noteDeLaQuestion = (question: Question, exemple: { question: string; palette: string } | null): string | undefined => {
    if (question.id === 'intensite') return T.preparationNoteIntensite;
    if (question.id.startsWith('nom:')) return T.preparationNoteNom;
    return exemple?.question === question.id ? T.preparationNoteDossier(exemple.palette) : undefined;
  };
  /** Ce qui reste à dire d'une taille : le token vise seul sa valeur, le designer l'a choisi, ou une question le retient. Une taille sans token exact n'est pas une variable : `sansCible` la porte. */
  const noteDeLaTaille = (variable: PreparationDesTokens['variables'][number], mesure: number | undefined): string => {
    if (variable.vise) {
      return reponses[`cible:${variable.nom}`] !== undefined || mesure === undefined ? T.preparationTailleChoisi : T.preparationTailleSeul(variable.vise.nom.split('/')[1] ?? '', mesure);
    }
    const choix = plan?.questions.find((question) => question.id === `cible:${variable.nom}`);
    if (!choix) return T.preparationAttente(titresDesQuestions(variable.attend));
    return T.preparationTaillePlusieurs(choix.candidats.length, mesure);
  };
  /** Les tailles en dur, une ligne par nom et par valeur : plusieurs lieux de même valeur n'en font qu'une. */
  const taillesEnDur = (): { champs: string; famille: string; valeur: number }[] => {
    const lignes = new Map<string, { champs: Set<string>; famille: string; valeur: number }>();
    for (const taille of plan?.sansCible ?? []) {
      const cle = `${taille.nom}|${taille.valeur}`;
      const ligne = lignes.get(cle) ?? { champs: new Set<string>(), famille: taille.famille, valeur: taille.valeur };
      ligne.champs.add(TEXTES.correctionsDuComposant.champDeLaCarte(taille.champ));
      lignes.set(cle, ligne);
    }
    return [...lignes.values()].map(({ champs, famille, valeur }) => ({ champs: [...champs].join(' et '), famille, valeur }));
  };
  const demander = (ranger = false): void => {
    if (!etat.analyse) return;
    enCours = true;
    versSandbox({ type: 'preparer', analyse: etat.analyse.identite, reponses: { ...reponses }, ...(ranger ? { ranger: true } : {}) });
    rendre();
  };
  const creerSection = (titreSection: string, note?: string): HTMLElement => {
    const section = document.createElement('section'); section.className = 'prep-section fiche-bloc';
    const tete = document.createElement('div'); tete.className = 'fiche-bloc-tete';
    const h = document.createElement('h3');
    const variante = /^([^\s=:]+=\S+)(.*)$/.exec(titreSection);
    if (variante) {
      const terme = document.createElement('span'); terme.className = 'prep-variant'; terme.textContent = variante[1];
      h.append(terme, document.createTextNode(variante[2]));
    } else h.textContent = titreSection;
    tete.append(h); section.append(tete);
    if (note) { const aide = document.createElement('p'); aide.className = 'meta'; aide.textContent = note; section.append(aide); }
    return section;
  };

  function rendre(): void {
    panneau.classList.remove('prep-rangee', 'prep-sans-cibles', 'prep-autre', 'prep-liaisons', 'prep-mode-colle');
    const nom = etat.composant.lecture?.sujet.nom ?? rangee?.source.jeu.nom ?? '';
    titre.textContent = T.preparationTitre(nom);
    corps.replaceChildren();
    const nombreDeQuestions = plan ? Math.max(0, plan.questions.length - Object.keys(reponses).length + (Object.keys(reponses).length ? 1 : 0)) : 0;
    statut.textContent = plan ? T.preparationQuestionsRestantes(nombreDeQuestions) : '';
    preparer.disabled = enCours || !plan || plan.variables.length === 0 || plan.questions.length > 0;
    preparer.hidden = rangee !== null || refus !== null;
    coller.hidden = plan !== null || refus !== null || rangee !== null || modeColle;
    if (refus) {
      const message = document.createElement('p'); message.textContent = T.preparationRefus[refus as keyof typeof T.preparationRefus] ?? T.preparationRefus.inconnu; corps.append(message);
    }
    if (plan) {
      const noteDeLExemple = noteDuDossier(plan.questions);
      for (const question of plan.questions) {
        const bloc = creerSection(titreDeLaQuestion(question), noteDeLaQuestion(question, noteDeLExemple));
        bloc.dataset.preparationQuestion = question.id;
        for (const candidat of question.candidats) {
          const choix = document.createElement('label'); choix.className = 'prep-option option-prep';
          const radio = document.createElement('input'); radio.type = 'radio'; radio.name = question.id; radio.value = candidat.nom;
          radio.checked = reponses[question.id] === candidat.nom;
          if (radio.checked) choix.classList.add('prise');
          radio.addEventListener('change', () => { reponses[question.id] = candidat.nom; demander(); });
          const titreOption = document.createElement('span'); titreOption.className = 'titre';
          const terme = document.createElement('span'); terme.className = 'ch'; terme.textContent = candidat.nom;
          const definition = document.createElement('span'); definition.className = 'meta';
          definition.textContent = T.preparationDescriptions[candidat.nom] ?? '';
          titreOption.append(terme, definition);
          choix.append(radio, titreOption);
          const cibles = document.createElement('div'); cibles.className = 'option-cibles';
          for (const detail of apercus[question.id]?.[candidat.nom] ?? []) {
            const ligne = document.createElement('div'); ligne.className = 'prep-cible cible';
            const role = document.createElement('span'); role.textContent = detail.role;
            const puce = document.createElement('span'); puce.className = 'puce-couleur';
            if (detail.couleur !== undefined) puce.style.backgroundColor = detail.couleur;
            const cible = document.createElement('span'); cible.className = 'chemin-ligne'; chemin(detail.cible, cible);
            const cran = document.createElement('span'); cran.className = 'cran';
            cran.textContent = detail.crans ? T.preparationCrans(detail.crans.light, detail.crans.dark) : detail.valeur === undefined ? '' : T.preparationValeurEnPixels(detail.valeur);
            ligne.append(role, puce, cible, cran); cibles.append(ligne);
          }
          choix.append(cibles);
          bloc.append(choix);
        }
        corps.append(bloc);
      }
      const enDur = taillesEnDur();
      if (plan.variables.some((variable) => variable.type === 'FLOAT') || enDur.length > 0) {
        const tailles = creerSection(T.preparationTaillesTitre);
        const liste = document.createElement('div'); liste.className = 'fiche-liste';
        const enTete = document.createElement('div'); enTete.className = 'colonnes-tete sans-case';
        const propriete = document.createElement('span'); propriete.textContent = T.preparationTaillesColonneFigma;
        const token = document.createElement('span'); token.textContent = T.preparationTaillesColonneToken;
        enTete.append(propriete, token); liste.append(enTete);
        for (const variable of plan.variables.filter((candidate) => candidate.type === 'FLOAT')) {
          const mesure = mesures[variable.nom] ?? variable.vise?.valeur;
          const champs = [...new Set(variable.concerne.map((lieu) => TEXTES.correctionsDuComposant.champDeLaCarte(lieu.champ)))].join(' et ');
          const ligne = document.createElement('div'); ligne.className = 'diff sans-case';
          const libelle = document.createElement('span'); libelle.className = 'chemin'; libelle.textContent = T.preparationTaillePropriete(champs, mesure);
          const cible = document.createElement('span'); cible.className = 'chemin-apres';
          if (variable.vise) { chemin(variable.vise.nom, cible); cible.append(document.createElement('br')); }
          const note = document.createElement('span'); note.className = 'meta'; note.textContent = noteDeLaTaille(variable, mesure);
          cible.append(note); ligne.append(libelle, cible); liste.append(ligne);
        }
        for (const taille of enDur) {
          const ligne = document.createElement('div'); ligne.className = 'diff sans-case'; ligne.dataset.preparationEnDur = 'oui';
          const libelle = document.createElement('span'); libelle.className = 'chemin'; libelle.textContent = T.preparationTaillePropriete(taille.champs, taille.valeur);
          const cible = document.createElement('span'); cible.className = 'chemin-apres';
          const note = document.createElement('span'); note.className = 'meta'; note.textContent = T.preparationTailleEnDur(taille.famille, taille.valeur);
          cible.append(note); ligne.append(libelle, cible); liste.append(ligne);
        }
        tailles.append(liste);
        if (enDur.length > 0) { const reste = document.createElement('p'); reste.className = 'meta'; reste.dataset.preparationResteEnDur = 'oui'; reste.textContent = T.preparationResteEnDur(enDur.length); tailles.append(reste); }
        corps.append(tailles);
      }
      if (plan.variables.length) {
        const section = creerSection(T.preparationTableTitre(plan.variables.length));
        const metaSection = document.createElement('span'); metaSection.className = 'meta'; metaSection.textContent = T.preparationTableMeta(plan.variables.filter((variable) => variable.vise !== null).length);
        section.querySelector('.fiche-bloc-tete')?.append(metaSection);
        const liste = document.createElement('div'); liste.className = 'fiche-liste';
        const enteteTable = document.createElement('div'); enteteTable.className = 'colonnes-tete sans-case';
        const enteteVariable = document.createElement('span'); enteteVariable.textContent = T.preparationTableVariable;
        const enteteVise = document.createElement('span'); enteteVise.textContent = T.preparationTableVise;
        enteteTable.append(enteteVariable, enteteVise); liste.append(enteteTable);
        for (const variable of plan.variables) {
          const ligne = document.createElement('div'); ligne.className = 'diff sans-case';
          const nom = document.createElement('span'); nom.className = 'chemin'; chemin(variable.nom.replace(/^components\//, ''), nom);
          const cible = document.createElement('span'); cible.className = 'chemin-apres';
          if (variable.vise?.nom) chemin(variable.vise.nom, cible); else { const attente = document.createElement('span'); attente.className = 'meta'; attente.textContent = T.preparationAttente(titresDesQuestions(variable.attend)); cible.append(attente); }
          ligne.append(nom, cible); liste.append(ligne);
        }
        section.append(liste);
        corps.append(section);
      }
    }
    if (modeColle) {
      voile.hidden = true;
      panneau.classList.add('prep-mode-colle');
      panneau.hidden = false; panneau.replaceChildren();
      const section = creerSection(T.preparationZoneTexte, T.preparationDescriptionColler);
      const zone = document.createElement('textarea'); zone.setAttribute('aria-label', T.preparationZoneTexte);
      zone.placeholder = T.preparationEmplacementTexte;
      const lire = createButton({ label: T.preparationLire, variant: 'secondary', compact: true, onClick: () => versSandbox({ type: 'lire-texte', texte: zone.value }) });
      lire.classList.add('prep-lire');
      section.append(zone, lire);
      if (refus) section.append(creerAlerte('info', { texte: T.preparationRefus[refus as keyof typeof T.preparationRefus] ?? T.preparationRefus.inconnu }));
      panneau.append(section);
      return;
    }
    if (rangee) {
      const total = rangee.variables.length;
      const nomRangee = rangee.source.jeu.nom;
      panneau.classList.add('prep-rangee');
      panneau.hidden = false; panneau.replaceChildren();
      const copier = bouton(T.preparationCopie, () => versSandbox({ type: 'copier-preparation', preparation: rangee!.id }), 'prep-copier'); copier.className = 'btn-texte prep-copier';
      const abandonner = bouton(T.preparationAbandonner, () => versSandbox({ type: 'abandonner-preparation', preparation: rangee!.id }), 'prep-abandonner'); abandonner.className = 'btn-texte prep-abandonner';
      const resume = creerAlerte('tenu', { titre: T.preparationPreparees(total, nomRangee), texte: T.preparationAutreFichier, meta: T.preparationResumeRangee, actions: [copier, abandonner] });
      panneau.append(resume);
      voile.hidden = true;
      preparer.hidden = true;
      return;
    }
    voile.hidden = modeColle || !voile.dataset.ouverte;
    panneau.hidden = true;
  }

  preparer.addEventListener('click', () => demander(true));
  return {
    element: voile,
    panneau,
    ouvrir() {
      panneau.classList.remove('prep-rangee', 'prep-sans-cibles', 'prep-autre', 'prep-liaisons', 'prep-mode-colle');
      const boiteDuPanneau = document.querySelector('.arch-laterale')?.getBoundingClientRect();
      feuille.style.left = `${Math.max(12, (boiteDuPanneau?.left ?? 0) + 12)}px`;
      voile.dataset.ouverte = 'oui'; voile.hidden = false; panneau.hidden = true;
      plan = null; apercus = {}; mesures = {}; rangee = null; refus = null; reponses = {}; modeColle = false; enCours = false;
      versSandbox({ type: 'lire-preparations' });
      demander();
    },
    ouvrirPourColler() {
      panneau.classList.remove('prep-rangee', 'prep-sans-cibles', 'prep-autre', 'prep-liaisons');
      voile.hidden = true; voile.dataset.ouverte = 'oui';
      plan = null; apercus = {}; mesures = {}; rangee = null; refus = null; reponses = {}; modeColle = true; enCours = false;
      rendre();
    },
    retirerLesLiaisons() {
      if (!panneau.classList.contains('prep-liaisons') && !panneau.classList.contains('prep-autre')) return;
      panneau.classList.remove('prep-liaisons', 'prep-autre');
      panneau.replaceChildren();
      panneau.hidden = true;
    },
    recevoir(message) {
      // Une lecture que le designer n'a pas demandée ne rouvre pas le panneau : le mode Tokens lit les préparations dès l'ouverture du plugin.
      if (message.type === 'preparations' && message.nouvelle === undefined && voile.dataset.ouverte === undefined) return;
      if (message.type === 'plan-de-preparation') {
        plan = message.plan; refus = message.refus; enCours = false; apercus = message.apercus; mesures = message.mesures;
        if (message.refus === 'sans-cibles') { voile.hidden = true; panneau.hidden = false; panneau.classList.add('prep-sans-cibles'); panneau.replaceChildren();
          // Ce refus tombe avant le calcul du plan : il ne dit pas combien de variables attendent.
          const composant = etat.composant.lecture?.sujet.nom;
          panneau.append(creerAlerte('info', {
            ...(composant === undefined ? {} : { titre: T.preparationVariablesACreerSansCompte(composant) }),
            texte: T.preparationRefus['sans-cibles'], meta: T.preparationOuvrirFichierDesTokens,
          }));
        } else rendre();
      } else if (message.type === 'preparations') {
        rangee = message.preparations.find((item) => item.id === message.nouvelle) ?? message.preparations[0] ?? null; enCours = false; rendre();
      } else if (message.type === 'preparation-texte') {
        void copierTexte(message.texte).then((issue) => {
          if (issue === 'refusee') {
            refus = 'illisible';
            modeColle = true;
            rendre();
          }
        });
      } else if (message.type === 'texte-refuse') { refus = message.motif; modeColle = true; rendre(); }
      else if (message.type === 'liaisons-preparees') {
        // La réponse d'une autre analyse, remplacée depuis, ne dit rien de celle-ci.
        if (!deLAnalyseCourante(etat, message.analyse)) return;
        const composant = etat.composant.lecture?.sujet.nom;
        const deLaPreparation = etat.preparations.find((candidate) => candidate.id === message.preparation)?.source.jeu.nom;
        const alerte = message.refus === 'autre-composant'
          ? creerAlerte('info', { titre: T.preparationAutresComposants(deLaPreparation), texte: T.preparationSelectionnerLeComposant(deLaPreparation) })
          : message.refus !== null
            ? creerAlerte('info', { texte: T.preparationRefus[message.refus] ?? T.preparationRefus.inconnu })
            // Sans liaison cochable, il n'y a rien de prêt à annoncer : le panneau reste tel qu'il est.
            : composant === undefined || message.corrections.length === 0 ? null : creerAlerte('tenu', { texte: T.preparationLiaisonsPubliees(composant, message.corrections.length) });
        if (alerte === null) return;
        panneau.classList.remove('prep-rangee', 'prep-sans-cibles', 'prep-autre', 'prep-liaisons');
        const autreComposant = message.refus === 'autre-composant';
        if (autreComposant) panneau.classList.add('prep-autre');
        else panneau.classList.add('prep-liaisons');
        panneau.hidden = false;
        panneau.replaceChildren(alerte);
        voile.hidden = true;
      } else if (message.type === 'variables-creees') {
        const composant = rangee?.source.jeu.nom ?? etat.composant.lecture?.sujet.nom;
        panneau.replaceChildren(...(composant === undefined ? [] : [creerAlerte('tenu', { titre: T.preparationVariablesCreees(message.creees, composant), meta: T.preparationAnnulerCreation })]));
        panneau.hidden = false;
      }
    },
  };
}

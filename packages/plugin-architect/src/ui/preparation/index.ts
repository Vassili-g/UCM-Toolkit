import type { PreparationDesTokens } from '@ucm-kit/core/controles';
import { creerAlerte } from 'ucm-plugin-socle/src/ui/Alerte';
import { createButton } from 'ucm-plugin-socle/src/ui/Button';
import type { MessageDePreparation, PreparationVue } from '../../messages/preparation';
import type { Etat } from '../etat';
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
}

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
    const variante = /^(Style=[^ ]+)(.*)$/.exec(titreSection);
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
      for (const question of plan.questions) {
        const bloc = creerSection(question.indice ?? question.id, T.preparationNotes[question.id]);
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
          for (const detail of T.preparationCibles[question.id]?.[candidat.nom] ?? []) {
            const ligne = document.createElement('div'); ligne.className = 'prep-cible cible';
            const role = document.createElement('span'); role.textContent = detail.role;
            const puce = document.createElement('span'); puce.className = 'puce-couleur'; puce.style.backgroundColor = detail.couleur;
            const cible = document.createElement('span'); cible.className = 'chemin-ligne'; chemin(detail.cible, cible);
            const cran = document.createElement('span'); cran.className = 'cran'; cran.textContent = detail.cran;
            ligne.append(role, puce, cible, cran); cibles.append(ligne);
          }
          choix.append(cibles);
          bloc.append(choix);
        }
        corps.append(bloc);
      }
      if (plan.variables.some((variable) => variable.type === 'FLOAT')) {
        const tailles = creerSection(T.preparationTaillesTitre);
        const liste = document.createElement('div'); liste.className = 'fiche-liste';
        const enTete = document.createElement('div'); enTete.className = 'colonnes-tete sans-case';
        const propriete = document.createElement('span'); propriete.textContent = T.preparationTaillesColonneFigma;
        const token = document.createElement('span'); token.textContent = T.preparationTaillesColonneToken;
        enTete.append(propriete, token); liste.append(enTete);
        for (const donnee of T.preparationTaillesLignes) {
          const ligne = document.createElement('div'); ligne.className = 'diff sans-case';
          const libelle = document.createElement('span'); libelle.className = 'chemin'; libelle.textContent = donnee.propriete;
          const cible = document.createElement('span'); cible.className = 'chemin-apres';
          if (donnee.token) { chemin(donnee.token, cible); cible.append(document.createElement('br')); }
          const note = document.createElement('span'); note.className = 'meta'; note.textContent = donnee.note;
          cible.append(note); ligne.append(libelle, cible); liste.append(ligne);
        }
        tailles.append(liste); corps.append(tailles);
      }
      if (plan.variables.length) {
        const section = creerSection(T.preparationTableTitre(plan.variables.length));
        const metaSection = document.createElement('span'); metaSection.className = 'meta'; metaSection.textContent = T.preparationTableMeta;
        section.querySelector('.fiche-bloc-tete')?.append(metaSection);
        const liste = document.createElement('div'); liste.className = 'fiche-liste';
        const enteteTable = document.createElement('div'); enteteTable.className = 'colonnes-tete sans-case';
        const enteteVariable = document.createElement('span'); enteteVariable.textContent = T.preparationTableVariable;
        const enteteVise = document.createElement('span'); enteteVise.textContent = T.preparationTableVise;
        enteteTable.append(enteteVariable, enteteVise); liste.append(enteteTable);
        for (const variable of plan.variables.slice(0, 2)) {
          const ligne = document.createElement('div'); ligne.className = 'diff sans-case';
          const nom = document.createElement('span'); nom.className = 'chemin'; chemin(variable.nom.replace(/^components\//, ''), nom);
          const cible = document.createElement('span'); cible.className = 'chemin-apres';
          if (variable.vise?.nom) chemin(variable.vise.nom, cible); else { const attente = document.createElement('span'); attente.className = 'meta'; attente.textContent = T.preparationAttenteOutline; cible.append(attente); }
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
      zone.textContent = T.preparationExempleTexte;
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
      plan = null; rangee = null; refus = null; reponses = {}; modeColle = false; enCours = false;
      versSandbox({ type: 'lire-preparations' });
      demander();
    },
    ouvrirPourColler() {
      panneau.classList.remove('prep-rangee', 'prep-sans-cibles', 'prep-autre', 'prep-liaisons');
      voile.hidden = true; voile.dataset.ouverte = 'oui';
      plan = null; rangee = null; refus = null; reponses = {}; modeColle = true; enCours = false;
      rendre();
    },
    recevoir(message) {
      // Une lecture que le designer n'a pas demandée ne rouvre pas le panneau : le mode Tokens lit les préparations dès l'ouverture du plugin.
      if (message.type === 'preparations' && message.nouvelle === undefined && voile.dataset.ouverte === undefined) return;
      if (message.type === 'plan-de-preparation') {
        plan = message.plan; refus = message.refus; enCours = false;
        if (message.refus === 'sans-cibles') { voile.hidden = true; panneau.hidden = false; panneau.classList.add('prep-sans-cibles'); panneau.replaceChildren();
          panneau.append(creerAlerte('info', {
            titre: T.preparationVariablesACreer(plan?.variables.length ?? 16, etat.composant.lecture?.sujet.nom ?? 'Tag'),
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
        panneau.classList.remove('prep-rangee', 'prep-sans-cibles');
        refus = message.refus;
        if (message.refus === 'autre-composant') {
          panneau.classList.add('prep-autre');
          panneau.hidden = false; panneau.replaceChildren();
          panneau.append(creerAlerte('info', { titre: T.preparationAutresComposants, texte: T.preparationSelectionnerLeComposant })); voile.hidden = true;
        } else {
          panneau.classList.add('prep-liaisons');
          panneau.hidden = false;
          panneau.replaceChildren(creerAlerte('tenu', { texte: T.preparationLiaisonsPubliees(etat.composant.lecture?.sujet.nom ?? 'Tag', message.corrections.length) }));
          voile.hidden = true;
        }
      } else if (message.type === 'variables-creees') {
        const resultat = creerAlerte('tenu', { titre: T.preparationVariablesCreees(message.creees, rangee?.source.jeu.nom ?? 'Tag'), meta: T.preparationAnnulerCreation });
        panneau.replaceChildren(resultat); panneau.hidden = false;
      }
    },
  };
}

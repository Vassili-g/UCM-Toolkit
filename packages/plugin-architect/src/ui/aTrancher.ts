/**
 * Le contenu de l'onglet À trancher : une carte par question, la ligne de
 * réussite qui prend la place d'une carte répondue, la carte d'un conflit,
 * puis les sections « Plus tard » et « Autres pistes ». Ce qu'une carte affiche
 * et la réponse de chaque bouton viennent de `questions.ts`.
 */
import { createButton } from 'ucm-plugin-socle/src/ui/Button';
import type { Bilan, ConflitVue, GesteSurLesRegles, LigneVue, QuestionVue, Reponse } from '../messages';
import type { Coquille } from './coquille';
import {
  carteDeConflit,
  carteDeQuestion,
  champAutreTerme,
  composerLaListe,
  ligneDeReprise,
  ligneFaite,
  type ActionDeCarte,
  type ColonneDeCarte,
  type LigneFaite,
  type PiedDeCarte,
} from './questions';
import { TEXTES } from './textes';

/** Une entrée de la liste : son élément, et ce que l'écran peut en faire. */
interface Entree {
  readonly element: HTMLElement;
  /** Désactive les boutons pendant qu'une demande est en vol. */
  figer(): void;
  /** `autre-terme` rend le focus au bouton qui a ouvert le champ. */
  focaliser(sur?: 'autre-terme'): void;
}

/** Ce que l'écran attend du sandbox, par numéro de demande. */
type Attente =
  | { readonly sorte: 'repondre'; readonly question: QuestionVue; readonly reponse: Reponse }
  | { readonly sorte: 'regle'; readonly cle: string; readonly nature: 'annuler' | 'ecart' | 'reprendre' };

type QuestionDePaire = Extract<QuestionVue, { type: 'paire' }>;

/** Un texte entre accents graves met ces mots en code (voir `textes.ts`). */
function poserLeTexte(element: HTMLElement, texte: string): void {
  element.replaceChildren(
    ...texte.split('`').map((morceau, rang) => {
      if (rang % 2 === 0) return document.createTextNode(morceau);
      const code = document.createElement('code');
      code.textContent = morceau;
      return code;
    }),
  );
}

function fabriquerChemin(ligne: LigneVue): HTMLElement {
  const chemin = document.createElement('span');
  chemin.className = 'chemin';
  ligne.ancien.split('/').forEach((segment, rang) => {
    if (rang > 0) chemin.append(document.createTextNode('/'));
    if (ligne.marques.includes(rang)) {
      const marque = document.createElement('mark');
      marque.textContent = segment;
      chemin.append(marque);
    } else chemin.append(document.createTextNode(segment));
  });
  return chemin;
}

/** « avant → après », ou le seul terme quand la réponse n'en remplace aucun. */
function fabriquerChange(avant: string, separateur: '→' | '≠' | null, apres: string | null): HTMLElement {
  const change = document.createElement('span');
  change.className = 'change';
  const codeAvant = document.createElement('code');
  codeAvant.textContent = avant;
  change.append(codeAvant);
  if (separateur !== null && apres !== null) {
    codeAvant.className = 'avant';
    const fleche = document.createElement('span');
    fleche.className = 'fleche';
    fleche.textContent = separateur;
    const codeApres = document.createElement('code');
    codeApres.className = 'apres';
    codeApres.textContent = apres;
    change.append(fleche, codeApres);
  }
  return change;
}

function fabriquerPastille(texte: string, ucm = false): HTMLElement {
  const pastille = document.createElement('span');
  pastille.className = 'pastille';
  pastille.classList.add(ucm ? 'pastille-ucm' : 'pastille-indice');
  pastille.textContent = texte;
  return pastille;
}

function fabriquerBouton(libelle: string, poids: ActionDeCarte['poids'], auClic: () => void): HTMLButtonElement {
  return createButton({ label: libelle, variant: poids === 'principal' ? 'primary' : 'secondary', compact: true, onClick: auClic });
}

function fabriquerBoutonTexte(libelle: string, auClic: () => void): HTMLButtonElement {
  const bouton = document.createElement('button');
  bouton.type = 'button';
  bouton.className = 'btn-texte';
  bouton.textContent = libelle;
  bouton.addEventListener('click', auClic);
  return bouton;
}

function fabriquerEntete(titre: string, indice: string | null): HTMLElement {
  const entete = document.createElement('div');
  entete.className = 'question-entete';
  const intitule = document.createElement('span');
  intitule.className = 'question-titre';
  intitule.textContent = titre;
  entete.append(intitule);
  if (indice !== null) entete.append(fabriquerPastille(indice));
  return entete;
}

/** La rangée de pied : les boutons à gauche, un bouton texte ou rien à droite. */
function fabriquerPied(gauche: readonly HTMLElement[], droite: readonly HTMLElement[]): HTMLElement {
  const pied = document.createElement('div');
  pied.className = 'question-pied';
  const actions = document.createElement('span');
  actions.className = 'question-actions';
  actions.append(...gauche);
  const fin = document.createElement('span');
  fin.className = 'question-actions';
  fin.append(...droite);
  pied.append(actions, fin);
  return pied;
}

function fabriquerEffet(avant: string, apres: string, detail: string): { readonly element: HTMLElement; poser(avant: string, apres: string, detail: string): void } {
  const element = document.createElement('div');
  element.className = 'effet';
  const note = document.createElement('span');
  note.className = 'meta';
  function poser(nouvelAvant: string, nouvelApres: string, nouveauDetail: string): void {
    element.replaceChildren(fabriquerChange(nouvelAvant, '→', nouvelApres), note);
    note.textContent = nouveauDetail;
  }
  poser(avant, apres, detail);
  return { element, poser };
}

function fabriquerColonne(colonne: ColonneDeCarte, agir: (action: ActionDeCarte) => void, boutons: HTMLButtonElement[]): HTMLElement {
  const element = document.createElement('div');
  element.className = 'colonne';
  if (colonne.propose) element.classList.add('propose');
  const entete = document.createElement('div');
  entete.className = 'colonne-entete';
  const mot = document.createElement('code');
  mot.className = 'mot';
  mot.textContent = colonne.terme;
  entete.append(mot);
  if (colonne.ucm) entete.append(fabriquerPastille(TEXTES.pastilleUcm, true));
  const detail = document.createElement('span');
  detail.className = 'meta';
  detail.textContent = colonne.detail;
  const garder = fabriquerBouton(colonne.garder.libelle, colonne.garder.poids, () => agir(colonne.garder));
  boutons.push(garder);
  element.append(entete, detail);
  if (colonne.exemple) element.append(fabriquerChemin(colonne.exemple));
  element.append(garder);
  return element;
}

/**
 * Monte l'onglet dans `coquille.panneaux.aTrancher.contenu`. Un `bilan` rebâtit
 * la liste ; la réponse acceptée à une demande de l'onglet réduit sa carte à
 * une ligne, qui disparaît au changement d'onglet.
 */
export function monterATrancher(coquille: Coquille): void {
  const { frontiere } = coquille;
  const panneau = coquille.panneaux.aTrancher;
  const questions = new Map<string, QuestionVue>();
  let plusTard: readonly QuestionVue[] = [];
  let autresPistes = 0;
  let plusTardOuvert = false;
  /** Les clés affichées, dans l'ordre : une ligne de réussite retrouve ainsi la place de sa carte. */
  let ordre: string[] = [];
  let entrees = new Map<string, Entree>();
  const lignes = new Map<string, LigneFaite>();
  const conflits = new Map<string, readonly ConflitVue[]>();
  /** Le champ « Autre terme… » ouvert sur une carte, avec ce que le designer y a tapé. */
  const saisies = new Map<string, string>();
  const attentes = new Map<number, Attente>();
  const enCours = new Set<string>();
  let aFocaliser: { readonly cle: string; readonly sur?: 'autre-terme' } | null = null;

  const message = document.createElement('div');
  message.className = 'etat-erreur';
  message.setAttribute('role', 'alert');
  message.hidden = true;
  const liste = document.createElement('div');
  liste.className = 'liste';
  const sectionPlusTard = document.createElement('div');
  const sectionPistes = document.createElement('div');
  panneau.contenu.append(message, liste, sectionPlusTard, sectionPistes);

  function dire(texte: string | null): void {
    message.hidden = texte === null;
    message.textContent = texte ?? '';
  }

  /** Envoie la réponse et rend `true` ; une demande déjà en vol pour cette question n'en part pas une seconde. */
  function repondre(question: QuestionVue, reponse: Reponse): boolean {
    if (enCours.has(question.cle)) return false;
    dire(null);
    enCours.add(question.cle);
    attentes.set(frontiere.repondre(question.cle, reponse), { sorte: 'repondre', question, reponse });
    return true;
  }

  function demanderUnGeste(cle: string, geste: GesteSurLesRegles, nature: 'annuler' | 'ecart' | 'reprendre'): boolean {
    if (enCours.has(cle)) return false;
    dire(null);
    enCours.add(cle);
    attentes.set(frontiere.regle(geste), { sorte: 'regle', cle, nature });
    return true;
  }

  function creerCarte(question: QuestionVue): Entree {
    const carte = carteDeQuestion(question);
    const element = document.createElement('div');
    element.className = 'carte question';
    const boutons: HTMLButtonElement[] = [];
    const parId = new Map<ActionDeCarte['id'], HTMLButtonElement>();
    let choix: HTMLSelectElement | null = null;

    function agir(action: ActionDeCarte): void {
      const { suite } = action;
      if (suite.sorte === 'repondre') {
        if (repondre(question, suite.reponse)) figer();
      } else if (suite.sorte === 'saisir') {
        saisies.set(question.cle, '');
        aFocaliser = { cle: question.cle };
        rendre();
      } else if (choix && choix.value !== '' && repondre(question, suite.reponse(choix.value))) {
        figer();
      }
    }
    function figer(): void {
      for (const bouton of boutons) bouton.disabled = true;
      if (choix) choix.disabled = true;
    }
    function fabriquerLePied(pied: PiedDeCarte): HTMLElement {
      const gauche = pied.actions.map((action) => {
        const bouton = fabriquerBouton(action.libelle, action.poids, () => agir(action));
        boutons.push(bouton);
        parId.set(action.id, bouton);
        return bouton;
      });
      const plusTardDeLaCarte = fabriquerBoutonTexte(pied.plusTard.libelle, () => agir(pied.plusTard));
      boutons.push(plusTardDeLaCarte);
      return fabriquerPied(gauche, [plusTardDeLaCarte]);
    }

    element.append(fabriquerEntete(carte.question, carte.indice));
    if (carte.forme === 'face-a-face') {
      const face = document.createElement('div');
      face.className = 'face';
      face.append(...carte.colonnes.map((colonne) => fabriquerColonne(colonne, agir, boutons)));
      element.append(face);
      if (carte.preuve !== null) {
        const preuve = document.createElement('span');
        preuve.className = 'meta';
        preuve.textContent = carte.preuve;
        element.append(preuve);
      }
    } else if (carte.forme === 'avant-apres') {
      element.append(fabriquerEffet(carte.avant, carte.apres, carte.detail).element);
    } else {
      const ligne = document.createElement('div');
      ligne.className = 'question-collection';
      const nom = document.createElement('code');
      nom.className = 'mot';
      nom.textContent = carte.nom;
      const fleche = document.createElement('span');
      fleche.className = 'fleche';
      fleche.textContent = '→';
      const selecteur = document.createElement('select');
      selecteur.className = 'input choix-collection';
      selecteur.setAttribute('aria-label', TEXTES.collectionUcm);
      if (carte.choix === null) {
        const invitation = document.createElement('option');
        invitation.value = '';
        invitation.textContent = TEXTES.choisirUneCollection;
        selecteur.append(invitation);
      }
      for (const collection of carte.options) {
        const option = document.createElement('option');
        option.value = collection;
        option.textContent = collection;
        selecteur.append(option);
      }
      selecteur.value = carte.choix ?? '';
      choix = selecteur;
      ligne.append(nom, fleche, selecteur);
      element.append(ligne);
    }
    element.append(fabriquerLePied(carte.pied));

    const renommer = parId.get('renommer');
    if (choix && renommer) {
      const ouvert = choix;
      const synchroniser = (): void => {
        renommer.disabled = ouvert.value === '';
      };
      ouvert.addEventListener('change', synchroniser);
      synchroniser();
    }

    return {
      element,
      figer,
      focaliser(sur) {
        const cible = sur === 'autre-terme' ? parId.get('autre-terme') : undefined;
        (cible ?? element.querySelector('button'))?.focus();
      },
    };
  }

  function creerCarteDeSaisie(question: QuestionDePaire): Entree {
    const champ = champAutreTerme(question);
    const element = document.createElement('div');
    element.className = 'carte question';
    const titre = document.createElement('span');
    titre.className = 'question-titre';
    titre.textContent = champ.question;
    const saisie = document.createElement('input');
    saisie.type = 'text';
    saisie.className = 'input';
    saisie.setAttribute('aria-label', champ.libelle);
    saisie.value = saisies.get(question.cle) ?? '';
    const initial = champ.effet(saisie.value);
    const effet = fabriquerEffet(initial.avant, initial.apres, initial.detail);
    effet.element.hidden = saisie.value.trim() === '';

    const retour = fabriquerBouton(TEXTES.retour, 'secondaire', () => {
      saisies.delete(question.cle);
      aFocaliser = { cle: question.cle, sur: 'autre-terme' };
      rendre();
    });
    const enregistrer = fabriquerBouton(TEXTES.enregistrer, 'principal', enregistrerLaSaisie);
    enregistrer.disabled = champ.reponse(saisie.value) === null;

    function enregistrerLaSaisie(): void {
      const reponse = champ.reponse(saisie.value);
      if (reponse && repondre(question, reponse)) figer();
    }
    function figer(): void {
      saisie.disabled = true;
      retour.disabled = true;
      enregistrer.disabled = true;
    }
    saisie.addEventListener('input', () => {
      saisies.set(question.cle, saisie.value);
      const vide = saisie.value.trim() === '';
      effet.element.hidden = vide;
      enregistrer.disabled = vide;
      if (!vide) {
        const { avant, apres, detail } = champ.effet(saisie.value);
        effet.poser(avant, apres, detail);
      }
    });
    saisie.addEventListener('keydown', (evenement) => {
      if (evenement.key === 'Enter' && !enregistrer.disabled) {
        evenement.preventDefault();
        enregistrerLaSaisie();
      }
    });

    element.append(titre, saisie, effet.element, fabriquerPied([], [retour, enregistrer]));
    return { element, figer, focaliser: () => saisie.focus() };
  }

  function creerCarteDeConflit(cle: string, lesConflits: readonly ConflitVue[]): Entree {
    const carte = carteDeConflit(lesConflits);
    const element = document.createElement('div');
    element.className = 'carte question';
    element.classList.add('question-alerte');
    const titre = document.createElement('span');
    titre.className = 'question-titre';
    titre.textContent = carte.titre;
    element.append(titre);
    const boutons: HTMLButtonElement[] = [];
    const ecarts: HTMLButtonElement[] = [];
    const dejaVus = new Set<string>();
    for (const bloc of carte.blocs) {
      const effet = document.createElement('div');
      effet.className = 'effet';
      if (bloc.avant !== null && bloc.apres !== null) effet.append(fabriquerChange(bloc.avant, '→', bloc.apres));
      const explication = document.createElement('span');
      explication.className = 'meta';
      poserLeTexte(explication, bloc.explication);
      effet.append(explication);
      element.append(effet);
      const { termeUcm } = bloc;
      if (termeUcm !== null && !dejaVus.has(termeUcm)) {
        dejaVus.add(termeUcm);
        const ecart = fabriquerBoutonTexte(TEXTES.nePasAppliquer(termeUcm), () => {
          if (demanderUnGeste(cle, { type: 'ecart-ucm', terme: termeUcm, actif: true }, 'ecart')) figer();
        });
        ecarts.push(ecart);
        boutons.push(ecart);
      }
    }
    const retour = fabriquerBouton(TEXTES.retour, 'secondaire', () => {
      conflits.delete(cle);
      aFocaliser = { cle };
      rendre();
    });
    boutons.push(retour);
    function figer(): void {
      for (const bouton of boutons) bouton.disabled = true;
    }
    element.append(fabriquerPied(ecarts, [retour]));
    return { element, figer, focaliser: () => retour.focus() };
  }

  function creerLigneDeReussite(cle: string, ligne: LigneFaite): Entree {
    const element = document.createElement('div');
    element.className = 'resultat';
    element.setAttribute('role', 'status');
    const texte = document.createElement('span');
    texte.className = 'faite-texte';
    const coche = document.createElement('span');
    coche.setAttribute('aria-hidden', 'true');
    coche.textContent = '✓';
    const detail = document.createElement('span');
    detail.className = 'meta';
    detail.textContent = ligne.detail;
    texte.append(coche, fabriquerChange(ligne.avant, ligne.separateur, ligne.apres), detail);
    const annuler = document.createElement('button');
    annuler.type = 'button';
    annuler.className = 'resultat-action';
    annuler.textContent = TEXTES.annuler;
    annuler.setAttribute('aria-label', TEXTES.annulerLaReponse(ligne.avant, ligne.apres));
    annuler.addEventListener('click', () => {
      if (demanderUnGeste(cle, { type: 'annuler-reponse', question: cle }, 'annuler')) annuler.disabled = true;
    });
    element.append(texte, annuler);
    return {
      element,
      figer: () => {
        annuler.disabled = true;
      },
      focaliser: () => annuler.focus(),
    };
  }

  function construire(cle: string): Entree | null {
    const ligne = lignes.get(cle);
    if (ligne) return creerLigneDeReussite(cle, ligne);
    const question = questions.get(cle);
    if (!question) return null;
    const lesConflits = conflits.get(cle);
    if (lesConflits) return creerCarteDeConflit(cle, lesConflits);
    if (question.type === 'paire' && saisies.has(cle)) return creerCarteDeSaisie(question);
    return creerCarte(question);
  }

  function creerSectionPlusTard(): HTMLElement {
    const element = document.createElement('div');
    element.className = 'carte';
    const tete = document.createElement('div');
    tete.className = 'tete sans-coche';
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'tete-bouton';
    const titre = document.createElement('span');
    titre.className = 'plus-tard-titre';
    titre.textContent = TEXTES.sectionPlusTard(plusTard.length);
    const chevron = document.createElement('span');
    chevron.className = 'chevron';
    chevron.setAttribute('aria-hidden', 'true');
    bouton.append(titre, chevron);
    tete.append(bouton);

    const corps = document.createElement('div');
    corps.className = 'corps';
    for (const question of plusTard) {
      const reprise = ligneDeReprise(question);
      const rang = document.createElement('div');
      rang.className = 'plus-tard-rang';
      const reprendre = fabriquerBouton(TEXTES.reprendre, 'secondaire', () => {
        if (demanderUnGeste(reprise.cle, { type: 'reprendre', question: reprise.cle }, 'reprendre')) reprendre.disabled = true;
      });
      reprendre.setAttribute('aria-label', TEXTES.reprendreLaQuestion(reprise.avant, reprise.apres));
      rang.append(fabriquerChange(reprise.avant, reprise.apres === null ? null : '→', reprise.apres), reprendre);
      corps.append(rang);
    }

    function regler(ouvert: boolean): void {
      plusTardOuvert = ouvert;
      corps.hidden = !ouvert;
      bouton.setAttribute('aria-expanded', String(ouvert));
      chevron.textContent = ouvert ? '⌃' : '⌄';
    }
    regler(plusTardOuvert);
    bouton.addEventListener('click', () => regler(corps.hidden));
    element.append(tete, corps);
    return element;
  }

  function creerSectionDesPistes(): HTMLElement {
    const element = document.createElement('div');
    element.className = 'carte muette';
    const tete = document.createElement('div');
    tete.className = 'tete sans-coche';
    const texte = document.createElement('span');
    texte.textContent = TEXTES.autresPistes(autresPistes);
    tete.append(texte);
    element.append(tete);
    return element;
  }

  function rendre(): void {
    ordre = composerLaListe(ordre, [...questions.keys()], new Set(lignes.keys()));
    entrees = new Map();
    for (const cle of ordre) {
      const entree = construire(cle);
      if (!entree) continue;
      if (enCours.has(cle)) entree.figer();
      entrees.set(cle, entree);
    }
    liste.replaceChildren(...[...entrees.values()].map((entree) => entree.element));
    liste.hidden = entrees.size === 0;
    sectionPlusTard.hidden = plusTard.length === 0;
    sectionPlusTard.replaceChildren(...(plusTard.length === 0 ? [] : [creerSectionPlusTard()]));
    sectionPistes.hidden = autresPistes === 0;
    sectionPistes.replaceChildren(...(autresPistes === 0 ? [] : [creerSectionDesPistes()]));
    if (aFocaliser) entrees.get(aFocaliser.cle)?.focaliser(aFocaliser.sur);
    aFocaliser = null;
  }

  function cleDe(attente: Attente): string {
    return attente.sorte === 'repondre' ? attente.question.cle : attente.cle;
  }

  function traiterLeBilan(demande: number, bilan: Bilan): void {
    const attente = attentes.get(demande);
    attentes.delete(demande);
    questions.clear();
    for (const question of bilan.questions) questions.set(question.cle, question);
    plusTard = bilan.plusTard;
    autresPistes = bilan.autresPistes;
    if (attente) {
      const cle = cleDe(attente);
      enCours.delete(cle);
      if (attente.sorte === 'repondre') {
        const ligne = ligneFaite(attente.question, attente.reponse);
        if (ligne) lignes.set(cle, ligne);
        saisies.delete(cle);
        conflits.delete(cle);
      } else if (attente.nature === 'annuler') {
        lignes.delete(cle);
      } else if (attente.nature === 'ecart') {
        conflits.delete(cle);
      }
      aFocaliser = { cle };
    }
    for (const cle of [...conflits.keys()]) if (!questions.has(cle)) conflits.delete(cle);
    for (const cle of [...saisies.keys()]) if (!questions.has(cle)) saisies.delete(cle);
    dire(null);
    rendre();
  }

  function oublierLesDemandes(): void {
    attentes.clear();
    enCours.clear();
    lignes.clear();
    conflits.clear();
    saisies.clear();
    dire(null);
  }

  coquille.abonner((recu) => {
    switch (recu.type) {
      case 'initial':
      case 'analyse-demandee':
        oublierLesDemandes();
        rendre();
        break;
      case 'bilan':
        traiterLeBilan(recu.demande, recu.bilan);
        break;
      case 'refus': {
        const attente = attentes.get(recu.demande);
        if (!attente) break;
        attentes.delete(recu.demande);
        const cle = cleDe(attente);
        enCours.delete(cle);
        if (attente.sorte === 'repondre') conflits.set(cle, recu.conflits);
        aFocaliser = { cle };
        rendre();
        break;
      }
      case 'erreur': {
        const attente = attentes.get(recu.demande);
        if (!attente) break;
        attentes.delete(recu.demande);
        enCours.delete(cleDe(attente));
        dire(TEXTES.erreur[recu.code]);
        rendre();
        break;
      }
      default:
        break;
    }
  });

  // Les lignes de réussite ne survivent pas à un changement d'onglet : le panneau se masque.
  new MutationObserver(() => {
    if (!panneau.element.hidden || lignes.size === 0) return;
    lignes.clear();
    rendre();
  }).observe(panneau.element, { attributes: true, attributeFilter: ['hidden'] });

  const dejaLu = coquille.etat().bilan;
  if (dejaLu) traiterLeBilan(0, dejaLu);
}

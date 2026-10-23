/**
 * Le contenu de l'onglet À trancher : une carte par question, la ligne de
 * réussite qui prend la place d'une carte répondue, la carte d'un conflit,
 * puis les sections « Plus tard » et « Autres pistes ». Ce qu'une carte affiche
 * et la réponse de chaque bouton viennent de `questions.ts`. Les règles que le
 * mode Composant prépare s'y rangent en tête, sous leur intertitre.
 */
import { createButton } from 'ucm-plugin-socle/src/ui/Button';
import { creerChevron } from 'ucm-plugin-socle/src/ui/Chevron';
import type { Bilan, ConflitVue, GesteSurLesRegles, LigneVue, QuestionVue, Reponse } from '../../messages/nomenclature';
import type { Coquille } from './coquille';
import { comptesDuBilan } from './etat';
import { segmentsDeNom } from './lignes';
import {
  carteDeConflit,
  carteDeQuestion,
  champAutreTerme,
  composerLaListe,
  ligneDeReprise,
  ligneFaite,
  type ActionDeCarte,
  type LigneFaite,
  type PiedDeCarte,
  type TitreDeProposition,
} from './questions';
import { cleDeRegleRecue, ligneDeRegleRecue, sansDoublon, type RegleRecue } from './reglesRecues';
import { TEXTES } from '../textes/nomenclature';

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
  | { readonly sorte: 'regle'; readonly cle: string; readonly nature: 'annuler' | 'ecart' | 'reprendre' | 'ajout' };

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

/** Un nom découpé aux `/` : seuls les segments de `marques` prennent la couleur de leur ligne. Le texte entre deux segments marqués reste un seul morceau. */
function poserLesSegments(parent: HTMLElement, nom: string, marques: readonly number[], classe: 'seg-ancien' | 'seg-nouveau'): void {
  let texte = '';
  segmentsDeNom(nom, marques).forEach((segment, rang) => {
    if (!segment.marque) {
      texte += `${rang > 0 ? '/' : ''}${segment.texte}`;
      return;
    }
    const devant = `${texte}${rang > 0 ? '/' : ''}`;
    if (devant !== '') parent.append(document.createTextNode(devant));
    texte = '';
    const marque = document.createElement('span');
    marque.className = classe;
    marque.textContent = segment.texte;
    parent.append(marque);
  });
  if (texte !== '') parent.append(document.createTextNode(texte));
}

/** L'effet d'une proposition : le nom actuel, puis `→` et le nom après, au même bord. */
function fabriquerRenommage(ligne: LigneVue): HTMLElement {
  const element = document.createElement('div');
  element.className = 'renommage';
  const ancien = document.createElement('span');
  ancien.className = 'ancien';
  poserLesSegments(ancien, ligne.ancien, ligne.marques, 'seg-ancien');
  const fleche = document.createElement('span');
  fleche.className = 'fleche';
  fleche.setAttribute('aria-hidden', 'true');
  fleche.textContent = '→';
  const nouveau = document.createElement('span');
  nouveau.className = 'nouveau';
  poserLesSegments(nouveau, ligne.nouveau, ligne.marques, 'seg-nouveau');
  element.append(document.createElement('span'), ancien, fleche, nouveau);
  return element;
}

/** Le terme cité dans un titre : en code, rouge s'il disparaît, vert s'il reste. */
function fabriquerMotCite(mot: string, sorte: 'retire' | 'retenu'): HTMLElement {
  const code = document.createElement('code');
  if (sorte === 'retire') code.className = 'mot-cite mot-retire';
  else code.className = 'mot-cite mot-retenu';
  code.textContent = mot;
  return code;
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

function fabriquerPastille(texte: string): HTMLElement {
  const pastille = document.createElement('span');
  pastille.className = 'noms-pastille pastille-indice';
  pastille.textContent = texte;
  return pastille;
}

/** L'origine d'un terme UCM : du texte gris, sans fond. */
function fabriquerOrigine(texte: string): HTMLElement {
  const origine = document.createElement('span');
  origine.className = 'origine';
  origine.textContent = texte;
  return origine;
}

/**
 * La ligne de la vue vide de l'onglet, ou `null` quand une question attend. Sans question,
 * sans renommage ni question gardée, l'état « rien à faire » couvre déjà les onglets.
 */
export function ligneDeLaVueVide(questions: number, plusTard: number): string | null {
  if (questions > 0) return null;
  return plusTard > 0 ? TEXTES.questionsVides.ligneAvecPlusTard(plusTard) : TEXTES.questionsVides.ligne;
}

/** Le bouton bordé : une carte n'en porte qu'un. */
function fabriquerBouton(libelle: string, auClic: () => void): HTMLButtonElement {
  return createButton({ label: libelle, variant: 'secondary', compact: true, onClick: auClic });
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

/** Le titre d'une proposition : `Remplacer {a} par {b} ?`, a en rouge et b en vert. */
function fabriquerTitreDeProposition(titre: TitreDeProposition): HTMLElement {
  const intitule = document.createElement('span');
  intitule.className = 'question-titre';
  intitule.append(
    document.createTextNode(`${titre.avant} `),
    fabriquerMotCite(titre.ancien, 'retire'),
    document.createTextNode(` ${titre.entre} `),
    fabriquerMotCite(titre.nouveau, 'retenu'),
    document.createTextNode(' ?'),
  );
  return intitule;
}

function fabriquerIntertitre(texte: string): HTMLElement {
  const element = document.createElement('div');
  element.className = 'intertitre';
  const titre = document.createElement('h2');
  titre.textContent = texte;
  element.append(titre);
  return element;
}

export interface ATrancher {
  /** Pose les règles reçues du mode Composant ; elles remplacent celles qui étaient là. */
  poserLesReglesRecues(regles: readonly RegleRecue[]): void;
}

/**
 * Monte l'onglet dans `coquille.panneaux.aTrancher.contenu`. Un `bilan` rebâtit
 * la liste ; la réponse acceptée à une demande de l'onglet réduit sa carte à
 * une ligne, qui disparaît au changement d'onglet.
 */
export function monterATrancher(coquille: Coquille): ATrancher {
  const { frontiere } = coquille;
  const panneau = coquille.panneaux.aTrancher;
  const questions = new Map<string, QuestionVue>();
  let plusTard: readonly QuestionVue[] = [];
  let autresPistes = 0;
  let renommages = 0;
  let plusTardOuvert = false;
  let recues: readonly RegleRecue[] = [];
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
  const vueVide = document.createElement('div');
  const sectionPlusTard = document.createElement('div');
  const sectionPistes = document.createElement('div');
  panneau.contenu.append(message, liste, vueVide, sectionPlusTard, sectionPistes);

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

  function demanderUnGeste(cle: string, geste: GesteSurLesRegles, nature: 'annuler' | 'ecart' | 'reprendre' | 'ajout'): boolean {
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
        const bouton = action.poids === 'borde' ? fabriquerBouton(action.libelle, () => agir(action)) : fabriquerBoutonTexte(action.libelle, () => agir(action));
        boutons.push(bouton);
        parId.set(action.id, bouton);
        return bouton;
      });
      const plusTardDeLaCarte = fabriquerBoutonTexte(pied.plusTard.libelle, () => agir(pied.plusTard));
      boutons.push(plusTardDeLaCarte);
      return fabriquerPied(gauche, [plusTardDeLaCarte]);
    }

    if (carte.forme === 'proposition') {
      element.classList.add('question-proposition');
      const entete = document.createElement('div');
      entete.className = 'question-entete';
      entete.append(fabriquerTitreDeProposition(carte.titre));
      if (carte.ucm) entete.append(fabriquerOrigine(TEXTES.pastilleUcm));
      const detail = document.createElement('span');
      detail.className = 'meta';
      detail.textContent = carte.detail;
      const { voir } = carte;
      if (voir) {
        const lien = fabriquerBoutonTexte(voir.libelle, () => coquille.rechercher(voir.recherche));
        detail.append(' ', lien);
      }
      element.append(entete, detail);
      if (carte.effet) element.append(fabriquerRenommage(carte.effet));
    } else {
      element.append(fabriquerEntete(carte.question, carte.indice));
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

  /** La carte d'une règle reçue : la règle et le composant d'où elle vient, un exemple, Ajouter la règle ou Écarter. */
  function creerCarteRecue(regle: RegleRecue): HTMLElement {
    const cle = cleDeRegleRecue(regle);
    const element = document.createElement('div');
    element.className = 'carte question question-proposition';
    const entete = document.createElement('div');
    entete.className = 'question-entete';
    entete.append(fabriquerTitreDeProposition({ avant: TEXTES.reglesRecues.titre, ancien: regle.ancien, entre: TEXTES.reglesRecues.fleche, nouveau: regle.nouveau }), fabriquerOrigine(regle.composant));
    const detail = document.createElement('span');
    detail.className = 'meta';
    detail.textContent = TEXTES.reglesRecues.detail(regle.composant);
    const retirer = (): void => {
      recues = recues.filter((candidate) => cleDeRegleRecue(candidate) !== cle);
      coquille.poserLeCompteDesReglesRecues(recues.length);
      rendre();
    };
    const boutons: HTMLButtonElement[] = [];
    const ajouter = fabriquerBouton(TEXTES.reglesRecues.ajouter, () => {
      if (demanderUnGeste(cle, { type: 'remplacer-par', terme: regle.ancien, par: regle.nouveau }, 'ajout')) for (const bouton of boutons) bouton.disabled = true;
    });
    const ecarter = fabriquerBoutonTexte(TEXTES.reglesRecues.ecarter, retirer);
    const plusTardDeLaRegle = fabriquerBoutonTexte(TEXTES.plusTard, retirer);
    boutons.push(ajouter, ecarter, plusTardDeLaRegle);
    if (enCours.has(cle)) for (const bouton of boutons) bouton.disabled = true;
    element.append(entete, detail, fabriquerRenommage(ligneDeRegleRecue(regle)), fabriquerPied([ajouter, ecarter], [plusTardDeLaRegle]));
    return element;
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

    const retour = fabriquerBoutonTexte(TEXTES.retour, () => {
      saisies.delete(question.cle);
      aFocaliser = { cle: question.cle, sur: 'autre-terme' };
      rendre();
    });
    const enregistrer = fabriquerBouton(TEXTES.enregistrer, enregistrerLaSaisie);
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
    const retour = fabriquerBouton(TEXTES.retour, () => {
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
    bouton.append(titre, creerChevron());
    tete.append(bouton);

    const corps = document.createElement('div');
    corps.className = 'noms-corps';
    for (const question of plusTard) {
      const reprise = ligneDeReprise(question);
      const rang = document.createElement('div');
      rang.className = 'plus-tard-rang';
      const reprendre = fabriquerBouton(TEXTES.reprendre, () => {
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

  /** « Aucune question » : le titre, la ligne, et le bouton qui ouvre Renommages quand il y a des renommages. */
  function creerVueVide(ligne: string): HTMLElement {
    const vue = document.createElement('div');
    vue.className = 'etat';
    const titre = document.createElement('div');
    titre.className = 'etat-titre';
    titre.textContent = TEXTES.questionsVides.titre;
    const texte = document.createElement('p');
    texte.className = 'etat-texte';
    poserLeTexte(texte, ligne);
    vue.append(titre, texte);
    if (renommages > 0) vue.append(fabriquerBouton(TEXTES.questionsVides.bouton, () => coquille.choisirOnglet('a-appliquer')));
    return vue;
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
    const delaRegle = recues.length === 0 ? [] : [fabriquerIntertitre(TEXTES.reglesRecues.intertitre), ...recues.map(creerCarteRecue), ...(entrees.size === 0 ? [] : [fabriquerIntertitre(TEXTES.reglesRecues.intertitreDuFichier)])];
    liste.replaceChildren(...delaRegle, ...[...entrees.values()].map((entree) => entree.element));
    liste.hidden = entrees.size === 0 && recues.length === 0;
    const ligneVide = ligneDeLaVueVide(questions.size, plusTard.length);
    vueVide.hidden = ligneVide === null || recues.length > 0;
    vueVide.replaceChildren(...(ligneVide === null ? [] : [creerVueVide(ligneVide)]));
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
    renommages = comptesDuBilan(bilan).aAppliquer;
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
      } else if (attente.nature === 'ajout') {
        recues = recues.filter((regle) => cleDeRegleRecue(regle) !== cle);
        coquille.poserLeCompteDesReglesRecues(recues.length);
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
  return {
    poserLesReglesRecues(regles) {
      recues = sansDoublon(regles);
      coquille.poserLeCompteDesReglesRecues(recues.length);
      rendre();
    },
  };
}

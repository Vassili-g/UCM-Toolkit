/**
 * Les feuilles de l'onglet Règles : l'écriture des noms, la fiche d'un terme
 * (UCM, personnalisé ou sans règle) et les deux étapes « Remplacer par… » et
 * « Remplace d'autres termes… », qui prennent la place de la fiche dans la même
 * feuille. Une seule feuille est ouverte à la fois. Un terme remplacé n'a pas de
 * fiche : la liste ne le montre pas, sa référence porte la règle.
 *
 * Chaque changement part par `coquille.frontiere.regle` et la feuille attend le
 * `bilan` de sa demande ; l'effet d'un choix se lit avant, par `simuler`.
 */
import { REGISTRES, type Terme } from '@ucm-kit/core/referentiel';
import { createButton, type BoutonUi } from 'ucm-plugin-socle/src/ui/Button';
import { createFeuille } from 'ucm-plugin-socle/src/ui/Feuille';
import type { ConflitVue, EffetVue, FicheVue, GesteSurLesRegles, LigneVue, MessageDeNomenclature, TermeDeListe } from '../../messages/nomenclature';
import { poserLesSegments } from './aAppliquer';
import type { Coquille } from './coquille';
import { creerCarteDEcriture } from './ecriture';
import type { MessageAAfficher } from './frontiere';
import { fusionnerLesTextes, segmentsDeNom } from './lignes';
import { motAffiche } from './listeDesTermes';
import { carteDeConflit } from './questions';
import type { ReglesMontees } from './regles';
import { TEXTES } from '../textes/nomenclature';

/** Le délai après lequel une saisie calme demande sa simulation. */
const DELAI_DE_SIMULATION = 250;

export type SorteDeFiche = 'ucm' | 'personnalise' | 'sans-regle';

/** La fiche qu'une ligne de la liste ouvre, selon l'origine du terme. */
export function sorteDeFiche(fiche: Pick<FicheVue, 'origine'>): SorteDeFiche {
  if (fiche.origine === 'ucm') return 'ucm';
  return fiche.origine === 'personnalise' ? 'personnalise' : 'sans-regle';
}

/** Le titre de la feuille : la forme du fichier (`StressTest`) quand le terme n'a pas de règle, sinon la clé du terme. */
export function titreDeLaFiche(_sorte: SorteDeFiche, fiche: Pick<FicheVue, 'forme'>): string {
  return fiche.forme;
}

/** Le lien de l'en-tête : un nom se traite comme un terme, un terme ordinaire se traite comme un nom ; `null` pour un terme sans nature. */
export function lienDeLaFiche(fiche: Pick<FicheVue, 'mot' | 'nature' | 'ordinaire'>): { readonly libelle: string; readonly geste: GesteSurLesRegles } | null {
  if (fiche.ordinaire) return { libelle: TEXTES.traiterCommeUnNom, geste: { type: 'terme-ordinaire', terme: fiche.mot, actif: false } };
  if (fiche.nature !== null) return { libelle: TEXTES.traiterCommeUnTerme, geste: { type: 'terme-ordinaire', terme: fiche.mot, actif: true } };
  return null;
}

/** La définition du terme, que l'en-tête de la feuille porte sous le titre ; un terme personnalisé sans définition dit qu'il n'en a pas. */
export function definitionDeLaFiche(sorte: SorteDeFiche, fiche: Pick<FicheVue, 'definition'>): string | null {
  return fiche.definition ?? (sorte === 'personnalise' ? TEXTES.definitionPersonnalisee : null);
}

/** Les textes de gris sous l'en-tête, dans le corps : la phrase du nom ou du terme ordinaire, puis l'écart ou la question qui porte sur le terme. */
export function lignesDIdentite(sorte: SorteDeFiche, fiche: Pick<FicheVue, 'ecart' | 'question' | 'nature' | 'ordinaire'>): string[] {
  const lignes: (string | null)[] = [
    fiche.ordinaire ? TEXTES.phraseOrdinaire : fiche.nature !== null ? TEXTES.phraseDeNature[fiche.nature] : null,
    fiche.ecart ? TEXTES.termeEcarte : null,
    sorte === 'sans-regle' && fiche.question !== null ? TEXTES.questionSurLeTerme : null,
  ];
  return lignes.filter((texte): texte is string => texte !== null);
}

/** La pastille à côté du terme, dans l'en-tête de la feuille : la nature d'un nom, sinon l'origine. */
export function pastilleDeLaFiche(
  sorte: SorteDeFiche,
  fiche: Pick<FicheVue, 'categorieUcm' | 'nature'>,
  enAttente: boolean,
): { readonly texte: string; readonly variante: 'ucm' | 'personnalise' | 'indice' } {
  if (fiche.nature !== null) return { texte: TEXTES.natureDuTerme[fiche.nature], variante: 'indice' };
  if (sorte === 'sans-regle') return { texte: enAttente ? TEXTES.pastilleATrancherDuTerme : TEXTES.pastilleSansRegle, variante: 'indice' };
  if (sorte === 'personnalise') return { texte: TEXTES.pastillePersonnalise, variante: 'personnalise' };
  return { texte: fiche.categorieUcm ? TEXTES.pastilleUcmDeCategorie(TEXTES.categorieDuTermeUcm(fiche.categorieUcm)) : TEXTES.pastilleUcm, variante: 'ucm' };
}

export type BlocDeFiche = 'identite' | 'regle' | 'gardes-separes' | 'ecriture-gardee' | 'a-renommer' | 'deja-employe';

/**
 * Les blocs du corps d'une fiche, dans l'ordre. La règle n'existe que pour un terme
 * UCM ou personnalisé. À renommer disparaît quand aucun nom ne change, Déjà employé
 * quand aucun nom n'emploie le terme.
 */
export function blocsDeLaFiche(
  sorte: SorteDeFiche,
  fiche: Pick<FicheVue, 'ecart' | 'question' | 'nature' | 'ordinaire' | 'distincts' | 'voulu' | 'aRenommer' | 'emploi'>,
): BlocDeFiche[] {
  return [
    ...(lignesDIdentite(sorte, fiche).length > 0 ? (['identite'] as const) : []),
    ...(sorte === 'sans-regle' ? [] : (['regle'] as const)),
    ...(fiche.distincts.length > 0 ? (['gardes-separes'] as const) : []),
    ...(fiche.voulu ? (['ecriture-gardee'] as const) : []),
    ...(sorte !== 'sans-regle' && fiche.aRenommer.nombre > 0 ? (['a-renommer'] as const) : []),
    ...(fiche.emploi.exemples.length > 0 ? (['deja-employe'] as const) : []),
  ];
}

export interface FormeDeLaRegle { readonly mot: string; readonly nombre: number; readonly retirable: boolean }

/** Les termes remplacés d'une règle. Seul un terme que le fichier a ajouté se retire : UCM fixe les autres. */
export function formesDeLaRegle(fiche: Pick<FicheVue, 'remplace'>): FormeDeLaRegle[] {
  return fiche.remplace.map(({ mot, nombre, ucm }) => ({ mot, nombre, retirable: !ucm }));
}

/** Vrai quand la règle remplace des termes et qu'UCM les fixe tous. */
export function formesToutesFixeesParUcm(fiche: Pick<FicheVue, 'remplace'>): boolean {
  return fiche.remplace.length > 0 && fiche.remplace.every(({ ucm }) => ucm);
}

export type ActionDuPied =
  | 'ne-pas-appliquer'
  | 'appliquer-de-nouveau'
  | 'supprimer-la-regle'
  | 'proposer-a-ucm'
  | 'remplace-d-autres-termes'
  | 'remplacer-par';

/** Le texte de chaque action du pied. */
export function libelleDeLAction(action: ActionDuPied): string {
  switch (action) {
    case 'ne-pas-appliquer': return TEXTES.nePasLAppliquer;
    case 'appliquer-de-nouveau': return TEXTES.appliquerDeNouveau;
    case 'supprimer-la-regle': return TEXTES.supprimerLaRegle;
    case 'proposer-a-ucm': return TEXTES.proposerAUcm;
    case 'remplace-d-autres-termes': return TEXTES.remplaceDAutresTermes;
    case 'remplacer-par': return TEXTES.remplacerParPoints;
  }
}

/** Le pied d'une fiche : une action à gauche, ou aucune, puis les actions à droite. Aucune fiche de terme n'a de bouton Fermer : le ✕ du socle ferme. */
export function piedDeLaFiche(sorte: SorteDeFiche, fiche: Pick<FicheVue, 'ecart'>): { readonly gauche: ActionDuPied | null; readonly droite: readonly ActionDuPied[] } {
  switch (sorte) {
    case 'ucm': return { gauche: fiche.ecart ? 'appliquer-de-nouveau' : 'ne-pas-appliquer', droite: [] };
    case 'personnalise': return { gauche: 'supprimer-la-regle', droite: ['proposer-a-ucm'] };
    case 'sans-regle': return { gauche: 'remplace-d-autres-termes', droite: ['remplacer-par'] };
  }
}

/** Les termes d'une saisie, séparés par des espaces, des virgules ou des points-virgules, en minuscules et sans doublon. */
export function motsSaisis(saisie: string): string[] {
  return [...new Set(saisie.split(/[\s,;]+/u).map((mot) => mot.trim().toLowerCase()).filter((mot) => mot !== ''))];
}

/**
 * Les termes que `remplace-termes` reçoit : ceux que le fichier a déjà ajoutés
 * à ce terme, puis les nouveaux. Les formes que le référentiel UCM remplace
 * déjà n'entrent pas dans les règles du fichier.
 */
export function termesRemplaces(fiche: Pick<FicheVue, 'remplace'>, saisis: readonly string[]): string[] {
  return [...new Set([...fiche.remplace.filter(({ ucm }) => !ucm).map(({ mot }) => mot), ...saisis])];
}

/** Le terme personnalisé sous la forme d'une entrée de registre du référentiel du kit. */
export function termeProposeAUcm(fiche: Pick<FicheVue, 'mot' | 'definition' | 'remplace'>): Terme {
  const toleres = fiche.remplace.map(({ mot }) => mot);
  return {
    id: fiche.mot,
    ...(toleres.length > 0 ? { toleres } : {}),
    libelle: { fr: fiche.mot, en: fiche.mot },
    definition: { fr: fiche.definition ?? '', en: '' },
  };
}

export const texteDeLaProposition = (fiche: Pick<FicheVue, 'mot' | 'definition' | 'remplace'>): string => JSON.stringify(termeProposeAUcm(fiche), null, 2);

/** Les termes du référentiel UCM que la saisie de « Remplacer par… » propose. */
export function termesDuReferentiel(): string[] {
  return [...new Set(REGISTRES.flatMap(({ termes }) => termes.map(({ id }) => id)))].filter((id) => /\p{L}/u.test(id)).sort();
}

type IssueDeCopie = 'copie' | 'refusee';

/** `navigator.clipboard` est souvent refusé dans l'iframe d'un plugin Figma : une zone de texte sélectionnée et `execCommand('copy')` font le second essai. */
async function copierTexte(texte: string): Promise<IssueDeCopie> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(texte);
      return 'copie';
    }
  } catch {
    // Le second essai suit.
  }
  const zone = document.createElement('textarea');
  zone.value = texte;
  zone.setAttribute('readonly', '');
  zone.className = 'noms-zone-hors-champ';
  document.body.append(zone);
  zone.select();
  let reussie = false;
  try {
    reussie = document.execCommand('copy');
  } catch {
    reussie = false;
  }
  // `replaceWith()` sans argument détache la zone : la loi d'écriture refuse tout `.remove(`.
  zone.replaceWith();
  return reussie ? 'copie' : 'refusee';
}

function el<K extends keyof HTMLElementTagNameMap>(balise: K, classe = '', texte = ''): HTMLElementTagNameMap[K] {
  const element = document.createElement(balise);
  if (classe !== '') element.className = classe;
  if (texte !== '') element.textContent = texte;
  return element;
}

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

function creerChemin(ligne: LigneVue): HTMLElement {
  const chemin = el('span', 'chemin');
  ligne.ancien.split('/').forEach((segment, rang) => {
    if (rang > 0) chemin.append(document.createTextNode('/'));
    chemin.append(ligne.marques.includes(rang) ? el('mark', '', segment) : document.createTextNode(segment));
  });
  return chemin;
}

function creerChange(avant: string, apres: string, autres: number): HTMLElement {
  const change = el('span', 'change');
  change.append(el('code', 'avant', avant), el('span', 'fleche', '→'), el('code', 'apres', apres));
  if (autres > 0) change.append(el('span', 'plus', `+${autres}`));
  return change;
}

function creerLeContenu(): HTMLElement {
  const contenu = el('div');
  contenu.className = 'feuille-contenu';
  return contenu;
}

function creerPastille(texte: string, variante: 'ucm' | 'personnalise' | 'indice'): HTMLElement {
  return variante === 'indice' ? el('span', 'noms-pastille pastille-indice', texte) : el('span', 'origine', texte);
}

/** Le pied d'une feuille : un bouton à gauche, ou rien, puis les boutons à droite. */
function creerLePied(gauche: HTMLElement | null, ...droite: HTMLElement[]): HTMLElement {
  const pied = el('div', 'feuille-actions');
  const groupe = el('span', 'feuille-groupe');
  groupe.append(...droite);
  pied.append(gauche ?? el('span'), groupe);
  return pied;
}

function creerErreur(texte: string): HTMLElement {
  const erreur = el('p', 'etat-erreur', texte);
  erreur.setAttribute('role', 'alert');
  return erreur;
}

/** L'effet d'un choix sur les noms : son avant → après, le nombre de noms et un chemin exemple. */
function creerEffetDeTerme(effet: EffetVue | null): HTMLElement {
  const bloc = el('div', 'effet');
  if (effet?.sorte !== 'terme' || effet.nombre === 0) {
    bloc.append(el('span', 'meta', TEXTES.aucunNomNeChange));
    return bloc;
  }
  bloc.append(creerChange(effet.avant, effet.apres, 0), el('span', 'meta', TEXTES.rejoindrontAAppliquer(effet.nombre)));
  if (effet.exemple) bloc.append(creerChemin(effet.exemple));
  return bloc;
}

/** Une feuille ouverte : ce que la coquille lui montre, et comment la fermer. */
interface FeuilleOuverte {
  fermer(): void;
  recevoir(message: MessageAAfficher): void;
}

type Apres = 'fermer' | 'relire' | 'resimuler';

/** Ce que l'étape « Remplacer par… » ou « Remplace d'autres termes… » fait des réponses du sandbox. */
interface Etape {
  recevoirLaSimulation(message: Extract<MessageDeNomenclature, { type: 'simulation' }>): void;
  relancer(): void;
  figer(oui: boolean): void;
}

/**
 * Branche les feuilles sur le bouton Modifier de l'écriture et sur les lignes de
 * la liste des termes.
 */
export function monterFeuilles(coquille: Coquille, regles: ReglesMontees): void {
  const { frontiere } = coquille;
  let ouverte: FeuilleOuverte | null = null;

  function ouvrirLEcriture(): void {
    const bilan = coquille.etat().bilan;
    if (ouverte || !bilan) return;
    let simulation: number | null = null;
    let attente: number | null = null;

    const zone = el('div');
    zone.setAttribute('aria-live', 'polite');
    const effet = el('div', 'effet');
    effet.hidden = true;
    const carte = creerCarteDEcriture({
      auChangement: (choix) => {
        zone.replaceChildren();
        simulation = frontiere.simuler({ type: 'ecriture', ecriture: choix });
      },
    });
    carte.poser(bilan.ecriture);
    const corps = creerLeContenu();
    corps.append(zone, carte.element, effet);

    const annuler = createButton({ label: TEXTES.annuler, variant: 'secondary', onClick: () => feuille.fermer() });
    const enregistrer = createButton({
      label: TEXTES.enregistrer,
      onClick: () => {
        zone.replaceChildren();
        enregistrer.disabled = true;
        attente = frontiere.regle({ type: 'ecriture', ecriture: carte.choix() });
      },
    });
    const feuille = createFeuille({
      titre: TEXTES.titreDeLEcriture,
      corps,
      pied: creerLePied(null, annuler, enregistrer),
      onFermer: () => {
        ouverte = null;
      },
    });

    function poserLEffet(recu: Extract<EffetVue, { sorte: 'ecriture' }> | null): void {
      effet.hidden = false;
      if (recu === null || recu.exemple === null || recu.renommages === 0) {
        effet.replaceChildren(el('span', 'meta', TEXTES.aucunNomNeChange));
        return;
      }
      effet.replaceChildren(creerChange(recu.exemple.avant, recu.exemple.apres, recu.renommages - 1), el('span', 'meta', TEXTES.rejoindrontAAppliquer(recu.renommages)));
    }

    ouverte = {
      fermer: () => feuille.fermer(),
      recevoir(message) {
        switch (message.type) {
          case 'simulation':
            if (message.demande !== simulation) return;
            simulation = null;
            if (message.effet?.sorte === 'ecriture') carte.poserLesLignes(message.effet.groupes, message.effet.variables);
            poserLEffet(message.effet?.sorte === 'ecriture' ? message.effet : null);
            return;
          case 'bilan':
            feuille.fermer();
            return;
          case 'refus':
            if (message.demande !== attente) return;
            attente = null;
            enregistrer.disabled = false;
            zone.replaceChildren(creerErreur(TEXTES.erreur.echec));
            return;
          case 'erreur':
            if (message.demande === simulation) simulation = null;
            if (message.demande !== attente) return;
            attente = null;
            enregistrer.disabled = false;
            zone.replaceChildren(creerErreur(TEXTES.erreur[message.code]));
            return;
          default:
            return;
        }
      },
    };
  }

  function ouvrirUnTerme(entree: TermeDeListe): void {
    if (ouverte) return;
    let fiche: FicheVue | null = null;
    let demandeDeFiche = frontiere.fiche(entree.mot);
    let attente: { readonly demande: number; readonly apres: Apres } | null = null;
    let simulation: number | null = null;
    let minuteur: ReturnType<typeof setTimeout> | null = null;
    let etape: Etape | null = null;
    let boutons: HTMLButtonElement[] = [];
    let zone = el('div');
    zone.setAttribute('aria-live', 'polite');

    const attendre = creerLeContenu();
    attendre.append(zone, demandeDeFiche === null ? creerErreur(TEXTES.erreur.echec) : el('p', 'meta', TEXTES.lectureDuTerme));
    const feuille = createFeuille({
      titre: motAffiche(entree),
      corps: attendre,
      pied: creerLePied(null),
      onFermer: () => {
        if (minuteur !== null) clearTimeout(minuteur);
        ouverte = null;
        regles.designerLeTerme(null);
        // La liste se redessine pour effacer la ligne choisie : le focus revient à la ligne du terme.
        const lignes = Array.from(coquille.panneaux.regles.contenu.querySelectorAll<HTMLElement>('.ligne-terme'));
        lignes.find((ligne) => ligne.dataset.mot === entree.mot)?.focus();
      },
    });
    feuille.element.classList.add('feuille-terme');
    regles.designerLeTerme(entree.mot);

    function enregistrerLeBouton<T extends HTMLButtonElement>(bouton: T): T {
      boutons.push(bouton);
      return bouton;
    }

    /** Un bouton sans classe : l'appelant pose la sienne, en littéral, pour que la loi des styles la voie. */
    function creerUnBoutonNu(libelle: string, auClic: () => void, etiquette?: string): HTMLButtonElement {
      const bouton = el('button', '', libelle);
      bouton.type = 'button';
      if (etiquette) bouton.setAttribute('aria-label', etiquette);
      bouton.addEventListener('click', auClic);
      return enregistrerLeBouton(bouton);
    }

    function actionTexte(libelle: string, auClic: () => void, etiquette?: string, danger = false): HTMLButtonElement {
      const bouton = creerUnBoutonNu(libelle, auClic, etiquette);
      bouton.className = 'btn-texte';
      if (danger) bouton.classList.add('danger');
      return bouton;
    }

    function creerUnBouton(libelle: string, variante: 'primary' | 'secondary', auClic: () => void): BoutonUi {
      return enregistrerLeBouton(createButton({ label: libelle, variant: variante, onClick: auClic }));
    }

    function figer(oui: boolean): void {
      for (const bouton of boutons) bouton.disabled = oui;
      etape?.figer(oui);
    }

    function envoyer(geste: GesteSurLesRegles, apres: Apres): void {
      zone.replaceChildren();
      attente = { demande: frontiere.regle(geste), apres };
      figer(true);
    }

    function poserErreur(texte: string): void {
      zone.replaceChildren(creerErreur(texte));
    }

    function creerConflit(conflits: readonly ConflitVue[]): HTMLElement {
      const carte = carteDeConflit(conflits);
      const boite = el('div');
      boite.className = 'effet fiche-conflit';
      boite.setAttribute('role', 'alert');
      boite.append(el('b', '', carte.titre));
      for (const bloc of carte.blocs) {
        const explication = el('p');
        poserLeTexte(explication, bloc.explication);
        boite.append(explication);
        const { termeUcm } = bloc;
        if (termeUcm !== null) boite.append(actionTexte(TEXTES.nePasAppliquer(termeUcm), () => envoyer({ type: 'ecart-ucm', terme: termeUcm, actif: true }, 'resimuler')));
      }
      return boite;
    }

    function creerLaSection(titre: string, ...enfants: HTMLElement[]): HTMLElement {
      const section = el('div');
      section.className = 'fiche-section';
      const entete = el('div', '', titre);
      entete.className = 'fiche-section-titre';
      section.append(entete, ...enfants);
      return section;
    }

    function creerUnRang(terme: HTMLElement, action: HTMLElement | null): HTMLElement {
      const rang = el('div');
      rang.className = 'fiche-rang';
      rang.append(terme);
      if (action) rang.append(action);
      return rang;
    }

    function creerLeTerme(mot: string, detail: string | null): HTMLElement {
      const terme = el('span');
      terme.className = 'fiche-terme';
      terme.append(el('code', 'mot', mot));
      if (detail !== null) terme.append(el('span', 'meta', detail));
      return terme;
    }

    /**
     * La pastille d'origine et la définition se posent dans l'en-tête du socle : le titre et la pastille sur une ligne, la définition dessous,
     * le bouton de fermeture à droite. `null` et `null` rendent l'en-tête tel que le socle l'a fait.
     */
    function poserLEntete(origine: ReturnType<typeof pastilleDeLaFiche> | null, definition: string | null): void {
      const entete = feuille.element.querySelector('.feuille-entete');
      const titre = entete?.querySelector('.feuille-titre');
      if (!entete || !titre) return;
      const ancien = entete.querySelector('.titre-et-definition');
      if (ancien) {
        ancien.replaceWith(titre);
      }
      entete.querySelector('.noms-pastille, .origine')?.replaceWith();
      entete.classList.toggle('avec-definition', definition !== null);
      const pastille = origine === null ? null : creerPastille(origine.texte, origine.variante);
      if (definition === null) {
        if (pastille) titre.after(pastille);
        return;
      }
      const ligne = el('div');
      ligne.className = 'titre-ligne';
      ligne.append(titre);
      if (pastille) ligne.append(pastille);
      const bloc = el('div');
      bloc.className = 'titre-et-definition';
      bloc.append(ligne, el('p', 'meta', definition));
      entete.querySelector('.feuille-fermer')?.before(bloc);
    }

    function creerLIdentite(sorte: SorteDeFiche, donnees: FicheVue): HTMLElement {
      const identite = el('div');
      identite.className = 'fiche-entete';
      for (const texte of lignesDIdentite(sorte, donnees)) {
        const ligne = el('p', 'meta');
        poserLeTexte(ligne, texte);
        identite.append(ligne);
      }
      const lien = lienDeLaFiche(donnees);
      if (lien) {
        const traiter = creerUnBoutonNu(lien.libelle, () => envoyer(lien.geste, 'relire'));
        traiter.className = 'noms-lien';
        identite.append(traiter);
      }
      return identite;
    }

    /** Le bloc gris : la référence, les termes qu'elle remplace, `+ Terme`, puis les nombres. Aucune couleur de conséquence. */
    function creerLaRegle(donnees: FicheVue): HTMLElement {
      const titre = el('h3', '', TEXTES.regle);
      titre.className = 'titre-regle';
      const tete = el('div');
      tete.className = 'fiche-regle-tete';
      tete.append(titre);
      if (formesToutesFixeesParUcm(donnees)) tete.append(el('span', 'meta', TEXTES.formesFixeesParUcm));

      const ligne = el('span');
      ligne.className = 'regle-ligne';
      const reference = el('span', '', donnees.mot);
      reference.className = 'jeton jeton-neutre';
      ligne.append(reference, el('span', 'variantes', TEXTES.motRemplace));
      for (const { mot, nombre, retirable } of formesDeLaRegle(donnees)) {
        const jeton = el('span', '', mot);
        jeton.className = 'jeton jeton-variante';
        const compte = el('span', '', String(nombre));
        compte.className = 'compte-jeton';
        jeton.append(compte);
        if (retirable) {
          const retirer = creerUnBoutonNu('×', () => envoyer({ type: 'retirer-remplace', terme: donnees.mot, remplace: mot }, 'relire'), TEXTES.retirerLeTerme(mot));
          retirer.className = 'retirer-jeton';
          jeton.append(retirer);
        }
        ligne.append(jeton);
      }
      const ajouter = creerUnBoutonNu(TEXTES.ajouterUnTerme, () => montrerUneEtape('remplace-termes'));
      ajouter.className = 'jeton jeton-ajout';
      ligne.append(ajouter);

      const chiffres = el('span');
      chiffres.className = 'chiffres';
      for (const { texte, gras } of TEXTES.chiffresDeLaRegle(donnees.aRenommer.nombre, donnees.emploi.nombre)) {
        chiffres.append(gras ? el('b', '', texte) : document.createTextNode(texte));
      }
      const regle = el('div');
      regle.className = 'fiche-regle';
      regle.append(tete, ligne, chiffres);
      return regle;
    }

    /** Un bloc titré dont le corps est une liste bordée, avec un lien à droite du titre si `lien` est donné. */
    function creerLeBloc(titre: string, lignes: readonly HTMLElement[], lien: HTMLElement | null = null): HTMLElement {
      const tete = el('div');
      tete.className = 'fiche-bloc-tete';
      tete.append(el('h3', '', titre));
      if (lien) tete.append(lien);
      const liste = el('div');
      liste.className = 'fiche-liste';
      liste.append(...lignes);
      const bloc = el('div');
      bloc.className = 'fiche-bloc';
      bloc.append(tete, liste);
      return bloc;
    }

    /** Les noms que la règle change, sur deux colonnes sans case : le nom actuel, puis le nom après l'application. */
    function creerARenommer(donnees: FicheVue): HTMLElement {
      const legende = el('div');
      legende.className = 'colonnes-tete';
      legende.append(el('span', '', TEXTES.legendeAujourdhui), el('span', '', TEXTES.legendeApres));
      const lignes = donnees.aRenommer.exemples.map((ligne) => {
        const diff = el('div');
        diff.className = 'diff';
        const avant = el('span');
        avant.className = 'chemin';
        poserLesSegments(avant, ligne.ancien, ligne.marques, 'ancien');
        const apres = el('span');
        apres.className = 'chemin-apres';
        const fleche = el('span', '', '→ ');
        fleche.className = 'fleche-ligne';
        apres.append(fleche);
        poserLesSegments(apres, ligne.nouveau, ligne.marques, 'nouveau');
        diff.append(avant, apres);
        return diff;
      });
      // Sans carte dans le bilan, `demanderUneCarte` ouvre seulement l'onglet.
      const voir = creerUnBoutonNu(TEXTES.voirDansCorrections, () => {
        feuille.fermer();
        coquille.demanderUneCarte(`terme:${donnees.mot}`);
      });
      voir.className = 'noms-lien';
      return creerLeBloc(TEXTES.titreARenommer(donnees.aRenommer.nombre), [legende, ...lignes], voir);
    }

    /** Les noms qui emploient déjà le terme : le segment du terme en blanc et en 600, le reste en gris. */
    function creerDejaEmploye(donnees: FicheVue): HTMLElement {
      const lignes = donnees.emploi.exemples.map((ligne) => {
        const chemin = el('span');
        chemin.className = 'chemin';
        const morceaux = segmentsDeNom(ligne.ancien, ligne.marques).flatMap((segment, rang): (string | HTMLElement)[] => {
          const separateur = rang > 0 ? ['/'] : [];
          if (!segment.marque) return [...separateur, segment.texte];
          const employe = el('span', '', segment.texte);
          employe.className = 'terme-employe';
          return [...separateur, employe];
        });
        chemin.append(...fusionnerLesTextes(morceaux));
        return chemin;
      });
      return creerLeBloc(TEXTES.titreDejaEmploye(donnees.emploi.nombre), lignes);
    }

    function creerGardesSepares(donnees: FicheVue): HTMLElement {
      return creerLaSection(
        TEXTES.sectionGardeSepare,
        ...donnees.distincts.map((autre) =>
          creerUnRang(
            creerLeTerme(autre, null),
            actionTexte(TEXTES.retirer, () => envoyer({ type: 'retirer-distinct', termes: [donnees.mot, autre] }, 'relire'), TEXTES.retirerLaSeparation(donnees.mot, autre)),
          ),
        ),
      );
    }

    function creerEcritureGardee(donnees: FicheVue): HTMLElement {
      const texte = el('span', 'meta', TEXTES.ecritureVoulue);
      return creerLaSection(TEXTES.ecritureGardee, creerUnRang(texte, actionTexte(TEXTES.retirer, () => envoyer({ type: 'retirer-voulu', terme: donnees.mot }, 'relire'), TEXTES.retirerLEcritureVoulue(donnees.mot))));
    }

    function proposerAUcm(donnees: FicheVue, bouton: BoutonUi): void {
      const texte = texteDeLaProposition(donnees);
      void copierTexte(texte).then((issue) => {
        if (ouverte === null || !bouton.isConnected) return;
        if (issue === 'copie') {
          bouton.setLabel(TEXTES.proposerAUcmCopie);
          return;
        }
        const copie = el('textarea');
        copie.className = 'input fiche-copie';
        copie.value = texte;
        copie.readOnly = true;
        copie.rows = 8;
        copie.setAttribute('aria-label', TEXTES.proposerAUcm);
        zone.replaceChildren(creerErreur(TEXTES.copieRefusee), copie);
        copie.select();
      });
    }

    function creerLAction(action: ActionDuPied, donnees: FicheVue): HTMLButtonElement {
      const libelle = libelleDeLAction(action);
      switch (action) {
        case 'ne-pas-appliquer':
        case 'appliquer-de-nouveau':
          return actionTexte(libelle, () => envoyer({ type: 'ecart-ucm', terme: donnees.mot, actif: !donnees.ecart }, 'relire'));
        case 'supprimer-la-regle':
          return actionTexte(libelle, () => envoyer({ type: 'supprimer', terme: donnees.mot }, 'fermer'), undefined, true);
        case 'proposer-a-ucm': {
          const proposer = creerUnBouton(libelle, 'secondary', () => proposerAUcm(donnees, proposer));
          return proposer;
        }
        case 'remplace-d-autres-termes':
          return creerUnBouton(libelle, 'secondary', () => montrerUneEtape('remplace-termes'));
        case 'remplacer-par':
          return creerUnBouton(libelle, 'primary', () => montrerUneEtape('remplacer-par'));
      }
    }

    function creerLePiedDeLaFiche(donnees: FicheVue, sorte: SorteDeFiche): HTMLElement {
      const { gauche, droite } = piedDeLaFiche(sorte, donnees);
      return creerLePied(gauche === null ? null : creerLAction(gauche, donnees), ...droite.map((action) => creerLAction(action, donnees)));
    }

    function creerLeBlocDeFiche(bloc: BlocDeFiche, sorte: SorteDeFiche, donnees: FicheVue): HTMLElement {
      switch (bloc) {
        case 'identite': return creerLIdentite(sorte, donnees);
        case 'regle': return creerLaRegle(donnees);
        case 'gardes-separes': return creerGardesSepares(donnees);
        case 'ecriture-gardee': return creerEcritureGardee(donnees);
        case 'a-renommer': return creerARenommer(donnees);
        case 'deja-employe': return creerDejaEmploye(donnees);
      }
    }

    /** Le bouton qui filtre le tableau des tokens sur le terme et sur les termes qu'il remplace. */
    function creerLeFiltre(donnees: FicheVue): HTMLElement {
      const ligne = el('div');
      ligne.className = 'filtre-ligne';
      const filtrer = createButton({
        label: TEXTES.filtrerLeTableau,
        variant: 'secondary',
        compact: true,
        // La feuille reste ouverte : le tableau est à côté, la feuille garde le terme sous les yeux.
        onClick: () => {
          coquille.rechercherLeTerme(donnees.mot, [donnees.mot, ...donnees.remplace.map(({ mot }) => mot)]);
        },
      });
      ligne.append(enregistrerLeBouton(filtrer));
      return ligne;
    }

    function montrerLaFiche(): void {
      if (!fiche) return;
      const donnees = fiche;
      const sorte = sorteDeFiche(donnees);
      etape = null;
      simulation = null;
      boutons = [];
      zone = el('div');
      zone.setAttribute('aria-live', 'polite');

      const corps = creerLeContenu();
      corps.append(creerLeFiltre(donnees), zone, ...blocsDeLaFiche(sorte, donnees).map((bloc) => creerLeBlocDeFiche(bloc, sorte, donnees)));
      feuille.remplacer({ titre: titreDeLaFiche(sorte, donnees), corps, pied: creerLePiedDeLaFiche(donnees, sorte) });
      poserLEntete(pastilleDeLaFiche(sorte, donnees, entree.statut === 'a-trancher'), definitionDeLaFiche(sorte, donnees));
    }

    function montrerUneEtape(genre: 'remplacer-par' | 'remplace-termes'): void {
      if (!fiche) return;
      const donnees = fiche;
      boutons = [];
      zone = el('div');
      zone.setAttribute('aria-live', 'polite');
      let pret = false;

      const etiquette = genre === 'remplacer-par' ? TEXTES.termeAEmployer : TEXTES.termesRemplaces;
      const saisie = el('input', 'input');
      saisie.type = 'text';
      saisie.id = 'feuille-saisie';
      saisie.autocomplete = 'off';
      saisie.spellcheck = false;
      const champ = el('div');
      champ.className = 'fiche-section';
      const nom = el('label', 'field-label', etiquette);
      nom.htmlFor = saisie.id;
      champ.append(nom, saisie);
      if (genre === 'remplacer-par') {
        const suggestions = el('datalist');
        suggestions.id = 'feuille-termes-ucm';
        suggestions.setAttribute('aria-label', TEXTES.termesDUcm);
        for (const terme of termesDuReferentiel()) {
          const option = el('option');
          option.value = terme;
          suggestions.append(option);
        }
        saisie.setAttribute('list', suggestions.id);
        champ.append(suggestions);
      }

      const gesteDeLEtape = (): GesteSurLesRegles | null => {
        const mots = motsSaisis(saisie.value);
        if (genre === 'remplacer-par') return mots.length === 1 ? { type: 'remplacer-par', terme: donnees.mot, par: mots[0] } : null;
        return mots.length > 0 ? { type: 'remplace-termes', terme: donnees.mot, termes: termesRemplaces(donnees, mots) } : null;
      };
      const enregistrer = createButton({
        label: TEXTES.enregistrer,
        disabled: true,
        onClick: () => {
          const geste = gesteDeLEtape();
          if (geste) envoyer(geste, 'fermer');
        },
      });
      const simuler = (): void => {
        minuteur = null;
        const geste = gesteDeLEtape();
        if (geste) simulation = frontiere.simuler(geste);
      };

      saisie.addEventListener('input', () => {
        if (minuteur !== null) clearTimeout(minuteur);
        minuteur = null;
        simulation = null;
        pret = false;
        enregistrer.disabled = true;
        zone.replaceChildren();
        const nombre = motsSaisis(saisie.value).length;
        if (nombre === 0) return;
        if (genre === 'remplacer-par' && nombre > 1) {
          zone.append(el('p', 'meta', TEXTES.unSeulTerme));
          return;
        }
        minuteur = setTimeout(simuler, DELAI_DE_SIMULATION);
      });

      etape = {
        recevoirLaSimulation(message) {
          if (message.conflit) {
            pret = false;
            zone.replaceChildren(creerConflit([message.conflit]));
          } else {
            pret = true;
            zone.replaceChildren(creerEffetDeTerme(message.effet));
          }
          enregistrer.disabled = !pret;
        },
        relancer: simuler,
        figer(oui) {
          enregistrer.disabled = oui || !pret;
        },
      };

      const corps = creerLeContenu();
      corps.append(champ, zone);
      feuille.remplacer({
        titre: genre === 'remplacer-par' ? TEXTES.titreRemplacerPar(donnees.mot) : TEXTES.titreRemplaceDAutres(donnees.mot),
        retour: () => {
          if (minuteur !== null) clearTimeout(minuteur);
          minuteur = null;
          montrerLaFiche();
        },
        corps,
        pied: creerLePied(null, enregistrer),
      });
      poserLEntete(null, null);
      saisie.focus();
    }

    ouverte = {
      fermer: () => feuille.fermer(),
      recevoir(message) {
        switch (message.type) {
          case 'fiche':
            if (message.demande !== demandeDeFiche) return;
            demandeDeFiche = null;
            fiche = message.fiche;
            if (etape === null) montrerLaFiche();
            return;
          case 'simulation':
            if (message.demande !== simulation) return;
            simulation = null;
            etape?.recevoirLaSimulation(message);
            return;
          case 'bilan': {
            if (attente === null || message.demande !== attente.demande) {
              feuille.fermer();
              return;
            }
            const { apres } = attente;
            attente = null;
            if (apres === 'fermer') {
              feuille.fermer();
            } else if (apres === 'resimuler') {
              figer(false);
              etape?.relancer();
            } else {
              demandeDeFiche = frontiere.fiche(entree.mot);
              if (demandeDeFiche === null) feuille.fermer();
            }
            return;
          }
          case 'refus':
            if (attente === null || message.demande !== attente.demande) return;
            attente = null;
            figer(false);
            zone.replaceChildren(creerConflit(message.conflits));
            return;
          case 'erreur':
            if (message.demande === simulation) simulation = null;
            if (attente !== null && message.demande === attente.demande) {
              attente = null;
              figer(false);
              poserErreur(TEXTES.erreur[message.code]);
            } else if (message.demande === demandeDeFiche) {
              demandeDeFiche = null;
              figer(false);
              poserErreur(TEXTES.erreur[message.code]);
            }
            return;
          default:
            return;
        }
      },
    };
  }

  regles.surModifierLEcriture(ouvrirLEcriture);
  regles.surChoisirUnTerme(ouvrirUnTerme);

  coquille.abonner((message) => {
    if (!ouverte) return;
    // Une nouvelle analyse change la génération : ni la fiche ni l'effet affichés ne valent plus.
    if (message.type === 'initial' || message.type === 'analyse-demandee') ouverte.fermer();
    else ouverte.recevoir(message);
  });
}

/**
 * Les feuilles de l'onglet Règles : l'écriture des noms, la fiche d'un terme
 * (UCM, personnalisé, remplacé par un autre ou sans règle) et les deux étapes
 * « Remplacer par… » et « Remplace d'autres termes… », qui prennent la place de
 * la fiche dans la même feuille. Une seule feuille est ouverte à la fois.
 *
 * Chaque changement part par `coquille.frontiere.regle` et la feuille attend le
 * `bilan` de sa demande ; l'effet d'un choix se lit avant, par `simuler`.
 */
import { REGISTRES, type Terme } from '@ucm-kit/core/referentiel';
import { createButton } from 'ucm-plugin-socle/src/ui/Button';
import { createFeuille } from 'ucm-plugin-socle/src/ui/Feuille';
import type { ConflitVue, EffetVue, FicheVue, GesteSurLesRegles, LigneVue, PluginMessage, TermeDeListe } from '../messages';
import type { Coquille } from './coquille';
import { creerCarteDEcriture } from './ecriture';
import type { MessageAAfficher } from './frontiere';
import { carteDeConflit } from './questions';
import type { ReglesMontees } from './regles';
import { TEXTES } from './textes';

/** Le délai après lequel une saisie calme demande sa simulation. */
const DELAI_DE_SIMULATION = 250;

export type SorteDeFiche = 'ucm' | 'personnalise' | 'remplace' | 'sans-regle';

/**
 * La fiche qu'une ligne de la liste ouvre. Un terme que la liste dit remplacé
 * par un autre ne se modifie pas ici : le terme qui le remplace porte la règle.
 */
export function sorteDeFiche(terme: Pick<TermeDeListe, 'avec'>, fiche: Pick<FicheVue, 'origine'>): SorteDeFiche {
  if (terme.avec !== null) return 'remplace';
  if (fiche.origine === 'ucm') return 'ucm';
  return fiche.origine === 'personnalise' ? 'personnalise' : 'sans-regle';
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
  zone.className = 'zone-hors-champ';
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
  return el('span', `pastille pastille-${variante}`, texte);
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
  recevoirLaSimulation(message: Extract<PluginMessage, { type: 'simulation' }>): void;
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

    const fermer = createButton({ label: TEXTES.fermer, variant: 'secondary', onClick: () => feuille.fermer() });
    const attendre = creerLeContenu();
    attendre.append(zone, demandeDeFiche === null ? creerErreur(TEXTES.erreur.echec) : el('p', 'meta', TEXTES.lectureDuTerme));
    const feuille = createFeuille({
      titre: entree.mot,
      corps: attendre,
      pied: creerLePied(null, fermer),
      onFermer: () => {
        if (minuteur !== null) clearTimeout(minuteur);
        ouverte = null;
        regles.designerLeTerme(null);
        // La liste se redessine pour effacer la ligne choisie : le focus revient à la ligne du terme.
        const lignes = Array.from(coquille.panneaux.regles.contenu.querySelectorAll<HTMLElement>('.ligne-terme'));
        lignes.find((ligne) => ligne.querySelector('.mot')?.textContent === entree.mot)?.focus();
      },
    });
    feuille.element.classList.add('feuille-terme');
    regles.designerLeTerme(entree.mot);

    function enregistrerLeBouton<T extends HTMLButtonElement>(bouton: T): T {
      boutons.push(bouton);
      return bouton;
    }

    function actionTexte(libelle: string, auClic: () => void, etiquette?: string): HTMLButtonElement {
      const bouton = el('button', 'btn-texte', libelle);
      bouton.type = 'button';
      if (etiquette) bouton.setAttribute('aria-label', etiquette);
      bouton.addEventListener('click', auClic);
      return enregistrerLeBouton(bouton);
    }

    function creerUnBouton(libelle: string, variante: 'primary' | 'secondary', auClic: () => void, compact = false): HTMLButtonElement {
      return enregistrerLeBouton(createButton({ label: libelle, variant: variante, compact, onClick: auClic }));
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

    function creerEntete(donnees: FicheVue, sorte: SorteDeFiche): HTMLElement {
      const entete = el('div');
      entete.className = 'fiche-entete';
      const ucm = donnees.origine === 'ucm';
      if (sorte === 'sans-regle') entete.append(creerPastille(entree.statut === 'a-trancher' ? TEXTES.pastilleATrancherDuTerme : TEXTES.pastilleSansRegle, 'indice'));
      else if (ucm) entete.append(creerPastille(donnees.categorieUcm ? TEXTES.pastilleUcmDeCategorie(TEXTES.categorieDuTermeUcm(donnees.categorieUcm)) : TEXTES.pastilleUcm, 'ucm'));
      else entete.append(creerPastille(TEXTES.pastillePersonnalise, 'personnalise'));
      const lignes: (string | null)[] = [
        donnees.definition ?? (sorte === 'personnalise' ? TEXTES.definitionPersonnalisee : null),
        donnees.ecart ? TEXTES.termeEcarte : null,
        sorte === 'remplace' && entree.avec !== null ? TEXTES.termeRemplacePar(entree.avec) : null,
        sorte === 'sans-regle' && donnees.question !== null ? TEXTES.questionSurLeTerme : null,
      ];
      for (const texte of lignes) {
        if (texte === null) continue;
        const ligne = el('p', 'meta');
        poserLeTexte(ligne, texte);
        entete.append(ligne);
      }
      return entete;
    }

    function creerLaSectionRemplace(donnees: FicheVue): HTMLElement {
      const rangs = donnees.remplace.map(({ mot, nombre, ucm }) =>
        creerUnRang(
          creerLeTerme(mot, TEXTES.variablesDeLaCollection(nombre)),
          ucm ? null : actionTexte(TEXTES.retirer, () => envoyer({ type: 'retirer-remplace', terme: donnees.mot, remplace: mot }, 'relire'), TEXTES.retirerLeTermeRemplace(mot)),
        ),
      );
      const section = creerLaSection(TEXTES.sectionRemplace, ...rangs);
      section.firstElementChild?.append(creerUnBouton(TEXTES.ajouterUnTerme, 'secondary', () => montrerUneEtape('remplace-termes'), true));
      return section;
    }

    function creerLaSectionEmploi(donnees: FicheVue): HTMLElement {
      const section = creerLaSection(TEXTES.sectionEmploi);
      section.firstElementChild?.append(el('span', 'meta', TEXTES.variablesDeLaCollection(donnees.emploi.nombre)));
      if (donnees.emploi.exemples.length > 0) {
        const exemples = el('div');
        exemples.className = 'carte fiche-exemples';
        exemples.append(...donnees.emploi.exemples.map(creerChemin));
        section.append(exemples);
      }
      return section;
    }

    function proposerAUcm(donnees: FicheVue, bouton: HTMLButtonElement): void {
      const texte = texteDeLaProposition(donnees);
      void copierTexte(texte).then((issue) => {
        if (ouverte === null || !bouton.isConnected) return;
        if (issue === 'copie') {
          bouton.textContent = TEXTES.proposerAUcmCopie;
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

    function creerLePiedDeLaFiche(donnees: FicheVue, sorte: SorteDeFiche): HTMLElement {
      const fermerLaFiche = creerUnBouton(TEXTES.fermer, 'secondary', () => feuille.fermer());
      switch (sorte) {
        case 'ucm':
          return creerLePied(
            actionTexte(donnees.ecart ? TEXTES.appliquerDeNouveau : TEXTES.nePasLAppliquer, () => envoyer({ type: 'ecart-ucm', terme: donnees.mot, actif: !donnees.ecart }, 'relire')),
            fermerLaFiche,
          );
        case 'personnalise': {
          const proposer = actionTexte(TEXTES.proposerAUcm, () => proposerAUcm(donnees, proposer));
          return creerLePied(proposer, creerUnBouton(TEXTES.supprimerLaRegle, 'secondary', () => envoyer({ type: 'supprimer', terme: donnees.mot }, 'fermer')));
        }
        case 'sans-regle':
          return creerLePied(
            creerUnBouton(TEXTES.remplaceDAutresTermes, 'secondary', () => montrerUneEtape('remplace-termes')),
            creerUnBouton(TEXTES.remplacerParPoints, 'primary', () => montrerUneEtape('remplacer-par')),
          );
        case 'remplace': {
          const parTerme = entree.avec;
          const retirer = donnees.origine === 'personnalise' && parTerme !== null
            ? actionTexte(TEXTES.retirerCeRemplacement, () => envoyer({ type: 'retirer-remplace', terme: parTerme, remplace: donnees.mot }, 'fermer'))
            : null;
          return creerLePied(retirer, fermerLaFiche);
        }
      }
    }

    function montrerLaFiche(): void {
      if (!fiche) return;
      const donnees = fiche;
      const sorte = sorteDeFiche(entree, donnees);
      etape = null;
      simulation = null;
      boutons = [];
      zone = el('div');
      zone.setAttribute('aria-live', 'polite');

      const corps = creerLeContenu();
      corps.append(zone, creerEntete(donnees, sorte));
      if (sorte === 'ucm' || sorte === 'personnalise') corps.append(creerLaSectionRemplace(donnees));
      if (donnees.distincts.length > 0) {
        corps.append(
          creerLaSection(
            TEXTES.sectionGardeSepare,
            ...donnees.distincts.map((autre) =>
              creerUnRang(
                creerLeTerme(autre, null),
                actionTexte(TEXTES.retirer, () => envoyer({ type: 'retirer-distinct', termes: [donnees.mot, autre] }, 'relire'), TEXTES.retirerLaSeparation(donnees.mot, autre)),
              ),
            ),
          ),
        );
      }
      if (donnees.voulu) {
        const texte = el('span', 'meta', TEXTES.ecritureVoulue);
        corps.append(
          creerLaSection(TEXTES.ecritureGardee, creerUnRang(texte, actionTexte(TEXTES.retirer, () => envoyer({ type: 'retirer-voulu', terme: donnees.mot }, 'relire'), TEXTES.retirerLEcritureVoulue(donnees.mot)))),
        );
      }
      corps.append(creerLaSectionEmploi(donnees));
      feuille.remplacer({ titre: donnees.mot, corps, pied: creerLePiedDeLaFiche(donnees, sorte) });
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

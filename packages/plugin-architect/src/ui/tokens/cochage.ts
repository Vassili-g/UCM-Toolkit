/**
 * Le cochage commun de l'onglet Constats du mode Tokens : un seul pied compte les cases cochées des deux domaines, les renommages de
 * Nomenclature et les corrections de structure, et « Tout cocher » et « Tout décocher » se posent sous la bande d'une section.
 *
 * Toutes les cases arrivent décochées. Appliquer écrit d'abord les renommages, puis les corrections de structure par leur identifiant :
 * le sandbox relit chaque variable avant d'écrire, donc il voit les noms que les renommages ont changés. Les corrections de structure
 * ne partent qu'une fois les renommages écrits et le fichier relu. Un refus, une erreur ou une confirmation refusée des renommages
 * arrête l'application : les corrections de structure restent cochées et rien n'est envoyé pour elles. Des renommages écrits sans
 * correction cochée relisent quand même la structure : ses constats citent des noms que les renommages viennent de changer.
 */
import { createButton } from 'ucm-plugin-socle/src/ui/Button';
import { TEXTES } from '../textes';
import { TEXTES as TEXTES_DES_NOMS } from '../textes/nomenclature';
import { TEXTES_TOKENS } from '../textes/tokens';

/** Les noms que les renommages cochés écriraient. */
export type CompteDesRenommages =
  /** `filtre` est la collection que le filtre de l'arbre retient ; seuls ses noms s'écrivent. */
  | { readonly etat: 'pret'; readonly variables: number; readonly collections: number; readonly filtre: string | null }
  /** Un filtre est posé et les noms de sa collection ne sont pas encore tous lus. */
  | { readonly etat: 'chargement' }
  /** Une version plus récente du plugin a rangé des règles dans le fichier : rien ne se renomme. */
  | { readonly etat: 'regles-futures' };

/** Ce que devient une demande de renommage : écrite, échouée ou refusée, ou abandonnée à la confirmation. */
export type IssueDesRenommages = 'ecrit' | 'echec' | 'abandon';

/** Ce que Nomenclature montre au pied commun : ses cases, son compte et son écriture. */
export interface PontDesRenommages {
  compte(): CompteDesRenommages;
  /** Le nombre de groupes de renommages du bilan, cochés ou non. */
  groupes(): number;
  /** Une écriture, une annulation ou la relecture de la sélection est en vol. */
  occupe(): boolean;
  toutCocher(): void;
  toutDecocher(): void;
  /**
   * Ouvre la confirmation, envoie les renommages cochés, puis appelle `suite` : `ecrit` quand le sandbox a écrit et relu le fichier,
   * `echec` quand l'écriture est refusée ou échoue, `abandon` quand le designer refuse la confirmation.
   */
  appliquer(suite: (issue: IssueDesRenommages) => void): void;
  /** Appelle le rappel à chaque changement de case, de filtre, de bilan ou d'attente ; rend la fonction qui le retire. */
  abonner(rappel: () => void): () => void;
}

/** Le pont d'un écran sans renommages : aucun groupe, aucun nom. */
export const SANS_RENOMMAGES: PontDesRenommages = {
  compte: () => ({ etat: 'pret', variables: 0, collections: 0, filtre: null }),
  groupes: () => 0,
  occupe: () => false,
  toutCocher() {},
  toutDecocher() {},
  appliquer: (suite) => suite('echec'),
  abonner: () => () => {},
};

/** Ce que les corrections de structure montrent au pied commun. */
export interface SourceDeStructure {
  /** Les identifiants des lignes cochées. */
  idsCoches(): readonly string[];
  /** Le nombre de lignes de correction, cochées ou non. */
  lignes(): number;
  toutCocher(): void;
  /** Envoie les corrections ; le pied reste occupé jusqu'à `structureRevenue`. */
  ecrire(ids: readonly string[]): void;
  /** Demande une nouvelle lecture de la structure, sans rien écrire. */
  relire(): void;
}

export interface OptionsDuPied {
  /** Là où le pied se pose. */
  readonly hote: HTMLElement;
  readonly renommages: PontDesRenommages;
  readonly structure: SourceDeStructure;
  /** Vrai tant que l'analyse n'est pas finie, noms compris : Appliquer et « Tout cocher » restent désactivés. Absent, jamais. */
  readonly analyseEnCours?: () => boolean;
}

export interface Pied {
  /** Les cases ou les lectures de l'un des domaines ont changé : le pied se recompte. */
  recompter(): void;
  /** Les corrections de structure sont revenues, écrites ou non : Appliquer se rouvre. */
  structureRevenue(): void;
  /** Vrai de l'appui sur Appliquer jusqu'au retour de la dernière écriture. */
  enCours(): boolean;
}

/** Un bouton texte du pied ou d'une section. */
export function creerBoutonTexte(libelle: string, auClic: () => void): HTMLButtonElement {
  const bouton = document.createElement('button');
  bouton.type = 'button';
  bouton.className = 'btn-texte';
  bouton.textContent = libelle;
  bouton.addEventListener('click', auClic);
  return bouton;
}

/** « Tout cocher » et « Tout décocher », à poser sous la bande d'une section ; masquer l'élément quand elle n'a aucune case. */
export function creerLesGestesDeSection(toutCocher: () => void, toutDecocher: () => void): HTMLElement {
  const gestes = document.createElement('div');
  gestes.className = 'section-actions';
  gestes.append(creerBoutonTexte(TEXTES.correctionsDuComposant.toutCocher, toutCocher), creerBoutonTexte(TEXTES.correctionsDuComposant.toutDecocher, toutDecocher));
  return gestes;
}

function enGras(texte: string): HTMLElement {
  const gras = document.createElement('b');
  gras.textContent = texte;
  return gras;
}

/**
 * Ce que le pied dit des cases cochées. Une seule sorte de case garde la phrase de son domaine ; les deux ensemble disent l'ordre
 * des écritures. Un filtre qui charge ses noms ne laisse rien dire de plus : le compte n'est pas connu.
 */
export function resumeDuPied(noms: CompteDesRenommages, corrections: number): (string | HTMLElement)[] {
  if (noms.etat === 'chargement') return [TEXTES_DES_NOMS.chargementDesNoms];
  const nombreDeNoms = noms.etat === 'pret' ? noms.variables + noms.collections : 0;
  if (nombreDeNoms === 0 && corrections === 0) return [noms.etat === 'regles-futures' ? TEXTES_DES_NOMS.reglesFutures : TEXTES.correctionsDuComposant.aucuneCochee];
  if (noms.etat !== 'pret' || nombreDeNoms === 0) {
    const ecrit = TEXTES.appliquerEcrit(corrections);
    return [ecrit.debut, enGras(ecrit.nombre), ecrit.fin];
  }
  if (corrections === 0) {
    if (noms.filtre !== null) {
      const sousFiltre = TEXTES_DES_NOMS.appliquerSousFiltre(noms.variables, noms.collections, noms.filtre);
      return [sousFiltre.debut, enGras(sousFiltre.nombre), sousFiltre.fin];
    }
    const coches = TEXTES_DES_NOMS.nomsCoches(nombreDeNoms);
    return [enGras(coches.nombre), coches.suite];
  }
  const renomme = TEXTES_DES_NOMS.nomsQuiChangent(noms.variables, noms.collections);
  const ecrit = TEXTES.appliquerEcrit(corrections);
  return [TEXTES_TOKENS.pied.renomme, enGras(renomme.noms), TEXTES_TOKENS.pied.puisEcrit, enGras(ecrit.nombre), ecrit.fin];
}

export function monterLePied({ hote, renommages, structure, analyseEnCours = () => false }: OptionsDuPied): Pied {
  const element = document.createElement('div');
  element.className = 'corrections-pied';
  const resume = document.createElement('span');
  resume.className = 'corrections-resume';
  const toutCocher = creerBoutonTexte(TEXTES.correctionsDuComposant.toutCocher, () => {
    renommages.toutCocher();
    structure.toutCocher();
  });
  toutCocher.classList.add('cocher-global');
  const appliquer = createButton({ label: TEXTES.appliquer, onClick: lancer });
  element.append(resume, toutCocher, appliquer);
  hote.append(element);

  let enCours = false;

  function rafraichir(): void {
    const noms = renommages.compte();
    const corrections = structure.idsCoches().length;
    const nombreDeNoms = noms.etat === 'pret' ? noms.variables + noms.collections : 0;
    element.hidden = renommages.groupes() === 0 && structure.lignes() === 0;
    resume.replaceChildren(...resumeDuPied(noms, corrections));
    const analyse = analyseEnCours();
    toutCocher.disabled = enCours || analyse;
    appliquer.disabled = enCours || analyse || renommages.occupe() || noms.etat === 'chargement' || nombreDeNoms + corrections === 0;
  }

  function terminer(): void {
    enCours = false;
    rafraichir();
  }

  function ecrireLaStructure(ids: readonly string[]): void {
    if (ids.length === 0) {
      // Seuls des renommages ont été écrits : les constats gardés citent les anciens noms, et leurs corrections visent les anciens rôles.
      structure.relire();
      terminer();
      return;
    }
    structure.ecrire(ids);
  }

  function lancer(): void {
    if (enCours || appliquer.disabled) return;
    const noms = renommages.compte();
    const ids = structure.idsCoches();
    enCours = true;
    rafraichir();
    if (noms.etat !== 'pret' || noms.variables + noms.collections === 0) {
      ecrireLaStructure(ids);
      return;
    }
    renommages.appliquer((issue) => {
      if (issue === 'ecrit') ecrireLaStructure(ids);
      else terminer();
    });
  }

  renommages.abonner(rafraichir);
  rafraichir();
  return { recompter: rafraichir, structureRevenue: terminer, enCours: () => enCours };
}

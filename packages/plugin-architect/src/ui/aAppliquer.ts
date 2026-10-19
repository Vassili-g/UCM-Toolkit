/**
 * Le contenu de l'onglet À appliquer : une carte par groupe de renommages sous
 * trois intertitres, la carte repliée des noms non renommés, le pied avec le
 * compte des noms cochés, la confirmation et la ligne qui suit une application.
 * Ce que le designer a coché vit dans `selection.ts` ; ce module le reflète dans
 * les cases et envoie `appliquer` avec ce modèle.
 */
import { CONVENTIONS, REGISTRE_CASSES, REGISTRE_SEPARATEURS, libelleDuTerme, termeRetenu, type Convention } from '@ucm-kit/core/referentiel';
import { createButton } from 'ucm-plugin-socle/src/ui/Button';
import { createFeuille } from 'ucm-plugin-socle/src/ui/Feuille';
import type { Bilan, BloqueVue, GroupeVue, LigneVue, PluginMessage, ResultatVue } from '../messages';
import type { Coquille } from './coquille';
import {
  cocherGroupe,
  cocherLigne,
  compterLesNomsCoches,
  compterLesNomsCochesParSorte,
  creerSelection,
  etatDuGroupe,
  ligneCochee,
  nombreCocheDuGroupe,
  oublierLesInclus,
  reconcilier,
  versSelection,
  type ModeleDeSelection,
} from './selection';
import { TEXTES } from './textes';

type Pastille = 'ucm' | 'personnalise' | 'nouveau' | 'bloque' | 'protege';

/** Ce que la ligne au-dessus de la liste annonce. */
type Annonce =
  | { readonly type: 'renomme'; readonly renommes: number; readonly sautes: number; readonly annulable: boolean }
  | { readonly type: 'refuse' }
  | { readonly type: 'annulation-partielle'; readonly sautes: number }
  | { readonly type: 'annulation-refusee' };

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

function libelleDeConvention(convention: Convention): string {
  const connue = CONVENTIONS.find(({ convention: autre }) => autre.casse === convention.casse && autre.separateur === convention.separateur);
  if (connue) return connue.libelle.fr;
  const casse = termeRetenu(REGISTRE_CASSES, convention.casse);
  const separateur = termeRetenu(REGISTRE_SEPARATEURS, convention.separateur);
  return `${casse ? libelleDuTerme(casse, 'fr') : convention.casse} · ${(separateur ? libelleDuTerme(separateur, 'fr') : convention.separateur).toLowerCase()}`;
}

/** Le détail d'une carte sous son avant → après, d'après la règle du groupe. */
function detailDuGroupe(groupe: GroupeVue): string {
  const { regle } = groupe;
  switch (regle.sorte) {
    case 'terme':
      return TEXTES.nombreDeNoms(groupe.variables, groupe.collections);
    case 'ecriture':
      return `${TEXTES.categorieDEcriture[regle.categorie]} · ${libelleDeConvention(regle.convention)}`;
    case 'collection':
      return groupe.variables > 0 ? `${TEXTES.collectionUcm} · ${TEXTES.nombreDeNoms(groupe.variables, 0)}` : TEXTES.collectionUcm;
  }
}

function fabriquerChange(avant: string, apres: string, autres: number): HTMLElement {
  const change = document.createElement('span');
  change.className = 'change';
  const codeAvant = document.createElement('code');
  codeAvant.className = 'avant';
  codeAvant.textContent = avant;
  const fleche = document.createElement('span');
  fleche.className = 'fleche';
  fleche.textContent = '→';
  const codeApres = document.createElement('code');
  codeApres.className = 'apres';
  codeApres.textContent = apres;
  change.append(codeAvant, fleche, codeApres);
  if (autres > 0) {
    const plus = document.createElement('span');
    plus.className = 'plus';
    plus.textContent = `+${autres}`;
    change.append(plus);
  }
  return change;
}

function fabriquerPastille(variante: Pastille): HTMLElement {
  const pastille = document.createElement('span');
  pastille.className = 'pastille';
  switch (variante) {
    case 'ucm':
      pastille.classList.add('pastille-ucm');
      pastille.textContent = TEXTES.pastilleUcm;
      break;
    case 'personnalise':
      pastille.classList.add('pastille-personnalise');
      pastille.textContent = TEXTES.pastillePersonnalise;
      break;
    case 'nouveau':
      pastille.classList.add('pastille-nouveau');
      pastille.textContent = TEXTES.pastilleNouveau;
      break;
    case 'bloque':
      pastille.classList.add('pastille-bloque');
      pastille.textContent = TEXTES.pastilleBloque;
      break;
    case 'protege':
      pastille.classList.add('pastille-protege');
      pastille.textContent = TEXTES.pastilleProtege;
      break;
  }
  return pastille;
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

function fabriquerCase(libelle: string, auChangement: (coche: boolean) => void): HTMLInputElement {
  const caseACocher = document.createElement('input');
  caseACocher.type = 'checkbox';
  caseACocher.className = 'case';
  caseACocher.setAttribute('aria-label', libelle);
  caseACocher.addEventListener('change', () => auChangement(caseACocher.checked));
  return caseACocher;
}

function fabriquerIntertitre(texte: string): HTMLElement {
  const intertitre = document.createElement('div');
  intertitre.className = 'intertitre';
  const titre = document.createElement('h2');
  titre.textContent = texte;
  intertitre.append(titre);
  return intertitre;
}

function fabriquerChevron(): HTMLElement {
  const chevron = document.createElement('span');
  chevron.className = 'chevron';
  chevron.setAttribute('aria-hidden', 'true');
  return chevron;
}

export interface DemandeDeConfirmation {
  readonly variables: number;
  readonly collections: number;
  /** Appelée après la fermeture de la feuille, quand le designer confirme. */
  readonly renommer: () => void;
  /** Appelée à chaque fermeture, confirmation comprise. */
  readonly auRetour?: () => void;
}

/**
 * La confirmation qui précède chaque application, dans une feuille du socle. Le
 * focus arrive sur Retour et revient au bouton qui a ouvert la feuille à sa
 * fermeture.
 */
export function ouvrirConfirmation({ variables, collections, renommer, auRetour }: DemandeDeConfirmation): { fermer(): void } {
  const faits = document.createElement('ul');
  faits.className = 'faits';
  const changement = TEXTES.nomsQuiChangent(variables, collections);
  const premier = document.createElement('li');
  const enGras = document.createElement('b');
  enGras.textContent = changement.noms;
  premier.append(enGras, changement.suite);
  const suivants = [TEXTES.liaisonsConservees, TEXTES.fichiersUtilisateurs, TEXTES.prochainExport].map((texte) => {
    const fait = document.createElement('li');
    fait.textContent = texte;
    return fait;
  });
  faits.append(premier, ...suivants);

  const retour = createButton({ label: TEXTES.retour, variant: 'secondary', onClick: () => feuille.fermer() });
  const confirmer = createButton({
    label: TEXTES.renommer,
    onClick: () => {
      feuille.fermer();
      renommer();
    },
  });
  const pied = document.createElement('div');
  pied.className = 'feuille-actions';
  const groupe = document.createElement('span');
  groupe.className = 'feuille-groupe';
  groupe.append(retour, confirmer);
  pied.append(document.createElement('span'), groupe);

  const feuille = createFeuille({
    titre: TEXTES.titreDeLaConfirmation(variables + collections),
    corps: faits,
    pied,
    onFermer: () => auRetour?.(),
  });
  retour.focus();
  return { fermer: () => feuille.fermer() };
}

interface CarteDeGroupe {
  readonly groupe: GroupeVue;
  readonly element: HTMLElement;
  /** Remet les cases, le détail et le bouton des autres noms d'accord avec le modèle. */
  rafraichir(): void;
  recevoirLesLignes(message: Extract<PluginMessage, { type: 'lignes' }>): void;
  /** Rend la main au bouton des autres noms quand la lecture qu'il attendait a échoué. */
  recevoirUneErreur(demande: number): void;
}

/**
 * Monte l'onglet dans `coquille.panneaux.aAppliquer.contenu` et suit les
 * messages de la coquille : un `bilan` reconstruit les cartes, une `application`
 * pose la ligne du résultat.
 */
export function monterAAppliquer(coquille: Coquille): void {
  const { frontiere } = coquille;
  let bilan: Bilan | null = null;
  let modele: ModeleDeSelection = creerSelection([]);
  let cartes: CarteDeGroupe[] = [];
  let annonce: Annonce | null = null;
  /** Ce que le designer a demandé en dernier et dont la réponse n'est pas revenue. */
  let attente: { readonly sorte: 'application' | 'annulation'; readonly demande: number } | null = null;
  let confirmation: { fermer(): void } | null = null;
  const deplies = new Set<string>();
  let nonRenommesDeplie = false;
  let boutonAnnuler: HTMLButtonElement | null = null;

  const ligneDuResultat = document.createElement('div');
  ligneDuResultat.className = 'resultat';
  ligneDuResultat.setAttribute('role', 'status');
  ligneDuResultat.hidden = true;
  const liste = document.createElement('div');
  liste.className = 'liste';
  const pied = document.createElement('div');
  pied.className = 'pied';
  const resume = document.createElement('span');
  resume.className = 'resume';
  const boutonAppliquer = createButton({ label: TEXTES.appliquer, onClick: demanderLaConfirmation });
  pied.append(resume, boutonAppliquer);
  coquille.panneaux.aAppliquer.contenu.append(ligneDuResultat, liste, pied);

  function synchroniserLePied(): void {
    const nombre = compterLesNomsCoches(modele);
    if (nombre === 0) {
      resume.textContent = TEXTES.aucunNomCoche;
    } else {
      const compte = TEXTES.nomsCoches(nombre);
      const enGras = document.createElement('b');
      enGras.textContent = compte.nombre;
      resume.replaceChildren(enGras, compte.suite);
    }
    boutonAppliquer.disabled = nombre === 0 || attente !== null;
    if (boutonAnnuler) boutonAnnuler.disabled = attente !== null;
  }

  function synchroniser(): void {
    for (const carte of cartes) carte.rafraichir();
    synchroniserLePied();
  }

  function creerCarte(groupe: GroupeVue): CarteDeGroupe {
    const { cle } = groupe;
    const total = groupe.variables + groupe.collections;
    const supplementaires: LigneVue[] = [];
    const connues = new Set(groupe.apercu.map((ligne) => ligne.id));
    const rangs: { readonly ligne: LigneVue; readonly caseACocher: HTMLInputElement }[] = [];
    let demandee: { readonly debut: number; readonly demande: number } | null = null;
    let epuisee = false;

    const element = document.createElement('div');
    element.className = 'carte';
    const tete = document.createElement('div');
    tete.className = 'tete';
    const caseDuGroupe = fabriquerCase(TEXTES.renommerUnGroupe(groupe.avant, groupe.apres), () => {
      modele = cocherGroupe(modele, cle, etatDuGroupe(modele, cle) !== 'coche');
      synchroniser();
    });

    const restantes = (): number => (epuisee ? 0 : Math.max(0, total - groupe.apercu.length - supplementaires.length));
    const peutSeDeplier = groupe.apercu.length > 0 || restantes() > 0;
    const bouton = document.createElement(peutSeDeplier ? 'button' : 'div');
    bouton.className = 'tete-bouton';
    if (bouton instanceof HTMLButtonElement) bouton.type = 'button';
    const pile = document.createElement('div');
    pile.className = 'pile';
    const detail = document.createElement('span');
    detail.className = 'meta';
    pile.append(fabriquerChange(groupe.avant, groupe.apres, groupe.autres), detail);
    const droite = document.createElement('span');
    droite.className = 'droite';
    if (groupe.regle.sorte === 'terme') droite.append(fabriquerPastille(groupe.regle.origine === 'ucm' ? 'ucm' : 'personnalise'));
    if (groupe.nouveau) droite.append(fabriquerPastille('nouveau'));
    const chevron = fabriquerChevron();
    if (peutSeDeplier) droite.append(chevron);
    bouton.append(pile, droite);
    tete.append(caseDuGroupe, bouton);

    const corps = document.createElement('div');
    corps.className = 'corps';
    const ligneDesAutres = document.createElement('div');
    ligneDesAutres.className = 'rang';
    const boutonDesAutres = document.createElement('button');
    boutonDesAutres.type = 'button';
    boutonDesAutres.className = 'autres';
    ligneDesAutres.append(document.createElement('span'), boutonDesAutres);
    corps.append(ligneDesAutres);

    function ajouterUneLigne(ligne: LigneVue): void {
      const rang = document.createElement('div');
      rang.className = 'rang';
      const caseACocher = fabriquerCase(ligne.ancien, (coche) => {
        modele = cocherLigne(modele, ligne, cle, coche);
        synchroniser();
      });
      rang.append(caseACocher, fabriquerChemin(ligne));
      rangs.push({ ligne, caseACocher });
      ligneDesAutres.before(rang);
    }
    groupe.apercu.forEach(ajouterUneLigne);

    function regler(deplie: boolean): void {
      if (deplie) deplies.add(cle);
      else deplies.delete(cle);
      corps.hidden = !deplie;
      if (peutSeDeplier) bouton.setAttribute('aria-expanded', String(deplie));
      chevron.textContent = deplie ? '⌃' : '⌄';
    }
    regler(peutSeDeplier && deplies.has(cle));
    if (peutSeDeplier) bouton.addEventListener('click', () => regler(corps.hidden));

    function rafraichirLesAutres(): void {
      const nombre = restantes();
      ligneDesAutres.hidden = nombre === 0;
      boutonDesAutres.textContent = TEXTES.autresNoms(nombre);
      boutonDesAutres.disabled = demandee !== null;
    }
    boutonDesAutres.addEventListener('click', () => {
      if (demandee) return;
      const debut = groupe.apercu.length + supplementaires.length;
      const demande = frontiere.lignes(cle, debut);
      if (demande === null) return;
      demandee = { debut, demande };
      rafraichirLesAutres();
    });

    function rafraichir(): void {
      const etat = etatDuGroupe(modele, cle);
      caseDuGroupe.checked = etat === 'coche';
      caseDuGroupe.indeterminate = etat === 'partiel';
      const suites = [
        ...(etat === 'partiel' ? [TEXTES.nomsCochesDansLeGroupe(nombreCocheDuGroupe(modele, cle), total)] : []),
        ...(etat === 'vide' ? [TEXTES.nomsNonCoches(total)] : []),
      ];
      detail.textContent = [detailDuGroupe(groupe), ...suites].join(' · ');
      for (const { ligne, caseACocher } of rangs) caseACocher.checked = ligneCochee(modele, ligne, cle);
    }
    rafraichirLesAutres();

    element.append(tete, corps);
    return {
      groupe,
      element,
      rafraichir,
      recevoirLesLignes(message) {
        if (message.groupe !== cle || !demandee || message.debut !== demandee.debut) return;
        demandee = null;
        if (message.lignes.length === 0) epuisee = true;
        for (const ligne of message.lignes) {
          if (connues.has(ligne.id)) continue;
          connues.add(ligne.id);
          supplementaires.push(ligne);
          ajouterUneLigne(ligne);
        }
        rafraichirLesAutres();
        rafraichir();
      },
      recevoirUneErreur(demande) {
        if (demandee?.demande !== demande) return;
        demandee = null;
        rafraichirLesAutres();
      },
    };
  }

  function creerNonRenommes(bloques: readonly BloqueVue[], proteges: number): HTMLElement | null {
    if (bloques.length === 0 && proteges === 0) return null;
    const element = document.createElement('div');
    element.className = 'carte muette';
    const tete = document.createElement('div');
    tete.className = 'tete sans-coche';
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'tete-bouton';
    const titre = document.createElement('span');
    titre.textContent = TEXTES.nonRenommes(bloques.length, proteges);
    const chevron = fabriquerChevron();
    bouton.append(titre, chevron);
    tete.append(bouton);

    const corps = document.createElement('div');
    corps.className = 'corps';
    for (const bloque of bloques) {
      const info = document.createElement('div');
      info.className = 'info';
      const pile = document.createElement('div');
      pile.className = 'pile';
      const explication = document.createElement('span');
      explication.className = 'meta';
      poserLeTexte(explication, TEXTES.nomBloque(bloque.collection, bloque.apres));
      pile.append(fabriquerChange(bloque.avant, bloque.apres, 0), explication);
      info.append(pile, fabriquerPastille('bloque'));
      corps.append(info);
    }
    if (proteges > 0) {
      const info = document.createElement('div');
      info.className = 'info';
      const pile = document.createElement('div');
      pile.className = 'pile';
      const nombre = document.createElement('span');
      nombre.textContent = TEXTES.nomsProteges(proteges);
      const explication = document.createElement('span');
      explication.className = 'meta';
      explication.textContent = TEXTES.nomsProtegesExplication;
      pile.append(nombre, explication);
      info.append(pile, fabriquerPastille('protege'));
      corps.append(info);
    }

    function regler(deplie: boolean): void {
      nonRenommesDeplie = deplie;
      corps.hidden = !deplie;
      bouton.setAttribute('aria-expanded', String(deplie));
      chevron.textContent = deplie ? '⌃' : '⌄';
    }
    regler(nonRenommesDeplie);
    bouton.addEventListener('click', () => regler(corps.hidden));
    element.append(tete, corps);
    return element;
  }

  const SECTIONS = [
    { titre: TEXTES.intertitreTermes, sorte: 'terme' },
    { titre: TEXTES.intertitreEcriture, sorte: 'ecriture' },
    { titre: TEXTES.intertitreCollections, sorte: 'collection' },
  ] as const;

  function reconstruire(): void {
    const groupes = bilan?.groupes ?? [];
    cartes = groupes.map(creerCarte);
    const enfants: HTMLElement[] = [];
    for (const { titre, sorte } of SECTIONS) {
      const dedans = cartes.filter((carte) => carte.groupe.regle.sorte === sorte);
      if (dedans.length > 0) enfants.push(fabriquerIntertitre(titre), ...dedans.map((carte) => carte.element));
    }
    const nonRenommes = bilan ? creerNonRenommes(bilan.bloques, bilan.proteges) : null;
    if (nonRenommes) enfants.push(nonRenommes);
    liste.replaceChildren(...enfants);
    // Un groupe disparu ne garde pas son état déplié.
    for (const cle of [...deplies]) if (!groupes.some((groupe) => groupe.cle === cle)) deplies.delete(cle);
  }

  function rendreLaLigneDuResultat(): void {
    boutonAnnuler = null;
    ligneDuResultat.hidden = annonce === null;
    ligneDuResultat.replaceChildren();
    if (!annonce) return;
    const succes = annonce.type === 'renomme';
    ligneDuResultat.classList.toggle('resultat-avertissement', !succes);
    const texte = document.createElement('div');
    texte.className = 'pile';
    const titre = document.createElement('span');
    const note = document.createElement('span');
    note.className = 'meta';
    let action: HTMLButtonElement | null = null;
    switch (annonce.type) {
      case 'renomme': {
        const coche = document.createElement('span');
        coche.setAttribute('aria-hidden', 'true');
        coche.textContent = '✓ ';
        titre.append(coche, TEXTES.nomsRenommes(annonce.renommes));
        if (annonce.sautes > 0) note.textContent = TEXTES.nomsSautes(annonce.sautes);
        if (annonce.annulable) {
          action = fabriquerAction(TEXTES.annuler, () => {
            const demande = frontiere.annulerLeDernier();
            attente = { sorte: 'annulation', demande };
            synchroniserLePied();
          });
          boutonAnnuler = action;
        }
        break;
      }
      case 'refuse':
      case 'annulation-refusee':
        titre.textContent = annonce.type === 'refuse' ? TEXTES.rienNAEteRenomme : TEXTES.annulationRefusee;
        action = fabriquerAction(TEXTES.relancerLAnalyse, () => {
          frontiere.analyser();
        });
        break;
      case 'annulation-partielle':
        titre.textContent = TEXTES.nomsNonRetablis(annonce.sautes);
        break;
    }
    texte.append(titre);
    if (note.textContent) texte.append(note);
    ligneDuResultat.append(texte);
    if (action) ligneDuResultat.append(action);
    synchroniserLePied();
  }

  function fabriquerAction(libelle: string, auClic: () => void): HTMLButtonElement {
    const action = document.createElement('button');
    action.type = 'button';
    action.className = 'resultat-action';
    action.textContent = libelle;
    action.addEventListener('click', auClic);
    return action;
  }

  function demanderLaConfirmation(): void {
    const nombre = compterLesNomsCoches(modele);
    if (nombre === 0 || attente || confirmation) return;
    const { variables, collections } = compterLesNomsCochesParSorte(modele);
    const selection = versSelection(modele);
    confirmation = ouvrirConfirmation({
      variables,
      collections,
      auRetour: () => {
        confirmation = null;
      },
      renommer: () => {
        const demande = frontiere.appliquer(selection);
        if (demande === null) return;
        attente = { sorte: 'application', demande };
        synchroniserLePied();
      },
    });
  }

  function traiterLeBilan(nouveau: Bilan): void {
    confirmation?.fermer();
    bilan = nouveau;
    modele = reconcilier(modele, nouveau.groupes);
    attente = null;
    reconstruire();
    synchroniser();
    rendreLaLigneDuResultat();
  }

  function traiterLeResultat(resultat: ResultatVue): void {
    if (resultat.sorte === 'annulation' && attente?.sorte !== 'annulation') return;
    if (resultat.sorte === 'application') {
      if (resultat.statut === 'refuse') annonce = { type: 'refuse' };
      else {
        modele = oublierLesInclus(modele);
        annonce = { type: 'renomme', renommes: resultat.renommes, sautes: resultat.statut === 'partiel' ? resultat.sautes : 0, annulable: resultat.annulable };
      }
    } else if (resultat.statut === 'applique') {
      annonce = null;
    } else {
      annonce = resultat.statut === 'partiel' ? { type: 'annulation-partielle', sautes: resultat.sautes } : { type: 'annulation-refusee' };
    }
    // Un refus n'est pas suivi d'un bilan : la main revient tout de suite.
    if (resultat.statut === 'refuse') attente = null;
    synchroniser();
    rendreLaLigneDuResultat();
  }

  coquille.abonner((message) => {
    switch (message.type) {
      case 'initial':
      case 'analyse-demandee':
        annonce = null;
        attente = null;
        confirmation?.fermer();
        rendreLaLigneDuResultat();
        break;
      case 'bilan':
        traiterLeBilan(message.bilan);
        break;
      case 'lignes':
        for (const carte of cartes) carte.recevoirLesLignes(message);
        break;
      case 'application':
        traiterLeResultat(message.resultat);
        break;
      case 'erreur':
        for (const carte of cartes) carte.recevoirUneErreur(message.demande);
        if (attente?.demande === message.demande) {
          annonce = attente.sorte === 'application' ? { type: 'refuse' } : { type: 'annulation-refusee' };
          attente = null;
          synchroniser();
          rendreLaLigneDuResultat();
        }
        break;
      default:
        break;
    }
  });

  const dejaLu = coquille.etat().bilan;
  if (dejaLu) traiterLeBilan(dejaLu);
  else synchroniserLePied();
}

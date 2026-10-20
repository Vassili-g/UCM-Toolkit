/**
 * La page Configuration : les collections analysées, l'export et l'import des
 * règles du fichier, le dernier renommage et le dernier import avec leur annulation. Elle se met à
 * jour à chaque bilan, qu'elle soit ouverte ou non.
 */
import { createButton } from 'ucm-plugin-socle/src/ui/Button';
import type { Bilan, CollectionVue } from '../messages';
import type { Coquille } from './coquille';
import type { MessageAAfficher } from './frontiere';
import { telecharger } from './telechargement';
import { ouvrirUneFeuilleDeConfirmation } from './aAppliquer';
import { TEXTES } from './textes';

/** La taille d'import que `estUiMessage` accepte (`src/messages.ts`) : au-delà, le sandbox ignore la demande. */
const LIMITE_D_IMPORT = 1_000_000;

interface LigneDeCollection {
  readonly id: string;
  readonly ligne: HTMLLabelElement;
  readonly case: HTMLInputElement;
  readonly nom: HTMLElement;
  readonly detail: HTMLElement;
}

function creerIntertitre(texte: string): HTMLElement {
  const titre = document.createElement('h2');
  titre.className = 'config-titre';
  titre.textContent = texte;
  return titre;
}

function creerLigneDeCollection(collection: CollectionVue, aChange: () => void): LigneDeCollection {
  const ligne = document.createElement('label');
  ligne.className = 'config-ligne';
  const caseACocher = document.createElement('input');
  caseACocher.type = 'checkbox';
  caseACocher.addEventListener('change', aChange);
  const nom = document.createElement('code');
  nom.className = 'config-nom';
  const detail = document.createElement('span');
  detail.className = 'config-detail';
  ligne.append(caseACocher, nom, detail);
  return { id: collection.id, ligne, case: caseACocher, nom, detail };
}

function poserLaCollection(ligne: LigneDeCollection, collection: CollectionVue, analysee: boolean): void {
  ligne.case.checked = analysee;
  ligne.nom.textContent = collection.nom;
  ligne.detail.textContent = collection.palettes ? TEXTES.palettesProtegees : TEXTES.variablesDeLaCollection(collection.nombre);
}

/** Monte la page Configuration dans le conteneur de la coquille. */
export function monterConfiguration(coquille: Coquille): void {
  const { frontiere } = coquille;
  /** Les demandes de cette page : seules leurs réponses s'y affichent. */
  const demandes = new Set<number>();
  let demandeDExport: number | null = null;
  let demandeDAnnulation: number | null = null;
  let demandeDImport: number | null = null;
  let demandeDAnnulationDImport: number | null = null;
  let dernierRenommage: Bilan['dernierRenommage'] = null;
  let confirmation: { fermer(): void } | null = null;

  const message = document.createElement('div');
  message.className = 'etat-erreur';
  message.setAttribute('role', 'alert');
  message.hidden = true;

  function dire(...lignes: string[]): void {
    message.replaceChildren(...lignes.map((texte) => {
      const ligne = document.createElement('p');
      ligne.textContent = texte;
      return ligne;
    }));
    message.hidden = lignes.length === 0;
  }

  function suivre(demande: number): number {
    demandes.add(demande);
    return demande;
  }

  // Collections analysées.
  const sansCollection = document.createElement('p');
  sansCollection.className = 'subtitle';
  sansCollection.textContent = TEXTES.sansCollection;
  const liste = document.createElement('div');
  liste.className = 'config-liste';
  let lignes: LigneDeCollection[] = [];
  /**
   * Le dernier choix envoyé, tant que sa réponse n'est pas arrivée : un bilan d'une demande plus ancienne
   * ne recoche pas une case que le designer vient de décocher.
   */
  let choixEnVol: { readonly demande: number; readonly exclues: ReadonlySet<string> } | null = null;

  function configurer(): void {
    const exclues = lignes.filter((ligne) => !ligne.case.checked).map((ligne) => ligne.id);
    dire();
    choixEnVol = { demande: suivre(frontiere.configurer(exclues)), exclues: new Set(exclues) };
  }

  /** Garde les lignes, donc le focus de la case, tant que les collections sont les mêmes. */
  function poserLesCollections(collections: readonly CollectionVue[]): void {
    sansCollection.hidden = collections.length > 0;
    liste.hidden = collections.length === 0;
    const memes = collections.length === lignes.length && collections.every((collection, rang) => collection.id === lignes[rang].id);
    if (!memes) {
      lignes = collections.map((collection) => creerLigneDeCollection(collection, configurer));
      liste.replaceChildren(...lignes.map((ligne) => ligne.ligne));
    }
    collections.forEach((collection, rang) => poserLaCollection(lignes[rang], collection,
      choixEnVol ? !choixEnVol.exclues.has(collection.id) : collection.analysee));
  }

  // Règles de ce fichier.
  const exporter = createButton({
    label: TEXTES.exporter,
    variant: 'secondary',
    compact: true,
    onClick: () => {
      dire();
      demandeDExport = suivre(frontiere.exporter());
    },
  });
  const fichier = document.createElement('input');
  fichier.type = 'file';
  fichier.accept = '.json,application/json';
  fichier.hidden = true;
  fichier.setAttribute('aria-label', TEXTES.choisirLeFichierDeRegles);
  fichier.addEventListener('change', () => {
    const choisi = fichier.files?.[0];
    fichier.value = '';
    if (!choisi) return;
    dire();
    void choisi.text().then(
      (texte) => {
        if (texte.length > LIMITE_D_IMPORT) dire(TEXTES.erreur['import-illisible']);
        else demandeDImport = suivre(frontiere.importer(texte));
      },
      () => dire(TEXTES.erreur['import-illisible']),
    );
  });
  const importer = createButton({ label: TEXTES.importer, variant: 'secondary', compact: true, onClick: () => fichier.click() });
  const reglesBoutons = document.createElement('div');
  reglesBoutons.className = 'config-boutons';
  reglesBoutons.append(exporter, importer, fichier);

  // Dernier renommage.
  const renommage = document.createElement('p');
  renommage.className = 'config-renommage';
  const annuler = createButton({
    label: TEXTES.annulerLeRenommage,
    variant: 'secondary',
    compact: true,
    onClick: () => {
      if (!dernierRenommage || confirmation) return;
      const { nombre, heure } = dernierRenommage;
      confirmation = ouvrirUneFeuilleDeConfirmation({
        titre: TEXTES.confirmerLAnnulation(nombre, heure),
        corps: document.createElement('div'),
        libelleDuRetour: TEXTES.garderLesNoms,
        libelleDeLaConfirmation: TEXTES.remettreLesAnciensNoms,
        auRetour: () => {
          confirmation = null;
        },
        confirmer: () => {
          dire();
          demandeDAnnulation = suivre(frontiere.annulerLeDernier());
          synchroniserLesBoutons();
        },
      });
    },
  });
  const ligneDuRenommage = document.createElement('div');
  ligneDuRenommage.className = 'config-boutons config-ecartes';
  ligneDuRenommage.append(renommage, annuler);
  const titreDuRenommage = creerIntertitre(TEXTES.dernierRenommage);
  const sectionDuRenommage = document.createElement('div');
  sectionDuRenommage.className = 'config-section';
  sectionDuRenommage.append(titreDuRenommage, ligneDuRenommage);

  function poserLeRenommage(dernier: Bilan['dernierRenommage']): void {
    dernierRenommage = dernier;
    sectionDuRenommage.hidden = dernier === null;
    if (dernier) renommage.textContent = TEXTES.renommagesALHeure(dernier.nombre, dernier.heure);
  }

  // Dernier import.
  const texteDeLImport = document.createElement('p');
  texteDeLImport.className = 'config-renommage';
  const annulerImport = createButton({
    label: TEXTES.annulerLImport,
    variant: 'secondary',
    compact: true,
    onClick: () => {
      dire();
      demandeDAnnulationDImport = suivre(frontiere.regle({ type: 'annuler-import' }));
      synchroniserLesBoutons();
    },
  });
  const ligneDeLImport = document.createElement('div');
  ligneDeLImport.className = 'config-boutons config-ecartes';
  ligneDeLImport.append(texteDeLImport, annulerImport);
  const sectionDeLImport = document.createElement('div');
  sectionDeLImport.className = 'config-section';
  sectionDeLImport.append(creerIntertitre(TEXTES.dernierImport), ligneDeLImport);

  function poserLImport(dernier: Bilan['dernierImport']): void {
    sectionDeLImport.hidden = dernier === null;
    if (dernier) texteDeLImport.textContent = TEXTES.importALHeure(dernier.heure);
  }

  /** Un bouton d'annulation reste inactif tant que la réponse à sa demande n'est pas arrivée. */
  function synchroniserLesBoutons(): void {
    annuler.disabled = demandeDAnnulation !== null;
    annulerImport.disabled = demandeDAnnulationDImport !== null;
  }

  function section(...enfants: HTMLElement[]): HTMLElement {
    const bloc = document.createElement('div');
    bloc.className = 'config-section';
    bloc.append(...enfants);
    return bloc;
  }

  coquille.configuration.replaceChildren(
    message,
    section(creerIntertitre(TEXTES.collectionsAnalysees), sansCollection, liste),
    section(creerIntertitre(TEXTES.reglesDeCeFichier), reglesBoutons),
    sectionDuRenommage,
    sectionDeLImport,
  );

  function lireLeBilan(bilan: Bilan | null): void {
    poserLesCollections(bilan?.collections ?? []);
    poserLeRenommage(bilan?.dernierRenommage ?? null);
    poserLImport(bilan?.dernierImport ?? null);
    synchroniserLesBoutons();
  }

  coquille.abonner((recu: MessageAAfficher, etat) => {
    switch (recu.type) {
      case 'bilan':
        if (recu.demande === choixEnVol?.demande) choixEnVol = null;
        if (recu.demande === demandeDAnnulation) demandeDAnnulation = null;
        if (recu.demande === demandeDAnnulationDImport) demandeDAnnulationDImport = null;
        if (demandes.delete(recu.demande)) dire();
        lireLeBilan(etat.bilan);
        break;
      case 'regles-exportees':
        if (recu.demande === demandeDExport) {
          demandeDExport = null;
          telecharger(TEXTES.nomDuFichierDeRegles, recu.texte, 'application/json');
        }
        break;
      case 'refus':
        if (recu.demande === choixEnVol?.demande) {
          choixEnVol = null;
          poserLesCollections(etat.bilan?.collections ?? []);
        }
        if (recu.demande === demandeDAnnulationDImport) {
          demandeDAnnulationDImport = null;
          demandes.delete(recu.demande);
          synchroniserLesBoutons();
        }
        if (recu.demande === demandeDImport) {
          demandeDImport = null;
          demandes.delete(recu.demande);
          dire(TEXTES.importRefuse, ...recu.conflits.map(TEXTES.conflitDImport));
        }
        break;
      case 'application':
        if (recu.demande === demandeDAnnulation) {
          demandeDAnnulation = null;
          demandes.delete(recu.demande);
          const { statut, renommes, sautes, exclues = 0 } = recu.resultat;
          if (exclues > 0) {
            dire(TEXTES.annulationDansUneCollectionExclue(renommes, exclues),
              ...(sautes > exclues ? [TEXTES.annulationAutresNomsNonRetablis(sautes - exclues)] : []));
          } else if (statut === 'refuse') dire(TEXTES.annulationDuRenommageRefusee);
          else if (statut === 'partiel') dire(TEXTES.annulationDuRenommagePartielle(renommes, sautes));
          synchroniserLesBoutons();
        }
        break;
      case 'erreur':
        if (recu.demande === demandeDAnnulation) demandeDAnnulation = null;
        if (recu.demande === demandeDAnnulationDImport) demandeDAnnulationDImport = null;
        if (demandes.delete(recu.demande)) dire(TEXTES.erreur[recu.code]);
        // Le choix refusé n'est pas rangé : les cases reviennent au dernier bilan.
        if (recu.demande === choixEnVol?.demande) {
          choixEnVol = null;
          poserLesCollections(etat.bilan?.collections ?? []);
        }
        synchroniserLesBoutons();
        break;
    }
  });
  lireLeBilan(coquille.etat().bilan);
}

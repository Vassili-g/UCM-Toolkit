/**
 * La frontière de l'écran avec le sandbox : elle numérote les demandes, retient
 * la génération du dernier `bilan` et ne rend à l'écran que les réponses encore
 * attendues. Elle ne touche pas au DOM ; l'envoi et l'affichage lui sont injectés.
 *
 * Calculs (`analyser`, `regle`, `repondre`, `configurer`, `importer`, `appliquer`,
 * `annuler-dernier`) : un seul part à la fois. Les suivants attendent la fin du
 * calcul en vol, dans l'ordre des gestes, sauf `analyser` et `configurer` dont
 * seule la dernière demande en attente reste. Un calcul se termine par un
 * `bilan`, un `refus` ou une `erreur`, ou par une `application` refusée.
 *
 * Lectures (`lignes`, `termes`, `fiche`, `selection`, `simuler`, `diagnostic`) : elles partent pendant un
 * calcul, sur la génération courante. Une nouvelle lecture de même clé rend la
 * précédente caduque, et un nouveau `bilan` rend caduques toutes les lectures.
 */
import type { DemandeDeNomenclature, GesteSurLesRegles, MessageDeNomenclature, Reponse, RequeteDeTermes, Selection } from '../../messages/nomenclature';

/** Ce que l'écran affiche en plus des messages du sandbox : l'analyse que le designer vient de demander. */
export type MessageAAfficher = MessageDeNomenclature | { readonly type: 'analyse-demandee' };

type TypeDeDemande = DemandeDeNomenclature['type'];

/** Pour ces calculs, la demande en attente est remplacée par la plus récente. */
const DERNIERE_INTENTION: ReadonlySet<TypeDeDemande> = new Set<TypeDeDemande>(['noms-analyser', 'configurer']);

export interface OptionsDeFrontiere {
  readonly envoyer: (demande: DemandeDeNomenclature) => void;
  readonly afficher: (message: MessageAAfficher) => void;
}

/**
 * Chaque méthode de demande rend le numéro de la demande. Une lecture, ou
 * `appliquer`, rend `null` et n'envoie rien tant qu'aucun `bilan` n'a donné de génération.
 */
export interface Frontiere {
  analyser(): number;
  regle(geste: GesteSurLesRegles): number;
  repondre(question: string, reponse: Reponse): number;
  configurer(collectionsExclues: readonly string[]): number;
  importer(texte: string): number;
  /** La demande porte la génération que l'écran affiche, même si elle part après d'autres calculs. */
  appliquer(selection: Selection): number | null;
  annulerLeDernier(): number;
  lignes(groupe: string, debut: number): number | null;
  termes(requete: RequeteDeTermes): number | null;
  fiche(terme: string): number | null;
  /** Demande lesquels de ces identifiants exclus ou inclus sont encore à renommer, et leur groupe principal. */
  selection(exclus: readonly string[], inclus: readonly string[]): number | null;
  simuler(geste: GesteSurLesRegles): number | null;
  diagnostic(): number | null;
  /** L'export ne dépend d'aucune génération et ne retient aucun calcul. */
  exporter(): number;
  /** Rend à `afficher` le message s'il répond à une demande encore attendue. */
  recevoir(message: MessageDeNomenclature): void;
  generation(): number | null;
  calculEnCours(): boolean;
}

export function creerFrontiere(options: OptionsDeFrontiere): Frontiere {
  let compteur = 0;
  let generation: number | null = null;
  let enVol: DemandeDeNomenclature | null = null;
  const attente: DemandeDeNomenclature[] = [];
  /** Numéro d'une lecture en attente de réponse, vers sa clé. */
  const lectures = new Map<number, string>();
  const derniereLecture = new Map<string, number>();
  let exportEnAttente: number | null = null;

  const numeroSuivant = (): number => {
    compteur += 1;
    return compteur;
  };
  const attendu = (demande: number): boolean => enVol !== null && enVol.demande === demande;

  function partir(demande: DemandeDeNomenclature): void {
    enVol = demande;
    options.envoyer(demande);
  }

  function terminerLeCalcul(): void {
    enVol = null;
    const suivante = attente.shift();
    if (suivante) partir(suivante);
  }

  function calculer(demande: DemandeDeNomenclature): number {
    if (DERNIERE_INTENTION.has(demande.type)) {
      for (let rang = attente.length - 1; rang >= 0; rang -= 1) if (attente[rang].type === demande.type) attente.splice(rang, 1);
    }
    if (enVol) attente.push(demande);
    else partir(demande);
    return demande.demande;
  }

  function lire(cle: string, fabriquer: (demande: number, generationCourante: number) => DemandeDeNomenclature): number | null {
    if (generation === null) return null;
    const precedente = derniereLecture.get(cle);
    if (precedente !== undefined) lectures.delete(precedente);
    const demande = numeroSuivant();
    lectures.set(demande, cle);
    derniereLecture.set(cle, demande);
    options.envoyer(fabriquer(demande, generation));
    return demande;
  }

  function oublierLesLectures(): void {
    lectures.clear();
    derniereLecture.clear();
  }

  function oublierUneLecture(demande: number): void {
    const cle = lectures.get(demande);
    if (cle === undefined) return;
    lectures.delete(demande);
    if (derniereLecture.get(cle) === demande) derniereLecture.delete(cle);
  }

  function recevoirLeBilan(message: Extract<MessageDeNomenclature, { type: 'bilan' }>): void {
    if (!attendu(message.demande)) return;
    if (generation !== null && message.bilan.generation < generation) return;
    if (message.bilan.generation !== generation) oublierLesLectures();
    generation = message.bilan.generation;
    options.afficher(message);
    terminerLeCalcul();
  }

  type MessageDeLecture = Extract<MessageDeNomenclature, { type: 'lignes' | 'termes' | 'fiche' | 'noms-selection' | 'simulation' | 'diagnostic' }>;

  function aSonContenu(message: MessageDeLecture): boolean {
    const contenu = message as unknown as Record<string, unknown>;
    switch (message.type) {
      case 'termes':
        return Array.isArray(contenu.sections);
      case 'lignes':
        return Array.isArray(contenu.lignes);
      case 'fiche':
        return typeof contenu.fiche === 'object' && contenu.fiche !== null;
      case 'noms-selection':
        return Array.isArray(contenu.principaux);
      case 'diagnostic':
        return typeof contenu.texte === 'string';
      default:
        return true;
    }
  }

  function recevoirUneLecture(message: MessageDeLecture): void {
    if (!lectures.has(message.demande) || message.generation !== generation) return;
    // Hors Figma l'écran reçoit ses propres demandes : l'écho porte le même numéro
    // mais pas de contenu. Il ne doit pas consommer la lecture en attente.
    if (!aSonContenu(message)) return;
    oublierUneLecture(message.demande);
    options.afficher(message);
  }

  function recevoirUneErreur(message: Extract<MessageDeNomenclature, { type: 'erreur' }>): void {
    const duCalcul = attendu(message.demande);
    const dUneLecture = lectures.has(message.demande);
    const dUnExport = message.demande === exportEnAttente;
    // Un fichier modifié reste vrai quelle que soit la demande qui l'a constaté.
    if (!duCalcul && !dUneLecture && !dUnExport && message.code !== 'fichier-modifie') return;
    oublierUneLecture(message.demande);
    if (dUnExport) exportEnAttente = null;
    options.afficher(message);
    if (duCalcul) terminerLeCalcul();
  }

  function recevoir(message: MessageDeNomenclature): void {
    switch (message.type) {
      case 'initial':
        options.afficher(message);
        return;
      case 'lecture':
        if (enVol?.type === 'noms-analyser' && enVol.demande === message.demande) options.afficher(message);
        return;
      case 'bilan':
        recevoirLeBilan(message);
        return;
      case 'application':
        if (!attendu(message.demande)) return;
        options.afficher(message);
        // Un refus n'est pas suivi d'un bilan neuf.
        if (message.resultat.statut === 'refuse') terminerLeCalcul();
        return;
      case 'refus':
        if (!attendu(message.demande)) return;
        options.afficher(message);
        terminerLeCalcul();
        return;
      case 'lignes':
      case 'termes':
      case 'fiche':
      case 'noms-selection':
      case 'simulation':
      case 'diagnostic':
        recevoirUneLecture(message);
        return;
      case 'regles-exportees':
        if (message.demande !== exportEnAttente) return;
        exportEnAttente = null;
        options.afficher(message);
        return;
      case 'erreur':
        recevoirUneErreur(message);
        return;
    }
  }

  return {
    analyser() {
      options.afficher({ type: 'analyse-demandee' });
      return calculer({ type: 'noms-analyser', demande: numeroSuivant() });
    },
    regle: (geste) => calculer({ type: 'regle', demande: numeroSuivant(), geste }),
    repondre: (question, reponse) => calculer({ type: 'noms-repondre', demande: numeroSuivant(), question, reponse }),
    configurer: (collectionsExclues) => calculer({ type: 'configurer', demande: numeroSuivant(), collectionsExclues }),
    importer: (texte) => calculer({ type: 'importer', demande: numeroSuivant(), texte }),
    appliquer(selection) {
      if (generation === null) return null;
      return calculer({ type: 'appliquer', demande: numeroSuivant(), generation, selection });
    },
    annulerLeDernier: () => calculer({ type: 'annuler-dernier', demande: numeroSuivant() }),
    lignes: (groupe, debut) => lire(`lignes:${groupe}:${debut}`, (demande, courante) => ({ type: 'lignes', demande, generation: courante, groupe, debut })),
    termes: (requete) => lire('termes', (demande, courante) => ({ type: 'termes', demande, generation: courante, ...requete })),
    fiche: (terme) => lire('fiche', (demande, courante) => ({ type: 'fiche', demande, generation: courante, terme })),
    selection: (exclus, inclus) => lire('noms-selection', (demande, courante) => ({ type: 'noms-selection', demande, generation: courante, exclus, inclus })),
    simuler: (geste) => lire('simuler', (demande, courante) => ({ type: 'simuler', demande, generation: courante, geste })),
    diagnostic: () => lire('diagnostic', (demande, courante) => ({ type: 'diagnostic', demande, generation: courante })),
    exporter() {
      exportEnAttente = numeroSuivant();
      options.envoyer({ type: 'exporter', demande: exportEnAttente });
      return exportEnAttente;
    },
    recevoir,
    generation: () => generation,
    calculEnCours: () => enVol !== null,
  };
}

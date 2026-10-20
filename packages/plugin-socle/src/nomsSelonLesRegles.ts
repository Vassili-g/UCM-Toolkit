/**
 * Le calcul de renommage que partagent UCM Nomenclature et UCM Palettes : pour un inventaire et les règles de nommage
 * du fichier, les noms que le lexique du kit donne, après le contrôle des chemins publiés. Les deux plugins l'appellent
 * avec les mêmes entrées (tous les noms locaux du fichier, les mêmes règles, les mêmes noms non renommables) et
 * obtiennent donc les mêmes noms. Le calcul est idempotent : appliqué à ses propres résultats, il ne renomme rien. Cela
 * tient à l'index du kit, qui résout la cible d'un terme personnalisé vers sa forme terminale et refuse les cycles
 * (`ConflitDeVocabulaire`) ; avec des conflits dans l'index, le calcul ne le promet plus.
 *
 * Les questions de vocabulaire et les collections que le fichier renomme restent à UCM Nomenclature, qui s'insère
 * avant le contrôle des chemins par `ajuster`.
 *
 * Le moteur est celui du kit ; un test peut en passer un autre pour compter ses appels.
 */
import {
  commencerLexique, indexerVocabulaire, normaliserParEtapes,
  type ConflitDeVocabulaire, type ConventionsParCategorie, type Convention, type IndexDuVocabulaire, type Lexique, type ResultatDuLexique,
} from '@ucm-kit/core/referentiel';
import { cheminsEnConflit, inventairePublie, type CollisionDeChemin } from './cheminsPublies';
import { estProtegee, type Inventaire, type OptionsDeProtection } from './inventaireDeNoms';
import type { EcritureChoisie, ReglesPourLeCalcul } from './reglesDeNommage';

export interface MoteurDeNommage {
  readonly commencerLexique: typeof commencerLexique;
  readonly indexerVocabulaire: typeof indexerVocabulaire;
  readonly normaliserParEtapes: typeof normaliserParEtapes;
}
export const moteurDeNommageDuKit: MoteurDeNommage = { commencerLexique, indexerVocabulaire, normaliserParEtapes };

const CONVENTION_NEUTRE: Convention = { casse: 'inchangee', separateur: 'inchange' };

/** L'écriture du fichier ; à défaut, celle que les noms du lexique emploient le plus, ou la neutre. */
export const ecritureEffective = (regles: Pick<ReglesPourLeCalcul, 'ecriture'>, lexique: Lexique): EcritureChoisie =>
  regles.ecriture ?? {
    groupes: lexique.detection.groupes.dominante ?? CONVENTION_NEUTRE,
    variables: lexique.detection.variables.dominante ?? CONVENTION_NEUTRE,
  };
export const conventionsDe = (ecriture: EcritureChoisie): ConventionsParCategorie => ({ groupes: ecriture.groupes, variables: ecriture.variables });

/** Les entrées que le calcul lit : celles des collections non exclues. */
export function entreesRetenues(inventaire: Inventaire, collectionsExclues: readonly string[]): Inventaire['entrees'] {
  const exclues = new Set(collectionsExclues);
  return inventaire.entrees.filter((entree) => !exclues.has(entree.cible.collectionId));
}

/**
 * Les identifiants des noms que le calcul ne renomme pas : les entrées non renommables et celles qu'UCM Palettes protège
 * (`estProtegee`). Sans `palettesLibres`, la protection de Palettes reste.
 */
export function idsNonRenommables(inventaire: Inventaire, collectionsExclues: readonly string[], protection: OptionsDeProtection = {}): string[] {
  return entreesRetenues(inventaire, collectionsExclues).filter((entree) => !entree.renommable || estProtegee(entree, protection)).map((entree) => entree.nom.id);
}

/**
 * Retire des renommages ceux qui feraient disparaître un token de `tokens.json` : un chemin égal à celui d'une autre variable,
 * ou le groupe d'un autre chemin. Le contrôle porte sur tout l'inventaire, collections exclues comprises. Chaque renommage retiré
 * devient une collision qui garde son motif ; les collisions du kit restent telles quelles.
 */
export function avecLesCheminsPublies(inventaire: Inventaire, resultat: ResultatDuLexique): ResultatDuLexique {
  if (resultat.renommages.length === 0) return resultat;
  const enCause = cheminsEnConflit(inventairePublie(inventaire, (entree) => entree.nom.id), new Map(resultat.renommages.map((renommage) => [renommage.id, renommage.nouveauNom])));
  if (enCause.length === 0) return resultat;
  const renommages = new Map(resultat.renommages.map((renommage) => [renommage.id, renommage]));
  const collisions: CollisionDeChemin[] = enCause.map(({ id, motif, apres, autre }) => {
    const renommage = renommages.get(id)!;
    return { categorie: renommage.categorie, portee: renommage.portee, nom: renommage.nouveauNom, ids: [id], motif, apres, autre };
  });
  const retires = new Set(enCause.map(({ id }) => id));
  return { renommages: resultat.renommages.filter((renommage) => !retires.has(renommage.id)), collisions: [...resultat.collisions, ...collisions] };
}

export interface OptionsDeNommage {
  readonly moteur?: MoteurDeNommage;
  /** Transforme le résultat du lexique avant le contrôle des chemins ; UCM Nomenclature y ajoute les collections qu'il renomme. */
  readonly ajuster?: (lexique: Lexique, brut: ResultatDuLexique) => ResultatDuLexique;
}

export interface NomsSelonLesRegles {
  readonly lexique: Lexique;
  readonly indexation: { readonly index: IndexDuVocabulaire; readonly conflits: readonly ConflitDeVocabulaire[] };
  readonly ecriture: EcritureChoisie;
  /** Le résultat du lexique, avant `ajuster` et le contrôle des chemins. */
  readonly brut: ResultatDuLexique;
  /** Les renommages après `ajuster` et le contrôle des chemins publiés. */
  readonly resultat: ResultatDuLexique;
}

/**
 * Compose le calcul : le lexique des entrées non exclues, le vocabulaire indexé, l'écriture, la normalisation puis le contrôle
 * des chemins publiés. Le générateur cède à chaque tranche du kit, pour qu'un plugin puisse mener le calcul sans bloquer.
 *
 * @param nonRenommables les identifiants de noms que le calcul laisse tels quels ; ils figent aussi leurs dossiers.
 */
export function* nomsSelonLesRegles(
  inventaire: Inventaire,
  regles: ReglesPourLeCalcul,
  nonRenommables: readonly string[],
  options: OptionsDeNommage = {},
): Generator<void, NomsSelonLesRegles> {
  const moteur = options.moteur ?? moteurDeNommageDuKit;
  const preparation = moteur.commencerLexique({ ordinaires: new Set(regles.ordinaires) });
  preparation.ajouter(entreesRetenues(inventaire, regles.collectionsExclues).map((entree) => entree.nom));
  const lexique = yield* preparation.terminer();
  const indexation = moteur.indexerVocabulaire(regles.vocabulaire);
  const ecriture = ecritureEffective(regles, lexique);
  const brut = yield* moteur.normaliserParEtapes(lexique, conventionsDe(ecriture), indexation.index, { nonRenommables });
  const resultat = avecLesCheminsPublies(inventaire, options.ajuster ? options.ajuster(lexique, brut) : brut);
  return { lexique, indexation, ecriture, brut, resultat };
}

/** Le même calcul, mené d'une traite : UCM Palettes l'appelle au moment d'écrire, où aucune tranche n'est à céder. */
export function nomsSelonLesReglesSync(
  inventaire: Inventaire,
  regles: ReglesPourLeCalcul,
  nonRenommables: readonly string[],
  options: OptionsDeNommage = {},
): NomsSelonLesRegles {
  const calcul = nomsSelonLesRegles(inventaire, regles, nonRenommables, options);
  for (;;) {
    const etape = calcul.next();
    if (etape.done) return etape.value;
  }
}

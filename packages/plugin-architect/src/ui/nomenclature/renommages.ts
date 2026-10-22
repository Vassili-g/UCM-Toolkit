/**
 * Tous les renommages que le bilan propose, lus page à page : la table des
 * tokens y cherche le nom entier de chaque variable cochée, et le filtre de
 * l'arbre y compte les noms qu'Appliquer écrira. Le bilan ne porte que les trois
 * premiers noms de chaque carte ; le reste vient des pages de `lignes`, groupe
 * par groupe, demandées quand `charger` est appelé (un filtre est posé).
 *
 * Les pages demandées ici commencent à 0, 50, 100 : une carte, elle, demande la
 * suite de ses trois premiers noms (3, 53, 103). Les deux ne partagent donc pas
 * de clé de lecture.
 */
import type { Bilan, GroupeVue, LigneVue, MessageDeNomenclature } from '../../messages/nomenclature';
import type { RenommageAffiche } from '../application';
import type { Frontiere } from './frontiere';
import { ligneCochee, type ModeleDeSelection } from './selection';

type MessageDeLignes = Extract<MessageDeNomenclature, { type: 'lignes' }>;

interface Charge {
  readonly lignes: LigneVue[];
  prochain: number;
  complete: boolean;
  demande: number | null;
}

/** Un nom que le filtre retient : sa ligne, la clé de la carte où il a été lu et sa sorte. */
export interface NomRetenu { readonly ligne: LigneVue; readonly groupe: string; readonly collection: boolean }

export interface Reserve {
  /** Un nouveau bilan : ce qui était lu est oublié. */
  reinitialiser(bilan: Bilan | null): void;
  /** Demande la première page de chaque groupe qui n'est pas lu ; sans effet sur un groupe déjà demandé. */
  charger(): void;
  recevoir(message: MessageDeLignes): void;
  /** Une lecture a échoué : le groupe qui l'attendait garde ce qu'il a. */
  echouer(demande: number): void;
  poserLaSelection(modele: ModeleDeSelection): void;
  /** Les noms connus d'un groupe, dans l'ordre des pages. */
  lignesDuGroupe(cle: string): readonly LigneVue[];
  /** Vrai quand toutes les pages du groupe sont là. */
  complete(cle: string): boolean;
  toutEstCharge(): boolean;
  /** Les noms cochés que le filtre retient, un par identifiant. */
  retenus(appartient: (ligne: LigneVue) => boolean): readonly NomRetenu[];
  /** Ce que la table montre pour une variable cochée, `undefined` quand rien ne la renomme. */
  de(variable: string): RenommageAffiche | undefined;
  abonner(rappel: () => void): () => void;
}

export function creerLaReserve(frontiere: Frontiere): Reserve {
  let groupes: readonly GroupeVue[] = [];
  let charges = new Map<string, Charge>();
  let modele: ModeleDeSelection | null = null;
  let table: Map<string, RenommageAffiche> | null = null;
  const rappels = new Set<() => void>();

  function changer(): void {
    table = null;
    for (const rappel of [...rappels]) rappel();
  }

  function demander(cle: string, charge: Charge): void {
    charge.demande = frontiere.lignes(cle, charge.prochain);
    // Sans génération, la frontière n'envoie rien : le groupe attendra le prochain bilan.
    if (charge.demande === null) charge.complete = true;
  }

  function dansLOrdre(): { readonly cle: string; readonly charge: Charge }[] {
    return groupes.flatMap((groupe) => {
      const charge = charges.get(groupe.cle);
      return charge ? [{ cle: groupe.cle, charge }] : [];
    });
  }

  function construireLaTable(): Map<string, RenommageAffiche> {
    const resultat = new Map<string, { nouveau: string; cartes: Map<number, string> }>();
    if (!modele) return new Map();
    for (const { cle, charge } of dansLOrdre()) {
      for (const ligne of charge.lignes) {
        if (!ligneCochee(modele, ligne, cle)) continue;
        const connu = resultat.get(ligne.id) ?? { nouveau: ligne.nouveau, cartes: new Map<number, string>() };
        for (const rang of ligne.marques) if (!connu.cartes.has(rang)) connu.cartes.set(rang, cle);
        resultat.set(ligne.id, connu);
      }
    }
    return resultat;
  }

  return {
    reinitialiser(bilan) {
      groupes = bilan?.groupes ?? [];
      charges = new Map(groupes.map((groupe) => [groupe.cle, { lignes: [], prochain: 0, complete: groupe.variables + groupe.collections === 0, demande: null }]));
      changer();
    },
    charger() {
      for (const [cle, charge] of charges) if (!charge.complete && charge.demande === null) demander(cle, charge);
    },
    recevoir(message) {
      const charge = charges.get(message.groupe);
      if (!charge || charge.complete || message.debut !== charge.prochain) return;
      const connues = new Set(charge.lignes.map((ligne) => ligne.id));
      const nouvelles = message.lignes.filter((ligne) => !connues.has(ligne.id));
      charge.lignes.push(...nouvelles);
      charge.prochain += message.lignes.length;
      charge.complete = message.lignes.length === 0 || charge.prochain >= message.total;
      if (!charge.complete) demander(message.groupe, charge);
      changer();
    },
    echouer(demande) {
      for (const charge of charges.values()) {
        if (charge.demande !== demande || charge.complete) continue;
        charge.complete = true;
        changer();
        return;
      }
    },
    poserLaSelection(suivant) {
      if (suivant === modele) return;
      modele = suivant;
      changer();
    },
    lignesDuGroupe: (cle) => charges.get(cle)?.lignes ?? [],
    complete: (cle) => charges.get(cle)?.complete ?? true,
    toutEstCharge: () => [...charges.values()].every((charge) => charge.complete),
    retenus(appartient) {
      const vus = new Set<string>();
      const retenus: NomRetenu[] = [];
      if (!modele) return retenus;
      for (const { cle, charge } of dansLOrdre()) {
        const collection = groupes.find((groupe) => groupe.cle === cle)?.regle.sorte === 'collection';
        for (const ligne of charge.lignes) {
          if (vus.has(ligne.id) || !appartient(ligne) || !ligneCochee(modele, ligne, cle)) continue;
          vus.add(ligne.id);
          retenus.push({ ligne, groupe: cle, collection });
        }
      }
      return retenus;
    },
    de(variable) {
      table ??= construireLaTable();
      return table.get(variable);
    },
    abonner(rappel) {
      rappels.add(rappel);
      return () => {
        rappels.delete(rappel);
      };
    },
  };
}

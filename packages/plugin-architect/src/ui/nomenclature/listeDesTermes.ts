/**
 * L'état de la liste des termes de l'onglet Règles : la recherche, les filtres
 * (types, origines et places), le tri, les sections reçues, les sections repliées et le
 * terme choisi. Le module est pur ; `regles.ts` lit cet état pour le DOM et
 * envoie les demandes.
 */
import { ORIGINES_DE_FILTRE, PLACES_DE_TERMES, TYPES_DE_TERMES } from '../../nomenclature/messages';
import type { ComptesDeTermes, OrigineDeFiltre, PlaceDuTerme, PluginMessage, RequeteDeTermes, SectionDeTermes, TermeDeListe, TriDeTermes, TypeDeTerme } from '../../nomenclature/messages';
import { TEXTES } from './textes';

type ReponseDesTermes = Extract<PluginMessage, { type: 'termes' }>;

export interface EtatDeLaListe {
  readonly recherche: string;
  /** Les types cochés dans le menu, dans l'ordre des sections ; aucun type coché les montre tous. */
  readonly types: readonly TypeDeTerme[];
  readonly origines: readonly OrigineDeFiltre[];
  /** Les places cochées dans le menu ; aucune place cochée les montre toutes. */
  readonly places: readonly PlaceDuTerme[];
  readonly tri: TriDeTermes;
  /** Les sections reçues, avec les lignes arrivées jusqu'ici ; `null` avant la première réponse. */
  readonly sections: readonly SectionDeTermes[] | null;
  /** Les comptes du menu, conservés d'une recherche à l'autre : le sandbox les calcule hors recherche et hors filtres. */
  readonly comptes: ComptesDeTermes | null;
  /** Les sections que le designer a repliées. Ce choix survit aux recherches et aux filtres. */
  readonly repliees: readonly TypeDeTerme[];
  /** Le mot du terme dont la feuille est ouverte. */
  readonly choisi: string | null;
}

export const LISTE_INITIALE: EtatDeLaListe = { recherche: '', types: [], origines: [], places: [], tri: 'alpha', sections: null, comptes: null, repliees: [], choisi: null };

/** Une nouvelle recherche, un filtre ou un tri repart des premières lignes de chaque section. */
function depart(etat: EtatDeLaListe, suite: Partial<Pick<EtatDeLaListe, 'recherche' | 'types' | 'origines' | 'places' | 'tri'>>): EtatDeLaListe {
  return { ...etat, ...suite, sections: null };
}

export function saisir(etat: EtatDeLaListe, recherche: string): EtatDeLaListe {
  return recherche === etat.recherche ? etat : depart(etat, { recherche });
}

export function trier(etat: EtatDeLaListe, tri: TriDeTermes): EtatDeLaListe {
  return tri === etat.tri ? etat : depart(etat, { tri });
}

/** Coche ou décoche un type. La liste garde l'ordre des sections, pour que deux gestes qui aboutissent au même choix donnent la même demande. */
export function basculerUnType(etat: EtatDeLaListe, type: TypeDeTerme): EtatDeLaListe {
  const coches = etat.types.includes(type) ? etat.types.filter((autre) => autre !== type) : [...etat.types, type];
  return depart(etat, { types: TYPES_DE_TERMES.filter((autre) => coches.includes(autre)) });
}

export function basculerUneOrigine(etat: EtatDeLaListe, origine: OrigineDeFiltre): EtatDeLaListe {
  const cochees = etat.origines.includes(origine) ? etat.origines.filter((autre) => autre !== origine) : [...etat.origines, origine];
  return depart(etat, { origines: ORIGINES_DE_FILTRE.filter((autre) => cochees.includes(autre)) });
}

export function basculerUnePlace(etat: EtatDeLaListe, place: PlaceDuTerme): EtatDeLaListe {
  const cochees = etat.places.includes(place) ? etat.places.filter((autre) => autre !== place) : [...etat.places, place];
  return depart(etat, { places: PLACES_DE_TERMES.filter((autre) => cochees.includes(autre)) });
}

/** Un filtre actif, tel que la barre le montre en jeton. */
export type FiltreActif =
  | { readonly sorte: 'type'; readonly valeur: TypeDeTerme; readonly libelle: string }
  | { readonly sorte: 'origine'; readonly valeur: OrigineDeFiltre; readonly libelle: string }
  | { readonly sorte: 'place'; readonly valeur: PlaceDuTerme; readonly libelle: string };

/** Les filtres actifs : les types d'abord, puis les origines, puis les places. */
export function filtresActifs(etat: EtatDeLaListe): readonly FiltreActif[] {
  return [
    ...etat.types.map((valeur): FiltreActif => ({ sorte: 'type', valeur, libelle: TEXTES.typeDeTermeAuSingulier[valeur] })),
    ...etat.origines.map((valeur): FiltreActif => ({ sorte: 'origine', valeur, libelle: TEXTES.origineDeFiltre[valeur] })),
    ...etat.places.map((valeur): FiltreActif => ({ sorte: 'place', valeur, libelle: TEXTES.placeDeFiltre[valeur] })),
  ];
}

/** Retire un filtre actif : la même opération que de le décocher dans le menu. */
export function retirerUnFiltre(etat: EtatDeLaListe, filtre: FiltreActif): EtatDeLaListe {
  switch (filtre.sorte) {
    case 'type': return basculerUnType(etat, filtre.valeur);
    case 'origine': return basculerUneOrigine(etat, filtre.valeur);
    case 'place': return basculerUnePlace(etat, filtre.valeur);
  }
}

export function estRepliee(etat: EtatDeLaListe, type: TypeDeTerme): boolean {
  return etat.repliees.includes(type);
}

/** Replie la section, ou la déplie. Les lignes reçues restent : un pli ne relance aucune demande. */
export function basculerLePli(etat: EtatDeLaListe, type: TypeDeTerme): EtatDeLaListe {
  return { ...etat, repliees: estRepliee(etat, type) ? etat.repliees.filter((autre) => autre !== type) : [...etat.repliees, type] };
}

/**
 * Le nombre de lignes que la section a reçues, ou seulement celles de `place` : le `debut` de la prochaine page de la section
 * ou de la place.
 */
function lignesRecues(etat: EtatDeLaListe, type: TypeDeTerme, place: PlaceDuTerme | null): number {
  const termes = etat.sections?.find((section) => section.type === type)?.termes ?? [];
  return place === null ? termes.length : termes.filter((terme) => terme.place === place).length;
}

/** Le nombre de lignes que la section n'a pas encore reçues. */
export function resteDansLaSection(section: SectionDeTermes): number {
  return Math.max(0, section.total - section.termes.length);
}

/**
 * La demande de l'écran. Sans `section`, les premières lignes de chaque section ; avec `section`, la page de cette section qui suit
 * ses lignes déjà reçues. Avec `place` aussi (tri A → Z), la page ne lit que cette place et suit les lignes déjà reçues de la place.
 */
export function requeteDeLaListe(etat: EtatDeLaListe, section: TypeDeTerme | null, place: PlaceDuTerme | null = null): RequeteDeTermes {
  const lue = section === null ? null : place;
  return {
    recherche: etat.recherche, types: etat.types, origines: etat.origines, places: etat.places, tri: etat.tri,
    section, place: lue, debut: section === null ? 0 : lignesRecues(etat, section, lue),
  };
}

/**
 * Range une réponse. Sans `section`, elle remplace toutes les sections. Avec `section`, c'est la page qui suit les lignes reçues
 * de cette section ; en tri A → Z, une page ne porte que les lignes d'une place et suit celles que la place a reçues. Une page qui ne suit
 * pas, ou d'une section absente, est ignorée.
 */
export function recevoir(etat: EtatDeLaListe, reponse: ReponseDesTermes): EtatDeLaListe {
  const { comptes, section: type } = reponse;
  if (type === null) return { ...etat, sections: reponse.sections, comptes };
  const page = reponse.sections.find((autre) => autre.type === type);
  const recue = etat.sections?.find((autre) => autre.type === type);
  if (!etat.sections || !page || !recue) return etat;
  const place = etat.tri === 'alpha' ? (page.termes[0]?.place ?? null) : null;
  if (place !== null && page.termes.some((terme) => terme.place !== place)) return etat;
  if (reponse.debut !== lignesRecues(etat, type, place)) return etat;
  // En tri A → Z, les groupes précèdent les variables : la page de l'une s'ajoute à la fin de ses lignes.
  const termes = place === null
    ? [...recue.termes, ...page.termes]
    : PLACES_DE_TERMES.flatMap((autre) => (autre === place ? [...recue.termes.filter((terme) => terme.place === autre), ...page.termes] : recue.termes.filter((terme) => terme.place === autre)));
  const suivante: SectionDeTermes = { type, total: page.total, totaux: page.totaux, termes };
  return { ...etat, comptes, sections: etat.sections.map((autre) => (autre === recue ? suivante : autre)) };
}

/**
 * Un bloc de lignes d'une section. `intertitre` vaut vrai quand la section a des groupes et des variables en tri A → Z : le bloc porte
 * alors le nom de sa place. `place` est celle que « Afficher les n autres » demande ; elle vaut `null` en tri par nombre, où les places se mêlent.
 */
export interface BlocDeSection {
  readonly place: PlaceDuTerme | null;
  readonly intertitre: boolean;
  /** Le nombre de lignes de la place, reçues ou non. */
  readonly total: number;
  readonly termes: readonly TermeDeListe[];
  /** Le nombre de lignes du bloc que la section n'a pas encore reçues. */
  readonly reste: number;
}

/**
 * Les blocs d'une section dans l'ordre d'affichage. Tri A → Z : un bloc par place qui a des lignes, groupes d'abord, avec intertitre
 * quand il y en a deux. Tri par nombre : un seul bloc, places mêlées.
 */
export function blocsDeLaSection(section: SectionDeTermes, tri: TriDeTermes): readonly BlocDeSection[] {
  const places = PLACES_DE_TERMES.filter((place) => section.totaux[place] > 0);
  if (tri === 'nombre' || places.length === 0) return [{ place: null, intertitre: false, total: section.total, termes: section.termes, reste: resteDansLaSection(section) }];
  return places.map((place): BlocDeSection => {
    const termes = section.termes.filter((terme) => terme.place === place);
    return { place, intertitre: places.length > 1, total: section.totaux[place], termes, reste: Math.max(0, section.totaux[place] - termes.length) };
  });
}

/** Le texte du lien qui suit un bloc : il nomme la place quand le bloc a un intertitre. */
export function texteDeLaSuite(bloc: BlocDeSection): string {
  return bloc.intertitre && bloc.place !== null ? TEXTES.afficherLesAutresDeLaPlace[bloc.place](bloc.reste) : TEXTES.afficherLesAutres(bloc.reste);
}

/** La bande qui titre une section : son titre, son compte, sa ligne, et le libellé du bouton qui la replie ou la déplie. */
export interface BandeDeSection {
  readonly titre: string;
  readonly total: number;
  readonly ligne: string;
  readonly ouverte: boolean;
  readonly libelle: string;
}

export function bandeDeLaSection(etat: EtatDeLaListe, section: SectionDeTermes): BandeDeSection {
  const titre = TEXTES.typeDeTerme[section.type];
  const ouverte = !estRepliee(etat, section.type);
  return { titre, total: section.total, ligne: TEXTES.ligneDeSection[section.type], ouverte, libelle: ouverte ? TEXTES.replierLaSection(titre) : TEXTES.deplierLaSection(titre) };
}

/** Toutes les lignes reçues, section après section. */
export function termesRecus(etat: EtatDeLaListe): readonly TermeDeListe[] {
  return (etat.sections ?? []).flatMap((section) => section.termes);
}

export function choisir(etat: EtatDeLaListe, mot: string | null): EtatDeLaListe {
  return mot === etat.choisi ? etat : { ...etat, choisi: mot };
}

/**
 * Un morceau de la partie gauche d'une ligne : `reference` en pastille grise,
 * `mot` en police de code, `gris` en texte gris, `variante` en police de code
 * grise (blanche quand c'est la variante cherchée).
 */
export type MorceauDeLigne =
  | { readonly sorte: 'reference' | 'mot' | 'gris'; readonly texte: string }
  | { readonly sorte: 'variante'; readonly texte: string; readonly trouvee: boolean };

/** Le mot que le titre de la feuille d'un terme écrit : la forme du fichier (`StressTest`) pour un terme sans règle, sinon la clé. */
export function motAffiche(terme: Pick<TermeDeListe, 'forme'>): string {
  return terme.forme;
}

/**
 * Les variantes que la ligne d'une règle montre : celles du fichier, puis la variante cherchée quand le fichier ne l'emploie pas,
 * pour que la ligne dise par quoi la recherche l'a trouvée.
 */
function variantesDeLaLigne(terme: TermeDeListe): readonly string[] {
  return terme.trouve !== null && !terme.remplace.includes(terme.trouve) ? [...terme.remplace, terme.trouve] : terme.remplace;
}

/** Les morceaux d'une ligne selon le statut du terme, dans l'ordre d'affichage. La ligne écrit la `forme` du terme. */
export function morceauxDuTerme(terme: TermeDeListe): readonly MorceauDeLigne[] {
  switch (terme.statut) {
    case 'regle': {
      const variantes = variantesDeLaLigne(terme);
      return variantes.length === 0
        ? [{ sorte: 'reference', texte: terme.forme }]
        : [
            { sorte: 'reference', texte: terme.forme },
            { sorte: 'gris', texte: TEXTES.motRemplace },
            ...variantes.map((texte): MorceauDeLigne => ({ sorte: 'variante', texte, trouvee: texte === terme.trouve })),
          ];
    }
    case 'a-trancher':
      return terme.avec === null
        ? [{ sorte: 'mot', texte: terme.forme }]
        : [{ sorte: 'mot', texte: terme.forme }, { sorte: 'gris', texte: TEXTES.motOu }, { sorte: 'variante', texte: terme.avec, trouvee: false }];
    case 'ecart':
      return [{ sorte: 'mot', texte: terme.forme }, { sorte: 'gris', texte: TEXTES.termeNonApplique }];
    case 'sans-regle':
      return [{ sorte: 'mot', texte: terme.forme }];
  }
}

/** Vrai quand la pastille `À trancher` prend la place de l'origine. */
export function termeATrancher(terme: TermeDeListe): boolean {
  return terme.statut === 'a-trancher';
}

/** La pastille à droite d'une ligne : `À trancher` seulement ; `null` pour toute autre ligne. La section dit le type du terme. */
export function pastilleDeLaLigne(terme: TermeDeListe): { readonly texte: string; readonly classe: 'pastille-bloque' } | null {
  return termeATrancher(terme) ? { texte: TEXTES.pastilleATrancherDuTerme, classe: 'pastille-bloque' } : null;
}

/** L'origine d'une ligne, écrite en texte gris à droite ; `null` pour une ligne `À trancher` ou sans origine. */
export function origineDeLaLigne(terme: TermeDeListe): string | null {
  if (termeATrancher(terme) || terme.origine === null) return null;
  return terme.origine === 'ucm' ? TEXTES.pastilleUcm : TEXTES.pastillePersonnalise;
}

/**
 * Pose sur `cible` la classe qui teinte un élément selon la place : orchidée en groupe, olive en variable. `jeton` vaut pour un terme qui
 * a une règle, `mot` pour le texte d'un terme sans règle ou d'un exemple, `echantillon` pour le carré d'un intertitre. Chaque classe
 * s'écrit en toutes lettres, pour que la loi des styles la retrouve.
 */
export function teinter(cible: { readonly classList: { add(classe: string): void } }, place: PlaceDuTerme, forme: 'jeton' | 'mot' | 'echantillon'): void {
  const groupe = place === 'groupes';
  if (forme === 'jeton') cible.classList.add(groupe ? 'jeton-groupe' : 'jeton-variable');
  else if (forme === 'mot') cible.classList.add(groupe ? 'mot-groupe' : 'mot-variable');
  else cible.classList.add(groupe ? 'echantillon-groupe' : 'echantillon-variable');
}

/** Le nom accessible d'une ligne : le terme, sa place, sa règle, son origine ou `À trancher`, son nombre. */
export function nomAccessibleDuTerme(terme: TermeDeListe): string {
  const regle =
    terme.statut === 'regle' && variantesDeLaLigne(terme).length > 0
      ? TEXTES.termeRemplace(variantesDeLaLigne(terme))
      : terme.statut === 'a-trancher'
        ? TEXTES.termeATrancher(terme.avec)
        : terme.statut === 'ecart'
          ? TEXTES.termeNonApplique
          : '';
  const origine = termeATrancher(terme)
    ? TEXTES.pastilleATrancherDuTerme
    : terme.origine === 'ucm'
      ? TEXTES.pastilleUcm
      : terme.origine === 'personnalise'
        ? TEXTES.pastillePersonnalise
        : '';
  return [terme.forme, TEXTES.placeAuSingulier[terme.place], regle, origine, TEXTES.nomsDuTerme(terme.nombre)].filter((partie) => partie !== '').join(', ');
}

/**
 * La phrase sous la recherche d'une variante : la première ligne trouvée par
 * une variante donne la variante et la forme de sa référence ; `null` si aucune.
 */
export function phraseDeRecherche(termes: readonly TermeDeListe[]): { readonly variante: string; readonly reference: string } | null {
  const trouve = termes.find((terme) => terme.trouve !== null);
  return trouve && trouve.trouve !== null ? { variante: trouve.trouve, reference: trouve.forme } : null;
}

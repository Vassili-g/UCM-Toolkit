/**
 * Les 129 cas de la section D du plan F8 et F9 (chaîne sandbox, écran et écriture) : F8 D1 à D6 (55) et F9 D1 à D4 (74).
 *
 * F8 D1 cartes lisibles (4), D2 cases décochées et boutons de cochage (6), D3 rangement par élément (8), D4 Ignorer, « Ne plus
 * proposer » et « Ne plus ignorer » (18), D5 chaîne complète analyse, écran, coche, écriture, relecture (12), D6 doublons à l'écran (7).
 * F9 D1 un écran par état (19), D2 relecture de 20 suites de messages (20), D3 rejeu de captures sous six pannes (30) et D4 parité
 * d'une prélecture promue (5) : ces deux dernières séries vivent dans `rejeu.ts`.
 *
 * Un cas monte la chaîne de `chaine.ts`, joue le geste du designer sur le faux DOM et note chaque vérification dans son `Jugement`.
 * Chaque phrase de l'oracle vient du plan (propriétés P6, P7, P10 à P15, P18 à P27), de la SPEC d'Architect et des réponses Q-03, Q-09
 * et Q-11 de l'inventaire ; le code mesuré n'est jamais relu pour l'écrire. Un cas dont la phrase dépend d'une question ouverte
 * (Q-F89-*) est `mesure` et la cite. Un cas qu'aucun double ne rend constructible est `mesure` « non constructible », avec sa raison.
 */
import type { Constat } from '@ucm-kit/core/controles';

import type { PluginMessage } from '../../../src/messages';
import type { IdentiteDAnalyse } from '../../../src/messages/commun';
import { analyseApplicable, calculEnCours, noterLEnvoi } from '../../../src/ui/composant/analyse';
import { carteDAFaire } from '../../../src/ui/ignores/modele';
import {
  cocherAMain, controlerLePied, controlerLesCases, lancerLaChaine, lignesCochables, MOTIF_TOUT_COCHER, MOTIF_TOUT_DECOCHER,
  rangementDesConstats, texteDe,
} from '../f3-composant/chaine';
import { noyauDuKit } from '../f3-composant/casDeLaChaine';
import {
  agir, avecLaChaine, ecritureSurLeMonde, interfaceSeule, Jugement, lignesDeLEcran, lireLEcran, lireLaBarre, moteurAvecLesPoints, resumeDesMessages, pageDuSandbox, silenceDuKit,
  type CasDeChaine, type Chaine, type OptionsDeChaine, type PointDuMoteur, type SorteDEcartDeChaine, type VueDeLEcran,
} from './chaine';
import { compacter, sorteDeC44 } from './cas';
import { gabaritDe } from './corpusDuMoteur';
import { MondeEnEcriture } from './operateursEcriture';
import { point } from './operateursMoteur';
import { tousLesCas } from './operateurs';
import { avecLesRegles, ciblesDe, cleDeLaPropriete, reglesDe, specDeLaForme, specR0 } from './operateursRegles';
import type { SpecDePage } from './pageDeRegles';
import { FORMES, FORMES_DE_REGLES, MARQUE, REDIGE, sansLesReglesDe, type FormeDeRegles, type ProprieteDuJeu } from './profilsRegles';
import { casDuRejeu } from './rejeu';
import { DECLARATIONS } from './scenarioDeBase';
import {
  DIT, degraderLaLecture, ignoresDuProduit, JAMAIS_N_SUR_N, lever, manquees, MOTEUR_PARTIEL, Seance,
} from './seance';

// ---------------------------------------------------------------------------------------------------------------------------
// Briques communes

const AUCUN_CONSTAT = /Aucun constat sur/;
const PHRASE_DE_REPLI = /Constat C\d+/;
const alertesDe = (vue: VueDeLEcran): string => vue.alertes.join(' | ');
const sansBlancs = (texte: string): string => texte.replace(/\s+/g, '');
const norm = (texte: string): string => texte.replace(/\s+/g, ' ').trim();

type Executer = () => Promise<Jugement>;

/** Une série du plan : elle numérote ses cas `<famille>-<série>-<rang>`. */
class Serie {
  private rang = 0;
  constructor(readonly famille: 'F8' | 'F9', readonly operateur: string, readonly cas: CasDeChaine[]) {}

  ajouter(propriete: string, description: string, executer: Executer, plus: { question?: string; rattachement?: string } = {}): void {
    this.rang += 1;
    this.cas.push({
      id: `${this.famille}-${this.operateur}-${this.rang}`, famille: this.famille, operateur: this.operateur, propriete,
      verdict: plus.question ? 'mesure' : 'attendu', ...(plus.question ? { question: plus.question } : {}), description,
      ...(plus.rattachement ? { rattachement: plus.rattachement } : {}), executer,
    });
  }

  /** Un cas qu'aucun double ne rend constructible : il reste dans le décompte, `mesure`, avec sa raison. */
  nonConstructible(propriete: string, description: string, raison: string): void {
    this.ajouter(propriete, `${description} (non constructible : ${raison})`, async () => {
      const j = new Jugement(propriete);
      j.scenario.push(`non constructible : ${raison}`);
      return j;
    }, { question: 'non constructible' });
  }
}

const dit = (j: Jugement, texte: string, motif: RegExp, quoi: string, sorte: SorteDEcartDeChaine = 'muet', propriete?: string): void =>
  j.verifier(motif.test(texte), `l'écran dit ${quoi}`, `alertes : ${texte || 'aucune'}`, sorte, propriete);
const nonDit = (j: Jugement, texte: string, motif: RegExp, quoi: string, sorte: SorteDEcartDeChaine = 'accusation', propriete?: string): void =>
  j.verifier(!motif.test(texte), `l'écran ne dit pas ${quoi}`, `l'écran dit « ${(texte.match(motif) ?? [''])[0]} »`, sorte, propriete);

const lecturesNonJugees = (c: Chaine): boolean => {
  const lecture = c.final()?.lecture;
  return lecture !== null && lecture !== undefined && (lecture.manquees.length > 0 || lecture.layersNonLus !== 0 || lecture.variantsNonLus.length > 0);
};

// ---------------------------------------------------------------------------------------------------------------------------
// Les pages de règles

const BASE = specR0();
const proprieteDe = (spec: SpecDePage, nom: string): ProprieteDuJeu => spec.proprietes.find((entree) => entree.nom === nom)!;
const sansConteneur = (spec: SpecDePage): SpecDePage => ({ ...spec, conteneurs: [] });
const sansRegles = (spec: SpecDePage, nom: string): SpecDePage => avecLesRegles(spec, sansLesReglesDe(reglesDe(spec), cleDeLaPropriete(proprieteDe(spec, nom))));
const sansValeur = (spec: SpecDePage, nom: string): SpecDePage => {
  const propriete = proprieteDe(spec, nom);
  const cle = cleDeLaPropriete(propriete);
  return avecLesRegles(spec, sansLesReglesDe(reglesDe(spec), cle, [ciblesDe(propriete)[0].slice(cle.length + 1)]));
};
const sansPropriete = (spec: SpecDePage): SpecDePage => avecLesRegles(spec, [...reglesDe(spec), { tag: 'boolean', cible: 'hasIcn', contenu: REDIGE }]);
const aCompleter = (spec: SpecDePage): SpecDePage => avecLesRegles(spec, [{ tag: 'usage', contenu: MARQUE }, ...reglesDe(spec).filter((regle) => regle.tag !== 'usage')]);

const TEMOIN: PointDuMoteur = { point: point('Layer « Témoin » : il n’utilise pas d’auto layout.'), noeuds: ['12:35'] };
const POINT_C30: PointDuMoteur = { point: point('Layer « Card », padding : aucune variable Figma n’est reliée.', { famille: 'variables' }), noeuds: ['12:34'] };

/** Le sandbox lit cette page, sans constat du kit ; `points` s'ajoutent à ceux du scan. */
const optionsDePage = (spec: () => SpecDePage, points: readonly PointDuMoteur[] = [], plus: OptionsDeChaine = {}): OptionsDeChaine => ({
  ...plus, adaptateurs: [silenceDuKit, pageDuSandbox(spec, points), ...(plus.adaptateurs ?? [])],
});
const optionsDePoints = (points: readonly PointDuMoteur[], plus: OptionsDeChaine = {}): OptionsDeChaine => ({
  ...plus, adaptateurs: [silenceDuKit, moteurAvecLesPoints(points), ...(plus.adaptateurs ?? [])],
});

const constatsFinaux = (c: Chaine): readonly Constat[] => c.final()?.constats ?? [];
const trouverLe = (c: Chaine, predicat: (constat: Constat) => boolean): Constat | undefined => constatsFinaux(c).find(predicat);
const estC43 = (constat: Constat): boolean => constat.code === 'C43';
const estC45 = (ecart: string) => (constat: Constat): boolean => constat.code === 'C45' && constat.faits.ecart === ecart;
const estC44 = (sorte: string) => (constat: Constat): boolean => constat.code === 'C44' && sorteDeC44(String(constat.faits.titre ?? '')) === sorte;
const estC30 = (constat: Constat): boolean => constat.code === 'C30';

/** Le constat tel que l'interface le retient : celui que l'écran dessine. */
const vuParLEcran = (c: Chaine, id: string): Constat | undefined => c.constats().find((constat) => constat.id === id);

// ===========================================================================================================================
// F8 D1 : cartes lisibles

function seriesF8D1(cas: CasDeChaine[]): void {
  const serie = new Serie('F8', 'D1', cas);
  /** Une carte lisible a une phrase, un statut et un lieu, nomme ce que le designer a écrit et n'emploie pas la phrase de repli (P12). */
  const lisible = (description: string, spec: SpecDePage, trouver: (constat: Constat) => boolean, noms: readonly string[], rattachement?: string): void =>
    serie.ajouter('P12', description, () => avecLaChaine('P12', [description, 'Analyser, lire la carte du constat dans le panneau'], optionsDePage(() => spec), async (c, j) => {
      const constat = trouverLe(c, trouver);
      j.verifier(constat !== undefined, 'le constat attendu sort de l’analyse', 'aucun constat de ce genre dans le message final', 'manque');
      if (!constat) return;
      const vu = vuParLEcran(c, constat.id);
      j.verifier(vu !== undefined, 'l’interface retient le constat', 'absent de l’état de l’interface', 'non-affiche');
      c.ecran.ouvrirToutes();
      if (constat.correction) {
        const cartes = c.ecran.cartesDeCorrections();
        j.verifier(cartes.length >= 1, 'l’écran dessine la carte de la correction', 'aucune carte de corrections', 'non-affiche');
        const texte = compacter(cartes.map(texteDe).join(' '));
        for (const nom of noms) j.verifier(texte.includes(compacter(nom)), `la carte nomme « ${nom} »`, `texte de la carte : ${cartes.map(texteDe).join(' | ').slice(0, 160)}`, 'illisible');
        j.verifier(!PHRASE_DE_REPLI.test(cartes.map(texteDe).join(' ')), 'la carte n’emploie pas la phrase de repli « Constat Cnn. »', 'phrase de repli', 'illisible');
        const carte = c.ecran.modele().elements.flatMap((element) => element.corrections).find((candidate) => candidate.constats.some((x) => x.id === constat.id));
        j.verifier(carte !== undefined && carte.phrase.length > 0 && carte.meta.length > 0, 'la carte a une phrase et une ligne de statut ou de lieu', 'phrase ou ligne de lieu vide', 'illisible');
      } else {
        const dessin = carteDAFaire(constat, c.ecran.contexte() as never);
        j.verifier(c.ecran.cartesAFaire().length >= 1, 'l’écran dessine une carte À faire', 'aucune carte À faire', 'non-affiche');
        j.verifier(dessin.phrase.trim() !== '' && !PHRASE_DE_REPLI.test(dessin.phrase), 'la carte a une phrase lisible', `phrase « ${dessin.phrase} »`, 'illisible');
        j.verifier(dessin.lieu.length > 0, 'la carte a un lieu', 'lieu vide', 'illisible');
        j.verifier(dessin.statut !== null && dessin.statut.trim() !== '', 'la carte a un statut', 'statut vide', 'illisible');
        for (const nom of noms) j.verifier(compacter(dessin.phrase).includes(compacter(nom)), `la phrase nomme « ${nom} »`, `phrase « ${dessin.phrase} »`, 'illisible');
      }
    }), rattachement ? { rattachement } : {});
  lisible('C43 : aucune instance de règles', sansConteneur(BASE), estC43, [BASE.nom]);
  lisible('C45 sans-regle : une propriété sans règle', sansRegles(BASE, 'Palette'), estC45('sans-regle'), ['Palette']);
  lisible('C45 sans-valeur : une valeur sans règle', sansValeur(BASE, 'Palette'), estC45('sans-valeur'), ['Palette', 'primary']);
  lisible('C45 sans-propriete : une règle sans propriété (`hasIcn`)', sansPropriete(BASE), estC45('sans-propriete'), ['hasIcn']);
}

// ===========================================================================================================================
// F8 D2 : cases décochées et boutons de cochage

function seriesF8D2(cas: CasDeChaine[]): void {
  const serie = new Serie('F8', 'D2', cas);
  const deux = (): SpecDePage => sansRegles(sansRegles(BASE, 'Has Icon'), 'Loading');
  const MESSAGE = 'Appliquer';
  serie.ajouter('P12', 'cases décochées au premier affichage (Q-03)', () => avecLaChaine('P12', ['Analyser une page à deux propriétés sans règle', 'Premier affichage'], optionsDePage(deux), async (c, j) => {
    j.reprendre(controlerLesCases(c.ecran, 'au premier affichage'), 'aucune ligne cochée au premier affichage');
  }), { rattachement: 'E-34' });
  serie.ajouter('P12', 'cases décochées à la relecture (Q-03)', () => avecLaChaine('P12', ['Analyser, cocher à la main, relire', 'Relecture'], optionsDePage(deux), async (c, j) => {
    cocherAMain(c.ecran);
    await c.s.demander();
    j.reprendre(controlerLesCases(c.ecran, 'à la relecture'), 'aucune ligne cochée après une nouvelle analyse');
  }), { rattachement: 'E-34' });
  serie.ajouter('P12', 'cases décochées après l’ajout d’une correction (Q-03)', () => {
    let propriete = BASE;
    return avecLaChaine('P12', ['Analyser une propriété sans règle, cocher, retirer les règles d’une seconde propriété, relire'], optionsDePage(() => propriete), async (c, j) => {
      propriete = sansRegles(BASE, 'Has Icon');
      await c.s.demander();
      cocherAMain(c.ecran);
      propriete = deux();
      await c.s.demander();
      j.reprendre(controlerLesCases(c.ecran, 'après l’ajout d’une correction'), 'aucune ligne cochée quand une correction s’ajoute');
    });
  }, { rattachement: 'E-34' });
  const sectionDesRegles = (c: Chaine) => { c.ecran.ouvrirToutes(); return c.ecran.sections().find((section) => section.dataset.element === 'regles'); };
  serie.ajouter('P12', '« Tout cocher » dans la section Règles (Q-03)', () => avecLaChaine('P12', ['Analyser, ouvrir la section Règles'], optionsDePage(deux), async (c, j) => {
    const section = sectionDesRegles(c);
    j.verifier(section !== undefined, 'la section Règles existe', 'aucune section Règles', 'non-affiche');
    if (section) j.verifier(c.ecran.boutons(MOTIF_TOUT_COCHER, section).length > 0, 'la section Règles a « Tout cocher »', 'bouton absent', 'bouton-manquant');
  }), { rattachement: 'E-34' });
  serie.ajouter('P12', '« Tout décocher » dans la section Règles (Q-03)', () => avecLaChaine('P12', ['Analyser, ouvrir la section Règles'], optionsDePage(deux), async (c, j) => {
    const section = sectionDesRegles(c);
    j.verifier(section !== undefined, 'la section Règles existe', 'aucune section Règles', 'non-affiche');
    if (section) j.verifier(c.ecran.boutons(MOTIF_TOUT_DECOCHER, section).length > 0, 'la section Règles a « Tout décocher »', 'bouton absent', 'bouton-manquant');
  }), { rattachement: 'E-34' });
  serie.ajouter('P12', 'pied « aucune correction cochée » et Appliquer inactif (Q-03)', () => avecLaChaine('P12', ['Analyser, lire le pied'], optionsDePage(deux), async (c, j) => {
    j.reprendre(controlerLePied(c.ecran, MESSAGE), 'le pied dit « Aucune correction cochée. » et Appliquer tout est inactif');
  }), { rattachement: 'E-34' });
}

// ===========================================================================================================================
// F8 D3 : rangement par élément

function seriesF8D3(cas: CasDeChaine[]): void {
  const serie = new Serie('F8', 'D3', cas);
  /** L'élément du panneau où le modèle range ce constat, et la section que le DOM dessine pour lui. */
  const rangeDans = (c: Chaine, constat: Constat, attendu: string, j: Jugement): void => {
    const vu = vuParLEcran(c, constat.id);
    j.verifier(vu !== undefined, 'l’interface retient le constat', 'absent de l’état de l’interface', 'non-affiche');
    c.ecran.ouvrirToutes();
    const elements = c.ecran.modele().elements.filter((element) => element.constats.some((x) => x.id === constat.id)).map((element) => element.id);
    j.verifier(elements.length === 1, 'le constat est rangé dans un seul élément', `rangé dans ${elements.join(', ') || 'aucun élément'}`, 'affiche-deux-fois');
    j.verifier(elements[0] === attendu, `le constat va dans l’élément « ${attendu} »`, `rangé dans « ${elements.join(', ')} »`, 'non-affiche');
    const vue = lireLEcran(c.ecran);
    j.verifier(vue.sections.some((section) => section.element === attendu && section.points >= 1), `le panneau dessine la section « ${attendu} »`, `sections : ${vue.sections.map((s) => s.element).join(', ') || 'aucune'}`, 'non-affiche');
  };
  const parPoint = (element: string, description: string, titre: string, plus: { question?: string; code?: string } = {}): void =>
    serie.ajouter('P10', description, () => avecLaChaine('P10', [description, 'Analyser, lire la section du panneau'], optionsDePoints([{ point: point(titre, { famille: 'variables' }), noeuds: ['12:34'] }]), async (c, j) => {
      const constat = trouverLe(c, (candidat) => candidat.code === (plus.code ?? 'C30'));
      j.verifier(constat !== undefined, `le point du moteur devient ${plus.code ?? 'C30'}`, `codes émis : ${constatsFinaux(c).map((x) => x.code).join(', ') || 'aucun'}`, 'manque');
      if (constat) rangeDans(c, constat, element, j);
    }), { ...(plus.question ? { question: plus.question } : {}), rattachement: 'E-29' });
  parPoint('couleurs', 'un remplissage en dur va dans Couleurs', 'Layer « Card » : son fill n’est relié à aucune variable Figma.');
  parPoint('tailles', 'une marge en dur va dans Tailles', 'Layer « Card », padding : aucune variable Figma n’est reliée.');
  parPoint('texte', 'un style de texte en dur va dans Texte', 'Layer « Title », font size : aucune variable Figma n’est reliée.');
  parPoint('tokens', 'une opacité en dur va dans Tokens', 'Layer « Card », opacity : aucune variable associée.');
  const gabarit = gabaritDe('proprietes-2');
  serie.ajouter('P10', 'une combinaison de variants manquante va dans Variants', () => avecLaChaine('P10', ['Analyser un point `proprietes`, lire la section du panneau'], optionsDePoints([{ point: gabarit.point, noeuds: ['12:34'] }]), async (c, j) => {
    const constat = trouverLe(c, (candidat) => candidat.code === 'C34');
    j.verifier(constat !== undefined, 'la combinaison manquante devient C34', `codes émis : ${constatsFinaux(c).map((x) => x.code).join(', ') || 'aucun'}`, 'manque');
    if (constat) rangeDans(c, constat, 'variants', j);
  }));
  serie.ajouter('P10', 'une instance de règles absente va dans Règles', () => avecLaChaine('P10', ['Analyser une page sans instance de règles, lire la section du panneau'], optionsDePage(() => sansConteneur(BASE)), async (c, j) => {
    const constat = trouverLe(c, estC43);
    j.verifier(constat !== undefined, 'l’instance absente devient C43', 'aucun C43', 'manque');
    if (constat) rangeDans(c, constat, 'regles', j);
  }));
  serie.ajouter('P10', 'un contraste insuffisant va dans Accessibilité', () => avecLaChaine('P10', ['Analyser le composant de base, lire la section du panneau'], {}, async (c, j) => {
    const constat = trouverLe(c, (candidat) => candidat.famille === 'contraste' && candidat.type !== 'info');
    j.verifier(constat !== undefined, 'le composant de base porte un constat de contraste', 'aucun constat de la famille contraste hors information', 'manque');
    if (constat) rangeDans(c, constat, 'a11y', j);
  }));
  serie.ajouter('P10', 'le compte de la pastille et du sommaire', () => {
    const points: PointDuMoteur[] = [
      { point: point('Layer « Card » : son fill n’est relié à aucune variable Figma.', { famille: 'variables' }), noeuds: ['12:34'] },
      POINT_C30, { point: point('Layer « Title », font size : aucune variable Figma n’est reliée.', { famille: 'variables' }), noeuds: ['12:36'] }, TEMOIN,
    ];
    return avecLaChaine('P10', ['Analyser quatre points du moteur et une instance de règles absente', 'Lire la pastille, le sommaire et les sections'], optionsDePage(() => sansConteneur(BASE), points), async (c, j) => {
      const visibles = constatsFinaux(c).filter((constat) => constat.type !== 'info');
      const vue = lireLEcran(c.ecran);
      const barre = await c.barre();
      const somme = vue.sections.reduce((total, section) => total + section.points, 0);
      const tout = vue.puces.find((puce) => puce.element === 'tout')?.points;
      const parPuce = vue.puces.filter((puce) => puce.element !== 'tout').reduce((total, puce) => total + puce.points, 0);
      j.verifier(barre.pastille === visibles.length, `la pastille compte ${visibles.length} constats`, `pastille ${String(barre.pastille)}`, 'non-affiche');
      j.verifier(tout === visibles.length, `la puce « Tout » compte ${visibles.length} constats`, `puce Tout ${String(tout)}`, 'non-affiche');
      j.verifier(parPuce === visibles.length, 'les puces des éléments comptent chaque constat une fois', `somme des puces ${parPuce}, attendu ${visibles.length}`, 'affiche-deux-fois');
      j.verifier(somme === visibles.length, 'les sections comptent chaque constat une fois', `somme des sections ${somme}, attendu ${visibles.length}`, 'affiche-deux-fois');
    });
  });
}

// ===========================================================================================================================
// F8 D4 : Ignorer, « Ne plus proposer », « Ne plus ignorer »

interface GenreDeConstat {
  readonly nom: string;
  readonly spec?: SpecDePage;
  readonly points?: readonly PointDuMoteur[];
  readonly trouver: (constat: Constat) => boolean;
  /** Une proposition existe : une correction que « Ne plus proposer » retire. */
  readonly proposition: boolean;
}

const GENRES: readonly GenreDeConstat[] = [
  { nom: 'C43', spec: sansConteneur(BASE), trouver: estC43, proposition: true },
  { nom: 'C45 sans-regle', spec: sansRegles(BASE, 'Palette'), trouver: estC45('sans-regle'), proposition: true },
  { nom: 'C45 sans-valeur', spec: sansValeur(BASE, 'Palette'), trouver: estC45('sans-valeur'), proposition: true },
  { nom: 'C45 sans-propriete', spec: sansPropriete(BASE), trouver: estC45('sans-propriete'), proposition: false },
  { nom: 'C44', spec: aCompleter(BASE), trouver: estC44('a-completer|@usage'), proposition: false },
  { nom: 'C30', points: [POINT_C30], trouver: estC30, proposition: false },
];

const MOTIF_IGNORER = /^Ignorer/;
const MOTIF_NE_PLUS_PROPOSER = /^Ne plus proposer/;
const MOTIF_NE_PLUS_IGNORER = /^Ne plus ignorer/;

/** La carte du constat à l'écran : la carte de corrections s'il porte une correction, sinon la carte À faire qui dit sa phrase. */
function carteDuConstat(c: Chaine, constat: Constat): ElementDeTestLisible | undefined {
  c.ecran.ouvrirToutes();
  if (constat.correction) return c.ecran.cartesDeCorrections()[0];
  const phrase = compacter(carteDAFaire(constat, c.ecran.contexte() as never).phrase);
  return c.ecran.cartesAFaire().find((carte) => compacter(texteDe(carte)).includes(phrase));
}
type ElementDeTestLisible = ReturnType<Chaine['ecran']['cartesAFaire']>[number];

function optionsDeGenre(genre: GenreDeConstat): OptionsDeChaine {
  const adaptateurs = [ignoresDuProduit];
  return genre.spec ? optionsDePage(() => genre.spec!, [TEMOIN], { adaptateurs }) : optionsDePoints([...genre.points!, TEMOIN], { adaptateurs });
}

function seriesF8D4(cas: CasDeChaine[]): void {
  const serie = new Serie('F8', 'D4', cas);
  for (const genre of GENRES) {
    serie.ajouter('P12', `${genre.nom} : Ignorer`, () => avecLaChaine('P12', [`Analyser un ${genre.nom} avec un point témoin`, 'Ignorer sur la carte'], optionsDeGenre(genre), async (c, j) => {
      const constat = trouverLe(c, genre.trouver);
      j.verifier(constat !== undefined, `le ${genre.nom} sort de l’analyse`, 'constat absent du message final', 'manque');
      if (!constat) return;
      const bouton = carteDuConstat(c, constat) && c.ecran.boutons(MOTIF_IGNORER, carteDuConstat(c, constat)!)[0];
      j.verifier(bouton !== undefined, 'la carte du constat offre Ignorer', 'aucun bouton Ignorer sur la carte', 'bouton-manquant');
      bouton?.clic();
      j.verifier(bouton === undefined || c.ecran.envois.ignorees.includes(constat.id), 'Ignorer envoie le constat', 'rien n’est envoyé', 'geste-sans-effet');
      await c.ignorer(constat.id, 'constat');
      j.verifier(vuParLEcran(c, constat.id) === undefined, 'le constat quitte la liste visible', 'le constat reste visible', 'geste-sans-effet');
      j.verifier(c.s.observer().ignores.includes(constat.id), 'le sandbox range le constat sous Ignorés', 'clé absente de la liste des ignorés', 'geste-sans-effet');
    }));
    serie.ajouter('P12', `${genre.nom} : « Ne plus proposer »`, () => avecLaChaine('P12', [`Analyser un ${genre.nom} avec un point témoin`, 'Ne plus proposer sur la carte, relire'], optionsDeGenre(genre), async (c, j) => {
      const constat = trouverLe(c, genre.trouver);
      j.verifier(constat !== undefined, `le ${genre.nom} sort de l’analyse`, 'constat absent du message final', 'manque');
      if (!constat) return;
      const carte = carteDuConstat(c, constat);
      const bouton = carte && c.ecran.boutons(MOTIF_NE_PLUS_PROPOSER, carte)[0];
      if (genre.proposition) {
        j.verifier(bouton !== undefined, 'la carte d’une proposition offre « Ne plus proposer »', 'aucun bouton « Ne plus proposer » sur la carte', 'bouton-manquant');
        bouton?.clic();
        j.verifier(bouton === undefined || c.ecran.envois.propositionsIgnorees.includes(constat.id), '« Ne plus proposer » envoie le constat', 'rien n’est envoyé', 'geste-sans-effet');
        await c.ignorer(constat.id, 'proposition');
        const correction = constat.correction!.id;
        j.verifier(!c.s.observer().correctionsRetenues.includes(correction), 'la correction quitte le lot Appliquer', 'la correction reste proposée par le sandbox', 'geste-sans-effet');
        j.verifier(!c.s.observer().ignores.includes(constat.id), 'le constat lui-même n’est pas ignoré', 'le constat est rangé sous Ignorés', 'faux-constat');
        await c.s.demander();
        const apres = trouverLe(c, genre.trouver);
        j.verifier(apres !== undefined && vuParLEcran(c, apres.id) !== undefined, 'à la relecture, le constat reste visible', 'le constat a disparu', 'geste-sans-effet');
        j.verifier(!c.s.observer().correctionsRetenues.includes(correction), 'à la relecture, le sandbox ne retient pas la correction', 'la correction est retenue de nouveau', 'geste-sans-effet');
        j.verifier(lireLEcran(c.ecran).cases === 0, 'à la relecture, l’écran ne propose plus la correction', `${lireLEcran(c.ecran).cases} case(s) à cocher`, 'geste-sans-effet');
      } else {
        j.verifier(bouton === undefined, 'un constat sans proposition n’offre pas « Ne plus proposer »', 'le bouton est offert', 'faux-constat');
        await c.ignorer(constat.id, 'proposition');
        j.verifier(c.s.ignoresBruts === '' && c.s.observer().ignores.length === 0, 'le sandbox refuse : rien n’est rangé', `clés rangées : ${c.s.ignoresBruts}`, 'faux-constat');
        j.verifier(vuParLEcran(c, constat.id) !== undefined, 'le constat reste visible', 'le constat a disparu', 'geste-sans-effet');
      }
    }));
    serie.ajouter('P12', `${genre.nom} : « Ne plus ignorer »`, () => avecLaChaine('P12', [`Analyser un ${genre.nom} avec un point témoin`, 'Ignorer par le sandbox, puis Ne plus ignorer sur la carte'], optionsDeGenre(genre), async (c, j) => {
      const constat = trouverLe(c, genre.trouver);
      j.verifier(constat !== undefined, `le ${genre.nom} sort de l’analyse`, 'constat absent du message final', 'manque');
      if (!constat) return;
      await c.ignorer(constat.id, 'constat');
      c.ecran.mettreAJour();
      const restaurer = c.ecran.boutons(MOTIF_NE_PLUS_IGNORER)[0];
      j.verifier(restaurer !== undefined, 'la carte du constat ignoré offre « Ne plus ignorer »', 'aucun bouton « Ne plus ignorer »', 'bouton-manquant');
      if (!restaurer) return;
      restaurer.clic();
      j.verifier(c.ecran.envois.nePlusIgnorees.includes(constat.id), '« Ne plus ignorer » envoie le constat', 'rien n’est envoyé', 'geste-sans-effet');
      await c.nePlusIgnorer(constat.id);
      j.verifier(vuParLEcran(c, constat.id) !== undefined, 'le constat revient dans la liste visible', 'le constat reste ignoré', 'geste-sans-effet');
      j.verifier(!c.s.observer().ignores.includes(constat.id), 'le sandbox retire la clé', 'la clé reste rangée', 'geste-sans-effet');
    }));
  }
}

// ===========================================================================================================================
// F8 D5 : chaîne complète

function seriesF8D5(cas: CasDeChaine[]): void {
  const serie = new Serie('F8', 'D5', cas);
  const MOTIFS_BRUTS = ['objet-change', 'instance-remplie', 'erreur', 'non-ucm', 'fait-faux', 'cible-introuvable', 'analyse-perimee', 'correction-inconnue'];
  const chaineComplete = (forme: FormeDeRegles, code: 'C43' | 'C45', spec: SpecDePage): Executer => () => {
    const monde = new MondeEnEcriture(spec);
    const io = ecritureSurLeMonde(monde);
    const description = `${forme} : ${code}, analyse, coche, écriture, relecture`;
    return avecLaChaine('P7', [description, 'Analyser, cocher à la main, cliquer Appliquer tout, relire, rejouer le même lot'], optionsDePage(() => monde.spec), async (c, j) => {
      const trouve = trouverLe(c, code === 'C43' ? estC43 : estC45('sans-regle'));
      j.verifier(trouve !== undefined, `${code} sort de l’analyse`, 'constat absent du message final', 'manque', 'P6');
      if (!trouve) return;
      c.ecran.ouvrirToutes();
      cocherAMain(c.ecran);
      const cochables = lignesCochables(c.ecran);
      const bouton = c.ecran.boutonAppliquerTout();
      j.verifier(bouton !== null && !bouton.disabled, 'Appliquer tout est actif quand les lignes sont cochées', 'Appliquer tout est inactif ou absent', 'non-ecrite');
      if (!bouton) return;
      bouton.clic();
      const ids = c.ecran.envois.appliquer.at(-1)?.ids ?? [];
      for (const ligne of cochables) j.verifier(ids.includes(ligne.id), `la ligne ${ligne.id} est envoyée à l’écriture`, 'la ligne a une case mais n’est pas envoyée', 'non-ecrite');
      await c.appliquer(ids, io.lot);
      const rendu = [...c.s.messages].reverse().find((message): message is Extract<PluginMessage, { type: 'corrections-appliquees' }> => message.type === 'corrections-appliquees');
      j.verifier(rendu !== undefined, 'le sandbox répond par corrections-appliquees', 'aucune réponse', 'muet');
      if (!rendu) return;
      const sautees = new Set(rendu.sautees.map((saute) => saute.id));
      for (const id of ids) j.verifier(!sautees.has(id) || (/ car /.test(rendu.resume) && !MOTIFS_BRUTS.some((brut) => rendu.resume.includes(brut))), `la ligne ${id} est écrite, ou sautée avec un motif lisible`, `sautée sans motif lisible : « ${rendu.resume} »`, 'non-ecrite');
      const appels = monde.appels;
      j.verifier(appels.length === 1 && appels[0] === (code === 'C43' ? 'creer' : 'ajouter'), `l’écriture se fait en un appel (${code === 'C43' ? 'creer' : 'ajouter'})`, `appels : ${appels.join(', ') || 'aucun'}`, 'non-ecrite');
      const annulations = io.atelier.journal.filter((ligne) => ligne === 'commitUndo').length;
      j.verifier(annulations === (rendu.ecrites > 0 ? 1 : 0), 'le lot pose un seul point d’annulation', `${annulations} point(s) d’annulation`, 'non-ecrite');
      await c.s.demander();
      const apres = constatsFinaux(c).filter((constat) => constat.code === 'C43' || (constat.code === 'C45' && (constat.faits.ecart === 'sans-regle' || constat.faits.ecart === 'sans-valeur')));
      j.verifier(apres.length === 0, 'la relecture ne montre plus ni C43 ni C45 sans-regle ou sans-valeur', `${apres.length} constat(s) restent`, 'correction-inexacte', 'P6');
      j.verifier(c.ecran.cartesDeCorrections().length === 0 && lireLEcran(c.ecran).cases === 0, 'l’écran ne propose plus de correction', 'une carte de corrections reste', 'non-affiche', 'P6');
      j.verifier(constatsFinaux(c).some((constat) => constat.code === 'C44'), 'les règles posées restent signalées par C44 (« [À compléter] »)', 'aucun C44 après l’écriture', 'manque', 'P6');
      await c.appliquer(ids, io.lot);
      j.verifier(monde.appels.length === appels.length, 'un second passage ne pose rien', `${monde.appels.length - appels.length} appel(s) de plus`, 'correction-inexacte', 'P6');
    });
  };
  for (const forme of FORMES_DE_REGLES) {
    const base = specDeLaForme(forme);
    serie.ajouter('P6', `${forme} : C43 de bout en bout`, chaineComplete(forme, 'C43', sansConteneur(base)));
    const propriete = base.proprietes.find((entree) => !entree.wrapper && entree.type !== 'TEXT');
    if (propriete) serie.ajouter('P6', `${forme} : C45 de bout en bout`, chaineComplete(forme, 'C45', avecLesRegles(base, sansLesReglesDe(reglesDe(base), cleDeLaPropriete(propriete)))));
    else serie.nonConstructible('P6', `${forme} : C45 de bout en bout`, `${FORMES[forme].composant} n’a aucune propriété, donc aucune règle de propriété à retirer`);
  }
}

// ===========================================================================================================================
// F8 D6 : doublons rendus à l'écran

function seriesF8D6(cas: CasDeChaine[]): void {
  const serie = new Serie('F8', 'D6', cas);
  serie.ajouter('P11', 'C43 et C44 « aucune instance » : une seule carte pour la même absence (Q-09, Q-F89-5)', () => avecLaChaine('P11', ['Analyser une page sans instance de règles', 'Compter les cartes de l’absence'], optionsDePage(() => sansConteneur(BASE)), async (c, j) => {
    const doublons = c.constats().filter((constat) => estC43(constat) || estC44('aucune-instance')(constat));
    j.verifier(doublons.some(estC43), 'C43 sort', 'aucun C43', 'manque');
    c.ecran.ouvrirToutes();
    const lieux = new Set([...rangementDesConstats(c.ecran.modele(), doublons).values()].flat());
    j.verifier(lieux.size === 1, 'l’absence d’instance donne une seule carte', `${lieux.size} cartes (${[...lieux].join(' ; ')})`, 'affiche-deux-fois');
  }), { rattachement: 'E-30' });

  const paire = (code: 'C25' | 'C29', source: { operateur: string; description: string }, libelle: string): void =>
    serie.ajouter('P11', `${code} du kit et C30 du moteur sur ${libelle} : une seule carte, celle du kit (Q-09)`, async () => {
      const j = new Jugement('P11');
      j.scenario.push(`Analyser le cas du kit ${source.operateur} (${libelle}) avec un point C30 du moteur sur le même layer et le même champ`);
      const trouves = noyauDuKit().cas.filter((candidat) => candidat.operateur === source.operateur && candidat.attendus.some((attendu) => attendu.code === code) && candidat.entree.description.includes(source.description));
      if (!trouves[0]) { j.ecarts.push({ propriete: 'P11', sorte: 'exception', detail: `aucun cas du kit (${source.operateur}, ${code}, « ${source.description} »)` }); return j; }
      const [, layer, champKit] = trouves[0].attendus.find((attendu) => attendu.code === code)!.cle.split('|');
      const champ = champKit || 'fills';
      const composant = { releve: trouves[0].entree.composant.releve as never, catalogue: trouves[0].entree.composant.catalogue as never };
      const base = await lancerLaChaine(composant);
      const nom = base.releve.variants.flatMap((variant) => variant.layers).find((entree) => entree.id === layer)?.nom ?? layer;
      const chaine = await lancerLaChaine({ ...composant, moteur: { points: [{ point: { famille: 'variables', titre: `${nom} : ${champ} sans variable associée.`, impact: 'La valeur ne suit pas le thème.', action: 'Lier une variable.', calque: nom }, noeuds: [layer] }] } });
      const doublons = chaine.final().constats.filter((constat) => constat.layers.includes(layer) && ['C25', 'C29', 'C30'].includes(constat.code)) as unknown as Constat[];
      chaine.ecran.ouvrirToutes();
      const lieux = new Set([...rangementDesConstats(chaine.ecran.modele(), doublons).values()].flat());
      j.verifier(doublons.some((constat) => constat.code === code), `le kit signale l’écart (${code})`, `codes émis sur le layer : ${doublons.map((constat) => constat.code).join(', ') || 'aucun'}`, 'manque');
      j.verifier(!doublons.some((constat) => constat.code === 'C30'), 'le point C30 du moteur se tait devant celui du kit', 'un C30 reste sur le layer', 'affiche-deux-fois');
      j.verifier(lieux.size === 1, 'les deux signalements donnent une seule carte', `${lieux.size} cartes (${[...lieux].join(' ; ')})`, 'affiche-deux-fois');
      j.verifier(!doublons.some((constat) => constat.code === 'C30' && [...rangementDesConstats(chaine.ecran.modele(), [constat]).values()].flat().length > 0) || !doublons.some((constat) => constat.code === code), 'la carte restante est celle du kit', 'la carte du moteur s’ajoute à celle du kit', 'affiche-deux-fois');
      j.messages.push(`constats sur le layer : ${doublons.map((constat) => constat.code).join(', ')}`);
      return j;
    }, { rattachement: code === 'C25' ? 'E-25 (le kit ne juge pas ce layer), puis E-30' : 'E-30' });
  paire('C25', { operateur: 'U1', description: 'fond de Root' }, 'un remplissage');
  paire('C25', { operateur: 'U1', description: 'trait de Root' }, 'un contour');
  paire('C25', { operateur: 'U1', description: 'plage' }, 'une plage de texte');
  for (const champ of ['paddingLeft', 'itemSpacing', 'cornerRadius']) paire('C29', { operateur: 'Z1', description: champ }, `le champ ${champ}`);
}

// ===========================================================================================================================
// F9 D1 : un écran par état

function seriesF9D1(cas: CasDeChaine[]): void {
  const serie = new Serie('F9', 'D1', cas);
  const ecran = (description: string, propriete: string, options: OptionsDeChaine, juger: (c: Chaine, j: Jugement) => Promise<void>, plus: { question?: string; rattachement?: string } = {}): void =>
    serie.ajouter(propriete, description, () => avecLaChaine(propriete, [description], options, juger), plus);
  /** Où s'arrête la chaîne : une photographie de l'écran au passage nommé, pendant l'analyse. */
  let cible: Chaine | null = null;
  const enCours = (nom: string): OptionsDeChaine => ({ avant: (c) => { cible = c; }, plan: agir('catalogue', 'avant', async () => { await cible!.photographier(nom); }) });
  /** Le provisoire part quand les contrôles du kit ont fini, pendant que le moteur lit : les règles sont le premier passage qui le suit. */
  const apresLeProvisoire = (nom: string, plus: () => void | Promise<void> = () => {}): OptionsDeChaine => ({ avant: (c) => { cible = c; }, plan: agir('regles', 'avant', async () => { await plus(); await cible!.photographier(nom); }) });

  ecran('aucune sélection', 'P13', { sansComposant: true, flux: async () => {} }, async (c, j) => {
    const vue = c.vue();
    const barre = await c.barre();
    dit(j, alertesDe(vue), /Sélectionnez un composant/, 'de sélectionner un composant', 'muet');
    j.verifier(vue.sections.length === 0 && vue.cartes.aFaire === 0, 'le panneau ne montre aucune carte', `${vue.sections.length} section(s)`, 'faux-constat');
    j.verifier(barre.analyserInactif, 'Analyser est inactif sans composant', 'Analyser est actif', 'muet');
    nonDit(j, alertesDe(vue), AUCUN_CONSTAT, '« Aucun constat »');
  });
  ecran('fichier hors UCM', 'P25', { declaration: DECLARATIONS.libre }, async (c, j) => {
    const vue = c.vue();
    const barre = await c.barre();
    j.verifier(vue.alertes.length === 1, 'le panneau ne montre que l’alerte', `${vue.alertes.length} alerte(s), ${vue.sections.length} section(s)`, 'faux-constat');
    dit(j, alertesDe(vue), /pas déclaré UCM/, 'que le fichier n’est pas déclaré UCM', 'muet');
    j.verifier(vue.sections.length === 0, 'aucune section de constats', `${vue.sections.length} section(s)`, 'faux-constat');
    j.verifier(barre.analyserCache, 'Analyser est caché hors UCM', 'Analyser est visible', 'muet');
    const familles = c.s.observer().familles;
    j.verifier(!familles.includes('controle-theme') && !familles.includes('controle-structure'), 'le sandbox saute les familles thème et structure', `familles lancées : ${familles.join(', ')}`, 'faux-constat');
  });
  ecran('library à choisir', 'P26', { reference: { library: null, nom: null, candidates: 2 }, flux: async () => {} }, async (c, j) => {
    const vue = c.vue();
    const barre = await c.barre();
    dit(j, alertesDe(vue), /Choisissez la library/, 'de choisir la library', 'muet');
    j.verifier(barre.analyserInactif, 'Analyser est inactif tant que la library n’est pas choisie', 'Analyser est actif', 'muet');
  });
  ecran('pas encore analysé', 'P13', { flux: async () => {} }, async (c, j) => {
    const vue = c.vue();
    const barre = await c.barre();
    dit(j, alertesDe(vue), /Analyser lit les \d+ variants/, 'ce qu’Analyser va lire', 'muet');
    nonDit(j, alertesDe(vue), AUCUN_CONSTAT, '« Aucun constat »');
    j.verifier(!barre.analyserInactif && vue.sections.length === 0, 'Analyser est actif et aucune carte n’est dessinée', 'Analyser inactif ou cartes dessinées', 'muet');
  });
  ecran('analyse en cours', 'P13', enCours('en-cours'), async (c, j) => {
    const photo = c.instantanes.get('en-cours');
    j.verifier(photo !== undefined, 'la chaîne s’arrête pendant l’analyse', 'aucune photographie', 'exception');
    if (!photo) return;
    j.verifier(photo.vue.boutons.some((bouton) => /^Annuler/.test(bouton)), 'l’écran offre Annuler', `boutons : ${photo.vue.boutons.join(' | ')}`, 'muet');
    nonDit(j, photo.vue.texte, AUCUN_CONSTAT, '« Aucun constat »');
    j.verifier(photo.vue.sections.length === 0, 'aucune carte avant le premier constat', `${photo.vue.sections.length} section(s)`, 'faux-constat');
    j.verifier(photo.barre.analyserInactif, 'Analyser est inactif pendant l’analyse', 'Analyser est actif', 'muet');
  });
  ecran('résultat provisoire', 'P20', apresLeProvisoire('provisoire'), async (c, j) => {
    const photo = c.instantanes.get('provisoire');
    j.verifier(photo !== undefined, 'la chaîne s’arrête après le provisoire', 'aucune photographie', 'exception');
    if (!photo) return;
    dit(j, alertesDe(photo.vue), /composants imbriqués est en cours/, 'que l’analyse des composants imbriqués continue', 'muet');
    j.verifier(photo.vue.tenues.length === 0, 'aucune section tenue avant le résultat final', `tenues : ${photo.vue.tenues.join(', ')}`, 'accusation');
    j.verifier(photo.vue.casesActives === 0 && (photo.vue.pied === null || photo.vue.appliquerInactif === true), 'aucune écriture n’est permise tant que le final manque', 'une case ou Appliquer est actif', 'cochee');
    j.verifier(photo.barre.analyserInactif, 'Analyser est inactif pendant le calcul', 'Analyser est actif', 'muet');
  });
  ecran('analyse arrêtée', 'P13', { plan: lever('moteur') }, async (c, j) => {
    const vue = c.vue();
    j.verifier(c.final()?.statut === 'arretee', 'le statut final est arretee', `statut ${String(c.final()?.statut)}`, 'accusation', 'P19');
    dit(j, alertesDe(vue), /L’analyse s’est arrêtée/, 'que l’analyse s’est arrêtée', 'muet');
    dit(j, alertesDe(vue), /Message de l’exporteur/, 'le message de l’exporteur', 'muet');
    nonDit(j, alertesDe(vue), AUCUN_CONSTAT, '« Aucun constat »');
    j.verifier(vue.sections.length === 0, 'aucune carte de constats', `${vue.sections.length} section(s)`, 'faux-constat');
  });
  ecran('analyse annulée', 'P18', { avant: (c) => { cible = c; }, plan: agir('releve', 'avant', async () => { await cible!.s.annuler('identite'); }) }, async (c, j) => {
    const vue = c.vue();
    j.verifier(c.final()?.statut === 'annulee', 'le statut final est annulee', `statut ${String(c.final()?.statut)}`, 'accusation');
    dit(j, alertesDe(vue), /L’analyse a été annulée/, 'que l’analyse a été annulée', 'muet');
    nonDit(j, alertesDe(vue), AUCUN_CONSTAT, '« Aucun constat sur … »');
    j.verifier(vue.sections.length === 0 && constatsFinaux(c).length === 0, 'aucun constat', `${constatsFinaux(c).length} constat(s)`, 'faux-constat');
  });
  const partielle = (description: string, options: OptionsDeChaine, dire: (c: Chaine, j: Jugement, texte: string) => void, sansRegles = false): void =>
    ecran(description, 'P15', options, async (c, j) => {
      const vue = c.vue();
      const texte = alertesDe(vue);
      j.verifier(c.final()?.statut === 'partielle', 'le statut final est partielle (table 2.5)', `statut ${String(c.final()?.statut)}`, 'accusation', 'P14');
      nonDit(j, texte, AUCUN_CONSTAT, '« Aucun constat sur … »', 'accusation', 'P13');
      dire(c, j, texte);
      if (sansRegles) j.verifier(!constatsFinaux(c).some((constat) => constat.code === 'C43' || constat.code === 'C45'), 'ni C43 ni C45 quand les règles ne sont pas jugées', 'C43 ou C45 émis', 'faux-constat', 'P13');
      j.note(`sections tenues à l’écran : ${vue.tenues.length} (Q-F89-16, non jugé ici)`);
    });
  partielle('partielle par budget (variants et layers non lus)', {
    adaptateurs: [degraderLaLecture({ variantsNonLus: ['Palette=danger, Style=outline, State=disabled, Size=medium'], layersNonLus: 252 })],
  }, (c, j, texte) => {
    const lus = c.s.b.releve.lecture.layersLus;
    j.verifier(sansBlancs(texte).includes(`alu${lus}layerssur${lus + 252}`), `la bannière donne les nombres lus : le moteur a lu ${lus} layers sur ${lus + 252}`, `alertes : ${texte}`, 'accusation', 'P15');
    nonDit(j, texte, JAMAIS_N_SUR_N, '« N layers lus sur N »', 'accusation', 'P15');
  });
  partielle('partielle par lectures manquées', { adaptateurs: [degraderLaLecture({ manquees: manquees(3) })] }, (_c, j, texte) => {
    dit(j, texte, /3 lectures ont échoué/, 'que 3 lectures ont échoué', 'muet', 'P15');
  });
  partielle('partielle par moteur partiel', { adaptateurs: [MOTEUR_PARTIEL] }, (c, j, texte) => {
    dit(j, texte, DIT.moteur, 'que le moteur n’a pas tout lu', 'muet', 'P15');
    nonDit(j, texte, JAMAIS_N_SUR_N, '« N variants lus sur N »', 'accusation', 'P15');
    j.verifier(!c.s.observer().passages.includes('regles:1'), 'les règles ne sont pas lues quand le moteur est partiel', 'le lecteur de règles est appelé', 'faux-constat', 'P13');
  }, true);
  partielle('partielle par règles refusées', { plan: lever('regles') }, (_c, j, texte) => {
    dit(j, texte, DIT.regles, 'que les règles n’ont pas été jugées', 'muet', 'P13');
  }, true);
  ecran('complète sans constat', 'P13', { adaptateurs: [silenceDuKit] }, async (c, j) => {
    const vue = c.vue();
    j.verifier(c.final()?.statut === 'complete' && !lecturesNonJugees(c), 'toutes les parts sont jugées : statut complete', `statut ${String(c.final()?.statut)}`, 'accusation', 'P14');
    j.verifier(constatsFinaux(c).length === 0, 'le composant ne porte aucun constat', `${constatsFinaux(c).length} constat(s)`, 'faux-constat');
    dit(j, alertesDe(vue), AUCUN_CONSTAT, '« Aucun constat sur … » (tout est jugé)', 'muet');
  });
  ecran('complète avec constats', 'P10', {}, async (c, j) => {
    const vue = c.vue();
    const barre = await c.barre();
    const visibles = constatsFinaux(c).filter((constat) => constat.type !== 'info').length;
    j.verifier(c.final()?.statut === 'complete', 'le statut final est complete', `statut ${String(c.final()?.statut)}`, 'accusation', 'P14');
    nonDit(j, alertesDe(vue), AUCUN_CONSTAT, '« Aucun constat sur … »');
    j.verifier(vue.sections.length >= 1, 'au moins une section de constats', 'aucune section', 'non-affiche');
    j.verifier(barre.pastille === visibles && vue.puces.find((puce) => puce.element === 'tout')?.points === visibles, `la pastille et le sommaire comptent ${visibles} constats`, `pastille ${String(barre.pastille)}, sommaire ${String(vue.puces.find((puce) => puce.element === 'tout')?.points)}`, 'non-affiche', 'P10');
    j.verifier(vue.sections.length + vue.tenues.length === 7, 'chaque élément est une section ou une section tenue', `${vue.sections.length} sections, ${vue.tenues.length} tenues`, 'non-affiche');
  });
  const deuxManquantes = (): SpecDePage => sansRegles(sansRegles(BASE, 'Has Icon'), 'Loading');
  serie.ajouter('P21', 'périmée par un changement du document', () => {
    const monde = new MondeEnEcriture(deuxManquantes());
    return avecLaChaine('P21', ['Analyser (deux propriétés sans règle, un point témoin)', 'Changer un nœud de l’inventaire'], optionsDePage(() => monde.spec, [TEMOIN]), async (c, j) => {
      c.s.evenement('noeud');
      const { vue } = await c.photographier('perimee');
      const o = c.s.observer();
      j.verifier(JSON.stringify(o.perimes) === JSON.stringify(['document']), 'l’analyse est périmée une fois, pour la cause « document »', `péremptions : ${o.perimes.join(', ') || 'aucune'}`, 'muet');
      j.verifier(vue.sections.length >= 1, 'le panneau garde ses constats (SPEC)', `${vue.sections.length} section(s) : la liste est remplacée par une note`, 'non-affiche');
      j.verifier(vue.casesActives === 0, 'aucune case n’est active', `${vue.casesActives} case(s) active(s)`, 'cochee');
      dit(j, norm(vue.texte), /a changé depuis l’analyse|datent d’avant le changement/, 'que le composant a changé', 'muet');
    });
  }, { rattachement: 'E-38' });
  serie.ajouter('P21', 'périmée après une écriture', () => {
    const monde = new MondeEnEcriture(deuxManquantes());
    const io = ecritureSurLeMonde(monde);
    return avecLaChaine('P21', ['Analyser (deux propriétés sans règle, un point témoin)', 'Cocher, Appliquer tout, relire l’écran'], optionsDePage(() => monde.spec, [TEMOIN]), async (c, j) => {
      cocherAMain(c.ecran);
      const ids = lignesCochables(c.ecran).map((ligne) => ligne.id);
      j.verifier(ids.length >= 1, 'l’écran propose au moins une correction', 'aucune ligne cochable', 'manque');
      await c.appliquer(ids, io.lot);
      const { vue } = await c.photographier('apres-ecriture');
      const o = c.s.observer();
      const rendu = [...c.s.messages].reverse().find((message): message is Extract<PluginMessage, { type: 'corrections-appliquees' }> => message.type === 'corrections-appliquees');
      j.verifier(JSON.stringify(o.perimes) === JSON.stringify(['ecriture']), 'l’analyse est périmée une fois, pour la cause « ecriture »', `péremptions : ${o.perimes.join(', ') || 'aucune'}`, 'muet');
      j.verifier(rendu !== undefined && norm(vue.texte).includes(norm(rendu.resume)), 'l’écran dit ce que l’écriture a fait', `résumé du lot « ${rendu?.resume ?? 'aucun'} » absent de l’écran`, 'muet');
      j.verifier(vue.sections.length >= 1, 'le panneau garde les constats que l’écriture n’a pas réglés (SPEC)', `${vue.sections.length} section(s) : la liste est remplacée par une note`, 'non-affiche');
      j.verifier(vue.casesActives === 0, 'aucune case n’est active', `${vue.casesActives} case(s) active(s)`, 'cochee');
    });
  }, { rattachement: 'E-38' });
  ecran('provisoire périmé', 'P21', apresLeProvisoire('provisoire', () => { cible!.s.evenement('noeud'); }), async (c, j) => {
    const { vue, barre } = await c.photographier('fin');
    const o = c.s.observer();
    j.verifier(JSON.stringify(o.perimes) === JSON.stringify(['document']), 'le provisoire est périmé une fois, pour la cause « document »', `péremptions : ${o.perimes.join(', ') || 'aucune'}`, 'muet');
    j.verifier(vue.sections.length >= 1, 'le panneau garde les constats du provisoire', `${vue.sections.length} section(s)`, 'non-affiche');
    j.verifier(vue.casesActives === 0, 'aucune case n’est active', `${vue.casesActives} case(s) active(s)`, 'cochee');
    j.verifier(!barre.analyserInactif, 'Analyser redevient possible', 'Analyser reste inactif', 'muet');
    dit(j, alertesDe(vue), /a changé depuis l’analyse/, 'que le composant a changé', 'muet');
  }, { rattachement: 'E-38' });
  ecran('écriture en cours', 'P22', optionsDePage(() => sansRegles(BASE, 'Has Icon'), [TEMOIN]), async (c, j) => {
    const ids = lignesCochables(c.ecran).map((ligne) => ligne.id);
    await c.poserLEcriture(ids);
    const { vue, barre } = await c.photographier('ecriture');
    j.verifier(/Écriture .*en cours/.test(norm(vue.texte)), 'l’écran dit que l’écriture est en cours', 'aucune note d’écriture', 'muet');
    j.verifier(vue.casesActives === 0 && vue.sections.length === 0, 'aucune case active pendant l’écriture', `${vue.casesActives} case(s) active(s)`, 'cochee');
    j.verifier(barre.analyserInactif, 'Analyser est inactif pendant l’écriture', 'Analyser est actif', 'muet');
    const identite = c.identite();
    // Le refus d'un Actualiser porte le numéro de la demande ; sans lui, c'est l'écriture elle-même qui a été refusée.
    if (identite) c.recevoir({ type: 'occupe', analyse: identite, demande: 1 });
    const apres = lireLEcran(c.ecran);
    j.verifier(/Écriture .*en cours/.test(norm(apres.texte)) && (c.etat.analyse as unknown as { ecriture: unknown } | null)?.ecriture !== null, 'une demande refusée (occupe) ne change pas l’écriture affichée : elle continue', 'l’écran revient à la liste et Appliquer redevient possible', 'fuite', 'P22');
    j.note('texte de l’écran après occupe (Q-F89-17, non jugé ici) : ' + (apres.alertes.join(' | ') || 'aucune alerte'));
  }, { rattachement: 'N-80' });
  ecran('tous les constats ignorés', 'P27', optionsDePoints([TEMOIN, { point: point('Layer « Autre » : il n’utilise pas d’auto layout.'), noeuds: ['12:36'] }], { adaptateurs: [ignoresDuProduit] }), async (c, j) => {
    const ids = constatsFinaux(c).map((constat) => constat.id);
    for (const id of ids) await c.ignorer(id, 'constat');
    const vue = c.vue();
    j.verifier(c.constats().length === 0 && ids.length === 2, 'les deux constats sont ignorés', `${c.constats().length} constat(s) visible(s), ${ids.length} émis`, 'exception');
    j.verifier(vue.boutons.some((bouton) => MOTIF_NE_PLUS_IGNORER.test(bouton)), 'l’écran garde le moyen de restaurer : « Ne plus ignorer »', `boutons : ${vue.boutons.join(' | ')}`, 'muet');
    j.note(`texte de l’écran : ${alertesDe(vue) || 'aucune alerte'} (Q-F89-18 : « Aucun constat visible, N ignorés », non jugé ici)`);
  }, { rattachement: 'N-77' });
}

// ===========================================================================================================================
// F9 D2 : relecture de 20 suites de messages enregistrées sur les cas B

/** Les 20 cas B de F9 dont les messages sont enregistrés : lectures, budget, cycle et états, dans l'ordre des opérateurs. */
export const CAS_B_ENREGISTRES: readonly string[] = [
  'N1-1', 'N7-3', 'N8-1', 'Mp1-1', 'Bd3-1', 'An-2', 'An-9', 'An-12', 'An-30', 'An-34', 'Pe-2', 'Pe-4', 'Pe-37', 'Oc-1', 'Id-9', 'Pv-3', 'Pv-7', 'Ig-6', 'Hu-4', 'St-2',
];
/** Les cas dont une vérification dépend d'une question ouverte. */
const QUESTION_DE_LA_RELECTURE: Readonly<Record<string, string>> = { 'Oc-1': 'Q-F89-17' };

interface Enregistrement { readonly messages: readonly PluginMessage[]; readonly description: string }
let enregistrements: Promise<Map<string, Enregistrement>> | null = null;

/** Joue les 20 cas B une fois et garde les messages de leur séance : le sandbox ne tourne plus pendant la relecture. */
function enregistrer(): Promise<Map<string, Enregistrement>> {
  enregistrements ??= (async () => {
    const tous = new Map(tousLesCas('F9').map((cas) => [cas.id, cas]));
    const vues: Seance[] = [];
    const statique = Seance as unknown as { ouvrir: (options?: unknown) => Promise<Seance> };
    const ouvrir = statique.ouvrir.bind(Seance);
    statique.ouvrir = async (options) => { const s = await ouvrir(options); vues.push(s); return s; };
    const resultat = new Map<string, Enregistrement>();
    try {
      for (const id of CAS_B_ENREGISTRES) {
        const cas = tous.get(id);
        vues.length = 0;
        if (!cas) continue;
        await cas.entree.jouer({});
        if (vues[0]) resultat.set(id, { messages: [...vues[0].messages], description: cas.entree.description });
      }
    } finally {
      statique.ouvrir = ouvrir;
    }
    return resultat;
  })();
  return enregistrements;
}

interface EtatAttendu { identite: IdentiteDAnalyse | null; statut: string | null; perimee: boolean }
const memeIdentite = (a: IdentiteDAnalyse, b: IdentiteDAnalyse): boolean => a.sujet === b.sujet && a.generation === b.generation;

/** La machine d'états de l'interface telle que les propriétés P18 à P24 l'écrivent : une identité retenue, un final et un provisoire par analyse, la péremption une fois. */
function etatApresLeMessage(avant: EtatAttendu, message: PluginMessage): EtatAttendu {
  if (message.type === 'analyse-commencee') {
    if (avant.identite && message.analyse.generation <= avant.identite.generation) return avant;
    return { identite: message.analyse, statut: 'en-cours', perimee: false };
  }
  if (message.type === 'analyse' || message.type === 'analyse-provisoire') {
    if (!avant.identite || message.analyse.generation > avant.identite.generation) {
      return { identite: message.analyse, statut: message.type === 'analyse' ? message.statut : 'provisoire', perimee: false };
    }
  }
  if (!avant.identite || !('analyse' in message) || !memeIdentite(avant.identite, message.analyse)) return avant;
  if (message.type === 'analyse-provisoire') return avant.statut === 'en-cours' && !avant.perimee ? { ...avant, statut: 'provisoire' } : avant;
  if (message.type === 'analyse') return avant.perimee || (avant.statut !== 'en-cours' && avant.statut !== 'provisoire') ? avant : { ...avant, statut: message.statut };
  if (message.type === 'perime') return { ...avant, perimee: true };
  return avant;
}

function seriesF9D2(cas: CasDeChaine[]): void {
  const serie = new Serie('F9', 'D2', cas);
  for (const id of CAS_B_ENREGISTRES) {
    const question = QUESTION_DE_LA_RELECTURE[id];
    serie.ajouter('P18', `relecture de la suite de messages du cas ${id}`, async () => {
      const j = new Jugement('P18');
      const enregistrement = (await enregistrer()).get(id);
      j.scenario.push(`Rejouer dans l'interface les messages enregistrés du cas B ${id}`);
      if (!enregistrement) {
        j.ecarts.push({ propriete: 'P18', sorte: 'exception', detail: `aucune séance enregistrée pour ${id}` });
        return j;
      }
      const { messages } = enregistrement;
      j.scenario.push(enregistrement.description);
      const variants = [...messages].reverse().find((message): message is Extract<PluginMessage, { type: 'analyse' | 'analyse-provisoire' }> => message.type === 'analyse' || message.type === 'analyse-provisoire')?.variants ?? [];
      const lecture = { sujet: { id: 'jeu', nom: 'Composant', type: 'COMPONENT_SET', variant: null, variants }, ancetres: [], calques: [], liaisons: [], styles: [], usagesDeStyle: [], directes: [], releve: { collections: [], variables: [] }, calquesNonLus: 0, erreurs: [] };
      const ui = await interfaceSeule(lecture as never);
      let attendu: EtatAttendu = { identite: null, statut: null, perimee: false };
      const lu = (): EtatAttendu => {
        const analyse = ui.etat.analyse as unknown as { identite: IdentiteDAnalyse; statut: string; perimee: boolean } | null;
        return analyse ? { identite: analyse.identite, statut: analyse.statut, perimee: analyse.perimee } : { identite: null, statut: null, perimee: false };
      };
      const generations: number[] = [];
      const finaux = new Map<number, number>();
      const provisoires = new Map<number, number>();
      let aVuOccupe = false;
      messages.forEach((message, rang) => {
        if (message.type === 'analyse-commencee') generations.push(message.analyse.generation);
        if (message.type === 'analyse') finaux.set(message.analyse.generation, (finaux.get(message.analyse.generation) ?? 0) + 1);
        if (message.type === 'analyse-provisoire') provisoires.set(message.analyse.generation, (provisoires.get(message.analyse.generation) ?? 0) + 1);
        if (message.type === 'analyse' && message.statut === 'annulee') j.verifier(message.constats.length === 0, `message ${rang + 1} : une analyse annulée ne porte aucun constat`, `${message.constats.length} constat(s)`, 'fuite', 'P18');
        attendu = etatApresLeMessage(attendu, message);
        let ecritureNotee = false;
        if (message.type === 'occupe') {
          aVuOccupe = true;
          // Une écriture affichée au moment du refus : l'interface doit la garder (P22).
          if (analyseApplicable(ui.etat.analyse as never)) { noterLEnvoi(ui.etat, ['envoi'], 0); ecritureNotee = true; }
        }
        ui.recevoir(message);
        if (ecritureNotee) j.verifier((ui.etat.analyse as unknown as { ecriture: unknown }).ecriture !== null, `message ${rang + 1} : occupe ne change pas l’écriture affichée`, 'l’écriture affichée est effacée alors qu’elle continue', 'fuite', 'P22');
        if (message.type === 'analyse-en-cours') return;
        const obtenu = lu();
        const ok = (obtenu.identite === null) === (attendu.identite === null)
          && (obtenu.identite === null || (memeIdentite(obtenu.identite, attendu.identite!) && obtenu.statut === attendu.statut && obtenu.perimee === attendu.perimee));
        j.verifier(ok, `après le message ${rang + 1} (${message.type}), l’interface retient ${attendu.statut ?? 'rien'}${attendu.perimee ? ' périmée' : ''}`, `l’interface retient ${obtenu.statut ?? 'rien'}${obtenu.perimee ? ' périmée' : ''}, identité ${obtenu.identite ? obtenu.identite.generation : 'aucune'}`, 'fuite', 'P24');
      });
      const analyse = ui.etat.analyse as unknown as { statut: string; perimee: boolean; ecriture: unknown; constats: readonly unknown[] } | null;
      j.verifier(generations.every((generation, rang) => rang === 0 || generation > generations[rang - 1]), 'les générations des analyses ouvertes croissent', `générations : ${generations.join(', ')}`, 'fuite', 'P24');
      j.verifier([...finaux.values()].every((nombre) => nombre <= 1), 'une identité ne reçoit jamais deux messages analyse', `finaux par identité : ${[...finaux.values()].join(', ')}`, 'fuite', 'P19');
      j.verifier([...provisoires.values()].every((nombre) => nombre <= 1), 'un seul provisoire par analyse', `provisoires par identité : ${[...provisoires.values()].join(', ')}`, 'fuite', 'P20');
      for (const [generation, rangFinal] of [...messages.entries()].flatMap(([rang, message]) => (message.type === 'analyse' ? [[message.analyse.generation, rang] as const] : []))) {
        const rangProvisoire = messages.findIndex((message) => message.type === 'analyse-provisoire' && message.analyse.generation === generation);
        j.verifier(rangProvisoire === -1 || rangProvisoire < rangFinal, 'le provisoire précède le final', `provisoire au rang ${rangProvisoire + 1}, final au rang ${rangFinal + 1}`, 'fuite', 'P20');
      }
      j.messages.push(...resumeDesMessages(messages));
      j.ecran.push(...lignesDeLEcran(lireLEcran(ui.ecran)));
      if (analyse) {
        const barre = await lireLaBarre(ui.etat);
        const calcul = calculEnCours(analyse as never);
        j.verifier(analyseApplicable(analyse as never) === ((analyse.statut === 'complete' || analyse.statut === 'partielle') && !analyse.perimee), 'les verrous d’écriture suivent le statut : applicable seulement pour un final non périmé', `statut ${analyse.statut}, périmée ${analyse.perimee}`, 'fuite', 'P20');
        j.verifier(barre.analyserInactif === (calcul || analyse.ecriture !== null), 'Analyser est inactif pendant un calcul ou une écriture, actif sinon', `Analyser ${barre.analyserInactif ? 'inactif' : 'actif'}, calcul ${calcul}`, 'muet', 'P22');
        const vue = lireLEcran(ui.ecran);
        const droitAuTenu = analyse.statut === 'complete' && !analyse.perimee && analyse.constats.length === 0 && analyse.ecriture === null;
        j.verifier(droitAuTenu || !AUCUN_CONSTAT.test(alertesDe(vue)), 'l’écran ne dit « Aucun constat sur … » que pour une analyse complète sans constat', `alertes : ${alertesDe(vue)}`, 'accusation', 'P13');
        if (aVuOccupe) {
          j.verifier(/opération est déjà en cours/.test(norm(vue.texte)), 'l’écran dit « Une opération est déjà en cours. » quand une demande est refusée', 'aucune ligne ne dit le refus', 'muet', 'P22');
        }
      }
      return j;
    }, question ? { question } : {});
  }
}

// ===========================================================================================================================
// Le registre

let memo: CasDeChaine[] | null = null;

/** Les 129 cas de la section D, F8 puis F9, dans l'ordre des séries. */
export function casDeLaChaine(): CasDeChaine[] {
  if (memo) return memo;
  const f8: CasDeChaine[] = [];
  seriesF8D1(f8); seriesF8D2(f8); seriesF8D3(f8); seriesF8D4(f8); seriesF8D5(f8); seriesF8D6(f8);
  const f9: CasDeChaine[] = [];
  seriesF9D1(f9); seriesF9D2(f9);
  const rejeu = casDuRejeu();
  memo = [...f8, ...f9, ...rejeu];
  return memo;
}


/**
 * Les 67 cas de la section D du plan F3 et F4 (chaîne sandbox, écran et écriture) : D1 cases décochées (17), D2 cartes de question (24),
 * D3 affichage de tous les codes (6), D4 doublon du moteur (4), D5 écriture (11), D6 états (5).
 *
 * Un cas part d'un cas du kit (`packages/kit/tests/stress/f3-composant/`) ou d'une fusion de plusieurs, passe par `lancerLaChaine`, puis
 * rend un verdict : `comparer` pour D4 (le doublon se juge sur les constats émis) et D6-1, un contrôle d'écran explicite pour les autres.
 * L'oracle de l'écran vient des réponses Q-03, Q-09 et Q-11 de l'inventaire ; le code actuel ne les tient pas, et un écart est le résultat.
 *
 * La fusion (`fusionner`) pose les dégradations de plusieurs cas du kit sur une même copie de P0, pourvu qu'elles ne touchent pas le même
 * layer ni la même variable. Les variables qu'un cas crée reçoivent une clé et un identifiant propres, car chaque cas numérote les siennes
 * à partir de `kz00001`.
 */
import type { CatalogueDeReference, Constat, LayerLu, ReleveDeComposant, VariableDuCatalogue } from '@ucm-kit/core/controles';

import { comparer } from '../../../../kit/tests/stress/commun/comparer';
import type { ConstatAttendu, ResultatDuCas, Verdict } from '../../../../kit/tests/stress/commun/types';
import { type ComposantDeBase } from '../../../../kit/tests/stress/f3-composant/composantDeBase';
import { Degradation, jetonCouleur, liaisonDeCible, operateursAxes, type CasDeComposant } from '../../../../kit/tests/stress/f3-composant/operateursAxes';
import { operateursCibles } from '../../../../kit/tests/stress/f3-composant/operateursCibles';
import { operateursEntrees } from '../../../../kit/tests/stress/f3-composant/operateursEntrees';
import { cleDeConstatEtendue, modeleDuCas, operateursModele } from '../../../../kit/tests/stress/f3-composant/operateursModele';
import { operateursPeinture } from '../../../../kit/tests/stress/f3-composant/operateursPeinture';
import { operateursRoles } from '../../../../kit/tests/stress/f3-composant/operateursRoles';
import { operateursStructure } from '../../../../kit/tests/stress/f3-composant/operateursStructure';
import { operateursTailles } from '../../../../kit/tests/stress/f3-composant/operateursTailles';
import { operateursTheme } from '../../../../kit/tests/stress/f3-composant/operateursTheme';
import { composantDuProfil, PROFIL_P0, PROFILS_DE_BASE } from '../../../../kit/tests/stress/f3-composant/profils';

import { atelierDuComposant } from './atelierDuComposant';
import {
  ajouterLesVerifications, appliquerToutEtLire, cocherAMain, controlerHorsUcm, controlerLAffichage, controlerLAnalysePartielle, controlerLaLisibilite,
  controlerLePied, controlerLesBoutonsDeCochage, controlerLesBoutonsDeQuestion, controlerLesCases, controlerLesCasesDecochees, echouees, jouerIgnorerPuisRendre,
  ecranDuProvisoire, lancerLaChaine, lignesCochables, MOTIF_TOUT_COCHER, MOTIF_TOUT_DECOCHER, texteDe, verification, verifier,
  type Chaine, type Ecran, type EcartDEcran, type ParametresDeChaine, type PointDuMoteur, type Verification,
} from './chaine';

export interface CasDeChaine {
  readonly id: string;
  readonly famille: 'F3';
  readonly operateur: 'D1' | 'D2' | 'D3' | 'D4' | 'D5' | 'D6';
  /** La propriété du plan que le cas juge. */
  readonly propriete: string;
  readonly verdict: Verdict;
  readonly question?: string;
  readonly description: string;
  executer(): Promise<ResultatDeChaine>;
}

export interface ResultatDeChaine extends ResultatDuCas {
  readonly propriete: string;
  readonly description: string;
  /** Les écarts de l'écran et de l'écriture : ils ne passent pas par `comparer`. */
  readonly ecran: readonly EcartDEcran[];
  /** Les vérifications de l'écran, tenues ou non. */
  readonly verifiees: number;
  readonly notes: readonly string[];
}

// ---------------------------------------------------------------------------------------------------------------------------
// Les cas du kit

interface NoyauDuKit { readonly base: ComposantDeBase; readonly cas: readonly CasDeComposant[] }
let noyau: NoyauDuKit | null = null;

/** P0 et tous les cas du kit sur P0, calculés une fois. Le harnais ne les modifie jamais : `lancerLaChaine` copie le composant. */
export function noyauDuKit(): NoyauDuKit {
  if (!noyau) {
    const base = composantDuProfil(PROFIL_P0);
    noyau = {
      base,
      cas: [
        ...operateursAxes(base), ...operateursRoles(base), ...operateursCibles(base), ...operateursModele(base), ...operateursPeinture(base),
        ...operateursTheme(base), ...operateursStructure(base), ...operateursTailles(base), ...operateursEntrees(base),
      ],
    };
  }
  return noyau;
}

type Filtre = (cas: CasDeComposant) => boolean;
const avec = (operateur: string, code: string, forme: ConstatAttendu['forme'], plus: Filtre = () => true): Filtre => (cas) =>
  cas.operateur === operateur && cas.verdict === 'attendu' && cas.attendus.some((attendu) => attendu.code === code && attendu.forme === forme) && plus(cas);

function cas(filtre: Filtre, rang = 0): CasDeComposant {
  const trouves = noyauDuKit().cas.filter(filtre);
  if (!trouves[rang]) throw new Error('Aucun cas du kit ne correspond au filtre');
  return trouves[rang];
}

const parametresDe = (composant: ComposantDeBase | { releve: ReleveDeComposant; catalogue: CatalogueDeReference }, plus: Partial<ParametresDeChaine> = {}): ParametresDeChaine =>
  ({ releve: composant.releve as unknown as ReleveDeComposant, catalogue: composant.catalogue as unknown as CatalogueDeReference, ...plus });

/** Lance la chaîne sur un cas du kit ; un cas de propagation demande aussi le modèle. */
async function monter(source: CasDeComposant, plus: Partial<ParametresDeChaine> = {}): Promise<Chaine> {
  const chaine = await lancerLaChaine(parametresDe(source.entree.composant, plus));
  const modele = modeleDuCas(source);
  if (modele) await chaine.servirDeModele(modele);
  return chaine;
}

// ---------------------------------------------------------------------------------------------------------------------------
// La fusion de plusieurs dégradations

export interface Fusion {
  readonly composant: { readonly releve: ReleveDeComposant; readonly catalogue: CatalogueDeReference };
  readonly retenus: readonly CasDeComposant[];
  readonly attendus: readonly ConstatAttendu[];
  readonly ecartes: readonly string[];
}

const empreinte = (valeur: unknown): string => JSON.stringify(valeur);
let numeroDeVariable = 0;

/**
 * Pose sur une copie de la base les dégradations des candidats, dans l'ordre, et ignore celles qui touchent un layer ou une variable
 * déjà touchés. Les attendus des cas retenus perdent la clé de leur cible : les variables créées sont renumérotées.
 */
export function fusionner(base: ComposantDeBase, candidats: readonly CasDeComposant[]): Fusion {
  const releve = structuredClone(base.releve) as unknown as ReleveDeComposant;
  const catalogue = structuredClone(base.catalogue) as unknown as CatalogueDeReference;
  const layersTouches = new Set<string>();
  const variablesTouchees = new Set<string>();
  const baseVariables = new Map(base.catalogue.variables.map((variable) => [variable.cle, variable]));
  const retenus: CasDeComposant[] = [];
  const attendus: ConstatAttendu[] = [];
  const ecartes: string[] = [];

  for (const candidat of candidats) {
    const degrade = candidat.entree.composant;
    const changes: Array<{ variant: string; layer: LayerLu; retire: boolean }> = [];
    for (const variant of degrade.releve.variants) {
      const origine = base.releve.variants.find((entree) => entree.id === variant.id);
      for (const layer of variant.layers) {
        const avant = origine?.layers.find((entree) => entree.id === layer.id);
        if (!avant || empreinte(avant) !== empreinte(layer)) changes.push({ variant: variant.id, layer: layer as unknown as LayerLu, retire: false });
      }
      for (const avant of origine?.layers ?? []) if (!variant.layers.some((entree) => entree.id === avant.id)) changes.push({ variant: variant.id, layer: avant as unknown as LayerLu, retire: true });
    }
    const nouvelles = degrade.catalogue.variables.filter((variable) => !baseVariables.has(variable.cle));
    const modifiees = degrade.catalogue.variables.filter((variable) => baseVariables.has(variable.cle) && empreinte(variable) !== empreinte(baseVariables.get(variable.cle)));
    const cles = changes.map(({ variant, layer }) => `${variant}|${layer.id}`);
    if (changes.length === 0 || cles.some((cle) => layersTouches.has(cle)) || modifiees.some((variable) => variablesTouchees.has(variable.cle))) {
      ecartes.push(candidat.id);
      continue;
    }
    // Les variables créées par ce cas : clé et identifiant propres au composite.
    const nouvellesCles = new Map<string, { cle: string; id: string }>();
    for (const variable of nouvelles) {
      numeroDeVariable += 1;
      nouvellesCles.set(variable.cle, { cle: `${variable.cle}~${numeroDeVariable}`, id: `VariableID:${900000 + numeroDeVariable}:0` });
    }
    const renumeroter = (variable: VariableDuCatalogue): VariableDuCatalogue => {
      const copie = structuredClone(variable);
      const propre = nouvellesCles.get(copie.cle);
      if (propre) copie.cle = propre.cle;
      for (const mode of Object.keys(copie.valeurs ?? {})) {
        const valeur = copie.valeurs![mode];
        if ('alias' in valeur && nouvellesCles.has(valeur.alias)) copie.valeurs![mode] = { alias: nouvellesCles.get(valeur.alias)!.cle };
      }
      return copie;
    };
    for (const variable of modifiees) {
      const rang = catalogue.variables.findIndex((entree) => entree.cle === variable.cle);
      catalogue.variables[rang] = renumeroter(variable as unknown as VariableDuCatalogue);
      variablesTouchees.add(variable.cle);
    }
    for (const variable of nouvelles) catalogue.variables.push(renumeroter(variable as unknown as VariableDuCatalogue));
    for (const { variant, layer, retire } of changes) {
      const cible = releve.variants.find((entree) => entree.id === variant)!;
      const rang = cible.layers.findIndex((entree) => entree.id === layer.id);
      if (retire) {
        if (rang >= 0) cible.layers.splice(rang, 1);
        layersTouches.add(`${variant}|${layer.id}`);
        continue;
      }
      const copie = structuredClone(layer);
      for (const liaison of [...copie.liaisons, ...(copie.texte?.plages.flatMap((plage) => plage.liaisons) ?? [])]) {
        const propre = nouvellesCles.get(liaison.variable.cle);
        if (propre) liaison.variable = { ...liaison.variable, cle: propre.cle, id: propre.id };
      }
      if (rang >= 0) cible.layers[rang] = copie; else cible.layers.push(copie);
      layersTouches.add(`${variant}|${layer.id}`);
    }
    retenus.push(candidat);
    attendus.push(...candidat.attendus.map((attendu) => (attendu.apres ? { ...attendu, apres: { nom: attendu.apres.nom } } : attendu)));
  }
  return { composant: { releve, catalogue }, retenus, attendus, ecartes };
}

/** Les cas qui font les codes de la portée, un par sorte de constat, dans l'ordre où la fusion les essaie. */
function candidatsDeLaFusion(): CasDeComposant[] {
  const tous = noyauDuKit().cas;
  const decrit = (mot: string): Filtre => (c) => c.entree.description.includes(mot);
  const choix: Filtre[] = [
    // Les C29 en premier : un second élément du panneau porte des corrections, que les boutons « Tout cocher » de D1 jugent.
    avec('Z1', 'C29', 'correction', decrit('paddingLeft')), avec('Z1', 'C29', 'correction', decrit('cornerRadius')),
    avec('M2', 'C81', 'a-faire', decrit('plages de texte')), avec('M1', 'C21', 'a-faire'),
    avec('L1', 'C16', 'question'), avec('L1', 'C16', 'correction'), avec('L2', 'C22', 'correction'), avec('L2', 'C22', 'question', (c) => c.attendus[0].candidats?.length === 2),
    avec('R1', 'C24', 'correction'), avec('R2', 'C24', 'question'),
    avec('K1', 'C19', 'a-faire'), avec('K2', 'C80', 'a-faire'), avec('K3', 'C20', 'a-faire'), avec('K4', 'C18', 'a-faire'),
    avec('U1', 'C25', 'correction'), avec('U4', 'C25', 'question'),
    avec('Z2', 'C29', 'question'), avec('Z4', 'C29', 'question'),
    (c) => c.operateur === 'T1' && c.attendus.some((a) => a.code === 'C59' && a.forme === 'correction'),
    avec('S1', 'C63', 'question'), avec('S2', 'C63', 'correction'), avec('S2', 'C63', 'question'),
  ];
  return choix.flatMap((filtre) => tous.filter(filtre).slice(0, 4));
}

let compositeMemorise: Fusion | null = null;

/** Le composite qui porte toutes les sortes de constat : une fusion, calculée une fois. */
export function composite(): Fusion {
  if (!compositeMemorise) {
    // Une fusion garde le premier cas de chaque sorte qui ne heurte pas les précédents : les candidats d'une sorte se suivent.
    const retenus: CasDeComposant[] = [];
    let derniere: Fusion | null = null;
    for (const candidat of candidatsDeLaFusion()) {
      const essai = fusionner(noyauDuKit().base, [...retenus, candidat]);
      if (essai.retenus.length === retenus.length + 1) {
        retenus.push(candidat);
        derniere = essai;
      }
    }
    compositeMemorise = derniere ?? fusionner(noyauDuKit().base, []);
  }
  return compositeMemorise;
}

// ---------------------------------------------------------------------------------------------------------------------------
// Les résultats

function resultat(cas: CasDeChaine, v: Verification, extra: { comparaison?: ResultatDuCas; notes?: readonly string[] } = {}): ResultatDeChaine {
  const ecarts = extra.comparaison?.ecarts ?? [];
  return {
    cas: cas.id, famille: cas.famille, operateur: cas.operateur, verdict: cas.verdict,
    attendus: (extra.comparaison?.attendus ?? 0) + v.verifiees,
    detectes: (extra.comparaison?.detectes ?? 0) + v.verifiees - echouees(v),
    ecarts, propriete: cas.propriete, description: cas.description, ecran: v.ecarts, verifiees: v.verifiees, notes: extra.notes ?? [],
  };
}

const definir = (
  id: string, operateur: CasDeChaine['operateur'], propriete: string, description: string, executer: (cas: CasDeChaine) => Promise<ResultatDeChaine>,
  verdict: Verdict = 'attendu', question?: string,
): CasDeChaine => {
  const definition: CasDeChaine = { id, famille: 'F3', operateur, propriete, verdict, ...(question ? { question } : {}), description, executer: () => executer(definition) };
  return definition;
};

const corrections = (ecran: Ecran) => ecran.modele().elements.flatMap((element) => [...(element.preparee ? [element.preparee] : []), ...element.corrections]);

// ---------------------------------------------------------------------------------------------------------------------------
// D1. Cases décochées

interface SorteDeCarte { readonly nom: string; readonly cle: string; readonly code: string; readonly source: () => CasDeComposant }

const SORTES_DE_CARTE: readonly SorteDeCarte[] = [
  { nom: 'jetons (C16)', cle: 'jetons:', code: 'C16', source: () => cas(avec('L1', 'C16', 'correction')) },
  { nom: 'rôle (C24)', cle: 'jetons:', code: 'C24', source: () => cas(avec('R1', 'C24', 'correction')) },
  { nom: 'lier (C25)', cle: 'lier:', code: 'C25', source: () => cas(avec('U1', 'C25', 'correction')) },
  { nom: 'tailles (C29)', cle: 'tailles:', code: 'C29', source: () => cas(avec('Z1', 'C29', 'correction')) },
  { nom: 'texte (C59)', cle: 'texte:', code: 'C59', source: () => cas((c) => c.operateur === 'T1' && c.attendus.some((a) => a.code === 'C59' && a.forme === 'correction')) },
  { nom: 'modèle (C24)', cle: 'modele:', code: 'C24', source: () => cas((c) => c.operateur === 'M2' && modeleDuCas(c) !== undefined && c.attendus.some((a) => a.code === 'C24' && a.forme === 'correction')) },
];

/** La carte de cette sorte est à l'écran. */
function carteDeLaSorte(ecran: Ecran, sorte: SorteDeCarte): Verification {
  const v = verification();
  ecran.ouvrirToutes();
  verifier(v, corrections(ecran).some((carte) => carte.cle.startsWith(sorte.cle) && carte.constats.some((constat) => constat.code === sorte.code)),
    { propriete: 'P11', sorte: 'non-affiche', detail: `aucune carte ${sorte.nom} à l'écran` });
  return v;
}

function casDeLaSorte(rang: number, apresCocheManuelle: boolean): CasDeChaine {
  const sorte = SORTES_DE_CARTE[rang];
  const n = (apresCocheManuelle ? 7 : 1) + rang;
  const quand = apresCocheManuelle ? 'à la relecture après une coche à la main' : 'au premier affichage';
  return definir(`D1-${n}`, 'D1', 'P11', `Carte ${sorte.nom} ${quand}`, async (definition) => {
    const source = sorte.source();
    const chaine = await monter(source);
    const v = carteDeLaSorte(chaine.ecran, sorte);
    // Sans carte de cette sorte, il n'y a ni case ni pied à juger : l'écart est déjà celui de l'affichage de la carte.
    if (v.ecarts.length > 0) return resultat(definition, v);
    if (apresCocheManuelle) {
      chaine.ecran.ouvrirToutes();
      cocherAMain(chaine.ecran);
      await chaine.relancer();
      // Une relecture efface la proposition du modèle : le designer la redemande, comme dans la vue Composant.
      const modele = modeleDuCas(source);
      if (modele) await chaine.servirDeModele(modele);
    }
    ajouterLesVerifications(v, controlerLesCasesDecochees(chaine.ecran, quand));
    return resultat(definition, v);
  });
}

/** Met toutes les cases de lignes dans cet état, par des clics. */
function poserLesCases(ecran: Ecran, etat: boolean, racine = ecran.racine): void {
  for (const ligne of ecran.casesDeLignes(racine)) if (ligne.checked !== etat) ligne.clic();
}

const composantDuComposite = () => ({ releve: composite().composant.releve, catalogue: composite().composant.catalogue });

/** D1 : un bouton « Tout cocher » ou « Tout décocher » d'une section ou du panneau. S'il manque, c'est le résultat ; sinon le clic doit agir. */
function casDuBouton(n: number, portee: 'section' | 'panneau', sens: 'cocher' | 'decocher'): CasDeChaine {
  const motif = sens === 'cocher' ? MOTIF_TOUT_COCHER : MOTIF_TOUT_DECOCHER;
  const nom = sens === 'cocher' ? 'Tout cocher' : 'Tout décocher';
  return definir(`D1-${n}`, 'D1', 'P11', `« ${nom} » du ${portee === 'section' ? 'une section' : 'panneau'}`, async (definition) => {
    const chaine = await lancerLaChaine(parametresDe(composantDuComposite()));
    const { ecran } = chaine;
    ecran.ouvrirToutes();
    const v = verification();
    const sections = ecran.sections().filter((section) => ecran.cartesDeCorrections(section).length > 0);
    verifier(v, sections.length >= 2, { propriete: 'P11', sorte: 'non-affiche', detail: `le composite n'a que ${sections.length} section(s) de corrections` });
    const horsSection = ecran.boutons(motif).filter((bouton) => !ecran.sections().some((section) => section.contains(bouton)));
    const boutons = portee === 'section' ? (sections[0] ? ecran.boutons(motif, sections[0]) : []) : horsSection;
    verifier(v, boutons.length > 0, { propriete: 'P11', sorte: 'bouton-manquant', detail: portee === 'section' ? `la section ${sections[0]?.dataset.element ?? '-'} n'a pas « ${nom} »` : `le panneau n'a pas « ${nom} »` });
    if (boutons.length > 0) {
      poserLesCases(ecran, sens === 'decocher');
      boutons[0].clic();
      const cible = portee === 'section' ? ecran.casesDeLignes(sections[0]) : ecran.casesDeLignes();
      verifier(v, cible.every((ligne) => ligne.checked === (sens === 'cocher')), { propriete: 'P11', sorte: 'geste-sans-effet', detail: `« ${nom} » ne ${sens === 'cocher' ? 'coche' : 'décoche'} pas toutes ses lignes` });
      if (portee === 'section') {
        const autres = ecran.casesDeLignes().filter((ligne) => !cible.includes(ligne));
        verifier(v, autres.every((ligne) => ligne.checked === (sens === 'decocher')), { propriete: 'P11', sorte: 'geste-sans-effet', detail: `« ${nom} » d'une section change les lignes des autres sections` });
      }
    }
    return resultat(definition, v);
  });
}

function casDuPied(): CasDeChaine {
  return definir('D1-17', 'D1', 'P11', 'Pied « Aucune correction cochée » et Appliquer inactif au premier affichage', async (definition) => {
    const chaine = await lancerLaChaine(parametresDe(composantDuComposite()));
    chaine.ecran.ouvrirToutes();
    return resultat(definition, controlerLePied(chaine.ecran, 'premier affichage'));
  });
}

// ---------------------------------------------------------------------------------------------------------------------------
// D2. Cartes de question

interface SorteDeQuestion { readonly nom: string; readonly source: () => CasDeComposant }

const SORTES_DE_QUESTION: readonly SorteDeQuestion[] = [
  { nom: 'C16 hover', source: () => cas(avec('L1', 'C16', 'question')) },
  { nom: 'C22 à plusieurs candidats', source: () => cas(avec('L2', 'C22', 'question', (c) => (c.attendus[0].candidats?.length ?? 0) >= 2)) },
  { nom: 'C25', source: () => cas(avec('U4', 'C25', 'question')) },
  { nom: 'C29 proche', source: () => cas(avec('Z2', 'C29', 'question')) },
  { nom: 'C29 à plusieurs exacts', source: () => cas(avec('Z4', 'C29', 'question')) },
  { nom: 'C24 de propagation', source: () => cas((c) => c.operateur === 'M2' && modeleDuCas(c) !== undefined && c.verdict === 'attendu' && c.attendus.some((a) => a.code === 'C24' && a.forme === 'question' && (a.candidats?.length ?? 0) >= 2)) },
  { nom: 'C63 vide', source: () => cas(avec('S1', 'C63', 'question')) },
  { nom: 'C63 theme', source: () => cas(avec('S2', 'C63', 'question', (c) => (c.attendus[0].candidats?.length ?? 0) >= 2)) },
];

const FACETTES = ['carte lisible', 'Ignorer', '« Ne plus proposer »'] as const;

function casDeQuestion(n: number): CasDeChaine {
  const sorte = SORTES_DE_QUESTION[Math.floor((n - 1) / 3)];
  const facette = (n - 1) % 3;
  return definir(`D2-${n}`, 'D2', facette === 0 ? 'P15' : 'P13', `Question ${sorte.nom} : ${FACETTES[facette]}`, async (definition) => {
    const source = sorte.source();
    const chaine = await monter(source);
    const { ecran } = chaine;
    ecran.ouvrirToutes();
    const v = verification();
    const questions = ecran.cartesDeQuestions();
    verifier(v, questions.length > 0, { propriete: facette === 0 ? 'P15' : 'P13', sorte: 'non-affiche', detail: `aucune carte de question pour ${sorte.nom} (${source.id})` });
    if (questions.length === 0) return resultat(definition, v, { notes: [`source ${source.id}`] });
    if (facette === 0) {
      ajouterLesVerifications(v, controlerLaLisibilite(chaine));
    } else {
      ajouterLesVerifications(v, controlerLesBoutonsDeQuestion(ecran, facette === 1 ? 'ignorer' : 'ne-plus-proposer'));
      // Quand le bouton existe, le geste doit ranger le constat sous Ignorés, ou retirer la proposition sans toucher à l'À faire.
      const constat = ecran.modele().elements.flatMap((element) => element.questions).map((groupe) => groupe.carte.constat)[0];
      const carte = questions[0];
      if (constat && carte && facette === 1 && ecran.boutons(/^Ignorer$/, carte).length > 0) ajouterLesVerifications(v, jouerIgnorerPuisRendre(chaine, carte, constat));
      if (constat && carte && facette === 2 && ecran.boutons(/^Ne plus proposer/, carte).length > 0) {
        ecran.boutons(/^Ne plus proposer/, carte)[0].clic();
        verifier(v, ecran.envois.propositionsIgnorees.includes(constat.id), { propriete: 'P13', sorte: 'geste-sans-effet', detail: `« Ne plus proposer » n'envoie pas le constat ${constat.id}` });
      }
    }
    return resultat(definition, v, { notes: [`source ${source.id}`] });
  });
}

// ---------------------------------------------------------------------------------------------------------------------------
// D3. Affichage de tous les codes

async function lancerLeComposite(plus: Partial<ParametresDeChaine> = {}): Promise<Chaine> {
  return lancerLaChaine(parametresDe(composantDuComposite(), plus));
}

function notesDuComposite(chaine: Chaine): string[] {
  const attendus = [...new Set(composite().attendus.map((attendu) => attendu.code))].sort();
  const emis = new Set(chaine.final().constats.map((constat) => constat.code));
  const absents = attendus.filter((code) => !emis.has(code));
  return [`composite : ${composite().retenus.length} cas fusionnés (${composite().retenus.map((c) => c.id).join(' ')})`, `codes attendus ${attendus.join(' ')}`, ...(absents.length > 0 ? [`codes absents des constats émis : ${absents.join(' ')}`] : [])];
}

function casDeLAffichage(n: number): CasDeChaine {
  const descriptions = [
    'Composite qui porte tous les codes de la portée', 'Composite avec deux constats ignorés', 'Composite avec une question répondue',
    'Composite avec une analyse périmée', 'Composite au résultat provisoire', 'Composite avec un constat info',
  ];
  return definir(`D3-${n}`, 'D3', 'P14', descriptions[n - 1], async (definition) => {
    const chaine = await lancerLeComposite();
    const { ecran } = chaine;
    const v = verification();
    if (n === 2) {
      const aIgnorer = chaine.final().constats.filter((constat) => constat.type !== 'info' && constat.correction === undefined && constat.question === undefined && ['C80', 'C19', 'C18', 'C20'].includes(constat.code)).slice(0, 2);
      chaine.ignorer(aIgnorer.map(({ id }) => id));
      ecran.ouvrirToutes();
      verifier(v, aIgnorer.length === 2, { propriete: 'P14', sorte: 'non-affiche', detail: 'le composite n\'a pas deux constats à ignorer' });
      verifier(v, ecran.boutons(/^Ne plus ignorer/).length === aIgnorer.length, { propriete: 'P14', sorte: 'non-affiche', detail: `${ecran.boutons(/^Ne plus ignorer/).length} constats sous Ignorés, attendu ${aIgnorer.length}` });
      verifier(v, aIgnorer.every((constat) => !ecran.analyse.constats.some((visible) => visible.id === constat.id)), { propriete: 'P14', sorte: 'affiche-deux-fois', detail: 'un constat ignoré reste visible' });
    }
    if (n === 3) {
      const question = chaine.final().constats.find((constat) => constat.question && constat.question.candidats.length > 0 && !constat.correction);
      verifier(v, question !== undefined, { propriete: 'P14', sorte: 'non-affiche', detail: 'le composite n\'a aucune question à répondre' });
      if (question?.question) {
        const candidat = question.question.candidats[0];
        await chaine.repondre(question.question.id, candidat.cle ?? candidat.nom);
        ecran.ouvrirToutes();
        verifier(v, ecran.analyse.repondues[question.question.id] !== undefined, { propriete: 'P14', sorte: 'non-affiche', detail: `la réponse à ${question.question.id} n'arrive pas à l'écran` });
        verifier(v, ecran.boutons(/^Annuler la réponse/).length >= 1, { propriete: 'P14', sorte: 'bouton-manquant', detail: 'la ligne de réponse n\'a pas « Annuler la réponse »' });
      }
    }
    if (n === 4) chaine.perimer();
    let cible = ecran;
    if (n === 5) {
      // Le provisoire seul : une interface neuve qui ne reçoit que les messages d'avant le résultat final.
      cible = ecranDuProvisoire(chaine);
    }
    cible.ouvrirToutes();
    ajouterLesVerifications(v, controlerLAffichage(cible));
    if (n !== 4 && n !== 5) ajouterLesVerifications(v, controlerLaLisibilite(chaine));
    if (n === 6) {
      const informations = ecran.modele().informations;
      verifier(v, informations.length > 0, { propriete: 'P14', sorte: 'non-affiche', detail: 'le composite n\'a aucun constat info' });
      const bande = ecran.racine.querySelectorAll('.bande-element').find((candidate) => candidate.getAttribute('aria-label')?.includes('Informations'));
      bande?.clic();
      verifier(v, ecran.racine.querySelectorAll('.info-ligne').length === informations.length, { propriete: 'P14', sorte: 'non-affiche', detail: `${ecran.racine.querySelectorAll('.info-ligne').length} lignes d'information dessinées, ${informations.length} attendues` });
    }
    return resultat(definition, v, { notes: notesDuComposite(chaine) });
  });
}

// ---------------------------------------------------------------------------------------------------------------------------
// D4. Doublon du moteur

function pointDuMoteur(chaine: Chaine, layer: string, champ: string): PointDuMoteur {
  const nom = chaine.releve.variants.flatMap((variant) => variant.layers).find((entree) => entree.id === layer)?.nom ?? layer;
  return {
    point: { famille: 'variables', titre: `${nom} : ${champ} sans variable associée.`, impact: 'La valeur ne suit pas le thème.', action: 'Lier une variable.', calque: nom },
    noeuds: [layer],
  };
}

function casDuDoublon(n: number): CasDeChaine {
  const sources: Array<{ nom: string; filtre: Filtre }> = [
    { nom: 'C25 sur un fond', filtre: avec('U1', 'C25', 'correction', (c) => c.entree.description.includes('fond de Root')) },
    { nom: 'C25 sur une plage de texte', filtre: avec('U1', 'C25', 'correction', (c) => c.entree.description.includes('plage')) },
    { nom: 'C29 sur une marge', filtre: avec('Z1', 'C29', 'correction', (c) => c.entree.description.includes('paddingLeft')) },
    { nom: 'C29 sur un rayon', filtre: avec('Z1', 'C29', 'correction', (c) => c.entree.description.includes('cornerRadius')) },
  ];
  const { nom, filtre } = sources[n - 1];
  return definir(`D4-${n}`, 'D4', 'P12', `${nom} avec le point C30 du moteur sur le même layer et le même champ`, async (definition) => {
    const source = cas(filtre);
    const kit = source.attendus[0];
    const [, layer] = kit.cle.split('|');
    const champ = kit.cle.split('|')[2] || 'fills';
    const lecture = await lancerLaChaine(parametresDe(source.entree.composant));
    const moteur = pointDuMoteur(lecture, layer, champ);
    const chaine = await lancerLaChaine(parametresDe(source.entree.composant, { moteur: { points: [moteur] } }));
    const comparaison = comparer({ ...source, id: definition.id, famille: 'F3', operateur: 'D4', verdict: 'attendu', codesJuges: ['C25', 'C29', 'C30'] }, chaine.final().constats as unknown as Constat[], cleDeConstatEtendue as never);
    const v = verification();
    const surLeLayer = chaine.final().constats.filter((constat) => constat.layers.includes(layer) && ['C25', 'C29', 'C30'].includes(constat.code));
    verifier(v, surLeLayer.length === 1, { propriete: 'P12', sorte: 'affiche-deux-fois', detail: `${surLeLayer.length} constats (${surLeLayer.map(({ code }) => code).join(' ')}) sur le layer ${layer}, attendu 1 : celui du kit` });
    const cartes = chaine.ecran.modele().elements.reduce((somme, element) => somme + element.corrections.filter((carte) => carte.constats.some((constat) => constat.layers.includes(layer))).length
      + element.questions.filter((groupe) => groupe.cartes.some((carte) => carte.constat.layers.includes(layer))).length
      + element.aFaire.filter((carte) => carte.constat.layers.includes(layer) && ['C25', 'C29', 'C30'].includes(carte.constat.code)).length, 0);
    verifier(v, cartes === 1, { propriete: 'P12', sorte: 'affiche-deux-fois', detail: `${cartes} cartes à l'écran pour le layer ${layer}, attendu 1` });
    return resultat(definition, v, { comparaison, notes: [`source ${source.id}, layer ${layer}, champ ${champ}`] });
  });
}

// ---------------------------------------------------------------------------------------------------------------------------
// D5. Écriture

type Mutation = (atelier: ReturnType<typeof atelierDuComposant>, correction: { cible: Parameters<ReturnType<typeof atelierDuComposant>['delier']>[0]; apres: { cle?: string } }, chaine: Chaine) => void;

interface CasDEcriture {
  readonly nom: string;
  readonly source: () => CasDeComposant | { composant: { releve: ReleveDeComposant; catalogue: CatalogueDeReference } };
  readonly code: string;
  readonly mutation?: Mutation;
  readonly motif?: 'objet-change' | 'fait-faux' | 'cible-introuvable';
}

function sourceDEcriture(source: ReturnType<CasDEcriture['source']>) {
  return 'entree' in source ? source.entree.composant : source.composant;
}

function casDEcriture(n: number, description: CasDEcriture, verdict: Verdict = 'attendu', question?: string): CasDeChaine {
  return definir(`D5-${n}`, 'D5', 'P16', description.nom, async (definition) => {
    const source = description.source();
    const chaine = await lancerLaChaine(parametresDe(sourceDEcriture(source)));
    const atelier = atelierDuComposant(chaine.releve, chaine.catalogue);
    const cible = chaine.final().constats.find((constat) => constat.code === description.code && constat.correction);
    const v = verification();
    verifier(v, cible !== undefined, { propriete: 'P16', sorte: 'non-affiche', detail: `aucun constat ${description.code} avec correction à écrire` });
    // Sans correction à écrire, Appliquer tout n'a rien à envoyer : l'écart est celui du constat absent.
    if (!cible?.correction) return resultat(definition, v);
    if (cible?.correction && description.mutation) description.mutation(atelier, cible.correction, chaine);
    const { v: ecriture, ecrites, sautees, envoyees } = await appliquerToutEtLire(chaine, atelier);
    ajouterLesVerifications(v, ecriture);
    if (cible?.correction) {
      const id = cible.correction.id;
      if (description.motif) {
        const saute = sautees.find((entree) => entree.id === id);
        verifier(v, saute?.motif === description.motif, { propriete: 'P16', sorte: 'non-ecrite', detail: `la correction ${id} devait être sautée (${description.motif}) : ${saute ? saute.motif : ecrites.includes(id) ? 'écrite' : envoyees.includes(id) ? 'non rendue' : 'jamais envoyée'}` });
      } else {
        verifier(v, ecrites.includes(id), { propriete: 'P16', sorte: 'non-ecrite', detail: `la correction ${description.code} ${id} (${cible.correction.sorte}) n'est pas écrite : ${sautees.find((entree) => entree.id === id)?.motif ?? (envoyees.includes(id) ? 'rien' : 'jamais envoyée')}` });
      }
    }
    const journal = `journal de l'atelier : ${atelier.journal.length} appels, ${ecrites.length} lignes écrites, ${sautees.length} sautées${sautees.length > 0 ? ` (${sautees.map((entree) => `${entree.id} ${entree.motif}`).join(' ; ')})` : ''}`;
    return resultat(definition, v, { notes: [journal] });
  }, verdict, question);
}

/** Deux corrections visent la même liaison : palette fausse et rôle faux ensemble (P21). */
function casDeLaDoubleCorrection(): CasDeChaine {
  return definir('D5-10', 'D5', 'P21', 'Deux corrections sur la même liaison (palette et rôle faux)', async (definition) => {
    const { base } = noyauDuKit();
    const degradation = new Degradation(base);
    const variant = base.carte.variants[0];
    const liaison = liaisonDeCible(base.carte, variant.id, 'fond')!;
    const mauvais = jetonCouleur(base.carte, variant, 'foreground', { Palette: 'danger' })!;
    degradation.lierA(liaison, degradation.variable(mauvais.cle));
    const chaine = await lancerLaChaine(parametresDe(degradation.composant));
    const atelier = atelierDuComposant(chaine.releve, chaine.catalogue);
    const v = verification();
    const visant = chaine.final().constats.filter((constat) => constat.correction && constat.correction.cible.layer === liaison.layer && constat.correction.cible.champ === liaison.champ);
    verifier(v, visant.length <= 1, { propriete: 'P21', sorte: 'affiche-deux-fois', detail: `${visant.length} corrections (${visant.map(({ code, correction }) => `${code} → ${correction?.apres.nom}`).join(' ; ')}) visent la même liaison` });
    verifier(v, visant.length > 0 || chaine.final().constats.some((constat) => constat.question && constat.layers.includes(liaison.layer)), { propriete: 'P21', sorte: 'non-affiche', detail: 'aucune correction ni question ne répond à la liaison' });
    const { v: ecriture, sautees } = await appliquerToutEtLire(chaine, atelier);
    ajouterLesVerifications(v, ecriture);
    verifier(v, !sautees.some((sautee) => sautee.motif === 'fait-faux'), { propriete: 'P21', sorte: 'non-ecrite', detail: `appliquer les deux corrections saute ${sautees.filter((sautee) => sautee.motif === 'fait-faux').length} ligne(s) en fait-faux` });
    return resultat(definition, v);
  }, 'mesure', 'Q-F3-12');
}

// ---------------------------------------------------------------------------------------------------------------------------
// D6. États

function composantPropre(): { releve: ReleveDeComposant; catalogue: CatalogueDeReference } {
  const profil = PROFILS_DE_BASE.find((candidat) => candidat.forme === 'divider-1' && candidat.scopes === 'larges' && !candidat.imbriques && candidat.plages === 1 && candidat.modesDeTaille === 1)!;
  const base = composantDuProfil(profil);
  return { releve: base.releve as unknown as ReleveDeComposant, catalogue: base.catalogue as unknown as CatalogueDeReference };
}

function casDEtat(n: number): CasDeChaine {
  const descriptions = [
    'Lecture partielle : une peinture mixte sur un texte', 'Moteur partiel avec un relevé complet', 'Fichier déclaré libre et collections sans rôle',
    'Library à choisir', 'Échec de la lecture des ignorés',
  ];
  return definir(`D6-${n}`, 'D6', n === 3 ? 'P19' : 'P18', descriptions[n - 1], async (definition) => {
    const v = verification();
    let comparaison: ResultatDuCas | undefined;
    if (n === 1) {
      const source = cas((c) => c.operateur === 'X1' && c.entree.composant.releve.lecture.manquees.length > 0);
      const chaine = await monter(source);
      ajouterLesVerifications(v, controlerLAnalysePartielle(chaine.ecran, 'partielle'));
      comparaison = comparer({ ...source, id: definition.id, famille: 'F3', operateur: 'D6', verdict: 'attendu' }, chaine.final().constats as unknown as Constat[], cleDeConstatEtendue as never);
    } else if (n === 2) {
      const chaine = await lancerLaChaine({ ...composantPropre(), moteur: { partiel: true } });
      ajouterLesVerifications(v, controlerLAnalysePartielle(chaine.ecran, 'partielle'));
    } else if (n === 3) {
      const fusion = composite();
      const libre = await lancerLaChaine(parametresDe(fusion.composant, { declaration: 'libre' }));
      ajouterLesVerifications(v, controlerHorsUcm(libre, 'fichier déclaré libre'));
      const sansRole = structuredClone(fusion.composant.catalogue);
      for (const collection of sansRole.collections) (collection as { role: unknown }).role = null;
      const chaine = await lancerLaChaine({ releve: fusion.composant.releve, catalogue: sansRole });
      ajouterLesVerifications(v, controlerHorsUcm(chaine, 'collections sans rôle'));
    } else if (n === 4) {
      const chaine = await lancerLaChaine({ ...composantPropre(), reference: { library: null, nom: null, candidates: 2 } });
      const texte = chaine.ecran.texte();
      verifier(v, /Choisissez la library/.test(texte), { propriete: 'P18', sorte: 'accusation', detail: `l'écran ne demande pas de choisir la library : « ${texte.slice(0, 120)} »` });
      verifier(v, chaine.ecran.cartesDeCorrections().length + chaine.ecran.cartesAFaire().length === 0, { propriete: 'P18', sorte: 'accusation', detail: 'des cartes s\'affichent avant le choix de la library' });
    } else {
      const chaine = await lancerLaChaine({ ...composantPropre(), ignores: 'echec' });
      ajouterLesVerifications(v, controlerLAnalysePartielle(chaine.ecran, 'partielle'));
    }
    return resultat(definition, v, { ...(comparaison ? { comparaison } : {}) });
  });
}

// ---------------------------------------------------------------------------------------------------------------------------
// Les 67 cas

export function casDeLaChaine(): CasDeChaine[] {
  const liste: CasDeChaine[] = [];
  for (let rang = 0; rang < 6; rang++) liste.push(casDeLaSorte(rang, false));
  for (let rang = 0; rang < 6; rang++) liste.push(casDeLaSorte(rang, true));
  liste.push(casDuBouton(13, 'section', 'cocher'), casDuBouton(14, 'section', 'decocher'), casDuBouton(15, 'panneau', 'cocher'), casDuBouton(16, 'panneau', 'decocher'), casDuPied());
  for (let n = 1; n <= 24; n++) liste.push(casDeQuestion(n));
  for (let n = 1; n <= 6; n++) liste.push(casDeLAffichage(n));
  for (let n = 1; n <= 4; n++) liste.push(casDuDoublon(n));
  const ecritures: CasDEcriture[] = [
    { nom: 'Écriture du fond (C25)', source: () => cas(avec('U1', 'C25', 'correction', (c) => c.entree.description.includes('fond de Root'))), code: 'C25' },
    { nom: 'Écriture du trait (C25)', source: () => cas(avec('U1', 'C25', 'correction', (c) => c.entree.description.includes('trait de Root'))), code: 'C25' },
    { nom: 'Écriture d\'une plage de texte (C16)', source: () => cas(avec('L1', 'C16', 'correction', (c) => c.entree.description.includes('Label'))), code: 'C16' },
    { nom: 'Écriture d\'un champ numérique : marge (C29)', source: () => cas(avec('Z1', 'C29', 'correction', (c) => c.entree.description.includes('paddingLeft'))), code: 'C29' },
    { nom: 'Écriture d\'un champ numérique : rayon (C29)', source: () => cas(avec('Z1', 'C29', 'correction', (c) => c.entree.description.includes('cornerRadius'))), code: 'C29' },
  ];
  ecritures.forEach((description, rang) => liste.push(casDEcriture(rang + 1, description)));
  liste.push(casDEcriture(6, { nom: 'Écriture de l\'alias de mode (C63)', source: () => cas(avec('S2', 'C63', 'correction')), code: 'C63' }, 'mesure', 'Q-F3-5'));
  liste.push(casDEcriture(7, {
    nom: 'Layer changé entre l\'analyse et l\'écriture (objet-change)', source: () => cas(avec('U1', 'C25', 'correction')), code: 'C25', motif: 'objet-change',
    mutation: (atelier, correction) => atelier.retirerLeLayer(correction.cible.layer!),
  }));
  liste.push(casDEcriture(8, {
    nom: 'Liaison changée entre l\'analyse et l\'écriture (fait-faux)', source: () => cas(avec('U1', 'C25', 'correction')), code: 'C25', motif: 'fait-faux',
    mutation: (atelier, correction, chaine) => atelier.lierAutre(correction.cible, atelier.identifiantDeLaVariable(chaine.catalogue.variables[0].cle)!),
  }));
  liste.push(casDEcriture(9, {
    nom: 'Variable cible absente (cible-introuvable)', source: () => cas(avec('U1', 'C25', 'correction')), code: 'C25', motif: 'cible-introuvable',
    mutation: (atelier, correction) => atelier.retirerLaVariable(correction.apres.cle!),
  }));
  liste.push(casDeLaDoubleCorrection());
  liste.push(casDEcriture(11, {
    nom: 'Variant renommé entre l\'analyse et l\'écriture (objet-change)', source: () => cas(avec('L1', 'C16', 'correction')), code: 'C16', motif: 'objet-change',
    mutation: (atelier, correction, chaine) => {
      const variant = chaine.releve.variants.find((entree) => entree.layers.some((layer) => layer.id === correction.cible.layer));
      if (variant) atelier.renommerLeVariant(variant.id, variant.nom.replace('State=default', 'State=hover'));
    },
  }));
  for (let n = 1; n <= 5; n++) liste.push(casDEtat(n));
  return liste;
}

/** Exécute les cas dans l'ordre : le sandbox garde un état global, les chaînes ne se chevauchent pas. */
export async function executerLaChaine(filtre: (cas: CasDeChaine) => boolean = () => true): Promise<ResultatDeChaine[]> {
  const resultats: ResultatDeChaine[] = [];
  for (const definition of casDeLaChaine().filter(filtre)) resultats.push(await definition.executer());
  return resultats;
}

export { texteDe, lignesCochables, controlerLesBoutonsDeCochage, controlerLesCases };

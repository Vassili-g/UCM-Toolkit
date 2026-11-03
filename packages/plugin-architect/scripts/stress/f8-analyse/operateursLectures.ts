/**
 * Les opérateurs de lectures du stress test F9 (section 3.4 du plan) : lectures refusées et pannes de lecteurs (N, 40 cas), lectures
 * manquées (Lm, 20 cas) et moteur partiel (Mp, 8 cas). Chaque cas monte une `Seance` (`seance.ts`) sur A0 ou sur le profil que le cas
 * nomme, injecte ses pannes aux points de passage des lecteurs, et juge le statut, les constats, la rétention et l'écran.
 *
 * L'oracle suit la table de vérité de la section 2.5 : une part non jugée (relevé coupé ou incomplet, catalogue de repli ou inaccessible,
 * moteur partiel, règles, niveau, ignorés, déclaration refusés) rend `partielle` et l'écran nomme ce qui manque ; les dépendances refusées
 * ne comptent qu'avec la réponse Q-F89-3. Le harnais déduit ce qui a été jugé des pannes qu'il a injectées, jamais du statut rendu.
 */
import { ComponentExportError } from 'ucm-plugin-socle/src/composant/analyse/resultat';
import { AnalyseAnnulee } from 'ucm-plugin-socle/src/composant/contract/porteeDAnalyse';

import { lireLesIgnores } from '../../../src/ecriture/ignores';
import { Registre, type CasF8, type Relation, type SortieDeCas } from './cas';
import type { Plan } from './injecteur';
import { lireLaPage } from './pageDeRegles';
import { DECLARATIONS, moteurDouble, type BancDAnalyse } from './scenarioDeBase';
import {
  ajouterUneSeance, avecLecteurs, jouerSeance, bibliothequesIllisibles, catalogueDuProduit, DECLARATION_ILLISIBLE, degraderLaLecture, DIT, JAMAIS_N_SUR_N, lever, manquees,
  MOTEUR_PARTIEL, moteurAvecCouverture, observationDe, PROFIL_A0_AAA, rendre, sansConstatsDuKit, specConforme, avecCatalogue,
  type Adaptateur, type Attente, type CasDeSeance, type OptionsDeSeance, type Seance,
} from './seance';

const H13 = 'hypothèse 13 de 6.1 (le statut final ignore les lectures refusées ; AAA devient AA sans le dire)';
const H14 = 'hypothèse 14 de 6.1 (moteur partiel « N variants lus sur N » ; le relevé et le moteur coupent à des variants différents)';
const H15 = 'hypothèse 15 de 6.1 (une analyse partielle sans constat montre les sections tenues)';
const H17 = 'hypothèse 17 de 6.1 (une déclaration UCM qui lève donne `architectureUcm` faux en silence)';
const H18 = 'hypothèse 18 de 6.1 (une library illisible ou une collection inaccessible laisse `complete` sans signal)';
const H24 = 'hypothèse 24 de 6.1 (les lecteurs avalent `AnalyseAnnulee` : une annulation compte comme lecture refusée)';

const PAS_AUCUN = /Aucun constat/;

/** Une part refusée : `partielle`, un provisoire, ni C43 ni C45 si ce sont les règles, et un écran qui nomme la part. */
const refusee = (part: keyof typeof DIT, plus: Partial<Attente> = {}): Attente => ({
  statut: 'partielle', provisoires: 1, ecran: { dit: [DIT[part]], nonDit: [PAS_AUCUN] }, ...plus,
});

// ---------------------------------------------------------------------------------------------------------------------------
// N : lectures refusées et pannes de lecteurs

function operateursN(r: Registre): void {
  const n = (operateur: string, cas: CasDeSeance): void => ajouterUneSeance(r, operateur, { relations: ['ordre'], ...cas });
  const plan = (p: Plan | ((s: Seance) => Plan)): OptionsDeSeance => ({ plan: p });
  const annulerPuis = (passage: 'regles' | 'dependances', erreur: unknown) => (s: Seance): Plan => ({
    [passage]: [{ quand: 'avant', action: { action: 'appeler', faire: () => s.annuler('identite') } }, { quand: 'avant', action: { action: 'lever', erreur } }],
  });

  const reglesRefusees = refusee('regles', { sansCodes: ['C43', 'C45'] });
  n('N1', { description: '`regles` lève une `Error`', options: plan(lever('regles')), attente: reglesRefusees, relations: ['ordre', 'casse'], rattachement: H13 });
  n('N1', { description: '`regles` lève une chaîne', options: plan(lever('regles', 'refus')), attente: reglesRefusees, relations: ['ordre', 'casse'], rattachement: H13 });
  n('N1', { description: '`regles` lève `AnalyseAnnulee` sans que le jeton soit levé', options: plan(lever('regles', new AnalyseAnnulee())), attente: reglesRefusees, rattachement: H24 });
  n('N1', { description: '`regles` retourne `undefined`', options: plan(rendre('regles', undefined)), attente: reglesRefusees, rattachement: H13 });
  n('N1', {
    description: '`regles` lève après la levée du jeton', options: plan(annulerPuis('regles', new Error('Figma refuse la lecture'))), attente: { statuts: ['annulee'], provisoires: 1, retenue: false, modeles: 0 },
  });

  const niveauRefuse = refusee('niveau');
  const n2 = (description: string, options: OptionsDeSeance): void =>
    n('N2', {
      description, options: { profil: PROFIL_A0_AAA, ...options }, attente: niveauRefuse, rattachement: H13,
      plus: (sortie) => (observationDe(sortie).niveau === 'AA' ? [] : [`niveau retenu ${String(observationDe(sortie).niveau)}, attendu AA`]),
    });
  n2('`niveau` lève une `Error` avec AAA rangé', plan(lever('niveau')));
  n2('`niveau` rend la valeur invalide « ZZ »', plan(rendre('niveau', 'ZZ')));
  n2('`niveau` lève après la lecture du relevé', {
    adaptateurs: [(_b, lecteurs, s) => ({
      ...lecteurs,
      releve: async (...args) => { const issue = await lecteurs.releve(...args); s.drapeaux.releveLu = true; return issue; },
      niveau: async () => { if (s.drapeaux.releveLu) throw new Error('Figma refuse la lecture du niveau'); return 'AAA'; },
    })],
  });

  const ignoresRefuses = refusee('ignores');
  n('N3', { description: '`ignores` lève une `Error`', options: plan(lever('ignores')), attente: ignoresRefuses, rattachement: H13 });
  n('N3', {
    description: '`getSharedPluginData` lève sous le lecteur réel des ignorés',
    options: { adaptateurs: [(_b, lecteurs, s) => { s.drapeaux.ignoresIllisibles = true; return { ...lecteurs, ignores: async (contexte) => lireLesIgnores(contexte.figma as never) }; }] },
    attente: ignoresRefuses, rattachement: H13,
  });
  n('N3', { description: '`ignores` rend une liste qui n’est pas un tableau', options: plan(rendre('ignores', { cle: 'x' })), attente: ignoresRefuses });

  const dependancesVides = { regles: null, collectionsLocales: [], variablesLocales: [], styles: [], instances: 0, maitres: [], imbriqueesNonLues: 0, calquesDesInstancesDistantes: [] };
  n('N4', { description: '`dependances` lève une `Error`', options: plan(lever('dependances')), attente: { statut: 'complete', provisoires: 1 }, question: 'Q-F89-3' });
  n('N4', {
    description: '`dependances` lève `AnalyseAnnulee` après la levée du jeton', options: plan(annulerPuis('dependances', new AnalyseAnnulee())),
    attente: { statuts: ['annulee'], retenue: false, modeles: 0 },
  });
  n('N4', {
    description: '`dependances` rend `imbriqueesNonLues` non nul', options: { adaptateurs: [avecLecteurs({ dependances: async () => ({ ...dependancesVides, imbriqueesNonLues: 3 }) as never })] },
    attente: { statut: 'complete', provisoires: 1 }, question: 'Q-F89-3',
  });

  n('N5', { description: '`catalogue` lève une `Error`', options: plan(lever('catalogue')), attente: { statuts: ['arretee'], bloquant: true, retenue: false } });
  n('N5', {
    description: 'library illisible : le catalogue du produit se replie sur le fichier', options: { adaptateurs: [catalogueDuProduit], plan: rendre('bibliotheques', bibliothequesIllisibles) },
    attente: refusee('catalogue'), rattachement: H18,
  });
  n('N5', {
    description: 'une collection du catalogue est `inaccessible`', options: { adaptateurs: [avecCatalogue((c) => { c.collections.push({ cle: 'c-x', nom: 'components', role: null, modes: [], etat: 'inaccessible' }); })] },
    attente: refusee('catalogue'), rattachement: H18,
  });

  const n6 = (description: string, options: OptionsDeSeance, attente: Attente, plus: Partial<CasDeSeance> = {}): void =>
    n('N6', { description, options: { adaptateurs: [catalogueDuProduit], ...options }, attente, ...plus });
  n6('`bibliotheques` rejette', { plan: lever('bibliotheques') }, refusee('catalogue'), { question: 'Q-F89-4', rattachement: H18 });
  n6('`bibliotheques` rend une lecture `illisible`', { plan: rendre('bibliotheques', bibliothequesIllisibles) }, refusee('catalogue'), { question: 'Q-F89-4', rattachement: H18 });
  n6('`bibliotheques` se résout après l’annulation', {
    plan: (s) => ({ bibliotheques: [{ quand: 'avant', action: { action: 'appeler', faire: () => s.annuler('identite') } }] }),
    adaptateurs: [catalogueDuProduit, (_b, lecteurs) => ({ ...lecteurs, bibliotheques: async (...args) => { await new Promise((fin) => setTimeout(fin, 15)); return lecteurs.bibliotheques!(...args); } })],
  }, { statuts: ['annulee'], retenue: false, modeles: 0 });

  const lecturesDuMessage = (nombre: number) => (sortie: SortieDeCas): string[] => {
    const lues = observationDe(sortie).final?.lecture?.manquees.length;
    return lues === nombre ? [] : [`le message final porte ${String(lues)} lectures manquées, attendu ${nombre}`];
  };
  n('N7', { description: '`releve` lève', options: plan(lever('releve')), attente: { statuts: ['arretee'], bloquant: true, retenue: false } });
  n('N7', { description: '`releve` rend `sans-sujet`', options: plan(rendre('releve', { statut: 'sans-sujet' })), attente: { statuts: ['arretee'], bloquant: true, retenue: false } });
  n('N7', { description: '`releve` rend `annule`', options: plan(rendre('releve', { statut: 'annule' })), attente: { statuts: ['annulee'], retenue: false } });
  n('N7', { description: '`releve` lu avec une lecture manquée', options: { adaptateurs: [degraderLaLecture({ manquees: manquees(1) })] }, attente: refusee('releve'), plus: lecturesDuMessage(1) });
  n('N7', { description: '`releve` lu avec 100 lectures manquées', options: { adaptateurs: [degraderLaLecture({ manquees: manquees(100) })] }, attente: refusee('releve'), plus: lecturesDuMessage(100) });
  n('N7', {
    description: '`releve` lu avec des variants non lus seuls', options: { adaptateurs: [degraderLaLecture({ variantsNonLus: ['Palette=danger, Style=outline, State=disabled, Size=medium'] })] },
    attente: refusee('budget', { ecran: { dit: [DIT.budget], nonDit: [PAS_AUCUN, JAMAIS_N_SUR_N] } }),
  });

  const arretee = (passage: string): Attente => ({ statuts: ['arretee'], bloquant: true, retenue: false, provisoires: passage === 'moteur' ? 1 : 0 });
  n('N8', { description: '`moteur` lève `ComponentExportError`', options: plan(lever('moteur', new ComponentExportError('Le composant n’est pas exportable'))), attente: arretee('moteur') });
  n('N8', { description: '`moteur` lève une `Error`', options: plan(lever('moteur')), attente: arretee('moteur') });
  n('N8', { description: '`moteur` rend `annulee`', options: plan(rendre('moteur', { etat: 'annulee' })), attente: { statuts: ['annulee'], retenue: false, provisoires: 1 } });
  const sansLectureDeRegles = (sortie: SortieDeCas): string[] => (observationDe(sortie).passages.includes('regles:1') ? ['le lecteur de règles est appelé alors que le moteur est partiel'] : []);
  n('N8', {
    description: '`moteur` rend une couverture `partielle` avec `lus` et `nonLus`', options: { adaptateurs: [MOTEUR_PARTIEL] },
    attente: refusee('moteur', { sansCodes: ['C43', 'C45'], ecran: { dit: [DIT.moteur, DIT.regles], nonDit: [PAS_AUCUN, JAMAIS_N_SUR_N] } }), plus: sansLectureDeRegles, relations: ['ordre', 'casse'], rattachement: H14,
  });
  n('N8', {
    description: '`moteur` rend une couverture `partielle` à `nonLus` `inconnu`', options: { adaptateurs: [avecLecteurs({ moteur: async () => moteurAvecCouverture({ etat: 'partielle', lus: 100, nonLus: 'inconnu' }) })] },
    attente: refusee('moteur', { sansCodes: ['C43', 'C45'], ecran: { dit: [DIT.moteur, DIT.regles], nonDit: [PAS_AUCUN, JAMAIS_N_SUR_N] } }), plus: sansLectureDeRegles, rattachement: H14,
  });
  n('N8', {
    description: '`moteur` rend un résultat sans `rules` : les règles se lisent et l’analyse est complète', options: {}, attente: { statut: 'complete', provisoires: 1 }, relations: ['ordre', 'casse'],
    plus: (sortie) => (observationDe(sortie).passages.includes('regles:1') ? [] : ['le lecteur de règles n’est pas appelé']),
  });

  const aucunComposant = (sortie: SortieDeCas): string[] => {
    const message = String(observationDe(sortie).constats[0]?.faits.message ?? '');
    return /Aucun composant n.est sélectionné/.test(message) ? [] : [`message « ${message} », attendu « Aucun composant n’est sélectionné »`];
  };
  const sansSujet: Attente = { statuts: ['arretee'], bloquant: true, retenue: false, provisoires: 0 };
  n('N9', { description: '`sujet` lève', options: plan(lever('sujet')), attente: sansSujet, plus: aucunComposant });
  n('N9', { description: '`sujet` rend `null`', options: plan(rendre('sujet', null)), attente: sansSujet, plus: aucunComposant });
  n('N9', { description: '`sujet` rend un sujet sans nœud', options: plan(rendre('sujet', { cle: 'Button', noeud: null, noeuds: [] })), attente: sansSujet, plus: aucunComposant, question: 'à trancher' });

  declarationsN11(r);
}

/** Les familles que la déclaration lance (N11) : `ucm` lance thème et structure, `libre` et `absente` les sautent. */
function declarationsN11(r: Registre): void {
  const nomsDesFamilles = ['controle-theme', 'controle-structure'];
  const cas = (description: string, declaration: string | (() => string), statut: 'complete' | 'partielle', lancees: boolean): void =>
    ajouterUneSeance(r, 'N11', {
      description, options: { declaration }, relations: ['ordre'],
      attente: statut === 'partielle' ? refusee('declaration') : { statut, provisoires: 1 }, ...(statut === 'partielle' ? { rattachement: H17 } : {}),
      plus: (sortie) => {
        const { familles } = observationDe(sortie);
        return lancees
          ? nomsDesFamilles.filter((nom) => !familles.includes(nom)).map((nom) => `la famille ${nom} n’est pas lancée`)
          : nomsDesFamilles.filter((nom) => familles.includes(nom)).map((nom) => `la famille ${nom} est lancée`);
      },
    });
  cas('la lecture de la déclaration lève', () => { throw new Error('Figma refuse la lecture de la déclaration'); }, 'partielle', true);
  cas('la déclaration est un JSON invalide', DECLARATION_ILLISIBLE, 'partielle', true);
  cas('la déclaration dit `ucm: false`', DECLARATIONS.libre, 'complete', false);
  cas('la déclaration dit `ucm: true`', DECLARATIONS.ucm, 'complete', true);
  cas('la déclaration est absente', DECLARATIONS.absente, 'complete', false);
}

// ---------------------------------------------------------------------------------------------------------------------------
// Lm : lectures manquées

/**
 * Le champ manqué (sous le nom que le relevé lui donne dans `lecture.manquees`), le nom de la valeur en dur qu'il rend injugeable, et le
 * code du kit qui jugerait cette valeur. Sans valeur en dur, le kit n'a rien à juger sur ce champ : le cas vérifie seulement la bannière.
 */
const CHAMPS_MANQUES: ReadonlyArray<readonly [string, string, string | null, string | null]> = [
  ['marges', 'paddingLeft', 'paddingLeft', 'C29'], ['espacement', 'itemSpacing', 'itemSpacing', 'C29'], ['rayon', 'cornerRadius', 'cornerRadius', 'C29'],
  ['épaisseur', 'strokeWeight', 'strokeWeight', 'C29'], ['fills', 'fills', null, null], ['strokes', 'strokes', null, null], ['characters', 'texte', null, null],
  ['boîte', 'dimensions', 'width', 'C52'], ['layoutMode', 'layoutMode', null, null], ['visible', 'visible', null, null], ['boundVariables', 'liaisons', null, null],
  ['children', 'children', null, null],
];

/** La racine du variant de référence porte une valeur en dur du champ (quand il en a une) ; avec `manque`, la lecture de ce champ a échoué. */
const champ = (nom: string, valeur: string | null, manque: boolean): Adaptateur => (b, lecteurs, s) => {
  const layer = s.variantDeReference.layers[0];
  if (valeur === 'width') (layer as { dimensions: unknown }).dimensions = { x: 0, y: 0, largeur: 7, hauteur: 7 };
  else if (valeur !== null) (layer as { valeursEnDur: unknown }).valeursEnDur = [...layer.valeursEnDur.filter((v) => v.champ !== valeur), { champ: valeur, valeur: 13 }];
  if (manque) (b.releve as { lecture: unknown }).lecture = { ...b.releve.lecture, manquees: [{ layer: layer.id, champ: nom, motif: 'Figma refuse la lecture' }] };
  return lecteurs;
};

const nombreEcrit = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

function operateursLm(r: Registre): void {
  for (const [libelle, nom, valeur, code] of CHAMPS_MANQUES) {
    ajouterUneSeance(r, 'Lm1', {
      description: `un champ manqué : ${libelle} (${nom})`, options: { adaptateurs: [champ(nom, valeur, true)] }, relations: ['ordre'],
      attente: refusee('manquees', { ecran: { dit: [/1 lecture a échoué/], nonDit: [PAS_AUCUN] } }),
      extra: async (s) => {
        // Le témoin lit le même champ sans l'échec : le code du kit doit alors juger la valeur en dur, sinon le cas ne juge rien.
        const temoin = valeur === null ? null : await jouerSeance({ adaptateurs: [champ(nom, valeur, false)] }, async (f) => { await f.demander(); });
        return { cible: s.variantDeReference.layers[0].id, temoinAccuse: temoin ? observationDe(temoin).constats.some((c) => c.code === code && c.layers.includes(s.variantDeReference.layers[0].id)) : null };
      },
      plus: (sortie) => {
        const { cible, temoinAccuse } = sortie.donnees as { cible: string; temoinAccuse: boolean | null };
        const accuses = observationDe(sortie).constats.filter((c) => (c.code === 'C29' || c.code === 'C52') && c.layers.includes(cible)).map((c) => `${c.code} accuse le layer ${cible} dont le champ ${nom} n’a pas été lu`);
        return [...accuses, ...(temoinAccuse === false ? [`le témoin lu sans échec ne produit pas ${code} : le cas ne juge rien`] : [])];
      },
    });
  }
  const coupe = degraderLaLecture({ variantsNonLus: ['Palette=danger, Style=outline, State=disabled, Size=medium'], layersNonLus: 252 });
  const lm2 = (description: string, adaptateurs: Adaptateur[], plan: Plan, dit: ReadonlyArray<RegExp>, relations: readonly Relation[] = ['ordre']): void =>
    ajouterUneSeance(r, 'Lm2', {
      description, options: { adaptateurs: [degraderLaLecture({ manquees: manquees(3) }), ...adaptateurs], plan }, relations, rattachement: H14,
      attente: { statut: 'partielle', provisoires: 1, ecran: { dit, nonDit: [PAS_AUCUN] } },
    });
  lm2('manquées avec coupe', [coupe], {}, [DIT.manquees, DIT.budget]);
  lm2('manquées avec moteur partiel', [MOTEUR_PARTIEL], {}, [DIT.manquees, DIT.moteur]);
  lm2('manquées avec coupe et moteur partiel', [coupe, MOTEUR_PARTIEL], {}, [DIT.manquees, DIT.budget, DIT.moteur]);
  lm2('manquées avec règles refusées', [], lever('regles'), [DIT.manquees, DIT.regles], ['ordre', 'casse']);

  for (const nombre of [1, 10, 100, 1000]) {
    ajouterUneSeance(r, 'Lm3', {
      description: `${nombre} lecture(s) manquée(s) : le nombre et le pluriel restent exacts`, options: { adaptateurs: [degraderLaLecture({ manquees: manquees(nombre) })] }, relations: ['ordre'],
      attente: {
        statut: 'partielle', provisoires: 1,
        ecran: { dit: [nombre === 1 ? /1 lecture a échoué/ : new RegExp(`${nombreEcrit(nombre)} lectures ont échoué`)], nonDit: [PAS_AUCUN] },
      },
      plus: (sortie) => (observationDe(sortie).final?.lecture?.manquees.length === nombre ? [] : [`${String(observationDe(sortie).final?.lecture?.manquees.length)} lectures manquées dans le message, attendu ${nombre}`]),
    });
  }
}

// ---------------------------------------------------------------------------------------------------------------------------
// Mp : moteur partiel

function operateursMp(r: Registre): void {
  const attente: Attente = {
    statut: 'partielle', provisoires: 1, sansCodes: ['C43', 'C45'],
    ecran: { dit: [DIT.moteur, DIT.regles], nonDit: [PAS_AUCUN, JAMAIS_N_SUR_N] },
  };
  const sansLecteurDeRegles = (sortie: SortieDeCas): string[] => (observationDe(sortie).passages.includes('regles:1') ? ['le lecteur de règles est appelé alors que le moteur est partiel'] : []);
  const partiel = (nonLus: number | 'inconnu'): Adaptateur => avecLecteurs({ moteur: async () => moteurAvecCouverture({ etat: 'partielle', lus: 24, nonLus }) });
  for (const [libelle, nonLus, incomplet] of [['nonLus 12, relevé complet', 12, false], ['nonLus inconnu, relevé complet', 'inconnu', false], ['nonLus 12, relevé incomplet', 12, true]] as const) {
    ajouterUneSeance(r, 'Mp1', {
      description: `moteur partiel : ${libelle}`, relations: ['ordre', 'casse'], rattachement: H14, attente, plus: sansLecteurDeRegles,
      options: { adaptateurs: [...(incomplet ? [degraderLaLecture({ manquees: manquees(2) })] : []), partiel(nonLus)] },
    });
  }
  // Sans constat à rendre, l'écran d'une analyse partielle ne doit montrer aucun élément « tenu » : une coche dirait qu'il a été contrôlé (Q-F89-16).
  ajouterUneSeance(r, 'Mp1', {
    description: 'moteur partiel : nonLus inconnu, relevé incomplet, aucun constat à rendre', relations: ['ordre'], rattachement: H15, plus: sansLecteurDeRegles, question: 'Q-F89-16',
    options: { adaptateurs: [sansConstatsDuKit, degraderLaLecture({ manquees: manquees(2) }), partiel('inconnu')] },
    attente: { ...attente, ecran: { dit: [DIT.moteur, DIT.regles], nonDit: [JAMAIS_N_SUR_N], aucuneTenue: true } },
  });
  const sansInstanceDeRegles: Adaptateur = (b: BancDAnalyse, lecteurs) => {
    const lecture = lireLaPage({ ...specConforme(b.composant), conteneurs: [] }).then((page) => page.releve);
    return { ...lecteurs, regles: async () => lecture };
  };
  for (const incomplet of [false, true]) {
    ajouterUneSeance(r, 'Mp1', {
      description: `moteur partiel avec un lecteur de règles défini et aucune instance de règles${incomplet ? ', relevé incomplet' : ''}`, relations: ['ordre', 'casse'], rattachement: H14, attente, plus: sansLecteurDeRegles,
      options: { adaptateurs: [...(incomplet ? [degraderLaLecture({ manquees: manquees(2) })] : []), sansInstanceDeRegles, partiel(12)] },
    });
  }
  for (const nonLus of [12, 'inconnu'] as const) {
    ajouterUneSeance(r, 'Mp1', {
      description: `reprise d’une entrée validée dont le budget change : la seconde analyse a un moteur partiel (nonLus ${nonLus})`, question: 'Q-F89-19',
      options: { adaptateurs: [avecLecteurs((_b, s) => ({ moteur: async () => (s.drapeaux.partiel ? moteurAvecCouverture({ etat: 'partielle', lus: 24, nonLus }) : moteurDouble()) }))] },
      flux: async (s) => {
        await s.demander();
        s.drapeaux.partiel = true;
        await s.demander();
      },
      attente: { statuts: ['complete', 'partielle'] },
    });
  }
}

export function operateursLectures(): CasF8[] {
  const registre = new Registre('F9');
  operateursN(registre);
  operateursLm(registre);
  operateursMp(registre);
  return registre.cas;
}

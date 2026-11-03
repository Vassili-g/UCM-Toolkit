/**
 * Les 16 interactions déclarées de F8 : 8 couples d'opérateurs (section 3.5 du plan), chacun sur deux profils. Le premier profil est R0
 * (`button-36`, règles rédigées) ; le second est r42 (`tile-link`, règles marquées « [À compléter] », propriétés du wrapper). Pour les
 * couples qui passent par le sandbox ou le kit de F3, le second profil est A55 (`button-216`) ou une autre source du kit.
 *
 * Chaque couple a son oracle. Le couple 3 suit la proposition Q-F89-13 de la section 9, qui demande un seul constat « règle
 * probablement renommée », là où le tableau du plan dit « deux constats distincts » : la divergence est dite dans le rapport. Les
 * bannières de l'écran (couple 7) relèvent du lot de la chaîne jusqu'à l'écran : ce lot juge le statut et l'absence de C43.
 */
import { attenduC43, attenduC44, attenduSansValeur, compacter, Registre, type AttenduF8, type CasF8, type SortieDeCas } from './cas';
import { injecter, lever } from './injecteur';
import { chaineAvecLePointDuMoteur } from './operateursMoteur';
import { ajouter, creer, jouerEcriture, MondeEnEcriture, verifierLEcriture } from './operateursEcriture';
import { avecLesRegles, ciblesDe, cleDeLaPropriete, jouerLaPage, reglesDe, specDeLaForme, specR0 } from './operateursRegles';
import { lireLaPage, specDuProfil, type SpecDePage } from './pageDeRegles';
import { MARQUE, nombreDeReglesDuJeu, PROFIL_R42, sansLesReglesDe, type RegleEcrite } from './profilsRegles';
import { analyserLeProfil, DECLARATIONS, moteurDouble, PROFIL_A0, PROFIL_A55, type ProfilDAnalyse } from './scenarioDeBase';
import { prendreLaPlaceDUneEcriture } from '../../../src/sandbox/analyse';
import { releveCoupe } from './operateursBudget';
import { point } from './operateursMoteur';
import {
  ajouterUneSeance, avecLecteurs, catalogueDuProduit, chargerLInterface, degraderLaLecture, DIT, etatApres, JAMAIS_N_SUR_N, manquees, moteurAvecPoints, observationDe, pannesDe, photoDe, profilDe,
  sansConstatsDuKit, type CasDeSeance,
} from './seance';

const CODES_DES_REGLES = ['C43', 'C45', 'C44'] as const;

const BASES: ReadonlyArray<{ readonly nom: string; readonly spec: () => SpecDePage }> = [
  { nom: 'R0', spec: specR0 },
  { nom: 'r42', spec: () => specDuProfil(PROFIL_R42) },
];

/** Les C44 « À compléter » que les règles marquées laissent au scan : un par tag. */
const tagsMarques = (regles: readonly RegleEcrite[]): AttenduF8[] =>
  [...new Set(regles.filter((regle) => regle.contenu.includes('[À compléter]') || regle.icone === '[À compléter]').map((regle) => regle.tag))].map((tag) => attenduC44(`a-completer|@${tag}`));

const premiereVariante = (spec: SpecDePage) => spec.proprietes.find((propriete) => propriete.type === 'VARIANT')!;

function couple1(registre: Registre): void {
  for (const { nom, spec } of BASES) {
    const base = { ...spec(), conteneurs: [] };
    registre.ajouter('I1', {
      description: `${nom} : aucune instance de règles et point « aucune instance » du moteur`, attendus: [attenduC43(nombreDeReglesDuJeu(base.proprietes))],
      codesJuges: CODES_DES_REGLES, rattachement: 'E-30', jouer: jouerLaPage(base),
    });
  }
}

function couple2(registre: Registre): void {
  for (const { nom, spec } of BASES) {
    const base = spec();
    const propriete = premiereVariante(base);
    const cle = cleDeLaPropriete(propriete);
    const valeurs = ciblesDe(propriete).map((cible) => cible.slice(cle.length + 1));
    const retiree = sansLesReglesDe(reglesDe(base), cle, [valeurs[0]]);
    const regles = retiree.map((regle) => (regle.cible === `${cle}.${valeurs[1]}` ? { ...regle, contenu: MARQUE } : regle));
    registre.ajouter('I2', {
      description: `${nom} : « ${propriete.nom} » sans la valeur « ${valeurs[0]} », une autre valeur marquée « [À compléter] »`,
      attendus: [attenduSansValeur(cle, [valeurs[0]]), ...tagsMarques(regles)], codesJuges: CODES_DES_REGLES, jouer: jouerLaPage(avecLesRegles(base, regles)),
    });
  }
}

function couple3(registre: Registre): void {
  for (const { nom, spec } of BASES) {
    const base = spec();
    const propriete = premiereVariante(base);
    const cle = cleDeLaPropriete(propriete);
    const faute = /(.)/.test(cle) ? cle.replace(/(.)/, '$1') : cle.slice(0, -1);
    const sans = sansLesReglesDe(reglesDe(base), cle);
    const posees = reglesDe(base).filter((regle) => regle.cible?.startsWith(`${cle}.`)).map((regle) => ({ ...regle, cible: regle.cible!.replace(`${cle}.`, `${faute}.`) }));
    registre.ajouter('I3', {
      description: `${nom} : « ${propriete.nom} » sans règle et « ${faute} » posée avec les mêmes valeurs`,
      attendus: [{ code: 'C45', cle: `regle-renommee|${compacter(faute)}`, forme: 'a-faire' }], codesJuges: ['C43', 'C45'], question: 'Q-F89-13',
      jouer: jouerLaPage(avecLesRegles(base, [...sans, ...posees])),
    });
  }
}

function couple4(registre: Registre): void {
  const profils = [
    { nom: 'R0', spec: specR0(), noms: ['Has Icon', 'Loading'] },
    { nom: 'r42', spec: specDuProfil(PROFIL_R42), noms: ['Orientation', 'Show Icon'] },
  ];
  for (const { nom, spec, noms } of profils) {
    const proprietes = noms.map((cible) => spec.proprietes.find((propriete) => propriete.nom === cible)!);
    const regles = proprietes.reduce((courantes, propriete) => sansLesReglesDe(courantes, cleDeLaPropriete(propriete)), reglesDe(spec));
    const ids = proprietes.map((propriete) => ajouter(cleDeLaPropriete(propriete)));
    const attendu = { ecrites: ids, sautees: [] as ReadonlyArray<readonly [string, string]>, appels: ['ajouter'] };
    registre.ajouter('I4', {
      description: `${nom} : deux propriétés sans règle, un seul appel d’écriture et un seul point d’annulation`,
      attendus: [], codesJuges: ['C43', 'C45'], relations: ['ordre'],
      jouer: (variante) => jouerEcriture(() => ({ mondes: [new MondeEnEcriture(avecLesRegles(spec, regles))] }), true, variante),
      verifier: (sortie) => {
        const messages = verifierLEcriture(attendu)(sortie);
        const envoyees = (sortie.donnees as { envoyees: number }).envoyees;
        if (envoyees !== 2) messages.push(`${envoyees} correction(s) proposée(s), attendu 2`);
        return messages;
      },
    });
  }
}

function couple5(registre: Registre): void {
  for (const description of ['paddingLeft', 'itemSpacing']) {
    registre.ajouter('I5', {
      description: `constat C29 du kit sur ${description} ignoré, point C30 du moteur de même clé`, attendus: [], codesJuges: ['C30'], question: 'Q-F89-12', rattachement: 'E-30',
      jouer: () => chaineAvecLePointDuMoteur({ operateur: 'Z1', code: 'C29', description }, { ignorer: true }),
    });
  }
}

/** Une analyse du profil dont la lecture des règles ou le moteur est dégradé : le statut final et les constats de règles. */
function couplesDuSandbox(registre: Registre, operateur: 'I6' | 'I7', degrader: () => Promise<NonNullable<Parameters<typeof analyserLeProfil>[1]>>): void {
  for (const profil of [PROFIL_A0, PROFIL_A55]) {
    registre.ajouter(operateur, {
      description: `${profil.id} (${profil.forme}) : ${operateur === 'I6' ? 'lecture des règles refusée avec une propriété sans règle' : 'moteur partiel avec aucune instance de règles'}`,
      attendus: [], codesJuges: ['C43', 'C45'], relations: [], rattachement: 'E-31',
      jouer: async (): Promise<SortieDeCas> => {
        const { final } = await analyserLeProfil(profil, await degrader());
        return { constats: final?.constats ?? [], donnees: { statut: final?.statut } };
      },
      verifier: (sortie) => (sortie.donnees?.statut === 'partielle' ? [] : [`statut ${String(sortie.donnees?.statut)}, attendu partielle`]),
    });
  }
}

function couples67(registre: Registre): void {
  couplesDuSandbox(registre, 'I6', async () => {
    const sansRegle = (await lireLaPage(avecLesRegles(specR0(), sansLesReglesDe(reglesDe(specR0()), 'hasIcon')))).releve;
    return (banc) => injecter({ ...banc.lecteurs, regles: async () => sansRegle }, lever('regles')).lecteurs;
  });
  couplesDuSandbox(registre, 'I7', async () => {
    const sansInstance = (await lireLaPage({ ...specR0(), conteneurs: [] })).releve;
    return (banc) => ({ ...banc.lecteurs, moteur: async () => moteurDouble({ partiel: true }), regles: async () => sansInstance });
  });
}

function couple8(registre: Registre): void {
  const profils = [
    { nom: 'R0 et switch-4', creation: () => ({ ...specR0(), conteneurs: [] }), ajout: () => ({ ...avecLesRegles(specDeLaForme('switch-4'), sansLesReglesDe(reglesDe(specDeLaForme('switch-4')), 'checked')), id: '11:1' }), propriete: 'checked' },
    { nom: 'r42 et badge-9', creation: () => ({ ...specDuProfil(PROFIL_R42), conteneurs: [] }), ajout: () => ({ ...avecLesRegles(specDeLaForme('badge-9'), sansLesReglesDe(reglesDe(specDeLaForme('badge-9')), 'tone')), id: '11:1' }), propriete: 'tone' },
  ];
  for (const { nom, creation, ajout, propriete } of profils) {
    const attendu = { ecrites: [creer(), ajouter(propriete, '11:1')], sautees: [] as ReadonlyArray<readonly [string, string]>, appels: ['creer', 'ajouter'] };
    registre.ajouter('I8', {
      description: `${nom} : une création et un ajout sur deux composants de la même page, un seul point d’annulation`,
      attendus: [], codesJuges: ['C43', 'C45'], relations: ['ordre'],
      jouer: (variante) => jouerEcriture(() => ({ mondes: [new MondeEnEcriture(creation()), new MondeEnEcriture(ajout())] }), true, variante),
      verifier: verifierLEcriture(attendu),
    });
  }
}

export function interactions(): CasF8[] {
  const registre = new Registre('F8');
  couple1(registre);
  couple2(registre);
  couple3(registre);
  couple4(registre);
  couple5(registre);
  couples67(registre);
  couple8(registre);
  return registre.cas;
}

// ---------------------------------------------------------------------------------------------------------------------------
// F9 : 20 interactions déclarées (10 couples, 2 profils)

const PROFILS_F9: ReadonlyArray<{ readonly nom: string; readonly profil: ProfilDAnalyse }> = [{ nom: 'A0', profil: PROFIL_A0 }, { nom: 'a55', profil: PROFIL_A55 }];
const CIBLE_DE_LIAISON = 'Q-F89-17';

function interactionsF9(registre: Registre): void {
  const ix = (couple: string, nom: string, description: string, cas: Omit<CasDeSeance, 'description'>): void =>
    ajouterUneSeance(registre, couple, { description: `${nom} : ${description}`, codesJuges: [], relations: [], ...cas });

  for (const { nom, profil } of PROFILS_F9) {
    // 1. Règles refusées et moteur partiel
    ix('J1', nom, 'règles refusées et moteur partiel : la bannière nomme les deux causes', {
      architectureDeLEcran: 'ucm',
      options: { profil, ...pannesDe(['regles', 'moteur']) },
      attente: { statut: 'partielle', provisoires: 1, sansCodes: ['C43', 'C45'], ecran: { dit: [DIT.moteur, DIT.regles], nonDit: [/Aucun constat/, JAMAIS_N_SUR_N] } },
      rattachement: 'hypothèse 14 de 6.1 (moteur partiel « N variants lus sur N » ; le relevé et le moteur coupent à des variants différents)',
    });
    // 2. Coupe du budget et lectures manquées
    const gardes = nom === 'A0' ? 33 : 200;
    ix('J2', nom, 'coupe du budget et lectures manquées : les nombres sont cumulés dans la bannière', {
      architectureDeLEcran: 'ucm',
      options: { profil, adaptateurs: [releveCoupe(gardes), degraderLaLecture({ manquees: manquees(2) })] },
      attente: { statut: 'partielle', provisoires: 1, ecran: { dit: [DIT.budget, /2 lectures ont échoué/], nonDit: [JAMAIS_N_SUR_N] } },
      rattachement: 'P15 du plan (la bannière donne les nombres réellement lus et la cause) ; E-32',
      plus: (sortie) => {
        const lecture = observationDe(sortie).final?.lecture;
        return lecture && lecture.manquees.length === 2 && lecture.variantsNonLus.length > 0 ? [] : ['le message final ne porte pas à la fois la coupe et les lectures manquées'];
      },
    });
    // 3. Niveau illisible et AAA rangé
    ix('J3', nom, 'niveau illisible avec AAA rangé : l’écran dit que AA a été appliqué', {
      architectureDeLEcran: 'ucm',
      options: { profil: profilDe(profil.forme, profil.architecture, profil.libraries, 'AAA'), plan: lever('niveau') },
      attente: { statut: 'partielle', provisoires: 1, ecran: { dit: [DIT.niveau], nonDit: [/Aucun constat/] } }, rattachement: 'hypothèse 13 de 6.1 (le statut final ignore les lectures refusées ; AAA devient AA sans le dire)',
    });
    // 4. Annulation puis demande immédiate
    ix('J4', nom, 'annulation puis demande immédiate : une seule analyse complète, la première ne laisse ni provisoire ni retenue', {
      options: { profil, plan: (s) => ({ releve: [{ quand: 'avant', action: { action: 'appeler', faire: () => s.annuler('identite') } }] }) },
      flux: async (s) => {
        s.surMessage.push((m) => { if (m.type === 'analyse' && m.statut === 'annulee') setTimeout(() => { s.garder(s.demander()); }, 0); });
        await s.demander();
        await new Promise((fin) => setTimeout(fin, 5));
      },
      attente: { statuts: ['annulee', 'complete'], occupes: 0, retenue: true },
      plus: (sortie) => {
        const o = observationDe(sortie);
        return [...(o.constatsParFinal[0] === 0 ? [] : ['la première analyse laisse des constats']), ...(o.provisoires === 1 ? [] : [`${o.provisoires} provisoire(s), attendu 1 (celui de la seconde)`])];
      },
    });
    // 5. Péremption pendant le moteur et final tardif
    ix('J5', nom, 'péremption pendant le moteur, après le provisoire, puis final tardif : le final est refusé, les constats du provisoire restent sans case', {
      options: { profil },
      flux: async (s) => { s.surMessage.push((m) => { if (m.type === 'analyse-provisoire') s.evenement('noeud'); }); await s.demander(); },
      attente: { statuts: ['complete'], provisoires: 1, perimes: ['document'] },
      extra: async (s) => {
        const ui = await chargerLInterface();
        const etat = await etatApres(s.messages);
        return { applicable: ui.analyseApplicable(etat.analyse), statut: etat.analyse?.statut, constats: etat.analyse?.tous.length, perimee: etat.analyse?.perimee };
      },
      plus: (sortie) => {
        const { applicable, statut, constats, perimee } = sortie.donnees as { applicable: boolean; statut: string; constats: number; perimee: boolean };
        return [
          ...(perimee ? [] : ['l’interface ne retient pas la péremption']), ...(applicable ? ['le final tardif rend l’analyse applicable'] : []),
          ...(statut === 'provisoire' ? [] : [`statut ${statut}, attendu provisoire : le final tardif est refusé`]), ...(constats > 0 ? [] : ['les constats du provisoire ne sont pas gardés']),
        ];
      },
    });
    // 6. Analyse périmée et écriture en cours
    ix('J6', nom, 'analyse périmée et écriture en cours : l’écriture garde la place, `occupe` visible', {
      options: { profil },
      flux: async (s) => {
        await s.demander();
        s.evenement('noeud');
        const place = await prendreLaPlaceDUneEcriture(s.identiteCourante()!);
        await s.demander();
        s.photo('pendant');
        if ('liberer' in place) place.liberer();
      },
      attente: { statuts: ['complete'], occupes: 1 }, question: CIBLE_DE_LIAISON, rattachement: 'E-39',
      plus: (sortie) => (photoDe(sortie, 'pendant').place === 'ecriture' ? [] : [`la place n’est plus à l’écriture (${String(photoDe(sortie, 'pendant').place)})`]),
    });
    // 7. Prélecture et écriture
    ix('J7', nom, 'prélecture et écriture : l’écriture prend la place sans `occupe`, la prélecture s’arrête en silence', {
      options: { profil, plan: (s) => ({ releve: [{ quand: 'avant', action: { action: 'appeler', faire: () => { s.garder((async () => { const place = await prendreLaPlaceDUneEcriture({ sujet: 'Button', generation: 999 }); s.drapeaux.avecLaPlace = 'liberer' in place; if ('liberer' in place) place.liberer(); })()); } } }] }) },
      flux: async (s) => { await s.demander({ type: 'analyser', origine: 'prelecture' }); },
      attente: { statuts: [], occupes: 0, retenue: false },
      extra: (s) => ({ avecLaPlace: s.drapeaux.avecLaPlace }),
      plus: (sortie) => [...((sortie.donnees as { avecLaPlace?: boolean }).avecLaPlace === true ? [] : ['l’écriture n’a pas obtenu la place']), ...(observationDe(sortie).types.length > 0 ? ['la prélecture a parlé'] : [])],
    });
    // 8. Ignorés illisibles et tous les constats ignorés
    ix('J8', nom, 'ignorés illisibles : l’écran ne dit pas « Aucun constat » sans nommer la lecture refusée', {
      architectureDeLEcran: 'ucm',
      options: { profil, plan: lever('ignores'), adaptateurs: [sansConstatsDuKit, avecLecteurs({ moteur: async () => moteurAvecPoints([{ point: point('Layer « A » : il n’utilise pas d’auto layout.'), noeuds: ['20:2'] }]) })] },
      attente: { statut: 'partielle', provisoires: 1, ecran: { dit: [DIT.ignores], nonDit: [/Aucun constat/] } }, rattachement: 'hypothèse 16 de 6.1 (tous les constats ignorés : « Aucun constat » avant la liste des ignorés)',
    });
    // 9. Library à choisir et prélecture
    const aChoisir = profilDe(profil.forme, 'ucm', 'plusieurs', profil.niveau);
    ix('J9', nom, 'library à choisir et prélecture : aucune prélecture', {
      options: { profil: aChoisir, adaptateurs: [catalogueDuProduit, (_b, lecteurs) => ({ ...lecteurs, bibliotheques: async () => ({ etat: 'lue', illisibles: [], collections: ['Intencial', 'Autre'].map((libre) => ({ cle: `c-${libre}`, nom: 'components', library: libre, variables: [{ cle: `v-${libre}`, nom: 'x', type: 'COLOR' }] })) }) as never })] },
      flux: async (s) => { await s.demander({ type: 'analyser', origine: 'prelecture' }); },
      attente: { statuts: [], occupes: 0 }, rattachement: 'hypothèse 22 de 6.1 (la garde « library à choisir » ne vaut que pour une première analyse, et la prélecture l’ignore)',
      plus: (sortie) => (observationDe(sortie).passages.some((p) => p.startsWith('releve:')) ? ['la prélecture a lu le relevé alors que la library est à choisir'] : []),
    });
    // 10. Déclaration qui change pendant l'analyse
    ix('J10', nom, 'déclaration qui change pendant l’analyse : les familles suivent la déclaration finale', {
      options: { profil, plan: (s) => ({ releve: [{ quand: 'avant', action: { action: 'appeler', faire: () => { s.declaration = profil.architecture === 'ucm' ? DECLARATIONS.libre : DECLARATIONS.ucm; } } }] }) },
      attente: { statuts: ['complete'] },
      plus: (sortie) => {
        const familles = observationDe(sortie).familles.filter((f) => f === 'controle-theme' || f === 'controle-structure');
        const ucmALaFin = profil.architecture !== 'ucm';
        return ucmALaFin ? (familles.length === 2 ? [] : ['les familles thème et structure ne sont pas lancées alors que la déclaration finale est « ucm »']) : (familles.length === 0 ? [] : ['les familles thème et structure sont lancées alors que la déclaration finale est « libre »']);
      },
    });
  }
}

export function interactionsDeF9(): CasF8[] {
  const registre = new Registre('F9');
  interactionsF9(registre);
  return registre.cas;
}

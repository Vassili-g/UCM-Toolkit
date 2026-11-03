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
import { analyserLeProfil, moteurDouble, PROFIL_A0, PROFIL_A55 } from './scenarioDeBase';

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

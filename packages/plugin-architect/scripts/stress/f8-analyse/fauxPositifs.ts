/**
 * Les faux positifs du stress test F8 : 67 cas où l'oracle n'attend aucun C43 ni C45 (ni autre constat que ceux que la page porte
 * vraiment). 48 profils de règles (propriété P1) et 19 thèmes ciblés de la section 4 du plan.
 *
 * Un profil aux règles marquées « [À compléter] » rend des C44 légitimes : seuls C43 et C45 y sont jugés.
 */
import { lireLArchitectureDuFichier } from '@ucm-kit/core/referentiel';

import { traiterAvec as traiterLesCorrections } from '../../../src/sandbox/corrections';
import { attenduC44, HYPOTHESES, Registre, type AttenduF8, type CasF8, type SortieDeCas } from './cas';
import { attenduDuPoint, chaineAvecLePointDuMoteur, constatsDesPoints, point } from './operateursMoteur';
import { avecLesProprietes, avecLesRegles, avecLeConteneur, jouerLaPage, reglesDe, reecrire, specDeLaForme, specR0 } from './operateursRegles';
import { specDuProfil, type SpecDePage } from './pageDeRegles';
import { PROFILS_DE_REGLES, REDIGE, type ProprieteDuJeu } from './profilsRegles';
import { DECLARATIONS, PROFILS_D_ANALYSE } from './scenarioDeBase';
import {
  ajouterUneSeance, analyserUneFois, barreApres, catalogueDuProduit, degraderLaLecture, ecranDe_, etatApres, ignoresDuProduit, jouerSeance, juger, observationDe,
  type Attente, type CasDeSeance, type Ecran, type EtatDeLaBarre,
} from './seance';

const CODES = ['C43', 'C45'] as const;

function profils(registre: Registre): void {
  for (const profil of PROFILS_DE_REGLES) {
    registre.ajouter('FP1', {
      description: `${profil.id} : ${profil.forme}, règles ${profil.redigees ? 'rédigées' : 'marquées'}, cibles ${profil.ecriture === 'exacte' ? 'exactes' : 'compactées'}, ${profil.composants} composant(s)`,
      attendus: [], codesJuges: CODES, jouer: jouerLaPage(specDuProfil(profil)),
    });
  }
}

function themes(registre: Registre): void {
  const fp = (description: string, spec: SpecDePage, attendus: readonly AttenduF8[] = [], codesJuges: readonly string[] = CODES): void => {
    registre.ajouter('FP2', { description, attendus, codesJuges, jouer: jouerLaPage(spec) });
  };
  const tuile = specDeLaForme('tile-link');
  for (const ecrit of ['Show Icon', 'show icon', 'SHOW ICON']) fp(`cible écrite « ${ecrit} »`, avecLesRegles(tuile, reecrire(reglesDe(tuile), 'showIcon', ecrit)));
  fp('propriété du wrapper de dimensions fusionnée (tile-link)', tuile);
  const imbrique: ProprieteDuJeu = { nom: 'Icon Slot', type: 'BOOLEAN', imbrique: true };
  fp('propriété d’un imbriqué rattaché au parent', avecLesProprietes(specR0(), [...specR0().proprietes, imbrique]));
  const base = specR0();
  fp('règle sur une propriété de texte publiée', {
    ...avecLesRegles(base, [...reglesDe(base), { tag: 'boolean', cible: 'label', contenu: REDIGE }]), proprietes: [...base.proprietes, { nom: 'Label', type: 'TEXT' }],
  });
  fp('règles @icons, @usage, @default, @do, @dont et @pairs présentes', avecLesRegles(base, [
    ...reglesDe(base), { tag: 'default', cible: 'palette.primary', contenu: '' }, { tag: 'do', contenu: 'Faire.' }, { tag: 'dont', contenu: 'Ne pas faire.' }, { tag: 'pairs', contenu: 'Chip, Tag' },
  ]), [], ['C43', 'C45', 'C44']);
  fp('règle rédigée et règle marquée sur deux propriétés', avecLesRegles(base, reglesDe(base).map((regle) => (regle.cible === 'hasIcon' ? { ...regle, contenu: '[À compléter] Décrivez cette règle.' } : regle))),
    [attenduC44('a-completer|@boolean')], ['C43', 'C45', 'C44']);
  fp('page à deux composants et deux conteneurs', specDuProfil(PROFILS_DE_REGLES.find((p) => p.forme === 'button-36' && p.composants === 3 && p.redigees && p.ecriture === 'exacte')!));
  const diviseur = specDeLaForme('divider-1');
  fp('composant sans propriété, conteneur réduit à `@usage`', avecLesRegles(diviseur, reglesDe(diviseur).filter((regle) => regle.tag === 'usage')));
  fp('conteneur dans une section', avecLeConteneur(base, { emplacement: 'section' }));

  const mot = (description: string, titre: string, plus: Parameters<typeof point>[1], code: 'C30' | 'C34' | 'C42', famille?: 'tailles'): void => {
    const p = point(titre, plus);
    registre.ajouter('FP2', {
      description, attendus: [attenduDuPoint(code, p, ['12:34'], { famille })], rattachement: HYPOTHESES.H05, jouer: async () => ({ constats: constatsDesPoints([{ point: p, noeuds: ['12:34'] }]) }),
    });
  };
  mot('calque nommé « masqué » dans un point ordinaire', 'Layer « masqué » : il range 3 calques mais n\'utilise pas d\'auto layout.', {}, 'C42');
  mot('propriété nommée « pilote » dans un point ordinaire', 'Component Set « Button » : une combinaison de valeurs de ses propriétés de variante n\'a pas de variant, parmi « pilote ».', { famille: 'proprietes' }, 'C34');
  mot('calque nommé « Variable introuvable » dans un point de variables', 'Layer « Variable introuvable », gap : aucune variable associée.', { famille: 'variables' }, 'C30', 'tailles');
  mot('calque nommé « Variable introuvable » dans un point de disposition', 'Layer « Variable introuvable » : il n\'utilise pas d\'auto layout.', {}, 'C42');
  registre.ajouter('FP2', { description: 'moteur sans aucun point', attendus: [], jouer: async () => ({ constats: constatsDesPoints([]) }) });
  const repete = point('Layer « Card » : il n\'utilise pas d\'auto layout.');
  registre.ajouter('FP2', {
    description: 'même phrase du moteur répétée', attendus: [attenduDuPoint('C42', repete, ['12:34'])],
    jouer: async () => ({ constats: constatsDesPoints([{ point: repete, noeuds: ['12:34'] }, { point: repete, noeuds: ['12:34'] }]) }),
  });
  const champsDifferents = (description: string, champ: string): void => {
    registre.ajouter('FP2', {
      description, attendus: [], codesJuges: ['C29'], rattachement: 'E-30',
      jouer: async (): Promise<SortieDeCas> => {
        const sortie = await chaineAvecLePointDuMoteur({ operateur: 'Z1', code: 'C29', description: 'paddingLeft' }, { champ, layerVoisin: false });
        return { ...sortie, constats: sortie.constats.filter((constat) => constat.code === 'C30') };
      },
      verifier: (sortie) => (sortie.donnees?.kit === 1 && sortie.constats.length === 1 ? [] : [`le C29 du kit (${String(sortie.donnees?.kit)}) et le C30 du moteur (${sortie.constats.length}) doivent rester tous deux`]),
    });
  };
  champsDifferents('constat du kit sur paddingLeft, point du moteur sur itemSpacing', 'itemSpacing');
  champsDifferents('constat du kit sur paddingLeft, point du moteur sur cornerRadius', 'cornerRadius');
}

export function fauxPositifs(): CasF8[] {
  const registre = new Registre('F8');
  profils(registre);
  themes(registre);
  return registre.cas;
}

// ---------------------------------------------------------------------------------------------------------------------------
// F9 : 88 faux positifs

const PARTIELLE = /Analyse partielle/;

/** Les 72 profils d'analyse : le sandbox rend `complete`, et l'écran prévu par l'architecture et la library du profil. */
function profilsDAnalyse(registre: Registre): void {
  for (const profil of PROFILS_D_ANALYSE) {
    const horsUcm = profil.architecture !== 'ucm';
    const aChoisir = !horsUcm && profil.libraries === 'plusieurs';
    const reference = { library: profil.libraries === 'une' ? 'Intencial' : null, nom: profil.libraries === 'une' ? 'Intencial' : null, candidates: profil.libraries === 'aucune' ? 0 : profil.libraries === 'une' ? 1 : 2 };
    registre.ajouter('FP1', {
      description: `${profil.id} : ${profil.forme}, ${profil.architecture}, ${profil.niveau}, libraries ${profil.libraries} → ${aChoisir ? 'Analyser ne part pas, « Library à choisir »' : `complete, ${horsUcm ? 'l’alerte hors UCM' : 'la liste'}`}`,
      codesJuges: [], relations: profil.forme === 'button-216' ? [] : ['ordre'],
      jouer: (variante) => jouerSeance({ profil, variante }, analyserUneFois, async (s) => {
        const architecture = lireLArchitectureDuFichier(typeof s.declaration === 'function' ? s.declaration() : s.declaration);
        const etat = await etatApres(s.messages, { architecture, reference });
        const avant = aChoisir ? await etatApres([], { architecture, reference }) : null;
        return { ecran: await ecranDe_(etat), barre: await barreApres(etat), ecranAvant: avant ? await ecranDe_(avant) : null, barreAvant: avant ? await barreApres(avant) : null };
      }),
      verifier: (sortie) => {
        const o = observationDe(sortie);
        const { ecran, barre, ecranAvant, barreAvant } = sortie.donnees as { ecran: Ecran; barre: EtatDeLaBarre; ecranAvant: Ecran | null; barreAvant: EtatDeLaBarre | null };
        // Plusieurs libraries sans choix : le sandbox ne lance pas l'analyse et répond `library-a-choisir` (Q-F89-20).
        const messages = juger(sortie, { statuts: aChoisir ? [] : ['complete'], occupes: 0, perimes: [] });
        if (aChoisir && !o.types.includes('library-a-choisir')) messages.push('le sandbox n’a pas envoyé `library-a-choisir`');
        const alertes = ecran.alertes.join(' | ');
        if (PARTIELLE.test(alertes)) messages.push(`l’écran dit « analyse partielle » pour une analyse complète (${alertes})`);
        if (horsUcm) {
          if (!/UCM/.test(alertes)) messages.push(`l’écran ne montre pas l’alerte hors UCM (alertes : ${alertes || 'aucune'})`);
          if (!barre.analyserCache) messages.push('Analyser reste visible hors UCM');
        } else {
          if (/n.est pas déclaré UCM/.test(alertes)) messages.push('l’alerte hors UCM est montrée pour un fichier UCM');
          if (ecran.sections < 1 && o.constats.length > 0) messages.push('l’écran ne montre aucune section pour une analyse qui a des constats');
          if (barre.analyserCache) messages.push('Analyser est caché pour un fichier UCM');
        }
        if (aChoisir) {
          if (!ecranAvant || !/library/i.test(ecranAvant.alertes.join(' '))) messages.push('l’écran de la première analyse ne demande pas de choisir la library');
          if (!/library/i.test(alertes)) messages.push(`l’écran après le refus ne demande pas de choisir la library (alertes : ${alertes || 'aucune'})`);
          if (!barreAvant?.analyserInactif || !barre.analyserInactif) messages.push('Analyser est actif alors que la library est à choisir');
        } else if (!horsUcm && barre.analyserInactif) messages.push('Analyser est inactif alors qu’aucun choix de library n’est à faire');
        return messages;
      },
    });
  }
}

/** Les 16 thèmes ciblés de la section 4 du plan, côté F9. */
function themesF9(registre: Registre): void {
  const fp = (description: string, cas: Omit<CasDeSeance, 'description'>): void => ajouterUneSeance(registre, 'FP2', { description, codesJuges: [], relations: ['ordre'], ...cas });
  const complete: Attente = { statut: 'complete', provisoires: 1, occupes: 0, perimes: [], ecran: { nonDit: [PARTIELLE] } };

  const sans = (lecteur: 'ignores' | 'regles' | 'niveau' | 'dependances', libelle: string): void =>
    fp(`lecteur ${libelle} non défini : l’absence n’est pas un refus`, {
      options: { adaptateurs: [(_b, lecteurs) => { const { [lecteur]: _retire, ...reste } = lecteurs; return reste as typeof lecteurs; }] },
      attente: { ...complete, ...(lecteur === 'regles' ? {} : {}) },
      plus: (sortie) => (observationDe(sortie).passages.some((p) => p.startsWith(`${lecteur}:`)) ? [`le lecteur ${lecteur} a été appelé`] : []),
    });
  sans('ignores', 'd’ignorés');
  sans('regles', 'de règles');
  sans('niveau', 'de niveau');
  sans('dependances', 'de dépendances');

  for (const layers of [1999, 2000]) {
    fp(`relevé de ${layers} layers lus, aucun non lu : complet`, { options: { adaptateurs: [degraderLaLecture({ layersLus: layers })] }, attente: complete });
  }
  fp('variants désactivés : exclus du contraste, jamais accusés', {
    attente: { ...complete, avecCodes: ['C53'] },
    plus: (sortie) => observationDe(sortie).constats.filter((c) => (c.code === 'C49' || c.code === 'C50') && c.variants.some((v) => /disabled/.test(v))).map((c) => `${c.code} accuse un variant désactivé`),
  });
  fp('constat `info` seul : aucune alerte partielle, la section Informations existe', {
    options: { avecUnModele: false, adaptateurs: [ignoresDuProduit] },
    flux: async (s) => {
      await s.demander();
      const ids = s.observer().constats.filter((c) => c.type !== 'info').map((c) => c.id);
      s.ignoresBruts = JSON.stringify(ids);
      await s.demander({ type: 'analyser', intention: 'actualiser', demande: ++s.numero });
    },
    attente: { statuts: ['complete', 'complete'], occupes: 0, ecran: { nonDit: [PARTIELLE, /Aucun constat/], dansLeTexte: false } },
  });
  fp('sélection d’un variant du jeu pendant l’analyse : aucune péremption', {
    options: { plan: (s) => ({ moteur: [{ quand: 'avant', action: { action: 'appeler', faire: () => { s.evenement('variant'); } } }] }) }, attente: complete,
  });
  fp('deux analyses successives, non concurrentes', { flux: async (s) => { await s.demander(); await s.demander(); }, attente: { statuts: ['complete', 'complete'], occupes: 0, perimes: [] } });
  fp('Actualiser après une analyse', { flux: async (s) => { await s.demander(); await s.demander({ type: 'analyser', intention: 'actualiser', demande: ++s.numero }); }, attente: { statuts: ['complete', 'complete'], occupes: 0, perimes: [] } });
  fp('écriture vide (aucune ligne écrite) : l’analyse n’est pas périmée', {
    flux: async (s) => {
      await s.demander();
      await traiterLesCorrections({ lot: async () => ({ ecrites: [], sautees: [] }), selectionner: async () => undefined })({ type: 'appliquer-corrections', analyse: s.identiteCourante()!, ids: [] }, s.contexte);
    },
    attente: { statuts: ['complete'], perimes: [] },
    plus: (sortie) => (observationDe(sortie).types.includes('corrections-appliquees') ? [] : ['aucun message `corrections-appliquees`']),
  });
  fp('événement hors inventaire pendant l’analyse : aucune péremption', {
    options: { plan: (s) => ({ moteur: [{ quand: 'avant', action: { action: 'appeler', faire: () => { s.evenement('hors-inventaire'); } } }] }) }, attente: complete,
  });
  fp('prélecture entière sans événement, puis clic : une analyse, promue', {
    flux: async (s) => { await s.demander({ type: 'analyser', origine: 'prelecture' }); await s.demander(); },
    attente: { statuts: ['complete'], occupes: 0, perimes: [], retenue: true },
  });
  fp('library choisie par les liaisons, une seule candidate : Analyser actif, analyse complète', {
    options: { adaptateurs: [catalogueDuProduit] }, attente: complete, reference: { library: null, nom: null, candidates: 1 },
    flux: async (s) => { await s.demander(); },
    plus: (sortie) => (observationDe(sortie).libraryRetenue === 'Intencial' ? [] : [`library retenue ${String(observationDe(sortie).libraryRetenue)}, attendu Intencial`]),
  });
  fp('fichier déclaré `libre` : l’alerte seule, l’analyse est complète', {
    options: { declaration: DECLARATIONS.libre },
    attente: { statut: 'complete', provisoires: 1, ecran: { dit: [/UCM/], nonDit: [PARTIELLE] } },
  });
}

export function fauxPositifsF9(): CasF8[] {
  const registre = new Registre('F9');
  profilsDAnalyse(registre);
  themesF9(registre);
  return registre.cas;
}

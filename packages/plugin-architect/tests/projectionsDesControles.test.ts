/**
 * La projection de chaque famille de contrôles du kit : la part du relevé et du catalogue qu'elle lit, et que la reprise
 * compare (`creerLesRequetes`). Deux preuves de suffisance par famille, sur la fixture du banc de session et sur un relevé
 * riche :
 * - les accès : la famille tourne sur un relevé et un catalogue enveloppés par un enregistreur, et tout chemin lu est
 *   couvert par le gabarit (`GABARITS`) ;
 * - les perturbations : changer une donnée que le gabarit ne couvre pas laisse les constats identiques, changer une donnée
 *   qu'il couvre change la projection.
 * Puis le mécanisme de reprise de `creerLesRequetes`, sur une entrée de session fabriquée.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  controlerCouchesParEtapes, controlerLAccessibiliteParEtapes, controlerLaStructureParEtapes, controlerLaTypographieParEtapes, controlerLeThemeParEtapes,
  controlerMappingParEtapes, controlerNommageParEtapes, controlerOublisParEtapes,
  type CatalogueDeReference, type Constat, type ReleveDeComposant,
} from '@ucm-kit/core/controles';
import { egalesExactement } from 'ucm-plugin-socle/src/composant/analyse/validation';

import { creerLesRequetes, type EntreeDeSessionDAnalyse } from '../src/sandbox/analyse';
import { FAMILLES_DE_CONTROLES, GABARITS, PROJECTIONS, projeter, type Gabarit, type NomDeFamille } from '../src/sandbox/projectionsDesControles';
import { enregistrerLesAcces, type Chemin } from './aides/accesEnregistres';
import { catalogueRiche, releveRiche, releveRicheAvecWrapper } from './aides/donneesRiches';
import { catalogueDe, fichierDeDepart, releveDe } from './aides/fichierDeSession';

type Niveau = 'AA' | 'AAA';

const GENERATEURS: Record<NomDeFamille, (releve: ReleveDeComposant, catalogue: CatalogueDeReference, niveau: Niveau) => Generator<void, Constat[]>> = {
  'controle-nommage': controlerNommageParEtapes,
  'controle-mapping': controlerMappingParEtapes,
  'controle-couches': controlerCouchesParEtapes,
  'controle-oublis': controlerOublisParEtapes,
  'controle-accessibilite': (releve, catalogue, niveau) => controlerLAccessibiliteParEtapes(releve, catalogue, { niveau }),
  'controle-typographie': controlerLaTypographieParEtapes,
  'controle-theme': controlerLeThemeParEtapes,
  'controle-structure': controlerLaStructureParEtapes,
};

function lancer(famille: NomDeFamille, releve: ReleveDeComposant, catalogue: CatalogueDeReference, niveau: Niveau = 'AAA'): Constat[] {
  const calcul = GENERATEURS[famille](releve, catalogue, niveau);
  let etape = calcul.next();
  while (!etape.done) etape = calcul.next();
  return etape.value;
}

interface Donnees { releve: ReleveDeComposant; catalogue: CatalogueDeReference }
interface Jeu { nom: string; neuf(): Donnees }

const JEUX: readonly Jeu[] = [
  { nom: 'relevé riche', neuf: () => ({ releve: releveRiche(), catalogue: catalogueRiche() }) },
  { nom: 'fixture du banc de session', neuf: () => ({ releve: releveDe(fichierDeDepart()), catalogue: catalogueDe(fichierDeDepart()) }) },
  { nom: 'relevé riche à wrapper de dimensions', neuf: () => ({ releve: releveRicheAvecWrapper(), catalogue: catalogueRiche() }) },
];
const JEU_A_WRAPPER = 2;

/* ---------- Les chemins couverts ---------- */

const segments = (chemin: string): string[] => chemin.split('.');
const correspond = (motif: string, segment: string): boolean => motif === '*' || motif === segment;

/** Un chemin du gabarit est un préfixe du chemin lu (ou lui est égal) : la donnée lue est dans la projection. */
const couvert = (gabarit: Gabarit, chemin: Chemin): boolean => gabarit.some((motif) => {
  const lu = segments(motif);
  return lu.length <= chemin.length && lu.every((segment, rang) => correspond(segment, chemin[rang]));
});

/** Le chemin lu mène à un chemin du gabarit : c'est un conteneur que la projection traverse et dont elle garde la forme. */
const traverse = (gabarit: Gabarit, chemin: Chemin): boolean => gabarit.some((motif) => {
  const lu = segments(motif);
  return chemin.length < lu.length && chemin.every((segment, rang) => correspond(lu[rang], segment));
});

/** Les chemins que la famille lit sur ces données et que le gabarit ne couvre pas. */
function accesHorsGabarit(famille: NomDeFamille, gabarit: Gabarit, donnees: Donnees): string[] {
  const lus = new Map<string, Chemin>();
  const enveloppe = enregistrerLesAcces(donnees, (chemin) => lus.set(chemin.join('.'), chemin));
  lancer(famille, enveloppe.releve, enveloppe.catalogue);
  assert.ok(lus.size > 0, `${famille} : la famille lit des données`);
  return [...lus].filter(([, chemin]) => !couvert(gabarit, chemin) && !traverse(gabarit, chemin)).map(([cle]) => cle);
}

/* ---------- Les perturbations ---------- */

function feuilles(valeur: unknown, chemin: string[] = []): string[][] {
  if (typeof valeur !== 'object' || valeur === null) return [chemin];
  return Object.entries(valeur).flatMap(([cle, enfant]) => feuilles(enfant, [...chemin, cle]));
}

function lire(racine: unknown, chemin: readonly string[]): unknown {
  return chemin.reduce<unknown>((courant, cle) => (courant as Record<string, unknown>)[cle], racine);
}

function poser(racine: unknown, chemin: readonly string[], valeur: unknown): void {
  (lire(racine, chemin.slice(0, -1)) as Record<string, unknown>)[chemin[chemin.length - 1]] = valeur;
}

function altere(valeur: unknown): unknown {
  if (typeof valeur === 'string') return `${valeur}‡`;
  if (typeof valeur === 'number') return valeur + 1;
  if (typeof valeur === 'boolean') return !valeur;
  return 'altéré';
}

/** Chaque feuille que le gabarit ne couvre pas, altérée seule sur des données neuves : les chemins dont les constats changent. */
function perturbationsQuiChangentLaSortie(famille: NomDeFamille, gabarit: Gabarit, jeu: Jeu): { changees: string[]; essayees: number } {
  const base = lancer(famille, jeu.neuf().releve, jeu.neuf().catalogue);
  const changees: string[] = [];
  let essayees = 0;
  for (const chemin of feuilles(jeu.neuf())) {
    if (couvert(gabarit, chemin)) continue;
    const donnees = jeu.neuf();
    poser(donnees, chemin, altere(lire(donnees, chemin)));
    essayees += 1;
    if (!egalesExactement(lancer(famille, donnees.releve, donnees.catalogue), base)) changees.push(chemin.join('.'));
  }
  return { changees, essayees };
}

/** Chaque feuille que le gabarit couvre, altérée seule : celles dont la projection reste égale. */
function feuillesCouvertesSansEffet(gabarit: Gabarit, jeu: Jeu): string[] {
  const projection = (donnees: Donnees) => projeter({ ...donnees, niveau: 'AAA' }, gabarit);
  const base = projection(jeu.neuf());
  return feuilles(jeu.neuf()).filter((chemin) => {
    if (!couvert(gabarit, chemin)) return false;
    const donnees = jeu.neuf();
    poser(donnees, chemin, altere(lire(donnees, chemin)));
    return egalesExactement(projection(donnees), base);
  }).map((chemin) => chemin.join('.'));
}

for (const famille of FAMILLES_DE_CONTROLES) {
  for (const jeu of JEUX) {
    test(`${famille} : tout ce que la famille lit sur le ${jeu.nom} est dans son gabarit`, () => {
      assert.deepEqual(accesHorsGabarit(famille, GABARITS[famille], jeu.neuf()), []);
    });

    test(`${famille} : altérer une donnée hors gabarit du ${jeu.nom} laisse les constats identiques`, () => {
      const { changees, essayees } = perturbationsQuiChangentLaSortie(famille, GABARITS[famille], jeu);
      assert.ok(essayees > 0, 'des données hors gabarit sont altérées');
      assert.deepEqual(changees, []);
    });

    test(`${famille} : altérer une donnée du gabarit sur le ${jeu.nom} change la projection`, () => {
      assert.deepEqual(feuillesCouvertesSansEffet(GABARITS[famille], jeu), []);
    });
  }

  test(`${famille} : le relevé riche donne des constats, donc les branches de la famille tournent`, () => {
    const { releve, catalogue } = JEUX[0].neuf();
    assert.ok(lancer(famille, releve, catalogue).length > 0);
  });
}

/* ---------- Les altérations ---------- */

test('un gabarit qui omet un champ lu est refusé par l’enregistrement des accès', () => {
  const sansOpacite = GABARITS['controle-accessibilite'].filter((chemin) => !chemin.endsWith('.opacite'));
  assert.notEqual(sansOpacite.length, GABARITS['controle-accessibilite'].length);
  assert.deepEqual(accesHorsGabarit('controle-accessibilite', sansOpacite, JEUX[0].neuf()).map((chemin) => chemin.replace(/\.\d+\./g, '.#.')).filter((chemin, rang, tous) => tous.indexOf(chemin) === rang), ['releve.variants.#.layers.#.opacite']);
});

test('un gabarit qui omet un champ lu est refusé par les perturbations', () => {
  const sansValeurs = GABARITS['controle-nommage'].filter((chemin) => chemin !== 'releve.proprietes.*.valeurs');
  const { changees } = perturbationsQuiChangentLaSortie('controle-nommage', sansValeurs, JEUX[0]);
  assert.ok(changees.some((chemin) => /^releve\.proprietes\.\d+\.valeurs\./.test(chemin)), changees.join(', '));
});

/* ---------- Ce qui change quelle projection ---------- */

type Modification = (donnees: Donnees, niveau: { valeur: Niveau }) => void;

interface Scenario {
  nom: string;
  modifier: Modification;
  /** Les familles dont la projection change. */
  projections: NomDeFamille[];
  /** Parmi elles, celles dont les constats changent au moins sur le relevé riche : la modification est lue, pas seulement copiée. */
  constatsAuMoins: NomDeFamille[];
  /** Le jeu de données de départ ; le relevé riche par défaut. */
  jeu?: number;
}

const premierLayer = (donnees: Donnees, nom: string) => donnees.releve.variants[0].layers.find((layer) => layer.nom === nom)!;
const variableDe = (donnees: Donnees, cle: string) => donnees.catalogue.variables.find((variable) => variable.cle === cle)!;

const SCENARIOS: readonly Scenario[] = [
  {
    nom: 'la peinture d’un calque', projections: ['controle-accessibilite'], constatsAuMoins: ['controle-accessibilite'],
    modifier: ({ releve }) => {
      // Le constat retient le pire cas de tous les variants : il faut les peindre tous.
      for (const variant of releve.variants) variant.layers.find((layer) => layer.nom === 'Label')!.texte!.plages[1].peintures[0].couleur = { r: 0.9, g: 0.9, b: 0.9, a: 1 };
    },
  },
  {
    nom: 'la taille d’un texte', projections: ['controle-accessibilite'], constatsAuMoins: ['controle-accessibilite'],
    modifier: (donnees) => { premierLayer(donnees, 'Label').texte!.plages[0].fontSize = 8; },
  },
  {
    nom: 'le style d’un texte', projections: ['controle-typographie'], constatsAuMoins: ['controle-typographie'],
    modifier: (donnees) => { premierLayer(donnees, 'Label').texte!.style = null; },
  },
  {
    nom: 'le nom d’un calque',
    projections: ['controle-mapping', 'controle-couches', 'controle-accessibilite', 'controle-typographie', 'controle-theme'],
    constatsAuMoins: ['controle-accessibilite'],
    modifier: (donnees) => { premierLayer(donnees, 'Root').nom = 'Racine'; },
  },
  {
    nom: 'l’ajout d’un calque lié',
    projections: ['controle-mapping', 'controle-couches', 'controle-oublis', 'controle-accessibilite', 'controle-typographie', 'controle-theme'],
    constatsAuMoins: ['controle-accessibilite', 'controle-typographie', 'controle-theme'],
    modifier: ({ releve }) => {
      const racine = releve.variants[0].layers[0];
      releve.variants[0].layers.push({
        id: 'neuf', nom: 'Neuf', type: 'TEXT', parent: racine.id, visible: true, opacite: 1, dimensions: { x: 0, y: 0, largeur: 10, hauteur: 10 }, peintures: [], valeursEnDur: [],
        liaisons: [{ champ: 'fills', porteur: 'neuf', variable: { id: 'id-t-fg', cle: 't-fg', nom: 'surface/foreground', collection: 'theme', distante: false } }],
        texte: { style: null, plages: [{ debut: 0, fin: 1, fontSize: 14, fontWeight: 400, peintures: [], liaisons: [] }] },
      });
    },
  },
  {
    nom: 'la valeur d’une variable de taille', projections: ['controle-accessibilite', 'controle-structure'], constatsAuMoins: [],
    modifier: (donnees) => { variableDe(donnees, 'b-rayon').valeurs!.l = { valeur: 9 }; },
  },
  {
    nom: 'l’alias d’une variable liée', projections: ['controle-mapping', 'controle-couches', 'controle-accessibilite', 'controle-structure'], constatsAuMoins: ['controle-accessibilite'],
    modifier: (donnees) => { variableDe(donnees, 'b-fond').valeurs!.l = { alias: 't-secondary' }; },
  },
  {
    nom: 'la portée d’une variable', projections: ['controle-mapping'], constatsAuMoins: ['controle-mapping'],
    modifier: (donnees) => { variableDe(donnees, 'b-fond').scopes = ['STROKE_COLOR']; },
  },
  {
    nom: 'le nom d’une variable du composant',
    projections: ['controle-nommage', 'controle-mapping', 'controle-couches', 'controle-oublis', 'controle-accessibilite', 'controle-typographie', 'controle-theme', 'controle-structure'],
    constatsAuMoins: ['controle-oublis'],
    modifier: (donnees) => { variableDe(donnees, 'b-fond-hover').nom = 'Button/color/primary/contained/pressed/background'; },
  },
  {
    nom: 'le niveau d’accessibilité', projections: ['controle-accessibilite'], constatsAuMoins: ['controle-accessibilite'],
    modifier: (_donnees, niveau) => { niveau.valeur = 'AA'; },
  },
  {
    nom: 'la lecture d’une page de variants', projections: ['controle-oublis'], constatsAuMoins: ['controle-oublis'],
    modifier: ({ releve }) => { releve.lecture.variantsNonLus = ['v-inconnu']; },
  },
  {
    nom: 'la liaison d’un variant de wrapper', projections: ['controle-oublis'], constatsAuMoins: ['controle-oublis'], jeu: JEU_A_WRAPPER,
    modifier: ({ releve }) => { releve.wrappers![0].variants[0].liaisons[0].variable.cle = 'b-rayon'; },
  },
  {
    nom: 'l’espace de couleur du relevé', projections: [], constatsAuMoins: [],
    modifier: ({ releve }) => { releve.espaceDeCouleur = 'display-p3'; },
  },
];

function etat(modifier?: Modification, jeu = 0) {
  const donnees = JEUX[jeu].neuf();
  const niveau: { valeur: Niveau } = { valeur: 'AAA' };
  modifier?.(donnees, niveau);
  return { donnees, niveau: niveau.valeur };
}

for (const scenario of SCENARIOS) {
  test(`changer ${scenario.nom} ne change que les projections qui le lisent`, () => {
    const avant = etat(undefined, scenario.jeu);
    const apres = etat(scenario.modifier, scenario.jeu);
    const projectionsChangees: NomDeFamille[] = [];
    const constatsChanges: NomDeFamille[] = [];
    for (const famille of FAMILLES_DE_CONTROLES) {
      const projection = (e: typeof avant) => PROJECTIONS[famille](e.donnees.releve, e.donnees.catalogue, { niveau: e.niveau });
      if (!egalesExactement(projection(avant), projection(apres))) projectionsChangees.push(famille);
      const constats = (e: typeof avant) => lancer(famille, e.donnees.releve, e.donnees.catalogue, e.niveau);
      if (!egalesExactement(constats(avant), constats(apres))) constatsChanges.push(famille);
    }
    assert.deepEqual(projectionsChangees, scenario.projections, 'projections changées');
    assert.deepEqual(constatsChanges.filter((famille) => !projectionsChangees.includes(famille)), [], 'aucune famille ne change de constats sans que sa projection change');
    assert.deepEqual(scenario.constatsAuMoins.filter((famille) => !constatsChanges.includes(famille)), [], 'la modification est lue par ces familles');
  });
}

test('une projection garde la forme de ce qu’elle traverse', () => {
  const gabarit = ['a.*.b', 'c.*', 'd.e'];
  const source = { a: [{ b: 1, x: 2 }, { x: 3 }], c: { k1: { z: 1 }, k2: 2 }, d: { e: undefined, f: 1 }, g: 4 };
  const projetee = projeter(source, gabarit) as Record<string, unknown>;
  assert.deepEqual(projetee, { a: [{ b: 1 }, {}], c: { k1: { z: 1 }, k2: 2 }, d: { e: undefined } });
  assert.equal((projetee.c as Record<string, unknown>).k1, source.c.k1, 'un chemin qui s’arrête garde le sous-arbre tel quel');
  assert.deepEqual(Object.keys(projeter({ a: [{ b: 1 }, { b: 1 }] }, ['a.*.b']) as object), ['a']);
  assert.notDeepEqual(projeter({ a: [{ b: 1 }] }, ['a.*.b']), projeter({ a: [{ b: 1 }, { b: 1 }] }, ['a.*.b']), 'la longueur d’une liste traversée compte');
  assert.notDeepEqual(projeter({ c: { k1: 1 } }, ['c.*']), projeter({ c: { k1: 1, k2: 1 } }, ['c.*']), 'les clés d’un objet énuméré comptent');
  assert.equal(egalesExactement(projeter({ d: {} }, ['d.e']), projeter({ d: { e: undefined } }, ['d.e'])), false, 'un champ absent diffère d’un champ qui vaut undefined');
  assert.throws(() => projeter({}, ['a.*.b', 'a.c']), /partagent/);
});

/* ---------- La reprise d'une famille ---------- */

function entreeRetenue(): { entree: EntreeDeSessionDAnalyse; resultats: Record<string, readonly Constat[]> } {
  const { releve, catalogue } = JEUX[0].neuf();
  const resultats: Record<string, readonly Constat[]> = {};
  for (const famille of FAMILLES_DE_CONTROLES) resultats[famille] = lancer(famille, releve, catalogue);
  const requetes = Object.fromEntries(FAMILLES_DE_CONTROLES.filter((famille) => famille !== 'controle-structure').map((famille) => [famille, { resultat: resultats[famille], entrees: ['releve', 'catalogue'] }]));
  const entree = { sujet: 'Button', rang: 1, sorties: { releve, catalogue, niveau: 'AAA' }, requetes, suivi: {} } as unknown as EntreeDeSessionDAnalyse;
  return { entree, resultats };
}

/** Les familles que la demande a calculées, sur des données `actuelles` autres que celles de l'entrée. */
async function famillesRejouees(entree: EntreeDeSessionDAnalyse | null, modifier: Modification): Promise<{ rejouees: NomDeFamille[]; reprises: NomDeFamille[] }> {
  const { donnees, niveau } = etat(modifier);
  const actuelles = new Map<'releve' | 'catalogue' | 'niveau', unknown>([['releve', donnees.releve], ['catalogue', donnees.catalogue], ['niveau', niveau]]);
  const { famille } = creerLesRequetes(entree, actuelles as never);
  const rejouees: NomDeFamille[] = [];
  const reprises: NomDeFamille[] = [];
  for (const nom of FAMILLES_DE_CONTROLES) {
    let calculee = false;
    const resultat = await famille(nom, async () => { calculee = true; return lancer(nom, donnees.releve, donnees.catalogue, niveau); });
    (calculee ? rejouees : reprises).push(nom);
    if (entree && !calculee) assert.equal(resultat, (entree.requetes[nom] as { resultat: unknown }).resultat, `${nom} : le résultat repris est celui de l’entrée`);
  }
  return { rejouees, reprises };
}

test('une famille dont la projection est égale est reprise, les autres se calculent, même quand le relevé a changé', async () => {
  const { entree } = entreeRetenue();
  const peinture = await famillesRejouees(entree, SCENARIOS[0].modifier);
  assert.deepEqual(peinture.rejouees, ['controle-accessibilite', 'controle-structure']);
  assert.deepEqual(peinture.reprises, ['controle-nommage', 'controle-mapping', 'controle-couches', 'controle-oublis', 'controle-typographie', 'controle-theme']);
});

test('la reprise suit la projection : un nom de calque rejoue cinq familles, un texte une seule', async () => {
  const { entree } = entreeRetenue();
  const nom = await famillesRejouees(entree, SCENARIOS[3].modifier);
  assert.deepEqual(nom.rejouees, ['controle-mapping', 'controle-couches', 'controle-accessibilite', 'controle-typographie', 'controle-theme', 'controle-structure']);
  const niveau = await famillesRejouees(entree, SCENARIOS[9].modifier);
  assert.deepEqual(niveau.rejouees, ['controle-accessibilite', 'controle-structure']);
});

test('sans changement, toute famille que l’entrée a jugée est reprise ; sans entrée, toutes se calculent', async () => {
  const { entree } = entreeRetenue();
  assert.deepEqual((await famillesRejouees(entree, () => {})).rejouees, ['controle-structure'], 'la structure n’est pas dans l’entrée : elle se calcule');
  assert.deepEqual((await famillesRejouees(null, () => {})).reprises, []);
});

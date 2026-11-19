/**
 * Ce que l'inventaire lit dans le dépôt : le kit compilé, le moteur de couleur, le hub, la CLI, le socle et les fichiers du
 * dépôt. Chaque fonction rend des données, jamais du HTML ; `generer-inventaire.ts` les met en forme.
 *
 * Une lecture qui ne trouve pas ce qu'elle attend lève une erreur qui nomme le fichier : l'inventaire ne s'écrit pas avec une
 * section vide. Les phrases qu'aucun fichier ne porte (une par script npm) restent ici, et un script npm sans phrase fait échouer
 * la lecture, comme une phrase sans script.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { TOKENS_FORMAT_VERSION, VERSIONS_DE_TOKENS_LUES, CONTRACT_VERSION, tokenCssVariable } from '@ucm-kit/core/format';
import { VERSION_CONTRAT_MINIMALE, sectionEcartsDeParite } from '@ucm-kit/core/lecteurs';
import { FENETRE_DE_LA_RECETTE } from '@ucm-kit/core/protocoles';
import * as controlesBrut from '@ucm-kit/core/controles';
import * as referentielBrut from '@ucm-kit/core/referentiel';
import * as emploisBrut from '@ucm-kit/core/emplois';
import type { FondDeGarantie } from '@ucm-kit/core/emplois';
import { sectionDe, tableauDe } from './extraire';
import { PREREGLAGES, couleurDeLaCarte, ecrireHexa, rampesDe, recetteParDefaut, type Recette } from 'ucm-couleur';

import { ELEMENT_DE_LA_FAMILLE } from '../../packages/plugin-architect/src/ui/panneau/elements';
import { TEXTES_ELEMENTS } from '../../packages/plugin-architect/src/ui/textes/elements';
import { recetteDeDemonstration } from '../../packages/hub/src/modele/modele';
import { svgDeLAlerte } from '../../packages/plugin-socle/src/ui/Alerte';

/**
 * Les noms que l'inventaire lit dans chaque module du kit dont il couvre les exports. Chaque module se lit à travers un
 * `Proxy` posé sur une copie : un nom lu s'y inscrit, et `couverture.ts` écarte ceux que la page ne montre pas.
 */
export const NOMS_LUS: Readonly<Record<'referentiel' | 'emplois' | 'controles', Set<string>>> = { referentiel: new Set(), emplois: new Set(), controles: new Set() };

function suivre<T extends object>(module: keyof typeof NOMS_LUS, contenu: T): T {
  return new Proxy({ ...contenu }, {
    get(cible, nom, receveur) {
      if (typeof nom === 'string') NOMS_LUS[module].add(nom);
      return Reflect.get(cible, nom, receveur);
    },
  });
}
const { CIBLE_MINIMALE_PX, CIBLE_TACTILE_PX, CODES_DES_CONSTATS, TEXTE_MINIMAL_PX } = suivre('controles', controlesBrut);
const {
  CIBLES_DES_COLLECTIONS,
  COLLECTIONS,
  COLLECTIONS_SANS_PORTEE,
  FAMILLES_BRANDS,
  FAMILLES_COMPOSANT,
  FAMILLES_DE_SIGNES,
  FAMILLES_UTILITY,
  REGISTRE_PROPRIETES_COMPOSANT,
  REGISTRE_TAILLES,
  FAMILLES_PRIMITIVES,
  FAMILLES_LAYOUT,
  FAMILLES_TYPOGRAPHY,
  MODES,
  REGISTRE_MESURES_LAYOUT,
  REGISTRE_VALEURS_DIMENSIONNELLES,
  REGISTRE_VALEURS_TYPOGRAPHIQUES,
  REPRISES_DE_SIGNES,
  REGISTRES,
  REGISTRES_ARCHITECTURE,
  REGISTRES_COMPOSANTS,
  PRODUITS,
  CONVENTIONS,
  ETATS,
  DOSSIERS,
  PROFILS,
  SORTES_D_IMBRIQUE,
  LONGUEUR_MINIMALE_D_UNE_FAUTE_A_DEUX_LETTRES,
  LONGUEUR_MINIMALE_D_UNE_FAUTE_A_UNE_LETTRE,
  LONGUEUR_MINIMALE_D_UNE_FAUTE_D_UN_MOT_COURT,
  SIGNES,
  TYPES_D_ALERTE,
  svgDuSigne,
} = suivre('referentiel', referentielBrut);
const {
  COULEUR_DU_TEXTE_DES_BOUTONS,
  GARANTIES,
  NIVEAUX_D_ELEVATION_DU_THEME,
  TEXTE_DES_BOUTONS_PAR_DEFAUT,
  VARIABLES_DE_PALETTE,
  VARIABLES_DU_NEUTRE,
  VARIABLES_DU_THEME,
  VARIABLES_GLOBALES,
  cibleDeLaVariable,
} = suivre('emplois', emploisBrut);

export const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Un fichier du dépôt, en LF. */
export function lire(chemin: string): string {
  const complet = path.join(RACINE, chemin);
  if (!existsSync(complet)) throw new Error(`Fichier absent du dépôt : ${chemin}`);
  return readFileSync(complet, 'utf8').replace(/\r\n/g, '\n');
}
const liste = (chemin: string): string[] => readdirSync(path.join(RACINE, chemin));
const dossiers = (chemin: string): string[] => liste(chemin).filter((nom) => statSync(path.join(RACINE, chemin, nom)).isDirectory());
const json = (chemin: string) => JSON.parse(lire(chemin));

// ---------- Les versions ----------

export interface Versions {
  kit: string;
  cli: string;
  adaptateur: string;
  contrat: string;
  contratMinimal: string;
  tokens: number;
  tokensLus: readonly number[];
  recette: number;
  recettePremiere: number;
}

export function versions(): Versions {
  return {
    kit: json('packages/kit/package.json').version,
    cli: json('packages/cli/package.json').version,
    adaptateur: json('packages/adapter-typescript/package.json').version,
    contrat: CONTRACT_VERSION,
    contratMinimal: VERSION_CONTRAT_MINIMALE,
    tokens: TOKENS_FORMAT_VERSION,
    tokensLus: VERSIONS_DE_TOKENS_LUES,
    recette: FENETRE_DE_LA_RECETTE.courante,
    recettePremiere: FENETRE_DE_LA_RECETTE.premiere,
  };
}

// ---------- Le référentiel du panneau des variables ----------

const termes = (registre: { readonly termes: readonly { readonly id: string }[] }): string[] => registre.termes.map((terme) => terme.id);

/** Ce que le panneau des variables lit : collections, familles, table du thème par mode et par sens, garanties. */
export function referencePourLePanneau() {
  const sens = ['normal', 'inverse'] as const;
  const familleDe = (variable: string): string =>
    (VARIABLES_DE_PALETTE as readonly string[]).includes(variable)
      ? 'palette'
      : (VARIABLES_DU_NEUTRE as readonly string[]).includes(variable)
        ? 'neutre'
        : (VARIABLES_GLOBALES as readonly string[]).includes(variable)
          ? 'globale'
          : 'elevation';
  return {
    couleursAbsolues: { white: COULEUR_DU_TEXTE_DES_BOUTONS.blanc, black: COULEUR_DU_TEXTE_DES_BOUTONS.noir },
    niveauxElevation: NIVEAUX_D_ELEVATION_DU_THEME,
    collections: COLLECTIONS.map((nom) => ({
      nom,
      cibles: CIBLES_DES_COLLECTIONS[nom],
      scope: !(COLLECTIONS_SANS_PORTEE as readonly string[]).includes(nom),
    })),
    familles: Object.fromEntries(famillesParCollection().map(({ collection, familles }) => [collection, familles])),
    registres: {
      valeursDimensionnelles: termes(REGISTRE_VALEURS_DIMENSIONNELLES),
      mesuresLayout: termes(REGISTRE_MESURES_LAYOUT),
      valeursTypographiques: termes(REGISTRE_VALEURS_TYPOGRAPHIQUES),
    },
    theme: VARIABLES_DU_THEME.map((variable) => ({
      variable,
      famille: familleDe(variable),
      cibles: Object.fromEntries(MODES.flatMap((mode) => sens.map((s) => [`${mode}-${s}`, cibleDeLaVariable(variable, mode, s) ?? null]))),
    })),
    garanties: GARANTIES.map((garantie) => ({ numero: garantie.numero, variable: garantie.premier.variable })),
  };
}

/** Les garanties en lignes de tableau : variable, fonds regroupés par famille, seuil. */
export function lignesDesGaranties(): { numero: number; variable: string; fonds: string; seuil: string }[] {
  const nomDuFond = (fond: FondDeGarantie): { famille: string; etat: string } => {
    if ('fondDeLaPage' in fond) return { famille: '', etat: 'page' };
    if ('fondDeLaCarte' in fond) return { famille: '', etat: 'carte' };
    const [famille, etat] = fond.variable.split('/');
    return { famille, etat };
  };
  return GARANTIES.map((garantie) => {
    const groupes: { famille: string; etats: string[] }[] = [];
    for (const fond of garantie.fonds) {
      const { famille, etat } = nomDuFond(fond);
      const dernier = groupes[groupes.length - 1];
      if (dernier && dernier.famille === famille) dernier.etats.push(etat);
      else groupes.push({ famille, etats: [etat] });
    }
    return {
      numero: garantie.numero,
      variable: garantie.premier.variable,
      fonds: groupes.map((groupe) => `${groupe.famille ? `${groupe.famille} ` : ''}${groupe.etats.join(', ')}`).join(', '),
      seuil: garantie.seuil === 'texte' ? 'texte 4,5:1' : 'non-texte 3:1',
    };
  });
}

// ---------- Les couleurs ----------

/** La clarté OKLCH des courbes du préréglage à 11 nuances : la page dessine les rampes de ses deux modes avec elle. */
export function clarteDesCrans() {
  const onze = PREREGLAGES[11];
  return { crans: onze.crans, clarte: { light: onze.courbes.light, dark: onze.courbes.dark } };
}

/**
 * Les rampes des six palettes de démonstration du hub, par intensité, mode et sens du thème. Le sens inverse change les crans
 * 500 à 800 par le texte des boutons de chaque mode : la page lit les deux jeux.
 */
export function donneesDesPalettes() {
  const base = recetteDeDemonstration();
  const autre = (texte: string) => (texte === 'blanc' ? 'noir' : 'blanc');
  const texteInverse = Object.fromEntries(MODES.map((mode) => [mode, autre(TEXTE_DES_BOUTONS_PAR_DEFAUT[mode])])) as Recette['texteDesBoutons'];
  const recettes = { normal: { ...base, texteDesBoutons: { ...TEXTE_DES_BOUTONS_PAR_DEFAUT } } as Recette, inverse: { ...base, texteDesBoutons: texteInverse } as Recette };
  const palettes = base.palettes.map((palette, rang) => {
    const intensites: Record<string, Record<string, string[]>> = {};
    for (const [sens, recette] of Object.entries(recettes)) {
      const rampes = rampesDe(recette, recette.palettes[rang]) as Record<string, Record<string, readonly { readonly hexa: string }[]>>;
      for (const intensite of Object.keys(rampes)) {
        intensites[intensite] ??= {};
        for (const mode of MODES) intensites[intensite][`${mode}-${sens}`] = rampes[intensite][mode].map((cran) => cran.hexa);
      }
    }
    return { nom: palette.nom, reference: palette.reference, intensites };
  });
  return {
    crans: base.crans,
    fonds: base.fonds,
    palettes,
    cartes: Object.fromEntries(MODES.map((mode) => [mode, ecrireHexa(couleurDeLaCarte(base, mode))])),
    bouton: { variableCss: tokenCssVariable('components.button.color.primary.contained.default.background') },
  };
}

// ---------- Les codes de constat ----------

/** La section du panneau d'Architect qui range les constats de la vue Tokens : aucun élément du composant ne les porte. */
const CODES_DE_LA_VUE_TOKENS: readonly string[] = ['C60', 'C63', 'C82'];

/** Un code, sa section, son sens et ses types, dans l'ordre des sections du panneau puis du catalogue. */
export function codesDesConstats(): [string, string, string, readonly string[]][] {
  const libelles = TEXTES_ELEMENTS.elementsDuPanneau.libelles as Readonly<Record<string, string>>;
  const ordre = Object.keys(libelles);
  const section = (code: string, famille: keyof typeof ELEMENT_DE_LA_FAMILLE): string =>
    CODES_DE_LA_VUE_TOKENS.includes(code) ? 'Vue Tokens' : libelles[ELEMENT_DE_LA_FAMILLE[famille]];
  const lignes = CODES_DES_CONSTATS.map((entree) => ({
    entree,
    section: section(entree.code, entree.familles[0]),
    rang: CODES_DE_LA_VUE_TOKENS.includes(entree.code) ? ordre.length : ordre.indexOf(ELEMENT_DE_LA_FAMILLE[entree.familles[0]]),
  }));
  lignes.sort((a, b) => a.rang - b.rang);
  return lignes.map(({ entree, section: nom }) => [entree.code, nom, entree.sens, entree.types]);
}

// ---------- Les paquets, leurs points d'entrée, leurs tests ----------

const PAQUETS: Readonly<Record<string, string>> = {
  'plugin-palettes': 'UCM Palettes',
  'plugin-architect': 'UCM Architect',
  'plugin-exporter': 'Contract Exporter',
  'plugin-socle': 'Socle',
  cli: 'CLI',
  'adapter-typescript': 'Adaptateur TypeScript',
  kit: 'Kit',
  couleur: 'Moteur de couleur',
  hub: 'Hub UCM',
};

function fichiersDeTest(dossier: string): number {
  let compte = 0;
  for (const entree of readdirSync(dossier, { withFileTypes: true })) {
    if (entree.name === 'node_modules') continue;
    const complet = path.join(dossier, entree.name);
    if (entree.isDirectory()) compte += fichiersDeTest(complet);
    else if (/\.test\.(ts|tsx|mjs|cjs)$/.test(entree.name)) compte++;
  }
  return compte;
}

/** Les paquets de `packages/`, dans l'ordre de la page, avec leur nombre de fichiers de test. */
export function paquets(): { dossier: string; libelle: string; fichiersDeTest: number }[] {
  const presents = dossiers('packages');
  const sansLibelle = presents.filter((nom) => !(nom in PAQUETS));
  const disparus = Object.keys(PAQUETS).filter((nom) => !presents.includes(nom));
  if (sansLibelle.length || disparus.length) {
    throw new Error(`Les paquets de packages/ ont changé. Sans libellé : ${sansLibelle.join(', ') || 'aucun'}. Libellé sans paquet : ${disparus.join(', ') || 'aucun'}.`);
  }
  return Object.entries(PAQUETS).map(([dossier, libelle]) => ({ dossier, libelle, fichiersDeTest: fichiersDeTest(path.join(RACINE, 'packages', dossier)) }));
}

/** Les points d'entrée du kit : leur nom, et les noms qu'ils exportent. */
export async function pointsDEntree(): Promise<{ entree: string; noms: string[] }[]> {
  const exportsDuKit = json('packages/kit/package.json').exports as Record<string, { default?: string }>;
  const entrees = Object.entries(exportsDuKit).filter(([, cible]) => typeof cible === 'object' && /.m?js$/.test(cible.default ?? ''));
  return Promise.all(entrees.map(async ([entree]) => ({ entree, noms: Object.keys(await import(`@ucm-kit/core/${entree.slice(2)}`)) })));
}

/** Le nombre de noms uniques que les points d'entrée exportent, et le total avec les doublons. */
export function nomsExportes(entrees: readonly { noms: readonly string[] }[]): { uniques: number; total: number } {
  return { uniques: new Set(entrees.flatMap(({ noms }) => noms)).size, total: entrees.reduce((somme, { noms }) => somme + noms.length, 0) };
}

function fichiersDeSource(dossier: string): string[] {
  return readdirSync(dossier, { withFileTypes: true }).flatMap((entree) => {
    if (entree.name === 'node_modules') return [];
    const complet = path.join(dossier, entree.name);
    return entree.isDirectory() ? fichiersDeSource(complet) : /\.(mjs|ts|js)$/.test(entree.name) ? [complet] : [];
  });
}

/** Le nombre de noms que la CLI et l'adaptateur importent de `@ucm-kit/core`, sans doublon. */
export function symbolesImportes(): number {
  const noms = new Set<string>();
  for (const dossier of ['packages/cli/src', 'packages/adapter-typescript/src']) {
    for (const fichier of fichiersDeSource(path.join(RACINE, dossier))) {
      const texte = readFileSync(fichier, 'utf8');
      for (const trouve of texte.matchAll(/import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+["']@ucm-kit\/core\/[^"']+["']/g)) {
        for (const brut of trouve[1].split(',').map((nom) => nom.trim()).filter(Boolean)) {
          noms.add(brut.replace(/^type\s+/, '').split(/\s+as\s+/)[0]);
        }
      }
    }
  }
  return noms.size;
}

export const nombreDAides = (): number => liste('packages/cli/aides').filter((nom) => nom.endsWith('.md')).length;

/**
 * Les `COMMANDES` de la CLI : un retour à la ligne d'un rôle ou d'une note devient une espace. Le module de la CLI a un
 * `await` de tête (sa garde de lancement) : `require` le refuse, il ne se lit que par `import()`, d'où une lecture asynchrone.
 */
export async function commandes(): Promise<{ nom: string; role: string; note: string; options: string[] }[]> {
  const { COMMANDES } = await import('../../packages/cli/src/ucm.mjs');
  const phrase = (texte: string): string => texte.replace(/\s*\n\s*/g, ' ');
  return COMMANDES.map((commande) => ({
    nom: commande.nom,
    role: phrase(commande.role),
    note: 'note' in commande && commande.note ? phrase(commande.note as string) : '',
    options: commande.options.map((option) => option.nom),
  }));
}

// ---------- Le contrat du Button ----------

/** La taille du contrat de recette du Button, ses props et ses variants. */
export function contratDuButton() {
  const chemin = 'packages/kit/fixtures/contrats/13.0/Button.contract.json';
  const contrat = JSON.parse(lire(chemin));
  return {
    chemin,
    version: contrat.meta.contractVersion as string,
    octets: statSync(path.join(RACINE, chemin)).size,
    props: Object.keys(contrat.props).length,
    variants: contrat.variants.length,
  };
}

// ---------- Le rapport d'ucm check ----------

/** Les phrases du commentaire de pull request pour un `Button.tsx` sans prop `size`. */
export function rapportDuButton() {
  const bilan = {
    fichier: 'src/components/Button/Button.contract.json',
    parite: { interfaceAbsente: null, fonctionAbsente: null, manquantes: ['size'], typesIncorrects: [], valeursNonImplementees: [], booleensNonUtilises: [], enumsSansEffet: [], compositionsIncorrectes: [] },
  };
  const texte = sectionEcartsDeParite([bilan]).join('\n');
  const prendre = (motif: RegExp, nom: string): string => {
    const trouve = texte.match(motif);
    if (!trouve) throw new Error(`Le rapport de parité n'a plus la phrase « ${nom} » : ${texte}`);
    return trouve[1];
  };
  const dansLeCode = (fichier: string, motif: RegExp, nom: string): string => {
    const trouve = lire(fichier).match(motif);
    if (!trouve) throw new Error(`${fichier} n'écrit plus le titre « ${nom} »`);
    return trouve[1];
  };
  return {
    vert: dansLeCode('packages/kit/src/lecteurs/controle-repository.mjs', /`## \$\{[^}]+\} (Aucun blocage[^`]*)`/, 'Aucun blocage détecté'),
    rouge: dansLeCode('packages/kit/src/lecteurs/verdict-bilan.mjs', /`## \$\{[^}]+\} (Les contrôles du repository bloquent[^`]*)`/, 'Les contrôles du repository bloquent la fusion'),
    titre: prendre(/### [^ ]+ (.*)\n/, 'titre'),
    ecart: prendre(/\n- (La propriété `size`[^\n]*)/, 'écart'),
    action: prendre(/#### Action\n\n([^\n]*)/, 'action'),
    fin: prendre(/(Cet écart n'empêche pas la fusion\.)/, 'fin'),
  };
}

// ---------- Les annexes ----------

/** Les signes et leurs familles, avec le dessin de chacun, puis les formes d'alerte. */
export function signesEtAlertes() {
  const origine = (id: string): string => {
    const signe = SIGNES.find((candidat) => candidat.id === id);
    const famille = FAMILLES_DE_SIGNES.find((candidat) => candidat.id === signe?.famille);
    if (!famille) throw new Error(`Signe repris sans famille : ${id}`);
    return famille.libelle;
  };
  const familles = FAMILLES_DE_SIGNES.map((famille) => ({
    id: famille.id,
    libelle: famille.libelle,
    signes: SIGNES.filter((signe) => signe.famille === famille.id).map((signe) => ({ id: signe.id, libelle: signe.libelle, svg: svgDuSigne(signe.id, 24) })),
    reprises: REPRISES_DE_SIGNES.filter((reprise) => reprise.famille === famille.id).flatMap((reprise) =>
      reprise.reprend.map((repris) => ({ id: repris.id, origine: origine(repris.id) })),
    ),
  }));
  const alertes = TYPES_D_ALERTE.map((type) => ({ id: type.id, libelle: type.libelle, svg: svgDeLAlerte(type.id, 24) }));
  return { familles, alertes };
}

/** Les logos et les cartes de `docs/marque/`, en SVG, avec des identifiants préfixés pour qu'aucun ne collisionne. */
export function marque() {
  const script = 'docs/marque/generer-marque.mjs';
  lire(script);
  const fichiers: { nature: 'logo' | 'carte'; titre: string; svg: string }[] = [];
  for (const [dossier, nature] of [['logos', 'logo'], ['cartes', 'carte']] as const) {
    for (const fichier of liste(`docs/marque/${dossier}`).filter((nom) => nom.endsWith('.svg')).sort()) {
      let svg = lire(`docs/marque/${dossier}/${fichier}`).trim();
      const titre = svg.match(/<title>([^<]*)<\/title>/)?.[1];
      if (titre === undefined) throw new Error(`docs/marque/${dossier}/${fichier} n'a pas de <title>`);
      svg = svg.replace(/^<svg ([^>]*)>/, (_tout, attributs: string) => `<svg ${attributs.replace(/\s(width|height)="[^"]*"/g, '')} role="img" aria-label="${titre}">`);
      const prefixe = `m-${nature}-${fichier.replace('.svg', '')}-`;
      for (const id of new Set([...svg.matchAll(/\sid="([^"]+)"/g)].map((trouve) => trouve[1]))) {
        svg = svg.split(`id="${id}"`).join(`id="${prefixe}${id}"`).split(`url(#${id})`).join(`url(#${prefixe}${id})`);
      }
      fichiers.push({ nature, titre, svg });
    }
  }
  return { script, fichiers };
}

/** Les design systems de `docs/references/` : rôles, fiches de composants, guides. */
export function references() {
  const systemes = json('docs/references/systemes.json') as { id: string; nom: string; roles: string[] }[];
  const composants = dossiers('docs/references/composants');
  const fiches: Record<string, string[]> = {};
  for (const composant of composants) {
    for (const fichier of liste(`docs/references/composants/${composant}`)) {
      const trouve = fichier.match(/^(.+)\.json$/);
      if (trouve && trouve[1] !== 'tokens') (fiches[trouve[1]] ??= []).push(composant);
    }
  }
  const tableDesRoles = lire('docs/references/README.md').split('| Rôle | Apport |')[1]?.split('\n\n')[0];
  if (tableDesRoles === undefined) throw new Error('docs/references/README.md n\'a plus la table « Rôle | Apport »');
  const roles = Object.fromEntries(
    tableDesRoles.split('\n').filter((ligne) => /^\| `/.test(ligne)).map((ligne) => {
      const [, role, apport] = ligne.split('|').map((cellule) => cellule.trim());
      return [role.replace(/`/g, ''), apport.replace(/`/g, '')];
    }),
  );
  const analyses = liste('docs/references/analyses').filter((nom) => nom.endsWith('.json')).map((nom) => nom.replace('.json', ''));
  const description = lire('.agents/skills/guide-composant/SKILL.md').match(/^description: "(.*)"$/m)?.[1];
  if (description === undefined) throw new Error('.agents/skills/guide-composant/SKILL.md n\'a plus de champ description');
  return {
    systemes: systemes.map((systeme) => ({ nom: systeme.nom, roles: systeme.roles, composants: fiches[systeme.id] ?? [] })),
    roles,
    analyses,
    skillGuide: `${description.split('. ')[0]}.`,
  };
}

function enTete(texte: string): Record<string, string> {
  const bloc = texte.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
  const champs: Record<string, string> = {};
  let cle: string | null = null;
  for (const ligne of bloc.split('\n')) {
    const paire = ligne.match(/^([a-z]+):\s*(.*)$/);
    if (paire) {
      cle = paire[1];
      champs[cle] = paire[2].replace(/^"(.*)"$/, '$1');
    } else if (cle) champs[cle] += ` ${ligne.trim()}`;
  }
  // Le front matter de rediger-diagnostics-ucm écrit « name » et « description » sur une seule ligne.
  if (champs.name && / description: /.test(champs.name)) {
    const [nom, ...reste] = champs.name.split(' description: ');
    champs.name = nom;
    champs.description = reste.join(' description: ');
  }
  return champs;
}

const premierePhrase = (texte: string): string => (texte.match(/^.*?[.!?](?=\s|$)/) ?? [texte])[0];

/** Une phrase par script npm de la racine, et le document ou le commentaire dont elle vient. */
const PHRASES_DES_SCRIPTS: Readonly<Record<string, readonly [string, string]>> = {
  typecheck: ['Vérifie les types de chaque paquet, puis ceux des tests et des scripts de la racine.', 'package.json ; AGENTS.md, « Vérification »'],
  test: ['Construit le kit, lance les tests de chaque paquet, puis les tests de la racine.', 'package.json ; AGENTS.md, « Vérification »'],
  build: ['Construit le kit puis les trois plugins Exporter, Palettes et Architect.', 'package.json ; AGENTS.md, « Vérification »'],
  schema: ['Régénère le schéma JSON du contrat, dérivé de `packages/kit/src/format/types.ts`.', 'AGENTS.md, « Vérification »'],
  pins: ['Contrôle que le registre npm sert les versions épinglées que la documentation montre.', 'scripts/pins-servis.mjs, commentaire d’en-tête'],
  cascade: ['Charge la feuille des tokens dans Chromium, Firefox et WebKit, hors de `npm test`.', 'AGENTS.md, « Vérification »'],
  start: ['Lance `npm run build`.', 'package.json'],
  'build:plugin': ['Construit le kit puis le plugin nommé (palettes, architect ou exporter).', 'AGENTS.md, « Vérification » ; scripts/construire-plugin.mjs'],
  'galerie:plugin': ['Construit le kit puis ouvre la galerie des états du plugin nommé.', 'AGENTS.md, « Vérification » ; scripts/construire-plugin.mjs'],
  'test:paquet': ['Construit le kit puis teste le paquet nommé.', 'AGENTS.md, « Vérification » ; scripts/construire-plugin.mjs'],
  'stress:f1': ['Lance le harnais de stress test des noms de Nomenclature, hors de `npm test`.', 'packages/kit/tests/stress/f1-noms/index.ts, commentaire d’en-tête'],
  'stress:rejeu': ['Rejoue des fichiers réels dans le mode Tokens et mesure les contrôles, hors de `npm test`.', 'packages/kit/tests/stress/rejeu-fichiers/index.ts, commentaire d’en-tête'],
  vues: ['Régénère le hub, la planche du moteur, les données de la vue illustrée et cet inventaire, et rend la liste de celles qui ont changé.', 'AGENTS.md, « Vérification » ; scripts/vues.mjs'],
  'agents:lire': ['Rend les fichiers à lire avant de modifier des chemins donnés, et seulement eux.', 'AGENTS.md, « Avant de modifier »'],
  'agents:domicile': ['Rend le domicile d’un fichier de `packages/*/src/`.', 'AGENTS.md, « Routage »'],
  'agents:diff': ['Rend les domiciles et documents à relire, les vérifications à lancer et les documents qui citent un chemin supprimé ou renommé.', 'AGENTS.md, « Vérification »'],
};

/** Le déclencheur, les branches et les commandes de chaque job des workflows, lus ligne à ligne. */
function jobsDuFichier(fichier: string) {
  const texte = lire(`.github/workflows/${fichier}`);
  const surBloc = texte.split(/^on:\n/m)[1]?.split(/^\S/m)[0] ?? '';
  const declencheurs = [...surBloc.matchAll(/^ {2}(\w+):/gm)].map((trouve) => trouve[1]);
  const branches = surBloc.match(/branches:\s*\[(.*?)\]/)?.[1] ?? null;
  const corps = texte.split(/^jobs:\n/m)[1] ?? '';
  const parties = corps.split(/^ {2}(?=\w[\w-]*:\n)/m).filter((partie) => /^\w[\w-]*:\n/.test(partie));
  return parties.map((partie) => {
    const id = partie.match(/^(\w[\w-]*):/)![1];
    const commandesDuJob = [...partie.matchAll(/^\s+(?:- )?run: (.+)$/gm)].map((trouve) => trouve[1].trim()).filter((commande) => commande !== '|');
    const lances = commandesDuJob.filter((commande) => !/^npm install -g|^npm ci$|^npx playwright install|^npm -v/.test(commande));
    return { fichier, id, declencheurs, branches, lances };
  });
}

/** Les skills, les agents, les scripts npm et les jobs des workflows du dépôt. */
export function outillage() {
  const skills = liste('.agents/skills')
    .filter((nom) => existsSync(path.join(RACINE, '.agents/skills', nom, 'SKILL.md')))
    .sort()
    .map((nom) => {
      const champs = enTete(lire(`.agents/skills/${nom}/SKILL.md`));
      return { nom: champs.name, description: premierePhrase(champs.description) };
    });
  const agents = liste('.claude/agents')
    .filter((nom) => nom.endsWith('.md'))
    .sort()
    .map((nom) => {
      const champs = enTete(lire(`.claude/agents/${nom}`));
      return { nom: champs.name, modele: champs.model, description: premierePhrase(champs.description) };
    });
  const noms = Object.keys(json('package.json').scripts);
  const sansPhrase = noms.filter((nom) => !(nom in PHRASES_DES_SCRIPTS));
  const sansScript = Object.keys(PHRASES_DES_SCRIPTS).filter((nom) => !noms.includes(nom));
  if (sansPhrase.length || sansScript.length) {
    throw new Error(`PHRASES_DES_SCRIPTS ne suit pas package.json. Sans phrase : ${sansPhrase.join(', ') || 'aucun'}. Phrase sans script : ${sansScript.join(', ') || 'aucun'}.`);
  }
  const scripts = noms.map((nom) => ({ nom, phrase: PHRASES_DES_SCRIPTS[nom][0], source: PHRASES_DES_SCRIPTS[nom][1] }));
  const jobs = liste('.github/workflows').filter((nom) => nom.endsWith('.yml')).sort().flatMap(jobsDuFichier);
  return { skills, agents, scripts, jobs };
}

// ---------- Les registres ----------

/** Le registre des familles de chaque collection qui en a un, dans l'ordre des collections de la page. */
const REGISTRES_DE_FAMILLES = [
  ['brands', FAMILLES_BRANDS],
  ['utility', FAMILLES_UTILITY],
  ['primitives', FAMILLES_PRIMITIVES],
  ['layout', FAMILLES_LAYOUT],
  ['typography', FAMILLES_TYPOGRAPHY],
  ['components', FAMILLES_COMPOSANT],
] as const;

/** Les familles de chaque collection ; une collection nouvelle sans registre fait échouer la lecture. */
export function famillesParCollection(): { collection: string; familles: string[] }[] {
  const presentes = REGISTRES_DE_FAMILLES.map(([collection]) => collection) as readonly string[];
  const sansRegistre = COLLECTIONS.filter((nom) => nom !== 'theme' && !presentes.includes(nom));
  if (sansRegistre.length) throw new Error(`Collection sans registre de familles dans releves.ts : ${sansRegistre.join(', ')}`);
  return REGISTRES_DE_FAMILLES.map(([collection, registre]) => ({ collection, familles: termes(registre) }));
}

/** Le nombre de tailles du registre, la plus petite et la plus grande. */
export function registreDesTailles(): { nombre: number; premiere: string; derniere: string } {
  const ids = termes(REGISTRE_TAILLES);
  return { nombre: ids.length, premiere: ids[0], derniere: ids[ids.length - 1] };
}

export const nombreDeProprietesDeComposant = (): number => REGISTRE_PROPRIETES_COMPOSANT.termes.length;

// ---------- Les documents du projet ----------

/** Le nombre de contrats de recette, et la version de contrat du dernier dossier de fixtures. */
export function contratsDeRecette(): { version: string; nombre: number } {
  const versions = dossiers('packages/kit/fixtures/contrats').sort((a, b) => parseFloat(a) - parseFloat(b));
  const version = versions[versions.length - 1];
  return { version, nombre: liste(`packages/kit/fixtures/contrats/${version}`).filter((nom) => nom.endsWith('.contract.json')).length };
}

/**
 * Ce que l'inventaire tire des documents de cadrage. Le nombre de classes de compatibilité se compte dans la table de
 * `COMPATIBILITE.md`. Les trois autres lectures ne rendent rien : elles lèvent « ancre X absente de Y » quand `CHANGELOG-FORMAT.md`,
 * `CONCEPT.md`, `ROADMAP.md` ou le sommaire des recherches renomme une section que la page présente.
 * Les textes qui résument ces documents (sens de chaque version du contrat, invariants, limites non prouvées, statut du hub)
 * restent dans le gabarit : leurs sections ne se citent pas telles quelles.
 */
export function extraitsDesDocuments(donnees: Versions): { classesDeCompatibilite: number } {
  const classes = tableauDe(lire('docs/format/COMPATIBILITE.md'), 'docs/format/COMPATIBILITE.md', 'Les douze classes de changement');
  const changelog = lire('docs/format/CHANGELOG-FORMAT.md');
  for (const version of [donnees.contratMinimal, donnees.contrat]) sectionDe(changelog, 'docs/format/CHANGELOG-FORMAT.md', version);
  const concept = sectionDe(lire('CONCEPT.md'), 'CONCEPT.md', '6. Ce que le modèle cherche à prouver');
  for (const promesse of ['Robustesse', 'Confiance']) {
    if (!concept.includes(promesse)) throw new Error(`CONCEPT.md, § 6 : la promesse « ${promesse} » a disparu`);
  }
  if (tableauDe(lire('ROADMAP.md'), 'ROADMAP.md', 'Ce qui n\'est pas prouvé').length === 0) throw new Error('ROADMAP.md : « Ce qui n\'est pas prouvé » n\'a plus de tableau');
  const sujets = tableauDe(lire('docs/notes/Recherches/README.md'), 'docs/notes/Recherches/README.md', 'Sujets');
  if (!sujets.some((ligne) => ligne.Sujet.startsWith('[Hub UCM]'))) throw new Error('docs/notes/Recherches/README.md : le sujet « Hub UCM » a disparu du sommaire');
  return { classesDeCompatibilite: classes.length };
}

// ---------- Les nombres du moteur de couleur et d'Architect ----------

const enFrancais = (nombre: number): string => String(nombre).replace('.', ',');

/** Les réglages de la recette par défaut que la page cite : parts de saturation des profils, seuils d'alerte, nuances possibles. */
export function reglagesDePalettes() {
  const recette = recetteParDefaut();
  return {
    partSoft: `${Math.round(recette.profils.soft.part * 100)} %`,
    partVivid: `${Math.round(recette.profils.vivid.part * 100)} %`,
    seuilConfondues: enFrancais(recette.seuils.profilsConfondus),
    seuilProches: enFrancais(recette.seuils.palettesProches),
    nuances: Object.keys(PREREGLAGES).join(' ou '),
  };
}

/** Les sections de la vue Composant d'Architect : leur nombre et leurs libellés. */
export function sectionsDuComposant(): { nombre: number; liste: string } {
  const libelles = Object.values(TEXTES_ELEMENTS.elementsDuPanneau.libelles) as string[];
  return { nombre: libelles.length, liste: libelles.join(', ') };
}

// ---------- Les pistes et les décisions du dépôt ----------

export const CHEMIN_DES_PISTES = 'docs/notes/Recherches/Evolutions globales/pistes.json';
export const CHEMIN_DES_DECISIONS = 'docs/notes/Recherches/Evolutions globales/decisions.json';

export interface Piste {
  id: string;
  titre: string;
  titreCourt: string;
  dependances: string[];
  rang: number;
  points: { chemin: string; action: string; quoi: string }[];
  [champ: string]: unknown;
}

export interface Regle {
  id: string;
  genre: 'carte' | 'liste' | 'tableau' | 'transverse';
  pour?: string;
  titre?: string;
  texte: string;
  options?: { valeur: string; libelle: string }[];
  domicileCible: string;
  ecrite: 'non' | 'partiel' | 'oui';
  pistes: string[];
}

export interface Decisions {
  version: 1;
  pistes: Record<string, { choix: string; note: string }>;
  transverses: Record<string, { choix: string; note: string }>;
  regles: Regle[];
}

const AVEC_ECHEC = (fichier: string, ou: string, message: string): never => {
  throw new Error(`${fichier}, ${ou} : ${message}`);
};

/** Un chemin du dépôt à contrôler : ni un réglage GitHub, ni un chemin d'un autre dépôt, ni un motif. */
function cheminDuDepot(chemin: string): boolean {
  if (chemin.startsWith('../') || /[*,;:()`]/.test(chemin)) return false;
  return /^[\w.@ -]+(\/[\w.@ -]+)*(\.[a-z]+|\/)$/i.test(chemin);
}

/** Les 21 pistes de la feuille de route, validées : identifiants uniques, dépendances connues, chemins existants, aucun cycle. */
export function pistes(): Piste[] {
  const contenu = json(CHEMIN_DES_PISTES) as { version: number; pistes: Piste[] };
  if (contenu.version !== 1) AVEC_ECHEC(CHEMIN_DES_PISTES, 'champ version', `la version ${contenu.version} n'est pas lue`);
  const ids = new Set<string>();
  for (const piste of contenu.pistes) {
    if (ids.has(piste.id)) AVEC_ECHEC(CHEMIN_DES_PISTES, `piste ${piste.id}, champ id`, 'identifiant déjà pris');
    ids.add(piste.id);
  }
  const crees = new Set(contenu.pistes.flatMap((piste) => piste.points.filter((point) => point.action === 'créer').map((point) => point.chemin)));
  for (const piste of contenu.pistes) {
    for (const dependance of piste.dependances) {
      if (!ids.has(dependance)) AVEC_ECHEC(CHEMIN_DES_PISTES, `piste ${piste.id}, champ dependances`, `${dependance} n'existe pas`);
    }
    piste.points.forEach((point, rang) => {
      if (point.action === 'créer' || crees.has(point.chemin)) return;
      // « a/b.ts et c.js » nomme deux fichiers : le second, sans dossier, est celui du premier.
      const [premier, ...autres] = point.chemin.split(' et ');
      const dossierDuPremier = premier.includes('/') ? premier.slice(0, premier.lastIndexOf('/') + 1) : '';
      for (const chemin of [premier, ...autres.map((autre) => (autre.includes('/') ? autre : dossierDuPremier + autre))]) {
        if (cheminDuDepot(chemin) && !existsSync(path.join(RACINE, chemin))) {
          AVEC_ECHEC(CHEMIN_DES_PISTES, `piste ${piste.id}, champ points[${rang}].chemin`, `${chemin} n'existe pas dans le dépôt`);
        }
      }
    });
  }
  const parId = new Map(contenu.pistes.map((piste) => [piste.id, piste]));
  const etat = new Map<string, 'en cours' | 'fini'>();
  const visiter = (id: string, trajet: string[]): void => {
    if (etat.get(id) === 'fini') return;
    if (etat.get(id) === 'en cours') AVEC_ECHEC(CHEMIN_DES_PISTES, `piste ${id}, champ dependances`, `cycle ${[...trajet.slice(trajet.indexOf(id)), id].join(' puis ')}`);
    etat.set(id, 'en cours');
    for (const dependance of parId.get(id)!.dependances) visiter(dependance, [...trajet, id]);
    etat.set(id, 'fini');
  };
  for (const piste of contenu.pistes) visiter(piste.id, []);
  return contenu.pistes;
}

/** Les décisions que le dépôt porte : les choix (vides au départ) et les règles décidées, validés. */
export function decisions(identifiants: ReadonlySet<string>): Decisions {
  const contenu = json(CHEMIN_DES_DECISIONS) as Decisions;
  if (contenu.version !== 1) AVEC_ECHEC(CHEMIN_DES_DECISIONS, 'champ version', `la version ${contenu.version} n'est pas lue`);
  const regles = new Set<string>();
  for (const regle of contenu.regles) {
    if (regles.has(regle.id)) AVEC_ECHEC(CHEMIN_DES_DECISIONS, `règle ${regle.id}, champ id`, 'identifiant déjà pris');
    regles.add(regle.id);
    if (!['non', 'partiel', 'oui'].includes(regle.ecrite)) AVEC_ECHEC(CHEMIN_DES_DECISIONS, `règle ${regle.id}, champ ecrite`, `« ${regle.ecrite} » n'est ni non, ni partiel, ni oui`);
    if (!['carte', 'liste', 'tableau', 'transverse'].includes(regle.genre)) AVEC_ECHEC(CHEMIN_DES_DECISIONS, `règle ${regle.id}, champ genre`, `« ${regle.genre} » est inconnu`);
    for (const piste of regle.pistes) {
      if (!identifiants.has(piste)) AVEC_ECHEC(CHEMIN_DES_DECISIONS, `règle ${regle.id}, champ pistes`, `${piste} n'existe pas`);
    }
    const [fichier] = regle.domicileCible.split('#');
    if (!existsSync(path.join(RACINE, fichier))) AVEC_ECHEC(CHEMIN_DES_DECISIONS, `règle ${regle.id}, champ domicileCible`, `${fichier} n'existe pas dans le dépôt`);
  }
  return contenu;
}

// ---------- Les univers de la couverture ----------

/** Les sous-dossiers d'un dossier du dépôt, triés. */
export const dossiersDe = (chemin: string): string[] => dossiers(chemin).sort();

/** Les dossiers de `.agents/skills/` qui portent un `SKILL.md`. */
export const dossiersDeSkills = (): string[] => dossiers('.agents/skills').filter((nom) => existsSync(path.join(RACINE, '.agents/skills', nom, 'SKILL.md'))).sort();

// ---------- Les registres et les listes du référentiel ----------

/** Chaque registre de termes du référentiel : son identifiant, s'il accepte des termes de plus, son nombre de termes. */
export function registresDuReferentiel(): { id: string; extensible: boolean; termes: number }[] {
  return [...REGISTRES, ...REGISTRES_ARCHITECTURE, ...REGISTRES_COMPOSANTS].map((registre) => ({ id: registre.id, extensible: registre.extensible, termes: registre.termes.length }));
}

/** Les listes fermées du référentiel que la page nomme : leur nom dans le kit, leurs identifiants, ce qu'elles disent. */
export function listesDuReferentiel(): { nom: string; ids: string[]; phrase: string }[] {
  return [
    { nom: 'PRODUITS', ids: PRODUITS.map((produit) => produit.id), phrase: 'Les produits UCM, avec ce que chacun lit et écrit.' },
    { nom: 'CONVENTIONS', ids: CONVENTIONS.map((convention) => convention.id), phrase: 'Les conventions de nommage que le designer choisit pour ses variables.' },
    { nom: 'ETATS', ids: [...ETATS], phrase: 'Les états du thème.' },
    { nom: 'DOSSIERS', ids: [...DOSSIERS], phrase: 'Les dossiers de la collection usage.' },
    { nom: 'PROFILS', ids: [...PROFILS], phrase: "Les intensités d'une palette." },
  ];
}

/** Le nombre de sortes d'imbriqué que le kit distingue. */
export const nombreDeSortesDImbrique = (): number => SORTES_D_IMBRIQUE.length;

/** Les longueurs de mot à partir desquelles Architect juge une faute de vocabulaire. */
export const longueursDeFaute = (): { court: number; uneLettre: number; deuxLettres: number } => ({
  court: LONGUEUR_MINIMALE_D_UNE_FAUTE_D_UN_MOT_COURT,
  uneLettre: LONGUEUR_MINIMALE_D_UNE_FAUTE_A_UNE_LETTRE,
  deuxLettres: LONGUEUR_MINIMALE_D_UNE_FAUTE_A_DEUX_LETTRES,
});

/** Les tailles en pixels sous lesquelles le contrôle d'accessibilité d'Architect signale une cible ou un texte. */
export const seuilsDAccessibilite = (): { cible: number; tactile: number; texte: number } => ({ cible: CIBLE_MINIMALE_PX, tactile: CIBLE_TACTILE_PX, texte: TEXTE_MINIMAL_PX });

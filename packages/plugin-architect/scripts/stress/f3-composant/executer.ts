/**
 * Exécute la section D du stress test F3 et F4 (chaîne sandbox, écran et écriture, 67 cas) hors de `npm test`.
 *
 *   npm run stress:composant [-- --cas D1-3] [-- --serie D2]
 *
 * Écrit `_local/stress/f3-composant/chaine.txt` et `chaine.json` : par cas, la propriété, le verdict et les écarts avec leur
 * rattachement, puis le total par série D1 à D6 et par propriété. Un cas qui lève est un écart `exception`, jamais un arrêt.
 * Un écart de cas `mesure` se compte à part (colonne « en attente » du plan). Le script sort sans erreur malgré les écarts, car il mesure l'existant.
 *
 * Il mesure aussi les opérateurs du kit (`operateurs.ts`, 800 cas environ) et rend leur tableau à part de celui de la chaîne, avec
 * `operateurs.txt` et `operateurs.json` dans le même dossier. Ces deux fichiers ne portent aucune durée, pour que deux exécutions
 * donnent les mêmes octets ; les durées vont à l'écran et dans `operateurs-durees.json`.
 *
 *   npm run stress:composant -- --operateur K4   (opérateurs seuls, rien n'est écrit ; une lettre ou un opérateur)
 *   npm run stress:composant -- --cas K4-3       (un cas des opérateurs ; un identifiant D1-3 vise la chaîne)
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { casDeLaChaine, type CasDeChaine, type ResultatDeChaine } from './casDeLaChaine';
import { agreger, detailTexte, GRAINE_PAR_DEFAUT, mesurerLesOperateurs, rapportJson, rapportTexte, tableau } from './operateurs';
import { rattacher, vueDeComparer, vueDeLEcran, type VueDEcart } from './signatures';

interface EcartRapporte {
  readonly cas: string;
  readonly propriete: string;
  readonly sorte: string;
  readonly detail: string;
  readonly nombre: number;
  readonly connu: readonly string[];
  readonly resume: string;
  readonly verdict: string;
  readonly commande: string;
}

interface LigneDeCas {
  readonly cas: string;
  readonly serie: string;
  readonly propriete: string;
  readonly verdict: string;
  readonly question?: string;
  readonly description: string;
  readonly verifiees: number;
  readonly echouees: number;
  readonly tient: boolean;
  readonly ecarts: readonly EcartRapporte[];
  readonly notes: readonly string[];
  readonly millisecondes: number;
}

const argument = (nom: string): string | undefined => {
  const rang = process.argv.indexOf(nom);
  return rang >= 0 ? process.argv[rang + 1] : undefined;
};
const seulCas = argument('--cas');
const seuleSerie = argument('--serie');
const seulOperateur = argument('--operateur');
const casDeChaine = (id: string): boolean => /^D\d+-\d+$/.test(id);
const veutLaChaine = seulOperateur === undefined && (seulCas === undefined || casDeChaine(seulCas));
const veutLesOperateurs = seuleSerie === undefined && (seulOperateur !== undefined || seulCas === undefined || !casDeChaine(seulCas));

function ecartsDuResultat(definition: CasDeChaine, resultat: ResultatDeChaine): EcartRapporte[] {
  const commande = `npm run stress:composant -- --cas ${definition.id}`;
  const rapporte = (vue: VueDEcart, nombre: number): EcartRapporte => {
    const { ids, resume } = rattacher(vue);
    return { cas: vue.cas, propriete: vue.propriete, sorte: vue.sorte, detail: vue.detail, nombre, connu: ids, resume, verdict: definition.verdict, commande };
  };
  return [
    ...resultat.ecran.map((ecart) => rapporte(vueDeLEcran(definition.id, ecart), ecart.nombre ?? 1)),
    ...resultat.ecarts.map((ecart) => rapporte(vueDeComparer(definition.id, definition.propriete, ecart), 1)),
  ];
}

async function executerUnCas(definition: CasDeChaine): Promise<LigneDeCas> {
  const debut = performance.now();
  let resultat: ResultatDeChaine | undefined;
  let exception: EcartRapporte | undefined;
  try {
    resultat = await definition.executer();
  } catch (erreur) {
    const detail = erreur instanceof Error ? `${erreur.message}\n${(erreur.stack ?? '').split('\n').slice(1, 4).join('\n')}` : String(erreur);
    const vue: VueDEcart = { cas: definition.id, propriete: definition.propriete, sorte: 'exception', detail };
    const { ids, resume } = rattacher(vue);
    exception = { cas: definition.id, propriete: definition.propriete, sorte: 'exception', detail, nombre: 1, connu: ids, resume, verdict: definition.verdict, commande: `npm run stress:composant -- --cas ${definition.id}` };
  }
  const ecarts = resultat ? ecartsDuResultat(definition, resultat) : [exception!];
  const echouees = ecarts.reduce((somme, ecart) => somme + ecart.nombre, 0);
  return {
    cas: definition.id, serie: definition.operateur, propriete: definition.propriete, verdict: definition.verdict,
    ...(definition.question ? { question: definition.question } : {}), description: definition.description,
    verifiees: resultat?.verifiees ?? 0, echouees, tient: ecarts.length === 0, ecarts, notes: resultat?.notes ?? [],
    millisecondes: Math.round(performance.now() - debut),
  };
}

const colonne = (texte: string, largeur: number): string => texte.padEnd(largeur);

function tableauParCle(lignes: readonly LigneDeCas[], cle: (ligne: LigneDeCas) => string): string[] {
  const groupes = new Map<string, LigneDeCas[]>();
  for (const ligne of lignes) groupes.set(cle(ligne), [...(groupes.get(cle(ligne)) ?? []), ligne]);
  const sortie = [`${colonne('', 6)}${colonne('cas', 6)}${colonne('tiennent', 10)}${colonne('écarts', 8)}${colonne('en attente', 11)}${colonne('vérifiées', 10)}${colonne('échouées', 9)}`];
  for (const [nom, groupe] of [...groupes].sort(([a], [b]) => a.localeCompare(b))) {
    const attendus = groupe.filter((ligne) => ligne.verdict === 'attendu');
    sortie.push(
      colonne(nom, 6) + colonne(String(groupe.length), 6) + colonne(String(groupe.filter((ligne) => ligne.tient).length), 10)
      + colonne(String(attendus.filter((ligne) => !ligne.tient).length), 8) + colonne(String(groupe.filter((ligne) => ligne.verdict === 'mesure' && !ligne.tient).length), 11)
      + colonne(String(groupe.reduce((somme, ligne) => somme + ligne.verifiees, 0)), 10) + colonne(String(groupe.reduce((somme, ligne) => somme + ligne.echouees, 0)), 9),
    );
  }
  return sortie;
}

function rapportDeLaChaine(lignes: readonly LigneDeCas[], millisecondes: number): string {
  const sortie: string[] = [];
  sortie.push(`Chaîne du stress test F3 et F4 : ${lignes.length} cas exécutés sur ${casDeLaChaine().length}, ${(millisecondes / 1000).toFixed(1)} s.`);
  sortie.push(`Cas qui tiennent : ${lignes.filter((ligne) => ligne.tient).length}. Écarts sur un cas attendu : ${lignes.filter((ligne) => ligne.verdict === 'attendu' && !ligne.tient).length}. Écarts sur un cas à mesurer : ${lignes.filter((ligne) => ligne.verdict === 'mesure' && !ligne.tient).length}.`);
  sortie.push('', 'Par série', ...tableauParCle(lignes, (ligne) => ligne.serie));
  sortie.push('', 'Par propriété', ...tableauParCle(lignes, (ligne) => ligne.propriete));
  const tous = lignes.flatMap((ligne) => ligne.ecarts);
  const parConnu = new Map<string, { cas: Set<string>; resume: string }>();
  for (const ecart of tous) {
    const cle = ecart.connu.join('+');
    const entree = parConnu.get(cle) ?? { cas: new Set<string>(), resume: ecart.resume };
    entree.cas.add(ecart.cas);
    parConnu.set(cle, entree);
  }
  sortie.push('', 'Écarts par rattachement');
  for (const [cle, { cas, resume }] of [...parConnu].sort(([a], [b]) => a.localeCompare(b))) sortie.push(`${cle} : ${cas.size} cas (${resume}) : ${[...cas].join(' ')}`);
  sortie.push('', 'Cas');
  for (const ligne of lignes) {
    const etat = ligne.tient ? 'tient' : ligne.verdict === 'mesure' ? 'ECART (mesure)' : 'ECART';
    sortie.push(`${ligne.cas} [${ligne.propriete}] ${etat} (${ligne.verifiees} vérifiées, ${ligne.echouees} échouées, ${ligne.millisecondes} ms${ligne.question ? `, ${ligne.question}` : ''}) ${ligne.description}`);
    for (const note of ligne.notes) sortie.push(`    note : ${note}`);
    for (const ecart of ligne.ecarts) sortie.push(`    ${ecart.propriete} ${ecart.sorte} [${ecart.connu.join(' ')}] ${ecart.detail.replace(/\s*\n\s*/g, ' / ')}`);
  }
  return `${sortie.join('\n')}\n`;
}

function mesurerLesOperateursEtRendre(dossier: string): void {
  const debut = performance.now();
  const mesures = mesurerLesOperateurs(GRAINE_PAR_DEFAUT, { operateur: seulOperateur, cas: seulCas });
  const lignes = agreger(mesures);
  const sortie = [`Opérateurs du kit F3 et F4 : ${mesures.length} cas, ${((performance.now() - debut) / 1000).toFixed(1)} s.`, '', tableau(lignes, true), ''];
  if (seulOperateur === undefined && seulCas === undefined) {
    writeFileSync(path.join(dossier, 'operateurs.txt'), rapportTexte(mesures, GRAINE_PAR_DEFAUT));
    writeFileSync(path.join(dossier, 'operateurs.json'), `${JSON.stringify(rapportJson(mesures, GRAINE_PAR_DEFAUT), null, 2)}\n`);
    writeFileSync(path.join(dossier, 'operateurs-durees.json'), `${JSON.stringify(Object.fromEntries(lignes.map((l) => [l.operateur, Math.round(l.millisecondes)])), null, 2)}\n`);
    sortie.push(`(détail nommé : ${path.join(dossier, 'operateurs.txt')})`);
  } else {
    sortie.push(detailTexte(mesures));
  }
  process.stdout.write(`${sortie.join('\n')}\n`);
}

async function principal(): Promise<void> {
  const dossier = path.resolve(__dirname, '../../../../../_local/stress/f3-composant');
  mkdirSync(dossier, { recursive: true });
  if (veutLaChaine) {
    const debut = performance.now();
    const retenus = casDeLaChaine().filter((definition) => (seulCas === undefined || definition.id === seulCas) && (seuleSerie === undefined || definition.operateur === seuleSerie));
    const lignes: LigneDeCas[] = [];
    for (const definition of retenus) lignes.push(await executerUnCas(definition));
    const millisecondes = performance.now() - debut;
    const texte = rapportDeLaChaine(lignes, millisecondes);
    const complet = seulCas === undefined && seuleSerie === undefined;
    if (complet) {
      writeFileSync(path.join(dossier, 'chaine.txt'), texte);
      writeFileSync(path.join(dossier, 'chaine.json'), `${JSON.stringify({ millisecondes: Math.round(millisecondes), cas: lignes }, null, 2)}\n`);
    }
    process.stdout.write(complet ? `${texte.split('\n').slice(0, 40).join('\n')}\n(rapport complet : ${path.join(dossier, 'chaine.txt')})\n` : texte);
  }
  if (veutLesOperateurs) {
    if (veutLaChaine) process.stdout.write('\n');
    mesurerLesOperateursEtRendre(dossier);
  }
}

principal().catch((erreur) => {
  console.error(erreur);
  process.exitCode = 1;
});

/** Compare les constats émis par Architect à ceux qu'un cas attend, et résume les écarts par famille et opérateur. */
import type { Constat } from '../../../src/controles/constat.js';
import type { CasDeStress, Ecart, ResultatDuCas, SorteDEcart } from './types.js';

const SORTES: readonly SorteDEcart[] = ['manque', 'faux-constat', 'doublon', 'correction-inexacte', 'question-inexacte'];

const memeEnsemble = (a: readonly string[], b: readonly string[]): boolean => {
  const x = new Set(a);
  const y = new Set(b);
  return x.size === y.size && [...x].every((valeur) => y.has(valeur));
};

export function comparer<E>(
  cas: CasDeStress<E>,
  emis: readonly Constat[],
  cleDe: (constat: Constat) => string,
): ResultatDuCas {
  const ecarts: Ecart[] = [];
  const ajouter = (ecart: Omit<Ecart, 'cas'>) => ecarts.push({ cas: cas.id, ...ecart });
  const attendusParCle = new Map(cas.attendus.map((attendu) => [`${attendu.code}|${attendu.cle}`, attendu]));
  const ecartsParCle = new Map<string, number>();
  const dejaVus = new Set<string>();

  for (const constat of emis) {
    const cle = `${constat.code}|${cleDe(constat)}`;
    const attendu = attendusParCle.get(cle);
    if (!attendu) {
      if (!cas.codesJuges || cas.codesJuges.includes(constat.code)) {
        ajouter({ sorte: 'faux-constat', emis: constat, detail: `${cle} émis, le cas ne l'attend pas` });
      }
      continue;
    }
    if (dejaVus.has(cle)) {
      ajouter({ sorte: 'doublon', attendu, emis: constat, detail: `${cle} émis plusieurs fois` });
      continue;
    }
    dejaVus.add(cle);
    const avant = ecarts.length;

    if (attendu.forme === 'correction') {
      if (!constat.correction) {
        ajouter({ sorte: 'correction-inexacte', attendu, emis: constat, detail: `${cle} sans correction` });
      } else if (attendu.apres) {
        const { cle: cleVisee, nom } = attendu.apres;
        const apres = constat.correction.apres;
        if ((cleVisee !== undefined && apres.cle !== cleVisee) || (nom !== undefined && apres.nom !== nom)) {
          ajouter({
            sorte: 'correction-inexacte', attendu, emis: constat,
            detail: `${cle} vise ${apres.cle ?? '-'} / ${apres.nom}, attendu ${cleVisee ?? '-'} / ${nom ?? '-'}`,
          });
        }
      }
    } else {
      if (constat.correction) {
        ajouter({ sorte: 'correction-inexacte', attendu, emis: constat, detail: `${cle} porte une correction, la forme attendue est ${attendu.forme}` });
      }
      if (attendu.forme === 'question') {
        if (!constat.question) {
          ajouter({ sorte: 'question-inexacte', attendu, emis: constat, detail: `${cle} sans question` });
        } else if (attendu.candidats) {
          const noms = constat.question.candidats.map((candidat) => candidat.nom);
          if (!memeEnsemble(noms, attendu.candidats)) {
            ajouter({
              sorte: 'question-inexacte', attendu, emis: constat,
              detail: `${cle} propose [${noms.join(', ')}], attendu [${attendu.candidats.join(', ')}]`,
            });
          }
        }
      }
    }
    ecartsParCle.set(cle, ecarts.length - avant);
  }

  let detectes = 0;
  for (const [cle, attendu] of attendusParCle) {
    if (!dejaVus.has(cle)) ajouter({ sorte: 'manque', attendu, detail: `${cle} attendu et absent` });
    else if (ecartsParCle.get(cle) === 0) detectes++;
  }

  return { cas: cas.id, famille: cas.famille, operateur: cas.operateur, verdict: cas.verdict, attendus: cas.attendus.length, detectes, ecarts };
}

export interface LigneDeRapport {
  readonly famille: string;
  readonly operateur: string;
  cas: number;
  attendus: number;
  detectes: number;
  sortes: Record<SorteDEcart, number>;
  enAttente: number;
}

const ligneVide = (famille: string, operateur: string): LigneDeRapport => ({
  famille, operateur, cas: 0, attendus: 0, detectes: 0,
  sortes: { manque: 0, 'faux-constat': 0, doublon: 0, 'correction-inexacte': 0, 'question-inexacte': 0 },
  enAttente: 0,
});

/** Une ligne par famille et opérateur, puis une ligne de total. Les écarts d'un cas `mesure` vont dans `enAttente` seulement. */
export function agreger(resultats: readonly ResultatDuCas[]): LigneDeRapport[] {
  const lignes = new Map<string, LigneDeRapport>();
  const total = ligneVide('Total', '');
  const ajouter = (ligne: LigneDeRapport, resultat: ResultatDuCas) => {
    ligne.cas++;
    ligne.attendus += resultat.attendus;
    ligne.detectes += resultat.detectes;
    if (resultat.verdict === 'mesure') ligne.enAttente += resultat.ecarts.length;
    else for (const ecart of resultat.ecarts) ligne.sortes[ecart.sorte]++;
  };
  for (const resultat of resultats) {
    const cle = `${resultat.famille}\u0000${resultat.operateur}`;
    let ligne = lignes.get(cle);
    if (!ligne) {
      ligne = ligneVide(resultat.famille, resultat.operateur);
      lignes.set(cle, ligne);
    }
    ajouter(ligne, resultat);
    ajouter(total, resultat);
  }
  return [...lignes.values(), total];
}

export function tableauTexte(lignes: readonly LigneDeRapport[]): string {
  const entete = ['Famille', 'Opérateur', 'Cas', 'Attendus', 'Détectés', 'Manqués', 'Faux constats', 'Doublons', 'Corrections inexactes', 'Questions inexactes', 'En attente'];
  const rangees = lignes.map((l) =>
    [l.famille, l.operateur, l.cas, l.attendus, l.detectes, ...SORTES.map((sorte) => l.sortes[sorte]), l.enAttente].map(String));
  return [entete, entete.map(() => '---'), ...rangees].map((r) => `| ${r.join(' | ')} |`).join('\n');
}

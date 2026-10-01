/**
 * Le rendu d'une chaîne de résolution : une étape par variable, avec sa
 * collection, son mode et l'origine de ce mode, puis la valeur terminale ou
 * le constat qui l'arrête. Le survol et l'inspecteur emploient ce même rendu.
 */
import { nomDeMode, texteDeSource } from '../copie';
import { BORNE_DES_ETAPES, type Resultat } from '../resolution';
import type { Application } from './application';
import { TEXTES } from './textes';
import { nomDeCible, rendreResultat } from './valeurs';

/** Le constat d'une chaîne qui n'aboutit pas : titre, détail et geste. */
export function constatDeChaine(app: Application, resultat: Resultat): { titre: string; detail: string; action: string } | null {
  const index = app.etat.index;
  if (!index || resultat.statut === 'resolu') return null;
  const nom = (id: string) => nomDeCible(index, id);
  switch (resultat.statut) {
    case 'inaccessible':
      return { titre: TEXTES.constat.inaccessible.titre, detail: TEXTES.constat.inaccessible.detail(nom(resultat.cible)), action: TEXTES.constat.inaccessible.action };
    case 'mode-absent':
      return { titre: TEXTES.constat['mode-absent'].titre, detail: TEXTES.constat['mode-absent'].detail(nom(resultat.variable), nomDeMode(index, resultat.mode)), action: TEXTES.constat['mode-absent'].action };
    case 'cycle': {
      const boucle = resultat.etapes.slice(resultat.debut).map((etape) => nom(etape.variable));
      return { titre: TEXTES.constat.cycle.titre, detail: TEXTES.constat.cycle.detail([...boucle, boucle[0]].join(' → ')), action: TEXTES.constat.cycle.action };
    }
    case 'type-incompatible':
      return {
        titre: TEXTES.constat['type-incompatible'].titre,
        detail: TEXTES.constat['type-incompatible'].detail(nom(resultat.variable), resultat.obtenu in TEXTES.types ? TEXTES.types[resultat.obtenu as keyof typeof TEXTES.types] : resultat.obtenu, TEXTES.types[resultat.attendu]),
        action: TEXTES.constat['type-incompatible'].action,
      };
    case 'non-pris-en-charge': {
      const derniere = resultat.etapes[resultat.etapes.length - 1];
      return { titre: TEXTES.constat['non-pris-en-charge'].titre, detail: TEXTES.constat['non-pris-en-charge'].detail(derniere ? nom(derniere.variable) : ''), action: TEXTES.constat['non-pris-en-charge'].action };
    }
    case 'interrompu':
      return { titre: TEXTES.constat.interrompu.titre, detail: TEXTES.constat.interrompu.detail(BORNE_DES_ETAPES), action: TEXTES.constat.interrompu.action };
  }
}

/** Le bloc d'un constat : titre, détail, puis geste. */
export function rendreConstat(constat: { titre: string; detail: string; action: string }): HTMLDivElement {
  const bloc = document.createElement('div');
  bloc.className = 'constat';
  const titre = document.createElement('strong');
  titre.className = 'constat-titre';
  titre.textContent = constat.titre;
  const detail = document.createElement('p');
  detail.className = 'constat-detail';
  detail.textContent = constat.detail;
  const action = document.createElement('p');
  action.className = 'constat-action';
  action.textContent = constat.action;
  bloc.append(titre, detail, action);
  return bloc;
}

/**
 * La liste des étapes. `ouvrir`, quand il est donné, fait de chaque nom un
 * bouton qui inspecte la variable ; le survol n'en a pas besoin.
 */
export function rendreChaine(app: Application, resultat: Resultat, ouvrir?: (variable: string) => void, marque?: number | null): HTMLElement {
  const index = app.etat.index;
  const liste = document.createElement('ol');
  liste.className = 'chaine';
  if (!index) return liste;
  resultat.etapes.forEach((etape, rang) => {
    const element = document.createElement('li');
    element.className = 'etape';
    element.classList.toggle('etape-marquee', marque === rang);
    const variable = index.variables.get(etape.variable);
    const collection = index.collections.get(etape.collection);
    let nom: HTMLElement;
    if (ouvrir) {
      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = 'lien';
      bouton.addEventListener('click', () => ouvrir(etape.variable));
      nom = bouton;
    } else {
      nom = document.createElement('span');
      nom.className = 'etape-nom';
    }
    nom.textContent = variable?.nom ?? etape.variable;
    const details = document.createElement('span');
    details.className = 'note';
    const origine = TEXTES.origine[etape.origine];
    const surcharge = etape.surcharge ? ` · ${TEXTES.surcharge(index.collections.get(etape.surcharge)?.nom ?? etape.surcharge)}` : '';
    details.textContent = `${collection?.nom ?? etape.collection} · ${TEXTES.modeEtOrigine(nomDeMode(index, etape.mode), origine)}${surcharge}`;
    element.append(nom, details);
    const derniere = rang === resultat.etapes.length - 1 && resultat.statut === 'resolu';
    if (etape.source.nature !== 'alias' && !derniere) {
      const source = document.createElement('span');
      source.className = 'etape-source';
      source.textContent = texteDeSource(index, etape.source);
      element.append(source);
    }
    liste.append(element);
  });
  const fin = document.createElement('li');
  fin.className = 'etape-fin';
  fin.append(rendreResultat(resultat));
  liste.append(fin);
  return liste;
}

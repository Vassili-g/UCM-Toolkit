/** Les lignes de l'arbre pendant une recherche : les collections qui ont un résultat, chacune avec son nombre. */
import type { LigneDArbre } from '../../groupes';
import { espaceDuReleve, texteDeValeur } from '../../modele';
import type { Application } from '../application';
import { variablesAffichees } from '../etat';
import { comptesParCollection } from './resultats';

/** Le texte de la valeur terminale d'une variable dans le contexte actif, que la recherche de texte libre lit. */
export function valeurCherchee(app: Application): (id: string) => string {
  return (id) => {
    const resultat = app.resultat(id);
    return resultat.statut === 'resolu' ? texteDeValeur(resultat.valeur, app.etat.index ? espaceDuReleve(app.etat.index.releve) : 'srgb') : '';
  };
}

export function lignesDeRecherche(app: Application): LigneDArbre[] {
  const { etat } = app;
  if (!etat.index) return [];
  const trouvees = variablesAffichees(etat, valeurCherchee(app));
  return comptesParCollection(etat.index, trouvees).flatMap(({ collection, nombre }) => {
    const racine = etat.arbres.find((arbre) => arbre.collection === collection);
    return racine ? [{ noeud: { ...racine, enfants: [], total: nombre }, profondeur: 0, deplie: true, aDesEnfants: false }] : [];
  });
}

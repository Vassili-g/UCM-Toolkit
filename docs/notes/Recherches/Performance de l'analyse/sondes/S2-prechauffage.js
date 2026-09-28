// Sonde S2 : battement du sandbox pendant le calcul réel de l'index à froid.
// Construire avec `npm run sonde:s2 --workspace ucm-exporter-plugin`, puis
// coller packages/plugin-exporter/dist/S2-prechauffage.js dans la console
// d'un plugin de développement fraîchement lancé, sans analyse en cours.
// Sélectionner un composant à instances et faire défiler le canevas pendant
// chacun des cinq essais à froid. Un écart supérieur à 100 ms ou un arrêt
// visible du canevas retire le préchauffage.
import { indexContractedNames, oublierLIndexDuDocument } from '../../../../../packages/plugin-exporter/src/contract/composedComponents';
import { dansUnePorteeDAnalyse } from '../../../../../packages/plugin-exporter/src/contract/porteeDAnalyse';
import { ouvrirLaMesure, fermerLaMesure, abandonnerLaMesure } from '../../../../../packages/plugin-exporter/src/contract/mesure';

(async () => {
  const racine = figma.currentPage.selection[0];
  if (!racine || !['COMPONENT', 'COMPONENT_SET'].includes(racine.type)) {
    console.log('[S2] sélectionner un composant ou un component set');
    return;
  }
  const variants = racine.type === 'COMPONENT_SET'
    ? racine.children.filter((node) => node.type === 'COMPONENT')
    : [racine];
  let battre = true;
  let dernier = Date.now();
  let plusGrandEcart = 0;
  let battements = 0;
  const battement = () => {
    const maintenant = Date.now();
    plusGrandEcart = Math.max(plusGrandEcart, maintenant - dernier);
    dernier = maintenant;
    battements += 1;
    if (battre) setTimeout(battement, 0);
  };
  oublierLIndexDuDocument();
  ouvrirLaMesure();
  setTimeout(battement, 0);
  try {
    const contractes = await dansUnePorteeDAnalyse({}, () =>
      indexContractedNames(variants, { priorite: 'fond' }));
    const trace = fermerLaMesure('');
    battre = false;
    // Le dernier battement inclut le bloc synchrone qui termine le calcul.
    await new Promise((resolve) => setTimeout(resolve, 20));
    console.log('[S2]', {
      racine: racine.name,
      trace,
      contractes: [...contractes],
      battements,
      plusGrandEcartMs: plusGrandEcart,
      fige: plusGrandEcart > 100,
    });
  } catch (erreur) {
    console.error('[S2] essai invalide', erreur);
  } finally {
    battre = false;
    abandonnerLaMesure();
    oublierLIndexDuDocument();
  }
})();

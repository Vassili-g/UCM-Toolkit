import { montrerLaPlanche } from './contenu';

const hote = document.getElementById('planche');
if (!hote) throw new Error('Planche : l’hôte #planche manque dans index.html');
montrerLaPlanche(hote);

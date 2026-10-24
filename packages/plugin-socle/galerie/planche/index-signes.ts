import { montrerLesSignes } from './signes';

const hote = document.getElementById('planche');
if (!hote) throw new Error('Planche des signes : l’hôte #planche manque dans index.html');
montrerLesSignes(hote);

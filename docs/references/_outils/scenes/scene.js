// Coquille commune des scènes de la galerie. `guide.ts rendre` la place avant la scène,
// avec `CAS`, la liste des cas du guide. Une scène appelle `monter(rendre)`.

function feuille(href) {
  const lien = document.createElement('link');
  lien.rel = 'stylesheet';
  lien.href = href;
  document.head.appendChild(lien);
}

function annoncerHauteur() {
  parent.postMessage({ scene: location.hash || document.title, hauteur: document.documentElement.scrollHeight }, '*');
}

// `rendre(cas, hote, signaler)` dessine un cas dans `hote` ; il peut rendre une note,
// affichée sous le cas, quand le système ne permet pas le cas demandé.
function monter(rendre) {
  const style = document.createElement('style');
  style.textContent = `
    html, body { margin: 0; background: #fff !important; }
    .radix-themes { min-height: 0 !important; }
    .g { padding: 16px 20px; display: grid; gap: 18px; font: 13px/1.4 system-ui, sans-serif; color: #333; }
    .cas h3 { margin: 0 0 8px; font: 600 11px/1 system-ui, sans-serif; letter-spacing: .04em; text-transform: uppercase; color: #6b6b6b; }
    .valeur { margin: 6px 0 0; color: #6b6b6b; font-size: 12px; }
    .valeur b { color: #222; font-weight: 600; }
    .note { margin: 4px 0 0; color: #8a4b00; font-size: 12px; }`;
  document.head.appendChild(style);
  const racine = document.createElement('main');
  racine.className = 'g';
  document.body.appendChild(racine);
  for (const c of CAS) {
    const bloc = document.createElement('section');
    bloc.className = 'cas';
    bloc.innerHTML = `<h3></h3><div class="hote"></div><p class="valeur">Valeur : <b>—</b></p>`;
    bloc.querySelector('h3').textContent = c.titre;
    const hote = bloc.querySelector('.hote');
    if (c.largeur) hote.style.maxWidth = `${c.largeur}px`;
    racine.appendChild(bloc);
    const b = bloc.querySelector('.valeur b');
    const note = rendre(c.id, hote, (v) => { b.textContent = String(v); });
    if (note) bloc.querySelector('.valeur').insertAdjacentHTML('afterend', `<p class="note">${note}</p>`);
  }
  new ResizeObserver(annoncerHauteur).observe(document.body);
}

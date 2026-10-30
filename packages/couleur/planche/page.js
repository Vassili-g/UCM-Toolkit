/* Le script de la planche, copié dans la page par generer-planche.ts, qui écrit les données à la place du mot-clé de la ligne var D et le texte des fonctions de contraste du kit à la place du mot-clé de la ligne qui précède encreSur. */
(function () {
  var D = DONNEES;
  var etat = { profil: 'soft', theme: 'light', texte: 'noir' };

  CONTRASTE_DU_KIT
  function encreSur(hexa) {
    var n = parseInt(hexa.slice(1), 16);
    return encreLisible([n >> 16, (n >> 8) & 255, n & 255]) === 'blanc' ? '#fff' : '#000';
  }

  function cellule(hexas, jeu, rangReference, pied) {
    var theme = etat.theme;
    var crans = jeu.roles[theme];
    function c(variable) {
      return hexas[D.crans.indexOf(crans[variable])];
    }
    var carte = jeu.cartes[theme];
    var surface = c('surface/default');
    var texte = c('surface/foreground');
    var surBouton = jeu.texteDesBoutons[theme];
    var mini = hexas.map(function (hexa, i) {
      return '<div class="' + (i === rangReference ? 'ref' : '') + '" style="background:' + hexa + ';color:' + encreSur(hexa) + '" title="' + D.crans[i] + ' ' + hexa + '"></div>';
    }).join('');
    return '<div class="cellule" style="background:' + carte + '">' +
      '<div class="mini">' + mini + '</div>' +
      '<div class="ligne-composants">' +
      '<span class="badge" style="background:' + surface + ';color:' + texte + '">Payé</span>' +
      '<span class="bouton" style="background:' + c('solid/default') + ';color:' + surBouton + '">Valider</span>' +
      '<span class="champ-anneau" style="background:' + carte + ';box-shadow:0 0 0 2px ' + carte + ',0 0 0 4px ' + c('ring') + '">Focus</span>' +
      '<span class="lien" style="color:' + c('page/foreground') + '">Voir la facture</span>' +
      '</div>' +
      '<div class="alerte" style="background:' + surface + ';color:' + texte + ';box-shadow:inset 0 0 0 1px ' + c('page/divider') + '"><b>Paiement reçu.</b> La facture est envoyée au client.</div>' +
      (pied ? '<div class="pied-cellule">' + pied + '</div>' : '') +
      '</div>';
  }

  function nomDuProfil(profil) {
    return profil === 'vivid' ? 'Vivid' : 'Soft';
  }

  function grille() {
    var theme = etat.theme;
    var jeu = D.jeux[etat.texte];
    var profil = etat.profil;
    var element = document.getElementById('grille');
    element.style.background = jeu.pages[theme];
    element.style.color = theme === 'light' ? '#1E1E1E' : '#ECECEC';
    var html = '<div class="entete"><div></div><div>Tailwind 3.4</div><div>Moteur, ' + nomDuProfil(profil) + '</div></div>';
    D.familles.forEach(function (famille, k) {
      var tailwind = jeu.tailwind[theme][k];
      var moteur = jeu.moteur[profil][theme][k];
      var ancrage = jeu.ancrages[k];
      var porte = ancrage.profil === profil;
      var pied = porte
        ? '◆ référence au cran ' + D.crans[ancrage.rangs[theme]]
        : 'référence portée par ' + nomDuProfil(ancrage.profil);
      html += '<div class="rang"><div class="famille">' + famille.nom + '<span>' + famille.reference + '</span></div>' +
        cellule(tailwind, jeu, -1, '') +
        cellule(moteur, jeu, porte ? ancrage.rangs[theme] : -1, pied) + '</div>';
    });
    element.innerHTML = html;
  }

  function bascule(id, options, cle) {
    var conteneur = document.getElementById(id);
    conteneur.innerHTML = options.map(function (option) {
      return '<button type="button" data-valeur="' + option[0] + '">' + option[1] + '</button>';
    }).join('');
    conteneur.addEventListener('click', function (evenement) {
      var bouton = evenement.target.closest('button');
      if (!bouton || bouton.disabled) return;
      etat[cle] = bouton.dataset.valeur;
      tout();
    });
  }

  function marquer(id, cle, desactive) {
    Array.prototype.forEach.call(document.getElementById(id).querySelectorAll('button'), function (bouton) {
      bouton.setAttribute('aria-pressed', String(bouton.dataset.valeur === etat[cle]));
      bouton.disabled = desactive;
    });
  }

  function tout() {
    document.documentElement.dataset.theme = etat.theme;
    marquer('commande-profil', 'profil', false);
    marquer('commande-theme', 'theme', false);
    marquer('commande-texte', 'texte', etat.theme === 'light');
    grille();
  }

  bascule('commande-profil', [['soft', 'Soft'], ['vivid', 'Vivid']], 'profil');
  bascule('commande-theme', [['light', 'Light'], ['dark', 'Dark']], 'theme');
  bascule('commande-texte', [['noir', 'Noir'], ['blanc', 'Blanc']], 'texte');
  tout();
})();

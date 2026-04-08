/* ============================================================
   PUMP & KITE — Chatbot JB
   Pour modifier les Q/R : édite uniquement le tableau QA ci-dessous
   Pour ajouter une question : copie un bloc { q: "...", r: "..." }
============================================================ */

const QA = [
  {
    q: "Quel niveau faut-il pour commencer ?",
    r: "Tous les niveaux sont les bienvenus ! 🤙 Même si t'as jamais fait de sport de glisse, pas de souci — on démarre tranquillement à ton rythme."
  },
  {
    q: "C'est où exactement ?",
    r: "Plusieurs endroits sont possibles et je peux me déplacer. Pour le kite, on sera majoritairement sur l'étang d'Ingril à Frontignan. Pour le pumping foil, c'est la plupart du temps vers Carnon. 📍"
  },
  {
    q: "Combien ça coûte ?",
    r: "Le prix dépend de la prestation que tu choisis. C'est facturé à l'heure, et selon ta dispo on fait entre 1h et 3h par session. Jette un œil à la page réservation pour les tarifs détaillés ! 👀"
  },
  {
    q: "Vous prêtez le matériel ?",
    r: "Oui, je fournis tout le matériel pour le cours ! 🏄 La seule exception, c'est la combinaison — selon moi c'est quelque chose de personnel, chaque pratiquant devrait avoir la sienne."
  },
  {
    q: "La date de réservation est fixe ?",
    r: "Oui et non. 😄 Si les conditions météo sont mauvaises et qu'il vaut mieux reporter, pas de pénalité — on trouve ensemble une autre journée où tu es dispo et où les conditions sont au top !"
  },
  {
    q: "Vous vendez du matériel ?",
    r: "Pour l'instant j'ai un stock limité, mais je peux vendre du matériel d'occasion. À terme, j'espère pouvoir proposer du neuf aussi pour ceux qui le souhaitent. 🛒"
  },
  {
    q: "Peut-on venir en groupe ?",
    r: "Bien sûr ! Amis, famille... pas de problème tant que ça reste un petit groupe et que j'ai le matériel nécessaire pour tout le monde. 👨‍👩‍👧"
  },
  {
    q: "Des conseils pour acheter du matériel ?",
    r: "Il y a plusieurs facteurs à prendre en compte selon ton niveau et ta pratique. Le mieux c'est de m'appeler directement pour que je puisse te conseiller au mieux ! 📞"
  },
  {
    q: "Comment fonctionne le pack 10h ?",
    r: "Plusieurs possibilités ! Tu peux venir 3, 4 ou 5 fois jusqu'à atteindre les 10h. Et tu peux aussi partager ces heures avec 1 ou 2 autres personnes. Par exemple : 2 personnes viennent 2h, puis 3 personnes viennent 2h... tout ça compte dans le pack. 🎯"
  },
  {
    q: "J'ai une autres question ?",
    r: "Bien sûr, appelle moi directement ou envoie moi un message, j'y répondrai le plus vite possible !"
  },
];

/* ── Injection CSS ── */
(function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    #pk-chat-btn {
      position: fixed;
      bottom: 28px; right: 28px;
      width: 60px; height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #f4a261, #e76f51 40%, #0c6291);
      border: none; cursor: pointer;
      box-shadow: 0 8px 28px rgba(2,26,46,0.28);
      display: flex; align-items: center; justify-content: center;
      font-size: 26px;
      z-index: 9990;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    #pk-chat-btn:hover {
      transform: scale(1.08);
      box-shadow: 0 12px 36px rgba(2,26,46,0.35);
    }
    #pk-chat-btn .pk-notif {
      position: absolute;
      top: 2px; right: 2px;
      width: 14px; height: 14px;
      background: #2ecc71;
      border-radius: 50%;
      border: 2px solid white;
    }

    #pk-chat-box {
      position: fixed;
      bottom: 100px; right: 28px;
      width: 360px;
      max-height: 560px;
      background: white;
      border-radius: 20px;
      box-shadow: 0 24px 64px rgba(2,26,46,0.22);
      display: flex; flex-direction: column;
      overflow: hidden;
      z-index: 9989;
      transform: scale(0.85) translateY(20px);
      opacity: 0;
      pointer-events: none;
      transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
      font-family: 'Outfit', sans-serif;
    }
    #pk-chat-box.open {
      transform: scale(1) translateY(0);
      opacity: 1;
      pointer-events: all;
    }

    .pk-header {
      background: linear-gradient(135deg, #021a2e, #0c6291);
      padding: 18px 20px;
      display: flex; align-items: center; gap: 12px;
      color: white;
    }
    .pk-avatar {
      width: 42px; height: 42px; border-radius: 50%;
      background: linear-gradient(135deg, #f4a261, #e76f51);
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 16px; color: white; flex-shrink: 0;
    }
    .pk-header-info { flex: 1; }
    .pk-header-name { font-weight: 700; font-size: 15px; }
    .pk-header-status {
      font-size: 11px; opacity: 0.75;
      display: flex; align-items: center; gap: 5px; margin-top: 2px;
    }
    .pk-header-status::before {
      content: ''; display: inline-block;
      width: 7px; height: 7px; border-radius: 50%; background: #2ecc71;
    }
    .pk-close {
      background: none; border: none; color: rgba(255,255,255,0.6);
      font-size: 20px; cursor: pointer; padding: 4px; line-height: 1;
      transition: color 0.2s;
    }
    .pk-close:hover { color: white; }

    .pk-messages {
      flex: 1;
      overflow-y: auto;
      padding: 20px 16px;
      display: flex; flex-direction: column; gap: 12px;
      scroll-behavior: smooth;
    }

    .pk-bubble {
      max-width: 82%;
      padding: 11px 15px;
      border-radius: 16px;
      font-size: 14px;
      line-height: 1.55;
    }
    .pk-bubble.bot {
      background: #f0f7fc;
      color: #1a2e3b;
      border-bottom-left-radius: 4px;
      align-self: flex-start;
    }
    .pk-bubble.user {
      background: linear-gradient(135deg, #0c6291, #1b9aaa);
      color: white;
      border-bottom-right-radius: 4px;
      align-self: flex-end;
    }

    .pk-suggestions {
      padding: 12px 16px 16px;
      display: flex; flex-wrap: wrap; gap: 8px;
      border-top: 1px solid #eef4f8;
    }
    .pk-suggestion {
      background: #f0f7fc;
      border: 1.5px solid rgba(27,154,170,0.2);
      border-radius: 50px;
      padding: 7px 13px;
      font-size: 12px; font-weight: 600;
      color: #0c6291;
      cursor: pointer;
      font-family: 'Outfit', sans-serif;
      transition: all 0.18s;
    }
    .pk-suggestion:hover {
      background: #0c6291; color: white;
      border-color: #0c6291;
    }

    .pk-back {
      margin: 4px 16px 12px;
      background: none; border: none;
      color: #1b9aaa; font-size: 12px; font-weight: 600;
      cursor: pointer; font-family: 'Outfit', sans-serif;
      padding: 0; text-align: left;
      display: none;
    }
    .pk-back:hover { text-decoration: underline; }
    .pk-back.visible { display: block; }

    @media (max-width: 440px) {
      #pk-chat-box { width: calc(100vw - 24px); right: 12px; bottom: 90px; }
      #pk-chat-btn { bottom: 20px; right: 16px; }
    }
  `;
  document.head.appendChild(style);
})();

/* ── Construction du DOM ── */
(function buildDOM() {
  // Bouton flottant
  const btn = document.createElement('button');
  btn.id = 'pk-chat-btn';
  btn.innerHTML = '💬<span class="pk-notif"></span>';
  btn.setAttribute('aria-label', 'Ouvrir le chat');

  // Fenêtre chat
  const box = document.createElement('div');
  box.id = 'pk-chat-box';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-label', 'Chat avec JB');
  box.innerHTML = `
    <div class="pk-header">
      <div class="pk-avatar">JB</div>
      <div class="pk-header-info">
        <div class="pk-header-name">JBot — Pump & Kite</div>
        <div class="pk-header-status">En ligne</div>
      </div>
      <button class="pk-close" id="pk-close-btn" aria-label="Fermer">✕</button>
    </div>
    <div class="pk-messages" id="pk-messages"></div>
    <button class="pk-back" id="pk-back-btn">← Autre question</button>
    <div class="pk-suggestions" id="pk-suggestions"></div>
  `;

  document.body.appendChild(btn);
  document.body.appendChild(box);

  initChat();

  btn.addEventListener('click', () => {
    box.classList.toggle('open');
    btn.querySelector('.pk-notif').style.display = 'none';
  });
  document.getElementById('pk-close-btn').addEventListener('click', () => {
    box.classList.remove('open');
  });
  document.getElementById('pk-back-btn').addEventListener('click', showSuggestions);
})();

/* ── Logique chat ── */
function addMessage(text, type) {
  const msgs = document.getElementById('pk-messages');
  const bubble = document.createElement('div');
  bubble.className = `pk-bubble ${type}`;
  bubble.textContent = text;
  msgs.appendChild(bubble);
  msgs.scrollTop = msgs.scrollHeight;
}

function showSuggestions() {
  const sugg = document.getElementById('pk-suggestions');
  const back = document.getElementById('pk-back-btn');
  sugg.innerHTML = QA.map((item, i) =>
    `<button class="pk-suggestion" data-index="${i}">${item.q}</button>`
  ).join('');
  sugg.querySelectorAll('.pk-suggestion').forEach(btn => {
    btn.addEventListener('click', () => handleQuestion(parseInt(btn.dataset.index)));
  });
  back.classList.remove('visible');
}

function handleQuestion(index) {
  const item = QA[index];
  const sugg = document.getElementById('pk-suggestions');
  const back = document.getElementById('pk-back-btn');

  addMessage(item.q, 'user');
  sugg.innerHTML = '';

  setTimeout(() => {
    addMessage(item.r, 'bot');
    back.classList.add('visible');
  }, 380);
}

function initChat() {
  setTimeout(() => {
    addMessage("Salut ! 👋 Moi c'est JBot, ton moniteur Pump & Kite. T'as une question ? Je suis là !", 'bot');
    setTimeout(() => {
      addMessage("Clique sur ce qui t'intéresse 👇", 'bot');
      showSuggestions();
    }, 600);
  }, 300);
}

// ============================================================
//  PUMP & KITE — reservation.js
//  Base de données : Supabase (appel direct)
// ============================================================

const SUPA_URL = 'https://qwuyrwfjxbedziuzbasw.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3dXlyd2ZqeGJlZHppdXpiYXN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyNjU2ODEsImV4cCI6MjA4OTg0MTY4MX0.uNMVbEcJ7xvxNYfqT_1z8QP9HyCP-WVv4o2UhmxTWOI';

// ============================================================
//  TARIFS
//
//  hourly: true  → le prix dépend de la durée choisie
//                  baseRate = DURATION_RATES[durée] (sans matériel)
//                  avec matériel → baseRate - 20 €/h
//  hourly: false → prix fixe par personne, pas de sélecteur de durée
//
//  Pour "Navigation surveillée" : hourly:true mais le prix/h est
//  fixe (ne change pas avec la durée), géré via TARIFS directement.
// ============================================================

const TARIFS = {
  // ---- KITESURF ----
  'Découverte du Kitesurf': {
    sans:   100,  // prix fixe (2h matériel inclus)
    avec:   100,
    label:  '2h matériel inclus – tarif/pers',
    hourly: false,
  },
  'Cours particulier Kite': {
    // Le prix/h varie selon la durée → voir DURATION_RATES_KITE
    // sans matériel : DURATION_RATES_KITE[durée]
    // avec matériel : DURATION_RATES_KITE[durée] - 20
    label:  '€/h/pers',
    hourly: true,
    useDurationRates: true,
    discipline: 'Kitesurf',
  },
  'Pack 10H Kitesurf': {
    sans:   500,
    avec:   500,
    label:  '10h matériel inclus – tarif/pers',
    hourly: false,
  },
  'Navigation surveillée Kite': {
    sans:   40,   // 40 €/h fixe
    avec:   30,   // 30 €/h avec matériel perso
    label:  '€/h – encadrement sur l\'eau',
    hourly: true,
    useDurationRates: false,  // prix/h fixe, pas de dégressif durée
  },

  // ---- PUMPING FOIL ----
  'Cours particulier Pumping foil': {
    // Le prix/h varie selon la durée → voir DURATION_RATES_FOIL
    label:  '€/h/pers',
    hourly: true,
    useDurationRates: true,
    discipline: 'Pumping foil',
  },
  'Pack 10H Pumping': {
    sans:   400,
    avec:   400,
    label:  '10h – tarif/pers',
    hourly: false,
  },
  'Navigation surveillée Foil': {
    sans:   40,
    avec:   30,
    label:  '€/h – encadrement sur l\'eau',
    hourly: true,
    useDurationRates: false,
  },
};

// ============================================================
//  TARIFS DÉGRESSIFS PAR DURÉE (€/h)
//  Pour Cours particulier Kite & Pumping foil (sans matériel)
//  Avec matériel = tarif/h - 20 €
// ============================================================
const DURATION_RATES_KITE = {
  1:   90,   // 1h  → 90 €/h
  1.5: 85,   // 1h30 → 85 €/h
  2:   80,   // 2h  → 80 €/h
  2.5: 75,   // 2h30 → 75 €/h
  3:   70,   // 3h  → 70 €/h
  4:   70,   // 4h  → 70 €/h (même palier max)
};

const DURATION_RATES_FOIL = {
  1:   90,
  1.5: 85,
  2:   80,
  2.5: 75,
  3:   70,
  4:   70,
};

// Durées disponibles (en heures)
const DURATIONS = [
  { value: 1,   label: '1h'    },
  { value: 1.5, label: '1h30'  },
  { value: 2,   label: '2h'    },
  { value: 2.5, label: '2h30'  },
  { value: 3,   label: '3h'    },
  { value: 4,   label: '4h'    },
];

const PRESTATIONS = {
  'Kitesurf':     [
    'Découverte du Kitesurf',
    'Cours particulier Kite',
    'Pack 10H Kitesurf',
    'Navigation surveillée Kite',
  ],
  'Pumping foil': [
    'Cours particulier Pumping foil',
    'Pack 10H Pumping',
    'Navigation surveillée Foil',
  ],
};

const SLOTS = [
  { id: 'Matin',      icon: '🌅', label: 'Matin',      hours: '9h00 – 12h00',  max: 2 },
  { id: 'Après-midi', icon: '☀️', label: 'Après-midi', hours: '14h00 – 17h00', max: 2 },
];

let currentYear, currentMonth;
let selectedDate     = null;
let selectedSlot     = null;
let daySlotCounts    = {};
let absenceDates     = {};
let nbParticipants   = 1;
let selectedDuration = 1;   // durée en heures (défaut 1h)

// ============================================================
//  HELPERS — CALCUL DE PRIX
// ============================================================

/**
 * Retourne le taux horaire pour une prestation donnée,
 * en tenant compte de la durée et du matériel perso.
 */
function getHourlyRate(prestation, avecMateriel) {
  const t = TARIFS[prestation];
  if (!t) return null;

  if (t.useDurationRates) {
    // Cours particulier → dégressif selon durée
    const ratesMap = (t.discipline === 'Pumping foil')
      ? DURATION_RATES_FOIL
      : DURATION_RATES_KITE;
    const rateBase = ratesMap[selectedDuration] ?? ratesMap[1];
    return avecMateriel ? rateBase - 20 : rateBase;
  } else {
    // Navigation surveillée → taux fixe
    return avecMateriel ? t.avec : t.sans;
  }
}

/**
 * Calcule le prix total pour une prestation.
 * Retourne { prix, detailParts }
 */
function calcPrix(prestation, avecMateriel) {
  const t = TARIFS[prestation];
  if (!t) return null;

  let prix, detailParts;

  if (t.hourly) {
    const tauxH = getHourlyRate(prestation, avecMateriel);
    prix         = Math.round(tauxH * selectedDuration * nbParticipants);

    const durLabel = DURATIONS.find(d => d.value === selectedDuration)?.label || selectedDuration + 'h';
    detailParts = [tauxH + '€/h × ' + durLabel + (nbParticipants > 1 ? ' × ' + nbParticipants + ' pers.' : '')];
    if (avecMateriel) detailParts.push('avec ton matériel (−20€/h) 🎉');
  } else {
    // Prix fixe par personne
    const baseRate = avecMateriel ? t.avec : t.sans;
    prix           = baseRate * nbParticipants;
    detailParts    = [t.label + (nbParticipants > 1 ? ' × ' + nbParticipants + ' pers.' : '')];
  }

  return { prix, detailParts };
}

// ============================================================
//  PRÉ-REMPLISSAGE DEPUIS LA SESSION (si connecté)
// ============================================================
function initFromSession() {
  try {
    const sess = JSON.parse(localStorage.getItem('pk_user'));
    if (!sess) return;
    if (sess.email) {
      const emailEl    = document.getElementById('email');
      emailEl.value    = sess.email;
      emailEl.readOnly = true;
      document.getElementById('emailLock').style.display = 'inline';
    }
    if (sess.tel) {
      const telEl    = document.getElementById('telephone');
      telEl.value    = sess.tel;
      telEl.readOnly = true;
      document.getElementById('telLock').style.display = 'inline';
    }
    document.getElementById('sessionBanner').classList.add('visible');
  } catch(_) {}
}

// ============================================================
//  GESTION DES PARTICIPANTS
// ============================================================
const MAX_PARTICIPANTS = 4;

function changeNbParticipants(delta) {
  nbParticipants = Math.max(1, Math.min(MAX_PARTICIPANTS, nbParticipants + delta));
  document.getElementById('nbDisplay').textContent     = nbParticipants;
  document.getElementById('btnMoins').disabled         = nbParticipants <= 1;
  document.getElementById('btnPlus').disabled          = nbParticipants >= MAX_PARTICIPANTS;
  renderExtraParticipants();
  updatePrix();
}

function renderExtraParticipants() {
  const container = document.getElementById('extraParticipants');
  container.innerHTML = '';
  for (let i = 2; i <= nbParticipants; i++) {
    container.insertAdjacentHTML('beforeend', `
      <div class="participant-card">
        <div class="participant-card-header">
          <div class="p-num">${i}</div>
          Participant ${i}
        </div>
        <div class="participant-grid">
          <div class="form-group">
            <label>Prénom *</label>
            <input type="text" id="p${i}_prenom" placeholder="Prénom">
          </div>
          <div class="form-group">
            <label>Nom *</label>
            <input type="text" id="p${i}_nom" placeholder="Nom">
          </div>
          <div class="form-group form-full">
            <label>Niveau *</label>
            <select id="p${i}_niveau">
              <option value="">-- Choisir --</option>
              <option value="Première fois">Première fois</option>
              <option value="Connais les bases">Connais les bases</option>
              <option value="Bientôt Autonome">Bientôt Autonome</option>
              <option value="Pour Perfectionnement">Pour Perfectionnement</option>
            </select>
          </div>
        </div>
      </div>`);
  }
}

// ============================================================
//  HELPERS SUPABASE
// ============================================================
function supaHeaders() {
  return {
    'apikey':        SUPA_KEY,
    'Authorization': 'Bearer ' + SUPA_KEY,
    'Content-Type':  'application/json',
  };
}

async function supaGet(table, params = '') {
  const url = `${SUPA_URL}/rest/v1/${table}${params ? '?' + params : ''}`;
  const r   = await fetch(url, { headers: supaHeaders() });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.message || 'HTTP ' + r.status); }
  return r.json();
}

async function supaInsert(table, data) {
  const url = `${SUPA_URL}/rest/v1/${table}`;
  const r   = await fetch(url, {
    method:  'POST',
    headers: { ...supaHeaders(), 'Prefer': 'return=representation' },
    body:    JSON.stringify(data),
  });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.message || 'HTTP ' + r.status); }
  return r.json();
}

// ============================================================
//  DISCIPLINE → PRESTATIONS
// ============================================================
function onDisciplineChange() {
  const disc = document.getElementById('discipline').value;
  const sel  = document.getElementById('prestation');
  sel.innerHTML = '<option value="">-- Choisir --</option>';
  (PRESTATIONS[disc] || []).forEach(p => {
    const o = document.createElement('option');
    o.value = p; o.textContent = p;
    sel.appendChild(o);
  });
  updatePrix();
}

// ============================================================
//  SÉLECTEUR DE DURÉE
// ============================================================
function renderDurationButtons() {
  const grid = document.getElementById('durGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const prestation = document.getElementById('prestation').value;
  const t          = TARIFS[prestation];
  const avecMat    = document.getElementById('materiel').checked;

  DURATIONS.forEach(function(d) {
    const btn = document.createElement('button');
    btn.type      = 'button';
    btn.className = 'dur-btn' + (d.value === selectedDuration ? ' selected' : '');

    // Affiche durée + prix/h pour les cours dégressifs
    if (t && t.useDurationRates) {
      const ratesMap = (t.discipline === 'Pumping foil') ? DURATION_RATES_FOIL : DURATION_RATES_KITE;
      const rate     = ratesMap[d.value] ?? ratesMap[1];
      const rateAff  = avecMat ? rate - 20 : rate;
      btn.innerHTML  = '<span>' + d.label + '</span><small style="display:block;font-size:11px;opacity:.75;">' + rateAff + '€/h</small>';
    } else {
      btn.textContent = d.label;
    }

    btn.onclick = (function(val) {
      return function() { selectedDuration = val; renderDurationButtons(); updatePrix(); };
    })(d.value);
    grid.appendChild(btn);
  });
}

// ============================================================
//  CALCUL ET AFFICHAGE DU PRIX ESTIMÉ
// ============================================================
function updatePrix() {
  const prestation = document.getElementById('prestation').value;
  const avecMat    = document.getElementById('materiel').checked;
  const badge      = document.getElementById('prixBadge');
  const valeur     = document.getElementById('prixValeur');
  const detail     = document.getElementById('prixDetail');
  const matLabel   = document.getElementById('materielLabel');
  const durSection = document.getElementById('durationSection');

  // Afficher/masquer le checkbox matériel selon la prestation
  matLabel.style.display = prestation ? 'flex' : 'none';

  const t = TARIFS[prestation];
  if (!t) {
    badge.style.display = 'none';
    if (durSection) durSection.style.display = 'none';
    return;
  }

  // Afficher/masquer le sélecteur de durée
  if (durSection) {
    durSection.style.display = t.hourly ? 'block' : 'none';
    if (t.hourly) renderDurationButtons();
  }

  const result = calcPrix(prestation, avecMat);
  if (!result) return;

  valeur.textContent = result.prix + ' €';
  detail.textContent = result.detailParts.join(' — ');
  badge.style.display = 'block';
}

// ============================================================
//  VALIDATION → STEP 2
// ============================================================
function goToStep2() {
  const champs = {
    nom: 'Nom', prenom: 'Prénom', email: 'Email',
    telephone: 'Téléphone', discipline: 'Discipline',
    prestation: 'Prestation', niveau: 'Niveau (participant 1)'
  };
  const manquants = Object.keys(champs).filter(id => !document.getElementById(id).value.trim());

  for (let i = 2; i <= nbParticipants; i++) {
    if (!document.getElementById('p' + i + '_prenom')?.value.trim()) manquants.push('Prénom P' + i);
    if (!document.getElementById('p' + i + '_nom')?.value.trim())    manquants.push('Nom P' + i);
    if (!document.getElementById('p' + i + '_niveau')?.value)        manquants.push('Niveau P' + i);
  }

  const errEl = document.getElementById('formError');
  if (manquants.length) {
    errEl.textContent    = '⚠️ Champs manquants : ' + manquants.join(', ');
    errEl.style.display  = 'block';
    return;
  }
  errEl.style.display = 'none';
  goToPanel(2);
  loadCalendar();
}

// ============================================================
//  STEPPER
// ============================================================
function goToPanel(n) {
  document.querySelectorAll('.panel').forEach((p, i) => p.classList.toggle('active', i + 1 === n));
  [1, 2, 3].forEach(i => {
    const s = document.getElementById('step' + i);
    s.classList.remove('active', 'done');
    if (i < n) s.classList.add('done');
    if (i === n) s.classList.add('active');
  });
  [1, 2].forEach(i => document.getElementById('line' + i).classList.toggle('done', i < n));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================
//  CHARGEMENT DES DISPONIBILITÉS (Supabase)
// ============================================================
async function loadAvailability() {
  daySlotCounts = {};
  absenceDates  = {};
  try {
    const rows = await supaGet('absences', 'select=date');
    rows.forEach(r => { if (r.date) absenceDates[r.date] = true; });
  } catch(e) { console.warn('Absences:', e.message); }
  try {
    const rows = await supaGet('reservations', 'select=date,creneau&statut=neq.Annulé&date=not.is.null');
    rows.forEach(r => {
      const date    = r.date;
      const creneau = r.creneau || 'Matin';
      if (!daySlotCounts[date]) daySlotCounts[date] = { 'Matin': 0, 'Après-midi': 0 };
      if (daySlotCounts[date][creneau] !== undefined) daySlotCounts[date][creneau]++;
    });
  } catch(e) { console.warn('Réservations disponibilités:', e.message); }
}

// ============================================================
//  CALENDRIER
// ============================================================
const MONTHS    = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const DAY_NAMES = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

async function loadCalendar() {
  const now    = new Date();
  currentYear  = now.getFullYear();
  currentMonth = now.getMonth();
  selectedDate = null;
  selectedSlot = null;

  document.getElementById('calLoading').style.display     = 'block';
  document.getElementById('calContent').style.display     = 'none';
  document.getElementById('slotsContainer').style.display = 'none';
  document.getElementById('confirmBtn').disabled = true;

  try { await loadAvailability(); } catch(e) { console.warn('Disponibilités non chargées:', e.message); }

  document.getElementById('calLoading').style.display = 'none';
  document.getElementById('calContent').style.display = 'block';
  renderCalendar();
}

function getDayStatus(dateStr) {
  if (absenceDates[dateStr]) return 'absence';
  const counts     = daySlotCounts[dateStr] || { 'Matin': 0, 'Après-midi': 0 };
  const totalDispo = SLOTS.reduce((acc, s) => acc + Math.max(0, s.max - (counts[s.id] || 0)), 0);
  const totalMax   = SLOTS.reduce((acc, s) => acc + s.max, 0);
  if (totalDispo === 0)      return 'full';
  if (totalDispo < totalMax) return 'partial';
  return 'available';
}

function renderCalendar() {
  document.getElementById('calTitle').textContent = MONTHS[currentMonth] + ' ' + currentYear;
  const grid = document.getElementById('calGrid');
  grid.innerHTML = '';

  DAY_NAMES.forEach(name => {
    const el = document.createElement('div');
    el.className   = 'cal-day-name';
    el.textContent = name;
    grid.appendChild(el);
  });

  const firstDay  = new Date(currentYear, currentMonth, 1);
  let   startDow  = firstDay.getDay();
  startDow        = startDow === 0 ? 6 : startDow - 1;

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const today       = new Date(); today.setHours(0, 0, 0, 0);

  for (let i = 0; i < startDow; i++) {
    const el = document.createElement('div'); el.className = 'cal-day empty'; grid.appendChild(el);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const date       = new Date(currentYear, currentMonth, d);
    const dateStr    = fmtDate(date);
    const el         = document.createElement('div');
    const isPast     = date < today;
    const isToday    = date.getTime() === today.getTime();
    const isSelected = dateStr === selectedDate;
    const status     = getDayStatus(dateStr);

    if (isPast) {
      el.className   = 'cal-day past';
      el.textContent = d;
    } else if (status === 'absence') {
      el.className = 'cal-day disabled';
      el.innerHTML = '<span>' + d + '</span><span class="day-tag">Absent</span>';
    } else if (status === 'full') {
      el.className = 'cal-day full';
      el.innerHTML = '<span>' + d + '</span><span class="day-tag">Complet</span>';
    } else {
      const cls    = isSelected ? 'selected' : (status === 'partial' ? 'partial' : '');
      el.className = ('cal-day ' + cls + ' ' + (isToday ? 'today' : '')).trim();
      el.innerHTML = status === 'partial'
        ? '<span>' + d + '</span><span class="day-tag">Partiel</span>'
        : String(d);
      el.onclick = (function(ds, dd) { return function() { selectDate(ds, dd); }; })(dateStr, d);
    }
    grid.appendChild(el);
  }
}

function selectDate(dateStr, day) {
  selectedDate = dateStr;
  selectedSlot = null;
  document.getElementById('confirmBtn').disabled = true;
  renderCalendar();

  const dateObj = new Date(currentYear, currentMonth, day);
  const badge   = document.getElementById('selectedDateBadge');
  badge.textContent = '📅 ' + dateObj.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  renderSlots(dateStr);
  document.getElementById('slotsContainer').style.display = 'block';
  document.getElementById('slotsContainer').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderSlots(dateStr) {
  const grid   = document.getElementById('slotsGrid');
  const counts = daySlotCounts[dateStr] || { 'Matin': 0, 'Après-midi': 0 };
  grid.innerHTML = '';

  SLOTS.forEach(function(slot) {
    const used   = counts[slot.id] || 0;
    const dispo  = slot.max - used;
    const isFull = dispo <= 0;
    const isSel  = slot.id === selectedSlot;

    const card = document.createElement('div');
    card.className = 'slot-card ' + (isFull ? 'full-slot' : isSel ? 'selected-slot' : 'available');
    card.innerHTML =
      '<div class="slot-icon">'  + slot.icon  + '</div>' +
      '<div class="slot-name">'  + slot.label + '</div>' +
      '<div class="slot-hours">' + slot.hours + '</div>' +
      '<span class="slot-places">' + (isFull ? 'Complet' : dispo + ' place' + (dispo > 1 ? 's' : '') + ' dispo') + '</span>';

    if (!isFull) {
      card.onclick = (function(sid, ds) {
        return function() {
          selectedSlot = sid;
          renderSlots(ds);
          document.getElementById('confirmBtn').disabled = false;
        };
      })(slot.id, dateStr);
    }
    grid.appendChild(card);
  });
}

function prevMonth() {
  const now = new Date();
  if (currentYear === now.getFullYear() && currentMonth === now.getMonth()) return;
  currentMonth--;
  if (currentMonth < 0) { currentMonth = 11; currentYear--; }
  renderCalendar();
}

function nextMonth() {
  currentMonth++;
  if (currentMonth > 11) { currentMonth = 0; currentYear++; }
  renderCalendar();
}

function fmtDate(d) {
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

// ============================================================
//  SOUMISSION DE RÉSERVATION (Supabase)
// ============================================================
async function submitReservation() {
  if (!selectedDate || !selectedSlot) return;

  const prestation = document.getElementById('prestation').value;
  const avecMat    = document.getElementById('materiel').checked;
  const t          = TARIFS[prestation] || {};

  const result = calcPrix(prestation, avecMat);
  const tarif  = result ? result.prix : 0;

  const overlay = document.getElementById('loadingOverlay');
  overlay.classList.add('active');

  try {
    let user_id = null;
    try {
      const sess = JSON.parse(localStorage.getItem('pk_user'));
      if (sess?.token) {
        const payload = JSON.parse(atob(sess.token.split('.')[1]));
        user_id = payload.sub || null;
      }
    } catch(_) {}

    const extraParticipants = [];
    for (let i = 2; i <= nbParticipants; i++) {
      extraParticipants.push({
        prenom: document.getElementById('p' + i + '_prenom')?.value.trim() || '',
        nom:    document.getElementById('p' + i + '_nom')?.value.trim()    || '',
        niveau: document.getElementById('p' + i + '_niveau')?.value        || '',
      });
    }

    const record = {
      nom:                document.getElementById('nom').value.trim(),
      prenom:             document.getElementById('prenom').value.trim(),
      email:              document.getElementById('email').value.trim(),
      telephone:          document.getElementById('telephone').value.trim(),
      discipline:         document.getElementById('discipline').value,
      prestation:         prestation,
      niveau:             document.getElementById('niveau').value,
      date:               selectedDate,
      creneau:            selectedSlot,
      materiel_personnel: avecMat,
      tarif:              tarif,
      message:            document.getElementById('message').value.trim(),
      statut:             'En attente',
      paiement:           'En attente de paiement',
      user_id:            user_id,
      nb_participants:    nbParticipants,
      participants:       extraParticipants.length > 0 ? extraParticipants : null,
      duree:              t.hourly ? selectedDuration : null,
    };

    await supaInsert('reservations', record);

    // Récapitulatif succès
    const dateObj   = new Date(selectedDate + 'T12:00:00');
    const dateLabel = dateObj.toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    const durLabel = t.hourly
      ? (DURATIONS.find(d => d.value === selectedDuration)?.label || selectedDuration + 'h')
      : null;

    let participantsHtml = '';
    if (nbParticipants > 1) {
      participantsHtml = '<div><span>👥 Participants</span><span>' + nbParticipants + ' personnes</span></div>';
    }
    const dureeHtml = durLabel ? '<div><span>⏱ Durée</span><span>' + durLabel + '</span></div>' : '';

    // Affiche le taux horaire dans le récap si prestation horaire
    let tarifDetail = tarif + ' €';
    if (t.hourly) {
      const tauxH = getHourlyRate(prestation, avecMat);
      tarifDetail += ' (' + tauxH + '€/h)';
    }

    document.getElementById('successRecap').innerHTML =
      '<div><span>👤 Réservé par</span><span>'    + record.prenom + ' ' + record.nom + '</span></div>' +
      participantsHtml +
      '<div><span>🪁 Discipline</span><span>'     + record.discipline    + '</span></div>' +
      '<div><span>📋 Prestation</span><span>'     + record.prestation    + '</span></div>' +
      dureeHtml +
      '<div><span>📅 Date</span><span>'           + dateLabel            + '</span></div>' +
      '<div><span>🕐 Créneau</span><span>'        + selectedSlot         + '</span></div>' +
      '<div><span>🏄 Matériel perso</span><span>' + (avecMat ? 'Oui (−20€/h)' : 'Non (fourni)') + '</span></div>' +
      '<div><span>💶 Tarif estimé</span><span>'   + tarifDetail          + '</span></div>';

    overlay.classList.remove('active');
    goToPanel(3);

  } catch(err) {
    overlay.classList.remove('active');
    console.error(err);
    alert('❌ Erreur : ' + err.message + '\n\nContacte-nous au 06 51 11 68 96');
  }
}

// ============================================================
//  HAMBURGER
// ============================================================
function toggleMenu() {
  document.getElementById('menuLinks').classList.toggle('open');
}
document.addEventListener('click', e => {
  if (!e.target.closest('.menu')) document.getElementById('menuLinks').classList.remove('open');
});

// ============================================================
//  INITIALISATION
// ============================================================
document.addEventListener('DOMContentLoaded', initFromSession);
// ============================================================
//  PUMP & KITE — reservation.js
//  Token sécurisé côté serveur Netlify, aucune clé ici.
// ============================================================

const TBL_REZ = 'Réservations';
const TBL_ABS = 'Absences';

const TARIFS = {
  'Découverte du Kitesurf':        { sans: 80,  avec: 80,  label: '2h – matériel fourni inclus' },
  'Cours particulier Kite':        { sans: 60,  avec: 50,  label: 'tarif /heure' },
  'Pack 10H Kitesurf':             { sans: 500, avec: 500, label: '10h – matériel fourni inclus' },
  'Cours particulier Pumping foil':{ sans: 50,  avec: 40,  label: 'tarif /heure' },
  'Pack 10H Pumping':              { sans: 400, avec: 400, label: '10h' },
};

const PRESTATIONS = {
  'Kitesurf':     ['Découverte du Kitesurf', 'Cours particulier Kite', 'Pack 10H Kitesurf'],
  'Pumping foil': ['Cours particulier Pumping foil', 'Pack 10H Pumping'],
};

const SLOTS = [
  { id: 'Matin',      icon: '🌅', label: 'Matin',      hours: '9h00 – 12h00',  max: 2 },
  { id: 'Après-midi', icon: '☀️', label: 'Après-midi', hours: '14h00 – 17h00', max: 2 },
];

let currentYear, currentMonth;
let selectedDate = null;
let selectedSlot = null;
let daySlotCounts = {};
let absenceDates  = {};

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
//  CALCUL PRIX
// ============================================================
function updatePrix() {
  const prestation = document.getElementById('prestation').value;
  const avecMat    = document.getElementById('materiel').checked;
  const badge      = document.getElementById('prixBadge');
  const valeur     = document.getElementById('prixValeur');
  const detail     = document.getElementById('prixDetail');
  const matLabel   = document.getElementById('materielLabel');

  matLabel.style.display = prestation ? 'flex' : 'none';

  const t = TARIFS[prestation];
  if (!t) { badge.style.display = 'none'; return; }

  const prix = avecMat ? t.avec : t.sans;
  valeur.textContent = prix + ' €';
  detail.textContent = t.label + (avecMat && t.avec < t.sans ? ' — avec ton matériel 🎉' : '');
  badge.style.display = 'block';
}

// ============================================================
//  VALIDATION → STEP 2
// ============================================================
function goToStep2() {
  const champs = {
    nom: 'Nom', prenom: 'Prénom', email: 'Email',
    telephone: 'Téléphone', discipline: 'Discipline',
    prestation: 'Prestation', niveau: 'Niveau'
  };
  const manquants = Object.keys(champs).filter(id => !document.getElementById(id).value.trim());
  const errEl = document.getElementById('formError');
  if (manquants.length) {
    errEl.textContent = '⚠️ Champs manquants : ' + manquants.map(k => champs[k]).join(', ');
    errEl.style.display = 'block';
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
//  API PROXY NETLIFY
// ============================================================
async function atFetch(table, qs = '') {
  const cleanQs = qs.startsWith('?') ? qs.slice(1) : qs;
  const params = new URLSearchParams({ table });
  if (cleanQs) params.set('qs', cleanQs);
  const r = await fetch('/.netlify/functions/airtable-get?' + params);
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error?.message || 'HTTP ' + r.status); }
  return r.json();
}

async function atCreate(table, fields) {
  const params = new URLSearchParams({ table });
  const r = await fetch('/.netlify/functions/airtable-post?' + params, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields })
  });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error?.message || 'HTTP ' + r.status); }
  return r.json();
}

// ============================================================
//  CHARGEMENT DISPONIBILITÉS
// ============================================================
async function loadAvailability() {
  daySlotCounts = {};
  absenceDates  = {};

  try {
    let offset;
    do {
      const d = await atFetch(TBL_ABS, offset ? '?offset=' + offset : '');
      (d.records || []).forEach(r => { if (r.fields.Date) absenceDates[r.fields.Date] = true; });
      offset = d.offset;
    } while (offset);
  } catch(e) { console.warn('Absences:', e.message); }

  try {
    let offset;
    do {
      const filter = '?filterByFormula=AND({Date}!="",{Statut}!="Annulé")';
      const qs = offset ? filter + '&offset=' + offset : filter;
      const d  = await atFetch(TBL_REZ, qs);
      (d.records || []).forEach(r => {
        const date    = r.fields.Date;
        const creneau = r.fields['Créneau'] || 'Matin';
        if (!date) return;
        if (!daySlotCounts[date]) daySlotCounts[date] = { 'Matin': 0, 'Après-midi': 0 };
        if (daySlotCounts[date][creneau] !== undefined) daySlotCounts[date][creneau]++;
      });
      offset = d.offset;
    } while (offset);
  } catch(e) { console.warn('Réservations:', e.message); }
}

// ============================================================
//  CALENDRIER
// ============================================================
const MONTHS    = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const DAY_NAMES = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

async function loadCalendar() {
  const now = new Date();
  currentYear  = now.getFullYear();
  currentMonth = now.getMonth();
  selectedDate = null;
  selectedSlot = null;

  document.getElementById('calLoading').style.display    = 'block';
  document.getElementById('calContent').style.display    = 'none';
  document.getElementById('slotsContainer').style.display = 'none';
  document.getElementById('confirmBtn').disabled = true;

  await loadAvailability();

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
  startDow = startDow === 0 ? 6 : startDow - 1;

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const today = new Date(); today.setHours(0, 0, 0, 0);

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
    const used     = counts[slot.id] || 0;
    const dispo    = slot.max - used;
    const isFull   = dispo <= 0;
    const isSel    = slot.id === selectedSlot;

    const card = document.createElement('div');
    card.className = 'slot-card ' + (isFull ? 'full-slot' : isSel ? 'selected-slot' : 'available');
    card.innerHTML =
      '<div class="slot-icon">' + slot.icon + '</div>' +
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
//  SOUMISSION
// ============================================================
async function submitReservation() {
  if (!selectedDate || !selectedSlot) return;

  const prestation = document.getElementById('prestation').value;
  const avecMat    = document.getElementById('materiel').checked;
  const t          = TARIFS[prestation] || {};
  const tarif      = avecMat ? t.avec : t.sans;

  const overlay = document.getElementById('loadingOverlay');
  overlay.classList.add('active');

  try {
    const fields = {
      'Nom':                 document.getElementById('nom').value.trim(),
      'Prénom':              document.getElementById('prenom').value.trim(),
      'Email':               document.getElementById('email').value.trim(),
      'Téléphone':           document.getElementById('telephone').value.trim(),
      'Discipline':          document.getElementById('discipline').value,
      'Prestation':          prestation,
      'Niveau':              document.getElementById('niveau').value,
      'Date':                selectedDate,
      'Créneau':             selectedSlot,
      'Matériel personnel':  avecMat,
      'Tarif (€)':           tarif,
      'Message':             document.getElementById('message').value.trim(),
      'Statut':              'En attente',
      'Paiement':            'En attente de paiement',
    };

    await atCreate(TBL_REZ, fields);

    const dateObj   = new Date(selectedDate + 'T12:00:00');
    const dateLabel = dateObj.toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    document.getElementById('successRecap').innerHTML =
      '<div><span>👤 Nom</span><span>'        + fields['Prénom'] + ' ' + fields['Nom'] + '</span></div>' +
      '<div><span>🪁 Discipline</span><span>' + fields['Discipline']  + '</span></div>' +
      '<div><span>📋 Prestation</span><span>' + fields['Prestation']  + '</span></div>' +
      '<div><span>📅 Date</span><span>'       + dateLabel             + '</span></div>' +
      '<div><span>🕐 Créneau</span><span>'    + selectedSlot          + '</span></div>' +
      '<div><span>🏄 Matériel perso</span><span>' + (avecMat ? 'Oui' : 'Non (fourni)') + '</span></div>' +
      '<div><span>💶 Tarif estimé</span><span>'   + tarif + ' €'     + '</span></div>';

    overlay.classList.remove('active');
    goToPanel(3);

  } catch(err) {
    overlay.classList.remove('active');
    console.error(err);
    alert('❌ Erreur : ' + err.message + '\n\nContacte-nous au 06 51 11 68 96');
  }
}

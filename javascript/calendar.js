// calendar.js — with upcoming list + ripple + a11y
document.addEventListener('DOMContentLoaded', function () {
  // --- State: current month/year being viewed ---
  let currentDate = new Date();
  let currentMonth = currentDate.getMonth();
  let currentYear = currentDate.getFullYear();

  // --- DOM refs ---
  const monthYearElement = document.getElementById('month-year');
  const prevMonthButton = document.getElementById('prev-month');
  const nextMonthButton = document.getElementById('next-month');
  const calendarDates = document.getElementById('calendar-dates');
  const savedEventsEl = document.getElementById('saved-events'); // <-- side list

  // --- Drawer: create if missing ---
  let drawerEl = document.getElementById('event-drawer');
  if (!drawerEl) {
    drawerEl = document.createElement('div');
    drawerEl.id = 'event-drawer';
    drawerEl.className = 'expand-content';
    document.body.appendChild(drawerEl);
  }

  // --- Constants & helpers ---
  const LS_KEY = 'harmony_events_v1';

  const monthNames = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ];
  const MONTHS = {
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
    july: 7, august: 8, september: 9, october: 10, november: 11, december: 12
  };

  const pad2 = (n) => (n < 10 ? '0' + n : '' + n);

  // Parse "Tuesday, 21 October 2025 at 9:30 pm" -> "2025-10-21"
  function parseEnAuDateToISO(s) {
    if (!s || typeof s !== 'string') return null;
    const cleaned = s.replace(/\s+at\s+/i, ' ')
                     .replace(/\s*,\s*/g, ' ')
                     .trim();
    const m = cleaned.match(/(?:\w+\s+)?(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/i);
    if (!m) return null;
    const day = parseInt(m[1], 10);
    const month = MONTHS[m[2].toLowerCase()];
    const year = parseInt(m[3], 10);
    if (!day || !month || !year) return null;
    return `${year}-${pad2(month)}-${pad2(day)}`;
  }

  // Extract time like "9:30 pm" from the formatted string
  function parseTimeFromFormatted(s) {
    if (!s || typeof s !== 'string') return { hh: 0, mm: 0, ok: false };
    const m = s.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
    if (!m) return { hh: 0, mm: 0, ok: false };
    let hh = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10);
    const ampm = m[3].toLowerCase();
    if (ampm === 'pm' && hh !== 12) hh += 12;
    if (ampm === 'am' && hh === 12) hh = 0;
    return { hh, mm, ok: true };
  }

  function loadEvents() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  // Build: "YYYY-MM-DD" -> [event, event, ...]
  function groupEventsByDate(events) {
    const map = new Map();
    for (const ev of events) {
      const iso = ev?.dateISO || parseEnAuDateToISO(ev?.formatteddatetime);
      if (!iso) continue;
      if (!map.has(iso)) map.set(iso, []);
      map.get(iso).push(ev);
    }
    return map;
  }

  function closeDrawer() {
    drawerEl.classList.remove('open');
  }

  function showDrawerForDate(iso, eventsForDate) {
    const items = eventsForDate.map(ev => {
      const safe = (v) => (v ?? '').toString();
      return `
        <div class="record" style="width:auto; margin-top:0; background:transparent; border:none; box-shadow:none;">
          <h2 style="margin:0 0 8px 0;">${safe(ev.subject)}</h2>
          <p><strong>Start time:</strong> ${safe(ev.formatteddatetime)}</p>
          <p><strong>Venue:</strong> ${safe(ev.venue)}</p>
          <p><strong>Type:</strong> ${safe(ev.event_type)}</p>
          ${ev.description ? `<p><strong>Description:</strong> ${safe(ev.description)}</p>` : ''}
        </div>
        <hr style="border:none; border-top:1px solid rgba(255,255,255,0.2); margin:16px 0;">
      `;
    }).join('');

    drawerEl.innerHTML = `
      <div class="drawer">
        <button class="drawer-close">×</button>
        <h3 style="margin-top:0;">Events on ${iso}</h3>
        ${items || '<p>No details available.</p>'}
      </div>
    `;
    drawerEl.classList.add('open');

    // Close handlers
    const closeBtn = drawerEl.querySelector('.drawer-close');
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
    drawerEl.addEventListener('click', (e) => { if (e.target === drawerEl) closeDrawer(); }, { once: true });
  }

  // click ripple
  function addRipple(dateCell) {
    const old = dateCell.querySelector('.ripple');
    if (old) old.remove();
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    dateCell.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  }

  // ---------- Upcoming list (right side) ----------
  // builds a sortable Date from either ISO + timeISO (if present) or formatted string
  function buildEventDate(ev) {
    // Prefer raw ISO if it exists in storage
    const iso = ev?.dateISO || parseEnAuDateToISO(ev?.formatteddatetime);
    if (!iso) return null;

    // use stored time when available; else parse from formatteddatetime; else default 00:00
    let hh = 0, mm = 0;
    if (ev?.timeISO && /^\d{2}:\d{2}$/.test(ev.timeISO)) {
      const [H, M] = ev.timeISO.split(':').map(n => parseInt(n, 10));
      hh = H; mm = M;
    } else {
      const t = parseTimeFromFormatted(ev?.formatteddatetime);
      if (t.ok) { hh = t.hh; mm = t.mm; }
    }

    const [year, mon, day] = iso.split('-').map(n => parseInt(n, 10));
    return new Date(year, mon - 1, day, hh, mm, 0, 0);
  }

  function renderUpcomingList(limit = 5) {
    if (!savedEventsEl) return;
    const all = loadEvents();

    // Build sortable list with real Date objects
    const enriched = all.map(ev => {
      return { ev, when: buildEventDate(ev) };
    }).filter(x => !!x.when);

    // Future (or today) only
    const now = new Date();
    const upcoming = enriched
      .filter(x => x.when >= new Date(now.getFullYear(), now.getMonth(), now.getDate())) // from today 00:00
      .sort((a, b) => a.when - b.when)
      .slice(0, limit);

    if (upcoming.length === 0) {
      savedEventsEl.innerHTML = 'No saved events yet.';
      return;
    }

    // Render: name + date/time (use your existing formatteddatetime so it matches locale)
    const items = upcoming.map(({ ev }) => {
      const name = (ev?.subject ?? '').toString();
      const whenText = (ev?.formatteddatetime ?? '').toString();
      return `<div class="up-item"><strong>${name}</strong><br><span>${whenText}</span></div>`;
    }).join('');

    savedEventsEl.innerHTML = items;
  }

  // Update side list if another tab modifies storage
  window.addEventListener('storage', (e) => {
    if (e.key === LS_KEY) renderUpcomingList();
  });

  // ---------- Calendar rendering ----------
  function renderCalendar() {
    // Clear previous cells
    calendarDates.innerHTML = '';

    // Header
    monthYearElement.textContent = `${monthNames[currentMonth]} ${currentYear}`;

    // Layout
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // Event lookup for this render
    const eventsByDate = groupEventsByDate(loadEvents());

    // Leading blanks
    for (let i = 0; i < firstDay; i++) {
      const emptyCell = document.createElement('div');
      emptyCell.className = 'calendar-day empty';
      calendarDates.appendChild(emptyCell);
    }

    const today = new Date();

    // Actual days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateCell = document.createElement('div');
      dateCell.className = 'calendar-day';
      dateCell.textContent = day;

      // Today highlight
      if (day === today.getDate() &&
          currentMonth === today.getMonth() &&
          currentYear === today.getFullYear()) {
        dateCell.classList.add('today');
      }

      const iso = `${currentYear}-${pad2(currentMonth + 1)}-${pad2(day)}`;

      // Event highlight
      const hasEvents = eventsByDate.has(iso);
      if (hasEvents) {
        dateCell.classList.add('has-event');

        // a11y: make it behave like a button for keyboard users
        dateCell.setAttribute('tabindex', '0');
        dateCell.setAttribute('role', 'button');
        dateCell.setAttribute('aria-label', `View events on ${iso}`);

        // activate on Enter/Space
        dateCell.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            dateCell.click();
          }
        });
      }

      // Click -> open drawer (show events or "no events")
      dateCell.addEventListener('click', () => {
        document.querySelectorAll('.calendar-day.selected').forEach(c => c.classList.remove('selected'));
        dateCell.classList.add('selected');

        if (hasEvents) addRipple(dateCell);

        if (hasEvents) {
          showDrawerForDate(iso, eventsByDate.get(iso));
        } else {
          drawerEl.innerHTML = `
            <div class="drawer">
              <button class="drawer-close">×</button>
              <h3 style="margin-top:0;">Events on ${iso}</h3>
              <p>No events for this date.</p>
            </div>`;
          drawerEl.classList.add('open');
          const closeBtn = drawerEl.querySelector('.drawer-close');
          if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
          drawerEl.addEventListener('click', (e) => { if (e.target === drawerEl) closeDrawer(); }, { once: true });
        }
      });

      calendarDates.appendChild(dateCell);
    }

    // Refresh the side list whenever we (re)render the calendar
    renderUpcomingList(5);
  }

  // Prev/Next navigation
  prevMonthButton.addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    renderCalendar();
  });
  nextMonthButton.addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    renderCalendar();
  });

  // Initial render + initial side list
  renderCalendar();
  renderUpcomingList(5);
});

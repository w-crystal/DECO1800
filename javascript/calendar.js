// calendar.js (safe full version)
document.addEventListener('DOMContentLoaded', function() {
  // --- State: current view ---
  let currentDate = new Date();
  let currentMonth = currentDate.getMonth();
  let currentYear = currentDate.getFullYear();

  // --- DOM refs ---
  const monthYearElement = document.getElementById('month-year');
  const prevMonthButton = document.getElementById('prev-month');
  const nextMonthButton = document.getElementById('next-month');
  const calendarDates   = document.getElementById('calendar-dates');

  // --- LocalStorage key from Create Event page ---
  const LS_KEY = 'harmony_events_v1';

  // Month names for header
  const monthNames = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ];

  // Map for parsing the human-friendly formatteddatetime string
  const MONTHS = {
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
    july: 7, august: 8, september: 9, october: 10, november: 11, december: 12
  };

  // 0-pad helper
  function pad2(n){ return n < 10 ? '0' + n : '' + n; }

  // Parse "Tuesday, 21 October 2025 at 9:30 pm" (en-AU full date + short time)
  // into "2025-10-21". If parsing fails, return null (so calendar still renders).
  function parseEnAuDateToISO(s) {
    if (!s || typeof s !== 'string') return null;
    const cleaned = s.replace(/\s+at\s+/i, ' ').replace(/\s*,\s*/g, ' ').trim();
    // e.g. "Tuesday 21 October 2025 9:30 pm" or "Tuesday 21 October 2025"
    const m = cleaned.match(
      /(?:\w+\s+)?(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})(?:\s+\d{1,2}:\d{2}\s*(am|pm)?)?/i
    );
    if (!m) return null;
    const day = parseInt(m[1], 10);
    const monthName = m[2].toLowerCase();
    const year = parseInt(m[3], 10);
    const month = MONTHS[monthName];
    if (!month || !day || !year) return null;
    return `${year}-${pad2(month)}-${pad2(day)}`;
  }

  // Build a Set of dates (YYYY-MM-DD) that have events saved in localStorage.
  // Works with your existing data that only has "formatteddatetime".
  function loadEventDateSet() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      const events = raw ? JSON.parse(raw) : [];
      const set = new Set();
      for (const ev of events) {
        // prefer explicit ISO if it ever exists; otherwise parse the pretty string
        const iso = ev?.dateISO || parseEnAuDateToISO(ev?.formatteddatetime);
        if (iso) set.add(iso);
      }
      return set;
    } catch (e) {
      // If storage is corrupt, fail quietly so calendar still renders
      return new Set();
    }
  }

  function renderCalendar() {
    // Clear previous cells
    calendarDates.innerHTML = '';

    // Header
    monthYearElement.textContent = `${monthNames[currentMonth]} ${currentYear}`;

    // Layout
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // Dates that have events
    const eventDateSet = loadEventDateSet();

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

      // today highlight
      if (day === today.getDate() &&
          currentMonth === today.getMonth() &&
          currentYear === today.getFullYear()) {
        dateCell.classList.add('today');
      }

      // event highlight
      const iso = `${currentYear}-${pad2(currentMonth + 1)}-${pad2(day)}`;
      if (eventDateSet.has(iso)) {
        dateCell.classList.add('has-event');
      }

      // selection behavior
      dateCell.addEventListener('click', () => {
        document.querySelectorAll('.calendar-day.selected').forEach(c => c.classList.remove('selected'));
        dateCell.classList.add('selected');
        console.log(`Selected date: ${iso}`);
      });

      calendarDates.appendChild(dateCell);
    }
  }

  // Navigation
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

  // Initial render
  renderCalendar();
});

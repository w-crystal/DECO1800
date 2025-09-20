// calendar.js
document.addEventListener('DOMContentLoaded', function() {
    // Get current date
    let currentDate = new Date();
    let currentMonth = currentDate.getMonth();
    let currentYear = currentDate.getFullYear();
    
    // DOM elements
    const monthYearElement = document.getElementById('month-year');
    const prevMonthButton = document.getElementById('prev-month');
    const nextMonthButton = document.getElementById('next-month');
    const calendarDates = document.getElementById('calendar-dates');
    
    // Event listeners for navigation
    prevMonthButton.addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        renderCalendar();
    });
    
    nextMonthButton.addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        renderCalendar();
    });
    
    // Function to render the calendar
    function renderCalendar() {
        // Clear previous dates
        calendarDates.innerHTML = '';
        
        // Update month/year header
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        monthYearElement.textContent = `${monthNames[currentMonth]} ${currentYear}`;
        
        // Get first day of month and number of days
        const firstDay = new Date(currentYear, currentMonth, 1).getDay();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        
        // Create empty cells for days before the first day of the month
        for (let i = 0; i < firstDay; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'calendar-day empty';
            calendarDates.appendChild(emptyCell);
        }
        
        // Create cells for each day of the month
        const today = new Date();
        for (let day = 1; day <= daysInMonth; day++) {
            const dateCell = document.createElement('div');
            dateCell.className = 'calendar-day';
            dateCell.textContent = day;
            
            // Highlight current day
            if (day === today.getDate() && 
                currentMonth === today.getMonth() && 
                currentYear === today.getFullYear()) {
                dateCell.classList.add('today');
            }
            
            // Add click event to each date
            dateCell.addEventListener('click', () => {
                // Remove any previously selected date
                document.querySelectorAll('.calendar-day.selected').forEach(cell => {
                    cell.classList.remove('selected');
                });
                
                // Select this date
                dateCell.classList.add('selected');
                
                // You can add more functionality here, like showing events for this date
                console.log(`Selected date: ${currentYear}-${currentMonth + 1}-${day}`);
            });
            
            calendarDates.appendChild(dateCell);
        }
    }
    
    // Initialize the calendar
    renderCalendar();
});
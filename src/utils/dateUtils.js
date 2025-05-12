// src/utils/dateUtils.js

/**
 * Formats a Date object into YYYY-MM-DD string.
 * @param {Date} date - The date to format.
 * @returns {string} The formatted date string.
 */
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Calculates the start and end dates for a given timeframe option.
 * Assumes Australian weekend is Saturday and Sunday.
 * @param {string} timeframeOption - "Today", "This weekend", or "Next weekend".
 * @param {Date} [currentDate=new Date()] - The current date, defaults to now.
 * @returns {{startDate: string, endDate: string}} Object with formatted start and end dates.
 */
export function getDateRangeForTimeframe(timeframeOption, currentDate = new Date()) {
    let startDateObj = new Date(currentDate);
    let endDateObj = new Date(currentDate);

    const dayOfWeek = currentDate.getDay(); // 0 (Sun) to 6 (Sat)

    switch (timeframeOption) {
        case "Today":
            // startDateObj and endDateObj are already currentDate
            break;
        case "This weekend":
            // If today is Saturday, "This weekend" starts today and ends tomorrow.
            // If today is Sunday, "This weekend" started yesterday and ends today.
            // If today is Mon-Fri, "This weekend" is the upcoming Saturday & Sunday.
            if (dayOfWeek === 6) { // Saturday
                // startDateObj is today
                endDateObj.setDate(startDateObj.getDate() + 1); // Sunday
            } else if (dayOfWeek === 0) { // Sunday
                startDateObj.setDate(currentDate.getDate() - 1); // Saturday
                // endDateObj is today
            } else { // Monday to Friday
                const daysUntilSaturday = 6 - dayOfWeek;
                startDateObj.setDate(currentDate.getDate() + daysUntilSaturday);
                endDateObj.setDate(startDateObj.getDate() + 1); // Sunday
            }
            break;
        case "Next weekend":
            // Calculate the upcoming Saturday first, then add 7 days.
            // daysUntilUpcomingSaturday will be 0 if today is Sat, 1 if Fri, ..., 6 if Sun.
            let daysUntilUpcomingSaturday = (6 - dayOfWeek + 7) % 7;
            
            let upcomingSaturday = new Date(currentDate);
            upcomingSaturday.setDate(currentDate.getDate() + daysUntilUpcomingSaturday);

            // "Next weekend" starts 7 days after this upcoming Saturday.
            startDateObj.setDate(upcomingSaturday.getDate() + 7);
            endDateObj.setDate(startDateObj.getDate() + 1); // And ends the day after (Sunday)
            break;
        default:
            console.error("Invalid timeframe option:", timeframeOption);
            // Return current day as a fallback, or handle error appropriately
            return {
                startDate: formatDate(startDateObj),
                endDate: formatDate(endDateObj),
            };
    }

    return {
        startDate: formatDate(startDateObj),
        endDate: formatDate(endDateObj),
    };
}

const millisecondsPerDay = 24 * 60 * 60 * 1000;
const usdFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 6,
});

function parseDate(value) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
}

function toIsoDate(date) {
    return date.toISOString().slice(0, 10);
}

export function buildCostProjection(report, from, to) {
    const startDate = parseDate(from);
    const endDate = parseDate(to);
    const daysInRange = Math.floor((endDate - startDate) / millisecondsPerDay) + 1;
    const dates = Array.from({ length: daysInRange }, (_, index) => {
        const date = new Date(startDate);
        date.setUTCDate(date.getUTCDate() + index);
        return date;
    });
    const dateIndexes = new Map(dates.map((date, index) => [toIsoDate(date), index]));
    const dailyTotals = new Map(
        (report?.days || []).map((day) => [day.date, Number(day.report?.totalUsd || 0)]),
    );
    const finalizedIndexes = [...dailyTotals.keys()]
        .map((date) => dateIndexes.get(date))
        .filter(Number.isInteger)
        .sort((left, right) => left - right);
    const finalizedDays = finalizedIndexes.length;
    const lastFinalizedIndex = finalizedIndexes.at(-1) ?? -1;
    const actualData = Array(daysInRange).fill(null);
    let actualTotal = 0;

    finalizedIndexes.forEach((index) => {
        actualTotal += dailyTotals.get(toIsoDate(dates[index])) || 0;
        actualData[index] = actualTotal;
    });

    const averageDaily = finalizedDays > 0 ? actualTotal / finalizedDays : 0;
    const remainingDays = Math.max(0, daysInRange - lastFinalizedIndex - 1);
    const projectedTotal = finalizedDays > 0
        ? actualTotal + averageDaily * remainingDays
        : 0;
    const forecastData = Array(daysInRange).fill(null);
    if (lastFinalizedIndex >= 0) {
        forecastData[lastFinalizedIndex] = actualTotal;
        for (let index = lastFinalizedIndex + 1; index < daysInRange; index += 1) {
            forecastData[index] = actualTotal + averageDaily * (index - lastFinalizedIndex);
        }
    }

    return {
        actualTotal,
        averageDaily,
        projectedTotal,
        finalizedDays,
        chartData: {
            labels: dates.map((date) => (
                `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}`
            )),
            datasets: [
                {
                    label: 'Chi phí lũy kế thực tế',
                    data: actualData,
                    borderColor: '#101d54',
                    backgroundColor: 'rgba(16, 29, 84, 0.1)',
                    borderWidth: 3,
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    tension: 0.3,
                    fill: true,
                    spanGaps: true,
                },
                {
                    label: 'Dự báo theo trung bình ngày',
                    data: forecastData,
                    borderColor: '#1b2d75',
                    borderDash: [7, 6],
                    borderWidth: 3,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    tension: 0.25,
                },
            ],
        },
    };
}

export const costChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
        legend: {
            position: 'bottom',
            labels: { usePointStyle: true, boxWidth: 8, padding: 20 },
        },
        tooltip: {
            callbacks: {
                label: (context) => ` ${context.dataset.label}: ${usdFormatter.format(context.raw)}`,
            },
        },
    },
    scales: {
        x: {
            grid: { display: false },
            ticks: { autoSkip: true, maxTicksLimit: 16, maxRotation: 0 },
        },
        y: {
            beginAtZero: true,
            grid: { color: 'rgba(16, 29, 84, 0.06)' },
            ticks: { callback: (value) => usdFormatter.format(value) },
        },
    },
};

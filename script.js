const sensorConfig = [
    { id: 0, label: 'U1', min: 105, max: 115, norm: [108, 112], unit: 'кВ', decimals: 1 },
    { id: 1, label: 'U2', min: 9.5, max: 10.5, norm: [9.8, 10.2], unit: 'кВ', decimals: 2 },
    { id: 2, label: 'I', min: 50, max: 400, norm: [100, 350], unit: 'А', decimals: 0 },
    { id: 3, label: 'T', min: 40, max: 95, norm: [50, 75], unit: '°C', decimals: 1 }
];

let autoUpdateInterval = null;
let history = JSON.parse(localStorage.getItem('tp_history')) || [];
let chart;

function initChart() {
    const ctx = document.getElementById('mainChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: history.slice(-10).map(h => h.time),
            datasets: [{
                label: 'Температура T (°C)',
                data: history.slice(-10).map(h => h.values[3]),
                borderColor: '#ef4444',
                tension: 0.4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function playAlarm() {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const osc = context.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, context.currentTime);
    osc.connect(context.destination);
    osc.start();
    osc.stop(context.currentTime + 0.1);
}

function generateData(cfg) {
    return (Math.random() * (cfg.max + 5 - (cfg.min - 5)) + (cfg.min - 5)).toFixed(cfg.decimals);
}

function getStatus(val, cfg) {
    const v = parseFloat(val);
    if (v >= cfg.norm[0] && v <= cfg.norm[1]) return 'normal';
    if (v >= cfg.min && v <= cfg.max) return 'warning';
    return 'danger';
}

function updateDashboard() {
    const now = new Date().toLocaleTimeString('uk-UA');
    const currentBatch = [];
    let hasDanger = false;

    sensorConfig.forEach(cfg => {
        const val = generateData(cfg);
        const status = getStatus(val, cfg);
        currentBatch.push(val);

        const card = document.getElementById(`card-${cfg.id}`);
        const text = document.getElementById(`param${cfg.id}`);
        const fill = card.querySelector('.progress-fill');

        card.className = `card status-${status}`;
        text.textContent = val;
        
        let percent = ((val - (cfg.min - 5)) / (cfg.max - cfg.min + 10)) * 100;
        fill.style.width = `${Math.min(100, Math.max(0, percent))}%`;
        fill.style.backgroundColor = `var(--${status})`;

        if (status === 'danger') hasDanger = true;
    });

    if (hasDanger && autoUpdateInterval) playAlarm();

    document.getElementById('rpnStatus').textContent = "Ступінь " + (Math.floor(Math.random() * 12) + 1);
    document.getElementById('coolStatus').textContent = Math.random() > 0.4 ? "Активне" : "Очікування";
    document.getElementById('oilStatus').textContent = Math.random() > 0.1 ? "Норма" : "НИЗЬКИЙ";

    history.push({ time: now, values: currentBatch });
    if (history.length > 20) history.shift();
    localStorage.setItem('tp_history', JSON.stringify(history));

    chart.data.labels = history.slice(-10).map(h => h.time);
    chart.data.datasets[0].data = history.slice(-10).map(h => h.values[3]);
    chart.update();

    document.getElementById('lastUpdate').textContent = now;
}

document.addEventListener('DOMContentLoaded', () => {
    initChart();
    updateDashboard();

    document.getElementById('updateBtn').onclick = updateDashboard;
    document.getElementById('themeBtn').onclick = () => document.body.classList.toggle('light-theme');
    document.getElementById('exportBtn').onclick = () => {
        let csv = "Time,U1,U2,I,T\n";
        history.forEach(h => { csv += `${h.time},${h.values.join(',')}\n`; });
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'data.csv';
        a.click();
    };
    
    document.getElementById('autoUpdateBtn').onclick = function() {
        if (autoUpdateInterval) {
            clearInterval(autoUpdateInterval);
            autoUpdateInterval = null;
            this.textContent = "Запустити автооновлення";
            document.getElementById('autoStatus').textContent = "Вимкнено";
        } else {
            autoUpdateInterval = setInterval(updateDashboard, 3000);
            this.textContent = "Зупинити";
            document.getElementById('autoStatus').textContent = "Активно (3с)";
        }
    };
});
// Data from NBR 6401/1980 Table 13
// Note: Last row 50mm -> 150mm (6") correction applied as per standard sizes
const pipeTable = [
    { mm: 19, in: '3/4"', closed: { flow: 1.5, vel: 1.2, loss: 10 }, open: { flow: 1.0, vel: 0.8, loss: 10 } },
    { mm: 25, in: '1"', closed: { flow: 3.0, vel: 1.5, loss: 10 }, open: { flow: 2.2, vel: 1.1, loss: 10 } },
    { mm: 32, in: '1.1/4"', closed: { flow: 6.0, vel: 1.7, loss: 10 }, open: { flow: 4.0, vel: 1.2, loss: 10 } },
    { mm: 38, in: '1.1/2"', closed: { flow: 9.0, vel: 1.9, loss: 10 }, open: { flow: 6.0, vel: 1.3, loss: 10 } },
    { mm: 50, in: '2"', closed: { flow: 17.0, vel: 2.2, loss: 10 }, open: { flow: 12.0, vel: 1.6, loss: 10 } },
    { mm: 65, in: '2.1/2"', closed: { flow: 28.0, vel: 2.5, loss: 10 }, open: { flow: 23.0, vel: 2.1, loss: 10 } },
    { mm: 75, in: '3"', closed: { flow: 48.0, vel: 2.8, loss: 10 }, open: { flow: 36.0, vel: 2.1, loss: 10 } },
    { mm: 100, in: '4"', closed: { flow: 90.0, vel: 3.1, loss: 9 }, open: { flow: 75.0, vel: 2.5, loss: 10 } },
    { mm: 125, in: '5"', closed: { flow: 143.0, vel: 3.1, loss: 7 }, open: { flow: 136.0, vel: 2.9, loss: 10 } },
    { mm: 150, in: '6"', closed: { flow: 215.0, vel: 3.2, loss: 5.5 }, open: { flow: 204.0, vel: 3.1, loss: 9 } }
];

// DOM Elements
const flowInput = document.getElementById('flowRate');
const systemRadios = document.getElementsByName('systemType');
const resultContainer = document.getElementById('resultContainer');
const emptyState = document.getElementById('emptyState');
const diameterMmEl = document.getElementById('diameterMm');
const diameterInEl = document.getElementById('diameterIn');
const velocityEl = document.getElementById('velocity');
const lossEl = document.getElementById('loss');
const warningEl = document.getElementById('warningMessage');

// Converter Elements
const trInput = document.getElementById('trInput');
const convertBtn = document.getElementById('convertBtn');

// Event Listeners
flowInput.addEventListener('input', calculate);
systemRadios.forEach(radio => radio.addEventListener('change', calculate));

// Converter Logic
convertBtn.addEventListener('click', convertTrToFlow);
trInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        convertTrToFlow();
    }
});

function convertTrToFlow() {
    const trValue = parseFloat(trInput.value);

    if (isNaN(trValue) || trValue < 0) {
        // Optional: Add visual feedback for invalid input
        return;
    }

    // Factor: 2.4 GPM/TR * 0.227125 (GPM to m3/h) = ~0.5451
    // Using simple factor 0.545 as per plan
    const flow = trValue * 0.545;

    // Update Main Input
    flowInput.value = flow.toFixed(2);

    // Trigger Calculation
    calculate();
}

function calculate() {
    const flowRate = parseFloat(flowInput.value);

    // Validate Input
    if (isNaN(flowRate) || flowRate <= 0) {
        showEmptyState();
        return;
    }

    const isClosed = document.getElementById('closed').checked;
    const systemKey = isClosed ? 'closed' : 'open';

    // Find suitable pipe
    // We look for the first pipe where maxFlow >= inputFlow
    let selectedPipe = null;
    let exceedsTable = false;

    // Check if flow exceeds the largest pipe in the table
    const largestPipe = pipeTable[pipeTable.length - 1];
    if (flowRate > largestPipe[systemKey].flow) {
        exceedsTable = true;
        selectedPipe = null;
    } else {
        for (const pipe of pipeTable) {
            if (pipe[systemKey].flow >= flowRate) {
                selectedPipe = pipe;
                break;
            }
        }
    }

    updateUI(selectedPipe, exceedsTable, systemKey);
}

function updateUI(pipe, exceedsTable, systemKey) {
    resultContainer.classList.remove('hidden');
    emptyState.style.display = 'none';

    if (exceedsTable) {
        warningEl.classList.remove('hidden');
        warningEl.textContent = `A vazão inserida excede a capacidade máxima da tabela (Maior que 6" / ${systemKey === 'closed' ? 215 : 204} m³/h).`;

        diameterMmEl.textContent = '--';
        diameterInEl.textContent = '--';
        velocityEl.textContent = '--';
        lossEl.textContent = '--';
        return;
    } else {
        warningEl.classList.add('hidden');
    }

    if (pipe) {
        const data = pipe[systemKey];

        diameterMmEl.textContent = pipe.mm;
        diameterInEl.textContent = pipe.in;
        velocityEl.textContent = data.vel.toLocaleString('pt-BR');
        lossEl.textContent = data.loss.toLocaleString('pt-BR');
    }
}

function showEmptyState() {
    resultContainer.classList.add('hidden');
    emptyState.style.display = 'block';
}

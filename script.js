// Interface da Seleção de Tubo Hidráulico. Os cálculos ficam em engine.js.
const {
    pipeTable,
    DEFAULT_MAX_VELOCITY,
    ECONOMIC_VELOCITY_MAX,
    annualHours,
    velocityForHours,
    PIPE_SECTIONS,
    sectionVelocity,
    M3H_PER_GPM,
    M3H_PER_TR,
    UNIT_LABELS,
    toTR,
    trToFlow,
    velocityFor,
    maxFlowFor,
    selectPipe
} = window.TuboEngine;

// DOM Elements
const flowInput = document.getElementById('flowRate');
const resultContainer = document.getElementById('resultContainer');
const emptyState = document.getElementById('emptyState');
const diameterMmEl = document.getElementById('diameterMm');
const diameterInEl = document.getElementById('diameterIn');
const velocityEl = document.getElementById('velocity');
const pipeMaxFlowEl = document.getElementById('pipeMaxFlow');
const warningEl = document.getElementById('warningMessage');

const maxVelocityInput = document.getElementById('maxVelocity');
const editVelocityBtn = document.getElementById('editVelocityBtn');
const velocityWarning = document.getElementById('velocityWarning');

const capacityUnit = document.getElementById('capacityUnit');
const capacityInput = document.getElementById('capacityInput');
const capacityBadge = document.getElementById('capacityBadge');
const convertBtn = document.getElementById('convertBtn');
const convertInfo = document.getElementById('convertInfo');
const flowHint = document.getElementById('flowHint');
const adoptedVelocityEl = document.getElementById('adoptedVelocity');
const exampleBtn = document.getElementById('exampleBtn');
const clearBtn = document.getElementById('clearBtn');
const simulateBtn = document.getElementById('simulateBtn');

const CONVERT_INFO_DEFAULT = convertInfo.textContent;
const FLOW_HINT_DEFAULT = flowHint.textContent;
const EXAMPLE_TR = 20;
const hoursPerDayEl = document.getElementById('hoursPerDay');
const daysPerWeekEl = document.getElementById('daysPerWeek');
const regimeHint = document.getElementById('regimeHint');
const velocitySource = document.getElementById('velocitySource');
const sectionRadios = document.getElementsByName('pipeSection');
const sectionHint = document.getElementById('sectionHint');
const segSubs = {
    geral: document.querySelector('label[for="secGeral"] .seg-sub'),
    recalque: document.querySelector('label[for="secRecalque"] .seg-sub'),
    succao: document.querySelector('label[for="secSuccao"] .seg-sub')
};
const resultPanel = document.getElementById('resultPanel');
const quickResult = document.getElementById('quickResult');
const qrPipe = document.getElementById('qrPipe');
const qrMm = document.getElementById('qrMm');
const qrVel = document.getElementById('qrVel');
const qrSub = document.getElementById('qrSub');

// Event Listeners
flowInput.addEventListener('input', () => {
    // Vazão digitada direto: a capacidade do conversor deixa de valer
    capacityInput.value = '';
    resetConvertInfo();
    calculate();
});
maxVelocityInput.addEventListener('input', calculate);
hoursPerDayEl.addEventListener('change', applyRegime);
daysPerWeekEl.addEventListener('change', applyRegime);
sectionRadios.forEach(radio => radio.addEventListener('change', applyRegime));
editVelocityBtn.addEventListener('click', toggleVelocityEdit);

capacityUnit.addEventListener('change', () => {
    capacityBadge.textContent = UNIT_LABELS[capacityUnit.value];
    if (capacityInput.value !== '') {
        convertCapacityToFlow();
    } else {
        resetConvertInfo();
    }
});
exampleBtn.addEventListener('click', loadExample);
simulateBtn.addEventListener('click', loadExample);
clearBtn.addEventListener('click', clearAll);
convertBtn.addEventListener('click', convertCapacityToFlow);
// Converte enquanto digita, para o resultado aparecer na hora
capacityInput.addEventListener('input', () => {
    if (capacityInput.value === '') {
        resetConvertInfo();
        flowInput.value = '';
        calculate();
        return;
    }
    convertCapacityToFlow();
});
capacityInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        convertCapacityToFlow();
    }
});

// ---------- Conversão de capacidade ----------

function formatNumber(value, decimals) {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function convertCapacityToFlow() {
    const value = parseFloat(capacityInput.value);

    if (isNaN(value) || value <= 0) {
        resetConvertInfo();
        return;
    }

    const unit = capacityUnit.value;
    const tr = toTR(value, unit);
    const flow = trToFlow(tr);

    flowInput.value = flow.toFixed(2);

    convertInfo.textContent = unit === 'TR'
        ? `${formatNumber(tr, 2)} TR → ${formatNumber(flow, 2)} m³/h`
        : `${formatNumber(value, 2)} ${UNIT_LABELS[unit]} = ${formatNumber(tr, 2)} TR → ${formatNumber(flow, 2)} m³/h`;
    convertInfo.classList.add('active');

    calculate();
}

function resetConvertInfo() {
    convertInfo.textContent = CONVERT_INFO_DEFAULT;
    convertInfo.classList.remove('active');
}

function loadExample() {
    capacityUnit.value = 'TR';
    capacityBadge.textContent = UNIT_LABELS.TR;
    capacityInput.value = EXAMPLE_TR;
    convertCapacityToFlow();
}

function clearAll() {
    capacityInput.value = '';
    flowInput.value = '';
    resetConvertInfo();
    calculate();
}

// ---------- Regime de operação (Tabela 4) ----------

function regimeVelocity() {
    const hours = annualHours(Number(hoursPerDayEl.value), Number(daysPerWeekEl.value));
    return { hours, ...velocityForHours(hours) };
}

function currentSection() {
    const marcado = Array.from(sectionRadios).find(r => r.checked);
    return marcado ? marcado.value : 'geral';
}

function applyRegime() {
    const r = regimeVelocity();
    const secao = currentSection();
    const sv = sectionVelocity(secao, r.hours);
    const tipo = PIPE_SECTIONS[secao];

    // Velocidade de cada tipo para o regime atual (botões mostram o valor calculado)
    for (const chave of Object.keys(segSubs)) {
        const v = sectionVelocity(chave, r.hours).velocity;
        segSubs[chave].textContent = `${chave === 'geral' ? 'Tabela 4' : 'auto'} · ${formatNumber(v, 1)} m/s`;
    }

    if (secao === 'geral') {
        sectionHint.textContent = `Velocidade pelo regime de operação (Tabela 4): ${formatNumber(sv.velocity, 1)} m/s`;
    } else {
        const teto = formatNumber(tipo.range[1], 1);
        const erosao = formatNumber(sv.erosionLimit, 1);
        const manda = sv.limitedBy === 'tabela4' ? 'manda a erosão (Tabela 4)' : 'manda o teto da Tabela 3';
        sectionHint.textContent = `${tipo.label}: ${formatNumber(sv.velocity, 1)} m/s = menor entre ` +
            `Tabela 3 (até ${teto}) e Tabela 4 (${erosao}) → ${manda}`;
    }
    sectionHint.classList.remove('warn');
    const horas = formatNumber(Math.round(r.hours), 0);
    const linha = r.aboveTable
        ? `acima de ${formatNumber(r.row.hours, 0)} h (fim da tabela)`
        : `até ${formatNumber(r.row.hours, 0)} h`;
    let texto = `= ${horas} h/ano → Tabela 4: ${linha} → ${formatNumber(r.velocity, 1)} m/s`;
    if (r.velocity > ECONOMIC_VELOCITY_MAX) {
        texto += ` · acima da faixa econômica da Tabela 3 (até ${formatNumber(ECONOMIC_VELOCITY_MAX, 1)} m/s)`;
    }
    regimeHint.textContent = texto;
    regimeHint.classList.toggle('warn', r.velocity > ECONOMIC_VELOCITY_MAX);

    // Só sobrescreve a velocidade quando o usuário não está editando manualmente
    if (maxVelocityInput.disabled) {
        maxVelocityInput.value = sv.velocity.toFixed(1);
        velocitySource.textContent = secao === 'geral' ? 'Tabela 4' : `Tabela 3 · ${tipo.label.split(' ')[0]}`;
        calculate();
    }
}

// ---------- Velocidade máxima ----------

function toggleVelocityEdit() {
    if (maxVelocityInput.disabled) {
        maxVelocityInput.disabled = false;
        velocityWarning.classList.remove('hidden');
        editVelocityBtn.textContent = 'Usar padrão';
        velocitySource.textContent = 'Manual';
        velocitySource.classList.add('manual');
        maxVelocityInput.focus();
    } else {
        maxVelocityInput.disabled = true;
        velocityWarning.classList.add('hidden');
        editVelocityBtn.textContent = 'Editar';
        velocitySource.classList.remove('manual');
        applyRegime();
    }
}

// ---------- Cálculo ----------

function calculate() {
    const flowRate = parseFloat(flowInput.value);
    const maxVel = parseFloat(maxVelocityInput.value);

    if (isNaN(flowRate) || flowRate <= 0 || isNaN(maxVel) || maxVel <= 0) {
        showEmptyState();
        return;
    }

    // Menor diâmetro comercial cuja velocidade não ultrapassa a máxima adotada
    const selectedPipe = selectPipe(flowRate, maxVel).pipe;

    const lps = flowRate / 3.6;
    const gpm = flowRate / M3H_PER_GPM;
    flowHint.textContent = `= ${formatNumber(lps, 2)} L/s · ${formatNumber(gpm, 1)} GPM · ${formatNumber(flowRate / M3H_PER_TR, 2)} TR`;
    flowHint.classList.add('active');

    updateUI(selectedPipe, flowRate, maxVel);
}

function updateUI(pipe, flowRate, maxVel) {
    resultContainer.classList.remove('hidden');
    emptyState.classList.add('hidden');
    resultPanel.classList.remove('is-empty');
    adoptedVelocityEl.textContent = formatNumber(maxVel, 1);

    if (!pipe) {
        const largest = pipeTable[pipeTable.length - 1];
        warningEl.textContent = `A vazão inserida excede a capacidade do maior tubo da tabela (${largest.in} / ` +
            `${formatNumber(maxFlowFor(largest.mm, maxVel), 1)} m³/h a ${formatNumber(maxVel, 1)} m/s).`;
        warningEl.classList.remove('hidden');

        diameterMmEl.textContent = '--';
        diameterInEl.textContent = '--';
        velocityEl.textContent = '--';
        pipeMaxFlowEl.textContent = '--';
        setQuickResult('> 6"', '', 'Acima da tabela',
            `máx. ${formatNumber(maxFlowFor(largest.mm, maxVel), 1)} m³/h`, 'over');
        return;
    }

    warningEl.classList.add('hidden');

    diameterMmEl.textContent = pipe.mm;
    diameterInEl.textContent = pipe.in;
    velocityEl.textContent = formatNumber(velocityFor(flowRate, pipe.mm), 2);
    pipeMaxFlowEl.textContent = formatNumber(maxFlowFor(pipe.mm, maxVel), 1);
    const secao = currentSection();
    const sufixo = secao === 'geral' ? '' : ` · ${PIPE_SECTIONS[secao].label.split(' ')[0]}`;
    setQuickResult(pipe.in, `${pipe.mm} mm`,
        `${formatNumber(velocityFor(flowRate, pipe.mm), 2)} m/s`,
        `${formatNumber(flowRate, 2)} m³/h${sufixo}`, 'ok');
}

function setQuickResult(pipeText, mmText, velText, subText, state) {
    qrPipe.textContent = pipeText;
    qrMm.textContent = mmText;
    qrVel.textContent = velText;
    qrSub.textContent = subText;
    quickResult.classList.remove('ok', 'over');
    if (state) quickResult.classList.add(state);
}

function showEmptyState() {
    resultContainer.classList.add('hidden');
    emptyState.classList.remove('hidden');
    resultPanel.classList.add('is-empty');
    setQuickResult('--', '', 'Digite a capacidade', 'ou a vazão de água', null);
    flowHint.textContent = FLOW_HINT_DEFAULT;
    flowHint.classList.remove('active');
}

// Estado inicial: regime 24/7 → 3,0 m/s
applyRegime();

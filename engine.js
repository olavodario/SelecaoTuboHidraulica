// Motor de cálculo da Seleção de Tubo Hidráulico.
// Sem dependência de tela: roda no navegador (window.TuboEngine) e no Node (require).
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    } else {
        root.TuboEngine = api;
    }
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // Diâmetros comerciais adotados para a seleção (mm / polegada).
    const pipeTable = Object.freeze([
        { mm: 19, in: '3/4"' },
        { mm: 25, in: '1"' },
        { mm: 32, in: '1.1/4"' },
        { mm: 38, in: '1.1/2"' },
        { mm: 50, in: '2"' },
        { mm: 65, in: '2.1/2"' },
        { mm: 75, in: '3"' },
        { mm: 100, in: '4"' },
        { mm: 125, in: '5"' },
        { mm: 150, in: '6"' }
    ].map(Object.freeze));

    // ABNT NBR 16401-1:2024, Tabela 4 — Velocidade máxima recomendada para minimizar a erosão,
    // em função das horas por ano de operação normal.
    const EROSION_TABLE = Object.freeze([
        { hours: 1500, velocity: 4.6 },
        { hours: 2000, velocity: 4.4 },
        { hours: 3000, velocity: 4.0 },
        { hours: 4000, velocity: 3.7 },
        { hours: 6000, velocity: 3.0 }
    ].map(Object.freeze));

    // ABNT NBR 16401-1:2024, Tabela 3 — faixa econômica "Geral": 1,5 a 3,5 m/s.
    const ECONOMIC_VELOCITY_MAX = 3.5;

    const DAYS_PER_YEAR = 365;
    const DEFAULT_HOURS_PER_DAY = 24;
    const DEFAULT_DAYS_PER_WEEK = 7;

    function annualHours(hoursPerDay, daysPerWeek) {
        return hoursPerDay * daysPerWeek * DAYS_PER_YEAR / 7; // 24 h × 7 dias = 8 760 h/ano
    }

    /**
     * Velocidade máxima pela Tabela 4. Usa a primeira linha com horas >= às horas de operação
     * (lado seguro). Acima de 6 000 h/ano (ex.: 24/7) a tabela termina: adota-se o valor da
     * última linha, 3,0 m/s.
     */
    function velocityForHours(hoursPerYear) {
        if (!isPositiveNumber(hoursPerYear)) {
            throw new Error(`Horas de operação inválidas: ${hoursPerYear}`);
        }
        const row = EROSION_TABLE.find(r => hoursPerYear <= r.hours);
        const last = EROSION_TABLE[EROSION_TABLE.length - 1];
        return {
            velocity: (row || last).velocity,
            row: row || last,
            aboveTable: !row
        };
    }

    // Padrão: operação 24/7 (8 760 h/ano) → 3,0 m/s.
    const DEFAULT_MAX_VELOCITY = 3.0;

    // Tipo de trecho — ABNT NBR 16401-1:2024, Tabela 3 (velocidades econômicas recomendadas).
    //  - Geral: segue o regime de operação (Tabela 4).
    //  - Recalque e sucção: cálculo automático = máximo da faixa da Tabela 3, limitado pelo
    //    limite de erosão da Tabela 4 para o regime (12.1.4: custo, ruído e erosão).
    const PIPE_SECTIONS = Object.freeze({
        geral: Object.freeze({ label: 'Geral', auto: false, range: Object.freeze([1.5, 3.5]) }),
        recalque: Object.freeze({ label: 'Recalque de bombas', auto: true, range: Object.freeze([2.4, 3.6]) }),
        succao: Object.freeze({ label: 'Sucção de bombas', auto: true, range: Object.freeze([1.2, 2.1]) })
    });
    const DEFAULT_SECTION = 'geral';

    /**
     * Velocidade máxima de seleção para o tipo de trecho e o regime de operação.
     * limitedBy: 'tabela4' quando o limite de erosão manda; 'tabela3' quando manda o teto da faixa.
     * @returns {{velocity: number, section: string, erosionLimit: number, limitedBy: string,
     *            exceedsErosion: boolean, aboveTable: boolean}}
     */
    function sectionVelocity(section, hoursPerYear) {
        const tipo = PIPE_SECTIONS[section];
        if (!tipo) {
            throw new Error(`Tipo de trecho desconhecido: ${section}`);
        }
        const erosao = velocityForHours(hoursPerYear);
        let velocity;
        let limitedBy;
        if (!tipo.auto) {
            velocity = erosao.velocity;
            limitedBy = 'tabela4';
        } else {
            const teto = tipo.range[1];
            velocity = Math.max(tipo.range[0], Math.min(teto, erosao.velocity));
            limitedBy = erosao.velocity < teto ? 'tabela4' : 'tabela3';
        }
        return {
            velocity,
            section,
            erosionLimit: erosao.velocity,
            limitedBy,
            exceedsErosion: velocity > erosao.velocity,
            aboveTable: erosao.aboveTable
        };
    }

    // Conversões de capacidade — tudo passa primeiro para TR.
    const BTU_PER_TR = 12000;            // 1 TR = 12 000 BTU/h
    const KW_PER_TR = 3.516853;          // 1 TR = 3,516853 kW
    // Vazão de água por TR: 2,4 GPM/TR (ΔT ≈ 10 °F ≈ 5,6 °C), 1 GPM = 0,2271247 m³/h
    const GPM_PER_TR = 2.4;
    const M3H_PER_GPM = 0.2271247;
    const M3H_PER_TR = GPM_PER_TR * M3H_PER_GPM; // ≈ 0,545099 m³/h por TR

    const UNIT_LABELS = Object.freeze({ TR: 'TR', BTU: 'BTU/h', KW: 'kW' });

    function toTR(value, unit) {
        switch (unit) {
            case 'BTU': return value / BTU_PER_TR;
            case 'KW': return value / KW_PER_TR;
            case 'TR': return value;
            default: throw new Error(`Unidade desconhecida: ${unit}`);
        }
    }

    function trToFlow(tr) {
        return tr * M3H_PER_TR; // m³/h
    }

    function capacityToFlow(value, unit) {
        return trToFlow(toTR(value, unit));
    }

    function pipeArea(mm) {
        const d = mm / 1000;
        return Math.PI * d * d / 4; // m²
    }

    function velocityFor(flowM3h, mm) {
        return (flowM3h / 3600) / pipeArea(mm); // m/s
    }

    function maxFlowFor(mm, maxVel) {
        return maxVel * pipeArea(mm) * 3600; // m³/h
    }

    function isPositiveNumber(n) {
        return typeof n === 'number' && Number.isFinite(n) && n > 0;
    }

    /**
     * Seleciona o menor diâmetro comercial cuja velocidade não ultrapassa a máxima.
     * @returns {{status: 'ok'|'invalid'|'exceeds', pipe: object|null, velocity: number|null, maxFlow: number|null}}
     */
    function selectPipe(flowM3h, maxVel = DEFAULT_MAX_VELOCITY) {
        if (!isPositiveNumber(flowM3h) || !isPositiveNumber(maxVel)) {
            return { status: 'invalid', pipe: null, velocity: null, maxFlow: null };
        }

        const pipe = pipeTable.find(p => velocityFor(flowM3h, p.mm) <= maxVel);
        if (!pipe) {
            const largest = pipeTable[pipeTable.length - 1];
            return { status: 'exceeds', pipe: null, velocity: null, maxFlow: maxFlowFor(largest.mm, maxVel) };
        }

        return {
            status: 'ok',
            pipe,
            velocity: velocityFor(flowM3h, pipe.mm),
            maxFlow: maxFlowFor(pipe.mm, maxVel)
        };
    }

    return {
        pipeTable,
        DEFAULT_MAX_VELOCITY,
        EROSION_TABLE,
        ECONOMIC_VELOCITY_MAX,
        DEFAULT_HOURS_PER_DAY,
        DEFAULT_DAYS_PER_WEEK,
        annualHours,
        velocityForHours,
        PIPE_SECTIONS,
        DEFAULT_SECTION,
        sectionVelocity,
        BTU_PER_TR,
        KW_PER_TR,
        GPM_PER_TR,
        M3H_PER_GPM,
        M3H_PER_TR,
        UNIT_LABELS,
        toTR,
        trToFlow,
        capacityToFlow,
        pipeArea,
        velocityFor,
        maxFlowFor,
        selectPipe
    };
});

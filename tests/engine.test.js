// Testes unitários do motor de seleção de tubo, baseados na planilha da engenharia
// ("Tabela seleção tubo hidráulica.xlsx" → tests/fixtures/planilha-engenharia.json).
//
// Rodar:            node --test
// Modo estrito:     PLANILHA_ESTRITA=1 node --test
//   (no modo estrito, toda divergência entre o motor e a planilha vira falha)

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const engine = require('../engine.js');
const planilha = require(path.join(__dirname, 'fixtures', 'planilha-engenharia.json'));

const ESTRITO = process.env.PLANILHA_ESTRITA === '1';
const TOL = 1e-6;

function fmt(r) {
    return r.status === 'ok' ? r.pol : r.status;
}

describe('Tabela de diâmetros comerciais', () => {
    test('mesmas bitolas e na mesma ordem da planilha', () => {
        assert.deepEqual(engine.pipeTable.map(p => p.in), planilha.tabela.map(l => l.pol));
    });

    test('mesmos diâmetros em mm da planilha (exceto o 6", que lá está como 50 mm)', () => {
        planilha.tabela.forEach((linha, i) => {
            const tubo = engine.pipeTable[i];
            if (linha.pol === '6"') {
                assert.equal(linha.mm, 50, 'a planilha mudou: revisar a célula B17');
                assert.equal(tubo.mm, 150);
            } else {
                assert.equal(tubo.mm, linha.mm, `bitola ${linha.pol}`);
            }
        });
    });

    test('diâmetros em ordem crescente', () => {
        for (let i = 1; i < engine.pipeTable.length; i++) {
            assert.ok(engine.pipeTable[i].mm > engine.pipeTable[i - 1].mm);
        }
    });
});

describe('Conversão de capacidade (passa sempre por TR)', () => {
    test('1 TR = 12 000 BTU/h = 3,516853 kW', () => {
        assert.equal(engine.toTR(12000, 'BTU'), 1);
        assert.equal(engine.toTR(3.516853, 'KW'), 1);
        assert.equal(engine.toTR(1, 'TR'), 1);
    });

    test('fator de vazão = 2,4 GPM/TR × 0,2271247 m³/h por GPM', () => {
        assert.ok(Math.abs(engine.M3H_PER_TR - 0.54509928) < TOL);
    });

    test('20 TR = 240 000 BTU/h = 70,33706 kW = 10,90 m³/h', () => {
        const esperado = 20 * 2.4 * 0.2271247;
        assert.ok(Math.abs(engine.capacityToFlow(20, 'TR') - esperado) < TOL);
        assert.ok(Math.abs(engine.capacityToFlow(240000, 'BTU') - esperado) < TOL);
        assert.ok(Math.abs(engine.capacityToFlow(70.33706, 'KW') - esperado) < TOL);
        assert.equal(engine.capacityToFlow(20, 'TR').toFixed(2), '10.90');
    });

    test('unidade desconhecida gera erro', () => {
        assert.throws(() => engine.toTR(10, 'HP'), /Unidade desconhecida/);
    });
});

describe('Entradas inválidas (planilha: "Digite a vazão corretamente!")', () => {
    for (const valor of [0, -1, -0.01, NaN, Infinity, undefined, null, '10']) {
        test(`vazão ${String(valor)} → inválida`, () => {
            assert.equal(engine.selectPipe(valor).status, 'invalid');
        });
    }

    for (const v of [0, -3, NaN]) {
        test(`velocidade máxima ${v} → inválida`, () => {
            assert.equal(engine.selectPipe(10, v).status, 'invalid');
        });
    }
});

describe('Regras físicas do motor (v = Q / A)', () => {
    const vazoes = planilha.casos.map(c => c.vazao_m3h).filter(q => q > 0);

    test('velocidade calculada confere com v = Q / (π·D²/4)', () => {
        // 10,9 m³/h em 38 mm: 0,0030278 m³/s / 0,0011341 m² = 2,6698 m/s
        assert.ok(Math.abs(engine.velocityFor(10.9, 38) - 2.66977) < 1e-4);
    });

    test('o tubo escolhido nunca passa da velocidade máxima', () => {
        for (const q of vazoes) {
            const r = engine.selectPipe(q);
            if (r.status === 'ok') assert.ok(r.velocity <= engine.DEFAULT_MAX_VELOCITY + TOL, `${q} m³/h`);
        }
    });

    test('é sempre o menor tubo possível (o anterior passaria da velocidade)', () => {
        for (const q of vazoes) {
            const r = engine.selectPipe(q);
            if (r.status !== 'ok') continue;
            const i = engine.pipeTable.indexOf(r.pipe);
            if (i > 0) {
                assert.ok(engine.velocityFor(q, engine.pipeTable[i - 1].mm) > engine.DEFAULT_MAX_VELOCITY, `${q} m³/h`);
            }
        }
    });

    test('vazão maior nunca resulta em tubo menor', () => {
        let ultimo = -1;
        for (const q of vazoes) {
            const r = engine.selectPipe(q);
            const i = r.status === 'ok' ? engine.pipeTable.indexOf(r.pipe) : engine.pipeTable.length;
            assert.ok(i >= ultimo, `${q} m³/h`);
            ultimo = i;
        }
    });

    test('velocidade menor nunca resulta em tubo menor', () => {
        const idx = v => {
            const r = engine.selectPipe(40, v);
            return r.status === 'ok' ? engine.pipeTable.indexOf(r.pipe) : engine.pipeTable.length;
        };
        assert.ok(idx(1.2) >= idx(2.0));
        assert.ok(idx(2.0) >= idx(3.0));
        assert.ok(idx(3.0) >= idx(3.5));
    });

    test('acima do 6" informa a vazão máxima do 6" na velocidade adotada', () => {
        const r = engine.selectPipe(500);
        assert.equal(r.status, 'exceeds');
        assert.ok(Math.abs(r.maxFlow - 190.851754) < 1e-4);
    });
});

describe(`Bateria da planilha — resultado esperado do motor (${planilha.velocidade_motor_m_s} m/s)`, () => {
    for (const caso of planilha.casos) {
        const esp = caso.esperado_motor;
        test(`${caso.vazao_m3h} m³/h → ${fmt(esp)}`, () => {
            const r = engine.selectPipe(caso.vazao_m3h);
            assert.equal(r.status, esp.status);
            if (esp.status === 'ok') {
                assert.equal(r.pipe.in, esp.pol);
                assert.equal(r.pipe.mm, esp.mm);
                assert.ok(Math.abs(r.velocity - esp.velocidade) < 1e-4);
            }
        });
    }
});

describe('Comparativo com a planilha da engenharia (Tabela 13 / NBR 6401, sistema fechado)', () => {
    for (const caso of planilha.casos) {
        const esp = caso.esperado_planilha;
        const nome = `${caso.vazao_m3h} m³/h → planilha ${fmt(esp)}`;
        const opcoes = caso.diverge && !ESTRITO
            ? { todo: `motor novo dá ${fmt(caso.esperado_motor)}` }
            : {};
        test(nome, opcoes, () => {
            const r = engine.selectPipe(caso.vazao_m3h);
            assert.equal(fmt({ status: r.status, pol: r.pipe && r.pipe.in }), fmt(esp));
        });
    }
});

describe('Regime de operação — NBR 16401-1:2024, Tabela 4 (erosão)', () => {
    test('tabela igual à norma: 1500→4,6 · 2000→4,4 · 3000→4,0 · 4000→3,7 · 6000→3,0', () => {
        assert.deepEqual(
            engine.EROSION_TABLE.map(r => [r.hours, r.velocity]),
            [[1500, 4.6], [2000, 4.4], [3000, 4.0], [4000, 3.7], [6000, 3.0]]
        );
    });

    test('horas exatas de cada linha usam a própria linha', () => {
        for (const r of engine.EROSION_TABLE) {
            assert.equal(engine.velocityForHours(r.hours).velocity, r.velocity);
        }
    });

    test('horas entre linhas sobem para a linha seguinte (lado seguro)', () => {
        assert.equal(engine.velocityForHours(1000).velocity, 4.6);
        assert.equal(engine.velocityForHours(1501).velocity, 4.4);
        assert.equal(engine.velocityForHours(2500).velocity, 4.0);
        assert.equal(engine.velocityForHours(3500).velocity, 3.7);
        assert.equal(engine.velocityForHours(5000).velocity, 3.0);
    });

    test('acima de 6 000 h/ano a tabela acaba: adota 3,0 m/s e sinaliza', () => {
        const r = engine.velocityForHours(6001);
        assert.equal(r.velocity, 3.0);
        assert.equal(r.aboveTable, true);
        assert.equal(engine.velocityForHours(6000).aboveTable, false);
    });

    const regimes = [
        // [h/dia, dias/semana, h/ano esperadas, m/s]
        [24, 7, 8760, 3.0],   // 24/7 (padrão)
        [16, 7, 5840, 3.0],
        [12, 7, 4380, 3.0],
        [10, 7, 3650, 3.7],
        [12, 6, 3754.29, 3.7],
        [12, 5, 3128.57, 3.7],
        [10, 6, 3128.57, 3.7],
        [10, 5, 2607.14, 4.0],
        [8, 7, 2920, 4.0],
        [8, 6, 2502.86, 4.0],
        [8, 5, 2085.71, 4.0],
        [6, 5, 1564.29, 4.4],
        [4, 5, 1042.86, 4.6]
    ];
    for (const [h, d, horasAno, vel] of regimes) {
        test(`${h} h/dia × ${d} dias/sem = ${horasAno} h/ano → ${vel} m/s`, () => {
            const horas = engine.annualHours(h, d);
            assert.ok(Math.abs(horas - horasAno) < 0.01, `h/ano = ${horas}`);
            assert.equal(engine.velocityForHours(horas).velocity, vel);
        });
    }

    test('padrão do app (24/7) bate com DEFAULT_MAX_VELOCITY', () => {
        const h = engine.annualHours(engine.DEFAULT_HOURS_PER_DAY, engine.DEFAULT_DAYS_PER_WEEK);
        assert.equal(engine.velocityForHours(h).velocity, engine.DEFAULT_MAX_VELOCITY);
    });

    test('horas inválidas geram erro', () => {
        for (const h of [0, -10, NaN, undefined]) {
            assert.throws(() => engine.velocityForHours(h), /Horas de operação inválidas/);
        }
    });

    test('regime com menos horas nunca dá tubo maior (mesma vazão)', () => {
        const idx = (q, v) => {
            const r = engine.selectPipe(q, v);
            return r.status === 'ok' ? engine.pipeTable.indexOf(r.pipe) : engine.pipeTable.length;
        };
        for (const q of [2, 10.9, 40, 100, 180]) {
            const vels = engine.EROSION_TABLE.map(r => r.velocity); // 4,6 → 3,0
            for (let i = 1; i < vels.length; i++) {
                assert.ok(idx(q, vels[i]) >= idx(q, vels[i - 1]), `${q} m³/h`);
            }
        }
    });

    test('exemplo: 40 m³/h → 3" a 3,0 m/s (24/7) e 2.1/2" a 4,0 m/s (8 h × 5 dias)', () => {
        assert.equal(engine.selectPipe(40, 3.0).pipe.in, '3"');
        assert.equal(engine.selectPipe(40, 4.0).pipe.in, '2.1/2"');
    });
});

describe('Tipo de trecho — cálculo automático (Tabela 3 limitada pela Tabela 4)', () => {
    const regime = (h, d) => engine.annualHours(h, d);

    test('Geral é o padrão e segue o regime (24/7 → 3,0 m/s; 8 h × 5 dias → 4,0 m/s)', () => {
        assert.equal(engine.DEFAULT_SECTION, 'geral');
        assert.equal(engine.sectionVelocity('geral', regime(24, 7)).velocity, 3.0);
        assert.equal(engine.sectionVelocity('geral', regime(8, 5)).velocity, 4.0);
    });

    test('faixas da Tabela 3: recalque 2,4–3,6 · sucção 1,2–2,1 · geral 1,5–3,5', () => {
        assert.deepEqual([...engine.PIPE_SECTIONS.recalque.range], [2.4, 3.6]);
        assert.deepEqual([...engine.PIPE_SECTIONS.succao.range], [1.2, 2.1]);
        assert.deepEqual([...engine.PIPE_SECTIONS.geral.range], [1.5, 3.5]);
    });

    // [h/dia, dias/sem, limite Tabela 4, recalque esperado, quem limita, sucção esperada]
    const regimes = [
        [24, 7, 3.0, 3.0, 'tabela4', 2.1],
        [16, 7, 3.0, 3.0, 'tabela4', 2.1],
        [10, 7, 3.7, 3.6, 'tabela3', 2.1],
        [12, 5, 3.7, 3.6, 'tabela3', 2.1],
        [8, 5, 4.0, 3.6, 'tabela3', 2.1],
        [6, 5, 4.4, 3.6, 'tabela3', 2.1],
        [4, 5, 4.6, 3.6, 'tabela3', 2.1]
    ];
    for (const [h, d, erosao, recalque, limita, succao] of regimes) {
        test(`${h} h × ${d} dias: Tabela 4 = ${erosao} → recalque ${recalque} (${limita}) · sucção ${succao}`, () => {
            const r = engine.sectionVelocity('recalque', regime(h, d));
            assert.equal(r.erosionLimit, erosao);
            assert.equal(r.velocity, recalque);
            assert.equal(r.limitedBy, limita);
            const s = engine.sectionVelocity('succao', regime(h, d));
            assert.equal(s.velocity, succao);
            assert.equal(s.limitedBy, 'tabela3');
        });
    }

    test('recalque e sucção nunca passam do limite de erosão nem saem da faixa da Tabela 3', () => {
        for (let h = 1; h <= 24; h++) {
            for (let d = 1; d <= 7; d++) {
                for (const chave of ['recalque', 'succao']) {
                    const r = engine.sectionVelocity(chave, regime(h, d));
                    const [min, max] = engine.PIPE_SECTIONS[chave].range;
                    assert.equal(r.exceedsErosion, false, `${chave} ${h}×${d}`);
                    assert.ok(r.velocity >= min && r.velocity <= max, `${chave} ${h}×${d}`);
                }
            }
        }
    });

    test('tipo desconhecido gera erro', () => {
        assert.throws(() => engine.sectionVelocity('dreno', regime(24, 7)), /Tipo de trecho desconhecido/);
    });

    // Mesma vazão nos três tipos (24/7): geral 3,0 · recalque 3,0 · sucção 2,1
    const casos = [
        // [m³/h, geral, recalque, sucção] — conferidos à parte com v = Q / (π·D²/4)
        [5.45, '1.1/4"', '1.1/4"', '1.1/4"'],  // 10 TR
        [10.9, '1.1/2"', '1.1/2"', '2"'],      // 20 TR
        [38.16, '3"', '3"', '4"'],             // 70 TR
        [100, '5"', '5"', '6"'],
        [190, '6"', '6"', 'exceeds']
    ];
    for (const [q, geral, recalque, succao] of casos) {
        test(`24/7 · ${q} m³/h → Geral ${geral} · Recalque ${recalque} · Sucção ${succao}`, () => {
            const pega = s => {
                const r = engine.selectPipe(q, engine.sectionVelocity(s, regime(24, 7)).velocity);
                return r.status === 'ok' ? r.pipe.in : r.status;
            };
            assert.equal(pega('geral'), geral);
            assert.equal(pega('recalque'), recalque);
            assert.equal(pega('succao'), succao);
        });
    }

    test('8 h × 5 dias · 38,16 m³/h → recalque 3,6 m/s dá 2.1/2"', () => {
        const v = engine.sectionVelocity('recalque', regime(8, 5)).velocity;
        assert.equal(engine.selectPipe(38.16, v).pipe.in, '2.1/2"');
    });
});

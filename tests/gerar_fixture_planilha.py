"""Gera tests/fixtures/planilha-engenharia.json a partir da planilha da engenharia.

Uso:
    python tests/gerar_fixture_planilha.py "C:/caminho/Tabela seleção tubo hidráulica.xlsx"

A planilha (aba Planilha1) tem a Tabela 13 da NBR 6401/1980 nas linhas 8 a 17 e
escolhe a bitola com COUNTIFS na coluna A: a primeira linha cuja vazão máxima do
Sistema Fechado (coluna D) é >= à vazão digitada em C1. Vazão <= 0 dá
"Digite a vazão corretamente!" e vazão acima da última linha dá "Maior que 6"".

Para cada vazão da bateria este script grava:
  - esperado_planilha: o que a planilha responde (réplica da fórmula do Excel);
  - esperado_motor:    o que o motor novo deve responder (v = Q/A <= 3,0 m/s),
                       calculado aqui de forma independente do engine.js.
"""
import json
import math
import os
import sys

import openpyxl

VELOCIDADE_PADRAO = 3.0
AQUI = os.path.dirname(os.path.abspath(__file__))
SAIDA = os.path.join(AQUI, 'fixtures', 'planilha-engenharia.json')


def ler_tabela(caminho):
    ws = openpyxl.load_workbook(caminho, data_only=True)['Planilha1']
    linhas = []
    for r in range(8, 18):
        linhas.append({
            'linha_excel': r,
            'mm': ws.cell(r, 2).value,
            'pol': ws.cell(r, 3).value,
            'fechado': {'vazao': ws.cell(r, 4).value, 'velocidade': ws.cell(r, 5).value, 'perda': ws.cell(r, 6).value},
            'aberto': {'vazao': ws.cell(r, 7).value, 'velocidade': ws.cell(r, 8).value, 'perda': ws.cell(r, 9).value},
        })
    return linhas


def planilha_seleciona(vazao, linhas):
    """Réplica das fórmulas A8:A18 + C2 (sistema fechado)."""
    if vazao <= 0:
        return {'status': 'invalid', 'pol': None}
    anterior = 0
    for ln in linhas:
        if anterior < vazao <= ln['fechado']['vazao']:
            return {'status': 'ok', 'pol': ln['pol']}
        anterior = ln['fechado']['vazao']
    return {'status': 'exceeds', 'pol': None}


# Diâmetros comerciais do app (o 6" é 150 mm; a planilha traz 50 mm por engano na B17)
TUBOS_APP = [(19, '3/4"'), (25, '1"'), (32, '1.1/4"'), (38, '1.1/2"'), (50, '2"'),
             (65, '2.1/2"'), (75, '3"'), (100, '4"'), (125, '5"'), (150, '6"')]


def motor_seleciona(vazao, vmax=VELOCIDADE_PADRAO):
    if vazao <= 0:
        return {'status': 'invalid', 'pol': None, 'mm': None, 'velocidade': None}
    for mm, pol in TUBOS_APP:
        area = math.pi * (mm / 1000) ** 2 / 4
        v = vazao / 3600 / area
        if v <= vmax:
            return {'status': 'ok', 'pol': pol, 'mm': mm, 'velocidade': round(v, 4)}
    return {'status': 'exceeds', 'pol': None, 'mm': None, 'velocidade': None}


def bateria(linhas):
    vazoes = {0.1, 0.5, 1.0}
    anterior = 0
    for ln in linhas:
        q = ln['fechado']['vazao']
        vazoes.add(round((anterior + q) / 2, 2))  # meio da faixa
        vazoes.add(q)                              # limite exato (<=)
        vazoes.add(round(q + 0.01, 2))             # logo acima do limite
        anterior = q
    # limites do motor novo (3 m/s) e capacidades em TR usuais
    for mm, _ in TUBOS_APP:
        qmax = VELOCIDADE_PADRAO * math.pi * (mm / 1000) ** 2 / 4 * 3600
        vazoes.add(math.floor(qmax * 100) / 100)
        vazoes.add(math.ceil(qmax * 100) / 100)
    for tr in (5, 10, 20, 30, 40, 60, 80, 100, 150, 200, 300):
        vazoes.add(round(tr * 2.4 * 0.2271247, 2))
    vazoes.update({250.0, 500.0})
    return sorted(vazoes)


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    caminho = sys.argv[1]
    linhas = ler_tabela(caminho)
    casos = []
    for q in bateria(linhas):
        p = planilha_seleciona(q, linhas)
        m = motor_seleciona(q)
        casos.append({
            'vazao_m3h': q,
            'esperado_planilha': p,
            'esperado_motor': m,
            'diverge': p['status'] != m['status'] or p['pol'] != m['pol'],
        })
    for q in (0, -1):
        casos.append({'vazao_m3h': q, 'esperado_planilha': planilha_seleciona(q, linhas),
                      'esperado_motor': motor_seleciona(q), 'diverge': False})

    dados = {
        'fonte': os.path.basename(caminho),
        'observacao': 'Tabela 13 - NBR 6401/1980, Sistema Fechado (coluna D). '
                      'A planilha registra o 6" como 50 mm (célula B17), o correto é 150 mm.',
        'velocidade_motor_m_s': VELOCIDADE_PADRAO,
        'tabela': linhas,
        'casos': casos,
    }
    os.makedirs(os.path.dirname(SAIDA), exist_ok=True)
    with open(SAIDA, 'w', encoding='utf-8') as f:
        json.dump(dados, f, ensure_ascii=False, indent=2)
    n_div = sum(c['diverge'] for c in casos)
    print(f'{len(casos)} casos gravados em {SAIDA} ({n_div} divergem da planilha)')


if __name__ == '__main__':
    main()

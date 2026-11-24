<p align="center">
  <img src="img/logo-hidroflow.svg" alt="HidroFlow" width="120">
</p>

<h1 align="center">HidroFlow</h1>
<p align="center">Seleção de tubo hidráulico para água gelada e condensação (HVAC) — <strong>ABNT NBR 16401-1:2024</strong></p>

---

Calculadora web que indica a **bitola comercial** da tubulação de água a partir da vazão
(ou da capacidade em TR, BTU/h ou kW), seguindo os critérios de velocidade da
ABNT NBR 16401-1:2024, item 12.

Roda direto do `index.html`, **sem servidor, sem instalação e sem internet**.
Funciona no computador e no celular.

## Como usar

1. Abra o `index.html` no navegador.
2. Informe a **capacidade** (TR, BTU/h ou kW) no conversor **ou** a **vazão** em m³/h.
3. Escolha o **tipo de trecho** e o **regime de operação**.
4. A bitola recomendada aparece na hora, com a velocidade real da água.

O passo a passo completo, incluindo o uso no celular, está no
[manual_instalacao_uso.md](manual_instalacao_uso.md).

## Critério de cálculo

| Etapa | Regra | Referência |
|---|---|---|
| Capacidade → TR | 1 TR = 12.000 BTU/h = 3,516853 kW | — |
| TR → vazão | 2,4 GPM/TR × 0,2271247 = **0,5451 m³/h por TR** (ΔT ≈ 5,6 °C, fixo) | — |
| Velocidade máxima — **Geral** | Pelas horas de operação por ano (tabela abaixo). Padrão **24/7 = 3,0 m/s** | Tabela 4 |
| Velocidade máxima — **Recalque** | Menor valor entre 3,6 m/s (teto da faixa 2,4 a 3,6) e o limite da Tabela 4 | Tabelas 3 e 4 |
| Velocidade máxima — **Sucção** | Menor valor entre 2,1 m/s (teto da faixa 1,2 a 2,1) e o limite da Tabela 4 | Tabelas 3 e 4 |
| Seleção | Menor diâmetro comercial com `v = Q / (π·D²/4)` ≤ velocidade máxima | 12.1.4 |

**Tabela 4: velocidade máxima para minimizar a erosão**

| Horas por ano | até 1.500 | até 2.000 | até 3.000 | até 4.000 | até 6.000 | acima de 6.000 (24/7 = 8.760) |
|---|---|---|---|---|---|---|
| m/s | 4,6 | 4,4 | 4,0 | 3,7 | 3,0 | 3,0 (última linha) |

As horas por ano são calculadas como h/dia × dias/semana × 365 ÷ 7. Valores entre duas
linhas usam a linha seguinte, que é o lado seguro.

**Diâmetros comerciais:** 3/4" (19), 1" (25), 1.1/4" (32), 1.1/2" (38), 2" (50), 2.1/2" (65),
3" (75), 4" (100), 5" (125) e 6" (150 mm).

A velocidade máxima pode ser editada manualmente. Ao editar, aparece um aviso de que isso
interfere na seleção do tubo.

> Os resultados servem para estimativa. O dimensionamento final deve ser revisado pelo
> projetista (NBR 16401-1:2024, 12.2.11).

## Estrutura

```
index.html                 Página (layout, campos e resultado)
style.css                  Estilo (desktop e celular)
script.js                  Interface: lê os campos e mostra o resultado
engine.js                  Motor de cálculo, sem tela (navegador e Node)
img/logo-hidroflow.svg     Logo e ícone da aba
manual_instalacao_uso.md   Manual do usuário
tests/
  engine.test.js           Testes unitários (node:test)
  gerar_fixture_planilha.py
  fixtures/planilha-engenharia.json
```

## Testes

Basta ter o Node.js 18 ou mais novo; não há dependências para instalar.

```powershell
npm test
```

```powershell
npm run test:estrito
```

- A bateria tem **198 testes**: bitolas, conversões, entradas inválidas, regras físicas,
  Tabela 4, tipos de trecho e o comparativo com a planilha da engenharia.
- Os casos em que o motor novo diverge da planilha antiga (Tabela 13 da NBR 6401/1980)
  aparecem como `todo` e não quebram a execução. No **modo estrito** eles viram falha.

Para regenerar os casos quando a planilha da engenharia mudar:

```powershell
python tests/gerar_fixture_planilha.py "C:\caminho\Tabela seleção tubo hidráulica.xlsx"
```

O gerador reproduz a fórmula do Excel e calcula, de forma independente do `engine.js`, o
resultado esperado do motor.

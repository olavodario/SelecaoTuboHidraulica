# Manual de Instalação e Uso - HidroFlow (Seleção de Tubo Hidráulico)

Este guia orienta como configurar e utilizar a calculadora de dimensionamento hidráulico em seu computador ou celular, rodando diretamente dos arquivos baixados, sem necessidade de internet ou servidor externo.

## Pré-requisitos
O sistema foi otimizado para o navegador **Brave**, mas funciona em qualquer navegador moderno.

*   [Baixar Navegador Brave](https://brave.com/download/)

---

## 💻 Como Usar no Computador (Windows / Mac / Linux)

1.  **Baixar os Arquivos**:
    *   Faça o download da pasta do programa (`SelecaoTuboHidraulica`) para o seu computador.
    *   Se estiver compactada (.zip), **extraia** a pasta para um local de fácil acesso (ex: Área de Trabalho).

2.  **Abrir o Programa**:
    *   Entre na pasta extraída.
    *   Localize o arquivo chamado `index.html`.
    *   Clique com o botão direito sobre ele.
    *   Selecione **Abrir com** > **Brave** (ou seu navegador de preferência).

3.  **Pronto!**: A calculadora abrirá imediatamente e está pronta para uso offline.

---

## 📱 Como Usar no Celular (Android / iOS)

*Nota: A execução de arquivos locais em celulares pode variar dependendo do modelo e sistema operacional.*

### Android
1.  **Transferir/Baixar**:
    *   Envie a pasta do programa para seu celular (via cabo USB, WhatsApp Web, E-mail ou Download direto).
    *   Certifique-se de que a pasta foi extraída se estiver em .zip.
    
2.  **Localizar o Arquivo**:
    *   Abra seu aplicativo de **Gerenciador de Arquivos** (ex: "Meus Arquivos", "Files do Google").
    *   Navegue até a pasta `SelecaoTuboHidraulica`.
    
3.  **Abrir**:
    *   Toque no arquivo `index.html`.
    *   Se o celular perguntar com qual aplicativo abrir, selecione **Brave** (ou Chrome/Outro Navegador).
    
### iOS (iPhone/iPad)
*O iOS tem restrições de segurança maiores para abrir arquivos HTML locais diretamente no navegador.*

1.  **Salvar em Arquivos**:
    *   Salve a pasta do programa no app **Arquivos** (No Meu iPhone/iPad).
2.  **Visualizar**:
    *   Navegue até a pasta e toque no arquivo `index.html`.
    *   O iOS abrirá uma pré-visualização rápida.

---

## ⚙️ Como Utilizar a Calculadora

1.  **Converter a Capacidade (opcional)**:
    *   No conversor, escolha a unidade da capacidade: **TR**, **BTU/h** ou **kW**.
    *   Digite o valor: a conversão é feita na hora, enquanto você digita (no computador também há o botão **Aplicar Vazão**).
    *   O valor é convertido primeiro para TR (1 TR = 12 000 BTU/h = 3,5169 kW) e depois para vazão de água,
        usando 2,4 GPM/TR (≈ 0,5451 m³/h por TR, ΔT ≈ 5,6 °C). O campo de vazão é preenchido automaticamente.

2.  **Inserir Vazão**:
    *   Se já tiver a vazão, digite direto no campo "Vazão de Água" (em m³/h).

3.  **Tipo de Trecho** (ABNT NBR 16401-1:2024, Tabelas 3 e 4):
    *   **Geral** (padrão): a velocidade segue o regime de operação (Tabela 4). Em 24/7 = **3,0 m/s**.
    *   **Recalque** e **Sucção de bombas**: cálculo automático = **o menor valor entre o teto da faixa da Tabela 3
        e o limite de erosão da Tabela 4** para o regime escolhido:

        | Tipo | Faixa Tabela 3 | 24/7 (Tabela 4 = 3,0) | 8 h × 5 dias (Tabela 4 = 4,0) |
        |---|---|---|---|
        | Recalque | 2,4 a 3,6 m/s | **3,0 m/s** (manda a erosão) | **3,6 m/s** (teto da Tabela 3) |
        | Sucção | 1,2 a 2,1 m/s | **2,1 m/s** | **2,1 m/s** |

    *   Os botões mostram o valor calculado para o regime atual, e a linha abaixo explica qual tabela limitou.

4.  **Regime de Operação e Velocidade Máxima**:
    *   Escolha quantas **horas por dia** e quantos **dias por semana** o sistema funciona. O padrão é **24 h × 7 dias** (24/7).
    *   O app calcula as horas por ano (h/dia × dias/sem × 365 ÷ 7) e aplica a **Tabela 4 da ABNT NBR 16401-1:2024**
        (velocidade máxima para minimizar a erosão):

        | Horas por ano | Velocidade máxima |
        |---|---|
        | até 1 500 | 4,6 m/s |
        | até 2 000 | 4,4 m/s |
        | até 3 000 | 4,0 m/s |
        | até 4 000 | 3,7 m/s |
        | até 6 000 | 3,0 m/s |
        | acima de 6 000 (ex.: 24/7 = 8 760 h) | 3,0 m/s (última linha da tabela) |

    *   Horas entre duas linhas usam a linha seguinte (lado seguro). Ex.: 8 h × 5 dias = 2 086 h/ano → linha de 3 000 h → 4,0 m/s.
    *   Acima de 3,5 m/s aparece um aviso: a velocidade passa da faixa econômica "Geral" da Tabela 3 (1,5 a 3,5 m/s).
    *   Para digitar outro valor, clique em **Editar**. Um aviso informa que a mudança interfere diretamente na seleção do tubo.
        Clique em **Usar padrão** para voltar ao valor do tipo de trecho e do regime.

5.  **Verificar Resultado**:
    *   O sistema escolhe o menor diâmetro comercial cuja velocidade calculada (v = Q / A) não ultrapassa a máxima adotada e exibe:
        *   Diâmetro recomendado (mm e polegadas).
        *   Velocidade real da água nesse tubo.
        *   Vazão máxima que esse tubo comporta na velocidade adotada.
    *   No celular, a bitola e a velocidade ficam numa barra fixa no topo da tela, visível enquanto você digita.
    *   ⚠️ Se aparecer uma mensagem de aviso em vermelho, a vazão é maior do que o maior tubo da tabela (6") comporta.

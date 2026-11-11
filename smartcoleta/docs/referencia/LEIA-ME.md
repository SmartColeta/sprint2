# SmartColeta · Dashboard v3 e banco com N:M

## Onde vai cada arquivo
| Arquivo | Substitui |
|---|---|
| `dashboard/dashboard.html` | `public/dashboard/dashboard.html` |
| `css/dashboard.css` | `public/css/dashboard.css` |
| `banco/tabelas_smartcoleta.sql` | script do banco (roda do zero na VM) |
| `banco/usuarios_banco.sql` | usuários do MySQL (rodar depois do script) |
| `der/der_smartcoleta.png` / `.svg` | DER |

## Dashboard: o que mudou
- **Alerta em destaque**: o primeiro card responde "onde mando o caminhão agora?". Mostra quantos pontos coletar, quantos são críticos, e a fila em ordem de urgência com o compartimento que disparou, o nível e a previsão. Clicar abre o ponto.
- **Indicadores sem repetir o alerta**: Próximas 6 h (planejar a próxima rota), Sensores sem leitura (manutenção) e Coletas nas últimas 24 h (quantas foram feitas tarde, já em nível crítico; usa a tabela N:M).
- **Tabela com todos os compartimentos** (1 sensor por compartimento): busca, filtro por bairro, filtro por situação com contagem, ordenação por coluna, barra de nível com os dois limites marcados e a previsão do próximo limite. Rola por dentro do card, então 30 ou 120 compartimentos ocupam o mesmo espaço.
- **Pontos por bairro** no lugar das 30 barras (não cabiam 120). Clicar num bairro filtra a tabela.
- **Visão do ponto**: diagnóstico com a decisão e o motivo, última coleta com o nível de cada compartimento (N:M), histórico de 24 h com **uma linha por compartimento** (o tooltip mostra nível, horário e limites) e as leituras recentes.
- **Saiu**: nível médio (escondia o compartimento cheio), rosca de patamares e o select "Visualizar" (repetiam o alerta e a lista).
- Dados de exemplo com dois cenários no topo: POC (10 pontos, 30 compartimentos) e escala (40 pontos, 120 compartimentos). Tirar o seletor quando ligar ao banco.

## Banco: o que mudou
1. `sensor.fkCompartimento` com **UNIQUE**: 1 sensor por compartimento (1:1).
2. **Nova N:M `coleta_compartimento`** (fkColeta, fkCompartimento, percentualAntes): uma coleta recolhe todos os compartimentos do ponto, e cada compartimento passa por várias coletas. Guarda o nível de cada um na hora da coleta.
3. **Saiu `statuss` de ponto_coleta e compartimento**: como o Arduino só faz INSERT e o site não faz UPDATE, a coluna ficaria desatualizada. A situação é calculada pela última leitura (CASE no SQL e a mesma regra na dash).
4. `leitura` como **entidade fraca**: PK (fkSensor, dataHora), sem idLeitura. O DER agora mostra isso (linha cheia).
5. `parametrizacao` com os nomes do DER (`limiteAtencao`, `limiteCritico`) e CHECK nos limites.
6. Consultas **sem MAX, COUNT, AVG, GROUP BY ou DISTINCT**: só ROUND, CASE e `ORDER BY dataHora DESC LIMIT 1`.
7. `user_data` pode inserir em `coleta` e `coleta_compartimento` (registrar coleta pelo site). Continua sem UPDATE e DELETE.

Testado: o script roda do zero duas vezes seguidas; o UNIQUE barra o 2º sensor; o registro de coleta grava os 3 compartimentos do ponto; com 120 sensores e 343 mil leituras (30 dias), a consulta principal da dash (C1) leva cerca de 15 ms.

## Como ligar a dash ao banco
No script, as consultas **C1 a C4** devolvem exatamente as linhas que a dash usa. Na dash, só mudam duas funções:
- `carregarDados()` → C1 (estado atual) + C2 (coletas de 24 h)
- `carregarPonto(idPonto)` → C3 (histórico do ponto) + C4 (última coleta)
Trocar o corpo delas por `fetch()` nas rotas da API e apagar o bloco "DADOS DE EXEMPLO".

## Para o grupo decidir
- `parametrizacao` não tem `fkPrefeitura`: hoje os limites valem para todas as prefeituras. Se "o cliente define os limites", cada prefeitura precisa dos seus.
- Confirmar com o professor se `- INTERVAL 1 HOUR` (C1) é aceito na regra de funções. Se não for, a API manda a data de referência como parâmetro.
- Senha: o cadastro precisa gravar o hash (bcrypt), não o texto.

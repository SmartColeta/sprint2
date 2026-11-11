-- =====================================================================
-- SmartColeta · script do banco (MySQL 8, na VM Linux)
-- Versão 4.2 · 10/11/2026
--
-- O que mudou em relação à versão 3:
--  1. Tipos de resíduo viram tabela: tipo_residuo (nome, prioridade).
--     compartimento aponta para ela por fkTipoResiduo. Tipos: Orgânico (P1),
--     Sem distinção (P2) e Reciclável (P3). "Rejeito" deixa de existir.
--  2. O cálculo fica no banco: as VIEWS DA DASHBOARD entregam nível, situação
--     (com "Sem leitura"), peso da situação, velocidade de enchimento,
--     previsão e os totais. A dash só exibe, filtra e ordena.
--  3. Escopo de SQL liberado: ROUND, CASE, AVG, COUNT, SUM, MAX, MIN,
--     GROUP BY, DISTINCT, VIEW e funções de data (NOW, CURDATE, DATE, HOUR,
--     DATE_FORMAT, TIMESTAMPDIFF, INTERVAL).
--  4. Histórico com período (C3a a C3d): o SQL já devolve o MAIOR nível de
--     cada hora, bloco de 6 h ou dia, para não esconder os picos.
--  5. Leituras de um dia (C6), com filtro por intervalo de data (usa o índice).
--  6. As leituras de exemplo usam NOW() - INTERVAL: a dash mostra dados
--     atuais logo depois de rodar o script.
--
-- Continua igual: sensor 1:1 com compartimento (UNIQUE), coleta N:M com
-- compartimento, leitura como entidade fraca (PK fkSensor + dataHora),
-- Arduino só faz INSERT em leitura e o site não faz UPDATE nem DELETE.
--
-- DESEMPENHO: a última leitura de um sensor sai de
--   (SELECT ... WHERE fkSensor = s.idSensor ORDER BY fkSensor DESC, dataHora DESC LIMIT 1)
-- que lê só 1 linha do índice da PK (fkSensor, dataHora), de trás para frente.
-- O fkSensor no ORDER BY não muda o resultado (é um só dentro da subconsulta),
-- mas sem ele o MySQL ordena TODAS as leituras do sensor numa subconsulta
-- correlacionada ("Using filesort"): com 120 sensores e 345 mil leituras, a
-- C1 caiu de ~510 ms para ~20 ms (com a view em camadas, abaixo) (EXPLAIN mostra
-- "Backward index scan"). Filtros por data usam intervalo
-- (dataHora >= ? AND dataHora < ? + INTERVAL 1 DAY), nunca DATE(dataHora) = ?.
-- =====================================================================

-- ATENÇÃO: a linha abaixo apaga o banco inteiro, com todos os dados,
-- para o script poder ser executado de novo do zero. Use só em
-- desenvolvimento e na demonstração.
DROP DATABASE IF EXISTS smartcoleta;
CREATE DATABASE smartcoleta;
USE smartcoleta;

-- ===================== TABELAS =====================

-- 1. Prefeitura (1 código de acesso por prefeitura)
CREATE TABLE prefeitura (
    idPrefeitura INT PRIMARY KEY AUTO_INCREMENT,
    razaoSocial VARCHAR(50) NOT NULL,
    cnpj CHAR(14) NOT NULL UNIQUE,
    cidade VARCHAR(100),
    uf CHAR(2),
    qtdHabitantes INT,
    codigoAcesso VARCHAR(20) NOT NULL UNIQUE
);

-- 2. Usuário (N usuários para 1 prefeitura)
--    A senha deve chegar aqui já com hash (bcrypt na API), nunca em texto puro.
CREATE TABLE usuario (
    idUsuario INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(50),
    email VARCHAR(50) NOT NULL UNIQUE,
    senha VARCHAR(255),
    fkPrefeitura INT NOT NULL,
    CONSTRAINT fkUsuarioPrefeitura FOREIGN KEY (fkPrefeitura)
        REFERENCES prefeitura(idPrefeitura)
);

-- 3. Ponto de coleta (a cidade vem da prefeitura)
CREATE TABLE ponto_coleta (
    idPonto INT PRIMARY KEY AUTO_INCREMENT,
    rua VARCHAR(100),
    bairro VARCHAR(100),
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    fkPrefeitura INT NOT NULL,
    CONSTRAINT fkPontoPrefeitura FOREIGN KEY (fkPrefeitura)
        REFERENCES prefeitura(idPrefeitura)
);

-- 4. Tipo de resíduo (NOVA)
--    prioridade: 1 = coletar primeiro. Só desempata dentro da mesma
--    situação: um reciclável crítico continua na frente de um orgânico em atenção.
CREATE TABLE tipo_residuo (
    idTipoResiduo INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(30) NOT NULL UNIQUE,
    prioridade TINYINT NOT NULL UNIQUE,
    CONSTRAINT chkPrioridade CHECK (prioridade BETWEEN 1 AND 9)
);

-- 5. Parametrização (limites em % de enchimento, definidos com o cliente)
--    Atenção a partir de limiteAtencao; Crítico a partir de limiteCritico.
CREATE TABLE parametrizacao (
    idParametrizacao INT PRIMARY KEY AUTO_INCREMENT,
    limiteAtencao DECIMAL(5,2) NOT NULL,
    limiteCritico DECIMAL(5,2) NOT NULL,
    CONSTRAINT chkLimites CHECK (limiteAtencao > 0 AND limiteAtencao < limiteCritico AND limiteCritico <= 100)
);

-- 6. Compartimento (cada ponto tem um ou mais compartimentos)
CREATE TABLE compartimento (
    idCompartimento INT PRIMARY KEY AUTO_INCREMENT,
    alturaCm DECIMAL(6,2) NOT NULL,
    fkPontoColeta INT NOT NULL,
    fkTipoResiduo INT NOT NULL,
    fkParametrizacao INT NOT NULL,
    CONSTRAINT chkAltura CHECK (alturaCm > 0),
    CONSTRAINT fkCompartimentoPonto FOREIGN KEY (fkPontoColeta)
        REFERENCES ponto_coleta(idPonto),
    CONSTRAINT fkCompartimentoTipo FOREIGN KEY (fkTipoResiduo)
        REFERENCES tipo_residuo(idTipoResiduo),
    CONSTRAINT fkCompartimentoParam FOREIGN KEY (fkParametrizacao)
        REFERENCES parametrizacao(idParametrizacao)
);

-- 7. Sensor (1:1 com compartimento: o UNIQUE impede um segundo sensor
--    no mesmo compartimento)
--    statuss: 1 = ativo, 0 = desativado (manutenção). "Sem leitura" não é
--    coluna: a view calcula pela hora da última leitura.
CREATE TABLE sensor (
    idSensor INT PRIMARY KEY AUTO_INCREMENT,
    numeroSensor INT,
    modelo VARCHAR(50),
    statuss TINYINT NOT NULL DEFAULT 1,
    fkCompartimento INT NOT NULL UNIQUE,
    CONSTRAINT chkSensorStatus CHECK (statuss IN (0, 1)),
    CONSTRAINT fkSensorCompartimento FOREIGN KEY (fkCompartimento)
        REFERENCES compartimento(idCompartimento)
);

-- 8. Leitura (entidade fraca: só existe com o sensor; PK = sensor + data/hora)
--    A PK (fkSensor, dataHora) é o índice que deixa rápidas a última leitura
--    de cada sensor e os filtros por período.
CREATE TABLE leitura (
    fkSensor INT NOT NULL,
    dataHora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    distanciaCm DECIMAL(6,2) NOT NULL,
    PRIMARY KEY (fkSensor, dataHora),
    CONSTRAINT fkLeituraSensor FOREIGN KEY (fkSensor)
        REFERENCES sensor(idSensor)
);

-- 9. Coleta (o caminhão é acionado para o PONTO quando um compartimento
--    entra em Atenção, e recolhe todos os compartimentos do ponto)
--    O índice (fkPontoColeta, dataHoraColeta) deixa rápida a última coleta do ponto.
CREATE TABLE coleta (
    idColeta INT PRIMARY KEY AUTO_INCREMENT,
    dataHoraColeta DATETIME NOT NULL,
    fkPontoColeta INT NOT NULL,
    INDEX idxColetaPontoData (fkPontoColeta, dataHoraColeta),
    CONSTRAINT fkColetaPonto FOREIGN KEY (fkPontoColeta)
        REFERENCES ponto_coleta(idPonto)
);

-- 10. Coleta x Compartimento (N:M)
--     Uma coleta recolhe N compartimentos; um compartimento tem N coletas.
--     percentualAntes = nível do compartimento na hora da coleta (vem da
--     última leitura do sensor).
CREATE TABLE coleta_compartimento (
    fkColeta INT NOT NULL,
    fkCompartimento INT NOT NULL,
    percentualAntes DECIMAL(5,2),
    PRIMARY KEY (fkColeta, fkCompartimento),
    CONSTRAINT fkItemColeta FOREIGN KEY (fkColeta)
        REFERENCES coleta(idColeta),
    CONSTRAINT fkItemCompartimento FOREIGN KEY (fkCompartimento)
        REFERENCES compartimento(idCompartimento)
);


-- ===================== VIEWS DA DASHBOARD =====================
-- Todas as regras de negócio da dash moram aqui. A API só faz
-- SELECT * FROM view WHERE idPrefeitura = ? (consultas C1, C7, C8 e C9).
--
-- pesoSituacao (regra de urgência, do mais urgente para o menos):
--   5 = cheio (crítico com nível >= 100%: o lixo já transborda)
--   4 = crítico   3 = atenção   2 = sem leitura   1 = normal
-- Empate no peso: prioridade do tipo (1 primeiro), depois menos horas até o
-- próximo limite, depois o nível mais alto.

-- V1. ESTADO DE CADA COMPARTIMENTO (uma linha por compartimento)
--     Montada em camadas, de dentro para fora:
--       u: cadastro do compartimento + hora da ÚLTIMA leitura do sensor
--       r: + hora da leitura de referência para a velocidade (a mais recente
--          com pelo menos 1 h de diferença; com 15 min, o ruído atrapalha)
--       b: + distâncias dessas duas leituras (busca direta pela PK) e o nível
--          entre 0 e 100 (o sensor pode medir um pouco além por ruído)
--       e: + situação e velocidade de enchimento (% por hora)
--       final: peso da situação, próximo limite e horas até ele
--     Cada subconsulta "LIMIT 1" roda uma vez por sensor, e as leituras são
--     buscadas depois pela PK: assim a C1 fica em ~20 ms com 345 mil leituras.
--     "Sem leitura": nunca leu, sensor desativado ou última leitura há mais
--     de 30 min (o sensor manda a cada 15 min: 2 leituras perdidas).
CREATE VIEW vw_estado_compartimento AS
SELECT e.*,
       CASE WHEN e.situacao = 'Sem leitura' THEN 2
            WHEN e.nivelPct >= 100 THEN 5
            WHEN e.situacao = 'Critico' THEN 4
            WHEN e.situacao = 'Atencao' THEN 3
            ELSE 1 END AS pesoSituacao,
       CASE WHEN e.situacao = 'Sem leitura' THEN NULL
            WHEN e.situacao = 'Critico' THEN 'cheio'
            WHEN e.situacao = 'Atencao' THEN 'crítico'
            ELSE 'atenção' END AS proximoLimite,
       CASE WHEN e.situacao = 'Sem leitura' THEN NULL
            WHEN e.nivelPct >= 100 THEN 0
            WHEN e.taxaPorHora IS NULL OR e.taxaPorHora <= 0.05 THEN NULL   -- parado ou esvaziando
            ELSE ROUND(((CASE WHEN e.situacao = 'Critico' THEN 100
                              WHEN e.situacao = 'Atencao' THEN e.limiteCritico
                              ELSE e.limiteAtencao END) - e.nivelPct) / e.taxaPorHora, 1)
            END AS horasProximoLimite
FROM (
    SELECT b.*,
           CASE WHEN b.dataHora IS NULL OR b.sensorAtivo = 0 OR b.minutosDesdeLeitura > 30 THEN 'Sem leitura'
                WHEN b.nivelPct >= b.limiteCritico THEN 'Critico'
                WHEN b.nivelPct >= b.limiteAtencao THEN 'Atencao'
                ELSE 'Normal' END AS situacao,
           CASE WHEN b.nivelAnteriorPct IS NULL OR b.minutosEntreLeituras <= 0 THEN NULL
                ELSE ROUND((b.nivelPct - b.nivelAnteriorPct) / (b.minutosEntreLeituras / 60), 2)
                END AS taxaPorHora
    FROM (
        SELECT r.*, l.distanciaCm,
               CASE WHEN l.dataHora IS NULL THEN NULL
                    WHEN l.distanciaCm >= r.alturaCm THEN 0
                    WHEN l.distanciaCm <= 0 THEN 100
                    ELSE ROUND((1 - l.distanciaCm / r.alturaCm) * 100, 2) END AS nivelPct,
               TIMESTAMPDIFF(MINUTE, r.dataHora, NOW()) AS minutosDesdeLeitura,
               CASE WHEN ant.dataHora IS NULL THEN NULL
                    WHEN ant.distanciaCm >= r.alturaCm THEN 0
                    WHEN ant.distanciaCm <= 0 THEN 100
                    ELSE ROUND((1 - ant.distanciaCm / r.alturaCm) * 100, 2) END AS nivelAnteriorPct,
               TIMESTAMPDIFF(MINUTE, r.dataHoraAnterior, r.dataHora) AS minutosEntreLeituras
        FROM (
            SELECT u.*,
                   (SELECT l3.dataHora FROM leitura l3
                    WHERE l3.fkSensor = u.idSensor AND l3.dataHora <= u.dataHora - INTERVAL 1 HOUR
                    ORDER BY l3.fkSensor DESC, l3.dataHora DESC LIMIT 1) AS dataHoraAnterior
            FROM (
                SELECT p.fkPrefeitura AS idPrefeitura, p.idPonto, p.rua, p.bairro,
                       c.idCompartimento, t.nome AS tipoResiduo, t.prioridade, c.alturaCm,
                       s.idSensor, s.numeroSensor, s.statuss AS sensorAtivo,
                       pa.limiteAtencao, pa.limiteCritico,
                       (SELECT l2.dataHora FROM leitura l2
                        WHERE l2.fkSensor = s.idSensor
                        ORDER BY l2.fkSensor DESC, l2.dataHora DESC LIMIT 1) AS dataHora
                FROM ponto_coleta p
                JOIN compartimento c   ON c.fkPontoColeta = p.idPonto
                JOIN tipo_residuo t    ON t.idTipoResiduo = c.fkTipoResiduo
                JOIN parametrizacao pa ON pa.idParametrizacao = c.fkParametrizacao
                JOIN sensor s          ON s.fkCompartimento = c.idCompartimento
            ) u
        ) r
        LEFT JOIN leitura l   ON l.fkSensor = r.idSensor AND l.dataHora = r.dataHora
        LEFT JOIN leitura ant ON ant.fkSensor = r.idSensor AND ant.dataHora = r.dataHoraAnterior
    ) b
) e;

-- V2. SITUAÇÃO DE CADA PONTO
--     A pior situação entre os compartimentos COM leitura (um sensor parado
--     não esconde um compartimento crítico do mesmo ponto). O ponto só fica
--     "Sem leitura" se nenhum sensor dele estiver lendo.
CREATE VIEW vw_ponto_situacao AS
SELECT x.idPrefeitura, x.idPonto, x.rua, x.bairro,
       x.qtdCompartimentos, x.qtdSemLeitura,
       CASE WHEN x.pesoComLeitura IS NULL THEN 2 ELSE x.pesoComLeitura END AS pesoPonto,
       CASE WHEN x.pesoComLeitura IS NULL THEN 'Sem leitura'
            WHEN x.pesoComLeitura >= 4 THEN 'Critico'
            WHEN x.pesoComLeitura = 3 THEN 'Atencao'
            ELSE 'Normal' END AS situacaoPonto
FROM (
    SELECT idPrefeitura, idPonto, rua, bairro,
           COUNT(*) AS qtdCompartimentos,
           SUM(CASE WHEN situacao = 'Sem leitura' THEN 1 ELSE 0 END) AS qtdSemLeitura,
           MAX(CASE WHEN situacao <> 'Sem leitura' THEN pesoSituacao END) AS pesoComLeitura
    FROM vw_estado_compartimento
    GROUP BY idPrefeitura, idPonto, rua, bairro
) x;

-- V3. PONTOS POR BAIRRO E SITUAÇÃO (gráfico "Pontos por bairro")
--     Ponto sem leitura conta como normal aqui; aparece no indicador de sensores.
CREATE VIEW vw_resumo_bairro AS
SELECT idPrefeitura, bairro,
       COUNT(*) AS totalPontos,
       SUM(CASE WHEN situacaoPonto = 'Critico' THEN 1 ELSE 0 END) AS pontosCriticos,
       SUM(CASE WHEN situacaoPonto = 'Atencao' THEN 1 ELSE 0 END) AS pontosAtencao,
       SUM(CASE WHEN situacaoPonto IN ('Normal', 'Sem leitura') THEN 1 ELSE 0 END) AS pontosNormais
FROM vw_ponto_situacao
GROUP BY idPrefeitura, bairro;

-- V4. RESUMO DA PREFEITURA (indicadores e topo da dash)
--     Os totais de compartimentos têm que bater com as listas da C1:
--       compartimentosCriticos   = situacao 'Critico'
--       compartimentosAtencao    = situacao 'Atencao'
--       compartimentosProximas6h = situacao 'Normal' e horasProximoLimite <= 6
--       sensoresSemLeitura       = situacao 'Sem leitura'
--     Os totais de pontos (card de alerta) vêm da vw_ponto_situacao.
CREATE VIEW vw_resumo_prefeitura AS
SELECT comp.*, pt.totalPontos, pt.pontosCriticos, pt.pontosAtencao, pt.pontosParaColetar
FROM (
    SELECT idPrefeitura,
           COUNT(*) AS totalCompartimentos,
           SUM(CASE WHEN situacao = 'Critico' THEN 1 ELSE 0 END) AS compartimentosCriticos,
           SUM(CASE WHEN situacao = 'Atencao' THEN 1 ELSE 0 END) AS compartimentosAtencao,
           SUM(CASE WHEN situacao = 'Normal' THEN 1 ELSE 0 END) AS compartimentosNormais,
           SUM(CASE WHEN situacao = 'Normal' AND horasProximoLimite <= 6 THEN 1 ELSE 0 END) AS compartimentosProximas6h,
           SUM(CASE WHEN situacao = 'Sem leitura' THEN 1 ELSE 0 END) AS sensoresSemLeitura,
           ROUND(SUM(CASE WHEN situacao = 'Sem leitura' THEN 0 ELSE 1 END) / COUNT(*) * 100, 1) AS pctComLeitura,
           MAX(dataHora) AS ultimaLeitura,
           TIMESTAMPDIFF(MINUTE, MAX(dataHora), NOW()) AS minutosDesdeUltimaLeitura
    FROM vw_estado_compartimento
    GROUP BY idPrefeitura
) comp
JOIN (
    SELECT idPrefeitura,
           COUNT(*) AS totalPontos,
           SUM(CASE WHEN situacaoPonto = 'Critico' THEN 1 ELSE 0 END) AS pontosCriticos,
           SUM(CASE WHEN situacaoPonto = 'Atencao' THEN 1 ELSE 0 END) AS pontosAtencao,
           SUM(CASE WHEN situacaoPonto IN ('Critico', 'Atencao') THEN 1 ELSE 0 END) AS pontosParaColetar
    FROM vw_ponto_situacao
    GROUP BY idPrefeitura
) pt ON pt.idPrefeitura = comp.idPrefeitura;

-- V5. ÚLTIMA COLETA DE CADA PONTO, com o nível de cada compartimento (N:M)
CREATE VIEW vw_ultima_coleta_ponto AS
SELECT co.fkPontoColeta AS idPonto, co.idColeta, co.dataHoraColeta,
       TIMESTAMPDIFF(MINUTE, co.dataHoraColeta, NOW()) AS minutosDesdeColeta,
       c.idCompartimento, t.nome AS tipoResiduo, t.prioridade,
       cc.percentualAntes, pa.limiteAtencao, pa.limiteCritico,
       CASE WHEN cc.percentualAntes >= pa.limiteCritico THEN 'Critico'
            WHEN cc.percentualAntes >= pa.limiteAtencao THEN 'Atencao'
            ELSE 'Normal' END AS situacaoNaColeta
FROM coleta co
JOIN coleta_compartimento cc ON cc.fkColeta = co.idColeta
JOIN compartimento c         ON c.idCompartimento = cc.fkCompartimento
JOIN tipo_residuo t          ON t.idTipoResiduo = c.fkTipoResiduo
JOIN parametrizacao pa       ON pa.idParametrizacao = c.fkParametrizacao
WHERE co.idColeta = (SELECT co2.idColeta FROM coleta co2
                     WHERE co2.fkPontoColeta = co.fkPontoColeta
                     ORDER BY co2.fkPontoColeta DESC, co2.dataHoraColeta DESC LIMIT 1);


-- ===================== INSERTS =====================
-- Os pontos 1 a 10 (Campo Novo de Rondônia) são os mesmos da dash de
-- exemplo. O sensor 1 é o HC-SR04 real ligado ao Arduino; os sensores 2 a 30
-- são simulados pela API dat-acqu-ino.

INSERT INTO prefeitura (razaoSocial, cnpj, cidade, uf, qtdHabitantes, codigoAcesso) VALUES
('MUNICIPIO DE CAMPO NOVO DE RONDONIA', '63762033000199', 'Campo Novo de Rondônia', 'RO', 9225, 'SMCL0001'),
('MUNICIPIO DE CEREJEIRAS', '04914925000107', 'Cerejeiras', 'RO', 16975, 'SMCL0002'),
('MUNICIPIO DE BANDEIRANTES', '03501491000142', 'Bandeirantes', 'MS', 8276, 'SMCL0003');

INSERT INTO ponto_coleta (rua, bairro, latitude, longitude, fkPrefeitura) VALUES
('Av. Tancredo Neves, 120', 'Centro',              -10.5969000, -63.6122000, 1),
('Rua Santa Cruz, 45',      'Planalto',            -10.5990000, -63.6150000, 1),
('Av. Airton Senna, 300',   'Jardim Monte Alegre', -10.6010000, -63.6180000, 1),
('Rua Rio de Janeiro, 88',  'Jardim Alvorada',     -10.5940000, -63.6090000, 1),
('Av. Brasil, 1200',        'Centro',              -10.5975000, -63.6131000, 1),
('Rua São Paulo, 210',      'Centro',              -10.5981000, -63.6117000, 1),
('Rua Mato Grosso, 220',    'Planalto',            -10.6002000, -63.6163000, 1),
('Av. Rondônia, 890',       'Setor Industrial',    -10.6050000, -63.6210000, 1),
('Rua Amazonas, 75',        'Jardim Alvorada',     -10.5932000, -63.6084000, 1),
('Rua Goiás, 510',          'Bela Vista',          -10.5918000, -63.6142000, 1),
('Rua das Flores, 45',      'Centro',              -13.1889000, -60.8122000, 2),
('Rua Sete de Setembro, 80','Centro',              -19.9178000, -54.3639000, 3);

-- prioridade de coleta de cada tipo (1 = coletar primeiro)
INSERT INTO tipo_residuo (nome, prioridade) VALUES
('Orgânico', 1),        -- 1: enche mais rápido e tem odor
('Sem distinção', 2),   -- 2: lixo misturado
('Reciclável', 3);      -- 3: pode esperar mais

-- limites padrão por tipo (definidos com o cliente na reunião de implantação)
-- mesma ordem dos tipos: 1 orgânico, 2 sem distinção, 3 reciclável
INSERT INTO parametrizacao (limiteAtencao, limiteCritico) VALUES
(65.00, 85.00),
(70.00, 90.00),
(75.00, 95.00);

-- 3 compartimentos por ponto: idCompartimento 3*(ponto-1)+1, +2, +3
-- (fkTipoResiduo e fkParametrizacao: 1 orgânico, 3 reciclável, 2 sem distinção)
INSERT INTO compartimento (alturaCm, fkPontoColeta, fkTipoResiduo, fkParametrizacao) VALUES
(100.00, 1, 1, 1),  (100.00, 1, 3, 3),  (100.00, 1, 2, 2),
(100.00, 2, 1, 1),  (100.00, 2, 3, 3),  (100.00, 2, 2, 2),
(100.00, 3, 1, 1),  (100.00, 3, 3, 3),  (100.00, 3, 2, 2),
(100.00, 4, 1, 1),  (100.00, 4, 3, 3),  (100.00, 4, 2, 2),
(100.00, 5, 1, 1),  (100.00, 5, 3, 3),  (100.00, 5, 2, 2),
(100.00, 6, 1, 1),  (100.00, 6, 3, 3),  (100.00, 6, 2, 2),
(100.00, 7, 1, 1),  (100.00, 7, 3, 3),  (100.00, 7, 2, 2),
(100.00, 8, 1, 1),  (100.00, 8, 3, 3),  (100.00, 8, 2, 2),
(100.00, 9, 1, 1),  (100.00, 9, 3, 3),  (100.00, 9, 2, 2),
(100.00, 10, 1, 1), (100.00, 10, 3, 3), (100.00, 10, 2, 2),
(100.00, 11, 1, 1), (100.00, 11, 3, 3), (100.00, 11, 2, 2),
(100.00, 12, 1, 1), (100.00, 12, 3, 3), (100.00, 12, 2, 2);

-- um sensor por compartimento: idSensor N fica no compartimento N
INSERT INTO sensor (numeroSensor, modelo, statuss, fkCompartimento) VALUES
(101,'HC-SR04',1,1),  (102,'HC-SR04',1,2),  (103,'HC-SR04',1,3),  (104,'HC-SR04',1,4),
(105,'HC-SR04',1,5),  (106,'HC-SR04',1,6),  (107,'HC-SR04',1,7),  (108,'HC-SR04',1,8),
(109,'HC-SR04',1,9),  (110,'HC-SR04',1,10), (111,'HC-SR04',1,11), (112,'HC-SR04',1,12),
(113,'HC-SR04',1,13), (114,'HC-SR04',1,14), (115,'HC-SR04',1,15), (116,'HC-SR04',1,16),
(117,'HC-SR04',1,17), (118,'HC-SR04',1,18), (119,'HC-SR04',1,19), (120,'HC-SR04',1,20),
(121,'HC-SR04',1,21), (122,'HC-SR04',1,22), (123,'HC-SR04',1,23), (124,'HC-SR04',1,24),
(125,'HC-SR04',1,25), (126,'HC-SR04',1,26), (127,'HC-SR04',1,27), (128,'HC-SR04',1,28),
(129,'HC-SR04',1,29), (130,'HC-SR04',1,30), (131,'HC-SR04',1,31), (132,'HC-SR04',1,32),
(133,'HC-SR04',1,33), (134,'HC-SR04',1,34), (135,'HC-SR04',1,35), (136,'HC-SR04',1,36);

-- ---------- LEITURAS E COLETAS DE EXEMPLO (relativas a NOW()) ----------
-- Cada compartimento enche em linha reta desde a última coleta do ponto.
-- As tabelas temporárias abaixo só existem enquanto o script roda.
--   horasColeta     = há quantas horas o ponto foi coletado
--   distanciaAgora  = distância da última leitura do sensor (cm)
--   percentualAntes = nível do compartimento na hora da coleta
--   minutoLeitura   = minutos desde a última leitura (cada sensor num minuto)
--   parouHaHoras    = sensor parado (o 27 parou há 6 h: "sem leitura")
CREATE TEMPORARY TABLE perfil_exemplo (
    idSensor INT PRIMARY KEY,
    horasColeta DECIMAL(5,2),
    distanciaAgora DECIMAL(6,2),
    percentualAntes DECIMAL(5,2),
    minutoLeitura INT,
    parouHaHoras INT
);

-- ordem dos 3 sensores de cada ponto: orgânico, reciclável, sem distinção
INSERT INTO perfil_exemplo VALUES
(1, 24, 6, 83, 2, 0),    (2, 24, 40, 71, 3, 0),   (3, 24, 52, 64, 4, 0),
(4, 22, 30, 79, 4, 0),   (5, 22, 4, 88, 5, 0),    (6, 22, 45, 72, 6, 0),
(7, 23, 19, 87, 6, 0),   (8, 23, 60, 77, 7, 0),   (9, 23, 38, 74, 8, 0),
(10, 30, 70, 68, 8, 0),  (11, 30, 48, 79, 9, 0),  (12, 30, 24, 92, 10, 0),
(13, 22, 55, 81, 10, 0), (14, 22, 21, 90, 11, 0), (15, 22, 67, 71, 12, 0),
(16, 18, 62, 74, 2, 0),  (17, 18, 78, 80, 3, 0),  (18, 18, 49, 85, 4, 0),
(19, 18, 45, 70, 4, 0),  (20, 18, 53, 76, 5, 0),  (21, 18, 71, 73, 6, 0),
(22, 26, 82, 66, 6, 0),  (23, 26, 36, 96, 7, 0),  (24, 26, 59, 78, 8, 0),
(25, 18, 50, 78, 8, 0),  (26, 18, 65, 82, 9, 0),  (27, 18, 67, 75, 10, 6),
(28, 10, 88, 72, 10, 0), (29, 10, 74, 84, 11, 0), (30, 10, 80, 70, 12, 0),
(31, 12, 50, 75, 3, 0),  (32, 12, 60, 80, 4, 0),  (33, 12, 55, 70, 5, 0),
(34, 12, 45, 78, 3, 0),  (35, 12, 70, 82, 4, 0),  (36, 12, 65, 74, 5, 0);

-- velocidade de enchimento (% por hora) de cada sensor: do resto da coleta (4%)
-- até o nível da última leitura, no tempo em que o sensor esteve lendo
CREATE TEMPORARY TABLE taxa_exemplo AS
SELECT idSensor,
       CASE WHEN (96 - distanciaAgora) / (horasColeta - parouHaHoras) < 0.5 THEN 0.5
            ELSE (96 - distanciaAgora) / (horasColeta - parouHaHoras) END AS taxa
FROM perfil_exemplo;

-- números de 0 a 191 (48 h de leituras, uma a cada 15 min)
-- digito é uma tabela comum (o MySQL não deixa usar a mesma tabela temporária
-- três vezes na mesma consulta); ela é apagada logo abaixo
CREATE TABLE digito (d INT);
INSERT INTO digito VALUES (0),(1),(2),(3),(4),(5),(6),(7),(8),(9);
CREATE TEMPORARY TABLE numero (n INT PRIMARY KEY);
INSERT INTO numero
SELECT a.d * 100 + b.d * 10 + c.d FROM digito a, digito b, digito c
WHERE a.d * 100 + b.d * 10 + c.d < 192;

-- leituras das últimas 48 h: a cada 15 min, para trás a partir da última.
-- h = horas atrás. Depois da coleta (h <= horasColeta): sobe a partir de 4%.
-- Antes da coleta: desce para trás a partir do percentualAntes.
INSERT INTO leitura (fkSensor, dataHora, distanciaCm)
SELECT x.idSensor,
       NOW() - INTERVAL x.minutosAtras MINUTE,
       ROUND(100 - (CASE
            WHEN x.horas <= x.horasColeta THEN
                 CASE WHEN 4 + x.taxa * (x.horasColeta - x.horas) > 100 THEN 100
                      ELSE 4 + x.taxa * (x.horasColeta - x.horas) END
            WHEN x.percentualAntes - x.taxa * (x.horas - x.horasColeta) < 1 THEN 1
            ELSE x.percentualAntes - x.taxa * (x.horas - x.horasColeta) END), 2)
FROM (
    SELECT pe.idSensor, pe.horasColeta, pe.percentualAntes, tx.taxa,
           pe.minutoLeitura + pe.parouHaHoras * 60 + nu.n * 15 AS minutosAtras,
           (pe.minutoLeitura + pe.parouHaHoras * 60 + nu.n * 15) / 60 AS horas
    FROM perfil_exemplo pe
    JOIN taxa_exemplo tx ON tx.idSensor = pe.idSensor
    JOIN numero nu
) x;

-- última coleta de cada ponto (a coleta é do PONTO): horasColeta atrás
INSERT INTO coleta (dataHoraColeta, fkPontoColeta)
SELECT DISTINCT NOW() - INTERVAL ROUND(pe.horasColeta * 60) MINUTE, c.fkPontoColeta
FROM perfil_exemplo pe
JOIN sensor s        ON s.idSensor = pe.idSensor
JOIN compartimento c ON c.idCompartimento = s.fkCompartimento;

-- N:M: os 3 compartimentos recolhidos em cada coleta, com o nível de cada um
INSERT INTO coleta_compartimento (fkColeta, fkCompartimento, percentualAntes)
SELECT co.idColeta, c.idCompartimento, pe.percentualAntes
FROM perfil_exemplo pe
JOIN sensor s        ON s.idSensor = pe.idSensor
JOIN compartimento c ON c.idCompartimento = s.fkCompartimento
JOIN coleta co       ON co.fkPontoColeta = c.fkPontoColeta;

DROP TEMPORARY TABLE perfil_exemplo, taxa_exemplo, numero;
DROP TABLE digito;

-- CADASTRO VIA CÓDIGO DE ACESSO (o mesmo código serve para vários usuários da prefeitura)
-- Se o código não existir, o SELECT não retorna nada e nenhum usuário é inserido.
-- Senhas de exemplo; no site, a API grava o hash (bcrypt), não o texto.
INSERT INTO usuario (nome, email, senha, fkPrefeitura)
SELECT 'Gestor Operacional', 'operador@smartcoleta.com', 'senha123', idPrefeitura
FROM prefeitura WHERE codigoAcesso = 'SMCL0001';

INSERT INTO usuario (nome, email, senha, fkPrefeitura)
SELECT 'Fiscal de Coleta', 'fiscal@smartcoleta.com', 'senha123', idPrefeitura
FROM prefeitura WHERE codigoAcesso = 'SMCL0001';


-- ===================== CONSULTAS DA DASHBOARD =====================
-- Na API, cada valor marcado com "-- ?" vira um parâmetro do execute()
-- (nunca concatene o que vem da tela no SQL). Aqui no script os "?" estão
-- com valores de exemplo para a consulta rodar.

-- C1. ESTADO ATUAL: uma linha por compartimento, já na ordem de urgência
--     (alerta, listas dos indicadores, tabela e diagnóstico do ponto).
--     "horasProximoLimite IS NULL" põe quem não tem previsão no fim do empate.
SELECT * FROM vw_estado_compartimento
WHERE idPrefeitura = 1                                     -- ? = prefeitura do usuário
ORDER BY pesoSituacao DESC, prioridade, horasProximoLimite IS NULL, horasProximoLimite, nivelPct DESC;

-- C2. COLETAS DAS ÚLTIMAS 24 H (relatório; saiu da dash)
--     Uma linha por compartimento recolhido (tabela N:M).
SELECT co.idColeta, co.dataHoraColeta, co.fkPontoColeta, p.rua,
       cc.fkCompartimento, t.nome AS tipoResiduo, cc.percentualAntes, pa.limiteCritico,
       CASE WHEN cc.percentualAntes >= pa.limiteCritico THEN 'Coletado já crítico'
            ELSE 'No prazo' END AS avaliacao
FROM coleta co
JOIN ponto_coleta p          ON p.idPonto = co.fkPontoColeta
JOIN coleta_compartimento cc ON cc.fkColeta = co.idColeta
JOIN compartimento c         ON c.idCompartimento = cc.fkCompartimento
JOIN tipo_residuo t          ON t.idTipoResiduo = c.fkTipoResiduo
JOIN parametrizacao pa       ON pa.idParametrizacao = c.fkParametrizacao
WHERE p.fkPrefeitura = 1                                   -- ? = prefeitura do usuário
  AND co.dataHoraColeta >= NOW() - INTERVAL 24 HOUR
ORDER BY co.dataHoraColeta DESC, cc.fkCompartimento;

-- C3. HISTÓRICO DE UM PONTO POR PERÍODO (gráfico "Histórico por compartimento")
--     A API escolhe UMA das quatro consultas pelo período ('24h', '7d', '30d'
--     ou '90d'); qualquer outro valor é recusado antes de chegar ao banco.
--     De 7 dias em diante, cada linha é o MAIOR nível do intervalo (MAX), para
--     não esconder os picos que motivam a coleta.

-- C3a. 24 h: leitura bruta (uma a cada 15 min, ~96 por compartimento)
SELECT c.idCompartimento, t.nome AS tipoResiduo, t.prioridade, s.numeroSensor,
       pa.limiteAtencao, pa.limiteCritico,
       l.dataHora AS inicioIntervalo, l.distanciaCm,
       CASE WHEN l.distanciaCm >= c.alturaCm THEN 0
            WHEN l.distanciaCm <= 0 THEN 100
            ELSE ROUND((1 - l.distanciaCm / c.alturaCm) * 100, 2) END AS nivelPct
FROM compartimento c
JOIN tipo_residuo t    ON t.idTipoResiduo = c.fkTipoResiduo
JOIN parametrizacao pa ON pa.idParametrizacao = c.fkParametrizacao
JOIN sensor s          ON s.fkCompartimento = c.idCompartimento
JOIN leitura l         ON l.fkSensor = s.idSensor
WHERE c.fkPontoColeta = 1                                  -- ? = ponto aberto
  AND l.dataHora >= NOW() - INTERVAL 24 HOUR
ORDER BY c.idCompartimento, l.dataHora;

-- C3b. 7 dias: maior nível de cada hora (168 por compartimento)
SELECT c.idCompartimento, t.nome AS tipoResiduo, t.prioridade, s.numeroSensor,
       pa.limiteAtencao, pa.limiteCritico,
       DATE_FORMAT(l.dataHora, '%Y-%m-%d %H:00:00') AS inicioIntervalo,
       MAX(CASE WHEN l.distanciaCm >= c.alturaCm THEN 0
                WHEN l.distanciaCm <= 0 THEN 100
                ELSE ROUND((1 - l.distanciaCm / c.alturaCm) * 100, 2) END) AS nivelPct
FROM compartimento c
JOIN tipo_residuo t    ON t.idTipoResiduo = c.fkTipoResiduo
JOIN parametrizacao pa ON pa.idParametrizacao = c.fkParametrizacao
JOIN sensor s          ON s.fkCompartimento = c.idCompartimento
JOIN leitura l         ON l.fkSensor = s.idSensor
WHERE c.fkPontoColeta = 1                                  -- ? = ponto aberto
  AND l.dataHora >= NOW() - INTERVAL 7 DAY
GROUP BY c.idCompartimento, t.nome, t.prioridade, s.numeroSensor,
         pa.limiteAtencao, pa.limiteCritico, inicioIntervalo
ORDER BY c.idCompartimento, inicioIntervalo;

-- C3c. 30 dias: maior nível de cada bloco de 6 h (00h, 06h, 12h e 18h; 120 por compartimento)
SELECT c.idCompartimento, t.nome AS tipoResiduo, t.prioridade, s.numeroSensor,
       pa.limiteAtencao, pa.limiteCritico,
       DATE_FORMAT(DATE(l.dataHora) + INTERVAL (CASE WHEN HOUR(l.dataHora) < 6 THEN 0
                                                     WHEN HOUR(l.dataHora) < 12 THEN 6
                                                     WHEN HOUR(l.dataHora) < 18 THEN 12
                                                     ELSE 18 END) HOUR,
                   '%Y-%m-%d %H:00:00') AS inicioIntervalo,
       MAX(CASE WHEN l.distanciaCm >= c.alturaCm THEN 0
                WHEN l.distanciaCm <= 0 THEN 100
                ELSE ROUND((1 - l.distanciaCm / c.alturaCm) * 100, 2) END) AS nivelPct
FROM compartimento c
JOIN tipo_residuo t    ON t.idTipoResiduo = c.fkTipoResiduo
JOIN parametrizacao pa ON pa.idParametrizacao = c.fkParametrizacao
JOIN sensor s          ON s.fkCompartimento = c.idCompartimento
JOIN leitura l         ON l.fkSensor = s.idSensor
WHERE c.fkPontoColeta = 1                                  -- ? = ponto aberto
  AND l.dataHora >= NOW() - INTERVAL 30 DAY
GROUP BY c.idCompartimento, t.nome, t.prioridade, s.numeroSensor,
         pa.limiteAtencao, pa.limiteCritico, inicioIntervalo
ORDER BY c.idCompartimento, inicioIntervalo;

-- C3d. 90 dias: maior nível de cada dia (90 por compartimento)
SELECT c.idCompartimento, t.nome AS tipoResiduo, t.prioridade, s.numeroSensor,
       pa.limiteAtencao, pa.limiteCritico,
       DATE_FORMAT(l.dataHora, '%Y-%m-%d 00:00:00') AS inicioIntervalo,
       MAX(CASE WHEN l.distanciaCm >= c.alturaCm THEN 0
                WHEN l.distanciaCm <= 0 THEN 100
                ELSE ROUND((1 - l.distanciaCm / c.alturaCm) * 100, 2) END) AS nivelPct
FROM compartimento c
JOIN tipo_residuo t    ON t.idTipoResiduo = c.fkTipoResiduo
JOIN parametrizacao pa ON pa.idParametrizacao = c.fkParametrizacao
JOIN sensor s          ON s.fkCompartimento = c.idCompartimento
JOIN leitura l         ON l.fkSensor = s.idSensor
WHERE c.fkPontoColeta = 1                                  -- ? = ponto aberto
  AND l.dataHora >= CURDATE() - INTERVAL 89 DAY
GROUP BY c.idCompartimento, t.nome, t.prioridade, s.numeroSensor,
         pa.limiteAtencao, pa.limiteCritico, inicioIntervalo
ORDER BY c.idCompartimento, inicioIntervalo;

-- C4. ÚLTIMA COLETA DE UM PONTO, COM O NÍVEL DE CADA COMPARTIMENTO (N:M)
SELECT * FROM vw_ultima_coleta_ponto
WHERE idPonto = 1                                          -- ? = ponto aberto
ORDER BY prioridade;

-- C5. HISTÓRICO DE COLETAS DE UM COMPARTIMENTO (o outro lado da N:M)
SELECT co.dataHoraColeta, p.rua, cc.percentualAntes
FROM coleta_compartimento cc
JOIN coleta co       ON co.idColeta = cc.fkColeta
JOIN ponto_coleta p  ON p.idPonto = co.fkPontoColeta
WHERE cc.fkCompartimento = 3                               -- ? = compartimento
ORDER BY co.dataHoraColeta DESC;

-- C6. LEITURAS DE UM PONTO EM UM DIA (card "Leituras do dia")
--     A data vem da tela como 'AAAA-MM-DD' e entra nos DOIS "?" de data.
--     Intervalo [dia, dia + 1) em vez de DATE(dataHora) = ?, para usar o índice.
SELECT l.dataHora, c.idCompartimento, t.nome AS tipoResiduo, t.prioridade,
       s.numeroSensor, l.distanciaCm,
       CASE WHEN l.distanciaCm >= c.alturaCm THEN 0
            WHEN l.distanciaCm <= 0 THEN 100
            ELSE ROUND((1 - l.distanciaCm / c.alturaCm) * 100, 2) END AS nivelPct,
       CASE WHEN (1 - l.distanciaCm / c.alturaCm) * 100 >= pa.limiteCritico THEN 'Critico'
            WHEN (1 - l.distanciaCm / c.alturaCm) * 100 >= pa.limiteAtencao THEN 'Atencao'
            ELSE 'Normal' END AS situacao
FROM compartimento c
JOIN tipo_residuo t    ON t.idTipoResiduo = c.fkTipoResiduo
JOIN parametrizacao pa ON pa.idParametrizacao = c.fkParametrizacao
JOIN sensor s          ON s.fkCompartimento = c.idCompartimento
JOIN leitura l         ON l.fkSensor = s.idSensor
WHERE c.fkPontoColeta = 1                                  -- ? = ponto aberto
  AND l.dataHora >= CURDATE()                              -- ? = data escolhida
  AND l.dataHora < CURDATE() + INTERVAL 1 DAY              -- ? = a mesma data
ORDER BY l.dataHora DESC, c.idCompartimento;

-- C7. SITUAÇÃO DE CADA PONTO (relatório e futuro mapa)
SELECT * FROM vw_ponto_situacao
WHERE idPrefeitura = 1                                     -- ? = prefeitura do usuário
ORDER BY pesoPonto DESC, idPonto;

-- C8. RESUMO DA PREFEITURA (indicadores e topo da dash)
SELECT * FROM vw_resumo_prefeitura
WHERE idPrefeitura = 1;                                    -- ? = prefeitura do usuário

-- C9. PONTOS POR BAIRRO (gráfico): bairros com mais críticos e em atenção primeiro
SELECT * FROM vw_resumo_bairro
WHERE idPrefeitura = 1                                     -- ? = prefeitura do usuário
ORDER BY pontosCriticos DESC, pontosAtencao DESC, bairro;


-- ===================== REGISTRAR UMA COLETA (site) =====================
-- Exemplo para a demonstração: o gestor confirma a coleta do ponto 1.
-- Passo 1: cria a coleta do ponto. Na API, o idColeta novo vem do
--          resultado do INSERT (resultado.insertId).
-- Passo 2: grava os compartimentos DESSE ponto, com o nível da última
--          leitura de cada um (vem da view). O WHERE idPonto garante que só
--          entram compartimentos do mesmo ponto da coleta.
-- Tire os comentários para rodar.
/*
INSERT INTO coleta (dataHoraColeta, fkPontoColeta) VALUES (NOW(), 1);

INSERT INTO coleta_compartimento (fkColeta, fkCompartimento, percentualAntes)
SELECT (SELECT co.idColeta FROM coleta co WHERE co.fkPontoColeta = 1
        ORDER BY co.idColeta DESC LIMIT 1),                -- ? = resultado.insertId
       e.idCompartimento, e.nivelPct
FROM vw_estado_compartimento e
WHERE e.idPonto = 1;                                       -- ? = mesmo ponto da coleta
*/

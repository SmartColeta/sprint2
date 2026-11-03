-- Atencao: a linha abaixo apaga o banco inteiro, com todos os dados,
-- para o script poder ser executado de novo do zero. Use só em
-- desenvolvimento e na demonstração;
DROP DATABASE IF EXISTS smartcoleta;
CREATE DATABASE smartcoleta;
USE smartcoleta;

-- ===================== TABELAS =====================

-- 1. Prefeitura (1 código de acesso por prefeitura)
CREATE TABLE prefeitura (
    idPrefeitura INT PRIMARY KEY AUTO_INCREMENT,
    razaoSocial VARCHAR(50) NOT NULL,
    cnpj CHAR(14) NOT NULL UNIQUE,
    cidade VARCHAR(100), uf CHAR(2), qtdHabitantes INT,
    codigoAcesso VARCHAR(20) NOT NULL UNIQUE
);

-- 2. Usuário (N usuários para 1 prefeitura)
CREATE TABLE usuario (
    idUsuario INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(50), email VARCHAR(50) NOT NULL UNIQUE, senha VARCHAR(255),
    fkPrefeitura INT NOT NULL,
    CONSTRAINT fkUsuarioPrefeitura FOREIGN KEY (fkPrefeitura) REFERENCES prefeitura(idPrefeitura)
);

-- 3. Ponto de coleta (a cidade vem da prefeitura)
CREATE TABLE ponto_coleta (
    idPonto INT PRIMARY KEY AUTO_INCREMENT,
    rua VARCHAR(100),
    bairro VARCHAR(100),
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    statuss VARCHAR(10) NOT NULL DEFAULT 'Normal',
    fkPrefeitura INT NOT NULL,
    CONSTRAINT chkPontoStatus CHECK (statuss IN ('Normal','Atencao','Critico')),
    CONSTRAINT fkPontoPrefeitura FOREIGN KEY (fkPrefeitura)
        REFERENCES prefeitura(idPrefeitura)
);

-- 4. Parametrização (limites em % de enchimento)
--    minEsperado = início da faixa de Atencao | maxEsperado = início da faixa Crítica
CREATE TABLE parametrizacao (
    idParametrizacao INT PRIMARY KEY AUTO_INCREMENT,
    minEsperado DECIMAL(5,2) NOT NULL,
    maxEsperado DECIMAL(5,2) NOT NULL
);

-- 5. Compartimento
CREATE TABLE compartimento (
    idCompartimento INT PRIMARY KEY AUTO_INCREMENT,
    tipoResiduo VARCHAR(30),
    alturaCm DECIMAL(6,2) NOT NULL,
    statuss VARCHAR(10) NOT NULL DEFAULT 'Normal',
    fkPontoColeta INT NOT NULL,
    fkParametrizacao INT NOT NULL,
    CONSTRAINT chkCompartimentoStatus CHECK (statuss IN ('Normal','Atencao','Critico')),
    CONSTRAINT fkCompartimentoPonto FOREIGN KEY (fkPontoColeta)
        REFERENCES ponto_coleta(idPonto),
    CONSTRAINT fkCompartimentoParam FOREIGN KEY (fkParametrizacao)
        REFERENCES parametrizacao(idParametrizacao)
);

-- 6. Sensor (hoje 1 por compartimento; sem UNIQUE, a tabela já aceita mais de um)
CREATE TABLE sensor (
    idSensor INT PRIMARY KEY AUTO_INCREMENT,
    numeroSensor INT, modelo VARCHAR(50), statuss TINYINT,
    fkCompartimento INT NOT NULL,
    CONSTRAINT fkSensorCompartimento FOREIGN KEY (fkCompartimento) REFERENCES compartimento(idCompartimento)
);

-- 7. Leitura
CREATE TABLE leitura (
    distanciaCm DECIMAL(6,2),
    dataHora DATETIME DEFAULT CURRENT_TIMESTAMP,
    fkSensor INT NOT NULL,
    PRIMARY KEY (fkSensor, dataHora),
    CONSTRAINT fkLeituraSensor FOREIGN KEY (fkSensor)
        REFERENCES sensor(idSensor)
);


-- 8. Coleta (o caminhão é acionado quando um compartimento entra em Atencao e
--    recolhe TODOS os compartimentos do ponto, inclusive os normais: coleta é do PONTO)
CREATE TABLE coleta (
    idColeta INT PRIMARY KEY AUTO_INCREMENT,
    dataHoraColeta DATETIME,
    fkPontoColeta INT NOT NULL,
    CONSTRAINT fkColetaPonto FOREIGN KEY (fkPontoColeta) REFERENCES ponto_coleta(idPonto)
);

-- ===================== INSERTS =====================

INSERT INTO prefeitura (razaoSocial, cnpj, cidade, uf, qtdHabitantes, codigoAcesso) VALUES
('MUNICIPIO DE CAMPO NOVO DE RONDONIA', '63762033000199', 'Campo Novo de Rondônia', 'RO', 9225, 'SMCL0001'),
('MUNICIPIO DE CEREJEIRAS', '04914925000107', 'Cerejeiras', 'RO', 16975, 'SMCL0002'),
('MUNICIPIO DE BANDEIRANTES', '03501491000142', 'Bandeirantes', 'MS', 8276, 'SMCL0003');

INSERT INTO ponto_coleta (rua, bairro, latitude, longitude, statuss, fkPrefeitura) VALUES
('Rua Principal, 100', 'Centro', -10.5969000, -63.6122000, 'Atencao', 1),
('Avenida Central, 250', 'Centro', -10.5990000, -63.6150000, 'Normal', 1),
('Rua das Flores, 45', 'Centro', -13.1889000, -60.8122000, 'Atencao', 2),
('Rua Sete de Setembro, 80', 'Centro', -19.9178000, -54.3639000, 'Atencao', 3);

INSERT INTO parametrizacao (minEsperado, maxEsperado) VALUES
(70.00, 90.00), (65.00, 85.00), (75.00, 95.00), (60.00, 80.00);

-- Os compartimentos 5 e 6 ficam no ponto_coleta 1, junto com o 1: quando o 1 entra
-- em atenção, o caminhão leva também o 5 e o 6 (normais).
INSERT INTO compartimento (tipoResiduo, alturaCm, statuss, fkPontoColeta, fkParametrizacao) VALUES
('Orgânico',   100.00, 'Atencao', 1, 1),
('Reciclável', 100.00, 'Normal',  2, 2),
('Papel',      100.00, 'Atencao', 3, 3),
('Plástico',   100.00, 'Atencao', 4, 4),
('Reciclável', 100.00, 'Normal',  1, 1),
('Papel',      100.00, 'Normal',  1, 1);

INSERT INTO sensor (numeroSensor, modelo, statuss, fkCompartimento) VALUES
(101, 'HC-SR04', 1, 1), (102, 'HC-SR04', 1, 2), (103, 'HC-SR04', 1, 3),
(104, 'HC-SR04', 1, 4), (105, 'HC-SR04', 1, 5), (106, 'HC-SR04', 1, 6);

INSERT INTO leitura (fkSensor, distanciaCm, dataHora) VALUES
-- 13/10, pouco antes de cada coleta
(1, 7.50,  '2026-10-13 13:50:00'), (5, 60.00, '2026-10-13 13:50:00'),
(6, 80.00, '2026-10-13 13:50:00'), (2, 12.00, '2026-10-13 15:20:00'),
(3, 3.90,  '2026-10-13 16:35:00'), (4, 17.70, '2026-10-13 18:00:00'),
-- 14/10 (estado atual)
(1, 15.50, '2026-10-14 08:30:00'), (2, 45.00, '2026-10-14 09:15:00'),
(3, 10.20, '2026-10-14 10:00:00'), (4, 30.80, '2026-10-14 10:45:00'),
(5, 60.00, '2026-10-14 08:30:00'), (6, 80.00, '2026-10-14 08:30:00');

INSERT INTO coleta (fkPontoColeta, dataHoraColeta) VALUES
(1, '2026-10-13 14:00:00'), (2, '2026-10-13 15:30:00'),
(3, '2026-10-13 16:45:00'), (4, '2026-10-13 18:10:00');

-- CADASTRO VIA CÓDIGO DE ACESSO (o mesmo código serve para vários usuários da prefeitura)
-- Se o código não existir, o SELECT não retorna nada e nenhum usuário é inserido
INSERT INTO usuario (nome, email, senha, fkPrefeitura)
SELECT 'Gestor Operacional', 'operador@smartcoleta.com', 'senha123', idPrefeitura
FROM prefeitura WHERE codigoAcesso = 'SMCL0001';

INSERT INTO usuario (nome, email, senha, fkPrefeitura)
SELECT 'Fiscal de Coleta', 'fiscal@smartcoleta.com', 'senha123', idPrefeitura
FROM prefeitura WHERE codigoAcesso = 'SMCL0001';

-- ===================== CONSULTAS =====================

-- Usuários e suas prefeituras
SELECT u.nome, u.email, p.razaoSocial, p.cidade, p.codigoAcesso
FROM usuario u
JOIN prefeitura p ON u.fkPrefeitura = p.idPrefeitura;

-- Compartimentos com ponto, cidade e limites
SELECT c.idCompartimento, pr.cidade, p.rua, c.tipoResiduo, pa.minEsperado, pa.maxEsperado
FROM compartimento c
JOIN ponto_coleta p    ON c.fkPontoColeta = p.idPonto
JOIN prefeitura pr     ON p.fkPrefeitura = pr.idPrefeitura
JOIN parametrizacao pa ON c.fkParametrizacao = pa.idParametrizacao;

-- Estado atual: última leitura de cada sensor, com nível e status
-- (para ver só um sensor, acrescente WHERE s.idSensor = 1 no final)
SELECT pr.cidade, p.rua, c.tipoResiduo, s.numeroSensor, l.dataHora,
       ROUND((1 - l.distanciaCm / c.alturaCm) * 100, 2) AS nivelPct,
       CASE WHEN (1 - l.distanciaCm / c.alturaCm) * 100 >= pa.maxEsperado THEN 'Critico'
            WHEN (1 - l.distanciaCm / c.alturaCm) * 100 >= pa.minEsperado THEN 'Atencao'
            ELSE 'Normal' END AS statusPreenchimento
FROM sensor s
JOIN leitura l ON l.fkSensor = s.idSensor
              AND l.dataHora = (
        SELECT MAX(l2.dataHora) FROM leitura l2
        WHERE l2.fkSensor = s.idSensor)
JOIN compartimento c   ON s.fkCompartimento = c.idCompartimento
JOIN ponto_coleta p    ON c.fkPontoColeta = p.idPonto
JOIN prefeitura pr     ON p.fkPrefeitura = pr.idPrefeitura
JOIN parametrizacao pa ON c.fkParametrizacao = pa.idParametrizacao;

-- Regra do caminhão: o ponto é acionado se ALGUM compartimento está em Atencao
-- ou pior; a lista traz TODOS os compartimentos dele, inclusive os normais
SELECT t.idPonto, t.cidade, t.rua, t.idCompartimento, t.tipoResiduo,
       t.nivelPct, t.statusPreenchimento
FROM (
    SELECT pr.cidade, p.idPonto, p.rua, c.idCompartimento, c.tipoResiduo,
           ROUND((1 - l.distanciaCm / c.alturaCm) * 100, 2) AS nivelPct,
           CASE WHEN (1 - l.distanciaCm / c.alturaCm) * 100 >= pa.maxEsperado THEN 'Critico'
                WHEN (1 - l.distanciaCm / c.alturaCm) * 100 >= pa.minEsperado THEN 'Atencao'
                ELSE 'Normal' END AS statusPreenchimento
    FROM sensor s
    JOIN leitura l ON l.fkSensor = s.idSensor
                  AND l.dataHora = (
            SELECT MAX(l2.dataHora) FROM leitura l2
            WHERE l2.fkSensor = s.idSensor)
    JOIN compartimento c   ON s.fkCompartimento = c.idCompartimento
    JOIN ponto_coleta p    ON c.fkPontoColeta = p.idPonto
    JOIN prefeitura pr     ON p.fkPrefeitura = pr.idPrefeitura
    JOIN parametrizacao pa ON c.fkParametrizacao = pa.idParametrizacao
)
-- TODOS OS COMPARTIMENTOS, APELIDO t
 t
JOIN (
    -- pontos com pelo menos um compartimento em Atencao ou pior
    SELECT DISTINCT c.fkPontoColeta AS idPonto
    FROM sensor s
    JOIN leitura l ON l.fkSensor = s.idSensor
                  AND l.dataHora = (
            SELECT MAX(l2.dataHora) FROM leitura l2
            WHERE l2.fkSensor = s.idSensor)
    JOIN compartimento c   ON s.fkCompartimento = c.idCompartimento
    JOIN parametrizacao pa ON c.fkParametrizacao = pa.idParametrizacao
    WHERE (1 - l.distanciaCm / c.alturaCm) * 100 >= pa.minEsperado
) acionados ON acionados.idPonto = t.idPonto
ORDER BY t.idPonto, t.nivelPct DESC;

-- Nível de cada compartimento no momento de cada coleta
-- (última leitura do sensor até o horário da coleta)
SELECT co.idColeta, co.dataHoraColeta, p.rua, c.idCompartimento, c.tipoResiduo,
       ROUND((1 - l.distanciaCm / c.alturaCm) * 100, 2) AS nivelPct,
       CASE WHEN l.dataHora IS NULL THEN 'Sem leitura'
            WHEN (1 - l.distanciaCm / c.alturaCm) * 100 >= pa.maxEsperado THEN 'Critico'
            WHEN (1 - l.distanciaCm / c.alturaCm) * 100 >= pa.minEsperado THEN 'Atencao'
            ELSE 'Normal' END AS statusNaColeta
FROM coleta co
JOIN ponto_coleta p    ON co.fkPontoColeta = p.idPonto
JOIN compartimento c   ON c.fkPontoColeta = p.idPonto
JOIN parametrizacao pa ON c.fkParametrizacao = pa.idParametrizacao
JOIN sensor s          ON s.fkCompartimento = c.idCompartimento
LEFT JOIN leitura l ON l.fkSensor = s.idSensor
                   AND l.dataHora = (
        SELECT MAX(l2.dataHora) FROM leitura l2
        WHERE l2.fkSensor = s.idSensor AND l2.dataHora <= co.dataHoraColeta);
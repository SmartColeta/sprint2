
CREATE DATABASE IF NOT EXISTS smartcoleta;
USE smartcoleta;

-- 1. Prefeitura (1 código de acesso por prefeitura)
CREATE TABLE prefeitura (
    idPrefeitura INT PRIMARY KEY AUTO_INCREMENT,
    razaoSocial VARCHAR(50) NOT NULL,
    cnpj CHAR(14) NOT NULL UNIQUE,
    uf CHAR(2),
    qtdHabitantes INT,
    codigoAcesso VARCHAR(20) NOT NULL UNIQUE
);

-- 2. Usuário (N usuários para 1 prefeitura)
CREATE TABLE usuario (
    idUsuario INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(50),
    email VARCHAR(50) NOT NULL UNIQUE,
    senha VARCHAR(255),
    fkPrefeitura INT NOT NULL,
    CONSTRAINT fkUsuarioPrefeitura FOREIGN KEY (fkPrefeitura)
        REFERENCES prefeitura(idPrefeitura)
);

-- 3. Ponto de coleta (pertence a uma prefeitura)
CREATE TABLE ponto_coleta (
    idPonto INT PRIMARY KEY AUTO_INCREMENT,
    rua VARCHAR(100),
    bairro VARCHAR(100),
    cidade VARCHAR(100),
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    statuss TINYINT,
    fkPrefeitura INT NOT NULL,
    CONSTRAINT fkPontoPrefeitura FOREIGN KEY (fkPrefeitura)
        REFERENCES prefeitura(idPrefeitura)
);

-- 4. Parametrização (limites em % de enchimento)
CREATE TABLE parametrizacao (
    idParametrizacao INT PRIMARY KEY AUTO_INCREMENT,
    limiteAtencao DECIMAL(5,2) NOT NULL,
    limiteCritico DECIMAL(5,2) NOT NULL,
    CONSTRAINT chkLimites CHECK (limiteAtencao < limiteCritico)
);

-- 5. Compartimento
CREATE TABLE compartimento (
    idCompartimento INT PRIMARY KEY AUTO_INCREMENT,
    tipoResiduo VARCHAR(30),
    alturaCm DECIMAL(6,2) NOT NULL,
    statuss TINYINT,
    fkPontoColeta INT NOT NULL,
    fkParametrizacao INT NOT NULL,
    CONSTRAINT fkCompartimentoPonto FOREIGN KEY (fkPontoColeta)
        REFERENCES ponto_coleta(idPonto),
    CONSTRAINT fkCompartimentoParam FOREIGN KEY (fkParametrizacao)
        REFERENCES parametrizacao(idParametrizacao)
);

-- 6. Sensor (1 sensor por compartimento)
CREATE TABLE sensor (
    idSensor INT PRIMARY KEY AUTO_INCREMENT,
    numeroSensor INT,
    modelo VARCHAR(50),
    statuss TINYINT,
    fkCompartimento INT NOT NULL UNIQUE,
    CONSTRAINT fkSensorCompartimento FOREIGN KEY (fkCompartimento)
        REFERENCES compartimento(idCompartimento)
);

-- 7. Leitura
CREATE TABLE leitura (
    idLeitura INT PRIMARY KEY AUTO_INCREMENT,
    distanciaCm DECIMAL(6,2),
    dataHora DATETIME DEFAULT CURRENT_TIMESTAMP,
    fkSensor INT NOT NULL,
    CONSTRAINT fkLeituraSensor FOREIGN KEY (fkSensor)
        REFERENCES sensor(idSensor)
);

-- 8. Coleta
CREATE TABLE coleta (
    idColeta INT PRIMARY KEY AUTO_INCREMENT,
    dataHoraColeta DATETIME,
    coletaAntes DECIMAL(5,2),
    fkCompartimento INT NOT NULL,
    CONSTRAINT fkColetaCompartimento FOREIGN KEY (fkCompartimento)
        REFERENCES compartimento(idCompartimento)
);

-- INSERTS
INSERT INTO prefeitura (razaoSocial, cnpj, uf, qtdHabitantes, codigoAcesso) VALUES
('MUNICIPIO DE CAMPO NOVO DE RONDONIA', '63762033000199', 'RO', 9225, 'SMCL0001'),
('MUNICIPIO DE CEREJEIRAS', '04914925000107', 'RO', 16975, 'SMCL0002'),
('MUNICIPIO DE BANDEIRANTES', '03501491000142', 'MS', 8276, 'SMCL0003');

INSERT INTO ponto_coleta (rua, bairro, cidade, latitude, longitude, statuss, fkPrefeitura) VALUES
('Rua Haddock Lobo', 'Cerqueira César', 'São Paulo', -23.5562000, -46.6621000, 1, 1),
('Av. Paulista', 'Bela Vista', 'São Paulo', -23.5618000, -46.6565000, 1, 1),
('Rua Augusta', 'Consolação', 'São Paulo', -23.5505000, -46.6558000, 1, 2),
('Rua Bela Cintra', 'Consolação', 'São Paulo', -23.5534000, -46.6589000, 1, 3);

INSERT INTO parametrizacao (limiteAtencao, limiteCritico) VALUES
(70.00, 90.00),
(65.00, 85.00),
(75.00, 95.00),
(60.00, 80.00);

INSERT INTO compartimento (tipoResiduo, alturaCm, statuss, fkPontoColeta, fkParametrizacao) VALUES
('Orgânico',   100.00, 1, 1, 1),
('Reciclável', 100.00, 1, 2, 2),
('Papel',      100.00, 1, 3, 3),
('Plástico',   100.00, 1, 4, 4);

INSERT INTO sensor (numeroSensor, modelo, statuss, fkCompartimento) VALUES
(101, 'HC-SR04', 1, 1),
(102, 'HC-SR04', 1, 2),
(103, 'HC-SR04', 1, 3),
(104, 'HC-SR04', 1, 4);

INSERT INTO leitura (fkSensor, distanciaCm, dataHora) VALUES
(1, 15.50, '2026-10-14 08:30:00'),
(2, 45.00, '2026-10-14 09:15:00'),
(3, 10.20, '2026-10-14 10:00:00'),
(4, 30.80, '2026-10-14 10:45:00');

INSERT INTO coleta (fkCompartimento, dataHoraColeta, coletaAntes) VALUES
(1, '2026-10-13 14:00:00', 92.50),
(2, '2026-10-13 15:30:00', 88.00),
(3, '2026-10-13 16:45:00', 96.10),
(4, '2026-10-13 18:10:00', 82.30);

-- CADASTRO VIA CÓDIGO DE ACESSO
-- O mesmo código ('SMCL0001') serve para vários usuários da mesma prefeitura
INSERT INTO usuario (nome, email, senha, fkPrefeitura)
SELECT 'Gestor Operacional', 'operador@smartcoleta.com', 'senha123', idPrefeitura
FROM prefeitura WHERE codigoAcesso = 'SMCL0001';

INSERT INTO usuario (nome, email, senha, fkPrefeitura)
SELECT 'Fiscal de Coleta', 'fiscal@smartcoleta.com', 'senha123', idPrefeitura
FROM prefeitura WHERE codigoAcesso = 'SMCL0001';
-- Se o código não existir, o SELECT não retorna nada e nenhum usuário é inserido

-- CONSULTAS
-- Usuários e suas prefeituras
SELECT u.nome, u.email, p.razaoSocial, p.codigoAcesso
FROM usuario u
JOIN prefeitura p ON u.fkPrefeitura = p.idPrefeitura;

-- Compartimentos com ponto e limites
SELECT c.idCompartimento, p.rua, p.bairro, c.tipoResiduo, pa.limiteCritico
FROM compartimento c
JOIN ponto_coleta p    ON c.fkPontoColeta = p.idPonto
JOIN parametrizacao pa ON c.fkParametrizacao = pa.idParametrizacao;

-- Status da leitura usando a parametrização do compartimento
SELECT
    l.idLeitura,
    s.numeroSensor,
    l.distanciaCm,
    ROUND((1 - l.distanciaCm / c.alturaCm) * 100, 2) AS nivelPct,
    CASE
        WHEN (1 - l.distanciaCm / c.alturaCm) * 100 >= pa.limiteCritico THEN 'Crítico'
        WHEN (1 - l.distanciaCm / c.alturaCm) * 100 >= pa.limiteAtencao THEN 'Atenção'
        ELSE 'Normal'
    END AS statusPreenchimento
FROM leitura l
JOIN sensor s          ON l.fkSensor = s.idSensor
JOIN compartimento c   ON s.fkCompartimento = c.idCompartimento
JOIN parametrizacao pa ON c.fkParametrizacao = pa.idParametrizacao;

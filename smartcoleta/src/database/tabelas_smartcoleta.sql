
-- 1. Tabela Prefeitura
CREATE TABLE prefeitura (
    idPrefeitura INT PRIMARY KEY AUTO_INCREMENT,
    razaoSocial VARCHAR(50),
    cnpj CHAR(14),
    uf CHAR(2),
    qtdHabitantes INT,
    codigoAcesso VARCHAR(20)
);

-- 2. Tabela Ponto de Coleta
CREATE TABLE ponto_coleta (
    idPonto INT PRIMARY KEY AUTO_INCREMENT,
    rua VARCHAR(100),
    bairro VARCHAR(100),
    cidade VARCHAR(100),
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    statuss TINYINT
);

-- 3. Tabela Compartimento
CREATE TABLE compartimento (
    idCompartimento INT PRIMARY KEY AUTO_INCREMENT,
	tipoResiduo VARCHAR(30),
	statuss TINYINT,
    fkPontoColeta INT,
    CONSTRAINT fkCompartimentoPonto FOREIGN KEY (fkPontoColeta)
        REFERENCES ponto_coleta(idPonto)
);

-- 4. Tabela Sensor
CREATE TABLE sensor (
    idSensor INT PRIMARY KEY AUTO_INCREMENT,
    fkCompartimentoSensor INT,
    numeroSensor INT,
    modelo VARCHAR(50),
    statuss TINYINT,
    FOREIGN KEY (fkCompartimentoSensor)
        REFERENCES compartimento(idCompartimento)
);

-- 5. Tabela Leitura
CREATE TABLE leitura (
    idLeitura INT PRIMARY KEY AUTO_INCREMENT,
    distanciaCm DECIMAL(6,2),
    dataHora DATETIME DEFAULT CURRENT_TIMESTAMP,
    fkSensor INT,
    FOREIGN KEY (fkSensor)
        REFERENCES sensor(idSensor)
);

-- 6. Tabela Parametrização
CREATE TABLE parametrizacao (
    idParametrizacao INT PRIMARY KEY AUTO_INCREMENT,
    limiteNormal DECIMAL(5,2),
    limiteAtencao DECIMAL(5,2),
    limiteCritico DECIMAL(5,2),
    fkLeitura INT, 
    FOREIGN KEY (fkLeitura)
        REFERENCES leitura(idLeitura)
);

-- 7. Tabela Coleta
CREATE TABLE coleta (
    idColeta INT PRIMARY KEY AUTO_INCREMENT,
    fkCompartimento INT,
    dataHoraColeta DATETIME,
    coletaAntes DECIMAL(5,2),
    FOREIGN KEY (fkCompartimento)
        REFERENCES compartimento(idCompartimento)
);

-- 8. Tabela Usuário (com e-mail pré-cadastrado para validação/atualização)
CREATE TABLE usuario (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(50),
    email VARCHAR(50) UNIQUE,
    senha VARCHAR(50)
);


-- INSERÇÃO DE DADOS EM TODAS AS TABELAS

INSERT INTO prefeitura (razaoSocial, cnpj, uf, qtdHabitantes, codigoAcesso) VALUES
('MUNICIPIO DE CAMPO NOVO DE RONDONIA', '63762033000199', 'RO', 9225, 'SMCL0001'),
('MUNICIPIO DE CEREJEIRAS', '04914925000107', 'RO', 16975, 'SMCL0002'),
('MUNICIPIO DE BANDEIRANTES', '03501491000142', 'MS', 8276, 'SMCL0003');

INSERT INTO ponto_coleta (rua, bairro, cidade, latitude, longitude, statuss) VALUES
('Rua Haddock Lobo', 'Cerqueira César', 'São Paulo', -23.5562000, -46.6621000, 1),
('Av. Paulista', 'Bela Vista', 'São Paulo', -23.5618000, -46.6565000, 1),
('Rua Augusta', 'Consolação', 'São Paulo', -23.5505000, -46.6558000, 1),
('Rua Bela Cintra', 'Consolação', 'São Paulo', -23.5534000, -46.6589000, 1);

INSERT INTO compartimento (fkPontoColeta, statuss, tipoResiduo, limiteAtencao, limiteCritico) VALUES
(1, 1, 'Orgânico', 70.00, 90.00),
(2, 1, 'Reciclável', 65.00, 85.00),
(3, 1, 'Papel', 75.00, 95.00),
(4, 1, 'Plástico', 60.00, 80.00);

INSERT INTO sensor (fkCompartimentoSensor, numeroSensor, modelo, statuss) VALUES
(1, 101, 'HC-SR04', 1),
(2, 102, 'HC-SR04', 1),
(3, 103, 'HC-SR04', 1),
(4, 104, 'HC-SR04', 1);

INSERT INTO leitura (idSensor, distanciaCm, dataHora) VALUES
(1, 15.50, '2026-10-14 08:30:00'),
(2, 45.00, '2026-10-14 09:15:00'),
(3, 10.20, '2026-10-14 10:00:00'),
(4, 30.80, '2026-10-14 10:45:00');

INSERT INTO parametrizacao (limiteNormal, limiteAtencao, limiteCritico, fkLeitura) VALUES
(40.00, 70.00, 90.00, 1),
(35.00, 65.00, 85.00, 2),
(50.00, 75.00, 95.00, 3),
(30.00, 60.00, 80.00, 4);

INSERT INTO coleta (fkCompartimentoSensor, dataHoraColeta, coletaAntes) VALUES
(1, '2026-10-13 14:00:00', 92.50),
(2, '2026-10-13 15:30:00', 88.00),
(3, '2026-10-13 16:45:00', 96.10),
(4, '2026-10-13 18:10:00', 82.30);

-- Inserindo usuários com e-mails já cadastrados (pré-autorizados na própria tabela)
INSERT INTO usuario (nome, email, senha) VALUES
(NULL, 'admin.sp@smartcoleta.com', NULL),
(NULL, 'fiscal.sp@smartcoleta.com', NULL),
('Gestor Operacional', 'operador@smartcoleta.com', 'senha123');


-- VISUALIZAR DADOS DE TODAS AS TABELAS

SELECT * FROM prefeitura;
SELECT * FROM ponto_coleta;
SELECT * FROM compartimento;
SELECT * FROM sensor;
SELECT * FROM leitura;
SELECT * FROM parametrizacao;
SELECT * FROM coleta;
SELECT * FROM usuario;

-- Exibir compartimentos junto com os dados do ponto de coleta correspondente
SELECT 
    c.idCompartimento,
    p.rua,
    p.bairro,
    c.tipoResiduo,
    c.limiteCritico
FROM compartimento c
JOIN ponto_coleta p ON c.fkPontoColeta = p.idPonto;

-- Exibir todos os pontos de coleta, mesmo os que não tenham compartimentos cadastrados
SELECT 
    p.idPonto,
    p.rua,
    c.idCompartimento,
    c.tipoResiduo
FROM ponto_coleta p
LEFT JOIN compartimento c ON p.idPonto = c.fkPontoColeta;

-- Exibir todos os sensores e seus compartimentos (priorizando a tabela sensor)
SELECT 
    s.idSensor,
    s.numeroSensor,
    s.modelo,
    c.tipoResiduo
FROM compartimento c
RIGHT JOIN sensor s ON c.idCompartimento = s.fkCompartimentoSensor;

-- Filtrar pontos de coleta localizados em ruas que contêm 'Paulista' ou 'Haddock'
SELECT * 
FROM ponto_coleta 
WHERE rua LIKE '%Paulista%' OR rua LIKE '%Haddock%';

-- Classificar o nível do resíduo com base na distância medida pelo sensor
SELECT 
    l.idLeitura,
    l.distanciaCm,
    s.numeroSensor,
    CASE 
        WHEN l.distanciaCm < 20.00 THEN 'Crítico (Muito Cheio)'
        WHEN l.distanciaCm BETWEEN 20.00 AND 50.00 THEN 'Atenção (Meio Cheio)'
        ELSE 'Normal (Vazio)'
    END AS statusPreenchimento
FROM leitura l
JOIN sensor s ON l.idSensor = s.idSensor;


-- Consultar se o e-mail já existe/está cadastrado na tabela de usuários
SELECT email 
FROM usuario 
WHERE email = 'fiscal.sp@smartcoleta.com';

-- Realizar o UPDATE de nome e senha utilizando o e-mail como filtro
UPDATE usuario 
SET nome = 'Fiscal de Coleta SP', senha = 'senha123'
WHERE email = 'fiscal.sp@smartcoleta.com';
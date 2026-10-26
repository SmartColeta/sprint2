CREATE DATABASE smartcoleta;
use smartcoleta;

CREATE TABLE ponto_coleta (
idPonto INT PRIMARY KEY AUTO_INCREMENT,
rua VARCHAR(100),
bairro VARCHAR(100),
cidade VARCHAR(100),
latitude DECIMAL(10,7),
longitude DECIMAL(10,7),
statuss TINYINT
);

CREATE TABLE compartimento (
idCompartimento INT PRIMARY KEY AUTO_INCREMENT,
fkPontoColeta INT,
	CONSTRAINT fkCompartimentoPonto FOREIGN KEY (fkPontoColeta)
		REFERENCES ponto_coleta(idPonto),
statuss TINYINT,
tipoResiduo VARCHAR(30),
limiteAtencao DECIMAL(5,2),
limiteCritico DECIMAL(5,2)
);

CREATE TABLE sensor (
idSensor INT PRIMARY KEY AUTO_INCREMENT,
fkCompartimentoSensor INT,
numeroSensor INT,
modelo VARCHAR(50),
statuss TINYINT,
    FOREIGN KEY (fkCompartimentoSensor)
        REFERENCES compartimento(idCompartimento)
);

CREATE TABLE leitura (
idLeitura INT PRIMARY KEY AUTO_INCREMENT,
distanciaCm DECIMAL(6,2),
dataHora DATETIME DEFAULT CURRENT_TIMESTAMP,
fkSensor INT,
    FOREIGN KEY (fkSensor)
        REFERENCES sensor(idSensor)
);

CREATE TABLE coleta (
idColeta INT PRIMARY KEY AUTO_INCREMENT,
fkCompartimentoSensor INT,
dataHoraColeta DATETIME,
coletaAntes DECIMAL(5,2),
    FOREIGN KEY (fkCompartimentoSensor)
        REFERENCES compartimento(idCompartimento)

);

CREATE TABLE prefeitura (
	idPrefeitura INT PRIMARY KEY AUTO_INCREMENT,
    razaoSocial VARCHAR(50),
    cnpj CHAR(14),
    uf CHAR(2),
    qtdHabitantes INT,
    fkEndereco INT,
		CONSTRAINT fkPrefeituraEnd FOREIGN KEY (fkEndereco)
			REFERENCES endereco(idEndereco)
);

CREATE TABLE emailsAutorizados(
	idEmailAutorizados		INT PRIMARY KEY AUTO_INCREMENT,
    email					VARCHAR(45) UNIQUE,
		CONSTRAINT fkEmailAutorizado CHECK (email IN('%@%.%')),
	fkPrefeitura			INT,
		CONSTRAINT fkEmailPrefeitura FOREIGN KEY (fkPrefeitura)
			REFERENCES prefeitura(idPrefeitura)
);

CREATE TABLE usuario (
	id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(50),
    email VARCHAR(50),
    senha VARCHAR(50)
);

INSERT INTO ponto_coleta (rua, bairro, cidade, latitude, longitude, statuss) VALUES
('Rua Haddock Lobo', 'Cerqueira César', 'São Paulo', -23.5562000, -46.6621000, 1),
('Av. Paulista', 'Bela Vista', 'São Paulo', -23.5618000, -46.6565000, 1),
('Rua Augusta', 'Consolação', 'São Paulo', -23.5505000, -46.6558000, 1),
('Rua Bela Cintra', 'Consolação', 'São Paulo', -23.5534000, -46.6589000, 1);

INSERT INTO compartimento (ponto_coleta_idPonto, statuss, tipoResiduo, limiteAtencao, limiteCritico) VALUES
(1, 1, 'Orgânico', 70.00, 90.00),
(2, 1, 'Reciclável', 65.00, 85.00),
(3, 1, 'Papel', 75.00, 95.00),
(4, 1, 'Plástico', 60.00, 80.00);

INSERT INTO sensor (fkCompartimentoSensor, numeroSensor, modelo, statuss) VALUES
(1, 101, 'HC-SR04', 1),
(2, 102, 'HC-SR04', 1),
(3, 103, 'JSN-SR0T4M', 1),
(4, 104, 'HC-SR04', 1);

INSERT INTO leitura (idSensor, distanciaCm, dataHora) VALUES
(1, 15.50, '2026-10-14 08:30:00'),
(2, 45.00, '2026-10-14 09:15:00'),
(3, 10.20, '2026-10-14 10:00:00'),
(4, 30.80, '2026-10-14 10:45:00');

INSERT INTO coleta (fkCompartimentoSensor, dataHoraColeta, coletaAntes) VALUES
(1, '2026-10-13 14:00:00', 92.50),
(2, '2026-10-13 15:30:00', 88.00),
(3, '2026-10-13 16:45:00', 96.10),
(4, '2026-10-13 18:10:00', 82.30);

-- TABELA PREFEITURA INSERTS
INSERT INTO prefeitura (razaoSocial, cnpj, uf, qtdHabitantes) VALUES
('MUNICIPIO DE CAMPO NOVO DE RONDONIA', '63762033000199', 'RO' 9225, 'SMCL0001'),
('MUNICIPIO DE CEREJEIRAS', '04914925000107', 'RO', 16975, 'SMCL0002'),
('MUNICIPIO DE BANDEIRANTES', '03501491000142', 'MS' 8276, 'SMCL0003');

-- 1. Exibir todos os pontos de coleta cadastrados
SELECT * FROM ponto_coleta;

-- 2. Exibir os compartimentos junto com a rua e o bairro do ponto correspondente (JOIN)
SELECT 
    c.idCompartimento,
    p.rua,
    p.bairro,
    c.tipoResiduo,
    c.limiteCritico
FROM compartimento c
JOIN ponto_coleta p ON c.ponto_coleta_idPonto = p.idPonto;

-- 3. Exibir os sensores e seus respectivos modelos e compartimentos
SELECT 
    s.idSensor,
    s.numeroSensor,
    s.modelo,
    c.tipoResiduo
FROM sensor s
JOIN compartimento c ON s.fkCompartimentoSensor = c.idCompartimento;

-- 4. Exibir as leituras mais recentes dos sensores em centímetros
SELECT 
    l.idLeitura,
    s.numeroSensor,
    l.distanciaCm,
    l.dataHora
FROM leitura l
JOIN sensor s ON l.idSensor = s.idSensor;

-- 5. Exibir toda a tabela usuario
SELECT * FROM usuario;
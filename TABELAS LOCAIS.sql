CREATE DATABASE SmartColeta;
USE SmartColeta;

CREATE TABLE ponto_coleta (
    idPonto INT PRIMARY KEY AUTO_INCREMENT,
    rua VARCHAR (100),
    bairro VARCHAR (100),
    cidade VARCHAR (100),
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    statuss VARCHAR(20) DEFAULT 'Ativo',
    CONSTRAINT chk_ponto_status CHECK (statuss IN ('Ativo', 'Inativo', 'Em Manutenção'))
);

CREATE TABLE compartimento (
    idCompartimento INT PRIMARY KEY AUTO_INCREMENT,
    idPonto INT NOT NULL,
    statuss VARCHAR(20) DEFAULT 'Ativo',
    FOREIGN KEY (idPonto) REFERENCES ponto_coleta(idPonto),
    CONSTRAINT chk_compartimento_status CHECK (statuss IN ('Ativo', 'Inativo', 'Em Manutenção'))
);

CREATE TABLE sensor (
    idSensor INT PRIMARY KEY AUTO_INCREMENT,
    idCompartimento INT NOT NULL,
    numeroSensor INT NOT NULL,
    modelo VARCHAR (50),
    statuss VARCHAR(20) DEFAULT 'Ativo',
    FOREIGN KEY (idCompartimento) REFERENCES compartimento(idCompartimento),
    CONSTRAINT chk_sensor_status CHECK (statuss IN ('Ativo', 'Inativo', 'Em Manutenção'))
);

CREATE TABLE leitura (
    idLeitura INT PRIMARY KEY AUTO_INCREMENT,
    idSensor INT NOT NULL,
    percentualPreenchimento DECIMAL (5,2) NOT NULL,
    distanciaCm FLOAT (8,2),
    dataHora DATETIME NOT NULL,
    FOREIGN KEY (idSensor) REFERENCES sensor (idSensor)
);

CREATE TABLE coleta (
    idColeta INT PRIMARY KEY AUTO_INCREMENT,
    idCompartimento INT NOT NULL,
    caminhao VARCHAR (20),
    dataHora DATETIME NOT NULL,
    percentualAntes DECIMAL (5,2),
    observacao VARCHAR (255),
    FOREIGN KEY (idCompartimento) REFERENCES compartimento (idCompartimento)
);
INSERT INTO ponto_coleta (rua, bairro, cidade, latitude, longitude, statuss) VALUES
('Av. Tancredo Neves', 'Centro', 'Campo Novo de Rondônia', -10.5694210, -63.6263500, 'Ativo'),
('Rua JK', 'Bairro Planalto', 'Campo Novo de Rondônia', -10.5712100, -63.6281000, 'Ativo'),
('Av. Airton Senna', 'Setor 02', 'Campo Novo de Rondônia', -10.5681000, -63.6225000, 'Em Manutenção'),
('Rua Rio de Janeiro', 'Bairro das Palmeiras', 'Campo Novo de Rondônia', -10.5735000, -63.6300000, 'Inativo');

INSERT INTO compartimento (idPonto, statuss) VALUES
(1, 'Ativo'),
(2, 'Ativo'),
(3, 'Em Manutenção'),
(4, 'Inativo');

INSERT INTO sensor (idCompartimento, numeroSensor, modelo, statuss) VALUES
(1, 1, 'HC-SR04-IoT', 'Ativo'),
(1, 2, 'HC-SR04-IoT', 'Ativo'),
(1, 3, 'HC-SR04-IoT', 'Ativo'),
(1, 4, 'HC-SR04-IoT', 'Ativo'),
(2, 1, 'HC-SR04-IoT', 'Ativo'),
(2, 2, 'HC-SR04-IoT', 'Ativo'),
(2, 3, 'HC-SR04-IoT', 'Ativo'),
(2, 4, 'HC-SR04-IoT', 'Ativo'),
(3, 1, 'HC-SR04-IoT', 'Em Manutenção'),
(3, 2, 'HC-SR04-IoT', 'Em Manutenção'),
(3, 3, 'HC-SR04-IoT', 'Em Manutenção'),
(3, 4, 'HC-SR04-IoT', 'Em Manutenção'),
(4, 1, 'HC-SR04-IoT', 'Inativo'),
(4, 2, 'HC-SR04-IoT', 'Inativo'),
(4, 3, 'HC-SR04-IoT', 'Inativo'),
(4, 4, 'HC-SR04-IoT', 'Inativo');

INSERT INTO leitura (idSensor, percentualPreenchimento, distanciaCm, dataHora) VALUES
(1, 88.50, 11.50, '2026-09-24 08:00:00'),
(2, 90.00, 10.00, '2026-09-24 08:00:00'),
(3, 85.00, 15.00, '2026-09-24 08:00:00'),
(4, 87.20, 12.80, '2026-09-24 08:00:00'),
(5, 45.00, 55.00, '2026-09-24 08:15:00'),
(6, 48.00, 52.00, '2026-09-24 08:15:00'),
(7, 50.00, 50.00, '2026-09-24 08:15:00'),
(8, 46.50, 53.50, '2026-09-24 08:15:00');

INSERT INTO coleta (idCompartimento, caminhao, dataHora, percentualAntes, observacao) VALUES
(1, 'NPV-1020', '2026-09-24 09:30:00', 90.00, 'Coleta emergencial devido ao alto nível de preenchimento'),
(2, 'NPV-1020', '2026-09-23 16:00:00', 82.00, 'Coleta preventiva realizada na rota da tarde');



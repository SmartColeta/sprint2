-- Usuários do MySQL usados pelas aplicações.
-- Rode DEPOIS do tabelas_smartcoleta.sql, conectado como root (na VM: sudo mysql).
--
-- O host '%' aceita conexões de qualquer máquina. É necessário porque o site e a
-- API dat-acqu-ino rodam no Windows e chegam ao MySQL da VM pela porta 3307
-- redirecionada; para o MySQL, essas conexões não vêm de 'localhost'.

-- Site (web-data-viz): login e cadastro
CREATE USER IF NOT EXISTS 'user_data'@'%' IDENTIFIED BY 'smartcoleta2026';
GRANT SELECT, INSERT ON smartcoleta.usuario TO 'user_data'@'%';
GRANT SELECT ON smartcoleta.prefeitura TO 'user_data'@'%';

-- API do Arduino (dat-acqu-ino): grava as leituras dos sensores
CREATE USER IF NOT EXISTS 'user_insert'@'%' IDENTIFIED BY 'Smartcoleta2026#';
GRANT INSERT ON smartcoleta.leitura TO 'user_insert'@'%';

FLUSH PRIVILEGES;

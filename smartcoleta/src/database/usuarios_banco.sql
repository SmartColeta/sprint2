-- Usuários do MySQL usados pelas aplicações.
-- Rode DEPOIS do tabelas_smartcoleta.sql, conectado como root (na VM: mysql -u root -p).
--
-- O host '%' aceita conexões de qualquer máquina. É necessário porque o site e a
-- API dat-acqu-ino rodam no Windows e chegam ao MySQL da VM pela porta 3307
-- redirecionada; para o MySQL, essas conexões não vêm de 'localhost'.

-- O CREATE USER IF NOT EXISTS não mexe num usuário que já existe; por isso o
-- ALTER USER logo depois garante a senha, mesmo que o usuário tenha sido criado
-- antes com outra senha.

-- Site (web-data-viz): consulta todas as tabelas (login e dashboard), grava
-- novos usuários (cadastro) e registra coletas (coleta + coleta_compartimento).
-- Continua sem UPDATE e sem DELETE.
CREATE USER IF NOT EXISTS 'user_data'@'%' IDENTIFIED BY 'Smartcoleta2026#';
ALTER USER 'user_data'@'%' IDENTIFIED BY 'Smartcoleta2026#';
GRANT SELECT ON smartcoleta.* TO 'user_data'@'%';
GRANT INSERT ON smartcoleta.usuario TO 'user_data'@'%';
GRANT INSERT ON smartcoleta.coleta TO 'user_data'@'%';
GRANT INSERT ON smartcoleta.coleta_compartimento TO 'user_data'@'%';

-- API do Arduino (dat-acqu-ino): só grava as leituras dos sensores
CREATE USER IF NOT EXISTS 'user_insert'@'%' IDENTIFIED BY 'Smartcoleta2026#';
ALTER USER 'user_insert'@'%' IDENTIFIED BY 'Smartcoleta2026#';
GRANT INSERT ON smartcoleta.leitura TO 'user_insert'@'%';

FLUSH PRIVILEGES;

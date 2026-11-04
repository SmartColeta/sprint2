var database = require("../database/config")

// Os valores entram no lugar de cada "?" (na mesma ordem da lista),
// do mesmo jeito que o INSERT da API dat-acqu-ino. Isso evita SQL injection.

function buscarPorEmail(email) {
    var instrucaoSql = `
        SELECT idUsuario FROM usuario WHERE email = ?;
    `;
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql, [email]);
}

function autenticar(email, senha) {
    console.log("ACESSEI O USUARIO MODEL \n \n\t\t >> Se aqui der erro de 'Error: connect ECONNREFUSED',\n \t\t >> verifique suas credenciais de acesso ao banco\n \t\t >> e se o servidor de seu BD está rodando corretamente. \n\n function entrar(): ", email);
    var instrucaoSql = `
        SELECT idUsuario AS id, nome, email, fkPrefeitura FROM usuario WHERE email = ? AND senha = ?;
    `;
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql, [email, senha]);
}

// O usuário entra na prefeitura dona do código de acesso.
// Se o código não existir, o SELECT não traz nada e nenhum usuário é inserido.
function cadastrar(nome, email, senha, codigoAcesso) {
    console.log("ACESSEI O USUARIO MODEL \n \n\t\t >> Se aqui der erro de 'Error: connect ECONNREFUSED',\n \t\t >> verifique suas credenciais de acesso ao banco\n \t\t >> e se o servidor de seu BD está rodando corretamente. \n\n function cadastrar():", nome, email, codigoAcesso);

    var instrucaoSql = `
        INSERT INTO usuario (nome, email, senha, fkPrefeitura)
        SELECT ?, ?, ?, idPrefeitura FROM prefeitura WHERE codigoAcesso = ?;
    `;
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql, [nome, email, senha, codigoAcesso]);
}

module.exports = {
    buscarPorEmail,
    autenticar,
    cadastrar
};

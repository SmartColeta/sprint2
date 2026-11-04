var mysql = require("mysql2");

// CONEXÃO DO BANCO MYSQL SERVER
var mySqlConfig = {
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
};

// instrucao: o SQL com "?" no lugar de cada valor
// valores: a lista com os valores, na mesma ordem dos "?"
// O execute (o mesmo da API dat-acqu-ino) manda o SQL e os valores separados
// para o MySQL, então o que o usuário digita nunca vira parte do comando
// (proteção contra SQL injection).
function executar(instrucao, valores) {

    if (process.env.AMBIENTE_PROCESSO !== "producao" && process.env.AMBIENTE_PROCESSO !== "desenvolvimento") {
        console.log("\nO AMBIENTE (produção OU desenvolvimento) NÃO FOI DEFINIDO EM .env OU dev.env OU app.js\n");
        return Promise.reject("AMBIENTE NÃO CONFIGURADO EM .env");
    }

    if (valores == undefined) {
        valores = [];
    }

    return new Promise(function (resolve, reject) {
        var conexao = mysql.createConnection(mySqlConfig);
        conexao.connect();
        conexao.execute(instrucao, valores, function (erro, resultados) {
            conexao.end();
            if (erro) {
                reject(erro);
                return;
            }
            console.log(resultados);
            resolve(resultados);
        });
        conexao.on('error', function (erro) {
            return ("ERRO NO MySQL SERVER: ", erro.sqlMessage);
        });
    });
}

module.exports = {
    executar
};
var database = require("../database/config");

function buscarUltimasMedidas(idAquario, limite_linhas) {

    var instrucaoSql = `SELECT 
                        temperatura,
                        momento,
                        DATE_FORMAT(momento,'%H:%i:%s') as momento_grafico
                    FROM medida
                    WHERE fk_aquario = ?
                    ORDER BY id DESC LIMIT ${limite_linhas}`; // limite_linhas vem do controller (7), não do usuário

    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql, [idAquario]);
}

function buscarMedidasEmTempoReal(idAquario) {

    var instrucaoSql = `SELECT 
                        temperatura,
                        DATE_FORMAT(momento,'%H:%i:%s') as momento_grafico, 
                        fk_aquario 
                        FROM medida WHERE fk_aquario = ? 
                    ORDER BY id DESC LIMIT 1`;

    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql, [idAquario]);
}

module.exports = {
    buscarUltimasMedidas,
    buscarMedidasEmTempoReal
}

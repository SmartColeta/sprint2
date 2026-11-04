var database = require("../database/config");

function buscarAquariosPorEmpresa(empresaId) {

  var instrucaoSql = `SELECT * FROM aquario a WHERE fk_empresa = ?`;

  console.log("Executando a instrução SQL: \n" + instrucaoSql);
  return database.executar(instrucaoSql, [empresaId]);
}

function cadastrar(empresaId, descricao) {
  
  var instrucaoSql = `INSERT INTO aquario (descricao, fk_empresa) VALUES (?, ?)`;

  console.log("Executando a instrução SQL: \n" + instrucaoSql);
  return database.executar(instrucaoSql, [descricao, empresaId]);
}


module.exports = {
  buscarAquariosPorEmpresa,
  cadastrar
}

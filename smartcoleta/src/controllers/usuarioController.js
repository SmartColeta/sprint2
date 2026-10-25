var usuarioModel = require("../models/usuarioModel");
var aquarioModel = require("../models/aquarioModel");

function autenticar(req, res) {
  var email = req.body.emailServer;
  var senha = req.body.senhaServer;

  if (email == undefined) {
    res.status(400).send("Seu email está undefined!");
  } else if (senha == undefined) {
    res.status(400).send("Sua senha está indefinida!");
  } else {
    // NOVO: primeiro confere se o e-mail está cadastrado
    usuarioModel
      .buscarPorEmail(email)
      .then(function (resultadoEmail) {
        if (resultadoEmail.length == 0) {
          res.status(404).send("E-mail não cadastrado");
          return;
        }
        usuarioModel
          .autenticar(email, senha)
          .then(function (resultadoAutenticar) {
            console.log(`\nResultados encontrados: ${resultadoAutenticar.length}`);
            console.log(`Resultados: ${JSON.stringify(resultadoAutenticar)}`); // transforma JSON em String

            if (resultadoAutenticar.length == 1) {
              console.log(resultadoAutenticar);

              res.json({
                id: resultadoAutenticar[0].id,
                email: resultadoAutenticar[0].email,
                nome: resultadoAutenticar[0].nome,
                senha: resultadoAutenticar[0].senha,
              });

              // sprint3: FUNÇÃO AUTENTICAR QUE BUSCA A EMPRESA VINCULADA AO AQUARIO PARA FAZER LOGIN
              // aquarioModel.buscarAquariosPorEmpresa(resultadoAutenticar[0].empresaId)
              //     .then((resultadoAquarios) => {
              //         if (resultadoAquarios.length > 0) {
              //             res.json({
              //                 id: resultadoAutenticar[0].id,
              //                 email: resultadoAutenticar[0].email,
              //                 nome: resultadoAutenticar[0].nome,
              //                 senha: resultadoAutenticar[0].senha,
              //                 aquarios: resultadoAquarios
              //             });
              //         } else {
              //             res.status(204).json({ aquarios: [] });
              //         }
              //     })
            } else if (resultadoAutenticar.length == 0) {
              res.status(403).send("Email e/ou senha inválido(s)");
            } else {
              res.status(403).send("Mais de um usuário com o mesmo login e senha!");
            }
          })
          .catch(function (erro) {
            console.log(erro);
            console.log(
              "\nHouve um erro ao realizar o login! Erro: ",
              erro.sqlMessage,
            );
            res.status(500).json(erro.sqlMessage);
          });
      })
      .catch(function (erro) {
        console.log(erro);
        res.status(500).json(erro.sqlMessage);
      });
  }
}

//Função que confere se a senha é forte
function senhaForte(senha) {
  var temMaiuscula = false;
  var temMinuscula = false;
  var temNumero = false;
  var temEspecial = false;
  var especiais = "!@#$%&*()-_=+[]{};:,.<>?/|~";

  for (var i = 0; i < senha.length; i++) {
    var letra = senha[i];

    if (letra >= 'A' && letra <= 'Z') {
      temMaiuscula = true;
    } else if (letra >= 'a' && letra <= 'z') {
      temMinuscula = true;
    } else if (letra >= '0' && letra <= '9') {
      temNumero = true;
    } else if (especiais.includes(letra)) {
      temEspecial = true;
    }
  }

  return senha.length >= 8 && temMaiuscula && temMinuscula && temNumero && temEspecial;
}

function cadastrar(req, res) {
  var nome = req.body.nomeServer;
  var email = req.body.emailServer;
  var senha = req.body.senhaServer;

  if (nome == undefined) {
    res.status(400).send("Seu nome está undefined!");
  } else if (email == undefined) {
    res.status(400).send("Seu email está undefined!");
  } else if (senha == undefined) {
    res.status(400).send("Sua senha está undefined!");
  } else if (!senhaForte(senha)) {
    res.status(400).send("A senha deve ter no mínimo 8 caracteres, com letras maiúsculas e minúsculas, números e caracteres especiais.");
  } else {
    usuarioModel
      .cadastrar(nome, email, senha)
      .then(function (resultado) {
        res.json(resultado);
      })
      .catch(function (erro) {
        console.log(erro);
        console.log(
          "\nHouve um erro ao realizar o cadastro! Erro: ",
          erro.sqlMessage,
        );
        res.status(500).json(erro.sqlMessage);
      });
  }
}

module.exports = {
  autenticar,
  cadastrar,
};
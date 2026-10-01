const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const fs = require("fs");
const path = require("path");

const app = express();

// conexão com o MySQL
const banco = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "080508Leo$",
    database: "smart_coleta1"
});

// lê os dados enviados pelos formulários
app.use(express.urlencoded({ extended: false }));

// guarda quem está logado
app.use(session({
    secret: "troque-esta-frase-por-outra",
    resave: false,
    saveUninitialized: false
}));

// libera os arquivos da pasta public (html, css, js, logo)
app.use(express.static(path.join(__dirname, "public"), { index: "index.html" }));


// CADASTRO
app.post("/cadastrar", function (req, res) {

    var nome = req.body.nome.trim();
    var email = req.body.email.trim();
    var senha = req.body.senha;
    var tipo = req.body.tipo;

    // confere se veio tudo
    if (nome == "" || email == "" || senha.length < 6 || (tipo != "usuario" && tipo != "administrador")) {
        return res.redirect("/index.html?msg=erro");
    }

    // confere se o e-mail já existe
    banco.query("SELECT id FROM usuarios WHERE email = ?", [email], function (erro, resultado) {

        if (erro) {
            console.log(erro);
            return res.redirect("/index.html?msg=erro");
        }

        if (resultado.length > 0) {
            return res.redirect("/index.html?msg=emailexiste");
        }

        // guarda a senha criptografada, nunca em texto puro
        var senhaCriptografada = bcrypt.hashSync(senha, 10);

        banco.query(
            "INSERT INTO usuarios (nome, email, senha, tipo) VALUES (?, ?, ?, ?)",
            [nome, email, senhaCriptografada, tipo],
            function (erro2) {

                if (erro2) {
                    console.log(erro2);
                    return res.redirect("/index.html?msg=erro");
                }

                res.redirect("/index.html?msg=cadastrado");
            }
        );
    });
});


// LOGIN
app.post("/entrar", function (req, res) {

    var email = req.body.email.trim();
    var senha = req.body.senha;

    banco.query("SELECT id, nome, senha, tipo FROM usuarios WHERE email = ?", [email], function (erro, resultado) {

        if (erro) {
            console.log(erro);
            return res.redirect("/index.html?msg=erro");
        }

        var usuario = resultado[0];

        // confere se achou o usuário e se a senha bate
        if (usuario && bcrypt.compareSync(senha, usuario.senha)) {

            req.session.usuarioId = usuario.id;
            req.session.nome = usuario.nome;
            req.session.tipo = usuario.tipo;

            res.redirect("/painel");

        } else {

            res.redirect("/index.html?msg=invalido");

        }
    });
});


// PAINEL (só abre se estiver logado)
app.get("/painel", function (req, res) {

    if (!req.session.nome) {
        return res.redirect("/index.html");
    }

    var pagina = fs.readFileSync(path.join(__dirname, "public", "painel.html"), "utf8");

    // troca {{nome}} e {{tipo}} pelos dados do usuário
    pagina = pagina.replace("{{nome}}", req.session.nome);
    pagina = pagina.replace("{{tipo}}", req.session.tipo);

    res.send(pagina);
});


// SAIR
app.get("/sair", function (req, res) {

    req.session.destroy();

    res.redirect("/index.html");
});


app.listen(3000, function () {
    console.log("Servidor rodando em http://localhost:3000");
});
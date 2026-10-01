// mostra a tela de login
function mostrarLogin() {

    login.hidden = false;
    cadastro.hidden = true;

    loginTab.setAttribute("aria-selected", "true");
    cadastroTab.setAttribute("aria-selected", "false");
}


// mostra a tela de cadastro
function mostrarCadastro() {

    login.hidden = true;
    cadastro.hidden = false;

    loginTab.setAttribute("aria-selected", "false");
    cadastroTab.setAttribute("aria-selected", "true");
}


// mostra ou esconde a senha
function mostrarSenha(campo, botao) {

    if (campo.type == "password") {

        campo.type = "text";
        botao.innerText = "Ocultar";

    } else {

        campo.type = "password";
        botao.innerText = "Mostrar";

    }
}


// lê a mensagem que o servidor mandou na URL
var dados = new URLSearchParams(location.search);
var msg = dados.get("msg");

if (msg == "cadastrado") {

    mensagem.hidden = false;
    mensagem.innerText = "Conta criada com sucesso! Agora é só entrar.";

}

if (msg == "emailexiste") {

    mensagem.hidden = false;
    mensagem.className = "ok erro";
    mensagem.innerText = "Esse e-mail já está cadastrado.";
    mostrarCadastro();

}

if (msg == "invalido") {

    mensagem.hidden = false;
    mensagem.className = "ok erro";
    mensagem.innerText = "E-mail ou senha incorretos.";

}

if (msg == "erro") {

    mensagem.hidden = false;
    mensagem.className = "ok erro";
    mensagem.innerText = "Preencha todos os campos corretamente.";

}
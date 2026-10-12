<<<<<<< HEAD
<img src="https://user-images.githubusercontent.com/46379117/192358781-9ca879e4-e55e-4d0d-b876-f9a4a2ed9ae8.png" width="600px">

_Web Data Visualization = Visualização de Dados na Web_

_Implementação de Referência para o seu Projeto de Primeiro Semestre_

<hr>

# Como usar

1. Clone este repositório em sua máquina.


1. Crie, no Banco de Dados, as tabelas necessárias para o funcionamento deste projeto.
- Siga as instruções no arquivo **/src/database/script-tabelas.sql**


3. Acesse o arquivo **app.js** e parametrize o ambiente.
- Se você estiver utilizando o Ambiente de Produção (remoto), comente a linha 2 e deixe habilitada a linha 1 onde está o valor **var ambiente_processo = 'producao';**
- Se você estiver utilizando o Ambiente de Desenvolvimento (local), comente a linha 1 e deixe habilitada a linha 2 onde está o valor **var ambiente_processo = 'desenvolvimento';**

4. Adicione as credenciais de Banco de Dados no arquivo **.env** ou em **.env.dev**, seguindo as instruções neste.

5. Acesse este repositório no seu terminal (GitBash ou VSCode) e execute os comandos abaixo:

```
npm i
``` 
_O comando acima irá instalar as bibliotecas necessárias para o funcionamento do projeto. As bibliotecas a serem instaladas estão listadas no arquivo **package.json** então é muito importante que este não seja alterado. Será criada uma nova pasta/diretório chamado **node_modules** quando o comando for finalizado, que é onde as bibliotecas estão localizadas. Não altere a pasta/diretório._

```
npm start
``` 

_O comando acima irá iniciar seu projeto e efetuar os comandos de acordo com a sua parametrização feita nos passos anteriores._

6. Para "ver" seu projeto funcionando, acesse em seu navegador o caminho **informado no terminal**.

7. Caso queira parar a execução, tecle **CTRL+C** no terminal em que o projeto está rodando.

## Adicionar novo recurso ao projeto

**"Recurso? O que é?"** Enquanto no Banco de Dados chamamos as tabelas de "entidades", quando tratamos de desenvolvimento WEB usamos a palavra "recurso" para se referir a algo que podemos criar, ler, atualizar ou deletar [1]. Estas ações são conhecidas como CRUD: Create, Read, Update e Delete. Para acessar cada ação, usamos os métodos HTTP: POST, GET, PUT e DELETE [2]. (Há outros verbos, porém com estes já conseguimos efetuar CRUDs). 

**Tabela para ajudar a fazer a associação**

<table>
  <tr>
    <th>C.R.U.D</th>
    <th>Ação</th>
    <th>Tradução</th>
    <th>Verbo HTTP *</th>
    <th>Comando BD</th>
  </tr>
  <tr>
    <td>C</td>
    <td>Create</td>
    <td>Criar</td>
    <td>POST</td>
    <td>INSERT</td>
  </tr>
  <tr>
    <td>R</td>
    <td>Read</td>
    <td>Ler</td>
    <td>GET</td>
    <td>SELECT</td>
  </tr>
  <tr>
    <td>U</td>
    <td>Update</td>
    <td>Atualizar</td>
    <td>PUT</td>
    <td>UPDATE</td>
  </tr>
  <tr>
    <td>D</td>
    <td>Delete</td>
    <td>Deletar</td>
    <td>DELETE</td>
    <td>DELETE</td>
  </tr>
</table>

_* Você verá o verbo HTTP sendo apontado nos arquivos em /routes_

**"E no meu projeto, o que seria um recurso?"** Em web-data-viz manipulamos os recursos **usuário**, **aviso** e **medida**. Podemos conferir isso vendo para quais entidades foram criados os caminhos de inserção e captura de dados, que envolve os diretórios **routes**, **controllers** e **models**.

Abaixo, uma figura que ajuda a compreender o caminho percorrido para, por exemplo, efetuar o cadastro de um usuário:


![image](https://github.com/user-attachments/assets/d576f178-0da6-437e-b5c9-658e3ebaf6ca)



**Entendi o que é um recurso e gostaria de adicionar um novo ao meu projeto! Como faz?**  
- Primeiro, crie a tabela no Banco de Dados referente a este recurso. Exemplos de recursos comuns de serem adicionados ao projeto no primeiro semestre: Silo, Aquário, Sala, Andar, Endereço, Mercado, Prateleira, Unidade, Carro, Caminhão...  
- Assim que criada a tabela, faça todo o caminho de **front-end → routes → controllers → models** replicando o que já existe!  
- Exemplo, se você quiser a funcionalidade de adicionar um novo Aquário, deve criar arquivos referentes ao aquario nos diretórios e replicar também as funções.  
- Dica: A implementação de AVISO já contém o CRUD completo! :wink:
 
### Fontes bibliográficas

[1] https://datatracker.ietf.org/doc/html/rfc2396  
[2] https://datatracker.ietf.org/doc/html/rfc7231
=======
<div align="center">

<img src="./assets/banner-oficial.png" width="">

![Status](https://img.shields.io/badge/status-em%20desenvolvimento-yellow)
![Projeto](https://img.shields.io/badge/projeto-acadêmico-blue)
![SPTech](https://img.shields.io/badge/SPTech-1ADSA-red)

</div>

---

## 📑 Sumário

- [Sobre](#-sobre)
- [O Problema](#-o-problema)
- [Nossa Solução](#-nossa-solução)
- [Funcionalidades](#-funcionalidades)
- [Tecnologias Utilizadas](#-tecnologias-utilizadas)
- [Equipe](#-equipe)
- [Entregáveis](#-entregáveis)
- [Contexto Acadêmico](#-contexto-acadêmico)

---

## 📌 Sobre o projeto

O **SmartColeta** é uma solução desenvolvida para auxiliar pequenos municípios
no monitoramento de lixeiras e na otimização do processo de coleta de resíduos.

Por meio de sensores instalados nas lixeiras, o sistema monitora o nível de
preenchimento e disponibiliza essas informações para a prefeitura, permitindo
uma tomada de decisão baseada em dados.

O objetivo é contribuir para uma coleta mais eficiente, reduzindo deslocamentos
desnecessários e melhorando o planejamento das rotas de coleta.

---

## 🗑️ O problema

Em pequenos municípios, a coleta de resíduos pode ocorrer seguindo rotas e
horários previamente definidos, sem informações em tempo real sobre a
necessidade de esvaziamento das lixeiras.

Isso pode resultar em situações como:

- 🚛 Deslocamentos desnecessários dos caminhões;
- ⛽ Consumo desnecessário de combustível;
- 🗑️ Lixeiras atingindo sua capacidade antes da coleta;
- 📊 Falta de dados para auxiliar no planejamento da operação.

---

## 💡 Nossa solução

O **SmartColeta** utiliza tecnologia para monitorar o nível das lixeiras e
transformar essas informações em dados úteis para a gestão municipal.

Quando uma lixeira atingir determinado nível de preenchimento, o sistema poderá
emitir um alerta, permitindo que a prefeitura identifique quais pontos
necessitam de coleta.

<img width="1306" height="1036" alt="image" src="https://github.com/user-attachments/assets/2f5f2bbd-790b-432b-b6ae-2d00472bdb12" />

---

## ⚙️ Funcionalidades

- 📡 Monitoramento do nível das lixeiras;
- 🚨 Alertas de capacidade;
- 📊 Visualização dos dados coletados;
- 🗺️ Identificação dos pontos monitorados;
- 📈 Apoio ao planejamento da coleta de resíduos.

> Algumas funcionalidades ainda estão em desenvolvimento.

---

## 🛠️ Tecnologias utilizadas

<div align="center">

![HTML](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?logo=mysql&logoColor=white)
![Arduino](https://img.shields.io/badge/Arduino-00878F?logo=arduino&logoColor=white)

</div>

## 👥 Equipe

| # | Nome | RA | GitHub |
|:-:|------|----|--------|
| 1 | Davi Borges Taioque | 01262115 | @daviborges011 (https://github.com/daviborges011) |
| 2 | Fernando Mateus Santos | 01262001 | @FerKaGe (https://github.com/FerKaGe) |
| 3 | Leonardo Vieira Linge | 01262109 | @LeonardoVieiraLinge (https://github.com/LeonardoVieiraLinge) |
| 4 | Marcos Vinicius Miguel Ferreira | 01262089 | @MarcosVMFe (https://github.com/MarcosVMFe) |
| 5 | Paulo Vinicius Paulino de Araujo | 01262008 | @paulovpa (https://github.com/paulovpa) |
| 6 | Viviane Meira Marques | 01262064 | @viviane-marques (https://github.com/viviane-marques) |

---

## ✅ Entregáveis
| # | Entregável | Matéria | Progresso |
|:-:|------------|---------|-----------|
| 1 | Projeto atualizado no GitHub | Pesquisa e Inovação | `▰▰▰▰▰▰▰▰▰▰ 100%` |
| 2 | Documentação do Projeto atualizada | Pesquisa e Inovação | `▰▰▰▰▰▰▰▰▰▰ 100%` |
| 3 | Planilha de Riscos do Projeto | Pesquisa e Inovação | `▰▰▰▰▰▰▰▰▰▰ 100%` |
| 4 | Especificação da Dashboard | Pesquisa e Inovação | `▱▱▱▱▱▱▱▱▱▱ 0%` |
| - |------------|---------|-----------|
| 1 | Site Estático Institucional | Algoritmos | `▱▱▱▱▱▱▱▱▱▱ 0%` |
| 2 | Site Estático Dashboard | Algoritmos | `▱▱▱▱▱▱▱▱▱▱ 0%` |
| 3 | Site Estático Cadastro e Login | Algoritmos | `▱▱▱▱▱▱▱▱▱▱ 0%` |
| - |------------|---------|-----------|
| 1 | Diagrama de Solução (Arquitetura Técnica do Projeto) | Tecnologia da Informação | `▱▱▱▱▱▱▱▱▱▱ 0%` |
| 2 | Atividades organizadas na ferramenta de Gestão | Tecnologia da Informação | `▰▰▰▰▰▰▰▰▰▰ 100%` |
| 3 | Backlog da Sprint | Tecnologia da Informação | `▰▰▰▰▰▰▰▰▰▰ 100%` |
| - |------------|---------|-----------|
| 1 | Modelagem lógica do Projeto v1 | Banco de Dados | `▰▰▰▰▰▰▰▰▰▰ 100%` |
| 2 | Script de criação do banco | Banco de Dados | `▰▰▰▰▰▰▰▰▰▰ 100%` |
| 3 | Tabelas criadas em BD local | Banco de Dados | `▰▰▰▰▰▰▰▰▰▰ 100%` |
| - |------------|---------|-----------|
| 1 | Teste com Sensor do Projeto + Gráficos | Arquitetura Computacional | `▰▰▰▰▰▰▰▰▰▰ 100%` |
| 2 | Usar API Local/Sensor | Arquitetura Computacional | `▰▰▰▰▰▰▰▰▰▰ 100%` |
| - |------------|---------|-----------|
| 1 | Instalar MySQL no servidor de dados da solução (VMLinux) | Introdução a Sistemas Operacionais | `▱▱▱▱▱▱▱▱▱▱ 0%` |
| 2 | Inserção de dados do Arduino no MySQL (VMLinux) | Introdução a Sistemas Operacionais | `▱▱▱▱▱▱▱▱▱▱ 0%` |
| 3 | Validar solução técnica + Diagrama da Solução (Validado) | Introdução a Sistemas Operacionais | `▱▱▱▱▱▱▱▱▱▱ 0%` |

## 🎓 Contexto acadêmico

Projeto desenvolvido por estudantes de **Análise e Desenvolvimento de Sistemas
da São Paulo Tech School (SPTech)** como parte do Projeto de Pesquisa e Inovação.

###  🔗 Links Interessantes:
- Documentação do Projeto: https://sl1nk.com/documento-smartcoleta
- Trello do Projeto: https://trello.com/b/3E94k3tl/smartcoleta

---

<div align="center">

### ♻️ SmartColeta

**Inteligência que transforma dados em uma coleta mais eficiente.**

</div>
>>>>>>> d6df0cca88cf555e9c3b545473b74e71d5a9827d

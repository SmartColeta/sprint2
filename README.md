# Sistema de Monitoramento Inteligente de Lixeiras em Pequenas Prefeituras

## Sobre o Projeto

Este repositório contém o código-fonte e a documentação técnica de um protótipo de Internet das Coisas (IoT) focado no monitoramento em tempo real do volume de compartimentos de resíduos sólidos de lixeiras e caçambas públicas em prefeituras de municípios de pequeno porte.

A solução realiza a leitura volumétrica por meio do sensor ultrassônico HC-SR04 conectado a um microcontrolador, envia as informações para um banco de dados relacional e apresenta o nível de ocupação de cada ponto de coleta em uma interface web interativa, com gráficos e alertas por nível de urgência — permitindo à gestão pública substituir rotas fixas de coleta por rotas orientadas pela demanda real.

## Estrutura do Repositório
├── arduino/        # Código C/C++ (.ino) para o microcontrolador e sensor HC-SR04
├── backend/        # Tratamento dos dados com MySQL
├── frontend/       # Painel web (HTML, CSS, JavaScript) com gráficos de monitoramento
└── documentacao/   # Documentos do projeto (contexto, escopo, premissas e restrições)

## Tecnologias Utilizadas
* **Hardware:** Microcontrolador Arduino e Sensor Ultrassônico de Distância HC-SR04.
* **Backend**: Banco de Dados MySQL, VM Linux.
* **Frontend**: HTML5, CSS3, JavaScript.

## Funcionalidades do Protótipo
1. **Coleta de Dados:** Leitura contínua da distância entre o sensor e o nível de resíduos acumulados, convertida em percentual de preenchimento do compartimento.
2. **Classificação por Urgência:** Categorização automática do status de cada compartimento (ex.: baixo, médio, crítico) com base no volume captado pelos sensores.
3. **Persistência de Dados:** Registro histórico das leituras no MySQL, com marcação de data e hora por ponto de coleta.
4. **Painel Web:** Visualização em tempo real do nível de ocupação de cada compartimento cadastrado, com gráficos de variação e indicadores de urgência de coleta.

## Instituição
São Paulo Tech School
Curso de Tecnologia da Informação / Análise e Desenvolvimento de Sistemas

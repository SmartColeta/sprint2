// importa os bibliotecas necessários
const serialport = require('serialport');
const express = require('express');
const mysql = require('mysql2');

// constantes para configurações
const SERIAL_BAUD_RATE = 9600;
const SERVIDOR_PORTA = 3300;

// habilita ou desabilita a inserção de dados no banco de dados
const HABILITAR_OPERACAO_INSERIR = true;

// habilita ou desabilita o modo simulado
// true: gera dados falsos, sem precisar do Arduino (modo treino)
// false: lê os dados reais do Arduino pela porta serial
const HABILITAR_SENSORES_SIMULADOS = true;

// função para comunicação serial
const serial = async (
    valoresSensorDistancia
) => {

    // conexão com o banco de dados MySQL
    let poolBancoDados = mysql.createPool(
        {
            host: 'localhost',
            user: 'user_insert',
            password: 'Smartcoleta2026#',
            database: 'smartcoleta',
            port: 3306
        }
    ).promise();

    // trata uma linha no formato "digital;analogico", vinda do Arduino ou do simulador
    const tratarLinha = async (data) => {
        console.log(data);
        const valores = data.split(';');
        const sensorDistancia = parseInt(valores[1]);
        
        const sensorCompartimento_2 = sensorDistancia + 10;
        const sensorCompartimento_3 = sensorDistancia + 30;

        // armazena os valores dos sensores nos arrays correspondentes
        valoresSensorDistancia.push(sensorDistancia);

        // insere os dados no banco de dados (se habilitado)/
        if (HABILITAR_OPERACAO_INSERIR) {

            // este insert irá inserir os dados na tabela "leitura"
            await poolBancoDados.execute(
                'INSERT INTO leitura (distanciaCm, fkSensor) VALUES (?, ?)',
                [sensorDistancia, null],
            );
            await poolBancoDados.execute(
                'INSERT INTO leitura (distanciaCm, fkSensor) VALUES (?, ?)',
                [sensorCompartimento_2, null],

            );
            await poolBancoDados.execute(
                'INSERT INTO leitura (distanciaCm, fkSensor) VALUES (?, ?)',
                [sensorCompartimento_3, null],
            );

            function classificarDistancia(distancia) {
                // Compartimento 1
                if( distancia >= 0 && distancia <70) {
                    console.log("Compartimento 1 | ", sensorDistancia, "cm | normal");

                } else if ((distancia >= 70 && distancia <90) || (distancia > 27 && distancia <=32)) {
                    console.log("Compartimento 1 | ", sensorDistancia, "cm | atencao");

                } else if (distancia >=90) {
                    console.log("Compartimento 1 | ", sensorDistancia, "cm | crítico");
                }

                // Compartimento 2
                if( sensorCompartimento_2 >= 0 && sensorCompartimento_2 <70) {
                    console.log("Compartimento 2 | ", sensorCompartimento_2, "cm | normal");

                } else if ((sensorCompartimento_2 >= 70 && sensorCompartimento_2 <90) || (sensorCompartimento_2 > 27 && sensorCompartimento_2 <=32)) {
                    console.log("Compartimento 2 | ", sensorCompartimento_2, "cm | atencao");

                } else if (sensorCompartimento_2 >= 90) {
                    console.log("Compartimento 2 | ", sensorCompartimento_2, "cm | crítico");
                }

                // Compartimento 3
                if( sensorCompartimento_3 >= 0 && sensorCompartimento_3 <70) {
                    console.log("Compartimento 3 | ", sensorCompartimento_3, "cm | normal");

                } else if ((sensorCompartimento_3 >= 70 && sensorCompartimento_3 <90) || (sensorCompartimento_3 > 27 && sensorCompartimento_3 <=32)) {
                    console.log("Compartimento 3 | ", sensorCompartimento_3, "cm | atencao");

                } else if (sensorCompartimento_3 >=90) {
                    console.log("Compartimento 3 | ", sensorCompartimento_3, "cm | crítico");
                }
            }

            classificarDistancia(sensorDistancia, sensorCompartimento_2, sensorCompartimento_3);





            // TODO (Etapa 3): escreva aqui o INSERT na tabela "leitura"
            // use poolBancoDados.execute(...) com "?" para os valores
            // lembre: o campo "momento" é preenchido pelo banco, não pelo main.js

        }
    };

    // modo simulado: gera uma linha por segundo, no mesmo formato que o Arduino envia
    if (HABILITAR_SENSORES_SIMULADOS) {
        console.log('*** MODO SIMULADO: os dados são falsos, o Arduino NÃO está sendo lido ***');
        setInterval(() => {
            const digital = Math.round(Math.random());              // 0 ou 1
            const analogico = (60 + Math.random() * 4).toFixed(0);  // 18.00 a 21.99
            tratarLinha(`${digital};${analogico}`);
        }, 1000);
        return;
    }

    // lista as portas seriais disponíveis e procura pelo Arduino
    const portas = await serialport.SerialPort.list();
    const portaArduino = portas.find((porta) => porta.vendorId == 2341 && porta.productId == 43);
    if (!portaArduino) {
        throw new Error('O arduino não foi encontrado em nenhuma porta serial');
    }

    // configura a porta serial com o baud rate especificado
    const arduino = new serialport.SerialPort(
        {
            path: portaArduino.path,
            baudRate: SERIAL_BAUD_RATE
        }
    );

    // evento quando a porta serial é aberta
    arduino.on('open', () => {
        console.log(`A leitura do arduino foi iniciada na porta ${portaArduino.path} utilizando Baud Rate de ${SERIAL_BAUD_RATE}`);
    });

    // processa os dados recebidos do Arduino
    arduino.pipe(new serialport.ReadlineParser({ delimiter: '\r\n' })).on('data', tratarLinha);

    // evento para lidar com erros na comunicação serial
    arduino.on('error', (mensagem) => {
        console.error(`Erro no arduino (Mensagem: ${mensagem}`)
    });
}

// função para criar e configurar o servidor web
const servidor = (
    valoresSensorDistancia,
    valoresTcrt5000
) => {
    const app = express();

    // configurações de requisição e resposta
    app.use((request, response, next) => {
        response.header('Access-Control-Allow-Origin', '*');
        response.header('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept');
        next();
    });

    // inicia o servidor na porta especificada
    app.listen(SERVIDOR_PORTA, () => {
        console.log(`API executada com sucesso na porta ${SERVIDOR_PORTA}`);
    });

    // define os endpoints da API para cada tipo de sensor
    app.get('/sensores/SensorDistancia', (_, response) => {
        return response.json(valoresSensorDistancia);
    });
    app.get('/sensores/tcrt5000', (_, response) => {
        return response.json(valoresTcrt5000);
    });
}

// função principal assíncrona para iniciar a comunicação serial e o servidor web
(async () => {
    // arrays para armazenar os valores dos sensores
    const valoresSensorDistancia = [];
    const valoresTcrt5000 = [];

    // inicia a comunicação serial
    await serial(
        valoresSensorDistancia,
        valoresTcrt5000
    );

    // inicia o servidor web
    servidor(
        valoresSensorDistancia,
        valoresTcrt5000
    );
})();

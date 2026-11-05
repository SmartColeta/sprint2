// importa os bibliotecas necessários
const serialport = require('serialport');
const express = require('express');
const mysql = require('mysql2');
const path = require('path');

// constantes para configurações
const SERIAL_BAUD_RATE = 9600;
const SERVIDOR_PORTA = 3300;

// habilita ou desabilita a inserção de dados no banco de dados
const HABILITAR_OPERACAO_INSERIR = true;

// SENSORES
// o sensor 1 é o HC-SR04 real ligado ao Arduino; os sensores 2 a 30 são simulados
// a partir da leitura dele. O número do sensor é o idSensor da tabela "sensor".
const QTD_SENSORES = 30;
const ID_SENSOR_REAL = 1;

// altura do compartimento (coluna alturaCm da tabela "compartimento")
const ALTURA_CM = 100;

// limites de enchimento em % (os mesmos da parametrização 1: minEsperado e maxEsperado)
const LIMITE_ATENCAO = 70;
const LIMITE_CRITICO = 90;

// quantos ciclos de leitura ficam guardados para o gráfico
const QTD_LEITURAS_GUARDADAS = 20;

// nível de enchimento em %: distância pequena = lixo perto do sensor = compartimento cheio
// (mesma conta das consultas do banco: (1 - distanciaCm / alturaCm) * 100)
function calcularNivel(distancia) {
    let nivel = (1 - distancia / ALTURA_CM) * 100;
    if (nivel < 0) nivel = 0;
    if (nivel > 100) nivel = 100;
    return Number(nivel.toFixed(1));
}

function classificarNivel(nivel) {
    if (nivel >= LIMITE_CRITICO) return 'Crítico';
    if (nivel >= LIMITE_ATENCAO) return 'Atenção';
    return 'Normal';
}

// gera a distância de um sensor simulado a partir da leitura real:
// cada sensor tem um deslocamento fixo (de -30 a +30 cm) e uma pequena variação aleatória
function simularDistancia(distanciaReal, numeroSensor) {
    const deslocamento = ((numeroSensor * 13) % 61) - 30;
    const variacao = Math.random() * 4 - 2;
    let distancia = distanciaReal + deslocamento + variacao;
    if (distancia < 0) distancia = 0;
    if (distancia > ALTURA_CM) distancia = ALTURA_CM;
    return Number(distancia.toFixed(2));
}

// função para comunicação serial
const serial = async (historico) => {

    // conexão com o banco de dados MySQL (que está na VM, porta 3307)
    let poolBancoDados = mysql.createPool(
        {
            host: 'localhost',
            user: 'user_insert',
            password: 'Smartcoleta2026#',
            database: 'smartcoleta',
            port: 3307
        }
    ).promise();

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

    // processa cada linha recebida do Arduino
    // o Arduino envia só a distância em cm, uma por linha: Serial.println(sensor.distance());
    arduino.pipe(new serialport.ReadlineParser({ delimiter: '\r\n' })).on('data', async (data) => {
        const distanciaReal = parseFloat(data);

        // o HC-SR04 mede a partir de 2 cm; 0, negativo ou texto = leitura inválida
        if (isNaN(distanciaReal) || distanciaReal <= 0) {
            console.log(`Leitura inválida ignorada: "${data}"`);
            return;
        }

        // posição 0 = sensor 1 (real), posição 1 = sensor 2, ... posição 29 = sensor 30
        const distancias = [distanciaReal];
        for (let numeroSensor = 2; numeroSensor <= QTD_SENSORES; numeroSensor++) {
            distancias.push(simularDistancia(distanciaReal, numeroSensor));
        }
        const niveis = distancias.map(calcularNivel);

        // guarda o ciclo para o gráfico, mantendo só os mais recentes
        const hora = new Date().toLocaleTimeString('pt-BR');
        historico.push({ hora, distancias, niveis });
        if (historico.length > QTD_LEITURAS_GUARDADAS) {
            historico.shift();
        }

        // resumo no console: o sensor real e os sensores fora do normal
        const emAtencao = [];
        const emCritico = [];
        niveis.forEach((nivel, posicao) => {
            const status = classificarNivel(nivel);
            if (status == 'Atenção') emAtencao.push(posicao + 1);
            if (status == 'Crítico') emCritico.push(posicao + 1);
        });
        console.log(`${hora} | sensor ${ID_SENSOR_REAL} (real): ${distanciaReal} cm, ${niveis[0]}% (${classificarNivel(niveis[0])})`
            + ` | atenção: [${emAtencao.join(', ')}] | crítico: [${emCritico.join(', ')}]`);

        // insere os dados no banco de dados (se habilitado)
        if (HABILITAR_OPERACAO_INSERIR) {
            // um único INSERT com as 30 linhas: (distancia, fkSensor), (distancia, fkSensor), ...
            // dataHora é preenchida pelo banco (DEFAULT CURRENT_TIMESTAMP) com o mesmo
            // horário para as 30. A chave primária é (fkSensor, dataHora), então não há
            // conflito entre sensores diferentes; o mesmo sensor só se repetiria se
            // chegassem duas linhas do Arduino no mesmo segundo (por isso o delay(2000)).
            const marcadores = distancias.map(() => '(?, ?)').join(', ');
            const valores = [];
            distancias.forEach((distancia, posicao) => {
                valores.push(distancia, posicao + 1);
            });

            try {
                await poolBancoDados.execute(
                    `INSERT INTO leitura (distanciaCm, fkSensor) VALUES ${marcadores}`,
                    valores
                );
            } catch (erro) {
                // sem o try/catch, um erro no banco derrubaria a API inteira
                console.error('Erro ao inserir no banco:', erro.message);
            }
        }
    });

    // evento para lidar com erros na comunicação serial
    arduino.on('error', (mensagem) => {
        console.error(`Erro no arduino (Mensagem: ${mensagem}`)
    });
}

// função para criar e configurar o servidor web
const servidor = (historico) => {
    const app = express();

    // configurações de requisição e resposta
    app.use((request, response, next) => {
        response.header('Access-Control-Allow-Origin', '*');
        response.header('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept');
        next();
    });

    // página com os gráficos em tempo real
    // (só o index.html é enviado; os outros arquivos da pasta, como este main.js
    // com a senha do banco, não ficam acessíveis pelo navegador)
    app.get('/', (_, response) => {
        response.sendFile(path.join(__dirname, 'index.html'));
    });

    // últimas leituras dos 30 sensores
    app.get('/sensores', (_, response) => {
        return response.json({
            quantidadeSensores: QTD_SENSORES,
            idSensorReal: ID_SENSOR_REAL,
            limiteAtencao: LIMITE_ATENCAO,
            limiteCritico: LIMITE_CRITICO,
            leituras: historico
        });
    });

    // inicia o servidor na porta especificada
    app.listen(SERVIDOR_PORTA, () => {
        console.log(`API executada com sucesso. Gráficos em http://localhost:${SERVIDOR_PORTA}`);
    });
}

// função principal assíncrona para iniciar a comunicação serial e o servidor web
(async () => {
    // cada item: { hora, distancias: [30 valores em cm], niveis: [30 valores em %] }
    const historico = [];

    try {
        // inicia a comunicação serial
        await serial(historico);
    } catch (erro) {
        console.error(erro.message);
        process.exit(1);
    }

    // inicia o servidor web
    servidor(historico);
})();

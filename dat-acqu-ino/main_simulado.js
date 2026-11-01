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
        const sensorCompartimento_4 = sensorDistancia + 5;
        const sensorCompartimento_5 = sensorDistancia + 10;
        const sensorCompartimento_6 = sensorDistancia + 30;
        const sensorCompartimento_7 = sensorDistancia + 5;
        const sensorCompartimento_8 = sensorDistancia + 10;
        const sensorCompartimento_9 = sensorDistancia + 30;
        const sensorCompartimento_10 = sensorDistancia + 5;
        const sensorCompartimento_11 = sensorDistancia + 10;
        const sensorCompartimento_12 = sensorDistancia + 30;
        const sensorCompartimento_13 = sensorDistancia + 5;
        const sensorCompartimento_14 = sensorDistancia + 10;
        const sensorCompartimento_15 = sensorDistancia + 30;
        const sensorCompartimento_16 = sensorDistancia + 5;
        const sensorCompartimento_17 = sensorDistancia + 10;
        const sensorCompartimento_18 = sensorDistancia + 30;
        const sensorCompartimento_19 = sensorDistancia + 5;
        const sensorCompartimento_20 = sensorDistancia + 10;
        const sensorCompartimento_21 = sensorDistancia + 30;
        const sensorCompartimento_22 = sensorDistancia + 5;
        const sensorCompartimento_23 = sensorDistancia + 10;
        const sensorCompartimento_24 = sensorDistancia + 30;
        const sensorCompartimento_25 = sensorDistancia + 5;
        const sensorCompartimento_26 = sensorDistancia + 10;
        const sensorCompartimento_27 = sensorDistancia + 30;
        const sensorCompartimento_28 = sensorDistancia + 5;
        const sensorCompartimento_29 = sensorDistancia + 10;
        const sensorCompartimento_30 = sensorDistancia + 30;


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
            await poolBancoDados.execute(
                'INSERT INTO leitura (distanciaCm, fkSensor) VALUES (?, ?)',
                [sensorCompartimento_4, null],
            );
            await poolBancoDados.execute(
                'INSERT INTO leitura (distanciaCm, fkSensor) VALUES (?, ?)',
                [sensorCompartimento_5, null],
            );
            await poolBancoDados.execute(
                'INSERT INTO leitura (distanciaCm, fkSensor) VALUES (?, ?)',
                [sensorCompartimento_6, null],
            );            
            await poolBancoDados.execute(
                'INSERT INTO leitura (distanciaCm, fkSensor) VALUES (?, ?)',
                [sensorCompartimento_7, null],
            );
            await poolBancoDados.execute(
                'INSERT INTO leitura (distanciaCm, fkSensor) VALUES (?, ?)',
                [sensorCompartimento_8, null],
            );
            await poolBancoDados.execute(
                'INSERT INTO leitura (distanciaCm, fkSensor) VALUES (?, ?)',
                [sensorCompartimento_9, null],
            );
            await poolBancoDados.execute(
                'INSERT INTO leitura (distanciaCm, fkSensor) VALUES (?, ?)',
                [sensorCompartimento_10, null],
            );
            await poolBancoDados.execute(
                'INSERT INTO leitura (distanciaCm, fkSensor) VALUES (?, ?)',
                [sensorCompartimento_11, null],
            );
            await poolBancoDados.execute(
                'INSERT INTO leitura (distanciaCm, fkSensor) VALUES (?, ?)',
                [sensorCompartimento_12, null],
            );
            await poolBancoDados.execute(
                'INSERT INTO leitura (distanciaCm, fkSensor) VALUES (?, ?)',
                [sensorCompartimento_13, null],
            );
            await poolBancoDados.execute(
                'INSERT INTO leitura (distanciaCm, fkSensor) VALUES (?, ?)',
                [sensorCompartimento_14, null],
            );
            await poolBancoDados.execute(
                'INSERT INTO leitura (distanciaCm, fkSensor) VALUES (?, ?)',
                [sensorCompartimento_15, null],
            );
            await poolBancoDados.execute(
                'INSERT INTO leitura (distanciaCm, fkSensor) VALUES (?, ?)',
                [sensorCompartimento_16, null],

            );
            await poolBancoDados.execute(
                'INSERT INTO leitura (distanciaCm, fkSensor) VALUES (?, ?)',
                [sensorCompartimento_17, null],
            );
            await poolBancoDados.execute(
                'INSERT INTO leitura (distanciaCm, fkSensor) VALUES (?, ?)',
                [sensorCompartimento_18, null],
            );
            await poolBancoDados.execute(
                'INSERT INTO leitura (distanciaCm, fkSensor) VALUES (?, ?)',
                [sensorCompartimento_19, null],
            );
            await poolBancoDados.execute(
                'INSERT INTO leitura (distanciaCm, fkSensor) VALUES (?, ?)',
                [sensorCompartimento_20, null],
            );            
            await poolBancoDados.execute(
                'INSERT INTO leitura (distanciaCm, fkSensor) VALUES (?, ?)',
                [sensorCompartimento_21, null],
            );
            await poolBancoDados.execute(
                'INSERT INTO leitura (distanciaCm, fkSensor) VALUES (?, ?)',
                [sensorCompartimento_22, null],
            );
            await poolBancoDados.execute(
                'INSERT INTO leitura (distanciaCm, fkSensor) VALUES (?, ?)',
                [sensorCompartimento_23, null],
            );
            await poolBancoDados.execute(
                'INSERT INTO leitura (distanciaCm, fkSensor) VALUES (?, ?)',
                [sensorCompartimento_24, null],
            );
            await poolBancoDados.execute(
                'INSERT INTO leitura (distanciaCm, fkSensor) VALUES (?, ?)',
                [sensorCompartimento_25, null],
            );
            await poolBancoDados.execute(
                'INSERT INTO leitura (distanciaCm, fkSensor) VALUES (?, ?)',
                [sensorCompartimento_26, null],
            );
            await poolBancoDados.execute(
                'INSERT INTO leitura (distanciaCm, fkSensor) VALUES (?, ?)',
                [sensorCompartimento_27, null],
            );
            await poolBancoDados.execute(
                'INSERT INTO leitura (distanciaCm, fkSensor) VALUES (?, ?)',
                [sensorCompartimento_28, null],
            );
            await poolBancoDados.execute(
                'INSERT INTO leitura (distanciaCm, fkSensor) VALUES (?, ?)',
                [sensorCompartimento_29, null],
            );
            await poolBancoDados.execute(
                'INSERT INTO leitura (distanciaCm, fkSensor) VALUES (?, ?)',
                [sensorCompartimento_30, null],
            );





function classificarDistancia(
    sensorDistancia,
    sensorCompartimento_2, sensorCompartimento_3, sensorCompartimento_4, sensorCompartimento_5,
    sensorCompartimento_6, sensorCompartimento_7, sensorCompartimento_8, sensorCompartimento_9,
    sensorCompartimento_10, sensorCompartimento_11, sensorCompartimento_12, sensorCompartimento_13,
    sensorCompartimento_14, sensorCompartimento_15, sensorCompartimento_16, sensorCompartimento_17,
    sensorCompartimento_18, sensorCompartimento_19, sensorCompartimento_20, sensorCompartimento_21,
    sensorCompartimento_22, sensorCompartimento_23, sensorCompartimento_24, sensorCompartimento_25,
    sensorCompartimento_26, sensorCompartimento_27, sensorCompartimento_28, sensorCompartimento_29,
    sensorCompartimento_30
) {
    // Compartimento 1
    if (sensorDistancia >= 0 && sensorDistancia < 70) {
        console.log("Compartimento 1 | ", sensorDistancia, "cm | normal");
 
    } else if ((sensorDistancia >= 70 && sensorDistancia < 90) || (sensorDistancia > 27 && sensorDistancia <= 32)) {
        console.log("Compartimento 1 | ", sensorDistancia, "cm | atencao");
 
    } else if (sensorDistancia >= 90) {
        console.log("Compartimento 1 | ", sensorDistancia, "cm | crítico");
    }
 
    // Compartimento 2
    if (sensorCompartimento_2 >= 0 && sensorCompartimento_2 < 70) {
        console.log("Compartimento 2 | ", sensorCompartimento_2, "cm | normal");
 
    } else if ((sensorCompartimento_2 >= 70 && sensorCompartimento_2 < 90) || (sensorCompartimento_2 > 27 && sensorCompartimento_2 <= 32)) {
        console.log("Compartimento 2 | ", sensorCompartimento_2, "cm | atencao");
 
    } else if (sensorCompartimento_2 >= 90) {
        console.log("Compartimento 2 | ", sensorCompartimento_2, "cm | crítico");
    }
 
    // Compartimento 3
    if (sensorCompartimento_3 >= 0 && sensorCompartimento_3 < 70) {
        console.log("Compartimento 3 | ", sensorCompartimento_3, "cm | normal");
 
    } else if ((sensorCompartimento_3 >= 70 && sensorCompartimento_3 < 90) || (sensorCompartimento_3 > 27 && sensorCompartimento_3 <= 32)) {
        console.log("Compartimento 3 | ", sensorCompartimento_3, "cm | atencao");
 
    } else if (sensorCompartimento_3 >= 90) {
        console.log("Compartimento 3 | ", sensorCompartimento_3, "cm | crítico");
    }
 
    // Compartimento 4
    if (sensorCompartimento_4 >= 0 && sensorCompartimento_4 < 70) {
        console.log("Compartimento 4 | ", sensorCompartimento_4, "cm | normal");
 
    } else if ((sensorCompartimento_4 >= 70 && sensorCompartimento_4 < 90) || (sensorCompartimento_4 > 27 && sensorCompartimento_4 <= 32)) {
        console.log("Compartimento 4 | ", sensorCompartimento_4, "cm | atencao");
 
    } else if (sensorCompartimento_4 >= 90) {
        console.log("Compartimento 4 | ", sensorCompartimento_4, "cm | crítico");
    }
 
    // Compartimento 5
    if (sensorCompartimento_5 >= 0 && sensorCompartimento_5 < 70) {
        console.log("Compartimento 5 | ", sensorCompartimento_5, "cm | normal");
 
    } else if ((sensorCompartimento_5 >= 70 && sensorCompartimento_5 < 90) || (sensorCompartimento_5 > 27 && sensorCompartimento_5 <= 32)) {
        console.log("Compartimento 5 | ", sensorCompartimento_5, "cm | atencao");
 
    } else if (sensorCompartimento_5 >= 90) {
        console.log("Compartimento 5 | ", sensorCompartimento_5, "cm | crítico");
    }
 
    // Compartimento 6
    if (sensorCompartimento_6 >= 0 && sensorCompartimento_6 < 70) {
        console.log("Compartimento 6 | ", sensorCompartimento_6, "cm | normal");
 
    } else if ((sensorCompartimento_6 >= 70 && sensorCompartimento_6 < 90) || (sensorCompartimento_6 > 27 && sensorCompartimento_6 <= 32)) {
        console.log("Compartimento 6 | ", sensorCompartimento_6, "cm | atencao");
 
    } else if (sensorCompartimento_6 >= 90) {
        console.log("Compartimento 6 | ", sensorCompartimento_6, "cm | crítico");
    }
 
    // Compartimento 7
    if (sensorCompartimento_7 >= 0 && sensorCompartimento_7 < 70) {
        console.log("Compartimento 7 | ", sensorCompartimento_7, "cm | normal");
 
    } else if ((sensorCompartimento_7 >= 70 && sensorCompartimento_7 < 90) || (sensorCompartimento_7 > 27 && sensorCompartimento_7 <= 32)) {
        console.log("Compartimento 7 | ", sensorCompartimento_7, "cm | atencao");
 
    } else if (sensorCompartimento_7 >= 90) {
        console.log("Compartimento 7 | ", sensorCompartimento_7, "cm | crítico");
    }
 
    // Compartimento 8
    if (sensorCompartimento_8 >= 0 && sensorCompartimento_8 < 70) {
        console.log("Compartimento 8 | ", sensorCompartimento_8, "cm | normal");
 
    } else if ((sensorCompartimento_8 >= 70 && sensorCompartimento_8 < 90) || (sensorCompartimento_8 > 27 && sensorCompartimento_8 <= 32)) {
        console.log("Compartimento 8 | ", sensorCompartimento_8, "cm | atencao");
 
    } else if (sensorCompartimento_8 >= 90) {
        console.log("Compartimento 8 | ", sensorCompartimento_8, "cm | crítico");
    }
 
    // Compartimento 9
    if (sensorCompartimento_9 >= 0 && sensorCompartimento_9 < 70) {
        console.log("Compartimento 9 | ", sensorCompartimento_9, "cm | normal");
 
    } else if ((sensorCompartimento_9 >= 70 && sensorCompartimento_9 < 90) || (sensorCompartimento_9 > 27 && sensorCompartimento_9 <= 32)) {
        console.log("Compartimento 9 | ", sensorCompartimento_9, "cm | atencao");
 
    } else if (sensorCompartimento_9 >= 90) {
        console.log("Compartimento 9 | ", sensorCompartimento_9, "cm | crítico");
    }
 
    // Compartimento 10
    if (sensorCompartimento_10 >= 0 && sensorCompartimento_10 < 70) {
        console.log("Compartimento 10 | ", sensorCompartimento_10, "cm | normal");
 
    } else if ((sensorCompartimento_10 >= 70 && sensorCompartimento_10 < 90) || (sensorCompartimento_10 > 27 && sensorCompartimento_10 <= 32)) {
        console.log("Compartimento 10 | ", sensorCompartimento_10, "cm | atencao");
 
    } else if (sensorCompartimento_10 >= 90) {
        console.log("Compartimento 10 | ", sensorCompartimento_10, "cm | crítico");
    }
 
    // Compartimento 11
    if (sensorCompartimento_11 >= 0 && sensorCompartimento_11 < 70) {
        console.log("Compartimento 11 | ", sensorCompartimento_11, "cm | normal");
 
    } else if ((sensorCompartimento_11 >= 70 && sensorCompartimento_11 < 90) || (sensorCompartimento_11 > 27 && sensorCompartimento_11 <= 32)) {
        console.log("Compartimento 11 | ", sensorCompartimento_11, "cm | atencao");
 
    } else if (sensorCompartimento_11 >= 90) {
        console.log("Compartimento 11 | ", sensorCompartimento_11, "cm | crítico");
    }
 
    // Compartimento 12
    if (sensorCompartimento_12 >= 0 && sensorCompartimento_12 < 70) {
        console.log("Compartimento 12 | ", sensorCompartimento_12, "cm | normal");
 
    } else if ((sensorCompartimento_12 >= 70 && sensorCompartimento_12 < 90) || (sensorCompartimento_12 > 27 && sensorCompartimento_12 <= 32)) {
        console.log("Compartimento 12 | ", sensorCompartimento_12, "cm | atencao");
 
    } else if (sensorCompartimento_12 >= 90) {
        console.log("Compartimento 12 | ", sensorCompartimento_12, "cm | crítico");
    }
 
    // Compartimento 13
    if (sensorCompartimento_13 >= 0 && sensorCompartimento_13 < 70) {
        console.log("Compartimento 13 | ", sensorCompartimento_13, "cm | normal");
 
    } else if ((sensorCompartimento_13 >= 70 && sensorCompartimento_13 < 90) || (sensorCompartimento_13 > 27 && sensorCompartimento_13 <= 32)) {
        console.log("Compartimento 13 | ", sensorCompartimento_13, "cm | atencao");
 
    } else if (sensorCompartimento_13 >= 90) {
        console.log("Compartimento 13 | ", sensorCompartimento_13, "cm | crítico");
    }
 
    // Compartimento 14
    if (sensorCompartimento_14 >= 0 && sensorCompartimento_14 < 70) {
        console.log("Compartimento 14 | ", sensorCompartimento_14, "cm | normal");
 
    } else if ((sensorCompartimento_14 >= 70 && sensorCompartimento_14 < 90) || (sensorCompartimento_14 > 27 && sensorCompartimento_14 <= 32)) {
        console.log("Compartimento 14 | ", sensorCompartimento_14, "cm | atencao");
 
    } else if (sensorCompartimento_14 >= 90) {
        console.log("Compartimento 14 | ", sensorCompartimento_14, "cm | crítico");
    }
 
    // Compartimento 15
    if (sensorCompartimento_15 >= 0 && sensorCompartimento_15 < 70) {
        console.log("Compartimento 15 | ", sensorCompartimento_15, "cm | normal");
 
    } else if ((sensorCompartimento_15 >= 70 && sensorCompartimento_15 < 90) || (sensorCompartimento_15 > 27 && sensorCompartimento_15 <= 32)) {
        console.log("Compartimento 15 | ", sensorCompartimento_15, "cm | atencao");
 
    } else if (sensorCompartimento_15 >= 90) {
        console.log("Compartimento 15 | ", sensorCompartimento_15, "cm | crítico");
    }
 
    // Compartimento 16
    if (sensorCompartimento_16 >= 0 && sensorCompartimento_16 < 70) {
        console.log("Compartimento 16 | ", sensorCompartimento_16, "cm | normal");
 
    } else if ((sensorCompartimento_16 >= 70 && sensorCompartimento_16 < 90) || (sensorCompartimento_16 > 27 && sensorCompartimento_16 <= 32)) {
        console.log("Compartimento 16 | ", sensorCompartimento_16, "cm | atencao");
 
    } else if (sensorCompartimento_16 >= 90) {
        console.log("Compartimento 16 | ", sensorCompartimento_16, "cm | crítico");
    }
 
    // Compartimento 17
    if (sensorCompartimento_17 >= 0 && sensorCompartimento_17 < 70) {
        console.log("Compartimento 17 | ", sensorCompartimento_17, "cm | normal");
 
    } else if ((sensorCompartimento_17 >= 70 && sensorCompartimento_17 < 90) || (sensorCompartimento_17 > 27 && sensorCompartimento_17 <= 32)) {
        console.log("Compartimento 17 | ", sensorCompartimento_17, "cm | atencao");
 
    } else if (sensorCompartimento_17 >= 90) {
        console.log("Compartimento 17 | ", sensorCompartimento_17, "cm | crítico");
    }
 
    // Compartimento 18
    if (sensorCompartimento_18 >= 0 && sensorCompartimento_18 < 70) {
        console.log("Compartimento 18 | ", sensorCompartimento_18, "cm | normal");
 
    } else if ((sensorCompartimento_18 >= 70 && sensorCompartimento_18 < 90) || (sensorCompartimento_18 > 27 && sensorCompartimento_18 <= 32)) {
        console.log("Compartimento 18 | ", sensorCompartimento_18, "cm | atencao");
 
    } else if (sensorCompartimento_18 >= 90) {
        console.log("Compartimento 18 | ", sensorCompartimento_18, "cm | crítico");
    }
 
    // Compartimento 19
    if (sensorCompartimento_19 >= 0 && sensorCompartimento_19 < 70) {
        console.log("Compartimento 19 | ", sensorCompartimento_19, "cm | normal");
 
    } else if ((sensorCompartimento_19 >= 70 && sensorCompartimento_19 < 90) || (sensorCompartimento_19 > 27 && sensorCompartimento_19 <= 32)) {
        console.log("Compartimento 19 | ", sensorCompartimento_19, "cm | atencao");
 
    } else if (sensorCompartimento_19 >= 90) {
        console.log("Compartimento 19 | ", sensorCompartimento_19, "cm | crítico");
    }
 
    // Compartimento 20
    if (sensorCompartimento_20 >= 0 && sensorCompartimento_20 < 70) {
        console.log("Compartimento 20 | ", sensorCompartimento_20, "cm | normal");
 
    } else if ((sensorCompartimento_20 >= 70 && sensorCompartimento_20 < 90) || (sensorCompartimento_20 > 27 && sensorCompartimento_20 <= 32)) {
        console.log("Compartimento 20 | ", sensorCompartimento_20, "cm | atencao");
 
    } else if (sensorCompartimento_20 >= 90) {
        console.log("Compartimento 20 | ", sensorCompartimento_20, "cm | crítico");
    }
 
    // Compartimento 21
    if (sensorCompartimento_21 >= 0 && sensorCompartimento_21 < 70) {
        console.log("Compartimento 21 | ", sensorCompartimento_21, "cm | normal");
 
    } else if ((sensorCompartimento_21 >= 70 && sensorCompartimento_21 < 90) || (sensorCompartimento_21 > 27 && sensorCompartimento_21 <= 32)) {
        console.log("Compartimento 21 | ", sensorCompartimento_21, "cm | atencao");
 
    } else if (sensorCompartimento_21 >= 90) {
        console.log("Compartimento 21 | ", sensorCompartimento_21, "cm | crítico");
    }
 
    // Compartimento 22
    if (sensorCompartimento_22 >= 0 && sensorCompartimento_22 < 70) {
        console.log("Compartimento 22 | ", sensorCompartimento_22, "cm | normal");
 
    } else if ((sensorCompartimento_22 >= 70 && sensorCompartimento_22 < 90) || (sensorCompartimento_22 > 27 && sensorCompartimento_22 <= 32)) {
        console.log("Compartimento 22 | ", sensorCompartimento_22, "cm | atencao");
 
    } else if (sensorCompartimento_22 >= 90) {
        console.log("Compartimento 22 | ", sensorCompartimento_22, "cm | crítico");
    }
 
    // Compartimento 23
    if (sensorCompartimento_23 >= 0 && sensorCompartimento_23 < 70) {
        console.log("Compartimento 23 | ", sensorCompartimento_23, "cm | normal");
 
    } else if ((sensorCompartimento_23 >= 70 && sensorCompartimento_23 < 90) || (sensorCompartimento_23 > 27 && sensorCompartimento_23 <= 32)) {
        console.log("Compartimento 23 | ", sensorCompartimento_23, "cm | atencao");
 
    } else if (sensorCompartimento_23 >= 90) {
        console.log("Compartimento 23 | ", sensorCompartimento_23, "cm | crítico");
    }
 
    // Compartimento 24
    if (sensorCompartimento_24 >= 0 && sensorCompartimento_24 < 70) {
        console.log("Compartimento 24 | ", sensorCompartimento_24, "cm | normal");
 
    } else if ((sensorCompartimento_24 >= 70 && sensorCompartimento_24 < 90) || (sensorCompartimento_24 > 27 && sensorCompartimento_24 <= 32)) {
        console.log("Compartimento 24 | ", sensorCompartimento_24, "cm | atencao");
 
    } else if (sensorCompartimento_24 >= 90) {
        console.log("Compartimento 24 | ", sensorCompartimento_24, "cm | crítico");
    }
 
    // Compartimento 25
    if (sensorCompartimento_25 >= 0 && sensorCompartimento_25 < 70) {
        console.log("Compartimento 25 | ", sensorCompartimento_25, "cm | normal");
 
    } else if ((sensorCompartimento_25 >= 70 && sensorCompartimento_25 < 90) || (sensorCompartimento_25 > 27 && sensorCompartimento_25 <= 32)) {
        console.log("Compartimento 25 | ", sensorCompartimento_25, "cm | atencao");
 
    } else if (sensorCompartimento_25 >= 90) {
        console.log("Compartimento 25 | ", sensorCompartimento_25, "cm | crítico");
    }
 
    // Compartimento 26
    if (sensorCompartimento_26 >= 0 && sensorCompartimento_26 < 70) {
        console.log("Compartimento 26 | ", sensorCompartimento_26, "cm | normal");
 
    } else if ((sensorCompartimento_26 >= 70 && sensorCompartimento_26 < 90) || (sensorCompartimento_26 > 27 && sensorCompartimento_26 <= 32)) {
        console.log("Compartimento 26 | ", sensorCompartimento_26, "cm | atencao");
 
    } else if (sensorCompartimento_26 >= 90) {
        console.log("Compartimento 26 | ", sensorCompartimento_26, "cm | crítico");
    }
 
    // Compartimento 27
    if (sensorCompartimento_27 >= 0 && sensorCompartimento_27 < 70) {
        console.log("Compartimento 27 | ", sensorCompartimento_27, "cm | normal");
 
    } else if ((sensorCompartimento_27 >= 70 && sensorCompartimento_27 < 90) || (sensorCompartimento_27 > 27 && sensorCompartimento_27 <= 32)) {
        console.log("Compartimento 27 | ", sensorCompartimento_27, "cm | atencao");
 
    } else if (sensorCompartimento_27 >= 90) {
        console.log("Compartimento 27 | ", sensorCompartimento_27, "cm | crítico");
    }
 
    // Compartimento 28
    if (sensorCompartimento_28 >= 0 && sensorCompartimento_28 < 70) {
        console.log("Compartimento 28 | ", sensorCompartimento_28, "cm | normal");
 
    } else if ((sensorCompartimento_28 >= 70 && sensorCompartimento_28 < 90) || (sensorCompartimento_28 > 27 && sensorCompartimento_28 <= 32)) {
        console.log("Compartimento 28 | ", sensorCompartimento_28, "cm | atencao");
 
    } else if (sensorCompartimento_28 >= 90) {
        console.log("Compartimento 28 | ", sensorCompartimento_28, "cm | crítico");
    }
 
    // Compartimento 29
    if (sensorCompartimento_29 >= 0 && sensorCompartimento_29 < 70) {
        console.log("Compartimento 29 | ", sensorCompartimento_29, "cm | normal");
 
    } else if ((sensorCompartimento_29 >= 70 && sensorCompartimento_29 < 90) || (sensorCompartimento_29 > 27 && sensorCompartimento_29 <= 32)) {
        console.log("Compartimento 29 | ", sensorCompartimento_29, "cm | atencao");
 
    } else if (sensorCompartimento_29 >= 90) {
        console.log("Compartimento 29 | ", sensorCompartimento_29, "cm | crítico");
    }
 
    // Compartimento 30
    if (sensorCompartimento_30 >= 0 && sensorCompartimento_30 < 70) {
        console.log("Compartimento 30 | ", sensorCompartimento_30, "cm | normal");
 
    } else if ((sensorCompartimento_30 >= 70 && sensorCompartimento_30 < 90) || (sensorCompartimento_30 > 27 && sensorCompartimento_30 <= 32)) {
        console.log("Compartimento 30 | ", sensorCompartimento_30, "cm | atencao");
 
    } else if (sensorCompartimento_30 >= 90) {
        console.log("Compartimento 30 | ", sensorCompartimento_30, "cm | crítico");
    }
}
 
classificarDistancia(
    sensorDistancia,
    sensorCompartimento_2, sensorCompartimento_3, sensorCompartimento_4, sensorCompartimento_5,
    sensorCompartimento_6, sensorCompartimento_7, sensorCompartimento_8, sensorCompartimento_9,
    sensorCompartimento_10, sensorCompartimento_11, sensorCompartimento_12, sensorCompartimento_13,
    sensorCompartimento_14, sensorCompartimento_15, sensorCompartimento_16, sensorCompartimento_17,
    sensorCompartimento_18, sensorCompartimento_19, sensorCompartimento_20, sensorCompartimento_21,
    sensorCompartimento_22, sensorCompartimento_23, sensorCompartimento_24, sensorCompartimento_25,
    sensorCompartimento_26, sensorCompartimento_27, sensorCompartimento_28, sensorCompartimento_29,
    sensorCompartimento_30
);




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

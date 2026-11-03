// ==========================================================================
// DADOS MOCKADOS DO DASHBOARD | SMARTCOLETA
// Enquanto o dashboard não lê o banco, os dados vêm deste arquivo.
// Cada lista tem as mesmas colunas da tabela do banco "smartcoleta"
// (prefeitura, parametrizacao, ponto_coleta, compartimento, sensor, leitura
// e coleta). Assim, quando a API estiver pronta, basta trocar estas listas
// pelas respostas do fetch, sem mexer no resto do dashboard.
// As datas seguem o formato do banco: 'AAAA-MM-DD HH:MM:SS'.
// ==========================================================================

let prefeituraMock = {
	idPrefeitura: 1,
	razaoSocial: 'MUNICIPIO DE CAMPO NOVO DE RONDONIA',
	cidade: 'Campo Novo de Rondônia',
	uf: 'RO'
};

// limites em % de preenchimento (tabela parametrizacao)
let parametrizacoesMock = [
	{ idParametrizacao: 1, limiteAtencao: 70, limiteCritico: 90 }, // rejeito
	{ idParametrizacao: 2, limiteAtencao: 65, limiteCritico: 85 }, // orgânico: coleta antes, por causa do mau cheiro
	{ idParametrizacao: 3, limiteAtencao: 75, limiteCritico: 95 }  // reciclável: pode encher mais
];

// pontos de coleta (tabela ponto_coleta); ruas ilustrativas
let pontosMock = [
	{ idPonto: 1, rua: 'Av. Tancredo Neves', bairro: 'Centro', statuss: 1, fkPrefeitura: 1 },
	{ idPonto: 2, rua: 'Rua Santa Cruz', bairro: 'Planalto', statuss: 1, fkPrefeitura: 1 },
	{ idPonto: 3, rua: 'Av. Airton Senna', bairro: 'Jardim Monte Alegre', statuss: 1, fkPrefeitura: 1 },
	{ idPonto: 4, rua: 'Rua Rio de Janeiro', bairro: 'Jardim Alvorada', statuss: 1, fkPrefeitura: 1 },
	{ idPonto: 5, rua: 'Av. Brasil', bairro: 'Centro', statuss: 1, fkPrefeitura: 1 },
	{ idPonto: 6, rua: 'Rua São Paulo', bairro: 'Centro', statuss: 1, fkPrefeitura: 1 },
	{ idPonto: 7, rua: 'Rua Mato Grosso', bairro: 'Planalto', statuss: 1, fkPrefeitura: 1 },
	{ idPonto: 8, rua: 'Av. Rondônia', bairro: 'Setor Industrial', statuss: 1, fkPrefeitura: 1 },
	{ idPonto: 9, rua: 'Rua Amazonas', bairro: 'Jardim Alvorada', statuss: 1, fkPrefeitura: 1 },
	{ idPonto: 10, rua: 'Rua Goiás', bairro: 'Bela Vista', statuss: 1, fkPrefeitura: 1 }
];

// cada ponto tem 3 compartimentos, cada compartimento tem 1 sensor HC-SR04
// (30 sensores, igual à simulação da API dat-acqu-ino)
// fkParametrizacao de cada tipo de resíduo
let tiposResiduoMock = [
	{ tipoResiduo: 'Orgânico', fkParametrizacao: 2 },
	{ tipoResiduo: 'Reciclável', fkParametrizacao: 3 },
	{ tipoResiduo: 'Rejeito', fkParametrizacao: 1 }
];

// cenário da simulação: nível atual (%) e quanto cada compartimento enche
// por hora, na ordem Orgânico, Reciclável, Rejeito
let cenarioMock = [
	{ niveis: [94, 60, 48], enchePorHora: [3.4, 2.1, 1.8] }, // ponto 1: orgânico crítico
	{ niveis: [70, 96, 55], enchePorHora: [3.0, 2.6, 2.0] }, // ponto 2: reciclável crítico, orgânico em atenção
	{ niveis: [81, 40, 62], enchePorHora: [3.2, 1.6, 2.2] }, // ponto 3: orgânico em atenção
	{ niveis: [30, 52, 76], enchePorHora: [2.8, 2.0, 2.4] }, // ponto 4: rejeito em atenção
	{ niveis: [45, 79, 33], enchePorHora: [2.6, 2.8, 1.5] }, // ponto 5: reciclável em atenção
	{ niveis: [38, 22, 51], enchePorHora: [2.4, 1.2, 2.0] },
	{ niveis: [55, 47, 29], enchePorHora: [2.9, 1.8, 1.4] },
	{ niveis: [18, 64, 41], enchePorHora: [2.2, 2.5, 1.9] },
	{ niveis: [50, 35, 44], enchePorHora: [2.5, 1.5, 1.7] }, // ponto 9: sensor do rejeito inativo
	{ niveis: [12, 26, 20], enchePorHora: [3.1, 1.9, 1.6] }  // ponto 10: coletado há pouco
];

let compartimentosMock = [];
let sensoresMock = [];

for (let p = 0; p < pontosMock.length; p++) {
	for (let t = 0; t < tiposResiduoMock.length; t++) {
		let id = p * tiposResiduoMock.length + t + 1;

		compartimentosMock.push({
			idCompartimento: id,
			tipoResiduo: tiposResiduoMock[t].tipoResiduo,
			alturaCm: 100,
			statuss: 1,
			fkPontoColeta: pontosMock[p].idPonto,
			fkParametrizacao: tiposResiduoMock[t].fkParametrizacao
		});

		sensoresMock.push({
			idSensor: id,
			numeroSensor: 100 + id,
			modelo: 'HC-SR04',
			statuss: id == 27 ? 0 : 1, // sensor do rejeito do ponto 9 está inativo
			fkCompartimento: id
		});
	}
}

// LEITURAS E COLETAS
// Uma leitura por hora, nas 24 h antes de 03/11/2026 às 18:10, para cada
// sensor. O nível desce no passado no ritmo de enchePorHora; quando chega
// perto de zero, é porque houve uma coleta ali, e antes dela o
// compartimento estava cheio.
let ANO_MES_MOCK = '2026-11';
let DIA_MOCK = 3;
let HORA_MOCK = 18;
let MINUTO_MOCK = 10;
let HORAS_DE_LEITURA = 24;
let NIVEL_LOGO_APOS_COLETA = 4; // % que sobra no compartimento depois da coleta
let NIVEL_ANTES_DA_COLETA = 88; // % em que o caminhão costuma coletar
let HORAS_SEM_LEITURA_SENSOR_INATIVO = 6;

let leiturasMock = [];
let coletasMock = [];

// 5 vira '05'
function doisDigitos(numero) {
	return numero < 10 ? '0' + numero : '' + numero;
}

// data e hora no formato do banco, "horasAtras" horas antes de 03/11 às 18:10
function montarDataHora(horasAtras, minuto) {
	let dia = DIA_MOCK;
	let hora = HORA_MOCK - horasAtras;
	while (hora < 0) {
		hora = hora + 24;
		dia = dia - 1;
	}
	return `${ANO_MES_MOCK}-${doisDigitos(dia)} ${doisDigitos(hora)}:${doisDigitos(minuto)}:00`;
}

// as leituras são geradas da mais antiga para a mais nova
// (como um SELECT com ORDER BY dataHora)
for (let horasAtras = HORAS_DE_LEITURA; horasAtras >= 0; horasAtras--) {
	for (let i = 0; i < sensoresMock.length; i++) {
		let sensor = sensoresMock[i];

		// sensor inativo parou de mandar leitura há algumas horas
		let sensorMandouLeitura = sensor.statuss == 1 || horasAtras >= HORAS_SEM_LEITURA_SENSOR_INATIVO;

		if (sensorMandouLeitura) {
			let compartimento = compartimentosMock[i];
			let tipo = i % tiposResiduoMock.length;
			let cenario = cenarioMock[(i - tipo) / tiposResiduoMock.length];
			let nivel = cenario.niveis[tipo] - cenario.enchePorHora[tipo] * horasAtras;

			if (nivel < NIVEL_LOGO_APOS_COLETA) {
				nivel = nivel + NIVEL_ANTES_DA_COLETA - NIVEL_LOGO_APOS_COLETA; // antes da coleta
			}
			if (horasAtras > 0) {
				nivel = nivel + (Math.random() - 0.5) * 2.4; // variação pequena, entre -1,2 e +1,2
			}
			if (nivel > 100) {
				nivel = 100;
			}
			if (nivel < 0) {
				nivel = 0;
			}

			leiturasMock.push({
				idLeitura: leiturasMock.length + 1,
				distanciaCm: Number((compartimento.alturaCm * (1 - nivel / 100)).toFixed(2)),
				// sensores não leem todos no mesmo minuto (orgânico :08, reciclável :09, rejeito :10),
				// e cada leitura entra depois da anterior, como no banco
				dataHora: montarDataHora(horasAtras, MINUTO_MOCK - 2 + tipo),
				fkSensor: sensor.idSensor
			});
		}
	}
}

// a última coleta de cada compartimento foi quando o nível estava em
// NIVEL_LOGO_APOS_COLETA
for (let i = 0; i < compartimentosMock.length; i++) {
	let tipo = i % tiposResiduoMock.length;
	let cenario = cenarioMock[(i - tipo) / tiposResiduoMock.length];
	let horasDesdeColeta = Math.round((cenario.niveis[tipo] - NIVEL_LOGO_APOS_COLETA) / cenario.enchePorHora[tipo]);

	coletasMock.push({
		idColeta: coletasMock.length + 1,
		dataHoraColeta: montarDataHora(horasDesdeColeta, 0),
		percentualAntes: NIVEL_ANTES_DA_COLETA + Math.round(Math.random() * 4 - 2),
		fkCompartimento: compartimentosMock[i].idCompartimento
	});
}

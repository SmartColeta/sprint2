// ==================================================================
// DADOS DE EXEMPLO (apagar quando a dash ler o banco)
//
// Simula 90 dias de leituras (uma a cada 15 min) e as coletas de cada
// ponto, e devolve as MESMAS linhas que o script do banco devolve:
//   linhasEstado      = C1 (vw_estado_compartimento, já na ordem de urgência)
//   resumo            = C8 (vw_resumo_prefeitura)
//   bairros           = C9 (vw_resumo_bairro)
//   historico()       = C3a a C3d (histórico do ponto por período)
//   ultimaColeta()    = C4 (vw_ultima_coleta_ponto)
//   leiturasDoDia()   = C6 (leituras do ponto em uma data)
//
// As contas de nível, situação, previsão e totais AQUI DENTRO imitam as
// views do banco e só existem por causa dos dados de exemplo. A dash
// (dashboard.js) não calcula nada disso: só exibe, filtra e ordena.
//
// Como a simulação funciona, ponto por ponto:
//   - cada compartimento enche a uma velocidade do seu tipo, com variação;
//   - quando algum compartimento passa do limite de atenção, a coleta do
//     PONTO é marcada para algumas horas depois (às vezes atrasa e passa
//     do crítico);
//   - na coleta, os 3 compartimentos voltam para ~4%;
//   - nas últimas 12 h a rota atrasou, para o exemplo ter pontos esperando
//     coleta agora.
// Semente fixa: os mesmos números a cada carga da página.
// ==================================================================
let exemploAtual = null;
let SEMENTE_EXEMPLO = 20261134; // escolhida para o POC mostrar críticos, atenção e um sensor parado

let DIAS_EXEMPLO = 90;
let LEITURAS_POR_HORA = 4;      // uma leitura a cada 15 min
let MINUTOS_PARA_SEM_LEITURA = 30;
let ALTURA_EXEMPLO = 100;       // alturaCm de todos os compartimentos

// os 3 compartimentos de cada ponto, na ordem do script do banco
// taxa = velocidade de enchimento em % por hora (sorteada entre os dois valores)
let TIPOS_EXEMPLO = [
	{ nome: 'Orgânico', prioridade: 1, atencao: 65, critico: 85, taxa: [2.0, 3.2] },
	{ nome: 'Reciclável', prioridade: 3, atencao: 75, critico: 95, taxa: [1.3, 2.3] },
	{ nome: 'Sem distinção', prioridade: 2, atencao: 70, critico: 90, taxa: [1.1, 2.1] }
];

// sensores parados: número do sensor (idSensor) e há quantas horas parou
let SENSORES_PARADOS = { 27: 6, 85: 2 };

// os 10 pontos do script do banco (rua, bairro)
let PONTOS_POC = [
	['Av. Tancredo Neves, 120', 'Centro'],
	['Rua Santa Cruz, 45', 'Planalto'],
	['Av. Airton Senna, 300', 'Jardim Monte Alegre'],
	['Rua Rio de Janeiro, 88', 'Jardim Alvorada'],
	['Av. Brasil, 1200', 'Centro'],
	['Rua São Paulo, 210', 'Centro'],
	['Rua Mato Grosso, 220', 'Planalto'],
	['Av. Rondônia, 890', 'Setor Industrial'],
	['Rua Amazonas, 75', 'Jardim Alvorada'],
	['Rua Goiás, 510', 'Bela Vista']
];
let RUAS_EXTRAS = ['Rua Bahia', 'Rua Pernambuco', 'Rua Paraná', 'Rua Ceará', 'Av. Marechal Rondon', 'Rua Pará',
	'Rua Acre', 'Rua Sergipe', 'Rua Alagoas', 'Rua Piauí', 'Rua Maranhão', 'Rua Tocantins', 'Rua Espírito Santo',
	'Av. Sete de Setembro', 'Rua Dom Pedro II', 'Rua XV de Novembro', 'Rua Castelo Branco', 'Av. Getúlio Vargas',
	'Rua Duque de Caxias', 'Rua Tiradentes', 'Rua dos Ipês', 'Rua das Palmeiras', 'Rua Jatobá', 'Rua Castanheira',
	'Rua Seringueira', 'Av. Juscelino Kubitschek', 'Rua Rui Barbosa', 'Rua Princesa Isabel', 'Rua Santos Dumont',
	'Rua Floriano Peixoto'];
let BAIRROS = ['Centro', 'Planalto', 'Jardim Monte Alegre', 'Jardim Alvorada', 'Setor Industrial', 'Bela Vista', 'Vila Nova', 'Jardim América'];

// números "aleatórios" que se repetem a cada carga (semente fixa)
let semente = 1;
function sortear() {
	semente = (semente * 16807) % 2147483647;
	return (semente - 1) / 2147483646;
}
function entre(min, max) {
	return min + sortear() * (max - min);
}

function arredondar(valor, casas) {
	let fator = Math.pow(10, casas);
	return Math.round(valor * fator) / fator;
}

// datas no formato que o MySQL devolve num DATE_FORMAT: 'AAAA-MM-DD HH:MM:SS'
function doisDigitosExemplo(n) {
	return n < 10 ? '0' + n : '' + n;
}
function textoDataHoraSql(data) {
	return `${data.getFullYear()}-${doisDigitosExemplo(data.getMonth() + 1)}-${doisDigitosExemplo(data.getDate())} ` +
		`${doisDigitosExemplo(data.getHours())}:${doisDigitosExemplo(data.getMinutes())}:00`;
}

// a dash chama sempre esta função; o exemplo só é gerado de novo ao trocar de cenário
function obterExemplo(agora, qtdPontos) {
	if (exemploAtual == null || exemploAtual.qtd != qtdPontos) {
		exemploAtual = gerarExemplo(agora, qtdPontos);
	}
	return exemploAtual;
}


// ---------- 1. SIMULAÇÃO: 90 dias de leituras e coletas ----------
function gerarExemplo(agora, qtdPontos) {
	semente = SEMENTE_EXEMPLO;
	let passos = DIAS_EXEMPLO * 24 * LEITURAS_POR_HORA;
	let quinzeMin = 15 * 60000;
	let compartimentos = []; // um item por compartimento, com o nível de cada leitura
	let coletas = [];        // coletas de todos os pontos, da mais antiga para a mais nova

	for (let p = 0; p < qtdPontos; p++) {
		let idPonto = p + 1;
		let rua, bairro;
		if (p < PONTOS_POC.length) {
			rua = PONTOS_POC[p][0];
			bairro = PONTOS_POC[p][1];
		} else {
			rua = RUAS_EXTRAS[p - PONTOS_POC.length] + ', ' + Math.round(entre(10, 1500));
			bairro = BAIRROS[Math.floor(entre(0, BAIRROS.length))];
		}

		// cada ponto lê num minuto diferente; a última leitura foi há 2 a 10 min
		let ultimaLeitura = agora.getTime() - (2 + (p % 5) * 2) * 60000;
		let doPonto = TIPOS_EXEMPLO.map(function (tipo, t) {
			let id = p * 3 + t + 1;
			return {
				idPonto: idPonto, rua: rua, bairro: bairro, idCompartimento: id, idSensor: id, numeroSensor: 100 + id,
				tipo: tipo, taxa: entre(tipo.taxa[0], tipo.taxa[1]), nivel: entre(5, 45),
				niveis: new Float32Array(passos), ultimaLeitura: ultimaLeitura - t * 60000
			};
		});

		let passoDaColeta = -1; // passo em que a coleta marcada acontece
		// a simulação não depende do relógio: o mesmo exemplo em qualquer hora do dia
		for (let i = 0; i < passos; i++) {
			let instante = ultimaLeitura - (passos - 1 - i) * quinzeMin;

			for (let k = 0; k < doPonto.length; k++) {
				let c = doPonto[k];
				c.nivel = Math.min(100, c.nivel + c.taxa / LEITURAS_POR_HORA * entre(0.6, 1.4));
				c.niveis[i] = Math.min(100, Math.max(0, c.nivel + Math.sin(c.idSensor * 7.3 + i * 1.9) * 0.6));
			}

			// marca a coleta quando o primeiro compartimento passa do limite de atenção
			if (passoDaColeta < 0 && doPonto.some(function (c) { return c.nivel >= c.tipo.atencao; })) {
				// em geral o caminhão chega em 1 a 6 h; às vezes atrasa e o compartimento passa do crítico
				let atrasoHoras = sortear() < 0.15 ? entre(6, 14) : entre(1, 6);
				// nas últimas 12 h a rota atrasou: os pontos marcados ainda esperam o
				// caminhão, e é isso que a dash mostra "agora" (críticos e em atenção)
				if (i > passos - 12 * LEITURAS_POR_HORA) {
					atrasoHoras += entre(6, 14);
				}
				passoDaColeta = i + Math.round(atrasoHoras * LEITURAS_POR_HORA);
			}
			// coleta: grava o nível de cada compartimento (N:M) e esvazia
			if (i == passoDaColeta) {
				coletas.push({
					idColeta: coletas.length + 1, idPonto: idPonto, dataHora: new Date(instante + 5 * 60000),
					itens: doPonto.map(function (c) { return { idCompartimento: c.idCompartimento, percentualAntes: arredondar(c.niveis[i], 2) }; })
				});
				for (let k = 0; k < doPonto.length; k++) {
					doPonto[k].nivel = entre(3, 5);
				}
				passoDaColeta = -1;
			}
		}

		// sensor parado: sem leituras nas últimas horas
		for (let k = 0; k < doPonto.length; k++) {
			let horasParado = SENSORES_PARADOS[doPonto[k].idSensor];
			if (horasParado) {
				for (let i = passos - horasParado * LEITURAS_POR_HORA; i < passos; i++) {
					doPonto[k].niveis[i] = NaN;
				}
			}
			compartimentos.push(doPonto[k]);
		}
	}

	// ---------- 2. FUNÇÕES QUE IMITAM O SQL ----------

	// hora da leitura i de um compartimento
	function instanteDaLeitura(c, i) {
		return c.ultimaLeitura - (passos - 1 - i) * quinzeMin;
	}
	// distância medida (cm) e nível como no CASE das views (entre 0 e 100)
	function distanciaDaLeitura(c, i) {
		return arredondar(ALTURA_EXEMPLO - c.niveis[i], 2);
	}
	function nivelDaDistancia(distancia) {
		if (distancia >= ALTURA_EXEMPLO) return 0;
		if (distancia <= 0) return 100;
		return arredondar((1 - distancia / ALTURA_EXEMPLO) * 100, 2);
	}
	function situacaoDoNivel(nivel, tipo) {
		if (nivel >= tipo.critico) return 'Critico';
		if (nivel >= tipo.atencao) return 'Atencao';
		return 'Normal';
	}

	// V1 vw_estado_compartimento: uma linha por compartimento
	function linhaDoEstado(c) {
		let ultima = passos - 1;
		while (ultima >= 0 && isNaN(c.niveis[ultima])) ultima--;

		let dataHora = new Date(instanteDaLeitura(c, ultima));
		let distancia = distanciaDaLeitura(c, ultima);
		let nivel = nivelDaDistancia(distancia);
		let minutos = Math.floor((agora.getTime() - dataHora.getTime()) / 60000);

		// leitura de referência: 1 h antes (4 leituras de 15 min)
		let anterior = ultima - LEITURAS_POR_HORA;
		let taxa = null;
		if (anterior >= 0 && !isNaN(c.niveis[anterior])) {
			let nivelAnterior = nivelDaDistancia(distanciaDaLeitura(c, anterior));
			taxa = arredondar((nivel - nivelAnterior) / 1, 2); // diferença em 1 hora = % por hora
		}

		let situacao = minutos > MINUTOS_PARA_SEM_LEITURA ? 'Sem leitura' : situacaoDoNivel(nivel, c.tipo);
		let peso = 1;
		if (situacao == 'Sem leitura') peso = 2;
		else if (nivel >= 100) peso = 5;
		else if (situacao == 'Critico') peso = 4;
		else if (situacao == 'Atencao') peso = 3;

		let proximo = null;
		let horas = null;
		if (situacao != 'Sem leitura') {
			let alvo = c.tipo.atencao;
			proximo = 'atenção';
			if (situacao == 'Critico') {
				alvo = 100;
				proximo = 'cheio';
			} else if (situacao == 'Atencao') {
				alvo = c.tipo.critico;
				proximo = 'crítico';
			}
			if (nivel >= 100) {
				horas = 0;
			} else if (taxa != null && taxa > 0.05) {
				horas = arredondar((alvo - nivel) / taxa, 1);
			}
		}

		return {
			idPrefeitura: 1, idPonto: c.idPonto, rua: c.rua, bairro: c.bairro,
			idCompartimento: c.idCompartimento, tipoResiduo: c.tipo.nome, prioridade: c.tipo.prioridade, alturaCm: ALTURA_EXEMPLO,
			idSensor: c.idSensor, numeroSensor: c.numeroSensor, sensorAtivo: 1,
			limiteAtencao: c.tipo.atencao, limiteCritico: c.tipo.critico,
			dataHora: dataHora.toISOString(), distanciaCm: distancia, nivelPct: nivel,
			minutosDesdeLeitura: minutos, situacao: situacao, taxaPorHora: taxa,
			pesoSituacao: peso, proximoLimite: proximo, horasProximoLimite: horas
		};
	}

	// ORDER BY da C1: pesoSituacao DESC, prioridade, horas (sem previsão no fim), nivelPct DESC
	function ordemDaC1(a, b) {
		if (a.pesoSituacao != b.pesoSituacao) return b.pesoSituacao - a.pesoSituacao;
		if (a.prioridade != b.prioridade) return a.prioridade - b.prioridade;
		let ha = a.horasProximoLimite == null ? Infinity : a.horasProximoLimite;
		let hb = b.horasProximoLimite == null ? Infinity : b.horasProximoLimite;
		if (ha != hb) return ha - hb;
		return b.nivelPct - a.nivelPct;
	}

	let linhasEstado = compartimentos.map(linhaDoEstado).sort(ordemDaC1);

	// V2 vw_ponto_situacao: pior situação entre os compartimentos COM leitura
	let pontosSituacao = {};
	let listaPontos = [];
	for (let i = 0; i < linhasEstado.length; i++) {
		let l = linhasEstado[i];
		if (pontosSituacao[l.idPonto] == undefined) {
			pontosSituacao[l.idPonto] = { idPonto: l.idPonto, bairro: l.bairro, pesoComLeitura: null };
			listaPontos.push(pontosSituacao[l.idPonto]);
		}
		let ponto = pontosSituacao[l.idPonto];
		if (l.situacao != 'Sem leitura' && (ponto.pesoComLeitura == null || l.pesoSituacao > ponto.pesoComLeitura)) {
			ponto.pesoComLeitura = l.pesoSituacao;
		}
	}
	for (let i = 0; i < listaPontos.length; i++) {
		let peso = listaPontos[i].pesoComLeitura;
		listaPontos[i].situacaoPonto = peso == null ? 'Sem leitura' : peso >= 4 ? 'Critico' : peso == 3 ? 'Atencao' : 'Normal';
	}

	// V4 vw_resumo_prefeitura (C8)
	let resumo = {
		idPrefeitura: 1, totalCompartimentos: linhasEstado.length,
		compartimentosCriticos: 0, compartimentosAtencao: 0, compartimentosNormais: 0,
		compartimentosProximas6h: 0, sensoresSemLeitura: 0, pctComLeitura: 0,
		ultimaLeitura: null, minutosDesdeUltimaLeitura: null,
		totalPontos: listaPontos.length, pontosCriticos: 0, pontosAtencao: 0, pontosParaColetar: 0
	};
	let maisRecente = null;
	for (let i = 0; i < linhasEstado.length; i++) {
		let l = linhasEstado[i];
		if (l.situacao == 'Critico') resumo.compartimentosCriticos++;
		if (l.situacao == 'Atencao') resumo.compartimentosAtencao++;
		if (l.situacao == 'Normal') resumo.compartimentosNormais++;
		if (l.situacao == 'Normal' && l.horasProximoLimite != null && l.horasProximoLimite <= 6) resumo.compartimentosProximas6h++;
		if (l.situacao == 'Sem leitura') resumo.sensoresSemLeitura++;
		if (maisRecente == null || l.dataHora > maisRecente) maisRecente = l.dataHora;
	}
	resumo.pctComLeitura = arredondar((linhasEstado.length - resumo.sensoresSemLeitura) / linhasEstado.length * 100, 1);
	resumo.ultimaLeitura = maisRecente;
	resumo.minutosDesdeUltimaLeitura = Math.floor((agora.getTime() - new Date(maisRecente).getTime()) / 60000);
	for (let i = 0; i < listaPontos.length; i++) {
		if (listaPontos[i].situacaoPonto == 'Critico') resumo.pontosCriticos++;
		if (listaPontos[i].situacaoPonto == 'Atencao') resumo.pontosAtencao++;
	}
	resumo.pontosParaColetar = resumo.pontosCriticos + resumo.pontosAtencao;

	// V3 vw_resumo_bairro (C9), já na ordem da consulta
	let porBairro = {};
	let bairros = [];
	for (let i = 0; i < listaPontos.length; i++) {
		let p = listaPontos[i];
		if (porBairro[p.bairro] == undefined) {
			porBairro[p.bairro] = { idPrefeitura: 1, bairro: p.bairro, totalPontos: 0, pontosCriticos: 0, pontosAtencao: 0, pontosNormais: 0 };
			bairros.push(porBairro[p.bairro]);
		}
		let b = porBairro[p.bairro];
		b.totalPontos++;
		if (p.situacaoPonto == 'Critico') b.pontosCriticos++;
		else if (p.situacaoPonto == 'Atencao') b.pontosAtencao++;
		else b.pontosNormais++;
	}
	bairros.sort(function (a, b) {
		return (b.pontosCriticos - a.pontosCriticos) || (b.pontosAtencao - a.pontosAtencao) || a.bairro.localeCompare(b.bairro, 'pt-BR');
	});

	function compartimentosDoPonto(idPonto) {
		return compartimentos.filter(function (c) { return c.idPonto == idPonto; });
	}

	// C3a a C3d: histórico do ponto. 24 h = leitura bruta; os outros períodos
	// devolvem o MAIOR nível de cada hora, bloco de 6 h ou dia (MAX + GROUP BY)
	function historico(idPonto, periodo) {
		let inicio;
		let chaveDoIntervalo;
		if (periodo == '24h') {
			inicio = agora.getTime() - 24 * 3600000;
		} else if (periodo == '7d') {
			inicio = agora.getTime() - 7 * 24 * 3600000;
			chaveDoIntervalo = function (d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()); };
		} else if (periodo == '30d') {
			inicio = agora.getTime() - 30 * 24 * 3600000;
			chaveDoIntervalo = function (d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate(), Math.floor(d.getHours() / 6) * 6); };
		} else {
			inicio = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - 89).getTime();
			chaveDoIntervalo = function (d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
		}

		let linhas = [];
		let doPonto = compartimentosDoPonto(idPonto);
		for (let k = 0; k < doPonto.length; k++) {
			let c = doPonto[k];
			let base = { idCompartimento: c.idCompartimento, tipoResiduo: c.tipo.nome, prioridade: c.tipo.prioridade, numeroSensor: c.numeroSensor, limiteAtencao: c.tipo.atencao, limiteCritico: c.tipo.critico };
			let intervalos = {};
			let ordem = [];
			for (let i = 0; i < passos; i++) {
				let instante = instanteDaLeitura(c, i);
				if (instante < inicio || isNaN(c.niveis[i])) continue;
				let distancia = distanciaDaLeitura(c, i);
				let nivel = nivelDaDistancia(distancia);
				if (periodo == '24h') {
					linhas.push(Object.assign({ inicioIntervalo: new Date(instante).toISOString(), distanciaCm: distancia, nivelPct: nivel }, base));
					continue;
				}
				let chave = textoDataHoraSql(chaveDoIntervalo(new Date(instante)));
				if (intervalos[chave] == undefined) {
					intervalos[chave] = nivel;
					ordem.push(chave);
				} else if (nivel > intervalos[chave]) {
					intervalos[chave] = nivel;
				}
			}
			for (let j = 0; j < ordem.length; j++) {
				linhas.push(Object.assign({ inicioIntervalo: ordem[j], nivelPct: intervalos[ordem[j]] }, base));
			}
		}
		return linhas;
	}

	// C4 vw_ultima_coleta_ponto: última coleta do ponto, com o nível de cada compartimento
	function ultimaColeta(idPonto) {
		let coleta = null;
		for (let i = 0; i < coletas.length; i++) {
			if (coletas[i].idPonto == idPonto) coleta = coletas[i]; // a lista está em ordem de horário
		}
		if (coleta == null) return [];
		let doPonto = compartimentosDoPonto(idPonto);
		let linhas = coleta.itens.map(function (item) {
			let c = doPonto.filter(function (x) { return x.idCompartimento == item.idCompartimento; })[0];
			return {
				idPonto: idPonto, idColeta: coleta.idColeta, dataHoraColeta: coleta.dataHora.toISOString(),
				minutosDesdeColeta: Math.floor((agora.getTime() - coleta.dataHora.getTime()) / 60000),
				idCompartimento: c.idCompartimento, tipoResiduo: c.tipo.nome, prioridade: c.tipo.prioridade,
				percentualAntes: item.percentualAntes, limiteAtencao: c.tipo.atencao, limiteCritico: c.tipo.critico,
				situacaoNaColeta: situacaoDoNivel(item.percentualAntes, c.tipo)
			};
		});
		return linhas.sort(function (a, b) { return a.prioridade - b.prioridade; });
	}

	// C6: leituras do ponto em uma data ('AAAA-MM-DD'), da mais nova para a mais antiga
	function leiturasDoDia(idPonto, data) {
		let partes = data.split('-');
		let inicio = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2])).getTime();
		let fim = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]) + 1).getTime();
		let linhas = [];
		let doPonto = compartimentosDoPonto(idPonto);
		for (let k = 0; k < doPonto.length; k++) {
			let c = doPonto[k];
			for (let i = 0; i < passos; i++) {
				let instante = instanteDaLeitura(c, i);
				if (instante < inicio || instante >= fim || isNaN(c.niveis[i])) continue;
				let distancia = distanciaDaLeitura(c, i);
				linhas.push({
					dataHora: new Date(instante).toISOString(), idCompartimento: c.idCompartimento,
					tipoResiduo: c.tipo.nome, prioridade: c.tipo.prioridade, numeroSensor: c.numeroSensor,
					distanciaCm: distancia, nivelPct: nivelDaDistancia(distancia),
					situacao: situacaoDoNivel((1 - distancia / ALTURA_EXEMPLO) * 100, c.tipo)
				});
			}
		}
		return linhas.sort(function (a, b) {
			return (a.dataHora < b.dataHora ? 1 : a.dataHora > b.dataHora ? -1 : 0) || a.idCompartimento - b.idCompartimento;
		});
	}

	return {
		qtd: qtdPontos,
		linhasEstado: linhasEstado,
		resumo: resumo,
		bairros: bairros,
		historico: historico,
		ultimaColeta: ultimaColeta,
		leiturasDoDia: leiturasDoDia
	};
}

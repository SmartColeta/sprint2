// ==========================================================================
// DASHBOARD | SMARTCOLETA
// Monta as duas visões do dashboard a partir dos dados de dados-mock.js:
//   - visão geral da cidade: todos os pontos de coleta e o status de cada um
//   - visão de um ponto: por que ele está em alerta e o histórico dele
// O filtro "Visualizar" (select) e os botões dos pontos chamam abrirVisao().
// ==========================================================================

// CORES DA IDENTIDADE VISUAL (as mesmas do dashboard.css)
let CORES = {
	verde: '#02925D',
	escuro: '#00472A',
	lima: '#62C540',
	cinzado: '#5E7468',
	amarelo: '#F2B705',
	vermelho: '#D64545',
	amareloEscuro: '#8A6700',
	vermelhoEscuro: '#A82E2E'
};

let PATAMARES = {
	normal: { nome: 'Normal', cor: CORES.lima, peso: 0 },
	atencao: { nome: 'Atenção', cor: CORES.amarelo, peso: 1 },
	critico: { nome: 'Crítico', cor: CORES.vermelho, peso: 2 }
};

// ordem usada nas listas: do pior para o melhor
let ORDEM_PATAMARES = ['critico', 'atencao', 'normal'];

let META_CRITICOS_PCT = 10;  // meta: menos de 10% dos compartimentos em crítico
let META_SENSORES_PCT = 95;  // meta: 95% ou mais dos sensores ativos
let QTD_LEITURAS_RECENTES = 9;

// CHART.JS
Chart.defaults.responsive = true;
Chart.defaults.maintainAspectRatio = false; // o gráfico ocupa a altura do card (sem rolar a página)
Chart.defaults.font.family = "'DM Sans', Arial, sans-serif";
Chart.defaults.color = CORES.cinzado;

// gráficos da visão do ponto: criados uma vez e depois só atualizados
let graficoCompartimentos = null;
let graficoHistorico = null;


// --------------------------------------------------------------------------
// CÁLCULOS (no banco, a regra da disciplina só permite ROUND, COUNT, SUM,
// AVG, MAX, MIN e GROUP BY; patamar, contagens e médias ficam aqui no JS)
// --------------------------------------------------------------------------

// nível de preenchimento: mesma fórmula do SQL
// ROUND((1 - distanciaCm / alturaCm) * 100, 2)
function calcularNivel(distanciaCm, alturaCm) {
	return Math.round((1 - distanciaCm / alturaCm) * 100 * 100) / 100;
}

// normal abaixo de limiteAtencao, atenção a partir de limiteAtencao,
// crítico a partir de limiteCritico
function classificarPatamar(nivel, parametrizacao) {
	if (nivel >= parametrizacao.limiteCritico) {
		return 'critico';
	} else if (nivel >= parametrizacao.limiteAtencao) {
		return 'atencao';
	} else {
		return 'normal';
	}
}

function calcularMedia(valores) {
	let soma = 0;
	for (let i = 0; i < valores.length; i++) {
		soma = soma + valores[i];
	}
	return valores.length > 0 ? soma / valores.length : 0;
}

function calcularMaximo(valores) {
	let maximo = valores[0];
	for (let i = 1; i < valores.length; i++) {
		if (valores[i] > maximo) {
			maximo = valores[i];
		}
	}
	return maximo;
}

function buscarParametrizacao(idParametrizacao) {
	for (let i = 0; i < parametrizacoesMock.length; i++) {
		if (parametrizacoesMock[i].idParametrizacao == idParametrizacao) {
			return parametrizacoesMock[i];
		}
	}
	return null;
}

function buscarSensor(idCompartimento) {
	for (let i = 0; i < sensoresMock.length; i++) {
		if (sensoresMock[i].fkCompartimento == idCompartimento) {
			return sensoresMock[i];
		}
	}
	return null;
}

// leituras de um sensor, da mais antiga para a mais nova
// (a última da lista é a de ORDER BY dataHora DESC LIMIT 1)
function buscarLeiturasDoSensor(idSensor) {
	let leituras = [];
	for (let i = 0; i < leiturasMock.length; i++) {
		if (leiturasMock[i].fkSensor == idSensor) {
			leituras.push(leiturasMock[i]);
		}
	}
	return leituras;
}

// as datas estão no formato 'AAAA-MM-DD HH:MM:SS', então dá para
// comparar como texto: a maior é a mais recente
function buscarUltimaColeta(idCompartimento) {
	let ultima = null;
	for (let i = 0; i < coletasMock.length; i++) {
		let coleta = coletasMock[i];
		if (coleta.fkCompartimento == idCompartimento) {
			if (ultima == null || coleta.dataHoraColeta > ultima.dataHoraColeta) {
				ultima = coleta;
			}
		}
	}
	return ultima;
}

// junta ponto, compartimentos, limites, sensor e última leitura num objeto só
function montarPontos() {
	let pontos = [];

	for (let p = 0; p < pontosMock.length; p++) {
		let ponto = pontosMock[p];
		let compartimentos = [];
		let niveis = [];

		for (let c = 0; c < compartimentosMock.length; c++) {
			let compartimento = compartimentosMock[c];

			if (compartimento.fkPontoColeta == ponto.idPonto) {
				let parametrizacao = buscarParametrizacao(compartimento.fkParametrizacao);
				let sensor = buscarSensor(compartimento.idCompartimento);
				let leituras = buscarLeiturasDoSensor(sensor.idSensor);
				let ultimaLeitura = leituras[leituras.length - 1];
				let nivel = calcularNivel(ultimaLeitura.distanciaCm, compartimento.alturaCm);

				compartimentos.push({
					idCompartimento: compartimento.idCompartimento,
					tipoResiduo: compartimento.tipoResiduo,
					alturaCm: compartimento.alturaCm,
					parametrizacao: parametrizacao,
					sensor: sensor,
					leituras: leituras,
					ultimaLeitura: ultimaLeitura,
					nivel: nivel,
					patamar: classificarPatamar(nivel, parametrizacao),
					ultimaColeta: buscarUltimaColeta(compartimento.idCompartimento)
				});
				niveis.push(nivel);
			}
		}

		// o ponto fica no pior patamar entre os seus compartimentos
		let maisCheio = compartimentos[0];
		let patamar = 'normal';
		for (let i = 0; i < compartimentos.length; i++) {
			if (compartimentos[i].nivel > maisCheio.nivel) {
				maisCheio = compartimentos[i];
			}
			if (PATAMARES[compartimentos[i].patamar].peso > PATAMARES[patamar].peso) {
				patamar = compartimentos[i].patamar;
			}
		}

		pontos.push({
			idPonto: ponto.idPonto,
			rua: ponto.rua,
			bairro: ponto.bairro,
			compartimentos: compartimentos,
			patamar: patamar,
			maisCheio: maisCheio,
			nivelMedio: calcularMedia(niveis)
		});
	}

	return pontos;
}

// pontos de um patamar, na ordem da lista
function filtrarPorPatamar(pontos, patamar) {
	let resultado = [];
	for (let i = 0; i < pontos.length; i++) {
		if (pontos[i].patamar == patamar) {
			resultado.push(pontos[i]);
		}
	}
	return resultado;
}

// pior patamar primeiro: crítico, depois atenção, depois normal
function ordenarPorGravidade(pontos) {
	let ordenados = [];
	for (let i = 0; i < ORDEM_PATAMARES.length; i++) {
		let doPatamar = filtrarPorPatamar(pontos, ORDEM_PATAMARES[i]);
		for (let j = 0; j < doPatamar.length; j++) {
			ordenados.push(doPatamar[j]);
		}
	}
	return ordenados;
}

function buscarPonto(idPonto) {
	for (let i = 0; i < pontos.length; i++) {
		if (pontos[i].idPonto == idPonto) {
			return pontos[i];
		}
	}
	return null;
}


// --------------------------------------------------------------------------
// FORMATAÇÃO
// --------------------------------------------------------------------------

function formatarPct(valor) {
	return Math.round(valor) + '%';
}

// '2026-11-03 18:10:00' vira '18:10'
function formatarHora(dataHora) {
	return dataHora.split(' ')[1].slice(0, 5);
}

// '2026-11-03 18:10:00' vira '03/11'
function formatarData(dataHora) {
	let partes = dataHora.split(' ')[0].split('-');
	return partes[2] + '/' + partes[1];
}

function formatarDataHora(dataHora) {
	return formatarData(dataHora) + ' às ' + formatarHora(dataHora);
}

function nomeDoPonto(ponto) {
	return `${ponto.rua} · ${ponto.bairro}`;
}

// selo em formato de pílula (mesmo estilo dos indicadores)
function preencherSelo(idElemento, texto, patamar) {
	let selo = document.getElementById(idElemento);
	selo.innerHTML = texto;
	selo.className = `indicador-status indicador-status-${patamar}`;
}


// --------------------------------------------------------------------------
// TOPO: filtro de visão e horário da última leitura
// --------------------------------------------------------------------------

// opções do select: visão geral e os pontos agrupados por patamar
function montarFiltro(pontos) {
	let filtro = document.getElementById('filtro-visao');
	filtro.innerHTML = `<option value="0">Visão geral da cidade</option>`;

	for (let i = 0; i < ORDEM_PATAMARES.length; i++) {
		let patamar = ORDEM_PATAMARES[i];
		let doPatamar = filtrarPorPatamar(pontos, patamar);

		if (doPatamar.length > 0) {
			let opcoes = '';
			for (let j = 0; j < doPatamar.length; j++) {
				opcoes += `<option value="${doPatamar[j].idPonto}">${nomeDoPonto(doPatamar[j])}</option>`;
			}
			filtro.innerHTML += `<optgroup label="${PATAMARES[patamar].nome}">${opcoes}</optgroup>`;
		}
	}
}

// chamada pelo onchange do select
function trocarVisao() {
	let idPonto = Number(document.getElementById('filtro-visao').value);
	abrirVisao(idPonto);
}

function mostrarUltimaAtualizacao() {
	let maisRecente = leiturasMock[0].dataHora;
	for (let i = 0; i < leiturasMock.length; i++) {
		if (leiturasMock[i].dataHora > maisRecente) {
			maisRecente = leiturasMock[i].dataHora;
		}
	}
	document.getElementById('painel-atualizacao').innerHTML = `Última leitura em ${formatarDataHora(maisRecente)}`;
}


// --------------------------------------------------------------------------
// VISÃO GERAL DA CIDADE (montada uma vez, quando a página abre)
// --------------------------------------------------------------------------

function renderizarVisaoGeral(pontos) {
	let compartimentos = [];
	for (let i = 0; i < pontos.length; i++) {
		for (let j = 0; j < pontos[i].compartimentos.length; j++) {
			compartimentos.push(pontos[i].compartimentos[j]);
		}
	}

	renderizarAlerta(pontos);
	renderizarIndicadoresGerais(compartimentos);
	renderizarListaPontos(pontos);
	renderizarGraficoSensores(pontos);
	renderizarGraficoPatamares(compartimentos);
}

// PRIMEIRO CARD: alerta com os pontos em atenção e em crítico
function renderizarAlerta(pontos) {
	let criticos = filtrarPorPatamar(pontos, 'critico');
	let atencao = filtrarPorPatamar(pontos, 'atencao');

	let titulo = document.getElementById('alerta-titulo');
	let texto = document.getElementById('alerta-texto');
	let lista = document.getElementById('alerta-lista');

	// o card pega a cor do pior patamar
	let piorPatamar = 'normal';
	if (criticos.length > 0) {
		piorPatamar = 'critico';
	} else if (atencao.length > 0) {
		piorPatamar = 'atencao';
	}
	document.getElementById('alerta').className = `card alerta alerta-${piorPatamar}`;

	if (piorPatamar == 'normal') {
		titulo.innerHTML = 'Nenhum ponto de coleta em alerta';
		texto.innerHTML = 'Todos os compartimentos estão abaixo do limite de atenção.';
	} else {
		let frase = '';
		if (criticos.length > 0) {
			frase = criticos.length == 1 ? '1 ponto em nível crítico' : `${criticos.length} pontos em nível crítico`;
		}
		if (atencao.length > 0) {
			frase += frase == '' ? `${atencao.length} em atenção` : ` e ${atencao.length} em atenção`;
		}
		titulo.innerHTML = frase;
		texto.innerHTML = 'Priorize a coleta nestes pontos. Clique para ver o motivo:';
	}

	// um botão por ponto em alerta (crítico primeiro)
	let emAlerta = ordenarPorGravidade(pontos);
	lista.innerHTML = '';
	for (let i = 0; i < emAlerta.length; i++) {
		let ponto = emAlerta[i];
		if (ponto.patamar != 'normal') {
			lista.innerHTML += `
				<button class="alerta-item alerta-item-${ponto.patamar}" type="button" onclick="abrirVisao(${ponto.idPonto})"
					title="${nomeDoPonto(ponto)}: ${ponto.maisCheio.tipoResiduo} em ${formatarPct(ponto.maisCheio.nivel)}">
					<span class="alerta-item-rua">${ponto.rua}</span>
					<span class="alerta-item-nivel">${formatarPct(ponto.maisCheio.nivel)}</span>
				</button>`;
		}
	}
}

function renderizarIndicadoresGerais(compartimentos) {
	let niveis = [];
	let qtdCriticos = 0;
	let qtdAtivos = 0;
	for (let i = 0; i < compartimentos.length; i++) {
		niveis.push(compartimentos[i].nivel);
		if (compartimentos[i].patamar == 'critico') {
			qtdCriticos++;
		}
		if (compartimentos[i].sensor.statuss == 1) {
			qtdAtivos++;
		}
	}

	// ocupação média: média da última leitura de cada compartimento
	document.getElementById('kpi-ocupacao').innerHTML = formatarPct(calcularMedia(niveis));
	document.getElementById('kpi-ocupacao-descricao').innerHTML =
		`Última leitura de ${compartimentos.length} compartimentos`;

	// compartimentos em crítico, comparados com a meta
	let pctCriticos = qtdCriticos / compartimentos.length * 100;
	let criticoNaMeta = pctCriticos < META_CRITICOS_PCT;
	document.getElementById('kpi-criticos').innerHTML = qtdCriticos;
	preencherSelo('kpi-criticos-status',
		criticoNaMeta ? 'Dentro da meta' : 'Acima da meta', criticoNaMeta ? 'normal' : 'critico');
	document.getElementById('kpi-criticos-descricao').innerHTML =
		`${formatarPct(pctCriticos)} do total, meta abaixo de ${META_CRITICOS_PCT}%`;

	// sensores ativos (statuss = 1), comparados com a meta
	let pctAtivos = qtdAtivos / compartimentos.length * 100;
	let sensoresNaMeta = pctAtivos >= META_SENSORES_PCT;
	document.getElementById('kpi-sensores').innerHTML = formatarPct(pctAtivos);
	preencherSelo('kpi-sensores-status',
		sensoresNaMeta ? 'Dentro da meta' : 'Abaixo da meta', sensoresNaMeta ? 'normal' : 'critico');
	document.getElementById('kpi-sensores-descricao').innerHTML =
		`${qtdAtivos} de ${compartimentos.length} ativos, meta de ${META_SENSORES_PCT}% ou mais`;
}

// lista com todos os pontos e o status de cada um
function renderizarListaPontos(pontos) {
	let ordenados = ordenarPorGravidade(pontos);
	let lista = document.getElementById('lista-pontos');
	lista.innerHTML = '';

	for (let i = 0; i < ordenados.length; i++) {
		let ponto = ordenados[i];
		lista.innerHTML += `
			<li>
				<button class="ponto ponto-${ponto.patamar}" type="button" onclick="abrirVisao(${ponto.idPonto})">
					<span class="ponto-marcador"></span>
					<span class="ponto-nome"><span class="ponto-rua">${ponto.rua}</span><span class="ponto-bairro">${ponto.bairro}</span></span>
					<span class="ponto-nivel">${formatarPct(ponto.maisCheio.nivel)}</span>
					<span class="ponto-status">${PATAMARES[ponto.patamar].nome}</span>
				</button>
			</li>`;
	}
}

// GRÁFICO DE BARRAS: última leitura de cada sensor, agrupada por ponto
// (uma série por tipo de resíduo; cada barra tem a cor do seu patamar)
function renderizarGraficoSensores(pontos) {
	let ordenados = ordenarPorGravidade(pontos);

	// nome curto do ponto embaixo das barras ("Av. Brasil" vira "Brasil")
	let rotulos = [];
	for (let i = 0; i < ordenados.length; i++) {
		rotulos.push(ordenados[i].rua.replace('Av. ', '').replace('Rua ', ''));
	}

	let series = [];
	for (let c = 0; c < ordenados[0].compartimentos.length; c++) {
		let niveis = [];
		let cores = [];
		for (let i = 0; i < ordenados.length; i++) {
			niveis.push(ordenados[i].compartimentos[c].nivel);
			cores.push(PATAMARES[ordenados[i].compartimentos[c].patamar].cor);
		}
		series.push({
			label: ordenados[0].compartimentos[c].tipoResiduo,
			data: niveis,
			backgroundColor: cores,
			borderRadius: 4,
			categoryPercentage: 0.8,
			barPercentage: 0.9
		});
	}

	new Chart(document.getElementById('grafico-sensores'), {
		type: 'bar',
		data: {
			labels: rotulos,
			datasets: series
		},
		options: {
			plugins: {
				legend: { display: false } // as cores são de patamar, explicadas no card ao lado
			},
			scales: {
				y: {
					beginAtZero: true, // começa o resultado no 0
					max: 100, // tamanho máximo é 100
					ticks: { callback: (valor) => valor + '%' } // cada degrau formatado com %
				},
				x: {
					grid: { display: false },
					ticks: { autoSkip: false, maxRotation: 45, font: { size: 11 } }
				}
			}
		}
	});
}

// GRÁFICO DE ROSCA: compartimentos por patamar
function renderizarGraficoPatamares(compartimentos) {
	let qtdNormal = 0;
	let qtdAtencao = 0;
	let qtdCritico = 0;
	for (let i = 0; i < compartimentos.length; i++) {
		if (compartimentos[i].patamar == 'critico') {
			qtdCritico++;
		} else if (compartimentos[i].patamar == 'atencao') {
			qtdAtencao++;
		} else {
			qtdNormal++;
		}
	}

	document.getElementById('patamares-total').innerHTML = compartimentos.length;
	document.getElementById('patamar-normal').innerHTML = qtdNormal;
	document.getElementById('patamar-atencao').innerHTML = qtdAtencao;
	document.getElementById('patamar-critico').innerHTML = qtdCritico;

	new Chart(document.getElementById('grafico-patamares'), {
		type: 'doughnut',
		data: {
			labels: ['Normal', 'Atenção', 'Crítico'],
			datasets: [{
				data: [qtdNormal, qtdAtencao, qtdCritico],
				backgroundColor: [CORES.lima, CORES.amarelo, CORES.vermelho],
				borderColor: '#fff',
				borderWidth: 3
			}]
		},
		options: {
			cutout: '72%',
			plugins: { legend: { display: false } } // a legenda já está no HTML
		}
	});
}


// --------------------------------------------------------------------------
// VISÃO DE UM PONTO DE COLETA
// --------------------------------------------------------------------------

function renderizarVisaoPonto(ponto) {
	document.getElementById('painel-titulo').innerHTML = nomeDoPonto(ponto);
	document.getElementById('painel-subtitulo').innerHTML =
		`Ponto de coleta ${ponto.idPonto} · ${ponto.compartimentos.length} compartimentos · ${prefeituraMock.cidade}`;

	renderizarDiagnostico(ponto);
	renderizarIndicadoresPonto(ponto);
	renderizarGraficoCompartimentos(ponto);
	renderizarGraficoHistorico(ponto);
	renderizarLeiturasRecentes(ponto);
}

// DIAGNÓSTICO: por que este ponto está em alerta?
function renderizarDiagnostico(ponto) {
	document.getElementById('diagnostico').className = `card alerta alerta-${ponto.patamar}`;

	let lista = document.getElementById('diagnostico-lista');
	lista.innerHTML = '';
	let qtdAcimaDoLimite = 0;

	// compartimentos que passaram do limite: crítico primeiro, depois atenção
	for (let p = 0; p < ORDEM_PATAMARES.length - 1; p++) {
		for (let i = 0; i < ponto.compartimentos.length; i++) {
			let c = ponto.compartimentos[i];
			if (c.patamar == ORDEM_PATAMARES[p]) {
				let limite = c.patamar == 'critico' ? c.parametrizacao.limiteCritico : c.parametrizacao.limiteAtencao;
				lista.innerHTML += `
					<li class="diagnostico-item diagnostico-item-${c.patamar}">
						<strong>${c.tipoResiduo} em ${formatarPct(c.nivel)}</strong>
						<span>${PATAMARES[c.patamar].nome} a partir de ${limite}% · lido às ${formatarHora(c.ultimaLeitura.dataHora)}</span>
					</li>`;
				qtdAcimaDoLimite++;
			}
		}
	}

	// sensor parado também explica um alerta (o nível mostrado pode estar velho)
	for (let i = 0; i < ponto.compartimentos.length; i++) {
		let c = ponto.compartimentos[i];
		if (c.sensor.statuss != 1) {
			lista.innerHTML += `
				<li class="diagnostico-item diagnostico-item-inativo">
					<strong>Sensor ${c.sensor.numeroSensor} (${c.tipoResiduo}) inativo</strong>
					<span>Última leitura em ${formatarDataHora(c.ultimaLeitura.dataHora)}</span>
				</li>`;
		}
	}

	if (qtdAcimaDoLimite == 0) {
		document.getElementById('diagnostico-titulo').innerHTML = 'Ponto em situação normal';
		document.getElementById('diagnostico-texto').innerHTML = 'Nenhum compartimento chegou ao limite de atenção.';
	} else {
		document.getElementById('diagnostico-titulo').innerHTML =
			`Por que este ponto está em ${ponto.patamar == 'critico' ? 'nível crítico' : 'atenção'}?`;
		document.getElementById('diagnostico-texto').innerHTML = qtdAcimaDoLimite == 1
			? '1 compartimento passou do limite:'
			: `${qtdAcimaDoLimite} compartimentos passaram do limite:`;
	}
}

function renderizarIndicadoresPonto(ponto) {
	let maisCheio = ponto.maisCheio;

	document.getElementById('kpi-ponto-media').innerHTML = formatarPct(ponto.nivelMedio);

	document.getElementById('kpi-ponto-maximo').innerHTML = formatarPct(maisCheio.nivel);
	preencherSelo('kpi-ponto-maximo-status', PATAMARES[maisCheio.patamar].nome, maisCheio.patamar);
	document.getElementById('kpi-ponto-maximo-descricao').innerHTML =
		`${maisCheio.tipoResiduo}, limites de ${maisCheio.parametrizacao.limiteAtencao}% e ${maisCheio.parametrizacao.limiteCritico}%`;

	// última coleta entre todos os compartimentos do ponto
	let ultima = null;
	let tipoResiduo = '';
	for (let i = 0; i < ponto.compartimentos.length; i++) {
		let coleta = ponto.compartimentos[i].ultimaColeta;
		if (coleta != null && (ultima == null || coleta.dataHoraColeta > ultima.dataHoraColeta)) {
			ultima = coleta;
			tipoResiduo = ponto.compartimentos[i].tipoResiduo;
		}
	}

	if (ultima != null) {
		document.getElementById('kpi-ponto-coleta').innerHTML = formatarHora(ultima.dataHoraColeta);
		document.getElementById('kpi-ponto-coleta-descricao').innerHTML =
			`${tipoResiduo} em ${formatarData(ultima.dataHoraColeta)}, estava com ${formatarPct(ultima.percentualAntes)}`;
	} else {
		document.getElementById('kpi-ponto-coleta').innerHTML = '–';
		document.getElementById('kpi-ponto-coleta-descricao').innerHTML = 'Nenhuma coleta registrada';
	}
}

// GRÁFICO DE BARRAS + MARCADORES: nível de cada compartimento e os limites dele
function renderizarGraficoCompartimentos(ponto) {
	let rotulos = [];
	let niveis = [];
	let cores = [];
	let limitesAtencao = [];
	let limitesCriticos = [];

	for (let i = 0; i < ponto.compartimentos.length; i++) {
		let c = ponto.compartimentos[i];
		rotulos.push(c.tipoResiduo);
		niveis.push(c.nivel);
		cores.push(PATAMARES[c.patamar].cor);
		limitesAtencao.push(c.parametrizacao.limiteAtencao);
		limitesCriticos.push(c.parametrizacao.limiteCritico);
	}

	// o gráfico é criado na primeira vez; nas outras, só troca os dados
	if (graficoCompartimentos != null) {
		graficoCompartimentos.data.labels = rotulos;
		graficoCompartimentos.data.datasets[0].data = niveis;
		graficoCompartimentos.data.datasets[0].backgroundColor = cores;
		graficoCompartimentos.data.datasets[1].data = limitesAtencao;
		graficoCompartimentos.data.datasets[2].data = limitesCriticos;
		graficoCompartimentos.update();
	} else {
		graficoCompartimentos = new Chart(document.getElementById('grafico-compartimentos'), {
			type: 'bar',
			data: {
				labels: rotulos,
				datasets: [
					{
						label: 'Nível atual',
						data: niveis,
						backgroundColor: cores,
						borderRadius: 6,
						maxBarThickness: 48
					},
					// marcador de limite: um traço horizontal sobre cada barra
					// (cor escurecida, para aparecer mesmo em cima de uma barra amarela ou vermelha)
					{
						type: 'line',
						label: 'Limite de atenção',
						data: limitesAtencao,
						showLine: false,
						pointStyle: 'line',
						pointRadius: 24,
						pointHoverRadius: 24,
						pointBorderWidth: 3,
						borderColor: CORES.amareloEscuro,
						backgroundColor: CORES.amareloEscuro
					},
					{
						type: 'line',
						label: 'Limite crítico',
						data: limitesCriticos,
						showLine: false,
						pointStyle: 'line',
						pointRadius: 24,
						pointHoverRadius: 24,
						pointBorderWidth: 3,
						borderColor: CORES.vermelhoEscuro,
						backgroundColor: CORES.vermelhoEscuro
					}
				]
			},
			options: {
				plugins: {
					legend: { labels: { boxWidth: 12, boxHeight: 12, usePointStyle: true, font: { size: 11 } } }
				},
				scales: {
					y: { beginAtZero: true, max: 100, ticks: { callback: (valor) => valor + '%' } },
					x: { grid: { display: false }, ticks: { autoSkip: false, maxRotation: 0 } }
				}
			}
		});
	}
}

// GRÁFICO DE LINHA: histórico do ponto como um todo
// As leituras dos 3 sensores são agrupadas por hora (o GROUP BY é feito
// aqui no JS): em cada hora, a média e o máximo do nível entre os compartimentos.
function renderizarGraficoHistorico(ponto) {
	let horas = [];          // '2026-11-03 18' (data e hora, sem os minutos)
	let niveisPorHora = [];  // um vetor de níveis para cada hora

	for (let i = 0; i < ponto.compartimentos.length; i++) {
		let c = ponto.compartimentos[i];
		for (let j = 0; j < c.leituras.length; j++) {
			let hora = c.leituras[j].dataHora.slice(0, 13);

			// procura a hora na lista; se não tiver, cria
			let posicao = horas.length;
			for (let k = 0; k < horas.length; k++) {
				if (horas[k] == hora) {
					posicao = k;
				}
			}
			if (posicao == horas.length) {
				horas.push(hora);
				niveisPorHora.push([]);
			}

			niveisPorHora[posicao].push(calcularNivel(c.leituras[j].distanciaCm, c.alturaCm));
		}
	}

	let rotulos = [];
	let medias = [];
	let maximos = [];
	for (let i = 0; i < horas.length; i++) {
		rotulos.push(horas[i].slice(11, 13) + ':00');
		medias.push(Math.round(calcularMedia(niveisPorHora[i])));
		maximos.push(Math.round(calcularMaximo(niveisPorHora[i])));
	}

	if (graficoHistorico != null) {
		graficoHistorico.data.labels = rotulos;
		graficoHistorico.data.datasets[0].data = maximos;
		graficoHistorico.data.datasets[1].data = medias;
		graficoHistorico.update();
	} else {
		graficoHistorico = new Chart(document.getElementById('grafico-historico'), {
			type: 'line',
			data: {
				labels: rotulos,
				datasets: [
					{
						label: 'Compartimento mais cheio',
						data: maximos,
						borderColor: CORES.escuro,
						borderWidth: 2,
						borderDash: [6, 4],
						pointRadius: 0,
						tension: 0.3
					},
					{
						label: 'Nível médio do ponto',
						data: medias,
						borderColor: CORES.verde,
						backgroundColor: 'rgba(2, 146, 93, 0.12)',
						borderWidth: 2,
						pointRadius: 0,
						fill: true,
						tension: 0.3
					}
				]
			},
			options: {
				interaction: { mode: 'index', intersect: false }, // tooltip mostra as duas linhas da mesma hora
				plugins: {
					legend: { labels: { boxWidth: 12, boxHeight: 12, font: { size: 11 } } }
				},
				scales: {
					y: { beginAtZero: true, max: 100, ticks: { callback: (valor) => valor + '%' } },
					x: { grid: { display: false }, ticks: { maxTicksLimit: 8, maxRotation: 0 } }
				}
			}
		});
	}
}

// TABELA: leituras mais recentes dos sensores do ponto
// Percorre as leituras de trás para frente (da mais nova para a mais antiga,
// como ORDER BY dataHora DESC) até juntar QTD_LEITURAS_RECENTES.
function renderizarLeiturasRecentes(ponto) {
	let tabela = document.getElementById('tabela-leituras');
	tabela.innerHTML = '';

	let qtd = 0;
	let i = leiturasMock.length - 1;
	while (i >= 0 && qtd < QTD_LEITURAS_RECENTES) {
		let leitura = leiturasMock[i];

		for (let j = 0; j < ponto.compartimentos.length; j++) {
			let c = ponto.compartimentos[j];
			if (leitura.fkSensor == c.sensor.idSensor) {
				let nivel = calcularNivel(leitura.distanciaCm, c.alturaCm);
				let patamar = classificarPatamar(nivel, c.parametrizacao);
				tabela.innerHTML += `
					<tr>
						<td>${formatarHora(leitura.dataHora)}</td>
						<td>${c.tipoResiduo}</td>
						<td>${leitura.distanciaCm.toFixed(1).replace('.', ',')} cm</td>
						<td><span class="nivel nivel-${patamar}">${formatarPct(nivel)}</span></td>
					</tr>`;
				qtd++;
			}
		}

		i--;
	}
}


// --------------------------------------------------------------------------
// TROCA ENTRE AS VISÕES
// abrirVisao(0) mostra a visão geral; abrirVisao(3) mostra o ponto 3.
// É chamada pelo select, pelos botões dos pontos e pelo botão "Visão geral".
// --------------------------------------------------------------------------

function abrirVisao(idPonto) {
	let ponto = buscarPonto(idPonto);

	document.getElementById('filtro-visao').value = idPonto;

	if (ponto == null) {
		document.getElementById('visao-ponto').style.display = 'none';
		document.getElementById('visao-geral').style.display = 'flex';
		document.getElementById('botao-voltar').style.display = 'none';
		document.getElementById('painel-titulo').innerHTML = 'Monitoramento das lixeiras da cidade';
		document.getElementById('painel-subtitulo').innerHTML =
			`${prefeituraMock.cidade} · Saiba quais pontos estão enchendo e colete antes que o lixo transborde`;
	} else {
		// mostra a seção antes de desenhar, para o Chart.js medir o tamanho certo
		document.getElementById('visao-geral').style.display = 'none';
		document.getElementById('visao-ponto').style.display = 'flex';
		document.getElementById('botao-voltar').style.display = 'inline-block';
		renderizarVisaoPonto(ponto);
	}
}

let pontos = montarPontos();

montarFiltro(pontos);
mostrarUltimaAtualizacao();
renderizarVisaoGeral(pontos);
abrirVisao(0);

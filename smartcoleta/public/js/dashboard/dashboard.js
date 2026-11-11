// ==================================================================
// DASHBOARD | SMARTCOLETA
//
// Regra de ouro: o CÁLCULO FICA NO BANCO. Nível, situação ("sem leitura"
// inclusive), velocidade de enchimento, previsão e totais já chegam
// prontos das views (consultas C1, C3a a C3d, C4, C6, C8 e C9 do script
// src/database/tabelas_smartcoleta.sql). Este arquivo só EXIBE, FILTRA e
// ORDENA (a tabela pode ser reordenada por coluna).
//
// Hoje os dados vêm de dados-exemplo.js, que imita as mesmas consultas.
// ==================================================================


// ==================================================================
// CONFIGURAÇÃO
// ==================================================================
let CIDADE = 'Campo Novo de Rondônia';
let HORAS_EM_BREVE = 6;       // janela do indicador "Próximas 6 h" (a mesma da vw_resumo_prefeitura)
let MAX_FILA = 5;             // quantos pontos aparecem no card de alerta
let MAX_NA_ETIQUETA = 3;      // sensores sem leitura listados na etiqueta antes do "+n"
let DIAS_DE_LEITURAS = 90;    // até quantos dias atrás o card "Leituras do dia" deixa escolher

// a view devolve a situação escrita; a página usa uma chave curta
let SITUACOES = { 'Critico': 'critico', 'Atencao': 'atencao', 'Sem leitura': 'semleitura', 'Normal': 'normal' };
let NOMES = { critico: 'Crítico', atencao: 'Atenção', semleitura: 'Sem leitura', normal: 'Normal', breve: 'Próximas 6 h' };
let CORES = { critico: '#D64545', atencao: '#F2B705', normal: '#62C540', semleitura: '#9AA9A1' };

// tipos de resíduo: a prioridade vem do banco (tabela tipo_residuo); aqui ficam
// só a cor do gráfico e o texto de ajuda da etiqueta
let TIPOS_RESIDUO = {
	'Orgânico': { cor: '#8B5E34', ajuda: 'Prioridade 1: coletar primeiro' },
	'Sem distinção': { cor: '#5E6B73', ajuda: 'Prioridade 2: coletar depois do orgânico' },
	'Reciclável': { cor: '#2F7BC1', ajuda: 'Prioridade 3: pode esperar mais' }
};

// períodos do histórico. A API só aceita estas quatro chaves e escolhe a
// consulta pela chave (o valor da tela nunca entra no SQL)
let PERIODOS = {
	'24h': { rotulo: '24 h', consulta: 'C3a', horas: 24, subtitulo: 'Uma leitura a cada 15 min' },
	'7d': { rotulo: '7 dias', consulta: 'C3b', horas: 7 * 24, subtitulo: 'Maior nível de cada hora' },
	'30d': { rotulo: '30 dias', consulta: 'C3c', horas: 30 * 24, subtitulo: 'Maior nível de cada 6 h' },
	'90d': { rotulo: '90 dias', consulta: 'C3d', horas: 90 * 24, subtitulo: 'Maior nível de cada dia' }
};

// os indicadores ao lado do alerta. "total" vem do resumo da prefeitura (C8);
// a lista do "Ver todos" vem das linhas da C1, filtradas pelo MESMO critério
let INDICADORES = {
	critico: {
		titulo: 'Crítico', listaTitulo: 'Sensores em nível crítico', chips: ['critico'],
		total: function (r) { return r.compartimentosCriticos; },
		filtro: function (c) { return c.situacao == 'critico'; },
		vazio: 'Nenhum sensor em nível crítico'
	},
	atencao: {
		titulo: 'Atenção', listaTitulo: 'Sensores em atenção', chips: ['atencao'],
		total: function (r) { return r.compartimentosAtencao; },
		filtro: function (c) { return c.situacao == 'atencao'; },
		vazio: 'Nenhum sensor em atenção'
	},
	breve: {
		titulo: 'Próximas 6 h', listaTitulo: 'Entram em atenção nas próximas 6 h', chips: ['breve'],
		total: function (r) { return r.compartimentosProximas6h; },
		filtro: function (c) { return c.emBreve; },
		descricao: 'normais que entram em atenção',
		vazio: 'Nenhum sensor entra em atenção nas próximas 6 h'
	},
	semleitura: {
		titulo: 'Sensores sem leitura', listaTitulo: 'Sensores sem leitura', chips: ['semleitura'],
		total: function (r) { return r.sensoresSemLeitura; },
		filtro: function (c) { return c.situacao == 'semleitura'; },
		vazio: 'Todos os sensores enviaram leitura nos últimos 30 min'
	}
};

// ícone de alerta (triângulo) usado na etiqueta do card "Ação agora"
let ICONE_ALERTA = '<svg class="icone" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
	'<path d="M12 3 2 21h20L12 3Z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>' +
	'<path d="M12 10v5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>' +
	'<circle cx="12" cy="18" r="1.4" fill="currentColor"/></svg>';

Chart.defaults.responsive = true;
Chart.defaults.maintainAspectRatio = false; // o gráfico ocupa a altura do card
Chart.defaults.font.family = "'DM Sans', Arial, sans-serif";
Chart.defaults.color = '#5E7468';


// ==================================================================
// ESTADO DA PÁGINA
// ==================================================================
let agora = new Date();     // hora de referência (eixos dos gráficos e limites da data)
let compartimentos = [];    // um item por compartimento (linhas da C1)
let pontos = [];            // compartimentos agrupados por ponto de coleta
let pontosPorId = {};       // pontosPorId[idPonto] = ponto
let resumo = null;          // totais da prefeitura (C8)
let linhasBairros = [];     // pontos por bairro e situação (C9)
let filtro = { busca: '', bairro: '', situacoes: [] };
let ordem = { campo: 'urgencia', sentido: 1 };
let periodoHistorico = '24h';
let pontoAberto = null;     // ponto mostrado na visão do ponto
let listaAberta = null;     // { chave, botao } do painel "Ver todos" aberto
let graficoBairros = null;
let graficoHistorico = null;


// ==================================================================
// DADOS
// Cada função devolve as linhas no MESMO formato das consultas do script.
// Hoje as linhas vêm de obterExemplo() (dados-exemplo.js). Para ligar ao
// banco, troque o corpo por um fetch() na rota da API, por exemplo:
//   fetch(`/dashboard/estado/${idPrefeitura}`).then(r => r.json())
// O resto da página não muda.
// ==================================================================
function exemplo() {
	return obterExemplo(agora, Number(document.getElementById('cenario').value));
}

// visão geral: C1 (estado de cada compartimento), C8 (resumo) e C9 (bairros)
function carregarDados() {
	let ex = exemplo();
	return { linhasEstado: ex.linhasEstado, resumo: ex.resumo, bairros: ex.bairros };
}

// visão do ponto: C4 (última coleta)
function carregarPonto(idPonto) {
	return { ultimaColeta: exemplo().ultimaColeta(idPonto) };
}

// C3a a C3d: só aceita as chaves de PERIODOS (a API faz a mesma checagem)
function carregarHistorico(idPonto, periodo) {
	if (PERIODOS[periodo] == undefined) {
		return [];
	}
	return exemplo().historico(idPonto, periodo);
}

// C6: a data precisa estar no formato AAAA-MM-DD (a API faz a mesma checagem)
function carregarLeiturasDia(idPonto, data) {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
		return [];
	}
	return exemplo().leiturasDoDia(idPonto, data);
}


// ==================================================================
// PREPARAR OS DADOS: linhas do banco -> objetos da página (sem contas)
// ==================================================================
function prepararDados(dados) {
	compartimentos = [];
	pontos = [];
	pontosPorId = {};
	resumo = dados.resumo;
	linhasBairros = dados.bairros;

	for (let i = 0; i < dados.linhasEstado.length; i++) {
		let linha = dados.linhasEstado[i];
		let c = {
			idPonto: linha.idPonto, rua: linha.rua, bairro: linha.bairro,
			idCompartimento: linha.idCompartimento, tipo: linha.tipoResiduo, prioridade: Number(linha.prioridade),
			numeroSensor: linha.numeroSensor,
			limiteAtencao: Number(linha.limiteAtencao), limiteCritico: Number(linha.limiteCritico),
			dataHora: linha.dataHora ? lerData(linha.dataHora) : null,
			minutosDesdeLeitura: linha.minutosDesdeLeitura == null ? null : Number(linha.minutosDesdeLeitura),
			distanciaCm: linha.distanciaCm == null ? null : Number(linha.distanciaCm),
			nivel: linha.nivelPct == null ? null : Number(linha.nivelPct),
			situacao: SITUACOES[linha.situacao],
			peso: Number(linha.pesoSituacao),
			proximoLimite: linha.proximoLimite,
			horas: linha.horasProximoLimite == null ? null : Number(linha.horasProximoLimite)
		};
		// "Próximas 6 h": o mesmo critério da coluna compartimentosProximas6h da view
		c.emBreve = c.situacao == 'normal' && c.horas != null && c.horas <= HORAS_EM_BREVE;
		compartimentos.push(c);

		if (pontosPorId[c.idPonto] == undefined) {
			pontosPorId[c.idPonto] = { idPonto: c.idPonto, rua: c.rua, bairro: c.bairro, compartimentos: [] };
			pontos.push(pontosPorId[c.idPonto]);
		}
		pontosPorId[c.idPonto].compartimentos.push(c);
	}

	// "gatilho" = o compartimento mais urgente do ponto, entre os que têm leitura
	// (igual à vw_ponto_situacao). O ponto assume a situação dele.
	for (let i = 0; i < pontos.length; i++) {
		let ponto = pontos[i];
		let comLeitura = ponto.compartimentos.filter(function (c) { return c.situacao != 'semleitura'; });
		let ordenados = (comLeitura.length > 0 ? comLeitura : ponto.compartimentos).slice().sort(compararUrgencia);
		ponto.gatilho = ordenados[0];
		ponto.situacao = ordenados[0].situacao;
		ponto.temSemLeitura = comLeitura.length < ponto.compartimentos.length;
	}
}


// ==================================================================
// REGRA DE URGÊNCIA (fila do alerta, tabela, listas e diagnóstico)
// Compara dois compartimentos nesta ordem:
//   1. situação e 2. cheio: o pesoSituacao da view já junta as duas
//      (5 cheio, 4 crítico, 3 atenção, 2 sem leitura, 1 normal)
//   3. prioridade do tipo: 1 Orgânico, 2 Sem distinção, 3 Reciclável
//   4. previsão: menos horas até o próximo limite (sem previsão vai para o fim)
//   5. nível: o mais cheio
// A prioridade só desempata dentro da mesma situação.
// ==================================================================
function compararUrgencia(a, b) {
	if (a.peso != b.peso) {
		return b.peso - a.peso;
	}
	if (a.prioridade != b.prioridade) {
		return a.prioridade - b.prioridade;
	}
	let horasA = a.horas == null ? Infinity : a.horas;
	let horasB = b.horas == null ? Infinity : b.horas;
	if (horasA != horasB) {
		return horasA - horasB;
	}
	return (b.nivel || 0) - (a.nivel || 0);
}

// Rode no console do navegador: testarUrgencia()
// Os casos imitam linhas da view (peso e prioridade como o banco devolve).
function testarUrgencia() {
	function linha(tipo, prioridade, situacao, peso, nivel, horas) {
		return { tipo: tipo, prioridade: prioridade, situacao: situacao, peso: peso, nivel: nivel, horas: horas };
	}
	let casos = [
		{ nome: 'Orgânico crítico 94% x Reciclável crítico 96%', a: linha('Orgânico', 1, 'critico', 4, 94, 2), b: linha('Reciclável', 3, 'critico', 4, 96, 1), primeiro: 'A', motivo: 'prioridade' },
		{ nome: 'Orgânico atenção 81% x Reciclável crítico 96%', a: linha('Orgânico', 1, 'atencao', 3, 81, 2), b: linha('Reciclável', 3, 'critico', 4, 96, 1), primeiro: 'B', motivo: 'situação' },
		{ nome: 'Reciclável crítico 100% x Orgânico crítico 90%', a: linha('Reciclável', 3, 'critico', 5, 100, 0), b: linha('Orgânico', 1, 'critico', 4, 90, 3), primeiro: 'A', motivo: 'cheio' },
		{ nome: 'Sem distinção atenção 72% x Reciclável atenção 80%', a: linha('Sem distinção', 2, 'atencao', 3, 72, 6), b: linha('Reciclável', 3, 'atencao', 3, 80, 4), primeiro: 'A', motivo: 'prioridade' }
	];
	let passou = 0;
	for (let i = 0; i < casos.length; i++) {
		let caso = casos[i];
		let resultado = compararUrgencia(caso.a, caso.b) < 0 ? 'A' : 'B';
		let ok = resultado == caso.primeiro;
		if (ok) passou++;
		console.log(`${ok ? '✓' : '✗'} ${caso.nome}: vem primeiro ${resultado} (esperado ${caso.primeiro}, por ${caso.motivo})`);
	}
	console.log(`${passou} de ${casos.length} casos passaram`);
	return passou == casos.length;
}


// ==================================================================
// FORMATAÇÃO (só texto e HTML; nenhuma regra de negócio)
// ==================================================================
function doisDigitos(n) {
	return n < 10 ? '0' + n : '' + n;
}

// as datas chegam como ISO (colunas DATETIME) ou 'AAAA-MM-DD HH:MM:SS' (DATE_FORMAT)
function lerData(valor) {
	let partes = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(valor);
	if (partes) {
		return new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]), Number(partes[4]), Number(partes[5]), Number(partes[6]));
	}
	return new Date(valor);
}

function formatarHora(data) {
	return doisDigitos(data.getHours()) + ':' + doisDigitos(data.getMinutes());
}

function formatarDia(data) {
	return doisDigitos(data.getDate()) + '/' + doisDigitos(data.getMonth() + 1);
}

function formatarDataHora(data) {
	return formatarDia(data) + ' às ' + formatarHora(data);
}

// 'AAAA-MM-DD' da data local (valor do <input type="date">)
function dataParaCampo(data) {
	return `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}-${doisDigitos(data.getDate())}`;
}

function formatarHaQuanto(minutos) {
	if (minutos < 1) return 'agora';
	if (minutos < 60) return `há ${Math.round(minutos)} min`;
	if (minutos < 48 * 60) return `há ${Math.round(minutos / 60)} h`;
	return `há ${Math.round(minutos / 1440)} dias`;
}

function formatarParado(minutos) {
	if (minutos == null) return 'nunca enviou leitura';
	if (minutos < 60) return `parado há ${Math.round(minutos)} min`;
	if (minutos < 48 * 60) return `parado há ${Math.round(minutos / 60)} h`;
	return `parado há ${Math.round(minutos / 1440)} dias`;
}

function formatarHoras(horas) {
	if (horas < 1) return 'menos de 1 h';
	if (horas < 48) return `~${Math.round(horas)} h`;
	return `+${Math.floor(horas / 24)} dias`;
}

function formatarNumero(valor, casas) {
	return valor.toFixed(casas).replace('.', ',');
}

// texto da previsão a partir das colunas proximoLimite e horasProximoLimite da view
function textoPrevisao(c) {
	if (c.situacao == 'semleitura') return '';
	if (c.horas == 0) return 'Cheio';
	if (c.horas == null) return '';
	return `${c.proximoLimite} em ${formatarHoras(c.horas)}`;
}

// rua e bairro vêm do cadastro: escapar antes de colocar no HTML
function escapar(texto) {
	return String(texto).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function semAcento(texto) {
	return String(texto).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function plural(qtd, singular, varios) {
	return qtd == 1 ? singular : varios;
}

// "Av. Tancredo Neves, 120" -> "Av. Tancredo Neves" (para as frases curtas dos indicadores)
function ruaSemNumero(rua) {
	return rua.split(',')[0];
}

// tipo com a etiqueta de prioridade: "Orgânico P1"
function rotuloTipo(tipo, prioridade) {
	let config = TIPOS_RESIDUO[tipo];
	let ajuda = config ? config.ajuda : `Prioridade ${prioridade}`;
	return `${escapar(tipo)} <span class="prioridade" title="${ajuda}">P${prioridade}</span>`;
}

// barra horizontal do nível, com um traço em cada limite
function barraNivel(c) {
	let largura = c.nivel == null ? 0 : c.nivel;
	return `
		<span class="barra" title="Atenção a partir de ${c.limiteAtencao}% · crítico a partir de ${c.limiteCritico}%">
			<span class="barra-preenchimento barra-${c.situacao}" style="width:${largura}%"></span>
			<span class="barra-limite barra-limite-atencao" style="left:${c.limiteAtencao}%"></span>
			<span class="barra-limite barra-limite-critico" style="left:${c.limiteCritico}%"></span>
		</span>`;
}


// ==================================================================
// TOPO
// ==================================================================
function renderizarTopo() {
	document.getElementById('painel-subtitulo').innerHTML =
		`${CIDADE} · ${resumo.totalPontos} pontos de coleta · ${resumo.totalCompartimentos} compartimentos`;

	document.getElementById('painel-atualizacao').innerHTML = resumo.ultimaLeitura
		? `Última leitura às <strong>${formatarHora(lerData(resumo.ultimaLeitura))}</strong> (${formatarHaQuanto(resumo.minutosDesdeUltimaLeitura)})`
		: 'Nenhuma leitura recebida';
}


// ==================================================================
// ALERTA: quais pontos coletar e em que ordem
// ==================================================================
function renderizarAlerta() {
	// fila = pontos críticos e em atenção, pelo compartimento que disparou (gatilho)
	let fila = pontos.filter(function (p) { return p.situacao == 'critico' || p.situacao == 'atencao'; });
	fila.sort(function (a, b) { return compararUrgencia(a.gatilho, b.gatilho); });

	let card = document.getElementById('alerta');
	let rotulo = document.getElementById('alerta-rotulo');
	let total = resumo.pontosParaColetar;

	if (resumo.pontosCriticos > 0) {
		card.className = 'card alerta alerta-critico';
		rotulo.innerHTML = ICONE_ALERTA + 'Ação agora';
		document.getElementById('alerta-numero').innerHTML = total;
		document.getElementById('alerta-titulo').innerHTML = plural(total, 'ponto para coletar', 'pontos para coletar');
		document.getElementById('alerta-texto').innerHTML =
			`<strong>${resumo.pontosCriticos} ${plural(resumo.pontosCriticos, 'crítico', 'críticos')}</strong>: coletar agora.<br>` +
			(resumo.pontosAtencao > 0 ? `<strong>${resumo.pontosAtencao} em atenção</strong>: incluir na mesma rota.` : '');
	} else if (resumo.pontosAtencao > 0) {
		card.className = 'card alerta alerta-atencao';
		rotulo.innerHTML = ICONE_ALERTA + 'Programar coleta';
		document.getElementById('alerta-numero').innerHTML = total;
		document.getElementById('alerta-titulo').innerHTML = plural(total, 'ponto em atenção', 'pontos em atenção');
		document.getElementById('alerta-texto').innerHTML = 'Nenhum crítico. Programe a coleta destes pontos antes que cheguem ao limite crítico.';
	} else {
		card.className = 'card alerta alerta-normal';
		rotulo.innerHTML = 'Tudo em ordem';
		document.getElementById('alerta-numero').innerHTML = '0';
		document.getElementById('alerta-titulo').innerHTML = 'pontos para coletar';
		document.getElementById('alerta-texto').innerHTML = 'Todos os compartimentos estão abaixo do limite de atenção.';
	}

	// lista: se não há ponto em alerta, mostra os próximos a entrar em atenção
	let lista = fila;
	let legenda = 'Ordem sugerida: situação, depois prioridade do resíduo';
	if (fila.length == 0) {
		lista = pontos.filter(function (p) { return p.gatilho.horas != null; })
			.sort(function (a, b) { return a.gatilho.horas - b.gatilho.horas; });
		legenda = 'Próximos a entrar em atenção';
	}
	document.getElementById('fila-legenda').innerHTML = legenda;

	let html = '';
	let mostrar = Math.min(lista.length, MAX_FILA);
	for (let i = 0; i < mostrar; i++) {
		let ponto = lista[i];
		let g = ponto.gatilho;
		html += `
			<li>
				<button class="fila-item fila-item-${ponto.situacao}" type="button" onclick="abrirPonto(${ponto.idPonto})"
					title="Abrir ${escapar(ponto.rua)}">
					<span class="fila-posicao">${i + 1}</span>
					<span class="fila-local">
						<span class="fila-rua">${escapar(ponto.rua)}</span>
						<span class="fila-bairro">${escapar(ponto.bairro)}</span>
					</span>
					<span class="fila-motivo">${rotuloTipo(g.tipo, g.prioridade)} <strong>${Math.round(g.nivel)}%</strong></span>
					<span class="fila-previsao">${textoPrevisao(g)}</span>
					<span class="fila-seta" aria-hidden="true">&rsaquo;</span>
				</button>
			</li>`;
	}
	document.getElementById('fila').innerHTML = html;

	let botaoTodos = document.getElementById('fila-ver-todos');
	if (fila.length > MAX_FILA) {
		botaoTodos.hidden = false;
		botaoTodos.innerHTML = `Ver os ${fila.length} pontos na tabela &rarr;`;
	} else {
		botaoTodos.hidden = true;
	}
}

function mostrarPontosEmAlerta() {
	filtrarSituacao(['critico', 'atencao']);
}


// ==================================================================
// INDICADORES (coluna ao lado do alerta) e painel "Ver todos"
// ==================================================================

// sensores de um indicador, do mais urgente para o menos urgente
function listaDoIndicador(chave) {
	return compartimentos.filter(INDICADORES[chave].filtro).sort(compararUrgencia);
}

// frase do sensor citado: "Sensor 101 · Av. Tancredo Neves · Orgânico 94%"
function fraseDoSensor(c) {
	let detalhe = c.situacao == 'semleitura'
		? formatarParado(c.minutosDesdeLeitura)
		: `${escapar(c.tipo)} ${Math.round(c.nivel)}%`;
	return `<strong>Sensor ${c.numeroSensor}</strong> · ${escapar(ruaSemNumero(c.rua))} · ${detalhe}`;
}

// cada indicador tem 3 linhas: título e "Ver todos" | quantidade | sensor citado
function renderizarIndicador(chave) {
	let config = INDICADORES[chave];
	let total = config.total(resumo);
	let lista = listaDoIndicador(chave);
	let caixa = document.getElementById('indicador-' + chave);

	let botao = total == 0 ? '' : `
		<button class="ver-todos" type="button" aria-expanded="false" aria-controls="painel-lista"
			onclick="alternarLista('${chave}', this)">Ver todos (${lista.length})</button>`;

	// ao lado do número: a etiqueta vermelha dos sensores parados ("Sem leitura: 127, 185 +2"),
	// a % com leitura ou a explicação do indicador
	let extra = '';
	if (chave == 'semleitura') {
		if (total > 0) {
			let numeros = lista.slice(0, MAX_NA_ETIQUETA).map(function (c) { return c.numeroSensor; }).join(', ');
			let resto = lista.length > MAX_NA_ETIQUETA ? ` +${lista.length - MAX_NA_ETIQUETA}` : '';
			extra += `<span class="indicador-status indicador-status-critico">Sem leitura: ${numeros}${resto}</span>`;
		}
		extra += `<span class="indicador-descricao">${formatarNumero(Number(resumo.pctComLeitura), 0)}% com leitura</span>`;
	} else if (config.descricao) {
		extra = `<span class="indicador-descricao">${config.descricao}</span>`;
	}

	let citado = total == 0
		? `<span class="indicador-citado indicador-vazio">${config.vazio}</span>`
		: `<span class="indicador-citado" title="${fraseDoSensor(lista[0]).replace(/<[^>]+>/g, '')}">${fraseDoSensor(lista[0])}</span>`;

	caixa.innerHTML = `
		<span class="indicador-cabecalho">
			<span class="indicador-titulo">${config.titulo}</span>
			${botao}
		</span>
		<span class="indicador-linha">
			<span class="indicador-dado">${total}</span>
			<span class="indicador-unidade">${plural(total, 'sensor', 'sensores')}</span>
			${extra}
		</span>
		${citado}`;
}

function renderizarIndicadores() {
	fecharLista();
	let chaves = Object.keys(INDICADORES);
	for (let i = 0; i < chaves.length; i++) {
		renderizarIndicador(chaves[i]);
	}
}

// abre o painel com a lista completa; clicar de novo no mesmo botão fecha
function alternarLista(chave, botao) {
	if (listaAberta && listaAberta.chave == chave) {
		fecharLista();
		return;
	}
	fecharLista();
	let config = INDICADORES[chave];
	let lista = listaDoIndicador(chave);

	let html = '';
	for (let i = 0; i < lista.length; i++) {
		let c = lista[i];
		let detalhe = c.situacao == 'semleitura'
			? formatarParado(c.minutosDesdeLeitura)
			: `<strong class="nivel-${c.situacao}">${Math.round(c.nivel)}%</strong>${textoPrevisao(c) ? ' · ' + textoPrevisao(c) : ''}`;
		html += `
			<li>
				<button class="lista-item" type="button" onclick="abrirPontoDaLista(${c.idPonto})">
					<span class="lista-sensor">Sensor ${c.numeroSensor}</span>
					<span class="lista-local">${escapar(c.rua)} · ${escapar(c.bairro)}</span>
					<span class="lista-tipo">${rotuloTipo(c.tipo, c.prioridade)}</span>
					<span class="lista-detalhe">${detalhe}</span>
				</button>
			</li>`;
	}
	document.getElementById('painel-lista-titulo').innerHTML = `${config.listaTitulo} (${lista.length})`;
	document.getElementById('painel-lista-itens').innerHTML = html;

	let painel = document.getElementById('painel-lista');
	painel.hidden = false;
	listaAberta = { chave: chave, botao: botao };
	botao.setAttribute('aria-expanded', 'true');
	posicionarLista(botao);
	painel.querySelector('.painel-lista-fechar').focus();
}

// popover ao lado do card (à esquerda, onde há espaço); em tela pequena, modal centralizado
function posicionarLista(botao) {
	let painel = document.getElementById('painel-lista');
	let fundo = document.getElementById('painel-lista-fundo');
	let modal = window.innerWidth < 720;
	painel.classList.toggle('painel-lista-modal', modal);
	fundo.hidden = !modal;
	if (modal) {
		painel.style.left = '';
		painel.style.top = '';
		return;
	}
	let card = botao.closest('.indicador').getBoundingClientRect();
	let largura = painel.offsetWidth;
	let altura = painel.offsetHeight;
	let esquerda = card.left - largura - 12;
	if (esquerda < 8) {
		esquerda = Math.max(8, card.right - largura);
	}
	let topo = Math.min(Math.max(8, card.top), window.innerHeight - altura - 8);
	painel.style.left = esquerda + 'px';
	painel.style.top = Math.max(8, topo) + 'px';
}

function fecharLista() {
	if (listaAberta == null) return;
	let botao = listaAberta.botao;
	listaAberta = null;
	document.getElementById('painel-lista').hidden = true;
	document.getElementById('painel-lista-fundo').hidden = true;
	if (botao && document.body.contains(botao)) {
		botao.setAttribute('aria-expanded', 'false');
		botao.focus();
	}
}

function abrirPontoDaLista(idPonto) {
	fecharLista();
	abrirPonto(idPonto);
}

// "Filtrar na tabela": aplica nos chips o mesmo critério da lista
function filtrarPelaLista() {
	let chips = INDICADORES[listaAberta.chave].chips;
	fecharLista();
	filtrarSituacao(chips);
}

// o painel fecha com Esc e com clique fora dele
document.addEventListener('keydown', function (evento) {
	if (evento.key == 'Escape' && listaAberta) {
		fecharLista();
	}
});
document.addEventListener('mousedown', function (evento) {
	if (listaAberta == null) return;
	let painel = document.getElementById('painel-lista');
	if (!painel.contains(evento.target) && !listaAberta.botao.contains(evento.target)) {
		fecharLista();
	}
});
window.addEventListener('resize', function () {
	if (listaAberta) posicionarLista(listaAberta.botao);
});


// ==================================================================
// TABELA DE COMPARTIMENTOS: filtros, chips e ordenação
// ==================================================================
function renderizarFiltros() {
	// bairros em ordem alfabética
	let bairros = [];
	for (let i = 0; i < pontos.length; i++) {
		if (bairros.indexOf(pontos[i].bairro) == -1) bairros.push(pontos[i].bairro);
	}
	bairros.sort(function (a, b) { return a.localeCompare(b, 'pt-BR'); });

	let opcoes = '<option value="">Todos os bairros</option>';
	for (let i = 0; i < bairros.length; i++) {
		opcoes += `<option value="${escapar(bairros[i])}">${escapar(bairros[i])}</option>`;
	}
	let select = document.getElementById('filtro-bairro');
	select.innerHTML = opcoes;
	select.value = filtro.bairro;
}

function passaNaSituacao(c, situacao) {
	if (situacao == 'breve') return c.emBreve;
	return c.situacao == situacao;
}

function passaNosFiltros(c, ignorarSituacao) {
	if (filtro.bairro != '' && c.bairro != filtro.bairro) return false;
	if (filtro.busca != '') {
		let texto = semAcento(`${c.rua} ${c.bairro} ${c.tipo} ${c.numeroSensor}`);
		if (texto.indexOf(semAcento(filtro.busca)) == -1) return false;
	}
	if (!ignorarSituacao && filtro.situacoes.length > 0) {
		let passa = false;
		for (let i = 0; i < filtro.situacoes.length; i++) {
			if (passaNaSituacao(c, filtro.situacoes[i])) passa = true;
		}
		if (!passa) return false;
	}
	return true;
}

function renderizarChips() {
	// as quantidades respeitam a busca e o bairro, para o gestor ver o efeito do filtro
	let qtd = { todos: 0, critico: 0, atencao: 0, breve: 0, semleitura: 0, normal: 0 };
	for (let i = 0; i < compartimentos.length; i++) {
		let c = compartimentos[i];
		if (!passaNosFiltros(c, true)) continue;
		qtd.todos++;
		qtd[c.situacao]++;
		if (c.emBreve) qtd.breve++;
	}
	let chips = ['critico', 'atencao', 'breve', 'semleitura', 'normal'];
	let html = `<button type="button" class="chip ${filtro.situacoes.length == 0 ? 'chip-ativo' : ''}" onclick="filtrarSituacao([])">Todos <span>${qtd.todos}</span></button>`;
	for (let i = 0; i < chips.length; i++) {
		let s = chips[i];
		let ativo = filtro.situacoes.length == 1 && filtro.situacoes[0] == s;
		html += `<button type="button" class="chip chip-${s} ${ativo ? 'chip-ativo' : ''}" onclick="filtrarSituacao(['${s}'])">
			<i></i>${NOMES[s]} <span>${qtd[s]}</span></button>`;
	}
	document.getElementById('chips').innerHTML = html;
}

// comparação "natural" de cada coluna; o sentido inverte ao clicar de novo
function compararPorCampo(a, b) {
	let campo = ordem.campo;
	let r = 0;
	if (campo == 'urgencia') {
		r = compararUrgencia(a, b);
	} else if (campo == 'ponto') {
		r = a.rua.localeCompare(b.rua, 'pt-BR') || a.idCompartimento - b.idCompartimento;
	} else if (campo == 'compartimento') {
		r = (a.prioridade - b.prioridade) || compararUrgencia(a, b);
	} else if (campo == 'nivel') {
		r = (b.nivel || 0) - (a.nivel || 0);
	} else if (campo == 'previsao') {
		r = (a.horas == null ? Infinity : a.horas) - (b.horas == null ? Infinity : b.horas);
	} else if (campo == 'leitura') {
		r = (b.minutosDesdeLeitura == null ? Infinity : b.minutosDesdeLeitura) - (a.minutosDesdeLeitura == null ? Infinity : a.minutosDesdeLeitura); // mais antiga primeiro
	}
	if (isNaN(r)) r = 0;
	return r * ordem.sentido;
}

function renderizarTabela() {
	let visiveis = compartimentos.filter(function (c) { return passaNosFiltros(c, false); });
	visiveis.sort(compararPorCampo);

	let html = '';
	for (let i = 0; i < visiveis.length; i++) {
		let c = visiveis[i];
		let nivelTexto = c.nivel == null ? '—' : Math.round(c.nivel) + '%';
		let leitura = c.dataHora ? formatarHaQuanto(c.minutosDesdeLeitura) : 'nunca';
		html += `
			<tr tabindex="0" onclick="abrirPonto(${c.idPonto})"
				onkeydown="if (event.key == 'Enter') abrirPonto(${c.idPonto})"
				title="Abrir ${escapar(c.rua)}">
				<td><span class="situacao situacao-${c.situacao}">${NOMES[c.situacao]}</span></td>
				<td class="col-ponto"><span class="ponto-rua">${escapar(c.rua)}</span><span class="ponto-bairro">${escapar(c.bairro)}</span></td>
				<td>${rotuloTipo(c.tipo, c.prioridade)}<span class="sensor-num">sensor ${c.numeroSensor}</span></td>
				<td><span class="nivel-celula">${barraNivel(c)}<span class="nivel-texto">${nivelTexto}</span></span></td>
				<td class="col-previsao">${textoPrevisao(c) || '—'}</td>
				<td class="col-leitura">${leitura}</td>
			</tr>`;
	}
	document.getElementById('tabela-corpo').innerHTML = html;
	document.getElementById('tabela-vazia').hidden = visiveis.length > 0;
	document.getElementById('tabela-contagem').innerHTML =
		visiveis.length == compartimentos.length
			? `${compartimentos.length} compartimentos · mais urgente primeiro`
			: `${visiveis.length} de ${compartimentos.length} · <button type="button" class="link" onclick="limparFiltros()">limpar filtros</button>`;

	// seta no cabeçalho da coluna ordenada
	let botoes = document.querySelectorAll('.card-tabela th button');
	for (let i = 0; i < botoes.length; i++) {
		let b = botoes[i];
		b.className = b.dataset.campo == ordem.campo ? (ordem.sentido == 1 ? 'ordenado' : 'ordenado invertido') : '';
	}
}

function atualizarTabela() {
	renderizarChips();
	renderizarTabela();
}

function filtrarSituacao(situacoes) {
	filtro.situacoes = situacoes;
	atualizarTabela();
	document.getElementById('card-tabela').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function aoBuscar() {
	filtro.busca = document.getElementById('filtro-busca').value.trim();
	atualizarTabela();
}

function aoEscolherBairro() {
	filtro.bairro = document.getElementById('filtro-bairro').value;
	atualizarTabela();
	atualizarGraficoBairros();
}

function limparFiltros() {
	filtro = { busca: '', bairro: '', situacoes: [] };
	document.getElementById('filtro-busca').value = '';
	document.getElementById('filtro-bairro').value = '';
	atualizarTabela();
	atualizarGraficoBairros();
}

function ordenarPor(campo) {
	if (ordem.campo == campo) {
		ordem.sentido = -ordem.sentido;
	} else {
		ordem = { campo: campo, sentido: 1 };
	}
	renderizarTabela();
}


// ==================================================================
// GRÁFICO: PONTOS POR BAIRRO (barras horizontais empilhadas, consulta C9)
// ==================================================================
function atualizarGraficoBairros() {
	// as linhas da C9 já vêm na ordem: mais críticos e em atenção primeiro
	let nomes = linhasBairros.map(function (b) { return b.bairro; });

	// o bairro filtrado fica destacado; os outros, mais claros
	function cor(base, nome) {
		return filtro.bairro == '' || filtro.bairro == nome ? base : base + '55';
	}
	let dados = {
		labels: nomes,
		datasets: [
			{ label: 'Crítico', corBase: CORES.critico, data: linhasBairros.map(function (b) { return Number(b.pontosCriticos); }), backgroundColor: nomes.map(function (n) { return cor(CORES.critico, n); }) },
			{ label: 'Atenção', corBase: CORES.atencao, data: linhasBairros.map(function (b) { return Number(b.pontosAtencao); }), backgroundColor: nomes.map(function (n) { return cor(CORES.atencao, n); }) },
			{ label: 'Normal', corBase: '#B9E3A8', data: linhasBairros.map(function (b) { return Number(b.pontosNormais); }), backgroundColor: nomes.map(function (n) { return cor('#B9E3A8', n); }) }
		]
	};

	if (graficoBairros == null) {
		graficoBairros = new Chart(document.getElementById('graficoBairros'), {
			type: 'bar',
			data: dados,
			options: {
				indexAxis: 'y', // barras deitadas: nomes de bairro longos cabem
				datasets: { bar: { borderRadius: 3, maxBarThickness: 22, borderSkipped: false, borderWidth: 1, borderColor: '#fff' } },
				plugins: {
					legend: {
						position: 'bottom',
						labels: {
							boxWidth: 10, boxHeight: 10, font: { size: 11 },
							// a legenda usa a cor cheia, mesmo com um bairro filtrado (barras claras)
							generateLabels: function (chart) {
								return chart.data.datasets.map(function (d, i) {
									return { text: d.label, fillStyle: d.corBase, strokeStyle: d.corBase, lineWidth: 0, hidden: !chart.isDatasetVisible(i), datasetIndex: i, fontColor: '#5E7468' };
								});
							}
						}
					},
					tooltip: { callbacks: { label: function (ctx) { return ` ${ctx.dataset.label}: ${ctx.raw} ${plural(ctx.raw, 'ponto', 'pontos')}`; } } }
				},
				scales: {
					x: { stacked: true, beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#EEF3F0' } },
					y: { stacked: true, grid: { display: false }, ticks: { autoSkip: false, font: { size: 11 } } }
				},
				onClick: function (evento, itens) {
					if (itens.length == 0) return;
					let nome = linhasBairros[itens[0].index].bairro;
					filtro.bairro = filtro.bairro == nome ? '' : nome; // clicar de novo tira o filtro
					document.getElementById('filtro-bairro').value = filtro.bairro;
					atualizarTabela();
					atualizarGraficoBairros();
				},
				onHover: function (evento, itens) {
					evento.native.target.style.cursor = itens.length > 0 ? 'pointer' : 'default';
				}
			}
		});
	} else {
		graficoBairros.data = dados;
		graficoBairros.update();
	}
}


// ==================================================================
// VISÃO DE UM PONTO
// ==================================================================
function abrirPonto(idPonto) {
	let ponto = pontosPorId[idPonto];
	if (ponto == undefined) return;
	pontoAberto = ponto;
	fecharLista();

	let dadosPonto = carregarPonto(idPonto);

	document.getElementById('visao-geral').hidden = true;
	document.getElementById('visao-ponto').hidden = false;
	document.getElementById('botao-voltar').hidden = false;
	document.getElementById('painel-titulo').innerHTML = `${escapar(ponto.rua)} · ${escapar(ponto.bairro)}`;
	document.getElementById('painel-subtitulo').innerHTML =
		`Ponto de coleta ${ponto.idPonto} · ${ponto.compartimentos.length} compartimentos · ${CIDADE}`;
	window.scrollTo(0, 0);

	renderizarDiagnostico(ponto);
	renderizarUltimaColeta(dadosPonto.ultimaColeta);
	renderizarSeletorPeriodo();
	renderizarHistorico();
	prepararCampoData();
	renderizarLeiturasDia();
}

function voltarVisaoGeral() {
	pontoAberto = null;
	document.getElementById('visao-ponto').hidden = true;
	document.getElementById('visao-geral').hidden = false;
	document.getElementById('botao-voltar').hidden = true;
	document.getElementById('painel-titulo').innerHTML = 'Monitoramento das lixeiras';
	renderizarTopo();
}

// DIAGNÓSTICO: o que fazer com este ponto e por quê
function renderizarDiagnostico(ponto) {
	let card = document.getElementById('diagnostico');
	let rotulo = document.getElementById('diag-rotulo');
	let titulo = document.getElementById('diag-titulo');
	let texto = document.getElementById('diag-texto');
	let g = ponto.gatilho;
	let qtd = ponto.compartimentos.length;
	let previsao = textoPrevisao(g);

	if (ponto.situacao == 'critico') {
		card.className = 'card alerta diagnostico alerta-critico';
		rotulo.innerHTML = ICONE_ALERTA + 'Ação agora';
		titulo.innerHTML = `Coletar agora: ${escapar(g.tipo)} em ${Math.round(g.nivel)}%`;
		texto.innerHTML = `Passou do limite crítico (${g.limiteCritico}%)${previsao && previsao != 'Cheio' ? ' e fica ' + previsao : ''}. O caminhão recolhe os ${qtd} compartimentos do ponto.`;
	} else if (ponto.situacao == 'atencao') {
		card.className = 'card alerta diagnostico alerta-atencao';
		rotulo.innerHTML = ICONE_ALERTA + 'Programar coleta';
		titulo.innerHTML = `Incluir na próxima rota: ${escapar(g.tipo)} em ${Math.round(g.nivel)}%`;
		texto.innerHTML = `Passou do limite de atenção (${g.limiteAtencao}%)${previsao ? ' e chega ao ' + previsao : ''}. O caminhão recolhe os ${qtd} compartimentos do ponto.`;
	} else if (ponto.situacao == 'semleitura') {
		card.className = 'card alerta diagnostico alerta-semleitura';
		rotulo.innerHTML = 'Manutenção';
		titulo.innerHTML = 'Sem leitura dos sensores';
		texto.innerHTML = 'Verifique os sensores no local antes de decidir a coleta.';
	} else {
		card.className = 'card alerta diagnostico alerta-normal';
		rotulo.innerHTML = 'Sem necessidade de coleta';
		titulo.innerHTML = 'Todos os compartimentos abaixo do limite de atenção';
		texto.innerHTML = previsao ? `O primeiro a chegar ao limite é o ${escapar(g.tipo)}: ${previsao}.` : 'Nenhum compartimento enchendo no momento.';
	}
	if (ponto.temSemLeitura && ponto.situacao != 'semleitura') {
		texto.innerHTML += ' <strong>Há sensor sem leitura neste ponto.</strong>';
	}

	// um compartimento por linha, do mais urgente para o menos urgente
	let lista = ponto.compartimentos.slice().sort(compararUrgencia);
	let html = '';
	for (let i = 0; i < lista.length; i++) {
		let c = lista[i];
		let detalhe = c.situacao == 'semleitura'
			? `sensor ${c.numeroSensor} ${formatarParado(c.minutosDesdeLeitura)}`
			: `${textoPrevisao(c) ? textoPrevisao(c) + ' · ' : ''}limites ${c.limiteAtencao}% / ${c.limiteCritico}%`;
		html += `
			<li class="diag-item">
				<span class="diag-tipo">${rotuloTipo(c.tipo, c.prioridade)}</span>
				${barraNivel(c)}
				<span class="diag-nivel nivel-${c.situacao}">${c.nivel == null ? '—' : Math.round(c.nivel) + '%'}</span>
				<span class="diag-detalhe">${detalhe}</span>
			</li>`;
	}
	document.getElementById('diag-lista').innerHTML = html;
}

// ÚLTIMA COLETA: nível de cada compartimento na hora da coleta (C4, tabela N:M)
function renderizarUltimaColeta(linhas) {
	if (linhas.length == 0) {
		document.getElementById('coleta-data').innerHTML = 'Nenhuma';
		document.getElementById('coleta-ha').innerHTML = 'Este ponto ainda não teve coleta registrada.';
		document.getElementById('coleta-itens').innerHTML = '';
		document.getElementById('coleta-nota').innerHTML = '';
		return;
	}
	let data = lerData(linhas[0].dataHoraColeta);
	document.getElementById('coleta-data').innerHTML = formatarDataHora(data);
	document.getElementById('coleta-ha').innerHTML = `${formatarHaQuanto(Number(linhas[0].minutosDesdeColeta))} · nível de cada compartimento na hora da coleta`;

	let html = '';
	let tarde = false;
	for (let i = 0; i < linhas.length; i++) {
		let l = linhas[i];
		let situacao = SITUACOES[l.situacaoNaColeta];
		if (situacao == 'critico') tarde = true;
		html += `<li><span>${rotuloTipo(l.tipoResiduo, l.prioridade)}</span><strong class="nivel-${situacao}">${Math.round(Number(l.percentualAntes))}%</strong></li>`;
	}
	document.getElementById('coleta-itens').innerHTML = html;
	document.getElementById('coleta-nota').innerHTML = tarde
		? 'Coletada com compartimento já em nível crítico: vale antecipar a próxima.'
		: 'Coletada antes do nível crítico.';
	document.getElementById('coleta-nota').className = tarde ? 'coleta-nota coleta-nota-tarde' : 'coleta-nota';
}


// ---------- HISTÓRICO POR COMPARTIMENTO (consultas C3a a C3d) ----------

// botões 24 h | 7 dias | 30 dias | 90 dias
function renderizarSeletorPeriodo() {
	let html = '';
	let chaves = Object.keys(PERIODOS);
	for (let i = 0; i < chaves.length; i++) {
		let chave = chaves[i];
		let ativo = chave == periodoHistorico;
		html += `<button type="button" class="${ativo ? 'ativo' : ''}" aria-pressed="${ativo}" onclick="escolherPeriodo('${chave}')">${PERIODOS[chave].rotulo}</button>`;
	}
	document.getElementById('seletor-periodo').innerHTML = html;
	document.getElementById('historico-subtitulo').innerHTML = PERIODOS[periodoHistorico].subtitulo;
}

function escolherPeriodo(chave) {
	if (PERIODOS[chave] == undefined || pontoAberto == null) return;
	periodoHistorico = chave;
	renderizarSeletorPeriodo();
	renderizarHistorico();
}

// início do eixo X: 24 h, 7 e 30 dias contam a partir de agora; 90 dias, a partir da meia-noite (como a C3d)
function inicioDoPeriodo(chave) {
	if (chave == '90d') {
		return new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - 89).getTime();
	}
	return agora.getTime() - PERIODOS[chave].horas * 3600000;
}

// marcas do eixo X em horários "redondos": de 3 em 3 h (24 h) ou à meia-noite
function marcasDoEixo(chave, minimo, maximo) {
	let marcas = [];
	if (chave == '24h') {
		let d = new Date(minimo);
		d.setMinutes(0, 0, 0);
		d.setHours(Math.ceil(d.getHours() / 3) * 3);
		for (; d.getTime() <= maximo; d.setHours(d.getHours() + 3)) {
			if (d.getTime() >= minimo) marcas.push({ value: d.getTime() });
		}
		return marcas;
	}
	let passoDias = chave == '7d' ? 1 : chave == '30d' ? 5 : 15;
	let d = new Date(maximo);
	d.setHours(0, 0, 0, 0);
	for (; d.getTime() >= minimo; d.setDate(d.getDate() - passoDias)) {
		marcas.unshift({ value: d.getTime() });
	}
	return marcas;
}

// título do tooltip: data e hora (ou o intervalo que o ponto representa)
function tituloDoIntervalo(chave, inicio) {
	let d = new Date(inicio);
	if (chave == '24h') return formatarDataHora(d);
	if (chave == '7d') return `${formatarDataHora(d)} · maior nível da hora`;
	if (chave == '30d') {
		let fim = new Date(inicio + 6 * 3600000);
		return `${formatarDia(d)}, ${doisDigitos(d.getHours())}h às ${doisDigitos(fim.getHours())}h · maior nível do bloco`;
	}
	return `${formatarDia(d)} · máximo do dia`;
}

// tooltip com TODOS os compartimentos no horário apontado: acha o ponto mais
// próximo e junta o ponto de cada linha com o mesmo horário (até meio intervalo)
Chart.Interaction.modes.mesmoHorario = function (chart, evento, opcoes, usarFinal) {
	let maisProximo = Chart.Interaction.modes.nearest(chart, evento, { axis: 'x', intersect: false }, usarFinal);
	if (maisProximo.length == 0) return [];
	let x = maisProximo[0].element.x;
	let tolerancia = 4;
	let itens = [];
	chart.data.datasets.forEach(function (conjunto, indice) {
		let meta = chart.getDatasetMeta(indice);
		if (meta.hidden) return;
		let melhor = null;
		meta.data.forEach(function (elemento, j) {
			let distancia = Math.abs(elemento.x - x);
			if (distancia <= tolerancia && (melhor == null || distancia < melhor.distancia)) {
				melhor = { element: elemento, datasetIndex: indice, index: j, distancia: distancia };
			}
		});
		if (melhor) itens.push(melhor);
	});
	return itens;
};

function renderizarHistorico() {
	let ponto = pontoAberto;
	let chave = periodoHistorico;
	let linhas = carregarHistorico(ponto.idPonto, chave);

	// uma linha (dataset) por compartimento, na ordem de prioridade
	let porCompartimento = ponto.compartimentos.slice().sort(function (a, b) { return a.prioridade - b.prioridade; });
	let datasets = [];
	for (let i = 0; i < porCompartimento.length; i++) {
		let c = porCompartimento[i];
		let pontosLinha = [];
		for (let j = 0; j < linhas.length; j++) {
			if (linhas[j].idCompartimento == c.idCompartimento) {
				pontosLinha.push({ x: lerData(linhas[j].inicioIntervalo).getTime(), y: Number(linhas[j].nivelPct) });
			}
		}
		let cor = TIPOS_RESIDUO[c.tipo] ? TIPOS_RESIDUO[c.tipo].cor : '#00472A';
		datasets.push({
			label: `${c.tipo} P${c.prioridade} (sensor ${c.numeroSensor})`,
			data: pontosLinha,
			borderColor: cor, backgroundColor: cor,
			borderWidth: 2, pointRadius: 0, pointHoverRadius: 4, tension: chave == '24h' ? 0.25 : 0,
			limiteAtencao: c.limiteAtencao, limiteCritico: c.limiteCritico // usados no tooltip
		});
	}

	let minimo = inicioDoPeriodo(chave);
	let maximo = agora.getTime();

	if (graficoHistorico == null) {
		graficoHistorico = new Chart(document.getElementById('graficoHistorico'), {
			type: 'line',
			data: { datasets: datasets },
			options: {
				parsing: false,
				animation: false,
				interaction: { mode: 'mesmoHorario', intersect: false },
				plugins: {
					legend: { position: 'bottom', labels: { boxWidth: 12, boxHeight: 3, font: { size: 11 } } },
					tooltip: {
						callbacks: {
							title: function (itens) { return tituloDoIntervalo(periodoHistorico, itens[0].parsed.x); },
							label: function (item) {
								let d = item.dataset;
								return ` ${d.label}: ${formatarNumero(item.parsed.y, 1)}% (atenção ${d.limiteAtencao}%, crítico ${d.limiteCritico}%)`;
							}
						}
					}
				},
				scales: {
					x: {
						type: 'linear', min: minimo, max: maximo,
						afterBuildTicks: function (eixo) { eixo.ticks = marcasDoEixo(periodoHistorico, eixo.min, eixo.max); },
						ticks: {
							autoSkip: true, autoSkipPadding: 12, maxRotation: 0, // em tela estreita, esconde as marcas que não cabem
							callback: function (valor) {
								let d = new Date(valor);
								return periodoHistorico == '24h' ? formatarHora(d) : formatarDia(d);
							}
						},
						grid: { display: false }
					},
					y: { min: 0, max: 100, ticks: { stepSize: 25, callback: function (valor) { return valor + '%'; } }, grid: { color: '#EEF3F0' } }
				}
			}
		});
	} else {
		graficoHistorico.data.datasets = datasets;
		graficoHistorico.options.scales.x.min = minimo;
		graficoHistorico.options.scales.x.max = maximo;
		graficoHistorico.update();
	}
}


// ---------- LEITURAS DO DIA (consulta C6) ----------

// o campo de data começa em hoje e aceita até 90 dias atrás
function prepararCampoData() {
	let campo = document.getElementById('leituras-data');
	let minimo = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - DIAS_DE_LEITURAS);
	campo.min = dataParaCampo(minimo);
	campo.max = dataParaCampo(agora);
	campo.value = campo.max;
}

function aoEscolherData() {
	let campo = document.getElementById('leituras-data');
	// data fora do intervalo ou vazia (o teclado deixa digitar): volta para hoje
	if (!/^\d{4}-\d{2}-\d{2}$/.test(campo.value) || campo.value < campo.min || campo.value > campo.max) {
		campo.value = campo.max;
	}
	renderizarLeiturasDia();
}

function renderizarLeiturasDia() {
	let data = document.getElementById('leituras-data').value;
	let linhas = carregarLeiturasDia(pontoAberto.idPonto, data);
	let partes = data.split('-');
	let diaTexto = `${partes[2]}/${partes[1]}`;

	let html = '';
	for (let i = 0; i < linhas.length; i++) {
		let l = linhas[i];
		html += `
			<tr>
				<td>${formatarHora(lerData(l.dataHora))}</td>
				<td>${rotuloTipo(l.tipoResiduo, l.prioridade)}</td>
				<td>${l.numeroSensor}</td>
				<td>${formatarNumero(Number(l.distanciaCm), 1)} cm</td>
				<td><strong class="nivel-${SITUACOES[l.situacao]}">${Math.round(Number(l.nivelPct))}%</strong></td>
			</tr>`;
	}
	document.getElementById('leituras-corpo').innerHTML = html;
	// volta a lista para o topo (a leitura mais nova) ao trocar de data
	document.getElementById('leituras-rolagem').scrollTop = 0;

	let vazio = linhas.length == 0;
	document.getElementById('leituras-rolagem').hidden = vazio;
	document.getElementById('leituras-vazia').hidden = !vazio;
	document.getElementById('leituras-vazia').innerHTML = `Nenhuma leitura em ${diaTexto}`;
	document.getElementById('leituras-contagem').innerHTML = vazio
		? 'Escolha outra data'
		: `${linhas.length} ${plural(linhas.length, 'leitura', 'leituras')} em ${diaTexto} · mais nova primeiro`;
}


// ==================================================================
// INICIALIZAÇÃO
// ==================================================================
function atualizarTudo() {
	agora = new Date();
	prepararDados(carregarDados());
	renderizarTopo();
	renderizarAlerta();
	renderizarIndicadores();
	renderizarFiltros();
	atualizarTabela();
	atualizarGraficoBairros();
}

function trocarCenario() {
	exemploAtual = null;
	limparFiltros();
	voltarVisaoGeral();
	atualizarTudo();
}


// começa aqui (no fim do script, depois de todas as variáveis declaradas)
atualizarTudo();
// Com o banco: atualizar a cada 1 min (o sensor manda leitura a cada 15 min)
// setInterval(atualizarTudo, 60000);

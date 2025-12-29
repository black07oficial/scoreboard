/**
 * Banner Streaming Server
 * Servidor Express + Socket.IO para streaming do banner via web
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

let io = null;
let server = null;
let app = null;

// Estado atual do banner (para novos clientes)
let bannerState = {
    cronometro: '00:00',
    periodo: '1',
    time01: { gols: '00', faltas: '00', sigla: 'N/D', logo: '' },
    time02: { gols: '00', faltas: '00', sigla: 'N/D', logo: '' },
    exclusoesTime1: [],
    exclusoesTime2: [],
    cores: {},
    tempoAtaque: '45',
    mostrarAtaque: true,
    gestorLogo: '',
    gestorFundoColor: '',
    camisaVisitadaColor: '',
    camisaVisitanteColor: ''
};

function startServer(port = 3000) {
    if (server) {
        console.log('[Banner Server] Servidor já está rodando');
        return { app, server, io };
    }

    app = express();
    server = http.createServer(app);
    io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    // Servir arquivos estáticos
    app.use('/assets', express.static(path.join(__dirname, '../views/assests')));
    app.use('/resources', express.static(path.join(__dirname, '../resources')));
    app.use('/views', express.static(path.join(__dirname, '../views')));

    // Servir logos das configurações (caminho absoluto no Windows/Linux)
    app.use('/config-logos', express.static('/'));

    // Rota principal do banner
    app.get('/banner', (req, res) => {
        res.sendFile(path.join(__dirname, '../views/banner-web.html'));
    });

    // Rota para obter estado atual
    app.get('/api/state', (req, res) => {
        res.json(bannerState);
    });

    // Socket.IO conexões
    io.on('connection', (socket) => {
        console.log('[Banner Server] Cliente conectado:', socket.id);

        // Enviar estado atual para novo cliente
        socket.emit('fullState', bannerState);

        socket.on('disconnect', () => {
            console.log('[Banner Server] Cliente desconectado:', socket.id);
        });
    });

    server.listen(port, '0.0.0.0', () => {
        console.log(`[Banner Server] Servidor rodando em http://localhost:${port}/banner`);
        console.log(`[Banner Server] Acesso na rede: http://<seu-ip>:${port}/banner`);
    });

    server.on('error', (e) => {
        if (e.code === 'EADDRINUSE') {
            console.log('[Banner Server] Porta em uso, servidor provavelmente já rodando...');
            // Se falhou ao iniciar, não devemos manter a referência inválida
            // Mas aqui 'server' é a instância que falhou, então talvez devamos mantê-la?
            // Não, se falhou o listen, essa instância é inútil.
            // Mas o fato de ter dado EADDRINUSE significa que existe OUTRO server rodando.
            // Se a variável 'server' era null antes de entrarmos aqui (que seria o caso, pois checamos no início),
            // então perdemos a referência do server anterior de alguma forma ou é outro processo.
        } else {
            console.error('[Banner Server] Erro no servidor:', e);
        }
    });

    return { app, server, io };
}

// Funções para atualizar o estado e emitir para clientes
function updateCronometro(time) {
    bannerState.cronometro = time;
    if (io) io.emit('updateCronometro', time);
}

function updatePontuacao(data) {
    const { inputOrigin, pontuacao, pontuacaoFormatada } = data;

    switch (inputOrigin) {
        case '#input-periodo':
            bannerState.periodo = pontuacao;
            break;
        case '#input-gols-time-01':
            bannerState.time01.gols = pontuacaoFormatada;
            break;
        case '#input-gols-time-02':
            bannerState.time02.gols = pontuacaoFormatada;
            break;
        case '#input-faltas-time-01':
            bannerState.time01.faltas = pontuacaoFormatada;
            break;
        case '#input-faltas-time-02':
            bannerState.time02.faltas = pontuacaoFormatada;
            break;
        case '#input-tempo-ataque':
            bannerState.tempoAtaque = pontuacaoFormatada;
            break;
    }

    if (io) io.emit('updatePontuacao', data);
}

function updateExclusao(data) {
    console.log('[Banner Server] Exclusão recebida:', JSON.stringify(data));
    if (data.tabela === 'lista-time-1') {
        bannerState.exclusoesTime1 = data.lista;
    } else {
        bannerState.exclusoesTime2 = data.lista;
    }
    if (io) io.emit('updateExclusao', data);
}

function updateConfig(configType, data) {
    bannerState[configType] = data;
    if (io) io.emit('updateConfig', { type: configType, data });
}

function updateTeamInfo(teamId, data) {
    if (teamId === '1') {
        bannerState.time01 = { ...bannerState.time01, ...data };
    } else {
        bannerState.time02 = { ...bannerState.time02, ...data };
    }
    if (io) io.emit('updateTeamInfo', { teamId, data });
}

// Atualiza configurações completas (logos, cores, siglas)
function updateFullConfig(config) {
    if (config.gestorLogo) bannerState.gestorLogo = config.gestorLogo;
    if (config.gestorFundoColor) bannerState.gestorFundoColor = config.gestorFundoColor;
    if (config.time01) bannerState.time01 = { ...bannerState.time01, ...config.time01 };
    if (config.time02) bannerState.time02 = { ...bannerState.time02, ...config.time02 };
    if (config.camisaVisitadaColor) bannerState.camisaVisitadaColor = config.camisaVisitadaColor;
    if (config.camisaVisitanteColor) bannerState.camisaVisitanteColor = config.camisaVisitanteColor;
    if (typeof config.mostrarAtaque !== 'undefined') bannerState.mostrarAtaque = config.mostrarAtaque;

    if (io) io.emit('updateFullConfig', config);
}

// Atualiza visibilidade do tempo de ataque
function updateMostrarAtaque(mostrar) {
    bannerState.mostrarAtaque = mostrar;
    if (io) io.emit('updateMostrarAtaque', mostrar);
}

function stopServer() {
    if (server) {
        server.close(() => {
            console.log('[Banner Server] Servidor fechado com sucesso');
        });

        // Forçar fechamento de todas as conexões do Socket.IO
        if (io) {
            io.close();
            io = null;
        }

        server = null;
        app = null;
        console.log('[Banner Server] Parando servidor...');
    } else {
        console.log('[Banner Server] Servidor já está parado ou não foi iniciado');
    }
}

module.exports = {
    startServer,
    stopServer,
    updateCronometro,
    updatePontuacao,
    updateExclusao,
    updateConfig,
    updateTeamInfo,
    updateFullConfig,
    updateMostrarAtaque,
    getBannerState: () => bannerState
};

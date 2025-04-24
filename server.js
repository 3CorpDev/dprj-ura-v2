const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");
const AmiClient = require('asterisk-ami-client');
const cron = require('node-cron');
const mongoose = require('mongoose');

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const amiConfig = {
    host: process.env.NODE_ENV == 'development' ? '127.0.0.1' : process.env.ASTERISK_HOST_ATTIMO || '06.attimotelecom.com.br',
    port: process.env.NODE_ENV == 'development' ? '5038' : process.env.ASTERISK_PORT_ATTIMO || '5038',
    username: process.env.NODE_ENV == 'development' ? 'T16_3Corp_int_verde' : process.env.ASTERISK_USERNAME_ATTIMO || 'T16_3Corp_int_verde',
    password: process.env.NODE_ENV == 'development' ? 'nC5vRSuV7$%e35&6hgR576r6tGFr$' : process.env.ASTERISK_PASSWORD_ATTIMO || 'nC5vRSuV7$%e35&6hgR576r6tGFr$'
};

let io;

const initializeSocketIO = (server) => {
    io = new Server(server, {
        cors: {
            origin: "*",
        },
    });

    const users = {};

    io.on("connection", (socket) => {
        console.log("Usuário conectado:", socket.id);

        socket.on("register", (userId) => {
            users[userId] = socket.id;
            console.log("Usuário registrado:", userId);
        });

        socket.on("disconnect", () => {
            console.log("Usuário desconectado:", socket.id);
            for (const [userId, socketId] of Object.entries(users)) {
                if (socketId === socket.id) {
                    delete users[userId];
                }
            }
        });
    });

    return io;
};

// Função para atualizar o status das chamadas ativas para false
const atualizarStatusChamadas = async () => {
    try {
        console.log('Iniciando atualização de status de chamadas ativas para inativas...');
        
        // Conectar ao MongoDB se ainda não estiver conectado
        if (mongoose.connection.readyState !== 1) {
            await mongoose.connect(process.env.MONGODB_URI, {
                dbName: 'ura_dprj',
                useNewUrlParser: true,
                useUnifiedTopology: true
            });
        }
        
        // Atualizar todas as chamadas com status ativo para inativo
        const resultado = await mongoose.connection.db.collection('records').updateMany(
            { active: true },
            { $set: { active: false } }
        );
        
        console.log(`Atualização concluída: ${resultado.modifiedCount} chamadas atualizadas para inativas.`);
    } catch (erro) {
        console.error('Erro ao atualizar status das chamadas:', erro);
    }
};

app.prepare().then(async () => {
    const server = createServer((req, res) => {
        const parsedUrl = parse(req.url, true);
        handle(req, res, parsedUrl);
    });

    const amiClient = new AmiClient();

    try {
        await amiClient.connect(amiConfig.username, amiConfig.password, {
            host: amiConfig.host,
            port: Number(amiConfig.port)
        });
        console.log('Conectado ao AMI ATTIMO');

        amiClient.on('Newstate', (event) => {
            if (event.ChannelStateDesc == "Up" && (event.Context == "T16_cos-CRC" || event.Context == "T16_cos-all")) { //T16 é o id do tenant da DPRJ
                io.emit('queueCallerJoin', {
                    callerNumber: event.ConnectedLineNum,
                    extension: event.CallerIDNum,
                    uniqueId: event.Uniqueid,
                    linkedId: event.Linkedid,
                    timestamp: new Date().toISOString()
                });
            }
        });

        amiClient.on('QueueMemberPause', (event) => {
            if (event.Queue.startsWith("T16_")) { //T16 é o id do tenant da DPRJ
                io.emit('queueMemberPause', {
                    extension: event.MemberName,
                    paused: event.Paused == '1' ? true : false,
                    lastPause: event.LastPause,
                    pausedReason: event.PausedReason,
                    queue: event.Queue.split('_')[1],
                    timestamp: new Date().toISOString()
                });
            }
        });

        amiClient.on('QueueMemberRemoved', (event) => {
            if (event.Queue.startsWith("T16_")) { //T16 é o id do tenant da DPRJ
                io.emit('queueMemberRemoved', {
                    extension: event.MemberName,
                    paused: event.Paused == '1' ? true : false,
                    lastPause: event.LastPause,
                    pausedReason: event.PausedReason,
                    queue: event.Queue.split('_')[1],
                    timestamp: new Date().toISOString()
                });
            }
        });

        amiClient.on('Hangup', (event) => {
            if (event.ChannelStateDesc == "Up" && (event.Context == "T16_cos-CRC" || event.Context == "T16_cos-all")) { //T16 é o id do tenant da DPRJ
                io.emit('queueCallerLeave', {
                    callerNumber: event.ConnectedLineNum,
                    extension: event.CallerIDNum,
                    uniqueId: event.Uniqueid,
                    linkedId: event.Linkedid,
                    timestamp: new Date().toISOString()
                });
            }
        });

    } catch (error) {
        console.error('Erro ao conectar com AMI:', error);
    }

    initializeSocketIO(server);

    // Configurar tarefa cron para executar todos os dias às 01:00
    cron.schedule('54 0 * * *', () => {
        console.log('Executando tarefa agendada: atualização de status de chamadas');
        atualizarStatusChamadas();
    });

    const PORT = process.env.PORT || 3003;
    server.listen(PORT, (err) => {
        if (err) throw err;
        console.log(`> Servidor rodando em http://localhost:${PORT}`);
        console.log('> Tarefa agendada configurada para executar diariamente às 01:00');
    });
});
const http = require("http");

http.createServer((req, res) => {
    res.writeHead(200, 
        { "content-type": "text/plain"});
        res.end("Seu script está rodando!\n");
}).listen(3000, "0.0.0.0", () => {
    console.log("Servidor rodando na porta 3000.");
});

//mongo
cosnt mongoURI = process.env.MONGO_URI;
const mongoose = require("mongoose");
const Notification = require("./Notification.js");
mongoose.connect(mongoURI).then(console.log("conectado ao banco de dados."))

const axios = require("axios");
const URL = "https://api.coincap.io/v2/assets";
const INTERVAL = 10000; //10 secs

book = {}
alerts = []
symbols = []
adminNumber = "556293871869@c.us"
alertsQuantity = 0


const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: 'sessionFolder'
    })
});

client.on('qr', qr => {
    qrcode.generate(qr, {small: true});
});

client.on('ready', () => {
    console.log('Tudo certo! WhatsApp conectado.');
});

let userStates = {};

const LIMIT_OF_ALERTS_PER_USER = 3

// funcoes

// get to the db
const getAlertById = async (id) => {
    return await Notification.find({userId: id});
}

// remove to the db
const deleteAlert = async (alert) => {
    const id = alert._id.toString();
    try {
        await Notification.findByIdAndDelete(id);
    } catch (err) {
        console.log(err)
    }
}

const createDeleteMessage = (alerts) => {
    const emojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
    let message = "Aqui estão os alertas configurados:  \n"

    alerts.forEach((alert, index) => {
        const newMessage = `${emojis[index]} ${alert.symbol} - $${alert.price}\n`
        message += newMessage
    })

    message += `\nDigite o número do alerta que deseja remover (ex.: 1).`
    return message
}

const createVisualizeMessage = (alerts) => {
    const emojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
    let message = "Aqui estão os alertas configurados:  \n"
    alerts.forEach((alert, index) => {
        const newMessage = `${emojis[index]} ${alert.symbol} - $${alert.price}\n`
        message += newMessage
    })

    message += "\nSe precisar de mais alguma coisa, é só chamar!";
    return message;
}

// respostas as msgs

client.on('message', async msg => { 

    const chatId = msg.from;
    const message = msg.body.toLowerCase();
    const alertas = await getAlertById(chatId);
    const alertas_usuario = Array.isArray(alertas) ? alertas : [alertas];
    const nenhum_alerta = alertas_usuario.length == 0;

    if (!userStates[chatId]) {
        userStates[chatId] = { state: "inicial" };
    }

    const userState = userStates[chatId];

    switch (userState.state) {

        case "inicial":
            if (nenhum_alerta) {
                await client.sendMessage(chatId, 'Envie "alerta" para configurar um alerta.');
                userState.state = "menu_inicial";
            } else {
                await client.sendMessage(chatId, 'Envie "alerta" para configurar outro alerta.')
                await client.sendMessage(chatId, 'Envie "remover" ou "visualizar" para remover ou visualizar alertas existentes.')
                userState.state = "menu_avancado";
            }
            break;

        case "menu_inicial":
            if (message == "alerta") {
                if (alertas_usuario.length >= LIMIT_OF_ALERTS_PER_USER) {
                    await client.sendMessage(chatId, `Você já alcançou o limite de ${LIMIT_OF_ALERTS_PER_USER} alertas ativos.`);
                    await client.sendMessage(chatId, 'Envie "remover" para remover um alerta existente.')
                    userState.state = "menu_limite";
                } else {
                    await client.sendMessage(chatId, "Agora envie o símbolo do criptoativo (ex.: BTC, ETH).");
                    userState.state = "alerta_01";
                }
            } else {
                await client.sendMessage(chatId, 'Por favor, envie "alerta" para continuar.');
            }
            break;   

        case "menu_avancado":
            if (message == "alerta") {
                if (alertas_usuario.length >= LIMIT_OF_ALERTS_PER_USER) {
                    await client.sendMessage(chatId, `Você já alcançou o limite de ${LIMIT_OF_ALERTS_PER_USER} alertas ativos.`);
                    await client.sendMessage(chatId, 'Envie "remover" para remover um alerta existente.');
                    userState.state = "menu_limite";
                } else {
                    await client.sendMessage(chatId, "Agora envie o símbolo do criptoativo (ex.: BTC, ETH).");
                    userState.state = "alerta_01";
                }
            } else if (message == "remover") {
                await client.sendMessage(chatId, createDeleteMessage(alertas_usuario));
                userState.state = "remover";
            } else if (message == "visualizar") {
                await client.sendMessage(chatId, createVisualizeMessage(alertas_usuario));
                userState.state = "inicial";
            } else {
                await client.sendMessage(chatId, 'Por favor, envie "alerta", "remover" ou "visualizar" para continuar.')
            }
            break;

        case "menu_limite":
            if (message == "remover") {
                await client.sendMessage(chatId, createDeleteMessage(alertas_usuario));
                userState.state = "remover";
            } else {
                await client.sendMessage(chatId, "Tranquilo, você não precisa remover seus alertas!");
                await client.sendMessage(chatId, "Basta aguardar eles serem ativados antes de configurar mais alertas.");
                userState.state = "inicial";
            }
            break;

        case "alerta_01":
            if (symbols.includes(message.toUpperCase())) {
                userState.cryptoSymbol = message.toUpperCase();
                await client.sendMessage(chatId, `Você escolheu ${userState.cryptoSymbol}. Agora digite o preço desejado para o alerta.`);
                userState.state = "alerta_02";
            } else {
                await client.sendMessage(chatId, 'Por favor, envie um símbolo válido (ex.: BTC, ETH).');
            }
            break;

        case "remover":
            let index;
            if (!isNaN(message)) {
                index = parseFloat(message) - 1;
                const alertToRemove = alertas_usuario[index];
                if (alertToRemove) {
                    deleteAlert(alertas_usuario[index]);
                    await client.sendMessage(chatId, `O alerta para ${alertToRemove.symbol} com preço $${alertToRemove.price} foi removido com sucesso. ✅`)
                    await client.sendMessage(chatId, "Se precisar de mais alguma coisa, é só chamar!");
                    userState.state = "inicial";
                } else {
                    await client.sendMessage(chatId, "Por favor, envie uma opção válida.")
                }
            } else {
                await client.sendMessage(chatId, "Por favor, envie o número do alerta que deseja remover.")
            }
            break;

        case "alerta_02":
            const price = parseFloat(message);
            if (!isNaN(price) && price > 0) { 
                userState.price = price;
                await client.sendMessage(chatId, `Você será notificado assim que o *${userState.cryptoSymbol}* atingir o preço de *$${userState.price}*.🚀`);
                addAlert(chatId, userState.cryptoSymbol, userState.price);
                userState.state = "inicial";
                await client.sendMessage(chatId, "Se precisar de mais alguma coisa, é só chamar!")
            } else {
                await client.sendMessage(chatId, 'Por favor, envie um preço válido (ex.: 50000).');
            }
            break;

        default:
            await client.sendMessage(chatId, 'Algo deu errado. Vamos começar de novo. Envie "alerta" para configurar.');
            userState.state = "inicial"; 
            break;
    }
});

client.initialize();

// -------------------------------------------- alert system  -------------------------------------------- //

function generateMessage(symbol, price) {
    return `⏰ Alerta acionado! O preço do ${symbol} atingiu $${price} às ${new Date().toLocaleTimeString('pt-BR')}. Confira as movimentações agora!`;
}

async function updateBook() {
    try {
        const response = await axios.get(URL);
        if (response.status === 200) {
            const data = response.data.data;
            data.forEach(item => {
                book[item.symbol] = parseFloat(item.priceUsd);
            });
            symbols = Object.keys(book);
        }
    } catch (error) {
        console.error("Error trying to update the book: ", error.message);
    }
}


// add to the db
function addAlert(userId, symbol, price) {
    const alert = {
        userId, 
        symbol, 
        price: parseFloat(price),
        high: book[symbol] < price
    };
    const notification = new Notification(alert);
    notification.save();
}

let isRunning = false;

// get to the the db
async function checkAlerts() {
    if (isRunning) return;
    isRunning = true;

    const alerts = await Notification.find();

    alerts.forEach(async (alert) => {
        const currentPrice = book[alert.symbol];
        if (alert.high) {
            if (currentPrice >= alert.price) {
                await client.sendMessage(alert.id, generateMessage(alert.symbol, alert.price));
                await deleteAlert(alert);
            }
        } else {
            if (currentPrice, alert.price) {
                await client.sendMessage(alert.id, generateMessage(alert.symbol, alert.price));
                await deleteAlert(alert);
            }
        }
    })
    isRunning = false;
}

setInterval(updateBook, INTERVAL);
setInterval(checkAlerts, INTERVAL);


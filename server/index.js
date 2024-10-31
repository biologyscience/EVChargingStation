require('../hardware/modbus/Modbusv2').Modbusv2.init({ path: '/dev/ttyAMA0', baudRate: 9600, timeout: 50 });

const
    express = require('express'),
    { networkInterfaces } = require('os'),
    { Server } = require('socket.io');

const
    port = 3000,
    ip = networkInterfaces()['wlan0'].filter(x => x.family === 'IPv4')[0].address;
    // windows = 'Wi-Fi'
    // linux = 'wlan0'

const app = express();

app.set('view engine', 'ejs');
app.set('views', `${__dirname}/../client/views/`);

app.use('/socket.io-client', express.static(`${__dirname}/../node_modules/socket.io/client-dist/`));
app.use(express.static(`${__dirname}/../client/`));
app.use(express.json());
app.use('/api', require('./routes/api'));

app.get('/', (request, response) =>
{
    response.status(400).send('Provide /SlaveID');
});

app.get('/:ID', (request, response) =>
{
    const { ID } = request.params;

    if (typeof(parseInt(ID)) !== 'number') return response.redirect('/');

    response.render('main', request.params);
});

app.once('ready', () =>
{
    require('../hardware/SSR').resetGPIO();

    console.log(`Serving at: http://${ip}:${port}`);
});

const server = app.listen(port, ip, () => app.emit('ready'));

const io = new Server(server);

io.on('connect', socket => require('./socketHandler')(socket));
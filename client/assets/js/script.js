const socket = io({ autoConnect: false });

socket.connect();

//

const
    VOLTAGE = document.getElementById('voltage'),
    CURRENT = document.getElementById('current'),
    POWER = document.getElementById('power'),
    ENERGY = document.getElementById('energy'),
    FREQUENCY = document.getElementById('frequency'),

    input = document.querySelector('input'),
    SET = document.getElementById('set'),
    RESET = document.getElementById('reset');

let energyLimit;

let energy = 0;

let state = false;

const
    ID = parseInt(window.location.pathname.split('/')[1]),
    voltageAD = 40143,
    currentAD = 40151,
    powerAD = 40103,
    energyAD = 40159,
    frequencyAD = 40159,
    requestDataArray = [ [ID, voltageAD], [ID, currentAD], [ID, powerAD], [ID, energyAD], [ID, frequencyAD] ];

function ONOFF({target})
{
    const ID = target.id;

    target.classList.toggle('clicked');

    fetch('/api/onoff', { method: 'PUT', body: JSON.stringify({do: ID}), headers: {'content-type': 'application/json'} })
    .then((response) =>
    {
        if (!response.ok) return;

        state = ID === 'on';

        target.classList.toggle('clicked'); 
    });
};

['on', 'off'].forEach((x) => document.getElementById(x).addEventListener('click', ONOFF));

socket.on('takeData', (data) =>
{
    if (data.error !== null) return console.log(data.error);

    // const slave = data[`slave${slaveID}`];

    // VOLTAGE.innerHTML = slave[voltageAD].toFixed(2);
    // CURRENT.innerHTML = slave[currentAD].toFixed(2);
    // POWER.innerHTML = slave[powerAD].toFixed(2);
    // energy = slave[energyAD];
    // ENERGY.innerHTML = energy.toFixed(2);
    // FREQUENCY.innerHTML = slave[frequencyAD].toFixed(2);

    const { voltage, current, power } = data;

    VOLTAGE.innerHTML = voltage.toFixed(2);
    CURRENT.innerHTML = current.toFixed(2);
    POWER.innerHTML = power.toFixed(2);
    energy += power;
    ENERGY.innerHTML = energy.toFixed(2);

    if ((energy >= energyLimit) && (energyLimit !== 0) && (state === true))
    {
        document.getElementById('off').click();
        state = false;
    }
});

socket.on('disconnect', ({wasClean}) =>
{
    if (wasClean) return;

    window.location.reload();
});

SET.addEventListener('click', () =>
{
    energyLimit = parseInt(input.value);
    document.getElementById('on').click();
    state = true;

    const message = document.getElementById('message');

    message.innerHTML = `Supply will cut-off after reaching ${energyLimit} Wh`;

    message.classList.add('visible');
    setTimeout(() => { message.classList.remove('visible') }, 3000);
});

setInterval(() => socket.emit('wantData', requestDataArray), 2000);
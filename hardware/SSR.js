const { Gpio: GPIO } = require('onoff');

const base = 571;

const pin = new GPIO(base + 17, 'out');

function resetGPIO()
{
    pin.writeSync(0);
};

function toggleSSR(state)
{
    pin.writeSync(state);
};

module.exports = { resetGPIO, toggleSSR };
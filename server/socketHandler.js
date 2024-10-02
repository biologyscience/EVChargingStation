const { Modbusv2 } = require('../hardware/modbus/Modbusv2');

function socketHandler(socket)
{
    console.log(`${socket.id} connected`);

    socket.on('disconnect', () => console.log(`${socket.id} disconnected`));
    
    socket.on('wantData', (requestDataArray) =>
    {
        const result = { error: null };

        result.voltage = Math.random() * 30;
        result.current = Math.random() * 5;
        result.power = result.voltage * result.current;
        socket.emit('takeData', result);
        return;

        Modbusv2.getResponses(requestDataArray)
        .then((responses) =>
        {
            responses.forEach((x) =>
            {
                if (result[`slave${x.request.slaveID}`] === undefined) result[`slave${x.request.slaveID}`] = {};
    
                result[`slave${x.request.slaveID}`][x.request.rawAddress] = x.response === null ? x.comment : x.response.value;
            });
        })
        .catch(x => result.error = x.message)
        .finally(() => socket.emit('takeData', result));
    });
};

module.exports = socketHandler;
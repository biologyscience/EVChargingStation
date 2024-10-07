const express = require('express');

const { toggleSSR } = require('../../hardware/SSR');
const { Modbusv2 } = require('../../hardware/modbus/Modbusv2');

const api = express.Router();

api.put('/onoff', (request, response) =>
{
    const toDo = request.body.do;

    toggleSSR((toDo === 'on') * 1);

    response.sendStatus(200);
});

api.post('/getData', (request, response) =>
{
    const { requestDataArray } = request.body;

    const result = { error: null };
    
    Modbusv2.getResponses(requestDataArray)
    .then((responses) =>
    {
        responses.forEach((x) =>
        {
            if (result[`slave${x.request.slaveID}`] === undefined) result[`slave${x.request.slaveID}`] = {};

            const value = x.response === null ? x.comment : x.response.value;

            result[`slave${x.request.slaveID}`][x.request.rawAddress] = value;
        });
    })
    .catch(x => result.error = x.message)
    .finally(() => response.json(result));
});

module.exports = api;
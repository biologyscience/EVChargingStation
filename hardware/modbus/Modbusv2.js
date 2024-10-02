const { SerialPort } = require('serialport');

const { crc16modbus } = require('crc');

class Modbus
{
    #requests = [];
    #responses = [];
    #recieved = false;
    #requestToSend = undefined;
    #lineBusy = false;

    // FC 03 ONLY - READ HOLDING REGISTERS
    #setRequest(slaveID, rawAddress, quantity)
    {
        const buffs =
        {
            slave: Buffer.from([slaveID], 'HEX'),
            fc: Buffer.from([3], 'HEX'),
            address: Buffer.from((rawAddress - 40001).toString(16).padStart(4, '0'), 'HEX'),
            quantity: Buffer.from((quantity).toString(16).padStart(4, '0'), 'HEX')
        };
    
        const info = Buffer.concat([buffs.slave, buffs.fc, buffs.address, buffs.quantity]);
    
        const crc = Buffer.from(crc16modbus(info).toString(16), 'HEX').reverse();
    
        const request = Buffer.concat([info, crc]);

        this.#requests.push(request);

        return this;
    };

    #decodeRequest(request)
    {
        const
            slaveID = request.subarray(0, 1).readUInt8(),
            fc = request.subarray(1, 2).readUInt8(),
            rawAddress = request.subarray(2, 4).readUInt16BE() + 40001,
            quantity = request.subarray(4, 6).readUInt16BE(),
            crc = request.subarray(6, 8).readUInt16LE();

        return { slaveID, fc, rawAddress, quantity, crc, raw: request };
    };    

    #decodeResponse(response)
    {
        const
            slaveID = response.subarray(0, 1).readUInt8(),
            fc = response.subarray(1, 2).readUInt8(),
            totalDataBytes = response.subarray(2, 3).readUInt8();
    
        let i = 3 + totalDataBytes;

        const reorder = [];

        while (i > 3)
        {
            reorder.push(response.subarray(i - 2, i));

            i -= 2;
        }

        let data = Buffer.from([]);

        reorder.forEach(x => data = Buffer.concat([data, x]));

        const value = data.readFloatBE();

        const
            crcOffset = 3 + totalDataBytes,
            crc = response.subarray(crcOffset, crcOffset + 2).readUInt16LE(),
            crcCalculated = crc16modbus(response.subarray(0, -2));

        return { slaveID, fc, totalDataBytes, value, crc, crcCalculated, raw: response }; 
    };

    #portOpened()
    {
        return new Promise((resolve) =>
        {
            let int = setInterval(() =>
            {
                if (this.serialPort.isOpen)
                {
                    resolve(true);

                    clearInterval(int);
                }
            });
        });
    };

    #lineFree()
    {
        return new Promise((resolve) =>
        {
            let int = setInterval(() =>
            {
                if (!this.#lineBusy)
                {
                    resolve(true);

                    clearInterval(int);
                }
            });
        });
    };

    #cleanup()
    {
        this.#requests = [];
        this.#responses = [];
        this.#recieved = false;
        this.#requestToSend = undefined;
        this.#lineBusy = false;
    };

    init({ path, baudRate, timeout })
    {
        this.serialPort = new SerialPort({ path, baudRate, autoOpen: false });
        this.timeout = timeout;

        this.serialPort.on('open', () => console.log('opened'));

        this.serialPort.on('close', () =>
        {
            console.log('closed');

            this.#cleanup();
        });

        // this.serialPort.on('error', console.log);

        this.serialPort.on('data', (responseBuffer) =>
        {
            if (this.#requestToSend.equals(responseBuffer)) return;
            
            this.#recieved = true;

            const response = this.#decodeResponse(responseBuffer);

            const toPush = { request: this.#decodeRequest(this.#requestToSend), response };

            if (response.crc !== response.crcCalculated) toPush.comment = 'CRC Error';

            this.#responses.push(toPush);
        });
    };

    /**
     * @param {Array<[slaveID, rawAddress, quantity]>} array 
     * quantity defaults to 2, if given undefined
     * @returns 
     */
    async getResponses(array)
    {
        if (array === undefined || array.length === 0) throw new Error('No requests are provided');

        if (this.#lineBusy) await this.#lineFree();

        this.#lineBusy = true;

        array.forEach(x => this.#setRequest(x[0], x[1], x[2] || 2)); // 2 = No.of registers default

        this.serialPort.open();

        await this.#portOpened();

        while (this.#requests.length !== 0)
        {
            this.#requestToSend = this.#requests.reverse().pop();
            
            this.#requests.reverse();

            this.serialPort.write(this.#requestToSend, 'HEX');

            await wait(this.timeout);
        
            if (this.#recieved) this.#recieved = false;
            else this.#responses.push({request: this.#decodeRequest(this.#requestToSend), response: null, comment: 'Device did not reply'});
        };
        
        const copyResponses = [...this.#responses];
        
        this.serialPort.close();

        return copyResponses;
    };
};

function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

module.exports = { Modbusv2: new Modbus(), wait };
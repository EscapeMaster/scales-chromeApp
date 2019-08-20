import EventEmitter from 'events';
import cp from '../modules/chrome-promise';
import SendInfo from '../modules/sendInfo';

const { chrome } = window,
    { serial } = chrome;

const serialPromise = cp.serial;
let id = 0;
const type = 'serial';
class SerialDevice extends EventEmitter {

    /**
     * 封装一下单个串口设备
     * @param deviceInfo - https://developer.chrome.com/apps/serial#method-getDevices
     */
    constructor(deviceInfo) {
        super();
        this.id = type + id++;
        this.type = type;
        this.data = '';
        this.buffer = '';
        this.info = deviceInfo;
        this.error = null;
        this.connection = null;
        this.connectingPromise = null;
        this.connect();
    }

    /**
     * 连接至此串行端口设备
     * @return {Promise}
     */
    connect() {
        if (this.connectingPromise) { return this.connectingPromise; }
        return this.connectingPromise = serialPromise
            .connect(this.info.path, {})
            .then(connection => {
                this.connection = connection;
                SendInfo.status = 1;
                console.log('已连接到此串口设备:', this);
                this.data = this.buffer = '';
            }, err => {
                this.error = err;
                this.connectingPromise = null;
                SendInfo.status = 1;
                console.warn('无法连接到此串口设备:', this);
            });
    }

    /**
     * 断开到此设备的连接
     * @return {Promise} - true 或 false。
     */
    disconnect() {
        return serialPromise
            .disconnect(this.connection.connectionId)
            .then(ok => {
                SendInfo.status = 0;
                console.log(ok ? '成功断开此设备：' : '断开连接时失败：', this);
                return ok;
            });
    }
}

class SerialPool extends EventEmitter {

    /**
     * 串口设备连接池
     * @param options
     * @param options.lineBreak
     */
    constructor(options = {}) {
        super();
        this.lineBreak = options.lineBreak || '\n';
        this.devices = [];
        this.connectingPromise = null; // 不同于单个设备的连接中 Promise，当连接完毕后这个会被设为 null

        serial.onReceive.addListener(
            /**
             * 数据会源源不断的传送过来。只有先连接到设备后，这里才会收到设备传送过来的数据。
             * @see https://developer.chrome.com/apps/serial#event-onReceive
             * @param {Object} info
             * @param {Number} info.connectionId - 连接标识符
             * @param {ArrayBuffer} info.data - 接收到的数据
             */
            info => {
                const cId = info.connectionId;
                const receiveString = transformData(info.data);
                const serialDevice = this.findByConnectionId(cId);
                if (!serialDevice) {
                    console.warn('在接收数据时没有找到对应的串口。');
                    return;
                }

                // 使用 \n 作为数据分隔符
                if (receiveString.endsWith(this.lineBreak)) {
                    const newData = (serialDevice.buffer + receiveString).trim();
                    //this.emit( 'data' , newData , serialDevice );
                    const { data: oldData } = serialDevice;
                    if (newData !== oldData) {
                        serialDevice.data = newData;
                        this.emit('data change', newData, oldData, serialDevice);
                    }

                    serialDevice.buffer = '';
                } else {
                    // 这里情况泛指秤返回数据处理过的receiveString没有分隔符或以其他符号作为分隔符
                    const newData = receiveString.trim();
                    console.warn('newData', newData);
                    this.emit('data', newData, serialDevice);
                    serialDevice.buffer += receiveString;
                }
            });

        serial.onReceiveError.addListener(
            /**
             * 接收设备数据产生错误时的回调函数。产生错误后连接会被暂停，但是它没有提供重新连接的方法，所以直接断开掉。
             * @see https://developer.chrome.com/apps/serial#event-onReceiveError
             * @param {Object} info
             * @param {Number} info.connectionId - 连接标识符
             * @param {String} info.error - 连接标识符，值可能是：
             *                            - "disconnected" 连接已断开
             *                            - "timeout" 经过 receiveTimeout 毫秒后仍然未接收到数据。
             *                            - "device_lost" 设备可能已经从主机断开。
             *                            - "system_error" 发生系统错误，连接可能无法恢复。
             */
            info => {
                const { connectionId } = info;
                const serialDevice = this.findByConnectionId(connectionId);
                if (serialDevice) {
                    console.warn('此设备在接收数据时出错，尝试断开连接：', serialDevice);
                    serialDevice.disconnect();
                    serialDevice.error = info.error;
                    serialDevice.connectingPromise = null;
                    this.emit('error', serialDevice);
                } else {
                    console.warn('接收数据时出错，但在连接池中找不到此连接：', connectionId);
                }
            }
        );

        this.connectAll();
    }

    /**
     * 连接至所有串口设备。
     * @returns {Promise}
     */
    connectAll() {
        if (this.connectingPromise) { return this.connectingPromise; }
        return this.connectingPromise = serialPromise.getDevices()
            .then(devices => {
                console.log('找到这些串口设备：', devices);

                // 尝试连接到所有设备
                if (devices.length) {
                    return Promise.all(devices.map(deviceInfo => this.connect(deviceInfo)));
                }
            })
            .then(() => {
                this.connectingPromise = null;
            });
    }

    /**
     * 连接至单个串口设备
     * @param deviceInfo
     * @returns {Promise.<SerialDevice>} - 返回连接到的设备对象。这个 Promise 总是会 resolved
     */
    connect(deviceInfo) {
        let device;

        // 先判断一下此设备是否已经连接了
        const already = this.findByDevicePath(deviceInfo.path);

        if (already) {
            if (already.connectingPromise) {
                console.log('已连接至此串口设备，将不会重复连接：', already);
                return Promise.resolve(already);
            } else {
                already.error = already.connection = null;
                device = already;
            }
        }

        if (!device) {
            device = new SerialDevice(deviceInfo);
            this.devices.push(device);
        }

        return device.connect().then(() => device);
    }

    /**
     * 根据设备路径获取串口对象
     * @param {String} path - 设备路径
     * @returns {SerialDevice|undefined}
     */
    findByDevicePath(path) {
        let foundDevice;
        this.devices.some(device => {
            if (device.info.path === path) {
                foundDevice = device;
                return true;
            }
        });
        return foundDevice;
    }

    /**
     * 根据连接 id 找到设备
     * @param connectionId
     * @returns {SerialDevice|undefined}
     */
    findByConnectionId(connectionId) {
        let foundDevice;
        this.devices.some(device => {
            const { connection } = device;
            if (connection && connection.connectionId === connectionId) {
                foundDevice = device;
                return true;
            }
        });
        return foundDevice;
    }
}

// 默认情况下，串口设备的 ArrayBuffer 是用 utf8 编码的
const decoder = new TextDecoder('utf-8', { fatal: true });
/**
 * 串口数据为一个 ArrayBuffer，为了能将它传递给其他页面（通过 connect.io），需要将 ArrayBuffer 转换为 String。
 * 注意：不同设备的转换方式可能会不同，但我在两个电子秤上都能用这个方法成功将数据转换为字符串。
 * @see https://developer.mozilla.org/en-US/docs/Web/API/TextDecoder/decode
 * @param {ArrayBuffer} arrayBuffer
 * @returns {string}
 */
function transformData(arrayBuffer) {
    try {
        return decoder.decode(arrayBuffer);
    }
    catch (e) {
        console.warn('解码串口设备发送的数据时出错：', e, arrayBuffer);
        return '';
    }
}

export default SerialPool;

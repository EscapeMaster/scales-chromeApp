import EventEmitter from 'events';
import cp from '../modules/chrome-promise';

const {hid} = cp;

let id = 0;
const type = 'hid';

class HIDDevice extends EventEmitter {
  /**
   * 封装一下单个 HID 设备对象。
   * 对象本身是一个 EventEmitter，将会触发以下事件：
   *
   *   data: 每次接收到设备的数据时都会触发一次。数据是一个 ArrayBuffer；
   *
   * @param {chrome.hid.HidDeviceInfo} hidDeviceInfo
   * @see https://developer.chrome.com/apps/hid#type-HidDeviceInfo
   */
  constructor( hidDeviceInfo ) {
    super();
    this.id = type + id++;
    this.type = type;
    this.data = null; // 当连接至设备后，每次读取到的设备的值都会写在这个属性里
    this.connectionId = null;
    this.info = hidDeviceInfo;
    this.receiving = false; // hid 设备的数据不会主动推送过来，得重复获取

    /**
     * 连接至设备后，HID 会持续读取设备的数据，默认间隔为 0 毫秒
     * @type {number}
     */
    this.receiveInterval = 0;

    /**
     * 若连接时出现错误、或者连接后又被断开了，则此属性就是错误原因。
     * @type {null}
     */
    this.error = null;

    /**
     * 若设备已连接，则此属性为一个 Promise；若连接时出现错误、或者连接后又被断开了，则此属性为 null。
     * @type {Promise}
     */
    this.connectingPromise = this.connect();
  }

  /**
   * 连接至设备。这个 Promise 始终是 resolved 的，即使连接时出错。
   * @returns {Promise}
   */
  connect() {
    if ( this.connectingPromise ) { return this.connectingPromise; }
    this.error = null;
    return this.connectingPromise = hid
      .connect( this.info.deviceId )
      .then( ( {connectionId} )=> {
        this.connectionId = connectionId;
        this.startReceive();
      } , err => {
        this.error = err;
        this.connectingPromise = null;
      } );
  }

  /**
   * 读取来自设备的数据
   * @returns {Promise}
   */
  receive() {
    return hid.receive( this.connectionId ).then( r => {
      const oldData = this.data , newData = r[ 1 ] = this.data = transformData( r[ 1 ] );
      //this.emit( 'data' , newData );
      if ( oldData !== newData ) {
        this.emit( 'data change' , newData , oldData );
      }
      return r;
    } );
  }

  /**
   * 一个循环，持续读取设备的数据，直至读取时出错
   */
  startReceive() {
    if ( null === this.connectionId ) {
      throw new Error( '请先连接至设备。' );
    }
    if ( this.receiving ) { return; }
    this.receiving = true;
    const receiveLoop = ()=> {
      this.receive().then( ()=> {
        setTimeout( receiveLoop , this.receiveInterval );
      } , err => {
        this.receiving = false;
        console.warn( '读取数据时出错，中止数据读取：' , err );
      } );
    };

    receiveLoop();
  }
}

class HIDPool extends EventEmitter {

  /**
   * USB-HID 设备的连接池
   */
  constructor() {
    super();
    this.devices = [];
    this.connectingPromise = null; // 不同于单个设备的连接中 Promise，当连接完毕后这个会被设为 null

    chrome.hid.onDeviceAdded.addListener( hidDeviceInfo => {
      console.log( '检测到 HID 设备接入：' , hidDeviceInfo );
      this.connect( hidDeviceInfo ).then( device => this.emit( 'hid added' , device ) );
    } );

    chrome.hid.onDeviceRemoved.addListener( deviceId => {
      const device = this.findByDeviceId( deviceId );
      console.log( '检测到 HID 设备拔出了' );
      if ( device ) {
        device.error = 'removed';
        device.connectingPromise = null;
        this.emit( 'hid removed' , device );
        console.log( device );
      } else {
        console.warn( '但此 HID 设备不在连接池里。设备 ID：' , deviceId );
      }
    } );

    this.connectAll();
  }

  /**
   * 连接至能找到的所有 USB 设备
   * @returns {Promise}
   */
  connectAll() {
    if ( this.connectingPromise ) { return this.connectingPromise; }
    return this.connectingPromise = hid.getDevices( {} )
      .then( hidDeviceInfoArray => {
        console.log( '找到这些 HID 设备：' , hidDeviceInfoArray );
        if ( hidDeviceInfoArray.length ) {
          return Promise.all( hidDeviceInfoArray.map( hidDeviceInfo => this.connect( hidDeviceInfo ) ) );
        }
      } )
      .then( ()=> {
        this.connectingPromise = null;
      } );
  }

  /**
   * 连接至单个 HID 设备
   * @param hidDeviceInfo
   * @returns {Promise.<HIDDevice>}
   */
  connect( hidDeviceInfo ) {
    let hidDevice;

    // 先查找一下是否已经有这个设备了
    const already = this.findByVendorAndProductId( hidDeviceInfo );

    if ( already ) {
      if ( already.connectingPromise ) {
        console.log( '此 HID 设备已正常连接，将不会重复连接：' , already );
        return Promise.resolve( already );
      } else {
        already.info = hidDeviceInfo; // 信息可能被替换了
        hidDevice = already;
      }
    }

    if ( !hidDevice ) {
      hidDevice = new HIDDevice( hidDeviceInfo );
      //hidDevice.on( 'data' , data => {
      //  this.emit( 'data' , data , hidDevice );
      //} );
      hidDevice.on( 'data change' , ( newData , oldData ) => {
        this.emit( 'data change' , newData , oldData , hidDevice );
      } );
      this.devices.push( hidDevice );
      console.log( '连接的 HID 设备是一个新设备：' , hidDevice );
    } else {
      console.log( '此 HID 设备已连接但断开了，将尝试重新连接。' , hidDevice );
    }
    return hidDevice.connect().then( ()=> hidDevice );
  }

  /**
   * 根据 deviceId 查找一个设备
   * @param {Number} deviceId
   * @returns {HIDDevice|undefined}
   */
  findByDeviceId( deviceId ) {
    let d;
    this.devices.some( ( device )=> {
      if ( device.info.deviceId === deviceId ) {
        d = device;
        return true;
      }
    } );
    return d;
  }

  /**
   * 根据 vendorId 与 productId 查找一个设备
   * @param {Object} options
   * @param {Number} options.vendorId
   * @param {Number} options.productId
   * @returns {HIDDevice|undefined}
   */
  findByVendorAndProductId( { vendorId , productId } ) {
    let d;
    this.devices.some( ( device )=> {
      const {info} = device;
      if ( info.vendorId === vendorId && info.productId === productId ) {
        d = device;
        return true;
      }
    } );
    return d;
  }
}

/**
 * HID 设备的 data 虽然是一个 ArrayBuffer，可是无法使用 TextDecoder 转换为字符串；M25 Dymo 电子秤可以将它转换为 Unit8Array 然后里面包含数据。
 * 注意：不同设备的转换方法可能不同
 * @param arrayBuffer
 * @returns {String}
 */
function transformData( arrayBuffer ) {
  return '[' + new Uint8Array( arrayBuffer ).join( ',' ) + ']';
}

export default HIDPool;


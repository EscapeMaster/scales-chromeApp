import {Client} from 'connect.io';
import Vue from 'vue';
import template from './template.html';

const client = new Client();

new Vue( {
  el : 'body' ,
  replace : false ,
  template ,
  data : {
    devices : null ,
    connecting : false ,
    usbDevices : null
  } ,
  methods : {
    reload() {
      this.connecting = true;
      client.send( 'reconnect' , true ).then( ()=> {
        console.log( '重新连接至设备完毕' );
        this.connecting = false;
      } );
    } ,

    /**
     * 列出用户选择的 USB 设备的信息
     */
    chooseUSB() {
      chrome.usb.getUserSelectedDevices( { multiple : true } , ( selected_devices )=> {
        if ( Array.isArray( selected_devices ) ) {
          this.usbDevices = selected_devices;
        }
      } );
    }
  } ,
  created() {

    client.on( 'all devices' , devices => {
      console.log( '收到服务端发送过来的设备列表：' , devices );
      this.devices = devices;
    } );

    client.on( 'device error' , errorDevice => {
      console.log( '收到服务端发送过来的设备错误事件：' , errorDevice );
      const {id} = errorDevice;
      this.devices.some( ( device ) => {
        if ( device.id === id ) {
          device.error = errorDevice.error;
          return true;
        }
      } );
    } );

    client.on( 'data change' , ( {newData,device:dataChangedDevice} ) => {
      console.log( '收到服务端发送过来的数据变化事件：' , newData , dataChangedDevice );

      const {id} = dataChangedDevice;

      this.devices.some( ( device /*, i , a */ ) => {
        if ( device.id === id ) {
          device.data = newData;
          return true;
        }
      } );
    } );

    client.on( 'device added' , ( {device} )=> {
      const {id} = device;
      const has = this.devices.some( ( d , i , a )=> {
        if ( d.id === id ) {
          a.splice( i , 1 , device );
          return true;
        }
      } );
      if ( !has ) {
        this.devices.push( device );
      }
    } );

    client.on( 'device removed' , ( {device} )=> {
      const {id} = device;
      this.devices.some( ( d )=> {
        if ( d.id === id ) {
          d.error = '已断开';
          return true;
        }
      } );
    } );
  }
} );

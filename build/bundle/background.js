webpackJsonp([1],{

/***/ 0:
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	__webpack_require__(121);

	__webpack_require__(122);

/***/ }),

/***/ 121:
/***/ (function(module, exports) {

	'use strict';

	var _window = window,
	    chrome = _window.chrome,
	    app = chrome.app;

	// 启动时打开主界面

	app.runtime.onLaunched.addListener(function () {
	  app.window.create('/app/index.html', {
	    'bounds': {
	      'width': 500,
	      'height': 500
	    }
	  });
	});

/***/ }),

/***/ 122:
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _promise = __webpack_require__(87);

	var _promise2 = _interopRequireDefault(_promise);

	var _serial = __webpack_require__(123);

	var _serial2 = _interopRequireDefault(_serial);

	var _hid = __webpack_require__(127);

	var _hid2 = _interopRequireDefault(_hid);

	var _connect = __webpack_require__(1);

	var _sendInfo = __webpack_require__(126);

	var _sendInfo2 = _interopRequireDefault(_sendInfo);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	var server = new _connect.Server();

	// 监听 HID 设备
	var hidPool = window.__hid = new _hid2.default();

	chrome.runtime.onMessageExternal.addListener(function (request, sender, sendResponse) {
	    console.log('SendInfo', _sendInfo2.default);
	    sendResponse({ SendInfo: _sendInfo2.default });
	    // if (sender.url)
	    //     return;
	    // if (request.openUrlInEditor)
	    //     openUrl(request.openUrlInEditor);
	});
	// hidPool.on('data', (data, hidDevice) => {
	//     server.send('data', {
	//         data,
	//         device: hidDevice
	//     });
	// });

	// hidPool.on('data change', (newData, oldData, hidDevice) => {
	//     server.send('data change', {
	//         newData,
	//         oldData,
	//         device: hidDevice
	//     });
	// });

	// hidPool.on('hid added', (hidDevice) => {
	//     server.send('device added', {
	//         device: hidDevice
	//     });
	// });

	// hidPool.on('hid removed', hidDevice => {
	//     server.send('device removed', {
	//         device: hidDevice
	//     });
	// });

	// 监听串口设备
	var serialPool = window.__serial = new _serial2.default();

	// data 事件太频繁，就不发送了
	// 现在把data事件用在不是以/n为分隔符的领域
	serialPool.on('data', function (newData, serialDevice) {
	    console.log('newData', newData);
	    _sendInfo2.default.weight = newData;
	    _sendInfo2.default.serialDevice = serialDevice;
	});

	serialPool.on('data change', function (newData, oldData, serialDevice) {
	    console.log('newData', newData);
	    console.log('oldData', oldData);
	    _sendInfo2.default.weight = newData;
	    _sendInfo2.default.serialDevice = serialDevice;
	    server.send('data change', {
	        newData: newData,
	        oldData: oldData,
	        device: serialDevice
	    });
	});

	serialPool.on('error', function (serialDevice) {
	    server.send('device error', serialDevice);
	});

	// 通用事件
	server.on('connect', function (client) {
	    console.log('收到客户端连接：', client);
	    sendAllDevices();

	    client.on('reconnect', function (data, resolve, reject) {
	        console.log('收到客户端的重新连接请求：', data);

	        _promise2.default.all([serialPool.connectAll(), hidPool.connectAll()]).then(function () {
	            sendAllDevices();
	            resolve();
	        }, function (e) {
	            reject(e);
	        });
	    });

	    function sendAllDevices() {
	        client.send('all devices', serialPool.devices.concat(hidPool.devices));
	    }
	});

/***/ }),

/***/ 123:
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	    value: true
	});

	var _promise = __webpack_require__(87);

	var _promise2 = _interopRequireDefault(_promise);

	var _getPrototypeOf = __webpack_require__(3);

	var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

	var _classCallCheck2 = __webpack_require__(76);

	var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

	var _createClass2 = __webpack_require__(109);

	var _createClass3 = _interopRequireDefault(_createClass2);

	var _possibleConstructorReturn2 = __webpack_require__(77);

	var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

	var _inherits2 = __webpack_require__(78);

	var _inherits3 = _interopRequireDefault(_inherits2);

	var _events = __webpack_require__(113);

	var _events2 = _interopRequireDefault(_events);

	var _chromePromise = __webpack_require__(124);

	var _chromePromise2 = _interopRequireDefault(_chromePromise);

	var _sendInfo = __webpack_require__(126);

	var _sendInfo2 = _interopRequireDefault(_sendInfo);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	var _window = window,
	    chrome = _window.chrome,
	    serial = chrome.serial;


	var serialPromise = _chromePromise2.default.serial;
	var id = 0;
	var type = 'serial';

	var SerialDevice = function (_EventEmitter) {
	    (0, _inherits3.default)(SerialDevice, _EventEmitter);

	    /**
	     * 封装一下单个串口设备
	     * @param deviceInfo - https://developer.chrome.com/apps/serial#method-getDevices
	     */
	    function SerialDevice(deviceInfo) {
	        (0, _classCallCheck3.default)(this, SerialDevice);

	        var _this = (0, _possibleConstructorReturn3.default)(this, (SerialDevice.__proto__ || (0, _getPrototypeOf2.default)(SerialDevice)).call(this));

	        _this.id = type + id++;
	        _this.type = type;
	        _this.data = '';
	        _this.buffer = '';
	        _this.info = deviceInfo;
	        _this.error = null;
	        _this.connection = null;
	        _this.connectingPromise = null;
	        _this.connect();
	        return _this;
	    }

	    /**
	     * 连接至此串行端口设备
	     * @return {Promise}
	     */


	    (0, _createClass3.default)(SerialDevice, [{
	        key: 'connect',
	        value: function connect() {
	            var _this2 = this;

	            if (this.connectingPromise) {
	                return this.connectingPromise;
	            }
	            return this.connectingPromise = serialPromise.connect(this.info.path, {}).then(function (connection) {
	                _this2.connection = connection;
	                _sendInfo2.default.status = 1;
	                console.log('已连接到此串口设备:', _this2);
	                _this2.data = _this2.buffer = '';
	            }, function (err) {
	                _this2.error = err;
	                _this2.connectingPromise = null;
	                _sendInfo2.default.status = 1;
	                console.warn('无法连接到此串口设备:', _this2);
	            });
	        }

	        /**
	         * 断开到此设备的连接
	         * @return {Promise} - true 或 false。
	         */

	    }, {
	        key: 'disconnect',
	        value: function disconnect() {
	            var _this3 = this;

	            return serialPromise.disconnect(this.connection.connectionId).then(function (ok) {
	                _sendInfo2.default.status = 0;
	                console.log(ok ? '成功断开此设备：' : '断开连接时失败：', _this3);
	                return ok;
	            });
	        }
	    }]);
	    return SerialDevice;
	}(_events2.default);

	var SerialPool = function (_EventEmitter2) {
	    (0, _inherits3.default)(SerialPool, _EventEmitter2);

	    /**
	     * 串口设备连接池
	     * @param options
	     * @param options.lineBreak
	     */
	    function SerialPool() {
	        var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
	        (0, _classCallCheck3.default)(this, SerialPool);

	        var _this4 = (0, _possibleConstructorReturn3.default)(this, (SerialPool.__proto__ || (0, _getPrototypeOf2.default)(SerialPool)).call(this));

	        _this4.lineBreak = options.lineBreak || '\n';
	        _this4.devices = [];
	        _this4.connectingPromise = null; // 不同于单个设备的连接中 Promise，当连接完毕后这个会被设为 null

	        serial.onReceive.addListener(
	        /**
	         * 数据会源源不断的传送过来。只有先连接到设备后，这里才会收到设备传送过来的数据。
	         * @see https://developer.chrome.com/apps/serial#event-onReceive
	         * @param {Object} info
	         * @param {Number} info.connectionId - 连接标识符
	         * @param {ArrayBuffer} info.data - 接收到的数据
	         */
	        function (info) {
	            var cId = info.connectionId;
	            var receiveString = transformData(info.data);
	            var serialDevice = _this4.findByConnectionId(cId);
	            if (!serialDevice) {
	                console.warn('在接收数据时没有找到对应的串口。');
	                return;
	            }

	            // 使用 \n 作为数据分隔符
	            if (receiveString.endsWith(_this4.lineBreak)) {
	                var newData = (serialDevice.buffer + receiveString).trim();
	                //this.emit( 'data' , newData , serialDevice );
	                var oldData = serialDevice.data;

	                if (newData !== oldData) {
	                    serialDevice.data = newData;
	                    _this4.emit('data change', newData, oldData, serialDevice);
	                }

	                serialDevice.buffer = '';
	            } else {
	                // 这里情况泛指秤返回数据处理过的receiveString没有分隔符或以其他符号作为分隔符
	                var _newData = receiveString.trim();
	                console.warn('newData', _newData);
	                _this4.emit('data', _newData, serialDevice);
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
	        function (info) {
	            var connectionId = info.connectionId;

	            var serialDevice = _this4.findByConnectionId(connectionId);
	            if (serialDevice) {
	                console.warn('此设备在接收数据时出错，尝试断开连接：', serialDevice);
	                serialDevice.disconnect();
	                serialDevice.error = info.error;
	                serialDevice.connectingPromise = null;
	                _this4.emit('error', serialDevice);
	            } else {
	                console.warn('接收数据时出错，但在连接池中找不到此连接：', connectionId);
	            }
	        });

	        _this4.connectAll();
	        return _this4;
	    }

	    /**
	     * 连接至所有串口设备。
	     * @returns {Promise}
	     */


	    (0, _createClass3.default)(SerialPool, [{
	        key: 'connectAll',
	        value: function connectAll() {
	            var _this5 = this;

	            if (this.connectingPromise) {
	                return this.connectingPromise;
	            }
	            return this.connectingPromise = serialPromise.getDevices().then(function (devices) {
	                console.log('找到这些串口设备：', devices);

	                // 尝试连接到所有设备
	                if (devices.length) {
	                    return _promise2.default.all(devices.map(function (deviceInfo) {
	                        return _this5.connect(deviceInfo);
	                    }));
	                }
	            }).then(function () {
	                _this5.connectingPromise = null;
	            });
	        }

	        /**
	         * 连接至单个串口设备
	         * @param deviceInfo
	         * @returns {Promise.<SerialDevice>} - 返回连接到的设备对象。这个 Promise 总是会 resolved
	         */

	    }, {
	        key: 'connect',
	        value: function connect(deviceInfo) {
	            var device = void 0;

	            // 先判断一下此设备是否已经连接了
	            var already = this.findByDevicePath(deviceInfo.path);

	            if (already) {
	                if (already.connectingPromise) {
	                    console.log('已连接至此串口设备，将不会重复连接：', already);
	                    return _promise2.default.resolve(already);
	                } else {
	                    already.error = already.connection = null;
	                    device = already;
	                }
	            }

	            if (!device) {
	                device = new SerialDevice(deviceInfo);
	                this.devices.push(device);
	            }

	            return device.connect().then(function () {
	                return device;
	            });
	        }

	        /**
	         * 根据设备路径获取串口对象
	         * @param {String} path - 设备路径
	         * @returns {SerialDevice|undefined}
	         */

	    }, {
	        key: 'findByDevicePath',
	        value: function findByDevicePath(path) {
	            var foundDevice = void 0;
	            this.devices.some(function (device) {
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

	    }, {
	        key: 'findByConnectionId',
	        value: function findByConnectionId(connectionId) {
	            var foundDevice = void 0;
	            this.devices.some(function (device) {
	                var connection = device.connection;

	                if (connection && connection.connectionId === connectionId) {
	                    foundDevice = device;
	                    return true;
	                }
	            });
	            return foundDevice;
	        }
	    }]);
	    return SerialPool;
	}(_events2.default);

	// 默认情况下，串口设备的 ArrayBuffer 是用 utf8 编码的


	var decoder = new TextDecoder('utf-8', { fatal: true });
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
	    } catch (e) {
	        console.warn('解码串口设备发送的数据时出错：', e, arrayBuffer);
	        return '';
	    }
	}

	exports.default = SerialPool;

/***/ }),

/***/ 124:
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});

	var _chromePromiseTemp = __webpack_require__(125);

	var _chromePromiseTemp2 = _interopRequireDefault(_chromePromiseTemp);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	// Chrome API using promises.
	exports.default = new _chromePromiseTemp2.default();

/***/ }),

/***/ 125:
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/*!
	 * chrome-promise 1.0.7
	 * https://github.com/tfoxy/chrome-promise
	 *
	 * Copyright 2015 Tomás Fox
	 * Released under the MIT license
	 */

	(function(root, factory) {
	  if (true) {
	    // AMD. Register as an anonymous module.
	    !(__WEBPACK_AMD_DEFINE_ARRAY__ = [], __WEBPACK_AMD_DEFINE_FACTORY__ = (factory.bind(null,  true ? this : root)), __WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ? (__WEBPACK_AMD_DEFINE_FACTORY__.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__)) : __WEBPACK_AMD_DEFINE_FACTORY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	  } else if (typeof exports === 'object') {
	    // Node. Does not work with strict CommonJS, but
	    // only CommonJS-like environments that support module.exports,
	    // like Node.
	    module.exports = factory(this);
	  } else {
	    // Browser globals (root is window)
	    root.ChromePromise = factory(root);
	  }
	}(this, function(root) {
	  'use strict';
	  var push = Array.prototype.push,
	      hasOwnProperty = Object.prototype.hasOwnProperty;

	  return ChromePromise;

	  ////////////////

	  function ChromePromise(chrome, Promise) {
	    chrome = chrome || root.chrome;
	    Promise = Promise || root.Promise;

	    var runtime = chrome.runtime;

	    fillProperties(chrome, this);

	    ////////////////

	    function setPromiseFunction(fn, thisArg) {

	      return function() {
	        var args = arguments;

	        return new Promise(function(resolve, reject) {
	          function callback() {
	            var err = runtime.lastError;
	            if (err) {
	              reject(err);
	            } else {
	              if (arguments.length <= 1) {
	                resolve(arguments[0]);
	              } else {
	                resolve(arguments);
	              }
	            }
	          }

	          push.call(args, callback);

	          fn.apply(thisArg, args);
	        });

	      };

	    }

	    function fillProperties(source, target) {
	      for (var key in source) {
	        if (hasOwnProperty.call(source, key)) {
	          var val = source[key];
	          var type = typeof val;

	          if (type === 'object' && !(val instanceof ChromePromise)) {
	            target[key] = {};
	            fillProperties(val, target[key]);
	          } else if (type === 'function') {
	            target[key] = setPromiseFunction(val, source);
	          } else {
	            target[key] = val;
	          }
	        }
	      }
	    }
	  }
	}));


/***/ }),

/***/ 126:
/***/ (function(module, exports) {

	'use strict';

	// stutus: 0断开 1已连接 2重连
	module.exports = {
	    status: 0,
	    weight: '',
	    message: '',
	    serialDevice: null
	};

/***/ }),

/***/ 127:
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});

	var _promise = __webpack_require__(87);

	var _promise2 = _interopRequireDefault(_promise);

	var _getPrototypeOf = __webpack_require__(3);

	var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

	var _classCallCheck2 = __webpack_require__(76);

	var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

	var _createClass2 = __webpack_require__(109);

	var _createClass3 = _interopRequireDefault(_createClass2);

	var _possibleConstructorReturn2 = __webpack_require__(77);

	var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

	var _inherits2 = __webpack_require__(78);

	var _inherits3 = _interopRequireDefault(_inherits2);

	var _events = __webpack_require__(113);

	var _events2 = _interopRequireDefault(_events);

	var _chromePromise = __webpack_require__(124);

	var _chromePromise2 = _interopRequireDefault(_chromePromise);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	var hid = _chromePromise2.default.hid;


	var id = 0;
	var type = 'hid';

	var HIDDevice = function (_EventEmitter) {
	  (0, _inherits3.default)(HIDDevice, _EventEmitter);

	  /**
	   * 封装一下单个 HID 设备对象。
	   * 对象本身是一个 EventEmitter，将会触发以下事件：
	   *
	   *   data: 每次接收到设备的数据时都会触发一次。数据是一个 ArrayBuffer；
	   *
	   * @param {chrome.hid.HidDeviceInfo} hidDeviceInfo
	   * @see https://developer.chrome.com/apps/hid#type-HidDeviceInfo
	   */
	  function HIDDevice(hidDeviceInfo) {
	    (0, _classCallCheck3.default)(this, HIDDevice);

	    var _this = (0, _possibleConstructorReturn3.default)(this, (HIDDevice.__proto__ || (0, _getPrototypeOf2.default)(HIDDevice)).call(this));

	    _this.id = type + id++;
	    _this.type = type;
	    _this.data = null; // 当连接至设备后，每次读取到的设备的值都会写在这个属性里
	    _this.connectionId = null;
	    _this.info = hidDeviceInfo;
	    _this.receiving = false; // hid 设备的数据不会主动推送过来，得重复获取

	    /**
	     * 连接至设备后，HID 会持续读取设备的数据，默认间隔为 0 毫秒
	     * @type {number}
	     */
	    _this.receiveInterval = 0;

	    /**
	     * 若连接时出现错误、或者连接后又被断开了，则此属性就是错误原因。
	     * @type {null}
	     */
	    _this.error = null;

	    /**
	     * 若设备已连接，则此属性为一个 Promise；若连接时出现错误、或者连接后又被断开了，则此属性为 null。
	     * @type {Promise}
	     */
	    _this.connectingPromise = _this.connect();
	    return _this;
	  }

	  /**
	   * 连接至设备。这个 Promise 始终是 resolved 的，即使连接时出错。
	   * @returns {Promise}
	   */


	  (0, _createClass3.default)(HIDDevice, [{
	    key: 'connect',
	    value: function connect() {
	      var _this2 = this;

	      if (this.connectingPromise) {
	        return this.connectingPromise;
	      }
	      this.error = null;
	      return this.connectingPromise = hid.connect(this.info.deviceId).then(function (_ref) {
	        var connectionId = _ref.connectionId;

	        _this2.connectionId = connectionId;
	        _this2.startReceive();
	      }, function (err) {
	        _this2.error = err;
	        _this2.connectingPromise = null;
	      });
	    }

	    /**
	     * 读取来自设备的数据
	     * @returns {Promise}
	     */

	  }, {
	    key: 'receive',
	    value: function receive() {
	      var _this3 = this;

	      return hid.receive(this.connectionId).then(function (r) {
	        var oldData = _this3.data,
	            newData = r[1] = _this3.data = transformData(r[1]);
	        //this.emit( 'data' , newData );
	        if (oldData !== newData) {
	          _this3.emit('data change', newData, oldData);
	        }
	        return r;
	      });
	    }

	    /**
	     * 一个循环，持续读取设备的数据，直至读取时出错
	     */

	  }, {
	    key: 'startReceive',
	    value: function startReceive() {
	      var _this4 = this;

	      if (null === this.connectionId) {
	        throw new Error('请先连接至设备。');
	      }
	      if (this.receiving) {
	        return;
	      }
	      this.receiving = true;
	      var receiveLoop = function receiveLoop() {
	        _this4.receive().then(function () {
	          setTimeout(receiveLoop, _this4.receiveInterval);
	        }, function (err) {
	          _this4.receiving = false;
	          console.warn('读取数据时出错，中止数据读取：', err);
	        });
	      };

	      receiveLoop();
	    }
	  }]);
	  return HIDDevice;
	}(_events2.default);

	var HIDPool = function (_EventEmitter2) {
	  (0, _inherits3.default)(HIDPool, _EventEmitter2);

	  /**
	   * USB-HID 设备的连接池
	   */
	  function HIDPool() {
	    (0, _classCallCheck3.default)(this, HIDPool);

	    var _this5 = (0, _possibleConstructorReturn3.default)(this, (HIDPool.__proto__ || (0, _getPrototypeOf2.default)(HIDPool)).call(this));

	    _this5.devices = [];
	    _this5.connectingPromise = null; // 不同于单个设备的连接中 Promise，当连接完毕后这个会被设为 null

	    chrome.hid.onDeviceAdded.addListener(function (hidDeviceInfo) {
	      console.log('检测到 HID 设备接入：', hidDeviceInfo);
	      _this5.connect(hidDeviceInfo).then(function (device) {
	        return _this5.emit('hid added', device);
	      });
	    });

	    chrome.hid.onDeviceRemoved.addListener(function (deviceId) {
	      var device = _this5.findByDeviceId(deviceId);
	      console.log('检测到 HID 设备拔出了');
	      if (device) {
	        device.error = 'removed';
	        device.connectingPromise = null;
	        _this5.emit('hid removed', device);
	        console.log(device);
	      } else {
	        console.warn('但此 HID 设备不在连接池里。设备 ID：', deviceId);
	      }
	    });

	    _this5.connectAll();
	    return _this5;
	  }

	  /**
	   * 连接至能找到的所有 USB 设备
	   * @returns {Promise}
	   */


	  (0, _createClass3.default)(HIDPool, [{
	    key: 'connectAll',
	    value: function connectAll() {
	      var _this6 = this;

	      if (this.connectingPromise) {
	        return this.connectingPromise;
	      }
	      return this.connectingPromise = hid.getDevices({}).then(function (hidDeviceInfoArray) {
	        console.log('找到这些 HID 设备：', hidDeviceInfoArray);
	        if (hidDeviceInfoArray.length) {
	          return _promise2.default.all(hidDeviceInfoArray.map(function (hidDeviceInfo) {
	            return _this6.connect(hidDeviceInfo);
	          }));
	        }
	      }).then(function () {
	        _this6.connectingPromise = null;
	      });
	    }

	    /**
	     * 连接至单个 HID 设备
	     * @param hidDeviceInfo
	     * @returns {Promise.<HIDDevice>}
	     */

	  }, {
	    key: 'connect',
	    value: function connect(hidDeviceInfo) {
	      var _this7 = this;

	      var hidDevice = void 0;

	      // 先查找一下是否已经有这个设备了
	      var already = this.findByVendorAndProductId(hidDeviceInfo);

	      if (already) {
	        if (already.connectingPromise) {
	          console.log('此 HID 设备已正常连接，将不会重复连接：', already);
	          return _promise2.default.resolve(already);
	        } else {
	          already.info = hidDeviceInfo; // 信息可能被替换了
	          hidDevice = already;
	        }
	      }

	      if (!hidDevice) {
	        hidDevice = new HIDDevice(hidDeviceInfo);
	        //hidDevice.on( 'data' , data => {
	        //  this.emit( 'data' , data , hidDevice );
	        //} );
	        hidDevice.on('data change', function (newData, oldData) {
	          _this7.emit('data change', newData, oldData, hidDevice);
	        });
	        this.devices.push(hidDevice);
	        console.log('连接的 HID 设备是一个新设备：', hidDevice);
	      } else {
	        console.log('此 HID 设备已连接但断开了，将尝试重新连接。', hidDevice);
	      }
	      return hidDevice.connect().then(function () {
	        return hidDevice;
	      });
	    }

	    /**
	     * 根据 deviceId 查找一个设备
	     * @param {Number} deviceId
	     * @returns {HIDDevice|undefined}
	     */

	  }, {
	    key: 'findByDeviceId',
	    value: function findByDeviceId(deviceId) {
	      var d = void 0;
	      this.devices.some(function (device) {
	        if (device.info.deviceId === deviceId) {
	          d = device;
	          return true;
	        }
	      });
	      return d;
	    }

	    /**
	     * 根据 vendorId 与 productId 查找一个设备
	     * @param {Object} options
	     * @param {Number} options.vendorId
	     * @param {Number} options.productId
	     * @returns {HIDDevice|undefined}
	     */

	  }, {
	    key: 'findByVendorAndProductId',
	    value: function findByVendorAndProductId(_ref2) {
	      var vendorId = _ref2.vendorId,
	          productId = _ref2.productId;

	      var d = void 0;
	      this.devices.some(function (device) {
	        var info = device.info;

	        if (info.vendorId === vendorId && info.productId === productId) {
	          d = device;
	          return true;
	        }
	      });
	      return d;
	    }
	  }]);
	  return HIDPool;
	}(_events2.default);

	/**
	 * HID 设备的 data 虽然是一个 ArrayBuffer，可是无法使用 TextDecoder 转换为字符串；M25 Dymo 电子秤可以将它转换为 Unit8Array 然后里面包含数据。
	 * 注意：不同设备的转换方法可能不同
	 * @param arrayBuffer
	 * @returns {String}
	 */


	function transformData(arrayBuffer) {
	  return '[' + new Uint8Array(arrayBuffer).join(',') + ']';
	}

	exports.default = HIDPool;

/***/ })

});
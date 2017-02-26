/*********************************************************
 * node-powershell - Certainly the easiest way to run PowerShell from your NodeJS app
 * @version v3.0.1
 * @link http://rannn505.github.io/node-powershell/
 * @copyright Copyright (c) 2017 Ran Cohen <rannn505@outlook.com>
 * @license MIT (http://www.opensource.org/licenses/mit-license.php)
 * @Compiled At: 2017-02-26
  *********************************************************/
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var os = require('os');
var util = require('util');
var eventEmitter = require('events').EventEmitter;
var spawn = require('child_process').spawn;
var colors = require('chalk');
var promise = require('bluebird');

var MODULE_NAME = 'node-powershell';
var IS_WIN = os.platform() === 'win32';
var MODULE_MSG = colors.bold.blue('NPS> ');
var OK_MSG = colors.green;
var ERROR_MSG = colors.red;
var EOI = 'EOI';

/**
 * The Shell class.
 *
 * @constructor
 * @param {Object} config The config for the shell instance. https://github.com/rannn505/node-powershell#initializeconstructor
 * @returns {Shell} A Shell instance which allows you to run PowerShell commands from your NodeJS app.
 * It exposes a simple API that bridges between your node and a PS child process.
 */

var Shell = exports.Shell = function (_eventEmitter) {
  _inherits(Shell, _eventEmitter);

  function Shell() {
    var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
        _ref$executionPolicy = _ref.executionPolicy,
        executionPolicy = _ref$executionPolicy === undefined ? 'Unrestricted' : _ref$executionPolicy,
        _ref$inputEncoding = _ref.inputEncoding,
        inputEncoding = _ref$inputEncoding === undefined ? 'utf8' : _ref$inputEncoding,
        _ref$outputEncoding = _ref.outputEncoding,
        outputEncoding = _ref$outputEncoding === undefined ? 'utf8' : _ref$outputEncoding,
        _ref$debugMsg = _ref.debugMsg,
        debugMsg = _ref$debugMsg === undefined ? true : _ref$debugMsg,
        _ref$noProfile = _ref.noProfile,
        noProfile = _ref$noProfile === undefined ? true : _ref$noProfile;

    _classCallCheck(this, Shell);

    // cmds bulk to run at the next invoke call
    var _this = _possibleConstructorReturn(this, (Shell.__proto__ || Object.getPrototypeOf(Shell)).call(this));

    _this._cmds = [];
    // history of cmds
    _this._history = [];
    // global config for class
    _this._cfg = {};
    _this._cfg.debugMsg = debugMsg;

    // arguments for PowerShell process
    var _args = ['-NoLogo', '-NoExit', '-InputFormat', 'Text', '-Command', '-'];
    if (noProfile) {
      _args = ['-NoProfile'].concat(_toConsumableArray(_args));
    }
    if (IS_WIN) {
      _args = ['-ExecutionPolicy', executionPolicy].concat(_toConsumableArray(_args));
    }

    // the PowerShell process
    _this._proc = spawn('powershell' + (IS_WIN ? '.exe' : ''), _args, {
      stdio: 'pipe'
    });
    if (!_this._proc.pid) {
      throw new Error('Opss... ' + MODULE_NAME + ' was unable to start PowerShell.\nPlease make sure that PowerShell is installed properly on your system, and try again.');
    }
    _this._proc.on('error', function (error) {
      throw new Error('Opss... ' + MODULE_NAME + ' was unable to start PowerShell.\nPlease make sure that PowerShell is installed properly on your system, and try again.');
    });
    _this._proc.stdin.setEncoding(inputEncoding);
    _this._proc.stdout.setEncoding(outputEncoding);
    _this._proc.stderr.setEncoding(outputEncoding);

    // output to print after invoke call
    var _output = [];
    var _type = '_resolve';

    _this._proc.stdout.on('data', function (data) {
      if (data.indexOf(EOI) !== -1) {
        _this.emit(_type, _output.join(''));
        _output = [];
        _type = '_resolve';
      } else {
        _this.emit('output', data);
        _output.push(data);
      }
    });
    _this._proc.stderr.on('data', function (error) {
      _this.emit('err', error);
      _output.push(error);
      _type = '_reject';
    });

    // public props
    _this.history = _this._history;
    _this.streams = {
      stdin: _this._proc.stdin,
      stdout: _this._proc.stdout,
      stderr: _this._proc.stderr
    };

    _this.__print__(OK_MSG, 'Process ' + _this._proc.pid + ' started\n');
    return _this;
  }

  _createClass(Shell, [{
    key: '__print__',
    value: function __print__(type, msg) {
      this._cfg.debugMsg && console.log(MODULE_MSG + ' ' + type(msg));
    }
  }, {
    key: 'addCommand',
    value: function addCommand(command) {
      var _this2 = this;

      var params = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];

      return new Promise(function (resolve, reject) {
        !command && reject(ERROR_MSG('Command is missing'));
        !Array.isArray(params) && reject(ERROR_MSG('Params must be an array'));
        var _cmdStr = '' + command;
        params.forEach(function (param) {
          var _keys = Object.keys(param);
          var _name = _keys.indexOf('name') !== -1 ? param.name : _keys[0];
          var _value = _keys.indexOf('value') !== -1 ? param.value : param[_name]; // !important
          if (!_value) {
            _cmdStr = _cmdStr.concat(' -' + _name);
          } else {
            _cmdStr = _cmdStr.concat(' -' + _name + ' ' + (/\s/.test(_value) ? '"' + _value + '"' : _value));
          }
        });
        _this2._cmds.push(_cmdStr);
        _this2._history.push(_cmdStr);
        resolve(_this2._cmds);
      });
    }
  }, {
    key: 'invoke',
    value: function invoke() {
      var _self = this;
      return new Promise(function (resolve, reject) {
        var _cmdsStr = _self._cmds.join('; ');
        _self.__print__(OK_MSG, 'Command invoke started');
        console.log(' ' + colors.gray(_cmdsStr));

        function resolve_listener(data) {
          _self.__print__(OK_MSG, 'Command invoke finished\n');
          resolve(data);
          reset();
        }
        function reject_listener(error) {
          _self.__print__(ERROR_MSG, 'Command invoke failed\n');
          reject(ERROR_MSG(error));
          reset();
        }
        function reset() {
          _self.removeListener('_resolve', resolve_listener);
          _self.removeListener('_reject', reject_listener);
          _self._cmds = [];
        }

        _self.on('_resolve', resolve_listener);
        _self.on('_reject', reject_listener);

        _self._proc.stdin.write(_cmdsStr);
        _self._proc.stdin.write(os.EOL);
        _self._proc.stdin.write('echo ' + EOI);
        _self._proc.stdin.write(os.EOL);
      });
    }
  }, {
    key: 'dispose',
    value: function dispose() {
      var _this3 = this;

      var _self = this;
      return new Promise(function (resolve, reject) {
        _self._proc.on('close', function (code) {
          var _exitMsg = 'Process ' + _this3._proc.pid + ' exited with code ' + code + '\n';
          _self.emit('end', code);
          if (code == 1) {
            _self.__print__(ERROR_MSG, _exitMsg);
            reject(ERROR_MSG('script exit ' + code));
          } else {
            _self.__print__(OK_MSG, _exitMsg);
            resolve('script exit ' + code);
          }
        });

        _self._proc.stdin.write('exit');
        _self._proc.stdin.write(os.EOL);
        _self._proc.stdin.end();
      });
    }
  }]);

  return Shell;
}(eventEmitter);
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _glob = require('glob');

var _glob2 = _interopRequireDefault(_glob);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _ethereumjsUtil = require('ethereumjs-util');

var _ethereumjsUtil2 = _interopRequireDefault(_ethereumjsUtil);

var _trace = require('./trace');

var _sourceMaps = require('./source-maps');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Web3TraceProvider = function () {
  function Web3TraceProvider(web3) {
    (0, _classCallCheck3.default)(this, Web3TraceProvider);

    this.web3 = web3;
    this.nextProvider = web3.currentProvider;
  }

  /**
   * Should be called to make sync request
   *
   * @method send
   * @param {Object} payload
   * @return {Object} result
   */


  (0, _createClass3.default)(Web3TraceProvider, [{
    key: 'send',
    value: function send() {
      var payload = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      return this.nextProvider.send(payload);
    }
  }, {
    key: 'sendAsync',
    value: function sendAsync(payload, cb) {
      var _this = this;

      if (payload.method === 'eth_sendTransaction') {
        var txData = payload.params[0];
        return this.nextProvider.sendAsync(payload, function (err, result) {
          if (result.error && result.error.message && result.error.message.endsWith(': revert')) {
            var txHash = result.result;
            var toAddress = !txData.to || txData.to === '0x0' ? _trace.constants.NEW_CONTRACT : txData.to;

            // record tx trace
            _this.recordTxTrace(toAddress, txData.data, txHash).then(function (traceResult) {
              result.error.message += traceResult;
              cb(err, result);
            }).catch(function (traceError) {
              cb(traceError, result);
            });
          } else {
            cb(err, result);
          }
        });
      }

      return this.nextProvider.sendAsync(payload, cb);
    }

    /**
     * Gets the contract code by address
     * @param  address Address of the contract
     * @return Code of the contract
     */

  }, {
    key: 'getContractCode',
    value: function getContractCode(address) {
      return this.web3.eth.getCode(address);
    }

    /**
     * Gets the debug trace of a transaction
     * @param  txHash Hash of the transactuon to get a trace for
     * @param  traceParams Config object allowing you to specify if you need memory/storage/stack traces.
     * @return Transaction trace
     */

  }, {
    key: 'getTransactionTrace',
    value: function getTransactionTrace(txHash) {
      var _this2 = this;

      var traceParams = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      return new _promise2.default(function (resolve, reject) {
        _this2.nextProvider.sendAsync({
          method: 'debug_traceTransaction',
          params: [txHash, traceParams]
        }, function (err, result) {
          if (err) {
            reject(err);
          } else {
            resolve(result.result);
          }
        });
      });
    }
  }, {
    key: 'recordTxTrace',
    value: function () {
      var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee(address, data, txHash) {
        var trace, evmCallStack;
        return _regenerator2.default.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                _context.next = 2;
                return this.getTransactionTrace(txHash, {
                  disableMemory: true,
                  disableStack: false,
                  disableStorage: true
                });

              case 2:
                trace = _context.sent;
                evmCallStack = (0, _trace.getRevertTrace)(trace.structLogs, address);

                if (!(evmCallStack.length > 0)) {
                  _context.next = 6;
                  break;
                }

                return _context.abrupt('return', this.getStackTrace(evmCallStack));

              case 6:
                return _context.abrupt('return', null);

              case 7:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function recordTxTrace(_x3, _x4, _x5) {
        return _ref.apply(this, arguments);
      }

      return recordTxTrace;
    }()
  }, {
    key: 'getStackTrace',
    value: function () {
      var _ref2 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee2(evmCallStack) {
        var sourceRanges, index, evmCallStackEntry, isContractCreation, bytecode, contractData, errMsg, bytecodeHex, sourceMap, pcToSourceRange, sourceRange, pc, traceArray;
        return _regenerator2.default.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                sourceRanges = [];

                if (!this._contractsData) {
                  this._contractsData = this.collectContractsData();
                }

                index = 0;

              case 3:
                if (!(index < evmCallStack.length)) {
                  _context2.next = 34;
                  break;
                }

                evmCallStackEntry = evmCallStack[index];
                isContractCreation = evmCallStackEntry.address === _trace.constants.NEW_CONTRACT;

                if (!isContractCreation) {
                  _context2.next = 9;
                  break;
                }

                console.error('Contract creation not supported');
                return _context2.abrupt('continue', 31);

              case 9:
                _context2.next = 11;
                return this.getContractCode(evmCallStackEntry.address);

              case 11:
                bytecode = _context2.sent;
                contractData = this.getContractDataIfExists(this._contractsData.contractsData, bytecode);

                if (contractData) {
                  _context2.next = 17;
                  break;
                }

                errMsg = isContractCreation ? 'Unknown contract creation transaction' : 'Transaction to an unknown address: ' + evmCallStackEntry.address;

                console.warn(errMsg);
                return _context2.abrupt('continue', 31);

              case 17:
                bytecodeHex = _ethereumjsUtil2.default.stripHexPrefix(bytecode);
                sourceMap = isContractCreation ? contractData.sourceMap : contractData.sourceMapRuntime;
                pcToSourceRange = (0, _sourceMaps.parseSourceMap)(this._contractsData.sourceCodes, sourceMap, bytecodeHex, this._contractsData.sources);
                sourceRange = void 0;
                pc = evmCallStackEntry.structLog.pc;
                // Sometimes there is not a mapping for this pc (e.g. if the revert
                // actually happens in assembly). In that case, we want to keep
                // searching backwards by decrementing the pc until we find a
                // mapped source range.

              case 22:
                if (sourceRange) {
                  _context2.next = 30;
                  break;
                }

                sourceRange = pcToSourceRange[pc];
                pc -= 1;

                if (!(pc <= 0)) {
                  _context2.next = 28;
                  break;
                }

                console.warn('could not find matching sourceRange for structLog: ' + evmCallStackEntry.structLog);
                return _context2.abrupt('continue', 22);

              case 28:
                _context2.next = 22;
                break;

              case 30:
                sourceRanges.push(sourceRange);

              case 31:
                index++;
                _context2.next = 3;
                break;

              case 34:
                if (!(sourceRanges.length > 0)) {
                  _context2.next = 37;
                  break;
                }

                traceArray = sourceRanges.map(function (sourceRange) {
                  return [sourceRange.fileName, sourceRange.location.start.line, sourceRange.location.start.column].join(':');
                });
                return _context2.abrupt('return', '\n\nStack trace for REVERT:\n' + traceArray.reverse().join('\n') + '\n');

              case 37:
                return _context2.abrupt('return', '\n\nCould not determine stack trace for REVERT\n');

              case 38:
              case 'end':
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function getStackTrace(_x6) {
        return _ref2.apply(this, arguments);
      }

      return getStackTrace;
    }()
  }, {
    key: 'collectContractsData',
    value: function collectContractsData() {
      var artifactsGlob = 'build/contracts/**/*.json';
      var artifactFileNames = _glob2.default.sync(artifactsGlob, { absolute: true });
      var contractsData = [];
      var sources = [];
      artifactFileNames.forEach(function (artifactFileName) {
        var artifact = JSON.parse(_fs2.default.readFileSync(artifactFileName).toString());

        // If the sourcePath starts with zeppelin, then prepend with the pwd and node_modules
        if (new RegExp('^openzeppelin-solidity').test(artifact.sourcePath)) {
          artifact.sourcePath = process.env.PWD + '/node_modules/' + artifact.sourcePath;
        }

        sources.push({
          artifactFileName: artifactFileName,
          id: artifact.ast.id,
          sourcePath: artifact.sourcePath
        });

        if (!artifact.bytecode) {
          console.warn(artifactFileName + ' doesn\'t contain bytecode. Skipping...');
          return;
        }

        var contractData = {
          artifactFileName: artifactFileName,
          sourceCodes: sourceCodes,
          sources: sources,
          bytecode: artifact.bytecode,
          sourceMap: artifact.sourceMap,
          runtimeBytecode: artifact.deployedBytecode,
          sourceMapRuntime: artifact.deployedSourceMap
        };
        contractsData.push(contractData);
      });
      sources = sources.sort(function (a, b) {
        return parseInt(a.id, 10) - parseInt(b.id, 10);
      });
      var sourceCodes = sources.map(function (source) {
        return _fs2.default.readFileSync(source.sourcePath).toString();
      });
      return {
        contractsData: contractsData,
        sourceCodes: sourceCodes,
        sources: sources.map(function (s) {
          return s.sourcePath;
        })
      };
    }
  }, {
    key: 'getContractDataIfExists',
    value: function getContractDataIfExists(contractsData, bytecode) {
      var _this3 = this;

      if (!bytecode.startsWith('0x')) {
        throw new Error('0x hex prefix missing: ' + bytecode);
      }

      var contractData = contractsData.find(function (contractDataCandidate) {
        var bytecodeRegex = _this3.bytecodeToBytecodeRegex(contractDataCandidate.bytecode);
        var runtimeBytecodeRegex = _this3.bytecodeToBytecodeRegex(contractDataCandidate.runtimeBytecode);

        if (contractDataCandidate.bytecode.length === 2 || contractDataCandidate.runtimeBytecode.length === 2) {
          return false;
        }

        // We use that function to find by bytecode or runtimeBytecode. Those are quasi-random strings so
        // collisions are practically impossible and it allows us to reuse that code
        return bytecode === contractDataCandidate.bytecode || bytecode === contractDataCandidate.runtimeBytecode || new RegExp('' + bytecodeRegex, 'g').test(bytecode) || new RegExp('' + runtimeBytecodeRegex, 'g').test(bytecode);
      });

      return contractData;
    }
  }, {
    key: 'bytecodeToBytecodeRegex',
    value: function bytecodeToBytecodeRegex(bytecode) {
      var bytecodeRegex = bytecode
      // Library linking placeholder: __ConvertLib____________________________
      .replace(/_.*_/, '.*')
      // Last 86 characters is solidity compiler metadata that's different between compilations
      .replace(/.{86}$/, '')
      // Libraries contain their own address at the beginning of the code and it's impossible to know it in advance
      .replace(/^0x730000000000000000000000000000000000000000/, '0x73........................................');
      // HACK: Node regexes can't be longer that 32767 characters. Contracts bytecode can. We just truncate the regexes. It's safe in practice.
      var MAX_REGEX_LENGTH = 32767;
      var truncatedBytecodeRegex = bytecodeRegex.slice(0, MAX_REGEX_LENGTH);
      return truncatedBytecodeRegex;
    }
  }]);
  return Web3TraceProvider;
}();

exports.default = Web3TraceProvider;
module.exports = exports['default'];
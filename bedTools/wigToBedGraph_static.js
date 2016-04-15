// The Module object: Our interface to the outside world. We import
// and export values on it, and do the work to get that through
// closure compiler if necessary. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(Module) { ..generated code.. }
// 3. pre-run appended it, var Module = {}; ..generated code..
// 4. External script tag defines var Module.
// We need to do an eval in order to handle the closure compiler
// case, where this code here is minified but Module was defined
// elsewhere (e.g. case 4 above). We also need to check if Module
// already exists (e.g. case 3 above).
// Note that if you want to run closure, and also to use Module
// after the generated code, you will need to define   var Module = {};
// before the code. Then that object will be used in the code, and you
// can continue to use Module afterwards as well.
var Module;
if (!Module) Module = (typeof Module !== 'undefined' ? Module : null) || {};

// Sometimes an existing Module object exists with properties
// meant to overwrite the default module functionality. Here
// we collect those properties and reapply _after_ we configure
// the current environment's defaults to avoid having to be so
// defensive during initialization.
var moduleOverrides = {};
for (var key in Module) {
  if (Module.hasOwnProperty(key)) {
    moduleOverrides[key] = Module[key];
  }
}

// The environment setup code below is customized to use Module.
// *** Environment setup code ***
var ENVIRONMENT_IS_WEB = typeof window === 'object';
// Three configurations we can be running in:
// 1) We could be the application main() thread running in the main JS UI thread. (ENVIRONMENT_IS_WORKER == false and ENVIRONMENT_IS_PTHREAD == false)
// 2) We could be the application main() thread proxied to worker. (with Emscripten -s PROXY_TO_WORKER=1) (ENVIRONMENT_IS_WORKER == true, ENVIRONMENT_IS_PTHREAD == false)
// 3) We could be an application pthread running in a worker. (ENVIRONMENT_IS_WORKER == true and ENVIRONMENT_IS_PTHREAD == true)
var ENVIRONMENT_IS_WORKER = typeof importScripts === 'function';
var ENVIRONMENT_IS_NODE = typeof process === 'object' && typeof require === 'function' && !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_WORKER;
var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;

if (ENVIRONMENT_IS_NODE) {
  // Expose functionality in the same simple way that the shells work
  // Note that we pollute the global namespace here, otherwise we break in node
  if (!Module['print']) Module['print'] = function print(x) {
    process['stdout'].write(x + '\n');
  };
  if (!Module['printErr']) Module['printErr'] = function printErr(x) {
    process['stderr'].write(x + '\n');
  };

  var nodeFS = require('fs');
  var nodePath = require('path');

  Module['read'] = function read(filename, binary) {
    filename = nodePath['normalize'](filename);
    var ret = nodeFS['readFileSync'](filename);
    // The path is absolute if the normalized version is the same as the resolved.
    if (!ret && filename != nodePath['resolve'](filename)) {
      filename = path.join(__dirname, '..', 'src', filename);
      ret = nodeFS['readFileSync'](filename);
    }
    if (ret && !binary) ret = ret.toString();
    return ret;
  };

  Module['readBinary'] = function readBinary(filename) {
    var ret = Module['read'](filename, true);
    if (!ret.buffer) {
      ret = new Uint8Array(ret);
    }
    assert(ret.buffer);
    return ret;
  };

  Module['load'] = function load(f) {
    globalEval(read(f));
  };

  if (!Module['thisProgram']) {
    if (process['argv'].length > 1) {
      Module['thisProgram'] = process['argv'][1].replace(/\\/g, '/');
    } else {
      Module['thisProgram'] = 'unknown-program';
    }
  }

  Module['arguments'] = process['argv'].slice(2);

  if (typeof module !== 'undefined') {
    module['exports'] = Module;
  }

  process['on']('uncaughtException', function(ex) {
    // suppress ExitStatus exceptions from showing an error
    if (!(ex instanceof ExitStatus)) {
      throw ex;
    }
  });

  Module['inspect'] = function () { return '[Emscripten Module object]'; };
}
else if (ENVIRONMENT_IS_SHELL) {
  if (!Module['print']) Module['print'] = print;
  if (typeof printErr != 'undefined') Module['printErr'] = printErr; // not present in v8 or older sm

  if (typeof read != 'undefined') {
    Module['read'] = read;
  } else {
    Module['read'] = function read() { throw 'no read() available (jsc?)' };
  }

  Module['readBinary'] = function readBinary(f) {
    if (typeof readbuffer === 'function') {
      return new Uint8Array(readbuffer(f));
    }
    var data = read(f, 'binary');
    assert(typeof data === 'object');
    return data;
  };

  if (typeof scriptArgs != 'undefined') {
    Module['arguments'] = scriptArgs;
  } else if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }

}
else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  Module['read'] = function read(url) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.send(null);
    return xhr.responseText;
  };

  if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }

  if (typeof console !== 'undefined') {
    if (!Module['print']) Module['print'] = function print(x) {
      console.log(x);
    };
    if (!Module['printErr']) Module['printErr'] = function printErr(x) {
      console.log(x);
    };
  } else {
    // Probably a worker, and without console.log. We can do very little here...
    var TRY_USE_DUMP = false;
    if (!Module['print']) Module['print'] = (TRY_USE_DUMP && (typeof(dump) !== "undefined") ? (function(x) {
      dump(x);
    }) : (function(x) {
      // self.postMessage(x); // enable this if you want stdout to be sent as messages
    }));
  }

  if (ENVIRONMENT_IS_WORKER) {
    Module['load'] = importScripts;
  }

  if (typeof Module['setWindowTitle'] === 'undefined') {
    Module['setWindowTitle'] = function(title) { document.title = title };
  }
}
else {
  // Unreachable because SHELL is dependant on the others
  throw 'Unknown runtime environment. Where are we?';
}

function globalEval(x) {
  eval.call(null, x);
}
if (!Module['load'] && Module['read']) {
  Module['load'] = function load(f) {
    globalEval(Module['read'](f));
  };
}
if (!Module['print']) {
  Module['print'] = function(){};
}
if (!Module['printErr']) {
  Module['printErr'] = Module['print'];
}
if (!Module['arguments']) {
  Module['arguments'] = [];
}
if (!Module['thisProgram']) {
  Module['thisProgram'] = './this.program';
}

// *** Environment setup code ***

// Closure helpers
Module.print = Module['print'];
Module.printErr = Module['printErr'];

// Callbacks
Module['preRun'] = [];
Module['postRun'] = [];

// Merge back in the overrides
for (var key in moduleOverrides) {
  if (moduleOverrides.hasOwnProperty(key)) {
    Module[key] = moduleOverrides[key];
  }
}



// === Preamble library stuff ===

// Documentation for the public APIs defined in this file must be updated in: 
//    site/source/docs/api_reference/preamble.js.rst
// A prebuilt local version of the documentation is available at: 
//    site/build/text/docs/api_reference/preamble.js.txt
// You can also build docs locally as HTML or other formats in site/
// An online HTML version (which may be of a different version of Emscripten)
//    is up at http://kripken.github.io/emscripten-site/docs/api_reference/preamble.js.html

//========================================
// Runtime code shared with compiler
//========================================

var Runtime = {
  setTempRet0: function (value) {
    tempRet0 = value;
  },
  getTempRet0: function () {
    return tempRet0;
  },
  stackSave: function () {
    return STACKTOP;
  },
  stackRestore: function (stackTop) {
    STACKTOP = stackTop;
  },
  getNativeTypeSize: function (type) {
    switch (type) {
      case 'i1': case 'i8': return 1;
      case 'i16': return 2;
      case 'i32': return 4;
      case 'i64': return 8;
      case 'float': return 4;
      case 'double': return 8;
      default: {
        if (type[type.length-1] === '*') {
          return Runtime.QUANTUM_SIZE; // A pointer
        } else if (type[0] === 'i') {
          var bits = parseInt(type.substr(1));
          assert(bits % 8 === 0);
          return bits/8;
        } else {
          return 0;
        }
      }
    }
  },
  getNativeFieldSize: function (type) {
    return Math.max(Runtime.getNativeTypeSize(type), Runtime.QUANTUM_SIZE);
  },
  STACK_ALIGN: 16,
  prepVararg: function (ptr, type) {
    if (type === 'double' || type === 'i64') {
      // move so the load is aligned
      if (ptr & 7) {
        assert((ptr & 7) === 4);
        ptr += 4;
      }
    } else {
      assert((ptr & 3) === 0);
    }
    return ptr;
  },
  getAlignSize: function (type, size, vararg) {
    // we align i64s and doubles on 64-bit boundaries, unlike x86
    if (!vararg && (type == 'i64' || type == 'double')) return 8;
    if (!type) return Math.min(size, 8); // align structures internally to 64 bits
    return Math.min(size || (type ? Runtime.getNativeFieldSize(type) : 0), Runtime.QUANTUM_SIZE);
  },
  dynCall: function (sig, ptr, args) {
    if (args && args.length) {
      if (!args.splice) args = Array.prototype.slice.call(args);
      args.splice(0, 0, ptr);
      return Module['dynCall_' + sig].apply(null, args);
    } else {
      return Module['dynCall_' + sig].call(null, ptr);
    }
  },
  functionPointers: [],
  addFunction: function (func) {
    for (var i = 0; i < Runtime.functionPointers.length; i++) {
      if (!Runtime.functionPointers[i]) {
        Runtime.functionPointers[i] = func;
        return 2*(1 + i);
      }
    }
    throw 'Finished up all reserved function pointers. Use a higher value for RESERVED_FUNCTION_POINTERS.';
  },
  removeFunction: function (index) {
    Runtime.functionPointers[(index-2)/2] = null;
  },
  warnOnce: function (text) {
    if (!Runtime.warnOnce.shown) Runtime.warnOnce.shown = {};
    if (!Runtime.warnOnce.shown[text]) {
      Runtime.warnOnce.shown[text] = 1;
      Module.printErr(text);
    }
  },
  funcWrappers: {},
  getFuncWrapper: function (func, sig) {
    assert(sig);
    if (!Runtime.funcWrappers[sig]) {
      Runtime.funcWrappers[sig] = {};
    }
    var sigCache = Runtime.funcWrappers[sig];
    if (!sigCache[func]) {
      sigCache[func] = function dynCall_wrapper() {
        return Runtime.dynCall(sig, func, arguments);
      };
    }
    return sigCache[func];
  },
  getCompilerSetting: function (name) {
    throw 'You must build with -s RETAIN_COMPILER_SETTINGS=1 for Runtime.getCompilerSetting or emscripten_get_compiler_setting to work';
  },
  stackAlloc: function (size) { var ret = STACKTOP;STACKTOP = (STACKTOP + size)|0;STACKTOP = (((STACKTOP)+15)&-16); return ret; },
  staticAlloc: function (size) { var ret = STATICTOP;STATICTOP = (STATICTOP + size)|0;STATICTOP = (((STATICTOP)+15)&-16); return ret; },
  dynamicAlloc: function (size) { var ret = DYNAMICTOP;DYNAMICTOP = (DYNAMICTOP + size)|0;DYNAMICTOP = (((DYNAMICTOP)+15)&-16); if (DYNAMICTOP >= TOTAL_MEMORY) { var success = enlargeMemory(); if (!success) { DYNAMICTOP = ret;  return 0; } }; return ret; },
  alignMemory: function (size,quantum) { var ret = size = Math.ceil((size)/(quantum ? quantum : 16))*(quantum ? quantum : 16); return ret; },
  makeBigInt: function (low,high,unsigned) { var ret = (unsigned ? ((+((low>>>0)))+((+((high>>>0)))*(+4294967296))) : ((+((low>>>0)))+((+((high|0)))*(+4294967296)))); return ret; },
  GLOBAL_BASE: 8,
  QUANTUM_SIZE: 4,
  __dummy__: 0
}



Module["Runtime"] = Runtime;



//========================================
// Runtime essentials
//========================================

var __THREW__ = 0; // Used in checking for thrown exceptions.

var ABORT = false; // whether we are quitting the application. no code should run after this. set in exit() and abort()
var EXITSTATUS = 0;

var undef = 0;
// tempInt is used for 32-bit signed values or smaller. tempBigInt is used
// for 32-bit unsigned values or more than 32 bits. TODO: audit all uses of tempInt
var tempValue, tempInt, tempBigInt, tempInt2, tempBigInt2, tempPair, tempBigIntI, tempBigIntR, tempBigIntS, tempBigIntP, tempBigIntD, tempDouble, tempFloat;
var tempI64, tempI64b;
var tempRet0, tempRet1, tempRet2, tempRet3, tempRet4, tempRet5, tempRet6, tempRet7, tempRet8, tempRet9;

function assert(condition, text) {
  if (!condition) {
    abort('Assertion failed: ' + text);
  }
}

var globalScope = this;

// Returns the C function with a specified identifier (for C++, you need to do manual name mangling)
function getCFunc(ident) {
  var func = Module['_' + ident]; // closure exported function
  if (!func) {
    try {
      func = eval('_' + ident); // explicit lookup
    } catch(e) {}
  }
  assert(func, 'Cannot call unknown function ' + ident + ' (perhaps LLVM optimizations or closure removed it?)');
  return func;
}

var cwrap, ccall;
(function(){
  var JSfuncs = {
    // Helpers for cwrap -- it can't refer to Runtime directly because it might
    // be renamed by closure, instead it calls JSfuncs['stackSave'].body to find
    // out what the minified function name is.
    'stackSave': function() {
      Runtime.stackSave()
    },
    'stackRestore': function() {
      Runtime.stackRestore()
    },
    // type conversion from js to c
    'arrayToC' : function(arr) {
      var ret = Runtime.stackAlloc(arr.length);
      writeArrayToMemory(arr, ret);
      return ret;
    },
    'stringToC' : function(str) {
      var ret = 0;
      if (str !== null && str !== undefined && str !== 0) { // null string
        // at most 4 bytes per UTF-8 code point, +1 for the trailing '\0'
        ret = Runtime.stackAlloc((str.length << 2) + 1);
        writeStringToMemory(str, ret);
      }
      return ret;
    }
  };
  // For fast lookup of conversion functions
  var toC = {'string' : JSfuncs['stringToC'], 'array' : JSfuncs['arrayToC']};

  // C calling interface. 
  ccall = function ccallFunc(ident, returnType, argTypes, args, opts) {
    var func = getCFunc(ident);
    var cArgs = [];
    var stack = 0;
    if (args) {
      for (var i = 0; i < args.length; i++) {
        var converter = toC[argTypes[i]];
        if (converter) {
          if (stack === 0) stack = Runtime.stackSave();
          cArgs[i] = converter(args[i]);
        } else {
          cArgs[i] = args[i];
        }
      }
    }
    var ret = func.apply(null, cArgs);
    if (returnType === 'string') ret = Pointer_stringify(ret);
    if (stack !== 0) {
      if (opts && opts.async) {
        EmterpreterAsync.asyncFinalizers.push(function() {
          Runtime.stackRestore(stack);
        });
        return;
      }
      Runtime.stackRestore(stack);
    }
    return ret;
  }

  var sourceRegex = /^function\s*\(([^)]*)\)\s*{\s*([^*]*?)[\s;]*(?:return\s*(.*?)[;\s]*)?}$/;
  function parseJSFunc(jsfunc) {
    // Match the body and the return value of a javascript function source
    var parsed = jsfunc.toString().match(sourceRegex).slice(1);
    return {arguments : parsed[0], body : parsed[1], returnValue: parsed[2]}
  }
  var JSsource = {};
  for (var fun in JSfuncs) {
    if (JSfuncs.hasOwnProperty(fun)) {
      // Elements of toCsource are arrays of three items:
      // the code, and the return value
      JSsource[fun] = parseJSFunc(JSfuncs[fun]);
    }
  }

  
  cwrap = function cwrap(ident, returnType, argTypes) {
    argTypes = argTypes || [];
    var cfunc = getCFunc(ident);
    // When the function takes numbers and returns a number, we can just return
    // the original function
    var numericArgs = argTypes.every(function(type){ return type === 'number'});
    var numericRet = (returnType !== 'string');
    if ( numericRet && numericArgs) {
      return cfunc;
    }
    // Creation of the arguments list (["$1","$2",...,"$nargs"])
    var argNames = argTypes.map(function(x,i){return '$'+i});
    var funcstr = "(function(" + argNames.join(',') + ") {";
    var nargs = argTypes.length;
    if (!numericArgs) {
      // Generate the code needed to convert the arguments from javascript
      // values to pointers
      funcstr += 'var stack = ' + JSsource['stackSave'].body + ';';
      for (var i = 0; i < nargs; i++) {
        var arg = argNames[i], type = argTypes[i];
        if (type === 'number') continue;
        var convertCode = JSsource[type + 'ToC']; // [code, return]
        funcstr += 'var ' + convertCode.arguments + ' = ' + arg + ';';
        funcstr += convertCode.body + ';';
        funcstr += arg + '=' + convertCode.returnValue + ';';
      }
    }

    // When the code is compressed, the name of cfunc is not literally 'cfunc' anymore
    var cfuncname = parseJSFunc(function(){return cfunc}).returnValue;
    // Call the function
    funcstr += 'var ret = ' + cfuncname + '(' + argNames.join(',') + ');';
    if (!numericRet) { // Return type can only by 'string' or 'number'
      // Convert the result to a string
      var strgfy = parseJSFunc(function(){return Pointer_stringify}).returnValue;
      funcstr += 'ret = ' + strgfy + '(ret);';
    }
    if (!numericArgs) {
      // If we had a stack, restore it
      funcstr += JSsource['stackRestore'].body.replace('()', '(stack)') + ';';
    }
    funcstr += 'return ret})';
    return eval(funcstr);
  };
})();
Module["ccall"] = ccall;
Module["cwrap"] = cwrap;

function setValue(ptr, value, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': HEAP8[((ptr)>>0)]=value; break;
      case 'i8': HEAP8[((ptr)>>0)]=value; break;
      case 'i16': HEAP16[((ptr)>>1)]=value; break;
      case 'i32': HEAP32[((ptr)>>2)]=value; break;
      case 'i64': (tempI64 = [value>>>0,(tempDouble=value,(+(Math_abs(tempDouble))) >= (+1) ? (tempDouble > (+0) ? ((Math_min((+(Math_floor((tempDouble)/(+4294967296)))), (+4294967295)))|0)>>>0 : (~~((+(Math_ceil((tempDouble - +(((~~(tempDouble)))>>>0))/(+4294967296))))))>>>0) : 0)],HEAP32[((ptr)>>2)]=tempI64[0],HEAP32[(((ptr)+(4))>>2)]=tempI64[1]); break;
      case 'float': HEAPF32[((ptr)>>2)]=value; break;
      case 'double': HEAPF64[((ptr)>>3)]=value; break;
      default: abort('invalid type for setValue: ' + type);
    }
}
Module["setValue"] = setValue;


function getValue(ptr, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': return HEAP8[((ptr)>>0)];
      case 'i8': return HEAP8[((ptr)>>0)];
      case 'i16': return HEAP16[((ptr)>>1)];
      case 'i32': return HEAP32[((ptr)>>2)];
      case 'i64': return HEAP32[((ptr)>>2)];
      case 'float': return HEAPF32[((ptr)>>2)];
      case 'double': return HEAPF64[((ptr)>>3)];
      default: abort('invalid type for setValue: ' + type);
    }
  return null;
}
Module["getValue"] = getValue;

var ALLOC_NORMAL = 0; // Tries to use _malloc()
var ALLOC_STACK = 1; // Lives for the duration of the current function call
var ALLOC_STATIC = 2; // Cannot be freed
var ALLOC_DYNAMIC = 3; // Cannot be freed except through sbrk
var ALLOC_NONE = 4; // Do not allocate
Module["ALLOC_NORMAL"] = ALLOC_NORMAL;
Module["ALLOC_STACK"] = ALLOC_STACK;
Module["ALLOC_STATIC"] = ALLOC_STATIC;
Module["ALLOC_DYNAMIC"] = ALLOC_DYNAMIC;
Module["ALLOC_NONE"] = ALLOC_NONE;

// allocate(): This is for internal use. You can use it yourself as well, but the interface
//             is a little tricky (see docs right below). The reason is that it is optimized
//             for multiple syntaxes to save space in generated code. So you should
//             normally not use allocate(), and instead allocate memory using _malloc(),
//             initialize it with setValue(), and so forth.
// @slab: An array of data, or a number. If a number, then the size of the block to allocate,
//        in *bytes* (note that this is sometimes confusing: the next parameter does not
//        affect this!)
// @types: Either an array of types, one for each byte (or 0 if no type at that position),
//         or a single type which is used for the entire block. This only matters if there
//         is initial data - if @slab is a number, then this does not matter at all and is
//         ignored.
// @allocator: How to allocate memory, see ALLOC_*
function allocate(slab, types, allocator, ptr) {
  var zeroinit, size;
  if (typeof slab === 'number') {
    zeroinit = true;
    size = slab;
  } else {
    zeroinit = false;
    size = slab.length;
  }

  var singleType = typeof types === 'string' ? types : null;

  var ret;
  if (allocator == ALLOC_NONE) {
    ret = ptr;
  } else {
    ret = [_malloc, Runtime.stackAlloc, Runtime.staticAlloc, Runtime.dynamicAlloc][allocator === undefined ? ALLOC_STATIC : allocator](Math.max(size, singleType ? 1 : types.length));
  }

  if (zeroinit) {
    var ptr = ret, stop;
    assert((ret & 3) == 0);
    stop = ret + (size & ~3);
    for (; ptr < stop; ptr += 4) {
      HEAP32[((ptr)>>2)]=0;
    }
    stop = ret + size;
    while (ptr < stop) {
      HEAP8[((ptr++)>>0)]=0;
    }
    return ret;
  }

  if (singleType === 'i8') {
    if (slab.subarray || slab.slice) {
      HEAPU8.set(slab, ret);
    } else {
      HEAPU8.set(new Uint8Array(slab), ret);
    }
    return ret;
  }

  var i = 0, type, typeSize, previousType;
  while (i < size) {
    var curr = slab[i];

    if (typeof curr === 'function') {
      curr = Runtime.getFunctionIndex(curr);
    }

    type = singleType || types[i];
    if (type === 0) {
      i++;
      continue;
    }

    if (type == 'i64') type = 'i32'; // special case: we have one i32 here, and one i32 later

    setValue(ret+i, curr, type);

    // no need to look up size unless type changes, so cache it
    if (previousType !== type) {
      typeSize = Runtime.getNativeTypeSize(type);
      previousType = type;
    }
    i += typeSize;
  }

  return ret;
}
Module["allocate"] = allocate;

// Allocate memory during any stage of startup - static memory early on, dynamic memory later, malloc when ready
function getMemory(size) {
  if (!staticSealed) return Runtime.staticAlloc(size);
  if ((typeof _sbrk !== 'undefined' && !_sbrk.called) || !runtimeInitialized) return Runtime.dynamicAlloc(size);
  return _malloc(size);
}
Module["getMemory"] = getMemory;

function Pointer_stringify(ptr, /* optional */ length) {
  if (length === 0 || !ptr) return '';
  // TODO: use TextDecoder
  // Find the length, and check for UTF while doing so
  var hasUtf = 0;
  var t;
  var i = 0;
  while (1) {
    t = HEAPU8[(((ptr)+(i))>>0)];
    hasUtf |= t;
    if (t == 0 && !length) break;
    i++;
    if (length && i == length) break;
  }
  if (!length) length = i;

  var ret = '';

  if (hasUtf < 128) {
    var MAX_CHUNK = 1024; // split up into chunks, because .apply on a huge string can overflow the stack
    var curr;
    while (length > 0) {
      curr = String.fromCharCode.apply(String, HEAPU8.subarray(ptr, ptr + Math.min(length, MAX_CHUNK)));
      ret = ret ? ret + curr : curr;
      ptr += MAX_CHUNK;
      length -= MAX_CHUNK;
    }
    return ret;
  }
  return Module['UTF8ToString'](ptr);
}
Module["Pointer_stringify"] = Pointer_stringify;

// Given a pointer 'ptr' to a null-terminated ASCII-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

function AsciiToString(ptr) {
  var str = '';
  while (1) {
    var ch = HEAP8[((ptr++)>>0)];
    if (!ch) return str;
    str += String.fromCharCode(ch);
  }
}
Module["AsciiToString"] = AsciiToString;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in ASCII form. The copy will require at most str.length+1 bytes of space in the HEAP.

function stringToAscii(str, outPtr) {
  return writeAsciiToMemory(str, outPtr, false);
}
Module["stringToAscii"] = stringToAscii;

// Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the given array that contains uint8 values, returns
// a copy of that string as a Javascript String object.

function UTF8ArrayToString(u8Array, idx) {
  var u0, u1, u2, u3, u4, u5;

  var str = '';
  while (1) {
    // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description and https://www.ietf.org/rfc/rfc2279.txt and https://tools.ietf.org/html/rfc3629
    u0 = u8Array[idx++];
    if (!u0) return str;
    if (!(u0 & 0x80)) { str += String.fromCharCode(u0); continue; }
    u1 = u8Array[idx++] & 63;
    if ((u0 & 0xE0) == 0xC0) { str += String.fromCharCode(((u0 & 31) << 6) | u1); continue; }
    u2 = u8Array[idx++] & 63;
    if ((u0 & 0xF0) == 0xE0) {
      u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
    } else {
      u3 = u8Array[idx++] & 63;
      if ((u0 & 0xF8) == 0xF0) {
        u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | u3;
      } else {
        u4 = u8Array[idx++] & 63;
        if ((u0 & 0xFC) == 0xF8) {
          u0 = ((u0 & 3) << 24) | (u1 << 18) | (u2 << 12) | (u3 << 6) | u4;
        } else {
          u5 = u8Array[idx++] & 63;
          u0 = ((u0 & 1) << 30) | (u1 << 24) | (u2 << 18) | (u3 << 12) | (u4 << 6) | u5;
        }
      }
    }
    if (u0 < 0x10000) {
      str += String.fromCharCode(u0);
    } else {
      var ch = u0 - 0x10000;
      str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
    }
  }
}
Module["UTF8ArrayToString"] = UTF8ArrayToString;

// Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

function UTF8ToString(ptr) {
  return UTF8ArrayToString(HEAPU8,ptr);
}
Module["UTF8ToString"] = UTF8ToString;

// Copies the given Javascript String object 'str' to the given byte array at address 'outIdx',
// encoded in UTF8 form and null-terminated. The copy will require at most str.length*4+1 bytes of space in the HEAP.
// Use the function lengthBytesUTF8() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outU8Array: the array to copy to. Each index in this array is assumed to be one 8-byte element.
//   outIdx: The starting offset in the array to begin the copying.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null 
//                    terminator, i.e. if maxBytesToWrite=1, only the null terminator will be written and nothing else.
//                    maxBytesToWrite=0 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF8Array(str, outU8Array, outIdx, maxBytesToWrite) {
  if (!(maxBytesToWrite > 0)) // Parameter maxBytesToWrite is not optional. Negative values, 0, null, undefined and false each don't write out any bytes.
    return 0;

  var startIdx = outIdx;
  var endIdx = outIdx + maxBytesToWrite - 1; // -1 for string null terminator.
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! So decode UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description and https://www.ietf.org/rfc/rfc2279.txt and https://tools.ietf.org/html/rfc3629
    var u = str.charCodeAt(i); // possibly a lead surrogate
    if (u >= 0xD800 && u <= 0xDFFF) u = 0x10000 + ((u & 0x3FF) << 10) | (str.charCodeAt(++i) & 0x3FF);
    if (u <= 0x7F) {
      if (outIdx >= endIdx) break;
      outU8Array[outIdx++] = u;
    } else if (u <= 0x7FF) {
      if (outIdx + 1 >= endIdx) break;
      outU8Array[outIdx++] = 0xC0 | (u >> 6);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0xFFFF) {
      if (outIdx + 2 >= endIdx) break;
      outU8Array[outIdx++] = 0xE0 | (u >> 12);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0x1FFFFF) {
      if (outIdx + 3 >= endIdx) break;
      outU8Array[outIdx++] = 0xF0 | (u >> 18);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0x3FFFFFF) {
      if (outIdx + 4 >= endIdx) break;
      outU8Array[outIdx++] = 0xF8 | (u >> 24);
      outU8Array[outIdx++] = 0x80 | ((u >> 18) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else {
      if (outIdx + 5 >= endIdx) break;
      outU8Array[outIdx++] = 0xFC | (u >> 30);
      outU8Array[outIdx++] = 0x80 | ((u >> 24) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 18) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    }
  }
  // Null-terminate the pointer to the buffer.
  outU8Array[outIdx] = 0;
  return outIdx - startIdx;
}
Module["stringToUTF8Array"] = stringToUTF8Array;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF8 form. The copy will require at most str.length*4+1 bytes of space in the HEAP.
// Use the function lengthBytesUTF8() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF8(str, outPtr, maxBytesToWrite) {
  return stringToUTF8Array(str, HEAPU8,outPtr, maxBytesToWrite);
}
Module["stringToUTF8"] = stringToUTF8;

// Returns the number of bytes the given Javascript string takes if encoded as a UTF8 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF8(str) {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! So decode UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var u = str.charCodeAt(i); // possibly a lead surrogate
    if (u >= 0xD800 && u <= 0xDFFF) u = 0x10000 + ((u & 0x3FF) << 10) | (str.charCodeAt(++i) & 0x3FF);
    if (u <= 0x7F) {
      ++len;
    } else if (u <= 0x7FF) {
      len += 2;
    } else if (u <= 0xFFFF) {
      len += 3;
    } else if (u <= 0x1FFFFF) {
      len += 4;
    } else if (u <= 0x3FFFFFF) {
      len += 5;
    } else {
      len += 6;
    }
  }
  return len;
}
Module["lengthBytesUTF8"] = lengthBytesUTF8;

// Given a pointer 'ptr' to a null-terminated UTF16LE-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

function UTF16ToString(ptr) {
  var i = 0;

  var str = '';
  while (1) {
    var codeUnit = HEAP16[(((ptr)+(i*2))>>1)];
    if (codeUnit == 0)
      return str;
    ++i;
    // fromCharCode constructs a character from a UTF-16 code unit, so we can pass the UTF16 string right through.
    str += String.fromCharCode(codeUnit);
  }
}
Module["UTF16ToString"] = UTF16ToString;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF16 form. The copy will require at most str.length*4+2 bytes of space in the HEAP.
// Use the function lengthBytesUTF16() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outPtr: Byte address in Emscripten HEAP where to write the string to.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null 
//                    terminator, i.e. if maxBytesToWrite=2, only the null terminator will be written and nothing else.
//                    maxBytesToWrite<2 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF16(str, outPtr, maxBytesToWrite) {
  // Backwards compatibility: if max bytes is not specified, assume unsafe unbounded write is allowed.
  if (maxBytesToWrite === undefined) {
    maxBytesToWrite = 0x7FFFFFFF;
  }
  if (maxBytesToWrite < 2) return 0;
  maxBytesToWrite -= 2; // Null terminator.
  var startPtr = outPtr;
  var numCharsToWrite = (maxBytesToWrite < str.length*2) ? (maxBytesToWrite / 2) : str.length;
  for (var i = 0; i < numCharsToWrite; ++i) {
    // charCodeAt returns a UTF-16 encoded code unit, so it can be directly written to the HEAP.
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    HEAP16[((outPtr)>>1)]=codeUnit;
    outPtr += 2;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP16[((outPtr)>>1)]=0;
  return outPtr - startPtr;
}
Module["stringToUTF16"] = stringToUTF16;

// Returns the number of bytes the given Javascript string takes if encoded as a UTF16 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF16(str) {
  return str.length*2;
}
Module["lengthBytesUTF16"] = lengthBytesUTF16;

function UTF32ToString(ptr) {
  var i = 0;

  var str = '';
  while (1) {
    var utf32 = HEAP32[(((ptr)+(i*4))>>2)];
    if (utf32 == 0)
      return str;
    ++i;
    // Gotcha: fromCharCode constructs a character from a UTF-16 encoded code (pair), not from a Unicode code point! So encode the code point to UTF-16 for constructing.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    if (utf32 >= 0x10000) {
      var ch = utf32 - 0x10000;
      str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
    } else {
      str += String.fromCharCode(utf32);
    }
  }
}
Module["UTF32ToString"] = UTF32ToString;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF32 form. The copy will require at most str.length*4+4 bytes of space in the HEAP.
// Use the function lengthBytesUTF32() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outPtr: Byte address in Emscripten HEAP where to write the string to.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null 
//                    terminator, i.e. if maxBytesToWrite=4, only the null terminator will be written and nothing else.
//                    maxBytesToWrite<4 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF32(str, outPtr, maxBytesToWrite) {
  // Backwards compatibility: if max bytes is not specified, assume unsafe unbounded write is allowed.
  if (maxBytesToWrite === undefined) {
    maxBytesToWrite = 0x7FFFFFFF;
  }
  if (maxBytesToWrite < 4) return 0;
  var startPtr = outPtr;
  var endPtr = startPtr + maxBytesToWrite - 4;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
      var trailSurrogate = str.charCodeAt(++i);
      codeUnit = 0x10000 + ((codeUnit & 0x3FF) << 10) | (trailSurrogate & 0x3FF);
    }
    HEAP32[((outPtr)>>2)]=codeUnit;
    outPtr += 4;
    if (outPtr + 4 > endPtr) break;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP32[((outPtr)>>2)]=0;
  return outPtr - startPtr;
}
Module["stringToUTF32"] = stringToUTF32;

// Returns the number of bytes the given Javascript string takes if encoded as a UTF16 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF32(str) {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var codeUnit = str.charCodeAt(i);
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) ++i; // possibly a lead surrogate, so skip over the tail surrogate.
    len += 4;
  }

  return len;
}
Module["lengthBytesUTF32"] = lengthBytesUTF32;

function demangle(func) {
  var hasLibcxxabi = !!Module['___cxa_demangle'];
  if (hasLibcxxabi) {
    try {
      var buf = _malloc(func.length);
      writeStringToMemory(func.substr(1), buf);
      var status = _malloc(4);
      var ret = Module['___cxa_demangle'](buf, 0, 0, status);
      if (getValue(status, 'i32') === 0 && ret) {
        return Pointer_stringify(ret);
      }
      // otherwise, libcxxabi failed, we can try ours which may return a partial result
    } catch(e) {
      // failure when using libcxxabi, we can try ours which may return a partial result
    } finally {
      if (buf) _free(buf);
      if (status) _free(status);
      if (ret) _free(ret);
    }
  }
  var i = 3;
  // params, etc.
  var basicTypes = {
    'v': 'void',
    'b': 'bool',
    'c': 'char',
    's': 'short',
    'i': 'int',
    'l': 'long',
    'f': 'float',
    'd': 'double',
    'w': 'wchar_t',
    'a': 'signed char',
    'h': 'unsigned char',
    't': 'unsigned short',
    'j': 'unsigned int',
    'm': 'unsigned long',
    'x': 'long long',
    'y': 'unsigned long long',
    'z': '...'
  };
  var subs = [];
  var first = true;
  function dump(x) {
    //return;
    if (x) Module.print(x);
    Module.print(func);
    var pre = '';
    for (var a = 0; a < i; a++) pre += ' ';
    Module.print (pre + '^');
  }
  function parseNested() {
    i++;
    if (func[i] === 'K') i++; // ignore const
    var parts = [];
    while (func[i] !== 'E') {
      if (func[i] === 'S') { // substitution
        i++;
        var next = func.indexOf('_', i);
        var num = func.substring(i, next) || 0;
        parts.push(subs[num] || '?');
        i = next+1;
        continue;
      }
      if (func[i] === 'C') { // constructor
        parts.push(parts[parts.length-1]);
        i += 2;
        continue;
      }
      var size = parseInt(func.substr(i));
      var pre = size.toString().length;
      if (!size || !pre) { i--; break; } // counter i++ below us
      var curr = func.substr(i + pre, size);
      parts.push(curr);
      subs.push(curr);
      i += pre + size;
    }
    i++; // skip E
    return parts;
  }
  function parse(rawList, limit, allowVoid) { // main parser
    limit = limit || Infinity;
    var ret = '', list = [];
    function flushList() {
      return '(' + list.join(', ') + ')';
    }
    var name;
    if (func[i] === 'N') {
      // namespaced N-E
      name = parseNested().join('::');
      limit--;
      if (limit === 0) return rawList ? [name] : name;
    } else {
      // not namespaced
      if (func[i] === 'K' || (first && func[i] === 'L')) i++; // ignore const and first 'L'
      var size = parseInt(func.substr(i));
      if (size) {
        var pre = size.toString().length;
        name = func.substr(i + pre, size);
        i += pre + size;
      }
    }
    first = false;
    if (func[i] === 'I') {
      i++;
      var iList = parse(true);
      var iRet = parse(true, 1, true);
      ret += iRet[0] + ' ' + name + '<' + iList.join(', ') + '>';
    } else {
      ret = name;
    }
    paramLoop: while (i < func.length && limit-- > 0) {
      //dump('paramLoop');
      var c = func[i++];
      if (c in basicTypes) {
        list.push(basicTypes[c]);
      } else {
        switch (c) {
          case 'P': list.push(parse(true, 1, true)[0] + '*'); break; // pointer
          case 'R': list.push(parse(true, 1, true)[0] + '&'); break; // reference
          case 'L': { // literal
            i++; // skip basic type
            var end = func.indexOf('E', i);
            var size = end - i;
            list.push(func.substr(i, size));
            i += size + 2; // size + 'EE'
            break;
          }
          case 'A': { // array
            var size = parseInt(func.substr(i));
            i += size.toString().length;
            if (func[i] !== '_') throw '?';
            i++; // skip _
            list.push(parse(true, 1, true)[0] + ' [' + size + ']');
            break;
          }
          case 'E': break paramLoop;
          default: ret += '?' + c; break paramLoop;
        }
      }
    }
    if (!allowVoid && list.length === 1 && list[0] === 'void') list = []; // avoid (void)
    if (rawList) {
      if (ret) {
        list.push(ret + '?');
      }
      return list;
    } else {
      return ret + flushList();
    }
  }
  var parsed = func;
  try {
    // Special-case the entry point, since its name differs from other name mangling.
    if (func == 'Object._main' || func == '_main') {
      return 'main()';
    }
    if (typeof func === 'number') func = Pointer_stringify(func);
    if (func[0] !== '_') return func;
    if (func[1] !== '_') return func; // C function
    if (func[2] !== 'Z') return func;
    switch (func[3]) {
      case 'n': return 'operator new()';
      case 'd': return 'operator delete()';
    }
    parsed = parse();
  } catch(e) {
    parsed += '?';
  }
  if (parsed.indexOf('?') >= 0 && !hasLibcxxabi) {
    Runtime.warnOnce('warning: a problem occurred in builtin C++ name demangling; build with  -s DEMANGLE_SUPPORT=1  to link in libcxxabi demangling');
  }
  return parsed;
}

function demangleAll(text) {
  return text.replace(/__Z[\w\d_]+/g, function(x) { var y = demangle(x); return x === y ? x : (x + ' [' + y + ']') });
}

function jsStackTrace() {
  var err = new Error();
  if (!err.stack) {
    // IE10+ special cases: It does have callstack info, but it is only populated if an Error object is thrown,
    // so try that as a special-case.
    try {
      throw new Error(0);
    } catch(e) {
      err = e;
    }
    if (!err.stack) {
      return '(no stack trace available)';
    }
  }
  return err.stack.toString();
}

function stackTrace() {
  return demangleAll(jsStackTrace());
}
Module["stackTrace"] = stackTrace;

// Memory management

var PAGE_SIZE = 4096;

function alignMemoryPage(x) {
  if (x % 4096 > 0) {
    x += (4096 - (x % 4096));
  }
  return x;
}

var HEAP;
var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;

var STATIC_BASE = 0, STATICTOP = 0, staticSealed = false; // static area
var STACK_BASE = 0, STACKTOP = 0, STACK_MAX = 0; // stack area
var DYNAMIC_BASE = 0, DYNAMICTOP = 0; // dynamic area handled by sbrk


function abortOnCannotGrowMemory() {
  abort('Cannot enlarge memory arrays. Either (1) compile with  -s TOTAL_MEMORY=X  with X higher than the current value ' + TOTAL_MEMORY + ', (2) compile with  -s ALLOW_MEMORY_GROWTH=1  which adjusts the size at runtime but prevents some optimizations, (3) set Module.TOTAL_MEMORY to a higher value before the program runs, or if you want malloc to return NULL (0) instead of this abort, compile with  -s ABORTING_MALLOC=0 ');
}

function enlargeMemory() {
  abortOnCannotGrowMemory();
}


var TOTAL_STACK = Module['TOTAL_STACK'] || 5242880;
var TOTAL_MEMORY = Module['TOTAL_MEMORY'] || 16777216;

var totalMemory = 64*1024;
while (totalMemory < TOTAL_MEMORY || totalMemory < 2*TOTAL_STACK) {
  if (totalMemory < 16*1024*1024) {
    totalMemory *= 2;
  } else {
    totalMemory += 16*1024*1024
  }
}
if (totalMemory !== TOTAL_MEMORY) {
  TOTAL_MEMORY = totalMemory;
}

// Initialize the runtime's memory
// check for full engine support (use string 'subarray' to avoid closure compiler confusion)
assert(typeof Int32Array !== 'undefined' && typeof Float64Array !== 'undefined' && !!(new Int32Array(1)['subarray']) && !!(new Int32Array(1)['set']),
       'JS engine does not provide full typed array support');

var buffer;



buffer = new ArrayBuffer(TOTAL_MEMORY);
HEAP8 = new Int8Array(buffer);
HEAP16 = new Int16Array(buffer);
HEAP32 = new Int32Array(buffer);
HEAPU8 = new Uint8Array(buffer);
HEAPU16 = new Uint16Array(buffer);
HEAPU32 = new Uint32Array(buffer);
HEAPF32 = new Float32Array(buffer);
HEAPF64 = new Float64Array(buffer);


// Endianness check (note: assumes compiler arch was little-endian)
HEAP32[0] = 255;
assert(HEAPU8[0] === 255 && HEAPU8[3] === 0, 'Typed arrays 2 must be run on a little-endian system');

Module['HEAP'] = HEAP;
Module['buffer'] = buffer;
Module['HEAP8'] = HEAP8;
Module['HEAP16'] = HEAP16;
Module['HEAP32'] = HEAP32;
Module['HEAPU8'] = HEAPU8;
Module['HEAPU16'] = HEAPU16;
Module['HEAPU32'] = HEAPU32;
Module['HEAPF32'] = HEAPF32;
Module['HEAPF64'] = HEAPF64;

function callRuntimeCallbacks(callbacks) {
  while(callbacks.length > 0) {
    var callback = callbacks.shift();
    if (typeof callback == 'function') {
      callback();
      continue;
    }
    var func = callback.func;
    if (typeof func === 'number') {
      if (callback.arg === undefined) {
        Runtime.dynCall('v', func);
      } else {
        Runtime.dynCall('vi', func, [callback.arg]);
      }
    } else {
      func(callback.arg === undefined ? null : callback.arg);
    }
  }
}

var __ATPRERUN__  = []; // functions called before the runtime is initialized
var __ATINIT__    = []; // functions called during startup
var __ATMAIN__    = []; // functions called when main() is to be run
var __ATEXIT__    = []; // functions called during shutdown
var __ATPOSTRUN__ = []; // functions called after the runtime has exited

var runtimeInitialized = false;
var runtimeExited = false;


function preRun() {
  // compatibility - merge in anything from Module['preRun'] at this time
  if (Module['preRun']) {
    if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
    while (Module['preRun'].length) {
      addOnPreRun(Module['preRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPRERUN__);
}

function ensureInitRuntime() {
  if (runtimeInitialized) return;
  runtimeInitialized = true;
  callRuntimeCallbacks(__ATINIT__);
}

function preMain() {
  callRuntimeCallbacks(__ATMAIN__);
}

function exitRuntime() {
  callRuntimeCallbacks(__ATEXIT__);
  runtimeExited = true;
}

function postRun() {
  // compatibility - merge in anything from Module['postRun'] at this time
  if (Module['postRun']) {
    if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']];
    while (Module['postRun'].length) {
      addOnPostRun(Module['postRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPOSTRUN__);
}

function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb);
}
Module["addOnPreRun"] = addOnPreRun;

function addOnInit(cb) {
  __ATINIT__.unshift(cb);
}
Module["addOnInit"] = addOnInit;

function addOnPreMain(cb) {
  __ATMAIN__.unshift(cb);
}
Module["addOnPreMain"] = addOnPreMain;

function addOnExit(cb) {
  __ATEXIT__.unshift(cb);
}
Module["addOnExit"] = addOnExit;

function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb);
}
Module["addOnPostRun"] = addOnPostRun;

// Tools


function intArrayFromString(stringy, dontAddNull, length /* optional */) {
  var len = length > 0 ? length : lengthBytesUTF8(stringy)+1;
  var u8array = new Array(len);
  var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
  if (dontAddNull) u8array.length = numBytesWritten;
  return u8array;
}
Module["intArrayFromString"] = intArrayFromString;

function intArrayToString(array) {
  var ret = [];
  for (var i = 0; i < array.length; i++) {
    var chr = array[i];
    if (chr > 0xFF) {
      chr &= 0xFF;
    }
    ret.push(String.fromCharCode(chr));
  }
  return ret.join('');
}
Module["intArrayToString"] = intArrayToString;

function writeStringToMemory(string, buffer, dontAddNull) {
  var array = intArrayFromString(string, dontAddNull);
  var i = 0;
  while (i < array.length) {
    var chr = array[i];
    HEAP8[(((buffer)+(i))>>0)]=chr;
    i = i + 1;
  }
}
Module["writeStringToMemory"] = writeStringToMemory;

function writeArrayToMemory(array, buffer) {
  for (var i = 0; i < array.length; i++) {
    HEAP8[((buffer++)>>0)]=array[i];
  }
}
Module["writeArrayToMemory"] = writeArrayToMemory;

function writeAsciiToMemory(str, buffer, dontAddNull) {
  for (var i = 0; i < str.length; ++i) {
    HEAP8[((buffer++)>>0)]=str.charCodeAt(i);
  }
  // Null-terminate the pointer to the HEAP.
  if (!dontAddNull) HEAP8[((buffer)>>0)]=0;
}
Module["writeAsciiToMemory"] = writeAsciiToMemory;

function unSign(value, bits, ignore) {
  if (value >= 0) {
    return value;
  }
  return bits <= 32 ? 2*Math.abs(1 << (bits-1)) + value // Need some trickery, since if bits == 32, we are right at the limit of the bits JS uses in bitshifts
                    : Math.pow(2, bits)         + value;
}
function reSign(value, bits, ignore) {
  if (value <= 0) {
    return value;
  }
  var half = bits <= 32 ? Math.abs(1 << (bits-1)) // abs is needed if bits == 32
                        : Math.pow(2, bits-1);
  if (value >= half && (bits <= 32 || value > half)) { // for huge values, we can hit the precision limit and always get true here. so don't do that
                                                       // but, in general there is no perfect solution here. With 64-bit ints, we get rounding and errors
                                                       // TODO: In i64 mode 1, resign the two parts separately and safely
    value = -2*half + value; // Cannot bitshift half, as it may be at the limit of the bits JS uses in bitshifts
  }
  return value;
}


// check for imul support, and also for correctness ( https://bugs.webkit.org/show_bug.cgi?id=126345 )
if (!Math['imul'] || Math['imul'](0xffffffff, 5) !== -5) Math['imul'] = function imul(a, b) {
  var ah  = a >>> 16;
  var al = a & 0xffff;
  var bh  = b >>> 16;
  var bl = b & 0xffff;
  return (al*bl + ((ah*bl + al*bh) << 16))|0;
};
Math.imul = Math['imul'];


if (!Math['clz32']) Math['clz32'] = function(x) {
  x = x >>> 0;
  for (var i = 0; i < 32; i++) {
    if (x & (1 << (31 - i))) return i;
  }
  return 32;
};
Math.clz32 = Math['clz32']

var Math_abs = Math.abs;
var Math_cos = Math.cos;
var Math_sin = Math.sin;
var Math_tan = Math.tan;
var Math_acos = Math.acos;
var Math_asin = Math.asin;
var Math_atan = Math.atan;
var Math_atan2 = Math.atan2;
var Math_exp = Math.exp;
var Math_log = Math.log;
var Math_sqrt = Math.sqrt;
var Math_ceil = Math.ceil;
var Math_floor = Math.floor;
var Math_pow = Math.pow;
var Math_imul = Math.imul;
var Math_fround = Math.fround;
var Math_min = Math.min;
var Math_clz32 = Math.clz32;

// A counter of dependencies for calling run(). If we need to
// do asynchronous work before running, increment this and
// decrement it. Incrementing must happen in a place like
// PRE_RUN_ADDITIONS (used by emcc to add file preloading).
// Note that you can add dependencies in preRun, even though
// it happens right before run - run will be postponed until
// the dependencies are met.
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null; // overridden to take different actions when all run dependencies are fulfilled

function getUniqueRunDependency(id) {
  return id;
}

function addRunDependency(id) {
  runDependencies++;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
}
Module["addRunDependency"] = addRunDependency;

function removeRunDependency(id) {
  runDependencies--;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null;
    }
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback(); // can add another dependenciesFulfilled
    }
  }
}
Module["removeRunDependency"] = removeRunDependency;

Module["preloadedImages"] = {}; // maps url to image data
Module["preloadedAudios"] = {}; // maps url to audio data



var memoryInitializer = null;



// === Body ===

var ASM_CONSTS = [];




STATIC_BASE = 8;

STATICTOP = STATIC_BASE + 9904;
  /* global initializers */  __ATINIT__.push();
  

memoryInitializer = "wigToBedGraph_static.js.mem";





/* no memory initializer */
var tempDoublePtr = Runtime.alignMemory(allocate(12, "i8", ALLOC_STATIC), 8);

assert(tempDoublePtr % 8 == 0);

function copyTempFloat(ptr) { // functions, because inlining this code increases code size too much

  HEAP8[tempDoublePtr] = HEAP8[ptr];

  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];

  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];

  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];

}

function copyTempDouble(ptr) {

  HEAP8[tempDoublePtr] = HEAP8[ptr];

  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];

  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];

  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];

  HEAP8[tempDoublePtr+4] = HEAP8[ptr+4];

  HEAP8[tempDoublePtr+5] = HEAP8[ptr+5];

  HEAP8[tempDoublePtr+6] = HEAP8[ptr+6];

  HEAP8[tempDoublePtr+7] = HEAP8[ptr+7];

}

// {{PRE_LIBRARY}}


   
  Module["_i64Subtract"] = _i64Subtract;

  
  function ___setErrNo(value) {
      if (Module['___errno_location']) HEAP32[((Module['___errno_location']())>>2)]=value;
      return value;
    }
  
  var ERRNO_CODES={EPERM:1,ENOENT:2,ESRCH:3,EINTR:4,EIO:5,ENXIO:6,E2BIG:7,ENOEXEC:8,EBADF:9,ECHILD:10,EAGAIN:11,EWOULDBLOCK:11,ENOMEM:12,EACCES:13,EFAULT:14,ENOTBLK:15,EBUSY:16,EEXIST:17,EXDEV:18,ENODEV:19,ENOTDIR:20,EISDIR:21,EINVAL:22,ENFILE:23,EMFILE:24,ENOTTY:25,ETXTBSY:26,EFBIG:27,ENOSPC:28,ESPIPE:29,EROFS:30,EMLINK:31,EPIPE:32,EDOM:33,ERANGE:34,ENOMSG:42,EIDRM:43,ECHRNG:44,EL2NSYNC:45,EL3HLT:46,EL3RST:47,ELNRNG:48,EUNATCH:49,ENOCSI:50,EL2HLT:51,EDEADLK:35,ENOLCK:37,EBADE:52,EBADR:53,EXFULL:54,ENOANO:55,EBADRQC:56,EBADSLT:57,EDEADLOCK:35,EBFONT:59,ENOSTR:60,ENODATA:61,ETIME:62,ENOSR:63,ENONET:64,ENOPKG:65,EREMOTE:66,ENOLINK:67,EADV:68,ESRMNT:69,ECOMM:70,EPROTO:71,EMULTIHOP:72,EDOTDOT:73,EBADMSG:74,ENOTUNIQ:76,EBADFD:77,EREMCHG:78,ELIBACC:79,ELIBBAD:80,ELIBSCN:81,ELIBMAX:82,ELIBEXEC:83,ENOSYS:38,ENOTEMPTY:39,ENAMETOOLONG:36,ELOOP:40,EOPNOTSUPP:95,EPFNOSUPPORT:96,ECONNRESET:104,ENOBUFS:105,EAFNOSUPPORT:97,EPROTOTYPE:91,ENOTSOCK:88,ENOPROTOOPT:92,ESHUTDOWN:108,ECONNREFUSED:111,EADDRINUSE:98,ECONNABORTED:103,ENETUNREACH:101,ENETDOWN:100,ETIMEDOUT:110,EHOSTDOWN:112,EHOSTUNREACH:113,EINPROGRESS:115,EALREADY:114,EDESTADDRREQ:89,EMSGSIZE:90,EPROTONOSUPPORT:93,ESOCKTNOSUPPORT:94,EADDRNOTAVAIL:99,ENETRESET:102,EISCONN:106,ENOTCONN:107,ETOOMANYREFS:109,EUSERS:87,EDQUOT:122,ESTALE:116,ENOTSUP:95,ENOMEDIUM:123,EILSEQ:84,EOVERFLOW:75,ECANCELED:125,ENOTRECOVERABLE:131,EOWNERDEAD:130,ESTRPIPE:86};function _sysconf(name) {
      // long sysconf(int name);
      // http://pubs.opengroup.org/onlinepubs/009695399/functions/sysconf.html
      switch(name) {
        case 30: return PAGE_SIZE;
        case 85: return totalMemory / PAGE_SIZE;
        case 132:
        case 133:
        case 12:
        case 137:
        case 138:
        case 15:
        case 235:
        case 16:
        case 17:
        case 18:
        case 19:
        case 20:
        case 149:
        case 13:
        case 10:
        case 236:
        case 153:
        case 9:
        case 21:
        case 22:
        case 159:
        case 154:
        case 14:
        case 77:
        case 78:
        case 139:
        case 80:
        case 81:
        case 82:
        case 68:
        case 67:
        case 164:
        case 11:
        case 29:
        case 47:
        case 48:
        case 95:
        case 52:
        case 51:
        case 46:
          return 200809;
        case 79:
          return 0;
        case 27:
        case 246:
        case 127:
        case 128:
        case 23:
        case 24:
        case 160:
        case 161:
        case 181:
        case 182:
        case 242:
        case 183:
        case 184:
        case 243:
        case 244:
        case 245:
        case 165:
        case 178:
        case 179:
        case 49:
        case 50:
        case 168:
        case 169:
        case 175:
        case 170:
        case 171:
        case 172:
        case 97:
        case 76:
        case 32:
        case 173:
        case 35:
          return -1;
        case 176:
        case 177:
        case 7:
        case 155:
        case 8:
        case 157:
        case 125:
        case 126:
        case 92:
        case 93:
        case 129:
        case 130:
        case 131:
        case 94:
        case 91:
          return 1;
        case 74:
        case 60:
        case 69:
        case 70:
        case 4:
          return 1024;
        case 31:
        case 42:
        case 72:
          return 32;
        case 87:
        case 26:
        case 33:
          return 2147483647;
        case 34:
        case 1:
          return 47839;
        case 38:
        case 36:
          return 99;
        case 43:
        case 37:
          return 2048;
        case 0: return 2097152;
        case 3: return 65536;
        case 28: return 32768;
        case 44: return 32767;
        case 75: return 16384;
        case 39: return 1000;
        case 89: return 700;
        case 71: return 256;
        case 40: return 255;
        case 2: return 100;
        case 180: return 64;
        case 25: return 20;
        case 5: return 16;
        case 6: return 6;
        case 73: return 4;
        case 84: {
          if (typeof navigator === 'object') return navigator['hardwareConcurrency'] || 1;
          return 1;
        }
      }
      ___setErrNo(ERRNO_CODES.EINVAL);
      return -1;
    }

  
  
  
  var ERRNO_MESSAGES={0:"Success",1:"Not super-user",2:"No such file or directory",3:"No such process",4:"Interrupted system call",5:"I/O error",6:"No such device or address",7:"Arg list too long",8:"Exec format error",9:"Bad file number",10:"No children",11:"No more processes",12:"Not enough core",13:"Permission denied",14:"Bad address",15:"Block device required",16:"Mount device busy",17:"File exists",18:"Cross-device link",19:"No such device",20:"Not a directory",21:"Is a directory",22:"Invalid argument",23:"Too many open files in system",24:"Too many open files",25:"Not a typewriter",26:"Text file busy",27:"File too large",28:"No space left on device",29:"Illegal seek",30:"Read only file system",31:"Too many links",32:"Broken pipe",33:"Math arg out of domain of func",34:"Math result not representable",35:"File locking deadlock error",36:"File or path name too long",37:"No record locks available",38:"Function not implemented",39:"Directory not empty",40:"Too many symbolic links",42:"No message of desired type",43:"Identifier removed",44:"Channel number out of range",45:"Level 2 not synchronized",46:"Level 3 halted",47:"Level 3 reset",48:"Link number out of range",49:"Protocol driver not attached",50:"No CSI structure available",51:"Level 2 halted",52:"Invalid exchange",53:"Invalid request descriptor",54:"Exchange full",55:"No anode",56:"Invalid request code",57:"Invalid slot",59:"Bad font file fmt",60:"Device not a stream",61:"No data (for no delay io)",62:"Timer expired",63:"Out of streams resources",64:"Machine is not on the network",65:"Package not installed",66:"The object is remote",67:"The link has been severed",68:"Advertise error",69:"Srmount error",70:"Communication error on send",71:"Protocol error",72:"Multihop attempted",73:"Cross mount point (not really error)",74:"Trying to read unreadable message",75:"Value too large for defined data type",76:"Given log. name not unique",77:"f.d. invalid for this operation",78:"Remote address changed",79:"Can   access a needed shared lib",80:"Accessing a corrupted shared lib",81:".lib section in a.out corrupted",82:"Attempting to link in too many libs",83:"Attempting to exec a shared library",84:"Illegal byte sequence",86:"Streams pipe error",87:"Too many users",88:"Socket operation on non-socket",89:"Destination address required",90:"Message too long",91:"Protocol wrong type for socket",92:"Protocol not available",93:"Unknown protocol",94:"Socket type not supported",95:"Not supported",96:"Protocol family not supported",97:"Address family not supported by protocol family",98:"Address already in use",99:"Address not available",100:"Network interface is not configured",101:"Network is unreachable",102:"Connection reset by network",103:"Connection aborted",104:"Connection reset by peer",105:"No buffer space available",106:"Socket is already connected",107:"Socket is not connected",108:"Can't send after socket shutdown",109:"Too many references",110:"Connection timed out",111:"Connection refused",112:"Host is down",113:"Host is unreachable",114:"Socket already connected",115:"Connection already in progress",116:"Stale file handle",122:"Quota exceeded",123:"No medium (in tape drive)",125:"Operation canceled",130:"Previous owner died",131:"State not recoverable"};
  
  var PATH={splitPath:function (filename) {
        var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
        return splitPathRe.exec(filename).slice(1);
      },normalizeArray:function (parts, allowAboveRoot) {
        // if the path tries to go above the root, `up` ends up > 0
        var up = 0;
        for (var i = parts.length - 1; i >= 0; i--) {
          var last = parts[i];
          if (last === '.') {
            parts.splice(i, 1);
          } else if (last === '..') {
            parts.splice(i, 1);
            up++;
          } else if (up) {
            parts.splice(i, 1);
            up--;
          }
        }
        // if the path is allowed to go above the root, restore leading ..s
        if (allowAboveRoot) {
          for (; up--; up) {
            parts.unshift('..');
          }
        }
        return parts;
      },normalize:function (path) {
        var isAbsolute = path.charAt(0) === '/',
            trailingSlash = path.substr(-1) === '/';
        // Normalize the path
        path = PATH.normalizeArray(path.split('/').filter(function(p) {
          return !!p;
        }), !isAbsolute).join('/');
        if (!path && !isAbsolute) {
          path = '.';
        }
        if (path && trailingSlash) {
          path += '/';
        }
        return (isAbsolute ? '/' : '') + path;
      },dirname:function (path) {
        var result = PATH.splitPath(path),
            root = result[0],
            dir = result[1];
        if (!root && !dir) {
          // No dirname whatsoever
          return '.';
        }
        if (dir) {
          // It has a dirname, strip trailing slash
          dir = dir.substr(0, dir.length - 1);
        }
        return root + dir;
      },basename:function (path) {
        // EMSCRIPTEN return '/'' for '/', not an empty string
        if (path === '/') return '/';
        var lastSlash = path.lastIndexOf('/');
        if (lastSlash === -1) return path;
        return path.substr(lastSlash+1);
      },extname:function (path) {
        return PATH.splitPath(path)[3];
      },join:function () {
        var paths = Array.prototype.slice.call(arguments, 0);
        return PATH.normalize(paths.join('/'));
      },join2:function (l, r) {
        return PATH.normalize(l + '/' + r);
      },resolve:function () {
        var resolvedPath = '',
          resolvedAbsolute = false;
        for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
          var path = (i >= 0) ? arguments[i] : FS.cwd();
          // Skip empty and invalid entries
          if (typeof path !== 'string') {
            throw new TypeError('Arguments to path.resolve must be strings');
          } else if (!path) {
            return ''; // an invalid portion invalidates the whole thing
          }
          resolvedPath = path + '/' + resolvedPath;
          resolvedAbsolute = path.charAt(0) === '/';
        }
        // At this point the path should be resolved to a full absolute path, but
        // handle relative paths to be safe (might happen when process.cwd() fails)
        resolvedPath = PATH.normalizeArray(resolvedPath.split('/').filter(function(p) {
          return !!p;
        }), !resolvedAbsolute).join('/');
        return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
      },relative:function (from, to) {
        from = PATH.resolve(from).substr(1);
        to = PATH.resolve(to).substr(1);
        function trim(arr) {
          var start = 0;
          for (; start < arr.length; start++) {
            if (arr[start] !== '') break;
          }
          var end = arr.length - 1;
          for (; end >= 0; end--) {
            if (arr[end] !== '') break;
          }
          if (start > end) return [];
          return arr.slice(start, end - start + 1);
        }
        var fromParts = trim(from.split('/'));
        var toParts = trim(to.split('/'));
        var length = Math.min(fromParts.length, toParts.length);
        var samePartsLength = length;
        for (var i = 0; i < length; i++) {
          if (fromParts[i] !== toParts[i]) {
            samePartsLength = i;
            break;
          }
        }
        var outputParts = [];
        for (var i = samePartsLength; i < fromParts.length; i++) {
          outputParts.push('..');
        }
        outputParts = outputParts.concat(toParts.slice(samePartsLength));
        return outputParts.join('/');
      }};
  
  var TTY={ttys:[],init:function () {
        // https://github.com/kripken/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // currently, FS.init does not distinguish if process.stdin is a file or TTY
        //   // device, it always assumes it's a TTY device. because of this, we're forcing
        //   // process.stdin to UTF8 encoding to at least make stdin reading compatible
        //   // with text files until FS.init can be refactored.
        //   process['stdin']['setEncoding']('utf8');
        // }
      },shutdown:function () {
        // https://github.com/kripken/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // inolen: any idea as to why node -e 'process.stdin.read()' wouldn't exit immediately (with process.stdin being a tty)?
        //   // isaacs: because now it's reading from the stream, you've expressed interest in it, so that read() kicks off a _read() which creates a ReadReq operation
        //   // inolen: I thought read() in that case was a synchronous operation that just grabbed some amount of buffered data if it exists?
        //   // isaacs: it is. but it also triggers a _read() call, which calls readStart() on the handle
        //   // isaacs: do process.stdin.pause() and i'd think it'd probably close the pending call
        //   process['stdin']['pause']();
        // }
      },register:function (dev, ops) {
        TTY.ttys[dev] = { input: [], output: [], ops: ops };
        FS.registerDevice(dev, TTY.stream_ops);
      },stream_ops:{open:function (stream) {
          var tty = TTY.ttys[stream.node.rdev];
          if (!tty) {
            throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
          }
          stream.tty = tty;
          stream.seekable = false;
        },close:function (stream) {
          // flush any pending line data
          stream.tty.ops.flush(stream.tty);
        },flush:function (stream) {
          stream.tty.ops.flush(stream.tty);
        },read:function (stream, buffer, offset, length, pos /* ignored */) {
          if (!stream.tty || !stream.tty.ops.get_char) {
            throw new FS.ErrnoError(ERRNO_CODES.ENXIO);
          }
          var bytesRead = 0;
          for (var i = 0; i < length; i++) {
            var result;
            try {
              result = stream.tty.ops.get_char(stream.tty);
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
            if (result === undefined && bytesRead === 0) {
              throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
            }
            if (result === null || result === undefined) break;
            bytesRead++;
            buffer[offset+i] = result;
          }
          if (bytesRead) {
            stream.node.timestamp = Date.now();
          }
          return bytesRead;
        },write:function (stream, buffer, offset, length, pos) {
          if (!stream.tty || !stream.tty.ops.put_char) {
            throw new FS.ErrnoError(ERRNO_CODES.ENXIO);
          }
          for (var i = 0; i < length; i++) {
            try {
              stream.tty.ops.put_char(stream.tty, buffer[offset+i]);
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
          }
          if (length) {
            stream.node.timestamp = Date.now();
          }
          return i;
        }},default_tty_ops:{get_char:function (tty) {
          if (!tty.input.length) {
            var result = null;
            if (ENVIRONMENT_IS_NODE) {
              // we will read data by chunks of BUFSIZE
              var BUFSIZE = 256;
              var buf = new Buffer(BUFSIZE);
              var bytesRead = 0;
  
              var fd = process.stdin.fd;
              // Linux and Mac cannot use process.stdin.fd (which isn't set up as sync)
              var usingDevice = false;
              try {
                fd = fs.openSync('/dev/stdin', 'r');
                usingDevice = true;
              } catch (e) {}
  
              bytesRead = fs.readSync(fd, buf, 0, BUFSIZE, null);
  
              if (usingDevice) { fs.closeSync(fd); }
              if (bytesRead > 0) {
                result = buf.slice(0, bytesRead).toString('utf-8');
              } else {
                result = null;
              }
  
            } else if (typeof window != 'undefined' &&
              typeof window.prompt == 'function') {
              // Browser.
              result = window.prompt('Input: ');  // returns null on cancel
              if (result !== null) {
                result += '\n';
              }
            } else if (typeof readline == 'function') {
              // Command line.
              result = readline();
              if (result !== null) {
                result += '\n';
              }
            }
            if (!result) {
              return null;
            }
            tty.input = intArrayFromString(result, true);
          }
          return tty.input.shift();
        },put_char:function (tty, val) {
          if (val === null || val === 10) {
            Module['print'](UTF8ArrayToString(tty.output, 0));
            tty.output = [];
          } else {
            if (val != 0) tty.output.push(val); // val == 0 would cut text output off in the middle.
          }
        },flush:function (tty) {
          if (tty.output && tty.output.length > 0) {
            Module['print'](UTF8ArrayToString(tty.output, 0));
            tty.output = [];
          }
        }},default_tty1_ops:{put_char:function (tty, val) {
          if (val === null || val === 10) {
            Module['printErr'](UTF8ArrayToString(tty.output, 0));
            tty.output = [];
          } else {
            if (val != 0) tty.output.push(val);
          }
        },flush:function (tty) {
          if (tty.output && tty.output.length > 0) {
            Module['printErr'](UTF8ArrayToString(tty.output, 0));
            tty.output = [];
          }
        }}};
  
  var MEMFS={ops_table:null,mount:function (mount) {
        return MEMFS.createNode(null, '/', 16384 | 511 /* 0777 */, 0);
      },createNode:function (parent, name, mode, dev) {
        if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
          // no supported
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (!MEMFS.ops_table) {
          MEMFS.ops_table = {
            dir: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr,
                lookup: MEMFS.node_ops.lookup,
                mknod: MEMFS.node_ops.mknod,
                rename: MEMFS.node_ops.rename,
                unlink: MEMFS.node_ops.unlink,
                rmdir: MEMFS.node_ops.rmdir,
                readdir: MEMFS.node_ops.readdir,
                symlink: MEMFS.node_ops.symlink
              },
              stream: {
                llseek: MEMFS.stream_ops.llseek
              }
            },
            file: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr
              },
              stream: {
                llseek: MEMFS.stream_ops.llseek,
                read: MEMFS.stream_ops.read,
                write: MEMFS.stream_ops.write,
                allocate: MEMFS.stream_ops.allocate,
                mmap: MEMFS.stream_ops.mmap,
                msync: MEMFS.stream_ops.msync
              }
            },
            link: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr,
                readlink: MEMFS.node_ops.readlink
              },
              stream: {}
            },
            chrdev: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr
              },
              stream: FS.chrdev_stream_ops
            }
          };
        }
        var node = FS.createNode(parent, name, mode, dev);
        if (FS.isDir(node.mode)) {
          node.node_ops = MEMFS.ops_table.dir.node;
          node.stream_ops = MEMFS.ops_table.dir.stream;
          node.contents = {};
        } else if (FS.isFile(node.mode)) {
          node.node_ops = MEMFS.ops_table.file.node;
          node.stream_ops = MEMFS.ops_table.file.stream;
          node.usedBytes = 0; // The actual number of bytes used in the typed array, as opposed to contents.buffer.byteLength which gives the whole capacity.
          // When the byte data of the file is populated, this will point to either a typed array, or a normal JS array. Typed arrays are preferred
          // for performance, and used by default. However, typed arrays are not resizable like normal JS arrays are, so there is a small disk size
          // penalty involved for appending file writes that continuously grow a file similar to std::vector capacity vs used -scheme.
          node.contents = null; 
        } else if (FS.isLink(node.mode)) {
          node.node_ops = MEMFS.ops_table.link.node;
          node.stream_ops = MEMFS.ops_table.link.stream;
        } else if (FS.isChrdev(node.mode)) {
          node.node_ops = MEMFS.ops_table.chrdev.node;
          node.stream_ops = MEMFS.ops_table.chrdev.stream;
        }
        node.timestamp = Date.now();
        // add the new node to the parent
        if (parent) {
          parent.contents[name] = node;
        }
        return node;
      },getFileDataAsRegularArray:function (node) {
        if (node.contents && node.contents.subarray) {
          var arr = [];
          for (var i = 0; i < node.usedBytes; ++i) arr.push(node.contents[i]);
          return arr; // Returns a copy of the original data.
        }
        return node.contents; // No-op, the file contents are already in a JS array. Return as-is.
      },getFileDataAsTypedArray:function (node) {
        if (!node.contents) return new Uint8Array;
        if (node.contents.subarray) return node.contents.subarray(0, node.usedBytes); // Make sure to not return excess unused bytes.
        return new Uint8Array(node.contents);
      },expandFileStorage:function (node, newCapacity) {
        // If we are asked to expand the size of a file that already exists, revert to using a standard JS array to store the file
        // instead of a typed array. This makes resizing the array more flexible because we can just .push() elements at the back to
        // increase the size.
        if (node.contents && node.contents.subarray && newCapacity > node.contents.length) {
          node.contents = MEMFS.getFileDataAsRegularArray(node);
          node.usedBytes = node.contents.length; // We might be writing to a lazy-loaded file which had overridden this property, so force-reset it.
        }
  
        if (!node.contents || node.contents.subarray) { // Keep using a typed array if creating a new storage, or if old one was a typed array as well.
          var prevCapacity = node.contents ? node.contents.buffer.byteLength : 0;
          if (prevCapacity >= newCapacity) return; // No need to expand, the storage was already large enough.
          // Don't expand strictly to the given requested limit if it's only a very small increase, but instead geometrically grow capacity.
          // For small filesizes (<1MB), perform size*2 geometric increase, but for large sizes, do a much more conservative size*1.125 increase to
          // avoid overshooting the allocation cap by a very large margin.
          var CAPACITY_DOUBLING_MAX = 1024 * 1024;
          newCapacity = Math.max(newCapacity, (prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2.0 : 1.125)) | 0);
          if (prevCapacity != 0) newCapacity = Math.max(newCapacity, 256); // At minimum allocate 256b for each file when expanding.
          var oldContents = node.contents;
          node.contents = new Uint8Array(newCapacity); // Allocate new storage.
          if (node.usedBytes > 0) node.contents.set(oldContents.subarray(0, node.usedBytes), 0); // Copy old data over to the new storage.
          return;
        }
        // Not using a typed array to back the file storage. Use a standard JS array instead.
        if (!node.contents && newCapacity > 0) node.contents = [];
        while (node.contents.length < newCapacity) node.contents.push(0);
      },resizeFileStorage:function (node, newSize) {
        if (node.usedBytes == newSize) return;
        if (newSize == 0) {
          node.contents = null; // Fully decommit when requesting a resize to zero.
          node.usedBytes = 0;
          return;
        }
        if (!node.contents || node.contents.subarray) { // Resize a typed array if that is being used as the backing store.
          var oldContents = node.contents;
          node.contents = new Uint8Array(new ArrayBuffer(newSize)); // Allocate new storage.
          if (oldContents) {
            node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes))); // Copy old data over to the new storage.
          }
          node.usedBytes = newSize;
          return;
        }
        // Backing with a JS array.
        if (!node.contents) node.contents = [];
        if (node.contents.length > newSize) node.contents.length = newSize;
        else while (node.contents.length < newSize) node.contents.push(0);
        node.usedBytes = newSize;
      },node_ops:{getattr:function (node) {
          var attr = {};
          // device numbers reuse inode numbers.
          attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
          attr.ino = node.id;
          attr.mode = node.mode;
          attr.nlink = 1;
          attr.uid = 0;
          attr.gid = 0;
          attr.rdev = node.rdev;
          if (FS.isDir(node.mode)) {
            attr.size = 4096;
          } else if (FS.isFile(node.mode)) {
            attr.size = node.usedBytes;
          } else if (FS.isLink(node.mode)) {
            attr.size = node.link.length;
          } else {
            attr.size = 0;
          }
          attr.atime = new Date(node.timestamp);
          attr.mtime = new Date(node.timestamp);
          attr.ctime = new Date(node.timestamp);
          // NOTE: In our implementation, st_blocks = Math.ceil(st_size/st_blksize),
          //       but this is not required by the standard.
          attr.blksize = 4096;
          attr.blocks = Math.ceil(attr.size / attr.blksize);
          return attr;
        },setattr:function (node, attr) {
          if (attr.mode !== undefined) {
            node.mode = attr.mode;
          }
          if (attr.timestamp !== undefined) {
            node.timestamp = attr.timestamp;
          }
          if (attr.size !== undefined) {
            MEMFS.resizeFileStorage(node, attr.size);
          }
        },lookup:function (parent, name) {
          throw FS.genericErrors[ERRNO_CODES.ENOENT];
        },mknod:function (parent, name, mode, dev) {
          return MEMFS.createNode(parent, name, mode, dev);
        },rename:function (old_node, new_dir, new_name) {
          // if we're overwriting a directory at new_name, make sure it's empty.
          if (FS.isDir(old_node.mode)) {
            var new_node;
            try {
              new_node = FS.lookupNode(new_dir, new_name);
            } catch (e) {
            }
            if (new_node) {
              for (var i in new_node.contents) {
                throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
              }
            }
          }
          // do the internal rewiring
          delete old_node.parent.contents[old_node.name];
          old_node.name = new_name;
          new_dir.contents[new_name] = old_node;
          old_node.parent = new_dir;
        },unlink:function (parent, name) {
          delete parent.contents[name];
        },rmdir:function (parent, name) {
          var node = FS.lookupNode(parent, name);
          for (var i in node.contents) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
          }
          delete parent.contents[name];
        },readdir:function (node) {
          var entries = ['.', '..']
          for (var key in node.contents) {
            if (!node.contents.hasOwnProperty(key)) {
              continue;
            }
            entries.push(key);
          }
          return entries;
        },symlink:function (parent, newname, oldpath) {
          var node = MEMFS.createNode(parent, newname, 511 /* 0777 */ | 40960, 0);
          node.link = oldpath;
          return node;
        },readlink:function (node) {
          if (!FS.isLink(node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          return node.link;
        }},stream_ops:{read:function (stream, buffer, offset, length, position) {
          var contents = stream.node.contents;
          if (position >= stream.node.usedBytes) return 0;
          var size = Math.min(stream.node.usedBytes - position, length);
          assert(size >= 0);
          if (size > 8 && contents.subarray) { // non-trivial, and typed array
            buffer.set(contents.subarray(position, position + size), offset);
          } else {
            for (var i = 0; i < size; i++) buffer[offset + i] = contents[position + i];
          }
          return size;
        },write:function (stream, buffer, offset, length, position, canOwn) {
          if (!length) return 0;
          var node = stream.node;
          node.timestamp = Date.now();
  
          if (buffer.subarray && (!node.contents || node.contents.subarray)) { // This write is from a typed array to a typed array?
            if (canOwn) { // Can we just reuse the buffer we are given?
              node.contents = buffer.subarray(offset, offset + length);
              node.usedBytes = length;
              return length;
            } else if (node.usedBytes === 0 && position === 0) { // If this is a simple first write to an empty file, do a fast set since we don't need to care about old data.
              node.contents = new Uint8Array(buffer.subarray(offset, offset + length));
              node.usedBytes = length;
              return length;
            } else if (position + length <= node.usedBytes) { // Writing to an already allocated and used subrange of the file?
              node.contents.set(buffer.subarray(offset, offset + length), position);
              return length;
            }
          }
  
          // Appending to an existing file and we need to reallocate, or source data did not come as a typed array.
          MEMFS.expandFileStorage(node, position+length);
          if (node.contents.subarray && buffer.subarray) node.contents.set(buffer.subarray(offset, offset + length), position); // Use typed array write if available.
          else {
            for (var i = 0; i < length; i++) {
             node.contents[position + i] = buffer[offset + i]; // Or fall back to manual write if not.
            }
          }
          node.usedBytes = Math.max(node.usedBytes, position+length);
          return length;
        },llseek:function (stream, offset, whence) {
          var position = offset;
          if (whence === 1) {  // SEEK_CUR.
            position += stream.position;
          } else if (whence === 2) {  // SEEK_END.
            if (FS.isFile(stream.node.mode)) {
              position += stream.node.usedBytes;
            }
          }
          if (position < 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          return position;
        },allocate:function (stream, offset, length) {
          MEMFS.expandFileStorage(stream.node, offset + length);
          stream.node.usedBytes = Math.max(stream.node.usedBytes, offset + length);
        },mmap:function (stream, buffer, offset, length, position, prot, flags) {
          if (!FS.isFile(stream.node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
          }
          var ptr;
          var allocated;
          var contents = stream.node.contents;
          // Only make a new copy when MAP_PRIVATE is specified.
          if ( !(flags & 2) &&
                (contents.buffer === buffer || contents.buffer === buffer.buffer) ) {
            // We can't emulate MAP_SHARED when the file is not backed by the buffer
            // we're mapping to (e.g. the HEAP buffer).
            allocated = false;
            ptr = contents.byteOffset;
          } else {
            // Try to avoid unnecessary slices.
            if (position > 0 || position + length < stream.node.usedBytes) {
              if (contents.subarray) {
                contents = contents.subarray(position, position + length);
              } else {
                contents = Array.prototype.slice.call(contents, position, position + length);
              }
            }
            allocated = true;
            ptr = _malloc(length);
            if (!ptr) {
              throw new FS.ErrnoError(ERRNO_CODES.ENOMEM);
            }
            buffer.set(contents, ptr);
          }
          return { ptr: ptr, allocated: allocated };
        },msync:function (stream, buffer, offset, length, mmapFlags) {
          if (!FS.isFile(stream.node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
          }
          if (mmapFlags & 2) {
            // MAP_PRIVATE calls need not to be synced back to underlying fs
            return 0;
          }
  
          var bytesWritten = MEMFS.stream_ops.write(stream, buffer, 0, length, offset, false);
          // should we check if bytesWritten and length are the same?
          return 0;
        }}};
  
  var IDBFS={dbs:{},indexedDB:function () {
        if (typeof indexedDB !== 'undefined') return indexedDB;
        var ret = null;
        if (typeof window === 'object') ret = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
        assert(ret, 'IDBFS used, but indexedDB not supported');
        return ret;
      },DB_VERSION:21,DB_STORE_NAME:"FILE_DATA",mount:function (mount) {
        // reuse all of the core MEMFS functionality
        return MEMFS.mount.apply(null, arguments);
      },syncfs:function (mount, populate, callback) {
        IDBFS.getLocalSet(mount, function(err, local) {
          if (err) return callback(err);
  
          IDBFS.getRemoteSet(mount, function(err, remote) {
            if (err) return callback(err);
  
            var src = populate ? remote : local;
            var dst = populate ? local : remote;
  
            IDBFS.reconcile(src, dst, callback);
          });
        });
      },getDB:function (name, callback) {
        // check the cache first
        var db = IDBFS.dbs[name];
        if (db) {
          return callback(null, db);
        }
  
        var req;
        try {
          req = IDBFS.indexedDB().open(name, IDBFS.DB_VERSION);
        } catch (e) {
          return callback(e);
        }
        req.onupgradeneeded = function(e) {
          var db = e.target.result;
          var transaction = e.target.transaction;
  
          var fileStore;
  
          if (db.objectStoreNames.contains(IDBFS.DB_STORE_NAME)) {
            fileStore = transaction.objectStore(IDBFS.DB_STORE_NAME);
          } else {
            fileStore = db.createObjectStore(IDBFS.DB_STORE_NAME);
          }
  
          if (!fileStore.indexNames.contains('timestamp')) {
            fileStore.createIndex('timestamp', 'timestamp', { unique: false });
          }
        };
        req.onsuccess = function() {
          db = req.result;
  
          // add to the cache
          IDBFS.dbs[name] = db;
          callback(null, db);
        };
        req.onerror = function(e) {
          callback(this.error);
          e.preventDefault();
        };
      },getLocalSet:function (mount, callback) {
        var entries = {};
  
        function isRealDir(p) {
          return p !== '.' && p !== '..';
        };
        function toAbsolute(root) {
          return function(p) {
            return PATH.join2(root, p);
          }
        };
  
        var check = FS.readdir(mount.mountpoint).filter(isRealDir).map(toAbsolute(mount.mountpoint));
  
        while (check.length) {
          var path = check.pop();
          var stat;
  
          try {
            stat = FS.stat(path);
          } catch (e) {
            return callback(e);
          }
  
          if (FS.isDir(stat.mode)) {
            check.push.apply(check, FS.readdir(path).filter(isRealDir).map(toAbsolute(path)));
          }
  
          entries[path] = { timestamp: stat.mtime };
        }
  
        return callback(null, { type: 'local', entries: entries });
      },getRemoteSet:function (mount, callback) {
        var entries = {};
  
        IDBFS.getDB(mount.mountpoint, function(err, db) {
          if (err) return callback(err);
  
          var transaction = db.transaction([IDBFS.DB_STORE_NAME], 'readonly');
          transaction.onerror = function(e) {
            callback(this.error);
            e.preventDefault();
          };
  
          var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
          var index = store.index('timestamp');
  
          index.openKeyCursor().onsuccess = function(event) {
            var cursor = event.target.result;
  
            if (!cursor) {
              return callback(null, { type: 'remote', db: db, entries: entries });
            }
  
            entries[cursor.primaryKey] = { timestamp: cursor.key };
  
            cursor.continue();
          };
        });
      },loadLocalEntry:function (path, callback) {
        var stat, node;
  
        try {
          var lookup = FS.lookupPath(path);
          node = lookup.node;
          stat = FS.stat(path);
        } catch (e) {
          return callback(e);
        }
  
        if (FS.isDir(stat.mode)) {
          return callback(null, { timestamp: stat.mtime, mode: stat.mode });
        } else if (FS.isFile(stat.mode)) {
          // Performance consideration: storing a normal JavaScript array to a IndexedDB is much slower than storing a typed array.
          // Therefore always convert the file contents to a typed array first before writing the data to IndexedDB.
          node.contents = MEMFS.getFileDataAsTypedArray(node);
          return callback(null, { timestamp: stat.mtime, mode: stat.mode, contents: node.contents });
        } else {
          return callback(new Error('node type not supported'));
        }
      },storeLocalEntry:function (path, entry, callback) {
        try {
          if (FS.isDir(entry.mode)) {
            FS.mkdir(path, entry.mode);
          } else if (FS.isFile(entry.mode)) {
            FS.writeFile(path, entry.contents, { encoding: 'binary', canOwn: true });
          } else {
            return callback(new Error('node type not supported'));
          }
  
          FS.chmod(path, entry.mode);
          FS.utime(path, entry.timestamp, entry.timestamp);
        } catch (e) {
          return callback(e);
        }
  
        callback(null);
      },removeLocalEntry:function (path, callback) {
        try {
          var lookup = FS.lookupPath(path);
          var stat = FS.stat(path);
  
          if (FS.isDir(stat.mode)) {
            FS.rmdir(path);
          } else if (FS.isFile(stat.mode)) {
            FS.unlink(path);
          }
        } catch (e) {
          return callback(e);
        }
  
        callback(null);
      },loadRemoteEntry:function (store, path, callback) {
        var req = store.get(path);
        req.onsuccess = function(event) { callback(null, event.target.result); };
        req.onerror = function(e) {
          callback(this.error);
          e.preventDefault();
        };
      },storeRemoteEntry:function (store, path, entry, callback) {
        var req = store.put(entry, path);
        req.onsuccess = function() { callback(null); };
        req.onerror = function(e) {
          callback(this.error);
          e.preventDefault();
        };
      },removeRemoteEntry:function (store, path, callback) {
        var req = store.delete(path);
        req.onsuccess = function() { callback(null); };
        req.onerror = function(e) {
          callback(this.error);
          e.preventDefault();
        };
      },reconcile:function (src, dst, callback) {
        var total = 0;
  
        var create = [];
        Object.keys(src.entries).forEach(function (key) {
          var e = src.entries[key];
          var e2 = dst.entries[key];
          if (!e2 || e.timestamp > e2.timestamp) {
            create.push(key);
            total++;
          }
        });
  
        var remove = [];
        Object.keys(dst.entries).forEach(function (key) {
          var e = dst.entries[key];
          var e2 = src.entries[key];
          if (!e2) {
            remove.push(key);
            total++;
          }
        });
  
        if (!total) {
          return callback(null);
        }
  
        var errored = false;
        var completed = 0;
        var db = src.type === 'remote' ? src.db : dst.db;
        var transaction = db.transaction([IDBFS.DB_STORE_NAME], 'readwrite');
        var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
  
        function done(err) {
          if (err) {
            if (!done.errored) {
              done.errored = true;
              return callback(err);
            }
            return;
          }
          if (++completed >= total) {
            return callback(null);
          }
        };
  
        transaction.onerror = function(e) {
          done(this.error);
          e.preventDefault();
        };
  
        // sort paths in ascending order so directory entries are created
        // before the files inside them
        create.sort().forEach(function (path) {
          if (dst.type === 'local') {
            IDBFS.loadRemoteEntry(store, path, function (err, entry) {
              if (err) return done(err);
              IDBFS.storeLocalEntry(path, entry, done);
            });
          } else {
            IDBFS.loadLocalEntry(path, function (err, entry) {
              if (err) return done(err);
              IDBFS.storeRemoteEntry(store, path, entry, done);
            });
          }
        });
  
        // sort paths in descending order so files are deleted before their
        // parent directories
        remove.sort().reverse().forEach(function(path) {
          if (dst.type === 'local') {
            IDBFS.removeLocalEntry(path, done);
          } else {
            IDBFS.removeRemoteEntry(store, path, done);
          }
        });
      }};
  
  var NODEFS={isWindows:false,staticInit:function () {
        NODEFS.isWindows = !!process.platform.match(/^win/);
      },mount:function (mount) {
        assert(ENVIRONMENT_IS_NODE);
        return NODEFS.createNode(null, '/', NODEFS.getMode(mount.opts.root), 0);
      },createNode:function (parent, name, mode, dev) {
        if (!FS.isDir(mode) && !FS.isFile(mode) && !FS.isLink(mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var node = FS.createNode(parent, name, mode);
        node.node_ops = NODEFS.node_ops;
        node.stream_ops = NODEFS.stream_ops;
        return node;
      },getMode:function (path) {
        var stat;
        try {
          stat = fs.lstatSync(path);
          if (NODEFS.isWindows) {
            // On Windows, directories return permission bits 'rw-rw-rw-', even though they have 'rwxrwxrwx', so
            // propagate write bits to execute bits.
            stat.mode = stat.mode | ((stat.mode & 146) >> 1);
          }
        } catch (e) {
          if (!e.code) throw e;
          throw new FS.ErrnoError(ERRNO_CODES[e.code]);
        }
        return stat.mode;
      },realPath:function (node) {
        var parts = [];
        while (node.parent !== node) {
          parts.push(node.name);
          node = node.parent;
        }
        parts.push(node.mount.opts.root);
        parts.reverse();
        return PATH.join.apply(null, parts);
      },flagsToPermissionStringMap:{0:"r",1:"r+",2:"r+",64:"r",65:"r+",66:"r+",129:"rx+",193:"rx+",514:"w+",577:"w",578:"w+",705:"wx",706:"wx+",1024:"a",1025:"a",1026:"a+",1089:"a",1090:"a+",1153:"ax",1154:"ax+",1217:"ax",1218:"ax+",4096:"rs",4098:"rs+"},flagsToPermissionString:function (flags) {
        flags &= ~0100000 /*O_LARGEFILE*/; // Ignore this flag from musl, otherwise node.js fails to open the file.
        flags &= ~02000000 /*O_CLOEXEC*/; // Some applications may pass it; it makes no sense for a single process.
        if (flags in NODEFS.flagsToPermissionStringMap) {
          return NODEFS.flagsToPermissionStringMap[flags];
        } else {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
      },node_ops:{getattr:function (node) {
          var path = NODEFS.realPath(node);
          var stat;
          try {
            stat = fs.lstatSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          // node.js v0.10.20 doesn't report blksize and blocks on Windows. Fake them with default blksize of 4096.
          // See http://support.microsoft.com/kb/140365
          if (NODEFS.isWindows && !stat.blksize) {
            stat.blksize = 4096;
          }
          if (NODEFS.isWindows && !stat.blocks) {
            stat.blocks = (stat.size+stat.blksize-1)/stat.blksize|0;
          }
          return {
            dev: stat.dev,
            ino: stat.ino,
            mode: stat.mode,
            nlink: stat.nlink,
            uid: stat.uid,
            gid: stat.gid,
            rdev: stat.rdev,
            size: stat.size,
            atime: stat.atime,
            mtime: stat.mtime,
            ctime: stat.ctime,
            blksize: stat.blksize,
            blocks: stat.blocks
          };
        },setattr:function (node, attr) {
          var path = NODEFS.realPath(node);
          try {
            if (attr.mode !== undefined) {
              fs.chmodSync(path, attr.mode);
              // update the common node structure mode as well
              node.mode = attr.mode;
            }
            if (attr.timestamp !== undefined) {
              var date = new Date(attr.timestamp);
              fs.utimesSync(path, date, date);
            }
            if (attr.size !== undefined) {
              fs.truncateSync(path, attr.size);
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },lookup:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          var mode = NODEFS.getMode(path);
          return NODEFS.createNode(parent, name, mode);
        },mknod:function (parent, name, mode, dev) {
          var node = NODEFS.createNode(parent, name, mode, dev);
          // create the backing node for this in the fs root as well
          var path = NODEFS.realPath(node);
          try {
            if (FS.isDir(node.mode)) {
              fs.mkdirSync(path, node.mode);
            } else {
              fs.writeFileSync(path, '', { mode: node.mode });
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          return node;
        },rename:function (oldNode, newDir, newName) {
          var oldPath = NODEFS.realPath(oldNode);
          var newPath = PATH.join2(NODEFS.realPath(newDir), newName);
          try {
            fs.renameSync(oldPath, newPath);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },unlink:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          try {
            fs.unlinkSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },rmdir:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          try {
            fs.rmdirSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },readdir:function (node) {
          var path = NODEFS.realPath(node);
          try {
            return fs.readdirSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },symlink:function (parent, newName, oldPath) {
          var newPath = PATH.join2(NODEFS.realPath(parent), newName);
          try {
            fs.symlinkSync(oldPath, newPath);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },readlink:function (node) {
          var path = NODEFS.realPath(node);
          try {
            path = fs.readlinkSync(path);
            path = NODEJS_PATH.relative(NODEJS_PATH.resolve(node.mount.opts.root), path);
            return path;
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        }},stream_ops:{open:function (stream) {
          var path = NODEFS.realPath(stream.node);
          try {
            if (FS.isFile(stream.node.mode)) {
              stream.nfd = fs.openSync(path, NODEFS.flagsToPermissionString(stream.flags));
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },close:function (stream) {
          try {
            if (FS.isFile(stream.node.mode) && stream.nfd) {
              fs.closeSync(stream.nfd);
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },read:function (stream, buffer, offset, length, position) {
          if (length === 0) return 0; // node errors on 0 length reads
          // FIXME this is terrible.
          var nbuffer = new Buffer(length);
          var res;
          try {
            res = fs.readSync(stream.nfd, nbuffer, 0, length, position);
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          if (res > 0) {
            for (var i = 0; i < res; i++) {
              buffer[offset + i] = nbuffer[i];
            }
          }
          return res;
        },write:function (stream, buffer, offset, length, position) {
          // FIXME this is terrible.
          var nbuffer = new Buffer(buffer.subarray(offset, offset + length));
          var res;
          try {
            res = fs.writeSync(stream.nfd, nbuffer, 0, length, position);
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          return res;
        },llseek:function (stream, offset, whence) {
          var position = offset;
          if (whence === 1) {  // SEEK_CUR.
            position += stream.position;
          } else if (whence === 2) {  // SEEK_END.
            if (FS.isFile(stream.node.mode)) {
              try {
                var stat = fs.fstatSync(stream.nfd);
                position += stat.size;
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES[e.code]);
              }
            }
          }
  
          if (position < 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
  
          return position;
        }}};
  
  var WORKERFS={DIR_MODE:16895,FILE_MODE:33279,reader:null,mount:function (mount) {
        assert(ENVIRONMENT_IS_WORKER);
        if (!WORKERFS.reader) WORKERFS.reader = new FileReaderSync();
        var root = WORKERFS.createNode(null, '/', WORKERFS.DIR_MODE, 0);
        var createdParents = {};
        function ensureParent(path) {
          // return the parent node, creating subdirs as necessary
          var parts = path.split('/');
          var parent = root;
          for (var i = 0; i < parts.length-1; i++) {
            var curr = parts.slice(0, i+1).join('/');
            if (!createdParents[curr]) {
              createdParents[curr] = WORKERFS.createNode(parent, curr, WORKERFS.DIR_MODE, 0);
            }
            parent = createdParents[curr];
          }
          return parent;
        }
        function base(path) {
          var parts = path.split('/');
          return parts[parts.length-1];
        }
        // We also accept FileList here, by using Array.prototype
        Array.prototype.forEach.call(mount.opts["files"] || [], function(file) {
          WORKERFS.createNode(ensureParent(file.name), base(file.name), WORKERFS.FILE_MODE, 0, file, file.lastModifiedDate);
        });
        (mount.opts["blobs"] || []).forEach(function(obj) {
          WORKERFS.createNode(ensureParent(obj["name"]), base(obj["name"]), WORKERFS.FILE_MODE, 0, obj["data"]);
        });
        (mount.opts["packages"] || []).forEach(function(pack) {
          pack['metadata'].files.forEach(function(file) {
            var name = file.filename.substr(1); // remove initial slash
            WORKERFS.createNode(ensureParent(name), base(name), WORKERFS.FILE_MODE, 0, pack['blob'].slice(file.start, file.end));
          });
        });
        return root;
      },createNode:function (parent, name, mode, dev, contents, mtime) {
        var node = FS.createNode(parent, name, mode);
        node.mode = mode;
        node.node_ops = WORKERFS.node_ops;
        node.stream_ops = WORKERFS.stream_ops;
        node.timestamp = (mtime || new Date).getTime();
        assert(WORKERFS.FILE_MODE !== WORKERFS.DIR_MODE);
        if (mode === WORKERFS.FILE_MODE) {
          node.size = contents.size;
          node.contents = contents;
        } else {
          node.size = 4096;
          node.contents = {};
        }
        if (parent) {
          parent.contents[name] = node;
        }
        return node;
      },node_ops:{getattr:function (node) {
          return {
            dev: 1,
            ino: undefined,
            mode: node.mode,
            nlink: 1,
            uid: 0,
            gid: 0,
            rdev: undefined,
            size: node.size,
            atime: new Date(node.timestamp),
            mtime: new Date(node.timestamp),
            ctime: new Date(node.timestamp),
            blksize: 4096,
            blocks: Math.ceil(node.size / 4096),
          };
        },setattr:function (node, attr) {
          if (attr.mode !== undefined) {
            node.mode = attr.mode;
          }
          if (attr.timestamp !== undefined) {
            node.timestamp = attr.timestamp;
          }
        },lookup:function (parent, name) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        },mknod:function (parent, name, mode, dev) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        },rename:function (oldNode, newDir, newName) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        },unlink:function (parent, name) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        },rmdir:function (parent, name) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        },readdir:function (node) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        },symlink:function (parent, newName, oldPath) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        },readlink:function (node) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }},stream_ops:{read:function (stream, buffer, offset, length, position) {
          if (position >= stream.node.size) return 0;
          var chunk = stream.node.contents.slice(position, position + length);
          var ab = WORKERFS.reader.readAsArrayBuffer(chunk);
          buffer.set(new Uint8Array(ab), offset);
          return chunk.size;
        },write:function (stream, buffer, offset, length, position) {
          throw new FS.ErrnoError(ERRNO_CODES.EIO);
        },llseek:function (stream, offset, whence) {
          var position = offset;
          if (whence === 1) {  // SEEK_CUR.
            position += stream.position;
          } else if (whence === 2) {  // SEEK_END.
            if (FS.isFile(stream.node.mode)) {
              position += stream.node.size;
            }
          }
          if (position < 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          return position;
        }}};
  
  var _stdin=allocate(1, "i32*", ALLOC_STATIC);
  
  var _stdout=allocate(1, "i32*", ALLOC_STATIC);
  
  var _stderr=allocate(1, "i32*", ALLOC_STATIC);var FS={root:null,mounts:[],devices:[null],streams:[],nextInode:1,nameTable:null,currentPath:"/",initialized:false,ignorePermissions:true,trackingDelegate:{},tracking:{openFlags:{READ:1,WRITE:2}},ErrnoError:null,genericErrors:{},filesystems:null,handleFSError:function (e) {
        if (!(e instanceof FS.ErrnoError)) throw e + ' : ' + stackTrace();
        return ___setErrNo(e.errno);
      },lookupPath:function (path, opts) {
        path = PATH.resolve(FS.cwd(), path);
        opts = opts || {};
  
        if (!path) return { path: '', node: null };
  
        var defaults = {
          follow_mount: true,
          recurse_count: 0
        };
        for (var key in defaults) {
          if (opts[key] === undefined) {
            opts[key] = defaults[key];
          }
        }
  
        if (opts.recurse_count > 8) {  // max recursive lookup of 8
          throw new FS.ErrnoError(ERRNO_CODES.ELOOP);
        }
  
        // split the path
        var parts = PATH.normalizeArray(path.split('/').filter(function(p) {
          return !!p;
        }), false);
  
        // start at the root
        var current = FS.root;
        var current_path = '/';
  
        for (var i = 0; i < parts.length; i++) {
          var islast = (i === parts.length-1);
          if (islast && opts.parent) {
            // stop resolving
            break;
          }
  
          current = FS.lookupNode(current, parts[i]);
          current_path = PATH.join2(current_path, parts[i]);
  
          // jump to the mount's root node if this is a mountpoint
          if (FS.isMountpoint(current)) {
            if (!islast || (islast && opts.follow_mount)) {
              current = current.mounted.root;
            }
          }
  
          // by default, lookupPath will not follow a symlink if it is the final path component.
          // setting opts.follow = true will override this behavior.
          if (!islast || opts.follow) {
            var count = 0;
            while (FS.isLink(current.mode)) {
              var link = FS.readlink(current_path);
              current_path = PATH.resolve(PATH.dirname(current_path), link);
  
              var lookup = FS.lookupPath(current_path, { recurse_count: opts.recurse_count });
              current = lookup.node;
  
              if (count++ > 40) {  // limit max consecutive symlinks to 40 (SYMLOOP_MAX).
                throw new FS.ErrnoError(ERRNO_CODES.ELOOP);
              }
            }
          }
        }
  
        return { path: current_path, node: current };
      },getPath:function (node) {
        var path;
        while (true) {
          if (FS.isRoot(node)) {
            var mount = node.mount.mountpoint;
            if (!path) return mount;
            return mount[mount.length-1] !== '/' ? mount + '/' + path : mount + path;
          }
          path = path ? node.name + '/' + path : node.name;
          node = node.parent;
        }
      },hashName:function (parentid, name) {
        var hash = 0;
  
  
        for (var i = 0; i < name.length; i++) {
          hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
        }
        return ((parentid + hash) >>> 0) % FS.nameTable.length;
      },hashAddNode:function (node) {
        var hash = FS.hashName(node.parent.id, node.name);
        node.name_next = FS.nameTable[hash];
        FS.nameTable[hash] = node;
      },hashRemoveNode:function (node) {
        var hash = FS.hashName(node.parent.id, node.name);
        if (FS.nameTable[hash] === node) {
          FS.nameTable[hash] = node.name_next;
        } else {
          var current = FS.nameTable[hash];
          while (current) {
            if (current.name_next === node) {
              current.name_next = node.name_next;
              break;
            }
            current = current.name_next;
          }
        }
      },lookupNode:function (parent, name) {
        var err = FS.mayLookup(parent);
        if (err) {
          throw new FS.ErrnoError(err, parent);
        }
        var hash = FS.hashName(parent.id, name);
        for (var node = FS.nameTable[hash]; node; node = node.name_next) {
          var nodeName = node.name;
          if (node.parent.id === parent.id && nodeName === name) {
            return node;
          }
        }
        // if we failed to find it in the cache, call into the VFS
        return FS.lookup(parent, name);
      },createNode:function (parent, name, mode, rdev) {
        if (!FS.FSNode) {
          FS.FSNode = function(parent, name, mode, rdev) {
            if (!parent) {
              parent = this;  // root node sets parent to itself
            }
            this.parent = parent;
            this.mount = parent.mount;
            this.mounted = null;
            this.id = FS.nextInode++;
            this.name = name;
            this.mode = mode;
            this.node_ops = {};
            this.stream_ops = {};
            this.rdev = rdev;
          };
  
          FS.FSNode.prototype = {};
  
          // compatibility
          var readMode = 292 | 73;
          var writeMode = 146;
  
          // NOTE we must use Object.defineProperties instead of individual calls to
          // Object.defineProperty in order to make closure compiler happy
          Object.defineProperties(FS.FSNode.prototype, {
            read: {
              get: function() { return (this.mode & readMode) === readMode; },
              set: function(val) { val ? this.mode |= readMode : this.mode &= ~readMode; }
            },
            write: {
              get: function() { return (this.mode & writeMode) === writeMode; },
              set: function(val) { val ? this.mode |= writeMode : this.mode &= ~writeMode; }
            },
            isFolder: {
              get: function() { return FS.isDir(this.mode); }
            },
            isDevice: {
              get: function() { return FS.isChrdev(this.mode); }
            }
          });
        }
  
        var node = new FS.FSNode(parent, name, mode, rdev);
  
        FS.hashAddNode(node);
  
        return node;
      },destroyNode:function (node) {
        FS.hashRemoveNode(node);
      },isRoot:function (node) {
        return node === node.parent;
      },isMountpoint:function (node) {
        return !!node.mounted;
      },isFile:function (mode) {
        return (mode & 61440) === 32768;
      },isDir:function (mode) {
        return (mode & 61440) === 16384;
      },isLink:function (mode) {
        return (mode & 61440) === 40960;
      },isChrdev:function (mode) {
        return (mode & 61440) === 8192;
      },isBlkdev:function (mode) {
        return (mode & 61440) === 24576;
      },isFIFO:function (mode) {
        return (mode & 61440) === 4096;
      },isSocket:function (mode) {
        return (mode & 49152) === 49152;
      },flagModes:{"r":0,"rs":1052672,"r+":2,"w":577,"wx":705,"xw":705,"w+":578,"wx+":706,"xw+":706,"a":1089,"ax":1217,"xa":1217,"a+":1090,"ax+":1218,"xa+":1218},modeStringToFlags:function (str) {
        var flags = FS.flagModes[str];
        if (typeof flags === 'undefined') {
          throw new Error('Unknown file open mode: ' + str);
        }
        return flags;
      },flagsToPermissionString:function (flag) {
        var perms = ['r', 'w', 'rw'][flag & 3];
        if ((flag & 512)) {
          perms += 'w';
        }
        return perms;
      },nodePermissions:function (node, perms) {
        if (FS.ignorePermissions) {
          return 0;
        }
        // return 0 if any user, group or owner bits are set.
        if (perms.indexOf('r') !== -1 && !(node.mode & 292)) {
          return ERRNO_CODES.EACCES;
        } else if (perms.indexOf('w') !== -1 && !(node.mode & 146)) {
          return ERRNO_CODES.EACCES;
        } else if (perms.indexOf('x') !== -1 && !(node.mode & 73)) {
          return ERRNO_CODES.EACCES;
        }
        return 0;
      },mayLookup:function (dir) {
        var err = FS.nodePermissions(dir, 'x');
        if (err) return err;
        if (!dir.node_ops.lookup) return ERRNO_CODES.EACCES;
        return 0;
      },mayCreate:function (dir, name) {
        try {
          var node = FS.lookupNode(dir, name);
          return ERRNO_CODES.EEXIST;
        } catch (e) {
        }
        return FS.nodePermissions(dir, 'wx');
      },mayDelete:function (dir, name, isdir) {
        var node;
        try {
          node = FS.lookupNode(dir, name);
        } catch (e) {
          return e.errno;
        }
        var err = FS.nodePermissions(dir, 'wx');
        if (err) {
          return err;
        }
        if (isdir) {
          if (!FS.isDir(node.mode)) {
            return ERRNO_CODES.ENOTDIR;
          }
          if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
            return ERRNO_CODES.EBUSY;
          }
        } else {
          if (FS.isDir(node.mode)) {
            return ERRNO_CODES.EISDIR;
          }
        }
        return 0;
      },mayOpen:function (node, flags) {
        if (!node) {
          return ERRNO_CODES.ENOENT;
        }
        if (FS.isLink(node.mode)) {
          return ERRNO_CODES.ELOOP;
        } else if (FS.isDir(node.mode)) {
          if ((flags & 2097155) !== 0 ||  // opening for write
              (flags & 512)) {
            return ERRNO_CODES.EISDIR;
          }
        }
        return FS.nodePermissions(node, FS.flagsToPermissionString(flags));
      },MAX_OPEN_FDS:4096,nextfd:function (fd_start, fd_end) {
        fd_start = fd_start || 0;
        fd_end = fd_end || FS.MAX_OPEN_FDS;
        for (var fd = fd_start; fd <= fd_end; fd++) {
          if (!FS.streams[fd]) {
            return fd;
          }
        }
        throw new FS.ErrnoError(ERRNO_CODES.EMFILE);
      },getStream:function (fd) {
        return FS.streams[fd];
      },createStream:function (stream, fd_start, fd_end) {
        if (!FS.FSStream) {
          FS.FSStream = function(){};
          FS.FSStream.prototype = {};
          // compatibility
          Object.defineProperties(FS.FSStream.prototype, {
            object: {
              get: function() { return this.node; },
              set: function(val) { this.node = val; }
            },
            isRead: {
              get: function() { return (this.flags & 2097155) !== 1; }
            },
            isWrite: {
              get: function() { return (this.flags & 2097155) !== 0; }
            },
            isAppend: {
              get: function() { return (this.flags & 1024); }
            }
          });
        }
        // clone it, so we can return an instance of FSStream
        var newStream = new FS.FSStream();
        for (var p in stream) {
          newStream[p] = stream[p];
        }
        stream = newStream;
        var fd = FS.nextfd(fd_start, fd_end);
        stream.fd = fd;
        FS.streams[fd] = stream;
        return stream;
      },closeStream:function (fd) {
        FS.streams[fd] = null;
      },chrdev_stream_ops:{open:function (stream) {
          var device = FS.getDevice(stream.node.rdev);
          // override node's stream ops with the device's
          stream.stream_ops = device.stream_ops;
          // forward the open call
          if (stream.stream_ops.open) {
            stream.stream_ops.open(stream);
          }
        },llseek:function () {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }},major:function (dev) {
        return ((dev) >> 8);
      },minor:function (dev) {
        return ((dev) & 0xff);
      },makedev:function (ma, mi) {
        return ((ma) << 8 | (mi));
      },registerDevice:function (dev, ops) {
        FS.devices[dev] = { stream_ops: ops };
      },getDevice:function (dev) {
        return FS.devices[dev];
      },getMounts:function (mount) {
        var mounts = [];
        var check = [mount];
  
        while (check.length) {
          var m = check.pop();
  
          mounts.push(m);
  
          check.push.apply(check, m.mounts);
        }
  
        return mounts;
      },syncfs:function (populate, callback) {
        if (typeof(populate) === 'function') {
          callback = populate;
          populate = false;
        }
  
        var mounts = FS.getMounts(FS.root.mount);
        var completed = 0;
  
        function done(err) {
          if (err) {
            if (!done.errored) {
              done.errored = true;
              return callback(err);
            }
            return;
          }
          if (++completed >= mounts.length) {
            callback(null);
          }
        };
  
        // sync all mounts
        mounts.forEach(function (mount) {
          if (!mount.type.syncfs) {
            return done(null);
          }
          mount.type.syncfs(mount, populate, done);
        });
      },mount:function (type, opts, mountpoint) {
        var root = mountpoint === '/';
        var pseudo = !mountpoint;
        var node;
  
        if (root && FS.root) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        } else if (!root && !pseudo) {
          var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
  
          mountpoint = lookup.path;  // use the absolute path
          node = lookup.node;
  
          if (FS.isMountpoint(node)) {
            throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
          }
  
          if (!FS.isDir(node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
          }
        }
  
        var mount = {
          type: type,
          opts: opts,
          mountpoint: mountpoint,
          mounts: []
        };
  
        // create a root node for the fs
        var mountRoot = type.mount(mount);
        mountRoot.mount = mount;
        mount.root = mountRoot;
  
        if (root) {
          FS.root = mountRoot;
        } else if (node) {
          // set as a mountpoint
          node.mounted = mount;
  
          // add the new mount to the current mount's children
          if (node.mount) {
            node.mount.mounts.push(mount);
          }
        }
  
        return mountRoot;
      },unmount:function (mountpoint) {
        var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
  
        if (!FS.isMountpoint(lookup.node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
  
        // destroy the nodes for this mount, and all its child mounts
        var node = lookup.node;
        var mount = node.mounted;
        var mounts = FS.getMounts(mount);
  
        Object.keys(FS.nameTable).forEach(function (hash) {
          var current = FS.nameTable[hash];
  
          while (current) {
            var next = current.name_next;
  
            if (mounts.indexOf(current.mount) !== -1) {
              FS.destroyNode(current);
            }
  
            current = next;
          }
        });
  
        // no longer a mountpoint
        node.mounted = null;
  
        // remove this mount from the child mounts
        var idx = node.mount.mounts.indexOf(mount);
        assert(idx !== -1);
        node.mount.mounts.splice(idx, 1);
      },lookup:function (parent, name) {
        return parent.node_ops.lookup(parent, name);
      },mknod:function (path, mode, dev) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        if (!name || name === '.' || name === '..') {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var err = FS.mayCreate(parent, name);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.mknod) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return parent.node_ops.mknod(parent, name, mode, dev);
      },create:function (path, mode) {
        mode = mode !== undefined ? mode : 438 /* 0666 */;
        mode &= 4095;
        mode |= 32768;
        return FS.mknod(path, mode, 0);
      },mkdir:function (path, mode) {
        mode = mode !== undefined ? mode : 511 /* 0777 */;
        mode &= 511 | 512;
        mode |= 16384;
        return FS.mknod(path, mode, 0);
      },mkdev:function (path, mode, dev) {
        if (typeof(dev) === 'undefined') {
          dev = mode;
          mode = 438 /* 0666 */;
        }
        mode |= 8192;
        return FS.mknod(path, mode, dev);
      },symlink:function (oldpath, newpath) {
        if (!PATH.resolve(oldpath)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        var lookup = FS.lookupPath(newpath, { parent: true });
        var parent = lookup.node;
        if (!parent) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        var newname = PATH.basename(newpath);
        var err = FS.mayCreate(parent, newname);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.symlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return parent.node_ops.symlink(parent, newname, oldpath);
      },rename:function (old_path, new_path) {
        var old_dirname = PATH.dirname(old_path);
        var new_dirname = PATH.dirname(new_path);
        var old_name = PATH.basename(old_path);
        var new_name = PATH.basename(new_path);
        // parents must exist
        var lookup, old_dir, new_dir;
        try {
          lookup = FS.lookupPath(old_path, { parent: true });
          old_dir = lookup.node;
          lookup = FS.lookupPath(new_path, { parent: true });
          new_dir = lookup.node;
        } catch (e) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        if (!old_dir || !new_dir) throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        // need to be part of the same mount
        if (old_dir.mount !== new_dir.mount) {
          throw new FS.ErrnoError(ERRNO_CODES.EXDEV);
        }
        // source must exist
        var old_node = FS.lookupNode(old_dir, old_name);
        // old path should not be an ancestor of the new path
        var relative = PATH.relative(old_path, new_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        // new path should not be an ancestor of the old path
        relative = PATH.relative(new_path, old_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
        }
        // see if the new path already exists
        var new_node;
        try {
          new_node = FS.lookupNode(new_dir, new_name);
        } catch (e) {
          // not fatal
        }
        // early out if nothing needs to change
        if (old_node === new_node) {
          return;
        }
        // we'll need to delete the old entry
        var isdir = FS.isDir(old_node.mode);
        var err = FS.mayDelete(old_dir, old_name, isdir);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        // need delete permissions if we'll be overwriting.
        // need create permissions if new doesn't already exist.
        err = new_node ?
          FS.mayDelete(new_dir, new_name, isdir) :
          FS.mayCreate(new_dir, new_name);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!old_dir.node_ops.rename) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(old_node) || (new_node && FS.isMountpoint(new_node))) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        // if we are going to change the parent, check write permissions
        if (new_dir !== old_dir) {
          err = FS.nodePermissions(old_dir, 'w');
          if (err) {
            throw new FS.ErrnoError(err);
          }
        }
        try {
          if (FS.trackingDelegate['willMovePath']) {
            FS.trackingDelegate['willMovePath'](old_path, new_path);
          }
        } catch(e) {
          console.log("FS.trackingDelegate['willMovePath']('"+old_path+"', '"+new_path+"') threw an exception: " + e.message);
        }
        // remove the node from the lookup hash
        FS.hashRemoveNode(old_node);
        // do the underlying fs rename
        try {
          old_dir.node_ops.rename(old_node, new_dir, new_name);
        } catch (e) {
          throw e;
        } finally {
          // add the node back to the hash (in case node_ops.rename
          // changed its name)
          FS.hashAddNode(old_node);
        }
        try {
          if (FS.trackingDelegate['onMovePath']) FS.trackingDelegate['onMovePath'](old_path, new_path);
        } catch(e) {
          console.log("FS.trackingDelegate['onMovePath']('"+old_path+"', '"+new_path+"') threw an exception: " + e.message);
        }
      },rmdir:function (path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var err = FS.mayDelete(parent, name, true);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.rmdir) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        try {
          if (FS.trackingDelegate['willDeletePath']) {
            FS.trackingDelegate['willDeletePath'](path);
          }
        } catch(e) {
          console.log("FS.trackingDelegate['willDeletePath']('"+path+"') threw an exception: " + e.message);
        }
        parent.node_ops.rmdir(parent, name);
        FS.destroyNode(node);
        try {
          if (FS.trackingDelegate['onDeletePath']) FS.trackingDelegate['onDeletePath'](path);
        } catch(e) {
          console.log("FS.trackingDelegate['onDeletePath']('"+path+"') threw an exception: " + e.message);
        }
      },readdir:function (path) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        if (!node.node_ops.readdir) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
        }
        return node.node_ops.readdir(node);
      },unlink:function (path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var err = FS.mayDelete(parent, name, false);
        if (err) {
          // POSIX says unlink should set EPERM, not EISDIR
          if (err === ERRNO_CODES.EISDIR) err = ERRNO_CODES.EPERM;
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.unlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        try {
          if (FS.trackingDelegate['willDeletePath']) {
            FS.trackingDelegate['willDeletePath'](path);
          }
        } catch(e) {
          console.log("FS.trackingDelegate['willDeletePath']('"+path+"') threw an exception: " + e.message);
        }
        parent.node_ops.unlink(parent, name);
        FS.destroyNode(node);
        try {
          if (FS.trackingDelegate['onDeletePath']) FS.trackingDelegate['onDeletePath'](path);
        } catch(e) {
          console.log("FS.trackingDelegate['onDeletePath']('"+path+"') threw an exception: " + e.message);
        }
      },readlink:function (path) {
        var lookup = FS.lookupPath(path);
        var link = lookup.node;
        if (!link) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        if (!link.node_ops.readlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        return PATH.resolve(FS.getPath(link.parent), link.node_ops.readlink(link));
      },stat:function (path, dontFollow) {
        var lookup = FS.lookupPath(path, { follow: !dontFollow });
        var node = lookup.node;
        if (!node) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        if (!node.node_ops.getattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return node.node_ops.getattr(node);
      },lstat:function (path) {
        return FS.stat(path, true);
      },chmod:function (path, mode, dontFollow) {
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        node.node_ops.setattr(node, {
          mode: (mode & 4095) | (node.mode & ~4095),
          timestamp: Date.now()
        });
      },lchmod:function (path, mode) {
        FS.chmod(path, mode, true);
      },fchmod:function (fd, mode) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        FS.chmod(stream.node, mode);
      },chown:function (path, uid, gid, dontFollow) {
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        node.node_ops.setattr(node, {
          timestamp: Date.now()
          // we ignore the uid / gid for now
        });
      },lchown:function (path, uid, gid) {
        FS.chown(path, uid, gid, true);
      },fchown:function (fd, uid, gid) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        FS.chown(stream.node, uid, gid);
      },truncate:function (path, len) {
        if (len < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: true });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isDir(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!FS.isFile(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var err = FS.nodePermissions(node, 'w');
        if (err) {
          throw new FS.ErrnoError(err);
        }
        node.node_ops.setattr(node, {
          size: len,
          timestamp: Date.now()
        });
      },ftruncate:function (fd, len) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        FS.truncate(stream.node, len);
      },utime:function (path, atime, mtime) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        node.node_ops.setattr(node, {
          timestamp: Math.max(atime, mtime)
        });
      },open:function (path, flags, mode, fd_start, fd_end) {
        if (path === "") {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        flags = typeof flags === 'string' ? FS.modeStringToFlags(flags) : flags;
        mode = typeof mode === 'undefined' ? 438 /* 0666 */ : mode;
        if ((flags & 64)) {
          mode = (mode & 4095) | 32768;
        } else {
          mode = 0;
        }
        var node;
        if (typeof path === 'object') {
          node = path;
        } else {
          path = PATH.normalize(path);
          try {
            var lookup = FS.lookupPath(path, {
              follow: !(flags & 131072)
            });
            node = lookup.node;
          } catch (e) {
            // ignore
          }
        }
        // perhaps we need to create the node
        var created = false;
        if ((flags & 64)) {
          if (node) {
            // if O_CREAT and O_EXCL are set, error out if the node already exists
            if ((flags & 128)) {
              throw new FS.ErrnoError(ERRNO_CODES.EEXIST);
            }
          } else {
            // node doesn't exist, try to create it
            node = FS.mknod(path, mode, 0);
            created = true;
          }
        }
        if (!node) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        // can't truncate a device
        if (FS.isChrdev(node.mode)) {
          flags &= ~512;
        }
        // if asked only for a directory, then this must be one
        if ((flags & 65536) && !FS.isDir(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
        }
        // check permissions, if this is not a file we just created now (it is ok to
        // create and write to a file with read-only permissions; it is read-only
        // for later use)
        if (!created) {
          var err = FS.mayOpen(node, flags);
          if (err) {
            throw new FS.ErrnoError(err);
          }
        }
        // do truncation if necessary
        if ((flags & 512)) {
          FS.truncate(node, 0);
        }
        // we've already handled these, don't pass down to the underlying vfs
        flags &= ~(128 | 512);
  
        // register the stream with the filesystem
        var stream = FS.createStream({
          node: node,
          path: FS.getPath(node),  // we want the absolute path to the node
          flags: flags,
          seekable: true,
          position: 0,
          stream_ops: node.stream_ops,
          // used by the file family libc calls (fopen, fwrite, ferror, etc.)
          ungotten: [],
          error: false
        }, fd_start, fd_end);
        // call the new stream's open function
        if (stream.stream_ops.open) {
          stream.stream_ops.open(stream);
        }
        if (Module['logReadFiles'] && !(flags & 1)) {
          if (!FS.readFiles) FS.readFiles = {};
          if (!(path in FS.readFiles)) {
            FS.readFiles[path] = 1;
            Module['printErr']('read file: ' + path);
          }
        }
        try {
          if (FS.trackingDelegate['onOpenFile']) {
            var trackingFlags = 0;
            if ((flags & 2097155) !== 1) {
              trackingFlags |= FS.tracking.openFlags.READ;
            }
            if ((flags & 2097155) !== 0) {
              trackingFlags |= FS.tracking.openFlags.WRITE;
            }
            FS.trackingDelegate['onOpenFile'](path, trackingFlags);
          }
        } catch(e) {
          console.log("FS.trackingDelegate['onOpenFile']('"+path+"', flags) threw an exception: " + e.message);
        }
        return stream;
      },close:function (stream) {
        if (stream.getdents) stream.getdents = null; // free readdir state
        try {
          if (stream.stream_ops.close) {
            stream.stream_ops.close(stream);
          }
        } catch (e) {
          throw e;
        } finally {
          FS.closeStream(stream.fd);
        }
      },llseek:function (stream, offset, whence) {
        if (!stream.seekable || !stream.stream_ops.llseek) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        stream.position = stream.stream_ops.llseek(stream, offset, whence);
        stream.ungotten = [];
        return stream.position;
      },read:function (stream, buffer, offset, length, position) {
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!stream.stream_ops.read) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var seeking = true;
        if (typeof position === 'undefined') {
          position = stream.position;
          seeking = false;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
        if (!seeking) stream.position += bytesRead;
        return bytesRead;
      },write:function (stream, buffer, offset, length, position, canOwn) {
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!stream.stream_ops.write) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if (stream.flags & 1024) {
          // seek to the end before writing in append mode
          FS.llseek(stream, 0, 2);
        }
        var seeking = true;
        if (typeof position === 'undefined') {
          position = stream.position;
          seeking = false;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
        if (!seeking) stream.position += bytesWritten;
        try {
          if (stream.path && FS.trackingDelegate['onWriteToFile']) FS.trackingDelegate['onWriteToFile'](stream.path);
        } catch(e) {
          console.log("FS.trackingDelegate['onWriteToFile']('"+path+"') threw an exception: " + e.message);
        }
        return bytesWritten;
      },allocate:function (stream, offset, length) {
        if (offset < 0 || length <= 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (!FS.isFile(stream.node.mode) && !FS.isDir(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
        }
        if (!stream.stream_ops.allocate) {
          throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP);
        }
        stream.stream_ops.allocate(stream, offset, length);
      },mmap:function (stream, buffer, offset, length, position, prot, flags) {
        // TODO if PROT is PROT_WRITE, make sure we have write access
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(ERRNO_CODES.EACCES);
        }
        if (!stream.stream_ops.mmap) {
          throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
        }
        return stream.stream_ops.mmap(stream, buffer, offset, length, position, prot, flags);
      },msync:function (stream, buffer, offset, length, mmapFlags) {
        if (!stream || !stream.stream_ops.msync) {
          return 0;
        }
        return stream.stream_ops.msync(stream, buffer, offset, length, mmapFlags);
      },munmap:function (stream) {
        return 0;
      },ioctl:function (stream, cmd, arg) {
        if (!stream.stream_ops.ioctl) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTTY);
        }
        return stream.stream_ops.ioctl(stream, cmd, arg);
      },readFile:function (path, opts) {
        opts = opts || {};
        opts.flags = opts.flags || 'r';
        opts.encoding = opts.encoding || 'binary';
        if (opts.encoding !== 'utf8' && opts.encoding !== 'binary') {
          throw new Error('Invalid encoding type "' + opts.encoding + '"');
        }
        var ret;
        var stream = FS.open(path, opts.flags);
        var stat = FS.stat(path);
        var length = stat.size;
        var buf = new Uint8Array(length);
        FS.read(stream, buf, 0, length, 0);
        if (opts.encoding === 'utf8') {
          ret = UTF8ArrayToString(buf, 0);
        } else if (opts.encoding === 'binary') {
          ret = buf;
        }
        FS.close(stream);
        return ret;
      },writeFile:function (path, data, opts) {
        opts = opts || {};
        opts.flags = opts.flags || 'w';
        opts.encoding = opts.encoding || 'utf8';
        if (opts.encoding !== 'utf8' && opts.encoding !== 'binary') {
          throw new Error('Invalid encoding type "' + opts.encoding + '"');
        }
        var stream = FS.open(path, opts.flags, opts.mode);
        if (opts.encoding === 'utf8') {
          var buf = new Uint8Array(lengthBytesUTF8(data)+1);
          var actualNumBytes = stringToUTF8Array(data, buf, 0, buf.length);
          FS.write(stream, buf, 0, actualNumBytes, 0, opts.canOwn);
        } else if (opts.encoding === 'binary') {
          FS.write(stream, data, 0, data.length, 0, opts.canOwn);
        }
        FS.close(stream);
      },cwd:function () {
        return FS.currentPath;
      },chdir:function (path) {
        var lookup = FS.lookupPath(path, { follow: true });
        if (!FS.isDir(lookup.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
        }
        var err = FS.nodePermissions(lookup.node, 'x');
        if (err) {
          throw new FS.ErrnoError(err);
        }
        FS.currentPath = lookup.path;
      },createDefaultDirectories:function () {
        FS.mkdir('/tmp');
        FS.mkdir('/home');
        FS.mkdir('/home/web_user');
      },createDefaultDevices:function () {
        // create /dev
        FS.mkdir('/dev');
        // setup /dev/null
        FS.registerDevice(FS.makedev(1, 3), {
          read: function() { return 0; },
          write: function(stream, buffer, offset, length, pos) { return length; }
        });
        FS.mkdev('/dev/null', FS.makedev(1, 3));
        // setup /dev/tty and /dev/tty1
        // stderr needs to print output using Module['printErr']
        // so we register a second tty just for it.
        TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
        TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
        FS.mkdev('/dev/tty', FS.makedev(5, 0));
        FS.mkdev('/dev/tty1', FS.makedev(6, 0));
        // setup /dev/[u]random
        var random_device;
        if (typeof crypto !== 'undefined') {
          // for modern web browsers
          var randomBuffer = new Uint8Array(1);
          random_device = function() { crypto.getRandomValues(randomBuffer); return randomBuffer[0]; };
        } else if (ENVIRONMENT_IS_NODE) {
          // for nodejs
          random_device = function() { return require('crypto').randomBytes(1)[0]; };
        } else {
          // default for ES5 platforms
          random_device = function() { return (Math.random()*256)|0; };
        }
        FS.createDevice('/dev', 'random', random_device);
        FS.createDevice('/dev', 'urandom', random_device);
        // we're not going to emulate the actual shm device,
        // just create the tmp dirs that reside in it commonly
        FS.mkdir('/dev/shm');
        FS.mkdir('/dev/shm/tmp');
      },createSpecialDirectories:function () {
        // create /proc/self/fd which allows /proc/self/fd/6 => readlink gives the name of the stream for fd 6 (see test_unistd_ttyname)
        FS.mkdir('/proc');
        FS.mkdir('/proc/self');
        FS.mkdir('/proc/self/fd');
        FS.mount({
          mount: function() {
            var node = FS.createNode('/proc/self', 'fd', 16384 | 0777, 73);
            node.node_ops = {
              lookup: function(parent, name) {
                var fd = +name;
                var stream = FS.getStream(fd);
                if (!stream) throw new FS.ErrnoError(ERRNO_CODES.EBADF);
                var ret = {
                  parent: null,
                  mount: { mountpoint: 'fake' },
                  node_ops: { readlink: function() { return stream.path } }
                };
                ret.parent = ret; // make it look like a simple root node
                return ret;
              }
            };
            return node;
          }
        }, {}, '/proc/self/fd');
      },createStandardStreams:function () {
        // TODO deprecate the old functionality of a single
        // input / output callback and that utilizes FS.createDevice
        // and instead require a unique set of stream ops
  
        // by default, we symlink the standard streams to the
        // default tty devices. however, if the standard streams
        // have been overwritten we create a unique device for
        // them instead.
        if (Module['stdin']) {
          FS.createDevice('/dev', 'stdin', Module['stdin']);
        } else {
          FS.symlink('/dev/tty', '/dev/stdin');
        }
        if (Module['stdout']) {
          FS.createDevice('/dev', 'stdout', null, Module['stdout']);
        } else {
          FS.symlink('/dev/tty', '/dev/stdout');
        }
        if (Module['stderr']) {
          FS.createDevice('/dev', 'stderr', null, Module['stderr']);
        } else {
          FS.symlink('/dev/tty1', '/dev/stderr');
        }
  
        // open default streams for the stdin, stdout and stderr devices
        var stdin = FS.open('/dev/stdin', 'r');
        assert(stdin.fd === 0, 'invalid handle for stdin (' + stdin.fd + ')');
  
        var stdout = FS.open('/dev/stdout', 'w');
        assert(stdout.fd === 1, 'invalid handle for stdout (' + stdout.fd + ')');
  
        var stderr = FS.open('/dev/stderr', 'w');
        assert(stderr.fd === 2, 'invalid handle for stderr (' + stderr.fd + ')');
      },ensureErrnoError:function () {
        if (FS.ErrnoError) return;
        FS.ErrnoError = function ErrnoError(errno, node) {
          //Module.printErr(stackTrace()); // useful for debugging
          this.node = node;
          this.setErrno = function(errno) {
            this.errno = errno;
            for (var key in ERRNO_CODES) {
              if (ERRNO_CODES[key] === errno) {
                this.code = key;
                break;
              }
            }
          };
          this.setErrno(errno);
          this.message = ERRNO_MESSAGES[errno];
        };
        FS.ErrnoError.prototype = new Error();
        FS.ErrnoError.prototype.constructor = FS.ErrnoError;
        // Some errors may happen quite a bit, to avoid overhead we reuse them (and suffer a lack of stack info)
        [ERRNO_CODES.ENOENT].forEach(function(code) {
          FS.genericErrors[code] = new FS.ErrnoError(code);
          FS.genericErrors[code].stack = '<generic error, no stack>';
        });
      },staticInit:function () {
        FS.ensureErrnoError();
  
        FS.nameTable = new Array(4096);
  
        FS.mount(MEMFS, {}, '/');
  
        FS.createDefaultDirectories();
        FS.createDefaultDevices();
        FS.createSpecialDirectories();
  
        FS.filesystems = {
          'MEMFS': MEMFS,
          'IDBFS': IDBFS,
          'NODEFS': NODEFS,
          'WORKERFS': WORKERFS,
        };
      },init:function (input, output, error) {
        assert(!FS.init.initialized, 'FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)');
        FS.init.initialized = true;
  
        FS.ensureErrnoError();
  
        // Allow Module.stdin etc. to provide defaults, if none explicitly passed to us here
        Module['stdin'] = input || Module['stdin'];
        Module['stdout'] = output || Module['stdout'];
        Module['stderr'] = error || Module['stderr'];
  
        FS.createStandardStreams();
      },quit:function () {
        FS.init.initialized = false;
        // force-flush all streams, so we get musl std streams printed out
        var fflush = Module['_fflush'];
        if (fflush) fflush(0);
        // close all of our streams
        for (var i = 0; i < FS.streams.length; i++) {
          var stream = FS.streams[i];
          if (!stream) {
            continue;
          }
          FS.close(stream);
        }
      },getMode:function (canRead, canWrite) {
        var mode = 0;
        if (canRead) mode |= 292 | 73;
        if (canWrite) mode |= 146;
        return mode;
      },joinPath:function (parts, forceRelative) {
        var path = PATH.join.apply(null, parts);
        if (forceRelative && path[0] == '/') path = path.substr(1);
        return path;
      },absolutePath:function (relative, base) {
        return PATH.resolve(base, relative);
      },standardizePath:function (path) {
        return PATH.normalize(path);
      },findObject:function (path, dontResolveLastLink) {
        var ret = FS.analyzePath(path, dontResolveLastLink);
        if (ret.exists) {
          return ret.object;
        } else {
          ___setErrNo(ret.error);
          return null;
        }
      },analyzePath:function (path, dontResolveLastLink) {
        // operate from within the context of the symlink's target
        try {
          var lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          path = lookup.path;
        } catch (e) {
        }
        var ret = {
          isRoot: false, exists: false, error: 0, name: null, path: null, object: null,
          parentExists: false, parentPath: null, parentObject: null
        };
        try {
          var lookup = FS.lookupPath(path, { parent: true });
          ret.parentExists = true;
          ret.parentPath = lookup.path;
          ret.parentObject = lookup.node;
          ret.name = PATH.basename(path);
          lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          ret.exists = true;
          ret.path = lookup.path;
          ret.object = lookup.node;
          ret.name = lookup.node.name;
          ret.isRoot = lookup.path === '/';
        } catch (e) {
          ret.error = e.errno;
        };
        return ret;
      },createFolder:function (parent, name, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(canRead, canWrite);
        return FS.mkdir(path, mode);
      },createPath:function (parent, path, canRead, canWrite) {
        parent = typeof parent === 'string' ? parent : FS.getPath(parent);
        var parts = path.split('/').reverse();
        while (parts.length) {
          var part = parts.pop();
          if (!part) continue;
          var current = PATH.join2(parent, part);
          try {
            FS.mkdir(current);
          } catch (e) {
            // ignore EEXIST
          }
          parent = current;
        }
        return current;
      },createFile:function (parent, name, properties, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(canRead, canWrite);
        return FS.create(path, mode);
      },createDataFile:function (parent, name, data, canRead, canWrite, canOwn) {
        var path = name ? PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name) : parent;
        var mode = FS.getMode(canRead, canWrite);
        var node = FS.create(path, mode);
        if (data) {
          if (typeof data === 'string') {
            var arr = new Array(data.length);
            for (var i = 0, len = data.length; i < len; ++i) arr[i] = data.charCodeAt(i);
            data = arr;
          }
          // make sure we can write to the file
          FS.chmod(node, mode | 146);
          var stream = FS.open(node, 'w');
          FS.write(stream, data, 0, data.length, 0, canOwn);
          FS.close(stream);
          FS.chmod(node, mode);
        }
        return node;
      },createDevice:function (parent, name, input, output) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(!!input, !!output);
        if (!FS.createDevice.major) FS.createDevice.major = 64;
        var dev = FS.makedev(FS.createDevice.major++, 0);
        // Create a fake device that a set of stream ops to emulate
        // the old behavior.
        FS.registerDevice(dev, {
          open: function(stream) {
            stream.seekable = false;
          },
          close: function(stream) {
            // flush any pending line data
            if (output && output.buffer && output.buffer.length) {
              output(10);
            }
          },
          read: function(stream, buffer, offset, length, pos /* ignored */) {
            var bytesRead = 0;
            for (var i = 0; i < length; i++) {
              var result;
              try {
                result = input();
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES.EIO);
              }
              if (result === undefined && bytesRead === 0) {
                throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
              }
              if (result === null || result === undefined) break;
              bytesRead++;
              buffer[offset+i] = result;
            }
            if (bytesRead) {
              stream.node.timestamp = Date.now();
            }
            return bytesRead;
          },
          write: function(stream, buffer, offset, length, pos) {
            for (var i = 0; i < length; i++) {
              try {
                output(buffer[offset+i]);
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES.EIO);
              }
            }
            if (length) {
              stream.node.timestamp = Date.now();
            }
            return i;
          }
        });
        return FS.mkdev(path, mode, dev);
      },createLink:function (parent, name, target, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        return FS.symlink(target, path);
      },forceLoadFile:function (obj) {
        if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
        var success = true;
        if (typeof XMLHttpRequest !== 'undefined') {
          throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");
        } else if (Module['read']) {
          // Command-line.
          try {
            // WARNING: Can't read binary files in V8's d8 or tracemonkey's js, as
            //          read() will try to parse UTF8.
            obj.contents = intArrayFromString(Module['read'](obj.url), true);
            obj.usedBytes = obj.contents.length;
          } catch (e) {
            success = false;
          }
        } else {
          throw new Error('Cannot load without read() or XMLHttpRequest.');
        }
        if (!success) ___setErrNo(ERRNO_CODES.EIO);
        return success;
      },createLazyFile:function (parent, name, url, canRead, canWrite) {
        // Lazy chunked Uint8Array (implements get and length from Uint8Array). Actual getting is abstracted away for eventual reuse.
        function LazyUint8Array() {
          this.lengthKnown = false;
          this.chunks = []; // Loaded chunks. Index is the chunk number
        }
        LazyUint8Array.prototype.get = function LazyUint8Array_get(idx) {
          if (idx > this.length-1 || idx < 0) {
            return undefined;
          }
          var chunkOffset = idx % this.chunkSize;
          var chunkNum = (idx / this.chunkSize)|0;
          return this.getter(chunkNum)[chunkOffset];
        }
        LazyUint8Array.prototype.setDataGetter = function LazyUint8Array_setDataGetter(getter) {
          this.getter = getter;
        }
        LazyUint8Array.prototype.cacheLength = function LazyUint8Array_cacheLength() {
          // Find length
          var xhr = new XMLHttpRequest();
          xhr.open('HEAD', url, false);
          xhr.send(null);
          if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
          var datalength = Number(xhr.getResponseHeader("Content-length"));
          var header;
          var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
          var chunkSize = 1024*1024; // Chunk size in bytes
  
          if (!hasByteServing) chunkSize = datalength;
  
          // Function to get a range from the remote URL.
          var doXHR = (function(from, to) {
            if (from > to) throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
            if (to > datalength-1) throw new Error("only " + datalength + " bytes available! programmer error!");
  
            // TODO: Use mozResponseArrayBuffer, responseStream, etc. if available.
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, false);
            if (datalength !== chunkSize) xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);
  
            // Some hints to the browser that we want binary data.
            if (typeof Uint8Array != 'undefined') xhr.responseType = 'arraybuffer';
            if (xhr.overrideMimeType) {
              xhr.overrideMimeType('text/plain; charset=x-user-defined');
            }
  
            xhr.send(null);
            if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
            if (xhr.response !== undefined) {
              return new Uint8Array(xhr.response || []);
            } else {
              return intArrayFromString(xhr.responseText || '', true);
            }
          });
          var lazyArray = this;
          lazyArray.setDataGetter(function(chunkNum) {
            var start = chunkNum * chunkSize;
            var end = (chunkNum+1) * chunkSize - 1; // including this byte
            end = Math.min(end, datalength-1); // if datalength-1 is selected, this is the last block
            if (typeof(lazyArray.chunks[chunkNum]) === "undefined") {
              lazyArray.chunks[chunkNum] = doXHR(start, end);
            }
            if (typeof(lazyArray.chunks[chunkNum]) === "undefined") throw new Error("doXHR failed!");
            return lazyArray.chunks[chunkNum];
          });
  
          this._length = datalength;
          this._chunkSize = chunkSize;
          this.lengthKnown = true;
        }
        if (typeof XMLHttpRequest !== 'undefined') {
          if (!ENVIRONMENT_IS_WORKER) throw 'Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc';
          var lazyArray = new LazyUint8Array();
          Object.defineProperty(lazyArray, "length", {
              get: function() {
                  if(!this.lengthKnown) {
                      this.cacheLength();
                  }
                  return this._length;
              }
          });
          Object.defineProperty(lazyArray, "chunkSize", {
              get: function() {
                  if(!this.lengthKnown) {
                      this.cacheLength();
                  }
                  return this._chunkSize;
              }
          });
  
          var properties = { isDevice: false, contents: lazyArray };
        } else {
          var properties = { isDevice: false, url: url };
        }
  
        var node = FS.createFile(parent, name, properties, canRead, canWrite);
        // This is a total hack, but I want to get this lazy file code out of the
        // core of MEMFS. If we want to keep this lazy file concept I feel it should
        // be its own thin LAZYFS proxying calls to MEMFS.
        if (properties.contents) {
          node.contents = properties.contents;
        } else if (properties.url) {
          node.contents = null;
          node.url = properties.url;
        }
        // Add a function that defers querying the file size until it is asked the first time.
        Object.defineProperty(node, "usedBytes", {
            get: function() { return this.contents.length; }
        });
        // override each stream op with one that tries to force load the lazy file first
        var stream_ops = {};
        var keys = Object.keys(node.stream_ops);
        keys.forEach(function(key) {
          var fn = node.stream_ops[key];
          stream_ops[key] = function forceLoadLazyFile() {
            if (!FS.forceLoadFile(node)) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
            return fn.apply(null, arguments);
          };
        });
        // use a custom read function
        stream_ops.read = function stream_ops_read(stream, buffer, offset, length, position) {
          if (!FS.forceLoadFile(node)) {
            throw new FS.ErrnoError(ERRNO_CODES.EIO);
          }
          var contents = stream.node.contents;
          if (position >= contents.length)
            return 0;
          var size = Math.min(contents.length - position, length);
          assert(size >= 0);
          if (contents.slice) { // normal array
            for (var i = 0; i < size; i++) {
              buffer[offset + i] = contents[position + i];
            }
          } else {
            for (var i = 0; i < size; i++) { // LazyUint8Array from sync binary XHR
              buffer[offset + i] = contents.get(position + i);
            }
          }
          return size;
        };
        node.stream_ops = stream_ops;
        return node;
      },createPreloadedFile:function (parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn, preFinish) {
        Browser.init();
        // TODO we should allow people to just pass in a complete filename instead
        // of parent and name being that we just join them anyways
        var fullname = name ? PATH.resolve(PATH.join2(parent, name)) : parent;
        var dep = getUniqueRunDependency('cp ' + fullname); // might have several active requests for the same fullname
        function processData(byteArray) {
          function finish(byteArray) {
            if (preFinish) preFinish();
            if (!dontCreateFile) {
              FS.createDataFile(parent, name, byteArray, canRead, canWrite, canOwn);
            }
            if (onload) onload();
            removeRunDependency(dep);
          }
          var handled = false;
          Module['preloadPlugins'].forEach(function(plugin) {
            if (handled) return;
            if (plugin['canHandle'](fullname)) {
              plugin['handle'](byteArray, fullname, finish, function() {
                if (onerror) onerror();
                removeRunDependency(dep);
              });
              handled = true;
            }
          });
          if (!handled) finish(byteArray);
        }
        addRunDependency(dep);
        if (typeof url == 'string') {
          Browser.asyncLoad(url, function(byteArray) {
            processData(byteArray);
          }, onerror);
        } else {
          processData(url);
        }
      },indexedDB:function () {
        return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
      },DB_NAME:function () {
        return 'EM_FS_' + window.location.pathname;
      },DB_VERSION:20,DB_STORE_NAME:"FILE_DATA",saveFilesToDB:function (paths, onload, onerror) {
        onload = onload || function(){};
        onerror = onerror || function(){};
        var indexedDB = FS.indexedDB();
        try {
          var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
        } catch (e) {
          return onerror(e);
        }
        openRequest.onupgradeneeded = function openRequest_onupgradeneeded() {
          console.log('creating db');
          var db = openRequest.result;
          db.createObjectStore(FS.DB_STORE_NAME);
        };
        openRequest.onsuccess = function openRequest_onsuccess() {
          var db = openRequest.result;
          var transaction = db.transaction([FS.DB_STORE_NAME], 'readwrite');
          var files = transaction.objectStore(FS.DB_STORE_NAME);
          var ok = 0, fail = 0, total = paths.length;
          function finish() {
            if (fail == 0) onload(); else onerror();
          }
          paths.forEach(function(path) {
            var putRequest = files.put(FS.analyzePath(path).object.contents, path);
            putRequest.onsuccess = function putRequest_onsuccess() { ok++; if (ok + fail == total) finish() };
            putRequest.onerror = function putRequest_onerror() { fail++; if (ok + fail == total) finish() };
          });
          transaction.onerror = onerror;
        };
        openRequest.onerror = onerror;
      },loadFilesFromDB:function (paths, onload, onerror) {
        onload = onload || function(){};
        onerror = onerror || function(){};
        var indexedDB = FS.indexedDB();
        try {
          var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
        } catch (e) {
          return onerror(e);
        }
        openRequest.onupgradeneeded = onerror; // no database to load from
        openRequest.onsuccess = function openRequest_onsuccess() {
          var db = openRequest.result;
          try {
            var transaction = db.transaction([FS.DB_STORE_NAME], 'readonly');
          } catch(e) {
            onerror(e);
            return;
          }
          var files = transaction.objectStore(FS.DB_STORE_NAME);
          var ok = 0, fail = 0, total = paths.length;
          function finish() {
            if (fail == 0) onload(); else onerror();
          }
          paths.forEach(function(path) {
            var getRequest = files.get(path);
            getRequest.onsuccess = function getRequest_onsuccess() {
              if (FS.analyzePath(path).exists) {
                FS.unlink(path);
              }
              FS.createDataFile(PATH.dirname(path), PATH.basename(path), getRequest.result, true, true, true);
              ok++;
              if (ok + fail == total) finish();
            };
            getRequest.onerror = function getRequest_onerror() { fail++; if (ok + fail == total) finish() };
          });
          transaction.onerror = onerror;
        };
        openRequest.onerror = onerror;
      }};var SYSCALLS={DEFAULT_POLLMASK:5,mappings:{},umask:511,calculateAt:function (dirfd, path) {
        if (path[0] !== '/') {
          // relative path
          var dir;
          if (dirfd === -100) {
            dir = FS.cwd();
          } else {
            var dirstream = FS.getStream(dirfd);
            if (!dirstream) throw new FS.ErrnoError(ERRNO_CODES.EBADF);
            dir = dirstream.path;
          }
          path = PATH.join2(dir, path);
        }
        return path;
      },doStat:function (func, path, buf) {
        try {
          var stat = func(path);
        } catch (e) {
          if (e && e.node && PATH.normalize(path) !== PATH.normalize(FS.getPath(e.node))) {
            // an error occurred while trying to look up the path; we should just report ENOTDIR
            return -ERRNO_CODES.ENOTDIR;
          }
          throw e;
        }
        HEAP32[((buf)>>2)]=stat.dev;
        HEAP32[(((buf)+(4))>>2)]=0;
        HEAP32[(((buf)+(8))>>2)]=stat.ino;
        HEAP32[(((buf)+(12))>>2)]=stat.mode;
        HEAP32[(((buf)+(16))>>2)]=stat.nlink;
        HEAP32[(((buf)+(20))>>2)]=stat.uid;
        HEAP32[(((buf)+(24))>>2)]=stat.gid;
        HEAP32[(((buf)+(28))>>2)]=stat.rdev;
        HEAP32[(((buf)+(32))>>2)]=0;
        HEAP32[(((buf)+(36))>>2)]=stat.size;
        HEAP32[(((buf)+(40))>>2)]=4096;
        HEAP32[(((buf)+(44))>>2)]=stat.blocks;
        HEAP32[(((buf)+(48))>>2)]=(stat.atime.getTime() / 1000)|0;
        HEAP32[(((buf)+(52))>>2)]=0;
        HEAP32[(((buf)+(56))>>2)]=(stat.mtime.getTime() / 1000)|0;
        HEAP32[(((buf)+(60))>>2)]=0;
        HEAP32[(((buf)+(64))>>2)]=(stat.ctime.getTime() / 1000)|0;
        HEAP32[(((buf)+(68))>>2)]=0;
        HEAP32[(((buf)+(72))>>2)]=stat.ino;
        return 0;
      },doMsync:function (addr, stream, len, flags) {
        var buffer = new Uint8Array(HEAPU8.subarray(addr, addr + len));
        FS.msync(stream, buffer, 0, len, flags);
      },doMkdir:function (path, mode) {
        // remove a trailing slash, if one - /a/b/ has basename of '', but
        // we want to create b in the context of this function
        path = PATH.normalize(path);
        if (path[path.length-1] === '/') path = path.substr(0, path.length-1);
        FS.mkdir(path, mode, 0);
        return 0;
      },doMknod:function (path, mode, dev) {
        // we don't want this in the JS API as it uses mknod to create all nodes.
        switch (mode & 61440) {
          case 32768:
          case 8192:
          case 24576:
          case 4096:
          case 49152:
            break;
          default: return -ERRNO_CODES.EINVAL;
        }
        FS.mknod(path, mode, dev);
        return 0;
      },doReadlink:function (path, buf, bufsize) {
        if (bufsize <= 0) return -ERRNO_CODES.EINVAL;
        var ret = FS.readlink(path);
        ret = ret.slice(0, Math.max(0, bufsize));
        writeStringToMemory(ret, buf, true);
        return ret.length;
      },doAccess:function (path, amode) {
        if (amode & ~7) {
          // need a valid mode
          return -ERRNO_CODES.EINVAL;
        }
        var node;
        var lookup = FS.lookupPath(path, { follow: true });
        node = lookup.node;
        var perms = '';
        if (amode & 4) perms += 'r';
        if (amode & 2) perms += 'w';
        if (amode & 1) perms += 'x';
        if (perms /* otherwise, they've just passed F_OK */ && FS.nodePermissions(node, perms)) {
          return -ERRNO_CODES.EACCES;
        }
        return 0;
      },doDup:function (path, flags, suggestFD) {
        var suggest = FS.getStream(suggestFD);
        if (suggest) FS.close(suggest);
        return FS.open(path, flags, 0, suggestFD, suggestFD).fd;
      },doReadv:function (stream, iov, iovcnt, offset) {
        var ret = 0;
        for (var i = 0; i < iovcnt; i++) {
          var ptr = HEAP32[(((iov)+(i*8))>>2)];
          var len = HEAP32[(((iov)+(i*8 + 4))>>2)];
          var curr = FS.read(stream, HEAP8,ptr, len, offset);
          if (curr < 0) return -1;
          ret += curr;
          if (curr < len) break; // nothing more to read
        }
        return ret;
      },doWritev:function (stream, iov, iovcnt, offset) {
        var ret = 0;
        for (var i = 0; i < iovcnt; i++) {
          var ptr = HEAP32[(((iov)+(i*8))>>2)];
          var len = HEAP32[(((iov)+(i*8 + 4))>>2)];
          var curr = FS.write(stream, HEAP8,ptr, len, offset);
          if (curr < 0) return -1;
          ret += curr;
        }
        return ret;
      },varargs:0,get:function (varargs) {
        SYSCALLS.varargs += 4;
        var ret = HEAP32[(((SYSCALLS.varargs)-(4))>>2)];
        return ret;
      },getStr:function () {
        var ret = Pointer_stringify(SYSCALLS.get());
        return ret;
      },getStreamFromFD:function () {
        var stream = FS.getStream(SYSCALLS.get());
        if (!stream) throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        return stream;
      },getSocketFromFD:function () {
        var socket = SOCKFS.getSocket(SYSCALLS.get());
        if (!socket) throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        return socket;
      },getSocketAddress:function (allowNull) {
        var addrp = SYSCALLS.get(), addrlen = SYSCALLS.get();
        if (allowNull && addrp === 0) return null;
        var info = __read_sockaddr(addrp, addrlen);
        if (info.errno) throw new FS.ErrnoError(info.errno);
        info.addr = DNS.lookup_addr(info.addr) || info.addr;
        return info;
      },get64:function () {
        var low = SYSCALLS.get(), high = SYSCALLS.get();
        if (low >= 0) assert(high === 0);
        else assert(high === -1);
        return low;
      },getZero:function () {
        assert(SYSCALLS.get() === 0);
      }};function ___syscall63(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // dup2
      var old = SYSCALLS.getStreamFromFD(), suggestFD = SYSCALLS.get();
      if (old.fd === suggestFD) return suggestFD;
      return SYSCALLS.doDup(old.path, old.flags, suggestFD);
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  
  var PROCINFO={ppid:1,pid:42,sid:42,pgid:42};function ___syscall20(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // getpid
      return PROCINFO.pid;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

   
  Module["_memset"] = _memset;

  var _BDtoILow=true;

  function _pthread_mutex_lock() {}

   
  Module["_bitshift64Shl"] = _bitshift64Shl;

  function _abort() {
      Module['abort']();
    }

  function ___assert_fail(condition, filename, line, func) {
      ABORT = true;
      throw 'Assertion failed: ' + Pointer_stringify(condition) + ', at: ' + [filename ? Pointer_stringify(filename) : 'unknown filename', line, func ? Pointer_stringify(func) : 'unknown function'] + ' at ' + stackTrace();
    }

  function ___lock() {}

  function ___unlock() {}

   
  Module["_i64Add"] = _i64Add;

  var _fabs=Math_abs;

  
  function _emscripten_memcpy_big(dest, src, num) {
      HEAPU8.set(HEAPU8.subarray(src, src+num), dest);
      return dest;
    } 
  Module["_memcpy"] = _memcpy;

  
  
  function _emscripten_set_main_loop_timing(mode, value) {
      Browser.mainLoop.timingMode = mode;
      Browser.mainLoop.timingValue = value;
  
      if (!Browser.mainLoop.func) {
        return 1; // Return non-zero on failure, can't set timing mode when there is no main loop.
      }
  
      if (mode == 0 /*EM_TIMING_SETTIMEOUT*/) {
        Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler_setTimeout() {
          setTimeout(Browser.mainLoop.runner, value); // doing this each time means that on exception, we stop
        };
        Browser.mainLoop.method = 'timeout';
      } else if (mode == 1 /*EM_TIMING_RAF*/) {
        Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler_rAF() {
          Browser.requestAnimationFrame(Browser.mainLoop.runner);
        };
        Browser.mainLoop.method = 'rAF';
      } else if (mode == 2 /*EM_TIMING_SETIMMEDIATE*/) {
        if (!window['setImmediate']) {
          // Emulate setImmediate. (note: not a complete polyfill, we don't emulate clearImmediate() to keep code size to minimum, since not needed)
          var setImmediates = [];
          var emscriptenMainLoopMessageId = '__emcc';
          function Browser_setImmediate_messageHandler(event) {
            if (event.source === window && event.data === emscriptenMainLoopMessageId) {
              event.stopPropagation();
              setImmediates.shift()();
            }
          }
          window.addEventListener("message", Browser_setImmediate_messageHandler, true);
          window['setImmediate'] = function Browser_emulated_setImmediate(func) {
            setImmediates.push(func);
            window.postMessage(emscriptenMainLoopMessageId, "*");
          }
        }
        Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler_setImmediate() {
          window['setImmediate'](Browser.mainLoop.runner);
        };
        Browser.mainLoop.method = 'immediate';
      }
      return 0;
    }function _emscripten_set_main_loop(func, fps, simulateInfiniteLoop, arg, noSetTiming) {
      Module['noExitRuntime'] = true;
  
      assert(!Browser.mainLoop.func, 'emscripten_set_main_loop: there can only be one main loop function at once: call emscripten_cancel_main_loop to cancel the previous one before setting a new one with different parameters.');
  
      Browser.mainLoop.func = func;
      Browser.mainLoop.arg = arg;
  
      var thisMainLoopId = Browser.mainLoop.currentlyRunningMainloop;
  
      Browser.mainLoop.runner = function Browser_mainLoop_runner() {
        if (ABORT) return;
        if (Browser.mainLoop.queue.length > 0) {
          var start = Date.now();
          var blocker = Browser.mainLoop.queue.shift();
          blocker.func(blocker.arg);
          if (Browser.mainLoop.remainingBlockers) {
            var remaining = Browser.mainLoop.remainingBlockers;
            var next = remaining%1 == 0 ? remaining-1 : Math.floor(remaining);
            if (blocker.counted) {
              Browser.mainLoop.remainingBlockers = next;
            } else {
              // not counted, but move the progress along a tiny bit
              next = next + 0.5; // do not steal all the next one's progress
              Browser.mainLoop.remainingBlockers = (8*remaining + next)/9;
            }
          }
          console.log('main loop blocker "' + blocker.name + '" took ' + (Date.now() - start) + ' ms'); //, left: ' + Browser.mainLoop.remainingBlockers);
          Browser.mainLoop.updateStatus();
          setTimeout(Browser.mainLoop.runner, 0);
          return;
        }
  
        // catch pauses from non-main loop sources
        if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) return;
  
        // Implement very basic swap interval control
        Browser.mainLoop.currentFrameNumber = Browser.mainLoop.currentFrameNumber + 1 | 0;
        if (Browser.mainLoop.timingMode == 1/*EM_TIMING_RAF*/ && Browser.mainLoop.timingValue > 1 && Browser.mainLoop.currentFrameNumber % Browser.mainLoop.timingValue != 0) {
          // Not the scheduled time to render this frame - skip.
          Browser.mainLoop.scheduler();
          return;
        }
  
        // Signal GL rendering layer that processing of a new frame is about to start. This helps it optimize
        // VBO double-buffering and reduce GPU stalls.
  
        if (Browser.mainLoop.method === 'timeout' && Module.ctx) {
          Module.printErr('Looks like you are rendering without using requestAnimationFrame for the main loop. You should use 0 for the frame rate in emscripten_set_main_loop in order to use requestAnimationFrame, as that can greatly improve your frame rates!');
          Browser.mainLoop.method = ''; // just warn once per call to set main loop
        }
  
        Browser.mainLoop.runIter(function() {
          if (typeof arg !== 'undefined') {
            Runtime.dynCall('vi', func, [arg]);
          } else {
            Runtime.dynCall('v', func);
          }
        });
  
        // catch pauses from the main loop itself
        if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) return;
  
        // Queue new audio data. This is important to be right after the main loop invocation, so that we will immediately be able
        // to queue the newest produced audio samples.
        // TODO: Consider adding pre- and post- rAF callbacks so that GL.newRenderingFrameStarted() and SDL.audio.queueNewAudioData()
        //       do not need to be hardcoded into this function, but can be more generic.
        if (typeof SDL === 'object' && SDL.audio && SDL.audio.queueNewAudioData) SDL.audio.queueNewAudioData();
  
        Browser.mainLoop.scheduler();
      }
  
      if (!noSetTiming) {
        if (fps && fps > 0) _emscripten_set_main_loop_timing(0/*EM_TIMING_SETTIMEOUT*/, 1000.0 / fps);
        else _emscripten_set_main_loop_timing(1/*EM_TIMING_RAF*/, 1); // Do rAF by rendering each frame (no decimating)
  
        Browser.mainLoop.scheduler();
      }
  
      if (simulateInfiniteLoop) {
        throw 'SimulateInfiniteLoop';
      }
    }var Browser={mainLoop:{scheduler:null,method:"",currentlyRunningMainloop:0,func:null,arg:0,timingMode:0,timingValue:0,currentFrameNumber:0,queue:[],pause:function () {
          Browser.mainLoop.scheduler = null;
          Browser.mainLoop.currentlyRunningMainloop++; // Incrementing this signals the previous main loop that it's now become old, and it must return.
        },resume:function () {
          Browser.mainLoop.currentlyRunningMainloop++;
          var timingMode = Browser.mainLoop.timingMode;
          var timingValue = Browser.mainLoop.timingValue;
          var func = Browser.mainLoop.func;
          Browser.mainLoop.func = null;
          _emscripten_set_main_loop(func, 0, false, Browser.mainLoop.arg, true /* do not set timing and call scheduler, we will do it on the next lines */);
          _emscripten_set_main_loop_timing(timingMode, timingValue);
          Browser.mainLoop.scheduler();
        },updateStatus:function () {
          if (Module['setStatus']) {
            var message = Module['statusMessage'] || 'Please wait...';
            var remaining = Browser.mainLoop.remainingBlockers;
            var expected = Browser.mainLoop.expectedBlockers;
            if (remaining) {
              if (remaining < expected) {
                Module['setStatus'](message + ' (' + (expected - remaining) + '/' + expected + ')');
              } else {
                Module['setStatus'](message);
              }
            } else {
              Module['setStatus']('');
            }
          }
        },runIter:function (func) {
          if (ABORT) return;
          if (Module['preMainLoop']) {
            var preRet = Module['preMainLoop']();
            if (preRet === false) {
              return; // |return false| skips a frame
            }
          }
          try {
            func();
          } catch (e) {
            if (e instanceof ExitStatus) {
              return;
            } else {
              if (e && typeof e === 'object' && e.stack) Module.printErr('exception thrown: ' + [e, e.stack]);
              throw e;
            }
          }
          if (Module['postMainLoop']) Module['postMainLoop']();
        }},isFullScreen:false,pointerLock:false,moduleContextCreatedCallbacks:[],workers:[],init:function () {
        if (!Module["preloadPlugins"]) Module["preloadPlugins"] = []; // needs to exist even in workers
  
        if (Browser.initted) return;
        Browser.initted = true;
  
        try {
          new Blob();
          Browser.hasBlobConstructor = true;
        } catch(e) {
          Browser.hasBlobConstructor = false;
          console.log("warning: no blob constructor, cannot create blobs with mimetypes");
        }
        Browser.BlobBuilder = typeof MozBlobBuilder != "undefined" ? MozBlobBuilder : (typeof WebKitBlobBuilder != "undefined" ? WebKitBlobBuilder : (!Browser.hasBlobConstructor ? console.log("warning: no BlobBuilder") : null));
        Browser.URLObject = typeof window != "undefined" ? (window.URL ? window.URL : window.webkitURL) : undefined;
        if (!Module.noImageDecoding && typeof Browser.URLObject === 'undefined') {
          console.log("warning: Browser does not support creating object URLs. Built-in browser image decoding will not be available.");
          Module.noImageDecoding = true;
        }
  
        // Support for plugins that can process preloaded files. You can add more of these to
        // your app by creating and appending to Module.preloadPlugins.
        //
        // Each plugin is asked if it can handle a file based on the file's name. If it can,
        // it is given the file's raw data. When it is done, it calls a callback with the file's
        // (possibly modified) data. For example, a plugin might decompress a file, or it
        // might create some side data structure for use later (like an Image element, etc.).
  
        var imagePlugin = {};
        imagePlugin['canHandle'] = function imagePlugin_canHandle(name) {
          return !Module.noImageDecoding && /\.(jpg|jpeg|png|bmp)$/i.test(name);
        };
        imagePlugin['handle'] = function imagePlugin_handle(byteArray, name, onload, onerror) {
          var b = null;
          if (Browser.hasBlobConstructor) {
            try {
              b = new Blob([byteArray], { type: Browser.getMimetype(name) });
              if (b.size !== byteArray.length) { // Safari bug #118630
                // Safari's Blob can only take an ArrayBuffer
                b = new Blob([(new Uint8Array(byteArray)).buffer], { type: Browser.getMimetype(name) });
              }
            } catch(e) {
              Runtime.warnOnce('Blob constructor present but fails: ' + e + '; falling back to blob builder');
            }
          }
          if (!b) {
            var bb = new Browser.BlobBuilder();
            bb.append((new Uint8Array(byteArray)).buffer); // we need to pass a buffer, and must copy the array to get the right data range
            b = bb.getBlob();
          }
          var url = Browser.URLObject.createObjectURL(b);
          var img = new Image();
          img.onload = function img_onload() {
            assert(img.complete, 'Image ' + name + ' could not be decoded');
            var canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            Module["preloadedImages"][name] = canvas;
            Browser.URLObject.revokeObjectURL(url);
            if (onload) onload(byteArray);
          };
          img.onerror = function img_onerror(event) {
            console.log('Image ' + url + ' could not be decoded');
            if (onerror) onerror();
          };
          img.src = url;
        };
        Module['preloadPlugins'].push(imagePlugin);
  
        var audioPlugin = {};
        audioPlugin['canHandle'] = function audioPlugin_canHandle(name) {
          return !Module.noAudioDecoding && name.substr(-4) in { '.ogg': 1, '.wav': 1, '.mp3': 1 };
        };
        audioPlugin['handle'] = function audioPlugin_handle(byteArray, name, onload, onerror) {
          var done = false;
          function finish(audio) {
            if (done) return;
            done = true;
            Module["preloadedAudios"][name] = audio;
            if (onload) onload(byteArray);
          }
          function fail() {
            if (done) return;
            done = true;
            Module["preloadedAudios"][name] = new Audio(); // empty shim
            if (onerror) onerror();
          }
          if (Browser.hasBlobConstructor) {
            try {
              var b = new Blob([byteArray], { type: Browser.getMimetype(name) });
            } catch(e) {
              return fail();
            }
            var url = Browser.URLObject.createObjectURL(b); // XXX we never revoke this!
            var audio = new Audio();
            audio.addEventListener('canplaythrough', function() { finish(audio) }, false); // use addEventListener due to chromium bug 124926
            audio.onerror = function audio_onerror(event) {
              if (done) return;
              console.log('warning: browser could not fully decode audio ' + name + ', trying slower base64 approach');
              function encode64(data) {
                var BASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
                var PAD = '=';
                var ret = '';
                var leftchar = 0;
                var leftbits = 0;
                for (var i = 0; i < data.length; i++) {
                  leftchar = (leftchar << 8) | data[i];
                  leftbits += 8;
                  while (leftbits >= 6) {
                    var curr = (leftchar >> (leftbits-6)) & 0x3f;
                    leftbits -= 6;
                    ret += BASE[curr];
                  }
                }
                if (leftbits == 2) {
                  ret += BASE[(leftchar&3) << 4];
                  ret += PAD + PAD;
                } else if (leftbits == 4) {
                  ret += BASE[(leftchar&0xf) << 2];
                  ret += PAD;
                }
                return ret;
              }
              audio.src = 'data:audio/x-' + name.substr(-3) + ';base64,' + encode64(byteArray);
              finish(audio); // we don't wait for confirmation this worked - but it's worth trying
            };
            audio.src = url;
            // workaround for chrome bug 124926 - we do not always get oncanplaythrough or onerror
            Browser.safeSetTimeout(function() {
              finish(audio); // try to use it even though it is not necessarily ready to play
            }, 10000);
          } else {
            return fail();
          }
        };
        Module['preloadPlugins'].push(audioPlugin);
  
        // Canvas event setup
  
        var canvas = Module['canvas'];
        function pointerLockChange() {
          Browser.pointerLock = document['pointerLockElement'] === canvas ||
                                document['mozPointerLockElement'] === canvas ||
                                document['webkitPointerLockElement'] === canvas ||
                                document['msPointerLockElement'] === canvas;
        }
        if (canvas) {
          // forced aspect ratio can be enabled by defining 'forcedAspectRatio' on Module
          // Module['forcedAspectRatio'] = 4 / 3;
          
          canvas.requestPointerLock = canvas['requestPointerLock'] ||
                                      canvas['mozRequestPointerLock'] ||
                                      canvas['webkitRequestPointerLock'] ||
                                      canvas['msRequestPointerLock'] ||
                                      function(){};
          canvas.exitPointerLock = document['exitPointerLock'] ||
                                   document['mozExitPointerLock'] ||
                                   document['webkitExitPointerLock'] ||
                                   document['msExitPointerLock'] ||
                                   function(){}; // no-op if function does not exist
          canvas.exitPointerLock = canvas.exitPointerLock.bind(document);
  
  
          document.addEventListener('pointerlockchange', pointerLockChange, false);
          document.addEventListener('mozpointerlockchange', pointerLockChange, false);
          document.addEventListener('webkitpointerlockchange', pointerLockChange, false);
          document.addEventListener('mspointerlockchange', pointerLockChange, false);
  
          if (Module['elementPointerLock']) {
            canvas.addEventListener("click", function(ev) {
              if (!Browser.pointerLock && canvas.requestPointerLock) {
                canvas.requestPointerLock();
                ev.preventDefault();
              }
            }, false);
          }
        }
      },createContext:function (canvas, useWebGL, setInModule, webGLContextAttributes) {
        if (useWebGL && Module.ctx && canvas == Module.canvas) return Module.ctx; // no need to recreate GL context if it's already been created for this canvas.
  
        var ctx;
        var contextHandle;
        if (useWebGL) {
          // For GLES2/desktop GL compatibility, adjust a few defaults to be different to WebGL defaults, so that they align better with the desktop defaults.
          var contextAttributes = {
            antialias: false,
            alpha: false
          };
  
          if (webGLContextAttributes) {
            for (var attribute in webGLContextAttributes) {
              contextAttributes[attribute] = webGLContextAttributes[attribute];
            }
          }
  
          contextHandle = GL.createContext(canvas, contextAttributes);
          if (contextHandle) {
            ctx = GL.getContext(contextHandle).GLctx;
          }
          // Set the background of the WebGL canvas to black
          canvas.style.backgroundColor = "black";
        } else {
          ctx = canvas.getContext('2d');
        }
  
        if (!ctx) return null;
  
        if (setInModule) {
          if (!useWebGL) assert(typeof GLctx === 'undefined', 'cannot set in module if GLctx is used, but we are a non-GL context that would replace it');
  
          Module.ctx = ctx;
          if (useWebGL) GL.makeContextCurrent(contextHandle);
          Module.useWebGL = useWebGL;
          Browser.moduleContextCreatedCallbacks.forEach(function(callback) { callback() });
          Browser.init();
        }
        return ctx;
      },destroyContext:function (canvas, useWebGL, setInModule) {},fullScreenHandlersInstalled:false,lockPointer:undefined,resizeCanvas:undefined,requestFullScreen:function (lockPointer, resizeCanvas, vrDevice) {
        Browser.lockPointer = lockPointer;
        Browser.resizeCanvas = resizeCanvas;
        Browser.vrDevice = vrDevice;
        if (typeof Browser.lockPointer === 'undefined') Browser.lockPointer = true;
        if (typeof Browser.resizeCanvas === 'undefined') Browser.resizeCanvas = false;
        if (typeof Browser.vrDevice === 'undefined') Browser.vrDevice = null;
  
        var canvas = Module['canvas'];
        function fullScreenChange() {
          Browser.isFullScreen = false;
          var canvasContainer = canvas.parentNode;
          if ((document['webkitFullScreenElement'] || document['webkitFullscreenElement'] ||
               document['mozFullScreenElement'] || document['mozFullscreenElement'] ||
               document['fullScreenElement'] || document['fullscreenElement'] ||
               document['msFullScreenElement'] || document['msFullscreenElement'] ||
               document['webkitCurrentFullScreenElement']) === canvasContainer) {
            canvas.cancelFullScreen = document['cancelFullScreen'] ||
                                      document['mozCancelFullScreen'] ||
                                      document['webkitCancelFullScreen'] ||
                                      document['msExitFullscreen'] ||
                                      document['exitFullscreen'] ||
                                      function() {};
            canvas.cancelFullScreen = canvas.cancelFullScreen.bind(document);
            if (Browser.lockPointer) canvas.requestPointerLock();
            Browser.isFullScreen = true;
            if (Browser.resizeCanvas) Browser.setFullScreenCanvasSize();
          } else {
            
            // remove the full screen specific parent of the canvas again to restore the HTML structure from before going full screen
            canvasContainer.parentNode.insertBefore(canvas, canvasContainer);
            canvasContainer.parentNode.removeChild(canvasContainer);
            
            if (Browser.resizeCanvas) Browser.setWindowedCanvasSize();
          }
          if (Module['onFullScreen']) Module['onFullScreen'](Browser.isFullScreen);
          Browser.updateCanvasDimensions(canvas);
        }
  
        if (!Browser.fullScreenHandlersInstalled) {
          Browser.fullScreenHandlersInstalled = true;
          document.addEventListener('fullscreenchange', fullScreenChange, false);
          document.addEventListener('mozfullscreenchange', fullScreenChange, false);
          document.addEventListener('webkitfullscreenchange', fullScreenChange, false);
          document.addEventListener('MSFullscreenChange', fullScreenChange, false);
        }
  
        // create a new parent to ensure the canvas has no siblings. this allows browsers to optimize full screen performance when its parent is the full screen root
        var canvasContainer = document.createElement("div");
        canvas.parentNode.insertBefore(canvasContainer, canvas);
        canvasContainer.appendChild(canvas);
  
        // use parent of canvas as full screen root to allow aspect ratio correction (Firefox stretches the root to screen size)
        canvasContainer.requestFullScreen = canvasContainer['requestFullScreen'] ||
                                            canvasContainer['mozRequestFullScreen'] ||
                                            canvasContainer['msRequestFullscreen'] ||
                                           (canvasContainer['webkitRequestFullScreen'] ? function() { canvasContainer['webkitRequestFullScreen'](Element['ALLOW_KEYBOARD_INPUT']) } : null);
  
        if (vrDevice) {
          canvasContainer.requestFullScreen({ vrDisplay: vrDevice });
        } else {
          canvasContainer.requestFullScreen();
        }
      },nextRAF:0,fakeRequestAnimationFrame:function (func) {
        // try to keep 60fps between calls to here
        var now = Date.now();
        if (Browser.nextRAF === 0) {
          Browser.nextRAF = now + 1000/60;
        } else {
          while (now + 2 >= Browser.nextRAF) { // fudge a little, to avoid timer jitter causing us to do lots of delay:0
            Browser.nextRAF += 1000/60;
          }
        }
        var delay = Math.max(Browser.nextRAF - now, 0);
        setTimeout(func, delay);
      },requestAnimationFrame:function requestAnimationFrame(func) {
        if (typeof window === 'undefined') { // Provide fallback to setTimeout if window is undefined (e.g. in Node.js)
          Browser.fakeRequestAnimationFrame(func);
        } else {
          if (!window.requestAnimationFrame) {
            window.requestAnimationFrame = window['requestAnimationFrame'] ||
                                           window['mozRequestAnimationFrame'] ||
                                           window['webkitRequestAnimationFrame'] ||
                                           window['msRequestAnimationFrame'] ||
                                           window['oRequestAnimationFrame'] ||
                                           Browser.fakeRequestAnimationFrame;
          }
          window.requestAnimationFrame(func);
        }
      },safeCallback:function (func) {
        return function() {
          if (!ABORT) return func.apply(null, arguments);
        };
      },allowAsyncCallbacks:true,queuedAsyncCallbacks:[],pauseAsyncCallbacks:function () {
        Browser.allowAsyncCallbacks = false;
      },resumeAsyncCallbacks:function () { // marks future callbacks as ok to execute, and synchronously runs any remaining ones right now
        Browser.allowAsyncCallbacks = true;
        if (Browser.queuedAsyncCallbacks.length > 0) {
          var callbacks = Browser.queuedAsyncCallbacks;
          Browser.queuedAsyncCallbacks = [];
          callbacks.forEach(function(func) {
            func();
          });
        }
      },safeRequestAnimationFrame:function (func) {
        return Browser.requestAnimationFrame(function() {
          if (ABORT) return;
          if (Browser.allowAsyncCallbacks) {
            func();
          } else {
            Browser.queuedAsyncCallbacks.push(func);
          }
        });
      },safeSetTimeout:function (func, timeout) {
        Module['noExitRuntime'] = true;
        return setTimeout(function() {
          if (ABORT) return;
          if (Browser.allowAsyncCallbacks) {
            func();
          } else {
            Browser.queuedAsyncCallbacks.push(func);
          }
        }, timeout);
      },safeSetInterval:function (func, timeout) {
        Module['noExitRuntime'] = true;
        return setInterval(function() {
          if (ABORT) return;
          if (Browser.allowAsyncCallbacks) {
            func();
          } // drop it on the floor otherwise, next interval will kick in
        }, timeout);
      },getMimetype:function (name) {
        return {
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'bmp': 'image/bmp',
          'ogg': 'audio/ogg',
          'wav': 'audio/wav',
          'mp3': 'audio/mpeg'
        }[name.substr(name.lastIndexOf('.')+1)];
      },getUserMedia:function (func) {
        if(!window.getUserMedia) {
          window.getUserMedia = navigator['getUserMedia'] ||
                                navigator['mozGetUserMedia'];
        }
        window.getUserMedia(func);
      },getMovementX:function (event) {
        return event['movementX'] ||
               event['mozMovementX'] ||
               event['webkitMovementX'] ||
               0;
      },getMovementY:function (event) {
        return event['movementY'] ||
               event['mozMovementY'] ||
               event['webkitMovementY'] ||
               0;
      },getMouseWheelDelta:function (event) {
        var delta = 0;
        switch (event.type) {
          case 'DOMMouseScroll': 
            delta = event.detail;
            break;
          case 'mousewheel': 
            delta = event.wheelDelta;
            break;
          case 'wheel': 
            delta = event['deltaY'];
            break;
          default:
            throw 'unrecognized mouse wheel event: ' + event.type;
        }
        return delta;
      },mouseX:0,mouseY:0,mouseMovementX:0,mouseMovementY:0,touches:{},lastTouches:{},calculateMouseEvent:function (event) { // event should be mousemove, mousedown or mouseup
        if (Browser.pointerLock) {
          // When the pointer is locked, calculate the coordinates
          // based on the movement of the mouse.
          // Workaround for Firefox bug 764498
          if (event.type != 'mousemove' &&
              ('mozMovementX' in event)) {
            Browser.mouseMovementX = Browser.mouseMovementY = 0;
          } else {
            Browser.mouseMovementX = Browser.getMovementX(event);
            Browser.mouseMovementY = Browser.getMovementY(event);
          }
          
          // check if SDL is available
          if (typeof SDL != "undefined") {
          	Browser.mouseX = SDL.mouseX + Browser.mouseMovementX;
          	Browser.mouseY = SDL.mouseY + Browser.mouseMovementY;
          } else {
          	// just add the mouse delta to the current absolut mouse position
          	// FIXME: ideally this should be clamped against the canvas size and zero
          	Browser.mouseX += Browser.mouseMovementX;
          	Browser.mouseY += Browser.mouseMovementY;
          }        
        } else {
          // Otherwise, calculate the movement based on the changes
          // in the coordinates.
          var rect = Module["canvas"].getBoundingClientRect();
          var cw = Module["canvas"].width;
          var ch = Module["canvas"].height;
  
          // Neither .scrollX or .pageXOffset are defined in a spec, but
          // we prefer .scrollX because it is currently in a spec draft.
          // (see: http://www.w3.org/TR/2013/WD-cssom-view-20131217/)
          var scrollX = ((typeof window.scrollX !== 'undefined') ? window.scrollX : window.pageXOffset);
          var scrollY = ((typeof window.scrollY !== 'undefined') ? window.scrollY : window.pageYOffset);
  
          if (event.type === 'touchstart' || event.type === 'touchend' || event.type === 'touchmove') {
            var touch = event.touch;
            if (touch === undefined) {
              return; // the "touch" property is only defined in SDL
  
            }
            var adjustedX = touch.pageX - (scrollX + rect.left);
            var adjustedY = touch.pageY - (scrollY + rect.top);
  
            adjustedX = adjustedX * (cw / rect.width);
            adjustedY = adjustedY * (ch / rect.height);
  
            var coords = { x: adjustedX, y: adjustedY };
            
            if (event.type === 'touchstart') {
              Browser.lastTouches[touch.identifier] = coords;
              Browser.touches[touch.identifier] = coords;
            } else if (event.type === 'touchend' || event.type === 'touchmove') {
              var last = Browser.touches[touch.identifier];
              if (!last) last = coords;
              Browser.lastTouches[touch.identifier] = last;
              Browser.touches[touch.identifier] = coords;
            } 
            return;
          }
  
          var x = event.pageX - (scrollX + rect.left);
          var y = event.pageY - (scrollY + rect.top);
  
          // the canvas might be CSS-scaled compared to its backbuffer;
          // SDL-using content will want mouse coordinates in terms
          // of backbuffer units.
          x = x * (cw / rect.width);
          y = y * (ch / rect.height);
  
          Browser.mouseMovementX = x - Browser.mouseX;
          Browser.mouseMovementY = y - Browser.mouseY;
          Browser.mouseX = x;
          Browser.mouseY = y;
        }
      },xhrLoad:function (url, onload, onerror) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function xhr_onload() {
          if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) { // file URLs can return 0
            onload(xhr.response);
          } else {
            onerror();
          }
        };
        xhr.onerror = onerror;
        xhr.send(null);
      },asyncLoad:function (url, onload, onerror, noRunDep) {
        Browser.xhrLoad(url, function(arrayBuffer) {
          assert(arrayBuffer, 'Loading data file "' + url + '" failed (no arrayBuffer).');
          onload(new Uint8Array(arrayBuffer));
          if (!noRunDep) removeRunDependency('al ' + url);
        }, function(event) {
          if (onerror) {
            onerror();
          } else {
            throw 'Loading data file "' + url + '" failed.';
          }
        });
        if (!noRunDep) addRunDependency('al ' + url);
      },resizeListeners:[],updateResizeListeners:function () {
        var canvas = Module['canvas'];
        Browser.resizeListeners.forEach(function(listener) {
          listener(canvas.width, canvas.height);
        });
      },setCanvasSize:function (width, height, noUpdates) {
        var canvas = Module['canvas'];
        Browser.updateCanvasDimensions(canvas, width, height);
        if (!noUpdates) Browser.updateResizeListeners();
      },windowedWidth:0,windowedHeight:0,setFullScreenCanvasSize:function () {
        // check if SDL is available   
        if (typeof SDL != "undefined") {
        	var flags = HEAPU32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)];
        	flags = flags | 0x00800000; // set SDL_FULLSCREEN flag
        	HEAP32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)]=flags
        }
        Browser.updateResizeListeners();
      },setWindowedCanvasSize:function () {
        // check if SDL is available       
        if (typeof SDL != "undefined") {
        	var flags = HEAPU32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)];
        	flags = flags & ~0x00800000; // clear SDL_FULLSCREEN flag
        	HEAP32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)]=flags
        }
        Browser.updateResizeListeners();
      },updateCanvasDimensions:function (canvas, wNative, hNative) {
        if (wNative && hNative) {
          canvas.widthNative = wNative;
          canvas.heightNative = hNative;
        } else {
          wNative = canvas.widthNative;
          hNative = canvas.heightNative;
        }
        var w = wNative;
        var h = hNative;
        if (Module['forcedAspectRatio'] && Module['forcedAspectRatio'] > 0) {
          if (w/h < Module['forcedAspectRatio']) {
            w = Math.round(h * Module['forcedAspectRatio']);
          } else {
            h = Math.round(w / Module['forcedAspectRatio']);
          }
        }
        if (((document['webkitFullScreenElement'] || document['webkitFullscreenElement'] ||
             document['mozFullScreenElement'] || document['mozFullscreenElement'] ||
             document['fullScreenElement'] || document['fullscreenElement'] ||
             document['msFullScreenElement'] || document['msFullscreenElement'] ||
             document['webkitCurrentFullScreenElement']) === canvas.parentNode) && (typeof screen != 'undefined')) {
           var factor = Math.min(screen.width / w, screen.height / h);
           w = Math.round(w * factor);
           h = Math.round(h * factor);
        }
        if (Browser.resizeCanvas) {
          if (canvas.width  != w) canvas.width  = w;
          if (canvas.height != h) canvas.height = h;
          if (typeof canvas.style != 'undefined') {
            canvas.style.removeProperty( "width");
            canvas.style.removeProperty("height");
          }
        } else {
          if (canvas.width  != wNative) canvas.width  = wNative;
          if (canvas.height != hNative) canvas.height = hNative;
          if (typeof canvas.style != 'undefined') {
            if (w != wNative || h != hNative) {
              canvas.style.setProperty( "width", w + "px", "important");
              canvas.style.setProperty("height", h + "px", "important");
            } else {
              canvas.style.removeProperty( "width");
              canvas.style.removeProperty("height");
            }
          }
        }
      },wgetRequests:{},nextWgetRequestHandle:0,getNextWgetRequestHandle:function () {
        var handle = Browser.nextWgetRequestHandle;
        Browser.nextWgetRequestHandle++;
        return handle;
      }};

  
  function __exit(status) {
      // void _exit(int status);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/exit.html
      Module['exit'](status);
    }function _exit(status) {
      __exit(status);
    }

  
  function _wait(stat_loc) {
      // pid_t wait(int *stat_loc);
      // http://pubs.opengroup.org/onlinepubs/009695399/functions/wait.html
      // Makes no sense in a single-process environment.
      ___setErrNo(ERRNO_CODES.ECHILD);
      return -1;
    }function _waitpid() {
  return _wait.apply(null, arguments)
  }

  function ___syscall57(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // setpgid
      var pid = SYSCALLS.get(), pgid = SYSCALLS.get();
      if (pid && pid !== PROCINFO.pid) return -ERRNO_CODES.ESRCH;
      if (pgid && pgid !== PROCINFO.pgid) return -ERRNO_CODES.EPERM;
      return 0;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function _fork() {
      // pid_t fork(void);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fork.html
      // We don't support multiple processes.
      ___setErrNo(ERRNO_CODES.EAGAIN);
      return -1;
    }

   
  Module["_bitshift64Lshr"] = _bitshift64Lshr;

  
  function _execl(/* ... */) {
      // int execl(const char *path, const char *arg0, ... /*, (char *)0 */);
      // http://pubs.opengroup.org/onlinepubs/009695399/functions/exec.html
      // We don't support executing external code.
      ___setErrNo(ERRNO_CODES.ENOEXEC);
      return -1;
    }function _execvp() {
  return _execl.apply(null, arguments)
  }

  var _BDtoIHigh=true;

  function _pthread_cleanup_push(routine, arg) {
      __ATEXIT__.push(function() { Runtime.dynCall('vi', routine, [arg]) })
      _pthread_cleanup_push.level = __ATEXIT__.length;
    }

  
  
  
  
  var _environ=allocate(1, "i32*", ALLOC_STATIC);var ___environ=_environ;function ___buildEnvironment(env) {
      // WARNING: Arbitrary limit!
      var MAX_ENV_VALUES = 64;
      var TOTAL_ENV_SIZE = 1024;
  
      // Statically allocate memory for the environment.
      var poolPtr;
      var envPtr;
      if (!___buildEnvironment.called) {
        ___buildEnvironment.called = true;
        // Set default values. Use string keys for Closure Compiler compatibility.
        ENV['USER'] = ENV['LOGNAME'] = 'web_user';
        ENV['PATH'] = '/';
        ENV['PWD'] = '/';
        ENV['HOME'] = '/home/web_user';
        ENV['LANG'] = 'C';
        ENV['_'] = Module['thisProgram'];
        // Allocate memory.
        poolPtr = allocate(TOTAL_ENV_SIZE, 'i8', ALLOC_STATIC);
        envPtr = allocate(MAX_ENV_VALUES * 4,
                          'i8*', ALLOC_STATIC);
        HEAP32[((envPtr)>>2)]=poolPtr;
        HEAP32[((_environ)>>2)]=envPtr;
      } else {
        envPtr = HEAP32[((_environ)>>2)];
        poolPtr = HEAP32[((envPtr)>>2)];
      }
  
      // Collect key=value lines.
      var strings = [];
      var totalSize = 0;
      for (var key in env) {
        if (typeof env[key] === 'string') {
          var line = key + '=' + env[key];
          strings.push(line);
          totalSize += line.length;
        }
      }
      if (totalSize > TOTAL_ENV_SIZE) {
        throw new Error('Environment size exceeded TOTAL_ENV_SIZE!');
      }
  
      // Make new.
      var ptrSize = 4;
      for (var i = 0; i < strings.length; i++) {
        var line = strings[i];
        writeAsciiToMemory(line, poolPtr);
        HEAP32[(((envPtr)+(i * ptrSize))>>2)]=poolPtr;
        poolPtr += line.length + 1;
      }
      HEAP32[(((envPtr)+(strings.length * ptrSize))>>2)]=0;
    }var ENV={};function _getenv(name) {
      // char *getenv(const char *name);
      // http://pubs.opengroup.org/onlinepubs/009695399/functions/getenv.html
      if (name === 0) return 0;
      name = Pointer_stringify(name);
      if (!ENV.hasOwnProperty(name)) return 0;
  
      if (_getenv.ret) _free(_getenv.ret);
      _getenv.ret = allocate(intArrayFromString(ENV[name]), 'i8', ALLOC_NORMAL);
      return _getenv.ret;
    }

  function _pthread_cleanup_pop() {
      assert(_pthread_cleanup_push.level == __ATEXIT__.length, 'cannot pop if something else added meanwhile!');
      __ATEXIT__.pop();
      _pthread_cleanup_push.level = __ATEXIT__.length;
    }

  function _pthread_mutex_unlock() {}

  function ___syscall3(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // read
      var stream = SYSCALLS.getStreamFromFD(), buf = SYSCALLS.get(), count = SYSCALLS.get();
      return FS.read(stream, HEAP8,buf, count);
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function ___syscall5(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // open
      var pathname = SYSCALLS.getStr(), flags = SYSCALLS.get(), mode = SYSCALLS.get() // optional TODO
      var stream = FS.open(pathname, flags, mode);
      return stream.fd;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function ___syscall4(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // write
      var stream = SYSCALLS.getStreamFromFD(), buf = SYSCALLS.get(), count = SYSCALLS.get();
      return FS.write(stream, HEAP8,buf, count);
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function ___syscall6(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // close
      var stream = SYSCALLS.getStreamFromFD();
      FS.close(stream);
      return 0;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function _sbrk(bytes) {
      // Implement a Linux-like 'memory area' for our 'process'.
      // Changes the size of the memory area by |bytes|; returns the
      // address of the previous top ('break') of the memory area
      // We control the "dynamic" memory - DYNAMIC_BASE to DYNAMICTOP
      var self = _sbrk;
      if (!self.called) {
        DYNAMICTOP = alignMemoryPage(DYNAMICTOP); // make sure we start out aligned
        self.called = true;
        assert(Runtime.dynamicAlloc);
        self.alloc = Runtime.dynamicAlloc;
        Runtime.dynamicAlloc = function() { abort('cannot dynamically allocate, sbrk now has control') };
      }
      var ret = DYNAMICTOP;
      if (bytes != 0) {
        var success = self.alloc(bytes);
        if (!success) return -1 >>> 0; // sbrk failure code
      }
      return ret;  // Previous break location.
    }

   
  Module["_memmove"] = _memmove;

  function ___syscall146(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // writev
      var stream = SYSCALLS.getStreamFromFD(), iov = SYSCALLS.get(), iovcnt = SYSCALLS.get();
      return SYSCALLS.doWritev(stream, iov, iovcnt);
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  
  var __sigalrm_handler=0;function _signal(sig, func) {
      if (sig == 14 /*SIGALRM*/) {
        __sigalrm_handler = func;
      } else {
      }
      return 0;
    }

  var _BItoD=true;

  function ___syscall54(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // ioctl
      var stream = SYSCALLS.getStreamFromFD(), op = SYSCALLS.get();
      switch (op) {
        case 21505: {
          if (!stream.tty) return -ERRNO_CODES.ENOTTY;
          return 0;
        }
        case 21506: {
          if (!stream.tty) return -ERRNO_CODES.ENOTTY;
          return 0; // no-op, not actually adjusting terminal settings
        }
        case 21519: {
          if (!stream.tty) return -ERRNO_CODES.ENOTTY;
          var argp = SYSCALLS.get();
          HEAP32[((argp)>>2)]=0;
          return 0;
        }
        case 21520: {
          if (!stream.tty) return -ERRNO_CODES.ENOTTY;
          return -ERRNO_CODES.EINVAL; // not supported
        }
        case 21531: {
          var argp = SYSCALLS.get();
          return FS.ioctl(stream, op, argp);
        }
        default: abort('bad ioctl syscall ' + op);
      }
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

   
  Module["_llvm_bswap_i32"] = _llvm_bswap_i32;

  function _time(ptr) {
      var ret = (Date.now()/1000)|0;
      if (ptr) {
        HEAP32[((ptr)>>2)]=ret;
      }
      return ret;
    }

  function _pthread_self() {
      //FIXME: assumes only a single thread
      return 0;
    }

  function ___syscall140(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // llseek
      var stream = SYSCALLS.getStreamFromFD(), offset_high = SYSCALLS.get(), offset_low = SYSCALLS.get(), result = SYSCALLS.get(), whence = SYSCALLS.get();
      var offset = offset_low;
      assert(offset_high === 0);
      FS.llseek(stream, offset, whence);
      HEAP32[((result)>>2)]=stream.position;
      if (stream.getdents && offset === 0 && whence === 0) stream.getdents = null; // reset readdir state
      return 0;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  
  function ___syscall51(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // acct
      return -ERRNO_CODES.ENOSYS; // unsupported features
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }function ___syscall42() {
  return ___syscall51.apply(null, arguments)
  }

  function ___syscall221(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // fcntl64
      var stream = SYSCALLS.getStreamFromFD(), cmd = SYSCALLS.get();
      switch (cmd) {
        case 0: {
          var arg = SYSCALLS.get();
          if (arg < 0) {
            return -ERRNO_CODES.EINVAL;
          }
          var newStream;
          newStream = FS.open(stream.path, stream.flags, 0, arg);
          return newStream.fd;
        }
        case 1:
        case 2:
          return 0;  // FD_CLOEXEC makes no sense for a single process.
        case 3:
          return stream.flags;
        case 4: {
          var arg = SYSCALLS.get();
          stream.flags |= arg;
          return 0;
        }
        case 12:
        case 12: {
          var arg = SYSCALLS.get();
          var offset = 0;
          // We're always unlocked.
          HEAP16[(((arg)+(offset))>>1)]=2;
          return 0;
        }
        case 13:
        case 14:
        case 13:
        case 14:
          return 0; // Pretend that the locking is successful.
        case 16:
        case 8:
          return -ERRNO_CODES.EINVAL; // These are for sockets. We don't have them fully implemented yet.
        case 9:
          // musl trusts getown return values, due to a bug where they must be, as they overlap with errors. just return -1 here, so fnctl() returns that, and we set errno ourselves.
          ___setErrNo(ERRNO_CODES.EINVAL);
          return -1;
        default: {
          return -ERRNO_CODES.EINVAL;
        }
      }
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function ___syscall145(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // readv
      var stream = SYSCALLS.getStreamFromFD(), iov = SYSCALLS.get(), iovcnt = SYSCALLS.get();
      return SYSCALLS.doReadv(stream, iov, iovcnt);
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }
FS.staticInit();__ATINIT__.unshift(function() { if (!Module["noFSInit"] && !FS.init.initialized) FS.init() });__ATMAIN__.push(function() { FS.ignorePermissions = false });__ATEXIT__.push(function() { FS.quit() });Module["FS_createFolder"] = FS.createFolder;Module["FS_createPath"] = FS.createPath;Module["FS_createDataFile"] = FS.createDataFile;Module["FS_createPreloadedFile"] = FS.createPreloadedFile;Module["FS_createLazyFile"] = FS.createLazyFile;Module["FS_createLink"] = FS.createLink;Module["FS_createDevice"] = FS.createDevice;Module["FS_unlink"] = FS.unlink;
__ATINIT__.unshift(function() { TTY.init() });__ATEXIT__.push(function() { TTY.shutdown() });
if (ENVIRONMENT_IS_NODE) { var fs = require("fs"); var NODEJS_PATH = require("path"); NODEFS.staticInit(); }
Module["requestFullScreen"] = function Module_requestFullScreen(lockPointer, resizeCanvas, vrDevice) { Browser.requestFullScreen(lockPointer, resizeCanvas, vrDevice) };
  Module["requestAnimationFrame"] = function Module_requestAnimationFrame(func) { Browser.requestAnimationFrame(func) };
  Module["setCanvasSize"] = function Module_setCanvasSize(width, height, noUpdates) { Browser.setCanvasSize(width, height, noUpdates) };
  Module["pauseMainLoop"] = function Module_pauseMainLoop() { Browser.mainLoop.pause() };
  Module["resumeMainLoop"] = function Module_resumeMainLoop() { Browser.mainLoop.resume() };
  Module["getUserMedia"] = function Module_getUserMedia() { Browser.getUserMedia() }
  Module["createContext"] = function Module_createContext(canvas, useWebGL, setInModule, webGLContextAttributes) { return Browser.createContext(canvas, useWebGL, setInModule, webGLContextAttributes) }
___buildEnvironment(ENV);
STACK_BASE = STACKTOP = Runtime.alignMemory(STATICTOP);

staticSealed = true; // seal the static portion of memory

STACK_MAX = STACK_BASE + TOTAL_STACK;

DYNAMIC_BASE = DYNAMICTOP = Runtime.alignMemory(STACK_MAX);

assert(DYNAMIC_BASE < TOTAL_MEMORY, "TOTAL_MEMORY not big enough for stack");

 var cttz_i8 = allocate([8,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,6,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,7,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,6,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0], "i8", ALLOC_DYNAMIC);


function invoke_iiii(index,a1,a2,a3) {
  try {
    return Module["dynCall_iiii"](index,a1,a2,a3);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_vi(index,a1) {
  try {
    Module["dynCall_vi"](index,a1);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_vii(index,a1,a2) {
  try {
    Module["dynCall_vii"](index,a1,a2);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_iiiiiii(index,a1,a2,a3,a4,a5,a6) {
  try {
    return Module["dynCall_iiiiiii"](index,a1,a2,a3,a4,a5,a6);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_ii(index,a1) {
  try {
    return Module["dynCall_ii"](index,a1);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_v(index) {
  try {
    Module["dynCall_v"](index);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_iii(index,a1,a2) {
  try {
    return Module["dynCall_iii"](index,a1,a2);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

Module.asmGlobalArg = { "Math": Math, "Int8Array": Int8Array, "Int16Array": Int16Array, "Int32Array": Int32Array, "Uint8Array": Uint8Array, "Uint16Array": Uint16Array, "Uint32Array": Uint32Array, "Float32Array": Float32Array, "Float64Array": Float64Array, "NaN": NaN, "Infinity": Infinity };

Module.asmLibraryArg = { "abort": abort, "assert": assert, "invoke_iiii": invoke_iiii, "invoke_vi": invoke_vi, "invoke_vii": invoke_vii, "invoke_iiiiiii": invoke_iiiiiii, "invoke_ii": invoke_ii, "invoke_v": invoke_v, "invoke_iii": invoke_iii, "_fabs": _fabs, "_pthread_cleanup_pop": _pthread_cleanup_pop, "___syscall63": ___syscall63, "_abort": _abort, "_execvp": _execvp, "___syscall42": ___syscall42, "___setErrNo": ___setErrNo, "_fork": _fork, "___syscall20": ___syscall20, "___assert_fail": ___assert_fail, "___buildEnvironment": ___buildEnvironment, "_signal": _signal, "_wait": _wait, "_emscripten_set_main_loop_timing": _emscripten_set_main_loop_timing, "_sbrk": _sbrk, "_emscripten_memcpy_big": _emscripten_memcpy_big, "_pthread_cleanup_push": _pthread_cleanup_push, "__exit": __exit, "_execl": _execl, "___syscall221": ___syscall221, "_pthread_self": _pthread_self, "_pthread_mutex_unlock": _pthread_mutex_unlock, "_getenv": _getenv, "___syscall51": ___syscall51, "___syscall57": ___syscall57, "___syscall54": ___syscall54, "___unlock": ___unlock, "_emscripten_set_main_loop": _emscripten_set_main_loop, "___syscall3": ___syscall3, "_sysconf": _sysconf, "___lock": ___lock, "___syscall6": ___syscall6, "___syscall5": ___syscall5, "___syscall4": ___syscall4, "_time": _time, "_pthread_mutex_lock": _pthread_mutex_lock, "___syscall140": ___syscall140, "_exit": _exit, "___syscall145": ___syscall145, "___syscall146": ___syscall146, "_waitpid": _waitpid, "STACKTOP": STACKTOP, "STACK_MAX": STACK_MAX, "tempDoublePtr": tempDoublePtr, "ABORT": ABORT, "cttz_i8": cttz_i8 };
// EMSCRIPTEN_START_ASM
var asm = (function(global, env, buffer) {
  'use asm';
  
  
  var HEAP8 = new global.Int8Array(buffer);
  var HEAP16 = new global.Int16Array(buffer);
  var HEAP32 = new global.Int32Array(buffer);
  var HEAPU8 = new global.Uint8Array(buffer);
  var HEAPU16 = new global.Uint16Array(buffer);
  var HEAPU32 = new global.Uint32Array(buffer);
  var HEAPF32 = new global.Float32Array(buffer);
  var HEAPF64 = new global.Float64Array(buffer);


  var STACKTOP=env.STACKTOP|0;
  var STACK_MAX=env.STACK_MAX|0;
  var tempDoublePtr=env.tempDoublePtr|0;
  var ABORT=env.ABORT|0;
  var cttz_i8=env.cttz_i8|0;

  var __THREW__ = 0;
  var threwValue = 0;
  var setjmpId = 0;
  var undef = 0;
  var nan = global.NaN, inf = global.Infinity;
  var tempInt = 0, tempBigInt = 0, tempBigIntP = 0, tempBigIntS = 0, tempBigIntR = 0.0, tempBigIntI = 0, tempBigIntD = 0, tempValue = 0, tempDouble = 0.0;

  var tempRet0 = 0;
  var tempRet1 = 0;
  var tempRet2 = 0;
  var tempRet3 = 0;
  var tempRet4 = 0;
  var tempRet5 = 0;
  var tempRet6 = 0;
  var tempRet7 = 0;
  var tempRet8 = 0;
  var tempRet9 = 0;
  var Math_floor=global.Math.floor;
  var Math_abs=global.Math.abs;
  var Math_sqrt=global.Math.sqrt;
  var Math_pow=global.Math.pow;
  var Math_cos=global.Math.cos;
  var Math_sin=global.Math.sin;
  var Math_tan=global.Math.tan;
  var Math_acos=global.Math.acos;
  var Math_asin=global.Math.asin;
  var Math_atan=global.Math.atan;
  var Math_atan2=global.Math.atan2;
  var Math_exp=global.Math.exp;
  var Math_log=global.Math.log;
  var Math_ceil=global.Math.ceil;
  var Math_imul=global.Math.imul;
  var Math_min=global.Math.min;
  var Math_clz32=global.Math.clz32;
  var abort=env.abort;
  var assert=env.assert;
  var invoke_iiii=env.invoke_iiii;
  var invoke_vi=env.invoke_vi;
  var invoke_vii=env.invoke_vii;
  var invoke_iiiiiii=env.invoke_iiiiiii;
  var invoke_ii=env.invoke_ii;
  var invoke_v=env.invoke_v;
  var invoke_iii=env.invoke_iii;
  var _fabs=env._fabs;
  var _pthread_cleanup_pop=env._pthread_cleanup_pop;
  var ___syscall63=env.___syscall63;
  var _abort=env._abort;
  var _execvp=env._execvp;
  var ___syscall42=env.___syscall42;
  var ___setErrNo=env.___setErrNo;
  var _fork=env._fork;
  var ___syscall20=env.___syscall20;
  var ___assert_fail=env.___assert_fail;
  var ___buildEnvironment=env.___buildEnvironment;
  var _signal=env._signal;
  var _wait=env._wait;
  var _emscripten_set_main_loop_timing=env._emscripten_set_main_loop_timing;
  var _sbrk=env._sbrk;
  var _emscripten_memcpy_big=env._emscripten_memcpy_big;
  var _pthread_cleanup_push=env._pthread_cleanup_push;
  var __exit=env.__exit;
  var _execl=env._execl;
  var ___syscall221=env.___syscall221;
  var _pthread_self=env._pthread_self;
  var _pthread_mutex_unlock=env._pthread_mutex_unlock;
  var _getenv=env._getenv;
  var ___syscall51=env.___syscall51;
  var ___syscall57=env.___syscall57;
  var ___syscall54=env.___syscall54;
  var ___unlock=env.___unlock;
  var _emscripten_set_main_loop=env._emscripten_set_main_loop;
  var ___syscall3=env.___syscall3;
  var _sysconf=env._sysconf;
  var ___lock=env.___lock;
  var ___syscall6=env.___syscall6;
  var ___syscall5=env.___syscall5;
  var ___syscall4=env.___syscall4;
  var _time=env._time;
  var _pthread_mutex_lock=env._pthread_mutex_lock;
  var ___syscall140=env.___syscall140;
  var _exit=env._exit;
  var ___syscall145=env.___syscall145;
  var ___syscall146=env.___syscall146;
  var _waitpid=env._waitpid;
  var tempFloat = 0.0;

// EMSCRIPTEN_START_FUNCS

function ___floatscan($f, $prec, $pok) {
 $f = $f | 0;
 $prec = $prec | 0;
 $pok = $pok | 0;
 var $$0 = 0.0, $$010$i = 0, $$012$i = 0, $$07$i = 0, $$0710$i = 0, $$0711$i = 0, $$1$i = 0.0, $$111$be$i = 0, $$111$ph$i = 0, $$2$i = 0, $$24$i = 0, $$3$be$i = 0, $$3$lcssa$i = 0, $$3113$i = 0, $$in = 0, $$lcssa = 0, $$lcssa256 = 0, $$lcssa256$lcssa = 0, $$lcssa257 = 0, $$lcssa257$lcssa = 0, $$lcssa263 = 0, $$lcssa264 = 0, $$lcssa265 = 0, $$lcssa275 = 0, $$not$i = 0, $$pre$i = 0, $$pre$i$17 = 0, $$pre$phi42$iZ2D = 0.0, $$sink$off0$i = 0, $0 = 0, $1 = 0, $115 = 0, $123 = 0, $125 = 0, $132 = 0, $139 = 0, $147 = 0, $15 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $16 = 0, $160 = 0, $164 = 0, $168 = 0, $170 = 0, $183 = 0.0, $190 = 0, $192 = 0, $2 = 0, $201 = 0, $205 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $223 = 0, $224 = 0, $225 = 0, $235 = 0, $236 = 0, $249 = 0, $251 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $270 = 0, $272 = 0, $283 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $295 = 0, $297 = 0, $298 = 0, $299 = 0, $300 = 0, $310 = 0.0, $322 = 0.0, $330 = 0, $331 = 0, $338 = 0, $346 = 0, $347 = 0, $348 = 0, $349 = 0, $350 = 0, $358 = 0, $36 = 0, $360 = 0, $362 = 0, $365 = 0, $366 = 0, $367 = 0, $368 = 0, $369 = 0, $371 = 0, $376 = 0, $377 = 0, $381 = 0, $39 = 0, $392 = 0, $393 = 0, $394 = 0, $395 = 0, $396 = 0, $397 = 0, $398 = 0, $399 = 0, $402 = 0, $403 = 0, $412 = 0, $413 = 0, $414 = 0, $42 = 0, $422 = 0, $426 = 0, $428 = 0, $429 = 0, $431 = 0, $444 = 0, $446 = 0, $456 = 0, $458 = 0, $470 = 0, $471 = 0, $472 = 0, $494 = 0, $506 = 0, $510 = 0, $513 = 0, $515 = 0, $516 = 0, $517 = 0, $520 = 0, $521 = 0, $533 = 0, $534 = 0, $535 = 0, $539 = 0, $541 = 0, $543 = 0, $544 = 0, $549 = 0, $550 = 0, $552 = 0, $557 = 0, $560 = 0, $564 = 0, $567 = 0, $572 = 0, $576 = 0, $577 = 0, $579 = 0, $583 = 0, $585 = 0, $588 = 0, $589 = 0, $590 = 0, $591 = 0, $594 = 0, $595 = 0, $60 = 0, $603 = 0, $609 = 0, $610 = 0, $617 = 0, $619 = 0.0, $621 = 0, $625 = 0.0, $626 = 0.0, $629 = 0.0, $633 = 0, $636 = 0, $643 = 0.0, $661 = 0.0, $663 = 0, $669 = 0, $67 = 0, $670 = 0, $680 = 0, $69 = 0, $691 = 0, $694 = 0, $695 = 0, $696 = 0, $697 = 0, $698 = 0, $699 = 0, $700 = 0, $701 = 0, $702 = 0, $703 = 0, $704 = 0, $705 = 0, $706 = 0, $707 = 0, $708 = 0, $709 = 0, $710 = 0, $711 = 0, $712 = 0, $713 = 0, $714 = 0, $715 = 0, $716 = 0, $717 = 0, $718 = 0, $719 = 0, $720 = 0, $721 = 0, $722 = 0, $723 = 0, $76 = 0, $82 = 0, $9 = 0, $90 = 0, $99 = 0, $a$0$lcssa159$i = 0, $a$093$i = 0, $a$1$i = 0, $a$1$i$lcssa = 0, $a$2$ph46$i = 0, $a$4$i = 0, $a$4$i$lcssa248 = 0, $a$4$i249 = 0, $a$4$ph$i = 0, $a$4$ph165$i = 0, $a$586$i = 0, $a$6$i = 0, $a$6$i$lcssa = 0, $a$6$i$lcssa$lcssa = 0, $bias$0$i = 0.0, $bias$0$i$25 = 0.0, $bits$0$ph = 0, $c$0 = 0, $c$0$i = 0, $c$1$lcssa = 0, $c$1$ph$i = 0, $c$179 = 0, $c$2 = 0, $c$2$i = 0, $c$2$lcssa$i = 0, $c$377 = 0, $c$4 = 0, $c$5 = 0, $c$6 = 0, $carry$095$i = 0, $carry1$0$i = 0, $carry1$1$i = 0, $carry1$1$i$lcssa = 0, $carry1$1$i$lcssa$lcssa = 0, $carry4$089$i = 0, $d$0$i = 0, $denormal$0$i = 0, $denormal$2$i = 0, $e2$0$i$19 = 0, $e2$0$ph$i = 0, $e2$1$i = 0, $e2$1$i246 = 0, $e2$1$ph$i = 0, $e2$1$ph164$i = 0, $e2$3$i = 0, $e2$4$i = 0, $emin$0$ph = 0, $frac$0$i = 0.0, $frac$1$i = 0.0, $frac$3$i = 0.0, $gotdig$0$i = 0, $gotdig$0$i$12 = 0, $gotdig$0$i$12$lcssa273 = 0, $gotdig$0$i$lcssa242 = 0, $gotdig$2$i = 0, $gotdig$2$i$13 = 0, $gotdig$2$i$lcssa = 0, $gotdig$3$i = 0, $gotdig$3$lcssa$i = 0, $gotdig$3109$i = 0, $gotdig$3109$i$lcssa = 0, $gotdig$4$i = 0, $gotrad$0$i = 0, $gotrad$0$i$14 = 0, $gotrad$0$i$lcssa = 0, $gotrad$1$i = 0, $gotrad$1$lcssa$i = 0, $gotrad$1110$i = 0, $gotrad$2$i = 0, $gottail$0$i = 0, $gottail$1$i = 0, $gottail$2$i = 0, $i$0$lcssa = 0, $i$078 = 0, $i$1 = 0, $i$276 = 0, $i$3 = 0, $i$4 = 0, $i$4$lcssa = 0, $j$0$lcssa$i = 0, $j$0112$i = 0, $j$0112$i$lcssa = 0, $j$075$i = 0, $j$076$i = 0, $j$077$i = 0, $j$2$i = 0, $j$3102$i = 0, $k$0$lcssa$i = 0, $k$0111$i = 0, $k$0111$i$lcssa = 0, $k$071$i = 0, $k$072$i = 0, $k$073$i = 0, $k$2$i = 0, $k$3$i = 0, $k$494$i = 0, $k$5$i = 0, $k$5$in$i = 0, $k$687$i = 0, $lnz$0$lcssa$i = 0, $lnz$0108$i = 0, $lnz$0108$i$lcssa = 0, $lnz$065$i = 0, $lnz$066$i = 0, $lnz$067$i = 0, $lnz$2$i = 0, $or$cond21$i = 0, $or$cond25$i = 0, $or$cond9$i = 0, $rp$0$lcssa160$i = 0, $rp$092$i = 0, $rp$1$i$18 = 0, $rp$1$i$18$lcssa = 0, $rp$2$ph44$i = 0, $rp$4$ph$i = 0, $rp$4$ph42$i = 0, $rp$585$i = 0, $rp$6$i = 0, $rp$6$i$lcssa = 0, $rp$6$i$lcssa$lcssa = 0, $scale$0$i = 0.0, $scale$1$i = 0.0, $scale$2$i = 0.0, $sign$0 = 0, $storemerge$i = 0, $sum$i = 0, $x$0$i = 0, $x$0$i$lcssa = 0, $x$1$i = 0, $x$2$i = 0, $x$3$lcssa$i = 0, $x$324$i = 0, $x$4$lcssa$i = 0, $x$419$i = 0, $x$5$i = 0, $x$i = 0, $y$0$i = 0.0, $y$0$i$lcssa = 0.0, $y$1$i = 0.0, $y$1$i$24 = 0.0, $y$2$i = 0.0, $y$2$i$26 = 0.0, $y$3$i = 0.0, $y$3$lcssa$i = 0.0, $y$320$i = 0.0, $y$4$i = 0.0, $z$0$i = 0, $z$1$i = 0, $z$1$ph45$i = 0, $z$10$1$i = 0, $z$10$i = 0, $z$2$i = 0, $z$3$i = 0, $z$3$i$lcssa = 0, $z$3$i$lcssa$lcssa = 0, $z$4$i = 0, $z$6$ph$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 512 | 0;
 $x$i = sp;
 switch ($prec | 0) {
 case 0:
  {
   $bits$0$ph = 24;
   $emin$0$ph = -149;
   label = 4;
   break;
  }
 case 1:
  {
   $bits$0$ph = 53;
   $emin$0$ph = -1074;
   label = 4;
   break;
  }
 case 2:
  {
   $bits$0$ph = 53;
   $emin$0$ph = -1074;
   label = 4;
   break;
  }
 default:
  $$0 = 0.0;
 }
 L4 : do if ((label | 0) == 4) {
  $0 = $f + 4 | 0;
  $1 = $f + 100 | 0;
  do {
   $2 = HEAP32[$0 >> 2] | 0;
   if ($2 >>> 0 < (HEAP32[$1 >> 2] | 0) >>> 0) {
    HEAP32[$0 >> 2] = $2 + 1;
    $9 = HEAPU8[$2 >> 0] | 0;
   } else $9 = ___shgetc($f) | 0;
  } while ((_isspace($9) | 0) != 0);
  $$lcssa275 = $9;
  L13 : do switch ($$lcssa275 | 0) {
  case 43:
  case 45:
   {
    $15 = 1 - ((($$lcssa275 | 0) == 45 & 1) << 1) | 0;
    $16 = HEAP32[$0 >> 2] | 0;
    if ($16 >>> 0 < (HEAP32[$1 >> 2] | 0) >>> 0) {
     HEAP32[$0 >> 2] = $16 + 1;
     $c$0 = HEAPU8[$16 >> 0] | 0;
     $sign$0 = $15;
     break L13;
    } else {
     $c$0 = ___shgetc($f) | 0;
     $sign$0 = $15;
     break L13;
    }
    break;
   }
  default:
   {
    $c$0 = $$lcssa275;
    $sign$0 = 1;
   }
  } while (0);
  $c$179 = $c$0;
  $i$078 = 0;
  while (1) {
   if (($c$179 | 32 | 0) != (HEAP8[7021 + $i$078 >> 0] | 0)) {
    $c$1$lcssa = $c$179;
    $i$0$lcssa = $i$078;
    break;
   }
   do if ($i$078 >>> 0 < 7) {
    $29 = HEAP32[$0 >> 2] | 0;
    if ($29 >>> 0 < (HEAP32[$1 >> 2] | 0) >>> 0) {
     HEAP32[$0 >> 2] = $29 + 1;
     $c$2 = HEAPU8[$29 >> 0] | 0;
     break;
    } else {
     $c$2 = ___shgetc($f) | 0;
     break;
    }
   } else $c$2 = $c$179; while (0);
   $36 = $i$078 + 1 | 0;
   if ($36 >>> 0 < 8) {
    $c$179 = $c$2;
    $i$078 = $36;
   } else {
    $c$1$lcssa = $c$2;
    $i$0$lcssa = $36;
    break;
   }
  }
  L29 : do switch ($i$0$lcssa | 0) {
  case 8:
   break;
  case 3:
   {
    label = 23;
    break;
   }
  default:
   {
    $39 = ($pok | 0) != 0;
    if ($39 & $i$0$lcssa >>> 0 > 3) if (($i$0$lcssa | 0) == 8) break L29; else {
     label = 23;
     break L29;
    }
    L34 : do if (!$i$0$lcssa) {
     $c$377 = $c$1$lcssa;
     $i$276 = 0;
     while (1) {
      if (($c$377 | 32 | 0) != (HEAP8[9892 + $i$276 >> 0] | 0)) {
       $c$5 = $c$377;
       $i$3 = $i$276;
       break L34;
      }
      do if ($i$276 >>> 0 < 2) {
       $60 = HEAP32[$0 >> 2] | 0;
       if ($60 >>> 0 < (HEAP32[$1 >> 2] | 0) >>> 0) {
        HEAP32[$0 >> 2] = $60 + 1;
        $c$4 = HEAPU8[$60 >> 0] | 0;
        break;
       } else {
        $c$4 = ___shgetc($f) | 0;
        break;
       }
      } else $c$4 = $c$377; while (0);
      $67 = $i$276 + 1 | 0;
      if ($67 >>> 0 < 3) {
       $c$377 = $c$4;
       $i$276 = $67;
      } else {
       $c$5 = $c$4;
       $i$3 = $67;
       break;
      }
     }
    } else {
     $c$5 = $c$1$lcssa;
     $i$3 = $i$0$lcssa;
    } while (0);
    switch ($i$3 | 0) {
    case 3:
     {
      $69 = HEAP32[$0 >> 2] | 0;
      if ($69 >>> 0 < (HEAP32[$1 >> 2] | 0) >>> 0) {
       HEAP32[$0 >> 2] = $69 + 1;
       $76 = HEAPU8[$69 >> 0] | 0;
      } else $76 = ___shgetc($f) | 0;
      if (($76 | 0) == 40) $i$4 = 1; else {
       if (!(HEAP32[$1 >> 2] | 0)) {
        $$0 = nan;
        break L4;
       }
       HEAP32[$0 >> 2] = (HEAP32[$0 >> 2] | 0) + -1;
       $$0 = nan;
       break L4;
      }
      while (1) {
       $82 = HEAP32[$0 >> 2] | 0;
       if ($82 >>> 0 < (HEAP32[$1 >> 2] | 0) >>> 0) {
        HEAP32[$0 >> 2] = $82 + 1;
        $90 = HEAPU8[$82 >> 0] | 0;
       } else $90 = ___shgetc($f) | 0;
       if (!(($90 + -48 | 0) >>> 0 < 10 | ($90 + -65 | 0) >>> 0 < 26)) if (!(($90 | 0) == 95 | ($90 + -97 | 0) >>> 0 < 26)) {
        $$lcssa = $90;
        $i$4$lcssa = $i$4;
        break;
       }
       $i$4 = $i$4 + 1 | 0;
      }
      if (($$lcssa | 0) == 41) {
       $$0 = nan;
       break L4;
      }
      $99 = (HEAP32[$1 >> 2] | 0) == 0;
      if (!$99) HEAP32[$0 >> 2] = (HEAP32[$0 >> 2] | 0) + -1;
      if (!$39) {
       HEAP32[(___errno_location() | 0) >> 2] = 22;
       ___shlim($f, 0);
       $$0 = 0.0;
       break L4;
      }
      if (!$i$4$lcssa) {
       $$0 = nan;
       break L4;
      } else $$in = $i$4$lcssa;
      while (1) {
       $$in = $$in + -1 | 0;
       if (!$99) HEAP32[$0 >> 2] = (HEAP32[$0 >> 2] | 0) + -1;
       if (!$$in) {
        $$0 = nan;
        break L4;
       }
      }
      break;
     }
    case 0:
     {
      do if (($c$5 | 0) == 48) {
       $115 = HEAP32[$0 >> 2] | 0;
       if ($115 >>> 0 < (HEAP32[$1 >> 2] | 0) >>> 0) {
        HEAP32[$0 >> 2] = $115 + 1;
        $123 = HEAPU8[$115 >> 0] | 0;
       } else $123 = ___shgetc($f) | 0;
       if (($123 | 32 | 0) != 120) {
        if (!(HEAP32[$1 >> 2] | 0)) {
         $c$6 = 48;
         break;
        }
        HEAP32[$0 >> 2] = (HEAP32[$0 >> 2] | 0) + -1;
        $c$6 = 48;
        break;
       }
       $125 = HEAP32[$0 >> 2] | 0;
       if ($125 >>> 0 < (HEAP32[$1 >> 2] | 0) >>> 0) {
        HEAP32[$0 >> 2] = $125 + 1;
        $c$0$i = HEAPU8[$125 >> 0] | 0;
        $gotdig$0$i = 0;
       } else {
        $c$0$i = ___shgetc($f) | 0;
        $gotdig$0$i = 0;
       }
       L94 : while (1) {
        switch ($c$0$i | 0) {
        case 46:
         {
          $gotdig$0$i$lcssa242 = $gotdig$0$i;
          label = 74;
          break L94;
          break;
         }
        case 48:
         break;
        default:
         {
          $168 = 0;
          $170 = 0;
          $694 = 0;
          $695 = 0;
          $c$2$i = $c$0$i;
          $gotdig$2$i = $gotdig$0$i;
          $gotrad$0$i = 0;
          $gottail$0$i = 0;
          $scale$0$i = 1.0;
          $x$0$i = 0;
          $y$0$i = 0.0;
          break L94;
         }
        }
        $132 = HEAP32[$0 >> 2] | 0;
        if ($132 >>> 0 < (HEAP32[$1 >> 2] | 0) >>> 0) {
         HEAP32[$0 >> 2] = $132 + 1;
         $c$0$i = HEAPU8[$132 >> 0] | 0;
         $gotdig$0$i = 1;
         continue;
        } else {
         $c$0$i = ___shgetc($f) | 0;
         $gotdig$0$i = 1;
         continue;
        }
       }
       if ((label | 0) == 74) {
        $139 = HEAP32[$0 >> 2] | 0;
        if ($139 >>> 0 < (HEAP32[$1 >> 2] | 0) >>> 0) {
         HEAP32[$0 >> 2] = $139 + 1;
         $c$1$ph$i = HEAPU8[$139 >> 0] | 0;
        } else $c$1$ph$i = ___shgetc($f) | 0;
        if (($c$1$ph$i | 0) == 48) {
         $154 = 0;
         $155 = 0;
         while (1) {
          $147 = HEAP32[$0 >> 2] | 0;
          if ($147 >>> 0 < (HEAP32[$1 >> 2] | 0) >>> 0) {
           HEAP32[$0 >> 2] = $147 + 1;
           $158 = HEAPU8[$147 >> 0] | 0;
          } else $158 = ___shgetc($f) | 0;
          $156 = _i64Add($154 | 0, $155 | 0, -1, -1) | 0;
          $157 = tempRet0;
          if (($158 | 0) == 48) {
           $154 = $156;
           $155 = $157;
          } else {
           $168 = 0;
           $170 = 0;
           $694 = $156;
           $695 = $157;
           $c$2$i = $158;
           $gotdig$2$i = 1;
           $gotrad$0$i = 1;
           $gottail$0$i = 0;
           $scale$0$i = 1.0;
           $x$0$i = 0;
           $y$0$i = 0.0;
           break;
          }
         }
        } else {
         $168 = 0;
         $170 = 0;
         $694 = 0;
         $695 = 0;
         $c$2$i = $c$1$ph$i;
         $gotdig$2$i = $gotdig$0$i$lcssa242;
         $gotrad$0$i = 1;
         $gottail$0$i = 0;
         $scale$0$i = 1.0;
         $x$0$i = 0;
         $y$0$i = 0.0;
        }
       }
       while (1) {
        $160 = $c$2$i + -48 | 0;
        $$pre$i = $c$2$i | 32;
        if ($160 >>> 0 < 10) label = 86; else {
         $164 = ($c$2$i | 0) == 46;
         if (!($164 | ($$pre$i + -97 | 0) >>> 0 < 6)) {
          $212 = $694;
          $213 = $170;
          $215 = $695;
          $216 = $168;
          $c$2$lcssa$i = $c$2$i;
          $gotdig$2$i$lcssa = $gotdig$2$i;
          $gotrad$0$i$lcssa = $gotrad$0$i;
          $x$0$i$lcssa = $x$0$i;
          $y$0$i$lcssa = $y$0$i;
          break;
         }
         if ($164) if (!$gotrad$0$i) {
          $696 = $170;
          $697 = $168;
          $698 = $170;
          $699 = $168;
          $gotdig$3$i = $gotdig$2$i;
          $gotrad$1$i = 1;
          $gottail$2$i = $gottail$0$i;
          $scale$2$i = $scale$0$i;
          $x$2$i = $x$0$i;
          $y$2$i = $y$0$i;
         } else {
          $212 = $694;
          $213 = $170;
          $215 = $695;
          $216 = $168;
          $c$2$lcssa$i = 46;
          $gotdig$2$i$lcssa = $gotdig$2$i;
          $gotrad$0$i$lcssa = $gotrad$0$i;
          $x$0$i$lcssa = $x$0$i;
          $y$0$i$lcssa = $y$0$i;
          break;
         } else label = 86;
        }
        if ((label | 0) == 86) {
         label = 0;
         $d$0$i = ($c$2$i | 0) > 57 ? $$pre$i + -87 | 0 : $160;
         do if (($168 | 0) < 0 | ($168 | 0) == 0 & $170 >>> 0 < 8) {
          $gottail$1$i = $gottail$0$i;
          $scale$1$i = $scale$0$i;
          $x$1$i = $d$0$i + ($x$0$i << 4) | 0;
          $y$1$i = $y$0$i;
         } else {
          if (($168 | 0) < 0 | ($168 | 0) == 0 & $170 >>> 0 < 14) {
           $183 = $scale$0$i * .0625;
           $gottail$1$i = $gottail$0$i;
           $scale$1$i = $183;
           $x$1$i = $x$0$i;
           $y$1$i = $y$0$i + $183 * +($d$0$i | 0);
           break;
          }
          if (($gottail$0$i | 0) != 0 | ($d$0$i | 0) == 0) {
           $gottail$1$i = $gottail$0$i;
           $scale$1$i = $scale$0$i;
           $x$1$i = $x$0$i;
           $y$1$i = $y$0$i;
          } else {
           $gottail$1$i = 1;
           $scale$1$i = $scale$0$i;
           $x$1$i = $x$0$i;
           $y$1$i = $y$0$i + $scale$0$i * .5;
          }
         } while (0);
         $190 = _i64Add($170 | 0, $168 | 0, 1, 0) | 0;
         $696 = $694;
         $697 = $695;
         $698 = $190;
         $699 = tempRet0;
         $gotdig$3$i = 1;
         $gotrad$1$i = $gotrad$0$i;
         $gottail$2$i = $gottail$1$i;
         $scale$2$i = $scale$1$i;
         $x$2$i = $x$1$i;
         $y$2$i = $y$1$i;
        }
        $192 = HEAP32[$0 >> 2] | 0;
        if ($192 >>> 0 < (HEAP32[$1 >> 2] | 0) >>> 0) {
         HEAP32[$0 >> 2] = $192 + 1;
         $168 = $699;
         $170 = $698;
         $694 = $696;
         $695 = $697;
         $c$2$i = HEAPU8[$192 >> 0] | 0;
         $gotdig$2$i = $gotdig$3$i;
         $gotrad$0$i = $gotrad$1$i;
         $gottail$0$i = $gottail$2$i;
         $scale$0$i = $scale$2$i;
         $x$0$i = $x$2$i;
         $y$0$i = $y$2$i;
         continue;
        } else {
         $168 = $699;
         $170 = $698;
         $694 = $696;
         $695 = $697;
         $c$2$i = ___shgetc($f) | 0;
         $gotdig$2$i = $gotdig$3$i;
         $gotrad$0$i = $gotrad$1$i;
         $gottail$0$i = $gottail$2$i;
         $scale$0$i = $scale$2$i;
         $x$0$i = $x$2$i;
         $y$0$i = $y$2$i;
         continue;
        }
       }
       if (!$gotdig$2$i$lcssa) {
        $201 = (HEAP32[$1 >> 2] | 0) == 0;
        if (!$201) HEAP32[$0 >> 2] = (HEAP32[$0 >> 2] | 0) + -1;
        if (!$pok) ___shlim($f, 0); else if (!$201) {
         $205 = HEAP32[$0 >> 2] | 0;
         HEAP32[$0 >> 2] = $205 + -1;
         if ($gotrad$0$i$lcssa) HEAP32[$0 >> 2] = $205 + -2;
        }
        $$0 = +($sign$0 | 0) * 0.0;
        break L4;
       }
       $211 = ($gotrad$0$i$lcssa | 0) == 0;
       $214 = $211 ? $213 : $212;
       $217 = $211 ? $216 : $215;
       if (($216 | 0) < 0 | ($216 | 0) == 0 & $213 >>> 0 < 8) {
        $224 = $213;
        $225 = $216;
        $x$324$i = $x$0$i$lcssa;
        while (1) {
         $223 = $x$324$i << 4;
         $224 = _i64Add($224 | 0, $225 | 0, 1, 0) | 0;
         $225 = tempRet0;
         if (!(($225 | 0) < 0 | ($225 | 0) == 0 & $224 >>> 0 < 8)) {
          $x$3$lcssa$i = $223;
          break;
         } else $x$324$i = $223;
        }
       } else $x$3$lcssa$i = $x$0$i$lcssa;
       if (($c$2$lcssa$i | 32 | 0) == 112) {
        $235 = _scanexp($f, $pok) | 0;
        $236 = tempRet0;
        if (($235 | 0) == 0 & ($236 | 0) == -2147483648) {
         if (!$pok) {
          ___shlim($f, 0);
          $$0 = 0.0;
          break L4;
         }
         if (!(HEAP32[$1 >> 2] | 0)) {
          $253 = 0;
          $254 = 0;
         } else {
          HEAP32[$0 >> 2] = (HEAP32[$0 >> 2] | 0) + -1;
          $253 = 0;
          $254 = 0;
         }
        } else {
         $253 = $235;
         $254 = $236;
        }
       } else if (!(HEAP32[$1 >> 2] | 0)) {
        $253 = 0;
        $254 = 0;
       } else {
        HEAP32[$0 >> 2] = (HEAP32[$0 >> 2] | 0) + -1;
        $253 = 0;
        $254 = 0;
       }
       $249 = _bitshift64Shl($214 | 0, $217 | 0, 2) | 0;
       $251 = _i64Add($249 | 0, tempRet0 | 0, -32, -1) | 0;
       $255 = _i64Add($251 | 0, tempRet0 | 0, $253 | 0, $254 | 0) | 0;
       $256 = tempRet0;
       if (!$x$3$lcssa$i) {
        $$0 = +($sign$0 | 0) * 0.0;
        break L4;
       }
       if (($256 | 0) > 0 | ($256 | 0) == 0 & $255 >>> 0 > (0 - $emin$0$ph | 0) >>> 0) {
        HEAP32[(___errno_location() | 0) >> 2] = 34;
        $$0 = +($sign$0 | 0) * 1797693134862315708145274.0e284 * 1797693134862315708145274.0e284;
        break L4;
       }
       $270 = $emin$0$ph + -106 | 0;
       $272 = (($270 | 0) < 0) << 31 >> 31;
       if (($256 | 0) < ($272 | 0) | ($256 | 0) == ($272 | 0) & $255 >>> 0 < $270 >>> 0) {
        HEAP32[(___errno_location() | 0) >> 2] = 34;
        $$0 = +($sign$0 | 0) * 2.2250738585072014e-308 * 2.2250738585072014e-308;
        break L4;
       }
       if (($x$3$lcssa$i | 0) > -1) {
        $288 = $255;
        $289 = $256;
        $x$419$i = $x$3$lcssa$i;
        $y$320$i = $y$0$i$lcssa;
        while (1) {
         $283 = !($y$320$i >= .5);
         $287 = $283 & 1 | $x$419$i << 1;
         $x$5$i = $287 ^ 1;
         $y$4$i = $y$320$i + ($283 ? $y$320$i : $y$320$i + -1.0);
         $290 = _i64Add($288 | 0, $289 | 0, -1, -1) | 0;
         $291 = tempRet0;
         if (($287 | 0) > -1) {
          $288 = $290;
          $289 = $291;
          $x$419$i = $x$5$i;
          $y$320$i = $y$4$i;
         } else {
          $297 = $290;
          $298 = $291;
          $x$4$lcssa$i = $x$5$i;
          $y$3$lcssa$i = $y$4$i;
          break;
         }
        }
       } else {
        $297 = $255;
        $298 = $256;
        $x$4$lcssa$i = $x$3$lcssa$i;
        $y$3$lcssa$i = $y$0$i$lcssa;
       }
       $295 = _i64Subtract(32, 0, $emin$0$ph | 0, (($emin$0$ph | 0) < 0) << 31 >> 31 | 0) | 0;
       $299 = _i64Add($297 | 0, $298 | 0, $295 | 0, tempRet0 | 0) | 0;
       $300 = tempRet0;
       if (0 > ($300 | 0) | 0 == ($300 | 0) & $bits$0$ph >>> 0 > $299 >>> 0) if (($299 | 0) < 0) {
        $$0710$i = 0;
        label = 127;
       } else {
        $$07$i = $299;
        label = 125;
       } else {
        $$07$i = $bits$0$ph;
        label = 125;
       }
       if ((label | 0) == 125) if (($$07$i | 0) < 53) {
        $$0710$i = $$07$i;
        label = 127;
       } else {
        $$0711$i = $$07$i;
        $$pre$phi42$iZ2D = +($sign$0 | 0);
        $bias$0$i = 0.0;
       }
       if ((label | 0) == 127) {
        $310 = +($sign$0 | 0);
        $$0711$i = $$0710$i;
        $$pre$phi42$iZ2D = $310;
        $bias$0$i = +_copysignl(+_scalbn(1.0, 84 - $$0710$i | 0), $310);
       }
       $or$cond9$i = ($x$4$lcssa$i & 1 | 0) == 0 & ($y$3$lcssa$i != 0.0 & ($$0711$i | 0) < 32);
       $322 = $$pre$phi42$iZ2D * ($or$cond9$i ? 0.0 : $y$3$lcssa$i) + ($bias$0$i + $$pre$phi42$iZ2D * +((($or$cond9$i & 1) + $x$4$lcssa$i | 0) >>> 0)) - $bias$0$i;
       if (!($322 != 0.0)) HEAP32[(___errno_location() | 0) >> 2] = 34;
       $$0 = +_scalbnl($322, $297);
       break L4;
      } else $c$6 = $c$5; while (0);
      $sum$i = $emin$0$ph + $bits$0$ph | 0;
      $330 = 0 - $sum$i | 0;
      $$010$i = $c$6;
      $gotdig$0$i$12 = 0;
      L184 : while (1) {
       switch ($$010$i | 0) {
       case 46:
        {
         $gotdig$0$i$12$lcssa273 = $gotdig$0$i$12;
         label = 138;
         break L184;
         break;
        }
       case 48:
        break;
       default:
        {
         $$2$i = $$010$i;
         $700 = 0;
         $701 = 0;
         $gotdig$2$i$13 = $gotdig$0$i$12;
         $gotrad$0$i$14 = 0;
         break L184;
        }
       }
       $331 = HEAP32[$0 >> 2] | 0;
       if ($331 >>> 0 < (HEAP32[$1 >> 2] | 0) >>> 0) {
        HEAP32[$0 >> 2] = $331 + 1;
        $$010$i = HEAPU8[$331 >> 0] | 0;
        $gotdig$0$i$12 = 1;
        continue;
       } else {
        $$010$i = ___shgetc($f) | 0;
        $gotdig$0$i$12 = 1;
        continue;
       }
      }
      if ((label | 0) == 138) {
       $338 = HEAP32[$0 >> 2] | 0;
       if ($338 >>> 0 < (HEAP32[$1 >> 2] | 0) >>> 0) {
        HEAP32[$0 >> 2] = $338 + 1;
        $$111$ph$i = HEAPU8[$338 >> 0] | 0;
       } else $$111$ph$i = ___shgetc($f) | 0;
       if (($$111$ph$i | 0) == 48) {
        $346 = 0;
        $347 = 0;
        while (1) {
         $348 = _i64Add($346 | 0, $347 | 0, -1, -1) | 0;
         $349 = tempRet0;
         $350 = HEAP32[$0 >> 2] | 0;
         if ($350 >>> 0 < (HEAP32[$1 >> 2] | 0) >>> 0) {
          HEAP32[$0 >> 2] = $350 + 1;
          $$111$be$i = HEAPU8[$350 >> 0] | 0;
         } else $$111$be$i = ___shgetc($f) | 0;
         if (($$111$be$i | 0) == 48) {
          $346 = $348;
          $347 = $349;
         } else {
          $$2$i = $$111$be$i;
          $700 = $348;
          $701 = $349;
          $gotdig$2$i$13 = 1;
          $gotrad$0$i$14 = 1;
          break;
         }
        }
       } else {
        $$2$i = $$111$ph$i;
        $700 = 0;
        $701 = 0;
        $gotdig$2$i$13 = $gotdig$0$i$12$lcssa273;
        $gotrad$0$i$14 = 1;
       }
      }
      HEAP32[$x$i >> 2] = 0;
      $358 = $$2$i + -48 | 0;
      $360 = ($$2$i | 0) == 46;
      L203 : do if ($360 | $358 >>> 0 < 10) {
       $362 = $x$i + 496 | 0;
       $$3113$i = $$2$i;
       $365 = 0;
       $366 = 0;
       $702 = $360;
       $703 = $358;
       $704 = $700;
       $705 = $701;
       $gotdig$3109$i = $gotdig$2$i$13;
       $gotrad$1110$i = $gotrad$0$i$14;
       $j$0112$i = 0;
       $k$0111$i = 0;
       $lnz$0108$i = 0;
       L205 : while (1) {
        do if ($702) if (!$gotrad$1110$i) {
         $706 = $365;
         $707 = $366;
         $708 = $365;
         $709 = $366;
         $gotdig$4$i = $gotdig$3109$i;
         $gotrad$2$i = 1;
         $j$2$i = $j$0112$i;
         $k$2$i = $k$0111$i;
         $lnz$2$i = $lnz$0108$i;
        } else {
         $710 = $704;
         $711 = $705;
         $712 = $365;
         $713 = $366;
         $gotdig$3109$i$lcssa = $gotdig$3109$i;
         $j$0112$i$lcssa = $j$0112$i;
         $k$0111$i$lcssa = $k$0111$i;
         $lnz$0108$i$lcssa = $lnz$0108$i;
         break L205;
        } else {
         $367 = _i64Add($365 | 0, $366 | 0, 1, 0) | 0;
         $368 = tempRet0;
         $369 = ($$3113$i | 0) != 48;
         if (($k$0111$i | 0) >= 125) {
          if (!$369) {
           $706 = $704;
           $707 = $705;
           $708 = $367;
           $709 = $368;
           $gotdig$4$i = $gotdig$3109$i;
           $gotrad$2$i = $gotrad$1110$i;
           $j$2$i = $j$0112$i;
           $k$2$i = $k$0111$i;
           $lnz$2$i = $lnz$0108$i;
           break;
          }
          HEAP32[$362 >> 2] = HEAP32[$362 >> 2] | 1;
          $706 = $704;
          $707 = $705;
          $708 = $367;
          $709 = $368;
          $gotdig$4$i = $gotdig$3109$i;
          $gotrad$2$i = $gotrad$1110$i;
          $j$2$i = $j$0112$i;
          $k$2$i = $k$0111$i;
          $lnz$2$i = $lnz$0108$i;
          break;
         }
         $371 = $x$i + ($k$0111$i << 2) | 0;
         if (!$j$0112$i) $storemerge$i = $703; else $storemerge$i = $$3113$i + -48 + ((HEAP32[$371 >> 2] | 0) * 10 | 0) | 0;
         HEAP32[$371 >> 2] = $storemerge$i;
         $376 = $j$0112$i + 1 | 0;
         $377 = ($376 | 0) == 9;
         $706 = $704;
         $707 = $705;
         $708 = $367;
         $709 = $368;
         $gotdig$4$i = 1;
         $gotrad$2$i = $gotrad$1110$i;
         $j$2$i = $377 ? 0 : $376;
         $k$2$i = ($377 & 1) + $k$0111$i | 0;
         $lnz$2$i = $369 ? $367 : $lnz$0108$i;
        } while (0);
        $381 = HEAP32[$0 >> 2] | 0;
        if ($381 >>> 0 < (HEAP32[$1 >> 2] | 0) >>> 0) {
         HEAP32[$0 >> 2] = $381 + 1;
         $$3$be$i = HEAPU8[$381 >> 0] | 0;
        } else $$3$be$i = ___shgetc($f) | 0;
        $703 = $$3$be$i + -48 | 0;
        $702 = ($$3$be$i | 0) == 46;
        if (!($702 | $703 >>> 0 < 10)) {
         $$3$lcssa$i = $$3$be$i;
         $393 = $706;
         $394 = $708;
         $396 = $707;
         $397 = $709;
         $gotdig$3$lcssa$i = $gotdig$4$i;
         $gotrad$1$lcssa$i = $gotrad$2$i;
         $j$0$lcssa$i = $j$2$i;
         $k$0$lcssa$i = $k$2$i;
         $lnz$0$lcssa$i = $lnz$2$i;
         label = 161;
         break L203;
        } else {
         $$3113$i = $$3$be$i;
         $365 = $708;
         $366 = $709;
         $704 = $706;
         $705 = $707;
         $gotdig$3109$i = $gotdig$4$i;
         $gotrad$1110$i = $gotrad$2$i;
         $j$0112$i = $j$2$i;
         $k$0111$i = $k$2$i;
         $lnz$0108$i = $lnz$2$i;
        }
       }
       $714 = $712;
       $715 = $713;
       $716 = $710;
       $717 = $711;
       $718 = ($gotdig$3109$i$lcssa | 0) != 0;
       $j$077$i = $j$0112$i$lcssa;
       $k$073$i = $k$0111$i$lcssa;
       $lnz$067$i = $lnz$0108$i$lcssa;
       label = 169;
      } else {
       $$3$lcssa$i = $$2$i;
       $393 = $700;
       $394 = 0;
       $396 = $701;
       $397 = 0;
       $gotdig$3$lcssa$i = $gotdig$2$i$13;
       $gotrad$1$lcssa$i = $gotrad$0$i$14;
       $j$0$lcssa$i = 0;
       $k$0$lcssa$i = 0;
       $lnz$0$lcssa$i = 0;
       label = 161;
      } while (0);
      do if ((label | 0) == 161) {
       $392 = ($gotrad$1$lcssa$i | 0) == 0;
       $395 = $392 ? $394 : $393;
       $398 = $392 ? $397 : $396;
       $399 = ($gotdig$3$lcssa$i | 0) != 0;
       if (!(($$3$lcssa$i | 32 | 0) == 101 & $399)) if (($$3$lcssa$i | 0) > -1) {
        $714 = $394;
        $715 = $397;
        $716 = $395;
        $717 = $398;
        $718 = $399;
        $j$077$i = $j$0$lcssa$i;
        $k$073$i = $k$0$lcssa$i;
        $lnz$067$i = $lnz$0$lcssa$i;
        label = 169;
        break;
       } else {
        $719 = $394;
        $720 = $397;
        $721 = $399;
        $722 = $395;
        $723 = $398;
        $j$076$i = $j$0$lcssa$i;
        $k$072$i = $k$0$lcssa$i;
        $lnz$066$i = $lnz$0$lcssa$i;
        label = 171;
        break;
       }
       $402 = _scanexp($f, $pok) | 0;
       $403 = tempRet0;
       if (($402 | 0) == 0 & ($403 | 0) == -2147483648) {
        if (!$pok) {
         ___shlim($f, 0);
         $$1$i = 0.0;
         break;
        }
        if (!(HEAP32[$1 >> 2] | 0)) {
         $412 = 0;
         $413 = 0;
        } else {
         HEAP32[$0 >> 2] = (HEAP32[$0 >> 2] | 0) + -1;
         $412 = 0;
         $413 = 0;
        }
       } else {
        $412 = $402;
        $413 = $403;
       }
       $414 = _i64Add($412 | 0, $413 | 0, $395 | 0, $398 | 0) | 0;
       $426 = $414;
       $428 = $394;
       $429 = tempRet0;
       $431 = $397;
       $j$075$i = $j$0$lcssa$i;
       $k$071$i = $k$0$lcssa$i;
       $lnz$065$i = $lnz$0$lcssa$i;
       label = 173;
      } while (0);
      if ((label | 0) == 169) if (!(HEAP32[$1 >> 2] | 0)) {
       $719 = $714;
       $720 = $715;
       $721 = $718;
       $722 = $716;
       $723 = $717;
       $j$076$i = $j$077$i;
       $k$072$i = $k$073$i;
       $lnz$066$i = $lnz$067$i;
       label = 171;
      } else {
       HEAP32[$0 >> 2] = (HEAP32[$0 >> 2] | 0) + -1;
       if ($718) {
        $426 = $716;
        $428 = $714;
        $429 = $717;
        $431 = $715;
        $j$075$i = $j$077$i;
        $k$071$i = $k$073$i;
        $lnz$065$i = $lnz$067$i;
        label = 173;
       } else label = 172;
      }
      if ((label | 0) == 171) if ($721) {
       $426 = $722;
       $428 = $719;
       $429 = $723;
       $431 = $720;
       $j$075$i = $j$076$i;
       $k$071$i = $k$072$i;
       $lnz$065$i = $lnz$066$i;
       label = 173;
      } else label = 172;
      do if ((label | 0) == 172) {
       HEAP32[(___errno_location() | 0) >> 2] = 22;
       ___shlim($f, 0);
       $$1$i = 0.0;
      } else if ((label | 0) == 173) {
       $422 = HEAP32[$x$i >> 2] | 0;
       if (!$422) {
        $$1$i = +($sign$0 | 0) * 0.0;
        break;
       }
       if ((($431 | 0) < 0 | ($431 | 0) == 0 & $428 >>> 0 < 10) & (($426 | 0) == ($428 | 0) & ($429 | 0) == ($431 | 0))) if ($bits$0$ph >>> 0 > 30 | ($422 >>> $bits$0$ph | 0) == 0) {
        $$1$i = +($sign$0 | 0) * +($422 >>> 0);
        break;
       }
       $444 = ($emin$0$ph | 0) / -2 | 0;
       $446 = (($444 | 0) < 0) << 31 >> 31;
       if (($429 | 0) > ($446 | 0) | ($429 | 0) == ($446 | 0) & $426 >>> 0 > $444 >>> 0) {
        HEAP32[(___errno_location() | 0) >> 2] = 34;
        $$1$i = +($sign$0 | 0) * 1797693134862315708145274.0e284 * 1797693134862315708145274.0e284;
        break;
       }
       $456 = $emin$0$ph + -106 | 0;
       $458 = (($456 | 0) < 0) << 31 >> 31;
       if (($429 | 0) < ($458 | 0) | ($429 | 0) == ($458 | 0) & $426 >>> 0 < $456 >>> 0) {
        HEAP32[(___errno_location() | 0) >> 2] = 34;
        $$1$i = +($sign$0 | 0) * 2.2250738585072014e-308 * 2.2250738585072014e-308;
        break;
       }
       if (!$j$075$i) $k$3$i = $k$071$i; else {
        if (($j$075$i | 0) < 9) {
         $470 = $x$i + ($k$071$i << 2) | 0;
         $472 = HEAP32[$470 >> 2] | 0;
         $j$3102$i = $j$075$i;
         while (1) {
          $471 = $472 * 10 | 0;
          $j$3102$i = $j$3102$i + 1 | 0;
          if (($j$3102$i | 0) == 9) {
           $$lcssa265 = $471;
           break;
          } else $472 = $471;
         }
         HEAP32[$470 >> 2] = $$lcssa265;
        }
        $k$3$i = $k$071$i + 1 | 0;
       }
       if (($lnz$065$i | 0) < 9) if (($lnz$065$i | 0) <= ($426 | 0) & ($426 | 0) < 18) {
        if (($426 | 0) == 9) {
         $$1$i = +($sign$0 | 0) * +((HEAP32[$x$i >> 2] | 0) >>> 0);
         break;
        }
        if (($426 | 0) < 9) {
         $$1$i = +($sign$0 | 0) * +((HEAP32[$x$i >> 2] | 0) >>> 0) / +(HEAP32[604 + (8 - $426 << 2) >> 2] | 0);
         break;
        }
        $494 = $bits$0$ph + 27 + (Math_imul($426, -3) | 0) | 0;
        $$pre$i$17 = HEAP32[$x$i >> 2] | 0;
        if (($494 | 0) > 30 | ($$pre$i$17 >>> $494 | 0) == 0) {
         $$1$i = +($sign$0 | 0) * +($$pre$i$17 >>> 0) * +(HEAP32[604 + ($426 + -10 << 2) >> 2] | 0);
         break;
        }
       }
       $506 = ($426 | 0) % 9 | 0;
       if (!$506) {
        $a$2$ph46$i = 0;
        $e2$0$ph$i = 0;
        $rp$2$ph44$i = $426;
        $z$1$ph45$i = $k$3$i;
       } else {
        $510 = ($426 | 0) > -1 ? $506 : $506 + 9 | 0;
        $513 = HEAP32[604 + (8 - $510 << 2) >> 2] | 0;
        if (!$k$3$i) {
         $a$0$lcssa159$i = 0;
         $rp$0$lcssa160$i = $426;
         $z$0$i = 0;
        } else {
         $515 = 1e9 / ($513 | 0) | 0;
         $a$093$i = 0;
         $carry$095$i = 0;
         $k$494$i = 0;
         $rp$092$i = $426;
         while (1) {
          $516 = $x$i + ($k$494$i << 2) | 0;
          $517 = HEAP32[$516 >> 2] | 0;
          $520 = (($517 >>> 0) / ($513 >>> 0) | 0) + $carry$095$i | 0;
          HEAP32[$516 >> 2] = $520;
          $521 = Math_imul(($517 >>> 0) % ($513 >>> 0) | 0, $515) | 0;
          $or$cond21$i = ($k$494$i | 0) == ($a$093$i | 0) & ($520 | 0) == 0;
          $k$494$i = $k$494$i + 1 | 0;
          $rp$1$i$18 = $or$cond21$i ? $rp$092$i + -9 | 0 : $rp$092$i;
          $a$1$i = $or$cond21$i ? $k$494$i & 127 : $a$093$i;
          if (($k$494$i | 0) == ($k$3$i | 0)) {
           $$lcssa264 = $521;
           $a$1$i$lcssa = $a$1$i;
           $rp$1$i$18$lcssa = $rp$1$i$18;
           break;
          } else {
           $a$093$i = $a$1$i;
           $carry$095$i = $521;
           $rp$092$i = $rp$1$i$18;
          }
         }
         if (!$$lcssa264) {
          $a$0$lcssa159$i = $a$1$i$lcssa;
          $rp$0$lcssa160$i = $rp$1$i$18$lcssa;
          $z$0$i = $k$3$i;
         } else {
          HEAP32[$x$i + ($k$3$i << 2) >> 2] = $$lcssa264;
          $a$0$lcssa159$i = $a$1$i$lcssa;
          $rp$0$lcssa160$i = $rp$1$i$18$lcssa;
          $z$0$i = $k$3$i + 1 | 0;
         }
        }
        $a$2$ph46$i = $a$0$lcssa159$i;
        $e2$0$ph$i = 0;
        $rp$2$ph44$i = 9 - $510 + $rp$0$lcssa160$i | 0;
        $z$1$ph45$i = $z$0$i;
       }
       L284 : while (1) {
        $533 = ($rp$2$ph44$i | 0) < 18;
        $534 = ($rp$2$ph44$i | 0) == 18;
        $535 = $x$i + ($a$2$ph46$i << 2) | 0;
        $e2$0$i$19 = $e2$0$ph$i;
        $z$1$i = $z$1$ph45$i;
        while (1) {
         if (!$533) {
          if (!$534) {
           $a$4$ph$i = $a$2$ph46$i;
           $e2$1$ph$i = $e2$0$i$19;
           $rp$4$ph42$i = $rp$2$ph44$i;
           $z$6$ph$i = $z$1$i;
           break L284;
          }
          if ((HEAP32[$535 >> 2] | 0) >>> 0 >= 9007199) {
           $a$4$ph$i = $a$2$ph46$i;
           $e2$1$ph$i = $e2$0$i$19;
           $rp$4$ph42$i = 18;
           $z$6$ph$i = $z$1$i;
           break L284;
          }
         }
         $carry1$0$i = 0;
         $k$5$in$i = $z$1$i + 127 | 0;
         $z$2$i = $z$1$i;
         while (1) {
          $k$5$i = $k$5$in$i & 127;
          $539 = $x$i + ($k$5$i << 2) | 0;
          $541 = _bitshift64Shl(HEAP32[$539 >> 2] | 0, 0, 29) | 0;
          $543 = _i64Add($541 | 0, tempRet0 | 0, $carry1$0$i | 0, 0) | 0;
          $544 = tempRet0;
          $549 = $544 >>> 0 > 0 | ($544 | 0) == 0 & $543 >>> 0 > 1e9;
          $550 = ___udivdi3($543 | 0, $544 | 0, 1e9, 0) | 0;
          $552 = ___uremdi3($543 | 0, $544 | 0, 1e9, 0) | 0;
          $$sink$off0$i = $549 ? $552 : $543;
          $carry1$1$i = $549 ? $550 : 0;
          HEAP32[$539 >> 2] = $$sink$off0$i;
          $557 = ($k$5$i | 0) == ($a$2$ph46$i | 0);
          $z$3$i = ($k$5$i | 0) != ($z$2$i + 127 & 127 | 0) | $557 ? $z$2$i : ($$sink$off0$i | 0) == 0 ? $k$5$i : $z$2$i;
          if ($557) {
           $carry1$1$i$lcssa = $carry1$1$i;
           $z$3$i$lcssa = $z$3$i;
           break;
          } else {
           $carry1$0$i = $carry1$1$i;
           $k$5$in$i = $k$5$i + -1 | 0;
           $z$2$i = $z$3$i;
          }
         }
         $560 = $e2$0$i$19 + -29 | 0;
         if (!$carry1$1$i$lcssa) {
          $e2$0$i$19 = $560;
          $z$1$i = $z$3$i$lcssa;
         } else {
          $$lcssa263 = $560;
          $carry1$1$i$lcssa$lcssa = $carry1$1$i$lcssa;
          $z$3$i$lcssa$lcssa = $z$3$i$lcssa;
          break;
         }
        }
        $564 = $a$2$ph46$i + 127 & 127;
        if (($564 | 0) == ($z$3$i$lcssa$lcssa | 0)) {
         $567 = $z$3$i$lcssa$lcssa + 127 & 127;
         $572 = $x$i + (($z$3$i$lcssa$lcssa + 126 & 127) << 2) | 0;
         HEAP32[$572 >> 2] = HEAP32[$572 >> 2] | HEAP32[$x$i + ($567 << 2) >> 2];
         $z$4$i = $567;
        } else $z$4$i = $z$3$i$lcssa$lcssa;
        HEAP32[$x$i + ($564 << 2) >> 2] = $carry1$1$i$lcssa$lcssa;
        $a$2$ph46$i = $564;
        $e2$0$ph$i = $$lcssa263;
        $rp$2$ph44$i = $rp$2$ph44$i + 9 | 0;
        $z$1$ph45$i = $z$4$i;
       }
       L299 : while (1) {
        $603 = $z$6$ph$i + 1 & 127;
        $609 = $x$i + (($z$6$ph$i + 127 & 127) << 2) | 0;
        $a$4$ph165$i = $a$4$ph$i;
        $e2$1$ph164$i = $e2$1$ph$i;
        $rp$4$ph$i = $rp$4$ph42$i;
        while (1) {
         $610 = ($rp$4$ph$i | 0) == 18;
         $$24$i = ($rp$4$ph$i | 0) > 27 ? 9 : 1;
         $$not$i = $610 ^ 1;
         $a$4$i = $a$4$ph165$i;
         $e2$1$i = $e2$1$ph164$i;
         while (1) {
          $576 = $a$4$i & 127;
          $577 = ($576 | 0) == ($z$6$ph$i | 0);
          do if ($577) label = 217; else {
           $579 = HEAP32[$x$i + ($576 << 2) >> 2] | 0;
           if ($579 >>> 0 < 9007199) {
            label = 217;
            break;
           }
           if ($579 >>> 0 > 9007199) break;
           $583 = $a$4$i + 1 & 127;
           if (($583 | 0) == ($z$6$ph$i | 0)) {
            label = 217;
            break;
           }
           $691 = HEAP32[$x$i + ($583 << 2) >> 2] | 0;
           if ($691 >>> 0 < 254740991) {
            label = 217;
            break;
           }
           if (!($691 >>> 0 > 254740991 | $$not$i)) {
            $617 = $576;
            $a$4$i249 = $a$4$i;
            $e2$1$i246 = $e2$1$i;
            $z$10$i = $z$6$ph$i;
            break L299;
           }
          } while (0);
          if ((label | 0) == 217) {
           label = 0;
           if ($610) {
            label = 218;
            break L299;
           }
          }
          $585 = $e2$1$i + $$24$i | 0;
          if (($a$4$i | 0) == ($z$6$ph$i | 0)) {
           $a$4$i = $z$6$ph$i;
           $e2$1$i = $585;
          } else {
           $$lcssa256 = $585;
           $a$4$i$lcssa248 = $a$4$i;
           break;
          }
         }
         $588 = (1 << $$24$i) + -1 | 0;
         $589 = 1e9 >>> $$24$i;
         $a$586$i = $a$4$i$lcssa248;
         $carry4$089$i = 0;
         $k$687$i = $a$4$i$lcssa248;
         $rp$585$i = $rp$4$ph$i;
         while (1) {
          $590 = $x$i + ($k$687$i << 2) | 0;
          $591 = HEAP32[$590 >> 2] | 0;
          $594 = ($591 >>> $$24$i) + $carry4$089$i | 0;
          HEAP32[$590 >> 2] = $594;
          $595 = Math_imul($591 & $588, $589) | 0;
          $or$cond25$i = ($k$687$i | 0) == ($a$586$i | 0) & ($594 | 0) == 0;
          $k$687$i = $k$687$i + 1 & 127;
          $rp$6$i = $or$cond25$i ? $rp$585$i + -9 | 0 : $rp$585$i;
          $a$6$i = $or$cond25$i ? $k$687$i : $a$586$i;
          if (($k$687$i | 0) == ($z$6$ph$i | 0)) {
           $$lcssa257 = $595;
           $a$6$i$lcssa = $a$6$i;
           $rp$6$i$lcssa = $rp$6$i;
           break;
          } else {
           $a$586$i = $a$6$i;
           $carry4$089$i = $595;
           $rp$585$i = $rp$6$i;
          }
         }
         if (!$$lcssa257) {
          $a$4$ph165$i = $a$6$i$lcssa;
          $e2$1$ph164$i = $$lcssa256;
          $rp$4$ph$i = $rp$6$i$lcssa;
          continue;
         }
         if (($603 | 0) != ($a$6$i$lcssa | 0)) {
          $$lcssa256$lcssa = $$lcssa256;
          $$lcssa257$lcssa = $$lcssa257;
          $a$6$i$lcssa$lcssa = $a$6$i$lcssa;
          $rp$6$i$lcssa$lcssa = $rp$6$i$lcssa;
          break;
         }
         HEAP32[$609 >> 2] = HEAP32[$609 >> 2] | 1;
         $a$4$ph165$i = $a$6$i$lcssa;
         $e2$1$ph164$i = $$lcssa256;
         $rp$4$ph$i = $rp$6$i$lcssa;
        }
        HEAP32[$x$i + ($z$6$ph$i << 2) >> 2] = $$lcssa257$lcssa;
        $a$4$ph$i = $a$6$i$lcssa$lcssa;
        $e2$1$ph$i = $$lcssa256$lcssa;
        $rp$4$ph42$i = $rp$6$i$lcssa$lcssa;
        $z$6$ph$i = $603;
       }
       if ((label | 0) == 218) if ($577) {
        HEAP32[$x$i + ($603 + -1 << 2) >> 2] = 0;
        $617 = $z$6$ph$i;
        $a$4$i249 = $a$4$i;
        $e2$1$i246 = $e2$1$i;
        $z$10$i = $603;
       } else {
        $617 = $576;
        $a$4$i249 = $a$4$i;
        $e2$1$i246 = $e2$1$i;
        $z$10$i = $z$6$ph$i;
       }
       $619 = +((HEAP32[$x$i + ($617 << 2) >> 2] | 0) >>> 0);
       $621 = $a$4$i249 + 1 & 127;
       if (($621 | 0) == ($z$10$i | 0)) {
        $680 = $a$4$i249 + 2 & 127;
        HEAP32[$x$i + ($680 + -1 << 2) >> 2] = 0;
        $z$10$1$i = $680;
       } else $z$10$1$i = $z$10$i;
       $643 = +($sign$0 | 0);
       $625 = $643 * ($619 * 1.0e9 + +((HEAP32[$x$i + ($621 << 2) >> 2] | 0) >>> 0));
       $663 = $e2$1$i246 + 53 | 0;
       $669 = $663 - $emin$0$ph | 0;
       $670 = ($669 | 0) < ($bits$0$ph | 0);
       $denormal$0$i = $670 & 1;
       $$012$i = $670 ? (($669 | 0) < 0 ? 0 : $669) : $bits$0$ph;
       if (($$012$i | 0) < 53) {
        $626 = +_copysignl(+_scalbn(1.0, 105 - $$012$i | 0), $625);
        $629 = +_fmodl($625, +_scalbn(1.0, 53 - $$012$i | 0));
        $bias$0$i$25 = $626;
        $frac$0$i = $629;
        $y$1$i$24 = $626 + ($625 - $629);
       } else {
        $bias$0$i$25 = 0.0;
        $frac$0$i = 0.0;
        $y$1$i$24 = $625;
       }
       $633 = $a$4$i249 + 2 & 127;
       do if (($633 | 0) == ($z$10$1$i | 0)) $frac$3$i = $frac$0$i; else {
        $636 = HEAP32[$x$i + ($633 << 2) >> 2] | 0;
        do if ($636 >>> 0 < 5e8) {
         if (!$636) if (($a$4$i249 + 3 & 127 | 0) == ($z$10$1$i | 0)) {
          $frac$1$i = $frac$0$i;
          break;
         }
         $frac$1$i = $643 * .25 + $frac$0$i;
        } else {
         if ($636 >>> 0 > 5e8) {
          $frac$1$i = $643 * .75 + $frac$0$i;
          break;
         }
         if (($a$4$i249 + 3 & 127 | 0) == ($z$10$1$i | 0)) {
          $frac$1$i = $643 * .5 + $frac$0$i;
          break;
         } else {
          $frac$1$i = $643 * .75 + $frac$0$i;
          break;
         }
        } while (0);
        if ((53 - $$012$i | 0) <= 1) {
         $frac$3$i = $frac$1$i;
         break;
        }
        if (+_fmodl($frac$1$i, 1.0) != 0.0) {
         $frac$3$i = $frac$1$i;
         break;
        }
        $frac$3$i = $frac$1$i + 1.0;
       } while (0);
       $661 = $y$1$i$24 + $frac$3$i - $bias$0$i$25;
       do if (($663 & 2147483647 | 0) > (-2 - $sum$i | 0)) {
        if (!(+Math_abs(+$661) >= 9007199254740992.0)) {
         $denormal$2$i = $denormal$0$i;
         $e2$3$i = $e2$1$i246;
         $y$2$i$26 = $661;
        } else {
         $denormal$2$i = $670 & ($$012$i | 0) == ($669 | 0) ? 0 : $denormal$0$i;
         $e2$3$i = $e2$1$i246 + 1 | 0;
         $y$2$i$26 = $661 * .5;
        }
        if (($e2$3$i + 50 | 0) <= ($330 | 0)) if (!($frac$3$i != 0.0 & ($denormal$2$i | 0) != 0)) {
         $e2$4$i = $e2$3$i;
         $y$3$i = $y$2$i$26;
         break;
        }
        HEAP32[(___errno_location() | 0) >> 2] = 34;
        $e2$4$i = $e2$3$i;
        $y$3$i = $y$2$i$26;
       } else {
        $e2$4$i = $e2$1$i246;
        $y$3$i = $661;
       } while (0);
       $$1$i = +_scalbnl($y$3$i, $e2$4$i);
      } while (0);
      $$0 = $$1$i;
      break L4;
      break;
     }
    default:
     {
      if (HEAP32[$1 >> 2] | 0) HEAP32[$0 >> 2] = (HEAP32[$0 >> 2] | 0) + -1;
      HEAP32[(___errno_location() | 0) >> 2] = 22;
      ___shlim($f, 0);
      $$0 = 0.0;
      break L4;
     }
    }
   }
  } while (0);
  if ((label | 0) == 23) {
   $42 = (HEAP32[$1 >> 2] | 0) == 0;
   if (!$42) HEAP32[$0 >> 2] = (HEAP32[$0 >> 2] | 0) + -1;
   if (($pok | 0) != 0 & $i$0$lcssa >>> 0 > 3) {
    $i$1 = $i$0$lcssa;
    do {
     if (!$42) HEAP32[$0 >> 2] = (HEAP32[$0 >> 2] | 0) + -1;
     $i$1 = $i$1 + -1 | 0;
    } while ($i$1 >>> 0 > 3);
   }
  }
  $$0 = +($sign$0 | 0) * inf;
 } while (0);
 STACKTOP = sp;
 return +$$0;
}

function _printf_core($f, $fmt, $ap, $nl_arg, $nl_type) {
 $f = $f | 0;
 $fmt = $fmt | 0;
 $ap = $ap | 0;
 $nl_arg = $nl_arg | 0;
 $nl_type = $nl_type | 0;
 var $$0 = 0, $$0$i = 0, $$0$lcssa$i = 0, $$012$i = 0, $$013$i = 0, $$03$i$33 = 0, $$07$i = 0.0, $$1$i = 0.0, $$114$i = 0, $$2$i = 0.0, $$20$i = 0.0, $$210$i = 0, $$23$i = 0, $$25$i = 0, $$3$i = 0.0, $$311$i = 0, $$33$i = 0, $$4$i = 0.0, $$412$lcssa$i = 0, $$41279$i = 0, $$43 = 0, $$5$lcssa$i = 0, $$590$i = 0, $$a$3$i = 0, $$a$3189$i = 0, $$fl$4 = 0, $$lcssa162$i = 0, $$lcssa321 = 0, $$lcssa322 = 0, $$lcssa326 = 0, $$lcssa328 = 0, $$lcssa329 = 0, $$lcssa330 = 0, $$lcssa331 = 0, $$lcssa332 = 0, $$lcssa334 = 0, $$lcssa344 = 0, $$lcssa347 = 0.0, $$lcssa349 = 0, $$lcssa52 = 0, $$p$$i = 0, $$p$5 = 0, $$p$i = 0, $$pn$i = 0, $$pr$i = 0, $$pr50$i = 0, $$pre$phi187$iZ2D = 0, $$pre185$i = 0, $$z$4$i = 0, $0 = 0, $1 = 0, $10 = 0, $101 = 0, $102 = 0, $103 = 0, $108 = 0, $11 = 0, $110 = 0, $111 = 0, $113 = 0, $12 = 0, $13 = 0, $137 = 0, $138 = 0, $14 = 0, $141 = 0, $142 = 0, $143 = 0, $147 = 0, $149 = 0, $15 = 0, $151 = 0, $153 = 0, $154 = 0, $159 = 0, $162 = 0, $167 = 0, $168 = 0, $173 = 0, $180 = 0, $181 = 0, $192 = 0, $2 = 0, $204 = 0, $21 = 0, $211 = 0, $213 = 0, $216 = 0, $217 = 0, $22 = 0, $222 = 0, $228 = 0, $229 = 0, $235 = 0, $24 = 0, $248 = 0, $25 = 0, $250 = 0, $253 = 0, $258 = 0, $26 = 0, $261 = 0, $262 = 0, $272 = 0, $274 = 0, $276 = 0, $279 = 0, $28 = 0, $281 = 0, $282 = 0, $283 = 0, $289 = 0, $291 = 0, $292 = 0, $296 = 0, $3 = 0, $304 = 0, $31 = 0, $310 = 0, $32 = 0, $322 = 0, $325 = 0, $326 = 0, $339 = 0, $341 = 0, $346 = 0, $351 = 0, $354 = 0, $364 = 0.0, $37 = 0, $371 = 0, $375 = 0, $382 = 0, $384 = 0, $386 = 0, $387 = 0, $391 = 0, $397 = 0.0, $398 = 0, $4 = 0, $401 = 0, $403 = 0, $406 = 0, $408 = 0, $412 = 0.0, $42 = 0, $422 = 0, $425 = 0, $428 = 0, $43 = 0, $437 = 0, $439 = 0, $440 = 0, $446 = 0, $464 = 0, $469 = 0, $47 = 0, $474 = 0, $484 = 0, $485 = 0, $487 = 0, $488 = 0, $489 = 0, $49 = 0, $495 = 0, $497 = 0, $5 = 0, $50 = 0, $500 = 0, $502 = 0, $503 = 0, $504 = 0, $506 = 0, $510 = 0, $512 = 0, $516 = 0, $521 = 0, $522 = 0, $523 = 0, $524 = 0, $526 = 0, $532 = 0, $533 = 0, $534 = 0, $538 = 0, $54 = 0, $546 = 0, $560 = 0, $561 = 0, $564 = 0, $569 = 0, $570 = 0, $572 = 0, $580 = 0, $583 = 0, $586 = 0, $587 = 0, $588 = 0, $59 = 0, $591 = 0, $595 = 0, $6 = 0, $603 = 0, $606 = 0, $608 = 0, $610 = 0, $612 = 0, $617 = 0, $618 = 0, $62 = 0, $621 = 0, $623 = 0, $625 = 0, $627 = 0, $63 = 0, $638 = 0, $64 = 0, $641 = 0, $646 = 0, $655 = 0, $656 = 0, $660 = 0, $663 = 0, $665 = 0, $667 = 0, $671 = 0, $674 = 0, $678 = 0, $68 = 0, $688 = 0, $693 = 0, $7 = 0, $70 = 0, $700 = 0, $703 = 0, $711 = 0, $721 = 0, $723 = 0, $731 = 0, $738 = 0, $740 = 0, $744 = 0, $746 = 0, $755 = 0, $761 = 0, $776 = 0, $778 = 0, $791 = 0, $8 = 0, $802 = 0, $9 = 0, $94 = 0, $95 = 0, $a$0 = 0, $a$1 = 0, $a$1$lcssa$i = 0, $a$1150$i = 0, $a$2 = 0, $a$2$ph$i = 0, $a$3$lcssa$i = 0, $a$3137$i = 0, $a$5$lcssa$i = 0, $a$5112$i = 0, $a$6$i = 0, $a$8$i = 0, $a$9$ph$i = 0, $arg = 0, $argpos$0 = 0, $big$i = 0, $buf = 0, $buf$i = 0, $carry$0143$i = 0, $carry3$0131$i = 0, $cnt$0 = 0, $cnt$1 = 0, $cnt$1$lcssa = 0, $d$0$142$i = 0, $d$0144$i = 0, $d$1130$i = 0, $d$2$lcssa$i = 0, $d$2111$i = 0, $d$4$i = 0, $d$585$i = 0, $d$678$i = 0, $d$789$i = 0, $e$0126$i = 0, $e$1$i = 0, $e$2107$i = 0, $e$4$i = 0, $e$5$ph$i = 0, $e2$i = 0, $ebuf0$i = 0, $estr$0$i = 0, $estr$1$lcssa$i = 0, $estr$196$i = 0, $estr$2$i = 0, $fl$0103 = 0, $fl$056 = 0, $fl$1 = 0, $fl$1$ = 0, $fl$3 = 0, $fl$4 = 0, $fl$6 = 0, $i$0$lcssa = 0, $i$0$lcssa197 = 0, $i$0108 = 0, $i$0125$i = 0, $i$03$i = 0, $i$03$i$25 = 0, $i$1$lcssa$i = 0, $i$1119 = 0, $i$1119$i = 0, $i$2106$i = 0, $i$295 = 0, $i$295$lcssa = 0, $i$3102$i = 0, $i$393 = 0, $isdigittmp = 0, $isdigittmp$1$i = 0, $isdigittmp$1$i$22 = 0, $isdigittmp11 = 0, $isdigittmp4$i = 0, $isdigittmp4$i$24 = 0, $isdigittmp9 = 0, $j$0$118$i = 0, $j$0120$i = 0, $j$1103$i = 0, $j$2$i = 0, $l$0 = 0, $l$0$i = 0, $l$1107 = 0, $l$2 = 0, $l10n$0 = 0, $l10n$0$lcssa = 0, $l10n$1 = 0, $l10n$2 = 0, $l10n$3 = 0, $mb = 0, $notrhs$i = 0, $p$0 = 0, $p$1 = 0, $p$2 = 0, $p$4195 = 0, $p$5 = 0, $pl$0 = 0, $pl$0$i = 0, $pl$1 = 0, $pl$1$i = 0, $pl$2 = 0, $prefix$0 = 0, $prefix$0$$i = 0, $prefix$0$i = 0, $prefix$1 = 0, $prefix$2 = 0, $r$0$a$9$i = 0, $re$172$i = 0, $round$071$i = 0.0, $round6$1$i = 0.0, $s$0$i = 0, $s$1$i = 0, $s$1$i$lcssa = 0, $s7$082$i = 0, $s7$1$i = 0, $s8$0$lcssa$i = 0, $s8$073$i = 0, $s9$0$i = 0, $s9$186$i = 0, $s9$2$i = 0, $small$0$i = 0.0, $small$1$i = 0.0, $st$0 = 0, $st$0$lcssa327 = 0, $storemerge = 0, $storemerge$13 = 0, $storemerge$8102 = 0, $storemerge$854 = 0, $t$0 = 0, $t$1 = 0, $w$0 = 0, $w$1 = 0, $w$2 = 0, $wc = 0, $ws$0109 = 0, $ws$1120 = 0, $z$0$i = 0, $z$0$lcssa = 0, $z$096 = 0, $z$1$lcssa$i = 0, $z$1149$i = 0, $z$2 = 0, $z$2$i = 0, $z$2$i$lcssa = 0, $z$3$lcssa$i = 0, $z$3136$i = 0, $z$4$i = 0, $z$7$$i = 0, $z$7$i = 0, $z$7$i$lcssa = 0, $z$7$ph$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 624 | 0;
 $big$i = sp + 24 | 0;
 $e2$i = sp + 16 | 0;
 $buf$i = sp + 588 | 0;
 $ebuf0$i = sp + 576 | 0;
 $arg = sp;
 $buf = sp + 536 | 0;
 $wc = sp + 8 | 0;
 $mb = sp + 528 | 0;
 $0 = ($f | 0) != 0;
 $1 = $buf + 40 | 0;
 $2 = $1;
 $3 = $buf + 39 | 0;
 $4 = $wc + 4 | 0;
 $5 = $ebuf0$i + 12 | 0;
 $6 = $ebuf0$i + 11 | 0;
 $7 = $buf$i;
 $8 = $5;
 $9 = $8 - $7 | 0;
 $10 = -2 - $7 | 0;
 $11 = $8 + 2 | 0;
 $12 = $big$i + 288 | 0;
 $13 = $buf$i + 9 | 0;
 $14 = $13;
 $15 = $buf$i + 8 | 0;
 $22 = $fmt;
 $cnt$0 = 0;
 $l$0 = 0;
 $l10n$0 = 0;
 L1 : while (1) {
  do if (($cnt$0 | 0) > -1) if (($l$0 | 0) > (2147483647 - $cnt$0 | 0)) {
   HEAP32[(___errno_location() | 0) >> 2] = 75;
   $cnt$1 = -1;
   break;
  } else {
   $cnt$1 = $l$0 + $cnt$0 | 0;
   break;
  } else $cnt$1 = $cnt$0; while (0);
  $21 = HEAP8[$22 >> 0] | 0;
  if (!($21 << 24 >> 24)) {
   $cnt$1$lcssa = $cnt$1;
   $l10n$0$lcssa = $l10n$0;
   label = 242;
   break;
  } else {
   $24 = $21;
   $26 = $22;
  }
  L9 : while (1) {
   switch ($24 << 24 >> 24) {
   case 37:
    {
     $28 = $26;
     $z$096 = $26;
     label = 9;
     break L9;
     break;
    }
   case 0:
    {
     $$lcssa52 = $26;
     $z$0$lcssa = $26;
     break L9;
     break;
    }
   default:
    {}
   }
   $25 = $26 + 1 | 0;
   $24 = HEAP8[$25 >> 0] | 0;
   $26 = $25;
  }
  L12 : do if ((label | 0) == 9) while (1) {
   label = 0;
   if ((HEAP8[$28 + 1 >> 0] | 0) != 37) {
    $$lcssa52 = $28;
    $z$0$lcssa = $z$096;
    break L12;
   }
   $31 = $z$096 + 1 | 0;
   $32 = $28 + 2 | 0;
   if ((HEAP8[$32 >> 0] | 0) == 37) {
    $28 = $32;
    $z$096 = $31;
    label = 9;
   } else {
    $$lcssa52 = $32;
    $z$0$lcssa = $31;
    break;
   }
  } while (0);
  $37 = $z$0$lcssa - $22 | 0;
  if ($0) if (!(HEAP32[$f >> 2] & 32)) ___fwritex($22, $37, $f) | 0;
  if (($z$0$lcssa | 0) != ($22 | 0)) {
   $22 = $$lcssa52;
   $cnt$0 = $cnt$1;
   $l$0 = $37;
   continue;
  }
  $42 = $$lcssa52 + 1 | 0;
  $43 = HEAP8[$42 >> 0] | 0;
  $isdigittmp = ($43 << 24 >> 24) + -48 | 0;
  if ($isdigittmp >>> 0 < 10) {
   $47 = (HEAP8[$$lcssa52 + 2 >> 0] | 0) == 36;
   $$43 = $47 ? $$lcssa52 + 3 | 0 : $42;
   $50 = HEAP8[$$43 >> 0] | 0;
   $argpos$0 = $47 ? $isdigittmp : -1;
   $l10n$1 = $47 ? 1 : $l10n$0;
   $storemerge = $$43;
  } else {
   $50 = $43;
   $argpos$0 = -1;
   $l10n$1 = $l10n$0;
   $storemerge = $42;
  }
  $49 = $50 << 24 >> 24;
  L25 : do if (($49 & -32 | 0) == 32) {
   $54 = $49;
   $59 = $50;
   $fl$0103 = 0;
   $storemerge$8102 = $storemerge;
   while (1) {
    if (!(1 << $54 + -32 & 75913)) {
     $68 = $59;
     $fl$056 = $fl$0103;
     $storemerge$854 = $storemerge$8102;
     break L25;
    }
    $62 = 1 << ($59 << 24 >> 24) + -32 | $fl$0103;
    $63 = $storemerge$8102 + 1 | 0;
    $64 = HEAP8[$63 >> 0] | 0;
    $54 = $64 << 24 >> 24;
    if (($54 & -32 | 0) != 32) {
     $68 = $64;
     $fl$056 = $62;
     $storemerge$854 = $63;
     break;
    } else {
     $59 = $64;
     $fl$0103 = $62;
     $storemerge$8102 = $63;
    }
   }
  } else {
   $68 = $50;
   $fl$056 = 0;
   $storemerge$854 = $storemerge;
  } while (0);
  do if ($68 << 24 >> 24 == 42) {
   $70 = $storemerge$854 + 1 | 0;
   $isdigittmp11 = (HEAP8[$70 >> 0] | 0) + -48 | 0;
   if ($isdigittmp11 >>> 0 < 10) if ((HEAP8[$storemerge$854 + 2 >> 0] | 0) == 36) {
    HEAP32[$nl_type + ($isdigittmp11 << 2) >> 2] = 10;
    $l10n$2 = 1;
    $storemerge$13 = $storemerge$854 + 3 | 0;
    $w$0 = HEAP32[$nl_arg + ((HEAP8[$70 >> 0] | 0) + -48 << 3) >> 2] | 0;
   } else label = 24; else label = 24;
   if ((label | 0) == 24) {
    label = 0;
    if ($l10n$1) {
     $$0 = -1;
     break L1;
    }
    if (!$0) {
     $108 = $70;
     $fl$1 = $fl$056;
     $l10n$3 = 0;
     $w$1 = 0;
     break;
    }
    $94 = (HEAP32[$ap >> 2] | 0) + (4 - 1) & ~(4 - 1);
    $95 = HEAP32[$94 >> 2] | 0;
    HEAP32[$ap >> 2] = $94 + 4;
    $l10n$2 = 0;
    $storemerge$13 = $70;
    $w$0 = $95;
   }
   if (($w$0 | 0) < 0) {
    $108 = $storemerge$13;
    $fl$1 = $fl$056 | 8192;
    $l10n$3 = $l10n$2;
    $w$1 = 0 - $w$0 | 0;
   } else {
    $108 = $storemerge$13;
    $fl$1 = $fl$056;
    $l10n$3 = $l10n$2;
    $w$1 = $w$0;
   }
  } else {
   $isdigittmp$1$i = ($68 << 24 >> 24) + -48 | 0;
   if ($isdigittmp$1$i >>> 0 < 10) {
    $103 = $storemerge$854;
    $i$03$i = 0;
    $isdigittmp4$i = $isdigittmp$1$i;
    while (1) {
     $101 = ($i$03$i * 10 | 0) + $isdigittmp4$i | 0;
     $102 = $103 + 1 | 0;
     $isdigittmp4$i = (HEAP8[$102 >> 0] | 0) + -48 | 0;
     if ($isdigittmp4$i >>> 0 >= 10) {
      $$lcssa321 = $101;
      $$lcssa322 = $102;
      break;
     } else {
      $103 = $102;
      $i$03$i = $101;
     }
    }
    if (($$lcssa321 | 0) < 0) {
     $$0 = -1;
     break L1;
    } else {
     $108 = $$lcssa322;
     $fl$1 = $fl$056;
     $l10n$3 = $l10n$1;
     $w$1 = $$lcssa321;
    }
   } else {
    $108 = $storemerge$854;
    $fl$1 = $fl$056;
    $l10n$3 = $l10n$1;
    $w$1 = 0;
   }
  } while (0);
  L46 : do if ((HEAP8[$108 >> 0] | 0) == 46) {
   $110 = $108 + 1 | 0;
   $111 = HEAP8[$110 >> 0] | 0;
   if ($111 << 24 >> 24 != 42) {
    $isdigittmp$1$i$22 = ($111 << 24 >> 24) + -48 | 0;
    if ($isdigittmp$1$i$22 >>> 0 < 10) {
     $143 = $110;
     $i$03$i$25 = 0;
     $isdigittmp4$i$24 = $isdigittmp$1$i$22;
    } else {
     $802 = $110;
     $p$0 = 0;
     break;
    }
    while (1) {
     $141 = ($i$03$i$25 * 10 | 0) + $isdigittmp4$i$24 | 0;
     $142 = $143 + 1 | 0;
     $isdigittmp4$i$24 = (HEAP8[$142 >> 0] | 0) + -48 | 0;
     if ($isdigittmp4$i$24 >>> 0 >= 10) {
      $802 = $142;
      $p$0 = $141;
      break L46;
     } else {
      $143 = $142;
      $i$03$i$25 = $141;
     }
    }
   }
   $113 = $108 + 2 | 0;
   $isdigittmp9 = (HEAP8[$113 >> 0] | 0) + -48 | 0;
   if ($isdigittmp9 >>> 0 < 10) if ((HEAP8[$108 + 3 >> 0] | 0) == 36) {
    HEAP32[$nl_type + ($isdigittmp9 << 2) >> 2] = 10;
    $802 = $108 + 4 | 0;
    $p$0 = HEAP32[$nl_arg + ((HEAP8[$113 >> 0] | 0) + -48 << 3) >> 2] | 0;
    break;
   }
   if ($l10n$3) {
    $$0 = -1;
    break L1;
   }
   if ($0) {
    $137 = (HEAP32[$ap >> 2] | 0) + (4 - 1) & ~(4 - 1);
    $138 = HEAP32[$137 >> 2] | 0;
    HEAP32[$ap >> 2] = $137 + 4;
    $802 = $113;
    $p$0 = $138;
   } else {
    $802 = $113;
    $p$0 = 0;
   }
  } else {
   $802 = $108;
   $p$0 = -1;
  } while (0);
  $147 = $802;
  $st$0 = 0;
  while (1) {
   $149 = (HEAP8[$147 >> 0] | 0) + -65 | 0;
   if ($149 >>> 0 > 57) {
    $$0 = -1;
    break L1;
   }
   $151 = $147 + 1 | 0;
   $153 = HEAP8[9368 + ($st$0 * 58 | 0) + $149 >> 0] | 0;
   $154 = $153 & 255;
   if (($154 + -1 | 0) >>> 0 < 8) {
    $147 = $151;
    $st$0 = $154;
   } else {
    $$lcssa326 = $147;
    $$lcssa328 = $151;
    $$lcssa329 = $153;
    $$lcssa330 = $154;
    $st$0$lcssa327 = $st$0;
    break;
   }
  }
  if (!($$lcssa329 << 24 >> 24)) {
   $$0 = -1;
   break;
  }
  $159 = ($argpos$0 | 0) > -1;
  do if ($$lcssa329 << 24 >> 24 == 19) if ($159) {
   $$0 = -1;
   break L1;
  } else label = 52; else {
   if ($159) {
    HEAP32[$nl_type + ($argpos$0 << 2) >> 2] = $$lcssa330;
    $162 = $nl_arg + ($argpos$0 << 3) | 0;
    $167 = HEAP32[$162 + 4 >> 2] | 0;
    $168 = $arg;
    HEAP32[$168 >> 2] = HEAP32[$162 >> 2];
    HEAP32[$168 + 4 >> 2] = $167;
    label = 52;
    break;
   }
   if (!$0) {
    $$0 = 0;
    break L1;
   }
   _pop_arg_424($arg, $$lcssa330, $ap);
  } while (0);
  if ((label | 0) == 52) {
   label = 0;
   if (!$0) {
    $22 = $$lcssa328;
    $cnt$0 = $cnt$1;
    $l$0 = $37;
    $l10n$0 = $l10n$3;
    continue;
   }
  }
  $173 = HEAP8[$$lcssa326 >> 0] | 0;
  $t$0 = ($st$0$lcssa327 | 0) != 0 & ($173 & 15 | 0) == 3 ? $173 & -33 : $173;
  $180 = $fl$1 & -65537;
  $fl$1$ = ($fl$1 & 8192 | 0) == 0 ? $fl$1 : $180;
  L75 : do switch ($t$0 | 0) {
  case 110:
   {
    switch ($st$0$lcssa327 | 0) {
    case 0:
     {
      HEAP32[HEAP32[$arg >> 2] >> 2] = $cnt$1;
      $22 = $$lcssa328;
      $cnt$0 = $cnt$1;
      $l$0 = $37;
      $l10n$0 = $l10n$3;
      continue L1;
      break;
     }
    case 1:
     {
      HEAP32[HEAP32[$arg >> 2] >> 2] = $cnt$1;
      $22 = $$lcssa328;
      $cnt$0 = $cnt$1;
      $l$0 = $37;
      $l10n$0 = $l10n$3;
      continue L1;
      break;
     }
    case 2:
     {
      $192 = HEAP32[$arg >> 2] | 0;
      HEAP32[$192 >> 2] = $cnt$1;
      HEAP32[$192 + 4 >> 2] = (($cnt$1 | 0) < 0) << 31 >> 31;
      $22 = $$lcssa328;
      $cnt$0 = $cnt$1;
      $l$0 = $37;
      $l10n$0 = $l10n$3;
      continue L1;
      break;
     }
    case 3:
     {
      HEAP16[HEAP32[$arg >> 2] >> 1] = $cnt$1;
      $22 = $$lcssa328;
      $cnt$0 = $cnt$1;
      $l$0 = $37;
      $l10n$0 = $l10n$3;
      continue L1;
      break;
     }
    case 4:
     {
      HEAP8[HEAP32[$arg >> 2] >> 0] = $cnt$1;
      $22 = $$lcssa328;
      $cnt$0 = $cnt$1;
      $l$0 = $37;
      $l10n$0 = $l10n$3;
      continue L1;
      break;
     }
    case 6:
     {
      HEAP32[HEAP32[$arg >> 2] >> 2] = $cnt$1;
      $22 = $$lcssa328;
      $cnt$0 = $cnt$1;
      $l$0 = $37;
      $l10n$0 = $l10n$3;
      continue L1;
      break;
     }
    case 7:
     {
      $204 = HEAP32[$arg >> 2] | 0;
      HEAP32[$204 >> 2] = $cnt$1;
      HEAP32[$204 + 4 >> 2] = (($cnt$1 | 0) < 0) << 31 >> 31;
      $22 = $$lcssa328;
      $cnt$0 = $cnt$1;
      $l$0 = $37;
      $l10n$0 = $l10n$3;
      continue L1;
      break;
     }
    default:
     {
      $22 = $$lcssa328;
      $cnt$0 = $cnt$1;
      $l$0 = $37;
      $l10n$0 = $l10n$3;
      continue L1;
     }
    }
    break;
   }
  case 112:
   {
    $fl$3 = $fl$1$ | 8;
    $p$1 = $p$0 >>> 0 > 8 ? $p$0 : 8;
    $t$1 = 120;
    label = 64;
    break;
   }
  case 88:
  case 120:
   {
    $fl$3 = $fl$1$;
    $p$1 = $p$0;
    $t$1 = $t$0;
    label = 64;
    break;
   }
  case 111:
   {
    $248 = $arg;
    $250 = HEAP32[$248 >> 2] | 0;
    $253 = HEAP32[$248 + 4 >> 2] | 0;
    if (($250 | 0) == 0 & ($253 | 0) == 0) $$0$lcssa$i = $1; else {
     $$03$i$33 = $1;
     $258 = $250;
     $262 = $253;
     while (1) {
      $261 = $$03$i$33 + -1 | 0;
      HEAP8[$261 >> 0] = $258 & 7 | 48;
      $258 = _bitshift64Lshr($258 | 0, $262 | 0, 3) | 0;
      $262 = tempRet0;
      if (($258 | 0) == 0 & ($262 | 0) == 0) {
       $$0$lcssa$i = $261;
       break;
      } else $$03$i$33 = $261;
     }
    }
    if (!($fl$1$ & 8)) {
     $a$0 = $$0$lcssa$i;
     $fl$4 = $fl$1$;
     $p$2 = $p$0;
     $pl$1 = 0;
     $prefix$1 = 9848;
     label = 77;
    } else {
     $272 = $2 - $$0$lcssa$i + 1 | 0;
     $a$0 = $$0$lcssa$i;
     $fl$4 = $fl$1$;
     $p$2 = ($p$0 | 0) < ($272 | 0) ? $272 : $p$0;
     $pl$1 = 0;
     $prefix$1 = 9848;
     label = 77;
    }
    break;
   }
  case 105:
  case 100:
   {
    $274 = $arg;
    $276 = HEAP32[$274 >> 2] | 0;
    $279 = HEAP32[$274 + 4 >> 2] | 0;
    if (($279 | 0) < 0) {
     $281 = _i64Subtract(0, 0, $276 | 0, $279 | 0) | 0;
     $282 = tempRet0;
     $283 = $arg;
     HEAP32[$283 >> 2] = $281;
     HEAP32[$283 + 4 >> 2] = $282;
     $291 = $281;
     $292 = $282;
     $pl$0 = 1;
     $prefix$0 = 9848;
     label = 76;
     break L75;
    }
    if (!($fl$1$ & 2048)) {
     $289 = $fl$1$ & 1;
     $291 = $276;
     $292 = $279;
     $pl$0 = $289;
     $prefix$0 = ($289 | 0) == 0 ? 9848 : 9850;
     label = 76;
    } else {
     $291 = $276;
     $292 = $279;
     $pl$0 = 1;
     $prefix$0 = 9849;
     label = 76;
    }
    break;
   }
  case 117:
   {
    $181 = $arg;
    $291 = HEAP32[$181 >> 2] | 0;
    $292 = HEAP32[$181 + 4 >> 2] | 0;
    $pl$0 = 0;
    $prefix$0 = 9848;
    label = 76;
    break;
   }
  case 99:
   {
    HEAP8[$3 >> 0] = HEAP32[$arg >> 2];
    $a$2 = $3;
    $fl$6 = $180;
    $p$5 = 1;
    $pl$2 = 0;
    $prefix$2 = 9848;
    $z$2 = $1;
    break;
   }
  case 109:
   {
    $a$1 = _strerror(HEAP32[(___errno_location() | 0) >> 2] | 0) | 0;
    label = 82;
    break;
   }
  case 115:
   {
    $322 = HEAP32[$arg >> 2] | 0;
    $a$1 = ($322 | 0) != 0 ? $322 : 9858;
    label = 82;
    break;
   }
  case 67:
   {
    HEAP32[$wc >> 2] = HEAP32[$arg >> 2];
    HEAP32[$4 >> 2] = 0;
    HEAP32[$arg >> 2] = $wc;
    $p$4195 = -1;
    label = 86;
    break;
   }
  case 83:
   {
    if (!$p$0) {
     _pad($f, 32, $w$1, 0, $fl$1$);
     $i$0$lcssa197 = 0;
     label = 98;
    } else {
     $p$4195 = $p$0;
     label = 86;
    }
    break;
   }
  case 65:
  case 71:
  case 70:
  case 69:
  case 97:
  case 103:
  case 102:
  case 101:
   {
    $364 = +HEAPF64[$arg >> 3];
    HEAP32[$e2$i >> 2] = 0;
    HEAPF64[tempDoublePtr >> 3] = $364;
    if ((HEAP32[tempDoublePtr + 4 >> 2] | 0) < 0) {
     $$07$i = -$364;
     $pl$0$i = 1;
     $prefix$0$i = 9865;
    } else if (!($fl$1$ & 2048)) {
     $371 = $fl$1$ & 1;
     $$07$i = $364;
     $pl$0$i = $371;
     $prefix$0$i = ($371 | 0) == 0 ? 9866 : 9871;
    } else {
     $$07$i = $364;
     $pl$0$i = 1;
     $prefix$0$i = 9868;
    }
    HEAPF64[tempDoublePtr >> 3] = $$07$i;
    $375 = HEAP32[tempDoublePtr + 4 >> 2] & 2146435072;
    do if ($375 >>> 0 < 2146435072 | ($375 | 0) == 2146435072 & 0 < 0) {
     $397 = +_frexpl($$07$i, $e2$i) * 2.0;
     $398 = $397 != 0.0;
     if ($398) HEAP32[$e2$i >> 2] = (HEAP32[$e2$i >> 2] | 0) + -1;
     $401 = $t$0 | 32;
     if (($401 | 0) == 97) {
      $403 = $t$0 & 32;
      $prefix$0$$i = ($403 | 0) == 0 ? $prefix$0$i : $prefix$0$i + 9 | 0;
      $406 = $pl$0$i | 2;
      $408 = 12 - $p$0 | 0;
      do if ($p$0 >>> 0 > 11 | ($408 | 0) == 0) $$1$i = $397; else {
       $re$172$i = $408;
       $round$071$i = 8.0;
       while (1) {
        $re$172$i = $re$172$i + -1 | 0;
        $412 = $round$071$i * 16.0;
        if (!$re$172$i) {
         $$lcssa347 = $412;
         break;
        } else $round$071$i = $412;
       }
       if ((HEAP8[$prefix$0$$i >> 0] | 0) == 45) {
        $$1$i = -($$lcssa347 + (-$397 - $$lcssa347));
        break;
       } else {
        $$1$i = $397 + $$lcssa347 - $$lcssa347;
        break;
       }
      } while (0);
      $422 = HEAP32[$e2$i >> 2] | 0;
      $425 = ($422 | 0) < 0 ? 0 - $422 | 0 : $422;
      $428 = _fmt_u($425, (($425 | 0) < 0) << 31 >> 31, $5) | 0;
      if (($428 | 0) == ($5 | 0)) {
       HEAP8[$6 >> 0] = 48;
       $estr$0$i = $6;
      } else $estr$0$i = $428;
      HEAP8[$estr$0$i + -1 >> 0] = ($422 >> 31 & 2) + 43;
      $437 = $estr$0$i + -2 | 0;
      HEAP8[$437 >> 0] = $t$0 + 15;
      $notrhs$i = ($p$0 | 0) < 1;
      $439 = ($fl$1$ & 8 | 0) == 0;
      $$2$i = $$1$i;
      $s$0$i = $buf$i;
      while (1) {
       $440 = ~~$$2$i;
       $446 = $s$0$i + 1 | 0;
       HEAP8[$s$0$i >> 0] = HEAPU8[9832 + $440 >> 0] | $403;
       $$2$i = ($$2$i - +($440 | 0)) * 16.0;
       do if (($446 - $7 | 0) == 1) {
        if ($439 & ($notrhs$i & $$2$i == 0.0)) {
         $s$1$i = $446;
         break;
        }
        HEAP8[$446 >> 0] = 46;
        $s$1$i = $s$0$i + 2 | 0;
       } else $s$1$i = $446; while (0);
       if (!($$2$i != 0.0)) {
        $s$1$i$lcssa = $s$1$i;
        break;
       } else $s$0$i = $s$1$i;
      }
      $$pre185$i = $s$1$i$lcssa;
      $l$0$i = ($p$0 | 0) != 0 & ($10 + $$pre185$i | 0) < ($p$0 | 0) ? $11 + $p$0 - $437 | 0 : $9 - $437 + $$pre185$i | 0;
      $464 = $l$0$i + $406 | 0;
      _pad($f, 32, $w$1, $464, $fl$1$);
      if (!(HEAP32[$f >> 2] & 32)) ___fwritex($prefix$0$$i, $406, $f) | 0;
      _pad($f, 48, $w$1, $464, $fl$1$ ^ 65536);
      $469 = $$pre185$i - $7 | 0;
      if (!(HEAP32[$f >> 2] & 32)) ___fwritex($buf$i, $469, $f) | 0;
      $474 = $8 - $437 | 0;
      _pad($f, 48, $l$0$i - ($469 + $474) | 0, 0, 0);
      if (!(HEAP32[$f >> 2] & 32)) ___fwritex($437, $474, $f) | 0;
      _pad($f, 32, $w$1, $464, $fl$1$ ^ 8192);
      $$0$i = ($464 | 0) < ($w$1 | 0) ? $w$1 : $464;
      break;
     }
     $$p$i = ($p$0 | 0) < 0 ? 6 : $p$0;
     if ($398) {
      $484 = (HEAP32[$e2$i >> 2] | 0) + -28 | 0;
      HEAP32[$e2$i >> 2] = $484;
      $$3$i = $397 * 268435456.0;
      $485 = $484;
     } else {
      $$3$i = $397;
      $485 = HEAP32[$e2$i >> 2] | 0;
     }
     $$33$i = ($485 | 0) < 0 ? $big$i : $12;
     $487 = $$33$i;
     $$4$i = $$3$i;
     $z$0$i = $$33$i;
     while (1) {
      $488 = ~~$$4$i >>> 0;
      HEAP32[$z$0$i >> 2] = $488;
      $489 = $z$0$i + 4 | 0;
      $$4$i = ($$4$i - +($488 >>> 0)) * 1.0e9;
      if (!($$4$i != 0.0)) {
       $$lcssa331 = $489;
       break;
      } else $z$0$i = $489;
     }
     $$pr$i = HEAP32[$e2$i >> 2] | 0;
     if (($$pr$i | 0) > 0) {
      $495 = $$pr$i;
      $a$1150$i = $$33$i;
      $z$1149$i = $$lcssa331;
      while (1) {
       $497 = ($495 | 0) > 29 ? 29 : $495;
       $d$0$142$i = $z$1149$i + -4 | 0;
       do if ($d$0$142$i >>> 0 < $a$1150$i >>> 0) $a$2$ph$i = $a$1150$i; else {
        $carry$0143$i = 0;
        $d$0144$i = $d$0$142$i;
        while (1) {
         $500 = _bitshift64Shl(HEAP32[$d$0144$i >> 2] | 0, 0, $497 | 0) | 0;
         $502 = _i64Add($500 | 0, tempRet0 | 0, $carry$0143$i | 0, 0) | 0;
         $503 = tempRet0;
         $504 = ___uremdi3($502 | 0, $503 | 0, 1e9, 0) | 0;
         HEAP32[$d$0144$i >> 2] = $504;
         $506 = ___udivdi3($502 | 0, $503 | 0, 1e9, 0) | 0;
         $d$0144$i = $d$0144$i + -4 | 0;
         if ($d$0144$i >>> 0 < $a$1150$i >>> 0) {
          $$lcssa332 = $506;
          break;
         } else $carry$0143$i = $506;
        }
        if (!$$lcssa332) {
         $a$2$ph$i = $a$1150$i;
         break;
        }
        $510 = $a$1150$i + -4 | 0;
        HEAP32[$510 >> 2] = $$lcssa332;
        $a$2$ph$i = $510;
       } while (0);
       $z$2$i = $z$1149$i;
       while (1) {
        if ($z$2$i >>> 0 <= $a$2$ph$i >>> 0) {
         $z$2$i$lcssa = $z$2$i;
         break;
        }
        $512 = $z$2$i + -4 | 0;
        if (!(HEAP32[$512 >> 2] | 0)) $z$2$i = $512; else {
         $z$2$i$lcssa = $z$2$i;
         break;
        }
       }
       $516 = (HEAP32[$e2$i >> 2] | 0) - $497 | 0;
       HEAP32[$e2$i >> 2] = $516;
       if (($516 | 0) > 0) {
        $495 = $516;
        $a$1150$i = $a$2$ph$i;
        $z$1149$i = $z$2$i$lcssa;
       } else {
        $$pr50$i = $516;
        $a$1$lcssa$i = $a$2$ph$i;
        $z$1$lcssa$i = $z$2$i$lcssa;
        break;
       }
      }
     } else {
      $$pr50$i = $$pr$i;
      $a$1$lcssa$i = $$33$i;
      $z$1$lcssa$i = $$lcssa331;
     }
     if (($$pr50$i | 0) < 0) {
      $521 = (($$p$i + 25 | 0) / 9 | 0) + 1 | 0;
      $522 = ($401 | 0) == 102;
      $524 = $$pr50$i;
      $a$3137$i = $a$1$lcssa$i;
      $z$3136$i = $z$1$lcssa$i;
      while (1) {
       $523 = 0 - $524 | 0;
       $526 = ($523 | 0) > 9 ? 9 : $523;
       do if ($a$3137$i >>> 0 < $z$3136$i >>> 0) {
        $532 = (1 << $526) + -1 | 0;
        $533 = 1e9 >>> $526;
        $carry3$0131$i = 0;
        $d$1130$i = $a$3137$i;
        while (1) {
         $534 = HEAP32[$d$1130$i >> 2] | 0;
         HEAP32[$d$1130$i >> 2] = ($534 >>> $526) + $carry3$0131$i;
         $538 = Math_imul($534 & $532, $533) | 0;
         $d$1130$i = $d$1130$i + 4 | 0;
         if ($d$1130$i >>> 0 >= $z$3136$i >>> 0) {
          $$lcssa334 = $538;
          break;
         } else $carry3$0131$i = $538;
        }
        $$a$3$i = (HEAP32[$a$3137$i >> 2] | 0) == 0 ? $a$3137$i + 4 | 0 : $a$3137$i;
        if (!$$lcssa334) {
         $$a$3189$i = $$a$3$i;
         $z$4$i = $z$3136$i;
         break;
        }
        HEAP32[$z$3136$i >> 2] = $$lcssa334;
        $$a$3189$i = $$a$3$i;
        $z$4$i = $z$3136$i + 4 | 0;
       } else {
        $$a$3189$i = (HEAP32[$a$3137$i >> 2] | 0) == 0 ? $a$3137$i + 4 | 0 : $a$3137$i;
        $z$4$i = $z$3136$i;
       } while (0);
       $546 = $522 ? $$33$i : $$a$3189$i;
       $$z$4$i = ($z$4$i - $546 >> 2 | 0) > ($521 | 0) ? $546 + ($521 << 2) | 0 : $z$4$i;
       $524 = (HEAP32[$e2$i >> 2] | 0) + $526 | 0;
       HEAP32[$e2$i >> 2] = $524;
       if (($524 | 0) >= 0) {
        $a$3$lcssa$i = $$a$3189$i;
        $z$3$lcssa$i = $$z$4$i;
        break;
       } else {
        $a$3137$i = $$a$3189$i;
        $z$3136$i = $$z$4$i;
       }
      }
     } else {
      $a$3$lcssa$i = $a$1$lcssa$i;
      $z$3$lcssa$i = $z$1$lcssa$i;
     }
     do if ($a$3$lcssa$i >>> 0 < $z$3$lcssa$i >>> 0) {
      $560 = ($487 - $a$3$lcssa$i >> 2) * 9 | 0;
      $561 = HEAP32[$a$3$lcssa$i >> 2] | 0;
      if ($561 >>> 0 < 10) {
       $e$1$i = $560;
       break;
      } else {
       $e$0126$i = $560;
       $i$0125$i = 10;
      }
      while (1) {
       $i$0125$i = $i$0125$i * 10 | 0;
       $564 = $e$0126$i + 1 | 0;
       if ($561 >>> 0 < $i$0125$i >>> 0) {
        $e$1$i = $564;
        break;
       } else $e$0126$i = $564;
      }
     } else $e$1$i = 0; while (0);
     $569 = ($401 | 0) == 103;
     $570 = ($$p$i | 0) != 0;
     $572 = $$p$i - (($401 | 0) != 102 ? $e$1$i : 0) + (($570 & $569) << 31 >> 31) | 0;
     if (($572 | 0) < ((($z$3$lcssa$i - $487 >> 2) * 9 | 0) + -9 | 0)) {
      $580 = $572 + 9216 | 0;
      $583 = $$33$i + 4 + ((($580 | 0) / 9 | 0) + -1024 << 2) | 0;
      $j$0$118$i = (($580 | 0) % 9 | 0) + 1 | 0;
      if (($j$0$118$i | 0) < 9) {
       $i$1119$i = 10;
       $j$0120$i = $j$0$118$i;
       while (1) {
        $586 = $i$1119$i * 10 | 0;
        $j$0120$i = $j$0120$i + 1 | 0;
        if (($j$0120$i | 0) == 9) {
         $i$1$lcssa$i = $586;
         break;
        } else $i$1119$i = $586;
       }
      } else $i$1$lcssa$i = 10;
      $587 = HEAP32[$583 >> 2] | 0;
      $588 = ($587 >>> 0) % ($i$1$lcssa$i >>> 0) | 0;
      $591 = ($583 + 4 | 0) == ($z$3$lcssa$i | 0);
      do if ($591 & ($588 | 0) == 0) {
       $a$8$i = $a$3$lcssa$i;
       $d$4$i = $583;
       $e$4$i = $e$1$i;
      } else {
       $$20$i = ((($587 >>> 0) / ($i$1$lcssa$i >>> 0) | 0) & 1 | 0) == 0 ? 9007199254740992.0 : 9007199254740994.0;
       $595 = ($i$1$lcssa$i | 0) / 2 | 0;
       if ($588 >>> 0 < $595 >>> 0) $small$0$i = .5; else $small$0$i = $591 & ($588 | 0) == ($595 | 0) ? 1.0 : 1.5;
       do if (!$pl$0$i) {
        $round6$1$i = $$20$i;
        $small$1$i = $small$0$i;
       } else {
        if ((HEAP8[$prefix$0$i >> 0] | 0) != 45) {
         $round6$1$i = $$20$i;
         $small$1$i = $small$0$i;
         break;
        }
        $round6$1$i = -$$20$i;
        $small$1$i = -$small$0$i;
       } while (0);
       $603 = $587 - $588 | 0;
       HEAP32[$583 >> 2] = $603;
       if (!($round6$1$i + $small$1$i != $round6$1$i)) {
        $a$8$i = $a$3$lcssa$i;
        $d$4$i = $583;
        $e$4$i = $e$1$i;
        break;
       }
       $606 = $603 + $i$1$lcssa$i | 0;
       HEAP32[$583 >> 2] = $606;
       if ($606 >>> 0 > 999999999) {
        $a$5112$i = $a$3$lcssa$i;
        $d$2111$i = $583;
        while (1) {
         $608 = $d$2111$i + -4 | 0;
         HEAP32[$d$2111$i >> 2] = 0;
         if ($608 >>> 0 < $a$5112$i >>> 0) {
          $610 = $a$5112$i + -4 | 0;
          HEAP32[$610 >> 2] = 0;
          $a$6$i = $610;
         } else $a$6$i = $a$5112$i;
         $612 = (HEAP32[$608 >> 2] | 0) + 1 | 0;
         HEAP32[$608 >> 2] = $612;
         if ($612 >>> 0 > 999999999) {
          $a$5112$i = $a$6$i;
          $d$2111$i = $608;
         } else {
          $a$5$lcssa$i = $a$6$i;
          $d$2$lcssa$i = $608;
          break;
         }
        }
       } else {
        $a$5$lcssa$i = $a$3$lcssa$i;
        $d$2$lcssa$i = $583;
       }
       $617 = ($487 - $a$5$lcssa$i >> 2) * 9 | 0;
       $618 = HEAP32[$a$5$lcssa$i >> 2] | 0;
       if ($618 >>> 0 < 10) {
        $a$8$i = $a$5$lcssa$i;
        $d$4$i = $d$2$lcssa$i;
        $e$4$i = $617;
        break;
       } else {
        $e$2107$i = $617;
        $i$2106$i = 10;
       }
       while (1) {
        $i$2106$i = $i$2106$i * 10 | 0;
        $621 = $e$2107$i + 1 | 0;
        if ($618 >>> 0 < $i$2106$i >>> 0) {
         $a$8$i = $a$5$lcssa$i;
         $d$4$i = $d$2$lcssa$i;
         $e$4$i = $621;
         break;
        } else $e$2107$i = $621;
       }
      } while (0);
      $623 = $d$4$i + 4 | 0;
      $a$9$ph$i = $a$8$i;
      $e$5$ph$i = $e$4$i;
      $z$7$ph$i = $z$3$lcssa$i >>> 0 > $623 >>> 0 ? $623 : $z$3$lcssa$i;
     } else {
      $a$9$ph$i = $a$3$lcssa$i;
      $e$5$ph$i = $e$1$i;
      $z$7$ph$i = $z$3$lcssa$i;
     }
     $625 = 0 - $e$5$ph$i | 0;
     $z$7$i = $z$7$ph$i;
     while (1) {
      if ($z$7$i >>> 0 <= $a$9$ph$i >>> 0) {
       $$lcssa162$i = 0;
       $z$7$i$lcssa = $z$7$i;
       break;
      }
      $627 = $z$7$i + -4 | 0;
      if (!(HEAP32[$627 >> 2] | 0)) $z$7$i = $627; else {
       $$lcssa162$i = 1;
       $z$7$i$lcssa = $z$7$i;
       break;
      }
     }
     do if ($569) {
      $$p$$i = ($570 & 1 ^ 1) + $$p$i | 0;
      if (($$p$$i | 0) > ($e$5$ph$i | 0) & ($e$5$ph$i | 0) > -5) {
       $$013$i = $t$0 + -1 | 0;
       $$210$i = $$p$$i + -1 - $e$5$ph$i | 0;
      } else {
       $$013$i = $t$0 + -2 | 0;
       $$210$i = $$p$$i + -1 | 0;
      }
      $638 = $fl$1$ & 8;
      if ($638) {
       $$114$i = $$013$i;
       $$311$i = $$210$i;
       $$pre$phi187$iZ2D = $638;
       break;
      }
      do if ($$lcssa162$i) {
       $641 = HEAP32[$z$7$i$lcssa + -4 >> 2] | 0;
       if (!$641) {
        $j$2$i = 9;
        break;
       }
       if (!(($641 >>> 0) % 10 | 0)) {
        $i$3102$i = 10;
        $j$1103$i = 0;
       } else {
        $j$2$i = 0;
        break;
       }
       while (1) {
        $i$3102$i = $i$3102$i * 10 | 0;
        $646 = $j$1103$i + 1 | 0;
        if (($641 >>> 0) % ($i$3102$i >>> 0) | 0) {
         $j$2$i = $646;
         break;
        } else $j$1103$i = $646;
       }
      } else $j$2$i = 9; while (0);
      $655 = (($z$7$i$lcssa - $487 >> 2) * 9 | 0) + -9 | 0;
      if (($$013$i | 32 | 0) == 102) {
       $656 = $655 - $j$2$i | 0;
       $$23$i = ($656 | 0) < 0 ? 0 : $656;
       $$114$i = $$013$i;
       $$311$i = ($$210$i | 0) < ($$23$i | 0) ? $$210$i : $$23$i;
       $$pre$phi187$iZ2D = 0;
       break;
      } else {
       $660 = $655 + $e$5$ph$i - $j$2$i | 0;
       $$25$i = ($660 | 0) < 0 ? 0 : $660;
       $$114$i = $$013$i;
       $$311$i = ($$210$i | 0) < ($$25$i | 0) ? $$210$i : $$25$i;
       $$pre$phi187$iZ2D = 0;
       break;
      }
     } else {
      $$114$i = $t$0;
      $$311$i = $$p$i;
      $$pre$phi187$iZ2D = $fl$1$ & 8;
     } while (0);
     $663 = $$311$i | $$pre$phi187$iZ2D;
     $665 = ($663 | 0) != 0 & 1;
     $667 = ($$114$i | 32 | 0) == 102;
     if ($667) {
      $$pn$i = ($e$5$ph$i | 0) > 0 ? $e$5$ph$i : 0;
      $estr$2$i = 0;
     } else {
      $671 = ($e$5$ph$i | 0) < 0 ? $625 : $e$5$ph$i;
      $674 = _fmt_u($671, (($671 | 0) < 0) << 31 >> 31, $5) | 0;
      if (($8 - $674 | 0) < 2) {
       $estr$196$i = $674;
       while (1) {
        $678 = $estr$196$i + -1 | 0;
        HEAP8[$678 >> 0] = 48;
        if (($8 - $678 | 0) < 2) $estr$196$i = $678; else {
         $estr$1$lcssa$i = $678;
         break;
        }
       }
      } else $estr$1$lcssa$i = $674;
      HEAP8[$estr$1$lcssa$i + -1 >> 0] = ($e$5$ph$i >> 31 & 2) + 43;
      $688 = $estr$1$lcssa$i + -2 | 0;
      HEAP8[$688 >> 0] = $$114$i;
      $$pn$i = $8 - $688 | 0;
      $estr$2$i = $688;
     }
     $693 = $pl$0$i + 1 + $$311$i + $665 + $$pn$i | 0;
     _pad($f, 32, $w$1, $693, $fl$1$);
     if (!(HEAP32[$f >> 2] & 32)) ___fwritex($prefix$0$i, $pl$0$i, $f) | 0;
     _pad($f, 48, $w$1, $693, $fl$1$ ^ 65536);
     do if ($667) {
      $r$0$a$9$i = $a$9$ph$i >>> 0 > $$33$i >>> 0 ? $$33$i : $a$9$ph$i;
      $d$585$i = $r$0$a$9$i;
      while (1) {
       $700 = _fmt_u(HEAP32[$d$585$i >> 2] | 0, 0, $13) | 0;
       do if (($d$585$i | 0) == ($r$0$a$9$i | 0)) {
        if (($700 | 0) != ($13 | 0)) {
         $s7$1$i = $700;
         break;
        }
        HEAP8[$15 >> 0] = 48;
        $s7$1$i = $15;
       } else {
        if ($700 >>> 0 > $buf$i >>> 0) $s7$082$i = $700; else {
         $s7$1$i = $700;
         break;
        }
        while (1) {
         $703 = $s7$082$i + -1 | 0;
         HEAP8[$703 >> 0] = 48;
         if ($703 >>> 0 > $buf$i >>> 0) $s7$082$i = $703; else {
          $s7$1$i = $703;
          break;
         }
        }
       } while (0);
       if (!(HEAP32[$f >> 2] & 32)) ___fwritex($s7$1$i, $14 - $s7$1$i | 0, $f) | 0;
       $711 = $d$585$i + 4 | 0;
       if ($711 >>> 0 > $$33$i >>> 0) {
        $$lcssa344 = $711;
        break;
       } else $d$585$i = $711;
      }
      do if ($663) {
       if (HEAP32[$f >> 2] & 32) break;
       ___fwritex(9900, 1, $f) | 0;
      } while (0);
      if (($$311$i | 0) > 0 & $$lcssa344 >>> 0 < $z$7$i$lcssa >>> 0) {
       $$41279$i = $$311$i;
       $d$678$i = $$lcssa344;
       while (1) {
        $721 = _fmt_u(HEAP32[$d$678$i >> 2] | 0, 0, $13) | 0;
        if ($721 >>> 0 > $buf$i >>> 0) {
         $s8$073$i = $721;
         while (1) {
          $723 = $s8$073$i + -1 | 0;
          HEAP8[$723 >> 0] = 48;
          if ($723 >>> 0 > $buf$i >>> 0) $s8$073$i = $723; else {
           $s8$0$lcssa$i = $723;
           break;
          }
         }
        } else $s8$0$lcssa$i = $721;
        if (!(HEAP32[$f >> 2] & 32)) ___fwritex($s8$0$lcssa$i, ($$41279$i | 0) > 9 ? 9 : $$41279$i, $f) | 0;
        $d$678$i = $d$678$i + 4 | 0;
        $731 = $$41279$i + -9 | 0;
        if (!(($$41279$i | 0) > 9 & $d$678$i >>> 0 < $z$7$i$lcssa >>> 0)) {
         $$412$lcssa$i = $731;
         break;
        } else $$41279$i = $731;
       }
      } else $$412$lcssa$i = $$311$i;
      _pad($f, 48, $$412$lcssa$i + 9 | 0, 9, 0);
     } else {
      $z$7$$i = $$lcssa162$i ? $z$7$i$lcssa : $a$9$ph$i + 4 | 0;
      if (($$311$i | 0) > -1) {
       $738 = ($$pre$phi187$iZ2D | 0) == 0;
       $$590$i = $$311$i;
       $d$789$i = $a$9$ph$i;
       while (1) {
        $740 = _fmt_u(HEAP32[$d$789$i >> 2] | 0, 0, $13) | 0;
        if (($740 | 0) == ($13 | 0)) {
         HEAP8[$15 >> 0] = 48;
         $s9$0$i = $15;
        } else $s9$0$i = $740;
        do if (($d$789$i | 0) == ($a$9$ph$i | 0)) {
         $746 = $s9$0$i + 1 | 0;
         if (!(HEAP32[$f >> 2] & 32)) ___fwritex($s9$0$i, 1, $f) | 0;
         if ($738 & ($$590$i | 0) < 1) {
          $s9$2$i = $746;
          break;
         }
         if (HEAP32[$f >> 2] & 32) {
          $s9$2$i = $746;
          break;
         }
         ___fwritex(9900, 1, $f) | 0;
         $s9$2$i = $746;
        } else {
         if ($s9$0$i >>> 0 > $buf$i >>> 0) $s9$186$i = $s9$0$i; else {
          $s9$2$i = $s9$0$i;
          break;
         }
         while (1) {
          $744 = $s9$186$i + -1 | 0;
          HEAP8[$744 >> 0] = 48;
          if ($744 >>> 0 > $buf$i >>> 0) $s9$186$i = $744; else {
           $s9$2$i = $744;
           break;
          }
         }
        } while (0);
        $755 = $14 - $s9$2$i | 0;
        if (!(HEAP32[$f >> 2] & 32)) ___fwritex($s9$2$i, ($$590$i | 0) > ($755 | 0) ? $755 : $$590$i, $f) | 0;
        $761 = $$590$i - $755 | 0;
        $d$789$i = $d$789$i + 4 | 0;
        if (!($d$789$i >>> 0 < $z$7$$i >>> 0 & ($761 | 0) > -1)) {
         $$5$lcssa$i = $761;
         break;
        } else $$590$i = $761;
       }
      } else $$5$lcssa$i = $$311$i;
      _pad($f, 48, $$5$lcssa$i + 18 | 0, 18, 0);
      if (HEAP32[$f >> 2] & 32) break;
      ___fwritex($estr$2$i, $8 - $estr$2$i | 0, $f) | 0;
     } while (0);
     _pad($f, 32, $w$1, $693, $fl$1$ ^ 8192);
     $$0$i = ($693 | 0) < ($w$1 | 0) ? $w$1 : $693;
    } else {
     $382 = ($t$0 & 32 | 0) != 0;
     $384 = $$07$i != $$07$i | 0.0 != 0.0;
     $pl$1$i = $384 ? 0 : $pl$0$i;
     $386 = $pl$1$i + 3 | 0;
     _pad($f, 32, $w$1, $386, $180);
     $387 = HEAP32[$f >> 2] | 0;
     if (!($387 & 32)) {
      ___fwritex($prefix$0$i, $pl$1$i, $f) | 0;
      $391 = HEAP32[$f >> 2] | 0;
     } else $391 = $387;
     if (!($391 & 32)) ___fwritex($384 ? ($382 ? 9892 : 9896) : $382 ? 9884 : 9888, 3, $f) | 0;
     _pad($f, 32, $w$1, $386, $fl$1$ ^ 8192);
     $$0$i = ($386 | 0) < ($w$1 | 0) ? $w$1 : $386;
    } while (0);
    $22 = $$lcssa328;
    $cnt$0 = $cnt$1;
    $l$0 = $$0$i;
    $l10n$0 = $l10n$3;
    continue L1;
    break;
   }
  default:
   {
    $a$2 = $22;
    $fl$6 = $fl$1$;
    $p$5 = $p$0;
    $pl$2 = 0;
    $prefix$2 = 9848;
    $z$2 = $1;
   }
  } while (0);
  L308 : do if ((label | 0) == 64) {
   label = 0;
   $211 = $arg;
   $213 = HEAP32[$211 >> 2] | 0;
   $216 = HEAP32[$211 + 4 >> 2] | 0;
   $217 = $t$1 & 32;
   if (($213 | 0) == 0 & ($216 | 0) == 0) {
    $a$0 = $1;
    $fl$4 = $fl$3;
    $p$2 = $p$1;
    $pl$1 = 0;
    $prefix$1 = 9848;
    label = 77;
   } else {
    $$012$i = $1;
    $222 = $213;
    $229 = $216;
    while (1) {
     $228 = $$012$i + -1 | 0;
     HEAP8[$228 >> 0] = HEAPU8[9832 + ($222 & 15) >> 0] | $217;
     $222 = _bitshift64Lshr($222 | 0, $229 | 0, 4) | 0;
     $229 = tempRet0;
     if (($222 | 0) == 0 & ($229 | 0) == 0) {
      $$lcssa349 = $228;
      break;
     } else $$012$i = $228;
    }
    $235 = $arg;
    if (($fl$3 & 8 | 0) == 0 | (HEAP32[$235 >> 2] | 0) == 0 & (HEAP32[$235 + 4 >> 2] | 0) == 0) {
     $a$0 = $$lcssa349;
     $fl$4 = $fl$3;
     $p$2 = $p$1;
     $pl$1 = 0;
     $prefix$1 = 9848;
     label = 77;
    } else {
     $a$0 = $$lcssa349;
     $fl$4 = $fl$3;
     $p$2 = $p$1;
     $pl$1 = 2;
     $prefix$1 = 9848 + ($t$1 >> 4) | 0;
     label = 77;
    }
   }
  } else if ((label | 0) == 76) {
   label = 0;
   $a$0 = _fmt_u($291, $292, $1) | 0;
   $fl$4 = $fl$1$;
   $p$2 = $p$0;
   $pl$1 = $pl$0;
   $prefix$1 = $prefix$0;
   label = 77;
  } else if ((label | 0) == 82) {
   label = 0;
   $325 = _memchr($a$1, 0, $p$0) | 0;
   $326 = ($325 | 0) == 0;
   $a$2 = $a$1;
   $fl$6 = $180;
   $p$5 = $326 ? $p$0 : $325 - $a$1 | 0;
   $pl$2 = 0;
   $prefix$2 = 9848;
   $z$2 = $326 ? $a$1 + $p$0 | 0 : $325;
  } else if ((label | 0) == 86) {
   label = 0;
   $i$0108 = 0;
   $l$1107 = 0;
   $ws$0109 = HEAP32[$arg >> 2] | 0;
   while (1) {
    $339 = HEAP32[$ws$0109 >> 2] | 0;
    if (!$339) {
     $i$0$lcssa = $i$0108;
     $l$2 = $l$1107;
     break;
    }
    $341 = _wctomb($mb, $339) | 0;
    if (($341 | 0) < 0 | $341 >>> 0 > ($p$4195 - $i$0108 | 0) >>> 0) {
     $i$0$lcssa = $i$0108;
     $l$2 = $341;
     break;
    }
    $346 = $341 + $i$0108 | 0;
    if ($p$4195 >>> 0 > $346 >>> 0) {
     $i$0108 = $346;
     $l$1107 = $341;
     $ws$0109 = $ws$0109 + 4 | 0;
    } else {
     $i$0$lcssa = $346;
     $l$2 = $341;
     break;
    }
   }
   if (($l$2 | 0) < 0) {
    $$0 = -1;
    break L1;
   }
   _pad($f, 32, $w$1, $i$0$lcssa, $fl$1$);
   if (!$i$0$lcssa) {
    $i$0$lcssa197 = 0;
    label = 98;
   } else {
    $i$1119 = 0;
    $ws$1120 = HEAP32[$arg >> 2] | 0;
    while (1) {
     $351 = HEAP32[$ws$1120 >> 2] | 0;
     if (!$351) {
      $i$0$lcssa197 = $i$0$lcssa;
      label = 98;
      break L308;
     }
     $354 = _wctomb($mb, $351) | 0;
     $i$1119 = $354 + $i$1119 | 0;
     if (($i$1119 | 0) > ($i$0$lcssa | 0)) {
      $i$0$lcssa197 = $i$0$lcssa;
      label = 98;
      break L308;
     }
     if (!(HEAP32[$f >> 2] & 32)) ___fwritex($mb, $354, $f) | 0;
     if ($i$1119 >>> 0 >= $i$0$lcssa >>> 0) {
      $i$0$lcssa197 = $i$0$lcssa;
      label = 98;
      break;
     } else $ws$1120 = $ws$1120 + 4 | 0;
    }
   }
  } while (0);
  if ((label | 0) == 98) {
   label = 0;
   _pad($f, 32, $w$1, $i$0$lcssa197, $fl$1$ ^ 8192);
   $22 = $$lcssa328;
   $cnt$0 = $cnt$1;
   $l$0 = ($w$1 | 0) > ($i$0$lcssa197 | 0) ? $w$1 : $i$0$lcssa197;
   $l10n$0 = $l10n$3;
   continue;
  }
  if ((label | 0) == 77) {
   label = 0;
   $$fl$4 = ($p$2 | 0) > -1 ? $fl$4 & -65537 : $fl$4;
   $296 = $arg;
   $304 = (HEAP32[$296 >> 2] | 0) != 0 | (HEAP32[$296 + 4 >> 2] | 0) != 0;
   if (($p$2 | 0) != 0 | $304) {
    $310 = ($304 & 1 ^ 1) + ($2 - $a$0) | 0;
    $a$2 = $a$0;
    $fl$6 = $$fl$4;
    $p$5 = ($p$2 | 0) > ($310 | 0) ? $p$2 : $310;
    $pl$2 = $pl$1;
    $prefix$2 = $prefix$1;
    $z$2 = $1;
   } else {
    $a$2 = $1;
    $fl$6 = $$fl$4;
    $p$5 = 0;
    $pl$2 = $pl$1;
    $prefix$2 = $prefix$1;
    $z$2 = $1;
   }
  }
  $776 = $z$2 - $a$2 | 0;
  $$p$5 = ($p$5 | 0) < ($776 | 0) ? $776 : $p$5;
  $778 = $pl$2 + $$p$5 | 0;
  $w$2 = ($w$1 | 0) < ($778 | 0) ? $778 : $w$1;
  _pad($f, 32, $w$2, $778, $fl$6);
  if (!(HEAP32[$f >> 2] & 32)) ___fwritex($prefix$2, $pl$2, $f) | 0;
  _pad($f, 48, $w$2, $778, $fl$6 ^ 65536);
  _pad($f, 48, $$p$5, $776, 0);
  if (!(HEAP32[$f >> 2] & 32)) ___fwritex($a$2, $776, $f) | 0;
  _pad($f, 32, $w$2, $778, $fl$6 ^ 8192);
  $22 = $$lcssa328;
  $cnt$0 = $cnt$1;
  $l$0 = $w$2;
  $l10n$0 = $l10n$3;
 }
 L343 : do if ((label | 0) == 242) if (!$f) if (!$l10n$0$lcssa) $$0 = 0; else {
  $i$295 = 1;
  while (1) {
   $791 = HEAP32[$nl_type + ($i$295 << 2) >> 2] | 0;
   if (!$791) {
    $i$295$lcssa = $i$295;
    break;
   }
   _pop_arg_424($nl_arg + ($i$295 << 3) | 0, $791, $ap);
   $i$295 = $i$295 + 1 | 0;
   if (($i$295 | 0) >= 10) {
    $$0 = 1;
    break L343;
   }
  }
  if (($i$295$lcssa | 0) < 10) {
   $i$393 = $i$295$lcssa;
   while (1) {
    if (HEAP32[$nl_type + ($i$393 << 2) >> 2] | 0) {
     $$0 = -1;
     break L343;
    }
    $i$393 = $i$393 + 1 | 0;
    if (($i$393 | 0) >= 10) {
     $$0 = 1;
     break;
    }
   }
  } else $$0 = 1;
 } else $$0 = $cnt$1$lcssa; while (0);
 STACKTOP = sp;
 return $$0 | 0;
}
function _malloc($bytes) {
 $bytes = $bytes | 0;
 var $$0 = 0, $$lcssa = 0, $$lcssa141 = 0, $$lcssa142 = 0, $$lcssa144 = 0, $$lcssa147 = 0, $$lcssa149 = 0, $$lcssa151 = 0, $$lcssa153 = 0, $$lcssa155 = 0, $$lcssa157 = 0, $$pre$phi$i$14Z2D = 0, $$pre$phi$i$17$iZ2D = 0, $$pre$phi$i$iZ2D = 0, $$pre$phi$iZ2D = 0, $$pre$phi10$i$iZ2D = 0, $$pre$phiZ2D = 0, $$rsize$4$i = 0, $100 = 0, $1001 = 0, $1006 = 0, $101 = 0, $1012 = 0, $1015 = 0, $1016 = 0, $1034 = 0, $1036 = 0, $1043 = 0, $1044 = 0, $1045 = 0, $1053 = 0, $1055 = 0, $1056 = 0, $1057 = 0, $107 = 0, $111 = 0, $113 = 0, $114 = 0, $116 = 0, $118 = 0, $12 = 0, $120 = 0, $122 = 0, $124 = 0, $126 = 0, $128 = 0, $133 = 0, $139 = 0, $14 = 0, $142 = 0, $145 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $152 = 0, $155 = 0, $157 = 0, $16 = 0, $160 = 0, $162 = 0, $165 = 0, $168 = 0, $169 = 0, $17 = 0, $171 = 0, $172 = 0, $174 = 0, $175 = 0, $177 = 0, $178 = 0, $18 = 0, $183 = 0, $184 = 0, $193 = 0, $198 = 0, $202 = 0, $208 = 0, $215 = 0, $219 = 0, $227 = 0, $229 = 0, $230 = 0, $232 = 0, $233 = 0, $234 = 0, $238 = 0, $239 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $251 = 0, $252 = 0, $257 = 0, $258 = 0, $261 = 0, $263 = 0, $266 = 0, $271 = 0, $278 = 0, $28 = 0, $287 = 0, $288 = 0, $292 = 0, $298 = 0, $303 = 0, $306 = 0, $310 = 0, $312 = 0, $313 = 0, $315 = 0, $317 = 0, $319 = 0, $32 = 0, $321 = 0, $323 = 0, $325 = 0, $327 = 0, $337 = 0, $338 = 0, $340 = 0, $349 = 0, $35 = 0, $351 = 0, $354 = 0, $356 = 0, $359 = 0, $361 = 0, $364 = 0, $367 = 0, $368 = 0, $370 = 0, $371 = 0, $373 = 0, $374 = 0, $376 = 0, $377 = 0, $382 = 0, $383 = 0, $39 = 0, $392 = 0, $397 = 0, $4 = 0, $401 = 0, $407 = 0, $414 = 0, $418 = 0, $42 = 0, $426 = 0, $429 = 0, $430 = 0, $431 = 0, $435 = 0, $436 = 0, $442 = 0, $447 = 0, $448 = 0, $45 = 0, $451 = 0, $453 = 0, $456 = 0, $461 = 0, $467 = 0, $469 = 0, $47 = 0, $471 = 0, $472 = 0, $48 = 0, $490 = 0, $492 = 0, $499 = 0, $5 = 0, $50 = 0, $500 = 0, $501 = 0, $509 = 0, $511 = 0, $512 = 0, $514 = 0, $52 = 0, $523 = 0, $527 = 0, $529 = 0, $530 = 0, $531 = 0, $539 = 0, $54 = 0, $546 = 0, $547 = 0, $548 = 0, $549 = 0, $550 = 0, $551 = 0, $553 = 0, $555 = 0, $556 = 0, $56 = 0, $562 = 0, $564 = 0, $566 = 0, $573 = 0, $575 = 0, $576 = 0, $577 = 0, $58 = 0, $585 = 0, $586 = 0, $589 = 0, $593 = 0, $597 = 0, $599 = 0, $6 = 0, $60 = 0, $605 = 0, $609 = 0, $613 = 0, $62 = 0, $622 = 0, $623 = 0, $629 = 0, $632 = 0, $635 = 0, $637 = 0, $642 = 0, $648 = 0, $65 = 0, $653 = 0, $654 = 0, $655 = 0, $661 = 0, $662 = 0, $663 = 0, $67 = 0, $678 = 0, $68 = 0, $683 = 0, $684 = 0, $686 = 0, $69 = 0, $692 = 0, $694 = 0, $7 = 0, $70 = 0, $704 = 0, $708 = 0, $71 = 0, $714 = 0, $716 = 0, $722 = 0, $726 = 0, $727 = 0, $732 = 0, $738 = 0, $743 = 0, $746 = 0, $747 = 0, $750 = 0, $752 = 0, $754 = 0, $757 = 0, $768 = 0, $773 = 0, $775 = 0, $778 = 0, $78 = 0, $780 = 0, $783 = 0, $786 = 0, $787 = 0, $788 = 0, $790 = 0, $792 = 0, $793 = 0, $795 = 0, $796 = 0, $801 = 0, $802 = 0, $811 = 0, $816 = 0, $819 = 0, $82 = 0, $820 = 0, $826 = 0, $834 = 0, $840 = 0, $843 = 0, $844 = 0, $845 = 0, $849 = 0, $85 = 0, $850 = 0, $856 = 0, $861 = 0, $862 = 0, $865 = 0, $867 = 0, $870 = 0, $875 = 0, $881 = 0, $883 = 0, $885 = 0, $886 = 0, $89 = 0, $904 = 0, $906 = 0, $91 = 0, $913 = 0, $914 = 0, $915 = 0, $92 = 0, $922 = 0, $926 = 0, $930 = 0, $932 = 0, $938 = 0, $939 = 0, $94 = 0, $941 = 0, $942 = 0, $946 = 0, $95 = 0, $951 = 0, $952 = 0, $953 = 0, $959 = 0, $96 = 0, $966 = 0, $971 = 0, $974 = 0, $975 = 0, $976 = 0, $980 = 0, $981 = 0, $987 = 0, $992 = 0, $993 = 0, $996 = 0, $998 = 0, $F$0$i$i = 0, $F1$0$i = 0, $F4$0 = 0, $F4$0$i$i = 0, $F5$0$i = 0, $I1$0$i$i = 0, $I7$0$i = 0, $I7$0$i$i = 0, $K12$0$i = 0, $K2$0$i$i = 0, $K8$0$i$i = 0, $R$1$i = 0, $R$1$i$9 = 0, $R$1$i$9$lcssa = 0, $R$1$i$i = 0, $R$1$i$i$lcssa = 0, $R$1$i$lcssa = 0, $R$3$i = 0, $R$3$i$11 = 0, $R$3$i$i = 0, $RP$1$i = 0, $RP$1$i$8 = 0, $RP$1$i$8$lcssa = 0, $RP$1$i$i = 0, $RP$1$i$i$lcssa = 0, $RP$1$i$lcssa = 0, $T$0$i = 0, $T$0$i$18$i = 0, $T$0$i$18$i$lcssa = 0, $T$0$i$18$i$lcssa139 = 0, $T$0$i$i = 0, $T$0$i$i$lcssa = 0, $T$0$i$i$lcssa140 = 0, $T$0$i$lcssa = 0, $T$0$i$lcssa156 = 0, $br$2$ph$i = 0, $i$01$i$i = 0, $idx$0$i = 0, $nb$0 = 0, $oldfirst$0$i$i = 0, $p$0$i$i = 0, $qsize$0$i$i = 0, $rsize$0$i = 0, $rsize$0$i$5 = 0, $rsize$0$i$lcssa = 0, $rsize$1$i = 0, $rsize$3$i = 0, $rsize$4$lcssa$i = 0, $rsize$412$i = 0, $rst$0$i = 0, $rst$1$i = 0, $sizebits$0$i = 0, $sp$0$i$i = 0, $sp$0$i$i$i = 0, $sp$069$i = 0, $sp$069$i$lcssa = 0, $sp$168$i = 0, $sp$168$i$lcssa = 0, $ssize$0$i = 0, $ssize$2$ph$i = 0, $ssize$5$i = 0, $t$0$i = 0, $t$0$i$4 = 0, $t$2$i = 0, $t$4$ph$i = 0, $t$4$v$4$i = 0, $t$411$i = 0, $tbase$747$i = 0, $tsize$746$i = 0, $v$0$i = 0, $v$0$i$6 = 0, $v$0$i$lcssa = 0, $v$1$i = 0, $v$3$i = 0, $v$4$lcssa$i = 0, $v$413$i = 0, label = 0;
 do if ($bytes >>> 0 < 245) {
  $4 = $bytes >>> 0 < 11 ? 16 : $bytes + 11 & -8;
  $5 = $4 >>> 3;
  $6 = HEAP32[243] | 0;
  $7 = $6 >>> $5;
  if ($7 & 3) {
   $12 = ($7 & 1 ^ 1) + $5 | 0;
   $14 = 1012 + ($12 << 1 << 2) | 0;
   $15 = $14 + 8 | 0;
   $16 = HEAP32[$15 >> 2] | 0;
   $17 = $16 + 8 | 0;
   $18 = HEAP32[$17 >> 2] | 0;
   do if (($14 | 0) == ($18 | 0)) HEAP32[243] = $6 & ~(1 << $12); else {
    if ($18 >>> 0 < (HEAP32[247] | 0) >>> 0) _abort();
    $25 = $18 + 12 | 0;
    if ((HEAP32[$25 >> 2] | 0) == ($16 | 0)) {
     HEAP32[$25 >> 2] = $14;
     HEAP32[$15 >> 2] = $18;
     break;
    } else _abort();
   } while (0);
   $28 = $12 << 3;
   HEAP32[$16 + 4 >> 2] = $28 | 3;
   $32 = $16 + $28 + 4 | 0;
   HEAP32[$32 >> 2] = HEAP32[$32 >> 2] | 1;
   $$0 = $17;
   return $$0 | 0;
  }
  $35 = HEAP32[245] | 0;
  if ($4 >>> 0 > $35 >>> 0) {
   if ($7) {
    $39 = 2 << $5;
    $42 = $7 << $5 & ($39 | 0 - $39);
    $45 = ($42 & 0 - $42) + -1 | 0;
    $47 = $45 >>> 12 & 16;
    $48 = $45 >>> $47;
    $50 = $48 >>> 5 & 8;
    $52 = $48 >>> $50;
    $54 = $52 >>> 2 & 4;
    $56 = $52 >>> $54;
    $58 = $56 >>> 1 & 2;
    $60 = $56 >>> $58;
    $62 = $60 >>> 1 & 1;
    $65 = ($50 | $47 | $54 | $58 | $62) + ($60 >>> $62) | 0;
    $67 = 1012 + ($65 << 1 << 2) | 0;
    $68 = $67 + 8 | 0;
    $69 = HEAP32[$68 >> 2] | 0;
    $70 = $69 + 8 | 0;
    $71 = HEAP32[$70 >> 2] | 0;
    do if (($67 | 0) == ($71 | 0)) {
     HEAP32[243] = $6 & ~(1 << $65);
     $89 = $35;
    } else {
     if ($71 >>> 0 < (HEAP32[247] | 0) >>> 0) _abort();
     $78 = $71 + 12 | 0;
     if ((HEAP32[$78 >> 2] | 0) == ($69 | 0)) {
      HEAP32[$78 >> 2] = $67;
      HEAP32[$68 >> 2] = $71;
      $89 = HEAP32[245] | 0;
      break;
     } else _abort();
    } while (0);
    $82 = ($65 << 3) - $4 | 0;
    HEAP32[$69 + 4 >> 2] = $4 | 3;
    $85 = $69 + $4 | 0;
    HEAP32[$85 + 4 >> 2] = $82 | 1;
    HEAP32[$85 + $82 >> 2] = $82;
    if ($89) {
     $91 = HEAP32[248] | 0;
     $92 = $89 >>> 3;
     $94 = 1012 + ($92 << 1 << 2) | 0;
     $95 = HEAP32[243] | 0;
     $96 = 1 << $92;
     if (!($95 & $96)) {
      HEAP32[243] = $95 | $96;
      $$pre$phiZ2D = $94 + 8 | 0;
      $F4$0 = $94;
     } else {
      $100 = $94 + 8 | 0;
      $101 = HEAP32[$100 >> 2] | 0;
      if ($101 >>> 0 < (HEAP32[247] | 0) >>> 0) _abort(); else {
       $$pre$phiZ2D = $100;
       $F4$0 = $101;
      }
     }
     HEAP32[$$pre$phiZ2D >> 2] = $91;
     HEAP32[$F4$0 + 12 >> 2] = $91;
     HEAP32[$91 + 8 >> 2] = $F4$0;
     HEAP32[$91 + 12 >> 2] = $94;
    }
    HEAP32[245] = $82;
    HEAP32[248] = $85;
    $$0 = $70;
    return $$0 | 0;
   }
   $107 = HEAP32[244] | 0;
   if (!$107) $nb$0 = $4; else {
    $111 = ($107 & 0 - $107) + -1 | 0;
    $113 = $111 >>> 12 & 16;
    $114 = $111 >>> $113;
    $116 = $114 >>> 5 & 8;
    $118 = $114 >>> $116;
    $120 = $118 >>> 2 & 4;
    $122 = $118 >>> $120;
    $124 = $122 >>> 1 & 2;
    $126 = $122 >>> $124;
    $128 = $126 >>> 1 & 1;
    $133 = HEAP32[1276 + (($116 | $113 | $120 | $124 | $128) + ($126 >>> $128) << 2) >> 2] | 0;
    $rsize$0$i = (HEAP32[$133 + 4 >> 2] & -8) - $4 | 0;
    $t$0$i = $133;
    $v$0$i = $133;
    while (1) {
     $139 = HEAP32[$t$0$i + 16 >> 2] | 0;
     if (!$139) {
      $142 = HEAP32[$t$0$i + 20 >> 2] | 0;
      if (!$142) {
       $rsize$0$i$lcssa = $rsize$0$i;
       $v$0$i$lcssa = $v$0$i;
       break;
      } else $145 = $142;
     } else $145 = $139;
     $148 = (HEAP32[$145 + 4 >> 2] & -8) - $4 | 0;
     $149 = $148 >>> 0 < $rsize$0$i >>> 0;
     $rsize$0$i = $149 ? $148 : $rsize$0$i;
     $t$0$i = $145;
     $v$0$i = $149 ? $145 : $v$0$i;
    }
    $150 = HEAP32[247] | 0;
    if ($v$0$i$lcssa >>> 0 < $150 >>> 0) _abort();
    $152 = $v$0$i$lcssa + $4 | 0;
    if ($v$0$i$lcssa >>> 0 >= $152 >>> 0) _abort();
    $155 = HEAP32[$v$0$i$lcssa + 24 >> 2] | 0;
    $157 = HEAP32[$v$0$i$lcssa + 12 >> 2] | 0;
    do if (($157 | 0) == ($v$0$i$lcssa | 0)) {
     $168 = $v$0$i$lcssa + 20 | 0;
     $169 = HEAP32[$168 >> 2] | 0;
     if (!$169) {
      $171 = $v$0$i$lcssa + 16 | 0;
      $172 = HEAP32[$171 >> 2] | 0;
      if (!$172) {
       $R$3$i = 0;
       break;
      } else {
       $R$1$i = $172;
       $RP$1$i = $171;
      }
     } else {
      $R$1$i = $169;
      $RP$1$i = $168;
     }
     while (1) {
      $174 = $R$1$i + 20 | 0;
      $175 = HEAP32[$174 >> 2] | 0;
      if ($175) {
       $R$1$i = $175;
       $RP$1$i = $174;
       continue;
      }
      $177 = $R$1$i + 16 | 0;
      $178 = HEAP32[$177 >> 2] | 0;
      if (!$178) {
       $R$1$i$lcssa = $R$1$i;
       $RP$1$i$lcssa = $RP$1$i;
       break;
      } else {
       $R$1$i = $178;
       $RP$1$i = $177;
      }
     }
     if ($RP$1$i$lcssa >>> 0 < $150 >>> 0) _abort(); else {
      HEAP32[$RP$1$i$lcssa >> 2] = 0;
      $R$3$i = $R$1$i$lcssa;
      break;
     }
    } else {
     $160 = HEAP32[$v$0$i$lcssa + 8 >> 2] | 0;
     if ($160 >>> 0 < $150 >>> 0) _abort();
     $162 = $160 + 12 | 0;
     if ((HEAP32[$162 >> 2] | 0) != ($v$0$i$lcssa | 0)) _abort();
     $165 = $157 + 8 | 0;
     if ((HEAP32[$165 >> 2] | 0) == ($v$0$i$lcssa | 0)) {
      HEAP32[$162 >> 2] = $157;
      HEAP32[$165 >> 2] = $160;
      $R$3$i = $157;
      break;
     } else _abort();
    } while (0);
    do if ($155) {
     $183 = HEAP32[$v$0$i$lcssa + 28 >> 2] | 0;
     $184 = 1276 + ($183 << 2) | 0;
     if (($v$0$i$lcssa | 0) == (HEAP32[$184 >> 2] | 0)) {
      HEAP32[$184 >> 2] = $R$3$i;
      if (!$R$3$i) {
       HEAP32[244] = HEAP32[244] & ~(1 << $183);
       break;
      }
     } else {
      if ($155 >>> 0 < (HEAP32[247] | 0) >>> 0) _abort();
      $193 = $155 + 16 | 0;
      if ((HEAP32[$193 >> 2] | 0) == ($v$0$i$lcssa | 0)) HEAP32[$193 >> 2] = $R$3$i; else HEAP32[$155 + 20 >> 2] = $R$3$i;
      if (!$R$3$i) break;
     }
     $198 = HEAP32[247] | 0;
     if ($R$3$i >>> 0 < $198 >>> 0) _abort();
     HEAP32[$R$3$i + 24 >> 2] = $155;
     $202 = HEAP32[$v$0$i$lcssa + 16 >> 2] | 0;
     do if ($202) if ($202 >>> 0 < $198 >>> 0) _abort(); else {
      HEAP32[$R$3$i + 16 >> 2] = $202;
      HEAP32[$202 + 24 >> 2] = $R$3$i;
      break;
     } while (0);
     $208 = HEAP32[$v$0$i$lcssa + 20 >> 2] | 0;
     if ($208) if ($208 >>> 0 < (HEAP32[247] | 0) >>> 0) _abort(); else {
      HEAP32[$R$3$i + 20 >> 2] = $208;
      HEAP32[$208 + 24 >> 2] = $R$3$i;
      break;
     }
    } while (0);
    if ($rsize$0$i$lcssa >>> 0 < 16) {
     $215 = $rsize$0$i$lcssa + $4 | 0;
     HEAP32[$v$0$i$lcssa + 4 >> 2] = $215 | 3;
     $219 = $v$0$i$lcssa + $215 + 4 | 0;
     HEAP32[$219 >> 2] = HEAP32[$219 >> 2] | 1;
    } else {
     HEAP32[$v$0$i$lcssa + 4 >> 2] = $4 | 3;
     HEAP32[$152 + 4 >> 2] = $rsize$0$i$lcssa | 1;
     HEAP32[$152 + $rsize$0$i$lcssa >> 2] = $rsize$0$i$lcssa;
     $227 = HEAP32[245] | 0;
     if ($227) {
      $229 = HEAP32[248] | 0;
      $230 = $227 >>> 3;
      $232 = 1012 + ($230 << 1 << 2) | 0;
      $233 = HEAP32[243] | 0;
      $234 = 1 << $230;
      if (!($233 & $234)) {
       HEAP32[243] = $233 | $234;
       $$pre$phi$iZ2D = $232 + 8 | 0;
       $F1$0$i = $232;
      } else {
       $238 = $232 + 8 | 0;
       $239 = HEAP32[$238 >> 2] | 0;
       if ($239 >>> 0 < (HEAP32[247] | 0) >>> 0) _abort(); else {
        $$pre$phi$iZ2D = $238;
        $F1$0$i = $239;
       }
      }
      HEAP32[$$pre$phi$iZ2D >> 2] = $229;
      HEAP32[$F1$0$i + 12 >> 2] = $229;
      HEAP32[$229 + 8 >> 2] = $F1$0$i;
      HEAP32[$229 + 12 >> 2] = $232;
     }
     HEAP32[245] = $rsize$0$i$lcssa;
     HEAP32[248] = $152;
    }
    $$0 = $v$0$i$lcssa + 8 | 0;
    return $$0 | 0;
   }
  } else $nb$0 = $4;
 } else if ($bytes >>> 0 > 4294967231) $nb$0 = -1; else {
  $247 = $bytes + 11 | 0;
  $248 = $247 & -8;
  $249 = HEAP32[244] | 0;
  if (!$249) $nb$0 = $248; else {
   $251 = 0 - $248 | 0;
   $252 = $247 >>> 8;
   if (!$252) $idx$0$i = 0; else if ($248 >>> 0 > 16777215) $idx$0$i = 31; else {
    $257 = ($252 + 1048320 | 0) >>> 16 & 8;
    $258 = $252 << $257;
    $261 = ($258 + 520192 | 0) >>> 16 & 4;
    $263 = $258 << $261;
    $266 = ($263 + 245760 | 0) >>> 16 & 2;
    $271 = 14 - ($261 | $257 | $266) + ($263 << $266 >>> 15) | 0;
    $idx$0$i = $248 >>> ($271 + 7 | 0) & 1 | $271 << 1;
   }
   $278 = HEAP32[1276 + ($idx$0$i << 2) >> 2] | 0;
   L123 : do if (!$278) {
    $rsize$3$i = $251;
    $t$2$i = 0;
    $v$3$i = 0;
    label = 86;
   } else {
    $rsize$0$i$5 = $251;
    $rst$0$i = 0;
    $sizebits$0$i = $248 << (($idx$0$i | 0) == 31 ? 0 : 25 - ($idx$0$i >>> 1) | 0);
    $t$0$i$4 = $278;
    $v$0$i$6 = 0;
    while (1) {
     $287 = HEAP32[$t$0$i$4 + 4 >> 2] & -8;
     $288 = $287 - $248 | 0;
     if ($288 >>> 0 < $rsize$0$i$5 >>> 0) if (($287 | 0) == ($248 | 0)) {
      $rsize$412$i = $288;
      $t$411$i = $t$0$i$4;
      $v$413$i = $t$0$i$4;
      label = 90;
      break L123;
     } else {
      $rsize$1$i = $288;
      $v$1$i = $t$0$i$4;
     } else {
      $rsize$1$i = $rsize$0$i$5;
      $v$1$i = $v$0$i$6;
     }
     $292 = HEAP32[$t$0$i$4 + 20 >> 2] | 0;
     $t$0$i$4 = HEAP32[$t$0$i$4 + 16 + ($sizebits$0$i >>> 31 << 2) >> 2] | 0;
     $rst$1$i = ($292 | 0) == 0 | ($292 | 0) == ($t$0$i$4 | 0) ? $rst$0$i : $292;
     $298 = ($t$0$i$4 | 0) == 0;
     if ($298) {
      $rsize$3$i = $rsize$1$i;
      $t$2$i = $rst$1$i;
      $v$3$i = $v$1$i;
      label = 86;
      break;
     } else {
      $rsize$0$i$5 = $rsize$1$i;
      $rst$0$i = $rst$1$i;
      $sizebits$0$i = $sizebits$0$i << ($298 & 1 ^ 1);
      $v$0$i$6 = $v$1$i;
     }
    }
   } while (0);
   if ((label | 0) == 86) {
    if (($t$2$i | 0) == 0 & ($v$3$i | 0) == 0) {
     $303 = 2 << $idx$0$i;
     $306 = $249 & ($303 | 0 - $303);
     if (!$306) {
      $nb$0 = $248;
      break;
     }
     $310 = ($306 & 0 - $306) + -1 | 0;
     $312 = $310 >>> 12 & 16;
     $313 = $310 >>> $312;
     $315 = $313 >>> 5 & 8;
     $317 = $313 >>> $315;
     $319 = $317 >>> 2 & 4;
     $321 = $317 >>> $319;
     $323 = $321 >>> 1 & 2;
     $325 = $321 >>> $323;
     $327 = $325 >>> 1 & 1;
     $t$4$ph$i = HEAP32[1276 + (($315 | $312 | $319 | $323 | $327) + ($325 >>> $327) << 2) >> 2] | 0;
    } else $t$4$ph$i = $t$2$i;
    if (!$t$4$ph$i) {
     $rsize$4$lcssa$i = $rsize$3$i;
     $v$4$lcssa$i = $v$3$i;
    } else {
     $rsize$412$i = $rsize$3$i;
     $t$411$i = $t$4$ph$i;
     $v$413$i = $v$3$i;
     label = 90;
    }
   }
   if ((label | 0) == 90) while (1) {
    label = 0;
    $337 = (HEAP32[$t$411$i + 4 >> 2] & -8) - $248 | 0;
    $338 = $337 >>> 0 < $rsize$412$i >>> 0;
    $$rsize$4$i = $338 ? $337 : $rsize$412$i;
    $t$4$v$4$i = $338 ? $t$411$i : $v$413$i;
    $340 = HEAP32[$t$411$i + 16 >> 2] | 0;
    if ($340) {
     $rsize$412$i = $$rsize$4$i;
     $t$411$i = $340;
     $v$413$i = $t$4$v$4$i;
     label = 90;
     continue;
    }
    $t$411$i = HEAP32[$t$411$i + 20 >> 2] | 0;
    if (!$t$411$i) {
     $rsize$4$lcssa$i = $$rsize$4$i;
     $v$4$lcssa$i = $t$4$v$4$i;
     break;
    } else {
     $rsize$412$i = $$rsize$4$i;
     $v$413$i = $t$4$v$4$i;
     label = 90;
    }
   }
   if (!$v$4$lcssa$i) $nb$0 = $248; else if ($rsize$4$lcssa$i >>> 0 < ((HEAP32[245] | 0) - $248 | 0) >>> 0) {
    $349 = HEAP32[247] | 0;
    if ($v$4$lcssa$i >>> 0 < $349 >>> 0) _abort();
    $351 = $v$4$lcssa$i + $248 | 0;
    if ($v$4$lcssa$i >>> 0 >= $351 >>> 0) _abort();
    $354 = HEAP32[$v$4$lcssa$i + 24 >> 2] | 0;
    $356 = HEAP32[$v$4$lcssa$i + 12 >> 2] | 0;
    do if (($356 | 0) == ($v$4$lcssa$i | 0)) {
     $367 = $v$4$lcssa$i + 20 | 0;
     $368 = HEAP32[$367 >> 2] | 0;
     if (!$368) {
      $370 = $v$4$lcssa$i + 16 | 0;
      $371 = HEAP32[$370 >> 2] | 0;
      if (!$371) {
       $R$3$i$11 = 0;
       break;
      } else {
       $R$1$i$9 = $371;
       $RP$1$i$8 = $370;
      }
     } else {
      $R$1$i$9 = $368;
      $RP$1$i$8 = $367;
     }
     while (1) {
      $373 = $R$1$i$9 + 20 | 0;
      $374 = HEAP32[$373 >> 2] | 0;
      if ($374) {
       $R$1$i$9 = $374;
       $RP$1$i$8 = $373;
       continue;
      }
      $376 = $R$1$i$9 + 16 | 0;
      $377 = HEAP32[$376 >> 2] | 0;
      if (!$377) {
       $R$1$i$9$lcssa = $R$1$i$9;
       $RP$1$i$8$lcssa = $RP$1$i$8;
       break;
      } else {
       $R$1$i$9 = $377;
       $RP$1$i$8 = $376;
      }
     }
     if ($RP$1$i$8$lcssa >>> 0 < $349 >>> 0) _abort(); else {
      HEAP32[$RP$1$i$8$lcssa >> 2] = 0;
      $R$3$i$11 = $R$1$i$9$lcssa;
      break;
     }
    } else {
     $359 = HEAP32[$v$4$lcssa$i + 8 >> 2] | 0;
     if ($359 >>> 0 < $349 >>> 0) _abort();
     $361 = $359 + 12 | 0;
     if ((HEAP32[$361 >> 2] | 0) != ($v$4$lcssa$i | 0)) _abort();
     $364 = $356 + 8 | 0;
     if ((HEAP32[$364 >> 2] | 0) == ($v$4$lcssa$i | 0)) {
      HEAP32[$361 >> 2] = $356;
      HEAP32[$364 >> 2] = $359;
      $R$3$i$11 = $356;
      break;
     } else _abort();
    } while (0);
    do if ($354) {
     $382 = HEAP32[$v$4$lcssa$i + 28 >> 2] | 0;
     $383 = 1276 + ($382 << 2) | 0;
     if (($v$4$lcssa$i | 0) == (HEAP32[$383 >> 2] | 0)) {
      HEAP32[$383 >> 2] = $R$3$i$11;
      if (!$R$3$i$11) {
       HEAP32[244] = HEAP32[244] & ~(1 << $382);
       break;
      }
     } else {
      if ($354 >>> 0 < (HEAP32[247] | 0) >>> 0) _abort();
      $392 = $354 + 16 | 0;
      if ((HEAP32[$392 >> 2] | 0) == ($v$4$lcssa$i | 0)) HEAP32[$392 >> 2] = $R$3$i$11; else HEAP32[$354 + 20 >> 2] = $R$3$i$11;
      if (!$R$3$i$11) break;
     }
     $397 = HEAP32[247] | 0;
     if ($R$3$i$11 >>> 0 < $397 >>> 0) _abort();
     HEAP32[$R$3$i$11 + 24 >> 2] = $354;
     $401 = HEAP32[$v$4$lcssa$i + 16 >> 2] | 0;
     do if ($401) if ($401 >>> 0 < $397 >>> 0) _abort(); else {
      HEAP32[$R$3$i$11 + 16 >> 2] = $401;
      HEAP32[$401 + 24 >> 2] = $R$3$i$11;
      break;
     } while (0);
     $407 = HEAP32[$v$4$lcssa$i + 20 >> 2] | 0;
     if ($407) if ($407 >>> 0 < (HEAP32[247] | 0) >>> 0) _abort(); else {
      HEAP32[$R$3$i$11 + 20 >> 2] = $407;
      HEAP32[$407 + 24 >> 2] = $R$3$i$11;
      break;
     }
    } while (0);
    do if ($rsize$4$lcssa$i >>> 0 < 16) {
     $414 = $rsize$4$lcssa$i + $248 | 0;
     HEAP32[$v$4$lcssa$i + 4 >> 2] = $414 | 3;
     $418 = $v$4$lcssa$i + $414 + 4 | 0;
     HEAP32[$418 >> 2] = HEAP32[$418 >> 2] | 1;
    } else {
     HEAP32[$v$4$lcssa$i + 4 >> 2] = $248 | 3;
     HEAP32[$351 + 4 >> 2] = $rsize$4$lcssa$i | 1;
     HEAP32[$351 + $rsize$4$lcssa$i >> 2] = $rsize$4$lcssa$i;
     $426 = $rsize$4$lcssa$i >>> 3;
     if ($rsize$4$lcssa$i >>> 0 < 256) {
      $429 = 1012 + ($426 << 1 << 2) | 0;
      $430 = HEAP32[243] | 0;
      $431 = 1 << $426;
      if (!($430 & $431)) {
       HEAP32[243] = $430 | $431;
       $$pre$phi$i$14Z2D = $429 + 8 | 0;
       $F5$0$i = $429;
      } else {
       $435 = $429 + 8 | 0;
       $436 = HEAP32[$435 >> 2] | 0;
       if ($436 >>> 0 < (HEAP32[247] | 0) >>> 0) _abort(); else {
        $$pre$phi$i$14Z2D = $435;
        $F5$0$i = $436;
       }
      }
      HEAP32[$$pre$phi$i$14Z2D >> 2] = $351;
      HEAP32[$F5$0$i + 12 >> 2] = $351;
      HEAP32[$351 + 8 >> 2] = $F5$0$i;
      HEAP32[$351 + 12 >> 2] = $429;
      break;
     }
     $442 = $rsize$4$lcssa$i >>> 8;
     if (!$442) $I7$0$i = 0; else if ($rsize$4$lcssa$i >>> 0 > 16777215) $I7$0$i = 31; else {
      $447 = ($442 + 1048320 | 0) >>> 16 & 8;
      $448 = $442 << $447;
      $451 = ($448 + 520192 | 0) >>> 16 & 4;
      $453 = $448 << $451;
      $456 = ($453 + 245760 | 0) >>> 16 & 2;
      $461 = 14 - ($451 | $447 | $456) + ($453 << $456 >>> 15) | 0;
      $I7$0$i = $rsize$4$lcssa$i >>> ($461 + 7 | 0) & 1 | $461 << 1;
     }
     $467 = 1276 + ($I7$0$i << 2) | 0;
     HEAP32[$351 + 28 >> 2] = $I7$0$i;
     $469 = $351 + 16 | 0;
     HEAP32[$469 + 4 >> 2] = 0;
     HEAP32[$469 >> 2] = 0;
     $471 = HEAP32[244] | 0;
     $472 = 1 << $I7$0$i;
     if (!($471 & $472)) {
      HEAP32[244] = $471 | $472;
      HEAP32[$467 >> 2] = $351;
      HEAP32[$351 + 24 >> 2] = $467;
      HEAP32[$351 + 12 >> 2] = $351;
      HEAP32[$351 + 8 >> 2] = $351;
      break;
     }
     $K12$0$i = $rsize$4$lcssa$i << (($I7$0$i | 0) == 31 ? 0 : 25 - ($I7$0$i >>> 1) | 0);
     $T$0$i = HEAP32[$467 >> 2] | 0;
     while (1) {
      if ((HEAP32[$T$0$i + 4 >> 2] & -8 | 0) == ($rsize$4$lcssa$i | 0)) {
       $T$0$i$lcssa = $T$0$i;
       label = 148;
       break;
      }
      $490 = $T$0$i + 16 + ($K12$0$i >>> 31 << 2) | 0;
      $492 = HEAP32[$490 >> 2] | 0;
      if (!$492) {
       $$lcssa157 = $490;
       $T$0$i$lcssa156 = $T$0$i;
       label = 145;
       break;
      } else {
       $K12$0$i = $K12$0$i << 1;
       $T$0$i = $492;
      }
     }
     if ((label | 0) == 145) if ($$lcssa157 >>> 0 < (HEAP32[247] | 0) >>> 0) _abort(); else {
      HEAP32[$$lcssa157 >> 2] = $351;
      HEAP32[$351 + 24 >> 2] = $T$0$i$lcssa156;
      HEAP32[$351 + 12 >> 2] = $351;
      HEAP32[$351 + 8 >> 2] = $351;
      break;
     } else if ((label | 0) == 148) {
      $499 = $T$0$i$lcssa + 8 | 0;
      $500 = HEAP32[$499 >> 2] | 0;
      $501 = HEAP32[247] | 0;
      if ($500 >>> 0 >= $501 >>> 0 & $T$0$i$lcssa >>> 0 >= $501 >>> 0) {
       HEAP32[$500 + 12 >> 2] = $351;
       HEAP32[$499 >> 2] = $351;
       HEAP32[$351 + 8 >> 2] = $500;
       HEAP32[$351 + 12 >> 2] = $T$0$i$lcssa;
       HEAP32[$351 + 24 >> 2] = 0;
       break;
      } else _abort();
     }
    } while (0);
    $$0 = $v$4$lcssa$i + 8 | 0;
    return $$0 | 0;
   } else $nb$0 = $248;
  }
 } while (0);
 $509 = HEAP32[245] | 0;
 if ($509 >>> 0 >= $nb$0 >>> 0) {
  $511 = $509 - $nb$0 | 0;
  $512 = HEAP32[248] | 0;
  if ($511 >>> 0 > 15) {
   $514 = $512 + $nb$0 | 0;
   HEAP32[248] = $514;
   HEAP32[245] = $511;
   HEAP32[$514 + 4 >> 2] = $511 | 1;
   HEAP32[$514 + $511 >> 2] = $511;
   HEAP32[$512 + 4 >> 2] = $nb$0 | 3;
  } else {
   HEAP32[245] = 0;
   HEAP32[248] = 0;
   HEAP32[$512 + 4 >> 2] = $509 | 3;
   $523 = $512 + $509 + 4 | 0;
   HEAP32[$523 >> 2] = HEAP32[$523 >> 2] | 1;
  }
  $$0 = $512 + 8 | 0;
  return $$0 | 0;
 }
 $527 = HEAP32[246] | 0;
 if ($527 >>> 0 > $nb$0 >>> 0) {
  $529 = $527 - $nb$0 | 0;
  HEAP32[246] = $529;
  $530 = HEAP32[249] | 0;
  $531 = $530 + $nb$0 | 0;
  HEAP32[249] = $531;
  HEAP32[$531 + 4 >> 2] = $529 | 1;
  HEAP32[$530 + 4 >> 2] = $nb$0 | 3;
  $$0 = $530 + 8 | 0;
  return $$0 | 0;
 }
 do if (!(HEAP32[361] | 0)) {
  $539 = _sysconf(30) | 0;
  if (!($539 + -1 & $539)) {
   HEAP32[363] = $539;
   HEAP32[362] = $539;
   HEAP32[364] = -1;
   HEAP32[365] = -1;
   HEAP32[366] = 0;
   HEAP32[354] = 0;
   HEAP32[361] = (_time(0) | 0) & -16 ^ 1431655768;
   break;
  } else _abort();
 } while (0);
 $546 = $nb$0 + 48 | 0;
 $547 = HEAP32[363] | 0;
 $548 = $nb$0 + 47 | 0;
 $549 = $547 + $548 | 0;
 $550 = 0 - $547 | 0;
 $551 = $549 & $550;
 if ($551 >>> 0 <= $nb$0 >>> 0) {
  $$0 = 0;
  return $$0 | 0;
 }
 $553 = HEAP32[353] | 0;
 if ($553) {
  $555 = HEAP32[351] | 0;
  $556 = $555 + $551 | 0;
  if ($556 >>> 0 <= $555 >>> 0 | $556 >>> 0 > $553 >>> 0) {
   $$0 = 0;
   return $$0 | 0;
  }
 }
 L257 : do if (!(HEAP32[354] & 4)) {
  $562 = HEAP32[249] | 0;
  L259 : do if (!$562) label = 173; else {
   $sp$0$i$i = 1420;
   while (1) {
    $564 = HEAP32[$sp$0$i$i >> 2] | 0;
    if ($564 >>> 0 <= $562 >>> 0) {
     $566 = $sp$0$i$i + 4 | 0;
     if (($564 + (HEAP32[$566 >> 2] | 0) | 0) >>> 0 > $562 >>> 0) {
      $$lcssa153 = $sp$0$i$i;
      $$lcssa155 = $566;
      break;
     }
    }
    $sp$0$i$i = HEAP32[$sp$0$i$i + 8 >> 2] | 0;
    if (!$sp$0$i$i) {
     label = 173;
     break L259;
    }
   }
   $597 = $549 - (HEAP32[246] | 0) & $550;
   if ($597 >>> 0 < 2147483647) {
    $599 = _sbrk($597 | 0) | 0;
    if (($599 | 0) == ((HEAP32[$$lcssa153 >> 2] | 0) + (HEAP32[$$lcssa155 >> 2] | 0) | 0)) {
     if (($599 | 0) != (-1 | 0)) {
      $tbase$747$i = $599;
      $tsize$746$i = $597;
      label = 193;
      break L257;
     }
    } else {
     $br$2$ph$i = $599;
     $ssize$2$ph$i = $597;
     label = 183;
    }
   }
  } while (0);
  do if ((label | 0) == 173) {
   $573 = _sbrk(0) | 0;
   if (($573 | 0) != (-1 | 0)) {
    $575 = $573;
    $576 = HEAP32[362] | 0;
    $577 = $576 + -1 | 0;
    if (!($577 & $575)) $ssize$0$i = $551; else $ssize$0$i = $551 - $575 + ($577 + $575 & 0 - $576) | 0;
    $585 = HEAP32[351] | 0;
    $586 = $585 + $ssize$0$i | 0;
    if ($ssize$0$i >>> 0 > $nb$0 >>> 0 & $ssize$0$i >>> 0 < 2147483647) {
     $589 = HEAP32[353] | 0;
     if ($589) if ($586 >>> 0 <= $585 >>> 0 | $586 >>> 0 > $589 >>> 0) break;
     $593 = _sbrk($ssize$0$i | 0) | 0;
     if (($593 | 0) == ($573 | 0)) {
      $tbase$747$i = $573;
      $tsize$746$i = $ssize$0$i;
      label = 193;
      break L257;
     } else {
      $br$2$ph$i = $593;
      $ssize$2$ph$i = $ssize$0$i;
      label = 183;
     }
    }
   }
  } while (0);
  L279 : do if ((label | 0) == 183) {
   $605 = 0 - $ssize$2$ph$i | 0;
   do if ($546 >>> 0 > $ssize$2$ph$i >>> 0 & ($ssize$2$ph$i >>> 0 < 2147483647 & ($br$2$ph$i | 0) != (-1 | 0))) {
    $609 = HEAP32[363] | 0;
    $613 = $548 - $ssize$2$ph$i + $609 & 0 - $609;
    if ($613 >>> 0 < 2147483647) if ((_sbrk($613 | 0) | 0) == (-1 | 0)) {
     _sbrk($605 | 0) | 0;
     break L279;
    } else {
     $ssize$5$i = $613 + $ssize$2$ph$i | 0;
     break;
    } else $ssize$5$i = $ssize$2$ph$i;
   } else $ssize$5$i = $ssize$2$ph$i; while (0);
   if (($br$2$ph$i | 0) != (-1 | 0)) {
    $tbase$747$i = $br$2$ph$i;
    $tsize$746$i = $ssize$5$i;
    label = 193;
    break L257;
   }
  } while (0);
  HEAP32[354] = HEAP32[354] | 4;
  label = 190;
 } else label = 190; while (0);
 if ((label | 0) == 190) if ($551 >>> 0 < 2147483647) {
  $622 = _sbrk($551 | 0) | 0;
  $623 = _sbrk(0) | 0;
  if ($622 >>> 0 < $623 >>> 0 & (($622 | 0) != (-1 | 0) & ($623 | 0) != (-1 | 0))) {
   $629 = $623 - $622 | 0;
   if ($629 >>> 0 > ($nb$0 + 40 | 0) >>> 0) {
    $tbase$747$i = $622;
    $tsize$746$i = $629;
    label = 193;
   }
  }
 }
 if ((label | 0) == 193) {
  $632 = (HEAP32[351] | 0) + $tsize$746$i | 0;
  HEAP32[351] = $632;
  if ($632 >>> 0 > (HEAP32[352] | 0) >>> 0) HEAP32[352] = $632;
  $635 = HEAP32[249] | 0;
  do if (!$635) {
   $637 = HEAP32[247] | 0;
   if (($637 | 0) == 0 | $tbase$747$i >>> 0 < $637 >>> 0) HEAP32[247] = $tbase$747$i;
   HEAP32[355] = $tbase$747$i;
   HEAP32[356] = $tsize$746$i;
   HEAP32[358] = 0;
   HEAP32[252] = HEAP32[361];
   HEAP32[251] = -1;
   $i$01$i$i = 0;
   do {
    $642 = 1012 + ($i$01$i$i << 1 << 2) | 0;
    HEAP32[$642 + 12 >> 2] = $642;
    HEAP32[$642 + 8 >> 2] = $642;
    $i$01$i$i = $i$01$i$i + 1 | 0;
   } while (($i$01$i$i | 0) != 32);
   $648 = $tbase$747$i + 8 | 0;
   $653 = ($648 & 7 | 0) == 0 ? 0 : 0 - $648 & 7;
   $654 = $tbase$747$i + $653 | 0;
   $655 = $tsize$746$i + -40 - $653 | 0;
   HEAP32[249] = $654;
   HEAP32[246] = $655;
   HEAP32[$654 + 4 >> 2] = $655 | 1;
   HEAP32[$654 + $655 + 4 >> 2] = 40;
   HEAP32[250] = HEAP32[365];
  } else {
   $sp$069$i = 1420;
   do {
    $661 = HEAP32[$sp$069$i >> 2] | 0;
    $662 = $sp$069$i + 4 | 0;
    $663 = HEAP32[$662 >> 2] | 0;
    if (($tbase$747$i | 0) == ($661 + $663 | 0)) {
     $$lcssa147 = $661;
     $$lcssa149 = $662;
     $$lcssa151 = $663;
     $sp$069$i$lcssa = $sp$069$i;
     label = 203;
     break;
    }
    $sp$069$i = HEAP32[$sp$069$i + 8 >> 2] | 0;
   } while (($sp$069$i | 0) != 0);
   if ((label | 0) == 203) if (!(HEAP32[$sp$069$i$lcssa + 12 >> 2] & 8)) if ($635 >>> 0 < $tbase$747$i >>> 0 & $635 >>> 0 >= $$lcssa147 >>> 0) {
    HEAP32[$$lcssa149 >> 2] = $$lcssa151 + $tsize$746$i;
    $678 = $635 + 8 | 0;
    $683 = ($678 & 7 | 0) == 0 ? 0 : 0 - $678 & 7;
    $684 = $635 + $683 | 0;
    $686 = $tsize$746$i - $683 + (HEAP32[246] | 0) | 0;
    HEAP32[249] = $684;
    HEAP32[246] = $686;
    HEAP32[$684 + 4 >> 2] = $686 | 1;
    HEAP32[$684 + $686 + 4 >> 2] = 40;
    HEAP32[250] = HEAP32[365];
    break;
   }
   $692 = HEAP32[247] | 0;
   if ($tbase$747$i >>> 0 < $692 >>> 0) {
    HEAP32[247] = $tbase$747$i;
    $757 = $tbase$747$i;
   } else $757 = $692;
   $694 = $tbase$747$i + $tsize$746$i | 0;
   $sp$168$i = 1420;
   while (1) {
    if ((HEAP32[$sp$168$i >> 2] | 0) == ($694 | 0)) {
     $$lcssa144 = $sp$168$i;
     $sp$168$i$lcssa = $sp$168$i;
     label = 211;
     break;
    }
    $sp$168$i = HEAP32[$sp$168$i + 8 >> 2] | 0;
    if (!$sp$168$i) {
     $sp$0$i$i$i = 1420;
     break;
    }
   }
   if ((label | 0) == 211) if (!(HEAP32[$sp$168$i$lcssa + 12 >> 2] & 8)) {
    HEAP32[$$lcssa144 >> 2] = $tbase$747$i;
    $704 = $sp$168$i$lcssa + 4 | 0;
    HEAP32[$704 >> 2] = (HEAP32[$704 >> 2] | 0) + $tsize$746$i;
    $708 = $tbase$747$i + 8 | 0;
    $714 = $tbase$747$i + (($708 & 7 | 0) == 0 ? 0 : 0 - $708 & 7) | 0;
    $716 = $694 + 8 | 0;
    $722 = $694 + (($716 & 7 | 0) == 0 ? 0 : 0 - $716 & 7) | 0;
    $726 = $714 + $nb$0 | 0;
    $727 = $722 - $714 - $nb$0 | 0;
    HEAP32[$714 + 4 >> 2] = $nb$0 | 3;
    do if (($722 | 0) == ($635 | 0)) {
     $732 = (HEAP32[246] | 0) + $727 | 0;
     HEAP32[246] = $732;
     HEAP32[249] = $726;
     HEAP32[$726 + 4 >> 2] = $732 | 1;
    } else {
     if (($722 | 0) == (HEAP32[248] | 0)) {
      $738 = (HEAP32[245] | 0) + $727 | 0;
      HEAP32[245] = $738;
      HEAP32[248] = $726;
      HEAP32[$726 + 4 >> 2] = $738 | 1;
      HEAP32[$726 + $738 >> 2] = $738;
      break;
     }
     $743 = HEAP32[$722 + 4 >> 2] | 0;
     if (($743 & 3 | 0) == 1) {
      $746 = $743 & -8;
      $747 = $743 >>> 3;
      L331 : do if ($743 >>> 0 < 256) {
       $750 = HEAP32[$722 + 8 >> 2] | 0;
       $752 = HEAP32[$722 + 12 >> 2] | 0;
       $754 = 1012 + ($747 << 1 << 2) | 0;
       do if (($750 | 0) != ($754 | 0)) {
        if ($750 >>> 0 < $757 >>> 0) _abort();
        if ((HEAP32[$750 + 12 >> 2] | 0) == ($722 | 0)) break;
        _abort();
       } while (0);
       if (($752 | 0) == ($750 | 0)) {
        HEAP32[243] = HEAP32[243] & ~(1 << $747);
        break;
       }
       do if (($752 | 0) == ($754 | 0)) $$pre$phi10$i$iZ2D = $752 + 8 | 0; else {
        if ($752 >>> 0 < $757 >>> 0) _abort();
        $768 = $752 + 8 | 0;
        if ((HEAP32[$768 >> 2] | 0) == ($722 | 0)) {
         $$pre$phi10$i$iZ2D = $768;
         break;
        }
        _abort();
       } while (0);
       HEAP32[$750 + 12 >> 2] = $752;
       HEAP32[$$pre$phi10$i$iZ2D >> 2] = $750;
      } else {
       $773 = HEAP32[$722 + 24 >> 2] | 0;
       $775 = HEAP32[$722 + 12 >> 2] | 0;
       do if (($775 | 0) == ($722 | 0)) {
        $786 = $722 + 16 | 0;
        $787 = $786 + 4 | 0;
        $788 = HEAP32[$787 >> 2] | 0;
        if (!$788) {
         $790 = HEAP32[$786 >> 2] | 0;
         if (!$790) {
          $R$3$i$i = 0;
          break;
         } else {
          $R$1$i$i = $790;
          $RP$1$i$i = $786;
         }
        } else {
         $R$1$i$i = $788;
         $RP$1$i$i = $787;
        }
        while (1) {
         $792 = $R$1$i$i + 20 | 0;
         $793 = HEAP32[$792 >> 2] | 0;
         if ($793) {
          $R$1$i$i = $793;
          $RP$1$i$i = $792;
          continue;
         }
         $795 = $R$1$i$i + 16 | 0;
         $796 = HEAP32[$795 >> 2] | 0;
         if (!$796) {
          $R$1$i$i$lcssa = $R$1$i$i;
          $RP$1$i$i$lcssa = $RP$1$i$i;
          break;
         } else {
          $R$1$i$i = $796;
          $RP$1$i$i = $795;
         }
        }
        if ($RP$1$i$i$lcssa >>> 0 < $757 >>> 0) _abort(); else {
         HEAP32[$RP$1$i$i$lcssa >> 2] = 0;
         $R$3$i$i = $R$1$i$i$lcssa;
         break;
        }
       } else {
        $778 = HEAP32[$722 + 8 >> 2] | 0;
        if ($778 >>> 0 < $757 >>> 0) _abort();
        $780 = $778 + 12 | 0;
        if ((HEAP32[$780 >> 2] | 0) != ($722 | 0)) _abort();
        $783 = $775 + 8 | 0;
        if ((HEAP32[$783 >> 2] | 0) == ($722 | 0)) {
         HEAP32[$780 >> 2] = $775;
         HEAP32[$783 >> 2] = $778;
         $R$3$i$i = $775;
         break;
        } else _abort();
       } while (0);
       if (!$773) break;
       $801 = HEAP32[$722 + 28 >> 2] | 0;
       $802 = 1276 + ($801 << 2) | 0;
       do if (($722 | 0) == (HEAP32[$802 >> 2] | 0)) {
        HEAP32[$802 >> 2] = $R$3$i$i;
        if ($R$3$i$i) break;
        HEAP32[244] = HEAP32[244] & ~(1 << $801);
        break L331;
       } else {
        if ($773 >>> 0 < (HEAP32[247] | 0) >>> 0) _abort();
        $811 = $773 + 16 | 0;
        if ((HEAP32[$811 >> 2] | 0) == ($722 | 0)) HEAP32[$811 >> 2] = $R$3$i$i; else HEAP32[$773 + 20 >> 2] = $R$3$i$i;
        if (!$R$3$i$i) break L331;
       } while (0);
       $816 = HEAP32[247] | 0;
       if ($R$3$i$i >>> 0 < $816 >>> 0) _abort();
       HEAP32[$R$3$i$i + 24 >> 2] = $773;
       $819 = $722 + 16 | 0;
       $820 = HEAP32[$819 >> 2] | 0;
       do if ($820) if ($820 >>> 0 < $816 >>> 0) _abort(); else {
        HEAP32[$R$3$i$i + 16 >> 2] = $820;
        HEAP32[$820 + 24 >> 2] = $R$3$i$i;
        break;
       } while (0);
       $826 = HEAP32[$819 + 4 >> 2] | 0;
       if (!$826) break;
       if ($826 >>> 0 < (HEAP32[247] | 0) >>> 0) _abort(); else {
        HEAP32[$R$3$i$i + 20 >> 2] = $826;
        HEAP32[$826 + 24 >> 2] = $R$3$i$i;
        break;
       }
      } while (0);
      $oldfirst$0$i$i = $722 + $746 | 0;
      $qsize$0$i$i = $746 + $727 | 0;
     } else {
      $oldfirst$0$i$i = $722;
      $qsize$0$i$i = $727;
     }
     $834 = $oldfirst$0$i$i + 4 | 0;
     HEAP32[$834 >> 2] = HEAP32[$834 >> 2] & -2;
     HEAP32[$726 + 4 >> 2] = $qsize$0$i$i | 1;
     HEAP32[$726 + $qsize$0$i$i >> 2] = $qsize$0$i$i;
     $840 = $qsize$0$i$i >>> 3;
     if ($qsize$0$i$i >>> 0 < 256) {
      $843 = 1012 + ($840 << 1 << 2) | 0;
      $844 = HEAP32[243] | 0;
      $845 = 1 << $840;
      do if (!($844 & $845)) {
       HEAP32[243] = $844 | $845;
       $$pre$phi$i$17$iZ2D = $843 + 8 | 0;
       $F4$0$i$i = $843;
      } else {
       $849 = $843 + 8 | 0;
       $850 = HEAP32[$849 >> 2] | 0;
       if ($850 >>> 0 >= (HEAP32[247] | 0) >>> 0) {
        $$pre$phi$i$17$iZ2D = $849;
        $F4$0$i$i = $850;
        break;
       }
       _abort();
      } while (0);
      HEAP32[$$pre$phi$i$17$iZ2D >> 2] = $726;
      HEAP32[$F4$0$i$i + 12 >> 2] = $726;
      HEAP32[$726 + 8 >> 2] = $F4$0$i$i;
      HEAP32[$726 + 12 >> 2] = $843;
      break;
     }
     $856 = $qsize$0$i$i >>> 8;
     do if (!$856) $I7$0$i$i = 0; else {
      if ($qsize$0$i$i >>> 0 > 16777215) {
       $I7$0$i$i = 31;
       break;
      }
      $861 = ($856 + 1048320 | 0) >>> 16 & 8;
      $862 = $856 << $861;
      $865 = ($862 + 520192 | 0) >>> 16 & 4;
      $867 = $862 << $865;
      $870 = ($867 + 245760 | 0) >>> 16 & 2;
      $875 = 14 - ($865 | $861 | $870) + ($867 << $870 >>> 15) | 0;
      $I7$0$i$i = $qsize$0$i$i >>> ($875 + 7 | 0) & 1 | $875 << 1;
     } while (0);
     $881 = 1276 + ($I7$0$i$i << 2) | 0;
     HEAP32[$726 + 28 >> 2] = $I7$0$i$i;
     $883 = $726 + 16 | 0;
     HEAP32[$883 + 4 >> 2] = 0;
     HEAP32[$883 >> 2] = 0;
     $885 = HEAP32[244] | 0;
     $886 = 1 << $I7$0$i$i;
     if (!($885 & $886)) {
      HEAP32[244] = $885 | $886;
      HEAP32[$881 >> 2] = $726;
      HEAP32[$726 + 24 >> 2] = $881;
      HEAP32[$726 + 12 >> 2] = $726;
      HEAP32[$726 + 8 >> 2] = $726;
      break;
     }
     $K8$0$i$i = $qsize$0$i$i << (($I7$0$i$i | 0) == 31 ? 0 : 25 - ($I7$0$i$i >>> 1) | 0);
     $T$0$i$18$i = HEAP32[$881 >> 2] | 0;
     while (1) {
      if ((HEAP32[$T$0$i$18$i + 4 >> 2] & -8 | 0) == ($qsize$0$i$i | 0)) {
       $T$0$i$18$i$lcssa = $T$0$i$18$i;
       label = 281;
       break;
      }
      $904 = $T$0$i$18$i + 16 + ($K8$0$i$i >>> 31 << 2) | 0;
      $906 = HEAP32[$904 >> 2] | 0;
      if (!$906) {
       $$lcssa = $904;
       $T$0$i$18$i$lcssa139 = $T$0$i$18$i;
       label = 278;
       break;
      } else {
       $K8$0$i$i = $K8$0$i$i << 1;
       $T$0$i$18$i = $906;
      }
     }
     if ((label | 0) == 278) if ($$lcssa >>> 0 < (HEAP32[247] | 0) >>> 0) _abort(); else {
      HEAP32[$$lcssa >> 2] = $726;
      HEAP32[$726 + 24 >> 2] = $T$0$i$18$i$lcssa139;
      HEAP32[$726 + 12 >> 2] = $726;
      HEAP32[$726 + 8 >> 2] = $726;
      break;
     } else if ((label | 0) == 281) {
      $913 = $T$0$i$18$i$lcssa + 8 | 0;
      $914 = HEAP32[$913 >> 2] | 0;
      $915 = HEAP32[247] | 0;
      if ($914 >>> 0 >= $915 >>> 0 & $T$0$i$18$i$lcssa >>> 0 >= $915 >>> 0) {
       HEAP32[$914 + 12 >> 2] = $726;
       HEAP32[$913 >> 2] = $726;
       HEAP32[$726 + 8 >> 2] = $914;
       HEAP32[$726 + 12 >> 2] = $T$0$i$18$i$lcssa;
       HEAP32[$726 + 24 >> 2] = 0;
       break;
      } else _abort();
     }
    } while (0);
    $$0 = $714 + 8 | 0;
    return $$0 | 0;
   } else $sp$0$i$i$i = 1420;
   while (1) {
    $922 = HEAP32[$sp$0$i$i$i >> 2] | 0;
    if ($922 >>> 0 <= $635 >>> 0) {
     $926 = $922 + (HEAP32[$sp$0$i$i$i + 4 >> 2] | 0) | 0;
     if ($926 >>> 0 > $635 >>> 0) {
      $$lcssa142 = $926;
      break;
     }
    }
    $sp$0$i$i$i = HEAP32[$sp$0$i$i$i + 8 >> 2] | 0;
   }
   $930 = $$lcssa142 + -47 | 0;
   $932 = $930 + 8 | 0;
   $938 = $930 + (($932 & 7 | 0) == 0 ? 0 : 0 - $932 & 7) | 0;
   $939 = $635 + 16 | 0;
   $941 = $938 >>> 0 < $939 >>> 0 ? $635 : $938;
   $942 = $941 + 8 | 0;
   $946 = $tbase$747$i + 8 | 0;
   $951 = ($946 & 7 | 0) == 0 ? 0 : 0 - $946 & 7;
   $952 = $tbase$747$i + $951 | 0;
   $953 = $tsize$746$i + -40 - $951 | 0;
   HEAP32[249] = $952;
   HEAP32[246] = $953;
   HEAP32[$952 + 4 >> 2] = $953 | 1;
   HEAP32[$952 + $953 + 4 >> 2] = 40;
   HEAP32[250] = HEAP32[365];
   $959 = $941 + 4 | 0;
   HEAP32[$959 >> 2] = 27;
   HEAP32[$942 >> 2] = HEAP32[355];
   HEAP32[$942 + 4 >> 2] = HEAP32[356];
   HEAP32[$942 + 8 >> 2] = HEAP32[357];
   HEAP32[$942 + 12 >> 2] = HEAP32[358];
   HEAP32[355] = $tbase$747$i;
   HEAP32[356] = $tsize$746$i;
   HEAP32[358] = 0;
   HEAP32[357] = $942;
   $p$0$i$i = $941 + 24 | 0;
   do {
    $p$0$i$i = $p$0$i$i + 4 | 0;
    HEAP32[$p$0$i$i >> 2] = 7;
   } while (($p$0$i$i + 4 | 0) >>> 0 < $$lcssa142 >>> 0);
   if (($941 | 0) != ($635 | 0)) {
    $966 = $941 - $635 | 0;
    HEAP32[$959 >> 2] = HEAP32[$959 >> 2] & -2;
    HEAP32[$635 + 4 >> 2] = $966 | 1;
    HEAP32[$941 >> 2] = $966;
    $971 = $966 >>> 3;
    if ($966 >>> 0 < 256) {
     $974 = 1012 + ($971 << 1 << 2) | 0;
     $975 = HEAP32[243] | 0;
     $976 = 1 << $971;
     if (!($975 & $976)) {
      HEAP32[243] = $975 | $976;
      $$pre$phi$i$iZ2D = $974 + 8 | 0;
      $F$0$i$i = $974;
     } else {
      $980 = $974 + 8 | 0;
      $981 = HEAP32[$980 >> 2] | 0;
      if ($981 >>> 0 < (HEAP32[247] | 0) >>> 0) _abort(); else {
       $$pre$phi$i$iZ2D = $980;
       $F$0$i$i = $981;
      }
     }
     HEAP32[$$pre$phi$i$iZ2D >> 2] = $635;
     HEAP32[$F$0$i$i + 12 >> 2] = $635;
     HEAP32[$635 + 8 >> 2] = $F$0$i$i;
     HEAP32[$635 + 12 >> 2] = $974;
     break;
    }
    $987 = $966 >>> 8;
    if (!$987) $I1$0$i$i = 0; else if ($966 >>> 0 > 16777215) $I1$0$i$i = 31; else {
     $992 = ($987 + 1048320 | 0) >>> 16 & 8;
     $993 = $987 << $992;
     $996 = ($993 + 520192 | 0) >>> 16 & 4;
     $998 = $993 << $996;
     $1001 = ($998 + 245760 | 0) >>> 16 & 2;
     $1006 = 14 - ($996 | $992 | $1001) + ($998 << $1001 >>> 15) | 0;
     $I1$0$i$i = $966 >>> ($1006 + 7 | 0) & 1 | $1006 << 1;
    }
    $1012 = 1276 + ($I1$0$i$i << 2) | 0;
    HEAP32[$635 + 28 >> 2] = $I1$0$i$i;
    HEAP32[$635 + 20 >> 2] = 0;
    HEAP32[$939 >> 2] = 0;
    $1015 = HEAP32[244] | 0;
    $1016 = 1 << $I1$0$i$i;
    if (!($1015 & $1016)) {
     HEAP32[244] = $1015 | $1016;
     HEAP32[$1012 >> 2] = $635;
     HEAP32[$635 + 24 >> 2] = $1012;
     HEAP32[$635 + 12 >> 2] = $635;
     HEAP32[$635 + 8 >> 2] = $635;
     break;
    }
    $K2$0$i$i = $966 << (($I1$0$i$i | 0) == 31 ? 0 : 25 - ($I1$0$i$i >>> 1) | 0);
    $T$0$i$i = HEAP32[$1012 >> 2] | 0;
    while (1) {
     if ((HEAP32[$T$0$i$i + 4 >> 2] & -8 | 0) == ($966 | 0)) {
      $T$0$i$i$lcssa = $T$0$i$i;
      label = 307;
      break;
     }
     $1034 = $T$0$i$i + 16 + ($K2$0$i$i >>> 31 << 2) | 0;
     $1036 = HEAP32[$1034 >> 2] | 0;
     if (!$1036) {
      $$lcssa141 = $1034;
      $T$0$i$i$lcssa140 = $T$0$i$i;
      label = 304;
      break;
     } else {
      $K2$0$i$i = $K2$0$i$i << 1;
      $T$0$i$i = $1036;
     }
    }
    if ((label | 0) == 304) if ($$lcssa141 >>> 0 < (HEAP32[247] | 0) >>> 0) _abort(); else {
     HEAP32[$$lcssa141 >> 2] = $635;
     HEAP32[$635 + 24 >> 2] = $T$0$i$i$lcssa140;
     HEAP32[$635 + 12 >> 2] = $635;
     HEAP32[$635 + 8 >> 2] = $635;
     break;
    } else if ((label | 0) == 307) {
     $1043 = $T$0$i$i$lcssa + 8 | 0;
     $1044 = HEAP32[$1043 >> 2] | 0;
     $1045 = HEAP32[247] | 0;
     if ($1044 >>> 0 >= $1045 >>> 0 & $T$0$i$i$lcssa >>> 0 >= $1045 >>> 0) {
      HEAP32[$1044 + 12 >> 2] = $635;
      HEAP32[$1043 >> 2] = $635;
      HEAP32[$635 + 8 >> 2] = $1044;
      HEAP32[$635 + 12 >> 2] = $T$0$i$i$lcssa;
      HEAP32[$635 + 24 >> 2] = 0;
      break;
     } else _abort();
    }
   }
  } while (0);
  $1053 = HEAP32[246] | 0;
  if ($1053 >>> 0 > $nb$0 >>> 0) {
   $1055 = $1053 - $nb$0 | 0;
   HEAP32[246] = $1055;
   $1056 = HEAP32[249] | 0;
   $1057 = $1056 + $nb$0 | 0;
   HEAP32[249] = $1057;
   HEAP32[$1057 + 4 >> 2] = $1055 | 1;
   HEAP32[$1056 + 4 >> 2] = $nb$0 | 3;
   $$0 = $1056 + 8 | 0;
   return $$0 | 0;
  }
 }
 HEAP32[(___errno_location() | 0) >> 2] = 12;
 $$0 = 0;
 return $$0 | 0;
}

function _vfscanf($f, $fmt, $ap) {
 $f = $f | 0;
 $fmt = $fmt | 0;
 $ap = $ap | 0;
 var $$ = 0, $$lcssa = 0, $$lcssa386 = 0, $$lcssa40 = 0, $$pre$phi184Z2D = 0, $$size$0 = 0, $0 = 0, $10 = 0, $104 = 0, $105 = 0, $107 = 0, $109 = 0, $11 = 0, $112 = 0, $115 = 0, $117 = 0, $12 = 0, $125 = 0, $129 = 0, $13 = 0, $136 = 0, $14 = 0, $142 = 0, $148 = 0, $15 = 0, $150 = 0, $151 = 0, $156 = 0, $160 = 0, $164 = 0, $166 = 0, $168 = 0, $17 = 0, $173 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $181 = 0, $186 = 0, $190 = 0, $195 = 0, $196 = 0, $197 = 0, $199 = 0, $20 = 0, $201 = 0, $202 = 0, $210 = 0, $220 = 0, $222 = 0, $226 = 0, $228 = 0, $236 = 0, $244 = 0, $245 = 0, $248 = 0, $25 = 0, $250 = 0, $256 = 0, $263 = 0, $265 = 0, $271 = 0, $278 = 0, $283 = 0, $284 = 0, $291 = 0, $304 = 0, $308 = 0.0, $32 = 0, $327 = 0, $38 = 0, $44 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $51 = 0, $52 = 0, $61 = 0, $7 = 0, $8 = 0, $81 = 0, $82 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $alloc$0 = 0, $alloc$0402 = 0, $alloc$1 = 0, $alloc$2 = 0, $ap2$i = 0, $base$0 = 0, $c$0102 = 0, $dest$0 = 0, $i$0$i = 0, $i$0$ph = 0, $i$0$ph$phi = 0, $i$0$ph22 = 0, $i$0$ph22$lcssa = 0, $i$1 = 0, $i$2 = 0, $i$2$ph = 0, $i$2$ph$phi = 0, $i$3 = 0, $i$4 = 0, $invert$0 = 0, $isdigittmp = 0, $k$0$ph = 0, $k$1$ph = 0, $matches$0107 = 0, $matches$0107$lcssa = 0, $matches$0107371 = 0, $matches$1 = 0, $matches$2 = 0, $matches$3 = 0, $p$0110 = 0, $p$1 = 0, $p$1$lcssa = 0, $p$10 = 0, $p$11 = 0, $p$2 = 0, $p$3$lcssa = 0, $p$398 = 0, $p$4 = 0, $p$5 = 0, $p$6 = 0, $p$7 = 0, $p$7$ph = 0, $p$8 = 0, $p$9 = 0, $pos$0111 = 0, $pos$1 = 0, $pos$2 = 0, $s$0105 = 0, $s$0105$lcssa = 0, $s$1 = 0, $s$2$ph = 0, $s$4 = 0, $s$5 = 0, $s$6 = 0, $s$7 = 0, $s$8 = 0, $s$9 = 0, $scanset = 0, $size$0 = 0, $st = 0, $wc = 0, $wcs$0106 = 0, $wcs$0106$lcssa = 0, $wcs$1 = 0, $wcs$10 = 0, $wcs$2 = 0, $wcs$3$ph = 0, $wcs$3$ph$lcssa = 0, $wcs$5 = 0, $wcs$6 = 0, $wcs$7 = 0, $wcs$8 = 0, $wcs$9 = 0, $width$0$lcssa = 0, $width$099 = 0, $width$1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 304 | 0;
 $ap2$i = sp + 16 | 0;
 $st = sp + 8 | 0;
 $scanset = sp + 33 | 0;
 $wc = sp;
 $0 = sp + 32 | 0;
 if ((HEAP32[$f + 76 >> 2] | 0) > -1) $327 = ___lockfile($f) | 0; else $327 = 0;
 $5 = HEAP8[$fmt >> 0] | 0;
 L4 : do if (!($5 << 24 >> 24)) $matches$3 = 0; else {
  $7 = $f + 4 | 0;
  $8 = $f + 100 | 0;
  $9 = $f + 108 | 0;
  $10 = $f + 8 | 0;
  $11 = $scanset + 10 | 0;
  $12 = $scanset + 33 | 0;
  $13 = $st + 4 | 0;
  $14 = $scanset + 46 | 0;
  $15 = $scanset + 94 | 0;
  $17 = $5;
  $matches$0107 = 0;
  $p$0110 = $fmt;
  $pos$0111 = 0;
  $s$0105 = 0;
  $wcs$0106 = 0;
  L6 : while (1) {
   L8 : do if (!(_isspace($17 & 255) | 0)) {
    $47 = (HEAP8[$p$0110 >> 0] | 0) == 37;
    L10 : do if ($47) {
     $48 = $p$0110 + 1 | 0;
     $49 = HEAP8[$48 >> 0] | 0;
     L12 : do switch ($49 << 24 >> 24) {
     case 37:
      {
       break L10;
       break;
      }
     case 42:
      {
       $dest$0 = 0;
       $p$2 = $p$0110 + 2 | 0;
       break;
      }
     default:
      {
       $isdigittmp = ($49 & 255) + -48 | 0;
       if ($isdigittmp >>> 0 < 10) if ((HEAP8[$p$0110 + 2 >> 0] | 0) == 36) {
        HEAP32[$ap2$i >> 2] = HEAP32[$ap >> 2];
        $i$0$i = $isdigittmp;
        while (1) {
         $81 = (HEAP32[$ap2$i >> 2] | 0) + (4 - 1) & ~(4 - 1);
         $82 = HEAP32[$81 >> 2] | 0;
         HEAP32[$ap2$i >> 2] = $81 + 4;
         if ($i$0$i >>> 0 > 1) $i$0$i = $i$0$i + -1 | 0; else {
          $$lcssa = $82;
          break;
         }
        }
        $dest$0 = $$lcssa;
        $p$2 = $p$0110 + 3 | 0;
        break L12;
       }
       $90 = (HEAP32[$ap >> 2] | 0) + (4 - 1) & ~(4 - 1);
       $91 = HEAP32[$90 >> 2] | 0;
       HEAP32[$ap >> 2] = $90 + 4;
       $dest$0 = $91;
       $p$2 = $48;
      }
     } while (0);
     $92 = HEAP8[$p$2 >> 0] | 0;
     $93 = $92 & 255;
     if (($93 + -48 | 0) >>> 0 < 10) {
      $97 = $93;
      $p$398 = $p$2;
      $width$099 = 0;
      while (1) {
       $96 = ($width$099 * 10 | 0) + -48 + $97 | 0;
       $98 = $p$398 + 1 | 0;
       $99 = HEAP8[$98 >> 0] | 0;
       $97 = $99 & 255;
       if (($97 + -48 | 0) >>> 0 >= 10) {
        $$lcssa40 = $99;
        $p$3$lcssa = $98;
        $width$0$lcssa = $96;
        break;
       } else {
        $p$398 = $98;
        $width$099 = $96;
       }
      }
     } else {
      $$lcssa40 = $92;
      $p$3$lcssa = $p$2;
      $width$0$lcssa = 0;
     }
     if ($$lcssa40 << 24 >> 24 == 109) {
      $104 = $p$3$lcssa + 1 | 0;
      $107 = HEAP8[$104 >> 0] | 0;
      $alloc$0 = ($dest$0 | 0) != 0 & 1;
      $p$4 = $104;
      $s$1 = 0;
      $wcs$1 = 0;
     } else {
      $107 = $$lcssa40;
      $alloc$0 = 0;
      $p$4 = $p$3$lcssa;
      $s$1 = $s$0105;
      $wcs$1 = $wcs$0106;
     }
     $105 = $p$4 + 1 | 0;
     switch ($107 & 255 | 0) {
     case 104:
      {
       $109 = (HEAP8[$105 >> 0] | 0) == 104;
       $p$5 = $109 ? $p$4 + 2 | 0 : $105;
       $size$0 = $109 ? -2 : -1;
       break;
      }
     case 108:
      {
       $112 = (HEAP8[$105 >> 0] | 0) == 108;
       $p$5 = $112 ? $p$4 + 2 | 0 : $105;
       $size$0 = $112 ? 3 : 1;
       break;
      }
     case 106:
      {
       $p$5 = $105;
       $size$0 = 3;
       break;
      }
     case 116:
     case 122:
      {
       $p$5 = $105;
       $size$0 = 1;
       break;
      }
     case 76:
      {
       $p$5 = $105;
       $size$0 = 2;
       break;
      }
     case 110:
     case 112:
     case 67:
     case 83:
     case 91:
     case 99:
     case 115:
     case 88:
     case 71:
     case 70:
     case 69:
     case 65:
     case 103:
     case 102:
     case 101:
     case 97:
     case 120:
     case 117:
     case 111:
     case 105:
     case 100:
      {
       $p$5 = $p$4;
       $size$0 = 0;
       break;
      }
     default:
      {
       $alloc$0402 = $alloc$0;
       $matches$0107371 = $matches$0107;
       $s$7 = $s$1;
       $wcs$8 = $wcs$1;
       label = 154;
       break L6;
      }
     }
     $115 = HEAPU8[$p$5 >> 0] | 0;
     $117 = ($115 & 47 | 0) == 3;
     $$ = $117 ? $115 | 32 : $115;
     $$size$0 = $117 ? 1 : $size$0;
     switch ($$ | 0) {
     case 99:
      {
       $pos$1 = $pos$0111;
       $width$1 = ($width$0$lcssa | 0) < 1 ? 1 : $width$0$lcssa;
       break;
      }
     case 91:
      {
       $pos$1 = $pos$0111;
       $width$1 = $width$0$lcssa;
       break;
      }
     case 110:
      {
       if (!$dest$0) {
        $matches$1 = $matches$0107;
        $p$11 = $p$5;
        $pos$2 = $pos$0111;
        $s$6 = $s$1;
        $wcs$7 = $wcs$1;
        break L8;
       }
       switch ($$size$0 | 0) {
       case -2:
        {
         HEAP8[$dest$0 >> 0] = $pos$0111;
         $matches$1 = $matches$0107;
         $p$11 = $p$5;
         $pos$2 = $pos$0111;
         $s$6 = $s$1;
         $wcs$7 = $wcs$1;
         break L8;
         break;
        }
       case -1:
        {
         HEAP16[$dest$0 >> 1] = $pos$0111;
         $matches$1 = $matches$0107;
         $p$11 = $p$5;
         $pos$2 = $pos$0111;
         $s$6 = $s$1;
         $wcs$7 = $wcs$1;
         break L8;
         break;
        }
       case 0:
        {
         HEAP32[$dest$0 >> 2] = $pos$0111;
         $matches$1 = $matches$0107;
         $p$11 = $p$5;
         $pos$2 = $pos$0111;
         $s$6 = $s$1;
         $wcs$7 = $wcs$1;
         break L8;
         break;
        }
       case 1:
        {
         HEAP32[$dest$0 >> 2] = $pos$0111;
         $matches$1 = $matches$0107;
         $p$11 = $p$5;
         $pos$2 = $pos$0111;
         $s$6 = $s$1;
         $wcs$7 = $wcs$1;
         break L8;
         break;
        }
       case 3:
        {
         $125 = $dest$0;
         HEAP32[$125 >> 2] = $pos$0111;
         HEAP32[$125 + 4 >> 2] = (($pos$0111 | 0) < 0) << 31 >> 31;
         $matches$1 = $matches$0107;
         $p$11 = $p$5;
         $pos$2 = $pos$0111;
         $s$6 = $s$1;
         $wcs$7 = $wcs$1;
         break L8;
         break;
        }
       default:
        {
         $matches$1 = $matches$0107;
         $p$11 = $p$5;
         $pos$2 = $pos$0111;
         $s$6 = $s$1;
         $wcs$7 = $wcs$1;
         break L8;
        }
       }
       break;
      }
     default:
      {
       ___shlim($f, 0);
       do {
        $129 = HEAP32[$7 >> 2] | 0;
        if ($129 >>> 0 < (HEAP32[$8 >> 2] | 0) >>> 0) {
         HEAP32[$7 >> 2] = $129 + 1;
         $136 = HEAPU8[$129 >> 0] | 0;
        } else $136 = ___shgetc($f) | 0;
       } while ((_isspace($136) | 0) != 0);
       if (!(HEAP32[$8 >> 2] | 0)) $148 = HEAP32[$7 >> 2] | 0; else {
        $142 = (HEAP32[$7 >> 2] | 0) + -1 | 0;
        HEAP32[$7 >> 2] = $142;
        $148 = $142;
       }
       $pos$1 = (HEAP32[$9 >> 2] | 0) + $pos$0111 + $148 - (HEAP32[$10 >> 2] | 0) | 0;
       $width$1 = $width$0$lcssa;
      }
     }
     ___shlim($f, $width$1);
     $150 = HEAP32[$7 >> 2] | 0;
     $151 = HEAP32[$8 >> 2] | 0;
     if ($150 >>> 0 < $151 >>> 0) {
      HEAP32[$7 >> 2] = $150 + 1;
      $156 = $151;
     } else {
      if ((___shgetc($f) | 0) < 0) {
       $alloc$0402 = $alloc$0;
       $matches$0107371 = $matches$0107;
       $s$7 = $s$1;
       $wcs$8 = $wcs$1;
       label = 154;
       break L6;
      }
      $156 = HEAP32[$8 >> 2] | 0;
     }
     if ($156) HEAP32[$7 >> 2] = (HEAP32[$7 >> 2] | 0) + -1;
     L68 : do switch ($$ | 0) {
     case 91:
     case 99:
     case 115:
      {
       $160 = ($$ | 0) == 99;
       L70 : do if (($$ & 239 | 0) == 99) {
        _memset($scanset | 0, -1, 257) | 0;
        HEAP8[$scanset >> 0] = 0;
        if (($$ | 0) == 115) {
         HEAP8[$12 >> 0] = 0;
         HEAP8[$11 >> 0] = 0;
         HEAP8[$11 + 1 >> 0] = 0;
         HEAP8[$11 + 2 >> 0] = 0;
         HEAP8[$11 + 3 >> 0] = 0;
         HEAP8[$11 + 4 >> 0] = 0;
         $p$9 = $p$5;
        } else $p$9 = $p$5;
       } else {
        $164 = $p$5 + 1 | 0;
        $166 = (HEAP8[$164 >> 0] | 0) == 94;
        $invert$0 = $166 & 1;
        $168 = $166 ? $164 : $p$5;
        $p$6 = $166 ? $p$5 + 2 | 0 : $164;
        _memset($scanset | 0, $166 & 1 | 0, 257) | 0;
        HEAP8[$scanset >> 0] = 0;
        switch (HEAP8[$p$6 >> 0] | 0) {
        case 45:
         {
          $173 = ($invert$0 ^ 1) & 255;
          HEAP8[$14 >> 0] = $173;
          $$pre$phi184Z2D = $173;
          $p$7$ph = $168 + 2 | 0;
          break;
         }
        case 93:
         {
          $176 = ($invert$0 ^ 1) & 255;
          HEAP8[$15 >> 0] = $176;
          $$pre$phi184Z2D = $176;
          $p$7$ph = $168 + 2 | 0;
          break;
         }
        default:
         {
          $$pre$phi184Z2D = ($invert$0 ^ 1) & 255;
          $p$7$ph = $p$6;
         }
        }
        $p$7 = $p$7$ph;
        while (1) {
         $177 = HEAP8[$p$7 >> 0] | 0;
         L81 : do switch ($177 << 24 >> 24) {
         case 0:
          {
           $alloc$0402 = $alloc$0;
           $matches$0107371 = $matches$0107;
           $s$7 = $s$1;
           $wcs$8 = $wcs$1;
           label = 154;
           break L6;
           break;
          }
         case 93:
          {
           $p$9 = $p$7;
           break L70;
           break;
          }
         case 45:
          {
           $178 = $p$7 + 1 | 0;
           $179 = HEAP8[$178 >> 0] | 0;
           switch ($179 << 24 >> 24) {
           case 93:
           case 0:
            {
             $190 = 45;
             $p$8 = $p$7;
             break L81;
             break;
            }
           default:
            {}
           }
           $181 = HEAP8[$p$7 + -1 >> 0] | 0;
           if (($181 & 255) < ($179 & 255)) {
            $c$0102 = $181 & 255;
            do {
             $c$0102 = $c$0102 + 1 | 0;
             HEAP8[$scanset + $c$0102 >> 0] = $$pre$phi184Z2D;
             $186 = HEAP8[$178 >> 0] | 0;
            } while (($c$0102 | 0) < ($186 & 255 | 0));
            $190 = $186;
            $p$8 = $178;
           } else {
            $190 = $179;
            $p$8 = $178;
           }
           break;
          }
         default:
          {
           $190 = $177;
           $p$8 = $p$7;
          }
         } while (0);
         HEAP8[$scanset + (($190 & 255) + 1) >> 0] = $$pre$phi184Z2D;
         $p$7 = $p$8 + 1 | 0;
        }
       } while (0);
       $195 = $160 ? $width$1 + 1 | 0 : 31;
       $196 = ($$size$0 | 0) == 1;
       $197 = ($alloc$0 | 0) != 0;
       L89 : do if ($196) {
        if ($197) {
         $199 = _malloc($195 << 2) | 0;
         if (!$199) {
          $alloc$0402 = $alloc$0;
          $matches$0107371 = $matches$0107;
          $s$7 = 0;
          $wcs$8 = $199;
          label = 154;
          break L6;
         } else $wcs$2 = $199;
        } else $wcs$2 = $dest$0;
        HEAP32[$st >> 2] = 0;
        HEAP32[$13 >> 2] = 0;
        $i$0$ph = 0;
        $k$0$ph = $195;
        $wcs$3$ph = $wcs$2;
        L95 : while (1) {
         $201 = ($wcs$3$ph | 0) == 0;
         $i$0$ph22 = $i$0$ph;
         while (1) {
          L99 : while (1) {
           $202 = HEAP32[$7 >> 2] | 0;
           if ($202 >>> 0 < (HEAP32[$8 >> 2] | 0) >>> 0) {
            HEAP32[$7 >> 2] = $202 + 1;
            $210 = HEAPU8[$202 >> 0] | 0;
           } else $210 = ___shgetc($f) | 0;
           if (!(HEAP8[$scanset + ($210 + 1) >> 0] | 0)) {
            $i$0$ph22$lcssa = $i$0$ph22;
            $wcs$3$ph$lcssa = $wcs$3$ph;
            break L95;
           }
           HEAP8[$0 >> 0] = $210;
           switch (_mbrtowc($wc, $0, 1, $st) | 0) {
           case -1:
            {
             $alloc$0402 = $alloc$0;
             $matches$0107371 = $matches$0107;
             $s$7 = 0;
             $wcs$8 = $wcs$3$ph;
             label = 154;
             break L6;
             break;
            }
           case -2:
            break;
           default:
            break L99;
           }
          }
          if ($201) $i$1 = $i$0$ph22; else {
           HEAP32[$wcs$3$ph + ($i$0$ph22 << 2) >> 2] = HEAP32[$wc >> 2];
           $i$1 = $i$0$ph22 + 1 | 0;
          }
          if ($197 & ($i$1 | 0) == ($k$0$ph | 0)) break; else $i$0$ph22 = $i$1;
         }
         $220 = $k$0$ph << 1 | 1;
         $222 = _realloc($wcs$3$ph, $220 << 2) | 0;
         if (!$222) {
          $alloc$0402 = $alloc$0;
          $matches$0107371 = $matches$0107;
          $s$7 = 0;
          $wcs$8 = $wcs$3$ph;
          label = 154;
          break L6;
         } else {
          $i$0$ph$phi = $k$0$ph;
          $k$0$ph = $220;
          $wcs$3$ph = $222;
          $i$0$ph = $i$0$ph$phi;
         }
        }
        if (!(_mbsinit($st) | 0)) {
         $alloc$0402 = $alloc$0;
         $matches$0107371 = $matches$0107;
         $s$7 = 0;
         $wcs$8 = $wcs$3$ph$lcssa;
         label = 154;
         break L6;
        } else {
         $i$4 = $i$0$ph22$lcssa;
         $s$4 = 0;
         $wcs$5 = $wcs$3$ph$lcssa;
        }
       } else {
        if ($197) {
         $226 = _malloc($195) | 0;
         if (!$226) {
          $alloc$0402 = $alloc$0;
          $matches$0107371 = $matches$0107;
          $s$7 = 0;
          $wcs$8 = 0;
          label = 154;
          break L6;
         } else {
          $i$2$ph = 0;
          $k$1$ph = $195;
          $s$2$ph = $226;
         }
         while (1) {
          $i$2 = $i$2$ph;
          do {
           $228 = HEAP32[$7 >> 2] | 0;
           if ($228 >>> 0 < (HEAP32[$8 >> 2] | 0) >>> 0) {
            HEAP32[$7 >> 2] = $228 + 1;
            $236 = HEAPU8[$228 >> 0] | 0;
           } else $236 = ___shgetc($f) | 0;
           if (!(HEAP8[$scanset + ($236 + 1) >> 0] | 0)) {
            $i$4 = $i$2;
            $s$4 = $s$2$ph;
            $wcs$5 = 0;
            break L89;
           }
           HEAP8[$s$2$ph + $i$2 >> 0] = $236;
           $i$2 = $i$2 + 1 | 0;
          } while (($i$2 | 0) != ($k$1$ph | 0));
          $244 = $k$1$ph << 1 | 1;
          $245 = _realloc($s$2$ph, $244) | 0;
          if (!$245) {
           $alloc$0402 = $alloc$0;
           $matches$0107371 = $matches$0107;
           $s$7 = $s$2$ph;
           $wcs$8 = 0;
           label = 154;
           break L6;
          } else {
           $i$2$ph$phi = $k$1$ph;
           $k$1$ph = $244;
           $s$2$ph = $245;
           $i$2$ph = $i$2$ph$phi;
          }
         }
        }
        if (!$dest$0) {
         $265 = $156;
         while (1) {
          $263 = HEAP32[$7 >> 2] | 0;
          if ($263 >>> 0 < $265 >>> 0) {
           HEAP32[$7 >> 2] = $263 + 1;
           $271 = HEAPU8[$263 >> 0] | 0;
          } else $271 = ___shgetc($f) | 0;
          if (!(HEAP8[$scanset + ($271 + 1) >> 0] | 0)) {
           $i$4 = 0;
           $s$4 = 0;
           $wcs$5 = 0;
           break L89;
          }
          $265 = HEAP32[$8 >> 2] | 0;
         }
        } else {
         $250 = $156;
         $i$3 = 0;
         while (1) {
          $248 = HEAP32[$7 >> 2] | 0;
          if ($248 >>> 0 < $250 >>> 0) {
           HEAP32[$7 >> 2] = $248 + 1;
           $256 = HEAPU8[$248 >> 0] | 0;
          } else $256 = ___shgetc($f) | 0;
          if (!(HEAP8[$scanset + ($256 + 1) >> 0] | 0)) {
           $i$4 = $i$3;
           $s$4 = $dest$0;
           $wcs$5 = 0;
           break L89;
          }
          HEAP8[$dest$0 + $i$3 >> 0] = $256;
          $250 = HEAP32[$8 >> 2] | 0;
          $i$3 = $i$3 + 1 | 0;
         }
        }
       } while (0);
       if (!(HEAP32[$8 >> 2] | 0)) $283 = HEAP32[$7 >> 2] | 0; else {
        $278 = (HEAP32[$7 >> 2] | 0) + -1 | 0;
        HEAP32[$7 >> 2] = $278;
        $283 = $278;
       }
       $284 = $283 - (HEAP32[$10 >> 2] | 0) + (HEAP32[$9 >> 2] | 0) | 0;
       if (!$284) {
        $alloc$2 = $alloc$0;
        $matches$2 = $matches$0107;
        $s$9 = $s$4;
        $wcs$10 = $wcs$5;
        break L6;
       }
       if (!(($284 | 0) == ($width$1 | 0) | $160 ^ 1)) {
        $alloc$2 = $alloc$0;
        $matches$2 = $matches$0107;
        $s$9 = $s$4;
        $wcs$10 = $wcs$5;
        break L6;
       }
       do if ($197) if ($196) {
        HEAP32[$dest$0 >> 2] = $wcs$5;
        break;
       } else {
        HEAP32[$dest$0 >> 2] = $s$4;
        break;
       } while (0);
       if ($160) {
        $p$10 = $p$9;
        $s$5 = $s$4;
        $wcs$6 = $wcs$5;
       } else {
        if ($wcs$5) HEAP32[$wcs$5 + ($i$4 << 2) >> 2] = 0;
        if (!$s$4) {
         $p$10 = $p$9;
         $s$5 = 0;
         $wcs$6 = $wcs$5;
         break L68;
        }
        HEAP8[$s$4 + $i$4 >> 0] = 0;
        $p$10 = $p$9;
        $s$5 = $s$4;
        $wcs$6 = $wcs$5;
       }
       break;
      }
     case 120:
     case 88:
     case 112:
      {
       $base$0 = 16;
       label = 136;
       break;
      }
     case 111:
      {
       $base$0 = 8;
       label = 136;
       break;
      }
     case 117:
     case 100:
      {
       $base$0 = 10;
       label = 136;
       break;
      }
     case 105:
      {
       $base$0 = 0;
       label = 136;
       break;
      }
     case 71:
     case 103:
     case 70:
     case 102:
     case 69:
     case 101:
     case 65:
     case 97:
      {
       $308 = +___floatscan($f, $$size$0, 0);
       if ((HEAP32[$9 >> 2] | 0) == ((HEAP32[$10 >> 2] | 0) - (HEAP32[$7 >> 2] | 0) | 0)) {
        $alloc$2 = $alloc$0;
        $matches$2 = $matches$0107;
        $s$9 = $s$1;
        $wcs$10 = $wcs$1;
        break L6;
       }
       if (!$dest$0) {
        $p$10 = $p$5;
        $s$5 = $s$1;
        $wcs$6 = $wcs$1;
       } else switch ($$size$0 | 0) {
       case 0:
        {
         HEAPF32[$dest$0 >> 2] = $308;
         $p$10 = $p$5;
         $s$5 = $s$1;
         $wcs$6 = $wcs$1;
         break L68;
         break;
        }
       case 1:
        {
         HEAPF64[$dest$0 >> 3] = $308;
         $p$10 = $p$5;
         $s$5 = $s$1;
         $wcs$6 = $wcs$1;
         break L68;
         break;
        }
       case 2:
        {
         HEAPF64[$dest$0 >> 3] = $308;
         $p$10 = $p$5;
         $s$5 = $s$1;
         $wcs$6 = $wcs$1;
         break L68;
         break;
        }
       default:
        {
         $p$10 = $p$5;
         $s$5 = $s$1;
         $wcs$6 = $wcs$1;
         break L68;
        }
       }
       break;
      }
     default:
      {
       $p$10 = $p$5;
       $s$5 = $s$1;
       $wcs$6 = $wcs$1;
      }
     } while (0);
     L169 : do if ((label | 0) == 136) {
      label = 0;
      $291 = ___intscan($f, $base$0, 0, -1, -1) | 0;
      if ((HEAP32[$9 >> 2] | 0) == ((HEAP32[$10 >> 2] | 0) - (HEAP32[$7 >> 2] | 0) | 0)) {
       $alloc$2 = $alloc$0;
       $matches$2 = $matches$0107;
       $s$9 = $s$1;
       $wcs$10 = $wcs$1;
       break L6;
      }
      if (($dest$0 | 0) != 0 & ($$ | 0) == 112) {
       HEAP32[$dest$0 >> 2] = $291;
       $p$10 = $p$5;
       $s$5 = $s$1;
       $wcs$6 = $wcs$1;
       break;
      }
      if (!$dest$0) {
       $p$10 = $p$5;
       $s$5 = $s$1;
       $wcs$6 = $wcs$1;
      } else switch ($$size$0 | 0) {
      case -2:
       {
        HEAP8[$dest$0 >> 0] = $291;
        $p$10 = $p$5;
        $s$5 = $s$1;
        $wcs$6 = $wcs$1;
        break L169;
        break;
       }
      case -1:
       {
        HEAP16[$dest$0 >> 1] = $291;
        $p$10 = $p$5;
        $s$5 = $s$1;
        $wcs$6 = $wcs$1;
        break L169;
        break;
       }
      case 0:
       {
        HEAP32[$dest$0 >> 2] = $291;
        $p$10 = $p$5;
        $s$5 = $s$1;
        $wcs$6 = $wcs$1;
        break L169;
        break;
       }
      case 1:
       {
        HEAP32[$dest$0 >> 2] = $291;
        $p$10 = $p$5;
        $s$5 = $s$1;
        $wcs$6 = $wcs$1;
        break L169;
        break;
       }
      case 3:
       {
        $304 = $dest$0;
        HEAP32[$304 >> 2] = $291;
        HEAP32[$304 + 4 >> 2] = tempRet0;
        $p$10 = $p$5;
        $s$5 = $s$1;
        $wcs$6 = $wcs$1;
        break L169;
        break;
       }
      default:
       {
        $p$10 = $p$5;
        $s$5 = $s$1;
        $wcs$6 = $wcs$1;
        break L169;
       }
      }
     } while (0);
     $matches$1 = (($dest$0 | 0) != 0 & 1) + $matches$0107 | 0;
     $p$11 = $p$10;
     $pos$2 = (HEAP32[$9 >> 2] | 0) + $pos$1 + (HEAP32[$7 >> 2] | 0) - (HEAP32[$10 >> 2] | 0) | 0;
     $s$6 = $s$5;
     $wcs$7 = $wcs$6;
     break L8;
    } while (0);
    $51 = $p$0110 + ($47 & 1) | 0;
    ___shlim($f, 0);
    $52 = HEAP32[$7 >> 2] | 0;
    if ($52 >>> 0 < (HEAP32[$8 >> 2] | 0) >>> 0) {
     HEAP32[$7 >> 2] = $52 + 1;
     $61 = HEAPU8[$52 >> 0] | 0;
    } else $61 = ___shgetc($f) | 0;
    if (($61 | 0) != (HEAPU8[$51 >> 0] | 0)) {
     $$lcssa386 = $61;
     $matches$0107$lcssa = $matches$0107;
     $s$0105$lcssa = $s$0105;
     $wcs$0106$lcssa = $wcs$0106;
     label = 22;
     break L6;
    }
    $matches$1 = $matches$0107;
    $p$11 = $51;
    $pos$2 = $pos$0111 + 1 | 0;
    $s$6 = $s$0105;
    $wcs$7 = $wcs$0106;
   } else {
    $p$1 = $p$0110;
    while (1) {
     $20 = $p$1 + 1 | 0;
     if (!(_isspace(HEAPU8[$20 >> 0] | 0) | 0)) {
      $p$1$lcssa = $p$1;
      break;
     } else $p$1 = $20;
    }
    ___shlim($f, 0);
    do {
     $25 = HEAP32[$7 >> 2] | 0;
     if ($25 >>> 0 < (HEAP32[$8 >> 2] | 0) >>> 0) {
      HEAP32[$7 >> 2] = $25 + 1;
      $32 = HEAPU8[$25 >> 0] | 0;
     } else $32 = ___shgetc($f) | 0;
    } while ((_isspace($32) | 0) != 0);
    if (!(HEAP32[$8 >> 2] | 0)) $44 = HEAP32[$7 >> 2] | 0; else {
     $38 = (HEAP32[$7 >> 2] | 0) + -1 | 0;
     HEAP32[$7 >> 2] = $38;
     $44 = $38;
    }
    $matches$1 = $matches$0107;
    $p$11 = $p$1$lcssa;
    $pos$2 = (HEAP32[$9 >> 2] | 0) + $pos$0111 + $44 - (HEAP32[$10 >> 2] | 0) | 0;
    $s$6 = $s$0105;
    $wcs$7 = $wcs$0106;
   } while (0);
   $p$0110 = $p$11 + 1 | 0;
   $17 = HEAP8[$p$0110 >> 0] | 0;
   if (!($17 << 24 >> 24)) {
    $matches$3 = $matches$1;
    break L4;
   } else {
    $matches$0107 = $matches$1;
    $pos$0111 = $pos$2;
    $s$0105 = $s$6;
    $wcs$0106 = $wcs$7;
   }
  }
  if ((label | 0) == 22) {
   if (HEAP32[$8 >> 2] | 0) HEAP32[$7 >> 2] = (HEAP32[$7 >> 2] | 0) + -1;
   if (($matches$0107$lcssa | 0) != 0 | ($$lcssa386 | 0) > -1) {
    $matches$3 = $matches$0107$lcssa;
    break;
   } else {
    $alloc$1 = 0;
    $s$8 = $s$0105$lcssa;
    $wcs$9 = $wcs$0106$lcssa;
    label = 155;
   }
  } else if ((label | 0) == 154) if (!$matches$0107371) {
   $alloc$1 = $alloc$0402;
   $s$8 = $s$7;
   $wcs$9 = $wcs$8;
   label = 155;
  } else {
   $alloc$2 = $alloc$0402;
   $matches$2 = $matches$0107371;
   $s$9 = $s$7;
   $wcs$10 = $wcs$8;
  }
  if ((label | 0) == 155) {
   $alloc$2 = $alloc$1;
   $matches$2 = -1;
   $s$9 = $s$8;
   $wcs$10 = $wcs$9;
  }
  if (!$alloc$2) $matches$3 = $matches$2; else {
   _free($s$9);
   _free($wcs$10);
   $matches$3 = $matches$2;
  }
 } while (0);
 if ($327) ___unlockfile($f);
 STACKTOP = sp;
 return $matches$3 | 0;
}

function _udcRead($file, $buf, $0, $1) {
 $file = $file | 0;
 $buf = $buf | 0;
 $0 = $0 | 0;
 $1 = $1 | 0;
 var $$lcssa = 0, $$lcssa56 = 0, $$lcssa62 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $129 = 0, $131 = 0, $134 = 0, $135 = 0, $136 = 0, $151 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $173 = 0, $175 = 0, $182 = 0, $183 = 0, $189 = 0, $191 = 0, $195 = 0, $196 = 0, $198 = 0, $2 = 0, $206 = 0, $208 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $216 = 0, $219 = 0, $224 = 0, $225 = 0, $231 = 0, $236 = 0, $242 = 0, $247 = 0, $248 = 0, $250 = 0, $257 = 0, $258 = 0, $259 = 0, $260 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $274 = 0, $277 = 0, $279 = 0, $28 = 0, $280 = 0, $282 = 0, $283 = 0, $284 = 0, $286 = 0, $288 = 0, $290 = 0, $292 = 0, $293 = 0, $294 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $300 = 0, $306 = 0, $308 = 0, $312 = 0, $318 = 0, $320 = 0, $324 = 0, $330 = 0, $332 = 0, $336 = 0, $337 = 0, $338 = 0, $34 = 0, $341 = 0, $344 = 0, $345 = 0, $346 = 0, $350 = 0, $351 = 0, $352 = 0, $355 = 0, $357 = 0, $358 = 0, $359 = 0, $36 = 0, $361 = 0, $364 = 0, $369 = 0, $37 = 0, $370 = 0, $371 = 0, $377 = 0, $378 = 0, $379 = 0, $384 = 0, $390 = 0, $391 = 0, $395 = 0, $399 = 0, $400 = 0, $406 = 0, $408 = 0, $412 = 0, $413 = 0, $419 = 0, $421 = 0, $425 = 0, $43 = 0, $431 = 0, $433 = 0, $439 = 0, $440 = 0, $446 = 0, $448 = 0, $45 = 0, $452 = 0, $453 = 0, $459 = 0, $461 = 0, $465 = 0, $471 = 0, $473 = 0, $477 = 0, $478 = 0, $479 = 0, $480 = 0, $482 = 0, $485 = 0, $486 = 0, $488 = 0, $49 = 0, $491 = 0, $496 = 0, $498 = 0, $50 = 0, $503 = 0, $505 = 0, $515 = 0, $522 = 0, $525 = 0, $527 = 0, $530 = 0, $531 = 0, $533 = 0, $536 = 0, $542 = 0, $543 = 0, $549 = 0, $551 = 0, $557 = 0, $558 = 0, $56 = 0, $564 = 0, $566 = 0, $570 = 0, $576 = 0, $577 = 0, $579 = 0, $58 = 0, $583 = 0, $589 = 0, $590 = 0, $592 = 0, $596 = 0, $597 = 0, $598 = 0, $600 = 0, $601 = 0, $607 = 0, $609 = 0, $613 = 0, $619 = 0, $62 = 0, $621 = 0, $625 = 0, $626 = 0, $627 = 0, $628 = 0, $629 = 0, $63 = 0, $630 = 0, $631 = 0, $632 = 0, $633 = 0, $69 = 0, $71 = 0, $75 = 0, $76 = 0, $78 = 0, $81 = 0, $82 = 0, $83 = 0, $85 = 0, $88 = 0, $9 = 0, $94 = 0, $95 = 0, $buf$i$i$i$i = 0, $cbuf$0 = 0, $cbuf$1 = 0, $cbuf$2 = 0, $cbuf$2$lcssa59 = 0, $dirty$0$i$i$i = 0, $dirty$0$i$i$i$lcssa = 0, $s$0$i$i$i = 0, $vararg_buffer = 0, $vararg_buffer4 = 0, $vararg_buffer8 = 0, label = 0, sp = 0, $266$looptemp = 0, $267$looptemp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48 | 0;
 $vararg_buffer8 = sp + 40 | 0;
 $vararg_buffer4 = sp + 32 | 0;
 $vararg_buffer = sp;
 $buf$i$i$i$i = sp + 44 | 0;
 $2 = $file + 224 | 0;
 $3 = $2;
 $9 = _i64Add(HEAP32[$3 >> 2] | 0, HEAP32[$3 + 4 >> 2] | 0, 1, 0) | 0;
 $11 = $2;
 HEAP32[$11 >> 2] = $9;
 HEAP32[$11 + 4 >> 2] = tempRet0;
 if (!(HEAP32[40] | 0)) if (_strcmp(HEAP32[$file + 8 >> 2] | 0, 2822) | 0) {
  $27 = $file + 32 | 0;
  $28 = $27;
  $34 = FUNCTION_TABLE_iiiiiii[HEAP32[(HEAP32[$file + 12 >> 2] | 0) + 4 >> 2] & 0](HEAP32[$file + 4 >> 2] | 0, HEAP32[$28 >> 2] | 0, HEAP32[$28 + 4 >> 2] | 0, $0, $buf, $file) | 0;
  $36 = (($34 | 0) < 0) << 31 >> 31;
  $37 = $27;
  $43 = _i64Add(HEAP32[$37 >> 2] | 0, HEAP32[$37 + 4 >> 2] | 0, $34 | 0, $36 | 0) | 0;
  $45 = $27;
  HEAP32[$45 >> 2] = $43;
  HEAP32[$45 + 4 >> 2] = tempRet0;
  $49 = $file + 232 | 0;
  $50 = $49;
  $56 = _i64Add(HEAP32[$50 >> 2] | 0, HEAP32[$50 + 4 >> 2] | 0, $34 | 0, $36 | 0) | 0;
  $58 = $49;
  HEAP32[$58 >> 2] = $56;
  HEAP32[$58 + 4 >> 2] = tempRet0;
  $625 = $36;
  $626 = $34;
  tempRet0 = $625;
  STACKTOP = sp;
  return $626 | 0;
 }
 $62 = $file + 232 | 0;
 $63 = $62;
 $69 = _i64Add(HEAP32[$63 >> 2] | 0, HEAP32[$63 + 4 >> 2] | 0, $0 | 0, $1 | 0) | 0;
 $71 = $62;
 HEAP32[$71 >> 2] = $69;
 HEAP32[$71 + 4 >> 2] = tempRet0;
 $75 = $file + 32 | 0;
 $76 = $75;
 $78 = HEAP32[$76 >> 2] | 0;
 $81 = HEAP32[$76 + 4 >> 2] | 0;
 $82 = $file + 24 | 0;
 $83 = $82;
 $85 = HEAP32[$83 >> 2] | 0;
 $88 = HEAP32[$83 + 4 >> 2] | 0;
 if ($81 >>> 0 > $88 >>> 0 | ($81 | 0) == ($88 | 0) & $78 >>> 0 > $85 >>> 0) {
  $625 = 0;
  $626 = 0;
  tempRet0 = $625;
  STACKTOP = sp;
  return $626 | 0;
 }
 $94 = _i64Add($78 | 0, $81 | 0, $0 | 0, $1 | 0) | 0;
 $95 = tempRet0;
 $100 = $95 >>> 0 > $88 >>> 0 | ($95 | 0) == ($88 | 0) & $94 >>> 0 > $85 >>> 0;
 $101 = $100 ? $85 : $94;
 $102 = $100 ? $88 : $95;
 $103 = $file + 60 | 0;
 $104 = $file + 64 | 0;
 $105 = $file + 72 | 0;
 $106 = $file + 88 | 0;
 $107 = $file + 56 | 0;
 $108 = $file + 176 | 0;
 $109 = $file + 80 | 0;
 $110 = $file + 104 | 0;
 $111 = $file + 136 | 0;
 $112 = $file + 144 | 0;
 $113 = $file + 152 | 0;
 $114 = $file + 12 | 0;
 $115 = $file + 4 | 0;
 $116 = $file + 200 | 0;
 $117 = $file + 208 | 0;
 $118 = $file + 160 | 0;
 $119 = $file + 168 | 0;
 $120 = $file + 96 | 0;
 $121 = $file + 184 | 0;
 $122 = $file + 192 | 0;
 $123 = $78;
 $124 = $81;
 $161 = 0;
 $162 = 0;
 $cbuf$0 = $buf;
 L9 : while (1) {
  $125 = _i64Subtract($101 | 0, $102 | 0, $123 | 0, $124 | 0) | 0;
  $126 = tempRet0;
  if (!(HEAP32[$103 >> 2] | 0)) {
   $196 = $126;
   $198 = $125;
   $208 = $123;
   $211 = $124;
   $627 = $161;
   $628 = $162;
   $cbuf$2 = $cbuf$0;
  } else {
   $129 = $105;
   $131 = HEAP32[$129 >> 2] | 0;
   $134 = HEAP32[$129 + 4 >> 2] | 0;
   $135 = _i64Add($131 | 0, $134 | 0, 4096, 0) | 0;
   $136 = tempRet0;
   if (($124 >>> 0 > $134 >>> 0 | ($124 | 0) == ($134 | 0) & $123 >>> 0 >= $131 >>> 0) & ($124 >>> 0 < $136 >>> 0 | ($124 | 0) == ($136 | 0) & $123 >>> 0 < $135 >>> 0)) {
    $151 = $136 >>> 0 < $102 >>> 0 | ($136 | 0) == ($102 | 0) & $135 >>> 0 < $101 >>> 0;
    $154 = _i64Subtract(($151 ? $135 : $101) | 0, ($151 ? $136 : $102) | 0, $123 | 0, $124 | 0) | 0;
    $155 = tempRet0;
    $156 = HEAP32[$104 >> 2] | 0;
    $157 = _i64Subtract($123 | 0, $124 | 0, $131 | 0, $134 | 0) | 0;
    _memcpy($cbuf$0 | 0, $156 + $157 | 0, $154 | 0) | 0;
    $163 = _i64Add($154 | 0, $155 | 0, $161 | 0, $162 | 0) | 0;
    $164 = tempRet0;
    $165 = _i64Subtract($125 | 0, $126 | 0, $154 | 0, $155 | 0) | 0;
    $166 = tempRet0;
    $167 = $75;
    $173 = _i64Add(HEAP32[$167 >> 2] | 0, HEAP32[$167 + 4 >> 2] | 0, $154 | 0, $155 | 0) | 0;
    $175 = $75;
    HEAP32[$175 >> 2] = $173;
    HEAP32[$175 + 4 >> 2] = tempRet0;
    if (($125 | 0) == ($154 | 0) & ($126 | 0) == ($155 | 0)) {
     $625 = $164;
     $626 = $163;
     label = 38;
     break;
    } else {
     $195 = $135;
     $629 = $163;
     $630 = $164;
     $631 = $136;
     $632 = $165;
     $633 = $166;
     $cbuf$1 = $cbuf$0 + $154 | 0;
    }
   } else {
    $195 = $123;
    $629 = $161;
    $630 = $162;
    $631 = $124;
    $632 = $125;
    $633 = $126;
    $cbuf$1 = $cbuf$0;
   }
   HEAP32[$103 >> 2] = 0;
   $182 = HEAP32[$107 >> 2] | 0;
   $183 = $108;
   $189 = _i64Add(HEAP32[$183 >> 2] | 0, HEAP32[$183 + 4 >> 2] | 0, 1, 0) | 0;
   $191 = $108;
   HEAP32[$191 >> 2] = $189;
   HEAP32[$191 + 4 >> 2] = tempRet0;
   _mustLseek($182, $195, 0) | 0;
   $196 = $633;
   $198 = $632;
   $208 = $195;
   $211 = $631;
   $627 = $629;
   $628 = $630;
   $cbuf$2 = $cbuf$1;
  }
  if ($196 >>> 0 < 0 | ($196 | 0) == 0 & $198 >>> 0 < 4096) {
   HEAP32[$103 >> 2] = 1;
   if (!(HEAP32[$104 >> 2] | 0)) HEAP32[$104 >> 2] = _needMem(4096) | 0;
   $206 = $105;
   HEAP32[$206 >> 2] = $208;
   HEAP32[$206 + 4 >> 2] = $211;
   $212 = _i64Add($208 | 0, $211 | 0, 4096, 0) | 0;
   $213 = tempRet0;
   $214 = $82;
   $216 = HEAP32[$214 >> 2] | 0;
   $219 = HEAP32[$214 + 4 >> 2] | 0;
   $224 = $213 >>> 0 > $219 >>> 0 | ($213 | 0) == ($219 | 0) & $212 >>> 0 > $216 >>> 0;
   $225 = _i64Subtract($216 | 0, $219 | 0, $208 | 0, $211 | 0) | 0;
   $248 = $224 ? $219 : $213;
   $250 = $224 ? $216 : $212;
   $257 = $224 ? $225 : 4096;
   $258 = $224 ? tempRet0 : 0;
  } else {
   $248 = $102;
   $250 = $101;
   $257 = $198;
   $258 = $196;
  }
  $231 = $106;
  $236 = HEAP32[$231 + 4 >> 2] | 0;
  if ($211 >>> 0 < $236 >>> 0 | (($211 | 0) == ($236 | 0) ? $208 >>> 0 < (HEAP32[$231 >> 2] | 0) >>> 0 : 0)) label = 16; else {
   $242 = $120;
   $247 = HEAP32[$242 + 4 >> 2] | 0;
   if ($248 >>> 0 > $247 >>> 0 | (($248 | 0) == ($247 | 0) ? $250 >>> 0 > (HEAP32[$242 >> 2] | 0) >>> 0 : 0)) label = 16;
  }
  if ((label | 0) == 16) {
   label = 0;
   if (HEAP32[40] | 0) {
    $259 = _i64Add($257 | 0, $258 | 0, $208 | 0, $211 | 0) | 0;
    $260 = tempRet0;
    if ($260 >>> 0 > $211 >>> 0 | ($260 | 0) == ($211 | 0) & $259 >>> 0 > $208 >>> 0) {
     $266 = $208;
     $267 = $211;
     do {
      $268 = _i64Add($266 | 0, $267 | 0, 262144, 0) | 0;
      $269 = tempRet0;
      $274 = $269 >>> 0 > $260 >>> 0 | ($269 | 0) == ($260 | 0) & $268 >>> 0 > $259 >>> 0;
      $266$looptemp = $266;
      $266 = $274 ? $259 : $268;
      $267$looptemp = $267;
      $267 = $274 ? $260 : $269;
      $277 = HEAP32[$109 >> 2] | 0;
      $279 = HEAP32[$277 + 24 >> 2] | 0;
      $280 = HEAP32[$110 >> 2] | 0;
      if (($279 | 0) != ($280 | 0)) {
       $$lcssa = $279;
       $$lcssa56 = $280;
       label = 33;
       break L9;
      }
      $282 = $277 + 4 | 0;
      $283 = HEAP32[$282 >> 2] | 0;
      $284 = ___udivdi3($266$looptemp | 0, $267$looptemp | 0, $283 | 0, 0) | 0;
      $286 = _i64Add($266 | 0, $267 | 0, -1, -1) | 0;
      $288 = _i64Add($286 | 0, tempRet0 | 0, $283 | 0, 0) | 0;
      $290 = ___udivdi3($288 | 0, tempRet0 | 0, $283 | 0, 0) | 0;
      $292 = $277 + 52 | 0;
      $293 = HEAP32[$292 >> 2] | 0;
      $294 = ($284 | 0) / 8 | 0;
      $297 = (($290 + 7 | 0) / 8 | 0) - $294 | 0;
      $298 = _needLargeMem($297) | 0;
      $299 = $294 + 64 | 0;
      $300 = $111;
      $306 = _i64Add(HEAP32[$300 >> 2] | 0, HEAP32[$300 + 4 >> 2] | 0, 1, 0) | 0;
      $308 = $111;
      HEAP32[$308 >> 2] = $306;
      HEAP32[$308 + 4 >> 2] = tempRet0;
      _mustLseek($293, $299, 0) | 0;
      $312 = $112;
      $318 = _i64Add(HEAP32[$312 >> 2] | 0, HEAP32[$312 + 4 >> 2] | 0, 1, 0) | 0;
      $320 = $112;
      HEAP32[$320 >> 2] = $318;
      HEAP32[$320 + 4 >> 2] = tempRet0;
      $324 = $113;
      $330 = _i64Add(HEAP32[$324 >> 2] | 0, HEAP32[$324 + 4 >> 2] | 0, $297 | 0, 0) | 0;
      $332 = $113;
      HEAP32[$332 >> 2] = $330;
      HEAP32[$332 + 4 >> 2] = tempRet0;
      _mustReadFd($293, $298, $297);
      $336 = $294 << 3;
      $337 = $284 - $336 | 0;
      $338 = $290 - $336 | 0;
      if ((_bitFindClear($298, $337, $338) | 0) < ($338 | 0)) {
       $dirty$0$i$i$i = 0;
       $s$0$i$i$i = $337;
       while (1) {
        $341 = _bitFindClear($298, $s$0$i$i$i, $338) | 0;
        if (($341 | 0) >= ($338 | 0)) {
         $dirty$0$i$i$i$lcssa = $dirty$0$i$i$i;
         label = 26;
         break;
        }
        $s$0$i$i$i = _bitFindSet($298, $341, $338) | 0;
        $344 = $s$0$i$i$i - $341 | 0;
        $345 = $341 + $336 | 0;
        $346 = HEAP32[$282 >> 2] | 0;
        $350 = (($346 | 0) < 0) << 31 >> 31;
        $351 = ___muldi3($346 | 0, $350 | 0, $345 | 0, (($345 | 0) < 0) << 31 >> 31 | 0) | 0;
        $352 = tempRet0;
        $355 = ___muldi3($346 | 0, $350 | 0, $344 | 0, (($344 | 0) < 0) << 31 >> 31 | 0) | 0;
        $357 = _i64Add($351 | 0, $352 | 0, $355 | 0, tempRet0 | 0) | 0;
        $358 = tempRet0;
        $359 = $82;
        $361 = HEAP32[$359 >> 2] | 0;
        $364 = HEAP32[$359 + 4 >> 2] | 0;
        $369 = $358 >>> 0 > $364 >>> 0 | ($358 | 0) == ($364 | 0) & $357 >>> 0 > $361 >>> 0;
        $370 = $369 ? $361 : $357;
        $371 = $369 ? $364 : $358;
        if ($371 >>> 0 > $352 >>> 0 | ($371 | 0) == ($352 | 0) & $370 >>> 0 > $351 >>> 0) {
         $377 = _i64Subtract($370 | 0, $371 | 0, $351 | 0, $352 | 0) | 0;
         $378 = tempRet0;
         $379 = _needLargeMem($377) | 0;
         HEAP32[$buf$i$i$i$i >> 2] = $379;
         $384 = FUNCTION_TABLE_iiiiiii[HEAP32[(HEAP32[$114 >> 2] | 0) + 4 >> 2] & 0](HEAP32[$115 >> 2] | 0, $351, $352, $377, $379, $file) | 0;
         if (!(($384 | 0) == ($377 | 0) & ((($384 | 0) < 0) << 31 >> 31 | 0) == ($378 | 0))) {
          label = 23;
          break L9;
         }
         $399 = HEAP32[$107 >> 2] | 0;
         $400 = $108;
         $406 = _i64Add(HEAP32[$400 >> 2] | 0, HEAP32[$400 + 4 >> 2] | 0, 1, 0) | 0;
         $408 = $108;
         HEAP32[$408 >> 2] = $406;
         HEAP32[$408 + 4 >> 2] = tempRet0;
         _mustLseek($399, $351, 0) | 0;
         $412 = HEAP32[$107 >> 2] | 0;
         $413 = $116;
         $419 = _i64Add(HEAP32[$413 >> 2] | 0, HEAP32[$413 + 4 >> 2] | 0, 1, 0) | 0;
         $421 = $116;
         HEAP32[$421 >> 2] = $419;
         HEAP32[$421 + 4 >> 2] = tempRet0;
         $425 = $117;
         $431 = _i64Add(HEAP32[$425 >> 2] | 0, HEAP32[$425 + 4 >> 2] | 0, $377 | 0, 0) | 0;
         $433 = $117;
         HEAP32[$433 >> 2] = $431;
         HEAP32[$433 + 4 >> 2] = tempRet0;
         _mustWriteFd($412, $379, $377);
         _freez($buf$i$i$i$i);
        }
        _bitSetRange($298, $341, $344);
        if (($s$0$i$i$i | 0) >= ($338 | 0)) {
         label = 27;
         break;
        } else $dirty$0$i$i$i = 1;
       }
       if ((label | 0) == 26) {
        label = 0;
        if ($dirty$0$i$i$i$lcssa) label = 27;
       }
       if ((label | 0) == 27) {
        label = 0;
        $439 = HEAP32[$292 >> 2] | 0;
        $440 = $111;
        $446 = _i64Add(HEAP32[$440 >> 2] | 0, HEAP32[$440 + 4 >> 2] | 0, 1, 0) | 0;
        $448 = $111;
        HEAP32[$448 >> 2] = $446;
        HEAP32[$448 + 4 >> 2] = tempRet0;
        _mustLseek($439, $299, 0) | 0;
        $452 = HEAP32[$292 >> 2] | 0;
        $453 = $118;
        $459 = _i64Add(HEAP32[$453 >> 2] | 0, HEAP32[$453 + 4 >> 2] | 0, 1, 0) | 0;
        $461 = $118;
        HEAP32[$461 >> 2] = $459;
        HEAP32[$461 + 4 >> 2] = tempRet0;
        $465 = $119;
        $471 = _i64Add(HEAP32[$465 >> 2] | 0, HEAP32[$465 + 4 >> 2] | 0, $297 | 0, 0) | 0;
        $473 = $119;
        HEAP32[$473 >> 2] = $471;
        HEAP32[$473 + 4 >> 2] = tempRet0;
        _mustWriteFd($452, $298, $297);
       }
       _freeMem($298);
       $477 = HEAP32[$282 >> 2] | 0;
       $478 = Math_imul($477, $284) | 0;
       $479 = Math_imul($477, $290) | 0;
       $480 = $106;
       $482 = HEAP32[$480 >> 2] | 0;
       $485 = HEAP32[$480 + 4 >> 2] | 0;
       $486 = $120;
       $488 = HEAP32[$486 >> 2] | 0;
       $491 = HEAP32[$486 + 4 >> 2] | 0;
       $496 = $485 >>> 0 > 0 | ($485 | 0) == 0 & $482 >>> 0 > $478 >>> 0;
       $498 = $496 ? $485 : 0;
       $503 = $491 >>> 0 < 0 | ($491 | 0) == 0 & $488 >>> 0 < $479 >>> 0;
       $505 = $503 ? $491 : 0;
       if ($505 >>> 0 < $498 >>> 0 | (($505 | 0) == ($498 | 0) ? ($503 ? $488 : $479) >>> 0 < ($496 ? $482 : $478) >>> 0 : 0)) {
        $527 = $478;
        $530 = 0;
        $533 = $479;
        $536 = 0;
       } else {
        $515 = 0 > $485 >>> 0 | 0 == ($485 | 0) & $478 >>> 0 > $482 >>> 0;
        $522 = 0 < $491 >>> 0 | 0 == ($491 | 0) & $479 >>> 0 < $488 >>> 0;
        $527 = $515 ? $482 : $478;
        $530 = $515 ? $485 : 0;
        $533 = $522 ? $488 : $479;
        $536 = $522 ? $491 : 0;
       }
       $525 = $106;
       HEAP32[$525 >> 2] = $527;
       HEAP32[$525 + 4 >> 2] = $530;
       $531 = $120;
       HEAP32[$531 >> 2] = $533;
       HEAP32[$531 + 4 >> 2] = $536;
      } else _freeMem($298);
     } while ($267 >>> 0 < $260 >>> 0 | ($267 | 0) == ($260 | 0) & $266 >>> 0 < $259 >>> 0);
    }
   }
   $542 = HEAP32[$107 >> 2] | 0;
   $543 = $108;
   $549 = _i64Add(HEAP32[$543 >> 2] | 0, HEAP32[$543 + 4 >> 2] | 0, 1, 0) | 0;
   $551 = $108;
   HEAP32[$551 >> 2] = $549;
   HEAP32[$551 + 4 >> 2] = tempRet0;
   _mustLseek($542, $208, 0) | 0;
  }
  $557 = HEAP32[$107 >> 2] | 0;
  if (!(HEAP32[$103 >> 2] | 0)) {
   $$lcssa62 = $557;
   $576 = $257;
   $589 = $258;
   $596 = $627;
   $597 = $628;
   $cbuf$2$lcssa59 = $cbuf$2;
   label = 36;
   break;
  }
  $600 = HEAP32[$104 >> 2] | 0;
  $601 = $121;
  $607 = _i64Add(HEAP32[$601 >> 2] | 0, HEAP32[$601 + 4 >> 2] | 0, 1, 0) | 0;
  $609 = $121;
  HEAP32[$609 >> 2] = $607;
  HEAP32[$609 + 4 >> 2] = tempRet0;
  $613 = $122;
  $619 = _i64Add(HEAP32[$613 >> 2] | 0, HEAP32[$613 + 4 >> 2] | 0, $257 | 0, 0) | 0;
  $621 = $122;
  HEAP32[$621 >> 2] = $619;
  HEAP32[$621 + 4 >> 2] = tempRet0;
  _mustReadFd($557, $600, $257);
  $123 = $208;
  $124 = $211;
  $161 = $627;
  $162 = $628;
  $cbuf$0 = $cbuf$2;
 }
 if ((label | 0) == 23) {
  $390 = HEAP32[$115 >> 2] | 0;
  $391 = $vararg_buffer;
  HEAP32[$391 >> 2] = $377;
  HEAP32[$391 + 4 >> 2] = $378;
  HEAP32[$vararg_buffer + 8 >> 2] = $390;
  $395 = $vararg_buffer + 16 | 0;
  HEAP32[$395 >> 2] = $351;
  HEAP32[$395 + 4 >> 2] = $352;
  HEAP32[$vararg_buffer + 24 >> 2] = $384;
  _errAbort(2834, $vararg_buffer);
 } else if ((label | 0) == 33) {
  HEAP32[$vararg_buffer4 >> 2] = $$lcssa;
  HEAP32[$vararg_buffer4 + 4 >> 2] = $$lcssa56;
  _verbose(4, 2890, $vararg_buffer4);
  _verbose(4, 2936, $vararg_buffer8);
  $625 = 0;
  $626 = 0;
  tempRet0 = $625;
  STACKTOP = sp;
  return $626 | 0;
 } else if ((label | 0) == 36) {
  $558 = $121;
  $564 = _i64Add(HEAP32[$558 >> 2] | 0, HEAP32[$558 + 4 >> 2] | 0, 1, 0) | 0;
  $566 = $121;
  HEAP32[$566 >> 2] = $564;
  HEAP32[$566 + 4 >> 2] = tempRet0;
  $570 = $122;
  $577 = _i64Add(HEAP32[$570 >> 2] | 0, HEAP32[$570 + 4 >> 2] | 0, $576 | 0, 0) | 0;
  $579 = $122;
  HEAP32[$579 >> 2] = $577;
  HEAP32[$579 + 4 >> 2] = tempRet0;
  _mustReadFd($$lcssa62, $cbuf$2$lcssa59, $576);
  $583 = $75;
  $590 = _i64Add(HEAP32[$583 >> 2] | 0, HEAP32[$583 + 4 >> 2] | 0, $576 | 0, $589 | 0) | 0;
  $592 = $75;
  HEAP32[$592 >> 2] = $590;
  HEAP32[$592 + 4 >> 2] = tempRet0;
  $598 = _i64Add($576 | 0, $589 | 0, $596 | 0, $597 | 0) | 0;
  $625 = tempRet0;
  $626 = $598;
  tempRet0 = $625;
  STACKTOP = sp;
  return $626 | 0;
 } else if ((label | 0) == 38) {
  tempRet0 = $625;
  STACKTOP = sp;
  return $626 | 0;
 }
 return 0;
}

function _lineFileNext($lf, $retStart, $retSize) {
 $lf = $lf | 0;
 $retStart = $retStart | 0;
 $retSize = $retSize | 0;
 var $$012$i$us = 0, $$03$i$us = 0, $$3 = 0, $$lcssa214 = 0, $$lcssa220 = 0, $$lcssa222 = 0, $$phi$trans$insert = 0, $$pr$us$pre = 0, $$pre = 0, $$pre111 = 0, $0 = 0, $1 = 0, $100 = 0, $103 = 0, $105 = 0, $109 = 0, $117 = 0, $122 = 0, $13 = 0, $134 = 0, $14 = 0, $142 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $156 = 0, $165 = 0, $168 = 0, $174 = 0, $180 = 0, $190 = 0, $2 = 0, $22 = 0, $29 = 0, $3 = 0, $33 = 0, $36 = 0, $37 = 0, $39 = 0, $4 = 0, $43 = 0, $45 = 0, $5 = 0, $50 = 0, $53 = 0, $55 = 0, $57 = 0, $6 = 0, $67 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $80 = 0, $81 = 0, $87 = 0, $90 = 0, $92 = 0, $buf$0$ph$ph$lcssa = 0, $buf$0$ph$ph181 = 0, $buf$0$ph$ph181$lcssa = 0, $bytesInBuf$0$ph$ph180 = 0, $bytesInBuf$0$ph175 = 0, $c$0$i = 0, $c$0$i$14$us = 0, $c$0$i$14$us$lcssa210 = 0, $c$0$i$lcssa227 = 0, $endIx$0 = 0, $endIx$1 = 0, $endIx$2$ph = 0, $endIx$2$ph32$be = 0, $endIx$2$ph32$lcssa = 0, $endIx$2$ph32$ph179 = 0, $endIx$2$ph32174 = 0, $endIx$3$us = 0, $endIx$4$us = 0, $endIx$5$us = 0, $endIx$5$us$lcssa = 0, $gotLf$0$ph = 0, $gotLf$0$ph31$be = 0, $meta$0$1$i$16 = 0, $meta$0$1$i$5 = 0, $meta$0$1$i$pre = 0, $meta$02$i = 0, $meta$02$i$10 = 0, $meta$02$i$21 = 0, $meta$02$us$i$18 = 0, $readSize$0$us = 0, $totalRead$04$i$us = 0, $vararg_buffer = 0, $vararg_buffer1 = 0, $vararg_buffer4 = 0, $vararg_buffer9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48 | 0;
 $vararg_buffer9 = sp + 32 | 0;
 $vararg_buffer4 = sp + 16 | 0;
 $vararg_buffer1 = sp + 8 | 0;
 $vararg_buffer = sp;
 $0 = $lf + 52 | 0;
 $1 = HEAP32[$0 >> 2] | 0;
 $2 = $lf + 20 | 0;
 $3 = HEAP32[$2 >> 2] | 0;
 $4 = $lf + 36 | 0;
 $5 = HEAP32[$4 >> 2] | 0;
 $6 = $lf + 48 | 0;
 if (HEAP8[$6 >> 0] | 0) {
  HEAP8[$6 >> 0] = 0;
  $$pre111 = $lf + 32 | 0;
  if ($retSize) HEAP32[$retSize >> 2] = $5 - (HEAP32[$$pre111 >> 2] | 0);
  $13 = $1 + (HEAP32[$$pre111 >> 2] | 0) | 0;
  HEAP32[$retStart >> 2] = $13;
  $14 = $lf + 60 | 0;
  $15 = HEAP32[$14 >> 2] | 0;
  if (!$15) {
   $$3 = 1;
   STACKTOP = sp;
   return $$3 | 0;
  }
  if ((HEAP8[$13 >> 0] | 0) != 35) {
   $$3 = 1;
   STACKTOP = sp;
   return $$3 | 0;
  }
  if (!(HEAP8[$lf + 64 >> 0] | 0)) $meta$02$i = $15; else {
   $22 = $lf + 68 | 0;
   if (_hashLookup(HEAP32[$22 >> 2] | 0, $13) | 0) {
    $$3 = 1;
    STACKTOP = sp;
    return $$3 | 0;
   }
   _hashAdd(HEAP32[$22 >> 2] | 0, $13, 0) | 0;
   $meta$0$1$i$pre = HEAP32[$14 >> 2] | 0;
   if (!$meta$0$1$i$pre) {
    $$3 = 1;
    STACKTOP = sp;
    return $$3 | 0;
   } else $meta$02$i = $meta$0$1$i$pre;
  }
  do {
   $29 = HEAP32[$meta$02$i + 4 >> 2] | 0;
   if ($29) {
    HEAP32[$vararg_buffer >> 2] = $13;
    _fprintf($29, 2185, $vararg_buffer) | 0;
   }
   $meta$02$i = HEAP32[$meta$02$i >> 2] | 0;
  } while (($meta$02$i | 0) != 0);
  $$3 = 1;
  STACKTOP = sp;
  return $$3 | 0;
 }
 $33 = HEAP32[$lf + 96 >> 2] | 0;
 if ($33) {
  $$3 = FUNCTION_TABLE_iiii[$33 & 7]($lf, $retStart, $retSize) | 0;
  STACKTOP = sp;
  return $$3 | 0;
 }
 $36 = $lf + 72 | 0;
 $37 = HEAP32[$36 >> 2] | 0;
 if ($37) {
  $39 = _udcTell($37) | 0;
  HEAP32[$lf + 16 >> 2] = $39;
  $43 = _udcReadLine(HEAP32[$36 >> 2] | 0) | 0;
  if (!$43) {
   $$3 = 0;
   STACKTOP = sp;
   return $$3 | 0;
  }
  $45 = _strlen($43) | 0;
  HEAP32[$2 >> 2] = $45;
  HEAP32[$lf + 28 >> 2] = -1;
  HEAP32[$lf + 32 >> 2] = 0;
  HEAP32[$4 >> 2] = $45;
  HEAP32[$retStart >> 2] = $43;
  _freeMem(HEAP32[$0 >> 2] | 0);
  HEAP32[$0 >> 2] = $43;
  HEAP32[$lf + 12 >> 2] = $45;
  $$3 = 1;
  STACKTOP = sp;
  return $$3 | 0;
 }
 $50 = $1 + $5 | 0;
 $$phi$trans$insert = $lf + 44 | 0;
 $$pre = HEAP32[$$phi$trans$insert >> 2] | 0;
 L36 : do if (($3 | 0) != 0 & ($$pre | 0) == 0) {
  HEAP32[$$phi$trans$insert >> 2] = 1;
  $53 = $50 + $3 | 0;
  $c$0$i = $50;
  while (1) {
   if ($c$0$i >>> 0 >= $53 >>> 0) {
    $endIx$0 = $5;
    label = 26;
    break L36;
   }
   $55 = HEAP8[$c$0$i >> 0] | 0;
   if ($55 << 24 >> 24 == 13) {
    $c$0$i$lcssa227 = $c$0$i;
    break;
   }
   if ($55 << 24 >> 24 == 10) {
    $endIx$0 = $5;
    label = 26;
    break L36;
   } else $c$0$i = $c$0$i + 1 | 0;
  }
  HEAP32[$$phi$trans$insert >> 2] = 3;
  $57 = $c$0$i$lcssa227 + 1 | 0;
  if ($57 >>> 0 < $53 >>> 0) if ((HEAP8[$57 >> 0] | 0) == 10) {
   HEAP32[$$phi$trans$insert >> 2] = 2;
   $endIx$0 = $5;
   label = 26;
  } else {
   $endIx$1 = $5;
   label = 28;
  } else {
   $endIx$1 = $5;
   label = 28;
  }
 } else switch ($$pre | 0) {
 case 2:
 case 1:
  {
   $endIx$0 = $5;
   label = 26;
   break;
  }
 case 3:
  {
   $endIx$1 = $5;
   label = 28;
   break;
  }
 default:
  {
   $endIx$2$ph = $5;
   $gotLf$0$ph = 1;
  }
 } while (0);
 L46 : do if ((label | 0) == 26) while (1) {
  label = 0;
  if (($endIx$0 | 0) >= ($3 | 0)) {
   $endIx$2$ph = $endIx$0;
   $gotLf$0$ph = 1;
   break L46;
  }
  $67 = $endIx$0 + 1 | 0;
  if ((HEAP8[$1 + $endIx$0 >> 0] | 0) == 10) {
   $endIx$2$ph = $67;
   $gotLf$0$ph = 0;
   break;
  } else {
   $endIx$0 = $67;
   label = 26;
  }
 } else if ((label | 0) == 28) while (1) {
  label = 0;
  if (($endIx$1 | 0) >= ($3 | 0)) {
   $endIx$2$ph = $endIx$1;
   $gotLf$0$ph = 1;
   break L46;
  }
  $72 = $endIx$1 + 1 | 0;
  if ((HEAP8[$1 + $endIx$1 >> 0] | 0) == 13) {
   $endIx$2$ph = $72;
   $gotLf$0$ph = 0;
   break;
  } else {
   $endIx$1 = $72;
   label = 28;
  }
 } while (0);
 $73 = $lf + 12 | 0;
 $74 = $lf + 16 | 0;
 $75 = $lf + 8 | 0;
 $76 = $lf + 28 | 0;
 $77 = $lf + 4 | 0;
 L54 : do if ($gotLf$0$ph) {
  $buf$0$ph$ph181 = $1;
  $bytesInBuf$0$ph$ph180 = $3;
  $endIx$2$ph32$ph179 = $endIx$2$ph;
  L55 : while (1) {
   $bytesInBuf$0$ph175 = $bytesInBuf$0$ph$ph180;
   $endIx$2$ph32174 = $endIx$2$ph32$ph179;
   while (1) {
    $78 = HEAP32[$4 >> 2] | 0;
    $79 = $bytesInBuf$0$ph175 - $78 | 0;
    $80 = HEAP32[$73 >> 2] | 0;
    $81 = $80 - $79 | 0;
    if (($78 | 0) > 0 & ($79 | 0) > 0) _memmove($buf$0$ph$ph181 | 0, $buf$0$ph$ph181 + $78 | 0, $79 | 0) | 0;
    HEAP32[$74 >> 2] = (HEAP32[$74 >> 2] | 0) + $78;
    $87 = HEAP32[$75 >> 2] | 0;
    L62 : do if (($87 | 0) > -1 & ($81 | 0) > 0) {
     $$012$i$us = $81;
     $$03$i$us = $buf$0$ph$ph181 + $79 | 0;
     $totalRead$04$i$us = 0;
     while (1) {
      $90 = _read($87, $$03$i$us, $$012$i$us) | 0;
      if (($90 | 0) < 1) {
       $readSize$0$us = $totalRead$04$i$us;
       break L62;
      }
      $92 = $90 + $totalRead$04$i$us | 0;
      $$012$i$us = $$012$i$us - $90 | 0;
      if (($$012$i$us | 0) <= 0) {
       $readSize$0$us = $92;
       break;
      } else {
       $$03$i$us = $$03$i$us + $90 | 0;
       $totalRead$04$i$us = $92;
      }
     }
    } else $readSize$0$us = 0; while (0);
    if (($endIx$2$ph32174 | 0) > ($78 | 0) & ($readSize$0$us | 0) == 0) {
     $$lcssa214 = $79;
     $buf$0$ph$ph181$lcssa = $buf$0$ph$ph181;
     label = 53;
     break L55;
    }
    if (($readSize$0$us | 0) < 1) {
     label = 63;
     break L55;
    }
    $bytesInBuf$0$ph175 = $readSize$0$us + $79 | 0;
    HEAP32[$2 >> 2] = $bytesInBuf$0$ph175;
    HEAP32[$4 >> 2] = 0;
    $100 = $buf$0$ph$ph181 + $endIx$2$ph32174 | 0;
    $$pr$us$pre = HEAP32[$$phi$trans$insert >> 2] | 0;
    L70 : do if (($bytesInBuf$0$ph175 | 0) != 0 & ($$pr$us$pre | 0) == 0) {
     HEAP32[$$phi$trans$insert >> 2] = 1;
     $103 = $100 + $bytesInBuf$0$ph175 | 0;
     $c$0$i$14$us = $100;
     while (1) {
      if ($c$0$i$14$us >>> 0 >= $103 >>> 0) {
       $endIx$3$us = $79;
       label = 50;
       break L70;
      }
      $105 = HEAP8[$c$0$i$14$us >> 0] | 0;
      if ($105 << 24 >> 24 == 13) {
       $c$0$i$14$us$lcssa210 = $c$0$i$14$us;
       break;
      }
      if ($105 << 24 >> 24 == 10) {
       $endIx$3$us = $79;
       label = 50;
       break L70;
      } else $c$0$i$14$us = $c$0$i$14$us + 1 | 0;
     }
     HEAP32[$$phi$trans$insert >> 2] = 3;
     $109 = $c$0$i$14$us$lcssa210 + 1 | 0;
     if ($109 >>> 0 < $103 >>> 0) if ((HEAP8[$109 >> 0] | 0) == 10) {
      HEAP32[$$phi$trans$insert >> 2] = 2;
      $endIx$3$us = $79;
      label = 50;
     } else {
      $endIx$4$us = $79;
      label = 48;
     } else {
      $endIx$4$us = $79;
      label = 48;
     }
    } else switch ($$pr$us$pre | 0) {
    case 2:
    case 1:
     {
      $endIx$3$us = $79;
      label = 50;
      break;
     }
    case 3:
     {
      $endIx$4$us = $79;
      label = 48;
      break;
     }
    default:
     {
      $endIx$5$us = $endIx$2$ph32174;
      label = 64;
     }
    } while (0);
    L80 : do if ((label | 0) == 48) while (1) {
     label = 0;
     if (($endIx$4$us | 0) >= ($bytesInBuf$0$ph175 | 0)) {
      $endIx$5$us = $endIx$4$us;
      label = 64;
      break L80;
     }
     $117 = $endIx$4$us + 1 | 0;
     if ((HEAP8[$buf$0$ph$ph181 + $endIx$4$us >> 0] | 0) == 13) {
      $endIx$2$ph32$be = $117;
      $gotLf$0$ph31$be = 0;
      break;
     } else {
      $endIx$4$us = $117;
      label = 48;
     }
    } else if ((label | 0) == 50) while (1) {
     label = 0;
     if (($endIx$3$us | 0) >= ($bytesInBuf$0$ph175 | 0)) {
      $endIx$5$us = $endIx$3$us;
      label = 64;
      break L80;
     }
     $122 = $endIx$3$us + 1 | 0;
     if ((HEAP8[$buf$0$ph$ph181 + $endIx$3$us >> 0] | 0) == 10) {
      $endIx$2$ph32$be = $122;
      $gotLf$0$ph31$be = 0;
      break;
     } else {
      $endIx$3$us = $122;
      label = 50;
     }
    } while (0);
    if ((label | 0) == 64) {
     label = 0;
     if (($bytesInBuf$0$ph175 | 0) == (HEAP32[$73 >> 2] | 0)) break; else {
      $endIx$2$ph32$be = $endIx$5$us;
      $gotLf$0$ph31$be = 1;
     }
    }
    if (!$gotLf$0$ph31$be) {
     $buf$0$ph$ph$lcssa = $buf$0$ph$ph181;
     $endIx$2$ph32$lcssa = $endIx$2$ph32$be;
     break L54;
    } else $endIx$2$ph32174 = $endIx$2$ph32$be;
   }
   if (($80 | 0) > 536870911) {
    label = 66;
    break;
   } else {
    $$lcssa220 = $80;
    $$lcssa222 = $bytesInBuf$0$ph175;
    $endIx$5$us$lcssa = $endIx$5$us;
   }
   $152 = $$lcssa220 << 1;
   if (($$lcssa222 | 0) >= ($152 | 0)) {
    label = 69;
    break;
   }
   $156 = _needMoreMem(HEAP32[$0 >> 2] | 0, HEAP32[$2 >> 2] | 0, $152) | 0;
   HEAP32[$0 >> 2] = $156;
   HEAP32[$73 >> 2] = $152;
   $buf$0$ph$ph181 = $156;
   $bytesInBuf$0$ph$ph180 = $$lcssa222;
   $endIx$2$ph32$ph179 = $endIx$5$us$lcssa;
  }
  if ((label | 0) == 53) {
   HEAP8[$buf$0$ph$ph181$lcssa + $$lcssa214 >> 0] = 0;
   HEAP32[$lf + 32 >> 2] = 0;
   HEAP32[$2 >> 2] = 0;
   HEAP32[$4 >> 2] = $$lcssa214;
   HEAP32[$76 >> 2] = (HEAP32[$76 >> 2] | 0) + 1;
   if ($retSize) HEAP32[$retSize >> 2] = $$lcssa214;
   HEAP32[$retStart >> 2] = $buf$0$ph$ph181$lcssa;
   if ((HEAP8[$buf$0$ph$ph181$lcssa >> 0] | 0) != 35) {
    $$3 = 1;
    STACKTOP = sp;
    return $$3 | 0;
   }
   do if (HEAP8[$lf + 64 >> 0] | 0) {
    $134 = $lf + 68 | 0;
    if (!(_hashLookup(HEAP32[$134 >> 2] | 0, $buf$0$ph$ph181$lcssa) | 0)) {
     _hashAdd(HEAP32[$134 >> 2] | 0, $buf$0$ph$ph181$lcssa, 0) | 0;
     break;
    } else {
     $$3 = 1;
     STACKTOP = sp;
     return $$3 | 0;
    }
   } while (0);
   $meta$0$1$i$5 = HEAP32[$lf + 60 >> 2] | 0;
   if (!$meta$0$1$i$5) {
    $$3 = 1;
    STACKTOP = sp;
    return $$3 | 0;
   } else $meta$02$i$10 = $meta$0$1$i$5;
   do {
    $142 = HEAP32[$meta$02$i$10 + 4 >> 2] | 0;
    if ($142) {
     HEAP32[$vararg_buffer1 >> 2] = $buf$0$ph$ph181$lcssa;
     _fprintf($142, 2185, $vararg_buffer1) | 0;
    }
    $meta$02$i$10 = HEAP32[$meta$02$i$10 >> 2] | 0;
   } while (($meta$02$i$10 | 0) != 0);
   $$3 = 1;
   STACKTOP = sp;
   return $$3 | 0;
  } else if ((label | 0) == 63) {
   HEAP32[$4 >> 2] = 0;
   HEAP32[$lf + 32 >> 2] = 0;
   HEAP32[$2 >> 2] = 0;
   $$3 = 0;
   STACKTOP = sp;
   return $$3 | 0;
  } else if ((label | 0) == 66) {
   $150 = (HEAP32[$76 >> 2] | 0) + 1 | 0;
   $151 = HEAP32[$77 >> 2] | 0;
   HEAP32[$vararg_buffer4 >> 2] = $bytesInBuf$0$ph175;
   HEAP32[$vararg_buffer4 + 4 >> 2] = $150;
   HEAP32[$vararg_buffer4 + 8 >> 2] = $151;
   _errAbort(2189, $vararg_buffer4);
  } else if ((label | 0) == 69) ___assert_fail(2107, 2129, 352, 2145);
 } else {
  $buf$0$ph$ph$lcssa = $1;
  $endIx$2$ph32$lcssa = $endIx$2$ph;
 } while (0);
 if (HEAP8[$lf + 40 >> 0] | 0) {
  HEAP8[$buf$0$ph$ph$lcssa + ($endIx$2$ph32$lcssa + -1) >> 0] = 0;
  if ((HEAP32[$$phi$trans$insert >> 2] | 0) == 2) {
   $165 = $buf$0$ph$ph$lcssa + ($endIx$2$ph32$lcssa + -2) | 0;
   if ((HEAP8[$165 >> 0] | 0) == 13) HEAP8[$165 >> 0] = 0;
  }
 }
 $168 = HEAP32[$4 >> 2] | 0;
 HEAP32[$lf + 32 >> 2] = $168;
 HEAP32[$4 >> 2] = $endIx$2$ph32$lcssa;
 HEAP32[$76 >> 2] = (HEAP32[$76 >> 2] | 0) + 1;
 if ($retSize) HEAP32[$retSize >> 2] = $endIx$2$ph32$lcssa - $168;
 $174 = $buf$0$ph$ph$lcssa + $168 | 0;
 HEAP32[$retStart >> 2] = $174;
 if ((HEAP8[$174 >> 0] | 0) != 35) {
  $$3 = 1;
  STACKTOP = sp;
  return $$3 | 0;
 }
 do if (HEAP8[$lf + 64 >> 0] | 0) {
  $180 = $lf + 68 | 0;
  if (!(_hashLookup(HEAP32[$180 >> 2] | 0, $174) | 0)) {
   _hashAdd(HEAP32[$180 >> 2] | 0, $174, 0) | 0;
   break;
  } else {
   $$3 = 1;
   STACKTOP = sp;
   return $$3 | 0;
  }
 } while (0);
 $meta$0$1$i$16 = HEAP32[$lf + 60 >> 2] | 0;
 if (!$meta$0$1$i$16) {
  $$3 = 1;
  STACKTOP = sp;
  return $$3 | 0;
 }
 if (!$174) {
  $meta$02$us$i$18 = $meta$0$1$i$16;
  do $meta$02$us$i$18 = HEAP32[$meta$02$us$i$18 >> 2] | 0; while (($meta$02$us$i$18 | 0) != 0);
  $$3 = 1;
  STACKTOP = sp;
  return $$3 | 0;
 } else $meta$02$i$21 = $meta$0$1$i$16;
 do {
  $190 = HEAP32[$meta$02$i$21 + 4 >> 2] | 0;
  if ($190) {
   HEAP32[$vararg_buffer9 >> 2] = $174;
   _fprintf($190, 2185, $vararg_buffer9) | 0;
  }
  $meta$02$i$21 = HEAP32[$meta$02$i$21 >> 2] | 0;
 } while (($meta$02$i$21 | 0) != 0);
 $$3 = 1;
 STACKTOP = sp;
 return $$3 | 0;
}

function _parseOptions($pArgc, $argv, $justFirst, $optionSpecs, $keepNumbers) {
 $pArgc = $pArgc | 0;
 $argv = $argv | 0;
 $justFirst = $justFirst | 0;
 $optionSpecs = $optionSpecs | 0;
 $keepNumbers = $keepNumbers | 0;
 var $$02$i$1$i$i = 0, $$02$i$i = 0, $$02$i$i$i = 0, $$02$i$i$i$lcssa = 0, $$02$i$i$lcssa = 0, $$arg$i = 0, $$arg9$i = 0, $$lcssa = 0, $$val$0$i = 0, $0 = 0, $1 = 0, $100 = 0, $102 = 0, $110 = 0, $114 = 0, $116 = 0, $119 = 0, $12 = 0, $120 = 0, $124 = 0, $125 = 0, $13 = 0, $131 = 0, $131$phi = 0, $14 = 0, $16 = 0, $2 = 0, $23 = 0, $26 = 0, $4 = 0, $40 = 0, $5 = 0, $50 = 0, $52 = 0, $59 = 0, $6 = 0, $61 = 0, $7 = 0, $i$018$i = 0, $i$025 = 0, $i$025$lcssa = 0, $i$1$ph = 0, $newArgc$018 = 0, $newArgc$018$lcssa = 0, $newArgc$07 = 0, $newArgc$1 = 0, $newArgc$2$lcssa = 0, $newArgc$213 = 0, $num_dec$019$i = 0, $num_dec$1$i = 0, $num_dec$1$i$lcssa = 0, $num_dig$020$i = 0, $num_dig$1$i = 0, $num_dig$1$i$lcssa = 0, $num_other$021$i = 0, $num_other$1$i = 0, $num_other$1$i$lcssa = 0, $optionSpec$05$i$i = 0, $rdPt$021 = 0, $rdPt$1$ph = 0, $rdPt$114 = 0, $s$017$i = 0, $val$0$i = 0, $valEnd$i$i = 0, $vararg_buffer = 0, $vararg_buffer1 = 0, $vararg_buffer10 = 0, $vararg_buffer14 = 0, $vararg_buffer17 = 0, $vararg_buffer21 = 0, $vararg_buffer24 = 0, $vararg_buffer28 = 0, $vararg_buffer31 = 0, $vararg_buffer35 = 0, $vararg_buffer38 = 0, $vararg_buffer4 = 0, $vararg_buffer7 = 0, $wrPt$011 = 0, $wrPt$022 = 0, $wrPt$022$lcssa = 0, $wrPt$1 = 0, $wrPt$2$lcssa = 0, $wrPt$215 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 112 | 0;
 $vararg_buffer38 = sp + 96 | 0;
 $vararg_buffer35 = sp + 88 | 0;
 $vararg_buffer31 = sp + 80 | 0;
 $vararg_buffer28 = sp + 72 | 0;
 $vararg_buffer24 = sp + 64 | 0;
 $vararg_buffer21 = sp + 56 | 0;
 $vararg_buffer17 = sp + 48 | 0;
 $vararg_buffer14 = sp + 40 | 0;
 $vararg_buffer10 = sp + 32 | 0;
 $vararg_buffer7 = sp + 24 | 0;
 $vararg_buffer4 = sp + 16 | 0;
 $vararg_buffer1 = sp + 8 | 0;
 $vararg_buffer = sp;
 $valEnd$i$i = sp + 100 | 0;
 $0 = $argv + 4 | 0;
 $1 = _newHashExt(6, 1) | 0;
 $2 = HEAP32[$pArgc >> 2] | 0;
 L1 : do if (($2 | 0) > 1) {
  $4 = ($justFirst | 0) == 0;
  $5 = ($keepNumbers | 0) == 0;
  $6 = ($optionSpecs | 0) == 0;
  $131 = $argv;
  $i$025 = 1;
  $newArgc$018 = 1;
  $rdPt$021 = $0;
  $wrPt$022 = $0;
  L3 : while (1) {
   $7 = HEAP32[$rdPt$021 >> 2] | 0;
   if (!(_strcmp($7, 3557) | 0)) {
    $$lcssa = $131;
    $i$025$lcssa = $i$025;
    $newArgc$018$lcssa = $newArgc$018;
    $wrPt$022$lcssa = $wrPt$022;
    label = 4;
    break;
   }
   $12 = _strchr($7, 61) | 0;
   $13 = ($12 | 0) != 0;
   $14 = (HEAP8[$7 >> 0] | 0) == 45;
   if ($13) if ($14) label = 8; else label = 10; else if ($14) label = 8; else label = 76;
   if ((label | 0) == 8) {
    label = 0;
    $16 = HEAP8[$7 + 1 >> 0] | 0;
    if (!($16 << 24 >> 24)) label = 76; else if (!(_isspace($16 << 24 >> 24) | 0)) label = 10; else label = 76;
   }
   L12 : do if ((label | 0) == 10) {
    label = 0;
    if (!$5) if ((HEAP8[$7 >> 0] | 0) == 45) {
     $23 = _strlen($7) | 0;
     if ($23 >>> 0 > 1) {
      $i$018$i = 1;
      $num_dec$019$i = 0;
      $num_dig$020$i = 0;
      $num_other$021$i = 0;
      while (1) {
       $26 = HEAP8[$7 + $i$018$i >> 0] | 0;
       do if ((($26 << 24 >> 24) + -48 | 0) >>> 0 < 10) {
        $num_dec$1$i = $num_dec$019$i;
        $num_dig$1$i = $num_dig$020$i + 1 | 0;
        $num_other$1$i = $num_other$021$i;
       } else if ($26 << 24 >> 24 == 46) {
        $num_dec$1$i = $num_dec$019$i + 1 | 0;
        $num_dig$1$i = $num_dig$020$i;
        $num_other$1$i = $num_other$021$i;
        break;
       } else {
        $num_dec$1$i = $num_dec$019$i;
        $num_dig$1$i = $num_dig$020$i;
        $num_other$1$i = $num_other$021$i + 1 | 0;
        break;
       } while (0);
       $i$018$i = $i$018$i + 1 | 0;
       if (($i$018$i | 0) == ($23 | 0)) {
        $num_dec$1$i$lcssa = $num_dec$1$i;
        $num_dig$1$i$lcssa = $num_dig$1$i;
        $num_other$1$i$lcssa = $num_other$1$i;
        break;
       } else {
        $num_dec$019$i = $num_dec$1$i;
        $num_dig$020$i = $num_dig$1$i;
        $num_other$021$i = $num_other$1$i;
       }
      }
      if (($num_dec$1$i$lcssa | 0) < 2 & ($num_dig$1$i$lcssa | 0) > 0 & ($num_other$1$i$lcssa | 0) == 0) {
       label = 76;
       break;
      }
     }
    }
    if ($13) {
     L30 : do if ($12 >>> 0 > $7 >>> 0) {
      $s$017$i = $7;
      while (1) {
       $40 = HEAP8[$s$017$i >> 0] | 0;
       switch ($40 << 24 >> 24) {
       case 45:
       case 95:
        break;
       default:
        if (!(_isalnum($40 << 24 >> 24) | 0)) {
         label = 76;
         break L12;
        }
       }
       $s$017$i = $s$017$i + 1 | 0;
       if ($s$017$i >>> 0 >= $12 >>> 0) break L30;
      }
     } while (0);
     $$arg$i = (HEAP8[$7 >> 0] | 0) == 45 ? $7 + 1 | 0 : $7;
     HEAP8[$12 >> 0] = 0;
     $$arg9$i = $$arg$i;
     $val$0$i = $12 + 1 | 0;
    } else {
     $$arg9$i = (HEAP8[$7 >> 0] | 0) == 45 ? $7 + 1 | 0 : $7;
     $val$0$i = 0;
    }
    L39 : do if ($6) _hashAdd($1, $$arg9$i, ($val$0$i | 0) == 0 ? 3387 : $val$0$i) | 0; else {
     $50 = HEAP32[$optionSpecs >> 2] | 0;
     L42 : do if (!$50) label = 32; else {
      $$02$i$i$i = $optionSpecs;
      $52 = $50;
      while (1) {
       if (!(_strcmp($52, $$arg9$i) | 0)) {
        $$02$i$i$i$lcssa = $$02$i$i$i;
        break;
       }
       $$02$i$i$i = $$02$i$i$i + 8 | 0;
       $52 = HEAP32[$$02$i$i$i >> 2] | 0;
       if (!$52) {
        label = 32;
        break L42;
       }
      }
      if (!$$02$i$i$i$lcssa) label = 32; else $optionSpec$05$i$i = $$02$i$i$i$lcssa;
     } while (0);
     L47 : do if ((label | 0) == 32) {
      label = 0;
      $59 = HEAP32[49] | 0;
      if (!$59) {
       label = 35;
       break L3;
      } else {
       $$02$i$1$i$i = 196;
       $61 = $59;
      }
      while (1) {
       if (!(_strcmp($61, $$arg9$i) | 0)) {
        $optionSpec$05$i$i = $$02$i$1$i$i;
        break L47;
       }
       $$02$i$1$i$i = $$02$i$1$i$i + 8 | 0;
       $61 = HEAP32[$$02$i$1$i$i >> 2] | 0;
       if (!$61) {
        label = 35;
        break L3;
       }
      }
     } while (0);
     switch (HEAP32[$optionSpec$05$i$i + 4 >> 2] & 183 | 0) {
     case 1:
      {
       if ($val$0$i) {
        label = 38;
        break L3;
       }
       break;
      }
     case 2:
      {
       if (!$val$0$i) {
        label = 40;
        break L3;
       }
       break;
      }
     case 4:
      {
       if (!$val$0$i) {
        label = 42;
        break L3;
       }
       _strtol($val$0$i, $valEnd$i$i, 10) | 0;
       if (!(HEAP8[$val$0$i >> 0] | 0)) {
        label = 45;
        break L3;
       }
       if (HEAP8[HEAP32[$valEnd$i$i >> 2] >> 0] | 0) {
        label = 45;
        break L3;
       }
       break;
      }
     case 32:
      {
       if (!$val$0$i) {
        label = 47;
        break L3;
       }
       _strtoll($val$0$i, $valEnd$i$i, 10) | 0;
       if (!(HEAP8[$val$0$i >> 0] | 0)) {
        label = 50;
        break L3;
       }
       if (HEAP8[HEAP32[$valEnd$i$i >> 2] >> 0] | 0) {
        label = 50;
        break L3;
       }
       break;
      }
     case 16:
      {
       if (!$val$0$i) {
        label = 52;
        break L3;
       }
       +_strtod($val$0$i, $valEnd$i$i);
       if (!(HEAP8[$val$0$i >> 0] | 0)) {
        label = 55;
        break L3;
       }
       if (HEAP8[HEAP32[$valEnd$i$i >> 2] >> 0] | 0) {
        label = 55;
        break L3;
       }
       break;
      }
     case 128:
      {
       if (!$val$0$i) {
        label = 57;
        break L3;
       }
       +_strtod($val$0$i, $valEnd$i$i);
       if (!(HEAP8[$val$0$i >> 0] | 0)) {
        label = 60;
        break L3;
       }
       if (HEAP8[HEAP32[$valEnd$i$i >> 2] >> 0] | 0) {
        label = 60;
        break L3;
       }
       break;
      }
     default:
      {
       label = 61;
       break L3;
      }
     }
     $$val$0$i = ($val$0$i | 0) == 0 ? 3387 : $val$0$i;
     $100 = HEAP32[$optionSpecs >> 2] | 0;
     L69 : do if ($100) {
      $$02$i$i = $optionSpecs;
      $102 = $100;
      while (1) {
       if (!(_strcmp($102, $$arg9$i) | 0)) {
        $$02$i$i$lcssa = $$02$i$i;
        break;
       }
       $$02$i$i = $$02$i$i + 8 | 0;
       $102 = HEAP32[$$02$i$i >> 2] | 0;
       if (!$102) break L69;
      }
      if ($$02$i$i$lcssa) {
       $110 = HEAP32[$$02$i$i$lcssa + 4 >> 2] | 0;
       if ($110 & 64) {
        if (($110 & 183 | 0) != 2) {
         label = 72;
         break L3;
        }
        $114 = _hashFindVal($1, $$arg9$i) | 0;
        $116 = _newSlName($$val$0$i) | 0;
        if (!$114) {
         _hashAdd($1, $$arg9$i, $116) | 0;
         break L39;
        } else {
         _slAddTail($114, $116);
         break L39;
        }
       }
      }
     } while (0);
     _hashAdd($1, $$arg9$i, $$val$0$i) | 0;
    } while (0);
    if ($13) {
     HEAP8[$12 >> 0] = 61;
     $newArgc$1 = $newArgc$018;
     $wrPt$1 = $wrPt$022;
    } else {
     $newArgc$1 = $newArgc$018;
     $wrPt$1 = $wrPt$022;
    }
   } while (0);
   if ((label | 0) == 76) {
    label = 0;
    if (!$4) {
     $i$1$ph = $i$025;
     $newArgc$07 = $newArgc$018;
     $rdPt$1$ph = $rdPt$021;
     $wrPt$011 = $wrPt$022;
     break L1;
    }
    HEAP32[$wrPt$022 >> 2] = HEAP32[$rdPt$021 >> 2];
    $newArgc$1 = $newArgc$018 + 1 | 0;
    $wrPt$1 = $wrPt$022 + 4 | 0;
   }
   $124 = $rdPt$021 + 4 | 0;
   $125 = $i$025 + 1 | 0;
   if (($125 | 0) < ($2 | 0)) {
    $131$phi = $rdPt$021;
    $i$025 = $125;
    $newArgc$018 = $newArgc$1;
    $rdPt$021 = $124;
    $wrPt$022 = $wrPt$1;
    $131 = $131$phi;
   } else {
    $i$1$ph = $125;
    $newArgc$07 = $newArgc$1;
    $rdPt$1$ph = $124;
    $wrPt$011 = $wrPt$1;
    break L1;
   }
  }
  switch (label | 0) {
  case 4:
   {
    $i$1$ph = $i$025$lcssa + 1 | 0;
    $newArgc$07 = $newArgc$018$lcssa;
    $rdPt$1$ph = $$lcssa + 8 | 0;
    $wrPt$011 = $wrPt$022$lcssa;
    break L1;
    break;
   }
  case 35:
   {
    HEAP32[$vararg_buffer >> 2] = $$arg9$i;
    _errAbort(3560, $vararg_buffer);
    break;
   }
  case 38:
   {
    HEAP32[$vararg_buffer1 >> 2] = $$arg9$i;
    _errAbort(3586, $vararg_buffer1);
    break;
   }
  case 40:
   {
    HEAP32[$vararg_buffer4 >> 2] = $$arg9$i;
    _errAbort(3625, $vararg_buffer4);
    break;
   }
  case 42:
   {
    HEAP32[$vararg_buffer7 >> 2] = $$arg9$i;
    _errAbort(3661, $vararg_buffer7);
    break;
   }
  case 45:
   {
    HEAP32[$vararg_buffer10 >> 2] = $$arg9$i;
    HEAP32[$vararg_buffer10 + 4 >> 2] = $val$0$i;
    _errAbort(3390, $vararg_buffer10);
    break;
   }
  case 47:
   {
    HEAP32[$vararg_buffer14 >> 2] = $$arg9$i;
    _errAbort(3661, $vararg_buffer14);
    break;
   }
  case 50:
   {
    HEAP32[$vararg_buffer17 >> 2] = $$arg9$i;
    HEAP32[$vararg_buffer17 + 4 >> 2] = $val$0$i;
    _errAbort(3432, $vararg_buffer17);
    break;
   }
  case 52:
   {
    HEAP32[$vararg_buffer21 >> 2] = $$arg9$i;
    _errAbort(3694, $vararg_buffer21);
    break;
   }
  case 55:
   {
    HEAP32[$vararg_buffer24 >> 2] = $$arg9$i;
    HEAP32[$vararg_buffer24 + 4 >> 2] = $val$0$i;
    _errAbort(3476, $vararg_buffer24);
    break;
   }
  case 57:
   {
    HEAP32[$vararg_buffer28 >> 2] = $$arg9$i;
    _errAbort(3729, $vararg_buffer28);
    break;
   }
  case 60:
   {
    HEAP32[$vararg_buffer31 >> 2] = $$arg9$i;
    HEAP32[$vararg_buffer31 + 4 >> 2] = $val$0$i;
    _errAbort(3516, $vararg_buffer31);
    break;
   }
  case 61:
   {
    HEAP32[$vararg_buffer35 >> 2] = HEAP32[$optionSpec$05$i$i >> 2];
    _errAbort(3765, $vararg_buffer35);
    break;
   }
  case 72:
   {
    _errAbort(3804, $vararg_buffer38);
    break;
   }
  }
 } else {
  $i$1$ph = 1;
  $newArgc$07 = 1;
  $rdPt$1$ph = $0;
  $wrPt$011 = $0;
 } while (0);
 if (($2 | 0) <= ($i$1$ph | 0)) {
  $newArgc$2$lcssa = $newArgc$07;
  $wrPt$2$lcssa = $wrPt$011;
  HEAP32[$pArgc >> 2] = $newArgc$2$lcssa;
  HEAP32[$wrPt$2$lcssa >> 2] = 0;
  STACKTOP = sp;
  return $1 | 0;
 }
 $119 = $newArgc$07 + $2 - $i$1$ph | 0;
 $120 = $2 - $i$1$ph | 0;
 $newArgc$213 = $newArgc$07;
 $rdPt$114 = $rdPt$1$ph;
 $wrPt$215 = $wrPt$011;
 while (1) {
  HEAP32[$wrPt$215 >> 2] = HEAP32[$rdPt$114 >> 2];
  $newArgc$213 = $newArgc$213 + 1 | 0;
  if (($newArgc$213 | 0) == ($119 | 0)) break; else {
   $rdPt$114 = $rdPt$114 + 4 | 0;
   $wrPt$215 = $wrPt$215 + 4 | 0;
  }
 }
 $newArgc$2$lcssa = $119;
 $wrPt$2$lcssa = $wrPt$011 + ($120 << 2) | 0;
 HEAP32[$pArgc >> 2] = $newArgc$2$lcssa;
 HEAP32[$wrPt$2$lcssa >> 2] = 0;
 STACKTOP = sp;
 return $1 | 0;
}

function _free($mem) {
 $mem = $mem | 0;
 var $$lcssa = 0, $$pre$phi46Z2D = 0, $$pre$phi48Z2D = 0, $$pre$phiZ2D = 0, $1 = 0, $104 = 0, $105 = 0, $113 = 0, $114 = 0, $12 = 0, $122 = 0, $130 = 0, $135 = 0, $136 = 0, $139 = 0, $141 = 0, $143 = 0, $15 = 0, $158 = 0, $16 = 0, $163 = 0, $165 = 0, $168 = 0, $171 = 0, $174 = 0, $177 = 0, $178 = 0, $179 = 0, $181 = 0, $183 = 0, $184 = 0, $186 = 0, $187 = 0, $193 = 0, $194 = 0, $2 = 0, $20 = 0, $203 = 0, $208 = 0, $211 = 0, $212 = 0, $218 = 0, $23 = 0, $233 = 0, $236 = 0, $237 = 0, $238 = 0, $242 = 0, $243 = 0, $249 = 0, $25 = 0, $254 = 0, $255 = 0, $258 = 0, $260 = 0, $263 = 0, $268 = 0, $27 = 0, $274 = 0, $278 = 0, $279 = 0, $297 = 0, $299 = 0, $306 = 0, $307 = 0, $308 = 0, $316 = 0, $40 = 0, $45 = 0, $47 = 0, $5 = 0, $50 = 0, $52 = 0, $55 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $62 = 0, $64 = 0, $65 = 0, $67 = 0, $68 = 0, $73 = 0, $74 = 0, $8 = 0, $83 = 0, $88 = 0, $9 = 0, $91 = 0, $92 = 0, $98 = 0, $F18$0 = 0, $I20$0 = 0, $K21$0 = 0, $R$1 = 0, $R$1$lcssa = 0, $R$3 = 0, $R8$1 = 0, $R8$1$lcssa = 0, $R8$3 = 0, $RP$1 = 0, $RP$1$lcssa = 0, $RP10$1 = 0, $RP10$1$lcssa = 0, $T$0 = 0, $T$0$lcssa = 0, $T$0$lcssa53 = 0, $p$1 = 0, $psize$1 = 0, $psize$2 = 0, $sp$0$i = 0, $sp$0$in$i = 0, label = 0;
 if (!$mem) return;
 $1 = $mem + -8 | 0;
 $2 = HEAP32[247] | 0;
 if ($1 >>> 0 < $2 >>> 0) _abort();
 $5 = HEAP32[$mem + -4 >> 2] | 0;
 $6 = $5 & 3;
 if (($6 | 0) == 1) _abort();
 $8 = $5 & -8;
 $9 = $1 + $8 | 0;
 do if (!($5 & 1)) {
  $12 = HEAP32[$1 >> 2] | 0;
  if (!$6) return;
  $15 = $1 + (0 - $12) | 0;
  $16 = $12 + $8 | 0;
  if ($15 >>> 0 < $2 >>> 0) _abort();
  if (($15 | 0) == (HEAP32[248] | 0)) {
   $104 = $9 + 4 | 0;
   $105 = HEAP32[$104 >> 2] | 0;
   if (($105 & 3 | 0) != 3) {
    $p$1 = $15;
    $psize$1 = $16;
    break;
   }
   HEAP32[245] = $16;
   HEAP32[$104 >> 2] = $105 & -2;
   HEAP32[$15 + 4 >> 2] = $16 | 1;
   HEAP32[$15 + $16 >> 2] = $16;
   return;
  }
  $20 = $12 >>> 3;
  if ($12 >>> 0 < 256) {
   $23 = HEAP32[$15 + 8 >> 2] | 0;
   $25 = HEAP32[$15 + 12 >> 2] | 0;
   $27 = 1012 + ($20 << 1 << 2) | 0;
   if (($23 | 0) != ($27 | 0)) {
    if ($23 >>> 0 < $2 >>> 0) _abort();
    if ((HEAP32[$23 + 12 >> 2] | 0) != ($15 | 0)) _abort();
   }
   if (($25 | 0) == ($23 | 0)) {
    HEAP32[243] = HEAP32[243] & ~(1 << $20);
    $p$1 = $15;
    $psize$1 = $16;
    break;
   }
   if (($25 | 0) == ($27 | 0)) $$pre$phi48Z2D = $25 + 8 | 0; else {
    if ($25 >>> 0 < $2 >>> 0) _abort();
    $40 = $25 + 8 | 0;
    if ((HEAP32[$40 >> 2] | 0) == ($15 | 0)) $$pre$phi48Z2D = $40; else _abort();
   }
   HEAP32[$23 + 12 >> 2] = $25;
   HEAP32[$$pre$phi48Z2D >> 2] = $23;
   $p$1 = $15;
   $psize$1 = $16;
   break;
  }
  $45 = HEAP32[$15 + 24 >> 2] | 0;
  $47 = HEAP32[$15 + 12 >> 2] | 0;
  do if (($47 | 0) == ($15 | 0)) {
   $58 = $15 + 16 | 0;
   $59 = $58 + 4 | 0;
   $60 = HEAP32[$59 >> 2] | 0;
   if (!$60) {
    $62 = HEAP32[$58 >> 2] | 0;
    if (!$62) {
     $R$3 = 0;
     break;
    } else {
     $R$1 = $62;
     $RP$1 = $58;
    }
   } else {
    $R$1 = $60;
    $RP$1 = $59;
   }
   while (1) {
    $64 = $R$1 + 20 | 0;
    $65 = HEAP32[$64 >> 2] | 0;
    if ($65) {
     $R$1 = $65;
     $RP$1 = $64;
     continue;
    }
    $67 = $R$1 + 16 | 0;
    $68 = HEAP32[$67 >> 2] | 0;
    if (!$68) {
     $R$1$lcssa = $R$1;
     $RP$1$lcssa = $RP$1;
     break;
    } else {
     $R$1 = $68;
     $RP$1 = $67;
    }
   }
   if ($RP$1$lcssa >>> 0 < $2 >>> 0) _abort(); else {
    HEAP32[$RP$1$lcssa >> 2] = 0;
    $R$3 = $R$1$lcssa;
    break;
   }
  } else {
   $50 = HEAP32[$15 + 8 >> 2] | 0;
   if ($50 >>> 0 < $2 >>> 0) _abort();
   $52 = $50 + 12 | 0;
   if ((HEAP32[$52 >> 2] | 0) != ($15 | 0)) _abort();
   $55 = $47 + 8 | 0;
   if ((HEAP32[$55 >> 2] | 0) == ($15 | 0)) {
    HEAP32[$52 >> 2] = $47;
    HEAP32[$55 >> 2] = $50;
    $R$3 = $47;
    break;
   } else _abort();
  } while (0);
  if (!$45) {
   $p$1 = $15;
   $psize$1 = $16;
  } else {
   $73 = HEAP32[$15 + 28 >> 2] | 0;
   $74 = 1276 + ($73 << 2) | 0;
   if (($15 | 0) == (HEAP32[$74 >> 2] | 0)) {
    HEAP32[$74 >> 2] = $R$3;
    if (!$R$3) {
     HEAP32[244] = HEAP32[244] & ~(1 << $73);
     $p$1 = $15;
     $psize$1 = $16;
     break;
    }
   } else {
    if ($45 >>> 0 < (HEAP32[247] | 0) >>> 0) _abort();
    $83 = $45 + 16 | 0;
    if ((HEAP32[$83 >> 2] | 0) == ($15 | 0)) HEAP32[$83 >> 2] = $R$3; else HEAP32[$45 + 20 >> 2] = $R$3;
    if (!$R$3) {
     $p$1 = $15;
     $psize$1 = $16;
     break;
    }
   }
   $88 = HEAP32[247] | 0;
   if ($R$3 >>> 0 < $88 >>> 0) _abort();
   HEAP32[$R$3 + 24 >> 2] = $45;
   $91 = $15 + 16 | 0;
   $92 = HEAP32[$91 >> 2] | 0;
   do if ($92) if ($92 >>> 0 < $88 >>> 0) _abort(); else {
    HEAP32[$R$3 + 16 >> 2] = $92;
    HEAP32[$92 + 24 >> 2] = $R$3;
    break;
   } while (0);
   $98 = HEAP32[$91 + 4 >> 2] | 0;
   if (!$98) {
    $p$1 = $15;
    $psize$1 = $16;
   } else if ($98 >>> 0 < (HEAP32[247] | 0) >>> 0) _abort(); else {
    HEAP32[$R$3 + 20 >> 2] = $98;
    HEAP32[$98 + 24 >> 2] = $R$3;
    $p$1 = $15;
    $psize$1 = $16;
    break;
   }
  }
 } else {
  $p$1 = $1;
  $psize$1 = $8;
 } while (0);
 if ($p$1 >>> 0 >= $9 >>> 0) _abort();
 $113 = $9 + 4 | 0;
 $114 = HEAP32[$113 >> 2] | 0;
 if (!($114 & 1)) _abort();
 if (!($114 & 2)) {
  if (($9 | 0) == (HEAP32[249] | 0)) {
   $122 = (HEAP32[246] | 0) + $psize$1 | 0;
   HEAP32[246] = $122;
   HEAP32[249] = $p$1;
   HEAP32[$p$1 + 4 >> 2] = $122 | 1;
   if (($p$1 | 0) != (HEAP32[248] | 0)) return;
   HEAP32[248] = 0;
   HEAP32[245] = 0;
   return;
  }
  if (($9 | 0) == (HEAP32[248] | 0)) {
   $130 = (HEAP32[245] | 0) + $psize$1 | 0;
   HEAP32[245] = $130;
   HEAP32[248] = $p$1;
   HEAP32[$p$1 + 4 >> 2] = $130 | 1;
   HEAP32[$p$1 + $130 >> 2] = $130;
   return;
  }
  $135 = ($114 & -8) + $psize$1 | 0;
  $136 = $114 >>> 3;
  do if ($114 >>> 0 < 256) {
   $139 = HEAP32[$9 + 8 >> 2] | 0;
   $141 = HEAP32[$9 + 12 >> 2] | 0;
   $143 = 1012 + ($136 << 1 << 2) | 0;
   if (($139 | 0) != ($143 | 0)) {
    if ($139 >>> 0 < (HEAP32[247] | 0) >>> 0) _abort();
    if ((HEAP32[$139 + 12 >> 2] | 0) != ($9 | 0)) _abort();
   }
   if (($141 | 0) == ($139 | 0)) {
    HEAP32[243] = HEAP32[243] & ~(1 << $136);
    break;
   }
   if (($141 | 0) == ($143 | 0)) $$pre$phi46Z2D = $141 + 8 | 0; else {
    if ($141 >>> 0 < (HEAP32[247] | 0) >>> 0) _abort();
    $158 = $141 + 8 | 0;
    if ((HEAP32[$158 >> 2] | 0) == ($9 | 0)) $$pre$phi46Z2D = $158; else _abort();
   }
   HEAP32[$139 + 12 >> 2] = $141;
   HEAP32[$$pre$phi46Z2D >> 2] = $139;
  } else {
   $163 = HEAP32[$9 + 24 >> 2] | 0;
   $165 = HEAP32[$9 + 12 >> 2] | 0;
   do if (($165 | 0) == ($9 | 0)) {
    $177 = $9 + 16 | 0;
    $178 = $177 + 4 | 0;
    $179 = HEAP32[$178 >> 2] | 0;
    if (!$179) {
     $181 = HEAP32[$177 >> 2] | 0;
     if (!$181) {
      $R8$3 = 0;
      break;
     } else {
      $R8$1 = $181;
      $RP10$1 = $177;
     }
    } else {
     $R8$1 = $179;
     $RP10$1 = $178;
    }
    while (1) {
     $183 = $R8$1 + 20 | 0;
     $184 = HEAP32[$183 >> 2] | 0;
     if ($184) {
      $R8$1 = $184;
      $RP10$1 = $183;
      continue;
     }
     $186 = $R8$1 + 16 | 0;
     $187 = HEAP32[$186 >> 2] | 0;
     if (!$187) {
      $R8$1$lcssa = $R8$1;
      $RP10$1$lcssa = $RP10$1;
      break;
     } else {
      $R8$1 = $187;
      $RP10$1 = $186;
     }
    }
    if ($RP10$1$lcssa >>> 0 < (HEAP32[247] | 0) >>> 0) _abort(); else {
     HEAP32[$RP10$1$lcssa >> 2] = 0;
     $R8$3 = $R8$1$lcssa;
     break;
    }
   } else {
    $168 = HEAP32[$9 + 8 >> 2] | 0;
    if ($168 >>> 0 < (HEAP32[247] | 0) >>> 0) _abort();
    $171 = $168 + 12 | 0;
    if ((HEAP32[$171 >> 2] | 0) != ($9 | 0)) _abort();
    $174 = $165 + 8 | 0;
    if ((HEAP32[$174 >> 2] | 0) == ($9 | 0)) {
     HEAP32[$171 >> 2] = $165;
     HEAP32[$174 >> 2] = $168;
     $R8$3 = $165;
     break;
    } else _abort();
   } while (0);
   if ($163) {
    $193 = HEAP32[$9 + 28 >> 2] | 0;
    $194 = 1276 + ($193 << 2) | 0;
    if (($9 | 0) == (HEAP32[$194 >> 2] | 0)) {
     HEAP32[$194 >> 2] = $R8$3;
     if (!$R8$3) {
      HEAP32[244] = HEAP32[244] & ~(1 << $193);
      break;
     }
    } else {
     if ($163 >>> 0 < (HEAP32[247] | 0) >>> 0) _abort();
     $203 = $163 + 16 | 0;
     if ((HEAP32[$203 >> 2] | 0) == ($9 | 0)) HEAP32[$203 >> 2] = $R8$3; else HEAP32[$163 + 20 >> 2] = $R8$3;
     if (!$R8$3) break;
    }
    $208 = HEAP32[247] | 0;
    if ($R8$3 >>> 0 < $208 >>> 0) _abort();
    HEAP32[$R8$3 + 24 >> 2] = $163;
    $211 = $9 + 16 | 0;
    $212 = HEAP32[$211 >> 2] | 0;
    do if ($212) if ($212 >>> 0 < $208 >>> 0) _abort(); else {
     HEAP32[$R8$3 + 16 >> 2] = $212;
     HEAP32[$212 + 24 >> 2] = $R8$3;
     break;
    } while (0);
    $218 = HEAP32[$211 + 4 >> 2] | 0;
    if ($218) if ($218 >>> 0 < (HEAP32[247] | 0) >>> 0) _abort(); else {
     HEAP32[$R8$3 + 20 >> 2] = $218;
     HEAP32[$218 + 24 >> 2] = $R8$3;
     break;
    }
   }
  } while (0);
  HEAP32[$p$1 + 4 >> 2] = $135 | 1;
  HEAP32[$p$1 + $135 >> 2] = $135;
  if (($p$1 | 0) == (HEAP32[248] | 0)) {
   HEAP32[245] = $135;
   return;
  } else $psize$2 = $135;
 } else {
  HEAP32[$113 >> 2] = $114 & -2;
  HEAP32[$p$1 + 4 >> 2] = $psize$1 | 1;
  HEAP32[$p$1 + $psize$1 >> 2] = $psize$1;
  $psize$2 = $psize$1;
 }
 $233 = $psize$2 >>> 3;
 if ($psize$2 >>> 0 < 256) {
  $236 = 1012 + ($233 << 1 << 2) | 0;
  $237 = HEAP32[243] | 0;
  $238 = 1 << $233;
  if (!($237 & $238)) {
   HEAP32[243] = $237 | $238;
   $$pre$phiZ2D = $236 + 8 | 0;
   $F18$0 = $236;
  } else {
   $242 = $236 + 8 | 0;
   $243 = HEAP32[$242 >> 2] | 0;
   if ($243 >>> 0 < (HEAP32[247] | 0) >>> 0) _abort(); else {
    $$pre$phiZ2D = $242;
    $F18$0 = $243;
   }
  }
  HEAP32[$$pre$phiZ2D >> 2] = $p$1;
  HEAP32[$F18$0 + 12 >> 2] = $p$1;
  HEAP32[$p$1 + 8 >> 2] = $F18$0;
  HEAP32[$p$1 + 12 >> 2] = $236;
  return;
 }
 $249 = $psize$2 >>> 8;
 if (!$249) $I20$0 = 0; else if ($psize$2 >>> 0 > 16777215) $I20$0 = 31; else {
  $254 = ($249 + 1048320 | 0) >>> 16 & 8;
  $255 = $249 << $254;
  $258 = ($255 + 520192 | 0) >>> 16 & 4;
  $260 = $255 << $258;
  $263 = ($260 + 245760 | 0) >>> 16 & 2;
  $268 = 14 - ($258 | $254 | $263) + ($260 << $263 >>> 15) | 0;
  $I20$0 = $psize$2 >>> ($268 + 7 | 0) & 1 | $268 << 1;
 }
 $274 = 1276 + ($I20$0 << 2) | 0;
 HEAP32[$p$1 + 28 >> 2] = $I20$0;
 HEAP32[$p$1 + 20 >> 2] = 0;
 HEAP32[$p$1 + 16 >> 2] = 0;
 $278 = HEAP32[244] | 0;
 $279 = 1 << $I20$0;
 do if (!($278 & $279)) {
  HEAP32[244] = $278 | $279;
  HEAP32[$274 >> 2] = $p$1;
  HEAP32[$p$1 + 24 >> 2] = $274;
  HEAP32[$p$1 + 12 >> 2] = $p$1;
  HEAP32[$p$1 + 8 >> 2] = $p$1;
 } else {
  $K21$0 = $psize$2 << (($I20$0 | 0) == 31 ? 0 : 25 - ($I20$0 >>> 1) | 0);
  $T$0 = HEAP32[$274 >> 2] | 0;
  while (1) {
   if ((HEAP32[$T$0 + 4 >> 2] & -8 | 0) == ($psize$2 | 0)) {
    $T$0$lcssa = $T$0;
    label = 130;
    break;
   }
   $297 = $T$0 + 16 + ($K21$0 >>> 31 << 2) | 0;
   $299 = HEAP32[$297 >> 2] | 0;
   if (!$299) {
    $$lcssa = $297;
    $T$0$lcssa53 = $T$0;
    label = 127;
    break;
   } else {
    $K21$0 = $K21$0 << 1;
    $T$0 = $299;
   }
  }
  if ((label | 0) == 127) if ($$lcssa >>> 0 < (HEAP32[247] | 0) >>> 0) _abort(); else {
   HEAP32[$$lcssa >> 2] = $p$1;
   HEAP32[$p$1 + 24 >> 2] = $T$0$lcssa53;
   HEAP32[$p$1 + 12 >> 2] = $p$1;
   HEAP32[$p$1 + 8 >> 2] = $p$1;
   break;
  } else if ((label | 0) == 130) {
   $306 = $T$0$lcssa + 8 | 0;
   $307 = HEAP32[$306 >> 2] | 0;
   $308 = HEAP32[247] | 0;
   if ($307 >>> 0 >= $308 >>> 0 & $T$0$lcssa >>> 0 >= $308 >>> 0) {
    HEAP32[$307 + 12 >> 2] = $p$1;
    HEAP32[$306 >> 2] = $p$1;
    HEAP32[$p$1 + 8 >> 2] = $307;
    HEAP32[$p$1 + 12 >> 2] = $T$0$lcssa;
    HEAP32[$p$1 + 24 >> 2] = 0;
    break;
   } else _abort();
  }
 } while (0);
 $316 = (HEAP32[251] | 0) + -1 | 0;
 HEAP32[251] = $316;
 if (!$316) $sp$0$in$i = 1428; else return;
 while (1) {
  $sp$0$i = HEAP32[$sp$0$in$i >> 2] | 0;
  if (!$sp$0$i) break; else $sp$0$in$i = $sp$0$i + 8 | 0;
 }
 HEAP32[251] = -1;
 return;
}

function ___intscan($f, $base, $pok, $0, $1) {
 $f = $f | 0;
 $base = $base | 0;
 $pok = $pok | 0;
 $0 = $0 | 0;
 $1 = $1 | 0;
 var $$1 = 0, $$115 = 0, $$116 = 0, $$base14 = 0, $$lcssa = 0, $$lcssa118 = 0, $$lcssa119 = 0, $$lcssa120 = 0, $$lcssa121 = 0, $$lcssa122 = 0, $$lcssa123 = 0, $100 = 0, $101 = 0, $108 = 0, $120 = 0, $121 = 0, $128 = 0, $13 = 0, $130 = 0, $131 = 0, $134 = 0, $135 = 0, $136 = 0, $144 = 0, $149 = 0, $150 = 0, $152 = 0, $154 = 0, $156 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $166 = 0, $167 = 0, $168 = 0, $17 = 0, $18 = 0, $185 = 0, $186 = 0, $187 = 0, $195 = 0, $201 = 0, $203 = 0, $204 = 0, $205 = 0, $207 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $222 = 0, $223 = 0, $224 = 0, $239 = 0, $25 = 0, $259 = 0, $261 = 0, $272 = 0, $281 = 0, $284 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $3 = 0, $37 = 0, $39 = 0, $4 = 0, $47 = 0, $51 = 0, $6 = 0, $67 = 0, $70 = 0, $71 = 0, $72 = 0, $83 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $91 = 0, $93 = 0, $99 = 0, $c$0 = 0, $c$1 = 0, $c$117 = 0, $c$2$be = 0, $c$2$be$lcssa = 0, $c$2$lcssa = 0, $c$3$be = 0, $c$3$lcssa = 0, $c$359 = 0, $c$4$be = 0, $c$4$be$lcssa = 0, $c$4$lcssa = 0, $c$5$be = 0, $c$6$be = 0, $c$6$be$lcssa = 0, $c$6$lcssa = 0, $c$7$be = 0, $c$742 = 0, $c$8 = 0, $c$9$be = 0, $neg$0 = 0, $neg$1 = 0, $x$070 = 0, $x$136 = 0, $x$254 = 0, label = 0;
 L1 : do if ($base >>> 0 > 36) {
  HEAP32[(___errno_location() | 0) >> 2] = 22;
  $286 = 0;
  $287 = 0;
 } else {
  $3 = $f + 4 | 0;
  $4 = $f + 100 | 0;
  do {
   $6 = HEAP32[$3 >> 2] | 0;
   if ($6 >>> 0 < (HEAP32[$4 >> 2] | 0) >>> 0) {
    HEAP32[$3 >> 2] = $6 + 1;
    $13 = HEAPU8[$6 >> 0] | 0;
   } else $13 = ___shgetc($f) | 0;
  } while ((_isspace($13) | 0) != 0);
  $$lcssa123 = $13;
  L11 : do switch ($$lcssa123 | 0) {
  case 43:
  case 45:
   {
    $17 = (($$lcssa123 | 0) == 45) << 31 >> 31;
    $18 = HEAP32[$3 >> 2] | 0;
    if ($18 >>> 0 < (HEAP32[$4 >> 2] | 0) >>> 0) {
     HEAP32[$3 >> 2] = $18 + 1;
     $c$0 = HEAPU8[$18 >> 0] | 0;
     $neg$0 = $17;
     break L11;
    } else {
     $c$0 = ___shgetc($f) | 0;
     $neg$0 = $17;
     break L11;
    }
    break;
   }
  default:
   {
    $c$0 = $$lcssa123;
    $neg$0 = 0;
   }
  } while (0);
  $25 = ($base | 0) == 0;
  do if (($base & -17 | 0) == 0 & ($c$0 | 0) == 48) {
   $29 = HEAP32[$3 >> 2] | 0;
   if ($29 >>> 0 < (HEAP32[$4 >> 2] | 0) >>> 0) {
    HEAP32[$3 >> 2] = $29 + 1;
    $37 = HEAPU8[$29 >> 0] | 0;
   } else $37 = ___shgetc($f) | 0;
   if (($37 | 32 | 0) != 120) if ($25) {
    $$116 = 8;
    $c$117 = $37;
    label = 46;
    break;
   } else {
    $$1 = $base;
    $c$1 = $37;
    label = 32;
    break;
   }
   $39 = HEAP32[$3 >> 2] | 0;
   if ($39 >>> 0 < (HEAP32[$4 >> 2] | 0) >>> 0) {
    HEAP32[$3 >> 2] = $39 + 1;
    $47 = HEAPU8[$39 >> 0] | 0;
   } else $47 = ___shgetc($f) | 0;
   if ((HEAPU8[7031 + $47 >> 0] | 0) > 15) {
    $51 = (HEAP32[$4 >> 2] | 0) == 0;
    if (!$51) HEAP32[$3 >> 2] = (HEAP32[$3 >> 2] | 0) + -1;
    if (!$pok) {
     ___shlim($f, 0);
     $286 = 0;
     $287 = 0;
     break L1;
    }
    if ($51) {
     $286 = 0;
     $287 = 0;
     break L1;
    }
    HEAP32[$3 >> 2] = (HEAP32[$3 >> 2] | 0) + -1;
    $286 = 0;
    $287 = 0;
    break L1;
   } else {
    $$116 = 16;
    $c$117 = $47;
    label = 46;
   }
  } else {
   $$base14 = $25 ? 10 : $base;
   if ((HEAPU8[7031 + $c$0 >> 0] | 0) >>> 0 < $$base14 >>> 0) {
    $$1 = $$base14;
    $c$1 = $c$0;
    label = 32;
   } else {
    if (HEAP32[$4 >> 2] | 0) HEAP32[$3 >> 2] = (HEAP32[$3 >> 2] | 0) + -1;
    ___shlim($f, 0);
    HEAP32[(___errno_location() | 0) >> 2] = 22;
    $286 = 0;
    $287 = 0;
    break L1;
   }
  } while (0);
  if ((label | 0) == 32) if (($$1 | 0) == 10) {
   $67 = $c$1 + -48 | 0;
   if ($67 >>> 0 < 10) {
    $71 = $67;
    $x$070 = 0;
    while (1) {
     $70 = ($x$070 * 10 | 0) + $71 | 0;
     $72 = HEAP32[$3 >> 2] | 0;
     if ($72 >>> 0 < (HEAP32[$4 >> 2] | 0) >>> 0) {
      HEAP32[$3 >> 2] = $72 + 1;
      $c$2$be = HEAPU8[$72 >> 0] | 0;
     } else $c$2$be = ___shgetc($f) | 0;
     $71 = $c$2$be + -48 | 0;
     if (!($71 >>> 0 < 10 & $70 >>> 0 < 429496729)) {
      $$lcssa122 = $70;
      $c$2$be$lcssa = $c$2$be;
      break;
     } else $x$070 = $70;
    }
    $288 = $$lcssa122;
    $289 = 0;
    $c$2$lcssa = $c$2$be$lcssa;
   } else {
    $288 = 0;
    $289 = 0;
    $c$2$lcssa = $c$1;
   }
   $83 = $c$2$lcssa + -48 | 0;
   if ($83 >>> 0 < 10) {
    $85 = $288;
    $86 = $289;
    $89 = $83;
    $c$359 = $c$2$lcssa;
    while (1) {
     $87 = ___muldi3($85 | 0, $86 | 0, 10, 0) | 0;
     $88 = tempRet0;
     $91 = (($89 | 0) < 0) << 31 >> 31;
     $93 = ~$91;
     if ($88 >>> 0 > $93 >>> 0 | ($88 | 0) == ($93 | 0) & $87 >>> 0 > ~$89 >>> 0) {
      $$lcssa = $89;
      $290 = $85;
      $291 = $86;
      $c$3$lcssa = $c$359;
      break;
     }
     $99 = _i64Add($87 | 0, $88 | 0, $89 | 0, $91 | 0) | 0;
     $100 = tempRet0;
     $101 = HEAP32[$3 >> 2] | 0;
     if ($101 >>> 0 < (HEAP32[$4 >> 2] | 0) >>> 0) {
      HEAP32[$3 >> 2] = $101 + 1;
      $c$3$be = HEAPU8[$101 >> 0] | 0;
     } else $c$3$be = ___shgetc($f) | 0;
     $108 = $c$3$be + -48 | 0;
     if ($108 >>> 0 < 10 & ($100 >>> 0 < 429496729 | ($100 | 0) == 429496729 & $99 >>> 0 < 2576980378)) {
      $85 = $99;
      $86 = $100;
      $89 = $108;
      $c$359 = $c$3$be;
     } else {
      $$lcssa = $108;
      $290 = $99;
      $291 = $100;
      $c$3$lcssa = $c$3$be;
      break;
     }
    }
    if ($$lcssa >>> 0 > 9) {
     $259 = $291;
     $261 = $290;
     $neg$1 = $neg$0;
    } else {
     $$115 = 10;
     $292 = $290;
     $293 = $291;
     $c$8 = $c$3$lcssa;
     label = 72;
    }
   } else {
    $259 = $289;
    $261 = $288;
    $neg$1 = $neg$0;
   }
  } else {
   $$116 = $$1;
   $c$117 = $c$1;
   label = 46;
  }
  L63 : do if ((label | 0) == 46) {
   if (!($$116 + -1 & $$116)) {
    $128 = HEAP8[7287 + (($$116 * 23 | 0) >>> 5 & 7) >> 0] | 0;
    $130 = HEAP8[7031 + $c$117 >> 0] | 0;
    $131 = $130 & 255;
    if ($131 >>> 0 < $$116 >>> 0) {
     $135 = $131;
     $x$136 = 0;
     while (1) {
      $134 = $135 | $x$136 << $128;
      $136 = HEAP32[$3 >> 2] | 0;
      if ($136 >>> 0 < (HEAP32[$4 >> 2] | 0) >>> 0) {
       HEAP32[$3 >> 2] = $136 + 1;
       $c$4$be = HEAPU8[$136 >> 0] | 0;
      } else $c$4$be = ___shgetc($f) | 0;
      $144 = HEAP8[7031 + $c$4$be >> 0] | 0;
      $135 = $144 & 255;
      if (!($134 >>> 0 < 134217728 & $135 >>> 0 < $$116 >>> 0)) {
       $$lcssa118 = $134;
       $$lcssa119 = $144;
       $c$4$be$lcssa = $c$4$be;
       break;
      } else $x$136 = $134;
     }
     $152 = $$lcssa119;
     $154 = 0;
     $156 = $$lcssa118;
     $c$4$lcssa = $c$4$be$lcssa;
    } else {
     $152 = $130;
     $154 = 0;
     $156 = 0;
     $c$4$lcssa = $c$117;
    }
    $149 = _bitshift64Lshr(-1, -1, $128 | 0) | 0;
    $150 = tempRet0;
    if (($152 & 255) >>> 0 >= $$116 >>> 0 | ($154 >>> 0 > $150 >>> 0 | ($154 | 0) == ($150 | 0) & $156 >>> 0 > $149 >>> 0)) {
     $$115 = $$116;
     $292 = $156;
     $293 = $154;
     $c$8 = $c$4$lcssa;
     label = 72;
     break;
    } else {
     $161 = $156;
     $162 = $154;
     $166 = $152;
    }
    while (1) {
     $163 = _bitshift64Shl($161 | 0, $162 | 0, $128 | 0) | 0;
     $164 = tempRet0;
     $167 = $166 & 255 | $163;
     $168 = HEAP32[$3 >> 2] | 0;
     if ($168 >>> 0 < (HEAP32[$4 >> 2] | 0) >>> 0) {
      HEAP32[$3 >> 2] = $168 + 1;
      $c$5$be = HEAPU8[$168 >> 0] | 0;
     } else $c$5$be = ___shgetc($f) | 0;
     $166 = HEAP8[7031 + $c$5$be >> 0] | 0;
     if (($166 & 255) >>> 0 >= $$116 >>> 0 | ($164 >>> 0 > $150 >>> 0 | ($164 | 0) == ($150 | 0) & $167 >>> 0 > $149 >>> 0)) {
      $$115 = $$116;
      $292 = $167;
      $293 = $164;
      $c$8 = $c$5$be;
      label = 72;
      break L63;
     } else {
      $161 = $167;
      $162 = $164;
     }
    }
   }
   $120 = HEAP8[7031 + $c$117 >> 0] | 0;
   $121 = $120 & 255;
   if ($121 >>> 0 < $$116 >>> 0) {
    $186 = $121;
    $x$254 = 0;
    while (1) {
     $185 = $186 + (Math_imul($x$254, $$116) | 0) | 0;
     $187 = HEAP32[$3 >> 2] | 0;
     if ($187 >>> 0 < (HEAP32[$4 >> 2] | 0) >>> 0) {
      HEAP32[$3 >> 2] = $187 + 1;
      $c$6$be = HEAPU8[$187 >> 0] | 0;
     } else $c$6$be = ___shgetc($f) | 0;
     $195 = HEAP8[7031 + $c$6$be >> 0] | 0;
     $186 = $195 & 255;
     if (!($185 >>> 0 < 119304647 & $186 >>> 0 < $$116 >>> 0)) {
      $$lcssa120 = $185;
      $$lcssa121 = $195;
      $c$6$be$lcssa = $c$6$be;
      break;
     } else $x$254 = $185;
    }
    $201 = $$lcssa121;
    $294 = $$lcssa120;
    $295 = 0;
    $c$6$lcssa = $c$6$be$lcssa;
   } else {
    $201 = $120;
    $294 = 0;
    $295 = 0;
    $c$6$lcssa = $c$117;
   }
   if (($201 & 255) >>> 0 < $$116 >>> 0) {
    $203 = ___udivdi3(-1, -1, $$116 | 0, 0) | 0;
    $204 = tempRet0;
    $205 = $295;
    $207 = $294;
    $215 = $201;
    $c$742 = $c$6$lcssa;
    while (1) {
     if ($205 >>> 0 > $204 >>> 0 | ($205 | 0) == ($204 | 0) & $207 >>> 0 > $203 >>> 0) {
      $$115 = $$116;
      $292 = $207;
      $293 = $205;
      $c$8 = $c$742;
      label = 72;
      break L63;
     }
     $212 = ___muldi3($207 | 0, $205 | 0, $$116 | 0, 0) | 0;
     $213 = tempRet0;
     $214 = $215 & 255;
     if ($213 >>> 0 > 4294967295 | ($213 | 0) == -1 & $212 >>> 0 > ~$214 >>> 0) {
      $$115 = $$116;
      $292 = $207;
      $293 = $205;
      $c$8 = $c$742;
      label = 72;
      break L63;
     }
     $222 = _i64Add($214 | 0, 0, $212 | 0, $213 | 0) | 0;
     $223 = tempRet0;
     $224 = HEAP32[$3 >> 2] | 0;
     if ($224 >>> 0 < (HEAP32[$4 >> 2] | 0) >>> 0) {
      HEAP32[$3 >> 2] = $224 + 1;
      $c$7$be = HEAPU8[$224 >> 0] | 0;
     } else $c$7$be = ___shgetc($f) | 0;
     $215 = HEAP8[7031 + $c$7$be >> 0] | 0;
     if (($215 & 255) >>> 0 >= $$116 >>> 0) {
      $$115 = $$116;
      $292 = $222;
      $293 = $223;
      $c$8 = $c$7$be;
      label = 72;
      break;
     } else {
      $205 = $223;
      $207 = $222;
      $c$742 = $c$7$be;
     }
    }
   } else {
    $$115 = $$116;
    $292 = $294;
    $293 = $295;
    $c$8 = $c$6$lcssa;
    label = 72;
   }
  } while (0);
  if ((label | 0) == 72) if ((HEAPU8[7031 + $c$8 >> 0] | 0) >>> 0 < $$115 >>> 0) {
   do {
    $239 = HEAP32[$3 >> 2] | 0;
    if ($239 >>> 0 < (HEAP32[$4 >> 2] | 0) >>> 0) {
     HEAP32[$3 >> 2] = $239 + 1;
     $c$9$be = HEAPU8[$239 >> 0] | 0;
    } else $c$9$be = ___shgetc($f) | 0;
   } while ((HEAPU8[7031 + $c$9$be >> 0] | 0) >>> 0 < $$115 >>> 0);
   HEAP32[(___errno_location() | 0) >> 2] = 34;
   $259 = $1;
   $261 = $0;
   $neg$1 = ($0 & 1 | 0) == 0 & 0 == 0 ? $neg$0 : 0;
  } else {
   $259 = $293;
   $261 = $292;
   $neg$1 = $neg$0;
  }
  if (HEAP32[$4 >> 2] | 0) HEAP32[$3 >> 2] = (HEAP32[$3 >> 2] | 0) + -1;
  if (!($259 >>> 0 < $1 >>> 0 | ($259 | 0) == ($1 | 0) & $261 >>> 0 < $0 >>> 0)) {
   if (!(($0 & 1 | 0) != 0 | 0 != 0 | ($neg$1 | 0) != 0)) {
    HEAP32[(___errno_location() | 0) >> 2] = 34;
    $272 = _i64Add($0 | 0, $1 | 0, -1, -1) | 0;
    $286 = tempRet0;
    $287 = $272;
    break;
   }
   if ($259 >>> 0 > $1 >>> 0 | ($259 | 0) == ($1 | 0) & $261 >>> 0 > $0 >>> 0) {
    HEAP32[(___errno_location() | 0) >> 2] = 34;
    $286 = $1;
    $287 = $0;
    break;
   }
  }
  $281 = (($neg$1 | 0) < 0) << 31 >> 31;
  $284 = _i64Subtract($261 ^ $neg$1 | 0, $259 ^ $281 | 0, $neg$1 | 0, $281 | 0) | 0;
  $286 = tempRet0;
  $287 = $284;
 } while (0);
 tempRet0 = $286;
 return $287 | 0;
}

function _dispose_chunk($p, $psize) {
 $p = $p | 0;
 $psize = $psize | 0;
 var $$1 = 0, $$14 = 0, $$2 = 0, $$lcssa = 0, $$pre$phi22Z2D = 0, $$pre$phi24Z2D = 0, $$pre$phiZ2D = 0, $0 = 0, $10 = 0, $100 = 0, $107 = 0, $109 = 0, $11 = 0, $110 = 0, $116 = 0, $124 = 0, $129 = 0, $130 = 0, $133 = 0, $135 = 0, $137 = 0, $15 = 0, $150 = 0, $155 = 0, $157 = 0, $160 = 0, $162 = 0, $165 = 0, $168 = 0, $169 = 0, $170 = 0, $172 = 0, $174 = 0, $175 = 0, $177 = 0, $178 = 0, $18 = 0, $183 = 0, $184 = 0, $193 = 0, $198 = 0, $2 = 0, $20 = 0, $201 = 0, $202 = 0, $208 = 0, $22 = 0, $223 = 0, $226 = 0, $227 = 0, $228 = 0, $232 = 0, $233 = 0, $239 = 0, $244 = 0, $245 = 0, $248 = 0, $250 = 0, $253 = 0, $258 = 0, $264 = 0, $268 = 0, $269 = 0, $287 = 0, $289 = 0, $296 = 0, $297 = 0, $298 = 0, $35 = 0, $40 = 0, $42 = 0, $45 = 0, $47 = 0, $5 = 0, $50 = 0, $53 = 0, $54 = 0, $55 = 0, $57 = 0, $59 = 0, $60 = 0, $62 = 0, $63 = 0, $68 = 0, $69 = 0, $78 = 0, $83 = 0, $86 = 0, $87 = 0, $9 = 0, $93 = 0, $99 = 0, $F17$0 = 0, $I20$0 = 0, $K21$0 = 0, $R$1 = 0, $R$1$lcssa = 0, $R$3 = 0, $R7$1 = 0, $R7$1$lcssa = 0, $R7$3 = 0, $RP$1 = 0, $RP$1$lcssa = 0, $RP9$1 = 0, $RP9$1$lcssa = 0, $T$0 = 0, $T$0$lcssa = 0, $T$0$lcssa30 = 0, label = 0;
 $0 = $p + $psize | 0;
 $2 = HEAP32[$p + 4 >> 2] | 0;
 do if (!($2 & 1)) {
  $5 = HEAP32[$p >> 2] | 0;
  if (!($2 & 3)) return;
  $9 = $p + (0 - $5) | 0;
  $10 = $5 + $psize | 0;
  $11 = HEAP32[247] | 0;
  if ($9 >>> 0 < $11 >>> 0) _abort();
  if (($9 | 0) == (HEAP32[248] | 0)) {
   $99 = $0 + 4 | 0;
   $100 = HEAP32[$99 >> 2] | 0;
   if (($100 & 3 | 0) != 3) {
    $$1 = $9;
    $$14 = $10;
    break;
   }
   HEAP32[245] = $10;
   HEAP32[$99 >> 2] = $100 & -2;
   HEAP32[$9 + 4 >> 2] = $10 | 1;
   HEAP32[$9 + $10 >> 2] = $10;
   return;
  }
  $15 = $5 >>> 3;
  if ($5 >>> 0 < 256) {
   $18 = HEAP32[$9 + 8 >> 2] | 0;
   $20 = HEAP32[$9 + 12 >> 2] | 0;
   $22 = 1012 + ($15 << 1 << 2) | 0;
   if (($18 | 0) != ($22 | 0)) {
    if ($18 >>> 0 < $11 >>> 0) _abort();
    if ((HEAP32[$18 + 12 >> 2] | 0) != ($9 | 0)) _abort();
   }
   if (($20 | 0) == ($18 | 0)) {
    HEAP32[243] = HEAP32[243] & ~(1 << $15);
    $$1 = $9;
    $$14 = $10;
    break;
   }
   if (($20 | 0) == ($22 | 0)) $$pre$phi24Z2D = $20 + 8 | 0; else {
    if ($20 >>> 0 < $11 >>> 0) _abort();
    $35 = $20 + 8 | 0;
    if ((HEAP32[$35 >> 2] | 0) == ($9 | 0)) $$pre$phi24Z2D = $35; else _abort();
   }
   HEAP32[$18 + 12 >> 2] = $20;
   HEAP32[$$pre$phi24Z2D >> 2] = $18;
   $$1 = $9;
   $$14 = $10;
   break;
  }
  $40 = HEAP32[$9 + 24 >> 2] | 0;
  $42 = HEAP32[$9 + 12 >> 2] | 0;
  do if (($42 | 0) == ($9 | 0)) {
   $53 = $9 + 16 | 0;
   $54 = $53 + 4 | 0;
   $55 = HEAP32[$54 >> 2] | 0;
   if (!$55) {
    $57 = HEAP32[$53 >> 2] | 0;
    if (!$57) {
     $R$3 = 0;
     break;
    } else {
     $R$1 = $57;
     $RP$1 = $53;
    }
   } else {
    $R$1 = $55;
    $RP$1 = $54;
   }
   while (1) {
    $59 = $R$1 + 20 | 0;
    $60 = HEAP32[$59 >> 2] | 0;
    if ($60) {
     $R$1 = $60;
     $RP$1 = $59;
     continue;
    }
    $62 = $R$1 + 16 | 0;
    $63 = HEAP32[$62 >> 2] | 0;
    if (!$63) {
     $R$1$lcssa = $R$1;
     $RP$1$lcssa = $RP$1;
     break;
    } else {
     $R$1 = $63;
     $RP$1 = $62;
    }
   }
   if ($RP$1$lcssa >>> 0 < $11 >>> 0) _abort(); else {
    HEAP32[$RP$1$lcssa >> 2] = 0;
    $R$3 = $R$1$lcssa;
    break;
   }
  } else {
   $45 = HEAP32[$9 + 8 >> 2] | 0;
   if ($45 >>> 0 < $11 >>> 0) _abort();
   $47 = $45 + 12 | 0;
   if ((HEAP32[$47 >> 2] | 0) != ($9 | 0)) _abort();
   $50 = $42 + 8 | 0;
   if ((HEAP32[$50 >> 2] | 0) == ($9 | 0)) {
    HEAP32[$47 >> 2] = $42;
    HEAP32[$50 >> 2] = $45;
    $R$3 = $42;
    break;
   } else _abort();
  } while (0);
  if (!$40) {
   $$1 = $9;
   $$14 = $10;
  } else {
   $68 = HEAP32[$9 + 28 >> 2] | 0;
   $69 = 1276 + ($68 << 2) | 0;
   if (($9 | 0) == (HEAP32[$69 >> 2] | 0)) {
    HEAP32[$69 >> 2] = $R$3;
    if (!$R$3) {
     HEAP32[244] = HEAP32[244] & ~(1 << $68);
     $$1 = $9;
     $$14 = $10;
     break;
    }
   } else {
    if ($40 >>> 0 < (HEAP32[247] | 0) >>> 0) _abort();
    $78 = $40 + 16 | 0;
    if ((HEAP32[$78 >> 2] | 0) == ($9 | 0)) HEAP32[$78 >> 2] = $R$3; else HEAP32[$40 + 20 >> 2] = $R$3;
    if (!$R$3) {
     $$1 = $9;
     $$14 = $10;
     break;
    }
   }
   $83 = HEAP32[247] | 0;
   if ($R$3 >>> 0 < $83 >>> 0) _abort();
   HEAP32[$R$3 + 24 >> 2] = $40;
   $86 = $9 + 16 | 0;
   $87 = HEAP32[$86 >> 2] | 0;
   do if ($87) if ($87 >>> 0 < $83 >>> 0) _abort(); else {
    HEAP32[$R$3 + 16 >> 2] = $87;
    HEAP32[$87 + 24 >> 2] = $R$3;
    break;
   } while (0);
   $93 = HEAP32[$86 + 4 >> 2] | 0;
   if (!$93) {
    $$1 = $9;
    $$14 = $10;
   } else if ($93 >>> 0 < (HEAP32[247] | 0) >>> 0) _abort(); else {
    HEAP32[$R$3 + 20 >> 2] = $93;
    HEAP32[$93 + 24 >> 2] = $R$3;
    $$1 = $9;
    $$14 = $10;
    break;
   }
  }
 } else {
  $$1 = $p;
  $$14 = $psize;
 } while (0);
 $107 = HEAP32[247] | 0;
 if ($0 >>> 0 < $107 >>> 0) _abort();
 $109 = $0 + 4 | 0;
 $110 = HEAP32[$109 >> 2] | 0;
 if (!($110 & 2)) {
  if (($0 | 0) == (HEAP32[249] | 0)) {
   $116 = (HEAP32[246] | 0) + $$14 | 0;
   HEAP32[246] = $116;
   HEAP32[249] = $$1;
   HEAP32[$$1 + 4 >> 2] = $116 | 1;
   if (($$1 | 0) != (HEAP32[248] | 0)) return;
   HEAP32[248] = 0;
   HEAP32[245] = 0;
   return;
  }
  if (($0 | 0) == (HEAP32[248] | 0)) {
   $124 = (HEAP32[245] | 0) + $$14 | 0;
   HEAP32[245] = $124;
   HEAP32[248] = $$1;
   HEAP32[$$1 + 4 >> 2] = $124 | 1;
   HEAP32[$$1 + $124 >> 2] = $124;
   return;
  }
  $129 = ($110 & -8) + $$14 | 0;
  $130 = $110 >>> 3;
  do if ($110 >>> 0 < 256) {
   $133 = HEAP32[$0 + 8 >> 2] | 0;
   $135 = HEAP32[$0 + 12 >> 2] | 0;
   $137 = 1012 + ($130 << 1 << 2) | 0;
   if (($133 | 0) != ($137 | 0)) {
    if ($133 >>> 0 < $107 >>> 0) _abort();
    if ((HEAP32[$133 + 12 >> 2] | 0) != ($0 | 0)) _abort();
   }
   if (($135 | 0) == ($133 | 0)) {
    HEAP32[243] = HEAP32[243] & ~(1 << $130);
    break;
   }
   if (($135 | 0) == ($137 | 0)) $$pre$phi22Z2D = $135 + 8 | 0; else {
    if ($135 >>> 0 < $107 >>> 0) _abort();
    $150 = $135 + 8 | 0;
    if ((HEAP32[$150 >> 2] | 0) == ($0 | 0)) $$pre$phi22Z2D = $150; else _abort();
   }
   HEAP32[$133 + 12 >> 2] = $135;
   HEAP32[$$pre$phi22Z2D >> 2] = $133;
  } else {
   $155 = HEAP32[$0 + 24 >> 2] | 0;
   $157 = HEAP32[$0 + 12 >> 2] | 0;
   do if (($157 | 0) == ($0 | 0)) {
    $168 = $0 + 16 | 0;
    $169 = $168 + 4 | 0;
    $170 = HEAP32[$169 >> 2] | 0;
    if (!$170) {
     $172 = HEAP32[$168 >> 2] | 0;
     if (!$172) {
      $R7$3 = 0;
      break;
     } else {
      $R7$1 = $172;
      $RP9$1 = $168;
     }
    } else {
     $R7$1 = $170;
     $RP9$1 = $169;
    }
    while (1) {
     $174 = $R7$1 + 20 | 0;
     $175 = HEAP32[$174 >> 2] | 0;
     if ($175) {
      $R7$1 = $175;
      $RP9$1 = $174;
      continue;
     }
     $177 = $R7$1 + 16 | 0;
     $178 = HEAP32[$177 >> 2] | 0;
     if (!$178) {
      $R7$1$lcssa = $R7$1;
      $RP9$1$lcssa = $RP9$1;
      break;
     } else {
      $R7$1 = $178;
      $RP9$1 = $177;
     }
    }
    if ($RP9$1$lcssa >>> 0 < $107 >>> 0) _abort(); else {
     HEAP32[$RP9$1$lcssa >> 2] = 0;
     $R7$3 = $R7$1$lcssa;
     break;
    }
   } else {
    $160 = HEAP32[$0 + 8 >> 2] | 0;
    if ($160 >>> 0 < $107 >>> 0) _abort();
    $162 = $160 + 12 | 0;
    if ((HEAP32[$162 >> 2] | 0) != ($0 | 0)) _abort();
    $165 = $157 + 8 | 0;
    if ((HEAP32[$165 >> 2] | 0) == ($0 | 0)) {
     HEAP32[$162 >> 2] = $157;
     HEAP32[$165 >> 2] = $160;
     $R7$3 = $157;
     break;
    } else _abort();
   } while (0);
   if ($155) {
    $183 = HEAP32[$0 + 28 >> 2] | 0;
    $184 = 1276 + ($183 << 2) | 0;
    if (($0 | 0) == (HEAP32[$184 >> 2] | 0)) {
     HEAP32[$184 >> 2] = $R7$3;
     if (!$R7$3) {
      HEAP32[244] = HEAP32[244] & ~(1 << $183);
      break;
     }
    } else {
     if ($155 >>> 0 < (HEAP32[247] | 0) >>> 0) _abort();
     $193 = $155 + 16 | 0;
     if ((HEAP32[$193 >> 2] | 0) == ($0 | 0)) HEAP32[$193 >> 2] = $R7$3; else HEAP32[$155 + 20 >> 2] = $R7$3;
     if (!$R7$3) break;
    }
    $198 = HEAP32[247] | 0;
    if ($R7$3 >>> 0 < $198 >>> 0) _abort();
    HEAP32[$R7$3 + 24 >> 2] = $155;
    $201 = $0 + 16 | 0;
    $202 = HEAP32[$201 >> 2] | 0;
    do if ($202) if ($202 >>> 0 < $198 >>> 0) _abort(); else {
     HEAP32[$R7$3 + 16 >> 2] = $202;
     HEAP32[$202 + 24 >> 2] = $R7$3;
     break;
    } while (0);
    $208 = HEAP32[$201 + 4 >> 2] | 0;
    if ($208) if ($208 >>> 0 < (HEAP32[247] | 0) >>> 0) _abort(); else {
     HEAP32[$R7$3 + 20 >> 2] = $208;
     HEAP32[$208 + 24 >> 2] = $R7$3;
     break;
    }
   }
  } while (0);
  HEAP32[$$1 + 4 >> 2] = $129 | 1;
  HEAP32[$$1 + $129 >> 2] = $129;
  if (($$1 | 0) == (HEAP32[248] | 0)) {
   HEAP32[245] = $129;
   return;
  } else $$2 = $129;
 } else {
  HEAP32[$109 >> 2] = $110 & -2;
  HEAP32[$$1 + 4 >> 2] = $$14 | 1;
  HEAP32[$$1 + $$14 >> 2] = $$14;
  $$2 = $$14;
 }
 $223 = $$2 >>> 3;
 if ($$2 >>> 0 < 256) {
  $226 = 1012 + ($223 << 1 << 2) | 0;
  $227 = HEAP32[243] | 0;
  $228 = 1 << $223;
  if (!($227 & $228)) {
   HEAP32[243] = $227 | $228;
   $$pre$phiZ2D = $226 + 8 | 0;
   $F17$0 = $226;
  } else {
   $232 = $226 + 8 | 0;
   $233 = HEAP32[$232 >> 2] | 0;
   if ($233 >>> 0 < (HEAP32[247] | 0) >>> 0) _abort(); else {
    $$pre$phiZ2D = $232;
    $F17$0 = $233;
   }
  }
  HEAP32[$$pre$phiZ2D >> 2] = $$1;
  HEAP32[$F17$0 + 12 >> 2] = $$1;
  HEAP32[$$1 + 8 >> 2] = $F17$0;
  HEAP32[$$1 + 12 >> 2] = $226;
  return;
 }
 $239 = $$2 >>> 8;
 if (!$239) $I20$0 = 0; else if ($$2 >>> 0 > 16777215) $I20$0 = 31; else {
  $244 = ($239 + 1048320 | 0) >>> 16 & 8;
  $245 = $239 << $244;
  $248 = ($245 + 520192 | 0) >>> 16 & 4;
  $250 = $245 << $248;
  $253 = ($250 + 245760 | 0) >>> 16 & 2;
  $258 = 14 - ($248 | $244 | $253) + ($250 << $253 >>> 15) | 0;
  $I20$0 = $$2 >>> ($258 + 7 | 0) & 1 | $258 << 1;
 }
 $264 = 1276 + ($I20$0 << 2) | 0;
 HEAP32[$$1 + 28 >> 2] = $I20$0;
 HEAP32[$$1 + 20 >> 2] = 0;
 HEAP32[$$1 + 16 >> 2] = 0;
 $268 = HEAP32[244] | 0;
 $269 = 1 << $I20$0;
 if (!($268 & $269)) {
  HEAP32[244] = $268 | $269;
  HEAP32[$264 >> 2] = $$1;
  HEAP32[$$1 + 24 >> 2] = $264;
  HEAP32[$$1 + 12 >> 2] = $$1;
  HEAP32[$$1 + 8 >> 2] = $$1;
  return;
 }
 $K21$0 = $$2 << (($I20$0 | 0) == 31 ? 0 : 25 - ($I20$0 >>> 1) | 0);
 $T$0 = HEAP32[$264 >> 2] | 0;
 while (1) {
  if ((HEAP32[$T$0 + 4 >> 2] & -8 | 0) == ($$2 | 0)) {
   $T$0$lcssa = $T$0;
   label = 127;
   break;
  }
  $287 = $T$0 + 16 + ($K21$0 >>> 31 << 2) | 0;
  $289 = HEAP32[$287 >> 2] | 0;
  if (!$289) {
   $$lcssa = $287;
   $T$0$lcssa30 = $T$0;
   label = 124;
   break;
  } else {
   $K21$0 = $K21$0 << 1;
   $T$0 = $289;
  }
 }
 if ((label | 0) == 124) {
  if ($$lcssa >>> 0 < (HEAP32[247] | 0) >>> 0) _abort();
  HEAP32[$$lcssa >> 2] = $$1;
  HEAP32[$$1 + 24 >> 2] = $T$0$lcssa30;
  HEAP32[$$1 + 12 >> 2] = $$1;
  HEAP32[$$1 + 8 >> 2] = $$1;
  return;
 } else if ((label | 0) == 127) {
  $296 = $T$0$lcssa + 8 | 0;
  $297 = HEAP32[$296 >> 2] | 0;
  $298 = HEAP32[247] | 0;
  if (!($297 >>> 0 >= $298 >>> 0 & $T$0$lcssa >>> 0 >= $298 >>> 0)) _abort();
  HEAP32[$297 + 12 >> 2] = $$1;
  HEAP32[$296 >> 2] = $$1;
  HEAP32[$$1 + 8 >> 2] = $297;
  HEAP32[$$1 + 12 >> 2] = $T$0$lcssa;
  HEAP32[$$1 + 24 >> 2] = 0;
  return;
 }
}

function _pipelineExec($pl, $stdinFd, $stdoutFd, $stderrFd, $otherEndBuf, $otherEndBufSize) {
 $pl = $pl | 0;
 $stdinFd = $stdinFd | 0;
 $stdoutFd = $stdoutFd | 0;
 $stderrFd = $stderrFd | 0;
 $otherEndBuf = $otherEndBuf | 0;
 $otherEndBufSize = $otherEndBufSize | 0;
 var $$$i$i = 0, $$0$i$i$i = 0, $$0$i$i$i$i$lcssa52 = 0, $$013$i$i = 0, $$04$i$i = 0, $$lcssa = 0, $$lcssa55 = 0, $$lcssa58 = 0, $0 = 0, $100 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $112 = 0, $114 = 0, $12 = 0, $120 = 0, $122 = 0, $123 = 0, $124 = 0, $127 = 0, $128 = 0, $13 = 0, $133 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $140 = 0, $146 = 0, $147 = 0, $148 = 0, $21 = 0, $26 = 0, $3 = 0, $31 = 0, $35 = 0, $39 = 0, $40 = 0, $44 = 0, $45 = 0, $54 = 0, $6 = 0, $60 = 0, $64 = 0, $69 = 0, $76 = 0, $78 = 0, $79 = 0, $80 = 0, $85 = 0, $9 = 0, $94 = 0, $95 = 0, $96 = 0, $99 = 0, $fd$01$i$i = 0, $i$01$i$i$2$i$i$i$i = 0, $i$01$i$i$i$i$i$i = 0, $prevStdoutFd$05$i$i = 0, $proc$0$2$i$i = 0, $proc$0$2$i$i$i$i = 0, $proc$0$i$i = 0, $proc$03$i$i$i$i = 0, $proc$03$i$i$i$i$lcssa = 0, $proc$06$i$i = 0, $status$i$i$i = 0, $stdinFd$prevStdoutFd$i$i$i = 0, $stdoutFd2$i$i$i = 0, $str$i$i$1$i$i$i$i = 0, $vararg_buffer1 = 0, $vararg_buffer10 = 0, $vararg_buffer14 = 0, $vararg_buffer17 = 0, $vararg_buffer21 = 0, $vararg_buffer24 = 0, $vararg_buffer27 = 0, $vararg_buffer29 = 0, $vararg_buffer32 = 0, $vararg_buffer36 = 0, $vararg_buffer4 = 0, $vararg_buffer41 = 0, $vararg_buffer46 = 0, $vararg_buffer6 = 0, $vararg_buffer8 = 0, $vararg_ptr39 = 0, $vararg_ptr40 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 176 | 0;
 $vararg_buffer46 = sp + 144 | 0;
 $vararg_buffer41 = sp + 128 | 0;
 $vararg_buffer36 = sp + 112 | 0;
 $vararg_buffer32 = sp + 104 | 0;
 $vararg_buffer29 = sp + 96 | 0;
 $vararg_buffer27 = sp + 88 | 0;
 $vararg_buffer24 = sp + 80 | 0;
 $vararg_buffer21 = sp + 72 | 0;
 $vararg_buffer17 = sp + 64 | 0;
 $vararg_buffer14 = sp + 56 | 0;
 $vararg_buffer10 = sp + 40 | 0;
 $vararg_buffer8 = sp + 32 | 0;
 $vararg_buffer6 = sp + 24 | 0;
 $vararg_buffer4 = sp + 16 | 0;
 $vararg_buffer1 = sp + 8 | 0;
 $str$i$i$1$i$i$i$i = sp + 160 | 0;
 $status$i$i$i = sp + 152 | 0;
 $0 = $pl + 8 | 0;
 if ((HEAP32[$0 >> 2] | 0) >= 0) ___assert_fail(4521, 4505, 448, 4541);
 $3 = _fork() | 0;
 HEAP32[$0 >> 2] = $3;
 if (($3 | 0) < 0) _errnoAbort(4554, sp);
 if ($3) if (!(_setpgid($3, $3) | 0)) {
  STACKTOP = sp;
  return;
 } else {
  $146 = HEAP32[$0 >> 2] | 0;
  HEAP32[$vararg_buffer46 >> 2] = $146;
  HEAP32[$vararg_buffer46 + 4 >> 2] = $146;
  _errnoAbort(4945, $vararg_buffer46);
 }
 $6 = _getpid() | 0;
 HEAP32[$0 >> 2] = $6;
 if (_setpgid($6, $6) | 0) {
  $9 = HEAP32[$0 >> 2] | 0;
  HEAP32[$vararg_buffer1 >> 2] = $9;
  HEAP32[$vararg_buffer1 + 4 >> 2] = $9;
  _errnoAbort(4565, $vararg_buffer1);
 }
 $proc$0$2$i$i = HEAP32[$pl >> 2] | 0;
 L16 : do if ($proc$0$2$i$i) {
  $11 = $pl + 4 | 0;
  $12 = $str$i$i$1$i$i$i$i + 4 | 0;
  $$013$i$i = $otherEndBuf;
  $$04$i$i = $otherEndBufSize;
  $13 = $proc$0$2$i$i;
  $prevStdoutFd$05$i$i = -1;
  $proc$06$i$i = $proc$0$2$i$i;
  while (1) {
   $stdinFd$prevStdoutFd$i$i$i = ($13 | 0) == ($proc$06$i$i | 0) ? $stdinFd : $prevStdoutFd$05$i$i;
   if (!(HEAP32[$proc$06$i$i >> 2] | 0)) {
    $$0$i$i$i = $prevStdoutFd$05$i$i;
    $stdoutFd2$i$i$i = $stdoutFd;
   } else {
    if ((_pipe($str$i$i$1$i$i$i$i) | 0) < 0) {
     label = 12;
     break;
    }
    $$0$i$i$i = HEAP32[$str$i$i$1$i$i$i$i >> 2] | 0;
    $stdoutFd2$i$i$i = HEAP32[$12 >> 2] | 0;
   }
   $21 = _fork() | 0;
   HEAP32[$proc$06$i$i + 12 >> 2] = $21;
   if (($21 | 0) < 0) {
    label = 15;
    break;
   }
   if (!$21) {
    label = 17;
    break;
   }
   $44 = $proc$06$i$i + 16 | 0;
   $45 = HEAP32[$44 >> 2] | 0;
   if ($45) {
    label = 25;
    break;
   }
   HEAP32[$44 >> 2] = 1;
   HEAP32[$11 >> 2] = (HEAP32[$11 >> 2] | 0) + 1;
   if (!(($stdinFd$prevStdoutFd$i$i$i | 0) == -1 ? 1 : (HEAP32[$pl >> 2] | 0) == ($proc$06$i$i | 0))) if ((_close($stdinFd$prevStdoutFd$i$i$i) | 0) < 0) {
    label = 28;
    break;
   }
   $54 = HEAP32[$proc$06$i$i >> 2] | 0;
   if (($stdoutFd2$i$i$i | 0) == -1 | ($54 | 0) == 0) $proc$0$i$i = $54; else {
    if ((_close($stdoutFd2$i$i$i) | 0) < 0) {
     label = 34;
     break;
    }
    $proc$0$i$i = HEAP32[$proc$06$i$i >> 2] | 0;
   }
   if (!$proc$0$i$i) break L16;
   $$013$i$i = 0;
   $$04$i$i = 0;
   $13 = HEAP32[$pl >> 2] | 0;
   $prevStdoutFd$05$i$i = $$0$i$i$i;
   $proc$06$i$i = $proc$0$i$i;
  }
  if ((label | 0) == 12) _errnoAbort(4387, $vararg_buffer4); else if ((label | 0) == 15) _errnoAbort(4554, $vararg_buffer6); else if ((label | 0) == 17) {
   if (!$$013$i$i) {
    _plProcSetup($proc$06$i$i, $stdinFd$prevStdoutFd$i$i$i, $stdoutFd2$i$i$i, $stderrFd);
    $39 = $proc$06$i$i + 8 | 0;
    $40 = HEAP32[$39 >> 2] | 0;
    _execvp(HEAP32[$40 >> 2] | 0, $40 | 0) | 0;
    HEAP32[$vararg_buffer14 >> 2] = HEAP32[HEAP32[$39 >> 2] >> 2];
    _errnoAbort(4687, $vararg_buffer14);
   }
   _plProcSetup($proc$06$i$i, 0, $stdoutFd2$i$i$i, $stderrFd);
   $26 = _write(1, $$013$i$i, $$04$i$i) | 0;
   if (($26 | 0) < 0) _errnoAbort(4598, $vararg_buffer8);
   if (($26 | 0) == ($$04$i$i | 0)) {
    _close(1) | 0;
    _exit(0);
   } else {
    $31 = $vararg_buffer10;
    HEAP32[$31 >> 2] = $26;
    HEAP32[$31 + 4 >> 2] = (($26 | 0) < 0) << 31 >> 31;
    $35 = $vararg_buffer10 + 8 | 0;
    HEAP32[$35 >> 2] = $$04$i$i;
    HEAP32[$35 + 4 >> 2] = 0;
    _errAbort(4633, $vararg_buffer10);
   }
  } else if ((label | 0) == 25) {
   HEAP32[$vararg_buffer17 >> 2] = $45;
   HEAP32[$vararg_buffer17 + 4 >> 2] = 1;
   _errAbort(4703, $vararg_buffer17);
  } else if ((label | 0) == 28) {
   HEAP32[$vararg_buffer21 >> 2] = $stdinFd$prevStdoutFd$i$i$i;
   _errnoAbort(4405, $vararg_buffer21);
  } else if ((label | 0) == 34) {
   HEAP32[$vararg_buffer24 >> 2] = $stdoutFd2$i$i$i;
   _errnoAbort(4405, $vararg_buffer24);
  }
 } while (0);
 _close(0) | 0;
 _close(1) | 0;
 $60 = _sysconf(4) | 0;
 $$$i$i = ($60 | 0) < 0 ? 4096 : $60;
 if (($$$i$i | 0) > 3) {
  $fd$01$i$i = 3;
  do {
   _close($fd$01$i$i) | 0;
   $fd$01$i$i = $fd$01$i$i + 1 | 0;
  } while (($fd$01$i$i | 0) != ($$$i$i | 0));
 }
 $64 = $pl + 4 | 0;
 if ((HEAP32[$64 >> 2] | 0) <= 0) _exit(0);
 L59 : while (1) {
  $69 = _waitpid(0 - (HEAP32[$0 >> 2] | 0) | 0, $status$i$i$i | 0, 0) | 0;
  if (($69 | 0) < 0) {
   label = 40;
   break;
  }
  $proc$0$2$i$i$i$i = HEAP32[$pl >> 2] | 0;
  if (!$proc$0$2$i$i$i$i) {
   label = 44;
   break;
  } else $proc$03$i$i$i$i = $proc$0$2$i$i$i$i;
  while (1) {
   if ((HEAP32[$proc$03$i$i$i$i + 12 >> 2] | 0) == ($69 | 0)) {
    $proc$03$i$i$i$i$lcssa = $proc$03$i$i$i$i;
    break;
   }
   $proc$03$i$i$i$i = HEAP32[$proc$03$i$i$i$i >> 2] | 0;
   if (!$proc$03$i$i$i$i) {
    label = 44;
    break L59;
   }
  }
  $76 = HEAP32[$status$i$i$i >> 2] | 0;
  HEAP32[$proc$03$i$i$i$i$lcssa + 12 >> 2] = -1;
  $78 = $proc$03$i$i$i$i$lcssa + 20 | 0;
  HEAP32[$78 >> 2] = $76;
  $79 = $proc$03$i$i$i$i$lcssa + 16 | 0;
  $80 = HEAP32[$79 >> 2] | 0;
  if (($80 | 0) != 1) {
   label = 46;
   break;
  }
  HEAP32[$79 >> 2] = 2;
  $85 = $76 & 127;
  if ((($76 & 65535) + -1 | 0) >>> 0 < 255) {
   if (($85 | 0) != 13) {
    label = 50;
    break;
   }
   if (!(HEAP32[(HEAP32[$proc$03$i$i$i$i$lcssa + 4 >> 2] | 0) + 20 >> 2] & 32)) {
    label = 50;
    break;
   }
  } else {
   if ($85) {
    label = 56;
    break;
   }
   $112 = $76 >>> 8 & 255;
   if ($112) {
    $$0$i$i$i$i$lcssa52 = $proc$03$i$i$i$i$lcssa;
    $$lcssa = $112;
    $$lcssa55 = $78;
    $$lcssa58 = $76;
    label = 58;
    break;
   }
  }
  $140 = HEAP32[$64 >> 2] | 0;
  HEAP32[$64 >> 2] = $140 + -1;
  if (($140 | 0) <= 0) {
   label = 66;
   break;
  }
  if (($140 | 0) <= 1) {
   label = 68;
   break;
  }
 }
 if ((label | 0) == 40) _errnoAbort(4490, $vararg_buffer27); else if ((label | 0) == 44) {
  HEAP32[$vararg_buffer29 >> 2] = $69;
  _errAbort(4738, $vararg_buffer29);
 } else if ((label | 0) == 46) {
  HEAP32[$vararg_buffer32 >> 2] = $80;
  HEAP32[$vararg_buffer32 + 4 >> 2] = 2;
  _errAbort(4703, $vararg_buffer32);
 } else if ((label | 0) == 50) {
  $94 = HEAP32[$proc$03$i$i$i$i$lcssa + 8 >> 2] | 0;
  $95 = _newDyString(512) | 0;
  HEAP32[$str$i$i$1$i$i$i$i >> 2] = $95;
  $96 = HEAP32[$94 >> 2] | 0;
  if (!$96) {
   $105 = _dyStringCannibalize($str$i$i$1$i$i$i$i) | 0;
   $106 = $proc$03$i$i$i$i$lcssa + 4 | 0;
   $107 = HEAP32[$106 >> 2] | 0;
   $108 = $107 + 12 | 0;
   $109 = HEAP32[$108 >> 2] | 0;
   HEAP32[$vararg_buffer36 >> 2] = $85;
   $vararg_ptr39 = $vararg_buffer36 + 4 | 0;
   HEAP32[$vararg_ptr39 >> 2] = $105;
   $vararg_ptr40 = $vararg_buffer36 + 8 | 0;
   HEAP32[$vararg_ptr40 >> 2] = $109;
   _errAbort(4770, $vararg_buffer36);
  } else {
   $147 = $96;
   $99 = $94;
   $i$01$i$i$i$i$i$i = 0;
  }
  do {
   if (($i$01$i$i$i$i$i$i | 0) > 0) {
    _dyStringAppend($95, 4768);
    $100 = HEAP32[$99 >> 2] | 0;
   } else $100 = $147;
   _dyStringAppend($95, $100);
   $i$01$i$i$i$i$i$i = $i$01$i$i$i$i$i$i + 1 | 0;
   $99 = $94 + ($i$01$i$i$i$i$i$i << 2) | 0;
   $147 = HEAP32[$99 >> 2] | 0;
  } while (($147 | 0) != 0);
  $105 = _dyStringCannibalize($str$i$i$1$i$i$i$i) | 0;
  $106 = $proc$03$i$i$i$i$lcssa + 4 | 0;
  $107 = HEAP32[$106 >> 2] | 0;
  $108 = $107 + 12 | 0;
  $109 = HEAP32[$108 >> 2] | 0;
  HEAP32[$vararg_buffer36 >> 2] = $85;
  $vararg_ptr39 = $vararg_buffer36 + 4 | 0;
  HEAP32[$vararg_ptr39 >> 2] = $105;
  $vararg_ptr40 = $vararg_buffer36 + 8 | 0;
  HEAP32[$vararg_ptr40 >> 2] = $109;
  _errAbort(4770, $vararg_buffer36);
 } else if ((label | 0) == 56) ___assert_fail(4825, 4505, 242, 4849); else if ((label | 0) == 58) {
  $114 = $$0$i$i$i$i$lcssa52 + 4 | 0;
  if (HEAP32[(HEAP32[$114 >> 2] | 0) + 20 >> 2] & 4) {
   $138 = $$lcssa58;
   $137 = $138 >>> 8;
   $139 = $137 & 255;
   _exit($139 | 0);
  }
  $120 = HEAP32[57] | 0;
  $122 = HEAP32[$$0$i$i$i$i$lcssa52 + 8 >> 2] | 0;
  $123 = _newDyString(512) | 0;
  HEAP32[$str$i$i$1$i$i$i$i >> 2] = $123;
  $124 = HEAP32[$122 >> 2] | 0;
  if ($124) {
   $127 = $122;
   $148 = $124;
   $i$01$i$i$2$i$i$i$i = 0;
   do {
    if (($i$01$i$i$2$i$i$i$i | 0) > 0) {
     _dyStringAppend($123, 4768);
     $128 = HEAP32[$127 >> 2] | 0;
    } else $128 = $148;
    _dyStringAppend($123, $128);
    $i$01$i$i$2$i$i$i$i = $i$01$i$i$2$i$i$i$i + 1 | 0;
    $127 = $122 + ($i$01$i$i$2$i$i$i$i << 2) | 0;
    $148 = HEAP32[$127 >> 2] | 0;
   } while (($148 | 0) != 0);
  }
  $133 = _dyStringCannibalize($str$i$i$1$i$i$i$i) | 0;
  $136 = HEAP32[(HEAP32[$114 >> 2] | 0) + 12 >> 2] | 0;
  HEAP32[$vararg_buffer41 >> 2] = $$lcssa;
  HEAP32[$vararg_buffer41 + 4 >> 2] = $133;
  HEAP32[$vararg_buffer41 + 8 >> 2] = $136;
  _fprintf($120, 4868, $vararg_buffer41) | 0;
  $138 = HEAP32[$$lcssa55 >> 2] | 0;
  $137 = $138 >>> 8;
  $139 = $137 & 255;
  _exit($139 | 0);
 } else if ((label | 0) == 66) ___assert_fail(4915, 4505, 396, 4935); else if ((label | 0) == 68) _exit(0);
}

function ___udivmoddi4($a$0, $a$1, $b$0, $b$1, $rem) {
 $a$0 = $a$0 | 0;
 $a$1 = $a$1 | 0;
 $b$0 = $b$0 | 0;
 $b$1 = $b$1 | 0;
 $rem = $rem | 0;
 var $n_sroa_0_0_extract_trunc = 0, $n_sroa_1_4_extract_shift$0 = 0, $n_sroa_1_4_extract_trunc = 0, $d_sroa_0_0_extract_trunc = 0, $d_sroa_1_4_extract_shift$0 = 0, $d_sroa_1_4_extract_trunc = 0, $4 = 0, $17 = 0, $37 = 0, $51 = 0, $57 = 0, $58 = 0, $66 = 0, $78 = 0, $88 = 0, $89 = 0, $91 = 0, $92 = 0, $95 = 0, $105 = 0, $119 = 0, $125 = 0, $126 = 0, $130 = 0, $q_sroa_1_1_ph = 0, $q_sroa_0_1_ph = 0, $r_sroa_1_1_ph = 0, $r_sroa_0_1_ph = 0, $sr_1_ph = 0, $d_sroa_0_0_insert_insert99$0 = 0, $d_sroa_0_0_insert_insert99$1 = 0, $137$0 = 0, $137$1 = 0, $carry_0203 = 0, $sr_1202 = 0, $r_sroa_0_1201 = 0, $r_sroa_1_1200 = 0, $q_sroa_0_1199 = 0, $q_sroa_1_1198 = 0, $r_sroa_0_0_insert_insert42$0 = 0, $r_sroa_0_0_insert_insert42$1 = 0, $150$1 = 0, $151$0 = 0, $carry_0_lcssa$0 = 0, $carry_0_lcssa$1 = 0, $r_sroa_0_1_lcssa = 0, $r_sroa_1_1_lcssa = 0, $q_sroa_0_1_lcssa = 0, $q_sroa_1_1_lcssa = 0, $q_sroa_0_0_insert_ext75$0 = 0, $q_sroa_0_0_insert_ext75$1 = 0, $_0$0 = 0, $_0$1 = 0, $q_sroa_1_1198$looptemp = 0;
 $n_sroa_0_0_extract_trunc = $a$0;
 $n_sroa_1_4_extract_shift$0 = $a$1;
 $n_sroa_1_4_extract_trunc = $n_sroa_1_4_extract_shift$0;
 $d_sroa_0_0_extract_trunc = $b$0;
 $d_sroa_1_4_extract_shift$0 = $b$1;
 $d_sroa_1_4_extract_trunc = $d_sroa_1_4_extract_shift$0;
 if (!$n_sroa_1_4_extract_trunc) {
  $4 = ($rem | 0) != 0;
  if (!$d_sroa_1_4_extract_trunc) {
   if ($4) {
    HEAP32[$rem >> 2] = ($n_sroa_0_0_extract_trunc >>> 0) % ($d_sroa_0_0_extract_trunc >>> 0);
    HEAP32[$rem + 4 >> 2] = 0;
   }
   $_0$1 = 0;
   $_0$0 = ($n_sroa_0_0_extract_trunc >>> 0) / ($d_sroa_0_0_extract_trunc >>> 0) >>> 0;
   return (tempRet0 = $_0$1, $_0$0) | 0;
  } else {
   if (!$4) {
    $_0$1 = 0;
    $_0$0 = 0;
    return (tempRet0 = $_0$1, $_0$0) | 0;
   }
   HEAP32[$rem >> 2] = $a$0 | 0;
   HEAP32[$rem + 4 >> 2] = $a$1 & 0;
   $_0$1 = 0;
   $_0$0 = 0;
   return (tempRet0 = $_0$1, $_0$0) | 0;
  }
 }
 $17 = ($d_sroa_1_4_extract_trunc | 0) == 0;
 do if (!$d_sroa_0_0_extract_trunc) {
  if ($17) {
   if ($rem) {
    HEAP32[$rem >> 2] = ($n_sroa_1_4_extract_trunc >>> 0) % ($d_sroa_0_0_extract_trunc >>> 0);
    HEAP32[$rem + 4 >> 2] = 0;
   }
   $_0$1 = 0;
   $_0$0 = ($n_sroa_1_4_extract_trunc >>> 0) / ($d_sroa_0_0_extract_trunc >>> 0) >>> 0;
   return (tempRet0 = $_0$1, $_0$0) | 0;
  }
  if (!$n_sroa_0_0_extract_trunc) {
   if ($rem) {
    HEAP32[$rem >> 2] = 0;
    HEAP32[$rem + 4 >> 2] = ($n_sroa_1_4_extract_trunc >>> 0) % ($d_sroa_1_4_extract_trunc >>> 0);
   }
   $_0$1 = 0;
   $_0$0 = ($n_sroa_1_4_extract_trunc >>> 0) / ($d_sroa_1_4_extract_trunc >>> 0) >>> 0;
   return (tempRet0 = $_0$1, $_0$0) | 0;
  }
  $37 = $d_sroa_1_4_extract_trunc - 1 | 0;
  if (!($37 & $d_sroa_1_4_extract_trunc)) {
   if ($rem) {
    HEAP32[$rem >> 2] = $a$0 | 0;
    HEAP32[$rem + 4 >> 2] = $37 & $n_sroa_1_4_extract_trunc | $a$1 & 0;
   }
   $_0$1 = 0;
   $_0$0 = $n_sroa_1_4_extract_trunc >>> ((_llvm_cttz_i32($d_sroa_1_4_extract_trunc | 0) | 0) >>> 0);
   return (tempRet0 = $_0$1, $_0$0) | 0;
  }
  $51 = (Math_clz32($d_sroa_1_4_extract_trunc | 0) | 0) - (Math_clz32($n_sroa_1_4_extract_trunc | 0) | 0) | 0;
  if ($51 >>> 0 <= 30) {
   $57 = $51 + 1 | 0;
   $58 = 31 - $51 | 0;
   $sr_1_ph = $57;
   $r_sroa_0_1_ph = $n_sroa_1_4_extract_trunc << $58 | $n_sroa_0_0_extract_trunc >>> ($57 >>> 0);
   $r_sroa_1_1_ph = $n_sroa_1_4_extract_trunc >>> ($57 >>> 0);
   $q_sroa_0_1_ph = 0;
   $q_sroa_1_1_ph = $n_sroa_0_0_extract_trunc << $58;
   break;
  }
  if (!$rem) {
   $_0$1 = 0;
   $_0$0 = 0;
   return (tempRet0 = $_0$1, $_0$0) | 0;
  }
  HEAP32[$rem >> 2] = $a$0 | 0;
  HEAP32[$rem + 4 >> 2] = $n_sroa_1_4_extract_shift$0 | $a$1 & 0;
  $_0$1 = 0;
  $_0$0 = 0;
  return (tempRet0 = $_0$1, $_0$0) | 0;
 } else {
  if (!$17) {
   $119 = (Math_clz32($d_sroa_1_4_extract_trunc | 0) | 0) - (Math_clz32($n_sroa_1_4_extract_trunc | 0) | 0) | 0;
   if ($119 >>> 0 <= 31) {
    $125 = $119 + 1 | 0;
    $126 = 31 - $119 | 0;
    $130 = $119 - 31 >> 31;
    $sr_1_ph = $125;
    $r_sroa_0_1_ph = $n_sroa_0_0_extract_trunc >>> ($125 >>> 0) & $130 | $n_sroa_1_4_extract_trunc << $126;
    $r_sroa_1_1_ph = $n_sroa_1_4_extract_trunc >>> ($125 >>> 0) & $130;
    $q_sroa_0_1_ph = 0;
    $q_sroa_1_1_ph = $n_sroa_0_0_extract_trunc << $126;
    break;
   }
   if (!$rem) {
    $_0$1 = 0;
    $_0$0 = 0;
    return (tempRet0 = $_0$1, $_0$0) | 0;
   }
   HEAP32[$rem >> 2] = $a$0 | 0;
   HEAP32[$rem + 4 >> 2] = $n_sroa_1_4_extract_shift$0 | $a$1 & 0;
   $_0$1 = 0;
   $_0$0 = 0;
   return (tempRet0 = $_0$1, $_0$0) | 0;
  }
  $66 = $d_sroa_0_0_extract_trunc - 1 | 0;
  if ($66 & $d_sroa_0_0_extract_trunc) {
   $88 = (Math_clz32($d_sroa_0_0_extract_trunc | 0) | 0) + 33 - (Math_clz32($n_sroa_1_4_extract_trunc | 0) | 0) | 0;
   $89 = 64 - $88 | 0;
   $91 = 32 - $88 | 0;
   $92 = $91 >> 31;
   $95 = $88 - 32 | 0;
   $105 = $95 >> 31;
   $sr_1_ph = $88;
   $r_sroa_0_1_ph = $91 - 1 >> 31 & $n_sroa_1_4_extract_trunc >>> ($95 >>> 0) | ($n_sroa_1_4_extract_trunc << $91 | $n_sroa_0_0_extract_trunc >>> ($88 >>> 0)) & $105;
   $r_sroa_1_1_ph = $105 & $n_sroa_1_4_extract_trunc >>> ($88 >>> 0);
   $q_sroa_0_1_ph = $n_sroa_0_0_extract_trunc << $89 & $92;
   $q_sroa_1_1_ph = ($n_sroa_1_4_extract_trunc << $89 | $n_sroa_0_0_extract_trunc >>> ($95 >>> 0)) & $92 | $n_sroa_0_0_extract_trunc << $91 & $88 - 33 >> 31;
   break;
  }
  if ($rem) {
   HEAP32[$rem >> 2] = $66 & $n_sroa_0_0_extract_trunc;
   HEAP32[$rem + 4 >> 2] = 0;
  }
  if (($d_sroa_0_0_extract_trunc | 0) == 1) {
   $_0$1 = $n_sroa_1_4_extract_shift$0 | $a$1 & 0;
   $_0$0 = $a$0 | 0 | 0;
   return (tempRet0 = $_0$1, $_0$0) | 0;
  } else {
   $78 = _llvm_cttz_i32($d_sroa_0_0_extract_trunc | 0) | 0;
   $_0$1 = $n_sroa_1_4_extract_trunc >>> ($78 >>> 0) | 0;
   $_0$0 = $n_sroa_1_4_extract_trunc << 32 - $78 | $n_sroa_0_0_extract_trunc >>> ($78 >>> 0) | 0;
   return (tempRet0 = $_0$1, $_0$0) | 0;
  }
 } while (0);
 if (!$sr_1_ph) {
  $q_sroa_1_1_lcssa = $q_sroa_1_1_ph;
  $q_sroa_0_1_lcssa = $q_sroa_0_1_ph;
  $r_sroa_1_1_lcssa = $r_sroa_1_1_ph;
  $r_sroa_0_1_lcssa = $r_sroa_0_1_ph;
  $carry_0_lcssa$1 = 0;
  $carry_0_lcssa$0 = 0;
 } else {
  $d_sroa_0_0_insert_insert99$0 = $b$0 | 0 | 0;
  $d_sroa_0_0_insert_insert99$1 = $d_sroa_1_4_extract_shift$0 | $b$1 & 0;
  $137$0 = _i64Add($d_sroa_0_0_insert_insert99$0 | 0, $d_sroa_0_0_insert_insert99$1 | 0, -1, -1) | 0;
  $137$1 = tempRet0;
  $q_sroa_1_1198 = $q_sroa_1_1_ph;
  $q_sroa_0_1199 = $q_sroa_0_1_ph;
  $r_sroa_1_1200 = $r_sroa_1_1_ph;
  $r_sroa_0_1201 = $r_sroa_0_1_ph;
  $sr_1202 = $sr_1_ph;
  $carry_0203 = 0;
  do {
   $q_sroa_1_1198$looptemp = $q_sroa_1_1198;
   $q_sroa_1_1198 = $q_sroa_0_1199 >>> 31 | $q_sroa_1_1198 << 1;
   $q_sroa_0_1199 = $carry_0203 | $q_sroa_0_1199 << 1;
   $r_sroa_0_0_insert_insert42$0 = $r_sroa_0_1201 << 1 | $q_sroa_1_1198$looptemp >>> 31 | 0;
   $r_sroa_0_0_insert_insert42$1 = $r_sroa_0_1201 >>> 31 | $r_sroa_1_1200 << 1 | 0;
   _i64Subtract($137$0, $137$1, $r_sroa_0_0_insert_insert42$0, $r_sroa_0_0_insert_insert42$1) | 0;
   $150$1 = tempRet0;
   $151$0 = $150$1 >> 31 | (($150$1 | 0) < 0 ? -1 : 0) << 1;
   $carry_0203 = $151$0 & 1;
   $r_sroa_0_1201 = _i64Subtract($r_sroa_0_0_insert_insert42$0, $r_sroa_0_0_insert_insert42$1, $151$0 & $d_sroa_0_0_insert_insert99$0, ((($150$1 | 0) < 0 ? -1 : 0) >> 31 | (($150$1 | 0) < 0 ? -1 : 0) << 1) & $d_sroa_0_0_insert_insert99$1) | 0;
   $r_sroa_1_1200 = tempRet0;
   $sr_1202 = $sr_1202 - 1 | 0;
  } while (($sr_1202 | 0) != 0);
  $q_sroa_1_1_lcssa = $q_sroa_1_1198;
  $q_sroa_0_1_lcssa = $q_sroa_0_1199;
  $r_sroa_1_1_lcssa = $r_sroa_1_1200;
  $r_sroa_0_1_lcssa = $r_sroa_0_1201;
  $carry_0_lcssa$1 = 0;
  $carry_0_lcssa$0 = $carry_0203;
 }
 $q_sroa_0_0_insert_ext75$0 = $q_sroa_0_1_lcssa;
 $q_sroa_0_0_insert_ext75$1 = 0;
 if ($rem) {
  HEAP32[$rem >> 2] = $r_sroa_0_1_lcssa;
  HEAP32[$rem + 4 >> 2] = $r_sroa_1_1_lcssa;
 }
 $_0$1 = ($q_sroa_0_0_insert_ext75$0 | 0) >>> 31 | ($q_sroa_1_1_lcssa | $q_sroa_0_0_insert_ext75$1) << 1 | ($q_sroa_0_0_insert_ext75$1 << 1 | $q_sroa_0_0_insert_ext75$0 >>> 31) & 0 | $carry_0_lcssa$1;
 $_0$0 = ($q_sroa_0_0_insert_ext75$0 << 1 | 0 >>> 31) & -2 | $carry_0_lcssa$0;
 return (tempRet0 = $_0$1, $_0$0) | 0;
}

function _hashThisEqThatLine($line, $lineIx, $firstStartsWithLetter) {
 $line = $line | 0;
 $lineIx = $lineIx | 0;
 $firstStartsWithLetter = $firstStartsWithLetter | 0;
 var $$01$ph$i = 0, $$01$ph$i$lcssa87 = 0, $$01$ph$i$us = 0, $$01$ph$i$us$lcssa78 = 0, $$lcssa = 0, $$lcssa73 = 0, $$lcssa74 = 0, $$lcssa74$lcssa = 0, $$lcssa75 = 0, $$lcssa76 = 0, $$lcssa80 = 0, $$lcssa81 = 0, $$lcssa81$lcssa = 0, $$lcssa83 = 0, $$lcssa84 = 0, $$lcssa85 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $14 = 0, $15 = 0, $18 = 0, $2 = 0, $20 = 0, $25 = 0, $31 = 0, $33 = 0, $35 = 0, $36 = 0, $41 = 0, $43 = 0, $44 = 0, $45 = 0, $47 = 0, $48 = 0, $51 = 0, $53 = 0, $58 = 0, $6 = 0, $64 = 0, $66 = 0, $8 = 0, $dupe = 0, $escaped$0$i = 0, $escaped$0$i$us = 0, $s$0$i = 0, $s$0$i$us = 0, $s$0$ph$i = 0, $s$0$ph$i$us = 0, $vararg_buffer = 0, $vararg_buffer10 = 0, $vararg_buffer14 = 0, $vararg_buffer19 = 0, $vararg_buffer22 = 0, $vararg_buffer3 = 0, $vararg_buffer6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 80 | 0;
 $vararg_buffer22 = sp + 64 | 0;
 $vararg_buffer19 = sp + 56 | 0;
 $vararg_buffer14 = sp + 40 | 0;
 $vararg_buffer10 = sp + 32 | 0;
 $vararg_buffer6 = sp + 24 | 0;
 $vararg_buffer3 = sp + 16 | 0;
 $vararg_buffer = sp;
 $dupe = sp + 72 | 0;
 $0 = _cloneString($line) | 0;
 HEAP32[$dupe >> 2] = $0;
 $1 = _newHashExt(8, 1) | 0;
 $2 = _skipLeadingSpaces($0) | 0;
 if (!$2) {
  _freez($dupe);
  STACKTOP = sp;
  return $1 | 0;
 }
 if (!$firstStartsWithLetter) {
  $6 = $2;
  L5 : while (1) {
   if (!(HEAP8[$6 >> 0] | 0)) {
    label = 43;
    break;
   }
   $8 = _strchr($6, 61) | 0;
   if (!$8) {
    label = 5;
    break;
   }
   $10 = $8 + 1 | 0;
   HEAP8[$8 >> 0] = 0;
   $11 = HEAP8[$10 >> 0] | 0;
   $12 = $11 << 24 >> 24;
   switch ($11 << 24 >> 24) {
   case 34:
   case 39:
    {
     $$01$ph$i$us = $10;
     $s$0$ph$i$us = $8 + 2 | 0;
     while (1) {
      $escaped$0$i$us = 0;
      $s$0$i$us = $s$0$ph$i$us;
      while (1) {
       $14 = $s$0$i$us + 1 | 0;
       $15 = HEAP8[$s$0$i$us >> 0] | 0;
       if (!($15 << 24 >> 24)) {
        label = 18;
        break L5;
       }
       $18 = $15 << 24 >> 24 == 92;
       if ($escaped$0$i$us) {
        $$lcssa = $18;
        $$lcssa73 = $14;
        $$lcssa75 = $15;
        break;
       }
       if ($18) {
        $escaped$0$i$us = 1;
        $s$0$i$us = $14;
       } else {
        $$lcssa74 = $14;
        $$lcssa76 = $15;
        label = 15;
        break;
       }
      }
      if ((label | 0) == 15) {
       label = 0;
       if ($$lcssa76 << 24 >> 24 == $11 << 24 >> 24) {
        $$01$ph$i$us$lcssa78 = $$01$ph$i$us;
        $$lcssa74$lcssa = $$lcssa74;
        break;
       }
       HEAP8[$$01$ph$i$us >> 0] = $$lcssa76;
       $$01$ph$i$us = $$01$ph$i$us + 1 | 0;
       $s$0$ph$i$us = $$lcssa74;
       continue;
      }
      $20 = $$01$ph$i$us + 1 | 0;
      if ($$lcssa | $$lcssa75 << 24 >> 24 == $11 << 24 >> 24) {
       HEAP8[$$01$ph$i$us >> 0] = $$lcssa75;
       $$01$ph$i$us = $20;
       $s$0$ph$i$us = $$lcssa73;
       continue;
      } else {
       HEAP8[$$01$ph$i$us >> 0] = 92;
       HEAP8[$20 >> 0] = $$lcssa75;
       $$01$ph$i$us = $$01$ph$i$us + 2 | 0;
       $s$0$ph$i$us = $$lcssa73;
       continue;
      }
     }
     HEAP8[$$01$ph$i$us$lcssa78 >> 0] = 0;
     $31 = $$lcssa74$lcssa;
     break;
    }
   default:
    {
     $25 = _skipToSpaces($10) | 0;
     if (!$25) $31 = $25; else {
      HEAP8[$25 >> 0] = 0;
      $31 = $25 + 1 | 0;
     }
    }
   }
   _hashAdd($1, $6, _cloneString($10) | 0) | 0;
   $33 = _skipLeadingSpaces($31) | 0;
   if (!$33) {
    label = 43;
    break;
   } else $6 = $33;
  }
  if ((label | 0) == 5) {
   HEAP32[$vararg_buffer >> 2] = $lineIx;
   HEAP32[$vararg_buffer + 4 >> 2] = $6;
   HEAP32[$vararg_buffer + 8 >> 2] = $line;
   _errAbort(4065, $vararg_buffer);
  } else if ((label | 0) == 18) {
   HEAP32[$vararg_buffer3 >> 2] = $12;
   _warn(4052, $vararg_buffer3);
   HEAP32[$vararg_buffer6 >> 2] = $lineIx;
   HEAP32[$vararg_buffer6 + 4 >> 2] = $12;
   _errAbort(4131, $vararg_buffer6);
  } else if ((label | 0) == 43) {
   _freez($dupe);
   STACKTOP = sp;
   return $1 | 0;
  }
 } else $36 = $2;
 L33 : while (1) {
  $35 = HEAP8[$36 >> 0] | 0;
  if (!($35 << 24 >> 24)) {
   label = 43;
   break;
  }
  if (!(_isalpha($35 << 24 >> 24) | 0)) {
   label = 24;
   break;
  }
  $41 = _strchr($36, 61) | 0;
  if (!$41) {
   label = 26;
   break;
  }
  $43 = $41 + 1 | 0;
  HEAP8[$41 >> 0] = 0;
  $44 = HEAP8[$43 >> 0] | 0;
  $45 = $44 << 24 >> 24;
  switch ($44 << 24 >> 24) {
  case 34:
  case 39:
   {
    $$01$ph$i = $43;
    $s$0$ph$i = $41 + 2 | 0;
    while (1) {
     $escaped$0$i = 0;
     $s$0$i = $s$0$ph$i;
     while (1) {
      $47 = $s$0$i + 1 | 0;
      $48 = HEAP8[$s$0$i >> 0] | 0;
      if (!($48 << 24 >> 24)) {
       label = 39;
       break L33;
      }
      $51 = $48 << 24 >> 24 == 92;
      if ($escaped$0$i) {
       $$lcssa80 = $47;
       $$lcssa83 = $48;
       $$lcssa85 = $51;
       break;
      }
      if ($51) {
       $escaped$0$i = 1;
       $s$0$i = $47;
      } else {
       $$lcssa81 = $47;
       $$lcssa84 = $48;
       label = 36;
       break;
      }
     }
     if ((label | 0) == 36) {
      label = 0;
      if ($$lcssa84 << 24 >> 24 == $44 << 24 >> 24) {
       $$01$ph$i$lcssa87 = $$01$ph$i;
       $$lcssa81$lcssa = $$lcssa81;
       break;
      }
      HEAP8[$$01$ph$i >> 0] = $$lcssa84;
      $$01$ph$i = $$01$ph$i + 1 | 0;
      $s$0$ph$i = $$lcssa81;
      continue;
     }
     $53 = $$01$ph$i + 1 | 0;
     if ($$lcssa85 | $$lcssa83 << 24 >> 24 == $44 << 24 >> 24) {
      HEAP8[$$01$ph$i >> 0] = $$lcssa83;
      $$01$ph$i = $53;
      $s$0$ph$i = $$lcssa80;
      continue;
     } else {
      HEAP8[$$01$ph$i >> 0] = 92;
      HEAP8[$53 >> 0] = $$lcssa83;
      $$01$ph$i = $$01$ph$i + 2 | 0;
      $s$0$ph$i = $$lcssa80;
      continue;
     }
    }
    HEAP8[$$01$ph$i$lcssa87 >> 0] = 0;
    $64 = $$lcssa81$lcssa;
    break;
   }
  default:
   {
    $58 = _skipToSpaces($43) | 0;
    if (!$58) $64 = $58; else {
     HEAP8[$58 >> 0] = 0;
     $64 = $58 + 1 | 0;
    }
   }
  }
  _hashAdd($1, $36, _cloneString($43) | 0) | 0;
  $66 = _skipLeadingSpaces($64) | 0;
  if (!$66) {
   label = 43;
   break;
  } else $36 = $66;
 }
 if ((label | 0) == 24) {
  HEAP32[$vararg_buffer10 >> 2] = $lineIx;
  HEAP32[$vararg_buffer10 + 4 >> 2] = $36;
  _errAbort(4168, $vararg_buffer10);
 } else if ((label | 0) == 26) {
  HEAP32[$vararg_buffer14 >> 2] = $lineIx;
  HEAP32[$vararg_buffer14 + 4 >> 2] = $36;
  HEAP32[$vararg_buffer14 + 8 >> 2] = $line;
  _errAbort(4065, $vararg_buffer14);
 } else if ((label | 0) == 39) {
  HEAP32[$vararg_buffer19 >> 2] = $45;
  _warn(4052, $vararg_buffer19);
  HEAP32[$vararg_buffer22 >> 2] = $lineIx;
  HEAP32[$vararg_buffer22 + 4 >> 2] = $45;
  _errAbort(4131, $vararg_buffer22);
 } else if ((label | 0) == 43) {
  _freez($dupe);
  STACKTOP = sp;
  return $1 | 0;
 }
 return 0;
}

function _try_realloc_chunk($p, $nb) {
 $p = $p | 0;
 $nb = $nb | 0;
 var $$pre$phiZ2D = 0, $0 = 0, $1 = 0, $101 = 0, $104 = 0, $106 = 0, $109 = 0, $112 = 0, $113 = 0, $114 = 0, $116 = 0, $118 = 0, $119 = 0, $121 = 0, $122 = 0, $127 = 0, $128 = 0, $137 = 0, $142 = 0, $145 = 0, $146 = 0, $152 = 0, $163 = 0, $166 = 0, $173 = 0, $2 = 0, $20 = 0, $22 = 0, $29 = 0, $3 = 0, $35 = 0, $37 = 0, $38 = 0, $4 = 0, $47 = 0, $49 = 0, $5 = 0, $51 = 0, $52 = 0, $58 = 0, $65 = 0, $71 = 0, $73 = 0, $74 = 0, $77 = 0, $79 = 0, $8 = 0, $81 = 0, $94 = 0, $99 = 0, $R$1 = 0, $R$1$lcssa = 0, $R$3 = 0, $RP$1 = 0, $RP$1$lcssa = 0, $newp$2 = 0, $storemerge = 0, $storemerge$1 = 0;
 $0 = $p + 4 | 0;
 $1 = HEAP32[$0 >> 2] | 0;
 $2 = $1 & -8;
 $3 = $p + $2 | 0;
 $4 = HEAP32[247] | 0;
 $5 = $1 & 3;
 if (!(($5 | 0) != 1 & $p >>> 0 >= $4 >>> 0 & $p >>> 0 < $3 >>> 0)) _abort();
 $8 = HEAP32[$3 + 4 >> 2] | 0;
 if (!($8 & 1)) _abort();
 if (!$5) {
  if ($nb >>> 0 < 256) {
   $newp$2 = 0;
   return $newp$2 | 0;
  }
  if ($2 >>> 0 >= ($nb + 4 | 0) >>> 0) if (($2 - $nb | 0) >>> 0 <= HEAP32[363] << 1 >>> 0) {
   $newp$2 = $p;
   return $newp$2 | 0;
  }
  $newp$2 = 0;
  return $newp$2 | 0;
 }
 if ($2 >>> 0 >= $nb >>> 0) {
  $20 = $2 - $nb | 0;
  if ($20 >>> 0 <= 15) {
   $newp$2 = $p;
   return $newp$2 | 0;
  }
  $22 = $p + $nb | 0;
  HEAP32[$0 >> 2] = $1 & 1 | $nb | 2;
  HEAP32[$22 + 4 >> 2] = $20 | 3;
  $29 = $22 + $20 + 4 | 0;
  HEAP32[$29 >> 2] = HEAP32[$29 >> 2] | 1;
  _dispose_chunk($22, $20);
  $newp$2 = $p;
  return $newp$2 | 0;
 }
 if (($3 | 0) == (HEAP32[249] | 0)) {
  $35 = (HEAP32[246] | 0) + $2 | 0;
  if ($35 >>> 0 <= $nb >>> 0) {
   $newp$2 = 0;
   return $newp$2 | 0;
  }
  $37 = $35 - $nb | 0;
  $38 = $p + $nb | 0;
  HEAP32[$0 >> 2] = $1 & 1 | $nb | 2;
  HEAP32[$38 + 4 >> 2] = $37 | 1;
  HEAP32[249] = $38;
  HEAP32[246] = $37;
  $newp$2 = $p;
  return $newp$2 | 0;
 }
 if (($3 | 0) == (HEAP32[248] | 0)) {
  $47 = (HEAP32[245] | 0) + $2 | 0;
  if ($47 >>> 0 < $nb >>> 0) {
   $newp$2 = 0;
   return $newp$2 | 0;
  }
  $49 = $47 - $nb | 0;
  if ($49 >>> 0 > 15) {
   $51 = $p + $nb | 0;
   $52 = $51 + $49 | 0;
   HEAP32[$0 >> 2] = $1 & 1 | $nb | 2;
   HEAP32[$51 + 4 >> 2] = $49 | 1;
   HEAP32[$52 >> 2] = $49;
   $58 = $52 + 4 | 0;
   HEAP32[$58 >> 2] = HEAP32[$58 >> 2] & -2;
   $storemerge = $51;
   $storemerge$1 = $49;
  } else {
   HEAP32[$0 >> 2] = $1 & 1 | $47 | 2;
   $65 = $p + $47 + 4 | 0;
   HEAP32[$65 >> 2] = HEAP32[$65 >> 2] | 1;
   $storemerge = 0;
   $storemerge$1 = 0;
  }
  HEAP32[245] = $storemerge$1;
  HEAP32[248] = $storemerge;
  $newp$2 = $p;
  return $newp$2 | 0;
 }
 if ($8 & 2) {
  $newp$2 = 0;
  return $newp$2 | 0;
 }
 $71 = ($8 & -8) + $2 | 0;
 if ($71 >>> 0 < $nb >>> 0) {
  $newp$2 = 0;
  return $newp$2 | 0;
 }
 $73 = $71 - $nb | 0;
 $74 = $8 >>> 3;
 do if ($8 >>> 0 < 256) {
  $77 = HEAP32[$3 + 8 >> 2] | 0;
  $79 = HEAP32[$3 + 12 >> 2] | 0;
  $81 = 1012 + ($74 << 1 << 2) | 0;
  if (($77 | 0) != ($81 | 0)) {
   if ($77 >>> 0 < $4 >>> 0) _abort();
   if ((HEAP32[$77 + 12 >> 2] | 0) != ($3 | 0)) _abort();
  }
  if (($79 | 0) == ($77 | 0)) {
   HEAP32[243] = HEAP32[243] & ~(1 << $74);
   break;
  }
  if (($79 | 0) == ($81 | 0)) $$pre$phiZ2D = $79 + 8 | 0; else {
   if ($79 >>> 0 < $4 >>> 0) _abort();
   $94 = $79 + 8 | 0;
   if ((HEAP32[$94 >> 2] | 0) == ($3 | 0)) $$pre$phiZ2D = $94; else _abort();
  }
  HEAP32[$77 + 12 >> 2] = $79;
  HEAP32[$$pre$phiZ2D >> 2] = $77;
 } else {
  $99 = HEAP32[$3 + 24 >> 2] | 0;
  $101 = HEAP32[$3 + 12 >> 2] | 0;
  do if (($101 | 0) == ($3 | 0)) {
   $112 = $3 + 16 | 0;
   $113 = $112 + 4 | 0;
   $114 = HEAP32[$113 >> 2] | 0;
   if (!$114) {
    $116 = HEAP32[$112 >> 2] | 0;
    if (!$116) {
     $R$3 = 0;
     break;
    } else {
     $R$1 = $116;
     $RP$1 = $112;
    }
   } else {
    $R$1 = $114;
    $RP$1 = $113;
   }
   while (1) {
    $118 = $R$1 + 20 | 0;
    $119 = HEAP32[$118 >> 2] | 0;
    if ($119) {
     $R$1 = $119;
     $RP$1 = $118;
     continue;
    }
    $121 = $R$1 + 16 | 0;
    $122 = HEAP32[$121 >> 2] | 0;
    if (!$122) {
     $R$1$lcssa = $R$1;
     $RP$1$lcssa = $RP$1;
     break;
    } else {
     $R$1 = $122;
     $RP$1 = $121;
    }
   }
   if ($RP$1$lcssa >>> 0 < $4 >>> 0) _abort(); else {
    HEAP32[$RP$1$lcssa >> 2] = 0;
    $R$3 = $R$1$lcssa;
    break;
   }
  } else {
   $104 = HEAP32[$3 + 8 >> 2] | 0;
   if ($104 >>> 0 < $4 >>> 0) _abort();
   $106 = $104 + 12 | 0;
   if ((HEAP32[$106 >> 2] | 0) != ($3 | 0)) _abort();
   $109 = $101 + 8 | 0;
   if ((HEAP32[$109 >> 2] | 0) == ($3 | 0)) {
    HEAP32[$106 >> 2] = $101;
    HEAP32[$109 >> 2] = $104;
    $R$3 = $101;
    break;
   } else _abort();
  } while (0);
  if ($99) {
   $127 = HEAP32[$3 + 28 >> 2] | 0;
   $128 = 1276 + ($127 << 2) | 0;
   if (($3 | 0) == (HEAP32[$128 >> 2] | 0)) {
    HEAP32[$128 >> 2] = $R$3;
    if (!$R$3) {
     HEAP32[244] = HEAP32[244] & ~(1 << $127);
     break;
    }
   } else {
    if ($99 >>> 0 < (HEAP32[247] | 0) >>> 0) _abort();
    $137 = $99 + 16 | 0;
    if ((HEAP32[$137 >> 2] | 0) == ($3 | 0)) HEAP32[$137 >> 2] = $R$3; else HEAP32[$99 + 20 >> 2] = $R$3;
    if (!$R$3) break;
   }
   $142 = HEAP32[247] | 0;
   if ($R$3 >>> 0 < $142 >>> 0) _abort();
   HEAP32[$R$3 + 24 >> 2] = $99;
   $145 = $3 + 16 | 0;
   $146 = HEAP32[$145 >> 2] | 0;
   do if ($146) if ($146 >>> 0 < $142 >>> 0) _abort(); else {
    HEAP32[$R$3 + 16 >> 2] = $146;
    HEAP32[$146 + 24 >> 2] = $R$3;
    break;
   } while (0);
   $152 = HEAP32[$145 + 4 >> 2] | 0;
   if ($152) if ($152 >>> 0 < (HEAP32[247] | 0) >>> 0) _abort(); else {
    HEAP32[$R$3 + 20 >> 2] = $152;
    HEAP32[$152 + 24 >> 2] = $R$3;
    break;
   }
  }
 } while (0);
 if ($73 >>> 0 < 16) {
  HEAP32[$0 >> 2] = $71 | $1 & 1 | 2;
  $163 = $p + $71 + 4 | 0;
  HEAP32[$163 >> 2] = HEAP32[$163 >> 2] | 1;
  $newp$2 = $p;
  return $newp$2 | 0;
 } else {
  $166 = $p + $nb | 0;
  HEAP32[$0 >> 2] = $1 & 1 | $nb | 2;
  HEAP32[$166 + 4 >> 2] = $73 | 3;
  $173 = $166 + $73 + 4 | 0;
  HEAP32[$173 >> 2] = HEAP32[$173 >> 2] | 1;
  _dispose_chunk($166, $73);
  $newp$2 = $p;
  return $newp$2 | 0;
 }
 return 0;
}

function _fmod($x, $y) {
 $x = +$x;
 $y = +$y;
 var $$0 = 0.0, $$lcssa7 = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $106 = 0, $107 = 0, $11 = 0, $112 = 0, $113 = 0, $115 = 0, $118 = 0, $12 = 0, $120 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $130 = 0, $137 = 0, $138 = 0, $139 = 0, $140 = 0, $141 = 0, $146 = 0, $149 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $16 = 0, $2 = 0, $23 = 0.0, $25 = 0, $26 = 0, $3 = 0, $37 = 0, $38 = 0, $4 = 0, $44 = 0, $45 = 0, $46 = 0, $55 = 0, $6 = 0, $60 = 0, $61 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $78 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $9 = 0, $93 = 0, $94 = 0, $96 = 0, $ex$0$lcssa = 0, $ex$026 = 0, $ex$1 = 0, $ex$2$lcssa = 0, $ex$212 = 0, $ex$3$lcssa = 0, $ex$39 = 0, $ey$0$lcssa = 0, $ey$020 = 0, $ey$1$ph = 0, label = 0;
 HEAPF64[tempDoublePtr >> 3] = $x;
 $0 = HEAP32[tempDoublePtr >> 2] | 0;
 $1 = HEAP32[tempDoublePtr + 4 >> 2] | 0;
 HEAPF64[tempDoublePtr >> 3] = $y;
 $2 = HEAP32[tempDoublePtr >> 2] | 0;
 $3 = HEAP32[tempDoublePtr + 4 >> 2] | 0;
 $4 = _bitshift64Lshr($0 | 0, $1 | 0, 52) | 0;
 $6 = $4 & 2047;
 $7 = _bitshift64Lshr($2 | 0, $3 | 0, 52) | 0;
 $9 = $7 & 2047;
 $10 = $1 & -2147483648;
 $11 = _bitshift64Shl($2 | 0, $3 | 0, 1) | 0;
 $12 = tempRet0;
 L1 : do if (($11 | 0) == 0 & ($12 | 0) == 0) label = 3; else {
  $16 = $3 & 2147483647;
  if ($16 >>> 0 > 2146435072 | ($16 | 0) == 2146435072 & $2 >>> 0 > 0 | ($6 | 0) == 2047) label = 3; else {
   $25 = _bitshift64Shl($0 | 0, $1 | 0, 1) | 0;
   $26 = tempRet0;
   if (!($26 >>> 0 > $12 >>> 0 | ($26 | 0) == ($12 | 0) & $25 >>> 0 > $11 >>> 0)) return +(($25 | 0) == ($11 | 0) & ($26 | 0) == ($12 | 0) ? $x * 0.0 : $x);
   if (!$6) {
    $37 = _bitshift64Shl($0 | 0, $1 | 0, 12) | 0;
    $38 = tempRet0;
    if (($38 | 0) > -1 | ($38 | 0) == -1 & $37 >>> 0 > 4294967295) {
     $45 = $37;
     $46 = $38;
     $ex$026 = 0;
     while (1) {
      $44 = $ex$026 + -1 | 0;
      $45 = _bitshift64Shl($45 | 0, $46 | 0, 1) | 0;
      $46 = tempRet0;
      if (!(($46 | 0) > -1 | ($46 | 0) == -1 & $45 >>> 0 > 4294967295)) {
       $ex$0$lcssa = $44;
       break;
      } else $ex$026 = $44;
     }
    } else $ex$0$lcssa = 0;
    $55 = _bitshift64Shl($0 | 0, $1 | 0, 1 - $ex$0$lcssa | 0) | 0;
    $83 = $55;
    $84 = tempRet0;
    $ex$1 = $ex$0$lcssa;
   } else {
    $83 = $0;
    $84 = $1 & 1048575 | 1048576;
    $ex$1 = $6;
   }
   if (!$9) {
    $60 = _bitshift64Shl($2 | 0, $3 | 0, 12) | 0;
    $61 = tempRet0;
    if (($61 | 0) > -1 | ($61 | 0) == -1 & $60 >>> 0 > 4294967295) {
     $68 = $60;
     $69 = $61;
     $ey$020 = 0;
     while (1) {
      $67 = $ey$020 + -1 | 0;
      $68 = _bitshift64Shl($68 | 0, $69 | 0, 1) | 0;
      $69 = tempRet0;
      if (!(($69 | 0) > -1 | ($69 | 0) == -1 & $68 >>> 0 > 4294967295)) {
       $ey$0$lcssa = $67;
       break;
      } else $ey$020 = $67;
     }
    } else $ey$0$lcssa = 0;
    $78 = _bitshift64Shl($2 | 0, $3 | 0, 1 - $ey$0$lcssa | 0) | 0;
    $85 = $78;
    $86 = tempRet0;
    $ey$1$ph = $ey$0$lcssa;
   } else {
    $85 = $2;
    $86 = $3 & 1048575 | 1048576;
    $ey$1$ph = $9;
   }
   $87 = _i64Subtract($83 | 0, $84 | 0, $85 | 0, $86 | 0) | 0;
   $88 = tempRet0;
   $93 = ($88 | 0) > -1 | ($88 | 0) == -1 & $87 >>> 0 > 4294967295;
   L23 : do if (($ex$1 | 0) > ($ey$1$ph | 0)) {
    $152 = $93;
    $153 = $87;
    $154 = $88;
    $94 = $83;
    $96 = $84;
    $ex$212 = $ex$1;
    while (1) {
     if ($152) if (($94 | 0) == ($85 | 0) & ($96 | 0) == ($86 | 0)) break; else {
      $100 = $153;
      $101 = $154;
     } else {
      $100 = $94;
      $101 = $96;
     }
     $102 = _bitshift64Shl($100 | 0, $101 | 0, 1) | 0;
     $103 = tempRet0;
     $104 = $ex$212 + -1 | 0;
     $106 = _i64Subtract($102 | 0, $103 | 0, $85 | 0, $86 | 0) | 0;
     $107 = tempRet0;
     $112 = ($107 | 0) > -1 | ($107 | 0) == -1 & $106 >>> 0 > 4294967295;
     if (($104 | 0) > ($ey$1$ph | 0)) {
      $152 = $112;
      $153 = $106;
      $154 = $107;
      $94 = $102;
      $96 = $103;
      $ex$212 = $104;
     } else {
      $$lcssa7 = $112;
      $113 = $102;
      $115 = $103;
      $155 = $106;
      $156 = $107;
      $ex$2$lcssa = $104;
      break L23;
     }
    }
    $$0 = $x * 0.0;
    break L1;
   } else {
    $$lcssa7 = $93;
    $113 = $83;
    $115 = $84;
    $155 = $87;
    $156 = $88;
    $ex$2$lcssa = $ex$1;
   } while (0);
   if ($$lcssa7) if (($113 | 0) == ($85 | 0) & ($115 | 0) == ($86 | 0)) {
    $$0 = $x * 0.0;
    break;
   } else {
    $118 = $156;
    $120 = $155;
   } else {
    $118 = $115;
    $120 = $113;
   }
   if ($118 >>> 0 < 1048576 | ($118 | 0) == 1048576 & $120 >>> 0 < 0) {
    $126 = $120;
    $127 = $118;
    $ex$39 = $ex$2$lcssa;
    while (1) {
     $128 = _bitshift64Shl($126 | 0, $127 | 0, 1) | 0;
     $129 = tempRet0;
     $130 = $ex$39 + -1 | 0;
     if ($129 >>> 0 < 1048576 | ($129 | 0) == 1048576 & $128 >>> 0 < 0) {
      $126 = $128;
      $127 = $129;
      $ex$39 = $130;
     } else {
      $137 = $128;
      $138 = $129;
      $ex$3$lcssa = $130;
      break;
     }
    }
   } else {
    $137 = $120;
    $138 = $118;
    $ex$3$lcssa = $ex$2$lcssa;
   }
   if (($ex$3$lcssa | 0) > 0) {
    $139 = _i64Add($137 | 0, $138 | 0, 0, -1048576) | 0;
    $140 = tempRet0;
    $141 = _bitshift64Shl($ex$3$lcssa | 0, 0, 52) | 0;
    $149 = $140 | tempRet0;
    $151 = $139 | $141;
   } else {
    $146 = _bitshift64Lshr($137 | 0, $138 | 0, 1 - $ex$3$lcssa | 0) | 0;
    $149 = tempRet0;
    $151 = $146;
   }
   HEAP32[tempDoublePtr >> 2] = $151;
   HEAP32[tempDoublePtr + 4 >> 2] = $149 | $10;
   $$0 = +HEAPF64[tempDoublePtr >> 3];
  }
 } while (0);
 if ((label | 0) == 3) {
  $23 = $x * $y;
  $$0 = $23 / $23;
 }
 return +$$0;
}

function _pipelineNew($cmds, $options) {
 $cmds = $cmds | 0;
 $options = $options | 0;
 var $0 = 0, $10 = 0, $14 = 0, $31 = 0, $35 = 0, $4 = 0, $41 = 0, $5 = 0, $51 = 0, $53 = 0, $56 = 0, $58 = 0, $64 = 0, $78 = 0, $79 = 0, $8 = 0, $cmdLen$0$lcssa$i$i = 0, $cmdLen$0$lcssa$i$i$3 = 0, $i$02$i = 0, $i$03$i$i = 0, $i$03$i$i$1 = 0, $i$11$i$i = 0, $i$11$i$i$5 = 0, $iCmd$010 = 0, $j$01$i = 0, $str$i = 0, $vararg_buffer = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16 | 0;
 $vararg_buffer = sp;
 $str$i = sp + 4 | 0;
 $0 = _needMem(36) | 0;
 HEAP32[$0 + 8 >> 2] = -1;
 HEAP32[$0 + 16 >> 2] = -1;
 HEAP32[$0 + 20 >> 2] = $options;
 $4 = _newDyString(512) | 0;
 HEAP32[$str$i >> 2] = $4;
 $5 = HEAP32[$cmds >> 2] | 0;
 if ($5) {
  $78 = $5;
  $8 = $cmds;
  $i$02$i = 0;
  do {
   if (($i$02$i | 0) > 0) {
    _dyStringAppend($4, 5091);
    $10 = HEAP32[$8 >> 2] | 0;
   } else $10 = $78;
   if (HEAP32[$10 >> 2] | 0) {
    $79 = $10;
    $j$01$i = 0;
    do {
     if (($j$01$i | 0) > 0) {
      _dyStringAppend($4, 4768);
      $14 = HEAP32[$8 >> 2] | 0;
     } else $14 = $79;
     _dyStringAppend($4, HEAP32[$14 + ($j$01$i << 2) >> 2] | 0);
     $j$01$i = $j$01$i + 1 | 0;
     $79 = HEAP32[$8 >> 2] | 0;
    } while ((HEAP32[$79 + ($j$01$i << 2) >> 2] | 0) != 0);
   }
   $i$02$i = $i$02$i + 1 | 0;
   $8 = $cmds + ($i$02$i << 2) | 0;
   $78 = HEAP32[$8 >> 2] | 0;
  } while (($78 | 0) != 0);
 }
 HEAP32[$0 + 12 >> 2] = _dyStringCannibalize($str$i) | 0;
 if (!(HEAP32[$cmds >> 2] | 0)) _errAbort(5095, $vararg_buffer);
 if ($options & 8) {
  $31 = _needMem(24) | 0;
  HEAP32[$31 + 4 >> 2] = $0;
  if (!(HEAP32[53] | 0)) $cmdLen$0$lcssa$i$i = 0; else {
   $i$03$i$i = 0;
   while (1) {
    $35 = $i$03$i$i + 1 | 0;
    if (!(HEAP32[212 + ($35 << 2) >> 2] | 0)) {
     $cmdLen$0$lcssa$i$i = $35;
     break;
    } else $i$03$i$i = $35;
   }
  }
  $41 = _needMem(($cmdLen$0$lcssa$i$i << 2) + 4 | 0) | 0;
  if (($cmdLen$0$lcssa$i$i | 0) > 0) {
   $i$11$i$i = 0;
   do {
    HEAP32[$41 + ($i$11$i$i << 2) >> 2] = _cloneString(HEAP32[212 + ($i$11$i$i << 2) >> 2] | 0) | 0;
    $i$11$i$i = $i$11$i$i + 1 | 0;
   } while (($i$11$i$i | 0) != ($cmdLen$0$lcssa$i$i | 0));
  }
  HEAP32[$41 + ($cmdLen$0$lcssa$i$i << 2) >> 2] = 0;
  HEAP32[$31 + 8 >> 2] = $41;
  HEAP32[$31 + 16 >> 2] = 0;
  _slAddTail($0, $31);
 }
 $51 = HEAP32[$cmds >> 2] | 0;
 if (!$51) {
  STACKTOP = sp;
  return $0 | 0;
 } else {
  $56 = $51;
  $iCmd$010 = 0;
 }
 do {
  $53 = _needMem(24) | 0;
  HEAP32[$53 + 4 >> 2] = $0;
  if (!(HEAP32[$56 >> 2] | 0)) $cmdLen$0$lcssa$i$i$3 = 0; else {
   $i$03$i$i$1 = 0;
   while (1) {
    $58 = $i$03$i$i$1 + 1 | 0;
    if (!(HEAP32[$56 + ($58 << 2) >> 2] | 0)) {
     $cmdLen$0$lcssa$i$i$3 = $58;
     break;
    } else $i$03$i$i$1 = $58;
   }
  }
  $64 = _needMem(($cmdLen$0$lcssa$i$i$3 << 2) + 4 | 0) | 0;
  if (($cmdLen$0$lcssa$i$i$3 | 0) > 0) {
   $i$11$i$i$5 = 0;
   do {
    HEAP32[$64 + ($i$11$i$i$5 << 2) >> 2] = _cloneString(HEAP32[$56 + ($i$11$i$i$5 << 2) >> 2] | 0) | 0;
    $i$11$i$i$5 = $i$11$i$i$5 + 1 | 0;
   } while (($i$11$i$i$5 | 0) != ($cmdLen$0$lcssa$i$i$3 | 0));
  }
  HEAP32[$64 + ($cmdLen$0$lcssa$i$i$3 << 2) >> 2] = 0;
  HEAP32[$53 + 8 >> 2] = $64;
  HEAP32[$53 + 16 >> 2] = 0;
  _slAddTail($0, $53);
  $iCmd$010 = $iCmd$010 + 1 | 0;
  $56 = HEAP32[$cmds + ($iCmd$010 << 2) >> 2] | 0;
 } while (($56 | 0) != 0);
 STACKTOP = sp;
 return $0 | 0;
}

function _scanexp($f, $pok) {
 $f = $f | 0;
 $pok = $pok | 0;
 var $$lcssa22 = 0, $0 = 0, $1 = 0, $11 = 0, $12 = 0, $2 = 0, $20 = 0, $35 = 0, $36 = 0, $48 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $59 = 0, $61 = 0, $62 = 0, $63 = 0, $78 = 0, $9 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $98 = 0, $99 = 0, $c$0 = 0, $c$1$be = 0, $c$1$be$lcssa = 0, $c$112 = 0, $c$2$be = 0, $c$2$lcssa = 0, $c$27 = 0, $c$3$be = 0, $neg$0 = 0, $x$013 = 0;
 $0 = $f + 4 | 0;
 $1 = HEAP32[$0 >> 2] | 0;
 $2 = $f + 100 | 0;
 if ($1 >>> 0 < (HEAP32[$2 >> 2] | 0) >>> 0) {
  HEAP32[$0 >> 2] = $1 + 1;
  $9 = HEAPU8[$1 >> 0] | 0;
 } else $9 = ___shgetc($f) | 0;
 switch ($9 | 0) {
 case 43:
 case 45:
  {
   $11 = ($9 | 0) == 45 & 1;
   $12 = HEAP32[$0 >> 2] | 0;
   if ($12 >>> 0 < (HEAP32[$2 >> 2] | 0) >>> 0) {
    HEAP32[$0 >> 2] = $12 + 1;
    $20 = HEAPU8[$12 >> 0] | 0;
   } else $20 = ___shgetc($f) | 0;
   if (($pok | 0) != 0 & ($20 + -48 | 0) >>> 0 > 9) if (!(HEAP32[$2 >> 2] | 0)) {
    $c$0 = $20;
    $neg$0 = $11;
   } else {
    HEAP32[$0 >> 2] = (HEAP32[$0 >> 2] | 0) + -1;
    $c$0 = $20;
    $neg$0 = $11;
   } else {
    $c$0 = $20;
    $neg$0 = $11;
   }
   break;
  }
 default:
  {
   $c$0 = $9;
   $neg$0 = 0;
  }
 }
 if (($c$0 + -48 | 0) >>> 0 > 9) if (!(HEAP32[$2 >> 2] | 0)) {
  $98 = -2147483648;
  $99 = 0;
 } else {
  HEAP32[$0 >> 2] = (HEAP32[$0 >> 2] | 0) + -1;
  $98 = -2147483648;
  $99 = 0;
 } else {
  $c$112 = $c$0;
  $x$013 = 0;
  while (1) {
   $35 = $c$112 + -48 + ($x$013 * 10 | 0) | 0;
   $36 = HEAP32[$0 >> 2] | 0;
   if ($36 >>> 0 < (HEAP32[$2 >> 2] | 0) >>> 0) {
    HEAP32[$0 >> 2] = $36 + 1;
    $c$1$be = HEAPU8[$36 >> 0] | 0;
   } else $c$1$be = ___shgetc($f) | 0;
   if (($c$1$be + -48 | 0) >>> 0 < 10 & ($35 | 0) < 214748364) {
    $c$112 = $c$1$be;
    $x$013 = $35;
   } else {
    $$lcssa22 = $35;
    $c$1$be$lcssa = $c$1$be;
    break;
   }
  }
  $48 = (($$lcssa22 | 0) < 0) << 31 >> 31;
  if (($c$1$be$lcssa + -48 | 0) >>> 0 < 10) {
   $53 = $$lcssa22;
   $54 = $48;
   $c$27 = $c$1$be$lcssa;
   while (1) {
    $55 = ___muldi3($53 | 0, $54 | 0, 10, 0) | 0;
    $56 = tempRet0;
    $59 = _i64Add($c$27 | 0, (($c$27 | 0) < 0) << 31 >> 31 | 0, -48, -1) | 0;
    $61 = _i64Add($59 | 0, tempRet0 | 0, $55 | 0, $56 | 0) | 0;
    $62 = tempRet0;
    $63 = HEAP32[$0 >> 2] | 0;
    if ($63 >>> 0 < (HEAP32[$2 >> 2] | 0) >>> 0) {
     HEAP32[$0 >> 2] = $63 + 1;
     $c$2$be = HEAPU8[$63 >> 0] | 0;
    } else $c$2$be = ___shgetc($f) | 0;
    if (($c$2$be + -48 | 0) >>> 0 < 10 & (($62 | 0) < 21474836 | ($62 | 0) == 21474836 & $61 >>> 0 < 2061584302)) {
     $53 = $61;
     $54 = $62;
     $c$27 = $c$2$be;
    } else {
     $92 = $61;
     $93 = $62;
     $c$2$lcssa = $c$2$be;
     break;
    }
   }
  } else {
   $92 = $$lcssa22;
   $93 = $48;
   $c$2$lcssa = $c$1$be$lcssa;
  }
  if (($c$2$lcssa + -48 | 0) >>> 0 < 10) do {
   $78 = HEAP32[$0 >> 2] | 0;
   if ($78 >>> 0 < (HEAP32[$2 >> 2] | 0) >>> 0) {
    HEAP32[$0 >> 2] = $78 + 1;
    $c$3$be = HEAPU8[$78 >> 0] | 0;
   } else $c$3$be = ___shgetc($f) | 0;
  } while (($c$3$be + -48 | 0) >>> 0 < 10);
  if (HEAP32[$2 >> 2] | 0) HEAP32[$0 >> 2] = (HEAP32[$0 >> 2] | 0) + -1;
  $91 = ($neg$0 | 0) != 0;
  $94 = _i64Subtract(0, 0, $92 | 0, $93 | 0) | 0;
  $98 = $91 ? tempRet0 : $93;
  $99 = $91 ? $94 : $92;
 }
 tempRet0 = $98;
 return $99 | 0;
}

function _pop_arg_424($arg, $type, $ap) {
 $arg = $arg | 0;
 $type = $type | 0;
 $ap = $ap | 0;
 var $105 = 0, $106 = 0.0, $112 = 0, $113 = 0.0, $13 = 0, $14 = 0, $17 = 0, $26 = 0, $27 = 0, $28 = 0, $37 = 0, $38 = 0, $40 = 0, $43 = 0, $44 = 0, $53 = 0, $54 = 0, $56 = 0, $59 = 0, $6 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $79 = 0, $80 = 0, $82 = 0, $85 = 0, $94 = 0, $95 = 0, $96 = 0;
 L1 : do if ($type >>> 0 <= 20) do switch ($type | 0) {
 case 9:
  {
   $6 = (HEAP32[$ap >> 2] | 0) + (4 - 1) & ~(4 - 1);
   $7 = HEAP32[$6 >> 2] | 0;
   HEAP32[$ap >> 2] = $6 + 4;
   HEAP32[$arg >> 2] = $7;
   break L1;
   break;
  }
 case 10:
  {
   $13 = (HEAP32[$ap >> 2] | 0) + (4 - 1) & ~(4 - 1);
   $14 = HEAP32[$13 >> 2] | 0;
   HEAP32[$ap >> 2] = $13 + 4;
   $17 = $arg;
   HEAP32[$17 >> 2] = $14;
   HEAP32[$17 + 4 >> 2] = (($14 | 0) < 0) << 31 >> 31;
   break L1;
   break;
  }
 case 11:
  {
   $26 = (HEAP32[$ap >> 2] | 0) + (4 - 1) & ~(4 - 1);
   $27 = HEAP32[$26 >> 2] | 0;
   HEAP32[$ap >> 2] = $26 + 4;
   $28 = $arg;
   HEAP32[$28 >> 2] = $27;
   HEAP32[$28 + 4 >> 2] = 0;
   break L1;
   break;
  }
 case 12:
  {
   $37 = (HEAP32[$ap >> 2] | 0) + (8 - 1) & ~(8 - 1);
   $38 = $37;
   $40 = HEAP32[$38 >> 2] | 0;
   $43 = HEAP32[$38 + 4 >> 2] | 0;
   HEAP32[$ap >> 2] = $37 + 8;
   $44 = $arg;
   HEAP32[$44 >> 2] = $40;
   HEAP32[$44 + 4 >> 2] = $43;
   break L1;
   break;
  }
 case 13:
  {
   $53 = (HEAP32[$ap >> 2] | 0) + (4 - 1) & ~(4 - 1);
   $54 = HEAP32[$53 >> 2] | 0;
   HEAP32[$ap >> 2] = $53 + 4;
   $56 = ($54 & 65535) << 16 >> 16;
   $59 = $arg;
   HEAP32[$59 >> 2] = $56;
   HEAP32[$59 + 4 >> 2] = (($56 | 0) < 0) << 31 >> 31;
   break L1;
   break;
  }
 case 14:
  {
   $68 = (HEAP32[$ap >> 2] | 0) + (4 - 1) & ~(4 - 1);
   $69 = HEAP32[$68 >> 2] | 0;
   HEAP32[$ap >> 2] = $68 + 4;
   $70 = $arg;
   HEAP32[$70 >> 2] = $69 & 65535;
   HEAP32[$70 + 4 >> 2] = 0;
   break L1;
   break;
  }
 case 15:
  {
   $79 = (HEAP32[$ap >> 2] | 0) + (4 - 1) & ~(4 - 1);
   $80 = HEAP32[$79 >> 2] | 0;
   HEAP32[$ap >> 2] = $79 + 4;
   $82 = ($80 & 255) << 24 >> 24;
   $85 = $arg;
   HEAP32[$85 >> 2] = $82;
   HEAP32[$85 + 4 >> 2] = (($82 | 0) < 0) << 31 >> 31;
   break L1;
   break;
  }
 case 16:
  {
   $94 = (HEAP32[$ap >> 2] | 0) + (4 - 1) & ~(4 - 1);
   $95 = HEAP32[$94 >> 2] | 0;
   HEAP32[$ap >> 2] = $94 + 4;
   $96 = $arg;
   HEAP32[$96 >> 2] = $95 & 255;
   HEAP32[$96 + 4 >> 2] = 0;
   break L1;
   break;
  }
 case 17:
  {
   $105 = (HEAP32[$ap >> 2] | 0) + (8 - 1) & ~(8 - 1);
   $106 = +HEAPF64[$105 >> 3];
   HEAP32[$ap >> 2] = $105 + 8;
   HEAPF64[$arg >> 3] = $106;
   break L1;
   break;
  }
 case 18:
  {
   $112 = (HEAP32[$ap >> 2] | 0) + (8 - 1) & ~(8 - 1);
   $113 = +HEAPF64[$112 >> 3];
   HEAP32[$ap >> 2] = $112 + 8;
   HEAPF64[$arg >> 3] = $113;
   break L1;
   break;
  }
 default:
  break L1;
 } while (0); while (0);
 return;
}

function _chopByWhite($in, $outArray, $outSize) {
 $in = $in | 0;
 $outArray = $outArray | 0;
 $outSize = $outSize | 0;
 var $$08$us = 0, $$08$us$15 = 0, $$1$us = 0, $$1$us$17 = 0, $$1$us$17$lcssa = 0, $$1$us$lcssa = 0, $$23$us = 0, $$23$us$19 = 0, $$23$us$19$lcssa = 0, $$23$us$lcssa = 0, $$not = 0, $$pre = 0, $0 = 0, $10 = 0, $13 = 0, $27 = 0, $30 = 0, $38 = 0, $recordCount$07$us = 0, $recordCount$07$us$16 = 0, $recordCount$1 = 0, label = 0;
 $0 = ($outArray | 0) != 0;
 $$not = $0 ^ 1;
 if (!(($outSize | 0) > 0 | $$not)) {
  $recordCount$1 = 0;
  return $recordCount$1 | 0;
 }
 if ($0) {
  $$08$us = $in;
  $recordCount$07$us = 0;
 } else {
  $$08$us$15 = $in;
  $recordCount$07$us$16 = 0;
  L5 : while (1) {
   $$1$us$17 = $$08$us$15;
   while (1) if (!(_isspace(HEAP8[$$1$us$17 >> 0] | 0) | 0)) {
    $$1$us$17$lcssa = $$1$us$17;
    break;
   } else $$1$us$17 = $$1$us$17 + 1 | 0;
   $27 = HEAP8[$$1$us$17$lcssa >> 0] | 0;
   if (!($27 << 24 >> 24)) {
    $recordCount$1 = $recordCount$07$us$16;
    label = 18;
    break;
   }
   $38 = $recordCount$07$us$16 + 1 | 0;
   $$23$us$19 = $$1$us$17$lcssa;
   $30 = $27;
   while (1) {
    if (_isspace($30 << 24 >> 24) | 0) {
     $$23$us$19$lcssa = $$23$us$19;
     break;
    }
    $$23$us$19 = $$23$us$19 + 1 | 0;
    $30 = HEAP8[$$23$us$19 >> 0] | 0;
    if (!($30 << 24 >> 24)) {
     $recordCount$1 = $38;
     label = 18;
     break L5;
    }
   }
   if (!(HEAP8[$$23$us$19$lcssa >> 0] | 0)) {
    $recordCount$1 = $38;
    label = 18;
    break;
   } else {
    $$08$us$15 = $$23$us$19$lcssa + 1 | 0;
    $recordCount$07$us$16 = $38;
   }
  }
  if ((label | 0) == 18) return $recordCount$1 | 0;
 }
 L19 : while (1) {
  $$1$us = $$08$us;
  while (1) if (!(_isspace(HEAP8[$$1$us >> 0] | 0) | 0)) {
   $$1$us$lcssa = $$1$us;
   break;
  } else $$1$us = $$1$us + 1 | 0;
  if (!(HEAP8[$$1$us$lcssa >> 0] | 0)) {
   $recordCount$1 = $recordCount$07$us;
   label = 18;
   break;
  }
  HEAP32[$outArray + ($recordCount$07$us << 2) >> 2] = $$1$us$lcssa;
  $$pre = HEAP8[$$1$us$lcssa >> 0] | 0;
  $10 = $recordCount$07$us + 1 | 0;
  if (!($$pre << 24 >> 24)) {
   $recordCount$1 = $10;
   label = 18;
   break;
  } else {
   $$23$us = $$1$us$lcssa;
   $13 = $$pre;
  }
  while (1) {
   if (_isspace($13 << 24 >> 24) | 0) {
    $$23$us$lcssa = $$23$us;
    break;
   }
   $$23$us = $$23$us + 1 | 0;
   $13 = HEAP8[$$23$us >> 0] | 0;
   if (!($13 << 24 >> 24)) {
    $recordCount$1 = $10;
    label = 18;
    break L19;
   }
  }
  if (!(HEAP8[$$23$us$lcssa >> 0] | 0)) {
   $recordCount$1 = $10;
   label = 18;
   break;
  }
  HEAP8[$$23$us$lcssa >> 0] = 0;
  if (($10 | 0) < ($outSize | 0) | $$not) {
   $$08$us = $$23$us$lcssa + 1 | 0;
   $recordCount$07$us = $10;
  } else {
   $recordCount$1 = $10;
   label = 18;
   break;
  }
 }
 if ((label | 0) == 18) return $recordCount$1 | 0;
 return 0;
}

function ___stdio_write($f, $buf, $len) {
 $f = $f | 0;
 $buf = $buf | 0;
 $len = $len | 0;
 var $$0 = 0, $0 = 0, $1 = 0, $10 = 0, $15 = 0, $20 = 0, $25 = 0, $3 = 0, $34 = 0, $36 = 0, $38 = 0, $49 = 0, $5 = 0, $9 = 0, $cnt$0 = 0, $cnt$1 = 0, $iov$0 = 0, $iov$0$lcssa11 = 0, $iov$1 = 0, $iovcnt$0 = 0, $iovcnt$0$lcssa12 = 0, $iovcnt$1 = 0, $iovs = 0, $rem$0 = 0, $vararg_buffer = 0, $vararg_buffer3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48 | 0;
 $vararg_buffer3 = sp + 16 | 0;
 $vararg_buffer = sp;
 $iovs = sp + 32 | 0;
 $0 = $f + 28 | 0;
 $1 = HEAP32[$0 >> 2] | 0;
 HEAP32[$iovs >> 2] = $1;
 $3 = $f + 20 | 0;
 $5 = (HEAP32[$3 >> 2] | 0) - $1 | 0;
 HEAP32[$iovs + 4 >> 2] = $5;
 HEAP32[$iovs + 8 >> 2] = $buf;
 HEAP32[$iovs + 12 >> 2] = $len;
 $9 = $f + 60 | 0;
 $10 = $f + 44 | 0;
 $iov$0 = $iovs;
 $iovcnt$0 = 2;
 $rem$0 = $5 + $len | 0;
 while (1) {
  if (!(HEAP32[110] | 0)) {
   HEAP32[$vararg_buffer3 >> 2] = HEAP32[$9 >> 2];
   HEAP32[$vararg_buffer3 + 4 >> 2] = $iov$0;
   HEAP32[$vararg_buffer3 + 8 >> 2] = $iovcnt$0;
   $cnt$0 = ___syscall_ret(___syscall146(146, $vararg_buffer3 | 0) | 0) | 0;
  } else {
   _pthread_cleanup_push(2, $f | 0);
   HEAP32[$vararg_buffer >> 2] = HEAP32[$9 >> 2];
   HEAP32[$vararg_buffer + 4 >> 2] = $iov$0;
   HEAP32[$vararg_buffer + 8 >> 2] = $iovcnt$0;
   $15 = ___syscall_ret(___syscall146(146, $vararg_buffer | 0) | 0) | 0;
   _pthread_cleanup_pop(0);
   $cnt$0 = $15;
  }
  if (($rem$0 | 0) == ($cnt$0 | 0)) {
   label = 6;
   break;
  }
  if (($cnt$0 | 0) < 0) {
   $iov$0$lcssa11 = $iov$0;
   $iovcnt$0$lcssa12 = $iovcnt$0;
   label = 8;
   break;
  }
  $34 = $rem$0 - $cnt$0 | 0;
  $36 = HEAP32[$iov$0 + 4 >> 2] | 0;
  if ($cnt$0 >>> 0 > $36 >>> 0) {
   $38 = HEAP32[$10 >> 2] | 0;
   HEAP32[$0 >> 2] = $38;
   HEAP32[$3 >> 2] = $38;
   $49 = HEAP32[$iov$0 + 12 >> 2] | 0;
   $cnt$1 = $cnt$0 - $36 | 0;
   $iov$1 = $iov$0 + 8 | 0;
   $iovcnt$1 = $iovcnt$0 + -1 | 0;
  } else if (($iovcnt$0 | 0) == 2) {
   HEAP32[$0 >> 2] = (HEAP32[$0 >> 2] | 0) + $cnt$0;
   $49 = $36;
   $cnt$1 = $cnt$0;
   $iov$1 = $iov$0;
   $iovcnt$1 = 2;
  } else {
   $49 = $36;
   $cnt$1 = $cnt$0;
   $iov$1 = $iov$0;
   $iovcnt$1 = $iovcnt$0;
  }
  HEAP32[$iov$1 >> 2] = (HEAP32[$iov$1 >> 2] | 0) + $cnt$1;
  HEAP32[$iov$1 + 4 >> 2] = $49 - $cnt$1;
  $iov$0 = $iov$1;
  $iovcnt$0 = $iovcnt$1;
  $rem$0 = $34;
 }
 if ((label | 0) == 6) {
  $20 = HEAP32[$10 >> 2] | 0;
  HEAP32[$f + 16 >> 2] = $20 + (HEAP32[$f + 48 >> 2] | 0);
  $25 = $20;
  HEAP32[$0 >> 2] = $25;
  HEAP32[$3 >> 2] = $25;
  $$0 = $len;
 } else if ((label | 0) == 8) {
  HEAP32[$f + 16 >> 2] = 0;
  HEAP32[$0 >> 2] = 0;
  HEAP32[$3 >> 2] = 0;
  HEAP32[$f >> 2] = HEAP32[$f >> 2] | 32;
  if (($iovcnt$0$lcssa12 | 0) == 2) $$0 = 0; else $$0 = $len - (HEAP32[$iov$0$lcssa11 + 4 >> 2] | 0) | 0;
 }
 STACKTOP = sp;
 return $$0 | 0;
}

function _memchr($src, $c, $n) {
 $src = $src | 0;
 $c = $c | 0;
 $n = $n | 0;
 var $$0$lcssa = 0, $$0$lcssa44 = 0, $$019 = 0, $$1$lcssa = 0, $$110 = 0, $$110$lcssa = 0, $$24 = 0, $$3 = 0, $$lcssa = 0, $0 = 0, $13 = 0, $15 = 0, $17 = 0, $20 = 0, $26 = 0, $27 = 0, $32 = 0, $4 = 0, $5 = 0, $8 = 0, $9 = 0, $s$0$lcssa = 0, $s$0$lcssa43 = 0, $s$020 = 0, $s$15 = 0, $s$2 = 0, $w$0$lcssa = 0, $w$011 = 0, $w$011$lcssa = 0, label = 0;
 $0 = $c & 255;
 $4 = ($n | 0) != 0;
 L1 : do if ($4 & ($src & 3 | 0) != 0) {
  $5 = $c & 255;
  $$019 = $n;
  $s$020 = $src;
  while (1) {
   if ((HEAP8[$s$020 >> 0] | 0) == $5 << 24 >> 24) {
    $$0$lcssa44 = $$019;
    $s$0$lcssa43 = $s$020;
    label = 6;
    break L1;
   }
   $8 = $s$020 + 1 | 0;
   $9 = $$019 + -1 | 0;
   $13 = ($9 | 0) != 0;
   if ($13 & ($8 & 3 | 0) != 0) {
    $$019 = $9;
    $s$020 = $8;
   } else {
    $$0$lcssa = $9;
    $$lcssa = $13;
    $s$0$lcssa = $8;
    label = 5;
    break;
   }
  }
 } else {
  $$0$lcssa = $n;
  $$lcssa = $4;
  $s$0$lcssa = $src;
  label = 5;
 } while (0);
 if ((label | 0) == 5) if ($$lcssa) {
  $$0$lcssa44 = $$0$lcssa;
  $s$0$lcssa43 = $s$0$lcssa;
  label = 6;
 } else {
  $$3 = 0;
  $s$2 = $s$0$lcssa;
 }
 L8 : do if ((label | 0) == 6) {
  $15 = $c & 255;
  if ((HEAP8[$s$0$lcssa43 >> 0] | 0) == $15 << 24 >> 24) {
   $$3 = $$0$lcssa44;
   $s$2 = $s$0$lcssa43;
  } else {
   $17 = Math_imul($0, 16843009) | 0;
   L11 : do if ($$0$lcssa44 >>> 0 > 3) {
    $$110 = $$0$lcssa44;
    $w$011 = $s$0$lcssa43;
    while (1) {
     $20 = HEAP32[$w$011 >> 2] ^ $17;
     if (($20 & -2139062144 ^ -2139062144) & $20 + -16843009) {
      $$110$lcssa = $$110;
      $w$011$lcssa = $w$011;
      break;
     }
     $26 = $w$011 + 4 | 0;
     $27 = $$110 + -4 | 0;
     if ($27 >>> 0 > 3) {
      $$110 = $27;
      $w$011 = $26;
     } else {
      $$1$lcssa = $27;
      $w$0$lcssa = $26;
      label = 11;
      break L11;
     }
    }
    $$24 = $$110$lcssa;
    $s$15 = $w$011$lcssa;
   } else {
    $$1$lcssa = $$0$lcssa44;
    $w$0$lcssa = $s$0$lcssa43;
    label = 11;
   } while (0);
   if ((label | 0) == 11) if (!$$1$lcssa) {
    $$3 = 0;
    $s$2 = $w$0$lcssa;
    break;
   } else {
    $$24 = $$1$lcssa;
    $s$15 = $w$0$lcssa;
   }
   while (1) {
    if ((HEAP8[$s$15 >> 0] | 0) == $15 << 24 >> 24) {
     $$3 = $$24;
     $s$2 = $s$15;
     break L8;
    }
    $32 = $s$15 + 1 | 0;
    $$24 = $$24 + -1 | 0;
    if (!$$24) {
     $$3 = 0;
     $s$2 = $32;
     break;
    } else $s$15 = $32;
   }
  }
 } while (0);
 return (($$3 | 0) != 0 ? $s$2 : 0) | 0;
}

function ___fdopen($fd, $mode) {
 $fd = $fd | 0;
 $mode = $mode | 0;
 var $$0 = 0, $0 = 0, $12 = 0, $14 = 0, $19 = 0, $24 = 0, $26 = 0, $37 = 0, $4 = 0, $tio = 0, $vararg_buffer = 0, $vararg_buffer12 = 0, $vararg_buffer3 = 0, $vararg_buffer7 = 0, dest = 0, sp = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 112 | 0;
 $vararg_buffer12 = sp + 40 | 0;
 $vararg_buffer7 = sp + 24 | 0;
 $vararg_buffer3 = sp + 16 | 0;
 $vararg_buffer = sp;
 $tio = sp + 52 | 0;
 $0 = HEAP8[$mode >> 0] | 0;
 if (!(_memchr(5125, $0 << 24 >> 24, 4) | 0)) {
  HEAP32[(___errno_location() | 0) >> 2] = 22;
  $$0 = 0;
 } else {
  $4 = _malloc(1144) | 0;
  if (!$4) $$0 = 0; else {
   dest = $4;
   stop = dest + 112 | 0;
   do {
    HEAP32[dest >> 2] = 0;
    dest = dest + 4 | 0;
   } while ((dest | 0) < (stop | 0));
   if (!(_strchr($mode, 43) | 0)) HEAP32[$4 >> 2] = $0 << 24 >> 24 == 114 ? 8 : 4;
   if (!(_strchr($mode, 101) | 0)) $12 = $0; else {
    HEAP32[$vararg_buffer >> 2] = $fd;
    HEAP32[$vararg_buffer + 4 >> 2] = 2;
    HEAP32[$vararg_buffer + 8 >> 2] = 1;
    ___syscall221(221, $vararg_buffer | 0) | 0;
    $12 = HEAP8[$mode >> 0] | 0;
   }
   if ($12 << 24 >> 24 == 97) {
    HEAP32[$vararg_buffer3 >> 2] = $fd;
    HEAP32[$vararg_buffer3 + 4 >> 2] = 3;
    $14 = ___syscall221(221, $vararg_buffer3 | 0) | 0;
    if (!($14 & 1024)) {
     HEAP32[$vararg_buffer7 >> 2] = $fd;
     HEAP32[$vararg_buffer7 + 4 >> 2] = 4;
     HEAP32[$vararg_buffer7 + 8 >> 2] = $14 | 1024;
     ___syscall221(221, $vararg_buffer7 | 0) | 0;
    }
    $19 = HEAP32[$4 >> 2] | 128;
    HEAP32[$4 >> 2] = $19;
    $26 = $19;
   } else $26 = HEAP32[$4 >> 2] | 0;
   HEAP32[$4 + 60 >> 2] = $fd;
   HEAP32[$4 + 44 >> 2] = $4 + 120;
   HEAP32[$4 + 48 >> 2] = 1024;
   $24 = $4 + 75 | 0;
   HEAP8[$24 >> 0] = -1;
   if (!($26 & 8)) {
    HEAP32[$vararg_buffer12 >> 2] = $fd;
    HEAP32[$vararg_buffer12 + 4 >> 2] = 21505;
    HEAP32[$vararg_buffer12 + 8 >> 2] = $tio;
    if (!(___syscall54(54, $vararg_buffer12 | 0) | 0)) HEAP8[$24 >> 0] = 10;
   }
   HEAP32[$4 + 32 >> 2] = 5;
   HEAP32[$4 + 36 >> 2] = 4;
   HEAP32[$4 + 40 >> 2] = 3;
   HEAP32[$4 + 12 >> 2] = 2;
   if (!(HEAP32[111] | 0)) HEAP32[$4 + 76 >> 2] = -1;
   ___lock(468);
   $37 = HEAP32[116] | 0;
   HEAP32[$4 + 56 >> 2] = $37;
   if ($37) HEAP32[$37 + 52 >> 2] = $4;
   HEAP32[116] = $4;
   ___unlock(468);
   $$0 = $4;
  }
 }
 STACKTOP = sp;
 return $$0 | 0;
}

function _wigToBedGraph($wigIn, $bedOut) {
 $wigIn = $wigIn | 0;
 $bedOut = $bedOut | 0;
 var $$pre$phi$iZ2D = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $14 = 0, $2 = 0, $22 = 0, $23 = 0, $26 = 0, $31 = 0, $32 = 0, $35 = 0, $37 = 0, $39 = 0.0, $9 = 0, $f = 0, $line = 0, $out = 0, $vararg_buffer = 0, $vararg_buffer3 = 0, $vars = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 64 | 0;
 $vararg_buffer3 = sp + 16 | 0;
 $vararg_buffer = sp;
 $f = sp + 52 | 0;
 $out = sp + 48 | 0;
 $line = sp + 44 | 0;
 $vars = sp + 40 | 0;
 $0 = _lineFileOpen($wigIn, 1) | 0;
 $1 = _mustOpen($bedOut, 1842) | 0;
 HEAP32[$f >> 2] = $1;
 $2 = _needMem(32) | 0;
 HEAP32[$2 + 4 >> 2] = $1;
 HEAP32[$2 + 12 >> 2] = 64;
 HEAP32[$2 + 8 >> 2] = _needMem(64) | 0;
 HEAP32[$out >> 2] = $2;
 do if (!(_lineFileNextReal($0, $line) | 0)) $26 = $2; else {
  $9 = $0 + 28 | 0;
  $10 = $0 + 4 | 0;
  while (1) {
   $11 = _nextWord($line) | 0;
   $14 = _hashVarLine(HEAP32[$line >> 2] | 0, HEAP32[$9 >> 2] | 0) | 0;
   HEAP32[$vars >> 2] = $14;
   if (!(_strcmp(1844, $11) | 0)) _convertFixedStepSection($0, $14, HEAP32[$out >> 2] | 0); else {
    if (_strcmp(1854, $11) | 0) {
     label = 7;
     break;
    }
    _convertVariableStepSection($0, $14, HEAP32[$out >> 2] | 0);
   }
   _freeHashAndVals($vars);
   if (!(_lineFileNextReal($0, $line) | 0)) {
    label = 9;
    break;
   }
  }
  if ((label | 0) == 7) {
   $22 = HEAP32[$10 >> 2] | 0;
   $23 = HEAP32[$line >> 2] | 0;
   HEAP32[$vararg_buffer >> 2] = HEAP32[$9 >> 2];
   HEAP32[$vararg_buffer + 4 >> 2] = $22;
   HEAP32[$vararg_buffer + 8 >> 2] = $23;
   _errAbort(1867, $vararg_buffer);
  } else if ((label | 0) == 9) {
   $26 = HEAP32[$out >> 2] | 0;
   break;
  }
 } while (0);
 if (!$26) {
  _carefulClose($f);
  STACKTOP = sp;
  return;
 }
 if (!(HEAP32[$26 >> 2] | 0)) $$pre$phi$iZ2D = $26 + 8 | 0; else {
  $31 = HEAP32[$26 + 4 >> 2] | 0;
  $32 = $26 + 8 | 0;
  $35 = HEAP32[$26 + 16 >> 2] | 0;
  $37 = HEAP32[$26 + 20 >> 2] | 0;
  $39 = +HEAPF64[$26 + 24 >> 3];
  HEAP32[$vararg_buffer3 >> 2] = HEAP32[$32 >> 2];
  HEAP32[$vararg_buffer3 + 4 >> 2] = $35;
  HEAP32[$vararg_buffer3 + 8 >> 2] = $37;
  HEAPF64[$vararg_buffer3 + 16 >> 3] = $39;
  _fprintf($31, 1726, $vararg_buffer3) | 0;
  HEAP32[$26 >> 2] = 0;
  $$pre$phi$iZ2D = $32;
 }
 _freeMem(HEAP32[$$pre$phi$iZ2D >> 2] | 0);
 _freez($out);
 _carefulClose($f);
 STACKTOP = sp;
 return;
}

function _pipelineOpen($cmds, $opts, $otherEndFile, $stderrFile) {
 $cmds = $cmds | 0;
 $opts = $opts | 0;
 $otherEndFile = $otherEndFile | 0;
 $stderrFile = $stderrFile | 0;
 var $0 = 0, $1 = 0, $13 = 0, $15 = 0, $16 = 0, $8 = 0, $9 = 0, $storemerge$ph = 0, $vararg_buffer = 0, $vararg_buffer1 = 0, $vararg_buffer10 = 0, $vararg_buffer13 = 0, $vararg_buffer16 = 0, $vararg_buffer19 = 0, $vararg_buffer22 = 0, $vararg_buffer4 = 0, $vararg_buffer6 = 0, $vararg_buffer8 = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 80 | 0;
 $vararg_buffer22 = sp + 72 | 0;
 $vararg_buffer19 = sp + 64 | 0;
 $vararg_buffer16 = sp + 56 | 0;
 $vararg_buffer13 = sp + 48 | 0;
 $vararg_buffer10 = sp + 40 | 0;
 $vararg_buffer8 = sp + 32 | 0;
 $vararg_buffer6 = sp + 24 | 0;
 $vararg_buffer4 = sp + 16 | 0;
 $vararg_buffer1 = sp + 8 | 0;
 $vararg_buffer = sp;
 $0 = ($stderrFile | 0) == 0;
 if ($0) $15 = 2; else {
  HEAP32[$vararg_buffer >> 2] = 438;
  $1 = _open($stderrFile, 577, $vararg_buffer) | 0;
  if (($1 | 0) < 0) {
   HEAP32[$vararg_buffer1 >> 2] = $stderrFile;
   _errnoAbort(4427, $vararg_buffer1);
  } else $15 = $1;
 }
 switch ($opts & 3 | 0) {
 case 3:
 case 0:
  {
   _errAbort(4258, $vararg_buffer4);
   break;
  }
 default:
  {}
 }
 if (($opts & 18 | 0) == 16) _errAbort(4324, $vararg_buffer6);
 $8 = ($otherEndFile | 0) == 0;
 if (!($opts & 1)) if ($8) $storemerge$ph = 1; else {
  HEAP32[$vararg_buffer13 >> 2] = 438;
  $13 = _open($otherEndFile, ($opts << 5 & 512) + 577 | 0, $vararg_buffer13) | 0;
  if (($13 | 0) < 0) {
   HEAP32[$vararg_buffer16 >> 2] = $otherEndFile;
   _errnoAbort(4427, $vararg_buffer16);
  } else $storemerge$ph = $13;
 } else if ($8) $storemerge$ph = 0; else {
  $9 = _open($otherEndFile, 0, $vararg_buffer8) | 0;
  if (($9 | 0) < 0) {
   HEAP32[$vararg_buffer10 >> 2] = $otherEndFile;
   _errnoAbort(4459, $vararg_buffer10);
  } else $storemerge$ph = $9;
 }
 $16 = _pipelineOpenFd($cmds, $opts, $storemerge$ph, $15) | 0;
 if ((_close($storemerge$ph) | 0) < 0) {
  HEAP32[$vararg_buffer19 >> 2] = $storemerge$ph;
  _errnoAbort(4405, $vararg_buffer19);
 }
 if ($0 | ($15 | 0) == -1) {
  STACKTOP = sp;
  return $16 | 0;
 }
 if ((_close($15) | 0) < 0) {
  HEAP32[$vararg_buffer22 >> 2] = $15;
  _errnoAbort(4405, $vararg_buffer22);
 } else {
  STACKTOP = sp;
  return $16 | 0;
 }
 return 0;
}

function _mbrtowc($wc, $src, $n, $st) {
 $wc = $wc | 0;
 $src = $src | 0;
 $n = $n | 0;
 $st = $st | 0;
 var $$0 = 0, $$024 = 0, $$1 = 0, $$lcssa = 0, $$lcssa35 = 0, $$st = 0, $1 = 0, $12 = 0, $16 = 0, $17 = 0, $19 = 0, $21 = 0, $30 = 0, $7 = 0, $8 = 0, $c$05 = 0, $c$1 = 0, $c$2 = 0, $dummy = 0, $dummy$wc = 0, $s$06 = 0, $s$1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16 | 0;
 $dummy = sp;
 $$st = ($st | 0) == 0 ? 600 : $st;
 $1 = HEAP32[$$st >> 2] | 0;
 L1 : do if (!$src) if (!$1) $$0 = 0; else label = 15; else {
  $dummy$wc = ($wc | 0) == 0 ? $dummy : $wc;
  if (!$n) $$0 = -2; else {
   if (!$1) {
    $7 = HEAP8[$src >> 0] | 0;
    $8 = $7 & 255;
    if ($7 << 24 >> 24 > -1) {
     HEAP32[$dummy$wc >> 2] = $8;
     $$0 = $7 << 24 >> 24 != 0 & 1;
     break;
    }
    $12 = $8 + -194 | 0;
    if ($12 >>> 0 > 50) {
     label = 15;
     break;
    }
    $16 = HEAP32[236 + ($12 << 2) >> 2] | 0;
    $17 = $n + -1 | 0;
    if (!$17) $c$2 = $16; else {
     $$024 = $17;
     $c$05 = $16;
     $s$06 = $src + 1 | 0;
     label = 9;
    }
   } else {
    $$024 = $n;
    $c$05 = $1;
    $s$06 = $src;
    label = 9;
   }
   L11 : do if ((label | 0) == 9) {
    $19 = HEAP8[$s$06 >> 0] | 0;
    $21 = ($19 & 255) >>> 3;
    if (($21 + -16 | $21 + ($c$05 >> 26)) >>> 0 > 7) {
     label = 15;
     break L1;
    } else {
     $$1 = $$024;
     $30 = $19;
     $c$1 = $c$05;
     $s$1 = $s$06;
    }
    while (1) {
     $s$1 = $s$1 + 1 | 0;
     $c$1 = ($30 & 255) + -128 | $c$1 << 6;
     $$1 = $$1 + -1 | 0;
     if (($c$1 | 0) >= 0) {
      $$lcssa = $c$1;
      $$lcssa35 = $$1;
      break;
     }
     if (!$$1) {
      $c$2 = $c$1;
      break L11;
     }
     $30 = HEAP8[$s$1 >> 0] | 0;
     if (($30 & -64) << 24 >> 24 != -128) {
      label = 15;
      break L1;
     }
    }
    HEAP32[$$st >> 2] = 0;
    HEAP32[$dummy$wc >> 2] = $$lcssa;
    $$0 = $n - $$lcssa35 | 0;
    break L1;
   } while (0);
   HEAP32[$$st >> 2] = $c$2;
   $$0 = -2;
  }
 } while (0);
 if ((label | 0) == 15) {
  HEAP32[$$st >> 2] = 0;
  HEAP32[(___errno_location() | 0) >> 2] = 84;
  $$0 = -1;
 }
 STACKTOP = sp;
 return $$0 | 0;
}

function ___stpcpy($d, $s) {
 $d = $d | 0;
 $s = $s | 0;
 var $$0$lcssa = 0, $$01$lcssa = 0, $$0115 = 0, $$016 = 0, $$03 = 0, $$1$ph = 0, $$12$ph = 0, $$128 = 0, $$19 = 0, $0 = 0, $10 = 0, $14 = 0, $20 = 0, $21 = 0, $22 = 0, $29 = 0, $32 = 0, $33 = 0, $7 = 0, $9 = 0, $wd$0$lcssa = 0, $wd$010 = 0, $ws$0$lcssa = 0, $ws$011 = 0, label = 0;
 $0 = $s;
 L1 : do if (!(($0 ^ $d) & 3)) {
  if (!($0 & 3)) {
   $$0$lcssa = $s;
   $$01$lcssa = $d;
  } else {
   $$0115 = $d;
   $$016 = $s;
   while (1) {
    $7 = HEAP8[$$016 >> 0] | 0;
    HEAP8[$$0115 >> 0] = $7;
    if (!($7 << 24 >> 24)) {
     $$03 = $$0115;
     break L1;
    }
    $9 = $$016 + 1 | 0;
    $10 = $$0115 + 1 | 0;
    if (!($9 & 3)) {
     $$0$lcssa = $9;
     $$01$lcssa = $10;
     break;
    } else {
     $$0115 = $10;
     $$016 = $9;
    }
   }
  }
  $14 = HEAP32[$$0$lcssa >> 2] | 0;
  if (!(($14 & -2139062144 ^ -2139062144) & $14 + -16843009)) {
   $22 = $14;
   $wd$010 = $$01$lcssa;
   $ws$011 = $$0$lcssa;
   while (1) {
    $20 = $ws$011 + 4 | 0;
    $21 = $wd$010 + 4 | 0;
    HEAP32[$wd$010 >> 2] = $22;
    $22 = HEAP32[$20 >> 2] | 0;
    if (($22 & -2139062144 ^ -2139062144) & $22 + -16843009) {
     $wd$0$lcssa = $21;
     $ws$0$lcssa = $20;
     break;
    } else {
     $wd$010 = $21;
     $ws$011 = $20;
    }
   }
  } else {
   $wd$0$lcssa = $$01$lcssa;
   $ws$0$lcssa = $$0$lcssa;
  }
  $$1$ph = $ws$0$lcssa;
  $$12$ph = $wd$0$lcssa;
  label = 8;
 } else {
  $$1$ph = $s;
  $$12$ph = $d;
  label = 8;
 } while (0);
 if ((label | 0) == 8) {
  $29 = HEAP8[$$1$ph >> 0] | 0;
  HEAP8[$$12$ph >> 0] = $29;
  if (!($29 << 24 >> 24)) $$03 = $$12$ph; else {
   $$128 = $$12$ph;
   $$19 = $$1$ph;
   while (1) {
    $$19 = $$19 + 1 | 0;
    $32 = $$128 + 1 | 0;
    $33 = HEAP8[$$19 >> 0] | 0;
    HEAP8[$32 >> 0] = $33;
    if (!($33 << 24 >> 24)) {
     $$03 = $32;
     break;
    } else $$128 = $32;
   }
  }
 }
 return $$03 | 0;
}

function _hashResize($hash, $powerOfTwoSize) {
 $hash = $hash | 0;
 $powerOfTwoSize = $powerOfTwoSize | 0;
 var $$1 = 0, $$powerOfTwoSize = 0, $0 = 0, $1 = 0, $10 = 0, $12 = 0, $16 = 0, $19 = 0, $2 = 0, $21 = 0, $27 = 0, $3 = 0, $32 = 0, $33 = 0, $39 = 0, $40 = 0, $43 = 0, $6 = 0, $hel$03 = 0, $i$07 = 0, $i$12 = 0, $hel$03$looptemp = 0;
 $0 = $hash + 16 | 0;
 $1 = HEAP32[$0 >> 2] | 0;
 $2 = $hash + 8 | 0;
 $3 = HEAP32[$2 >> 2] | 0;
 $$powerOfTwoSize = ($powerOfTwoSize | 0) == 0 ? 12 : $powerOfTwoSize;
 $$1 = ($$powerOfTwoSize | 0) > 28 ? 28 : $$powerOfTwoSize;
 $6 = $hash + 12 | 0;
 if ((HEAP32[$6 >> 2] | 0) == ($$1 | 0)) return;
 if (($$1 + -1 | 0) >>> 0 >= 28) ___assert_fail(3919, 3971, 388, 3983);
 HEAP32[$6 >> 2] = $$1;
 $10 = 1 << $$1;
 HEAP32[$0 >> 2] = $10;
 $12 = $hash + 4 | 0;
 HEAP32[$12 >> 2] = $10 + -1;
 HEAP32[$2 >> 2] = _needLargeZeroedMem($10 << 2) | 0;
 if (($1 | 0) > 0) {
  $i$07 = 0;
  do {
   $19 = HEAP32[$3 + ($i$07 << 2) >> 2] | 0;
   if ($19) {
    $21 = HEAP32[$12 >> 2] | 0;
    $hel$03 = $19;
    do {
     $hel$03$looptemp = $hel$03;
     $hel$03 = HEAP32[$hel$03 >> 2] | 0;
     $27 = (HEAP32[$2 >> 2] | 0) + (($21 & HEAP32[$hel$03$looptemp + 12 >> 2]) << 2) | 0;
     HEAP32[$hel$03$looptemp >> 2] = HEAP32[$27 >> 2];
     HEAP32[$27 >> 2] = $hel$03$looptemp;
    } while (($hel$03 | 0) != 0);
   }
   $i$07 = $i$07 + 1 | 0;
  } while (($i$07 | 0) != ($1 | 0));
 }
 $16 = HEAP32[$0 >> 2] | 0;
 if (($16 | 0) > 0) {
  $43 = $16;
  $i$12 = 0;
  while (1) {
   $32 = (HEAP32[$2 >> 2] | 0) + ($i$12 << 2) | 0;
   $33 = HEAP32[$32 >> 2] | 0;
   if (!$33) $39 = $43; else if (!(HEAP32[$33 >> 2] | 0)) $39 = $43; else {
    _slReverse($32);
    $39 = HEAP32[$0 >> 2] | 0;
   }
   $i$12 = $i$12 + 1 | 0;
   if (($i$12 | 0) >= ($39 | 0)) break; else $43 = $39;
  }
 }
 _freeMem($3);
 $40 = $hash + 36 | 0;
 HEAP32[$40 >> 2] = (HEAP32[$40 >> 2] | 0) + 1;
 return;
}

function _convertFixedStepSection($lf, $vars, $out) {
 $lf = $lf | 0;
 $vars = $vars | 0;
 $out = $out | 0;
 var $0 = 0, $11 = 0, $12 = 0, $13 = 0, $15 = 0, $16 = 0, $18 = 0, $23 = 0, $3 = 0, $5 = 0, $6 = 0, $9 = 0, $defaultVal$$i = 0, $line = 0, $start$03 = 0, $vararg_buffer = 0, $vararg_buffer3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32 | 0;
 $vararg_buffer3 = sp + 16 | 0;
 $vararg_buffer = sp;
 $line = sp + 28 | 0;
 $0 = _hashFindVal($vars, 1774) | 0;
 if (!$0) {
  $3 = HEAP32[$lf + 28 >> 2] | 0;
  $5 = HEAP32[$lf + 4 >> 2] | 0;
  HEAP32[$vararg_buffer >> 2] = 1774;
  HEAP32[$vararg_buffer + 4 >> 2] = $3;
  HEAP32[$vararg_buffer + 8 >> 2] = $5;
  _errAbort(1739, $vararg_buffer);
 }
 $6 = _hashFindVal($vars, 1780) | 0;
 if (!$6) {
  $9 = HEAP32[$lf + 28 >> 2] | 0;
  $11 = HEAP32[$lf + 4 >> 2] | 0;
  HEAP32[$vararg_buffer3 >> 2] = 1780;
  HEAP32[$vararg_buffer3 + 4 >> 2] = $9;
  HEAP32[$vararg_buffer3 + 8 >> 2] = $11;
  _errAbort(1739, $vararg_buffer3);
 }
 $12 = _sqlUnsigned($6) | 0;
 $13 = _hashFindVal($vars, 1786) | 0;
 $defaultVal$$i = ($13 | 0) == 0 ? 1791 : $13;
 $15 = _sqlUnsigned($defaultVal$$i) | 0;
 $16 = _hashFindVal($vars, 1793) | 0;
 $18 = _sqlUnsigned(($16 | 0) == 0 ? $defaultVal$$i : $16) | 0;
 if (!(_lineFileNextReal($lf, $line) | 0)) {
  STACKTOP = sp;
  return;
 }
 $start$03 = $12 + -1 | 0;
 while (1) {
  $23 = _skipLeadingSpaces(HEAP32[$line >> 2] | 0) | 0;
  HEAP32[$line >> 2] = $23;
  if (_isalpha(HEAP8[$23 >> 0] | 0) | 0) break;
  _eraseTrailingSpaces(HEAP32[$line >> 2] | 0);
  _bgOutWrite($out, $0, $start$03, $start$03 + $15 | 0, +_sqlDouble(HEAP32[$line >> 2] | 0));
  if (!(_lineFileNextReal($lf, $line) | 0)) {
   label = 10;
   break;
  } else $start$03 = $start$03 + $18 | 0;
 }
 if ((label | 0) == 10) {
  STACKTOP = sp;
  return;
 }
 _lineFileReuse($lf);
 STACKTOP = sp;
 return;
}

function _bitFindClear($b, $startIx, $bitCount) {
 $b = $b | 0;
 $startIx = $startIx | 0;
 $bitCount = $bitCount | 0;
 var $$0$i = 0, $$lcssa$i = 0, $1 = 0, $10 = 0, $14 = 0, $18 = 0, $2 = 0, $23 = 0, $5 = 0, $7 = 0, $iBit$0$lcssa$i = 0, $iBit$015$i = 0, $iBit$1$ph$i = 0, $iBit$16$i = 0, $iByte$0$lcssa$i = 0, $iByte$09$i = 0, label = 0;
 $1 = $bitCount + -1 >> 3;
 $2 = $startIx & 7;
 $5 = $startIx >> 3;
 L1 : do if (($startIx | 0) < ($bitCount | 0) & ($2 | 0) != 0) {
  $10 = $2;
  $7 = $5;
  $iBit$015$i = $startIx;
  while (1) {
   if (!((HEAP8[4234 + $10 >> 0] & HEAP8[$b + $7 >> 0]) << 24 >> 24)) {
    $$0$i = $iBit$015$i;
    break;
   }
   $14 = $iBit$015$i + 1 | 0;
   $10 = $14 & 7;
   $18 = $14 >> 3;
   if (!(($14 | 0) < ($bitCount | 0) & ($10 | 0) != 0)) {
    $$lcssa$i = $18;
    $iBit$0$lcssa$i = $14;
    break L1;
   } else {
    $7 = $18;
    $iBit$015$i = $14;
   }
  }
  return $$0$i | 0;
 } else {
  $$lcssa$i = $5;
  $iBit$0$lcssa$i = $startIx;
 } while (0);
 if (($$lcssa$i | 0) < ($1 | 0)) {
  $iByte$09$i = $$lcssa$i;
  while (1) {
   if ((HEAP8[$b + $iByte$09$i >> 0] | 0) != -1) {
    $iByte$0$lcssa$i = $iByte$09$i;
    break;
   }
   $23 = $iByte$09$i + 1 | 0;
   if (($23 | 0) < ($1 | 0)) $iByte$09$i = $23; else {
    $iByte$0$lcssa$i = $23;
    break;
   }
  }
  $iBit$1$ph$i = $iByte$0$lcssa$i << 3;
 } else $iBit$1$ph$i = $iBit$0$lcssa$i;
 if (($iBit$1$ph$i | 0) < ($bitCount | 0)) $iBit$16$i = $iBit$1$ph$i; else {
  $$0$i = $bitCount;
  return $$0$i | 0;
 }
 while (1) {
  if (!((HEAP8[4234 + ($iBit$16$i & 7) >> 0] & HEAP8[$b + ($iBit$16$i >> 3) >> 0]) << 24 >> 24)) {
   $$0$i = $iBit$16$i;
   label = 11;
   break;
  }
  $iBit$16$i = $iBit$16$i + 1 | 0;
  if (($iBit$16$i | 0) >= ($bitCount | 0)) {
   $$0$i = $bitCount;
   label = 11;
   break;
  }
 }
 if ((label | 0) == 11) return $$0$i | 0;
 return 0;
}

function _vfprintf($f, $fmt, $ap) {
 $f = $f | 0;
 $fmt = $fmt | 0;
 $ap = $ap | 0;
 var $$ = 0, $$0 = 0, $12 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $21 = 0, $22 = 0, $28 = 0, $32 = 0, $6 = 0, $7 = 0, $ap2 = 0, $internal_buf = 0, $nl_arg = 0, $nl_type = 0, $ret$1 = 0, dest = 0, sp = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 224 | 0;
 $ap2 = sp + 120 | 0;
 $nl_type = sp + 80 | 0;
 $nl_arg = sp;
 $internal_buf = sp + 136 | 0;
 dest = $nl_type;
 stop = dest + 40 | 0;
 do {
  HEAP32[dest >> 2] = 0;
  dest = dest + 4 | 0;
 } while ((dest | 0) < (stop | 0));
 HEAP32[$ap2 >> 2] = HEAP32[$ap >> 2];
 if ((_printf_core(0, $fmt, $ap2, $nl_arg, $nl_type) | 0) < 0) $$0 = -1; else {
  if ((HEAP32[$f + 76 >> 2] | 0) > -1) $32 = ___lockfile($f) | 0; else $32 = 0;
  $6 = HEAP32[$f >> 2] | 0;
  $7 = $6 & 32;
  if ((HEAP8[$f + 74 >> 0] | 0) < 1) HEAP32[$f >> 2] = $6 & -33;
  $12 = $f + 48 | 0;
  if (!(HEAP32[$12 >> 2] | 0)) {
   $16 = $f + 44 | 0;
   $17 = HEAP32[$16 >> 2] | 0;
   HEAP32[$16 >> 2] = $internal_buf;
   $18 = $f + 28 | 0;
   HEAP32[$18 >> 2] = $internal_buf;
   $19 = $f + 20 | 0;
   HEAP32[$19 >> 2] = $internal_buf;
   HEAP32[$12 >> 2] = 80;
   $21 = $f + 16 | 0;
   HEAP32[$21 >> 2] = $internal_buf + 80;
   $22 = _printf_core($f, $fmt, $ap2, $nl_arg, $nl_type) | 0;
   if (!$17) $ret$1 = $22; else {
    FUNCTION_TABLE_iiii[HEAP32[$f + 36 >> 2] & 7]($f, 0, 0) | 0;
    $$ = (HEAP32[$19 >> 2] | 0) == 0 ? -1 : $22;
    HEAP32[$16 >> 2] = $17;
    HEAP32[$12 >> 2] = 0;
    HEAP32[$21 >> 2] = 0;
    HEAP32[$18 >> 2] = 0;
    HEAP32[$19 >> 2] = 0;
    $ret$1 = $$;
   }
  } else $ret$1 = _printf_core($f, $fmt, $ap2, $nl_arg, $nl_type) | 0;
  $28 = HEAP32[$f >> 2] | 0;
  HEAP32[$f >> 2] = $28 | $7;
  if ($32) ___unlockfile($f);
  $$0 = ($28 & 32 | 0) == 0 ? $ret$1 : -1;
 }
 STACKTOP = sp;
 return $$0 | 0;
}

function _bitFindSet($b, $startIx, $bitCount) {
 $b = $b | 0;
 $startIx = $startIx | 0;
 $bitCount = $bitCount | 0;
 var $$0$i = 0, $$lcssa$i = 0, $1 = 0, $10 = 0, $14 = 0, $18 = 0, $2 = 0, $23 = 0, $5 = 0, $7 = 0, $iBit$0$lcssa$i = 0, $iBit$015$i = 0, $iBit$1$ph$i = 0, $iBit$16$i = 0, $iByte$0$lcssa$i = 0, $iByte$09$i = 0, label = 0;
 $1 = $bitCount + -1 >> 3;
 $2 = $startIx & 7;
 $5 = $startIx >> 3;
 L1 : do if (($startIx | 0) < ($bitCount | 0) & ($2 | 0) != 0) {
  $10 = $2;
  $7 = $5;
  $iBit$015$i = $startIx;
  while (1) {
   if ((HEAP8[4234 + $10 >> 0] & HEAP8[$b + $7 >> 0]) << 24 >> 24) {
    $$0$i = $iBit$015$i;
    break;
   }
   $14 = $iBit$015$i + 1 | 0;
   $10 = $14 & 7;
   $18 = $14 >> 3;
   if (!(($14 | 0) < ($bitCount | 0) & ($10 | 0) != 0)) {
    $$lcssa$i = $18;
    $iBit$0$lcssa$i = $14;
    break L1;
   } else {
    $7 = $18;
    $iBit$015$i = $14;
   }
  }
  return $$0$i | 0;
 } else {
  $$lcssa$i = $5;
  $iBit$0$lcssa$i = $startIx;
 } while (0);
 if (($$lcssa$i | 0) < ($1 | 0)) {
  $iByte$09$i = $$lcssa$i;
  while (1) {
   if (HEAP8[$b + $iByte$09$i >> 0] | 0) {
    $iByte$0$lcssa$i = $iByte$09$i;
    break;
   }
   $23 = $iByte$09$i + 1 | 0;
   if (($23 | 0) < ($1 | 0)) $iByte$09$i = $23; else {
    $iByte$0$lcssa$i = $23;
    break;
   }
  }
  $iBit$1$ph$i = $iByte$0$lcssa$i << 3;
 } else $iBit$1$ph$i = $iBit$0$lcssa$i;
 if (($iBit$1$ph$i | 0) < ($bitCount | 0)) $iBit$16$i = $iBit$1$ph$i; else {
  $$0$i = $bitCount;
  return $$0$i | 0;
 }
 while (1) {
  if ((HEAP8[4234 + ($iBit$16$i & 7) >> 0] & HEAP8[$b + ($iBit$16$i >> 3) >> 0]) << 24 >> 24) {
   $$0$i = $iBit$16$i;
   label = 11;
   break;
  }
  $iBit$16$i = $iBit$16$i + 1 | 0;
  if (($iBit$16$i | 0) >= ($bitCount | 0)) {
   $$0$i = $bitCount;
   label = 11;
   break;
  }
 }
 if ((label | 0) == 11) return $$0$i | 0;
 return 0;
}

function ___stdio_read($f, $buf, $len) {
 $f = $f | 0;
 $buf = $buf | 0;
 $len = $len | 0;
 var $$0 = 0, $$cast = 0, $0 = 0, $1 = 0, $15 = 0, $2 = 0, $27 = 0, $30 = 0, $31 = 0, $7 = 0, $cnt$0 = 0, $iov = 0, $vararg_buffer = 0, $vararg_buffer3 = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48 | 0;
 $vararg_buffer3 = sp + 16 | 0;
 $vararg_buffer = sp;
 $iov = sp + 32 | 0;
 HEAP32[$iov >> 2] = $buf;
 $0 = $iov + 4 | 0;
 $1 = $f + 48 | 0;
 $2 = HEAP32[$1 >> 2] | 0;
 HEAP32[$0 >> 2] = $len - (($2 | 0) != 0 & 1);
 $7 = $f + 44 | 0;
 HEAP32[$iov + 8 >> 2] = HEAP32[$7 >> 2];
 HEAP32[$iov + 12 >> 2] = $2;
 if (!(HEAP32[110] | 0)) {
  HEAP32[$vararg_buffer3 >> 2] = HEAP32[$f + 60 >> 2];
  HEAP32[$vararg_buffer3 + 4 >> 2] = $iov;
  HEAP32[$vararg_buffer3 + 8 >> 2] = 2;
  $cnt$0 = ___syscall_ret(___syscall145(145, $vararg_buffer3 | 0) | 0) | 0;
 } else {
  _pthread_cleanup_push(3, $f | 0);
  HEAP32[$vararg_buffer >> 2] = HEAP32[$f + 60 >> 2];
  HEAP32[$vararg_buffer + 4 >> 2] = $iov;
  HEAP32[$vararg_buffer + 8 >> 2] = 2;
  $15 = ___syscall_ret(___syscall145(145, $vararg_buffer | 0) | 0) | 0;
  _pthread_cleanup_pop(0);
  $cnt$0 = $15;
 }
 if (($cnt$0 | 0) < 1) {
  HEAP32[$f >> 2] = HEAP32[$f >> 2] | $cnt$0 & 48 ^ 16;
  HEAP32[$f + 8 >> 2] = 0;
  HEAP32[$f + 4 >> 2] = 0;
  $$0 = $cnt$0;
 } else {
  $27 = HEAP32[$0 >> 2] | 0;
  if ($cnt$0 >>> 0 > $27 >>> 0) {
   $30 = HEAP32[$7 >> 2] | 0;
   $31 = $f + 4 | 0;
   HEAP32[$31 >> 2] = $30;
   $$cast = $30;
   HEAP32[$f + 8 >> 2] = $$cast + ($cnt$0 - $27);
   if (!(HEAP32[$1 >> 2] | 0)) $$0 = $len; else {
    HEAP32[$31 >> 2] = $$cast + 1;
    HEAP8[$buf + ($len + -1) >> 0] = HEAP8[$$cast >> 0] | 0;
    $$0 = $len;
   }
  } else $$0 = $cnt$0;
 }
 STACKTOP = sp;
 return $$0 | 0;
}

function _convertVariableStepSection($lf, $vars, $out) {
 $lf = $lf | 0;
 $vars = $vars | 0;
 $out = $out | 0;
 var $0 = 0, $11 = 0, $12 = 0, $14 = 0, $23 = 0, $25 = 0, $3 = 0, $5 = 0, $6 = 0, $8 = 0, $line = 0, $vararg_buffer = 0, $vararg_buffer3 = 0, $words = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48 | 0;
 $vararg_buffer3 = sp + 16 | 0;
 $vararg_buffer = sp;
 $line = sp + 36 | 0;
 $words = sp + 24 | 0;
 $0 = _hashFindVal($vars, 1774) | 0;
 if (!$0) {
  $3 = HEAP32[$lf + 28 >> 2] | 0;
  $5 = HEAP32[$lf + 4 >> 2] | 0;
  HEAP32[$vararg_buffer >> 2] = 1774;
  HEAP32[$vararg_buffer + 4 >> 2] = $3;
  HEAP32[$vararg_buffer + 8 >> 2] = $5;
  _errAbort(1739, $vararg_buffer);
 }
 $6 = _hashFindVal($vars, 1786) | 0;
 $8 = _sqlUnsigned(($6 | 0) == 0 ? 1791 : $6) | 0;
 if (!(_lineFileNextReal($lf, $line) | 0)) {
  STACKTOP = sp;
  return;
 }
 $11 = $lf + 28 | 0;
 $12 = $lf + 4 | 0;
 while (1) {
  $14 = _skipLeadingSpaces(HEAP32[$line >> 2] | 0) | 0;
  HEAP32[$line >> 2] = $14;
  if (_isalpha(HEAP8[$14 >> 0] | 0) | 0) {
   label = 6;
   break;
  }
  if ((_chopByWhite(HEAP32[$line >> 2] | 0, $words, 3) | 0) != 2) {
   label = 8;
   break;
  }
  $25 = (_lineFileNeedNum($lf, $words, 0) | 0) + -1 | 0;
  _bgOutWrite($out, $0, $25, $25 + $8 | 0, +_lineFileNeedDouble($lf, $words, 1));
  if (!(_lineFileNextReal($lf, $line) | 0)) {
   label = 10;
   break;
  }
 }
 if ((label | 0) == 6) {
  _lineFileReuse($lf);
  STACKTOP = sp;
  return;
 } else if ((label | 0) == 8) {
  $23 = HEAP32[$12 >> 2] | 0;
  HEAP32[$vararg_buffer3 >> 2] = HEAP32[$11 >> 2];
  HEAP32[$vararg_buffer3 + 4 >> 2] = $23;
  _errAbort(1798, $vararg_buffer3);
 } else if ((label | 0) == 10) {
  STACKTOP = sp;
  return;
 }
}

function _pipelineOpenFd($cmds, $opts, $otherEndFd, $stderrFd) {
 $cmds = $cmds | 0;
 $opts = $opts | 0;
 $otherEndFd = $otherEndFd | 0;
 $stderrFd = $stderrFd | 0;
 var $20 = 0, $3 = 0, $9 = 0, $pipeFds$i$i = 0, $vararg_buffer1 = 0, $vararg_buffer3 = 0, $vararg_buffer5 = 0, $vararg_buffer7 = 0, $vararg_buffer9 = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 64 | 0;
 $vararg_buffer9 = sp + 40 | 0;
 $vararg_buffer7 = sp + 32 | 0;
 $vararg_buffer5 = sp + 24 | 0;
 $vararg_buffer3 = sp + 16 | 0;
 $vararg_buffer1 = sp + 8 | 0;
 $pipeFds$i$i = sp + 48 | 0;
 switch ($opts & 3 | 0) {
 case 3:
 case 0:
  {
   _errAbort(4258, sp);
   break;
  }
 default:
  {}
 }
 if (($opts & 18 | 0) == 16) _errAbort(4324, $vararg_buffer1);
 $3 = _pipelineNew($cmds, $opts) | 0;
 if (!($opts & 1)) {
  if ((_pipe($pipeFds$i$i) | 0) < 0) _errnoAbort(4387, $vararg_buffer7);
  HEAP32[$3 + 16 >> 2] = HEAP32[$pipeFds$i$i + 4 >> 2];
  $20 = HEAP32[$pipeFds$i$i >> 2] | 0;
  _pipelineExec($3, $20, $otherEndFd, $stderrFd, 0, 0);
  if (($20 | 0) == -1) {
   STACKTOP = sp;
   return $3 | 0;
  }
  if ((_close($20) | 0) < 0) {
   HEAP32[$vararg_buffer9 >> 2] = $20;
   _errnoAbort(4405, $vararg_buffer9);
  } else {
   STACKTOP = sp;
   return $3 | 0;
  }
 } else {
  if ((_pipe($pipeFds$i$i) | 0) < 0) _errnoAbort(4387, $vararg_buffer3);
  $9 = HEAP32[$pipeFds$i$i + 4 >> 2] | 0;
  HEAP32[$3 + 16 >> 2] = HEAP32[$pipeFds$i$i >> 2];
  _pipelineExec($3, $otherEndFd, $9, $stderrFd, 0, 0);
  if (($9 | 0) == -1) {
   STACKTOP = sp;
   return $3 | 0;
  }
  if ((_close($9) | 0) < 0) {
   HEAP32[$vararg_buffer5 >> 2] = $9;
   _errnoAbort(4405, $vararg_buffer5);
  } else {
   STACKTOP = sp;
   return $3 | 0;
  }
 }
 return 0;
}

function _hashAddN($hash, $name, $nameSize, $val) {
 $hash = $hash | 0;
 $name = $name | 0;
 $nameSize = $nameSize | 0;
 $val = $val | 0;
 var $0 = 0, $1 = 0, $11 = 0, $17 = 0, $18 = 0, $21 = 0, $28 = 0, $30 = 0, $31 = 0, $37 = 0, $5 = 0, $8 = 0, $el$0$in = 0, $keyStr$02$i = 0, $result$0$lcssa$i = 0, $result$01$i = 0;
 $0 = $hash + 20 | 0;
 $1 = HEAP32[$0 >> 2] | 0;
 if (!$1) $el$0$in = _needMem(16) | 0; else $el$0$in = _lmAlloc($1, 16) | 0;
 $5 = HEAP8[$name >> 0] | 0;
 if (!($5 << 24 >> 24)) $result$0$lcssa$i = 0; else {
  $8 = $5;
  $keyStr$02$i = $name;
  $result$01$i = 0;
  while (1) {
   $keyStr$02$i = $keyStr$02$i + 1 | 0;
   $11 = ($result$01$i * 9 | 0) + ($8 << 24 >> 24) | 0;
   $8 = HEAP8[$keyStr$02$i >> 0] | 0;
   if (!($8 << 24 >> 24)) {
    $result$0$lcssa$i = $11;
    break;
   } else $result$01$i = $11;
  }
 }
 HEAP32[$el$0$in + 12 >> 2] = $result$0$lcssa$i;
 $17 = HEAP32[$hash + 4 >> 2] & $result$0$lcssa$i;
 $18 = HEAP32[$0 >> 2] | 0;
 if (!$18) HEAP32[$el$0$in + 4 >> 2] = _cloneStringZ($name, $nameSize) | 0; else {
  $21 = _lmAlloc($18, $nameSize + 1 | 0) | 0;
  HEAP32[$el$0$in + 4 >> 2] = $21;
  _memcpy($21 | 0, $name | 0, $nameSize | 0) | 0;
 }
 HEAP32[$el$0$in + 8 >> 2] = $val;
 $28 = (HEAP32[$hash + 8 >> 2] | 0) + ($17 << 2) | 0;
 HEAP32[$el$0$in >> 2] = HEAP32[$28 >> 2];
 HEAP32[$28 >> 2] = $el$0$in;
 $30 = $hash + 24 | 0;
 $31 = HEAP32[$30 >> 2] | 0;
 HEAP32[$30 >> 2] = $31 + 1;
 if (!(HEAP32[$hash + 28 >> 2] | 0)) return $el$0$in | 0;
 $37 = HEAP32[$hash + 16 >> 2] | 0;
 if (($31 | 0) < (~~(+($37 | 0) * +HEAPF32[$hash + 32 >> 2]) | 0)) return $el$0$in | 0;
 _hashResize($hash, _digitsBaseTwo($37) | 0);
 return $el$0$in | 0;
}

function _bgOutWrite($out, $chrom, $start, $end, $val) {
 $out = $out | 0;
 $chrom = $chrom | 0;
 $start = $start | 0;
 $end = $end | 0;
 $val = +$val;
 var $15 = 0, $19 = 0, $21 = 0, $23 = 0.0, $25 = 0, $26 = 0, $29 = 0, $3 = 0, $31 = 0, $32 = 0, $4 = 0, $vararg_buffer = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32 | 0;
 $vararg_buffer = sp;
 $3 = (HEAP32[$out >> 2] | 0) == 0;
 if (!(HEAP32[2] | 0)) {
  if (!$3) {
   $4 = $out + 20 | 0;
   if ((HEAP32[$4 >> 2] | 0) == ($start | 0)) if (+HEAPF64[$out + 24 >> 3] != $val) label = 7; else if (!(_strcmp($chrom, HEAP32[$out + 8 >> 2] | 0) | 0)) {
    HEAP32[$4 >> 2] = $end;
    STACKTOP = sp;
    return;
   } else label = 7; else label = 7;
  }
 } else if (!$3) label = 7;
 if ((label | 0) == 7) {
  $15 = HEAP32[$out + 4 >> 2] | 0;
  $19 = HEAP32[$out + 16 >> 2] | 0;
  $21 = HEAP32[$out + 20 >> 2] | 0;
  $23 = +HEAPF64[$out + 24 >> 3];
  HEAP32[$vararg_buffer >> 2] = HEAP32[$out + 8 >> 2];
  HEAP32[$vararg_buffer + 4 >> 2] = $19;
  HEAP32[$vararg_buffer + 8 >> 2] = $21;
  HEAPF64[$vararg_buffer + 16 >> 3] = $23;
  _fprintf($15, 1726, $vararg_buffer) | 0;
  HEAP32[$out >> 2] = 0;
 }
 $25 = (_strlen($chrom) | 0) + 1 | 0;
 $26 = $out + 12 | 0;
 if (($25 | 0) > (HEAP32[$26 >> 2] | 0)) {
  HEAP32[$26 >> 2] = $25;
  $29 = $out + 8 | 0;
  $31 = _needMoreMem(HEAP32[$29 >> 2] | 0, 0, $25) | 0;
  HEAP32[$29 >> 2] = $31;
  $32 = $31;
 } else $32 = HEAP32[$out + 8 >> 2] | 0;
 _strcpy($32, $chrom) | 0;
 HEAP32[$out + 16 >> 2] = $start;
 HEAP32[$out + 20 >> 2] = $end;
 HEAPF64[$out + 24 >> 3] = $val;
 HEAP32[$out >> 2] = 1;
 STACKTOP = sp;
 return;
}

function _plProcSetup($proc, $stdinFd, $stdoutFd, $stderrFd) {
 $proc = $proc | 0;
 $stdinFd = $stdinFd | 0;
 $stdoutFd = $stdoutFd | 0;
 $stderrFd = $stderrFd | 0;
 var $$$i = 0, $0 = 0, $15 = 0, $18 = 0, $28 = 0, $9 = 0, $fd$01$i = 0, $vararg_buffer1 = 0, $vararg_buffer4 = 0, $vararg_buffer6 = 0, $vararg_buffer8 = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48 | 0;
 $vararg_buffer8 = sp + 32 | 0;
 $vararg_buffer6 = sp + 24 | 0;
 $vararg_buffer4 = sp + 16 | 0;
 $vararg_buffer1 = sp + 8 | 0;
 $0 = $proc + 4 | 0;
 if ((_signal(13, ((HEAP32[(HEAP32[$0 >> 2] | 0) + 20 >> 2] & 32 | 0) != 0 ? 0 : 1) | 0) | 0) == (-1 | 0)) _errnoAbort(4979, sp);
 $9 = _getpid() | 0;
 if (_setpgid($9, HEAP32[(HEAP32[$0 >> 2] | 0) + 8 >> 2] | 0) | 0) {
  $15 = _getpid() | 0;
  $18 = HEAP32[(HEAP32[$0 >> 2] | 0) + 8 >> 2] | 0;
  HEAP32[$vararg_buffer1 >> 2] = $15;
  HEAP32[$vararg_buffer1 + 4 >> 2] = $18;
  _errnoAbort(5002, $vararg_buffer1);
 }
 if ($stdinFd) if ((_dup2($stdinFd, 0) | 0) < 0) _errnoAbort(5029, $vararg_buffer4);
 if (($stdoutFd | 0) != 1) if ((_dup2($stdoutFd, 1) | 0) < 0) _errnoAbort(5049, $vararg_buffer6);
 if (($stderrFd | 0) != 2) if ((_dup2($stderrFd, 2) | 0) < 0) _errnoAbort(5070, $vararg_buffer8);
 $28 = _sysconf(4) | 0;
 $$$i = ($28 | 0) < 0 ? 4096 : $28;
 if (($$$i | 0) > 3) $fd$01$i = 3; else {
  STACKTOP = sp;
  return;
 }
 do {
  _close($fd$01$i) | 0;
  $fd$01$i = $fd$01$i + 1 | 0;
 } while (($fd$01$i | 0) != ($$$i | 0));
 STACKTOP = sp;
 return;
}

function _udcReadLine($file) {
 $file = $file | 0;
 var $$2 = 0, $1 = 0, $11 = 0, $13 = 0, $2 = 0, $3 = 0, $8 = 0, $9 = 0, $buf$0 = 0, $buf$1 = 0, $buf$1$lcssa14 = 0, $bufSize$0 = 0, $bufSize$1 = 0, $c = 0, $i$0 = 0, $longBuf$0 = 0, $longBuf$1 = 0, $longBuf$1$lcssa15 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16 | 0;
 $c = sp;
 $buf$0 = sp + 2 | 0;
 $bufSize$0 = 2;
 $i$0 = 0;
 $longBuf$0 = 0;
 while (1) {
  if (($i$0 | 0) < ($bufSize$0 | 0)) {
   $buf$1 = $buf$0;
   $bufSize$1 = $bufSize$0;
   $longBuf$1 = $longBuf$0;
  } else {
   $1 = $bufSize$0 << 1;
   $2 = _needLargeMem($1) | 0;
   _memcpy($2 | 0, $buf$0 | 0, $bufSize$0 | 0) | 0;
   _freeMem($longBuf$0);
   $buf$1 = $2;
   $bufSize$1 = $1;
   $longBuf$1 = $2;
  }
  $3 = _udcRead($file, $c, 1, 0) | 0;
  if (($3 | 0) == 0 & (tempRet0 | 0) == 0) {
   label = 5;
   break;
  }
  $8 = HEAP8[$c >> 0] | 0;
  $9 = $buf$1 + $i$0 | 0;
  HEAP8[$9 >> 0] = $8;
  $11 = (HEAP8[$c >> 0] | 0) == 10;
  HEAP8[$9 >> 0] = $11 ? 0 : $8;
  if ($11) {
   $buf$1$lcssa14 = $buf$1;
   $longBuf$1$lcssa15 = $longBuf$1;
   label = 7;
   break;
  } else {
   $buf$0 = $buf$1;
   $bufSize$0 = $bufSize$1;
   $i$0 = $i$0 + 1 | 0;
   $longBuf$0 = $longBuf$1;
  }
 }
 if ((label | 0) == 5) {
  $$2 = 0;
  STACKTOP = sp;
  return $$2 | 0;
 } else if ((label | 0) == 7) {
  $13 = _cloneString($buf$1$lcssa14) | 0;
  _freeMem($longBuf$1$lcssa15);
  $$2 = $13;
  STACKTOP = sp;
  return $$2 | 0;
 }
 return 0;
}

function ___strchrnul($s, $c) {
 $s = $s | 0;
 $c = $c | 0;
 var $$0 = 0, $$02$lcssa = 0, $$0211 = 0, $$1 = 0, $0 = 0, $11 = 0, $15 = 0, $16 = 0, $22 = 0, $23 = 0, $29 = 0, $36 = 0, $37 = 0, $5 = 0, $8 = 0, $w$0$lcssa = 0, $w$08 = 0;
 $0 = $c & 255;
 L1 : do if (!$0) $$0 = $s + (_strlen($s) | 0) | 0; else {
  if (!($s & 3)) $$02$lcssa = $s; else {
   $5 = $c & 255;
   $$0211 = $s;
   while (1) {
    $8 = HEAP8[$$0211 >> 0] | 0;
    if ($8 << 24 >> 24 == 0 ? 1 : $8 << 24 >> 24 == $5 << 24 >> 24) {
     $$0 = $$0211;
     break L1;
    }
    $11 = $$0211 + 1 | 0;
    if (!($11 & 3)) {
     $$02$lcssa = $11;
     break;
    } else $$0211 = $11;
   }
  }
  $15 = Math_imul($0, 16843009) | 0;
  $16 = HEAP32[$$02$lcssa >> 2] | 0;
  L10 : do if (!(($16 & -2139062144 ^ -2139062144) & $16 + -16843009)) {
   $23 = $16;
   $w$08 = $$02$lcssa;
   while (1) {
    $22 = $23 ^ $15;
    if (($22 & -2139062144 ^ -2139062144) & $22 + -16843009) {
     $w$0$lcssa = $w$08;
     break L10;
    }
    $29 = $w$08 + 4 | 0;
    $23 = HEAP32[$29 >> 2] | 0;
    if (($23 & -2139062144 ^ -2139062144) & $23 + -16843009) {
     $w$0$lcssa = $29;
     break;
    } else $w$08 = $29;
   }
  } else $w$0$lcssa = $$02$lcssa; while (0);
  $36 = $c & 255;
  $$1 = $w$0$lcssa;
  while (1) {
   $37 = HEAP8[$$1 >> 0] | 0;
   if ($37 << 24 >> 24 == 0 ? 1 : $37 << 24 >> 24 == $36 << 24 >> 24) {
    $$0 = $$1;
    break;
   } else $$1 = $$1 + 1 | 0;
  }
 } while (0);
 return $$0 | 0;
}

function _getThreadVars() {
 var $0 = 0, $14 = 0, $16 = 0, $24 = 0, $25 = 0, $9 = 0, $hel$0 = 0, $pidStr = 0, $vararg_buffer = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 80 | 0;
 $vararg_buffer = sp;
 $pidStr = sp + 8 | 0;
 $0 = _pthread_self() | 0;
 _pthread_mutex_lock(32) | 0;
 if ((HEAP32[15] | 0) != 0 & ($0 | 0) == (HEAP32[16] | 0)) {
  _write(2, 1981, 61) | 0;
  _exit(1);
 }
 _pthread_mutex_unlock(32) | 0;
 _pthread_mutex_lock(68) | 0;
 _pthread_mutex_lock(32) | 0;
 HEAP32[16] = $0;
 HEAP32[15] = 1;
 _pthread_mutex_unlock(32) | 0;
 if (!(HEAP32[24] | 0)) HEAP32[24] = _newHashExt(0, 1) | 0;
 $9 = $vararg_buffer;
 HEAP32[$9 >> 2] = $0;
 HEAP32[$9 + 4 >> 2] = 0;
 _safef($pidStr, 64, 2043, $vararg_buffer) | 0;
 $14 = _hashLookup(HEAP32[24] | 0, $pidStr) | 0;
 if ($14) {
  $hel$0 = $14;
  _pthread_mutex_lock(32) | 0;
  HEAP32[15] = 0;
  _pthread_mutex_unlock(32) | 0;
  _pthread_mutex_unlock(68) | 0;
  $24 = $hel$0 + 8 | 0;
  $25 = HEAP32[$24 >> 2] | 0;
  STACKTOP = sp;
  return $25 | 0;
 }
 $16 = _needMem(144) | 0;
 HEAP32[$16 >> 2] = 0;
 HEAP32[$16 + 4 >> 2] = 0;
 HEAP32[$16 + 88 >> 2] = 0;
 HEAP32[$16 + 8 >> 2] = 1;
 HEAP32[$16 + 140 >> 2] = 0;
 HEAP32[$16 + 92 >> 2] = 1;
 $hel$0 = _hashAdd(HEAP32[24] | 0, $pidStr, $16) | 0;
 _pthread_mutex_lock(32) | 0;
 HEAP32[15] = 0;
 _pthread_mutex_unlock(32) | 0;
 _pthread_mutex_unlock(68) | 0;
 $24 = $hel$0 + 8 | 0;
 $25 = HEAP32[$24 >> 2] | 0;
 STACKTOP = sp;
 return $25 | 0;
}

function ___fwritex($s, $l, $f) {
 $s = $s | 0;
 $l = $l | 0;
 $f = $f | 0;
 var $$0 = 0, $$01 = 0, $$02 = 0, $0 = 0, $1 = 0, $11 = 0, $19 = 0, $29 = 0, $6 = 0, $7 = 0, $9 = 0, $i$0 = 0, $i$0$lcssa12 = 0, $i$1 = 0, label = 0;
 $0 = $f + 16 | 0;
 $1 = HEAP32[$0 >> 2] | 0;
 if (!$1) if (!(___towrite($f) | 0)) {
  $9 = HEAP32[$0 >> 2] | 0;
  label = 5;
 } else $$0 = 0; else {
  $9 = $1;
  label = 5;
 }
 L5 : do if ((label | 0) == 5) {
  $6 = $f + 20 | 0;
  $7 = HEAP32[$6 >> 2] | 0;
  $11 = $7;
  if (($9 - $7 | 0) >>> 0 < $l >>> 0) {
   $$0 = FUNCTION_TABLE_iiii[HEAP32[$f + 36 >> 2] & 7]($f, $s, $l) | 0;
   break;
  }
  L10 : do if ((HEAP8[$f + 75 >> 0] | 0) > -1) {
   $i$0 = $l;
   while (1) {
    if (!$i$0) {
     $$01 = $l;
     $$02 = $s;
     $29 = $11;
     $i$1 = 0;
     break L10;
    }
    $19 = $i$0 + -1 | 0;
    if ((HEAP8[$s + $19 >> 0] | 0) == 10) {
     $i$0$lcssa12 = $i$0;
     break;
    } else $i$0 = $19;
   }
   if ((FUNCTION_TABLE_iiii[HEAP32[$f + 36 >> 2] & 7]($f, $s, $i$0$lcssa12) | 0) >>> 0 < $i$0$lcssa12 >>> 0) {
    $$0 = $i$0$lcssa12;
    break L5;
   }
   $$01 = $l - $i$0$lcssa12 | 0;
   $$02 = $s + $i$0$lcssa12 | 0;
   $29 = HEAP32[$6 >> 2] | 0;
   $i$1 = $i$0$lcssa12;
  } else {
   $$01 = $l;
   $$02 = $s;
   $29 = $11;
   $i$1 = 0;
  } while (0);
  _memcpy($29 | 0, $$02 | 0, $$01 | 0) | 0;
  HEAP32[$6 >> 2] = (HEAP32[$6 >> 2] | 0) + $$01;
  $$0 = $i$1 + $$01 | 0;
 } while (0);
 return $$0 | 0;
}

function _lineFileDecompress($fileName, $zTerm) {
 $fileName = $fileName | 0;
 $zTerm = $zTerm | 0;
 var $$0 = 0, $$pre$i = 0, $1 = 0, $11 = 0, $12 = 0, $13 = 0, $3 = 0, $8 = 0, $result$i = 0, $testbytes = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16 | 0;
 $result$i = sp + 8 | 0;
 $testbytes = sp + 4 | 0;
 HEAP32[$testbytes >> 2] = 0;
 if (!$fileName) {
  $$0 = 0;
  STACKTOP = sp;
  return $$0 | 0;
 }
 HEAP32[$result$i >> 2] = 0;
 $1 = _open($fileName, 0, sp) | 0;
 if (($1 | 0) <= -1) {
  HEAP32[$testbytes >> 2] = 0;
  $$0 = 0;
  STACKTOP = sp;
  return $$0 | 0;
 }
 $3 = _needMem(5) | 0;
 HEAP32[$result$i >> 2] = $3;
 if ((_read($1, $3, 4) | 0) < 4) _freez($result$i); else HEAP8[$3 + 4 >> 0] = 0;
 _close($1) | 0;
 $$pre$i = HEAP32[$result$i >> 2] | 0;
 HEAP32[$testbytes >> 2] = $$pre$i;
 if (!$$pre$i) {
  $$0 = 0;
  STACKTOP = sp;
  return $$0 | 0;
 }
 $8 = _getFileNameFromHdrSig($$pre$i) | 0;
 _freez($testbytes);
 if (!$8) {
  $$0 = 0;
  STACKTOP = sp;
  return $$0 | 0;
 }
 $11 = _pipelineOpen1(_getDecompressor($fileName) | 0, 33, $fileName, 0) | 0;
 $12 = _pipelineFd($11) | 0;
 $13 = _needMem(104) | 0;
 HEAP32[$13 + 4 >> 2] = _cloneString($fileName) | 0;
 HEAP32[$13 + 8 >> 2] = $12;
 HEAP32[$13 + 12 >> 2] = 65536;
 HEAP8[$13 + 40 >> 0] = $zTerm;
 HEAP32[$13 + 52 >> 2] = _needMem(65537) | 0;
 HEAP32[$13 + 56 >> 2] = $11;
 $$0 = $13;
 STACKTOP = sp;
 return $$0 | 0;
}

function ___shgetc($f) {
 $f = $f | 0;
 var $$0 = 0, $$phi$trans$insert3 = 0, $$pre = 0, $0 = 0, $1 = 0, $13 = 0, $19 = 0, $21 = 0, $25 = 0, $27 = 0, $29 = 0, $35 = 0, $36 = 0, $41 = 0, $6 = 0, $9 = 0, label = 0;
 $0 = $f + 104 | 0;
 $1 = HEAP32[$0 >> 2] | 0;
 if (!$1) label = 3; else if ((HEAP32[$f + 108 >> 2] | 0) < ($1 | 0)) label = 3; else label = 4;
 if ((label | 0) == 3) {
  $6 = ___uflow($f) | 0;
  if (($6 | 0) < 0) label = 4; else {
   $9 = HEAP32[$0 >> 2] | 0;
   $$pre = HEAP32[$f + 8 >> 2] | 0;
   if (!$9) {
    $41 = $$pre;
    label = 9;
   } else {
    $13 = HEAP32[$f + 4 >> 2] | 0;
    $19 = $9 - (HEAP32[$f + 108 >> 2] | 0) + -1 | 0;
    $21 = $$pre;
    if (($$pre - $13 | 0) > ($19 | 0)) {
     HEAP32[$f + 100 >> 2] = $13 + $19;
     $25 = $21;
    } else {
     $41 = $21;
     label = 9;
    }
   }
   if ((label | 0) == 9) {
    HEAP32[$f + 100 >> 2] = $$pre;
    $25 = $41;
   }
   $$phi$trans$insert3 = $f + 4 | 0;
   if (!$25) $36 = HEAP32[$$phi$trans$insert3 >> 2] | 0; else {
    $27 = HEAP32[$$phi$trans$insert3 >> 2] | 0;
    $29 = $f + 108 | 0;
    HEAP32[$29 >> 2] = $25 + 1 - $27 + (HEAP32[$29 >> 2] | 0);
    $36 = $27;
   }
   $35 = $36 + -1 | 0;
   if ((HEAPU8[$35 >> 0] | 0 | 0) == ($6 | 0)) $$0 = $6; else {
    HEAP8[$35 >> 0] = $6;
    $$0 = $6;
   }
  }
 }
 if ((label | 0) == 4) {
  HEAP32[$f + 100 >> 2] = 0;
  $$0 = -1;
 }
 return $$0 | 0;
}

function _cgiDecode($in, $out, $inLength) {
 $in = $in | 0;
 $out = $out | 0;
 $inLength = $inLength | 0;
 var $$01$lcssa = 0, $$013 = 0, $$04 = 0, $$1 = 0, $$12 = 0, $1 = 0, $2 = 0, $8 = 0, $code = 0, $i$05 = 0, $i$1 = 0, $vararg_buffer = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16 | 0;
 $vararg_buffer = sp;
 $code = sp + 4 | 0;
 if (($inLength | 0) <= 0) {
  $$01$lcssa = $out;
  HEAP8[$$01$lcssa >> 0] = 0;
  STACKTOP = sp;
  return;
 }
 $$013 = $out;
 $$04 = $in;
 $i$05 = 0;
 while (1) {
  $1 = $$04 + 1 | 0;
  $2 = HEAP8[$$04 >> 0] | 0;
  switch ($2 << 24 >> 24) {
  case 43:
   {
    HEAP8[$$013 >> 0] = 32;
    $$1 = $1;
    $i$1 = $i$05;
    break;
   }
  case 37:
   {
    HEAP32[$vararg_buffer >> 2] = $code;
    if ((_sscanf($1, 1938, $vararg_buffer) | 0) == 1) $8 = HEAP32[$code >> 2] | 0; else {
     HEAP32[$code >> 2] = 63;
     $8 = 63;
    }
    HEAP8[$$013 >> 0] = $8;
    $$1 = $$04 + 3 | 0;
    $i$1 = $i$05 + 2 | 0;
    break;
   }
  default:
   {
    HEAP8[$$013 >> 0] = $2;
    $$1 = $1;
    $i$1 = $i$05;
   }
  }
  $$12 = $$013 + 1 | 0;
  $i$05 = $i$1 + 1 | 0;
  if (($i$05 | 0) >= ($inLength | 0)) {
   $$01$lcssa = $$12;
   break;
  } else {
   $$013 = $$12;
   $$04 = $$1;
  }
 }
 HEAP8[$$01$lcssa >> 0] = 0;
 STACKTOP = sp;
 return;
}

function _vsnprintf($s, $n, $fmt, $ap) {
 $s = $s | 0;
 $n = $n | 0;
 $fmt = $fmt | 0;
 $ap = $ap | 0;
 var $$$02 = 0, $$0 = 0, $$01 = 0, $$02 = 0, $10 = 0, $11 = 0, $13 = 0, $15 = 0, $5 = 0, $8 = 0, $b = 0, $f = 0, dest = 0, label = 0, sp = 0, src = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 128 | 0;
 $b = sp + 112 | 0;
 $f = sp;
 dest = $f;
 src = 484;
 stop = dest + 112 | 0;
 do {
  HEAP32[dest >> 2] = HEAP32[src >> 2];
  dest = dest + 4 | 0;
  src = src + 4 | 0;
 } while ((dest | 0) < (stop | 0));
 if (($n + -1 | 0) >>> 0 > 2147483646) if (!$n) {
  $$01 = $b;
  $$02 = 1;
  label = 4;
 } else {
  HEAP32[(___errno_location() | 0) >> 2] = 75;
  $$0 = -1;
 } else {
  $$01 = $s;
  $$02 = $n;
  label = 4;
 }
 if ((label | 0) == 4) {
  $5 = -2 - $$01 | 0;
  $$$02 = $$02 >>> 0 > $5 >>> 0 ? $5 : $$02;
  HEAP32[$f + 48 >> 2] = $$$02;
  $8 = $f + 20 | 0;
  HEAP32[$8 >> 2] = $$01;
  HEAP32[$f + 44 >> 2] = $$01;
  $10 = $$01 + $$$02 | 0;
  $11 = $f + 16 | 0;
  HEAP32[$11 >> 2] = $10;
  HEAP32[$f + 28 >> 2] = $10;
  $13 = _vfprintf($f, $fmt, $ap) | 0;
  if (!$$$02) $$0 = $13; else {
   $15 = HEAP32[$8 >> 2] | 0;
   HEAP8[$15 + ((($15 | 0) == (HEAP32[$11 >> 2] | 0)) << 31 >> 31) >> 0] = 0;
   $$0 = $13;
  }
 }
 STACKTOP = sp;
 return $$0 | 0;
}

function _atoi($s) {
 $s = $s | 0;
 var $$0 = 0, $$0$lcssa = 0, $$1$ph = 0, $$13 = 0, $$lcssa9 = 0, $11 = 0, $4 = 0, $5 = 0, $8 = 0, $isdigittmp$1 = 0, $isdigittmp5 = 0, $n$0$lcssa = 0, $n$04 = 0, $neg$0 = 0, $neg$1$ph = 0, label = 0;
 $$0 = $s;
 while (1) {
  $4 = $$0 + 1 | 0;
  if (!(_isspace(HEAP8[$$0 >> 0] | 0) | 0)) {
   $$0$lcssa = $$0;
   $$lcssa9 = $4;
   break;
  } else $$0 = $4;
 }
 $5 = HEAP8[$$0$lcssa >> 0] | 0;
 switch ($5 << 24 >> 24 | 0) {
 case 45:
  {
   $neg$0 = 1;
   label = 5;
   break;
  }
 case 43:
  {
   $neg$0 = 0;
   label = 5;
   break;
  }
 default:
  {
   $$1$ph = $$0$lcssa;
   $8 = $5;
   $neg$1$ph = 0;
  }
 }
 if ((label | 0) == 5) {
  $$1$ph = $$lcssa9;
  $8 = HEAP8[$$lcssa9 >> 0] | 0;
  $neg$1$ph = $neg$0;
 }
 $isdigittmp$1 = ($8 << 24 >> 24) + -48 | 0;
 if ($isdigittmp$1 >>> 0 < 10) {
  $$13 = $$1$ph;
  $isdigittmp5 = $isdigittmp$1;
  $n$04 = 0;
  while (1) {
   $$13 = $$13 + 1 | 0;
   $11 = ($n$04 * 10 | 0) - $isdigittmp5 | 0;
   $isdigittmp5 = (HEAP8[$$13 >> 0] | 0) + -48 | 0;
   if ($isdigittmp5 >>> 0 >= 10) {
    $n$0$lcssa = $11;
    break;
   } else $n$04 = $11;
  }
 } else $n$0$lcssa = 0;
 return (($neg$1$ph | 0) != 0 ? $n$0$lcssa : 0 - $n$0$lcssa | 0) | 0;
}

function _lmAlloc($lm, $size) {
 $lm = $lm | 0;
 $size = $size | 0;
 var $0 = 0, $10 = 0, $12 = 0, $13 = 0, $15 = 0, $19 = 0, $2 = 0, $21 = 0, $31 = 0, $32 = 0, $34 = 0, $4 = 0, $7 = 0, $8 = 0, $mb$0 = 0, $vararg_buffer = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16 | 0;
 $vararg_buffer = sp;
 $0 = HEAP32[$lm >> 2] | 0;
 $2 = HEAP32[$0 + 8 >> 2] | 0;
 $4 = HEAP32[$0 + 4 >> 2] | 0;
 $7 = $4;
 $8 = $2;
 do if (($2 - $4 | 0) >>> 0 < $size >>> 0) {
  $10 = HEAP32[$lm + 4 >> 2] | 0;
  $12 = ($10 >>> 0 < $size >>> 0 ? $size : $10) + 16 | 0;
  $13 = _needLargeZeroedMem($12) | 0;
  if (!$13) {
   $15 = $vararg_buffer;
   HEAP32[$15 >> 2] = $12;
   HEAP32[$15 + 4 >> 2] = 0;
   _errAbort(3890, $vararg_buffer);
  } else {
   $19 = $13 + 16 | 0;
   HEAP32[$13 + 4 >> 2] = $19;
   $21 = $13 + $12 | 0;
   HEAP32[$13 + 8 >> 2] = $21;
   HEAP32[$13 >> 2] = HEAP32[$lm >> 2];
   HEAP32[$lm >> 2] = $13;
   $32 = $19;
   $34 = $21;
   $mb$0 = $13;
   break;
  }
 } else {
  $32 = $7;
  $34 = $8;
  $mb$0 = $0;
 } while (0);
 $31 = $32 + ((HEAP32[$lm + 12 >> 2] | 0) + $size & HEAP32[$lm + 8 >> 2]) | 0;
 HEAP32[$mb$0 + 4 >> 2] = $31 >>> 0 > $34 >>> 0 ? $34 : $31;
 STACKTOP = sp;
 return $32 | 0;
}

function _hashFindVal($hash, $name) {
 $hash = $hash | 0;
 $name = $name | 0;
 var $$0 = 0, $0 = 0, $3 = 0, $6 = 0, $el$0$1$i = 0, $el$02$i = 0, $el$02$i$lcssa = 0, $keyStr$02$i$i = 0, $result$0$lcssa$i$i = 0, $result$01$i$i = 0, label = 0;
 $0 = HEAP8[$name >> 0] | 0;
 if (!($0 << 24 >> 24)) $result$0$lcssa$i$i = 0; else {
  $3 = $0;
  $keyStr$02$i$i = $name;
  $result$01$i$i = 0;
  while (1) {
   $keyStr$02$i$i = $keyStr$02$i$i + 1 | 0;
   $6 = ($result$01$i$i * 9 | 0) + ($3 << 24 >> 24) | 0;
   $3 = HEAP8[$keyStr$02$i$i >> 0] | 0;
   if (!($3 << 24 >> 24)) {
    $result$0$lcssa$i$i = $6;
    break;
   } else $result$01$i$i = $6;
  }
 }
 $el$0$1$i = HEAP32[(HEAP32[$hash + 8 >> 2] | 0) + ((HEAP32[$hash + 4 >> 2] & $result$0$lcssa$i$i) << 2) >> 2] | 0;
 if (!$el$0$1$i) {
  $$0 = 0;
  return $$0 | 0;
 } else $el$02$i = $el$0$1$i;
 while (1) {
  if (!(_strcmp(HEAP32[$el$02$i + 4 >> 2] | 0, $name) | 0)) {
   $el$02$i$lcssa = $el$02$i;
   break;
  }
  $el$02$i = HEAP32[$el$02$i >> 2] | 0;
  if (!$el$02$i) {
   $$0 = 0;
   label = 7;
   break;
  }
 }
 if ((label | 0) == 7) return $$0 | 0;
 $$0 = HEAP32[$el$02$i$lcssa + 8 >> 2] | 0;
 return $$0 | 0;
}

function _mustOpen($fileName, $mode) {
 $fileName = $fileName | 0;
 $mode = $mode | 0;
 var $$0 = 0, $13 = 0, $6 = 0, $9 = 0, $modeName$0 = 0, $vararg_buffer = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16 | 0;
 $vararg_buffer = sp;
 if (!(_strcmp($fileName, 2440) | 0)) {
  $$0 = HEAP32[58] | 0;
  STACKTOP = sp;
  return $$0 | 0;
 }
 if (!(_strcmp($fileName, 2446) | 0)) {
  $$0 = HEAP32[55] | 0;
  STACKTOP = sp;
  return $$0 | 0;
 }
 $6 = _fopen($fileName, $mode) | 0;
 if ($6) {
  $$0 = $6;
  STACKTOP = sp;
  return $$0 | 0;
 }
 L12 : do if (!$mode) $modeName$0 = 2464; else {
  $9 = HEAP8[$mode >> 0] | 0;
  switch ($9 << 24 >> 24) {
  case 114:
   {
    $modeName$0 = 2475;
    break L12;
    break;
   }
  case 119:
   {
    $modeName$0 = 2465;
    break L12;
    break;
   }
  default:
   {
    $modeName$0 = $9 << 24 >> 24 == 97 ? 2453 : 2464;
    break L12;
   }
  }
 } while (0);
 $13 = _strerror(HEAP32[(___errno_location() | 0) >> 2] | 0) | 0;
 HEAP32[$vararg_buffer >> 2] = $fileName;
 HEAP32[$vararg_buffer + 4 >> 2] = $modeName$0;
 HEAP32[$vararg_buffer + 8 >> 2] = $13;
 _errAbort(2484, $vararg_buffer);
 return 0;
}

function _nextWord($pLine) {
 $pLine = $pLine | 0;
 var $$0 = 0, $$01$i$lcssa = 0, $$012$i = 0, $$012$i$lcssa = 0, $$pn = 0, $0 = 0, $11 = 0, $14 = 0, $2 = 0, $7 = 0, $e$0 = 0, label = 0;
 $0 = HEAP32[$pLine >> 2] | 0;
 if (!$0) {
  $$0 = 0;
  return $$0 | 0;
 }
 $2 = HEAP8[$0 >> 0] | 0;
 if (!($2 << 24 >> 24)) {
  $$0 = 0;
  return $$0 | 0;
 }
 if (!(_isspace($2 << 24 >> 24) | 0)) $$01$i$lcssa = $0; else {
  $$pn = $0;
  while (1) {
   $7 = $$pn + 1 | 0;
   if (!(_isspace(HEAP8[$7 >> 0] | 0) | 0)) {
    $$01$i$lcssa = $7;
    break;
   } else $$pn = $7;
  }
 }
 $11 = HEAP8[$$01$i$lcssa >> 0] | 0;
 if (!($11 << 24 >> 24)) {
  $$0 = 0;
  return $$0 | 0;
 } else {
  $$012$i = $$01$i$lcssa;
  $14 = $11;
 }
 while (1) {
  if (_isspace($14 << 24 >> 24) | 0) {
   $$012$i$lcssa = $$012$i;
   label = 8;
   break;
  }
  $$012$i = $$012$i + 1 | 0;
  $14 = HEAP8[$$012$i >> 0] | 0;
  if (!($14 << 24 >> 24)) {
   $e$0 = 0;
   break;
  }
 }
 if ((label | 0) == 8) if (!$$012$i$lcssa) $e$0 = 0; else {
  HEAP8[$$012$i$lcssa >> 0] = 0;
  $e$0 = $$012$i$lcssa + 1 | 0;
 }
 HEAP32[$pLine >> 2] = $e$0;
 $$0 = $$01$i$lcssa;
 return $$0 | 0;
}

function _fmt_u($0, $1, $s) {
 $0 = $0 | 0;
 $1 = $1 | 0;
 $s = $s | 0;
 var $$0$lcssa = 0, $$01$lcssa$off0 = 0, $$05 = 0, $$1$lcssa = 0, $$12 = 0, $$lcssa20 = 0, $13 = 0, $14 = 0, $25 = 0, $28 = 0, $7 = 0, $8 = 0, $9 = 0, $y$03 = 0;
 if ($1 >>> 0 > 0 | ($1 | 0) == 0 & $0 >>> 0 > 4294967295) {
  $$05 = $s;
  $7 = $0;
  $8 = $1;
  while (1) {
   $9 = ___uremdi3($7 | 0, $8 | 0, 10, 0) | 0;
   $13 = $$05 + -1 | 0;
   HEAP8[$13 >> 0] = $9 | 48;
   $14 = ___udivdi3($7 | 0, $8 | 0, 10, 0) | 0;
   if ($8 >>> 0 > 9 | ($8 | 0) == 9 & $7 >>> 0 > 4294967295) {
    $$05 = $13;
    $7 = $14;
    $8 = tempRet0;
   } else {
    $$lcssa20 = $13;
    $28 = $14;
    break;
   }
  }
  $$0$lcssa = $$lcssa20;
  $$01$lcssa$off0 = $28;
 } else {
  $$0$lcssa = $s;
  $$01$lcssa$off0 = $0;
 }
 if (!$$01$lcssa$off0) $$1$lcssa = $$0$lcssa; else {
  $$12 = $$0$lcssa;
  $y$03 = $$01$lcssa$off0;
  while (1) {
   $25 = $$12 + -1 | 0;
   HEAP8[$25 >> 0] = ($y$03 >>> 0) % 10 | 0 | 48;
   if ($y$03 >>> 0 < 10) {
    $$1$lcssa = $25;
    break;
   } else {
    $$12 = $25;
    $y$03 = ($y$03 >>> 0) / 10 | 0;
   }
  }
 }
 return $$1$lcssa | 0;
}

function _mustReadFd($fd, $buf, $size) {
 $fd = $fd | 0;
 $buf = $buf | 0;
 $size = $size | 0;
 var $$01 = 0, $1 = 0, $12 = 0, $3 = 0, $8 = 0, $cbuf$02 = 0, $vararg_buffer = 0, $vararg_buffer1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32 | 0;
 $vararg_buffer1 = sp + 8 | 0;
 $vararg_buffer = sp;
 if (!$size) {
  STACKTOP = sp;
  return;
 } else {
  $$01 = $size;
  $cbuf$02 = $buf;
 }
 while (1) {
  $1 = _read($fd, $cbuf$02, $$01) | 0;
  if (($1 | 0) < 0) {
   label = 3;
   break;
  }
  if (!$1) {
   label = 5;
   break;
  }
  if (($$01 | 0) == ($1 | 0)) {
   label = 7;
   break;
  } else {
   $$01 = $$01 - $1 | 0;
   $cbuf$02 = $cbuf$02 + $1 | 0;
  }
 }
 if ((label | 0) == 3) {
  $3 = $vararg_buffer;
  HEAP32[$3 >> 2] = $$01;
  HEAP32[$3 + 4 >> 2] = 0;
  _errnoAbort(2514, $vararg_buffer);
 } else if ((label | 0) == 5) {
  $8 = $vararg_buffer1;
  HEAP32[$8 >> 2] = $$01;
  HEAP32[$8 + 4 >> 2] = 0;
  $12 = $vararg_buffer1 + 8 | 0;
  HEAP32[$12 >> 2] = 0;
  HEAP32[$12 + 4 >> 2] = 0;
  _errAbort(2539, $vararg_buffer1);
 } else if ((label | 0) == 7) {
  STACKTOP = sp;
  return;
 }
}

function _needMoreMem($old, $oldSize, $newSize) {
 $old = $old | 0;
 $oldSize = $oldSize | 0;
 $newSize = $newSize | 0;
 var $1 = 0, $14 = 0, $17 = 0, $18 = 0, $3 = 0, $7 = 0, $vararg_buffer = 0, $vararg_buffer2 = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32 | 0;
 $vararg_buffer2 = sp + 16 | 0;
 $vararg_buffer = sp;
 $1 = HEAP32[46] | 0;
 if (!(($newSize | 0) != 0 & $1 >>> 0 > $newSize >>> 0)) {
  $3 = $vararg_buffer;
  HEAP32[$3 >> 2] = $newSize;
  HEAP32[$3 + 4 >> 2] = 0;
  $7 = $vararg_buffer + 8 | 0;
  HEAP32[$7 >> 2] = $1;
  HEAP32[$7 + 4 >> 2] = 0;
  _errAbort(3097, $vararg_buffer);
 }
 $14 = FUNCTION_TABLE_iii[HEAP32[(HEAP32[41] | 0) + 12 >> 2] & 1]($old, $newSize) | 0;
 if (!$14) {
  $17 = HEAP32[(___errno_location() | 0) >> 2] | 0;
  $18 = $vararg_buffer2;
  HEAP32[$18 >> 2] = $newSize;
  HEAP32[$18 + 4 >> 2] = 0;
  HEAP32[$vararg_buffer2 + 8 >> 2] = $17;
  _errAbort(3161, $vararg_buffer2);
 }
 if ($newSize >>> 0 <= $oldSize >>> 0) {
  STACKTOP = sp;
  return $14 | 0;
 }
 _memset($14 + $oldSize | 0, 0, $newSize - $oldSize | 0) | 0;
 STACKTOP = sp;
 return $14 | 0;
}

function _hashLookup($hash, $name) {
 $hash = $hash | 0;
 $name = $name | 0;
 var $0 = 0, $3 = 0, $6 = 0, $el$0$1 = 0, $el$0$lcssa = 0, $el$02 = 0, $keyStr$02$i = 0, $result$0$lcssa$i = 0, $result$01$i = 0, label = 0;
 $0 = HEAP8[$name >> 0] | 0;
 if (!($0 << 24 >> 24)) $result$0$lcssa$i = 0; else {
  $3 = $0;
  $keyStr$02$i = $name;
  $result$01$i = 0;
  while (1) {
   $keyStr$02$i = $keyStr$02$i + 1 | 0;
   $6 = ($result$01$i * 9 | 0) + ($3 << 24 >> 24) | 0;
   $3 = HEAP8[$keyStr$02$i >> 0] | 0;
   if (!($3 << 24 >> 24)) {
    $result$0$lcssa$i = $6;
    break;
   } else $result$01$i = $6;
  }
 }
 $el$0$1 = HEAP32[(HEAP32[$hash + 8 >> 2] | 0) + ((HEAP32[$hash + 4 >> 2] & $result$0$lcssa$i) << 2) >> 2] | 0;
 if (!$el$0$1) {
  $el$0$lcssa = 0;
  return $el$0$lcssa | 0;
 } else $el$02 = $el$0$1;
 while (1) {
  if (!(_strcmp(HEAP32[$el$02 + 4 >> 2] | 0, $name) | 0)) {
   $el$0$lcssa = $el$02;
   label = 6;
   break;
  }
  $el$02 = HEAP32[$el$02 >> 2] | 0;
  if (!$el$02) {
   $el$0$lcssa = 0;
   label = 6;
   break;
  }
 }
 if ((label | 0) == 6) return $el$0$lcssa | 0;
 return 0;
}

function _fflush($f) {
 $f = $f | 0;
 var $$0 = 0, $$01$2 = 0, $$014 = 0, $23 = 0, $27 = 0, $6 = 0, $phitmp = 0, $r$0$lcssa = 0, $r$03 = 0, $r$1 = 0;
 do if (!$f) {
  if (!(HEAP32[56] | 0)) $27 = 0; else $27 = _fflush(HEAP32[56] | 0) | 0;
  ___lock(468);
  $$01$2 = HEAP32[116] | 0;
  if (!$$01$2) $r$0$lcssa = $27; else {
   $$014 = $$01$2;
   $r$03 = $27;
   while (1) {
    if ((HEAP32[$$014 + 76 >> 2] | 0) > -1) $23 = ___lockfile($$014) | 0; else $23 = 0;
    if ((HEAP32[$$014 + 20 >> 2] | 0) >>> 0 > (HEAP32[$$014 + 28 >> 2] | 0) >>> 0) $r$1 = ___fflush_unlocked($$014) | 0 | $r$03; else $r$1 = $r$03;
    if ($23) ___unlockfile($$014);
    $$014 = HEAP32[$$014 + 56 >> 2] | 0;
    if (!$$014) {
     $r$0$lcssa = $r$1;
     break;
    } else $r$03 = $r$1;
   }
  }
  ___unlock(468);
  $$0 = $r$0$lcssa;
 } else {
  if ((HEAP32[$f + 76 >> 2] | 0) <= -1) {
   $$0 = ___fflush_unlocked($f) | 0;
   break;
  }
  $phitmp = (___lockfile($f) | 0) == 0;
  $6 = ___fflush_unlocked($f) | 0;
  if ($phitmp) $$0 = $6; else {
   ___unlockfile($f);
   $$0 = $6;
  }
 } while (0);
 return $$0 | 0;
}

function _strlen($s) {
 $s = $s | 0;
 var $$01$lcssa = 0, $$014 = 0, $$1$lcssa = 0, $$lcssa20 = 0, $$pn = 0, $$pn$15 = 0, $0 = 0, $18 = 0, $21 = 0, $5 = 0, $9 = 0, $w$0 = 0, $w$0$lcssa = 0, label = 0;
 $0 = $s;
 L1 : do if (!($0 & 3)) {
  $$01$lcssa = $s;
  label = 4;
 } else {
  $$014 = $s;
  $21 = $0;
  while (1) {
   if (!(HEAP8[$$014 >> 0] | 0)) {
    $$pn = $21;
    break L1;
   }
   $5 = $$014 + 1 | 0;
   $21 = $5;
   if (!($21 & 3)) {
    $$01$lcssa = $5;
    label = 4;
    break;
   } else $$014 = $5;
  }
 } while (0);
 if ((label | 0) == 4) {
  $w$0 = $$01$lcssa;
  while (1) {
   $9 = HEAP32[$w$0 >> 2] | 0;
   if (!(($9 & -2139062144 ^ -2139062144) & $9 + -16843009)) $w$0 = $w$0 + 4 | 0; else {
    $$lcssa20 = $9;
    $w$0$lcssa = $w$0;
    break;
   }
  }
  if (!(($$lcssa20 & 255) << 24 >> 24)) $$1$lcssa = $w$0$lcssa; else {
   $$pn$15 = $w$0$lcssa;
   while (1) {
    $18 = $$pn$15 + 1 | 0;
    if (!(HEAP8[$18 >> 0] | 0)) {
     $$1$lcssa = $18;
     break;
    } else $$pn$15 = $18;
   }
  }
  $$pn = $$1$lcssa;
 }
 return $$pn - $0 | 0;
}

function _lineFileMayOpen($fileName, $zTerm) {
 $fileName = $fileName | 0;
 $zTerm = $zTerm | 0;
 var $$1 = 0, $15 = 0, $17 = 0, $3 = 0, $4 = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16 | 0;
 if (!(_strcmp($fileName, 2440) | 0)) {
  $3 = _fileno(HEAP32[58] | 0) | 0;
  $4 = _needMem(104) | 0;
  HEAP32[$4 + 4 >> 2] = _cloneString(2440) | 0;
  HEAP32[$4 + 8 >> 2] = $3;
  HEAP32[$4 + 12 >> 2] = 65536;
  HEAP8[$4 + 40 >> 0] = $zTerm;
  HEAP32[$4 + 52 >> 2] = _needMem(65537) | 0;
  $$1 = $4;
  STACKTOP = sp;
  return $$1 | 0;
 }
 if (_getDecompressor($fileName) | 0) {
  $$1 = _lineFileDecompress($fileName, $zTerm) | 0;
  STACKTOP = sp;
  return $$1 | 0;
 }
 $15 = _open($fileName, 0, sp) | 0;
 if (($15 | 0) == -1) {
  $$1 = 0;
  STACKTOP = sp;
  return $$1 | 0;
 }
 $17 = _needMem(104) | 0;
 HEAP32[$17 + 4 >> 2] = _cloneString($fileName) | 0;
 HEAP32[$17 + 8 >> 2] = $15;
 HEAP32[$17 + 12 >> 2] = 65536;
 HEAP8[$17 + 40 >> 0] = $zTerm;
 HEAP32[$17 + 52 >> 2] = _needMem(65537) | 0;
 $$1 = $17;
 STACKTOP = sp;
 return $$1 | 0;
}

function _sqlUnsignedOrError($s, $format, $varargs) {
 $s = $s | 0;
 $format = $format | 0;
 $varargs = $varargs | 0;
 var $$lcssa = 0, $$lcssa19 = 0, $$lcssa20 = 0, $0 = 0, $3 = 0, $4 = 0, $7 = 0, $8 = 0, $args = 0, $p$03 = 0, $res$04 = 0, $vararg_buffer = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32 | 0;
 $vararg_buffer = sp;
 $args = sp + 8 | 0;
 $0 = HEAP8[$s >> 0] | 0;
 if (($0 + -48 & 255) < 10) {
  $3 = $0;
  $p$03 = $s;
  $res$04 = 0;
  while (1) {
   $4 = $p$03 + 1 | 0;
   $7 = ($res$04 * 10 | 0) + -48 + ($3 << 24 >> 24) | 0;
   $8 = HEAP8[$4 >> 0] | 0;
   if (($8 + -48 & 255) < 10) {
    $3 = $8;
    $p$03 = $4;
    $res$04 = $7;
   } else {
    $$lcssa = $4;
    $$lcssa19 = $7;
    $$lcssa20 = $8;
    break;
   }
  }
  if (!(($$lcssa | 0) == ($s | 0) | $$lcssa20 << 24 >> 24 != 0)) {
   STACKTOP = sp;
   return $$lcssa19 | 0;
  }
 }
 if (!$format) {
  HEAP32[$vararg_buffer >> 2] = $s;
  _errAbort(2390, $vararg_buffer);
 } else {
  HEAP32[$args >> 2] = $varargs;
  _vaErrAbort($format, $args);
 }
 return 0;
}

function _pad($f, $c, $w, $l, $fl) {
 $f = $f | 0;
 $c = $c | 0;
 $w = $w | 0;
 $l = $l | 0;
 $fl = $fl | 0;
 var $$0$lcssa6 = 0, $$02 = 0, $10 = 0, $14 = 0, $17 = 0, $18 = 0, $3 = 0, $7 = 0, $9 = 0, $pad = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 256 | 0;
 $pad = sp;
 do if (($w | 0) > ($l | 0) & ($fl & 73728 | 0) == 0) {
  $3 = $w - $l | 0;
  _memset($pad | 0, $c | 0, ($3 >>> 0 > 256 ? 256 : $3) | 0) | 0;
  $7 = HEAP32[$f >> 2] | 0;
  $9 = ($7 & 32 | 0) == 0;
  if ($3 >>> 0 > 255) {
   $10 = $w - $l | 0;
   $$02 = $3;
   $17 = $7;
   $18 = $9;
   while (1) {
    if ($18) {
     ___fwritex($pad, 256, $f) | 0;
     $14 = HEAP32[$f >> 2] | 0;
    } else $14 = $17;
    $$02 = $$02 + -256 | 0;
    $18 = ($14 & 32 | 0) == 0;
    if ($$02 >>> 0 <= 255) break; else $17 = $14;
   }
   if ($18) $$0$lcssa6 = $10 & 255; else break;
  } else if ($9) $$0$lcssa6 = $3; else break;
  ___fwritex($pad, $$0$lcssa6, $f) | 0;
 } while (0);
 STACKTOP = sp;
 return;
}

function _freeHash($pHash) {
 $pHash = $pHash | 0;
 var $0 = 0, $11 = 0, $19 = 0, $2 = 0, $22 = 0, $5 = 0, $6 = 0, $8 = 0, $hel$01 = 0, $i$02 = 0, $hel$01$looptemp = 0;
 $0 = HEAP32[$pHash >> 2] | 0;
 if (!$0) return;
 $2 = $0 + 20 | 0;
 if (!(HEAP32[$2 >> 2] | 0)) {
  $5 = $0 + 16 | 0;
  $6 = HEAP32[$5 >> 2] | 0;
  if (($6 | 0) > 0) {
   $8 = $0 + 8 | 0;
   $22 = $6;
   $i$02 = 0;
   while (1) {
    $11 = HEAP32[(HEAP32[$8 >> 2] | 0) + ($i$02 << 2) >> 2] | 0;
    if (!$11) $19 = $22; else {
     $hel$01 = $11;
     do {
      $hel$01$looptemp = $hel$01;
      $hel$01 = HEAP32[$hel$01 >> 2] | 0;
      _freeMem(HEAP32[$hel$01$looptemp + 4 >> 2] | 0);
      _freeMem($hel$01$looptemp);
     } while (($hel$01 | 0) != 0);
     $19 = HEAP32[$5 >> 2] | 0;
    }
    $i$02 = $i$02 + 1 | 0;
    if (($i$02 | 0) >= ($19 | 0)) break; else $22 = $19;
   }
  }
 } else _lmCleanup($2);
 _freeMem(HEAP32[$0 + 8 >> 2] | 0);
 _freez($pHash);
 return;
}

function ___remdi3($a$0, $a$1, $b$0, $b$1) {
 $a$0 = $a$0 | 0;
 $a$1 = $a$1 | 0;
 $b$0 = $b$0 | 0;
 $b$1 = $b$1 | 0;
 var $rem = 0, $1$0 = 0, $1$1 = 0, $2$0 = 0, $2$1 = 0, $4$0 = 0, $4$1 = 0, $10$0 = 0, $10$1 = 0, __stackBase__ = 0;
 __stackBase__ = STACKTOP;
 STACKTOP = STACKTOP + 16 | 0;
 $rem = __stackBase__ | 0;
 $1$0 = $a$1 >> 31 | (($a$1 | 0) < 0 ? -1 : 0) << 1;
 $1$1 = (($a$1 | 0) < 0 ? -1 : 0) >> 31 | (($a$1 | 0) < 0 ? -1 : 0) << 1;
 $2$0 = $b$1 >> 31 | (($b$1 | 0) < 0 ? -1 : 0) << 1;
 $2$1 = (($b$1 | 0) < 0 ? -1 : 0) >> 31 | (($b$1 | 0) < 0 ? -1 : 0) << 1;
 $4$0 = _i64Subtract($1$0 ^ $a$0, $1$1 ^ $a$1, $1$0, $1$1) | 0;
 $4$1 = tempRet0;
 ___udivmoddi4($4$0, $4$1, _i64Subtract($2$0 ^ $b$0, $2$1 ^ $b$1, $2$0, $2$1) | 0, tempRet0, $rem) | 0;
 $10$0 = _i64Subtract(HEAP32[$rem >> 2] ^ $1$0, HEAP32[$rem + 4 >> 2] ^ $1$1, $1$0, $1$1) | 0;
 $10$1 = tempRet0;
 STACKTOP = __stackBase__;
 return (tempRet0 = $10$1, $10$0) | 0;
}

function _needLargeZeroedMem($size) {
 $size = $size | 0;
 var $1 = 0, $14 = 0, $17 = 0, $18 = 0, $3 = 0, $7 = 0, $vararg_buffer = 0, $vararg_buffer2 = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32 | 0;
 $vararg_buffer2 = sp + 16 | 0;
 $vararg_buffer = sp;
 $1 = HEAP32[46] | 0;
 if (!(($size | 0) != 0 & $1 >>> 0 > $size >>> 0)) {
  $3 = $vararg_buffer;
  HEAP32[$3 >> 2] = $size;
  HEAP32[$3 + 4 >> 2] = 0;
  $7 = $vararg_buffer + 8 | 0;
  HEAP32[$7 >> 2] = $1;
  HEAP32[$7 + 4 >> 2] = 0;
  _errAbort(2973, $vararg_buffer);
 }
 $14 = FUNCTION_TABLE_ii[HEAP32[(HEAP32[41] | 0) + 4 >> 2] & 3]($size) | 0;
 if (!$14) {
  $17 = HEAP32[(___errno_location() | 0) >> 2] | 0;
  $18 = $vararg_buffer2;
  HEAP32[$18 >> 2] = $size;
  HEAP32[$18 + 4 >> 2] = 0;
  HEAP32[$vararg_buffer2 + 8 >> 2] = $17;
  _errAbort(3031, $vararg_buffer2);
 } else {
  _memset($14 | 0, 0, $size | 0) | 0;
  STACKTOP = sp;
  return $14 | 0;
 }
 return 0;
}

function _fputc($c, $f) {
 $c = $c | 0;
 $f = $f | 0;
 var $$0 = 0, $10 = 0, $22 = 0, $23 = 0, $31 = 0, $9 = 0, label = 0;
 if ((HEAP32[$f + 76 >> 2] | 0) < 0) label = 3; else if (!(___lockfile($f) | 0)) label = 3; else {
  if ((HEAP8[$f + 75 >> 0] | 0) == ($c | 0)) label = 10; else {
   $22 = $f + 20 | 0;
   $23 = HEAP32[$22 >> 2] | 0;
   if ($23 >>> 0 < (HEAP32[$f + 16 >> 2] | 0) >>> 0) {
    HEAP32[$22 >> 2] = $23 + 1;
    HEAP8[$23 >> 0] = $c;
    $31 = $c & 255;
   } else label = 10;
  }
  if ((label | 0) == 10) $31 = ___overflow($f, $c) | 0;
  ___unlockfile($f);
  $$0 = $31;
 }
 do if ((label | 0) == 3) {
  if ((HEAP8[$f + 75 >> 0] | 0) != ($c | 0)) {
   $9 = $f + 20 | 0;
   $10 = HEAP32[$9 >> 2] | 0;
   if ($10 >>> 0 < (HEAP32[$f + 16 >> 2] | 0) >>> 0) {
    HEAP32[$9 >> 2] = $10 + 1;
    HEAP8[$10 >> 0] = $c;
    $$0 = $c & 255;
    break;
   }
  }
  $$0 = ___overflow($f, $c) | 0;
 } while (0);
 return $$0 | 0;
}

function _scalbn($x, $n) {
 $x = +$x;
 $n = $n | 0;
 var $$0 = 0, $1 = 0.0, $12 = 0, $15 = 0, $16 = 0, $2 = 0, $5 = 0, $8 = 0.0, $9 = 0, $y$0 = 0.0;
 if (($n | 0) > 1023) {
  $1 = $x * 8988465674311579538646525.0e283;
  $2 = $n + -1023 | 0;
  if (($2 | 0) > 1023) {
   $5 = $n + -2046 | 0;
   $$0 = ($5 | 0) > 1023 ? 1023 : $5;
   $y$0 = $1 * 8988465674311579538646525.0e283;
  } else {
   $$0 = $2;
   $y$0 = $1;
  }
 } else if (($n | 0) < -1022) {
  $8 = $x * 2.2250738585072014e-308;
  $9 = $n + 1022 | 0;
  if (($9 | 0) < -1022) {
   $12 = $n + 2044 | 0;
   $$0 = ($12 | 0) < -1022 ? -1022 : $12;
   $y$0 = $8 * 2.2250738585072014e-308;
  } else {
   $$0 = $9;
   $y$0 = $8;
  }
 } else {
  $$0 = $n;
  $y$0 = $x;
 }
 $15 = _bitshift64Shl($$0 + 1023 | 0, 0, 52) | 0;
 $16 = tempRet0;
 HEAP32[tempDoublePtr >> 2] = $15;
 HEAP32[tempDoublePtr + 4 >> 2] = $16;
 return +($y$0 * +HEAPF64[tempDoublePtr >> 3]);
}

function _needLargeMem($size) {
 $size = $size | 0;
 var $1 = 0, $14 = 0, $17 = 0, $18 = 0, $3 = 0, $7 = 0, $vararg_buffer = 0, $vararg_buffer2 = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32 | 0;
 $vararg_buffer2 = sp + 16 | 0;
 $vararg_buffer = sp;
 $1 = HEAP32[46] | 0;
 if (!(($size | 0) != 0 & $1 >>> 0 > $size >>> 0)) {
  $3 = $vararg_buffer;
  HEAP32[$3 >> 2] = $size;
  HEAP32[$3 + 4 >> 2] = 0;
  $7 = $vararg_buffer + 8 | 0;
  HEAP32[$7 >> 2] = $1;
  HEAP32[$7 + 4 >> 2] = 0;
  _errAbort(2973, $vararg_buffer);
 }
 $14 = FUNCTION_TABLE_ii[HEAP32[(HEAP32[41] | 0) + 4 >> 2] & 3]($size) | 0;
 if (!$14) {
  $17 = HEAP32[(___errno_location() | 0) >> 2] | 0;
  $18 = $vararg_buffer2;
  HEAP32[$18 >> 2] = $size;
  HEAP32[$18 + 4 >> 2] = 0;
  HEAP32[$vararg_buffer2 + 8 >> 2] = $17;
  _errAbort(3031, $vararg_buffer2);
 } else {
  STACKTOP = sp;
  return $14 | 0;
 }
 return 0;
}

function _wcrtomb($s, $wc, $st) {
 $s = $s | 0;
 $wc = $wc | 0;
 $st = $st | 0;
 var $$0 = 0;
 do if (!$s) $$0 = 1; else {
  if ($wc >>> 0 < 128) {
   HEAP8[$s >> 0] = $wc;
   $$0 = 1;
   break;
  }
  if ($wc >>> 0 < 2048) {
   HEAP8[$s >> 0] = $wc >>> 6 | 192;
   HEAP8[$s + 1 >> 0] = $wc & 63 | 128;
   $$0 = 2;
   break;
  }
  if ($wc >>> 0 < 55296 | ($wc & -8192 | 0) == 57344) {
   HEAP8[$s >> 0] = $wc >>> 12 | 224;
   HEAP8[$s + 1 >> 0] = $wc >>> 6 & 63 | 128;
   HEAP8[$s + 2 >> 0] = $wc & 63 | 128;
   $$0 = 3;
   break;
  }
  if (($wc + -65536 | 0) >>> 0 < 1048576) {
   HEAP8[$s >> 0] = $wc >>> 18 | 240;
   HEAP8[$s + 1 >> 0] = $wc >>> 12 & 63 | 128;
   HEAP8[$s + 2 >> 0] = $wc >>> 6 & 63 | 128;
   HEAP8[$s + 3 >> 0] = $wc & 63 | 128;
   $$0 = 4;
   break;
  } else {
   HEAP32[(___errno_location() | 0) >> 2] = 84;
   $$0 = -1;
   break;
  }
 } while (0);
 return $$0 | 0;
}

function _needMem($size) {
 $size = $size | 0;
 var $13 = 0, $16 = 0, $17 = 0, $2 = 0, $6 = 0, $vararg_buffer = 0, $vararg_buffer2 = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32 | 0;
 $vararg_buffer2 = sp + 16 | 0;
 $vararg_buffer = sp;
 if (($size + -1 | 0) >>> 0 > 499999999) {
  $2 = $vararg_buffer;
  HEAP32[$2 >> 2] = $size;
  HEAP32[$2 + 4 >> 2] = 0;
  $6 = $vararg_buffer + 8 | 0;
  HEAP32[$6 >> 2] = 5e8;
  HEAP32[$6 + 4 >> 2] = 0;
  _errAbort(3233, $vararg_buffer);
 }
 $13 = FUNCTION_TABLE_ii[HEAP32[(HEAP32[41] | 0) + 4 >> 2] & 3]($size) | 0;
 if (!$13) {
  $16 = HEAP32[(___errno_location() | 0) >> 2] | 0;
  $17 = $vararg_buffer2;
  HEAP32[$17 >> 2] = $size;
  HEAP32[$17 + 4 >> 2] = 0;
  HEAP32[$vararg_buffer2 + 8 >> 2] = $16;
  _errAbort(3286, $vararg_buffer2);
 } else {
  _memset($13 | 0, 0, $size | 0) | 0;
  STACKTOP = sp;
  return $13 | 0;
 }
 return 0;
}

function _fopen($filename, $mode) {
 $filename = $filename | 0;
 $mode = $mode | 0;
 var $$0 = 0, $5 = 0, $7 = 0, $9 = 0, $vararg_buffer = 0, $vararg_buffer3 = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32 | 0;
 $vararg_buffer3 = sp + 16 | 0;
 $vararg_buffer = sp;
 if (!(_memchr(5125, HEAP8[$mode >> 0] | 0, 4) | 0)) {
  HEAP32[(___errno_location() | 0) >> 2] = 22;
  $$0 = 0;
 } else {
  $5 = ___fmodeflags($mode) | 0 | 32768;
  HEAP32[$vararg_buffer >> 2] = $filename;
  HEAP32[$vararg_buffer + 4 >> 2] = $5;
  HEAP32[$vararg_buffer + 8 >> 2] = 438;
  $7 = ___syscall_ret(___syscall5(5, $vararg_buffer | 0) | 0) | 0;
  if (($7 | 0) < 0) $$0 = 0; else {
   $9 = ___fdopen($7, $mode) | 0;
   if (!$9) {
    HEAP32[$vararg_buffer3 >> 2] = $7;
    ___syscall6(6, $vararg_buffer3 | 0) | 0;
    $$0 = 0;
   } else $$0 = $9;
  }
 }
 STACKTOP = sp;
 return $$0 | 0;
}

function ___overflow($f, $_c) {
 $f = $f | 0;
 $_c = $_c | 0;
 var $$0 = 0, $0 = 0, $1 = 0, $10 = 0, $2 = 0, $6 = 0, $7 = 0, $9 = 0, $c = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16 | 0;
 $c = sp;
 $0 = $_c & 255;
 HEAP8[$c >> 0] = $0;
 $1 = $f + 16 | 0;
 $2 = HEAP32[$1 >> 2] | 0;
 if (!$2) if (!(___towrite($f) | 0)) {
  $9 = HEAP32[$1 >> 2] | 0;
  label = 4;
 } else $$0 = -1; else {
  $9 = $2;
  label = 4;
 }
 do if ((label | 0) == 4) {
  $6 = $f + 20 | 0;
  $7 = HEAP32[$6 >> 2] | 0;
  if ($7 >>> 0 < $9 >>> 0) {
   $10 = $_c & 255;
   if (($10 | 0) != (HEAP8[$f + 75 >> 0] | 0)) {
    HEAP32[$6 >> 2] = $7 + 1;
    HEAP8[$7 >> 0] = $0;
    $$0 = $10;
    break;
   }
  }
  if ((FUNCTION_TABLE_iiii[HEAP32[$f + 36 >> 2] & 7]($f, $c, 1) | 0) == 1) $$0 = HEAPU8[$c >> 0] | 0; else $$0 = -1;
 } while (0);
 STACKTOP = sp;
 return $$0 | 0;
}

function _strerror($e) {
 $e = $e | 0;
 var $$lcssa = 0, $9 = 0, $i$03 = 0, $i$03$lcssa = 0, $i$12 = 0, $s$0$lcssa = 0, $s$01 = 0, $s$1 = 0, label = 0;
 $i$03 = 0;
 while (1) {
  if ((HEAPU8[5129 + $i$03 >> 0] | 0) == ($e | 0)) {
   $i$03$lcssa = $i$03;
   label = 2;
   break;
  }
  $i$03 = $i$03 + 1 | 0;
  if (($i$03 | 0) == 87) {
   $i$12 = 87;
   $s$01 = 5217;
   label = 5;
   break;
  }
 }
 if ((label | 0) == 2) if (!$i$03$lcssa) $s$0$lcssa = 5217; else {
  $i$12 = $i$03$lcssa;
  $s$01 = 5217;
  label = 5;
 }
 if ((label | 0) == 5) while (1) {
  label = 0;
  $s$1 = $s$01;
  while (1) {
   $9 = $s$1 + 1 | 0;
   if (!(HEAP8[$s$1 >> 0] | 0)) {
    $$lcssa = $9;
    break;
   } else $s$1 = $9;
  }
  $i$12 = $i$12 + -1 | 0;
  if (!$i$12) {
   $s$0$lcssa = $$lcssa;
   break;
  } else {
   $s$01 = $$lcssa;
   label = 5;
  }
 }
 return $s$0$lcssa | 0;
}

function _frexp($x, $e) {
 $x = +$x;
 $e = $e | 0;
 var $$0 = 0.0, $$01 = 0.0, $0 = 0, $1 = 0, $2 = 0, $4 = 0, $7 = 0.0, $storemerge = 0;
 HEAPF64[tempDoublePtr >> 3] = $x;
 $0 = HEAP32[tempDoublePtr >> 2] | 0;
 $1 = HEAP32[tempDoublePtr + 4 >> 2] | 0;
 $2 = _bitshift64Lshr($0 | 0, $1 | 0, 52) | 0;
 $4 = $2 & 2047;
 switch ($4 | 0) {
 case 0:
  {
   if ($x != 0.0) {
    $7 = +_frexp($x * 18446744073709551616.0, $e);
    $$01 = $7;
    $storemerge = (HEAP32[$e >> 2] | 0) + -64 | 0;
   } else {
    $$01 = $x;
    $storemerge = 0;
   }
   HEAP32[$e >> 2] = $storemerge;
   $$0 = $$01;
   break;
  }
 case 2047:
  {
   $$0 = $x;
   break;
  }
 default:
  {
   HEAP32[$e >> 2] = $4 + -1022;
   HEAP32[tempDoublePtr >> 2] = $0;
   HEAP32[tempDoublePtr + 4 >> 2] = $1 & -2146435073 | 1071644672;
   $$0 = +HEAPF64[tempDoublePtr >> 3];
  }
 }
 return +$$0;
}

function _newHashExt($powerOfTwoSize, $useLocalMem) {
 $powerOfTwoSize = $powerOfTwoSize | 0;
 $useLocalMem = $useLocalMem | 0;
 var $$powerOfTwoSize = 0, $0 = 0, $13 = 0, $4 = 0, $5 = 0;
 $0 = _needMem(40) | 0;
 $$powerOfTwoSize = ($powerOfTwoSize | 0) == 0 ? 12 : $powerOfTwoSize;
 if (($$powerOfTwoSize + -1 | 0) >>> 0 >= 28) ___assert_fail(3919, 3971, 357, 3994);
 HEAP32[$0 + 12 >> 2] = $$powerOfTwoSize;
 $4 = 1 << $$powerOfTwoSize;
 $5 = $0 + 16 | 0;
 HEAP32[$5 >> 2] = $4;
 if (!$useLocalMem) $13 = $4; else {
  HEAP32[$0 + 20 >> 2] = _lmInit(($$powerOfTwoSize | 0) < 8 ? 256 : 1 << (($$powerOfTwoSize | 0) < 16 ? $$powerOfTwoSize : 16)) | 0;
  $13 = HEAP32[$5 >> 2] | 0;
 }
 HEAP32[$0 + 4 >> 2] = $13 + -1;
 HEAP32[$0 + 8 >> 2] = _needLargeZeroedMem($13 << 2) | 0;
 HEAP32[$0 + 28 >> 2] = 1;
 HEAPF32[$0 + 32 >> 2] = 1.0;
 return $0 | 0;
}

function _lineFileNeedNum($lf, $words, $wordIx) {
 $lf = $lf | 0;
 $words = $words | 0;
 $wordIx = $wordIx | 0;
 var $1 = 0, $10 = 0, $2 = 0, $7 = 0, $9 = 0, $vararg_buffer = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16 | 0;
 $vararg_buffer = sp;
 $1 = HEAP32[$words + ($wordIx << 2) >> 2] | 0;
 $2 = HEAP8[$1 >> 0] | 0;
 if ($2 << 24 >> 24 == 45) {
  $10 = _atoi($1) | 0;
  STACKTOP = sp;
  return $10 | 0;
 }
 if ((($2 << 24 >> 24) + -48 | 0) >>> 0 < 10) {
  $10 = _atoi($1) | 0;
  STACKTOP = sp;
  return $10 | 0;
 } else {
  $7 = HEAP32[$lf + 28 >> 2] | 0;
  $9 = HEAP32[$lf + 4 >> 2] | 0;
  HEAP32[$vararg_buffer >> 2] = $wordIx + 1;
  HEAP32[$vararg_buffer + 4 >> 2] = $7;
  HEAP32[$vararg_buffer + 8 >> 2] = $9;
  HEAP32[$vararg_buffer + 12 >> 2] = $1;
  _errAbort(2238, $vararg_buffer);
 }
 return 0;
}

function _optionInt($name, $defaultVal) {
 $name = $name | 0;
 $defaultVal = $defaultVal | 0;
 var $$0 = 0, $0 = 0, $2 = 0, $6 = 0, $valEnd = 0, $vararg_buffer1 = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32 | 0;
 $vararg_buffer1 = sp + 8 | 0;
 $valEnd = sp + 16 | 0;
 $0 = HEAP32[47] | 0;
 if (!$0) _errAbort(3347, sp);
 $2 = _hashFindVal($0, $name) | 0;
 if (!$2) {
  $$0 = $defaultVal;
  STACKTOP = sp;
  return $$0 | 0;
 }
 if (!(_strcmp($2, 3387) | 0)) {
  $$0 = $defaultVal;
  STACKTOP = sp;
  return $$0 | 0;
 }
 $6 = _strtol($2, $valEnd, 10) | 0;
 if (HEAP8[$2 >> 0] | 0) if (!(HEAP8[HEAP32[$valEnd >> 2] >> 0] | 0)) {
  $$0 = $6;
  STACKTOP = sp;
  return $$0 | 0;
 }
 HEAP32[$vararg_buffer1 >> 2] = $name;
 HEAP32[$vararg_buffer1 + 4 >> 2] = $2;
 _errAbort(3390, $vararg_buffer1);
 return 0;
}

function _realloc($oldmem, $bytes) {
 $oldmem = $oldmem | 0;
 $bytes = $bytes | 0;
 var $12 = 0, $15 = 0, $20 = 0, $9 = 0, $mem$1 = 0;
 if (!$oldmem) {
  $mem$1 = _malloc($bytes) | 0;
  return $mem$1 | 0;
 }
 if ($bytes >>> 0 > 4294967231) {
  HEAP32[(___errno_location() | 0) >> 2] = 12;
  $mem$1 = 0;
  return $mem$1 | 0;
 }
 $9 = _try_realloc_chunk($oldmem + -8 | 0, $bytes >>> 0 < 11 ? 16 : $bytes + 11 & -8) | 0;
 if ($9) {
  $mem$1 = $9 + 8 | 0;
  return $mem$1 | 0;
 }
 $12 = _malloc($bytes) | 0;
 if (!$12) {
  $mem$1 = 0;
  return $mem$1 | 0;
 }
 $15 = HEAP32[$oldmem + -4 >> 2] | 0;
 $20 = ($15 & -8) - (($15 & 3 | 0) == 0 ? 8 : 4) | 0;
 _memcpy($12 | 0, $oldmem | 0, ($20 >>> 0 < $bytes >>> 0 ? $20 : $bytes) | 0) | 0;
 _free($oldmem);
 $mem$1 = $12;
 return $mem$1 | 0;
}

function _lmInit($blockSize) {
 $blockSize = $blockSize | 0;
 var $$blockSize = 0, $0 = 0, $5 = 0, $6 = 0, $8 = 0, $vararg_buffer = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16 | 0;
 $vararg_buffer = sp;
 $0 = _needMem(16) | 0;
 HEAP32[$0 >> 2] = 0;
 $$blockSize = ($blockSize | 0) < 1 ? 16384 : $blockSize;
 HEAP32[$0 + 4 >> 2] = $$blockSize;
 HEAP32[$0 + 12 >> 2] = 7;
 HEAP32[$0 + 8 >> 2] = -8;
 $5 = $$blockSize + 16 | 0;
 $6 = _needLargeZeroedMem($5) | 0;
 if (!$6) {
  $8 = $vararg_buffer;
  HEAP32[$8 >> 2] = $5;
  HEAP32[$8 + 4 >> 2] = 0;
  _errAbort(3890, $vararg_buffer);
 } else {
  HEAP32[$6 + 4 >> 2] = $6 + 16;
  HEAP32[$6 + 8 >> 2] = $6 + $5;
  HEAP32[$6 >> 2] = HEAP32[$0 >> 2];
  HEAP32[$0 >> 2] = $6;
  STACKTOP = sp;
  return $0 | 0;
 }
 return 0;
}

function _freeHashAndVals($pHash) {
 $pHash = $pHash | 0;
 var $0 = 0, $14 = 0, $15 = 0, $2 = 0, $3 = 0, $5 = 0, $hel$0$1$i = 0, $hel$02$i = 0, $i$03$i = 0;
 $0 = HEAP32[$pHash >> 2] | 0;
 if (!$0) return;
 $2 = $0 + 16 | 0;
 $3 = HEAP32[$2 >> 2] | 0;
 if (($3 | 0) > 0) {
  $5 = $0 + 8 | 0;
  $15 = $3;
  $i$03$i = 0;
  while (1) {
   $hel$0$1$i = HEAP32[(HEAP32[$5 >> 2] | 0) + ($i$03$i << 2) >> 2] | 0;
   if (!$hel$0$1$i) $14 = $15; else {
    $hel$02$i = $hel$0$1$i;
    do {
     _freeMem(HEAP32[$hel$02$i + 8 >> 2] | 0);
     $hel$02$i = HEAP32[$hel$02$i >> 2] | 0;
    } while (($hel$02$i | 0) != 0);
    $14 = HEAP32[$2 >> 2] | 0;
   }
   $i$03$i = $i$03$i + 1 | 0;
   if (($i$03$i | 0) >= ($14 | 0)) break; else $15 = $14;
  }
 }
 _freeHash($pHash);
 return;
}

function _lineFileNeedDouble($lf, $words, $wordIx) {
 $lf = $lf | 0;
 $words = $words | 0;
 $wordIx = $wordIx | 0;
 var $1 = 0, $10 = 0, $12 = 0, $2 = 0.0, $valEnd = 0, $vararg_buffer = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32 | 0;
 $vararg_buffer = sp;
 $valEnd = sp + 16 | 0;
 $1 = HEAP32[$words + ($wordIx << 2) >> 2] | 0;
 $2 = +_strtod($1, $valEnd);
 if (HEAP8[$1 >> 0] | 0) if (!(HEAP8[HEAP32[$valEnd >> 2] >> 0] | 0)) {
  STACKTOP = sp;
  return +$2;
 }
 $10 = HEAP32[$lf + 28 >> 2] | 0;
 $12 = HEAP32[$lf + 4 >> 2] | 0;
 HEAP32[$vararg_buffer >> 2] = $wordIx + 1;
 HEAP32[$vararg_buffer + 4 >> 2] = $10;
 HEAP32[$vararg_buffer + 8 >> 2] = $12;
 HEAP32[$vararg_buffer + 12 >> 2] = $1;
 _errAbort(2286, $vararg_buffer);
 return +(0.0);
}

function _mustLseek($fd, $offset, $whence) {
 $fd = $fd | 0;
 $offset = $offset | 0;
 $whence = $whence | 0;
 var $0 = 0, $12 = 0, $3 = 0, $8 = 0, $vararg_buffer = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32 | 0;
 $vararg_buffer = sp;
 $0 = _lseek($fd, $offset, $whence) | 0;
 if (($0 | 0) >= 0) {
  STACKTOP = sp;
  return $0 | 0;
 }
 $3 = (($offset | 0) < 0) << 31 >> 31;
 if (!$whence) $12 = 2707; else if (($whence | 0) == 1) $12 = 2716; else $12 = ($whence | 0) == 2 ? 2675 : 2684;
 HEAP32[$vararg_buffer >> 2] = $fd;
 $8 = $vararg_buffer + 8 | 0;
 HEAP32[$8 >> 2] = $offset;
 HEAP32[$8 + 4 >> 2] = $3;
 HEAP32[$vararg_buffer + 16 >> 2] = $12;
 HEAP32[$vararg_buffer + 20 >> 2] = $whence;
 _errnoAbort(2725, $vararg_buffer);
 return 0;
}

function _bitSetRange($b, $startIx, $bitCount) {
 $b = $b | 0;
 $startIx = $startIx | 0;
 $bitCount = $bitCount | 0;
 var $13 = 0, $16 = 0, $2 = 0, $24 = 0, $3 = 0, $4 = 0, $6 = 0, $9 = 0, $i$0$1 = 0;
 if (($bitCount | 0) < 1) return;
 $2 = $startIx + -1 + $bitCount | 0;
 $3 = $startIx >> 3;
 $4 = $2 >> 3;
 $6 = $2 & 7;
 $9 = HEAP8[4242 + ($startIx & 7) >> 0] | 0;
 if (($3 | 0) == ($4 | 0)) {
  $13 = $b + $3 | 0;
  HEAP8[$13 >> 0] = HEAP8[$13 >> 0] | HEAP8[4250 + $6 >> 0] & $9;
  return;
 }
 $16 = $b + $3 | 0;
 HEAP8[$16 >> 0] = HEAP8[$16 >> 0] | $9;
 $i$0$1 = $3 + 1 | 0;
 if (($i$0$1 | 0) < ($4 | 0)) _memset($b + $i$0$1 | 0, -1, $4 + -1 - $3 | 0) | 0;
 $24 = $b + $4 | 0;
 HEAP8[$24 >> 0] = HEAP8[$24 >> 0] | HEAP8[4250 + $6 >> 0];
 return;
}

function ___divdi3($a$0, $a$1, $b$0, $b$1) {
 $a$0 = $a$0 | 0;
 $a$1 = $a$1 | 0;
 $b$0 = $b$0 | 0;
 $b$1 = $b$1 | 0;
 var $1$0 = 0, $1$1 = 0, $2$0 = 0, $2$1 = 0, $4$0 = 0, $4$1 = 0, $7$0 = 0, $7$1 = 0;
 $1$0 = $a$1 >> 31 | (($a$1 | 0) < 0 ? -1 : 0) << 1;
 $1$1 = (($a$1 | 0) < 0 ? -1 : 0) >> 31 | (($a$1 | 0) < 0 ? -1 : 0) << 1;
 $2$0 = $b$1 >> 31 | (($b$1 | 0) < 0 ? -1 : 0) << 1;
 $2$1 = (($b$1 | 0) < 0 ? -1 : 0) >> 31 | (($b$1 | 0) < 0 ? -1 : 0) << 1;
 $4$0 = _i64Subtract($1$0 ^ $a$0, $1$1 ^ $a$1, $1$0, $1$1) | 0;
 $4$1 = tempRet0;
 $7$0 = $2$0 ^ $1$0;
 $7$1 = $2$1 ^ $1$1;
 return _i64Subtract((___udivmoddi4($4$0, $4$1, _i64Subtract($2$0 ^ $b$0, $2$1 ^ $b$1, $2$0, $2$1) | 0, tempRet0, 0) | 0) ^ $7$0, tempRet0 ^ $7$1, $7$0, $7$1) | 0;
}

function ___fflush_unlocked($f) {
 $f = $f | 0;
 var $$0 = 0, $0 = 0, $10 = 0, $11 = 0, $12 = 0, $2 = 0, $9 = 0, label = 0;
 $0 = $f + 20 | 0;
 $2 = $f + 28 | 0;
 if ((HEAP32[$0 >> 2] | 0) >>> 0 > (HEAP32[$2 >> 2] | 0) >>> 0) {
  FUNCTION_TABLE_iiii[HEAP32[$f + 36 >> 2] & 7]($f, 0, 0) | 0;
  if (!(HEAP32[$0 >> 2] | 0)) $$0 = -1; else label = 3;
 } else label = 3;
 if ((label | 0) == 3) {
  $9 = $f + 4 | 0;
  $10 = HEAP32[$9 >> 2] | 0;
  $11 = $f + 8 | 0;
  $12 = HEAP32[$11 >> 2] | 0;
  if ($10 >>> 0 < $12 >>> 0) FUNCTION_TABLE_iiii[HEAP32[$f + 40 >> 2] & 7]($f, $10 - $12 | 0, 1) | 0;
  HEAP32[$f + 16 >> 2] = 0;
  HEAP32[$2 >> 2] = 0;
  HEAP32[$0 >> 2] = 0;
  HEAP32[$11 >> 2] = 0;
  HEAP32[$9 >> 2] = 0;
  $$0 = 0;
 }
 return $$0 | 0;
}

function _dyStringAppend($ds, $string) {
 $ds = $ds | 0;
 $string = $string | 0;
 var $$$i = 0, $0 = 0, $1 = 0, $10 = 0, $12 = 0, $16 = 0, $18 = 0, $2 = 0, $3 = 0, $4 = 0, $7 = 0;
 $0 = _strlen($string) | 0;
 $1 = $ds + 12 | 0;
 $2 = HEAP32[$1 >> 2] | 0;
 $3 = $2 + $0 | 0;
 $4 = $ds + 8 | 0;
 if (($3 | 0) > (HEAP32[$4 >> 2] | 0)) {
  $7 = $3 + $2 | 0;
  $10 = ~~(+($2 | 0) * 1.5);
  $$$i = ($7 | 0) < ($10 | 0) ? $10 : $7;
  $12 = $ds + 4 | 0;
  $16 = _needMoreMem(HEAP32[$12 >> 2] | 0, $2 + 1 | 0, $$$i + 1 | 0) | 0;
  HEAP32[$12 >> 2] = $16;
  HEAP32[$4 >> 2] = $$$i;
  $18 = $16;
 } else $18 = HEAP32[$ds + 4 >> 2] | 0;
 _memcpy($18 + $2 | 0, $string | 0, $0 | 0) | 0;
 HEAP32[$1 >> 2] = $3;
 HEAP8[$18 + $3 >> 0] = 0;
 return;
}

function _strtox_304($s, $p, $prec) {
 $s = $s | 0;
 $p = $p | 0;
 $prec = $prec | 0;
 var $0 = 0, $1 = 0, $10 = 0, $4 = 0.0, $f = 0, dest = 0, sp = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 112 | 0;
 $f = sp;
 dest = $f;
 stop = dest + 112 | 0;
 do {
  HEAP32[dest >> 2] = 0;
  dest = dest + 4 | 0;
 } while ((dest | 0) < (stop | 0));
 $0 = $f + 4 | 0;
 HEAP32[$0 >> 2] = $s;
 $1 = $f + 8 | 0;
 HEAP32[$1 >> 2] = -1;
 HEAP32[$f + 44 >> 2] = $s;
 HEAP32[$f + 76 >> 2] = -1;
 ___shlim($f, 0);
 $4 = +___floatscan($f, $prec, 1);
 $10 = (HEAP32[$0 >> 2] | 0) - (HEAP32[$1 >> 2] | 0) + (HEAP32[$f + 108 >> 2] | 0) | 0;
 if ($p) HEAP32[$p >> 2] = ($10 | 0) != 0 ? $s + $10 | 0 : $s;
 STACKTOP = sp;
 return +$4;
}

function _safef($buffer, $bufSize, $format, $varargs) {
 $buffer = $buffer | 0;
 $bufSize = $bufSize | 0;
 $format = $format | 0;
 $varargs = $varargs | 0;
 var $0 = 0, $args = 0, $vararg_buffer = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32 | 0;
 $vararg_buffer = sp;
 $args = sp + 16 | 0;
 HEAP32[$args >> 2] = $varargs;
 $0 = _vsnprintf($buffer, $bufSize, $format, $args) | 0;
 if (($0 | 0) > -1 & ($0 | 0) < ($bufSize | 0)) {
  STACKTOP = sp;
  return $0 | 0;
 } else {
  HEAP8[$buffer + ($bufSize + -1) >> 0] = 0;
  HEAP32[$vararg_buffer >> 2] = $bufSize;
  HEAP32[$vararg_buffer + 4 >> 2] = $format;
  HEAP32[$vararg_buffer + 8 >> 2] = $buffer;
  _errAbort(2771, $vararg_buffer);
 }
 return 0;
}

function _memcpy(dest, src, num) {
 dest = dest | 0;
 src = src | 0;
 num = num | 0;
 var ret = 0;
 if ((num | 0) >= 4096) return _emscripten_memcpy_big(dest | 0, src | 0, num | 0) | 0;
 ret = dest | 0;
 if ((dest & 3) == (src & 3)) {
  while (dest & 3) {
   if (!num) return ret | 0;
   HEAP8[dest >> 0] = HEAP8[src >> 0] | 0;
   dest = dest + 1 | 0;
   src = src + 1 | 0;
   num = num - 1 | 0;
  }
  while ((num | 0) >= 4) {
   HEAP32[dest >> 2] = HEAP32[src >> 2];
   dest = dest + 4 | 0;
   src = src + 4 | 0;
   num = num - 4 | 0;
  }
 }
 while ((num | 0) > 0) {
  HEAP8[dest >> 0] = HEAP8[src >> 0] | 0;
  dest = dest + 1 | 0;
  src = src + 1 | 0;
  num = num - 1 | 0;
 }
 return ret | 0;
}

function _memset(ptr, value, num) {
 ptr = ptr | 0;
 value = value | 0;
 num = num | 0;
 var stop = 0, value4 = 0, stop4 = 0, unaligned = 0;
 stop = ptr + num | 0;
 if ((num | 0) >= 20) {
  value = value & 255;
  unaligned = ptr & 3;
  value4 = value | value << 8 | value << 16 | value << 24;
  stop4 = stop & ~3;
  if (unaligned) {
   unaligned = ptr + 4 - unaligned | 0;
   while ((ptr | 0) < (unaligned | 0)) {
    HEAP8[ptr >> 0] = value;
    ptr = ptr + 1 | 0;
   }
  }
  while ((ptr | 0) < (stop4 | 0)) {
   HEAP32[ptr >> 2] = value4;
   ptr = ptr + 4 | 0;
  }
 }
 while ((ptr | 0) < (stop | 0)) {
  HEAP8[ptr >> 0] = value;
  ptr = ptr + 1 | 0;
 }
 return ptr - num | 0;
}

function _getDecompressor($fileName) {
 $fileName = $fileName | 0;
 var $0 = 0, $15 = 0, $result$0 = 0, label = 0;
 $0 = _cloneString($fileName) | 0;
 if (!(_startsWith(2334, $fileName) | 0)) if (!(_startsWith(2342, $fileName) | 0)) {
  if (_startsWith(2351, $fileName) | 0) label = 4;
 } else label = 4; else label = 4;
 if ((label | 0) == 4) _cgiDecode($fileName, $0, _strlen($fileName) | 0);
 if (!(_endsWith($0, 2358) | 0)) if (!(_endsWith($0, 2362) | 0)) if (!(_endsWith($0, 2365) | 0)) {
  $15 = (_endsWith($0, 2370) | 0) == 0;
  $result$0 = $15 ? 0 : 100;
 } else $result$0 = 136; else $result$0 = 124; else $result$0 = 112;
 _freeMem($0);
 return $result$0 | 0;
}

function ___toread($f) {
 $f = $f | 0;
 var $$0 = 0, $0 = 0, $15 = 0, $2 = 0, $21 = 0, $6 = 0, $8 = 0;
 $0 = $f + 74 | 0;
 $2 = HEAP8[$0 >> 0] | 0;
 HEAP8[$0 >> 0] = $2 + 255 | $2;
 $6 = $f + 20 | 0;
 $8 = $f + 44 | 0;
 if ((HEAP32[$6 >> 2] | 0) >>> 0 > (HEAP32[$8 >> 2] | 0) >>> 0) FUNCTION_TABLE_iiii[HEAP32[$f + 36 >> 2] & 7]($f, 0, 0) | 0;
 HEAP32[$f + 16 >> 2] = 0;
 HEAP32[$f + 28 >> 2] = 0;
 HEAP32[$6 >> 2] = 0;
 $15 = HEAP32[$f >> 2] | 0;
 if (!($15 & 20)) {
  $21 = HEAP32[$8 >> 2] | 0;
  HEAP32[$f + 8 >> 2] = $21;
  HEAP32[$f + 4 >> 2] = $21;
  $$0 = 0;
 } else if (!($15 & 4)) $$0 = -1; else {
  HEAP32[$f >> 2] = $15 | 32;
  $$0 = -1;
 }
 return $$0 | 0;
}

function _fclose($f) {
 $f = $f | 0;
 var $$pre = 0, $12 = 0, $18 = 0, $22 = 0, $24 = 0, $5 = 0, $7 = 0;
 if ((HEAP32[$f + 76 >> 2] | 0) > -1) {}
 $5 = (HEAP32[$f >> 2] & 1 | 0) != 0;
 if (!$5) {
  ___lock(468);
  $7 = HEAP32[$f + 52 >> 2] | 0;
  $$pre = $f + 56 | 0;
  if ($7) HEAP32[$7 + 56 >> 2] = HEAP32[$$pre >> 2];
  $12 = HEAP32[$$pre >> 2] | 0;
  if ($12) HEAP32[$12 + 52 >> 2] = $7;
  if ((HEAP32[116] | 0) == ($f | 0)) HEAP32[116] = $12;
  ___unlock(468);
 }
 $18 = _fflush($f) | 0;
 $22 = FUNCTION_TABLE_ii[HEAP32[$f + 12 >> 2] & 3]($f) | 0 | $18;
 $24 = HEAP32[$f + 92 >> 2] | 0;
 if ($24) _free($24);
 if (!$5) _free($f);
 return $22 | 0;
}

function _open($filename, $flags, $varargs) {
 $filename = $filename | 0;
 $flags = $flags | 0;
 $varargs = $varargs | 0;
 var $5 = 0, $6 = 0, $9 = 0, $ap = 0, $vararg_buffer = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32 | 0;
 $vararg_buffer = sp;
 $ap = sp + 16 | 0;
 HEAP32[$ap >> 2] = $varargs;
 $5 = (HEAP32[$ap >> 2] | 0) + (4 - 1) & ~(4 - 1);
 $6 = HEAP32[$5 >> 2] | 0;
 HEAP32[$ap >> 2] = $5 + 4;
 HEAP32[$vararg_buffer >> 2] = $filename;
 HEAP32[$vararg_buffer + 4 >> 2] = $flags | 32768;
 HEAP32[$vararg_buffer + 8 >> 2] = $6;
 $9 = ___syscall_ret(___syscall5(5, $vararg_buffer | 0) | 0) | 0;
 STACKTOP = sp;
 return $9 | 0;
}

function ___stdio_seek($f, $off, $whence) {
 $f = $f | 0;
 $off = $off | 0;
 $whence = $whence | 0;
 var $5 = 0, $ret = 0, $vararg_buffer = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32 | 0;
 $vararg_buffer = sp;
 $ret = sp + 20 | 0;
 HEAP32[$vararg_buffer >> 2] = HEAP32[$f + 60 >> 2];
 HEAP32[$vararg_buffer + 4 >> 2] = 0;
 HEAP32[$vararg_buffer + 8 >> 2] = $off;
 HEAP32[$vararg_buffer + 12 >> 2] = $ret;
 HEAP32[$vararg_buffer + 16 >> 2] = $whence;
 if ((___syscall_ret(___syscall140(140, $vararg_buffer | 0) | 0) | 0) < 0) {
  HEAP32[$ret >> 2] = -1;
  $5 = -1;
 } else $5 = HEAP32[$ret >> 2] | 0;
 STACKTOP = sp;
 return $5 | 0;
}

function _getFileNameFromHdrSig($m) {
 $m = $m | 0;
 var $$0 = 0, $buf = 0, $ext$0$ph = 0, $vararg_buffer = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32 | 0;
 $vararg_buffer = sp;
 $buf = sp + 4 | 0;
 if (!(_startsWith(2067, $m) | 0)) if (!(_startsWith(2070, $m) | 0)) if (!(_startsWith(2074, $m) | 0)) if (!(_startsWith(2077, $m) | 0)) {
  $$0 = 0;
  STACKTOP = sp;
  return $$0 | 0;
 } else $ext$0$ph = 2082; else $ext$0$ph = 2086; else $ext$0$ph = 2090; else $ext$0$ph = 2092;
 HEAP32[$vararg_buffer >> 2] = $ext$0$ph;
 _safef($buf, 20, 2095, $vararg_buffer) | 0;
 $$0 = _cloneString($buf) | 0;
 STACKTOP = sp;
 return $$0 | 0;
}

function ___fmodeflags($mode) {
 $mode = $mode | 0;
 var $1 = 0, $2 = 0, $4 = 0, $7 = 0, $flags$0 = 0, $flags$0$ = 0, $flags$2 = 0, $flags$2$ = 0, $flags$4 = 0;
 $1 = (_strchr($mode, 43) | 0) == 0;
 $2 = HEAP8[$mode >> 0] | 0;
 $flags$0 = $1 ? $2 << 24 >> 24 != 114 & 1 : 2;
 $4 = (_strchr($mode, 120) | 0) == 0;
 $flags$0$ = $4 ? $flags$0 : $flags$0 | 128;
 $7 = (_strchr($mode, 101) | 0) == 0;
 $flags$2 = $7 ? $flags$0$ : $flags$0$ | 524288;
 $flags$2$ = $2 << 24 >> 24 == 114 ? $flags$2 : $flags$2 | 64;
 $flags$4 = $2 << 24 >> 24 == 119 ? $flags$2$ | 512 : $flags$2$;
 return ($2 << 24 >> 24 == 97 ? $flags$4 | 1024 : $flags$4) | 0;
}

function _strtox($s, $p, $base, $0, $1) {
 $s = $s | 0;
 $p = $p | 0;
 $base = $base | 0;
 $0 = $0 | 0;
 $1 = $1 | 0;
 var $2 = 0, $6 = 0, $8 = 0, $f = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 112 | 0;
 $f = sp;
 HEAP32[$f >> 2] = 0;
 $2 = $f + 4 | 0;
 HEAP32[$2 >> 2] = $s;
 HEAP32[$f + 44 >> 2] = $s;
 $6 = $f + 8 | 0;
 HEAP32[$6 >> 2] = ($s | 0) < 0 ? -1 : $s + 2147483647 | 0;
 HEAP32[$f + 76 >> 2] = -1;
 ___shlim($f, 0);
 $8 = ___intscan($f, $base, 1, $0, $1) | 0;
 if ($p) HEAP32[$p >> 2] = $s + ((HEAP32[$2 >> 2] | 0) + (HEAP32[$f + 108 >> 2] | 0) - (HEAP32[$6 >> 2] | 0));
 STACKTOP = sp;
 return $8 | 0;
}

function _errnoWarn($format, $varargs) {
 $format = $format | 0;
 $varargs = $varargs | 0;
 var $3 = 0, $args = 0, $fbuf = 0, $vararg_buffer = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 544 | 0;
 $vararg_buffer = sp;
 $fbuf = sp + 24 | 0;
 $args = sp + 8 | 0;
 HEAP32[$args >> 2] = $varargs;
 HEAP32[$vararg_buffer >> 2] = _strerror(HEAP32[(___errno_location() | 0) >> 2] | 0) | 0;
 HEAP32[$vararg_buffer + 4 >> 2] = $format;
 _sprintf($fbuf, 1942, $vararg_buffer) | 0;
 $3 = _getThreadVars() | 0;
 FUNCTION_TABLE_vii[HEAP32[$3 + 8 + (HEAP32[$3 + 88 >> 2] << 2) >> 2] & 1]($fbuf, $args);
 STACKTOP = sp;
 return;
}

function _strcmp($l, $r) {
 $l = $l | 0;
 $r = $r | 0;
 var $$014 = 0, $$05 = 0, $$lcssa = 0, $$lcssa2 = 0, $0 = 0, $1 = 0, $6 = 0, $7 = 0;
 $0 = HEAP8[$l >> 0] | 0;
 $1 = HEAP8[$r >> 0] | 0;
 if ($0 << 24 >> 24 == 0 ? 1 : $0 << 24 >> 24 != $1 << 24 >> 24) {
  $$lcssa = $0;
  $$lcssa2 = $1;
 } else {
  $$014 = $l;
  $$05 = $r;
  do {
   $$014 = $$014 + 1 | 0;
   $$05 = $$05 + 1 | 0;
   $6 = HEAP8[$$014 >> 0] | 0;
   $7 = HEAP8[$$05 >> 0] | 0;
  } while (!($6 << 24 >> 24 == 0 ? 1 : $6 << 24 >> 24 != $7 << 24 >> 24));
  $$lcssa = $6;
  $$lcssa2 = $7;
 }
 return ($$lcssa & 255) - ($$lcssa2 & 255) | 0;
}

function _mustWriteFd($fd, $buf, $size) {
 $fd = $fd | 0;
 $buf = $buf | 0;
 $size = $size | 0;
 var $0 = 0, $5 = 0, $9 = 0, $vararg_buffer1 = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32 | 0;
 $vararg_buffer1 = sp + 8 | 0;
 $0 = _write($fd, $buf, $size) | 0;
 if ($0 >>> 0 >= $size >>> 0) {
  STACKTOP = sp;
  return;
 }
 if (($0 | 0) < 0) _errnoAbort(2581, sp); else {
  $5 = $vararg_buffer1;
  HEAP32[$5 >> 2] = $0;
  HEAP32[$5 + 4 >> 2] = (($0 | 0) < 0) << 31 >> 31;
  $9 = $vararg_buffer1 + 8 | 0;
  HEAP32[$9 >> 2] = $size;
  HEAP32[$9 + 4 >> 2] = 0;
  _errAbort(2607, $vararg_buffer1);
 }
}

function _lseek($fd, $offset, $whence) {
 $fd = $fd | 0;
 $offset = $offset | 0;
 $whence = $whence | 0;
 var $2 = 0, $result = 0, $vararg_buffer = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32 | 0;
 $vararg_buffer = sp;
 $result = sp + 20 | 0;
 HEAP32[$vararg_buffer >> 2] = $fd;
 HEAP32[$vararg_buffer + 4 >> 2] = 0;
 HEAP32[$vararg_buffer + 8 >> 2] = $offset;
 HEAP32[$vararg_buffer + 12 >> 2] = $result;
 HEAP32[$vararg_buffer + 16 >> 2] = $whence;
 $2 = (___syscall_ret(___syscall140(140, $vararg_buffer | 0) | 0) | 0) != 0;
 STACKTOP = sp;
 return ($2 ? -1 : HEAP32[$result >> 2] | 0) | 0;
}

function _puts($s) {
 $s = $s | 0;
 var $0 = 0, $10 = 0, $11 = 0, $18 = 0, $19 = 0;
 $0 = HEAP32[55] | 0;
 if ((HEAP32[$0 + 76 >> 2] | 0) > -1) $19 = ___lockfile($0) | 0; else $19 = 0;
 do if ((_fputs($s, $0) | 0) < 0) $18 = 1; else {
  if ((HEAP8[$0 + 75 >> 0] | 0) != 10) {
   $10 = $0 + 20 | 0;
   $11 = HEAP32[$10 >> 2] | 0;
   if ($11 >>> 0 < (HEAP32[$0 + 16 >> 2] | 0) >>> 0) {
    HEAP32[$10 >> 2] = $11 + 1;
    HEAP8[$11 >> 0] = 10;
    $18 = 0;
    break;
   }
  }
  $18 = (___overflow($0, 10) | 0) < 0;
 } while (0);
 if ($19) ___unlockfile($0);
 return $18 << 31 >> 31 | 0;
}

function _slReverse($listPt) {
 $listPt = $listPt | 0;
 var $0 = 0, $2 = 0, $newList$0$lcssa = 0, $newList$01 = 0, $newList$01$phi = 0, $next$02 = 0;
 $0 = HEAP32[$listPt >> 2] | 0;
 if (!$0) $newList$0$lcssa = 0; else {
  $newList$01 = 0;
  $next$02 = $0;
  while (1) {
   $2 = HEAP32[$next$02 >> 2] | 0;
   HEAP32[$next$02 >> 2] = $newList$01;
   if (!$2) {
    $newList$0$lcssa = $next$02;
    break;
   } else {
    $newList$01$phi = $next$02;
    $next$02 = $2;
    $newList$01 = $newList$01$phi;
   }
  }
 }
 HEAP32[$listPt >> 2] = $newList$0$lcssa;
 return;
}

function _carefulClose($pFile) {
 $pFile = $pFile | 0;
 var $1 = 0, $6 = 0, $vararg_buffer = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16 | 0;
 $vararg_buffer = sp;
 if (!$pFile) {
  STACKTOP = sp;
  return;
 }
 $1 = HEAP32[$pFile >> 2] | 0;
 if (!$1) {
  STACKTOP = sp;
  return;
 }
 $6 = ($1 | 0) == (HEAP32[55] | 0);
 if (($1 | 0) == (HEAP32[58] | 0) | $6) {
  if ($6) _fflush($1) | 0;
 } else if (_fclose($1) | 0) {
  _errnoWarn(2757, $vararg_buffer);
  HEAP32[$pFile >> 2] = 0;
  _noWarnAbort();
 }
 HEAP32[$pFile >> 2] = 0;
 STACKTOP = sp;
 return;
}

function _startsWith($start, $string) {
 $start = $start | 0;
 $string = $string | 0;
 var $$0 = 0, $0 = 0, $9 = 0, $i$01 = 0, label = 0;
 $0 = HEAP8[$start >> 0] | 0;
 if (!($0 << 24 >> 24)) {
  $$0 = 1;
  return $$0 | 0;
 } else {
  $9 = $0;
  $i$01 = 0;
 }
 while (1) {
  if ((HEAP8[$string + $i$01 >> 0] | 0) != $9 << 24 >> 24) {
   $$0 = 0;
   label = 4;
   break;
  }
  $i$01 = $i$01 + 1 | 0;
  $9 = HEAP8[$start + $i$01 >> 0] | 0;
  if (!($9 << 24 >> 24)) {
   $$0 = 1;
   label = 4;
   break;
  }
 }
 if ((label | 0) == 4) return $$0 | 0;
 return 0;
}

function ___stdout_write($f, $buf, $len) {
 $f = $f | 0;
 $buf = $buf | 0;
 $len = $len | 0;
 var $9 = 0, $vararg_buffer = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 80 | 0;
 $vararg_buffer = sp;
 HEAP32[$f + 36 >> 2] = 4;
 if (!(HEAP32[$f >> 2] & 64)) {
  HEAP32[$vararg_buffer >> 2] = HEAP32[$f + 60 >> 2];
  HEAP32[$vararg_buffer + 4 >> 2] = 21505;
  HEAP32[$vararg_buffer + 8 >> 2] = sp + 12;
  if (___syscall54(54, $vararg_buffer | 0) | 0) HEAP8[$f + 75 >> 0] = -1;
 }
 $9 = ___stdio_write($f, $buf, $len) | 0;
 STACKTOP = sp;
 return $9 | 0;
}

function _verbose($verbosity, $format, $varargs) {
 $verbosity = $verbosity | 0;
 $format = $format | 0;
 $varargs = $varargs | 0;
 var $2 = 0, $4 = 0, $6 = 0, $args = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16 | 0;
 $args = sp;
 HEAP32[$args >> 2] = $varargs;
 if ((HEAP32[37] | 0) < ($verbosity | 0)) {
  STACKTOP = sp;
  return;
 }
 $2 = HEAP32[38] | 0;
 if (!$2) {
  $4 = HEAP32[57] | 0;
  HEAP32[38] = $4;
  $6 = $4;
 } else $6 = $2;
 _vfprintf($6, $format, $args) | 0;
 _fflush(HEAP32[38] | 0) | 0;
 STACKTOP = sp;
 return;
}

function _fwrite($src, $size, $nmemb, $f) {
 $src = $src | 0;
 $size = $size | 0;
 $nmemb = $nmemb | 0;
 $f = $f | 0;
 var $0 = 0, $10 = 0, $6 = 0, $7 = 0, $phitmp = 0;
 $0 = Math_imul($nmemb, $size) | 0;
 if ((HEAP32[$f + 76 >> 2] | 0) > -1) {
  $phitmp = (___lockfile($f) | 0) == 0;
  $6 = ___fwritex($src, $0, $f) | 0;
  if ($phitmp) $7 = $6; else {
   ___unlockfile($f);
   $7 = $6;
  }
 } else $7 = ___fwritex($src, $0, $f) | 0;
 if (($7 | 0) == ($0 | 0)) $10 = $nmemb; else $10 = ($7 >>> 0) / ($size >>> 0) | 0;
 return $10 | 0;
}

function _lineFileNextReal($lf, $retStart) {
 $lf = $lf | 0;
 $retStart = $retStart | 0;
 var $$0 = 0, label = 0;
 if (!(_lineFileNext($lf, $retStart, 0) | 0)) {
  $$0 = 0;
  return $$0 | 0;
 }
 L3 : while (1) {
  switch (HEAP8[(_skipLeadingSpaces(HEAP32[$retStart >> 2] | 0) | 0) >> 0] | 0) {
  case 35:
  case 0:
   break;
  default:
   {
    $$0 = 1;
    label = 4;
    break L3;
   }
  }
  if (!(_lineFileNext($lf, $retStart, 0) | 0)) {
   $$0 = 0;
   label = 4;
   break;
  }
 }
 if ((label | 0) == 4) return $$0 | 0;
 return 0;
}

function ___string_read($f, $buf, $len) {
 $f = $f | 0;
 $buf = $buf | 0;
 $len = $len | 0;
 var $0 = 0, $1 = 0, $11 = 0, $2 = 0, $3 = 0, $k$0 = 0, $k$0$len = 0;
 $0 = $f + 84 | 0;
 $1 = HEAP32[$0 >> 2] | 0;
 $2 = $len + 256 | 0;
 $3 = _memchr($1, 0, $2) | 0;
 $k$0 = ($3 | 0) == 0 ? $2 : $3 - $1 | 0;
 $k$0$len = $k$0 >>> 0 < $len >>> 0 ? $k$0 : $len;
 _memcpy($buf | 0, $1 | 0, $k$0$len | 0) | 0;
 HEAP32[$f + 4 >> 2] = $1 + $k$0$len;
 $11 = $1 + $k$0 | 0;
 HEAP32[$f + 8 >> 2] = $11;
 HEAP32[$0 >> 2] = $11;
 return $k$0$len | 0;
}

function ___muldi3($a$0, $a$1, $b$0, $b$1) {
 $a$0 = $a$0 | 0;
 $a$1 = $a$1 | 0;
 $b$0 = $b$0 | 0;
 $b$1 = $b$1 | 0;
 var $x_sroa_0_0_extract_trunc = 0, $y_sroa_0_0_extract_trunc = 0, $1$0 = 0, $1$1 = 0;
 $x_sroa_0_0_extract_trunc = $a$0;
 $y_sroa_0_0_extract_trunc = $b$0;
 $1$0 = ___muldsi3($x_sroa_0_0_extract_trunc, $y_sroa_0_0_extract_trunc) | 0;
 $1$1 = tempRet0;
 return (tempRet0 = (Math_imul($a$1, $y_sroa_0_0_extract_trunc) | 0) + (Math_imul($b$1, $x_sroa_0_0_extract_trunc) | 0) + $1$1 | $1$1 & 0, $1$0 | 0 | 0) | 0;
}

function _lineFileOpen($fileName, $zTerm) {
 $fileName = $fileName | 0;
 $zTerm = $zTerm | 0;
 var $0 = 0, $4 = 0, $vararg_buffer = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16 | 0;
 $vararg_buffer = sp;
 $0 = _lineFileMayOpen($fileName, $zTerm) | 0;
 if (!$0) {
  $4 = _strerror(HEAP32[(___errno_location() | 0) >> 2] | 0) | 0;
  HEAP32[$vararg_buffer >> 2] = $fileName;
  HEAP32[$vararg_buffer + 4 >> 2] = $4;
  _errAbort(2163, $vararg_buffer);
 } else {
  STACKTOP = sp;
  return $0 | 0;
 }
 return 0;
}

function ___towrite($f) {
 $f = $f | 0;
 var $$0 = 0, $0 = 0, $13 = 0, $2 = 0, $6 = 0;
 $0 = $f + 74 | 0;
 $2 = HEAP8[$0 >> 0] | 0;
 HEAP8[$0 >> 0] = $2 + 255 | $2;
 $6 = HEAP32[$f >> 2] | 0;
 if (!($6 & 8)) {
  HEAP32[$f + 8 >> 2] = 0;
  HEAP32[$f + 4 >> 2] = 0;
  $13 = HEAP32[$f + 44 >> 2] | 0;
  HEAP32[$f + 28 >> 2] = $13;
  HEAP32[$f + 20 >> 2] = $13;
  HEAP32[$f + 16 >> 2] = $13 + (HEAP32[$f + 48 >> 2] | 0);
  $$0 = 0;
 } else {
  HEAP32[$f >> 2] = $6 | 32;
  $$0 = -1;
 }
 return $$0 | 0;
}

function _errnoAbort($format, $varargs) {
 $format = $format | 0;
 $varargs = $varargs | 0;
 var $args = 0, $fbuf = 0, $vararg_buffer = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 544 | 0;
 $vararg_buffer = sp;
 $fbuf = sp + 24 | 0;
 $args = sp + 8 | 0;
 HEAP32[$args >> 2] = $varargs;
 HEAP32[$vararg_buffer >> 2] = _strerror(HEAP32[(___errno_location() | 0) >> 2] | 0) | 0;
 HEAP32[$vararg_buffer + 4 >> 2] = $format;
 _sprintf($fbuf, 1942, $vararg_buffer) | 0;
 _vaErrAbort($fbuf, $args);
}

function _vsscanf($s, $fmt, $ap) {
 $s = $s | 0;
 $fmt = $fmt | 0;
 $ap = $ap | 0;
 var $4 = 0, $f = 0, dest = 0, sp = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 112 | 0;
 $f = sp;
 dest = $f;
 stop = dest + 112 | 0;
 do {
  HEAP32[dest >> 2] = 0;
  dest = dest + 4 | 0;
 } while ((dest | 0) < (stop | 0));
 HEAP32[$f + 32 >> 2] = 6;
 HEAP32[$f + 44 >> 2] = $s;
 HEAP32[$f + 76 >> 2] = -1;
 HEAP32[$f + 84 >> 2] = $s;
 $4 = _vfscanf($f, $fmt, $ap) | 0;
 STACKTOP = sp;
 return $4 | 0;
}

function _optionInit($pArgc, $argv, $optionSpecs) {
 $pArgc = $pArgc | 0;
 $argv = $argv | 0;
 $optionSpecs = $optionSpecs | 0;
 var $2 = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16 | 0;
 if (HEAP32[47] | 0) {
  STACKTOP = sp;
  return;
 }
 $2 = _parseOptions($pArgc, $argv, 0, $optionSpecs, 0) | 0;
 HEAP32[47] = $2;
 if (!$2) _errAbort(3347, sp);
 if (_hashFindVal($2, 3379) | 0) _verboseSetLevel(_optionInt(3379, 0) | 0);
 HEAP32[48] = $optionSpecs;
 STACKTOP = sp;
 return;
}

function _eraseTrailingSpaces($s) {
 $s = $s | 0;
 var $0 = 0, $2 = 0, $i$02$in = 0, label = 0, $i$02$in$looptemp = 0;
 $0 = _strlen($s) | 0;
 if (($0 | 0) > 0) $i$02$in = $0; else return;
 while (1) {
  $i$02$in$looptemp = $i$02$in;
  $i$02$in = $i$02$in + -1 | 0;
  $2 = $s + $i$02$in | 0;
  if (!(_isspace(HEAP8[$2 >> 0] | 0) | 0)) {
   label = 4;
   break;
  }
  HEAP8[$2 >> 0] = 0;
  if (($i$02$in$looptemp | 0) <= 1) {
   label = 4;
   break;
  }
 }
 if ((label | 0) == 4) return;
}

function copyTempDouble(ptr) {
 ptr = ptr | 0;
 HEAP8[tempDoublePtr >> 0] = HEAP8[ptr >> 0];
 HEAP8[tempDoublePtr + 1 >> 0] = HEAP8[ptr + 1 >> 0];
 HEAP8[tempDoublePtr + 2 >> 0] = HEAP8[ptr + 2 >> 0];
 HEAP8[tempDoublePtr + 3 >> 0] = HEAP8[ptr + 3 >> 0];
 HEAP8[tempDoublePtr + 4 >> 0] = HEAP8[ptr + 4 >> 0];
 HEAP8[tempDoublePtr + 5 >> 0] = HEAP8[ptr + 5 >> 0];
 HEAP8[tempDoublePtr + 6 >> 0] = HEAP8[ptr + 6 >> 0];
 HEAP8[tempDoublePtr + 7 >> 0] = HEAP8[ptr + 7 >> 0];
}

function _skipToSpaces($s) {
 $s = $s | 0;
 var $$0 = 0, $$012 = 0, $1 = 0, $4 = 0;
 L1 : do if (!$s) $$0 = 0; else {
  $1 = HEAP8[$s >> 0] | 0;
  if (!($1 << 24 >> 24)) $$0 = 0; else {
   $$012 = $s;
   $4 = $1;
   while (1) {
    if (_isspace($4 << 24 >> 24) | 0) {
     $$0 = $$012;
     break L1;
    }
    $$012 = $$012 + 1 | 0;
    $4 = HEAP8[$$012 >> 0] | 0;
    if (!($4 << 24 >> 24)) {
     $$0 = 0;
     break;
    }
   }
  }
 } while (0);
 return $$0 | 0;
}

function _defaultVaWarn($format, $args) {
 $format = $format | 0;
 $args = $args | 0;
 var $3 = 0, $4 = 0, $5 = 0;
 if (!$format) return;
 if (!(HEAP32[7] | 0)) $4 = HEAP32[55] | 0; else {
  _puts(1948) | 0;
  _puts(1973) | 0;
  $3 = HEAP32[55] | 0;
  _vfprintf($3, $format, $args) | 0;
  _fputc(10, $3) | 0;
  _fflush($3) | 0;
  $4 = $3;
 }
 _fflush($4) | 0;
 $5 = HEAP32[57] | 0;
 _vfprintf($5, $format, $args) | 0;
 _fputc(10, $5) | 0;
 _fflush($5) | 0;
 return;
}

function _dup2($old, $new) {
 $old = $old | 0;
 $new = $new | 0;
 var $$lcssa = 0, $0 = 0, $2 = 0, $vararg_buffer = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16 | 0;
 $vararg_buffer = sp;
 do {
  HEAP32[$vararg_buffer >> 2] = $old;
  HEAP32[$vararg_buffer + 4 >> 2] = $new;
  $0 = ___syscall63(63, $vararg_buffer | 0) | 0;
 } while (($0 | 0) == -16);
 $$lcssa = $0;
 $2 = ___syscall_ret($$lcssa) | 0;
 STACKTOP = sp;
 return $2 | 0;
}

function ___muldsi3($a, $b) {
 $a = $a | 0;
 $b = $b | 0;
 var $1 = 0, $2 = 0, $3 = 0, $6 = 0, $8 = 0, $11 = 0, $12 = 0;
 $1 = $a & 65535;
 $2 = $b & 65535;
 $3 = Math_imul($2, $1) | 0;
 $6 = $a >>> 16;
 $8 = ($3 >>> 16) + (Math_imul($2, $6) | 0) | 0;
 $11 = $b >>> 16;
 $12 = Math_imul($11, $1) | 0;
 return (tempRet0 = ($8 >>> 16) + (Math_imul($11, $6) | 0) + ((($8 & 65535) + $12 | 0) >>> 16) | 0, $8 + $12 << 16 | $3 & 65535 | 0) | 0;
}

function _memmove(dest, src, num) {
 dest = dest | 0;
 src = src | 0;
 num = num | 0;
 var ret = 0;
 if ((src | 0) < (dest | 0) & (dest | 0) < (src + num | 0)) {
  ret = dest;
  src = src + num | 0;
  dest = dest + num | 0;
  while ((num | 0) > 0) {
   dest = dest - 1 | 0;
   src = src - 1 | 0;
   num = num - 1 | 0;
   HEAP8[dest >> 0] = HEAP8[src >> 0] | 0;
  }
  dest = ret;
 } else _memcpy(dest, src, num) | 0;
 return dest | 0;
}

function _main($argc, $argv) {
 $argc = $argc | 0;
 $argv = $argv | 0;
 var $0 = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16 | 0;
 $0 = sp + 4 | 0;
 HEAP32[$0 >> 2] = $argc;
 _optionInit($0, $argv, 12);
 if ((HEAP32[$0 >> 2] | 0) == 3) {
  HEAP32[2] = _optionExists(1927) | 0;
  _wigToBedGraph(HEAP32[$argv + 4 >> 2] | 0, HEAP32[$argv + 8 >> 2] | 0);
  STACKTOP = sp;
  return 0;
 } else _errAbort(1468, sp);
 return 0;
}

function _write($fd, $buf, $count) {
 $fd = $fd | 0;
 $buf = $buf | 0;
 $count = $count | 0;
 var $1 = 0, $vararg_buffer = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16 | 0;
 $vararg_buffer = sp;
 HEAP32[$vararg_buffer >> 2] = $fd;
 HEAP32[$vararg_buffer + 4 >> 2] = $buf;
 HEAP32[$vararg_buffer + 8 >> 2] = $count;
 $1 = ___syscall_ret(___syscall4(4, $vararg_buffer | 0) | 0) | 0;
 STACKTOP = sp;
 return $1 | 0;
}

function _pipelineOpen1($cmd, $opts, $otherEndFile, $stderrFile) {
 $cmd = $cmd | 0;
 $opts = $opts | 0;
 $otherEndFile = $otherEndFile | 0;
 $stderrFile = $stderrFile | 0;
 var $1 = 0, $cmds = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16 | 0;
 $cmds = sp;
 HEAP32[$cmds >> 2] = $cmd;
 HEAP32[$cmds + 4 >> 2] = 0;
 $1 = _pipelineOpen($cmds, $opts, $otherEndFile, $stderrFile) | 0;
 STACKTOP = sp;
 return $1 | 0;
}

function _sqlDouble($s) {
 $s = $s | 0;
 var $0 = 0.0, $1 = 0, $end = 0, $vararg_buffer = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16 | 0;
 $vararg_buffer = sp;
 $end = sp + 4 | 0;
 $0 = +_strtod($s, $end);
 $1 = HEAP32[$end >> 2] | 0;
 if (($1 | 0) != ($s | 0)) if (!(HEAP8[$1 >> 0] | 0)) {
  STACKTOP = sp;
  return +$0;
 }
 HEAP32[$vararg_buffer >> 2] = $s;
 _errAbort(2421, $vararg_buffer);
 return +(0.0);
}

function _read($fd, $buf, $count) {
 $fd = $fd | 0;
 $buf = $buf | 0;
 $count = $count | 0;
 var $1 = 0, $vararg_buffer = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16 | 0;
 $vararg_buffer = sp;
 HEAP32[$vararg_buffer >> 2] = $fd;
 HEAP32[$vararg_buffer + 4 >> 2] = $buf;
 HEAP32[$vararg_buffer + 8 >> 2] = $count;
 $1 = ___syscall_ret(___syscall3(3, $vararg_buffer | 0) | 0) | 0;
 STACKTOP = sp;
 return $1 | 0;
}

function _copysign($x, $y) {
 $x = +$x;
 $y = +$y;
 var $0 = 0, $1 = 0, $6 = 0;
 HEAPF64[tempDoublePtr >> 3] = $x;
 $0 = HEAP32[tempDoublePtr >> 2] | 0;
 $1 = HEAP32[tempDoublePtr + 4 >> 2] | 0;
 HEAPF64[tempDoublePtr >> 3] = $y;
 $6 = HEAP32[tempDoublePtr + 4 >> 2] & -2147483648 | $1 & 2147483647;
 HEAP32[tempDoublePtr >> 2] = $0;
 HEAP32[tempDoublePtr + 4 >> 2] = $6;
 return +(+HEAPF64[tempDoublePtr >> 3]);
}

function ___uflow($f) {
 $f = $f | 0;
 var $$0 = 0, $c = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16 | 0;
 $c = sp;
 if (!(HEAP32[$f + 8 >> 2] | 0)) if (!(___toread($f) | 0)) label = 3; else $$0 = -1; else label = 3;
 if ((label | 0) == 3) if ((FUNCTION_TABLE_iiii[HEAP32[$f + 32 >> 2] & 7]($f, $c, 1) | 0) == 1) $$0 = HEAPU8[$c >> 0] | 0; else $$0 = -1;
 STACKTOP = sp;
 return $$0 | 0;
}

function ___uremdi3($a$0, $a$1, $b$0, $b$1) {
 $a$0 = $a$0 | 0;
 $a$1 = $a$1 | 0;
 $b$0 = $b$0 | 0;
 $b$1 = $b$1 | 0;
 var $rem = 0, __stackBase__ = 0;
 __stackBase__ = STACKTOP;
 STACKTOP = STACKTOP + 16 | 0;
 $rem = __stackBase__ | 0;
 ___udivmoddi4($a$0, $a$1, $b$0, $b$1, $rem) | 0;
 STACKTOP = __stackBase__;
 return (tempRet0 = HEAP32[$rem + 4 >> 2] | 0, HEAP32[$rem >> 2] | 0) | 0;
}

function _llvm_cttz_i32(x) {
 x = x | 0;
 var ret = 0;
 ret = HEAP8[cttz_i8 + (x & 255) >> 0] | 0;
 if ((ret | 0) < 8) return ret | 0;
 ret = HEAP8[cttz_i8 + (x >> 8 & 255) >> 0] | 0;
 if ((ret | 0) < 8) return ret + 8 | 0;
 ret = HEAP8[cttz_i8 + (x >> 16 & 255) >> 0] | 0;
 if ((ret | 0) < 8) return ret + 16 | 0;
 return (HEAP8[cttz_i8 + (x >>> 24) >> 0] | 0) + 24 | 0;
}

function _setpgid($pid, $pgid) {
 $pid = $pid | 0;
 $pgid = $pgid | 0;
 var $1 = 0, $vararg_buffer = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16 | 0;
 $vararg_buffer = sp;
 HEAP32[$vararg_buffer >> 2] = $pid;
 HEAP32[$vararg_buffer + 4 >> 2] = $pgid;
 $1 = ___syscall_ret(___syscall57(57, $vararg_buffer | 0) | 0) | 0;
 STACKTOP = sp;
 return $1 | 0;
}

function _warn($format, $varargs) {
 $format = $format | 0;
 $varargs = $varargs | 0;
 var $0 = 0, $args = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16 | 0;
 $args = sp;
 HEAP32[$args >> 2] = $varargs;
 $0 = _getThreadVars() | 0;
 FUNCTION_TABLE_vii[HEAP32[$0 + 8 + (HEAP32[$0 + 88 >> 2] << 2) >> 2] & 1]($format, $args);
 STACKTOP = sp;
 return;
}

function ___shlim($f, $lim) {
 $f = $f | 0;
 $lim = $lim | 0;
 var $2 = 0, $4 = 0, $5 = 0;
 HEAP32[$f + 104 >> 2] = $lim;
 $2 = HEAP32[$f + 8 >> 2] | 0;
 $4 = HEAP32[$f + 4 >> 2] | 0;
 $5 = $2 - $4 | 0;
 HEAP32[$f + 108 >> 2] = $5;
 if (($lim | 0) != 0 & ($5 | 0) > ($lim | 0)) HEAP32[$f + 100 >> 2] = $4 + $lim; else HEAP32[$f + 100 >> 2] = $2;
 return;
}

function _digitsBaseTwo($x) {
 $x = $x | 0;
 var $$01 = 0, $1 = 0, $digits$0$lcssa = 0, $digits$02 = 0;
 if (!$x) $digits$0$lcssa = 0; else {
  $$01 = $x;
  $digits$02 = 0;
  while (1) {
   $1 = $digits$02 + 1 | 0;
   $$01 = $$01 >>> 1;
   if (!$$01) {
    $digits$0$lcssa = $1;
    break;
   } else $digits$02 = $1;
  }
 }
 return $digits$0$lcssa | 0;
}

function _slFreeList($listPt) {
 $listPt = $listPt | 0;
 var $0 = 0, $next$01 = 0, $next$01$looptemp = 0;
 $0 = HEAP32[$listPt >> 2] | 0;
 if ($0) {
  $next$01 = $0;
  do {
   $next$01$looptemp = $next$01;
   $next$01 = HEAP32[$next$01 >> 2] | 0;
   _freeMem($next$01$looptemp);
  } while (($next$01 | 0) != 0);
 }
 HEAP32[$listPt >> 2] = 0;
 return;
}

function _sn_write($f, $s, $l) {
 $f = $f | 0;
 $s = $s | 0;
 $l = $l | 0;
 var $2 = 0, $3 = 0, $4 = 0, $l$ = 0;
 $2 = $f + 20 | 0;
 $3 = HEAP32[$2 >> 2] | 0;
 $4 = (HEAP32[$f + 16 >> 2] | 0) - $3 | 0;
 $l$ = $4 >>> 0 > $l >>> 0 ? $l : $4;
 _memcpy($3 | 0, $s | 0, $l$ | 0) | 0;
 HEAP32[$2 >> 2] = (HEAP32[$2 >> 2] | 0) + $l$;
 return $l | 0;
}

function _slAddTail($listPt, $node) {
 $listPt = $listPt | 0;
 $node = $node | 0;
 var $0 = 0, $ppt$0 = 0, $ppt$0$lcssa = 0;
 $ppt$0 = $listPt;
 while (1) {
  $0 = HEAP32[$ppt$0 >> 2] | 0;
  if (!$0) {
   $ppt$0$lcssa = $ppt$0;
   break;
  } else $ppt$0 = $0;
 }
 HEAP32[$node >> 2] = 0;
 HEAP32[$ppt$0$lcssa >> 2] = $node;
 return;
}

function _newDyString($initialBufSize) {
 $initialBufSize = $initialBufSize | 0;
 var $$initialBufSize = 0, $0 = 0;
 $0 = _needMem(16) | 0;
 $$initialBufSize = ($initialBufSize | 0) == 0 ? 512 : $initialBufSize;
 HEAP32[$0 + 4 >> 2] = _needMem($$initialBufSize + 1 | 0) | 0;
 HEAP32[$0 + 8 >> 2] = $$initialBufSize;
 return $0 | 0;
}

function _close($fd) {
 $fd = $fd | 0;
 var $0 = 0, $2 = 0, $vararg_buffer = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16 | 0;
 $vararg_buffer = sp;
 HEAP32[$vararg_buffer >> 2] = $fd;
 $0 = ___syscall6(6, $vararg_buffer | 0) | 0;
 $2 = ___syscall_ret(($0 | 0) == -4 ? -115 : $0) | 0;
 STACKTOP = sp;
 return $2 | 0;
}

function ___stdio_close($f) {
 $f = $f | 0;
 var $3 = 0, $vararg_buffer = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16 | 0;
 $vararg_buffer = sp;
 HEAP32[$vararg_buffer >> 2] = HEAP32[$f + 60 >> 2];
 $3 = ___syscall_ret(___syscall6(6, $vararg_buffer | 0) | 0) | 0;
 STACKTOP = sp;
 return $3 | 0;
}

function _endsWith($string, $end) {
 $string = $string | 0;
 $end = $end | 0;
 var $$0 = 0, $0 = 0, $2 = 0;
 $0 = _strlen($string) | 0;
 $2 = $0 - (_strlen($end) | 0) | 0;
 if (($2 | 0) < 0) {
  $$0 = 0;
  return $$0 | 0;
 }
 $$0 = (_strcmp($string + $2 | 0, $end) | 0) == 0 & 1;
 return $$0 | 0;
}

function _sprintf($s, $fmt, $varargs) {
 $s = $s | 0;
 $fmt = $fmt | 0;
 $varargs = $varargs | 0;
 var $0 = 0, $ap = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16 | 0;
 $ap = sp;
 HEAP32[$ap >> 2] = $varargs;
 $0 = _vsprintf($s, $fmt, $ap) | 0;
 STACKTOP = sp;
 return $0 | 0;
}

function _pipe($fd) {
 $fd = $fd | 0;
 var $1 = 0, $vararg_buffer = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16 | 0;
 $vararg_buffer = sp;
 HEAP32[$vararg_buffer >> 2] = $fd;
 $1 = ___syscall_ret(___syscall42(42, $vararg_buffer | 0) | 0) | 0;
 STACKTOP = sp;
 return $1 | 0;
}

function _fprintf($f, $fmt, $varargs) {
 $f = $f | 0;
 $fmt = $fmt | 0;
 $varargs = $varargs | 0;
 var $0 = 0, $ap = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16 | 0;
 $ap = sp;
 HEAP32[$ap >> 2] = $varargs;
 $0 = _vfprintf($f, $fmt, $ap) | 0;
 STACKTOP = sp;
 return $0 | 0;
}

function _optionExists($name) {
 $name = $name | 0;
 var $0 = 0, $4 = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16 | 0;
 $0 = HEAP32[47] | 0;
 if (!$0) _errAbort(3347, sp); else {
  $4 = (_hashFindVal($0, $name) | 0) != 0 & 1;
  STACKTOP = sp;
  return $4 | 0;
 }
 return 0;
}

function _newSlName($name) {
 $name = $name | 0;
 var $$0$in = 0, $3 = 0;
 if (!$name) {
  $$0$in = _needMem(8) | 0;
  return $$0$in | 0;
 } else {
  $3 = _needMem((_strlen($name) | 0) + 8 | 0) | 0;
  _strcpy($3 + 4 | 0, $name) | 0;
  $$0$in = $3;
  return $$0$in | 0;
 }
 return 0;
}

function _sscanf($s, $fmt, $varargs) {
 $s = $s | 0;
 $fmt = $fmt | 0;
 $varargs = $varargs | 0;
 var $0 = 0, $ap = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16 | 0;
 $ap = sp;
 HEAP32[$ap >> 2] = $varargs;
 $0 = _vsscanf($s, $fmt, $ap) | 0;
 STACKTOP = sp;
 return $0 | 0;
}

function _bitshift64Ashr(low, high, bits) {
 low = low | 0;
 high = high | 0;
 bits = bits | 0;
 if ((bits | 0) < 32) {
  tempRet0 = high >> bits;
  return low >>> bits | (high & (1 << bits) - 1) << 32 - bits;
 }
 tempRet0 = (high | 0) < 0 ? -1 : 0;
 return high >> bits - 32 | 0;
}

function _cloneStringZ($s, $size) {
 $s = $s | 0;
 $size = $size | 0;
 var $0 = 0, $2 = 0, $4 = 0;
 $0 = _strlen($s) | 0;
 $2 = _needMem($size + 1 | 0) | 0;
 $4 = ($0 | 0) < ($size | 0) ? $0 : $size;
 _memcpy($2 | 0, $s | 0, $4 | 0) | 0;
 HEAP8[$2 + $4 >> 0] = 0;
 return $2 | 0;
}

function _vaErrAbort($format, $args) {
 $format = $format | 0;
 $args = $args | 0;
 var $2 = 0;
 HEAP32[(_getThreadVars() | 0) + 4 >> 2] = 1;
 $2 = _getThreadVars() | 0;
 FUNCTION_TABLE_vii[HEAP32[$2 + 8 + (HEAP32[$2 + 88 >> 2] << 2) >> 2] & 1]($format, $args);
 _noWarnAbort();
}

function _bitshift64Shl(low, high, bits) {
 low = low | 0;
 high = high | 0;
 bits = bits | 0;
 if ((bits | 0) < 32) {
  tempRet0 = high << bits | (low & (1 << bits) - 1 << 32 - bits) >>> 32 - bits;
  return low << bits;
 }
 tempRet0 = low << bits - 32;
 return 0;
}

function _cloneString($s) {
 $s = $s | 0;
 var $$0 = 0, $1 = 0, $3 = 0;
 if (!$s) {
  $$0 = 0;
  return $$0 | 0;
 }
 $1 = _strlen($s) | 0;
 $3 = _needMem($1 + 1 | 0) | 0;
 _memcpy($3 | 0, $s | 0, $1 | 0) | 0;
 HEAP8[$3 + $1 >> 0] = 0;
 $$0 = $3;
 return $$0 | 0;
}

function _bitshift64Lshr(low, high, bits) {
 low = low | 0;
 high = high | 0;
 bits = bits | 0;
 if ((bits | 0) < 32) {
  tempRet0 = high >>> bits;
  return low >>> bits | (high & (1 << bits) - 1) << 32 - bits;
 }
 tempRet0 = 0;
 return high >>> bits - 32 | 0;
}

function dynCall_iiiiiii(index, a1, a2, a3, a4, a5, a6) {
 index = index | 0;
 a1 = a1 | 0;
 a2 = a2 | 0;
 a3 = a3 | 0;
 a4 = a4 | 0;
 a5 = a5 | 0;
 a6 = a6 | 0;
 return FUNCTION_TABLE_iiiiiii[index & 0](a1 | 0, a2 | 0, a3 | 0, a4 | 0, a5 | 0, a6 | 0) | 0;
}

function _skipLeadingSpaces($s) {
 $s = $s | 0;
 var $$0 = 0, $$01 = 0;
 if (!$s) {
  $$0 = 0;
  return $$0 | 0;
 } else $$01 = $s;
 while (1) if (!(_isspace(HEAP8[$$01 >> 0] | 0) | 0)) {
  $$0 = $$01;
  break;
 } else $$01 = $$01 + 1 | 0;
 return $$0 | 0;
}

function copyTempFloat(ptr) {
 ptr = ptr | 0;
 HEAP8[tempDoublePtr >> 0] = HEAP8[ptr >> 0];
 HEAP8[tempDoublePtr + 1 >> 0] = HEAP8[ptr + 1 >> 0];
 HEAP8[tempDoublePtr + 2 >> 0] = HEAP8[ptr + 2 >> 0];
 HEAP8[tempDoublePtr + 3 >> 0] = HEAP8[ptr + 3 >> 0];
}

function _dyStringCannibalize($pDy) {
 $pDy = $pDy | 0;
 var $0 = 0, $3 = 0;
 $0 = HEAP32[$pDy >> 2] | 0;
 if (!$0) ___assert_fail(4005, 4016, 40, 4032); else {
  $3 = HEAP32[$0 + 4 >> 2] | 0;
  _freez($pDy);
  return $3 | 0;
 }
 return 0;
}

function _errAbort($format, $varargs) {
 $format = $format | 0;
 $varargs = $varargs | 0;
 var $args = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16 | 0;
 $args = sp;
 HEAP32[$args >> 2] = $varargs;
 _vaErrAbort($format, $args);
}

function runPostSets() {}
function _i64Subtract(a, b, c, d) {
 a = a | 0;
 b = b | 0;
 c = c | 0;
 d = d | 0;
 var h = 0;
 h = b - d >>> 0;
 h = b - d - (c >>> 0 > a >>> 0 | 0) >>> 0;
 return (tempRet0 = h, a - c >>> 0 | 0) | 0;
}

function _freez($vpt) {
 $vpt = $vpt | 0;
 var $0 = 0;
 $0 = HEAP32[$vpt >> 2] | 0;
 HEAP32[$vpt >> 2] = 0;
 if (!$0) return;
 FUNCTION_TABLE_vi[HEAP32[(HEAP32[41] | 0) + 8 >> 2] & 3]($0);
 return;
}

function ___syscall_ret($r) {
 $r = $r | 0;
 var $$0 = 0;
 if ($r >>> 0 > 4294963200) {
  HEAP32[(___errno_location() | 0) >> 2] = 0 - $r;
  $$0 = -1;
 } else $$0 = $r;
 return $$0 | 0;
}

function _sqlUnsigned($s) {
 $s = $s | 0;
 var $0 = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16 | 0;
 $0 = _sqlUnsignedOrError($s, 0, sp) | 0;
 STACKTOP = sp;
 return $0 | 0;
}

function _i64Add(a, b, c, d) {
 a = a | 0;
 b = b | 0;
 c = c | 0;
 d = d | 0;
 var l = 0;
 l = a + c >>> 0;
 return (tempRet0 = b + d + (l >>> 0 < a >>> 0 | 0) >>> 0, l | 0) | 0;
}

function dynCall_iiii(index, a1, a2, a3) {
 index = index | 0;
 a1 = a1 | 0;
 a2 = a2 | 0;
 a3 = a3 | 0;
 return FUNCTION_TABLE_iiii[index & 7](a1 | 0, a2 | 0, a3 | 0) | 0;
}

function _lmCleanup($pLm) {
 $pLm = $pLm | 0;
 var $0 = 0;
 $0 = HEAP32[$pLm >> 2] | 0;
 if (!$0) return;
 _slFreeList($0);
 _freeMem($0);
 HEAP32[$pLm >> 2] = 0;
 return;
}

function ___udivdi3($a$0, $a$1, $b$0, $b$1) {
 $a$0 = $a$0 | 0;
 $a$1 = $a$1 | 0;
 $b$0 = $b$0 | 0;
 $b$1 = $b$1 | 0;
 return ___udivmoddi4($a$0, $a$1, $b$0, $b$1, 0) | 0;
}

function _strchr($s, $c) {
 $s = $s | 0;
 $c = $c | 0;
 var $0 = 0;
 $0 = ___strchrnul($s, $c) | 0;
 return ((HEAP8[$0 >> 0] | 0) == ($c & 255) << 24 >> 24 ? $0 : 0) | 0;
}

function _strtoll($s, $p, $base) {
 $s = $s | 0;
 $p = $p | 0;
 $base = $base | 0;
 var $0 = 0;
 $0 = _strtox($s, $p, $base, 0, -2147483648) | 0;
 return $0 | 0;
}

function _strtol($s, $p, $base) {
 $s = $s | 0;
 $p = $p | 0;
 $base = $base | 0;
 var $0 = 0;
 $0 = _strtox($s, $p, $base, -2147483648, 0) | 0;
 return $0 | 0;
}

function _hashAdd($hash, $name, $val) {
 $hash = $hash | 0;
 $name = $name | 0;
 $val = $val | 0;
 return _hashAddN($hash, $name, _strlen($name) | 0, $val) | 0;
}
function stackAlloc(size) {
 size = size | 0;
 var ret = 0;
 ret = STACKTOP;
 STACKTOP = STACKTOP + size | 0;
 STACKTOP = STACKTOP + 15 & -16;
 return ret | 0;
}

function _noWarnAbort() {
 var $0 = 0;
 $0 = _getThreadVars() | 0;
 FUNCTION_TABLE_v[HEAP32[$0 + 92 + (HEAP32[$0 + 140 >> 2] << 2) >> 2] & 1]();
 _exit(-1);
}

function _getpid() {
 var $0 = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16 | 0;
 $0 = ___syscall20(20, sp | 0) | 0;
 STACKTOP = sp;
 return $0 | 0;
}

function ___errno_location() {
 var $$0 = 0;
 if (!(HEAP32[110] | 0)) $$0 = 596; else $$0 = HEAP32[(_pthread_self() | 0) + 60 >> 2] | 0;
 return $$0 | 0;
}

function _fileno($f) {
 $f = $f | 0;
 if ((HEAP32[$f + 76 >> 2] | 0) > -1) if (___lockfile($f) | 0) ___unlockfile($f);
 return HEAP32[$f + 60 >> 2] | 0;
}

function establishStackSpace(stackBase, stackMax) {
 stackBase = stackBase | 0;
 stackMax = stackMax | 0;
 STACKTOP = stackBase;
 STACK_MAX = stackMax;
}

function _udcTell($file) {
 $file = $file | 0;
 var $1 = 0;
 $1 = $file + 32 | 0;
 tempRet0 = HEAP32[$1 + 4 >> 2] | 0;
 return HEAP32[$1 >> 2] | 0;
}

function dynCall_iii(index, a1, a2) {
 index = index | 0;
 a1 = a1 | 0;
 a2 = a2 | 0;
 return FUNCTION_TABLE_iii[index & 1](a1 | 0, a2 | 0) | 0;
}

function _wctomb($s, $wc) {
 $s = $s | 0;
 $wc = $wc | 0;
 var $$0 = 0;
 if (!$s) $$0 = 0; else $$0 = _wcrtomb($s, $wc, 0) | 0;
 return $$0 | 0;
}

function b3(p0, p1, p2, p3, p4, p5) {
 p0 = p0 | 0;
 p1 = p1 | 0;
 p2 = p2 | 0;
 p3 = p3 | 0;
 p4 = p4 | 0;
 p5 = p5 | 0;
 abort(3);
 return 0;
}

function setThrew(threw, value) {
 threw = threw | 0;
 value = value | 0;
 if (!__THREW__) {
  __THREW__ = threw;
  threwValue = value;
 }
}

function _hashVarLine($line, $lineIx) {
 $line = $line | 0;
 $lineIx = $lineIx | 0;
 return _hashThisEqThatLine($line, $lineIx, 1) | 0;
}

function _vsprintf($s, $fmt, $ap) {
 $s = $s | 0;
 $fmt = $fmt | 0;
 $ap = $ap | 0;
 return _vsnprintf($s, 2147483647, $fmt, $ap) | 0;
}

function dynCall_vii(index, a1, a2) {
 index = index | 0;
 a1 = a1 | 0;
 a2 = a2 | 0;
 FUNCTION_TABLE_vii[index & 1](a1 | 0, a2 | 0);
}

function _do_read_476($f, $buf, $len) {
 $f = $f | 0;
 $buf = $buf | 0;
 $len = $len | 0;
 return ___string_read($f, $buf, $len) | 0;
}

function _freeMem($pt) {
 $pt = $pt | 0;
 if (!$pt) return;
 FUNCTION_TABLE_vi[HEAP32[(HEAP32[41] | 0) + 8 >> 2] & 3]($pt);
 return;
}

function _mbsinit($st) {
 $st = $st | 0;
 var $4 = 0;
 if (!$st) $4 = 1; else $4 = (HEAP32[$st >> 2] | 0) == 0;
 return $4 & 1 | 0;
}

function _llvm_bswap_i32(x) {
 x = x | 0;
 return (x & 255) << 24 | (x >> 8 & 255) << 16 | (x >> 16 & 255) << 8 | x >>> 24 | 0;
}

function _verboseSetLevel($verbosity) {
 $verbosity = $verbosity | 0;
 HEAP32[37] = $verbosity;
 HEAP32[39] = 0;
 return;
}

function _strcpy($dest, $src) {
 $dest = $dest | 0;
 $src = $src | 0;
 ___stpcpy($dest, $src) | 0;
 return $dest | 0;
}

function dynCall_ii(index, a1) {
 index = index | 0;
 a1 = a1 | 0;
 return FUNCTION_TABLE_ii[index & 3](a1 | 0) | 0;
}

function _fputs($s, $f) {
 $s = $s | 0;
 $f = $f | 0;
 return (_fwrite($s, _strlen($s) | 0, 1, $f) | 0) + -1 | 0;
}

function _defaultAbort() {
 if (_getenv(2048) | 0) _abort();
 if (!(_getenv(2058) | 0)) _exit(-1); else _abort();
}

function _defaultRealloc($vpt, $size) {
 $vpt = $vpt | 0;
 $size = $size | 0;
 return _realloc($vpt, $size) | 0;
}

function _ntohs($n) {
 $n = $n | 0;
 var $0 = 0;
 $0 = $n & 65535;
 return ($0 << 8 | $0 >>> 8) & 65535 | 0;
}

function _isalnum($c) {
 $c = $c | 0;
 return (($c + -48 | 0) >>> 0 < 10 | (_isalpha($c) | 0) != 0) & 1 | 0;
}

function _htons($n) {
 $n = $n | 0;
 var $0 = 0;
 $0 = $n & 65535;
 return ($0 << 8 | $0 >>> 8) & 65535 | 0;
}

function dynCall_vi(index, a1) {
 index = index | 0;
 a1 = a1 | 0;
 FUNCTION_TABLE_vi[index & 3](a1 | 0);
}

function _cleanup_457($p) {
 $p = $p | 0;
 if (!(HEAP32[$p + 68 >> 2] | 0)) ___unlockfile($p);
 return;
}

function _cleanup_398($p) {
 $p = $p | 0;
 if (!(HEAP32[$p + 68 >> 2] | 0)) ___unlockfile($p);
 return;
}

function _isspace($c) {
 $c = $c | 0;
 return (($c | 0) == 32 | ($c + -9 | 0) >>> 0 < 5) & 1 | 0;
}

function _strtod($s, $p) {
 $s = $s | 0;
 $p = $p | 0;
 return +(+_strtox_304($s, $p, 1));
}

function b0(p0, p1, p2) {
 p0 = p0 | 0;
 p1 = p1 | 0;
 p2 = p2 | 0;
 abort(0);
 return 0;
}

function _isalpha($c) {
 $c = $c | 0;
 return (($c | 32) + -97 | 0) >>> 0 < 26 | 0;
}

function _lineFileReuse($lf) {
 $lf = $lf | 0;
 HEAP8[$lf + 48 >> 0] = 1;
 return;
}

function _copysignl($x, $y) {
 $x = +$x;
 $y = +$y;
 return +(+_copysign($x, $y));
}

function _scalbnl($x, $n) {
 $x = +$x;
 $n = $n | 0;
 return +(+_scalbn($x, $n));
}

function dynCall_v(index) {
 index = index | 0;
 FUNCTION_TABLE_v[index & 1]();
}

function _frexpl($x, $e) {
 $x = +$x;
 $e = $e | 0;
 return +(+_frexp($x, $e));
}

function _defaultAlloc($size) {
 $size = $size | 0;
 return _malloc($size) | 0;
}

function _pipelineFd($pl) {
 $pl = $pl | 0;
 return HEAP32[$pl + 16 >> 2] | 0;
}

function _fmodl($x, $y) {
 $x = +$x;
 $y = +$y;
 return +(+_fmod($x, $y));
}

function _htonl($n) {
 $n = $n | 0;
 return _llvm_bswap_i32($n | 0) | 0;
}

function b6(p0, p1) {
 p0 = p0 | 0;
 p1 = p1 | 0;
 abort(6);
 return 0;
}

function _defaultFree($vpt) {
 $vpt = $vpt | 0;
 _free($vpt);
 return;
}

function setTempRet0(value) {
 value = value | 0;
 tempRet0 = value;
}

function stackRestore(top) {
 top = top | 0;
 STACKTOP = top;
}

function b2(p0, p1) {
 p0 = p0 | 0;
 p1 = p1 | 0;
 abort(2);
}

function b4(p0) {
 p0 = p0 | 0;
 abort(4);
 return 0;
}

function ___unlockfile($f) {
 $f = $f | 0;
 return;
}

function ___lockfile($f) {
 $f = $f | 0;
 return 0;
}

function getTempRet0() {
 return tempRet0 | 0;
}

function stackSave() {
 return STACKTOP | 0;
}

function b1(p0) {
 p0 = p0 | 0;
 abort(1);
}

function b5() {
 abort(5);
}

// EMSCRIPTEN_END_FUNCS
var FUNCTION_TABLE_iiii = [b0,_sn_write,___stdout_write,___stdio_seek,___stdio_write,___stdio_read,_do_read_476,b0];
var FUNCTION_TABLE_vi = [b1,_defaultFree,_cleanup_398,_cleanup_457];
var FUNCTION_TABLE_vii = [b2,_defaultVaWarn];
var FUNCTION_TABLE_iiiiiii = [b3];
var FUNCTION_TABLE_ii = [b4,_defaultAlloc,___stdio_close,b4];
var FUNCTION_TABLE_v = [b5,_defaultAbort];
var FUNCTION_TABLE_iii = [b6,_defaultRealloc];

  return { _i64Subtract: _i64Subtract, _fflush: _fflush, _main: _main, _htonl: _htonl, _realloc: _realloc, _i64Add: _i64Add, _memmove: _memmove, _memset: _memset, _malloc: _malloc, _free: _free, _memcpy: _memcpy, _llvm_bswap_i32: _llvm_bswap_i32, _bitshift64Lshr: _bitshift64Lshr, _htons: _htons, _bitshift64Shl: _bitshift64Shl, ___errno_location: ___errno_location, _ntohs: _ntohs, runPostSets: runPostSets, stackAlloc: stackAlloc, stackSave: stackSave, stackRestore: stackRestore, establishStackSpace: establishStackSpace, setThrew: setThrew, setTempRet0: setTempRet0, getTempRet0: getTempRet0, dynCall_iiii: dynCall_iiii, dynCall_vi: dynCall_vi, dynCall_vii: dynCall_vii, dynCall_iiiiiii: dynCall_iiiiiii, dynCall_ii: dynCall_ii, dynCall_v: dynCall_v, dynCall_iii: dynCall_iii };
})
// EMSCRIPTEN_END_ASM
(Module.asmGlobalArg, Module.asmLibraryArg, buffer);
var _i64Subtract = Module["_i64Subtract"] = asm["_i64Subtract"];
var _fflush = Module["_fflush"] = asm["_fflush"];
var _main = Module["_main"] = asm["_main"];
var _htonl = Module["_htonl"] = asm["_htonl"];
var _realloc = Module["_realloc"] = asm["_realloc"];
var _i64Add = Module["_i64Add"] = asm["_i64Add"];
var _memmove = Module["_memmove"] = asm["_memmove"];
var _memset = Module["_memset"] = asm["_memset"];
var runPostSets = Module["runPostSets"] = asm["runPostSets"];
var _malloc = Module["_malloc"] = asm["_malloc"];
var _ntohs = Module["_ntohs"] = asm["_ntohs"];
var _memcpy = Module["_memcpy"] = asm["_memcpy"];
var ___errno_location = Module["___errno_location"] = asm["___errno_location"];
var _htons = Module["_htons"] = asm["_htons"];
var _bitshift64Lshr = Module["_bitshift64Lshr"] = asm["_bitshift64Lshr"];
var _free = Module["_free"] = asm["_free"];
var _llvm_bswap_i32 = Module["_llvm_bswap_i32"] = asm["_llvm_bswap_i32"];
var _bitshift64Shl = Module["_bitshift64Shl"] = asm["_bitshift64Shl"];
var dynCall_iiii = Module["dynCall_iiii"] = asm["dynCall_iiii"];
var dynCall_vi = Module["dynCall_vi"] = asm["dynCall_vi"];
var dynCall_vii = Module["dynCall_vii"] = asm["dynCall_vii"];
var dynCall_iiiiiii = Module["dynCall_iiiiiii"] = asm["dynCall_iiiiiii"];
var dynCall_ii = Module["dynCall_ii"] = asm["dynCall_ii"];
var dynCall_v = Module["dynCall_v"] = asm["dynCall_v"];
var dynCall_iii = Module["dynCall_iii"] = asm["dynCall_iii"];
;

Runtime.stackAlloc = asm['stackAlloc'];
Runtime.stackSave = asm['stackSave'];
Runtime.stackRestore = asm['stackRestore'];
Runtime.establishStackSpace = asm['establishStackSpace'];

Runtime.setTempRet0 = asm['setTempRet0'];
Runtime.getTempRet0 = asm['getTempRet0'];



// === Auto-generated postamble setup entry stuff ===

if (memoryInitializer) {
  if (typeof Module['locateFile'] === 'function') {
    memoryInitializer = Module['locateFile'](memoryInitializer);
  } else if (Module['memoryInitializerPrefixURL']) {
    memoryInitializer = Module['memoryInitializerPrefixURL'] + memoryInitializer;
  }
  if (ENVIRONMENT_IS_NODE || ENVIRONMENT_IS_SHELL) {
    var data = Module['readBinary'](memoryInitializer);
    HEAPU8.set(data, Runtime.GLOBAL_BASE);
  } else {
    addRunDependency('memory initializer');
    var applyMemoryInitializer = function(data) {
      if (data.byteLength) data = new Uint8Array(data);
      HEAPU8.set(data, Runtime.GLOBAL_BASE);
      removeRunDependency('memory initializer');
    }
    function doBrowserLoad() {
      Browser.asyncLoad(memoryInitializer, applyMemoryInitializer, function() {
        throw 'could not load memory initializer ' + memoryInitializer;
      });
    }
    var request = Module['memoryInitializerRequest'];
    if (request) {
      // a network request has already been created, just use that
      function useRequest() {
        if (request.status !== 200 && request.status !== 0) {
          // If you see this warning, the issue may be that you are using locateFile or memoryInitializerPrefixURL, and defining them in JS. That
          // means that the HTML file doesn't know about them, and when it tries to create the mem init request early, does it to the wrong place.
          // Look in your browser's devtools network console to see what's going on.
          console.warn('a problem seems to have happened with Module.memoryInitializerRequest, status: ' + request.status + ', retrying ' + memoryInitializer);
          doBrowserLoad();
          return;
        }
        applyMemoryInitializer(request.response);
      }
      if (request.response) {
        setTimeout(useRequest, 0); // it's already here; but, apply it asynchronously
      } else {
        request.addEventListener('load', useRequest); // wait for it
      }
    } else {
      // fetch it from the network ourselves
      doBrowserLoad();
    }
  }
}

function ExitStatus(status) {
  this.name = "ExitStatus";
  this.message = "Program terminated with exit(" + status + ")";
  this.status = status;
};
ExitStatus.prototype = new Error();
ExitStatus.prototype.constructor = ExitStatus;

var initialStackTop;
var preloadStartTime = null;
var calledMain = false;

dependenciesFulfilled = function runCaller() {
  // If run has never been called, and we should call run (INVOKE_RUN is true, and Module.noInitialRun is not false)
  if (!Module['calledRun']) run();
  if (!Module['calledRun']) dependenciesFulfilled = runCaller; // try this again later, after new deps are fulfilled
}

Module['callMain'] = Module.callMain = function callMain(args) {
  assert(runDependencies == 0, 'cannot call main when async dependencies remain! (listen on __ATMAIN__)');
  assert(__ATPRERUN__.length == 0, 'cannot call main when preRun functions remain to be called');

  args = args || [];

  ensureInitRuntime();

  var argc = args.length+1;
  function pad() {
    for (var i = 0; i < 4-1; i++) {
      argv.push(0);
    }
  }
  var argv = [allocate(intArrayFromString(Module['thisProgram']), 'i8', ALLOC_NORMAL) ];
  pad();
  for (var i = 0; i < argc-1; i = i + 1) {
    argv.push(allocate(intArrayFromString(args[i]), 'i8', ALLOC_NORMAL));
    pad();
  }
  argv.push(0);
  argv = allocate(argv, 'i32', ALLOC_NORMAL);


  try {

    var ret = Module['_main'](argc, argv, 0);


    // if we're not running an evented main loop, it's time to exit
    exit(ret, /* implicit = */ true);
  }
  catch(e) {
    if (e instanceof ExitStatus) {
      // exit() throws this once it's done to make sure execution
      // has been stopped completely
      return;
    } else if (e == 'SimulateInfiniteLoop') {
      // running an evented main loop, don't immediately exit
      Module['noExitRuntime'] = true;
      return;
    } else {
      if (e && typeof e === 'object' && e.stack) Module.printErr('exception thrown: ' + [e, e.stack]);
      throw e;
    }
  } finally {
    calledMain = true;
  }
}




function run(args) {
  args = args || Module['arguments'];

  if (preloadStartTime === null) preloadStartTime = Date.now();

  if (runDependencies > 0) {
    return;
  }

  preRun();

  if (runDependencies > 0) return; // a preRun added a dependency, run will be called later
  if (Module['calledRun']) return; // run may have just been called through dependencies being fulfilled just in this very frame

  function doRun() {
    if (Module['calledRun']) return; // run may have just been called while the async setStatus time below was happening
    Module['calledRun'] = true;

    if (ABORT) return; 

    ensureInitRuntime();

    preMain();


    if (Module['onRuntimeInitialized']) Module['onRuntimeInitialized']();

    if (Module['_main'] && shouldRunNow) Module['callMain'](args);

    postRun();
  }

  if (Module['setStatus']) {
    Module['setStatus']('Running...');
    setTimeout(function() {
      setTimeout(function() {
        Module['setStatus']('');
      }, 1);
      doRun();
    }, 1);
  } else {
    doRun();
  }
}
Module['run'] = Module.run = run;

function exit(status, implicit) {
  if (implicit && Module['noExitRuntime']) {
    return;
  }

  if (Module['noExitRuntime']) {
  } else {

    ABORT = true;
    EXITSTATUS = status;
    STACKTOP = initialStackTop;

    exitRuntime();

    if (Module['onExit']) Module['onExit'](status);
  }

  if (ENVIRONMENT_IS_NODE) {
    // Work around a node.js bug where stdout buffer is not flushed at process exit:
    // Instead of process.exit() directly, wait for stdout flush event.
    // See https://github.com/joyent/node/issues/1669 and https://github.com/kripken/emscripten/issues/2582
    // Workaround is based on https://github.com/RReverser/acorn/commit/50ab143cecc9ed71a2d66f78b4aec3bb2e9844f6
    process['stdout']['once']('drain', function () {
      process['exit'](status);
    });
    console.log(' '); // Make sure to print something to force the drain event to occur, in case the stdout buffer was empty.
    // Work around another node bug where sometimes 'drain' is never fired - make another effort
    // to emit the exit status, after a significant delay (if node hasn't fired drain by then, give up)
    setTimeout(function() {
      process['exit'](status);
    }, 500);
  } else
  if (ENVIRONMENT_IS_SHELL && typeof quit === 'function') {
    quit(status);
  }
  // if we reach here, we must throw an exception to halt the current execution
  throw new ExitStatus(status);
}
Module['exit'] = Module.exit = exit;

var abortDecorators = [];

function abort(what) {
  if (what !== undefined) {
    Module.print(what);
    Module.printErr(what);
    what = JSON.stringify(what)
  } else {
    what = '';
  }

  ABORT = true;
  EXITSTATUS = 1;

  var extra = '\nIf this abort() is unexpected, build with -s ASSERTIONS=1 which can give more information.';

  var output = 'abort(' + what + ') at ' + stackTrace() + extra;
  if (abortDecorators) {
    abortDecorators.forEach(function(decorator) {
      output = decorator(output, what);
    });
  }
  throw output;
}
Module['abort'] = Module.abort = abort;

// {{PRE_RUN_ADDITIONS}}

if (Module['preInit']) {
  if (typeof Module['preInit'] == 'function') Module['preInit'] = [Module['preInit']];
  while (Module['preInit'].length > 0) {
    Module['preInit'].pop()();
  }
}

// shouldRunNow refers to calling main(), not run().
var shouldRunNow = true;
if (Module['noInitialRun']) {
  shouldRunNow = false;
}


run();

// {{POST_RUN_ADDITIONS}}






// {{MODULE_ADDITIONS}}







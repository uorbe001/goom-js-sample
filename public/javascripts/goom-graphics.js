var require = function (file, cwd) {
    var resolved = require.resolve(file, cwd || '/');
    var mod = require.modules[resolved];
    if (!mod) throw new Error(
        'Failed to resolve module ' + file + ', tried ' + resolved
    );
    var res = mod._cached ? mod._cached : mod();
    return res;
}

require.paths = [];
require.modules = {};
require.extensions = [".js",".coffee"];

require._core = {
    'assert': true,
    'events': true,
    'fs': true,
    'path': true,
    'vm': true
};

require.resolve = (function () {
    return function (x, cwd) {
        if (!cwd) cwd = '/';
        
        if (require._core[x]) return x;
        var path = require.modules.path();
        cwd = path.resolve('/', cwd);
        var y = cwd || '/';
        
        if (x.match(/^(?:\.\.?\/|\/)/)) {
            var m = loadAsFileSync(path.resolve(y, x))
                || loadAsDirectorySync(path.resolve(y, x));
            if (m) return m;
        }
        
        var n = loadNodeModulesSync(x, y);
        if (n) return n;
        
        throw new Error("Cannot find module '" + x + "'");
        
        function loadAsFileSync (x) {
            if (require.modules[x]) {
                return x;
            }
            
            for (var i = 0; i < require.extensions.length; i++) {
                var ext = require.extensions[i];
                if (require.modules[x + ext]) return x + ext;
            }
        }
        
        function loadAsDirectorySync (x) {
            x = x.replace(/\/+$/, '');
            var pkgfile = x + '/package.json';
            if (require.modules[pkgfile]) {
                var pkg = require.modules[pkgfile]();
                var b = pkg.browserify;
                if (typeof b === 'object' && b.main) {
                    var m = loadAsFileSync(path.resolve(x, b.main));
                    if (m) return m;
                }
                else if (typeof b === 'string') {
                    var m = loadAsFileSync(path.resolve(x, b));
                    if (m) return m;
                }
                else if (pkg.main) {
                    var m = loadAsFileSync(path.resolve(x, pkg.main));
                    if (m) return m;
                }
            }
            
            return loadAsFileSync(x + '/index');
        }
        
        function loadNodeModulesSync (x, start) {
            var dirs = nodeModulesPathsSync(start);
            for (var i = 0; i < dirs.length; i++) {
                var dir = dirs[i];
                var m = loadAsFileSync(dir + '/' + x);
                if (m) return m;
                var n = loadAsDirectorySync(dir + '/' + x);
                if (n) return n;
            }
            
            var m = loadAsFileSync(x);
            if (m) return m;
        }
        
        function nodeModulesPathsSync (start) {
            var parts;
            if (start === '/') parts = [ '' ];
            else parts = path.normalize(start).split('/');
            
            var dirs = [];
            for (var i = parts.length - 1; i >= 0; i--) {
                if (parts[i] === 'node_modules') continue;
                var dir = parts.slice(0, i + 1).join('/') + '/node_modules';
                dirs.push(dir);
            }
            
            return dirs;
        }
    };
})();

require.alias = function (from, to) {
    var path = require.modules.path();
    var res = null;
    try {
        res = require.resolve(from + '/package.json', '/');
    }
    catch (err) {
        res = require.resolve(from, '/');
    }
    var basedir = path.dirname(res);
    
    var keys = (Object.keys || function (obj) {
        var res = [];
        for (var key in obj) res.push(key)
        return res;
    })(require.modules);
    
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (key.slice(0, basedir.length + 1) === basedir + '/') {
            var f = key.slice(basedir.length);
            require.modules[to + f] = require.modules[basedir + f];
        }
        else if (key === basedir) {
            require.modules[to] = require.modules[basedir];
        }
    }
};

require.define = function (filename, fn) {
    var dirname = require._core[filename]
        ? ''
        : require.modules.path().dirname(filename)
    ;
    
    var require_ = function (file) {
        return require(file, dirname)
    };
    require_.resolve = function (name) {
        return require.resolve(name, dirname);
    };
    require_.modules = require.modules;
    require_.define = require.define;
    var module_ = { exports : {} };
    
    require.modules[filename] = function () {
        require.modules[filename]._cached = module_.exports;
        fn.call(
            module_.exports,
            require_,
            module_,
            module_.exports,
            dirname,
            filename
        );
        require.modules[filename]._cached = module_.exports;
        return module_.exports;
    };
};

if (typeof process === 'undefined') process = {};

if (!process.nextTick) process.nextTick = (function () {
    var queue = [];
    var canPost = typeof window !== 'undefined'
        && window.postMessage && window.addEventListener
    ;
    
    if (canPost) {
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'browserify-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);
    }
    
    return function (fn) {
        if (canPost) {
            queue.push(fn);
            window.postMessage('browserify-tick', '*');
        }
        else setTimeout(fn, 0);
    };
})();

if (!process.title) process.title = 'browser';

if (!process.binding) process.binding = function (name) {
    if (name === 'evals') return require('vm')
    else throw new Error('No such module')
};

if (!process.cwd) process.cwd = function () { return '.' };

if (!process.env) process.env = {};
if (!process.argv) process.argv = [];

require.define("path", function (require, module, exports, __dirname, __filename) {
function filter (xs, fn) {
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (fn(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length; i >= 0; i--) {
    var last = parts[i];
    if (last == '.') {
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
}

// Regex to split a filename into [*, dir, basename, ext]
// posix version
var splitPathRe = /^(.+\/(?!$)|\/)?((?:.+?)?(\.[^.]*)?)$/;

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
var resolvedPath = '',
    resolvedAbsolute = false;

for (var i = arguments.length; i >= -1 && !resolvedAbsolute; i--) {
  var path = (i >= 0)
      ? arguments[i]
      : process.cwd();

  // Skip empty and invalid entries
  if (typeof path !== 'string' || !path) {
    continue;
  }

  resolvedPath = path + '/' + resolvedPath;
  resolvedAbsolute = path.charAt(0) === '/';
}

// At this point the path should be resolved to a full absolute path, but
// handle relative paths to be safe (might happen when process.cwd() fails)

// Normalize the path
resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
var isAbsolute = path.charAt(0) === '/',
    trailingSlash = path.slice(-1) === '/';

// Normalize the path
path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }
  
  return (isAbsolute ? '/' : '') + path;
};


// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    return p && typeof p === 'string';
  }).join('/'));
};


exports.dirname = function(path) {
  var dir = splitPathRe.exec(path)[1] || '';
  var isWindows = false;
  if (!dir) {
    // No dirname
    return '.';
  } else if (dir.length === 1 ||
      (isWindows && dir.length <= 3 && dir.charAt(1) === ':')) {
    // It is just a slash or a drive letter with a slash
    return dir;
  } else {
    // It is a full dirname, strip trailing slash
    return dir.substring(0, dir.length - 1);
  }
};


exports.basename = function(path, ext) {
  var f = splitPathRe.exec(path)[2] || '';
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPathRe.exec(path)[3] || '';
};

});

require.define("/geometry.js", function (require, module, exports, __dirname, __filename) {
/**
	Creates a geometry, used for rendering basic geometry.
	@property vertexBuffer Buffer holding all of the vertex data used for this geometry.
	@property indexBuffer Buffer holding the index data used for drawing this geometry.
	@param {WebGLContext} gl The webgl context.
	@param {WebGLProgram} program
	@param data An object holding the geometry data.
**/
function Geometry(gl, program, data) {
	var vertex_data = [], index_data, x, y, z, i;
	this.program = program;
	//Prepare the necessary data depending on the given shape data.
	switch (data.type.toLowerCase()) {
		case 'sphere':
			break;
		case 'box':
			for (i = 0; i <= 7; i++) {
				x = Geometry.multipliers[i][0] * data.halfSize.x;
				y = Geometry.multipliers[i][1] * data.halfSize.y;
				z = Geometry.multipliers[i][2] * data.halfSize.z;
				vertex_data.push(x, y, z);
			}
			
			index_data = [0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 0, 4, 7, 0, 7, 1, 1, 7, 6, 1, 6, 2, 2, 6, 5, 2, 5, 3, 4, 0, 3, 4, 3, 5];
			break;
		case 'plane':
			break;
		default:
			throw "Unkwnown geometry type";
	}

	//Create the vertex buffer and store the vertex data in it.
	this.vertexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertex_data), gl.STATIC_DRAW);
	//Create the index data and store index data in it.
	this.indexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(index_data), gl.STATIC_DRAW);
}

//These are used to create the cube vertices in the correct order.
Geometry.multipliers = [[1, 1, -1], [1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, 1], [-1, 1, 1], [-1, -1, 1], [1, -1, 1]];

/**
	Draws a single instance of this geometry.
	@param {WebGLContext} gl The webgl context.
	@param {Mathematics.Matrix4D} projection_matrix The projection matrix.
	@param {Mathematics.Matrix4D} view_matrix The view matrix.
	@param {Mathematics.Matrix4D} model_matrix The model matrix.
*/
Geometry.prototype.draw = function(gl, projection_matrix, view_matrix, model_matrix) {
	//Bind buffers
	gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
	//Use this geometry's program.
	gl.useProgram(this.program);
	gl.enableVertexAttribArray(this.program.attributes.aPosition);
	gl.vertexAttribPointer(this.program.attributes.aPosition, 3, gl.FLOAT, false, 0, 0);
	gl.uniformMatrix4fv(this.program.uniforms.uProjectionMatrix, false, projection_matrix.data);
	gl.uniformMatrix4fv(this.program.uniforms.uViewMatrix, false, view_matrix.data);
	gl.uniformMatrix4fv(this.program.uniforms.uModelMatrix, false, model_matrix.data);
	//Draw
	gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
};

/**
	Draws multiple instances of this geometry.
	@param {WebGLContext} gl The webgl context.
	@param {Mathematics.Matrix4D} projection_matrix The projection matrix.
	@param {Mathematics.Matrix4D} view_matrix The view matrix.
	@param {Array} model_matrix_array Array holding the model matrix for each instance to be drawn.
*/
Geometry.prototype.drawInstances = function(gl, projection_matrix, view_matrix, model_matrix_array) {
	//Bind buffers
	gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
	//Use this geometry's program.
	gl.useProgram(this.program);
	gl.enableVertexAttribArray(this.program.attributes.aPosition);
	gl.vertexAttribPointer(this.program.attributes.aPosition, 3, gl.FLOAT, false, 0, 0);
	gl.uniformMatrix4fv(this.program.uniforms.uProjectionMatrix, false, projection_matrix.data);
	gl.uniformMatrix4fv(this.program.uniforms.uViewMatrix, false, view_matrix.data);
	
	for(var i = 0, len = model_matrix_array.length; i < len; i++) {
		//Draw
		gl.uniformMatrix4fv(this.program.uniforms.uModelMatrix, false, model_matrix_array[i].data);
		gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
	}
};

module.exports = Geometry;
});

require.define("/utils.js", function (require, module, exports, __dirname, __filename) {
/**
	@namespace holds various utility functions.
*/
Utils = {};

/**
	Creates a gl shader from the source.
	@param {WebGLContext} gl The WebGL context.
	@param type Shader type, should equal the WebGL types.
	@param {String} source Source code of the shader.
	@throws If an error happens when building the shader.
	@returns The compiled shader.
*/
Utils.createShader = function(gl, type, source) {
	var shader = gl.createShader(type);
	gl.shaderSource(shader, source);
	gl.compileShader(shader);

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		var reason = gl.getShaderInfoLog(shader);
		throw "Could not compile shader.\n " + reason;
	}
	return shader;
};

/**
	Frees a shader from gpu.
	@param {WebGLContext} gl The WebGL context.
	@param {WebGLShader} shader The shader to free.
*/
Utils.deleteShader = function(gl, shader) {
	return gl.deleteShader(shader);
};

/**
	Creates a webgl shader program from the given source code.
	@param {WebGLContext} gl The WebGL context.
	@param {String} vertexShaderSource Source code of the vertex shader.
	@param {String} fragmentShaderSource Source code of the fragment shader.
	@throws If there's an error building the shasers or linking the program.
	@returns The linked shader program.
*/
Utils.createProgram = function(gl, vertexShaderSource, fragmentShaderSource) {
	var vShader, fShader;
	try {
		vShader = Utils.createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
		fShader = Utils.createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
	} catch (e) {
		throw e;
	}

	var shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vShader);
	gl.attachShader(shaderProgram, fShader);
	gl.linkProgram(shaderProgram);

	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
		throw "Could not link shader program using the given vertex shader and fragment shader.";
	}

	var vMatches = vertexShaderSource.match(/uniform\s+[^\s]+\s+[^(\s|;)]+;/g);
	var fMatches = fragmentShaderSource.match(/uniform\s+[^\s]+\s+[^(\s|;)]+;/g);
	var i, len, uniform, uniformName, attribute, attributeName;

	if (fMatches !== null) {
		for (i = 0, len = fMatches.length; i < len; i++) {
			if (vMatches.indexOf(fMatches[i]) === -1) vMatches.push(fMatches[i]);
		}
	}

	shaderProgram.uniforms = {};
	for (i = 0, len = vMatches.length; i < len; i++) {
		uniform = vMatches[i];
		uniformName = uniform.match(/uniform\s+[^\s]+\s+([^(\s|;)]+);/)[1];
		shaderProgram.uniforms[uniformName] = gl.getUniformLocation(shaderProgram, uniformName);
	}

	vMatches = vertexShaderSource.match(/attribute\s+[^\s]+\s+[^(\s|;)]+;/g);
	shaderProgram.attributes = {};
	for (i = 0, len = vMatches.length; i < len; i++) {
		attribute = vMatches[i];
		attributeName = attribute.match(/attribute\s+[^\s]+\s+([^(\s|;)]+);/)[1];
		shaderProgram.attributes[attributeName] = gl.getAttribLocation(shaderProgram, attributeName);
	}

	return shaderProgram;
};

/**
	Frees a program from gpu.
	@param {WebGLContext} gl The WebGL context.
	@param {WebGLProgram} program The program to free.
*/
Utils.deleteProgram = function(gl, program) {
	return gl.deleteProgram(program);
};

/**
	Creates a webgl texture from the image. 
	@param {WebGLContext} gl The WebGL context.
	@param {Image} image The loaded image object. 
	@returns {WebGLTexture} The webgl texture reference.
*/
Utils.createTexture = function(gl, image) {
	var texture;
	texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
	gl.generateMipmap(gl.TEXTURE_2D);
	return texture;
};

/**
	Frees a loaded texture from gpu.
	@param {WebGLContext} gl The WebGL context.
	@param {WebGLTexture} texture The texture to free.
*/
Utils.deleteTexture = function(gl, texture) {
	return gl.deleteTexture(texture);
};

/**
	Add capitalize function to String.
*/
String.prototype.capitalize = function() {
	return this.charAt(0).toUpperCase() + this.slice(1);
};

module.exports = Utils;
});

require.define("/goom-graphics.js", function (require, module, exports, __dirname, __filename) {
    var Geometry = require("./geometry"), Utils = require("./utils");
exports.Geometry = Geometry;
exports.Utils = Utils;

});
require("/goom-graphics.js");

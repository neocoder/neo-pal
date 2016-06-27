/*

API should look like this

	var tpl = grip.template(' some cool {theString} template');
	
	var tpl = grip.template({
		string: ' some cool {theString} template'
	});
	
	var tpl = grip.template({
		file: '/home/alex/lightring/app/views/index.tpl'
	});

*/

//var fs = require('fs');
var L = require('./lang');
var p = require('path');
var async = require('async');

var moment = require('moment');

var paths = require('neo-paths');
// ---   Helper Functions ------------------------------


function pal(args) {

	var that = L.object({
		sync: false
	});

	args = (typeof args !== 'undefined') ? args : {};

	var templateString = '',
		templateFilename = '',
		error,
		fileCache = {},
		functions = {},
		cssPath = '',
		namedBlocks = {};

	// delimiter
	var dStart = L.regexQuote( args.start || '{'),
		dEnd = L.regexQuote( args.end || '}');		


	if ( L.isString(args) ) {
		templateString = args;
	} else if (args.string) {
		templateString = args.string;
	} else if (args.file) {
		templateFilename = args.file;
	} else {
		throw new Error('Wrong params for "template" module constructor.');		
	}

	if ( args.cssPath ) {
		cssPath = args.cssPath;
	}

	var formatters = {
		'html': HtmlEscape,
		'htmltag': HtmlTagEscape,
		'html-attr-value': HtmlTagEscape,
		'value': HtmlTagEscape,
		'str': ToString,
		'words150': function(s){
			var c=0, n=150,res, rx = /\w+/ig;	
			while (res = rx.exec(s)) {
				c++
				if (c == n) {
					return s.substring(0, rx.lastIndex)+'&hellip;';
				}
			}
			return s;
			
		},
		formatDate: function(d, f) {
			f = f || 'dddd, MMMM Do YYYY';
			var date = (d instanceof Date) ? d : new Date(d);
			return moment(date).format(f);
		},
		prettyDate: function(d) {
			return (d instanceof Date) ? L.prettyDate(d) : L.prettyDate( new Date(d) );
		},
		'uppercase': function(s) {
			return (s+'').toUpperCase();
		},
		'lowercase': function(s) {
			return (s+'').toLowerCase();
		},
		'capitalize': function(s) {
			return L.capitalize(s+'');
		},
		'-': function(s){
			return s.replace(/\-/g, ' ');			
		},
		'raw': function(x) {return x;}
	},
	defaultFormatterName = 'html',
	options = {
		cssPath: args.cssPath || '/css/',
		jsPath: args.jsPath || '/js/',
		path: args.path || './',
		cutUnknownTokens: true
	};	

	// ---------------------------------------------------------------  built in formatters

	function HtmlEscape(s) {
	  s += '';	
	  return s.replace(/&/g,'&amp;').
	           replace(/>/g,'&gt;').
	           replace(/</g,'&lt;');
	}

	function HtmlTagEscape(s) {
	  s += '';
	  return s.replace(/&/g,'&amp;').
	           replace(/>/g,'&gt;').
	           replace(/</g,'&lt;').
	           replace(/"/g,'&quot;');
	}

	// Default ToString can be changed
	function ToString(s) {
	  if (s === null) {
	    return 'null';
	  }
	  return s.toString();
	}		

	var walkPath = paths.walk;

	// ----------------------------------------------------------------------------

	var patterns = {
		'if': {
			type: 'block',
			useOr: true,
			processor: function(ce, context, callback) {
				// ce = {
				// 	startPos: 5,
				// 	orPos: 10,
				// 	endPos: 20,
				// 	data: '',
				// 	orData: '',
				// 	tokenType: '.',
				// 	token: 'if',
				// 	tokenData: 'artists',
				// 	tokenFormatter: 'capitalize'
				// };

				// {.if file.type}
				// {.if file.type == 'test'}

				/**
				 * Parses the compariosion value and converts it into native type
				 */
				function parseValue(quotMark, value) {
					var g = typeof GLOBAL !== 'undefined' ? GLOBAL : window;
					if ( quotMark === '"' || quotMark === "'" ) {
						return value;
					} else if ( value.match(/^[\d\.]+$/) ) {
						return parseFloat(value);
					} else {
						return g[value];
					}
				}

				var res, rx = /([\w\.\!]+)\s*([=<>!]{1,3})\s*('|"|)(\w*)\3/,
					path, compOp, compVal, hasCompVal, v, proceed = false, not = false;

				if ( res = rx.exec(ce.tokenData) ) {
					path = res[1];
					compOp = res[2];
					// compVal = res[4];
					// quotMark = res[3];

					hasCompVal = typeof res[4] !== 'undefined';
					compVal = parseValue(res[3], res[4]);
				} else {
					path = ce.tokenData;					
				}

				if (path[0] === '!') {
					not = true;
					path = path.substr(1);
				}

				v = walkPath(path, context);

				if ( hasCompVal ) {

					switch (compOp) {
						 case '=':
						 case '==':	 proceed = (v == compVal);  break;
						 case '===': proceed = (v === compVal); break;
						 case '<=':  proceed = (v <= compVal);  break;
						 case '>=':  proceed = (v >= compVal);  break;
						 case '<':   proceed = (v < compVal);   break;
						 case '>':   proceed = (v > compVal);   break;
						 case '!=':  proceed = (v != compVal);  break;
						 case '!==': proceed = (v !== compVal); break;
					}
				} else {
					// simple condition if value is truefy - {.if a.b.c}...{.end}
					if ( v ) {
						proceed = true;	
					}
				}

				if ( not ) {
					proceed = !proceed;
				}
				
				if ( proceed ) {
					processBlock(ce.data, context, function(err, res){
						callback(err, res);
					});
				} else {					
					if ( ce.orData ) {
						processBlock(ce.orData, context, function(err, res){
							callback(err, res);
						});
					} else {
						callback(null, '');
					}
				}
			}
		},
		'timestamp': {
			type: 'inline',
			processor: function(ce, context, callback) {				
				callback(null, (new Date()).getTime());
			}
		},    	
		'repeat': {
			type: 'block',
			processor: function(ce, context, callback) {
				
				var rx = /([\w\.]+)\s+as\s+(\w+)(?:(?:\:(\w+))|)/i;
				// {.repeat artists as artist}
				// data[1] - artist
				// data[2] - value | key if data[3] exists
				// data[3] - value
				var data = rx.exec(ce.tokenData);
				
				var selector = data[1], // artist
					value = data[2], // data[2]
					key; // data[3]
					
				if ( data[3] ) {
					key = data[2];
					value = data[3];
				}	
					
				var collection = walkPath(selector, context);
				var loopResults = [];

				function noData() {
					if ( ce.orData ) {
						processBlock(ce.orData, context, callback);
					} else {
						callback(null, '');
					}						
				}

				if ( !collection ) { return noData(); }
									
				if ( L.isArray(collection) ) {
					if ( collection.length === 0 ) { return noData(); }						

					async.eachSeries(
						collection,
						function(item, nextItem){
							var loopContext = {};
							L.ext(loopContext, context);
							loopContext[value] = item;	
							
							/*
							
							console.log('------- REPEAT  BLOCK --------');
							console.log(ce.data);							
							console.log('------- CONTEXT --------');
							console.log(JSON.stringify(loopContext));
							console.log('------- / BLOCK --------');
							
							//*/

							processBlock(ce.data, loopContext, function(err, res){
								if ( err ) { return nextItem(err); }
								loopResults.push(res);
								nextItem();
							});
						},
						function(err){
							if ( err ) { return callback(err); }
							callback(null, loopResults.join(''));
						}
					);
				} else {
					var collectionKeys = collection.keys();
					if ( collectionKeys.length === 0 ) { return noData(); }

					async.each(
						collectionKeys,
						function(key, nextKey){
							var loopContext = {};
							L.ext(loopContext, context);
							
							if ( key ) { // if we have both property and value definitions ex. {.repeat tbl as key:value }
								loopContext[key] = p;
								loopContext[value] = collection[p];
							} else {
								loopContext[value] = collection[p];	
							}
	
							processBlock(ce.data, loopContext, function(err, res){
								if ( err ) { return nextKey(err); }
								loopResults.push(res);
								nextKey();
							});
						},
						function(err){
							if ( err ) { return callback(err); }
							callback(null, loopResults.join(''));
						}
					);						
				}
			}
		},
		'css': {
			type: 'inline',
			processor: function(ce, context, callback) {
				var tags = [];

				ce.tokenData.split(',').forEach(function(item){
					tags.push('<link rel="stylesheet" href="'+options.cssPath+item.trim()+'.css" type="text/css" media="screen" title="no title" charset="utf-8" />\n');
				});
				
				callback(null, tags.join(''));
			}
		},
		'js': {
			type: 'inline',
			processor: function(ce, context, callback) {
				var tags = [];

				ce.tokenData.split(',').forEach(function(item){
					tags.push('<script src="'+options.jsPath+item.trim()+'.js"></script>\n');
				});
				
				callback(null, tags.join(''));
			}
		},
		'raw': {
			type: 'block',
			processor: function(ce, context, callback) {
				callback(null, ce.data);
			}
		},
		'render': {
			type: 'inline',
			processor: function(ce, context, callback){
				var particle = ce.tokenData;

				if ( particle[0] === ':' ) { // rendering named block
					var blockDef = particle.substr(1).split(/\s+/), // dropping the column
						blockName = blockDef[0],
						selector = blockDef[1] || false,
						renderContext = {};

					if ( selector ) {
						var v = walkPath(selector, context);
						if ( v ) {
							renderContext = v;
							renderContext.__parent = context;							
						}
					} else {
						L.ext(renderContext, context); // cloning context
					}

					if ( namedBlocks[blockName] ) {
						processBlock(namedBlocks[blockName], renderContext, callback);
					} else {
						callback(null, '<!-- named block '+blockName+' is not found. -->');
					}
				} else { // rendering file particle
					var pArr = particle.split('/');
					
					pArr[pArr.length-1] = '_'+pArr[pArr.length-1];
					
					particle = pArr.join('/') + '.tpl';

					particle = p.resolve(ce.fileBase, particle);
					
					processFile(particle, context, function(err, data){
						if (!err) {
							callback(null, data);
						} else {
							callback(err);
							console.log('Error: '+err.message, 'error');
						}
					});					
				}
			}
		},
		'define': {
			type: 'block',
			processor: function(ce, context, callback) {
				var blockName = ce.tokenData;

				if ( !namedBlocks[blockName] ) {
					namedBlocks[blockName] = ce.data;
				}
				callback(null, '');
			}
		}		
	};

	var patternsSync = {
		'if': {
			type: 'block',
			useOr: true,
			processor: function(ce, context) {
				// ce = {
				// 	startPos: 5,
				// 	orPos: 10,
				// 	endPos: 20,
				// 	data: '',
				// 	orData: '',
				// 	tokenType: '.',
				// 	token: 'if',
				// 	tokenData: 'artists',
				// 	tokenFormatter: 'capitalize'
				// };

				// {.if file.type}
				// {.if file.type == 'test'}

				/**
				 * Parses the compariosion value and converts it into native type
				 */
				function parseValue(quotMark, value) {
					var g = typeof GLOBAL !== 'undefined' ? GLOBAL : window;
					if ( quotMark === '"' || quotMark === "'" ) {
						return value;
					} else if ( value.match(/^[\d\.]+$/) ) {
						return parseFloat(value);
					} else {
						return g[value];
					}
				}

				var res, rx = /([\w\.\!]+)\s*([=<>!]{1,3})\s*('|"|)(\w*)\3/,
					path, compOp, compVal, hasCompVal, v, proceed = false, not = false;

				if ( res = rx.exec(ce.tokenData) ) {
					path = res[1];
					compOp = res[2];
					// compVal = res[4];
					// quotMark = res[3];

					hasCompVal = typeof res[4] !== 'undefined';
					compVal = parseValue(res[3], res[4]);
				} else {
					path = ce.tokenData;					
				}

				if (path[0] === '!') {
					not = true;
					path = path.substr(1);
				}

				v = walkPath(path, context);

				if ( hasCompVal ) {

					switch (compOp) {
						 case '=':
						 case '==':	 proceed = (v == compVal);  break;
						 case '===': proceed = (v === compVal); break;
						 case '<=':  proceed = (v <= compVal);  break;
						 case '>=':  proceed = (v >= compVal);  break;
						 case '<':   proceed = (v < compVal);   break;
						 case '>':   proceed = (v > compVal);   break;
						 case '!=':  proceed = (v != compVal);  break;
						 case '!==': proceed = (v !== compVal); break;
					}
				} else {
					// simple condition if value is truefy - {.if a.b.c}...{.end}
					if ( v ) {
						proceed = true;	
					}
				}

				if ( not ) {
					proceed = !proceed;
				}
				
				if ( proceed ) {
					return processBlock(ce.data, context);
				} else {					
					return ce.orData ? processBlock(ce.orData, context) : '';
				}
			}
		},
		'timestamp': {
			type: 'inline',
			processor: function(ce, context) {				
				return Date.now();
			}
		},    	
		'repeat': {
			type: 'block',
			processor: function(ce, context) {
				
				var rx = /([\w\.]+)\s+as\s+(\w+)(?:(?:\:(\w+))|)/i;
				// {.repeat artists as artist}
				// data[1] - artist
				// data[2] - value | key if data[3] exists
				// data[3] - value
				var data = rx.exec(ce.tokenData);
				
				var selector = data[1], // artist
					value = data[2], // data[2]
					key; // data[3]
					
				if ( data[3] ) {
					key = data[2];
					value = data[3];
				}	
					
				var collection = walkPath(selector, context);
				var loopResults = [];

				function noData() {
					return ce.orData ? processBlock(ce.orData, context) : '';
				}

				if ( !collection ) { return noData(); }
									
				if ( L.isArray(collection) ) {
					if ( collection.length === 0 ) { return noData(); }

					collection.forEach(function(item){
						var loopContext = {};
						L.ext(loopContext, context);
						loopContext[value] = item;	

						loopResults.push(processBlock(ce.data, loopContext));
					});
				} else {
					var collectionKeys = collection.keys();
					if ( collectionKeys.length === 0 ) { return noData(); }

					collectionKeys.forEach(function(key){
						var loopContext = {};
						L.ext(loopContext, context);
						
						if ( key ) { // if we have both property and value definitions ex. {.repeat tbl as key:value }
							loopContext[key] = p;
							loopContext[value] = collection[p];
						} else {
							loopContext[value] = collection[p];	
						}

						loopResults.push(processBlock(ce.data, loopContext));
					});
				}

				return loopResults.join('');
			}
		},
		'css': {
			type: 'inline',
			processor: function(ce, context) {
				var tags = [];

				ce.tokenData.split(',').forEach(function(item){
					tags.push('<link rel="stylesheet" href="'+options.cssPath+item.trim()+'.css" type="text/css" media="screen" title="no title" charset="utf-8" />\n');
				});
				
				return tags.join('');
			}
		},
		'js': {
			type: 'inline',
			processor: function(ce, context) {
				var tags = [];

				ce.tokenData.split(',').forEach(function(item){
					tags.push('<script src="'+options.jsPath+item.trim()+'.js"></script>\n');
				});
				
				return tags.join('');
			}
		},
		'raw': {
			type: 'block',
			processor: function(ce, context) {
				return ce.data;
			}
		},
		'render': {
			type: 'inline',
			processor: function(ce, context){
				var particle = ce.tokenData;

				if ( particle[0] === ':' ) { // rendering named block
					var blockDef = particle.substr(1).split(/\s+/), // dropping the column
						blockName = blockDef[0],
						selector = blockDef[1] || false,
						renderContext = {};

					if ( selector ) {
						var v = walkPath(selector, context);
						if ( v ) {
							renderContext = v;
							renderContext.__parent = context;							
						}
					} else {
						L.ext(renderContext, context); // cloning context
					}

					if ( namedBlocks[blockName] ) {
						return processBlock(namedBlocks[blockName], renderContext);
					} else {
						//??? maybe throw an error here?
						return '<!-- named block '+blockName+' is not found. -->';
					}
				} else { // rendering file particle
					var pArr = particle.split('/');
					
					pArr[pArr.length-1] = '_'+pArr[pArr.length-1];
					
					particle = pArr.join('/') + '.tpl';

					particle = p.resolve(ce.fileBase, particle);
					
					return processFile(particle, context);
				}
			}
		},
		'define': {
			type: 'block',
			processor: function(ce, context) {
				var blockName = ce.tokenData;

				if ( !namedBlocks[blockName] ) {
					namedBlocks[blockName] = ce.data;
				}
				return '';
			}
		}		
	};	

	function processFile(fileName, context, callback) {    	

		fileName = p.resolve(options.path, fileName);

		// if ( !fileName.match(/^\.*\//) ) {
		// 	fileName = options.path + fileName;
		// }

		var opts = {
			filePath: fileName,
			fileBase: p.dirname(fileName)
		};

		if ( fileCache[fileName] ) {
			processBlock(fileCache[fileName], context, opts, callback);
			return;
		}

		//!!! Temporary disabled for lighter bundle
		
		// fs.readFile(fileName, function(err, content) {    		
		// 	if (err) {
		// 		callback(err);    			
		// 	} else {
		// 		fileCache[fileName] = content+'';
		// 		processBlock(content+'', context, opts, callback);
		// 	}
		// });
	}

	function processBlock(blockString, context, opts, callback) {
		
		if ( typeof opts === 'function' ) {
			callback = opts;
			opts = {				
				fileBase: options.path
			};
		}

		var lvl = 0,
			currentEntity = L.ext({}, opts);

		var r = dStart+"([A-Za-z0-9\\.\\#\\_\\$]{1}\\S*?)(\\s[^{}\\|]*){0,1}((?:\\|[^\\|\\{\\}]+){1,}){0,1}"+dEnd,
			rx = new RegExp(r, "gi");
			// [1] - type(.|#|)+token (if|repeat|end)
			// [2] - tokenData
			// [3] - tokenFormatter
			
			var lastPos = 0,
				blockStartPos,
				blockOrPos,
				blockEndPos,
				out = [];

		var tokenEntitiesToProcess = [];
					
		// -- DPR queue -------------------------------------------------------------------------------

		var defferedPatternsResults = {};
		
		// issues Deffered Pattern Result Ticket
		// DPR ticket is a string that is that temporary replaces the token and 
		// reaplced with the actual processed token results before the output
		
		function issueDPRTicket() {
			var ticket = '$dpr$'+(((new Date()).getTime()+Math.random())*10000)+'$';
			defferedPatternsResults[ticket] = null;
			return ticket;
		}
		
		// --------------------------------------------------------------------------------------------
		
		function parseFormatter(formatter) {
			var f = {
				name: '',
				args: []
			}, res, args, r;

			if ( res = formatter.match(/(.*?)\((.*?)\)/) ) {
				f.name = res[1];
				args = res[2].split(',');
				for (var i = 0; i < args.length; i++) {
					args[i] = args[i].trim();
					if ( args[i] === 'true' ) {
						args[i] = true;
					} else if ( args[i] === 'false' ) {
						args[i] = false;
					} else if ( args[i].match(/^[\d\.]+$/) ) {
						args[i] = parseFloat(args[i]);
					} else if ( r = args[i].match(/^('|")(.*?)\1$/) ) {
						args[i] = r[2];
					}					
				}
				f.args = args;
			} else {
				f.name = formatter;
			}

			return f;
		}
		
		function processTokenEntity(tokenEntity) {

			if ( that.sync ) {
				return out.push(patternsSync[tokenEntity.token].processor(tokenEntity, context));
			}

			var dprTicket = issueDPRTicket();
			tokenEntity.ticket = dprTicket;

			// pushing ticket into output to replace it later
			out.push(dprTicket);


			tokenEntitiesToProcess.push(tokenEntity);
		}
		
		// --------------------------------------
			
		while ( res = rx.exec(blockString) ) {
			
			token = res[1];
			tokenType = ( token[0] === '.' || token[0] === '#' ) ? token[0] : '';
			token = token.trim();			
			
			if ( tokenType ) {				
				token = token.substr(1);				
			}

			
			tokenData = res[2] || '';		
			tokenData = tokenData.trim();	

			if ( res[3] ) {
				tokenFormatter = res[3].split('|');
				tokenFormatter.shift();				
			} else {
				tokenFormatter = [];
			}
			
			// we are processing only {.or} and {.end} tokens here to combine them
			// into a tokenEntity object and pass to the tokens processor
			
			switch ( token ) {
				
				case 'else':
				case 'or':
					
					// if we are on the same level as token, add data to token entity
					if ( lvl === 1 ) { 
						blockOrPos = currentEntity.orPosAfter = rx.lastIndex;
						currentEntity.orPosBefore = res.index;
					}
					
					// continue processing after token
					lastPos = rx.lastIndex;
					break;
					 
				case 'end':
				
					lvl--;
					
					if ( lvl === 0 ) {
						
						// // pushing the data that could be before the token
						// out.push(blockString.substring(lastPos, res.index));						
								
						// block data end position
						blockEndPos = currentEntity.endPos = res.index;
						
						// determine data block end position.
						var dataEndPos = currentEntity.orPosBefore ? currentEntity.orPosBefore : blockEndPos;
						// copying data block
						currentEntity.data = blockString.substring(blockStartPos, dataEndPos);
						
						// copying "or" block if exists
						if ( currentEntity.orPosAfter ) {
							currentEntity.orData = blockString.substring(currentEntity.orPosAfter, blockEndPos);
						}
						
						//processing prepared token entity
						processTokenEntity(currentEntity);
					}
					
					// continue processing after token
					lastPos = rx.lastIndex;						
										
					break;
					
				default:
					
					var tokenPattern = that.sync ? patternsSync[token] : patterns[token];
					
					// processins supplant token and filling in tokenEntity
					if ( lvl === 0 ) { // processing only 0 level tokens as they can refer to the sub context
						
						switch ( tokenType ) {
							
							case '.':
								// pushing the data that could be before the token
								out.push(blockString.substring(lastPos, res.index));						
							
								if ( tokenPattern ) {

									if ( tokenPattern.type != 'block' ) {
										// processing inline token.
										
										//decreasing level
										//lvl--;
										
										currentEntity = L.ext({
											tokenType: tokenType,
											token: token,
											tokenData: tokenData,
											tokenFormatter: tokenFormatter
										}, opts);
										
										processTokenEntity(currentEntity);
										
									} else {
										// filling tokenEntity structure
										
										currentEntity = L.ext({
											tokenType: tokenType,
											token: token,
											tokenData: tokenData,
											tokenFormatter: tokenFormatter,
											startPos: rx.lastIndex
										}, opts);
										
										blockStartPos = currentEntity.startPos;										
										
									}
									
								} else {									
									// unknown token. skip or put into output
									if ( !options.cutUnknownTokens ) {
										// push the token to the output
										out.push(res[0]);
									}									
								}
								
								// continue processing after token
								lastPos = rx.lastIndex;															
							
							break;
								
							case '#':
							
								// pushing the data that could be before the token
								out.push(blockString.substring(lastPos, res.index));
								
								// continue processing after comment token
								lastPos = rx.lastIndex;
							break;
								
							default:
								// pushing the data that could be before the token
								out.push(blockString.substring(lastPos, res.index));
								
								// continue processing after comment token
								lastPos = rx.lastIndex;
								
								var v = walkPath(token, context);							
								
								if ( v ) {
									if ( tokenFormatter ) {
										tokenFormatter.forEach(function(formatter){

											var f = parseFormatter(formatter);

											f.args.unshift(v);
											
											if ( formatters[f.name] ) {
												v = formatters[f.name].apply(formatters, f.args);
											}										
										});
									} else {
										v = formatters[defaultFormatterName](v);
									}
								}
								
								out.push(v || '');
							break;
							
						}
					
					}
					
					if ( tokenPattern && tokenPattern.type == 'block' ) {
						lvl++;
					}
					
					break;
			}
		}
		
		// copy the last data chunk from lastToken to the end of block
		out.push(blockString.substring(lastPos, blockString.length));

		if ( that.sync ) {
			// tokenEntitiesToProcess.forEach(function(te){
			// 	defferedPatternsResults[te.ticket] = patternsSync[te.token].processor(te, context);
			// });

			return out.join('');

			// return out.join('').replace(/\$dpr\$\d+\$/g, function(ticket){	
			// 	return defferedPatternsResults[ticket] || '';				
			// });
		}

		async.each(
			tokenEntitiesToProcess,
			function(te, nextTE) {
				patterns[te.token].processor(te, context, function(err, result){
					if ( err ) { return nextTE(err); }
					defferedPatternsResults[te.ticket] = result;
					nextTE();
				});
			},
			function(err) {
				if ( err ) { return callback(err); }

				var res = out.join('').replace(/\$dpr\$\d+\$/g, function(ticket){	
					return defferedPatternsResults[ticket] || '';				
				});

				callback(null, res);
			}
		);		
	}

	that.render =
	that.process = function(context, callback){
		if ( !callback ) {
			that.sync = true;
		}

		if ( templateString === '' ) {
			if ( that.sync ) { return ''; }
			return callback(null, templateString);
		}

		if ( templateString ) {
			return processBlock(templateString, context, callback);
		} else if ( templateFilename ) {
			return processFile(templateFilename, context, callback);
		}
		
	};

	return that;

}

module.exports = pal;

// gripTemplate.processString = function(tpl, context, opts, callback) {
// 	console.log('Warning: old API for grip Template. Will be deprecated.');
// 	gripTemplate({ string: tpl, options: opts }).render(context, callback);
// };
// 
// gripTemplate.processFile = function(file, context, callback) {
// 	console.log('Warning: old API for grip Template. Will be deprecated.');
// 	gripTemplate({ file: file }).render(context, callback);
// };
// 
// gripTemplate.process = gripTemplate.processFile;

//exports.template = gripTemplate;

// commonjs
//for (var key in gripTemplate) exports[key] = gripTemplate[key];

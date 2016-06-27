var assert = require('assert'),
	pal = require('../lib/pal');

describe('Testing custom delimiters', function() {

	it('should show the block', function(done){

		var data = {
			ok: true
		};

		var tpl = '{{.if ok}}xxxxx{{.end}}';

		pal({ string:tpl, start: '{{', end: '}}' })
			.process(data, function(err, output){
				assert(output === 'xxxxx');
				done();
			});
	});
});
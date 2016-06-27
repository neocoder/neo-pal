var assert = require('assert'),
	pal = require('../lib/pal');

describe('Testing conditional statements', function() {

	it('should show the block under simple condition', function(done){

		var data = {
			ok: true
		};

		var tpl = '{.if ok}xxxxx{.end}';

		pal(tpl).process(data, function(err, output){

			assert(output === 'xxxxx');
			done();
		});
	});

	it('should pass strict comparison to undefined', function(done){

		var data = {
			five: 5
		};

		var tpl = '{.if six === undefined}xxxxx{.end}';

		pal(tpl).process(data, function(err, output){
			assert(output === 'xxxxx');
			done();
		});
	});	

	it('should pass loose comparison', function(done){

		var data = {
			five: 5
		};
		var tpl = '{.if five == "5" }xxxxx{.end}';

		pal(tpl).process(data, function(err, output){
			assert(output === 'xxxxx');
			done();
		});
	});		

	it('should pass gt comparison', function(done){

		var data = {
			five: 5
		};
		var tpl = '{.if five > 3 }xxxxx{.end}';

		pal(tpl).process(data, function(err, output){
			assert(output === 'xxxxx');
			done();
		});
	});

	it('should pass lte comparison', function(done){

		var data = {
			five: 5
		};
		var tpl = '{.if five <= 5 }xxxxx{.end}';

		pal(tpl).process(data, function(err, output){
			assert(output === 'xxxxx');
			done();
		});
	});

	it('should pass gt comparison with complex path', function(done){

		var data = {
			a: {
				b: {
					nums: [ 1, 2, 3 ]		
				}
			}			
		};
		var tpl = '{.if a.b.nums.length > 1 }xxxxx{.end}';

		pal(tpl).process(data, function(err, output){
			assert(output === 'xxxxx');
			done();
		});
	});

});
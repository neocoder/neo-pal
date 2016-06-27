var assert = require('assert'),
	pal = require('../lib/pal');

describe('Testing path selector', function() {

	it('should return simple value', function(done){
		var data = {
			ok: 'ok'
		},
		tpl = '{ok}';

		pal(tpl)
			.process(data, function(err, output){
				assert(output === 'ok');
				done();
			});
	});

	it('should return simple deeply nested value', function(done){
		var data = {
			a: {
				b: {
					c: [
						{},
						{},
						{ d: { ok: 'ok' } },
						{}
					]
				}
			}
		},
		tpl = '{a.b.c.2.d.ok}';

		pal(tpl)
			.process(data, function(err, output){
				assert(output === 'ok');
				done();
			});
	});


	it('should return simple deeply nested value', function(done){
		var data = {
			a: {
				b: {
					c: [
						{},
						{},
						{ d: { ok: 'ok' } },
						{}
					]
				}
			},
			order: {
				program: {
					full_name: 'XXX'
				}
			}
		},
		tpl = '{order.program.full_name} registration';

		pal(tpl)
			.render(data, function(err, output){
				assert(output.indexOf('XXX') > -1);
				done();
			});
	});	

	
});
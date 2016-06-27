var assert = require('assert'),
	pal = require('../lib/pal');

describe('Testing custom delimiters', function() {

	it('should format the date with provided format', function(done){

		var data = {
			d: new Date('Thu Apr 17 2014 10:09:50 GMT+0300 (FET)')
		};

		pal('Today is {d|formatDate("dddd")|uppercase}')
			.process(data, function(err, output){
				assert(output === 'Today is THURSDAY');
				done();
			});
	});

	it('should format the date with default format', function(done){

		var data = {
			d: new Date('Thu Apr 17 2014 10:09:50 GMT+0300 (FET)')
		};

		pal('Today is {d|formatDate|uppercase}')
			.process(data, function(err, output){
				assert(output === 'Today is THURSDAY, APRIL 17TH 2014');
				done();
			});
	});	


	it('should not break layout', function(done){

		var str = [
			'Hi {first_name},',
			'I looked through our customer database and noticed that you registered the free version of G-Lock EasyMail7 on {date|formatDate("YYYY-MM-DD")} but had not activated your program yet.,',
			'',
			'If you need help with the program activation or have any questions, please, reply this message and ask. I\'d be glad to help.',
			'',
			'Just in case you did not receive your personal key, here it is',
			'{orderid}',
			'',
			'Sincerely,',
			'Julia Gulevich',
			'G-Lock Software',
			'julia@glocksoft.com',
			'',
			'P.S To get things started, review this simple user guide that will explain everything you\'ll need to know http://mirror1.glocksoft.com/easymail7-startup-guide.pdf'
		].join('\n');

		var data = {
			first_name: 'Alex',
			last_name: 'Ladyga',
			date: new Date(),
			orderid: '123-456-789'
		};

		pal(str)
			.process(data, function(err, output){
				assert(output.length === 600);
				done();
			});
	});

	it('process template 1', function(done){
		pal('OrderID:{orderid}|Lic_Num:1')
			.process({orderid:'123'}, function(err, output){
				assert(output === 'OrderID:123|Lic_Num:1');
				done();
			});
	});	

	it('process template 2', function(done){
		pal('OrderID:{orderid}|Lic_Num:1|Mode_Name:Free Edition|Mode_ID:1')
			.process({orderid:'123'}, function(err, output){
				assert(output === 'OrderID:123|Lic_Num:1|Mode_Name:Free Edition|Mode_ID:1');
				done();
			});
	});		

	it('process template 3', function(done){
		pal('OrderID:{orderid}|Lic_Num:1|U:{users}|W:{wps}|PD:{date|formatDate("YYYY-MM-DD")}')
			.process({
				orderid:'123',
				users: 1,
				wps: 1,
				date: new Date('Fri Apr 18 2014 10:09:50 GMT+0300 (FET)')
			}, function(err, output){
				assert(output === "OrderID:123|Lic_Num:1|U:1|W:1|PD:2014-04-18");
				done();
			});
	});

	it('process template 4', function(done){
		pal("em7keygen -c '{program.custom_data}' -l '{program.hash}' '{first_name} {last_name}' '{hardwareid}'")
			.process({
				program: {
					custom_data: '555',
					hash: '777'
				},
				first_name: 'Alex',
				last_name: 'Ladyga',
				hardwareid: '12345678'
			}, function(err, output){
				assert(output === "em7keygen -c '555' -l '777' 'Alex Ladyga' '12345678'");
				done();
			});
	});	

	it('process template 5', function(done){
		pal('{"key":"{key}"}')
			.process({key:'123'}, function(err, output){
				assert(output === '{"key":"123"}');
				done();
			});
	});

	it('process template 6', function(done){
		pal('{"key":"{key}","keyType":"EXT-TRIAL"}')
			.process({key:'123'}, function(err, output){
				assert(output === '{"key":"123","keyType":"EXT-TRIAL"}');
				done();
			});
	});

	it('process template 7', function(done){
		pal("exttrial -h '{program.hash}' -x -d '{extra.days}' -l '{extra.level}'")
			.process({
				program: {
					hash: '123'
				},
				extra: {
					days: '456',
					level: '789'
				}
			}, function(err, output){
				assert(output === "exttrial -h '123' -x -d '456' -l '789'");
				done();
			});
	});	

	it('process template 8', function(done){
		pal('-{ext}-')
			.process({
				ext: '{date|formatDate("dddd")}'
			}, function(err, output){
				//assert(output === '{"key":"123","keyType":"EXT-TRIAL"}');
				done();
			});
	});	
});
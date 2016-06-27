var assert = require('assert'),
	pal = require('../lib/pal');

describe('Testing synchronous mode', function() {

	it('should return processed template', function(){

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

		var output = pal(str).process(data);
		assert(output.length === 600);
	});

	it('should test for performance', function(){
		var tpl = [
			'<div>',
				'<h1 class="header">{header}</h1>',
				'<h2 class="header2">{header2}</h2>',
				'<h3 class="header3">{header3}</h3>',
				'<h4 class="header4">{header4}</h4>',
				'<h5 class="header5">{header5}</h5>',
				'<h6 class="header6">{header6}</h6>',
				'<ul class="list">',
					'{.repeat list as item}<li class="item">{item}</li>{.end}',
				'</ul>',
			'</div>'
		].join('');
		var data = {
			header: "Header",
			header2: "Header2",
			header3: "Header3",
			header4: "Header4",
			header5: "Header5",
			header6: "Header6",
			list: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
		};

	});

});
var lang = {
	ext: function(dest, source) {
		for (prop in source) {
			dest[prop] = source[prop];
		}
		return dest;
	},	
	object: function(o) {
		function F(){}
		F.prototype = o;
		return new F();
	},		
	isArray: function(obj) {
		return typeof obj == 'object' && obj != null && obj.concat !== undefined;
	},	
	isString: function(o) {
		return (typeof o == 'string');
	},
	capitalize: function(str) {
		return str.charAt(0).toUpperCase() + str.substring(1);
	},
	randomString: function(string_length) {
		var chars = "0123456789abcdefghiklmnopqrstuvwxyz";
		//var chars = "37sabmpofx";
		string_length = string_length || 6;
		var randomstring = '';
		for (var i=0; i<string_length; i++) {
			var rnum = Math.floor(Math.random() * chars.length);
			randomstring += chars.substring(rnum,rnum+1);
		}
		return randomstring;
	},
	regexQuote: function(str) {
		return (str+'').replace(/([\\\.\+\*\?\[\^\]\$\(\)\{\}=!<>\|\:])/g, function(s, p1){
			return '\\'+p1;
		});
	}
};

// creates wrapper function to pass callbacks to. After all callbacks are done - onDone callback will be called
/*
Usage:

	var cbWrapper = lang.callbackCounter(function(){
		console.log('all callbacks are done');
	});

	doSomeAsyncStuff({param1: 123}, cbWrapper(function(){
		
	}));

	cbWrapper.run(); // this function begins the sequential call of callbacks

*/

lang.callbackCounter = function(onDone, opts) {
		
	var ts = ((new Date()).getTime()+Math.random(10)) * 10000 % 100,
		total = 0,
		callbacks = 0,
		results = [],
		chain = [],			
		opts = opts || {},
		chained = opts.chained || false,
		queue = opts.queue || false,
		run = false,
		done = false;
	
	function runChained() {

		for (var cb, i = 0; i < chain.length; i++) {
			cb = chain[i];
			if ( !cb ) return;
			results.push(cb.method.apply(cb.context, cb.args));				
		};			
		
		//done = true;
		if ( onDone ) {
			onDone(null, results, total);
		}			
		
	}
		
	var counter = function(cb, context) {
		
		var method = cb,    
			that = this;
			
		callbacks++;
		total++;
		// runs	as cc() function called
		
		return function(callbackNum, rs){ 
			return function() {
				
				// deffered function
				
				context = context || this;
				
				if ( chain[callbackNum-1] ) {
					console.log('[CALLBACK COUNTER]: Callback function was already called ', 'warn');
					console.log(method.toString());
				} else {
					chain[callbackNum-1] = {
						method: method,
						context: context,
						args: arguments
					};						
					callbacks--;
				}


				if (callbacks <= 0 && run) {
					runChained();
				}

			};
		}(total, lang.randomString(5));
					
	};
	
	counter.getTotal = function(){
		return total;
	};
	
	counter.run = function() {
		
		run = true;
		
		if (callbacks == 0) {
			runChained();
		}
		
	};
		
	return counter;
};


/*
 * Javascript Humane Dates
 * Copyright (c) 2008 Dean Landolt (deanlandolt.com)
 * Re-write by Zach Leatherman (zachleat.com)
 *
 * Adopted from the John Resig's pretty.js
 * at http://ejohn.org/blog/javascript-pretty-date
 * and henrah's proposed modification
 * at http://ejohn.org/blog/javascript-pretty-date/#comment-297458
 *
 * Licensed under the MIT license.
 */

function humaneDate(date, compareTo){

    if(!date) {
        return;
    }

    var lang = {
            ago: 'Ago',
            from: '',
            now: 'Just Now',
            minute: 'Minute',
            minutes: 'Minutes',
            hour: 'Hour',
            hours: 'Hours',
            day: 'Day',
            days: 'Days',
            week: 'Week',
            weeks: 'Weeks',
            month: 'Month',
            months: 'Months',
            year: 'Year',
            years: 'Years'
        },
        formats = [
            [60, lang.now],
            [3600, lang.minute, lang.minutes, 60], // 60 minutes, 1 minute
            [86400, lang.hour, lang.hours, 3600], // 24 hours, 1 hour
            [604800, lang.day, lang.days, 86400], // 7 days, 1 day
            [2628000, lang.week, lang.weeks, 604800], // ~1 month, 1 week
            [31536000, lang.month, lang.months, 2628000], // 1 year, ~1 month
            [Infinity, lang.year, lang.years, 31536000] // Infinity, 1 year
        ],
        isString = typeof date == 'string',
        date = isString ?
                    new Date(('' + date).replace(/-/g,"/").replace(/[TZ]/g," ")) :
                    date,
        compareTo = compareTo || new Date,
        seconds = (compareTo - date +
                        (compareTo.getTimezoneOffset() -
                            // if we received a GMT time from a string, doesn't include time zone bias
                            // if we got a date object, the time zone is built in, we need to remove it.
                            (isString ? 0 : date.getTimezoneOffset())
                        ) * 60000
                    ) / 1000,
        token;

    if(seconds < 0) {
        seconds = Math.abs(seconds);
        token = lang.from ? ' ' + lang.from : '';
    } else {
        token = lang.ago ? ' ' + lang.ago : '';
    }

    /*
     * 0 seconds && < 60 seconds        Now
     * 60 seconds                       1 Minute
     * > 60 seconds && < 60 minutes     X Minutes
     * 60 minutes                       1 Hour
     * > 60 minutes && < 24 hours       X Hours
     * 24 hours                         1 Day
     * > 24 hours && < 7 days           X Days
     * 7 days                           1 Week
     * > 7 days && < ~ 1 Month          X Weeks
     * ~ 1 Month                        1 Month
     * > ~ 1 Month && < 1 Year          X Months
     * 1 Year                           1 Year
     * > 1 Year                         X Years
     *
     * Single units are +10%. 1 Year shows first at 1 Year + 10%
     */

    function normalize(val, single)
    {
        var margin = 0.1;
        if(val >= single && val <= single * (1+margin)) {
            return single;
        }
        return val;
    }

    for(var i = 0, format = formats[0]; formats[i]; format = formats[++i]) {
        if(seconds < format[0]) {
            if(i === 0) {
                // Now
                return format[1];
            }

            var val = Math.ceil(normalize(seconds, format[3]) / (format[3]));
            return val +
                    ' ' +
                    (val != 1 ? format[2] : format[1]) +
                    (i > 0 ? token : '');
        }
    }
};

lang.prettyDate = humaneDate;

module.exports = lang;
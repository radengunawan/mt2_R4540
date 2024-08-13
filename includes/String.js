String.prototype.wordAt = function(i) {
    var r = new RegExp("( )+", "g");
    var str = this.replace(r, " ");
    r = new RegExp("(\ |\"[^\"]*\")");
    var matches = str.split(r);
    var matches2 = new Array();
    var k = 0;
    for (var j in matches) {
        if (matches[j].length > 0 && matches[j][0] != ' ') {
            matches2[k] = matches[j];
            k++;
        }
    }
    return matches2.length > i ? matches2[i] : "";
};

String.prototype.firstWord = function() {
    return this.wordAt(0);
};

String.prototype.afterWord = function(word) {
    var idx = this.indexOf(word);
    return idx != -1 ? this.substr(this.indexOf(word)) : "";
};


/**
 * object.trim()
 * Transform the string object removing leading and trailing whitespace
 *
 * @return      string
 * @access      public
 */
String.prototype.trim = function() {
    return this.replace(/(^\s*)|(\s*$)/g, "");
};

/**
 * object.trimLeft()
 * Transform the string object removing leading whitespace
 *
 * @return      string
 * @access      public
 */
String.prototype.trimLeft = function() {
    return this.replace(/(^\s*)/, "");
};

/**
 * object.trimRight()
 * Transform the string object removing trailing whitespace
 *
 * @return      string
 * @access      public
 */
String.prototype.trimRight = function() {
    return this.replace(/(\s*$)/g, "");
};

/**
 * object.dup()
 * Transform the string object duplicating the string
 *
 * @return      string
 * @access      public
 */
String.prototype.dup = function() {
    var val = this.valueOf();
    return val + val;
};

/**
 * object.x(number)
 * object.repeat(number)
 * Transform the string object multiplying the string
 *
 * @param       number  Amount of repeating
 * @return      string
 * @access      public
 * @see         http://svn.debugger.ru/repos/jslibs/BrowserExtensions/trunk/ext/string.js
 */
String.prototype.x =
    String.prototype.repeat = function(n) {
        if (!n || n <= 0 || this.length == 0) {
            return "";
        }

        return Array(n + 1).join(this.valueOf());
    };

/**
 * object.padding(number, string)
 * Transform the string object to string of the actual width filling by the padding character (by default ' ')
 * Negative value of width means left padding, and positive value means right one
 *
 * @param       number  Width of string
 * @param       string  Padding character (by default, ' ')
 * @return      string
 * @access      public
 */
String.prototype.padding = function(n, c) {
    var val = this.valueOf();
    if (Math.abs(n) <= val.length) {
        return val;
    }
    var pad = String(c).charAt(0).repeat(Math.abs(n) - this.length);
    return (n < 0) ? pad + val : val + pad;
};

/**
 * object.padLeft(number, string)
 * Wrapper for object.padding
 * Transform the string object to string of the actual width adding the leading padding character (by default ' ')
 *
 * @param       number  Width of string
 * @param       string  Padding character
 * @return      string
 * @access      public
 */
String.prototype.padLeft = function(n, c) {
    return this.padding(-Math.abs(n), c);
};

/**
 * object.alignRight(number, string)
 * Wrapper for object.padding
 * Synonym for object.padLeft
 *
 * @param       number  Width of string
 * @param       string  Padding character
 * @return      string
 * @access      public
 */
String.prototype.alignRight = String.prototype.padLeft;

/**
 * object.padRight(number, string)
 * Wrapper for object.padding
 * Transform the string object to string of the actual width adding the trailing padding character (by default ' ')
 *
 * @param       number  Width of string
 * @param       string  Padding character
 * @return      string
 * @access      public
 */
String.prototype.padRight = function(n, c) {
    return this.padding(Math.abs(n), c);
};

/**
 * object.alignLeft(number, string)
 * Wrapper for object.padding
 * Synonym for object.padRight
 *
 * @param       number  Width of string
 * @param       string  Padding character
 * @return      string
 * @access      public
 */
String.prototype.alignLeft = String.prototype.padRight;

/**
 * sprintf(format, argument_list)
 *
 * The string function like one in C/C++, PHP, Perl
 * Each conversion specification is defined as below:
 *
 * %[index][alignment][padding][width][precision]type
 *
 * index        An optional index specifier that changes the order of the 
 *              arguments in the list to be displayed.
 * alignment    An optional alignment specifier that says if the result should be 
 *              left-justified or right-justified. The default is 
 *              right-justified; a "-" character here will make it left-justified.
 * padding      An optional padding specifier that says what character will be 
 *              used for padding the results to the right string size. This may 
 *              be a space character or a "0" (zero character). The default is to 
 *              pad with spaces. An alternate padding character can be specified 
 *              by prefixing it with a single quote ('). See the examples below.
 * width        An optional number, a width specifier that says how many 
 *              characters (minimum) this conversion should result in.
 * precision    An optional precision specifier that says how many decimal digits 
 *              should be displayed for floating-point numbers. This option has 
 *              no effect for other types than float.
 * type         A type specifier that says what type the argument data should be 
 *              treated as. Possible types:
 *
 * % - a literal percent character. No argument is required.  
 * b - the argument is treated as an integer, and presented as a binary number.
 * c - the argument is treated as an integer, and presented as the character 
 *      with that ASCII value.
 * d - the argument is treated as an integer, and presented as a decimal number.
 * u - the same as "d".
 * f - the argument is treated as a float, and presented as a floating-point.
 * o - the argument is treated as an integer, and presented as an octal number.
 * s - the argument is treated as and presented as a string.
 * x - the argument is treated as an integer and presented as a hexadecimal 
 *       number (with lowercase letters).
 * X - the argument is treated as an integer and presented as a hexadecimal 
 *       number (with uppercase letters).
 * h - the argument is treated as an integer and presented in human-readable format 
 *       using powers of 1024.
 * H - the argument is treated as an integer and presented in human-readable format 
 *       using powers of 1000.
 */
String.prototype.sprintf = function() {
    var args = arguments;
    var index = 0;

    var x;
    var ins;
    var fn;

    /*
     * The callback function accepts the following properties
     *      x.index contains the substring position found at the origin string
     *      x[0] contains the found substring
     *      x[1] contains the index specifier (as \d+\$ or \d+#)
     *      x[2] contains the alignment specifier ("+" or "-" or empty)
     *      x[3] contains the padding specifier (space char, "0" or defined as '.)
     *      x[4] contains the width specifier (as \d*)
     *      x[5] contains the floating-point precision specifier (as \.\d*)
     *      x[6] contains the type specifier (as [bcdfosuxX])
     */
    return this.replace(String.prototype.sprintf.re, function() {
        if (arguments[0] == "%%") {
            return "%";
        }

        x = [];
        for (var i = 0; i < arguments.length; i++) {
            x[i] = arguments[i] || '';
        }
        x[3] = x[3].slice(-1) || ' ';

        ins = args[+x[1] ? x[1] - 1 : index];
        index++;

        return String.prototype.sprintf[x[6]](ins, x);
    });
};

String.prototype.sprintf.re = /%%|%(?:(\d+)[\$#])?([+-])?('.|0| )?(\d*)(?:\.(\d+))?([bcdfosuxXhH])/g;

String.prototype.sprintf.b = function(ins, x) {
    return Number(ins).bin(x[2] + x[4], x[3]);
};

String.prototype.sprintf.c = function(ins, x) {
    return String.fromCharCode(ins).padding(x[2] + x[4], x[3]);
};

String.prototype.sprintf.d =
    String.prototype.sprintf.u = function(ins, x) {
        return Number(ins).dec(x[2] + x[4], x[3]);
    };

String.prototype.sprintf.f = function(ins, x) {
    var ins = Number(ins);
    if (x[5]) {
        ins = ins.toFixed(x[5]);
    } else if (x[4]) {
        ins = ins.toExponential(x[4]);
    } else {
        ins = ins.toExponential();
    }
    // Invert sign because this is not number but string
    x[2] = x[2] == "-" ? "+" : "-";
    return ins.padding(x[2] + x[4], x[3]);
};

String.prototype.sprintf.o = function(ins, x) {
    return Number(ins).oct(x[2] + x[4], x[3]);
};

String.prototype.sprintf.s = function(ins, x) {
    return String(ins).padding(x[2] + x[4], x[3]);
};

String.prototype.sprintf.x = function(ins, x) {
    return Number(ins).hexl(x[2] + x[4], x[3]);
};

String.prototype.sprintf.X = function(ins, x) {
    return Number(ins).hex(x[2] + x[4], x[3]);
};

String.prototype.sprintf.h = function(ins, x) {
    var ins = String.prototype.replace.call(ins, /,/g, '');
    // Invert sign because this is not number but string
    x[2] = x[2] == "-" ? "+" : "-";
    return Number(ins).human(x[5], true).padding(x[2] + x[4], x[3]);
};

String.prototype.sprintf.H = function(ins, x) {
    var ins = String.prototype.replace.call(ins, /,/g, '');
    // Invert sign because this is not number but string
    x[2] = x[2] == "-" ? "+" : "-";
    return Number(ins).human(x[5], false).padding(x[2] + x[4], x[3]);
};


// A function common in modern JS
String.prototype.replaceAll = function(subStringToReplace, replacement) {
    switch(typeof subStringToReplace) {
        case "function": //ReGex is defined as a function or an object
        case "object":
            if(!subStringToReplace.global)
                throw new TypeError("replaceAll must be called with a global RegExp");
            return this.replace(subStringToReplace, replacement);

        default: //mainly for string, but subStringToReplace can be a number, or other stuff like that
            return this.replace(RegExp(subStringToReplace, "g"), replacement);
    }
};


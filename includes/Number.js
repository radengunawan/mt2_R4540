include("String.js");

/**
 * object.radix(number, number, string)
 * Transform the number object to string in accordance with a scale of notation
 * If it is necessary the numeric string will aligned to right and filled by '0' character, by default
 *
 * @param       number  Radix of scale of notation (it have to be greater or equal 2 and below or equal 36)
 * @param       number  Width of numeric string
 * @param       string  Padding character (by default, '0')
 * @return      string  Numeric string
 * @access      public
 */
Number.prototype.radix = function(r, n, c) {
    return this.toString(r).padding(-n, c);
};

/**
 * object.bin(number, string)
 * Transform the number object to string of binary presentation
 *
 * @param       number  Width of numeric string
 * @param       string  Padding character (by default, '0')
 * @return      string  Numeric string
 * @access      public
 */
Number.prototype.bin = function(n, c) {
    return this.radix(0x02, n, c);
};

/**
 * object.oct(number, string)
 * Transform the number object to string of octal presentation
 *
 * @param       number  Width of numeric string
 * @param       string  Padding character (by default, '0')
 * @return      string  Numeric string
 * @access      public
 */
Number.prototype.oct = function(n, c) {
    return this.radix(0x08, n, c);
};

/**
 * object.dec(number, string)
 * Transform the number object to string of decimal presentation
 *
 * @param       number  Width of numeric string
 * @param       string  Padding character (by default, '0')
 * @return      string  Numeric string
 * @access      public
 */
Number.prototype.dec = function(n, c) {
    return this.radix(0x0A, n, c);
};

/**
 * object.hexl(number, string)
 * Transform the number object to string of hexadecimal presentation in lower-case of major characters (0-9 and a-f)
 *
 * @param       number  Width of numeric string
 * @param       string  Padding character (by default, '0')
 * @return      string  Numeric string
 * @access      public
 */
Number.prototype.hexl = function(n, c) {
    return this.radix(0x10, n, c);
};

/**
 * object.hex(number, string)
 * Transform the number object to string of the hexadecimal presentation 
 * in upper-case of major characters (0-9 and A-F)
 *
 * @param       number  Width of numeric string
 * @param       string  Padding character (by default, '0')
 * @return      string  Numeric string
 * @access      public
 */
Number.prototype.hex = function(n, c) {
    return this.radix(0x10, n, c).toUpperCase();
};

isInteger = function(value) {
    if ((parseFloat(value) == parseInt(value)) && !isNaN(value)) {
        return true;
    } else {
        return false;
    }
}

/**
 * object.hex(number, string)
 * Transform the array object to string of the hexadecimal presentation 
 * in upper-case of major characters (0-9 and A-F)
 *
 * @param       number  Width of numeric string
 * @param       string  Padding character (by default, '0')
 * @return      string  Numeric string
 * @access      public
 */
toHex = function(a, n, c) {
    var results = Array(a.length);
    if (n == undefined) n = 2;
    if (c == undefined) c = '0';
    for (var i = 0; i < a.length; ++i) {
        results[i] = a[i].hex(n, c);
    }
    return results;
}

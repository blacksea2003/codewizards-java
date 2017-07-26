/*
 * transform: A jQuery cssHooks adding cross-browser 2d transform capabilities to $.fn.css() and $.fn.animate()
 *
 * limitations:
 * - requires jQuery 1.4.3+
 * - Should you use the *translate* property, then your elements need to be absolutely positionned in a relatively positionned wrapper **or it will fail in IE678**.
 * - transformOrigin is not accessible
 *
 * latest version and complete README available on Github:
 * https://github.com/louisremi/jquery.transform.js
 *
 * Copyright 2011 @louis_remi
 * Licensed under the MIT license.
 *
 * This saved you an hour of work?
 * Send me music http://www.amazon.co.uk/wishlist/HNTU0468LQON
 *
 */
(function( $, window, document, Math, undefined ) {

    /*
 * Feature tests and global variables
 */
    var div = document.createElement("div"),
        divStyle = div.style,
        suffix = "Transform",
        testProperties = [
            "O" + suffix,
            "ms" + suffix,
            "Webkit" + suffix,
            "Moz" + suffix
        ],
        i = testProperties.length,
        supportProperty,
        supportMatrixFilter,
        supportFloat32Array = "Float32Array" in window,
        propertyHook,
        propertyGet,
        rMatrix = /Matrix([^)]*)/,
        rAffine = /^\s*matrix\(\s*1\s*,\s*0\s*,\s*0\s*,\s*1\s*(?:,\s*0(?:px)?\s*){2}\)\s*$/,
        _transform = "transform",
        _transformOrigin = "transformOrigin",
        _translate = "translate",
        _rotate = "rotate",
        _scale = "scale",
        _skew = "skew",
        _matrix = "matrix";

    // test different vendor prefixes of these properties
    while ( i-- ) {
        if ( testProperties[i] in divStyle ) {
            $.support[_transform] = supportProperty = testProperties[i];
            $.support[_transformOrigin] = supportProperty + "Origin";
            continue;
        }
    }
    // IE678 alternative
    if ( !supportProperty ) {
        $.support.matrixFilter = supportMatrixFilter = divStyle.filter === "";
    }

    // px isn't the default unit of these properties
    $.cssNumber[_transform] = $.cssNumber[_transformOrigin] = true;

    /*
 * fn.css() hooks
 */
    if ( supportProperty && supportProperty != _transform ) {
        // Modern browsers can use jQuery.cssProps as a basic hook
        $.cssProps[_transform] = supportProperty;
        $.cssProps[_transformOrigin] = supportProperty + "Origin";

        // Firefox needs a complete hook because it stuffs matrix with "px"
        if ( supportProperty == "Moz" + suffix ) {
            propertyHook = {
                get: function( elem, computed ) {
                    return (computed ?
                            // remove "px" from the computed matrix
                            $.css( elem, supportProperty ).split("px").join(""):
                            elem.style[supportProperty]
                           );
                },
                set: function( elem, value ) {
                    // add "px" to matrices
                    elem.style[supportProperty] = /matrix\([^)p]*\)/.test(value) ?
                        value.replace(/matrix((?:[^,]*,){4})([^,]*),([^)]*)/, _matrix+"$1$2px,$3px"):
                    value;
                }
            };
            /* Fix two jQuery bugs still present in 1.5.1
	 * - rupper is incompatible with IE9, see http://jqbug.com/8346
	 * - jQuery.css is not really jQuery.cssProps aware, see http://jqbug.com/8402
	 */
        } else if ( /^1\.[0-5](?:\.|$)/.test($.fn.jquery) ) {
            propertyHook = {
                get: function( elem, computed ) {
                    return (computed ?
                            $.css( elem, supportProperty.replace(/^ms/, "Ms") ):
                            elem.style[supportProperty]
                           );
                }
            };
        }
        /* TODO: leverage hardware acceleration of 3d transform in Webkit only
	else if ( supportProperty == "Webkit" + suffix && support3dTransform ) {
		propertyHook = {
			set: function( elem, value ) {
				elem.style[supportProperty] = 
					value.replace();
			}
		}
	}*/

    } else if ( supportMatrixFilter ) {
        propertyHook = {
            get: function( elem, computed, asArray ) {
                var elemStyle = ( computed && elem.currentStyle ? elem.currentStyle : elem.style ),
                    matrix, data;

                if ( elemStyle && rMatrix.test( elemStyle.filter ) ) {
                    matrix = RegExp.$1.split(",");
                    matrix = [
                        matrix[0].split("=")[1],
                        matrix[2].split("=")[1],
                        matrix[1].split("=")[1],
                        matrix[3].split("=")[1]
                    ];
                } else {
                    matrix = [1,0,0,1];
                }

                if ( ! $.cssHooks[_transformOrigin] ) {
                    matrix[4] = elemStyle ? parseInt(elemStyle.left, 10) || 0 : 0;
                    matrix[5] = elemStyle ? parseInt(elemStyle.top, 10) || 0 : 0;

                } else {
                    data = $._data( elem, "transformTranslate", undefined );
                    matrix[4] = data ? data[0] : 0;
                    matrix[5] = data ? data[1] : 0;
                }

                return asArray ? matrix : _matrix+"(" + matrix + ")";
            },
            set: function( elem, value, animate ) {
                var elemStyle = elem.style,
                    currentStyle,
                    Matrix,
                    filter,
                    centerOrigin;

                if ( !animate ) {
                    elemStyle.zoom = 1;
                }

                value = matrix(value);

                // rotate, scale and skew
                Matrix = [
                    "Matrix("+
                    "M11="+value[0],
                    "M12="+value[2],
                    "M21="+value[1],
                    "M22="+value[3],
                    "SizingMethod='auto expand'"
                ].join();
                filter = ( currentStyle = elem.currentStyle ) && currentStyle.filter || elemStyle.filter || "";

                elemStyle.filter = rMatrix.test(filter) ?
                    filter.replace(rMatrix, Matrix) :
                filter + " progid:DXImageTransform.Microsoft." + Matrix + ")";

                if ( ! $.cssHooks[_transformOrigin] ) {

                    // center the transform origin, from pbakaus's Transformie http://github.com/pbakaus/transformie
                    if ( (centerOrigin = $.transform.centerOrigin) ) {
                        elemStyle[centerOrigin == "margin" ? "marginLeft" : "left"] = -(elem.offsetWidth/2) + (elem.clientWidth/2) + "px";
                        elemStyle[centerOrigin == "margin" ? "marginTop" : "top"] = -(elem.offsetHeight/2) + (elem.clientHeight/2) + "px";
                    }

                    // translate
                    // We assume that the elements are absolute positionned inside a relative positionned wrapper
                    elemStyle.left = value[4] + "px";
                    elemStyle.top = value[5] + "px";

                } else {
                    $.cssHooks[_transformOrigin].set( elem, value );
                }
            }
        };
    }
    // populate jQuery.cssHooks with the appropriate hook if necessary
    if ( propertyHook ) {
        $.cssHooks[_transform] = propertyHook;
    }
    // we need a unique setter for the animation logic
    propertyGet = propertyHook && propertyHook.get || $.css;

    /*
 * fn.animate() hooks
 */
    $.fx.step.transform = function( fx ) {
        var elem = fx.elem,
            start = fx.start,
            end = fx.end,
            pos = fx.pos,
            transform = "",
            precision = 1E5,
            i, startVal, endVal, unit;

        // fx.end and fx.start need to be converted to interpolation lists
        if ( !start || typeof start === "string" ) {

            // the following block can be commented out with jQuery 1.5.1+, see #7912
            if ( !start ) {
                start = propertyGet( elem, supportProperty );
            }

            // force layout only once per animation
            if ( supportMatrixFilter ) {
                elem.style.zoom = 1;
            }

            // replace "+=" in relative animations (-= is meaningless with transforms)
            end = end.split("+=").join(start);

            // parse both transform to generate interpolation list of same length
            $.extend( fx, interpolationList( start, end ) );
            start = fx.start;
            end = fx.end;
        }

        i = start.length;

        // interpolate functions of the list one by one
        while ( i-- ) {
            startVal = start[i];
            endVal = end[i];
            unit = +false;

            switch ( startVal[0] ) {

                case _translate:
                    unit = "px";
                case _scale:
                    unit || ( unit = "");

                    transform = startVal[0] + "(" +
                        Math.round( (startVal[1][0] + (endVal[1][0] - startVal[1][0]) * pos) * precision ) / precision + unit +","+
                        Math.round( (startVal[1][1] + (endVal[1][1] - startVal[1][1]) * pos) * precision ) / precision + unit + ")"+
                        transform;
                    break;

                case _skew + "X":
                case _skew + "Y":
                case _rotate:
                    transform = startVal[0] + "(" +
                        Math.round( (startVal[1] + (endVal[1] - startVal[1]) * pos) * precision ) / precision +"rad)"+
                        transform;
                    break;
                                 }
        }

        fx.origin && ( transform = fx.origin + transform );

        propertyHook && propertyHook.set ?
            propertyHook.set( elem, transform, +true ):
        elem.style[supportProperty] = transform;
    };

    /*
 * Utility functions
 */

    // turns a transform string into its "matrix(A,B,C,D,X,Y)" form (as an array, though)
    function matrix( transform ) {
        transform = transform.split(")");
        var
        trim = $.trim
        , i = -1
        // last element of the array is an empty string, get rid of it
        , l = transform.length -1
        , split, prop, val
        , prev = supportFloat32Array ? new Float32Array(6) : []
        , curr = supportFloat32Array ? new Float32Array(6) : []
        , rslt = supportFloat32Array ? new Float32Array(6) : [1,0,0,1,0,0]
        ;

        prev[0] = prev[3] = rslt[0] = rslt[3] = 1;
        prev[1] = prev[2] = prev[4] = prev[5] = 0;

        // Loop through the transform properties, parse and multiply them
        while ( ++i < l ) {
            split = transform[i].split("(");
            prop = trim(split[0]);
            val = split[1];
            curr[0] = curr[3] = 1;
            curr[1] = curr[2] = curr[4] = curr[5] = 0;

            switch (prop) {
                case _translate+"X":
                    curr[4] = parseInt(val, 10);
                    break;

                case _translate+"Y":
                    curr[5] = parseInt(val, 10);
                    break;

                case _translate:
                    val = val.split(",");
                    curr[4] = parseInt(val[0], 10);
                    curr[5] = parseInt(val[1] || 0, 10);
                    break;

                case _rotate:
                    val = toRadian(val);
                    curr[0] = Math.cos(val);
                    curr[1] = Math.sin(val);
                    curr[2] = -Math.sin(val);
                    curr[3] = Math.cos(val);
                    break;

                case _scale+"X":
                    curr[0] = +val;
                    break;

                case _scale+"Y":
                    curr[3] = val;
                    break;

                case _scale:
                    val = val.split(",");
                    curr[0] = val[0];
                    curr[3] = val.length>1 ? val[1] : val[0];
                    break;

                case _skew+"X":
                    curr[2] = Math.tan(toRadian(val));
                    break;

                case _skew+"Y":
                    curr[1] = Math.tan(toRadian(val));
                    break;

                case _matrix:
                    val = val.split(",");
                    curr[0] = val[0];
                    curr[1] = val[1];
                    curr[2] = val[2];
                    curr[3] = val[3];
                    curr[4] = parseInt(val[4], 10);
                    curr[5] = parseInt(val[5], 10);
                    break;
                        }

            // Matrix product (array in column-major order)
            rslt[0] = prev[0] * curr[0] + prev[2] * curr[1];
            rslt[1] = prev[1] * curr[0] + prev[3] * curr[1];
            rslt[2] = prev[0] * curr[2] + prev[2] * curr[3];
            rslt[3] = prev[1] * curr[2] + prev[3] * curr[3];
            rslt[4] = prev[0] * curr[4] + prev[2] * curr[5] + prev[4];
            rslt[5] = prev[1] * curr[4] + prev[3] * curr[5] + prev[5];

            prev = [rslt[0],rslt[1],rslt[2],rslt[3],rslt[4],rslt[5]];
        }
        return rslt;
    }

    // turns a matrix into its rotate, scale and skew components
    // algorithm from http://hg.mozilla.org/mozilla-central/file/7cb3e9795d04/layout/style/nsStyleAnimation.cpp
    function unmatrix(matrix) {
        var
        scaleX
        , scaleY
        , skew
        , A = matrix[0]
        , B = matrix[1]
        , C = matrix[2]
        , D = matrix[3]
        ;

        // Make sure matrix is not singular
        if ( A * D - B * C ) {
            // step (3)
            scaleX = Math.sqrt( A * A + B * B );
            A /= scaleX;
            B /= scaleX;
            // step (4)
            skew = A * C + B * D;
            C -= A * skew;
            D -= B * skew;
            // step (5)
            scaleY = Math.sqrt( C * C + D * D );
            C /= scaleY;
            D /= scaleY;
            skew /= scaleY;
            // step (6)
            if ( A * D < B * C ) {
                A = -A;
                B = -B;
                skew = -skew;
                scaleX = -scaleX;
            }

            // matrix is singular and cannot be interpolated
        } else {
            // In this case the elem shouldn't be rendered, hence scale == 0
            scaleX = scaleY = skew = 0;
        }

        // The recomposition order is very important
        // see http://hg.mozilla.org/mozilla-central/file/7cb3e9795d04/layout/style/nsStyleAnimation.cpp#l971
        return [
            [_translate, [+matrix[4], +matrix[5]]],
            [_rotate, Math.atan2(B, A)],
            [_skew + "X", Math.atan(skew)],
            [_scale, [scaleX, scaleY]]
        ];
    }

    // build the list of transform functions to interpolate
    // use the algorithm described at http://dev.w3.org/csswg/css3-2d-transforms/#animation
    function interpolationList( start, end ) {
        var list = {
            start: [],
            end: []
        },
            i = -1, l,
            currStart, currEnd, currType;

        // get rid of affine transform matrix
        ( start == "none" || isAffine( start ) ) && ( start = "" );
        ( end == "none" || isAffine( end ) ) && ( end = "" );

        // if end starts with the current computed style, this is a relative animation
        // store computed style as the origin, remove it from start and end
        if ( start && end && !end.indexOf("matrix") && toArray( start ).join() == toArray( end.split(")")[0] ).join() ) {
            list.origin = start;
            start = "";
            end = end.slice( end.indexOf(")") +1 );
        }

        if ( !start && !end ) { return; }

        // start or end are affine, or list of transform functions are identical
        // => functions will be interpolated individually
        if ( !start || !end || functionList(start) == functionList(end) ) {

            start && ( start = start.split(")") ) && ( l = start.length );
            end && ( end = end.split(")") ) && ( l = end.length );

            while ( ++i < l-1 ) {
                start[i] && ( currStart = start[i].split("(") );
                end[i] && ( currEnd = end[i].split("(") );
                currType = $.trim( ( currStart || currEnd )[0] );

                append( list.start, parseFunction( currType, currStart ? currStart[1] : 0 ) );
                append( list.end, parseFunction( currType, currEnd ? currEnd[1] : 0 ) );
            }

            // otherwise, functions will be composed to a single matrix
        } else {
            list.start = unmatrix(matrix(start));
            list.end = unmatrix(matrix(end))
        }

        return list;
    }

    function parseFunction( type, value ) {
        var
        // default value is 1 for scale, 0 otherwise
        defaultValue = +(!type.indexOf(_scale)),
            scaleX,
            // remove X/Y from scaleX/Y & translateX/Y, not from skew
            cat = type.replace( /e[XY]/, "e" );

        switch ( type ) {
            case _translate+"Y":
            case _scale+"Y":

                value = [
                    defaultValue,
                    value ?
                    parseFloat( value ):
                    defaultValue
                ];
                break;

            case _translate+"X":
            case _translate:
            case _scale+"X":
                scaleX = 1;
            case _scale:

                value = value ?
                    ( value = value.split(",") ) &&	[
                    parseFloat( value[0] ),
                    parseFloat( value.length>1 ? value[1] : type == _scale ? scaleX || value[0] : defaultValue+"" )
                ]:
                [defaultValue, defaultValue];
                break;

            case _skew+"X":
            case _skew+"Y":
            case _rotate:
                value = value ? toRadian( value ) : 0;
                break;

            case _matrix:
                return unmatrix( value ? toArray(value) : [1,0,0,1,0,0] );
                break;
                      }

        return [[ cat, value ]];
    }

    function isAffine( matrix ) {
        return rAffine.test(matrix);
    }

    function functionList( transform ) {
        return transform.replace(/(?:\([^)]*\))|\s/g, "");
    }

    function append( arr1, arr2, value ) {
        while ( value = arr2.shift() ) {
            arr1.push( value );
        }
    }

    // converts an angle string in any unit to a radian Float
    function toRadian(value) {
        return ~value.indexOf("deg") ?
            parseInt(value,10) * (Math.PI * 2 / 360):
            ~value.indexOf("grad") ?
            parseInt(value,10) * (Math.PI/200):
        parseFloat(value);
    }

    // Converts "matrix(A,B,C,D,X,Y)" to [A,B,C,D,X,Y]
    function toArray(matrix) {
        // remove the unit of X and Y for Firefox
        matrix = /([^,]*),([^,]*),([^,]*),([^,]*),([^,p]*)(?:px)?,([^)p]*)(?:px)?/.exec(matrix);
        return [matrix[1], matrix[2], matrix[3], matrix[4], matrix[5], matrix[6]];
    }

    $.transform = {
        centerOrigin: "margin"
    };

})( jQuery, window, document, Math );


/* val() function of jquery to return number instead of string in an input box */
(function ($) {
    var originalVal = $.fn.val;
    $.fn.val = function(value) {
        if(typeof value == 'undefined'){
            var text = this[0].value;
            var textInNum = parseInt(text);
            var type = this.attr('type');
            if(text == textInNum ){
                return textInNum;
            }else{
                if(type == 'number'){
                    return parseFloat(text);
                }else{
                    return this[0].value;
                }
            }
        }else{
            return originalVal.call(this, value);
        }
    };
})(jQuery);


var Canvas;
var waitTime=0;

var start = function() {
    Canvas = $('#canvas');
};

var addHeading = function(heading,size) {
    if($('#heading').length){
        $('#heading').text(heading);
    } else {
        Canvas.append('<h1 id="heading">'+heading+'</h1>');
    }
    $('#heading').css({
        'font-size':size+'px'
    });
};

var randomNum = function(start, end){
    return (start+(Math.random()*(end-start)));
}

var addBackground = function(url){
    $('#canvas').css("background-image", "url('"+ url +"')")
}

var addButton = function(label){
    var uid = 'button'+$('button').length;
    Canvas.append('<button id="'+uid+'">'+label+'</button>');
    return $('#'+uid);
}

var input = function(text){
    var uid = 'input' + $('input').length;

    Canvas.append("<input type='text' id="+uid+" placeholder='"+text+"'>");

    return $("#"+uid);
}

var inputNum = function(text){
    var uid = 'input' + $('input').length;

    Canvas.append("<input type='number' id="+uid+" placeholder='"+text+"'>");

    return $("#"+uid);
}

var addSoundEffect = function(src){
    var audioHTML = "<audio src='"+src+"' preload></audio>";
    $('body').append(audioHTML);
    return $(audioHTML)[0];
}

var addSound = function(src){
    var audioHTML = "<audio src='"+src+"' loop></audio>";
    $('body').append(audioHTML);
    return $(audioHTML)[0];    
}

var playMusic = function(audio){
	audio.play();
}

var positionEl = function(el, left, top){
    el.css({
        'top':top+'px',
        'left':left+'px',
        'position':'absolute'
    });
};

var addImage = function(src,size){
    var name = src.split('.')[0];
    if($('#'+name).length){
        name = name + $('img').length;
    }
    Canvas.append('<img src ="' + src + '" id = "' + name +'" width="'+size+'px"/>');
    $('#'+name).css({
        'position':'absolute'
    });
    return $('#'+name);
};

var addText = function(text, size){
    uid = 'text'+$('p').length;
    Canvas.append('<p id="'+uid+'" style="font-size:'+size+'px">'+text+'</p>');
    return $('#'+uid);
};

var updateText = function(el, text){
    el.text(text);
};

var showError = function(error){
    alert(error);
};

var bounceAnimation = function(el,scale, pause){
    randomDuration = Math.floor(Math.random()*500);
    pause = typeof pause !== 'undefined' ? pause : waitTime;
    var aniObj = {
        duration:1000+randomDuration,
        queue:'bounce'+el[0].id
    };
    el.delay(pause, 'bounce'+el[0].id).animate({
        "top":"+="+scale+"px"
    },aniObj).animate({
        "top":"-="+scale+"px"
    },{
        duration: aniObj.duration,
        queue: aniObj.queue,
        complete:function(){
            bounceAnimation(el,scale, pause);
        }
    });
};

var wait = function(time){
    waitTime += time*1000;
};

var bounce = function(el,scale){
    bounceAnimation(el,scale);
    el.dequeue('bounce'+el[0].id);
};

var vanish = function(el){
    var blastCSS = {
        'width':'80',
        'height':'auto',
        'opacity':0,
    }
    $(el).animate(blastCSS, function(){
        $(el).remove();
    });
}

var moveX = function(el, initialX, finalX, turns, alternate, speed){
    var randomSpeed = Math.floor(Math.random()*100)+100;
    speed = typeof speed !== 'undefined' ? speed : randomSpeed;

    var distance = Math.abs(finalX - initialX);
    var duration = (distance/speed)*1000;
    moveHAnimation(el, initialX, finalX, turns, alternate, duration, 'linear');
    el.dequeue('movex'+el[0].id);
}

var moveY = function(el, initialY, finalY, turns, alternate, speed){
    var randomSpeed = Math.floor(Math.random()*100)+100;
    speed = typeof speed !== 'undefined' ? speed : randomSpeed;

    var distance = Math.abs(finalY - initialY);
    var duration = (distance/speed)*1000;
    moveVAnimation(el, initialY, finalY, turns, alternate, duration, 'linear');
    el.dequeue('movey'+el[0].id);
}

var moveVAnimation =function(el, initialY, finalY, turns, alternate, duration, easing, pause){
    el.stop('movey'+el[0].id,true);
    pause = typeof pause !== 'undefined' ? pause : waitTime;
    var aniObj = {
        duration: duration,
        easing: easing,
        queue:'movey'+el[0].id,
        complete: function(){
            if(alternate){
                el.toggleClass('flipV');
                moveVAnimation(el, finalY, initialY, turns, alternate, duration, easing, 0);
            }else{
                moveVAnimation(el, initialY, finalY, turns, alternate, duration, easing, 0 );
            }
        }
    };

    if(turns){
        el.css('top', initialY+'px');
        el.delay(pause, 'movey'+el[0].id).animate({
            top: finalY+'px'
        }, aniObj);
    }

    if(turns != 'infinite'){
        turns--;
    }
}

var moveHAnimation = function(el, initialX, finalX, turns, alternate, duration, easing, pause){
    el.stop('movex'+el[0].id,true);
    pause = typeof pause !== 'undefined' ? pause : waitTime;
    var randomDuration = Math.floor(Math.random()*5000)+5000;
    duration = typeof duration !== 'undefined' ? duration : randomDuration;
    var aniObj = {
        duration: duration,
        easing: easing,
        queue:'movex'+el[0].id,
        complete: function(){
            if(alternate){
                el.toggleClass('flipH');
                moveHAnimation(el, finalX, initialX, turns, alternate, duration, easing, 0);
            }else{
                moveHAnimation(el, initialX, finalX, turns, alternate, duration, easing, 0);
            }
        }
    };

    if(turns){
        el.css('left', initialX+'px');
        el.delay(pause, 'movex'+el[0].id).animate({
            left: finalX+'px'
        }, aniObj);
    }

    if(turns != 'infinite'){
        turns--;
    }
}

var rotateAnimation = function(el, duration, turns, pause){
    pause = typeof pause !== 'undefined' ? pause : waitTime;
    var aniObj = {
        queue: 'rotate'+el[0].id,
        duration: duration,
        easing:'swing'
    }
    var rotateDegree = parseInt(turns)*360;
    el.delay(pause, 'rotate'+el[0].id).animate({transform: 'rotate('+rotateDegree+'deg)'}, aniObj);
}

var comeAndGo = function(el, position, turns, speed){
    var Xi, Xf, Yi, Yf;

    switch(position){
        case 'left':  Xi = 100; Yi = 800; Xf=100; Yf=150; break;
        case 'right': Xi = 1100; Yi = 800; Xf=1100; Yf=150; break;
        case 'center': Xi = 600; Yi = 800; Xf=600; Yf=150; break;
        default:Xi=600; Yi=800; Xf=600; Yf=150; break;
                           }


    var distance = Math.abs(Yf - Yi);
    var duration = (distance/speed)*1000;

    el.delay(waitTime, 'come-n-go'+el[0].id).animate({},duration, function(){
        moveVAnimation(el, Yi, Yf, turns*2, true, duration, 'swing');
        el.dequeue('movey'+el[0].id);

        moveHAnimation(el, Xi, Xf, turns, false, duration, 'swing');
        el.dequeue('movex'+el[0].id);

        rotateAnimation(el, duration*(2*turns), turns);
        el.dequeue('rotate'+el[0].id);
    });

    el.dequeue('come-n-go'+el[0].id);

};

var draggable = function(element){
    element.css({
        'cursor':'move'
    })
    element.mousedown(function(event){
        event.preventDefault();
        Canvas.mousemove(function(event){
            var x = event.clientX - (element.width()/2);
            var y = event.clientY - (element.height()/2);

            element.css({
                'position':'fixed',
                'left':x+'px',
                'z-index':'2',
                'top':y+'px',
            });
        });
    }).mouseup(function(){
        Canvas.unbind('mousemove');
    }).mouseout(function(){
        Canvas.unbind('mousemove');
    });
}

var movable = function(element){
    element.css({
        'transition':'0.1s all ease'
    });
    $(document).keydown(function(event){
        var keyPressed = event.originalEvent.code;
        console.log("key prsed", keyPressed);
        if(keyPressed == 'ArrowRight'){
            element.css({
                'left': "+=20px"
            });
        } else if(keyPressed == 'ArrowLeft'){
            element.css({
                'left': "-=20px"
            });
        } else if(keyPressed == 'ArrowUp'){
            element.css({
                'top': "-=20px"
            });
        } else if(keyPressed == 'ArrowDown'){
            element.css({
                'top': "+=20px"
            });
        }
    })
}

var clear = function(){
    Canvas.html(" ");
}

var checkCollision = function(players, myplayer, cFunc){
    var interval = setInterval(function(){
        collision(players, myplayer, cFunc);
    }, 100);
}

var collision = function(bound, compare, cFunc){
    var boundArray = bound;
    var compareArray = compare;

    if(compareArray.length){

        for(i=0; i<boundArray.length; i++){
            boundOffset = $(boundArray[i]).offset();
            boundOffset.right = boundOffset.left + $(boundArray[i]).width();
            boundOffset.bottom = boundOffset.top + $(boundArray[i]).height();

            for(j=0; j<compareArray.length; j++){
                comparePosition = $(compareArray[j]).offset();
                if(boundOffset.bottom > comparePosition.top &&
                   boundOffset.top < comparePosition.top){
                    if(boundOffset.right > comparePosition.left &&
                       boundOffset.left < comparePosition.left){
                        //return boundArray[i];
                        if(cFunc){
                        cFunc();
                        }else{
                          return true;
                        }
                    }
                }
            }
        }
    }
}

var getX = function(element){
    var left = element.css('left');
    left = parseInt(left);
    return left;
}

/* Programming 101 class 1 */
var rocket = {
    launchCodeEntered: false,
    startCountDown: false,
    counting: false,
    ignition: false,
    launchReady: false,
    errorOccured: false,

    landingCodeEntered: false,
    descend: false,
    descending: false,
    ignitionKilled: false,
    engineKilled: false
}

var start = function() {
    Canvas = $('#canvas');
    rocket.error = $("#error");
    rocket.message = $('#messages');
};

var enterLaunchCode = function(code){
    var codeInput, btn;
    if(!rocket.errorOccured){
        rocket.launchCodeEntered = true;
        codeInput = input("Enter launch code here");
        positionEl(codeInput, 230, 190);
        btn = addButton("Launch");
        var helicopterSound = addSoundEffect("helicopter.mp3");
        helicopterSound.play();
    }
    btn.click(function(){
        if(codeInput.val() == code){
            rocket.message.append("<p>Launch Code Entered</p>");
            rocket.img = addImage('rocket.png', 100);
            positionEl(rocket.img, 1000, 560);
            if(rocket.startCountDown){
                setTimeout(function(){
                    startCounting(countdown);
                },800);
            }
        }else{
            if(!rocket.errorOccured){
                rocket.error.text("Wrong launch code!!");
                rocket.errorOccured = true;
            }
        }
        codeInput.hide();
        btn.hide();
    });
}

var startCountDown = function(num){    
    if(rocket.launchCodeEntered){
        rocket.startCountDown = true;
        countdown = num;
    }else{
        if(!rocket.errorOccured){
            rocket.error.text("No launch code entered")
            rocket.errorOccured = true;
        }
    }
}

var startCounting = function(num){
    rocket.counting = true;
    $("#launchTime").append("<p>Launching in</p><p id='countdown'>"+num+"</p>");
    var counter = $("#countdown");
    rocket.message.append("<p>Countdown Started</p>");
    var trumpetSound = addSoundEffect("trumpet.mp3");
    trumpetSound.play();

    var stopwatch = setInterval(function(){
        if(countdown > 0){
            countdown--;
            updateText(counter, countdown);    
        }else{
            rocket.counting = false;
            clearInterval(stopwatch);
            if(rocket.ignition){
                ignite();
            }else{
                if(!rocket.errorOccured){
                    rocket.error.text("Please add a ignition instruction");
                    rocket.errorOccured = true;
                }
            }
        }
    }, 1000);
}

var ignition = function(){
    if(rocket.startCountDown){
        rocket.ignition = true;
    }else{
        rocket.ignition = false;
        if(!rocket.errorOccured){
            rocket.error.text("Error in ignition instruction");
            rocket.errorOccured = true;
        }
    }
}

var launch = function(){
    if(rocket.ignition){
        rocket.launchReady = true;
    }else{
        if(!rocket.errorOccured){
            rocket.error.text("Error in launch instruction");
            rocket.errorOccured = true;
        }
    }
}

var ignite = function(){
    if(!rocket.counting){
        setTimeout(function(){
            rocket.fire = addImage("fire.png", 100);
            positionEl(rocket.fire, 1000, 600);
            rocket.message.append("<p>Ignition Started</p>");
            ignitionSound = addSoundEffect('ignition.wav');
            ignitionSound.play();
            if(rocket.launchReady){
                fly();
            }else{
                if(!rocket.errorOccured){
                    roket.error.text("Unable to find launch instruction");
                    rocket.errorOccured = true;
                }
            }
        }, 1000);
    }
}

var fly = function(){
    setTimeout(function(){
        moveY(rocket.img, 560, -560, 1, false,100);
        moveY(rocket.fire, 600, -600, 1, false,100);
        rocket.message.append("<p>Rocket launched.</p>");
    },2000);
}

var enterLandingCode = function(code){
    var codeInput, btn;
    if(!rocket.errorOccured){
        rocket.landingCodeEntered = true;
        codeInput = input("Enter landing code here");
        positionEl(codeInput, 230, 190);
        btn = addButton("Land");
        var helicopterSound = addSoundEffect("helicopter.mp3");
        helicopterSound.play();
    }
    btn.click(function(){
        if(codeInput.val() == code){
            rocket.message.append("<p>Landing Code Entered</p>");
            rocket.img = addImage('rocket.png', 100);
            rocket.fire = addImage('fire.png', 100)
            positionEl(rocket.img, 1000, -560);
            positionEl(rocket.fire, 1000, -520);

            if(rocket.descending && !rocket.errorOccured){
                ignitionSound = addSoundEffect('ignition.wav');
                ignitionSound.play();
                moveY(rocket.img, -560, 560, 1, false, 100)
                moveY(rocket.fire, -520, 600, 1, false, 100)
                rocket.message.append("<p>Rocket is coming down</p>")
            }
        }else{
            if(!rocket.errorOccured){
                rocket.error.text("Wrong launch code!!");
                rocket.errorOccured = true;
            }
        }
        codeInput.hide();
        btn.hide();
    });
}

var descend = function(){
    if(rocket.landingCodeEntered){
        rocket.descending = true;
    }else{
        if(!rocket.errorOccured){
            rocket.error.text("No launch code entered")
            rocket.errorOccured = true;
        }
    }
}

var killIgnition = function(){
    if(rocket.descending){
        rocket.ignitionKilled = true;
        var interval = setInterval(function(){
            if(rocket.img && !rocket.errorOccured){
                var top = rocket.img.position().top;
                if(top >= 560){
                    clearInterval(interval);
                    rocket.message.append("<p>Killing ignition</p>")
                    setTimeout(function(){
                        rocket.message.append("<p>Rocket successfully landed</p>")
                        rocket.fire.remove();
                    }, 800);
                }
            }
        }, 500);
    }else{
        if(!rocket.errorOccured){
            rocket.error.text("Error in ignition instruction!!");
            rocket.errorOccured = true;
        }
    }
}

/* Programming 101 class 2 */
var addSpaceship = function(top,left,size,name,isEngineOn){
    var random = Math.floor(Math.random()*9);
    var src = 'spaceship'+random+'.png';
    var ship = addImage(src,size);
    positionEl(ship, left, top);
    if(isEngineOn){
        bounce(ship,30);
    }
};
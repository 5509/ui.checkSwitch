/*!
 * ui.checkSwitch
 *
 * @version      0.12
 * @author       nori (norimania@gmail.com)
 * @copyright    5509 (http://5509.me/)
 * @license      The MIT License
 * @link         https://github.com/5509/ui.checkSwitch
 *
 * 2012-04:07 03:10
 */
(function(window, document, undefined) {
  
  var
  // support
  hasTouchEvents = 'ontouchstart' in window,
  hasAddEvent = 'addEventListener' in window,

  // TouchEvents
  TOUCHSTARTEV = hasTouchEvents ? 'touchstart' : 'mousedown',
  TOUCHMOVEEV = hasTouchEvents ? 'touchmove' : 'mousemove',
  TOUCHENDEV = hasTouchEvents ? 'touchend' : 'mouseup';

  function CheckSwitch(elem, conf) {
    this.namespace = 'CheckSwitch';
    if ( !(this instanceof CheckSwitch) ) {
      return new CheckSwitch(elem, conf);
    }
    return this.init(elem, conf);
  }
  CheckSwitch.prototype = {

    init: function(elem, conf) {

      var self = this;

      if ( typeof elem === 'string' ) {
        self.elem = document.getElementById(elem.replace('#', ''));
      } else {
        self.elem = elem;
      }

      if ( self.elem.nodeName !== 'INPUT'
        || self.elem.type !== 'checkbox' ) {
        throw Error('You can\'t use ' + self.namespace + ' for except input[type=checkbox]');
      }

      self.conf = extendObj({
        checkOnText     : 'ON',
        checkOffText    : 'OFF',
        uiClass         : 'ui_check_switch',
        uiOnClass       : 'ui_check_switch_on',
        uiOffClass      : 'ui_check_switch_off',
        uiInnerClass    : 'ui_check_switch_inner',
        uiSliderClass   : 'ui_check_switch_slider',
        uiTextClass     : 'ui_check_text',
        uiKnobClass     : 'ui_check_knob',
        uiCheckOffClass : 'ui_check_off',
        uiCheckOnClass  : 'ui_check_on'
      }, conf || {});

      self.onClass = self.conf.uiClass + ' ' + self.conf.uiOnClass;
      self.offClass = self.conf.uiClass + ' ' + self.conf.uiOffClass;

      self.elemDefDisplay = undefined;
      // old IEs
      if ( self.elem.currentStyle ) {
        self.elemDefDisplay = self.elem.currentStyle['display'];
      // others
      } else {
        self.elemDefDisplay = getComputedStyle(self.elem)['display'];
      }

      self.state = false; // true: on, false: off
      self.touchEnabled = true;
      self.currentPoint = 0;
      self.currentX = 0;
      self.maxX = self.elem.offsetWidth;
      self.disabled = false;
      self.destroyed = false;

      // build
      self._view();
      self._setHandle();
    },

    _setHandle: function() {
      var self = this;
      // except IE
      if ( hasAddEvent ) {
        self.view.addEventListener(TOUCHSTARTEV, self, false);
        document.addEventListener(TOUCHMOVEEV, self, false);
        document.addEventListener(TOUCHENDEV, self, false);
      // old IE (less than IE8
      } else {
        self.handledStart = handleEvent(
          self.view,
          TOUCHSTARTEV,
          function(ev) { self._touchStart(ev); }
        );
        self.handledMove = handleEvent(
          document.body,
          TOUCHMOVEEV,
          function(ev) { self._touchMove(ev); }
        );
        self.handledEnd = handleEvent(
          document.body,
          TOUCHENDEV,
          function(ev) { self._touchEnd(ev); }
        );
      }
    },

    handleEvent: function(ev) {
      var self = this;
      
      // events handling
      switch ( ev.type ) {
      case TOUCHSTARTEV:
        self._touchStart(ev);
        break;
      case TOUCHMOVEEV:
        self._touchMove(ev);
        break;
      case TOUCHENDEV:
        self._touchEnd(ev);
        break;
      case 'click':
        self._click(ev);
        break;
      }
    },

    _touchStart: function(ev) {
      var self = this;

      if ( !self.touchEnabled || self.disabled ) {
        return;
      }

      if ( !hasTouchEvents ) {
        if ( hasAddEvent ) {
          ev.preventDefault();
        } else {
          ev.returnValue = false;
        }
      }

      self.scrolling = true;
      self.moveReady = false;
      self.startPageX = getPage(ev, 'pageX');
      self.startPageY = getPage(ev, 'pageY');
      self.basePageX = self.startPageX;
      self.directionX = 0;
      self.startTime = ev.timeStamp;
    },

    _touchMove: function(ev) {
      var self = this,
        pageX = undefined,
        pageY = undefined,
        distX = undefined,
        newX = undefined,
        deltaX = undefined,
        deltaY = undefined;

      if ( !self.scrolling ) {
        return;
      }

      pageX = getPage(ev, 'pageX');
      pageY = getPage(ev, 'pageY');

      if ( self.moveReady ) {
        if ( hasAddEvent ) {
          ev.preventDefault();
          ev.stopPropagation();
        } else {
          ev.returnValue = false;
          ev.cancelBubble = true;
        }

        distX = pageX - self.basePageX;
        self.directionX = distX;

        self._moving();
        self._slide(self.directionX);
      } else {
        deltaX = Math.abs(pageX - self.startPageX);
        deltaY = Math.abs(pageY - self.startPageY);
        if ( deltaX > 5 ) {
          if ( hasAddEvent ) {
            ev.preventDefault();
            ev.stopPropagation();
          } else {
            ev.returnValue = false;
            ev.cancelBubble = true;
          }
          self.moveReady = true;
        } else
        if ( deltaY > 5 ) {
          self.scrolling = false;
        }
      }

      self.basePageX = pageX;
    },

    _touchEnd: function(ev) {
      var self = this,
        conf = self.conf;

      if ( !self.scrolling ) {
        return;
      }

      // tapout (touchend
      if ( !self.moveReady ) {
        if ( self.getState() ) {
          self._off();
        } else {
          self._on();
        }
      } else {
        // on
        if ( self.getState() ) {
          if ( self.sliderCurrent <= -self.range/2 ) {
            self._off();
          } else {
            self._on();
          }
        // off
        } else {
          if ( -self.range/2 <= self.sliderCurrent ) {
            self._on();
          } else {
            self._off();
          }
        }
      }

      self.scrolling = false;
    },

    // build view
    _view: function() {
      var self = this,
        conf = self.conf;

      // view nodes
      self.view = document.createElement('span');
      self.view.className = conf.uiClass;
      self.view.innerHTML = [
        '<span class="' + conf.uiInnerClass + '">',
          '<span class="' + conf.uiSliderClass + '">',
            '<span class="' + conf.uiCheckOnClass,
            ' ' + conf.uiTextClass,
            '">' + conf.checkOnText + '</span>',
            '<span class="' + conf.uiKnobClass + '"></span>',
            '<span class="' + conf.uiCheckOffClass,
            ' ' + conf.uiTextClass,
            '">' + conf.checkOffText + '</span>',
          '</span>',
        '</span>'
      ].join('');

      // elems
      self.slider = self.view.childNodes[0].childNodes[0];
      self.knob = self.slider.childNodes[1];
      // replace
      self.elem.parentNode.insertBefore(
        self.view,
        self.elem.nextSibling
      );
      styles(self.elem, {
        display: 'none'
      });

      // range
      self.range = (self.slider.offsetWidth - self.knob.offsetWidth) / 2;
      self.sliderCurrent = self.getState() ? 0 : -self.range;
      // init position
      self._setSliderPos(self.sliderCurrent);

      // run with async for not using transitions
      setTimeout(function() {
        if ( self.getState() ) {
          self._on();
        } else {
          self._off();
        }
      }, 0);

      return self.view;
    },

    // move switch slider
    _slide: function(x) {
      var self = this,
        current = self.sliderCurrent,
        next = current + x;

      if ( next >= 0 ) {
        next = 0;
      } else
      if ( next <= -self.range ) {
        next = -self.range;
      }

      self.sliderCurrent = next;
      self._setSliderPos(next);
    },

    // just moving
    _moving: function() {
      var self = this;
      self.view.className = self.conf.uiClass;
    },

    // move to
    _setSliderPos: function(x) {
      var self = this;
      self.sliderCurrent = x;
      styles(self.slider, {
        marginLeft: x + 'px'
      });
    },

    // check on
    _on: function() {
      var self = this,
        conf = self.conf,
        onClass = conf.uiClass + ' ' + conf.uiOnClass;

      self._setState(true);
      self.currentX = 0;
      self._setSliderPos(0);
      self.view.className = onClass;

      trigger(self.view, 'checkSwitch:on', {
        elem: self.elem,
        id: self.elem.id,
        name: self.elem.name
      });
    },

    // check off
    _off: function() {
      var self = this,
        conf = self.conf,
        offClass = conf.uiClass + ' ' + conf.uiOffClass;

      self._setState(false);
      self.currentX = -self.range;
      self._setSliderPos(-self.range);
      self.view.className = offClass;

      trigger(self.view, 'checkSwitch:off', {
        elem: self.elem,
        id: self.elem.id,
        name: self.elem.name
      });
    },

    // set checkbox state
    _setState: function(state) {
      var self = this;
      self.elem.checked = state ? 'checked' : '';
    },

    // get checkbox state
    getState: function() {
      var self = this;
      return self.elem.checked ? true : false;
    },

    on: function() {
      var self = this;
      self._on();
    },

    off: function() {
      var self = this;
      self._off();
    },

    // event binding API
    bind: function(obj) {
      var self = this,
        c = undefined;
      for ( c in obj ) {
        addEvent(self.view, c, obj[c]);
      }
    },

    // destroy this
    destroy: function() {
      var self = this;

      if ( hasAddEvent ) {
        document.removeEventListener(TOUCHMOVEEV, self, false);
        document.removeEventListener(TOUCHENDEV, self, false);
      } else {
        self.handledMove.detach();
        self.handledEnd.detach();
      }

      self.view.parentNode.removeChild(self.view);
      styles(self.elem, {
        display: self.elemDefDisplay
      });
    }

  };

  function handleEvent(elem, listener, func) {
    var _func = func;
    elem.attachEvent('on' + listener, _func);
    return {
      detach: function() {
        elem.detachEvent('on' + listener, _func);
      }
    }
  }

  function trigger(elm, listener, obj) {
    var evtObj;
    if ( 'createEvent' in document ) {
      evtObj = document.createEvent('UIEvents');
      evtObj.initEvent(listener, false, true);
      evtObj.checkSwitch = obj;
      elm.dispatchEvent(evtObj);
    } else
    if ( 'createEventObject' in document ) {
      evtObj = document.createEventObject();
      evtObj.name = listener;
      evtObj.checkSwitch = obj;
      elm.fireEvent('ondataavailable', evtObj);
    }
  }

  function addEvent(elm, listener, func) {
    if ( window.addEventListener ) {
      elm.addEventListener(listener, func, false);
    } else {
      if ( !elm[listener] ) {
        elm.attachEvent('ondataavailable', function(evtObj) {
          evtObj.func = evtObj.func || {};
          evtObj.func[listener] = func;

          if ( !evtObj.func[evtObj.name] ) return;
          evtObj.func[evtObj.name](evtObj);
          evtObj.name = null;
        });
      } else {
        elm.attachEvent('on' + listener, func);
      }
    }
  }

  function getPage(ev, page) {
    var page_pos = undefined,
      b = document.body,
      dE = document.documentElement;
    // mobile
    if ( hasTouchEvents ) {
      pagePos = ev.changedTouches[0][page];
    // except IE8-
    } else
    if ( ev[page] ) {
      pagePos = ev[page];
    // IE8-
    } else {
      if ( page === 'pageX' ) {
        pagePos = ev.clientX + b.scrollLeft + dE.scrollLeft;
      } else {
        pagePos = ev.clientY + b.scrollTop + dE.scrollTop;
      }
    }
    return pagePos;
  }

  function styles(elem, styles) {
    var c = undefined;
    for ( c in styles ) {
      elem.style[c] = styles[c];
    }
  }

  function extendObj(base, obj) {
    var c = undefined;
    for ( c in obj ) {
      if ( !(c in base) ) break;
      base[c] = obj[c];
    }
    return base;
  }

  function extendMethod(base, obj) {
    var c = undefined,
      namespace = toFirstLetterLowerCase(obj.namespace),
      method_name = undefined;
    for ( c in obj ) {
      if ( typeof obj[c] !== 'function'
        || /(?:^_)|(?:^handleEvent$)|(?:^init$)/.test(c) ) {
        continue;
      }
      method_name = namespace + toFirstLetterUpperCase(c);
      base[method_name] = (function() {
        var p = c;
        return function(arguments) {
          return obj[p](arguments);
        }
      }());
    }
  }

  function toFirstLetterUpperCase(string) {
    return string.replace(
      /(^[a-z])/,
      function($1) {
        return $1.toUpperCase();
      }
    );
  }

  function toFirstLetterLowerCase(string) {
    return string.replace(
      /(^[A-Z])/,
      function($1) {
        return $1.toLowerCase();
      }
    );
  }

  window.CheckSwitch = CheckSwitch;

}(this, this.document));

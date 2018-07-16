(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (factory((global['js-data-frappe'] = {})));
}(this, (function (exports) { 'use strict';

    /**
     * This is the default implementation of a query ascending behaviour.
     * Usually, custom models may replace this function generate their internal
     * query language.
     * @example
     * // used on a fetch query on some model.
     * model.fetch({ orderby: r => asc(r.id) });
     * @param {string} col The column to order in ascending order
     * @returns {function} A comparison function to use between two objects
     */
    function asc(col) {
        return function (a, b) {
            return a[col] - b[col];
        };
    }

    /**
     * This is the default implementation of a query descending behaviour.
     * Usually, custom models may replace this function generate their internal
     * query language.
     * @example
     * // used on a fetch query on some model.
     * model.fetch({ orderby: r => desc(r.id) });
     * @param {string} col The column to order in descending order
     * @returns {function} A comparison function to use between two objects
     */
    function desc(col) {
        return function (a, b) {
            return b[col] - a[col];
        };
    }

    /**
     * Helper function. It accumulates an array of asc or desc calls to implement
     * multi column sorting for local stores. It is usually used internally and should
     * not be used outside of building custom models.
     * @example
     * // multi column sorting
     * [
     *  {a: 1, b:1}, 
     *  {a:1, b: 2}, 
     *  {a: 2, b:1}, 
     *  {a: 2, b: 2}
     * ].sort(multiColSort([asc('a'), desc('b')]))
     * // result:
     * [
     *  {a: 1, b: 2},
     *  {a: 1, b: 1},
     *  {a: 2, b: 2},
     *  {a: 2, b: 1}
     * ]
     * @param {Array} orderby An array or single asc/desc function to accumulate
     * @returns {function} A comparison function which combines the provided array of sort functions.
     */
    function multiColSort(orderby) {
        if (orderby.constructor !== Array) {
            orderby = [orderby];
        }

        let fn = orderby.shift();
        return function (a, b) {
            let result = fn(a, b);
            if (result === 0 && orderby.length > 0) {
                return multiColSort(orderby)(a, b);
            }

            return result;
        };
    }

    /**
     * 
     * @param {*} fn A value to test if is considered an arrow function.
     * @returns {boolean} true or false
     */
    function isArrowFunction(fn) {
        let fnSrc = fn.toString();
        return (/^\s*(\(\s*\)|\([a-z0-9_=,\s+\{\}\.]+\)|[a-z0-9_\.]+)\s*=>.+/.test(fnSrc)
        );
    }

    var queryUtils = /*#__PURE__*/Object.freeze({
        asc: asc,
        desc: desc,
        multiColSort: multiColSort,
        isArrowFunction: isArrowFunction
    });

    // TODO: Implement model schema definitions to automate validation
    class Schema {
        constructor(options) {
            this.options = options;
        }

        validate(field, value) {
            // TODO: validate agaisnt json schema
        }
    }

    var domain;

    // This constructor is used to store event handlers. Instantiating this is
    // faster than explicitly calling `Object.create(null)` to get a "clean" empty
    // object (tested with v8 v4.9).
    function EventHandlers() {}
    EventHandlers.prototype = Object.create(null);

    function EventEmitter() {
      EventEmitter.init.call(this);
    }

    // nodejs oddity
    // require('events') === require('events').EventEmitter
    EventEmitter.EventEmitter = EventEmitter;

    EventEmitter.usingDomains = false;

    EventEmitter.prototype.domain = undefined;
    EventEmitter.prototype._events = undefined;
    EventEmitter.prototype._maxListeners = undefined;

    // By default EventEmitters will print a warning if more than 10 listeners are
    // added to it. This is a useful default which helps finding memory leaks.
    EventEmitter.defaultMaxListeners = 10;

    EventEmitter.init = function() {
      this.domain = null;
      if (EventEmitter.usingDomains) {
        // if there is an active domain, then attach to it.
        if (domain.active) ;
      }

      if (!this._events || this._events === Object.getPrototypeOf(this)._events) {
        this._events = new EventHandlers();
        this._eventsCount = 0;
      }

      this._maxListeners = this._maxListeners || undefined;
    };

    // Obviously not all Emitters should be limited to 10. This function allows
    // that to be increased. Set to zero for unlimited.
    EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
      if (typeof n !== 'number' || n < 0 || isNaN(n))
        throw new TypeError('"n" argument must be a positive number');
      this._maxListeners = n;
      return this;
    };

    function $getMaxListeners(that) {
      if (that._maxListeners === undefined)
        return EventEmitter.defaultMaxListeners;
      return that._maxListeners;
    }

    EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
      return $getMaxListeners(this);
    };

    // These standalone emit* functions are used to optimize calling of event
    // handlers for fast cases because emit() itself often has a variable number of
    // arguments and can be deoptimized because of that. These functions always have
    // the same number of arguments and thus do not get deoptimized, so the code
    // inside them can execute faster.
    function emitNone(handler, isFn, self) {
      if (isFn)
        handler.call(self);
      else {
        var len = handler.length;
        var listeners = arrayClone(handler, len);
        for (var i = 0; i < len; ++i)
          listeners[i].call(self);
      }
    }
    function emitOne(handler, isFn, self, arg1) {
      if (isFn)
        handler.call(self, arg1);
      else {
        var len = handler.length;
        var listeners = arrayClone(handler, len);
        for (var i = 0; i < len; ++i)
          listeners[i].call(self, arg1);
      }
    }
    function emitTwo(handler, isFn, self, arg1, arg2) {
      if (isFn)
        handler.call(self, arg1, arg2);
      else {
        var len = handler.length;
        var listeners = arrayClone(handler, len);
        for (var i = 0; i < len; ++i)
          listeners[i].call(self, arg1, arg2);
      }
    }
    function emitThree(handler, isFn, self, arg1, arg2, arg3) {
      if (isFn)
        handler.call(self, arg1, arg2, arg3);
      else {
        var len = handler.length;
        var listeners = arrayClone(handler, len);
        for (var i = 0; i < len; ++i)
          listeners[i].call(self, arg1, arg2, arg3);
      }
    }

    function emitMany(handler, isFn, self, args) {
      if (isFn)
        handler.apply(self, args);
      else {
        var len = handler.length;
        var listeners = arrayClone(handler, len);
        for (var i = 0; i < len; ++i)
          listeners[i].apply(self, args);
      }
    }

    EventEmitter.prototype.emit = function emit(type) {
      var er, handler, len, args, i, events, domain;
      var doError = (type === 'error');

      events = this._events;
      if (events)
        doError = (doError && events.error == null);
      else if (!doError)
        return false;

      domain = this.domain;

      // If there is no 'error' event listener then throw.
      if (doError) {
        er = arguments[1];
        if (domain) {
          if (!er)
            er = new Error('Uncaught, unspecified "error" event');
          er.domainEmitter = this;
          er.domain = domain;
          er.domainThrown = false;
          domain.emit('error', er);
        } else if (er instanceof Error) {
          throw er; // Unhandled 'error' event
        } else {
          // At least give some kind of context to the user
          var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
          err.context = er;
          throw err;
        }
        return false;
      }

      handler = events[type];

      if (!handler)
        return false;

      var isFn = typeof handler === 'function';
      len = arguments.length;
      switch (len) {
        // fast cases
        case 1:
          emitNone(handler, isFn, this);
          break;
        case 2:
          emitOne(handler, isFn, this, arguments[1]);
          break;
        case 3:
          emitTwo(handler, isFn, this, arguments[1], arguments[2]);
          break;
        case 4:
          emitThree(handler, isFn, this, arguments[1], arguments[2], arguments[3]);
          break;
        // slower
        default:
          args = new Array(len - 1);
          for (i = 1; i < len; i++)
            args[i - 1] = arguments[i];
          emitMany(handler, isFn, this, args);
      }

      return true;
    };

    function _addListener(target, type, listener, prepend) {
      var m;
      var events;
      var existing;

      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');

      events = target._events;
      if (!events) {
        events = target._events = new EventHandlers();
        target._eventsCount = 0;
      } else {
        // To avoid recursion in the case that type === "newListener"! Before
        // adding it to the listeners, first emit "newListener".
        if (events.newListener) {
          target.emit('newListener', type,
                      listener.listener ? listener.listener : listener);

          // Re-assign `events` because a newListener handler could have caused the
          // this._events to be assigned to a new object
          events = target._events;
        }
        existing = events[type];
      }

      if (!existing) {
        // Optimize the case of one listener. Don't need the extra array object.
        existing = events[type] = listener;
        ++target._eventsCount;
      } else {
        if (typeof existing === 'function') {
          // Adding the second element, need to change to array.
          existing = events[type] = prepend ? [listener, existing] :
                                              [existing, listener];
        } else {
          // If we've already got an array, just append.
          if (prepend) {
            existing.unshift(listener);
          } else {
            existing.push(listener);
          }
        }

        // Check for listener leak
        if (!existing.warned) {
          m = $getMaxListeners(target);
          if (m && m > 0 && existing.length > m) {
            existing.warned = true;
            var w = new Error('Possible EventEmitter memory leak detected. ' +
                                existing.length + ' ' + type + ' listeners added. ' +
                                'Use emitter.setMaxListeners() to increase limit');
            w.name = 'MaxListenersExceededWarning';
            w.emitter = target;
            w.type = type;
            w.count = existing.length;
            emitWarning(w);
          }
        }
      }

      return target;
    }
    function emitWarning(e) {
      typeof console.warn === 'function' ? console.warn(e) : console.log(e);
    }
    EventEmitter.prototype.addListener = function addListener(type, listener) {
      return _addListener(this, type, listener, false);
    };

    EventEmitter.prototype.on = EventEmitter.prototype.addListener;

    EventEmitter.prototype.prependListener =
        function prependListener(type, listener) {
          return _addListener(this, type, listener, true);
        };

    function _onceWrap(target, type, listener) {
      var fired = false;
      function g() {
        target.removeListener(type, g);
        if (!fired) {
          fired = true;
          listener.apply(target, arguments);
        }
      }
      g.listener = listener;
      return g;
    }

    EventEmitter.prototype.once = function once(type, listener) {
      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');
      this.on(type, _onceWrap(this, type, listener));
      return this;
    };

    EventEmitter.prototype.prependOnceListener =
        function prependOnceListener(type, listener) {
          if (typeof listener !== 'function')
            throw new TypeError('"listener" argument must be a function');
          this.prependListener(type, _onceWrap(this, type, listener));
          return this;
        };

    // emits a 'removeListener' event iff the listener was removed
    EventEmitter.prototype.removeListener =
        function removeListener(type, listener) {
          var list, events, position, i, originalListener;

          if (typeof listener !== 'function')
            throw new TypeError('"listener" argument must be a function');

          events = this._events;
          if (!events)
            return this;

          list = events[type];
          if (!list)
            return this;

          if (list === listener || (list.listener && list.listener === listener)) {
            if (--this._eventsCount === 0)
              this._events = new EventHandlers();
            else {
              delete events[type];
              if (events.removeListener)
                this.emit('removeListener', type, list.listener || listener);
            }
          } else if (typeof list !== 'function') {
            position = -1;

            for (i = list.length; i-- > 0;) {
              if (list[i] === listener ||
                  (list[i].listener && list[i].listener === listener)) {
                originalListener = list[i].listener;
                position = i;
                break;
              }
            }

            if (position < 0)
              return this;

            if (list.length === 1) {
              list[0] = undefined;
              if (--this._eventsCount === 0) {
                this._events = new EventHandlers();
                return this;
              } else {
                delete events[type];
              }
            } else {
              spliceOne(list, position);
            }

            if (events.removeListener)
              this.emit('removeListener', type, originalListener || listener);
          }

          return this;
        };

    EventEmitter.prototype.removeAllListeners =
        function removeAllListeners(type) {
          var listeners, events;

          events = this._events;
          if (!events)
            return this;

          // not listening for removeListener, no need to emit
          if (!events.removeListener) {
            if (arguments.length === 0) {
              this._events = new EventHandlers();
              this._eventsCount = 0;
            } else if (events[type]) {
              if (--this._eventsCount === 0)
                this._events = new EventHandlers();
              else
                delete events[type];
            }
            return this;
          }

          // emit removeListener for all listeners on all events
          if (arguments.length === 0) {
            var keys = Object.keys(events);
            for (var i = 0, key; i < keys.length; ++i) {
              key = keys[i];
              if (key === 'removeListener') continue;
              this.removeAllListeners(key);
            }
            this.removeAllListeners('removeListener');
            this._events = new EventHandlers();
            this._eventsCount = 0;
            return this;
          }

          listeners = events[type];

          if (typeof listeners === 'function') {
            this.removeListener(type, listeners);
          } else if (listeners) {
            // LIFO order
            do {
              this.removeListener(type, listeners[listeners.length - 1]);
            } while (listeners[0]);
          }

          return this;
        };

    EventEmitter.prototype.listeners = function listeners(type) {
      var evlistener;
      var ret;
      var events = this._events;

      if (!events)
        ret = [];
      else {
        evlistener = events[type];
        if (!evlistener)
          ret = [];
        else if (typeof evlistener === 'function')
          ret = [evlistener.listener || evlistener];
        else
          ret = unwrapListeners(evlistener);
      }

      return ret;
    };

    EventEmitter.listenerCount = function(emitter, type) {
      if (typeof emitter.listenerCount === 'function') {
        return emitter.listenerCount(type);
      } else {
        return listenerCount.call(emitter, type);
      }
    };

    EventEmitter.prototype.listenerCount = listenerCount;
    function listenerCount(type) {
      var events = this._events;

      if (events) {
        var evlistener = events[type];

        if (typeof evlistener === 'function') {
          return 1;
        } else if (evlistener) {
          return evlistener.length;
        }
      }

      return 0;
    }

    EventEmitter.prototype.eventNames = function eventNames() {
      return this._eventsCount > 0 ? Reflect.ownKeys(this._events) : [];
    };

    // About 1.5x faster than the two-arg version of Array#splice().
    function spliceOne(list, index) {
      for (var i = index, k = i + 1, n = list.length; k < n; i += 1, k += 1)
        list[i] = list[k];
      list.pop();
    }

    function arrayClone(arr, i) {
      var copy = new Array(i);
      while (i--)
        copy[i] = arr[i];
      return copy;
    }

    function unwrapListeners(arr) {
      var ret = new Array(arr.length);
      for (var i = 0; i < ret.length; ++i) {
        ret[i] = arr[i].listener || arr[i];
      }
      return ret;
    }

    /**
     * Base Model abstract class. All models should implement all methods on this class.
     * @extends EventEmitter
     */
    class ModelBase extends EventEmitter {
        /**
         * 
         * @param {*} options
         */
        constructor(options) {
            super();
            this.options = options;
        }

        /**
         * @returns true if connected.
         */
        get isConnected() {
            return false;
        }

        /**
         * Connects the model to its backend.
         * @param {*} data Any object to pass along when Promise chained.
         * @returns {Promise} A promise resolved once the model's backend is connected.
         */
        async connect(data) {
            return new Promise.resolve(data);
        }

        /**
         * Disconnects the model from its backend
         * @param {*} data Any object to pass along when Promise chained.
         * @returns {Promise} A promise resolved once the model's backend is disconnected.
         */
        async disconnect(data) {
            return new Promise.resolve(data);
        }

        /**
         * Data fetch method. Accepts either a 'where' arrow function or more complex
         * object containing where, orderby, start, limit options.
         * @param {*} query 
         */
        async fetch(query) {
            return new Promise.resolve({ rows: [], total: 0 });
        }

        /**
         * Updates an array of data
         * @param {Array} rows
         * @returns {Promise}
         */
        async update(rows) {
            return new Promise.resolve({ rows: [] });
        }

        /**
         * Creates a list of records.
         * @param {Array} rows 
         * @returns {Promise} List of records created.
         */
        async create(rows) {
            return new Promise.resolve({ rows: [] });
        }

        /**
         * Delete records by ids
         * @param {Array} ids The records ids to delete.
         * @returns {Promise}
         */
        async delete(rows) {
            return new Promise.resolve({ rows: [] });
        }

    }

    /**
     * Reference model implementation based on simple object arrays
     * @extends ModelBase
     */
    class ArrayModel extends ModelBase {
        constructor(options) {
            super(options);
            this._data = this.options.data;
            this._connected = false;
        }

        /**
         * @returns {boolean} true when connected
         * @override
         */
        get isConnected() {
            return this._connected;
        }

        /**
         * To simulate and stay api compliant, this model implements connecting/disconnecting behaviour.
         * @param {*} data 
         * @returns {Promise}
         * @override
         */
        async connect(data) {
            return new Promise(resolve => {
                this._connected = true;
                return resolve(data);
            });
        }

        /**
         * To simulate and stay api compliant, this model implements connecting/disconnecting behaviour.
         * @param {*} data 
         * @returns {Promise}
         * @override
         */
        async disconnect(data) {
            return new Promise(resolve => {
                this._connected = false;
                return resolve(data);
            });
        }

        /**
         * Fetches rows using where, order, start and limit query parameters
         * @param {*} query An object containing a set of query definitions.
         * @returns {Promise}
         * @override
         */
        async fetch({ where, orderby, start, limit }) {
            return new Promise(success => {
                let result = {
                    rows: [],
                    total: 100
                };

                if (start === undefined) {
                    start = 0;
                }
                if (limit === undefined) {
                    limit = 20;
                }
                for (let i = 0; i < this._data.length; i++) {
                    let row = Object.assign({}, this._data[i]);

                    let matchCondition = where ? where(row) : true;
                    if (matchCondition) {
                        result.rows.push(row);
                    }
                }

                let rowFields = {
                    id: 'id',
                    value: 'value',
                    description: 'description',
                    updated: 'updated'
                };

                if (orderby) {
                    result.rows = result.rows.sort(multiColSort(orderby(rowFields, asc, desc)));
                }

                result.rows = result.rows.slice(start, start + limit);

                return success(result);
            });
        }

        /**
         * Updates rows provided by passing an object containing a "rows" array property.
         * @param {*} data Object containing rows in a "rows" property
         * @returns {Promise} Returns the provided data with the rows updated.
         * @override
         */
        async update(data) {
            return new Promise(success => {
                data.rows.forEach(row => {

                    this._data.find((r, i) => {
                        if (r.id == row.id) {
                            this._data[i] = row;
                            return true;
                        }
                    });
                });
                return success(data);
            });
        }

        /**
         * Deletes all records matching the provided ids.
         * @param {Array} ids 
         * @returns {Promise}
         * @override
         */
        async delete(ids) {
            return new Promise(success => {
                ids.forEach(id => {
                    this._data.find((r, i) => {
                        if (r.id == id) {
                            this._data.splice(i, 1);
                            return true;
                        }
                    });
                });

                return success(ids);
            });
        }

        /**
         * Creates all the records provided. Returning the same records updated with their identifier.
         * @param {Array} rows Array of records to create
         * @returns {Promise}
         * @override
         */
        async create(rows) {
            return new Promise(success => {
                let lastId = this._data[this._data.length - 1].id;
                rows.forEach((row, i) => {
                    row.id = ++lastId;
                    this._data.push(row);
                });

                success({ rows });
            });
        }

    }

    /**
     * A convenient event argument container that allows async processing for subscribing events.
     * @example
     * // simple event
     * let EventEmitter = require('event');
     * let emitter = new EventEmitter();
     * let e = new AsyncEvent('myevent', emitter, { a: 1});
     * emitter.on('myevent', e => {
     *   // emulate a long running promise,
     *   // any event that requies pausing further flow can insert a promise.
     *   e.await(new Promise(resolve => {
     *     setTimeout(resolve, 5000);
     *   }));
     * })
     * 
     * // triggers events and waits until all event promises resolve
     * e.wait().then(() => {
     *  console.log("Called after all event promises are resolved");
     * })
     */
    class AsyncEvent {

        /**
         * 
         * @param {string} eventName Event Name.
         * @param {*} base EventHandler instance to trigger event in behalve of.
         * @param {*} args Event arguments to pass during event trigger.
         */
        constructor(eventName, base, args = {}) {
            this._base = base;
            this.args = args;
            this._promises = [];
            this._eventName = eventName;
        }

        /**
         * If an event handler needs to run a long running process, this method
         * allows them the insert a promise into a wait queue so implementing code
         * can wait for these promises to resolve or be rejected.
         * @param {Promise} promise A promise to add to our wait list
         */
        await(promise) {
            this._promises.push(promise);
        }

        /**
         * If event handlers added long running promisses through the await function this method can be used
         * to chain more processes that should only run after these event promises have resolved.
         * @param {*} data A convenient way to enable this method to be chained. 
         *                 Any data passed will be passed along untouched down at the end of the wait promise.
         * @returns {Promise} A promise which will pass the provided data object if passed.
         */
        wait(data) {
            this._base.emit(this._eventName, {
                name: this._eventName,
                target: this._base,
                args: this.args,
                await: this.await.bind(this)
            });
            return Promise.all(this._promises).then(() => data);
        }
    }

    /**
     * A model facade class that encapsulates promise handling and connection management.
     * @extends ModelBase
     */
    class ModelProxy extends ModelBase {

        /**
         * 
         * @param {*} options Model configuration
         * @param {string} options.adapter Adapter to load or instantiate.
         */
        constructor(options) {
            super(options);

            this.options = Object.assign({}, options);

            if (typeof options.model == 'string') {
                this._model = new require(options.model)(options);
            } else {
                this._model = new options.model(options);
            }
        }

        /**
         * Connects the model to its backend.
         * @param {*} data Any object to pass along when Promise chained.
         * @fires beforeConnect Before connecting event.
         * @fires afterConnect After connecting event.
         * @returns {Promise} A promise resolved once the model's backend is connected.
         */
        async connect(data) {
            /**
             * Before connecting
             * @event ModelProxy#beforeConnect
             * @type {AsyncEvent}
             */
            let beforeConnectEvent = new AsyncEvent('beforeConnect', this, {});

            /**
             * After connecting
             * @event ModelProxy#afterConnect
             * @type {AsyncEvent}
             */

            return beforeConnectEvent.wait(data).then(data => this._model.connect(data)).then(data => new AsyncEvent('afterConnect', this, {}).wait(data));
        }

        /**
         * Disconnects the model from its backend
         * @param {*} data Any object to pass along when Promise chained.
         * @fires beforeDisconnect Before disconnecting event.
         * @fires afterDisconnect After disconnecting event.
         * @returns {Promise} A promise resolved once the model's backend is disconnected.
         */
        async disconnect(data) {
            /**
             * Before disconnecting
             * @event ModelProxy#beforeDisconnect
             * @type {AsyncEvent}
             */
            let beforeDisconnectEvent = new AsyncEvent('beforeDisconnect', this, {});

            /**
             * After disconnecting
             * @event ModelProxy#aftereDisconnect
             * @type {AsyncEvent}
             */

            return beforeDisconnectEvent.wait(data).then(data => this._model.disconnect(data)).then(data => new AsyncEvent('afterDisconnect', this, {}).wait(data));
        }

        /**
         * Data fetch method. Accepts either a 'where' arrow function or more complex
         * object containing where, orderby, start, limit options.
         * @param {*} query 
         * @fires beforeFetch Before disconnecting event.
         * @fires afterFetch After disconnecting event.
         * @returns {Promise}
         */
        async fetch(query = {}) {

            /** Accept an arrow function as 'where' condition */
            if (isArrowFunction(query)) {
                query = { where: query };
            }

            let chain = Promise.resolve(query);
            if (!this._model.isConnected) {
                chain = chain.then(query => this.connect(query));
            }

            /**
             * Before fetch
             * @event ModelProxy#beforeFetch
             * @property {object} query Query object containing, where, orderby, start and limit properties.
             * @property {function} query.where A where arrow function definition.
             * @property {function} query.orderby A record order by definition arrow function.
             * @property {int} query.start The record start index, used in pagination mostly.
             * @property {int} query.limit The maximum number of records to return.
             * @type {AsyncEvent}
             */
            let beforeFetchEvent = new AsyncEvent('beforeFetch', this, { query });

            /**
             * After fetch
             * @event ModelProxy#afterFetch
             * @property {object} result A query result object containing records fetched.
             * @property {Array} result.rows Records fetched.
             * @type {AsyncEvent}
             */

            chain = chain.then(query => beforeFetchEvent.wait(query)).then(query => this._model.fetch(query)).then(result => new AsyncEvent('afterFetch', this, { result }).wait(result));

            if (this.options.autoDisconnect) {
                chain = chain.then(this.disconnect);
            }

            return chain;
        }

        /**
         * Updates an array of data
         * @param {Array} rows
         * @fires beforeUpdate Before disconnecting event.
         * @fires afterUpdate After disconnecting event.
         * @returns {Promise}
         */
        async update(rows) {
            let chain = Promise.resolve(rows);
            if (!this._model.isConnected) {
                chain = chain.then(rows => this.connect(rows));
            }

            /**
             * Before update
             * @event ModelProxy#beforeUpdate
             * @property { Array } rows Array of records to update.
             * @type {AsyncEvent}
             */
            let beforeUpdateEvent = new AsyncEvent('beforeUpdate', this, { rows });

            /**
             * After update
             * @event ModelProxy#afterUpdate
             * @property { Array } rows Array of updated records.
             * @type {AsyncEvent}
             */

            chain = chain.then(rows => beforeUpdateEvent.wait(rows)).then(rows => this._model.update(rows)).then(rows => new AsyncEvent('afterUpdate', this, { rows }).wait(rows));

            if (this.options.autoDisconnect) {
                chain = chain.then(result => this.disconnect(result));
            }

            return chain;
        }

        /**
         * Creates a list of records.
         * @param {Array} rows 
         * @fires beforeCreate Before disconnecting event.
         * @fires afterCreate After disconnecting event.
         * @returns {Promise} List of records created.
         */
        async create(rows) {
            let chain = Promise.resolve(rows);
            if (!this._model.isConnected) {
                chain = chain.then(rows => this.connect(rows));
            }

            /**
             * Before create
             * @event ModelProxy#beforeCreate
             * @property {Array} rows Array of records to create.
             * @type {AsyncEvent}
             */
            let beforeCreateEvent = new AsyncEvent('beforeCreate', this, { rows });

            /**
             * After create
             * @event ModelProxy#aftereCreate
             * @property {Array} rows Array of created records.
             * @type {AsyncEvent}
             */

            chain = chain.then(rows => beforeCreateEvent.wait(rows)).then(rows => this._model.create(rows)).then(rows => new AsyncEvent('afterCreate', this, { rows }).wait(rows));

            if (this.options.autoDisconnect) {
                chain = chain.then(result => this.disconnect(result));
            }

            return chain;
        }

        /**
         * Delete records by ids
         * @param {Array} ids The records ids to delete.
         * @fires beforeDelete Before disconnecting event.
         * @fires afterDelete After disconnecting event.
         * @returns {Promise}
         */
        async delete(ids) {
            let chain = Promise.resolve(ids);

            if (!this._model.isConnected) {
                chain = chain.then(ids => this._model.connect(ids));
            }

            /**
             * Before delete
             * @event ModelProxy#beforeDelete
             * @property {Array} ids The record ids to delete.
             * @type {AsyncEvent}
             */
            let beforeDeleteEvent = new AsyncEvent('beforeDelete', this, { ids });

            /**
             * After delete
             * @event ModelProxy#aftereDelete
             * @property {Array} ids The record ids deleted.
             * @type {AsyncEvent}
             */

            chain = chain.then(ids => beforeDeleteEvent.wait(ids)).then(ids => this._model.delete(ids)).then(ids => new AsyncEvent('afterDelete', this, { ids }).wait(ids));

            if (this.options.autoDisconnect) {
                chain = chain.then(result => this.disconnect(result));
            }

            return chain;
        }
    }

    function createModel(options) {
        return new ModelProxy(options);
    }

    exports.createModel = createModel;
    exports.ModelProxy = ModelProxy;
    exports.queryUtils = queryUtils;
    exports.Schema = Schema;
    exports.ModelBase = ModelBase;
    exports.ArrayModel = ArrayModel;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=bloom-orm.umd.js.map

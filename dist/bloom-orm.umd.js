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
            this.options = Object.assign({
                primary_key: 'id'
            }, options);
        }

        /**
         * @returns {Promise} Resolves if connected else rejects.
         */
        async isConnected() {
            return Promise.reject();
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
         * @param {object} options Model configuration
         * @param {(constructor|string)} options.adapter Adapter constructor to load or instantiate.
         * @param {string} options.primary_key The field name of the model's primary key (default: 'id')
         * @param {object} options.schema A json schema object defining the fields of the model. Not all models require it as usually this would al ready exists for selfcontained models.
         * @param {boolean} options.autoDisconnect If true, an extra call to disconnect() will be added to the promise chain.
         */
        constructor(options) {
            super(options);

            if (typeof this.options.model == 'string') {
                this._model = new require(this.options.model)(options);
            } else {
                this._model = new options.model(this.options);
            }
        }

        get primaryKey() {
            return this.options.primary_key;
        }

        recordDecorator(record) {
            record.$id = record[this.options.primary_key];
            return record;
        }

        async isConnected(data) {
            return this._model.isConnected(data);
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
         * @param {(function|object)} query Query arrow function or object containing query definition.
         * @param {function} query.where An arror function defining where operation(an arrow function is required)
         * @param {function} query.orderby An arrow function defining sorting(an arrow function is required)
         * @param {int} query.start Pagination start index
         * @param {int} query.limit Pagination record length
         * @fires beforeFetch Before disconnecting event.
         * @fires afterFetch After disconnecting event.
         * @returns {Promise.<object>} When fulfilled promise returns: { rows: <Array>, total: <int> }
         */
        async fetch(query = {}) {

            /** Accept an arrow function as 'where' condition */
            if (isArrowFunction(query)) {
                query = { where: query };
            }

            if (!('limit' in query)) {
                query.limit = 20;
            }

            if (!('start' in query)) {
                query.start = 0;
            }

            let chain = this._model.isConnected(query).catch(() => {
                return this.connect(query);
            });

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
                chain = chain.then(result => this.disconnect(result));
            }

            return chain;
        }

        /**
         * Updates an array of data
         * @param {(object|Array)} data  object containing a 'rows' array key with records to update. You may also pass just an array of rows.
         * @param {Array} data.rows  object containing a 'rows' array key with records to update. You may also pass just an array of rows.
         * @fires beforeUpdate Before disconnecting event.
         * @fires afterUpdate After disconnecting event.
         * @returns {Promise.<object>} When fulfilled promise returns: { rows: <Array> }
         */
        async update(data) {

            if (data.constructor == Array) {
                data = { rows: data };
            }

            let chain = this._model.isConnected(data).catch(() => {
                return this.connect(data);
            });

            /**
             * Before update
             * @event ModelProxy#beforeUpdate
             * @property { object } data 
             * @property { Array } data.rows Array of records to update.
             * @type {AsyncEvent}
             */
            let beforeUpdateEvent = new AsyncEvent('beforeUpdate', this, data);

            /**
             * After update
             * @event ModelProxy#afterUpdate
             * @property { object } data 
             * @property { Array } data.rows Array of updated records.
             * @type {AsyncEvent}
             */

            chain = chain.then(data => beforeUpdateEvent.wait(data)).then(data => this._model.update(data)).then(data => new AsyncEvent('afterUpdate', this, data).wait(data));

            if (this.options.autoDisconnect) {
                chain = chain.then(result => this.disconnect(result));
            }

            return chain;
        }

        /**
         * Creates a list of records.
         * @param {(object|Array)} data Either an Array of records or an object containing an Array key named 'rows'.
         * @param {Array} data.rows Array containing records to create.
         * @fires beforeCreate Before disconnecting event.
         * @fires afterCreate After disconnecting event.
         * @returns {Promise.<object>} List of records created. Object signature: { rows: <Array> }
         */
        async create(data) {

            if (data.constructor == Array) {
                data = { rows: data };
            }

            let chain = this._model.isConnected(data).catch(() => {
                return this.connect(data);
            });

            /**
             * Before create
             * @event ModelProxy#beforeCreate
             * @property {object} data Object with records to create.
             * @property {Array} data.rows Records to create.
             * @type {AsyncEvent}
             */
            let beforeCreateEvent = new AsyncEvent('beforeCreate', this, data);

            /**
             * After create
             * @event ModelProxy#aftereCreate
             * @property {Array} data Object containing new records.
             * @property {Array} data.rows Array of records created.
             * @type {AsyncEvent}
             */

            chain = chain.then(data => beforeCreateEvent.wait(data)).then(data => this._model.create(data)).then(data => new AsyncEvent('afterCreate', this, data).wait(data));

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
         * @returns {Promise.<Array>} When fulfilled promise returns an array of deleted ids.
         */
        async delete(ids) {
            let chain = this._model.isConnected(ids).catch(() => {
                return this.connect(ids);
            });

            /**
             * Before delete
             * @event ModelProxy#beforeDelete
             * @property {object} data 
             * @property {Array} data.ids The record ids to delete.
             * @type {AsyncEvent}
             */
            let beforeDeleteEvent = new AsyncEvent('beforeDelete', this, { ids });

            /**
             * After delete
             * @event ModelProxy#aftereDelete
             * @property {object} data
             * @property {Array} data.ids The record ids deleted.
             * @type {AsyncEvent}
             */

            chain = chain.then(ids => beforeDeleteEvent.wait(ids)).then(ids => this._model.delete(ids)).then(ids => new AsyncEvent('afterDelete', this, { ids }).wait(ids));

            if (this.options.autoDisconnect) {
                chain = chain.then(result => this.disconnect(result));
            }

            return chain;
        }
    }

    /**
     * Reference model implementation based on simple object arrays
     * @class
     * @extends ModelBase
     */
    class ArrayModel extends ModelBase {
        constructor(options) {
            super(options);
            this._data = this.options.data;
            this._connected = false;
        }

        /**
         * @returns {Promise} Resolves if connected else rejects
         * @override
         */
        async isConnected(data) {
            if (this._connected) {
                return Promise.resolve(data);
            }
            return Promise.reject(false);
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
         * @param {function} query.where An arror function defining where operation(an arrow function is required)
         * @param {function} query.orderby An arrow function defining sorting(an arrow function is required)
         * @param {int} query.start Pagination start index
         * @param {int} query.limit Pagination record length
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
                    let row = Object.assign({
                        $id: this._data[i][this.options.primary_key]
                    }, this._data[i]);

                    let matchCondition = where ? where(row) : true;
                    if (matchCondition) {
                        result.rows.push(row);
                    }
                }

                let rowFields = Object.assign({
                    $id: this.options.primary_key
                }, this.options.schema.properties);

                if (orderby) {
                    result.rows = result.rows.sort(multiColSort(orderby(rowFields)));
                }

                result.rows = result.rows.slice(start, start + limit);

                result.rows.forEach(r => {
                    delete r.$id;
                });

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
        async create(data) {
            return new Promise(success => {
                let lastId = this._data[this._data.length - 1].id;
                data.rows.forEach((row, i) => {
                    row.id = ++lastId;
                    this._data.push(row);
                });

                success(data);
            });
        }

    }

    /**
     * A Timeout Error
     */
    class TimeoutError extends Error {
      /**
       * cosntructor
       */
      constructor() {
        super('A timeout has occured');
        this.name = 'TimeoutError';
      }
    }

    /**
     * Remote Error. Encapsulates the service, a message and remote error stack if available.
     */
    class RemoteError extends Error {
      /**
       * constructor
       * @param {string} service The service or model that threw the exception.
       * @param {string} msg A message indicating the reason.
       * @param {string} stack A stack trace of the remote error if available.
       */
      constructor(service, msg, stack) {
        super(`A remote service error has occured (${service}) => ${msg}`);
        this.name = "RemoteError";
        this.service = service;
        this.remoteStack = stack;
      }
    }

    /**
     * Unexpected remote response Error. Encapsulates service, a sample of the returned data and a message.
     */
    class UnexpectedResponseError extends Error {
      /**
       * 
       * @param {string} service The service or model that threw the exception.
       * @param {*} sample A sample of the data returned.
       * @param {string} msg A message indicating the reason.
       */
      constructor(service, sample, msg) {
        super(`Remote service (${service}) responded with unexpected data => ${msg}`);
        this.name = "UnexpectedRemoteResponse";
        this.service = service;
        this.sample = sample;
      }
    }

    /**
     * Mock request error. Encapsulates mock errors thrown on unit test rest services.
     */
    class MockRequestError extends Error {
      /**
       * constructor
       * @param {object} response The response object of the mock request
       * @param {object} request the request object of the mock request
       */
      constructor(response, request) {
        super(`Mock Request Error: ${response.status}: ${response.statusText}`);
        this.response = response;
        this.request = request;
      }
    }

    var errors = /*#__PURE__*/Object.freeze({
        TimeoutError: TimeoutError,
        RemoteError: RemoteError,
        UnexpectedResponseError: UnexpectedResponseError,
        MockRequestError: MockRequestError
    });

    /**
     * Utility timout function, calls timeoutFn if returned function isn't called without its timeout window.
     * @param {functino} fn 
     * @param {int} timeout 
     * @param {function} timeoutFn 
     */

    /**
     * Takes a string and padds every line
     * @param {string} lines A string containing multiple lines
     * @param {int} padding Amount of left padding
     * @param {int} skip Number of first lines to skip. (default 1)
     */
    function leftPadLines(lines, padding, skip = 0) {
        lines = JSON.stringify(lines, null, 4).trim().split("\n");

        return lines.reduce((c, v, i) => {
            if (i <= skip) {
                return c + v;
            } else {
                return c + "\n" + Array(padding).join(" ") + v;
            }
        }, '');
    }

    /**
     * Helper function, capitalizes the first letter of every word in string.
     * @param {string} value String to capitalize words.
     * @param {int} skip Number of words to skip from begining.
     * @return {string}
     */
    function capitalize(value, skip) {
        if (value.constructor !== Array) {
            value = [value];
        }

        return value.reduce((c, v, i) => {
            if (i <= skip) {
                c.push(v);
            } else {
                c.push(v.charAt(0).toUpperCase() + v.slice(1));
            }
            return c;
        }, []);
    }

    /**
     * Capitalizes and removes spaces from string. Usually used on fields
     * @param {string} value string to normalize
     * @return {string}
     */
    function normalizeField(value) {
        return capitalize(value.split(' '), 1).join('');
    }

    const axios = require('axios');

    /**
     * A generic and extensible Rest model.
     * @extends ModelBase
     */
    class RestModel extends ModelBase {
        constructor(options) {
            super(options);

            this._connected = false;
            this.cookies = {};
            this.fields = [];
            this.meta = {
                fields: {
                    $id: this.options.primary_key
                }
            };

            this._http = this.options.http || axios.create({
                validateStatus: function (status) {
                    return status >= 200 && status < 300; // default
                }
            });

            if (this.options.schema) {
                this.fields = Object.keys(this.options.schema.properties);

                for (let i in this.fields) {
                    let field = this.fields[i];
                    let normalizedField = normalizeField(field);
                    this.meta.fields[normalizedField] = field;
                }
            }
        }

        getEndPoint(action, options, id, args, data) {
            let argStr = '';
            if (action == 'fetch') {
                let tmpArgs = [];
                for (var k in args) {
                    if (args[k] !== undefined) {
                        tmpArgs.push(`${k}=${encodeURIComponent(args[k])}`);
                    }
                }
                argStr = tmpArgs.join('&');
            }
            let ACTIONS = {
                connect: {
                    url: `${options.baseUrl}/login`,
                    method: 'get'
                },
                disconnect: {
                    url: `${options.baseUrl}/logout`,
                    method: 'get'
                },
                fetch: {
                    url: `${options.baseUrl}/resource/${this.options.resource}${id ? '/' + id : ''}${argStr ? '?' + argStr : ''}`,
                    method: 'get'
                },
                create: {
                    url: `${options.baseUrl}/resource/${this.options.resource}`,
                    method: 'post',
                    data
                },
                update: {
                    url: `${options.baseUrl}/resource/${this.options.resource}`,
                    method: 'put',
                    data
                },
                delete: {
                    url: `${options.baseUrl}/resource/${this.options.resource}/${id}`,
                    method: 'delete'
                },
                default: {
                    url: `${options.baseUrl}`,
                    method: 'get'
                }
            };

            let finalAction = null;
            if (typeof this.options.getEndPoint == 'function') {
                finalAction = this.options.getEndPoint(action, options, id);
            } else {
                finalAction = action in ACTIONS ? ACTIONS[action] : ACTIONS.default;
            }

            if (this.options.debug) {
                console.log("endPoint: ", finalAction);
            }

            return finalAction;
        }

        HTTP(endPoint) {

            let opts = Object.assign({
                method: 'GET',
                withCredentials: true
            }, endPoint);

            if (this.options.debug) {
                console.log('\nHTTP CALL : ', leftPadLines(endPoint, 14));
                console.log('   - OPTS : ', leftPadLines(opts, 14));
            }

            return this._http.request(opts);
        }

        /**
         * @returns {Promise} true when connected
         * @override
         */
        async isConnected(data) {
            let isConnectedPromise = null;
            if (typeof this.options.isConnected == 'function') {
                isConnectedPromise = this.options.isConnected();
            } else if (this._connected) {
                this.isConnectedPromise = Promise.resolve(data);
            } else {
                this.isConnectedPromise = Promise.reject();
            }

            return isConnectedPromise.then(data => {
                this._connected = true;
                return data;
            }).catch(() => {
                this._connected = false;
            });
        }

        /**
         * To simulate and stay api compliant, this model implements connecting/disconnecting behaviour.
         * @param {*} data 
         * @returns {Promise}
         * @override
         */
        async connect(data) {
            let connectPromise = null;
            let endPoint = this.getEndPoint('connect', this.options);

            // allow overwriting connect promise with user version if required.
            if (this.options.connect) {
                connectPromise = this.options.connect(endPoint, this.options, this.HTTP.bind(this));
            } else {
                connectPromise = this.HTTP(endPoint);
            }

            // either way, the promise must return a response that at least contains
            // the status key with the resulting http response code.
            return connectPromise.then(response => {
                this._connected = true;
                return response.data;
            }).catch(err => {
                let response = err.response;
                this._connected = false;
                return Promise.reject(new RemoteError("REST", `${response.status}: ${response.statusText}`, response.data));
            });
        }

        /**
         * To simulate and stay api compliant, this model implements connecting/disconnecting behaviour.
         * @param {*} data 
         * @returns {Promise}
         * @override
         */
        async disconnect(data) {
            let disconnectPromise = null;
            let endPoint = this.getEndPoint('disconnect', this.options);
            if (this.options.disconnect) {
                disconnectPromise = this.options.disconnect(endPoint, this.options, this.HTTP.bind(this));
            } else {
                disconnectPromise = this.HTTP(endPoint);
            }

            return disconnectPromise.then(response => {
                if (response.status == 200) {
                    this._connected = false;
                    return data;
                } else {
                    this._connected = false;
                    throw new Error("Error while disconnecting");
                }
            });
        }

        /**
         * Fetches rows using where, order, start and limit query parameters
         * @param {*} query An object containing a set of query definitions.
         * @returns {Promise}
         * @override
         */
        async fetch({ where, orderby, start, limit }) {
            return new Promise((resolve, reject) => {

                let whereAst, orderbyAst;

                if (where) {
                    whereAst = jsep(where.toString());
                }

                if (orderby) {
                    orderbyAst = jsep(orderby.toString());
                }

                if (start === undefined) {
                    start = 0;
                }
                if (limit === undefined) {
                    limit = 20;
                }

                let endPoint = this.getEndPoint('fetch', this.options);
                return this.HTTP(endPoint);
            });
        }

        /**
         * Updates rows provided by passing an object containing a "rows" array property.
         * @param {*} data Object containing rows in a "rows" property
         * @returns {Promise} Returns the provided data with the rows updated.
         * @override
         */
        async update(data) {
            let promises = [];
            data.rows.forEach(row => {
                let endPoint = this.getEndPoint('update', this.options, row.id, null, row);
                promises.push(this.HTTP(endPoint).then(result => {
                    return result.data.data;
                }));
            });

            return Promise.all(promises).then(results => {
                return {
                    rows: results
                };
            });
        }

        /**
         * Deletes all records matching the provided ids.
         * @param {Array} ids 
         * @returns {Promise}
         * @override
         */
        async delete(ids) {
            let promises = [];
            ids.forEach(id => {
                let endPoint = this.getEndPoint('delete', this.options, id);
                promises.push(function (endPoint, id) {
                    return this.HTTP(endPoint).then(result => {
                        return id;
                    }).catch(err => {
                        return {
                            id,
                            errorMessage: "Error deleting record",
                            debug: err
                        };
                    });
                }.bind(this)(endPoint, id));
            });

            return Promise.all(promises).then(results => {
                return {
                    rows: results
                };
            });
        }

        /**
         * Creates all the records provided. Returning the same records updated with their identifier.
         * @param {Array} rows Array of records to create
         * @returns {Promise}
         * @override
         */
        async create(data) {
            let promises = [];
            data.rows.forEach(row => {
                let endPoint = this.getEndPoint('create', this.options, null, null, row);
                promises.push(this.HTTP(endPoint).then(result => {
                    return result.data.data;
                }));
            });

            return Promise.all(promises).then(results => {
                return {
                    rows: results
                };
            });
        }

    }

    const jsep$1 = require('jsep');
    jsep$1.addBinaryOp("^");
    jsep$1.addUnaryOp('@');
    jsep$1.removeBinaryOp(">>>");
    jsep$1.removeBinaryOp("<<<");
    jsep$1.removeUnaryOp("~");

    class ExpressionBuilder {
        constructor(options) {
            this.options = options;
            this.ast = null;
        }

        parse(expOrArrowFn) {
            let src = expOrArrowFn.toString();
            let rx = /([^=>]+)\s*=>\s*(.+)/gi;
            let result = rx.exec(src);
            this.ast = jsep$1(result[2]);
            return this;
        }

        transform(transform) {
            if (!transform) {
                transform = this.options.transform;
            }

            return transform.run(this.ast);
        }

    }

    class AstTransform {
        constructor(state, opts) {
            this.state = state;
            this.options = Object.assign({
                debug: false,
                allowBinaryExpressions: true,
                allowLogicalExpressions: true,
                allowMemberExpressions: true,
                allowCallExpressions: true,
                allowLiterals: true,
                allowIdentifier: true,
                allowArrayExpression: false
            }, opts);
        }

        run(ast) {
            if (this.options.debug) {
                console.log(JSON.stringify(ast, null, '  '));
            }

            let expFn = this.buildAstFnTree(ast);
            return expFn();
        }

        buildAstFnTree(ast) {
            let expFn = null;
            if (ast.type == 'BinaryExpression' && this.options.allowBinaryExpressions) {
                expFn = this.onBinaryExpression.bind(this, ast.operator, this.buildAstFnTree(ast.left), this.buildAstFnTree(ast.right));
            } else if (ast.type == 'LogicalExpression' && this.options.allowLogicalExpressions) {
                expFn = this.onLogicalExpression.bind(this, ast.operator, this.buildAstFnTree(ast.left), this.buildAstFnTree(ast.right));
            } else if (ast.type == 'MemberExpression' && this.options.allowMemberExpressions) {
                expFn = this.onMemberExpression.bind(this, ast.computed, this.buildAstFnTree(ast.object), this.buildAstFnTree(ast.property));
            } else if (ast.type == 'Identifier' && this.options.allowIdentifier) {
                expFn = this.onIdentifier.bind(this, ast.name);
            } else if (ast.type == 'Literal' && this.options.allowLiterals) {
                expFn = this.onLiteral.bind(this, ast.value, ast.raw);
            } else if (ast.type == 'CallExpression' && this.options.allowCallExpressions) {
                let args = ast.arguments.reduce((c, v) => {
                    c.push(this.buildAstFnTree(v));
                    return c;
                }, []);

                expFn = this.onCallExpression.bind(this, this.buildAstFnTree(ast.callee), args);
            } else if (ast.type == "ArrayExpression" && this.options.allowArrayExpression) {
                let elements = ast.elements.reduce((c, v) => {
                    c.push(this.buildAstFnTree(v));
                    return c;
                }, []);
                expFn = this.onArrayExpression.bind(this, elements);
            } else {
                throw new Error(`Unhandled ast type: ${ast.type}`);
            }

            return expFn;
        }

        onArrayExpression(elements) {
            var elResolved = elements.reduce((c, v) => {
                let value = v();
                if (typeof value == 'string') {
                    value = JSON.stringify(value);
                }
                c.push(value);
                return c;
            }, []);

            return elResolved.join(', ');
        }

        onLogicalExpression(op, left, right) {

            return `${left()} ${op} ${right()}`;
        }

        onBinaryExpression(op, left, right) {
            let rightValue = right();
            if (typeof rightValue == 'string') {
                rightValue = JSON.stringify(rightValue);
            }
            return `${left()} ${op} ${rightValue}`;
        }

        onCallExpression(callee, args) {
            var argsResolved = args.reduce((c, v) => {
                let value = v();
                if (typeof value == 'string') {
                    value = JSON.stringify(value);
                }
                c.push(value);
                return c;
            }, []);
            return `${callee()}(${argsResolved.join(', ')})`;
        }

        onMemberExpression(computed, obj, property) {
            if (computed) {
                let objInst = obj();
                let comp = property();
                let objValue = objInst[comp];
                return objValue;
            } else {
                let objKey = obj();
                let objInst = this.state[objKey];
                let objValue = objInst[property()];
                return objValue;
            }
        }

        onIdentifier(name) {
            return name;
        }

        onLiteral(value, raw) {
            return value;
        }
    }

    var astTransforms = /*#__PURE__*/Object.freeze({
        AstTransform: AstTransform
    });

    class FrappeRestQueryAstTransform extends AstTransform {

        run(ast) {
            let result = super.run(ast);

            if (typeof this.options.finalize == 'function') {
                return this.options.finalize(result);
            } else {
                if (result.charAt(1) != '[') {
                    result = `[${result}]`;
                }
                return result;
            }
        }

        onArrayExpression(elements) {
            var elResolved = elements.reduce((c, v) => {
                let value = v();
                c.push(value);
                return c;
            }, []);

            return elResolved.join(', ');
        }

        onLogicalExpression(op, left, right) {
            if (op != '&&') {
                new new Error(`Unsupported operator: ${op}`)();
            }
            return `[${left()}, ${right()}]`;
        }

        onBinaryExpression(op, left, right) {
            return `["${left()}", "${op}", ${right()}]`;
        }

        onCallExpression(callee, args) {
            let calleeName = callee().toLowerCase();
            if (calleeName == 'like') {
                let field = args[0]();
                let match = args[1]();
                if (typeof match == 'string') {
                    match = JSON.stringify(match);
                }
                return `["${field}", "LIKE", ${match}]`;
            } else if (calleeName == 'asc') {
                let field = args[0]();
                return `${field} ASC`;
            } else if (calleeName == 'desc') {
                let field = args[0]();
                return `${field} DESC`;
            }
        }

        onMemberExpression(computed, obj, property) {
            if (computed) {
                let objInst = obj();
                let comp = property();
                let objValue = objInst[comp];
                return objValue;
            } else {
                let objKey = obj();
                let objInst = this.state[objKey];
                let objValue = objInst[property()];
                return objValue;
            }
        }

    }

    /**
     * A generic model which wraps Frappe's REST api for their Doctypes.
     * @package thirdparty.models
     * @extends RestModel
     */
    class FrappeDoctypeModel extends RestModel {

        /**
         * 
         * @param {object} options 
         */
        constructor(options) {
            super(Object.assign({}, options));
        }

        /**
         * Overwrites rest getEndPoint
         * @param {string} action 
         * @param {object} options 
         * @param {*} id 
         * @param {object} args 
         * @param {*} data 
         */
        getEndPoint(action, options, id, args, data) {
            let argStr = '';
            if (action == 'fetch') {
                let tmpArgs = [];
                for (var k in args) {
                    if (args[k] !== undefined) {
                        tmpArgs.push(`${k}=${encodeURIComponent(args[k])}`);
                    }
                }
                argStr = tmpArgs.join('&');
            }

            let ACTIONS = {
                connect: {
                    url: `${options.baseUrl}/api/method/login?usr=${encodeURIComponent(options.auth.usr)}&pwd=${encodeURIComponent(options.auth.pwd)}`,
                    method: 'get'
                },
                disconnect: {
                    url: `${options.baseUrl}/api/method/logout`,
                    method: 'get'
                },
                fetch: {
                    url: `${options.baseUrl}/api/resource/${encodeURIComponent(options.resource)}${id ? '/' + id : ''}${argStr ? '?' + argStr : ''}`,
                    method: 'get'
                },
                create: {
                    url: `${options.baseUrl}/api/resource/${encodeURIComponent(options.resource)}`,
                    method: 'post',
                    data
                },
                update: {
                    url: `${options.baseUrl}/api/resource/${encodeURIComponent(options.resource)}/${id}`,
                    method: 'put',
                    data
                },
                delete: {
                    url: `${options.baseUrl}/api/resource/${encodeURIComponent(options.resource)}/${id}`,
                    method: 'delete'
                },
                method: {
                    url: `${options.baseUrl}/api/method/${id}`,
                    method: 'get'
                },
                default: {
                    url: `${options.baseUrl}`,
                    method: 'get'
                }

            };

            return action in ACTIONS ? ACTIONS[action] : ACTIONS.default;
        }

        /**
         * Parses frappe server responses for error messages.
         * @param {object} response 
         * @param {string} label 
         */
        handleFrappeErrors(response, label) {
            let rx = /(?:\<pre\>)([^<]+)(?:\<\/pre\>)/ig;
            let matches = rx.exec(response.data);
            let remoteTrace = matches[1].trim().split("\n");
            let msg = remoteTrace[remoteTrace.length - 1];
            throw new RemoteError((this.options.name || 'Frappe') + (label ? `[${label}]` : ''), msg, remoteTrace);
        }

        /**
         * 
         * @param {*} data 
         * @override
         */
        async isConnected(data) {
            let endPoint = this.getEndPoint('method', this.options, 'frappe.auth.get_logged_user');
            return this.HTTP(endPoint).then(response => {
                if (response.status == 200) {
                    return data;
                } else {
                    throw new Error(response.status);
                }
            });
        }

        /**
         * 
         * @param {(function|object)} query 
         * @override
         */
        async fetch({ where, orderby, start, limit }) {

            let filters,
                order_by,
                fields = JSON.stringify(this.fields),
                builder = new ExpressionBuilder({
                transform: new FrappeRestQueryAstTransform({
                    r: this.meta.fields
                })
            }),
                orderBuilder = new ExpressionBuilder({
                transform: new FrappeRestQueryAstTransform({
                    r: this.meta.fields
                }, {
                    allowArrayExpression: true,
                    allowLogicalOperators: false,
                    allowBinaryOperators: false,
                    finalize(output) {
                        return JSON.stringify(output);
                    }
                })
            });

            if (where) {
                filters = builder.parse(where).transform();
            }

            if (orderby) {
                order_by = orderBuilder.parse(orderby).transform();
            }

            let fetchArgs = {
                fields,
                filters,
                order_by,
                limit_start: start,
                limit_page_length: limit
            };
            let fetchEndPoint = this.getEndPoint('fetch', this.options, null, fetchArgs);

            let totalArgs = {
                fields: JSON.stringify(["count(*) as total"]),
                filters,
                order_by
            };
            let totalEndPoint = this.getEndPoint('fetch', this.options, null, totalArgs);
            return Promise.all([this.HTTP(fetchEndPoint), this.HTTP(totalEndPoint)]).then(responses => {
                let fetchResponse = responses[0],
                    totalResponse = responses[1],
                    result = {
                    rows: null,
                    total: 0
                };

                // fetch results
                if (fetchResponse.status == 200) {
                    if (typeof fetchResponse.data != 'object') {
                        // something went wrong, needle could not parse returned json
                        throw new UnexpectedResponseError(this.name || "Frappe", fetchResponse.body, "Could not parse response from service");
                    }

                    result.rows = fetchResponse.data.data;
                } else {
                    this.handleFrappeErrors(fetchResponse, "Error while parsing fetch row results.");
                }

                // fetch query count
                if (totalResponse.status == 200) {
                    if (typeof totalResponse.data != 'object') {
                        // something went wrong, needle could not parse returned json
                        throw new UnexpectedResponseError(this.name || "Frappe", totalResponse.body, "Could not parse response from service");
                    }

                    result.total = totalResponse.data.data[0].total;
                } else {
                    this.handleFrappeErrors(totalResponse, "Error while parsing fetch total results.");
                }

                return result;
            });
        }

    }

    function createModel(options) {
        return new ModelProxy(options);
    }

    const transforms = {
        astTransforms,
        FrappeRestQueryAstTransform
    };

    exports.createModel = createModel;
    exports.ModelProxy = ModelProxy;
    exports.queryUtils = queryUtils;
    exports.Schema = Schema;
    exports.ModelBase = ModelBase;
    exports.ArrayModel = ArrayModel;
    exports.RestModel = RestModel;
    exports.FrappeDoctypeModel = FrappeDoctypeModel;
    exports.transforms = transforms;
    exports.errors = errors;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=bloom-orm.umd.js.map

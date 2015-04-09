/*
 * Warden
 */
(function (window) {


    var WardenEvent = window.WardenEvent = {
        SPLICED: 'spliced',
        ADDED: 'added',
        REMOVED: 'removed',
        ALTERED: 'altered',
        SET: 'set',
        UNSET: 'unset'
    }

    var Warden = window.Warden = (function () {
        var SLICE = Array.prototype.slice;
        var PUSH = Array.prototype.push;
		var SPLICE = Array.prototype.splice;

        function Warden(model, _parts, _buffer, _at, _event, _notify, _equiv, _key) {
			if (model.__ward__ === undefined)
                model.__ward__ = [];
			
			var buffer = _buffer || [];
			var parts = _parts || [];
		
			var obj = {
				__iswarden__: true,
				_model: model,
				_at:_at,
				_event:_event,
				_notify:_notify,
				_equiv:_equiv,
				_key:_key,
				
                _parts: parts,
                _buffer: buffer,
				copy:copy,
				
				/*selectors*/
				self:self,
				child:child,
				brood:brood,
				descendant:descendant,
				all:all,
				parent:parent,
				ancestors:ancestors,
				where:where,
				and:and,
				
				/*terminators*/
				get:get,
				getAll:getAll,
				alter:alter,
				splice:splice,
				push:push,
				each:each,
				clone:clone,
				
				/*watchers*/
				watch:watch,
				ignore:ignore,
				on:on,
				at:at,
				notify:notify,
				eq:eq,
				gt:gt,
				lt:lt,
				gte:gte,
				lte:lte,
				is:is,
				key:key,
				
                _exec: _exec,
				_bubble: _bubble
			};
            
            return obj;
        }
        
		Warden._setProp = function (src, prop, subject) {
            var par, oldsubj, id, oldprop, pars;

            if (src.__ward__ === undefined)
                src.__ward__ = [];

            /*old prop should be cleaned up*/
            var oldsubj;
            if (prop !== undefined && typeof (oldsubj = src[prop]) === 'object' && oldsubj !== null) {
                var i;
                (pars = oldsubj.__ward__) && (i = pars.indexOf(src)) > -1
					&& (pars.splice(i, 1));
            }

            /*assign*/
            prop !== undefined && (src[prop] = subject);

            /*set parent ref*/
            if (typeof (subject) === 'object' && subject !== null) {
                pars = subject.__ward__ || (subject.__ward__ = []);
                pars.indexOf(src) == -1
                    && pars.push(src);
            }

            return subject;
        }
        Warden._prop = function (src, prop) {
            if (src.__ward__ === undefined)
                src.__ward__ = [];

            var subject = src[prop], r, rep;
            if (subject === undefined || subject === null)
                return subject;

            if (typeof (subject) === 'object' && subject !== null) {
                var r;
                r = subject.__ward__ || (subject.__ward__ = []);
                r.indexOf(src) == -1
                    && r.push(src);
            }

            return subject;
        }
		Warden.observe = function(list, fn, _async){
			var _this=this;
			var async = _async===undefined ? false : _async;
			list = list.constructor==Array ? list : [list];
			
			var x,len,sel,t;
			for (x=0,len=list.length; x < len; x++) {
				sel=list[x];			

				async
					? sel.watch(function(){
						clearTimeout(t);
						t=setTimeout(run);
					})
					: sel.watch(run);
				
			}
			run();
			
			function run(){
				var args=[];
				for (x=0,len=list.length; x < len; x++) {
					sel=list[x];					
					args.push(sel.copy());
				}
				fn.apply(_this, args);
			}
			
			return {
				destroy:function(){
					for (x=0,len=list.length; x < len; x++) {
						sel=list[x];
						Warden(sel._model).ignore(function(ev, fn, prop, sel) {
							return sel==sel && ev==sel._event;
						});
					}
				}
			}
		}
		
		function copy(){
			var parts=[];
			PUSH.apply(parts, this._parts);
			var buffer=[];
			PUSH.apply(buffer, this._buffer);
			return Warden(this._model, parts, buffer, this._at, this._event, this._notify, this._equiv, this._key);
		}
		
		
		/*selectors*/
        function self() {
            this._parts.push(function (col) {
                return col;
            })
            return this;
        }
        function child(prop_fn) {
            this._parts.push(function (col) {
                var n = [], p;
                var x, len, obj;
				var prop = prop_fn.constructor==Function ? prop_fn() : prop_fn;
                for (x = 0, len = col.length; x < len; x++) {
                    obj = col[x];
                    if (obj === null || obj === undefined)
                        continue;
                    p = Warden._prop(obj, prop);
                    if (p === null || p === undefined)
                        continue;
                    n.push(p);
                }
                return n;
            });
            return this;
        }
        function brood(/*args*/) {
            var props = SLICE.call(arguments);

            var x, len;
            for (x = 0, len = props.length; x < len; x++) {
                this.child(props[x]);
            }

            return this;
        }
        function descendant(prop) {
            this._parts.push(function (col) {
                var n = [], subj, obj, x, len;

                for (x = 0, len = col.length; x < len; x++) {
                    obj = col[x];
                    if (obj === null || obj === undefined)
                        continue;

                    switch (obj.constructor) {
                        case Object:
                            parseObj(obj);
                            break;
                        case Array:
                            parseArray(obj);
                            break;
                    }
                };

                function parseObj(obj) {
                    var i;
                    for (i in obj) {
                        if (i == '__ward__')
                            continue;
                        subj = Warden._prop(obj, i);
                        if (subj === null || subj === undefined)
                            continue;
                        examine(i, subj);
                    }
                }
                function parseArray(obj) {
                    var x, len;
                    for (x = 0, len = obj.length; x < len; x++) {
                        if (obj[x] === undefined || obj[x] === null)
                            continue;
                        examine(x, Warden._prop(obj, x));
                    }
                }
                function examine(i, subj) {
                    if (i == prop)
                        n.push(subj);
                    switch ((subj).constructor) {
                        case Object:
                            parseObj(subj);
                            break;
                        case Array:
                            parseArray(subj);
                            break;
                    }
                }
                return n;
            });

            return this;
        }
        function all() {
            this._parts.push(function (col) {
                var n = [], i, subj, x, len, obj;

                for (x = 0, len = col.length; x < len; x++) {
                    obj = col[x];

                    if (obj === null || obj === undefined)
                        continue;

                    switch (obj.constructor) {
                        case Object:
                            for (i in obj) {
                                if (i === '__ward__')
                                    continue;
                                subj = Warden._prop(obj, i);
                                if (subj === null || subj === undefined)
                                    continue;
                                n.push(subj);
                            }
                            break;
                        case Array:
                            var x1, len1;
                            var childs = [];
                            for (x1 = 0, len1 = obj.length; x1 < len1; x1++) {
                                subj = Warden._prop(obj, x1);
                                if (subj === null || subj === undefined)
                                    continue;
                                n.push(subj);
                            }
                            break;
                    }
                };
                return n;
            });
            return this;
        }
        function parent() {
            this._parts.push(function (col) {
                var n = [], x, len, obj;
                for (x = 0, len = col.length; x < len; x++) {
                    obj = col[x];

                    if (obj === null || obj === undefined)
                        continue;

                    var parents;
                    if (parents = (obj).__ward__)
                        PUSH.apply(n, parents);
                }
                return n;
            });
            return this;
        }
        function ancestors() {
            this._parts.push(function (col) {
                var n = [], p, pars, x, len, obj;

                for (x = 0, len = col.length; x < len; x++) {
                    obj = col[x];
                    parseParents(obj);
                }
                function parseParents(obj) {
                    var x, len, par;

                    if (obj === null || obj === undefined)
                        return;

                    var parents;
                    if (parents = (obj).__ward__)
                        for (x = 0, len = parents.length; x < len; x++) {
                            par = parents[x];
                            if (n.indexOf(par) === -1) {
                                n.push(par);
                                parseParents(par);
                            }
                        }
                }

                return n;
            });
            return this;
        }
        function where(filter) {

            this._parts.push(function (col) {
                var n = [], x, len, obj;

                for (x = 0, len = col.length; x < len; x++) {
                    obj = col[x];
                    filter(obj, x) && n.indexOf(obj) === -1
                        ? n.push(obj)
                        : void 0;
                }
                return n;
            });
            return this;
        }
        function and() {
            this._buffer.push(this._parts);
            this._parts = [];
            return this;
        }

		/*terminators*/
		function get() {
            var subjects = this._exec();

            return subjects[0];
        }
        function getAll() {
            var subjects = this._exec();

            return subjects;
        }
        function alter(prop, newval) {
            var targets = this._exec();
			var prop = prop;
			var x, len, target;

            var info = { event: WardenEvent.ALTERED, prop: prop, val: newval };
            var fns = [];
            var changes = [];
            var z, zen, fn, handlers;
            for (x = 0, len = targets.length; x < len; x++) {
                target = targets[x];

                var oldval = target[prop];
                if (oldval === newval)
                    continue;

                Warden._setProp(target, prop, newval);
                handlers = this._bubble(info, target);
                for (z = 0, zen = handlers.length; z < zen; z++) {
                    var v = handlers[z];
                    fns.indexOf(v) == -1
                        && fns.push(v);
                }

                changes.push({
                    target: target,
                    prop: prop,
                    from: oldval,
                    to: newval
                });

            }

            var reactions = [], v;
            for (x = 0, len = fns.length; x < len; x++) {
                v = fns[x];
                var reaction = v(info, changes);
                typeof reaction !== 'undefined'
                    && reactions.push(reaction);
            }

            return {
                response: function (fn) {
                    fn.apply(this, reactions);
                },
				val:newval
            };
        }
        function splice(start, cut, add) {
            var x, len, target, x1, len1, newelm, oldval;
			var targets = this._exec();

            add = add ? (add.constructor == Array ? add : [add]) : [];

            var sinfo = { event: WardenEvent.SPLICED, start: start, cut: cut, add: add };
            var ainfo = { event: WardenEvent.ADDED, start: start, cut: cut, add: add };
            var rinfo = { event: WardenEvent.REMOVED, start: start, cut: cut, add: add };

            var sfns = [];
            var afns = [];
            var rfns = [];

            var changes = [];
            for (x = 0, len = targets.length; x < len; x++) {
                target = targets[x];

                var args = [start, cut].concat(add);
                var removed = SPLICE.apply(target, args);

                for (x1 = 0, len1 = removed.length; x1 < len1; x1++) {
                    oldval = removed[x1];
                    var r;
                    if (typeof (oldval) === 'object' && oldval !== null && (r = oldval.__ward__) !== undefined) {
                        var i = r.indexOf(target);
                        if (i > -1)
                            r.splice(i, 1);
                    }
                }

                for (x1 = 0, len1 = add.length; x1 < len1; x1++) {
                    newelm = add[x1];
                    Warden._setProp(target, undefined, newelm);
                }

                var handlers = this._bubble(sinfo, target);
                var v;
                for (x1 = 0, len1 = handlers.length; x1 < len1; x1++) {
                    v = handlers[x1];
                    sfns.indexOf(v) == -1
                        && sfns.push(v);
                }

                if (removed.length > 0) {
                    handlers = this._bubble(rinfo, target);
                    for (x1 = 0, len1 = handlers.length; x1 < len1; x1++) {
                        v = handlers[x1];
                        rfns.indexOf(v) == -1
                            && rfns.push(v);
                    }
                }

                if (add.length > 0) {
                    handlers = this._bubble(ainfo, target);
                    for (x1 = 0, len1 = handlers.length; x1 < len1; x1++) {
                        v = handlers[x1];
                        afns.indexOf(v) == -1
                            && afns.push(v);
                    }
                }

                changes.push({
                    target: target,
                    at: start,
                    removed: removed,
                    added: add
                });
            }

            var reactions = [], v, reaction;
            for (x = 0, len = sfns.length; x < len; x++) {
                v = sfns[x];
                reaction = v(sinfo, changes);
                typeof reaction !== 'undefined'
                    && reactions.push(reaction);
            }
            for (x = 0, len = rfns.length; x < len; x++) {
                v = rfns[x];
                reaction = v(rinfo, changes);
                typeof reaction !== 'undefined'
                    && reactions.push(reaction);
            }
            for (x = 0, len = afns.length; x < len; x++) {
                v = afns[x];
                reaction = v(ainfo, changes);
                typeof reaction !== 'undefined'
                    && reactions.push(reaction);
            }

            return {
                response: function (fn) {
                    fn.apply(this, reactions);
                }
            };
        }
        function push(add) {
            var x, len, target, x1, len1, newelm;
			var targets = this._exec();
            
            add = add ? (add.constructor == Array ? add : [add]) : [];
			
            var sinfo = { event: WardenEvent.SPLICED, add: add };
            var ainfo = { event: WardenEvent.ADDED, add: add };

            var sfns = [];
            var afns = [];

            var changes = [];
            for (x = 0, len = targets.length; x < len; x++) {
                target = targets[x];

                var at = target.length;
                PUSH.apply(target, add);

                for (x1 = 0, len1 = add.length; x1 < len1; x1++) {
                    newelm = add[x1];
                    Warden._setProp(target, undefined, newelm);
                }

                var handlers = this._bubble(sinfo, target);
                var z, zen, v;
                for (z = 0, zen = handlers.length; z < zen; z++) {
                    v = handlers[z];
                    sfns.indexOf(v) == -1
                        && sfns.push(v);
                }

                handlers = this._bubble(ainfo, target);
                for (z = 0, zen = handlers.length; z < zen; z++) {
                    v = handlers[z];
                    afns.indexOf(v) == -1
                        && afns.push(v);
                }

                changes.push({
                    target: target,
                    at: at,
                    added: add
                });
            }

            var reactions = [], v, reaction;
            for (x = 0, len = sfns.length; x < len; x++) {
                v = sfns[x];
                reaction = v(sinfo, changes);
                typeof reaction !== 'undefined'
                    && reactions.push(reaction);
            }
            for (x = 0, len = afns.length; x < len; x++) {
                v = afns[x];
                reaction = v(ainfo, changes);
                typeof reaction !== 'undefined'
                    && reactions.push(reaction);
            }

            return {
                response: function (fn) {
                    fn.apply(this, reactions);
                }
            };
        }
		function each(fn) {
			var targets = this._exec();
			
			var tx,tlen,target;
			for (tx=0, tlen=targets.length; tx<tlen; tx++) {
				var target=targets[tx];
			
				var i, x, len;
				if (target.constructor == Array)
					for (x = 0, len = target.length; x < len; x++) {
						fn(target[x], x);
					}
				else
					for (i in target) {
						if (i == '__ward__')
							continue;
						fn(target[i], i);
					}
			}
        }
        function clone() {
            var model = this._exec()[0];

            if (model)
                return JSON.parse(JSON.stringify(model, function (key, v) {
                    if (key === '__ward__' || (v && v.constructor == Function))
                        return undefined;
                    return v;
                }));
        }
		
		/*watchers*/
		function on(ev, _prop, _fn) {
			this._event=ev;
			if (_prop!==undefined)
				this._at=_prop;
			if (_fn!==undefined)
				this._notify=_fn;
			
			return this;
		}
		function at(i) {
			this._at=i;
			return this;
		}
		function notify(fn){
			this._notify=fn
			return this;
		}
		function eq(i){
			this._equiv=function(x){
				return i==x;
			}
			return this;
		}
		function gt(i){
			this._equiv=function(x){
				return x>i;
			}
			return this;
		}
		function lt(i){
			this._equiv=function(x){
				return x<i;
			}
			return this;
		}
		function gte(i){
			this._equiv=function(x){
				return x>=i;
			}
			return this;
		}
		function lte(i){
			this._equiv=function(x){
				return x<=i;
			}
			return this;
		}
		function is(fn){
			this._equiv=fn;
			return this;
		}
		function key(k) {
			this._key=k;
			return this;
		}
		function watch(_fn_ev, _fn_prop, _fn) {
			var ev, prop, fn;
			var _this=this;
			switch(arguments.length){
				case 0:
					break;
				case 1:
					switch(arguments[0].constructor){
						case Function: this.notify(arguments[0]);break;
						case String: this.on(arguments[0]);break;
					}
					break;
				case 2:
					this.on(arguments[0]);
					switch(arguments[1].constructor){
						case Function: this.notify(arguments[1]);break;
						case String: this.at(arguments[1]);break;
					}
					break;
				case 3:
					this.on(arguments[0]);
					this.at(arguments[1]);
					this.notify(arguments[2]);
					break;
			}
            var com = this._model.__ward__.com || (this._model.__ward__.com = []);
			
			/*ensure unique key*/
			if (this._key) {
				var x,len;
				for (x=0,len=com.length; x < len; x++)
					if (com[x]._key==this._key)
						break;
				com.splice(x,1);
			}
				
            com.push(this);
            return {
				destroy:function() {
					Warden(_this._model).ignore(function(ev,prop,fn,sel) {
						return sel==_this;
					});
				}
			};
        }
        function ignore(evaluator) {
            var x, len, com, rem = [];

			var targets = this.getAll();
			
			var tx, tlen, target;
			for (tx=0, tlen=targets.length; tx<tlen; tx++) {
				target = targets[tx];
				if (!target.__ward__)
					continue;
				
				var com = target.__ward__.com;		
				if (com) {
			
					for (x = 0, len = com.length; x < len; x++) {
						var res = evaluator(com[x]._event, com[x]._at, com[x]._notify, com[x]) /*event, prop, fn, sel */
						res && rem.push(x);
					}

					com = com.filter(function (v, i) {
						return rem.indexOf(i) == -1;
					});
					
					com = com.length==0 ? null : com;
					target.__ward__.com = com;
				}
			}
			
        }
		
		function _exec() {
            var model = this._model;
			
			var buffer=[];
			PUSH.apply(buffer, this._buffer);
			buffer.push(this._parts);

            var x0, len0, parts;
            var allsubjects = [];
            for (x0 = 0, len0 = buffer.length; x0 < len0; x0++) {
                parts = buffer[x0];
                var x, len;
                var subjects = [model], part;
                for (x = 0, len = parts.length; x < len; x++) {
                    part = parts[x];
                    subjects = part(subjects);
                }
                PUSH.apply(allsubjects, subjects);
            }
			
            return allsubjects;
        }
        function _bubble(eventSignature, subject) {
            var x, len, ancestor, com;
            var x1, len1, ctx, sel, fn, prop, equiv;
            var ancestors = Warden(subject).and().ancestors().getAll();
            var fns = [];
            for (x = 0, len = ancestors.length; x < len; x++) {
                ancestor = ancestors[x];
                if (ancestor.__ward__
                    && (com = ancestor.__ward__.com)) {

                    for (x1 = 0, len1 = com.length; x1 < len1; x1++) {
                        ev = com[x1]._event;
						prop = com[x1]._at;
						fn = com[x1]._notify;
						equiv = com[x1]._equiv;
                        sel = com[x1];
						
                        if (ev==eventSignature.event
							&& (prop ? (prop == eventSignature.prop) : true)
							&& (equiv ? equiv(eventSignature.val) : true)
							&& sel.getAll().indexOf(subject) > -1)
							
                            fns.push(fn);
                    }
                }
            }
            return fns;
        }
		
        return Warden;
    })();

    function find(needle, hay) { /* Find the property on a parent which references a given child. */
        var props = [], x, i, len;
        if (hay.constructor === Array)
            for (x = 0, len = hay.length; x < len; x++)
                hay[x] === needle && (props.push(x));
        else
            for (i in hay)
                hay[i] === needle && (props.push(i));
        return props;
    }

    (typeof module !== 'undefined' ? module : {})
		.exports={
			Warden: window.Warden,
			WardenEvent: window.WardenEvent
		};

})(typeof window !== 'undefined' ? window : {});
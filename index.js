/*
 * Warden
 */
(function (window) {

	var WardenEvent = window.WardenEvent = {
		SET: 'set',
		SPLICED: 'spliced'
	};

    var Warden = window.Warden = (function () {
        var SLICE = Array.prototype.slice;
        var PUSH = Array.prototype.push;
		var SPLICE = Array.prototype.splice;

        function Warden(model, _parts, _buffer, _at, _event, _notify, _equiv, _match) {
			if (model && model.__ward__ === undefined)
                model.__ward__ = [];
			
			var buffer = _buffer || [];
			var parts = _parts || [];
			
			parts._model = model;
			parts._at = _at;
			parts._event = _event;
			parts._equiv = _equiv;
			parts._match = _match;
		
			var obj = {
				__iswarden__: true,
				
                _parts: parts,
                _buffer: buffer,
				_notify: _notify,
				
				get _at() {			
					return obj._parts._at;
				},
				
				/*selectors*/
				child:child,
				brood:brood,
				descendant:descendant,
				all:all,
				parent:parent,
				parents:ancestors,
				ancestors:ancestors,
				where:where,
				or:or,
				
				/*terminators*/
				get:get,
				getAll:getAll,
				alter:alter,
				ref:ref,
				splice:splice,
				push:push,
				remove:remove,
				each:each,
				clone:clone,
				watch:watch,
				watchAsync:watchAsync,
				observe:observe,
				observeAsync:observeAsync,
				
				/*auditors*/
				on:on,
				at:at,
				notify:notify,
				eq:eq,
				gt:gt,
				lt:lt,
				gte:gte,
				lte:lte,
				is:is,
				match:match,
				
                _exec: _exec,
				_bubble: _bubble,
				_alter:_alter
			};
            
            return obj;
        }
		Warden._setProp = function (src, prop, subject) {
            var par, oldsubj, id, oldprop, pars;

            if (src.__ward__ === undefined)
                src.__ward__ = [];

            /*old prop should be cleaned up*/
            var oldsubj;
            if (prop !== undefined && isWardable(oldsubj = src[prop])) {
                var i;
                (pars = oldsubj.__ward__) && (i = pars.indexOf(src)) > -1
					&& (pars.splice(i, 1));
            }

            /*assign*/
            prop !== undefined && (src[prop] = subject);

            /*set parent ref*/
            if (isWardable(subject)) {
                pars = subject.__ward__ || (subject.__ward__ = []);
                pars.indexOf(src) == -1
                    && pars.push(src);
            }

            return subject;
        }
        Warden._prop = function (src, prop) {
            if (src.__ward__ === undefined)
                src.__ward__ = [];

            var subject = src[prop], r;
            if (isWardable(subject)) {
                var r;
                r = subject.__ward__ || (subject.__ward__ = []);
                r.indexOf(src) == -1
                    && r.push(src);
            }

            return subject;
        }
		
		
		/*selectors*/
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
        function brood(propstring) {
			var props = propstring.split('.');

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

					if (isWardable(obj))
						switch (obj.constructor) {
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
							default:
								for (i in obj) {
									if (i === '__ward__')
										continue;
									subj = Warden._prop(obj, i);
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

                    var parents;
                    if (isWardable(obj) && (parents = (obj).__ward__))
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

                    var parents;
                    if (isWardable(obj) && (parents = (obj).__ward__))
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
        function or(_model) {
            this._buffer.push(this._parts);
			var oldmodel=this._parts._model;
            this._parts = [];
			
			var model = _model || oldmodel;
			if (model.__ward__ === undefined)
                model.__ward__ = [];
			
			this._parts._model=model;
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
		function ref(prop, newval) {
			var _this=this;
			var targets = this._exec();
			var x, len, target, pars;
			var info = { event: WardenEvent.SET, prop: prop, val: newval };
			var changes=[];
			var coms=[];
			
			for (x = 0, len = targets.length; x < len; x++) {
                target = targets[x];

                var oldval = target[prop];
                if (oldval === newval)
                    continue;

				if (prop !== undefined && isWardable(oldval) && oldval.__ward__)
					pars = SLICE.call(oldval.__ward__);
				
				if (pars) {		
					pars.forEach(function(parent) {
						find(oldval, parent).forEach(function(p) {

							var sig={event:WardenEvent.SET, prop:p, val:newval};
							_this._alter(sig, parent, p, newval, changes, coms);
						})
					})
				} else {
					this._alter(info, target, prop, newval, changes, coms);
				}
				
				isWardable(newval) && isWardable(oldval) && oldval.__ward__.com
					&& (newval.__ward__.com = oldval.__ward__.com);
			}
			var reactions = [], v;
            for (x = 0, len = coms.length; x < len; x++) {

                v = coms[x];
				if (v.expired)
					continue;
								
                var reaction = v._notify(info, changes);
                reaction !== undefined
                    && reactions.push(reaction);
					
				v.__pipe__ && v.__pipe__(reaction);
            }

            return {
                response: function (fn) {
                    fn.apply(this, reactions);
                },
				val:newval
            };
		}
        function alter(prop, newval) {
		
            var targets = this._exec();
			var x, len, target;

            var info = { event: WardenEvent.SET, prop: prop, val: newval };
            var coms = [];
            var changes = [];
            for (x = 0, len = targets.length; x < len; x++) {
                target = targets[x];
				this._alter(info, target, prop, newval, changes, coms);
            }

            var reactions = [], v;

            for (x = 0, len = coms.length; x < len; x++) {
		
                v = coms[x];
				if (v.expired)
					continue;
                var reaction = v._notify(info, changes);
                reaction !== undefined
                    && reactions.push(reaction);
				
				v.__pipe__ && v.__pipe__(reaction);
				var f = +new Date()

            }


            return {
                response: function (fn) {
                    fn.apply(this, reactions);
                },
				val:newval
            };
        }
        function _alter(info, target, prop, newval, changes, coms) {
			var oldval = target[prop];
			if (oldval === newval)
				return;

			Warden._setProp(target, prop, newval);


			var icoms = this._bubble(info, target);
			var z,zen;
			for (z = 0, zen = icoms.length; z < zen; z++) {
				var v = icoms[z];
				coms.indexOf(v) == -1
					&& coms.push(v);
			}

			changes.push({
				src: target,
				prop: prop,
				from: oldval,
				to: newval
			});
		}
		function splice(start, cut, add) {
            var x, len, target, x1, len1, newelm, oldval;
			var targets = this._exec();

            add = add ? (add.constructor == Array ? add : [add]) : [];

            var info = { event: WardenEvent.SPLICED, start: start, cut: cut, add: add };

            var coms = [];
            var changes = [];
			
            for (x = 0, len = targets.length; x < len; x++) {
                target = targets[x];

				var adding=SLICE.call(add);
                var args = [start, cut].concat(adding);
                var removed = SPLICE.apply(target, args);
				
				removed.at=[];
                for (x1 = 0, len1 = removed.length; x1 < len1; x1++) {
					removed.at.push(start + x1);
                    oldval = removed[x1];
                    var r;
                    if (isWardable(oldval) && (r = oldval.__ward__)) {
                        var i = r.indexOf(target);
                        if (i > -1)
                            r.splice(i, 1);
                    }
                }

				adding.at=[];
                for (x1 = 0, len1 = adding.length; x1 < len1; x1++) {
					adding.at.push(start + x1);
                    newelm = adding[x1];
                    Warden._setProp(target, undefined, newelm);
                }

                var icoms = this._bubble(info, target);
                var v;
                for (x1 = 0, len1 = icoms.length; x1 < len1; x1++) {
                    v = icoms[x1];
                    coms.indexOf(v) == -1
                        && coms.push(v);
                }

                changes.push({
                    src: target,
                    start: start,
					cut: cut,
                    removed: removed,
                    added: adding
                });
            }

            var reactions = [], v, reaction;
            for (x = 0, len = coms.length; x < len; x++) {
                v = coms[x];
				if (v.expired)
					continue;
                reaction = v._notify(info, changes);
                typeof reaction !== 'undefined'
                    && reactions.push(reaction);
					
				v.__pipe__ && v.__pipe__(reaction);
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
			
            var info = { event: WardenEvent.SPLICED, add: add };

            var coms = [];
            var changes = [];
			
            for (x = 0, len = targets.length; x < len; x++) {
                target = targets[x];

				var adding=SLICE.call(add);
                var start = target.length;
                PUSH.apply(target, adding);

				adding.at=[];
                for (x1 = 0, len1 = adding.length; x1 < len1; x1++) {
					adding.at.push(start + x1);
                    newelm = adding[x1];
                    Warden._setProp(target, undefined, newelm);
                }

                var icoms = this._bubble(info, target);

                var z, zen, v;
                for (z = 0, zen = icoms.length; z < zen; z++) {
                    v = icoms[z];
                    coms.indexOf(v) == -1
                        && coms.push(v);
                }

				var rem=[]
				rem.at=[];
                changes.push({
                    src: target,
                    start: NaN,
					cut:NaN,
					added: adding,
					removed:rem
                });
            }

            var reactions = [], v, reaction;
            for (x = 0, len = coms.length; x < len; x++) {
                v = coms[x];
				if (v.expired)
					continue;

                reaction = v._notify(info, changes);
                typeof reaction !== 'undefined'
                    && reactions.push(reaction);
					
				v.__pipe__ && v.__pipe__(reaction);
            }
            
            return {
                response: function (fn) {
                    fn.apply(this, reactions);
                }
            };
        }
		function remove(_fn_ent) {
			var fn;
			
			fn = arguments[0].constructor==Function
				? arguments[0]
				: function(v,i) {
					return v===_fn_ent;
				}
				
			var targets = this._exec();
			var info = { event: WardenEvent.SPLICED, remove: _fn_ent };
			
			var coms = [];
            var changes = [];
			
			var x, len, target, i, oldval;
			for (x = 0, len = targets.length; x < len; x++) {
                target = targets[x];

				var removing = target.filter(fn);
				removing.at=[];
				removing.forEach(function(oldval) {
					var i = target.indexOf(oldval);
					removing.at.push(i);
					
					var r;
                    if (isWardable(oldval) && (r = oldval.__ward__)) {
                        i = r.indexOf(target);
                        if (i > -1)
                            r.splice(i, 1);
                    }
				})
				var xx=removing.at.length;
				while(--xx > -1) {
					var i = removing.at[xx];
					target.splice(i,1);
				}
				
                var icoms = this._bubble(info, target);
                var z, zen, v;
                for (z = 0, zen = icoms.length; z < zen; z++) {
                    v = icoms[z];
                    coms.indexOf(v) == -1
                        && coms.push(v);
                }

				var adding=[];
				adding.at=[];
				
                changes.push({
                    src: target,
                    start: NaN,
					cut: NaN,
					added: [],
					removed:removing
                });
            }

            var reactions = [], v, reaction;
            for (x = 0, len = coms.length; x < len; x++) {
                v = coms[x];
				if (v.expired)
					continue;

                reaction = v._notify(info, changes);
                typeof reaction !== 'undefined'
                    && reactions.push(reaction);
					
				v.__pipe__ && v.__pipe__(reaction);
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
				if (isArray(target))
					for (x = 0, len = target.length; x < len; x++) {
						fn(target[x], x);
					}
				else if (isObject(target))
					for (i in target) {
						if (i == '__ward__')
							continue;
						fn(target[i], i);
					}
			}
        }
        function clone() {
            var model = this._exec()[0];

			return isWardable(model)
				? JSON.parse(JSON.stringify(model, function (key, v) {
					if (key === '__ward__' || (v && v.constructor == Function))
						return undefined;
					return v;
				}))
				: model;
        }
		
		/*auditors*/
		function on(ev) {
			this._parts._event=ev;
			
			return this;
		}
		function at(i) {
			this._parts._at=i;
			return this;
		}
		function notify(fn){
			this._notify=fn
			return this;
		}
		function eq(i){
			this._parts._equiv=function(x){
				return i==x;
			}
			return this;
		}
		function gt(i){
			this._parts._equiv=function(x){
				return x>i;
			}
			return this;
		}
		function lt(i){
			this._parts._equiv=function(x){
				return x<i;
			}
			return this;
		}
		function gte(i){
			this._parts._equiv=function(x){
				return x>=i;
			}
			return this;
		}
		function lte(i){
			this._parts._equiv=function(x){
				return x<=i;
			}
			return this;
		}
		function is(fn){
			this._parts._equiv=fn;
			return this;
		}
		
		function match(m) {
			this._parts._match=m;
			return this;
		}
		
		function watch(_fn_prop, _fn) {
			var prop, fn;
			var _this=this;
			switch(arguments.length){
				case 0:
					break;
				case 1:
					switch(arguments[0].constructor){
						case Function: this.notify(arguments[0]);break;
						case String: this.at(arguments[0]);break;
					}
					break;
				case 2:
					this.at(arguments[0]);
					this.notify(arguments[1])
					break;
			}
			
			var srcmodels = [];
			srcmodels.push(this._parts._model);
			this._buffer.forEach(function(v){ srcmodels.push(v._model) });
			
			srcmodels.forEach(parsesrc)
			function parsesrc(src) {
	
				var com = src.__ward__.com || (src.__ward__.com = []);	

				com.push(_this);
			} 
			
            return {
				__iscomresponse__:true,
				destroy:function() {
					srcmodels.forEach(function(src) {
						var com = src.__ward__.com || (src.__ward__.com = []);
						var i = com.indexOf(_this);
						i > -1 && com.splice(i,1);
						if (com.length==0)
							src.__ward__.com=null;
					})
					return this;
				},
				pipe:function(fn) {
					_this.__pipe__ = fn;
					return this;
				}
			};
        }
        function watchAsync(_fn_prop, _fn){
			var b=watch.apply(this, arguments);
			
			var def;
			var fn=this._notify;
			var t;
			this._notify=function() {
				def = def || Deferred();
				var args=arguments;
				clearTimeout(t);
				t=setTimeout(function() {
					var res=fn.apply(this, args);
					var r=def;
					def=null;			
					r.resolve(res);
				});
				
				return def;
			}
			var bpipe=b.pipe;
			var when;
			b.pipe=function(fn) {
				bpipe.call(b,function(def) {
					when && when.reject();
					when=When(def).done(function(res) {
						fn(res);
					});
				});
				return b;
			};
			
			b.__async__=true;
			
			return b;
		}
		function observe(_fn_prop, _fn) {
			var _this=this;

			var b = watch.apply(this, arguments);
			
			var res = this._notify();
			var bpipe = b.pipe;
			b.pipe=function(fn) {
				bpipe.apply(b,arguments);
				fn(res);
			}
			
			return b;
		}
		function observeAsync(_fn_prop, _fn) {
			var _this=this;

			var b = watchAsync.apply(this, arguments);
			
			var def = this._notify();
			var bpipe = b.pipe;
			b.pipe=function(fn) {
				bpipe.apply(b,arguments);
				def.done(function(res) {
					fn(res);
				});
				return b;
			}
			
			return b;
		}
		
		
		function _exec(_microsel) {
            var model;
			
			var buffer=[];
			_microsel
				? buffer.push(_microsel)
				: (
					PUSH.apply(buffer, this._buffer),
					buffer.push(this._parts) );
			
            var x0, len0, parts;
            var allsubjects = [];
            for (x0 = 0, len0 = buffer.length; x0 < len0; x0++) {
                parts = buffer[x0];
				model = parts._model;
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
			var _this=this;
            var x, len, ancestor, com;
            var x1, len1, ctx, sel, fn, prop, equiv, match;
            var ancestors = Warden(subject).or().ancestors().getAll();
			var selectionResults;
            var coms = [];
			
			ancestors.forEach(function(ancestor) {
				if (!ancestor.__ward__ || !(com = ancestor.__ward__.com))
					return;
				

				com.forEach(function(sel) {
					var parts=[];
					PUSH.apply(parts, sel._buffer);
					parts.push(sel._parts);

					
					parts.forEach(function(part) {
						ev = part._event;
						prop = part._at;
						fn = sel._notify;
						equiv = part._equiv;
						match = part._match;


						
						if (match && match(eventSignature, subject, sel))
							coms.push(sel)
						else if (ev ? (ev==eventSignature.event) : true
							&& (prop ? (prop == eventSignature.prop) : true)
							&& (equiv ? equiv(eventSignature.val, eventSignature, subject) : true)
							&& _this._exec(part).indexOf(subject) > -1)
							
							coms.indexOf(sel)==-1
								&& coms.push(sel);
						
					})
						
				})			
                
			})
            return coms;
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
	function isWardable(subject) {
		return typeof subject=='object' && subject!==null;
	}
	function isObject(subject) {
		return typeof subject=='object' && subject!==null && subject.constructor!==Array;
	}
	function isArray(subject) {
		return typeof subject && subject.constructor == Array;
	}

    (typeof module !== 'undefined' ? module : {})
		.exports={
			Warden: window.Warden,
			WardenEvent: window.WardenEvent,
			IOSync:typeof require!=='undefined' ? require('./IOSync') : void 0
		};

})(typeof window !== 'undefined' ? window : {});
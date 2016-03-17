/*
 * Warden
 */
(function (window) {
	var SLICE = Array.prototype.slice;
	var PUSH = Array.prototype.push;
	var SPLICE = Array.prototype.splice;

	var Rep = window.__WardenRep__ = (function() {
		function _gatherSuspectWarders(subject, suspects, warders, seen, c) {
			var member;
			
			if (seen.indexOf(subject)>-1)
				return;
			
			if (!(subject && subject.__ward__))
				return;
			
			seen.push(subject);
			suspects.push(subject);
			subject && subject.__ward__
				&& PUSH.apply(warders, subject.__ward__);
			
//console.log(c, subject.constructor.name);
			
			switch(subject.constructor) {
				case Array:
					var x,len;
					for (x=0,len=subject.length; x < len; x++) {
						member = subject[x];
						_gatherSuspectWarders(member, suspects, warders, seen, c+'.'+x);
					}
					break;
				default:
					var i;
					for (i in subject) {
						if (i=='__ward__')
							continue;
						member = subject[i];
						_gatherSuspectWarders(member, suspects, warders, seen, c+'.'+i);
					}
					break;
			}
		}
		function _gatherFromWarder(subject,seen) {
			var member;
			
			if (seen.indexOf(subject)>-1)
				return;
			
			if (!(subject && subject.__ward__))
				return;
			
			seen.push(subject);
			
			switch(subject.constructor) {
				case Array:
					var x,len;
					for (x=0,len=subject.length; x < len; x++) {
						member = subject[x];
						_gatherFromWarder(member, seen);
					}
					break;
				default:
					var i;
					for (i in subject) {
						if (i[0]=='__ward__')
							continue;
						member = subject[i];
						_gatherFromWarder(member, seen);
					}
					break;
			}
		}
		function _checkForRefLost(subject) {
			var x,len, v;
			var suspects=[];
			var warders=[];
			var seen=[];
//console.log('SUBJECT', subject);
			_gatherSuspectWarders(subject,suspects,warders,seen,'');
			
//console.log('SUSPECTS', suspects)			
			/*filter out suspect warders*/
			warders = warders.filter(function(v) {
				return suspects.indexOf(v)==-1;
			});
//console.log('WARDERS', warders)

			seen=[];
			for(x=0,len=warders.length; x<len; x++) {
				v=warders[x];
				_gatherFromWarder(v,seen,0);
			}
//console.log('SEEN', seen);			

			var reflost=[];
			for (x=0,len=suspects.length; x < len; x++) {
				var v=suspects[x];
				seen.indexOf(v)==-1
					&& reflost.push(v);
			}
			// var reflost = suspects.filter(function(v) {
				// return seen.indexOf(v)==-1;
			// });
//console.log("LOST", reflost);			

			reflost.forEach(function(v) {
				v && v.__ward__ && v.__ward__.rep && SLICE.call(v.__ward__.rep).forEach(function(z) {
					z.destroy();
				});
			});	
		}
		
		return {
			_rep:[],
			_free:[],
			_queue:false,
			_onqueue:null,
			onqueue:function(fn){
				this._onqueue=fn;
			},
			_dump:function() {
				this._rep=[];
				this._free=[];
				this._queue=false;
			},
			_add:function(subject) {
				var at = this._free.shift();
				
				at = isNaN(at) ? this._rep.length : at;
				this._rep[at]=subject;
				subject.__rep__=at;
			},
			add:function(subject) {
				this._add(subject);
								
				var targets = subject._exec();
				subject.__shadow__=targets;
			},
			_remove:function(subject) {
				
				this._rep[subject.__rep__]=undefined;
				this._free.push(subject.__rep__);
				subject.__rep__=null;
			},
			remove:function(subject) {
				!isNaN(subject.__rep__) && subject.__rep__!==null
					&& this._remove(subject);
			},
			_runners:function() {
				var x1,x2,len1,len2, sub, shadow, reflection, ret=[];
				
				for (x1=0,len1=this._rep.length;x1 < len1; x1++) {
					sub=this._rep[x1];
					if (sub==undefined)
						continue;
					
					shadow=sub.__shadow__;					
					reflection = sub._exec();
					
					if (shadow.length!==reflection.length) {
						ret.push(sub);
						sub.__shadow__ = reflection;
						continue;
					}
					for (x2=0,len2=shadow.length;x2<len2;x2++){
						if (shadow[x2]!==reflection[x2]) {
							ret.push(sub);
							sub.__shadow__ = reflection;
							break;
						}
					}
				}
				
				return ret;
			},
			run:function() {
				this._queue=false;
				var ts=+new Date();
				var quickened=this._runners();
				var x,len, subj, res;
				for (x=0,len=quickened.length;x<len;x++) {
					subj=quickened[x];
					res = subj._notify();
					subj.__pipe__
						&& subj.__pipe__(res);
				}
				
				console.log(+new Date() - ts);
			},
			queue:function(change) {
				this._onqueue
					&& this._onqueue(change);
				
				var _this=this;
				this._queue=true;
				this._t && clearTimeout(this._t);
				var t1,t2;
				this._t=setTimeout(function() {
					_this._queue
						&& (_this._queue=false, _this.run());
						
					if (_this._queue==false) {
						t1 && clearTimeout(t1);
						t1=setTimeout(function() {
							_this._queue==false
								&& _this._rungarbage();	
						});
						t2 && clearTimeout(t2);
						t2=setTimeout(function(){
							_this._queue==false
								&& _this._truncateRep();
						})
					}
						
				});
			},
			_truncateRep:function() {
				var len=this._rep.length;
				var x=len-1;
				var rem=[];
				while(x>=0) {
					if (this._rep[x]==undefined)
						rem.push(x);
					else
						break;
					x--;
				}
				this._rep=this._rep.filter(function(v,i) {
					return !(rem.indexOf(i) > -1);
				});
				this._free=this._free.filter(function(v) {
					return !(rem.indexOf(v) > -1);
				});
			},
			_rungarbage:function() {
				var x,len;
				if (!this._garbageQueue)
					return;
				for (x=0, len=this._garbageQueue.length; x<len; x++) {
					_checkForRefLost(this._garbageQueue[x]);
				}
				this._garbageQueue=null;
			},
			garbage:function(subject) {
				this._garbageQueue = this._garbageQueue || [];
				this._garbageQueue.push(subject);
			}
		};	
	})();
	
    var Warden = window.Warden = (function () {

        function Warden(model, _parts, _buffer) {
			if (model && model.__ward__ === undefined)
                model.__ward__ = [];
			
			var buffer = _buffer || [];
			var parts = _parts || [];
			
			parts._model = model;
		
			var obj=function(str){
				return Warden._shorthand(obj,str);
			};
			obj.__iswarden__= true,
			
			obj._parts= parts,
			obj._buffer= buffer,
			obj._notify= null,
			
			obj.destroy=destroy;
			obj.pipe=pipe;
			
			/*selectors*/
			obj.child=child,
			obj.deep=deep,
			obj.all=all,
			obj.parents=parents,
			obj.where=where,
			obj.or=or,
			
			/*terminators*/
			obj.get=get,
			obj.getAll=getAll,
			obj.each=each,
			obj.select=select,
			obj.clone=clone,
			
			/*terminator triggers*/
			obj.alter=alter,
			obj.update=update,
			obj.splice=splice,
			obj.push=push,
			obj.remove=remove,
			
			/*watchers*/
			obj.watch=watch,
			obj.observe=observe,
			
			/*auditors*/
			obj.notify=notify,
			
			obj._exec= _exec,
			obj._changeprop=_changeprop,
			obj._alter=_alter;
			
            return obj;
        }
		
		Warden._dump=function() {
			Rep._dump();
		}
		Warden._shorthand=function(w, str) {
			var parts=[];
			var reg=/\||\s|<<|>>|\.|\*|[$\w-]+/g;
			var m;
			var i;
			while(m=reg.exec(str)) {
				parts.push(m[0])
			}

			var x,len,v,word;
			for (x=0,len=parts.length;x<len;x++) {
				v=parts[x];
				switch(v) {
					case '<<':
						w=w.parents();
						break;
					case '.':
					case ' ':
						break;
					case '|':
						w=w.or();
						break;
					case '*':
						w=w.all();
						break;
					case '>>':
						word = parts[++x];
						w=w.deep(word);
						break;
					default:
						w=w.child(v);
						break;
				}
			}
			
			return w;
		}		
		
		Warden._setVal = function (src, prop, subject, _irep) {
			
            var par, oldsubj, id, oldprop, pars, x, len, v;

            if (src.__ward__ === undefined)
                src.__ward__ = [];

            /*old prop should be cleaned up*/
            var oldsubj;
            if (isWardable(oldsubj = src[prop])) {
                var i;
                (pars = oldsubj.__ward__) && (i = pars.indexOf(src)) > -1 && find(oldsubj, pars[i]).length==1
					&& (pars.splice(i, 1));
			
				Rep.garbage(oldsubj)
			
				//_checkForRefLost(oldsubj);
            }

			src[prop] = subject;
			
            /*set parent ref*/
            if (isWardable(subject)) {
                pars = subject.__ward__ || (subject.__ward__ = []);
                pars.indexOf(src) == -1
                    && pars.push(src);
            }

			!_irep
				&& Rep.queue({
					src:src,
					prop:prop,
					to:subject
				});
			
        }
		
		Warden._insertVals=function(src, at, vals) {
			var x,len;
			var args = new Array(2+vals.length);
			args[0]=at;
			args[1]=0;
			SPLICE.apply(src,args);
			for (x=0,len=vals.length; x<len; x++) {
				Warden._setVal(src, at+x, vals[x], true)
			}
			
			Rep.queue({
				src:src,
				start:at,
				cut:0,
				added:vals
			});
		}
		Warden._removeVals=function(src, at, count) {
			
			var par, oldsubj, id, oldprop, pars, x, len, v;
			var oldsubj,prop;
			if (src.__ward__ === undefined)
					src.__ward__ = [];
			
			for (x=0,len=count; x<len; x++) {
				prop = x+at;
				
				if (isWardable(oldsubj = src[prop])) {
					var i;
					
					(pars = oldsubj.__ward__) && (i = pars.indexOf(src)) > -1 && find(oldsubj, pars[i]).length==1
						&& (pars.splice(i, 1));
					
					Rep.garbage(oldsubj);
					//_checkForRefLost(oldsubj);
				}	
			}
			
			src.splice(at,count);
			
			Rep.queue({
				src:src,
				start:at,
				cut:count,
				added:[]
			});
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
		function __child__(w,col,prop_fn) {
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
		}
        function child(prop_fn) {
			
			this._parts.push(__child__, prop_fn)
			
            return this;
        }
		function __deep__(w,col,prop) {
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
		}
        function deep(prop) {
			this._parts.push(__deep__, prop);

            return this;
        }
		function __all__(w,col) {
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
		}
        function all() {
			this._parts.push(__all__,null);
            
            return this;
        }
        
		function __parents__(w,col) {
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
		}
        function parents() {
			this._parts.push(__parents__,null);
            
            return this;
        }
        
		function __where__(w,col,filter) {
			var n = [], x, len, obj;

			for (x = 0, len = col.length; x < len; x++) {
				obj = col[x];
				filter(obj, x) && n.indexOf(obj) === -1
					&& n.push(obj);
			}
			return n;
		}
		function where(filter) {
			this._parts.push(__where__,filter);

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
		function get() {
            var subjects = this._exec();

            return subjects[0];
        }
        function getAll() {
            var subjects = this._exec();

            return subjects;
        }
		function select(_fn) {
			
			var fn=_fn ? _fn : function(){return true;};
			
			var _this=this;
			var subjects=this._exec();
			var out=[];
			var res=subjects.map(fn);
			W(out).push(res);
			
			return out;
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
		
		/*terminator triggers*/
		function alter(prop, newval) {
			var targets = this._exec();
			return this._alter(prop,newval,targets);
		}
		
		function update(prop, newval) {
			var targets = this._exec().filter(function(v) {
				return v[prop]!==undefined;
			});
			
			return this._alter(prop,newval,targets);
		}
		function _alter(prop, newval, targets) {
		
			var x, len, target;

            for (x = 0, len = targets.length; x < len; x++) {
                target = targets[x];
				this._changeprop(target, prop, newval);
            }

            return {
				val:newval
            };
        }
        function _changeprop(target, prop, newval) {
			var oldval = target[prop];
			if (oldval === newval)
				return;

			Warden._setVal(target, prop, newval);
		}
		function splice(start, cut, add) {
            var x, len, target, x1, len1, newelm, oldval, adding;
			var targets = this._exec();
			
            for (x = 0, len = targets.length; x < len; x++) {
                target = targets[x];
				adding=SLICE.call(add);

				Warden._removeVals(target, start, cut);
				Warden._insertVals(target, start, adding);
            }
			
        }
        function push(add) {
			var _this=this;
            var x, len, target, x1, len1, newelm;
			var targets = this._exec();
            
            add = add ? (add.constructor == Array ? add : [add]) : [];
			
            for (x = 0, len = targets.length; x < len; x++) {
                target = targets[x];

				var adding=SLICE.call(add);
                var start = target.length;
				Warden._insertVals(target, start, adding);
            }

        }
		function remove(_fn_ent) {
			var fn;
			
			fn = arguments[0].constructor==Function
				? arguments[0]
				: function(v,i) {
					return v===_fn_ent;
				}
				
			var targets = this._exec();
			
			var x, len, target, i, oldval;
			for (x = 0, len = targets.length; x < len; x++) {
                target = targets[x];

				var removing = target.filter(fn);
				removing.forEach(function(oldval) {
					var i = target.indexOf(oldval);
					Warden._removeVals(target, i, 1);
				});
            }
			
		}
		
		
		/*auditors*/
		function notify(fn){
			this._notify=fn
			return this;
		}
		
		function watch(fn) {
			var _this=this;
			this.notify(fn);

			this._buffer.concat([this._parts]).forEach(function(v) {
				var rep = v._model.__ward__.rep || (v._model.__ward__.rep=[]);
				rep.push(_this);
			});

			
			Rep.add(this);
			
            return this;
        }
		function destroy() {
			var _this=this;
			Rep.remove(this);
			
			var i;
			this._buffer.concat([this._parts]).forEach(function(v) {
				v._model.__ward__.rep && (i=v._model.__ward__.rep.indexOf(_this))>-1
					&& v._model.__ward__.rep.splice(i,1);
			});
		}
		function pipe(fn) {
			this.__pipe__ = fn;
			return this;
		}
        
		function observe(_fn_prop, _fn) {
			var _this=this;

			watch.apply(this, arguments);
			
			var res = this._notify();

			/*upgrade pipe to run response as soon as it is set*/
			var thispipe=this.pipe;
			this.pipe = function(fn) {
				thispipe.call(_this, fn);
				fn(res);
				
				return this;
			}	
			return this;
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
                var x, len, data;
                var subjects = [model], part;
                for (x = 0, len = parts.length; x < len; x+=2) {
                    part = parts[x];
					data=parts[x+1];
                    subjects = part(this, subjects, data);
                }
                PUSH.apply(allsubjects, subjects);
            }
			
            return allsubjects;
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
			Rep:Rep,
			Warden: window.Warden,
			IOSync:typeof require!=='undefined' ? require('./IOSync') : void 0
		};

})(typeof window !== 'undefined' ? window : {});
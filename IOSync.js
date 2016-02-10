var Deferred = require('nimm-util').Deferred;


module.exports=function(io, model) {

	var W = require('./index').Warden;
	var WE = require('./index').WardenEvent;
	
	var Client = (function() {
		function client(model, cl) {
			var _this=this;
			
			this.active=Deferred();
			
			Object.defineProperty(this, 'binding', {set:function(v){
				_this.active.fail(function(){v.destroy()});
			}});
			
			this.updateLoop=false;
			this.client=cl;
			W(this).alter('model', model);
			
			this['on disconnect']();
			this['on model update sync']();
			this['on sync update model']();
			
			typeof window=='undefined'
				&& this.sendModel();
				
			
		}
		client.prototype['on disconnect']=function() {
			var _this=this;
			this.client.on('disconnect', function () {
				_this.active.reject();
				W(_this).alter('model',null);
			});	
		}
		client.prototype['on model update sync']=function() {
			var _this=this;
			
			this.binding = W(this.model).match(function(){return true}).watch(function(e,d) {
	
				if (_this.updateLoop)
					return;
			
				d.forEach(function(v) {
					var ancestors = W(v.src).or().ancestors().getAll();
					var tosrc=[];
					
					var model = W(_this).child('model').get();
					parse(model);
					
					function parse(subject) {					
						
						if (!subject)
							return subject;
						
						switch(subject.constructor) {
							case Array:
								var x,len;
								var res=[];

								for (x=0, len=subject.length; x < len; x++) {
									var s = subject[x];
									if (ancestors.indexOf(s)==-1)
										continue;
									
									tosrc.push({prop: x, type: s.constructor==Array ? 'array' : 'object'});
									parse(s);
								}
								break;
							case Object:
								var i;
								for (i in subject) {
									if (i=='__ward__')
										continue;

									var s = subject[i];

									if (ancestors.indexOf(s)==-1)
										continue;
									
									tosrc.push({prop: i, type: s.constructor==Array ? 'array' : 'object'});
									parse(s);
								}
								break;
						}
					};
										
					if (!isNaN(v.start) && !isNaN(v.cut))
						_this.client.emit('io-sync', tosrc, 'splice', v.start, v.cut, W(v.added).clone());
					else if (v.added && v.added.length)
						_this.client.emit('io-sync', tosrc, 'push', W(v.added).clone());
					else if (v.removed && v.removed.length)
						_this.client.emit('io-sync', tosrc, 'remove', v.removed.at);
					else if (v.prop!==undefined)
						_this.client.emit('io-sync', tosrc, 'alter', v.prop, W(v.to).clone());
					
				})
			});
		}
		client.prototype['on sync update model']=function() {
			var _this=this;	
			this.client.on('io-sync', function(src, action) {
				_this.updateLoop=true;

console.log(arguments)				
				
				if (action=='init') {
					W(_this).ref('model', src);
					_this.updateLoop=false;
					return;
				}

				var subject = getToSrc(_this.model, src);
		
		
				if (action=='push')
					W(subject).push(arguments[2]);
				else if (action=='alter')
					W(subject).alter(arguments[2], arguments[3])
				else if (action=='remove') {
					var at=arguments[2];
					W(subject).remove(function(v, x) {
						return at.indexOf(x)>-1;
					});
				} else if (action=='splice')
					W(subject).splice(arguments[2], arguments[3], arguments[4])

				
				_this.updateLoop=false;
			});
			
			function getToSrc(subject, mirror) {
				
				var x,len;
				for (x=0, len=mirror.length; x < len; x++) {
					var v=mirror[x];
					if (subject[v.prop]===undefined)
						W(subject).alter(v.prop, v.type=='array' ? [] : {})
					
					subject = W(subject).child(v.prop).get();
				}
				return subject;
				
			}
		}
		client.prototype.sendModel=function() {
			this.client.emit('io-sync', W(this.model).clone(), 'init');
		}
		
		return client;
	})();
	
	typeof window=='undefined'
		? io.sockets.on('connection', function (client) {
			new Client(model, client);
		})
		: new Client(io, model);
	
}
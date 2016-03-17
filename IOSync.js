var Deferred = require('nimm-util').Deferred;

module.exports=function(io, base) {

	var W = require('./index').Warden;
	var Rep = require('./index').Rep;
	
	Rep.onqueue(function(change) {
		var ancestors = W(change.src)('| <<').getAll();
		var model=W(base)('model').get();
		if (ancestors.indexOf(model)==-1)
			return;
		
		change.prop!==undefined
			&& (change.to=W(change.to).clone())
			
		change.added
			&& (change.added=W(change.added).clone())

		clients.forEach(function(v){
			v.sendSync(change, ancestors, model);
		});
	})
	var clients=[];
	
	var Client = (function() {
		function client(base, cl) {
console.log('new client')

			clients.push(this);
			var _this=this;
			
			this.active=Deferred();
			
			Object.defineProperty(this, 'binding', {set:function(v){
				_this.active.fail(function(){v.destroy()});
			}});
			
			this.updateLoop=false;
			this.client=cl;
			this.base=base;
			
			this['on disconnect']();
			this['on sync update model']();
			
			typeof window=='undefined'
				&& this.sendModel();
				
			setTimeout(function() {
				_this.client.emit('io-ready');
			})
		}
		client.prototype['on disconnect']=function() {
			var _this=this;
			this.client.on('disconnect', function () {
				_this.active.reject();
				clients = clients.filter(function(v){return v!=_this});
			});	
		}
		client.prototype.sendSync=function(v, ancestors, model) {
		
			if (this.updateLoop)
				return;

			var tosrc=[];

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
				this.client.emit('io-sync', tosrc, 'splice', v.start, v.cut, W(v.added).clone());
			else if (v.prop!==undefined)
				this.client.emit('io-sync', tosrc, 'alter', v.prop, W(v.to).clone());
		}
		client.prototype['on sync update model']=function() {
			var _this=this;	
			this.client.on('io-sync', function(src, action) {
				_this.updateLoop=true;

console.log(arguments)
				
				if (action=='init') {
					W(_this.base).alter('model', src);
					_this.updateLoop=false;
					return;
				}

				var subject = getToSrc(_this.base.model, src);
		
				if (action=='alter')
					W(subject).alter(arguments[2], arguments[3]);
				else if (action=='splice')
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
			var _this=this;
			this.client.on('io-ready', function rd() {
				_this.client.removeListener('io-ready', rd);
				
				var data = W(_this.base)('model').clone();
				_this.client.emit('io-sync', data, 'init');
				
			})
		}
		
		return client;
	})();
	
	typeof window=='undefined'
		? io.sockets.on('connection', function (client) {
			new Client(base, client);
		})
		: new Client(base, io);
	
}